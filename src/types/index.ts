/**
 * Role/Papel do usuário consultor no sistema.
 * 'admin': Acesso total ao sistema e configurações.
 * 'consultor': Acesso restrito a clientes, viagens e reembolsos próprios ou gerais de consultores.
 */
export type UserRole = 'admin' | 'consultor';

/**
 * Representa o perfil de um consultor associado à autenticação do Supabase.
 */
export interface PerfilConsultor {
  id: string; // ID correspondente ao auth.uid() do Supabase
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  avatar_url?: string; // ID do avatar selecionado (panda, lion, fox, etc.)
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Configurações globais do sistema de pós-venda da agência.
 */
export interface GlobalSettings {
  id: string;
  agencyName: string;
  taxaCancelamentoPadrao: number; // Percentual ou valor fixo
  prazoReembolsoDias: number; // Prazo padrão em dias para conclusão de reembolsos
  notificacoesAtivas: boolean;
  emailSuporte: string;
  googleRefreshToken?: string; // Token de renovação persistido para integração com o Google Drive
  slaPreEmbarqueDias?: number; // Dias de SLA para alertas de embarque
  slaPosViagemDias?: number; // Dias de SLA para contatos de pós-venda
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representa um cliente (passageiro ou comprador) cadastrado no CRM.
 */
export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  documento: string; // CPF, RG ou Passaporte
  dataNascimento: string; // YYYY-MM-DD
  endereco?: string;
  observacoes?: string;
  consultorResponsavelId: string; // ID do consultor que cadastrou/atende
  passaporteNumero?: string; // Número do passaporte
  passaporteValidade?: string; // Data de validade (YYYY-MM-DD)
  vistosInformacoes?: string; // Detalhes sobre vistos ativos do cliente
  googleDriveFolderUrl?: string; // URL da pasta dedicada criada no Google Drive da agência
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representa uma viagem ou pacote de viagem vendido a um cliente.
 */
export interface Viagem {
  id: string;
  clienteId: string; // ID do cliente comprador/passageiro principal
  consultorId: string; // ID do consultor responsável pela venda
  destino: string;
  dataIda: string; // YYYY-MM-DD
  dataVolta: string; // YYYY-MM-DD
  valorTotal: number;
  status: 'planejamento' | 'confirmada' | 'em_andamento' | 'concluida' | 'cancelada';
  codigoLocalizador?: string; // Código de reserva geral
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representa um produto específico dentro de uma viagem (ex: voo, hotel, seguro, passeio).
 */
export interface ProdutoViagem {
  id: string;
  viagemId: string; // ID da viagem à qual o produto pertence
  tipo: 'voo' | 'hotel' | 'seguro' | 'passeio' | 'outro';
  fornecedor: string; // Nome da companhia aérea, hotel, seguradora, etc.
  descricao: string; // Detalhes (ex: Voo GRU-MCO, Hotel XYZ Quarto Luxo)
  codigoReserva?: string; // Código de reserva ou bilhete individual
  valorCusto: number; // Valor pago ao fornecedor
  valorVenda: number; // Valor vendido ao cliente
  status: 'reservado' | 'emitido' | 'cancelado' | 'reembolsado';
  dataServico: string; // Data da prestação do serviço
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representa uma solicitação de reembolso no fluxo de pós-venda.
 */
export interface Reembolso {
  id: string;
  viagemId: string; // ID da viagem relacionada
  produtoViagemId?: string; // ID do produto específico (opcional, caso seja reembolso total da viagem)
  consultorSolicitanteId: string; // ID do consultor que iniciou o reembolso
  valorSolicitado: number;
  valorAprovado?: number; // Preenchido após análise do financeiro/fornecedor
  taxaRetencao?: number; // Taxa cobrada pelo fornecedor/agência
  status: 'solicitado' | 'em_analise' | 'aprovado' | 'recusado' | 'pago' | 'cancelado';
  motivoCancelamento: string;
  observacoesFinanceiras?: string;
  dataSolicitacao: string; // ISO String ou YYYY-MM-DD
  dataResolucao?: string; // ISO String ou YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representa um orçamento no fluxo de prospecção.
 */
export interface Orcamento {
  id: string;
  consultorId: string;
  nomeCliente: string;
  contato: string;
  destino: string;
  dataViagem?: string; // YYYY-MM-DD
  temperatura: 'Frio' | 'Normal' | 'Quente';
  tags: string[];
  status: 'SOLICITADO' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'CONCLUIDO';
  subStatus?: 'ACEITO' | 'DESISTENCIA';
  notasNegociacao?: string;
  documentosUrl?: string[];
  createdAt?: string;
  updatedAt?: string;
}

