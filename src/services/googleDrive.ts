import { supabase } from './supabase';

declare const process: {
  env: {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  }
};

/**
 * Realiza o upload direto client-side (no navegador) para o Google Drive.
 * É utilizado como fallback resiliente quando a Edge Function remota não está implantada.
 */
async function uploadDiretoClientSide(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  nomeCliente: string,
  emailCliente: string,
  telefoneCliente: string,
  file: File,
  clienteId: string
): Promise<{ success: boolean; googleDriveFolderUrl: string; error?: string }> {
  try {
    if (!clientId || !clientSecret) {
      throw new Error('Credenciais de API do Google Cloud ausentes localmente no arquivo .env (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');
    }

    // 1. Obter um Access Token atualizado a partir do Refresh Token corporativo
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      throw new Error(`Erro ao obter access token do Google: ${errData.error_description || errData.error || tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('Não foi possível recuperar o token de acesso temporário.');
    }

    // 2. Definir nomenclatura e buscar se a pasta do cliente já existe no Drive
    const folderName = `${nomeCliente} - ${emailCliente} - ${telefoneCliente}`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )}`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    let folderId = '';
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        folderId = searchData.files[0].id;
      }
    }

    // 3. Se a pasta não existe no Drive do Gmail pessoal, criamos uma nova pasta
    if (!folderId) {
      const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      if (!createFolderRes.ok) {
        const createFolderErr = await createFolderRes.json().catch(() => ({}));
        throw new Error(`Erro ao criar pasta no Drive: ${createFolderErr.error?.message || createFolderRes.statusText}`);
      }

      const folderData = await createFolderRes.json();
      folderId = folderData.id;
    }

    if (!folderId) {
      throw new Error('Falha ao obter o ID da pasta de armazenamento.');
    }

    // 4. Ler o arquivo binário em ArrayBuffer para transmissão multipart
    const reader = new FileReader();
    const fileBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    // 5. Construir corpo Multipart binário conforme protocolo RFC 2387 da API do Google Drive
    const boundary = '314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaPartHeader = `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

    const encoder = new TextEncoder();
    const part1 = encoder.encode(`${delimiter}${metadataPart}${delimiter}${mediaPartHeader}`);
    const part2 = new Uint8Array(fileBytes);
    const part3 = encoder.encode(`\r\n${closeDelim}`);

    const multipartBody = new Uint8Array(part1.byteLength + part2.byteLength + part3.byteLength);
    multipartBody.set(part1, 0);
    multipartBody.set(part2, part1.byteLength);
    multipartBody.set(part3, part1.byteLength + part2.byteLength);

    // 6. Efetuar a requisição de upload direto para a API do Google Drive
    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.json().catch(() => ({}));
      throw new Error(`Erro no envio de arquivo para o Google Drive: ${uploadErr.error?.message || uploadRes.statusText}`);
    }

    const googleDriveFolderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    // 7. Atualizar a URL resultante no campo google_drive_folder_url do cliente no Supabase
    const { error: dbError } = await supabase
      .from('clientes')
      .update({ google_drive_folder_url: googleDriveFolderUrl })
      .eq('id', clienteId);

    if (dbError) throw dbError;

    return {
      success: true,
      googleDriveFolderUrl
    };

  } catch (err: any) {
    console.error('Falha no upload direto client-side:', err);
    return {
      success: false,
      googleDriveFolderUrl: '',
      error: err.message || 'Falha ao processar o upload do documento.'
    };
  }
}

/**
 * Envia um documento do cliente de forma segura para o Google Drive central da agência.
 * O front-end faz um POST para a Supabase Edge Function 'upload-to-drive', que usa o
 * refresh_token corporativo salvo em global_settings para autenticar e organizar os arquivos.
 * Caso a Edge Function não esteja implantada (404/CORS), ativa o upload direto client-side.
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

    // Se NÃO estiver em modo mock (temos um token real configurado), tentamos usar a Edge Function
    if (!isMockMode) {
      // 1.1 Parse do token combinado (Client ID + Client Secret + Refresh Token)
      let clientId = process.env.GOOGLE_CLIENT_ID || '';
      let clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
      let realRefreshToken = refreshToken || '';

      if (realRefreshToken.includes('|||')) {
        const parts = realRefreshToken.split('|||');
        if (parts.length === 3) {
          clientId = parts[0];
          clientSecret = parts[1];
          realRefreshToken = parts[2];
        }
      }

      // Caso as Edge Functions locais do Supabase Client não estejam instanciadas, faz fallback automático
      if (!supabase.functions) {
        console.warn('Supabase Functions não instanciadas localmente. Fazendo fallback direto para Google Drive API...');
        const directResult = await uploadDiretoClientSide(clientId, clientSecret, realRefreshToken, nomeCliente, emailCliente, telefoneCliente, file, clienteId);
        return {
          success: directResult.success,
          googleDriveFolderUrl: directResult.googleDriveFolderUrl,
          error: directResult.error,
          isMock: false
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
        console.log('Tentando upload via Edge Function upload-to-drive...');
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
            googleDriveFolderUrl: data.googleDriveFolderUrl,
            isMock: false
          };
        }

        // Se a Edge Function retornou erro (por exemplo, erro 404 por não estar implantada), ativamos o fallback direto!
        console.warn('Edge Function indisponível (404/CORS). Ativando fallback resiliente direto para Google Drive API...', error);
        const directResult = await uploadDiretoClientSide(clientId, clientSecret, realRefreshToken, nomeCliente, emailCliente, telefoneCliente, file, clienteId);
        return {
          success: directResult.success,
          googleDriveFolderUrl: directResult.googleDriveFolderUrl,
          error: directResult.error,
          isMock: false
        };

      } catch (invokeErr: any) {
        // Se a chamada falhou completamente (como erro de CORS/Conexão do navegador), ativamos o fallback direto!
        console.warn('Erro de rede na Edge Function. Ativando fallback resiliente direto para Google Drive API...', invokeErr);
        const directResult = await uploadDiretoClientSide(clientId, clientSecret, realRefreshToken, nomeCliente, emailCliente, telefoneCliente, file, clienteId);
        return {
          success: directResult.success,
          googleDriveFolderUrl: directResult.googleDriveFolderUrl,
          error: directResult.error,
          isMock: false
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

/**
 * Recupera um access token válido a partir do refresh token do Google cadastrado nas configurações globais.
 */
async function obterAccessToken(): Promise<string> {
  const { data: settings, error: settingsErr } = await supabase
    .from('global_settings')
    .select('google_refresh_token')
    .maybeSingle();

  if (settingsErr || !settings?.google_refresh_token) {
    throw new Error('Chave Google Refresh Token não encontrada nas configurações globais.');
  }

  let clientId = process.env.GOOGLE_CLIENT_ID || '';
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  let refreshToken = settings.google_refresh_token;

  if (refreshToken.includes('|||')) {
    const parts = refreshToken.split('|||');
    if (parts.length === 3) {
      clientId = parts[0];
      clientSecret = parts[1];
      refreshToken = parts[2];
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
      refresh_token: refreshToken,
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
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
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
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Erro ao exportar documento para PDF: ${res.statusText}`);
  }

  return await res.blob();
}

