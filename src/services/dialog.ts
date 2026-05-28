/**
 * Global Premium Dialog Utility for PaxFlow
 * Replaces native browser alert() and confirm() with stunning custom modals.
 */

export function showCustomAlert(message: string, title: string = 'Aviso'): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'paxflow-alert-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[380px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col relative overflow-hidden" id="paxflow-custom-alert-card">
        <!-- Top decorative gradient line -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"></div>
        
        <div class="p-6 pt-7 text-center flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 flex items-center justify-center text-xl font-bold border border-amber-100/40 dark:border-amber-900/30 shadow-inner">
            ⚠️
          </div>
          <h3 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">${title}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed whitespace-pre-line">${message}</p>
        </div>
        
        <div class="px-6 pb-6 pt-2 flex justify-center">
          <button id="paxflow-alert-btn-ok" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 transition duration-200 uppercase focus:outline-none">
            Ok
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Dynamic fade-in
    setTimeout(() => {
      overlay.classList.add('opacity-100');
      const card = overlay.querySelector('#paxflow-custom-alert-card') as HTMLElement;
      if (card) {
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
      }
    }, 10);

    const closeAlert = () => {
      const card = overlay.querySelector('#paxflow-custom-alert-card') as HTMLElement;
      if (card) {
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
      }
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 250);
    };

    overlay.querySelector('#paxflow-alert-btn-ok')?.addEventListener('click', closeAlert);
  });
}

export function showCustomConfirm(
  message: string,
  title: string = 'Confirmação',
  options?: { confirmText?: string; cancelText?: string; isDestructive?: boolean }
): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'paxflow-confirm-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    const confirmText = options?.confirmText || 'Confirmar';
    const cancelText = options?.cancelText || 'Cancelar';
    const isDestructive = options?.isDestructive || false;

    // Custom aesthetics based on context
    const icon = isDestructive ? '🗑️' : '❓';
    const iconBgClass = isDestructive 
      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-455 border border-rose-100/40 dark:border-rose-900/30' 
      : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 border border-indigo-100/40 dark:border-indigo-900/30';
    const activeBtnClass = isDestructive
      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/15 hover:shadow-rose-600/25'
      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/15 hover:shadow-indigo-600/25';
    
    const topBarGradient = isDestructive 
      ? 'from-rose-500 via-red-500 to-rose-600' 
      : 'from-indigo-500 via-purple-500 to-indigo-600';

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[380px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col relative overflow-hidden" id="paxflow-custom-confirm-card">
        <!-- Top decorative gradient line -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${topBarGradient}"></div>
        
        <div class="p-6 pt-7 text-center flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-2xl ${iconBgClass} flex items-center justify-center text-xl font-bold shadow-inner">
            ${icon}
          </div>
          <h3 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">${title}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed whitespace-pre-line">${message}</p>
        </div>
        
        <div class="px-6 pb-6 pt-2 flex gap-3">
          <button id="paxflow-confirm-btn-cancel" class="flex-1 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-extrabold text-xs tracking-wider rounded-xl transition duration-200 uppercase focus:outline-none border border-slate-200/50 dark:border-slate-700/50">
            ${cancelText}
          </button>
          <button id="paxflow-confirm-btn-ok" class="flex-1 py-3 ${activeBtnClass} text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg transition duration-200 uppercase focus:outline-none">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Dynamic fade-in
    setTimeout(() => {
      overlay.classList.add('opacity-100');
      const card = overlay.querySelector('#paxflow-custom-confirm-card') as HTMLElement;
      if (card) {
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
      }
    }, 10);

    const closeConfirm = (result: boolean) => {
      const card = overlay.querySelector('#paxflow-custom-confirm-card') as HTMLElement;
      if (card) {
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
      }
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 250);
    };

    overlay.querySelector('#paxflow-confirm-btn-ok')?.addEventListener('click', () => closeConfirm(true));
    overlay.querySelector('#paxflow-confirm-btn-cancel')?.addEventListener('click', () => closeConfirm(false));
  });
}
