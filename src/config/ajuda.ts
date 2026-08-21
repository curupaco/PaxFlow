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
  { id: 'geral', title: 'Conceitos Gerais & Gamificação', icon: '💡' },
  { id: 'dashboard', title: 'Dashboard & Metas', icon: '🏆' },
  { id: 'viagens', title: 'Gestão de Viagens', icon: '✈️' },
  { id: 'orcamentos', title: 'Orçamentos & CRM', icon: '📄' },
  { id: 'reembolsos', title: 'Reembolsos & Financeiro', icon: '💰' },
  { id: 'clientes', title: 'Clientes & Relatórios', icon: '👥' }
];

export const HELP_ITEMS: HelpItem[] = [
  // 1. Conceitos Gerais
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

  // 2. Dashboard & Metas
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

  // 3. Gestão de Viagens
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

  // 4. Orçamentos & CRM
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

  // 5. Reembolsos & Financeiro
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

  // 6. Clientes & Relatórios
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
  }
];
