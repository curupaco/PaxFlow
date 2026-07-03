import { supabase } from '../services/supabase';
import { Destino } from '../types';

export class DestinosAutocomplete {
  private input: HTMLInputElement;
  private onSelect: (destino: Destino | null) => void;
  private destinos: Destino[] = [];
  private dropdown: HTMLDivElement | null = null;
  private selectedIndex: number = -1;
  private filteredDestinos: Destino[] = [];
  private selectedDestinoId: string | null = null;
  private clickListener: ((e: MouseEvent) => void) | null = null;

  constructor(input: HTMLInputElement, onSelect: (destino: Destino | null) => void, initialDestinoId: string | null = null) {
    this.input = input;
    this.onSelect = onSelect;
    this.selectedDestinoId = initialDestinoId;
    this.init();
  }

  private async init(): Promise<void> {
    // 1. Desativar o autocomplete padrão do navegador
    this.input.setAttribute('autocomplete', 'off');

    // 2. Buscar destinos
    await this.loadDestinos();

    // 3. Se houver destino inicial selecionado, preencher o input com o nome formatado
    if (this.selectedDestinoId && this.destinos.length > 0) {
      const found = this.destinos.find(d => d.id === this.selectedDestinoId);
      if (found) {
        this.input.value = `${found.nome}, ${found.pais}`;
      }
    }

    // 4. Configurar eventos
    this.setupEvents();
  }

  /**
   * Carrega os destinos do Supabase
   */
  private async loadDestinos(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('destinos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      this.destinos = data || [];
    } catch (err) {
      console.error('Erro ao carregar destinos para o autocomplete:', err);
      this.destinos = [];
    }
  }

  /**
   * Configura listeners de eventos do input
   */
  private setupEvents(): void {
    // Escutar digitação
    this.input.addEventListener('input', () => {
      this.filterAndShow();
    });

    // Escutar foco
    this.input.addEventListener('focus', () => {
      this.filterAndShow();
    });

    // Escutar teclas
    this.input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.dropdown) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredDestinos.length - 1);
        this.highlightItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.highlightItem();
      } else if (e.key === 'Enter') {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredDestinos.length) {
          e.preventDefault();
          this.selectItem(this.filteredDestinos[this.selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeDropdown();
      }
    });

    // Fechar ao clicar fora
    this.clickListener = (e: MouseEvent) => {
      if (this.dropdown && !this.input.contains(e.target as Node) && !this.dropdown.contains(e.target as Node)) {
        this.closeDropdown();
        // Se o usuário digitou e saiu sem selecionar nada válido, restaurar o valor do destino selecionado
        this.validateInputValue();
      }
    };
    document.addEventListener('click', this.clickListener);
  }

  /**
   * Filtra os destinos com base no texto digitado e exibe o dropdown
   */
  private filterAndShow(): void {
    const query = this.input.value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Se a query for vazia, mostra todos os destinos cadastrados (ou limita para os primeiros 30 para performance)
    if (!query) {
      this.filteredDestinos = this.destinos.slice(0, 40);
    } else {
      this.filteredDestinos = this.destinos.filter(d => {
        const nomeClean = d.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const paisClean = d.pais.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return nomeClean.includes(query) || paisClean.includes(query);
      });
    }

    this.selectedIndex = -1;
    this.renderDropdown();
  }

  /**
   * Renderiza a lista flutuante sob o input
   */
  private renderDropdown(): void {
    this.closeDropdown();

    if (this.filteredDestinos.length === 0) {
      // Exibe mensagem de "Nenhum destino encontrado"
      this.createDropdownContainer();
      if (this.dropdown) {
        this.dropdown.innerHTML = `
          <div class="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 font-semibold italic text-center">
            Nenhum destino encontrado
          </div>
        `;
      }
      return;
    }

    this.createDropdownContainer();
    if (!this.dropdown) return;

    const listHtml = this.filteredDestinos.map((dest, idx) => {
      // Ignorar prefixo "ARRUMAR | " na exibição das sugestões normais
      const isArrumar = dest.nome.startsWith('ARRUMAR | ');
      const displayName = isArrumar ? dest.nome.replace('ARRUMAR | ', '⚠️ Arrumar: ') : dest.nome;
      const displayPais = isArrumar ? '' : `, ${dest.pais}`;

      return `
        <div data-idx="${idx}" class="item-autocomplete px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors flex items-center justify-between rounded-lg">
          <div class="flex items-center gap-2">
            <span>📍</span>
            <span>${displayName}${displayPais}</span>
          </div>
          ${dest.id === this.selectedDestinoId ? '<span class="text-indigo-500 text-[10px]">✓</span>' : ''}
        </div>
      `;
    }).join('');

    this.dropdown.innerHTML = `<div class="p-1.5 space-y-0.5 max-h-[220px] overflow-y-auto custom-scrollbar">${listHtml}</div>`;

    // Associar cliques aos itens
    this.dropdown.querySelectorAll('.item-autocomplete').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = Number(el.getAttribute('data-idx'));
        this.selectItem(this.filteredDestinos[idx]);
      });
    });
  }

  private createDropdownContainer(): void {
    const parent = this.input.parentElement;
    if (!parent) return;

    // Garantir que o container pai tenha posição relativa
    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'absolute left-0 right-0 mt-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-2xl z-50 transition-all duration-200 custom-scrollbar overflow-hidden';
    
    // Posicionamento absoluto sob o input
    this.dropdown.style.top = `${this.input.offsetTop + this.input.offsetHeight}px`;
    this.dropdown.style.left = `${this.input.offsetLeft}px`;
    this.dropdown.style.width = `${this.input.offsetWidth}px`;

    parent.appendChild(this.dropdown);
  }

  private highlightItem(): void {
    if (!this.dropdown) return;
    const items = this.dropdown.querySelectorAll('.item-autocomplete');
    items.forEach((item, idx) => {
      if (idx === this.selectedIndex) {
        item.classList.add('bg-indigo-50', 'dark:bg-indigo-950/45', 'text-indigo-600', 'dark:text-indigo-400');
        // Rolar o dropdown se o item estiver fora de vista
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('bg-indigo-50', 'dark:bg-indigo-950/45', 'text-indigo-600', 'dark:text-indigo-400');
      }
    });
  }

  private selectItem(destino: Destino): void {
    this.selectedDestinoId = destino.id;
    
    const isArrumar = destino.nome.startsWith('ARRUMAR | ');
    const displayName = isArrumar ? destino.nome : `${destino.nome}, ${destino.pais}`;

    this.input.value = displayName;
    this.onSelect(destino);
    this.closeDropdown();
  }

  private closeDropdown(): void {
    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }
  }

  /**
   * Valida se a digitação manual bate com o destino selecionado.
   * Se não bater, reseta ou limpa o campo.
   */
  private validateInputValue(): void {
    const val = this.input.value.trim().toLowerCase();
    
    if (!val) {
      this.selectedDestinoId = null;
      this.onSelect(null);
      return;
    }

    // Se houver um destino selecionado, checa se a digitação bate com ele
    if (this.selectedDestinoId) {
      const found = this.destinos.find(d => d.id === this.selectedDestinoId);
      if (found) {
        const fullStr = `${found.nome}, ${found.pais}`.toLowerCase();
        const shortStr = found.nome.toLowerCase();
        if (val === fullStr || val === shortStr || val === found.nome.toLowerCase() + ', ' + found.pais.toLowerCase()) {
          this.input.value = `${found.nome}, ${found.pais}`;
          return;
        }
      }
    }

    // Tentar correspondência parcial na lista com o texto digitado
    const match = this.destinos.find(d => {
      const full = `${d.nome}, ${d.pais}`.toLowerCase();
      return full === val || d.nome.toLowerCase() === val;
    });

    if (match) {
      this.selectItem(match);
    } else {
      // Sem correspondência: limpa o campo para forçar seleção válida
      this.input.value = '';
      this.selectedDestinoId = null;
      this.onSelect(null);
    }
  }

  /**
   * Define manualmente o destino selecionado no autocomplete
   */
  public setVal(destinoId: string | null): void {
    this.selectedDestinoId = destinoId;
    if (!destinoId) {
      this.input.value = '';
      return;
    }
    const found = this.destinos.find(d => d.id === destinoId);
    if (found) {
      this.input.value = `${found.nome}, ${found.pais}`;
    }
  }

  public getSelectedId(): string | null {
    return this.selectedDestinoId;
  }

  public destroy(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
    this.closeDropdown();
  }
}
