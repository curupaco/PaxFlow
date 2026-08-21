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
      <div class="landing-page-wrapper min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col relative overflow-hidden transition-colors duration-300">
        
        <!-- Ambient Light Background Glows -->
        <div class="absolute top-[-30%] left-[-20%] w-[100%] h-[70%] bg-gradient-to-tr from-sky-100/10 via-indigo-100/10 to-rose-100/5 dark:from-indigo-950/10 dark:via-slate-950/0 dark:to-transparent rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div class="absolute bottom-[-15%] right-[-15%] w-[80%] h-[60%] bg-gradient-to-bl from-emerald-100/5 via-teal-50/5 to-transparent dark:from-emerald-950/5 dark:via-slate-950/0 dark:to-transparent rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div class="absolute inset-0 grid-bg pointer-events-none z-0 opacity-50"></div>

        <!-- Top Navigation Bar -->
        <header class="w-full bg-white/80 dark:bg-slate-950/45 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-900/50 sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-8 w-8 object-contain shrink-0" />
            <span class="text-base font-extrabold text-slate-800 dark:text-white tracking-tight">PaxFlow</span>
          </div>
          <div class="flex items-center gap-3.5">
            <!-- Theme Toggle Button -->
            <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/40 dark:border-slate-800/40 flex items-center justify-center shadow-sm">
              <svg width="15" height="15" class="w-3.5 h-3.5 theme-icon-light" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg width="15" height="15" class="w-3.5 h-3.5 theme-icon-dark" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button id="btn-acessar-login" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold text-xs rounded-xl border border-slate-950 dark:border-slate-700 transition shadow-sm">
              Acessar Sistema
            </button>
          </div>
        </header>

        <!-- Hero Section -->
        <main class="w-full max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-12 text-center relative z-10 flex flex-col items-center justify-center">
          
          <!-- Label Badge -->
          <div class="inline-flex items-center gap-1.5 px-3.5 py-1 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/60 text-indigo-650 dark:text-indigo-400 font-bold text-[10px] tracking-wide rounded-full mb-6 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-650 animate-pulse"></span>
            Gestão Operacional de Viagens e Pós-Venda
          </div>

          <!-- Headline -->
          <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6 text-slate-800 dark:text-white max-w-4xl mx-auto">
            A gestão operacional da sua <br class="hidden sm:block" />
            agência de viagens, <span class="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300">simplificada</span>.
          </h1>

          <!-- Subtitle -->
          <p class="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium max-w-2xl mb-10 leading-relaxed">
            Abandone as planilhas manuais e o controle em blocos de notas. Centralize pós-vendas, prazos de vistos e passaportes, conciliação de reembolsos aéreos e incentive seu time de consultores em uma única plataforma integrada.
          </p>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center gap-3.5 mb-16 w-full justify-center">
            <button id="btn-iniciar-demo" class="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-650/10 transition-all transform hover:-translate-y-0.5 uppercase flex items-center justify-center gap-2">
              Iniciar Demonstração (Sandbox)
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto px-7 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white font-bold text-xs tracking-wider rounded-xl border border-slate-200 dark:border-slate-800 transition-all transform hover:-translate-y-0.5 uppercase shadow-sm">
              Entrar no Sistema Real
            </button>
          </div>

          <!-- Section header for interactive tour -->
          <div class="w-full text-center mb-10">
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
              Conheça os Módulos do PaxFlow
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Clique nos botões de abas abaixo para visualizar as telas reais da nossa solução de turismo
            </p>
          </div>

          <!-- Horizontal Pills bar (Stripe/Pitch style) with SVG Icons -->
          <div class="w-full mb-8">
            <div class="flex flex-wrap justify-center gap-2 p-1.5 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl max-w-5xl mx-auto backdrop-blur-md shadow-sm">
              
              <button id="tab-btn-dashboard" class="px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 bg-indigo-600 text-white shadow-md">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                Painel Comercial
              </button>
              
              <button id="tab-btn-viagens" class="px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Viagens
              </button>
              
              <button id="tab-btn-orcamentos" class="px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Orçamentos
              </button>
              
              <button id="tab-btn-inbox" class="px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Alertas & SLAs
              </button>
              
              <button id="tab-btn-reembolsos" class="px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Reembolsos
              </button>
              
              <button id="tab-btn-relatorios" class="px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Relatórios
              </button>
              
              <button id="tab-btn-publicas" class="px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.905 0-5.64-.5-7.843-1.418m15.686 0A8.957 8.957 0 0112 18a8.957 8.957 0 01-7.843-8.918" />
                </svg>
                Itinerários públicos
              </button>

            </div>
          </div>

          <!-- Interactive UI Preview Container -->
          <div class="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl p-5 md:p-7 text-left relative overflow-hidden backdrop-blur-md flex flex-col justify-between min-h-[460px] transition-colors duration-300">
            
            <!-- Window top bar (No dev titles) -->
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                <span class="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                <span class="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                <span id="window-path-text" class="text-[10px] text-slate-600 dark:text-slate-300 font-extrabold ml-2">PaxFlow - Painel de Controle</span>
              </div>
              <div class="flex gap-2">
                <span class="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[9px] rounded-lg">DEMO EM TEMPO REAL</span>
              </div>
            </div>

            <!-- Content Panels -->
            <div id="mockup-panels-container" class="flex-1 flex flex-col justify-center text-slate-800 dark:text-slate-100">
              
              <!-- PANEL 1: DASHBOARD -->
              <div id="panel-dashboard" class="space-y-4 tab-pane-transition">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Faturamento Mensal</span>
                    <div class="flex items-baseline gap-2 mt-1">
                      <span class="text-xl font-black text-slate-800 dark:text-white">R$ 148.500,00</span>
                      <span class="text-[9px] text-emerald-500 font-extrabold">+14.2%</span>
                    </div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Taxa de Conversão</span>
                    <div class="flex items-baseline gap-2 mt-1">
                      <span class="text-xl font-black text-indigo-600 dark:text-indigo-400">24,8%</span>
                      <span class="text-[9px] text-slate-500 font-medium">Média de 2026</span>
                    </div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
                    <div class="flex items-baseline gap-2 mt-1">
                      <span class="text-xl font-black text-emerald-600 dark:text-emerald-450">R$ 6.200,00</span>
                      <span class="text-[9px] text-slate-500">Por Viagem</span>
                    </div>
                  </div>
                </div>

                <div class="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-5">
                  <div class="flex items-center justify-between mb-4 border-b border-slate-200/50 dark:border-slate-805 pb-2.5">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Funil Comercial Operativo</span>
                    <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold rounded-lg">Dados em Tempo Real</span>
                  </div>
                  
                  <div class="space-y-3">
                    <div>
                      <div class="flex justify-between text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                        <span>Orçamentos Criados</span>
                        <span>120</span>
                      </div>
                      <div class="w-full bg-slate-200/60 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-indigo-600 h-full w-[100%] rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <div class="flex justify-between text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                        <span>Propostas Enviadas</span>
                        <span>75 (62%)</span>
                      </div>
                      <div class="w-full bg-slate-200/60 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-indigo-550 h-full w-[62%] rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <div class="flex justify-between text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-400">
                        <span>Negociações Fechadas</span>
                        <span>24 (20%)</span>
                      </div>
                      <div class="w-full bg-slate-200/60 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-emerald-500 h-full w-[20%] rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PANEL 2: VIAGENS -->
              <div id="panel-viagens" class="space-y-4 tab-pane-transition hidden">
                <div class="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-[600px] text-[10px]">
                      <thead>
                        <tr class="bg-slate-100/50 dark:bg-slate-900/60 text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200/65 dark:border-slate-800">
                          <th class="px-4 py-3 w-[50px] text-center">SLA</th>
                          <th class="px-4 py-3">Cliente / LOC</th>
                          <th class="px-4 py-3">Destino / Produtos</th>
                          <th class="px-4 py-3">Período</th>
                          <th class="px-4 py-3">Financeiro</th>
                          <th class="px-4 py-3 w-[120px]">Fase / Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        <tr class="hover:bg-slate-100/30 dark:hover:bg-slate-800/10 transition-colors duration-200">
                          <td class="px-4 py-3 text-center"><span class="text-xs">⚠️</span></td>
                          <td class="px-4 py-3">
                            <div class="font-extrabold text-slate-800 dark:text-slate-150">Carlos Eduardo</div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[8px] rounded border border-slate-300/40 dark:border-slate-750/50 uppercase">BA921</span>
                          </td>
                          <td class="px-4 py-3">
                            <div class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">✈️ Buenos Aires</div>
                            <div class="flex gap-1 mt-1">
                              <span class="px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/60 border border-slate-300/30 dark:border-slate-700/30 text-[8px] font-black text-slate-500 dark:text-slate-400">Voo</span>
                            </div>
                          </td>
                          <td class="px-4 py-3 whitespace-nowrap">12/08/2026 a 19/08/2026</td>
                          <td class="px-4 py-3">
                            <div class="font-bold text-indigo-650 dark:text-indigo-400">R$ 5.400,00</div>
                            <div class="text-[8px] text-emerald-600 dark:text-emerald-455 font-bold mt-0.5">Rentabilidade: R$ 800,00</div>
                          </td>
                          <td class="px-4 py-3">
                            <span class="inline-flex px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-bold uppercase border border-amber-500/20">Pré-Embarque</span>
                          </td>
                        </tr>
                        <tr class="hover:bg-slate-100/30 dark:hover:bg-slate-800/10 transition-colors duration-200">
                          <td class="px-4 py-3 text-center"><span class="text-xs">🟢</span></td>
                          <td class="px-4 py-3">
                            <div class="font-extrabold text-slate-800 dark:text-slate-150">Mariana Costa</div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[8px] rounded border border-slate-300/40 dark:border-slate-750/50 uppercase">US441</span>
                          </td>
                          <td class="px-4 py-3">
                            <div class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">✈️ Orlando</div>
                            <div class="flex gap-1 mt-1">
                              <span class="px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/60 border border-slate-300/30 dark:border-slate-700/30 text-[8px] font-black text-slate-500 dark:text-slate-400">Hotel</span>
                              <span class="px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/60 border border-slate-300/30 dark:border-slate-700/30 text-[8px] font-black text-slate-500 dark:text-slate-400">Ingresso</span>
                            </div>
                          </td>
                          <td class="px-4 py-3 whitespace-nowrap">15/07/2026 a 30/07/2026</td>
                          <td class="px-4 py-3">
                            <div class="font-bold text-indigo-650 dark:text-indigo-400">R$ 12.800,00</div>
                            <div class="text-[8px] text-emerald-600 dark:text-emerald-455 font-bold mt-0.5">Rentabilidade: R$ 2.400,00</div>
                          </td>
                          <td class="px-4 py-3">
                            <span class="inline-flex px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-bold uppercase border border-indigo-500/20">Pós-Venda</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- PANEL 3: ORÇAMENTOS -->
              <div id="panel-orcamentos" class="space-y-4 tab-pane-transition hidden">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-[10px]">
                  <!-- Novo -->
                  <div class="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 dark:text-slate-400 mb-2.5 uppercase text-[8px]">Novo (3)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Grécia / Lua de Mel</span>
                      <span class="block text-[8px] text-slate-400 mt-0.5">Ana Souza</span>
                      <span class="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1">R$ 24.000,00</span>
                    </div>
                  </div>
                  <!-- Em Análise -->
                  <div class="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 dark:text-slate-400 mb-2.5 uppercase text-[8px]">Em Análise (2)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Férias em Família</span>
                      <span class="block text-[8px] text-slate-400 mt-0.5">Pedro Santos</span>
                      <span class="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1">R$ 15.600,00</span>
                    </div>
                  </div>
                  <!-- Proposta -->
                  <div class="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 dark:text-slate-400 mb-2.5 uppercase text-[8px]">Proposta (4)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm border-l-2 border-l-amber-500">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Férias em Natal</span>
                      <span class="block text-[8px] text-slate-400 mt-0.5">Beatriz Oliveira</span>
                      <span class="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1">R$ 8.900,00</span>
                    </div>
                  </div>
                  <!-- Ganho -->
                  <div class="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 dark:text-slate-400 mb-2.5 uppercase text-[8px]">Ganho (9)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm border-l-2 border-l-emerald-500">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Mochilão Europa</span>
                      <span class="block text-[8px] text-slate-400 mt-0.5">Julio César</span>
                      <span class="block text-[9px] font-black text-emerald-600 dark:text-emerald-450 mt-1">R$ 18.200,00</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PANEL 4: INBOX & SLAS -->
              <div id="panel-inbox" class="space-y-4 tab-pane-transition hidden text-[10px]">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Sidebar list -->
                  <div class="md:col-span-1 space-y-2 border-r border-slate-200 dark:border-slate-800 pr-3">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ALERTAS RECENTES</span>
                    <div class="p-2 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 dark:border-rose-900/30 rounded-xl">
                      <div class="flex justify-between font-extrabold text-rose-600 dark:text-rose-455">
                        <span>SLA Passaporte</span>
                        <span>Urgente</span>
                      </div>
                      <span class="block text-slate-500 dark:text-slate-400 truncate mt-0.5">Maria Clara (Validade < 180d)</span>
                    </div>
                    <div class="p-2 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <div class="flex justify-between font-bold text-slate-600 dark:text-slate-300">
                        <span>Confirmação LOC</span>
                        <span>1h atrás</span>
                      </div>
                      <span class="block text-slate-500 dark:text-slate-400 truncate mt-0.5">Voo GRU-CDG confirmado</span>
                    </div>
                  </div>

                  <!-- Active Thread -->
                  <div class="md:col-span-2 space-y-3 flex flex-col justify-between min-h-[160px]">
                    <div class="space-y-2">
                      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span class="font-extrabold text-slate-700 dark:text-slate-300">Thread: Alerta SLA - Maria Clara</span>
                        <span class="text-[8px] font-bold text-rose-555">Viagem em 15/12/2026</span>
                      </div>
                      <div class="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        <div class="p-2.5 bg-rose-500/10 border border-rose-500/20 dark:border-rose-900/30 rounded-xl">
                          <span class="font-extrabold text-rose-600 dark:text-rose-400">Sistema:</span>
                          <p class="text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">Atenção! Passaporte da passageira vence em menos de 6 meses no dia da viagem.</p>
                        </div>
                        <div class="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-right ml-4">
                          <span class="font-extrabold text-slate-700 dark:text-slate-300">Consultor João:</span>
                          <p class="text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">Solicitação de renovação já está em andamento. O novo número será atualizado em breve.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PANEL 5: REEMBOLSOS -->
              <div id="panel-reembolsos" class="space-y-3 tab-pane-transition hidden text-[10px]">
                <div class="flex justify-between items-center mb-1">
                  <span class="font-bold text-slate-700 dark:text-slate-300">Reembolsos e Créditos Pendentes</span>
                  <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 text-[8px] font-bold rounded-lg border border-emerald-500/20">R$ 6.230,00 pendente</span>
                </div>
                <div class="overflow-x-auto text-[10px]">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="border-b border-slate-250 dark:border-slate-800 text-slate-400">
                        <th class="pb-2 font-bold uppercase text-[8px]">Passageiro</th>
                        <th class="pb-2 font-bold uppercase text-[8px]">Fornecedor</th>
                        <th class="pb-2 font-bold uppercase text-[8px]">Valor</th>
                        <th class="pb-2 font-bold uppercase text-[8px]">Etapa</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">Felipe Melo</td>
                        <td class="py-2.5">LATAM Airlines</td>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">R$ 1.850,00</td>
                        <td class="py-2.5"><span class="px-1.5 py-0.5 bg-rose-500/10 text-rose-555 border border-rose-500/20 text-[8px] font-bold rounded-md uppercase">Solicitado</span></td>
                      </tr>
                      <tr>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">Patrícia Lima</td>
                        <td class="py-2.5">Decolar</td>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">R$ 3.400,00</td>
                        <td class="py-2.5"><span class="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20 text-[8px] font-bold rounded-md uppercase">Em Análise</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- PANEL 6: RELATORIOS -->
              <div id="panel-relatorios" class="space-y-4 tab-pane-transition hidden text-[10px]">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl text-left space-y-1">
                    <span class="text-[8px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Conversão Geral</span>
                    <div class="flex items-baseline gap-1.5">
                      <span class="text-base font-black text-slate-800 dark:text-white">28,4%</span>
                    </div>
                    <div class="w-full bg-slate-200/50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex mt-2">
                      <div class="bg-indigo-600 h-full" style="width: 28.4%"></div>
                    </div>
                  </div>

                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl text-left space-y-1">
                    <span class="text-[8px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Markup Médio</span>
                    <div class="flex items-baseline gap-1.5">
                      <span class="text-base font-black text-slate-800 dark:text-white">18,5%</span>
                    </div>
                    <div class="w-full bg-slate-200/50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex mt-2">
                      <div class="bg-indigo-500 h-full" style="width: 74%"></div>
                    </div>
                  </div>

                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl text-left space-y-1">
                    <span class="text-[8px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Pipeline Estimado</span>
                    <div class="flex items-baseline gap-1.5">
                      <span class="text-base font-black text-slate-800 dark:text-white">R$ 115.800,00</span>
                    </div>
                    <span class="text-[8px] text-slate-400 block mt-2">Próximos 30 dias de embarques</span>
                  </div>
                </div>
              </div>

              <!-- PANEL 7: PUBLICAS -->
              <div id="panel-publicas" class="space-y-4 tab-pane-transition hidden text-[10px]">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Public Itinerary Card -->
                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl text-left space-y-2">
                    <span class="text-[8px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block">Itinerário Digital do Cliente</span>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                      O passageiro acompanha voos, hotéis, traslados e vouchers de forma responsiva no celular, organizada por dias com contagem regressiva para a partida.
                    </p>
                  </div>

                  <!-- Public NPS Card -->
                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl text-left space-y-2">
                    <span class="text-[8px] font-bold text-emerald-600 dark:text-emerald-455 uppercase tracking-wider block">Pesquisa de Satisfação NPS</span>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                      Pesquisa pós-viagem enviada ao cliente com interface amigável para avaliar o serviço do consultor, alimentando as estatísticas no painel de controle.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </main>

        <!-- Dynamic Visual Customization (No white-label naming) -->
        <section class="w-full bg-slate-150/40 dark:bg-slate-950/10 py-16 px-6 relative z-10 border-t border-slate-200/40 dark:border-slate-900/40">
          <div class="max-w-5xl mx-auto">
            <div class="text-center max-w-2xl mx-auto mb-10">
              <span class="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider rounded-full">Identidade Visual da Agência</span>
              <h2 class="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight mt-3">
                Sua Agência, Suas Cores
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Veja em tempo real como a área de visualização de viagens do seu passageiro se adapta à paleta de cores da sua própria agência:
              </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-4xl mx-auto">
              <!-- Customization settings -->
              <div class="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-center space-y-4 shadow-sm">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Nome da Sua Agência</label>
                  <input id="wl-input-name" type="text" value="Minha Agência de Viagens" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-150 font-semibold text-xs font-sans" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Cor Principal da Agência</label>
                  <div class="flex items-center gap-3">
                    <input id="wl-input-color" type="color" value="#4f46e5" class="w-8 h-8 border-0 rounded-lg cursor-pointer bg-transparent" />
                    <span id="wl-color-hex" class="text-[10px] font-mono font-bold text-slate-500">#4F46E5</span>
                  </div>
                </div>
                <div class="text-[9px] text-slate-400 dark:text-slate-400 leading-normal pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  💡 No PaxFlow real, a logomarca da sua empresa e a sua paleta de cores são aplicadas automaticamente a todos os itinerários acessados pelos seus clientes.
                </div>
              </div>

              <!-- Live dynamic preview -->
              <div class="lg:col-span-8 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                <!-- Preview Header -->
                <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-3.5">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                    <span class="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                    <span class="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                  </div>
                  <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ITINERÁRIO DO PASSAGEIRO</span>
                </div>

                <!-- Itinerary Card mockup -->
                <div class="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-4.5 flex-1 shadow-sm flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2.5">
                      <div class="flex items-center gap-2">
                        <!-- Custom logo bg -->
                        <span id="wl-preview-logo-bg" class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm" style="background-color: #4f46e5;">
                          ✈️
                        </span>
                        <div>
                          <span id="wl-preview-agency-name" class="block text-xs font-bold text-slate-800 dark:text-slate-155">Minha Agência de Viagens</span>
                          <span class="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Itinerário Digital</span>
                        </div>
                      </div>
                      <span class="text-[8px] font-mono font-bold bg-slate-50 dark:bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">VIA-2026</span>
                    </div>

                    <div class="space-y-2.5 text-[10px]">
                      <div>
                        <span class="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Passageiro</span>
                        <span class="block font-bold text-slate-700 dark:text-slate-300">Guilherme R. Albuquerque</span>
                      </div>
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <span class="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Destino</span>
                          <span class="block font-bold text-slate-700 dark:text-slate-300">Paris, França</span>
                        </div>
                        <div>
                          <span class="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Embarque</span>
                          <span class="block font-bold text-slate-700 dark:text-slate-300">14/10/2026</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Dynamic Button -->
                  <div class="mt-4">
                    <button id="wl-preview-btn" class="w-full py-2 rounded-xl text-white text-[10px] font-bold tracking-wider transition-all duration-300 uppercase shadow-sm hover:brightness-105" style="background-color: #4f46e5;">
                      Ver Detalhes do Voo & Voucher
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Problem vs Solution Section -->
        <section class="w-full bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200/40 dark:border-slate-900/40 py-16 px-6 relative z-10">
          <div class="max-w-5xl mx-auto">
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight text-center mb-10">
              Por que substituir planilhas pelo PaxFlow?
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              
              <!-- Column 1: The Pain -->
              <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500/5 text-rose-600 dark:text-rose-455 text-[9px] font-bold rounded-lg uppercase tracking-wider mb-4">
                  ❌ Como é hoje nas agências
                </div>
                <ul class="space-y-3 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <li class="flex items-start gap-2">
                    <span class="text-rose-500 shrink-0">✕</span>
                    <span>Informações fragmentadas de localizadores de voo (LOC) e reservas.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-rose-500 shrink-0">✕</span>
                    <span>Falhas no monitoramento de datas de vencimento de passaportes e vistos.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-rose-500 shrink-0">✕</span>
                    <span>Esquecimento de saldos e créditos de reembolso com companhias aéreas.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-rose-500 shrink-0">✕</span>
                    <span>Perda de orçamentos e leads de clientes no WhatsApp de consultores.</span>
                  </li>
                </ul>
              </div>

              <!-- Column 2: The Solution -->
              <div class="p-5 bg-indigo-50/10 dark:bg-slate-900 border border-indigo-100/50 dark:border-slate-800 rounded-2xl shadow-sm">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-455 text-[9px] font-bold rounded-lg uppercase tracking-wider mb-4">
                  ✅ Com a plataforma PaxFlow
                </div>
                <ul class="space-y-3 text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✓</span>
                    <span>Painel comercial com faturamento e markups consolidados.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✓</span>
                    <span>Monitoramento de SLAs com alertas automáticos antecipados.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✓</span>
                    <span>Fichas de clientes e central de reembolsos unificadas.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✓</span>
                    <span>Gamificação para incentivar e engajar a equipe nas metas de vendas.</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        <!-- Deep technical and commercial detail sections for tourism (CRM, Gamification, Relatorios) -->
        <section class="w-full bg-slate-100/30 dark:bg-slate-900/10 py-16 border-t border-slate-200/40 dark:border-slate-900/40 relative z-10">
          <div class="max-w-5xl mx-auto px-6 space-y-20">
            
            <!-- PILLAR 1: CRM & KANBAN -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-5 space-y-4">
                <span class="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[9px] font-bold uppercase rounded-lg border border-indigo-500/20">Funil e Propostas</span>
                <h3 class="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  CRM especializado para orçamentos de pacotes
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Gerencie orçamentos em colunas de pipeline comercial (Novo, Em Análise, Proposta, Ganho). Preencha dados essenciais como data de nascimento do passageiro e data financeira obrigatoriamente no fechamento, assegurando a precisão dos repasses de markup e comissões da agência.
                </p>
              </div>
              <div class="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-md text-xs">
                <span class="block text-[8px] font-black text-slate-400 uppercase mb-3">CRM de Viagens</span>
                <div class="grid grid-cols-3 gap-3">
                  <div class="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
                    <span class="font-extrabold text-[8px] text-slate-400 block mb-2">PROPOSTA (2)</span>
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1 shadow-sm">
                      <span class="font-bold block text-slate-800 dark:text-slate-200">Lua de Mel Grécia</span>
                      <span class="text-[8px] text-indigo-600 dark:text-indigo-450 font-bold">R$ 24.000,00</span>
                    </div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 border-l-2 border-l-amber-500">
                    <span class="font-extrabold text-[8px] text-amber-600 dark:text-amber-450 block mb-2">NEGOCIAÇÃO (1)</span>
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1 shadow-sm">
                      <span class="font-bold block text-slate-800 dark:text-slate-200">Orlando Família</span>
                      <span class="text-[8px] text-indigo-600 dark:text-indigo-450 font-bold">R$ 15.600,00</span>
                    </div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 border-l-2 border-l-emerald-500">
                    <span class="font-extrabold text-[8px] text-emerald-600 dark:text-emerald-455 block mb-2">FECHADO (12)</span>
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1 shadow-sm">
                      <span class="font-bold block text-slate-800 dark:text-slate-200">Paris Cultural</span>
                      <span class="text-[8px] text-emerald-650 dark:text-emerald-450 font-bold">R$ 18.200,00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PILLAR 2: SLA & INBOX (SLA alert documentation) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-7 lg:order-2 space-y-4">
                <span class="px-2.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-455 text-[9px] font-bold uppercase rounded-lg border border-rose-500/20">Segurança de Voo</span>
                <h3 class="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  Validação automatizada de passaportes e vistos
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Evite constrangimentos e cancelamentos de última hora no aeroporto. O motor operacional do PaxFlow varre todas as datas e alerta o time com 180 dias de antecedência caso um passaporte ou visto expire antes ou durante a viagem do cliente.
                </p>
              </div>
              <div class="lg:col-span-5 lg:order-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-md">
                <div class="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2 text-xs text-left">
                  <div class="flex justify-between items-center text-rose-700 dark:text-rose-400 font-black">
                    <span>⚠️ ALERTA DE VENCIMENTO</span>
                    <span class="px-1.5 py-0.5 bg-rose-550 text-white text-[8px] font-bold uppercase rounded">Atenção</span>
                  </div>
                  <p class="text-slate-600 dark:text-slate-300 leading-relaxed text-[10px]">
                    O passaporte de <strong>Guilherme Albuquerque</strong> vence em 14/11/2026. O embarque para a viagem cadastrada ocorre em 14/10/2026. Validade menor que o prazo exigido pelas autoridades.
                  </p>
                </div>
              </div>
            </div>

            <!-- PILLAR 3: GAMIFICATION -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-5 space-y-4">
                <span class="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-[9px] font-bold uppercase rounded-lg border border-emerald-500/20">Produtividade</span>
                <h3 class="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  Gamificação e incentivo para consultores
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Aumente o engajamento do seu time comercial. O sistema distribui pontos de XP a cada fechamento e concede medalhas colecionáveis para marcos como quitação financeira correta, baixos índices de incidentes e campanhas de vendas ativas.
                </p>
              </div>
              <div class="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-md">
                <span class="block text-[8px] font-black text-slate-400 uppercase text-left mb-4">Medalhas e Patentes de Consultor</span>
                <div class="grid grid-cols-3 gap-4 text-center">
                  <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl flex flex-col items-center gap-1">
                    <span class="text-2xl">🥇</span>
                    <span class="font-extrabold text-[9px] text-slate-800 dark:text-slate-200">Guia de Elite</span>
                    <span class="text-[8px] text-slate-400 uppercase">Patente Faturamento</span>
                  </div>
                  <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl flex flex-col items-center gap-1">
                    <span class="text-2xl">🛡️</span>
                    <span class="font-extrabold text-[9px] text-slate-800 dark:text-slate-200">Conformidade</span>
                    <span class="text-[8px] text-slate-400 uppercase">0 Erros de Faturamento</span>
                  </div>
                  <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl flex flex-col items-center gap-1">
                    <span class="text-2xl">⭐</span>
                    <span class="font-extrabold text-[9px] text-slate-800 dark:text-slate-200">Campeão NPS</span>
                    <span class="text-[8px] text-slate-400 uppercase">100% de Avaliações 10</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- FAQ Section -->
        <section class="w-full bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200/40 dark:border-slate-900/40 py-16 px-6 relative z-10">
          <div class="max-w-3xl mx-auto">
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight text-center mb-10">
              Perguntas Frequentes
            </h2>
            
            <div class="space-y-3.5">
              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden" open>
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">O que é o Modo de Demonstração (Sandbox)?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-500/10 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                  É um ambiente de simulação completo, pré-populado com dados fictícios (clientes, orçamentos, históricos de conversas, e dados de faturamento). Ele permite que você explore todas as funcionalidades operacionais da plataforma sem precisar configurar conexões reais.
                </p>
              </details>

              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">As alterações feitas no Modo Demo são salvas?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-500/10 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                  As alterações são gravadas localmente no armazenamento do seu navegador (localStorage proxy). Respeitando o lema "reiniciou, perdeu", os dados são limpos e reiniciados a cada novo acesso à demonstração, garantindo um ambiente sempre limpo para testes.
                </p>
              </details>

              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">Como funciona o controle de passaportes e SLAs?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-500/10 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                  O PaxFlow varre a validade dos passaportes de todos os passageiros vinculados a viagens ativas. Se algum documento possuir validade inferior a 6 meses do dia do embarque, o sistema emite um alerta automático no Inbox do consultor responsável para evitar multas ou cancelamentos no aeroporto.
                </p>
              </details>
            </div>

          </div>
        </section>

        <!-- Footer -->
        <footer class="w-full bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-900/60 py-6 px-6 text-center text-[10px] text-slate-400 font-medium relative z-10">
          <p>© 2026 PaxFlow. Todos os direitos reservados. Thiago Costa — Apresentação de Solução de CRM e Pós-Venda Turístico.</p>
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

    // Lógica da Demo Interativa (Feature Tour com Layout Horizontal - Stripe Style)
    const tabs = ['dashboard', 'viagens', 'orcamentos', 'inbox', 'reembolsos', 'relatorios', 'publicas'];
    const pathTexts: { [key: string]: string } = {
      dashboard: 'PaxFlow - Painel de Controle',
      viagens: 'PaxFlow - Operação de Viagens',
      orcamentos: 'PaxFlow - Funil de Orçamentos',
      inbox: 'PaxFlow - Central de Mensagens e Alertas',
      reembolsos: 'PaxFlow - Gestão de Reembolsos',
      relatorios: 'PaxFlow - Relatórios Gerenciais',
      publicas: 'PaxFlow - Itinerário Digital do Passageiro'
    };

    tabs.forEach(tab => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      btn?.addEventListener('click', () => {
        // Desativar todas as abas
        tabs.forEach(t => {
          const b = document.getElementById(`tab-btn-${t}`);
          if (b) {
            b.className = "px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200";
          }
          const panel = document.getElementById(`panel-${t}`);
          panel?.classList.add('hidden');
        });

        // Ativar aba clicada
        if (btn) {
          btn.className = "px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 bg-indigo-600 text-white shadow-md";
        }

        const activePanel = document.getElementById(`panel-${tab}`);
        activePanel?.classList.remove('hidden');

        // Atualizar o path text simulado na janela
        const pathEl = document.getElementById('window-path-text');
        if (pathEl) {
          pathEl.textContent = pathTexts[tab];
        }
      });
    });

    // Lógica da ferramenta Customização Visual Preview
    const wlInputName = document.getElementById('wl-input-name') as HTMLInputElement;
    const wlInputColor = document.getElementById('wl-input-color') as HTMLInputElement;
    const wlColorHex = document.getElementById('wl-color-hex');
    const wlPreviewAgencyName = document.getElementById('wl-preview-agency-name');
    const wlPreviewLogoBg = document.getElementById('wl-preview-logo-bg');
    const wlPreviewBtn = document.getElementById('wl-preview-btn');

    const updateWlPreview = () => {
      if (!wlInputName || !wlInputColor) return;
      const name = wlInputName.value.trim() || 'Minha Agência de Viagens';
      const color = wlInputColor.value;

      if (wlColorHex) wlColorHex.textContent = color.toUpperCase();
      if (wlPreviewAgencyName) wlPreviewAgencyName.textContent = name;
      if (wlPreviewLogoBg) wlPreviewLogoBg.style.backgroundColor = color;
      if (wlPreviewBtn) wlPreviewBtn.style.backgroundColor = color;
    };

    wlInputName?.addEventListener('input', updateWlPreview);
    wlInputColor?.addEventListener('input', updateWlPreview);
  }
}
