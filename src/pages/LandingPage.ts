export class LandingPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public init(): void {
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col relative overflow-hidden transition-colors duration-300">
        
        <!-- Background Decorative Gradients -->
        <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 dark:bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div class="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] bg-emerald-500/5 dark:bg-emerald-900/10 rounded-full blur-[150px] pointer-events-none"></div>

        <!-- Top Header Navigation -->
        <header class="w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-9 w-9 object-contain filter drop-shadow-md shrink-0" />
            <span class="text-lg font-black text-slate-800 dark:text-white tracking-tight">PaxFlow</span>
          </div>
          <div class="flex items-center gap-4">
            <!-- Theme Toggle Button -->
            <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
              <svg width="18" height="18" class="w-4.5 h-4.5 theme-icon-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg width="18" height="18" class="w-4.5 h-4.5 theme-icon-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button id="btn-acessar-login" class="px-5 py-2.5 bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 dark:hover:bg-slate-750 text-white font-extrabold text-xs tracking-wider rounded-xl border border-slate-700 hover:border-slate-600 transition uppercase shadow-inner">
              Acessar Plataforma
            </button>
          </div>
        </header>

        <!-- Hero Section -->
        <main class="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center max-w-5xl mx-auto relative z-10">
          
          <!-- Badge -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest rounded-full mb-6">
            <span>✨</span> Apresentação Comercial PaxFlow
          </div>

          <!-- Headline -->
          <h1 class="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6 text-slate-900 dark:text-white">
            O Controle Operacional que Sua <br class="hidden md:block"/>
            <span class="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 dark:from-indigo-400 dark:via-indigo-500 dark:to-emerald-400 bg-clip-text text-transparent">Agência de Viagens</span> Precisa
          </h1>

          <!-- Subtitle -->
          <p class="text-base md:text-xl text-slate-600 dark:text-slate-400 font-medium max-w-3xl mb-10 leading-relaxed">
            Elimine planilhas paralelas. Gerencie pós-vendas, automatize alertas de SLA de passaportes, controle reembolsos de forma integrada e acompanhe a rentabilidade em tempo real.
          </p>

          <!-- CTAs -->
          <div class="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full justify-center">
            <button id="btn-iniciar-demo" class="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm tracking-widest rounded-2xl shadow-xl shadow-indigo-600/25 transition-all transform hover:-translate-y-1 uppercase flex items-center justify-center gap-2">
              <span>🚀</span> Experimentar PaxFlow (Modo Demo)
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-extrabold text-sm tracking-widest rounded-2xl border border-slate-200 dark:border-slate-850 transition-all transform hover:-translate-y-1 uppercase shadow-sm">
              Entrar no Sistema Real
            </button>
          </div>

          <!-- Feature Explorer / Interactive Tour Tabs -->
          <div class="w-full mb-8">
            <h2 class="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight mb-4">
              Explore a Plataforma por Dentro
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-6">
              Navegue pelas abas abaixo para ver como cada módulo simplifica seu fluxo de trabalho:
            </p>
            
            <div class="flex flex-wrap justify-center gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl max-w-3xl mx-auto backdrop-blur-md">
              <button id="tab-btn-dashboard" class="px-4 py-2 text-[11px] font-black tracking-wider uppercase rounded-xl transition duration-200 bg-indigo-600 text-white shadow-md">
                📊 Dashboard
              </button>
              <button id="tab-btn-viagens" class="px-4 py-2 text-[11px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                ✈️ Viagens
              </button>
              <button id="tab-btn-orcamentos" class="px-4 py-2 text-[11px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                📋 Orçamentos
              </button>
              <button id="tab-btn-inbox" class="px-4 py-2 text-[11px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                💬 Inbox & SLAs
              </button>
              <button id="tab-btn-reembolsos" class="px-4 py-2 text-[11px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                💰 Reembolsos
              </button>
              <button id="tab-btn-gamificacao" class="px-4 py-2 text-[11px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                🪐 Gamificação
              </button>
            </div>
          </div>

          <!-- Interactive UI Dashboard Mockup -->
          <div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 md:p-6 text-left relative overflow-hidden backdrop-blur-md transition-colors duration-300">
            
            <!-- Window header -->
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 bg-rose-500 rounded-full"></span>
                <span class="w-3 h-3 bg-amber-500 rounded-full"></span>
                <span class="w-3 h-3 bg-emerald-500 rounded-full"></span>
                <span id="window-path-text" class="text-[10px] text-slate-400 dark:text-slate-500 font-bold ml-2">paxflow-comercial-dashboard.html</span>
              </div>
              <div class="flex gap-2">
                <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-[9px] rounded-lg">DEMO INTERATIVA</span>
              </div>
            </div>

            <!-- Content Panels -->
            <div id="mockup-panels-container">
              
              <!-- PANEL 1: DASHBOARD -->
              <div id="panel-dashboard" class="space-y-4 tab-pane-transition">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl">
                    <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Faturamento Mensal</span>
                    <div class="flex items-baseline gap-2 mt-1">
                      <span class="text-xl font-black text-slate-800 dark:text-white">R$ 148.500,00</span>
                      <span class="text-[10px] text-emerald-500 font-extrabold">+14.2%</span>
                    </div>
                  </div>
                  <div class="bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl">
                    <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Taxa de Conversão</span>
                    <div class="flex items-baseline gap-2 mt-1">
                      <span class="text-xl font-black text-indigo-600 dark:text-indigo-400">24,8%</span>
                      <span class="text-[10px] text-slate-500 font-medium">Média de 2026</span>
                    </div>
                  </div>
                  <div class="bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl">
                    <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ticket Médio</span>
                    <div class="flex items-baseline gap-2 mt-1">
                      <span class="text-xl font-black text-emerald-600 dark:text-emerald-400">R$ 6.200,00</span>
                      <span class="text-[10px] text-slate-500">Por Viagem</span>
                    </div>
                  </div>
                </div>

                <div class="bg-slate-100/30 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4">
                  <div class="flex items-center justify-between mb-4 border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
                    <span class="text-xs font-black text-slate-700 dark:text-slate-300">Funil Comercial Operativo</span>
                    <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-lg">Dados em Tempo Real</span>
                  </div>
                  
                  <div class="space-y-2.5">
                    <div>
                      <div class="flex justify-between text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                        <span>Orçamentos Criados</span>
                        <span>120</span>
                      </div>
                      <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div class="bg-indigo-600 h-full w-[100%] rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <div class="flex justify-between text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                        <span>Propostas Enviadas</span>
                        <span>75 (62%)</span>
                      </div>
                      <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div class="bg-indigo-500 h-full w-[62%] rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <div class="flex justify-between text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                        <span>Negociações Fechadas</span>
                        <span>24 (20%)</span>
                      </div>
                      <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div class="bg-emerald-500 h-full w-[20%] rounded-full"></div>
                      </div>
                    </div>
                  </div>
                     <!-- PANEL 2: VIAGENS -->
              <div id="panel-viagens" class="space-y-4 tab-pane-transition hidden">
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                  <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-[700px] text-[11px]">
                      <thead>
                        <tr class="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <th class="px-4 py-3 w-[50px] text-center">SLA</th>
                          <th class="px-4 py-3">Cliente / LOC</th>
                          <th class="px-4 py-3">Destino / Produtos</th>
                          <th class="px-4 py-3">Período</th>
                          <th class="px-4 py-3">Data Fin.</th>
                          <th class="px-4 py-3">Financeiro</th>
                          <th class="px-4 py-3 w-[140px]">Fase / Status</th>
                          <th class="px-4 py-3 w-[120px] text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                        <!-- Linha 1: Carlos Eduardo (SLA Alerta) -->
                        <tr class="bg-rose-50/10 dark:bg-rose-950/5 hover:bg-rose-50/20 dark:hover:bg-rose-950/10 transition-colors duration-200">
                          <td class="px-4 py-3 text-center"><span class="text-sm">⚠️</span></td>
                          <td class="px-4 py-3">
                            <div class="font-black text-slate-800 dark:text-slate-150">Carlos Eduardo</div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[8px] rounded border border-slate-200/40 dark:border-slate-700/50 uppercase">BA921</span>
                          </td>
                          <td class="px-4 py-3">
                            <div class="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">✈️ Buenos Aires</div>
                            <div class="flex gap-1 mt-1">
                              <span class="px-1.5 py-0.5 rounded bg-slate-100/65 dark:bg-slate-800/65 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">✈️</span>
                            </div>
                          </td>
                          <td class="px-4 py-3 whitespace-nowrap">
                            <span class="flex items-center gap-1">📅 12/08/2026 a 19/08/2026</span>
                          </td>
                          <td class="px-4 py-3 text-slate-500 dark:text-slate-400">15/05/2026</td>
                          <td class="px-4 py-3">
                            <div class="font-black text-indigo-600 dark:text-indigo-400">R$ 5.400,00</div>
                            <div class="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">Rent: R$ 800,00</div>
                          </td>
                          <td class="px-4 py-3">
                            <span class="inline-flex px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase">Pré-Embarque</span>
                          </td>
                          <td class="px-4 py-3 text-center">
                            <button class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black rounded-lg border border-indigo-100/30 dark:border-indigo-900/30 text-[9px] uppercase transition" disabled>🔍 Detalhes</button>
                          </td>
                        </tr>
                        
                        <!-- Linha 2: Mariana Costa (SLA Normal) -->
                        <tr class="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors duration-200">
                          <td class="px-4 py-3 text-center"><span class="text-sm">🟢</span></td>
                          <td class="px-4 py-3">
                            <div class="font-black text-slate-800 dark:text-slate-150">Mariana Costa</div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[8px] rounded border border-slate-200/40 dark:border-slate-700/50 uppercase">US441</span>
                          </td>
                          <td class="px-4 py-3">
                            <div class="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">✈️ Orlando</div>
                            <div class="flex gap-1 mt-1">
                              <span class="px-1.5 py-0.5 rounded bg-slate-100/65 dark:bg-slate-800/65 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">🏨</span>
                              <span class="px-1.5 py-0.5 rounded bg-slate-100/65 dark:bg-slate-800/65 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">🎫</span>
                            </div>
                          </td>
                          <td class="px-4 py-3 whitespace-nowrap">
                            <span class="flex items-center gap-1">📅 15/07/2026 a 30/07/2026</span>
                          </td>
                          <td class="px-4 py-3 text-slate-500 dark:text-slate-400">20/04/2026</td>
                          <td class="px-4 py-3">
                            <div class="font-black text-indigo-600 dark:text-indigo-400">R$ 12.800,00</div>
                            <div class="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">Rent: R$ 2.400,00</div>
                          </td>
                          <td class="px-4 py-3">
                            <span class="inline-flex px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase">Pós-Venda</span>
                          </td>
                          <td class="px-4 py-3 text-center">
                            <button class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black rounded-lg border border-indigo-100/30 dark:border-indigo-900/30 text-[9px] uppercase transition" disabled>🔍 Detalhes</button>
                          </td>
                        </tr>

                        <!-- Linha 3: Julia Ribeiro (SLA Excedido) -->
                        <tr class="bg-amber-50/10 dark:bg-amber-950/5 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition-colors duration-200">
                          <td class="px-4 py-3 text-center"><span class="text-sm">🚨</span></td>
                          <td class="px-4 py-3">
                            <div class="font-black text-slate-800 dark:text-slate-150">Julia Ribeiro</div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[8px] rounded border border-slate-200/40 dark:border-slate-700/50 uppercase">BR552</span>
                          </td>
                          <td class="px-4 py-3">
                            <div class="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">✈️ Bariloche</div>
                            <div class="flex gap-1 mt-1">
                              <span class="px-1.5 py-0.5 rounded bg-slate-100/65 dark:bg-slate-800/65 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">🏨</span>
                            </div>
                          </td>
                          <td class="px-4 py-3 whitespace-nowrap">
                            <span class="flex items-center gap-1">📅 22/06/2026 a 29/06/2026</span>
                          </td>
                          <td class="px-4 py-3 text-slate-500 dark:text-slate-400">10/03/2026</td>
                          <td class="px-4 py-3">
                            <div class="font-black text-indigo-600 dark:text-indigo-400">R$ 7.900,00</div>
                            <div class="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">Rent: R$ 1.200,00</div>
                          </td>
                          <td class="px-4 py-3">
                            <span class="inline-flex px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-450 text-[9px] font-black uppercase">Pós-Viagem</span>
                          </td>
                          <td class="px-4 py-3 text-center">
                            <button class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black rounded-lg border border-indigo-100/30 dark:border-indigo-900/30 text-[9px] uppercase transition" disabled>🔍 Detalhes</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- PANEL 3: ORÇAMENTOS -->
              <div id="panel-orcamentos" class="space-y-4 tab-pane-transition hidden">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <!-- Novo -->
                  <div class="bg-slate-100/40 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 p-2.5 rounded-xl">
                    <span class="block font-black text-slate-500 mb-2 uppercase text-[9px]">Novo (3)</span>
                    <div class="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                      <span class="block font-bold text-slate-800 dark:text-white truncate">Lua de Mel Grécia</span>
                      <span class="block text-[9px] text-slate-450 mt-0.5">Cliente: Ana Souza</span>
                      <span class="block text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">R$ 24.000,00</span>
                    </div>
                  </div>
                  <!-- Em Análise -->
                  <div class="bg-slate-100/40 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 p-2.5 rounded-xl">
                    <span class="block font-black text-slate-500 mb-2 uppercase text-[9px]">Em Análise (2)</span>
                    <div class="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                      <span class="block font-bold text-slate-800 dark:text-white truncate">Corporativo SP</span>
                      <span class="block text-[9px] text-slate-450 mt-0.5">Cliente: Roberto Silva</span>
                      <span class="block text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">R$ 4.500,00</span>
                    </div>
                  </div>
                  <!-- Proposta -->
                  <div class="bg-slate-100/40 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 p-2.5 rounded-xl">
                    <span class="block font-black text-slate-500 mb-2 uppercase text-[9px]">Proposta (4)</span>
                    <div class="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm border-l-3 border-l-amber-500">
                      <span class="block font-bold text-slate-800 dark:text-white truncate">Férias em Natal</span>
                      <span class="block text-[9px] text-slate-450 mt-0.5">Cliente: Beatriz Oliveira</span>
                      <span class="block text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">R$ 8.900,00</span>
                    </div>
                  </div>
                  <!-- Ganho -->
                  <div class="bg-slate-100/40 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 p-2.5 rounded-xl">
                    <span class="block font-black text-slate-500 mb-2 uppercase text-[9px]">Ganho (9)</span>
                    <div class="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm border-l-3 border-l-emerald-500">
                      <span class="block font-bold text-slate-800 dark:text-white truncate">Mochilão Europa</span>
                      <span class="block text-[9px] text-slate-450 mt-0.5">Cliente: Pedro Santos</span>
                      <span class="block text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">R$ 15.600,00</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PANEL 4: INBOX & SLAS -->
              <div id="panel-inbox" class="space-y-4 tab-pane-transition hidden">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Sidebar list -->
                  <div class="md:col-span-1 space-y-2 border-r border-slate-200 dark:border-slate-800 pr-2">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">MENSAGENS & ALERTAS</span>
                    <div class="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px]">
                      <div class="flex justify-between font-bold text-indigo-700 dark:text-indigo-400">
                        <span>⚠️ SLA Passaporte</span>
                        <span class="text-[8px] font-medium">Urgente</span>
                      </div>
                      <span class="block text-slate-600 dark:text-slate-400 truncate mt-0.5">Maria Clara (Expira em 45d)</span>
                    </div>
                    <div class="p-2 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-lg text-[10px]">
                      <div class="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                        <span>💬 Confirmação Voo</span>
                        <span class="text-[8px] text-slate-455">1h atrás</span>
                      </div>
                      <span class="block text-slate-500 dark:text-slate-400 truncate mt-0.5">LOC ABC123 resolvido</span>
                    </div>
                  </div>

                  <!-- Active Thread -->
                  <div class="md:col-span-2 space-y-3 flex flex-col justify-between min-h-[160px]">
                    <div class="space-y-2">
                      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <span class="text-xs font-black text-slate-700 dark:text-slate-300">Thread: SLA Passaporte - Maria Clara</span>
                        <span class="text-[9px] font-black text-rose-500">Expira em 23/10/2026</span>
                      </div>
                      <div class="space-y-2 max-h-[110px] overflow-y-auto pr-1 text-[10px]">
                        <div class="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                          <span class="font-extrabold text-rose-600 dark:text-rose-400">🚨 Sistema:</span>
                          <p class="text-slate-650 mt-0.5">Passaporte da passageira Maria Clara vence em 45 dias. Risco operacional para viagem em 15/12/2026.</p>
                        </div>
                        <div class="p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-right ml-4">
                          <span class="font-extrabold text-slate-700 dark:text-slate-300">Consultor João:</span>
                          <p class="text-slate-650 mt-0.5">Já solicitei a renovação. A cliente vai enviar o comprovante amanhã.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PANEL 5: REEMBOLSOS -->
              <div id="panel-reembolsos" class="space-y-3 tab-pane-transition hidden">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-xs font-black text-slate-700 dark:text-slate-300">Gestão de Reembolsos Pendentes</span>
                  <span class="px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-450 text-[9px] font-black rounded-lg">R$ 6.230,00 Pendente</span>
                </div>
                <div class="overflow-x-auto text-[10px]">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                        <th class="pb-2 font-black">CLIENTE</th>
                        <th class="pb-2 font-black">FORNECEDOR</th>
                        <th class="pb-2 font-black">VALOR</th>
                        <th class="pb-2 font-black">STATUS</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-150 dark:divide-slate-850">
                      <tr>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">Felipe Melo</td>
                        <td class="py-2.5 text-slate-500">Latam Airlines</td>
                        <td class="py-2.5 font-bold">R$ 1.850,00</td>
                        <td class="py-2.5"><span class="px-1.5 py-0.5 bg-rose-500/10 text-rose-550 border border-rose-500/20 text-[8px] font-black rounded-md">SOLICITADO</span></td>
                      </tr>
                      <tr>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">Patrícia Lima</td>
                        <td class="py-2.5 text-slate-500">Decolar</td>
                        <td class="py-2.5 font-bold">R$ 3.400,00</td>
                        <td class="py-2.5"><span class="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20 text-[8px] font-black rounded-md">EM ANÁLISE</span></td>
                      </tr>
                      <tr>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">Lucas Rocha</td>
                        <td class="py-2.5 text-slate-500">Azul Cia Aérea</td>
                        <td class="py-2.5 font-bold">R$ 980,00</td>
                        <td class="py-2.5"><span class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 text-[8px] font-black rounded-md">REEMBOLSADO</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- PANEL 6: GAMIFICACAO -->
              <div id="panel-gamificacao" class="space-y-4 tab-pane-transition hidden">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Progress circle -->
                  <div class="md:col-span-1 flex flex-col items-center justify-center p-4 bg-slate-100/50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <div class="relative w-16 h-16 flex items-center justify-center">
                      <svg class="absolute inset-0 w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path class="text-slate-200 dark:text-slate-800" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="text-indigo-600 dark:text-indigo-405" stroke-dasharray="78, 100" stroke-width="3" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span class="text-xs font-black text-slate-800 dark:text-white">Nível 12</span>
                    </div>
                    <span class="text-[9px] font-black text-indigo-600 dark:text-indigo-400 mt-2 block uppercase">Comandante</span>
                  </div>

                  <!-- Achievements list -->
                  <div class="md:col-span-2 space-y-2 text-[10px]">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">RECONHECIMENTOS RECENTES</span>
                    <div class="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <span class="text-xs">🎯</span>
                      <div class="flex-1">
                        <span class="block font-bold">Meta Comercial Atingida</span>
                        <span class="text-[8px] text-slate-400">Orçamento > R$ 15.000 fechado</span>
                      </div>
                      <span class="text-[9px] font-black text-emerald-500">+150 XP</span>
                    </div>
                    <div class="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <span class="text-xs">⚡</span>
                      <div class="flex-1">
                        <span class="block font-bold">Guardião de SLAs</span>
                        <span class="text-[8px] text-slate-450">Alertas resolvidos em menos de 2h</span>
                      </div>
                      <span class="text-[9px] font-black text-emerald-500">+50 XP</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </main>

        <!-- Problem vs Solution Section -->
        <section class="w-full bg-slate-100/50 dark:bg-slate-900/10 border-t border-slate-200/80 dark:border-slate-900/80 py-20 px-6 relative z-10">
          <div class="max-w-5xl mx-auto">
            <h2 class="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight text-center mb-4">
              Por que substituir as planilhas pelo PaxFlow?
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 font-semibold text-center mb-12 max-w-xl mx-auto">
              Desenvolvemos uma estrutura robusta para resolver os maiores problemas operacionais das agências.
            </p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              
              <!-- Column 1: The Pain -->
              <div class="p-6 bg-white dark:bg-slate-900 border border-red-500/10 dark:border-red-500/5 rounded-2xl shadow-sm">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-lg uppercase tracking-wider mb-4">
                  <span>❌</span> Como é hoje
                </div>
                <ul class="space-y-3.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <li class="flex items-start gap-2.5">
                    <span class="text-rose-500 shrink-0">⚠️</span>
                    <span>Planilhas de vendas bagunçadas e desatualizadas, que não calculam a margem líquida corretamente.</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="text-rose-500 shrink-0">⚠️</span>
                    <span>Risco constante de multas por esquecimento de passaportes vencendo ou prazos de vistos dos clientes.</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="text-rose-500 shrink-0">⚠️</span>
                    <span>Histórico de mensagens perdido no WhatsApp dos consultores, sem visibilidade para a coordenação.</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="text-rose-500 shrink-0">⚠️</span>
                    <span>Processos de reembolsos que levam meses para serem identificados e conciliados.</span>
                  </li>
                </ul>
              </div>

              <!-- Column 2: The Solution -->
              <div class="p-6 bg-indigo-500/5 dark:bg-slate-900 border border-indigo-500/10 dark:border-slate-800/80 rounded-2xl shadow-sm">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-[10px] font-black rounded-lg uppercase tracking-wider mb-4">
                  <span>✅</span> Com o PaxFlow
                </div>
                <ul class="space-y-3.5 text-xs text-slate-700 dark:text-slate-350 font-medium">
                  <li class="flex items-start gap-2.5">
                    <span class="text-emerald-500 shrink-0">✨</span>
                    <span><strong>Dashboard unificado</strong> com controle total de faturamento, canais de venda e cálculo automático de rentabilidade.</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="text-emerald-500 shrink-0">✨</span>
                    <span><strong>Alertas automáticos de SLA</strong> de documentos no Inbox, garantindo controle antes do embarque.</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="text-emerald-500 shrink-0">✨</span>
                    <span><strong>Central Inbox P2P</strong> com mensagens encadeadas diretamente no painel para auditoria.</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="text-emerald-500 shrink-0">✨</span>
                    <span><strong>Módulo financeiro integrado</strong> exclusivo para reembolso de bilhetes aéreos e serviços.</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        <!-- Stats Counters -->
        <section class="w-full py-16 px-6 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-900 relative z-10">
          <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div class="p-4">
              <span class="block text-3xl font-black text-indigo-600 dark:text-indigo-400">12+</span>
              <span class="block text-[10px] font-black uppercase text-slate-400 mt-1">Clientes Mockados</span>
            </div>
            <div class="p-4">
              <span class="block text-3xl font-black text-indigo-600 dark:text-indigo-400">8+</span>
              <span class="block text-[10px] font-black uppercase text-slate-400 mt-1">Consultores Ativos</span>
            </div>
            <div class="p-4">
              <span class="block text-3xl font-black text-indigo-600 dark:text-indigo-400">24/7</span>
              <span class="block text-[10px] font-black uppercase text-slate-400 mt-1">Monitoramento SLA</span>
            </div>
            <div class="p-4">
              <span class="block text-3xl font-black text-emerald-600 dark:text-emerald-450">100%</span>
              <span class="block text-[10px] font-black uppercase text-slate-400 mt-1">Isolamento Sandbox</span>
            </div>
          </div>
        </section>

        <!-- FAQ Section -->
        <section class="w-full bg-slate-100/50 dark:bg-slate-900/10 border-t border-slate-200/80 dark:border-slate-900/80 py-20 px-6 relative z-10">
          <div class="max-w-3xl mx-auto">
            <h2 class="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight text-center mb-12">
              Perguntas Frequentes
            </h2>
            
            <div class="space-y-4">
              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden" open>
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-200">O que é o Modo de Demonstração (Sandbox)?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-4 text-xs leading-relaxed text-slate-650 dark:text-slate-400 font-medium">
                  É um ambiente de simulação completo, pré-populado com dados fictícios (clientes, orçamentos, históricos de conversas, e dados de faturamento). Ele permite que você explore todas as funcionalidades operacionais da plataforma sem precisar configurar conexões reais.
                </p>
              </details>

              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-200">As alterações feitas no Modo Demo são salvas?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-4 text-xs leading-relaxed text-slate-650 dark:text-slate-400 font-medium">
                  As alterações são gravadas localmente no armazenamento do seu navegador (localStorage proxy). Respeitando o lema "reiniciou, perdeu", os dados são limpos e reiniciados a cada novo acesso à demonstração, garantindo um ambiente sempre limpo para testes.
                </p>
              </details>

              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-200">Como funciona o controle de passaportes e SLAs?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-4 text-xs leading-relaxed text-slate-650 dark:text-slate-400 font-medium">
                  O PaxFlow varre a validade dos passaportes de todos os passageiros vinculados a viagens ativas. Se algum documento possuir validade inferior a 6 meses do dia do embarque, o sistema emite um alerta automático no Inbox do consultor responsável para evitar multas ou cancelamentos no aeroporto.
                </p>
              </details>

              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-200">O sistema é multiusuário?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-4 text-xs leading-relaxed text-slate-650 dark:text-slate-400 font-medium">
                  Sim. Na versão de produção, o PaxFlow suporta controle de acesso baseado em cargos (RBAC). Administradores possuem privilégios de exclusão e configurações avançadas, enquanto consultores gerenciam seus próprios orçamentos e conversas com clientes de forma segura.
                </p>
              </details>
            </div>

          </div>
        </section>

        <!-- Footer -->
        <footer class="w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-8 px-6 text-center text-xs text-slate-500 font-semibold relative z-10">
          <p>© 2026 PaxFlow Systems. Todos os direitos reservados. Sandbox de dados fictícios para fins de apresentação comercial.</p>
        </footer>

      </div>
    `;
  }

  private setupEventListeners(): void {
    const handleStartDemo = () => {
      // Ativa flag sandbox
      (window as any).paxflowSandbox = true;
      sessionStorage.setItem('paxflowSandbox', 'true');

      // Limpa chaves anteriores de sandbox do localStorage para forçar reset ao iniciar demo ("reiniciou, perdeu")
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sandbox-')) {
          localStorage.removeItem(key);
        }
      });

      // Redireciona disparando navegação interna
      window.dispatchEvent(new CustomEvent('paxflow-navigate-to-demo'));
    };

    const handleAcessarReal = () => {
      // Desativa flag de sandbox
      (window as any).paxflowSandbox = false;
      sessionStorage.removeItem('paxflowSandbox');
      
      // Dispara redirecionamento para raiz do app
      window.location.hash = '';
      window.location.search = '';
      window.location.pathname = '/';
    };

    document.getElementById('btn-iniciar-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-acessar-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-conhecer-login')?.addEventListener('click', handleAcessarReal);

    // Lógica da Demo Interativa (Feature Tour)
    const tabs = ['dashboard', 'viagens', 'orcamentos', 'inbox', 'reembolsos', 'gamificacao'];
    const pathTexts: { [key: string]: string } = {
      dashboard: 'paxflow-comercial-dashboard.html',
      viagens: 'paxflow-controle-operacional-viagens.html',
      orcamentos: 'paxflow-crm-orcamentos-kanban.html',
      inbox: 'paxflow-inbox-p2p-threads.html',
      reembolsos: 'paxflow-gestao-de-reembolsos.html',
      gamificacao: 'paxflow-gamificacao-de-consultores.html'
    };

    tabs.forEach(tab => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      btn?.addEventListener('click', () => {
        // Desativar todas as abas
        tabs.forEach(t => {
          const b = document.getElementById(`tab-btn-${t}`);
          b?.classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
          b?.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:text-slate-800', 'dark:hover:text-slate-200');

          const panel = document.getElementById(`panel-${t}`);
          panel?.classList.add('hidden');
        });

        // Ativar aba clicada
        btn.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
        btn.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:text-slate-800', 'dark:hover:text-slate-200');

        const activePanel = document.getElementById(`panel-${tab}`);
        activePanel?.classList.remove('hidden');

        // Atualizar o path text simulado na janela
        const pathEl = document.getElementById('window-path-text');
        if (pathEl) {
          pathEl.textContent = pathTexts[tab];
        }
      });
    });
  }
}

