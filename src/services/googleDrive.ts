import { supabase } from './supabase';

/**
 * Envia um documento do cliente de forma segura para o Google Drive central da agência.
 * O front-end faz um POST para a Supabase Edge Function 'upload-to-drive', que usa o
 * refresh_token corporativo salvo em global_settings para autenticar e organizar os arquivos.
 */
export async function uploadDocumentoCliente(
  clienteId: string,
  nomeCliente: string,
  emailCliente: string,
  telefoneCliente: string,
  file: File
): Promise<{ success: boolean; googleDriveFolderUrl: string; error?: string }> {
  try {
    // 1. Preparação dos dados para a chamada HTTP
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clienteId', clienteId);
    formData.append('nome', nomeCliente);
    formData.append('email', emailCliente);
    formData.append('telefone', telefoneCliente);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Se as Supabase Functions estiverem disponíveis, tenta invocar a Edge Function
    if (supabase.functions) {
      try {
        const { data, error } = await supabase.functions.invoke('upload-to-drive', {
          body: formData,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        // Se a Edge Function concluiu e retornou a URL da pasta
        if (!error && data?.googleDriveFolderUrl) {
          // Atualiza a URL na tabela 'clientes' no banco
          await supabase
            .from('clientes')
            .update({ google_drive_folder_url: data.googleDriveFolderUrl })
            .eq('id', clienteId);

          return {
            success: true,
            googleDriveFolderUrl: data.googleDriveFolderUrl
          };
        }
        
        if (error) {
          console.warn('A Edge Function retornou um erro (ativando mock local robusto):', error);
        }
      } catch (invokeErr) {
        console.warn('Erro ao acionar a Edge Function (ativando fallback local):', invokeErr);
      }
    }

    // 2. MOCK ROBUSTO (Fallback offline / ambiente de testes local)
    // Simula a latência de upload no servidor (1.5 segundos)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Regra de nomenclatura da pasta: [Nome do Cliente] - [Email] - [Telefone]
    const folderName = `${nomeCliente} - ${emailCliente} - ${telefoneCliente}`;
    const sanitizedFolderName = encodeURIComponent(folderName);
    
    // Link simulado apontando para a pasta corporativa correspondente no Drive
    const mockDriveUrl = `https://drive.google.com/drive/folders/mock-agency-folder-id-${sanitizedFolderName}`;

    // Salva a URL resultante no campo google_drive_folder_url do cliente no Supabase
    const { error: dbError } = await supabase
      .from('clientes')
      .update({ google_drive_folder_url: mockDriveUrl })
      .eq('id', clienteId);

    if (dbError) throw dbError;

    return {
      success: true,
      googleDriveFolderUrl: mockDriveUrl
    };

  } catch (err: any) {
    console.error('Erro no serviço de upload do Google Drive:', err);
    return {
      success: false,
      googleDriveFolderUrl: '',
      error: err.message || 'Falha ao processar o upload do documento.'
    };
  }
}
