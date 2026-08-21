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
  { id: 'geral', title: 'Conceitos Gerais & Gamificação', icon: '💡' },
  { id: 'cadastros', title: 'Cadastros & Modelos', icon: '📋' },
  { id: 'dashboard', title: 'Dashboard & Metas', icon: '🏆' },
  { id: 'viagens', title: 'Gestão de Viagens', icon: '✈️' },
  { id: 'orcamentos', title: 'Orçamentos & CRM', icon: '📄' },
  { id: 'reembolsos', title: 'Reembolsos & Financeiro', icon: '💰' },
  { id: 'clientes', title: 'Clientes & Relatórios', icon: '👥' }
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
    details: 'Quando o cliente aprova uma proposta:\n\n1. No card do orçamento (estágio "Aguardando"), clique em **Aceitar / Vender**.\n2. **Dados Cadastrais Obrigatórios**: O PaxFlow exige que o cliente tenha CPF ou CNPJ cadastrado e a Data de Nascimento preenchida. Se faltar, um modal abrirá para você preencher imediatamente.\n3. **Geração Automática**: Assim que você confirma, o orçamento é finalizado e o sistema cria automaticamente uma **Viagem** correspondente no menu operacional, importando os dados e notas da negociação. Você não precisa redigitar nada!'
  },
  {
    id: 'dicas-atalhos',
    modulo: 'onboarding',
    label: 'Dicas Práticas de Produtividade e Navegação',
    description: 'Pequenos truques para otimizar sua rotina operacional e ganhar tempo.',
    details: 'Aproveite estes recursos para navegar mais rápido:\n\n- **Teclado**: Use a tecla `Esc` para fechar rapidamente qualquer modal ou visualizador de documentos no sistema.\n- **Links Rápidos (Contacts)**: Na visualização de orçamentos e viagens, clique nos botões de contato ao lado do nome do cliente para abrir diretamente o WhatsApp Web com o número dele pré-preenchido, ou iniciar um e-mail.\n- **Notificações Integradas**: Se você enviar um e-mail interno para um colega, pode marcar a caixa "Agendar Lembrete" para inserir automaticamente uma tarefa no calendário dele.'
  },

  // ==================== 1. Fluxos de Trabalho & SLAs ====================
  {
    id: 'conferencia-loc',
    modulo: 'processos',
    label: 'Processo de Quitação e Conferência de LOC',
    description: 'Como funciona a validação financeira de reservas e o bloqueio de segurança.',
    details: 'Para garantir a segurança financeira das vendas, o PaxFlow adota a conferência por Localizador (LOC):\n\n1. **Detalhamento Financeiro**: Cada produto ou serviço (voo, hotel, etc.) inserido em uma viagem exige que seu valor total de venda seja quitado por meio de formas de recebimento cadastradas (dinheiro, pix, cartão, etc.). O sistema valida se a soma dos pagamentos fecha exatamente com o total do produto.\n2. **Conferência Financeira**: Uma vez que os pagamentos estejam corretos, um **administrador** pode clicar em `Conferir` no cabeçalho do LOC.\n3. **Bloqueio de Segurança**: A conferência do LOC trava todas as edições, adições, exclusões e modificações financeiras daquele produto específico. Apenas a inserção de notas operacionais permanece aberta.'
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
    label: 'XP e Sistema de Níveis',
    description: 'Pontuação de experiência (XP) acumulada pelos consultores ao cadastrar e concluir vendas.',
    details: 'Cada ação no PaxFlow gera pontos de experiência (XP) para o consultor, que evolui de nível e ganha patentes (ex: Agente Iniciante, Explorador, Diretor de Viagens). Vendas maiores e NPS alto dão bônus de XP.'
  },
  {
    id: 'inbox-alertas',
    modulo: 'geral',
    label: 'Inbox e Alertas de Pós-Venda',
    description: 'Central de notificações e tarefas operacionais automatizadas.',
    details: 'O Inbox do PaxFlow avisa o consultor em momentos críticos do ciclo da viagem:\n\n1. Envio de vouchers antes do embarque.\n2. Verificação de check-in pendente.\n3. Disparo automático de NPS após o retorno.\n4. Alertas de aniversários e reembolsos atrasados.'
  },
  {
    id: 'comentarios-mencoes',
    modulo: 'geral',
    label: 'Comentários, Menções (@) e Agendamentos Automáticos por Texto',
    description: 'Como colaborar com colegas e delegar lembretes digitando na caixa de texto.',
    details: 'Dentro de qualquer orçamento ou viagem, você pode colaborar usando anotações. A ferramenta possui um motor inteligente de texto:\n\n- **Menções (@)**: Ao digitar `@`, o sistema exibe um menu para escolher um colega de equipe, que será notificado por e-mail e receberá um alerta no Inbox.\n- **Agendamento Inteligente (Regex)**: Se você digitar uma menção seguida por uma data e período no comentário, o PaxFlow agenda o lembrete automaticamente no calendário do colega!\n  * Exemplo: `@Amanda favor verificar reservas em 25/08/2026 tarde`.'
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
    details: 'O PaxFlow adota controle estrito de acessos (Role-Based Access Control):\n\n- **Consultor**: Cria e edita clientes, orçamentos e viagens associados a si. Não visualiza informações financeiras confidenciais de outros consultores e não possui permissão de exclusão (botões de deletar ficam ocultos).\n- **Administrador**: Tem visão total da agência, executa auditorias comerciais de toda a equipe, gerencia configurações, cadastros dinâmicos e é o único autorizado a realizar exclusões permanentes no sistema.'
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
    label: 'Cálculo da Meta (Bruto vs Lucro)',
    description: 'Forma como o progresso das metas financeiras é medido (Faturamento Bruto ou Lucro Real).',
    details: 'As campanhas de metas podem ser configuradas de duas formas:\n\n1. **Faturamento Bruto**: Soma de todos os valores totais de venda das viagens menos descontos e prejuízos.\n2. **Lucro Real**: Soma de Markup + Comissões + 88% do RAV (taxa de serviço).'
  },
  {
    id: 'acumulado-equipe',
    modulo: 'dashboard',
    label: 'Acumulado da Equipe',
    description: 'A soma de todo o progresso (faturamento ou lucro) atingido por todos os consultores ativos.',
    details: 'É o valor consolidado de produção da agência inteira na campanha selecionada. Permite comparar o resultado coletivo atual com a última faixa de metas da agência.'
  },
  {
    id: 'faixas-premiacao',
    modulo: 'dashboard',
    label: 'Faixas de Premiação',
    description: 'Níveis de metas a serem atingidos durante a campanha comercial.',
    details: 'Cada campanha comercial define faixas de valores (ex: Bronze, Prata, Ouro) com prêmios associados. Ao atingir o valor mínimo de uma faixa, o prêmio correspondente é desbloqueado para o consultor.'
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

  // ==================== 4. Gestão de Viagens ====================
  {
    id: 'markup',
    modulo: 'viagens',
    label: 'Markup',
    description: 'Valor de lucro líquido adicionado sobre o custo fornecido pelos parceiros.',
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
    details: 'A comissão representa a receita gerada a partir da intermediação de serviços (como hotéis, passagens aéreas e receptivos). Ela é somada ao cálculo do Lucro Real de cada viagem.'
  },
  {
    id: 'rav',
    modulo: 'viagens',
    label: 'RAV (Remuneração de Agente de Viagens)',
    description: 'Taxa de serviço cobrada diretamente do cliente pela emissão ou consultoria.',
    details: 'A RAV é a taxa de emissão de passagens ou taxa de serviço cobrada do cliente. No cálculo do Lucro Real do PaxFlow, a RAV é contabilizada com um fator de 88% para descontar taxas fiscais e administrativas padrão (ex: impostos e taxas de cartão).'
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
    label: 'Detalhamento de Preços de Serviços',
    description: 'Como ratear os custos e a venda dos itens de uma viagem.',
    details: 'Na aba "Produtos e Serviços", ao clicar em um item cadastrado, abre-se um modal de detalhamento. O valor de venda deve ser quebrado entre **Tarifa líquida (custo)**, **Taxas** e **Comissões**.\n\nO sistema impede o fechamento operacional se a soma de Tarifa + Taxa + Comissão diferir do valor de venda final cadastrado.'
  },
  {
    id: 'itinerario-digital',
    modulo: 'viagens',
    label: 'Itinerário Digital Público para Clientes',
    description: 'A página móvel externa para o passageiro acompanhar a viagem.',
    details: 'O PaxFlow gera um link exclusivo sem autenticação (`#itinerario?id=UUID`) para o cliente final. Na tela, o cliente tem acesso a um cronograma de reservas com contagem regressiva para o embarque. Por segurança, informações como custos internos, markups e comissões são 100% ocultadas.'
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
    label: 'Upload e Compactação de Documentos de Clientes',
    description: 'Como funciona o envio de fotos de passaporte e vouchers de forma eficiente.',
    details: 'Ao anexar imagens (JPEG/PNG) na ficha do cliente ou nas viagens, o PaxFlow realiza um pré-processamento via Canvas API no navegador. Ele redimensiona a imagem para resoluções ideais e a compacta, reduzindo arquivos pesados de celulares de ~5MB para blobs levíssimos de <50KB antes de subir ao Supabase Storage. Isso garante economia de espaço e carregamento rápido.'
  },
  {
    id: 'lightbox-documentos',
    modulo: 'clientes',
    label: 'Visualizador de Documentos Incorporado (Lightbox)',
    description: 'Leitura inline de passaportes e propostas comerciais sem sair da tela.',
    details: 'Documentos em PDF ou imagem anexados podem ser visualizados diretamente na interface do PaxFlow com o modal glassmorphic de Lightbox. Para links legados do Google Drive, o sistema dispõe de um botão de redirecionamento imediato.'
  },
  {
    id: 'identidade-visual-branding',
    modulo: 'clientes',
    label: 'Configurações de Marca da Agência (White-Label)',
    description: 'Como personalizar as telas públicas com logotipo e cores da sua agência.',
    details: 'Administradores podem acessar a aba de Configurações para remover os logotipos do PaxFlow e definir a cor primária hexadecimal corporativa. Isso se aplica automaticamente às páginas de Itinerário Digital e Pesquisa NPS visualizadas pelo passageiro final.'
  },
  {
    id: 'auto-status-em-andamento',
    modulo: 'orcamentos',
    label: 'Automação: Início do Atendimento (Orçamentos)',
    description: 'O orçamento passa de "Solicitado" para "Em Andamento" de forma automática ao interagir com o lead.',
    details: 'Quando um novo orçamento (Lead) entra no sistema, ele inicia no estágio "Solicitado". Assim que qualquer consultor abre a ficha deste orçamento e adiciona a primeira anotação, observação interna ou envia uma mensagem na linha do tempo, o PaxFlow entende que o atendimento foi iniciado e altera o status do orçamento automaticamente para "Em Andamento".\n\nIsso evita que o consultor precise clicar manualmente para atualizar o estágio, mantendo o funil comercial preciso e gerando métricas corretas de tempo de resposta do primeiro atendimento.'
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
    details: 'Se a sua agência possui a integração do Digisac habilitada (com token, domínio e ID de serviço configurados), a tela de disparo de mensagens de templates exibe um painel lateral em tela dividida (Split-screen) com o histórico de mensagens.\n\n* **Carregamento Automático**: O sistema busca as últimas mensagens trocadas com o telefone do cliente no canal do Digisac na hora em que o modal de envio é aberto.\n* **Atualização Manual**: Você pode clicar em "Atualizar 🔄" no canto superior do histórico de conversas para carregar novas mensagens enviadas ou recebidas.\n* **Fallback Sandbox**: Se a API do Digisac estiver offline ou houver restrições locais de conexão de rede, a tela exibirá uma simulação das últimas mensagens (modo demonstração) de forma a garantir a estabilidade da interface.'
  },
  {
    id: 'central-de-cadastros-modulo',
    modulo: 'cadastros',
    label: 'Estrutura da Central de Cadastros (6 Abas)',
    description: 'Conheça o menu unificado de Cadastros para administradores.',
    details: 'A Central de Cadastros reestruturada reúne todas as definições operacionais da agência em 6 abas:\n\n1. **Tipos de Serviços**: cadastro dinâmico de produtos, cores e campos extras.\n2. **Gestão de Destinos**: cadastro e higienização de cidades e países de viagens.\n3. **Formas de Recebimento**: gestão de opções de pagamento (Pix, Cartão, Dinheiro).\n4. **Campanhas**: criação e controle de campanhas internas de incentivo por período.\n5. **Metas Financeiras**: parametrização de metas (faturamento bruto ou lucro real) e faixas de premiação.\n6. **Modelos de Mensagem**: templates para WhatsApp com variáveis reativas e histórico Digisac.'
  }
];

