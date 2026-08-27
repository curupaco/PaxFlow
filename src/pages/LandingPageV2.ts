export class LandingPageV2 {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public init(): void {
    this.render();
    this.setupEventListeners();
    this.setupScrollEffects();
  }

  private setupScrollEffects(): void {
    const scope = this.container.querySelector('.landing-v2');
    if (!scope) return;

    const parallaxEls = Array.from(scope.querySelectorAll<HTMLElement>('[data-parallax]'));
    const revealItems = [
      ...Array.from(scope.querySelectorAll<HTMLElement>('[data-reveal]')),
      ...Array.from(scope.querySelectorAll<HTMLElement>('.pf-zone')),
      ...Array.from(scope.querySelectorAll<HTMLElement>('.pf-slide-up, .pf-slide-left, .pf-slide-right')),
    ];

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applyReveal = (): void => {
      const vh = window.innerHeight;
      for (const el of revealItems) {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          el.classList.add('pf-revealed');
        }
      }
    };

    if (!isReduced) {
      let ticking = false;
      const onScroll = (): void => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const vh = window.innerHeight;
          const mid = vh / 2;
          const sy = window.scrollY || 0;
          for (const el of parallaxEls) {
            const amount = parseFloat(el.getAttribute('data-parallax') || '20');
            const rect = el.getBoundingClientRect();
            const isFixed = el.offsetParent === null || el.closest('.fixed, [class*="fixed"]');
            const center = isFixed
              ? sy + rect.top + rect.height / 2
              : rect.top + rect.height / 2;
            const travel = (center - mid) / vh;
            const shift = travel * amount;
            el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
          }
          applyReveal();
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    } else {
      applyReveal();
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="landing-v2 min-h-screen bg-[#06070f] text-white font-sans selection:bg-fuchsia-500 selection:text-white relative overflow-x-hidden flex flex-col">

        <!-- ===== AMBIENT COLOR FIELD (muito movimento) ===== -->
        <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div data-parallax="30" class="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#0052d4]/35 via-[#00a8f5]/20 to-transparent blur-3xl pf-float-slow"></div>
          <div data-parallax="-40" class="absolute top-[20%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-bl from-[#f12711]/30 via-[#f5af19]/20 to-transparent blur-3xl pf-float"></div>
          <div data-parallax="50" class="absolute bottom-[-10%] left-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-[#00e5a3]/25 via-teal-500/10 to-transparent blur-3xl pf-float-delay"></div>
          <div data-parallax="-20" class="absolute top-[45%] left-[35%] w-[30vw] h-[30vw] rounded-full bg-gradient-to-br from-fuchsia-600/20 to-sky-500/10 blur-3xl pf-float-slow"></div>
          <div class="absolute inset-0 opacity-[0.08] grid-bg"></div>
        </div>

        <!-- ===== LOGO WATERMARK fixo gigante deslocado à direita (acompanha o scroll) ===== -->
        <div class="pointer-events-none fixed inset-0 z-[1] flex items-center justify-end overflow-hidden">
          <img data-parallax="95" src="/logo.svg" alt="" class="pf-logo-watermark max-w-[70vmin] max-h-[70vmin] w-[70vmin] h-[70vmin] object-contain opacity-[0.07] mr-[-10vmin] drop-shadow-[0_0_30px_rgba(0,168,245,0.15)]" />
        </div>

        <!-- ===== TOP NAV ===== -->
        <header class="relative z-30 w-full px-6 py-4 flex items-center justify-between bg-[#06070f]/70 backdrop-blur-xl border-b border-white/10 sticky top-0">
          <a href="#topo" class="flex items-center gap-3 group">
            <span class="relative w-10 h-10 rounded-2xl bg-white/10 p-1 shadow-lg pf-pulse-ring">
              <img src="/logo.svg" alt="PaxFlow Logo" class="w-full h-full object-contain rounded-xl" />
            </span>
            <span class="text-xl font-black tracking-tight bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-[#f5af19] bg-clip-text text-transparent pf-animated-gradient">PaxFlow</span>
          </a>
          <nav class="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-300">
            <a href="#recursos" class="hover:text-[#00e5a3] transition">Recursos</a>
            <a href="#marcas" class="hover:text-[#00a8f5] transition">Sua Marca</a>
            <a href="#integracao" class="hover:text-[#f5af19] transition">Integrações</a>
            <a href="#planos" class="hover:text-[#f12711] transition">Planos</a>
            <a href="#faq" class="hover:text-fuchsia-400 transition">FAQ</a>
          </nav>
          <div class="flex items-center gap-2.5">
            <button id="btn-header-whatsapp" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-emerald-500/25 transition hover:scale-[1.04] flex items-center gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
              <span class="hidden sm:inline">WhatsApp</span>
            </button>
            <button id="btn-acessar-login" class="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-900 font-extrabold text-xs uppercase tracking-wide shadow-lg transition">Acessar Sistema</button>
          </div>
        </header>

        <!-- ===== HERO (logo maior e centralizado) ===== -->
        <main id="topo" class="relative z-10 w-full max-w-6xl mx-auto px-6 pt-14 pb-20 text-center flex flex-col items-center">
          <span class="pf-rise inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-[#00e5a3]/40 text-[#00e5a3] font-bold text-[11px] uppercase tracking-widest mb-8">
            <span class="w-2 h-2 rounded-full bg-[#00e5a3] animate-pulse"></span>
            O CRM & Pós-Venda 100% Especializado em Turismo
          </span>

          <!-- Logo grande centralizado em card de bússola -->
          <div data-parallax="26" class="pf-rise-1 relative mb-12">
            <div class="relative w-56 h-56 md:w-72 md:h-72 pf-float">
              <div class="absolute -inset-8 rounded-full bg-gradient-to-br from-[#0052d4] via-[#00a8f5] to-[#00e5a3] blur-3xl opacity-60 pf-glow"></div>
              <div class="relative w-full h-full rounded-full bg-gradient-to-br from-[#0a1a3f] to-[#0d0f1f] border-2 border-[#00a8f5]/30 shadow-2xl flex items-center justify-center overflow-hidden">
                <img src="/logo.svg" alt="PaxFlow" class="w-[82%] h-[82%] object-contain pf-spin-slow" />
              </div>
              <span class="absolute -top-3 -left-3 w-11 h-11 rounded-full bg-gradient-to-br from-[#f12711] to-[#f5af19] flex items-center justify-center text-white font-black text-lg shadow-xl pf-bounce">✈️</span>
              <span class="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-br from-[#00e5a3] to-[#00a8f5] flex items-center justify-center text-white text-lg font-black shadow-xl pf-bounce" style="animation-delay:.4s">+</span>
              <span class="absolute top-1/2 -left-16 hidden md:flex w-24 h-24 rounded-2xl bg-white/[0.04] border border-white/10 items-center justify-center pf-spin-rev shadow-xl">
                <img src="/logo.svg" alt="" class="w-14 h-14 object-contain" />
              </span>
            </div>
          </div>

          <h1 class="pf-hero-headline pf-rise-2 text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 max-w-5xl">
            <span class="pf-shimmer-text">Pax</span><span class="bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-[#f5af19] bg-clip-text text-transparent pf-animated-gradient">Flow</span>
            <span class="block mt-3 text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-100">A operação da sua agência de viagens</span>
            <span class="block mt-1 bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-500 bg-clip-text text-transparent pf-animated-gradient">sem fricção, sem planilhas</span>
          </h1>

          <p class="pf-rise-3 text-base md:text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed font-medium">
            Diga adeus à desorganização. Centralize pós-vendas, passaportes e vistos, reembolsos aéreos, escalas e itinerários em uma plataforma viva — pensada para o turismo, não para planilhas.
          </p>

          <div class="pf-rise-4 flex flex-col sm:flex-row items-center gap-4 mb-14 w-full justify-center">
            <button id="btn-iniciar-demo" class="pf-animated-gradient w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] shadow-2xl shadow-blue-500/30 hover:scale-[1.05] transition-transform">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Iniciar Modo Demonstração
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-sm tracking-wider uppercase border border-white/15 transition">Entrar no Sistema Real</button>
          </div>

          <!-- Stats bar -->
          <div class="pf-rise-5 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mx-auto mb-16 p-6 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-md pf-glow">
            <div class="text-center p-3 rounded-2xl bg-gradient-to-b from-[#0052d4]/20 to-transparent"><span class="block text-3xl font-black text-[#00a8f5]">100%</span><span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Foco em Turismo</span></div>
            <div class="text-center p-3 rounded-2xl bg-gradient-to-b from-[#f12711]/20 to-transparent"><span class="block text-3xl font-black text-[#f5af19]">180 dias</span><span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Alerta Vistos & Passaporte</span></div>
            <div class="text-center p-3 rounded-2xl bg-gradient-to-b from-[#00e5a3]/20 to-transparent"><span class="block text-3xl font-black text-[#00e5a3]">Escala + Banco</span><span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Gestão de Equipe</span></div>
            <div class="text-center p-3 rounded-2xl bg-gradient-to-b from-fuchsia-600/20 to-transparent"><span class="block text-3xl font-black text-fuchsia-400">WhatsApp SLA</span><span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Hub Integrado</span></div>
          </div>

          <!-- Marquee de diferenciais -->
          <div class="w-full max-w-5xl mb-16 rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] pf-marquee-wrap">
            <div class="pf-marquee gap-12 py-4 px-6 text-sm font-bold">
              <span class="flex items-center gap-2 text-[#00e5a3]">✦ Alertas de passaporte e visto</span>
              <span class="flex items-center gap-2 text-[#00a8f5]">✦ Reembolsos com cronômetro SLA</span>
              <span class="flex items-center gap-2 text-[#f5af19]">✦ Escala de funcionários</span>
              <span class="flex items-center gap-2 text-fuchsia-400">✦ Itinerário digital do cliente</span>
              <span class="flex items-center gap-2 text-[#00e5a3]">✦ Gestão documental integrada</span>
              <span class="flex items-center gap-2 text-[#00a8f5]">✦ WhatsApp + Digisac nativo</span>
              <span class="flex items-center gap-2 text-[#f5af19]">✦ Gamificação da equipe</span>
              <span class="flex items-center gap-2 text-rose-400">✦ Pipeline de orçamentos</span>
              <span class="flex items-center gap-2 text-[#00e5a3]">✦ Alertas de passaporte e visto</span>
              <span class="flex items-center gap-2 text-[#00a8f5]">✦ Reembolsos com cronômetro SLA</span>
              <span class="flex items-center gap-2 text-[#f5af19]">✦ Escala de funcionários</span>
              <span class="flex items-center gap-2 text-fuchsia-400">✦ Itinerário digital do cliente</span>
              <span class="flex items-center gap-2 text-[#00e5a3]">✦ Gestão documental integrada</span>
              <span class="flex items-center gap-2 text-[#00a8f5]">✦ WhatsApp + Digisac nativo</span>
              <span class="flex items-center gap-2 text-[#f5af19]">✦ Gamificação da equipe</span>
              <span class="flex items-center gap-2 text-rose-400">✦ Pipeline de orçamentos</span>
            </div>
          </div>

          <!-- Module tour -->
          <div class="w-full text-center mb-8">
            <h2 class="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-[#f5af19] bg-clip-text text-transparent pf-animated-gradient">Conheça os Módulos do PaxFlow</h2>
            <p class="text-sm text-slate-400 font-medium mt-2">Clique nas abas abaixo para visualizar as telas reais da nossa solução</p>
          </div>

          <div class="w-full mb-8">
            <div class="flex flex-wrap justify-center gap-2 p-2 rounded-3xl bg-white/[0.04] border border-white/10 max-w-6xl mx-auto backdrop-blur-md">
              <button id="tab-btn-dashboard" class="px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-lg pf-glow">Painel Comercial</button>
              <button id="tab-btn-viagens" class="px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-[#00a8f5] hover:bg-white/5 transition">Viagens</button>
              <button id="tab-btn-orcamentos" class="px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-[#00e5a3] hover:bg-white/5 transition">Orçamentos</button>
              <button id="tab-btn-inbox" class="px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-rose-400 hover:bg-white/5 transition">Alertas & SLAs</button>
              <button id="tab-btn-escala" class="px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-violet-400 hover:bg-white/5 transition">Escala da Equipe</button>
              <button id="tab-btn-reembolsos" class="px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-amber-400 hover:bg-white/5 transition">Reembolsos</button>
              <button id="tab-btn-relatorios" class="px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition">Relatórios</button>
              <button id="tab-btn-publicas" class="px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-fuchsia-400 hover:bg-white/5 transition">Itinerários públicos</button>
            </div>
          </div>

          <!-- Live preview window -->
          <div class="w-full bg-white/[0.04] border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 text-left backdrop-blur-md min-h-[480px] flex flex-col justify-between pf-glow">
            <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 bg-[#f12711] rounded-full"></span>
                <span class="w-3 h-3 bg-[#f5af19] rounded-full"></span>
                <span class="w-3 h-3 bg-[#00e5a3] rounded-full"></span>
                <span id="window-path-text" class="text-[10px] font-black text-slate-300 ml-2 uppercase tracking-wide">PaxFlow - Painel de Controle</span>
              </div>
              <span class="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#00a8f5]/20 to-[#f5af19]/20 text-[#00e5a3] font-extrabold text-[9px] uppercase border border-[#00e5a3]/30">Demo em Tempo Real</span>
            </div>

            <div id="mockup-panels-container" class="flex-1 flex flex-col justify-center">
              <div id="panel-dashboard" class="space-y-4 tab-pane-transition">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#0052d4]/25 to-[#00e5a3]/10 border border-[#00a8f5]/25 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">💡</span>
                  <span><strong>Visão Comercial Unificada:</strong> O PaxFlow calcula automaticamente faturamento bruto, margem de comissão, ticket médio e taxa de conversão da equipe sem exigir planilhas manuais.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-gradient-to-b from-[#0052d4]/15 to-white/[0.03] border border-white/10 p-5 rounded-2xl"><span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Faturamento Mensal</span><span class="block text-2xl font-black text-[#00a8f5] mt-1">R$ 148.500,00 <span class="text-[10px] text-[#00e5a3] font-extrabold">+14.2%</span></span></div>
                  <div class="bg-gradient-to-b from-[#f12711]/15 to-white/[0.03] border border-white/10 p-5 rounded-2xl"><span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Taxa de Conversão</span><span class="block text-2xl font-black text-[#f5af19] mt-1">24,8%</span></div>
                  <div class="bg-gradient-to-b from-[#00e5a3]/15 to-white/[0.03] border border-white/10 p-5 rounded-2xl"><span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ticket Médio</span><span class="block text-2xl font-black text-[#00e5a3] mt-1">R$ 6.200,00</span></div>
                </div>
                <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                  <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <span class="text-sm font-bold text-white">Funil Comercial Operativo</span>
                    <span class="px-2 py-0.5 rounded-lg bg-[#00e5a3]/15 text-[#00e5a3] text-[9px] font-bold">Dados em Tempo Real</span>
                  </div>
                  <div class="space-y-3">
                    <div><div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Orçamentos Criados</span><span>120</span></div><div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="bg-gradient-to-r from-[#0052d4] to-[#00a8f5] h-full w-full rounded-full"></div></div></div>
                    <div><div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Propostas Enviadas</span><span>75 (62%)</span></div><div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="bg-gradient-to-r from-[#f12711] to-[#f5af19] h-full w-[62%] rounded-full"></div></div></div>
                    <div><div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Negociações Fechadas</span><span>24 (20%)</span></div><div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="bg-gradient-to-r from-[#00e5a3] to-teal-400 h-full w-[20%] rounded-full"></div></div></div>
                  </div>
                </div>
              </div>

              <div id="panel-viagens" class="space-y-4 tab-pane-transition hidden">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#00a8f5]/25 to-cyan-500/10 border border-[#00a8f5]/25 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">✈️</span>
                  <span><strong>Operação de Pós-Venda:</strong> Acompanhe todas as viagens por localizador (LOC), período e rentabilidade. O ícone de SLA (⚠️) avisa quando o passaporte precisa de atenção.</span>
                </div>
                <div class="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                  <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-[600px] text-xs">
                      <thead><tr class="bg-white/[0.04] text-[9px] font-bold uppercase text-slate-400 border-b border-white/10"><th class="px-4 py-3 text-center">SLA</th><th class="px-4 py-3">Cliente / LOC</th><th class="px-4 py-3">Destino</th><th class="px-4 py-3">Financeiro</th><th class="px-4 py-3">Status</th></tr></thead>
                      <tbody class="divide-y divide-white/10 text-slate-300 font-medium">
                        <tr class="hover:bg-white/[0.04] transition"><td class="px-4 py-3 text-center">⚠️</td><td class="px-4 py-3"><strong class="text-white">Passageiro Demo 01</strong> <span class="ml-1 text-[8px] px-1.5 py-0.5 bg-white/10 rounded uppercase">BA921</span></td><td class="px-4 py-3">✈️ Buenos Aires</td><td class="px-4 py-3 text-[#00a8f5] font-bold">R$ 5.400,00</td><td class="px-4 py-3"><span class="px-2 py-0.5 rounded-lg bg-[#f5af19]/15 text-[#f5af19] text-[9px] font-bold uppercase border border-[#f5af19]/25">Pré-Embarque</span></td></tr>
                        <tr class="hover:bg-white/[0.04] transition"><td class="px-4 py-3 text-center">🟢</td><td class="px-4 py-3"><strong class="text-white">Passageira Demo 02</strong> <span class="ml-1 text-[8px] px-1.5 py-0.5 bg-white/10 rounded uppercase">US441</span></td><td class="px-4 py-3">✈️ Orlando</td><td class="px-4 py-3 text-[#00a8f5] font-bold">R$ 12.800,00</td><td class="px-4 py-3"><span class="px-2 py-0.5 rounded-lg bg-[#00a8f5]/15 text-[#00a8f5] text-[9px] font-bold uppercase border border-[#00a8f5]/25">Pós-Venda</span></td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div id="panel-orcamentos" class="space-y-4 tab-pane-transition hidden">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#00e5a3]/25 to-teal-500/10 border border-[#00e5a3]/25 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">🎯</span>
                  <span><strong>CRM Comercial de Alta Performance:</strong> Arraste cards entre os estágios do funil. O sistema arquiva automaticamente propostas paradas há mais de 30 dias.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs">
                  <div class="bg-white/[0.03] border border-white/10 p-3 rounded-2xl"><span class="block font-extrabold text-slate-400 mb-2.5 uppercase text-[8px]">Novo (3)</span><div class="p-2.5 bg-white/[0.06] border border-white/10 rounded-xl"><span class="block font-bold truncate">Grécia / Lua de Mel</span><span class="block text-[8px] text-slate-400">Cliente Exemplo 01</span><span class="block text-[10px] font-black text-[#00a8f5] mt-1">R$ 24.000,00</span></div></div>
                  <div class="bg-white/[0.03] border border-white/10 p-3 rounded-2xl"><span class="block font-extrabold text-slate-400 mb-2.5 uppercase text-[8px]">Em Análise (2)</span><div class="p-2.5 bg-white/[0.06] border border-white/10 rounded-xl"><span class="block font-bold truncate">Férias em Família</span><span class="block text-[8px] text-slate-400">Cliente Exemplo 02</span><span class="block text-[10px] font-black text-[#00a8f5] mt-1">R$ 15.600,00</span></div></div>
                  <div class="bg-white/[0.03] border border-white/10 p-3 rounded-2xl"><span class="block font-extrabold text-slate-400 mb-2.5 uppercase text-[8px]">Proposta (4)</span><div class="p-2.5 bg-white/[0.06] border border-white/10 rounded-xl border-l-2 border-l-[#f5af19]"><span class="block font-bold truncate">Férias em Natal</span><span class="block text-[8px] text-slate-400">Cliente Exemplo 03</span><span class="block text-[10px] font-black text-[#f5af19] mt-1">R$ 8.900,00</span></div></div>
                  <div class="bg-white/[0.03] border border-white/10 p-3 rounded-2xl"><span class="block font-extrabold text-slate-400 mb-2.5 uppercase text-[8px]">Ganho (9)</span><div class="p-2.5 bg-white/[0.06] border border-white/10 rounded-xl border-l-2 border-l-[#00e5a3]"><span class="block font-bold truncate">Mochilão Europa</span><span class="block text-[8px] text-slate-400">Cliente Exemplo 04</span><span class="block text-[10px] font-black text-[#00e5a3] mt-1">R$ 18.200,00</span></div></div>
                </div>
              </div>

              <div id="panel-inbox" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#f12711]/25 to-rose-500/10 border border-[#f12711]/25 text-sm text-slate-200 flex items-center gap-2"><span class="text-lg">🔔</span><span><strong>Alertas e Comunicação WhatsApp:</strong> Receba notificações automáticas de SLA de passaporte (validade &lt; 180 dias) e integre o atendimento Digisac diretamente no sistema.</span></div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-1 space-y-2 border-r border-white/10 pr-3"><span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Alertas Recentes</span>
                    <div class="p-2 bg-[#f12711]/10 border border-[#f12711]/25 rounded-xl"><div class="flex justify-between font-extrabold text-[#f5af19]"><span>SLA Passaporte</span><span>Urgente</span></div><span class="block text-slate-400 truncate mt-0.5">Passageira Demo 03 (Validade &lt; 180d)</span></div>
                    <div class="p-2 bg-white/[0.03] border border-white/10 rounded-xl"><div class="flex justify-between font-bold text-slate-300"><span>Confirmação LOC</span><span>1h atrás</span></div><span class="block text-slate-400 truncate mt-0.5">Voo GRU-CDG confirmado</span></div>
                  </div>
                  <div class="md:col-span-2 space-y-3"><div class="flex items-center justify-between border-b border-white/10 pb-2"><span class="font-extrabold text-white">Thread: Alerta SLA - Passageira Demo 03</span><span class="text-[8px] font-bold text-[#f5af19]">Viagem em 15/12/2026</span></div><div class="p-2.5 bg-[#f12711]/10 border border-[#f12711]/25 rounded-xl"><span class="font-extrabold text-[#f5af19]">Sistema:</span><p class="text-slate-400 mt-0.5">Atenção! Passaporte vence em menos de 6 meses no dia da viagem.</p></div><div class="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-right ml-4"><span class="font-extrabold text-white">Consultor Demo:</span><p class="text-slate-400 mt-0.5">Solicitação de renovação já está em andamento.</p></div></div>
                </div>
              </div>

              <div id="panel-escala" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-violet-600/25 to-fuchsia-500/10 border border-violet-500/25 text-sm text-slate-200 flex items-center gap-2"><span class="text-lg">👥</span><span><strong>Central Administrativa de Escala:</strong> Grade mensal de horários, banco de folgas, aprovação de trocas de turno e mural de treinamentos em um só painel.</span></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1.5"><span class="font-bold text-white block">Grade de Turnos (Visão da Agência)</span><p class="text-slate-400">Tabela interativa com cores por horário e coluna fixa de equipe.</p></div>
                  <div class="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1.5"><span class="font-bold text-white block">Trocas & Banco de Folgas</span><p class="text-slate-400">Fluxo de aceite duplo com aprovação da gestão e controle de saldos.</p></div>
                </div>
              </div>

              <div id="panel-reembolsos" class="space-y-3 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#f5af19]/25 to-amber-500/10 border border-[#f5af19]/25 text-sm text-slate-200 flex items-center gap-2"><span class="text-lg">💸</span><span><strong>Conciliação de Estornos Aéreos:</strong> Acompanhe cada etapa dos reembolsos junto às cias aéreas. Não deixe nenhum crédito da agência esquecido.</span></div>
                <div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="border-b border-white/10 text-slate-400"><th class="pb-2 font-bold uppercase text-[8px]">Passageiro</th><th class="pb-2 font-bold uppercase text-[8px]">Fornecedor</th><th class="pb-2 font-bold uppercase text-[8px]">Valor</th><th class="pb-2 font-bold uppercase text-[8px]">Etapa</th></tr></thead><tbody class="divide-y divide-white/10 text-slate-300"><tr><td class="py-2.5 font-bold text-white">Passageiro Demo 04</td><td class="py-2.5">LATAM Airlines</td><td class="py-2.5 font-bold text-[#f5af19]">R$ 1.850,00</td><td class="py-2.5"><span class="px-1.5 py-0.5 bg-[#f12711]/15 text-[#f5af19] border border-[#f12711]/25 text-[8px] font-bold rounded-md uppercase">Solicitado</span></td></tr><tr><td class="py-2.5 font-bold text-white">Passageira Demo 05</td><td class="py-2.5">Decolar</td><td class="py-2.5 font-bold text-[#f5af19]">R$ 3.400,00</td><td class="py-2.5"><span class="px-1.5 py-0.5 bg-[#f5af19]/15 text-[#f5af19] border border-[#f5af19]/25 text-[8px] font-bold rounded-md uppercase">Em Análise</span></td></tr></tbody></table></div>
              </div>

              <div id="panel-relatorios" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-indigo-600/25 to-[#00a8f5]/10 border border-indigo-500/25 text-sm text-slate-200 flex items-center gap-2"><span class="text-lg">📊</span><span><strong>Relatórios e Inteligência Financeira:</strong> Markups por produto, taxa de fechamento da equipe e projeções de receitas para 30/60/90 dias.</span></div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Conversão Geral</span><span class="block text-lg font-black text-[#00e5a3] mt-1">28,4%</span></div><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Markup Médio</span><span class="block text-lg font-black text-[#00a8f5] mt-1">18,5%</span></div><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Pipeline Estimado</span><span class="block text-lg font-black text-[#f5af19] mt-1">R$ 115.800,00</span></div></div>
              </div>

              <div id="panel-publicas" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-fuchsia-600/25 to-purple-500/10 border border-fuchsia-500/25 text-sm text-slate-200 flex items-center gap-2"><span class="text-lg">🌟</span><span><strong>Itinerários Digitais VIP & Pesquisa NPS:</strong> Links públicos de viagem com as cores da sua agência. O cliente acessa vouchers e responde à avaliação NPS no celular.</span></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-bold text-fuchsia-400 uppercase tracking-wider block">Itinerário Digital do Cliente</span><p class="text-slate-400 leading-normal mt-1">O passageiro acompanha voos, hotéis, traslados e vouchers, organizados por dia com contagem regressiva.</p></div><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-bold text-[#00e5a3] uppercase tracking-wider block">Pesquisa de Satisfação NPS</span><p class="text-slate-400 leading-normal mt-1">Pesquisa pós-viagem amigável que alimenta as estatísticas do painel de controle.</p></div></div>
              </div>
            </div>
          </div>
        </main>

        <!-- ===== SUA MARCA (brand showcase com carrossel - de volta da v1) ===== -->
        <section id="marcas" class="relative z-10 w-full py-20 px-6 border-t border-white/10 bg-gradient-to-b from-transparent to-[#0a0d1f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-12 relative">
            <div data-parallax="22" class="pf-float pointer-events-none absolute -top-6 -right-4 hidden lg:flex w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/10 items-center justify-center shadow-xl opacity-60"><img src="/logo.svg" alt="" class="w-12 h-12 object-contain" /></div>
            <div class="text-center max-w-3xl mx-auto space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-[#00e5a3]/15 border border-[#00e5a3]/30 text-[#00e5a3] text-[10px] font-black uppercase tracking-widest">Identidade Visual da Sua Agência</span>
              <h2 class="text-3xl md:text-5xl font-black tracking-tight">Sua Marca, Seu Logotipo e Suas Cores<br class="hidden md:block" /> em Cada Ponto de Contato</h2>
              <p class="text-sm text-slate-400 font-medium leading-relaxed">Toda a comunicação enviada ao seu passageiro carrega o logotipo oficial, o nome e a paleta de cores da sua própria agência — sem marcas de terceiros.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
              <div data-reveal="left" class="lg:col-span-4 bg-white/[0.04] border border-white/10 p-6 rounded-3xl space-y-3 shadow-md flex flex-col justify-between">
                <div class="space-y-2.5">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Canais com Sua Marca</span>
                  <button id="brand-tab-itinerario" class="w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-xl pf-glow"><span class="p-2 bg-white/20 rounded-xl text-sm">📱</span><div><strong class="block text-xs font-black">01. Itinerário Digital VIP</strong><span class="text-[10px] opacity-90 font-medium block mt-0.5">Página do cliente com logo, cores e timeline no celular.</span></div></button>
                  <button id="brand-tab-voucher" class="w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10"><span class="p-2 bg-[#f5af19]/15 text-[#f5af19] rounded-xl text-sm">📄</span><div><strong class="block text-xs font-black">02. Vouchers PDF com Logomarca</strong><span class="text-[10px] text-slate-400 font-medium block mt-0.5">Documento impresso de reserva com cabeçalho oficial.</span></div></button>
                  <button id="brand-tab-nps" class="w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10"><span class="p-2 bg-[#00e5a3]/15 text-[#00e5a3] rounded-xl text-sm">⭐</span><div><strong class="block text-xs font-black">03. Pesquisa NPS Customizada</strong><span class="text-[10px] text-slate-400 font-medium block mt-0.5">Avaliação pós-viagem com sua paleta de cores.</span></div></button>
                  <button id="brand-tab-whatsapp" class="w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10"><span class="p-2 bg-sky-500/15 text-sky-400 rounded-xl text-sm">💬</span><div><strong class="block text-xs font-black">04. Notificações no WhatsApp</strong><span class="text-[10px] text-slate-400 font-medium block mt-0.5">Avisos automáticos de embarque com dados da agência.</span></div></button>
                </div>
                <div class="text-[10px] text-slate-400 pt-3 border-t border-white/10 flex items-center gap-2"><span class="text-base">💡</span><span><strong>Configuração em 1 clique:</strong> Basta fazer upload da sua logomarca em <em>Configurações</em> e todos os 4 canais são atualizados instantaneamente.</span></div>
              </div>

              <div data-reveal="right" class="lg:col-span-8 bg-white/[0.04] border border-white/10 rounded-3xl shadow-xl p-6 md:p-8 text-left relative overflow-hidden backdrop-blur-md flex flex-col justify-between min-h-[400px] pf-glow">
                <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                  <div class="flex items-center gap-2"><span class="w-3 h-3 bg-[#f12711] rounded-full"></span><span class="w-3 h-3 bg-[#f5af19] rounded-full"></span><span class="w-3 h-3 bg-[#00e5a3] rounded-full"></span><span id="brand-preview-title" class="text-[10px] font-black text-slate-300 ml-2 uppercase tracking-wide">01. Itinerário Digital no Celular</span></div>
                  <span class="px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#00a8f5]/20 to-[#f5af19]/20 text-[#00e5a3] font-extrabold text-[9px] uppercase border border-[#00e5a3]/30">Rotação Automática (3s)</span>
                </div>

                <div id="brand-panels-container" class="flex-1 flex flex-col justify-center">
                  <div id="brand-panel-itinerario" class="space-y-4 tab-pane-transition">
                    <div class="bg-white/[0.04] p-5 rounded-2xl border border-white/10 space-y-3">
                      <div class="flex items-center justify-between border-b border-white/10 pb-3">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0052d4] to-[#00e5a3] flex items-center justify-center text-white text-lg shadow-md">✈️</div><div><strong class="block text-sm font-extrabold text-white">Sua Agência de Viagens</strong><span class="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Itinerário Digital do Cliente</span></div></div>
                        <span class="text-[9px] font-mono font-bold bg-white/10 text-[#00e5a3] px-2 py-1 rounded-lg border border-[#00e5a3]/30">LOC: PAX-8840</span>
                      </div>
                      <div class="grid grid-cols-2 gap-4 text-xs"><div><span class="block text-[9px] font-bold text-slate-400 uppercase">Passageiro VIP</span><strong class="block text-white">Passageiro Fictício (Exemplo)</strong></div><div><span class="block text-[9px] font-bold text-slate-400 uppercase">Destino & Data</span><strong class="block text-white">Paris, França • 14/10/2026</strong></div></div>
                      <button class="w-full py-2.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition bg-gradient-to-r from-[#0052d4] to-[#00a8f5] hover:scale-[1.02]">Ver Detalhes do Voo & Vouchers Protegidos</button>
                    </div>
                  </div>

                  <div id="brand-panel-voucher" class="space-y-4 tab-pane-transition hidden">
                    <div class="bg-white/[0.04] p-5 rounded-2xl border border-white/10 space-y-3">
                      <div class="flex items-center justify-between border-b border-white/10 pb-3"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f5af19] to-[#f12711] flex items-center justify-center text-white text-lg shadow-md">📄</div><div><strong class="block text-sm font-extrabold text-white">Voucher Oficial de Confirmação</strong><span class="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Documento PDF com Logotipo da Sua Agência</span></div></div><span class="text-[9px] font-bold bg-[#00e5a3]/15 text-[#00e5a3] px-2 py-1 rounded-lg">RESERVA CONFIRMADA</span></div>
                      <div class="p-4 bg-white/[0.06] rounded-xl border border-white/10 space-y-1 text-xs"><span class="text-[9px] font-bold text-slate-400 uppercase">Companhia Aérea & Voo</span><strong class="block text-white">Air France • Voo AF-443 (GRU ✈️ CDG)</strong><span class="block text-[9px] text-slate-400">Cabine Executiva • Assento 4A • Bilhete: 057-24901928</span></div>
                    </div>
                  </div>

                  <div id="brand-panel-nps" class="space-y-4 tab-pane-transition hidden">
                    <div class="bg-white/[0.04] p-5 rounded-2xl border border-white/10 space-y-3 text-center">
                      <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00e5a3] to-[#00a8f5] text-white flex items-center justify-center text-xl font-black mx-auto shadow-md pf-pulse-ring">⭐</div>
                      <div><strong class="block text-sm font-extrabold text-white">Como foi sua experiência com a Sua Agência?</strong><span class="block text-[10px] text-slate-400 font-medium">Sua avaliação ajuda a premiar nosso consultor de viagens</span></div>
                      <div class="flex justify-center gap-1.5 pt-2"><span class="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-black text-slate-400">8</span><span class="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-black text-slate-400">9</span><span class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0052d4] to-[#00e5a3] text-white flex items-center justify-center text-xs font-black shadow-md">10</span></div>
                    </div>
                  </div>

                  <div id="brand-panel-whatsapp" class="space-y-4 tab-pane-transition hidden">
                    <div class="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-500/30 space-y-2.5 text-left text-xs">
                      <div class="flex items-center gap-2 border-b border-emerald-500/20 pb-2"><div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-black text-sm">💬</div><div><strong class="block text-white font-extrabold text-xs">Sua Agência de Viagens (WhatsApp Oficial)</strong><span class="block text-[8px] text-emerald-400 font-bold uppercase">Mensagem Automática PaxFlow</span></div></div>
                      <p class="text-slate-300 text-[11px] leading-relaxed">"Olá! 👋 Sua viagem para Paris está se aproximando! Acesse o seu <strong>Itinerário Digital Oficial</strong> no link: <span class="text-[#00e5a3] underline font-bold">suaagencia.paxflow.com/itinerario/PAX-8840</span>"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== INTEGRAÇÕES ===== -->
        <section id="integracao" class="relative z-10 w-full py-20 px-6 border-t border-white/10">
          <div class="pf-zone max-w-6xl mx-auto relative">
            <div data-parallax="34" class="pf-float-slow pointer-events-none absolute -top-10 -left-10 hidden lg:flex w-28 h-28 rounded-3xl bg-white/[0.03] border border-white/10 items-center justify-center shadow-xl opacity-70 rotate-12"><img src="/logo.svg" alt="" class="w-16 h-16 object-contain" /></div>
            <div data-parallax="-28" class="pf-float pointer-events-none absolute -bottom-12 -right-8 hidden lg:flex w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/10 items-center justify-center shadow-xl opacity-70 -rotate-6"><img src="/logo.svg" alt="" class="w-14 h-14 object-contain" /></div>
            <div class="text-center max-w-3xl mx-auto mb-12 space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-[#00a8f5]/15 border border-[#00a8f5]/30 text-[#00a8f5] text-[10px] font-black uppercase tracking-widest">Integrações</span>
              <h2 class="text-3xl md:text-5xl font-black tracking-tight">Conecte-se às ferramentas que já usa</h2>
              <p class="text-sm text-slate-400 font-medium">O PaxFlow se integra nativamente à sua stack de atendimento e emissão, sem fricção.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="up" style="transition-delay:.05s" class="group p-7 rounded-3xl bg-gradient-to-b from-emerald-500/15 to-white/[0.02] border border-emerald-500/25 hover:scale-[1.03] hover:border-emerald-400/50 transition-transform"><div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center mb-4 shadow-lg pf-tilt"><svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg></div><h3 class="text-xl font-black text-white">Digisac / WhatsApp</h3><p class="text-sm text-slate-400 font-medium mt-1 leading-relaxed">Atendimento com histórico split-screen, envio de modelos e notificações automáticas de embarque e NPS.</p></div>
              <div data-reveal="up" style="transition-delay:.15s" class="group p-7 rounded-3xl bg-gradient-to-b from-[#00a8f5]/15 to-white/[0.02] border border-[#00a8f5]/25 hover:scale-[1.03] hover:border-[#00a8f5]/50 transition-transform"><div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0052d4] to-[#00a8f5] text-white flex items-center justify-center mb-4 shadow-lg pf-tilt" style="animation-delay:.5s"><svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></div><h3 class="text-xl font-black text-white">Companhias Aéreas</h3><p class="text-sm text-slate-400 font-medium mt-1 leading-relaxed">Conciliação de reembolsos e créditos, localizadores (LOC) e monitoramento de SLAs de estorno.</p></div>
              <div data-reveal="up" style="transition-delay:.25s" class="group p-7 rounded-3xl bg-gradient-to-b from-[#f5af19]/15 to-white/[0.02] border border-[#f5af19]/25 hover:scale-[1.03] hover:border-[#f5af19]/50 transition-transform"><div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f5af19] to-[#f12711] text-white flex items-center justify-center mb-4 shadow-lg pf-tilt" style="animation-delay:1s"><svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg></div><h3 class="text-xl font-black text-white">Upload & Documentos</h3><p class="text-sm text-slate-400 font-medium mt-1 leading-relaxed">Armazenamento seguro por cliente no Supabase Storage com links de acesso controlados.</p></div>
            </div>
          </div>
        </section>

        <!-- ===== PROBLEMA vs SOLUÇÃO ===== -->
        <section class="relative z-10 w-full py-16 px-6 border-t border-white/10">
          <div class="pf-zone max-w-5xl mx-auto">
            <h2 class="text-2xl md:text-4xl font-black tracking-tight text-center mb-10">Por que substituir planilhas pelo PaxFlow?</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div data-reveal="left" class="p-6 rounded-3xl bg-gradient-to-b from-[#f12711]/10 to-white/[0.02] border border-[#f12711]/20"><span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#f12711]/15 text-[#f5af19] text-[10px] font-bold rounded-lg uppercase tracking-wider mb-4">❌ Como é hoje</span><ul class="space-y-3 text-sm text-slate-400 font-medium"><li class="flex items-start gap-2"><span class="text-[#f12711] shrink-0">✕</span>Informações fragmentadas de localizadores de voo (LOC) e reservas.</li><li class="flex items-start gap-2"><span class="text-[#f12711] shrink-0">✕</span>Falhas no monitoramento de vencimento de passaportes e vistos.</li><li class="flex items-start gap-2"><span class="text-[#f12711] shrink-0">✕</span>Esquecimento de saldos e créditos de reembolso com cias aéreas.</li><li class="flex items-start gap-2"><span class="text-[#f12711] shrink-0">✕</span>Perda de orçamentos e leads no WhatsApp de consultores.</li></ul></div>
              <div data-reveal="right" class="p-6 rounded-3xl bg-gradient-to-b from-[#00e5a3]/10 to-white/[0.02] border border-[#00e5a3]/20"><span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#00e5a3]/15 text-[#00e5a3] text-[10px] font-bold rounded-lg uppercase tracking-wider mb-4">✅ Com o PaxFlow</span><ul class="space-y-3 text-sm text-slate-300 font-medium"><li class="flex items-start gap-2"><span class="text-[#00e5a3] shrink-0">✓</span>Painel comercial com faturamento e markups consolidados.</li><li class="flex items-start gap-2"><span class="text-[#00e5a3] shrink-0">✓</span>Monitoramento de SLAs com alertas automáticos antecipados.</li><li class="flex items-start gap-2"><span class="text-[#00e5a3] shrink-0">✓</span>Automações inteligentes de fluxo e transições de status.</li><li class="flex items-start gap-2"><span class="text-[#00e5a3] shrink-0">✓</span>Fichas de clientes e central de reembolsos unificadas.</li></ul></div>
            </div>
          </div>
        </section>

        <!-- ===== PLANOS ===== -->
        <section id="planos" class="relative z-10 w-full py-20 px-6 border-t border-white/10">
          <div class="pf-zone max-w-5xl mx-auto">
            <div class="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-[#f5af19]/15 border border-[#f5af19]/30 text-[#f5af19] text-[10px] font-black uppercase tracking-widest">Planos</span>
              <h2 class="text-3xl md:text-5xl font-black tracking-tight">Escolha o plano ideal para a sua agência</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="up" style="transition-delay:.05s" class="p-7 rounded-3xl bg-white/[0.04] border border-white/10 hover:scale-[1.02] transition-transform"><h3 class="text-lg font-black text-white">Starter</h3><p class="text-sm text-slate-400 mt-1">Para agências em início de profissionalização</p><div class="mt-5 mb-6"><span class="text-4xl font-black text-[#00a8f5]">R$ 197</span><span class="text-sm text-slate-400">/mês</span></div><ul class="space-y-2.5 text-sm text-slate-300 font-medium"><li class="flex items-center gap-2"><span class="text-[#00e5a3]">✓</span>Até 5 consultores</li><li class="flex items-center gap-2"><span class="text-[#00e5a3]">✓</span>Pipeline de orçamentos</li><li class="flex items-center gap-2"><span class="text-[#00e5a3]">✓</span>Alertas de passaporte e SLA</li></ul><button class="mt-6 w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase transition">Começar</button></div>
              <div data-reveal="up" style="transition-delay:.15s" class="pf-glow relative p-7 rounded-3xl bg-gradient-to-br from-[#0052d4] via-[#00a8f5] to-[#00e5a3] shadow-2xl pf-animated-gradient scale-[1.03]"><span class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#f5af19] text-slate-900 text-[9px] font-black uppercase tracking-wider shadow-lg">Mais Popular</span><h3 class="text-lg font-black text-white">Profissional</h3><p class="text-sm text-white/85 mt-1">Para agências em crescimento</p><div class="mt-5 mb-6"><span class="text-4xl font-black text-white">R$ 397</span><span class="text-sm text-white/80">/mês</span></div><ul class="space-y-2.5 text-sm text-white/95 font-medium"><li class="flex items-center gap-2"><span class="text-white">✓</span>Consultores ilimitados</li><li class="flex items-center gap-2"><span class="text-white">✓</span>Todos os módulos + Digisac</li><li class="flex items-center gap-2"><span class="text-white">✓</span>Relatórios e Analytics</li><li class="flex items-center gap-2"><span class="text-white">✓</span>Itinerários white-label</li></ul><button id="btn-plano-profissional" class="mt-6 w-full py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs uppercase transition">Começar agora</button></div>
              <div data-reveal="up" style="transition-delay:.25s" class="p-7 rounded-3xl bg-white/[0.04] border border-white/10 hover:scale-[1.02] transition-transform"><h3 class="text-lg font-black text-white">Enterprise</h3><p class="text-sm text-slate-400 mt-1">Para franquias e grandes operações</p><div class="mt-5 mb-6"><span class="text-4xl font-black text-[#f5af19]">Sob consulta</span></div><ul class="space-y-2.5 text-sm text-slate-300 font-medium"><li class="flex items-center gap-2"><span class="text-[#00e5a3]">✓</span>Multi-franquia</li><li class="flex items-center gap-2"><span class="text-[#00e5a3]">✓</span>Suporte dedicado</li><li class="flex items-center gap-2"><span class="text-[#00e5a3]">✓</span>Onboarding guiado</li></ul><button id="btn-plano-enterprise" class="mt-6 w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase transition">Falar conosco</button></div>
            </div>
          </div>
        </section>

        <!-- ===== FAQ ===== -->
        <section id="faq" class="relative z-10 w-full py-20 px-6 border-t border-white/10">
          <div class="pf-zone max-w-4xl mx-auto space-y-10">
            <div class="text-center space-y-2"><span class="px-3 py-1 rounded-full bg-white/[0.06] text-slate-300 border border-white/10 text-[10px] font-black uppercase tracking-widest">Tire suas dúvidas</span><h2 class="text-3xl md:text-4xl font-black tracking-tight">Perguntas Frequentes</h2></div>
            <div class="space-y-4">
              <details data-reveal="up" class="group bg-white/[0.04] border border-white/10 rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden" open><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-sm font-extrabold text-white">Como funciona o Modo Demonstração?</h3><span class="ml-1.5 shrink-0 rounded-full bg-white/10 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-sm leading-relaxed text-slate-400 font-medium">É um ambiente de simulação completo e interativo, pré-populado com dados fictícios de clientes, viagens, reembolsos e escalas. Permite testar todas as telas e recursos em tempo real, sem cadastro prévio.</p></details>
              <details data-reveal="up" style="transition-delay:.08s" class="group bg-white/[0.04] border border-white/10 rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-sm font-extrabold text-white">Posso controlar a escala de todos os funcionários?</h3><span class="ml-1.5 shrink-0 rounded-full bg-white/10 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-sm leading-relaxed text-slate-400 font-medium">Sim! O módulo de Central Administrativa permite atribuir turnos, controlar saldos no Banco de Folgas e aprovar solicitações de trocas.</p></details>
              <details data-reveal="up" style="transition-delay:.16s" class="group bg-white/[0.04] border border-white/10 rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-sm font-extrabold text-white">Como funciona o alerta de passaportes e vistos?</h3><span class="ml-1.5 shrink-0 rounded-full bg-white/10 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-sm leading-relaxed text-slate-400 font-medium">O PaxFlow calcula a diferença entre a validade dos documentos e a data da viagem. Se a validade for inferior a 6 meses, gera alertas prioritários no Inbox.</p></details>
              <details data-reveal="up" style="transition-delay:.24s" class="group bg-white/[0.04] border border-white/10 rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-sm font-extrabold text-white">Como a página do cliente assume as cores da minha agência?</h3><span class="ml-1.5 shrink-0 rounded-full bg-white/10 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-sm leading-relaxed text-slate-400 font-medium">Em Configurações, você envia sua logomarca e seleciona a cor primária. Todos os itinerários públicos passam a exibir seu logotipo e paleta automaticamente.</p></details>
            </div>
          </div>
        </section>

        <!-- ===== CTA FINAL ===== -->
        <section id="recursos" class="relative z-10 w-full py-20 px-6 border-t border-white/10 text-center overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-[#0052d4]/30 via-[#0a0d1f] to-[#f12711]/30 pf-animated-gradient opacity-60"></div>
          <div class="pf-zone relative max-w-3xl mx-auto space-y-6">
            <span class="px-4 py-1.5 rounded-full bg-[#00e5a3]/20 text-[#00e5a3] border border-[#00e5a3]/30 text-[10px] font-black uppercase tracking-widest">Leve sua agência para o próximo nível</span>
            <h2 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight pf-shimmer-text">Pronto para revolucionar a operação da sua agência?</h2>
            <p class="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">Assuma o controle total dos pós-vendas, reembolsos, SLAs de vistos e escalas da sua equipe.</p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button id="btn-cta-demo-final" class="pf-animated-gradient w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] shadow-2xl hover:scale-[1.05] transition-transform">Modo Demonstração</button>
              <button id="btn-cta-whatsapp-final" class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 transition">Falar com Consultor</button>
              <button id="btn-cta-login-final" class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-black text-xs tracking-wider uppercase border border-white/15 transition">Acessar Sistema Real</button>
            </div>
          </div>
        </section>

        <!-- ===== FOOTER ===== -->
        <footer class="relative z-10 w-full border-t border-white/10 py-6 px-6 text-center text-xs text-slate-500 font-medium">
          <p>© 2026 PaxFlow. Todos os direitos reservados. Sistema Especializado em CRM & Pós-Venda Turístico.</p>
        </footer>

        <!-- Floating WhatsApp FAB -->
        <a id="btn-floating-whatsapp" href="https://wa.me/5511966989160?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20PaxFlow%20para%20minha%20ag%C3%AAncia." target="_blank" class="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-full shadow-2xl border border-emerald-400/40 transition-all flex items-center gap-2.5 pf-glow">
          <span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span></span>
          <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
          <span>Falar com Especialista</span>
        </a>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const handleStartDemo = () => {
      (window as any).paxflowSandbox = true;
      sessionStorage.setItem('paxflowSandbox', 'true');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sandbox-')) localStorage.removeItem(key);
      });
      window.dispatchEvent(new CustomEvent('paxflow-navigate-to-demo'));
    };

    const handleAcessarReal = () => {
      (window as any).paxflowSandbox = false;
      sessionStorage.removeItem('paxflowSandbox');
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
    document.getElementById('btn-plano-profissional')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-plano-enterprise')?.addEventListener('click', handleWhatsApp);

    const tabs = ['dashboard', 'viagens', 'orcamentos', 'inbox', 'escala', 'reembolsos', 'relatorios', 'publicas'];
    const pathTexts: Record<string, string> = {
      dashboard: 'PaxFlow - Painel de Controle',
      viagens: 'PaxFlow - Operação de Viagens',
      orcamentos: 'PaxFlow - Funil de Orçamentos',
      inbox: 'PaxFlow - Central de Mensagens e Alertas',
      escala: 'PaxFlow - Controle de Escala da Equipe',
      reembolsos: 'PaxFlow - Gestão de Reembolsos',
      relatorios: 'PaxFlow - Relatórios Gerenciais',
      publicas: 'PaxFlow - Itinerário Digital do Passageiro'
    };

    const baseTab = "px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:bg-white/5 transition";
    const activeMap: Record<string, string> = {
      dashboard: "px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-lg pf-glow",
      viagens: "px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-[#00a8f5] to-cyan-500 text-white shadow-lg",
      orcamentos: "px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-[#00e5a3] to-teal-400 text-[#062a1f] shadow-lg",
      inbox: "px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-[#f12711] to-[#f5af19] text-white shadow-lg",
      escala: "px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg",
      reembolsos: "px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-[#f5af19] to-amber-500 text-[#3d2c00] shadow-lg",
      relatorios: "px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-[#00a8f5] text-white shadow-lg",
      publicas: "px-4 py-2.5 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-500 text-white shadow-lg"
    };

    let currentTabIndex = 0;
    let autoTabTimer: any = null;

    const switchTab = (tabName: string) => {
      tabs.forEach(t => {
        const b = document.getElementById(`tab-btn-${t}`);
        if (b && b.id !== `tab-btn-${tabName}`) b.className = baseTab;
        document.getElementById(`panel-${t}`)?.classList.add('hidden');
      });
      const btn = document.getElementById(`tab-btn-${tabName}`);
      if (btn) btn.className = activeMap[tabName];
      document.getElementById(`panel-${tabName}`)?.classList.remove('hidden');
      const pathEl = document.getElementById('window-path-text');
      if (pathEl) pathEl.textContent = pathTexts[tabName];
    };

    tabs.forEach((tab, index) => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      btn?.addEventListener('click', () => {
        if (autoTabTimer) { clearInterval(autoTabTimer); autoTabTimer = null; }
        currentTabIndex = index;
        switchTab(tab);
      });
    });

    autoTabTimer = setInterval(() => {
      currentTabIndex = (currentTabIndex + 1) % tabs.length;
      switchTab(tabs[currentTabIndex]);
    }, 3000);

    // Brand carousel
    const brandTabs = ['itinerario', 'voucher', 'nps', 'whatsapp'];
    const brandTitles: Record<string, string> = {
      itinerario: '01. Itinerário Digital no Celular',
      voucher: '02. Voucher Oficial em PDF com Logomarca',
      nps: '03. Pesquisa NPS da Sua Marca',
      whatsapp: '04. Notificações WhatsApp com Assinatura'
    };
    const brandBase = "w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10";
    const brandActive = "w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-xl pf-glow";

    let brandTabIndex = 0;
    let brandAutoTimer: any = null;

    const switchBrandTab = (tabName: string) => {
      brandTabs.forEach(t => {
        const btn = document.getElementById(`brand-tab-${t}`);
        if (btn && btn.id !== `brand-tab-${tabName}`) btn.className = brandBase;
        document.getElementById(`brand-panel-${t}`)?.classList.add('hidden');
      });
      const activeBtn = document.getElementById(`brand-tab-${tabName}`);
      if (activeBtn) activeBtn.className = brandActive;
      document.getElementById(`brand-panel-${tabName}`)?.classList.remove('hidden');
      const titleEl = document.getElementById('brand-preview-title');
      if (titleEl) titleEl.textContent = brandTitles[tabName];
    };

    brandTabs.forEach((tab, index) => {
      const btn = document.getElementById(`brand-tab-${tab}`);
      btn?.addEventListener('click', () => {
        if (brandAutoTimer) { clearInterval(brandAutoTimer); brandAutoTimer = null; }
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
