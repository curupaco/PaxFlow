import { ExtratoTransacao, LocPagamentoPendente, ConciliacaoService } from '../../services/conciliacaoService';
import { showCustomAlert } from '../../services/dialog';

export class VincularRecebimentoModal {
  private static overlay: HTMLElement | null = null;
  private static transacao: ExtratoTransacao | null = null;
  private static pendentes: LocPagamentoPendente[] = [];
  private static selecionadosIds: Set<string> = new Set();
  private static onSucessoCallback: (() => void) | null = null;

  public static async abrir(transacao: ExtratoTransacao, onSucesso?: () => void): Promise<void> {
    this.transacao = transacao;
    this.onSucessoCallback = onSucesso || null;
    this.selecionadosIds.clear();

    this.overlay = document.createElement('div');
    this.overlay.id = 'modal-vincular-recebimento-overlay';
    this.overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';

    this.overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[850px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden" id="modal-vincular-recebimento-card">
        
        <div class="h-1.5 bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-xl border border-teal-100 dark:border-teal-900/40">
              🔗
            </div>
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Conciliar Lançamento Bancário</h2>
              <p class="text-xs text-slate-400 font-medium">Vincule a transação bancária a um ou mais recebimentos (LOCs) do PaxFlow</p>
            </div>
          </div>
          <button id="btn-fechar-vincular" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1">✕</button>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <!-- Card da transação bancária -->
          <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Transação Bancária</span>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100">${transacao.descricao}</h3>
              <p class="text-xs text-slate-500 font-medium">Data: ${new Date(transacao.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')} ${transacao.documento ? `• Doc: ${transacao.documento}` : ''}</p>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Valor Creditado</span>
              <div class="text-lg font-black text-emerald-600 dark:text-emerald-400">
                ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transacao.valor)}
              </div>
            </div>
          </div>

          <!-- Filtro e busca de pendências -->
          <div class="flex items-center gap-3">
            <div class="relative flex-1">
              <input type="text" id="input-busca-pendentes" placeholder="Buscar por código LOC, cliente ou observação..." class="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-100 text-xs font-medium" />
              <span class="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>
            <button id="btn-recarregar-pendentes" class="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
              🔄 Atualizar
            </button>
          </div>

          <!-- Lista de recebimentos pendentes -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div class="max-h-60 overflow-y-auto custom-scrollbar">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th class="p-3 w-10 text-center">Sel.</th>
                    <th class="p-3">Data / LOC</th>
                    <th class="p-3">Cliente / Pagante</th>
                    <th class="p-3">Forma / Parcela</th>
                    <th class="p-3 text-right">Valor PaxFlow</th>
                  </tr>
                </thead>
                <tbody id="tbody-pendentes" class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  <tr>
                    <td colspan="5" class="p-6 text-center text-slate-400">Carregando recebimentos pendentes...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Resumo dos selecionados e cálculo de diferença -->
          <div class="p-4 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-100 dark:border-teal-900/40 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div>
              <span class="text-[10px] font-black uppercase text-teal-700 dark:text-teal-400">Total Selecionado (LOCs)</span>
              <div id="resumo-total-locs" class="text-base font-black text-slate-800 dark:text-slate-100">R$ 0,00</div>
              <span id="resumo-qtd-locs" class="text-[11px] text-slate-500 font-semibold">0 itens selecionados</span>
            </div>

            <div>
              <span class="text-[10px] font-black uppercase text-teal-700 dark:text-teal-400">Diferença / Taxa Cartão</span>
              <div id="resumo-diferenca" class="text-base font-black text-slate-800 dark:text-slate-100">R$ 0,00</div>
              <span id="resumo-diferenca-badge" class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Sem seleção</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" id="check-absorver-taxa" class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300" />
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Lançar diferença como taxa</span>
              </label>
              <span class="text-[10px] text-slate-400">Compensa automaticamente a taxa da maquininha ou gateway</span>
            </div>
          </div>
        </div>

        <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button id="btn-cancelar-vincular" class="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition">Cancelar</button>
          <button id="btn-confirmar-vincular" class="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-teal-500/20 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            Concluir Conciliação
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(this.overlay);

    requestAnimationFrame(() => {
      this.overlay?.classList.remove('opacity-0');
      document.getElementById('modal-vincular-recebimento-card')?.classList.remove('scale-95');
    });

    this.setupEvents();
    await this.carregarRecebimentos();
  }

  private static setupEvents(): void {
    document.getElementById('btn-fechar-vincular')?.addEventListener('click', () => this.fechar());
    document.getElementById('btn-cancelar-vincular')?.addEventListener('click', () => this.fechar());
    document.getElementById('btn-recarregar-pendentes')?.addEventListener('click', () => this.carregarRecebimentos());

    const inputBusca = document.getElementById('input-busca-pendentes') as HTMLInputElement;
    inputBusca?.addEventListener('input', () => this.renderizarTabela(inputBusca.value));

    document.getElementById('btn-confirmar-vincular')?.addEventListener('click', () => this.executarVinculo());
  }

  private static async carregarRecebimentos(): Promise<void> {
    try {
      this.pendentes = await ConciliacaoService.listarRecebimentosPendentes();
      this.renderizarTabela();
    } catch (e) {
      const tbody = document.getElementById('tbody-pendentes');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-rose-500 font-bold">Erro ao carregar recebimentos pendentes.</td></tr>`;
      }
    }
  }

  private static renderizarTabela(filtroTexto: string = ''): void {
    const tbody = document.getElementById('tbody-pendentes');
    if (!tbody) return;

    const termo = filtroTexto.toLowerCase().trim();
    const filtrados = this.pendentes.filter(p => {
      if (!termo) return true;
      return (
        p.loc_codigo.toLowerCase().includes(termo) ||
        p.cliente_nome.toLowerCase().includes(termo) ||
        p.forma_pagamento.toLowerCase().includes(termo) ||
        (p.observacoes && p.observacoes.toLowerCase().includes(termo))
      );
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="p-6 text-center text-slate-400 font-medium">Nenhum recebimento em aberto encontrado no sistema.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtrados.map(p => {
      const isChecked = this.selecionadosIds.has(p.id);
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer" data-id="${p.id}">
          <td class="p-3 text-center align-middle">
            <input type="checkbox" class="checkbox-loc w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300" data-id="${p.id}" ${isChecked ? 'checked' : ''} />
          </td>
          <td class="p-3 align-middle">
            <div class="font-bold text-slate-800 dark:text-slate-100">${p.loc_codigo}</div>
            <div class="text-[10px] text-slate-400">${new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
          </td>
          <td class="p-3 align-middle">
            <div class="font-bold text-slate-700 dark:text-slate-200">${p.cliente_nome}</div>
            ${p.observacoes ? `<div class="text-[10px] text-slate-400 truncate max-w-[180px]">${p.observacoes}</div>` : ''}
          </td>
          <td class="p-3 align-middle">
            <span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
              ${p.forma_pagamento} ${p.parcela_numero ? `(${p.parcela_numero}ª)` : ''}
            </span>
          </td>
          <td class="p-3 text-right font-black text-slate-800 dark:text-slate-100 align-middle">
            ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const id = tr.getAttribute('data-id');
        if (!id) return;

        const checkbox = tr.querySelector('.checkbox-loc') as HTMLInputElement;
        if (target.tagName.toLowerCase() !== 'input') {
          checkbox.checked = !checkbox.checked;
        }

        if (checkbox.checked) {
          this.selecionadosIds.add(id);
        } else {
          this.selecionadosIds.delete(id);
        }
        this.atualizarResumo();
      });
    });

    this.atualizarResumo();
  }

  private static atualizarResumo(): void {
    const totalLocs = this.pendentes
      .filter(p => this.selecionadosIds.has(p.id))
      .reduce((acc, p) => acc + p.valor, 0);

    const valorBanco = this.transacao ? this.transacao.valor : 0;
    const diferenca = totalLocs - valorBanco;

    const elTotal = document.getElementById('resumo-total-locs');
    const elQtd = document.getElementById('resumo-qtd-locs');
    const elDif = document.getElementById('resumo-diferenca');
    const elBadge = document.getElementById('resumo-diferenca-badge');

    if (elTotal) elTotal.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLocs);
    if (elQtd) elQtd.textContent = `${this.selecionadosIds.size} selecionado(s)`;

    if (elDif && elBadge) {
      if (this.selecionadosIds.size === 0) {
        elDif.textContent = 'R$ 0,00';
        elBadge.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700';
        elBadge.textContent = 'Sem seleção';
      } else if (Math.abs(diferenca) < 0.01) {
        elDif.textContent = 'R$ 0,00';
        elBadge.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700';
        elBadge.textContent = 'Valores Exatos 🎯';
      } else if (diferenca > 0) {
        elDif.textContent = `- ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diferenca)}`;
        elBadge.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800';
        elBadge.textContent = 'Possível taxa deduzida';
      } else {
        elDif.textContent = `+ ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(diferenca))}`;
        elBadge.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800';
        elBadge.textContent = 'Crédito maior que o lançamento';
      }
    }
  }

  private static async executarVinculo(): Promise<void> {
    if (!this.transacao) return;

    if (this.selecionadosIds.size === 0) {
      showCustomAlert('Selecione pelo menos um recebimento do PaxFlow para vincular.', 'warning');
      return;
    }

    const checkTaxa = document.getElementById('check-absorver-taxa') as HTMLInputElement;
    const absorverTaxa = checkTaxa ? checkTaxa.checked : false;

    const totalLocs = this.pendentes
      .filter(p => this.selecionadosIds.has(p.id))
      .reduce((acc, p) => acc + p.valor, 0);

    const diferenca = totalLocs - this.transacao.valor;
    const taxaDesconto = (absorverTaxa && diferenca > 0) ? diferenca : undefined;

    try {
      const btn = document.getElementById('btn-confirmar-vincular') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Gravando conciliação...';
      }

      await ConciliacaoService.conciliarTransacao({
        transacaoId: this.transacao.id,
        locPagamentoIds: Array.from(this.selecionadosIds),
        taxaDesconto
      });

      showCustomAlert('Transação conciliada com sucesso!', 'success');
      this.fechar();
      if (this.onSucessoCallback) {
        this.onSucessoCallback();
      }
    } catch (e: any) {
      showCustomAlert(`Falha ao conciliar: ${e.message || 'Erro inesperado'}`, 'error');
      const btn = document.getElementById('btn-confirmar-vincular') as HTMLButtonElement;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Concluir Conciliação';
      }
    }
  }

  public static fechar(): void {
    if (this.overlay) {
      this.overlay.classList.add('opacity-0');
      document.getElementById('modal-vincular-recebimento-card')?.classList.add('scale-95');
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
      }, 250);
    }
  }
}
