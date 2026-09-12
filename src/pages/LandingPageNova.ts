export class LandingPageNova {
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
    document.title = 'PaxFlow - Da Emissão ao Próximo Embarque: Zero Caos, Zero Prejuízo';

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

    setMeta('description', 'Centralize pós-vendas, passaportes, vistos, reembolsos aéreos e escalas da sua agência de viagens em uma plataforma viva, sem planilhas.', true);
    setMeta('og:type', 'website');
    setMeta('og:site_name', 'PaxFlow');
    setMeta('og:title', 'PaxFlow - O CRM & Pós-Venda 100% Especializado em Turismo');
    setMeta('og:description', 'Centralize pós-vendas, passaportes, vistos, reembolsos aéreos e escalas da sua agência de viagens em uma plataforma viva, sem planilhas.');
    setMeta('og:image', imageUrl);
    setMeta('og:image:secure_url', imageUrl);
    setMeta('og:image:type', 'image/png');
    setMeta('og:image:width', '1200');
    setMeta('og:image:height', '630');
    setMeta('og:url', siteUrl);

    setMeta('twitter:card', 'summary_large_image', true);
    setMeta('twitter:title', 'PaxFlow - O CRM & Pós-Venda 100% Especializado em Turismo', true);
    setMeta('twitter:description', 'Centralize pós-vendas, passaportes, vistos, reembolsos aéreos e escalas da sua agência de viagens em uma plataforma viva, sem planilhas.', true);
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

    // No mobile, revela todos os elementos de imediato para eliminar qualquer atraso na rolagem
    if (isMobile) {
      revealItems.forEach(item => item.classList.add('pf-revealed'));
      counterElements.forEach(counter => animateCounterEl(counter));
    } else {
      // Contadores com contagem animada ao entrar na tela (Desktop)
      if ('IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              animateCounterEl(entry.target as HTMLElement);
              obs.unobserve(entry.target);
            }
          });
        }, {
          threshold: 0.15,
          rootMargin: '100px 0px 0px 0px'
        });

        counterElements.forEach(counter => counterObserver.observe(counter));
      } else {
        counterElements.forEach(counter => animateCounterEl(counter));
      }

      // Observer de alta performance para revelar elementos gerais da página no Desktop
      if ('IntersectionObserver' in window) {
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
          rootMargin: '450px 0px 200px 0px',
          threshold: 0.01
        });

        revealItems.forEach(item => observer.observe(item));
        revealItems.slice(0, 10).forEach(item => item.classList.add('pf-revealed'));
      } else {
        revealItems.forEach(item => item.classList.add('pf-revealed'));
      }
    }

    // Scroll Progress Bar (Apenas no Desktop)
    const updateProgress = (sy: number): void => {
      const bar = scope.querySelector<HTMLElement>('#pf-scroll-progress');
      if (!bar) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max <= 0 ? 0 : (sy / max) * 100;
      bar.style.width = pct.toFixed(1) + '%';
    };

    // Parallax executado SOMENTE no Desktop para evitar perda de frames no celular
    if (!isReduced && !isMobile) {
      let ticking = false;
      const onScroll = (): void => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const sy = window.scrollY || 0;
          updateProgress(sy);

          // Parallax leve e otimizado apenas para elementos no viewport
          const vh = window.innerHeight;
          const mid = vh / 2;
          for (const el of parallaxEls) {
            const rect = el.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > vh) continue;
            const amount = parseFloat(el.getAttribute('data-parallax') || '20');
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
    }

    // Smooth Scroll para Links Internos (#)
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

    // Item 3: Toolbar sticky shrink (Apenas no Desktop para evitar reflows no celular)
    const topbar = scope.querySelector<HTMLElement>('#pf-topbar');
    if (topbar && !isMobileDevice) {
      const onTbScroll = () => {
        topbar.classList.toggle('pf-topbar-scrolled', (window.scrollY || 0) > 24);
      };
      window.addEventListener('scroll', onTbScroll, { passive: true });
      onTbScroll();
    }

    if (isReduced || isMobileDevice) {
      // No mobile, preenche as barras diretamente sem escutas de scroll contínuas
      const bars = scope.querySelectorAll<HTMLElement>('.pf-bar-fill');
      bars.forEach(bar => {
        bar.style.setProperty('--bar-w', (bar.getAttribute('data-bar') || '0') + '%');
        bar.classList.add('pf-revealed');
      });
      return;
    }

    // Item 5: Cursor glow (Apenas Desktop com mouse)
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

    // Item 6: Tilt 3D nos cards .pf-tilt3d (Apenas Desktop)
    const tiltCards = scope.querySelectorAll<HTMLElement>('.pf-tilt3d');
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (px * 10).toFixed(1) + 'deg');
        card.style.setProperty('--rx', (-py * 10).toFixed(1) + 'deg');
      });
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });

    // Item 8: Barras de progresso (animam quando o painel dashboard está visível no Desktop)
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

  private render(): void {
    this.container.innerHTML = `
      <div class="landing-v2 min-h-screen max-w-full w-full bg-[#06070f] text-white font-sans selection:bg-fuchsia-500 selection:text-white relative overflow-x-hidden flex flex-col">

        <!-- ===== AMBIENT COLOR FIELD (muito movimento no Desktop, limpo no Mobile) ===== -->
        <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden max-w-full hidden md:block">
          <div data-parallax="30" class="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#0052d4]/35 via-[#00a8f5]/20 to-transparent blur-3xl pf-float-slow"></div>
          <div data-parallax="-40" class="absolute top-[20%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-bl from-[#f12711]/30 via-[#f5af19]/20 to-transparent blur-3xl pf-float"></div>
          <div data-parallax="50" class="absolute bottom-[-10%] left-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-[#00e5a3]/25 via-teal-500/10 to-transparent blur-3xl pf-float-delay"></div>
          <div data-parallax="-20" class="absolute top-[45%] left-[35%] w-[30vw] h-[30vw] rounded-full bg-gradient-to-br from-fuchsia-600/20 to-sky-500/10 blur-3xl pf-float-slow"></div>
          <div class="absolute inset-0 opacity-[0.08] grid-bg"></div>
        </div>

        <!-- ===== LOGO WATERMARK fixo gigante deslocado à direita (Apenas Desktop) ===== -->
        <div class="pointer-events-none fixed inset-0 z-[1] items-center justify-end overflow-hidden max-w-full hidden md:flex">
          <img data-parallax="95" src="/logo.svg" alt="" width="280" height="280" loading="eager" class="pf-logo-watermark max-w-[66vmin] max-h-[66vmin] w-[66vmin] h-[66vmin] object-contain opacity-[0.13] blur-[2px] mr-[-8vmin] saturate-150 drop-shadow-[0_0_40px_rgba(0,168,245,0.35)]" />
        </div>

        <!-- ===== SCROLL PROGRESS BAR (Apenas Desktop) ===== -->
        <div class="fixed top-0 left-0 z-[60] h-1 w-full bg-transparent hidden md:block"><div id="pf-scroll-progress" class="h-full w-0 bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-[#f5af19]"></div></div>

        <!-- ===== CURSOR GLOW (desktop) ===== -->
        <div id="pf-cursor-glow" class="pf-cursor-glow hidden md:block" aria-hidden="true"></div>

        <!-- ===== TOP NAV ===== -->
        <header id="pf-topbar" class="relative z-30 w-full px-3.5 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between bg-[#06070f]/70 backdrop-blur-xl border-b border-white/10 sticky top-0 transition-all duration-300">
          <a href="#topo" class="flex items-center gap-2 sm:gap-3 group shrink-0">
            <span class="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 p-1 shadow-lg pf-pulse-ring">
              <img src="/logo.svg" alt="PaxFlow Logo" class="w-full h-full object-contain rounded-lg sm:rounded-xl" />
            </span>
            <span class="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-[#f5af19] bg-clip-text text-transparent pf-animated-gradient">PaxFlow</span>
          </a>
          <nav class="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-300">
            <a href="#recursos" class="hover:text-[#00e5a3] transition">Recursos</a>
            <a href="#mobile-pwa" class="hover:text-cyan-400 transition flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>App Mobile</a>
            <a href="#marcas" class="hover:text-[#00a8f5] transition">Sua Marca</a>
            <a href="#integracao" class="hover:text-[#f5af19] transition">Integrações</a>
            <a href="#planos" class="hover:text-[#f12711] transition">Planos</a>
            <a href="#faq" class="hover:text-fuchsia-400 transition">FAQ</a>
          </nav>
          <div class="flex items-center gap-1.5 sm:gap-2.5">
            <button id="btn-header-whatsapp" class="hidden sm:flex px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-emerald-500/25 transition hover:scale-[1.04] flex items-center gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
              <span class="hidden lg:inline">WhatsApp</span>
            </button>
            <button id="btn-menu-demo" class="pf-shine pf-animated-gradient px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] text-white font-extrabold text-[11px] sm:text-xs uppercase tracking-wide shadow-lg shadow-blue-500/30 transition hover:scale-[1.04]">Modo Demo</button>
            <button id="btn-acessar-login" class="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-900 font-extrabold text-[11px] sm:text-xs uppercase tracking-wide shadow-lg transition">Entrar</button>
          </div>
        </header>

        <!-- ===== HERO (Design Executivo, Moderno e Confiável) ===== -->
        <main id="topo" class="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-14 sm:pb-20 text-center flex flex-col items-center overflow-hidden">
          <div class="pf-beam"></div>

          <!-- Pill de Categoria e Confiabilidade -->
          <div class="pf-rise inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/15 backdrop-blur-md mb-6 sm:mb-8 shadow-lg shadow-black/40 max-w-full text-center">
            <span class="flex h-2 w-2 relative shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span class="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-300">Gestão &amp; Blindagem de Viagens</span>
            <span class="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[8px] sm:text-[9px] font-black uppercase tracking-wider border border-cyan-500/30">Plataforma Especializada</span>
          </div>

          <!-- Emblema Central Executivo e Sofisticado -->
          <div data-parallax="26" class="pf-rise-1 relative mb-6 sm:mb-10">
            <div class="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
              <!-- Glow ambiente suave e refinado -->
              <div class="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#0052d4]/40 via-[#00a8f5]/30 to-[#00e5a3]/30 blur-2xl opacity-60"></div>
              
              <!-- Moldura em vidro escuro lapidado -->
              <div class="relative w-full h-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/20 shadow-2xl flex items-center justify-center p-4 sm:p-5 backdrop-blur-xl hover:border-cyan-400/50 transition-colors duration-500 group">
                <img src="/logo.svg" alt="PaxFlow" class="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(0,168,245,0.4)] group-hover:scale-105 transition-transform duration-300" />
              </div>

              <!-- Badge discreto de auditoria no canto -->
              <span class="absolute -bottom-2 -right-2 px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-900 border border-emerald-500/40 text-[8px] sm:text-[9px] font-extrabold text-emerald-300 shadow-md flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 24/7 Ativo
              </span>
            </div>
          </div>

          <h1 class="pf-hero-headline pf-rise-2 text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 sm:mb-6 max-w-5xl break-words">
            <span class="pf-shimmer-text">Pax</span><span class="bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-[#f5af19] bg-clip-text text-transparent pf-animated-gradient">Flow</span>
            <span class="block mt-3 sm:mt-5 text-lg sm:text-2xl md:text-4xl font-semibold text-slate-100 leading-tight">Da Emissão ao Próximo Embarque</span>
            <span class="block mt-1 sm:mt-1.5 text-lg sm:text-2xl md:text-4xl font-semibold bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent pf-animated-gradient leading-tight">A Gestão Definitiva para Agências que Querem Escalar</span>
          </h1>

          <p class="pf-rise-3 text-sm sm:text-base md:text-xl text-slate-300 max-w-3xl mb-8 sm:mb-10 leading-relaxed font-medium">
            A plataforma que audita documentos antes do embarque, organiza a equipe em plantões contínuos e encontra clientes prontos para recomprar na sua carteira.
          </p>

          <div class="pf-rise-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-10 sm:mb-14 w-full justify-center">
            <button id="btn-iniciar-demo" class="pf-shine pf-animated-gradient w-full sm:w-auto px-5 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] shadow-2xl shadow-blue-500/30 hover:scale-[1.03] transition-transform">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Iniciar Modo Demonstração
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto px-5 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs sm:text-sm tracking-wider uppercase border border-white/15 transition">Entrar no Sistema Real</button>
          </div>

          <!-- Social proof badges com ícones SVG profissionais -->
          <div class="pf-rise-4 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-2 mb-10 sm:mb-12 text-[10px] sm:text-[11px] font-semibold text-slate-300 px-2">
            <span class="flex items-center gap-1.5 sm:gap-2 text-emerald-400 font-extrabold">
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Risk Score Integrado
            </span>
            <span class="flex items-center gap-1.5 sm:gap-2 text-cyan-400 font-extrabold">
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              Usuários Ilimitados no Pro
            </span>
            <span class="flex items-center gap-1.5 sm:gap-2 text-amber-400 font-extrabold">
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              App PWA no Celular
            </span>
            <span class="flex items-center gap-1.5 sm:gap-2 text-emerald-300 font-extrabold">
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00e5a3] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Setup em Minutos
            </span>
          </div>

          <!-- ===== PAINEL MATINAL INTERATIVO DAS 08:00 AM (PROVA VISUAL) ===== -->
          <div data-reveal="up" class="w-full max-w-4xl mx-auto mb-12 sm:mb-16 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-xl shadow-2xl pf-glow text-left relative overflow-hidden">
            <div class="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/10 pb-4 sm:pb-5 mb-4 sm:mb-5">
              <div class="flex items-center gap-3">
                <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                <div>
                  <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-cyan-400">Rotina do Gestor às 08:00 AM</span>
                  <h3 class="text-sm sm:text-base md:text-lg font-black text-white">Painel de Decisões &amp; Ação Imediata</h3>
                </div>
              </div>
              <div class="flex flex-col sm:items-end gap-1 self-start sm:self-auto">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] sm:text-xs text-slate-300 font-medium">PaxFlow Risk Score™:</span>
                  <span class="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                    <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    98 / 100
                  </span>
                </div>
                <span class="text-[10px] text-emerald-400 font-bold">Saúde da Carteira: 100% Blindada • Todas as Viagens Seguras</span>
              </div>
            </div>

            <!-- Explicação Didática: O que é e o que faz o Risk Score -->
            <div class="p-3 sm:p-3.5 mb-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
              <span class="text-base select-none shrink-0">🛡️</span>
              <p>
                <strong class="text-white">O que é o Risk Score (0 a 100)?</strong> É o motor de auditoria contínua do PaxFlow: ele checa todas as viagens da sua agência em busca de falhas invisíveis (passaportes a vencer, vistos pendentes, vouchers não emitidos e pagamentos em aberto). Quanto mais próximo de <strong class="text-emerald-400">100</strong>, mais protegida está sua operação contra prejuízos e passageiros barrados.
              </p>
            </div>

            <!-- Faixa de Alertas 100% Configuráveis -->
            <div class="p-2.5 sm:p-3 mb-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-indigo-950/40 border border-cyan-500/30 text-xs flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-black text-[9px] uppercase tracking-wider border border-cyan-500/40 flex items-center gap-1">
                  <svg class="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                  Gatilhos 100% Configuráveis
                </span>
                <span class="text-slate-300 text-[11px] font-medium">Sua agência define as regras e prazos de antecedência para disparo de alertas <strong>apenas quando for realmente importante</strong>.</span>
              </div>
              <span class="text-[10px] text-cyan-300 font-bold hidden md:inline-flex items-center gap-1">
                Disparos via WhatsApp, Push PWA &amp; Painel
              </span>
            </div>

            <!-- Soluções em Ação (Só os Verdinhos) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mb-5 sm:mb-6">
              <!-- Solução 1 -->
              <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2 hover:border-emerald-400 transition">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Passaporte Validado
                  </span>
                  <span class="text-[10px] text-emerald-300 font-bold">Gatilho: Embarque 12d</span>
                </div>
                <h4 class="text-xs font-black text-white">Mariana Costa (Paris)</h4>
                <p class="text-[11px] text-slate-300 leading-snug">Passaporte internacional conferido e orientações de viagem enviadas via WhatsApp. Embarque 100% liberado.</p>
                <div class="w-full py-1.5 mt-1 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-[10px] font-extrabold uppercase text-center flex items-center justify-center gap-1">
                  <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  Embarque 100% Seguro
                </div>
              </div>

              <!-- Solução 2 -->
              <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2 hover:border-emerald-400 transition">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Voucher no SLA
                  </span>
                  <span class="text-[10px] text-emerald-300 font-bold">Gatilho: Check-in 48h</span>
                </div>
                <h4 class="text-xs font-black text-white">Hotel Fasano (Família Lima)</h4>
                <p class="text-[11px] text-slate-300 leading-snug">Voucher de hospedagem confirmado pela operadora e anexado à pasta da viagem rigorosamente dentro do SLA.</p>
                <div class="w-full py-1.5 mt-1 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-[10px] font-extrabold uppercase text-center flex items-center justify-center gap-1">
                  <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  Voucher Conferido &amp; Anexado
                </div>
              </div>

              <!-- Solução 3 -->
              <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2 hover:border-emerald-400 transition">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-teal-400"></span> Recompra Disparada
                  </span>
                  <span class="text-[10px] text-teal-300 font-bold flex items-center gap-1">
                    <svg class="w-2.5 h-2.5 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    Gatilho: 11 meses
                  </span>
                </div>
                <h4 class="text-xs font-black text-white">Dra. Camila (Recompra VIP)</h4>
                <p class="text-[11px] text-slate-300 leading-snug">Oportunidade preditiva disparada na janela ideal de férias da cliente. Proposta personalizada enviada com retorno imediato.</p>
                <div class="w-full py-1.5 mt-1 rounded-xl bg-teal-600/30 border border-teal-500/40 text-teal-200 text-[10px] font-extrabold uppercase text-center flex items-center justify-center gap-1">
                  <svg class="w-3 h-3 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  Nova Venda em Andamento
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 pt-3.5 sm:pt-4 border-t border-white/10 text-xs text-slate-300 text-center sm:text-left">
              <span class="font-medium flex items-center justify-center sm:justify-start gap-2">
                <span class="text-[#00e5a3] font-bold">✓</span>
                Em 30 segundos, seu dia começa com controle total e zero surpresas no embarque.
              </span>
              <button id="btn-demo-topo-matinal" class="text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 transition shrink-0">
                Testar este painel ao vivo no Modo Demo →
              </button>
            </div>
          </div>

          <!-- Stats bar (Otimizada sem vazamento no mobile) -->
          <div class="pf-rise-5 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 w-full max-w-4xl mx-auto mb-12 sm:mb-16 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-md pf-glow">
            <div class="text-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#0052d4]/20 to-transparent">
              <span class="pf-num block text-2xl sm:text-3xl font-black text-[#00a8f5]" data-count="100" data-suffix="%">0%</span>
              <span class="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mt-0.5">Foco em Turismo</span>
            </div>
            <div class="text-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#f12711]/20 to-transparent">
              <span class="pf-num block text-2xl sm:text-3xl font-black text-[#f5af19]" data-count="180" data-suffix=" dias">0 dias</span>
              <span class="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mt-0.5">Vistos &amp; Passaporte</span>
            </div>
            <div class="text-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-b from-emerald-600/20 to-transparent flex flex-col items-center justify-center">
              <span class="block text-2xl sm:text-3xl font-black text-emerald-400">0 a 100</span>
              <span class="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1">
                <svg class="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                Risk Score™
              </span>
              <span class="text-[8px] text-emerald-300/80 font-semibold block mt-0.5">Índice de Saúde Operacional</span>
            </div>
            <div class="text-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-b from-fuchsia-600/20 to-transparent">
              <span class="block text-2xl sm:text-3xl font-black text-fuchsia-400">App PWA</span>
              <span class="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mt-0.5">Notificações Push</span>
            </div>
          </div>

          <!-- Pilares Estratégicos e Confiabilidade -->
          <div class="w-full max-w-5xl mb-14 sm:mb-20 p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-xl">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 text-left">
              <div class="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 hover:border-emerald-500/30 transition">
                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <div>
                  <strong class="text-xs font-bold text-white block">Auditoria 24/7</strong>
                  <span class="text-[10px] text-slate-400">Risk Score proativo</span>
                </div>
              </div>

              <div class="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 hover:border-cyan-500/30 transition">
                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                  <strong class="text-xs font-bold text-white block">Múltiplos SLAs</strong>
                  <span class="text-[10px] text-emerald-400 font-bold">100% Configuráveis</span>
                </div>
              </div>

              <div class="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 hover:border-indigo-500/30 transition">
                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                </div>
                <div>
                  <strong class="text-xs font-bold text-white block">Motor de Recompra</strong>
                  <span class="text-[10px] text-slate-400">Next Trip Engine</span>
                </div>
              </div>

              <div class="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 hover:border-amber-500/30 transition">
                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                </div>
                <div>
                  <strong class="text-xs font-bold text-white block">Notificações Push</strong>
                  <span class="text-[10px] text-slate-400">App PWA Mobile</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- ===== SEÇÃO: EXCELÊNCIA OPERACIONAL (SÓ AS SOLUÇÕES) ===== -->
        <section id="cenario-real" class="w-full max-w-6xl mx-auto mb-14 sm:mb-24 px-4 sm:px-6 text-left">
          <div class="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-2.5 sm:space-y-3">
            <span class="px-3.5 sm:px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
              A Realidade do Mercado de Turismo
            </span>
            <h2 class="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Apenas Soluções e Resultados para Sua Agência Voar Alto
            </h2>
            <p class="text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-relaxed">
              Processos blindados, equipes coordenadas e clientes fiéis. Veja como o PaxFlow entrega tranquilidade operacional e crescimento financeiro contínuo.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
            <!-- Coluna 1: Blindagem & Pós-Venda -->
            <div data-reveal="left" class="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-emerald-950/30 via-slate-900/80 to-black/50 border border-emerald-500/40 backdrop-blur-md space-y-4 sm:space-y-6 shadow-2xl pf-glow relative overflow-hidden">
              <div class="flex items-center justify-between border-b border-emerald-500/20 pb-3 sm:pb-4">
                <div class="flex items-center gap-2.5 sm:gap-3">
                  <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/30 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <h3 class="text-sm sm:text-lg font-black text-emerald-200">Blindagem Operacional &amp; Pós-Venda</h3>
                </div>
                <span class="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-emerald-500/20 text-emerald-300">Segurança Total</span>
              </div>
              <ul class="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-200 font-medium">
                <li class="flex items-start gap-2.5 sm:gap-3">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span><strong>Blindagem com Risk Score™ (0 a 100):</strong> Auditoria contínua de passaportes, vistos e vouchers com ampla antecedência. Embarques 100% seguros.</span>
                </li>
                <li class="flex items-start gap-2.5 sm:gap-3">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span><strong>Múltiplos SLAs 100% Configuráveis:</strong> Sua agência monitora cronômetros personalizados para reembolsos aéreos, emissão de vouchers, quitação de LOCs e retorno de cotações a leads.</span>
                </li>
                <li class="flex items-start gap-2.5 sm:gap-3">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span><strong>Plantão na Palma da Mão (PWA):</strong> Escalas da equipe organizadas com transparência de folgas e notificações push em tempo real no celular do plantonista escalado.</span>
                </li>
                <li class="flex items-start gap-2.5 sm:gap-3">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span><strong>Pós-Venda Proativo &amp; WhatsApp:</strong> Pesquisas automáticas de satisfação (NPS) e mensagens de boas-vindas que encantam e fidelizam o passageiro.</span>
                </li>
              </ul>
            </div>

            <!-- Coluna 2: Vendas & Escala -->
            <div data-reveal="right" class="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0052d4]/20 via-teal-950/20 to-black/50 border border-teal-500/40 backdrop-blur-md space-y-4 sm:space-y-6 shadow-2xl pf-glow relative overflow-hidden">
              <div class="flex items-center justify-between border-b border-teal-500/20 pb-3 sm:pb-4">
                <div class="flex items-center gap-2.5 sm:gap-3">
                  <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black text-sm border border-teal-500/30 shrink-0">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <h3 class="text-sm sm:text-lg font-black text-teal-200">Recompra Ativa &amp; Crescimento</h3>
                </div>
                <span class="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-teal-500/20 text-teal-300">Mais Lucro</span>
              </div>
              <ul class="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-200 font-medium">
                <li class="flex items-start gap-2.5 sm:gap-3">
                  <span class="w-5 h-5 rounded-full bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0 mt-0.5 border border-teal-500/30">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span><strong>Máquina de Recompra (Next Trip Engine™):</strong> Cruza histórico de compras, NPS e periodicidade habitual de viagens para avisar quem abordar para novas vendas.</span>
                </li>
                <li class="flex items-start gap-2.5 sm:gap-3">
                  <span class="w-5 h-5 rounded-full bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0 mt-0.5 border border-teal-500/30">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span><strong>Disparos de Alertas Personalizados:</strong> Sua agência escolhe a antecedência exata (180d, 30d, 48h) e os canais de disparo para agir pontualmente no momento certo.</span>
                </li>
                <li class="flex items-start gap-2.5 sm:gap-3">
                  <span class="w-5 h-5 rounded-full bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0 mt-0.5 border border-teal-500/30">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span><strong>Usuários Ilimitados no Plano Pro:</strong> Toda a sua equipe integrada (consultores, emissores e financeiro) por um valor fixo de R$ 799/mês, sem cobranças punitivas por usuário.</span>
                </li>
                <li class="flex items-start gap-2.5 sm:gap-3">
                  <span class="w-5 h-5 rounded-full bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0 mt-0.5 border border-teal-500/30">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span><strong>Integração com Google Drive:</strong> Orçamentos ágeis, Kanban de viagens, conferência de localizadores e documentos organizados em pastas automáticas sem planilhas soltas.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

          <!-- ===== SEÇÃO: JORNADA OPERACIONAL CONTÍNUA ===== -->
          <section id="jornada-paxflow" class="w-full max-w-6xl mx-auto mb-14 sm:mb-24 px-4 sm:px-6 text-left">
            <div class="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-2.5 sm:space-y-3">
              <span class="px-3.5 sm:px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                Jornada Operacional Contínua
              </span>
              <h2 class="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Da Emissão ao Próximo Embarque em 3 Etapas
              </h2>
              <p class="text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-relaxed">
                Veja como o PaxFlow acompanha o ciclo completo de cada passageiro sem brechas, sem planilhas e sem clientes esquecidos na sua agência.
              </p>
            </div>

            <!-- Grid das 3 etapas conectadas -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

              <!-- ETAPA 1 -->
              <div data-reveal="left" class="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/[0.04] border border-emerald-500/30 backdrop-blur-md flex flex-col justify-between hover:border-emerald-400/60 transition shadow-2xl pf-glow relative">
                <span class="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-3 sm:mb-4 border border-emerald-500/30 w-fit">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  Etapa 1: Antes do Embarque
                </span>
                <div>
                  <h3 class="text-base sm:text-xl font-black text-white mb-2">Auditoria &amp; Blindagem de Viagens</h3>
                  <p class="text-xs text-slate-300 leading-relaxed font-medium mb-3">
                    O <strong>PaxFlow Risk Score™</strong> calcula uma nota de <strong>0 a 100</strong> para cada viagem ativa, auditando automaticamente passaportes, vistos e vouchers antes que a falha chegue ao passageiro no aeroporto.
                  </p>

                  <div class="p-2.5 sm:p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 font-medium mb-4 flex items-start gap-2">
                    <svg class="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span><strong>Disparos 100% Configuráveis:</strong> Sua agência define a antecedência dos avisos (ex: 180 dias para documentos, 48h para vouchers) e quem recebe os disparos via WhatsApp, Push ou Painel, agindo na hora certa.</span>
                  </div>

                  <!-- Mockup Visual do Risk Score (Soluções em Ação) -->
                  <div class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 space-y-2.5 sm:space-y-3 shadow-inner">
                    <div class="flex items-center justify-between border-b border-white/10 pb-2">
                      <div>
                        <span class="text-[10px] sm:text-[11px] font-bold text-slate-300 block">Diagnóstico de Saúde Operacional</span>
                        <span class="text-[9px] text-emerald-400 font-semibold">Auditoria contínua de 0 a 100</span>
                      </div>
                      <span class="px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-[11px] font-extrabold border border-emerald-500/40">98 / 100 (Blindada)</span>
                    </div>
                    <div class="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-[9px] sm:text-[10px] font-bold">
                      <div class="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>45 Seguras</div>
                      <div class="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>SLAs em Dia</div>
                      <div class="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>0 Falhas</div>
                    </div>
                    <!-- Soluções concluídas em ação (Verdinhos) -->
                    <div class="space-y-1.5 pt-1 text-[9px] sm:text-[10px]">
                      <div class="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-emerald-200">
                        <span class="flex items-center gap-1.5 truncate">
                          <svg class="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                          Passaporte Mariana C. — Validado com antecedência
                        </span>
                        <span class="px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-100 font-black shrink-0">Liberado</span>
                      </div>
                      <div class="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-emerald-200">
                        <span class="flex items-center gap-1.5 truncate">
                          <svg class="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                          Voucher Hotel Fasano — Anexado no prazo do SLA
                        </span>
                        <span class="px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-100 font-black shrink-0">Entregue</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-emerald-400">
                  <span class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    Risco zero no embarque
                  </span>
                  <span>Ver Risk Score →</span>
                </div>
              </div>

              <!-- ETAPA 2 -->
              <div data-reveal="up" class="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/[0.04] border border-cyan-500/30 backdrop-blur-md flex flex-col justify-between hover:border-cyan-400/60 transition shadow-2xl pf-glow relative">
                <span class="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-3 sm:mb-4 border border-cyan-500/30 w-fit">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                  Etapa 2: Durante a Viagem
                </span>
                <div>
                  <h3 class="text-base sm:text-xl font-black text-white mb-2">Plantão &amp; Suporte sem Furos</h3>
                  <p class="text-xs text-slate-300 leading-relaxed font-medium mb-4 sm:mb-6">
                    Sua agência nunca fica descoberta. Escalas da equipe, banco de folgas equilibrado e alertas urgentes no celular via PWA.
                  </p>

                  <!-- Mockup Visual de Escala & PWA Mobile -->
                  <div class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 space-y-2.5 sm:space-y-3 shadow-inner">
                    <div class="flex items-center justify-between border-b border-white/10 pb-2">
                      <span class="text-[10px] sm:text-[11px] font-bold text-slate-300">Plantão Operacional Ativo</span>
                      <span class="px-2 sm:px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] sm:text-[11px] font-extrabold border border-cyan-500/40">Equipe Escalonada</span>
                    </div>
                    <div class="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-2.5 text-[10px] text-cyan-200">
                      <div class="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                      </div>
                      <div>
                        <strong class="block text-white">Lucas Mendes no Plantão</strong>
                        <span>Notificações Push ativas no celular</span>
                      </div>
                    </div>
                    <div class="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                      <span class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
                        WhatsApp integrado
                      </span>
                      <span class="text-emerald-400 font-bold">Online</span>
                    </div>
                    <div class="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                      <span class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                        Itinerário VIP da agência
                      </span>
                      <span class="text-cyan-400 font-bold">Ativo</span>
                    </div>
                  </div>
                </div>
                <div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-cyan-400">
                  <span class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    Suporte 24h sem sobrecarga
                  </span>
                  <span>Ver Escalas →</span>
                </div>
              </div>

              <!-- ETAPA 3 -->
              <div data-reveal="right" class="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/[0.04] border border-indigo-500/30 backdrop-blur-md flex flex-col justify-between hover:border-indigo-400/60 transition shadow-2xl pf-glow relative">
                <span class="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-3 sm:mb-4 border border-indigo-500/30 w-fit">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Etapa 3: Após o Retorno
                </span>
                <div>
                  <h3 class="text-base sm:text-xl font-black text-white mb-2">Fidelização &amp; Recompra Preditiva</h3>
                  <p class="text-xs text-slate-300 leading-relaxed font-medium mb-4 sm:mb-6">
                    Acompanhe <strong>múltiplos SLAs configuráveis</strong> (reembolsos aéreos, emissão de vouchers, quitação de LOCs e retorno a orçamentos), encante com pesquisa de NPS e ative o <strong>Next Trip Engine™</strong>.
                  </p>

                  <!-- Mockup Visual de NPS & Next Trip -->
                  <div class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 space-y-2.5 sm:space-y-3 shadow-inner">
                    <div class="flex items-center justify-between border-b border-white/10 pb-2">
                      <span class="text-[10px] sm:text-[11px] font-bold text-slate-300">Reativação da Carteira</span>
                      <span class="px-2 sm:px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-[11px] font-extrabold border border-indigo-500/40">12 Oportunidades</span>
                    </div>
                    <div class="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-[9px] sm:text-[10px] text-emerald-200">
                      <span class="flex items-center gap-1.5 truncate">
                        <svg class="w-3 h-3 text-amber-400 fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        NPS 10: Promotor VIP
                      </span>
                      <span class="font-bold text-emerald-300 shrink-0">Promotor</span>
                    </div>
                    <div class="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-[9px] sm:text-[10px] text-emerald-200">
                      <span class="flex items-center gap-1.5 truncate">
                        <svg class="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Múltiplos SLAs: 100% no Prazo
                      </span>
                      <span class="font-bold text-emerald-300 shrink-0">Reembolsos &amp; Vouchers</span>
                    </div>
                    <div class="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-[9px] sm:text-[10px] text-indigo-200">
                      <span class="flex items-center gap-1.5 truncate">
                        <svg class="w-3 h-3 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                        Ana Paula (11m da viagem)
                      </span>
                      <span class="px-1.5 sm:px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-100 font-black shrink-0 cursor-pointer hover:bg-indigo-500/50 transition">Reabordar</span>
                    </div>
                  </div>
                </div>
                <div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-indigo-400">
                  <span class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    Recompra da base
                  </span>
                  <span>Ver Next Trip →</span>
                </div>
              </div>

            </div>
          </section>

          <!-- ===== SEÇÃO: UM DIA NA VIDA DA SUA AGÊNCIA COM PAXFLOW ===== -->
          <section id="dia-na-vida" class="w-full max-w-6xl mx-auto mb-14 sm:mb-24 px-4 sm:px-6 text-left">
            <div class="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-2.5 sm:space-y-3">
              <span class="px-3.5 sm:px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                A Nova Rotina Operacional
              </span>
              <h2 class="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Um Dia na Vida da Sua Agência com o PaxFlow
              </h2>
              <p class="text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-relaxed">
                Veja como a rotina da sua equipe se transforma, do primeiro café da manhã até a hora de dormir com a cabeça tranquila.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
              <!-- 08:00 -->
              <div data-reveal="up" class="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-2.5 sm:space-y-3 hover:border-cyan-400/50 transition shadow-xl pf-glow">
                <span class="px-2.5 py-0.5 sm:py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">08:00 AM</span>
                <h4 class="text-sm font-black text-white">Café &amp; Risk Score</h4>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  30 segundos para auditar a saúde da carteira. Os 3 alertas críticos do dia são delegados antes do primeiro cliente ligar.
                </p>
              </div>

              <!-- 11:30 -->
              <div data-reveal="up" style="animation-delay: .1s" class="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-2.5 sm:space-y-3 hover:border-violet-400/50 transition shadow-xl pf-glow">
                <span class="px-2.5 py-0.5 sm:py-1 rounded-full bg-violet-500/20 text-violet-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">11:30 AM</span>
                <h4 class="text-sm font-black text-white">Plantão Sem Estresse</h4>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Escalas do final de semana confirmadas no sistema. Banco de folgas calculado automaticamente sem brigas ou planilhas paralelas.
                </p>
              </div>

              <!-- 14:00 -->
              <div data-reveal="up" style="animation-delay: .2s" class="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-2.5 sm:space-y-3 hover:border-indigo-400/50 transition shadow-xl pf-glow">
                <span class="px-2.5 py-0.5 sm:py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">14:00 PM</span>
                <h4 class="text-sm font-black text-white">Recompra em Ação</h4>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  O Next Trip avisa: cliente fiel viajou há 11 meses e teve NPS 10. O consultor envia mensagem e fecha novo pacote às 16h!
                </p>
              </div>

              <!-- 17:30 -->
              <div data-reveal="up" style="animation-delay: .3s" class="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-2.5 sm:space-y-3 hover:border-amber-400/50 transition shadow-xl pf-glow">
                <span class="px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/20 text-amber-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">17:30 PM</span>
                <h4 class="text-sm font-black text-white">Reembolso no Prazo</h4>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Reembolso aéreo conciliado dentro do cronômetro de SLA da cia aérea. R$ 3.800 recuperados e creditados para o cliente.
                </p>
              </div>

              <!-- 20:00 -->
              <div data-reveal="up" style="animation-delay: .4s" class="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-2.5 sm:space-y-3 hover:border-emerald-400/50 transition shadow-xl pf-glow sm:col-span-2 md:col-span-1">
                <span class="px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">20:00 PM</span>
                <h4 class="text-sm font-black text-white">Noite Tranquila</h4>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  O dono da agência descansa em paz. Se houver emergência com passageiro no exterior, o plantonista recebe push no celular via PWA.
                </p>
              </div>
            </div>
          </section>

          <!-- ===== SEÇÃO: CALCULADORA INTERATIVA DE ROI ===== -->
          <section id="calculadora-roi" class="w-full max-w-5xl mx-auto mb-14 sm:mb-24 px-4 sm:px-6 text-left">
            <div class="p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-emerald-500/40 backdrop-blur-xl shadow-2xl pf-glow relative overflow-hidden">
              <div class="absolute -right-24 -bottom-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div class="text-center max-w-3xl mx-auto mb-8 sm:mb-10 space-y-2.5 sm:space-y-3">
                <span class="px-3.5 sm:px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                  Simulador Financeiro em Tempo Real
                </span>
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                  Quanto o PaxFlow Devolve ao Seu Bolso Todos os Meses?
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                  Ajuste o perfil da sua agência e descubra o impacto financeiro direto em multas evitadas e vendas recuperadas:
                </p>
              </div>

              <!-- Controles Interativos -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 mb-6 sm:mb-10 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/40 border border-white/10">
                <!-- Slider 1 -->
                <div class="space-y-2.5 sm:space-y-3">
                  <div class="flex items-center justify-between text-xs font-bold">
                    <span class="text-slate-300">Volume de Passageiros / Mês:</span>
                    <span id="roi-passageiros-display" class="text-cyan-400 font-black text-sm">40 passageiros</span>
                  </div>
                  <input id="roi-slider-passageiros" type="range" min="10" max="200" step="5" value="40" class="w-full accent-cyan-400 cursor-pointer" />
                  <span class="text-[10px] text-slate-400 block">De 10 a 200 passageiros mensais</span>
                </div>

                <!-- Slider 2 -->
                <div class="space-y-2.5 sm:space-y-3">
                  <div class="flex items-center justify-between text-xs font-bold">
                    <span class="text-slate-300">Ticket Médio por Viagem:</span>
                    <span id="roi-ticket-display" class="text-emerald-400 font-black text-sm">R$ 5.000</span>
                  </div>
                  <input id="roi-slider-ticket" type="range" min="2000" max="15000" step="500" value="5000" class="w-full accent-emerald-400 cursor-pointer" />
                  <span class="text-[10px] text-slate-400 block">Valor médio dos pacotes vendidos</span>
                </div>
              </div>

              <!-- Métricas de Retorno Calculadas -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 text-center">
                <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/10">
                  <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Prejuízos Evitados</span>
                  <span id="roi-prejuizos-val" class="text-lg sm:text-xl md:text-2xl font-black text-rose-300 block mb-1">R$ 2.800</span>
                  <span class="text-[10px] text-slate-300 font-medium">Multas, no-shows e SLAs aéreos</span>
                </div>

                <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/10">
                  <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Recompra Next Trip</span>
                  <span id="roi-recompra-val" class="text-lg sm:text-xl md:text-2xl font-black text-emerald-400 block mb-1">+ R$ 20.000</span>
                  <span class="text-[10px] text-slate-300 font-medium">4 vendas recuperadas na base</span>
                </div>

                <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0052d4]/30 via-emerald-600/30 to-[#00a8f5]/30 border border-emerald-400/40">
                  <span class="text-[10px] font-black uppercase text-emerald-200 tracking-wider block mb-1">Retorno Líquido</span>
                  <span id="roi-multiplicador-val" class="text-lg sm:text-xl md:text-2xl font-black text-white block mb-1">~28x</span>
                  <span class="text-[10px] text-emerald-200 font-bold">O valor do PaxFlow Pro</span>
                </div>
              </div>

              <div class="text-center pt-1 sm:pt-2">
                <p class="text-xs text-slate-300 font-medium mb-4 sm:mb-5">
                  <strong class="text-emerald-400">Destaque Comercial:</strong> Uma única nova venda fechada pelo Next Trip Engine já paga a anuidade inteira do PaxFlow.
                </p>
                <button id="btn-roi-demo" class="w-full sm:w-auto px-5 sm:px-8 py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] text-white font-black text-xs uppercase tracking-wider shadow-xl hover:scale-[1.03] transition">
                  Experimentar Este Retorno no Modo Demo →
                </button>
              </div>
            </div>
          </section>

          <!-- ===== SEÇÃO: MÓDULOS (TOUR COMPLETO) ===== -->
          <section id="modulos" class="w-full max-w-6xl mx-auto mb-14 sm:mb-24 px-4 sm:px-6 text-left">
            <div class="w-full text-center mb-6 sm:mb-8">
              <h2 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">Conheça os Módulos do PaxFlow</h2>
              <p class="text-xs sm:text-sm text-slate-400 font-medium mt-1.5 sm:mt-2">Deslize as abas para visualizar as telas reais da nossa solução</p>
            </div>

          <div class="w-full mb-6 sm:mb-8">
            <div class="flex items-center overflow-x-auto no-scrollbar-mobile md:flex-wrap md:justify-center gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-700/80 max-w-6xl mx-auto backdrop-blur-md shadow-2xl">
              <button id="tab-btn-dashboard" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-lg pf-glow">Painel Comercial</button>
              <button id="tab-btn-risk" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-emerald-300 hover:border-emerald-500/40 transition">
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                Risk Score™
              </button>
              <button id="tab-btn-nexttrip" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-indigo-300 hover:border-indigo-500/40 transition">
                <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                Next Trip Engine™
              </button>
              <button id="tab-btn-studio" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-amber-300 hover:border-amber-500/40 transition">
                <span class="text-xs">✨</span>
                PaxFlow Studio™
              </button>
              <button id="tab-btn-viagens" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-[#00a8f5] hover:border-blue-500/40 transition">Viagens</button>
              <button id="tab-btn-orcamentos" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-[#00e5a3] hover:border-emerald-500/40 transition">Orçamentos &amp; Upsell</button>
              <button id="tab-btn-inbox" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-rose-400 hover:border-rose-500/40 transition">Mensageria &amp; Decisões</button>
              <button id="tab-btn-escala" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-violet-400 hover:border-violet-500/40 transition">Escala da Equipe</button>
              <button id="tab-btn-reembolsos" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-amber-400 hover:border-amber-500/40 transition">Reembolsos</button>
              <button id="tab-btn-relatorios" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-indigo-400 hover:border-indigo-500/40 transition">Relatórios</button>
              <button id="tab-btn-publicas" class="shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-fuchsia-400 hover:border-fuchsia-500/40 transition">Itinerários VIP</button>
            </div>
          </div>

          <!-- Live preview window -->
          <div class="w-full bg-white/[0.04] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 text-left backdrop-blur-md min-h-0 flex flex-col justify-between pf-glow">
            <div class="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4 mb-4 sm:mb-5">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#f12711] rounded-full shrink-0"></span>
                <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#f5af19] rounded-full shrink-0"></span>
                <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#00e5a3] rounded-full shrink-0"></span>
                <span id="window-path-text" class="text-[9px] sm:text-[10px] font-black text-slate-300 ml-1.5 sm:ml-2 uppercase tracking-wide truncate">PaxFlow - Painel de Controle</span>
              </div>
              <span class="px-2 sm:px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#00a8f5]/20 to-[#f5af19]/20 text-[#00e5a3] font-extrabold text-[8px] sm:text-[9px] uppercase border border-[#00e5a3]/30 shrink-0">Demo em Tempo Real</span>
            </div>

            <div id="mockup-panels-container" class="flex-1 flex flex-col justify-center">
              <div id="panel-dashboard" class="space-y-4 tab-pane-transition">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#0052d4]/25 to-[#00e5a3]/10 border border-[#00a8f5]/25 text-sm text-slate-200 flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  </div>
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
                    <div><div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Orçamentos Criados</span><span>120</span></div><div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="pf-bar-fill bg-gradient-to-r from-[#0052d4] to-[#00a8f5] h-full rounded-full" data-bar="100"></div></div></div>
                    <div><div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Propostas Enviadas</span><span>75 (62%)</span></div><div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="pf-bar-fill bg-gradient-to-r from-[#f12711] to-[#f5af19] h-full rounded-full" data-bar="62"></div></div></div>
                    <div><div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Negociações Fechadas</span><span>24 (20%)</span></div><div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="pf-bar-fill bg-gradient-to-r from-[#00e5a3] to-teal-400 h-full rounded-full" data-bar="20"></div></div></div>
                  </div>
                </div>
              </div>

              <!-- Painel Risk Score -->
              <div id="panel-risk" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/30 text-sm text-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </div>
                    <span><strong>PaxFlow Risk Score™ (Saúde Operacional 0 a 100):</strong> Diagnóstico preventivo em tempo real que monitora vouchers, localizadores, vistos e prazos de passaporte de cada viagem da sua equipe.</span>
                  </div>
                  <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Saúde: 92/100 (Operação Blindada)
                  </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl space-y-3 shadow-xl">
                    <div class="flex items-center justify-between">
                      <span class="font-extrabold text-white text-sm">Paris &amp; Roma (VIP)</span>
                      <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black rounded-lg">Score 95</span>
                    </div>
                    <p class="text-slate-400 text-[11px]">Cliente: Mariana Costa • Embarque em 22 dias</p>
                    <div class="space-y-1.5 text-[11px]">
                      <div class="flex items-center gap-1.5 text-emerald-400 font-bold"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Vouchers aéreos e hotel anexados</div>
                      <div class="flex items-center gap-1.5 text-emerald-400 font-bold"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Passaporte válido por 2 anos</div>
                      <div class="flex items-center gap-1.5 text-emerald-400 font-bold"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Localizadores (LOC) conferidos</div>
                    </div>
                    <span class="block w-full py-2 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-black rounded-xl text-center text-[10px] uppercase">Operação 100% Segura</span>
                  </div>
                  <div class="bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl space-y-3 shadow-xl">
                    <div class="flex items-center justify-between">
                      <span class="font-extrabold text-white text-sm">Orlando &amp; Disney Família</span>
                      <span class="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black rounded-lg">Score 68</span>
                    </div>
                    <p class="text-slate-400 text-[11px]">Cliente: Família Alcantara • Embarque em 12 dias</p>
                    <div class="space-y-1.5 text-[11px]">
                      <div class="flex items-center gap-1.5 text-amber-400 font-bold"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> Voucher de ingressos pendente</div>
                      <div class="flex items-center gap-1.5 text-emerald-400 font-bold"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Vistos americanos confirmados</div>
                      <div class="flex items-center gap-1.5 text-emerald-400 font-bold"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Voos e seguro emitidos</div>
                    </div>
                    <span class="block w-full py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black rounded-xl text-center text-[10px] uppercase">Alerta de Pendência</span>
                  </div>
                  <div class="bg-slate-900/90 border border-rose-500/30 p-4 rounded-2xl space-y-3 shadow-xl">
                    <div class="flex items-center justify-between">
                      <span class="font-extrabold text-white text-sm">Nova York &amp; Miami</span>
                      <span class="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black rounded-lg">Score 42</span>
                    </div>
                    <p class="text-slate-400 text-[11px]">Cliente: Roberto Fonseca • Embarque em 5 dias</p>
                    <div class="space-y-1.5 text-[11px]">
                      <div class="flex items-center gap-1.5 text-rose-400 font-bold"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> Passaporte vence em menos de 6 meses</div>
                      <div class="flex items-center gap-1.5 text-amber-400 font-bold"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> Confirmação de traslado pendente</div>
                      <div class="flex items-center gap-1.5 text-emerald-400 font-bold"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Bilhete aéreo emitido</div>
                    </div>
                    <span class="block w-full py-2 bg-rose-600/20 text-rose-300 border border-rose-500/30 font-black rounded-xl text-center text-[10px] uppercase">Ação Imediata Necessária</span>
                  </div>
                </div>
              </div>

              <div id="panel-nexttrip" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-indigo-950/60 border border-indigo-500/30 text-sm text-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    </div>
                    <span><strong>Next Trip Engine™ (Motor Preditivo de Recompra):</strong> Algoritmo inteligente que analisa histórico de viagens concluídas (> 9 meses), NPS e preferências para prever o momento exato de sugerir novas viagens aos seus clientes.</span>
                  </div>
                  <span class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-500/30 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span> 3 Oportunidades de Recompra
                  </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="bg-slate-900/90 border border-indigo-500/40 p-4 rounded-2xl space-y-2.5 shadow-xl">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-white text-sm">Mariana & Família Costa</span>
                      <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black rounded-lg">Score 94</span>
                    </div>
                    <p class="text-slate-400 text-[11px] font-medium">Última viagem: Orlando (Out/2025) • Promotora NPS 10</p>
                    <div class="p-2.5 bg-indigo-950/60 rounded-xl border border-indigo-500/30 text-indigo-200 text-[11px] font-bold">
                      Sugestão: Europa 12m (Paris & Roma)
                    </div>
                    <div class="flex gap-2 pt-1">
                      <button class="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-center text-[10px] uppercase tracking-wider shadow flex items-center justify-center gap-1.5 transition">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
                        WhatsApp
                      </button>
                      <button class="flex-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-black rounded-xl text-center text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        Orçamento
                      </button>
                    </div>
                  </div>
                  <div class="bg-slate-900/90 border border-indigo-500/40 p-4 rounded-2xl space-y-2.5 shadow-xl">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-white text-sm">Carlos Eduardo Oliveira</span>
                      <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black rounded-lg">Score 86</span>
                    </div>
                    <p class="text-slate-400 text-[11px] font-medium">Última viagem: Cancún (Dez/2025) • Aniversário de Viagem</p>
                    <div class="p-2.5 bg-indigo-950/60 rounded-xl border border-indigo-500/30 text-indigo-200 text-[11px] font-bold">
                      Sugestão: Resort All-Inclusive (Praia do Forte)
                    </div>
                    <div class="flex gap-2 pt-1">
                      <button class="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-center text-[10px] uppercase tracking-wider shadow flex items-center justify-center gap-1.5 transition">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
                        WhatsApp
                      </button>
                      <button class="flex-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-black rounded-xl text-center text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        Orçamento
                      </button>
                    </div>
                  </div>
                  <div class="bg-slate-900/90 border border-indigo-500/40 p-4 rounded-2xl space-y-2.5 shadow-xl">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-white text-sm">Fernanda & Gabriel Santos</span>
                      <span class="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black rounded-lg">Score 78</span>
                    </div>
                    <p class="text-slate-400 text-[11px] font-medium">Última viagem: Maldivas (Ago/2025) • Janela de Férias</p>
                    <div class="p-2.5 bg-indigo-950/60 rounded-xl border border-indigo-500/30 text-indigo-200 text-[11px] font-bold">
                      Sugestão: Grécia & Ilhas Gregas
                    </div>
                    <div class="flex gap-2 pt-1">
                      <button class="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-center text-[10px] uppercase tracking-wider shadow flex items-center justify-center gap-1.5 transition">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
                        WhatsApp
                      </button>
                      <button class="flex-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-black rounded-xl text-center text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        Orçamento
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div id="panel-viagens" class="space-y-4 tab-pane-transition hidden">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#00a8f5]/25 to-cyan-500/10 border border-[#00a8f5]/25 text-sm text-slate-200 flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </div>
                  <span><strong>Operação de Pós-Venda &amp; Gestão Mobile Nativa:</strong> Acompanhe viagens por localizador (LOC) com botão flutuante FAB (+ Nova Viagem), compartilhamento nativo de itinerários no smartphone e alertas visuais de SLA em tempo real.</span>
                </div>
                <div class="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                  <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-[600px] text-xs">
                      <thead><tr class="bg-white/[0.04] text-[9px] font-bold uppercase text-slate-400 border-b border-white/10"><th class="px-4 py-3 text-center">SLA</th><th class="px-4 py-3">Cliente / LOC</th><th class="px-4 py-3">Destino</th><th class="px-4 py-3">Financeiro</th><th class="px-4 py-3">Status</th></tr></thead>
                      <tbody class="divide-y divide-white/10 text-slate-300 font-medium">
                        <tr class="hover:bg-white/[0.04] transition">
                          <td class="px-4 py-3 text-center">
                            <span class="inline-flex items-center justify-center text-amber-400">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            </span>
                          </td>
                          <td class="px-4 py-3"><strong class="text-white">Passageiro Demo 01</strong> <span class="ml-1 text-[8px] px-1.5 py-0.5 bg-white/10 rounded uppercase">BA921</span></td>
                          <td class="px-4 py-3">
                            <span class="inline-flex items-center gap-1.5">
                              <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                              Buenos Aires
                            </span>
                          </td>
                          <td class="px-4 py-3 text-[#00a8f5] font-bold">R$ 5.400,00</td>
                          <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-lg bg-[#f5af19]/15 text-[#f5af19] text-[9px] font-bold uppercase border border-[#f5af19]/25">Pré-Embarque</span></td>
                        </tr>
                        <tr class="hover:bg-white/[0.04] transition">
                          <td class="px-4 py-3 text-center">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 mx-auto block shadow-sm shadow-emerald-500/50"></span>
                          </td>
                          <td class="px-4 py-3"><strong class="text-white">Passageira Demo 02</strong> <span class="ml-1 text-[8px] px-1.5 py-0.5 bg-white/10 rounded uppercase">US441</span></td>
                          <td class="px-4 py-3">
                            <span class="inline-flex items-center gap-1.5">
                              <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                              Orlando
                            </span>
                          </td>
                          <td class="px-4 py-3 text-[#00a8f5] font-bold">R$ 12.800,00</td>
                          <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-lg bg-[#00a8f5]/15 text-[#00a8f5] text-[9px] font-bold uppercase border border-[#00a8f5]/25">Pós-Venda</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div id="panel-orcamentos" class="space-y-4 tab-pane-transition hidden">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#00e5a3]/25 to-teal-500/10 border border-[#00e5a3]/25 text-sm text-slate-200 flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                  </div>
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
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#f12711]/25 to-rose-500/10 border border-[#f12711]/25 text-sm text-slate-200 flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  </div>
                  <span><strong>Mensageria &amp; Push no Celular:</strong> Notificações Push nativas em smartphones Android e iOS na tela de bloqueio (mesmo com o aplicativo fechado), além de sincronização em tempo real (&lt; 1s) e alertas sonoros.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-1 space-y-2 border-r border-white/10 pr-3"><span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Alertas Recentes</span>
                    <div class="p-2 bg-[#f12711]/10 border border-[#f12711]/25 rounded-xl"><div class="flex justify-between font-extrabold text-[#f5af19]"><span>SLA Passaporte</span><span>Urgente</span></div><span class="block text-slate-400 truncate mt-0.5">Passageira Demo 03 (Validade &lt; 180d)</span></div>
                    <div class="p-2 bg-white/[0.03] border border-white/10 rounded-xl"><div class="flex justify-between font-bold text-slate-300"><span>Confirmação LOC</span><span>1h atrás</span></div><span class="block text-slate-400 truncate mt-0.5">Voo GRU-CDG confirmado</span></div>
                  </div>
                  <div class="md:col-span-2 space-y-3"><div class="flex items-center justify-between border-b border-white/10 pb-2"><span class="font-extrabold text-white">Thread: Alerta SLA - Passageira Demo 03</span><span class="text-[8px] font-bold text-[#f5af19]">Viagem em 15/12/2026</span></div><div class="p-2.5 bg-[#f12711]/10 border border-[#f12711]/25 rounded-xl"><span class="font-extrabold text-[#f5af19]">Sistema:</span><p class="text-slate-400 mt-0.5">Atenção! Passaporte vence em menos de 6 meses no dia da viagem.</p></div><div class="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-right ml-4"><span class="font-extrabold text-white">Consultor Demo:</span><p class="text-slate-400 mt-0.5">Solicitação de renovação já está em andamento.</p></div></div>
                </div>
              </div>

              <div id="panel-escala" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-violet-600/25 to-fuchsia-500/10 border border-violet-500/25 text-sm text-slate-200 flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                  </div>
                  <span><strong>Central Administrativa de Escala:</strong> Grade mensal de horários, banco de folgas, aprovação de trocas de turno e mural de treinamentos em um só painel.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1.5"><span class="font-bold text-white block">Grade de Turnos (Visão da Agência)</span><p class="text-slate-400">Tabela interativa com cores por horário e coluna fixa de equipe.</p></div>
                  <div class="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1.5"><span class="font-bold text-white block">Trocas & Banco de Folgas</span><p class="text-slate-400">Fluxo de aceite duplo com aprovação da gestão e controle de saldos.</p></div>
                </div>
              </div>

              <div id="panel-reembolsos" class="space-y-3 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-[#f5af19]/25 to-amber-500/10 border border-[#f5af19]/25 text-sm text-slate-200 flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <span><strong>Conciliação de Estornos Aéreos:</strong> Acompanhe cada etapa dos reembolsos junto às cias aéreas. Não deixe nenhum crédito da agência esquecido.</span>
                </div>
                <div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="border-b border-white/10 text-slate-400"><th class="pb-2 font-bold uppercase text-[8px]">Passageiro</th><th class="pb-2 font-bold uppercase text-[8px]">Fornecedor</th><th class="pb-2 font-bold uppercase text-[8px]">Valor</th><th class="pb-2 font-bold uppercase text-[8px]">Etapa</th></tr></thead><tbody class="divide-y divide-white/10 text-slate-300"><tr><td class="py-2.5 font-bold text-white">Passageiro Demo 04</td><td class="py-2.5">LATAM Airlines</td><td class="py-2.5 font-bold text-[#f5af19]">R$ 1.850,00</td><td class="py-2.5"><span class="px-1.5 py-0.5 bg-[#f12711]/15 text-[#f5af19] border border-[#f12711]/25 text-[8px] font-bold rounded-md uppercase">Solicitado</span></td></tr><tr><td class="py-2.5 font-bold text-white">Passageira Demo 05</td><td class="py-2.5">Decolar</td><td class="py-2.5 font-bold text-[#f5af19]">R$ 3.400,00</td><td class="py-2.5"><span class="px-1.5 py-0.5 bg-[#f5af19]/15 text-[#f5af19] border border-[#f5af19]/25 text-[8px] font-bold rounded-md uppercase">Em Análise</span></td></tr></tbody></table></div>
              </div>

              <div id="panel-relatorios" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-indigo-600/25 to-[#00a8f5]/10 border border-indigo-500/25 text-sm text-slate-200 flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  </div>
                  <span><strong>Relatórios e Inteligência Financeira:</strong> Markups por produto, taxa de fechamento da equipe e projeções de receitas para 30/60/90 dias.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Conversão Geral</span><span class="block text-lg font-black text-[#00e5a3] mt-1">28,4%</span></div><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Markup Médio</span><span class="block text-lg font-black text-[#00a8f5] mt-1">18,5%</span></div><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Pipeline Estimado</span><span class="block text-lg font-black text-[#f5af19] mt-1">R$ 115.800,00</span></div></div>
              </div>

              <div id="panel-publicas" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-fuchsia-600/25 to-purple-500/10 border border-fuchsia-500/25 text-sm text-slate-200 flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-xl bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4 text-fuchsia-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  </div>
                  <span><strong>Itinerários Digitais VIP &amp; Pesquisa NPS:</strong> Links públicos de viagem com as cores da sua agência. O cliente acessa vouchers e responde à avaliação NPS no celular.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-bold text-fuchsia-400 uppercase tracking-wider block">Itinerário Digital do Cliente</span><p class="text-slate-400 leading-normal mt-1">O passageiro acompanha voos, hotéis, traslados e vouchers, organizados por dia com contagem regressiva.</p></div><div class="bg-white/[0.03] border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-bold text-[#00e5a3] uppercase tracking-wider block">Pesquisa de Satisfação NPS</span><p class="text-slate-400 leading-normal mt-1">Pesquisa pós-viagem amigável que alimenta as estatísticas do painel de controle.</p></div></div>
              </div>

              <!-- Painel PaxFlow Studio™ -->
              <div id="panel-studio" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-indigo-950/60 to-purple-950/40 border border-amber-500/30 text-sm text-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 text-base">
                      ✨
                    </div>
                    <span><strong>PaxFlow Studio™ (Propostas de Luxo &amp; Live Preview):</strong> Editor em Split Screen que transforma PDFs de fornecedores em propostas visuais cinematográficas com atualização em tempo real e atalho [Ctrl+S].</span>
                  </div>
                  <span class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Live Preview Ativo
                  </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl space-y-2 shadow-xl">
                    <span class="text-[9px] font-black uppercase tracking-wider text-amber-400 block">Tela Dividida (Split Screen)</span>
                    <p class="text-slate-300 text-xs font-bold">Edição limpa e focada à esquerda com Live Preview instantâneo à direita.</p>
                    <p class="text-slate-400 text-[11px]">Qualquer alteração em passageiro, datas ou atividades reflete na hora na prévia da proposta.</p>
                  </div>
                  <div class="bg-slate-900/90 border border-indigo-500/30 p-4 rounded-2xl space-y-2 shadow-xl">
                    <span class="text-[9px] font-black uppercase tracking-wider text-indigo-400 block">Ingestão &amp; Fidelidade Estrita</span>
                    <p class="text-slate-300 text-xs font-bold">Arraste múltiplos PDFs ou cole textos de WhatsApp e reservas.</p>
                    <p class="text-slate-400 text-[11px]">Extrai voos, companhias aéreas, hotéis e localizadores preservando a precisão documental.</p>
                  </div>
                  <div class="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl space-y-2 shadow-xl">
                    <span class="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">Saídas Multicanal em 1-Clique</span>
                    <p class="text-slate-300 text-xs font-bold">Caderno PDF A4, Link Web Responsivo ou Conversão em Viagem.</p>
                    <p class="text-slate-400 text-[11px]">Envie o link de aprovação com visual luxuoso ou imprima o caderno de viagem da agência.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== COMO FUNCIONA (3 passos) ===== -->
        <section class="relative z-10 w-full py-20 px-6 border-t border-white/10">
          <div class="pf-zone max-w-6xl mx-auto">
            <div class="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-[#00a8f5]/15 border border-[#00a8f5]/30 text-[#00a8f5] text-[10px] font-black uppercase tracking-widest">Como Funciona</span>
              <h2 class="text-3xl md:text-5xl font-black tracking-tight text-white">Da primeira telinha à operação turbinada em 3 passos</h2>
              <p class="text-sm text-slate-400 font-medium">Sem curva de aprendizado longa: você vê, configura e começa a vender melhor no mesmo dia.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="left" class="relative p-7 rounded-3xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md overflow-hidden group hover:border-[#00a8f5]/40 transition shadow-xl">
                <span class="absolute -top-5 -right-2 text-7xl font-black text-white/[0.08] select-none">01</span>
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0052d4] to-[#00a8f5] text-white flex items-center justify-center mb-5 shadow-lg">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </div>
                <h3 class="text-xl font-black text-white">Conheça na Prática</h3>
                <p class="text-sm text-slate-300 font-medium mt-2 leading-relaxed">Explore o <strong class="text-white">Modo Demonstração</strong>: um ambiente real e interativo com dados fictícios no mês corrente, sem precisar cadastrar nada.</p>
              </div>
              <div data-reveal="up" class="relative p-7 rounded-3xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md overflow-hidden group hover:border-[#00e5a3]/40 transition shadow-xl">
                <span class="absolute -top-5 -right-2 text-7xl font-black text-white/[0.08] select-none">02</span>
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00e5a3] to-teal-400 text-slate-950 flex items-center justify-center mb-5 shadow-lg font-black">
                  <svg class="w-7 h-7 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                </div>
                <h3 class="text-xl font-black text-white">Configure Sua Marca</h3>
                <p class="text-sm text-slate-300 font-medium mt-2 leading-relaxed">Envie seu logotipo e escolha suas cores. Itinerários, vouchers e pesquisas NPS passam a carregar a identidade da <strong class="text-white">sua agência</strong> automaticamente.</p>
              </div>
              <div data-reveal="right" class="relative p-7 rounded-3xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md overflow-hidden group hover:border-[#f5af19]/40 transition shadow-xl">
                <span class="absolute -top-5 -right-2 text-7xl font-black text-white/[0.08] select-none">03</span>
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f5af19] to-[#f12711] text-white flex items-center justify-center mb-5 shadow-lg">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 class="text-xl font-black text-white">Largue as Planilhas</h3>
                <p class="text-sm text-slate-300 font-medium mt-2 leading-relaxed">Deixe o PaxFlow monitorar pós-vendas, reembolsos, passaportes e escalas 24/7 — e foque o seu tempo no que gera receita: <strong class="text-white">vender mais</strong>.</p>
              </div>
            </div>

            <!-- Pra quem é -->
            <div data-reveal="zoom" class="mt-14 rounded-3xl bg-gradient-to-r from-[#0052d4]/20 via-white/[0.03] to-[#f12711]/20 border border-white/10 p-8 text-center max-w-4xl mx-auto">
              <span class="text-[10px] font-black uppercase tracking-widest text-[#00e5a3]">Feito sob medida para</span>
              <div class="flex flex-wrap justify-center gap-3 mt-4">
                <span class="px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 text-sm font-semibold text-slate-200">Agências de Turismo</span>
                <span class="px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 text-sm font-semibold text-slate-200">Operadoras</span>
                <span class="px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 text-sm font-semibold text-slate-200">Franquias de Viagens</span>
                <span class="px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 text-sm font-semibold text-slate-200">Consultores de Viagem</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== NOVO: PAXFLOW RISK SCORE™ (Blindagem Operacional) ===== -->
        <section id="risk-score-section" class="relative z-10 w-full py-20 px-6 border-t border-white/10 bg-gradient-to-b from-[#06070f] via-emerald-950/40 to-[#06070f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-12">
            <div class="text-center max-w-3xl mx-auto space-y-4">
              <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                Blindagem Operacional Exclusiva
              </span>
              <h2 class="text-3xl md:text-5xl font-black tracking-tight leading-tight text-white">
                PaxFlow Risk Score™<br />
                <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent pf-animated-gradient">
                  Saúde Operacional da Viagem de 0 a 100
                </span>
              </h2>
              <p class="text-sm text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                Nunca mais seja surpreendido com clientes no aeroporto sem vouchers ou com passaportes vencidos. O motor de auditoria analisa continuamente de 0 a 100 o risco de cada viagem da sua carteira e dispara alertas 100% configuráveis para você e sua equipe agirem exatamente quando for importante.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="left" class="p-7 rounded-3xl bg-white/[0.04] border border-emerald-500/30 backdrop-blur-md space-y-4 hover:border-emerald-400/60 transition shadow-xl pf-glow">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                  <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                </div>
                <h3 class="text-xl font-extrabold text-white">Checklist Preventivo &amp; Pré-Embarque</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Verificação automática de vouchers, conferência de localizadores (LOC), passaportes com menos de 6 meses e auditoria obrigatória de <strong>contato pré-embarque a menos de 24h</strong> de cada voo.
                </p>
              </div>

              <div data-reveal="up" class="p-7 rounded-3xl bg-white/[0.04] border border-teal-500/30 backdrop-blur-md space-y-4 hover:border-teal-400/60 transition shadow-xl pf-glow">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600/20 to-cyan-600/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shadow-inner">
                  <svg class="w-6 h-6 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
                <h3 class="text-xl font-extrabold text-white">Semáforo &amp; Relatório de Embarque</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Controle central de partidas com alternância em 1-clique (Pendente / Feito), filtro de contatos e semáforo preditivo que aplica penalidade imediata se houver passageiro sem contato a menos de 24h.
                </p>
              </div>

              <div data-reveal="right" class="p-7 rounded-3xl bg-white/[0.04] border border-cyan-500/30 backdrop-blur-md space-y-4 hover:border-cyan-400/60 transition shadow-xl pf-glow">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shadow-inner">
                  <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 class="text-xl font-extrabold text-white">Gaveta de Ações &amp; WhatsApp Rápido</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Disparo ágil com modelo de pré-embarque pré-selecionado, acesso imediato ao histórico de conversas no Digisac e auditoria com registro do consultor responsável e horário.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== NEXT TRIP ENGINE (Destaque Exclusivo) ===== -->
        <section id="next-trip-section" class="relative z-10 w-full py-20 px-6 border-t border-white/10 bg-gradient-to-b from-[#06070f] via-[#100d2e]/80 to-[#06070f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-12">
            <div class="text-center max-w-3xl mx-auto space-y-4">
              <span class="px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                Exclusividade PaxFlow
              </span>
              <h2 class="text-3xl md:text-5xl font-black tracking-tight leading-tight text-white">
                Next Trip Engine™<br />
                <span class="bg-gradient-to-r from-indigo-400 via-purple-400 to-[#00a8f5] bg-clip-text text-transparent pf-animated-gradient">
                  Motor Preditivo de Recompra
                </span>
              </h2>
              <p class="text-sm text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                Transforme a base de clientes antigos da sua agência em vendas ativas. O algoritmo analisa 5 vetores estratégicos para dizer à sua equipe exatamente <strong>quem está no momento ideal para comprar uma nova viagem hoje</strong>.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="left" class="p-7 rounded-3xl bg-white/[0.04] border border-indigo-500/30 backdrop-blur-md space-y-4 hover:border-indigo-400/60 transition shadow-xl pf-glow">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                  <svg class="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                </div>
                <h3 class="text-xl font-extrabold text-white">Score de Potencial 0-100</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Cálculo em tempo real combinando tempo de retorno (> 90 dias), notas de NPS (Promotores 9-10), preferências de viagem e janela habitual de férias.
                </p>
              </div>

              <div data-reveal="up" class="p-7 rounded-3xl bg-white/[0.04] border border-purple-500/30 backdrop-blur-md space-y-4 hover:border-purple-400/60 transition shadow-xl pf-glow">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/20 to-fuchsia-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shadow-inner">
                  <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                </div>
                <h3 class="text-xl font-extrabold text-white">Clusters de Afinidade</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Agrupamento automático por perfis de viagens (<em>Europa 12m</em>, <em>Resorts no Verão</em>, <em>Disney/Família</em>, <em>Aniversário de Viagem</em>) para ofertas sob medida.
                </p>
              </div>

              <div data-reveal="right" class="p-7 rounded-3xl bg-white/[0.04] border border-emerald-500/30 backdrop-blur-md space-y-4 hover:border-emerald-400/60 transition shadow-xl pf-glow">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                  <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                </div>
                <h3 class="text-xl font-extrabold text-white">Ações de 1-Clique</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Dispare um WhatsApp personalizado pré-preenchido ou crie um Orçamento Preditivo direto pelo painel, ativando carência automática de 30 dias após a abordagem.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== MOBILIDADE & PWA COM PUSH ===== -->
        <section id="mobile-pwa" class="relative z-10 w-full py-20 px-6 border-t border-white/10 bg-gradient-to-b from-[#06070f] via-[#09152b]/60 to-[#06070f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-12">
            <div class="text-center max-w-3xl mx-auto space-y-4">
              <span class="px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                Mobilidade &amp; Notificações Push
              </span>
              <h2 class="text-3xl md:text-5xl font-black tracking-tight leading-tight text-white">
                Sua agência de viagens sempre conectada.<br class="hidden md:block" />
                <span class="text-cyan-400">
                  Versão PWA para Mobile com Notificações
                </span>
              </h2>
              <p class="text-sm text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                Opere com máxima velocidade no computador e acompanhe alertas instantâneos de vistos, passaportes e tarefas diretamente no seu celular com o aplicativo PWA nativo do PaxFlow.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div data-reveal="left" class="p-7 rounded-3xl bg-white/[0.04] border border-cyan-500/25 backdrop-blur-md space-y-4 hover:border-cyan-400/50 transition shadow-xl pf-glow">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-inner">
                  <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                </div>
                <h3 class="text-xl font-extrabold text-white">App PWA sem Lojas</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Adicione à tela de início do seu iPhone (Safari) ou Android (Chrome) em 1 clique. Carregamento ultra-rápido de app nativo sem consumir espaço de armazenamento.
                </p>
              </div>

              <div data-reveal="up" class="p-7 rounded-3xl bg-white/[0.04] border border-emerald-500/25 backdrop-blur-md space-y-4 hover:border-emerald-400/50 transition shadow-xl pf-glow">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                  <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                </div>
                <h3 class="text-xl font-extrabold text-white">Push Notifications Nativas</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Alertas em tempo real na tela de bloqueio do celular sobre prazos de vistos e passaportes, vouchers liberados, solicitações de viagem e SLAs estourando.
                </p>
              </div>

              <div data-reveal="right" class="p-7 rounded-3xl bg-white/[0.04] border border-fuchsia-500/25 backdrop-blur-md space-y-4 hover:border-fuchsia-400/50 transition shadow-xl pf-glow">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 text-fuchsia-400 border border-fuchsia-500/30 flex items-center justify-center shadow-inner">
                  <svg class="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                </div>
                <h3 class="text-xl font-extrabold text-white">Itinerário Mobile do Passageiro</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-medium">
                  Seu cliente recebe um link público personalizado com as cores da sua agência para acompanhar voos, vouchers e responder à pesquisa NPS no smartphone.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== SUA MARCA (brand showcase com carrossel - de volta da v1) ===== -->
        <section id="marcas" class="relative z-10 w-full py-14 sm:py-20 px-3.5 sm:px-6 border-t border-white/10 bg-gradient-to-b from-transparent to-[#0a0d1f]">
          <div class="pf-zone max-w-6xl mx-auto space-y-10 sm:space-y-12 relative">
            <div data-parallax="22" class="pf-float pointer-events-none absolute -top-6 -right-4 hidden lg:flex w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/10 items-center justify-center shadow-xl opacity-60"><img src="/logo.svg" alt="" class="w-12 h-12 object-contain" /></div>
            <div class="text-center max-w-3xl mx-auto space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-[#00e5a3]/15 border border-[#00e5a3]/30 text-[#00e5a3] text-[10px] font-black uppercase tracking-widest">Identidade Visual da Sua Agência</span>
              <h2 class="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white">Sua Marca, Seu Logotipo e Suas Cores<br class="hidden md:block" /> em Cada Ponto de Contato</h2>
              <p class="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">Toda a comunicação enviada ao seu passageiro carrega o logotipo oficial, o nome e a paleta de cores da sua própria agência — sem marcas de terceiros.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch max-w-5xl mx-auto">
              <div data-reveal="left" class="lg:col-span-4 bg-white/[0.04] border border-white/10 p-4 sm:p-6 rounded-3xl space-y-3 shadow-md flex flex-col justify-between">
                <div class="space-y-2.5">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Canais com Sua Marca</span>
                  <button id="brand-tab-itinerario" class="w-full p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-xl pf-glow">
                    <span class="p-2 bg-white/20 rounded-xl text-sm flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    </span>
                    <div><strong class="block text-xs font-black">01. Itinerário Digital VIP</strong><span class="text-[10px] opacity-90 font-medium block mt-0.5">Página do cliente com logo, cores e timeline no celular.</span></div>
                  </button>
                  <button id="brand-tab-voucher" class="w-full p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10">
                    <span class="p-2 bg-[#f5af19]/15 text-[#f5af19] rounded-xl text-sm flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4 text-[#f5af19]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </span>
                    <div><strong class="block text-xs font-black">02. Vouchers PDF com Logomarca</strong><span class="text-[10px] text-slate-400 font-medium block mt-0.5">Documento impresso de reserva com cabeçalho oficial.</span></div>
                  </button>
                  <button id="brand-tab-nps" class="w-full p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10">
                    <span class="p-2 bg-[#00e5a3]/15 text-[#00e5a3] rounded-xl text-sm flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4 text-[#00e5a3] fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    </span>
                    <div><strong class="block text-xs font-black">03. Pesquisa NPS Customizada</strong><span class="text-[10px] text-slate-400 font-medium block mt-0.5">Avaliação pós-viagem com sua paleta de cores.</span></div>
                  </button>
                  <button id="brand-tab-whatsapp" class="w-full p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10">
                    <span class="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl text-sm flex items-center justify-center shrink-0">
                      <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
                    </span>
                    <div><strong class="block text-xs font-black">04. Notificações no WhatsApp</strong><span class="text-[10px] text-slate-400 font-medium block mt-0.5">Avisos automáticos de embarque com dados da agência.</span></div>
                  </button>
                </div>
                <div class="text-[10px] text-slate-400 pt-3 border-t border-white/10 flex items-center gap-2">
                  <svg class="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  <span><strong>Configuração em 1 clique:</strong> Basta fazer upload da sua logomarca em <em>Configurações</em> e todos os canais são atualizados instantaneamente.</span>
                </div>
              </div>

              <div data-reveal="right" class="lg:col-span-8 bg-white/[0.04] border border-white/10 rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 text-left relative overflow-hidden backdrop-blur-md flex flex-col justify-between min-h-[360px] sm:min-h-[400px] pf-glow">
                <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-4 sm:mb-5">
                  <div class="flex items-center gap-2"><span class="w-3 h-3 bg-[#f12711] rounded-full"></span><span class="w-3 h-3 bg-[#f5af19] rounded-full"></span><span class="w-3 h-3 bg-[#00e5a3] rounded-full"></span><span id="brand-preview-title" class="text-[10px] font-black text-slate-300 ml-1 sm:ml-2 uppercase tracking-wide truncate max-w-[170px] sm:max-w-none">01. Itinerário Digital no Celular</span></div>
                  <span class="px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#00a8f5]/20 to-[#f5af19]/20 text-[#00e5a3] font-extrabold text-[8px] sm:text-[9px] uppercase border border-[#00e5a3]/30 shrink-0">Rotação (3s)</span>
                </div>

                <div id="brand-panels-container" class="flex-1 flex flex-col justify-center min-h-[220px]">
                  <div id="brand-panel-itinerario" class="space-y-4 tab-pane-transition min-h-[200px] flex flex-col justify-center">
                    <div class="bg-white/[0.04] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
                      <div class="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0052d4] to-[#00e5a3] flex items-center justify-center text-white shadow-md shrink-0">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                          </div>
                          <div class="min-w-0"><strong class="block text-xs sm:text-sm font-extrabold text-white truncate">Sua Agência de Viagens</strong><span class="block text-[9px] text-slate-400 uppercase font-bold tracking-wider truncate">Itinerário Digital do Cliente</span></div>
                        </div>
                        <span class="text-[9px] font-mono font-bold bg-white/10 text-[#00e5a3] px-2 py-1 rounded-lg border border-[#00e5a3]/30 shrink-0">PAX-8840</span>
                      </div>
                      <div class="grid grid-cols-2 gap-3 sm:gap-4 text-xs"><div><span class="block text-[9px] font-bold text-slate-400 uppercase">Passageiro VIP</span><strong class="block text-white truncate">Passageiro Fictício</strong></div><div><span class="block text-[9px] font-bold text-slate-400 uppercase">Destino & Data</span><strong class="block text-white truncate">Paris • 14/10/2026</strong></div></div>
                      <button class="w-full py-2.5 rounded-xl text-white font-extrabold text-[11px] sm:text-xs uppercase tracking-wider shadow-md transition bg-gradient-to-r from-[#0052d4] to-[#00a8f5] hover:scale-[1.02]">Ver Detalhes do Voo & Vouchers Protegidos</button>
                    </div>
                  </div>

                  <div id="brand-panel-voucher" class="space-y-4 tab-pane-transition hidden min-h-[200px] flex flex-col justify-center">
                    <div class="bg-white/[0.04] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
                      <div class="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f5af19] to-[#f12711] flex items-center justify-center text-white shadow-md shrink-0">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          </div>
                          <div class="min-w-0"><strong class="block text-xs sm:text-sm font-extrabold text-white truncate">Voucher Oficial</strong><span class="block text-[9px] text-slate-400 uppercase font-bold tracking-wider truncate">PDF com Logo da Sua Agência</span></div>
                        </div>
                        <span class="text-[9px] font-bold bg-[#00e5a3]/15 text-[#00e5a3] px-2 py-1 rounded-lg shrink-0">CONFIRMADA</span>
                      </div>
                      <div class="p-3 sm:p-4 bg-white/[0.06] rounded-xl border border-white/10 space-y-1 text-xs">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">Companhia Aérea & Voo</span>
                        <strong class="block text-white truncate">Air France • Voo AF-443 (GRU → CDG)</strong>
                        <span class="block text-[9px] text-slate-400 truncate">Cabine Executiva • Assento 4A • Bilhete: 057-24901928</span>
                      </div>
                    </div>
                  </div>

                  <div id="brand-panel-nps" class="space-y-4 tab-pane-transition hidden min-h-[200px] flex flex-col justify-center">
                    <div class="bg-white/[0.04] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3 text-center">
                      <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#00e5a3] to-[#00a8f5] text-white flex items-center justify-center mx-auto shadow-md pf-pulse-ring">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      </div>
                      <div><strong class="block text-xs sm:text-sm font-extrabold text-white">Como foi sua experiência com a Sua Agência?</strong><span class="block text-[10px] text-slate-400 font-medium">Sua avaliação ajuda a premiar nosso consultor de viagens</span></div>
                      <div class="flex justify-center gap-1.5 pt-1"><span class="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-black text-slate-400">8</span><span class="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-black text-slate-400">9</span><span class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0052d4] to-[#00e5a3] text-white flex items-center justify-center text-xs font-black shadow-md">10</span></div>
                    </div>
                  </div>

                  <div id="brand-panel-whatsapp" class="space-y-4 tab-pane-transition hidden min-h-[200px] flex flex-col justify-center">
                    <div class="bg-emerald-950/40 p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 space-y-2 text-left text-xs">
                      <div class="flex items-center gap-2 border-b border-emerald-500/20 pb-2">
                        <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                          <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
                        </div>
                        <div class="min-w-0"><strong class="block text-white font-extrabold text-[11px] sm:text-xs truncate">Sua Agência (WhatsApp Oficial)</strong><span class="block text-[8px] text-emerald-400 font-bold uppercase truncate">Mensagem Automática PaxFlow</span></div>
                      </div>
                      <p class="text-slate-300 text-[11px] leading-relaxed">"Olá! A sua viagem para Paris está se aproximando! Acesse o seu <strong>Itinerário Digital Oficial</strong> no link seguro: <span class="text-[#00e5a3] underline font-bold break-all">suaagencia.paxflow.com/itinerario/PAX-8840</span>"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== DEPOIMENTOS (prova social) ===== -->
        <section class="relative z-10 w-full py-14 sm:py-20 px-3.5 sm:px-6 border-t border-white/10">
          <div class="pf-zone max-w-6xl mx-auto">
            <div class="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-[#00e5a3]/15 border border-[#00e5a3]/30 text-[#00e5a3] text-[10px] font-black uppercase tracking-widest">Depoimentos</span>
              <h2 class="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white">Agências que já largaram as planilhas</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              <div data-reveal="up" style="transition-delay:.05s" class="pf-glass p-5 sm:p-7 rounded-3xl flex flex-col justify-between min-h-[220px]">
                <div><div class="text-[#f5af19] mb-3 text-sm">★★★★★</div><p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">"Antes, os reembolsos aéreos se perdiam no WhatsApp. Agora o cronômetro de SLA me avisa e eu nunca mais devolvi dinheiro que não precisava. Deu outra cara pro pós-venda."</p></div>
                <div class="mt-5 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#0052d4] to-[#00a8f5] flex items-center justify-center font-black text-white shrink-0">MC</div><div><strong class="block text-xs sm:text-sm font-extrabold text-white">Marina Costa</strong><span class="text-[10px] sm:text-[11px] text-slate-400 font-medium">Fundadora · Costa Viagens</span></div></div>
              </div>
              <div data-reveal="up" style="transition-delay:.15s" class="pf-glass p-5 sm:p-7 rounded-3xl flex flex-col justify-between min-h-[220px]">
                <div><div class="text-[#f5af19] mb-3 text-sm">★★★★★</div><p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">"A escala de funcionários e o banco de folgas era uma dor todo mês. O PaxFlow resolveu em um dia. Minha equipe ganhou tempo e eu ganhei previsibilidade."</p></div>
                <div class="mt-5 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#f12711] to-[#f5af19] flex items-center justify-center font-black text-white shrink-0">RS</div><div><strong class="block text-xs sm:text-sm font-extrabold text-white">Rafael Souza</strong><span class="text-[10px] sm:text-[11px] text-slate-400 font-medium">Diretor · Horizonte Operadora</span></div></div>
              </div>
              <div data-reveal="up" style="transition-delay:.25s" class="p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-[#00e5a3]/12 to-white/[0.02] border border-[#00e5a3]/20 backdrop-blur-md flex flex-col justify-between min-h-[220px]">
                <div><div class="text-[#f5af19] mb-3 text-sm">★★★★★</div><p class="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">"O itinerário digital com a nossa marca impressiona os clientes. Eles elogiam o app e a gente ainda ganha o NPS direto no fluxo. Virou vitrine de venda."</p></div>
                <div class="mt-5 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#00e5a3] to-teal-400 text-[#062a1f] flex items-center justify-center font-black shrink-0">JL</div><div><strong class="block text-xs sm:text-sm font-extrabold text-white">Juliana Lima</strong><span class="text-[10px] sm:text-[11px] text-slate-400 font-medium">Gerente · Mar Azul Franquias</span></div></div>
              </div>
            </div>

            <div data-reveal="up" class="mt-10 sm:mt-12 rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-6">
              <span class="block text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Aumente a retenção e a previsão da sua operação</span>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
                <div><span class="pf-num block text-2xl sm:text-3xl font-black text-[#00a8f5]" data-count="41" data-suffix="%">0%</span><span class="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Menos retrabalho</span></div>
                <div><span class="pf-num block text-2xl sm:text-3xl font-black text-[#00e5a3]" data-count="30" data-suffix="%">0%</span><span class="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mais tempo em vendas</span></div>
                <div><span class="pf-num block text-2xl sm:text-3xl font-black text-[#f5af19]" data-count="100" data-suffix="%">0%</span><span class="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reembolsos sob controle</span></div>
                <div><span class="pf-num block text-2xl sm:text-3xl font-black text-fuchsia-400" data-count="6" data-suffix="x">0x</span><span class="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mais fidelização VIP</span></div>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== INTEGRAÇÕES ===== -->
        <section id="integracao" class="relative z-10 w-full py-14 sm:py-20 px-3.5 sm:px-6 border-t border-white/10">
          <div class="pf-zone max-w-6xl mx-auto relative">
            <div data-parallax="34" class="pf-float-slow pointer-events-none absolute -top-10 -left-10 hidden lg:flex w-28 h-28 rounded-3xl bg-white/[0.03] border border-white/10 items-center justify-center shadow-xl opacity-70 rotate-12"><img src="/logo.svg" alt="" class="w-16 h-16 object-contain" /></div>
            <div data-parallax="-28" class="pf-float pointer-events-none absolute -bottom-12 -right-8 hidden lg:flex w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/10 items-center justify-center shadow-xl opacity-70 -rotate-6"><img src="/logo.svg" alt="" class="w-14 h-14 object-contain" /></div>
            <div class="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-[#00a8f5]/15 border border-[#00a8f5]/30 text-[#00a8f5] text-[10px] font-black uppercase tracking-widest">Integrações</span>
              <h2 class="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white">Conecte-se às ferramentas que já usa</h2>
              <p class="text-xs sm:text-sm text-slate-400 font-medium">O PaxFlow se integra nativamente à sua stack de atendimento e emissão, sem fricção.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              <div data-reveal="left" class="group p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-emerald-500/15 to-white/[0.02] border border-emerald-500/25 hover:scale-[1.03] hover:border-emerald-400/50 transition-transform"><div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center mb-4 shadow-lg pf-tilt"><svg class="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg></div><h3 class="text-lg sm:text-xl font-black text-white">Digisac / WhatsApp</h3><p class="text-xs sm:text-sm text-slate-400 font-medium mt-1 leading-relaxed">Atendimento com histórico split-screen, envio de modelos e notificações automáticas de embarque e NPS.</p></div>
              <div data-reveal="up" class="group p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-[#00a8f5]/15 to-white/[0.02] border border-[#00a8f5]/25 hover:scale-[1.03] hover:border-[#00a8f5]/50 transition-transform"><div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0052d4] to-[#00a8f5] text-white flex items-center justify-center mb-4 shadow-lg pf-tilt" style="animation-delay:.5s"><svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></div><h3 class="text-lg sm:text-xl font-black text-white">Companhias Aéreas &amp; PNR</h3><p class="text-xs sm:text-sm text-slate-400 font-medium mt-1 leading-relaxed">Importador 1-clique de bilhetes (Gol, Azul, LATAM, Amadeus, Sabre), conciliação de LOCs e alertas preditivos de embarque.</p></div>
              <div data-reveal="right" class="group p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-[#f5af19]/15 to-white/[0.02] border border-[#f5af19]/25 hover:scale-[1.03] hover:border-[#f5af19]/50 transition-transform"><div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#f5af19] to-[#f12711] text-white flex items-center justify-center mb-4 shadow-lg pf-tilt" style="animation-delay:1s"><svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg></div><h3 class="text-lg sm:text-xl font-black text-white">Upload &amp; Documentos</h3><p class="text-xs sm:text-sm text-slate-400 font-medium mt-1 leading-relaxed">Armazenamento seguro por cliente no Supabase Storage com links de acesso controlados.</p></div>
            </div>
          </div>
        </section>

        <!-- ===== CONFRONTO DE MERCADO (SOFTWARES TRADICIONAIS vs PAXFLOW) ===== -->
        <section id="comparativo-mercado" class="relative z-10 w-full py-14 sm:py-20 px-3.5 sm:px-6 border-t border-white/10">
          <div class="pf-zone max-w-5xl mx-auto">
            <div class="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-widest">
                Diferenciação Competitiva
              </span>
              <h2 class="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white">
                Por Que as Melhores Agências Estão Migrando para o PaxFlow?
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Compare a abordagem dos sistemas tradicionais do mercado com a proposta sem pegadinhas do PaxFlow:
              </p>
            </div>

            <!-- VERSÃO DESKTOP: Tabela Tradicional com Container de Scroll Seguro -->
            <div class="hidden md:block rounded-3xl overflow-hidden border border-white/10 backdrop-blur-md shadow-2xl">
              <div class="grid grid-cols-3 text-center text-[10px] font-black uppercase tracking-wider">
                <div class="p-4 bg-white/[0.02] border-b border-white/10 text-slate-400">O Que Sua Agência Precisa</div>
                <div class="p-4 bg-rose-950/20 border-b border-white/10 text-rose-300 flex items-center justify-center gap-1.5 font-black">
                  <span class="w-2 h-2 rounded-full bg-rose-400"></span> Softwares Tradicionais
                </div>
                <div class="p-4 bg-gradient-to-b from-[#00a8f5]/20 to-transparent border-b border-white/10 text-[#00e5a3] flex items-center justify-center gap-1.5 font-black">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span> PaxFlow Pro
                </div>
              </div>
              <div class="divide-y divide-white/[0.06]">
                <!-- Linha 1: Preço/Usuários -->
                <div class="grid grid-cols-3 text-xs md:text-sm items-center">
                  <div class="p-4 px-5 font-bold text-white">Cobrança por Usuário</div>
                  <div class="p-4 px-5 text-slate-400 text-center">R$ 80 a R$ 250 por atendente (fatura cara e punitiva)</div>
                  <div class="p-4 px-5 text-emerald-300 font-bold text-center bg-emerald-500/5">
                    <span class="text-emerald-400">●</span> <strong>Usuários Ilimitados</strong> (R$ 799 fixo)
                  </div>
                </div>

                <!-- Linha 2: Auditoria de Risco -->
                <div class="grid grid-cols-3 text-xs md:text-sm items-center bg-white/[0.02]">
                  <div class="p-4 px-5 font-bold text-white">Auditoria Preventiva de Risco</div>
                  <div class="p-4 px-5 text-slate-400 text-center">Nenhuma (você anota se lembrar, risco no embarque)</div>
                  <div class="p-4 px-5 text-slate-200 text-center bg-emerald-500/5">
                    <span class="text-emerald-400">●</span> <strong>PaxFlow Risk Score™</strong> 24/7 com semáforo
                  </div>
                </div>

                <!-- Linha 3: Recompra Preditiva -->
                <div class="grid grid-cols-3 text-xs md:text-sm items-center">
                  <div class="p-4 px-5 font-bold text-white">Reativação de Clientes</div>
                  <div class="p-4 px-5 text-slate-400 text-center">CRM passivo (você precisa lembrar de ligar)</div>
                  <div class="p-4 px-5 text-slate-200 text-center bg-emerald-500/5">
                    <span class="text-emerald-400">●</span> <strong>Next Trip Engine™</strong> preditivo por NPS
                  </div>
                </div>

                <!-- Linha 4: Escalas e Plantões -->
                <div class="grid grid-cols-3 text-xs md:text-sm items-center bg-white/[0.02]">
                  <div class="p-4 px-5 font-bold text-white">Escalas e Plantão da Equipe</div>
                  <div class="p-4 px-5 text-slate-400 text-center">Planilha confusa ou software extra de RH</div>
                  <div class="p-4 px-5 text-slate-200 text-center bg-emerald-500/5">
                    <span class="text-emerald-400">●</span> <strong>Turnos, folgas e plantão</strong> nativos
                  </div>
                </div>

                <!-- Linha 5: Alertas Mobile PWA -->
                <div class="grid grid-cols-3 text-xs md:text-sm items-center">
                  <div class="p-4 px-5 font-bold text-white">Alertas Urgentes no Celular</div>
                  <div class="p-4 px-5 text-slate-400 text-center">E-mails lentos que caem na caixa de spam</div>
                  <div class="p-4 px-5 text-slate-200 text-center bg-emerald-500/5">
                    <span class="text-emerald-400">●</span> <strong>Push Notifications</strong> no iPhone e Android
                  </div>
                </div>

                <!-- Linha 6: Múltiplos SLAs Operacionais -->
                <div class="grid grid-cols-3 text-xs md:text-sm items-center bg-white/[0.02]">
                  <div class="p-4 px-5 font-bold text-white">Múltiplos SLAs Operacionais</div>
                  <div class="p-4 px-5 text-slate-400 text-center">Perda de prazos com cias aéreas, vouchers e quitações</div>
                  <div class="p-4 px-5 text-slate-200 text-center bg-emerald-500/5">
                    <span class="text-emerald-400">●</span> <strong>Múltiplos SLAs 100% configuráveis</strong> (Reembolsos, Vouchers, LOCs e Leads)
                  </div>
                </div>

                <!-- Linha 7: Itinerário VIP -->
                <div class="grid grid-cols-3 text-xs md:text-sm items-center">
                  <div class="p-4 px-5 font-bold text-white">Página do Passageiro</div>
                  <div class="p-4 px-5 text-slate-400 text-center">Link genérico exibindo a marca do software</div>
                  <div class="p-4 px-5 text-slate-200 text-center bg-emerald-500/5">
                    <span class="text-emerald-400">●</span> <strong>White-Label</strong> com o logo e cores da sua agência
                  </div>
                </div>
              </div>
            </div>

            <!-- VERSÃO MOBILE: Cards Comparativos Elegantes (Sem quebra de tabela) -->
            <div class="block md:hidden space-y-4">
              <!-- Card 1 -->
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <strong class="block text-sm font-black text-white">Cobrança de Usuários</strong>
                <div class="grid grid-cols-1 gap-2 text-xs">
                  <div class="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-rose-400 mb-0.5">✕ Sistemas Tradicionais</span>
                    R$ 80 a R$ 250 por atendente (fatura cara e punitiva ao crescer)
                  </div>
                  <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 font-medium">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-emerald-400 mb-0.5">✓ No PaxFlow Pro</span>
                    <strong>Usuários Ilimitados</strong> com valor fixo sem pegadinhas.
                  </div>
                </div>
              </div>

              <!-- Card 2 -->
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <strong class="block text-sm font-black text-white">Auditoria Preventiva de Risco</strong>
                <div class="grid grid-cols-1 gap-2 text-xs">
                  <div class="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-rose-400 mb-0.5">✕ Sistemas Tradicionais</span>
                    Nenhuma prevenção ativa (risco de visto vencido e no-show no aeroporto).
                  </div>
                  <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 font-medium">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-emerald-400 mb-0.5">✓ No PaxFlow Pro</span>
                    <strong>Risk Score™ 24/7</strong> com semáforo preditivo e alertas automáticos.
                  </div>
                </div>
              </div>

              <!-- Card 3 -->
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <strong class="block text-sm font-black text-white">Reativação de Clientes (Recompra)</strong>
                <div class="grid grid-cols-1 gap-2 text-xs">
                  <div class="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-rose-400 mb-0.5">✕ Sistemas Tradicionais</span>
                    CRM passivo (você precisa lembrar de ligar quando tiver tempo).
                  </div>
                  <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 font-medium">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-emerald-400 mb-0.5">✓ No PaxFlow Pro</span>
                    <strong>Next Trip Engine™</strong> calcula janela preditiva após NPS positivo.
                  </div>
                </div>
              </div>

              <!-- Card 4 -->
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <strong class="block text-sm font-black text-white">Escalas e Plantão da Equipe</strong>
                <div class="grid grid-cols-1 gap-2 text-xs">
                  <div class="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-rose-400 mb-0.5">✕ Sistemas Tradicionais</span>
                    Planilhas perdidas no Excel ou assinatura extra de outro software de RH.
                  </div>
                  <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 font-medium">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-emerald-400 mb-0.5">✓ No PaxFlow Pro</span>
                    <strong>Turnos, folgas e plantões</strong> integrados no mesmo painel.
                  </div>
                </div>
              </div>

              <!-- Card 5 -->
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <strong class="block text-sm font-black text-white">Alertas Urgentes no Celular</strong>
                <div class="grid grid-cols-1 gap-2 text-xs">
                  <div class="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-rose-400 mb-0.5">✕ Sistemas Tradicionais</span>
                    E-mails que se perdem no spam ou avisos manuais no WhatsApp.
                  </div>
                  <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 font-medium">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-emerald-400 mb-0.5">✓ No PaxFlow Pro</span>
                    <strong>Push Notifications reais</strong> no iPhone e Android via PWA.
                  </div>
                </div>
              </div>

              <!-- Card 6 -->
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <strong class="block text-sm font-black text-white">Múltiplos SLAs Operacionais</strong>
                <div class="grid grid-cols-1 gap-2 text-xs">
                  <div class="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-rose-400 mb-0.5">✕ Sistemas Tradicionais</span>
                    Perda constante de prazos de reembolsos, emissão de vouchers e cotações de clientes.
                  </div>
                  <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 font-medium">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-emerald-400 mb-0.5">✓ No PaxFlow Pro</span>
                    <strong>Múltiplos SLAs 100% configuráveis</strong> para reembolsos, vouchers, conferência de LOCs e retorno de leads.
                  </div>
                </div>
              </div>

              <!-- Card 7 -->
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <strong class="block text-sm font-black text-white">Página do Passageiro</strong>
                <div class="grid grid-cols-1 gap-2 text-xs">
                  <div class="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-rose-400 mb-0.5">✕ Sistemas Tradicionais</span>
                    Link cru com logotipo do software de terceiros.
                  </div>
                  <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 font-medium">
                    <span class="text-[9px] uppercase font-black tracking-wider block text-emerald-400 mb-0.5">✓ No PaxFlow Pro</span>
                    <strong>White-Label VIP</strong> com sua marca, seu logo e suas cores.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== PLANOS ===== -->
        <section id="planos" class="relative z-10 w-full py-14 sm:py-20 px-3.5 sm:px-6 border-t border-white/10">
          <div class="pf-zone max-w-5xl mx-auto">
            <div class="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-[#f5af19]/15 border border-[#f5af19]/30 text-[#f5af19] text-[10px] font-black uppercase tracking-widest">Planos e Preços</span>
              <h2 class="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white">Investimento claro, retorno imediato</h2>
              <p class="text-xs sm:text-sm text-slate-400 font-medium">Planos desenhados sob medida para consultores independentes e agências com equipe.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
              <!-- Plano Solo -->
              <div data-reveal="up" class="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-700/80 hover:scale-[1.02] transition-transform flex flex-col justify-between shadow-xl">
                <div>
                  <h3 class="text-lg font-black text-white">Solo / Consultor</h3>
                  <p class="text-xs sm:text-sm text-slate-300 mt-1 font-medium">Para consultores autônomos e agências de 1 pessoa</p>
                  <div class="mt-4 sm:mt-5 mb-5 sm:mb-6">
                    <span class="text-3xl sm:text-4xl font-black text-[#00a8f5]">R$ 199</span>
                    <span class="text-xs sm:text-sm text-slate-300">/mês</span>
                  </div>
                  <ul class="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                    <li class="flex items-center gap-2"><span class="text-[#00e5a3] font-black">✓</span>1 Consultor autônomo</li>
                    <li class="flex items-center gap-2"><span class="text-[#00e5a3] font-black">✓</span>Pipeline de orçamentos e viagens</li>
                    <li class="flex items-center gap-2"><span class="text-[#00e5a3] font-black">✓</span>Itinerários VIP com sua marca e cores</li>
                    <li class="flex items-center gap-2"><span class="text-[#00e5a3] font-black">✓</span>Alertas de passaporte, visto e SLA</li>
                    <li class="flex items-center gap-2"><span class="text-[#00e5a3] font-black">✓</span>App PWA no celular com Push</li>
                  </ul>
                </div>
                <button id="btn-plano-starter" class="mt-6 sm:mt-8 w-full py-3 sm:py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs uppercase border border-slate-600 transition shadow-md">Testar no Modo Demo</button>
              </div>

              <!-- Plano Agência Pro -->
              <div data-reveal="up" class="pf-glow relative p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-[#0052d4] via-[#00a8f5] to-[#00e5a3] shadow-2xl pf-animated-gradient md:scale-[1.03] flex flex-col justify-between">
                <span class="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[#f5af19] text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-lg border border-amber-300">Mais Popular</span>
                <div>
                  <h3 class="text-lg font-black text-white">Agência Pro</h3>
                  <p class="text-xs sm:text-sm text-white/90 mt-1 font-medium">Para agências com equipe e em expansão</p>
                  <div class="mt-4 sm:mt-5 mb-4">
                    <span class="text-3xl sm:text-4xl font-black text-white">R$ 799</span>
                    <span class="text-xs sm:text-sm text-white/85">/mês</span>
                  </div>
                  <div class="mb-4 sm:mb-5 p-3 rounded-2xl bg-black/30 border border-white/20 text-xs text-amber-200 font-semibold leading-relaxed flex items-start gap-2.5 shadow-inner">
                    <div class="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                    <span><strong>Sem surpresas na fatura:</strong> convide toda a sua equipe (plantonistas, emissores e consultores) com usuários ilimitados no Plano Pro.</span>
                  </div>
                  <ul class="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-white font-medium">
                    <li class="flex items-center gap-2"><span class="text-white font-black">✓</span>Consultores e usuários ilimitados</li>
                    <li class="flex items-center gap-2"><span class="text-white font-black">✓</span>Gestão de Escalas &amp; Banco de Folgas</li>
                    <li class="flex items-center gap-2"><span class="text-white font-black">✓</span>PaxFlow Risk Score™ (Diagnóstico 0-100)</li>
                    <li class="flex items-center gap-2"><span class="text-white font-black">✓</span>Next Trip Engine™ &amp; Upsell Preditivo</li>
                    <li class="flex items-center gap-2"><span class="text-white font-black">✓</span>Relatórios Financeiros &amp; Markups</li>
                    <li class="flex items-center gap-2"><span class="text-white font-black">✓</span>Integração Digisac / WhatsApp</li>
                  </ul>
                </div>
                <button id="btn-plano-profissional" class="mt-6 sm:mt-8 w-full py-3 sm:py-3.5 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-xs uppercase transition shadow-xl">Iniciar Demonstração</button>
              </div>

              <!-- Plano Enterprise -->
              <div data-reveal="up" class="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-700/80 hover:scale-[1.02] transition-transform flex flex-col justify-between shadow-xl">
                <div>
                  <h3 class="text-lg font-black text-white">Enterprise</h3>
                  <p class="text-xs sm:text-sm text-slate-300 mt-1 font-medium">Para franquias, operadoras e grandes redes</p>
                  <div class="mt-4 sm:mt-5 mb-5 sm:mb-6">
                    <span class="text-3xl sm:text-4xl font-black text-[#f5af19]">Sob Consulta</span>
                  </div>
                  <ul class="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                    <li class="flex items-center gap-2"><span class="text-[#00e5a3] font-black">✓</span>Gestão Multi-unidades / Filiais</li>
                    <li class="flex items-center gap-2"><span class="text-[#00e5a3] font-black">✓</span>Regras operacionais personalizadas</li>
                    <li class="flex items-center gap-2"><span class="text-[#00e5a3] font-black">✓</span>Gerente de conta e suporte VIP</li>
                    <li class="flex items-center gap-2"><span class="text-[#00e5a3] font-black">✓</span>Onboarding assistido e migração</li>
                  </ul>
                </div>
                <button id="btn-plano-enterprise" class="mt-6 sm:mt-8 w-full py-3 sm:py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs uppercase border border-slate-600 transition shadow-md">Falar com Consultor</button>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== FAQ ===== -->
        <section id="faq" class="relative z-10 w-full py-14 sm:py-20 px-3.5 sm:px-6 border-t border-white/10">
          <div class="pf-zone max-w-4xl mx-auto space-y-8 sm:space-y-10">
            <div class="text-center space-y-2"><span class="px-3 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-black uppercase tracking-widest">Tire suas dúvidas</span><h2 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">Perguntas Frequentes</h2></div>
            <div class="space-y-3.5 sm:space-y-4">
              <details data-reveal="up" class="group bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg [&_summary::-webkit-details-marker]:hidden" open><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-xs sm:text-sm font-extrabold text-white">Como funciona o Modo Demonstração?</h3><span class="ml-1.5 shrink-0 rounded-full bg-slate-800 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">É um ambiente de simulação completo e interativo, pré-populado com dados fictícios no mês corrente de clientes, viagens, reembolsos e escalas. Permite testar todas as telas e recursos em tempo real, sem cadastro prévio.</p></details>
              <details data-reveal="up" class="group bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-xs sm:text-sm font-extrabold text-white">Posso controlar a escala de todos os funcionários?</h3><span class="ml-1.5 shrink-0 rounded-full bg-slate-800 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">Sim! O módulo de Central Administrativa permite atribuir turnos, controlar saldos no Banco de Folgas e aprovar solicitações de trocas.</p></details>
              <details data-reveal="up" class="group bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-xs sm:text-sm font-extrabold text-white">Como funciona o alerta de passaportes e vistos?</h3><span class="ml-1.5 shrink-0 rounded-full bg-slate-800 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">O PaxFlow calcula a diferença entre a validade dos documentos e a data da viagem. Se a validade for inferior a 6 meses, gera alertas prioritários no Inbox.</p></details>
              <details data-reveal="up" class="group bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-xs sm:text-sm font-extrabold text-white">Como a página do cliente assume as cores da minha agência?</h3><span class="ml-1.5 shrink-0 rounded-full bg-slate-800 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">Em Configurações, você envia sua logomarca e seleciona a cor primária. Todos os itinerários públicos passam a exibir seu logotipo e paleta automaticamente.</p></details>
              <details data-reveal="up" class="group bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-xs sm:text-sm font-extrabold text-white">Preciso de fidelidade ou cartão de crédito para testar?</h3><span class="ml-1.5 shrink-0 rounded-full bg-slate-800 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">Não. Comece pelo Modo Demonstração — um ambiente completo e gratuito com dados fictícios. Se quiser seguir, é sem contrato de fidelidade: você pode cancelar quando quiser.</p></details>
              <details data-reveal="up" class="group bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-xs sm:text-sm font-extrabold text-white">Como instalo o PaxFlow como aplicativo no celular (Android e iPhone)?</h3><span class="ml-1.5 shrink-0 rounded-full bg-slate-800 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">O PaxFlow é um aplicativo Web PWA. No <strong>iPhone (Safari)</strong>, toque em Compartilhar (⎋) ➔ <em>"Adicionar à Tela de Início"</em>. No <strong>Android (Chrome)</strong>, toque no aviso de instalação ou no menu de 3 pontinhos (⋮) ➔ <em>"Instalar aplicativo"</em>. Ele aparecerá na sua tela inicial como um app nativo, com notificações Push e velocidade total!</p></details>
              <details data-reveal="up" class="group bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-between cursor-pointer focus:outline-none"><h3 class="text-xs sm:text-sm font-extrabold text-white">Minha agência já usa planilhas. Como funciona a migração?</h3><span class="ml-1.5 shrink-0 rounded-full bg-slate-800 p-1.5 text-white transition group-open:-rotate-180"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></span></summary><p class="mt-3 text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">Nada é perdido. Nossos planos contam com onboarding guiado para importar seus clientes, viagens e reembolsos para o PaxFlow, mantendo o histórico que já construiu.</p></details>
            </div>
          </div>
        </section>

        <!-- ===== CTA FINAL ===== -->
        <section id="recursos" class="relative z-10 w-full py-14 sm:py-20 px-3.5 sm:px-6 border-t border-white/10 text-center overflow-hidden">
          <div class="pf-beam"></div>
          <div class="absolute inset-0 bg-gradient-to-br from-[#0052d4]/30 via-[#0a0d1f] to-[#f12711]/30 pf-animated-gradient opacity-60"></div>
          <div class="pf-zone relative max-w-3xl mx-auto space-y-5 sm:space-y-6">
            <span class="px-4 py-1.5 rounded-full bg-[#00e5a3]/20 text-[#00e5a3] border border-[#00e5a3]/30 text-[10px] font-black uppercase tracking-widest">Leve sua agência para o próximo nível</span>
            <p class="text-lg sm:text-3xl font-black tracking-tight bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-[#f5af19] bg-clip-text text-transparent pf-animated-gradient">Da venda até a volta!</p>
            <h2 class="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">Pronto para revolucionar a operação da sua agência?</h2>
            <p class="text-xs sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed font-medium">Assuma o controle total com múltiplos SLAs configuráveis (reembolsos, vouchers, LOCs e leads), auditoria preventiva de viagens e escalas da sua equipe.</p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4">
              <button id="btn-cta-demo-final" class="pf-shine pf-animated-gradient w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-white font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] shadow-2xl hover:scale-[1.05] transition-transform">Modo Demonstração</button>
              <button id="btn-cta-whatsapp-final" class="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 transition">Falar com Consultor</button>
              <button id="btn-cta-login-final" class="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs tracking-wider uppercase border border-slate-600 transition shadow-md">Acessar Sistema Real</button>
            </div>
            <p class="pt-4 sm:pt-6 text-[11px] sm:text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 text-center">
              <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              Experimente sem compromisso · Sem cartão de crédito · Cancele quando quiser
            </p>
          </div>
        </section>

        <!-- ===== FOOTER ===== -->
        <footer class="relative z-10 w-full border-t border-white/10 py-6 px-4 sm:px-10 text-xs text-slate-300 font-medium bg-[#04050a]">
          <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            <!-- Logo do PaxFlow à esquerda -->
            <a href="#topo" class="flex items-center gap-2.5 group pointer-events-auto shrink-0">
              <span class="relative w-8 h-8 rounded-xl bg-slate-800 p-1 shadow-md pf-pulse-ring shrink-0 border border-slate-700">
                <img src="/logo.svg" alt="PaxFlow" class="w-full h-full object-contain rounded-lg" />
              </span>
              <span class="text-base font-black tracking-tight text-white">Pax<span class="bg-gradient-to-r from-[#00a8f5] via-[#00e5a3] to-[#f5af19] bg-clip-text text-transparent">Flow</span></span>
            </a>

            <!-- Selos de segurança e copyright alinhados à direita -->
            <div class="flex flex-col sm:flex-row items-center gap-x-6 gap-y-2 text-center md:text-right">
              <div class="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-1 text-slate-300 text-[10px] sm:text-[11px]">
                <span class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  Dados protegidos
                </span>
                <span class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  Conformidade LGPD
                </span>
                <span class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Atualizações constantes
                </span>
              </div>
              <span class="hidden sm:inline text-slate-600">|</span>
              <p class="text-[10px] sm:text-[11px] text-slate-300">© 2026 PaxFlow. Todos os direitos reservados. Sistema Especializado em CRM &amp; Pós-Venda Turístico.</p>
            </div>

          </div>
        </footer>

        <!-- Barra Flutuante de Conversão Rápida (Sticky Bar) - Otimizada para Desktop/Tablet sem sobrecarregar celulares -->
        <div id="sticky-cta-bar" class="hidden md:flex fixed bottom-2 left-0 right-0 z-40 bg-slate-950/95 border border-cyan-500/30 backdrop-blur-xl px-5 py-3 shadow-2xl translate-y-full transition-transform duration-300 items-center justify-between gap-4 max-w-4xl mx-auto rounded-2xl">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0052d4] to-[#00e5a3] flex items-center justify-center text-white shadow shrink-0">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </span>
            <div>
              <strong class="text-white text-xs block">PaxFlow: Da Emissão ao Próximo Embarque</strong>
              <span class="text-[10px] text-slate-300">Auditoria 24/7 de riscos e recompra com usuários ilimitados.</span>
            </div>
          </div>
          <div class="flex items-center gap-2.5 shrink-0">
            <button id="btn-sticky-demo" class="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0052d4] via-[#00a8f5] to-[#00e5a3] text-white font-black text-xs uppercase tracking-wide shadow-lg hover:scale-[1.03] transition">Iniciar Demonstração (Grátis)</button>
            <button id="btn-sticky-login" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs uppercase transition border border-white/10">Entrar</button>
          </div>
        </div>

        <!-- Floating WhatsApp FAB - Posicionamento Confortável no Mobile -->
        <a id="btn-floating-whatsapp" href="https://wa.me/5511966989160?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20PaxFlow%20para%20minha%20ag%C3%AAncia." target="_blank" class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-[11px] sm:text-xs rounded-full shadow-2xl border border-emerald-400/40 transition-all flex items-center gap-2 pf-glow">
          <span class="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-300"></span></span>
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
          <span class="hidden xs:inline sm:inline">Falar com Especialista</span>
          <span class="inline xs:hidden sm:hidden">WhatsApp</span>
        </a>
      </div>
    `;
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
      window.open('https://wa.me/5511966989160?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20PaxFlow%20para%20minha%20ag%C3%AAncia.', '_blank');
    };

    document.getElementById('btn-iniciar-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-menu-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-acessar-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-conhecer-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-cta-demo-final')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-cta-login-final')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-cta-whatsapp-final')?.addEventListener('click', handleWhatsApp);
    document.getElementById('btn-header-whatsapp')?.addEventListener('click', handleWhatsApp);
    document.getElementById('btn-plano-starter')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-plano-profissional')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-plano-enterprise')?.addEventListener('click', handleWhatsApp);
    document.getElementById('btn-demo-topo-matinal')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-roi-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-sticky-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-sticky-login')?.addEventListener('click', handleAcessarReal);

    // Lógica Dinâmica da Calculadora de ROI
    const passageirosSlider = document.getElementById('roi-slider-passageiros') as HTMLInputElement | null;
    const ticketSlider = document.getElementById('roi-slider-ticket') as HTMLInputElement | null;
    const passageirosDisplay = document.getElementById('roi-passageiros-display');
    const ticketDisplay = document.getElementById('roi-ticket-display');
    const prejuizosVal = document.getElementById('roi-prejuizos-val');
    const recompraVal = document.getElementById('roi-recompra-val');
    const multiplicadorVal = document.getElementById('roi-multiplicador-val');

    const atualizarROI = () => {
      if (!passageirosSlider || !ticketSlider) return;
      const passageiros = parseInt(passageirosSlider.value, 10);
      const ticket = parseInt(ticketSlider.value, 10);

      if (passageirosDisplay) passageirosDisplay.textContent = `${passageiros} passageiros`;
      if (ticketDisplay) ticketDisplay.textContent = `R$ ${ticket.toLocaleString('pt-BR')}`;

      // Prejuízos evitados: cerca de 1 falha grave evitada a cada 30 passageiros
      const falhasEvitadas = Math.max(1, Math.round((passageiros / 30) * 10) / 10);
      const prejuizoTotal = Math.round(falhasEvitadas * (ticket * 0.7));

      // Recompra Next Trip: cerca de 10% da base reativada no mês com novas viagens
      const recompras = Math.max(1, Math.round(passageiros * 0.1));
      const recompraTotal = recompras * ticket;

      const retornoTotal = prejuizoTotal + recompraTotal;
      const mensalidade = 799;
      const multiplicador = Math.max(2, Math.round(retornoTotal / mensalidade));

      if (prejuizosVal) prejuizosVal.textContent = `R$ ${prejuizoTotal.toLocaleString('pt-BR')}`;
      if (recompraVal) recompraVal.textContent = `+ R$ ${recompraTotal.toLocaleString('pt-BR')}`;
      if (multiplicadorVal) multiplicadorVal.textContent = `~${multiplicador}x`;
    };

    passageirosSlider?.addEventListener('input', atualizarROI);
    ticketSlider?.addEventListener('input', atualizarROI);
    atualizarROI();

    // Comportamento do Sticky Bar ao Rolar a Página (Apenas Desktop)
    const isDesktop = window.innerWidth > 768;
    const stickyBar = document.getElementById('sticky-cta-bar');
    if (stickyBar && isDesktop) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 450) {
          stickyBar.classList.remove('translate-y-full');
        } else {
          stickyBar.classList.add('translate-y-full');
        }
      }, { passive: true });
    }

    const tabs = ['dashboard', 'risk', 'nexttrip', 'studio', 'viagens', 'orcamentos', 'inbox', 'escala', 'reembolsos', 'relatorios', 'publicas'];
    const pathTexts: Record<string, string> = {
      dashboard: 'PaxFlow - Painel de Controle',
      risk: 'PaxFlow - Risk Score™ (Diagnóstico de Saúde Operacional)',
      nexttrip: 'PaxFlow - Next Trip Engine™ (Motor Preditivo de Recompra)',
      studio: 'PaxFlow Studio™ - Propostas de Luxo & Live Preview',
      viagens: 'PaxFlow - Operação de Viagens',
      orcamentos: 'PaxFlow - Funil de Orçamentos & Upsell',
      inbox: 'PaxFlow - Central de Mensagens e Decisões',
      escala: 'PaxFlow - Controle de Escala da Equipe',
      reembolsos: 'PaxFlow - Gestão de Reembolsos',
      relatorios: 'PaxFlow - Relatórios Gerenciais & Financeiros',
      publicas: 'PaxFlow - Itinerário Digital do Passageiro'
    };

    const baseTab = "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 text-slate-200 border border-slate-700 hover:text-white hover:bg-slate-700 transition shadow-sm";
    const activeMap: Record<string, string> = {
      dashboard: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#0052d4] to-[#00a8f5] text-white shadow-lg pf-glow",
      risk: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-lg pf-glow",
      nexttrip: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-[#00a8f5] text-white shadow-lg pf-glow",
      studio: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-lg pf-glow",
      viagens: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#00a8f5] to-cyan-500 text-white shadow-lg",
      orcamentos: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#00e5a3] to-teal-400 text-slate-950 font-black shadow-lg",
      inbox: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#f12711] to-[#f5af19] text-white shadow-lg",
      escala: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg",
      reembolsos: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#f5af19] to-amber-500 text-slate-950 font-black shadow-lg",
      relatorios: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-indigo-600 to-[#00a8f5] text-white shadow-lg",
      publicas: "shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-500 text-white shadow-lg"
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

    if (isDesktop && 'IntersectionObserver' in window) {
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
      if (autoTabTimer || !isDesktop) return;
      const timer = () => {
        autoTabTimer = window.setTimeout(() => {
          if (isMockupVisible) {
            currentTabIndex = (currentTabIndex + 1) % tabs.length;
            switchTab(tabs[currentTabIndex]);
          }
          autoTabTimer = null;
          timer();
        }, 3600 + Math.random() * 1800);
      };
      timer();
    };
    if (isDesktop) startAutoRotate();

    // Brand carousel
    const brandTabs = ['itinerario', 'voucher', 'nps', 'whatsapp'];
    const brandTitles: Record<string, string> = {
      itinerario: '01. Itinerário Digital no Celular',
      voucher: '02. Voucher Oficial em PDF com Logomarca',
      nps: '03. Pesquisa NPS da Sua Marca',
      whatsapp: '04. Notificações WhatsApp com Assinatura'
    };
    const brandBase = "w-full p-4 rounded-2xl text-left transition-all duration-200 flex items-start gap-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm";
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

    if (isDesktop) {
      brandAutoTimer = setInterval(() => {
        if (isBrandVisible) {
          brandTabIndex = (brandTabIndex + 1) % brandTabs.length;
          switchBrandTab(brandTabs[brandTabIndex]);
        }
      }, 3400);
    }
  }
}
