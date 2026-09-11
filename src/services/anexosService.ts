import { supabase } from './supabase';
import { DocumentoAnexo, TipoDocumentoAnexo } from '../types';

/**
 * Serviço completo para gerenciamento de múltiplos documentos e anexos no Supabase Storage.
 * Implementa o Padrão Zero-Break com resiliência estrita a schema drift (42P01, 42703, PGRST204, PGRST200).
 */
export class AnexosService {
  private static TABELA = 'documentos_anexos';
  private static TABELA_SETTINGS = 'global_settings';
  private static CHAVE_FALLBACK = 'anexos_storage_cache_drift';
  private static BUCKET = 'documentos-clientes';

  /**
   * Compacta imagens leves antes do envio se possível
   */
  private static async compactarImagemSePossivel(file: File): Promise<File> {
    if (typeof window === 'undefined' || typeof Image === 'undefined') return file;
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isImage) return file;

    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 2000;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.75
        );
      };
      img.onerror = () => resolve(file);
    });
  }

  /**
   * Envia um novo documento para o Supabase Storage e registra na tabela documentos_anexos.
   */
  public static async uploadAnexo(params: {
    file: File;
    rotulo: string;
    tipo_documento: TipoDocumentoAnexo;
    viagem_id?: string;
    cliente_id?: string;
  }): Promise<DocumentoAnexo> {
    const { file, rotulo, tipo_documento, viagem_id, cliente_id } = params;

    // 1. Obter limite de tamanho
    let maxMb = 25;
    try {
      const { data: settings } = await supabase
        .from(this.TABELA_SETTINGS)
        .select('limite_upload_mb')
        .maybeSingle();
      if (settings && typeof settings.limite_upload_mb === 'number') {
        maxMb = settings.limite_upload_mb;
      }
    } catch {
      // mantém 25MB
    }

    // 2. Compactação se imagem
    let finalFile = file;
    try {
      finalFile = await this.compactarImagemSePossivel(file);
    } catch {
      // prossegue com o original
    }

    const sizeInMb = finalFile.size / (1024 * 1024);
    if (sizeInMb > maxMb) {
      throw new Error(`O arquivo selecionado (${sizeInMb.toFixed(1)}MB) excede o limite máximo permitido de ${maxMb}MB.`);
    }

    // 3. Monta o caminho único no Storage
    const pastaIdentificadora = viagem_id || cliente_id || 'geral';
    const sanitizedFileName = finalFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePathRelativo = `${pastaIdentificadora}/${Date.now()}_${sanitizedFileName}`;

    // 4. Upload no Storage
    if (supabase && supabase.storage) {
      const { error: uploadErr } = await supabase.storage
        .from(this.BUCKET)
        .upload(storagePathRelativo, finalFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        console.error('[AnexosService] Erro ao enviar para o Storage:', uploadErr);
        throw new Error(`Falha no armazenamento na nuvem: ${uploadErr.message}`);
      }
    }

    const storagePathCompleto = `supabase-storage://${storagePathRelativo}`;

    // 5. Salva na tabela documentos_anexos
    const payload: Partial<DocumentoAnexo> = {
      viagem_id: viagem_id || undefined,
      cliente_id: cliente_id || undefined,
      rotulo: rotulo.trim() || finalFile.name,
      tipo_documento: tipo_documento || 'OUTROS',
      nome_original: finalFile.name,
      storage_path: storagePathCompleto,
      mime_type: finalFile.type || 'application/octet-stream',
      tamanho_bytes: finalFile.size,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error: dbErr } = await supabase
        .from(this.TABELA)
        .insert(payload)
        .select()
        .single();

      if (dbErr) {
        // Fallback Zero-Break para schema drift (42P01 / 42703 / PGRST204)
        if (
          dbErr.code === '42P01' ||
          dbErr.code === '42703' ||
          dbErr.code === 'PGRST204' ||
          dbErr.code === 'PGRST200' ||
          dbErr.message?.includes('does not exist') ||
          dbErr.message?.includes('schema cache')
        ) {
          console.warn('[AnexosService] Schema drift detectado em documentos_anexos. Ativando fallback resiliente.');
          return await this.salvarFallbackDrift(payload as DocumentoAnexo);
        }
        throw dbErr;
      }

      return data as DocumentoAnexo;
    } catch (err: any) {
      if (
        err?.code === '42P01' ||
        err?.code === '42703' ||
        err?.code === 'PGRST204' ||
        err?.code === 'PGRST200' ||
        err?.message?.includes('does not exist') ||
        err?.message?.includes('schema cache')
      ) {
        return await this.salvarFallbackDrift(payload as DocumentoAnexo);
      }
      throw err;
    }
  }

  /**
   * Lista os anexos vinculados a uma viagem e ao seu cliente/passageiro.
   * Consulta a tabela documentos_anexos, faz fallback em viagens.observacoes e
   * inspeciona o Supabase Storage diretamente para nunca perder nenhum arquivo enviado.
   */
  public static async listarAnexos(viagemId?: string, clienteId?: string): Promise<DocumentoAnexo[]> {
    const listaFinal: DocumentoAnexo[] = [];
    let tabelaExiste = true;

    // 1. Consulta a tabela oficial documentos_anexos
    try {
      let query = supabase.from(this.TABELA).select('*').order('created_at', { ascending: false });

      if (viagemId && clienteId) {
        query = query.or(`viagem_id.eq.${viagemId},cliente_id.eq.${clienteId}`);
      } else if (viagemId) {
        query = query.eq('viagem_id', viagemId);
      } else if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;

      if (!error && data) {
        listaFinal.push(...(data as DocumentoAnexo[]));
      } else if (
        error &&
        (error.code === '42P01' ||
          error.code === '42703' ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST200' ||
          error.message?.includes('does not exist'))
      ) {
        tabelaExiste = false;
      }
    } catch {
      tabelaExiste = false;
    }

    // 2. Se a tabela ainda não tiver sido criada no Supabase, recupera de viagens.observacoes
    if (!tabelaExiste && viagemId) {
      try {
        const { data: vData } = await supabase
          .from('viagens')
          .select('observacoes')
          .eq('id', viagemId)
          .single();

        if (vData?.observacoes) {
          const match = vData.observacoes.match(/<!-- PAXFLOW_ANEXOS:(.*?) -->/);
          if (match && match[1]) {
            const parsed = JSON.parse(match[1]);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (!listaFinal.some(a => a.id === item.id || a.storage_path === item.storage_path)) {
                  listaFinal.push(item);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[AnexosService] Aviso ao recuperar fallback em viagens.observacoes:', err);
      }
    }

    // 3. Consulta direta ao Supabase Storage (FONTE DA VERDADE DO ARMAZENAMENTO)
    // Garante que nenhum arquivo recém-subido desapareça caso a tabela do banco ainda não tenha sido migrada
    const pastasParaBuscar = [viagemId, clienteId].filter(Boolean) as string[];

    for (const pasta of pastasParaBuscar) {
      if (supabase && supabase.storage) {
        try {
          const { data: storageFiles, error: storageErr } = await supabase.storage
            .from(this.BUCKET)
            .list(pasta, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

          if (!storageErr && storageFiles && storageFiles.length > 0) {
            for (const f of storageFiles) {
              // Ignora pastas internas do storage
              if (!f.name || f.name.startsWith('.')) continue;

              const pathCompleto = `supabase-storage://${pasta}/${f.name}`;
              const jaExiste = listaFinal.some(item => item.storage_path === pathCompleto);

              if (!jaExiste) {
                const nomeLegivel = f.name.replace(/^\d+_/, '');
                let tipoInferido: TipoDocumentoAnexo = 'OUTROS';
                const lower = nomeLegivel.toLowerCase();
                if (lower.includes('passaporte')) tipoInferido = 'PASSAPORTE';
                else if (lower.includes('visto')) tipoInferido = 'VISTO';
                else if (lower.includes('voo') || lower.includes('bilhete') || lower.includes('aereo')) tipoInferido = 'VOUCHER_AEREO';
                else if (lower.includes('hotel') || lower.includes('resort')) tipoInferido = 'VOUCHER_HOTEL';
                else if (lower.includes('seguro')) tipoInferido = 'SEGURO';
                else if (lower.includes('contrato')) tipoInferido = 'CONTRATO';

                listaFinal.push({
                  id: f.id || `storage-${pasta}-${f.name}`,
                  viagem_id: pasta === viagemId ? viagemId : undefined,
                  cliente_id: pasta === clienteId ? clienteId : undefined,
                  rotulo: nomeLegivel,
                  tipo_documento: tipoInferido,
                  nome_original: nomeLegivel,
                  storage_path: pathCompleto,
                  mime_type: (f.metadata as any)?.mimetype || 'application/pdf',
                  tamanho_bytes: (f.metadata as any)?.size || 0,
                  created_at: f.created_at || new Date().toISOString()
                });
              }
            }
          }
        } catch (stErr) {
          console.warn(`[AnexosService] Aviso ao inspecionar arquivos na pasta ${pasta} do Storage:`, stErr);
        }
      }
    }

    return listaFinal;
  }

  /**
   * Exclui um documento anexo do banco e do Storage.
   */
  public static async excluirAnexo(anexoId: string, storagePath?: string): Promise<boolean> {
    try {
      // 1. Tenta deletar na tabela oficial do banco de dados
      const { error: dbErr } = await supabase
        .from(this.TABELA)
        .delete()
        .eq('id', anexoId);

      // 2. Remove do Supabase Storage se tiver caminho
      if (storagePath && storagePath.startsWith('supabase-storage://')) {
        const pathNoBucket = storagePath.replace('supabase-storage://', '');
        try {
          if (supabase && supabase.storage) {
            await supabase.storage.from(this.BUCKET).remove([pathNoBucket]);
          }
        } catch (stErr) {
          console.warn('[AnexosService] Aviso ao remover arquivo do bucket:', stErr);
        }
      }

      return true;
    } catch (err) {
      console.error('[AnexosService] Erro ao excluir anexo:', err);
      return false;
    }
  }

  // ==========================================================================
  // FALLBACK SEGURO DE CONTINGÊNCIA (Zero-Break Pattern)
  // Persistido em viagens.observacoes no Supabase - ZERO localStorage
  // ==========================================================================

  private static gerarIdSeguro(): string {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `anexo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private static async salvarFallbackDrift(anexo: DocumentoAnexo): Promise<DocumentoAnexo> {
    const itemNormalizado: DocumentoAnexo = {
      ...anexo,
      id: anexo.id || this.gerarIdSeguro(),
      created_at: anexo.created_at || new Date().toISOString()
    };

    if (itemNormalizado.viagem_id) {
      try {
        const { data: vData } = await supabase
          .from('viagens')
          .select('observacoes')
          .eq('id', itemNormalizado.viagem_id)
          .single();

        let obs = vData?.observacoes || '';
        let listaAnexosViagem: DocumentoAnexo[] = [];
        const match = obs.match(/<!-- PAXFLOW_ANEXOS:(.*?) -->/);
        if (match && match[1]) {
          try {
            listaAnexosViagem = JSON.parse(match[1]);
          } catch {}
        }

        listaAnexosViagem = listaAnexosViagem.filter(item => item.id !== itemNormalizado.id);
        listaAnexosViagem.unshift(itemNormalizado);

        const blocoJson = `<!-- PAXFLOW_ANEXOS:${JSON.stringify(listaAnexosViagem)} -->`;
        if (match) {
          obs = obs.replace(/<!-- PAXFLOW_ANEXOS:(.*?) -->/, blocoJson);
        } else {
          obs = obs ? `${obs}\n${blocoJson}` : blocoJson;
        }

        await supabase
          .from('viagens')
          .update({ observacoes: obs })
          .eq('id', itemNormalizado.viagem_id);
      } catch (err) {
        console.warn('[AnexosService] Falha ao persistir anexo em viagens.observacoes:', err);
      }
    }

    return itemNormalizado;
  }
}
