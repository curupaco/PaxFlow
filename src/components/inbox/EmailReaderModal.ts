import { AlertItem } from '../../types';
import { getAvatarSvg } from '../../services/avatars';
import { showCustomAlert } from '../../services/dialog';

export interface EmailReaderModalOptions {
  onArchive: (item: AlertItem) => Promise<void>;
  onClose: () => void;
}

export class EmailReaderModal {
  /**
   * Opens the Corporate styled Email modal details
   */
  static open(item: AlertItem, options: EmailReaderModalOptions): void {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'email-reader-modal';
    modalOverlay.className = 'fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn';

    let badgeClass = 'badge-gradient-indigo';
    let badgeText = 'Lembrete';
    if (item.type === 'passport') {
      badgeClass = 'badge-gradient-amber';
      badgeText = 'Passaporte SLA';
    } else if (item.type === 'refund') {
      badgeClass = 'badge-gradient-rose';
      badgeText = 'Reembolso SLA';
    }

    modalOverlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 max-w-2xl w-full border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transform scale-95 transition-all duration-300 relative">
        
        <!-- Modal Top Bar / Fake email tools -->
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider ${badgeClass}">
              ${badgeText}
            </span>
            <span class="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Leitor de Mensagem</span>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- Header Archive action -->
            <button id="modal-archive-btn" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition" title="${item.arquivado ? 'Desarquivar Mensagem' : 'Arquivar Mensagem'}">
              ${item.arquivado ? `
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/></svg>
              ` : `
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <polyline points="21 8 21 21 3 21 3 8"></polyline>
                  <rect x="1" y="3" width="22" height="5"></rect>
                  <line x1="10" y1="12" x2="14" y2="12"></line>
                </svg>
              `}
            </button>
            
            <button id="modal-close-btn" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition" title="Fechar">
              <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Corporate Email Workspace -->
        <div class="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          
          <!-- Subject -->
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
            ${item.title}
          </h2>

          <!-- Email headers -->
          <div class="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800/80 pb-5">
            <div class="w-10 h-10 border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 flex-shrink-0">
              ${getAvatarSvg(item.senderAvatar, item.sender.charAt(0), 'w-full h-full')}
            </div>
            <div class="flex-grow min-w-0">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <span class="block text-sm font-extrabold text-slate-800 dark:text-slate-250 truncate">${item.sender}</span>
                  <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">De: &lt;alertas@paxflow.com.br&gt;</span>
                </div>
                <div class="text-left sm:text-right">
                  <span class="block text-[10px] font-bold text-slate-400 dark:text-slate-550">${item.dateStr}</span>
                  <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Para: Você</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Email body (Corporate Paper design) -->
          <div class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold bg-slate-50/40 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/30 dark:border-slate-850/40 shadow-inner">
            <p class="mb-4">Prezado(a) Consultor(a),</p>
            
            <p class="mb-4">${item.body}</p>

            <p class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs text-slate-400 dark:text-slate-505">
              Atenciosamente,<br>
              <strong>PaxFlow Cockpit Automático</strong><br>
              Gestão Operacional e Fluxo de Passageiros
            </p>
          </div>

        </div>

        <!-- Modal Action Footer -->
        <div class="px-5 py-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 bg-slate-50/40 dark:bg-slate-900/40">
          <button id="modal-footer-close-btn" class="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40">
            Fechar
          </button>
          
          <button id="modal-footer-archive-btn" class="px-4 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <polyline points="21 8 21 21 3 21 3 8"></polyline>
              <rect x="1" y="3" width="22" height="5"></rect>
              <line x1="10" y1="12" x2="14" y2="12"></line>
            </svg>
            ${item.arquivado ? 'Desarquivar Mensagem' : 'Arquivar Mensagem'}
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Apply scaling zoom animation in timeout
    setTimeout(() => {
      const modalContent = modalOverlay.querySelector('.scale-95');
      if (modalContent) {
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
      }
    }, 10);

    // Modal interaction helper actions
    const closeModal = (isNavigatingAway = false) => {
      const modalContent = modalOverlay.querySelector('.scale-100');
      if (modalContent) {
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('scale-95');
      }
      modalOverlay.classList.add('opacity-0');
      setTimeout(() => {
        modalOverlay.remove();
        if (!isNavigatingAway) {
          options.onClose();
        }
      }, 200);
    };

    // Close on clicks outside
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => closeModal());
    document.getElementById('modal-footer-close-btn')?.addEventListener('click', () => closeModal());

    // Archive handlers
    const handleArchiveClick = async () => {
      try {
        await options.onArchive(item);
        closeModal(true); // Don't trigger standard onClose callback since parent will reload/redraw itself
      } catch (err: any) {
        showCustomAlert(`Erro ao arquivar mensagem:\n\n${err.message || err}`, 'Erro de Ação');
      }
    };

    document.getElementById('modal-archive-btn')?.addEventListener('click', handleArchiveClick);
    document.getElementById('modal-footer-archive-btn')?.addEventListener('click', handleArchiveClick);

    // DEEP LINK INTERACTIVE TRIGGER CLICK
    modalOverlay.querySelectorAll('.inbox-deep-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const orcId = link.getAttribute('data-orcamento-id');
        const viagemId = link.getAttribute('data-viagem-id');

        if (orcId) {
          // 1. Close Modal
          closeModal(true);

          // 2. Dispatch global navigation event to redirect to Orcamentos with parameters!
          window.dispatchEvent(new CustomEvent('paxflow-navigate', {
            detail: { page: 'orcamentos', extraId: orcId }
          }));
        } else if (viagemId) {
          // 1. Close Modal
          closeModal(true);

          // 2. Dispatch global navigation event to redirect to Dashboard with parameters!
          window.dispatchEvent(new CustomEvent('paxflow-navigate', {
            detail: { page: 'dashboard', extraId: viagemId }
          }));
        }
      });
    });
  }
}
