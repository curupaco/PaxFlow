import { ItemExtratoRecebimento } from '../../controllers/relatoriosController';

export interface ExtratoRecebimentosOptions {
  itens: ItemExtratoRecebimento[];
  formaInicial?: string;
  consultores?: Array<{ id: string; nome: string }>;
  formasDisponiveis?: Array<{ id: string; nome: string; icone?: string }>;
  onAbrirViagem?: (viagemId: string) => void;
}

export class ExtratoRecebimentosModal {
  private static modalEl: HTMLElement | null = null;
  private static options: ExtratoRecebimentosOptions | null = null;
  private static filtroForma: string = 'TODAS';
  private static filtroConsultor: string = 'TODOS';
  private static termoBusca: string = '';

  public static open(options: ExtratoRecebimentosOptions): void {
    this.options = options;
    this.filtroForma = options.formaInicial || 'TODAS';
    this.filtroConsultor = 'TODOS';
    this.termoBusca = '';

    this.render();
  }

  public static close(): void {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
    }
  }

  private static render(): void {
    this.close();

    const allItens = this.options?.itens || [];
    
    // Extrai formas únicas presentes nos dados
    const formasSet = new Set<string>();
    allItens.forEach(i => formasSet.add(i.formaRecebimentoNome));
    const formasList = Array.from(formasSet).sort();

    // Extrai consultores únicos
    const consultoresMap = new Map<string, string>();
    allItens.forEach(i => {
      if (i.consultorId) consultoresMap.set(i.consultorId, i.consultorNome);
    });

    const modalHTML = `
      <div id="modal-extrato-recebimentos" class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
          
          <!-- Cabeçalho -->
          <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
            <div class="flex items-center gap-3">
              <span class="text-2xl p-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 rounded-xl">🪙</span>
              <div>
                <h3 class="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Extrato de Recebimentos por Meio de Pagamento</span>
                </h3>
                <p class="text-xs text-slate-400 font-semibold">
                  Auditoria detalhada de entradas financeiras e produtos vinculados aos localizadores
                </p>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button id="btn-exportar-csv-extrato" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                <span>📥</span> Exportar CSV
              </button>
              <button id="btn-close-extrato-recebimentos" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition text-base font-bold cursor-pointer">
                ✕
              </button>
            </div>
          </div>

          <!-- Barra de Filtros e Busca -->
          <div class="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <!-- Busca textual -->
              <div class="relative flex-1 min-w-[200px]">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">🔍</span>
                <input id="input-busca-extrato" type="text" placeholder="Buscar por cliente, destino, LOC ou fornecedor..." value="${this.termoBusca}" class="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 dark:text-slate-100 transition shadow-inner" />
              </div>

              <!-- Filtro Meio de Pagamento -->
              <select id="select-forma-extrato" class="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition">
                <option value="TODAS" ${this.filtroForma === 'TODAS' ? 'selected' : ''}>🪙 Todos os Meios de Recebimento</option>
                ${formasList.map(f => `<option value="${f}" ${this.filtroForma === f ? 'selected' : ''}>${f}</option>`).join('')}
              </select>

              <!-- Filtro Consultor -->
              <select id="select-consultor-extrato" class="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition">
                <option value="TODOS" ${this.filtroConsultor === 'TODOS' ? 'selected' : ''}>👤 Todos os Consultores</option>
                ${Array.from(consultoresMap.entries()).map(([id, nome]) => `<option value="${id}" ${this.filtroConsultor === id ? 'selected' : ''}>${nome}</option>`).join('')}
              </select>
            </div>

            <!-- Resumo Rápido -->
            <div id="extrato-resumo-kpis" class="flex items-center gap-3"></div>
          </div>

          <!-- Tabela de Resultados com Scroll -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-4" id="extrato-tabela-container">
          </div>

          <!-- Rodapé -->
          <div class="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center text-[11px] text-slate-400 font-semibold px-5">
            <span>Dica: Clique no botão 📋 para copiar o Localizador ou em "Abrir ↗" para conferir a ficha da viagem.</span>
            <button id="btn-fechar-extrato-rodape" class="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer">
              Fechar
            </button>
          </div>

        </div>
      </div>
    `;

    const tempWrapper = document.createElement('div');
    tempWrapper.innerHTML = modalHTML;
    this.modalEl = tempWrapper.firstElementChild as HTMLElement;
    document.body.appendChild(this.modalEl);

    this.setupListeners();
    this.renderTabela();
  }

  private static setupListeners(): void {
    if (!this.modalEl) return;

    // Fechar Modal
    const handleClose = () => this.close();
    this.modalEl.querySelector('#btn-close-extrato-recebimentos')?.addEventListener('click', handleClose);
    this.modalEl.querySelector('#btn-fechar-extrato-rodape')?.addEventListener('click', handleClose);

    // Fechar com ESC
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Busca textual
    const inputBusca = this.modalEl.querySelector('#input-busca-extrato') as HTMLInputElement;
    inputBusca?.addEventListener('input', (e) => {
      this.termoBusca = (e.target as HTMLInputElement).value;
      this.renderTabela();
    });

    // Filtro Forma
    const selectForma = this.modalEl.querySelector('#select-forma-extrato') as HTMLSelectElement;
    selectForma?.addEventListener('change', (e) => {
      this.filtroForma = (e.target as HTMLSelectElement).value;
      this.renderTabela();
    });

    // Filtro Consultor
    const selectConsultor = this.modalEl.querySelector('#select-consultor-extrato') as HTMLSelectElement;
    selectConsultor?.addEventListener('change', (e) => {
      this.filtroConsultor = (e.target as HTMLSelectElement).value;
      this.renderTabela();
    });

    // Exportar CSV
    this.modalEl.querySelector('#btn-exportar-csv-extrato')?.addEventListener('click', () => {
      this.exportarCSV();
    });
  }

  private static getItensFiltrados(): ItemExtratoRecebimento[] {
    let itens = this.options?.itens || [];

    if (this.filtroForma !== 'TODAS') {
      itens = itens.filter(i => i.formaRecebimentoNome.trim().toUpperCase() === this.filtroForma.trim().toUpperCase());
    }

    if (this.filtroConsultor !== 'TODOS') {
      itens = itens.filter(i => i.consultorId === this.filtroConsultor);
    }

    if (this.termoBusca.trim().length > 0) {
      const q = this.termoBusca.toLowerCase().trim();
      itens = itens.filter(i => {
        const matchCli = i.clienteNome.toLowerCase().includes(q);
        const matchDest = i.destino.toLowerCase().includes(q);
        const matchLoc = i.codigoLocalizador.toLowerCase().includes(q);
        const matchRef = i.viagemCodigoRef.toLowerCase().includes(q);
        const matchForma = i.formaRecebimentoNome.toLowerCase().includes(q);
        const matchConsultor = i.consultorNome.toLowerCase().includes(q);
        const matchProds = i.produtosVinculados.some(p => 
          p.fornecedor.toLowerCase().includes(q) || 
          p.descricao.toLowerCase().includes(q) || 
          p.tipo.toLowerCase().includes(q)
        );

        return matchCli || matchDest || matchLoc || matchRef || matchForma || matchConsultor || matchProds;
      });
    }

    return itens;
  }

  private static renderTabela(): void {
    if (!this.modalEl) return;

    const itensFiltrados = this.getItensFiltrados();
    const totalValor = itensFiltrados.reduce((sum, i) => sum + i.valor, 0);
    const totalViagensSet = new Set(itensFiltrados.map(i => i.viagemId));

    // Atualiza KPIs no cabeçalho
    const kpisEl = this.modalEl.querySelector('#extrato-resumo-kpis');
    if (kpisEl) {
      kpisEl.innerHTML = `
        <div class="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-right">
          <span class="block text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Total do Filtro</span>
          <span class="block text-xs font-black text-slate-800 dark:text-slate-100">
            ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor)}
          </span>
        </div>
        <div class="hidden sm:block px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-right text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <span>${itensFiltrados.length} lançamento(s)</span> &bull; <span>${totalViagensSet.size} viagem(ns)</span>
        </div>
      `;
    }

    const container = this.modalEl.querySelector('#extrato-tabela-container');
    if (!container) return;

    if (itensFiltrados.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center space-y-2">
          <div class="text-3xl">🔎</div>
          <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">Nenhum recebimento encontrado</h4>
          <p class="text-[11px] text-slate-400 max-w-md mx-auto">
            Tente ajustar os filtros por meio de pagamento, consultor ou limpar o termo de busca.
          </p>
        </div>
      `;
      return;
    }

    let rowsHTML = '';
    itensFiltrados.forEach(item => {
      const refBadge = item.viagemCodigoRef 
        ? `<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono font-bold text-slate-500 border border-slate-200 dark:border-slate-700">${item.viagemCodigoRef}</span>` 
        : '';

      const prodsHTML = item.produtosVinculados.length > 0
        ? item.produtosVinculados.map(p => `
            <div class="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300">
              <span class="font-bold text-indigo-600 dark:text-indigo-400">[${p.tipo}]</span>
              <span class="truncate max-w-[200px]">${p.fornecedor} ${p.descricao ? `· ${p.descricao}` : ''}</span>
              <span class="text-slate-400 text-[9px]">(${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(p.valorVenda)})</span>
            </div>
          `).join('')
        : `<span class="text-[10px] text-slate-400 italic">Nenhum produto associado ao LOC</span>`;

      rowsHTML += `
        <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
          <td class="p-3 align-top whitespace-nowrap">
            <span class="text-xs font-bold text-slate-600 dark:text-slate-300 block">📅 ${item.dataFormatada}</span>
            <span class="text-[10px] text-slate-400 block">${item.consultorNome}</span>
          </td>
          <td class="p-3 align-top min-w-[160px]">
            <span class="font-extrabold text-xs text-slate-800 dark:text-slate-100 block truncate">👤 ${item.clienteNome}</span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              ${refBadge}
              <span class="truncate">✈️ ${item.destino}</span>
            </span>
          </td>
          <td class="p-3 align-top whitespace-nowrap">
            <button type="button" class="btn-copy-extrato-loc inline-flex items-center gap-1 font-mono text-[10px] font-black px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 transition cursor-pointer" data-loc="${item.codigoLocalizador}" title="Copiar Localizador">
              <span>${item.codigoLocalizador}</span>
              <span class="copy-icon text-[9px]">📋</span>
            </button>
          </td>
          <td class="p-3 align-top min-w-[200px]">
            <div class="space-y-1">
              ${prodsHTML}
            </div>
          </td>
          <td class="p-3 align-top whitespace-nowrap">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <span>${item.formaRecebimentoIcone}</span>
              <span>${item.formaRecebimentoNome}</span>
            </span>
          </td>
          <td class="p-3 align-top text-right whitespace-nowrap">
            <span class="block text-xs font-black text-emerald-600 dark:text-emerald-400">
              ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
            </span>
          </td>
          <td class="p-3 align-top text-center whitespace-nowrap">
            <button type="button" class="btn-abrir-viagem-extrato px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase transition shadow-xs flex items-center gap-1 mx-auto cursor-pointer" data-trip-id="${item.viagemId}">
              Abrir ↗
            </button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="overflow-x-auto custom-scrollbar border border-slate-200/80 dark:border-slate-800 rounded-xl">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
              <th class="p-3">Data / Consultor</th>
              <th class="p-3">Cliente & Viagem</th>
              <th class="p-3">Localizador (LOC)</th>
              <th class="p-3">Produtos Vinculados ao LOC</th>
              <th class="p-3">Meio de Recebimento</th>
              <th class="p-3 text-right">Valor Pago</th>
              <th class="p-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;

    // Listeners de copiar LOC
    container.querySelectorAll('.btn-copy-extrato-loc').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const loc = btn.getAttribute('data-loc');
        if (!loc || loc === 'SEM LOCALIZADOR') return;

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(loc);
          } else {
            const textArea = document.createElement('textarea');
            textArea.value = loc;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }

          const icon = btn.querySelector('.copy-icon');
          if (icon) {
            icon.textContent = '✅';
            setTimeout(() => { icon.textContent = '📋'; }, 1200);
          }
        } catch (err) {}
      });
    });

    // Listeners de abrir viagem
    container.querySelectorAll('.btn-abrir-viagem-extrato').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          this.close();
          if (this.options?.onAbrirViagem) {
            this.options.onAbrirViagem(tripId);
          } else {
            window.dispatchEvent(new CustomEvent('paxflow-navigate', { detail: { page: 'dashboard', extraId: tripId } }));
          }
        }
      });
    });
  }

  private static exportarCSV(): void {
    const itens = this.getItensFiltrados();
    if (itens.length === 0) return;

    let csvContent = '\uFEFF'; // BOM para garantir acentuação correta no Excel
    csvContent += 'Data;Cliente;Destino;Codigo_Ref;Localizador_LOC;Meio_Recebimento;Produtos_Vinculados;Consultor;Valor_Pago\n';

    itens.forEach(item => {
      const prodsStr = item.produtosVinculados
        .map(p => `[${p.tipo}] ${p.fornecedor} ${p.descricao ? `(${p.descricao})` : ''} - R$ ${p.valorVenda.toFixed(2)}`)
        .join(' | ');

      const valorFormatado = item.valor.toFixed(2).replace('.', ',');

      csvContent += `"${item.dataFormatada}";"${item.clienteNome.replace(/"/g, '""')}";"${item.destino.replace(/"/g, '""')}";"${item.viagemCodigoRef}";"${item.codigoLocalizador}";"${item.formaRecebimentoNome}";"${prodsStr.replace(/"/g, '""')}";"${item.consultorNome.replace(/"/g, '""')}";"${valorFormatado}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paxflow_extrato_recebimentos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
