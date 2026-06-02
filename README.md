# PaxFlow

**Sistema de Gestão de Pós-Venda e Fluxo de Passageiros para Agências de Viagem**

Plataforma SaaS de CRM operacional focada no pós-venda turístico: acompanhamento de passageiros, SLAs de passaporte/visto, pipeline de orçamentos, reembolsos e gestão documental — tudo integrado ao Google Drive e com colaboração em tempo real.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | TypeScript, Vite 5, Tailwind CSS 3 |
| Backend & BD | Supabase (PostgreSQL + Auth + Realtime) |
| Upload | Google Drive API (OAuth 2.0) |
| Drag & Drop | SortableJS |
| Deploy | Cloudflare Pages / Vercel / Netlify |

---

## Funcionalidades

- **Mission Control (Inbox)** — Central de alertas estilo e-mail com SLA de passaporte (180d), reembolsos atrasados e lembretes manuais. Inclui Visualização em Calendário unificada com visões de MÊS, SEMANA e AGENDA, sumarização via Regex e legenda hover tooltip. **Atualizado com busca em tempo real de alta precisão cobrindo campos estruturados, datas formatadas e o consultor responsável.**
- **Kanban de Viagens** — 5 colunas com drag-and-drop, SLAs visuais e gestão de produtos. **Atualizado com campo de busca em tempo real de alto desempenho (destino, LOC, passageiro, consultor e observações) e modal de gerenciamento ampliado com cabeçalho de SLAs, consultor atribuído e uma aba dinâmica de Histórico de Reembolsos.**
- **Pipeline de Orçamentos** — 4 estágios com temperatura de lead, tags, notas e upload de documentos. **Atualizado com busca em tempo real no cabeçalho e modal de visualização reformulado em grid de 2 colunas: detalhes operacionais/documentos na esquerda e uma barra lateral na direita com status, temperatura, consultor com avatar, atalhos de contato (WhatsApp/Email), tags e cronômetro de SLA decorrido. Propostas e anexos podem ser abertos de forma inline através do novo visualizador interno.**
- **CRM de Clientes** — Ficha única com passaporte/visto, validade monitorada por SLA, upload drag-and-drop para Google Drive. **Atualizado com campo de busca omnipresente de alta abrangência e com o novo Visualizador de Documentos Inline PaxFlow, permitindo carregar com segurança passaportes e anexos do Google Drive sem redirecionamento externo. Inclui simulador Sandbox que desenha um documento de passaporte personalizado com dados reais do cliente.**
- **Central de Reembolsos** — Tabela com cronômetro SLA em tempo real, status inline e métricas consolidadas. **Atualizado com campo de busca em tempo real em memória abrangendo clientes, destinos, localizadores, fornecedores, tipos de serviço, status e valores formatados.**
- **Painel Administrativo (Configurações)** — Configuração de SLAs, gestão de consultores, integração Google Drive. Inclui aba "Importações" para importação em lote de chamados DIGISAC (CSV) com mapeamento inteligente de colunas, conversor monetário/temporal e fuzzy match de atendentes.
- **Cockpit de Tarefas** — Kanban interno standalone (todo.html) para planejamento da equipe

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (plano gratuito suficiente)
- (Opcional) Conta Google Workspace para integração com Drive

---

## Configuração e Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/paxflow.git
cd paxflow

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Preencha SUPABASE_URL, SUPABASE_ANON_KEY e demais variáveis

# Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

Crie o arquivo `.env` a partir do modelo `.env.example`:

```env
# 1. Supabase (Obrigatório)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon

# 2. Google OAuth (Opcional - Ativa Modo Real vs Sandbox)
# Se deixado em branco, o sistema entra em Modo Sandbox (simulador offline resiliente de uploads)
GOOGLE_CLIENT_ID=seu-client-id-do-google-cloud.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth-callback
```

---

## Integração com Google Drive (Obtenção de Token)

Caso decida utilizar a integração real com o Google Drive, o PaxFlow possui um script utilitário automático para gerar o `refresh_token` corporativo da agência:

1. Configure as variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no seu arquivo `.env` (consulte o guia detalhado em [google_drive_setup.md](google_drive_setup.md)).
2. Execute o script de autenticação local no terminal:
   ```bash
   node src/services/obterTokenGoogle.js
   ```
3. Siga o fluxo de login e concessão de permissão no navegador.
4. O terminal capturará o código automaticamente e exibirá o seu **Refresh Token** na tela. Copie-o e salve na aba **Geral** das **Configurações Admin** do painel do PaxFlow.

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run preview` | Preview do build de produção |

---

## Estrutura do Projeto

```
src/
├── main.ts           # Shell da SPA (auth, navegação, tema)
├── types/
│   └── index.ts      # Interfaces TypeScript do domínio
├── pages/
│   ├── Inbox.ts      # Mission Control (alertas SLA + Calendário)
│   ├── Dashboard.ts  # Kanban de viagens
│   ├── Orcamentos.ts # Pipeline de orçamentos
│   ├── Clientes.ts   # CRM de clientes
│   ├── Reembolsos.ts # Central de reembolsos
│   └── Configuracoes.ts # Painel admin (Configurações + Importador CSV)
├── services/
│   ├── supabase.ts   # Cliente Supabase + auth + perfil
│   ├── googleDrive.ts # Upload Google Drive OAuth2
│   ├── csvImporter.ts # Parser e importador de CSV inteligente
│   ├── dialog.ts     # Componentes de modal/dialog
│   └── avatars.ts    # Geração de avatares
├── todo.ts           # Kanban interno (standalone)
└── index.css         # Estilos globais + Tailwind
```

---

## Implantação

```bash
npm run build
# Envie o conteúdo de dist/ para seu CDN ou servidor estático
```

Configure as mesmas variáveis de ambiente no seu provedor de hospedagem.

---

## Licença

Este projeto é de propriedade de Thiago Costa. Todos os direitos reservados.

---

## Autoria

**Thiago Costa** — 2026

---

> Para propostas comerciais, demonstrações ou suporte, consulte o arquivo [`_documentation.md`](_documentation.md).
