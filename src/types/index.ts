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
  participa_escala?: boolean; // Controla se o funcionário participa e aparece na escala
  participaEscala?: boolean; // Suporte camelCase
  avatar_url?: string; // ID do avatar selecionado (panda, lion, fox, etc.)
  avatarUrl?: string; // Suporte camelCase
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  xp?: number;
  nivel?: number;
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
  googleParentFolderId?: string; // ID da pasta mãe no Google Drive para armazenamento centralizado
  slaPreEmbarqueDias?: number; // Dias de SLA para alertas de embarque
  slaPosViagemDias?: number; // Dias de SLA para contatos de pós-viagem
  limiteUploadMb?: number; // Limite de tamanho para upload de arquivos em MB
  enviarNpsAutomatico?: boolean; // Habilita o envio automático de pesquisas de NPS
  agency_logo_url?: string;
  agencyLogoUrl?: string;
  agency_primary_color?: string;
  agencyPrimaryColor?: string;
  digisac_token?: string;
  digisacToken?: string;
  digisac_domain?: string;
  digisacDomain?: string;
  digisac_service_id?: string;
  digisacServiceId?: string;
  digisac_enable_manual_send?: boolean;
  digisacEnableManualSend?: boolean;
  digisac_enable_chat_history?: boolean;
  digisacEnableChatHistory?: boolean;
  digisac_enable_vouchers?: boolean;
  digisacEnableVouchers?: boolean;
  digisac_enable_routing?: boolean;
  digisacEnableRouting?: boolean;
  digisac_enable_bot_triggers?: boolean;
  digisacEnableBotTriggers?: boolean;
  digisac_enable_webhooks?: boolean;
  digisacEnableWebhooks?: boolean;
  tempoDesistenciaOrcamentoDias?: number;
  tempo_desistencia_orcamento_dias?: number;
  permitir_consultor_criar_viagem?: boolean;
  permitirConsultorCriarViagem?: boolean;
  copiloto_ativo?: boolean;
  copilotoAtivo?: boolean;
  antecedencia_risco_operacional_dias?: number;
  antecedenciaRiscoOperacionalDias?: number;
  habilitar_risk_score?: boolean;
  habilitarRiskScore?: boolean;
  risk_score_janela_carencia_dias?: number;
  riskScoreJanelaCarenciaDias?: number;
  risk_score_limite_critico?: number;
  riskScoreLimiteCritico?: number;
  pesos_pilares_risk_score?: {
    pilar1_documental: number;
    pilar2_vouchers: number;
    pilar3_governanca: number;
    pilar4_roteiro: number;
    pilar5_cadastro: number;
  };
  habilitar_next_trip_engine?: boolean;
  habilitarNextTripEngine?: boolean;
  next_trip_janela_sazonalidade_meses?: number;
  nextTripJanelaSazonalidadeMeses?: number;
  next_trip_nps_minimo?: number;
  nextTripNpsMinimo?: number;
  next_trip_corte_prontidao_alta?: number;
  nextTripCorteProntidaoAlta?: number;
  next_trip_snooze_dias?: number;
  nextTripSnoozeDias?: number;
  habilitar_upsell_preditivo?: boolean;
  habilitarUpsellPreditivo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representa uma oportunidade de recompra identificada pelo Next Trip Engine.
 */
export interface NextTripOpportunity {
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  consultorId: string;
  consultorNome: string;
  scoreProntidao: number; // 0 a 100
  nivelProntidao: 'alto' | 'medio' | 'baixo';
  destinoRecomendado: string;
  categoriaDestino: 'europa' | 'resort' | 'disney' | 'cruzeiro' | 'nacional' | 'geral';
  ultimaViagemData: string;
  ultimoDestino: string;
  npsNota?: number;
  motivoSugestao: string;
  statusAbordagem: 'pendente' | 'em_abordagem' | 'snoozed';
  snoozeAte?: string;
  totalPassageirosGrupo?: number;
}

/**
 * Representa uma oportunidade de aumento de ticket médio (Upsell / Experiência) identificada pelo PaxFlow Upsell Engine.
 */
export interface UpsellOpportunity {
  id: string;
  tipo: 'seguro_saude' | 'passes_experiencias' | 'transfer_privativo' | 'upgrade_hotel' | 'cancel_flex';
  titulo: string;
  descricao: string;
  produtoSugerido: string;
  categoriaProduto: 'seguro' | 'transfer' | 'passeio' | 'hotel' | 'outro';
  valorEstimado: number;
  badgeTexto: string;
  corBadge: string;
}

/**
 * Representa um registro do histórico temporal de evolução do Risk Score.
 */
export interface RiskTimelineEntry {
  id: string;
  viagem_id: string;
  score_anterior: number;
  score_novo: number;
  nivel_anterior: 'verde' | 'amarelo' | 'vermelho';
  nivel_novo: 'verde' | 'amarelo' | 'vermelho';
  descricao_acao: string;
  autor_nome: string;
  created_at: string;
}

/**
 * Representa um item individual de risco/pendência detectado no diagnósticos.
 */
export interface RiskItem {
  id: string;
  pilar: 1 | 2 | 3 | 4 | 5;
  pilarNome: string;
  titulo: string;
  descricaoHumana: string;
  penalidadePontos: number;
  resolvido: boolean;
  acaoTipo: 'anexar_voucher' | 'anexar_voucher_geral' | 'preencher_passaporte' | 'preencher_visto' | 'vincular_loc' | 'conferir_operacional' | 'notificar_consultor' | 'justificar_risco';
  acaoRotulo: string;
  produtoId?: string;
  justificativa?: string;
}

/**
 * Resultado completo do cálculo do PaxFlow Risk Score™ para uma viagem.
 */
export interface RiskScoreResult {
  score: number;
  nivel: 'verde' | 'amarelo' | 'vermelho';
  corHex: string;
  badgeClass: string;
  fraseStatus: string;
  isGracePeriod: boolean;
  gracePeriodMensagem?: string;
  itens: RiskItem[];
  historico: RiskTimelineEntry[];
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
  classificacoes?: string[];
  codigo_ref?: string;
  codigoRef?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representa uma viagem ou pacote de viagem vendido a um cliente.
 */
export interface Viagem {
  id: string;
  clienteId?: string; // ID do cliente comprador/passageiro principal
  cliente_id?: string;
  consultorId?: string; // ID do consultor responsável pela venda
  consultor_id?: string;
  destino: string;
  dataIda?: string; // YYYY-MM-DD
  data_ida?: string;
  dataVolta?: string; // YYYY-MM-DD
  data_volta?: string;
  valorTotal?: number;
  valor_total?: number;
  status: 'planejamento' | 'confirmada' | 'em_andamento' | 'concluida' | 'cancelada' | 'pre_embarque' | 'pos_viagem' | 'reembolso_solicitado';
  codigoLocalizador?: string; // Código de reserva geral
  codigo_localizador?: string;
  origem?: string;
  rentabilidade?: number;
  observacoes?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  data_financeiro?: string;
  dataFinanceiro?: string;
  destino_id?: string;
  destinoId?: string;
  destino_ref?: Destino;
  destinoRef?: Destino;
  codigo_ref?: string;
  codigoRef?: string;
  processo_conferido?: boolean;
  isFinanceiroConferido?: boolean;
  orcamentoId?: string;
  orcamento_id?: string;
  isProcessoConferido?: boolean;
  voucher_geral_pacote?: string; // URL do PDF do voucher unificado
  voucher_geral_anexado?: boolean;
  risk_score_override?: number;
  risk_score_justificativa?: string;
  risk_score_justificado_por?: string;
  risk_score_justificado_em?: string;
  nps_nota?: number;
  npsNota?: number;
  nps_respondido?: boolean;
  nps_respondido_em?: string;
  pos_contato_concluido?: boolean;
}

/**
 * Representa um destino cadastrado no PaxFlow.
 */
export interface Destino {
  id: string;
  nome: string;
  pais: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Representa um produto específico dentro de uma viagem (ex: voo, hotel, seguro, passeio).
 */
export interface CampoAdicional {
  id: string;
  label: string;
  tipo: 'text' | 'number' | 'select';
  opcoes?: string[];
  obrigatorio: boolean;
  alvo: 'fornecedor' | 'descricao' | 'dados_adicionais';
}

export interface TipoProduto {
  id: string;
  nome: string;
  icone: string;
  campos_adicionais: CampoAdicional[];
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProdutoViagem {
  id: string;
  viagemId: string; // ID da viagem à qual o produto pertence
  tipo: string;
  fornecedor: string; // Nome da companhia aérea, hotel, seguradora, etc.
  descricao: string; // Detalhes (ex: Voo GRU-MCO, Hotel XYZ Quarto Luxo)
  codigoReserva?: string; // Código de reserva ou bilhete individual
  valorCusto: number; // Valor pago ao fornecedor
  valorVenda: number; // Valor vendido ao cliente
  status: 'reservado' | 'emitido' | 'cancelado' | 'reembolsado';
  dataServico: string; // Data da prestação do serviço
  datasAdicionais?: { data: string; rotulo: string }[];
  datas_adicionais?: { data: string; rotulo: string }[];
  dados_adicionais?: Record<string, any>;
  dadosAdicionais?: Record<string, any>;
  tarifa?: number;
  taxa?: number;
  comissao?: number;
  markup?: number;
  rav?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representa uma solicitação de reembolso no fluxo de pós-venda.
 */
export interface Reembolso {
  id: string;
  viagemId?: string; // ID do viagem relacionada
  viagem_id?: string;
  produtoViagemId?: string; // ID do produto específico (opcional, caso seja reembolso total da viagem)
  produto_viagem_id?: string;
  consultorSolicitanteId?: string; // ID do consultor que iniciou o reembolso
  consultor_solicitante_id?: string;
  valorSolicitado?: number;
  valor_solicitado?: number;
  valorAprovado?: number; // Preenchido após análise do financeiro/fornecedor
  valor_aprovado?: number;
  taxaRetencao?: number; // Taxa cobrada pelo fornecedor/agência
  taxa_retencao?: number;
  status: 'solicitado' | 'em_analise' | 'aprovado' | 'recusado' | 'pago' | 'cancelado' | 'Aguardando Fornecedor';
  motivoCancelamento?: string;
  motivo_cancelamento?: string;
  observacoesFinanceiras?: string;
  observacoes_financeiras?: string;
  dataSolicitacao?: string; // ISO String ou YYYY-MM-DD
  data_solicitacao?: string;
  dataResolucao?: string; // ISO String ou YYYY-MM-DD
  data_resolucao?: string;
  createdAt?: string;
  created_at?: string;
  codigo_ref?: string;
  codigoRef?: string;
  updatedAt?: string;
  updated_at?: string;
}

/**
 * Representa um orçamento no fluxo de prospecção.
 */
export interface Orcamento {
  id: string;
  consultorId: string;
  clienteId?: string;
  cliente_id?: string;
  nomeCliente: string;
  contato: string;
  destino: string;
  dataViagem?: string; // YYYY-MM-DD
  temperatura: 'Frio' | 'Normal' | 'Quente';
  tags: string[];
  status: 'SOLICITADO' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'CONCLUIDO';
  subStatus?: 'ACEITO' | 'DESISTENCIA';
  notasNegociacao?: string;
  valorProposta?: number;
  valorViagem?: number;
  origem?: string;
  documentosUrl?: string[];
  createdAt?: string;
  updatedAt?: string;
  destino_id?: string;
  destinoId?: string;
  codigo_ref?: string;
  codigoRef?: string;
  destino_ref?: Destino;
  destinoRef?: Destino;
}

/**
 * Representa um lembrete manual agendado para um orçamento ("Me Lembre Depois").
 */
export interface Lembrete {
  id: string;
  orcamentoId?: string;
  orcamento_id?: string;
  viagemId?: string;
  viagem_id?: string;
  criadorId?: string;
  criador_id?: string;
  consultorId: string;
  consultor_id?: string;
  dataLembrete: string; // YYYY-MM-DD
  data_lembrete?: string;
  periodo: 'manha' | 'tarde' | 'noite';
  arquivado: boolean;
  createdAt?: string;
  created_at?: string;
}

/**
 * Representa um comentário ou anotação em um item.
 */
export interface Comentario {
  id: string;
  tipo_item: 'orcamento' | 'viagem' | 'produto';
  item_id: string;
  autor_id: string;
  texto: string;
  created_at: string;
  // Campos populados via JOIN
  autor?: PerfilConsultor;
}

export interface MensagemDireta {
  id: string;
  remetente_id: string;
  assunto: string;
  conteudo: string;
  created_at: string;
  parent_id?: string;
  thread_id?: string;
  remetente?: PerfilConsultor;
  mensagem_destinatarios?: MensagemDestinatario[];
}

export interface MensagemDestinatario {
  id: string;
  mensagem_id: string;
  destinatario_id: string;
  tipo: 'para' | 'cc';
  created_at: string;
  destinatario?: PerfilConsultor;
}

/**
 * Representa uma notificação/alerta de menção ou mensagem direta.
 */
export interface Notificacao {
  id: string;
  user_id: string;
  comentario_id?: string;
  mensagem_id?: string;
  tipo_item: 'orcamento' | 'viagem' | 'produto' | 'mensagem';
  item_id: string;
  parent_id: string;
  lida: boolean;
  arquivada: boolean;
  created_at: string;
  // Campos populados via JOIN
  comentario?: Comentario;
  mensagem?: MensagemDireta;
}

/**
 * Representa um item de alerta na Caixa de Entrada (manual, SLA ou mensagem direta)
 */
export interface AlertItem {
  id: string; // Chave combinada única
  type: 'manual' | 'passport' | 'refund' | 'mention' | 'direct_message' | 'campaign_notification' | 'pre-embarque' | 'pos-viagem-nps' | 'escala_solicitacao' | 'escala_lembrete';
  title: string;
  sender: string;
  senderAvatar?: string;
  dateStr: string;
  periodText?: string;
  subject: string;
  body: string;
  targetId: string; // Para links e navegação profunda
  arquivado: boolean;
  consultorId: string;
  consultorNome: string;
  createdAt: string;
  eventDate: string; // Data alvo do evento (YYYY-MM-DD)
  recipientsHtml?: string; // HTML com lista de Para e Cc
  isSent?: boolean; // Se foi enviada pelo próprio usuário
  isDecision?: boolean; // Se é um registro de decisão/aprovação finalizada pelo Admin
  criadorId?: string;
  isDelegated?: boolean;
  isCreatedByMe?: boolean;
  isReceivedByMe?: boolean;
  senderId?: string; // ID do remetente original
  parentId?: string;
  threadId?: string;
  solicitacaoStatus?: 'pendente_colega' | 'pendente_admin' | 'pendente_consultor' | 'aprovado' | 'recusado';
}

/**
 * Parâmetros para fechar negócio e converter orçamento em viagem/produto.
 */
export interface ConvertToTripOptions {
  cNome: string;
  cEmail: string;
  cTelefone: string;
  cDoc: string;
  cDataNascimento?: string;
  folderDriveUrl?: string;
  isNovaViagem: boolean;
  vValor: number;
  origem?: string;
  // Se for nova viagem:
  vDestino?: string;
  vDestinoId?: string;
  vLoc?: string;
  vIda?: string; // YYYY-MM-DD
  vVolta?: string; // YYYY-MM-DD
  vDataFinanceiro?: string; // YYYY-MM-DD
  vStatus?: string;
  vObs?: string;
  prodTipo: string;
  prodFornecedor: string;
  prodDescricao: string;
  // Se for viagem existente:
  viagemId?: string;
  existingTripValorTotal?: number;
  existingTripDataIda?: string;
}

export interface MetaPeriodo {
  id: string;
  nome: string;
  data_inicio: string;
  dataInicio?: string;
  data_fim: string;
  dataFim?: string;
  tipo_calculo: 'bruto' | 'lucro';
  tipoCalculo?: 'bruto' | 'lucro';
  is_campanha: boolean;
  isCampanha?: boolean;
  is_meta_loja?: boolean;
  isMetaLoja?: boolean;
  valor_meta?: number;
  valorMeta?: number;
  created_at?: string;
  updated_at?: string;
  faixas?: MetaFaixa[];
}

export interface MetaFaixa {
  id: string;
  periodo_id: string;
  periodoId?: string;
  nome: string;
  valor_minimo: number;
  valorMinimo?: number;
  bonus_xp: number;
  bonusXp?: number;
  recompensa?: string;
  cor: string;
  corHex?: string;
  created_at?: string;
}

/**
 * Representa um turno pré-configurado com legenda e cores.
 */
export interface TurnoConfig {
  codigo: string; // Ex: '10-17', '12-19', '14-21', '15-22', 'Folga', 'Férias', 'Reunião', 'F'
  label: string;  // Ex: '10:00 - 17:00'
  corClass: string; // Ex: 'c10', 'c12', 'c14', 'c15', 'folga', 'ferias', 'event', 'off'
  descricao?: string;
}

/**
 * Representa o turno de um consultor em uma data específica.
 */
export interface EscalaDiaria {
  id?: string;
  consultor_id: string;
  consultor_nome?: string;
  equipe?: string;
  data: string; // YYYY-MM-DD no banco, exibido obrigatoriamente como DD/MM/AAAA na UI
  turno_codigo: string; // ex: '10-17', 'Folga', 'Férias', etc.
  observacao_custom?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CelulaEscalaItem {
  turno: string;
  observacao?: string;
}

/**
 * Representa uma solicitação de alteração de escala ou folga/férias.
 */
export interface SolicitacaoEscala {
  id: string;
  tipo: 'troca' | 'folga' | 'ferias' | 'atendimento_balcao';
  solicitante_id: string;
  solicitante_nome?: string;
  destinatario_id?: string; // Preenchido no caso de troca entre consultores
  destinatario_nome?: string;
  data_origem: string; // YYYY-MM-DD no banco, exibido obrigatoriamente como DD/MM/AAAA na UI
  turno_origem?: string;
  data_destino?: string; // YYYY-MM-DD (para trocas de data), exibido obrigatoriamente como DD/MM/AAAA na UI
  turno_destino?: string;
  motivo?: string;
  status: 'pendente_colega' | 'pendente_admin' | 'pendente_consultor' | 'aprovado' | 'recusado';
  resposta_admin?: string;
  respondido_por?: string;
  respondido_em?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Representa o saldo e histórico do Banco de Folgas de um consultor.
 */
export interface BancoFolgasItem {
  id?: string;
  consultor_id: string;
  consultor_nome: string;
  equipe?: string;
  saldo_dias: string | number; // Ex: "1", "10", "2", "—"
  detalhes_historico: string; // Ex: "Meta Jun", "8mar26 - Folga ref 22/03..."
  updated_at?: string;
}

/**
 * Representa um evento, treinamento ou reunião na escala.
 */
export interface EventoEscalaItem {
  id?: string;
  data: string; // YYYY-MM-DD ou DD/MM
  consultor_nome: string; // Nome do consultor ou 'Equipe'
  titulo: string; // Ex: "SACFLOW às 14:30"
  descricao?: string;
  created_at?: string;
}

/**
 * Representa o histórico de plantões de consultores nos últimos feriados.
 */
export interface FeriadoPlantaoInfo {
  id?: string;
  data: string; // Ex: "09/07"
  dataIso?: string;
  nome: string; // Ex: "Revolução Constitucionalista (SP)"
  nomeCurto: string; // Ex: "09/07 Rev. SP"
  consultoresTrabalharam: string[]; // Nomes dos consultores que efetivamente trabalharam
  updated_at?: string;
}




