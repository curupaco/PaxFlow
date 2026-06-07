import './index.css';
import { getSessaoAtual, supabase } from './services/supabase';
import { InboxPage } from './pages/Inbox';
import { Dashboard } from './pages/Dashboard';
import { ComercialDashboard } from './pages/ComercialDashboard';
import { OrcamentosPage } from './pages/Orcamentos';
import { ClientesPage } from './pages/Clientes';
import { ReembolsosPage } from './pages/Reembolsos';
import { ConfiguracoesPage } from './pages/Configuracoes';
import { LoginPage } from './pages/Login';
import { MeuPerfilModal } from './components/profile/MeuPerfilModal';
import { PerfilConsultor } from './types';
import { getAvatarSvg } from './services/avatars';
import { showCustomAlert } from './services/dialog';
import { obterProgressoNivel } from './services/gamification';

class App {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private currentActivePage: string = 'analytics';
  private currentPageInstance: any = null;
  private theme: 'light' | 'dark' = 'light';
  private sidebarCollapsed: boolean = false;
  private mobileMenuOpen: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.sidebarCollapsed = localStorage.getItem('paxflow-sidebar-collapsed') === 'true';
    
    // Delegação global de eventos para alternância de tema
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('#theme-toggle-btn');
      if (btn) {
        e.preventDefault();
        this.toggleTheme();
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
    this.renderLoading();

    try {
      const { user, perfil, error } = await getSessaoAtual();

      if (error || !user) {
        this.renderLogin();
      } else {
        this.user = user;
        this.perfil = perfil;
        this.renderAppShell();
        this.inicializarRealtimeProfile();
        this.navigate(this.currentActivePage);
      }
    } catch (err) {
      console.error('Erro ao inicializar app:', err);
      this.renderLogin();
    }
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
  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
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
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${message}`;

    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      }
    }, 3500);
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
        this.navigate('inbox');
      },
      showToast: (message, type) => this.showToast(message, type)
    });
    loginPage.init();
  }

  /**
   * Renderiza a estrutura da barra de navegação principal (Sidebar)
   */
  private renderAppShell(): void {
    this.container.innerHTML = `
      <div class="min-h-screen flex flex-col md:flex-row bg-slate-50/50 dark:bg-slate-950 transition-colors duration-200">
        
        <!-- Mobile Top Bar (Header) -->
        <header class="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-colors duration-200">
          <div class="flex items-center gap-3">
            <button id="mobile-menu-toggle-btn" class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 transition focus:outline-none" title="Menu">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div class="flex items-center gap-2">
              <img src="/logo.svg" alt="PaxFlow Logo" class="h-8 w-8 object-contain filter drop-shadow-sm shrink-0" />
              <span class="text-sm font-black text-slate-850 dark:text-white tracking-tight">PaxFlow</span>
            </div>
          </div>
          
          <div class="flex items-center gap-2.5">
            <!-- Theme Toggle on Mobile -->
            <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-650 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
              <svg width="18" height="18" class="w-4.5 h-4.5 theme-icon-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg width="18" height="18" class="w-4.5 h-4.5 theme-icon-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <!-- User Avatar on Mobile -->
            <button id="mobile-profile-trigger" class="p-0.5 rounded-full border border-slate-200 dark:border-slate-750 transition focus:outline-none">
              ${this.perfil ? getAvatarSvg(this.perfil.avatar_url, this.perfil.nome || 'Consultor', 'w-8 h-8') : ''}
            </button>
          </div>
        </header>

        <!-- Backdrop Mobile Menu -->
        <div id="mobile-menu-backdrop" class="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity duration-300 opacity-0 pointer-events-none md:hidden"></div>
        
        <!-- Sidebar Menu (Drawer on mobile, permanent sidebar on desktop) -->
        <aside id="app-sidebar" class="fixed md:static inset-y-0 left-0 w-64 md:${this.sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex flex-col border-r border-slate-200 dark:border-slate-800/60 shadow-2xl md:shadow-xl z-50 md:z-20 transition-all duration-300 transform -translate-x-full md:translate-x-0">
          
          <!-- Logo & Título -->
          <div id="sidebar-header" class="border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5 relative transition-all duration-200 ${this.sidebarCollapsed ? 'p-5 justify-center' : 'p-6'}">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-10 object-contain filter drop-shadow-md shrink-0" />
            <span id="sidebar-logo-text" class="text-base font-black text-slate-800 dark:text-white tracking-tight ${this.sidebarCollapsed ? 'md:hidden' : ''}">PaxFlow</span>
            <button id="sidebar-collapse-btn" class="absolute top-1/2 -translate-y-1/2 right-[-14px] p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-455 hover:text-slate-650 dark:text-slate-400 dark:hover:text-slate-200 shadow-md hidden md:flex items-center justify-center transition z-30">
              <svg width="16" height="16" class="w-4 h-4 transform ${this.sidebarCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <!-- Links de Navegação -->
          <nav class="flex-1 p-4 space-y-2 flex flex-col justify-between">
            <div class="space-y-1.5">

              <!-- Link: Dashboard Comercial -->
              <button id="nav-analytics" class="w-full px-4 py-3 rounded-xl flex items-center justify-center ${this.sidebarCollapsed ? '' : 'md:justify-start'} gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Dashboard</span>
              </button>
              
              <!-- Link: Inbox de Alertas -->
              <button id="nav-inbox" class="w-full px-4 py-3 rounded-xl flex items-center justify-center ${this.sidebarCollapsed ? '' : 'md:justify-start'} gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-555 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Inbox de Alertas</span>
              </button>

              <!-- Link: Kanban de Orçamentos -->
              <button id="nav-orcamentos" class="w-full px-4 py-3 rounded-xl flex items-center justify-center ${this.sidebarCollapsed ? '' : 'md:justify-start'} gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Orçamentos em Aberto</span>
              </button>

              <!-- Link: Dashboard Kanban -->
              <button id="nav-dashboard" class="w-full px-4 py-3 rounded-xl flex items-center justify-center ${this.sidebarCollapsed ? '' : 'md:justify-start'} gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Kanban Operacional</span>
              </button>

              <!-- Link: Clientes -->
              <button id="nav-clientes" class="w-full px-4 py-3 rounded-xl flex items-center justify-center ${this.sidebarCollapsed ? '' : 'md:justify-start'} gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Ficha de Clientes</span>
              </button>

              <!-- Link: Reembolsos -->
              <button id="nav-reembolsos" class="w-full px-4 py-3 rounded-xl flex items-center justify-center ${this.sidebarCollapsed ? '' : 'md:justify-start'} gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Central de Reembolsos</span>
              </button>

              <!-- Link: Configurações (Somente ADMIN) -->
              ${this.perfil?.role === 'admin' ? `
                <button id="nav-configuracoes" class="w-full px-4 py-3 rounded-xl flex items-center justify-center ${this.sidebarCollapsed ? '' : 'md:justify-start'} gap-3 font-semibold text-xs text-left transition select-none group">
                  <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="${this.sidebarCollapsed ? 'md:hidden' : ''}">Configurações Admin</span>
                </button>
              ` : ''}

            </div>

            <!-- Identidade no rodapé da Sidebar (Tornada Clicável) -->
            <div id="sidebar-profile-footer-container" class="mt-4">
              <!-- Renderizado dinamicamente por atualizarSidebarProfileFooter -->
            </div>
          </nav>
        </aside>

        <!-- Área Principal de Exibição de Conteúdo -->
        <div id="page-content" class="flex-1 flex flex-col overflow-hidden min-w-0 bg-slate-50/50 dark:bg-slate-950">
          <!-- Injetado dinamicamente via router -->
        </div>

      </div>
    `;

    this.atualizarSidebarProfileFooter();
    this.setupNavigationListeners();

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
        <button id="sidebar-profile-trigger" class="w-full border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-center ${this.sidebarCollapsed ? '' : 'md:justify-start md:px-2'} gap-3 hover:bg-slate-100 dark:hover:bg-slate-800/40 p-1.5 rounded-xl transition duration-200 focus:outline-none">
          <div class="relative shrink-0 flex items-center justify-center w-11 h-11">
            <svg class="absolute inset-0 w-11 h-11 transform -rotate-90 select-none pointer-events-none" viewBox="0 0 36 36">
              <path class="text-slate-200 dark:text-slate-800" stroke-width="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="text-indigo-600 dark:text-indigo-500 transition-all duration-500 ease-out" stroke-dasharray="${progress.percent}, 100" stroke-width="2.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            ${getAvatarSvg(this.perfil.avatar_url, this.perfil.nome || 'Consultor', 'w-8 h-8 relative z-10')}
            <span class="absolute -bottom-1 -right-1 bg-indigo-600 dark:bg-indigo-500 text-white font-black text-[8px] px-1 py-0.5 rounded-full z-20 shadow-md ring-1 ring-white dark:ring-slate-900 leading-none flex items-center justify-center min-w-[14px] h-[14px]">
              ${progress.nivel}
            </span>
          </div>
          <div id="sidebar-profile-text" class="overflow-hidden flex-1 select-none text-left ${this.sidebarCollapsed ? 'md:hidden' : ''}">
            <span class="block text-[11px] font-extrabold text-slate-700 dark:text-white truncate">${this.perfil.nome || 'Consultor'}</span>
            <span class="block text-[9px] text-slate-455 dark:text-slate-500 font-semibold truncate capitalize leading-tight">${this.perfil.role || 'consultor'}</span>
            <span class="block text-[9px] text-indigo-600 dark:text-indigo-400 font-black truncate mt-0.5 leading-none">${progress.patenteEmoji} ${progress.patente}</span>
          </div>
        </button>
      `;

      document.getElementById('sidebar-profile-trigger')?.addEventListener('click', () => {
        this.abrirModalMeuPerfil();
        this.toggleMobileMenu(false);
      });
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
   * Assina escutas em tempo real no Supabase para atualizar o perfil e disparar celebrações
   */
  private inicializarRealtimeProfile(): void {
    if (!this.perfil) return;

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
            import('./utils/celebrations').then(({ showLevelUpModal }) => {
              const prog = obterProgressoNivel(newXp);
              showLevelUpModal(newLevel, prog.patente, prog.patenteEmoji);
            });
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
    if (this.sidebarCollapsed) {
      aside.classList.remove('md:w-64');
      aside.classList.add('md:w-20');
      chevron?.classList.add('rotate-180');
      if (header) {
        header.classList.remove('p-6');
        header.classList.add('p-5', 'justify-center');
      }
    } else {
      aside.classList.remove('md:w-20');
      aside.classList.add('md:w-64');
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
          btn.classList.remove('md:justify-start', 'md:px-2');
          btn.classList.add('justify-center');
        } else {
          btn.classList.remove('justify-center');
          btn.classList.add('md:justify-start', 'md:px-2');
        }
      } else {
        if (this.sidebarCollapsed) {
          btn.classList.remove('md:justify-start');
          btn.classList.add('justify-center');
        } else {
          btn.classList.remove('justify-center');
          btn.classList.add('md:justify-start');
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
    const pages = ['analytics', 'inbox', 'orcamentos', 'dashboard', 'clientes', 'reembolsos', 'configuracoes'];

    pages.forEach(page => {
      const btn = document.getElementById(`nav-${page}`);
      btn?.addEventListener('click', () => {
        this.navigate(page);
        this.toggleMobileMenu(false);
      });
    });
  }

  /**
   * Gerencia a navegação e o roteamento entre as diferentes páginas
   */
  private navigate(page: string, extraId?: string): void {
    // 1. Limpa instâncias ou temporizadores ativos na página que está saindo
    if (this.currentPageInstance && typeof this.currentPageInstance.destroy === 'function') {
      this.currentPageInstance.destroy();
    }
    this.currentPageInstance = null;

    this.currentActivePage = page;
    const pageContentEl = document.getElementById('page-content');
    if (!pageContentEl) return;

    // Garante que o container é relativo para posicionar o overlay absolutamente
    pageContentEl.classList.add('relative');

    // Injeta a animação de carregamento glassmorphic sem remover o conteúdo antigo da tela anterior
    let overlay = document.getElementById('paxflow-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'paxflow-loading-overlay';
      overlay.className = 'absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-sm z-40 flex flex-col items-center justify-center space-y-3 pointer-events-none animate-fade-in';
      overlay.innerHTML = `
        <div class="w-10 h-10 border-3 border-indigo-650 dark:border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-xs font-bold text-slate-650 dark:text-slate-300 animate-pulse uppercase tracking-wider">Carregando dados...</span>
      `;
      pageContentEl.appendChild(overlay);
    }

    // 2. Atualiza os estilos de botões ativos na Sidebar
    const navButtons = ['analytics', 'inbox', 'orcamentos', 'dashboard', 'clientes', 'reembolsos', 'configuracoes'];
    navButtons.forEach(p => {
      const btn = document.getElementById(`nav-${p}`);
      if (btn) {
        const alignmentClass = this.sidebarCollapsed ? 'justify-center' : 'md:justify-start';
        if (p === page) {
          btn.className = `w-full px-4 py-3 rounded-xl flex items-center ${alignmentClass} gap-3 font-extrabold text-xs text-left transition select-none bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 group`;
        } else {
          btn.className = `w-full px-4 py-3 rounded-xl flex items-center ${alignmentClass} gap-3 font-semibold text-xs text-left transition select-none text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/40 group`;
        }
      }
    });

    // 3. Instancia e inicializa o componente da respectiva tela
    switch (page) {
      case 'analytics':
        this.currentPageInstance = new ComercialDashboard(pageContentEl);
        break;
      case 'inbox':
        this.currentPageInstance = new InboxPage(pageContentEl);
        break;
      case 'dashboard':
        this.currentPageInstance = new Dashboard(pageContentEl);
        break;
      case 'orcamentos':
        this.currentPageInstance = new OrcamentosPage(pageContentEl);
        break;
      case 'clientes':
        this.currentPageInstance = new ClientesPage(pageContentEl);
        break;
      case 'reembolsos':
        this.currentPageInstance = new ReembolsosPage(pageContentEl);
        break;
      case 'configuracoes':
        this.currentPageInstance = new ConfiguracoesPage(pageContentEl);
        break;
      default:
        this.currentPageInstance = new InboxPage(pageContentEl);
    }

    if (this.currentPageInstance) {
      this.currentPageInstance.init(extraId);
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
