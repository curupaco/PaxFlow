import { supabase } from './supabase';

declare const process: {
  env: {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  }
};

/**
 * Envia um documento do cliente de forma segura para o Google Drive central da agência.
 * O front-end faz um POST para a Supabase Edge Function 'upload-to-drive', que usa o
 * refresh_token corporativo salvo no banco de dados para autenticar e organizar os arquivos.
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
      .select('google_refresh_token, google_parent_folder_id')
      .maybeSingle();

    if (settingsErr) {
      console.error('Erro ao buscar global_settings no serviço de upload:', settingsErr);
    }

    const refreshToken = settings?.google_refresh_token;
    const parentFolderId = settings?.google_parent_folder_id || '';
    // O token é mock se for nulo, vazio ou começar com 'mock_'
    const isMockMode = !refreshToken || refreshToken.trim() === '' || refreshToken.startsWith('mock_');

    // Se NÃO estiver em modo mock (temos um token real configurado), enviamos para a Edge Function
    if (!isMockMode) {
      if (!supabase.functions) {
        throw new Error('Supabase Functions não instanciadas localmente. Impossível realizar o upload seguro.');
      }

      // Preparação dos dados para a chamada HTTP à Edge Function
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clienteId', clienteId);
      formData.append('nome', nomeCliente);
      formData.append('email', emailCliente);
      formData.append('telefone', telefoneCliente);
      if (parentFolderId) {
        formData.append('parentFolderId', parentFolderId);
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      console.log('Tentando upload seguro via Edge Function upload-to-drive...');
      const { data, error } = await supabase.functions.invoke('upload-to-drive', {
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (error) {
        if (error.status === 404 || (error.message && error.message.includes('Function not found'))) {
          throw new Error('A Edge Function "upload-to-drive" não está implantada. Entre em contato com o suporte.');
        }
        throw new Error(error.message || 'Erro retornado pela Edge Function.');
      }

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

      throw new Error('Retorno inválido da Edge Function.');
    }

    // 2. MOCK ROBUSTO / MODO SANDBOX (Ativo se google_refresh_token for mock ou ausente)
    console.info('Executando upload no Modo Sandbox/Simulador do PaxFlow...');
    
    // Simula a latência de upload no servidor (1.5 segundos)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const folderName = `${nomeCliente} - ${emailCliente} - ${telefoneCliente}`;
    const sanitizedFolderName = encodeURIComponent(folderName);
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

/**
 * Recupera um access token válido a partir do refresh token do Google cadastrado nas configurações globais.
 */
async function obterAccessToken(): Promise<string> {
  const { data: settings, error: settingsErr } = await supabase
    .from('global_settings')
    .select('google_refresh_token')
    .maybeSingle();

  if (settingsErr || !settings?.google_refresh_token) {
    throw new Error('Chave Google Refresh Token não configurada nas configurações globais.');
  }

  const refreshToken = settings.google_refresh_token.trim();

  // Se o token for mascarado para consultores comuns
  if (refreshToken === 'connected') {
    throw new Error('Por motivos de segurança, a visualização inline de documentos reais está reservada para administradores. Por favor, clique no botão "Abrir Original" para visualizar ou baixar este arquivo diretamente na sua conta do Google Drive corporativo.');
  }

  let clientId = (typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_ID) || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  let clientSecret = (typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_SECRET) || import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
  let realRefreshToken = refreshToken;

  if (realRefreshToken.includes('|||')) {
    const parts = realRefreshToken.split('|||');
    if (parts.length === 3) {
      clientId = parts[0];
      clientSecret = parts[1];
      realRefreshToken = parts[2];
    }
  }

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais de API do Google Cloud ausentes localmente no arquivo .env (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: realRefreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!tokenRes.ok) {
    const errData = await tokenRes.json().catch(() => ({}));
    throw new Error(`Erro ao obter access token do Google: ${errData.error_description || errData.error || tokenRes.statusText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * Baixa um arquivo do Google Drive como Blob.
 */
export async function obterArquivoBlob(fileId: string): Promise<Blob> {
  const accessToken = await obterAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Erro ao baixar arquivo do Google Drive: ${res.statusText}`);
  }

  return await res.blob();
}

/**
 * Exporta um arquivo nativo do Google Docs como PDF Blob.
 */
export async function exportarGoogleDocPdf(fileId: string): Promise<Blob> {
  const accessToken = await obterAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Erro ao exportar documento para PDF: ${res.statusText}`);
  }

  return await res.blob();
}

/**
 * Busca o ID, nome e tipo do primeiro arquivo contido em uma pasta do Google Drive.
 */
export async function obterPrimeiroArquivoDaPasta(folderId: string): Promise<{ id: string; mimeType: string; name: string }> {
  const accessToken = await obterAccessToken();
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime%20desc&fields=files(id,mimeType,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Erro ao listar arquivos da pasta do cliente: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.files || data.files.length === 0) {
    throw new Error('Nenhum documento encontrado na pasta do Google Drive deste cliente.');
  }

  return data.files[0];
}

