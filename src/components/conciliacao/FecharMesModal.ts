import { ConciliacaoService } from '../../services/conciliacaoService';
import { showCustomAlert } from '../../services/dialog';

export class FecharMesModal {
  private static overlay: HTMLElement | null = null;
  private static onSucessoCallback: (() => void) | null = null;

  public static abrir(onSucesso?: () => void): void {
    this.onSucessoCallback = onSucesso || null;

    const dataAtual = new Date();
    // Default to previous month or current month (YYYY-MM)
    const ano = dataAtual.getFullYear();
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const valorPadraoAnoMes = `${ano}-${mes}`;

    this.overlay = document.createElement('div');
    this.overlay.id = 'modal-fechar-mes-overlay';
    this.overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';

    this.overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[500px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col overflow-hidden" id="modal-fechar-mes-card">
        
        <div class="h-1.5 bg-gradient-to-r from-rose-500 via-indigo-500 to-purple-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center text-xl border border-rose-100 dark:border-rose-900/40">
              🔒
            </div>
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Fechar Competência Contábil</h2>
              <p class="text-xs text-slate-400 font-medium">Tranque o mês conciliado para evitar alterações e auditoria</p>
            </div>
          </div>
          <button id="btn-fechar-fechamento" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1">✕</button>
        </div>

        <div class="p-6 space-y-4">
          <div class="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl flex items-start gap-2.5">
            <span class="text-base">⚠️</span>
            <p class="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
              O fechamento de competência consolida os saldos conciliados e bloqueia desvinculações indevidas no período.
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Mês de Competência *</label>
            <input type="month" id="input-ano-mes-fechamento" value="${valorPadraoAnoMes}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100 font-bold text-xs" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Observações da Auditoria Contábil</label>
            <textarea id="textarea-obs-fechamento" rows="3" placeholder="Ex: Fechamento validado com o extrato consolidado do banco Itaú..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100 text-xs font-medium"></textarea>
          </div>
        </div>

        <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button id="btn-cancelar-fechamento" class="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition">Cancelar</button>
          <button id="btn-confirmar-fechamento" class="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-500/20 transition transform active:scale-95">
            Trancar Competência
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(this.overlay);

    requestAnimationFrame(() => {
      this.overlay?.classList.remove('opacity-0');
      document.getElementById('modal-fechar-mes-card')?.classList.remove('scale-95');
    });

    this.setupEvents();
  }

  private static setupEvents(): void {
    document.getElementById('btn-fechar-fechamento')?.addEventListener('click', () => this.fechar());
    document.getElementById('btn-cancelar-fechamento')?.addEventListener('click', () => this.fechar());

    document.getElementById('btn-confirmar-fechamento')?.addEventListener('click', async () => {
      const anoMes = (document.getElementById('input-ano-mes-fechamento') as HTMLInputElement).value;
      const obs = (document.getElementById('textarea-obs-fechamento') as HTMLTextAreaElement).value.trim();

      if (!anoMes) {
        showCustomAlert('Por favor, selecione o mês da competência.', 'warning');
        return;
      }

      try {
        const btn = document.getElementById('btn-confirmar-fechamento') as HTMLButtonElement;
        btn.disabled = true;
        btn.textContent = 'Trancando...';

        await ConciliacaoService.fecharCompetencia(anoMes, obs);
        showCustomAlert(`Competência ${anoMes} fechada com sucesso!`, 'success');
        this.fechar();
        if (this.onSucessoCallback) {
          this.onSucessoCallback();
        }
      } catch (e: any) {
        showCustomAlert(`Falha ao fechar competência: ${e.message || 'Erro inesperado'}`, 'error');
        const btn = document.getElementById('btn-confirmar-fechamento') as HTMLButtonElement;
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Trancar Competência';
        }
      }
    });
  }

  public static fechar(): void {
    if (this.overlay) {
      this.overlay.classList.add('opacity-0');
      document.getElementById('modal-fechar-mes-card')?.classList.add('scale-95');
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
      }, 250);
    }
  }
}
