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
): Promise<{ success: boolean; googleDriveFolderUrl: string; error?: string; isMock?: boolean }> {
  try {
    // 1. Busca as configurações globais no Supabase para verificar o token cadastrado
    const { data: settings, error: settingsErr } = await supabase
      .from('global_settings')
      .select('google_refresh_token')
      .maybeSingle();

    if (settingsErr) {
      console.error('Erro ao buscar global_settings no serviço de upload:', settingsErr);
    }

    const refreshToken = settings?.google_refresh_token;
    // O token é mock se for nulo, vazio ou começar com 'mock_'
    const isMockMode = !refreshToken || refreshToken.trim() === '' || refreshToken.startsWith('mock_');

    // Se NÃO estiver em modo mock (temos um token real configurado), somos obrigados a usar a Edge Function
    if (!isMockMode) {
      if (!supabase.functions) {
        return {
          success: false,
          googleDriveFolderUrl: '',
          error: 'Cliente Supabase não está configurado com suporte a Edge Functions neste ambiente.'
        };
      }

      // Preparação dos dados para a chamada HTTP à Edge Function
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clienteId', clienteId);
      formData.append('nome', nomeCliente);
      formData.append('email', emailCliente);
      formData.append('telefone', telefoneCliente);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      try {
        const { data, error } = await supabase.functions.invoke('upload-to-drive', {
          body: formData,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        // Se a Edge Function retornou erro da chamada
        if (error) {
          console.error('Erro retornado pela Edge Function upload-to-drive:', error);
          let errorMessage = 'Erro de execução na Edge Function do Google Drive.';
          if (error.status === 404 || (error.message && error.message.includes('Function not found'))) {
            errorMessage = 'A Edge Function "upload-to-drive" não está implantada no Supabase (Erro 404). Certifique-se de implantá-la para permitir uploads reais.';
          } else if (error.message) {
            errorMessage = error.message;
          }
          return {
            success: false,
            googleDriveFolderUrl: '',
            error: errorMessage
          };
        }

        // Se deu tudo certo
        if (data?.googleDriveFolderUrl) {
          // Atualiza a URL na tabela 'clientes' no banco
          await supabase
            .from('clientes')
            .update({ google_drive_folder_url: data.googleDriveFolderUrl })
            .eq('id', clienteId);

          return {
            success: true,
            googleDriveFolderUrl: data.googleDriveFolderUrl,
            isMock: false
          };
        }

        // Caso a resposta venha vazia por algum motivo inesperado
        return {
          success: false,
          googleDriveFolderUrl: '',
          error: 'A Edge Function respondeu sem retornar a URL de destino da pasta do Google Drive.'
        };

      } catch (invokeErr: any) {
        console.error('Exceção ao invocar a Edge Function:', invokeErr);
        let msg = invokeErr.message || 'Falha ao conectar com o serviço do Supabase.';
        if (msg.includes('Failed to fetch') || invokeErr.status === 404) {
          msg = 'A Edge Function "upload-to-drive" não está implantada no Supabase (Erro 404). Por favor, implante-a antes de realizar uploads de produção.';
        }
        return {
          success: false,
          googleDriveFolderUrl: '',
          error: msg
        };
      }
    }

    // 2. MOCK ROBUSTO / MODO SANDBOX (Ativo se google_refresh_token for mock ou ausente)
    console.info('Executando upload no Modo Sandbox/Simulador do PaxFlow...');
    
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
      googleDriveFolderUrl: mockDriveUrl,
      isMock: true
    };

  } catch (err: any) {
    console.error('Erro geral no serviço de upload do Google Drive:', err);
    return {
      success: false,
      googleDriveFolderUrl: '',
      error: err.message || 'Falha geral ao processar o upload do documento.'
    };
  }
}

