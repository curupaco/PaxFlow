const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

// 1. Parser do arquivo .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error(`❌ Arquivo .env não encontrado em: ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const cleanLine = line.trim();
  if (cleanLine && !cleanLine.startsWith('#')) {
    const parts = cleanLine.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      envVars[key] = val;
    }
  }
});

const clientId = envVars.GOOGLE_CLIENT_ID;
const clientSecret = envVars.GOOGLE_CLIENT_SECRET;
const redirectUri = envVars.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth-callback';

if (!clientId || clientId.includes('@') || !clientSecret || clientSecret.startsWith('Pf_')) {
  console.error('\n❌ ERRO: Suas credenciais no arquivo .env ainda parecem conter e-mail ou senha pessoal.');
  console.error('Por favor, siga os passos do guia docs/google_drive_setup.md para criar o Client ID e Client Secret corretos no Google Cloud Console e salve no arquivo .env antes de executar este script.\n');
  process.exit(1);
}

// 2. Gerar URL do Consentimento do Google
// Usamos o escopo drive.file para permitir gerenciar apenas arquivos criados pelo app
const scope = 'https://www.googleapis.com/auth/drive';
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
  `client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(scope)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n======================================================');
console.log('🔄 INICIANDO FLUXO DE OAUTH2 PARA GOOGLE DRIVE');
console.log('======================================================\n');
console.log('1. Abrindo a página de consentimento do Google no seu navegador...');
console.log('2. Caso não abra automaticamente, acesse este link manual:\n');
console.log(`🔗 \x1b[36m${authUrl}\x1b[0m\n`);

// Tenta abrir o navegador automaticamente
const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
exec(`${startCmd} "${authUrl.replace(/"/g, '\\"')}"`, (err) => {
  // Ignora erros de abertura automática
});

// 3. Subir servidor local temporário para interceptar o código de autenticação
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  
  if (reqUrl.pathname === '/oauth-callback') {
    const code = reqUrl.searchParams.get('code');
    
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Erro</h1><p>Código de autorização não recebido.</p>');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; color: #1e293b;">
          <div style="background-color: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); text-align: center; max-width: 400px;">
            <h1 style="color: #10b981; margin-bottom: 1rem;">✅ Sucesso!</h1>
            <p style="font-size: 0.9rem; color: #64748b; line-height: 1.5;">Autorização concedida. Volte ao seu terminal de linha de comando para copiar o seu <b>Refresh Token</b>.</p>
          </div>
        </body>
      </html>
    `);

    console.log('\n3. Código de autorização capturado com sucesso!');
    console.log('4. Solicitando tokens ao Google...');

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error(`\n❌ Erro retornado pelo Google: ${data.error_description || data.error}`);
        process.exit(1);
      }

      console.log('\n======================================================');
      console.log('🎉 TOKEN DE ATUALIZAÇÃO (REFRESH TOKEN) OBTIDO!');
      console.log('======================================================\n');
      console.log(`🔑 \x1b[32m\x1b[1m${data.refresh_token}\x1b[0m\n`);
      console.log('Copie este código acima completo (incluindo sublinhados/hifens)');
      console.log('e insira-o no campo "Produção (Real)" nas Configurações do PaxFlow.\n');
      
    } catch (tokenErr) {
      console.error('\n❌ Falha na troca do token:', tokenErr);
    } finally {
      server.close();
      process.exit(0);
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Escuta na porta 3000
server.listen(3000, () => {
  console.log('📡 Servidor de autenticação local rodando e aguardando redirecionamento na porta 3000...\n');
});
