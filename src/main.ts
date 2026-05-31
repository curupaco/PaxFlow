import './index.css';
import { getSessaoAtual, loginConsultor, supabase, atualizarSenhaAtual } from './services/supabase';
import { InboxPage } from './pages/Inbox';
import { Dashboard } from './pages/Dashboard';
import { ComercialDashboard } from './pages/ComercialDashboard';
import { OrcamentosPage } from './pages/Orcamentos';
import { ClientesPage } from './pages/Clientes';
import { ReembolsosPage } from './pages/Reembolsos';
import { ConfiguracoesPage } from './pages/Configuracoes';
import { PerfilConsultor } from './types';
import { getAvatarSvg, AVATAR_OPTIONS, salvarAvatarLocal } from './services/avatars';
import { showCustomAlert } from './services/dialog';

class App {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private currentActivePage: string = 'analytics';
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
   * Renderiza a tela de login premium com recuperação de senha acoplada
   */
  private renderLogin(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-indigo-950/20 transition-colors duration-200 animate-fade-in">
        <div class="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col gap-6 relative overflow-hidden transition-all duration-300" id="login-card">
          
          <!-- Detalhe decorativo de gradiente no topo -->
          <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

          <!-- Cabeçalho de Identidade -->
          <div class="text-center flex flex-col items-center select-none">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-16 w-16 object-contain mb-4 filter drop-shadow-xl" />
            <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight" id="login-title">Entrar no PaxFlow</h2>
            <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1.5" id="login-subtitle">Painel de CRM & Gestão de Pós-Venda</p>
          </div>

          <div id="login-error-container" class="hidden px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/50">
            <!-- Container de Erro -->
          </div>

          <!-- Formulário de Login -->
          <div id="login-form-wrapper" class="transition-all duration-300">
            <form id="form-login" class="space-y-4.5">
               <div>
                 <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail do Consultor *</label>
                 <input id="input-login-email" type="email" required autocomplete="username" placeholder="seuemail@agencia.com" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
               </div>

               <div>
                 <div class="flex items-center justify-between mb-1.5 select-none">
                   <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Senha de Acesso *</label>
                   <button type="button" id="btn-esqueci-senha" class="text-[10px] font-extrabold text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-350 transition hover:underline focus:outline-none uppercase tracking-wide">Esqueci minha senha</button>
                 </div>
                 <input id="input-login-password" type="password" required autocomplete="current-password" placeholder="••••••••" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
               </div>

              <button type="submit" id="btn-login-submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase mt-2.5 flex items-center justify-center">
                Acessar Painel
              </button>
            </form>
          </div>

          <!-- Formulário de Recuperação de Senha (Oculto por padrão) -->
          <div id="recovery-form-wrapper" class="hidden transition-all duration-300">
            <form id="form-recovery" class="space-y-4.5">
               <p class="text-xs text-slate-500 dark:text-slate-450 font-semibold leading-relaxed mb-1.5">
                 Esqueceu sua senha? Insira o e-mail cadastrado e enviaremos um link seguro de redefinição através do Supabase Auth.
               </p>
               <div>
                 <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail Cadastrado *</label>
                 <input id="input-recovery-email" type="email" required autocomplete="email" placeholder="seuemail@agencia.com" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
               </div>

              <button type="submit" id="btn-recovery-submit" class="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase mt-2 flex items-center justify-center">
                Enviar E-mail de Recuperação
              </button>
              <button type="button" id="btn-back-to-login" class="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-extrabold text-xs rounded-xl border border-slate-200/50 dark:border-slate-700/50 transition uppercase tracking-wider mt-1 flex items-center justify-center">
                Voltar ao Login
              </button>
            </form>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">PaxFlow &bull; Sistema Restrito e Criptografado</span>
          </div>

        </div>
      </div>
    `;

    // Seleção de Elementos
    const loginWrapper = document.getElementById('login-form-wrapper') as HTMLElement;
    const recoveryWrapper = document.getElementById('recovery-form-wrapper') as HTMLElement;
    const loginTitle = document.getElementById('login-title') as HTMLElement;
    const loginSubtitle = document.getElementById('login-subtitle') as HTMLElement;
    const errorContainer = document.getElementById('login-error-container') as HTMLElement;

    // Alternar para Esqueci minha senha
    document.getElementById('btn-esqueci-senha')?.addEventListener('click', () => {
      loginWrapper.classList.add('hidden');
      recoveryWrapper.classList.remove('hidden');
      loginTitle.textContent = 'Recuperar Senha';
      loginSubtitle.textContent = 'Redefinição de acesso seguro';
      errorContainer.className = 'hidden';
      errorContainer.innerHTML = '';
    });

    // Alternar de volta para Login
    document.getElementById('btn-back-to-login')?.addEventListener('click', () => {
      recoveryWrapper.classList.add('hidden');
      loginWrapper.classList.remove('hidden');
      loginTitle.textContent = 'Entrar no PaxFlow';
      loginSubtitle.textContent = 'Painel de CRM & Gestão de Pós-Venda';
      errorContainer.className = 'hidden';
      errorContainer.innerHTML = '';
    });

    // Submit de Recuperação de Senha
    const formRecovery = document.getElementById('form-recovery') as HTMLFormElement;
    formRecovery?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-recovery-submit') as HTMLButtonElement;
      const email = (document.getElementById('input-recovery-email') as HTMLInputElement).value.trim();

      if (!email) return;

      btn.disabled = true;
      btn.textContent = 'Enviando link...';
      errorContainer.className = 'hidden';

      const isSandboxMode = supabase.auth.getSession === undefined || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !import.meta.env.VITE_SUPABASE_URL);

      try {
        if (isSandboxMode) {
          // Simula redefinição no ambiente sandbox offline
          await new Promise((resolve) => setTimeout(resolve, 1200));
          this.showToast('E-mail simulado de redefinição enviado!', 'success');
        } else {
          // Envia e-mail real via Supabase
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
          });
          if (error) throw error;
        }

        // Sucesso na recuperação
        recoveryWrapper.innerHTML = `
          <div class="py-4 text-center space-y-4 animate-fade-in">
            <div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-2xl flex items-center justify-center text-xl border border-emerald-100 dark:border-emerald-900/40 mx-auto">
              ✉️
            </div>
            <div>
              <h4 class="text-sm font-black text-slate-800 dark:text-slate-100">Instruções Enviadas!</h4>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
                Enviamos um e-mail de redefinição para <strong class="text-slate-700 dark:text-slate-300">${email}</strong> com o link seguro. Verifique também a pasta de spam.
              </p>
            </div>
            <button type="button" id="btn-success-back-to-login" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">
              Voltar ao Login
            </button>
          </div>
        `;

        document.getElementById('btn-success-back-to-login')?.addEventListener('click', () => {
          this.renderLogin();
        });

      } catch (err: any) {
        btn.disabled = false;
        btn.textContent = 'Enviar E-mail de Recuperação';
        errorContainer.className = 'px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/50';
        errorContainer.textContent = err.message || 'Erro ao enviar e-mail de recuperação.';
      }
    });

    // Submit de Login
    const formLogin = document.getElementById('form-login') as HTMLFormElement;
    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = document.getElementById('btn-login-submit') as HTMLButtonElement;
      const email = (document.getElementById('input-login-email') as HTMLInputElement).value;
      const password = (document.getElementById('input-login-password') as HTMLInputElement).value;

      if (!email || !password) return;

      // Estado de Carregando
      btn.disabled = true;
      btn.textContent = 'Autenticando...';
      errorContainer.className = 'hidden';

      try {
        const { user, perfil, error } = await loginConsultor(email, password);

        if (error || !user) {
          throw new Error(error?.message || 'E-mail ou senha inválidos.');
        }

        this.user = user;
        this.perfil = perfil;
        this.renderAppShell();
        this.navigate('inbox');

      } catch (err: any) {
        btn.disabled = false;
        btn.textContent = 'Acessar Painel';
        errorContainer.className = 'px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/50';
        errorContainer.textContent = err.message || 'Erro inesperado no servidor.';
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
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-10 object-contain filter drop-shadow-md" />
            <div>
              <span class="block text-base font-black text-slate-800 dark:text-white tracking-tight">PaxFlow</span>
            </div>
          </div>

          <!-- Links de Navegação -->
          <nav class="flex-1 p-4 space-y-2 flex flex-col justify-between">
            <div class="space-y-1.5">

              <!-- Link: Dashboard Comercial -->
              <button id="nav-analytics" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
                </svg>
                <span>Dashboard</span>
              </button>
              
              <!-- Link: Inbox de Alertas -->
              <button id="nav-inbox" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-550 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>Inbox de Alertas</span>
              </button>

              <!-- Link: Kanban de Orçamentos -->
              <button id="nav-orcamentos" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none group">
                <svg width="20" height="20" class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-[.bg-indigo-600]:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>Orçamentos em Aberto</span>
              </button>

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
  }

  /**
   * Renderiza a identidade do consultor logado no rodapé da Sidebar
   */
  private atualizarSidebarProfileFooter(): void {
    const footerContainer = document.getElementById('sidebar-profile-footer-container');
    if (!footerContainer || !this.perfil) return;

    footerContainer.innerHTML = `
      <button id="sidebar-profile-trigger" class="w-full text-left border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800/40 p-1.5 rounded-xl transition duration-200 focus:outline-none">
        ${getAvatarSvg(this.perfil.avatar_url, this.perfil.nome || 'Consultor', 'w-8 h-8')}
        <div class="overflow-hidden flex-1 select-none">
          <span class="block text-[11px] font-extrabold text-slate-700 dark:text-white truncate">${this.perfil.nome || 'Consultor'}</span>
          <span class="block text-[9px] text-slate-450 dark:text-slate-500 font-semibold truncate capitalize">${this.perfil.role || 'consultor'}</span>
        </div>
      </button>
    `;

    document.getElementById('sidebar-profile-trigger')?.addEventListener('click', () => {
      this.abrirModalMeuPerfil();
    });
  }

  /**
   * Abre o modal premium de edição de perfil de consultor ("Meu Perfil")
   */
  private abrirModalMeuPerfil(): void {
    if (!this.perfil) return;

    const overlay = document.createElement('div');
    overlay.id = 'meu-perfil-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    let selectedAvatarId = this.perfil.avatar_url || '';

    // Grade de seleção de avatares com efeito ativo e hover de zoom
    const renderAvatarsHtml = () => {
      return AVATAR_OPTIONS.map(opt => {
        const isSelected = selectedAvatarId === opt.id;
        return `
          <button type="button" data-avatar-id="${opt.id}" class="btn-select-avatar w-12 h-12 p-0.5 rounded-xl border-2 transition duration-200 transform hover:scale-110 relative flex items-center justify-center ${
            isSelected 
              ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20' 
              : 'border-transparent hover:border-slate-350 dark:hover:border-slate-750'
          }" title="${opt.nome}">
            ${opt.svg}
            ${isSelected ? `<div class="absolute -top-1 -right-1 bg-indigo-600 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm">✓</div>` : ''}
          </button>
        `;
      }).join('');
    };

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[440px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col relative max-h-[90vh] overflow-y-auto custom-scrollbar" id="meu-perfil-card">
        
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
          <div id="modal-profile-avatar-preview" class="mb-3">
            ${getAvatarSvg(selectedAvatarId, this.perfil.nome || 'Consultor', 'w-16 h-16')}
          </div>
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">Meu Perfil</h2>
          <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">Defina sua carinha de animal e gerencie seu acesso</p>
        </div>

        <form id="form-meu-perfil" class="p-6 space-y-4">
          <!-- Grade de avatares -->
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Selecione uma Carinha de Animal *</label>
            <div class="grid grid-cols-6 gap-2.5 justify-items-center" id="modal-avatar-selection-grid">
              ${renderAvatarsHtml()}
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome Completo *</label>
            <input id="input-mp-nome" type="text" required autocomplete="name" value="${this.perfil.nome || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail de Login</label>
            <input id="input-mp-email" type="email" disabled autocomplete="username" value="${this.perfil.email || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850/50 rounded-lg text-slate-400 dark:text-slate-500 font-bold text-sm cursor-not-allowed select-none" />
            <p class="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">O e-mail é único para login e não pode ser reconfigurado.</p>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h3 class="text-xs font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mb-2.5">Alterar Minha Senha</h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Nova Senha</label>
                <input id="input-mp-senha" type="password" minlength="6" autocomplete="new-password" placeholder="Mín. 6 dígitos" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Confirmar Senha</label>
                <input id="input-mp-senha-confirm" type="password" minlength="6" autocomplete="new-password" placeholder="Confirme a senha" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-mp-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold text-xs rounded-xl transition uppercase">
              Cancelar
            </button>
            <button id="btn-mp-submit" type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20 uppercase tracking-wider flex items-center justify-center">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Fade-in
    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('meu-perfil-card')?.classList.remove('scale-95');
      document.getElementById('meu-perfil-card')?.classList.add('scale-100');
    }, 10);

    const closeMPModal = () => {
      const card = document.getElementById('meu-perfil-card');
      if (card) {
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
      }
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('btn-mp-cancel')?.addEventListener('click', closeMPModal);

    // Adiciona evento na grade de seleção de avatares com reatividade premium
    const setupAvatarGridEvents = () => {
      const grid = overlay.querySelector('#modal-avatar-selection-grid') as HTMLElement;
      const preview = overlay.querySelector('#modal-profile-avatar-preview') as HTMLElement;
      const nomeInput = overlay.querySelector('#input-mp-nome') as HTMLInputElement;

      grid.querySelectorAll('.btn-select-avatar').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedAvatarId = btn.getAttribute('data-avatar-id') || '';
          
          // Re-renderiza grade para atualizar borda
          grid.innerHTML = renderAvatarsHtml();
          // Atualiza visualização de pré-exibição
          preview.innerHTML = getAvatarSvg(selectedAvatarId, nomeInput?.value || 'Consultor', 'w-16 h-16');
          
          setupAvatarGridEvents();
        });
      });
    };

    setupAvatarGridEvents();

    // Ouvinte para manter o preview do avatar atualizado dinamicamente enquanto digita
    const nomeInput = overlay.querySelector('#input-mp-nome') as HTMLInputElement;
    nomeInput?.addEventListener('input', () => {
      const preview = overlay.querySelector('#modal-profile-avatar-preview') as HTMLElement;
      preview.innerHTML = getAvatarSvg(selectedAvatarId, nomeInput.value || 'Consultor', 'w-16 h-16');
    });

    // Enviar formulário
    const form = overlay.querySelector('#form-meu-perfil') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-mp-submit') as HTMLButtonElement;
      const nomeVal = nomeInput.value.trim();
      const senhaVal = (overlay.querySelector('#input-mp-senha') as HTMLInputElement).value;
      const senhaConfirmVal = (overlay.querySelector('#input-mp-senha-confirm') as HTMLInputElement).value;

      if (!nomeVal) return;

      if (senhaVal) {
        if (senhaVal.length < 6) {
          await showCustomAlert('A nova senha deve conter pelo menos 6 caracteres.', 'Senha Curta');
          return;
        }
        if (senhaVal !== senhaConfirmVal) {
          await showCustomAlert('A confirmação de senha não coincide com a nova senha.', 'Confirmação Incorreta');
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';

      try {
        const isOffline = supabase.from === undefined || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !import.meta.env.VITE_SUPABASE_URL);

        if (this.perfil) {
          salvarAvatarLocal(this.perfil.id, selectedAvatarId);
        }

        if (!isOffline && this.perfil) {
          // 1. Persiste dados na tabela public profiles (avatar_url é salvo no banco de dados e sincronizado)
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({ nome: nomeVal, avatar_url: selectedAvatarId })
            .eq('id', this.perfil.id);

          if (profileErr) throw profileErr;

          // 2. Atualiza os metadados do Supabase Auth
          const { error: authMetaErr } = await supabase.auth.updateUser({
            data: { nome: nomeVal, avatar_url: selectedAvatarId }
          });

          if (authMetaErr) {
            console.warn('Falha parcial ao atualizar metadados de autenticação:', authMetaErr);
          }

          // 3. Atualiza senha se solicitada
          if (senhaVal) {
            const { error: passwordErr } = await atualizarSenhaAtual(senhaVal);
            if (passwordErr) throw passwordErr;
          }
        }

        // Atualização reativa de estados locais
        if (this.perfil) {
          this.perfil.nome = nomeVal;
          this.perfil.avatar_url = selectedAvatarId;
        }

        // Dispara evento para sincronizar todos os cabeçalhos das telas abertas
        window.dispatchEvent(new CustomEvent('paxflow-profile-updated', {
          detail: { nome: nomeVal, avatar_url: selectedAvatarId }
        }));

        this.showToast('Perfil atualizado com sucesso!', 'success');
        closeMPModal();

      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Alterações';
        await showCustomAlert(`Erro ao atualizar perfil:\n\n${err.message || err}`, 'Erro no Perfil');
      }
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

    // 2. Atualiza os estilos de botões ativos na Sidebar
    const navButtons = ['analytics', 'inbox', 'orcamentos', 'dashboard', 'clientes', 'reembolsos', 'configuracoes'];
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
