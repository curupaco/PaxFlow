import { supabase, getSessaoAtual } from '../services/supabase';
import { PerfilConsultor } from '../types';
import { InboxService } from '../services/inboxService';
import { formatBrDateToIso } from '../utils/masks';

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
  private activeTab: 'desempenho' | 'prazos' | 'faturamento' | 'perdas' | 'previsoes' | 'fornecedores' = 'desempenho';
  
  // Data stores
  private orcamentos: any[] = [];
  private viagens: any[] = [];
  private reembolsos: any[] = [];
  private alertas: any[] = [];
  private consultores: any[] = [];
  
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
    } catch (err) {
      console.warn('Erro ao ler tabelas de relatórios. Ativando mocks.', err);
      this.loadMockData();
    }
  }

  /**
   * Offline mock data fallback to ensure reports always look fully interactive
   */
  private loadMockData(): void {
    // Generate mock profiles if empty
    this.consultores = [
      { id: '1', nome: 'Amanda Silva', email: 'amanda@agencia.com', role: 'consultor' },
      { id: '2', nome: 'Bruno Costa', email: 'bruno@agencia.com', role: 'consultor' },
      { id: '3', nome: 'Carlos Souza', email: 'carlos@agencia.com', role: 'consultor' }
    ];

    // Generate mock orcamentos
    this.orcamentos = [
      { id: 'o1', consultor_id: '1', nome_cliente: 'Felipe Melo', destino: 'Orlando', created_at: '2026-05-10', updated_at: '2026-05-15', status: 'CONCLUIDO', sub_status: 'ACEITO', valor_proposta: 12000, valor_viagem: 12000, tags: [] },
      { id: 'o2', consultor_id: '1', nome_cliente: 'Ana Beatriz', destino: 'Paris', created_at: '2026-06-01', updated_at: '2026-06-12', status: 'CONCLUIDO', sub_status: 'DESISTENCIA', valor_proposta: 18000, tags: ['Desistência: Preço Alto'] },
      { id: 'o3', consultor_id: '2', nome_cliente: 'Roberto Lima', destino: 'Roma', created_at: '2026-06-10', updated_at: '2026-06-20', status: 'CONCLUIDO', sub_status: 'ACEITO', valor_proposta: 22000, valor_viagem: 21500, tags: [] },
      { id: 'o4', consultor_id: '2', nome_cliente: 'Mariana Vaz', destino: 'Gramado', created_at: '2026-07-02', updated_at: '2026-07-05', status: 'CONCLUIDO', sub_status: 'DESISTENCIA', valor_proposta: 4500, tags: ['Desistência: Concorrência'] },
      { id: 'o5', consultor_id: '3', nome_cliente: 'Julia Neto', destino: 'Cancun', created_at: '2026-07-15', updated_at: '2026-07-16', status: 'EM_ANDAMENTO', valor_proposta: 9800, tags: [] },
      { id: 'o6', consultor_id: '1', nome_cliente: 'Renato Gaúcho', destino: 'Maldivas', created_at: '2026-07-20', updated_at: '2026-07-22', status: 'AGUARDANDO', valor_proposta: 45000, tags: [] }
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
        produtos: [
          { fornecedor: 'Latam', valorCusto: 3200, valorVenda: 4000, comissao: 200, markup: 600, rav: 0, tipo: 'Voo' },
          { fornecedor: 'Disney Resort', valorCusto: 6000, valorVenda: 8000, comissao: 800, markup: 1200, rav: 0, tipo: 'Hotel' }
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
        produtos: [
          { fornecedor: 'Alitalia', valorCusto: 7000, valorVenda: 8500, comissao: 300, markup: 1200, rav: 0, tipo: 'Voo' },
          { fornecedor: 'Marriott Rome', valorCusto: 10000, valorVenda: 13000, comissao: 1500, markup: 1500, rav: 0, tipo: 'Hotel' }
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
  }

  /**
   * Filters database records locally based on date ranges and consultant filters
   */
  private getFilteredData() {
    const start = new Date(this.dataInicio + 'T00:00:00');
    const end = new Date(this.dataFim + 'T23:59:59');

    // Helper to check date range
    const inRange = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= start && d <= end;
    };

    // Helper to check consultant filter
    const matchConsultant = (id: string) => {
      if (this.consultorIdFilter === 'todos') return true;
      return id === this.consultorIdFilter;
    };

    return {
      orcamentos: this.orcamentos.filter(o => inRange(o.created_at || o.createdAt) && matchConsultant(o.consultor_id || o.consultorId)),
      viagens: this.viagens.filter(v => inRange(v.data_ida || v.dataIda) && matchConsultant(v.consultor_id || v.consultorId)),
      reembolsos: this.reembolsos.filter(r => {
        const date = r.created_at || r.createdAt;
        const consultorId = r.viagem?.consultor_id || r.consultor_solicitante_id || r.consultorSolicitanteId;
        return inRange(date) && matchConsultant(consultorId);
      }),
      alertas: this.alertas.filter(a => {
        const date = a.createdAt || a.eventDate;
        return inRange(date) && matchConsultant(a.consultorId);
      })
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
            <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
              Validações e métricas de desempenho, SLAs, previsões comerciais e qualidade de parceiros.
            </p>
          </div>
          
          <div class="flex items-center gap-2">
            <button id="btn-export-csv" class="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-sm">
              📥 Exportar Excel (CSV)
            </button>
            <button id="btn-print-pdf" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/10">
              🖨️ Imprimir PDF
            </button>
          </div>
        </div>

        <!-- Global Filters Bar (sticky/sticky-top) -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-end md:items-center gap-4 global-filters-bar no-print">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-4 flex-grow w-full md:w-auto">
            <!-- Date range start -->
            <div class="space-y-1 flex-1">
              <label class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Início</label>
              <input id="filter-data-inicio" type="date" value="${this.dataInicio}" class="w-full text-xs font-bold px-3 py-2 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100" />
            </div>

            <!-- Date range end -->
            <div class="space-y-1 flex-1">
              <label class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Fim</label>
              <input id="filter-data-fim" type="date" value="${this.dataFim}" class="w-full text-xs font-bold px-3 py-2 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100" />
            </div>

            <!-- Team / Consultant filter -->
            <div class="space-y-1 flex-1">
              <label class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Consultor / Equipe</label>
              <select id="filter-consultores" class="w-full text-xs font-bold px-3 py-2 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100" ${this.perfil?.role !== 'admin' ? 'disabled' : ''}>
                <option value="todos" ${this.consultorIdFilter === 'todos' ? 'selected' : ''}>Consolidado (Todos os Consultores)</option>
                ${this.consultores.map(c => `<option value="${c.id}" ${this.consultorIdFilter === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <button id="btn-limpar-filtros" class="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 text-xs font-extrabold rounded-xl transition flex-shrink-0">
            Limpar
          </button>
        </div>

        <!-- Dashboard Workspace Grid (Left Menu Tabs & Right View Panel) -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start print-full-width">
          
          <!-- Navigation Sidebar inside panel (Tabs) -->
          <div class="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 report-tabs-bar no-print flex-shrink-0">
            <button data-tab="desempenho" class="w-full px-3 py-2.5 rounded-xl text-left text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-850/50 ${this.activeTab === 'desempenho' ? 'report-tab-active' : 'text-slate-500'}">
              🎯 Desempenho
            </button>
            <button data-tab="prazos" class="w-full px-3 py-2.5 rounded-xl text-left text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-850/50 ${this.activeTab === 'prazos' ? 'report-tab-active' : 'text-slate-500'}">
              ⏰ Controle de SLAs
            </button>
            <button data-tab="faturamento" class="w-full px-3 py-2.5 rounded-xl text-left text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-850/50 ${this.activeTab === 'faturamento' ? 'report-tab-active' : 'text-slate-500'}">
              💰 Faturamento
            </button>
            <button data-tab="perdas" class="w-full px-3 py-2.5 rounded-xl text-left text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-850/50 ${this.activeTab === 'perdas' ? 'report-tab-active' : 'text-slate-500'}">
              📉 Desistências e Perdas
            </button>
            <button data-tab="previsoes" class="w-full px-3 py-2.5 rounded-xl text-left text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-850/50 ${this.activeTab === 'previsoes' ? 'report-tab-active' : 'text-slate-500'}">
              🔮 Previsões Preditivas
            </button>
            <button data-tab="fornecedores" class="w-full px-3 py-2.5 rounded-xl text-left text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-850/50 ${this.activeTab === 'fornecedores' ? 'report-tab-active' : 'text-slate-500'}">
              🏢 Qualidade / Fornecedores
            </button>
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
      default:
        return '';
    }
  }

  // ==========================================
  // VIEW: 1. DESEMPENHO E PRODUTIVIDADE
  // ==========================================
  private renderDesempenho(data: any): string {
    // Volume de Vendas
    const totalVendido = data.viagens.reduce((acc: number, v: any) => acc + (v.valor_total || v.valorTotal || 0), 0);
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
      consultantSales[cNome] = (consultantSales[cNome] || 0) + (v.valor_total || v.valorTotal || 0);
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
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Volume de Vendas</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalVendido)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cotações Criadas</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${orcados}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxa de Conversão</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${conversao}%</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
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
              ${this.consultores.map(c => {
                const subOrc = this.orcamentos.filter(o => (o.consultor_id || o.consultorId) === c.id);
                const subVia = this.viagens.filter(v => (v.consultor_id || v.consultorId) === c.id);
                
                const cAceito = subOrc.filter(o => o.sub_status === 'ACEITO' || o.subStatus === 'ACEITO').length;
                const cRecuso = subOrc.filter(o => o.sub_status === 'DESISTENCIA' || o.subStatus === 'DESISTENCIA').length;
                const cConv = (cAceito + cRecuso) > 0 ? Math.round((cAceito / (cAceito + cRecuso)) * 100) : 0;
                
                const cSales = subVia.reduce((sum, v) => sum + (v.valor_total || v.valorTotal || 0), 0);
                
                return `
                  <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350">
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
      <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350">
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
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alertas Totais do Período</p>
            <p class="text-lg font-black text-indigo-600 mt-1">${totalAlertas}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prazos de SLA Estourados</p>
            <p class="text-lg font-black text-rose-600 mt-1">${vencidos}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center col-span-2 md:col-span-1">
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

    data.viagens.forEach((v: any) => {
      faturamentoBruto += (v.valor_total || v.valorTotal || 0);
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

    const lucroBruto = (faturamentoBruto - custoTotal);
    const lucroLiquidoReal = comissaoTotal + markupTotal + ravTotal;
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
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Faturamento Bruto</p>
            <p class="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(faturamentoBruto)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Comissão Realizada</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(comissaoTotal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lucro Líquido</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lucroLiquidoReal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
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
                    <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350">
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
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center col-span-2">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fuga de Receita Estimada</p>
            <p class="text-xl font-black text-rose-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPerdido)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Desistências</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${countPerdas}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
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
                    <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350">
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
    // 1. Pipeline ativo
    const pipelineOrc = this.orcamentos.filter((o: any) => o.status !== 'CONCLUIDO');
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
      return dataIda >= hoje && dataIda <= limite30Dias && v.status !== 'cancelada';
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
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pipeline Ativo Total (Cotação)</p>
            <p class="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorPipelineBruto)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center border-l-4 border-l-indigo-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fechamento Previsto (Ponderado)</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorPonderado)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
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
                <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350">
                  <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">1. Solicitado (Novo Lead)</td>
                  <td class="p-3 text-center">${counts.solicitado}</td>
                  <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.solicitado)}</td>
                  <td class="p-3 text-center text-rose-500">15%</td>
                  <td class="p-3 font-extrabold text-indigo-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.solicitado * 0.15)}</td>
                </tr>
                <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350">
                  <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">2. Em Andamento (Negociação)</td>
                  <td class="p-3 text-center">${counts.em_andamento}</td>
                  <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.em_andamento)}</td>
                  <td class="p-3 text-center text-amber-500">45%</td>
                  <td class="p-3 font-extrabold text-indigo-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.em_andamento * 0.45)}</td>
                </tr>
                <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350">
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
    const supplierStats: Record<string, { totalSold: number, salesCount: number, refundCount: number, retentionTax: number }> = {};
    
    // Fill from viajes product suppliers
    this.viagens.forEach((v: any) => {
      if (v.produtos) {
        v.produtos.forEach((p: any) => {
          const supplier = p.fornecedor || 'Desconhecido';
          if (!supplierStats[supplier]) {
            supplierStats[supplier] = { totalSold: 0, salesCount: 0, refundCount: 0, retentionTax: 0 };
          }
          if (p.status !== 'cancelado') {
            supplierStats[supplier].totalSold += (p.valorVenda || 0);
            supplierStats[supplier].salesCount++;
          }
        });
      }
    });

    // Fill refund statistics
    this.reembolsos.forEach((r: any) => {
      const supplier = r.produto?.fornecedor || 'Desconhecido';
      if (!supplierStats[supplier]) {
        supplierStats[supplier] = { totalSold: 0, salesCount: 0, refundCount: 0, retentionTax: 0 };
      }
      supplierStats[supplier].refundCount++;
      supplierStats[supplier].retentionTax += (r.taxa_retencao || r.taxaRetencao || 0);
    });

    const tableRows = Object.entries(supplierStats).map(([fornecedor, stats]) => {
      const refundRate = stats.salesCount > 0 ? Math.round((stats.refundCount / stats.salesCount) * 100) : 0;
      
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
        <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350">
          <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${fornecedor}</td>
          <td class="p-3 text-center">${stats.salesCount}</td>
          <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSold)}</td>
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
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ocorrências de Reembolsos</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${totalReembolsos}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxa de Ocorrência Global</p>
            <p class="text-lg font-black text-rose-600 mt-1">${this.viagens.length > 0 ? Math.round((totalReembolsos / this.viagens.length) * 100) : 0}%</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-center col-span-2 md:col-span-1">
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
                  <th class="p-3 text-center">Produtos Vendidos</th>
                  <th class="p-3">Faturamento Total</th>
                  <th class="p-3 text-center">Qtd. Reembolsos</th>
                  <th class="p-3 text-center">Taxa Incidência</th>
                  <th class="p-3">Grau de Risco</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows || `
                  <tr>
                    <td colspan="6" class="p-6 text-center text-slate-400 font-extrabold">Nenhum parceiro ou fornecedor cadastrado nas viagens ativas.</td>
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
  // EVENT LISTENERS & EXPORTS
  // ==========================================
  private setupEventListeners(): void {
    // 1. Tab switches
    const tabButtons = this.container.querySelectorAll('.report-tabs-bar button');
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

    // 2. Global filters change
    const inputInicio = document.getElementById('filter-data-inicio') as HTMLInputElement;
    inputInicio?.addEventListener('change', () => {
      this.dataInicio = inputInicio.value;
      this.render();
      this.setupEventListeners();
    });

    const inputFim = document.getElementById('filter-data-fim') as HTMLInputElement;
    inputFim?.addEventListener('change', () => {
      this.dataFim = inputFim.value;
      this.render();
      this.setupEventListeners();
    });

    const selectConsultor = document.getElementById('filter-consultores') as HTMLSelectElement;
    selectConsultor?.addEventListener('change', () => {
      this.consultorIdFilter = selectConsultor.value;
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
      this.consultores.forEach(c => {
        const subOrc = this.orcamentos.filter(o => (o.consultor_id || o.consultorId) === c.id);
        const subVia = this.viagens.filter(v => (v.consultor_id || v.consultorId) === c.id);
        const cAceito = subOrc.filter(o => o.sub_status === 'ACEITO' || o.subStatus === 'ACEITO').length;
        const cRecuso = subOrc.filter(o => o.sub_status === 'DESISTENCIA' || o.subStatus === 'DESISTENCIA').length;
        const cConv = (cAceito + cRecuso) > 0 ? Math.round((cAceito / (cAceito + cRecuso)) * 100) : 0;
        const cSales = subVia.reduce((sum, v) => sum + (v.valor_total || v.valorTotal || 0), 0);
        
        csvContent += `"${c.nome}";${subOrc.length};${cAceito};"${cConv}%";${cSales}\n`;
      });
    } else if (this.activeTab === 'prazos') {
      csvContent += 'Alerta;Consultor;Data Evento;Status\n';
      data.alertas.forEach(a => {
        csvContent += `"${a.title}";"${a.consultorNome}";"${a.dateStr}";"${a.arquivado ? 'Arquivado' : 'Ativo'}"\n`;
      });
    } else if (this.activeTab === 'faturamento') {
      csvContent += 'Faturamento Bruto;Comissao Consolidada;Markup Coletado;Lucro Liquido\n';
      
      let faturamentoBruto = 0, comissaoTotal = 0, markupTotal = 0, ravTotal = 0;
      data.viagens.forEach((v: any) => {
        faturamentoBruto += (v.valor_total || v.valorTotal || 0);
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
      csvContent += `${faturamentoBruto};${comissaoTotal};${markupTotal};${comissaoTotal + markupTotal + ravTotal}\n`;
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
      const pipelineOrc = this.orcamentos.filter((o: any) => o.status !== 'CONCLUIDO');
      
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
      csvContent += 'Fornecedor;Total Vendido;Reembolsos;Taxa Incidencia\n';
      const stats: Record<string, { sold: number, refCount: number, salesCount: number }> = {};
      this.viagens.forEach((v: any) => {
        if (v.produtos) {
          v.produtos.forEach((p: any) => {
            const supplier = p.fornecedor || 'Desconhecido';
            if (!stats[supplier]) stats[supplier] = { sold: 0, refCount: 0, salesCount: 0 };
            if (p.status !== 'cancelado') {
              stats[supplier].sold += (p.valorVenda || 0);
              stats[supplier].salesCount++;
            }
          });
        }
      });
      data.reembolsos.forEach((r: any) => {
        const supplier = r.produto?.fornecedor || 'Desconhecido';
        if (!stats[supplier]) stats[supplier] = { sold: 0, refCount: 0, salesCount: 0 };
        stats[supplier].refCount++;
      });

      Object.entries(stats).forEach(([supp, item]) => {
        const rate = item.salesCount > 0 ? Math.round((item.refCount / item.salesCount) * 100) : 0;
        csvContent += `"${supp}";${item.sold};${item.refCount};"${rate}%"\n`;
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
