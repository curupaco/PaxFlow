import { supabase, getSessaoAtual } from '../services/supabase';
import { PerfilConsultor } from '../types';
import { InboxService } from '../services/inboxService';
import { formatBrDateToIso } from '../utils/masks';
import { obterProgressoNivel, BADGE_DEFINITIONS } from '../services/gamification';
import { EditTravelModal } from '../components/dashboard/EditTravelModal';
import { CommentsService } from '../services/comments';

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
  private activeTab: 'desempenho' | 'prazos' | 'faturamento' | 'perdas' | 'previsoes' | 'fornecedores' | 'origens' | 'auditoria' | 'posvenda' | 'gamificacao' | 'embarques' = 'desempenho';

  // Controle de estado para grupos colapsáveis da barra lateral
  private collapsedGroups: { [key: string]: boolean } = {
    comercial: false,
    financeiro: false,
    operacional: false,
    equipe: false
  };
  
  // Data stores
  private orcamentos: any[] = [];
  private viagens: any[] = [];
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
  
  private loading: boolean = false;
  private prazoReembolsoDias: number = 30;

  constructor(container: HTMLElement) {
    this.container = container;
    
    // Set default date range to last 180 days (6 months)
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(hoje.getDate() - 180);
    
    this.dataInicio = inicio.toISOString().substring(0, 10);
    this.dataFim = hoje.toISOString().substring(0, 10);
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

      // Restrict default filter if user is common consultant
      if (this.perfil && this.perfil.role !== 'admin') {
        this.consultorIdFilter = this.perfil.id;
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

  public destroy(): void {}

  /**
   * Loads all tables from Supabase, applying fallbacks if offline or empty
   */
  private async loadData(): Promise<void> {
    try {
      // 1. Get consultants
      const { data: profilesData } = await supabase.from('profiles').select('*').order('nome');
      this.consultores = profilesData || [];

      // 2. Get global settings
      const { data: settingsData } = await supabase.from('global_settings').select('*');
      if (settingsData && settingsData.length > 0) {
        this.prazoReembolsoDias = settingsData[0].prazoReembolsoDias || 30;
      }

      // 3. Load orcamentos
      let orcQuery = supabase.from('orcamentos').select('*');
      if (this.perfil?.role !== 'admin') {
        orcQuery = orcQuery.eq('consultor_id', this.user.id);
      }
      const { data: orcData } = await orcQuery;
      this.orcamentos = orcData || [];

      // 4. Load viagens
      let viaQuery = supabase.from('viagens').select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)');
      if (this.perfil?.role !== 'admin') {
        viaQuery = viaQuery.eq('consultor_id', this.user.id);
      }
      const { data: viaData } = await viaQuery;
      this.viagens = viaData || [];

      // 5. Load reembolsos
      let reemQuery = supabase.from('reembolsos').select('*, viagem:viagens(*), produto:produtos_viagem(*)');
      const { data: reemData } = await reemQuery;
      const rawReem = reemData || [];
      if (this.perfil?.role !== 'admin') {
        this.reembolsos = rawReem.filter((r: any) => r.viagem?.consultor_id === this.user.id || r.consultor_solicitante_id === this.user.id);
      } else {
        this.reembolsos = rawReem;
      }

      // 6. Load alerts using InboxService
      this.alertas = await InboxService.loadAndBuildAlerts(this.user, this.perfil, this.prazoReembolsoDias);

      // 7. Load loc_pagamentos
      const { data: pagsData } = await supabase.from('loc_pagamentos').select('*, formas_recebimento(*)');
      this.locPagamentos = pagsData || [];

      // 8. Load loc_conferencias
      const { data: confData } = await supabase.from('loc_conferencias').select('*');
      this.locConferencias = confData || [];

      // 9. Load formas_recebimento
      const { data: formasData } = await supabase.from('formas_recebimento').select('*');
      this.formasRecebimento = formasData || [];

      // 10. Load profiles_badges
      const { data: badgesData } = await supabase.from('profiles_badges').select('*');
      this.consultoresBadges = badgesData || [];

      // 11. Load lembretes
      const { data: lembretesData } = await supabase.from('lembretes').select('*').eq('arquivado', false);
      this.lembretes = lembretesData || [];

      // 12. Load tipos_produto
      const { data: tiposData } = await supabase.from('tipos_produto').select('*').order('nome');
      this.tiposProduto = tiposData || [];
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
    const start = new Date(this.dataInicio + 'T00:00:00');
    const end = new Date(this.dataFim + 'T23:59:59');

    // Helper to check date range (timezone-safe alfanumeric comparison)
    const inRange = (dateStr: string) => {
      if (!dateStr) return false;
      const cleanDate = dateStr.substring(0, 10);
      return cleanDate >= this.dataInicio && cleanDate <= this.dataFim;
    };

    // Helper to check consultant filter
    const matchConsultant = (id: string) => {
      if (this.consultorIdFilter === 'todos') return true;
      return id === this.consultorIdFilter;
    };

    const filteredViagens = this.viagens.filter(v => {
      const date = v.data_financeiro || v.dataFinanceiro || v.data_ida || v.dataIda;
      return inRange(date) && matchConsultant(v.consultor_id || v.consultorId);
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

    this.container.innerHTML = `
      <div class="flex-grow flex flex-col overflow-y-auto custom-scrollbar p-6 max-w-7xl mx-auto w-full gap-6 print-full-width">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 no-print">
          <div>
            <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>📊 Painel de Relatórios Gerenciais</span>
            </h1>
            <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">
              Validações e métricas de desempenho, SLAs, previsões comerciais e qualidade de parceiros.
            </p>
          </div>
          
          <div class="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button id="btn-export-csv" class="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm">
              📥 Exportar Excel (CSV)
            </button>
            <button id="btn-print-pdf" class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10">
              🖨️ Imprimir PDF
            </button>
          </div>
        </div>

        <!-- Global Filters Bar (sticky/sticky-top) -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-end md:items-center gap-4 global-filters-bar no-print">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-4 flex-grow w-full md:w-auto">
            <!-- Date range start -->
            <div class="space-y-1 flex-1">
              <label class="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Data Início</label>
              <input id="filter-data-inicio" type="date" value="${this.dataInicio}" class="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
              <p id="filter-data-inicio-error" class="hidden text-xs text-rose-500 font-bold mt-1.5"></p>
            </div>

            <!-- Date range end -->
            <div class="space-y-1 flex-1">
              <label class="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Data Fim</label>
              <input id="filter-data-fim" type="date" value="${this.dataFim}" class="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
              <p id="filter-data-fim-error" class="hidden text-xs text-rose-500 font-bold mt-1.5"></p>
            </div>

            <!-- Team / Consultant filter -->
            <div class="space-y-1 flex-1">
              <label class="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Consultor / Equipe</label>
              <select id="filter-consultores" class="w-full text-xs font-bold px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" ${this.perfil?.role !== 'admin' ? 'disabled' : ''}>
                <option value="todos" ${this.consultorIdFilter === 'todos' ? 'selected' : ''}>Consolidado (Todos os Consultores)</option>
                ${this.consultores.map(c => `<option value="${c.id}" ${this.consultorIdFilter === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div class="flex items-center gap-2 flex-shrink-0">
            <button id="btn-limpar-filtros" class="px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black rounded-xl transition flex-shrink-0">
              Limpar
            </button>
            <button id="btn-aplicar-filtros" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 flex-shrink-0">
              🔍 Aplicar
            </button>
          </div>
        </div>

        <!-- Dashboard Workspace Grid (Left Menu Tabs & Right View Panel) -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start print-full-width">
          
          <!-- Navigation Sidebar inside panel (Tabs) -->
          <div class="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col gap-4 report-tabs-bar no-print flex-shrink-0">

            <!-- Grupo 1: Gestão Comercial -->
            <div class="space-y-1">
              <button class="report-group-header w-full flex items-center justify-between px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none" data-group="comercial">
                <span class="flex items-center gap-1.5">💼 Gestão Comercial</span>
                <svg class="w-3.5 h-3.5 transition-transform duration-200 ${this.collapsedGroups.comercial ? '' : 'transform rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <div class="space-y-1 pl-1 transition-all ${this.collapsedGroups.comercial ? 'hidden' : ''}">
                <button data-tab="desempenho" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'desempenho' ? 'report-tab-active' : 'text-slate-500'}">
                  🎯 Desempenho
                </button>
                <button data-tab="origens" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'origens' ? 'report-tab-active' : 'text-slate-500'}">
                  📢 Origem de Leads
                </button>
                <button data-tab="previsoes" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'previsoes' ? 'report-tab-active' : 'text-slate-500'}">
                  🔮 Previsões Preditivas
                </button>
              </div>
            </div>

            <!-- Grupo 2: Financeiro & Auditoria -->
            <div class="space-y-1">
              <button class="report-group-header w-full flex items-center justify-between px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none" data-group="financeiro">
                <span class="flex items-center gap-1.5">🪙 Financeiro & Auditoria</span>
                <svg class="w-3.5 h-3.5 transition-transform duration-200 ${this.collapsedGroups.financeiro ? '' : 'transform rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <div class="space-y-1 pl-1 transition-all ${this.collapsedGroups.financeiro ? 'hidden' : ''}">
                <button data-tab="faturamento" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'faturamento' ? 'report-tab-active' : 'text-slate-500'}">
                  💰 Faturamento
                </button>
                <button data-tab="auditoria" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'auditoria' ? 'report-tab-active' : 'text-slate-500'}">
                  🪙 Recebimentos & Auditoria
                </button>
                <button data-tab="perdas" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'perdas' ? 'report-tab-active' : 'text-slate-500'}">
                  📉 Desistências & Perdas
                </button>
              </div>
            </div>

            <!-- Grupo 3: Operações & SLAs -->
            <div class="space-y-1">
              <button class="report-group-header w-full flex items-center justify-between px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none" data-group="operacional">
                <span class="flex items-center gap-1.5">⚙️ Operações & SLAs</span>
                <svg class="w-3.5 h-3.5 transition-transform duration-200 ${this.collapsedGroups.operacional ? '' : 'transform rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <div class="space-y-1 pl-1 transition-all ${this.collapsedGroups.operacional ? 'hidden' : ''}">
                <button data-tab="prazos" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'prazos' ? 'report-tab-active' : 'text-slate-500'}">
                  ⏰ Controle de SLAs
                </button>
                <button data-tab="posvenda" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'posvenda' ? 'report-tab-active' : 'text-slate-500'}">
                  ✈️ Pós-Venda & SLAs
                </button>
                <button data-tab="embarques" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'embarques' ? 'report-tab-active' : 'text-slate-500'}">
                  ✈️ Relatório de Embarque
                </button>
                <button data-tab="fornecedores" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'fornecedores' ? 'report-tab-active' : 'text-slate-500'}">
                  🏢 Qualidade / Fornecedores
                </button>
              </div>
            </div>

            <!-- Grupo 4: Gestão de Equipe -->
            <div class="space-y-1">
              <button class="report-group-header w-full flex items-center justify-between px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none" data-group="equipe">
                <span class="flex items-center gap-1.5">👥 Gestão de Equipe</span>
                <svg class="w-3.5 h-3.5 transition-transform duration-200 ${this.collapsedGroups.equipe ? '' : 'transform rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <div class="space-y-1 pl-1 transition-all ${this.collapsedGroups.equipe ? 'hidden' : ''}">
                <button data-tab="gamificacao" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 ${this.activeTab === 'gamificacao' ? 'report-tab-active' : 'text-slate-500'}">
                  🏆 Gamificação & Ranking
                </button>
              </div>
            </div>

          </div>

          <!-- Main View Pane (Detail content) -->
          <div class="lg:col-span-3 space-y-6 print-full-width" id="report-view-container">
            ${this.renderActiveTabContent(data)}
          </div>

        </div>

      </div>
    `;
  }

  /**
   * Router/Switch for displaying active sub-report view
   */
  private renderActiveTabContent(data: any): string {
    switch (this.activeTab) {
      case 'desempenho':
        return this.renderDesempenho(data);
      case 'prazos':
        return this.renderPrazos(data);
      case 'faturamento':
        return this.renderFaturamento(data);
      case 'perdas':
        return this.renderPerdas(data);
      case 'previsoes':
        return this.renderPrevisoes(data);
      case 'fornecedores':
        return this.renderFornecedores(data);
      case 'origens':
        return this.renderOrigens(data);
      case 'auditoria':
        return this.renderAuditoria(data);
      case 'posvenda':
        return this.renderPosVenda(data);
      case 'embarques':
        return this.renderEmbarques(data);
      case 'gamificacao':
        return this.renderGamificacao(data);
      default:
        return '';
    }
  }

  // ==========================================
  // VIEW: 1. DESEMPENHO E PRODUTIVIDADE
  // ==========================================
  private renderDesempenho(data: any): string {
    // Volume de Vendas
    const activeViaIds = new Set(data.viagens.map((v: any) => v.id));
    const pagsSub = data.locPagamentos.filter((p: any) => 
      activeViaIds.has(p.viagem_id || p.viagemId) &&
      p.formas_recebimento &&
      ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
    );
    const totalSub = pagsSub.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0);
    const totalVendido = Math.max(0, data.viagens.reduce((acc: number, v: any) => acc + (v.valor_total || v.valorTotal || 0), 0) - totalSub);
    const orcados = data.orcamentos.length;
    
    // Conversão
    const fechadosAceitos = data.orcamentos.filter((o: any) => o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO').length;
    const fechadosRecusados = data.orcamentos.filter((o: any) => o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA').length;
    const finalizados = fechadosAceitos + fechadosRecusados;
    const conversao = finalizados > 0 ? Math.round((fechadosAceitos / finalizados) * 100) : 0;
    
    // Atendimentos ativos
    const ativos = data.orcamentos.filter((o: any) => o.status !== 'CONCLUIDO').length;

    // Tempo médio de fechamento (dias)
    let totalDias = 0;
    let countDias = 0;
    data.orcamentos.forEach((o: any) => {
      if ((o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO') && o.created_at && o.updated_at) {
        const diff = new Date(o.updated_at).getTime() - new Date(o.created_at).getTime();
        totalDias += Math.max(0, diff / (1000 * 60 * 60 * 24));
        countDias++;
      }
    });
    const tempoMedio = countDias > 0 ? Math.round(totalDias / countDias) : 0;

    // Build SVG chart: Sales per consultant
    const consultantSales: Record<string, number> = {};
    data.viagens.forEach((v: any) => {
      const cId = v.consultor_id || v.consultorId || 'unknown';
      const cNome = this.consultores.find(c => c.id === cId)?.nome || 'Outros';
      const vPayments = data.locPagamentos.filter((p: any) => 
        (p.viagem_id === v.id || p.viagemId === v.id) &&
        p.formas_recebimento &&
        ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
      );
      const vSub = vPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
      consultantSales[cNome] = (consultantSales[cNome] || 0) + Math.max(0, (v.valor_total || v.valorTotal || 0) - vSub);
    });

    const entries = Object.entries(consultantSales);
    const maxVal = entries.length > 0 ? Math.max(...entries.map(e => e[1])) : 1;
    
    let chartRows = '';
    entries.forEach(([nome, val], i) => {
      const widthPct = Math.round((val / maxVal) * 80) + 5; // scaled to fits in SVG
      const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
      chartRows += `
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>${nome}</span>
            <span>${formattedVal}</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-lg overflow-hidden flex">
            <div class="bg-indigo-600 h-full rounded-lg transition-all duration-500" style="width: ${widthPct}%"></div>
          </div>
        </div>
      `;
    });

    if (!chartRows) {
      chartRows = '<p class="text-xs text-slate-400 font-bold py-6 text-center">Nenhum dado de vendas no período selecionado.</p>';
    }

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🎯 Desempenho e Produtividade Comercial</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Volume de Vendas</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalVendido)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cotações Criadas</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${orcados}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxa de Conversão</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${conversao}%</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Média de Fechamento</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${tempoMedio} dias</p>
          </div>
        </div>

        <!-- Sales Chart Section -->
        <div class="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl gap-4 flex flex-col">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Ranking de Vendas por Consultor</h3>
          <div class="space-y-4">
            ${chartRows}
          </div>
        </div>

        <!-- Table detailing data -->
        <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
          <table class="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                <th class="p-3">Consultor</th>
                <th class="p-3">Orçamentos</th>
                <th class="p-3">Fechados (Sim)</th>
                <th class="p-3">Taxa Conv.</th>
                <th class="p-3">Total Vendido</th>
              </tr>
            </thead>
            <tbody>
              ${this.consultores
                .filter(c => this.consultorIdFilter === 'todos' || c.id === this.consultorIdFilter)
                .map(c => {
                  const subOrc = data.orcamentos.filter((o: any) => (o.consultor_id || o.consultorId) === c.id);
                  const subVia = data.viagens.filter((v: any) => (v.consultor_id || v.consultorId) === c.id);
                  
                  const cAceito = subOrc.filter((o: any) => o.sub_status === 'ACEITO' || o.subStatus === 'ACEITO').length;
                  const cRecuso = subOrc.filter((o: any) => o.sub_status === 'DESISTENCIA' || o.subStatus === 'DESISTENCIA').length;
                  const cConv = (cAceito + cRecuso) > 0 ? Math.round((cAceito / (cAceito + cRecuso)) * 100) : 0;
                  
                  const cSales = subVia.reduce((sum: number, v: any) => {
                    const vPayments = data.locPagamentos.filter((p: any) => 
                      (p.viagem_id === v.id || p.viagemId === v.id) &&
                      p.formas_recebimento &&
                      ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
                    );
                    const vSub = vPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
                    return sum + Math.max(0, (v.valor_total || v.valorTotal || 0) - vSub);
                  }, 0);
                  
                  return `
                  <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${c.nome}</td>
                    <td class="p-3">${subOrc.length}</td>
                    <td class="p-3">${cAceito}</td>
                    <td class="p-3 font-extrabold text-emerald-600">${cConv}%</td>
                    <td class="p-3 font-extrabold">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cSales)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 2. SLA & PRAZOS
  // ==========================================
  private renderPrazos(data: any): string {
    const totalAlertas = data.alertas.length;
    
    // Simple mock calculation of delays or averages
    const vencidos = data.alertas.filter((a: any) => {
      if (!a.eventDate) return false;
      const limite = new Date(a.eventDate);
      return limite < new Date() && !a.arquivado;
    }).length;

    // Alertas por consultor
    const alertListHtml = data.alertas.slice(0, 10).map((a: any) => `
      <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${a.title}</td>
        <td class="p-3">${a.consultorNome}</td>
        <td class="p-3">${a.dateStr}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
            vencidos > 0 
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' 
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
          }">
            ${vencidos > 0 ? 'Estourado' : 'Dentro do Prazo'}
          </span>
        </td>
      </tr>
    `).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>⏰ Painel de SLA, Prazos e Operações</span>
        </h2>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alertas Totais do Período</p>
            <p class="text-lg font-black text-indigo-600 mt-1">${totalAlertas}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prazos de SLA Estourados</p>
            <p class="text-lg font-black text-rose-600 mt-1">${vencidos}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Segurança Operacional</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${totalAlertas > 0 ? Math.round(((totalAlertas - vencidos) / totalAlertas) * 100) : 100}%</p>
          </div>
        </div>

        <!-- Timeline / Detailed report table -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Registros de Alertas Recentes</h3>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Alerta</th>
                  <th class="p-3">Consultor</th>
                  <th class="p-3">Data Limite</th>
                  <th class="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                ${alertListHtml || `
                  <tr>
                    <td colspan="4" class="p-6 text-center text-slate-400 font-extrabold">Nenhum alerta registrado neste período.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 3. FATURAMENTO E LUCRATIVIDADE
  // ==========================================
  private renderFaturamento(data: any): string {
    let faturamentoBruto = 0;
    let custoTotal = 0;
    let comissaoTotal = 0;
    let markupTotal = 0;
    let ravTotal = 0;
    let totalSubtrair = 0;

    data.viagens.forEach((v: any) => {
      faturamentoBruto += (v.valor_total || v.valorTotal || 0);
      
      const vPayments = data.locPagamentos.filter((p: any) => 
        (p.viagem_id === v.id || p.viagemId === v.id) &&
        p.formas_recebimento &&
        ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
      );
      totalSubtrair += vPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);

      if (v.produtos) {
        v.produtos.forEach((p: any) => {
          if (p.status !== 'cancelado') {
            custoTotal += (p.valorCusto || p.valor_custo || 0);
            comissaoTotal += (p.comissao || 0);
            markupTotal += (p.markup || 0);
            ravTotal += (p.rav || 0);
          }
        });
      }
    });

    faturamentoBruto = Math.max(0, faturamentoBruto - totalSubtrair);
    const lucroBruto = Math.max(0, faturamentoBruto - custoTotal);
    const lucroLiquidoReal = Math.max(0, comissaoTotal + markupTotal + ravTotal - totalSubtrair);
    const margemMedia = faturamentoBruto > 0 ? Math.round((lucroLiquidoReal / faturamentoBruto) * 100) : 0;

    // Grouping by product types
    const productTypes: Record<string, { faturamento: number, custo: number, lucro: number }> = {};
    data.viagens.forEach((v: any) => {
      if (v.produtos) {
        v.produtos.forEach((p: any) => {
          if (p.status !== 'cancelado') {
            const tipo = p.tipo || 'Outros';
            if (!productTypes[tipo]) {
              productTypes[tipo] = { faturamento: 0, custo: 0, lucro: 0 };
            }
            productTypes[tipo].faturamento += (p.valorVenda || 0);
            productTypes[tipo].custo += (p.valorCusto || 0);
            productTypes[tipo].lucro += ((p.comissao || 0) + (p.markup || 0) + (p.rav || 0));
          }
        });
      }
    });

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>💰 Faturamento e Lucratividade</span>
        </h2>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Faturamento Bruto</p>
            <p class="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(faturamentoBruto)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Comissão Realizada</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(comissaoTotal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lucro Líquido</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lucroLiquidoReal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Margem de Lucro</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${margemMedia}%</p>
          </div>
        </div>

        <!-- Profit by category table -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Lucratividade por Linha de Produto</h3>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Categoria</th>
                  <th class="p-3">Faturamento Venda</th>
                  <th class="p-3">Custo Fornecedor</th>
                  <th class="p-3">Lucro Realizado (Margem)</th>
                  <th class="p-3">Margem (%)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(productTypes).map(([tipo, vals]) => {
                  const mPct = vals.faturamento > 0 ? Math.round((vals.lucro / vals.faturamento) * 100) : 0;
                  return `
                    <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                      <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${tipo}</td>
                      <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vals.faturamento)}</td>
                      <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vals.custo)}</td>
                      <td class="p-3 font-extrabold text-indigo-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vals.lucro)}</td>
                      <td class="p-3 font-extrabold">${mPct}%</td>
                    </tr>
                  `;
                }).join('') || `
                  <tr>
                    <td colspan="5" class="p-6 text-center text-slate-400 font-extrabold">Nenhum produto registrado ou faturado no período.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 4. DESISTÊNCIAS E PERDAS
  // ==========================================
  private renderPerdas(data: any): string {
    const perdidos = data.orcamentos.filter((o: any) => o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA');
    
    // Valor total de fuga de receita
    const totalPerdido = perdidos.reduce((acc: number, o: any) => acc + (o.valorProposta || o.valor_proposta || 0), 0);
    const countPerdas = perdidos.length;
    const mediaPerda = countPerdas > 0 ? Math.round(totalPerdido / countPerdas) : 0;

    // Custos operacionais com reembolsos retidos
    const taxaRetencaoTotal = data.reembolsos.reduce((acc: number, r: any) => acc + (r.taxa_retencao || r.taxaRetencao || 0), 0);

    // Grouping by cancel reasons from tags
    const reasonsMap: Record<string, number> = {};
    perdidos.forEach((o: any) => {
      const tagMotivo = o.tags?.find((t: string) => t.startsWith('Desistência:'));
      const reason = tagMotivo ? tagMotivo.replace('Desistência: ', '').replace('Desistência:', '').trim() : 'Não informado';
      reasonsMap[reason] = (reasonsMap[reason] || 0) + 1;
    });

    const entries = Object.entries(reasonsMap);
    
    // Build Donut Chart via SVG
    let donutSegments = '';
    let totalReasons = entries.reduce((acc, e) => acc + e[1], 0) || 1;
    let accumulatedAngle = 0;
    const colors = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#6b7280'];

    entries.forEach(([motivo, count], i) => {
      const percentage = (count / totalReasons) * 100;
      const angle = (count / totalReasons) * 360;
      
      // Coordinate conversions for SVG donut stroke
      const color = colors[i % colors.length];
      const strokeDash = `${percentage} ${100 - percentage}`;
      const strokeOffset = 100 - accumulatedAngle + 25; // 25 is rotation offset to start from top
      
      donutSegments += `
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="${color}" stroke-width="4.5" stroke-dasharray="${percentage} ${100 - percentage}" stroke-dashoffset="${strokeOffset}"></circle>
      `;
      accumulatedAngle += percentage;
    });

    // Render legend
    const legendHtml = entries.map(([motivo, count], i) => {
      const color = colors[i % colors.length];
      const pct = Math.round((count / totalReasons) * 100);
      return `
        <div class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${color}"></span>
          <span class="truncate flex-grow">${motivo}</span>
          <span class="font-extrabold text-slate-800 dark:text-slate-100">${pct}% (${count})</span>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>📉 Desistências, Fugas de Receita e Perdas</span>
        </h2>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fuga de Receita Estimada</p>
            <p class="text-xl font-black text-rose-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPerdido)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Desistências</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${countPerdas}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxas Retidas (Reembolsos)</p>
            <p class="text-lg font-black text-rose-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(taxaRetencaoTotal)}</p>
          </div>
        </div>

        <!-- Donut reasons -->
        <div class="grid grid-cols-1 md:grid-cols-12 items-center gap-6 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl">
          <div class="md:col-span-5 flex justify-center">
            <!-- SVG Donut Chart -->
            <svg viewBox="0 0 42 42" class="w-36 h-36 transform -rotate-90">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" stroke-width="4.5" class="dark:stroke-slate-800"></circle>
              ${donutSegments || `<circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" stroke-width="4.5"></circle>`}
            </svg>
          </div>
          <div class="md:col-span-7 space-y-2.5">
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-wider">Motivos de Desistência Registrados</h4>
            <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              ${legendHtml || '<p class="text-xs text-slate-400 font-bold">Nenhum motivo catalogado no período.</p>'}
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Lista Analítica de Ocorrências e Perdas</h3>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Destino</th>
                  <th class="p-3">Valor Proposta</th>
                  <th class="p-3">Motivo da Desistência</th>
                </tr>
              </thead>
              <tbody>
                ${perdidos.map((o: any) => {
                  const tagMotivo = o.tags?.find((t: string) => t.startsWith('Desistência:'));
                  const reason = tagMotivo ? tagMotivo.replace('Desistência: ', '').replace('Desistência:', '').trim() : 'Não informado';
                  return `
                    <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                      <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${o.nome_cliente || o.nomeCliente}</td>
                      <td class="p-3">${o.destino}</td>
                      <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.valorProposta || o.valor_proposta || 0)}</td>
                      <td class="p-3 font-extrabold text-rose-500">${reason}</td>
                    </tr>
                  `;
                }).join('') || `
                  <tr>
                    <td colspan="4" class="p-6 text-center text-slate-400 font-extrabold">Nenhuma desistência registrada no período.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 5. PREVISÕES PREDITIVAS
  // ==========================================
  private renderPrevisoes(data: any): string {
    const matchConsultant = (id: string) => {
      if (this.consultorIdFilter === 'todos') return true;
      return id === this.consultorIdFilter;
    };

    // 1. Pipeline ativo
    const pipelineOrc = this.orcamentos.filter((o: any) => o.status !== 'CONCLUIDO' && matchConsultant(o.consultor_id || o.consultorId));
    const valorPipelineBruto = pipelineOrc.reduce((acc, o) => acc + (o.valorProposta || o.valor_proposta || 0), 0);

    // Probabilidades por fase do funil
    // SOLICITADO = 15%, EM_ANDAMENTO = 45%, AGUARDANDO = 75%
    let valorPonderado = 0;
    let counts = { solicitado: 0, em_andamento: 0, aguardando: 0 };
    let values = { solicitado: 0, em_andamento: 0, aguardando: 0 };

    pipelineOrc.forEach((o: any) => {
      const val = o.valorProposta || o.valor_proposta || 0;
      if (o.status === 'SOLICITADO') {
        valorPonderado += val * 0.15;
        counts.solicitado++;
        values.solicitado += val;
      } else if (o.status === 'EM_ANDAMENTO') {
        valorPonderado += val * 0.45;
        counts.em_andamento++;
        values.em_andamento += val;
      } else if (o.status === 'AGUARDANDO') {
        valorPonderado += val * 0.75;
        counts.aguardando++;
        values.aguardando += val;
      }
    });

    // Projeções futuras de embarques nos próximos 30 dias (Faturamento caixa iminente)
    const hoje = new Date();
    const limite30Dias = new Date();
    limite30Dias.setDate(hoje.getDate() + 30);

    const proximosEmbarques = this.viagens.filter((v: any) => {
      if (!v.data_ida && !v.dataIda) return false;
      const dataIda = new Date(v.data_ida || v.dataIda);
      return dataIda >= hoje && dataIda <= limite30Dias && v.status !== 'cancelada' && matchConsultant(v.consultor_id || v.consultorId);
    });

    const valorEmbarquesProximos = proximosEmbarques.reduce((acc, v) => acc + (v.valor_total || v.valorTotal || 0), 0);

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🔮 Projeções Comerciais e Previsão Preditiva</span>
        </h2>
        
        <!-- Alerta de compliance offline -->
        <div class="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
          <span>🔒</span>
          <span><strong>Compliance de Dados:</strong> Este relatório utiliza algoritmos estatísticos lineares executados localmente em seu navegador. Nenhum dado é enviado para APIs de IA externas ou consome tokens online.</span>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pipeline Ativo Total (Cotação)</p>
            <p class="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorPipelineBruto)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center border-l-4 border-l-indigo-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fechamento Previsto (Ponderado)</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorPonderado)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Embarques Próximos (30 dias)</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorEmbarquesProximos)}</p>
          </div>
        </div>

        <!-- Funil preditivo -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Funil de Cotação Ativa (Pipeline Ponderado)</h3>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Etapa/Status</th>
                  <th class="p-3 text-center">Quantidade</th>
                  <th class="p-3">Volume Bruto</th>
                  <th class="p-3 text-center">Conversão Est. (%)</th>
                  <th class="p-3">Receita Prevista (Ponderado)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">1. Solicitado (Novo Lead)</td>
                  <td class="p-3 text-center">${counts.solicitado}</td>
                  <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.solicitado)}</td>
                  <td class="p-3 text-center text-rose-500">15%</td>
                  <td class="p-3 font-extrabold text-indigo-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.solicitado * 0.15)}</td>
                </tr>
                <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">2. Em Andamento (Negociação)</td>
                  <td class="p-3 text-center">${counts.em_andamento}</td>
                  <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.em_andamento)}</td>
                  <td class="p-3 text-center text-amber-500">45%</td>
                  <td class="p-3 font-extrabold text-indigo-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.em_andamento * 0.45)}</td>
                </tr>
                <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">3. Aguardando (Fechamento)</td>
                  <td class="p-3 text-center">${counts.aguardando}</td>
                  <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.aguardando)}</td>
                  <td class="p-3 text-center text-emerald-500">75%</td>
                  <td class="p-3 font-extrabold text-indigo-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.aguardando * 0.75)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 6. QUALIDADE DE FORNECEDORES
  // ==========================================
  private renderFornecedores(data: any): string {
    const totalReembolsos = data.reembolsos.length;

    // Compile supplier stats from viagens & reembolsos
    const supplierStats: Record<string, { totalSold: number, totalCusto: number, totalLucro: number, salesCount: number, refundCount: number, retentionTax: number }> = {};
    
    // Fill from viajes product suppliers
    data.viagens.forEach((v: any) => {
      if (v.produtos) {
        v.produtos.forEach((p: any) => {
          const supplier = p.fornecedor || 'Desconhecido';
          if (!supplierStats[supplier]) {
            supplierStats[supplier] = { totalSold: 0, totalCusto: 0, totalLucro: 0, salesCount: 0, refundCount: 0, retentionTax: 0 };
          }
          if (p.status !== 'cancelado') {
            const venda = (p.valorVenda || 0);
            const custo = (p.valorCusto || p.valor_custo || 0);
            const comissao = (p.comissao || 0);
            const markup = (p.markup || 0);
            const rav = (p.rav || 0);

            supplierStats[supplier].totalSold += venda;
            supplierStats[supplier].totalCusto += custo;
            supplierStats[supplier].totalLucro += (comissao + markup + rav);
            supplierStats[supplier].salesCount++;
          }
        });
      }
    });

    // Fill refund statistics
    data.reembolsos.forEach((r: any) => {
      const supplier = r.produto?.fornecedor || 'Desconhecido';
      if (!supplierStats[supplier]) {
        supplierStats[supplier] = { totalSold: 0, totalCusto: 0, totalLucro: 0, salesCount: 0, refundCount: 0, retentionTax: 0 };
      }
      supplierStats[supplier].refundCount++;
      supplierStats[supplier].retentionTax += (r.taxa_retencao || r.taxaRetencao || 0);
    });

    const tableRows = Object.entries(supplierStats).map(([fornecedor, stats]) => {
      const refundRate = stats.salesCount > 0 ? Math.round((stats.refundCount / stats.salesCount) * 100) : 0;
      const profitMargin = stats.totalSold > 0 ? Math.round((stats.totalLucro / stats.totalSold) * 100) : 0;
      
      // Determine risk score
      let riskClass = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30';
      let riskLabel = 'Estável (OK)';
      
      if (refundRate > 25) {
        riskClass = 'bg-rose-50 text-rose-600 dark:bg-rose-950/30';
        riskLabel = 'Crítico (Alto Risco)';
      } else if (refundRate > 10) {
        riskClass = 'bg-amber-50 text-amber-600 dark:bg-amber-950/30';
        riskLabel = 'Atenção (Alerta)';
      }

      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${fornecedor}</td>
          <td class="p-3 text-center">${stats.salesCount}</td>
          <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSold)}</td>
          <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalCusto)}</td>
          <td class="p-3 font-extrabold text-indigo-650">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalLucro)}</td>
          <td class="p-3 text-center font-extrabold text-indigo-600">${profitMargin}%</td>
          <td class="p-3 text-center">${stats.refundCount}</td>
          <td class="p-3 font-extrabold text-rose-500 text-center">${refundRate}%</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${riskClass}">
              ${riskLabel}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🏢 Qualidade dos Fornecedores e Cancelamentos</span>
        </h2>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ocorrências de Reembolsos</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${totalReembolsos}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxa de Ocorrência Global</p>
            <p class="text-lg font-black text-rose-600 mt-1">${data.viagens.length > 0 ? Math.round((totalReembolsos / data.viagens.length) * 100) : 0}%</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prejuízo por Taxas de Retenção</p>
            <p class="text-lg font-black text-rose-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
              data.reembolsos.reduce((acc: number, r: any) => acc + (r.taxa_retencao || r.taxaRetencao || 0), 0)
            )}</p>
          </div>
        </div>

        <!-- Table suppliers -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Performance Operacional por Fornecedor</h3>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Parceiro / Consolidador</th>
                  <th class="p-3 text-center">Vendas</th>
                  <th class="p-3">Faturamento</th>
                  <th class="p-3">Custo</th>
                  <th class="p-3">Lucro Líquido</th>
                  <th class="p-3 text-center">Margem (%)</th>
                  <th class="p-3 text-center">Reembolsos</th>
                  <th class="p-3 text-center">Taxa Incidência</th>
                  <th class="p-3">Grau de Risco</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows || `
                  <tr>
                    <td colspan="9" class="p-6 text-center text-slate-400 font-extrabold">Nenhum parceiro ou fornecedor cadastrado nas viagens ativas.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 7. ORIGEM DE LEADS
  // ==========================================
  private renderOrigens(data: any): string {
    const orcados = data.orcamentos.length;
    const fechadosAceitos = data.orcamentos.filter((o: any) => o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO').length;
    const fechadosRecusados = data.orcamentos.filter((o: any) => o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA').length;
    const finalizados = fechadosAceitos + fechadosRecusados;
    const conversaoGlobal = finalizados > 0 ? Math.round((fechadosAceitos / finalizados) * 100) : 0;
    
    // Grouping by origin
    const originStats: Record<string, { count: number, won: number, lost: number, revenue: number }> = {
      'WhatsApp': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Instagram': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Indicação': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Google': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Site': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Outros': { count: 0, won: 0, lost: 0, revenue: 0 }
    };

    data.orcamentos.forEach((o: any) => {
      const orig = o.origem || 'Outros';
      const k = originStats[orig] ? orig : 'Outros';
      originStats[k].count++;
      if (o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO') {
        originStats[k].won++;
        originStats[k].revenue += (o.valorViagem || o.valor_viagem || o.valorProposta || o.valor_proposta || 0);
      } else if (o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA') {
        originStats[k].lost++;
      }
    });

    // Best performing channel by revenue or conversion
    let bestChannel = 'Nenhum';
    let maxRevenue = -1;
    Object.entries(originStats).forEach(([chan, stats]) => {
      if (stats.revenue > maxRevenue && stats.won > 0) {
        maxRevenue = stats.revenue;
        bestChannel = chan;
      }
    });

    // Build SVG bar chart data
    const maxCount = Math.max(...Object.values(originStats).map(s => s.count)) || 1;
    let barChartHtml = '';
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#6b7280'];
    Object.entries(originStats).forEach(([orig, stats], idx) => {
      if (stats.count === 0) return;
      const pct = Math.round((stats.count / maxCount) * 80) + 5;
      const sharePct = Math.round((stats.count / (orcados || 1)) * 100);
      const color = colors[idx % colors.length];
      barChartHtml += `
        <div class="space-y-1">
          <div class="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>${orig} (${stats.count} leads)</span>
            <span>${sharePct}% do share</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-5 rounded-lg overflow-hidden flex">
            <div class="h-full rounded-lg transition-all duration-500" style="width: ${pct}%; background-color: ${color}"></div>
          </div>
        </div>
      `;
    });

    if (!barChartHtml) {
      barChartHtml = '<p class="text-xs text-slate-400 font-bold py-6 text-center">Nenhum lead catalogado no período.</p>';
    }

    const tableRows = Object.entries(originStats).map(([orig, stats]) => {
      const totalFin = stats.won + stats.lost;
      const conv = totalFin > 0 ? Math.round((stats.won / totalFin) * 100) : 0;
      const avgTicket = stats.won > 0 ? Math.round(stats.revenue / stats.won) : 0;
      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${orig}</td>
          <td class="p-3 text-center">${stats.count}</td>
          <td class="p-3 text-center">${stats.won}</td>
          <td class="p-3 font-extrabold text-center text-emerald-600">${conv}%</td>
          <td class="p-3 font-extrabold text-slate-700 dark:text-slate-200">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.revenue)}</td>
          <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(avgTicket)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>📢 Origem de Leads e Eficiência de Funil</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Leads</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${orcados}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Conversão Média</p>
            <p class="text-lg font-black text-indigo-650 dark:text-indigo-400 mt-1">${conversaoGlobal}%</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Canal Campeão (Faturamento)</p>
            <p class="text-lg font-black text-emerald-600 mt-1 truncate">${bestChannel}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Faturamento Leads (Won)</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Object.values(originStats).reduce((s, o) => s + o.revenue, 0))}</p>
          </div>
        </div>

        <!-- SVG Bar Chart -->
        <div class="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl gap-4 flex flex-col">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Volume de Leads por Canal de Entrada</h3>
          <div class="space-y-4">
            ${barChartHtml}
          </div>
        </div>

        <!-- Table detailing data -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Performance por Origem de Leads</h3>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Origem</th>
                  <th class="p-3 text-center">Total Leads</th>
                  <th class="p-3 text-center">Ganhos</th>
                  <th class="p-3 text-center">Conversão</th>
                  <th class="p-3">Faturamento Realizado</th>
                  <th class="p-3">Tíquete Médio</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 8. AUDITORIA OPERACIONAL E RECEBIMENTOS
  // ==========================================
  private renderAuditoria(data: any): string {
    const viagensAtivas = data.viagens.filter((v: any) => v.status !== 'cancelada');
    
    // Subtrair pagamentos de desconto/prejuízo do faturamento comercial bruto
    const activeViaIds = new Set(viagensAtivas.map((v: any) => v.id));
    const pagsSub = data.locPagamentos.filter((p: any) => 
      activeViaIds.has(p.viagem_id || p.viagemId) &&
      p.formas_recebimento &&
      ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
    );
    const totalSub = pagsSub.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0);
    const faturamentoTotal = Math.max(0, viagensAtivas.reduce((sum: number, v: any) => sum + (v.valor_total || v.valorTotal || 0), 0) - totalSub);

    // Sum all payments in the period matching active viagens
    let totalPago = 0;
    const paymentsGrouped: Record<string, { valor: number, icone: string }> = {};

    data.locPagamentos.forEach((p: any) => {
      const v = viagensAtivas.find((item: any) => item.id === p.viagem_id || item.id === p.viagemId);
      if (v) {
        const val = Number(p.valor) || 0;
        const formaNome = p.formas_recebimento?.nome || 'Outros';
        const formaIcone = p.formas_recebimento?.icone || '💰';
        
        const isSubtractive = ['DESCONTO', 'PREJUÍZO'].includes(formaNome.trim().toUpperCase());
        
        if (isSubtractive) {
          totalPago -= val;
        } else {
          totalPago += val;
        }
        
        if (!paymentsGrouped[formaNome]) {
          paymentsGrouped[formaNome] = { valor: 0, icone: formaIcone };
        }
        
        if (isSubtractive) {
          paymentsGrouped[formaNome].valor -= val;
        } else {
          paymentsGrouped[formaNome].valor += val;
        }
      }
    });

    const saldoPendente = Math.max(0, faturamentoTotal - totalPago);
    const quitacaoPct = faturamentoTotal > 0 ? Math.round((totalPago / faturamentoTotal) * 100) : 100;

    // Payments breakdown horizontal bars
    let paymentBreakdownHtml = '';
    const paymentEntries = Object.entries(paymentsGrouped);
    const maxPayment = paymentEntries.length > 0 ? Math.max(...paymentEntries.map(e => Math.abs(e[1].valor))) : 1;
    paymentEntries.forEach(([nome, info]) => {
      const pct = Math.round((info.valor / (totalPago || 1)) * 100);
      const widthPct = Math.round((Math.abs(info.valor) / maxPayment) * 80) + 5;
      
      let barColorClass = 'bg-indigo-500';
      if (['DESCONTO', 'PREJUÍZO'].includes(nome.trim().toUpperCase())) {
        barColorClass = nome.trim().toUpperCase() === 'DESCONTO' ? 'bg-amber-500' : 'bg-rose-500';
      }

      paymentBreakdownHtml += `
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span class="flex items-center gap-1.5"><span>${info.icone}</span> <span>${nome}</span></span>
            <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(info.valor)} (${pct}%)</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-lg overflow-hidden flex">
            <div class="${barColorClass} h-full rounded-lg transition-all duration-500" style="width: ${widthPct}%"></div>
          </div>
        </div>
      `;
    });

    if (!paymentBreakdownHtml) {
      paymentBreakdownHtml = '<p class="text-xs text-slate-400 font-bold py-6 text-center">Nenhum pagamento registrado no período.</p>';
    }

    // Warnings list
    const pendencias: { cliente: string, destino: string, motivo: string, gravidade: 'alta' | 'media' }[] = [];

    viagensAtivas.forEach((v: any) => {
      const clienteNome = v.cliente?.nome || 'Cliente não informado';
      const destino = v.destino || 'Destino não informado';
      
      // 1. Check if paid value matches total value
      const vPayments = data.locPagamentos.filter((p: any) => p.viagem_id === v.id || p.viagemId === v.id);
      const vPaidSum = vPayments.reduce((s: number, p: any) => s + (p.valor || 0), 0);
      const vTotal = v.valor_total || v.valorTotal || 0;
      if (vPaidSum < vTotal) {
        pendencias.push({
          cliente: clienteNome,
          destino: destino,
          motivo: `Recebimento Pendente: quitado R$ ${vPaidSum.toLocaleString('pt-BR')} de R$ ${vTotal.toLocaleString('pt-BR')} (Aberto: R$ ${(vTotal - vPaidSum).toLocaleString('pt-BR')})`,
          gravidade: 'alta'
        });
      }

      // 2. Check process clearance
      if (!v.processo_conferido) {
        pendencias.push({
          cliente: clienteNome,
          destino: destino,
          motivo: 'Conferência de Processo da viagem pendente (dados cadastrais travados)',
          gravidade: 'media'
        });
      }

      // 3. Check LOCs financial clearance
      if (v.produtos) {
        v.produtos.forEach((p: any) => {
          const loc = (p.codigoReserva || p.codigo_reserva || p.codigo_localizador || '').trim().toUpperCase();
          if (loc) {
            const conf = data.locConferencias.find((c: any) => (c.viagem_id === v.id || c.viagemId === v.id) && (c.codigo_localizador || '').trim().toUpperCase() === loc);
            if (!conf || !conf.conferido) {
              pendencias.push({
                cliente: clienteNome,
                destino: `${destino} (LOC ${loc})`,
                motivo: `Conferência Financeira pendente para localizador ${loc} (${p.fornecedor})`,
                gravidade: 'media'
              });
            }
          }
        });
      }
    });

    const tableRows = pendencias.map(p => {
      const badgeColor = p.gravidade === 'alta' 
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' 
        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30';
      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${p.cliente}</td>
          <td class="p-3">${p.destino}</td>
          <td class="p-3 font-semibold ${p.gravidade === 'alta' ? 'text-rose-500 font-bold' : ''}">${p.motivo}</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${badgeColor}">
              ${p.gravidade === 'alta' ? 'Crítica' : 'Atenção'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🪙 Auditoria Operacional e Fluxo de Recebimento</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Faturamento Comercial</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(faturamentoTotal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Recebido</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPago)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Saldo Pendente</p>
            <p class="text-lg font-black text-rose-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(saldoPendente)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxa de Quitação</p>
            <p class="text-lg font-black text-indigo-650 mt-1">${quitacaoPct}%</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Payment breakdown -->
          <div class="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl gap-4 flex flex-col">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Entradas por Meio de Pagamento</h3>
            <div class="space-y-4">
              ${paymentBreakdownHtml}
            </div>
          </div>

          <!-- Audit coverage stats -->
          <div class="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Gargalos de Auditoria Gerencial</h3>
              <ul class="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <li class="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                  <span>Conferência de Processo Pendente</span>
                  <span class="text-rose-500 font-extrabold">${viagensAtivas.filter((v: any) => !v.processo_conferido).length} viagens</span>
                </li>
                <li class="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                  <span>Conferência Financeira Pendente</span>
                  <span class="text-rose-500 font-extrabold">
                    ${viagensAtivas.reduce((acc: number, v: any) => {
                      let pnd = 0;
                      if (v.produtos) {
                        v.produtos.forEach((p: any) => {
                          const loc = (p.codigoReserva || p.codigo_reserva || '').trim().toUpperCase();
                          if (loc) {
                            const conf = data.locConferencias.find((c: any) => (c.viagem_id === v.id || c.viagemId === v.id) && (c.codigo_localizador || '').trim().toUpperCase() === loc);
                            if (!conf || !conf.conferido) pnd++;
                          }
                        });
                      }
                      return acc + pnd;
                    }, 0)} localizadores
                  </span>
                </li>
                <li class="flex justify-between py-1.5">
                  <span>Viagens com Saldo em Aberto</span>
                  <span class="text-rose-500 font-extrabold">
                    ${viagensAtivas.filter((v: any) => {
                      const vPayments = data.locPagamentos.filter((p: any) => p.viagem_id === v.id || p.viagemId === v.id);
                      const vPaidSum = vPayments.reduce((s: number, p: any) => s + (p.valor || 0), 0);
                      return vPaidSum < (v.valor_total || v.valorTotal || 0);
                    }).length} viagens
                  </span>
                </li>
              </ul>
            </div>
            <div class="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 text-[10px] text-indigo-750 dark:text-indigo-400 font-semibold rounded-xl">
              ⚠️ <strong>Regra de Negócio:</strong> Viagens marcadas como "Fechadas" exigem saldo zerado e bloqueiam edições cadastrais. Certifique-se de quitar o saldo e conferir localizadores antes do embarque.
            </div>
          </div>
        </div>

        <!-- Table detailing warnings -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Fila de Pendências de Conciliação e Auditoria</h3>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Destino</th>
                  <th class="p-3">Pendência Identificada</th>
                  <th class="p-3 text-center">Criticidade</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows || `
                  <tr>
                    <td colspan="4" class="p-6 text-center text-slate-400 font-extrabold">🎉 Excelente! Nenhuma pendência financeira ou de auditoria ativa.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 9. JORNADA DE POS-VENDA E SLAS
  // ==========================================
  private renderPosVenda(data: any): string {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limitePre = new Date();
    limitePre.setDate(hoje.getDate() + 15);
    limitePre.setHours(23, 59, 59, 999);

    const limitePos = new Date();
    limitePos.setDate(hoje.getDate() - 15);
    limitePos.setHours(0, 0, 0, 0);

    const preEmbarqueViagens: any[] = [];
    const emViagemViagens: any[] = [];
    const posViagemViagens: any[] = [];

    // Document and post-sale alerts lists
    const docAlerts: { cliente: string, destino: string, dataIda: string, motivo: string }[] = [];
    const posVendaPendente: { cliente: string, destino: string, dataVolta: string, consultor: string }[] = [];

    data.viagens.forEach((v: any) => {
      if (v.status === 'cancelada') return;
      const dataIdaStr = v.data_ida || v.dataIda;
      const dataVoltaStr = v.data_volta || v.dataVolta;
      if (!dataIdaStr) return;

      const dIda = new Date(dataIdaStr + 'T00:00:00');
      const dVolta = dataVoltaStr ? new Date(dataVoltaStr + 'T23:59:59') : null;

      // Grouping by lifecycle
      if (dIda >= hoje && dIda <= limitePre) {
        preEmbarqueViagens.push(v);
      } else if (dIda < hoje && dVolta && dVolta >= hoje) {
        emViagemViagens.push(v);
      } else if (dVolta && dVolta < hoje && dVolta >= limitePos) {
        posViagemViagens.push(v);
      }

      // Check passport validation for voyages in next 90 days (pre-embarque safety checks)
      const passValidadeStr = v.cliente?.passaporteValidade || v.cliente?.passaporte_validade;
      const dataIdaParaDoc = new Date(dataIdaStr + 'T00:00:00');
      if (dataIdaParaDoc >= hoje && (dataIdaParaDoc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24) <= 90) {
        if (passValidadeStr) {
          const passVal = new Date(passValidadeStr + 'T00:00:00');
          // Passport needs to be valid for at least 180 days from dataIda
          const limitValid = new Date(dataIdaParaDoc);
          limitValid.setDate(limitValid.getDate() + 180);
          
          if (passVal < limitValid) {
            const diffDays = Math.round((passVal.getTime() - dataIdaParaDoc.getTime()) / (1000 * 60 * 60 * 24));
            docAlerts.push({
              cliente: v.cliente?.nome || 'Cliente não informado',
              destino: v.destino,
              dataIda: dataIdaStr,
              motivo: `Passaporte expira em ${passValidadeStr.split('-').reverse().join('/')} (apenas ${diffDays} dias após embarque, exige-se 180 dias)`
            });
          }
        } else {
          // If destination is international (not Brazil), we require passport!
          const pais = (v.destino_ref?.pais || '').trim().toLowerCase();
          const isInternacional = pais && pais !== 'brasil' && pais !== 'brazil';
          if (isInternacional) {
            docAlerts.push({
              cliente: v.cliente?.nome || 'Cliente não informado',
              destino: v.destino,
              dataIda: dataIdaStr,
              motivo: 'Viagem internacional pendente de passaporte cadastrado!'
            });
          }
        }
      }

      // Check post-sales contact status for returned travels
      if (dVolta && dVolta < hoje && dVolta >= limitePos && v.status === 'pos_viagem') {
        const cNome = this.consultores.find(c => c.id === (v.consultor_id || v.consultorId))?.nome || 'Não designado';
        posVendaPendente.push({
          cliente: v.cliente?.nome || 'Cliente não informado',
          destino: v.destino,
          dataVolta: dataVoltaStr,
          consultor: cNome
        });
      }
    });

    const docAlertsHtml = docAlerts.map(a => `
      <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${a.cliente}</td>
        <td class="p-3">${a.destino}</td>
        <td class="p-3">${a.dataIda.split('-').reverse().join('/')}</td>
        <td class="p-3 font-bold text-rose-500">${a.motivo}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/30">
            Alerta Crítico
          </span>
        </td>
      </tr>
    `).join('');

    const posVendaHtml = posVendaPendente.map(p => `
      <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${p.cliente}</td>
        <td class="p-3">${p.destino}</td>
        <td class="p-3">${p.dataVolta.split('-').reverse().join('/')}</td>
        <td class="p-3 font-semibold">${p.consultor}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600 dark:bg-amber-950/30">
            Pós-Venda Pendente
          </span>
        </td>
      </tr>
    `).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>✈️ Controle de SLAs e Jornada de Pós-Venda</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center border-l-4 border-l-amber-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pré-Embarque (Próximos 15 dias)</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${preEmbarqueViagens.length} passageiros</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center border-l-4 border-l-indigo-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Em Viagem (Acompanhamento Ativo)</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${emViagemViagens.length} passageiros</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center border-l-4 border-l-emerald-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Retornados (Últimos 15 dias)</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${posViagemViagens.length} passageiros</p>
          </div>
        </div>

        <!-- Section: Document Validation Alerts -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Validação de Documentos de Embarque Iminente (90 dias)</h3>
            <span class="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-lg text-[10px] font-black">${docAlerts.length} inconsistências</span>
          </div>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Destino</th>
                  <th class="p-3">Data Ida</th>
                  <th class="p-3">Problema de SLA Documental</th>
                  <th class="p-3 text-center">Risco</th>
                </tr>
              </thead>
              <tbody>
                ${docAlertsHtml || `
                  <tr>
                    <td colspan="5" class="p-6 text-center text-slate-400 font-extrabold">🎉 Nenhum problema de SLA documental detectado para os próximos embarques.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section: Post-sales SLA Alerts -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Fila de Contatos de Pós-Venda Pendentes (Retornos Recentes)</h3>
            <span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 rounded-lg text-[10px] font-black">${posVendaPendente.length} pendentes</span>
          </div>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Destino</th>
                  <th class="p-3">Data Retorno</th>
                  <th class="p-3">Consultor Responsável</th>
                  <th class="p-3 text-center">Status SLA</th>
                </tr>
              </thead>
              <tbody>
                ${posVendaHtml || `
                  <tr>
                    <td colspan="5" class="p-6 text-center text-slate-400 font-extrabold">🎉 Todos os clientes retornados no período já receberam atendimento de pós-venda.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private renderEmbarques(data: any): string {
    const start = this.dataInicio;
    const end = this.dataFim;
    const filterConsultorId = this.consultorIdFilter;

    const list: any[] = [];

    const formatarDataBr = (dStr: string): string => {
      if (!dStr) return '';
      const parts = dStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dStr;
    };

    this.viagens.forEach((v: any) => {
      if (filterConsultorId !== 'todos' && String(v.consultor_id) !== String(filterConsultorId)) {
        return;
      }

      const clientName = v.cliente?.nome || 'Passageiro';
      const consultorName = this.consultores.find(c => c.id === v.consultor_id)?.nome || 'Consultor';

      // 1. Ida da Viagem Principal
      if (v.data_ida && v.data_ida >= start && v.data_ida <= end) {
        const hasAlert = this.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === v.data_ida);
        list.push({
          data: v.data_ida,
          cliente: clientName,
          destino: v.destino,
          tipo: '✈️ Ida da Viagem',
          loc: v.codigo_localizador || 'S/ LOC',
          consultor: consultorName,
          hasAlert,
          tripId: v.id,
          productId: '',
          tipoEmbarque: 'viagem-ida'
        });
      }

      // 2. Volta da Viagem Principal
      if (v.data_volta && v.data_volta >= start && v.data_volta <= end) {
        const hasAlert = this.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === v.data_volta);
        list.push({
          data: v.data_volta,
          cliente: clientName,
          destino: v.destino,
          tipo: '✈️ Volta da Viagem',
          loc: v.codigo_localizador || 'S/ LOC',
          consultor: consultorName,
          hasAlert,
          tripId: v.id,
          productId: '',
          tipoEmbarque: 'viagem-volta'
        });
      }

      // 3. Trechos Aéreos
      if (v.produtos && Array.isArray(v.produtos)) {
        v.produtos.forEach((p: any) => {
          const pTipoUpper = (p.tipo || '').trim().toUpperCase();
          if (pTipoUpper === 'AÉREO OPERADORA' || pTipoUpper === 'AÉREO FACIAL') {
            if (p.dados_adicionais && Array.isArray(p.dados_adicionais.trechos)) {
              p.dados_adicionais.trechos.forEach((t: any, idx: number) => {
                const labelBase = `${t.origem} ➔ ${t.destino}`;

                if (t.dataIda && t.dataIda >= start && t.dataIda <= end) {
                  const hasAlert = this.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === t.dataIda);
                  list.push({
                    data: t.dataIda,
                    cliente: clientName,
                    destino: labelBase,
                    tipo: `✈️ Voo (Ida) - ${p.fornecedor}`,
                    loc: p.codigo_reserva || 'S/ LOC',
                    consultor: consultorName,
                    hasAlert,
                    tripId: v.id,
                    productId: p.id,
                    tipoEmbarque: 'segmento-ida'
                  });
                }

                if (t.dataVolta && t.dataVolta >= start && t.dataVolta <= end) {
                  const hasAlert = this.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === t.dataVolta);
                  list.push({
                    data: t.dataVolta,
                    cliente: clientName,
                    destino: labelBase,
                    tipo: `✈️ Voo (Volta) - ${p.fornecedor}`,
                    loc: p.codigo_reserva || 'S/ LOC',
                    consultor: consultorName,
                    hasAlert,
                    tripId: v.id,
                    productId: p.id,
                    tipoEmbarque: 'segmento-volta'
                  });
                }
              });
            }
          }
        });
      }
    });

    list.sort((a, b) => a.data.localeCompare(b.data));

    const rowsHtml = list.map((item, idx) => {
      const alertBadge = item.hasAlert 
        ? `<div class="flex items-center justify-center gap-1.5">
             <span class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-md">SIM</span>
             <button class="btn-alerta-viagem text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-350 underline focus:outline-none" data-trip-id="${item.tripId}" data-product-id="${item.productId}" data-type="${item.tipoEmbarque}">Ver</button>
           </div>`
        : `<div class="flex items-center justify-center gap-1.5">
             <span class="px-2 py-0.5 bg-slate-150 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-md">NÃO</span>
             <button class="btn-alerta-viagem text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-350 underline focus:outline-none" data-trip-id="${item.tripId}" data-product-id="${item.productId}" data-type="${item.tipoEmbarque}">Criar</button>
           </div>`;

      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-300 transition-colors">
          <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${formatarDataBr(item.data)}</td>
          <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${item.cliente}</td>
          <td class="p-3">${item.tipo}</td>
          <td class="p-3 font-bold text-indigo-600 dark:text-indigo-400">${item.destino}</td>
          <td class="p-3 font-mono font-bold text-[10px] tracking-wider uppercase">${item.loc}</td>
          <td class="p-3 font-semibold">${item.consultor}</td>
          <td class="p-3 text-center">${alertBadge}</td>
          <td class="p-3 text-center">
            <button class="btn-detalhes-viagem px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg transition uppercase tracking-wider flex items-center gap-1 mx-auto" data-trip-id="${item.tripId}">
              🔍 Detalhes
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>✈️ Relatório de Embarque e Trechos de Voo</span>
          </h2>
          <span class="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider">${list.length} embarques localizados</span>
        </div>

        <!-- Embarques Table -->
        <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
          <table class="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                <th class="p-3">Data</th>
                <th class="p-3">Passageiro</th>
                <th class="p-3">Tipo</th>
                <th class="p-3">Destino/Trecho</th>
                <th class="p-3">Código (LOC)</th>
                <th class="p-3">Consultor</th>
                <th class="p-3 text-center">Alerta</th>
                <th class="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400 font-extrabold italic">🎉 Nenhum embarque ou trecho de voo programado para o período selecionado.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 10. RELATÓRIO DE GAMIFICAÇÃO
  // ==========================================
  private renderGamificacao(data: any): string {
    const totalConsultores = this.consultores.length || 1;
    
    // Process each consultant's progress and badges
    const ranking = this.consultores.map((c: any) => {
      const xp = c.xp || 0;
      const prog = obterProgressoNivel(xp);
      const cBadges = (data.consultoresBadges || []).filter((b: any) => (b.profile_id || b.profileId) === c.id).map((b: any) => b.badge_key);
      return {
        ...c,
        xp,
        nivel: prog.nivel,
        prog,
        badges: cBadges,
        badgesCount: cBadges.length
      };
    });

    // Sort: Level desc, then XP desc
    ranking.sort((a, b) => {
      if (b.nivel !== a.nivel) return b.nivel - a.nivel;
      return b.prog.xpAtual - a.prog.xpAtual;
    });

    // Compute metrics
    const mediaXp = Math.round(ranking.reduce((sum, c) => sum + c.xp, 0) / ranking.length);
    
    let topDecoratedName = 'Nenhum';
    let maxBadges = -1;
    ranking.forEach(c => {
      if (c.badgesCount > maxBadges) {
        maxBadges = c.badgesCount;
        topDecoratedName = c.nome;
      }
    });

    // Count achievements per badge definition
    const badgeUnlocks: Record<string, string[]> = {};
    BADGE_DEFINITIONS.forEach(b => {
      badgeUnlocks[b.key] = [];
    });

    ranking.forEach(c => {
      c.badges.forEach((bKey: string) => {
        if (badgeUnlocks[bKey]) {
          badgeUnlocks[bKey].push(c.nome);
        }
      });
    });

    // Find rarest badge (unlocked by > 0 people, but with lowest count)
    let rarestBadgeName = 'Nenhuma';
    let rarestBadgeEmoji = '🏆';
    let minUnlocks = Infinity;
    
    Object.entries(badgeUnlocks).forEach(([key, list]) => {
      const count = list.length;
      if (count > 0 && count < minUnlocks) {
        minUnlocks = count;
        const def = BADGE_DEFINITIONS.find(b => b.key === key);
        if (def) {
          rarestBadgeName = def.nome;
          rarestBadgeEmoji = def.emoji;
        }
      }
    });

    if (minUnlocks === Infinity) {
      rarestBadgeName = 'Nenhuma conquista';
      rarestBadgeEmoji = '🔒';
    }

    // Leaderboard Rows
    const leaderboardRows = ranking.map((c, index) => {
      const pct = Math.round(c.prog.percent);
      const isTop = index === 0;
      const rankBadge = isTop ? '👑' : `#${index + 1}`;
      const rankColor = isTop ? 'text-amber-500 font-black' : 'text-slate-400';
      const formattedXp = c.xp.toLocaleString('pt-BR');
      
      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <td class="p-3 text-center ${rankColor}">${rankBadge}</td>
          <td class="p-3 flex items-center gap-3">
            <span class="text-xl">${c.prog.patenteEmoji}</span>
            <div>
              <p class="font-extrabold text-slate-800 dark:text-slate-100">${c.nome}</p>
              <p class="text-[10px] text-slate-400 dark:text-slate-400 font-semibold">${c.email}</p>
            </div>
          </td>
          <td class="p-3 text-center font-extrabold text-indigo-600 dark:text-indigo-400">Nível ${c.nivel}</td>
          <td class="p-3 font-semibold text-slate-600 dark:text-slate-400">${c.prog.patente}</td>
          <td class="p-3 font-bold">${formattedXp} XP</td>
          <td class="p-3 w-1/4">
            <div class="space-y-1">
              <div class="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>${c.prog.xpAtual} / ${c.prog.xpProximoNivel} XP</span>
                <span>${pct}%</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-indigo-600 h-full rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>
          </td>
          <td class="p-3 text-center font-black text-emerald-600">${c.badgesCount} conquistas</td>
        </tr>
      `;
    }).join('');

    // Badge Analytics Rows
    const badgeRows = BADGE_DEFINITIONS.map(b => {
      const list = badgeUnlocks[b.key] || [];
      const count = list.length;
      const rate = Math.round((count / totalConsultores) * 100);
      const unlockedByText = count > 0 
        ? list.map(name => `<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded-lg font-bold">${name}</span>`).join(' ')
        : `<span class="text-slate-400 dark:text-slate-400 italic text-[11px]">Ninguém conquistou ainda</span>`;
        
      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <td class="p-3 text-2xl text-center">${b.emoji}</td>
          <td class="p-3">
            <p class="font-extrabold text-slate-800 dark:text-slate-100">${b.nome}</p>
            <p class="text-[10px] text-slate-400 dark:text-slate-400 font-semibold">${b.descricao}</p>
          </td>
          <td class="p-3 font-bold text-slate-600 dark:text-slate-400">${b.categoria}</td>
          <td class="p-3 text-center font-extrabold text-indigo-650">${rate}% (${count} de ${totalConsultores})</td>
          <td class="p-3">${unlockedByText}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🏆 Auditoria de Gamificação e Desempenho da Equipe</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Média de XP da Equipe</p>
            <p class="text-lg font-black text-indigo-650 dark:text-indigo-400 mt-1">${mediaXp.toLocaleString('pt-BR')} XP</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mais Condecorado(a)</p>
            <p class="text-lg font-black text-emerald-650 mt-1 truncate">${topDecoratedName} (${maxBadges} medalhas)</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Medalha Mais Rara Ativa</p>
            <p class="text-lg font-black text-amber-600 mt-1 truncate flex items-center justify-center gap-1">
              <span>${rarestBadgeEmoji}</span> <span>${rarestBadgeName}</span>
            </p>
          </div>
        </div>

        <!-- Section: Leaderboard -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Ranking Geral de Engajamento</h3>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3 text-center w-12">Posição</th>
                  <th class="p-3">Consultor</th>
                  <th class="p-3 text-center">Nível</th>
                  <th class="p-3">Patente</th>
                  <th class="p-3">XP Total</th>
                  <th class="p-3">Progresso do Nível</th>
                  <th class="p-3 text-center">Conquistas</th>
                </tr>
              </thead>
              <tbody>
                ${leaderboardRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section: Badge Analytics -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Distribuição e Adoção de Medalhas (Badge Analytics)</h3>
          <div class="overflow-x-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3 text-center w-12">Medalha</th>
                  <th class="p-3">Nome / Detalhe</th>
                  <th class="p-3">Categoria</th>
                  <th class="p-3 text-center">Taxa de Adoção</th>
                  <th class="p-3">Consultores Condecorados</th>
                </tr>
              </thead>
              <tbody>
                ${badgeRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // EVENT LISTENERS & EXPORTS
  // ==========================================
  private setupEventListeners(): void {
    // 1. Collapsible category headers
    const groupHeaders = this.container.querySelectorAll('.report-group-header');
    groupHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = header.getAttribute('data-group');
        if (group && group in this.collapsedGroups) {
          this.collapsedGroups[group] = !this.collapsedGroups[group];
          this.render();
          this.setupEventListeners();
        }
      });
    });

    // 2. Tab switches
    const tabButtons = this.container.querySelectorAll('.report-tabs-bar button[data-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as any;
        if (tab) {
          this.activeTab = tab;
          this.render();
          this.setupEventListeners();
        }
      });
    });

    // 3. Apply filters button
    document.getElementById('btn-aplicar-filtros')?.addEventListener('click', () => {
      const inputInicioEl = document.getElementById('filter-data-inicio') as HTMLInputElement;
      const inputFimEl = document.getElementById('filter-data-fim') as HTMLInputElement;
      const selectConsultorVal = (document.getElementById('filter-consultores') as HTMLInputElement)?.value;
      
      const errorInicioEl = document.getElementById('filter-data-inicio-error');
      const errorFimEl = document.getElementById('filter-data-fim-error');
      
      let hasError = false;
      
      const valInicio = inputInicioEl?.value || '';
      if (!valInicio) {
        if (errorInicioEl) {
          errorInicioEl.textContent = 'Selecione a data de início';
          errorInicioEl.classList.remove('hidden');
        }
        inputInicioEl?.classList.add('border-rose-500', 'focus:ring-rose-500');
        hasError = true;
      } else {
        if (errorInicioEl) {
          errorInicioEl.classList.add('hidden');
        }
        inputInicioEl?.classList.remove('border-rose-500', 'focus:ring-rose-500');
      }
      
      const valFim = inputFimEl?.value || '';
      if (!valFim) {
        if (errorFimEl) {
          errorFimEl.textContent = 'Selecione a data de fim';
          errorFimEl.classList.remove('hidden');
        }
        inputFimEl?.classList.add('border-rose-500', 'focus:ring-rose-500');
        hasError = true;
      } else {
        if (errorFimEl) {
          errorFimEl.classList.add('hidden');
        }
        inputFimEl?.classList.remove('border-rose-500', 'focus:ring-rose-500');
      }
      
      if (hasError) return;
      
      this.dataInicio = valInicio;
      this.dataFim = valFim;
      if (selectConsultorVal) this.consultorIdFilter = selectConsultorVal;
      
      this.render();
      this.setupEventListeners();
    });

    // 3. Clear filters
    document.getElementById('btn-limpar-filtros')?.addEventListener('click', () => {
      const hoje = new Date();
      const inicio = new Date();
      inicio.setDate(hoje.getDate() - 180);
      
      this.dataInicio = inicio.toISOString().substring(0, 10);
      this.dataFim = hoje.toISOString().substring(0, 10);
      this.consultorIdFilter = (this.perfil && this.perfil.role !== 'admin') ? this.perfil.id : 'todos';
      
      this.render();
      this.setupEventListeners();
    });

    // 4. Export CSV button
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      this.exportToCSV();
    });

    // 5. Print PDF button
    document.getElementById('btn-print-pdf')?.addEventListener('click', () => {
      window.print();
    });

    // 6. Listeners para os botões do Relatório de Embarque
    if (this.activeTab === 'embarques') {
      // Detalhes da Viagem
      document.querySelectorAll('.btn-detalhes-viagem').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const tripId = btn.getAttribute('data-trip-id');
          if (tripId) {
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
              showToast: (msg, type) => this.showToast(msg, type),
              checkSLA: (v) => ({ alert: false, type: null, text: '' })
            });
            await modal.open(tripId, 'detalhes');
          }
        });
      });

      // Lembrete/Alerta da Viagem ou Produto
      document.querySelectorAll('.btn-alerta-viagem').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const tripId = btn.getAttribute('data-trip-id');
          const productId = btn.getAttribute('data-product-id');
          const type = btn.getAttribute('data-type');
          if (tripId) {
            if (productId) {
              const viagem = this.viagens.find(v => v.id === tripId);
              const product = viagem?.produtos?.find((p: any) => p.id === productId);
              if (product) {
                const prodName = `${product.fornecedor || 'Aéreo'} - ${product.descricao || 'Voo'}`;
                CommentsService.openCommentsModal(
                  'produto',
                  productId,
                  tripId,
                  '📦 Notas do Produto',
                  prodName,
                  this.user.id,
                  this.consultores,
                  async () => {
                    await this.loadData();
                    this.render();
                    this.setupEventListeners();
                  }
                );
              } else {
                this.showToast('Erro ao carregar dados do produto para anotações.', 'error');
              }
            } else {
              const viagem = this.viagens.find(v => v.id === tripId);
              if (viagem) {
                const tripLabel = `${viagem.cliente?.nome || 'Passageiro'} - ${viagem.destino}`;
                CommentsService.openCommentsModal(
                  'viagem',
                  tripId,
                  tripId,
                  '✈️ Notas da Viagem',
                  tripLabel,
                  this.user.id,
                  this.consultores,
                  async () => {
                    await this.loadData();
                    this.render();
                    this.setupEventListeners();
                  }
                );
              } else {
                this.showToast('Erro ao carregar dados da viagem para anotações.', 'error');
              }
            }
          }
        });
      });
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
      toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
    }`;
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} <span>${finalMessage}</span>`;

    setTimeout(() => {
      toast!.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
    }, 4500);
  }

  /**
   * Generates a clean Excel-compatible CSV file containing viewed report rows
   */
  private exportToCSV(): void {
    const data = this.getFilteredData();
    let csvContent = '\uFEFF'; // UTF-8 BOM to display accented chars in Excel correctly
    let filename = `relatorio-${this.activeTab}-${new Date().toISOString().slice(0,10)}.csv`;

    if (this.activeTab === 'desempenho') {
      csvContent += 'Consultor;Orcamentos Criados;Fechados Aceitos;Taxa Conversao;Total Vendido (R$)\n';
      const filteredConsultores = this.consultores.filter(c => this.consultorIdFilter === 'todos' || c.id === this.consultorIdFilter);
      filteredConsultores.forEach(c => {
        const subOrc = data.orcamentos.filter((o: any) => (o.consultor_id || o.consultorId) === c.id);
        const subVia = data.viagens.filter((v: any) => (v.consultor_id || v.consultorId) === c.id);
        const cAceito = subOrc.filter((o: any) => o.sub_status === 'ACEITO' || o.subStatus === 'ACEITO').length;
        const cRecuso = subOrc.filter((o: any) => o.sub_status === 'DESISTENCIA' || o.subStatus === 'DESISTENCIA').length;
        const cConv = (cAceito + cRecuso) > 0 ? Math.round((cAceito / (cAceito + cRecuso)) * 100) : 0;
        const cSales = subVia.reduce((sum: number, v: any) => {
          const vPayments = data.locPagamentos.filter((p: any) => 
            (p.viagem_id === v.id || p.viagemId === v.id) &&
            p.formas_recebimento &&
            ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
          );
          const vSub = vPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
          return sum + Math.max(0, (v.valor_total || v.valorTotal || 0) - vSub);
        }, 0);
        
        csvContent += `"${c.nome}";${subOrc.length};${cAceito};"${cConv}%";${cSales}\n`;
      });
    } else if (this.activeTab === 'prazos') {
      csvContent += 'Alerta;Consultor;Data Evento;Status\n';
      data.alertas.forEach((a: any) => {
        csvContent += `"${a.title}";"${a.consultorNome}";"${a.dateStr}";"${a.arquivado ? 'Arquivado' : 'Ativo'}"\n`;
      });
    } else if (this.activeTab === 'faturamento') {
      csvContent += 'Faturamento Bruto;Comissao Consolidada;Markup Coletado;Lucro Liquido\n';
      
      let faturamentoBruto = 0, comissaoTotal = 0, markupTotal = 0, ravTotal = 0;
      let totalSub = 0;
      data.viagens.forEach((v: any) => {
        faturamentoBruto += (v.valor_total || v.valorTotal || 0);
        
        const vPayments = data.locPagamentos.filter((p: any) => 
          (p.viagem_id === v.id || p.viagemId === v.id) &&
          p.formas_recebimento &&
          ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
        );
        totalSub += vPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);

        if (v.produtos) {
          v.produtos.forEach((p: any) => {
            if (p.status !== 'cancelado') {
              comissaoTotal += (p.comissao || 0);
              markupTotal += (p.markup || 0);
              ravTotal += (p.rav || 0);
            }
          });
        }
      });
      const netFaturamento = Math.max(0, faturamentoBruto - totalSub);
      const netLucro = Math.max(0, (comissaoTotal + markupTotal + ravTotal) - totalSub);
      csvContent += `${netFaturamento};${comissaoTotal};${markupTotal};${netLucro}\n`;
    } else if (this.activeTab === 'perdas') {
      csvContent += 'Cliente;Destino;Valor Cotacao;Motivo Desistencia\n';
      const perdidos = data.orcamentos.filter((o: any) => o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA');
      perdidos.forEach((o: any) => {
        const tagMotivo = o.tags?.find((t: string) => t.startsWith('Desistência:'));
        const reason = tagMotivo ? tagMotivo.replace('Desistência: ', '').replace('Desistência:', '').trim() : 'Não informado';
        csvContent += `"${o.nome_cliente || o.nomeCliente}";"${o.destino}";${o.valorProposta || o.valor_proposta || 0};"${reason}"\n`;
      });
    } else if (this.activeTab === 'previsoes') {
      csvContent += 'Fase;Valor Total;Probabilidade;Valor Ponderado\n';
      const matchConsultant = (id: string) => {
        if (this.consultorIdFilter === 'todos') return true;
        return id === this.consultorIdFilter;
      };
      const pipelineOrc = this.orcamentos.filter((o: any) => o.status !== 'CONCLUIDO' && matchConsultant(o.consultor_id || o.consultorId));
      
      let values = { solicitado: 0, em_andamento: 0, aguardando: 0 };
      pipelineOrc.forEach((o: any) => {
        const val = o.valorProposta || o.valor_proposta || 0;
        if (o.status === 'SOLICITADO') values.solicitado += val;
        else if (o.status === 'EM_ANDAMENTO') values.em_andamento += val;
        else if (o.status === 'AGUARDANDO') values.aguardando += val;
      });

      csvContent += `Solicitado;${values.solicitado};15%;${values.solicitado * 0.15}\n`;
      csvContent += `Em Andamento;${values.em_andamento};45%;${values.em_andamento * 0.45}\n`;
      csvContent += `Aguardando;${values.aguardando};75%;${values.aguardando * 0.75}\n`;
    } else if (this.activeTab === 'fornecedores') {
      csvContent += 'Fornecedor;Total Vendido (R$);Custo Total (R$);Lucro Liquido (R$);Margem Média (%);Reembolsos;Taxa Incidencia\n';
      const stats: Record<string, { sold: number, custo: number, lucro: number, refCount: number, salesCount: number }> = {};
      data.viagens.forEach((v: any) => {
        if (v.produtos) {
          v.produtos.forEach((p: any) => {
            const supplier = p.fornecedor || 'Desconhecido';
            if (!stats[supplier]) stats[supplier] = { sold: 0, custo: 0, lucro: 0, refCount: 0, salesCount: 0 };
            if (p.status !== 'cancelado') {
              stats[supplier].sold += (p.valorVenda || 0);
              stats[supplier].custo += (p.valorCusto || p.valor_custo || 0);
              stats[supplier].lucro += ((p.comissao || 0) + (p.markup || 0) + (p.rav || 0));
              stats[supplier].salesCount++;
            }
          });
        }
      });
      data.reembolsos.forEach((r: any) => {
        const supplier = r.produto?.fornecedor || 'Desconhecido';
        if (!stats[supplier]) stats[supplier] = { sold: 0, custo: 0, lucro: 0, refCount: 0, salesCount: 0 };
        stats[supplier].refCount++;
      });

      Object.entries(stats).forEach(([supp, item]) => {
        const rate = item.salesCount > 0 ? Math.round((item.refCount / item.salesCount) * 100) : 0;
        const margin = item.sold > 0 ? Math.round((item.lucro / item.sold) * 100) : 0;
        csvContent += `"${supp}";${item.sold};${item.custo};${item.lucro};"${margin}%";${item.refCount};"${rate}%"\n`;
      });
    } else if (this.activeTab === 'origens') {
      csvContent += 'Origem;Leads Criados;Leads Concluidos Ganhos;Taxa Conversao;Receita Realizada (R$);Tiquete Medio (R$)\n';
      const originStats: Record<string, { count: number, won: number, lost: number, revenue: number }> = {
        'WhatsApp': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Instagram': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Indicação': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Google': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Site': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Outros': { count: 0, won: 0, lost: 0, revenue: 0 }
      };
      data.orcamentos.forEach((o: any) => {
        const orig = o.origem || 'Outros';
        const k = originStats[orig] ? orig : 'Outros';
        originStats[k].count++;
        if (o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO') {
          originStats[k].won++;
          originStats[k].revenue += (o.valorViagem || o.valor_viagem || o.valorProposta || o.valor_proposta || 0);
        } else if (o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA') {
          originStats[k].lost++;
        }
      });
      Object.entries(originStats).forEach(([orig, stats]) => {
        const totalFin = stats.won + stats.lost;
        const conv = totalFin > 0 ? Math.round((stats.won / totalFin) * 100) : 0;
        const avgTicket = stats.won > 0 ? Math.round(stats.revenue / stats.won) : 0;
        csvContent += `"${orig}";${stats.count};${stats.won};"${conv}%";${stats.revenue};${avgTicket}\n`;
      });
    } else if (this.activeTab === 'auditoria') {
      csvContent += 'Métrica / Pendência;Cliente / Detalhe;Destino / Localizador;Valor / Detalhamento\n';
      
      const viagensAtivas = data.viagens.filter((v: any) => v.status !== 'cancelada');
      const activeViaIds = new Set(viagensAtivas.map((v: any) => v.id));
      const pagsSub = data.locPagamentos.filter((p: any) => 
        activeViaIds.has(p.viagem_id || p.viagemId) &&
        p.formas_recebimento &&
        ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
      );
      const totalSub = pagsSub.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0);
      const faturamentoTotal = Math.max(0, viagensAtivas.reduce((sum: number, v: any) => sum + (v.valor_total || v.valorTotal || 0), 0) - totalSub);

      let totalPago = 0;
      data.locPagamentos.forEach((p: any) => {
        const v = viagensAtivas.find((item: any) => item.id === p.viagem_id || item.id === p.viagemId);
        if (v) {
          const val = Number(p.valor) || 0;
          const formaNome = p.formas_recebimento?.nome || '';
          if (['DESCONTO', 'PREJUÍZO'].includes(formaNome.trim().toUpperCase())) {
            totalPago -= val;
          } else {
            totalPago += val;
          }
        }
      });

      csvContent += `"Faturamento Comercial";"Consolidado";"-";${faturamentoTotal}\n`;
      csvContent += `"Total Recebido";"Consolidado";"-";${totalPago}\n`;
      csvContent += `"Saldo Pendente";"Consolidado";"-";${Math.max(0, faturamentoTotal - totalPago)}\n`;

      // Export warnings
      viagensAtivas.forEach((v: any) => {
        const clienteNome = v.cliente?.nome || 'Cliente não informado';
        const destino = v.destino || 'Destino não informado';
        const vPayments = data.locPagamentos.filter((p: any) => p.viagem_id === v.id || p.viagemId === v.id);
        const vPaidSum = vPayments.reduce((s: number, p: any) => s + (p.valor || 0), 0);
        const vTotal = v.valor_total || v.valorTotal || 0;
        
        if (vPaidSum < vTotal) {
          csvContent += `"Pagamento Pendente";"${clienteNome}";"${destino}";"Pendente: R$ ${(vTotal - vPaidSum).toLocaleString('pt-BR')}"\n`;
        }
        if (!v.processo_conferido) {
          csvContent += `"Processo Pendente";"${clienteNome}";"${destino}";"Auditoria de Processo pendente"\n`;
        }
        if (v.produtos) {
          v.produtos.forEach((p: any) => {
            const loc = (p.codigoReserva || p.codigo_reserva || '').trim().toUpperCase();
            if (loc) {
              const conf = data.locConferencias.find((c: any) => (c.viagem_id === v.id || c.viagemId === v.id) && (c.codigo_localizador || '').trim().toUpperCase() === loc);
              if (!conf || !conf.conferido) {
                csvContent += `"Conferência Financeira Pendente";"${clienteNome}";"${destino} (LOC ${loc})";"${p.fornecedor} - Venda: R$ ${p.valorVenda.toLocaleString('pt-BR')}"\n`;
              }
            }
          });
        }
      });
    } else if (this.activeTab === 'posvenda') {
      csvContent += 'Categoria;Cliente;Destino;Data Evento;Detalhes\n';
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limitePre = new Date();
      limitePre.setDate(hoje.getDate() + 15);
      const limitePos = new Date();
      limitePos.setDate(hoje.getDate() - 15);

      data.viagens.forEach((v: any) => {
        if (v.status === 'cancelada') return;
        const dataIdaStr = v.data_ida || v.dataIda;
        const dataVoltaStr = v.data_volta || v.dataVolta;
        if (!dataIdaStr) return;

        const dIda = new Date(dataIdaStr + 'T00:00:00');
        const dVolta = dataVoltaStr ? new Date(dataVoltaStr + 'T23:59:59') : null;
        const clienteNome = v.cliente?.nome || 'Cliente não informado';

        if (dIda >= hoje && dIda <= limitePre) {
          csvContent += `"Pré-Embarque";"${clienteNome}";"${v.destino}";"${dataIdaStr}";"Embarque em breve"\n`;
        } else if (dIda < hoje && dVolta && dVolta >= hoje) {
          csvContent += `"Em Viagem";"${clienteNome}";"${v.destino}";"${dataIdaStr} a ${dataVoltaStr}";"Acompanhamento ativo"\n`;
        } else if (dVolta && dVolta < hoje && dVolta >= limitePos) {
          csvContent += `"Pós-Viagem";"${clienteNome}";"${v.destino}";"${dataVoltaStr}";"Retorno recente"\n`;
        }

        // Passport alerts
        const passValidadeStr = v.cliente?.passaporteValidade || v.cliente?.passaporte_validade;
        if (dIda >= hoje && (dIda.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24) <= 90) {
          if (passValidadeStr) {
            const passVal = new Date(passValidadeStr + 'T00:00:00');
            const limitValid = new Date(dIda);
            limitValid.setDate(limitValid.getDate() + 180);
            if (passVal < limitValid) {
              csvContent += `"Alerta Passaporte";"${clienteNome}";"${v.destino}";"${passValidadeStr}";"Expira em breve após embarque"\n`;
            }
          } else {
            const pais = (v.destino_ref?.pais || '').trim().toLowerCase();
            const isInternacional = pais && pais !== 'brasil' && pais !== 'brazil';
            if (isInternacional) {
              csvContent += `"Alerta Passaporte";"${clienteNome}";"${v.destino}";"-";"Viagem internacional sem passaporte cadastrado"\n`;
            }
          }
        }

        // Pending post-sale contact
        if (dVolta && dVolta < hoje && dVolta >= limitePos && v.status === 'pos_viagem') {
          csvContent += `"Pós-Venda Pendente";"${clienteNome}";"${v.destino}";"${dataVoltaStr}";"Retornou em pos_viagem"\n`;
        }
      });
    } else if (this.activeTab === 'embarques') {
      csvContent += 'Data de Embarque;Cliente/Passageiro;Destino/Trecho;Tipo;Código (LOC);Consultor;Tem Alerta\n';
      const start = this.dataInicio;
      const end = this.dataFim;
      
      const list: any[] = [];
      this.viagens.forEach((v: any) => {
        const clientName = v.cliente?.nome || 'Passageiro';
        const consultorName = this.consultores.find(c => c.id === v.consultor_id)?.nome || 'Consultor';

        if (v.data_ida && v.data_ida >= start && v.data_ida <= end) {
          const hasAlert = this.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === v.data_ida);
          list.push({
            data: v.data_ida,
            cliente: clientName,
            destino: v.destino,
            tipo: 'Viagem (Ida)',
            loc: v.codigo_localizador || 'S/ LOC',
            consultor: consultorName,
            hasAlert
          });
        }

        if (v.data_volta && v.data_volta >= start && v.data_volta <= end) {
          const hasAlert = this.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === v.data_volta);
          list.push({
            data: v.data_volta,
            cliente: clientName,
            destino: v.destino,
            tipo: 'Viagem (Volta)',
            loc: v.codigo_localizador || 'S/ LOC',
            consultor: consultorName,
            hasAlert
          });
        }

        if (v.produtos && Array.isArray(v.produtos)) {
          v.produtos.forEach((p: any) => {
            const pTipoUpper = (p.tipo || '').trim().toUpperCase();
            if (pTipoUpper === 'AÉREO OPERADORA' || pTipoUpper === 'AÉREO FACIAL') {
              if (p.dados_adicionais && Array.isArray(p.dados_adicionais.trechos)) {
                p.dados_adicionais.trechos.forEach((t: any, idx: number) => {
                  if (t.dataIda && t.dataIda >= start && t.dataIda <= end) {
                    const hasAlert = this.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === t.dataIda);
                    list.push({
                      data: t.dataIda,
                      cliente: clientName,
                      destino: `${t.origem} ➔ ${t.destino}`,
                      tipo: `Voo (Ida) - ${p.fornecedor}`,
                      loc: p.codigo_reserva || 'S/ LOC',
                      consultor: consultorName,
                      hasAlert
                    });
                  }
                  if (t.dataVolta && t.dataVolta >= start && t.dataVolta <= end) {
                    const hasAlert = this.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === t.dataVolta);
                    list.push({
                      data: t.dataVolta,
                      cliente: clientName,
                      destino: `${t.origem} ➔ ${t.destino}`,
                      tipo: `Voo (Volta) - ${p.fornecedor}`,
                      loc: p.codigo_reserva || 'S/ LOC',
                      consultor: consultorName,
                      hasAlert
                    });
                  }
                });
              }
            }
          });
        }
      });

      list.sort((a, b) => a.data.localeCompare(b.data));

      list.forEach((item: any) => {
        const dateFormatted = item.data.split('-').reverse().join('/');
        csvContent += `"${dateFormatted}";"${item.cliente}";"${item.destino}";"${item.tipo}";"${item.loc}";"${item.consultor}";"${item.hasAlert ? 'Sim' : 'Não'}"\n`;
      });
    } else if (this.activeTab === 'gamificacao') {
      csvContent += 'Posição;Consultor;Nível;Patente;XP Total;Conquistas\n';
      const ranking = this.consultores.map((c: any) => {
        const xp = c.xp || 0;
        const prog = obterProgressoNivel(xp);
        const cBadges = (data.consultoresBadges || []).filter((b: any) => (b.profile_id || b.profileId) === c.id).map((b: any) => b.badge_key);
        return {
          ...c,
          xp,
          nivel: prog.nivel,
          prog,
          badgesCount: cBadges.length
        };
      });
      ranking.sort((a, b) => {
        if (b.nivel !== a.nivel) return b.nivel - a.nivel;
        return b.prog.xpAtual - a.prog.xpAtual;
      });
      ranking.forEach((c, index) => {
        csvContent += `${index + 1};"${c.nome}";${c.nivel};"${c.prog.patente}";${c.xp};${c.badgesCount}\n`;
      });
    }

    // Trigger file download
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
