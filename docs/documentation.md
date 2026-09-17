# PaxFlow — Documentação Comercial e Técnica

> **Sistema de Gestão de Pós-Venda e Fluxo de Passageiros para Agências de Viagem**
>
> _Versão 1.0.0 — © 2026 Thiago Costa_

---

## Sumário

1. [Visão Geral e Proposta de Valor](#1-visão-geral-e-proposta-de-valor)
2. [Público-Alvo](#2-público-alvo)
3. [Módulos e Funcionalidades](#3-módulos-e-funcionalidades)
   - 3.1 [Inbox](#31-inbox)
   - 3.2 [Viagens](#32-viagens)
   - 3.3 [Orçamentos](#33-orçamentos)
   - 3.4 [Clientes](#34-clientes)
   - 3.5 [Reembolsos](#35-reembolsos)
   - 3.6 [Configurações](#36-configurações)
   - 3.7 [Quadro de Planejamento Interno (Todo Kanban)](#37-quadro-de-planejamento-interno-todo-kanban)
   - 3.8 [Navegação e UI Shell Premium](#38-navegação-e-ui-shell-premium)
   - 3.9 [Sistema de Gamificação e Perfis](#39-sistema-de-gamificação-e-perfis)
   - 3.10 [Módulo de Cadastros](#310-módulo-de-cadastros)
   - 3.11 [Localização de Erros e Tradutor Global (I18n)](#311-localização-de-erros-e-tradutor-global-i18n)
   - 3.12 [Dashboard de Resultados (Analytics) e Relatórios Gerenciais](#312-dashboard-de-resultados-analytics-e-relatórios-gerenciais)
   - 3.13 [Sistema de Comentários, Notas, Menções e Agendamento Automático](#313-sistema-de-comentários-notas-menções-e-agendamento-automático)
   - 3.14 [Exclusão Administrativa e Políticas de Delegação (RBAC)](#314-exclusão-administrativa-e-políticas-de-delegação-rbac)
   - 3.15 [Itinerário Digital Interativo Público](#315-itinerário-digital-interativo-público)
   - 3.16 [Pesquisa NPS Pós-Viagem Pública](#316-pesquisa-nps-pós-viagem-pública)
   - 3.17 [Hub de Modelos de Mensagens (WhatsApp)](#317-hub-de-modelos-de-mensagens-whatsapp)
   - 3.18 [Campanhas de Vendas & Leaderboard](#318-campanhas-de-vendas--leaderboard)
   - 3.19 [Códigos de Referência Internos Sequenciais (ORC, VIA, RBS, CLI)](#319-códigos-de-referência-internos-sequenciais-orc-via-rbs-cli)
   - 3.20 [Validação Automatizada de Viagens e Conferência de Processos](#320-validação-automatizada-de-viagens-e-conferência-de-processos)
   - 3.21 [Configurações de Identidade Visual (White-Label Branding)](#321-configurações-de-identidade-visual-white-label-branding)
   - 3.22 [Alertas Automatizados de Pré-Embarque e Pós-Viagem NPS](#322-alertas-automatizados-de-pré-embarque-e-pós-viagem-nps)
   - 3.23 [Métricas Avançadas de Performance e Rendimento de Equipe](#323-métricas-avançadas-de-performance-e-rendimento-de-equipe)
   - 3.24 [Central Administrativa de Escala de Funcionários](#324-central-administrativa-de-escala-de-funcionários)
   - 3.25 [Redesenho de Usabilidade Mobile da Gestão de Viagens](#325-redesenho-de-usabilidade-mobile-da-gestão-de-viagens)
   - 3.26 [PaxFlow Risk Score™ (Diagnóstico Preditivo de Saúde Operacional 0 a 100)](#326-paxflow-risk-score-diagnóstico-preditivo-de-saúde-operacional-0-a-100)
   - 3.27 [Relatório de Embarque e Rastreamento de Contato Pré-Embarque](#327-relatório-de-embarque-e-rastreamento-de-contato-pré-embarque)
   - 3.28 [Next Trip Engine™ (Motor Preditivo de Recompra & Ciclo de Vida do Viajante)](#328-next-trip-engine-motor-preditivo-de-recompra--ciclo-de-vida-do-viajante)
   - 3.29 [PaxFlow Upsell Engine™ (Motor Preditivo de Oportunidades & Ticket Médio)](#329-paxflow-upsell-engine-motor-preditivo-de-oportunidades--ticket-médio)
   - 3.30 [PaxFlow Studio™ (Criação de Propostas Digitais de Luxo & Cadernos de Viagem)](#330-paxflow-studio-criação-de-propostas-digitais-de-luxo--cadernos-de-viagem)
   - 3.31 [Gestão Inteligente de Anexos e Documentos (Clientes e Viagens)](#331-gestão-inteligente-de-anexos-e-documentos-clientes-e-viagens)
   - 3.32 [Melhorias de Usabilidade, Produtividade e Feedback Visual de UX (Plano 1)](#332-melhorias-de-usabilidade-produtividade-e-feedback-visual-de-ux-plano-1)
   - 3.33 [Melhorias de Eficiência Operacional, Pipeline e Ações Rápidas de UX (Plano 2)](#333-melhorias-de-eficiência-operacional-pipeline-e-ações-rápidas-de-ux-plano-2)
   - 3.34 [Experiência Premium, Inteligência Relacional e Microinterações de UX (Plano 3)](#334-experiência-premium-inteligência-relacional-e-microinterações-de-ux-plano-3)
   - 3.35 [Atalho Rápido e Modal de Cadastro do Cliente na Venda](#335-atalho-rápido-e-modal-de-cadastro-do-cliente-na-venda)
   - 3.36 [PaxFlow FinRecon™ (Módulo de Conciliação Bancária & Fechamento Contábil)](#336-paxflow-finrecon-módulo-de-conciliação-bancária--fechamento-contábil)
   - 3.37 [Design System de Tabelas, Proporções e Padronização Visual PaxFlow](#337-design-system-de-tabelas-proporções-e-padronização-visual-paxflow)
   - 3.38 [Painel de Filtros Avançados Combináveis, Resumo Financeiro & Exportação CSV de Viagens](#338-painel-de-filtros-avançados-combináveis-resumo-financeiro--exportação-csv-de-viagens)
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
| --- | --- |
| Perda de prazos de passaporte/visto | Alertas SLA automáticos com 180 dias de antecedência |
| Reembolsos parados sem visibilidade | Central de reembolsos com cronômetro SLA em tempo real |
| Orçamentos esquecidos no e-mail | Pipeline Kanban com lembretes agendados ("Me Lembre Depois") |
| Documentos espalhados em drives pessoais | Upload seguro para o Supabase Storage com pastas por cliente |
| Sem visibilidade da carga de trabalho | Kanban operacional com drag-and-drop e indicadores visuais |
| Fluxo de cancelamento desorganizado | Modal de reembolso vinculado a produtos da viagem |

### Valor Entregue

- **Redução de custos operacionais**: automatiza lembretes e SLAs que hoje são controlados manualmente em planilhas
- **Aumento de receita**: orçamentos não caem no esquecimento — o pipeline garante follow-up contínuo
- **Professionalismo na entrega**: pastas organizadas no Supabase Storage e documentos centralizados transmitem confiança ao cliente final

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

### 3.1 Inbox

**Central de comando operacional** que consolida todos os alertas críticos da agência em uma única caixa de entrada, estilo e-mail corporativo.

- **Alertas de passaporte**: monitora automaticamente a validade dos passaportes cadastrados e dispara alertas com 180 dias de antecedência (padrão internacional) ou quando expirados (mapeados no calendário na data de expiração).
- **Alertas de SLA de reembolso**: notifica quando um reembolso ultrapassa o prazo configurado pela agência (mapeados no calendário na data exata em que o SLA estourou: Data de Criação + Prazo de SLA).
- **Lembretes manuais ("Me Lembre Depois")**: agendados a partir do pipeline de orçamentos, com data e período (manhã/tarde/noite) (mapeados no calendário na data agendada).
- **Busca e Filtros Omnipresentes**:
  - Filtro por consultor (admin), por tipo de alerta, ativos/arquivados/todos.
  - **Filtro Rápido "Apenas Não Lidas" [NEW]**: Botão toggle contextual na barra superior de ferramentas do Inbox, permitindo focar instantaneamente nas pendências de leitura com badge numérico em tempo real.
  - **Contador Dinâmico de Exibição**: Indicador limpo no formato `Mostrando xx de yy`, sincronizado com todos os filtros textuais e de categoria.
  - **Pesquisa em tempo real de alta precisão (client-side)**: O filtro textual da caixa de entrada cobre perfeitamente todos os campos e datas, incluindo a data alvo do evento (`eventDate`), data amigável formatada (`dateStr`), período do lembrete (`periodText`) e o nome amigável do consultor responsável na visualização administrativa.
- **Leitor de mensagens corporativo & Persistência Universal**:
  - Modal com visual estilo e-mail profissional, integrado com deep-linking interativo e arquivamento em tempo real.
  - **Persistência de Leitura no Supabase [NEW]**: Qualquer mensagem aberta (mensagens diretas, solicitações de escala, atendimentos presenciais de balcão e alertas operacionais) tem seu status de leitura gravado diretamente no banco de dados na tabela `public.notificacoes`, mantendo o status sincronizado em qualquer dispositivo.
- **Sistema de Mensagens Diretas Internas (P2P)**:
  - Permite o envio de mensagens diretas no estilo e-mail (com destinatários "Para" e "Cc" múltiplos) entre consultores da agência.
  - **Autocomplete de Contatos**: Interface de seleção de destinatários utilizando tags/badges interativos com remoção instantânea.
  - **Pasta de Enviadas**: Uma gaveta dedicada para acompanhamento de todas as correspondências autoradas pelo consultor logado.
  - **Ação de Resposta (Reply) e Threading [NEW]**: Botão de resposta direta integrado ao leitor de e-mail. O PaxFlow agrupa automaticamente as mensagens diretas e suas respostas sob chaves relacionais (`parent_id` e `thread_id`) no banco de dados. Ao abrir qualquer e-mail/notificação que possua thread associada, o leitor exibe a linha do tempo completa do diálogo de forma cronológica em cartões individuais, facilitando o acompanhamento pela equipe e mantendo o contexto.
  - **Resiliência Relacional & Zero-Break no Envio de Mensagens [NEW]**: O serviço de envio (`InboxService.sendDirectMessage`) conta com validação preventiva de chaves estrangeiras na tabela `mensagens_diretas`. Ao responder a alertas gerais (solicitações de escala, menções ou lembretes) que não são mensagens diretas na origem, o sistema sanitiza o `parent_id` e possui fallback resiliente nativo para erros de Foreign Key (`23503`) e Schema Drift (`42703`), garantindo que o envio nunca quebre a experiência do usuário.
  - **Status e Contadores Reativos da Sidebar [NEW]**: O badge do menu lateral (`nav-inbox-badge`) reflete fielmente o volume de pendências ativas não lidas da Caixa de Entrada (`unreadAtivos`), desconsiderando decisões já finalizadas.
- **Visualização em Calendário Interativo [NEW]**:
  - **Navegação de Topo Unificada [NEW]**: A alternância entre **Lista de Mensagens** e **Calendário** é integrada diretamente nas abas de topo do módulo (`[ 📨 Lista de Mensagens ]`, `[ 📅 Calendário ]` e `[ 👥 Escala de Funcionários ]`), eliminando controles dispersos pelo meio da tela e garantindo navegação com rolagem horizontal suave no mobile. Todos os filtros da barra lateral (Ativos/Arquivados/Todos e consultores), categorização e pesquisa continuam 100% integrados e reativos no modo calendário.
  - **Diferenciação por Cores (Sinalizadores de Atribuição)**:
    - _Verde / Ícone de Check_: Lembretes próprios normais.
    - _Âmbar / Laranja_: Lembretes delegados a você por outros consultores do time.
    - _Azul / Slate_: Lembretes criados por você e atribuídos (delegados) a terceiros.
  - **Rastreamento de Conclusão (Line-Through & Opacidade)**: Se um lembrete delegado por você for arquivado (concluído) pelo destinatário no Inbox dele, o evento aparecerá em seu calendário com estilo riscado (`line-through`) e opacidade reduzida a 50%, fornecendo controle gerencial instantâneo.
  - **Agendamento via Nova Mensagem**: Checkbox integrado na criação de mensagens diretas que permite cadastrar lembretes/tarefas na agenda dos destinatários, com seleção de data, período (manhã/tarde/noite) e vínculo opcional a orçamentos ativos ou viagens em andamento.
  - **Três Visões Operacionais**:
    - **MÊS**: Grade proporcional de 35 a 42 dias com eventos exibidos como pílulas horizontais arredondadas (estilo Google Agenda).
    - **SEMANA**: Grade horizontal moderna de 7 colunas (Domingo a Sábado), empilhando cards de atividades de forma vertical com demarcação do período (Manhã, Tarde, Noite).
    - **AGENDA**: Linha do tempo (Timeline) vertical corrida e minimalista, agrupada exclusivamente por datas com eventos pendentes, exibindo avatares de remetente e atalhos rápidos.
  - **Sumarização Dinâmica via Regex**: O calendário resume automaticamente os títulos longos e genéricos das notificações (ex: extrai o nome do passageiro e destino de forma compacta, como _"João Silva - Orlando"_ em vez de _"Lembrete cadastrado - Orçamento"_).
  - **Saliência Estética e Alinhamento**: As colunas e células possuem travamento rígido proporcional de largura (`minmax(0, 1fr)` e `min-width: 0`) para evitar qualquer distorção visual. Inclui hover tridimensional (`translateY`) e anel brilhante animado no dia atual ("Hoje").
  - **Legenda de Cores Tooltip**: Um círculo flutuante **"?"** no topo direito do cabeçalho que exibe instantaneamente, via hover com popover puramente em CSS Tailwind, a legenda de cores e mapeamento de tipos de eventos (Lembretes = Índigo, Passaportes = Âmbar, Reembolsos = Rose).
  - **Ação com Reuso de Modal**: Clicar em qualquer evento do calendário abre instantaneamente o leitor corporativo de e-mail existente, mantendo links funcionais e re-renderizando a tela sob arquivamento.

### 3.2 Viagens

**Visualização em lista unificada** de alto desempenho para gerenciar o ciclo de vida operacional de cada viagem, do fechamento ao pós-viagem.

**5 Fases de Venda / Status:**

| Fase | Descrição | SLA |
| --- | --- | --- |
| Fechado | Venda concluída, aguardando emissão | — |
| Pós-Venda | Documentação, passaportes, vistos | — |
| Pré-Embarque | Próximo ao embarque | Indicador de atenção ⚠️ se < N dias |
| Pós-Viagem | Cliente já viajou | Alerta crítico 🚨 se sem contato pós-viagem > N dias |
| Reembolso Solicitado | Cancelamento ou devolução em andamento | — |

- **Filtros Avançados por Período**: Painel colapsável de filtros que permite segmentar viagens por intervalos de data financeira, data de embarque ida e data de retorno volta.
- **Abas de Status Rápidas**: Seletores de fase no topo da lista com contadores consolidados de viagens de forma dinâmica.
- **Fácil Atualização de Fases**: Dropdown inline para transição rápida de status para cada linha de viagem cadastrada.
- **SLAs Visuais**: Indicadores icônicos na tabela (🟢 Normal, ⚠️ Pré-Embarque Próximo, 🚨 Pós-Viagem Pendente, ✅ Reembolso Finalizado) baseados nos prazos de alerta.
- **Busca Global**: Pesquisa instantânea por Destino, Código Localizador (LOC), dados do Cliente (nome, e-mail, telefone, CPF/CNPJ), observações operacionais e equipe de consultores.
- **Modal de criação de viagem**: vinculação com cliente, datas no formato DD/MM/AAAA, valor em R$.
- **Modal de Edição & Gerenciamento Avançado**:
  - Reestruturado em abas com layout ampliado de `max-w-2xl` para maior legibilidade.
  - **Dono e SLA no Topo**: A aba "Detalhes e Edição" possui agora um cabeçalho proeminente contendo a identificação do Consultor Responsável com seu avatar correspondente e um indicador pulsante de Alerta de SLA ativo (se aplicável), fornecendo visibilidade direta da urgência do card.
  - **Persistência Contínua de Tela no Salvamento**: Ao salvar alterações na coluna esquerda da viagem (passageiro, destino, datas, valor total, status, observações), o modal agora **permanece aberto** na aba de Detalhes com os dados sincronizados em tempo real, só sendo fechado quando o usuário clicar explicitamente no botão de fechar (`✕` ou Cancelar) ou excluir o registro.
  - **Aba Dinâmica '💸 Histórico de Reembolsos'**: Fica visível apenas para cartões de viagem que possuam reembolsos associados no banco de dados. Exibe de forma organizada a listagem detalhada de cada solicitação vinculada: Produto afetado, Valor Solicitado, Valor Aprovado, Taxa de Retenção, Data de Solicitação e data de encerramento, Justificativa do Cancelamento e o Status do Reembolso com badges HSL temáticos.
- **Produtos, Detalhamento de Valores e Rentabilidade (Novo Nível de Cadastro)**:
  - Permite gerenciar itens de viagem (voo, hotel, seguro, passeio, outro) preenchendo fornecedor, descrição, data do serviço, valor de venda, status e o **Código de Reserva (LOC)**.
  - **Cópia Rápida de LOC em 1-Clique (📋) [NEW]**: Todos os códigos de reserva (LOC) exibidos no cabeçalho da viagem, nos agrupamentos de LOC, nos cards de produtos individuais e no formulário de edição lateral possuem botões com ícone `📋` para cópia instantânea para a área de transferência com feedback visual e toast de confirmação, agilizando consultas em sistemas de cias aéreas e fornecedores.
  - **Código de Reserva (LOC) Obrigatório**: O campo LOC do produto é obrigatório (máximo 20 caracteres, código único sem espaços, barras ou delimitadores textuais).
  - **Quitação Financeira por LOC [NEW]**: Cada LOC exige a alocação de formas de recebimento. O usuário pode fracionar o total da venda em múltiplas formas de pagamento cadastradas. O salvamento só é permitido se a soma dos pagamentos corresponder exatamente ao valor total do LOC, ou se o usuário remover todos os pagamentos para resetar o LOC para "Sem Pagamento". O cabeçalho de cada LOC apresenta badges indicativos (`⚠️ Sem Pagamento`, `⚠️ Incompleto`, ou `✅ Pago`).
  - **Detalhamento de Valores**: Após salvar o produto na viagem, ao clicar no item listado na aba "Produtos e Serviços", abre-se um modal de detalhamento que permite fracionar o valor de venda nas categorias: **Tarifa (Valor Líquido)**, **Taxa** e **Comissão**.
  - **Validação de Alinhamento**: O sistema bloqueia a gravação caso a soma `Tarifa + Taxa + Comissão` divirja centavo por centavo do `Valor de Venda` do produto, orientando o usuário em tempo real sobre o saldo restante a preencher.
  - **Rentabilidade da Viagem [NEW]**: No modal de gerenciamento (aba de detalhes), o PaxFlow calcula a rentabilidade financeira geral acumulada da viagem baseado na margem total dos produtos e serviços cadastrados (`Σ(Valor de Venda - Valor de Custo)`), exibida de forma destacada em um painel HSL elegante.
  - **Exibição Unitária do Serviço no Editor Lateral**: Na terceira coluna (editor lateral), o formulário de edição exibe apenas o serviço selecionado no momento, eliminando a exibição em acordeão de múltiplos itens e tornando a interface mais limpa e focada.
- **Processo de Conferência Financeira (por LOC) [NEW]**:
  - Administradores dispõem de um botão de toggle (`⚙️ Conferir` / `✔️ Conferido`) no cabeçalho de cada LOC. Consultores visualizam apenas um badge estático `✔️ Conferido` quando ativo (oculto quando inativo).
  - A conferência de um LOC bloqueia todas as suas edições, adições, exclusões e alteração de formas de pagamento associadas, mantendo o campo de **Notas e Comentários** ativo.
  - Se houver pendências de quitação no LOC, a conferência é barrada com a mensagem `"LOC com recebimento pendente."`.
  - Um botão de **Financeiro Global** no topo superior direito indica dinamicamente o status geral da viagem (Apagado, Médio, Aceso) e permite bulk-toggle por administradores se não houver pendências.
- **Processo de Conferência de Processo (por Viagem) [NEW]**:
  - Controlado por um botão de toggle (`⚙️ Conferir Processo` / `✔️ Processo Conferido`) no topo direito (exclusivo para administradores; consultores visualizam como badge estático se ativo).
  - Bloqueia as edições dos campos cadastrais gerais da viagem (passageiro, destino, datas, valor, observações e botão excluir).
  - **Exceções operacionais:** O status da etapa permanece editável (habilitando botões de cancelar/salvar ao alterar), o anexo e download de documentos permanecem funcionais, a área de comentários permanece ativa e os produtos/serviços pertencentes a LOCs não conferidos financeiramente permanecem editáveis.
- **Menu Popover de Conferência com Pills no Dashboard [NEW]**:
  - Substituição do antigo select por um botão inteligente `Conf.` com indicador de quantidade de filtros ativos (`Ativo (X)`).
  - Menu suspenso glassmorphic com pills clicáveis: `⏳ Fin. Pendente`, `✅ Fin. OK`, `⏳ Proc. Pendente`, `✅ Proc. OK`.
  - Suporte a múltiplos filtros combinados via interseção lógica (`AND`) e atalhos rápidos (`✨ 100% OK`, `⏳ Nenhum OK` e `Limpar`).
- **Trava de Segurança na Transição de Status**:
  - Ao arrastar ou alterar o status de uma viagem no Kanban para qualquer status posterior a "Fechado" (Pós-Venda, Pré-Embarque, Pós-Viagem ou Reembolso Solicitado), o PaxFlow realiza duas validações em tempo de execução:
    1. O valor total da viagem deve ser completamente coberto pelos produtos cadastrados (o saldo financeiro deve ser zero).
    2. Todos os produtos adicionados a essa viagem precisam estar 100% detalhados (soma de Tarifa + Taxa + Comissão igual ao Valor de Venda de cada produto).
    Qualquer desalinhamento impede a transição e exibe uma notificação pop-up informativa.
- **Solicitação de reembolso**: ao arrastar para "Reembolso Solicitado", abre formulário automatizado que autocompleta valores com base no produto de viagem selecionado.

### 3.3 Orçamentos

**Kanban controlado** (sem drag-and-drop) para o fluxo de prospecção e vendas.

**4 Estágios do Pipeline:**

| Estágio | Ações Disponíveis |
| --- | --- |
| Solicitado | Iniciar → move para "Em Andamento" |
| Em Andamento | Enviar Proposta → abre modal com notas e upload de documentos |
| Aguardando | Alterar (volta para Solicitado), Desistir (vai para Concluído), Aceitar/Vender (vai para Concluído) |
| Concluído | Exibe sub-status: ACEITO (viagem fechada) ou DESISTÊNCIA |

- **Busca em Tempo Real no Cabeçalho**: Pesquisa em tempo real (client-side) filtrando instantaneamente por nome do cliente, destino, contatos, temperatura, notas, tags e nome do consultor.
- **Busca Autocomplete de Clientes Recorrentes**: O mecanismo de busca de clientes existentes ao cadastrar orçamentos foi aprimorado. A digitação no campo de nome, e-mail ou telefone filtra precisamente os clientes cadastrados contra as respectivas propriedades (incluindo tratamento de caracteres não-numéricos no telefone), eliminando retornos distorcidos e ligando o orçamento de forma segura ao cliente correto.
- **Fechamento de Venda (Close Sale)**: Ao concluir e aceitar um orçamento, se o cliente associado não possuir dados de documento em sua ficha cadastral, o sistema exibe um modal que obriga o preenchimento do CPF/CNPJ. Esse campo possui máscara e validação matemática de integridade ativa (suportando inclusive a nova regra de CNPJ Alfanumérico da Receita Federal), prevenindo a persistência de identificações incorretas. A data de nascimento do passageiro torna-se obrigatória para fins operacionais de emissão, enquanto a data de volta é opcional (permitindo viagens de ida simples).
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

### 3.4 Clientes

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
  - **Suporte Legado**: Documentos salvos no Google Drive legado possuem um atalho rápido "Abrir Original" para que o consultor possa acessá-los diretamente em sua conta do Google Drive corporativo.
  - **Gestão de Downloads e Memória**: A barra superior inclui ações rápidas para baixar o PDF localmente, abrir a URL temporária do arquivo assinado seguro (Signed URL válida por 15 minutos) do Supabase Storage e desalocar recursos e URLs temporárias da memória (`revokeObjectURL`) ao fechar o popover.
- **Upload drag-and-drop**: arraste PDFs, JPEGs ou PNGs para enviar ao Supabase Storage. As imagens são automaticamente comprimidas no navegador (Canvas API) antes do upload, economizando armazenamento.
- **Segurança e Organização**: Cada cliente possui uma pasta dedicada identificada pelo seu ID único no bucket do Supabase Storage.
- **Busca em Tempo Real Ampliada**:
  - O mecanismo de busca da barra lateral foi estendido para uma busca completa de alta precisão (client-side). O usuário pode filtrar instantaneamente a lista de clientes por qualquer dado cadastrado, incluindo **telefone, e-mail, documento, endereço residencial, visto ativo, passaporte e observações gerais**.
- **Seleção lateral**: lista de clientes com indicador visual de SLA do passaporte (verde/amarelo/vermelho).

### 3.5 Reembolsos

**Painel dedicado** para acompanhamento de cancelamentos e reembolsos.

- **Tabela completa** com cliente, destino, produto cancelado, fornecedor, valor solicitado.
- **Busca em Tempo Real Dedicada**:
  - Adicionado campo de busca instantânea acima da tabela de reembolsos.
  - Filtro local em memória de alto desempenho (<1ms) cobrindo **nome e e-mail do cliente, destino, localizador da viagem, tipo de produto, fornecedor, descrição do item cancelado, justificativa da solicitação, status e valores monetários formatados**.
- **Cronômetro SLA em tempo real**: mostra dias, horas, minutos e segundos decorridos desde a abertura da solicitação.
- **Alteração de status**: dropdown inline para avançar o fluxo (Aguardando Fornecedor → Em Análise → Aprovado → Pago).
- **Métricas no topo**: total de processos, aguardando fornecedor, concluídos, valor total pago.
- **Filtro automático**: consultor comum vê apenas seus reembolsos; admin vê todos.

### 3.6 Configurações

**Restrito a administradores**. Controle total da configuração e parâmetros globais da agência, organizado em 4 abas principais:

- **Aba Parâmetros Globais**:
  - Nome da agência, logotipo corporativo e cor primária (Branding)
  - Taxa de cancelamento padrão e prazo padrão de reembolso
  - E-mail de suporte e limite máximo de upload configurável (MB)
  - Parâmetros e testes de integração com a API Digisac
- **Aba Consultores**:
  - Lista completa com nome, e-mail, role (admin/consultor), status e indicador de participação em metas
  - Edição inline de role e alternador de ativar/desativar conta
  - Cadastro de novo consultor com criação de credencial no Supabase Auth e definição da flag `participa_metricas`
  - Modal de edição com troca de avatar, redefinição de senha e interruptor `🎯 Participa de Campanhas, Metas e KPIs`
  - **Governança de Métricas e Resiliência Zero-Break**: Usuários com `participa_metricas = false` são excluídos de rankings comerciais, metas de equipe e leaderboards de XP, mantendo o total financeiro da agência e contando com fallback nativo para erro `42703` (Schema Drift)
- **Aba Importações**:
  - Área de upload drag-and-drop para arquivos CSV de chamados/oportunidades
  - Mapeador dinâmico De-Para de colunas e matching inteligente de atendentes
  - Preview visual em carrossel e salvamento em lote (Batch Insert)
- **Aba Automações & SLAs [NEW]**:
  - Regras de inatividade e cancelamento automático de orçamentos (dias)
  - SLAs operacionais de pré-embarque e pós-viagem
  - Automação de disparo eletrônico de pesquisas NPS e prazos de reembolsos

### 3.7 Quadro de Planejamento Interno (Todo Kanban)

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

- **Pesquisa Global Unificada & Modo Co-Piloto (Balcão) [UPDATED]**:
  - Campo de busca global ultra-rápido no topo da tela com atalho de teclado (`/`) e debounce inteligente de 250ms.
  - **Filtro Direto em Tela (Enter ou Clique na Lupa)**: Quando o usuário estiver nas telas de **Viagens (Dashboard)**, **Orçamentos** ou **Reembolsos**, pressionar `ENTER` no campo de busca ou clicar no botão da **Lupa** aplica o filtro imediatamente na listagem/quadro da tela atual, sincronizando os campos locais e ocultando o dropdown de sugestões.
  - **Suspensão Inteligente de Mês Corrente**: Durante a busca ativa via filtro, a restrição de mês corrente é automaticamente suspensa para encontrar registros em qualquer período do histórico da agência, sendo restaurada assim que a busca é limpa.
  - **Limpeza Sincronizada (✕)**: Clicar no botão limpar da busca global remove o filtro da tela atual e restaura a visualização completa de dados.
  - **Pesquisa Multicritério em Tempo Real**: Consulta instantaneamente tabelas de `clientes` (nome, CPF, telefone, e-mail), `viagens` (código de referência `VIA-...`, localizador da viagem, produtos de voo, hotel, cruzeiro e transfers) e `orcamentos` (código de referência `ORC-...`, destino, propostas e contatos).
  - **Agrupamento Inteligente Condensado (Acordeão)**: Os resultados são consolidados por cliente em cards compactos com contadores (`✈️ X Viagens · 📋 Y Orçamentos`). Para buscas com múltiplos resultados, os grupos iniciam colapsados para economizar espaço em tela.
  - **Alternador Global de Expansão**: Botão `[Expandir Todos / Recolher Todos]` no cabeçalho dos resultados para alternar a visualização completa com 1 clique.
  - **Desambiguação Visual por Datas**: Cada viagem exibe o período formatado (`🗓️ 15/10/2026 a 25/10/2026` ou `🗓️ Ida: 15/10/2026`) junto ao status e consultor responsável; cada orçamento exibe a data de cadastro (`📅 12/09/2026`) com o valor total (`R$ ...`).
  - **Atendimento de Balcão em 1-Clique**: Botão `Atender 🤝` abre a ficha instantaneamente e dispara notificação automática no Inbox do consultor titular (`EscalaService`).
- **Barra Lateral (Sidebar) Colapsável**:
  - Permite ocultar rótulos textuais e encolher a barra lateral para uma coluna estreita de ícones (`md:w-20`), ampliando significativamente a área de trabalho útil para visualização das colunas Kanban e tabelas de dados.
  - **Persistência de Estado**: O estado colapsado é salvo automaticamente em `localStorage` (`"paxflow-sidebar-collapsed"`), garantindo que a preferência do consultor seja mantida em futuros acessos.
  - **Responsividade Adaptativa**: Transições CSS animadas ocultam elementos textuais e centralizam ícones e fotos de perfil de forma totalmente orgânica.
- **Campos de Busca com Lupa Vetorial**:
  - Depreciação do antigo emoji de lupa `🔍`, substituído por um ícone vetorial minimalista em formato SVG.
  - O ícone está posicionado de forma absoluta e perfeitamente centrado verticalmente no campo (`absolute inset-y-0 left-0 flex items-center`), garantindo harmonia estética profissional de nível corporativo em todas as listagens (Dashboard, Orçamentos, Clientes e Reembolsos).
- **Responsividade Coesa do Cabeçalho**:
  - Ajustes avançados de alinhamento em telas médias e compactas para evitar quebra desalinhada de caixas de busca e botões primários.

### 3.9 Sistema de Gamificação e Perfis

**Mecânica de engajamento baseada em conformidade e boas práticas operacionais**, integrando o progresso do consultor diretamente às ações do CRM, prospecção e pós-venda.

- **Evolução de Níveis e Patentes**:
  - O XP (Experiência) recompensa preenchimentos e processos corretos no sistema, calculados através de patentes: Mochileiro (Níveis 1-4), Explorador (Níveis 5-9), Navegador (Níveis 10-14), Guia de Elite (Níveis 15-19) e Embaixador do Turismo (Níveis 20+).
  - Curva de XP: Progressão baseada no nível do usuário, calculada e recalculada automaticamente por triggers do banco de dados (PL/pgSQL) ao lançar logs na tabela `public.profiles_xp_logs`.
- **Mural de Medalhas (Badges)**:
  - 14 conquistas exclusivas que cobrem diferentes categorias operacionais (como Mestre dos Prazos, Organizador Implacável, Mestre dos Vouchers, Guardião do Reembolso, Caçador de Oportunidades, etc.).
  - Exibidas no modal "Meu Perfil" em formato de grade interativa. Medalhas não conquistadas são exibidas em escala de cinza e com opacidade reduzida, com Tooltips flutuantes (puramente em CSS Tailwind) que revelam o nome e os requisitos de desbloqueio ao passar o mouse.
- **Sincronização em Tempo Real via Supabase Realtime**:
  - Inscrição reativa em tempo real (WebSockets) na tabela `profiles`. Qualquer alteração no XP ou nível do usuário logado causada por triggers do banco atualiza instantaneamente a interface e dispara as celebrações, sem necessidade de atualizar a página.
- **Visualização de XP na Sidebar**:
  - O avatar na barra lateral é envolto por um anel circular dinâmico SVG que se preenche com base na porcentagem de XP para o próximo nível, acompanhado por um badge numérico flutuante do nível atual e patente exibida abaixo do nome do consultor.
- **Comemorações e Efeitos Visuais/Sonoros**:
  - **Level Up:** Dispara animações de confete (`canvas-confetti` carregado sob demanda via CDN) e sintetiza acordes musicais em tempo real usando a API nativa Web Audio API (sem carregar arquivos de áudio externos), abrindo também um modal glassmorphic premium em 3D.
- **Self-Service de Fotos de Perfil (Supabase Storage)**:
  - Integração direta com o bucket público `avatars` no Supabase Storage. O consultor pode subir sua própria foto a partir do modal de perfil.
  - **Compactação automática Canvas API:** Antes de enviar a imagem, o frontend a redimensiona para um quadrado perfeito de `200x200px` e a comprime para JPEG (qualidade 0.85), transformando arquivos pesados em blobs levíssimos de <50KB para economizar recursos e garantir carregamento instantâneo.
  - **Segurança (RLS):** Política de RLS restrita que permite uploads e escrita somente se a subpasta corresponder ao `UUID` do próprio usuário logado (`auth.uid()`).

### 3.10 Módulo de Cadastros

**Módulo exclusivo para administradores** (`src/pages/Cadastros.ts`) voltado ao cadastro e controle operacional da agência. Concentra as abas de **Tipos de Produtos**, **Destinos**, **Formas de Recebimento**, **Modelos de Mensagem** (seção 3.17) e **Campanhas & Metas** (seção 3.18).

- **Definição de Tipos Customizados**: Possibilita criar registros dinâmicos de produtos (ex: "Passagem Aérea", "Cruzeiro", "Seguro Viagem", "Aluguel de Carro") determinando cores de exibição, ícones visuais estilizados e metadados.
- **Campos Extras Dinâmicos**: Permite associar campos adicionais personalizados a cada tipo de produto, que aparecem automaticamente na tela de detalhes da viagem quando esse produto é adicionado.
- **Gestão Centralizada de Destinos [NEW]**: Aba administrativa dedicada a cadastrar e padronizar os destinos de viagem (cidade/país).
  - Restrito a administradores (RLS no Supabase).
  - Listagem com paginação e busca rápida.
  - Carga inicial automatizada de 188 destinos turísticos pré-higienizados.
  - Resguardo de histórico legado: destinos antigos inconsistentes são rotulados com o prefixo `ARRUMAR | [original]` para higienização manual posterior pelos gestores.
- **Gestão de Formas de Recebimento**: Aba na central de cadastros.
  - Cadastro dos tipos de recebimento acordados com os clientes (ex: "Cartão de Crédito", "Pix", "Boleto").
  - Formulário contendo nome do tipo de recebimento, seleção intuitiva de emoji/ícone em grid, botão de ativação/desativação e edição direta.
- **Gestão de Origens de Lead [NEW]**: Aba dedicada ao gerenciamento dinâmico dos canais de captação comercial da agência (ex: WhatsApp, Instagram, Indicação, Google, Site, Loja, Feiras, TikTok, etc.).
  - Cadastro com seletor de emojis/ícones visuais e ordenação flexível.
  - Mecanismo de **Soft-Delete / Ativação**: canais inativados deixam de aparecer como opção em novos orçamentos, mas continuam íntegros nos orçamentos históricos e relatórios de inteligência.
  - **Prevenção contra Exclusão Acidental**: o sistema trava a exclusão definitiva caso a origem já tenha sido utilizada em orçamentos cadastrados, orientando o gestor a utilizar a desativação.
  - **Resiliência Zero-Break**: fallback automático para `ORIGENS_LEAD_PADRAO` em caso de instabilidade ou divergência de schema (PostgreSQL `42703`/`42P01`).
- **Identidade de Cabeçalho Unificada**: O design e as transições do cabeçalho herdam o mesmo padrão premium das páginas operacionais, exibindo badges de identificação e descrições formatadas.

### 3.11 Localização de Erros e Tradutor Global (I18n)

**Sistema global de interceptação e mapeamento de mensagens** (`src/utils/errorTranslator.ts`) para consistência linguística e melhor usabilidade.

- **Tradução Automática de Backend**: Traduz mensagens técnicas e de sistema em inglês provenientes do Supabase (Auth, RLS, banco de dados PostgreSQL, storage ou falhas de rede) para o Português do Brasil.
- **Centralização via Window**: A função de tradução fica disponível de forma global no objeto `window` e é invocada automaticamente ao exibir Toasts de sucesso/erro e diálogos de alerta da plataforma.

### 3.12 Dashboard de Resultados (Analytics) e Relatórios Gerenciais

**Painel consolidado de inteligência de negócios e auditoria de equipe** (`src/pages/ComercialDashboard.ts` e `src/pages/Relatorios.ts`) focado em fornecer métricas financeiras, taxa de conversão, auditoria de fornecedores e acompanhamento de equipe de forma visual, reativa e offline.

- **Painel Geral de Relatórios (Abas Estratégicas de Auditoria)**:
  - **1. Desempenho e Produtividade**: Rastreia orçamentos abertos, aceitos, taxa de conversão e tempo de fechamento médio. Exibe ranking de consultores em gráfico de barras SVG.
  - **3. Faturamento e Lucratividade [UPDATED]**: Exibe faturamento bruto, taxas, comissões de produtos, markup, lucro líquido real e margem média distribuídos por linha de serviço (aéreo, hospedagem, cruzeiro, seguro, RAV, etc.).
    - **Filtro Dinâmico por Produto**: Permite isolar o relatório para um produto ou categoria específica cadastrada (ex: `AÉREO OPERADORA`, `HOTEL`, `CRUZEIRO`, `RAV`, etc.) ou visualizar o consolidado global ("Todos os Produtos"), recalculando instantaneamente todos os KPIs de topo e a tabela discriminada.
    - **RAV como Linha de Produto Comercial**: A Remuneração de Agente de Viagens (RAV) integra o catálogo de serviços comerciais com 100% de margem (Venda = Comissão/Markup, Custo = 0), unificando a leitura de rentabilidade da agência sem fórmulas com deduções arbitrárias de 12%.
  - **4. Recebimentos & Auditoria Operacional [NEW]**: Auditoria analítica de quitação por Localizador (LOC) e meios de pagamento cadastrados (Pix, Cartão, Boleto, etc.). Conta com **Drilldown Interativo em 1-Clique** nas barras de meios de pagamento e botão **Extrato Completo ↗**, abrindo o modal analítico de extrato detalhado com mapeamento de produtos vinculados aos LOCs, filtros dinâmicos por consultor e busca em tempo real, além de exportação completa para planilha CSV.
  - **5. Metas & Campanhas Comerciais [UPDATED]**: Acompanhamento executivo e ranking de equipe para metas financeiras e campanhas de incentivo (ativas, passadas e futuras). Suporta 4 métricas analíticas: Faturamento Bruto (R$), Rentabilidade / Lucro (R$), Quantidade de Orçamentos Criados (Unidades, ex: campanha de 40 orçamentos cadastrados) e Quantidade de Vendas Fechadas (Unidades).
    - **KPIs Executivos Inteligentes & Proporcionais**:
      - _Meta Global de Loja_: O alvo e o percentual de progresso são calculados diretamente sobre a capacidade total unificada da agência (`totalAgencia / valorMetaLoja`).
      - _Campanhas e Metas Individuais_: O alvo exibido destaca o valor individual por consultor e a capacidade consolidada da equipe (`alvoConsultor * totalConsultores`). O percentual de progresso reflete fielmente o avanço da equipe como um todo em direção ao potencial global da campanha, sem mascarar 100% caso nenhum consultor tenha atingido a faixa individual.
    - Inclui projeções de faixas (Bronze, Prata, Ouro) e **Auditoria Analítica em 1-Clique (`🔍 Auditar`)** com drilldown direto nos orçamentos ou vendas que compõem o resultado do consultor.
  - **6. Fuga de Receita e Perdas**: Donut chart SVG dinâmico exibindo perdas percentuais classificadas por motivos de desistência (preço, concorrência, etc.).
  - **7. Previsão de Fechamentos (Weighted Pipeline)**: Cálculo estatístico local que pondera o faturamento previsto do pipeline em aberto (solicitado = 15%, andamento = 45%, aguardando = 75%) e estima embarques iminentes.
  - **8. Qualidade de Fornecedores e Incidentes**: Tabulação de reembolsos, volume vendido e score de risco por fornecedor.
- **Segurança de Acesso (RLS local)**: Consultores comuns têm visão bloqueada a seu próprio ID (o filtro é desativado). Apenas administradores auditam o consolidado e selecionam qualquer consultor da agência.
- **Exportação e PDF**: Geração de arquivo **CSV** Excel compatível e folha de estilos de impressão `@media print` que esconde barras de navegação e filtros, permitindo salvar relatórios como PDFs corporativos limpos.
- **KPIs Financeiros de Caixa**:
  - **Faturamento Realizado [UPDATED]**: Agora calculado com precisão absoluta de faturamento real. O cálculo considera todas as vendas convertidas e as criadas diretamente na aba Viagens, com base no campo **Data Financeiro** do registro (caindo para a data de criação como fallback).
  - **Pipeline Ativo**: Soma de propostas comerciais abertas e orçamentos em andamento.
  - **Gap de Desistência**: Caixa potencial perdido em negociações não concluídas (desistências).
  - **Conversão Comercial**: Porcentagem reativa de orçamentos aceitos em relação aos decididos.
- **Gráficos Dinâmicos Reativos**:
  - **Donut Chart (SVG Nativo)**: Visualiza a distribuição proporcional do caixa total entre realizado, pipeline e perdas.
  - **Funil de Conversão**: Barra de progressão visual do fluxo de leads, da captação ao fechamento.
- **Performance de Consultores (Admin)**:
  - Tabela consolidada com dados de performance individual da equipe, exibindo o número de propostas, taxa de conversão individual, ticket médio e volume vendido (alinhado em tempo real com as vendas diretas).
- **Precisão Temporal & Sincronização [UPDATED]**:
  - **Tratamento de Timezone**: O motor de datas analisa strings date-only (`YYYY-MM-DD`) em fuso horário local (`T00:00:00`), eliminando distorções causadas pelo desvio UTC que anteriormente moviam vendas criadas no início do mês para o mês anterior.
  - **Sincronização em Tempo Real Inter-Abas**: O ouvinte de sincronização local (`StorageEvent`) agora escuta a chave `paxflow-viagens-local`. Ao adicionar ou editar uma viagem na aba de Viagens, o Dashboard Comercial se atualiza instantaneamente no navegador (mesmo sem recarregamento manual).

### 3.13 Sistema de Comentários, Notas, Menções e Agendamento Automático

**Mecanismo colaborativo integrado** (`src/services/comments.ts`) que permite a comunicação contextualizada entre consultores dentro de orçamentos, viagens e produtos.

- **Notas de Negociação e Operação**:
  - Inserção de anotações e feedback rústico com formatação e data/hora.
  - CRUD de comentários onde o autor possui direito de remoção nativa.
- **Agendamento Integrado (Visual e Texto)**:
  - **Painel Visual e Rodapé Unificado**: O painel de agendamento fica posicionado organicamente entre o campo de texto e o rodapé de ações, evitando desconexão visual. O botão de ação altera dinamicamente entre `Enviar Nota` e `Enviar Nota e Agendar`.
  - **Parser Inteligente de Datas (`parseSmartDate`)**: Aceita entradas de data flexíveis, eliminando descarte silencioso:
    - Entrada por dia simples (ex: `27`): normaliza automaticamente para o mês e ano correntes.
    - Entrada por dia e mês (ex: `27/09`): completa com o ano corrente.
    - Formato completo brasileiro (`27/09/2026`) ou ISO (`2026-09-27`), com validação rigorosa de dias válidos no calendário e seletor nativo de calendário embutido.
  - **Agendamento Autônomo (Nota Opcional)**: Se o consultor abre o painel de agendamento e submete sem digitar uma nota, o sistema gera automaticamente uma nota descritiva (`📅 Lembrete agendado para [Nome] em [DD/MM/AAAA] ([Período])`), preservando o histórico cronológico do item.
  - **Comments Text Parser (Regex)**: Scanner de linguagem natural que varre os comentários em busca de menções a consultores (`@Amanda`) seguidos por data (`20/08/2026`, `27/09` ou `dia 27`) e período opcional (`tarde`, `manha`, `noite`). Ao identificar o padrão, cria o lembrete no calendário e Inbox automaticamente.
  - **Sincronização em Tempo Real e Feedback Visual**: Ao gravar o agendamento no Supabase, despacha os eventos `paxflow-inbox-updated` e `paxflow-reminders-updated`, atualizando o Inbox e o Calendário sem necessidade de reload, além de exibir feedback via Toast e destacar notas agendadas com a tag `📅 Lembrete Agendado`.
- **Autocomplete de Menções com `@`**:
  - Dropdown dinâmico que filtra a lista de consultores ativos à medida que o usuário digita `@`.
  - Inserção amigável do nome selecionado e destaque estilizado em badges HSL/Tailwind no texto.
- **Triggers de Notificação de Menção**:
  - Triggers integrados que processam o texto do comentário em busca de menções e geram registros na tabela `notificacoes` para os consultores citados, alimentando seus painéis de Inbox em tempo real.
- **Modal de Notas de Produto Standalone**:
  - Popup isolado que permite associar anotações técnicas e notas operacionais a produtos específicos dentro de uma viagem.

### 3.14 Exclusão Administrativa e Políticas de Delegação (RBAC)

**Módulo de governança e segurança de dados** com restrição estrita baseada em permissões de perfil corporativo.

- **Role-Based Access Control (RBAC)**:
  - Acesso restrito e exclusivo a usuários de perfil `admin` para ações destrutivas no sistema. Consultores sem privilégios têm os botões de exclusão ocultados ou desativados em toda a interface.
- **Interface de Deleção Segura**:
  - Exclusão com confirmações visuais utilizando popups de diálogo (`showCustomConfirm`) para evitar cliques acidentais.
  - Cobertura em todos os componentes-chave: Clientes, Viagens (Vendas), Orçamentos, Reembolsos e Mensagens de Inbox.
- **Integridade Referencial em Cascata**:
  - O backend e as políticas SQL realizam a limpeza de registros filhos associados (ex: ao excluir uma Viagem, remove os produtos relacionados; ao excluir um Orçamento, trata logs e propostas vinculadas) garantindo estabilidade do banco de dados.

### 3.15 Itinerário Digital Interativo Público

**Visualização externa e mobile-first** projetada para o cliente final da agência acompanhar o andamento operacional de sua viagem de forma anônima e descomplicada.

- **Navegação Sem Autenticação**: O passageiro acessa sua visualização diretamente através de links seguros contendo o hash da rota e o identificador único da viagem (`#itinerario?id=UUID`), eliminando barreiras de login.
- **Estrutura de Linha do Tempo (Cronograma)**: Exibe a lista completa de serviços contratados (vôos, hotéis, traslados) agrupados e ordenados por data em cartões elegantes e responsivos.
- **Contagem Regressiva Interativa**: Um cronômetro reativo no topo do cabeçalho que calcula dias, horas e minutos restantes para o início da viagem.
- **Segurança de Dados via RPC**: O carregamento é alimentado por uma procedure PostgreSQL (`obter_itinerario_publico`) com privilégios `SECURITY DEFINER`, que restringe a consulta pública apenas aos dados operacionais necessários (datas, localizadores, fornecedores e nomes dos passageiros), omitindo informações confidenciais (comissões, faturamento, markups e dados de outros clientes).

### 3.16 Pesquisa NPS Pós-Viagem Pública

**Mecanismo público de coleta de feedbacks de satisfação** (Net Promoter Score) integrado aos fluxos de automação pós-viagem da agência.

- **Coleta Simplificada**: Acessível pelo link seguro de hash `#feedback?id=UUID`. O passageiro avalia o atendimento geral e a experiência de 0 a 10 com cliques rápidos e pode deixar comentários opcionais.
- **Segurança e Privacidade**: Protegido por políticas RLS no banco de dados que admitem inserção pública e anônima mas bloqueiam qualquer consulta externa às avaliações de outros clientes.
- **Armazenamento Centralizado**: As notas alimentam a tabela `feedbacks_nps`, permitindo futuras análises estatísticas automáticas.

### 3.17 Hub de Modelos de Mensagens (WhatsApp)

**Central de automação de correspondências de WhatsApp**, acessível pela aba "Modelos de Mensagem" dentro do menu **Cadastros**, permitindo que consultores enviem mensagens padronizadas em segundos com dados reativos.

- **Gestão de Modelos (CRUD)**: Administradores gerenciam a base de templates (título, descrição, conteúdo e variáveis suportadas) diretamente na aba dedicada no módulo **Cadastros** do app.
- **Preview de Variáveis Reativo**: Modal de disparo que exibe em tempo real o texto final formatado ao substituir tags dinâmicas como `{{cliente}}`, `{{destino}}`, `{{localizador}}`, `{{link_itinerario}}` e `{{link_feedback}}` com base no contexto selecionado.
- **Atalhos Rápidos na Interface**: Botões de WhatsApp incorporados diretamente na linha de viagens do Dashboard, nos perfis de clientes e nos cards do Kanban de Orçamentos, permitindo inicializar o contato instantaneamente.
- **Gamificação Integrada**: O envio de uma mensagem utilizando o hub de templates recompensa o consultor ativo com **+10 XP** no sistema de patentes.

### 3.18 Campanhas de Vendas & Leaderboard

**Mecanismo de engajamento interno**, acessível pela aba "Campanhas & Metas" dentro do menu **Cadastros**, projetado para motivar a equipe de consultores através de competição saudável por ranking de performance.

- **Leaderboard Unificado**: Exibe o ranking em tempo real de todos os consultores cadastrados na agência ordenados de forma decrescente por XP acumulado.
- **Aba de Campanhas & Metas**: Inserida no modal "Meu Perfil", permitindo que os consultores vejam sua posição atualizada frente aos colegas e acompanhem as campanhas de incentivo ativas.

### 3.19 Códigos de Referência Internos Sequenciais (ORC, VIA, RBS, CLI)

**Sistema unificado de codificação legível** para agilizar a identificação de itens chave na operação cotidiana, reduzindo a dependência de identificadores complexos (como UUIDs de banco de dados).

- **Mapeamento de Prefixos**:
  - `CLI-` para Clientes (ex: `CLI-0012`)
  - `ORC-` para Orçamentos (ex: `ORC-0402`)
  - `VIA-` para Viagens/Vendas (ex: `VIA-0118`)
  - `RBS-` para Reembolsos (ex: `RBS-0091`)
- **Geração e Integridade**: Os códigos são gerados de forma atômica no banco de dados (PostgreSQL) usando sequências dedicadas e colunas geradas (`lpad` para 4 dígitos), garantindo exclusividade absoluta e ordem cronológica impecável.
- **Pesquisa Omnipresente**: Permite localizar instantaneamente registros digitando o número sequencial simples ou a referência inteira nas caixas de busca de Clientes, Orçamentos, Viagens e Reembolsos.
- **Badges Visuais**: Exibidos em posições estratégicas na UI (tabelas, cabeçalhos de modais e cartões de Kanbans) para rápida visualização e citação direta.

### 3.20 Validação Automatizada de Viagens e Conferência de Processos

**Mecanismo de governança financeira e de workflow** projetado para certificar a completude das viagens operadas na agência.

- **Conferência Financeira por LOC**: Exige que cada produto/serviço possua seu código de reserva (LOC) exclusivo. A conferência (exclusiva do perfil admin) audita a quitação por Formas de Recebimento cadastradas e trava modificações caso existam pendências de faturamento.
- **Conferência de Processo**: Trava dados cadastrais sensíveis da viagem contra alterações indevidas (permitindo apenas a edição de status, controle de anexos e comentários colaborativos).
- **Trava de Transição de Status**: A movimentação de viagens a partir do estágio 'Fechado' requer saldo líquido zerado e detalhamento completo de custos de fornecedor (Tarifa + Taxa + Comissão = Valor de Venda do produto).
- **Filtros Rápidos no Dashboard**: Painel de visualização com filtros dedicados por status de conferência (Financieramente Conferido, Processo Conferido, Completo, Pendente).

### 3.21 Configurações de Identidade Visual (White-Label Branding)

**Ferramenta de personalização estética e de marca** que permite às agências parceiras remover o logotipo padrão do PaxFlow e estabelecer sua própria identidade corporativa nas interfaces públicas de atendimento.

- **Definição de Cor Primária**: Seletor de cor hexadecimal dinâmico integrado às configurações. A cor escolhida altera automaticamente botões, badges, links e realces de estilo de todas as visualizações externas do passageiro.
- **Upload de Logotipo com Redimensionamento**: Upload de imagem com compressão integrada no navegador via Canvas. Garante que os logotipos sejam ajustados e mantidos sob limites ideais de peso antes de serem persistidos no Supabase Storage.
- **Páginas Públicas customizadas**: O Itinerário Digital e o formulário de Pesquisa NPS passam a exibir o logotipo oficial e a paleta de cores da agência, aumentando a credibilidade e a percepção de valor do cliente final.

### 3.22 Alertas Automatizados de Pré-Embarque e Pós-Viagem NPS

**Automações integradas à Caixa de Entrada (Inbox)** focadas em mitigar falhas de comunicação operacional e assegurar a coleta contínua de pesquisas de satisfação pós-venda.

- **Alerta de Pré-Embarque (48h)**: Notifica automaticamente o consultor com 48 horas de antecedência ao embarque (`data_ida`) para garantir o envio correto de vouchers, passagens e orientações gerais de viagem.
- **Alerta de Pós-Viagem NPS**: Notifica o consultor após o retorno do passageiro para conduzir a pesquisa de avaliação de satisfação (NPS).
- **Integração Imediata via WhatsApp**: Cada card de alerta contém uma ação de um clique para **Enviar Mensagem**, que carrega o modelo do WhatsApp correspondente pré-preenchido e com o link personalizado da viagem.

### 3.23 Métricas Avançadas de Performance e Rendimento de Equipe

**Painel analítico detalhado** adicionado ao Dashboard Comercial para permitir que gestores e donos de agências tenham visibilidade completa sobre a eficiência da força de vendas.

- **Taxa de Conversão**: Percentual de orçamentos criados que foram convertidos em viagens ganhas/fechadas.
- **Tempo Médio de Fechamento**: Cálculo dinâmico do intervalo de dias que os consultores levam para fechar e ganhar uma proposta a partir do seu lançamento.
- **Visualização de Gap financeiro**: Destaca o montante faturado versus as oportunidades financeiras perdidas por desistências de orçamentos.
- **XP de Vendas no Ranking**: Ranking unificado que recompensa consultores mais ativos, incentivando a competição saudável por produtividade.

### 3.24 Central Administrativa de Escala de Funcionários

**Módulo completo de gestão de turnos e folgas da equipe de vendas** (`src/pages/Inbox.ts`, `src/services/escalaService.ts`) integrado como uma nova aba no Inbox do PaxFlow (inspiração Agatur).

- **Grade Mensal Interativa com Sticky Column**:
  - Exibe a lista de consultores da agência com nomes fixados à esquerda (`sticky column`), enquanto os dias 1 a 31 do mês rolam horizontalmente com destaque visual para o dia atual ("Hoje").
  - Identificação de turnos por legendas de cores exclusivas: `10-17` (verde), `12-19` (azul claro), `14-21` (laranja), `15-22` (vermelho), `Folga` (amarelo), `Férias` (cinza), `Reunião` (roxo) e `F` (off).
- **Controle de Acesso Diferenciado (RBAC)**:
  - **Administradores**: Acesso total para alterar turnos de qualquer dia/funcionário (selecionando presets ou digitando texto/observação customizada), editar saldos do Banco de Folgas, adicionar treinamentos e aprovar/recusar solicitações de troca.
  - **Consultores**: Visualização da escala inteira da equipe e botão dedicado para **Solicitar Troca de Turno** ou **Solicitar Folga/Férias**.
- **Fluxo de Aceite Duplo e Aprovação no Inbox**:
  - Solicitação de troca criada pelo Consultor A gera um card de notificação no Inbox do Consultor B.
  - Após o aceite do colega, a solicitação é encaminhada ao Inbox do Administrador para aprovação final.
  - Ao aprovar, o PaxFlow atualiza automaticamente as células dos turnos da escala no mês selecionado e notifica ambos.
- **Banco de Folgas & Agenda de Treinamentos/Eventos**:
  - Painel com saldos de folgas compensatórias por consultor e histórico de justificativas.
  - Agenda de reuniões corporativas, coffees e treinamentos da franquia por data e responsável.

### 3.25 Redesenho de Usabilidade Mobile da Gestão de Viagens

**Experiência mobile-first de padrão aplicativo nativo** para acompanhamento operacional de viagens em smartphones Android e iOS.

- **Botão Flutuante (FAB - Floating Action Button)**:
  - Botão circular de alta prioridade (`[+ Nova Viagem]`) fixado no canto inferior direito da tela móvel (`fixed bottom-6 right-6`), permitindo abrir o formulário de cadastro de viagem instantaneamente com o polegar.
- **Compartilhamento Nativo (`navigator.share`)**:
  - Botão `[🔗]` integrado no card mobile de cada viagem que dispara a folha de compartilhamento nativa do sistema operacional (iOS/Android), enviando o link do itinerário público do cliente diretamente via WhatsApp, Telegram, e-mail ou cópia rápida.
- **Modal Responsivo Full-Screen (`EditTravelModal.ts`)**:
  - O modal de gerenciamento de viagem adapta-se automaticamente a 100% da altura do smartphone com as ações `[Cancelar]` e `[Salvar Alterações]` fixadas no rodapé da viewport para facilidade de toque.
- **Gavetas Inferiores (Bottom Sheets)**:
  - Estilos de transição e backdrop com desfoque (`.pf-bottom-sheet-content`) para interações rápidas no celular sem distorções horizontais.

### 3.26 PaxFlow Risk Score™ (Diagnóstico Preditivo de Saúde Operacional 0 a 100)

**Motor de inteligência preditiva de auditoria operacional** que calcula e monitora 24/7 a saúde operacional de cada viagem cadastrada na agência.

- **Pontuação Dinâmica de 0 a 100**: Toda viagem é inicializada com nota 100 (Saúde Operacional Total). O algoritmo varre continuamente o dossiê da viagem e aplica penalidades parametrizadas no score conforme encontra inconformidades operacionais.
- **Os 5 Pilares da Auditoria de Risco**:
  1. **Documental & Vistos (Peso 30%)**: Valida se o cliente possui número e validade de passaporte cadastrados e se a data de expiração possui no mínimo **180 dias de validade** a partir da data de desembarque/retorno da viagem internacional.
  2. **Vouchers & Fornecedores (Peso 25%)**: Audita a anexação dos vouchers e comprovantes oficiais emitidos pelos fornecedores (voos, hotéis, receptivos) e a presença de códigos de reserva nos produtos.
  3. **Governança & Financeiro (Peso 20%)**: Audita a conferência operacional do processo e a confirmação de **Contato Pré-Embarque em viagens com partida nas próximas 24 horas**. Se faltarem < 24h e o contato estiver pendente, aplica penalidade crítica de **25 pontos** (`p3-contato-pre-embarque-24h`), recuperada instantaneamente assim que o contato é marcado como feito.
  4. **Cobertura de Roteiro (Peso 15%)**: Audita gaps de hospedagem em viagens superiores a 2 dias e a contratação obrigatória de seguro viagem internacional.
  5. **Qualidade Cadastral (Peso 10%)**: Valida a completude do perfil do cliente (CPF/documento, e-mail e telefone de contato).
- **Isenções Inteligentes**: O algoritmo detecta a categoria e destino da viagem, aplicando isenções automáticas para não penalizar indevidamente a agência:
  - **Viagens Nacionais**: Isentas de passaporte e visto.
  - **Passeios / Bate-Volta (duração <= 1 dia)**: Isentos de exigência de vouchers de hospedagem.
  - **Vouchers Unificados**: Reconhecimento automático de vouchers gerais de pacote anexados à viagem.
- **Gaveta Lateral de Diagnóstico (`RiskDiagnosisDrawer.ts`)**:
  - Ao clicar no badge 🛡️ da viagem, abre-se uma gaveta lateral animada detalhando o diagnóstico, os pontos perdidos por pilar e botões de ação rápida de 1-Clique para resolver cada pendência (ex: _🛂 Preencher Passaporte_, _💳 Conferir Recebimentos_, _📎 Anexar Voucher_, _✈️ Realizar Contato Pré-Embarque_).
- **Visibilidade Unificada**:
  - Exibido nos cards do Kanban do Dashboard, na tabela do Dashboard e no topo do modal **Gerenciar Viagem** (`EditTravelModal.ts`).
- **Controle Administrativo Global**:
  - Administradores podem ativar/desativar o recurso (`habilitar_risk_score`), ajustar a janela de carência pré-embarque (padrão 60 dias) e o limite crítico de risco (padrão < 50 pontos) na aba _Automações_ das Configurações.

---

### 3.27 Relatório de Embarque e Rastreamento de Contato Pré-Embarque

**Módulo operacional e analítico de controle de partidas e embarques**, desenhado para garantir que 100% dos passageiros recebam atendimento pré-embarque antes de se dirigirem ao aeroporto ou embarque rodoviário.

- **Granularidade e Consolidação Inteligente por Trecho**:
  - Se a viagem possui **produtos aéreos cadastrados com trechos**, o relatório prioriza e exibe **exclusivamente os trechos de voo** (com Cia aérea, rota `Origem ➔ Destino` e código localizador/reserva), eliminando qualquer duplicidade visual com as datas gerais do card.
  - Para viagens que **não possuem produtos aéreos** (ex: reservas apenas de hotel, rodoviário ou cruzeiro), o sistema utiliza automaticamente as datas gerais de Ida e Volta da viagem.
  - O sistema audita o status de contato de cada trecho de forma independente no banco de dados (`viagens.contatos_embarque`).
- **Coluna CONTATO com Botão Toggle em 1-Clique**:
  - Posicionada entre as colunas **Alerta** e **Ações**, exibe botões visuais interativos:
    - `⏳ Pendente`: estilo âmbar com ícone de relógio indicando pendência de contato.
    - `✅ Feito`: estilo esmeralda com ícone de confirmação.
  - Permite alternância livre (marcar ou desmarcar em caso de clique acidental), salvando imediatamente no Supabase em tempo real.
- **Auditoria Transparente (Tooltip em Hover)**:
  - Ao passar o mouse sobre o botão `Feito`, um tooltip exibe quem realizou o contato e a data/hora exata (ex: _Contato realizado por Thiago em 11/09 às 15:45_).
- **Filtro Rápido no Cabeçalho**:
  - Seletor suspenso no topo da tabela permitindo filtrar por:
    - _Todos os Embarques_
    - _✅ Contato Feito_
    - _⏳ Contato Pendente_
- **Exportação CSV Completa**:
  - O arquivo CSV gerado pelo botão _Exportar CSV_ inclui a coluna `Contato Pré-Embarque`, refletindo o status real da auditoria para relatórios de diretoria.
- **Integração no Modal Gerenciar Viagem (`EditTravelModal.ts`)**:
  - Na linha de **Comunicação:** ao lado do botão WhatsApp:
    - Se houver embarque pendente: exibe `Pré-Embarque: Pendente ⏳` que abre o modal de mensagens com modelo de Pré-Embarque já selecionado. Ao enviar, marca o contato automaticamente como feito.
    - Se todos os embarques estiverem feitos: exibe `Pré-Embarque: Feito ✅ (Digisac)` que abre o painel focado no histórico de conversa do Digisac.

---

### 3.28 Next Trip Engine™ (Motor Preditivo de Recompra & Ciclo de Vida do Viajante)

**Motor de inteligência comercial preditiva** que analisa o histórico transacional do cliente (_quem viajou, para onde, quando, com quem, quanto gastou, notas de NPS e preferências_) para responder dinamicamente: _"Quais clientes da agência estão no momento ideal para comprar uma nova viagem?"_. Acessível na tela dedicada **🎯 Next Trip Engine** no menu lateral (`#next-trip`) e em versão compacta nos Dashboards.

- **Score de Potencial de Recompra (0 a 100)**: Avaliação em tempo real combinando 5 vetores essenciais:
  1. **Sazonalidade Temporal (30%)**: Ciclicidade decorrida desde o último retorno (> 90 dias pós-retorno).
  2. **Satisfação (NPS 25%)**: Clientes Promotores (NPS 9-10) ganham impulso de potencial; clientes neutros/detratores possuem prioridade menor.
  3. **Perfil de Destino & Ticket Médio (20%)**: Classificação por categorias de afinidade (Europa, Resorts/Praia, Disney/Família, Cruzeiros, Nacional).
  4. **Mês Habitual de Viagem (15%)**: Períodos históricos recorrentes de férias (Julho, Réveillon, Carnaval).
  5. **Conformidade Operacional (10%)**: Ausência de reembolsos pendentes ou disputas ativas.
- **Visualização & Filtros na Central Preditiva**:
  - Exibido na tela dedicada (`#next-trip`) com filtros por **Alto Potencial (>= 75)**, **Médio Potencial**, Categoria de Destino, Busca por Cliente/Destino e Filtro por Consultor Titular.
  - Exibição de badge dinâmico (`🔥 Potencial: 88/100`) e estatísticas agregadas da carteira.
- **Ações Rápidas de 1-Clique**:
  - `🎯 Criar Orçamento Preditivo`: Abre o formulário de novo orçamento com Cliente, Destino Recomendado e Temperatura _🔥 Quente_ pré-carregados.
  - `💬 Disparar WhatsApp Personalizado`: Abre o modal de mensagens com variáveis dinâmicas (`{primeiro_nome}`, `{ultimo_destino}`, `{proximo_ano}`) para envio instantâneo via DigiSac/WhatsApp Web.
- **Gestão de Abordagem & Snooze de 30 Dias**:
  - Ao atuar sobre a oportunidade (disparo de WhatsApp ou criação de orçamento), o status muda para _"Em Abordagem"_ e entra em carência automática por 30 dias para evitar abordagens repetitivas. Se um novo orçamento for fechado, o ciclo de ciclo de vida é resetado para o novo embarque.
- **Agrupamento Familiar**:
  - Viagens anteriores com múltiplos passageiros (casais, famílias) são consolidadas no nome do **Titular/Comprador Principal** (_Família Silva — 4 passageiros_), evitando duplicidade de abordagens no mesmo núcleo familiar.
- **Governança & Parâmetros Administrativos**:
  - Consultores visualizam e atuam sobre as oportunidades dos seus próprios clientes titulares; Administradores possuem visão global de toda a agência.

### 3.29 PaxFlow Upsell Engine™ (Motor Preditivo de Oportunidades & Ticket Médio)

**Algoritmo preditivo de recomendação de adicionais e upgrades em tempo real**, desenhado para elevar a margem de contribuição e o ticket médio de cotações de orçamentos e oportunidades de recompra.

- **5 Gatilhos Inteligentes de Recomendação**:
  1. **🛡️ Seguro Saúde Internacional Obrigatório**: Disparado automaticamente em cotações internacionais (Europa, EUA/Orlando, Disney, Cancún, Chile, Argentina) quando nenhum seguro saúde estiver vinculado.
  2. **🎟️ Passeios VIPs & Ingressos de Atrações**: Sugere pacotes de passeios privativos e ingressos antecipados para destinos de alto fluxo.
  3. **🚘 Transfer Privativo Aeroporto-Hotel**: Recomendação ativada para grupos de 3+ passageiros, viagens internacionais ou cotações acima de R$ 8.000,00 sem traslado cadastrado.
  4. **🏨 Upgrade de Categoria de Hotelaria / All-Inclusive**: Identifica pacotes com hospedagem padrão e sugere acréscimo de meia pensão ou categoria luxo com margem estimada de +18%.
  5. **📋 Seguro Cancel Flex (Reembolso 100%)**: Recomendação para cotações acima de R$ 10.000,00 que diminui a hesitação do cliente e acelera o fechamento do contrato.
- **Inclusão em 1-Clique nas Notas de Orçamento**:
  - No modal de envio de proposta, o consultor pode clicar em `+ Incluir` para injetar o texto da sugestão diretamente na proposta comercial.
- **Controle de Ativação Global**:
  - Pode ser ativado ou desativado em tempo real por administradores na aba **Automações** das Configurações (`global_settings_table.habilitar_upsell_preditivo`).
  - Administradores podem ajustar os parâmetros de sensibilidade (Janela de Sazonalidade, Nota mínima de NPS, Corte de Score e Dias de Snooze) na aba _Configurações -> Automações_.
- **4 Modelos Padrão Nativos de WhatsApp**:
  - Modelos nativos pré-carregados para _Aniversário de Viagem 12m_, _Resorts de Verão_, _Disney & Família_ e _Recompra VIP Promotor NPS_.

---

### 3.30 PaxFlow Studio™ (Criação de Propostas Digitais de Luxo & Cadernos de Viagem)

Módulo avançado de orquestração visual e documental da agência, permitindo consolidar múltiplos vouchers, bilhetes e cotações em propostas visuais cinematográficas e cadernos de viagem prontos para impressão.

- **Arquitetura Split Screen (Tela Dividida)**:
  - **Coluna da Esquerda (Editor Estruturado)**:
    - **1. Ingestão de Documentos**: Dropzone de PDFs de consolidadoras e botão de colar texto livre de WhatsApp/e-mail com motor de extração documental com fidelidade estrita. Recolhível automaticamente para maximizar espaço.
    - **2. Dados do Passageiro, Capa & Consultor**:
      - **Branding / Tagline da Capa**: Campo editável para personalizar o título de marca (padrão *"PAXFLOW LUXURY TRAVEL"*) para o nome da agência ou slogan da proposta.
      - **Galeria Unsplash™ com Tradução Semântica**: Motor de busca com tradução automática PT-BR ➔ EN (ex: *praia -> tropical beach*, *neve -> snow*, *safari*, *vinhedos -> wine*) e pills temáticas rápidas.
      - **Governança de Canais de Atendimento**: O telefone fixo e WhatsApp vinculados à proposta são **estritamente institucionais e padronizados da agência / loja** (campos travados para leitura), garantindo que nenhum consultor informe números pessoais aos clientes. O e-mail profissional de atendimento é sempre o do consultor atribuído.
      - **Consultor Dedicado**: Seletor integrado à equipe cadastrada com auto-preenchimento de foto/avatar via `getAvatarSvg` (suporte a animais do PaxFlow, fotos de perfil ou iniciais estilizadas), nome, e-mail profissional e preview visual imediato.
      - **Cotação e Datas**: Definição de moeda (BRL/USD/EUR), valor total e datas de ida e volta.
    - **3. Roteiro & Atividades**: Lista de dias sequenciais com cartões compactos de atividades (voos, hotéis, transfers, passeios e seguros) com badges visuais de localizador, companhia aérea e horários.
  - **Coluna da Direita (Live Preview em Tempo Real)**:
    - Prévia fidedigna da proposta de luxo com renderização instantânea a cada caractere digitado pelo consultor.
    - Seletores de visualização `Desktop` (largura total) e `Mobile` (simulador realista de smartphone).
    - **Card do Consultor Dedicado**: Exibição do consultor com foto/iniciais, status online e botões funcionais de WhatsApp e ligação direta direcionando sempre para a central oficial da loja.
- **Barra Inferior Fixa de Salvamento & Aplicação**:
  - Posicionada permanentemente na base da tela com indicador reativo de status (`Modificações pendentes` com alerta âmbar pulsante vs `Todas as alterações salvas no banco` com selo verde de conformidade).
  - Botão de ação em destaque `Salvar Proposta`, com atalho de teclado global **`Ctrl+S`** / **`Cmd+S`**.
  - Ações de saída em 1-clique: Impressão do Caderno de Viagem em PDF A4 de alta resolução, Link do Cliente para aprovação online e conversão direta da proposta aprovada em Viagem confirmada no Kanban.
- **Gaveta Lateral de Propostas (Drawer)**:
  - Painel lateral deslizante aberto pelo botão `📂 Minhas Propostas`, contendo campo de busca em tempo real por cliente ou destino, status da proposta e botões de carregamento e emissão de PDF. Mantém a bancada de trabalho 100% desobstruída.
- **Modal Focado de Atividades**:
  - Permite configurar detalhes profundos de voos (origem, destino, cia aérea via catálogo oficial, número de voo, PNR), hospedagens (quarto, regime, voucher, mapa) e serviços de forma espaçosa e focada, com botão explícito `Aplicar ao Roteiro`.

---

### 3.31 Gestão Inteligente de Anexos e Documentos (Clientes e Viagens)

Módulo unificado de governança e custódia documental para agências de viagem, eliminando a fragilidade de rotular cegamente qualquer anexo como passaporte. Estrutura a gestão de arquivos em duas frentes complementares: **documentos pessoais de identificação do passageiro** e **vouchers/contratos operacionais vinculados à viagem**.

- **Taxonomia Universal de 12 Categorias**:
  - **Identificação Pessoal**:
    - `PASSAPORTE` (Passaporte Internacional)
    - `RG` (Carteira de Identidade)
    - `CNH` (Carteira Nacional de Habilitação)
    - `VISTO` (Visto Consular / ETA)
  - **Vouchers & Logística**:
    - `VOUCHER_AEREO` (Bilhete / Passagem Aérea)
    - `VOUCHER_HOTEL` (Reserva de Hospedagem)
    - `INGRESSO` (Ingressos & Atrações)
    - `VOUCHER_TRANSPORTE` (Transfer / Locação de Veículo / Trem)
    - `SEGURO` (Apólice de Seguro Viagem)
  - **Governança & Roteiro**:
    - `CONTRATO` (Contrato de Intermediação e Termos)
    - `ROTEIRO` (Caderno / Programa de Viagem)
    - `OUTROS` (Comprovantes Gerais)

- **Upload em Lote com Inferência Inteligente (`UploadAnexoModal.ts`)**:
  - Área de arrastar e soltar (drag-and-drop) ou clique permitindo o envio simultâneo de múltiplos arquivos (PDFs, JPEGs, PNGs).
  - **Detecção Automática por Nome**: Analisa o nome original de cada arquivo por expressões regulares contextuais e pré-seleciona a categoria mais adequada (ex: `cnh_joao.pdf` ➔ `CNH`, `voucher_resort_cancun.pdf` ➔ `VOUCHER_HOTEL`, `passagem_voo_latam.pdf` ➔ `VOUCHER_AEREO`, `transfer_hotel.pdf` ➔ `VOUCHER_TRANSPORTE`).
  - **Edição Inline de Metadados**: Permite ajustar o rótulo amigável, o número do documento (`numero_documento`) e a data de validade (`data_validade`) antes de confirmar o envio.
  - **Seletor de Passageiros em Viagens em Grupo**: Permite atribuir cada voucher ou comprovante a um passageiro específico cadastrado na viagem (titular ou acompanhantes), organizando a pasta do grupo com total clareza.

- **Sincronização Inteligente entre Viagem e Ficha do Passageiro**:
  - Ao anexar documentos pessoais (`PASSAPORTE`, `RG`, `CNH`) dentro do modal de uma viagem ou na ficha do cliente, o serviço (`AnexosService`) sincroniza automaticamente as informações no cadastro do cliente (`clientes`), preenchendo número do documento e validade caso estejam pendentes.

- **Formatação e Apresentação Human-Friendly de Tamanho dos Arquivos (MB & KB)**:
  - O método unificado `AnexosService.formatarTamanho(bytes)` calcula e renderiza os tamanhos de forma legível e amigável para leitura humana imediata em todos os pontos do sistema (Upload em Lote, Galeria de Documentos do Cliente e Aba de Anexos da Viagem).
  - Exibe valores de forma dual combinando Megabytes (MB) e Kilobytes (KB) (ex: `2.4 MB (2.441 KB)` ou `450 KB (0.4 MB)`), eliminando a complexidade de leitura de números brutos de KB ou bytes.

- **Galeria Visual de Documentos e Ações Rápidas**:
  - Renderização em cards modernos com badges coloridos, data de envio, autor do upload e identificação do passageiro vinculado.
  - **Visualização Inline (Lightbox)**: Abertura imediata de PDFs e imagens com controles de ampliação e rotação sem sair da aplicação.
  - **Download Seguro**: Acesso direto ao arquivo original armazenado no Supabase Storage.
  - **Compartilhamento WhatsApp com 1-Clique**: Gera mensagem profissional pré-formatada contendo o nome do passageiro, a descrição do documento e o link seguro de visualização para envio ao cliente.
  - **Controle de Exclusão com Auditoria**: Apenas administradores ou o consultor autor do envio possuem autorização para excluir documentos anexados.

- **Integração com PaxFlow Risk Score™**:
  - Anexos categorizados como `VOUCHER_HOTEL`, `VOUCHER_AEREO`, `VOUCHER_TRANSPORTE` ou `SEGURO` abatem automaticamente pendências do pilar de Vouchers e Logística da viagem.
  - Documentos de identidade (`RG`, `CNH`) comprovados nos anexos do passageiro validam sua conformidade documental em viagens nacionais e destinos Mercosul, impedindo penalidades indevidas por ausência de passaporte internacional.

- **Compressão Inteligente Client-Side de PDFs Acima de 25MB (`PdfCompressorService.ts`)**:
  - **Gatilho Estrito**: O motor só entra em ação quando o arquivo for do tipo PDF e seu tamanho ultrapassar 25MB (limite operacional do sistema). Documentos com até 25MB ou em formatos de imagem são processados instantaneamente sem acionar o módulo.
  - **Arquitetura de Lazy Loading**: As bibliotecas de manipulação e renderização gráfica (`pdfjs-dist` e `pdf-lib`) são carregadas sob demanda via importação dinâmica exclusivamente na máquina do usuário quando o gatilho é disparado, garantindo **zero impacto** no tempo de carregamento da aplicação no dia a dia.
  - **Metodologia de Rasterização Visual (150 DPI)**: Cada página do PDF é renderizada em canvas gráfico em escala proporcional a 150 DPI e convertida para JPEG balanceado (qualidade 0.75 a 0.80), preservando com total nitidez assinaturas, carimbos e textos para impressão e leitura. Em seguida, um novo documento limpo e leve é remontado em memória via `pdf-lib`.
  - **Experiência do Usuário (UX)**: A modal `UploadAnexoModal` exibe badge visual ("⚡ Otimização Automática") e transmite feedback em tempo real página a página ("Otimizando documento: Página X de Y...") antes da gravação no Supabase Storage.
  - **Tratamento de Exceção e Fallback**: Se mesmo após a compressão a 150 DPI o documento continuar acima de 25MB (como catálogos de centenas de páginas), o sistema emite alerta amigável detalhando o tamanho reduzido atingido e orienta o usuário a desmembrar o arquivo.

- **Exclusão Resiliente de Anexos Oficiais e Legados**:
  - O método `AnexosService.excluirAnexo` opera com detecção inteligente de tipo de identificador:
    - **Anexos Oficiais (`documentos_anexos`)**: Identificados por UUID, removidos da tabela relacional e desvinculados do Storage.
    - **Documentos Legados da Ficha do Cliente (`legado-cliente-{id}`)**: Não disparam queries `DELETE` com strings não-UUID na tabela `documentos_anexos` (evitando erros 400 do PostgreSQL). Atualizam a tabela `clientes` limpando `google_drive_folder_url`, `passaporte_numero` e `passaporte_validade`, além de purgar o arquivo físico correspondente do Supabase Storage.
  - Sincroniza em tempo real a interface da Ficha do Cliente e do Gerenciador de Viagens, impedindo a exibição de documentos fantasmas ou links órfãos.

- **Resiliência a Schema Drift (Padrão Zero-Break)**:
  - O serviço `AnexosService` conta com tratamento nativo para erros de colunas inexistentes (`42703`), retrocedendo para o schema base sem travar a interface nem gerar mensagens de erro ao usuário caso a migração DDL ainda esteja em processo de aplicação no banco de dados.

---

### 3.32 Melhorias de Usabilidade, Produtividade e Feedback Visual de UX (Plano 1)

Pacote de micro-interações, transparência de estado e aceleração de produtividade operacional desenvolvido para otimizar o fluxo diário dos consultores e administradores da agência:

1. **Barra de Chips de Filtros Ativos no Dashboard**:
   - **Feedback Visual Imediato**: Renderiza tags (chips) arredondadas elegantes abaixo das abas de status sempre que qualquer critério de filtragem estiver ativo (termo de busca, períodos de datas financeiro/ida/volta, equipe/consultor, conferências financeiras/processo ou fase de venda).
   - **Desativação Granular em 1-Clique**: Cada chip possui botão de remoção individual (`✕`) para que o usuário possa desativar um critério específico sem perder a configuração dos demais.
   - **Ação Rápida de Limpeza Total**: O botão `Limpar Todos` restaura a visualização global de forma instantânea.

2. **Search Highlighting Inteligente (Realce Visual em Amarelo)**:
   - Utilitário puro e de alta performance (`highlightMatch` em `src/utils/textHelper.ts`) com escape seguro de caracteres especiais de Regex.
   - Aplica realce com tag `<mark>` estilizada em âmbar nos resultados pesquisados em tempo real nos módulos de **Dashboard / Viagens** (cliente, código de referência, destino), **Orçamentos** (cliente, código de referência, destino, contato) e **Central de Reembolsos** (cliente, código de referência, destino, fornecedor, localizador).

3. **Pills de Agendamento Rápido no Inbox (1-Toque)**:
   - Botões de seleção rápida integrados à seção de agendamento de lembretes no modal de Nova Mensagem Direta (`NewMessageModal.ts`):
     - `⚡ Hoje 17h`: Preenche a data de hoje no turno da tarde.
     - `☀️ Amanhã 09h`: Define o dia seguinte no turno da manhã.
     - `🗓️ Em 3 dias`: Pula 3 dias no calendário no turno da manhã.
     - `💼 Próx. Segunda`: Calcula e seleciona automaticamente a próxima segunda-feira útil.
   - Reduz drasticamente o tempo necessário para criar follow-ups e tarefas para a equipe.

4. **Calculadora Reativa & Barra de Status de Detalhamento Financeiro de Produtos**:
   - Barra visual de status em tempo real integrada ao painel de edição de produtos da viagem (`EditTravelModal.ts` / `DashboardTemplates.ts`).
   - Calcula em tempo real o percentual de conciliação entre o **Valor de Venda** e o rateio de custos (**Tarifa + Taxas + Comissão + Markup**).
   - Exibe indicador visual dinâmico (`✅ 100% OK (Totalmente Detalhado)` em verde ou `⏳ X% Detalhado` em âmbar com indicação do saldo pendente).

5. **Feedback Visual Inline no Botão Salvar**:
   - Ao salvar alterações no cadastro de viagens ou na edição de produtos, o botão de ação principal transiciona suavemente seu estado e cor para `✅ Salvo com Sucesso!` em verde esmeralda com sombra brilhante antes do recarregamento dos dados, fornecendo confirmação tátil e inequívoca da persistência no banco.

### 3.33 Melhorias de Eficiência Operacional, Pipeline e Ações Rápidas de UX (Plano 2)

O **Plano 2 de UX** expande o ganho de agilidade e a ergonomia de uso do PaxFlow em 6 pilares estratégicos:

1. **Lead Aging (Tempo no Estágio) no Pipeline de Orçamentos [UPDATED]**:
   - Badges visuais calculam e exibem automaticamente o tempo em dias decorrido desde a última movimentação da proposta no Kanban:
     - 🟢 **Recente**: Até 2 dias na etapa (ex: `🟢 Hoje`, `🟢 1d na etapa`).
     - 🟡 **Moderado**: De 3 a 5 dias sem movimentação (ex: `🟡 4d na etapa`).
     - 🔴 **Crítico**: Acima de 5 dias estagnado (ex: `🔴 8d na etapa`), acionando animação pulsante para chamar a atenção imediata do consultor.
   - **Reinicialização ao Retornar para Solicitado**: Ao retornar uma proposta de `EM_ANDAMENTO` ou `AGUARDANDO` para `SOLICITADO` (via botão `↩️`, `🔄` ou menu rápido), o timestamp `updated_at` é renovado para o momento atual no banco e na interface, reiniciando o contador de tempo na etapa para `🟢 Hoje`.

2. **Menu de Ações Rápidas nos Cards de Orçamento (`⋮`) & Ações de Transição [UPDATED]**:
   - Dropdown compacto no topo direito de cada card que permite executar ações imediatas sem precisar abrir o modal detalhado:
     - **Voltar para Solicitado (`↩️`)**: Atalho direto tanto no menu rápido quanto no card para retroceder um orçamento em andamento ou aguardando para `SOLICITADO`, reiniciando seu Lead Aging.
     - **Alteração de Temperatura em 1-Toque**: Modifica a classificação comercial para 🔥 Quente, ⚡ Normal ou ❄️ Frio com persistência imediata no Supabase.
     - **WhatsApp Direto**: Dispara o envio de mensagem pré-formatada.
     - **Lembrete Rápido (+2 dias)**: Cria automaticamente um lembrete com agendamento no Inbox para daqui a 2 dias (turno manhã).
     - **Ver Detalhes / Notas**: Abertura instantânea da ficha completa.

3. **Abas Superiores com Contadores Dinâmicos na Central de Reembolsos**:
   - Barra de navegação tipo _pills_ no topo da tabela de reembolsos com contadores recalculados em tempo real:
     - `Todos (N)`
     - `⏳ Solicitados (N)` (englobando solicitações iniciais e aguardo de fornecedor)
     - `🔍 Em Análise (N)`
     - `✅ Aprovados / Pagos (N)`
     - `❌ Recusados / Cancelados (N)`
   - Permite alternar a visão da fila com 1 clique, mantendo a compatibilidade com a busca textual.

4. **Sync Scroll Espelhado no PaxFlow Studio™**:
   - Rolagem vertical sincronizada e proporcional entre a coluna do editor e a janela do **Live Preview** no modo desktop, garantindo que o consultor visualize no preview exatamente o dia ou serviço que está preenchendo no editor.

5. **Drag & Drop de Vouchers Diretamente sobre o Produto**:
   - Cards de produtos no modal de gerenciamento de viagens tornam-se zonas de soltura nativas HTML5.
   - Ao arrastar um arquivo PDF ou imagem sobre o card, o produto recebe destaque visual com borda tracejada índigo e aciona a janela de upload do `UploadAnexoModal` com vínculo automático àquele produto e passageiro.

6. **Atalho Universal de Teclado `Ctrl + Enter` / `Cmd + Enter`**:
   - Padronização de atalho de teclado para submissão imediata em:
     - Caixa de comentários e anotações (produtos, orçamentos e viagens).
     - Modal de Nova Mensagem Direta do Inbox (campos de assunto e corpo).
     - Formulário principal de Edição de Viagem e observações.

### 3.34 Experiência Premium, Inteligência Relacional e Microinterações de UX (Plano 3)

O **Plano 3 de UX** consolida a experiência de classe mundial do PaxFlow, integrando governança cadastral, visão 360° do passageiro, assistentes de conversão e transições visuais de alta fidelidade:

1. **Barra de Completude Cadastral (Profile Completeness na Ficha do Cliente)**:
   - Indicador visual em anel/badge no topo da Ficha do Cliente que audita e quantifica o preenchimento de dados essenciais para viagens:
     - 🔴 **< 50% (Baixo)**: Faltam dados críticos (contatos ou documentos).
     - 🟡 **50% a 79% (Médio)**: Contatos básicos preenchidos, pendente passaporte ou data de nascimento.
     - 🟢 **≥ 80% (Alto/Completo)**: Ficha com governança 100% apta para emissão nacional e internacional.
   - Tooltip flutuante interativo que decompõe em tempo real os itens concluídos (`✅ Nome`, `✅ E-mail`, `✅ Telefone`, `✅ CPF/CNPJ`) e as pendências ativas (`⚠️ Data de Nascimento`, `⚠️ Passaporte e Validade`).

2. **Linha do Tempo Unificada do Cliente (PaxFlow Customer 360°)**:
   - Aba dedicada na Ficha do Cliente que agrega todos os pontos de contato e eventos históricos do passageiro em ordem cronológica reversa:
     - 👤 **Cadastro Inicial**: Data de criação da ficha e canal de aquisição.
     - 📋 **Orçamentos Solicitados**: Histórico de cotações, destinos e status de proposta.
     - ✈️ **Viagens Operacionais**: Vendas confirmadas, localizadores (LOCs), datas de embarque e valores.
     - 🪪 **Documentos Anexados**: Passaportes, vistos e vouchers arquivados no Google Drive.
     - ⭐ **Feedbacks & Avaliações NPS**: Notas e depoimentos do pós-viagem.

3. **Assistente Passo a Passo para Conversão de Orçamento em Viagem (Mini-Wizard)**:
   - Transformação do fluxo de fechamento de vendas em um assistente guiado em 2 passos:
     - **Passo 1 — Validação do Passageiro**: Confirmação do titular, contatos, validação estrita de CPF/CNPJ com máscara e obrigatoriedade condicional de Data de Nascimento (para pessoas físicas).
     - **Passo 2 — Dados de Roteiro & Finanças**: Definição do destino com autocomplete inteligente, datas de ida/retorno, data do financeiro, valor total da venda e notas operacionais (ou vinculação direta a viagem existente).
   - Stepper visual superior de progresso e validação de consistência entre etapas.

4. **Reordenação Drag & Drop de Dias do Roteiro no PaxFlow Studio™**:
   - Cada bloco de dia no editor estruturado de propostas conta com uma alça de arraste nativa (`⋮⋮`).
   - Permite arrastar qualquer dia de viagem para uma nova posição cronológica com o mouse, acionando a renumeração sequencial automática (`diaNumero = index + 1`) e atualização instantânea do Live Preview e das lâminas do caderno em PDF.

5. **Telas de Carregamento Esqueleto (Skeleton Screens)**:
   - Eliminação de spinners estáticos convencionais por placeholders pulsantes estruturados (`animate-pulse`) via utilitário `skeletonHelper.ts`.
   - Espelha com fidelidade geométrica o formato de tabelas, cards e fichas detalhadas durante o carregamento de dados do Supabase, prevenindo qualquer salto visual de layout (CLS).

6. **Gestos de Deslizar nos Cards Mobile (Swipe Actions)**:
   - Suporte a gestos nativos de toque para smartphones e tablets:
     - 👉 **Deslizar para a Direita**: Dispara o envio imediato de mensagem pré-formatada no WhatsApp do passageiro.
     - 👈 **Deslizar para a Esquerda**: Abre a gaveta de detalhes operacionais da viagem.

### 3.35 Atalho Rápido e Modal de Cadastro do Cliente na Venda

O componente `ClienteDetalhesModal` resolve o atrito operacional de consulta e edição de dados de passageiros durante o atendimento e gestão de viagens ativas:

1. **Botão de Atalho Integrado (`👤 Ver Ficha`)**:
   - Localizado diretamente ao lado do campo de seleção de passageiro no modal de edição da venda (`EditTravelModal`).
   - Habilita e desabilita dinamicamente conforme a seleção do cliente no formulário da viagem.

2. **Modal Sobreposto (Camada Superior `z-[60]`)**:
   - Abre sobre o modal da viagem em background sem fechar o formulário de edição nem descartar alterações não salvas de produtos, datas ou valores.
   - Suporta fechamento por botão ✕, tecla `Escape` e clique no backdrop com animações suaves de escala e opacidade.

3. **Edição Completa e Governança de Dados**:
   - Permite visualizar e editar todos os campos cadastrais:
     - **Dados Pessoais & Contato**: Nome Completo, E-mail, Telefone/WhatsApp, CPF/CNPJ (com validação e máscara), Data de Nascimento, Endereço e Origem do Lead.
     - **Passaportes & SLA de Validade**: Controle de passaportes de titulares e acompanhantes com alertas visuais para prazos críticos (< 180 dias ou expirados).
     - **Preferências & Observações**: Notas gerais, milhagem/programas de fidelidade e preferências de assentos/alimentação.

4. **Sincronização em Tempo Real com a Venda**:
   - Ao salvar as alterações, os dados são persistidos no Supabase e propagados imediatamente para o formulário da viagem em memória (atualizando o `<select>` de clientes e as referências do passageiro) sem recarregar a tela.

### 3.36 PaxFlow FinRecon™ (Módulo de Conciliação Bancária & Fechamento Contábil)

O módulo **PaxFlow FinRecon™** (rota `#conciliacao`, restrito a Gestores e equipe Financeira) centraliza a governança e o cruzamento financeiro de extratos bancários com as vendas e recebimentos do sistema:

1. **Importação Universal de Extratos (OFX e CSV)**:
   - Suporte nativo para arquivos `.ofx` e `.csv` dos principais bancos brasileiros (Itaú, Bradesco, Santander, Banco Inter, Nubank, Banco do Brasil, C6 Bank e Caixa).
   - Zona de dropzone com drag-and-drop, extração imediata das movimentações, prévia com resumo de créditos/débitos e gravação em lote.
   - Arquivamento automático do arquivo original no bucket `extratos-bancarios` do Supabase Storage.

2. **Motor de Casamento Inteligente (Smart Matching™)**:
   - Algoritmo heurístico de pontuação (0 a 100 pontos) que compara as entradas bancárias com os recebimentos pendentes (`loc_pagamentos`):
     - **Valor Exato (+60 pts)** ou **Variação de Taxa de Gateway <= 5% (+40 pts)**.
     - **Proximidade de Data**: mesmo dia (+30 pts), ±1 dia (+25 pts) ou ±3 dias (+15 pts).
     - **Correspondência Textual**: código do localizador (LOC) (+25 pts) ou primeiro nome do passageiro (+15 pts).
   - Apresenta card com sugestões automáticas de alta confiança para **Conciliação em 1-Clique**.

3. **Conciliação Flexível (1:1 e 1:N) & Absorção de Taxas**:
   - **1:1**: Um lançamento bancário liquidando um recebimento de venda.
   - **1:N**: Um único crédito bancário liquidando múltiplos recebimentos (ex: lote de cartão ou TED agrupada).
   - **Absorção Automática de Taxas**: Checkbox inteligente para registrar a diferença de centavos ou percentuais como taxa de gateway/adquirente, sem gerar pendência residual.

4. **Justificativa de Lançamentos Não Operacionais**:
   - Classificação rápida de entradas e saídas que não pertencem a vendas de viagens (Aportes de Capital, Rendimentos de Aplicação, Transferências Entre Contas, Empréstimos e Estornos de Fornecedor), integrando-os ao saldo resolvido.

5. **Fechamento de Competência Contábil (`🔒 Fechar Mês`)**:
   - Trancamento de competências mensais (`YYYY-MM`) com consolidação de valores conciliados e observações de auditoria, protegendo os dados históricos contra edições indevidas.

6. **Exportação Gerencial em Planilha**:
   - Exportação em formato CSV padronizado (UTF-8 com BOM) para abertura perfeita no Microsoft Excel.

7. **Arquitetura Zero-Break (Resiliência a Schema Drift)**:
   - Tratamento nativo para ausência de tabelas ou colunas (`42P01` / `42703`), garantindo que a aplicação continue operando sem quebras ou travamentos mesmo antes de rodar migrações DDL no banco.

### 3.37 Design System de Tabelas, Proporções e Padronização Visual PaxFlow

Com o objetivo de eliminar assimetrias, quebras desproporcionais de linha e elementos amontoados, o PaxFlow segue um padrão de densidade visual e proporções consistentes em todos os módulos:

1. **Padrão de Tabelas e Grids**:
   - **Cabeçalhos**: `text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3.5 border-b`.
   - **Células de Dados**: `py-2.5 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap`.
   - **Linhas com Divisores Suaves**: `divide-y divide-slate-100 dark:divide-slate-800`.
   - **Valores Monetários e Prazos**: formatação com `font-mono tabular-nums`.

2. **Alinhamento de Ações e Botões**:
   - Ações em tabelas agrupadas com `<div class="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">`.
   - Botões de ação em linha: `h-7 px-2.5` ou `h-8 px-3` para ações de texto, e `w-7 h-7 inline-flex items-center justify-center rounded-lg` para botões com ícones.
   - Modais de criação e edição com paleta de emojis rápidos compacta em grade equilibrada e preview instantâneo do item ativo.

### 3.38 Painel de Filtros Avançados Combináveis, Resumo Financeiro & Exportação CSV de Viagens

Para atender operações de agências de alto volume e demandas complexas de cruzamento operacional e contábil, a tela de Viagens (`Dashboard.ts`) conta com um sistema de **Filtros Avançados Combináveis Reativos** integrado a um painel de métricas financeiras e exportação para planilhas:

1. **Botão e Painel Expansível `🎛️ Avançado (N)`**:
   - Substitui o filtro simples de data por um botão dinâmico com badge indicativo da quantidade de critérios ativos em tempo real.
   - Painel colapsável moderno com background card suave, bordas translúcidas e transição fluida.

2. **Critérios Combinatórios Disponíveis**:
   - **Produtos / Serviços (Regra E vs OU)**: Multi-select em pills dinâmicos (Aéreo, Hotel, Seguro, Carro, Transfer, etc.). Suporte a alternância entre `Contém TODOS [E]` (interseção: a viagem precisa conter todos os produtos selecionados) e `Contém QUALQUER [OU]` (união: a viagem precisa conter pelo menos um dos produtos).
   - **Consultores / Usuários Responsáveis**: Multi-select em pills interativos com avatar/iniciais circulares coloridas e nome do consultor, permitindo filtrar viagens de um ou múltiplos consultores simultaneamente para fechamentos e auditorias de equipes.
   - **Formas de Recebimento (Meios de Pagamento)**: Pills com as formas cadastradas na agência (*Pix 🪙, Cartão de Crédito 💳, Boleto 📄, Faturado 💼, Dinheiro 💵, TED 🏦*), cruzando com os recebimentos registrados em `loc_pagamentos`.
   - **Origem do Lead / Canais de Captação**: Pills com ícones e nomes das origens ativas (*WhatsApp 📱, Instagram 📸, Indicação 🤝, Google 🔍, Site 🌐, Loja 🏬, etc.*), filtrando pela origem do cliente titular da viagem.
   - **Quantidade de Passageiros (PAX)**: Pills de faixas de capacidade operacional (*`👤 1 PAX`*, *`👥 2 PAX`*, *`👨‍👩‍👧 3 a 5 PAX`*, *`🚌 6+ PAX`*).
   - **Tags / Classificações**: Pills multi-select com as tags do cliente e da viagem (*VIP, Corporativo, Família, Lua de Mel, Resort, Aventura, etc.*).
   - **Período e Atalho Rápido Mês/Ano**: Seletor rápido de competência (`YYYY-MM`, ex: `2026-02`) com aplicação instantânea, além de campos de Data Inicial e Data Final com escolha do tipo de data (`Data Criação`, `Data Financeiro`, `Data Ida`, `Data Volta`).
   - **Destinos Multi-Select**: Pills selecionáveis de todos os destinos cadastrados no sistema.
   - **Fornecedor / Cia Aérea / Consolidadora**: Campo de busca textual com auto-filtro instantâneo sobre fornecedores dos produtos das viagens.
   - **Faixas Financeiras (R$)**: Sliders/inputs numéricos para `Valor Venda Mínimo/Máximo` e `Rentabilidade Mínima/Máxima`.
   - **Vouchers / Anexos**: Filtro tri-state (`Todos`, `Com Vouchers / Anexos`, `Sem Vouchers / Anexos`).
   - **Conferência & Processo**: Filtros para conferência de processo (`Todos`, `Conferidos`, `Pendentes`) e conferência financeira de LOCs.
   - **Alertas Operacionais & Risco**: Filtro para viagens com alertas de SLA ativos ou classificação PaxFlow Risk Score™ (Crítico, Atenção, Saudável).

3. **Barra de Resumo Financeiro em Tempo Real**:
   - Localizada acima do grid de viagens, atualiza-se instantaneamente a cada tecla ou seleção:
     - **Vendas Totais**: Soma dos valores de venda do conjunto filtrado.
     - **Rentabilidade Acumulada**: Lucro bruto/comissões apuradas no recorte.
     - **Ticket Médio**: Média monetária por viagem ativa no filtro.
     - **Total de Viagens**: Contagem de passageiros/dossiês correspondentes.

4. **Barra de Chips de Filtros Ativos**:
   - Chips visuais no topo do grid para cada critério configurado com botão `✕` para remoção pontual sem necessidade de reabrir o painel.
   - Botão `Limpar Todos` para reset total instantâneo dos filtros.

5. **Exportação Formatada para Excel (CSV Brasil)**:
   - Botão `📥 Exportar CSV` no cabeçalho operacional.
   - Gera arquivo `.csv` codificado em UTF-8 com BOM (`\uFEFF`) e delimitador `;` (ponto e vírgula).
   - Formatação monetária com vírgula decimal brasileira (`R$ 2.500,00` -> `2500,00`) e datas `DD/MM/AAAA`.

---

## 4. Diferenciais Competitivos

| Característica | PaxFlow | CRM Genérico | Planilha |
| --- | --- | --- | --- |
| SLA de passaporte | Nativo, com alertas visuais | Não possui | Manual |
| Pipeline de orçamentos com lembretes | Integrado com Inbox | Requer configuração | Frágil |
| Kanban de viagens com produtos | Por cliente/viagem | Genérico | Inexistente |
| Upload e armazenamento por cliente | Automático via Supabase Storage | Não integrado | Manual |
| Reembolsos com cronômetro | Tempo real | Não possui | Planilha separada |
| Modo offline | Nativo (localStorage) | Raramente | Sempre offline |
| Preço | Competitivo SaaS Brasil | USD, caro | Baixo custo, alto risco |
| Idioma | PT-BR nativo | Tradução parcial | — |

---

## 5. Arquitetura Tecnológica

### Stack

| Camada | Tecnologia | Benefício para o Cliente |
| --- | --- | --- |
| Frontend | TypeScript + Vite | Aplicação rápida, SPA sem recarregamento |
| Estilo | Tailwind CSS 3 | Design moderno, responsivo, tema claro/escuro |
| Backend/Database | Supabase (PostgreSQL) | Escalável, seguro, sem servidor para gerenciar |
| Autenticação | Supabase Auth | Login seguro por e-mail/senha com recuperação |
| Realtime | Supabase Realtime (WebSocket) | Colaboração em tempo real entre consultores |
| Armazenamento & Upload | Supabase Storage + Canvas API | Documentos seguros com compactação inteligente automática |
| Drag-and-drop | SortableJS | UX intuitiva nos Kanbans |
| Testes Automatizados | Vitest + MSW | Testes subcutâneos ultra-rápidos (~1s) com zero consumo indevido de tokens |
| Hospedagem | Qualquer CDN (Cloudflare Pages, Vercel, Netlify) | Deploy em minutos |

### 5.1 Engenharia de Testes Subcutâneos (Regra Formal)

O PaxFlow adota testes **subcutâneos** rigorosos para garantir integridade contínua e economia de tokens:

- **Tecnologia**: Vitest com MSW e mocks puros do banco de dados (Supabase).
- **Zero DOM**: Não são executados testes de renderização de interface visual (DOM), concentrando a validação nas regras de negócio, persistência, cálculos de SLA, filtragens e fluxos de dados.
- **Estrutura Padronizada**: Testes organizados nos blocos `// Setup`, `// Action` e `// Assert`.
- **Regressão Zero & Execução Automática**: Toda alteração em componentes, regras de negócio ou serviços dispara obrigatoriamente a execução dos testes subcutâneos correspondentes via Vitest antes de ser considerada concluída. Nenhuma alteração é entregue sem validação automatizada prévia.
- **Cobertura Integral (14 Módulos)**: 100% dos serviços de lógica de negócio e motores analíticos cobertos (`inbox`, `escala`, `orcamentos`, `balcao`, `riskScore`, `metas`, `gamification`, `nextTrip`, `comments`, `upsell`, `pushNotification`, `csvImporter`, `googleDrive` e `versionChecker`), totalizando 90 testes subcutâneos de alta confiabilidade (~5s) cobrindo casos de borda, resiliência de schema do Supabase e build 100% validado.

### Por que Supabase?

- **Substitui Firebase** com código aberto e PostgreSQL real
- **Modelo Agência Colaborativa & RLS (Row Level Security)**: permite leitura e edição colaborativa de registros no PostgreSQL entre usuários autenticados da agência, eliminando perdas de dados em joins relacionais. O controle de isolamento de privacidade por consultor é gerenciado na camada de aplicação (Software-Level RBAC), mantendo a navegação local privada e a Pesquisa Global (Modo Co-Piloto) totalmente funcional para atendimento colaborativo de balcão.
- **Realtime nativo**: alterações refletem instantaneamente em todos os usuários
- **Storage Buckets**: para armazenamento seguro de arquivos e imagens com suporte a links assinados seguros
- **Custo previsível**: plano gratuito generoso; plano pago apenas quando escalar

---

## 6. Segurança e Conformidade

- **Autenticação**: Supabase Auth com hash bcrypt, sessões JWT, recuperação de senha
- **Autorização & Governança**: controle por perfil (admin vs consultor) em toda a aplicação
- **Modelo Agência Colaborativa & RLS (Row Level Security)**: políticas no PostgreSQL garantem acesso seguro para usuários autenticados da agência. A privacidade individual de cada consultor é gerenciada no nível de software (filtro por consultor por padrão nas telas locais), enquanto a Pesquisa Global Co-Piloto atua no suporte colaborativo em toda a base.
- **Dados em trânsito**: todas as comunicações via HTTPS
- **Armazenamento Seguro**: Supabase Storage com RLS restrito. Documentos e imagens do passageiro só podem ser acessados via links assinados (Signed URLs) expiráveis gerados sob demanda
- **Modo offline**: dados sensíveis nunca saem do navegador sem criptografia; o fallback localStorage é temporário
- **Senhas**: mínimo 6 caracteres, armazenadas com hash no Supabase Auth

---

## 7. Integrações

### Disponíveis

| Integração | Tipo | Descrição |
| --- | --- | --- |
| Supabase Storage | Unidirecional | Armazenamento de passaportes, comprovantes e propostas. Os arquivos de imagem são comprimidos no client-side para economia de cota e performance. |
| Supabase Auth | Autenticação | Login, recuperação de senha, gerenciamento de consultores. |
| Supabase Realtime | WebSocket | Sincronização ao vivo de orçamentos, viagens e Cockpit Kanban. |

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

---

## 9. Fluxo de Implantação para Novos Clientes

### Fase 1: Descoberta (1 dia)

1. Reunião de levantamento de requisitos
2. Mapeamento de processos atuais (planilhas, ferramentas usadas)
3. Definição de SLAs e parâmetros da agência
4. Identificação de integrações necessárias

### Fase 2: Setup (2-3 dias)

1. Criação do projeto Supabase (ou uso da infra PaxFlow)
2. Execução do script de modelagem do banco de dados (utilizando as DDLs e políticas RLS fornecidas no arquivo [schema.sql](../supabase/schema.sql)), seguido pela migração [add_product_detail_fields.sql](../supabase/add_product_detail_fields.sql) para suporte ao detalhamento financeiro de produtos de viagem.
3. Configuração de autenticação e criação dos consultores no Supabase Auth
4. Criação dos Buckets de Storage e respectivas políticas de RLS restritas no painel do Supabase
5. Deploy do frontend (Cloudflare Pages ou similar)
6. _(Opcional)_ Limpeza resiliente de dados transacionais e de teste em lote utilizando o script [clean_db.sql](../supabase/clean_db.sql) para inicialização limpa da produção.

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

Sim. A autenticação é feita por Supabase Auth (bcrypt + JWT). No banco de dados, o PaxFlow opera sob o Modelo Agência Colaborativa com RLS flexível para integridade no PostgreSQL e isolamento de privacidade gerenciado no nível de software (Software-Level RBAC). Documentos e fotos são armazenados no Supabase Storage e acessados de forma isolada através de links assinados (Signed URLs) expiráveis.

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
