import { getSessaoAtual, loginConsultor } from './services/supabase';
import { Dashboard } from './pages/Dashboard';
import { ClientesPage } from './pages/Clientes';
import { ReembolsosPage } from './pages/Reembolsos';
import { ConfiguracoesPage } from './pages/Configuracoes';
import { PerfilConsultor } from './types';

class App {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private currentActivePage: string = 'dashboard';
  private currentPageInstance: any = null;
  private theme: 'light' | 'dark' = 'light';

  constructor(container: HTMLElement) {
    this.container = container;
    
    // Delegação global de eventos para alternância de tema
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('#theme-toggle-btn');
      if (btn) {
        e.preventDefault();
        this.toggleTheme();
      }
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
        <p class="text-slate-500 dark:text-slate-400 font-semibold animate-pulse">Inicializando PaxFlow CRM...</p>
      </div>
    `;
  }

  /**
   * Renderiza a tela de login premium
   */
  private renderLogin(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-indigo-950/20 transition-colors duration-200">
        <div class="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col gap-6 relative overflow-hidden transition-all">
          
          <!-- Detalhe decorativo de gradiente no topo -->
          <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

          <!-- Cabeçalho de Identidade -->
          <div class="text-center flex flex-col items-center">
            <img src="/logo.png" alt="PaxFlow Logo" class="h-16 w-16 object-contain mb-4 filter drop-shadow-xl" />
            <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Entrar no PaxFlow</h2>
            <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1.5">Painel de CRM & Gestão de Pós-Venda</p>
          </div>

          <div id="login-error-container" class="hidden px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/50">
            <!-- Erro de login -->
          </div>

          <!-- Formulário -->
          <form id="form-login" class="space-y-4.5">
             <div>
               <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail do Consultor *</label>
               <input id="input-login-email" type="email" required placeholder="seuemail@agencia.com" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
             </div>

             <div>
               <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Senha de Acesso *</label>
               <input id="input-login-password" type="password" required placeholder="••••••••" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
             </div>

            <button type="submit" id="btn-login-submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase mt-2.5 flex items-center justify-center">
              Acessar Painel
            </button>
          </form>

          <div class="border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">PaxFlow &bull; Sistema Restrito e Criptografado</span>
          </div>

        </div>
      </div>
    `;

    const form = document.getElementById('form-login') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = document.getElementById('btn-login-submit') as HTMLButtonElement;
      const errorContainer = document.getElementById('login-error-container');
      const email = (document.getElementById('input-login-email') as HTMLInputElement).value;
      const password = (document.getElementById('input-login-password') as HTMLInputElement).value;

      if (!email || !password) return;

      // Estado de Carregando
      btn.disabled = true;
      btn.textContent = 'Autenticando...';
      if (errorContainer) errorContainer.className = 'hidden';

      try {
        const { user, perfil, error } = await loginConsultor(email, password);

        if (error || !user) {
          throw new Error(error?.message || 'E-mail ou senha inválidos.');
        }

        this.user = user;
        this.perfil = perfil;
        this.renderAppShell();
        this.navigate('dashboard');

      } catch (err: any) {
        btn.disabled = false;
        btn.textContent = 'Acessar Painel';
        if (errorContainer) {
          errorContainer.className = 'px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/50';
          errorContainer.textContent = err.message || 'Erro inesperado no servidor.';
        }
      }
    });
  }

  /**
   * Renderiza a estrutura da barra de navegação principal (Sidebar)
   */
  private renderAppShell(): void {
    this.container.innerHTML = `
      <div class="min-h-screen flex flex-col md:flex-row bg-slate-50/50 dark:bg-slate-950 transition-colors duration-200">
        
        <!-- Sidebar Menu -->
        <aside class="w-full md:w-64 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex flex-col border-r border-slate-200 dark:border-slate-800/60 shadow-xl z-20 transition-all duration-200">
          
          <!-- Logo & Título -->
          <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
            <img src="/logo.png" alt="PaxFlow Logo" class="h-10 w-10 object-contain filter drop-shadow-md" />
            <div>
              <span class="block text-base font-black text-slate-800 dark:text-white tracking-tight">PaxFlow</span>
              <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">CRM de Pós-Venda</span>
            </div>
          </div>

          <!-- Links de Navegação -->
          <nav class="flex-1 p-4 space-y-2 flex flex-col justify-between">
            <div class="space-y-1.5">
              
              <!-- Link: Dashboard Kanban -->
              <button id="nav-dashboard" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Kanban Operacional</span>
              </button>

              <!-- Link: Clientes -->
              <button id="nav-clientes" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Ficha de Clientes</span>
              </button>

              <!-- Link: Reembolsos -->
              <button id="nav-reembolsos" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Central de Reembolsos</span>
              </button>

              <!-- Link: Configurações (Somente ADMIN) -->
              ${this.perfil?.role === 'admin' ? `
                <button id="nav-configuracoes" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none group">
                  <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Configurações Admin</span>
                </button>
              ` : ''}

            </div>

            <!-- Identidade no rodapé da Sidebar -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center gap-3 mt-4">
              <div class="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black rounded-lg flex items-center justify-center text-xs border border-indigo-100 dark:border-indigo-900/40">
                ${(this.perfil?.nome || 'C').substring(0,2).toUpperCase()}
              </div>
              <div class="overflow-hidden">
                <span class="block text-[11px] font-extrabold text-slate-700 dark:text-white truncate">${this.perfil?.nome || 'Consultor'}</span>
                <span class="block text-[9px] text-slate-450 dark:text-slate-500 font-semibold truncate capitalize">${this.perfil?.role || 'consultor'}</span>
              </div>
            </div>
          </nav>
        </aside>

        <!-- Área Principal de Exibição de Conteúdo -->
        <div id="page-content" class="flex-1 flex flex-col overflow-hidden min-w-0 bg-slate-50/50 dark:bg-slate-950">
          <!-- Injetado dinamicamente via router -->
        </div>

      </div>
    `;

    this.setupNavigationListeners();
  }

  /**
   * Associa eventos aos botões de navegação lateral
   */
  private setupNavigationListeners(): void {
    const pages = ['dashboard', 'clientes', 'reembolsos', 'configuracoes'];

    pages.forEach(page => {
      const btn = document.getElementById(`nav-${page}`);
      btn?.addEventListener('click', () => {
        this.navigate(page);
      });
    });
  }

  /**
   * Gerencia a navegação e o roteamento entre as diferentes páginas
   */
  private navigate(page: string): void {
    // 1. Limpa instâncias ou temporizadores ativos na página que está saindo
    if (this.currentPageInstance && typeof this.currentPageInstance.destroy === 'function') {
      this.currentPageInstance.destroy();
    }
    this.currentPageInstance = null;

    this.currentActivePage = page;
    const pageContentEl = document.getElementById('page-content');
    if (!pageContentEl) return;

    // 2. Atualiza os estilos de botões ativos na Sidebar
    const navButtons = ['dashboard', 'clientes', 'reembolsos', 'configuracoes'];
    navButtons.forEach(p => {
      const btn = document.getElementById(`nav-${p}`);
      if (btn) {
        if (p === page) {
          btn.className = 'w-full px-4 py-3 rounded-xl flex items-center gap-3 font-extrabold text-xs text-left transition select-none bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 group';
        } else {
          btn.className = 'w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/40 group';
        }
      }
    });

    // 3. Instancia e inicializa o componente da respectiva tela
    switch (page) {
      case 'dashboard':
        this.currentPageInstance = new Dashboard(pageContentEl);
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
        this.currentPageInstance = new Dashboard(pageContentEl);
    }

    if (this.currentPageInstance) {
      this.currentPageInstance.init();
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
