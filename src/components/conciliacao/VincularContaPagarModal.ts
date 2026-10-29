import { ExtratoTransacao, ConciliacaoService } from '../../services/conciliacaoService';
import { FinContaPagar } from '../../types';
import { showCustomAlert, showCustomConfirm } from '../../services/dialog';

export class VincularContaPagarModal {
  private static overlay: HTMLElement | null = null;
  private static transacao: ExtratoTransacao | null = null;
  private static contas: FinContaPagar[] = [];
  private static contaSelecionadaId: string | null = null;
  private static onSucessoCallback: (() => void) | null = null;

  public static async abrir(transacao: ExtratoTransacao, onSucesso?: () => void): Promise<void> {
    this.transacao = transacao;
    this.onSucessoCallback = onSucesso || null;
    this.contaSelecionadaId = null;

    this.overlay = document.createElement('div');
    this.overlay.id = 'modal-vincular-conta-pagar-overlay';
    this.overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';

    const valorDebitoAbs = Math.abs(transacao.valor);
    const formatarMoeda = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    this.overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[850px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden">
        
        <div class="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center text-xl border border-rose-100 dark:border-rose-900/40">
              💰
            </div>
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Conciliar Débito com Conta a Pagar</h2>
              <p class="text-xs text-slate-400 font-medium">Associe a saída do extrato bancário a uma despesa do PaxFlow e efetue a baixa automática</p>
            </div>
          </div>
          <button id="btn-fechar-vincular-conta" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer">✕</button>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <!-- Card da transação bancária (Débito) -->
          <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Débito no Extrato Bancário</span>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100">${transacao.descricao}</h3>
              <p class="text-xs text-slate-500 font-medium">Data: ${new Date(transacao.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')} ${transacao.documento ? `• Doc: ${transacao.documento}` : ''} • Banco: ${transacao.banco_origem || 'Extrato'}</p>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-black uppercase tracking-wider text-rose-500">Valor do Débito</span>
              <div class="text-lg font-black text-rose-600 dark:text-rose-400">
                -${formatarMoeda(valorDebitoAbs)}
              </div>
            </div>
          </div>

          <!-- Filtro e busca de contas a pagar -->
          <div class="flex items-center gap-3">
            <div class="relative flex-1">
              <input type="text" id="input-busca-contas-pagar" placeholder="Buscar por fornecedor, descrição ou valor..." class="w-full h-[42px] pl-9 pr-3.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100 text-xs font-medium" />
              <span class="absolute left-3 top-3 text-slate-400 text-sm">🔍</span>
            </div>
            <button id="btn-recarregar-contas-pagar" class="h-[42px] px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              🔄 Atualizar
            </button>
          </div>

          <!-- Lista de contas a pagar disponíveis -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div class="max-h-60 overflow-y-auto custom-scrollbar">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th class="p-3 w-10 text-center">Sel.</th>
                    <th class="p-3">Vencimento</th>
                    <th class="p-3">Favorecido / Descrição</th>
                    <th class="p-3">Categoria</th>
                    <th class="p-3 text-center">Status</th>
                    <th class="p-3 text-right">Valor PaxFlow</th>
                  </tr>
                </thead>
                <tbody id="tbody-contas-pagar" class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  <tr>
                    <td colspan="6" class="p-6 text-center text-slate-400">Carregando contas a pagar...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Checkbox de baixa assistida -->
          <div class="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2.5">
            <input type="checkbox" id="chk-baixar-automatica" checked class="mt-0.5 accent-rose-600 w-4 h-4 cursor-pointer" />
            <label for="chk-baixar-automatica" class="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <span>Dar baixa imediata no Contas a Pagar caso o título esteja pendente</span>
              <span class="block text-[10px] text-slate-500 font-normal mt-0.5">Liquida o título com a data e valor do débito bancário, registrando na auditoria</span>
            </label>
          </div>
        </div>

        <!-- Rodapé de ações -->
        <div class="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button id="btn-cancelar-vincular-conta" class="h-[42px] px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer">
            Cancelar
          </button>
          <button id="btn-confirmar-vincular-conta" disabled class="h-[42px] px-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer">
            Confirmar Conciliação de Débito
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(this.overlay);

    setTimeout(() => {
      this.overlay?.classList.remove('opacity-0');
      this.overlay?.querySelector('#modal-vincular-conta-pagar-card')?.classList.remove('scale-95');
    }, 10);

    this.setupListeners();
    await this.carregarContas();
  }

  private static setupListeners(): void {
    if (!this.overlay) return;

    this.overlay.querySelector('#btn-fechar-vincular-conta')?.addEventListener('click', () => this.fechar());
    this.overlay.querySelector('#btn-cancelar-vincular-conta')?.addEventListener('click', () => this.fechar());

    const inputBusca = this.overlay.querySelector('#input-busca-contas-pagar') as HTMLInputElement;
    inputBusca?.addEventListener('input', () => this.filtrarERenderizarTabela(inputBusca.value));

    this.overlay.querySelector('#btn-recarregar-contas-pagar')?.addEventListener('click', () => this.carregarContas());

    this.overlay.querySelector('#btn-confirmar-vincular-conta')?.addEventListener('click', async () => {
      await this.confirmarConciliacao();
    });
  }

  private static async carregarContas(): Promise<void> {
    try {
      this.contas = await ConciliacaoService.listarContasPagarConciliacao();
      
      // Ordena por proximidade do valor em relação ao débito do extrato
      if (this.transacao) {
        const valDebito = Math.abs(this.transacao.valor);
        this.contas.sort((a, b) => {
          const valA = a.status === 'pago' && a.valor_pago ? a.valor_pago : a.valor_nominal;
          const valB = b.status === 'pago' && b.valor_pago ? b.valor_pago : b.valor_nominal;
          const diffA = Math.abs(valA - valDebito);
          const diffB = Math.abs(valB - valDebito);
          return diffA - diffB;
        });
      }

      this.filtrarERenderizarTabela();
    } catch (err) {
      console.error('Erro ao carregar contas para conciliação:', err);
    }
  }

  private static filtrarERenderizarTabela(termo = ''): void {
    if (!this.overlay) return;
    const tbody = this.overlay.querySelector('#tbody-contas-pagar');
    if (!tbody) return;

    const termoUpper = termo.trim().toUpperCase();
    const filtradas = this.contas.filter(c => {
      if (!termoUpper) return true;
      return (
        c.favorecido.toUpperCase().includes(termoUpper) ||
        (c.descricao && c.descricao.toUpperCase().includes(termoUpper)) ||
        (c.categoria?.nome && c.categoria.nome.toUpperCase().includes(termoUpper)) ||
        c.valor_nominal.toString().includes(termoUpper)
      );
    });

    if (filtradas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-6 text-center text-slate-400">Nenhuma conta a pagar encontrada.</td>
        </tr>
      `;
      return;
    }

    const formatarMoeda = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const valDebito = this.transacao ? Math.abs(this.transacao.valor) : 0;

    tbody.innerHTML = filtradas.map(c => {
      const isSelected = this.contaSelecionadaId === c.id;
      const valorAlvo = c.status === 'pago' && c.valor_pago ? c.valor_pago : c.valor_nominal;
      const ehMatchExato = Math.abs(valorAlvo - valDebito) < 0.01;

      const statusBadge = c.status === 'pago'
        ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Pago</span>'
        : (c.status === 'atrasado'
          ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Atrasado</span>'
          : '<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Pendente</span>');

      return `
        <tr class="item-conta-row hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition ${isSelected ? 'bg-rose-50/60 dark:bg-rose-950/30' : ''}" data-id="${c.id}">
          <td class="p-3 text-center">
            <input type="radio" name="radio-conta-selecionada" value="${c.id}" ${isSelected ? 'checked' : ''} class="accent-rose-600 cursor-pointer" />
          </td>
          <td class="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
            ${new Date(c.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
          </td>
          <td class="p-3">
            <div class="font-bold text-slate-800 dark:text-slate-100">${c.favorecido}</div>
            <div class="text-[10px] text-slate-400">${c.descricao || 'Sem descrição'}</div>
          </td>
          <td class="p-3 whitespace-nowrap text-slate-500">
            ${c.categoria?.nome || '-'}
          </td>
          <td class="p-3 text-center whitespace-nowrap">
            ${statusBadge}
          </td>
          <td class="p-3 text-right font-black ${ehMatchExato ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'} whitespace-nowrap">
            ${formatarMoeda(valorAlvo)}
            ${ehMatchExato ? '<span class="block text-[8px] font-black uppercase text-emerald-500">Valor Exato ⭐</span>' : ''}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.item-conta-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        if (id) {
          this.contaSelecionadaId = id;
          this.filtrarERenderizarTabela(termo);
          this.atualizarBotaoConfirmar();
        }
      });
    });
  }

  private static atualizarBotaoConfirmar(): void {
    if (!this.overlay) return;
    const btn = this.overlay.querySelector('#btn-confirmar-vincular-conta') as HTMLButtonElement;
    if (btn) {
      btn.disabled = !this.contaSelecionadaId;
    }
  }

  private static async confirmarConciliacao(): Promise<void> {
    if (!this.transacao || !this.contaSelecionadaId || !this.overlay) return;

    const chkBaixar = this.overlay.querySelector('#chk-baixar-automatica') as HTMLInputElement;
    const baixarSePendente = chkBaixar ? chkBaixar.checked : true;

    const btn = this.overlay.querySelector('#btn-confirmar-vincular-conta') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Conciliando...';

    const res = await ConciliacaoService.conciliarComContaPagar({
      transacaoExtratoId: this.transacao.id,
      contaPagarId: this.contaSelecionadaId,
      baixarSePendente
    });

    if (res.sucesso) {
      await showCustomAlert('Transação bancária de débito conciliada com sucesso com a Conta a Pagar!', 'Sucesso');
      this.fechar();
      if (this.onSucessoCallback) this.onSucessoCallback();
    } else {
      btn.disabled = false;
      btn.textContent = 'Confirmar Conciliação de Débito';
      await showCustomAlert(res.erro || 'Falha ao conciliar débito', 'Erro');
    }
  }

  public static fechar(): void {
    if (!this.overlay) return;
    this.overlay.classList.add('opacity-0');
    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
      this.transacao = null;
      this.contaSelecionadaId = null;
    }, 200);
  }
}
