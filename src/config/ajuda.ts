export interface HelpItem {
  id: string;
  modulo: string;
  label: string;
  description: string;
  details?: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: string;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'onboarding', title: 'Como Começar (Onboarding)', icon: '🚀' },
  { id: 'processos', title: 'Fluxos de Trabalho & SLAs', icon: '🔄' },
  { id: 'escala', title: 'Escala de Funcionários', icon: '📅' },
  { id: 'geral', title: 'Conceitos Gerais & Gamificação', icon: '💡' },
  { id: 'cadastros', title: 'Cadastros & Módulos', icon: '📋' },
  { id: 'dashboard', title: 'Dashboard & Metas', icon: '🏆' },
  { id: 'viagens', title: 'Gestão de Viagens', icon: '✈️' },
  { id: 'orcamentos', title: 'Orçamentos & CRM', icon: '📄' },
  { id: 'reembolsos', title: 'Reembolsos & Financeiro', icon: '💰' },
  { id: 'conciliacao', title: 'Conciliação Bancária (FinRecon™)', icon: '🪙' },
  { id: 'clientes', title: 'Clientes & Relatórios', icon: '👥' },
  { id: 'copiloto', title: 'Co-piloto de IA & Governança', icon: '🤖' },
  { id: 'realtime', title: 'Mensageria & Tempo Real', icon: '⚡' }
];

export const HELP_ITEMS: HelpItem[] = [
  // ==================== 0. Guia de Onboarding / Como Começar ====================
  {
    id: 'onboarding-passo-a-passo',
    modulo: 'onboarding',
    label: 'Passo a Passo de Boas-Vindas para Novos Consultores',
    description: 'Um guia rápido para você configurar seu perfil e começar a operar no PaxFlow.',
    details: 'Seja bem-vindo ao PaxFlow! Se você está migrando de outra ferramenta, siga estes passos iniciais:\n\n1. **Ajuste seu Perfil**: No rodapé do menu lateral, clique no seu nome. Selecione um avatar ou envie sua foto, confira seus dados e atualize sua senha.\n2. **Explore a Caixa de Entrada**: Vá no menu "Inbox" para ver suas tarefas e notificações pendentes. É aqui que você gerencia seu dia a dia.\n3. **Entenda o Dashboard**: Veja suas metas ativas e faixas de premiação na página inicial.\n4. **Cadastre seu primeiro Cliente**: Vá em "Clientes" e crie uma ficha de teste para se familiarizar com os campos.'
  },
  {
    id: 'primeiro-orcamento',
    modulo: 'onboarding',
    label: 'Criando e Conduzindo seu Primeiro Orçamento',
    description: 'Como cadastrar um lead, pesquisar tarifas e movimentar a negociação no Kanban.',
    details: 'Para iniciar uma nova prospecção de vendas:\n\n1. Acesse o menu **Orçamentos** e clique no botão de criação (+ Novo Orçamento).\n2. **Selecione o Cliente**: Comece a digitar o nome. Se ele já existe, o sistema autocompleta. Caso contrário, você pode cadastrá-lo na hora.\n3. **Defina a Temperatura**: Classifique o lead (❄️ Frio, ⚡ Normal, 🔥 Quente) para priorizar seu atendimento.\n4. **Adicione as Notas**: Registre o que o cliente busca (ex: "hotel 5 estrelas em Orlando, viagem em família").\n5. **Movimentação do Card**: Use os botões de ação ("Iniciar" -> "Enviar Proposta" -> "Aceitar/Desistir") para mover o card pelo funil. O PaxFlow não usa drag-and-drop para evitar erros acidentais.'
  },
  {
    id: 'fechar-primeira-venda',
    modulo: 'onboarding',
    label: 'Fechando uma Venda e Criando a Viagem',
    description: 'Como formalizar a aprovação do orçamento e gerar o registro operacional da viagem.',
    details: 'Quando o cliente aprova uma proposta:\n\n1. No card do orçamento (estágio "Aguardando"), clique em **Aceitar / Vender**.\n2. **Dados Cadastrais Obrigatórios**: O PaxFlow exige que o cliente tenha CPF ou CNPJ cadastrado. Para pessoas físicas (CPF), a Data de Nascimento é obrigatória; já para pessoas jurídicas (CNPJ), o campo torna-se opcional. Se faltar algum dado, um modal abrirá para você preencher imediatamente.\n3. **Geração Automática**: Assim que você confirma, o orçamento é finalizado e o sistema cria automaticamente uma **Viagem** correspondente no menu operacional, importando os dados e notas da negociação. Você não precisa redigitar nada!'
  },
  {
    id: 'dicas-atalhos',
    modulo: 'onboarding',
    label: 'Dicas Práticas de Produtividade e Navegação',
    description: 'Pequenos truques para otimizar sua rotina operacional e ganhar tempo.',
    details: 'Aproveite estes recursos para navegar mais rápido:\n\n- **Teclado**: Use a tecla `Esc` para fechar rapidamente qualquer modal ou visualizador de documentos no sistema.\n- **Links Rápidos (Contacts)**: Na visualização de orçamentos e viagens, clique nos botões de contato ao lado do nome do cliente para abrir diretamente o WhatsApp Web com o número dele pré-preenchido, ou iniciar um e-mail.\n- **Notificações Integradas**: Se você enviar um e-mail interno para um colega, pode marcar a caixa "Agendar Lembrete" para inserir automaticamente uma tarefa no calendário dele.'
  },
  {
    id: 'busca-global-header',
    modulo: 'onboarding',
    label: 'Busca Global Rápida & Modo Balcão (Atalho por Código, Nome, CPF, LOC e Datas)',
    description: 'Como localizar qualquer registro do sistema instantaneamente pelo cabeçalho superior e operar no modo balcão.',
    details: 'No topo da barra de navegação, o PaxFlow fornece um campo de busca unificado que lê todo o banco de dados em milissegundos:\n\n- **Busca por Código Sequencial**: Digite `CLI-0012`, `ORC-0402`, `VIA-0118` ou `RBS-0091` para ir direto para a ficha correspondente.\n- **Busca por Localizador (LOC)**: Digite o código da reserva da cia aérea ou fornecedor (ex: `PAX-8840` ou `590285`) para filtrar as viagens.\n- **Busca por Dados do Cliente**: Digite o nome, e-mail, telefone ou CPF do cliente. O PaxFlow agrupa e exibe os resultados organizados em formato compacto (acordeão) por cliente.\n- **Agrupamento Inteligente & Acordeão**: Quando a busca retorna múltiplos clientes, cada card inicia colapsado com contadores de viagens e orçamentos para economizar espaço. Basta clicar no nome do cliente para abrir ou utilizar o botão superior `[Expandir Todos / Recolher Todos]`.\n- **Desambiguação por Datas**: Cada viagem exibe o período formatado (`🗓️ 15/10/2026 a 25/10/2026` ou `🗓️ Ida: 15/10/2026`) e cada orçamento exibe a data de criação (`📅 12/09/2026`), permitindo identificar com precisão o registro correto.\n- **Atendimento Instantâneo 🤝**: Clicar no botão "Atender 🤝" abre imediatamente o registro no dashboard/orçamentos e notifica o consultor titular no Inbox.'
  },

  // ==================== 1. Fluxos de Trabalho & SLAs ====================
  {
    id: 'conferencia-loc',
    modulo: 'processos',
    label: 'Processo de Quitação, Conferência e Cópia Rápida de LOC',
    description: 'Como funciona a gestão, cópia operacional e validação financeira de reservas por Localizador.',
    details: 'Para garantir a agilidade operacional e a segurança financeira das vendas, o PaxFlow estrutura os serviços por Localizador (LOC):\n\n1. **Cópia Rápida em 1-Clique (📋)**: Todos os códigos de reserva (LOC) exibidos nos detalhes da viagem (no cabeçalho geral, nos grupos de produtos, nos cards de serviços e no formulário de edição) possuem botões de cópia instantânea. Um clique copia o código diretamente para a área de transferência do computador ou celular, com confirmação visual e toast.\n2. **Detalhamento Financeiro**: Cada produto ou serviço (voo, hotel, etc.) inserido em uma viagem exige que seu valor total de venda seja quitado por meio de formas de recebimento cadastradas (dinheiro, pix, cartão, etc.). O sistema valida se a soma dos pagamentos fecha exatamente com o total do produto.\n3. **Conferência Financeira**: Uma vez que os pagamentos estejam corretos, um **administrador** pode clicar em `Conferir` no cabeçalho do LOC.\n4. **Bloqueio de Segurança**: A conferência do LOC trava todas as edições, adições, exclusões e modificações financeiras daquele produto específico. Apenas a inserção de notas operacionais permanece aberta.'
  },
  {
    id: 'conferencia-viagem',
    modulo: 'processos',
    label: 'Conferência Geral de Processo de Viagem',
    description: 'O fechamento operacional do dossiê da viagem pelo administrador.',
    details: 'Quando todas as reservas e quitações financeiras de uma viagem estão concluídas, realiza-se a conferência do processo:\n\n1. O administrador aciona o botão `Conferir Processo` no topo direito da viagem.\n2. Isso bloqueia a edição dos campos cadastrais gerais (passageiro, destino, datas, valor, observações e exclusão da viagem).\n3. **Itens que permanecem editáveis**: O status de trânsito (ex: mudar de Pós-Venda para Pré-Embarque), uploads e downloads de documentos (vouchers), histórico de comentários e produtos pertencentes a LOCs que ainda não foram conferidos financeiramente.'
  },
  {
    id: 'alerta-sla-funcionamento',
    modulo: 'processos',
    label: 'Como funcionam os SLAs e Alertas Operacionais',
    description: 'Condições de disparo de alertas no Inbox, calendário e listas.',
    details: 'O PaxFlow monitora a operação 24/7 e sinaliza pendências com base nas configurações da agência:\n\n- **Validade de Passaporte (🚨 Crítico)**: Dispara um alerta no Inbox com 180 dias de antecedência do vencimento do documento do cliente.\n- **SLA de Reembolso (⚠️ Atenção)**: Notifica quando uma solicitação de reembolso excede o prazo limite de dias configurado (Data da Solicitação + SLA da Agência).\n- **Pré-Embarque (⚠️ Atenção)**: Viagens no status "Fechado" ou "Pós-Venda" cuja data de ida seja menor que os dias configurados para o pré-embarque (ex: < 7 dias).\n- **Pós-Viagem (🚨 Crítico)**: Viagens finalizadas onde o consultor não registrou contato de pós-viagem há mais de X dias.'
  },
  {
    id: 'fluxo-reembolso-completo',
    modulo: 'processos',
    label: 'Fluxo de Cancelamento e Solicitação de Reembolso',
    description: 'Passo a passo operacional quando um cliente cancela um serviço.',
    details: 'Ao receber uma solicitação de cancelamento:\n\n1. Acesse a Viagem do cliente, clique em editar e, na aba de produtos, selecione o produto cancelado.\n2. Clique em **Solicitar Reembolso**. O sistema abrirá um formulário específico puxando os dados do produto automaticamente.\n3. Preencha as multas e taxas de retenção cobradas pelo fornecedor.\n4. O status da viagem é movido automaticamente para **Reembolso Solicitado**, habilitando o cronômetro de SLA operacional.\n5. O processo passa a aparecer no menu **Reembolsos**, onde o financeiro acompanha o status (Aguardando Fornecedor, Em Análise, Aprovado, Pago) até o repasse final ao cliente.'
  },
  {
    id: 'calendario-delegacao',
    modulo: 'processos',
    label: 'Uso do Calendário e Delegação de Lembretes',
    description: 'Como funciona o calendário de alertas e o controle de tarefas delegadas.',
    details: 'O Calendário do Inbox oferece três visões (Mês, Semana, Agenda) e categoriza os alertas graficamente:\n\n- **Verde**: Lembretes e atividades criadas para você mesmo.\n- **Laranja/Âmbar**: Lembretes delegados a você por colegas de equipe.\n- **Azul**: Lembretes que você criou e delegou para outros consultores.\n\n**Acompanhamento Reativo**: Se você delegar uma tarefa a um consultor e ele a concluir (arquivar), o evento aparecerá no seu calendário com estilo riscado (`line-through`) e 50% de opacidade, indicando visualmente que a pendência foi resolvida.'
  },

  {
    id: 'paxflow-risk-score',
    modulo: 'processos',
    label: 'PaxFlow Risk Score™ (Diagnóstico Inteligente de Risco Operacional)',
    description: 'Como funciona o cálculo de 0 a 100 de Saúde Operacional e a prevenção de erros em viagens.',
    details: 'O PaxFlow Risk Score™ é o algoritmo de inteligência preditiva que monitora 24/7 a saúde operacional de todas as viagens cadastradas na agência.\n\n1. **Pontuação de Saúde (0 a 100)**: Toda viagem inicia com score 100 (Saúde Total). Conforme o sistema detecta inconsistências operacionais na janela de carência pré-embarque, aplica penalidades no score.\n2. **Os 5 Pilares Auditados**:\n   - **Documental & Vistos (Peso 30%)**: Audita se o passaporte do cliente foi cadastrado e se possui mais de 180 dias de validade a partir da data de retorno da viagem internacional.\n   - **Vouchers & Fornecedores (Peso 25%)**: Audita se os vouchers dos fornecedores (voos, hotéis, traslados) foram anexados e se há LOCs preenchidos.\n   - **Governança & Financeiro (Peso 20%)**: Audita a conferência operacional de processos e o contato pré-embarque de voos a menos de 24 horas.\n   - **Cobertura de Roteiro (Peso 15%)**: Audita gaps de hospedagem ou seguro viagem internacional obrigatório.\n   - **Qualidade Cadastral (Peso 10%)**: Verifica se telefone, e-mail e documento do passageiro estão devidamente preenchidos.\n3. **Isenções Inteligentes**: Viagens nacionais não são penalizadas por vistos ou passaportes ausentes, e passeios bate-volta são isentos de exigência de vouchers de hospedagem.\n4. **Diagnóstico Interativo (Drawer de Risco)**: Clicar no badge 🛡️ (presente no grid do Dashboard e no modal Gerenciar Viagem) abre o painel lateral com o diagnóstico detalhado e botões de resolução rápida em 1-Clique.\n5. **Configurações Globais**: Administradores podem ativar ou desativar o recurso e personalizar a janela de carência (dias antes do embarque) e limite crítico no menu Configurações -> Automações.'
  },
  {
    id: 'relatorio-embarque-contato',
    modulo: 'processos',
    label: 'Relatório de Embarque e Controle de Contato Pré-Embarque',
    description: 'Como auditar embarques, trechos de voo e marcar o contato pré-embarque realizado.',
    details: 'O Relatório de Embarque (menu Relatórios -> Operações & SLAs -> Relatório de Embarque) consolida todos os eventos de partida de passageiros no período selecionado:\n\n1. **Eventos Rastreados e Consolidação Inteligente**: Se a viagem possuir produtos aéreos com trechos cadastrados, o sistema prioriza e lista exclusivamente os trechos de voo (com Cia aérea, rota e localizador). Se não possuir produtos aéreos (ex: reservas apenas de hotel ou rodoviário), lista as datas gerais de Ida e Volta da viagem, eliminando duplicações.\n2. **Coluna CONTATO**: Permite ao consultor ou atendente de plantão alternar em 1-clique o status entre `⏳ Pendente` e `✅ Feito`.\n3. **Auditoria em Tempo Real**: Ao passar o cursor sobre o botão `Feito`, um aviso suspenso (tooltip) exibe o nome do consultor responsável e a data/hora exata em que o contato foi confirmado.\n4. **Filtro de Contatos**: O cabeçalho da tabela permite filtrar instantaneamente por "Todos os Embarques", "✅ Contato Feito" ou "⏳ Contato Pendente".\n5. **Persistência Confiável**: Todas as marcações são salvas diretamente no banco de dados central (Supabase) por trecho individual, ficando visíveis em tempo real para toda a equipe.'
  },
  {
    id: 'risk-score-pre-embarque-24h',
    modulo: 'processos',
    label: 'Alerta Crítico de Embarque < 24h no Risk Score',
    description: 'Regra de penalidade severa para viagens próximas sem confirmação de contato pré-embarque.',
    details: 'A integridade da experiência do passageiro exige que todo cliente viaje com informações reconfirmadas (horários, terminais e vouchers):\n\n1. **A Janela Crítica de 24 Horas**: Quando faltam menos de 24 horas para qualquer embarque (ida principal, volta ou trecho de voo), o PaxFlow audita se o contato correspondente foi marcado como `Feito`.\n2. **Penalidade Crítica (-25 Pontos)**: Caso o contato esteja pendente, o PaxFlow Risk Score™ deduz 25 pontos no Pilar de Governança Operacional, disparando alerta visual de urgência no Dashboard.\n3. **Resolução Imediata**: Assim que o consultor realiza o contato (via WhatsApp ou Digisac) e marca como `Feito`, a pendência é instantaneamente resolvida e os 25 pontos são recuperados na pontuação da viagem.'
  },
  {
    id: 'faq-contatos-pre-embarque',
    modulo: 'processos',
    label: 'Perguntas Frequentes (FAQ): Contatos e Plantão de Embarques',
    description: 'Respostas para as principais dúvidas de consultores e gestores sobre contatos e embarques.',
    details: 'Respostas rápidas para evitar chamados e alinhar o time operacional:\n\n- **Por que o status da viagem não mudou sozinho para "Pré-Embarque" ao marcar o contato como Feito?**\n  O status da viagem controla o ciclo de vida comercial e etapas de atendimento da agência. Marcar o contato confirma a comunicação operacional sem interferir no controle manual ou nas automações de transição de fase da viagem.\n\n- **Cliquei em "Feito" por engano. Como desfaço?**\n  Basta clicar novamente sobre o botão `✅ Feito` no Relatório de Embarque. O sistema alterna de volta para `⏳ Pendente` e atualiza o banco de dados imediatamente.\n\n- **Se a viagem tiver múltiplos trechos (ida, volta e conexão), como funciona?**\n  Cada trecho possui seu próprio botão e registro independente no Relatório de Embarque. Na tela de Gerenciar Viagem, o marcador inteligente foca no próximo trecho cronológico pendente.\n\n- **Qualquer consultor pode marcar o contato de outro colega?**\n  Sim! Em situações de plantão, finais de semana ou pausas de almoço, qualquer consultor logado pode confirmar o contato, e o nome de quem realizou a marcação ficará registrado na auditoria.\n\n- **A marcação depende do envio pelo Digisac?**\n  Não. O sistema não exige nenhuma validação externa ou webhook. O consultor tem total autonomia para marcar manualmente como feito quer tenha falado por WhatsApp, ligação telefônica ou mensagem rápida.'
  },

  // ==================== 2. Conceitos Gerais ====================
  {
    id: 'nps',
    modulo: 'geral',
    label: 'NPS (Net Promoter Score)',
    description: 'Métrica padrão de satisfação e fidelidade do cliente pós-viagem.',
    details: 'Após o retorno da viagem, os clientes respondem a uma pesquisa de nota de 0 a 10. As respostas são classificadas em:\n\n- **Promotores (9 ou 10)**: Clientes extremamente satisfeitos que recomendam a agência.\n- **Neutros (7 ou 8)**: Clientes satisfeitos, mas não entusiasmados.\n- **Detratores (0 a 6)**: Clientes insatisfeitos.\n\nO índice é calculado subtraindo o percentual de detratores do percentual de promotores (varia de -100 a +100).'
  },
  {
    id: 'xp-gamificacao',
    modulo: 'geral',
    label: 'XP, Sistema de Níveis e Pontuação Operacional',
    description: 'Como funciona o acúmulo de pontos de experiência (XP) nas rotinas diárias da agência.',
    details: 'O PaxFlow recompensa a produtividade e a qualidade dos dados inseridos pelos consultores. Cada ação executada no sistema concede pontos de experiência (XP):\n\n- **👤 Ficha de Cliente Completa (Nome, E-mail, Telefone e CPF/CNPJ)**: +30 XP\n- **🛂 Passaporte Cadastrado com SLA Válido**: +50 XP\n- **📄 Orçamento Convertido em Venda (Status "Aceito")**: +100 XP\n- **⭐ Venda de Alta Performance (Primeira Classe > R$ 20.000)**: +200 XP\n- **💸 Reembolso Concluído sem estouro de SLA**: +75 XP\n- **🎯 Conclusão de Campanhas de Metas**: Bônus extra de +500 a +2.000 XP por meta batida.\n- **👑 Coleção de Medalhas (Badges)**: Até 30 medalhas exclusivas conquistadas por marcos da carreira.'
  },
  {
    id: 'patentes-evolucao-mochileiro',
    modulo: 'geral',
    label: 'Evolução de Patentes: De Mochileiro a Embaixador do Turismo',
    description: 'Níveis necessários e a escala de patentes da carreira no PaxFlow.',
    details: 'Todos os novos consultores iniciam na patente de **Mochileiro** e sobem na hierarquia à medida que acumulam XP e sobem de nível:\n\n1. 🎒 **Mochileiro** (Níveis 1 a 4 | 0 a 2.499 XP acumulados):\n   - Nível 1: 0 a 249 XP\n   - Nível 2: 250 a 749 XP (+500 XP para evoluir)\n   - Nível 3: 750 a 1.499 XP (+750 XP para evoluir)\n   - Nível 4: 1.500 a 2.499 XP (+1.000 XP para evoluir)\n\n2. 🗺️ **Explorador** (Níveis 5 a 9 | 2.500 a 7.499 XP acumulados):\n   - Conquistada ao atingir o Nível 5. Exige 1.000 XP por cada nível subsequente.\n\n3. 🧭 **Navegador** (Níveis 10 a 14 | 7.500 a 12.499 XP acumulados):\n   - Patente atribuída aos consultores de alta consistência operacional.\n\n4. 🌟 **Guia de Elite** (Níveis 15 a 19 | 12.500 a 17.499 XP acumulados):\n   - Reservada para consultores com grande bagagem de vendas e qualidade cadastral.\n\n5. 👑 **Embaixador do Turismo** (Nível 20+ | 17.500+ XP acumulados):\n   - O grau máximo de honra e senioridade no PaxFlow.'
  },
  {
    id: 'inbox-alertas',
    modulo: 'geral',
    label: 'Inbox e Alertas de Pós-Venda',
    description: 'Central de notificações e tarefas operacionais automatizadas.',
    details: 'O Inbox do PaxFlow centraliza a operação e avisa o consultor em momentos críticos do ciclo da viagem:\n\n1. Envio de vouchers antes do embarque (Pré-embarque).\n2. Verificação de validade de passaporte e SLAs de reembolso.\n3. Disparo automático de NPS pós-viagem.\n4. Atendimentos presenciais de balcão e solicitações de escala.\n5. Mensagens diretas e menções (@) entre a equipe.'
  },
  {
    id: 'inbox-filtros-leitura',
    modulo: 'geral',
    label: 'Navegação Unificada do Inbox, Filtros de Leitura e Contadores',
    description: 'Como alternar entre Lista e Calendário, usar o filtro de não lidas e entender os contadores.',
    details: 'A interface do Inbox foi projetada para produtividade máxima no gerenciamento de mensagens:\n\n- **Navegação Principal Unificada no Topo**: O alternador entre visualizações fica nas abas de topo da página: **"Lista de Mensagens"**, **"Calendário"** e **"Escala de Funcionários"**. Em celulares e tablets, essa barra possui rolagem horizontal tátil suave para alternância instantânea.\n- **Botão "Apenas Não Lidas"**: Localizado na barra de ferramentas da pasta ativa junto ao campo de busca, permite filtrar com 1 clique apenas as pendências não lidas com badge numérico em tempo real.\n- **Contador Dinâmico**: Exibe a proporção exata de mensagens filtradas no formato "Mostrando xx de yy".\n- **Persistência em Nuvem (Supabase)**: Ao abrir qualquer mensagem, solicitação de escala, atendimento de balcão ou alerta operacional, o status de lido é gravado diretamente no banco de dados, sincronizando em tempo real com todos os seus dispositivos.\n- **Badge do Menu Lateral**: O contador vermelho na sidebar (ao lado de "Inbox & Escala") reflete com exatidão as pendências não lidas ativas da sua Caixa de Entrada principal, ignorando decisões já concluídas para evitar contagens divergentes.'
  },
  {
    id: 'comentarios-mencoes',
    modulo: 'geral',
    label: 'Comentários, Anotações e Agendamento Integrado (Visual e Texto)',
    description: 'Como colaborar com colegas, registrar notas e agendar lembretes com datas inteligentes.',
    details: 'Dentro de qualquer orçamento, viagem ou produto, você pode colaborar através de anotações e agendamentos inteligentes:\n\n- **Agendamento Visual Integrado**: Clique no botão "📅 Agendar Alerta / Lembrete" abaixo da nota para abrir o painel de agendamento. O botão de ação no rodapé se ajusta dinamicamente para "Enviar Nota e Agendar".\n- **Campo de Descrição do Lembrete**: Permite descrever exatamente do que se trata o alerta (ex: "Ligar para confirmar hotel", "Cobrar feedback da proposta"). Se deixado em branco, o sistema gera automaticamente uma descrição baseada no contexto ou nota.\n- **Identificação Precisa do Passageiro**: Os lembretes são associados diretamente ao nome do passageiro titular da viagem/orçamento, garantindo identificação clara no Inbox e no Calendário.\n- **Datas Inteligentes e Flexíveis**: Você pode selecionar a data pelo calendário integrado ou digitar abreviado:\n  * Apenas o dia (ex: `27`): O sistema completa automaticamente com o mês e ano correntes.\n  * Dia e mês (ex: `27/09`): O sistema completa com o ano corrente.\n  * Data completa (ex: `27/09/2026`).\n- **Agendamento com Nota Opcional**: Se você preencher o agendador e não digitar uma mensagem na caixa de texto, o PaxFlow cria automaticamente uma nota descritiva para documentar o agendamento no histórico do item.\n- **Agendamento Automático por Texto**: Digite uma menção (`@Nome`) com a data e período no comentário (ex: `@Fernanda verificar passagens para o dia 27 tarde`) para agendar automaticamente na agenda do colega.\n- **Sincronização em Tempo Real e Badges**: O agendamento é sincronizado instantaneamente com o Inbox e a Central de Alertas/Calendário da agência, e as notas com lembrete exibem uma etiqueta destacada ("📅 Lembrete Agendado").'
  },
  {
    id: 'codigo-sequencial',
    modulo: 'geral',
    label: 'Códigos de Referência Sequenciais (CLI, ORC, VIA, RBS)',
    description: 'Códigos simplificados legíveis para rápida identificação de dados.',
    details: 'Para evitar o uso de identificadores complexos (como UUIDs), o PaxFlow atribui códigos curtos e sequenciais:\n\n- `CLI-XXXX`: Ficha de Cliente (ex: `CLI-0120`)\n- `ORC-XXXX`: Orçamento no CRM (ex: `ORC-0402`)\n- `VIA-XXXX`: Viagem/Venda Fechada (ex: `VIA-0118`)\n- `RBS-XXXX`: Processo de Reembolso (ex: `RBS-0091`)\n\nEsses códigos podem ser digitados em qualquer barra de busca global para localizar o registro instantaneamente.'
  },
  {
    id: 'rbac-seguranca',
    modulo: 'geral',
    label: 'Permissões de Acesso (RBAC - Admin vs Consultor)',
    description: 'Regras de governança sobre quem pode ler, editar e excluir informações.',
    details: 'O PaxFlow adota o Modelo Agência Colaborativa com Controle de Acesso por Software (Role-Based Access Control):\n\n- **Consultor**: Por padrão na navegação local das telas (Orçamentos, Viagens, Clientes e Reembolsos), enxerga apenas seus próprios registros. Quando precisa apoiar um colega de equipe ou atuar em regime de balcão (Modo Co-Piloto), pode utilizar a Pesquisa Global no topo (`/`) para consultar a base inteira da agência de forma ágil e segura, sem bloqueios indevidos de banco de dados (RLS flexível no PostgreSQL).\n- **Administrador**: Tem visão consolidada e completa da agência, gerencia cadastros dinâmicos, configurações de equipe, auditorias financeiras e é o único autorizado a realizar exclusões permanentes no sistema.'
  },
  {
    id: 'busca-global-header',
    modulo: 'geral',
    label: 'Caixa de Pesquisa Global (Atalho /)',
    description: 'Localização rápida em toda a base da agência e filtro direto em tela.',
    details: 'A Caixa de Pesquisa Global no topo permite:\n\n- **Modo Co-Piloto Instantâneo**: Ao digitar, abre dropdown com resultados de clientes, orçamentos e viagens de toda a agência em tempo real.\n- **Filtro Direto na Tela (Enter ou Lupa)**: Estando nas telas de **Viagens**, **Orçamentos** ou **Reembolsos**, pressionar `ENTER` ou clicar na **Lupa** aplica o filtro imediatamente na listagem/quadro abaixo, sincronizando os campos locais e fechando o dropdown suspenso.\n- **Limpeza Sincronizada (✕)**: Clicar no botão limpar restaura instantaneamente a visão completa dos dados da tela atual.'
  },
  {
    id: 'traducao-erros',
    modulo: 'geral',
    label: 'Tradução Automática de Erros do Sistema (I18n)',
    description: 'Como o PaxFlow amortece erros técnicos para torná-los legíveis.',
    details: 'Mensagens de banco de dados, falhas de autenticação do Supabase ou restrições de rede que costumam aparecer em inglês técnico são capturadas pelo interceptador global do PaxFlow e convertidas em alertas claros em português (ex: convertendo erros de integridade em alertas amigáveis).'
  },

  // ==================== 3. Dashboard & Metas ====================
  {
    id: 'tipo-calculo-meta',
    modulo: 'dashboard',
    label: 'Cálculo da Meta (Faturamento Bruto vs Rentabilidade)',
    description: 'Forma como o progresso das metas financeiras é medido (Faturamento Bruto ou Rentabilidade).',
    details: 'As campanhas de metas podem ser configuradas de duas formas:\n\n1. **Faturamento Bruto**: Soma de todos os valores totais de venda das viagens menos descontos e prejuízos.\n2. **Rentabilidade**: Soma do lucro estimado e rentabilidade real da operação (Markup + Comissões + 88% do RAV/taxa de serviço).'
  },
  {
    id: 'acumulado-equipe',
    modulo: 'dashboard',
    label: 'Acumulado da Equipe',
    description: 'A soma de todo o progresso (faturamento bruto ou rentabilidade) atingido por todos os consultores ativos.',
    details: 'É o valor consolidado de produção da agência inteira na campanha selecionada. Permite comparar o resultado coletivo atual com a última faixa de metas da agência.'
  },
  {
    id: 'faixas-premiacao',
    modulo: 'dashboard',
    label: 'Faixas de Premiação & Meta Global Loja (Opcionais)',
    description: 'Níveis de metas a serem atingidos durante a campanha comercial ou metas globais da loja.',
    details: 'As metas financeiras no PaxFlow suportam dois formatos operacionais:\n\n- **Campanhas com Faixas de Premiação**: Definem níveis progressivos de faturamento/rentabilidade (ex: Bronze, Prata, Ouro) com premiações e bônus de XP.\n- **Meta Global de Loja**: Permite cadastrar uma meta global unificada para a agência por período sem a obrigatoriedade de inserir faixas de premiação fracionadas.'
  },
  {
    id: 'weighted-pipeline',
    modulo: 'dashboard',
    label: 'Previsão de Fechamentos (Weighted Pipeline)',
    description: 'Estimativa estatística de receita com base no funil de vendas.',
    details: 'A aba de previsão de fechamento pondera os valores em negociação segundo a probabilidade estatística de conclusão de cada fase:\n\n- **Solicitado**: 15% de probabilidade de conversão.\n- **Em Andamento**: 45% de probabilidade de conversão.\n- **Aguardando**: 75% de probabilidade de conversão.\n\nIsso permite aos gestores estimar o caixa futuro real com base no volume atual de propostas.'
  },
  {
    id: 'timezone-datas',
    modulo: 'dashboard',
    label: 'Consistência de Datas e Fusos Horários (Timezones)',
    description: 'Como o PaxFlow resolve desvios de datas nos relatórios de fechamento de mês.',
    details: 'Diferente de sistemas que registram datas em UTC puro (fazendo com que vendas lançadas no início da noite caiam no faturamento do dia anterior), o PaxFlow trata strings date-only (`YYYY-MM-DD`) fixadas no fuso horário local (`T00:00:00`). Isso garante precisão absoluta no cálculo de comissões e fechamento mensal.'
  },
  {
    id: 'filtros-conferencia-popover',
    modulo: 'dashboard',
    label: 'Filtros de Conferência (Financeiro e Processo com Pills)',
    description: 'Menu popover no cabeçalho do Dashboard para auditoria e filtragem de pendências.',
    details: 'O botão `Conf.` no cabeçalho permite aos administradores auditar viagens de forma combinada e precisa:\n\n- **Financeiro (`Fin. Pendente` / `Fin. OK`)**: Filtra viagens onde os produtos ainda não estão quitados/detalhados ou que já estão 100% conciliadas.\n- **Processo (`Proc. Pendente` / `Proc. OK`)**: Filtra viagens com conferência de processo pendente ou confirmada.\n- **Atalhos Rápidos**: Botões `✨ 100% OK` e `⏳ Nenhum OK` para aplicar filtros comuns com 1 clique.\n- **Interseção Lógica**: Permite combinar múltiplos pills (ex: buscar viagens com Financeiro Pendente e Processo OK ao mesmo tempo).'
  },
  {
    id: 'chips-filtros-ativos',
    modulo: 'dashboard',
    label: 'Barra de Chips de Filtros Ativos e Limpeza Rápida',
    description: 'Visualização instantânea de todos os filtros ativos com remoção individual ou geral em 1 clique.',
    details: 'Sempre que você aplica uma busca por texto, filtro de datas, consultor, conferência ou status, uma barra de tags (chips) elegantes aparece abaixo das abas.\n\n- **Remoção Individual**: Clique no `✕` de qualquer chip para desativar apenas aquele critério sem perder os demais filtros.\n- **Limpar Todos**: O botão `Limpar Todos` restaura a visualização padrão instantaneamente.\n- **Total Transparência**: Você nunca mais terá dúvidas sobre o motivo de uma viagem não aparecer na lista.'
  },
  {
    id: 'search-highlighting',
    modulo: 'geral',
    label: 'Realce Visual de Busca (Search Highlighting)',
    description: 'Destaque em amarelo dos termos pesquisados nas listagens de Viagens, Orçamentos e Reembolsos.',
    details: 'Ao digitar qualquer termo na caixa de busca global ou nos filtros de tela, o PaxFlow realça automaticamente as correspondências encontradas com uma marcação visual destacada. Isso permite bater o olho instantaneamente no motivo pelo qual o card ou linha foi retornado, seja pelo nome do passageiro, código localizador, destino ou fornecedor.'
  },
  {
    id: 'agendamento-rapido-inbox',
    modulo: 'realtime',
    label: 'Atalhos Rápidos de Agendamento no Inbox (1-Toque)',
    description: 'Pills inteligentes para definir lembretes e tarefas no calendário sem digitação manual.',
    details: 'Ao compor uma mensagem com lembrete no Inbox, você conta com botões de 1-toque:\n\n- **⚡ Hoje 17h**: Preenche a data de hoje no turno da tarde.\n- **☀️ Amanhã 09h**: Define o próximo dia útil no turno da manhã.\n- **🗓️ Em 3 dias**: Salta automaticamente 3 dias no calendário.\n- **💼 Próx. Segunda**: Identifica a próxima segunda-feira útil para início de semana comercial.'
  },
  {
    id: 'calculadora-reativa-produtos',
    modulo: 'viagens',
    label: 'Calculadora Reativa & Barra de Status do Detalhamento Financeiro',
    description: 'Barra visual em tempo real para conferência de Tarifa, Taxas, Comissão, Markup e RAV.',
    details: 'Ao editar os valores de um produto ou serviço na viagem, a calculadora reativa atualiza instantaneamente:\n\n- **Total Distribuído vs Valor de Venda**: Comparativo automático entre o valor cobrado do cliente e o rateio de custos.\n- **Barra de Status do Detalhamento**: Exibe percentual de progresso (ex: `100% OK` em verde quando totalmente conciliado ou `⏳ 80% Detalhado` em âmbar com o saldo pendente restante).\n- **Feedback Visual no Botão Salvar**: O botão transiciona temporariamente para `✅ Salvo com Sucesso!` com fundo esmeralda para confirmar a persistência sem ambiguidades.'
  },
  {
    id: 'atalho-cadastro-cliente-venda',
    modulo: 'viagens',
    label: 'Atalho Rápido para Cadastro do Cliente no Detalhe da Venda',
    description: 'Botão integrado ao campo de passageiro para visualização e edição instantânea da ficha cadastral.',
    details: 'Ao abrir o detalhe de uma venda ou viagem, os consultores contam com o botão **👤 Ver Ficha** ao lado do seletor de cliente:\n\n- **Acesso Imediato**: Abre um modal sobreposto com todos os dados cadastrais (contato, endereço, CPF/CNPJ, passaportes com alerta de SLA de validade, preferências e observações).\n- **Edição Sem Sair da Venda**: Permite atualizar e salvar os dados do cliente diretamente no Supabase sem fechar nem perder o progresso da edição da viagem.\n- **Sincronização Automática**: Ao salvar, o nome e dados do cliente são atualizados em tempo real no formulário da venda.'
  },

  // ==================== 4. Gestão de Viagens ====================
  {
    id: 'markup',
    modulo: 'viagens',
    label: 'Markup',
    description: 'Valor de rentabilidade adicionado sobre o custo fornecido pelos parceiros.',
    details: 'O Markup representa a margem agregada diretamente ao valor de custo do produto para compor o preço final de venda ao passageiro. No PaxFlow, ele é configurado individualmente em cada produto da viagem.'
  },
  {
    id: 'data-financeiro',
    modulo: 'viagens',
    label: 'Data Financeiro',
    description: 'Data de competência para o fechamento financeiro e apuração de metas.',
    details: 'Por padrão, o PaxFlow usa a data de criação do registro para fins de relatórios. No entanto, ao preencher a "Data Financeiro", essa data específica passa a ser utilizada como referência de competência, permitindo o lançamento retroativo ou futuro de faturamentos.'
  },
  {
    id: 'comissao',
    modulo: 'viagens',
    label: 'Comissão',
    description: 'Percentual ou valor fixo recebido de fornecedores/consolidadoras parceiras.',
    details: 'A comissão representa a receita gerada a partir da intermediação de serviços (como hotéis, passagens aéreas e receptivos). Ela é somada ao cálculo da Rentabilidade de cada viagem.'
  },
  {
    id: 'rav',
    modulo: 'viagens',
    label: 'RAV (Remuneração de Agente de Viagens)',
    description: 'Taxa de serviço cobrada diretamente do cliente pela emissão ou consultoria.',
    details: 'A RAV é a taxa de emissão de passagens ou taxa de serviço cobrada do cliente. No cálculo da Rentabilidade do PaxFlow, a RAV é contabilizada com um fator de 88% para descontar taxas fiscais e administrativas padrão (ex: impostos e taxas de cartão).'
  },
  {
    id: 'pax',
    modulo: 'viagens',
    label: 'PAX (Passageiro / Passageiros)',
    description: 'Termo da aviação utilizado para designar a quantidade de passageiros da viagem.',
    details: 'PAX é a abreviação internacional para passageiros. No PaxFlow, refere-se ao número de pessoas incluídas em um orçamento ou viagem.'
  },
  {
    id: 'status-viagem',
    modulo: 'viagens',
    label: 'Status da Viagem',
    description: 'Ciclo de vida operacional de uma viagem ativa.',
    details: 'As viagens podem assumir os seguintes status:\n\n- **Agendada**: Viagem fechada e paga, com datas futuras de embarque.\n- **Em Andamento**: Passageiros atualmente no destino ou em trânsito.\n- **Concluída**: Viagem finalizada com retorno dos passageiros.\n- **Cancelada**: Contrato desfeito ou cancelamento de reserva.'
  },
  {
    id: 'detalhamento-servicos',
    modulo: 'viagens',
    label: 'Detalhamento Financeiro de Produtos e Especialização por Tipo',
    description: 'Como ratear os custos e a venda dos itens de uma viagem conforme o tipo de produto.',
    details: 'Na aba "Produtos e Serviços", ao clicar em um item cadastrado, o formulário de detalhamento se adapta automaticamente ao tipo de produto selecionado:\n\n- **Produto "RAV - 12%" / "RAV"**: Apresenta exclusivamente os campos **Venda** e **RAV**. O sistema calcula a rentabilidade líquida considerando 88% do valor da taxa.\n- **Produto "MARKUP"**: Apresenta exclusivamente os campos **Venda** e **MARKUP**. O sistema calcula a rentabilidade considerando 100% do valor do markup adicionado.\n- **Demais Produtos (Aéreo, Hotel, Carro, Seguro, etc.)**: Apresentam os campos **Venda**, **Taxas (Embarque/Serviço)**, **Comissão da Agência** e **Tarifa (Custo Líquido)** calculada automaticamente (`Tarifa = Venda - (Taxa + Comissão)`). Os campos de Markup e RAV são ocultados para simplificar o preenchimento.\n\nO sistema valida que o total distribuído corresponda a 100% do valor de venda antes de autorizar o avanço para fases posteriores do fluxo operacional.'
  },
  {
    id: 'itinerario-digital',
    modulo: 'viagens',
    label: 'Itinerário Digital Público para Clientes',
    description: 'A página móvel externa para o passageiro acompanhar a viagem.',
    details: 'O PaxFlow gera um link exclusivo sem autenticação (`#itinerario?id=UUID`) para o cliente final. Na tela, o cliente tem acesso a um cronograma de reservas com contagem regressiva para o embarque. Por segurança, informações como custos internos, markups e comissões são 100% ocultadas.'
  },
  {
    id: 'filtros-avancados-painel',
    modulo: 'viagens',
    label: 'Painel de Filtros Avançados Combináveis & Resumo Financeiro',
    description: 'Como filtrar viagens combinando múltiplos critérios simultâneos e visualizar totais em tempo real.',
    details: 'No topo da tela de Viagens, o botão **🎛️ Avançado** abre um painel completo de filtros combináveis em tempo real:\n\n- **Produtos / Serviços**: Selecione múltiplos tipos (Aéreo, Hotel, Seguro, Carro, etc.) e escolha a lógica: **Contém TODOS [E]** (exige que a viagem tenha todos os produtos marcados simultaneamente) ou **Contém QUALQUER [OU]** (traz viagens que tenham ao menos um dos selecionados).\n- **Filtros de Markup & RAV por Produto**: Pills dinâmicas para filtrar a rentabilidade das vendas (`Todos`, `💎⚡ Markup + RAV (e/ou)` [viagens com produtos de Markup ou RAV], `💎 Com Markup` [viagens com Markup > 0], `⚡ Com RAV` [viagens com RAV > 0], `✨ Ambos (MKP e RAV)` [viagens que possuem simultaneamente produtos com Markup e RAV], `💼 Apenas Comissão` [comissão pura sem markup nem rav] e `🚫 Sem MKP/RAV`).\n- **Filtro por Todos os Valores Financeiros do Produto (R$)**: Permite filtrar com precisão os valores monetários mínimos e máximos de cada componente dos produtos da viagem: **Tarifa Base Líquida (Custo)**, **Taxas de Embarque/Serviço**, **Comissão de Fornecedor**, **Markup / Margem Própria**, **RAV Bruta**, além da **Rentabilidade Líquida Total** (`Comissão + Markup + 88% RAV`) e **Valor Total de Venda**.\n- **Consultores (Usuários)**: Pills com avatar/iniciais e seleção múltipla simultânea para supervisão de consultores ou equipes.\n- **Formas de Recebimento**: Pills com os meios de quitação da agência (Pix, Cartão, Boleto, Faturado, Dinheiro, TED).\n- **Origem do Lead**: Filtre por canais de captação (WhatsApp, Instagram, Indicação, Google, Site, Loja, etc.).\n- **Qtd de Passageiros (PAX)**: Faixas operacionais rápidas (1 PAX Individual, 2 PAX Casal, 3 a 5 PAX Família, 6+ PAX Grupo).\n- **Tags / Classificações**: Multi-select de etiquetas livres e classificações (VIP, Corporativo, Família, Lua de Mel, Resort, etc.).\n- **Período e Atalho Mês/Ano**: Filtre por competência no seletor rápido `YYYY-MM` (ex: `2026-02`) ou informe datas personalizadas de Início e Fim por Criação, Data Financeiro, Embarque (Ida) ou Retorno (Volta).\n- **Destinos & Fornecedores**: Selecione múltiplos destinos cadastrados e filtre por fornecedor, consolidadora ou cia aérea (busca textual instantânea).\n- **Vouchers e Anexos**: Filtre viagens com anexos pendentes ou já emitidos (`Com Vouchers`, `Sem Vouchers`, `Todos`).\n- **Conferência & SLA**: Filtre por status de conferência de processo (`Conferidos`, `Pendentes`), conferência financeira e alertas de SLA / Risk Score.\n- **Resumo Financeiro em Tempo Real**: Conforme você ajusta os filtros, uma barra no topo do grid exibe o **Total de Vendas**, **Rentabilidade Total**, **Ticket Médio** e a contagem de viagens do recorte atual.\n- **Chips de Filtros Ativos**: Cada critério aplicado vira um chip visual com botão de remoção individual (`✕`) e atalho `Limpar Todos`.'
  },
  {
    id: 'exportacao-viagens-csv',
    modulo: 'viagens',
    label: 'Exportação de Viagens para CSV (Compatível com Excel Brasil)',
    description: 'Como exportar o recorte filtrado de viagens com formatação brasileira e colunas detalhadas.',
    details: 'Ao aplicar qualquer combinação de filtros ou visualizar a listagem completa de viagens, clique no botão **📥 Exportar CSV** no cabeçalho:\n\n- **Respeita os Filtros**: O arquivo gerado exporta exatamente o conjunto de viagens filtradas no momento.\n- **Padrão Brasileiro para Excel**: O arquivo é codificado em UTF-8 com BOM e usa ponto e vírgula (`;`) como delimitador, garantindo que o Excel no Brasil abra os dados diretamente em colunas corretas sem necessidade de conversão.\n- **Formatação Monetária e Datas**: Valores monetários são exportados com vírgula decimal (ex: `2500,00`) e datas no formato nacional `DD/MM/AAAA`.\n- **Colunas Incluídas**: Código (`VIA-XXXX`), Passageiro, Destino, Data Criação, Data Financeiro, Data Ida, Data Volta, Valor Total (R$), Rentabilidade (R$), Quantidade de Produtos, Tipos de Produtos, Conferência de Processo, Status e Consultor Responsável.'
  },

  // ==================== 5. Orçamentos & CRM ====================
  {
    id: 'temperatura-crm',
    modulo: 'orcamentos',
    label: 'Temperatura do Orçamento',
    description: 'Classificação visual do interesse e probabilidade de fechamento da proposta.',
    details: 'Os orçamentos são classificados em:\n\n- ❄️ **Frio**: Contato inicial ou pouca interação/interesse demonstrado.\n- ⚡ **Normal**: Fluxo padrão de negociação, com interesse mútuo.\n- 🔥 **Quente**: Alta probabilidade de fechamento, proposta alinhada e aprovação iminente.'
  },
  {
    id: 'funil-vendas',
    modulo: 'orcamentos',
    label: 'Funil de Vendas de Orçamentos',
    description: 'Etapas de negociação pelas quais passa uma solicitação de orçamento.',
    details: 'As etapas padrão do funil no PaxFlow são:\n\n- **Solicitado**: Pedido do cliente recebido, aguardando cotação.\n- **Em Andamento**: Consultor pesquisando tarifas ou enviando proposta.\n- **Aguardando**: Proposta enviada, aguardando resposta/feedback do cliente.\n- **Concluído**: Negociação encerrada (Aceito ou Desistência).'
  },
  {
    id: 'substatus-orcamento',
    modulo: 'orcamentos',
    label: 'Sub-status de Conclusão',
    description: 'Resultado final da proposta de orçamento.',
    details: 'Quando um orçamento avança para o status **Concluído**, ele deve receber um dos sub-status:\n\n- **Aceito**: O cliente fechou o contrato (dará origem a uma nova Viagem).\n- **Desistência**: O cliente optou por não fechar (pode exigir registro do motivo de perda no CRM).'
  },
  {
    id: 'importacao-csv-atendentes',
    modulo: 'orcamentos',
    label: 'Importação de Leads em Lote (CSV) & Fuzzy Matching',
    description: 'Como trazer contatos em massa e o mapeamento automático de consultores.',
    details: 'Administradores podem carregar listas de outras plataformas na aba de Importações:\n\n1. O sistema faz o parse automático do arquivo CSV.\n2. Você correlaciona os campos do arquivo com o PaxFlow ("Mapeador De-Para").\n3. **Fuzzy Matching**: O motor lê os nomes de atendentes no arquivo e busca os consultores correspondentes cadastrados por aproximação fonética/nominal, reduzindo a necessidade de atribuição manual.'
  },
  {
    id: 'whatsapp-hub-modelos',
    modulo: 'orcamentos',
    label: 'Hub de Modelos de Mensagens do WhatsApp',
    description: 'Disparo de comunicações automatizadas utilizando tags reativas.',
    details: 'Para agilizar o contato, administradores podem cadastrar modelos de WhatsApp com variáveis dinâmicas (como `{{cliente}}` e `{{link_itinerario}}`). Na ficha de orçamentos e viagens, clicar no ícone do WhatsApp abre o aplicativo com a mensagem pronta substituindo as variáveis automaticamente.'
  },
  {
    id: 'upsell-engine-preditivo',
    modulo: 'orcamentos',
    label: 'PaxFlow Upsell Engine™ (Recomendações Preditivas)',
    description: 'Sugestões inteligentes de adicionais e upgrades em propostas comerciais.',
    details: 'O PaxFlow Upsell Engine™ analisa automaticamente os destinos e produtos cadastrados em uma cotação e gera sugestões de adicionais de alta margem (Seguros Saúde Internacional, Passes & Ingressos VIPs, Transfer Privativo, Upgrades de Hotelaria e Seguro Cancel Flex). Ao enviar a proposta, o consultor pode clicar em "+ Incluir" para adicionar a sugestão ao resumo comercial em 1-clique.'
  },
  {
    id: 'edicao-completa-orcamento',
    modulo: 'orcamentos',
    label: 'Edição Completa de Orçamento (Data da Viagem, Valor, Destino e Tags)',
    description: 'Como atualizar dados de um orçamento ativo em qualquer etapa do Kanban.',
    details: 'No rodapé dos cards de orçamento, clique no ícone de lápis (✏️). O modal de edição permite alterar:\n\n- **Data da Viagem**: Digite a nova data (com validação e conversão automática no banco).\n- **Valor da Proposta (R$)**: Atualize o valor cotado com máscara de moeda.\n- **Destino e Nome do Cliente**: Ajuste informações do passageiro ou rota.\n- **Contato e Temperatura**: Modifique o telefone e a classificação do lead (Frio, Normal, Quente).\n- **Tags**: Adicione palavras-chave separadas por vírgula.\n\nTodas as alterações são salvas no banco de dados e refletidas no Kanban em tempo real.'
  },
  {
    id: 'reatribuicao-consultor-avatar',
    modulo: 'orcamentos',
    label: 'Reatribuição Rápida de Consultor pelo Avatar',
    description: 'Como transferir a responsabilidade de um orçamento clicando na foto.',
    details: 'No rodapé dos cards de orçamento, clicar diretamente sobre a foto/avatar do consultor responsável abre a janela de "Reatribuir Consultor Responsável". Selecione o novo membro da equipe na lista para transferir a gestão do lead imediatamente. O avatar exibe um tooltip explicativo ao passar o mouse.'
  },

  // ==================== 6. Reembolsos & Financeiro ====================
  {
    id: 'status-reembolso',
    modulo: 'reembolsos',
    label: 'Status de Reembolso',
    description: 'Etapas do processo de devolução de valores por cancelamento ou alteração de viagem.',
    details: 'O fluxo de reembolso no PaxFlow é composto por:\n\n- **Solicitado**: Registrada a solicitação junto à operadora/fornecedor.\n- **Em Análise**: Operadora analisando taxas e multas de contrato.\n- **Aprovado**: Valor de direito confirmado pelo fornecedor.\n- **Pago**: Dinheiro creditado na conta do passageiro ou agência.\n- **Recusado**: Reembolso negado conforme as regras tarifárias.'
  },
  {
    id: 'taxas-multas-cancelamento',
    modulo: 'reembolsos',
    label: 'Taxas e Multas de Cancelamento',
    description: 'Valores retidos pelas companhias aéreas ou hotéis no cancelamento.',
    details: 'No módulo de reembolsos, o consultor deve preencher as taxas retidas pelos fornecedores. O PaxFlow calcula automaticamente o valor líquido final a ser devolvido ao cliente com base nos descontos aplicados.'
  },

  // ==================== 7. Clientes & Relatórios ====================
  {
    id: 'tipo-pessoa-cliente',
    modulo: 'clientes',
    label: 'Tipo de Cliente (Pessoa Física vs Jurídica)',
    description: 'Diferenciação cadastral entre clientes individuais ou corporativos.',
    details: 'No PaxFlow, os clientes podem ser cadastrados como CPF (Pessoa Física) ou CNPJ (Pessoa Jurídica/Corporativo). Isso ajuda no agrupamento de relatórios de faturamento por empresa parceira.'
  },
  {
    id: 'historico-paxflow',
    modulo: 'clientes',
    label: 'Histórico Consolidado do Cliente',
    description: 'Painel que agrega todas as viagens, orçamentos e NPS de um passageiro específico.',
    details: 'Ao consultar a ficha do cliente, o PaxFlow exibe uma linha do tempo com todas as interações financeiras e operacionais passadas, facilitando o atendimento personalizado e estratégias de remarketing.'
  },
  {
    id: 'upload-compressao-canvas',
    modulo: 'clientes',
    label: 'Upload e Compactação de Documentos de Clientes e Viagens',
    description: 'Como funciona o envio de fotos de passaporte, CNH, RG e vouchers com otimização automática.',
    details: 'Ao anexar imagens (JPEG/PNG) na ficha do cliente ou nas viagens, o PaxFlow realiza um pré-processamento via Canvas API no navegador. Ele redimensiona a imagem para resoluções ideais e a compacta, reduzindo arquivos pesados de celulares de ~5MB para blobs levíssimos de <50KB antes de subir ao Supabase Storage. Isso garante economia drástica de espaço, uploads instantâneos e carregamento ultra-rápido na galeria de documentos.'
  },
  {
    id: 'upload-multiplos-anexos-lote',
    modulo: 'clientes',
    label: '📎 Envio de Múltiplos Arquivos em Lote (UploadAnexoModal)',
    description: 'Como enviar vários documentos de uma só vez com inferência automática de categoria e tamanhos legíveis.',
    details: 'O PaxFlow conta com um modal moderno de envio em lote:\n\n1. **Seleção Múltipla ou Arrastar**: Na seção de documentos do cliente ou da viagem, clique em "+ Novo Documento" ou arraste vários arquivos simultaneamente para a área indicada.\n2. **Detecção Inteligente do Tipo**: O sistema lê o nome de cada arquivo e pré-seleciona a categoria correta (ex: arquivos com "cnh" viram CNH, "resort" ou "hotel" viram Voucher Hotel, "transfer" viram Voucher Transporte).\n3. **Exibição Clara do Tamanho (MB & KB)**: Para facilitar o entendimento humano, os tamanhos são apresentados de forma intuitiva tanto em Megabytes (MB) quanto em Kilobytes (KB) (ex: `2.4 MB (2.441 KB)` ou `450 KB (0.4 MB)`).\n4. **Ajuste de Metadados**: Você pode renomear o rótulo, informar o número do documento ou a data de validade diretamente na lista antes do envio.\n5. **Associação por Passageiro**: Em viagens com múltiplos viajantes, use o seletor para indicar a qual passageiro aquele voucher pertence.\n6. **Envio Unificado**: Clique em "Salvar Todos os Documentos" para processar e enviar todos os arquivos de forma consolidada ao Supabase Storage.'
  },
  {
    id: 'otimizacao-automatica-pdf-pesado',
    modulo: 'clientes',
    label: '📄 Otimização Automática de PDFs Pesados (> 25MB)',
    description: 'Como o PaxFlow comprime e adequa automaticamente PDFs pesados ou escaneados ao limite do sistema.',
    details: 'Para documentos extensos ou digitalizações de alta resolução que ultrapassam o limite de 25MB (como contratos, passaportes escaneados e vouchers pesados de 50MB a 100MB+):\n\n1. **Identificação Instantânea**: Ao selecionar ou arrastar o arquivo, o sistema identifica se o PDF tem mais de 25MB e exibe a etiqueta "⚡ Otimização Automática" na lista de anexos.\n2. **Processamento no Próprio Navegador**: O documento é otimizado diretamente no seu navegador antes do envio. Isso evita o tráfego de arquivos pesados pela internet e impede erros de tempo limite de conexão.\n3. **Rasterização em Alta Resolução (150 DPI)**: Cada página é renderizada em resolução nítida de 150 DPI com compressão visual balanceada, mantendo assinaturas, carimbos e textos perfeitamente legíveis para impressão e auditoria.\n4. **Acompanhamento em Tempo Real**: Durante o envio, você acompanha o progresso página por página ("Otimizando documento: Página X de Y...").\n5. **Documentos Muito Extensos**: Se mesmo após a compressão o PDF ainda superar 25MB (como catálogos de centenas de páginas), o sistema informará o tamanho alcançado e sugerirá o desmembramento do arquivo.'
  },
  {
    id: 'taxonomia-documentos-categorias',
    modulo: 'clientes',
    label: '📋 Taxonomia das 12 Categorias de Documentos do PaxFlow',
    description: 'Conheça a classificação oficial de identificações pessoais e vouchers operacionais.',
    details: 'Para acabar com a limitação de tratar todo arquivo como passaporte, o PaxFlow adota 12 categorias universais:\n\n**Identificação Pessoal do Passageiro:**\n- 🛂 **Passaporte**: Documento para viagens internacionais com monitoramento de SLA de 180 dias.\n- 🪪 **RG**: Carteira de Identidade oficial para voos e viagens nacionais.\n- 🚗 **CNH**: Carteira Nacional de Habilitação aceita em embarques nacionais e locação de veículos.\n- 📋 **Visto Consular**: Visto de turismo/negócios ou autorização eletrônica (ETA).\n\n**Vouchers & Logística da Viagem:**\n- ✈️ **Voucher Aéreo**: Bilhetes emitidos, e-tickets e confirmações de voo.\n- 🏨 **Voucher Hotel**: Confirmações de reserva, vouchers de hospedagem e resorts.\n- 🎟️ **Ingressos**: Entradas para parques temáticos, shows e atrações turísticas.\n- 🚐 **Voucher Transporte**: Traslados (transfers), vouchers de locação de automóveis ou bilhetes de trem.\n- 🛡️ **Seguro Viagem**: Apólices e certificados de assistência médica internacional/nacional.\n\n**Governança & Roteiro:**\n- 📑 **Contrato**: Termos de intermediação e contratos de prestação de serviços assinados.\n- 🗺️ **Roteiro**: Programação detalhada dia a dia e cadernos de viagem.\n- 📎 **Outros**: Demais comprovantes financeiros ou operacionais.'
  },
  {
    id: 'lightbox-documentos',
    modulo: 'clientes',
    label: 'Visualizador de Documentos Incorporado (Lightbox)',
    description: 'Leitura inline de passaportes, CNHs, vouchers e PDFs sem sair da tela.',
    details: 'Documentos em PDF ou imagem anexados podem ser visualizados diretamente na interface do PaxFlow com o modal glassmorphic de Lightbox. O visualizador conta com rotação de páginas, zoom e download direto, sem abrir novas abas desnecessárias no navegador. Para links legados do Google Drive, o sistema dispõe de botão de redirecionamento imediato.'
  },
  {
    id: 'exclusao-documentos-anexos',
    modulo: 'clientes',
    label: '🗑️ Exclusão e Gerenciamento de Documentos e Passaportes',
    description: 'Como remover documentos anexados, passaportes únicos e arquivos legados com segurança.',
    details: 'Você pode remover anexos e documentos cadastrados diretamente na ficha do cliente ou no modal de gerenciamento de viagem:\n\n1. **Permissão de Exclusão**: Apenas o consultor que enviou o arquivo ou usuários com perfil de Administrador podem excluir documentos.\n2. **Exclusão Segura**: Ao clicar no ícone de lixeira, uma janela de confirmação é exibida para evitar cliques acidentais.\n3. **Passaportes e Documentos Legados**: O sistema remove de forma unificada tanto arquivos novos do Supabase quanto passaportes legados vinculados à ficha do passageiro, limpando a referência no cadastro e liberando o espaço no Storage imediatamente.\n4. **Atualização Imediata**: A galeria de documentos anexados e a ficha detalhada do cliente se atualizam instantaneamente na tela após a exclusão.'
  },
  {
    id: 'identidade-visual-branding',
    modulo: 'clientes',
    label: 'Configurações de Marca da Agência (White-Label & Open Graph)',
    description: 'Como personalizar as telas públicas e compartilhamentos com logotipo e cores da sua agência.',
    details: 'Administradores podem acessar a aba de Configurações para enviar a logomarca da agência, favicon (.svg e .png) e definir a cor primária hexadecimal corporativa. Isso atualiza automaticamente as páginas do Itinerário Digital, Pesquisa NPS e os cartões de compartilhamento social (WhatsApp / Facebook / LinkedIn).'
  },
  {
    id: 'relatorios-exportacao-dados',
    modulo: 'clientes',
    label: 'Exportação de Relatórios Financeiros e Comerciais (Excel, CSV e PDF)',
    description: 'Como extrair dados de vendas, faturamento e comissões para auditoria externa.',
    details: 'No menu **Relatórios**, administradores e consultores (com permissão) podem filtrar a produção da agência por intervalo de datas, consultor responsável e tipo de serviço:\n\n1. **Filtros Avançados**: Selecione o período de competência e a visão desejada (Vendas Concluídas, Reembolsos ou Funil de Orçamentos).\n2. **Exportação com 1 Clique**: Utilize os botões `Baixar Excel / CSV` para gerar relatórios tabulares compatíveis com softwares contábeis ou de BI.\n3. **Impressão de Dossiê**: É possível gerar versões em PDF com o logotipo da agência para envio a clientes corporativos.'
  },
  {
    id: 'auditoria-extrato-recebimentos',
    modulo: 'clientes',
    label: '🪙 Extrato Detalhado de Recebimentos por Meio de Pagamento & Drilldown',
    description: 'Como auditar detalhadamente quais viagens e produtos foram recebidos em cada meio de pagamento.',
    details: 'Na aba **Recebimentos & Auditoria** (menu Relatórios -> Grupo 2: Financeiro & Auditoria):\n\n1. **Drilldown em 1-Clique nas Barras**: Cada barra do card "Entradas por Meio de Pagamento" (Pix, Cartão, Boleto, etc.) é interativa. Clicar sobre ela abre o modal analítico com o extrato específico daquela modalidade financeira.\n2. **Botão "Extrato Completo ↗"**: No topo do card de entradas, permite visualizar de forma consolidada todos os lançamentos financeiros de todos os meios de uma só vez.\n3. **Mapeamento de Produtos por LOC**: Cada lançamento exibe o cliente, a viagem de destino, o Localizador (LOC copiável 📋) e a lista dos produtos/serviços específicos cobertos por aquele recebimento (ex: Voo, Hotel, Transfer) com seus respectivos valores.\n4. **Filtros e Busca em Tempo Real**: Permite filtrar por consultor titular, alternar a forma de recebimento e buscar por cliente, destino ou fornecedor diretamente no modal.\n5. **Exportação de Planilha CSV**: Gera um arquivo CSV (.csv compatível com Excel com acentuação UTF-8) com todas as colunas de auditoria contábil e conciliação bancária.'
  },
  {
    id: 'relatorio-faturamento-lucratividade',
    modulo: 'clientes',
    label: '💰 Relatório de Faturamento e Rentabilidade (Filtros por Produto & RAV)',
    description: 'Como auditar faturamento, taxas, comissão, markup, RAV líquido e rentabilidade discriminados por produto ou RAV.',
    details: 'Na aba **Faturamento e Rentabilidade** (menu Relatórios -> Grupo 2: Financeiro & Auditoria):\n\n1. **Filtro de Produto / Linha de Serviço**: Permite selecionar um produto específico (ex: `AÉREO OPERADORA`, `HOTEL`, `CRUZEIRO`, etc.) ou a visão consolidada `Todos os Produtos`. Os cartões de topo (Faturamento Venda, Taxas, Comissão, Markup, RAV, Rentabilidade Total e Margem Média) recalculam imediatamente apenas para os serviços filtrados.\n2. **Filtro de RAV (<> 0)**: Permite auditar receitas com Remuneração Adicional de Venda escolhendo `⚡ Apenas com RAV (RAV <> 0)`, visualizar itens sem RAV (`Sem RAV (RAV = 0)`) ou todos (`Todos`).\n3. **Cálculo de Rentabilidade Total Real & Retenção de RAV**: O RAV exibido já aplica a retenção líquida de 12% (RAV * 0.88), e a rentabilidade total real consolida comissões + markup + RAV líquido deduzindo eventuais descontos e prejuízos cadastrados.\n4. **Exportação CSV Dinâmica**: O botão "Exportar CSV" exporta a tabela respeitando rigorosamente os filtros de Produto e RAV ativos na tela.'
  },
  {
    id: 'relatorio-metas-campanhas',
    modulo: 'clientes',
    label: '🎯 Relatório de Metas Comerciais, Campanhas de Incentivo & Auditoria',
    description: 'Acompanhamento executivo de metas ativas, encerradas e futuras com auditoria analítica por consultor.',
    details: 'Na aba **Metas & Campanhas** (menu Relatórios -> Grupo 1: Gestão Comercial):\n\n1. **Seletor de Metas & Status Temporal**: Escolha qualquer meta ou campanha cadastrada. O seletor agrupa visualmente por `🟢 Ativas`, `⏳ Encerradas` e `📅 Futuras` com base na data atual.\n2. **4 Tipos de Métricas Suportadas**: Além de metas financeiras (`Faturamento Bruto R$` e `Rentabilidade / Lucro R$`), o sistema apura campanhas de volume como `Qtd. de Orçamentos Criados (Unidades)` (ex: Campanha "Boa viagem! - 40 orçamentos") e `Qtd. de Vendas Fechadas (Unidades)`.\n3. **KPIs Executivos da Agência**: Exibe a Meta Total Global, o Realizado pela Agência, a Taxa de Atingimento % e o Top Consultor da campanha.\n4. **Ranking & Desempenho da Equipe**: Tabela com barra de progresso visual, percentual atingido, valor/quantidade faltante e badge de faixa conquistada (Bronze, Prata, Ouro).\n5. **Auditoria Analítica com 1 Clique (🔍 Auditar)**: Administradores podem auditar cada consultor para visualizar a lista completa de orçamentos ou vendas que compõem o número apurado, com cliente, destino, data e valor.'
  },
  {
    id: 'controle-participacao-metricas',
    modulo: 'configuracoes',
    label: '🎯 Controle de Participação em Métricas, Rankings e Campanhas (Interruptor de Usuários)',
    description: 'Como excluir usuários específicos (ex: Administradores, Contas de Teste ou Diretoria) de rankings e metas sem impactar o total da agência.',
    details: 'No menu **Configurações -> Aba Equipe de Consultores**:\n\n1. **Interruptor Dedicado**: Tanto no cadastro de novos consultores quanto no modal de edição de perfil, administradores podem alternar a opção `🎯 Participa de Campanhas, Metas e KPIs` (`Sim` / `Não`).\n2. **Isolamento de Disputas & Pódios**: Usuários com o interruptor desmarcado (`Não`) são automaticamente removidos de rankings individuais de vendas, tabelas comparativas de conversão comercial, disputas de metas de campanha e da gamificação/leaderboard de XP.\n3. **Fidelidade Financeira Global da Agência**: As vendas, viagens e orçamentos vinculados a esse usuário continuam sendo somados normalmente no faturamento bruto global da agência e relatórios gerenciais, garantindo conciliação financeira precisa.\n4. **Identificação Visual Instantânea**: A tabela de consultores exibe uma badge informativa com o status (`🎯 Sim` ou `🚫 Não`) para fácil governança da equipe.'
  },
  {
    id: 'auto-status-em-andamento',
    modulo: 'orcamentos',
    label: 'Automação: Início do Atendimento (Orçamentos)',
    description: 'O orçamento passa de "Solicitado" para "Em Andamento" de forma automática ao interagir com o lead.',
    details: 'Quando um novo orçamento (Lead) entra no sistema, ele inicia no estágio "Solicitado". Assim que qualquer consultor abre a ficha deste orçamento e adiciona a primeira anotação, observação interna ou envia uma mensagem na linha do tempo, o PaxFlow entende que o atendimento foi iniciado e altera o status do orçamento automaticamente para "Em Andamento".\n\nIsso evita que o consultor precise clicar manualmente para atualizar o estágio, mantendo o funil comercial preciso e gerando métricas corretas de tempo de resposta do primeiro atendimento.'
  },
  {
    id: 'lead-aging-reinicio',
    modulo: 'orcamentos',
    label: '⏱️ Lead Aging & Reinício de Tempo na Etapa (Orçamentos)',
    description: 'Como funciona o contador visual de tempo na etapa e seu reinício automático ao voltar para Solicitado.',
    details: 'Cada card de orçamento exibe um badge visual de **Lead Aging** indicando o tempo decorrido desde a última movimentação:\n\n1. **Faixas Visuais**: `🟢 Recente` (até 2 dias na etapa, ex: "Hoje" ou "1d na etapa"), `🟡 Moderado` (3 a 5 dias) e `🔴 Crítico` (acima de 5 dias parado, com efeito pulsante).\n2. **Reinício Automático**: Ao voltar um orçamento de "Em Andamento" ou "Aguardando" para "Solicitado" (seja via botão de retorno `↩️`, botão `🔄` ou menu de ações rápidas `⋮`), o contador é reiniciado do zero imediatamente (`🟢 Hoje`), gravando o novo timestamp de atualização no banco de dados.'
  },
  {
    id: 'localizadores-grid-viagens',
    modulo: 'viagens',
    label: '📋 Localizadores (LOCs) dos Produtos no Grid e Tabela de Viagens',
    description: 'Visualização direta dos códigos de reserva e localizadores vinculados aos serviços da viagem.',
    details: 'Tanto na visualização em Tabela quanto na visualização em Cards/Grid do painel de **Viagens**:\n\n1. **Listagem de LOCs**: Em vez de ícones genéricos, o sistema exibe os códigos de reserva / localizadores cadastrados nos produtos (ex: `AF9988`, `TRF123`, `MSC4411`).\n2. **Pesquisa Inteligente**: Os localizadores participam da busca em tempo real do cabeçalho com realce amarelo automático (`highlight`).\n3. **Ausência de Localizador**: Viagens com produtos sem localizador preenchido exibem a tag `SEM LOC` para fácil identificação da pendência operacional.'
  },
  {
    id: 'auto-status-desistencia',
    modulo: 'orcamentos',
    label: 'Automação: Desistência por Inatividade (Orçamentos)',
    description: 'Cancelamento automático de propostas antigas após o prazo de inatividade (ex: 30 dias).',
    details: 'Para manter o funil de vendas limpo e focado em leads quentes, o sistema monitora orçamentos que estão estacionados no estágio "Aguardando" (geralmente após o envio da proposta comercial ao cliente).\n\nSe o orçamento não receber nenhuma nova interação (alteração de dados, preenchimento de campos ou nova anotação nos comentários) dentro do limite configurado na aba "Automações" (o padrão recomendado é de 30 dias), o PaxFlow arquivará o card como "Concluído" com o sub-status "Desistência" (Lead Perdido).\n\n💡 **Dica para o Consultor:** Se você ainda estiver negociando com o cliente e quiser evitar o arquivamento automático, basta adicionar um comentário de acompanhamento no orçamento (ex: "Aguardando retorno do cliente sobre o hotel"). Isso renovará o cronômetro de inatividade por mais 30 dias.'
  },
  {
    id: 'auto-status-pre-embarque',
    modulo: 'viagens',
    label: 'Automação: Transição para Pré-Embarque (Viagens)',
    description: 'Viagens em pós-venda mudam para "Pré-Embarque" automaticamente próximo à data de embarque.',
    details: 'Quando a data do voo ou do primeiro serviço da viagem (data de ida) se aproxima, o sistema altera o status operacional da viagem para "Pré-Embarque" de forma autônoma.\n\nEsta transição ocorre exatamente X dias antes da viagem (limite definido por padrão como 7 dias nas Configurações de Automações). Ao entrar nesta fase, a viagem aciona alertas visuais de atenção na lista e destaca a necessidade de conferência final e entrega de vouchers/dicas de viagem para o cliente final.'
  },
  {
    id: 'auto-status-pos-viagem',
    modulo: 'viagens',
    label: 'Automação: Conclusão e Pós-Viagem (Viagens)',
    description: 'Viagens ativas mudam para "Pós-Viagem" automaticamente no dia seguinte ao retorno dos passageiros.',
    details: 'Assim que a data de retorno (data de volta) da viagem é concluída (ou seja, quando o dia atual passa da data cadastrada no retorno), o sistema encerra a fase operacional física e move o status da viagem automaticamente para "Pós-Viagem".\n\nEsta mudança aciona a esteira de pós-venda, onde o consultor recebe a tarefa de coletar feedbacks e, se configurado, dispara a pesquisa eletrônica de NPS (Net Promoter Score) de satisfação para o e-mail/WhatsApp do cliente.'
  },
  {
    id: 'auto-reembolso-solicitado',
    modulo: 'reembolsos',
    label: 'Automação: Vínculo de Solicitação de Reembolso',
    description: 'A viagem é movida automaticamente para "Reembolso Solicitado" ao abrir um processo de estorno.',
    details: 'Quando um cliente solicita o cancelamento parcial ou total de serviços de uma viagem contratada, o consultor cria um registro de reembolso. No exato instante em que essa ficha de reembolso é salva no sistema, o PaxFlow altera o status geral da viagem operacional para "Reembolso Solicitado".\n\nIsso sinaliza para os gestores e para o financeiro que existe um trâmite de crédito pendente de conciliação junto aos fornecedores (consolidadoras ou companhias aéreas) antes que a viagem possa ser definitivamente finalizada.'
  },
  {
    id: 'auto-reembolso-concluido',
    modulo: 'reembolsos',
    label: 'Automação: Retorno após Conclusão do Reembolso',
    description: 'A viagem retorna para sua fase correta automaticamente assim que o financeiro realiza o pagamento.',
    details: 'Quando o departamento financeiro conclui o processo de reembolso e atualiza o status na Central de Reembolsos para "💸 Concluído / Pago" (anexando o comprovante), o sistema analisa a data da viagem para tomar a decisão correta:\n\n1. **Se a data de retorno da viagem já passou**: O status geral da viagem é alterado automaticamente para "Pós-Viagem" para que o pós-venda possa ser finalizado.\n2. **Se a viagem ainda não aconteceu**: O status da viagem retorna para "Pós-Venda" para que continue seu ciclo operacional normal até o embarque.\n\nEssa regra elimina o risco de viagens ficarem esquecidas na coluna de reembolso após a devolução dos valores.'
  },
  {
    id: 'editor-templates-drag-drop',
    modulo: 'cadastros',
    label: 'Modelos de Mensagem: Editor de Variáveis Drag & Drop',
    description: 'Como configurar templates usando as pílulas de clicar e arrastar.',
    details: 'Ao cadastrar ou editar um modelo de mensagem na aba "Modelos de Mensagem", você pode utilizar variáveis dinâmicas que o sistema substitui na hora do envio. O editor fornece 11 pílulas de variáveis reativas (como {{cliente}}, {{destino}}, {{valor_total}}, etc.) localizadas acima do campo de texto.\n\nPara usá-las, você pode:\n1. **Clicar sobre a pílula**: Insere o texto da variável exatamente onde o seu cursor estiver no campo de texto.\n2. **Arrastar e soltar (Drag & Drop)**: Permite arrastar a pílula de variável com o mouse e soltá-la na posição desejada do conteúdo da mensagem.\n\n💡 O PaxFlow sincroniza o campo "Variáveis do Sistema Utilizadas" automaticamente para você na inserção, facilitando a gravação.'
  },
  {
    id: 'historico-conversas-digisac',
    modulo: 'cadastros',
    label: 'Histórico de Conversas com o Cliente no Digisac',
    description: 'Como visualizar o andamento das conversas diretamente na janela de disparos.',
    details: 'Se a sua agência possui a integração do Digisac habilitada (com token, domínio e ID de serviço configurados), a tela de disparo de mensagens de templates exibe um painel lateral em tela dividida (Split-screen) com o histórico de mensagens.\n\n* **Carregamento Automático**: O sistema busca as últimas mensagens trocadas com o telefone do cliente no canal do Digisac na hora em que o modal de envio é aberto.\n* **Atualização Manual**: Você pode clicar em "Atualizar 🔄" no canto superior do histórico de conversas para carregar novas mensagens enviadas ou recebidas.\n* **Fallback Modo Demonstração**: Se a API do Digisac estiver offline ou houver restrições locais de conexão de rede, a tela exibirá uma simulação das últimas mensagens (modo demonstração) de forma a garantir a estabilidade da interface.'
  },
  {
    id: 'origens-lead-modulo',
    modulo: 'cadastros',
    label: '📣 Gestão de Origens de Lead (Canais de Captação)',
    description: 'Como cadastrar, ativar/desativar e gerenciar canais de captação de clientes.',
    details: 'A aba "Origens de Lead" permite que a agência cadastre canais de entrada de forma dinâmica (ex: TikTok, Google Ads, Feiras, WhatsApp, Indicação):\n\n1. **Cadastro com Emojis**: Crie novos canais definindo o nome e selecionando um emoji representativo.\n2. **Ativação / Desativação (Soft-Delete)**: Origens inativas não aparecem na criação de novos orçamentos, mas são preservadas para consulta em orçamentos antigos e relatórios de inteligência.\n3. **Bloqueio de Exclusão Física**: Se uma origem já tiver sido utilizada em orçamentos, o sistema bloqueia sua exclusão permanente para manter a integridade dos dados históricos, sugerindo a desativação.'
  },
  {
    id: 'central-de-cadastros-modulo',
    modulo: 'cadastros',
    label: 'Estrutura da Central de Cadastros (7 Módulos / Navegação Lateral)',
    description: 'Conheça o menu unificado de Cadastros com navegação em barra lateral para administradores.',
    details: 'A Central de Cadastros reúne todas as definições operacionais da agência em 7 módulos organizados na barra lateral (Sidebar):\n\n1. **📦 Tipos de Serviços**: cadastro dinâmico de produtos, cores e campos extras.\n2. **📍 Gestão de Destinos**: cadastro e higienização de cidades e países de viagens.\n3. **💰 Formas de Recebimento**: gestão de opções de pagamento (Pix, Cartão, Dinheiro).\n4. **📣 Origens de Lead**: cadastro dinâmico de canais de captação (WhatsApp, Instagram, Loja, Google, etc.).\n5. **🎯 Campanhas de Vendas**: criação e controle de campanhas internas de incentivo por período.\n6. **🏆 Metas Financeiras**: parametrização de metas (Faturamento Bruto ou Rentabilidade) e faixas de premiação.\n7. **💬 Modelos de Mensagem**: templates para WhatsApp com variáveis reativas, pílulas interativas e histórico Digisac.'
  },
  // ==================== 10. Escala de Funcionários ====================
  {
    id: 'escala-visao-geral',
    modulo: 'escala',
    label: 'Central Administrativa: Escala Mensal da Equipe',
    description: 'Como consultar, filtrar e acompanhar os turnos dos funcionários da agência.',
    details: 'A aba "Escala de Funcionários" no Inbox reúne o planejamento de trabalho da equipe em uma grade dinâmica:\n\n- **Visualização Mensal**: Exibe os dias do mês (1 a 31) com badges coloridos por turno (10-17, 12-19, 14-21, 15-22, Folga, Férias, Reunião, F).\n- **Rolagem e Destaque**: A coluna de funcionários é fixada à esquerda enquanto você navega horizontalmente pelos dias. O dia atual recebe destaque automático ("Hoje").\n- **Edição da Gestão**: Administradores podem clicar em qualquer célula para alterar o turno selecionando opções predefinidas ou inserindo horários/observações customizadas.'
  },
  {
    id: 'escala-solicitacoes-troca',
    modulo: 'escala',
    label: 'Solicitações de Troca de Turno e Folga Semanal',
    description: 'Fluxo de aceite duplo e aprovação da gestão no Inbox.',
    details: 'Consultores podem solicitar trocas de horário ou folga pelo sistema:\n\n1. **Troca de Turno (Consultores)**: O consultor A seleciona a data e o colega B com quem deseja trocar. O pedido gera um card no Inbox do colega B.\n2. **Aceite do Colega**: Ao aceitar no PaxFlow, a solicitação avança para o Inbox dos Administradores.\n3. **Aprovação Final da Gestão**: O Administrador aprova a troca com 1 clique, e o PaxFlow atualiza automaticamente os turnos da grade e notifica ambos.'
  },
  {
    id: 'escala-banco-folgas-eventos',
    modulo: 'escala',
    label: 'Banco de Folgas e Agenda de Treinamentos/Eventos',
    description: 'Controle de saldos de folgas compensatórias e compromissos da equipe.',
    details: 'Na parte inferior da tela de Escala, o PaxFlow disponibiliza dois painéis integrados:\n\n- **Banco de Folgas**: Acompanhe o saldo numérico de dias acumulados de cada funcionário com o histórico de justificativas e metas atingidas.\n- **Treinamentos · Coffee · Eventos**: Registre reuniões, treinamentos corporativos e eventos de franqueados especificando a data e o consultor ou equipe responsável.'
  },

  // ==================== 11. Co-piloto de IA & Governança ====================
  {
    id: 'copiloto-visao-geral',
    modulo: 'copiloto',
    label: 'Visão Geral do Co-piloto de IA e Assistência Operacional',
    description: 'Como a Inteligência Artificial auxilia no pós-venda, CRM e sugestão de ações.',
    details: 'O Co-piloto de IA do PaxFlow é o assistente inteligente integrado ao sistema projetado para apoiar consultores e gestores em tarefas de alta produtividade:\n\n1. **Sugestão de Respostas e Comunicação**: Geração de rascunhos inteligentes para mensagens de WhatsApp, e-mails de acompanhamento e lembretes de pré-embarque.\n2. **Triagem e Resumo de Viagens**: Leitura rápida de observações complexas, itinerários e ocorrências de pós-venda para gerar resumos de 1 parágrafo.\n3. **Análise de SLAs e Riscos**: Sinalização preventiva de pendências de passaportes, vistos e prazos limite de reembolsos.'
  },
  {
    id: 'copiloto-ativacao-desativacao',
    modulo: 'copiloto',
    label: 'Ativação e Desativação Global do Co-piloto (Controle do Admin)',
    description: 'Como o administrador da agência pode ligar ou desligar o Co-piloto de IA.',
    details: 'Para atender às preferências de compliance ou custos de cada agência, o Co-piloto possui um controle global de ligar/desligar:\n\n- **Acesso Restrito ao Admin**: Apenas usuários com papel de Administrador (`role === "admin"`) podem visualizar e alterar a chave nas Configurações.\n- **Onde Configurar**: Acesse o menu **Configurações -> aba Geral / Sistema**, localize o card **Recursos & Inteligência Artificial** e altere o botão de alternância (Toggle Switch).\n- **Comportamento quando Desativado (`false`)**: O PaxFlow oculta 100% dos botões, ícones, modais e atalhos de teclado do Co-piloto em toda a interface para todos os usuários da agência.'
  },
  {
    id: 'copiloto-seguranca-monitoramento',
    modulo: 'copiloto',
    label: 'Segurança, Monitoramento de Logs e Proteção de Dados (Privacy & Security)',
    description: 'Garantias de segurança, auditoria de requisições e isolamento de requisições da IA.',
    details: 'A arquitetura do Co-piloto de IA no PaxFlow segue rígidos padrões de segurança e privacidade:\n\n- **Monitoramento e Audit Log de Requisições**: Cada interação com a IA registra uma entrada de log auditável com ID do usuário, timestamp, ID da agência e escopo da solicitação.\n- **Validação de Segurança no Backend**: As Edge Functions e endpoints de IA validam obrigatoriamente a sessão do usuário e o status da chave `copiloto_ativo` no banco de dados. Caso uma agência desative o recurso, qualquer chamada direta é rejeitada com `HTTP 403 Forbidden` no servidor.\n- **Comentários e Sanitização de Código**: Trechos de chamadas à IA possuem marcadores explícitos de auditoria de código (`// SECURITY GUARD: Copiloto feature flag check`). Dados sensíveis de pagamento (como números de cartão de crédito) são higienizados e nunca trafegam para provedores de inteligência artificial.'
  },

  // ==================== 12. Mensageria & Tempo Real ====================
  {
    id: 'realtime-mensageria-instantanea',
    modulo: 'realtime',
    label: 'Recepção de Mensagens e Solicitações de Escala em Tempo Real (< 1s)',
    description: 'Como funciona a sincronização instantânea via WebSockets sem recarregar a página.',
    details: 'O PaxFlow conta com uma infraestrutura de mensageria em tempo real conectada via WebSockets Supabase:\n\n- **Atualização Dinâmica na Inbox**: Quando um colega solicita troca de turno, o administrador responde ou um cliente é atendido no balcão, a notificação surge na Inbox em menos de 1 segundo, sem necessidade de dar F5 ou recarregar a página.\n- **Alerta Sonoro e Toast Flutuante**: A recepção de novos alertas dispara um tom harmônico cortês (Web Audio API) e um Toast no topo da tela indicando o tipo da mensagem.\n- **Desempenho Otimizado**: Consumo zero de dados quando ocioso e reconexão automática em segundo plano.'
  },
  {
    id: 'padronizacao-datas-mensagens',
    modulo: 'realtime',
    label: 'Padronização Global de Datas e Linguagem Cortês',
    description: 'Padrão brasileiro dd/mm/aaaa em todos os alertas, solicitações e relatórios.',
    details: 'Todas as datas no PaxFlow seguem rigorosamente o formato nacional **dd/mm/aaaa** (ex: `30/08/2026` ou `30/08/2026 às 14:30`).\n\n- **Eliminação de Jargões**: Termos técnicos de banco de dados (como `ATENDIMENTO_BALCAO`, `solicitado_fornecedor`, `troca`) são traduzidos automaticamente em português fluido (`Atendimento no Balcão`, `Troca de Turno`, `Aguardando Fornecedor`).'
  },
  {
    id: 'pwa-push-celular-notificacoes',
    modulo: 'realtime',
    label: 'Notificações Push Nativas no Celular (PWA no Android & iOS)',
    description: 'Como receber alertas na tela de bloqueio do celular mesmo com o aplicativo fechado.',
    details: 'O PaxFlow suporta Notificações Push Nativas para celulares (Android e iOS 16.4+):\n\n- **Como Ativar**: Acesse seu perfil (clicando na sua carinha no rodapé da barra lateral) e clique no botão **📱 Notificações no Celular (PWA)** ➔ **Ativar**.\n- **Requisito no iPhone (iOS)**: No Safari do iPhone, toque no botão de Compartilhar e selecione **"Adicionar à Tela de Início"**. Ao abrir o aplicativo pelo ícone da tela inicial, ative as notificações no perfil.\n- **Funcionamento com App Fechado**: O celular vibrará e tocará exibindo a notificação com o ícone do PaxFlow na tela de bloqueio. Ao tocar na notificação, o aplicativo abrirá diretamente na mensagem ou solicitação correspondente.'
  },
  {
    id: 'gestao-viagens-mobile',
    modulo: 'viagens',
    label: 'Navegação e Recursos Nativos no Celular (Gestão Mobile)',
    description: 'Botão flutuante FAB (+ Nova Viagem), compartilhamento nativo e modal full-screen.',
    details: 'A tela de Gestão de Viagens do PaxFlow foi 100% redesenhada para uso fluido em smartphones:\n\n- **Botão Flutuante (FAB)**: No canto inferior direito da tela do celular, o botão circular **`[+ Nova Viagem]`** permite cadastrar novas viagens com o polegar de forma rápida.\n- **Compartilhamento Nativo (`🔗`)**: Toque no ícone de corrente no card da viagem para acionar a folha de compartilhamento nativa do celular (iOS/Android), enviando o itinerário público direto para o cliente via WhatsApp, Telegram ou Mensagem.\n- **Modal Full-Screen no Celular**: O modal de detalhes da viagem ocupa 100% da altura da tela no smartphone com os botões de ação fixados no rodapé para salvamento sem esforço.'
  },
  {
    id: 'como-instalar-app-celular-android-ios',
    modulo: 'realtime',
    label: 'Como Instalar o PaxFlow no Celular (Android & iPhone / iOS)',
    description: 'Guia passo a passo de como adicionar o aplicativo à tela inicial do smartphone sem baixar na loja.',
    details: 'O PaxFlow é um aplicativo Web PWA (Progressive Web App) que não precisa ser baixado pela Google Play Store ou Apple App Store. Ele funciona com visual e velocidade nativos diretamente no seu celular:\n\n📱 **COMO INSTALAR NO IPHONE (iOS - Safari):**\n1. Abra o navegador **Safari** no seu iPhone e acesse a URL do sistema (ex: `https://paxflow.com.br`).\n2. Toque no botão de **Compartilhar** (ícone do quadrado com a seta para cima `⎋` no menu inferior do Safari).\n3. Role a lista de opções para baixo e toque em **"Adicionar à Tela de Início"** (`➕`).\n4. Toque em **"Adicionar"** no canto superior direito.\n5. O ícone do PaxFlow aparecerá na sua tela inicial como um aplicativo nativo!\n\n🤖 **COMO INSTALAR NO ANDROID (Google Chrome / Edge):**\n1. Abra o navegador **Google Chrome** no seu celular Android e acesse o PaxFlow.\n2. Toque no banner automático **"Adicionar PaxFlow à tela inicial"** ou toque no menu de 3 pontinhos (`⋮`) no canto superior direito.\n3. Selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.\n4. Confirme clicando em **"Instalar"**. Pronto! O PaxFlow aparecerá na sua gaveta de aplicativos e na tela inicial.'
  },
  {
    id: 'alerta-passaporte-validade',
    modulo: 'clientes',
    label: 'Alerta e Gestão de Validade de Passaportes',
    description: 'Regras de antecedência (SLA de 180 dias) para viagem internacional e visto.',
    details: 'Muitos países exigem que o passaporte do passageiro tenha no mínimo 6 meses (180 dias) de validade a partir da data de entrada ou retorno.\n\n- O PaxFlow calcula automaticamente o prazo de expiração do documento cadastrado na ficha do cliente e sinaliza no Inbox e nos cards com alertas visuais amarelos (Atenção) ou vermelhos (Crítico/Vencido).'
  },
  {
    id: 'upload-google-drive',
    modulo: 'clientes',
    label: 'Upload Seguro de Documentos (Google Drive Agência)',
    description: 'Armazenamento seguro e organizado de documentos, passaportes e vouchers.',
    details: 'Os arquivos e anexos de clientes são processados e enviados diretamente para o armazenamento seguro da agência.\n\n- Imagens enviadas passam por compilação e otimização local via Canvas API, garantindo arquivos leves e visualização rápida no Lightbox inline.'
  },
  {
    id: 'importador-pnr-1clique',
    modulo: 'viagens',
    label: '⚡ Importador de PNR e E-mails de Emissão (1-Clique)',
    description: 'Como importar reservas de voos e hotéis colando o e-mail de confirmação da cia aérea ou GDS.',
    details: 'No formulário de inclusão de novos produtos da viagem, clique no botão "⚡ Importar PNR / E-mail". Cole o texto completo da confirmação recebida (Gol, Azul, LATAM, Amadeus, Sabre) e clique em "Processar Dados". O PaxFlow fará a leitura inteligente do Localizador (LOC), Fornecedor e trechos do voo, preenchendo os campos automaticamente sem digitação manual.'
  },
  {
    id: 'documentos-nacionais-risk-score',
    modulo: 'viagens',
    label: '🛡️ Documentos Nacionais (RG/CNH) e Abatimento no Risk Score™',
    description: 'Como os anexos de vouchers e identidades impactam a nota de saúde operacional da viagem.',
    details: 'O PaxFlow Risk Score™ avalia a conformidade documental e logística da viagem em tempo real:\n\n- **Viagens Nacionais e Mercosul**: Passageiros que apresentarem RG ou CNH anexados têm sua conformidade documental validada, sem sofrer penalidades por ausência de passaporte internacional.\n- **Abatimento Automático de Pendências**: Ao anexar vouchers de hotéis, passagens aéreas ou apólices de seguro, o sistema reconhece automaticamente os comprovantes e remove os alertas de pendência de voucher, elevando a nota de saúde operacional da viagem rumo aos 100 pontos.'
  },
  {
    id: 'compartilhamento-whatsapp-documentos',
    modulo: 'viagens',
    label: '💬 Compartilhamento de Vouchers e Ingressos via WhatsApp',
    description: 'Como enviar links seguros de vouchers e bilhetes para o passageiro com 1 clique.',
    details: 'Em cada card de documento anexado na viagem ou no passageiro, você encontra o botão com o ícone do **WhatsApp**:\n\n1. Clique no botão de WhatsApp do documento desejado.\n2. O PaxFlow gera uma mensagem educada e personalizada com o nome do passageiro, a identificação do voucher/ingresso e o link seguro de acesso.\n3. O WhatsApp Web (ou o app no celular) é aberto automaticamente com a conversa pronta para envio com apenas um "Enter".'
  },
  {
    id: 'painel-preditivo-risco',
    modulo: 'processos',
    label: '🚨 Painel Preditivo de Risco de Cancelamento & Churn',
    description: 'Como a inteligência do PaxFlow detecta e previne perda de cotações e problemas no embarque.',
    details: 'Disponível no menu Relatórios (aba "Previsão de Risco & Churn") e no Dashboard. O algoritmo varre o sistema 24/7 e sinaliza:\n- **Risco Comercial**: Orçamentos com leads esfriando por falta de contato (Quente > 48h, Morno > 5d, Frio > 10d), ordenados pelo ticket financeiro.\n- **Risco Operacional**: Viagens prestes a embarcar nos próximos N dias com pendências de conferência de LOC, passaportes a vencer no SLA ou ausência de vouchers.\n- **Ações de 1-Clique**: Cada card de risco possui botões rápidos para disparar mensagens no WhatsApp, agendar lembretes urgentes no Inbox ou abrir a ficha do cliente/viagem.'
  },
  {
    id: 'acoes-massa-clientes',
    modulo: 'clientes',
    label: '🏷️ Seleção e Ações em Massa (Batch Operations)',
    description: 'Como selecionar múltiplos clientes para aplicar tags ou enviar comunicados de uma só vez.',
    details: 'Na página de Clientes, marque a caixa de seleção (checkbox) ao lado de cada cliente desejado. Uma barra de ações flutuante surgirá na parte inferior da tela permitindo aplicar etiquetas/tags em massa (ex: "VIP", "Disney 2027") para todo o grupo de 1 só vez.'
  },
  {
    id: 'trava-alteracoes-nao-salvas',
    modulo: 'processos',
    label: '🛡️ Trava de Segurança para Alterações Não Salvas',
    description: 'Proteção automática contra descarte acidental de formulários em edição.',
    details: 'Ao preencher ou editar fichas de clientes, orçamentos ou viagens, o PaxFlow detecta se houver modificações pendentes. Caso tente fechar o modal ou sair da página sem salvar, o sistema exibirá uma tela de alerta solicitando sua confirmação antes de descartar os dados.'
  },
  {
    id: 'paxflow-next-trip-engine',
    modulo: 'processos',
    label: '🎯 Next Trip Engine™ — Inteligência Comercial de Recompra',
    description: 'Central preditiva que monitora o ciclo de vida dos clientes da agência e identifica a janela ideal para nova abordagem comercial.',
    details: 'O **Next Trip Engine™** é a central de inteligência preditiva do PaxFlow, projetada para identificar automaticamente os clientes da agência no momento exato em que estão propensos a comprar uma nova viagem.\n\n### 🧠 Como Funciona o Algoritmo Preditivo (5 Vetores):\n1. **Janela Temporal Pós-Viagem**: Avalia clientes com viagens concluídas há mais de 90 dias (excluindo viagens recentes ou em andamento).\n2. **Histórico de Satisfação (NPS)**: Prioriza clientes promotores (notas 9 e 10) e neutros com avaliações positivas anteriores.\n3. **Sazonalidade e Mês de Férias**: Identifica o mês habitual em que o cliente costuma embarcar e viaja com a agência.\n4. **Perfil de Destino & Passageiros**: Recomenda destinos afins com base no número de passageiros e no estilo das viagens anteriores.\n5. **SLA e Carência Comercial**: Controla automaticamente os intervalos de abordagem para garantir que o cliente não seja contatado repetidamente.\n\n### 🎯 Níveis de Potencial de Recompra:\n- **🔥 Alto Potencial (Score >= 75)**: Clientes na janela ideal de abordagem comercial com altíssima taxa de conversão.\n- **⏳ Médio Potencial**: Clientes em fase de aquecimento gradual que devem ser acompanhados para os próximos meses.\n\n### ⚡ Ações Rápidas em 1-Clique:\n- **🎯 Criar Orçamento Preditivo**: Abre o formulário de novo orçamento pré-preenchido com o cliente e a sugestão de destino do algoritmo.\n- **💬 Abordagem via WhatsApp**: Abre modal interativo com template de mensagem contextualizado com a última viagem do cliente.\n- **⏸️ Snooze (30 Dias)**: Adia temporariamente o cliente da fila ativa por 30 dias para evitar abordagens duplicadas.'
  },
  {
    id: 'studio-propostas',
    modulo: 'processos',
    label: '✨ PaxFlow Studio™ — Roteiros & Propostas Digitais de Luxo',
    description: 'Central em Split Screen para criação ágil de propostas com Live Preview em tempo real, lâminas de caderno em PDF e aprovação online.',
    details: 'O **PaxFlow Studio™** é a ferramenta de ponta a ponta do PaxFlow para elaboração de propostas comerciais e cadernos de viagem de alto impacto visual e rigor documental.\n\n### 🚀 Recursos & Inovações da Interface:\n1. **Galeria Unsplash™ com Tradução Semântica**: Busca inteligente de fotos de capa em altíssima resolução. Traduz automaticamente termos em Português (PT-BR) para Inglês (EN) (ex: *praia -> tropical beach*, *neve -> snow*, *vinhedos -> wine*, *maldivas*) e oferece pills rápidas com sugestões temáticas.\n2. **Customização de Branding / Tagline**: Altere livremente o título da capa (padrão *"PAXFLOW LUXURY TRAVEL"*) para o nome da sua agência, slogan ou título de campanha exclusiva, refletindo instantaneamente no Live Preview, Proposta Pública e Caderno PDF.\n3. **Card do Consultor Dedicado**: Vincule o consultor responsável pela proposta com auto-preenchimento de foto/avatar, cargo e botões de ação rápida com 1-toque (*💬 Falar no WhatsApp* com mensagem personalizada e *📞 Ligar*).\n4. **Modo Split Screen (Tela Dividida)**: Editor estruturado à esquerda e **Live Preview em Tempo Real** à direita. Qualquer alteração em dados do passageiro, capa ou atividades reflete imediatamente na proposta visual de luxo, sem refresh e sem perda de foco do teclado.\n5. **Controles de Visualização (Desktop & Mobile)**: Alterne no topo do Live Preview entre a visão de tela cheia ou o simulador de smartphone para garantir uma experiência perfeita ao cliente.\n6. **Barra Inferior Fixa & Atalho [Ctrl+S]**: Barra sempre visível no rodapé com indicador de status em tempo real (*Modificações pendentes* vs *Todas as alterações salvas no banco*), botão em destaque para salvar, impressão de Caderno PDF, cópia do Link do Cliente e efetivação direta em viagem confirmada.\n7. **Gaveta Lateral de Propostas (Drawer)**: Acesso instantâneo a todas as propostas salvas na agência com busca rápida por cliente ou destino pelo botão **Minhas Propostas**.\n8. **Modal Focado de Atividades**: Formulário dedicado e espaçoso para cada tipo de serviço (Voos com catálogo oficial de cias aéreas, Hotéis com regimes de alimentação, Transfers, Seguros e Passeios).\n9. **Ingestão com Fidelidade Estrita**: Arraste múltiplos PDFs de consolidadoras ou cole mensagens de WhatsApp para extrair automaticamente trechos, voos, hotéis e vouchers.'
  },
  {
    id: 'lead-aging-quick-actions',
    modulo: 'orcamentos',
    label: '⏱️ Lead Aging e Menu de Ações Rápidas (⋮) nos Cards',
    description: 'Como identificar leads estagnados por tempo na etapa e realizar ações de 1-toque no card.',
    details: 'O Kanban de Orçamentos traz dois recursos para elevar a produtividade comercial:\n\n- **Lead Aging (Tempo na Etapa)**: Badges visuais calculam os dias corridos em que a oportunidade permanece no estágio atual: 🟢 **Recente** (até 2 dias), 🟡 **Moderado** (3 a 5 dias) e 🔴 **Crítico** (mais de 5 dias parado, com efeito pulsante).\n- **Menu de Ações Rápidas (⋮)**: No topo direito de cada card, o botão de três pontinhos abre um menu de atalhos rápidos: alteração de temperatura com 1-toque (🔥 Quente, ⚡ Normal, ❄️ Frio), disparo direto de WhatsApp, agendamento de lembrete automático para daqui a 2 dias e visualização de notas.'
  },
  {
    id: 'abas-status-reembolsos',
    modulo: 'reembolsos',
    label: '📊 Abas de Status com Contadores Dinâmicos em Reembolsos',
    description: 'Como filtrar processos de cancelamento e acompanhar volumetrias por etapa com 1-clique.',
    details: 'A Central de Reembolsos conta com uma barra superior de abas dinâmicas que exibem a contagem em tempo real de cada estágio operacional:\n\n- **Todos (N)**: Visão consolidada de todas as solicitações da agência.\n- **⏳ Solicitados (N)**: Processos em abertura ou aguardando resposta inicial do fornecedor.\n- **🔍 Em Análise (N)**: Processos sob auditoria de tarifas, no-show ou multas de contrato.\n- **✅ Aprovados / Pagos (N)**: Reembolsos autorizados e liquidados financeiramente.\n- **❌ Recusados / Cancelados (N)**: Processos indeferidos ou cancelados.\n\nBasta clicar na aba desejada para filtrar a tabela instantaneamente, com suporte conjunto à barra de pesquisa em tempo real.'
  },
  {
    id: 'studio-sync-scroll',
    modulo: 'processos',
    label: '🔄 Sync Scroll Espelhado no PaxFlow Studio™',
    description: 'Rolagem sincronizada e suave entre o editor estruturado e o Live Preview em tempo real.',
    details: 'Ao editar roteiros no PaxFlow Studio™ em telas amplas (desktop), o container do **Live Preview** espelha automaticamente a rolagem vertical da coluna de edição.\n\nConforme você rola a página para baixo para cadastrar o Dia 2, Dia 3 ou novos serviços, a prévia visual acompanha a mesma proporção de rolagem, permitindo inspecionar o resultado visual do caderno sem precisar alternar o foco manualmente.'
  },
  {
    id: 'drag-drop-vouchers-produtos',
    modulo: 'viagens',
    label: '📂 Drag & Drop de Vouchers Diretamente sobre o Produto',
    description: 'Como anexar bilhetes, apólices e confirmações arrastando arquivos sobre os cards de serviços.',
    details: 'No modal de edição e gestão de produtos da viagem, você pode anexar documentos de forma imediata:\n\n1. Arraste qualquer arquivo PDF ou imagem do seu computador diretamente para o card do produto correspondente.\n2. O card exibirá uma borda tracejada em destaque índigo confirmando a zona de soltura.\n3. Ao soltar o arquivo, o PaxFlow abre imediatamente a janela de identificação com o produto e o passageiro pré-vinculados, permitindo salvar o voucher no Google Drive em 1-toque.'
  },
  {
    id: 'atalho-ctrl-enter',
    modulo: 'geral',
    label: '⌨️ Atalho Universal [Ctrl + Enter] para Envio Rápido',
    description: 'Economize tempo enviando comentários, mensagens da inbox, notas e salvando formulários pelo teclado.',
    details: 'Em qualquer campo de texto ou formulário de notas e mensagens do PaxFlow, utilize o atalho de teclado:\n\n- **Windows/Linux**: `Ctrl + Enter`\n- **macOS**: `Cmd + Enter`\n\nDisponível na **Caixa de Comentários** (produtos, orçamentos e viagens), no modal de **Nova Mensagem da Inbox**, nos **Detalhes de Orçamento** e no formulário de **Edição de Viagem**.'
  },
  {
    id: 'completude-cadastral-cliente',
    modulo: 'clientes',
    label: '📊 Barra de Completude Cadastral (Profile Completeness)',
    description: 'Auditoria proativa de dados e documentos dos viajantes com checklist de pendências.',
    details: 'Na Ficha do Cliente, um indicador visual exibe o percentual de preenchimento dos dados cadastrais:\n\n- 🔴 **< 50% (Baixo)**: Faltam dados essenciais como documento ou telefone.\n- 🟡 **50% a 79% (Médio)**: Contatos básicos preenchidos, mas faltam dados como passaporte ou data de nascimento.\n- 🟢 **80%+ (Alto/Completo)**: Ficha com governança completa pronta para emissão internacional.\n\nPasse o mouse sobre o badge para visualizar a lista detalhada do que já foi concluído e quais itens estão pendentes de preenchimento.'
  },
  {
    id: 'customer-360-timeline',
    modulo: 'clientes',
    label: '⏱️ Linha do Tempo Unificada do Cliente (Customer 360°)',
    description: 'Histórico cronológico completo com todas as interações, orçamentos, viagens e documentos do passageiro.',
    details: 'Na Ficha do Cliente, acesse a aba **Linha do Tempo 360°** para visualizar a jornada completa do viajante com a agência em ordem cronológica reversa:\n\n- 👤 **Cadastro Inicial**: Data de entrada do cliente na base.\n- 📋 **Orçamentos Criados**: Propostas solicitadas e status de negociação.\n- ✈️ **Viagens Operacionais**: Vendas confirmadas, localizadores (LOCs) e valores.\n- 🪪 **Documentos Anexados**: Passaportes, vistos e vouchers arquivados no Google Drive.\n- ⭐ **Avaliações NPS**: Notas e depoimentos recebidos no pós-viagem.'
  },
  {
    id: 'wizard-conversao-orcamento',
    modulo: 'orcamentos',
    label: '🏆 Mini-Wizard de Conversão de Orçamento em Viagem',
    description: 'Assistente passo a passo em 2 etapas intuitivas para formalização de vendas e emissão operacional.',
    details: 'Ao clicar em **Vender 🏆** no card de orçamento em fase "Aguardando", o assistente passo a passo divide o processo em 2 etapas guiadas:\n\n1. **Passo 1 — Validação do Passageiro**: Valida e formata nome, e-mail, telefone/WhatsApp, CPF/CNPJ com máscara e data de nascimento.\n2. **Passo 2 — Dados de Roteiro & Finanças**: Define destino com busca inteligente, datas de embarque/retorno, valor da venda e notas operacionais (ou vinculação a viagem existente).\n\nAo concluir, a ficha única do passageiro e a viagem são emitidas automaticamente no sistema com zero retrabalho.'
  },
  {
    id: 'studio-reordenacao-dias',
    modulo: 'processos',
    label: '🗺️ Reordenação Drag & Drop de Dias do Roteiro no Studio',
    description: 'Como reorganizar a sequência dos dias de viagem arrastando os blocos pelo mouse.',
    details: 'No editor do **PaxFlow Studio™**, cada bloco de dia do itinerário conta com uma alça de arraste (`⋮⋮`):\n\n1. Clique e segure na alça do dia que deseja mover (ex: Dia 3).\n2. Arraste até a nova posição desejada (ex: antes do Dia 1) e solte.\n3. O PaxFlow renumera automaticamente todos os dias sequencialmente (`diaNumero`), mantendo todas as atividades e refletindo a nova ordem no Live Preview em tempo real.'
  },
  {
    id: 'swipe-actions-mobile',
    modulo: 'dashboard',
    label: '📱 Gestos de Deslizar nos Cards Mobile (Swipe Actions)',
    description: 'Atalhos por gestos nativos de toque para atendimento rápido no smartphone.',
    details: 'Ao acessar o PaxFlow no celular ou tablet, utilize gestos de toque sobre os cards de viagens:\n\n- 👉 **Deslizar para a Direita**: Abre imediatamente o atalho de mensagem de WhatsApp para o passageiro.\n- 👈 **Deslizar para a Esquerda**: Abre a gaveta de detalhes completos da viagem operacional.'
  },
  {
    id: 'conciliacao-bancaria',
    modulo: 'conciliacao',
    label: '🪙 Visão Geral da Conciliação Bancária (FinRecon™)',
    description: 'Casamento inteligente de extratos bancários com recebimentos de vendas e fechamento contábil.',
    details: 'O módulo **PaxFlow FinRecon™** permite conciliar os lançamentos reais da conta bancária da agência com os recebimentos cadastrados nas viagens (LOCs):\n\n- 📁 **Importação de Extratos**: Suporte para arquivos `.ofx` e `.csv` dos principais bancos (Itaú, Bradesco, Santander, Inter, Nubank, BB, C6).\n- ⚡ **Smart Matching**: Algoritmo que calcula proximidade de valor (±0% a 5%), proximidade de data (±3 dias) e correspondência do código de localizador (LOC) ou nome do passageiro.\n- 🔗 **Casamento Flexível**: Conciliação 1:1 e 1:N (um único depósito liquidando múltiplas parcelas ou viagens).\n- 💳 **Taxa de Gateway / Cartão**: 1-clique para absorver a diferença líquida de taxas cobradas por maquininhas ou adquirentes.\n- 🔒 **Fechamento de Competência**: Trancamento do mês após validação financeira para proteção contra alterações retroativas.'
  },
  {
    id: 'importar-extrato-bancario',
    modulo: 'conciliacao',
    label: '📥 Como Importar Extratos Bancários (OFX e CSV)',
    description: 'Passo a passo para baixar e enviar o extrato do Internet Banking para o PaxFlow.',
    details: '1. Acesse seu banco online e exporte o extrato do período desejado no formato **OFX** (preferencial) ou **CSV**.\n2. No PaxFlow, acesse **Conciliação** no menu lateral e clique em **📁 Importar Extrato**.\n3. Selecione o banco de origem e arraste o arquivo para a área de upload.\n4. O sistema processará as transações instantaneamente e apresentará a prévia antes de gravar no banco de dados com arquivamento seguro no Storage.'
  },
  {
    id: 'justificar-entradas-bancarias',
    modulo: 'conciliacao',
    label: '🏷️ Justificar Entradas e Saídas Não Operacionais',
    description: 'Como classificar aportes de sócios, rendimentos de investimentos e transferências entre contas.',
    details: 'Nem toda entrada no banco é oriunda de vendas de viagens:\n\n1. Na aba **Pendentes no Extrato**, clique no botão **🏷️ (Justificar)** ao lado do lançamento.\n2. Escolha a categoria correspondente: *Aporte de Capital*, *Rendimento de Aplicação*, *Transferência entre Contas*, *Empréstimo* ou *Estorno de Fornecedor*.\n3. Insira uma breve observação explicativa e salve. O lançamento será conciliado e computado no saldo resolvido da agência.'
  }
];


