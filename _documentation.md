# PaxFlow — Documentação Comercial e Técnica

> **Sistema de Gestão de Pós-Venda e Fluxo de Passageiros para Agências de Viagem**
>
> _Versão 1.0.0 — © 2026 Thiago Costa_

---

## Sumário

1. [Visão Geral e Proposta de Valor](#1-visão-geral-e-proposta-de-valor)
2. [Público-Alvo](#2-público-alvo)
3. [Módulos e Funcionalidades](#3-módulos-e-funcionalidades)
   - 3.1 [Painel de Controle — Mission Control (Inbox)](#31-mission-control-inbox-de-alertas)
   - 3.2 [Kanban Operacional de Viagens (Dashboard)](#32-kanban-operacional-de-viagens)
   - 3.3 [Pipeline de Orçamentos (Orcamentos)](#33-pipeline-de-orçamentos)
   - 3.4 [CRM de Clientes (Clientes)](#34-crm-de-clientes)
   - 3.5 [Central de Reembolsos (Reembolsos)](#35-central-de-reembolsos)
   - 3.6 [Painel Administrativo (Configuracoes)](#36-painel-administrativo)
   - 3.7 [Quadro de Planejamento Interno (Todo Kanban)](#37-quadro-de-planejamento-interno---cockpit)
4. [Diferenciais Competitivos](#4-diferenciais-competitivos)
5. [Arquitetura Tecnológica](#5-arquitetura-tecnológica)
6. [Segurança e Conformidade](#6-segurança-e-conformidade)
7. [Integrações](#7-integrações)
8. [Modelos de Implantação](#8-modelos-de-implantação)
9. [Fluxo de Implantação para Novos Clientes](#9-fluxo-de-implantação-para-novos-clientes)
10. [FAQ Comercial](#10-faq-comercial)

---

## 1. Visão Geral e Proposta de Valor

O **PaxFlow** é uma plataforma SaaS de CRM e gestão operacional projetada especificamente para agências de viagem. Diferente de CRMs genéricos (Salesforce, HubSpot) ou ERPs pesados, o PaxFlow ataca a **dor específica do pós-venda turístico**: o acompanhamento do passageiro desde o fechamento da venda até o retorno da viagem, passando por emissão de documentos, SLAs de passaporte, reembolsos e fluxo de orçamentos.

### Por que agências de viagem precisam do PaxFlow?

| Problema | Solução PaxFlow |
|---|---|
| Perda de prazos de passaporte/visto | Alertas SLA automáticos com 180 dias de antecedência |
| Reembolsos parados sem visibilidade | Central de reembolsos com cronômetro SLA em tempo real |
| Orçamentos esquecidos no e-mail | Pipeline Kanban com lembretes agendados ("Me Lembre Depois") |
| Documentos espalhados em drives pessoais | Upload seguro para Google Drive corporativo com pastas por cliente |
| Sem visibilidade da carga de trabalho | Kanban operacional com drag-and-drop e indicadores visuais |
| Fluxo de cancelamento desorganizado | Modal de reembolso vinculado a produtos da viagem |

### Valor Entregue

- **Redução de custos operacionais**: automatiza lembretes e SLAs que hoje são controlados manualmente em planilhas
- **Aumento de receita**: orçamentos não caem no esquecimento — o pipeline garante follow-up contínuo
- **Professionalismo na entrega**: pastas organizadas no Google Drive e documentos centralizados transmitem confiança ao cliente final

---

## 2. Público-Alvo

O PaxFlow atende **agências de viagem de pequeno e médio porte** que:

- Operam com 2 a 30 consultores
- Vendem pacotes internacionais (passaporte/visto são obrigatórios)
- Trabalham com comissões e reembolsos de fornecedores
- Querem se profissionalizar sem adotar ERPs caros e complexos
- Precisam de uma ferramenta 100% em português e adequada à realidade brasileira

### Personas

1. **Diretor/Proprietário de Agência**: busca controle, redução de custos e escalabilidade
2. **Consultor de Viagens**: quer organizar seus leads, clientes e reembolsos em um só lugar
3. **Administrador/Financeiro**: precisa de visibilidade sobre reembolsos e SLAs

---

## 3. Módulos e Funcionalidades

### 3.1 Mission Control (Inbox de Alertas)

**Central de comando operacional** que consolida todos os alertas críticos da agência em uma única caixa de entrada, estilo e-mail corporativo.

- **Alertas de passaporte**: monitora automaticamente a validade dos passaportes cadastrados e dispara alertas com 180 dias de antecedência (padrão internacional) ou quando expirados
- **Alertas de SLA de reembolso**: notifica quando um reembolso ultrapassa o prazo configurado pela agência
- **Lembretes manuais ("Me Lembre Depois")**: agendados a partir do pipeline de orçamentos, com data e período (manhã/tarde/noite)
- **Filtros**: por consultor (admin), por tipo de alerta, busca textual, ativos/arquivados/todos
- **Leitor de mensagens corporativo**: modal com visual estilo e-mail profissional

### 3.2 Kanban Operacional de Viagens

**Quadro visual** para gerenciar o ciclo de vida completo de cada viagem, do fechamento ao pós-viagem.

**5 Colunas Padrão:**

| Coluna | Descrição | SLA |
|---|---|---|
| Fechado | Venda concluída, aguardando emissão | — |
| Pós-Venda | Documentação, passaportes, vistos | — |
| Pré-Embarque | Próximo ao voo | Borda laranja se < N dias |
| Pós-Viagem | Cliente já viajou | Borda vermelha se sem contato > N dias |
| Reembolso Solicitado | Cancelamento em andamento | — |

- **Drag-and-drop livre** com SortableJS entre todas as colunas
- **SLAs visuais**: bordas pulsantes vermelhas (urgente) e laranjas (atenção) conforme prazos configuráveis
- **Modal de criação de viagem**: vinculação com cliente, datas no formato DD/MM/AAAA, valor em R$
- **Modal de edição**: duas abas — Detalhes (edição geral) e Produtos/Serviços (gestão de itens da viagem)
- **Produtos**: voo, hotel, seguro, passeio, outros — com custo, venda, código de reserva e status
- **Solicitação de reembolso**: ao arrastar para "Reembolso Solicitado", abre modal para selecionar produto e valor

### 3.3 Pipeline de Orçamentos

**Kanban controlado** (sem drag-and-drop) para o fluxo de prospecção e vendas.

**4 Estágios do Pipeline:**

| Estágio | Ações Disponíveis |
|---|---|
| Solicitado | Iniciar → move para "Em Andamento" |
| Em Andamento | Enviar Proposta → abre modal com notas e upload de documentos |
| Aguardando | Alterar (volta para Solicitado), Desistir (vai para Concluído), Aceitar/Vender (vai para Concluído) |
| Concluído | Exibe sub-status: ACEITO (viagem fechada) ou DESISTÊNCIA |

- **Temperatura do lead**: Frio / Normal / Quente (badges coloridos)
- **Tags**: categorização livre (ex: "Família", "Lua de Mel", "Europa")
- **Reatribuição de consultor**: qualquer card pode ser transferido entre consultores
- **"Me Lembre Depois"**: agenda lembrete no Inbox do consultor
- **Upload de documentos**: anexa arquivos ao orçamento via Google Drive
- **Notas de negociação**: texto livre registrado a cada interação
- **Modo offline**: dados replicados no localStorage caso o Supabase esteja indisponível
- **Realtime**: alterações feitas por outros consultores aparecem automaticamente

### 3.4 CRM de Clientes

**Ficha única de passageiro** com gestão documental completa.

- **Dados pessoais**: nome, e-mail, telefone, CPF/RG, data de nascimento, endereço
- **Documentação internacional**:
  - Número do passaporte com alerta visual de validade
  - Validade monitorada por SLA (mesma engine do Inbox)
  - Informações de vistos ativos
- **Upload drag-and-drop**: arraste PDFs, JPEGs ou PNGs para enviar ao Google Drive corporativo
- **Pasta automática no Drive**: cada cliente tem uma pasta nomeada "[Nome] - [Email] - [Telefone]"
- **Busca**: por nome, e-mail ou documento
- **Seleção lateral**: lista de clientes com indicador visual de SLA do passaporte (verde/amarelo/vermelho)

### 3.5 Central de Reembolsos

**Painel dedicado** para acompanhamento de cancelamentos e reembolsos.

- **Tabela completa** com cliente, destino, produto cancelado, fornecedor, valor solicitado
- **Cronômetro SLA em tempo real**: mostra dias, horas, minutos e segundos desde a abertura
- **Alteração de status**: dropdown inline para avançar o fluxo (Aguardando Fornecedor → Em Análise → Aprovado → Pago)
- **Métricas no topo**: total de processos, aguardando fornecedor, concluídos, valor total pago
- **Filtro automático**: consultor comum vê apenas seus reembolsos; admin vê todos

### 3.6 Painel Administrativo

**Restrito a administradores**. Controle total da configuração da agência.

- **Aba Geral**:
  - Nome da agência
  - SLA de pré-embarque (dias)
  - SLA de pós-viagem (dias)
  - Prazo padrão de reembolso (dias)
  - Taxa de cancelamento padrão
  - E-mail de suporte
  - Integração Google Drive (token OAuth + sandbox)
- **Aba Consultores**:
  - Lista completa com nome, e-mail, role (admin/consultor), status
  - Edição inline de role
  - Ativar/desativar conta
  - Cadastro de novo consultor com criação de credencial no Supabase Auth
  - Modal de edição com troca de avatar e redefinição de senha

### 3.7 Quadro de Planejamento Interno — Cockpit

**Standalone Kanban** (acessível via `todo.html`) para gestão de tarefas internas da equipe.

- 4 colunas padrão: Backlog, A Fazer, Em Progresso, Concluído
- CRUD completo de cartões com título, descrição, prazo, tag, prioridade, dono
- Filtro por prioridade e busca textual
- Gerenciamento de colunas (criar, renomear, excluir)
- Persistência em Supabase com fallback para localStorage
- Migração automática de dados locais para o banco
- Realtime multi-usuário
- Exportação/importação JSON do board

---

## 4. Diferenciais Competitivos

| Característica | PaxFlow | CRM Genérico | Planilha |
|---|---|---|---|
| SLA de passaporte | Nativo, com alertas visuais | Não possui | Manual |
| Pipeline de orçamentos com lembretes | Integrado com Inbox | Requer configuração | Frágil |
| Kanban de viagens com produtos | Por cliente/viagem | Genérico | Inexistente |
| Upload Google Drive por cliente | Automático com pastas | Não integrado | Manual |
| Reembolsos com cronômetro | Tempo real | Não possui | Planilha separada |
| Modo offline | Nativo (localStorage) | Raramente | Sempre offline |
| Preço | Competitivo SaaS Brasil | USD, caro | Baixo custo, alto risco |
| Idioma | PT-BR nativo | Tradução parcial | — |

---

## 5. Arquitetura Tecnológica

### Stack

| Camada | Tecnologia | Benefício para o Cliente |
|---|---|---|
| Frontend | TypeScript + Vite | Aplicação rápida, SPA sem recarregamento |
| Estilo | Tailwind CSS 3 | Design moderno, responsivo, tema claro/escuro |
| Backend/Database | Supabase (PostgreSQL) | Escalável, seguro, sem servidor para gerenciar |
| Autenticação | Supabase Auth | Login seguro por e-mail/senha com recuperação |
| Realtime | Supabase Realtime (WebSocket) | Colaboração em tempo real entre consultores |
| Upload | Google Drive API (OAuth 2.0) | Documentos no Drive corporativo do cliente |
| Drag-and-drop | SortableJS | UX intuitiva nos Kanbans |
| Hospedagem | Qualquer CDN (Cloudflare Pages, Vercel, Netlify) | Deploy em minutos |

### Por que Supabase?

- **Substitui Firebase** com código aberto e PostgreSQL real
- **RLS (Row Level Security)**: cada consultor vê apenas seus dados
- **Realtime nativo**: alterações refletem instantaneamente em todos os usuários
- **Edge Functions**: para lógica server-side (como upload para Google Drive)
- **Custo previsível**: plano gratuito generoso; plano pago apenas quando escalar

---

## 6. Segurança e Conformidade

- **Autenticação**: Supabase Auth com hash bcrypt, sessões JWT, recuperação de senha
- **Autorização**: controle por role (admin/consultor) em toda a aplicação
- **RLS (Row Level Security)**: políticas no PostgreSQL garantem que consultores acessem apenas registros permitidos
- **Dados em trânsito**: todas as comunicações via HTTPS
- **Google Drive**: integração OAuth 2.0 com refresh token — a agência mantém controle total dos documentos
- **Modo offline**: dados sensíveis nunca saem do navegador sem criptografia; o fallback localStorage é temporário
- **Senhas**: mínimo 6 caracteres, armazenadas com hash no Supabase Auth

---

## 7. Integrações

### Disponíveis

| Integração | Tipo | Descrição |
|---|---|---|
| Google Drive | Bidirecional | Upload de documentos, criação automática de pastas por cliente |
| Supabase Auth | Autenticação | Login, recuperação de senha, gerenciamento de usuários |
| Supabase Realtime | WebSocket | Sincronização ao vivo entre consultores |

### Roteiro (futuro)

- **Google Calendar**: agendamento de lembretes e follow-ups
- **WhatsApp Business API**: notificações automáticas de SLA para clientes
- **E-mail transacional (Supabase/Resend)**: confirmações e alertas por e-mail
- **Pagamentos**: integração com sistemas de pagamento para reembolsos
- **API REST**: expor dados do PaxFlow para integrações externas

---

## 8. Modelos de Implantação

### 8.1 PaxFlow Cloud (SaaS — Recomendado)

- Hospedagem gerenciada pela equipe PaxFlow
- Infraestrutura em Cloudflare Pages + Supabase
- Atualizações automáticas
- Suporte técnico incluso
- SLA de disponibilidade 99,9%

### 8.2 Self-Hosted

- O cliente implanta em sua própria infraestrutura
- Código-fonte fornecido para implantação
- Banco de dados Supabase próprio do cliente
- Personalizações permitidas
- Ideal para agências com políticas de dados restritivas

### 8.3 Híbrido

- Frontend hospedado pelo PaxFlow
- Banco de dados Supabase do cliente (isolamento total de dados)
- Melhor custo-benefício para médias agências

### Requisitos Mínimos

- Navegador moderno (Chrome, Firefox, Edge, Safari — 2 últimas versões)
- Conexão com internet
- Conta no Supabase (plano gratuito é suficiente para até 50 consultores)
- (Opcional) Conta Google Workspace para integração com Drive

---

## 9. Fluxo de Implantação para Novos Clientes

### Fase 1: Descoberta (1 dia)

1. Reunião de levantamento de requisitos
2. Mapeamento de processos atuais (planilhas, ferramentas usadas)
3. Definição de SLAs e parâmetros da agência
4. Identificação de integrações necessárias

### Fase 2: Setup (2-3 dias)

1. Criação do projeto Supabase (ou uso da infra PaxFlow)
2. Execução do script de migração do banco de dados
3. Configuração de autenticação e criação dos consultores
4. Configuração da integração Google Drive (se aplicável)
5. Deploy do frontend (Cloudflare Pages ou similar)

### Fase 3: Migração de Dados (2-5 dias)

1. Importação de clientes ativos (planilha → Supabase)
2. Importação de viagens em andamento
3. Importação de orçamentos abertos
4. Importação de reembolsos pendentes

### Fase 4: Treinamento (1-2 dias)

1. Treinamento com administradores (configurações, relatórios)
2. Treinamento com consultores (uso diário)
3. Criação de manual de uso interno

### Fase 5: Go-Live (1 dia)

1. Corte do sistema legado
2. Início oficial da operação no PaxFlow
3. Suporte intensivo na primeira semana

### Fase 6: Acompanhamento (30 dias)

1. Reunião semanal de feedback
2. Ajustes finos de processo
3. Relatório de adoção

---

## 10. FAQ Comercial

### Quanto custa o PaxFlow?

_Estrutura de precificação a ser definida conforme modelo de negócio (assinatura mensal por consultor, plano fixo por agência, etc.). Entre em contato para consultar._

### Preciso ter conhecimento técnico para usar?

Não. O PaxFlow foi projetado para ser usado por consultores de viagem sem qualquer conhecimento técnico. O administrador da agência precisa apenas de acesso à internet e um navegador.

### O PaxFlow funciona offline?

O sistema foi projetado para uso online com Supabase. No entanto, os módulos de Orçamentos e Todo Kanban possuem fallback para localStorage, permitindo operação limitada quando a rede falha.

### Os dados dos meus clientes estão seguros?

Sim. A autenticação é feita por Supabase Auth (bcrypt + JWT). As permissões são controladas por Row Level Security diretamente no PostgreSQL. Documentos são armazenados no Google Drive da própria agência, não em servidores de terceiros.

### Posso personalizar o PaxFlow?

Na versão Self-Hosted, sim. O código-fonte em TypeScript permite personalizações. Na versão Cloud, personalizações podem ser contratadas como serviço.

### Como é feito o suporte?

Suporte por e-mail e WhatsApp durante o horário comercial. Planos premium incluem suporte 24h e SLA de resposta de 2 horas.

### Quantos consultores podem usar simultaneamente?

Não há limite definido. O Supabase Realtime permite dezenas de consultores operando simultaneamente com sincronização instantânea.

### O PaxFlow emite notas fiscais ou gerencia finanças?

Não. O PaxFlow é focado em CRM operacional e pós-venda. Recomendamos integração com sistemas financeiros especializados (Conta Azul, Omie, etc.) via API futura.

---

> **PaxFlow** — Gestão de Pós-Venda e Fluxo de Passageiros
>
> _Thiago Costa — 2026_
>
> Para propostas comerciais, demonstrações ou dúvidas técnicas, entre em contato.
