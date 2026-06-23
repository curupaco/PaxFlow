# PaxFlow

**Plataforma de Gestão Operacional e Fluxo de Passageiros para Agências de Viagem**

Plataforma SaaS de gestão operacional e fluxo de passageiros no turismo: acompanhamento de viagens, SLAs de passaporte/visto, pipeline de orçamentos, reembolsos e gestão documental — tudo integrado ao Supabase Storage e com colaboração em tempo real.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | TypeScript, Vite 5, Tailwind CSS 3 |
| Backend & BD | Supabase (PostgreSQL + Auth + Realtime) |
| Upload & Armazenamento | Supabase Storage + Canvas API (Compactação Client-side) |
| Drag & Drop | SortableJS |
| Gamificação | Web Audio API + Canvas-Confetti (CDN) |
| Fotos de Perfil | Supabase Storage + Canvas API (Compactação Client-side) |
| Deploy | Cloudflare Pages / Vercel / Netlify |

---

## Funcionalidades

- **Dashboard de Resultados (Analytics) [NEW]** — Painel analítico de alta fidelidade visual para acompanhar faturamento realizado, pipeline ativo, gaps de desistência e taxa de conversão comercial. Conta com gráficos SVG reativos (Donut e Funil) e tabela de performance da equipe de vendas restrita a administradores.
- **Sistema de Comentários, Notas e Menções (@) [NEW]** — Seção colaborativa integrada a Orçamentos, Viagens e Produtos. Permite que consultores insiram notas com autocomplete de menção `@` a outros membros da equipe, gerando notificações em tempo real no banco de dados e reações em seus respectivos Inboxes.
- **Exclusão Administrativa com Controle de Acesso (RBAC) [NEW]** — Mecanismo de governança com validação baseada em cargo (Role-Based Access Control). Apenas administradores possuem acesso aos botões de exclusão de Clientes, Viagens (Vendas), Orçamentos, Reembolsos e Mensagens, acompanhados de confirmações de segurança e tratamento de dependências em cascata no banco de dados.
- **Mission Control (Inbox)** — Central de alertas estilo e-mail com SLA de passaporte (180d), reembolsos atrasados e lembretes manuais. Inclui Visualização em Calendário unificada (visões de MÊS, SEMANA e AGENDA), sumarização via Regex e legenda tooltip. **Agora atualizado com pesquisa em tempo real de alta precisão, um sistema completo de Mensagens Diretas Internas (P2P) entre consultores (contendo autocomplete de contatos por tags no Para/Cc, pasta dedicada "Enviadas" e funcionalidade de resposta rápida integrada), e suporte a histórico de conversas estruturado (Threading) que agrupa e exibe todas as mensagens anteriores sob um mesmo tema.**
- **Kanban de Viagens** — 5 colunas com drag-and-drop, SLAs visuais e gestão de produtos. **Atualizado com campo de busca em tempo real de alto desempenho, modal de gerenciamento ampliado com abas de Histórico de Reembolsos, aba de Produtos/Serviços, e painel financeiro com exibição da Rentabilidade acumulada baseada no lucro líquido dos produtos salvos. O código de reserva (LOC) do produto/serviço agora é obrigatório (máximo 20 caracteres, código único). Apresenta trava de transição de status: a movimentação a partir de 'Fechado' exige que o saldo de produtos esteja zerado e que cada produto esteja detalhado (soma de Tarifa + Taxa + Comissão igual ao Valor de Venda do produto).**
- **Pipeline de Orçamentos** — 4 estágios com temperatura de lead, tags, notas e upload de documentos. **Atualizado com busca em tempo real e modal de visualização em duas colunas. A busca por clientes recorrentes no autocomplete do formulário foi corrigida para precisão absoluta. Ao fechar uma venda, caso o cliente não possua documento cadastrado, exige e valida o CPF/CNPJ com máscara e verificação oficial de dígitos verificadores (suportando a nova máscara CNPJ Alfanumérico da Receita Federal). A data de nascimento do passageiro agora é obrigatória na conversão, e a data de volta tornou-se opcional.**
- **Gestão e Ficha de Clientes** — Ficha única com passaporte/visto, validade monitorada por SLA, upload seguro para o Supabase Storage. **Atualizado com busca omnipresente de alta abrangência e Visualizador de Documentos Inline PaxFlow. O campo Documento conta com máscara de digitação dinâmica para CPF/CNPJ e validação matemática de dígitos verificadores contra fraudes e erros humanos (admitindo inclusive caracteres alfanuméricos nas primeiras 12 posições do CNPJ), bloqueando o envio de formulários inválidos.**
- **Central de Reembolsos** — Tabela com cronômetro SLA em tempo real, status inline e métricas consolidadas. **Atualizado com campo de busca em tempo real em memória abrangendo clientes, destinos, localizadores, fornecedores, tipos de serviço, status e valores formatados.**
- **Sistema de Gamificação dos Consultores [NEW]** — Engajamento operacional por meio de ganho de XP e patentes temáticas (Mochileiro, Explorador, Navegador, Guia de Elite, Embaixador). Apresenta anel de progresso circular SVG gradiente e nível numérico ao redor do avatar na Sidebar (sincronizados ao vivo via Supabase Realtime) e displays de patente sob o nome do usuário.
- **Mural de Medalhas (Badges) [NEW]** — Grade interativa no perfil com 14 medalhas conquistáveis (SLA_CHAMP, DRIVE_MASTER, COMPLIANCE_HERO, etc.) exibidas em cores (conquistada) ou cinza com cadeado (bloqueada), acompanhadas de tooltips flutuantes em CSS contendo regras de desbloqueio.
- **Animações e Efeitos de Celebração [NEW]** — Comemoração ao subir de nível ou fechar vendas com explosões visuais de confete (canvas-confetti via CDN) e áudios de chimes musicais sintetizados dinamicamente via Web Audio API, além de um modal glassmorphic 3D.
- **Fotos de Perfil Personalizadas [NEW]** — Upload self-service de imagens do computador ou celular integrado ao Supabase Storage. As fotos são cortadas e comprimidas no navegador via Canvas para menos de 50KB antes de subir, economizando banda e armazenamento da agência.
- **Painel Administrativo & Configurações** — Configuração de SLAs, gestão de consultores, limite máximo de upload configurável. Inclui aba "Importações" para importação em lote de chamados DIGISAC (CSV) com mapeamento inteligente de colunas, conversor monetário/temporal e fuzzy match de atendentes.
- **Módulo de Cadastros (Gestão Dinâmica de Produtos) [NEW]** — Nova página restrita a administradores que gerencia os tipos de produtos/serviços disponíveis na agência, permitindo customizar cores, ícones e campos extras adicionais dinâmicos diretamente pelo painel administrativo.
- **Localização de Erros e Tradução Global (I18n) [NEW]** — Utilitário centralizado `errorTranslator.ts` que intercepta e traduz erros técnicos em inglês (Supabase Auth, banco de dados PostgreSQL/RLS, uploads e erros de conexão de rede) para o Português do Brasil de forma amigável antes de exibi-los ao usuário.
- **Cockpit de Tarefas** — Kanban interno standalone (todo.html) para planejamento da equipe.
- **Navegação & UI Premium (Sidebar Colapsável, Perfil Centralizado & Lupa Vetorial)** — Shell de navegação avançado com barra lateral colapsável sob demanda (estado persistido via `localStorage` sob a chave `"paxflow-sidebar-collapsed"`). Centralização dos controles de identidade (avatar, nome, e-mail do consultor logado), alternador de tema claro/escuro e encerramento de sessão (logout) diretamente no rodapé da Sidebar, removendo elementos redundantes dos cabeçalhos das páginas. **Otimizado com layout vertical compacto e sistema de rolagem interna inteligente (`overflow-y-auto`) para se adaptar perfeitamente a viewports de menor resolution vertical ou níveis elevados de zoom sem quebrar o layout.** Campos de busca unificados com ícones vetoriais modernos (SVGs Heroicons) alinhados de forma absoluta e perfeitamente centrada.
- **Utilitários de Banco de Dados** — Acompanha o script `supabase/clean_db.sql`, permitindo efetuar uma limpeza de dados transacionais e de teste em ambientes Supabase de maneira 100% resiliente e sem interferir na infraestrutura cadastrada.


---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (plano gratuito suficiente)

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
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env

# Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

Crie o arquivo `.env` a partir do modelo `.env.example`:

```env
# 1. Supabase (Obrigatório)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```


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
├── main.ts           # Shell da SPA (auth, navegação, tema, sidebar, router)
├── index.css         # Estilos globais + Tailwind + Custom Animations
├── todo.ts           # Kanban interno (standalone todo.html logic)
├── types/
│   └── index.ts      # Interfaces TypeScript do domínio
├── components/       # Componentes e Modais da UI modularizados
│   ├── dashboard/
│   │   └── DashboardTemplates.ts # Templates HTML/CSS do Kanban
│   ├── inbox/
│   │   ├── EmailReaderModal.ts   # Visualizador de e-mail e histórico/threading
│   │   └── NewMessageModal.ts    # Formulário P2P e autocomplete de contatos
│   ├── orcamentos/
│   │   └── VerNotasModal.ts      # Modal de orçamento com duas colunas e anexo inline
│   └── profile/
│   │   └── MeuPerfilModal.ts     # Modal de perfil, XP, medalhas e upload de avatar
├── pages/
│   ├── ComercialDashboard.ts # Dashboard de resultados (Analytics + Performance)
│   ├── Inbox.ts      # Mission Control (alertas SLA + Calendário + P2P)
│   ├── Dashboard.ts  # Kanban de viagens (operação + detalhamento de produtos)
│   ├── Orcamentos.ts # Pipeline de orçamentos (negociação + conversão)
│   ├── Clientes.ts   # Gestão de clientes (ficha + documentação inline)
│   ├── Reembolsos.ts # Central de reembolsos (tabela SLA + busca em memória)
│   ├── Cadastros.ts  # Gestão dinâmica de tipos de produtos (Admin)
│   ├── Configuracoes.ts # Painel admin (Parâmetros, Consultores + Importador CSV)
│   └── Login.ts      # Tela de login e recuperação de credenciais
├── services/
│   ├── supabase.ts   # Cliente Supabase + Auth + Session helper
│   ├── googleDrive.ts # Serviço legado de links do Drive
│   ├── csvImporter.ts # Parser e mapeador de CSV inteligente
│   ├── dialog.ts     # Componentes de modal/dialog customizados (Alerts/Confirm)
│   ├── avatars.ts    # Compressão de imagem canvas e geração de avatares SVG
│   ├── comments.ts   # Serviço colaborativo de comentários e menções (@)
│   ├── documentViewer.ts # Lightbox inline para PDFs e imagens do storage
│   ├── inboxService.ts   # Regras de negócio, contadores e alertas do Inbox
│   ├── orcamentosService.ts # Serviços auxiliares para persistência de orçamentos
│   └── gamification.ts # Serviço de XP, níveis e regras de medalhas
└── utils/
    ├── masks.ts      # Utilitários de máscaras, validações (CPF/CNPJ, etc.)
    ├── errorTranslator.ts # Interceptador e tradutor amigável de erros (I18n)
    └── celebrations.ts # Celebrações de level up (canvas-confetti + Web Audio API)
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

> Para propostas comerciais, demonstrações ou suporte, consulte o arquivo [`docs/documentation.md`](docs/documentation.md).
