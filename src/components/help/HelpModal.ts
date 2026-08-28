import { HELP_CATEGORIES, HELP_ITEMS } from '../../config/ajuda';

export class HelpModal {
  private static selectedCategory = 'all';
  private static searchQuery = '';

  /**
   * Abre o modal de Central de Ajuda.
   * Se targetHelpId for passado, foca, abre e rola até aquele item específico.
   */
  static open(targetHelpId?: string): void {
    let overlay = document.getElementById('ajuda-overlay');
    
    if (overlay) {
      if (targetHelpId) {
        this.highlightTerm(targetHelpId);
      }
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'ajuda-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col relative overflow-hidden" id="ajuda-card">
        
        <!-- Faixa gradiente no topo -->
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

        <!-- Cabeçalho -->
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug flex items-center gap-2">
              <span>📖</span> Central de Ajuda & Glossário
            </h2>
            <p class="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Entenda os campos, datas e métricas do sistema</p>
          </div>
          
          <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div class="relative w-full md:w-72">
              <input 
                id="input-ajuda-busca" 
                type="text" 
                placeholder="Buscar termo, recurso ou conceito..." 
                class="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition"
              />
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 text-xs">🔍</span>
              <span id="ajuda-search-count" class="hidden absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[9px]"></span>
            </div>
            
            <button 
              id="btn-ajuda-close" 
              class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition self-end md:self-auto"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Barra de Ateliê de Buscas Rápidas (Pílulas) -->
        <div class="px-6 py-2 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[10px] select-none shrink-0">
          <span class="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] mr-1 shrink-0">Atalhos:</span>
          <button data-quick-search="co-piloto" class="btn-ajuda-pill px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:border-indigo-500 hover:text-indigo-650 transition shrink-0">🤖 Co-piloto</button>
          <button data-quick-search="passaporte" class="btn-ajuda-pill px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:border-indigo-500 hover:text-indigo-650 transition shrink-0">🚨 Passaporte</button>
          <button data-quick-search="nps" class="btn-ajuda-pill px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:border-indigo-500 hover:text-indigo-650 transition shrink-0">⭐ NPS</button>
          <button data-quick-search="escala" class="btn-ajuda-pill px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:border-indigo-500 hover:text-indigo-650 transition shrink-0">📅 Escala</button>
          <button data-quick-search="reembolso" class="btn-ajuda-pill px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:border-indigo-500 hover:text-indigo-650 transition shrink-0">💸 Reembolso</button>
          <button data-quick-search="faturamento" class="btn-ajuda-pill px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:border-indigo-500 hover:text-indigo-650 transition shrink-0">📊 Faturamento</button>
        </div>

        <!-- Corpo do Modal (Sidebar + Conteúdo) -->
        <div class="flex flex-1 overflow-hidden">
          
          <!-- Sidebar (Categorias) - Visível no desktop -->
          <div class="w-full md:w-56 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto p-4 flex flex-col gap-1.5 select-none shrink-0 md:block hidden">
            <button 
              data-cat-id="all" 
              class="btn-ajuda-cat w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-black text-left transition select-none bg-indigo-50/50 text-indigo-650 dark:bg-indigo-950/30 dark:text-indigo-400"
            >
              <span>📂</span> Todos os Termos
            </button>
            ${HELP_CATEGORIES.map(cat => `
              <button 
                data-cat-id="${cat.id}" 
                class="btn-ajuda-cat w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-left transition select-none"
              >
                <span>${cat.icon}</span> ${cat.title}
              </button>
            `).join('')}
          </div>

          <!-- Conteúdo (Lista de Itens) -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" id="ajuda-itens-list">
            <!-- Injetado dinamicamente -->
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    // Animação de fade-in
    requestAnimationFrame(() => {
      overlay!.classList.remove('opacity-0');
      overlay!.classList.add('opacity-100');
      const card = document.getElementById('ajuda-card');
      card?.classList.remove('scale-95');
      card?.classList.add('scale-100');
    });

    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.renderItems();
    this.setupListeners(overlay);

    if (targetHelpId) {
      this.highlightTerm(targetHelpId);
    }
  }

  private static setupListeners(overlay: HTMLElement): void {
    const card = document.getElementById('ajuda-card');
    
    document.getElementById('btn-ajuda-close')?.addEventListener('click', () => this.close());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', handleKeyDown);
    (overlay as any)._handleKeyDown = handleKeyDown;

    const catButtons = card?.querySelectorAll('.btn-ajuda-cat');
    catButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => {
          b.classList.remove('bg-indigo-50/50', 'text-indigo-650', 'dark:bg-indigo-950/30', 'dark:text-indigo-400', 'font-black');
          b.classList.add('text-slate-500', 'dark:text-slate-400', 'font-bold');
        });
        btn.classList.add('bg-indigo-50/50', 'text-indigo-650', 'dark:bg-indigo-950/30', 'dark:text-indigo-400', 'font-black');
        btn.classList.remove('text-slate-500', 'dark:text-slate-400', 'font-bold');
        
        this.selectedCategory = btn.getAttribute('data-cat-id') || 'all';
        this.renderItems();
      });
    });

    const searchInput = document.getElementById('input-ajuda-busca') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value.toLowerCase().trim();
      this.renderItems();
    });

    // Pílulas de atalho rápido
    const pillButtons = card?.querySelectorAll('.btn-ajuda-pill');
    pillButtons?.forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.getAttribute('data-quick-search') || '';
        if (searchInput) {
          searchInput.value = query;
          this.searchQuery = query.toLowerCase();
          this.renderItems();
        }
      });
    });
  }

  private static highlightText(text: string, query: string): string {
    if (!query || query.length < 2) return text;
    try {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return text.replace(regex, '<mark class="bg-amber-200 dark:bg-amber-900/70 font-bold text-slate-900 dark:text-amber-100 px-0.5 rounded">$1</mark>');
    } catch {
      return text;
    }
  }

  private static renderItems(): void {
    const container = document.getElementById('ajuda-itens-list');
    const countEl = document.getElementById('ajuda-search-count');
    if (!container) return;

    const filtered = HELP_ITEMS.filter(item => {
      const matchesCategory = this.selectedCategory === 'all' || item.modulo === this.selectedCategory;
      const matchesSearch = !this.searchQuery || 
                            item.label.toLowerCase().includes(this.searchQuery) || 
                            item.description.toLowerCase().includes(this.searchQuery) ||
                            (item.details && item.details.toLowerCase().includes(this.searchQuery));
      return matchesCategory && matchesSearch;
    });

    if (countEl) {
      if (this.searchQuery) {
        countEl.textContent = `${filtered.length} termo(s)`;
        countEl.classList.remove('hidden');
      } else {
        countEl.classList.add('hidden');
      }
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <span class="text-3xl mb-3">🔍</span>
          <p class="text-sm font-bold text-slate-500 dark:text-slate-400">Nenhum termo encontrado para "${this.searchQuery}"</p>
          <p class="text-xs text-slate-400 dark:text-slate-400 mt-1">Tente buscar por termos mais genéricos como "passaporte", "nps", "reembolso" ou "escala".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const category = HELP_CATEGORIES.find(c => c.id === item.modulo);
      const highlightedLabel = this.highlightText(item.label, this.searchQuery);
      const highlightedDesc = this.highlightText(item.description, this.searchQuery);
      const highlightedDetails = item.details ? this.highlightText(item.details, this.searchQuery) : 'Nenhum detalhe adicional disponível.';

      return `
        <div 
          class="help-item-card bg-white dark:bg-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 transition-all duration-300 cursor-pointer shadow-sm relative group"
          data-item-id="${item.id}"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">${highlightedLabel}</h4>
                ${category ? `<span class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400 rounded text-[9px] font-black uppercase tracking-wider">${category.icon} ${category.title}</span>` : ''}
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">${highlightedDesc}</p>
            </div>
            <span class="expand-icon text-slate-400 transition-transform duration-300 text-xs shrink-0 select-none">▼</span>
          </div>
          
          <div class="details-section hidden mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-line">
            ${highlightedDetails}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.help-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const details = card.querySelector('.details-section');
        const icon = card.querySelector('.expand-icon');
        const isExpanded = !details?.classList.contains('hidden');

        if (isExpanded) {
          details?.classList.add('hidden');
          icon?.classList.remove('rotate-180');
          card.classList.remove('border-indigo-500/50', 'dark:border-indigo-500/30', 'bg-indigo-50/10', 'dark:bg-indigo-950/10');
        } else {
          details?.classList.remove('hidden');
          icon?.classList.add('rotate-180');
          card.classList.add('border-indigo-500/50', 'dark:border-indigo-500/30', 'bg-indigo-50/10', 'dark:bg-indigo-950/10');
        }
      });
    });
  }

  private static highlightTerm(itemId: string): void {
    const searchInput = document.getElementById('input-ajuda-busca') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
      this.searchQuery = '';
    }
    
    this.selectedCategory = 'all';
    
    const catButtons = document.querySelectorAll('.btn-ajuda-cat');
    catButtons.forEach(b => {
      b.classList.remove('bg-indigo-50/50', 'text-indigo-650', 'dark:bg-indigo-950/30', 'dark:text-indigo-400', 'font-black');
      b.classList.add('text-slate-500', 'dark:text-slate-400', 'font-bold');
      if (b.getAttribute('data-cat-id') === 'all') {
        b.classList.add('bg-indigo-50/50', 'text-indigo-650', 'dark:bg-indigo-950/30', 'dark:text-indigo-400', 'font-black');
        b.classList.remove('text-slate-500', 'dark:text-slate-400', 'font-bold');
      }
    });

    this.renderItems();

    setTimeout(() => {
      const card = document.querySelector(`.help-item-card[data-item-id="${itemId}"]`) as HTMLElement;
      if (card) {
        const details = card.querySelector('.details-section');
        const icon = card.querySelector('.expand-icon');
        details?.classList.remove('hidden');
        icon?.classList.add('rotate-180');
        card.classList.add('border-indigo-500/80', 'dark:border-indigo-500/50', 'bg-indigo-50/20', 'dark:bg-indigo-950/20', 'ring-2', 'ring-indigo-500/20');

        card.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
          card.classList.remove('ring-2', 'ring-indigo-500/20');
        }, 3000);
      }
    }, 100);
  }

  static close(): void {
    const overlay = document.getElementById('ajuda-overlay');
    if (!overlay) return;

    const handler = (overlay as any)._handleKeyDown;
    if (handler) {
      window.removeEventListener('keydown', handler);
    }

    const card = document.getElementById('ajuda-card');
    card?.classList.remove('scale-100');
    card?.classList.add('scale-95');
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');

    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}
