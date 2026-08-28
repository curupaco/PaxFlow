import { VersionChecker } from '../services/versionChecker';

export class VersionToast {
  private static instance: VersionToast;
  private containerEl: HTMLElement | null = null;
  private countdownTimer: any = null;
  private secondsRemaining: number = 10;
  private isUserActive: boolean = false;

  private constructor() {
    this.listenForEvents();
  }

  public static init(): VersionToast {
    if (!VersionToast.instance) {
      VersionToast.instance = new VersionToast();
    }
    return VersionToast.instance;
  }

  private listenForEvents(): void {
    window.addEventListener('paxflow-new-version-available', () => {
      this.showToast();
    });

    // Detecta se o usuário está interagindo na tela
    const markActive = () => {
      this.isUserActive = true;
    };
    window.addEventListener('mousemove', markActive, { passive: true });
    window.addEventListener('keydown', markActive, { passive: true });
  }

  public showToast(): void {
    if (document.getElementById('paxflow-version-toast')) return;

    this.containerEl = document.createElement('div');
    this.containerEl.id = 'paxflow-version-toast';
    this.containerEl.className = 'fixed bottom-6 right-6 z-[99999] max-w-md w-full px-4 animate-bounce-short';

    this.containerEl.innerHTML = `
      <div class="bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-white p-5 rounded-2xl shadow-2xl shadow-cyan-500/20 flex flex-col gap-3">
        <div class="flex items-start gap-3.5">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 text-cyan-400">
            <svg class="w-6 h-6 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-sm text-slate-100 flex items-center gap-2">
                Nova Versão Disponível
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Update
                </span>
              </h4>
            </div>
            <p class="text-xs text-slate-300 mt-1 leading-relaxed">
              O PaxFlow foi atualizado! Recarregue a página para receber as melhorias e garantir sincronização dos seus dados.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <span id="version-toast-countdown" class="text-slate-400 font-mono text-[11px]">
            Recarregando em ${this.secondsRemaining}s se inativo...
          </span>
          <div class="flex items-center gap-2">
            <button id="version-toast-snooze" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors">
              Adiar 5min
            </button>
            <button id="version-toast-reload" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
              Atualizar Agora
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.containerEl);

    // Event listeners dos botões
    const reloadBtn = document.getElementById('version-toast-reload');
    reloadBtn?.addEventListener('click', () => {
      VersionChecker.getInstance().forceReload();
    });

    const snoozeBtn = document.getElementById('version-toast-snooze');
    snoozeBtn?.addEventListener('click', () => {
      this.dismissToast();
      // Reavisa em 5 minutos
      setTimeout(() => {
        VersionChecker.getInstance().checkForUpdates();
      }, 5 * 60 * 1000);
    });

    this.startCountdown();
  }

  private startCountdown(): void {
    this.secondsRemaining = 10;
    this.isUserActive = false;

    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      this.secondsRemaining -= 1;

      const countdownEl = document.getElementById('version-toast-countdown');
      if (countdownEl) {
        countdownEl.innerText = `Recarregando em ${this.secondsRemaining}s se inativo...`;
      }

      if (this.secondsRemaining <= 0) {
        clearInterval(this.countdownTimer);
        // Se o usuário não esteve interagindo ativamente nos últimos 10s, recarrega automaticamente
        if (!this.isUserActive) {
          VersionChecker.getInstance().forceReload();
        } else {
          // Se estava digitando/movendo o mouse, dá mais tempo e avisa
          if (countdownEl) {
            countdownEl.innerText = `Aguardando você concluir sua ação...`;
          }
        }
      }
    }, 1000);
  }

  private dismissToast(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.containerEl && this.containerEl.parentNode) {
      this.containerEl.parentNode.removeChild(this.containerEl);
      this.containerEl = null;
    }
  }
}
