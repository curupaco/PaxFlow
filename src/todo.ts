import Sortable from 'sortablejs';

// --- DEFINIÇÃO DE INTERFACES ---
interface Column {
  id: string;
  title: string;
}

interface TodoCard {
  id: string;
  columnId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  label: string; // Tag decorativa
  priority: 'low' | 'medium' | 'high' | 'urgent';
  owner: string; // Dono do card
}

class TodoKanban {
  private container: HTMLElement;
  private columns: Column[] = [];
  private cards: TodoCard[] = [];
  private theme: 'light' | 'dark' = 'light';
  private searchFilter: string = '';
  private priorityFilter: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa o Quadro Kanban
   */
  public init(): void {
    this.applyInitialTheme();
    this.loadState();
    this.render();
    this.setupGlobalEventListeners();
  }

  /**
   * Carrega o estado salvo ou define estado padrão de demonstração
   */
  private loadState(): void {
    const savedCols = localStorage.getItem('paxflow-todo-cols');
    const savedCards = localStorage.getItem('paxflow-todo-cards');

    if (savedCols) {
      this.columns = JSON.parse(savedCols);
    } else {
      // Colunas Iniciais Padrão
      this.columns = [
        { id: 'col-backlog', title: '📋 Backlog de Ideias' },
        { id: 'col-todo', title: '🚀 A Fazer / Prioridades' },
        { id: 'col-progress', title: '⚙️ Em Progresso' },
        { id: 'col-done', title: '✅ Concluído' }
      ];
    }

    if (savedCards) {
      this.cards = JSON.parse(savedCards);
    } else {
      // Cartões de Demonstração Iniciais
      this.cards = [
        {
          id: 'card-demo-1',
          columnId: 'col-backlog',
          title: 'Mapear Requisitos de E-mails',
          description: 'Levantar as necessidades dos consultores sobre as mensagens de confirmação do Supabase.',
          date: '2026-05-29',
          label: 'Mapeamento',
          priority: 'medium',
          owner: 'Fernanda Ganem'
        },
        {
          id: 'card-demo-2',
          columnId: 'col-todo',
          title: 'Implementar Integração com Google Drive',
          description: 'Criar subpastas automáticas de clientes para upload de passaportes e vistos.',
          date: '2026-05-27',
          label: 'Funcionalidade',
          priority: 'high',
          owner: 'Desenvolvedor'
        },
        {
          id: 'card-demo-3',
          columnId: 'col-progress',
          title: 'Ajuste de SLAs e Cores no Kanban',
          description: 'Aprimorar a reatividade visual das tarefas com prazos expirando ou críticos.',
          date: '2026-05-28',
          label: 'Design',
          priority: 'urgent',
          owner: 'Design UX'
        }
      ];
      this.saveState();
    }
  }

  /**
   * Salva o estado atual no LocalStorage
   */
  private saveState(): void {
    localStorage.setItem('paxflow-todo-cols', JSON.stringify(this.columns));
    localStorage.setItem('paxflow-todo-cards', JSON.stringify(this.cards));
    
    // Atualiza o indicador visual de salvo
    const badge = document.getElementById('save-status-badge');
    if (badge) {
      badge.innerHTML = `
        <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
        <span class="text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">Salvo Localmente</span>
      `;
      setTimeout(() => {
        badge.innerHTML = `
          <span class="w-1.5 h-1.5 bg-emerald-500/70 rounded-full"></span>
          <span class="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">Salvo</span>
        `;
      }, 1500);
    }
  }

  /**
   * Gerencia e aplica a detecção de tema escuro
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

  private updateDOMTheme(): void {
    if (this.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private toggleTheme(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.theme);
    this.updateDOMTheme();
    this.showToast(`Modo ${this.theme === 'dark' ? 'Escuro' : 'Claro'} ativado!`);
  }

  /**
   * Renderização completa do Layout
   */
  private render(): void {
    this.container.innerHTML = `
      <!-- CABEÇALHO DO KANBAN STANDALONE -->
      <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
        <div class="flex items-center gap-3">
          <img src="/logo.png" alt="PaxFlow Logo" class="h-10 w-auto object-contain" />
          <div>
            <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>PaxFlow Prioridades</span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <span>Quadro de Mapeamento & Levantamento</span> &bull; 
              <span id="save-status-badge" class="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/40 px-2 py-0.5 rounded border border-slate-200/30 dark:border-slate-700/30">
                <span class="w-1.5 h-1.5 bg-emerald-500/70 rounded-full"></span>
                <span class="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">Salvo</span>
              </span>
            </p>
          </div>
        </div>

        <!-- Botões de Ações de Topo -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Importar JSON -->
          <button id="btn-importar" title="Importar Quadro JSON" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center gap-1.5 font-bold text-xs">
            📥 Importar
          </button>
          <input type="file" id="input-importar-file" accept=".json" class="hidden" />

          <!-- Exportar JSON -->
          <button id="btn-exportar" title="Exportar Quadro JSON" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center gap-1.5 font-bold text-xs">
            📤 Exportar
          </button>

          <!-- Gerenciar Colunas -->
          <button id="btn-gerenciar-colunas" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold text-xs tracking-wider rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 uppercase">
            ⚙️ Colunas
          </button>

          <!-- Criar Cartão -->
          <button id="btn-novo-card" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase">
            ➕ Criar Cartão
          </button>

          <!-- Separador -->
          <div class="w-px h-8 bg-slate-250 dark:bg-slate-800"></div>

          <!-- Alternar Tema -->
          <button id="todo-theme-toggle" title="Alternar Tema" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
            <svg width="20" height="20" class="w-5 h-5 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <svg width="20" height="20" class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <!-- Retornar ao CRM -->
          <a href="/" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center font-bold text-xs">
            ⬅️ CRM principal
          </a>
        </div>
      </header>

      <!-- BARRA DE FILTROS & BUSCA -->
      <div class="px-6 py-4 bg-slate-100/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="relative w-full sm:max-w-xs">
          <span class="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
          <input id="input-todo-busca" type="text" placeholder="Filtrar cartões por título, dono..." value="${this.searchFilter}" class="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none rounded-lg" />
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Prioridade:</span>
          <select id="select-todo-prioridade-filter" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="">Todas</option>
            <option value="low" ${this.priorityFilter === 'low' ? 'selected' : ''}>Baixa</option>
            <option value="medium" ${this.priorityFilter === 'medium' ? 'selected' : ''}>Média</option>
            <option value="high" ${this.priorityFilter === 'high' ? 'selected' : ''}>Alta</option>
            <option value="urgent" ${this.priorityFilter === 'urgent' ? 'selected' : ''}>Urgente</option>
          </select>
        </div>
      </div>

      <!-- QUADRO KANBAN DINÂMICO -->
      <main class="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-6 custom-scrollbar items-start" id="todo-kanban-board">
        <!-- Injetado dinamicamente via JS -->
      </main>

      <!-- PORTAL DE MODAIS -->
      <div id="todo-modal-portal"></div>
    `;

    this.renderColumns();
  }

  /**
   * Renderiza as colunas do Kanban
   */
  private renderColumns(): void {
    const board = document.getElementById('todo-kanban-board');
    if (!board) return;

    if (this.columns.length === 0) {
      board.innerHTML = `
        <div class="flex-1 text-center py-20">
          <span class="text-4xl">📋</span>
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1">Nenhuma coluna configurada</h3>
          <p class="text-sm text-slate-400 mb-6">Crie colunas para estruturar seu quadro de mapeamento.</p>
          <button id="btn-colunas-vazio" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition">
            Configurar Colunas
          </button>
        </div>
      `;
      document.getElementById('btn-colunas-vazio')?.addEventListener('click', () => this.openColumnsModal());
      return;
    }

    board.innerHTML = this.columns.map(col => {
      // Filtra cartões pertencentes a esta coluna
      const colCards = this.cards.filter(c => {
        const matchesCol = c.columnId === col.id;
        const matchesSearch = !this.searchFilter || 
          c.title.toLowerCase().includes(this.searchFilter.toLowerCase()) ||
          c.owner.toLowerCase().includes(this.searchFilter.toLowerCase()) ||
          c.description.toLowerCase().includes(this.searchFilter.toLowerCase()) ||
          c.label.toLowerCase().includes(this.searchFilter.toLowerCase());
        const matchesPriority = !this.priorityFilter || c.priority === this.priorityFilter;
        return matchesCol && matchesSearch && matchesPriority;
      });

      return `
        <!-- Coluna -->
        <div class="w-72 bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col max-h-full min-h-[500px] shrink-0" data-column-id="${col.id}">
          
          <!-- Cabeçalho de Coluna -->
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800/60">
            <div class="flex items-center gap-2 overflow-hidden">
              <span class="text-xs font-black text-slate-700 dark:text-slate-200 truncate select-none leading-none">${col.title}</span>
              <span class="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[9px] font-extrabold select-none leading-none">${colCards.length}</span>
            </div>
            
            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Adicionar rápido -->
              <button data-add-card-in-col="${col.id}" title="Adicionar cartão nesta coluna" class="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition text-xs">
                ➕
              </button>
            </div>
          </div>

          <!-- Cards Lista -->
          <div class="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 select-none py-1" id="cards-container-${col.id}" data-col-target-id="${col.id}">
            ${colCards.map(c => this.renderCardHtml(c)).join('')}
            ${colCards.length === 0 ? `
              <div class="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800/50 rounded-xl flex items-center justify-center p-6 text-center text-slate-350 dark:text-slate-600/80 text-[10px] font-bold uppercase tracking-wider select-none min-h-[80px]">
                Solte cartões aqui
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Configurar ouvintes internos e drag and drop
    this.setupColumnDragAndDrop();
    this.setupColumnActionListeners();
  }

  /**
   * HTML de um Card Individual
   */
  private renderCardHtml(c: TodoCard): string {
    // Calibração de cores por prioridade
    const badgeColors: { [key: string]: string } = {
      low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-100/30 dark:border-emerald-900/10',
      medium: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/10',
      high: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-100/30 dark:border-amber-900/10',
      urgent: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-100/30 dark:border-rose-900/10'
    };

    const labelMap: { [key: string]: string } = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente'
    };

    const prioridadeClass = badgeColors[c.priority] || badgeColors.medium;
    
    // Tratamento de data brasileiro
    const formatarDataBr = (dStr: string) => {
      if (!dStr) return '';
      const parts = dStr.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Sigla do dono para avatar
    const siglaOwner = (c.owner || 'A').substring(0, 2).toUpperCase();

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/85 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700/80 transition transform hover:-translate-y-0.5 group relative flex flex-col gap-3 select-none cursor-grab active:cursor-grabbing animate-card-in" data-card-id="${c.id}">
        
        <!-- Tag / Categoria -->
        <div class="flex items-center justify-between gap-2">
          ${c.label ? `
            <span class="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full font-black text-[9px] uppercase tracking-wide border border-slate-200/30 dark:border-slate-750/30">
              🏷️ ${c.label}
            </span>
          ` : '<span></span>'}

          <!-- Ações Rápidas no Hover + Toggle de Descrição -->
          <div class="flex items-center gap-1.5 select-none">
            ${c.description ? `
              <button data-toggle-desc-id="${c.id}" class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition text-xs font-bold leading-none" title="Expandir/Recolher descrição">
                ▼
              </button>
            ` : ''}
            <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-200 select-none">
              <button data-edit-card-id="${c.id}" class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition text-[11px]" title="Editar Cartão">✏️</button>
              <button data-delete-card-id="${c.id}" class="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-300 hover:text-rose-600 dark:hover:text-rose-450 rounded transition text-[11px]" title="Excluir Cartão">🗑️</button>
            </div>
          </div>
        </div>

        <!-- Título -->
        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug break-words">
          ${c.title}
        </h4>

        <!-- Descrição Colapsável -->
        ${c.description ? `
          <p id="desc-${c.id}" class="hidden text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-normal break-words pt-1.5 border-t border-slate-100 dark:border-slate-800/40 animate-card-in">
            ${c.description}
          </p>
        ` : ''}

        <!-- Rodapé do Card -->
        <div class="border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between gap-2 mt-1 select-none">
          <div class="flex flex-col gap-1 overflow-hidden">
            <span class="block text-[8px] text-slate-350 dark:text-slate-600 font-bold uppercase tracking-wider leading-none">Prazo</span>
            <span class="text-[9px] text-slate-500 dark:text-slate-455 font-bold leading-none">${formatarDataBr(c.date)}</span>
          </div>
          
          <div class="flex items-center gap-2 shrink-0 select-none">
            <!-- Prioridade badge -->
            <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${prioridadeClass}">
              ${labelMap[c.priority]}
            </span>

            <!-- Avatar -->
            <div title="Responsável: ${c.owner || 'Não definido'}" class="w-6 h-6 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-extrabold rounded-lg flex items-center justify-center text-[9px] shadow-sm select-none border border-white/10 dark:border-slate-800">
              ${siglaOwner}
            </div>
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Inicializa o SortableJS para drag-and-drop de cards
   */
  private setupColumnDragAndDrop(): void {
    this.columns.forEach(col => {
      const container = document.getElementById(`cards-container-${col.id}`);
      if (!container) return;

      Sortable.create(container, {
        group: 'todo-kanban-cards',
        animation: 200,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        draggable: '[data-card-id]',
        onEnd: (e) => {
          const cardId = e.item.getAttribute('data-card-id');
          const targetColId = e.to.getAttribute('data-col-target-id');
          
          if (cardId && targetColId) {
            // Atualiza a coluna no array de cartões
            const card = this.cards.find(c => c.id === cardId);
            if (card) {
              card.columnId = targetColId;
              this.saveState();
              this.renderColumns(); // Redesenha para atualizar contadores e slots vazios
            }
          }
        }
      });
    });
  }

  /**
   * Associa eventos aos elementos das colunas
   */
  private setupColumnActionListeners(): void {
    // Botão Adicionar Rápido na Coluna
    document.querySelectorAll('[data-add-card-in-col]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const colId = btn.getAttribute('data-add-card-in-col');
        if (colId) this.openCardModal(null, colId);
      });
    });

    // Botões Editar Cartão
    document.querySelectorAll('[data-edit-card-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = btn.getAttribute('data-edit-card-id');
        if (cardId) this.openCardModal(cardId);
      });
    });

    // Botões Excluir Cartão
    document.querySelectorAll('[data-delete-card-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = btn.getAttribute('data-delete-card-id');
        if (cardId && confirm('Deseja realmente excluir este cartão de prioridade?')) {
          this.cards = this.cards.filter(c => c.id !== cardId);
          this.saveState();
          this.renderColumns();
        }
      });
    });

    // Botão Toggle da Descrição
    document.querySelectorAll('[data-toggle-desc-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = btn.getAttribute('data-toggle-desc-id');
        if (!cardId) return;

        const descEl = document.getElementById(`desc-${cardId}`);
        if (descEl) {
          const isHidden = descEl.classList.contains('hidden');
          if (isHidden) {
            descEl.classList.remove('hidden');
            btn.textContent = '▲';
            btn.classList.add('text-indigo-500', 'dark:text-indigo-400');
          } else {
            descEl.classList.add('hidden');
            btn.textContent = '▼';
            btn.classList.remove('text-indigo-500', 'dark:text-indigo-400');
          }
        }
      });
    });
  }

  /**
   * Associa eventos aos botões e filtros globais
   */
  private setupGlobalEventListeners(): void {
    // Alternância de Tema
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('#todo-theme-toggle');
      if (btn) {
        e.preventDefault();
        this.toggleTheme();
      }
    });

    // Botão Criar Cartão Global
    document.getElementById('btn-novo-card')?.addEventListener('click', () => {
      const firstCol = this.columns[0]?.id || '';
      this.openCardModal(null, firstCol);
    });

    // Botão Gerenciar Colunas
    document.getElementById('btn-gerenciar-colunas')?.addEventListener('click', () => {
      this.openColumnsModal();
    });

    // Barra de Busca
    const searchInput = document.getElementById('input-todo-busca') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchFilter = (e.target as HTMLInputElement).value;
      this.renderColumns();
    });

    // Filtro de Prioridade
    const prioritySelect = document.getElementById('select-todo-prioridade-filter') as HTMLSelectElement;
    prioritySelect?.addEventListener('change', (e) => {
      this.priorityFilter = (e.target as HTMLSelectElement).value;
      this.renderColumns();
    });

    // Botão Exportar JSON
    document.getElementById('btn-exportar')?.addEventListener('click', () => {
      this.exportBoard();
    });

    // Botão Importar JSON (Dispara input oculto)
    const btnImportar = document.getElementById('btn-importar');
    const inputImportarFile = document.getElementById('input-importar-file') as HTMLInputElement;
    btnImportar?.addEventListener('click', () => {
      inputImportarFile?.click();
    });

    // Listener do upload de arquivo JSON
    inputImportarFile?.addEventListener('change', (e) => {
      const file = inputImportarFile.files?.[0];
      if (file) {
        this.importBoard(file);
      }
    });
  }

  /**
   * Abre o Modal de Criar ou Editar Cartão
   */
  private openCardModal(cardId: string | null = null, defaultColId: string = ''): void {
    const portal = document.getElementById('todo-modal-portal');
    if (!portal) return;

    const card = cardId ? this.cards.find(c => c.id === cardId) : null;
    const isEditing = !!card;

    // Data de hoje formatada YYYY-MM-DD
    const hoje = new Date().toISOString().split('T')[0];

    portal.innerHTML = `
      <div id="todo-card-modal-overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center opacity-0 transition-opacity duration-300">
        <div id="todo-card-modal-card" class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-all duration-300 p-6 flex flex-col gap-4">
          
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 class="text-lg font-black text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <span>${isEditing ? '✏️ Editar Cartão' : '➕ Novo Cartão de Prioridade'}</span>
            </h3>
            <button id="btn-close-card-modal" class="text-slate-400 hover:text-rose-500 font-bold transition">✕</button>
          </div>

          <form id="form-todo-card" class="space-y-4">
            <!-- Título -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Título do Cartão *</label>
              <input id="todo-card-title" type="text" required placeholder="ex: Desenhar fluxo de logins" value="${card?.title || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-medium text-sm" />
            </div>

            <!-- Descrição -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição / Detalhamento</label>
              <textarea id="todo-card-description" placeholder="Descreva as especificações ou o escopo desta prioridade..." rows="3" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-medium text-sm">${card?.description || ''}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Prazo -->
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Prazo Limite *</label>
                <input id="todo-card-date" type="date" required value="${card?.date || hoje}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-medium text-sm" />
              </div>

              <!-- Categoria / Tag -->
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Etiqueta / Tag *</label>
                <input id="todo-card-label" type="text" required placeholder="ex: Feature, Mapeamento" value="${card?.label || 'Feature'}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-medium text-sm" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Prioridade -->
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nível de Prioridade *</label>
                <select id="todo-card-priority" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-medium text-sm">
                  <option value="low" ${card?.priority === 'low' ? 'selected' : ''}>🟢 Baixa</option>
                  <option value="medium" ${!card || card.priority === 'medium' ? 'selected' : ''}>🔵 Média</option>
                  <option value="high" ${card?.priority === 'high' ? 'selected' : ''}>🟡 Alta</option>
                  <option value="urgent" ${card?.priority === 'urgent' ? 'selected' : ''}>🔴 Urgente</option>
                </select>
              </div>

              <!-- Dono -->
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dono / Responsável *</label>
                <input id="todo-card-owner" type="text" required placeholder="ex: Fernanda Ganem" value="${card?.owner || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-medium text-sm" />
              </div>
            </div>

            <!-- Coluna destino -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Coluna de Destino *</label>
              <select id="todo-card-column" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-medium text-sm">
                ${this.columns.map(col => `
                  <option value="${col.id}" ${
                    isEditing 
                      ? (card.columnId === col.id ? 'selected' : '') 
                      : (defaultColId === col.id ? 'selected' : '')
                  }>${col.title}</option>
                `).join('')}
              </select>
            </div>

            <!-- Botões -->
            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button id="btn-cancel-card-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
              <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">
                ${isEditing ? 'Salvar Alterações' : 'Criar Cartão'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Animação de abertura
    const overlay = document.getElementById('todo-card-modal-overlay');
    const modal = document.getElementById('todo-card-modal-card');
    
    setTimeout(() => {
      overlay?.classList.add('opacity-100');
      modal?.classList.remove('scale-95');
      modal?.classList.add('scale-100');
    }, 10);

    // Ouvintes de fechamento
    const handleClose = () => {
      modal?.classList.remove('scale-100');
      modal?.classList.add('scale-95');
      overlay?.classList.remove('opacity-100');
      setTimeout(() => portal.innerHTML = '', 300);
    };

    document.getElementById('btn-close-card-modal')?.addEventListener('click', handleClose);
    document.getElementById('btn-cancel-card-modal')?.addEventListener('click', handleClose);

    // Formulário Submit
    const form = document.getElementById('form-todo-card') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = (document.getElementById('todo-card-title') as HTMLInputElement).value;
      const description = (document.getElementById('todo-card-description') as HTMLTextAreaElement).value;
      const date = (document.getElementById('todo-card-date') as HTMLInputElement).value;
      const label = (document.getElementById('todo-card-label') as HTMLInputElement).value;
      const priority = (document.getElementById('todo-card-priority') as HTMLSelectElement).value as any;
      const owner = (document.getElementById('todo-card-owner') as HTMLInputElement).value;
      const columnId = (document.getElementById('todo-card-column') as HTMLSelectElement).value;

      if (isEditing && card) {
        // Editar
        card.title = title;
        card.description = description;
        card.date = date;
        card.label = label;
        card.priority = priority;
        card.owner = owner;
        card.columnId = columnId;
        this.showToast('Cartão de prioridade atualizado!');
      } else {
        // Criar Novo
        const newCard: TodoCard = {
          id: 'card-' + Date.now(),
          columnId,
          title,
          description,
          date,
          label,
          priority,
          owner
        };
        this.cards.push(newCard);
        this.showToast('Novo cartão adicionado com sucesso!');
      }

      this.saveState();
      this.renderColumns();
      handleClose();
    });
  }

  /**
   * Abre o Modal de Gerenciamento de Colunas
   */
  private openColumnsModal(): void {
    const portal = document.getElementById('todo-modal-portal');
    if (!portal) return;

    portal.innerHTML = `
      <div id="todo-cols-modal-overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center opacity-0 transition-opacity duration-300">
        <div id="todo-cols-modal-card" class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-all duration-300 p-6 flex flex-col gap-4">
          
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 class="text-lg font-black text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <span>⚙️ Configurar Colunas</span>
            </h3>
            <button id="btn-close-cols-modal" class="text-slate-400 hover:text-rose-500 font-bold transition">✕</button>
          </div>

          <div class="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1" id="manage-cols-list-container">
            ${this.columns.map((col, idx) => `
              <div class="flex items-center gap-2 p-2 border border-slate-200/60 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-850/40">
                <span class="text-slate-400 dark:text-slate-650 font-bold text-xs select-none pl-1">#${idx + 1}</span>
                <input type="text" data-col-edit-id="${col.id}" value="${col.title}" class="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <button data-delete-col-id="${col.id}" class="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-lg transition text-xs" title="Remover Coluna">
                  🗑️
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Adicionar Nova Coluna Inline -->
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Adicionar Nova Coluna</label>
            <div class="flex gap-2">
              <input id="input-new-column-title" type="text" placeholder="ex: ⚡ Prioridade Crítica" class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button id="btn-add-column-inline" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg shadow-sm transition uppercase">
                Inserir
              </button>
            </div>
          </div>

          <!-- Botões de Fechar -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-save-cols" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">
              Aplicar e Salvar
            </button>
          </div>

        </div>
      </div>
    `;

    // Animação de abertura
    const overlay = document.getElementById('todo-cols-modal-overlay');
    const modal = document.getElementById('todo-cols-modal-card');
    
    setTimeout(() => {
      overlay?.classList.add('opacity-100');
      modal?.classList.remove('scale-95');
      modal?.classList.add('scale-100');
    }, 10);

    const handleClose = () => {
      modal?.classList.remove('scale-100');
      modal?.classList.add('scale-95');
      overlay?.classList.remove('opacity-100');
      setTimeout(() => portal.innerHTML = '', 300);
    };

    document.getElementById('btn-close-cols-modal')?.addEventListener('click', handleClose);

    // Inserir Nova Coluna Inline
    document.getElementById('btn-add-column-inline')?.addEventListener('click', () => {
      const input = document.getElementById('input-new-column-title') as HTMLInputElement;
      const val = input.value.trim();
      if (!val) return;

      const newColId = 'col-' + Date.now();
      this.columns.push({ id: newColId, title: val });
      
      // Recarrega o modal de colunas para listar a recém-criada
      handleClose();
      setTimeout(() => this.openColumnsModal(), 300);
    });

    // Excluir Coluna
    document.querySelectorAll('[data-delete-col-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const colId = btn.getAttribute('data-delete-col-id');
        if (!colId) return;

        // Valida se a coluna possui cards ativos
        const cardCount = this.cards.filter(c => c.columnId === colId).length;
        if (cardCount > 0) {
          alert(`Esta coluna possui ${cardCount} cartões vinculados. Transfira os cartões antes de removê-la!`);
          return;
        }

        this.columns = this.columns.filter(col => col.id !== colId);
        
        handleClose();
        setTimeout(() => this.openColumnsModal(), 300);
      });
    });

    // Salvar Alterações de Nomes
    document.getElementById('btn-save-cols')?.addEventListener('click', () => {
      let mudouAlgum = false;

      document.querySelectorAll('[data-col-edit-id]').forEach(input => {
        const colId = input.getAttribute('data-col-edit-id');
        const val = (input as HTMLInputElement).value.trim();
        
        if (colId && val) {
          const col = this.columns.find(col => col.id === colId);
          if (col && col.title !== val) {
            col.title = val;
            mudouAlgum = true;
          }
        }
      });

      this.saveState();
      this.renderColumns();
      this.showToast('Estrutura de colunas atualizada!');
      handleClose();
    });
  }

  /**
   * Exporta os cartões e colunas para um arquivo JSON
   */
  private exportBoard(): void {
    const payload = {
      app: 'PaxFlow Todo Board',
      exportDate: new Date().toISOString(),
      columns: this.columns,
      cards: this.cards
    };

    const strJson = JSON.stringify(payload, null, 2);
    const blob = new Blob([strJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `paxflow-prioridades-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Limpeza
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    this.showToast('Quadro exportado com sucesso em JSON!');
  }

  /**
   * Importa dados de um arquivo JSON
   */
  private importBoard(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (data.app !== 'PaxFlow Todo Board' || !Array.isArray(data.columns) || !Array.isArray(data.cards)) {
          throw new Error('Arquivo JSON inválido para o PaxFlow Prioridades.');
        }

        // Sobrescreve
        this.columns = data.columns;
        this.cards = data.cards;

        this.saveState();
        this.renderColumns();
        this.showToast('Importação de prioridades concluída com sucesso!', 'success');

      } catch (err: any) {
        alert(`❌ Falha na importação:\n\n${err.message || 'Verifique se o arquivo JSON está formatado corretamente.'}`);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Exibe mensagens flutuantes temporárias (Toast)
   */
  private showToast(msg: string, type: 'success' | 'info' = 'success'): void {
    const toastId = 'todo-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-2xl text-white font-bold text-xs z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      document.body.appendChild(toast);
    }

    toast.className = `fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-2xl text-white font-bold text-xs z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 bg-slate-800 dark:bg-slate-900 border border-slate-700/50`;
    toast.innerHTML = `⚙️ ${msg}`;

    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-2xl text-white font-bold text-xs z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      }
    }, 2500);
  }
}

// Inicializa o Kanban ao carregar
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const appEl = document.getElementById('todo-app');
    if (appEl) {
      const board = new TodoKanban(appEl);
      board.init();
    }
  });
}
