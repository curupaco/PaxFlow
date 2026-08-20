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
        
        <!-- Stripe-like Colorful Ambient Background Blobs -->
        <div class="absolute top-[-30%] left-[-20%] w-[100%] h-[70%] bg-gradient-to-tr from-sky-200/30 via-indigo-100/20 to-rose-100/10 dark:from-indigo-950/15 dark:via-slate-950/0 dark:to-transparent rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div class="absolute bottom-[-15%] right-[-15%] w-[80%] h-[60%] bg-gradient-to-bl from-emerald-100/20 via-teal-50/15 to-transparent dark:from-emerald-950/10 dark:via-slate-950/0 dark:to-transparent rounded-full blur-[140px] pointer-events-none z-0"></div>

        <!-- Top Navigation Bar -->
        <header class="w-full bg-white/75 dark:bg-slate-950/45 backdrop-blur-xl border-b border-slate-200/55 dark:border-slate-900/50 sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-8 w-8 object-contain shrink-0" />
            <span class="text-base font-extrabold text-slate-800 dark:text-white tracking-tight">PaxFlow</span>
          </div>
          <div class="flex items-center gap-3.5">
            <!-- Theme Toggle Button -->
            <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/40 dark:border-slate-800/40 flex items-center justify-center shadow-sm">
              <svg width="15" height="15" class="w-3.5 h-3.5 theme-icon-light" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg width="15" height="15" class="w-3.5 h-3.5 theme-icon-dark" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button id="btn-acessar-login" class="px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold text-xs rounded-xl border border-slate-950 dark:border-slate-700 transition shadow-sm">
              Acessar Sistema
            </button>
          </div>
        </header>

        <!-- Hero Section -->
        <main class="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center max-w-5xl mx-auto relative z-10">
          
          <!-- Modern Label Badge -->
          <div class="inline-flex items-center gap-1.5 px-3.5 py-1 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-indigo-650 dark:text-indigo-400 font-bold text-[10px] tracking-wide rounded-full mb-6 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
            Apresentação Comercial PaxFlow
          </div>

          <!-- Headline -->
          <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6 text-slate-850 dark:text-white max-w-4xl mx-auto">
            A gestão operacional da sua <br class="hidden sm:block" />
            agência de viagens, <span class="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300">simplificada</span>.
          </h1>

          <!-- Subtitle -->
          <p class="text-sm md:text-base text-slate-550 dark:text-slate-400 font-medium max-w-2xl mb-10 leading-relaxed">
            Controle pós-vendas, automatize alertas de passaportes (SLA), concilie reembolsos de bilhetes aéreos e monitore sua rentabilidade real em uma plataforma viva e interativa.
          </p>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center gap-3.5 mb-20 w-full justify-center">
            <button id="btn-iniciar-demo" class="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-650/10 transition-all transform hover:-translate-y-0.5 uppercase flex items-center justify-center gap-2">
              Iniciar Demonstração (Sandbox)
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto px-7 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 hover:text-slate-850 dark:hover:text-white font-bold text-xs tracking-wider rounded-xl border border-slate-200 dark:border-slate-800 transition-all transform hover:-translate-y-0.5 uppercase shadow-sm">
              Acessar Sistema Real
            </button>
          </div>

          <!-- Section header for interactive tour -->
          <div class="w-full text-center mb-10">
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-855 dark:text-slate-200 tracking-tight">
              Explore a Plataforma
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Clique nos módulos abaixo para visualizar em tempo real como o PaxFlow organiza a operação
            </p>
          </div>

          <!-- Horizontal Pills bar (Stripe/Pitch style) -->
          <div class="w-full mb-8">
            <div class="flex flex-wrap justify-center gap-2 p-1.5 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl max-w-4xl mx-auto backdrop-blur-md shadow-sm">
              <button id="tab-btn-dashboard" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-200 bg-indigo-600 text-white shadow-md">
                📊 Dashboard
              </button>
              <button id="tab-btn-viagens" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200">
                ✈️ Viagens
              </button>
              <button id="tab-btn-orcamentos" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200">
                📋 Orçamentos
              </button>
              <button id="tab-btn-inbox" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200">
                💬 Inbox & SLAs
              </button>
              <button id="tab-btn-reembolsos" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200">
                💰 Reembolsos
              </button>
              <button id="tab-btn-relatorios" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200">
                📈 Relatórios
              </button>
              <button id="tab-btn-publicas" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200">
                🌐 Itinerários
              </button>
            </div>
          </div>

          <!-- Interactive UI Preview Container -->
          <div class="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl p-5 md:p-7 text-left relative overflow-hidden backdrop-blur-md flex flex-col justify-between min-h-[460px] transition-colors duration-300">
            
            <!-- Window top bar -->
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                <span class="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                <span class="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                <span id="window-path-text" class="text-[10px] text-slate-400 dark:text-slate-500 font-bold ml-2 font-mono">paxflow-comercial-dashboard.html</span>
              </div>
              <div class="flex gap-2">
                <span class="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[9px] rounded-lg">DEMO INTERATIVA</span>
              </div>
            </div>

            <!-- Content Panels -->
            <div id="mockup-panels-container" class="flex-1 flex flex-col justify-center">
              
              <!-- PANEL 1: DASHBOARD -->
              <div id="panel-dashboard" class="space-y-4 tab-pane-transition">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-850 p-4.5 rounded-2xl shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Faturamento Mensal</span>
                    <div class="flex items-baseline gap-2 mt-1">
                      <span class="text-xl font-black text-slate-855 dark:text-white">R$ 148.500,00</span>
                      <span class="text-[9px] text-emerald-500 font-extrabold">+14.2%</span>
                    </div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-850 p-4.5 rounded-2xl shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Taxa de Conversão</span>
                    <div class="flex items-baseline gap-2 mt-1">
                      <span class="text-xl font-black text-indigo-600 dark:text-indigo-400">24,8%</span>
                      <span class="text-[9px] text-slate-550 font-medium">Média de 2026</span>
                    </div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-850 p-4.5 rounded-2xl shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Ticket Médio</span>
                    <div class="flex items-baseline gap-2 mt-1">
                      <span class="text-xl font-black text-emerald-600 dark:text-emerald-450">R$ 6.200,00</span>
                      <span class="text-[9px] text-slate-550">Por Viagem</span>
                    </div>
                  </div>
                </div>

                <div class="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-855 rounded-2xl p-5">
                  <div class="flex items-center justify-between mb-4 border-b border-slate-200/50 dark:border-slate-805 pb-2.5">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-350">Funil Comercial Operativo</span>
                    <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold rounded-lg">Dados em Tempo Real</span>
                  </div>
                  
                  <div class="space-y-3">
                    <div>
                      <div class="flex justify-between text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-450">
                        <span>Orçamentos Criados</span>
                        <span>120</span>
                      </div>
                      <div class="w-full bg-slate-200/60 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-indigo-600 h-full w-[100%] rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <div class="flex justify-between text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-455">
                        <span>Propostas Enviadas</span>
                        <span>75 (62%)</span>
                      </div>
                      <div class="w-full bg-slate-200/60 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-indigo-550 h-full w-[62%] rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <div class="flex justify-between text-[10px] font-bold mb-1 text-slate-500 dark:text-slate-455">
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
                <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 rounded-xl overflow-hidden shadow-sm">
                  <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-[600px] text-[10px]">
                      <thead>
                        <tr class="bg-slate-50/50 dark:bg-slate-950/40 text-[9px] font-bold uppercase text-slate-450 dark:text-slate-505 border-b border-slate-200/60 dark:border-slate-800">
                          <th class="px-4 py-3 w-[50px] text-center">SLA</th>
                          <th class="px-4 py-3">Cliente / LOC</th>
                          <th class="px-4 py-3">Destino / Produtos</th>
                          <th class="px-4 py-3">Período</th>
                          <th class="px-4 py-3">Financeiro</th>
                          <th class="px-4 py-3 w-[120px]">Fase / Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-655 dark:text-slate-355 font-medium">
                        <tr class="bg-rose-50/5 dark:bg-rose-950/5 hover:bg-rose-50/15 dark:hover:bg-rose-950/10 transition-colors duration-200">
                          <td class="px-4 py-3 text-center"><span class="text-xs">⚠️</span></td>
                          <td class="px-4 py-3">
                            <div class="font-extrabold text-slate-850 dark:text-slate-150">Carlos Eduardo</div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[8px] rounded border border-slate-200/40 dark:border-slate-700/50 uppercase">BA921</span>
                          </td>
                          <td class="px-4 py-3">
                            <div class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">✈️ Buenos Aires</div>
                            <div class="flex gap-1 mt-1">
                              <span class="px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-black text-slate-550 dark:text-slate-400">✈️</span>
                            </div>
                          </td>
                          <td class="px-4 py-3 whitespace-nowrap">12/08/2026 a 19/08/2026</td>
                          <td class="px-4 py-3">
                            <div class="font-bold text-indigo-600 dark:text-indigo-400">R$ 5.400,00</div>
                            <div class="text-[8px] text-emerald-600 dark:text-emerald-455 font-bold mt-0.5">Rent: R$ 800,00</div>
                          </td>
                          <td class="px-4 py-3">
                            <span class="inline-flex px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-bold uppercase">Pré-Embarque</span>
                          </td>
                        </tr>
                        <tr class="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors duration-200">
                          <td class="px-4 py-3 text-center"><span class="text-xs">🟢</span></td>
                          <td class="px-4 py-3">
                            <div class="font-extrabold text-slate-855 dark:text-slate-150">Mariana Costa</div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[8px] rounded border border-slate-200/40 dark:border-slate-700/50 uppercase">US441</span>
                          </td>
                          <td class="px-4 py-3">
                            <div class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">✈️ Orlando</div>
                            <div class="flex gap-1 mt-1">
                              <span class="px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-black text-slate-550 dark:text-slate-400">🏨</span>
                              <span class="px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-black text-slate-550 dark:text-slate-400">🎫</span>
                            </div>
                          </td>
                          <td class="px-4 py-3 whitespace-nowrap">15/07/2026 a 30/07/2026</td>
                          <td class="px-4 py-3">
                            <div class="font-bold text-indigo-600 dark:text-indigo-400">R$ 12.800,00</div>
                            <div class="text-[8px] text-emerald-600 dark:text-emerald-455 font-bold mt-0.5">Rent: R$ 2.400,00</div>
                          </td>
                          <td class="px-4 py-3">
                            <span class="inline-flex px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-bold uppercase">Pós-Venda</span>
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
                  <div class="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 p-3 rounded-xl">
                    <span class="block font-extrabold text-slate-450 dark:text-slate-500 mb-2.5 uppercase text-[8px]">Novo (3)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Grécia / Lua de Mel</span>
                      <span class="block text-[8px] text-slate-450 mt-0.5">Ana Souza</span>
                      <span class="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1">R$ 24.000,00</span>
                    </div>
                  </div>
                  <!-- Em Análise -->
                  <div class="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 p-3 rounded-xl">
                    <span class="block font-extrabold text-slate-455 dark:text-slate-550 mb-2.5 uppercase text-[8px]">Em Análise (2)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Férias em Família</span>
                      <span class="block text-[8px] text-slate-455 mt-0.5">Pedro Santos</span>
                      <span class="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1">R$ 15.600,00</span>
                    </div>
                  </div>
                  <!-- Proposta -->
                  <div class="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-855 p-3 rounded-xl">
                    <span class="block font-extrabold text-slate-455 dark:text-slate-550 mb-2.5 uppercase text-[8px]">Proposta (4)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm border-l-2 border-l-amber-500">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Férias em Natal</span>
                      <span class="block text-[8px] text-slate-455 mt-0.5">Beatriz Oliveira</span>
                      <span class="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1">R$ 8.900,00</span>
                    </div>
                  </div>
                  <!-- Ganho -->
                  <div class="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-855 p-3 rounded-xl">
                    <span class="block font-extrabold text-slate-455 dark:text-slate-550 mb-2.5 uppercase text-[8px]">Ganho (9)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm border-l-2 border-l-emerald-500">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Mochilão Europa</span>
                      <span class="block text-[8px] text-slate-455 mt-0.5">Julio César</span>
                      <span class="block text-[9px] font-black text-emerald-600 dark:text-emerald-450 mt-1">R$ 18.200,00</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PANEL 4: INBOX & SLAS -->
              <div id="panel-inbox" class="space-y-4 tab-pane-transition hidden text-[10px]">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Sidebar list -->
                  <div class="md:col-span-1 space-y-2 border-r border-slate-200 dark:border-slate-850 pr-2">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ALERTAS RECENTES</span>
                    <div class="p-2 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 dark:border-rose-900/30 rounded-lg">
                      <div class="flex justify-between font-extrabold text-rose-600 dark:text-rose-455">
                        <span>⚠️ SLA Documentação</span>
                        <span>Urgente</span>
                      </div>
                      <span class="block text-slate-500 dark:text-slate-400 truncate mt-0.5">Maria Clara (Passaporte < 45d)</span>
                    </div>
                    <div class="p-2 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-250/60 dark:border-slate-855 rounded-lg">
                      <div class="flex justify-between font-bold text-slate-655 dark:text-slate-350">
                        <span>💬 Confirmação LOC</span>
                        <span>1h atrás</span>
                      </div>
                      <span class="block text-slate-500 dark:text-slate-455 truncate mt-0.5">Voo GRU-CDG confirmado</span>
                    </div>
                  </div>

                  <!-- Active Thread -->
                  <div class="md:col-span-2 space-y-3 flex flex-col justify-between min-h-[160px]">
                    <div class="space-y-2">
                      <div class="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-2">
                        <span class="font-extrabold text-slate-700 dark:text-slate-300">Thread: Alerta SLA - Maria Clara</span>
                        <span class="text-[8px] font-bold text-rose-555">Viagem em 15/12/2026</span>
                      </div>
                      <div class="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        <div class="p-2.5 bg-rose-500/10 border border-rose-500/20 dark:border-rose-900/30 rounded-xl">
                          <span class="font-extrabold text-rose-600 dark:text-rose-400">🚨 Sistema:</span>
                          <p class="text-slate-650 dark:text-slate-400 mt-0.5 leading-normal">Atenção! Passaporte da passageira vence em menos de 6 meses no dia da viagem.</p>
                        </div>
                        <div class="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl text-right ml-4">
                          <span class="font-extrabold text-slate-700 dark:text-slate-300">Consultor João:</span>
                          <p class="text-slate-650 dark:text-slate-400 mt-0.5 leading-normal">Solicitação de renovação já está em andamento. O novo número será atualizado em breve.</p>
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
                  <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 text-[8px] font-bold rounded-lg">R$ 6.230,00 Pendente</span>
                </div>
                <div class="overflow-x-auto text-[10px]">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                        <th class="pb-2 font-bold uppercase text-[8px]">Passageiro</th>
                        <th class="pb-2 font-bold uppercase text-[8px]">Fornecedor</th>
                        <th class="pb-2 font-bold uppercase text-[8px]">Valor</th>
                        <th class="pb-2 font-bold uppercase text-[8px]">Etapa</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-350">
                      <tr>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">Felipe Melo</td>
                        <td class="py-2.5">Latam Airlines</td>
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
                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-850 p-4 rounded-xl text-left space-y-1">
                    <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Conversão</span>
                    <div class="flex items-baseline gap-1.5">
                      <span class="text-base font-black text-slate-855 dark:text-white">28,4%</span>
                      <span class="text-[8px] text-emerald-500 font-bold">+4.8% este mês</span>
                    </div>
                    <div class="w-full bg-slate-200/50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex mt-2">
                      <div class="bg-emerald-500 h-full" style="width: 28.4%"></div>
                    </div>
                  </div>

                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-850 p-4 rounded-xl text-left space-y-1">
                    <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Markup Médio</span>
                    <div class="flex items-baseline gap-1.5">
                      <span class="text-base font-black text-slate-855 dark:text-white">18,5%</span>
                      <span class="text-[8px] text-indigo-500 font-bold">Meta de Markup</span>
                    </div>
                    <div class="w-full bg-slate-200/50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex mt-2">
                      <div class="bg-indigo-500 h-full" style="width: 74%"></div>
                    </div>
                  </div>

                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-855 p-4 rounded-xl text-left space-y-1">
                    <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Pipeline Ponderado</span>
                    <div class="flex items-baseline gap-1.5">
                      <span class="text-base font-black text-slate-855 dark:text-white">R$ 115.800,00</span>
                    </div>
                    <span class="text-[8px] text-slate-450 block mt-2">Próximos 30 dias de embarques</span>
                  </div>
                </div>
              </div>

              <!-- PANEL 7: PUBLICAS -->
              <div id="panel-publicas" class="space-y-4 tab-pane-transition hidden text-[10px]">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Public Itinerary Card -->
                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-850 p-4 rounded-xl text-left space-y-2">
                    <span class="text-[8px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block">🌐 Itinerário Digital</span>
                    <p class="text-[10px] text-slate-555 dark:text-slate-400 leading-normal">
                      O cliente acompanha voos, hotéis e vouchers de forma responsiva, organizada por dias com contagem regressiva, sem precisar baixar aplicativos.
                    </p>
                  </div>

                  <!-- Public NPS Card -->
                  <div class="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-850 p-4 rounded-xl text-left space-y-2">
                    <span class="text-[8px] font-bold text-emerald-600 dark:text-emerald-455 uppercase tracking-wider block">⭐ Pesquisa NPS</span>
                    <p class="text-[10px] text-slate-555 dark:text-slate-400 leading-normal">
                      Pesquisa rápida pós-viagem para avaliar o serviço do consultor, alimentando as estatísticas do painel administrativo automaticamente.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </main>

        <!-- Seção White-Label Preview Tool -->
        <section class="w-full bg-slate-100/30 dark:bg-slate-950/10 py-16 px-6 relative z-10 border-t border-slate-200/40 dark:border-slate-900/40">
          <div class="max-w-5xl mx-auto">
            <div class="text-center max-w-2xl mx-auto mb-10">
              <span class="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider rounded-full">Exclusivo White-Label</span>
              <h2 class="text-xl md:text-2xl font-extrabold text-slate-850 dark:text-white tracking-tight mt-3">
                Sua Marca, Suas Cores
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Veja em tempo real como o itinerário digital do seu passageiro se adapta à identidade visual da sua agência:
              </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-4xl mx-auto">
              <!-- Customization settings -->
              <div class="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-center space-y-4 shadow-sm">
                <div>
                  <label class="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase mb-1.5">Nome da Sua Agência</label>
                  <input id="wl-input-name" type="text" value="Minha Agência de Viagens" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-150 font-semibold text-xs font-sans" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase mb-1.5">Cor Principal da Marca</label>
                  <div class="flex items-center gap-3">
                    <input id="wl-input-color" type="color" value="#4f46e5" class="w-8 h-8 border-0 rounded-lg cursor-pointer bg-transparent" />
                    <span id="wl-color-hex" class="text-[10px] font-mono font-bold text-slate-500">#4F46E5</span>
                  </div>
                </div>
                <div class="text-[9px] text-slate-455 dark:text-slate-500 leading-normal pt-2.5 border-t border-slate-100 dark:border-slate-855">
                  💡 No PaxFlow real, as cores e a marca da sua agência são aplicadas automaticamente em todos os itinerários digitais acessados pelos seus clientes.
                </div>
              </div>

              <!-- Live dynamic preview -->
              <div class="lg:col-span-8 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                <!-- Preview Header -->
                <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-855 pb-2.5 mb-3.5">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                    <span class="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                    <span class="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                  </div>
                  <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ITINERÁRIO DO CLIENTE</span>
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
                      <span class="text-[8px] font-mono font-bold bg-slate-50 dark:bg-slate-955 text-slate-450 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">VIA-2026</span>
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
        <section class="w-full bg-slate-50/50 dark:bg-slate-955/20 border-t border-slate-200/40 dark:border-slate-900/40 py-16 px-6 relative z-10">
          <div class="max-w-5xl mx-auto">
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-855 dark:text-white tracking-tight text-center mb-10">
              Por que substituir as planilhas pelo PaxFlow?
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              
              <!-- Column 1: The Pain -->
              <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500/5 text-rose-600 dark:text-rose-455 text-[9px] font-bold rounded-lg uppercase tracking-wider mb-4">
                  ❌ Como é hoje (Desorganização)
                </div>
                <ul class="space-y-3 text-[10px] text-slate-555 dark:text-slate-400 font-medium">
                  <li class="flex items-start gap-2">
                    <span class="text-rose-500 shrink-0">⚠️</span>
                    <span>Planilhas e dados dispersos, dificultando o cálculo de margens.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-rose-500 shrink-0">⚠️</span>
                    <span>Risco de embarque bloqueado por passaportes e vistos expirados.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-rose-500 shrink-0">⚠️</span>
                    <span>Histórico de mensagens perdido no WhatsApp particular dos consultores.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-rose-500 shrink-0">⚠️</span>
                    <span>Dificuldade em gerenciar e conciliar bilhetes de reembolsos.</span>
                  </li>
                </ul>
              </div>

              <!-- Column 2: The Solution -->
              <div class="p-5 bg-indigo-50/10 dark:bg-slate-900 border border-indigo-100/50 dark:border-slate-800 rounded-2xl shadow-sm">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-455 text-[9px] font-bold rounded-lg uppercase tracking-wider mb-4">
                  ✅ Com o PaxFlow (Produtividade)
                </div>
                <ul class="space-y-3 text-[10px] text-slate-650 dark:text-slate-350 font-medium">
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✨</span>
                    <span><strong>Dashboard unificado</strong> com markup e faturamento atualizados.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✨</span>
                    <span><strong>Alertas de SLA</strong> que notificam automaticamente sobre vencimentos.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✨</span>
                    <span><strong>Fidelidade e pós-vendas</strong> integrados aos localizadores (LOC).</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✨</span>
                    <span><strong>Central de reembolsos</strong> integrada para controle de créditos e fornecedores.</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        <!-- Stats Counters -->
        <section class="w-full py-12 px-6 bg-white dark:bg-slate-950 border-t border-slate-200/40 dark:border-slate-900/40 relative z-10">
          <div class="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <span class="block text-2xl font-black text-slate-855 dark:text-white">15.000+</span>
              <span class="block text-[8px] font-bold uppercase text-slate-455 mt-1 tracking-wider">Passageiros Atendidos</span>
            </div>
            <div>
              <span class="block text-2xl font-black text-slate-855 dark:text-white">98,6%</span>
              <span class="block text-[8px] font-bold uppercase text-slate-455 mt-1 tracking-wider">Satisfação (NPS Médio)</span>
            </div>
            <div>
              <span class="block text-2xl font-black text-indigo-600 dark:text-indigo-400">70%</span>
              <span class="block text-[8px] font-bold uppercase text-slate-455 mt-1 tracking-wider">Menos Trabalho Manual</span>
            </div>
            <div>
              <span class="block text-2xl font-black text-emerald-600 dark:text-emerald-450">24/7</span>
              <span class="block text-[8px] font-bold uppercase text-slate-455 mt-1 tracking-wider">Alertas e SLAs de Voo</span>
            </div>
          </div>
        </section>

        <!-- FAQ Section -->
        <section class="w-full bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200/40 dark:border-slate-900/40 py-16 px-6 relative z-10">
          <div class="max-w-3xl mx-auto">
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-855 dark:text-white tracking-tight text-center mb-10">
              Perguntas Frequentes
            </h2>
            
            <div class="space-y-3.5">
              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden" open>
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">O que é o Modo de Demonstração (Sandbox)?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-550/10 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-[10px] leading-relaxed text-slate-550 dark:text-slate-400 font-medium">
                  É um ambiente de simulação completo, pré-populado com dados fictícios (clientes, orçamentos, históricos de conversas, e dados de faturamento). Ele permite que você explore todas as funcionalidades operacionais da plataforma sem precisar configurar conexões reais.
                </p>
              </details>

              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">As alterações feitas no Modo Demo são salvas?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-550/10 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-[10px] leading-relaxed text-slate-550 dark:text-slate-400 font-medium">
                  As alterações são gravadas localmente no armazenamento do seu navegador (localStorage proxy). Respeitando o lema "reiniciou, perdeu", os dados são limpos e reiniciados a cada novo acesso à demonstração, garantindo um ambiente sempre limpo para testes.
                </p>
              </details>

              <details class="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">Como funciona o controle de passaportes e SLAs?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-550/10 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-[10px] leading-relaxed text-slate-550 dark:text-slate-400 font-medium">
                  O PaxFlow varre a validade dos passaportes de todos os passageiros vinculados a viagens ativas. Se algum documento possuir validade inferior a 6 meses do dia do embarque, o sistema emite um alerta automático no Inbox do consultor responsável para evitar multas ou cancelamentos no aeroporto.
                </p>
              </details>
            </div>

          </div>
        </section>

        <!-- Footer -->
        <footer class="w-full bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-900/60 py-6 px-6 text-center text-[10px] text-slate-450 font-medium relative z-10">
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

    // Lógica da Demo Interativa (Feature Tour com Layout Horizontal - Stripe Style)
    const tabs = ['dashboard', 'viagens', 'orcamentos', 'inbox', 'reembolsos', 'relatorios', 'publicas'];
    const pathTexts: { [key: string]: string } = {
      dashboard: 'paxflow-comercial-dashboard.html',
      viagens: 'paxflow-controle-operacional-viagens.html',
      orcamentos: 'paxflow-crm-orcamentos-kanban.html',
      inbox: 'paxflow-inbox-p2p-threads.html',
      reembolsos: 'paxflow-gestao-de-reembolsos.html',
      relatorios: 'paxflow-relatorios-estatisticos-e-predicoes.html',
      publicas: 'paxflow-itinerarios-publicos-nps.html'
    };

    tabs.forEach(tab => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      btn?.addEventListener('click', () => {
        // Desativar todas as abas
        tabs.forEach(t => {
          const b = document.getElementById(`tab-btn-${t}`);
          if (b) {
            b.className = "px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200";
          }
          const panel = document.getElementById(`panel-${t}`);
          panel?.classList.add('hidden');
        });

        // Ativar aba clicada
        if (btn) {
          btn.className = "px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-200 bg-indigo-600 text-white shadow-md";
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

    // Lógica da ferramenta White-Label Preview
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
