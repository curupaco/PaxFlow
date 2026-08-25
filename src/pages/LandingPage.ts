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
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Theme Toggle Button -->
            <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/40 dark:border-slate-800/40 flex items-center justify-center shadow-sm">
              <svg width="15" height="15" class="w-3.5 h-3.5 theme-icon-light" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg width="15" height="15" class="w-3.5 h-3.5 theme-icon-dark" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <button id="btn-header-whatsapp" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5 shrink-0">
              <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
              <span class="hidden sm:inline">WhatsApp</span>
            </button>

            <button id="btn-acessar-login" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-950 dark:border-slate-700 transition shadow-sm">
              Acessar Sistema
            </button>
          </div>
        </header>

        <!-- Hero Section -->
        <main class="w-full max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-12 text-center relative z-10 flex flex-col items-center justify-center">
          
          <!-- Label Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px] tracking-wide rounded-full mb-6 shadow-sm">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            O CRM & PÓS-VENDA 100% ESPECIALIZADO EM TURISMO
          </div>

          <!-- Headline -->
          <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6 text-slate-800 dark:text-white max-w-4xl mx-auto">
            A gestão operacional da sua <br class="hidden sm:block" />
            agência de viagens, <span class="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300">simplificada</span>.
          </h1>

          <!-- Subtitle -->
          <p class="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium max-w-2xl mb-8 leading-relaxed">
            Abandone as planilhas manuais e a desorganização. Centralize pós-vendas, controle de passaportes e vistos, conciliação de reembolsos aéreos, escala de funcionários e itinerários em uma plataforma viva e intuitiva.
          </p>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center gap-3.5 mb-10 w-full justify-center">
            <button id="btn-iniciar-demo" class="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-xl transition-all transform hover:-translate-y-0.5 uppercase flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Iniciar Demonstração (Sandbox)
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto px-7 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white font-bold text-xs tracking-wider rounded-xl border border-slate-200 dark:border-slate-800 transition-all transform hover:-translate-y-0.5 uppercase shadow-sm">
              Entrar no Sistema Real
            </button>
          </div>

          <!-- Stat Highlights Bar (Na Cara Impact) -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mx-auto mb-16 p-4 bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md shadow-sm">
            <div class="p-2.5 text-center">
              <span class="block text-xl font-black text-indigo-600 dark:text-indigo-400">100%</span>
              <span class="text-[9px] font-extrabold text-slate-500 uppercase tracking-wide">Focado em Turismo</span>
            </div>
            <div class="p-2.5 text-center">
              <span class="block text-xl font-black text-rose-600 dark:text-rose-400">180 dias</span>
              <span class="text-[9px] font-extrabold text-slate-500 uppercase tracking-wide">Alerta Vistos & Passaporte</span>
            </div>
            <div class="p-2.5 text-center">
              <span class="block text-xl font-black text-emerald-600 dark:text-emerald-400">Escala + Banco</span>
              <span class="text-[9px] font-extrabold text-slate-500 uppercase tracking-wide">Gestão de Equipe</span>
            </div>
            <div class="p-2.5 text-center">
              <span class="block text-xl font-black text-amber-500 dark:text-amber-400">WhatsApp SLA</span>
              <span class="text-[9px] font-extrabold text-slate-500 uppercase tracking-wide">Hub Digisac Integrado</span>
            </div>
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
              
              <button id="tab-btn-escala" class="px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Escala da Equipe
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
                <!-- Informational banner -->
                <div class="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span class="text-base">💡</span>
                  <span><strong>Visão Comercial Unificada:</strong> O PaxFlow calcula automaticamente o faturamento bruto, a margem de comissão da agência, o ticket médio por cliente e a taxa de conversão da equipe comercial sem exigir planilhas manuais.</span>
                </div>

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
                <div class="p-3 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span class="text-base">✈️</span>
                  <span><strong>Operação de Pós-Venda:</strong> Acompanhe todas as viagens por localizador (LOC), período de viagem e rentabilidade. O ícone de SLA (⚠️) avisa preventivamente quando o passaporte do cliente necessita de atenção imediata.</span>
                </div>
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
                            <div class="font-extrabold text-slate-800 dark:text-slate-150">Passageiro Demo 01</div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[8px] rounded border border-slate-300/40 dark:border-slate-700/50 uppercase">BA921</span>
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
                            <div class="font-extrabold text-slate-800 dark:text-slate-150">Passageira Demo 02</div>
                            <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[8px] rounded border border-slate-300/40 dark:border-slate-700/50 uppercase">US441</span>
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
                <div class="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span class="text-base">🎯</span>
                  <span><strong>CRM Comercial de Alta Performance:</strong> Arraste cards entre os estágios do funil. O sistema arquiva automaticamente propostas paradas há mais de 30 dias para evitar acúmulo de leads frios.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-[10px]">
                  <!-- Novo -->
                  <div class="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 dark:text-slate-400 mb-2.5 uppercase text-[8px]">Novo (3)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Grécia / Lua de Mel</span>
                      <span class="block text-[8px] text-slate-400 mt-0.5">Cliente Exemplo 01</span>
                      <span class="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1">R$ 24.000,00</span>
                    </div>
                  </div>
                  <!-- Em Análise -->
                  <div class="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 dark:text-slate-400 mb-2.5 uppercase text-[8px]">Em Análise (2)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Férias em Família</span>
                      <span class="block text-[8px] text-slate-400 mt-0.5">Cliente Exemplo 02</span>
                      <span class="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1">R$ 15.600,00</span>
                    </div>
                  </div>
                  <!-- Proposta -->
                  <div class="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 dark:text-slate-400 mb-2.5 uppercase text-[8px]">Proposta (4)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm border-l-2 border-l-amber-500">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Férias em Natal</span>
                      <span class="block text-[8px] text-slate-400 mt-0.5">Cliente Exemplo 03</span>
                      <span class="block text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1">R$ 8.900,00</span>
                    </div>
                  </div>
                  <!-- Ganho -->
                  <div class="bg-slate-50/70 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 dark:text-slate-400 mb-2.5 uppercase text-[8px]">Ganho (9)</span>
                    <div class="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm border-l-2 border-l-emerald-500">
                      <span class="block font-bold text-slate-800 dark:text-slate-200 truncate">Mochilão Europa</span>
                      <span class="block text-[8px] text-slate-400 mt-0.5">Cliente Exemplo 04</span>
                      <span class="block text-[9px] font-black text-emerald-600 dark:text-emerald-450 mt-1">R$ 18.200,00</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PANEL 4: INBOX & SLAS -->
              <div id="panel-inbox" class="space-y-4 tab-pane-transition hidden text-[10px]">
                <div class="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span class="text-base">🔔</span>
                  <span><strong>Alertas e Comunicação WhatsApp:</strong> Receba notificações automáticas de SLA de passaporte (validade < 180 dias) e integre o atendimento Digisac diretamente na tela do sistema.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Sidebar list -->
                  <div class="md:col-span-1 space-y-2 border-r border-slate-200 dark:border-slate-800 pr-3">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ALERTAS RECENTES</span>
                    <div class="p-2 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 dark:border-rose-900/30 rounded-xl">
                      <div class="flex justify-between font-extrabold text-rose-600 dark:text-rose-455">
                        <span>SLA Passaporte</span>
                        <span>Urgente</span>
                      </div>
                      <span class="block text-slate-500 dark:text-slate-400 truncate mt-0.5">Passageira Demo 03 (Validade < 180d)</span>
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
                        <span class="font-extrabold text-slate-700 dark:text-slate-300">Thread: Alerta SLA - Passageira Demo 03</span>
                        <span class="text-[8px] font-bold text-rose-555">Viagem em 15/12/2026</span>
                      </div>
                      <div class="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        <div class="p-2.5 bg-rose-500/10 border border-rose-500/20 dark:border-rose-900/30 rounded-xl">
                          <span class="font-extrabold text-rose-600 dark:text-rose-400">Sistema:</span>
                          <p class="text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">Atenção! Passaporte da passageira vence em menos de 6 meses no dia da viagem.</p>
                        </div>
                        <div class="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-right ml-4">
                          <span class="font-extrabold text-slate-700 dark:text-slate-300">Consultor Demo:</span>
                          <p class="text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">Solicitação de renovação já está em andamento. O novo número será atualizado em breve.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PANEL ESCALA -->
              <div id="panel-escala" class="space-y-4 tab-pane-transition hidden text-[10px]">
                <div class="p-3 bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span class="text-base">👥</span>
                  <span><strong>Central Administrativa de Escala:</strong> Grade mensal de horários de trabalho, controle automático de saldos no Banco de Folgas, aprovação de trocas de turno e mural de treinamentos/eventos.</span>
                </div>
                <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <span class="font-extrabold text-slate-800 dark:text-slate-100 text-xs">Escala Mensal da Equipe — Agosto 2026</span>
                    <span class="block text-[9px] text-slate-400">Controle de turnos, banco de folgas e eventos da agência</span>
                  </div>
                  <span class="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold text-[9px] rounded-lg">Central Administrativa</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                    <span class="font-bold text-slate-700 dark:text-slate-300 block">Grade de Turnos (Visão da Agência)</span>
                    <p class="text-[9px] text-slate-500 dark:text-slate-400">Tabela interativa com cores por horário (10-17, 12-19, 14-21, 15-22, Folga, Férias) e coluna fixa de equipe.</p>
                  </div>
                  <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                    <span class="font-bold text-slate-700 dark:text-slate-300 block">Trocas & Banco de Folgas</span>
                    <p class="text-[9px] text-slate-500 dark:text-slate-400">Fluxo de aceite duplo entre consultores com aprovação da gestão no Inbox e controle de saldos.</p>
                  </div>
                </div>
              </div>

              <!-- PANEL 5: REEMBOLSOS -->
              <div id="panel-reembolsos" class="space-y-3 tab-pane-transition hidden text-[10px]">
                <div class="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span class="text-base">💸</span>
                  <span><strong>Conciliação de Estornos Aéreos:</strong> Acompanhe cada etapa dos reembolsos junto às cias aéreas e fornecedores. Anexe comprovantes e não deixe nenhum crédito da agência esquecido.</span>
                </div>
                <div class="flex justify-between items-center mb-1">
                  <span class="font-bold text-slate-700 dark:text-slate-300">Reembolsos e Créditos Pendentes</span>
                  <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 text-[8px] font-bold rounded-lg border border-emerald-500/20">R$ 6.230,00 pendente</span>
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
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">Passageiro Demo 04</td>
                        <td class="py-2.5">LATAM Airlines</td>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">R$ 1.850,00</td>
                        <td class="py-2.5"><span class="px-1.5 py-0.5 bg-rose-500/10 text-rose-555 border border-rose-500/20 text-[8px] font-bold rounded-md uppercase">Solicitado</span></td>
                      </tr>
                      <tr>
                        <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">Passageira Demo 05</td>
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
                <div class="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span class="text-base">📊</span>
                  <span><strong>Relatórios e Inteligência Financeira:</strong> Acompanhe markups médios por produto, taxa de fechamento global da equipe e projeções de receitas para os próximos 30, 60 e 90 dias.</span>
                </div>
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
                <div class="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span class="text-base">🌟</span>
                  <span><strong>Itinerários Digitais VIP & Pesquisa NPS:</strong> Gere links públicos de viagem adaptados com as cores da sua agência. Seu cliente acessa vouchers, mapas e responde à avaliação NPS pós-viagem no celular.</span>
                </div>
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

            <!-- All Modules at a Glance Grid (No Clicking Required - Na Cara!) -->
            <div class="w-full mt-12 pt-10 border-t border-slate-200/60 dark:border-slate-800 text-left">
              <div class="text-center max-w-2xl mx-auto mb-10 space-y-2">
                <span class="px-3 py-1 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">
                  Visão Geral de Todos os Módulos
                </span>
                <h3 class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                  Tudo o que a sua agência precisa em um único lugar
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Sem precisar clicar: confira o resumo visual das 6 principais telas do PaxFlow
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                <!-- Card 1: Dashboard Comercial -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                      </span>
                      <span class="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">Módulo 01</span>
                    </div>
                    <h4 class="text-sm font-extrabold text-slate-800 dark:text-white">Painel Comercial & Faturamento</h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Visão em tempo real de receitas, ticket médio por viagem, markups da agência e funil comercial consolidado.
                    </p>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span class="text-[8px] font-black text-slate-400 uppercase">Faturamento Mês</span>
                    <strong class="block text-xs font-black text-slate-800 dark:text-white">R$ 148.500,00 <span class="text-[9px] text-emerald-500">+14%</span></strong>
                  </div>
                </div>

                <!-- Card 2: Operação de Viagens -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="p-2 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                      </span>
                      <span class="text-[9px] font-black uppercase text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded">Módulo 02</span>
                    </div>
                    <h4 class="text-sm font-extrabold text-slate-800 dark:text-white">Operação de Viagens & Pós-Venda</h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Gestão completa de localizadores (LOC), cartões de embarque, vouchers de hotéis e régua de contato pré e pós-viagem.
                    </p>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span class="text-[8px] font-black text-slate-400 uppercase">Status Operacional</span>
                    <strong class="block text-xs font-black text-sky-600 dark:text-sky-400">18 Viagens Ativas • 0 Incidentes</strong>
                  </div>
                </div>

                <!-- Card 3: CRM de Orçamentos -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                      </span>
                      <span class="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">Módulo 03</span>
                    </div>
                    <h4 class="text-sm font-extrabold text-slate-800 dark:text-white">CRM Comercial & Funil Kanban</h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Funil de propostas especializado em pacotes com preenchimento obrigatório de campos turísticos no fechamento.
                    </p>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span class="text-[8px] font-black text-slate-400 uppercase">Taxa de Fechamento</span>
                    <strong class="block text-xs font-black text-emerald-600 dark:text-emerald-400">28,4% de Conversão</strong>
                  </div>
                </div>

                <!-- Card 4: Central de Escala -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="p-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      </span>
                      <span class="text-[9px] font-black uppercase text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950 px-2 py-0.5 rounded">Módulo 04</span>
                    </div>
                    <h4 class="text-sm font-extrabold text-slate-800 dark:text-white">Escala de Funcionários & Folgas</h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Matriz mensal de turnos, solicitações de trocas de horário e controle de Banco de Folgas da equipe.
                    </p>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span class="text-[8px] font-black text-slate-400 uppercase">Controle de Horários</span>
                    <strong class="block text-xs font-black text-violet-600 dark:text-violet-400">100% da Equipe Escala Ativa</strong>
                  </div>
                </div>

                <!-- Card 5: Alertas Vistos & Digisac -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      </span>
                      <span class="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded">Módulo 05</span>
                    </div>
                    <h4 class="text-sm font-extrabold text-slate-800 dark:text-white">Alertas de Vistos & Hub Digisac</h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Notificações com 180 dias de antecedência para vistos/passaportes e integração nativa ao WhatsApp Digisac.
                    </p>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span class="text-[8px] font-black text-slate-400 uppercase">SLA Preventivo</span>
                    <strong class="block text-xs font-black text-rose-600 dark:text-rose-400">Zero Embarques com Documento Vencido</strong>
                  </div>
                </div>

                <!-- Card 6: Reembolsos Cias Aéreas -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </span>
                      <span class="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">Módulo 06</span>
                    </div>
                    <h4 class="text-sm font-extrabold text-slate-800 dark:text-white">Central de Reembolsos Aéreos</h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Controle estornos, créditos e pendências com companhias aéreas sem esquecimento de valores.
                    </p>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span class="text-[8px] font-black text-slate-400 uppercase">Conciliação Financeira</span>
                    <strong class="block text-xs font-black text-emerald-600 dark:text-emerald-400">100% de Créditos Recuperados</strong>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </main>

        <!-- Brand Identity Showcase (Carrossel Automático 3s - Sem inputs) -->
        <section class="w-full bg-slate-100/50 dark:bg-slate-950/20 py-20 px-6 relative z-10 border-t border-slate-200/50 dark:border-slate-900/50">
          <div class="max-w-6xl mx-auto space-y-12">
            
            <div class="text-center max-w-3xl mx-auto space-y-3">
              <span class="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest rounded-full">
                Identidade Visual da Sua Agência
              </span>
              <h2 class="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                Sua Marca, Seu Logotipo e Suas Cores em Cada Ponto de Contato
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Toda a comunicação enviada ao seu passageiro carrega o logotipo oficial, o nome e a paleta de cores da sua própria agência — sem marcas de terceiros ou dados genéricos.
              </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
              <!-- Left Side: Brand Point Selector Menu -->
              <div class="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl space-y-3 shadow-md flex flex-col justify-between">
                <div class="space-y-2.5">
                  <span class="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">Canais com Sua Marca</span>

                  <button id="brand-tab-itinerario" class="w-full p-3.5 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-indigo-600 text-white shadow-md">
                    <span class="p-2 bg-white/20 rounded-xl text-xs">📱</span>
                    <div>
                      <strong class="block text-xs font-black">01. Itinerário Digital VIP</strong>
                      <span class="text-[10px] opacity-90 font-medium leading-normal block mt-0.5">Página do cliente com logo, cores e timeline no celular.</span>
                    </div>
                  </button>

                  <button id="brand-tab-voucher" class="w-full p-3.5 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                    <span class="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs">📄</span>
                    <div>
                      <strong class="block text-xs font-extrabold">02. Vouchers PDF com Logomarca</strong>
                      <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-normal block mt-0.5">Documento impresso de reserva com cabeçalho oficial.</span>
                    </div>
                  </button>

                  <button id="brand-tab-nps" class="w-full p-3.5 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                    <span class="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs">⭐</span>
                    <div>
                      <strong class="block text-xs font-extrabold">03. Pesquisa NPS Customizada</strong>
                      <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed block mt-0.5">Avaliação pós-viagem com sua paleta de cores.</span>
                    </div>
                  </button>

                  <button id="brand-tab-whatsapp" class="w-full p-3.5 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                    <span class="p-2 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl text-xs">💬</span>
                    <div>
                      <strong class="block text-xs font-extrabold">04. Notificações no WhatsApp</strong>
                      <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed block mt-0.5">Avisos automáticos de embarque com dados da agência.</span>
                    </div>
                  </button>
                </div>

                <div class="text-[10px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <span class="text-base">💡</span>
                  <span><strong>Configuração em 1 clique:</strong> Basta fazer upload da sua logomarca em <em>Configurações</em> e todos os 4 canais são atualizados instantaneamente.</span>
                </div>
              </div>

              <!-- Right Side: Auto-Rotating Mockup Card (3s timer) -->
              <div class="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[380px]">
                
                <!-- Header of Preview -->
                <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                    <span class="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                    <span class="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    <span id="brand-preview-title" class="text-[10px] font-black text-slate-600 dark:text-slate-300 ml-2 uppercase tracking-wide">
                      01. Itinerário Digital no Celular
                    </span>
                  </div>
                  <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold text-[9px] rounded-md">
                    ROTAÇÃO AUTOMÁTICA (3S)
                  </span>
                </div>

                <!-- Content Panels for Brand Touchpoints -->
                <div id="brand-panels-container" class="flex-1 flex flex-col justify-center">

                  <!-- PANEL 1: ITINERARIO DIGITAL -->
                  <div id="brand-panel-itinerario" class="space-y-4 tab-pane-transition">
                    <div class="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                        <div class="flex items-center gap-3">
                          <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-base shadow-sm font-black">
                            ✈️
                          </div>
                          <div>
                            <strong class="block text-sm font-extrabold text-slate-800 dark:text-white">Sua Agência de Viagens</strong>
                            <span class="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Itinerário Digital do Cliente</span>
                          </div>
                        </div>
                        <span class="text-[9px] font-mono font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900">LOC: PAX-8840</span>
                      </div>

                      <div class="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span class="block text-[9px] font-bold text-slate-400 uppercase">Passageiro VIP</span>
                          <strong class="block text-slate-800 dark:text-slate-200">Passageiro Fictício (Exemplo)</strong>
                        </div>
                        <div>
                          <span class="block text-[9px] font-bold text-slate-400 uppercase">Destino & Data</span>
                          <strong class="block text-slate-800 dark:text-slate-200">Paris, França • 14/10/2026</strong>
                        </div>
                      </div>

                      <button class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition">
                        Ver Detalhes do Voo & Vouchers Protegidos
                      </button>
                    </div>
                  </div>

                  <!-- PANEL 2: VOUCHER PDF -->
                  <div id="brand-panel-voucher" class="space-y-4 tab-pane-transition hidden">
                    <div class="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                        <div class="flex items-center gap-3">
                          <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-base shadow-sm font-black">
                            📄
                          </div>
                          <div>
                            <strong class="block text-sm font-extrabold text-slate-800 dark:text-white">Voucher Oficial de Confirmação</strong>
                            <span class="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Documento PDF com Logotipo da Sua Agência</span>
                          </div>
                        </div>
                        <span class="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg">RESERVA CONFIRMADA</span>
                      </div>

                      <div class="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">Companhia Aérea & Voo</span>
                        <strong class="block text-slate-800 dark:text-slate-200">Air France • Voo AF-443 (GRU ✈️ CDG)</strong>
                        <span class="block text-[9px] text-slate-500">Cabine Executiva • Assento 4A • Bilhete: 057-24901928</span>
                      </div>
                    </div>
                  </div>

                  <!-- PANEL 3: PESQUISA NPS -->
                  <div id="brand-panel-nps" class="space-y-4 tab-pane-transition hidden">
                    <div class="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-center">
                      <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black mx-auto shadow-md">
                        ⭐
                      </div>
                      <div>
                        <strong class="block text-sm font-extrabold text-slate-800 dark:text-white">Como foi sua experiência com a Sua Agência?</strong>
                        <span class="block text-[10px] text-slate-500 font-medium">Sua avaliação ajuda a premiar nosso consultor de viagens</span>
                      </div>

                      <div class="flex justify-center gap-1.5 pt-1">
                        <span class="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs font-black text-slate-400">8</span>
                        <span class="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs font-black text-slate-400">9</span>
                        <span class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-md">10</span>
                      </div>
                    </div>
                  </div>

                  <!-- PANEL 4: NOTIFICAÇÃO WHATSAPP -->
                  <div id="brand-panel-whatsapp" class="space-y-4 tab-pane-transition hidden">
                    <div class="bg-emerald-950/20 dark:bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-2.5 text-left text-xs">
                      <div class="flex items-center gap-2 border-b border-emerald-500/20 pb-2">
                        <div class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                          💬
                        </div>
                        <div>
                          <strong class="block text-slate-800 dark:text-slate-100 font-extrabold text-xs">Sua Agência de Viagens (WhatsApp Oficial)</strong>
                          <span class="block text-[8px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Mensagem Automática PaxFlow</span>
                        </div>
                      </div>

                      <p class="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        "Olá! 👋 Sua viagem para Paris está se aproximando! Acesse o seu <strong>Itinerário Digital Oficial</strong> da Sua Agência no link: <span class="text-indigo-600 dark:text-indigo-400 underline font-bold">suaagencia.paxflow.com/itinerario/PAX-8840</span>"
                      </p>
                    </div>
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
                    <span>Automações inteligentes de fluxo (transições automáticas de status para orçamentos, embarques e reembolsos).</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✓</span>
                    <span>Fichas de clientes e central de reembolsos unificadas.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✓</span>
                    <span>Central de Cadastros unificada (Serviços, Destinos, Recebimentos, Campanhas, Metas e Modelos de Mensagem).</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-500 shrink-0">✓</span>
                    <span>Hub de Mensagens com histórico Digisac split-screen e editor de variáveis visual.</span>
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

        <!-- Complete Feature Guide & Tourism Differentials Section (Guia Completo) -->
        <section class="w-full bg-slate-100/40 dark:bg-slate-900/20 py-20 px-6 border-t border-slate-200/50 dark:border-slate-900/50 relative z-10">
          <div class="max-w-6xl mx-auto space-y-20">
            
            <!-- Section Header -->
            <div class="text-center max-w-3xl mx-auto space-y-3">
              <span class="px-3 py-1 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest rounded-full">
                Guia Completo de Recursos
              </span>
              <h2 class="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                Tudo o que sua agência precisa para escalar com controle total
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Conheça em detalhes cada um dos 6 pilares vitais do PaxFlow, desenvolvidos sob medida para resolver os gargalos de vendas, atendimento e pós-venda de turismo.
              </p>
            </div>

            <!-- PILLAR 1: OPERAÇÃO DE VIAGENS & SLAS PREVENTIVOS -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900 p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
              <div class="lg:col-span-6 space-y-4">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase rounded-lg border border-rose-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  Pilar 01 • Segurança & Pós-Venda
                </div>
                <h3 class="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  Operação de Viagens e Alertas Preventivos de Passaportes & Vistos
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Esqueça a apreensão de descobertas de última hora sobre passaportes vencidos no portão de embarque. O PaxFlow monitora a validade dos documentos de todos os passageiros vinculados a viagens ativas. Se um documento tiver validade inferior ao exigido pelo país de destino, o sistema gera alertas automáticos com 180 dias de antecedência no Inbox do consultor responsável.
                </p>
                <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-semibold pt-2">
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Itinerários digitais interativos com mapa de voos e vouchers protegidos.</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Página pública do passageiro adaptada à logo e cor da sua agência.</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Monitoramento de pré-embarque e pós-viagem com régua de contato automático.</span>
                  </li>
                </ul>
              </div>
              <div class="lg:col-span-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span class="text-xs font-black text-slate-700 dark:text-slate-200">Painel de Alertas de Vistos & Passaportes</span>
                  <span class="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold rounded">180 dias SLA</span>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border border-rose-500/30 space-y-2 shadow-sm">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-extrabold text-rose-600 dark:text-rose-400">⚠️ Passaporte Vence Antes da Viagem</span>
                    <span class="text-[9px] font-bold text-slate-400">Paris, França</span>
                  </div>
                  <p class="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    Passageiro <strong>Passageiro Fictício (Exemplo)</strong> (LOC: <code>PAX-9821</code>) tem passaporte com vencimento em 14/11/2026. Data de retorno da viagem: 28/10/2026.
                  </p>
                  <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                    <span class="text-indigo-600 dark:text-indigo-400 font-bold">Consultor: Consultor Demo A</span>
                    <span class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-extrabold rounded">Notificar Cliente</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- PILLAR 2: CRM & KANBAN -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900 p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
              <div class="lg:col-span-6 lg:order-2 space-y-4">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg border border-indigo-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Pilar 02 • Pipeline Comercial
                </div>
                <h3 class="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  CRM Especializado em Pacotes e Orçamentos Turísticos
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Gerencie orçamentos em estágios claros de funil (Novo, Em Análise, Proposta, Ganho). Diferente de CRMs genéricos, o PaxFlow exige o preenchimento de campos essenciais do turismo no fechamento — como data de nascimento para taxas de embarque e data financeira para repasses de comissão.
                </p>
                <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-semibold pt-2">
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Automação de atendimento: alteração de status ao adicionar notas de negociação.</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Arquivamento automático inteligente para propostas inativas por mais de 30 dias.</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Cálculo automático de markup da agência e relatórios de faturamento diário.</span>
                  </li>
                </ul>
              </div>
              <div class="lg:col-span-6 lg:order-1 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span class="block text-xs font-black text-slate-700 dark:text-slate-200 mb-4">Pipeline Kanban de Vendas</span>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
                    <span class="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold rounded">Em Análise (3)</span>
                    <strong class="block text-xs text-slate-800 dark:text-white font-extrabold">Orlando em Família</strong>
                    <span class="block text-[10px] text-indigo-600 dark:text-indigo-400 font-black">R$ 28.400,00</span>
                  </div>
                  <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-500/30 space-y-2 shadow-sm">
                    <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold rounded">Venda Fechada (14)</span>
                    <strong class="block text-xs text-slate-800 dark:text-white font-extrabold">Lua de Mel nas Maldivas</strong>
                    <span class="block text-[10px] text-emerald-600 dark:text-emerald-400 font-black">R$ 42.000,00</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- PILLAR 3: ESCALA DE FUNCIONÁRIOS -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900 p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
              <div class="lg:col-span-6 space-y-4">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase rounded-lg border border-violet-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  Pilar 03 • Central Administrativa
                </div>
                <h3 class="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  Controle de Escala de Funcionários e Banco de Folgas Acumuladas
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Gerencie o horário de trabalho de todos os consultores da sua agência em uma matriz mensal moderna. Controle bancadas de folga por metas, solicitações de trocas de turno com aprovação da diretoria e comunicados de treinamentos em um único painel.
                </p>
                <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-semibold pt-2">
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Turnos configuráveis (10-17, 12-19, 14-21, 15-22, Folga, Férias, Reunião).</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Workflow completo para solicitações de folga e trocas entre colegas.</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Desduplicação inteligente de perfis e chave de ativação por funcionário.</span>
                  </li>
                </ul>
              </div>
              <div class="lg:col-span-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span class="block text-xs font-black text-slate-700 dark:text-slate-200 mb-3">Central Administrativa de Escala</span>
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 shadow-sm text-xs">
                  <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span class="font-extrabold text-slate-800 dark:text-slate-200">Consultora Demo A</span>
                    <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded">Turno: 10:00 - 17:00</span>
                  </div>
                  <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span class="font-extrabold text-slate-800 dark:text-slate-200">Consultor Demo B</span>
                    <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded">Turno: 13:00 - 20:00</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="font-extrabold text-slate-800 dark:text-slate-200">Consultora Demo C</span>
                    <span class="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded">Folga Semanal</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- PILLAR 4: REEMBOLSOS AÉREOS -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900 p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
              <div class="lg:col-span-6 lg:order-2 space-y-4">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase rounded-lg border border-emerald-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Pilar 04 • Gestão Financeira
                </div>
                <h3 class="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  Conciliação de Reembolsos e Créditos de Companhias Aéreas
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Nunca mais perca prazos ou dinheiro de estornos de bilhetes aéreos e taxas de cancelamento. O PaxFlow acompanha todo o ciclo de vida dos reembolsos junto às cias aéreas, notificando quando o crédito é liberado ou quando o estorno estourou o prazo.
                </p>
                <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-semibold pt-2">
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>SLA visual de conclusão de reembolso por fornecedor/companhia.</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black">✓</span>
                    <span>Anexo de comprovantes bancários e vouchers digitais para o cliente.</span>
                  </li>
                </ul>
              </div>
              <div class="lg:col-span-6 lg:order-1 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span class="block text-xs font-black text-slate-700 dark:text-slate-200">Painel de Conciliação de Reembolsos</span>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm text-xs">
                  <div class="flex justify-between items-center">
                    <strong class="text-slate-800 dark:text-slate-100 font-extrabold">Reembolso LATAM #8210</strong>
                    <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black rounded text-[10px]">Concluído</span>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Valor reembolsado: <strong class="text-slate-800 dark:text-slate-200">R$ 3.450,00</strong> • Estorno creditado na conta do passageiro.</p>
                </div>
              </div>
            </div>

            <!-- PILLAR 5 & 6: DIGISAC HUB & GAMIFICATION -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- DIGISAC -->
              <div class="bg-white dark:bg-slate-900 p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase rounded-lg border border-sky-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                  Pilar 05 • Integração Digisac
                </div>
                <h3 class="text-xl font-black text-slate-800 dark:text-white">
                  Hub de Mensagens WhatsApp & Editor de Variáveis
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Conecte a API oficial do Digisac. Visualize histórico de conversas em formato split-screen no atendimento de clientes e utilize modelos de mensagem pré-formatados com variáveis automáticas de viagem (como <code>{nome_cliente}</code>, <code>{destino}</code>, <code>{data_embarque}</code>).
                </p>
              </div>

              <!-- GAMIFICATION -->
              <div class="bg-white dark:bg-slate-900 p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase rounded-lg border border-amber-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                  Pilar 06 • Gamificação & Engajamento
                </div>
                <h3 class="text-xl font-black text-slate-800 dark:text-white">
                  Metas Gamificadas, Ranking & Medalhas Colecionáveis
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Incentive a equipe de consultores a bater metas comerciais com um sistema vivo de conquistas. Ganhe pontos de XP por fechamentos, destrave níveis e ostente patentes no perfil a cada marco atingido na agência.
                </p>
              </div>
            </div>

            <!-- COMPARISON TABLE: PAXFLOW VS PLANILHAS/SISTEMAS GENÉRICOS -->
            <div class="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl border border-slate-800 space-y-8">
              <div class="text-center max-w-2xl mx-auto space-y-2">
                <span class="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-400/30">
                  Quadro de Diferenciais
                </span>
                <h3 class="text-2xl font-black tracking-tight">PaxFlow vs Planilhas & CRMs Genéricos</h3>
                <p class="text-xs text-slate-400 font-medium">Veja por que as agências de viagem mais eficientes trocam processos manuais pelo PaxFlow</p>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-xs text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr class="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black">
                      <th class="py-3 px-4">Recurso / Funcionalidade</th>
                      <th class="py-3 px-4 text-rose-400">Planilhas / CRMs Genéricos</th>
                      <th class="py-3 px-4 text-emerald-400">Plataforma PaxFlow</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/60 font-medium">
                    <tr>
                      <td class="py-3.5 px-4 font-bold text-slate-200">Alertas de Vencimento de Vistos e Passaportes</td>
                      <td class="py-3.5 px-4 text-slate-500">❌ Manual / Risco de esquecimento</td>
                      <td class="py-3.5 px-4 text-emerald-400 font-bold">✓ Automático com 180 dias de SLA</td>
                    </tr>
                    <tr>
                      <td class="py-3.5 px-4 font-bold text-slate-200">Controle de Escala de Funcionários e Banco de Folgas</td>
                      <td class="py-3.5 px-4 text-slate-500">❌ Planilhas Excel desconectadas</td>
                      <td class="py-3.5 px-4 text-emerald-400 font-bold">✓ Central Integrada com aprovações</td>
                    </tr>
                    <tr>
                      <td class="py-3.5 px-4 font-bold text-slate-200">Campos Obrigatórios de Turismo no Fechamento</td>
                      <td class="py-3.5 px-4 text-slate-500">❌ Ausente em CRMs genéricos</td>
                      <td class="py-3.5 px-4 text-emerald-400 font-bold">✓ Nascimento, Markup e Data Financeira</td>
                    </tr>
                    <tr>
                      <td class="py-3.5 px-4 font-bold text-slate-200">Itinerário Digital com Logo e Cores da Agência</td>
                      <td class="py-3.5 px-4 text-slate-500">❌ PDFs estáticos pesados</td>
                      <td class="py-3.5 px-4 text-emerald-400 font-bold">✓ Página pública responsiva e dinâmica</td>
                    </tr>
                    <tr>
                      <td class="py-3.5 px-4 font-bold text-slate-200">Conciliação de Reembolsos Aéreos</td>
                      <td class="py-3.5 px-4 text-slate-500">❌ Anotações soltas no WhatsApp</td>
                      <td class="py-3.5 px-4 text-emerald-400 font-bold">✓ Workflow com controle de prazos SLA</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>

        <!-- FAQ Section -->
        <section class="w-full bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-900/50 py-20 px-6 relative z-10">
          <div class="max-w-4xl mx-auto space-y-10">
            <div class="text-center space-y-2">
              <span class="px-3 py-1 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest rounded-full">Tire Suas Dúvidas</span>
              <h2 class="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                Perguntas Frequentes sobre o PaxFlow
              </h2>
            </div>
            
            <div class="space-y-4">
              <details class="group bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden" open>
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-200">Como funciona o Modo de Demonstração (Sandbox)?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                  É um ambiente de simulação completo e interativo, pré-populado com dados fictícios de clientes, viagens, reembolsos e escalas. Ele permite que você teste todas as telas e recursos em tempo real, sem precisar fazer cadastro prévio ou inserir dados reais da sua agência.
                </p>
              </details>

              <details class="group bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-200">Posso controlar a escala de todos os funcionários da minha agência?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                  Sim! O módulo de Central Administrativa permite que administradores atribuam turnos, controlem saldos no Banco de Folgas, aprovem solicitações de trocas e ativem ou desativem quais membros participam da escala através do botão dedicado "Integrantes".
                </p>
              </details>

              <details class="group bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-200">Como funciona o alerta inteligente de passaportes e vistos?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                  O PaxFlow calcula automaticamente a diferença entre a data de validade dos documentos cadastrados e a data da viagem. Se a validade for inferior a 6 meses no momento do embarque, o sistema gera cartões de alerta prioritários no Inbox da agência.
                </p>
              </details>

              <details class="group bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-200">Como a página do cliente assume as cores da minha agência?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800 p-1.5 text-slate-900 dark:text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p class="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                  Em Configurações da Agência, você envia a sua logomarca e seleciona a cor primária da sua marca. Todos os itinerários públicos compartilhados com os passageiros passam a exibir o seu logotipo e a sua paleta visual automaticamente.
                </p>
              </details>
            </div>
          </div>
        </section>

        <!-- Final CTA High-Conversion Section -->
        <section class="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 py-16 px-6 relative z-10 border-t border-slate-800 text-white text-center">
          <div class="max-w-4xl mx-auto space-y-6">
            <span class="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-widest rounded-full">
              Leve sua agência para o próximo nível
            </span>
            <h2 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Pronto para revolucionar a operação da sua agência?
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
              Assuma o controle total dos pós-vendas, reembolsos, SLAs de vistos e escalas da sua equipe. Escolha como deseja começar agora mesmo.
            </p>

            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button id="btn-cta-demo-final" class="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wider rounded-2xl shadow-xl transition-all transform hover:-translate-y-0.5 uppercase flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Testar no Modo Sandbox
              </button>

              <button id="btn-cta-whatsapp-final" class="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wider rounded-2xl shadow-xl transition-all transform hover:-translate-y-0.5 uppercase flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
                Falar com Consultor
              </button>

              <button id="btn-cta-login-final" class="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs tracking-wider rounded-2xl border border-slate-700 transition-all transform hover:-translate-y-0.5 uppercase">
                Acessar Sistema Real
              </button>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="w-full bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-900/60 py-6 px-6 text-center text-[10px] text-slate-400 font-medium relative z-10">
          <p>© 2026 PaxFlow. Todos os direitos reservados. Thiago Costa — Apresentação de Solução de CRM e Pós-Venda Turístico.</p>
        </footer>

        <!-- Floating WhatsApp FAB Conversion Button -->
        <a id="btn-floating-whatsapp" href="https://wa.me/5511966989160?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20PaxFlow%20para%20minha%20ag%C3%AAncia." target="_blank" class="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-full shadow-2xl shadow-emerald-950/40 border border-emerald-400/40 transition-all flex items-center gap-2.5 group">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
          </span>
          <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
          <span>Falar com Especialista</span>
        </a>

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

    const handleWhatsApp = () => {
      window.open('https://wa.me/5511966989160?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20PaxFlow%20para%20minha%20ag%C3%AAncia.', '_blank');
    };

    document.getElementById('btn-iniciar-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-acessar-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-conhecer-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-cta-demo-final')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-cta-login-final')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-cta-whatsapp-final')?.addEventListener('click', handleWhatsApp);
    document.getElementById('btn-header-whatsapp')?.addEventListener('click', handleWhatsApp);

    // Lógica da Demo Interativa (Feature Tour com Layout Horizontal - Stripe Style)
    const tabs = ['dashboard', 'viagens', 'orcamentos', 'inbox', 'escala', 'reembolsos', 'relatorios', 'publicas'];
    const pathTexts: { [key: string]: string } = {
      dashboard: 'PaxFlow - Painel de Controle',
      viagens: 'PaxFlow - Operação de Viagens',
      orcamentos: 'PaxFlow - Funil de Orçamentos',
      inbox: 'PaxFlow - Central de Mensagens e Alertas',
      escala: 'PaxFlow - Controle de Escala da Equipe',
      reembolsos: 'PaxFlow - Gestão de Reembolsos',
      relatorios: 'PaxFlow - Relatórios Gerenciais',
      publicas: 'PaxFlow - Itinerário Digital do Passageiro'
    };

    let currentTabIndex = 0;
    let autoTabTimer: any = null;

    const switchTab = (tabName: string) => {
      tabs.forEach(t => {
        const b = document.getElementById(`tab-btn-${t}`);
        if (b) {
          b.className = "px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200";
        }
        const panel = document.getElementById(`panel-${t}`);
        panel?.classList.add('hidden');
      });

      const btn = document.getElementById(`tab-btn-${tabName}`);
      if (btn) {
        btn.className = "px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl transition duration-250 flex items-center gap-2 bg-indigo-600 text-white shadow-md";
      }

      const activePanel = document.getElementById(`panel-${tabName}`);
      activePanel?.classList.remove('hidden');

      const pathEl = document.getElementById('window-path-text');
      if (pathEl) {
        pathEl.textContent = pathTexts[tabName];
      }
    };

    tabs.forEach((tab, index) => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      btn?.addEventListener('click', () => {
        if (autoTabTimer) {
          clearInterval(autoTabTimer);
          autoTabTimer = null;
        }
        currentTabIndex = index;
        switchTab(tab);
      });
    });

    autoTabTimer = setInterval(() => {
      currentTabIndex = (currentTabIndex + 1) % tabs.length;
      switchTab(tabs[currentTabIndex]);
    }, 3000);

    // Carrossel Automático (3s) para Identidade Visual da Marca
    const brandTabs = ['itinerario', 'voucher', 'nps', 'whatsapp'];
    const brandTitles: Record<string, string> = {
      itinerario: '01. Itinerário Digital no Celular',
      voucher: '02. Voucher Oficial em PDF com Logomarca',
      nps: '03. Pesquisa NPS da Sua Marca',
      whatsapp: '04. Notificações WhatsApp com Assinatura'
    };

    let brandTabIndex = 0;
    let brandAutoTimer: any = null;

    const switchBrandTab = (tabName: string) => {
      brandTabs.forEach(t => {
        const btn = document.getElementById(`brand-tab-${t}`);
        if (btn) {
          btn.className = "w-full p-3.5 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800";
        }
        const panel = document.getElementById(`brand-panel-${t}`);
        panel?.classList.add('hidden');
      });

      const activeBtn = document.getElementById(`brand-tab-${tabName}`);
      if (activeBtn) {
        activeBtn.className = "w-full p-3.5 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-indigo-600 text-white shadow-md";
      }

      const activePanel = document.getElementById(`brand-panel-${tabName}`);
      activePanel?.classList.remove('hidden');

      const titleEl = document.getElementById('brand-preview-title');
      if (titleEl) {
        titleEl.textContent = brandTitles[tabName];
      }
    };

    brandTabs.forEach((tab, index) => {
      const btn = document.getElementById(`brand-tab-${tab}`);
      btn?.addEventListener('click', () => {
        if (brandAutoTimer) {
          clearInterval(brandAutoTimer);
          brandAutoTimer = null;
        }
        brandTabIndex = index;
        switchBrandTab(tab);
      });
    });

    brandAutoTimer = setInterval(() => {
      brandTabIndex = (brandTabIndex + 1) % brandTabs.length;
      switchBrandTab(brandTabs[brandTabIndex]);
    }, 3000);
  }
}
