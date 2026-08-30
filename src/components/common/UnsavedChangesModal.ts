/**
 * Componente modal de alerta para alterações não salvas (Unsaved Changes Guard)
 */
export function confirmUnsavedChanges(onConfirm: () => void, onCancel?: () => void): void {
  // Evitar múltiplos modais abertos
  const existing = document.getElementById('unsaved-changes-modal');
  if (existing) existing.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'unsaved-changes-modal';
  modalOverlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeInCard';
  
  modalOverlay.innerHTML = `
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 text-slate-800 dark:text-slate-100 transform transition-all scale-100">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Descartar alterações?</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400">Você possui dados não salvos neste formulário. Se fechar agora, as modificações serão perdidas.</p>
        </div>
      </div>
      
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
        <button id="btn-unsaved-cancel" class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors">
          Continuar editando
        </button>
        <button id="btn-unsaved-confirm" class="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all">
          Sair sem salvar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const btnConfirm = modalOverlay.querySelector('#btn-unsaved-confirm');
  const btnCancel = modalOverlay.querySelector('#btn-unsaved-cancel');

  const close = () => {
    modalOverlay.remove();
  };

  btnConfirm?.addEventListener('click', () => {
    close();
    onConfirm();
  });

  btnCancel?.addEventListener('click', () => {
    close();
    if (onCancel) onCancel();
  });
}
