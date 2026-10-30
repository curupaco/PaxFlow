export class LandingPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public init(): void {
    document.documentElement.classList.add('dark');
    document.body.style.backgroundColor = '#06070f';
    document.body.style.color = '#ffffff';
    this.setupMetaTags();
    this.render();
    this.setupEventListeners();
    this.setupScrollEffects();
    this.setupPremiumEffects();
  }

  private setupMetaTags(): void {
    document.title = 'PaxFlow - A plataforma que cuida da sua agência da proposta ao pós-venda';

    const setMeta = (property: string, content: string, isName = false) => {
      const selector = isName ? `meta[name="${property}"]` : `meta[property="${property}"]`;
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        if (isName) el.setAttribute('name', property);
        else el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const siteUrl = window.location.origin + window.location.pathname;
    const imageUrl = window.location.origin + '/og-image.png';

    setMeta('description', 'A plataforma definitiva para agências de viagens: propostas no Studio™, auditoria pré-embarque com Risk Score™, escalas da equipe, conciliação financeira e recompra preditiva sem planilhas.', true);
    setMeta('og:type', 'website');
    setMeta('og:site_name', 'PaxFlow');
    setMeta('og:title', 'PaxFlow - A plataforma que cuida da sua agência da proposta ao pós-venda');
    setMeta('og:description', 'Centralize propostas de luxo, auditoria de viagens, plantão da equipe, conciliação financeira e recompra preditiva em uma plataforma viva, sem planilhas.');
    setMeta('og:image', imageUrl);
    setMeta('og:image:secure_url', imageUrl);
    setMeta('og:image:type', 'image/png');
    setMeta('og:image:width', '1200');
    setMeta('og:image:height', '630');
    setMeta('og:url', siteUrl);

    setMeta('twitter:card', 'summary_large_image', true);
    setMeta('twitter:title', 'PaxFlow - A plataforma que cuida da sua agência da proposta ao pós-venda', true);
    setMeta('twitter:description', 'A plataforma definitiva para agências de viagens: propostas no Studio™, auditoria pré-embarque com Risk Score™, escalas da equipe, conciliação financeira e recompra preditiva.', true);
    setMeta('twitter:image', imageUrl, true);
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
    const isMobile = window.innerWidth <= 768;

    // Animação de contadores numéricos (subindo de 0 até o valor alvo)
    const animateCounterEl = (el: HTMLElement): void => {
      if (el.getAttribute('data-counted') === 'true') return;
      el.setAttribute('data-counted', 'true');
      const target = parseFloat(el.getAttribute('data-count') || '0');
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1500;
      const start = performance.now();

      const step = (now: number): void => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const currentVal = Math.round(target * eased);
        el.textContent = currentVal + suffix;
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target + suffix;
        }
      };
      requestAnimationFrame(step);
    };

    const counterElements = Array.from(scope.querySelectorAll<HTMLElement>('[data-count]'));

    // No celular, revela imediatamente para evitar atraso na rolagem
    if (isMobile) {
      revealItems.forEach(item => item.classList.add('pf-revealed'));
      counterElements.forEach(counter => animateCounterEl(counter));
    } else {
      if ('IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement;
              animateCounterEl(el);
              obs.unobserve(el);
            }
          });
        }, {
          threshold: 0.15,
          rootMargin: '100px 0px 0px 0px'
        });

        counterElements.forEach(counter => counterObserver.observe(counter));

        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement;
              el.classList.add('pf-revealed');
              obs.unobserve(el);
            }
          });
        }, {
          root: null,
          rootMargin: '400px 0px 150px 0px',
          threshold: 0.01
        });

        revealItems.forEach(item => observer.observe(item));
        revealItems.slice(0, 10).forEach(item => item.classList.add('pf-revealed'));
      } else {
        revealItems.forEach(item => item.classList.add('pf-revealed'));
        counterElements.forEach(counter => animateCounterEl(counter));
      }
    }

    // Barra de progresso de rolagem
    const updateProgress = (sy: number): void => {
      const bar = scope.querySelector<HTMLElement>('#pf-scroll-progress');
      if (!bar) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max <= 0 ? 0 : (sy / max) * 100;
      bar.style.width = pct.toFixed(1) + '%';
    };

    // Parallax leve e suave executado apenas no desktop
    if (!isReduced && !isMobile) {
      let ticking = false;
      const onScroll = (): void => {
        if (!scope || !scope.isConnected) {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
          return;
        }
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const sy = window.scrollY || 0;
          updateProgress(sy);

          const vh = window.innerHeight;
          const mid = vh / 2;
          for (const el of parallaxEls) {
            const rect = el.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > vh) continue;
            const amount = parseFloat(el.getAttribute('data-parallax') || '15');
            const center = rect.top + rect.height / 2;
            const travel = (center - mid) / vh;
            const shift = travel * amount;
            el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
          }
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      onScroll();
    } else {
      const onScrollFallback = (): void => {
        if (!scope || !scope.isConnected) {
          window.removeEventListener('scroll', onScrollFallback);
          return;
        }
        updateProgress(window.scrollY || 0);
      };
      window.addEventListener('scroll', onScrollFallback, { passive: true });
    }

    // Rolagem suave para links internos com âncora
    const anchors = scope.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
    anchors.forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector<HTMLElement>(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: isReduced ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  private setupPremiumEffects(): void {
    const scope = this.container.querySelector('.landing-v2');
    if (!scope) return;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobileDevice = window.innerWidth <= 768;

    const topbar = scope.querySelector<HTMLElement>('#pf-topbar');
    if (topbar && !isMobileDevice) {
      const onTbScroll = () => {
        topbar.classList.toggle('pf-topbar-scrolled', (window.scrollY || 0) > 20);
      };
      window.addEventListener('scroll', onTbScroll, { passive: true });
      onTbScroll();
    }

    if (isReduced || isMobileDevice) return;

    // Efeito de brilho de cursor no desktop
    const glow = scope.querySelector<HTMLElement>('#pf-cursor-glow');
    if (glow && window.matchMedia('(pointer: fine)').matches) {
      let rall = requestAnimationFrame(() => {});
      cancelAnimationFrame(rall);
      let tx = 0, ty = 0, cx = 0, cy = 0, moving = false;
      window.addEventListener('mousemove', (e) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!moving) {
          moving = true;
          glow.style.opacity = '1';
          cx = tx; cy = ty;
          const loop = () => {
            cx += (tx - cx) * 0.12;
            cy += (ty - cy) * 0.12;
            glow.style.transform = `translate3d(${cx - 260}px, ${cy - 260}px, 0)`;
            rall = requestAnimationFrame(loop);
          };
          loop();
        }
      });
      window.addEventListener('mouseleave', () => {
        moving = false;
        glow.style.opacity = '0';
        cancelAnimationFrame(rall);
      });
    }
  }

  public static renderHtml(): string {
    return `
      <div class="landing-v2 min-h-screen max-w-full w-full bg-[#06070f] text-white font-sans selection:bg-cyan-500 selection:text-white relative overflow-x-hidden flex flex-col">

        <!-- ===== AMBIENT COLOR FIELD ===== -->
        <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden max-w-full hidden md:block">
          <div data-parallax="30" class="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#0052d4]/30 via-[#00a8f5]/15 to-transparent blur-3xl pf-float-slow"></div>
          <div data-parallax="-40" class="absolute top-[20%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-bl from-amber-600/20 via-orange-500/10 to-transparent blur-3xl pf-float"></div>
          <div data-parallax="50" class="absolute bottom-[-10%] left-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-[#00e5a3]/20 via-teal-500/10 to-transparent blur-3xl pf-float-delay"></div>
          <div data-parallax="-20" class="absolute top-[45%] left-[35%] w-[30vw] h-[30vw] rounded-full bg-gradient-to-br from-indigo-600/20 to-sky-500/10 blur-3xl pf-float-slow"></div>
          <div class="absolute inset-0 opacity-[0.06] grid-bg"></div>
        </div>

        <!-- ===== LOGO WATERMARK (DESKTOP) ===== -->
        <div class="pointer-events-none fixed inset-0 z-[1] items-center justify-end overflow-hidden max-w-full hidden md:flex">
          <img data-parallax="95" src="/logo.svg" alt="" width="280" height="280" loading="eager" class="pf-logo-watermark max-w-[66vmin] max-h-[66vmin] w-[66vmin] h-[66vmin] object-contain opacity-[0.10] blur-[2px] mr-[-8vmin] saturate-150 drop-shadow-[0_0_40px_rgba(0,168,245,0.25)]" />
        </div>

        <!-- ===== SCROLL PROGRESS BAR ===== -->
        <div class="fixed top-0 left-0 z-[60] h-1 w-full bg-transparent hidden md:block">
          <div id="pf-scroll-progress" class="h-full w-0 bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-amber-400"></div>
        </div>

        <!-- ===== CURSOR GLOW (DESKTOP) ===== -->
        <div id="pf-cursor-glow" class="pf-cursor-glow hidden md:block" aria-hidden="true"></div>

        <!-- ===== CABEÇALHO / TOP NAV ===== -->
        <header id="pf-topbar" class="relative z-30 w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-[#06070f]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 transition-all duration-300">
          <a href="#topo" class="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <span class="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 p-1 shadow-md pf-pulse-ring">
              <img src="/logo.svg" alt="PaxFlow Logo" class="w-full h-full object-contain rounded-lg" />
            </span>
            <span class="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-amber-400 bg-clip-text text-transparent pf-animated-gradient">PaxFlow</span>
          </a>

          <nav class="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <a href="#studio" class="hover:text-amber-300 transition flex items-center gap-1.5"><span class="text-amber-400">✨</span>Studio™</a>
            <a href="#risk-score" class="hover:text-emerald-300 transition flex items-center gap-1.5"><span class="text-emerald-400">🛡️</span>Risk Score™</a>
            <a href="#operacao" class="hover:text-cyan-300 transition flex items-center gap-1.5"><span class="text-cyan-400">👥</span>Operação &amp; Equipe</a>
            <a href="#financeiro" class="hover:text-blue-300 transition flex items-center gap-1.5"><span class="text-blue-400">💳</span>Financeiro &amp; Pós-Venda</a>
            <a href="#next-trip" class="hover:text-purple-300 transition flex items-center gap-1.5"><span class="text-purple-400">🎯</span>Next Trip™</a>
            <a href="#diferenciais" class="hover:text-white transition">Por que o PaxFlow?</a>
            <a href="#faq" class="hover:text-white transition">FAQ</a>
          </nav>

          <div class="flex items-center gap-2">
            <button id="btn-header-whatsapp" class="hidden sm:flex px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wide shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer items-center gap-2">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
              <span>WhatsApp</span>
            </button>
            <button id="btn-menu-demo" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] text-white font-extrabold text-xs tracking-wide shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer">Modo Demo</button>
            <button id="btn-acessar-login" class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs tracking-wide border border-white/15 transition active:scale-95 cursor-pointer">Entrar</button>
          </div>
        </header>

        <!-- ===== HERO PRINCIPAL ===== -->
        <main id="topo" class="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 text-center flex flex-col items-center overflow-hidden">
          <div class="pf-beam"></div>

          <!-- Tag de Posicionamento -->
          <div class="pf-rise inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-cyan-500/30 text-cyan-300 font-bold text-[11px] uppercase tracking-wider mb-8 shadow-sm">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Gestão &amp; Blindagem Operacional para Agências de Turismo
          </div>

          <!-- Emblema de Prestígio -->
          <div data-parallax="20" class="pf-rise-1 relative mb-8">
            <div class="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto">
              <div class="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#0052d4]/30 via-[#00a8f5]/25 to-[#00e5a3]/25 blur-xl opacity-70"></div>
              <div class="relative w-full h-full rounded-2xl bg-slate-900/90 border border-white/20 shadow-2xl flex items-center justify-center p-4 backdrop-blur-xl">
                <img src="/logo.svg" alt="PaxFlow" class="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,168,245,0.35)]" />
              </div>
              <span class="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-emerald-500/40 text-[9px] font-black text-emerald-300 shadow-md flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Operação 24/7
              </span>
            </div>
          </div>

          <!-- H1 Principal Aprovado -->
          <h1 class="pf-hero-headline pf-rise-2 text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 max-w-5xl leading-tight">
            <span class="pf-shimmer-text">Pax</span><span class="bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-amber-400 bg-clip-text text-transparent pf-animated-gradient">Flow</span>
            <span class="block mt-4 text-2xl sm:text-4xl md:text-5xl font-extrabold text-white">A plataforma que cuida da sua agência</span>
            <span class="block mt-2 text-xl sm:text-3xl md:text-4xl font-semibold bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300 bg-clip-text text-transparent pf-animated-gradient">da proposta ao pós-venda</span>
          </h1>

          <p class="pf-rise-3 text-sm sm:text-lg text-slate-300 max-w-3xl mb-10 leading-relaxed font-normal">
            Chega de ficar correndo atrás de voucher no sábado à noite, passageiro com passaporte vencendo e cliente que viaja uma vez e nunca mais volta. O PaxFlow organiza a rotina da sua equipe, blinda suas viagens contra imprevistos e coloca o pós-venda para gerar novas vendas.
          </p>

          <!-- Chamadas de Ação Amigáveis e sem Pressão -->
          <div class="pf-rise-4 flex flex-col sm:flex-row items-center gap-3.5 mb-12 w-full justify-center">
            <button id="btn-iniciar-demo" class="w-full sm:w-auto h-[48px] px-8 rounded-xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] shadow-lg shadow-blue-500/25 hover:scale-[1.02] transition active:scale-95 cursor-pointer">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <span>Navegar no Modo Demonstração</span>
            </button>
            <button id="btn-cta-whatsapp-hero" class="w-full sm:w-auto h-[48px] px-7 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold text-xs uppercase tracking-wider border border-white/20 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2">
              <svg class="w-4 h-4 fill-emerald-400" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
              <span>Conversar com a Gente</span>
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto h-[48px] px-6 rounded-xl bg-transparent hover:bg-white/[0.05] text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer">
              Já é cliente? Entrar
            </button>
          </div>

          <!-- Badges de Confiança Informais -->
          <div class="pf-rise-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-14 text-xs font-semibold text-slate-300">
            <span class="flex items-center gap-2 text-emerald-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Risk Score Integrado
            </span>
            <span class="flex items-center gap-2 text-cyan-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              Sem taxa por consultor
            </span>
            <span class="flex items-center gap-2 text-amber-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              App no Celular com Alertas
            </span>
            <span class="flex items-center gap-2 text-slate-300">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Comece a usar em minutos
            </span>
          </div>

          <!-- ===== PAINEL MATINAL INTEGRADO DAS 08:00 AM ===== -->
          <div data-reveal="up" class="w-full max-w-4xl mx-auto mb-16 p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-xl shadow-2xl pf-glow text-left relative overflow-hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
              <div class="flex items-center gap-3">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                <div>
                  <span class="text-[9px] font-black uppercase tracking-widest text-cyan-400">Rotina Matinal da Agência</span>
                  <h2 class="text-base sm:text-lg font-black text-white">O que acontece na sua carteira hoje</h2>
                </div>
              </div>
              <div class="flex items-center gap-2 self-start sm:self-auto">
                <span class="text-xs text-slate-300">Índice de Saúde:</span>
                <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 87/100 • Protegida
                </span>
              </div>
            </div>

            <!-- Resumo dos Contadores Operacionais -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <span class="block text-2xl font-black text-emerald-400">42</span>
                <span class="text-[10px] uppercase font-bold text-slate-400">Viagens Validadas</span>
              </div>
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <span class="block text-2xl font-black text-amber-400">8</span>
                <span class="text-[10px] uppercase font-bold text-slate-400">Pendências Leves</span>
              </div>
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <span class="block text-2xl font-black text-rose-400">3</span>
                <span class="text-[10px] uppercase font-bold text-slate-400">Ações Críticas</span>
              </div>
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <span class="block text-2xl font-black text-purple-400">12</span>
                <span class="text-[10px] uppercase font-bold text-slate-400">Recompras Quentes</span>
              </div>
            </div>

            <!-- Alertas Práticos do Dia -->
            <div class="space-y-2.5">
              <div class="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2.5 text-xs text-rose-200">
                  <span class="px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 font-black text-[9px] uppercase">Risco Alto</span>
                  <span><strong>João Silva</strong> — Passaporte com menos de 6 meses para embarque em 18 dias (Lisboa)</span>
                </div>
                <span class="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2.5 py-1 rounded-lg self-start sm:self-auto">Avisar Consultor</span>
              </div>
              <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2.5 text-xs text-amber-200">
                  <span class="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 font-black text-[9px] uppercase">Atenção</span>
                  <span><strong>Reserva #8841 (Orlando)</strong> — Voucher de hospedagem não anexado faltando 48h</span>
                </div>
                <span class="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-lg self-start sm:self-auto">Cobrar Operadora</span>
              </div>
              <div class="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2.5 text-xs text-purple-200">
                  <span class="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 font-black text-[9px] uppercase">Recompra</span>
                  <span><strong>Ana Paula Ramos (NPS 10)</strong> — Viajou para Bariloche há 11 meses e está no ciclo de compra</span>
                </div>
                <span class="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-lg self-start sm:self-auto">Mensagem Pronta</span>
              </div>
            </div>
          </div>
        </main>

        <!-- ===== A JORNADA CRONOLÓGICA DA SUA AGÊNCIA (5 ETAPAS COM TELAS REAIS) ===== -->
        <div class="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-24">

          <!-- ETAPA 1: A PROPOSTA QUE ENCANTA (PAXFLOW STUDIO™) -->
          <section id="studio" class="scroll-mt-24">
            <div class="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-2">
              <span>01. Na Criação da Proposta</span>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-5 space-y-4">
                <h2 class="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Propostas visuais que encantam o passageiro e aceleram o fechamento
                </h2>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  Chega de enviar propostas em PDF engessado ou bloco de texto gigante no WhatsApp que ninguém tem paciência de ler.
                </p>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  Com o <strong>PaxFlow Studio™</strong>, seu consultor monta itinerários inspiradores em minutos, com galeria de fotos em alta resolução, dia a dia detalhado e valores claros. O cliente recebe um link interativo para abrir no celular, folhear a viagem e aprovar com um clique.
                </p>
                <ul class="space-y-2 text-xs sm:text-sm text-slate-200 pt-2 font-medium">
                  <li class="flex items-center gap-2.5"><span class="text-amber-400 font-black">✓</span> Galeria de fotos da agência integrada para hotéis e destinos</li>
                  <li class="flex items-center gap-2.5"><span class="text-amber-400 font-black">✓</span> Pré-visualização lado a lado (desktop e celular) em tempo real</li>
                  <li class="flex items-center gap-2.5"><span class="text-amber-400 font-black">✓</span> Sua marca, logo e cores em destaque absoluto</li>
                </ul>
              </div>

              <!-- Prévia Visual da Tela Real: PaxFlow Studio™ -->
              <div class="lg:col-span-7 bg-slate-900/90 border border-amber-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-md pf-glow">
                <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4 text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                    <span class="text-slate-400 font-semibold ml-2 text-[11px]">PaxFlow Studio™ — Editor de Proposta VIP</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">Live Preview</span>
                </div>

                <!-- Simulação Visual do Studio -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Coluna Editor -->
                  <div class="space-y-3 p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs">
                    <span class="text-[10px] font-black uppercase text-amber-400">Montagem do Itinerário</span>
                    <div class="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                      <span class="text-[11px] font-bold text-white block">Destino: Maldivas &amp; Doha</span>
                      <span class="text-[10px] text-slate-400">7 Noites • Resort 5★ All Inclusive</span>
                    </div>
                    <div class="space-y-1.5">
                      <div class="p-2 rounded-lg bg-white/[0.03] text-[10px] text-slate-300 flex justify-between">
                        <span>Dia 1: Chegada em Malé e hidroavião</span>
                        <span class="text-emerald-400">Fotos OK</span>
                      </div>
                      <div class="p-2 rounded-lg bg-white/[0.03] text-[10px] text-slate-300 flex justify-between">
                        <span>Dia 2: Villa sobre as águas</span>
                        <span class="text-emerald-400">Fotos OK</span>
                      </div>
                      <div class="p-2 rounded-lg bg-white/[0.03] text-[10px] text-slate-300 flex justify-between">
                        <span>Dia 3: Jantar no restaurante submerso</span>
                        <span class="text-emerald-400">Fotos OK</span>
                      </div>
                    </div>
                    <div class="pt-2 border-t border-white/10 flex justify-between items-center">
                      <span class="text-[11px] text-slate-300">Total por casal:</span>
                      <span class="text-xs font-black text-amber-300">USD 8.450</span>
                    </div>
                  </div>

                  <!-- Coluna Preview Mobile do Passageiro -->
                  <div class="p-3 rounded-2xl bg-slate-950 border border-amber-500/20 text-center flex flex-col justify-between">
                    <div>
                      <div class="w-full h-28 rounded-xl bg-gradient-to-tr from-cyan-900 to-blue-700 relative overflow-hidden mb-2.5 flex items-end p-2.5 text-left">
                        <div class="absolute inset-0 bg-black/30"></div>
                        <div class="relative z-10">
                          <span class="text-[9px] font-black uppercase text-amber-300">Sua Agência Viagens</span>
                          <h4 class="text-xs font-black text-white">Maldivas Inesquecíveis</h4>
                        </div>
                      </div>
                      <p class="text-[10px] text-slate-300 text-left px-1">
                        Preparamos cada detalhe da sua lua de mel com mimos exclusivos e transfer privativo.
                      </p>
                    </div>
                    <div class="mt-3 pt-2 border-t border-white/10">
                      <button class="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[10px] uppercase shadow-md pointer-events-none">
                        Aprovar esta Proposta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ETAPA 2: A BLINDAGEM PRÉ-EMBARQUE (PAXFLOW RISK SCORE™) -->
          <section id="risk-score" class="scroll-mt-24">
            <div class="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest mb-2">
              <span>02. Antes do Embarque</span>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-5 space-y-4">
                <h2 class="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Auditoria contínua para nenhuma viagem da sua agência dar problema
                </h2>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  A pior sensação para um dono de agência é receber uma ligação desesperada no sábado à noite com uma família barrada no check-in por visto vencido, passaporte com menos de 6 meses ou falta de voucher.
                </p>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  O <strong>PaxFlow Risk Score™</strong> audita diariamente cada viagem da sua base: prazos de visto, regras sanitárias, confirmação de hotel, seguro e contato pré-embarque de 24h e 48h. Se 15 passageiros tiverem a mesma pendência, você resolve em lote com um único clique.
                </p>
                <ul class="space-y-2 text-xs sm:text-sm text-slate-200 pt-2 font-medium">
                  <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-black">✓</span> Alertas antecipados de passaporte e visto (180, 90, 60 e 30 dias)</li>
                  <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-black">✓</span> Checagem sanitária e regras pré-embarque por destino</li>
                  <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-black">✓</span> Ações em lote para notificar múltiplos passageiros de uma vez</li>
                </ul>
              </div>

              <!-- Prévia Visual da Tela Real: PaxFlow Risk Score™ -->
              <div class="lg:col-span-7 bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-md pf-glow">
                <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4 text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                    <span class="text-slate-400 font-semibold ml-2 text-[11px]">PaxFlow Risk Score™ — Painel de Auditoria Pré-Embarque</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Onda 3 Ativa</span>
                </div>

                <div class="overflow-x-auto custom-scrollbar">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="text-[9px] uppercase tracking-widest font-black text-slate-400 bg-slate-950 border-b border-slate-800">
                        <th class="py-2.5 px-3">Passageiro / Destino</th>
                        <th class="py-2.5 px-3">Embarque</th>
                        <th class="py-2.5 px-3 text-center">Score</th>
                        <th class="py-2.5 px-3">Diagnóstico</th>
                        <th class="py-2.5 px-3 text-center w-28">Ação</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      <tr>
                        <td class="py-3 px-3">
                          <span class="font-bold text-white block">Fernanda Costa</span>
                          <span class="text-[10px] text-slate-400">Paris (CDG)</span>
                        </td>
                        <td class="py-3 px-3 text-slate-300 text-[11px]">Em 14 dias</td>
                        <td class="py-3 px-3 text-center">
                          <span class="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-black text-[10px] border border-rose-500/30">45</span>
                        </td>
                        <td class="py-3 px-3 text-[10px] text-rose-300">
                          Passaporte com 5 meses de validade
                        </td>
                        <td class="py-3 px-3 text-center">
                          <button class="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/40 pointer-events-none">Cobrar</button>
                        </td>
                      </tr>
                      <tr>
                        <td class="py-3 px-3">
                          <span class="font-bold text-white block">Marcelo Ramos</span>
                          <span class="text-[10px] text-slate-400">Santiago (SCL)</span>
                        </td>
                        <td class="py-3 px-3 text-slate-300 text-[11px]">Em 48 horas</td>
                        <td class="py-3 px-3 text-center">
                          <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-black text-[10px] border border-amber-500/30">70</span>
                        </td>
                        <td class="py-3 px-3 text-[10px] text-amber-300">
                          Voucher de hotel pendente
                        </td>
                        <td class="py-3 px-3 text-center">
                          <button class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 pointer-events-none">Anexar</button>
                        </td>
                      </tr>
                      <tr>
                        <td class="py-3 px-3">
                          <span class="font-bold text-white block">Camila Prado</span>
                          <span class="text-[10px] text-slate-400">Orlando (MCO)</span>
                        </td>
                        <td class="py-3 px-3 text-slate-300 text-[11px]">Em 22 dias</td>
                        <td class="py-3 px-3 text-center">
                          <span class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black text-[10px] border border-emerald-500/30">100</span>
                        </td>
                        <td class="py-3 px-3 text-[10px] text-emerald-300">
                          Tudo conferido e validado
                        </td>
                        <td class="py-3 px-3 text-center">
                          <span class="text-emerald-400 text-xs font-black">Protegido</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span class="text-slate-400 text-[11px]">3 viagens com pendências similares selecionadas</span>
                  <button class="px-3 py-1.5 rounded-xl bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/40 font-bold text-[10px] border border-cyan-500/40 flex items-center gap-1.5 pointer-events-none">
                    <span>⚡ Aplicar Ação em Lote (Notificar Consultores)</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- ETAPA 3: A OPERAÇÃO VIVA & PLANTÕES DA EQUIPE -->
          <section id="operacao" class="scroll-mt-24">
            <div class="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest mb-2">
              <span>03. Durante a Viagem &amp; no Plantão</span>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-5 space-y-4">
                <h2 class="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Equipe alinhada em plantões e avisos no celular sem sobrecarregar ninguém
                </h2>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  Sua agência precisa atender imprevistos nos finais de semana e feriados, mas gerenciar escalas no grupo de WhatsApp vira uma bagunça de folgas acumuladas e consultores esgotados.
                </p>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  O PaxFlow organiza a <strong>escala de plantão</strong> com equilíbrio, controla o banco de compensação de folgas de cada atendente e distribui as viagens em trânsito com clareza. E no bolso, o consultor de plantão recebe notificações push no aplicativo para agir na hora.
                </p>
                <ul class="space-y-2 text-xs sm:text-sm text-slate-200 pt-2 font-medium">
                  <li class="flex items-center gap-2.5"><span class="text-cyan-400 font-black">✓</span> Grade visual de escalas para fins de semana, noites e feriados</li>
                  <li class="flex items-center gap-2.5"><span class="text-cyan-400 font-black">✓</span> Banco de folgas automático com compensação transparente</li>
                  <li class="flex items-center gap-2.5"><span class="text-cyan-400 font-black">✓</span> App mobile no celular (PWA) com notificações push nativas</li>
                </ul>
              </div>

              <!-- Prévia Visual da Tela Real: Escalas & App Mobile -->
              <div class="lg:col-span-7 bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-md pf-glow">
                <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4 text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                    <span class="text-slate-400 font-semibold ml-2 text-[11px]">PaxFlow Escalas &amp; Alertas Mobile</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">Plantão Ativo</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <!-- Escala Semanal -->
                  <div class="sm:col-span-2 space-y-2.5 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs">
                    <span class="text-[10px] font-black uppercase text-cyan-400 block">Grade do Final de Semana</span>
                    <div class="p-2 rounded-xl bg-white/[0.04] flex items-center justify-between">
                      <div>
                        <span class="font-bold text-white block text-xs">Sábado (Plantão Geral)</span>
                        <span class="text-[10px] text-slate-400">Responsável: Juliana Prado</span>
                      </div>
                      <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">Confirmada</span>
                    </div>
                    <div class="p-2 rounded-xl bg-white/[0.04] flex items-center justify-between">
                      <div>
                        <span class="font-bold text-white block text-xs">Domingo (Plantão Noturno)</span>
                        <span class="text-[10px] text-slate-400">Responsável: Rodrigo Alves</span>
                      </div>
                      <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">+1 Folga</span>
                    </div>
                    <div class="p-2 rounded-xl bg-white/[0.04] flex items-center justify-between text-[11px]">
                      <span class="text-slate-300">Banco de Folgas da Equipe:</span>
                      <span class="font-black text-amber-300">4 folgas a compensar</span>
                    </div>
                  </div>

                  <!-- Notificação no Celular -->
                  <div class="p-3 rounded-2xl bg-slate-950 border border-cyan-500/20 flex flex-col justify-between">
                    <div>
                      <span class="text-[9px] font-black uppercase text-cyan-300 block mb-2 text-center">Aviso no Bolso</span>
                      <div class="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-left">
                        <div class="flex items-center gap-1.5 mb-1">
                          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                          <span class="text-[9px] font-bold text-slate-300">PaxFlow Push</span>
                        </div>
                        <span class="text-[10px] font-bold text-white block">Voo Antecipado</span>
                        <span class="text-[9px] text-slate-400">LA8041 teve horário alterado em 2h. Passageiro já notificado.</span>
                      </div>
                    </div>
                    <span class="text-[9px] text-slate-500 text-center mt-2">Sem precisar abrir notebook</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ETAPA 4: PÓS-VENDA ATIVO & CONCILIAÇÃO FINANCEIRA -->
          <section id="financeiro" class="scroll-mt-24">
            <div class="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest mb-2">
              <span>04. No Pós-Venda &amp; no Caixa</span>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-5 space-y-4">
                <h2 class="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Controle de reembolsos aéreos e conciliação bancária especializada
                </h2>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  Quantos reembolsos aéreos sua agência já perdeu o prazo por falta de acompanhamento? E quanto tempo você gasta tentando conciliar contas a pagar de consolidadoras e recebimento de taxa DU no extrato?
                </p>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  O PaxFlow possui um <strong>cronômetro de SLA</strong> para reembolsos das companhias aéreas e um <strong>Módulo Financeiro completo</strong>: contas a pagar, comissões a receber, importação de extratos bancários em PDF/CSV com baixa ágil e calendário de fluxo de caixa com alertas de picos.
                </p>
                <ul class="space-y-2 text-xs sm:text-sm text-slate-200 pt-2 font-medium">
                  <li class="flex items-center gap-2.5"><span class="text-blue-400 font-black">✓</span> Cronômetro de prazos de reembolso de cias aéreas e consolidadoras</li>
                  <li class="flex items-center gap-2.5"><span class="text-blue-400 font-black">✓</span> Contas a pagar e receber específicas para a dinâmica do turismo</li>
                  <li class="flex items-center gap-2.5"><span class="text-blue-400 font-black">✓</span> Importação de extrato bancário em PDF e CSV com conciliação</li>
                </ul>
              </div>

              <!-- Prévia Visual da Tela Real: Financeiro & Reembolsos -->
              <div class="lg:col-span-7 bg-slate-900/90 border border-blue-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-md pf-glow">
                <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4 text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                    <span class="text-slate-400 font-semibold ml-2 text-[11px]">PaxFlow Financeiro &amp; Conciliação de Reembolsos</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">Caixa Conciliado</span>
                </div>

                <div class="space-y-3">
                  <!-- Bloco Reembolsos com SLA -->
                  <div class="p-3 rounded-2xl bg-black/40 border border-white/10">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-[10px] font-black uppercase text-amber-400">Reembolsos com Prazo de Companhia Aérea</span>
                      <span class="text-[10px] text-slate-400">3 pendentes de crédito</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
                        <div>
                          <span class="font-bold text-white block text-[11px]">LATAM (LOC 7A9X2)</span>
                          <span class="text-[10px] text-slate-400">R$ 3.840,00</span>
                        </div>
                        <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">SLA: 4 dias</span>
                      </div>
                      <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
                        <div>
                          <span class="font-bold text-white block text-[11px]">Air France (LOC AF81)</span>
                          <span class="text-[10px] text-slate-400">R$ 6.120,00</span>
                        </div>
                        <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">SLA: 2 dias</span>
                      </div>
                    </div>
                  </div>

                  <!-- Bloco Conciliação Bancária -->
                  <div class="p-3 rounded-2xl bg-black/40 border border-white/10">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-[10px] font-black uppercase text-blue-400">Extrato Bancário Conciliado (PDF/CSV)</span>
                      <span class="text-[10px] text-emerald-400 font-bold">100% Baixas Automáticas</span>
                    </div>
                    <div class="space-y-1.5 text-xs">
                      <div class="p-2 rounded-lg bg-white/[0.03] flex justify-between items-center text-[10px]">
                        <span class="text-slate-300">Consolidadora Fly — Fatura Semanal #902</span>
                        <span class="text-rose-400 font-bold">- R$ 14.280,00</span>
                        <span class="text-emerald-400 font-semibold">Conciliado</span>
                      </div>
                      <div class="p-2 rounded-lg bg-white/[0.03] flex justify-between items-center text-[10px]">
                        <span class="text-slate-300">Recebimento Taxa DU — Cartão Débito</span>
                        <span class="text-emerald-400 font-bold">+ R$ 1.650,00</span>
                        <span class="text-emerald-400 font-semibold">Conciliado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ETAPA 5: O PRÓXIMO EMBARQUE (NEXT TRIP ENGINE™) -->
          <section id="next-trip" class="scroll-mt-24">
            <div class="flex items-center gap-2 text-purple-400 text-xs font-black uppercase tracking-widest mb-2">
              <span>05. No Próximo Ciclo</span>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div class="lg:col-span-5 space-y-4">
                <h2 class="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Encontre quem está pronto para recomprar dentro da sua própria base
                </h2>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  Adquirir novos clientes no turismo custa cada vez mais caro. Enquanto isso, dezenas de passageiros que amaram viajar com a sua agência ficam meses esquecidos sem receber uma abordagem no momento ideal.
                </p>
                <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  O <strong>Next Trip Engine™</strong> analisa a sazonalidade, o histórico de destinos, o intervalo médio e as avaliações de satisfação da sua base em 5 vetores matemáticos para te avisar: <em>"A família Silva viaja todo mês de julho. É hora de mandar esta proposta personalizada no WhatsApp"</em>.
                </p>
                <ul class="space-y-2 text-xs sm:text-sm text-slate-200 pt-2 font-medium">
                  <li class="flex items-center gap-2.5"><span class="text-purple-400 font-black">✓</span> Algoritmo transparente de pontuação de recompra (0-100)</li>
                  <li class="flex items-center gap-2.5"><span class="text-purple-400 font-black">✓</span> Reativação de orçamentos e propostas antigas</li>
                  <li class="flex items-center gap-2.5"><span class="text-purple-400 font-black">✓</span> Sugestão de mensagem personalizada de WhatsApp em 1 clique</li>
                </ul>
              </div>

              <!-- Prévia Visual da Tela Real: Next Trip Engine™ -->
              <div class="lg:col-span-7 bg-slate-900/90 border border-purple-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-md pf-glow">
                <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4 text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                    <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                    <span class="text-slate-400 font-semibold ml-2 text-[11px]">Next Trip Engine™ — Radar Preditivo de Recompra</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">12 Oportunidades</span>
                </div>

                <div class="space-y-2.5">
                  <div class="p-3.5 rounded-2xl bg-black/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-white text-xs">Luciana Mendonça</span>
                        <span class="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-black">Score 94</span>
                      </div>
                      <span class="text-[10px] text-slate-300 block mt-0.5">Última viagem há 11 meses (NPS 10) • Histórico de férias de verão</span>
                    </div>
                    <button class="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 self-start sm:self-auto pointer-events-none">
                      Abrir no WhatsApp
                    </button>
                  </div>

                  <div class="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-white text-xs">Carlos Eduardo &amp; Família</span>
                        <span class="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-black">Score 88</span>
                      </div>
                      <span class="text-[10px] text-slate-300 block mt-0.5">Sazonalidade anual em Julho (Neve/Ski) • Orçamento anterior reativado</span>
                    </div>
                    <button class="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 self-start sm:self-auto pointer-events-none">
                      Abrir no WhatsApp
                    </button>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 text-center">
                  O PaxFlow calcula automaticamente quem deve ser procurado hoje para você não depender de memória.
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- ===== POR QUE O PAXFLOW É DIFERENTE DOS SISTEMAS TRADICIONAIS ===== -->
        <section id="diferenciais" class="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-white/10">
          <div class="text-center max-w-3xl mx-auto mb-12">
            <span class="px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-widest">
              Uma Conversa Franca
            </span>
            <h2 class="text-2xl sm:text-4xl font-black text-white mt-3">
              Por que o PaxFlow não se parece com os sistemas tradicionais?
            </h2>
            <p class="text-sm sm:text-base text-slate-300 mt-2 font-normal">
              A maioria dos softwares de agência foi construída nos anos 2000 pensando apenas em emitir faturas ou guardar cadastros. Nós pensamos no que realmente tira o seu sono.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Modelo Antigo -->
            <div class="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
              <span class="text-xs font-black uppercase text-rose-400 tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-rose-400"></span> O jeito tradicional (com planilhas e sistemas engessados)
              </span>
              <ul class="space-y-3 text-xs sm:text-sm text-slate-400 font-normal">
                <li class="flex items-start gap-2.5">
                  <span class="text-rose-400 font-bold shrink-0">✕</span>
                  <span>Passaportes e vistos anotados em planilhas que ninguém lembra de abrir a tempo.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-rose-400 font-bold shrink-0">✕</span>
                  <span>Escalas de plantão combinadas no grupo de WhatsApp que geram atritos e folgas perdidas.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-rose-400 font-bold shrink-0">✕</span>
                  <span>Reembolsos aéreos esquecidos que passam do prazo da companhia aérea e viram prejuízo.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-rose-400 font-bold shrink-0">✕</span>
                  <span>Cobranças que sobem a cada novo consultor contratado, punindo o crescimento da sua equipe.</span>
                </li>
              </ul>
            </div>

            <!-- Jeito PaxFlow -->
            <div class="p-6 rounded-3xl bg-cyan-950/20 border border-cyan-500/30 space-y-4 pf-glow">
              <span class="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-cyan-400"></span> O jeito PaxFlow (operando com inteligência e calma)
              </span>
              <ul class="space-y-3 text-xs sm:text-sm text-slate-200 font-medium">
                <li class="flex items-start gap-2.5">
                  <span class="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>O Risk Score audita tudo todos os dias e te avisa com semanas de folga antes do embarque.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>Grade de plantões visual com banco de compensação de folgas e avisos no celular via aplicativo.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>Cronômetro de SLA para reembolsos e conciliação bancária por extrato em PDF e CSV.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>Sem pegadinhas por consultor: coloque toda a equipe para rodar com previsibilidade total.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ===== SUA MARCA EM PRIMEIRO LUGAR (WHITE-LABEL) ===== -->
        <section id="marcas" class="w-full max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-white/10">
          <div class="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 text-center space-y-3 max-w-4xl mx-auto">
            <span class="text-amber-400 text-xs font-black uppercase tracking-widest">Sua Agência nos Holofotes</span>
            <h2 class="text-xl sm:text-3xl font-black text-white">O passageiro enxerga a sua marca, não o PaxFlow</h2>
            <p class="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto font-normal">
              Todos os itinerários digitais no celular, vouchers em PDF e pesquisas de satisfação NPS são gerados automaticamente com o logotipo, cores e identidade da sua agência. O PaxFlow é o motor invisível que faz você brilhar.
            </p>
          </div>
        </section>

        <!-- ===== FECHAMENTO COMERCIAL: DOSE DUPLA DIRETA ===== -->
        <section class="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 border-t border-white/10">
          <div class="text-center mb-10">
            <span class="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
              Próximo Passo
            </span>
            <h2 class="text-2xl sm:text-4xl font-black text-white mt-3">
              Como você prefere conhecer o PaxFlow?
            </h2>
            <p class="text-sm text-slate-300 mt-2 font-normal">
              Sem pressão, sem pegadinhas. Escolha a forma mais confortável para você:
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Card 1: Testar com as Próprias Mãos -->
            <div class="p-7 rounded-3xl bg-slate-900/90 border border-cyan-500/40 flex flex-col justify-between shadow-xl space-y-6">
              <div>
                <div class="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black text-lg mb-4">
                  🕹️
                </div>
                <h3 class="text-lg font-black text-white">Quero testar com minhas próprias mãos</h3>
                <p class="text-xs sm:text-sm text-slate-300 mt-2 font-normal leading-relaxed">
                  Criamos um modo de demonstração completo com viagens, passageiros e alertas fictícios para você navegar pelas telas e sentir a agilidade na prática agora mesmo.
                </p>
              </div>
              <button id="btn-cta-demo-final" class="w-full h-[46px] rounded-xl bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition active:scale-95 cursor-pointer flex items-center justify-center gap-2">
                <span>Explorar Modo Demonstração</span>
              </button>
            </div>

            <!-- Card 2: Bater um Papo no WhatsApp -->
            <div class="p-7 rounded-3xl bg-slate-900/90 border border-emerald-500/40 flex flex-col justify-between shadow-xl space-y-6">
              <div>
                <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-lg mb-4">
                  💬
                </div>
                <h3 class="text-lg font-black text-white">Prefiro bater um papo no WhatsApp</h3>
                <p class="text-xs sm:text-sm text-slate-300 mt-2 font-normal leading-relaxed">
                  Sem apresentações engessadas ou discursos ensaiados. Vamos conversar sobre a rotina da sua agência, tirar dúvidas e ver se o PaxFlow faz sentido para a sua equipe.
                </p>
              </div>
              <button id="btn-cta-whatsapp-final" class="w-full h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition active:scale-95 cursor-pointer flex items-center justify-center gap-2">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
                <span>Chamar nosso time no WhatsApp</span>
              </button>
            </div>
          </div>
        </section>

        <!-- ===== FAQ INFORMAL E DIRETO ===== -->
        <section id="faq" class="w-full max-w-4xl mx-auto px-4 sm:px-6 py-14 border-t border-white/10">
          <div class="text-center mb-10">
            <span class="text-xs font-black uppercase text-slate-400 tracking-widest">Dúvidas Frequentes</span>
            <h2 class="text-xl sm:text-3xl font-black text-white mt-1">Perguntas que todo dono de agência nos faz</h2>
          </div>

          <div class="space-y-3.5">
            <details class="group p-4 rounded-2xl bg-white/[0.03] border border-white/10 [&_summary::-webkit-details-marker]:hidden">
              <summary class="flex items-center justify-between cursor-pointer font-bold text-sm text-white">
                <span>O PaxFlow substitui meu sistema de emissão ou minha consolidadora?</span>
                <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p class="text-xs sm:text-sm text-slate-300 mt-3 font-normal leading-relaxed">
                Não. Você continua emitindo normalmente pelas suas consolidadoras ou companhias aéreas habituais. O PaxFlow entra imediatamente depois da emissão: para garantir que o cliente seja bem atendido, que nenhum documento dê problema no aeroporto, que a equipe organize plantões e que as contas a pagar e reembolsos fiquem conciliados.
              </p>
            </details>

            <details class="group p-4 rounded-2xl bg-white/[0.03] border border-white/10 [&_summary::-webkit-details-marker]:hidden">
              <summary class="flex items-center justify-between cursor-pointer font-bold text-sm text-white">
                <span>Vocês cobram a mais por cada consultor cadastrado?</span>
                <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p class="text-xs sm:text-sm text-slate-300 mt-3 font-normal leading-relaxed">
                Não penalizamos agências que crescem. Nosso modelo comercial foi pensado para que toda a sua equipe (consultores, emissores, financeiro e gestores) possa usar a plataforma sem surpresas no final do mês.
              </p>
            </details>

            <details class="group p-4 rounded-2xl bg-white/[0.03] border border-white/10 [&_summary::-webkit-details-marker]:hidden">
              <summary class="flex items-center justify-between cursor-pointer font-bold text-sm text-white">
                <span>Minha equipe é pequena, o PaxFlow funciona para nós?</span>
                <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p class="text-xs sm:text-sm text-slate-300 mt-3 font-normal leading-relaxed">
                Com certeza. Inclusive, quanto menor a equipe, mais importante é ter um sistema que faça a checagem automática de documentos e reembolsos para evitar que você fique sobrecarregado tendo que conferir tudo manualmente.
              </p>
            </details>

            <details class="group p-4 rounded-2xl bg-white/[0.03] border border-white/10 [&_summary::-webkit-details-marker]:hidden">
              <summary class="flex items-center justify-between cursor-pointer font-bold text-sm text-white">
                <span>Preciso instalar algum programa pesado nos computadores?</span>
                <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p class="text-xs sm:text-sm text-slate-300 mt-3 font-normal leading-relaxed">
                Nada. O PaxFlow roda 100% na nuvem em qualquer navegador (Chrome, Safari, Edge) no Windows, Mac ou Linux. E para o celular, você e sua equipe contam com nosso aplicativo leve que envia notificações em tempo real.
              </p>
            </details>
          </div>
        </section>

        <!-- ===== RODAPÉ ===== -->
        <footer class="w-full border-t border-white/10 py-8 px-4 sm:px-6 bg-[#04050a] text-center text-xs text-slate-500">
          <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <span class="font-black text-slate-300 text-sm">PaxFlow</span>
              <span>— Gestão &amp; Pós-Venda para Agências de Turismo</span>
            </div>
            <div class="flex items-center gap-4 text-slate-400 text-xs">
              <a href="#topo" class="hover:text-white transition">Início</a>
              <a href="#studio" class="hover:text-white transition">Studio™</a>
              <a href="#risk-score" class="hover:text-white transition">Risk Score™</a>
              <a href="#financeiro" class="hover:text-white transition">Financeiro</a>
              <button id="btn-footer-demo" class="hover:text-cyan-400 transition cursor-pointer">Modo Demo</button>
              <button id="btn-footer-login" class="hover:text-white transition cursor-pointer">Entrar</button>
            </div>
          </div>
          <div class="mt-4 text-[10px] text-slate-600">
            © ${new Date().getFullYear()} PaxFlow. Todos os direitos reservados. Feito com excelência para o turismo.
          </div>
        </footer>

      </div>
    `;
  }

  private render(): void {
    this.container.innerHTML = LandingPage.renderHtml();
  }

  private setupEventListeners(): void {
    const handleStartDemo = () => {
      (window as any).paxflowSandbox = true;
      sessionStorage.setItem('paxflowSandbox', 'true');
      Object.keys(localStorage).forEach(key => {
        if ((key.startsWith('sandbox-') || key.startsWith('paxflow-')) && key !== 'theme' && key !== 'paxflow-sidebar-collapsed') {
          localStorage.removeItem(key);
        }
      });
      if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
        window.location.href = '/';
      } else {
        window.dispatchEvent(new CustomEvent('paxflow-navigate-to-demo'));
      }
    };

    const handleAcessarReal = () => {
      (window as any).paxflowSandbox = false;
      sessionStorage.removeItem('paxflowSandbox');
      if (window.location.pathname !== '/' || window.location.search) {
        window.location.href = '/#login';
      } else {
        window.location.hash = '#login';
        window.dispatchEvent(new CustomEvent('paxflow-navigate-to-login'));
      }
    };

    const handleWhatsApp = () => {
      window.open('https://wa.me/5511966989160?text=Ol%C3%A1!%20Gostaria%20de%20conversar%20sobre%20o%20PaxFlow%20para%20minha%20ag%C3%AAncia.', '_blank');
    };

    // Botões de Demonstração
    document.getElementById('btn-iniciar-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-menu-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-cta-demo-final')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-footer-demo')?.addEventListener('click', handleStartDemo);

    // Botões de Acesso / Login
    document.getElementById('btn-acessar-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-conhecer-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-footer-login')?.addEventListener('click', handleAcessarReal);

    // Botões de WhatsApp
    document.getElementById('btn-header-whatsapp')?.addEventListener('click', handleWhatsApp);
    document.getElementById('btn-cta-whatsapp-hero')?.addEventListener('click', handleWhatsApp);
    document.getElementById('btn-cta-whatsapp-final')?.addEventListener('click', handleWhatsApp);
  }
}
