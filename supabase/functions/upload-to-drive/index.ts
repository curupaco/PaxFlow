// @ts-nocheck
// supabase/functions/upload-to-drive/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req: Request) => {
  // ---- CORS pre‑flight ----
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
      },
    });
  }

  // ---- Apenas POST ----
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    // 1. Decodificar payload (suporta JSON para testes e FormData para uploads de arquivo)
    let isTest = false;
    let file: any = null;
    let clienteId = "";
    let nome = "";
    let email = "";
    let telefone = "";
    let parentFolderId = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body.test) {
        isTest = true;
      }
    } else {
      const form = await req.formData();
      isTest = form.get("test") === "true";
      file = form.get("file");
      clienteId = form.get("clienteId")?.toString() ?? "";
      nome = form.get("nome")?.toString() ?? "";
      email = form.get("email")?.toString() ?? "";
      telefone = form.get("telefone")?.toString() ?? "";
      parentFolderId = form.get("parentFolderId")?.toString() ?? "";
    }

    console.log(`[UploadEdgeFunction] Iniciando processamento. IsTest: ${isTest}, Cliente: ${nome}`);

    // 2. Conectar ao Supabase para obter tokens e configurações
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis de ambiente do Supabase não configuradas na Edge Function (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    }

    // Busca configurações globais do banco de dados
    const settingsRes = await fetch(`${supabaseUrl}/rest/v1/global_settings?select=google_refresh_token,google_parent_folder_id`, {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`
      }
    });

    if (!settingsRes.ok) {
      throw new Error(`Falha ao carregar global_settings: ${settingsRes.statusText}`);
    }

    const settingsList = await settingsRes.json();
    const settings = settingsList[0];

    let refreshToken = settings?.google_refresh_token || "";
    let clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
    let clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

    // Se o refresh token foi salvo no formato composto clientId|||clientSecret|||refreshToken
    if (refreshToken.includes("|||")) {
      const parts = refreshToken.split("|||");
      if (parts.length === 3) {
        clientId = parts[0];
        clientSecret = parts[1];
        refreshToken = parts[2];
      }
    }

    if (!refreshToken) {
      throw new Error("Token do Google Drive (Refresh Token) não cadastrado no painel do PaxFlow.");
    }

    if (!clientId || !clientSecret) {
      throw new Error("Credenciais de API do Google Cloud ausentes (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Certifique-se de preenchê-las nas variáveis de ambiente do Supabase.");
    }

    // 3. Obter Access Token da API do Google
    console.log("[UploadEdgeFunction] Solicitando access token ao Google OAuth2...");
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      throw new Error(`Erro ao autenticar com o Google OAuth2: ${errData.error_description || errData.error || tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Se for apenas teste de conexão, retorna sucesso aqui
    if (isTest) {
      return new Response(JSON.stringify({ success: true, message: "Conexão com Google Drive ativa e autorizada!" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!file) {
      throw new Error("Nenhum arquivo enviado para upload.");
    }

    // 4. Buscar ou Criar a pasta do Cliente no Drive
    const parentId = parentFolderId || settings?.google_parent_folder_id || "root";
    const folderName = `${nome} - ${email} - ${telefone}`;
    
    console.log(`[UploadEdgeFunction] Buscando pasta "${folderName}" na pasta pai "${parentId}"...`);
    const query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!searchRes.ok) {
      throw new Error(`Erro ao buscar pasta no Drive: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    let folderId = "";

    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
      console.log(`[UploadEdgeFunction] Pasta encontrada. ID: ${folderId}`);
    } else {
      console.log("[UploadEdgeFunction] Pasta não encontrada. Criando nova pasta...");
      const createFolderRes = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId]
        })
      });

      if (!createFolderRes.ok) {
        throw new Error(`Erro ao criar pasta no Drive: ${createFolderRes.statusText}`);
      }

      const createFolderData = await createFolderRes.json();
      folderId = createFolderData.id;
      console.log(`[UploadEdgeFunction] Pasta criada com sucesso. ID: ${folderId}`);
    }

    // 5. Upload do Arquivo (Multipart upload)
    console.log(`[UploadEdgeFunction] Fazendo upload do arquivo: "${file.name}"...`);
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const fileBuffer = await file.arrayBuffer();
    
    const head = new TextEncoder().encode(metadataPart + `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`);
    const tail = new TextEncoder().encode(closeDelim);

    const bodyBuffer = new Uint8Array(head.length + fileBuffer.byteLength + tail.length);
    bodyBuffer.set(head, 0);
    bodyBuffer.set(new Uint8Array(fileBuffer), head.length);
    bodyBuffer.set(tail, head.length + fileBuffer.byteLength);

    const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": bodyBuffer.length.toString()
      },
      body: bodyBuffer
    });

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      throw new Error(`Erro ao fazer upload do arquivo no Drive: ${uploadRes.statusText} - ${uploadErr}`);
    }

    console.log("[UploadEdgeFunction] Upload concluído com sucesso!");
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    return new Response(JSON.stringify({ googleDriveFolderUrl: folderUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (err: any) {
    console.error("[UploadEdgeFunction] Erro crítico:", err);
    return new Response(JSON.stringify({ error: err.message || "Falha interna no processamento do upload." }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
