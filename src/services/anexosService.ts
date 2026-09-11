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
   */
  public static async listarAnexos(viagemId?: string, clienteId?: string): Promise<DocumentoAnexo[]> {
    const listaFinal: DocumentoAnexo[] = [];

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
          error.code === 'PGRST200')
      ) {
        const fallbacks = await this.listarFallbackDrift();
        const filtrados = fallbacks.filter(
          item =>
            (viagemId && item.viagem_id === viagemId) ||
            (clienteId && item.cliente_id === clienteId)
        );
        listaFinal.push(...filtrados);
      }
    } catch {
      const fallbacks = await this.listarFallbackDrift();
      const filtrados = fallbacks.filter(
        item =>
          (viagemId && item.viagem_id === viagemId) ||
          (clienteId && item.cliente_id === clienteId)
      );
      listaFinal.push(...filtrados);
    }

    return listaFinal;
  }

  /**
   * Exclui um documento anexo do banco e do Storage.
   */
  public static async excluirAnexo(anexoId: string, storagePath?: string): Promise<boolean> {
    try {
      // 1. Tenta deletar no banco de dados
      const { error: dbErr } = await supabase
        .from(this.TABELA)
        .delete()
        .eq('id', anexoId);

      if (
        dbErr &&
        (dbErr.code === '42P01' ||
          dbErr.code === '42703' ||
          dbErr.code === 'PGRST204' ||
          dbErr.code === 'PGRST200')
      ) {
        await this.excluirFallbackDrift(anexoId);
      }

      // 2. Remove do Supabase Storage se tiver caminho
      if (storagePath && storagePath.startsWith('supabase-storage://')) {
        const pathNoBucket = storagePath.replace('supabase-storage://', '');
        try {
          await supabase.storage.from(this.BUCKET).remove([pathNoBucket]);
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
  // Persistido estruturadamente no Supabase (global_settings) - ZERO localStorage
  // ==========================================================================

  private static gerarIdSeguro(): string {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `anexo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private static async obterListaContingencia(): Promise<DocumentoAnexo[]> {
    try {
      const { data } = await supabase
        .from(this.TABELA_SETTINGS)
        .select('value')
        .eq('key', this.CHAVE_FALLBACK)
        .maybeSingle();

      if (data && data.value && Array.isArray(data.value)) {
        return data.value as DocumentoAnexo[];
      }
      return [];
    } catch {
      return [];
    }
  }

  private static async salvarFallbackDrift(anexo: DocumentoAnexo): Promise<DocumentoAnexo> {
    const lista = await this.obterListaContingencia();
    const itemNormalizado: DocumentoAnexo = {
      ...anexo,
      id: anexo.id || this.gerarIdSeguro(),
      created_at: anexo.created_at || new Date().toISOString()
    };

    lista.unshift(itemNormalizado);

    try {
      await supabase
        .from(this.TABELA_SETTINGS)
        .upsert({
          key: this.CHAVE_FALLBACK,
          value: lista,
          description: 'Documentos Anexos - Fallback resiliente para schema drift'
        });
    } catch (err) {
      console.warn('[AnexosService] Falha ao persistir em global_settings:', err);
    }

    return itemNormalizado;
  }

  private static async listarFallbackDrift(): Promise<DocumentoAnexo[]> {
    return await this.obterListaContingencia();
  }

  private static async excluirFallbackDrift(anexoId: string): Promise<void> {
    const lista = await this.obterListaContingencia();
    const novaLista = lista.filter(item => item.id !== anexoId);
    try {
      await supabase
        .from(this.TABELA_SETTINGS)
        .upsert({
          key: this.CHAVE_FALLBACK,
          value: novaLista,
          description: 'Documentos Anexos - Fallback resiliente para schema drift'
        });
    } catch {
      // silencioso
    }
  }
}
