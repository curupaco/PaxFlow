import { supabase, getSessaoAtual } from '../services/supabase';
import { PerfilConsultor, MetaPeriodo, MetaFaixa, Orcamento } from '../types';
import { InboxService } from '../services/inboxService';
import { formatBrDateToIso, formatIsoDateToBr } from '../utils/masks';
import { obterProgressoNivel, BADGE_DEFINITIONS } from '../services/gamification';
import { EditTravelModal } from '../components/dashboard/EditTravelModal';
import { CommentsService } from '../services/comments';
import { ContatosEmbarqueService } from '../services/contatosEmbarqueService';
import { confirmUnsavedChanges } from '../components/common/UnsavedChangesModal';
import { ExtratoRecebimentosModal } from '../components/relatorios/ExtratoRecebimentosModal';
import { processarExtratoRecebimentos, calcularFaturamentoLucratividade } from '../controllers/relatoriosController';
import { MetasService } from '../services/metasService';
import { getAvatarSvg } from '../services/avatars';
import { VerNotasModal } from '../components/orcamentos/VerNotasModal';
import { OrcamentosService } from '../services/orcamentosService';
import { showCustomPrompt, showCustomAlert } from '../services/dialog';
import { ViagensDivisoesService } from '../services/viagensDivisoesService';
import { CampanhasService, FiltrosCampanha, ItemSegmentacaoCampanha, PresetCampanha } from '../services/campanhasService';
import { RelatoriosOperacoesView, RelatoriosOperacoesContext } from '../components/relatorios/operacoes/RelatoriosOperacoesView';
import { RelatoriosFinanceiroView, RelatoriosFinanceiroContext } from '../components/relatorios/financeiro/RelatoriosFinanceiroView';
import { RelatoriosComercialView, RelatoriosComercialContext } from '../components/relatorios/comercial/RelatoriosComercialView';
import { RelatoriosInteligenciaView, RelatoriosInteligenciaContext } from '../components/relatorios/inteligencia/RelatoriosInteligenciaView';
import { RelatoriosShellView, RelatorioTab } from '../components/relatorios/shell/RelatoriosShellView';

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .report-tab-active {
      background-color: rgba(79, 70, 229, 0.08) !important;
      color: rgb(79, 70, 229) !important;
      border-left: 4px solid rgb(79, 70, 229) !important;
    }
    .dark .report-tab-active {
      background-color: rgba(99, 102, 241, 0.15) !important;
      color: rgb(129, 140, 248) !important;
      border-left: 4px solid rgb(129, 140, 248) !important;
    }
    @media print {
      body * {
        visibility: hidden !important;
      }
      #page-content, #page-content * {
        visibility: visible !important;
      }
      #page-content {
        position: absolute;
        left: 0;
        top: 0;
        width: 100% !important;
        background: white !important;
        color: black !important;
      }
      .no-print, aside, header, .global-filters-bar, .report-tabs-bar {
        display: none !important;
      }
      .print-full-width {
        width: 100% !important;
        max-width: 100% !important;
        box-shadow: none !important;
        border: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export class RelatoriosPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private activeTab: RelatorioTab = 'desempenho';
  private metas: MetaPeriodo[] = [];
  private selectedMetaId: string = '';

  // Filtros da aba de Pesquisa de Satisfação
  private satisfacaoFiltroCategoria: 'todos' | 'promotores' | 'neutros' | 'detratores' | 'com_comentario' = 'todos';
  private satisfacaoBuscaTexto: string = '';

  // Estado e filtros da aba Campanhas & Segmentação
  private campanhasFiltros: FiltrosCampanha = {
    origem: 'todos',
    tipoVisao: 'oportunidade',
    tipoDestino: 'todos',
    destinoBusca: '',
    periodoMeses: 12,
    valorMinimo: undefined,
    valorMaximo: undefined,
    fornecedor: '',
    mesEmbarque: undefined,
    statusOrcamento: 'TODOS',
    classificacaoNps: 'todos',
    perfilPassageiro: 'todos',
    consultorId: 'TODOS'
  };
  private campanhasPresets: PresetCampanha[] = [];
  private feedbacksNps: any[] = [];

  // Controle de estado para grupos colapsáveis e recolhimento geral da barra lateral
  private menuLateralRecolhido: boolean = false;
  private collapsedGroups: { [key: string]: boolean } = {
    comercial: false,
    financeiro: false,
    operacional: false,
    equipe: false
  };
  
  // Data stores
  private orcamentos: any[] = [];
  private viagens: any[] = [];
  private clientes: any[] = [];
  private reembolsos: any[] = [];
  private alertas: any[] = [];
  private consultores: any[] = [];
  private locPagamentos: any[] = [];
  private locConferencias: any[] = [];
  private lembretes: any[] = [];
  private tiposProduto: any[] = [];
  private formasRecebimento: any[] = [];
  private consultoresBadges: any[] = [];
  
  // Filter states
  private dataInicio: string = '';
  private dataFim: string = '';
  private consultorIdFilter: string = 'todos';
  private filtroContatoEmbarque: 'todos' | 'feitos' | 'pendentes' = 'todos';
  private filtroFaturamentoProduto: string = 'todos';
  private filtroFaturamentoRav: 'todos' | 'com_rav' | 'sem_rav' = 'todos';
  
  private loading: boolean = false;
  private prazoReembolsoDias: number = 30;

  constructor(container: HTMLElement) {
    this.container = container;
    
    // Set default date range: dia 01 do mês corrente até a data atual
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    
    this.dataInicio = `${ano}-${mes}-01`;
    this.dataFim = `${ano}-${mes}-${dia}`;
  }

  /**
   * Initializes the Reports page: validates auth, loads database tables, and renders views.
   */
  public async init(): Promise<void> {
    try {
      this.loading = true;
      this.render();

      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }
      this.user = user;
      this.perfil = perfil;
      const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';

      // Restringe rigidamente o filtro padrão ao próprio consultor se não for admin
      if (!isAdmin) {
        this.consultorIdFilter = this.user.id;
      }

      await this.loadData();
      this.loading = false;
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro na inicialização da página de relatórios:', err);
      this.renderAuthError(`Erro interno ao carregar relatórios: ${err.message}`);
    }
  }

  public destroy(): void {
    const portal = document.getElementById('orcamento-modal-portal');
    if (portal) {
      portal.innerHTML = '';
    }
  }

  /**
   * Loads all tables from Supabase in parallel via Promise.all, drastically reducing load time
   */
  private async loadData(): Promise<void> {
    try {
      const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';

      // 1. Preparar consultas paralelas independentes
      const pProfiles = isAdmin
        ? supabase.from('profiles').select('*').order('nome')
        : Promise.resolve({ data: this.perfil ? [this.perfil] : [], error: null });

      const pSettings = supabase.from('global_settings').select('*');

      let orcQuery = supabase.from('orcamentos').select('*');
      if (!isAdmin) {
        orcQuery = orcQuery.eq('consultor_id', this.user.id);
      }
      const pOrcamentos = orcQuery;

      let cliQuery = supabase.from('clientes').select('*');
      if (!isAdmin) {
        cliQuery = cliQuery.eq('consultor_responsavel_id', this.user.id);
      }
      const pClientes = cliQuery;

      const pReembolsos = supabase.from('reembolsos').select('*, viagem:viagens(*), produto:produtos_viagem(*)');

      const pPagamentos = supabase.from('loc_pagamentos').select('*, formas_recebimento(*)');

      const pConferencias = supabase.from('loc_conferencias').select('*');

      const pFormas = supabase.from('formas_recebimento').select('*');

      let badgeQuery = supabase.from('profiles_badges').select('*');
      if (!isAdmin) {
        badgeQuery = badgeQuery.eq('profile_id', this.user.id);
      }
      const pBadges = badgeQuery;

      let lembretesQuery = supabase.from('lembretes').select('*').eq('arquivado', false);
      if (!isAdmin) {
        lembretesQuery = lembretesQuery.eq('user_id', this.user.id);
      }
      const pLembretes = lembretesQuery;

      const pTipos = supabase.from('tipos_produto').select('*').order('nome');

      const pMetas = MetasService.obterMetaPeriodos().catch(err => {
        console.warn('Erro defensivo ao carregar metas em RelatoriosPage:', err);
        return [];
      });

      const pNps = (async () => {
        try {
          const res = await supabase.from('feedbacks_nps').select('*');
          return res;
        } catch (errNps) {
          console.warn('Erro defensivo ao carregar feedbacks_nps em RelatoriosPage:', errNps);
          return { data: [], error: null };
        }
      })();

      const pPresets = CampanhasService.listarPresets().catch(err => {
        console.warn('Erro defensivo ao carregar presets de campanhas em RelatoriosPage:', err);
        return [];
      });

      const pDivisoes = (async () => {
        try {
          const primaryRes = await supabase
            .from('viagens_divisoes')
            .select('viagem_id, consultor_id, percentual, percentual_rav, is_titular');
          if (primaryRes.error && (primaryRes.error.code === '42703' || primaryRes.error.message?.includes('percentual_rav'))) {
            return await supabase
              .from('viagens_divisoes')
              .select('viagem_id, consultor_id, percentual, is_titular');
          }
          return primaryRes;
        } catch (errDiv) {
          console.warn('Erro defensivo ao carregar viagens_divisoes em Relatorios:', errDiv);
          return { data: [], error: null };
        }
      })();

      const pViagens = (async () => {
        let viaQuery = supabase.from('viagens').select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)');
        if (!isAdmin) {
          const parceiroViagemIds = await ViagensDivisoesService.obterViagensDivididasPorConsultor(this.user.id);
          if (parceiroViagemIds.length > 0) {
            viaQuery = viaQuery.or(`consultor_id.eq.${this.user.id},id.in.(${parceiroViagemIds.join(',')})`);
          } else {
            viaQuery = viaQuery.eq('consultor_id', this.user.id);
          }
        }
        return viaQuery;
      })();

      const pAlertas = InboxService.loadAndBuildAlerts(this.user, this.perfil, this.prazoReembolsoDias).catch(errA => {
        console.warn('Erro defensivo ao carregar alertas em RelatoriosPage:', errA);
        return [];
      });

      // 2. Executar TODAS as 17 consultas simultaneamente em paralelo via Promise.all!
      const [
        resProfiles,
        resSettings,
        resOrcamentos,
        resClientes,
        resReembolsos,
        resPagamentos,
        resConferencias,
        resFormas,
        resBadges,
        resLembretes,
        resTipos,
        resMetas,
        resNps,
        resPresets,
        resDivisoes,
        resViagens,
        resAlertas
      ] = await Promise.all([
        pProfiles,
        pSettings,
        pOrcamentos,
        pClientes,
        pReembolsos,
        pPagamentos,
        pConferencias,
        pFormas,
        pBadges,
        pLembretes,
        pTipos,
        pMetas,
        pNps,
        pPresets,
        pDivisoes,
        pViagens,
        pAlertas
      ]);

      // 3. Processar resultados
      this.consultores = resProfiles.data || (this.perfil ? [this.perfil] : []);

      if (resSettings.data && resSettings.data.length > 0) {
        this.prazoReembolsoDias = resSettings.data[0].prazoReembolsoDias || 30;
      }

      this.orcamentos = resOrcamentos.data || [];
      this.clientes = resClientes.data || [];

      // Mapear divisões
      const divisoesMap = new Map<string, any[]>();
      if (resDivisoes && resDivisoes.data) {
        resDivisoes.data.forEach((row: any) => {
          const arr = divisoesMap.get(row.viagem_id) || [];
          arr.push(row);
          divisoesMap.set(row.viagem_id, arr);
        });
      }

      const rawViagens = resViagens.data || [];
      this.viagens = rawViagens.map((v: any) => ({
        ...v,
        divisoes: divisoesMap.get(v.id) || []
      }));

      const rawReem = resReembolsos.data || [];
      if (!isAdmin) {
        this.reembolsos = rawReem.filter((r: any) => r.viagem?.consultor_id === this.user.id || r.consultor_solicitante_id === this.user.id);
      } else {
        this.reembolsos = rawReem;
      }

      const travelIds = new Set(this.viagens.map((v: any) => v.id));
      const rawPags = resPagamentos.data || [];
      this.locPagamentos = isAdmin ? rawPags : rawPags.filter((p: any) => travelIds.has(p.viagem_id || p.viagemId));

      const rawConf = resConferencias.data || [];
      this.locConferencias = isAdmin ? rawConf : rawConf.filter((c: any) => travelIds.has(c.viagem_id || c.viagemId));

      this.formasRecebimento = resFormas.data || [];
      this.consultoresBadges = resBadges.data || [];
      this.lembretes = resLembretes.data || [];
      this.tiposProduto = resTipos.data || [];

      this.metas = Array.isArray(resMetas) ? resMetas : [];
      if (this.metas.length > 0 && (!this.selectedMetaId || !this.metas.some(m => m.id === this.selectedMetaId))) {
        const ativa = this.metas.find(m => MetasService.getStatusTemporal(m) === 'ativa');
        this.selectedMetaId = ativa ? ativa.id : this.metas[0].id;
      }

      this.feedbacksNps = resNps?.data || [];
      this.campanhasPresets = Array.isArray(resPresets) ? resPresets : [];
      this.alertas = Array.isArray(resAlertas) ? resAlertas : [];
    } catch (err) {
      console.warn('Erro ao ler tabelas de relatórios. Ativando mocks.', err);
      this.loadMockData();
    }
  }

  /**
   * Offline mock data fallback to ensure reports always look fully interactive
   */
  private loadMockData(): void {
    this.lembretes = [];
    this.tiposProduto = [
      { id: '1', nome: 'AÉREO OPERADORA', campos_adicionais: [] },
      { id: '2', nome: 'AÉREO FACIAL', campos_adicionais: [] }
    ];

    // Generate mock profiles if empty
    this.consultores = [
      { id: '1', nome: 'Amanda Silva', email: 'amanda@agencia.com', role: 'consultor', nivel: 12, xp: 9800 },
      { id: '2', nome: 'Bruno Costa', email: 'bruno@agencia.com', role: 'consultor', nivel: 4, xp: 1800 },
      { id: '3', nome: 'Carlos Souza', email: 'carlos@agencia.com', role: 'consultor', nivel: 16, xp: 16500 }
    ];

    // Generate mock orcamentos
    this.orcamentos = [
      { id: 'o1', consultor_id: '1', nome_cliente: 'Felipe Melo', destino: 'Orlando', created_at: '2026-05-10', updated_at: '2026-05-15', status: 'CONCLUIDO', sub_status: 'ACEITO', valor_proposta: 12000, valor_viagem: 12000, tags: [], origem: 'Instagram' },
      { id: 'o2', consultor_id: '1', nome_cliente: 'Ana Beatriz', destino: 'Paris', created_at: '2026-06-01', updated_at: '2026-06-12', status: 'CONCLUIDO', sub_status: 'DESISTENCIA', valor_proposta: 18000, tags: ['Desistência: Preço Alto'], origem: 'Instagram' },
      { id: 'o3', consultor_id: '2', nome_cliente: 'Roberto Lima', destino: 'Roma', created_at: '2026-06-10', updated_at: '2026-06-20', status: 'CONCLUIDO', sub_status: 'ACEITO', valor_proposta: 22000, valor_viagem: 21500, tags: [], origem: 'Indicação' },
      { id: 'o4', consultor_id: '2', nome_cliente: 'Mariana Vaz', destino: 'Gramado', created_at: '2026-07-02', updated_at: '2026-07-05', status: 'CONCLUIDO', sub_status: 'DESISTENCIA', valor_proposta: 4500, tags: ['Desistência: Concorrência'], origem: 'Google' },
      { id: 'o5', consultor_id: '3', nome_cliente: 'Julia Neto', destino: 'Cancun', created_at: '2026-07-15', updated_at: '2026-07-16', status: 'EM_ANDAMENTO', valor_proposta: 9800, tags: [], origem: 'WhatsApp' },
      { id: 'o6', consultor_id: '1', nome_cliente: 'Renato Gaúcho', destino: 'Maldivas', created_at: '2026-07-20', updated_at: '2026-07-22', status: 'AGUARDANDO', valor_proposta: 45000, tags: [], origem: 'Google' }
    ];

    // Generate mock viagens & produtos
    this.viagens = [
      {
        id: 'v1',
        consultor_id: '1',
        destino: 'Orlando',
        data_ida: '2026-07-10',
        data_volta: '2026-07-20',
        valor_total: 12000,
        status: 'confirmada',
        data_financeiro: '2026-06-15',
        dataFinanceiro: '2026-06-15',
        origem: 'Instagram',
        processo_conferido: true,
        produtos: [
          { fornecedor: 'Latam', valorCusto: 3200, valorVenda: 4000, comissao: 200, markup: 600, rav: 0, tipo: 'Voo', codigoReserva: 'LATAM99' },
          { fornecedor: 'Disney Resort', valorCusto: 6000, valorVenda: 8000, comissao: 800, markup: 1200, rav: 0, tipo: 'Hotel', codigoReserva: 'DISNEY88' }
        ]
      },
      {
        id: 'v2',
        consultor_id: '2',
        destino: 'Roma',
        data_ida: '2026-08-15',
        data_volta: '2026-08-25',
        valor_total: 21500,
        status: 'confirmada',
        data_financeiro: '2026-06-22',
        dataFinanceiro: '2026-06-22',
        origem: 'Indicação',
        processo_conferido: false,
        produtos: [
          { fornecedor: 'Alitalia', valorCusto: 7000, valorVenda: 8500, comissao: 300, markup: 1200, rav: 0, tipo: 'Voo', codigoReserva: 'AZ123' },
          { fornecedor: 'Marriott Rome', valorCusto: 10000, valorVenda: 13000, comissao: 1500, markup: 1500, rav: 0, tipo: 'Hotel', codigoReserva: 'MARR44' }
        ]
      }
    ];

    // Generate mock reembolsos
    this.reembolsos = [
      { id: 'r1', valor_solicitado: 4000, valor_aprovado: 3800, taxa_retencao: 200, status: 'pago', created_at: '2026-06-15', viagem: { consultor_id: '1' }, produto: { fornecedor: 'Latam' } }
    ];

    // Generate mock alerts
    this.alertas = [
      { id: 'm1', type: 'passport', title: 'SLA Passaporte - Felipe Melo', consultorId: '1', eventDate: '2026-08-10', dateStr: '10/08/2026' }
    ];

    this.formasRecebimento = [
      { id: 'f1', nome: 'Pix', icone: '⚡', ativo: true },
      { id: 'f2', nome: 'Crédito', icone: '💳', ativo: true },
      { id: 'f3', nome: 'Boleto', icone: '📄', ativo: true },
      { id: 'f4', nome: 'Transferência', icone: '🏦', ativo: true }
    ];

    this.locPagamentos = [
      { id: 'p1', viagem_id: 'v1', codigo_localizador: 'LATAM99', forma_recebimento_id: 'f1', valor: 4000, formas_recebimento: { nome: 'Pix', icone: '⚡' } },
      { id: 'p2', viagem_id: 'v1', codigo_localizador: 'DISNEY88', forma_recebimento_id: 'f2', valor: 8000, formas_recebimento: { nome: 'Crédito', icone: '💳' } },
      { id: 'p3', viagem_id: 'v2', codigo_localizador: 'AZ123', forma_recebimento_id: 'f1', valor: 8500, formas_recebimento: { nome: 'Pix', icone: '⚡' } },
      { id: 'p4', viagem_id: 'v2', codigo_localizador: 'MARR44', forma_recebimento_id: 'f2', valor: 10000, formas_recebimento: { nome: 'Crédito', icone: '💳' } }
    ];

    this.locConferencias = [
      { id: 'c1', viagem_id: 'v1', codigo_localizador: 'LATAM99', conferido: true },
      { id: 'c2', viagem_id: 'v1', codigo_localizador: 'DISNEY88', conferido: true },
      { id: 'c3', viagem_id: 'v2', codigo_localizador: 'AZ123', conferido: true },
      { id: 'c4', viagem_id: 'v2', codigo_localizador: 'MARR44', conferido: false }
    ];

    this.consultoresBadges = [
      { profile_id: '1', badge_key: 'SLA_CHAMP' },
      { profile_id: '1', badge_key: 'DRIVE_MASTER' },
      { profile_id: '1', badge_key: 'COMMUNICATOR' },
      { profile_id: '2', badge_key: 'FAST_SALE' },
      { profile_id: '2', badge_key: 'TEAM_PLAYER' },
      { profile_id: '3', badge_key: 'SLA_CHAMP' },
      { profile_id: '3', badge_key: 'DRIVE_MASTER' },
      { profile_id: '3', badge_key: 'COMPLIANCE_HERO' },
      { profile_id: '3', badge_key: 'VOUCHER_EXPERT' },
      { profile_id: '3', badge_key: 'GLOBETROTTER' },
      { profile_id: '3', badge_key: 'HOT_LEAD' }
    ];
  }

  /**
   * Filters database records locally based on date ranges and consultant filters
   */
  private getFilteredData() {
    const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
    const effectiveConsultorFilter = isAdmin ? this.consultorIdFilter : (this.user?.id || '');

    const start = new Date(this.dataInicio + 'T00:00:00');
    const end = new Date(this.dataFim + 'T23:59:59');

    // Helper to check date range (timezone-safe alfanumeric comparison)
    const inRange = (dateStr: string) => {
      if (!dateStr) return false;
      const cleanDate = dateStr.substring(0, 10);
      return cleanDate >= this.dataInicio && cleanDate <= this.dataFim;
    };

    // Helper to check consultant filter: Não-admin NUNCA vê dados de outros consultores
    const matchConsultant = (id: string) => {
      if (!isAdmin) {
        return id === effectiveConsultorFilter;
      }
      if (effectiveConsultorFilter === 'todos') return true;
      return id === effectiveConsultorFilter;
    };

    // Helper para viagens: reconhece consultor titular OU consultor parceiro com cota na viagem
    const matchViagemConsultant = (v: any) => {
      const cId = v.consultor_id || v.consultorId;
      if (!isAdmin) {
        return cId === effectiveConsultorFilter || ViagensDivisoesService.calcularParticipacaoConsultor(v, effectiveConsultorFilter) > 0;
      }
      if (effectiveConsultorFilter === 'todos') return true;
      return cId === effectiveConsultorFilter || ViagensDivisoesService.calcularParticipacaoConsultor(v, effectiveConsultorFilter) > 0;
    };

    const filteredViagens = this.viagens.filter(v => {
      const date = v.data_financeiro || v.dataFinanceiro || v.data_ida || v.dataIda;
      return inRange(date) && matchViagemConsultant(v);
    });
    const travelIds = new Set(filteredViagens.map(v => v.id));

    return {
      orcamentos: this.orcamentos.filter(o => inRange(o.created_at || o.createdAt) && matchConsultant(o.consultor_id || o.consultorId)),
      viagens: filteredViagens,
      reembolsos: this.reembolsos.filter(r => {
        const date = r.created_at || r.createdAt;
        const consultorId = r.viagem?.consultor_id || r.consultor_solicitante_id || r.consultorSolicitanteId;
        return inRange(date) && matchConsultant(consultorId);
      }),
      alertas: this.alertas.filter(a => {
        const date = a.createdAt || a.eventDate;
        return inRange(date) && matchConsultant(a.consultorId);
      }),
      locPagamentos: this.locPagamentos.filter(p => travelIds.has(p.viagem_id || p.viagemId)),
      locConferencias: this.locConferencias.filter(c => travelIds.has(c.viagem_id || c.viagemId)),
      formasRecebimento: this.formasRecebimento,
      consultoresBadges: this.consultoresBadges
    };
  }

  /**
   * Renders the basic scaffold of the page.
   */
  private render(): void {
    if (this.loading) {
      this.container.innerHTML = `
        <div class="flex-grow flex items-center justify-center p-12 h-screen">
          <div class="text-center space-y-4">
            <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">Compilando relatórios e análises preditivas...</p>
          </div>
        </div>
      `;
      return;
    }

    const data = this.getFilteredData();
    const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
    const contentHtml = this.renderActiveTabContent(data);

    this.container.innerHTML = RelatoriosShellView.renderShell({
      activeTab: this.activeTab,
      menuLateralRecolhido: this.menuLateralRecolhido,
      collapsedGroups: this.collapsedGroups,
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      consultorIdFilter: this.consultorIdFilter,
      consultores: this.consultores,
      isAdmin,
      perfilNome: this.perfil?.nome,
      contentHtml
    });
  }

  private getOperacoesContext(): RelatoriosOperacoesContext {
    return {
      user: this.user,
      perfil: this.perfil,
      consultores: this.consultores,
      viagens: this.viagens,
      clientes: this.clientes,
      orcamentos: this.orcamentos,
      lembretes: this.lembretes,
      feedbacksNps: this.feedbacksNps,
      tiposProduto: this.tiposProduto,
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      consultorIdFilter: this.consultorIdFilter,
      filtroContatoEmbarque: this.filtroContatoEmbarque,
      satisfacaoFiltroCategoria: this.satisfacaoFiltroCategoria,
      satisfacaoBuscaTexto: this.satisfacaoBuscaTexto,
      showToast: (msg: string, type?: 'success' | 'error', err?: any) => this.showToast(msg, type, err),
      openTravelModal: async (tripId: string) => {
        const modal = new EditTravelModal({
          perfil: this.perfil,
          consultores: this.consultores,
          tiposProduto: this.tiposProduto,
          viagens: this.viagens,
          isFallbackMode: false,
          user: this.user,
          onUpdate: async () => {
            await this.loadData();
            this.render();
            this.setupEventListeners();
          },
          showToast: (msg: string, type: any) => this.showToast(msg, type),
          checkSLA: () => ({ alert: false, type: null, text: '' })
        });
        await modal.open(tripId, 'detalhes');
      },
      openCommentsModal: (tipo: 'viagem' | 'produto', entityId: string, tripId: string, titulo: string, label: string) => {
        CommentsService.openCommentsModal(
          tipo,
          entityId,
          tripId,
          titulo,
          label,
          this.user?.id || '',
          this.consultores,
          async () => {
            await this.loadData();
            this.render();
            this.setupEventListeners();
          }
        );
      },
      onRefreshData: async () => {
        await this.loadData();
      },
      onStateChange: () => {
        const container = document.getElementById('report-view-container');
        if (container) {
          container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
          this.setupEventListeners();
        }
      },
      exportToCSV: () => {
        this.exportToCSV();
      }
    };
  }

  private getFinanceiroContext(): RelatoriosFinanceiroContext {
    return {
      viagens: this.viagens,
      orcamentos: this.orcamentos,
      consultores: this.consultores,
      clientes: this.clientes,
      formasRecebimento: this.formasRecebimento,
      tiposProduto: this.tiposProduto,
      perfil: this.perfil,
      user: this.user,
      filtroFaturamentoProduto: this.filtroFaturamentoProduto,
      filtroFaturamentoRav: this.filtroFaturamentoRav,
      activeTab: this.activeTab,
      showToast: (m, t, err) => this.showToast(m, t, err),
      onStateChange: () => {
        const container = document.getElementById('report-view-container');
        if (container) {
          container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
          this.setupEventListeners();
        }
      },
      abrirModalOrcamento: (orcId: string) => {
        this.abrirModalOrcamento(orcId);
      },
      getFilteredData: () => this.getFilteredData(),
      loadData: async () => {
        await this.loadData();
      },
      render: () => {
        this.render();
      },
      setupEventListeners: () => {
        this.setupEventListeners();
      }
    };
  }

  private getComercialContext(): RelatoriosComercialContext {
    return {
      viagens: this.viagens,
      orcamentos: this.orcamentos,
      consultores: this.consultores,
      clientes: this.clientes,
      reembolsos: this.reembolsos,
      locPagamentos: this.locPagamentos,
      metas: this.metas,
      feedbacksNps: this.feedbacksNps,
      campanhasPresets: this.campanhasPresets,
      campanhasFiltros: this.campanhasFiltros,
      selectedMetaId: this.selectedMetaId,
      consultorIdFilter: this.consultorIdFilter,
      perfil: this.perfil,
      user: this.user,
      activeTab: this.activeTab,
      showToast: (m, t, err) => this.showToast(m, t, err),
      onStateChange: () => {
        const container = document.getElementById('report-view-container');
        if (container) {
          container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
          this.setupEventListeners();
        }
      },
      exportToCSV: () => {
        this.exportToCSV();
      },
      getFilteredData: () => this.getFilteredData()
    };
  }

  private getInteligenciaContext(): RelatoriosInteligenciaContext {
    return {
      orcamentos: this.orcamentos,
      viagens: this.viagens,
      clientes: this.clientes,
      consultores: this.consultores,
      consultoresBadges: this.consultoresBadges,
      locPagamentos: this.locPagamentos,
      locConferencias: this.locConferencias,
      tiposProduto: this.tiposProduto,
      perfil: this.perfil,
      user: this.user,
      activeTab: this.activeTab,
      consultorIdFilter: this.consultorIdFilter,
      prazoReembolsoDias: this.prazoReembolsoDias,
      showToast: (m, t, err) => this.showToast(m, t, err),
      abrirModalOrcamento: (id: string) => this.abrirModalOrcamento(id),
      loadData: async () => {
        await this.loadData();
      },
      onStateChange: () => {
        const container = document.getElementById('report-view-container');
        if (container) {
          container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
          this.setupEventListeners();
        }
      }
    };
  }

  /**
   * Router/Switch for displaying active sub-report view
   */
  private renderActiveTabContent(data: any): string {
    switch (this.activeTab) {
      case 'desempenho':
        return RelatoriosComercialView.renderDesempenho(data, this.getComercialContext());
      case 'prazos':
        return RelatoriosOperacoesView.renderPrazos(data);
      case 'faturamento':
        return RelatoriosFinanceiroView.renderFaturamento(data, this.getFinanceiroContext());
      case 'perdas':
        return RelatoriosFinanceiroView.renderPerdas(data, this.getFinanceiroContext());
      case 'previsoes':
        return RelatoriosInteligenciaView.renderPrevisoes(data, this.getInteligenciaContext());
      case 'origens':
        return RelatoriosInteligenciaView.renderOrigens(data, this.getInteligenciaContext());
      case 'auditoria':
        return RelatoriosFinanceiroView.renderAuditoria(data, this.getFinanceiroContext());
      case 'posvenda':
        return RelatoriosOperacoesView.renderPosVenda(data, this.getOperacoesContext());
      case 'satisfacao':
        return RelatoriosOperacoesView.renderSatisfacao(data, this.getOperacoesContext());
      case 'embarques':
        return RelatoriosOperacoesView.renderEmbarques(data, this.getOperacoesContext());
      case 'gamificacao':
        return RelatoriosInteligenciaView.renderGamificacao(data, this.getInteligenciaContext());
      case 'metas_campanhas':
        return RelatoriosComercialView.renderMetasCampanhas(data, this.getComercialContext());
      case 'segmentacao_campanhas':
        return RelatoriosComercialView.renderSegmentacaoCampanhas(data, this.getComercialContext());
      case 'riscopreditivo':
        return RelatoriosInteligenciaView.renderRiscoPreditivo(data, this.getInteligenciaContext());
      default:
        return '';
    }
  }

  private setupEventListeners(): void {
    RelatoriosShellView.attachShellEvents(this.container, {
      onToggleMenuLateral: () => {
        this.menuLateralRecolhido = !this.menuLateralRecolhido;
        this.render();
        this.setupEventListeners();
      },
      onToggleGroup: (group: string) => {
        if (group in this.collapsedGroups) {
          this.collapsedGroups[group] = !this.collapsedGroups[group];
          this.render();
          this.setupEventListeners();
        }
      },
      onSelectTab: (tab: RelatorioTab) => {
        this.activeTab = tab;
        this.menuLateralRecolhido = true;
        this.render();
        this.setupEventListeners();
      },
      onApplyFilters: (dataInicioIso: string, dataFimIso: string, consultorId: string) => {
        const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
        this.dataInicio = dataInicioIso;
        this.dataFim = dataFimIso;
        if (isAdmin && consultorId) {
          this.consultorIdFilter = consultorId;
        } else if (!isAdmin) {
          this.consultorIdFilter = this.user?.id || '';
        }
        this.render();
        this.setupEventListeners();
      },
      onClearFilters: () => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        
        const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
        this.dataInicio = `${ano}-${mes}-01`;
        this.dataFim = `${ano}-${mes}-${dia}`;
        this.consultorIdFilter = isAdmin ? 'todos' : (this.user?.id || '');
        
        this.render();
        this.setupEventListeners();
      },
      onExportCsv: () => {
        this.exportToCSV();
      },
      onPrintPdf: () => {
        window.print();
      }
    });

    // Ouvintes dos submódulos específicos por aba
    if (['faturamento', 'perdas', 'auditoria'].includes(this.activeTab)) {
      RelatoriosFinanceiroView.attachEvents(this.activeTab, this.getFinanceiroContext());
    }

    if (['embarques', 'satisfacao'].includes(this.activeTab)) {
      RelatoriosOperacoesView.attachEvents(this.activeTab, this.getOperacoesContext());
    }

    if (['desempenho', 'metas_campanhas', 'segmentacao_campanhas'].includes(this.activeTab)) {
      RelatoriosComercialView.attachEvents(this.activeTab, this.getComercialContext());
    }

    if (['riscopreditivo', 'previsoes', 'origens', 'gamificacao'].includes(this.activeTab)) {
      RelatoriosInteligenciaView.attachEvents(this.activeTab, this.getInteligenciaContext());
    }
  }

  private showToast(message: string, type: 'success' | 'error' = 'success', err?: any): void {
    let finalMessage = message;
    if (err) {
      const translator = (window as any).traduzirErro;
      const translated = translator ? translator(err) : (err.message || err);
      if (translated && !message.includes(translated)) {
        finalMessage = `${message} Detalhes: ${translated}`;
      }
    }
    const toastId = 'paxflow-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
    }`;
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} <span>${finalMessage}</span>`;

    setTimeout(() => {
      toast!.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
    }, 4500);
  }

  /**
   * Generates a clean Excel-compatible CSV file containing viewed report rows
   */
  private exportToCSV(): void {
    const data = this.getFilteredData();
    let csvContent = '\uFEFF'; // UTF-8 BOM
    let filename = `relatorio-${this.activeTab}-${new Date().toISOString().slice(0,10)}.csv`;

    const operacoesCsv = RelatoriosOperacoesView.appendCsvContent(this.activeTab, data, this.getOperacoesContext());
    const financeiroCsv = RelatoriosFinanceiroView.appendCsvContent(this.activeTab, data, this.getFinanceiroContext());
    const comercialCsv = RelatoriosComercialView.appendCsvContent(this.activeTab, data, this.getComercialContext());
    const inteligenciaCsv = RelatoriosInteligenciaView.appendCsvContent(this.activeTab, data, this.getInteligenciaContext());

    if (operacoesCsv !== null) {
      csvContent += operacoesCsv;
    } else if (financeiroCsv !== null) {
      csvContent += financeiroCsv;
    } else if (comercialCsv !== null) {
      csvContent += comercialCsv;
    } else if (inteligenciaCsv !== null) {
      csvContent += inteligenciaCsv;
    }

    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public async abrirModalOrcamento(id: string): Promise<void> {
    let orc = this.orcamentos.find(o => o.id === id);

    if (!orc) {
      try {
        const { data: d } = await supabase
          .from('orcamentos')
          .select('*, cliente:clientes(*)')
          .eq('id', id)
          .maybeSingle();

        if (d) {
          orc = {
            id: d.id,
            consultorId: d.consultor_id || d.consultorId,
            clienteId: d.cliente_id || d.clienteId,
            cliente_id: d.cliente_id || d.clienteId,
            nomeCliente: d.nome_cliente || d.nomeCliente || d.cliente?.nome || 'Cliente',
            contato: d.contato || d.cliente?.telefone || d.cliente?.email || '',
            destino: d.destino || '',
            destino_id: d.destino_id || d.destinoId,
            destinoId: d.destino_id || d.destinoId,
            dataViagem: d.data_viagem || d.dataViagem || '',
            temperatura: d.temperatura || 'Frio',
            tags: d.tags || [],
            status: d.status || 'SOLICITADO',
            subStatus: d.sub_status || d.subStatus || '',
            notasNegociacao: d.notas_negociacao || d.notasNegociacao || '',
            valorProposta: d.valor_proposta !== undefined ? Number(d.valor_proposta) : (d.valorProposta !== undefined ? Number(d.valorProposta) : undefined),
            valorViagem: d.valor_viagem !== undefined ? Number(d.valor_viagem) : (d.valorViagem !== undefined ? Number(d.valorViagem) : undefined),
            origem: d.origem,
            codigoRef: d.codigo_ref || d.codigoRef,
            codigo_ref: d.codigo_ref || d.codigoRef,
            contatoRealizado: Boolean(d.contato_realizado || d.contatoRealizado),
            contato_realizado: Boolean(d.contato_realizado || d.contatoRealizado),
            contatoRealizadoEm: d.contato_realizado_em || d.contatoRealizadoEm,
            contato_realizado_em: d.contato_realizado_em || d.contatoRealizadoEm,
            contatoRealizadoPor: d.contato_realizado_por || d.contatoRealizadoPor,
            contato_realizado_por: d.contato_realizado_por || d.contatoRealizadoPor,
            contatoRealizadoPorNome: d.contato_realizado_por_profile?.nome,
            documentosUrl: d.documentos_url || d.documentosUrl || [],
            createdAt: d.created_at || d.createdAt,
            updatedAt: d.updated_at || d.updatedAt
          };
          this.orcamentos.push(orc);
        }
      } catch (e) {
        console.warn('Erro ao buscar orçamento por ID no banco:', e);
      }
    }

    if (!orc) {
      this.showToast('Orçamento não encontrado ou sem permissão de acesso.', 'error');
      return;
    }

    // Normalização completa dos campos de orcamento para garantir compatibilidade e resiliência total
    const orcNormalizado: Orcamento = {
      id: orc.id,
      consultorId: orc.consultorId || orc.consultor_id || this.user?.id || '',
      clienteId: orc.clienteId || orc.cliente_id || '',
      nomeCliente: orc.nomeCliente || orc.nome_cliente || orc.cliente?.nome || 'Cliente',
      contato: (typeof orc.contato === 'string' ? orc.contato : (orc.contato ? String(orc.contato) : '')) || orc.cliente?.telefone || orc.cliente?.email || '',
      destino: orc.destino || '',
      destino_id: orc.destino_id || orc.destinoId,
      destinoId: orc.destino_id || orc.destinoId,
      dataViagem: orc.dataViagem || orc.data_viagem || '',
      temperatura: orc.temperatura || 'Normal',
      tags: Array.isArray(orc.tags) ? orc.tags : (typeof orc.tags === 'string' ? ((orc.tags as string).startsWith('{') ? (orc.tags as string).slice(1, -1).split(',').filter(Boolean) : [orc.tags]) : []),
      status: orc.status || 'SOLICITADO',
      subStatus: orc.subStatus || orc.sub_status || '',
      notasNegociacao: orc.notasNegociacao || orc.notas_negociacao || '',
      valorProposta: orc.valorProposta !== undefined ? Number(orc.valorProposta) : (orc.valor_proposta !== undefined ? Number(orc.valor_proposta) : undefined),
      valorViagem: orc.valorViagem !== undefined ? Number(orc.valorViagem) : (orc.valor_viagem !== undefined ? Number(orc.valor_viagem) : undefined),
      origem: orc.origem,
      codigoRef: orc.codigoRef || orc.codigo_ref,
      codigo_ref: orc.codigoRef || orc.codigo_ref,
      contatoRealizado: Boolean(orc.contatoRealizado || orc.contato_realizado),
      contato_realizado: Boolean(orc.contatoRealizado || orc.contato_realizado),
      contatoRealizadoEm: orc.contatoRealizadoEm || orc.contato_realizado_em,
      contato_realizado_em: orc.contatoRealizadoEm || orc.contato_realizado_em,
      contatoRealizadoPor: orc.contatoRealizadoPor || orc.contato_realizado_por,
      contato_realizado_por: orc.contatoRealizadoPor || orc.contato_realizado_por,
      contatoRealizadoPorNome: orc.contatoRealizadoPorNome || orc.contato_realizado_por_profile?.nome,
      documentosUrl: Array.isArray(orc.documentosUrl) ? orc.documentosUrl : (Array.isArray(orc.documentos_url) ? orc.documentos_url : (typeof orc.documentosUrl === 'string' ? [orc.documentosUrl] : [])),
      createdAt: orc.createdAt || orc.created_at,
      updatedAt: orc.updatedAt || orc.updated_at
    };

    // Garante o portal de modais de orçamento no DOM
    let portal = document.getElementById('orcamento-modal-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'orcamento-modal-portal';
      document.body.appendChild(portal);
    }
    portal.innerHTML = '';

    portal.innerHTML = `
      <div id="modal-overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center opacity-0 pointer-events-auto transition-opacity duration-200">
        <div id="modal-content-container" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden transform scale-95 transition-all duration-200 flex flex-col max-h-[90vh] pointer-events-auto">
          <!-- Injetado dinamicamente -->
        </div>
      </div>
    `;

    const overlay = portal.querySelector('#modal-overlay') as HTMLElement | null;
    const content = portal.querySelector('#modal-content-container') as HTMLElement | null;

    setTimeout(() => {
      if (overlay && content) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        content.classList.remove('scale-95', 'pointer-events-none');
        content.classList.add('scale-100', 'pointer-events-auto');
      }
    }, 10);

    let escListener: ((e: KeyboardEvent) => void) | null = null;

    const fecharModalOrcamento = () => {
      if (escListener) {
        window.removeEventListener('keydown', escListener);
        escListener = null;
      }
      if (overlay && content) {
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        setTimeout(() => {
          if (portal) portal.innerHTML = '';
        }, 200);
      } else if (portal) {
        portal.innerHTML = '';
      }
    };

    // Fechar ao clicar no backdrop escuro
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        fecharModalOrcamento();
      }
    });

    // Fechar ao pressionar a tecla Escape
    escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fecharModalOrcamento();
      }
    };
    window.addEventListener('keydown', escListener);

    const consultoresAtivos = (this.consultores && this.consultores.length > 0)
      ? this.consultores
      : (this.perfil ? [this.perfil] : []);

    try {
      VerNotasModal.open(orcNormalizado, {
        user: this.user,
        perfil: this.perfil,
        consultores: consultoresAtivos,
        formatarDataBr: (dStr?: string) => formatIsoDateToBr(dStr || '') || dStr || '',
        calcularTempoAmigavel: (dataIso: string) => {
          if (!dataIso) return '';
          try {
            const diff = Date.now() - new Date(dataIso).getTime();
            if (isNaN(diff)) return '';
            const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
            if (dias === 0) return 'hoje';
            if (dias === 1) return 'há 1 dia';
            return `há ${dias} dias`;
          } catch {
            return '';
          }
        },
        closeModal: () => fecharModalOrcamento(),
        showToast: (msg, type) => this.showToast(msg, type),
        onUpdate: async (updatedOrc) => {
          try {
            const payload = {
              consultor_id: updatedOrc.consultorId,
              destino: updatedOrc.destino,
              destino_id: updatedOrc.destino_id || null,
              data_viagem: updatedOrc.dataViagem,
              temperatura: updatedOrc.temperatura,
              tags: updatedOrc.tags,
              status: updatedOrc.status,
              sub_status: updatedOrc.subStatus,
              notas_negociacao: updatedOrc.notasNegociacao,
              valor_proposta: updatedOrc.valorProposta,
              valor_viagem: updatedOrc.valorViagem,
              documentos_url: updatedOrc.documentosUrl,
              updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('orcamentos').update(payload).eq('id', updatedOrc.id);
            if (error) throw error;

            // Atualiza o registro em memória local
            const index = this.orcamentos.findIndex(o => o.id === updatedOrc.id);
            if (index >= 0) {
              this.orcamentos[index] = { ...this.orcamentos[index], ...payload, ...updatedOrc };
            }

            // Atualiza visualização da aba ativa se necessário
            const container = document.getElementById('report-view-container');
            if (container) {
              container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
              this.setupEventListeners();
            }

            this.showToast('Orçamento atualizado com sucesso!', 'success');
            return true;
          } catch (e: any) {
            console.error('Erro ao atualizar orçamento:', e);
            this.showToast('Erro ao salvar alterações no orçamento.', 'error');
            return false;
          }
        },
        onDelete: async (idToDelete) => {
          try {
            const { error } = await supabase.from('orcamentos').delete().eq('id', idToDelete);
            if (error) throw error;
            this.orcamentos = this.orcamentos.filter(o => o.id !== idToDelete);
            fecharModalOrcamento();

            const container = document.getElementById('report-view-container');
            if (container) {
              container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
              this.setupEventListeners();
            }

            this.showToast('Orçamento excluído com sucesso!', 'success');
            return true;
          } catch (e: any) {
            console.error('Erro ao excluir orçamento:', e);
            this.showToast('Erro ao excluir orçamento.', 'error');
            return false;
          }
        }
      });
    } catch (modalErr) {
      console.error('Erro ao inicializar VerNotasModal em RelatoriosPage:', modalErr);
      fecharModalOrcamento();
      this.showToast('Não foi possível exibir o orçamento selecionado.', 'error');
    }
  }

  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="flex-grow flex items-center justify-center p-12">
        <div class="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl text-center">
          <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Falha de Autenticação</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-2 font-semibold">${msg}</p>
        </div>
      </div>
    `;
  }
}
export default RelatoriosPage;
