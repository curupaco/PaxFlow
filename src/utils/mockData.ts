import { Cliente, Viagem, ProdutoViagem, Orcamento, PerfilConsultor, AlertItem, Reembolso, TipoProduto } from '../types';

export const MOCK_CONSULTORES: PerfilConsultor[] = [
  {
    id: 'sandbox-user-id',
    nome: 'Consultor Demonstrativo',
    email: 'consultor.fake@paxflowdemo.com',
    role: 'admin',
    ativo: true,
    avatar_url: 'lion',
    xp: 1500,
    nivel: 3
  },
  {
    id: 'sandbox-consultor-juliana',
    nome: 'Juliana Santos',
    email: 'juliana.fake@paxflowdemo.com',
    role: 'admin',
    ativo: true,
    avatar_url: 'panda',
    xp: 4500,
    nivel: 8
  },
  {
    id: 'sandbox-consultor-pedro',
    nome: 'Pedro Alencar',
    email: 'pedro.fake@paxflowdemo.com',
    role: 'consultor',
    ativo: true,
    avatar_url: 'fox',
    xp: 2200,
    nivel: 4
  },
  {
    id: 'sandbox-consultor-beatriz',
    nome: 'Beatriz Costa',
    email: 'beatriz.fake@paxflowdemo.com',
    role: 'consultor',
    ativo: true,
    avatar_url: 'koala',
    xp: 800,
    nivel: 2
  }
];

export const MOCK_CLIENTES: Cliente[] = [
  {
    id: 'sandbox-cliente-1',
    nome: 'João da Silva Fictício',
    email: 'joao.fake@paxflowdemo.com',
    telefone: '(11) 98888-8881',
    documento: '453.647.280-05', // CPF válido matemático
    dataNascimento: '1980-05-15',
    endereco: 'Rua das Simulações, 123 - Centro',
    observacoes: 'Passageiro frequente do modo Sandbox.',
    consultorResponsavelId: 'sandbox-user-id',
    passaporteNumero: 'FP987654',
    passaporteValidade: '2026-08-10', // SLA urgente (< 180 dias do dia 23/06/2026)
    vistosInformacoes: 'Visto Americano B1/B2 ativo até 2030.',
    googleDriveFolderUrl: '/documento_demo.pdf', // Simulação do visualizador inline
    classificacoes: ['Premium', 'Frequente']
  },
  {
    id: 'sandbox-cliente-2',
    nome: 'Maria de Orlando Fake',
    email: 'maria.fake@paxflowdemo.com',
    telefone: '(11) 98888-8882',
    documento: '34.789.120/0001-31', // CNPJ válido matemático
    dataNascimento: '1975-10-20',
    endereco: 'Av. das Cotações, 500 - Orlando',
    observacoes: 'Cliente corporativo com alta recorrência.',
    consultorResponsavelId: 'sandbox-user-id',
    passaporteNumero: 'MP123456',
    passaporteValidade: '2032-01-15',
    vistosInformacoes: 'Isenta de visto europeu.',
    googleDriveFolderUrl: '/documento_demo.pdf',
    classificacoes: ['Corporativo']
  },
  {
    id: 'sandbox-cliente-3',
    nome: 'Carlos Simulado',
    email: 'carlos.fake@paxflowdemo.com',
    telefone: '(11) 98888-8883',
    documento: '864.293.750-56', // CPF válido matemático
    dataNascimento: '1992-12-01',
    endereco: 'Alameda Fictícia, 99',
    observacoes: 'Viagem de lua de mel simulada.',
    consultorResponsavelId: 'sandbox-user-id',
    passaporteNumero: 'CP456789',
    passaporteValidade: '2026-12-25', // SLA de aviso
    vistosInformacoes: 'Sem vistos cadastrados.',
    googleDriveFolderUrl: '/documento_demo.pdf',
    classificacoes: ['Lazer']
  }
];

export const MOCK_VIAGENS: Viagem[] = [
  {
    id: 'sandbox-viagem-1',
    cliente_id: 'sandbox-cliente-1',
    clienteId: 'sandbox-cliente-1',
    consultor_id: 'sandbox-user-id',
    consultorId: 'sandbox-user-id',
    destino: 'Terra do Nunca',
    data_ida: '2026-06-29', // Próxima (SLA pré-embarque)
    dataIda: '2026-06-29',
    data_volta: '2026-07-15',
    dataVolta: '2026-07-15',
    valor_total: 15450,
    valorTotal: 15450,
    status: 'pre_embarque',
    codigo_localizador: 'LOCFAK1',
    codigoLocalizador: 'LOCFAK1',
    origem: 'São Paulo (GRU)',
    data_financeiro: '2026-06-20',
    dataFinanceiro: '2026-06-20',
    observacoes: 'Verificar se o bilhete do aéreo fake está emitido.',
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 'sandbox-viagem-2',
    cliente_id: 'sandbox-cliente-2',
    clienteId: 'sandbox-cliente-2',
    consultor_id: 'sandbox-user-id',
    consultorId: 'sandbox-user-id',
    destino: 'El Dorado',
    data_ida: '2026-06-01',
    dataIda: '2026-06-01',
    data_volta: '2026-06-15', // Retorno excedido (SLA pós-viagem)
    dataVolta: '2026-06-15',
    valor_total: 24300,
    valorTotal: 24300,
    status: 'pos_viagem',
    codigo_localizador: 'LOCFAK2',
    codigoLocalizador: 'LOCFAK2',
    origem: 'Rio de Janeiro (GIG)',
    data_financeiro: '2026-05-25',
    dataFinanceiro: '2026-05-25',
    observacoes: 'Viagem concluída. Necessário ligar para pós-venda.',
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 'sandbox-viagem-3',
    cliente_id: 'sandbox-cliente-3',
    clienteId: 'sandbox-cliente-3',
    consultor_id: 'sandbox-user-id',
    consultorId: 'sandbox-user-id',
    destino: 'Atlântida',
    data_ida: '2026-08-10',
    dataIda: '2026-08-10',
    data_volta: '2026-08-20',
    dataVolta: '2026-08-20',
    valor_total: 12000,
    valorTotal: 12000,
    status: 'planejamento',
    codigo_localizador: 'LOCFAK3',
    codigoLocalizador: 'LOCFAK3',
    origem: 'Brasília (BSB)',
    data_financeiro: '2026-06-22',
    dataFinanceiro: '2026-06-22',
    observacoes: 'Aguardando envio do contrato assinado pelo cliente.',
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
];

export const MOCK_PRODUTOS: ProdutoViagem[] = [
  {
    id: 'sandbox-produto-1',
    viagemId: 'sandbox-viagem-1',
    tipo: 'AÉREO OPERADORA',
    fornecedor: 'Air Fake',
    descricao: 'Voo GRU - TNE (Terra do Nunca) Ida e Volta',
    codigoReserva: 'LOCAIR1',
    valorCusto: 0,
    valorVenda: 2500,
    status: 'emitido',
    dataServico: '2026-06-29',
    tarifa: 2000,
    taxa: 200,
    comissao: 300,
    markup: 0,
    rav: 0,
    dados_adicionais: { tarifa: 2000, taxa: 200, comissao: 300 }
  },
  {
    id: 'sandbox-produto-2',
    viagemId: 'sandbox-viagem-1',
    tipo: 'HOTEL',
    fornecedor: 'Neverland Palace',
    descricao: 'Suíte Premium 16 noites com Café da Manhã',
    codigoReserva: 'LOCHOT1',
    valorCusto: 0,
    valorVenda: 1000,
    status: 'reservado',
    dataServico: '2026-06-29',
    tarifa: 800,
    taxa: 100,
    comissao: 100,
    markup: 0,
    rav: 0,
    dados_adicionais: { tarifa: 800, taxa: 100, comissao: 100 }
  },
  {
    id: 'sandbox-produto-3',
    viagemId: 'sandbox-viagem-2',
    tipo: 'Circuito',
    fornecedor: 'Mundo Perdido Tours',
    descricao: 'Circuito de Aventura pelas Cidades de Ouro 14 dias',
    codigoReserva: 'LOCCIR1',
    valorCusto: 0,
    valorVenda: 8200,
    status: 'emitido',
    dataServico: '2026-06-01',
    tarifa: 7000,
    taxa: 500,
    comissao: 700,
    markup: 0,
    rav: 0,
    dados_adicionais: { tarifa: 7000, taxa: 500, comissao: 700 }
  }
];

export const MOCK_ORCAMENTOS: Orcamento[] = [
  {
    id: 'sandbox-orcamento-1',
    consultorId: 'sandbox-user-id',
    nomeCliente: 'Paula Cotação Fake',
    contato: '(11) 97777-1111 / paula.fake@paxflowdemo.com',
    destino: 'Ilha da Fantasia',
    dataViagem: '2026-09-12',
    temperatura: 'Quente',
    tags: ['Família', 'Resort'],
    status: 'SOLICITADO',
    valorProposta: 6400,
    origem: 'Instagram',
    notasNegociacao: 'Cliente super interessada no pacote de 7 dias com tudo incluso.',
    documentosUrl: ['/documento_demo.pdf'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'sandbox-orcamento-2',
    consultorId: 'sandbox-user-id',
    nomeCliente: 'Lucas Interesse Fake',
    contato: '(21) 98888-2222 / lucas.fake@paxflowdemo.com',
    destino: 'Asgard (Mitologia)',
    dataViagem: '2026-11-20',
    temperatura: 'Frio',
    tags: ['Aventura', 'Exótico'],
    status: 'EM_ANDAMENTO',
    valorProposta: 15000,
    origem: 'Indicação',
    notasNegociacao: 'Orçamento complexo com passeios temáticos de mitologia nórdica.',
    documentosUrl: [],
    createdAt: new Date().toISOString()
  },
  {
    id: 'sandbox-orcamento-3',
    consultorId: 'sandbox-user-id',
    nomeCliente: 'Guilherme Negociação',
    contato: '(31) 99999-3333 / guilherme@paxflowdemo.com',
    destino: 'Machu Picchu, Peru',
    dataViagem: '2026-10-05',
    temperatura: 'Normal',
    tags: ['Cultura', 'Trilha'],
    status: 'AGUARDANDO',
    valorProposta: 8900,
    origem: 'Google',
    notasNegociacao: 'Voo reservado. Aguardando feedback do cliente sobre o hotel em Cusco.',
    documentosUrl: ['/documento_demo.pdf'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'sandbox-orcamento-4',
    consultorId: 'sandbox-user-id',
    nomeCliente: 'Natália Ganha',
    contato: '(11) 98888-4444 / natalia@paxflowdemo.com',
    destino: 'Paris, França',
    dataViagem: '2026-12-25',
    temperatura: 'Quente',
    tags: ['Europa', 'Lua de Mel'],
    status: 'CONCLUIDO',
    subStatus: 'ACEITO',
    valorProposta: 23700,
    valorViagem: 23700,
    origem: 'Instagram',
    notasNegociacao: 'Venda fechada com sucesso! Upgrade de quarto incluso.',
    documentosUrl: ['/documento_demo.pdf'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'sandbox-orcamento-5',
    consultorId: 'sandbox-user-id',
    nomeCliente: 'Roberto Desistente',
    contato: '(21) 98888-5555',
    destino: 'Buenos Aires, Argentina',
    dataViagem: '2026-08-20',
    temperatura: 'Frio',
    tags: ['América do Sul', 'Show'],
    status: 'CONCLUIDO',
    subStatus: 'DESISTENCIA',
    valorProposta: 4500,
    origem: 'Google',
    notasNegociacao: 'Desistiu devido a alteração de data das férias no trabalho.',
    documentosUrl: [],
    createdAt: new Date().toISOString()
  }
];

export const MOCK_REEMBOLSOS: Reembolso[] = [
  {
    id: 'sandbox-reembolso-1',
    viagemId: 'sandbox-viagem-1',
    viagem_id: 'sandbox-viagem-1',
    produtoViagemId: 'sandbox-produto-2',
    produto_viagem_id: 'sandbox-produto-2',
    consultorSolicitanteId: 'sandbox-user-id',
    consultor_solicitante_id: 'sandbox-user-id',
    valorSolicitado: 1000,
    valor_solicitado: 1000,
    valorAprovado: 900,
    valor_aprovado: 900,
    taxaRetencao: 100,
    taxa_retencao: 100,
    status: 'em_analise',
    observacoesFinanceiras: 'Aguardando confirmação de cancelamento pela Neverland Palace.',
    dataSolicitacao: '2026-06-20',
    data_solicitacao: '2026-06-20',
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
];

export const MOCK_TIPOS_PRODUTO: TipoProduto[] = [
  {
    id: 'tipo-hotel',
    nome: 'HOTEL',
    icone: 'hotel',
    ativo: true,
    campos_adicionais: [
      {
        id: 'hotel-regime',
        label: 'Regime de Alimentação',
        tipo: 'select',
        opcoes: ['Café da Manhã', 'Meia Pensão', 'Pensão Completa', 'All Inclusive'],
        obrigatorio: true,
        alvo: 'dados_adicionais'
      }
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'tipo-aereo',
    nome: 'AÉREO OPERADORA',
    icone: 'flight',
    ativo: true,
    campos_adicionais: [
      {
        id: 'aereo-franquia',
        label: 'Franquia de Bagagem',
        tipo: 'select',
        opcoes: ['Sem Bagagem', '1x 23kg Inclusa', '2x 23kg Inclusas'],
        obrigatorio: true,
        alvo: 'dados_adicionais'
      }
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
];

export const MOCK_ALERTS: AlertItem[] = [
  {
    id: 'sandbox-alert-1',
    type: 'passport',
    title: '⚠️ SLA Passaporte Expirando',
    sender: 'Sistema PaxFlow',
    senderAvatar: 'koala',
    dateStr: 'Hoje',
    subject: 'SLA urgente de validade do passaporte do passageiro João da Silva Fictício',
    body: 'O passaporte do passageiro principal João da Silva Fictício expira em 10/08/2026 (menos de 180 dias do embarque para Terra do Nunca). Favor alertar o cliente sobre a urgência de renovação.',
    targetId: 'sandbox-cliente-1',
    arquivado: false,
    consultorId: 'sandbox-user-id',
    consultorNome: 'Consultor Demonstrativo',
    createdAt: new Date().toISOString(),
    eventDate: '2026-08-10'
  },
  {
    id: 'sandbox-alert-2',
    type: 'direct_message',
    title: 'Juliana Santos',
    sender: 'Juliana Santos',
    senderAvatar: 'panda',
    dateStr: 'Ontem',
    subject: 'Revisão de Rentabilidade do Pós-Venda',
    body: 'Olá! Estava revisando as rentabilidades das viagens fechadas esta semana e notei que a comissão da viagem de El Dorado da Maria ficou excelente! Ótimo trabalho trazendo o circuito da Mundo Perdido Tours.',
    targetId: 'sandbox-viagem-2',
    arquivado: false,
    consultorId: 'sandbox-user-id',
    consultorNome: 'Consultor Demonstrativo',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    eventDate: new Date().toISOString().split('T')[0],
    isSent: false,
    senderId: 'sandbox-consultor-juliana'
  }
];
