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

- **Mission Control (Inbox)** — Central de alertas com SLA de passaporte (180d), reembolsos atrasados e lembretes manuais agendados
- **Kanban de Viagens** — 5 colunas (Fechado → Pós-Venda → Pré-Embarque → Pós-Viagem → Reembolso) com drag-and-drop, SLAs visuais e gestão de produtos
- **Pipeline de Orçamentos** — 4 estágios (Solicitado → Em Andamento → Aguardando → Concluído) com temperatura de lead, tags, notas e upload de documentos
- **CRM de Clientes** — Ficha única com passaporte/visto, validade monitorada por SLA, upload drag-and-drop para Google Drive com pastas automáticas por cliente
- **Central de Reembolsos** — Tabela com cronômetro SLA em tempo real, status inline e métricas consolidadas
- **Painel Administrativo** — Configuração de SLAs, gestão de consultores, integração Google Drive
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

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

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
│   ├── Inbox.ts      # Mission Control (alertas SLA)
│   ├── Dashboard.ts  # Kanban de viagens
│   ├── Orcamentos.ts # Pipeline de orçamentos
│   ├── Clientes.ts   # CRM de clientes
│   ├── Reembolsos.ts # Central de reembolsos
│   └── Configuracoes.ts # Painel admin
├── services/
│   ├── supabase.ts   # Cliente Supabase + auth + perfil
│   ├── googleDrive.ts # Upload Google Drive OAuth2
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
