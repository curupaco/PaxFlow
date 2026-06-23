import { supabase } from './supabase';

/**
 * Auxiliar para comprimir imagens antes do upload para o Supabase Storage.
 * Redimensiona para no máximo 2000px na maior dimensão e reduz a qualidade JPEG para 75%.
 */
async function compressImageIfPossible(file: File): Promise<File> {
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
      if (!ctx) {
        resolve(file);
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            console.log(`[Storage Compression] Comprimido de ${(file.size / 1024).toFixed(1)}KB para ${(compressedFile.size / 1024).toFixed(1)}KB`);
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.75
      );
    };
    img.onerror = () => {
      resolve(file);
    };
  });
}

/**
 * Envia um documento do cliente de forma segura para o Supabase Storage (bucket 'documentos-clientes').
 * O caminho final no bucket será: `${clienteId}/${timestamp}_${nome_do_arquivo}`.
 * A referência salva no banco terá o formato `supabase-storage://${filePath}`.
 */
export async function uploadDocumentoCliente(
  clienteId: string,
  nomeCliente: string,
  emailCliente: string,
  telefoneCliente: string,
  file: File
): Promise<{ success: boolean; googleDriveFolderUrl: string; error?: string; isMock?: boolean }> {
  if (typeof window !== 'undefined' && (window as any).paxflowSandbox) {
    try {
      const { showCustomAlert } = await import('./dialog');
      await showCustomAlert(
        'Este é o modo de demonstração do PaxFlow. Para fins de segurança, uploads reais de arquivos estão bloqueados neste ambiente. ' +
        'O sistema irá simular o upload com sucesso e disponibilizar um documento demonstrativo para visualização.',
        'Upload Demonstrativo Ativo'
      );
    } catch (e) {
      console.warn('Erro ao exibir alerta personalizado:', e);
    }
    return {
      success: true,
      googleDriveFolderUrl: '/documento_demo.pdf',
      isMock: true
    };
  }

  try {
    if (!supabase || !supabase.storage) {
      throw new Error('Cliente do Supabase ou serviço de Storage não inicializado no sistema.');
    }

    // 1. Obter o limite de tamanho configurado no banco (global_settings)
    let maxMb = 25;
    try {
      const { data: settings } = await supabase
        .from('global_settings')
        .select('limite_upload_mb')
        .maybeSingle();
      if (settings && typeof settings.limite_upload_mb === 'number') {
        maxMb = settings.limite_upload_mb;
      }
    } catch (dbErr) {
      console.warn('[Storage] Erro ao carregar limite de upload do banco, usando padrão de 25MB:', dbErr);
    }

    // 2. Tentar comprimir o arquivo caso seja uma imagem
    let finalFile = file;
    try {
      finalFile = await compressImageIfPossible(file);
    } catch (compressErr) {
      console.warn('[Storage] Falha ao comprimir imagem, prosseguindo com arquivo original:', compressErr);
    }

    // 3. Validar se o arquivo final excede o limite configurado (em bytes)
    const sizeInMb = finalFile.size / (1024 * 1024);
    if (sizeInMb > maxMb) {
      throw new Error(`O arquivo selecionado (${sizeInMb.toFixed(1)}MB) excede o limite máximo permitido de ${maxMb}MB.`);
    }

    // 4. Sanitizar o nome do arquivo e gerar o caminho único dentro do bucket
    const sanitizedFileName = finalFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${clienteId}/${Date.now()}_${sanitizedFileName}`;

    console.log(`[Storage] Iniciando upload real para o bucket documentos-clientes: ${filePath}`);

    // 5. Executar o upload do arquivo para o Supabase Storage
    const { data, error: uploadErr } = await supabase.storage
      .from('documentos-clientes')
      .upload(filePath, finalFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadErr) {
      console.error('[Storage] Erro durante o upload:', uploadErr);
      throw new Error(`Falha no armazenamento na nuvem: ${uploadErr.message}`);
    }

    const storageUrl = `supabase-storage://${filePath}`;

    // 6. Atualizar a referência na tabela 'clientes' no banco
    // Apenas se o ID do cliente for um UUID válido (para evitar erros com IDs temporários/orçamentos)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(clienteId)) {
      const { error: dbError } = await supabase
        .from('clientes')
        .update({ google_drive_folder_url: storageUrl })
        .eq('id', clienteId);

      if (dbError) {
        console.error('[Storage] Erro ao salvar referência na tabela clientes:', dbError);
        throw new Error(`Referência salva, mas falhou ao atualizar cadastro do cliente: ${dbError.message}`);
      }
    }

    return {
      success: true,
      googleDriveFolderUrl: storageUrl,
      isMock: false
    };

  } catch (err: any) {
    console.error('[Storage] Erro geral no serviço de upload:', err);
    return {
      success: false,
      googleDriveFolderUrl: '',
      error: err.message || 'Falha geral ao processar o upload do documento.'
    };
  }
}
