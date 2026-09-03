import { AlertItem, PerfilConsultor } from '../../types';
import { getAvatarSvg } from '../../services/avatars';
import { showCustomAlert, showCustomConfirm } from '../../services/dialog';
import { InboxService } from '../../services/inboxService';
import { EscalaService } from '../../services/escalaService';
import { supabase } from '../../services/supabase';
import { SendTemplateMessageModal } from '../dashboard/SendTemplateMessageModal';

export interface EmailReaderModalOptions {
  onArchive: (item: AlertItem) => Promise<void>;
  onClose: () => void;
  onReply?: (item: AlertItem) => void;
  perfil: PerfilConsultor | null;
  onDelete?: (item: AlertItem) => Promise<void>;
  onMarkUnread?: (item: AlertItem) => Promise<void>;
}

export class EmailReaderModal {
  /**
   * Opens the Corporate styled Email modal details
   */
  static async open(item: AlertItem, options: EmailReaderModalOptions): Promise<void> {
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
    } else if (item.type === 'direct_message') {
      badgeClass = 'bg-purple-600 text-white';
      badgeText = 'Mensagem Direta';
    } else if (item.type === 'campaign_notification') {
      badgeClass = 'bg-emerald-600 text-white';
      badgeText = 'Campanha 🎯';
    } else if (item.type === 'pre-embarque') {
      badgeClass = 'bg-gradient-to-tr from-sky-500 to-indigo-600 dark:from-sky-600 dark:to-indigo-500';
      badgeText = 'Pré-Embarque ✈️';
    } else if (item.type === 'pos-viagem-nps') {
      badgeClass = 'bg-gradient-to-tr from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-500';
      badgeText = 'Pós-Viagem NPS ⭐';
    } else if (item.type === 'escala_solicitacao') {
      badgeClass = 'bg-gradient-to-tr from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white font-extrabold';
      badgeText = 'Escala 📅';
    }

    // Load thread messages if it's a direct message
    let threadMessages: any[] = [];
    if (item.type === 'direct_message' && item.threadId) {
      threadMessages = await InboxService.getThreadMessages(item.threadId);
    }
    const lastMessage = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;

    const firstMsg = threadMessages.length > 0 ? threadMessages[0] : null;
    const headerAvatar = (firstMsg && firstMsg.remetente?.avatar_url) 
      ? firstMsg.remetente.avatar_url 
      : (item.senderAvatar || undefined);
    const headerSenderName = item.isSent ? 'Você' : ((firstMsg && firstMsg.remetente?.nome) ? firstMsg.remetente.nome : item.sender);

    modalOverlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 max-w-2xl w-full border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transform scale-95 transition-all duration-300 relative">
        
        <!-- Modal Top Bar / Fake email tools -->
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center gap-1 ${badgeClass}">
              ${badgeText}
            </span>
            <span class="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Leitor de Mensagem</span>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- Header Archive action -->
            ${item.type !== 'direct_message' || !item.isSent ? `
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
            ` : ''}
            
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
            <div class="w-10 h-10 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 flex-shrink-0">
              ${getAvatarSvg(headerAvatar, headerSenderName, 'w-full h-full')}
            </div>
            <div class="flex-grow min-w-0">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <span class="block text-sm font-extrabold text-slate-800 dark:text-slate-300 truncate">${headerSenderName}</span>
                  <span class="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                    De: &lt;${item.type === 'direct_message' ? (item.sender === 'Você' ? 'voce' : item.sender.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')) + '@paxflow.com.br' : 'alertas@paxflow.com.br'}&gt;
                  </span>
                </div>
                <div class="text-left sm:text-right">
                  <span class="block text-[10px] font-bold text-slate-500 dark:text-slate-400">${item.dateStr}</span>
                  <span class="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    ${item.type === 'direct_message' && item.recipientsHtml ? item.recipientsHtml : 'Para: Você'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Email body (Corporate Paper design) -->
          <div class="space-y-6">
            ${item.type === 'direct_message' && threadMessages.length > 0 ? `
              <div class="space-y-4 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                ${threadMessages.map((msg, index) => {
                  const msgDate = new Date(msg.created_at).toLocaleString('pt-BR');
                  const msgSender = msg.remetente_id === item.consultorId && item.isSent ? 'Você' : (msg.remetente?.nome || 'Consultor');
                  const msgAvatar = msg.remetente?.avatar_url || undefined;
                  const isLast = index === threadMessages.length - 1;
                  
                  return `
                    <div class="p-4 rounded-2xl border ${
                      isLast 
                        ? 'border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/10 dark:bg-indigo-950/10' 
                        : 'border-slate-100 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-950/10'
                    } transition-colors duration-200">
                      <div class="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-3">
                        <div class="w-8 h-8 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 flex-shrink-0">
                          ${getAvatarSvg(msgAvatar, msgSender, 'w-full h-full')}
                        </div>
                        <div class="flex-grow min-w-0">
                          <div class="flex items-center justify-between gap-1">
                            <span class="block text-xs font-black text-slate-800 dark:text-slate-200 truncate">${msgSender}</span>
                            <span class="text-[9px] font-bold text-slate-400 dark:text-slate-400 whitespace-nowrap">${msgDate}</span>
                          </div>
                        </div>
                      </div>
                      <div class="text-xs text-slate-700 dark:text-slate-400 leading-relaxed font-semibold whitespace-pre-wrap">${msg.conteudo}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold bg-slate-50/40 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 shadow-inner">
                <p class="mb-4">Prezado(a) Consultor(a),</p>
                
                <div class="mb-4">${item.body}</div>

                <p class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs text-slate-400 dark:text-slate-400">
                  Atenciosamente,<br>
                  <strong>PaxFlow Cockpit Automático</strong><br>
                  Gestão Operacional e Fluxo de Passageiros
                </p>
              </div>
            `}
          </div>

        </div>

        <!-- Modal Action Footer -->
        <div class="px-4 py-3 sm:px-5 sm:py-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/40 dark:bg-slate-900/40">
          
          <!-- Lado Esquerdo: Ações Primárias (Responder / Ações / Excluir) -->
          <div class="flex items-center gap-2 flex-wrap">
            ${item.type === 'direct_message' && !item.isSent && options.onReply ? `
              <button id="modal-reply-btn" class="flex-1 sm:flex-none px-4 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/>
                </svg>
                <span>Responder</span>
              </button>
            ` : ''}

            ${item.type === 'pre-embarque' ? `
              <button id="modal-action-pre-embarque-btn" class="flex-1 sm:flex-none px-4 py-2 text-xs font-extrabold bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition shadow-md shadow-sky-600/10 flex items-center justify-center gap-1.5" data-viagem-id="${item.targetId}">
                ✈️ Disparar Pré-Embarque
              </button>
            ` : ''}
            ${item.type === 'pos-viagem-nps' ? `
              <button id="modal-action-nps-btn" class="flex-1 sm:flex-none px-4 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5" data-viagem-id="${item.targetId}">
                ⭐ Enviar Pesquisa NPS
              </button>
            ` : ''}

            ${(options.perfil?.role === 'admin' && options.onDelete) ? `
              <button id="modal-delete-btn" class="px-3.5 py-2 text-xs font-extrabold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl transition flex items-center justify-center gap-1.5 border border-rose-200/50 dark:border-rose-900/40 shrink-0">
                🗑️ Excluir
              </button>
            ` : ''}
          </div>

          <!-- Lado Direito: Fechar, Marcar Não Lida, Arquivar -->
          <div class="flex items-center gap-2 justify-end flex-wrap">
            <button id="modal-footer-close-btn" class="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 text-center">
              Fechar
            </button>

            ${options.onMarkUnread ? `
              <button id="modal-footer-unread-btn" class="flex-1 sm:flex-none px-3.5 py-2 text-xs font-extrabold bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl transition border border-indigo-100 dark:border-slate-700/40 flex items-center justify-center gap-1.5 text-center">
                ✉️ Não Lida
              </button>
            ` : ''}
            
            ${item.type !== 'direct_message' || !item.isSent ? `
              <button id="modal-footer-archive-btn" class="flex-1 sm:flex-none px-4 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <polyline points="21 8 21 21 3 21 3 8"></polyline>
                  <rect x="1" y="3" width="22" height="5"></rect>
                  <line x1="10" y1="12" x2="14" y2="12"></line>
                </svg>
                <span>${item.arquivado ? 'Restaurar' : 'Arquivar'}</span>
              </button>
            ` : ''}
          </div>

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

    document.getElementById('modal-footer-unread-btn')?.addEventListener('click', async () => {
      closeModal(true);
      if (options.onMarkUnread) {
        await options.onMarkUnread(item);
      }
    });

    // Reply handler
    document.getElementById('modal-reply-btn')?.addEventListener('click', () => {
      closeModal(true);
      if (options.onReply) {
        if (lastMessage) {
          options.onReply({
            ...item,
            targetId: lastMessage.id, // parent message id
            senderId: lastMessage.remetente_id,
            sender: lastMessage.remetente?.nome || item.sender,
            title: lastMessage.assunto || item.title
          });
        } else {
          options.onReply(item);
        }
      }
    });

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

    // Evento para excluir mensagem
    document.getElementById('modal-delete-btn')?.addEventListener('click', async () => {
      const confirm = await showCustomConfirm(
        'Tem certeza de que deseja excluir permanentemente esta mensagem? Esta ação não pode ser desfeita.',
        'Excluir Mensagem'
      );
      if (!confirm) return;

      try {
        if (options.onDelete) {
          await options.onDelete(item);
          closeModal(true); // Não dispara o onClose normal, a Inbox se atualiza sozinha
        }
      } catch (err: any) {
        showCustomAlert(`Erro ao excluir mensagem:\n\n${err.message || err}`, 'Erro de Ação');
      }
    });

    // Evento do botão de ação de pré-embarque
    document.getElementById('modal-action-pre-embarque-btn')?.addEventListener('click', async () => {
      const viagemId = item.targetId;
      if (!viagemId) return;

      try {
        const { data: v, error } = await supabase
          .from('viagens')
          .select('*, cliente:clientes(*)')
          .eq('id', viagemId)
          .single();

        if (error) throw error;
        if (!v) return;

        closeModal(true);

        SendTemplateMessageModal.open({
          clienteNome: v.cliente?.nome || '',
          clienteTelefone: v.cliente?.telefone || '',
          destino: v.destino,
          localizador: v.codigo_localizador,
          dataIda: v.data_ida,
          viagemId: v.id,
          consultorNome: options.perfil?.nome || 'Consultor',
          showToast: (msg, type) => {
            showCustomAlert(msg, type === 'success' ? 'Sucesso' : 'Erro');
          }
        });
      } catch (err: any) {
        showCustomAlert(`Erro ao abrir modal de WhatsApp:\n\n${err.message}`, 'Erro');
      }
    });

    // Evento do botão de ação de NPS
    document.getElementById('modal-action-nps-btn')?.addEventListener('click', async () => {
      const viagemId = item.targetId;
      if (!viagemId) return;

      try {
        const { data: v, error } = await supabase
          .from('viagens')
          .select('*, cliente:clientes(*)')
          .eq('id', viagemId)
          .single();

        if (error) throw error;
        if (!v) return;

        closeModal(true);

        SendTemplateMessageModal.open({
          clienteNome: v.cliente?.nome || '',
          clienteTelefone: v.cliente?.telefone || '',
          destino: v.destino,
          localizador: v.codigo_localizador,
          dataIda: v.data_ida,
          viagemId: v.id,
          consultorNome: options.perfil?.nome || 'Consultor',
          showToast: (msg, type) => {
            showCustomAlert(msg, type === 'success' ? 'Sucesso' : 'Erro');
          }
        });
      } catch (err: any) {
        showCustomAlert(`Erro ao abrir modal de WhatsApp:\n\n${err.message}`, 'Erro');
      }
    });

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

    // BOTÕES DE AÇÃO DE ESCALA DENTRO DO MODAL DE LEITURA
    modalOverlay.querySelectorAll('.btn-aprovar-escala-inbox').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        if (!solId) return;

        try {
          const adminName = options.perfil?.nome || 'Admin';
          const res = await EscalaService.atualizarStatusSolicitacao(solId, 'aprovado', 'Aprovado via Leitor de Mensagem', adminName);
          closeModal(true);
          if (res.success) {
            showCustomAlert('✅ Solicitação APROVADA com sucesso! A escala foi atualizada no banco de dados.', 'Sucesso');
          } else if (res.alreadyProcessed) {
            showCustomAlert(`⚠️ Esta solicitação já foi respondida anteriormente por ${res.respondidoPor || 'outro Administrador'}.`, 'Aviso');
          }
          window.dispatchEvent(new CustomEvent('paxflow:new-message'));
        } catch (err: any) {
          showCustomAlert(err.message || 'Erro ao aprovar solicitação.', 'Erro');
        }
      });
    });

    modalOverlay.querySelectorAll('.btn-recusar-escala-inbox').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        if (!solId) return;

        try {
          const adminName = options.perfil?.nome || 'Admin';
          const res = await EscalaService.atualizarStatusSolicitacao(solId, 'recusado', 'Recusado pela Gestão via Leitor de Mensagem', adminName);
          closeModal(true);
          if (res.success) {
            showCustomAlert('❌ Solicitação RECUSADA.', 'Info');
          } else if (res.alreadyProcessed) {
            showCustomAlert(`⚠️ Esta solicitação já foi respondida anteriormente por ${res.respondidoPor || 'outro Administrador'}.`, 'Aviso');
          }
          window.dispatchEvent(new CustomEvent('paxflow:new-message'));
        } catch (err: any) {
          showCustomAlert(err.message || 'Erro ao recusar solicitação.', 'Erro');
        }
      });
    });

    modalOverlay.querySelectorAll('.btn-ver-na-escala').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal(true);
        window.dispatchEvent(new CustomEvent('paxflow-navigate', {
          detail: { page: 'inbox', activeTab: 'escala' }
        }));
      });
    });

    modalOverlay.querySelectorAll('.btn-aceitar-troca-inbox, .btn-aceitar-proposta-inbox').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        if (!solId) return;

        const isProposta = btn.classList.contains('btn-aceitar-proposta-inbox');
        const nextStatus = isProposta ? 'aprovado' : 'pendente_admin';
        const obs = isProposta ? 'Aceito pelo consultor' : 'Aceito pelo colega, encaminhado à gestão';

        try {
          const res = await EscalaService.atualizarStatusSolicitacao(solId, nextStatus, obs);
          closeModal(true);
          if (res.success) {
            showCustomAlert(isProposta ? '✅ Proposta aceita! Escala atualizada.' : '✅ Troca aceita! Encaminhada à gestão.', 'Sucesso');
          }
          window.dispatchEvent(new CustomEvent('paxflow:new-message'));
        } catch (err: any) {
          showCustomAlert(err.message || 'Erro ao responder solicitação.', 'Erro');
        }
      });
    });

    modalOverlay.querySelectorAll('.btn-recusar-troca-inbox, .btn-recusar-proposta-inbox').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        if (!solId) return;

        try {
          const res = await EscalaService.atualizarStatusSolicitacao(solId, 'recusado', 'Recusado pelo colega/consultor');
          closeModal(true);
          if (res.success) {
            showCustomAlert('❌ Solicitação recusada.', 'Info');
          }
          window.dispatchEvent(new CustomEvent('paxflow:new-message'));
        } catch (err: any) {
          showCustomAlert(err.message || 'Erro ao recusar solicitação.', 'Erro');
        }
      });
    });
  }
}
