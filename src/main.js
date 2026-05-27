import { getSessaoAtual, loginConsultor } from './services/supabase';
import { Dashboard } from './pages/Dashboard';
import { ClientesPage } from './pages/Clientes';
import { ReembolsosPage } from './pages/Reembolsos';
import { ConfiguracoesPage } from './pages/Configuracoes';
class App {
    container;
    user = null;
    perfil = null;
    currentActivePage = 'dashboard';
    currentPageInstance = null;
    constructor(container) {
        this.container = container;
    }
    /**
     * Inicializa o aplicativo verificando a sessão ativa
     */
    async init() {
        this.renderLoading();
        try {
            const { user, perfil, error } = await getSessaoAtual();
            if (error || !user) {
                this.renderLogin();
            }
            else {
                this.user = user;
                this.perfil = perfil;
                this.renderAppShell();
                this.navigate(this.currentActivePage);
            }
        }
        catch (err) {
            console.error('Erro ao inicializar app:', err);
            this.renderLogin();
        }
    }
    /**
     * Exibe tela de carregamento geral
     */
    renderLoading() {
        this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-semibold animate-pulse">Inicializando PaxFlow CRM...</p>
      </div>
    `;
    }
    /**
     * Renderiza a tela de login premium
     */
    renderLogin() {
        this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-gradient-to-tr from-slate-100 to-indigo-50/40">
        <div class="max-w-md w-full bg-white border border-slate-200/80 p-8 rounded-3xl shadow-2xl flex flex-col gap-6 relative overflow-hidden">
          
          <!-- Detalhe decorativo de gradiente no topo -->
          <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

          <!-- Cabeçalho de Identidade -->
          <div class="text-center flex flex-col items-center">
            <span class="p-4 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-3xl text-3xl font-black shadow-xl shadow-indigo-500/30 mb-4 select-none">PF</span>
            <h2 class="text-2xl font-black text-slate-800 tracking-tight">Entrar no PaxFlow</h2>
            <p class="text-xs text-slate-400 font-semibold mt-1.5">Painel de CRM & Gestão de Pós-Venda</p>
          </div>

          <div id="login-error-container" class="hidden px-4 py-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
            <!-- Erro de login -->
          </div>

          <!-- Formulário -->
          <form id="form-login" class="space-y-4.5">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">E-mail do Consultor *</label>
              <input id="input-login-email" type="email" required placeholder="seuemail@agencia.com" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Senha de Acesso *</label>
              <input id="input-login-password" type="password" required placeholder="••••••••" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold text-sm" />
            </div>

            <button type="submit" id="btn-login-submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase mt-2.5 flex items-center justify-center">
              Acessar Painel
            </button>
          </form>

          <div class="border-t border-slate-100 pt-4 text-center">
            <span class="text-[10px] text-slate-400 font-medium">PaxFlow &bull; Sistema Restrito e Criptografado</span>
          </div>

        </div>
      </div>
    `;
        const form = document.getElementById('form-login');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-login-submit');
            const errorContainer = document.getElementById('login-error-container');
            const email = document.getElementById('input-login-email').value;
            const password = document.getElementById('input-login-password').value;
            if (!email || !password)
                return;
            // Estado de Carregando
            btn.disabled = true;
            btn.textContent = 'Autenticando...';
            if (errorContainer)
                errorContainer.className = 'hidden';
            try {
                const { user, perfil, error } = await loginConsultor(email, password);
                if (error || !user) {
                    throw new Error(error?.message || 'E-mail ou senha inválidos.');
                }
                this.user = user;
                this.perfil = perfil;
                this.renderAppShell();
                this.navigate('dashboard');
            }
            catch (err) {
                btn.disabled = false;
                btn.textContent = 'Acessar Painel';
                if (errorContainer) {
                    errorContainer.className = 'px-4 py-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100';
                    errorContainer.textContent = err.message || 'Erro inesperado no servidor.';
                }
            }
        });
    }
    /**
     * Renderiza a estrutura da barra de navegação principal (Sidebar)
     */
    renderAppShell() {
        this.container.innerHTML = `
      <div class="min-h-screen flex flex-col md:flex-row bg-slate-50/50">
        
        <!-- Sidebar Menu -->
        <aside class="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-xl z-20">
          
          <!-- Logo & Título -->
          <div class="p-6 border-b border-slate-800 flex items-center gap-2.5">
            <span class="p-2.5 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-xl text-xl font-black shadow-lg shadow-indigo-500/20 select-none">PF</span>
            <div>
              <span class="block text-base font-black text-white tracking-tight">PaxFlow</span>
              <span class="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">CRM de Pós-Venda</span>
            </div>
          </div>

          <!-- Links de Navegação -->
          <nav class="flex-1 p-4 space-y-2 flex flex-col justify-between">
            <div class="space-y-1.5">
              
              <!-- Link: Dashboard Kanban -->
              <button id="nav-dashboard" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none">
                <span>📊</span> Kanban Operacional
              </button>

              <!-- Link: Clientes -->
              <button id="nav-clientes" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none">
                <span>👤</span> Ficha de Clientes
              </button>

              <!-- Link: Reembolsos -->
              <button id="nav-reembolsos" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none">
                <span>💸</span> Central de Reembolsos
              </button>

              <!-- Link: Configurações (Somente ADMIN) -->
              ${this.perfil?.role === 'admin' ? `
                <button id="nav-configuracoes" class="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none">
                  <span>⚙️</span> Configurações Admin
                </button>
              ` : ''}

            </div>

            <!-- Identidade no rodapé da Sidebar -->
            <div class="border-t border-slate-800 pt-4 flex items-center gap-3 mt-4">
              <div class="w-8 h-8 bg-indigo-500/10 text-indigo-400 font-black rounded-lg flex items-center justify-center text-xs border border-indigo-500/20">
                ${(this.perfil?.nome || 'C').substring(0, 2).toUpperCase()}
              </div>
              <div class="overflow-hidden">
                <span class="block text-[11px] font-extrabold text-white truncate">${this.perfil?.nome || 'Consultor'}</span>
                <span class="block text-[9px] text-slate-500 font-semibold truncate capitalize">${this.perfil?.role || 'consultor'}</span>
              </div>
            </div>
          </nav>
        </aside>

        <!-- Área Principal de Exibição de Conteúdo -->
        <div id="page-content" class="flex-1 flex flex-col overflow-hidden min-w-0">
          <!-- Injetado dinamicamente via router -->
        </div>

      </div>
    `;
        this.setupNavigationListeners();
    }
    /**
     * Associa eventos aos botões de navegação lateral
     */
    setupNavigationListeners() {
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
    navigate(page) {
        // 1. Limpa instâncias ou temporizadores ativos na página que está saindo
        if (this.currentPageInstance && typeof this.currentPageInstance.destroy === 'function') {
            this.currentPageInstance.destroy();
        }
        this.currentPageInstance = null;
        this.currentActivePage = page;
        const pageContentEl = document.getElementById('page-content');
        if (!pageContentEl)
            return;
        // 2. Atualiza os estilos de botões ativos na Sidebar
        const navButtons = ['dashboard', 'clientes', 'reembolsos', 'configuracoes'];
        navButtons.forEach(p => {
            const btn = document.getElementById(`nav-${p}`);
            if (btn) {
                if (p === page) {
                    btn.className = 'w-full px-4 py-3 rounded-xl flex items-center gap-3 font-extrabold text-xs text-left transition select-none bg-indigo-600 text-white shadow-lg shadow-indigo-600/10';
                }
                else {
                    btn.className = 'w-full px-4 py-3 rounded-xl flex items-center gap-3 font-semibold text-xs text-left transition select-none text-slate-400 hover:text-white hover:bg-slate-800/40';
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
