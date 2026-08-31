# PaxFlow

Plataforma SaaS de gestão operacional e fluxo de passageiros no turismo: acompanhamento de viagens, SLAs de passaporte/visto, pipeline de orçamentos, reembolsos e gestão documental — tudo integrado ao Supabase Storage e com colaboração em tempo real.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | TypeScript, Vite 5, Tailwind CSS 3 |
| Backend & BD | Supabase (PostgreSQL + Auth + Realtime) |
| Upload & Armazenamento | Supabase Storage + Canvas API (Compactação Client-side) |
| Drag & Drop | SortableJS |
| Gamificação | Web Audio API + Canvas-Confetti (CDN) |
| Fotos de Perfil | Supabase Storage + Canvas API (Compactação Client-side) |
| Deploy | Cloudflare Pages / Vercel / Netlify |

---

## Funcionalidades

- **Next Trip Engine™ (Motor Preditivo de Recompra & Ciclo de Vida do Viajante)** — Central comercial preditiva acessível no menu lateral principal (rota `#next-trip`) e em widget compacto nos Dashboards. Analisa o histórico de viagens, destinos anteriores, notas de NPS, ticket médio e sazonalidade para responder: *"Quais clientes da agência estão no momento ideal para comprar uma nova viagem?"*. Apresenta Score de Potencial de Recompra (0 a 100) baseado em 5 vetores estratégicos, agrupamento por Alto Potencial (>= 75) e Médio Potencial, ações de 1-Clique (*Criar Orçamento Preditivo* e *Disparar WhatsApp Personalizado*), ciclo de engajamento com snooze automático de 30 dias e agrupamento por titular da família/grupo.
- **PaxFlow Risk Score™ (Diagnóstico Preditivo de Saúde Operacional 0 a 100) [NEW]** — Inteligência preditiva de auditoria operacional que avalia continuamente cada viagem cadastrada. Calcula uma nota de saúde de 0 a 100 baseada em 4 pilares estratégicos: *Documental & Vistos* (SLA de 180 dias de passaportes), *Financeiro & LOCs* (quitação por formas de recebimento e conferência de reserva), *Logística & Vouchers* (anexo de documentos de embarque) e *SLAs Temporais*. Conta com isenções inteligentes para viagens nacionais e bate-volta, gaveta lateral interativa de diagnósticos (`RiskDiagnosisDrawer`) e exibição de badges dinâmicos (`🛡️ Risk Score: X/100`) no Kanban do Dashboard e na tela de gerenciamento de viagem (`EditTravelModal`).
- **Painel Preditivo de Risco & Churn (Inteligência 24/7) [NEW]** — Algoritmo ativo de prevenção contra perdas comerciais e erros operacionais. Monitora em tempo real cotações de orçamentos com leads esfriando por inatividade (Quente > 48h, Morno > 5d, Frio > 10d) ordenados por ticket financeiro e viagens fechadas prestes a embarcar com pendências de conferência de LOC, passaportes em SLA crítico ou falta de vouchers. Conta com ações rápidas de 1-Clique para disparo de mensagens pré-formatadas no WhatsApp, delegação de lembretes urgentes no Inbox da equipe e abertura direta de fichas.
- **Leitor e Importador em 1-Clique de PNR / E-mails de Emissão [NEW]** — Utilitário de inteligência de parsing de bilhetes e confirmações aéreas (`pnrParser.ts`). Permite colar o texto de e-mails de emissão (Gol, Azul, LATAM, Amadeus, Sabre) e extrair instantaneamente o Localizador (LOC), fornecedor e trechos do voo para autopreenchimento dos produtos da viagem sem digitação manual.
- **Ações em Massa e Seleção por Checkbox (Batch Operations) [NEW]** — Interface com seleção múltipla de clientes por checkboxes e barra flutuante de ações em lote para atribuição massiva de etiquetas/tags (ex: VIP, Grupo Disney 2027) e comunicados.
- **Trava de Segurança para Alterações Não Salvas [NEW]** — Componente `UnsavedChangesModal.ts` que monitora formulários modificados (`dirty state`) prevenindo descartes acidentais de dados, acompanhado de rotina sanitizada de desvinculação de ouvintes no desmonte de páginas.
- **Mensageria em Tempo Real & Alertas Automáticos [NEW]** — Sistema de sincronização instantânea em tempo real via WebSockets do Supabase (`postgres_changes`) com tempo de resposta sub-segundo (< 1s) para mensagens diretas P2P, solicitações de escala, menções `@`, lembretes e alertas operacionais. Atualiza a lista da Inbox e os contadores de forma reativa e fluida, sem necessidade de dar F5 ou recarregar a página. Conta com alertas sonoros corteses gerados nativamente via Web Audio API (*ding-dong* de tom duplo 880Hz ➔ 1174Hz) e Toasts flutuantes com nome do remetente.
- **Notificações Push Nativas no Celular (PWA no Android & iOS) [NEW]** — Suporte nativo a Web Push com Service Worker em segundo plano (`public/sw.js`) para smartphones Android e iOS 16.4+ (quando adicionado à Tela de Início). O aplicativo toca e vibra exibindo o alerta na tela de bloqueio do celular mesmo com o navegador ou app totalmente fechados, permitindo navegação direta para o alerta com 1 toque.
- **Modo Co-Piloto & Atendimento de Balcão [NEW]** — Notificação em tempo real enviada para o Inbox do consultor titular quando seu cliente for atendido presencialmente por outro consultor no balcão da agência (`🤝 Atendimento no Balcão (Co-Piloto)`), contendo registro de data, hora e resumo da ocorrência.
- **Padronização Global de Datas (dd/mm/aaaa) & Formatação Cortês [NEW]** — Utilitário centralizador `messageFormatter.ts` que converte enums e jargões técnicos do banco de dados para linguagem humana cortês e padroniza 100% das datas de solicitações, alertas e lembretes para o formato brasileiro `dd/mm/aaaa` (e `dd/mm/aaaa às HH:mm`).
- **Alertas de SLA de Segurança Máxima [NEW]** — Monitoramento preventivo ampliado contra perdas financeiras e falhas operacionais: alertas de pré-embarque de viagens e trechos aéreos emitidos com **7 dias (168h)** de antecedência (com escalação para prioridade URGENTE em menos de 48h), verificação de passaportes e vistos (SLA de 180 dias) e alertas de reembolso financeiro ativados preventivamente **2 dias antes** do estoiro do prazo.
- **Controle de Escala de Funcionários e Central Administrativa [NEW]** — Módulo completo integrado à aba do Inbox para gestão de escalas de turnos da equipe de vendas da agência. Apresenta grade mensal com visualização dos dias (1 a 31) com legenda de cores por horários (10-17, 12-19, 14-21, 15-22, Folga, Férias, Reunião, F), coluna de funcionários fixada (sticky) e destaque para o dia atual. Conta com fluxo de solicitações de troca de turno com aceite duplo entre consultores e aprovação final da gestão com notificação no Inbox, painel de Banco de Folgas (saldos e justificativas) e agenda de Treinamentos, Coffee e Eventos da agência.
- **Painel de Relatórios Gerenciais e Analytics [NEW]** — Painel analítico de alta fidelidade visual para acompanhar faturamento realizado, pipeline ativo, gaps de desistência e taxa de conversão comercial. Conta com gráficos SVG reativos (Donut e Funil) e tabela de performance da equipe de vendas restrita a administradores. Oferece 6 abas dedicadas de relatórios analíticos offline (Desempenho da Equipe, Alertas de SLA, Faturamento Realizado por Serviços, Motivos de Desistências, Previsão Preditiva com Funil Ponderado e Risco Operacional de Fornecedores). Suporta exportação universal para Microsoft Excel (CSV) e folha de estilo de impressão otimizada para PDF. **Agora otimizado com cálculo preciso de faturamento realizado baseado em Data Financeira, tratamento seguro de fuso horário local e atualização de dados em tempo real ao interagir com o Kanban de Viagens.**
- **Sistema de Comentários, Notas e Menções (@) [NEW]** — Seção colaborativa integrada a Orçamentos, Viagens e Produtos. Permite que consultores insiram notas com autocomplete de menção `@` a outros membros da equipe, gerando notificações em tempo real no banco de dados e reações em seus respectivos Inboxes. **Integrado agora com agendador de lembretes visual colapsável e parser de linguagem natural que varre e agenda tarefas automaticamente para consultores a partir de menções com datas e períodos (ex: @Amanda 20/08/2026 noite).**
- **Exclusão Administrativa com Controle de Acesso (RBAC) [NEW]** — Mecanismo de governança com validação baseada em cargo (Role-Based Access Control). Apenas administradores possuem acesso aos botões de exclusão de Clientes, Viagens (Vendas), Orçamentos, Reembolsos e Mensagens, acompanhados de confirmações de segurança e tratamento de dependências em cascata no banco de dados.
- **Mission Control (Inbox e Calendário)** — Central de alertas estilo e-mail com SLA de passaporte (180d), reembolsos atrasados e lembretes manuais. Inclui Visualização em Calendário unificada (visões de MÊS, SEMANA e AGENDA), sumarização via Regex e legenda tooltip. **Agora atualizado com pesquisa em tempo real de alta precisão, um sistema completo de Mensagens Diretas Internas (P2P) entre consultores (contendo autocomplete de contatos por tags no Para/Cc, pasta dedicada "Enviadas" e funcionalidade de resposta rápida integrada), suporte a histórico de conversas estruturado (Threading) que agrupa e exibe todas as mensagens anteriores sob um mesmo tema, e agendamento colaborativo e delegação de lembretes com cores diferenciadas por propriedade e status de conclusão riscado (line-through) integrado.**
- **Kanban de Viagens & Usabilidade Mobile [NEW]** — 5 colunas com drag-and-drop, SLAs visuais e gestão de produtos. **Redesenho 100% responsivo para smartphones com Botão Flutuante FAB (`+ Nova Viagem`), compartilhamento nativo de itinerários (`navigator.share`), modal full-screen para celular e gavetas inferiores (Bottom Sheets). Atualizado com campo de busca em tempo real de alto desempenho, modal de gerenciamento ampliado com abas de Histórico de Reembolsos, aba de Produtos/Serviços, e painel financeiro com exibição da Rentabilidade acumulada baseada no lucro líquido dos produtos salvos. O código de reserva (LOC) do produto/serviço agora é obrigatório (máximo 20 caracteres, código único). Conta agora com a quitação financeira do LOC por meio de N Formas de Recebimento cadastradas (com suporte para remover todos os pagamentos e retornar ao estado de "Sem Pagamento"). Inclui o processo de Conferência Financeira individual por LOC (restrito a admin, com bloqueio rígido de edições e travamento caso haja pendência de recebimento) e o processo de Conferência de Processo por Viagem (bloqueando dados cadastrais cadastrados, com exceção de status/etapa editável, anexos e comentários funcionais). Apresenta trava de transição de status: a movimentação a partir de 'Fechado' exige que o saldo de produtos esteja zerado e que cada produto esteja detalhado (soma de Tarifa + Taxa + Comissão igual ao Valor de Venda do produto).**
- **Pipeline de Orçamentos** — 4 estágios com temperatura de lead, tags, notas e upload de documentos. **Atualizado com busca em tempo real e modal de visualização em duas colunas. A busca por clientes recorrentes no autocomplete do formulário foi corrigida para precisão absoluta. Ao fechar uma venda, caso o cliente não possua documento cadastrado, exige e valida o CPF/CNPJ com máscara e verificação oficial de dígitos verificadores (suportando a nova máscara CNPJ Alfanumérico da Receita Federal). A data de nascimento do passageiro e a Data Financeiro agora são obrigatórias na conversão, garantindo a consistência com o financeiro, enquanto a data de volta tornou-se opcional.**
- **Gestão e Ficha de Clientes** — Ficha única com passaporte/visto, validade monitorada por SLA, upload seguro para o Supabase Storage. **Atualizado com busca omnipresente de alta abrangência, Visualizador de Documentos Inline PaxFlow e campo integrado para preenchimento e edição da Origem do Lead (WhatsApp, Instagram, Indicação, etc.) armazenada nas classificações do cliente. O campo Documento conta com máscara de digitação dinâmica para CPF/CNPJ e validação matemática de dígitos verificadores contra fraudes e erros humanos (admitindo inclusive caracteres alfanuméricos nas primeiras 12 posições do CNPJ), bloqueando o envio de formulários inválidos.**
- **Central de Reembolsos** — Tabela com cronômetro SLA em tempo real, status inline e métricas consolidadas. **Atualizado com campo de busca em tempo real em memória abrangendo clientes, destinos, localizadores, fornecedores, tipos de serviço, status e valores formatados.**
- **Sistema de Gamificação dos Consultores [NEW]** — Engajamento operacional por meio de ganho de XP e patentes temáticas (Mochileiro, Explorador, Navegador, Guia de Elite, Embaixador). Apresenta anel de progresso circular SVG gradiente e nível numérico ao redor do avatar na Sidebar (sincronizados ao vivo via Supabase Realtime) e displays de patente sob o nome do usuário.
- **Mural de Medalhas (Badges) [NEW]** — Grade interativa no perfil com 14 medalhas conquistáveis (SLA_CHAMP, DRIVE_MASTER, COMPLIANCE_HERO, etc.) exibidas em cores (conquistada) ou cinza com cadeado (bloqueada), acompanhadas de tooltips flutuantes em CSS contendo regras de desbloqueio.
- **Animações e Efeitos de Celebração [NEW]** — Comemoração ao subir de nível ou fechar vendas com explosões visuais de confete (canvas-confetti via CDN) e áudios de chimes musicais sintetizados dinamicamente via Web Audio API, além de um modal glassmorphic 3D.
- **Fotos de Perfil Personalizadas [NEW]** — Upload self-service de imagens do computador ou celular integrado ao Supabase Storage. As fotos são cortadas e comprimidas no navegador via Canvas para menos de 50KB antes de subir, economizando banda e armazenamento da agência.
- **Painel Administrativo & Configurações** — Gestão de parâmetros globais da agência, administração da equipe de consultores (perfis e roles), aba de importações em lote de chamados DIGISAC (CSV) e nova aba de "Automações & SLAs" para controle de prazos e transições de status.
- **Módulo de Cadastros (Central Unificada: Serviços, Destinos, Recebimentos, Campanhas, Metas e Modelos) [NEW]** — Nova página restrita a administradores que consolida 6 abas estratégicas: Gestão de Tipos de Produtos/Serviços (cores, ícones e campos extras), Cadastro de Destinos Turísticos (com suporte a higienização), Formas de Recebimento, **Campanhas de Vendas**, **Metas Financeiras** e o **Hub de Modelos de Mensagem (WhatsApp / Templates)**.
- **Localização de Erros e Tradução Global (I18n) [NEW]** — Utilitário centralizado `errorTranslator.ts` que intercepta e traduz erros técnicos em inglês (Supabase Auth, banco de dados PostgreSQL/RLS, uploads e erros de conexão de rede) para o Português do Brasil de forma amigável antes de exibi-los ao usuário.
- **Cockpit de Tarefas** — Kanban interno standalone (todo.html) para planejamento da equipe.
- **Navegação & UI Premium (Sidebar Colapsável, Perfil Centralizado & Lupa Vetorial)** — Shell de navegação avançado com barra lateral colapsável sob demanda (estado persistido via `localStorage` sob a chave `"paxflow-sidebar-collapsed"`). Centralização dos controles de identidade (avatar, nome, e-mail do consultor logado), alternador de tema claro/escuro e encerramento de sessão (logout) diretamente no rodapé da Sidebar, removendo elementos redundantes dos cabeçalhos das páginas. **Otimizado com layout vertical compacto e sistema de rolagem interna inteligente (`overflow-y-auto`) para se adaptar perfeitamente a viewports de menor resolution vertical ou níveis elevados de zoom sem quebrar o layout.** Campos de busca unificados com ícones vetoriais modernos (SVGs Heroicons) alinhados de forma absoluta e perfeitamente centrada.
- **Itinerário Digital Interativo [NEW]** — Rota pública mobile-first (`#itinerario?id=UUID`) acessível anonimamente pelo passageiro final, exibindo o cronograma completo de vôos, hotéis e vouchers organizados por dia com contagem regressiva para a partida.
- **Pesquisa NPS Pós-Viagem [NEW]** — Rota pública (`#feedback?id=UUID`) para coleta anônima de satisfação pós-viagem integrada às estatísticas administrativas e ao fluxo de dados.
- **Hub de Modelos de Mensagem (WhatsApp / Digisac) [NEW]** — Módulo de gestão de templates agora integrado ao menu **Cadastros**, com editor reativo drag-and-drop/clique-para-colar para 11 variáveis do sistema. Apresenta modal de disparo reativo com visualização da mensagem (WhatsApp Preview), suporte a envio direto e integração completa com a API Digisac (incluindo painel de histórico de conversa split-screen para monitorar o andamento da conversa com o cliente).
- **Campanhas de Vendas & Leaderboard [NEW]** — Aba unificada "Campanhas & Metas" agora disponível no menu **Cadastros**, listando campanhas ativas e renderizando o ranking (Leaderboard) de consultores ordenados por XP para engajar a equipe.
- **Códigos de Referência Sequenciais (ORC, VIA, RBS, CLI) [NEW]** — Sistema de geração automática de IDs internos sequenciais formatados (ex: `ORC-0001`, `VIA-0023`, `RBS-0009`, `CLI-0001`) ordenados retroativamente por data de criação (`created_at` ASC). Permite fácil citação e busca direta pelos códigos em todas as telas principais da aplicação.
- **Validação Automatizada de Viagens e Conferência de Processos [NEW]** — Novo motor de conformidade operacional que confere se as viagens em estágio 'Fechado' estão totalmente detalhadas e quitadas financeiramente por Formas de Recebimento. Permite travar a edição de cadastros via Conferência de Processo e oferece filtros por status de auditoria financeira/operacional.
- **Configurações de Identidade Visual (White-Label Branding) [NEW]** — Customização estética completa que permite o upload do logotipo oficial da agência (com compressão local por Canvas) e escolha de cor primária (hexadecimal) por seletor visual, aplicando as customizações automaticamente às telas públicas de itinerário e NPS dos passageiros.
- **Alertas Automatizados de Pré-Embarque e Pós-Viagem NPS [NEW]** — Alertas de cronograma no Inbox gerados automaticamente 48 horas antes do embarque do passageiro e 24 horas após o retorno, integrando ações rápidas para envio direto de mensagens customizadas via WhatsApp.
- **Métricas Avançadas de Performance e Rendimento de Equipe [NEW]** — Painel comercial analítico contendo indicadores de conversão de leads, tempo médio de fechamento de propostas em dias corridos, gap financeiro de desistências e ranking de experiência (XP) dos consultores.
- **Automações de Status e Transições de Fluxo [NEW]** — Motor de regras inteligente e integrado. Detecta interações do consultor (como anotações) para iniciar atendimentos de orçamentos, expira propostas por inatividade (30 dias) e gerencia os estágios de viagens (Pré-Embarque e Pós-Viagem) com base em datas cronológicas. Sincroniza também as solicitações de reembolsos com a viagem do cliente de forma bidirecional.
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

| Camada | Tecnologia |
| --- | --- |
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run preview` | Preview do build de produção |

---

## Estrutura do Projeto

```text
src/
├── main.ts           # Shell da SPA (auth, navegação, tema, sidebar, router)
├── index.css         # Estilos globais + Tailwind + Custom Animations
├── router.ts         # Roteador simples da SPA (mapeamento de rotas e hash navigation)
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
│   ├── Cadastros.ts  # Central de Cadastros (Serviços, Destinos, Recebimentos, Campanhas, Metas, Templates)
│   ├── Relatorios.ts # Painel de Relatórios Gerenciais (Desempenho, SLAs, Faturamento, Previsão, Fornecedores) [NEW]
│   ├── Configuracoes.ts # Painel admin (Parâmetros Globais, Consultores, Importações, Automações)
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
│   ├── viagensService.ts # Regras e persistência operacional de viagens e produtos
│   └── gamification.ts # Serviço de XP, níveis e regras de medalhas
└── utils/
    ├── masks.ts      # Utilitários de máscaras, validações (CPF/CNPJ, etc.)
    ├── errorTranslator.ts # Interceptador e tradutor amigável de erros (I18n)
    ├── mockData.ts   # Dados fictícios para demonstração e fallback offline
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
