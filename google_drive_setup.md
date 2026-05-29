# Guia de Configuração — Integração com Google Drive (OAuth2)

Este guia orienta passo a passo como configurar as credenciais do Google Cloud Console para ativar o armazenamento real e automático de documentos de clientes do PaxFlow diretamente no Google Drive da sua agência.

---

## 📋 Pré-requisitos

1. Uma conta Google (pessoal do Gmail ou corporativa do Google Workspace).
2. O PaxFlow instalado e rodando em ambiente local.
3. Arquivo `.env` configurado com as chaves do Supabase.

---

## 🛠️ Passo 1: Criar um Projeto no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. No menu superior esquerdo (próximo à marca Google Cloud), clique na lista de projetos e selecione **"Novo Projeto"** (New Project).
3. Dê um nome ao seu projeto (ex: `PaxFlow Drive Integration`) e clique em **"Criar"**.

---

## 🔑 Passo 2: Ativar a Google Drive API

1. No painel do projeto recém-criado, clique na barra de busca superior e procure por **"Google Drive API"**.
2. Clique no resultado **Google Drive API** e, na página que se abre, clique no botão azul **"Ativar"** (Enable).

---

## 👤 Passo 3: Configurar a Tela de Consentimento OAuth (OAuth Consent Screen)

Como o PaxFlow precisa acessar os arquivos do Drive para fazer uploads, é necessário configurar o consentimento de login:

1. No menu lateral esquerdo do console, acesse **APIs e Serviços** (APIs & Services) -> **Tela de consentimento OAuth** (OAuth consent screen).
2. Escolha o tipo de usuário (**User Type**):
   - **Externo (External)**: Se você estiver usando um Gmail pessoal (`@gmail.com`).
   - **Interno (Internal)**: Se estiver usando uma conta corporativa do Google Workspace da sua agência (recomendado).
   - Clique em **"Criar"**.
3. Preencha as **Informações do aplicativo** básicas:
   - *Nome do aplicativo*: `PaxFlow`
   - *E-mail de suporte do usuário*: Selecione o seu e-mail.
   - *E-mail de contato do desenvolvedor*: Seu e-mail de contato.
   - Clique em **"Salvar e Continuar"**.
4. **Escopos (Scopes)**:
   - Clique em **"Adicionar ou remover escopos"**.
   - No filtro de pesquisa, busque por `drive` ou digite manualmente o escopo:
     `https://www.googleapis.com/auth/drive`
   - Marque a caixinha deste escopo (que concede acesso total de leitura e escrita para criar e gerenciar pastas).
   - Clique em **"Salvar e Continuar"**.
5. **Usuários de teste (Test users)** (Se você marcou o tipo como "Externo"):
   - Clique em **"Add Users"** e insira o próprio e-mail do Gmail que você usará para autenticar o Drive corporativo.
   - Clique em **"Salvar e Continuar"**.

---

## 🔐 Passo 4: Criar Credenciais OAuth 2.0 (Client ID & Client Secret)

1. No menu lateral esquerdo, vá em **APIs e Serviços** -> **Credenciais** (Credentials).
2. Clique no botão superior **"+ Criar Credenciais"** (+ Create Credentials) e escolha **"ID do cliente OAuth"** (OAuth client ID).
3. Em **Tipo de aplicativo** (Application type), selecione **"Aplicativo da Web"** (Web application).
4. No campo **Nome**, você pode colocar `PaxFlow OAuth Client`.
5. Em **Origens JavaScript autorizadas** (Authorized JavaScript origins), adicione:
   - `http://localhost:3000` (porta padrão de desenvolvimento do Vite/Node local)
6. Em **URIs de redirecionamento autorizadas** (Authorized redirect URIs), adicione:
   - `http://localhost:3000/oauth-callback` (URI exata escutada pelo nosso script)
7. Clique em **"Criar"**.
8. Uma janela pop-up aparecerá mostrando o seu **ID de cliente** (Client ID) e o seu **Segredo do cliente** (Client Secret). Copie ambos imediatamente!

---

## 💾 Passo 5: Atualizar o arquivo `.env` local

Abra o arquivo `.env` na raiz do seu projeto PaxFlow e preencha as variáveis que você acabou de gerar:

```env
GOOGLE_CLIENT_ID=seu-client-id-copiado.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret-copiado
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth-callback
```

---

## 🔄 Passo 6: Gerar o Token de Atualização (Refresh Token)

Com o arquivo `.env` preenchido e salvo, vamos rodar o script utilitário automático do PaxFlow para autenticar sua conta Google e capturar o token persistente:

1. Abra um terminal na raiz do projeto e execute:
   ```bash
   node src/services/obterTokenGoogle.js
   ```
2. O terminal exibirá um link azul e tentará abrir automaticamente o seu navegador.
3. Se o navegador não abrir, copie e cole o link no seu navegador.
4. Faça o login com a conta Google que possui o Drive onde as pastas dos clientes serão salvas.
5. O Google exibirá um aviso de que *"O Google não verificou este app"* (isso é normal para apps em desenvolvimento). Clique em **"Avançado"** -> **"Acessar PaxFlow (não seguro)"**.
6. Marque a caixinha permitindo acesso ao seu Google Drive e clique em **"Continuar"**.
7. Uma página da web será aberta dizendo **"Sucesso! Autorização concedida."**
8. Volte ao seu terminal. Lá estará impresso o seu **Refresh Token** na cor verde!

---

## 🚀 Passo 7: Salvar o Token nas Configurações do PaxFlow

1. Copie o Refresh Token exibido no seu terminal.
2. Com o PaxFlow rodando (`npm run dev`), faça login no sistema com um perfil de **Administrador**.
3. Acesse a página **"Configurações Admin"** no menu lateral.
4. Na aba **"Geral"**, role até a seção de integração com o Google Drive.
5. No campo **"Refresh Token do Google"** (ou correspondente em Produção), cole o código completo copiado e salve.
6. Pronto! A partir de agora, ao cadastrar ou gerenciar um cliente e realizar o upload de um documento na **Ficha de Clientes**, o PaxFlow irá criar automaticamente uma pasta estruturada no Drive corporativo (`[Nome] - [Email] - [Telefone]`) e salvará o arquivo de forma 100% segura e organizada!
