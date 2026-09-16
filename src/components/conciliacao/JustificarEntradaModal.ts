import { ExtratoTransacao, ConciliacaoService } from '../../services/conciliacaoService';
import { showCustomAlert } from '../../services/dialog';

export class JustificarEntradaModal {
  private static overlay: HTMLElement | null = null;
  private static transacao: ExtratoTransacao | null = null;
  private static onSucessoCallback: (() => void) | null = null;

  public static abrir(transacao: ExtratoTransacao, onSucesso?: () => void): void {
    this.transacao = transacao;
    this.onSucessoCallback = onSucesso || null;

    this.overlay = document.createElement('div');
    this.overlay.id = 'modal-justificar-entrada-overlay';
    this.overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';

    this.overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[520px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col overflow-hidden" id="modal-justificar-entrada-card">
        
        <div class="h-1.5 bg-gradient-to-r from-amber-500 to-orange-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xl border border-amber-100 dark:border-amber-900/40">
              🏷️
            </div>
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Justificar Entrada / Saída</h2>
              <p class="text-xs text-slate-400 font-medium">Categorize lançamentos bancários que não são vendas de viagens</p>
            </div>
          </div>
          <button id="btn-fechar-justificar" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1">✕</button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Card do lançamento -->
          <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <h3 class="text-xs font-black text-slate-800 dark:text-slate-100">${transacao.descricao}</h3>
              <p class="text-[11px] text-slate-500 font-medium">${new Date(transacao.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')} ${transacao.documento ? `• Doc: ${transacao.documento}` : ''}</p>
            </div>
            <div class="text-right">
              <span class="text-sm font-black text-emerald-600 dark:text-emerald-400">
                ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transacao.valor)}
              </span>
            </div>
          </div>

          <!-- Tipo de Justificativa -->
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Categoria da Movimentação *</label>
            <select id="select-tipo-justificativa" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 font-bold text-xs">
              <option value="Aporte de Capital">💼 Aporte de Capital / Investimento dos Sócios</option>
              <option value="Rendimento de Aplicação">📈 Rendimento de Aplicação Financeira (CDB/Poupança)</option>
              <option value="Transferência entre Contas">🔄 Transferência entre Contas da Própria Agência</option>
              <option value="Empréstimo / Financiamento">🏦 Empréstimo ou Financiamento Bancário</option>
              <option value="Estorno / Reembolso Fornecedor">↩️ Estorno de Fornecedor / Reembolso</option>
              <option value="Receita Extraordinária">✨ Outra Receita Extraordinária</option>
              <option value="Não Operacional">🏷️ Outro Lançamento Não Operacional</option>
            </select>
          </div>

          <!-- Descrição / Observações -->
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Observação / Detalhamento *</label>
            <textarea id="textarea-obs-justificativa" rows="3" placeholder="Ex: Transferência da conta Itaú para Santander para pagamento de fornecedor..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 text-xs font-medium"></textarea>
          </div>
        </div>

        <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button id="btn-cancelar-justificar" class="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition">Cancelar</button>
          <button id="btn-salvar-justificativa" class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition transform active:scale-95">
            Salvar Justificativa
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(this.overlay);

    requestAnimationFrame(() => {
      this.overlay?.classList.remove('opacity-0');
      document.getElementById('modal-justificar-entrada-card')?.classList.remove('scale-95');
    });

    this.setupEvents();
  }

  private static setupEvents(): void {
    document.getElementById('btn-fechar-justificar')?.addEventListener('click', () => this.fechar());
    document.getElementById('btn-cancelar-justificar')?.addEventListener('click', () => this.fechar());

    document.getElementById('btn-salvar-justificativa')?.addEventListener('click', async () => {
      if (!this.transacao) return;

      const tipo = (document.getElementById('select-tipo-justificativa') as HTMLSelectElement).value;
      const obs = (document.getElementById('textarea-obs-justificativa') as HTMLTextAreaElement).value.trim();

      if (!obs) {
        showCustomAlert('Por favor, descreva uma breve observação justificando o lançamento.', 'warning');
        return;
      }

      try {
        const btn = document.getElementById('btn-salvar-justificativa') as HTMLButtonElement;
        btn.disabled = true;
        btn.textContent = 'Salvando...';

        await ConciliacaoService.justificarNaoVenda(this.transacao.id, tipo, obs);
        showCustomAlert('Lançamento justificado e conciliado!', 'success');
        this.fechar();
        if (this.onSucessoCallback) {
          this.onSucessoCallback();
        }
      } catch (e: any) {
        showCustomAlert(`Falha ao justificar: ${e.message || 'Erro inesperado'}`, 'error');
        const btn = document.getElementById('btn-salvar-justificativa') as HTMLButtonElement;
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Salvar Justificativa';
        }
      }
    });
  }

  public static fechar(): void {
    if (this.overlay) {
      this.overlay.classList.add('opacity-0');
      document.getElementById('modal-justificar-entrada-card')?.classList.add('scale-95');
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
      }, 250);
    }
  }
}
