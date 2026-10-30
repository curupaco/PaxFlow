import { formatBrDateToIso, formatIsoDateToBr } from '../../../utils/masks';

export type RelatorioTab =
  | 'desempenho'
  | 'prazos'
  | 'faturamento'
  | 'perdas'
  | 'previsoes'
  | 'origens'
  | 'auditoria'
  | 'posvenda'
  | 'gamificacao'
  | 'embarques'
  | 'riscopreditivo'
  | 'metas_campanhas'
  | 'segmentacao_campanhas'
  | 'satisfacao';

export interface RelatoriosShellParams {
  activeTab: RelatorioTab;
  menuLateralRecolhido: boolean;
  collapsedGroups: { [key: string]: boolean };
  dataInicio: string;
  dataFim: string;
  consultorIdFilter: string;
  consultores: Array<{ id: string; nome: string }>;
  isAdmin: boolean;
  perfilNome?: string;
  contentHtml: string;
}

export interface RelatoriosShellHandlers {
  onToggleMenuLateral: () => void;
  onToggleGroup: (group: string) => void;
  onSelectTab: (tab: RelatorioTab) => void;
  onApplyFilters: (dataInicio: string, dataFim: string, consultorId: string) => void;
  onClearFilters: () => void;
  onExportCsv: () => void;
  onPrintPdf: () => void;
}

export class RelatoriosShellView {
  public static renderShell(params: RelatoriosShellParams): string {
    const {
      activeTab,
      menuLateralRecolhido,
      collapsedGroups,
      dataInicio,
      dataFim,
      consultorIdFilter,
      consultores,
      isAdmin,
      perfilNome,
      contentHtml
    } = params;

    const dataInicioFmt = dataInicio ? (dataInicio.includes('-') ? formatIsoDateToBr(dataInicio) : dataInicio) : '';
    const dataFimFmt = dataFim ? (dataFim.includes('-') ? formatIsoDateToBr(dataFim) : dataFim) : '';

    return `
      <div class="flex-grow flex flex-col overflow-y-auto custom-scrollbar p-6 max-w-full w-full xl:px-8 mx-auto gap-6 print-full-width">
        
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
            <button id="btn-export-csv" class="w-full sm:w-auto px-4 h-[42px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
              📥 Exportar Excel (CSV)
            </button>
            <button id="btn-print-pdf" class="w-full sm:w-auto px-4 h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer">
              🖨️ Imprimir PDF
            </button>
          </div>
        </div>

        <!-- Global Filters Bar (sticky/sticky-top) -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-end gap-4 global-filters-bar no-print">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:flex items-end gap-4 flex-grow w-full md:w-auto">
            <!-- Date range start -->
            <div class="space-y-1 flex-1">
              <label class="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Data Início</label>
              <input id="filter-data-inicio" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${dataInicioFmt}" class="date-input w-full text-xs font-bold px-3 py-2.5 h-[42px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold transition duration-155" />
              <p id="filter-data-inicio-error" class="hidden text-xs text-rose-500 font-bold mt-1.5"></p>
            </div>

            <!-- Date range end -->
            <div class="space-y-1 flex-1">
              <label class="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Data Fim</label>
              <input id="filter-data-fim" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${dataFimFmt}" class="date-input w-full text-xs font-bold px-3 py-2.5 h-[42px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold transition duration-155" />
              <p id="filter-data-fim-error" class="hidden text-xs text-rose-500 font-bold mt-1.5"></p>
            </div>

            <!-- Team / Consultant filter -->
            ${isAdmin ? `
              <div class="space-y-1 flex-1">
                <label class="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Consultor / Equipe</label>
                <select id="filter-consultores" class="w-full text-xs font-bold px-3.5 py-2.5 h-[42px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold transition duration-155">
                  <option value="todos" ${consultorIdFilter === 'todos' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Consolidado (Todos os Consultores)</option>
                  ${consultores.map(c => `<option value="${c.id}" ${consultorIdFilter === c.id ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${c.nome}</option>`).join('')}
                </select>
              </div>
            ` : `
              <div class="space-y-1 flex-1">
                <label class="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Escopo dos Indicadores</label>
                <div class="w-full text-xs font-black px-3.5 py-2.5 border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl text-indigo-700 dark:text-indigo-300 flex items-center gap-2 select-none shadow-sm h-[42px]">
                  <span>👤</span>
                  <span class="truncate">Seus Dados (${perfilNome || 'Consultor'})</span>
                </div>
              </div>
            `}
          </div>
          
          <div class="flex items-center gap-2 flex-shrink-0">
            <button id="btn-limpar-filtros" class="px-4 h-[42px] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black rounded-xl transition flex items-center justify-center shadow-xs flex-shrink-0 cursor-pointer">
              Limpar
            </button>
            <button id="btn-aplicar-filtros" class="px-5 h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-md shadow-indigo-600/15 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer">
              🔍 Aplicar
            </button>
          </div>
        </div>

        <!-- Seletor Rápido de Relatórios para Dispositivos Móveis (Visível apenas em < lg) -->
        <div class="block lg:hidden w-full no-print">
          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-sm flex flex-col gap-1.5">
            <label for="select-relatorio-mobile" class="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span class="flex items-center gap-1.5">📑 Selecionar Relatório</span>
              <span class="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">Mobile</span>
            </label>
            <div class="relative w-full">
              <select id="select-relatorio-mobile" class="w-full h-[42px] pl-3.5 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition appearance-none cursor-pointer">
                <optgroup label="💼 GESTÃO COMERCIAL">
                  <option value="desempenho" ${activeTab === 'desempenho' ? 'selected' : ''}>🎯 Desempenho e Produtividade</option>
                  <option value="segmentacao_campanhas" ${activeTab === 'segmentacao_campanhas' ? 'selected' : ''}>🚀 Campanhas & Segmentação</option>
                  <option value="metas_campanhas" ${activeTab === 'metas_campanhas' ? 'selected' : ''}>🏆 Metas & Campanhas</option>
                  <option value="origens" ${activeTab === 'origens' ? 'selected' : ''}>📢 Origem de Leads</option>
                  <option value="previsoes" ${activeTab === 'previsoes' ? 'selected' : ''}>🔮 Previsões Preditivas</option>
                  <option value="riscopreditivo" ${activeTab === 'riscopreditivo' ? 'selected' : ''}>🚨 Previsão de Risco & Churn</option>
                </optgroup>
                <optgroup label="💰 FINANCEIRO & AUDITORIA">
                  <option value="faturamento" ${activeTab === 'faturamento' ? 'selected' : ''}>💰 Faturamento</option>
                  <option value="auditoria" ${activeTab === 'auditoria' ? 'selected' : ''}>🪙 Recebimentos & Auditoria</option>
                  <option value="perdas" ${activeTab === 'perdas' ? 'selected' : ''}>📉 Desistências & Perdas</option>
                </optgroup>
                <optgroup label="✈️ OPERAÇÕES & SLAS">
                  <option value="prazos" ${activeTab === 'prazos' ? 'selected' : ''}>⏰ Controle de SLAs</option>
                  <option value="posvenda" ${activeTab === 'posvenda' ? 'selected' : ''}>✈️ Pós-Venda & SLAs</option>
                  <option value="satisfacao" ${activeTab === 'satisfacao' ? 'selected' : ''}>⭐ Pesquisa de Satisfação (NPS)</option>
                  <option value="embarques" ${activeTab === 'embarques' ? 'selected' : ''}>🛫 Relatório de Embarques e Voos</option>
                </optgroup>
                <optgroup label="👥 GESTÃO DE EQUIPE">
                  <option value="gamificacao" ${activeTab === 'gamificacao' ? 'selected' : ''}>🏆 Gamificação & Ranking</option>
                </optgroup>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Dashboard Workspace (Collapsible Left Menu & Dynamic Data Pane) -->
        <div class="flex flex-col lg:flex-row gap-6 items-start w-full print-full-width">
          
          <!-- Navigation Sidebar (Full vs Mini-Bar mode - visível apenas em telas grandes lg+) -->
          ${menuLateralRecolhido ? `
            <!-- Mini-Bar Recolhida (Economia máxima de espaço) -->
            <div class="hidden lg:flex w-16 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl py-3 px-2 shadow-sm flex-col items-center gap-2 report-tabs-bar no-print flex-shrink-0 transition-all duration-200">
              <button id="btn-toggle-menu-lateral-relatorios" title="Expandir menu de relatórios" class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center justify-center transition mb-1 text-sm font-black border border-slate-200/60 dark:border-slate-700/60 shadow-xs cursor-pointer">
                ❯
              </button>

              <!-- Grupo Comercial (Mini) -->
              <div class="flex flex-col items-center gap-1 w-full">
                <button data-tab="desempenho" title="Gestão Comercial: Desempenho e Produtividade" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'desempenho' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  🎯
                </button>
                <button data-tab="segmentacao_campanhas" title="Gestão Comercial: Campanhas & Segmentação" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'segmentacao_campanhas' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  🚀
                </button>
                <button data-tab="metas_campanhas" title="Gestão Comercial: Metas & Campanhas" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'metas_campanhas' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  🏆
                </button>
                <button data-tab="origens" title="Gestão Comercial: Origem de Leads" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'origens' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  📢
                </button>
                <button data-tab="previsoes" title="Gestão Comercial: Previsões Preditivas" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'previsoes' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  🔮
                </button>
                <button data-tab="riscopreditivo" title="Gestão Comercial: Previsão de Risco & Churn" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'riscopreditivo' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  🚨
                </button>
              </div>

              <!-- Linha divisória sutil -->
              <div class="w-7 h-[1px] bg-slate-200 dark:bg-slate-800 my-1"></div>

              <!-- Grupo Financeiro (Mini) -->
              <div class="flex flex-col items-center gap-1 w-full">
                <button data-tab="faturamento" title="Financeiro & Auditoria: Faturamento" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'faturamento' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  💰
                </button>
                <button data-tab="auditoria" title="Financeiro & Auditoria: Recebimentos & Auditoria" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'auditoria' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  🪙
                </button>
                <button data-tab="perdas" title="Financeiro & Auditoria: Desistências & Perdas" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'perdas' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  📉
                </button>
              </div>

              <!-- Linha divisória sutil -->
              <div class="w-7 h-[1px] bg-slate-200 dark:bg-slate-800 my-1"></div>

              <!-- Grupo Operações (Mini) -->
              <div class="flex flex-col items-center gap-1 w-full">
                <button data-tab="prazos" title="Operações & SLAs: Controle de SLAs" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'prazos' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  ⏰
                </button>
                <button data-tab="posvenda" title="Operações & SLAs: Pós-Venda & SLAs" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'posvenda' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  ✈️
                </button>
                <button data-tab="satisfacao" title="Operações & SLAs: Pesquisa de Satisfação (NPS)" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'satisfacao' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  ⭐
                </button>
                <button data-tab="embarques" title="Operações & SLAs: Relatório de Embarque e Trechos de Voo" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'embarques' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  🛫
                </button>
              </div>

              <!-- Linha divisória sutil -->
              <div class="w-7 h-[1px] bg-slate-200 dark:bg-slate-800 my-1"></div>

              <!-- Grupo Equipe (Mini) -->
              <div class="flex flex-col items-center gap-1 w-full">
                <button data-tab="gamificacao" title="Gestão de Equipe: Gamificação & Ranking" class="w-10 h-10 rounded-xl flex items-center justify-center text-base transition ${activeTab === 'gamificacao' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-xs ring-2 ring-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  🏆
                </button>
              </div>
            </div>
          ` : `
            <!-- Menu Lateral Completo Expandido -->
            <div class="hidden lg:flex lg:w-64 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex-col gap-4 report-tabs-bar no-print flex-shrink-0 transition-all duration-200">
              
              <!-- Cabeçalho do menu com botão de recolher -->
              <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span class="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  📑 Relatórios
                </span>
                <button id="btn-toggle-menu-lateral-relatorios" title="Recolher menu para ganhar mais espaço de visualização" class="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition text-xs font-black cursor-pointer">
                  ❮
                </button>
              </div>

              <!-- Grupo 1: Gestão Comercial -->
              <div class="space-y-1">
                <button class="report-group-header w-full flex items-center justify-between px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none cursor-pointer" data-group="comercial">
                  <span class="flex items-center gap-1.5">💼 Gestão Comercial</span>
                  <svg class="w-3.5 h-3.5 transition-transform duration-200 ${collapsedGroups.comercial ? '' : 'transform rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div class="space-y-1 pl-1 transition-all ${collapsedGroups.comercial ? 'hidden' : ''}">
                  <button data-tab="desempenho" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'desempenho' ? 'report-tab-active' : 'text-slate-500'}">
                    🎯 Desempenho
                  </button>
                  <button data-tab="segmentacao_campanhas" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'segmentacao_campanhas' ? 'report-tab-active' : 'text-slate-500'}">
                    🚀 Campanhas & Segmentação
                  </button>
                  <button data-tab="metas_campanhas" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'metas_campanhas' ? 'report-tab-active' : 'text-slate-500'}">
                    🏆 Metas & Campanhas
                  </button>
                  <button data-tab="origens" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'origens' ? 'report-tab-active' : 'text-slate-500'}">
                    📢 Origem de Leads
                  </button>
                  <button data-tab="previsoes" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'previsoes' ? 'report-tab-active' : 'text-slate-500'}">
                    🔮 Previsões Preditivas
                  </button>
                  <button data-tab="riscopreditivo" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'riscopreditivo' ? 'report-tab-active' : 'text-slate-500'}">
                    🚨 Previsão de Risco & Churn
                  </button>
                </div>
              </div>

              <!-- Grupo 2: Financeiro & Auditoria -->
              <div class="space-y-1">
                <button class="report-group-header w-full flex items-center justify-between px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none cursor-pointer" data-group="financeiro">
                  <span class="flex items-center gap-1.5">🪙 Financeiro & Auditoria</span>
                  <svg class="w-3.5 h-3.5 transition-transform duration-200 ${collapsedGroups.financeiro ? '' : 'transform rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div class="space-y-1 pl-1 transition-all ${collapsedGroups.financeiro ? 'hidden' : ''}">
                  <button data-tab="faturamento" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'faturamento' ? 'report-tab-active' : 'text-slate-500'}">
                    💰 Faturamento
                  </button>
                  <button data-tab="auditoria" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'auditoria' ? 'report-tab-active' : 'text-slate-500'}">
                    🪙 Recebimentos & Auditoria
                  </button>
                  <button data-tab="perdas" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'perdas' ? 'report-tab-active' : 'text-slate-500'}">
                    📉 Desistências & Perdas
                  </button>
                </div>
              </div>

              <!-- Grupo 3: Operações & SLAs -->
              <div class="space-y-1">
                <button class="report-group-header w-full flex items-center justify-between px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none cursor-pointer" data-group="operacional">
                  <span class="flex items-center gap-1.5">⚙️ Operações & SLAs</span>
                  <svg class="w-3.5 h-3.5 transition-transform duration-200 ${collapsedGroups.operacional ? '' : 'transform rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div class="space-y-1 pl-1 transition-all ${collapsedGroups.operacional ? 'hidden' : ''}">
                  <button data-tab="prazos" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'prazos' ? 'report-tab-active' : 'text-slate-500'}">
                    ⏰ Controle de SLAs
                  </button>
                  <button data-tab="posvenda" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'posvenda' ? 'report-tab-active' : 'text-slate-500'}">
                    ✈️ Pós-Venda & SLAs
                  </button>
                  <button data-tab="satisfacao" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'satisfacao' ? 'report-tab-active' : 'text-slate-500'}">
                    ⭐ Pesquisa de Satisfação (NPS)
                  </button>
                  <button data-tab="embarques" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'embarques' ? 'report-tab-active' : 'text-slate-500'}">
                    🛫 Relatório de Embarque
                  </button>
                </div>
              </div>

              <!-- Grupo 4: Gestão de Equipe -->
              <div class="space-y-1">
                <button class="report-group-header w-full flex items-center justify-between px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none cursor-pointer" data-group="equipe">
                  <span class="flex items-center gap-1.5">👥 Gestão de Equipe</span>
                  <svg class="w-3.5 h-3.5 transition-transform duration-200 ${collapsedGroups.equipe ? '' : 'transform rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div class="space-y-1 pl-1 transition-all ${collapsedGroups.equipe ? 'hidden' : ''}">
                  <button data-tab="gamificacao" class="w-full text-left px-3 py-2 rounded-xl text-xs font-black transition select-none flex items-center gap-2 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeTab === 'gamificacao' ? 'report-tab-active' : 'text-slate-500'}">
                    🏆 Gamificação & Ranking
                  </button>
                </div>
              </div>

            </div>
          `}

          <!-- Main View Pane (Detail content com flex-1 min-w-0 para ocupar toda a largura liberada) -->
          <div class="flex-1 min-w-0 w-full space-y-6 print-full-width" id="report-view-container">
            ${contentHtml}
          </div>

        </div>

      </div>
    `;
  }

  public static attachShellEvents(container: HTMLElement, handlers: RelatoriosShellHandlers): void {
    // 0. Toggle de recolhimento do menu lateral
    container.querySelector('#btn-toggle-menu-lateral-relatorios')?.addEventListener('click', () => {
      handlers.onToggleMenuLateral();
    });

    // 1. Collapsible category headers
    const groupHeaders = container.querySelectorAll('.report-group-header');
    groupHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = header.getAttribute('data-group');
        if (group) {
          handlers.onToggleGroup(group);
        }
      });
    });

    // 2. Tab switches (Desktop sidebar buttons)
    const tabButtons = container.querySelectorAll('.report-tabs-bar button[data-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as RelatorioTab;
        if (tab) {
          handlers.onSelectTab(tab);
        }
      });
    });

    // 2.1 Tab switches (Mobile select dropdown)
    const selectRelatorioMobile = container.querySelector('#select-relatorio-mobile') as HTMLSelectElement | null;
    selectRelatorioMobile?.addEventListener('change', () => {
      const tab = selectRelatorioMobile.value as RelatorioTab;
      if (tab) {
        handlers.onSelectTab(tab);
      }
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

      const dataInicioIso = formatBrDateToIso(valInicio) || valInicio;
      const dataFimIso = formatBrDateToIso(valFim) || valFim;
      const consultorId = selectConsultorVal || '';

      handlers.onApplyFilters(dataInicioIso, dataFimIso, consultorId);
    });

    // 4. Clear filters
    document.getElementById('btn-limpar-filtros')?.addEventListener('click', () => {
      handlers.onClearFilters();
    });

    // 5. Export CSV button
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      handlers.onExportCsv();
    });

    // 6. Print PDF button
    document.getElementById('btn-print-pdf')?.addEventListener('click', () => {
      handlers.onPrintPdf();
    });
  }
}
