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
   - 3.4 [Gestão e Ficha de Clientes (Clientes)](#34-gestão-e-ficha-de-clientes)
   - 3.5 [Central de Reembolsos (Reembolsos)](#35-central-de-reembolsos)
   - 3.6 [Painel Administrativo (Configuracoes)](#36-painel-administrativo)
   - 3.7 [Quadro de Planejamento Interno (Todo Kanban)](#37-quadro-de-planejamento-interno---cockpit)
   - 3.8 [Navegação e UI Shell Premium (Global UI)](#38-navegação-e-ui-shell-premium)
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

- **Alertas de passaporte**: monitora automaticamente a validade dos passaportes cadastrados e dispara alertas com 180 dias de antecedência (padrão internacional) ou quando expirados (mapeados no calendário na data de expiração).
- **Alertas de SLA de reembolso**: notifica quando um reembolso ultrapassa o prazo configurado pela agência (mapeados no calendário na data exata em que o SLA estourou: Data de Criação + Prazo de SLA).
- **Lembretes manuais ("Me Lembre Depois")**: agendados a partir do pipeline de orçamentos, com data e período (manhã/tarde/noite) (mapeados no calendário na data agendada).
- **Busca e Filtros Omnipresentes**:
  - Filtro por consultor (admin), por tipo de alerta, ativos/arquivados/todos.
  - **Pesquisa em tempo real de alta precisão (client-side)**: O filtro textual da caixa de entrada foi ampliado para cobrir perfeitamente todos os campos e datas, incluindo a data alvo do evento (`eventDate`), data amigável formatada (`dateStr`), período do lembrete (`periodText`) e o nome amigável do consultor responsável na visualização administrativa.
- **Leitor de mensagens corporativo**: modal com visual estilo e-mail profissional, integrado com deep-linking interativo e arquivamento em tempo real.
- **Visualização em Calendário Interativo [NEW]**:
  - **Alternador de Visualização (Toggle Switch)**: Um seletor de alta fidelidade visual (Lista / Calendário) no topo do painel. Todos os filtros da barra lateral (Ativos/Arquivados/Todos e consultores) e busca continuam 100% integrados e reativos no modo calendário.
  - **Três Visões Operacionais**:
    - **MÊS**: Grade proporcional de 35 a 42 dias com eventos exibidos como pílulas horizontais arredondadas (estilo Google Agenda).
    - **SEMANA**: Grade horizontal moderna de 7 colunas (Domingo a Sábado), empilhando cards de atividades de forma vertical com demarcação do período (Manhã, Tarde, Noite).
    - **AGENDA**: Linha do tempo (Timeline) vertical corrida e minimalista, agrupada exclusivamente por datas com eventos pendentes, exibindo avatares de remetente e atalhos rápidos.
  - **Sumarização Dinâmica via Regex**: O calendário resume automaticamente os títulos longos e genéricos das notificações (ex: extrai o nome do passageiro e destino de forma compacta, como *"João Silva - Orlando"* em vez de *"Lembrete cadastrado - Orçamento"*).
  - **Saliência Estética e Alinhamento**: As colunas e células possuem travamento rígido proporcional de largura (`minmax(0, 1fr)` e `min-width: 0`) para evitar qualquer distorção visual. Inclui hover tridimensional (`translateY`) e anel brilhante animado no dia atual ("Hoje").
  - **Legenda de Cores Tooltip**: Um círculo flutuante **"?"** no topo direito do cabeçalho que exibe instantaneamente, via hover com popover puramente em CSS Tailwind, a legenda de cores e mapeamento de tipos de eventos (Lembretes = Índigo, Passaportes = Âmbar, Reembolsos = Rose).
  - **Ação com Reuso de Modal**: Clicar em qualquer evento do calendário abre instantaneamente o leitor corporativo de e-mail existente, mantendo links funcionais e re-renderizando a tela sob arquivamento.

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

- **Drag-and-drop livre** com SortableJS entre todas as colunas.
- **SLAs visuais**: bordas pulsantes vermelhas (urgente) e laranjas (atenção) conforme prazos configuráveis.
- **Busca em Tempo Real no Cabeçalho**: Um campo de pesquisa instantânea (client-side) que filtra o Kanban dinamicamente à medida que o usuário digita, cobrindo o Destino, Código Localizador (LOC), nome, e-mail, telefone ou documento do passageiro, observações operacionais e atribuição do consultor ("Você" ou "Outro Consultor").
- **Modal de criação de viagem**: vinculação com cliente, datas no formato DD/MM/AAAA, valor em R$.
- **Modal de Edição & Gerenciamento Avançado**:
  - Reestruturado em abas com layout ampliado de `max-w-2xl` para maior legibilidade.
  - **Dono e SLA no Topo**: A aba "Detalhes e Edição" possui agora um cabeçalho proeminente contendo a identificação do Consultor Responsável com seu avatar correspondente e um indicador pulsante de Alerta de SLA ativo (se aplicável), fornecendo visibilidade direta da urgência do card.
  - **Aba Dinâmica '💸 Histórico de Reembolsos'**: Fica visível apenas para cartões de viagem que possuam reembolsos associados no banco de dados. Exibe de forma organizada a listagem detalhada de cada solicitação vinculada: Produto afetado, Valor Solicitado, Valor Aprovado, Taxa de Retenção, Data de Solicitação e data de encerramento, Justificativa do Cancelamento e o Status do Reembolso com badges HSL temáticos.
- **Produtos e Detalhamento de Valores (Novo Nível de Cadastro)**:
  - Permite gerenciar itens de viagem (voo, hotel, seguro, passeio, outro) preenchendo fornecedor, descrição, data do serviço, valor de venda, status e o **Código de Reserva (LOC)**.
  - **Código de Reserva (LOC) Obrigatório**: O campo LOC do produto é obrigatório (máximo 20 caracteres, código único sem espaços, barras ou delimitadores textuais).
  - **Detalhamento de Valores**: Após salvar o produto na viagem, ao clicar no item listado na aba "Produtos e Serviços", abre-se um modal de detalhamento que permite fracionar o valor de venda nas categorias: **Tarifa (Valor Líquido)**, **Taxa** e **Comissão**.
  - **Validação de Alinhamento**: O sistema bloqueia a gravação caso a soma `Tarifa + Taxa + Comissão` divirja centavo por centavo do `Valor de Venda` do produto, orientando o usuário em tempo real sobre o saldo restante a preencher.
- **Trava de Segurança na Transição de Status**:
  - Ao arrastar ou alterar o status de uma viagem no Kanban para qualquer status posterior a "Fechado" (Pós-Venda, Pré-Embarque, Pós-Viagem ou Reembolso Solicitado), o PaxFlow realiza duas validações em tempo de execução:
    1. O valor total da viagem deve ser completamente coberto pelos produtos cadastrados (o saldo financeiro deve ser zero).
    2. Todos os produtos adicionados a essa viagem precisam estar 100% detalhados (soma de Tarifa + Taxa + Comissão igual ao Valor de Venda de cada produto).
    Qualquer desalinhamento impede a transição e exibe uma notificação pop-up informativa.
- **Solicitação de reembolso**: ao arrastar para "Reembolso Solicitado", abre formulário automatizado que autocompleta valores com base no produto de viagem selecionado.

### 3.3 Pipeline de Orçamentos

**Kanban controlado** (sem drag-and-drop) para o fluxo de prospecção e vendas.

**4 Estágios do Pipeline:**

| Estágio | Ações Disponíveis |
|---|---|
| Solicitado | Iniciar → move para "Em Andamento" |
| Em Andamento | Enviar Proposta → abre modal com notas e upload de documentos |
| Aguardando | Alterar (volta para Solicitado), Desistir (vai para Concluído), Aceitar/Vender (vai para Concluído) |
| Concluído | Exibe sub-status: ACEITO (viagem fechada) ou DESISTÊNCIA |

- **Busca em Tempo Real no Cabeçalho**: Pesquisa em tempo real (client-side) filtrando instantaneamente por nome do cliente, destino, contatos, temperatura, notas, tags e nome do consultor.
- **Busca Autocomplete de Clientes Recorrentes**: O mecanismo de busca de clientes existentes ao cadastrar orçamentos foi aprimorado. A digitação no campo de nome, e-mail ou telefone filtra precisamente os clientes cadastrados contra as respectivas propriedades (incluindo tratamento de caracteres não-numéricos no telefone), eliminando retornos distorcidos e ligando o orçamento de forma segura ao cliente correto.
- **Fechamento de Venda (Close Sale)**: Ao concluir e aceitar um orçamento, se o cliente associado não possuir dados de documento em sua ficha cadastral, o sistema exibe um modal que obriga o preenchimento do CPF/CNPJ. Esse campo possui máscara e validação matemática de integridade ativa, prevenindo a persistência de identificações incorretas.
- **Modal de Detalhes Reformulado (`openVerNotasModal`)**:
  - Reestruturado para adotar um **layout de grid premium de duas colunas (visualizador amplo `max-w-2xl`)**:
    - **Coluna Esquerda (2/3 da largura)**: Exibe a listagem completa das Notas da Negociação e a seção dedicada a Documentos e Propostas Anexas.
    - **Coluna Direita/Sidebar (1/3 da largura)**: Uma barra lateral corporativa com status, temperatura do lead, consultor com avatar, links clicáveis de contato (WhatsApp/Email), tags e cronômetro de SLA decorrido.
- **Visualização de Propostas e Anexos Inline [NEW]**:
  - Propostas comerciais e documentos em PDF anexados às notas de negociação no painel esquerdo podem ser abertos de forma imediata no visualizador inline.
  - Em Modo Sandbox, exibe uma ficha comercial simulada contendo o nome do passageiro, destino, valor do pacote formatado em reais e serviços inclusos (voo, hotel, passeios) correspondentes àquele orçamento.
- **Temperatura do lead**: Frio / Normal / Quente.
- **Tags**: categorização livre (ex: "Família", "Lua de Mel", "Europa").
- **"Me Lembre Depois"**: agenda lembretes operacionais com período (manhã/tarde/noite).
- **Realtime & Offline**: alterações sincronizadas via WebSocket Supabase com fallback local no localStorage.

### 3.4 Gestão e Ficha de Clientes

**Ficha única de passageiro** com gestão documental completa.

- **Dados pessoais**:
  - Nome completo, e-mail, telefone, data de nascimento e endereço.
  - **Máscara e Validação de CPF/CNPJ**: O campo de documento possui máscara em tempo real integrada (`000.000.000-00` ou `00.000.000/0000-00` dependendo do tamanho). Realiza a validação lógica dos dígitos verificadores (checksum). Em caso de documento matematicamente inválido, o sistema impede a submissão do formulário e exibe mensagem de erro intuitiva.
- **Documentação internacional**:
  - Número do passaporte com alerta visual de validade.
  - Validade monitorada por SLA (mesma engine do Inbox).
  - Informações de vistos ativos.
- **Visualizador de Documentos Inline PaxFlow [NEW]**:
  - **Experiência Incorporada (Lightbox)**: Um modal elegante com design glassmorphic (`backdrop-blur-md bg-slate-950/60`) que permite abrir PDFs e imagens do passaporte de forma 100% interna e integrada.
  - **Exportação Inteligente**: Arquivos nativos do Google Docs e Sheets são convertidos automaticamente para PDF na API e carregados diretamente no `<iframe>` sem redirecionar para a interface web corporativa do Google.
  - **Simulador Interativo de Passaporte em Sandbox**: Caso a agência opere no modo de simulador local offline (sem chaves ativas do Google Drive), o PaxFlow gera de forma inteiramente dinâmica um documento visual de passaporte personalizado com o avatar do cliente, nome completo real, CPF, número do passaporte, data de validade e alertas pulsantes de SLA reais do passageiro selecionado.
  - **Gestão de Downloads e Memória**: A barra superior inclui ações rápidas para baixar o PDF localmente, abrir a URL do arquivo bruto original no Drive e desalocar recursos e URLs temporárias da memória (`revokeObjectURL`) ao fechar o popover.
- **Upload drag-and-drop**: arraste PDFs, JPEGs ou PNGs para enviar ao Google Drive corporativo.
- **Pasta automática no Drive**: cada cliente tem uma pasta nomeada "[Nome] - [Email] - [Telefone]".
- **Busca em Tempo Real Ampliada**:
  - O mecanismo de busca da barra lateral foi estendido para uma busca completa de alta precisão (client-side). O usuário pode filtrar instantaneamente a lista de clientes por qualquer dado cadastrado, incluindo **telefone, e-mail, documento, endereço residencial, visto ativo, passaporte e observações gerais**.
- **Seleção lateral**: lista de clientes com indicador visual de SLA do passaporte (verde/amarelo/vermelho).

### 3.5 Central de Reembolsos

**Painel dedicado** para acompanhamento de cancelamentos e reembolsos.

- **Tabela completa** com cliente, destino, produto cancelado, fornecedor, valor solicitado.
- **Busca em Tempo Real Dedicada**:
  - Adicionado campo de busca instantânea acima da tabela de reembolsos.
  - Filtro local em memória de alto desempenho (<1ms) cobrindo **nome e e-mail do cliente, destino, localizador da viagem, tipo de produto, fornecedor, descrição do item cancelado, justificativa da solicitação, status e valores monetários formatados**.
- **Cronômetro SLA em tempo real**: mostra dias, horas, minutos e segundos decorridos desde a abertura da solicitação.
- **Alteração de status**: dropdown inline para avançar o fluxo (Aguardando Fornecedor → Em Análise → Aprovado → Pago).
- **Métricas no topo**: total de processos, aguardando fornecedor, concluídos, valor total pago.
- **Filtro automático**: consultor comum vê apenas seus reembolsos; admin vê todos.

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
- **Aba Importações [NEW]**:
  - **Dropzone dashed interativa**: Área visual premium para carregar e arrastar arquivos de chamados/oportunidades (CSV).
  - **Mecanismo de Parse Autocontido**: Parser desenvolvido em TypeScript puro com detecção automática do delimitador de colunas (vírgula `,` ou ponto-e-vírgula `;`) e tratamento avançado de aspas e quebras de linha nas células.
  - **Mapeador Dinâmico De-Para**: Permite correlacionar visualmente colunas do CSV com as propriedades de Orçamento (Nome, Contato, Notas, Tags, Data da Viagem, Valor da Proposta, Atendente).
  - **Processadores de Formato Resilientes**: Converte automaticamente dados financeiros brasileiros (ex: `R$ 1.500,00` em float `1500.00`) e datas brasileiras (ex: `31/12/2026` para `2026-12-31`).
  - **Fuzzy Consultant Matching**: O PaxFlow analisa os nomes de atendentes únicos identificados no CSV e realiza um pré-mapeamento automático por aproximação nominal aos consultores ativos da plataforma (`profiles` table), fornecendo seletores individuais e definição de consultor fallback para registros em branco ou desconhecidos.
  - **Preview em Tempo Real**: Carrossel contendo 3 cards de preview formatados idênticos ao Kanban, permitindo inspecionar e validar os dados antes do salvamento definitivo.
  - **Salva em Lote (Batch Insert)**: Envio otimizado para o Supabase `orcamentos` com feedback em barra de progresso visual.

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

### 3.8 Navegação e UI Shell Premium

**Experiência visual e navegação avançada** em toda a interface do sistema.

- **Barra Lateral (Sidebar) Colapsável**:
  - Permite ocultar rótulos textuais e encolher a barra lateral para uma coluna estreita de ícones (`md:w-20`), ampliando significativamente a área de trabalho útil para visualização das colunas Kanban e tabelas de dados.
  - **Persistência de Estado**: O estado colapsado é salvo automaticamente em `localStorage` (`"paxflow-sidebar-collapsed"`), garantindo que a preferência do consultor seja mantida em futuros acessos.
  - **Responsividade Adaptativa**: Transições CSS animadas ocultam elementos textuais e centralizam ícones e fotos de perfil de forma totalmente orgânica.
- **Campos de Busca com Lupa Vetorial**:
  - Depreciação do antigo emoji de lupa `🔍`, substituído por um ícone vetorial minimalista em formato SVG.
  - O ícone está posicionado de forma absoluta e perfeitamente centrado verticalmente no campo (`absolute inset-y-0 left-0 flex items-center`), garantindo harmonia estética profissional de nível corporativo em todas as listagens (Dashboard, Orçamentos, Clientes e Reembolsos).
- **Responsividade Coesa do Cabeçalho**:
  - Ajustes avançados de alinhamento em telas médias e compactas para evitar quebra desalinhada de caixas de busca e botões primários.

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
| Google Drive | Bidirecional | Upload de documentos, criação automática de pastas por cliente. Integração flexível com suporte a **Modo Real** (OAuth2 com refresh token) ou **Modo Sandbox** (simulador local resiliente). |
| Supabase Auth | Autenticação | Login, recuperação de senha, gerenciamento de consultores. |
| Supabase Realtime | WebSocket | Sincronização ao vivo de orçamentos, viagens e Cockpit Kanban. |

### Configuração Facilitada (Google OAuth Utility)

O PaxFlow fornece um script utilitário automatizado (`src/services/obterTokenGoogle.js`) que inicia um servidor local de escuta na porta 3000 para interceptar a autenticação de login do Google Drive corporativo da agência e fornecer o `refresh_token` definitivo. Para detalhes completos de configuração no Google Cloud Console e obtenção de chaves, consulte o guia passo a passo em [google_drive_setup.md](google_drive_setup.md).

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
2. Execução do script de modelagem do banco de dados (utilizando as DDLs e políticas RLS fornecidas no arquivo [schema.sql](schema.sql)), seguido pela migração [add_product_detail_fields.sql](add_product_detail_fields.sql) para suporte ao detalhamento financeiro de produtos de viagem.
3. Configuração de autenticação e criação dos consultores no Supabase Auth
4. Configuração da integração com Google Drive (conforme o guia prático [google_drive_setup.md](google_drive_setup.md))
5. Deploy do frontend (Cloudflare Pages ou similar)
6. *(Opcional)* Limpeza resiliente de dados transacionais e de teste em lote utilizando o script [clean_db.sql](clean_db.sql) para inicialização limpa da produção.

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
