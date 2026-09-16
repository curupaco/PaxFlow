import { supabase } from './supabase';
import { DocumentoAnexo, TipoDocumentoAnexo } from '../types';
import { PdfCompressorService } from './pdfCompressorService';

/**
 * Formata bytes de forma amigável para humanos, exibindo KB e MB em conjunto.
 * Ex: 97.8 MB (100.133 KB) ou 450 KB (0.4 MB) ou 32 KB (0.03 MB)
 */
export function formatarTamanhoArquivo(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) return '';
  const kb = bytes / 1024;
  const mb = kb / 1024;

  if (mb >= 1.0) {
    const kbInt = Math.round(kb).toLocaleString('pt-BR');
    return `${mb.toFixed(1)} MB (${kbInt} KB)`;
  }

  const kbFormatado = kb < 10 ? kb.toFixed(1) : Math.round(kb).toLocaleString('pt-BR');
  const mbFormatado = mb < 0.01 ? '< 0.01' : (mb < 0.1 ? mb.toFixed(2) : mb.toFixed(1));
  return `${kbFormatado} KB (${mbFormatado} MB)`;
}

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
   * Formata bytes em string amigável contendo MB e KB para leitura humana imediata.
   */
  public static formatarTamanho(bytes?: number): string {
    return formatarTamanhoArquivo(bytes);
  }

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
  /**
   * Inferência inteligente de tipo e rótulo baseado no nome do arquivo
   */
  public static inferirTipoPorNome(nomeArquivo: string, nomePassageiro?: string): { tipo: TipoDocumentoAnexo; rotulo: string } {
    const lower = nomeArquivo.toLowerCase();
    const nomeBase = nomeArquivo.replace(/\.[^/.]+$/, '').trim();

    if (lower.includes('passaporte') || lower.includes('passport')) {
      return {
        tipo: 'PASSAPORTE',
        rotulo: nomePassageiro ? `Passaporte - ${nomePassageiro}` : (nomeBase || 'Passaporte')
      };
    }
    if (lower.includes('cnh') || lower.includes('habilitacao') || lower.includes('motorista')) {
      return {
        tipo: 'CNH',
        rotulo: nomePassageiro ? `CNH - ${nomePassageiro}` : (nomeBase || 'CNH Habilitação')
      };
    }
    if (lower.includes('rg') || lower.includes('identidade')) {
      return {
        tipo: 'RG',
        rotulo: nomePassageiro ? `RG - ${nomePassageiro}` : (nomeBase || 'Documento de Identidade RG')
      };
    }
    if (lower.includes('visto') || lower.includes('visa')) {
      return {
        tipo: 'VISTO',
        rotulo: nomePassageiro ? `Visto - ${nomePassageiro}` : (nomeBase || 'Visto Consular')
      };
    }
    if (lower.includes('voo') || lower.includes('bilhete') || lower.includes('aereo') || lower.includes('passagem') || lower.includes('ticket')) {
      return {
        tipo: 'VOUCHER_AEREO',
        rotulo: nomeBase || 'Bilhete Aéreo'
      };
    }
    if (lower.includes('transfer') || lower.includes('traslado') || lower.includes('carro') || lower.includes('locacao') || lower.includes('veiculo')) {
      return {
        tipo: 'VOUCHER_TRANSPORTE',
        rotulo: nomeBase || 'Voucher Transfer / Locação'
      };
    }
    if (lower.includes('hotel') || lower.includes('resort') || lower.includes('pousada') || lower.includes('hospedagem')) {
      return {
        tipo: 'VOUCHER_HOTEL',
        rotulo: nomeBase || 'Voucher Hospedagem'
      };
    }
    if (lower.includes('ingresso') || lower.includes('parque') || lower.includes('show') || lower.includes('atracao') || lower.includes('tour')) {
      return {
        tipo: 'INGRESSO',
        rotulo: nomeBase || 'Ingresso / Atração'
      };
    }
    if (lower.includes('seguro') || lower.includes('apolice') || lower.includes('assist')) {
      return {
        tipo: 'SEGURO',
        rotulo: nomeBase || 'Apólice de Seguro Viagem'
      };
    }
    if (lower.includes('contrato') || lower.includes('termo')) {
      return {
        tipo: 'CONTRATO',
        rotulo: nomeBase || 'Contrato de Viagem'
      };
    }
    if (lower.includes('roteiro') || lower.includes('itinerario') || lower.includes('guia')) {
      return {
        tipo: 'ROTEIRO',
        rotulo: nomeBase || 'Roteiro de Viagem'
      };
    }

    return {
      tipo: 'OUTROS',
      rotulo: nomeBase || 'Documento Anexo'
    };
  }

  /**
   * Envia um novo documento para o Supabase Storage e registra na tabela documentos_anexos.
   */
  public static async uploadAnexo(params: {
    file: File;
    rotulo: string;
    tipo_documento: TipoDocumentoAnexo;
    numero_documento?: string;
    data_validade?: string;
    viagem_id?: string;
    cliente_id?: string;
    user_id?: string;
    onProgress?: (mensagem: string) => void;
  }): Promise<DocumentoAnexo> {
    const { file, rotulo, tipo_documento, numero_documento, data_validade, viagem_id, cliente_id, user_id, onProgress } = params;

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

    // 2. Otimização de imagens ou PDFs que excedam o limite
    let finalFile = file;
    try {
      finalFile = await this.compactarImagemSePossivel(file);
    } catch {
      // prossegue com o original
    }

    if (PdfCompressorService.precisaComprimir(finalFile, maxMb)) {
      finalFile = await PdfCompressorService.comprimirPdfSeNecessario(finalFile, maxMb, (prog) => {
        if (onProgress) onProgress(prog.mensagem);
      });
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

    const isInvalidId = (val?: any): boolean => {
      if (!val || typeof val !== 'string') return true;
      const trimmed = val.trim();
      if (!trimmed || trimmed === 'dep' || trimmed.startsWith('legado-') || trimmed === 'null' || trimmed === 'undefined') {
        return true;
      }
      return false;
    };

    const sanitizedViagemId = !isInvalidId(viagem_id) ? viagem_id!.trim() : undefined;
    const sanitizedClienteId = !isInvalidId(cliente_id) ? cliente_id!.trim() : undefined;
    const sanitizedUserId = !isInvalidId(user_id) ? user_id!.trim() : undefined;

    // 5. Salva na tabela documentos_anexos com payload sanitizado
    const payload: Partial<DocumentoAnexo> = {
      viagem_id: sanitizedViagemId,
      cliente_id: sanitizedClienteId,
      rotulo: rotulo.trim() || finalFile.name,
      tipo_documento: tipo_documento || 'OUTROS',
      numero_documento: numero_documento?.trim() || undefined,
      data_validade: data_validade?.trim() || undefined,
      nome_original: finalFile.name,
      storage_path: storagePathCompleto,
      mime_type: finalFile.type || 'application/octet-stream',
      tamanho_bytes: finalFile.size,
      created_by: sanitizedUserId,
      created_at: new Date().toISOString()
    };

    let documentoSalvo: DocumentoAnexo;

    try {
      const { data, error: dbErr } = await supabase
        .from(this.TABELA)
        .insert(payload)
        .select()
        .single();

      if (dbErr) {
        // Fallback para schema drift em colunas novas (42703, PGRST204 ou erro de schema cache)
        const isColumnError =
          dbErr.code === '42703' ||
          dbErr.code === 'PGRST204' ||
          dbErr.code === 'PGRST200' ||
          dbErr.message?.includes('schema cache') ||
          dbErr.message?.includes('column');

        if (isColumnError) {
          console.warn('[AnexosService] Colunas adicionais inexistentes ou erro de schema. Tentando payload base.');
          const payloadBase = { ...payload };
          delete payloadBase.numero_documento;
          delete payloadBase.data_validade;

          const { data: dataBase, error: errBase } = await supabase
            .from(this.TABELA)
            .insert(payloadBase)
            .select()
            .single();

          if (errBase) {
            documentoSalvo = await this.salvarFallbackDrift(payload as DocumentoAnexo);
          } else {
            documentoSalvo = { ...dataBase, ...payload } as DocumentoAnexo;
          }
        } else if (
          dbErr.code === '42P01' ||
          dbErr.code === 'PGRST116' ||
          dbErr.message?.includes('does not exist')
        ) {
          console.warn('[AnexosService] Schema drift detectado em documentos_anexos. Ativando fallback resiliente.');
          documentoSalvo = await this.salvarFallbackDrift(payload as DocumentoAnexo);
        } else {
          console.warn('[AnexosService] Erro ao gravar em documentos_anexos. Ativando fallback resiliente:', dbErr);
          documentoSalvo = await this.salvarFallbackDrift(payload as DocumentoAnexo);
        }
      } else {
        documentoSalvo = data as DocumentoAnexo;
      }
    } catch (err: any) {
      console.warn('[AnexosService] Exceção capturada ao gravar anexo. Ativando fallback resiliente:', err);
      documentoSalvo = await this.salvarFallbackDrift(payload as DocumentoAnexo);
    }

    // 6. Sincronização retrocompatível com a ficha do cliente
    if (cliente_id) {
      try {
        const updateCliente: Record<string, any> = {};

        if (tipo_documento === 'PASSAPORTE') {
          updateCliente.google_drive_folder_url = storagePathCompleto;
          if (numero_documento?.trim()) updateCliente.passaporte_numero = numero_documento.trim();
          if (data_validade?.trim()) updateCliente.passaporte_validade = data_validade.trim();
        } else if ((tipo_documento === 'RG' || tipo_documento === 'CNH') && numero_documento?.trim()) {
          // Atualiza documento principal se ainda não houver
          const { data: cData } = await supabase.from('clientes').select('documento').eq('id', cliente_id).maybeSingle();
          if (!cData?.documento) {
            updateCliente.documento = numero_documento.trim();
          }
        }

        if (Object.keys(updateCliente).length > 0) {
          await supabase.from('clientes').update(updateCliente).eq('id', cliente_id);
        }
      } catch (clienteSyncErr) {
        console.warn('[AnexosService] Aviso ao sincronizar metadados com tabela clientes:', clienteSyncErr);
      }
    }

    return documentoSalvo;
  }

  /**
   * Lista os anexos vinculados a uma viagem e ao seu cliente/passageiro.
   * Consulta a tabela documentos_anexos, faz fallback em viagens.observacoes e
   * inspeciona o Supabase Storage diretamente para nunca perder nenhum arquivo enviado.
   */
  public static async listarAnexos(viagemId?: string, clienteId?: string): Promise<DocumentoAnexo[]> {
    const listaFinal: DocumentoAnexo[] = [];
    let tabelaExiste = true;

    // Se forneceu apenas viagemId, busca o clienteId titular da viagem para sincronização bidirecional
    let clienteIdEfetivo = clienteId;
    if (viagemId && !clienteIdEfetivo) {
      try {
        const { data: vInfo } = await supabase
          .from('viagens')
          .select('cliente_id')
          .eq('id', viagemId)
          .maybeSingle();
        if (vInfo?.cliente_id) {
          clienteIdEfetivo = vInfo.cliente_id;
        }
      } catch {}
    }

    // 1. Consulta a tabela oficial documentos_anexos
    try {
      let query = supabase.from(this.TABELA).select('*').order('created_at', { ascending: false });

      if (viagemId && clienteIdEfetivo) {
        query = query.or(`viagem_id.eq.${viagemId},cliente_id.eq.${clienteIdEfetivo}`);
      } else if (viagemId) {
        query = query.eq('viagem_id', viagemId);
      } else if (clienteIdEfetivo) {
        query = query.eq('cliente_id', clienteIdEfetivo);
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
    const pastasParaBuscar = [viagemId, clienteIdEfetivo].filter(Boolean) as string[];

    for (const pasta of pastasParaBuscar) {
      if (supabase && supabase.storage) {
        try {
          const { data: storageFiles, error: storageErr } = await supabase.storage
            .from(this.BUCKET)
            .list(pasta, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

          if (!storageErr && storageFiles && storageFiles.length > 0) {
            for (const f of storageFiles) {
              if (!f.name || f.name.startsWith('.')) continue;

              const pathCompleto = `supabase-storage://${pasta}/${f.name}`;
              const jaExiste = listaFinal.some(item => item.storage_path === pathCompleto);

              if (!jaExiste) {
                const nomeLegivel = f.name.replace(/^\d+_/, '');
                const { tipo: tipoInferido, rotulo: rotuloInferido } = this.inferirTipoPorNome(nomeLegivel);

                listaFinal.push({
                  id: f.id || `storage-${pasta}-${f.name}`,
                  viagem_id: pasta === viagemId ? viagemId : undefined,
                  cliente_id: pasta === clienteIdEfetivo ? clienteIdEfetivo : undefined,
                  rotulo: rotuloInferido,
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

    // 4. Se o cliente possui google_drive_folder_url legado que ainda não conste na lista, inclui
    if (clienteIdEfetivo) {
      try {
        const { data: cData } = await supabase
          .from('clientes')
          .select('google_drive_folder_url, nome, passaporte_numero, passaporte_validade')
          .eq('id', clienteIdEfetivo)
          .maybeSingle();

        if (cData?.google_drive_folder_url) {
          const jaExisteUrl = listaFinal.some(item => item.storage_path === cData.google_drive_folder_url);
          if (!jaExisteUrl) {
            listaFinal.push({
              id: `legado-cliente-${clienteIdEfetivo}`,
              cliente_id: clienteIdEfetivo,
              rotulo: cData.passaporte_numero ? `Passaporte ${cData.passaporte_numero}` : `Documento de ${cData.nome || 'Cliente'}`,
              tipo_documento: 'PASSAPORTE',
              numero_documento: cData.passaporte_numero || undefined,
              data_validade: cData.passaporte_validade || undefined,
              nome_original: 'Documento Cadastrado',
              storage_path: cData.google_drive_folder_url,
              mime_type: 'application/pdf',
              tamanho_bytes: 0,
              created_at: new Date().toISOString()
            });
          }
        }
      } catch (errLegado) {
        console.warn('[AnexosService] Aviso ao verificar documentos legados do cliente:', errLegado);
      }
    }

    return listaFinal;
  }

  /**
   * Verifica se o usuário tem permissão para excluir o documento (autor ou admin)
   */
  public static podeExcluirAnexo(anexo: DocumentoAnexo, usuarioId?: string, usuarioRole?: string): boolean {
    if (usuarioRole === 'admin') return true;
    if (!anexo.created_by) return true; // legados sem autor podem ser gerenciados
    if (usuarioId && anexo.created_by === usuarioId) return true;
    return false;
  }

  /**
   * Exclui um documento anexo do banco e do Storage.
   * Trata de forma resiliente anexos oficiais da tabela documentos_anexos,
   * anexos legados vinculados à tabela clientes (legado-cliente-{id})
   * e remoção física no Supabase Storage.
   */
  public static async excluirAnexo(anexoId: string, storagePath?: string): Promise<boolean> {
    try {
      // 1. Trata documentos legados originados da coluna google_drive_folder_url de clientes
      if (anexoId && anexoId.startsWith('legado-cliente-')) {
        const clienteId = anexoId.replace('legado-cliente-', '');
        if (clienteId) {
          const { error: errCli } = await supabase
            .from('clientes')
            .update({
              google_drive_folder_url: null,
              passaporte_numero: null,
              passaporte_validade: null
            })
            .eq('id', clienteId);

          if (errCli) {
            console.warn('[AnexosService] Erro ao limpar documento legado da tabela clientes:', errCli);
          }
        }
      } else {
        // 2. Tenta deletar na tabela oficial de documentos_anexos
        const { error: errDel } = await supabase
          .from(this.TABELA)
          .delete()
          .eq('id', anexoId);

        if (errDel) {
          console.warn('[AnexosService] Aviso ao deletar de documentos_anexos:', errDel);
        }

        // Se o arquivo deletado estiver espelhado no google_drive_folder_url de algum cliente, desvincula
        if (storagePath) {
          try {
            const cliQuery = supabase.from('clientes');
            if (cliQuery && typeof cliQuery.update === 'function') {
              await cliQuery
                .update({
                  google_drive_folder_url: null,
                  passaporte_numero: null,
                  passaporte_validade: null
                })
                .eq('google_drive_folder_url', storagePath);
            }
          } catch (cErr) {
            console.warn('[AnexosService] Aviso ao desvincular documento do cliente:', cErr);
          }
        }
      }

      // 3. Remove do Supabase Storage se tiver caminho
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

  /**
   * Gera texto formatado para envio no WhatsApp do cliente com o link/detalhes do documento
   */
  public static montarMensagemWhatsApp(anexo: DocumentoAnexo, nomeCliente?: string, destinoViagem?: string): string {
    const saudacao = nomeCliente ? `Olá, *${nomeCliente}*!` : 'Olá!';
    const contexto = destinoViagem ? ` referente à sua viagem para *${destinoViagem}*` : '';
    
    let tipoNome = 'seu documento';
    if (anexo.tipo_documento === 'PASSAPORTE') tipoNome = 'seu Passaporte';
    else if (anexo.tipo_documento === 'VOUCHER_AEREO') tipoNome = 'sua Passagem Aérea / Bilhete';
    else if (anexo.tipo_documento === 'VOUCHER_HOTEL') tipoNome = 'seu Voucher de Hospedagem';
    else if (anexo.tipo_documento === 'INGRESSO') tipoNome = 'seus Ingressos';
    else if (anexo.tipo_documento === 'SEGURO') tipoNome = 'sua Apólice de Seguro Viagem';
    else if (anexo.tipo_documento === 'CONTRATO') tipoNome = 'seu Contrato de Viagem';
    else if (anexo.tipo_documento === 'ROTEIRO') tipoNome = 'seu Roteiro de Viagem';

    let msg = `${saudacao}\n\nSegue em anexo ${tipoNome}${contexto}:\n📎 *${anexo.rotulo}*`;
    if (anexo.numero_documento) {
      msg += `\n🔢 Número/Localizador: *${anexo.numero_documento}*`;
    }
    if (anexo.data_validade) {
      msg += `\n📅 Validade: *${new Date(anexo.data_validade).toLocaleDateString('pt-BR')}*`;
    }
    msg += `\n\nQualquer dúvida, nossa equipe está à disposição! ✈️`;

    return encodeURIComponent(msg);
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
