// supabase/functions/upload-to-drive/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Simple mock token (não usa Google Drive real)
const MOCK_ACCESS_TOKEN = "mock-token";
const MOCK_FOLDER_ID = "mock-folder-id";

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
    const form = await req.formData();
    // Extract fields (não são usados no mock, mas mantemos para futuro)
    const clienteId = form.get("clienteId")?.toString() ?? "";
    const nome = form.get("nome")?.toString() ?? "";
    const email = form.get("email")?.toString() ?? "";
    const telefone = form.get("telefone")?.toString() ?? "";
    // const parentFolderId = form.get("parentFolderId")?.toString();
    // In a real implementation we would use the mock token to create a folder and upload.
    const folderUrl = `https://drive.google.com/drive/folders/${MOCK_FOLDER_ID}`;
    const responseBody = { googleDriveFolderUrl: folderUrl };
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error in upload-to-drive function:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
