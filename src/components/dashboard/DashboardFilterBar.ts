import { formatIsoDateToBr, formatBrDateToIso } from '../../utils/masks';

export interface DashboardFilterState {
  viewModeMonth: 'current' | 'all';
  showFiltersPanel: boolean;
  showConfPopover: boolean;
  selectedConsultantId: string;
  confFilters: {
    finPendente: boolean;
    finOk: boolean;
    procPendente: boolean;
    procOk: boolean;
  };
  activeStatusTab: string;
  buscaTermo: string;
  dataFinStart: string;
  dataFinEnd: string;
  dataIdaStart: string;
  dataIdaEnd: string;
  dataVoltaStart: string;
  dataVoltaEnd: string;
  advMesAno: string;
  advProdutos: string[];
  advDestinos: string[];
  advFornecedor: string;
  advValorMin: number | null;
  advValorMax: number | null;
  advTarifaMin: number | null;
  advTarifaMax: number | null;
  advTaxaMin: number | null;
  advTaxaMax: number | null;
  advComissaoMin: number | null;
  advComissaoMax: number | null;
  advMarkupMin: number | null;
  advMarkupMax: number | null;
  advRavMin: number | null;
  advRavMax: number | null;
  advRentabilidadeMin: number | null;
  advRentabilidadeMax: number | null;
  advMarkupRav: string;
  advAnexos: string;
  advSla: string;
  advRiskScore: string[];
  advConsultores: string[];
  advFormasRecebimento: string[];
  advOrigensLead: string[];
  advPaxFaixas: string[];
  advTags: string[];
  advProdutoMatchMode: 'AND' | 'OR';
}

export interface DashboardFilterContext {
  user?: any;
  perfil?: any;
  settings?: any;
  consultores: any[];
  formasRecebimento: any[];
  origensLead: any[];
  destinosList: string[];
  tiposDisponiveis: Array<{ id: string; nome: string; icone: string }>;
  tiposProduto?: any[];
  tagsDisponiveis: string[];
  counts: {
    todos: number;
    fechado: number;
    pos_venda: number;
    pre_embarque: number;
    pos_viagem: number;
    reembolso_solicitado: number;
  };
  totalSlaAlerts: number;
  totalViagens: number;
  totalVendas: number;
  totalRentabilidade: number;
  totalMarkupAcumulado: number;
  totalRavAcumulado: number;
  ticketMedio: number;
  currentMonthLabel: string;
  totalFiltrosAtivos: number;
}

export interface DashboardFilterBarHandlers {
  onSetViewModeMonth: (mode: 'current' | 'all') => void;
  onToggleFiltersPanel: () => void;
  onCollapseFiltersPanel: () => void;
  onToggleConfPopover: () => void;
  onCloseConfPopover: () => void;
  onSelectConsultor: (id: string) => void;
  onNovaViagem: () => void;
  onExportCsv: () => void;
  onSelectStatusTab: (statusKey: string) => void;
  onDateFilterChange: (field: string, value: string) => void;
  onAdvMesAnoChange: (value: string) => void;
  onAdvDestinoChange: (value: string) => void;
  onAdvFornecedorChange: (value: string) => void;
  onNumericFilterChange: (field: string, value: number | null) => void;
  onClearAdvFinancas: () => void;
  onToggleMarkupRav: (val: string) => void;
  onToggleMatchMode: (mode: 'AND' | 'OR') => void;
  onClearAdvProdutos: () => void;
  onToggleAdvProduto: (pId: string) => void;
  onToggleAdvConsultor: (cId: string) => void;
  onClearAdvConsultores: () => void;
  onToggleAdvForma: (fKey: string) => void;
  onClearAdvFormas: () => void;
  onToggleAdvOrigem: (oKey: string) => void;
  onToggleAdvPax: (paxKey: string) => void;
  onToggleAdvTag: (tagName: string) => void;
  onClearAdvTags: () => void;
  onToggleAdvAnexo: (anexoVal: string) => void;
  onToggleAdvSla: (slaVal: string) => void;
  onToggleAdvRisk: (riskVal: string) => void;
  onToggleConfFilter: (key: 'finPendente' | 'finOk' | 'procPendente' | 'procOk') => void;
  onConfAtalho100: () => void;
  onConfAtalhoNenhum: () => void;
  onConfLimpar: () => void;
  onResetAllFilters: () => void;
  onRemoveSingleFilter: (key: string) => void;
}

export class DashboardFilterBar {
  /**
   * Obtém o emoji do tipo de produto
   */
  public static getIconForType(tipo: string, tiposProduto?: any[]): string {
    const cleanTipo = (tipo || '').trim().toLowerCase();
    if (tiposProduto && tiposProduto.length > 0) {
      const found = tiposProduto.find(t => (t.nome || '').trim().toLowerCase() === cleanTipo);
      if (found) return found.icone;
    }

    const fallbackMap: Record<string, string> = {
      'aéreo facial': '✈️',
      'aéreo operadora': '✈️',
      'carro': '🚗',
      'circuito': '🗺️',
      'cruzeiro': '🚢',
      'hotel': '🏨',
      'passeios': '🎟️',
      'seguro viagem': '🛡️',
      'ingressos': '🎫',
      'transfer': '🚐',
      'trem': '🚂',
      'diversos': '📦',
      'casas': '🏡',
      'cias aéreas - assento/bagagem': '🧳',
      'cias aéreas - emissão com pontos': '🪙',
      'mudar!': '⚠️',
      'voo': '✈️'
    };

    return fallbackMap[cleanTipo] || '📦';
  }

  /**
   * Renderiza os controles de topo (Header Operacional)
   */
  public static renderHeaderControls(ctx: DashboardFilterContext, state: DashboardFilterState): string {
    const canCreateTrip = ctx.perfil?.role === 'admin' ||
      !!ctx.settings?.permitirConsultorCriarViagem ||
      !!ctx.settings?.permitir_consultor_criar_viagem;

    const confActiveCount = (state.confFilters.finPendente ? 1 : 0) +
      (state.confFilters.finOk ? 1 : 0) +
      (state.confFilters.procPendente ? 1 : 0) +
      (state.confFilters.procOk ? 1 : 0);

    const isConfActive = confActiveCount > 0;

    return `
      <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto lg:justify-end py-0.5">
        <!-- Pill Switch Segmentado: Mês Corrente vs Ver Tudo -->
        <div class="inline-flex h-[42px] p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0 select-none items-center">
          <button id="btn-view-month-current" class="px-3 h-full rounded-lg text-xs font-black transition flex items-center justify-center ${state.viewModeMonth === 'current' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}">
            📅 Mês Corrente (${ctx.currentMonthLabel})
          </button>
          <button id="btn-view-month-all" class="px-3 h-full rounded-lg text-xs font-black transition flex items-center justify-center ${state.viewModeMonth === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}">
            🌐 Ver Tudo
          </button>
        </div>

        <!-- Stats Rápidos em Linha Única -->
        <div class="flex items-center h-[42px] gap-2 bg-slate-100/70 dark:bg-slate-800/50 px-3.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shrink-0 text-xs">
          <span class="font-extrabold text-slate-600 dark:text-slate-300">Viagens: <strong class="text-slate-900 dark:text-white font-black">${ctx.counts.todos}</strong></span>
          <span class="text-slate-300 dark:text-slate-700">&bull;</span>
          <span class="font-extrabold text-slate-600 dark:text-slate-300">SLAs: <strong class="${ctx.totalSlaAlerts > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900 dark:text-white'} font-black">${ctx.totalSlaAlerts}</strong></span>
        </div>

        <!-- Botão de Filtros Avançados -->
        <button id="btn-toggle-filtros" class="h-[42px] px-3.5 ${ctx.totalFiltrosAtivos > 0 ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400/30' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold'} text-xs rounded-xl border ${ctx.totalFiltrosAtivos > 0 ? 'border-indigo-500' : 'border-slate-200/60 dark:border-slate-700/60'} flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer">
          <span>🎛️ Avançado${ctx.totalFiltrosAtivos > 0 ? ` (${ctx.totalFiltrosAtivos})` : ''}</span>
          <span class="text-[9px]">${state.showFiltersPanel ? '▲' : '▼'}</span>
        </button>

        <!-- Seletor de Consultores (Apenas para Admins) -->
        ${ctx.perfil?.role === 'admin' ? `
          <div class="flex items-center h-[42px] gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 rounded-xl shadow-xs">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 select-none">Equipe:</span>
            <select id="select-dashboard-consultor" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[130px]">
              <option value="todos" ${state.selectedConsultantId === 'todos' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Todos</option>
              ${ctx.consultores.map(c => `<option value="${c.id}" ${state.selectedConsultantId === c.id ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${c.nome}</option>`).join('')}
            </select>
          </div>

          <!-- Seletor Popover de Conferência Avançado com Pills -->
          <div class="relative inline-block text-left shrink-0" id="container-conf-popover">
            <button id="btn-toggle-conf-popover" type="button" class="flex items-center h-[42px] gap-1.5 px-3 bg-white dark:bg-slate-900 border ${
              isConfActive
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-1 ring-indigo-500/30'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold'
            } rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <span class="text-[10px] font-black uppercase text-slate-400 select-none">Conf.:</span>
              <span>${isConfActive ? `Ativo (${confActiveCount})` : 'Todas'}</span>
              <span class="text-[8px] ml-0.5">${state.showConfPopover ? '▲' : '▼'}</span>
            </button>

            <!-- Popover Menu Suspenso com Pills -->
            <div id="popover-conf-filter" class="${state.showConfPopover ? 'block' : 'hidden'} absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[70] p-3.5 space-y-3 animate-fade-in font-sans">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span class="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Filtros de Conferência</span>
                <button id="btn-conf-limpar" type="button" class="text-[10px] font-bold text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer">
                  Limpar
                </button>
              </div>

              <!-- Seção Financeiro -->
              <div>
                <span class="block text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">💳 Conferência Financeira</span>
                <div class="flex flex-wrap gap-1.5">
                  <button id="pill-conf-fin-pendente" type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${state.confFilters.finPendente ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'}">
                    ⏳ Fin. Pendente
                  </button>
                  <button id="pill-conf-fin-ok" type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${state.confFilters.finOk ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}">
                    ✅ Fin. OK
                  </button>
                </div>
              </div>

              <!-- Seção Processo -->
              <div>
                <span class="block text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">📋 Conferência de Processo</span>
                <div class="flex flex-wrap gap-1.5">
                  <button id="pill-conf-proc-pendente" type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${state.confFilters.procPendente ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'}">
                    ⏳ Proc. Pendente
                  </button>
                  <button id="pill-conf-proc-ok" type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${state.confFilters.procOk ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}">
                    ✅ Proc. OK
                  </button>
                </div>
              </div>

              <!-- Atalhos Rápidos -->
              <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button id="btn-conf-atalho-100" type="button" class="flex-1 py-1 px-2 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition text-center">
                  ✨ 100% OK
                </button>
                <button id="btn-conf-atalho-nenhum" type="button" class="flex-1 py-1 px-2 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/60 transition text-center">
                  ⏳ Nenhum OK
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Botão Criar Card / Nova Viagem -->
        ${canCreateTrip ? `
          <button id="btn-nova-viagem" class="h-[42px] px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-md shadow-indigo-600/15 flex items-center justify-center gap-1.5 transition uppercase shrink-0 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Nova Viagem</span>
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Renderiza a barra com o resumo financeiro em tempo real e o botão de exportar CSV/Excel
   */
  public static renderFinancialSummaryBarHTML(ctx: DashboardFilterContext): string {
    return `
      <div id="financial-summary-export-bar" class="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Viagens:</span>
            <span class="font-black text-slate-800 dark:text-slate-100">${ctx.totalViagens}</span>
          </div>
          <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Total Vendas:</span>
            <span class="font-extrabold text-emerald-600 dark:text-emerald-400">R$ ${ctx.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Rentabilidade:</span>
            <span class="font-extrabold text-indigo-600 dark:text-indigo-400">R$ ${ctx.totalRentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ${(ctx.totalMarkupAcumulado > 0 || ctx.totalRavAcumulado > 0) ? `
            <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">Markup:</span>
              <span class="font-bold text-purple-600 dark:text-purple-400">R$ ${ctx.totalMarkupAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">RAV:</span>
              <span class="font-bold text-amber-600 dark:text-amber-400">R$ ${ctx.totalRavAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Ticket Médio:</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">R$ ${ctx.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <button id="btn-export-filtered-csv" type="button" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1.5 transition shadow-xs cursor-pointer">
          <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span>Exportar CSV</span>
        </button>
      </div>
    `;
  }

  /**
   * Renderiza o Painel Completo de Filtros Avançados Expansível
   */
  public static renderAdvancedFiltersPanelHTML(ctx: DashboardFilterContext, state: DashboardFilterState): string {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    const monthOptions: { value: string; label: string }[] = [];
    for (let i = -6; i <= 12; i++) {
      const d = new Date(curYear, curMonth + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${months[d.getMonth()]}/${d.getFullYear()}`;
      monthOptions.push({ value: val, label });
    }

    return `
      <div id="advanced-filters-panel" class="${state.showFiltersPanel ? 'flex' : 'hidden'} flex-col max-h-[75vh] md:max-h-[70vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 py-4 md:py-5 transition-colors duration-200 shadow-xl z-30 animate-fadeIn shrink-0">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 pb-2">

          <!-- Bloco 1: Período & Datas -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>📅</span>
                <span>Período & Datas</span>
              </span>
              <!-- Atalho Mês/Ano -->
              <select id="filter-adv-mes-ano" class="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                <option value="">Todos os Meses</option>
                ${monthOptions.map(m => `<option value="${m.value}" ${state.advMesAno === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
              </select>
            </div>

            <!-- Data Financeiro -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Data Financeiro</span>
              <div class="flex items-center gap-1.5">
                <input id="filter-fin-start" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${state.dataFinStart ? formatIsoDateToBr(state.dataFinStart) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span class="text-xs text-slate-400">a</span>
                <input id="filter-fin-end" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${state.dataFinEnd ? formatIsoDateToBr(state.dataFinEnd) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>

            <!-- Embarque Ida -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">✈️ Embarque (Ida)</span>
              <div class="flex items-center gap-1.5">
                <input id="filter-ida-start" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${state.dataIdaStart ? formatIsoDateToBr(state.dataIdaStart) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span class="text-xs text-slate-400">a</span>
                <input id="filter-ida-end" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${state.dataIdaEnd ? formatIsoDateToBr(state.dataIdaEnd) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>

            <!-- Retorno Volta -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">🚐 Retorno (Volta)</span>
              <div class="flex items-center gap-1.5">
                <input id="filter-volta-start" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${state.dataVoltaStart ? formatIsoDateToBr(state.dataVoltaStart) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span class="text-xs text-slate-400">a</span>
                <input id="filter-volta-end" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${state.dataVoltaEnd ? formatIsoDateToBr(state.dataVoltaEnd) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          <!-- Bloco 2: Produtos & Serviços -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>🏷️</span>
                <span>Produtos & Serviços</span>
              </span>
              <!-- Toggle E / OU -->
              <div class="inline-flex p-0.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold select-none">
                <button id="btn-match-mode-and" type="button" class="px-2 py-0.5 rounded transition ${state.advProdutoMatchMode === 'AND' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">
                  TODOS (E)
                </button>
                <button id="btn-match-mode-or" type="button" class="px-2 py-0.5 rounded transition ${state.advProdutoMatchMode === 'OR' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">
                  QUALQUER (OU)
                </button>
              </div>
            </div>

            <!-- Grid de Pills de Produtos -->
            <div class="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              ${ctx.tiposDisponiveis.map(t => {
                const isSelected = state.advProdutos.includes(t.id);
                return `
                  <button type="button" class="pill-adv-produto px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-prod-id="${t.id}">
                    <span>${t.icone}</span>
                    <span>${t.nome}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${state.advProdutos.length > 0 ? `
              <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                <span>${state.advProdutos.length} produto(s) selecionado(s) (${state.advProdutoMatchMode === 'AND' ? 'precisa ter todos' : 'pelo menos um'})</span>
                <button id="btn-clear-adv-produtos" type="button" class="text-rose-500 hover:underline cursor-pointer">Limpar</button>
              </div>
            ` : ''}
          </div>

          <!-- Bloco 3: Consultores (Usuários) em Pills -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>👤</span>
                <span>Consultores (Usuários)</span>
              </span>
              ${state.advConsultores.length > 0 ? `
                <button id="btn-clear-adv-consultores" type="button" class="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer">Limpar</button>
              ` : ''}
            </div>

            <div class="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              ${ctx.consultores.map(c => {
                const isSelected = state.advConsultores.includes(c.id);
                const iniciais = (c.nome || 'C').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                return `
                  <button type="button" class="pill-adv-consultor px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-consultant-id="${c.id}">
                    <span class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${isSelected ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'}">${iniciais}</span>
                    <span>${c.nome || 'Consultor'}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${state.advConsultores.length > 0 ? `
              <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                ${state.advConsultores.length} consultor(es) selecionado(s)
              </div>
            ` : ''}
          </div>

          <!-- Bloco 4: Formas de Recebimento -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>🪙</span>
                <span>Formas de Recebimento</span>
              </span>
              ${state.advFormasRecebimento.length > 0 ? `
                <button id="btn-clear-adv-formas" type="button" class="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer">Limpar</button>
              ` : ''}
            </div>

            <div class="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              ${(ctx.formasRecebimento || []).map(f => {
                const fKey = f.id || f.nome;
                const isSelected = state.advFormasRecebimento.includes(fKey) || state.advFormasRecebimento.includes(f.nome);
                return `
                  <button type="button" class="pill-adv-forma px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-forma-id="${fKey}" data-forma-nome="${f.nome}">
                    <span>${f.icone || '🪙'}</span>
                    <span>${f.nome}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${state.advFormasRecebimento.length > 0 ? `
              <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                ${state.advFormasRecebimento.length} forma(s) selecionada(s)
              </div>
            ` : ''}
          </div>

          <!-- Bloco 5: Origem do Lead & PAX -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <span>📣</span>
              <span>Origem do Lead & Passageiros</span>
            </span>

            <!-- Origens de Lead -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Canal de Captação</span>
              <div class="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                ${(ctx.origensLead || []).map(o => {
                  const oKey = o.id || o.nome;
                  const isSelected = state.advOrigensLead.includes(oKey) || state.advOrigensLead.includes(o.nome);
                  return `
                    <button type="button" class="pill-adv-origem px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }" data-origem-id="${oKey}" data-origem-nome="${o.nome}">
                      <span>${o.icone || '📣'}</span>
                      <span>${o.nome}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Quantidade de Passageiros (PAX) -->
            <div class="space-y-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">👥 Qtd de Passageiros (PAX)</span>
              <div class="flex flex-wrap gap-1">
                ${[
                  { id: '1', label: '👤 1 PAX' },
                  { id: '2', label: '👥 2 PAX' },
                  { id: '3-5', label: '👨‍👩‍👧 3 a 5 PAX' },
                  { id: '6+', label: '🚌 6+ PAX' }
                ].map(pax => `
                  <button type="button" class="pill-adv-pax px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    state.advPaxFaixas.includes(pax.id)
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-pax-key="${pax.id}">
                    ${pax.label}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Bloco 6: Tags & Classificações -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>🏷️</span>
                <span>Tags / Classificações</span>
              </span>
              ${state.advTags.length > 0 ? `
                <button id="btn-clear-adv-tags" type="button" class="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer">Limpar</button>
              ` : ''}
            </div>

            <div class="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              ${ctx.tagsDisponiveis.map(t => {
                const isSelected = state.advTags.includes(t);
                return `
                  <button type="button" class="pill-adv-tag px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-tag-name="${t}">
                    <span>🏷️</span>
                    <span>${t}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${state.advTags.length > 0 ? `
              <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                ${state.advTags.length} tag(s) selecionada(s)
              </div>
            ` : ''}
          </div>

          <!-- Bloco 7: Destinos & Fornecedores -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <span>📍</span>
              <span>Destinos & Fornecedores</span>
            </span>

            <!-- Destino -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Destino</span>
              <select id="filter-adv-destino" class="w-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                <option value="">Todos os Destinos</option>
                ${ctx.destinosList.map(d => `<option value="${d}" ${state.advDestinos.includes(d) ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>

            <!-- Fornecedor -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">🏢 Fornecedor / Companhia</span>
              <input id="filter-adv-fornecedor" type="text" placeholder="Ex: LATAM, Movida, Disney, Hotel..." value="${state.advFornecedor}" class="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <!-- Status de Documentos / Anexos -->
            <div class="space-y-1 pt-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">📎 Anexos & Vouchers</span>
              <div class="flex flex-wrap gap-1">
                ${[
                  { id: 'todos', label: 'Todos' },
                  { id: 'com_anexo', label: '📎 Com Anexos' },
                  { id: 'sem_anexo', label: '🚫 Sem Anexos' },
                  { id: 'com_voucher', label: '📑 Com Voucher Geral' },
                  { id: 'sem_voucher', label: '⏳ Sem Voucher Geral' }
                ].map(opt => `
                  <button type="button" class="pill-adv-anexo px-2 py-0.5 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                    state.advAnexos === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-anexo-val="${opt.id}">
                    ${opt.label}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Bloco 8: Valores Financeiros Detalhados dos Produtos & Viagem -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>💰</span>
                <span>Valores Financeiros do Produto</span>
              </span>
              ${(state.advValorMin !== null || state.advValorMax !== null || state.advTarifaMin !== null || state.advTarifaMax !== null || state.advTaxaMin !== null || state.advTaxaMax !== null || state.advComissaoMin !== null || state.advComissaoMax !== null || state.advMarkupMin !== null || state.advMarkupMax !== null || state.advRavMin !== null || state.advRavMax !== null || state.advRentabilidadeMin !== null || state.advRentabilidadeMax !== null || state.advMarkupRav !== 'todos') ? `
                <button id="btn-clear-adv-financas" type="button" class="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer">Limpar</button>
              ` : ''}
            </div>

            <!-- Tipo de Margem / Rentabilidade -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">💎 Tipo de Margem / Rentabilidade</span>
              <div class="flex flex-wrap gap-1">
                ${[
                  { id: 'todos', label: 'Todos' },
                  { id: 'com_markup_ou_rav', label: '💎⚡ Markup + RAV (e/ou)' },
                  { id: 'com_markup', label: '💎 Com Markup' },
                  { id: 'com_rav', label: '⚡ Com RAV' },
                  { id: 'com_markup_e_rav', label: '✨ Ambos (MKP e RAV)' },
                  { id: 'apenas_comissao', label: '💰 Apenas Comissão' },
                  { id: 'sem_markup_rav', label: '🚫 Sem MKP/RAV' }
                ].map(opt => `
                  <button type="button" class="pill-adv-markup-rav px-2 py-0.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                    state.advMarkupRav === opt.id
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-1 ring-purple-400/30'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                  }" data-markup-rav-val="${opt.id}">
                    ${opt.label}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Grade de Inputs de Faixas Financeiras -->
            <div class="space-y-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              
              <!-- Linha 1: Valor Venda & Rentabilidade -->
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-slate-400 uppercase">Valor Venda Total (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-valor-min" type="number" min="0" step="100" placeholder="Min" value="${state.advValorMin !== null ? state.advValorMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-valor-max" type="number" min="0" step="100" placeholder="Max" value="${state.advValorMax !== null ? state.advValorMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-slate-400 uppercase">Rentabilidade Total (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-rent-min" type="number" min="0" step="50" placeholder="Min" value="${state.advRentabilidadeMin !== null ? state.advRentabilidadeMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-rent-max" type="number" min="0" step="50" placeholder="Max" value="${state.advRentabilidadeMax !== null ? state.advRentabilidadeMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>

              <!-- Linha 2: Markup & RAV -->
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-purple-600 dark:text-purple-400 uppercase">💎 Markup (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-markup-min" type="number" min="0" step="50" placeholder="Min" value="${state.advMarkupMin !== null ? state.advMarkupMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-markup-max" type="number" min="0" step="50" placeholder="Max" value="${state.advMarkupMax !== null ? state.advMarkupMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  </div>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase">⚡ RAV (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-rav-min" type="number" min="0" step="50" placeholder="Min" value="${state.advRavMin !== null ? state.advRavMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-rav-max" type="number" min="0" step="50" placeholder="Max" value="${state.advRavMax !== null ? state.advRavMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  </div>
                </div>
              </div>

              <!-- Linha 3: Comissão & Tarifa -->
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-slate-400 uppercase">💰 Comissão (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-comissao-min" type="number" min="0" step="50" placeholder="Min" value="${state.advComissaoMin !== null ? state.advComissaoMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-comissao-max" type="number" min="0" step="50" placeholder="Max" value="${state.advComissaoMax !== null ? state.advComissaoMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-slate-400 uppercase">🏷️ Tarifa Custo (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-tarifa-min" type="number" min="0" step="100" placeholder="Min" value="${state.advTarifaMin !== null ? state.advTarifaMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-tarifa-max" type="number" min="0" step="100" placeholder="Max" value="${state.advTarifaMax !== null ? state.advTarifaMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>

              <!-- Linha 4: Taxas / Impostos -->
              <div class="space-y-0.5">
                <span class="text-[8px] font-bold text-slate-400 uppercase">🧾 Taxas & Impostos (R$)</span>
                <div class="flex items-center gap-1">
                  <input id="filter-adv-taxa-min" type="number" min="0" step="50" placeholder="Min" value="${state.advTaxaMin !== null ? state.advTaxaMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  <span class="text-[10px] text-slate-400">-</span>
                  <input id="filter-adv-taxa-max" type="number" min="0" step="50" placeholder="Max" value="${state.advTaxaMax !== null ? state.advTaxaMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

            </div>
          </div>

          <!-- Bloco 9: Conferência, SLAs & Risk Score -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Conferência & SLAs</span>
            </span>

            <div class="space-y-2">
              <!-- Conferência -->
              <div class="space-y-1">
                <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Conferência</span>
                <div class="flex flex-wrap gap-1">
                  <button type="button" class="pill-adv-conf-fin-ok px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${state.confFilters.finOk ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}">
                    ✅ Fin. OK
                  </button>
                  <button type="button" class="pill-adv-conf-fin-pendente px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${state.confFilters.finPendente ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'}">
                    ⏳ Fin. Pend.
                  </button>
                  <button type="button" class="pill-adv-conf-proc-ok px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${state.confFilters.procOk ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}">
                    ✅ Proc. OK
                  </button>
                  <button type="button" class="pill-adv-conf-proc-pendente px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${state.confFilters.procPendente ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'}">
                    ⏳ Proc. Pend.
                  </button>
                </div>
              </div>

              <!-- Alertas de SLA & Risk Score -->
              <div class="space-y-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">SLAs & Risco</span>
                <div class="flex flex-wrap gap-1">
                  <button type="button" class="pill-adv-sla-alerta px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${state.advSla === 'com_alerta' ? 'bg-rose-600 text-white border-rose-700 shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'}" data-sla-val="com_alerta">
                    🚨 Alerta SLA
                  </button>
                  ${[
                    { id: 'verde', label: '🟢 Verde', bg: 'bg-emerald-600 text-white border-emerald-700' },
                    { id: 'amarelo', label: '🟡 Amarelo', bg: 'bg-amber-500 text-white border-amber-600' },
                    { id: 'vermelho', label: '🔴 Vermelho', bg: 'bg-rose-600 text-white border-rose-700' }
                  ].map(r => `
                    <button type="button" class="pill-adv-risk px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      state.advRiskScore.includes(r.id)
                        ? r.bg
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }" data-risk-level="${r.id}">
                      ${r.label}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Rodapé de Ações do Painel (Sticky) -->
        <div class="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-5 px-4 md:px-6 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 mt-4 z-10 shadow-sm">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">
            ${ctx.totalFiltrosAtivos > 0 ? `<span class="text-indigo-600 dark:text-indigo-400 font-extrabold">🎯 ${ctx.totalFiltrosAtivos} critério(s) ativo(s)</span> &bull; Filtro reativo aplicado` : 'Nenhum filtro ativo selecionado'}
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-clear-all-adv-filters" type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-xl border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer">
              Limpar Todos os Filtros
            </button>
            <button id="btn-collapse-adv-panel" type="button" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer">
              Recolher Painel ▲
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza a barra de chips com os filtros ativos para feedback visual imediato e desativação rápida em 1 clique
   */
  public static renderActiveFilterChipsHTML(ctx: DashboardFilterContext, state: DashboardFilterState): string {
    const chips: { key: string; label: string; icon: string }[] = [];

    if (state.buscaTermo && state.buscaTermo.trim()) {
      chips.push({ key: 'busca', label: `Busca: "${state.buscaTermo.trim()}"`, icon: '🔍' });
    }

    if (state.dataFinStart || state.dataFinEnd) {
      const startBr = state.dataFinStart ? formatIsoDateToBr(state.dataFinStart) : '...';
      const endBr = state.dataFinEnd ? formatIsoDateToBr(state.dataFinEnd) : '...';
      chips.push({ key: 'dataFin', label: `Data Fin: ${startBr} a ${endBr}`, icon: '📅' });
    }

    if (state.dataIdaStart || state.dataIdaEnd) {
      const startBr = state.dataIdaStart ? formatIsoDateToBr(state.dataIdaStart) : '...';
      const endBr = state.dataIdaEnd ? formatIsoDateToBr(state.dataIdaEnd) : '...';
      chips.push({ key: 'dataIda', label: `Embarque: ${startBr} a ${endBr}`, icon: '✈️' });
    }

    if (state.dataVoltaStart || state.dataVoltaEnd) {
      const startBr = state.dataVoltaStart ? formatIsoDateToBr(state.dataVoltaStart) : '...';
      const endBr = state.dataVoltaEnd ? formatIsoDateToBr(state.dataVoltaEnd) : '...';
      chips.push({ key: 'dataVolta', label: `Retorno: ${startBr} a ${endBr}`, icon: '🚐' });
    }

    if (state.advMesAno) {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const [y, m] = state.advMesAno.split('-');
      const monthName = months[parseInt(m, 10) - 1] || m;
      chips.push({ key: 'adv-mes-ano', label: `Mês: ${monthName}/${y}`, icon: '📆' });
    }

    state.advConsultores.forEach(cId => {
      const consultor = ctx.consultores.find(c => c.id === cId);
      const nome = consultor?.nome || (cId === ctx.user?.id ? 'Você' : 'Consultor');
      chips.push({ key: `adv-consultor-${cId}`, label: `Consultor: ${nome}`, icon: '👤' });
    });

    state.advFormasRecebimento.forEach(fKey => {
      const forma = ctx.formasRecebimento.find(f => f.id === fKey || f.nome === fKey);
      const label = forma?.nome || fKey;
      chips.push({ key: `adv-forma-${fKey}`, label: `Recebimento: ${label}`, icon: '🪙' });
    });

    state.advOrigensLead.forEach(oKey => {
      const origem = ctx.origensLead.find(o => o.id === oKey || o.nome === oKey);
      const label = origem?.nome || oKey;
      chips.push({ key: `adv-origem-${oKey}`, label: `Origem: ${label}`, icon: '📣' });
    });

    state.advPaxFaixas.forEach(paxKey => {
      const labelMap: Record<string, string> = {
        '1': '1 PAX',
        '2': '2 PAX',
        '3-5': '3 a 5 PAX',
        '6+': '6+ PAX'
      };
      chips.push({ key: `adv-pax-${paxKey}`, label: `PAX: ${labelMap[paxKey] || paxKey}`, icon: '👥' });
    });

    state.advTags.forEach(tag => {
      chips.push({ key: `adv-tag-${tag}`, label: `Tag: ${tag}`, icon: '🏷️' });
    });

    state.advProdutos.forEach(pId => {
      const icon = DashboardFilterBar.getIconForType(pId, ctx.tiposProduto);
      chips.push({ key: `adv-prod-${pId}`, label: `Produto: ${icon} ${pId.toUpperCase()}`, icon: '🏷️' });
    });

    state.advDestinos.forEach(d => {
      chips.push({ key: `adv-dest-${d}`, label: `Destino: ${d}`, icon: '📍' });
    });

    if (state.advFornecedor.trim()) {
      chips.push({ key: 'adv-fornecedor', label: `Fornecedor: "${state.advFornecedor}"`, icon: '🏢' });
    }

    if (state.advValorMin !== null || state.advValorMax !== null) {
      const minStr = state.advValorMin !== null ? `R$ ${state.advValorMin}` : 'R$ 0';
      const maxStr = state.advValorMax !== null ? `R$ ${state.advValorMax}` : '...';
      chips.push({ key: 'adv-valor', label: `Venda: ${minStr} a ${maxStr}`, icon: '💰' });
    }

    if (state.advTarifaMin !== null || state.advTarifaMax !== null) {
      const minStr = state.advTarifaMin !== null ? `R$ ${state.advTarifaMin}` : 'R$ 0';
      const maxStr = state.advTarifaMax !== null ? `R$ ${state.advTarifaMax}` : '...';
      chips.push({ key: 'adv-tarifa-val', label: `Tarifa: ${minStr} a ${maxStr}`, icon: '🏷️' });
    }

    if (state.advTaxaMin !== null || state.advTaxaMax !== null) {
      const minStr = state.advTaxaMin !== null ? `R$ ${state.advTaxaMin}` : 'R$ 0';
      const maxStr = state.advTaxaMax !== null ? `R$ ${state.advTaxaMax}` : '...';
      chips.push({ key: 'adv-taxa-val', label: `Taxas: ${minStr} a ${maxStr}`, icon: '🧾' });
    }

    if (state.advComissaoMin !== null || state.advComissaoMax !== null) {
      const minStr = state.advComissaoMin !== null ? `R$ ${state.advComissaoMin}` : 'R$ 0';
      const maxStr = state.advComissaoMax !== null ? `R$ ${state.advComissaoMax}` : '...';
      chips.push({ key: 'adv-comissao-val', label: `Comissão: ${minStr} a ${maxStr}`, icon: '💰' });
    }

    if (state.advMarkupMin !== null || state.advMarkupMax !== null) {
      const minStr = state.advMarkupMin !== null ? `R$ ${state.advMarkupMin}` : 'R$ 0';
      const maxStr = state.advMarkupMax !== null ? `R$ ${state.advMarkupMax}` : '...';
      chips.push({ key: 'adv-markup-val', label: `Markup: ${minStr} a ${maxStr}`, icon: '💎' });
    }

    if (state.advRavMin !== null || state.advRavMax !== null) {
      const minStr = state.advRavMin !== null ? `R$ ${state.advRavMin}` : 'R$ 0';
      const maxStr = state.advRavMax !== null ? `R$ ${state.advRavMax}` : '...';
      chips.push({ key: 'adv-rav-val', label: `RAV: ${minStr} a ${maxStr}`, icon: '⚡' });
    }

    if (state.advRentabilidadeMin !== null || state.advRentabilidadeMax !== null) {
      const minStr = state.advRentabilidadeMin !== null ? `R$ ${state.advRentabilidadeMin}` : 'R$ 0';
      const maxStr = state.advRentabilidadeMax !== null ? `R$ ${state.advRentabilidadeMax}` : '...';
      chips.push({ key: 'adv-rent', label: `Rentabilidade: ${minStr} a ${maxStr}`, icon: '📈' });
    }

    if (state.advMarkupRav !== 'todos') {
      const labelMap: Record<string, string> = {
        com_markup: 'Com Markup',
        com_rav: 'Com RAV',
        com_markup_ou_rav: 'Markup + RAV (e/ou)',
        com_markup_e_rav: 'Ambos (MKP e RAV)',
        apenas_comissao: 'Apenas Comissão',
        sem_markup_rav: 'Sem MKP/RAV'
      };
      chips.push({ key: 'adv-markup-rav', label: labelMap[state.advMarkupRav] || state.advMarkupRav, icon: '💎' });
    }

    if (state.advAnexos !== 'todos') {
      const labelMap: Record<string, string> = {
        com_anexo: 'Com Anexos',
        sem_anexo: 'Sem Anexos',
        com_voucher: 'Com Voucher Geral',
        sem_voucher: 'Sem Voucher Geral'
      };
      chips.push({ key: 'adv-anexos', label: labelMap[state.advAnexos] || state.advAnexos, icon: '📎' });
    }

    if (state.advSla !== 'todos') {
      chips.push({ key: 'adv-sla', label: state.advSla === 'com_alerta' ? 'Com Alerta SLA' : 'SLA em Dia', icon: '🚨' });
    }

    state.advRiskScore.forEach(r => {
      chips.push({ key: `adv-risk-${r}`, label: `Risco ${r.toUpperCase()}`, icon: '🛡️' });
    });

    if (state.selectedConsultantId !== 'todos') {
      const consultorNome = ctx.consultores.find(c => c.id === state.selectedConsultantId)?.nome || 'Consultor';
      chips.push({ key: 'consultor', label: `Consultor: ${consultorNome}`, icon: '👤' });
    }

    if (state.confFilters.finPendente) chips.push({ key: 'conf-fin-pendente', label: 'Fin. Pendente', icon: '⏳' });
    if (state.confFilters.finOk) chips.push({ key: 'conf-fin-ok', label: 'Fin. OK', icon: '✅' });
    if (state.confFilters.procPendente) chips.push({ key: 'conf-proc-pendente', label: 'Proc. Pendente', icon: '⏳' });
    if (state.confFilters.procOk) chips.push({ key: 'conf-proc-ok', label: 'Proc. OK', icon: '✅' });

    if (state.activeStatusTab !== 'todos') {
      const statusLabels: Record<string, string> = {
        fechado: 'Fechado',
        pos_venda: 'Pós-Venda',
        pre_embarque: 'Pré-Embarque',
        pos_viagem: 'Pós-Viagem',
        reembolso_solicitado: 'Reembolso Solicitado'
      };
      chips.push({ key: 'status', label: `Status: ${statusLabels[state.activeStatusTab] || state.activeStatusTab}`, icon: '🏷️' });
    }

    if (chips.length === 0) return '';

    return `
      <div id="active-filter-chips-bar" class="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-2 animate-fadeIn">
        <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider select-none flex items-center gap-1">
          <span>🎯 Filtros Ativos:</span>
        </span>
        ${chips.map(chip => `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-xs font-bold text-slate-700 dark:text-slate-200 group transition hover:border-indigo-400">
            <span>${chip.icon}</span>
            <span>${chip.label}</span>
            <button type="button" class="btn-remove-filter-chip text-slate-400 hover:text-rose-500 transition p-0.5 ml-0.5 cursor-pointer" data-clear-filter="${chip.key}" title="Remover este filtro">
              ✕
            </button>
          </span>
        `).join('')}
        <button id="btn-clear-all-chips" type="button" class="text-xs font-extrabold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer ml-1">
          Limpar Todos
        </button>
      </div>
    `;
  }

  /**
   * Renderiza as abas de status
   */
  public static renderStatusTabsHTML(counts: DashboardFilterContext['counts'], activeTab: string): string {
    return `
      <div class="px-6 pt-4 bg-slate-50/50 dark:bg-slate-950">
        <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto custom-scrollbar pb-1">
          ${DashboardFilterBar.renderStatusTab('Todos', 'todos', counts.todos, activeTab)}
          ${DashboardFilterBar.renderStatusTab('Fechado', 'fechado', counts.fechado, activeTab)}
          ${DashboardFilterBar.renderStatusTab('Pós-Venda', 'pos_venda', counts.pos_venda, activeTab)}
          ${DashboardFilterBar.renderStatusTab('Pré-Embarque', 'pre_embarque', counts.pre_embarque, activeTab)}
          ${DashboardFilterBar.renderStatusTab('Pós-Viagem', 'pos_viagem', counts.pos_viagem, activeTab)}
          ${DashboardFilterBar.renderStatusTab('Reembolso Solicitado', 'reembolso_solicitado', counts.reembolso_solicitado, activeTab)}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza uma aba individual
   */
  public static renderStatusTab(label: string, statusKey: string, count: number, activeTab: string): string {
    const isActive = activeTab === statusKey;
    const activeClass = isActive
      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-black'
      : 'border-transparent text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 font-bold hover:border-slate-300 dark:hover:border-slate-800';

    return `
      <button class="tab-status-btn shrink-0 whitespace-nowrap px-4 py-3 border-b-2 text-xs transition duration-200 flex items-center gap-1.5 focus:outline-none ${activeClass}" data-status-key="${statusKey}">
        <span>${label}</span>
        <span class="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold">${count}</span>
      </button>
    `;
  }

  /**
   * Conecta todos os eventos dos filtros ao container do Dashboard
   */
  public static attachFilterEvents(container: HTMLElement, handlers: DashboardFilterBarHandlers): void {
    // 0. Switch Mês Corrente vs Ver Tudo
    container.querySelector('#btn-view-month-current')?.addEventListener('click', () => {
      handlers.onSetViewModeMonth('current');
    });

    container.querySelector('#btn-view-month-all')?.addEventListener('click', () => {
      handlers.onSetViewModeMonth('all');
    });

    // 1. Toggle e Recolher Painel Avançado
    container.querySelector('#btn-toggle-filtros')?.addEventListener('click', () => {
      handlers.onToggleFiltersPanel();
    });

    container.querySelector('#btn-collapse-adv-panel')?.addEventListener('click', () => {
      handlers.onCollapseFiltersPanel();
    });

    // 2. Exportar CSV
    container.querySelector('#btn-export-filtered-csv')?.addEventListener('click', () => {
      handlers.onExportCsv();
    });

    // 3. Select Consultor
    const selectConsultor = container.querySelector('#select-dashboard-consultor') as HTMLSelectElement;
    selectConsultor?.addEventListener('change', () => {
      handlers.onSelectConsultor(selectConsultor.value);
    });

    // 4. Nova Viagem
    container.querySelector('#btn-nova-viagem')?.addEventListener('click', () => {
      handlers.onNovaViagem();
    });

    // 5. Abas de Status
    container.querySelectorAll('.tab-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const statusKey = btn.getAttribute('data-status-key');
        if (statusKey) handlers.onSelectStatusTab(statusKey);
      });
    });

    // 6. Popover de Conferência
    const btnToggleConf = container.querySelector('#btn-toggle-conf-popover');
    btnToggleConf?.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onToggleConfPopover();
    });

    container.querySelector('#pill-conf-fin-pendente')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onToggleConfFilter('finPendente');
    });

    container.querySelector('#pill-conf-fin-ok')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onToggleConfFilter('finOk');
    });

    container.querySelector('#pill-conf-proc-pendente')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onToggleConfFilter('procPendente');
    });

    container.querySelector('#pill-conf-proc-ok')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onToggleConfFilter('procOk');
    });

    container.querySelector('#btn-conf-atalho-100')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onConfAtalho100();
    });

    container.querySelector('#btn-conf-atalho-nenhum')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onConfAtalhoNenhum();
    });

    container.querySelector('#btn-conf-limpar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onConfLimpar();
    });

    // Fechar Popover de Conferência ao clicar fora
    const popoverEl = container.querySelector('#popover-conf-filter');
    if (popoverEl && !popoverEl.classList.contains('hidden')) {
      const popoverContainer = container.querySelector('#container-conf-popover');
      const handleOutsideConfClick = (e: MouseEvent) => {
        if (popoverContainer && !popoverContainer.contains(e.target as Node)) {
          handlers.onCloseConfPopover();
        }
      };
      setTimeout(() => {
        document.addEventListener('click', handleOutsideConfClick, { once: true });
      }, 50);
    }

    // 7. Inputs de Datas
    const bindDate = (id: string, prop: string) => {
      const el = container.querySelector(`#${id}`) as HTMLInputElement;
      el?.addEventListener('change', () => {
        const raw = el.value.trim();
        const iso = raw ? (formatBrDateToIso(raw) || raw) : '';
        handlers.onDateFilterChange(prop, iso);
      });
    };

    bindDate('filter-fin-start', 'dataFinStart');
    bindDate('filter-fin-end', 'dataFinEnd');
    bindDate('filter-ida-start', 'dataIdaStart');
    bindDate('filter-ida-end', 'dataIdaEnd');
    bindDate('filter-volta-start', 'dataVoltaStart');
    bindDate('filter-volta-end', 'dataVoltaEnd');

    // 8. Select Mês/Ano, Destino, Fornecedor
    const selectMesAno = container.querySelector('#filter-adv-mes-ano') as HTMLSelectElement;
    selectMesAno?.addEventListener('change', () => {
      handlers.onAdvMesAnoChange(selectMesAno.value);
    });

    const selectDest = container.querySelector('#filter-adv-destino') as HTMLSelectElement;
    selectDest?.addEventListener('change', () => {
      handlers.onAdvDestinoChange(selectDest.value);
    });

    const inputForn = container.querySelector('#filter-adv-fornecedor') as HTMLInputElement;
    inputForn?.addEventListener('change', () => {
      handlers.onAdvFornecedorChange(inputForn.value.trim());
    });

    // 9. Faixas Financeiras Numéricas
    const bindNumeric = (id: string, prop: string) => {
      const el = container.querySelector(`#${id}`) as HTMLInputElement;
      el?.addEventListener('change', () => {
        const val = el.value ? parseFloat(el.value) : null;
        handlers.onNumericFilterChange(prop, isNaN(val as number) ? null : val);
      });
    };

    bindNumeric('filter-adv-valor-min', 'advValorMin');
    bindNumeric('filter-adv-valor-max', 'advValorMax');
    bindNumeric('filter-adv-tarifa-min', 'advTarifaMin');
    bindNumeric('filter-adv-tarifa-max', 'advTarifaMax');
    bindNumeric('filter-adv-taxa-min', 'advTaxaMin');
    bindNumeric('filter-adv-taxa-max', 'advTaxaMax');
    bindNumeric('filter-adv-comissao-min', 'advComissaoMin');
    bindNumeric('filter-adv-comissao-max', 'advComissaoMax');
    bindNumeric('filter-adv-markup-min', 'advMarkupMin');
    bindNumeric('filter-adv-markup-max', 'advMarkupMax');
    bindNumeric('filter-adv-rav-min', 'advRavMin');
    bindNumeric('filter-adv-rav-max', 'advRavMax');
    bindNumeric('filter-adv-rent-min', 'advRentabilidadeMin');
    bindNumeric('filter-adv-rent-max', 'advRentabilidadeMax');

    container.querySelector('#btn-clear-adv-financas')?.addEventListener('click', () => {
      handlers.onClearAdvFinancas();
    });

    // 10. Toggle Match Mode (E vs OU)
    container.querySelector('#btn-match-mode-and')?.addEventListener('click', () => {
      handlers.onToggleMatchMode('AND');
    });
    container.querySelector('#btn-match-mode-or')?.addEventListener('click', () => {
      handlers.onToggleMatchMode('OR');
    });

    // 11. Pills de Markup & RAV
    container.querySelectorAll('.pill-adv-markup-rav').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-markup-rav-val');
        if (val) handlers.onToggleMarkupRav(val);
      });
    });

    // 12. Pills de Produtos
    container.querySelectorAll('.pill-adv-produto').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-prod-id');
        if (pId) handlers.onToggleAdvProduto(pId);
      });
    });
    container.querySelector('#btn-clear-adv-produtos')?.addEventListener('click', () => {
      handlers.onClearAdvProdutos();
    });

    // 13. Pills de Consultores
    container.querySelectorAll('.pill-adv-consultor').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-consultant-id');
        if (cId) handlers.onToggleAdvConsultor(cId);
      });
    });
    container.querySelector('#btn-clear-adv-consultores')?.addEventListener('click', () => {
      handlers.onClearAdvConsultores();
    });

    // 14. Pills de Formas de Recebimento
    container.querySelectorAll('.pill-adv-forma').forEach(btn => {
      btn.addEventListener('click', () => {
        const fKey = btn.getAttribute('data-forma-id') || btn.getAttribute('data-forma-nome');
        if (fKey) handlers.onToggleAdvForma(fKey);
      });
    });
    container.querySelector('#btn-clear-adv-formas')?.addEventListener('click', () => {
      handlers.onClearAdvFormas();
    });

    // 15. Pills de Origem do Lead
    container.querySelectorAll('.pill-adv-origem').forEach(btn => {
      btn.addEventListener('click', () => {
        const oKey = btn.getAttribute('data-origem-id') || btn.getAttribute('data-origem-nome');
        if (oKey) handlers.onToggleAdvOrigem(oKey);
      });
    });

    // 16. Pills de Faixas de PAX
    container.querySelectorAll('.pill-adv-pax').forEach(btn => {
      btn.addEventListener('click', () => {
        const paxKey = btn.getAttribute('data-pax-key');
        if (paxKey) handlers.onToggleAdvPax(paxKey);
      });
    });

    // 17. Pills de Tags
    container.querySelectorAll('.pill-adv-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const tagName = btn.getAttribute('data-tag-name');
        if (tagName) handlers.onToggleAdvTag(tagName);
      });
    });
    container.querySelector('#btn-clear-adv-tags')?.addEventListener('click', () => {
      handlers.onClearAdvTags();
    });

    // 18. Pills de Anexos
    container.querySelectorAll('.pill-adv-anexo').forEach(btn => {
      btn.addEventListener('click', () => {
        const anexoVal = btn.getAttribute('data-anexo-val');
        if (anexoVal) handlers.onToggleAdvAnexo(anexoVal);
      });
    });

    // 19. Pills de SLA
    container.querySelectorAll('.pill-adv-sla-alerta').forEach(btn => {
      btn.addEventListener('click', () => {
        const slaVal = btn.getAttribute('data-sla-val');
        if (slaVal) handlers.onToggleAdvSla(slaVal);
      });
    });

    // 20. Pills de Risk Score
    container.querySelectorAll('.pill-adv-risk').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = btn.getAttribute('data-risk-level');
        if (level) handlers.onToggleAdvRisk(level);
      });
    });

    // 21. Pills de Conferência no Painel Avançado
    container.querySelectorAll('.pill-adv-conf-fin-ok').forEach(btn => {
      btn.addEventListener('click', () => handlers.onToggleConfFilter('finOk'));
    });
    container.querySelectorAll('.pill-adv-conf-fin-pendente').forEach(btn => {
      btn.addEventListener('click', () => handlers.onToggleConfFilter('finPendente'));
    });
    container.querySelectorAll('.pill-adv-conf-proc-ok').forEach(btn => {
      btn.addEventListener('click', () => handlers.onToggleConfFilter('procOk'));
    });
    container.querySelectorAll('.pill-adv-conf-proc-pendente').forEach(btn => {
      btn.addEventListener('click', () => handlers.onToggleConfFilter('procPendente'));
    });

    // 22. Limpar Todos os Filtros
    container.querySelector('#btn-clear-date-filters')?.addEventListener('click', () => handlers.onResetAllFilters());
    container.querySelector('#btn-clear-all-adv-filters')?.addEventListener('click', () => handlers.onResetAllFilters());
    container.querySelector('#btn-clear-all-chips')?.addEventListener('click', () => handlers.onResetAllFilters());

    // 23. Chips Individuais de Remoção
    container.querySelectorAll('[data-clear-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filterKey = btn.getAttribute('data-clear-filter');
        if (filterKey) handlers.onRemoveSingleFilter(filterKey);
      });
    });
  }
}
