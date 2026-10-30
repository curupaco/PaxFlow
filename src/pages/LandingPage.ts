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

    setMeta('description', 'A plataforma definitiva para agências de viagens: propostas cinematográficas no Studio™, auditoria pré-embarque com Risk Score™, escalas da equipe, conciliação financeira e recompra preditiva sem planilhas.', true);
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
    setMeta('twitter:description', 'A plataforma definitiva para agências de viagens: propostas cinematográficas no Studio™, auditoria pré-embarque com Risk Score™, escalas da equipe, conciliação financeira e recompra preditiva.', true);
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

    // Animação de contadores numéricos
    const animateCounterEl = (el: HTMLElement): void => {
      if (el.getAttribute('data-counted') === 'true') return;
      el.setAttribute('data-counted', 'true');
      const target = parseFloat(el.getAttribute('data-count') || '0');
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1600;
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

    // Rolagem suave para links internos
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

    if (isReduced || isMobileDevice) {
      const bars = scope.querySelectorAll<HTMLElement>('.pf-bar-fill');
      bars.forEach(bar => {
        bar.style.setProperty('--bar-w', (bar.getAttribute('data-bar') || '0') + '%');
        bar.classList.add('pf-revealed');
      });
      return;
    }

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

    // Barras de progresso animadas
    const bars = scope.querySelectorAll<HTMLElement>('.pf-bar-fill');
    const runBars = () => {
      const panel = scope.querySelector<HTMLElement>('#panel-dashboard');
      if (!panel || panel.classList.contains('hidden')) return;
      bars.forEach(bar => {
        if (bar.getAttribute('data-done') === 'true') return;
        bar.setAttribute('data-done', 'true');
        bar.style.setProperty('--bar-w', (bar.getAttribute('data-bar') || '0') + '%');
        requestAnimationFrame(() => bar.classList.add('pf-revealed'));
      });
    };
    window.addEventListener('scroll', runBars, { passive: true });
    window.addEventListener('pf:anim-bars', runBars);
    runBars();
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
        <header id="pf-topbar" class="relative z-30 w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-[#06070f]/85 backdrop-blur-xl border-b border-white/10 sticky top-0 transition-all duration-300">
          <a href="#topo" class="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <span class="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 p-1 shadow-md pf-pulse-ring">
              <img src="/logo.svg" alt="PaxFlow Logo" class="w-full h-full object-contain rounded-lg" />
            </span>
            <span class="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-amber-400 bg-clip-text text-transparent pf-animated-gradient">PaxFlow</span>
          </a>

          <nav class="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <a href="#modulos" class="hover:text-cyan-300 transition flex items-center gap-1.5"><span class="text-cyan-400">🖥️</span>Telas do Sistema</a>
            <a href="#studio-section" class="hover:text-amber-300 transition flex items-center gap-1.5"><span class="text-amber-400">✨</span>Studio™</a>
            <a href="#risk-score-section" class="hover:text-emerald-300 transition flex items-center gap-1.5"><span class="text-emerald-400">🛡️</span>Risk Score™</a>
            <a href="#next-trip-section" class="hover:text-indigo-300 transition flex items-center gap-1.5"><span class="text-indigo-400">🎯</span>Next Trip™</a>
            <a href="#financeiro-section" class="hover:text-blue-300 transition flex items-center gap-1.5"><span class="text-blue-400">💳</span>Financeiro</a>
            <a href="#marcas" class="hover:text-purple-300 transition">Sua Marca</a>
            <a href="#diferenciais" class="hover:text-white transition">Por que PaxFlow?</a>
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

          <!-- Logo grande centralizado em card de bússola com rotação e órbita -->
          <div data-parallax="26" class="pf-rise-1 relative mb-10 sm:mb-14">
            <div class="relative w-56 h-56 md:w-72 md:h-72 pf-float mx-auto">
              <div class="absolute -inset-8 rounded-full bg-gradient-to-br from-[#0052d4] via-[#00a8f5] to-[#00e5a3] blur-3xl opacity-60 pf-glow"></div>
              <div class="relative w-full h-full rounded-full bg-gradient-to-br from-[#0a1a3f] to-[#0d0f1f] border-2 border-[#00a8f5]/40 shadow-2xl flex items-center justify-center overflow-hidden backdrop-blur-md">
                <img src="/logo.svg" alt="PaxFlow" class="w-[82%] h-[82%] object-contain pf-spin-slow filter drop-shadow-[0_4px_20px_rgba(0,168,245,0.4)]" />
              </div>
              <span class="absolute -top-3 -left-3 w-11 h-11 rounded-full bg-gradient-to-br from-[#f12711] to-[#f5af19] flex items-center justify-center text-white font-black text-lg shadow-xl pf-bounce select-none">✈️</span>
              <span class="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-br from-[#00e5a3] to-[#00a8f5] flex items-center justify-center text-white text-lg font-black shadow-xl pf-bounce select-none" style="animation-delay:.4s">+</span>
              <span class="absolute top-1/2 -left-16 hidden md:flex w-24 h-24 rounded-2xl bg-white/[0.04] border border-white/10 items-center justify-center pf-spin-rev shadow-xl">
                <img src="/logo.svg" alt="" class="w-14 h-14 object-contain" />
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
            Chega de ficar correndo atrás de voucher no sábado à noite, passageiro barrado por passaporte e cliente que viaja uma vez e nunca mais volta. O PaxFlow organiza a rotina da sua equipe, blinda suas viagens contra imprevistos e coloca o pós-venda para gerar novas vendas.
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

        <!-- ===== O GRANDE TOUR VISUAL INTERATIVO PELAS TELAS REAIS ===== -->
        <section id="modulos" class="w-full max-w-6xl mx-auto mb-20 px-4 sm:px-6 text-left">
          <div class="w-full text-center mb-8">
            <span class="px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-widest">
              Software Vivo &amp; Transparente
            </span>
            <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-white mt-3">
              Conheça as Telas Reais do PaxFlow
            </h2>
            <p class="text-xs sm:text-sm text-slate-400 font-medium mt-1.5">
              Clique nas abas abaixo para navegar por cada módulo do sistema exatamente como ele opera no dia a dia da agência:
            </p>
          </div>

          <!-- Seletor de Abas Completo -->
          <div class="w-full mb-6">
            <div class="flex items-center overflow-x-auto custom-scrollbar md:flex-wrap md:justify-center gap-1.5 sm:gap-2 p-2 rounded-2xl sm:rounded-3xl bg-slate-900/95 border border-slate-700/80 max-w-6xl mx-auto backdrop-blur-md shadow-2xl">
              <button id="tab-btn-dashboard" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-lg pf-glow cursor-pointer">Painel Comercial</button>
              <button id="tab-btn-risk" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-emerald-300 hover:border-emerald-500/40 transition cursor-pointer">
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                Risk Score™ (Onda 3)
              </button>
              <button id="tab-btn-nexttrip" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-indigo-300 hover:border-indigo-500/40 transition cursor-pointer">
                <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                Next Trip Engine™
              </button>
              <button id="tab-btn-studio" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-amber-300 hover:border-amber-500/40 transition cursor-pointer">
                <span class="text-xs">✨</span>
                PaxFlow Studio™
              </button>
              <button id="tab-btn-financeiro" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-blue-300 hover:border-blue-500/40 transition cursor-pointer">
                <span class="text-xs">💳</span>
                Financeiro &amp; Conciliação
              </button>
              <button id="tab-btn-viagens" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-[#00a8f5] hover:border-blue-500/40 transition cursor-pointer">Viagens</button>
              <button id="tab-btn-orcamentos" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-[#00e5a3] hover:border-emerald-500/40 transition cursor-pointer">Orçamentos &amp; CRM</button>
              <button id="tab-btn-inbox" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-rose-400 hover:border-rose-500/40 transition cursor-pointer">Decisões &amp; Inbox</button>
              <button id="tab-btn-escala" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-violet-400 hover:border-violet-500/40 transition cursor-pointer">Escala da Equipe</button>
              <button id="tab-btn-reembolsos" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-amber-400 hover:border-amber-500/40 transition cursor-pointer">Reembolsos Aéreos</button>
              <button id="tab-btn-relatorios" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-indigo-400 hover:border-indigo-500/40 transition cursor-pointer">Relatórios</button>
              <button id="tab-btn-publicas" class="shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-fuchsia-400 hover:border-fuchsia-500/40 transition cursor-pointer">Itinerário Mobile</button>
            </div>
          </div>

          <!-- Janela do Live Preview com Telas Reais -->
          <div class="w-full bg-white/[0.04] border border-white/10 rounded-3xl shadow-2xl p-5 sm:p-7 md:p-8 text-left backdrop-blur-md min-h-0 flex flex-col justify-between pf-glow">
            <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-5">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-3 h-3 bg-[#f12711] rounded-full shrink-0"></span>
                <span class="w-3 h-3 bg-[#f5af19] rounded-full shrink-0"></span>
                <span class="w-3 h-3 bg-[#00e5a3] rounded-full shrink-0"></span>
                <span id="window-path-text" class="text-[10px] font-black text-slate-300 ml-2 uppercase tracking-wide truncate">PaxFlow - Painel de Controle</span>
              </div>
              <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-extrabold text-[9px] uppercase border border-cyan-500/30 shrink-0">Tela Real do Sistema</span>
            </div>

            <div id="mockup-panels-container" class="flex-1 flex flex-col justify-center">

              <!-- Painel 1: Dashboard Comercial -->
              <div id="panel-dashboard" class="space-y-4 tab-pane-transition">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-[#0052d4]/25 to-[#00e5a3]/10 border border-[#00a8f5]/25 text-xs text-slate-200 flex items-center gap-2.5">
                  <span class="text-cyan-400 font-black text-base">📊</span>
                  <span><strong>Visão Comercial Unificada:</strong> O PaxFlow calcula automaticamente faturamento bruto, margem de comissão, rentabilidade total, ticket médio e taxa de conversão sem exigir fórmulas manuais de Excel.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div class="bg-gradient-to-b from-[#0052d4]/15 to-white/[0.03] border border-white/10 p-4 rounded-2xl">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Faturamento Mensal</span>
                    <span class="block text-2xl font-black text-[#00a8f5] mt-1">R$ 148.500,00 <span class="text-[10px] text-[#00e5a3] font-extrabold">+14.2%</span></span>
                  </div>
                  <div class="bg-gradient-to-b from-[#f12711]/15 to-white/[0.03] border border-white/10 p-4 rounded-2xl">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Taxa de Conversão</span>
                    <span class="block text-2xl font-black text-[#f5af19] mt-1">24,8%</span>
                  </div>
                  <div class="bg-gradient-to-b from-[#00e5a3]/15 to-white/[0.03] border border-white/10 p-4 rounded-2xl">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
                    <span class="block text-2xl font-black text-[#00e5a3] mt-1">R$ 6.200,00</span>
                  </div>
                </div>
                <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                  <div class="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <span class="text-xs font-bold text-white">Funil Comercial Operativo</span>
                    <span class="px-2 py-0.5 rounded-lg bg-[#00e5a3]/15 text-[#00e5a3] text-[9px] font-bold">Tempo Real</span>
                  </div>
                  <div class="space-y-2.5">
                    <div>
                      <div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Orçamentos Criados</span><span>120</span></div>
                      <div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="pf-bar-fill bg-gradient-to-r from-[#0052d4] to-[#00a8f5] h-full rounded-full" data-bar="100"></div></div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Propostas Enviadas</span><span>75 (62%)</span></div>
                      <div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="pf-bar-fill bg-gradient-to-r from-[#f12711] to-[#f5af19] h-full rounded-full" data-bar="62"></div></div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Negociações Fechadas</span><span>24 (20%)</span></div>
                      <div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="pf-bar-fill bg-gradient-to-r from-[#00e5a3] to-teal-400 h-full rounded-full" data-bar="20"></div></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Painel 2: Risk Score (Onda 3) -->
              <div id="panel-risk" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-emerald-400 text-base font-black">🛡️</span>
                    <span><strong>Risk Score™ (Onda 3):</strong> Auditoria de regras sanitárias (Schengen 30k€, CIVP Febre Amarela Anvisa, Visto EUA), prazos de passaporte e ações em lote para 100% da carteira.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40">Saúde: 92/100 • Blindada</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="bg-slate-900/90 border border-emerald-500/30 p-3.5 rounded-2xl space-y-2.5">
                    <div class="flex items-center justify-between">
                      <span class="font-extrabold text-white text-xs">Paris &amp; Roma (Espaço Schengen)</span>
                      <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black rounded-lg">Score 95</span>
                    </div>
                    <p class="text-slate-400 text-[10px]">Passageiro: Mariana Costa • Embarque em 22 dias</p>
                    <div class="space-y-1 text-[10px] text-emerald-300 font-semibold">
                      <div>✓ Apólice de Seguro Viagem 30.000€ (Tratado de Schengen)</div>
                      <div>✓ Passaporte com validade superior a 6 meses</div>
                      <div>✓ Localizadores aéreos (LOC) conferidos e quitados</div>
                    </div>
                  </div>
                  <div class="bg-slate-900/90 border border-amber-500/30 p-3.5 rounded-2xl space-y-2.5">
                    <div class="flex items-center justify-between">
                      <span class="font-extrabold text-white text-xs">Orlando &amp; Miami (EUA)</span>
                      <span class="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-black rounded-lg">Score 68</span>
                    </div>
                    <p class="text-slate-400 text-[10px]">Passageiro: Família Alcantara • Embarque em 12 dias</p>
                    <div class="space-y-1 text-[10px]">
                      <div class="text-amber-300">⚠ Voucher de hospedagem pendente de emissão</div>
                      <div class="text-emerald-300 font-semibold">✓ Vistos consulares B1/B2 confirmados</div>
                      <div class="text-emerald-300 font-semibold">✓ Bilhetes aéreos emitidos</div>
                    </div>
                  </div>
                  <div class="bg-slate-900/90 border border-rose-500/30 p-3.5 rounded-2xl space-y-2.5">
                    <div class="flex items-center justify-between">
                      <span class="font-extrabold text-white text-xs">Tailândia &amp; Bangkok (Ásia)</span>
                      <span class="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[9px] font-black rounded-lg">Score 42</span>
                    </div>
                    <p class="text-slate-400 text-[10px]">Passageiro: Roberto Fonseca • Embarque em 5 dias</p>
                    <div class="space-y-1 text-[10px]">
                      <div class="text-rose-300 font-bold">✕ Falta CIVP Anvisa Febre Amarela (mínimo 10 dias)</div>
                      <div class="text-rose-300 font-bold">✕ Falta checagem pré-embarque de 24h</div>
                      <div class="text-emerald-300 font-semibold">✓ Voo internacional emitido</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Painel 3: Next Trip Engine -->
              <div id="panel-nexttrip" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-indigo-400 text-base font-black">🎯</span>
                    <span><strong>Next Trip Engine™:</strong> Motor preditivo de recompra com 5 vetores matemáticos transparentes (Sazonalidade, NPS, Perfil, Férias e SLA).</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black border border-indigo-500/40">12 Oportunidades Quentes</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="bg-slate-900/90 border border-indigo-500/40 p-3.5 rounded-2xl space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-white text-xs">Mariana Costa</span>
                      <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black rounded-lg">Score 94</span>
                    </div>
                    <p class="text-slate-400 text-[10px]">Última viagem: Orlando há 11 meses • Promotora NPS 10</p>
                    <div class="p-2 bg-indigo-950/60 rounded-xl border border-indigo-500/30 text-indigo-200 text-[10px] font-bold">
                      Próximo Passo: Europa Clássica (Paris &amp; Roma)
                    </div>
                    <button class="w-full py-1.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-black rounded-lg text-[10px] uppercase pointer-events-none">Mensagem de WhatsApp Pronta</button>
                  </div>
                  <div class="bg-slate-900/90 border border-indigo-500/40 p-3.5 rounded-2xl space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-white text-xs">Carlos Eduardo &amp; Família</span>
                      <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black rounded-lg">Score 88</span>
                    </div>
                    <p class="text-slate-400 text-[10px]">Sazonalidade: Neve em Julho • Orçamento antigo reativado</p>
                    <div class="p-2 bg-indigo-950/60 rounded-xl border border-indigo-500/30 text-indigo-200 text-[10px] font-bold">
                      Próximo Passo: Bariloche / Valle Nevado
                    </div>
                    <button class="w-full py-1.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-black rounded-lg text-[10px] uppercase pointer-events-none">Mensagem de WhatsApp Pronta</button>
                  </div>
                  <div class="bg-slate-900/90 border border-indigo-500/40 p-3.5 rounded-2xl space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-white text-xs">Juliana &amp; Pedro (Casal)</span>
                      <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black rounded-lg">Score 86</span>
                    </div>
                    <p class="text-slate-400 text-[10px]">Última viagem: Trancoso • Aniversário de Casamento em Nov</p>
                    <div class="p-2 bg-indigo-950/60 rounded-xl border border-indigo-500/30 text-indigo-200 text-[10px] font-bold">
                      Próximo Passo: Resort All-Inclusive Caribe
                    </div>
                    <button class="w-full py-1.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-black rounded-lg text-[10px] uppercase pointer-events-none">Mensagem de WhatsApp Pronta</button>
                  </div>
                </div>
              </div>

              <!-- Painel 4: PaxFlow Studio -->
              <div id="panel-studio" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-amber-400 text-base font-black">✨</span>
                    <span><strong>PaxFlow Studio™:</strong> Montador de propostas cinematográficas com Live Preview dividido, ingestão nativa de PDFs de operadoras e galeria de fotos própria.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">Visualizador em Alta Fidelidade</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <span class="text-[10px] font-black uppercase text-amber-400">Editor Estruturado (Split-Screen)</span>
                    <div class="p-2 bg-white/[0.04] rounded-lg">
                      <span class="font-bold text-white block text-xs">Lua de Mel nas Maldivas &amp; Doha</span>
                      <span class="text-[10px] text-slate-400">Extraído automaticamente do PDF da operadora em 1 clique</span>
                    </div>
                    <div class="space-y-1 text-[10px] text-slate-300">
                      <div>• Voo Qatar Airways (Guarulhos → Doha → Malé) com PNR validado</div>
                      <div>• 7 noites em Overwater Villa com piscina privativa</div>
                      <div>• Seguro Viagem Internacional com cobertura de USD 100.000</div>
                    </div>
                  </div>
                  <div class="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 text-center flex flex-col justify-between">
                    <div>
                      <span class="text-[9px] font-black uppercase text-amber-300 block mb-1">Visualização do Celular do Passageiro</span>
                      <div class="w-full h-20 rounded-lg bg-gradient-to-tr from-cyan-900 to-blue-700 flex items-center justify-center font-black text-xs text-white">
                        Maldivas Inesquecíveis 🌴
                      </div>
                      <p class="text-[10px] text-slate-300 mt-2">O cliente navega pelo celular com fotos em alta resolução, cronograma e botão de aceite.</p>
                    </div>
                    <span class="text-[9px] text-emerald-400 font-bold mt-2">Analytics: Cliente visualizou 4 vezes</span>
                  </div>
                </div>
              </div>

              <!-- Painel 5: Financeiro & Conciliação -->
              <div id="panel-financeiro" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 to-slate-900 border border-blue-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-blue-400 text-base font-black">💳</span>
                    <span><strong>Módulo Financeiro &amp; FinRecon™:</strong> Contas a pagar de consolidadoras, fluxo de caixa mensal em calendário e conciliação bancária por extrato em PDF/CSV.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black border border-blue-500/40">Caixa em Dia</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="bg-black/40 border border-white/10 p-3.5 rounded-2xl">
                    <span class="text-[9px] uppercase font-bold text-slate-400 block">Faturas de Consolidadoras</span>
                    <span class="text-base font-black text-rose-400 mt-1 block">R$ 48.920,00</span>
                    <span class="text-[10px] text-slate-400">Flytour, Rextur e Ancoradouro conciliadas</span>
                  </div>
                  <div class="bg-black/40 border border-white/10 p-3.5 rounded-2xl">
                    <span class="text-[9px] uppercase font-bold text-slate-400 block">Comissões &amp; Taxas DU</span>
                    <span class="text-base font-black text-emerald-400 mt-1 block">+ R$ 18.450,00</span>
                    <span class="text-[10px] text-slate-400">Total recebido e liquidado no mês</span>
                  </div>
                  <div class="bg-black/40 border border-white/10 p-3.5 rounded-2xl">
                    <span class="text-[9px] uppercase font-bold text-slate-400 block">Extrato Bancário (PDF/CSV)</span>
                    <span class="text-base font-black text-cyan-400 mt-1 block">100% Conciliado</span>
                    <span class="text-[10px] text-slate-400">Baixas automáticas com tolerância</span>
                  </div>
                </div>
              </div>

              <!-- Painel 6: Viagens -->
              <div id="panel-viagens" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-[#0052d4]/20 to-cyan-900/20 border border-blue-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-[#00a8f5] text-base font-black">✈️</span>
                    <span><strong>Gestão Operacional de Viagens:</strong> Dossiê em 5 abas com localizadores (LOC), conferência financeira, divisão de comissões/RAV e histórico auditado.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-[#00a8f5] text-[10px] font-black border border-blue-500/40">Dossiê Completo</span>
                </div>
                <div class="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <span class="font-bold text-white text-xs">VIA-0118 • Família Castro — Santiago &amp; Atacama</span>
                    <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-bold">100% PAGO</span>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-300">
                    <div><strong>Ida:</strong> 15/11/2026</div>
                    <div><strong>Volta:</strong> 25/11/2026</div>
                    <div><strong>LOC Aéreo:</strong> LA9042 (Conferido)</div>
                    <div><strong>Consultor:</strong> Juliana Prado</div>
                  </div>
                </div>
              </div>

              <!-- Painel 7: Orçamentos -->
              <div id="panel-orcamentos" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-[#00e5a3] text-base font-black">📄</span>
                    <span><strong>Pipeline Kanban de Orçamentos:</strong> Gestão de oportunidades com classificação térmica (Frio, Normal, Quente), busca rápida de clientes cadastrados e conversão em viagem com 1 clique.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#00e5a3] text-[10px] font-black border border-emerald-500/40">Kanban Ativo</span>
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div class="p-3 rounded-2xl bg-black/40 border border-white/10">
                    <span class="text-[10px] font-black uppercase text-cyan-400 block mb-2">Em Aberto (14)</span>
                    <div class="p-2 bg-white/[0.04] rounded-lg text-[10px]">Lead: Lucas Mendes • Bariloche 🔥 Quente</div>
                  </div>
                  <div class="p-3 rounded-2xl bg-black/40 border border-white/10">
                    <span class="text-[10px] font-black uppercase text-amber-400 block mb-2">Proposta Enviada (8)</span>
                    <div class="p-2 bg-white/[0.04] rounded-lg text-[10px]">Lead: Beatriz Costa • Maldivas ⚡ Normal</div>
                  </div>
                  <div class="p-3 rounded-2xl bg-black/40 border border-white/10">
                    <span class="text-[10px] font-black uppercase text-emerald-400 block mb-2">Aceito / Venda (24)</span>
                    <div class="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[10px] text-emerald-300">Viagem gerada automaticamente</div>
                  </div>
                </div>
              </div>

              <!-- Painel 8: Decisões & Inbox -->
              <div id="panel-inbox" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 to-amber-950/40 border border-rose-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-rose-400 text-base font-black">⚡</span>
                    <span><strong>Central de Mensageria &amp; Decisões:</strong> Comunicação interna entre consultores, menções com @, tarefas automáticas e alertas em tempo real.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/40">Notificações Vivas</span>
                </div>
                <div class="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div class="p-2.5 bg-white/[0.04] rounded-xl flex items-center justify-between">
                    <span><strong>@Juliana Prado</strong>: O voucher do cliente Roberto foi atualizado pela consolidadora.</span>
                    <span class="text-[9px] text-slate-500">Há 12 min</span>
                  </div>
                  <div class="p-2.5 bg-white/[0.04] rounded-xl flex items-center justify-between">
                    <span><strong>Alerta Operacional</strong>: Embarque de amanhã conferido e validado com sucesso.</span>
                    <span class="text-[9px] text-emerald-400 font-bold">Concluído</span>
                  </div>
                </div>
              </div>

              <!-- Painel 9: Escala da Equipe -->
              <div id="panel-escala" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/60 to-purple-950/60 border border-violet-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-violet-400 text-base font-black">👥</span>
                    <span><strong>Central de Escala &amp; Banco de Folgas:</strong> Organização transparente de plantões de fim de semana, feriados e noites com compensação automática.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-black border border-violet-500/40">Plantão Equilibrado</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div class="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                    <span class="block text-xs font-bold text-white">Sábado (Manhã)</span>
                    <span class="text-[10px] text-cyan-400 font-bold">Juliana Prado</span>
                  </div>
                  <div class="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                    <span class="block text-xs font-bold text-white">Sábado (Tarde)</span>
                    <span class="text-[10px] text-cyan-400 font-bold">Rodrigo Alves</span>
                  </div>
                  <div class="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                    <span class="block text-xs font-bold text-white">Domingo (Integral)</span>
                    <span class="text-[10px] text-amber-400 font-bold">Camila Ferreira</span>
                  </div>
                  <div class="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                    <span class="block text-xs font-bold text-white">Banco de Folgas</span>
                    <span class="text-[10px] text-emerald-400 font-bold">3 folgas ativas</span>
                  </div>
                </div>
              </div>

              <!-- Painel 10: Reembolsos Aéreos -->
              <div id="panel-reembolsos" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-amber-400 text-base font-black">💰</span>
                    <span><strong>Esteira de Reembolsos com Cronômetro SLA:</strong> Monitore prazos legais de cias aéreas e consolidadoras para nunca mais perder créditos de bilhetes cancelados.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">SLA 100% Controlado</span>
                </div>
                <div class="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div class="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg">
                    <span><strong>LATAM (LOC 7A9X2)</strong> • Valor: R$ 3.840,00 • Protocolo: #89201</span>
                    <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px]">SLA: 4 dias restantes</span>
                  </div>
                  <div class="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg">
                    <span><strong>Air France (LOC AF81)</strong> • Valor: R$ 6.120,00 • Protocolo: #44012</span>
                    <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px]">SLA: 2 dias restantes</span>
                  </div>
                </div>
              </div>

              <!-- Painel 11: Relatórios -->
              <div id="panel-relatorios" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-blue-950/60 border border-indigo-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-indigo-400 text-base font-black">📊</span>
                    <span><strong>Relatórios Gerenciais &amp; Rentabilidade:</strong> Visão por origem de leads, campanhas, embarques por período e comissões detalhadas por consultor.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black border border-indigo-500/40">Visão Executiva</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="p-3 rounded-xl bg-black/40 border border-white/10">
                    <span class="text-[9px] uppercase font-bold text-slate-400 block">Rentabilidade Média</span>
                    <span class="text-lg font-black text-emerald-400 mt-1 block">14,8%</span>
                  </div>
                  <div class="p-3 rounded-xl bg-black/40 border border-white/10">
                    <span class="text-[9px] uppercase font-bold text-slate-400 block">Embarques no Mês</span>
                    <span class="text-lg font-black text-cyan-400 mt-1 block">42 Viagens</span>
                  </div>
                  <div class="p-3 rounded-xl bg-black/40 border border-white/10">
                    <span class="text-[9px] uppercase font-bold text-slate-400 block">Origem Campeã</span>
                    <span class="text-lg font-black text-purple-400 mt-1 block">Indicação / NPS</span>
                  </div>
                </div>
              </div>

              <!-- Painel 12: Itinerário VIP -->
              <div id="panel-publicas" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-950/60 to-purple-950/60 border border-fuchsia-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-fuchsia-400 text-base font-black">📱</span>
                    <span><strong>Itinerário Digital Interativo Público:</strong> Experiência no smartphone do passageiro com sua logomarca, contatos de emergência e mapa dia a dia.</span>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-black border border-fuchsia-500/40">Experiência VIP</span>
                </div>
                <div class="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                  <div>
                    <span class="font-bold text-white text-xs block">Caderno Digital • Família Costa em Paris</span>
                    <span class="text-[10px] text-slate-400">Funciona sem internet após o primeiro carregamento no celular</span>
                  </div>
                  <button class="px-3 py-1.5 rounded-xl bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/30 font-bold text-[10px] uppercase pointer-events-none">Ver Itinerário Online</button>
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- ===== CENÁRIO REAL DO MERCADO (SOLUÇÕES CONCRETAS) ===== -->
        <section id="cenario-real" class="w-full max-w-6xl mx-auto mb-20 px-4 sm:px-6 text-left">
          <div class="text-center max-w-3xl mx-auto mb-10 space-y-2">
            <span class="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
              A Realidade do Mercado de Turismo
            </span>
            <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Apenas Soluções e Resultados para Sua Agência Voar Alto
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 font-normal">
              Processos blindados, equipes coordenadas e clientes fiéis. Veja como o PaxFlow entrega tranquilidade operacional e crescimento financeiro contínuo.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Coluna 1: Blindagem & Pós-Venda -->
            <div data-reveal="left" class="p-6 rounded-3xl bg-gradient-to-b from-emerald-950/30 via-slate-900/80 to-black/50 border border-emerald-500/40 backdrop-blur-md space-y-4 shadow-xl pf-glow">
              <div class="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div class="flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/30 shrink-0">✓</span>
                  <h3 class="text-base font-black text-emerald-200">Blindagem Operacional &amp; Pós-Venda</h3>
                </div>
                <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Segurança Total</span>
              </div>
              <ul class="space-y-3 text-xs sm:text-sm text-slate-200 font-medium">
                <li class="flex items-start gap-2.5">
                  <span class="text-emerald-400 font-bold shrink-0">✓</span>
                  <span><strong>Blindagem com Risk Score™ (0 a 100):</strong> Auditoria diária de passaportes, vistos e vouchers com ampla antecedência. Embarques 100% seguros.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-emerald-400 font-bold shrink-0">✓</span>
                  <span><strong>Múltiplos SLAs Configuráveis:</strong> Sua agência monitora cronômetros personalizados para reembolsos aéreos, emissão de vouchers, quitação de LOCs e prazos de consolidadoras.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-emerald-400 font-bold shrink-0">✓</span>
                  <span><strong>Plantão na Palma da Mão (App Mobile):</strong> Escalas da equipe organizadas com transparência de folgas e notificações push em tempo real no celular do plantonista escalado.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-emerald-400 font-bold shrink-0">✓</span>
                  <span><strong>Pós-Venda Proativo &amp; WhatsApp:</strong> Pesquisas automáticas de satisfação (NPS) e mensagens de boas-vindas que encantam e fidelizam o passageiro.</span>
                </li>
              </ul>
            </div>

            <!-- Coluna 2: Vendas & Escala -->
            <div data-reveal="right" class="p-6 rounded-3xl bg-gradient-to-b from-[#0052d4]/20 via-teal-950/20 to-black/50 border border-teal-500/40 backdrop-blur-md space-y-4 shadow-xl pf-glow">
              <div class="flex items-center justify-between border-b border-teal-500/20 pb-3">
                <div class="flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black text-sm border border-teal-500/30 shrink-0">📈</span>
                  <h3 class="text-base font-black text-teal-200">Recompra Ativa &amp; Crescimento</h3>
                </div>
                <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">Mais Rentabilidade</span>
              </div>
              <ul class="space-y-3 text-xs sm:text-sm text-slate-200 font-medium">
                <li class="flex items-start gap-2.5">
                  <span class="text-teal-300 font-bold shrink-0">✓</span>
                  <span><strong>Máquina de Recompra (Next Trip Engine™):</strong> Cruza histórico de compras, NPS e periodicidade habitual de viagens para avisar quem abordar para novas vendas.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-teal-300 font-bold shrink-0">✓</span>
                  <span><strong>Disparos de Alertas Personalizados:</strong> Sua agência escolhe a antecedência exata (180d, 30d, 48h) e os canais de disparo para agir pontualmente no momento certo.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-teal-300 font-bold shrink-0">✓</span>
                  <span><strong>Equipe Toda Integrada:</strong> Consultores, emissores e financeiro operando juntos na mesma plataforma, sem cobranças punitivas que limitam o crescimento.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="text-teal-300 font-bold shrink-0">✓</span>
                  <span><strong>Dossiês Organizados sem Planilhas:</strong> Orçamentos ágeis, Kanban de viagens, conferência de localizadores e documentos organizados em nuvem segura.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ===== SEÇÃO: PAXFLOW STUDIO™ (Aprofundamento) ===== -->
        <section id="studio-section" class="relative z-10 w-full py-16 px-4 sm:px-6 border-t border-white/10 bg-gradient-to-b from-[#06070f] via-[#140b28]/80 to-[#06070f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-10">
            <div class="text-center max-w-3xl mx-auto space-y-3">
              <span class="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                ✨ Lançamento Exclusivo PaxFlow Studio™
              </span>
              <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Propostas de Luxo com Live Preview em Tempo Real
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                Chega de propostas manuais em Word ou PDFs sem padronização. Transforme vouchers de consolidadoras e mensagens de WhatsApp em <strong>experiências visuais de cinema</strong> que encantam o cliente e aceleram o fechamento.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="left" class="p-6 rounded-3xl bg-white/[0.04] border border-amber-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-amber-600/30 text-amber-300 border border-amber-500/40 flex items-center justify-center text-xl font-black">
                  🖥️
                </div>
                <h3 class="text-lg font-black text-white">Split Screen &amp; Live Preview</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Edição estruturada à esquerda e prévia visual em tempo real à direita. Veja como a proposta fica a cada caractere digitado, com simulador para Desktop e Mobile.
                </p>
              </div>

              <div data-reveal="up" class="p-6 rounded-3xl bg-white/[0.04] border border-indigo-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-xl font-black">
                  📥
                </div>
                <h3 class="text-lg font-black text-white">Ingestão Inteligente de PDFs</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Arraste bilhetes aéreos e vouchers de operadoras (Agaxtur, LATAM NDC, GDS). O PaxFlow lê os trechos, voos, conexões e localizadores e alimenta o itinerário automaticamente.
                </p>
              </div>

              <div data-reveal="right" class="p-6 rounded-3xl bg-white/[0.04] border border-emerald-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center justify-center text-xl font-black">
                  🖼️
                </div>
                <h3 class="text-lg font-black text-white">Galeria de Fotos da Agência</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Faça upload de fotos próprias de hotéis e destinos com compressão automática ou selecione do catálogo Unsplash integrado para montar roteiros memoráveis.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== SEÇÃO: PAXFLOW RISK SCORE™ (Aprofundamento) ===== -->
        <section id="risk-score-section" class="relative z-10 w-full py-16 px-4 sm:px-6 border-t border-white/10 bg-gradient-to-b from-[#06070f] via-emerald-950/40 to-[#06070f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-10">
            <div class="text-center max-w-3xl mx-auto space-y-3">
              <span class="px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                🛡️ Blindagem Operacional Exclusiva
              </span>
              <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-white">
                PaxFlow Risk Score™ (Onda 3)
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                Nunca mais seja surpreendido com clientes no aeroporto sem vouchers ou com passaportes vencidos. O motor de auditoria analisa continuamente de 0 a 100 o risco de cada viagem da sua carteira e dispara alertas para você e sua equipe agirem com ampla antecedência.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="left" class="p-6 rounded-3xl bg-white/[0.04] border border-emerald-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-black">
                  🌍
                </div>
                <h3 class="text-lg font-black text-white">Regras Sanitárias &amp; Vistos por País</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Mapeamento automático: Tratado de Schengen com apólice de seguro de 30.000€ obrigatória, vacina de Febre Amarela Anvisa (CIVP) para destinos exigentes e visto consular/ESTA dos EUA.
                </p>
              </div>

              <div data-reveal="up" class="p-6 rounded-3xl bg-white/[0.04] border border-teal-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-teal-600/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-black">
                  ⚡
                </div>
                <h3 class="text-lg font-black text-white">Ações em Lote em 1-Clique</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Se 15 passageiros estiverem sem o mesmo documento ou precisando de contato pré-embarque, selecione todos na tabela e aplique a ação em lote de uma só vez.
                </p>
              </div>

              <div data-reveal="right" class="p-6 rounded-3xl bg-white/[0.04] border border-cyan-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-black">
                  ⏱️
                </div>
                <h3 class="text-lg font-black text-white">Check Pré-Embarque 24h/48h</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Semáforo operacional rigoroso que audita o contato das últimas 24h antes da decolagem, aplicando penalidade imediata no score se o passageiro não foi atendido.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== SEÇÃO: NEXT TRIP ENGINE™ (Aprofundamento) ===== -->
        <section id="next-trip-section" class="relative z-10 w-full py-16 px-4 sm:px-6 border-t border-white/10 bg-gradient-to-b from-[#06070f] via-[#100d2e]/80 to-[#06070f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-10">
            <div class="text-center max-w-3xl mx-auto space-y-3">
              <span class="px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                🎯 Motor Preditivo de Recompra
              </span>
              <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Next Trip Engine™: Vendas Contínuas da Sua Base
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                Transforme a base de clientes que já viajaram com a sua agência em vendas ativas. O algoritmo analisa 5 vetores estratégicos para dizer à sua equipe exatamente <strong>quem está no momento ideal para comprar uma nova viagem hoje</strong>.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="left" class="p-6 rounded-3xl bg-white/[0.04] border border-indigo-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-black">
                  🧠
                </div>
                <h3 class="text-lg font-black text-white">Os 5 Vetores Transparentes</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Cálculo determinístico auditável: Janela temporal (10 a 14 meses), Notas de NPS (Promotores 9-10), Perfil de destino, Mês habitual de férias e Conformidade de SLA.
                </p>
              </div>

              <div data-reveal="up" class="p-6 rounded-3xl bg-white/[0.04] border border-purple-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-black">
                  🗺️
                </div>
                <h3 class="text-lg font-black text-white">Destinos Complementares</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  O radar sugere o "próximo passo natural" da família (Orlando → Universal/Epic Universe; Paris → Itália Clássica; Gramado → Bariloche) com argumentos prontos.
                </p>
              </div>

              <div data-reveal="right" class="p-6 rounded-3xl bg-white/[0.04] border border-emerald-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-black">
                  💬
                </div>
                <h3 class="text-lg font-black text-white">Scripts Prontos para WhatsApp</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Clique para abrir o WhatsApp com mensagem contextualizada citando o destino anterior e a nova oportunidade, ativando carência automática de 30 dias após a abordagem.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== SEÇÃO: FINANCEIRO & CONCILIAÇÃO BANCÁRIA ===== -->
        <section id="financeiro-section" class="relative z-10 w-full py-16 px-4 sm:px-6 border-t border-white/10 bg-gradient-to-b from-[#06070f] via-blue-950/40 to-[#06070f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-10">
            <div class="text-center max-w-3xl mx-auto space-y-3">
              <span class="px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-widest">
                💳 Módulo Financeiro &amp; Conciliação
              </span>
              <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Controle Total de Consolidadoras, Extratos e Caixa
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                Desenvolvido sob medida para a dinâmica de faturamento do turismo: faturas de consolidadoras, taxas de embarque, comissões, taxa DU e conciliação por extratos bancários em PDF e CSV.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="left" class="p-6 rounded-3xl bg-white/[0.04] border border-blue-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-black">
                  📄
                </div>
                <h3 class="text-lg font-black text-white">Extrato Bancário Inteligente (PDF/CSV)</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Importe extratos dos principais bancos brasileiros (Itaú, Bradesco, Santander, BB, Inter) com reconciliação automática de valores, datas e baixa instantânea de contas.
                </p>
              </div>

              <div data-reveal="up" class="p-6 rounded-3xl bg-white/[0.04] border border-blue-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-black">
                  📅
                </div>
                <h3 class="text-lg font-black text-white">Fluxo de Caixa em Calendário</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Identificação visual imediata de dias com picos de desembolso para consolidadoras e operadoras, garantindo que a agência nunca fique a descoberto.
                </p>
              </div>

              <div data-reveal="right" class="p-6 rounded-3xl bg-white/[0.04] border border-blue-500/30 backdrop-blur-md space-y-3 shadow-xl pf-glow">
                <div class="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-black">
                  ⏳
                </div>
                <h3 class="text-lg font-black text-white">Cronômetro de Reembolsos Aéreos</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  Esteira rigorosa com cronômetro de dias restantes para prazos de cias aéreas (7, 30, 90 e 360 dias) com protocolos e alertas de vencimento.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== SUA MARCA EM PRIMEIRO LUGAR (WHITE-LABEL & CARROSSEL) ===== -->
        <section id="marcas" class="relative z-10 w-full py-16 px-4 sm:px-6 border-t border-white/10 bg-gradient-to-b from-transparent to-[#0a0d1f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-10">
            <div class="text-center max-w-3xl mx-auto space-y-3">
              <span class="px-3.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-widest">
                Experiência White-Label
              </span>
              <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-white">
                O Passageiro Enxerga a Sua Marca, Não o PaxFlow
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                Todos os pontos de contato com o passageiro são gerados automaticamente com o logotipo, cores e identidade da sua agência. O PaxFlow é o motor invisível que faz você brilhar.
              </p>
            </div>

            <!-- Carrossel de 4 Produtos da Agência -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div class="lg:col-span-5 space-y-3">
                <button id="brand-tab-itinerario" class="w-full p-4 rounded-2xl text-left flex items-start gap-3 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-xl pf-glow cursor-pointer transition">
                  <span class="text-lg">📱</span>
                  <div>
                    <h4 class="font-bold text-sm">01. Itinerário Digital no Celular</h4>
                    <p class="text-xs text-white/80 mt-0.5">Caderno de viagem com voos, hospedagem e mapas responsivos.</p>
                  </div>
                </button>
                <button id="brand-tab-voucher" class="w-full p-4 rounded-2xl text-left flex items-start gap-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition">
                  <span class="text-lg">📄</span>
                  <div>
                    <h4 class="font-bold text-sm">02. Voucher Oficial em PDF</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Documento diagramado com cabeçalho e logomarca da sua agência.</p>
                  </div>
                </button>
                <button id="brand-tab-nps" class="w-full p-4 rounded-2xl text-left flex items-start gap-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition">
                  <span class="text-lg">⭐</span>
                  <div>
                    <h4 class="font-bold text-sm">03. Pesquisa NPS Pós-Viagem</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Avaliação de satisfação automatizada enviada ao passageiro.</p>
                  </div>
                </button>
                <button id="brand-tab-whatsapp" class="w-full p-4 rounded-2xl text-left flex items-start gap-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition">
                  <span class="text-lg">💬</span>
                  <div>
                    <h4 class="font-bold text-sm">04. WhatsApp com Assinatura da Agência</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Disparos de aviso de voo e lembretes com assinatura do consultor.</p>
                  </div>
                </button>
              </div>

              <!-- Painel Visual do Carrossel de Marcas -->
              <div class="lg:col-span-7 bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md min-h-[300px] flex flex-col justify-between">
                <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <span id="brand-preview-title" class="text-xs font-black text-cyan-300 uppercase tracking-wider">01. Itinerário Digital no Celular</span>
                  <span class="text-[10px] text-slate-400">100% Personalizado</span>
                </div>

                <div id="brand-panels-container" class="flex-1 flex flex-col justify-center">
                  <div id="brand-panel-itinerario" class="space-y-3">
                    <div class="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-200">
                      O passageiro recebe um link no WhatsApp e abre no celular uma página bonita com o nome e as cores da sua agência, sem precisar baixar nenhum aplicativo pesado.
                    </div>
                    <div class="p-3 bg-black/40 rounded-xl text-xs space-y-1">
                      <div class="font-bold text-white">Sua Agência Viagens VIP</div>
                      <div class="text-slate-400 text-[11px]">Itinerário Interativo • Roteiro Paris &amp; Costa Amalfitana</div>
                    </div>
                  </div>

                  <div id="brand-panel-voucher" class="space-y-3 hidden">
                    <div class="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-blue-200">
                      Voucher em PDF de alta qualidade gerado em 1 clique contendo logotipo da agência, localizador PNR da cia aérea, contatos de plantão e termos de embarque.
                    </div>
                    <div class="p-3 bg-black/40 rounded-xl text-xs">
                      <span class="font-bold text-white block">Voucher Oficial de Confirmação</span>
                      <span class="text-slate-400 text-[11px]">Diagramação profissional com tabela de voos e hotéis</span>
                    </div>
                  </div>

                  <div id="brand-panel-nps" class="space-y-3 hidden">
                    <div class="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
                      Envio automático de pesquisa NPS após o retorno da viagem. Se o cliente for promotor (nota 9 ou 10), o PaxFlow agenda o momento de recompra no Next Trip Engine.
                    </div>
                    <div class="p-3 bg-black/40 rounded-xl text-xs">
                      <span class="font-bold text-white block">Pesquisa de Satisfação Pós-Embarque</span>
                      <span class="text-slate-400 text-[11px]">Escala de 0 a 10 com coleta de depoimentos</span>
                    </div>
                  </div>

                  <div id="brand-panel-whatsapp" class="space-y-3 hidden">
                    <div class="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                      Integração de mensagens com modelos prontos para lembretes de embarque, checagem de bagagem, boas-vindas no destino e orientações de câmbio.
                    </div>
                    <div class="p-3 bg-black/40 rounded-xl text-xs">
                      <span class="font-bold text-white block">Notificações Diretas com o Consultor</span>
                      <span class="text-slate-400 text-[11px]">Modelos rápidos com assinatura personalizada</span>
                    </div>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-white/10 text-[10px] text-slate-500 text-center">
                  Sua identidade visual é respeitada em todas as telas voltadas ao consumidor.
                </div>
              </div>
            </div>
          </div>
        </section>

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
                Não. Você continua emitindo normalmente pelas suas consolidadoras (Flytour, Rextur, Ancoradouro, Sakuratur) ou companhias aéreas habituais. O PaxFlow entra imediatamente depois da emissão: para garantir que o cliente seja bem atendido, que nenhum documento dê problema no aeroporto, que a equipe organize plantões e que as contas a pagar e reembolsos fiquem conciliados.
              </p>
            </details>

            <details class="group p-4 rounded-2xl bg-white/[0.03] border border-white/10 [&_summary::-webkit-details-marker]:hidden">
              <summary class="flex items-center justify-between cursor-pointer font-bold text-sm text-white">
                <span>Vocês cobram a mais por cada consultor cadastrado?</span>
                <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p class="text-xs sm:text-sm text-slate-300 mt-3 font-normal leading-relaxed">
                Não penalizamos agências que crescem. Nosso modelo comercial foi pensado para que toda a sua equipe (consultores, emissores, financeiro e gestores) possa usar a plataforma sem surpresas ou acréscimos na fatura.
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
              <a href="#modulos" class="hover:text-white transition">Telas</a>
              <a href="#studio-section" class="hover:text-white transition">Studio™</a>
              <a href="#risk-score-section" class="hover:text-white transition">Risk Score™</a>
              <a href="#financeiro-section" class="hover:text-white transition">Financeiro</a>
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

    // Tour de Módulos (Abas Interativas com 12 Telas Reais)
    const tabs = ['dashboard', 'risk', 'nexttrip', 'studio', 'financeiro', 'viagens', 'orcamentos', 'inbox', 'escala', 'reembolsos', 'relatorios', 'publicas'];
    const pathTexts: Record<string, string> = {
      dashboard: 'PaxFlow - Painel de Controle Comercial',
      risk: 'PaxFlow - Risk Score™ (Diagnóstico de Saúde Operacional Onda 3)',
      nexttrip: 'PaxFlow - Next Trip Engine™ (Motor Preditivo de Recompra)',
      studio: 'PaxFlow Studio™ - Propostas de Luxo & Live Preview',
      financeiro: 'PaxFlow - Financeiro & Conciliação Bancária FinRecon™',
      viagens: 'PaxFlow - Operação de Viagens & Dossiê em 5 Abas',
      orcamentos: 'PaxFlow - Funil Kanban de Orçamentos & CRM',
      inbox: 'PaxFlow - Central de Mensageria & Decisões',
      escala: 'PaxFlow - Gestão de Escalas da Equipe & Banco de Folgas',
      reembolsos: 'PaxFlow - Gestão de Reembolsos Aéreos com SLA',
      relatorios: 'PaxFlow - Relatórios Gerenciais & Rentabilidade',
      publicas: 'PaxFlow - Itinerário Digital Interativo no Celular'
    };

    const baseTab = "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-white hover:bg-slate-700 transition cursor-pointer";
    const activeMap: Record<string, string> = {
      dashboard: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-lg pf-glow cursor-pointer",
      risk: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-lg pf-glow cursor-pointer",
      nexttrip: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-[#00a8f5] text-white shadow-lg pf-glow cursor-pointer",
      studio: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-lg pf-glow cursor-pointer",
      financeiro: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg pf-glow cursor-pointer",
      viagens: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-[#00a8f5] to-cyan-500 text-white shadow-lg cursor-pointer",
      orcamentos: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-[#00e5a3] to-teal-400 text-slate-950 font-black shadow-lg cursor-pointer",
      inbox: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-[#f12711] to-[#f5af19] text-white shadow-lg cursor-pointer",
      escala: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg cursor-pointer",
      reembolsos: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-[#f5af19] to-amber-500 text-slate-950 font-black shadow-lg cursor-pointer",
      relatorios: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-[#00a8f5] text-white shadow-lg cursor-pointer",
      publicas: "shrink-0 whitespace-nowrap px-3.5 py-2 text-[10px] font-black tracking-wider uppercase rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-fuchsia-600 to-purple-500 text-white shadow-lg cursor-pointer"
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
      if (tabName === 'dashboard') window.dispatchEvent(new Event('pf:anim-bars'));
    };

    tabs.forEach((tab, index) => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      btn?.addEventListener('click', () => {
        if (autoTabTimer) { clearTimeout(autoTabTimer); autoTabTimer = null; }
        currentTabIndex = index;
        switchTab(tab);
      });
    });

    let isMockupVisible = true;
    let isBrandVisible = true;

    if ('IntersectionObserver' in window) {
      const mockupEl = document.getElementById('mockup-panels-container');
      const brandEl = document.getElementById('brand-panels-container');
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.target === mockupEl) isMockupVisible = entry.isIntersecting;
          if (entry.target === brandEl) isBrandVisible = entry.isIntersecting;
        });
      }, { threshold: 0.15 });
      if (mockupEl) obs.observe(mockupEl);
      if (brandEl) obs.observe(brandEl);
    }

    const startAutoRotate = () => {
      if (autoTabTimer) return;
      const timer = () => {
        autoTabTimer = window.setTimeout(() => {
          if (isMockupVisible) {
            currentTabIndex = (currentTabIndex + 1) % tabs.length;
            switchTab(tabs[currentTabIndex]);
          }
          autoTabTimer = null;
          timer();
        }, 4000);
      };
      timer();
    };
    startAutoRotate();

    // Carrossel de Marcas (White-label)
    const brandTabs = ['itinerario', 'voucher', 'nps', 'whatsapp'];
    const brandTitles: Record<string, string> = {
      itinerario: '01. Itinerário Digital no Celular',
      voucher: '02. Voucher Oficial em PDF com Logomarca',
      nps: '03. Pesquisa NPS da Sua Marca',
      whatsapp: '04. Notificações WhatsApp com Assinatura da Agência'
    };
    const brandBase = "w-full p-4 rounded-2xl text-left transition flex items-start gap-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm cursor-pointer";
    const brandActive = "w-full p-4 rounded-2xl text-left transition flex items-start gap-3 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-xl pf-glow cursor-pointer";

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
      if (isBrandVisible) {
        brandTabIndex = (brandTabIndex + 1) % brandTabs.length;
        switchBrandTab(brandTabs[brandTabIndex]);
      }
    }, 3800);
  }
}
