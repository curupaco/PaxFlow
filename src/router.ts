import { InboxPage } from './pages/Inbox';
import { Dashboard } from './pages/Dashboard';
import { ComercialDashboard } from './pages/ComercialDashboard';
import { OrcamentosPage } from './pages/Orcamentos';
import { ClientesPage } from './pages/Clientes';
import { ReembolsosPage } from './pages/Reembolsos';
import { ConfiguracoesPage } from './pages/Configuracoes';
import { CadastrosPage } from './pages/Cadastros';
import { RelatoriosPage } from './pages/Relatorios';

export class Router {
  private pageContentEl: HTMLElement;
  private currentPageInstance: any = null;
  private currentActivePage: string = 'analytics';

  constructor(pageContentEl: HTMLElement) {
    this.pageContentEl = pageContentEl;
  }

  /**
   * Gerencia a navegação e o roteamento entre as diferentes páginas
   */
  public navigate(page: string, extraId?: string): void {
    // 1. Limpa instâncias ou temporizadores ativos na página que está saindo
    if (this.currentPageInstance && typeof this.currentPageInstance.destroy === 'function') {
      this.currentPageInstance.destroy();
    }
    this.currentPageInstance = null;

    this.currentActivePage = page;

    // Garante que o container é relativo para posicionar o overlay absolutamente
    this.pageContentEl.classList.add('relative');

    // Injeta a animação de carregamento glassmorphic sem remover o conteúdo antigo da tela anterior
    let overlay = document.getElementById('paxflow-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'paxflow-loading-overlay';
      overlay.className = 'absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-sm z-40 flex flex-col items-center justify-center space-y-3 pointer-events-none animate-fade-in';
      overlay.innerHTML = `
        <div class="w-10 h-10 border-3 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-xs font-bold text-slate-600 dark:text-slate-300 animate-pulse uppercase tracking-wider">Carregando dados...</span>
      `;
      this.pageContentEl.appendChild(overlay);
    }

    // 2. Instancia e inicializa o componente da respectiva tela
    switch (page) {
      case 'analytics':
        this.currentPageInstance = new ComercialDashboard(this.pageContentEl);
        break;
      case 'inbox':
        this.currentPageInstance = new InboxPage(this.pageContentEl);
        break;
      case 'dashboard':
        this.currentPageInstance = new Dashboard(this.pageContentEl);
        break;
      case 'orcamentos':
        this.currentPageInstance = new OrcamentosPage(this.pageContentEl);
        break;
      case 'clientes':
        this.currentPageInstance = new ClientesPage(this.pageContentEl);
        break;
      case 'reembolsos':
        this.currentPageInstance = new ReembolsosPage(this.pageContentEl);
        break;
      case 'configuracoes':
        this.currentPageInstance = new ConfiguracoesPage(this.pageContentEl);
        break;
      case 'cadastros':
        this.currentPageInstance = new CadastrosPage(this.pageContentEl);
        break;
      case 'relatorios':
        this.currentPageInstance = new RelatoriosPage(this.pageContentEl);
        break;
      default:
        this.currentPageInstance = new InboxPage(this.pageContentEl);
    }

    if (this.currentPageInstance) {
      this.currentPageInstance.init(extraId);
    }
  }

  public getCurrentPage(): string {
    return this.currentActivePage;
  }

  public getCurrentInstance(): any {
    return this.currentPageInstance;
  }
}
