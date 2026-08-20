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
        <div class="absolute top-[-20%] left-[-20%] w-[100%] h-[60%] bg-gradient-to-tr from-sky-200/20 via-indigo-150/10 to-rose-100/10 dark:from-indigo-950/15 dark:via-slate-950/0 dark:to-transparent rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div class="absolute top-[30%] right-[-20%] w-[80%] h-[50%] bg-gradient-to-l from-violet-200/10 via-fuchsia-100/5 to-transparent dark:from-purple-950/10 dark:via-slate-950/0 dark:to-transparent rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div class="absolute bottom-[-10%] left-[-10%] w-[80%] h-[50%] bg-gradient-to-tr from-emerald-150/10 via-teal-50/5 to-transparent dark:from-emerald-950/10 dark:via-slate-950/0 dark:to-transparent rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div class="absolute inset-0 grid-bg pointer-events-none z-0 opacity-80"></div>

        <!-- Top Navigation Bar -->
        <header class="w-full bg-white/70 dark:bg-slate-950/45 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-900/50 sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300">
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
        <main class="w-full max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-12 text-center relative z-10 flex flex-col items-center justify-center">
          <!-- Label Badge -->
          <div class="inline-flex items-center gap-1.5 px-3.5 py-1 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/60 text-indigo-650 dark:text-indigo-400 font-bold text-[10px] tracking-wide rounded-full mb-6 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-650 animate-pulse"></span>
            A Plataforma Operacional Definitiva para Agências
          </div>

          <!-- Headline -->
          <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6 text-slate-850 dark:text-white max-w-4xl mx-auto">
            Acelere e organize as operações <br class="hidden sm:block" />
            da sua <span class="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300">agência de viagens</span>.
          </h1>

          <!-- Subtitle -->
          <p class="text-sm md:text-base text-slate-550 dark:text-slate-400 font-medium max-w-2xl mb-10 leading-relaxed">
            Centralize pós-vendas, automatize alertas de documentos expirando (SLA), controle e concilie reembolsos de bilhetes aéreos, e monitore a produtividade com gamificação integrada.
          </p>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center gap-3.5 mb-16 w-full justify-center">
            <button id="btn-iniciar-demo" class="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-650/10 transition-all transform hover:-translate-y-0.5 uppercase flex items-center justify-center gap-2">
              Iniciar Demonstração (Sandbox)
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto px-7 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 hover:text-slate-850 dark:hover:text-white font-bold text-xs tracking-wider rounded-xl border border-slate-200 dark:border-slate-800 transition-all transform hover:-translate-y-0.5 uppercase shadow-sm">
              Entrar no Sistema Real
            </button>
          </div>

          <!-- Hero Mockup Window -->
          <div class="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl p-4 md:p-6 text-left relative overflow-hidden backdrop-blur-md mb-24 max-w-5xl">
            <!-- Window header -->
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 bg-red-400 rounded-full"></span>
                <span class="w-2.5 h-2.5 bg-amber-400 rounded-full"></span>
                <span class="w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
                <span class="text-[10px] text-slate-400 font-mono ml-2">paxflow-comercial-dashboard</span>
              </div>
              <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 font-bold text-[8px] rounded uppercase">Visão Integrada</span>
            </div>

            <!-- Dashboard Content Mock -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <!-- Sidebar -->
              <div class="hidden md:flex flex-col gap-2 border-r border-slate-100 dark:border-slate-800 pr-4">
                <div class="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 font-black rounded-lg flex items-center gap-2">
                  <span>📊</span> Dashboard
                </div>
                <div class="p-2 text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg flex items-center gap-2 transition font-bold">
                  <span>✈️</span> Viagens
                </div>
                <div class="p-2 text-slate-500 dark:text-slate-455 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg flex items-center gap-2 transition font-bold">
                  <span>📋</span> Orçamentos
                </div>
                <div class="p-2 text-slate-500 dark:text-slate-455 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg flex items-center gap-2 transition font-bold">
                  <span>💬</span> Inbox & SLAs
                </div>
                <div class="p-2 text-slate-500 dark:text-slate-455 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg flex items-center gap-2 transition font-bold">
                  <span>💰</span> Reembolsos
                </div>
                <div class="p-2 text-slate-500 dark:text-slate-455 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg flex items-center gap-2 transition font-bold">
                  <span>🏆</span> Gamificação
                </div>
              </div>

              <!-- Main Content area -->
              <div class="md:col-span-3 space-y-4">
                <div class="grid grid-cols-3 gap-3">
                  <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Faturamento</span>
                    <div class="text-base font-black text-slate-800 dark:text-white mt-1">R$ 148.500</div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Conversão CRM</span>
                    <div class="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">24.8%</div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Metas Batidas</span>
                    <div class="text-base font-black text-emerald-600 dark:text-emerald-450 mt-1">8/10 Consultores</div>
                  </div>
                </div>

                <!-- Custom SVG Sparkline Graph -->
                <div class="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl">
                  <div class="flex items-center justify-between mb-4">
                    <span class="font-bold text-slate-700 dark:text-slate-350">Histórico de Performance Mensal</span>
                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">+12% vs. mês anterior</span>
                  </div>
                  <div class="w-full h-24">
                    <svg viewBox="0 0 400 100" class="w-full h-full text-indigo-500 overflow-visible" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                      <path d="M 0 80 Q 50 60 100 70 T 200 40 T 300 50 T 400 20" class="drop-shadow-lg" />
                      <circle cx="400" cy="20" r="5" fill="#4f46e5" stroke="white" stroke-width="2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- Comparative Section: Planilhas vs PaxFlow -->
        <section class="w-full max-w-5xl mx-auto px-6 mb-24 relative z-10">
          <div class="text-center mb-12">
            <h2 class="text-2xl font-extrabold text-slate-855 dark:text-white tracking-tight">
              Compare: A realidade da operação
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Como a sua agência funciona com planilhas comuns comparada a processos automatizados
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Pain: Planilhas -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/5 border border-red-500/10 text-red-650 dark:text-red-400 font-extrabold text-[10px] uppercase rounded-full mb-6">
                ❌ Métodos Tradicionais (Falta de Padrão)
              </div>
              <ul class="space-y-4 text-xs font-medium text-slate-550 dark:text-slate-400">
                <li class="flex items-start gap-3">
                  <span class="text-red-500 text-lg shrink-0">✕</span>
                  <div>
                    <strong class="text-slate-800 dark:text-slate-200 block">Planilhas espalhadas:</strong>
                    Histórico de localizadores (LOC), fornecedores e voos pulverizado em arquivos individuais de Excel ou chat de WhatsApp.
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-red-500 text-lg shrink-0">✕</span>
                  <div>
                    <strong class="text-slate-800 dark:text-slate-200 block">Sem avisos de passaporte:</strong>
                    Documentações expiradas (validade < 6 meses no embarque) passam despercebidas, gerando cancelamento na PF de aeroportos.
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-red-500 text-lg shrink-0">✕</span>
                  <div>
                    <strong class="text-slate-800 dark:text-slate-200 block">Perda de reembolsos:</strong>
                    Créditos aéreos e taxas de cancelamento pendentes com companhias aéreas caem no esquecimento devido à falta de prazos.
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-red-500 text-lg shrink-0">✕</span>
                  <div>
                    <strong class="text-slate-800 dark:text-slate-200 block">Desmotivação do consultor:</strong>
                    Sem visibilidade de performance real e conquistas comerciais no dia a dia da agência.
                  </div>
                </li>
              </ul>
            </div>

            <!-- Gain: PaxFlow -->
            <div class="bg-indigo-50/15 dark:bg-slate-900 border border-indigo-100/50 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 text-emerald-650 dark:text-emerald-450 font-extrabold text-[10px] uppercase rounded-full mb-6">
                ✅ Fluxo Automatizado no PaxFlow
              </div>
              <ul class="space-y-4 text-xs font-medium text-slate-650 dark:text-slate-350">
                <li class="flex items-start gap-3">
                  <span class="text-emerald-500 text-lg shrink-0">✓</span>
                  <div>
                    <strong class="text-indigo-650 dark:text-indigo-400 block">Banco de dados centralizado:</strong>
                    Acompanhamento completo de passageiros vinculados diretamente aos localizadores com painel financeiro de taxas e margens.
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-emerald-500 text-lg shrink-0">✓</span>
                  <div>
                    <strong class="text-indigo-650 dark:text-indigo-400 block">Monitoramento de SLAs integrado:</strong>
                    O motor operacional PaxFlow varre todas as datas e alerta o time proativamente sobre vistos e passaportes pendentes.
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-emerald-500 text-lg shrink-0">✓</span>
                  <div>
                    <strong class="text-indigo-650 dark:text-indigo-400 block">Central de conciliação de reembolso:</strong>
                    Organize cada reembolso por etapas (Solicitado, Em Análise, Pago) mantendo o financeiro saudável.
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-emerald-500 text-lg shrink-0">✓</span>
                  <div>
                    <strong class="text-indigo-650 dark:text-indigo-400 block">Gamificação nativa do time:</strong>
                    Consultores ganham níveis, sobem em rankings de campanhas e conquistam medalhas baseadas no faturamento.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Feature Deep-Dives: Detailed Breakdown of Core Pillars -->
        <section class="w-full bg-slate-100/30 dark:bg-slate-900/10 py-20 border-t border-slate-200/40 dark:border-slate-900/40 relative z-10">
          <div class="max-w-5xl mx-auto px-6 space-y-24">
            
            <!-- PILLAR 1: CRM & KANBAN (Orcamentos.ts) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-5 space-y-4">
                <span class="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase rounded-lg border border-indigo-500/20">Módulo Comercial</span>
                <h3 class="text-xl md:text-2xl font-black text-slate-850 dark:text-white leading-tight">
                  CRM especializado para propostas de viagens
                </h3>
                <p class="text-xs text-slate-550 dark:text-slate-400 font-medium leading-relaxed">
                  Gerencie orçamentos complexos (Grécia, Lua de Mel, Pacotes Corporativos) em um funil Kanban desenhado para o turismo. Acompanhe a margem de lucro projetada de cada proposta comercial antes de enviar.
                </p>
                <div class="flex items-center gap-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                  <span>✓ Funil em etapas customizadas</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>✓ Cálculo automático de markup</span>
                </div>
              </div>
              <div class="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-md">
                <span class="block text-[8px] font-black text-slate-400 uppercase mb-3">Funil Kanban Simulado</span>
                <div class="grid grid-cols-3 gap-3 text-[10px]">
                  <div class="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-850">
                    <span class="font-extrabold text-[8px] text-slate-400 block mb-2">PROPOSTA (2)</span>
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1 shadow-sm">
                      <span class="font-bold block text-slate-800 dark:text-slate-200">Lua de Mel Grécia</span>
                      <span class="text-[8px] text-indigo-600 dark:text-indigo-400 font-bold">R$ 24.000</span>
                    </div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-850 border-l-2 border-l-amber-500">
                    <span class="font-extrabold text-[8px] text-amber-600 dark:text-amber-450 block mb-2">NEGOCIAÇÃO (3)</span>
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1 shadow-sm">
                      <span class="font-bold block text-slate-800 dark:text-slate-200">Orlando Família</span>
                      <span class="text-[8px] text-indigo-600 dark:text-indigo-400 font-bold">R$ 15.600</span>
                    </div>
                  </div>
                  <div class="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-850 border-l-2 border-l-emerald-500">
                    <span class="font-extrabold text-[8px] text-emerald-600 dark:text-emerald-455 block mb-2">FECHADO (12)</span>
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1 shadow-sm">
                      <span class="font-bold block text-slate-800 dark:text-slate-200">Paris & Itália</span>
                      <span class="text-[8px] text-emerald-600 dark:text-emerald-450 font-bold">R$ 18.200</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PILLAR 2: DOCUMENTATION SLA ENGINE (Inbox.ts) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-7 lg:order-2 space-y-4">
                <span class="px-2.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-455 text-[9px] font-bold uppercase rounded-lg border border-rose-500/20">Segurança de Viagem</span>
                <h3 class="text-xl md:text-2xl font-black text-slate-855 dark:text-white leading-tight">
                  Motor de validação de passaportes e vistos (SLA)
                </h3>
                <p class="text-xs text-slate-550 dark:text-slate-400 font-medium leading-relaxed">
                  O PaxFlow possui um sistema inteligente de validação de datas. Se o passaporte do passageiro vencer em menos de 6 meses do dia do embarque internacional, um alerta prioritário é criado automaticamente no Inbox do consultor responsável.
                </p>
                <div class="flex items-center gap-2 text-[10px] text-rose-550 dark:text-rose-450 font-bold">
                  <span>✓ Escaneamento automático de vencimentos</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>✓ Prevenção de impedimento de embarques</span>
                </div>
              </div>
              <div class="lg:col-span-5 lg:order-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-md">
                <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1.5 text-xs text-left">
                  <div class="flex justify-between items-center text-rose-700 dark:text-rose-400 font-black">
                    <span>🚨 ALERTA DE SEGURANÇA</span>
                    <span class="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-bold uppercase rounded">URGENTE</span>
                  </div>
                  <p class="text-slate-650 dark:text-slate-350 leading-relaxed text-[10px]">
                    O passaporte de <strong>Guilherme Albuquerque</strong> vence em 14/11/2026. A viagem para Paris está marcada para 14/10/2026. Validade menor que o prazo consular exigido.
                  </p>
                  <div class="flex gap-2 pt-2 border-t border-rose-500/20">
                    <button class="px-2.5 py-1 bg-rose-650 hover:bg-rose-700 text-white font-extrabold text-[8px] rounded uppercase transition">Notificar Cliente</button>
                    <button class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[8px] rounded uppercase transition">Ignorar</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- PILLAR 3: GAMIFICATION AND COLLABORATION (gamification.ts) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-5 space-y-4">
                <span class="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-[9px] font-bold uppercase rounded-lg border border-emerald-500/20">Produtividade Gamificada</span>
                <h3 class="text-xl md:text-2xl font-black text-slate-855 dark:text-white leading-tight">
                  Engajamento comercial com medalhas e conquistas
                </h3>
                <p class="text-xs text-slate-550 dark:text-slate-400 font-medium leading-relaxed">
                  Transforme o pós-venda em um ecossistema produtivo. O time acumula XP a cada proposta ganha, sobe de nível e desbloqueia medalhas específicas como "Mestre de Destinos", "Fidelizador NPS" e "Vendedor Ouro".
                </p>
                <div class="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-450 font-bold">
                  <span>✓ Níveis e progresso de consultores</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>✓ Desbloqueio de medalhas e recompensas</span>
                </div>
              </div>
              <div class="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-md text-center">
                <span class="block text-[8px] font-black text-slate-400 uppercase text-left mb-4">Galeria de Medalhas do Consultor</span>
                <div class="grid grid-cols-3 gap-4">
                  <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl flex flex-col items-center gap-1.5 shadow-sm">
                    <span class="text-2xl">🥇</span>
                    <span class="font-extrabold text-[9px] text-slate-800 dark:text-slate-150">Vendedor Ouro</span>
                    <span class="text-[8px] text-slate-450 uppercase">R$ 50k+ Faturado</span>
                  </div>
                  <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl flex flex-col items-center gap-1.5 shadow-sm">
                    <span class="text-2xl">🌟</span>
                    <span class="font-extrabold text-[9px] text-slate-800 dark:text-slate-150">Mestre de Destinos</span>
                    <span class="text-[8px] text-slate-450 uppercase">5+ continentes</span>
                  </div>
                  <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl flex flex-col items-center gap-1.5 shadow-sm">
                    <span class="text-2xl">⚡</span>
                    <span class="font-extrabold text-[9px] text-slate-800 dark:text-slate-150">Guardião do SLA</span>
                    <span class="text-[8px] text-slate-455 uppercase">0 alertas perdidos</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- PILLAR 4: REFUNDS & CANCELLATIONS (Reembolsos.ts) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-7 lg:order-2 space-y-4">
                <span class="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-450 text-[9px] font-bold uppercase rounded-lg border border-amber-500/20">Financeiro / Reembolso</span>
                <h3 class="text-xl md:text-2xl font-black text-slate-855 dark:text-white leading-tight">
                  Conciliação de reembolsos e créditos aéreos
                </h3>
                <p class="text-xs text-slate-550 dark:text-slate-400 font-medium leading-relaxed">
                  Controle as solicitações de cancelamento de passagens. Mantenha controle absoluto sobre as multas aplicadas pelas companhias e verifique a situação real dos créditos que pertencem aos passageiros.
                </p>
                <div class="flex items-center gap-2 text-[10px] text-amber-600 dark:text-amber-450 font-bold">
                  <span>✓ Acompanhamento por etapas</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>✓ Integração com faturamento de multas</span>
                </div>
              </div>
              <div class="lg:col-span-5 lg:order-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-md text-xs">
                <span class="block text-[8px] font-black text-slate-400 uppercase mb-3">Reembolsos Pendentes</span>
                <div class="space-y-2">
                  <div class="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl">
                    <div>
                      <span class="font-extrabold block text-slate-800 dark:text-slate-150">Aline Pereira</span>
                      <span class="text-[8px] text-slate-450">LATAM Airlines</span>
                    </div>
                    <div class="text-right">
                      <span class="font-bold text-slate-800 dark:text-slate-150 block">R$ 1.850,00</span>
                      <span class="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase rounded">Em Análise</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- Dynamic White-Label Preview Tool -->
        <section class="w-full bg-slate-50 dark:bg-slate-950/20 py-20 px-6 relative z-10 border-t border-slate-200/40 dark:border-slate-900/40">
          <div class="max-w-5xl mx-auto">
            <div class="text-center max-w-2xl mx-auto mb-12">
              <span class="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase rounded-lg border border-indigo-500/20">Personalização</span>
              <h2 class="text-xl md:text-2xl font-extrabold text-slate-855 dark:text-white tracking-tight mt-3">
                Identidade Visual Exclusiva (White-Label)
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Veja abaixo como a ferramenta cria um itinerário digital e NPS responsivo que adota a identidade da sua marca:
              </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-4xl mx-auto">
              <!-- Customization settings -->
              <div class="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-center space-y-4 shadow-sm">
                <div>
                  <label class="block text-[10px] font-bold text-slate-550 dark:text-slate-450 uppercase mb-1.5">Nome da Sua Agência</label>
                  <input id="wl-input-name" type="text" value="Minha Agência de Viagens" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-150 font-semibold text-xs font-sans animate-pulse" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-550 dark:text-slate-450 uppercase mb-1.5">Cor Principal da Marca</label>
                  <div class="flex items-center gap-3">
                    <input id="wl-input-color" type="color" value="#4f46e5" class="w-8 h-8 border-0 rounded-lg cursor-pointer bg-transparent" />
                    <span id="wl-color-hex" class="text-[10px] font-mono font-bold text-slate-500">#4F46E5</span>
                  </div>
                </div>
                <div class="text-[9px] text-slate-455 dark:text-slate-500 leading-normal pt-2.5 border-t border-slate-100 dark:border-slate-855">
                  💡 No PaxFlow real, os itinerários públicos de passagens e vouchers são visualizados pelos clientes com seu próprio logotipo e estilo de cores.
                </div>
              </div>

              <!-- Live dynamic preview (Mobile Itinerary Mockup) -->
              <div class="lg:col-span-8 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[340px]">
                
                <!-- Mockup Header -->
                <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-855 pb-2.5 mb-3.5">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                    <span class="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                    <span class="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                  </div>
                  <span class="text-[8px] font-bold text-slate-450 uppercase tracking-widest">ITINERÁRIO DO PASSAGEIRO</span>
                </div>

                <!-- Smartphone mockup container -->
                <div class="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4.5 flex-1 shadow-sm flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2.5">
                      <div class="flex items-center gap-2">
                        <!-- Custom logo bg -->
                        <span id="wl-preview-logo-bg" class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm" style="background-color: #4f46e5;">
                          ✈️
                        </span>
                        <div>
                          <span id="wl-preview-agency-name" class="block text-xs font-bold text-slate-850 dark:text-slate-150">Minha Agência de Viagens</span>
                          <span class="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Itinerário Digital</span>
                        </div>
                      </div>
                      <span class="text-[8px] font-mono font-bold bg-slate-50 dark:bg-slate-950 text-slate-450 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">VIA-2026</span>
                    </div>

                    <div class="space-y-2.5 text-[10px]">
                      <div>
                        <span class="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Passageiro</span>
                        <span class="block font-bold text-slate-700 dark:text-slate-350">Guilherme R. Albuquerque</span>
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

        <!-- Stats Counters -->
        <section class="w-full py-16 px-6 bg-white dark:bg-slate-950 border-t border-slate-200/40 dark:border-slate-900/40 relative z-10">
          <div class="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <span class="block text-3xl font-black text-slate-855 dark:text-white">15.000+</span>
              <span class="block text-[9px] font-bold uppercase text-slate-455 mt-1.5 tracking-wider">Passageiros Atendidos</span>
            </div>
            <div>
              <span class="block text-3xl font-black text-slate-855 dark:text-white">98,6%</span>
              <span class="block text-[9px] font-bold uppercase text-slate-455 mt-1.5 tracking-wider">Satisfação (NPS Médio)</span>
            </div>
            <div>
              <span class="block text-3xl font-black text-indigo-650 dark:text-indigo-400">70%</span>
              <span class="block text-[9px] font-bold uppercase text-slate-455 mt-1.5 tracking-wider">Redução Operacional</span>
            </div>
            <div>
              <span class="block text-3xl font-black text-emerald-600 dark:text-emerald-450">24/7</span>
              <span class="block text-[9px] font-bold uppercase text-slate-455 mt-1.5 tracking-wider">Acompanhamento e SLAs</span>
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
