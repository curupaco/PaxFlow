import './index.css';
import { getSessaoAtual, supabase, logoutConsultor } from './services/supabase';
import { LoginPage } from './pages/Login';
import { MeuPerfilModal } from './components/profile/MeuPerfilModal';
import { PerfilConsultor } from './types';
import { getAvatarSvg } from './services/avatars';
import { showCustomAlert, showCustomConfirm } from './services/dialog';
import { obterProgressoNivel, obterCampanhasAtivas, obterProgressoCampanha, concederMedalha, obterMedalhasUsuario, BADGE_DEFINITIONS } from './services/gamification';
import { showBadgeCelebrationModal, showLevelUpModal } from './utils/celebrations';
import { traduzirErro } from './utils/errorTranslator';
import { Router } from './router';
import { LandingPage } from './pages/LandingPage';
import { GlobalHeaderSearch } from './components/GlobalHeaderSearch';
import { RealtimeMessagingService } from './services/realtimeMessaging';
import { VersionChecker } from './services/versionChecker';
import { VersionToast } from './components/VersionToast';

import { PushNotificationService } from './services/pushNotificationService';

(window as any).traduzirErro = traduzirErro;

// Inicializa mecanismo anti-cache e detector de novas versões
VersionChecker.getInstance().init();
VersionToast.init();

class App {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private router!: Router;
  private theme: 'light' | 'dark' = 'light';
  private sidebarCollapsed: boolean = false;
  private mobileMenuOpen: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.sidebarCollapsed = localStorage.getItem('paxflow-sidebar-collapsed') === 'true';
    
    // Delegação global de eventos (alternância de tema e atalhos de ajuda)
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      
      const themeBtn = target.closest('#theme-toggle-btn');
      if (themeBtn) {
        e.preventDefault();
        this.toggleTheme();
        return;
      }

      const helpShortcut = target.closest('.help-shortcut');
      if (helpShortcut) {
        e.preventDefault();
        const helpId = helpShortcut.getAttribute('data-help-id');
        if (helpId) {
          const { HelpModal } = await import('./components/help/HelpModal');
          HelpModal.open(helpId);
        }
      }
    });

    // Ouvinte para reatividade do perfil atualizado
    window.addEventListener('paxflow-profile-updated', (e: any) => {
      const { nome, avatar_url } = e.detail;
      if (this.perfil) {
        this.perfil.nome = nome;
        this.perfil.avatar_url = avatar_url;
      }
      this.atualizarSidebarProfileFooter();
    });

    // Ouvinte para reatividade do inbox atualizado
    window.addEventListener('paxflow-inbox-updated', () => {
      this.atualizarInboxBadge();
    });

    // Ouvinte para navegação global com suporte a parâmetros (deep linking)
    window.addEventListener('paxflow-navigate', (e: any) => {
      const { page, extraId } = e.detail;
      this.navigate(page, extraId);
    });
  }

  /**
   * Inicializa o aplicativo verificando a sessão ativa
   */
  public async init(): Promise<void> {
    this.applyInitialTheme();

    // Detecção de rotas
    const path = window.location.pathname;
    const isLoginRoute = path.includes('/login') || window.location.search.includes('login') || window.location.hash.includes('login');
    const isConhecaOldRoute =
      path.includes('/conheca/old') ||
      window.location.search.includes('conheca/old') ||
      window.location.hash.includes('conheca/old');

    // Detecção de rotas públicas (Itinerário e NPS/Feedback)
    const isPublicItineraryRoute = window.location.hash.includes('itinerario');
    const isPublicFeedbackRoute = window.location.hash.includes('feedback') || window.location.hash.includes('nps');

    if (isPublicItineraryRoute || isPublicFeedbackRoute) {
      try {
        const { PublicViews } = await import('./pages/PublicViews');
        const views = new PublicViews(this.container);
        
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(hash.indexOf('?')));
        const viagemId = params.get('id');

        if (!viagemId) {
          this.container.innerHTML = `
            <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center">
              <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
                <span class="text-3xl">⚠️</span>
                <h3 class="text-md font-extrabold text-slate-800 dark:text-slate-200 mt-3">Código de viagem ausente na URL.</h3>
              </div>
            </div>
          `;
          return;
        }

        if (isPublicItineraryRoute) {
          await views.initItinerario(viagemId);
        } else {
          await views.initNps(viagemId);
        }
        return;
      } catch (err: any) {
        console.error('Erro ao inicializar rota pública:', err);
        this.container.innerHTML = `<div class="p-6 text-center text-rose-500">Erro ao carregar a página: ${err.message}</div>`;
        return;
      }
    }

    if (sessionStorage.getItem('paxflowSandbox') === 'true') {
      (window as any).paxflowSandbox = true;
      // Garante o comportamento 'reiniciou, perdeu': limpa as chaves temporárias do localStorage para carregar os dados novos do mock
      Object.keys(localStorage).forEach(key => {
        if ((key.startsWith('sandbox-') || key.startsWith('paxflow-')) && key !== 'theme' && key !== 'paxflow-sidebar-collapsed') {
          localStorage.removeItem(key);
        }
      });
    }

    const isSandbox = (window as any).paxflowSandbox === true;

    const isConhecaRoute =
      !isSandbox && (
        path.includes('/conheca') ||
        path.includes('/landing') ||
        window.location.search.includes('conheca') ||
        window.location.search.includes('landing') ||
        window.location.hash.includes('conheca') ||
        window.location.hash.includes('landing')
      );

    // Se o usuário acessar explicitamente /conheca ou /landing (e não estiver em modo demo), exibe a Landing Page comercial
    if (isConhecaRoute) {
      this.renderLandingPage();
      return;
    }

    // Se o visitante não possui token de autenticação no localStorage (e não está no modo demo/sandbox) e não está acessando /login,
    // renderiza a Landing Page interativa imediatamente
    const hasAuthToken = isSandbox || Object.keys(localStorage).some(k => k.includes('sb-') && k.includes('-auth-token'));
    if (!hasAuthToken && !isLoginRoute) {
      this.renderLandingPage();
      return;
    }

    try {
      const { user, perfil, error } = await getSessaoAtual();

      if (error || !user) {
        if (isLoginRoute) {
          this.renderLogin();
        } else {
          this.renderLandingPage();
        }
      } else {
        this.user = user;
        this.perfil = perfil;
        this.renderAppShell();
        this.inicializarRealtimeProfile();
        this.router = new Router(document.getElementById('page-content')!);
        const defaultPage = (this.perfil && this.perfil.role === 'admin') ? 'analytics' : 'inbox';
        this.navigate(defaultPage);
        this.checarNotificacoesCampanhaLogin();
        PushNotificationService.checkAndPromptAutoPermission(user.id);
      }
    } catch (err) {
      console.error('Erro ao inicializar app:', err);
      if (isLoginRoute) {
        this.renderLogin();
      } else {
        this.renderLandingPage();
      }
    }
  }

  /**
   * Renderiza a Landing Page comercial
   */
  private renderLandingPage(): void {
    const page = new LandingPage(this.container);
    page.init();

    // Escuta transição para o Modo Sandbox
    window.addEventListener('paxflow-navigate-to-demo', () => {
      if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }, { once: true });
  }

  /**
   * Verifica e aplica o tema inicial (salvo no localStorage ou preferência do SO)
   */
  private applyInitialTheme(): void {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      this.theme = savedTheme;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.theme = prefersDark ? 'dark' : 'light';
    }
    this.updateDOMTheme();
  }

  /**
   * Atualiza a classe dark no elemento raiz do documento
   */
  private updateDOMTheme(): void {
    if (this.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  /**
   * Alterna o tema de forma interativa com toast de confirmação
   */
  private toggleTheme(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.theme);
    this.updateDOMTheme();
    this.showToast(`Modo ${this.theme === 'dark' ? 'Escuro' : 'Claro'} ativado!`, 'success');
  }

  /**
   * Exibe mensagens flutuantes (Toasts) globais do app
   */
  private showToast(message: string, type: 'success' | 'error' = 'success', err?: any): void {
    let finalMessage = message;
    if (err) {
      const translated = traduzirErro(err);
      if (translated && !message.includes(translated)) {
        finalMessage = `${message} Detalhes: ${translated}`;
      }
    }
    const translatedMessage = traduzirErro(finalMessage);
    const toastId = 'paxflow-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
    }`;
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${translatedMessage}`;

    const duration = isSuccess ? 3500 : 5500;
    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      }
    }, duration);
  }

  /**
   * Exibe tela de carregamento geral
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4 transition-colors duration-200">
        <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 dark:text-slate-400 font-semibold animate-pulse">Inicializando PaxFlow...</p>
      </div>
    `;
  }

  /**
   * Renderiza a tela de login premium com recuperação de senha
   */
  private renderLogin(): void {
    const loginPage = new LoginPage(this.container, {
      onLoginSuccess: (user, perfil) => {
        this.user = user;
        this.perfil = perfil;
        this.renderAppShell();
        this.router = new Router(document.getElementById('page-content')!);
        const defaultPage = (perfil && perfil.role === 'admin') ? 'analytics' : 'inbox';
        this.navigate(defaultPage);
      },
      showToast: (message, type) => this.showToast(message, type)
    });
    loginPage.init();
  }

  /**
   * Renderiza a estrutura da barra de navegação principal (Sidebar)
   */
  private renderAppShell(): void {
    const isSandbox = (window as any).paxflowSandbox;
    const bannerHtml = isSandbox ? `
      <div class="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 flex items-center justify-between text-xs font-black tracking-wide shadow-md z-50">
        <div class="flex items-center gap-2">
          <span>⚠️</span>
          <span>Você está no <strong>Modo de Demonstração (Dados Fictícios)</strong>. As alterações são temporárias e serão perdidas ao atualizar ou sair.</span>
        </div>
        <button id="btn-sair-demo-banner" class="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg font-black transition uppercase text-[10px] shrink-0">
          Sair da Demo
        </button>
      </div>
    ` : '';

    this.container.innerHTML = `
      ${bannerHtml}
      <div class="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col md:flex-row bg-slate-50/50 dark:bg-slate-950 transition-colors duration-200">
        
        <!-- Mobile Top Bar (Header com Suporte a Safe Area iOS) -->
        <header class="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 px-4 pt-safe pb-3 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-colors duration-200">
          <div class="flex items-center gap-3">
            <button id="mobile-menu-toggle-btn" class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition focus:outline-none" title="Menu">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div class="flex items-center gap-2">
              <img src="/logo.svg" alt="PaxFlow Logo" class="h-8 w-8 object-contain filter drop-shadow-sm shrink-0" />
              <span class="text-sm font-black text-slate-800 dark:text-white tracking-tight">PaxFlow</span>
            </div>
          </div>
          
          <div class="flex items-center gap-2.5">
            <!-- Theme Toggle on Mobile -->
            <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
              <svg width="18" height="18" class="w-4.5 h-4.5 theme-icon-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg width="18" height="18" class="w-4.5 h-4.5 theme-icon-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <!-- User Avatar on Mobile -->
            <button id="mobile-profile-trigger" class="p-0.5 rounded-full border border-slate-200 dark:border-slate-800 transition focus:outline-none">
              ${this.perfil ? getAvatarSvg(this.perfil.avatar_url, this.perfil.nome || 'Consultor', 'w-8 h-8') : ''}
            </button>
          </div>
        </header>

        <!-- Backdrop Mobile Menu -->
        <div id="mobile-menu-backdrop" class="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity duration-300 opacity-0 pointer-events-none md:hidden"></div>
        
        <!-- Sidebar Menu (Drawer no mobile, fixo na lateral no desktop) -->
        <aside id="app-sidebar" class="fixed inset-y-0 left-0 h-screen w-64 md:${this.sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex flex-col border-r border-slate-200 dark:border-slate-800/60 shadow-2xl md:shadow-xl z-50 md:z-30 transition-all duration-300 transform -translate-x-full md:translate-x-0 pt-safe pb-safe">
          
          <!-- Logo & Título -->
          <div id="sidebar-header" class="border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5 relative transition-all duration-200 ${this.sidebarCollapsed ? 'p-3.5 justify-center' : 'px-5 py-4'}">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-8 w-8 object-contain filter drop-shadow-md shrink-0" />
            <span id="sidebar-logo-text" class="text-base font-black text-slate-800 dark:text-white tracking-tight ${this.sidebarCollapsed ? 'md:hidden' : ''}">PaxFlow</span>
            <button id="sidebar-collapse-btn" class="absolute top-1/2 -translate-y-1/2 right-[-14px] p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 shadow-md hidden md:flex items-center justify-center transition z-30">
              <svg width="16" height="16" class="w-4 h-4 transform ${this.sidebarCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <!-- Links de Navegação -->
          <nav class="flex-1 ${this.sidebarCollapsed ? 'px-2 py-2' : 'py-2 px-3'} space-y-0.5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div class="space-y-0.5">

              <!-- Link: Dashboard Comercial -->
              <button id="nav-analytics" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group">
                <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Dashboard</span>
              </button>
              
              <!-- Link: Inbox de Alertas -->
              <button id="nav-inbox" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group relative">
                <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Inbox &amp; Escala</span>
                <span id="nav-inbox-badge" class="hidden"></span>
              </button>

              <!-- Link: Kanban de Orçamentos -->
              <button id="nav-orcamentos" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group">
                <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Orçamentos</span>
              </button>

              <!-- Link: Next Trip Engine -->
              <button id="nav-next-trip" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group">
                <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Next Trip Engine</span>
              </button>

              <!-- Link: Dashboard Kanban -->
              <button id="nav-dashboard" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group">
                <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Viagens</span>
              </button>

              <!-- Link: Clientes -->
              <button id="nav-clientes" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group">
                <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Clientes</span>
              </button>

              <!-- Link: Reembolsos -->
              <button id="nav-reembolsos" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group">
                <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Reembolsos</span>
              </button>

              <!-- Link: Relatórios -->
              <button id="nav-relatorios" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group">
                <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Relatórios</span>
              </button>

              <!-- Link: Cadastros (Somente ADMIN) -->
              ${this.perfil?.role === 'admin' ? `
                <button id="nav-cadastros" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group">
                  <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Cadastros</span>
                </button>
              ` : ''}

              <!-- Link: Configurações (Somente ADMIN) -->
              ${this.perfil?.role === 'admin' ? `
                <button id="nav-configuracoes" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none group">
                  <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Configurações</span>
                </button>
              ` : ''}

              <!-- Link: Central de Ajuda -->
              <button id="nav-ajuda" class="w-full px-3 py-1.5 rounded-xl flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 font-semibold text-xs text-left transition select-none text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/40 group">
                <svg width="18" height="18" class="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Central de Ajuda</span>
              </button>


            </div>

            <!-- Identidade no rodapé da Sidebar (Tornada Clicável) -->
            <div id="sidebar-profile-footer-container" class="mt-4">
              <!-- Renderizado dinamicamente por atualizarSidebarProfileFooter -->
            </div>
          </nav>
        </aside>

        <!-- Área Principal de Exibição de Conteúdo (Com Cabeçalho Global) -->
        <div id="app-main-content" class="flex-1 flex flex-col overflow-x-hidden min-w-0 max-w-full bg-slate-50/50 dark:bg-slate-950 ${this.sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} transition-all duration-300">
          <div id="global-header-mount" class="w-full max-w-full overflow-x-hidden"></div>
          <div id="page-content" class="flex-1 flex flex-col overflow-x-hidden min-w-0 max-w-full">
            <!-- Injetado dinamicamente via router -->
          </div>
        </div>

      </div>
    `;

    const headerMount = document.getElementById('global-header-mount');
    if (headerMount) {
      GlobalHeaderSearch.init(headerMount);
    }

    this.atualizarSidebarProfileFooter();
    this.setupNavigationListeners();
    this.atualizarInboxBadge();

    // Event listener para sair do modo Sandbox no banner
    document.getElementById('btn-sair-demo-banner')?.addEventListener('click', async () => {
      const confirmResult = await showCustomConfirm('Deseja realmente sair da demonstração?', 'Encerrar Demonstração');
      if (confirmResult) {
        (window as any).paxflowSandbox = false;
        sessionStorage.removeItem('paxflowSandbox');
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sandbox-')) {
            localStorage.removeItem(key);
          }
        });
        window.location.href = '/conheca';
      }
    });

    // Event listener para colapsar barra lateral
    document.getElementById('sidebar-collapse-btn')?.addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Event listeners para o menu mobile
    document.getElementById('mobile-menu-toggle-btn')?.addEventListener('click', () => {
      this.toggleMobileMenu();
    });
    document.getElementById('mobile-menu-backdrop')?.addEventListener('click', () => {
      this.toggleMobileMenu(false);
    });
    document.getElementById('mobile-profile-trigger')?.addEventListener('click', () => {
      this.abrirModalMeuPerfil();
    });
  }

  /**
   * Controla a exibição do menu lateral móvel (drawer deslizante)
   */
  private toggleMobileMenu(open?: boolean): void {
    if (window.innerWidth >= 768) return;

    this.mobileMenuOpen = open !== undefined ? open : !this.mobileMenuOpen;
    
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    if (!sidebar || !backdrop) return;

    if (this.mobileMenuOpen) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      backdrop.classList.remove('opacity-0', 'pointer-events-none');
      backdrop.classList.add('opacity-100', 'pointer-events-auto');
    } else {
      sidebar.classList.remove('translate-x-0');
      sidebar.classList.add('-translate-x-full');
      backdrop.classList.remove('opacity-100', 'pointer-events-auto');
      backdrop.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  /**
   * Renderiza a identidade do consultor logado no rodapé da Sidebar
   */
  /**
   * Renderiza a identidade do consultor logado no rodapé da Sidebar com anel de XP e nível
   */
  private atualizarSidebarProfileFooter(): void {
    if (!this.perfil) return;

    const progress = obterProgressoNivel(this.perfil.xp || 0);
    const footerContainer = document.getElementById('sidebar-profile-footer-container');

    if (footerContainer) {
      footerContainer.innerHTML = `
        <div class="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 w-full">
          <button id="sidebar-profile-trigger" class="w-full flex items-center ${this.sidebarCollapsed ? 'justify-center' : 'justify-start px-2'} gap-3 hover:bg-slate-100 dark:hover:bg-slate-800/40 p-1 rounded-xl transition duration-200 focus:outline-none">
            <div class="relative shrink-0 flex items-center justify-center w-10 h-10">
              <svg class="absolute inset-0 w-10 h-10 transform -rotate-90 select-none pointer-events-none" viewBox="0 0 36 36">
                <path class="text-slate-200 dark:text-slate-800" stroke-width="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path class="text-indigo-600 dark:text-indigo-500 transition-all duration-500 ease-out" stroke-dasharray="${progress.percent}, 100" stroke-width="2.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              ${getAvatarSvg(this.perfil.avatar_url, this.perfil.nome || 'Consultor', 'w-7.5 h-7.5 relative z-10')}
              <span class="absolute -bottom-1 -right-1 bg-indigo-600 dark:bg-indigo-500 text-white font-black text-[8px] px-1 py-0.5 rounded-full z-20 shadow-md ring-1 ring-white dark:ring-slate-900 leading-none flex items-center justify-center min-w-[14px] h-[14px]">
                ${progress.nivel}
              </span>
            </div>
            <div id="sidebar-profile-text" class="overflow-hidden flex-1 select-none text-left ${this.sidebarCollapsed ? 'md:hidden' : ''}">
              <span class="block text-[11px] font-extrabold text-slate-700 dark:text-white truncate">${this.perfil.nome || 'Consultor'}</span>
              <span class="block text-[9px] text-slate-400 dark:text-slate-400 font-semibold truncate capitalize leading-tight">${this.perfil.role || 'consultor'}</span>
              <span class="block text-[9px] text-indigo-600 dark:text-indigo-400 font-black truncate mt-0.5 leading-none">${progress.patenteEmoji} ${progress.patente}</span>
            </div>
          </button>
          
          <!-- Campanhas Ativas -->
          <div id="sidebar-campaigns-container" class="w-full"></div>
          
          <div class="flex items-center justify-around gap-1.5 ${this.sidebarCollapsed ? 'flex-col mt-0.5 px-0' : 'flex-row px-2'}">
            <!-- Theme Toggle -->
            <button id="theme-toggle-btn" title="Alternar Tema" class="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/20 dark:border-slate-700/20 flex items-center justify-center w-full">
              <svg width="18" height="18" class="w-4.5 h-4.5 theme-icon-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg width="18" height="18" class="w-4.5 h-4.5 theme-icon-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <!-- Logout -->
            <button id="sidebar-logout-btn" title="Sair do Sistema" class="p-1.5 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800/60 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 rounded-xl transition border border-slate-200/20 dark:border-slate-700/20 flex items-center justify-center w-full">
              <svg width="18" height="18" class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      `;

      document.getElementById('sidebar-profile-trigger')?.addEventListener('click', () => {
        this.abrirModalMeuPerfil();
        this.toggleMobileMenu(false);
      });

      document.getElementById('sidebar-logout-btn')?.addEventListener('click', async () => {
        if ((window as any).paxflowSandbox) {
          const confirmResult = await showCustomConfirm('Deseja realmente sair da demonstração?', 'Encerrar Demonstração');
          if (confirmResult) {
            (window as any).paxflowSandbox = false;
            sessionStorage.removeItem('paxflowSandbox');
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sandbox-')) {
                localStorage.removeItem(key);
              }
            });
            window.location.href = '/conheca';
          }
          return;
        }
        const confirmResult = await showCustomConfirm('Deseja realmente sair do sistema?', 'Encerrar Sessão');
        if (confirmResult) {
          await logoutConsultor();
          window.location.reload();
        }
      });
      
      this.renderSidebarCampaigns();
    }

    const mobileProfileContainer = document.getElementById('mobile-profile-trigger');
    if (mobileProfileContainer) {
      mobileProfileContainer.innerHTML = `
        <div class="relative shrink-0 flex items-center justify-center w-10 h-10">
          <svg class="absolute inset-0 w-10 h-10 transform -rotate-90 select-none pointer-events-none" viewBox="0 0 36 36">
            <path class="text-slate-200 dark:text-slate-800" stroke-width="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="text-indigo-600 dark:text-indigo-500 transition-all duration-500 ease-out" stroke-dasharray="${progress.percent}, 100" stroke-width="2.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          ${getAvatarSvg(this.perfil.avatar_url, this.perfil.nome || 'Consultor', 'w-7 h-7 relative z-10')}
          <span class="absolute -bottom-1 -right-1 bg-indigo-600 dark:bg-indigo-500 text-white font-black text-[8px] px-1 py-0.5 rounded-full z-20 shadow-md ring-1 ring-white dark:ring-slate-900 leading-none flex items-center justify-center min-w-[13px] h-[13px]">
            ${progress.nivel}
          </span>
        </div>
      `;
    }
  }

  /**
   * Renderiza a listagem de campanhas ativas no rodapé da Sidebar com lógica de conclusão reativa
   */
  private async renderSidebarCampaigns(): Promise<void> {
    if (!this.user || !this.perfil) return;
    const container = document.getElementById('sidebar-campaigns-container');
    if (!container) return;

    try {
      const activeCampaigns = await obterCampanhasAtivas();
      if (activeCampaigns.length === 0) {
        container.innerHTML = '';
        return;
      }

      // Buscar medalhas conquistadas
      const medalhasConquistadas = await obterMedalhasUsuario(this.user.id);
      const medalhasSet = new Set(medalhasConquistadas);

      // Calcular o progresso
      const progresses = await Promise.all(activeCampaigns.map(cam => obterProgressoCampanha(this.user.id, cam)));

      // Validar conclusões de campanhas
      for (const prog of progresses) {
        if (prog.concluida && !medalhasSet.has(prog.campaign.badge_key)) {
          // Conceder medalha
          const concedeu = await concederMedalha(this.user.id, prog.campaign.badge_key);
          if (concedeu) {
            // Disparar popup e confetes
            const badgeObj = BADGE_DEFINITIONS.find(b => b.key === prog.campaign.badge_key);
            showBadgeCelebrationModal(
              badgeObj ? badgeObj.nome : prog.campaign.badge_key,
              badgeObj ? badgeObj.emoji : '🏆',
              prog.campaign.titulo
            );
            medalhasSet.add(prog.campaign.badge_key);
          }
        }
      }

      // Filtrar campanhas: ocultar as que já foram concluídas ou expiraram
      const hoje = new Date().toISOString().split('T')[0];
      const activeProgresses = progresses.filter(p => !medalhasSet.has(p.campaign.badge_key) && p.campaign.data_fim >= hoje);

      if (activeProgresses.length === 0) {
        container.innerHTML = '';
        return;
      }

      const isExpanded = localStorage.getItem('paxflow-campaigns-accordion-expanded') !== 'false';

      container.innerHTML = `
        <div class="border-t border-slate-100/50 dark:border-slate-800/50 pt-2.5 mt-1 text-left">
          <button id="btn-campaigns-accordion" class="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition duration-150 focus:outline-none select-none">
            <span class="text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 font-sans">
              🎯 Campanhas Ativas (${activeProgresses.length})
            </span>
            <svg id="arrow-campaigns-accordion" class="w-3.5 h-3.5 transition-transform duration-200 text-slate-400 ${isExpanded ? 'transform rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <div id="campaigns-accordion-content" class="mt-1.5 space-y-1.5 px-1.5 transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}">
            ${activeProgresses.map(p => {
              const badgeObj = BADGE_DEFINITIONS.find(b => b.key === p.campaign.badge_key);
              const badgeEmoji = badgeObj ? badgeObj.emoji : '🏆';
              
              let metaUnit = 'ações';
              if (p.campaign.tipo_meta === 'xp_acumulado') metaUnit = 'XP';
              else if (p.campaign.tipo_meta === 'cliente_criado') metaUnit = 'cli';
              else if (p.campaign.tipo_meta === 'orcamento_criado') metaUnit = 'orç';
              else if (p.campaign.tipo_meta === 'orcamento_andamento') metaUnit = 'and';
              else if (p.campaign.tipo_meta === 'venda_aceita' || p.campaign.tipo_meta === 'orcamento_fechado') metaUnit = 'fech';
              else if (p.campaign.tipo_meta === 'lembrete_criado') metaUnit = 'lembr';
              else if (p.campaign.tipo_meta === 'reembolso_pago') metaUnit = 'reemb';
              else if (p.campaign.tipo_meta === 'produto_detalhado') metaUnit = 'prod';

              return `
                <div class="flex flex-col gap-1 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 border border-slate-200/40 dark:border-slate-800/50 hover:border-indigo-500/30 transition duration-200 group relative">
                  <!-- Tooltip Card Flutuante no Hover -->
                  <div class="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 transform group-hover:translate-y-0 translate-y-1">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <span class="text-xs font-black text-indigo-400 flex items-center gap-1.5 truncate max-w-[190px]">
                        🎯 ${p.campaign.titulo}
                      </span>
                      <span class="text-xs shrink-0" title="${badgeObj ? badgeObj.nome : ''}">${badgeEmoji}</span>
                    </div>
                    
                    <p class="text-[11px] text-slate-300 font-medium leading-relaxed mb-2.5">
                      ${p.campaign.descricao || 'Sem descrição cadastrada.'}
                    </p>

                    <div class="space-y-1 text-[10px] text-slate-400 font-bold border-t border-slate-800/80 pt-2 flex flex-col">
                      <div class="flex justify-between">
                        <span>📅 Vigência:</span>
                        <span class="text-slate-200">${p.campaign.data_inicio.split('-').reverse().join('/')} até ${p.campaign.data_fim.split('-').reverse().join('/')}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>📊 Meta Atual:</span>
                        <span class="text-indigo-400 font-black">${p.progresso} / ${p.meta} ${metaUnit} (${Math.round(p.percent)}%)</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center justify-between gap-1.5">
                    <span class="text-[9px] font-black text-slate-700 dark:text-slate-300 truncate max-w-[125px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      ${p.campaign.titulo}
                    </span>
                    <span class="text-xs text-slate-400 dark:text-slate-400 font-bold shrink-0 leading-none" title="${badgeObj ? badgeObj.nome : ''}">
                      ${badgeEmoji}
                    </span>
                  </div>
                  
                  <!-- Progress Bar -->
                  <div class="flex items-center gap-2 mt-1">
                    <div class="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500 rounded-full transition-all duration-500" style="width: ${p.percent}%"></div>
                    </div>
                    <span class="text-[8px] text-indigo-600 dark:text-indigo-400 font-black shrink-0 whitespace-nowrap">
                      ${p.progresso}/${p.meta} <span class="text-[7px] text-slate-400 dark:text-slate-400 font-bold">${metaUnit}</span>
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Accordion click handler
      document.getElementById('btn-campaigns-accordion')?.addEventListener('click', () => {
        const content = document.getElementById('campaigns-accordion-content');
        const arrow = document.getElementById('arrow-campaigns-accordion');
        if (!content || !arrow) return;

        const expanded = content.classList.contains('max-h-[300px]');
        if (expanded) {
          content.classList.remove('max-h-[300px]', 'opacity-100');
          content.classList.add('max-h-0', 'opacity-0');
          arrow.classList.remove('transform', 'rotate-90');
          localStorage.setItem('paxflow-campaigns-accordion-expanded', 'false');
        } else {
          content.classList.remove('max-h-0', 'opacity-0');
          content.classList.add('max-h-[300px]', 'opacity-100');
          arrow.classList.add('transform', 'rotate-90');
          localStorage.setItem('paxflow-campaigns-accordion-expanded', 'true');
        }
      });

    } catch (err) {
      console.error('Erro ao renderizar campanhas na Sidebar:', err);
    }
  }

  /**
   * Verifica se existem notificações de novas campanhas não lidas no login e exibe toast explicativo
   */
  private async checarNotificacoesCampanhaLogin(): Promise<void> {
    if (!this.user) return;
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*, campaign:campaigns(*)')
        .eq('user_id', this.user.id)
        .eq('tipo_item', 'campanha')
        .eq('lida', false);

      if (error) throw error;
      if (data && data.length > 0) {
        // Mostrar toast para cada uma delas (com um pequeno delay entre elas se houver mais de uma)
        data.forEach((not: any, idx: number) => {
          if (not.campaign) {
            setTimeout(() => {
              this.showToast(`🎯 Nova Campanha Ativa: "${not.campaign.titulo}"!`, 'success');
            }, idx * 1000);
          }
        });

        // Marcar todas como lidas
        const notIds = data.map((n: any) => n.id);
        await supabase
          .from('notificacoes')
          .update({ lida: true })
          .in('id', notIds);

        // Atualizar contador do inbox e da sidebar
        this.atualizarInboxBadge();
        this.renderSidebarCampaigns();
      }
    } catch (err) {
      console.error('Erro ao checar notificações de campanha no login:', err);
    }
  }

  /**
   * Assina escutas em tempo real no Supabase para atualizar o perfil e disparar celebrações
   */
  private inicializarRealtimeProfile(): void {
    if (!this.perfil) return;

    // Inicializa o serviço de tempo real de mensagens e solicitações de escala
    RealtimeMessagingService.init(this.perfil.id, this.perfil.role);

    // Registra ouvinte global para toasts flutuantes de novas mensagens
    window.removeEventListener('paxflow:new-message', (this as any)._onNewMessageBound);
    (this as any)._onNewMessageBound = (e: CustomEvent) => {
      this.atualizarInboxBadge();
      const detail = e.detail;
      const title = detail?.table === 'escala_solicitacoes' 
        ? '📅 Solicitação de Escala Recebida' 
        : detail?.table === 'mensagens_diretas' 
        ? '💬 Nova Mensagem Direta' 
        : '🔔 Nova Notificação Recebida';
      this.showToast(`${title}!`, 'success');

      // Se permissão nativa estiver concedida, exibe pop-up nativo de Desktop (estilo Outlook/Slack/Gmail)
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification(title, {
            body: 'Você recebeu um novo item na sua Caixa de Entrada do PaxFlow.',
            icon: '/logo.svg'
          });
          n.onclick = () => {
            window.focus();
            this.navigate('inbox');
          };
        } catch (e) {}
      }
    };
    window.addEventListener('paxflow:new-message', (this as any)._onNewMessageBound);

    // Cancela qualquer inscrição anterior
    supabase.channel(`profile-realtime-${this.perfil.id}`).unsubscribe();

    supabase
      .channel(`profile-realtime-${this.perfil.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${this.perfil.id}`
        },
        (payload: any) => {
          const updated = payload.new;
          if (!updated) return;

          const oldLevel = this.perfil?.nivel || 1;
          const oldXp = this.perfil?.xp || 0;

          const newLevel = updated.nivel || 1;
          const newXp = updated.xp || 0;

          // Atualiza dados locais
          if (this.perfil) {
            this.perfil.xp = newXp;
            this.perfil.nivel = newLevel;
          }

          // Atualiza visualmente o rodapé e re-renderiza
          this.atualizarSidebarProfileFooter();

          // Checagem de Level Up ou XP recebido
          if (newLevel > oldLevel) {
            const prog = obterProgressoNivel(newXp);
            showLevelUpModal(newLevel, prog.patente, prog.patenteEmoji);
          } else if (newXp > oldXp) {
            this.showToast(`+${newXp - oldXp} XP recebido!`, 'success');
          }
        }
      )
      .subscribe();
  }

  /**
   * Colapsa ou expande a barra lateral com transições CSS suaves e controle reativo de elementos
   */
  private toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('paxflow-sidebar-collapsed', String(this.sidebarCollapsed));

    const aside = this.container.querySelector('aside');
    if (!aside) return;

    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const chevron = collapseBtn?.querySelector('svg');

    const header = document.getElementById('sidebar-header');
    const mainContent = document.getElementById('app-main-content');

    if (this.sidebarCollapsed) {
      aside.classList.remove('md:w-64');
      aside.classList.add('md:w-20');
      if (mainContent) {
        mainContent.classList.remove('md:pl-64');
        mainContent.classList.add('md:pl-20');
      }
      chevron?.classList.add('rotate-180');
      if (header) {
        header.classList.remove('p-6');
        header.classList.add('p-5', 'justify-center');
      }
    } else {
      aside.classList.remove('md:w-20');
      aside.classList.add('md:w-64');
      if (mainContent) {
        mainContent.classList.remove('md:pl-20');
        mainContent.classList.add('md:pl-64');
      }
      chevron?.classList.remove('rotate-180');
      if (header) {
        header.classList.remove('p-5', 'justify-center');
        header.classList.add('p-6');
      }
    }

    // Ocultar/Exibir textos do menu lateral
    const textLabels = aside.querySelectorAll('#sidebar-logo-text, nav button:not(#sidebar-profile-trigger) > span, #sidebar-profile-text');
    textLabels.forEach(el => {
      if (this.sidebarCollapsed) {
        el.classList.add('md:hidden');
      } else {
        el.classList.remove('md:hidden');
      }
    });

    // Ajustar alinhamento dos botões de navegação
    const navButtons = aside.querySelectorAll('nav button');
    navButtons.forEach(btn => {
      if (btn.id === 'sidebar-profile-trigger') {
        if (this.sidebarCollapsed) {
          btn.classList.remove('justify-start', 'px-2');
          btn.classList.add('justify-center');
        } else {
          btn.classList.remove('justify-center');
          btn.classList.add('justify-start', 'px-2');
        }
      } else {
        if (this.sidebarCollapsed) {
          btn.classList.remove('justify-start');
          btn.classList.add('justify-center');
        } else {
          btn.classList.remove('justify-center');
          btn.classList.add('justify-start');
        }
      }
    });
  }

  /**
   * Abre o modal premium de edição de perfil de consultor ("Meu Perfil")
   */
  private abrirModalMeuPerfil(): void {
    if (!this.perfil) return;
    MeuPerfilModal.open({
      perfil: this.perfil,
      onProfileUpdated: (nome, avatar_url) => {
        if (this.perfil) {
          this.perfil.nome = nome;
          this.perfil.avatar_url = avatar_url;
        }
        // Dispara evento para sincronizar todos os cabeçalhos das telas abertas
        window.dispatchEvent(new CustomEvent('paxflow-profile-updated', {
          detail: { nome, avatar_url }
        }));
      },
      showToast: (message, type) => this.showToast(message, type)
    });
  }

  /**
   * Associa eventos aos botões de navegação lateral
   */
  private setupNavigationListeners(): void {
    const pages = ['analytics', 'inbox', 'orcamentos', 'next-trip', 'dashboard', 'clientes', 'reembolsos', 'relatorios', 'cadastros', 'configuracoes'];

    pages.forEach(page => {
      const btn = document.getElementById(`nav-${page}`);
      btn?.addEventListener('click', () => {
        this.navigate(page);
        this.toggleMobileMenu(false);
      });
    });

    document.getElementById('nav-ajuda')?.addEventListener('click', async () => {
      const { HelpModal } = await import('./components/help/HelpModal');
      HelpModal.open();
      this.toggleMobileMenu(false);
    });

    // Suporte para rota por Hash (#next-trip, #orcamentos, etc)
    window.addEventListener('hashchange', () => {
      const hashRaw = window.location.hash.replace('#', '');
      const hashPage = hashRaw.split('?')[0];
      if (hashPage && pages.includes(hashPage)) {
        this.navigate(hashPage);
      }
    });

    // Suporte a disparos globais de navegação da SPA
    window.addEventListener('paxflow-navigate', (e: any) => {
      const page = e.detail?.page;
      if (page) {
        window.location.hash = `#${page}`;
        this.navigate(page, e.detail?.extraId);
      }
    });
  }

  /**
   * Gerencia a navegação e o roteamento entre as diferentes páginas
   */
  private navigate(page: string, extraId?: string): void {
    this.router.navigate(page, extraId);

    // Atualiza os estilos de botões ativos na Sidebar
    const navButtons = ['analytics', 'inbox', 'orcamentos', 'next-trip', 'dashboard', 'clientes', 'reembolsos', 'relatorios', 'cadastros', 'configuracoes', 'ajuda'];
    navButtons.forEach(p => {
      const btn = document.getElementById(`nav-${p}`);
      if (btn) {
        const alignmentClass = this.sidebarCollapsed ? 'justify-center' : 'justify-start';
        if (p === page) {
          btn.className = `w-full px-3 py-1.5 rounded-xl flex items-center ${alignmentClass} gap-2.5 font-extrabold text-xs text-left transition select-none bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 group`;
        } else {
          btn.className = `w-full px-3 py-1.5 rounded-xl flex items-center ${alignmentClass} gap-2.5 font-semibold text-xs text-left transition select-none text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/40 group`;
        }
      }
    });

    this.atualizarSidebarProfileFooter();
    this.atualizarInboxBadge();
  }

  /**
   * Busca e atualiza o badge de mensagens não lidas no menu lateral de forma assíncrona
   */
  private async atualizarInboxBadge(): Promise<void> {
    if (!this.user) return;
    try {
      const { InboxService } = await import('./services/inboxService');
      const alerts = await InboxService.loadAndBuildAlerts(this.user, this.perfil, 3);
      const readList = await InboxService.getReadAlerts(this.user.id);
      
      const currentPerfil = this.perfil;
      let filteredAlerts = alerts;
      if (currentPerfil && currentPerfil.role === 'admin') {
        filteredAlerts = alerts.filter(a => a.consultorId === currentPerfil.id || a.isReceivedByMe || a.isCreatedByMe);
      }
      
      const unreadCount = filteredAlerts.filter(a => !a.arquivado && !readList.includes(a.id) && !a.isSent).length;
      
      const badge = document.getElementById('nav-inbox-badge');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = String(unreadCount);
          badge.classList.remove('hidden');
          if (this.sidebarCollapsed) {
            badge.className = "absolute top-2.5 right-2.5 px-1 py-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-black bg-rose-500 text-white animate-pulse";
          } else {
            badge.className = "ml-auto px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse";
          }
        } else {
          badge.classList.add('hidden');
          badge.textContent = '';
        }
      }
    } catch (err) {
      console.warn('Erro ao atualizar badge do inbox:', err);
    }
  }
}

// Inicia a SPA assim que o DOM estiver carregado
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const rootEl = document.getElementById('app');
    if (rootEl) {
      const app = new App(rootEl);
      app.init();
    }
  });
}
