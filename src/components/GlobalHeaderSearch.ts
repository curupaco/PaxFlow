import { BalcaoService, ResultadoBuscaBalcao } from '../services/balcaoService';
import { supabase } from '../services/supabase';

export class GlobalHeaderSearch {
  private static instance: GlobalHeaderSearch | null = null;
  private container: HTMLElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private dropdownEl: HTMLElement | null = null;
  private searchTimeout: any = null;

  public static init(container: HTMLElement): GlobalHeaderSearch {
    if (!GlobalHeaderSearch.instance) {
      GlobalHeaderSearch.instance = new GlobalHeaderSearch(container);
    } else {
      GlobalHeaderSearch.instance.container = container;
      GlobalHeaderSearch.instance.render();
    }
    return GlobalHeaderSearch.instance;
  }

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    if (!this.container) return;

    const html = `
      <header id="global-header-bar" class="min-h-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 md:pt-safe py-2 flex items-center justify-between gap-4 shrink-0 z-40 w-full max-w-full">
        <div class="relative flex-1 max-w-xl">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input id="global-search-input" type="text" placeholder="Pesquisar em toda a agência..." class="w-full text-xs font-semibold pl-10 pr-12 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner" />
            <kbd class="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono rounded border border-slate-300/60 dark:border-slate-700/60 absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none font-bold">/</kbd>
            <button id="btn-clear-global-search" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 hidden text-xs font-bold">✕</button>
          </div>

          <!-- Dropdown Instantâneo Co-Piloto -->
          <div id="global-search-dropdown" class="hidden absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-y-auto z-[999] max-h-[75vh] custom-scrollbar p-2">
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-[11px] font-black text-indigo-600 dark:text-indigo-400 shrink-0">
            <span>🤝</span> Modo Co-Piloto Ativo
          </div>
        </div>
      </header>
    `;

    this.container.innerHTML = html;
    this.inputEl = this.container.querySelector('#global-search-input');
    this.dropdownEl = this.container.querySelector('#global-search-dropdown');

    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.inputEl || !this.dropdownEl) return;

    const clearBtn = this.container?.querySelector('#btn-clear-global-search') as HTMLElement;

    this.inputEl.addEventListener('input', (e) => {
      const q = (e.target as HTMLInputElement).value;

      if (clearBtn) {
        clearBtn.classList.toggle('hidden', q.length === 0);
      }

      clearTimeout(this.searchTimeout);

      if (q.trim().length < 2) {
        this.dropdownEl!.classList.add('hidden');
        return;
      }

      this.dropdownEl!.classList.remove('hidden');
      this.dropdownEl!.innerHTML = `
        <div class="p-4 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
          🔍 Consultando base de dados em tempo real...
        </div>
      `;

      this.searchTimeout = setTimeout(async () => {
        const resultados = await BalcaoService.buscarMulticriterio(q);
        this.renderSearchResults(q, resultados);
      }, 250);
    });

    clearBtn?.addEventListener('click', () => {
      if (this.inputEl) {
        this.inputEl.value = '';
        this.inputEl.focus();
      }
      if (clearBtn) clearBtn.classList.add('hidden');
      if (this.dropdownEl) this.dropdownEl.classList.add('hidden');
    });

    // Atalho de teclado '/' para focar no campo de busca global
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName || ''))) {
        e.preventDefault();
        this.inputEl?.focus();
        this.inputEl?.select();
      }
    });

    // Oculta ao clicar fora
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!this.container?.contains(target)) {
        if (this.dropdownEl) this.dropdownEl.classList.add('hidden');
      }
    });
  }

  private renderSearchResults(query: string, resultados: ResultadoBuscaBalcao[]): void {
    if (!this.dropdownEl) return;

    // Sanitiza e deduplica por ID
    const resultadosSanitizados = resultados.map(res => {
      const vMap = new Map<string, any>();
      (res.viagens || []).forEach(v => {
        if (v && v.id && !vMap.has(v.id)) vMap.set(v.id, v);
      });

      const oMap = new Map<string, any>();
      (res.orcamentos || []).forEach(o => {
        if (o && o.id && !oMap.has(o.id)) oMap.set(o.id, o);
      });

      return {
        ...res,
        viagens: Array.from(vMap.values()),
        orcamentos: Array.from(oMap.values())
      };
    });

    let totalViagens = 0;
    let totalOrcamentos = 0;
    resultadosSanitizados.forEach(r => {
      totalViagens += r.viagens.length;
      totalOrcamentos += r.orcamentos.length;
    });

    const totalItens = resultadosSanitizados.length + totalViagens + totalOrcamentos;

    if (totalItens === 0) {
      this.dropdownEl.innerHTML = `
        <div class="p-5 text-center space-y-2">
          <div class="text-3xl">🔎</div>
          <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">Nenhum registro encontrado para "${query}"</h4>
          <p class="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
            Pesquisado em toda a agência nas tabelas <strong>clientes</strong> (nome, cpf, email, tel), <strong>viagens</strong> (destino, loc da viagem, produtos, aéreos, hotéis) e <strong>orçamentos</strong>.
          </p>
        </div>
      `;
      return;
    }

    // Se houver apenas 1 cliente, auto-expandir por padrão; se houver múltiplos, iniciar colapsado
    const autoExpand = resultadosSanitizados.length === 1;

    let html = `
      <div class="p-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-2 gap-2">
        <span class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate">
          🤝 Balcão (${resultadosSanitizados.length} cliente${resultadosSanitizados.length > 1 ? 's' : ''} · ${totalViagens} viagem${totalViagens > 1 ? 'ns' : ''} · ${totalOrcamentos} orç.)
        </span>
        ${resultadosSanitizados.length > 1 ? `
          <button id="btn-toggle-all-search-groups" class="shrink-0 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-md transition shadow-xs">
            ${autoExpand ? 'Recolher Todos ▴' : 'Expandir Todos ▾'}
          </button>
        ` : ''}
      </div>
      <div class="space-y-2.5" id="search-results-groups">
    `;

    resultadosSanitizados.forEach((res, idx) => {
      const isExpanded = autoExpand;
      const countViagens = res.viagens.length;
      const countOrcs = res.orcamentos.length;

      html += `
        <div class="client-search-card bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-2.5 transition">
          <!-- Cabeçalho do Cliente (Acordeão) -->
          <div class="client-search-header flex items-center justify-between gap-2 cursor-pointer select-none rounded-lg p-1 hover:bg-slate-200/40 dark:hover:bg-slate-700/40 transition" data-client-card-idx="${idx}">
            <div class="flex items-center gap-2 truncate">
              <span class="chevron-icon text-slate-400 text-xs font-black transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}">▶</span>
              <div class="truncate">
                <span class="font-black text-xs text-slate-800 dark:text-slate-100 block truncate">👤 ${res.cliente.nome}</span>
                <span class="text-[10px] text-slate-400 font-mono">
                  ${res.cliente.cpf ? `CPF: ${res.cliente.cpf}` : ''} 
                  ${res.cliente.telefone ? `· Tel: ${res.cliente.telefone}` : ''}
                  ${res.cliente.email ? `· ${res.cliente.email}` : ''}
                </span>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5 shrink-0">
              ${countViagens > 0 ? `
                <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-extrabold border border-blue-500/20">
                  ✈️ ${countViagens}
                </span>
              ` : ''}
              ${countOrcs > 0 ? `
                <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold border border-amber-500/20">
                  📋 ${countOrcs}
                </span>
              ` : ''}
            </div>
          </div>

          <!-- Conteúdo Colapsável com Viagens e Orçamentos -->
          <div class="client-search-body space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 mt-2 ${isExpanded ? '' : 'hidden'}">
            ${countViagens === 0 && countOrcs === 0 ? `
              <div class="text-[11px] text-slate-400 italic px-2 py-1">Nenhuma viagem ou orçamento vinculado no momento.</div>
            ` : ''}

            <!-- Viagens do Cliente -->
            ${res.viagens.map(v => `
              <div class="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-700/90 text-xs shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                <div class="truncate space-y-0.5 flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 dark:text-slate-100 truncate">✈️ ${v.titulo}</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                      v.status === 'confirmada' || v.status === 'concluida' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    }">
                      ${v.status}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 flex-wrap text-[10px]">
                    <span class="inline-flex items-center font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      🗓️ ${v.periodoFormatado || 'Data a definir'}
                    </span>
                    <span class="text-indigo-500 font-semibold">Consultor: ${v.consultorNome}</span>
                  </div>
                </div>
                <button class="global-open-trip shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase transition shadow-sm" data-trip-id="${v.id}">
                  Atender 🤝
                </button>
              </div>
            `).join('')}

            <!-- Orçamentos do Cliente -->
            ${res.orcamentos.map(o => `
              <div class="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-700/90 text-xs shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition">
                <div class="truncate space-y-0.5 flex-1 min-w-0">
                  <span class="block font-bold text-slate-800 dark:text-slate-100 truncate">📋 ${o.titulo}</span>
                  <div class="flex items-center gap-2 flex-wrap text-[10px]">
                    <span class="inline-flex items-center font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-800/50">
                      📅 ${o.dataFormatada || o.data || 'Sem data'}
                    </span>
                    <span class="font-extrabold text-slate-700 dark:text-slate-200">${o.total}</span>
                    <span class="text-slate-400">· Consultor: ${o.consultorNome}</span>
                  </div>
                </div>
                <button class="global-open-orc shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black uppercase transition shadow-sm" data-orc-id="${o.id}">
                  Atender 🤝
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.dropdownEl.innerHTML = html;

    // Toggle individual de cada cliente (Acordeão)
    this.dropdownEl.querySelectorAll('.client-search-header').forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = header.closest('.client-search-card');
        if (!card) return;
        const body = card.querySelector('.client-search-body');
        const chevron = header.querySelector('.chevron-icon');
        if (body) {
          const isHidden = body.classList.toggle('hidden');
          if (chevron) {
            chevron.classList.toggle('rotate-90', !isHidden);
          }
        }
      });
    });

    // Botão Expandir Todos / Recolher Todos
    const toggleAllBtn = this.dropdownEl.querySelector('#btn-toggle-all-search-groups');
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const allBodies = this.dropdownEl!.querySelectorAll('.client-search-body');
        const allChevrons = this.dropdownEl!.querySelectorAll('.chevron-icon');
        
        const isAnyHidden = Array.from(allBodies).some(b => b.classList.contains('hidden'));

        allBodies.forEach(b => {
          if (isAnyHidden) {
            b.classList.remove('hidden');
          } else {
            b.classList.add('hidden');
          }
        });

        allChevrons.forEach(c => {
          if (isAnyHidden) {
            c.classList.add('rotate-90');
          } else {
            c.classList.remove('rotate-90');
          }
        });

        toggleAllBtn.textContent = isAnyHidden ? 'Recolher Todos ▴' : 'Expandir Todos ▾';
      });
    }

    // Vincula cliques para resgate instantâneo
    this.dropdownEl.querySelectorAll('.global-open-trip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          this.dropdownEl!.classList.add('hidden');
          window.dispatchEvent(new CustomEvent('paxflow-navigate', { detail: { page: 'dashboard', extraId: tripId } }));
        }
      });
    });

    this.dropdownEl.querySelectorAll('.global-open-orc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orcId = btn.getAttribute('data-orc-id');
        if (orcId) {
          this.dropdownEl!.classList.add('hidden');
          window.dispatchEvent(new CustomEvent('paxflow-navigate', { detail: { page: 'orcamentos', extraId: orcId } }));
        }
      });
    });
  }
}
