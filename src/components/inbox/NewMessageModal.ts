import { supabase } from '../../services/supabase';
import { PerfilConsultor } from '../../types';
import { showCustomAlert } from '../../services/dialog';

export interface NewMessageModalOptions {
  onSent: () => void;
  replyTo?: {
    senderId: string;
    senderNome: string;
    assunto: string;
  };
}

export class NewMessageModal {
  static async open(options: NewMessageModalOptions): Promise<void> {
    // 1. Fetch active profiles to populate autocomplete
    let profiles: PerfilConsultor[] = [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      profiles = data || [];
    } catch (err) {
      console.error('Erro ao carregar perfis para destinatários:', err);
      showCustomAlert('Não foi possível carregar a lista de consultores para envio.', 'Erro');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;
    if (!currentUser) {
      showCustomAlert('Usuário não autenticado.', 'Erro');
      return;
    }

    // Filter out current user from recipients list so you don't message yourself by default
    const availableRecipients = profiles.filter(p => p.id !== currentUser.id);

    // Selected state
    let paraSelected: PerfilConsultor[] = [];
    let ccSelected: PerfilConsultor[] = [];

    // Pre-populate if reply
    if (options.replyTo) {
      const originalSender = profiles.find(p => p.id === options.replyTo?.senderId);
      if (originalSender) {
        paraSelected.push(originalSender);
      }
    }

    // 2. Create Modal Overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'new-message-modal';
    modalOverlay.className = 'fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn';

    const subjectVal = options.replyTo 
      ? options.replyTo.assunto.startsWith('Re:') 
        ? options.replyTo.assunto 
        : `Re: ${options.replyTo.assunto}`
      : '';

    modalOverlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 max-w-2xl w-full border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transform scale-95 transition-all duration-300">
        
        <!-- Modal Header -->
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
          <div class="flex items-center gap-2">
            <span class="p-1 bg-indigo-500 rounded text-white">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </span>
            <span class="text-sm font-extrabold text-slate-700 dark:text-slate-200">Nova Mensagem Direta</span>
          </div>
          <button id="msg-close-btn" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition">
            <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Compose Form -->
        <div class="p-6 space-y-4 overflow-y-auto max-h-[65vh] custom-scrollbar">
          
          <!-- PARA FIELD -->
          <div class="space-y-1 relative">
            <label class="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Para</label>
            <div id="para-tags-container" class="flex flex-wrap items-center gap-2 p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 focus-within:border-indigo-500 transition min-h-[46px]">
              <!-- tags here -->
              <input id="para-input" type="text" placeholder="${paraSelected.length === 0 ? 'Selecione destinatários...' : ''}" class="flex-grow bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none min-w-[150px]">
            </div>
            <!-- Dropdown -->
            <div id="para-dropdown" class="hidden absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1"></div>
          </div>

          <!-- CC FIELD -->
          <div class="space-y-1 relative">
            <label class="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cc (Cópia)</label>
            <div id="cc-tags-container" class="flex flex-wrap items-center gap-2 p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 focus-within:border-indigo-500 transition min-h-[46px]">
              <!-- tags here -->
              <input id="cc-input" type="text" placeholder="${ccSelected.length === 0 ? 'Selecione cópias (opcional)...' : ''}" class="flex-grow bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none min-w-[150px]">
            </div>
            <!-- Dropdown -->
            <div id="cc-dropdown" class="hidden absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1"></div>
          </div>

          <!-- SUBJECT FIELD -->
          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assunto</label>
            <input id="msg-subject-input" type="text" value="${subjectVal}" placeholder="Digite o assunto..." class="w-full px-4 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 focus:border-indigo-500 focus:outline-none text-slate-700 dark:text-slate-200">
          </div>

          <!-- BODY FIELD -->
          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mensagem</label>
            <textarea id="msg-body-input" rows="8" placeholder="Digite o conteúdo da mensagem..." class="w-full px-4 py-3 text-sm font-semibold border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 focus:border-indigo-500 focus:outline-none text-slate-700 dark:text-slate-200 resize-none custom-scrollbar"></textarea>
          </div>

        </div>

        <!-- Modal Footer -->
        <div class="px-5 py-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 bg-slate-50/40 dark:bg-slate-900/40">
          <button id="msg-cancel-btn" class="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40">
            Cancelar
          </button>
          
          <button id="msg-send-btn" class="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            <span>Enviar Mensagem</span>
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Apply zoom transition
    setTimeout(() => {
      const modalContent = modalOverlay.querySelector('.scale-95');
      if (modalContent) {
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
      }
    }, 10);

    // Cache DOM Elements
    const paraInput = document.getElementById('para-input') as HTMLInputElement;
    const paraTagsContainer = document.getElementById('para-tags-container') as HTMLDivElement;
    const paraDropdown = document.getElementById('para-dropdown') as HTMLDivElement;

    const ccInput = document.getElementById('cc-input') as HTMLInputElement;
    const ccTagsContainer = document.getElementById('cc-tags-container') as HTMLDivElement;
    const ccDropdown = document.getElementById('cc-dropdown') as HTMLDivElement;

    const subjectInput = document.getElementById('msg-subject-input') as HTMLInputElement;
    const bodyInput = document.getElementById('msg-body-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('msg-send-btn') as HTMLButtonElement;

    const closeModal = () => {
      const modalContent = modalOverlay.querySelector('.scale-100');
      if (modalContent) {
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('scale-95');
      }
      modalOverlay.classList.add('opacity-0');
      setTimeout(() => modalOverlay.remove(), 200);
    };

    // Close listeners
    document.getElementById('msg-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('msg-cancel-btn')?.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Helper: render tags
    const renderTags = (type: 'para' | 'cc') => {
      const container = type === 'para' ? paraTagsContainer : ccTagsContainer;
      const list = type === 'para' ? paraSelected : ccSelected;
      const input = type === 'para' ? paraInput : ccInput;

      // Remove existing tags
      container.querySelectorAll('.recipient-tag').forEach(tag => tag.remove());

      // Insert tags before the input
      list.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'recipient-tag flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-100/55 dark:border-indigo-900/30';
        tag.innerHTML = `
          <span>${item.nome}</span>
          <button class="remove-tag-btn hover:text-rose-500 transition ml-0.5 focus:outline-none" data-id="${item.id}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        `;
        tag.querySelector('.remove-tag-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = (e.currentTarget as HTMLElement).getAttribute('data-id');
          if (type === 'para') {
            paraSelected = paraSelected.filter(p => p.id !== targetId);
          } else {
            ccSelected = ccSelected.filter(p => p.id !== targetId);
          }
          renderTags(type);
        });
        container.insertBefore(tag, input);
      });

      // Adjust placeholder
      if (list.length > 0) {
        input.removeAttribute('placeholder');
      } else {
        input.setAttribute('placeholder', type === 'para' ? 'Selecione destinatários...' : 'Selecione cópias (opcional)...');
      }
    };

    // Render initial tags if reply
    renderTags('para');

    // Helper: show/populate dropdown
    const renderDropdown = (type: 'para' | 'cc', query: string = '') => {
      const dropdown = type === 'para' ? paraDropdown : ccDropdown;
      const selectedIds = (type === 'para' ? paraSelected : ccSelected).map(p => p.id);
      
      const filtered = availableRecipients.filter(p => {
        const notSelected = !selectedIds.includes(p.id);
        const matchesQuery = p.nome.toLowerCase().includes(query.toLowerCase());
        return notSelected && matchesQuery;
      });

      if (filtered.length === 0) {
        dropdown.innerHTML = `<div class="px-4 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500">Nenhum consultor encontrado</div>`;
      } else {
        dropdown.innerHTML = filtered.map(p => `
          <button class="dropdown-item w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between" data-id="${p.id}">
            <span>${p.nome}</span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">${p.role === 'admin' ? 'Administrador' : 'Consultor'}</span>
          </button>
        `).join('');

        dropdown.querySelectorAll('.dropdown-item').forEach(btn => {
          btn.addEventListener('click', () => {
            const pId = btn.getAttribute('data-id');
            const prof = availableRecipients.find(p => p.id === pId);
            if (prof) {
              if (type === 'para') {
                paraSelected.push(prof);
                paraInput.value = '';
                renderTags('para');
              } else {
                ccSelected.push(prof);
                ccInput.value = '';
                renderTags('cc');
              }
            }
            dropdown.classList.add('hidden');
          });
        });
      }

      dropdown.classList.remove('hidden');
    };

    // Dropdown input listeners
    paraInput.addEventListener('focus', () => renderDropdown('para', paraInput.value));
    paraInput.addEventListener('input', () => renderDropdown('para', paraInput.value));
    ccInput.addEventListener('focus', () => renderDropdown('cc', ccInput.value));
    ccInput.addEventListener('input', () => renderDropdown('cc', ccInput.value));

    // Hide dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!paraTagsContainer.contains(target) && !paraDropdown.contains(target)) {
        paraDropdown.classList.add('hidden');
      }
      if (!ccTagsContainer.contains(target) && !ccDropdown.contains(target)) {
        ccDropdown.classList.add('hidden');
      }
    });

    // --- SEND ACTION ---
    sendBtn.addEventListener('click', async () => {
      // 1. Validations
      if (paraSelected.length === 0) {
        showCustomAlert('Por favor, selecione ao menos um destinatário no campo "Para".', 'Validação');
        return;
      }
      const assunto = subjectInput.value.trim();
      if (!assunto) {
        showCustomAlert('Por favor, informe o assunto da mensagem.', 'Validação');
        return;
      }
      const conteudo = bodyInput.value.trim();
      if (!conteudo) {
        showCustomAlert('Por favor, escreva o conteúdo da mensagem.', 'Validação');
        return;
      }

      // 2. Submit loading UI
      const originalBtnHtml = sendBtn.innerHTML;
      sendBtn.disabled = true;
      sendBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Enviando...</span>
      `;

      try {
        // 3. Database inserts
        // Insert message
        const { data: msgData, error: msgErr } = await supabase
          .from('mensagens_diretas')
          .insert({
            remetente_id: currentUser.id,
            assunto,
            conteudo
          })
          .select()
          .single();

        if (msgErr) throw msgErr;
        if (!msgData) throw new Error('Não foi possível registrar a mensagem.');

        // Insert recipients
        const destInserts: any[] = [];
        paraSelected.forEach(p => {
          destInserts.push({ mensagem_id: msgData.id, destinatario_id: p.id, tipo: 'para' });
        });
        ccSelected.forEach(p => {
          destInserts.push({ mensagem_id: msgData.id, destinatario_id: p.id, tipo: 'cc' });
        });

        const { error: destErr } = await supabase
          .from('mensagem_destinatarios')
          .insert(destInserts);

        if (destErr) throw destErr;

        // Insert notifications for all recipients (individual copies in user's inbox)
        const uniqueRecipients = Array.from(new Set([...paraSelected.map(p => p.id), ...ccSelected.map(p => p.id)]));
        const notifInserts = uniqueRecipients.map(recipientId => ({
          user_id: recipientId,
          tipo_item: 'mensagem',
          item_id: msgData.id,
          parent_id: msgData.id,
          mensagem_id: msgData.id,
          lida: false,
          arquivada: false
        }));

        const { error: notifErr } = await supabase
          .from('notificacoes')
          .insert(notifInserts);

        if (notifErr) throw notifErr;

        // 4. Success Flow
        closeModal();
        options.onSent();

      } catch (err: any) {
        console.error('Erro ao enviar mensagem direta:', err);
        showCustomAlert(`Ocorreu um erro ao enviar a mensagem:\n\n${err.message || err}`, 'Erro de Envio');
        
        // Reset button
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalBtnHtml;
      }
    });

  }
}
