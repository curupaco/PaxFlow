import { supabase } from './supabase';
import { getAvatarSvg } from './avatars';
import { showCustomConfirm } from './dialog';
import { Comentario, PerfilConsultor } from '../types';

export class CommentsService {
  /**
   * Inicializa e renderiza a seção de comentários em um container
   */
  public static async renderCommentsSection(
    container: HTMLElement,
    tipoItem: 'orcamento' | 'viagem' | 'produto',
    itemId: string,
    parentId: string,
    currentUserId: string,
    profiles: PerfilConsultor[]
  ): Promise<void> {
    if (!container) return;

    // Renderiza o esqueleto inicial de carregamento
    container.innerHTML = `
      <div class="space-y-3">
        <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Comentários e Anotações</h4>
        <div class="py-4 text-center text-xs text-slate-400 font-semibold animate-pulse">Carregando comentários...</div>
      </div>
    `;

    try {
      // 1. Buscar os comentários do banco
      const { data: commentsData, error } = await supabase
        .from('comentarios')
        .select('*, autor:profiles(*)')
        .eq('tipo_item', tipoItem)
        .eq('item_id', itemId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const comments: Comentario[] = commentsData || [];

      // 2. Renderizar lista e formulário de novo comentário
      this.buildUI(container, comments, tipoItem, itemId, parentId, currentUserId, profiles);
    } catch (err) {
      console.error('Erro ao renderizar comentários:', err);
      container.innerHTML = `
        <div class="text-xs text-rose-500 font-bold py-2">Falha ao carregar comentários.</div>
      `;
    }
  }

  /**
   * Monta o HTML interno da seção de comentários
   */
  private static buildUI(
    container: HTMLElement,
    comments: Comentario[],
    tipoItem: 'orcamento' | 'viagem' | 'produto',
    itemId: string,
    parentId: string,
    currentUserId: string,
    profiles: PerfilConsultor[]
  ): void {
    const formatarDataHora = (isoStr: string) => {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    // Filtra perfis ativos para o dropdown de menções
    const consultoresAtivos = profiles.filter(p => p.ativo);

    const commentsListHtml = comments.length === 0
      ? `<p class="text-center text-xs text-slate-450 dark:text-slate-500 font-medium py-4">Nenhum comentário inserido.</p>`
      : comments.map(c => {
          const autor = c.autor;
          const autorAvatar = autor ? getAvatarSvg(autor.avatar_url, autor.nome, 'w-6 h-6') : '👤';
          const autorNome = autor ? autor.nome : 'Removido';
          const isOwner = c.autor_id === currentUserId;

          // Destacar menções @nome no texto do comentário
          let textoFormatado = c.texto;
          consultoresAtivos.forEach(p => {
            const mentionTag = `@${p.nome}`;
            if (textoFormatado.includes(mentionTag)) {
              textoFormatado = textoFormatado.split(mentionTag).join(
                `<span class="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 font-extrabold px-1 py-0.5 rounded text-[11px] border border-indigo-100/30 dark:border-indigo-900/30">${mentionTag}</span>`
              );
            }
          });

          return `
            <div class="flex items-start gap-2.5 p-2.5 bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-850 rounded-xl">
              <div class="shrink-0 mt-0.5">${autorAvatar}</div>
              <div class="flex-1 min-w-0 bg-slate-50/10">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="text-xs font-black text-slate-700 dark:text-slate-200 truncate leading-none">${autorNome}</span>
                  <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold">${formatarDataHora(c.created_at)}</span>
                </div>
                <p class="text-xs text-slate-650 dark:text-slate-350 font-semibold whitespace-pre-wrap leading-relaxed">${textoFormatado}</p>
              </div>
              ${isOwner ? `
                <button data-delete-comment-id="${c.id}" class="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-350 dark:text-slate-550 hover:text-rose-600 dark:hover:text-rose-450 rounded-md transition text-[10px]" title="Excluir comentário">
                  🗑️
                </button>
              ` : ''}
            </div>
          `;
        }).join('');

    container.innerHTML = `
      <div class="space-y-4">
        <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">💬 Comentários e Anotações</h4>
        
        <!-- Lista de Comentários -->
        <div class="comments-scroll-area max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          ${commentsListHtml}
        </div>

        <!-- Área de Input -->
        <div class="relative mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <textarea id="comment-textarea-${itemId}" rows="2" placeholder="Escreva uma nota... Use @ para mencionar alguém" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-xs font-medium resize-none custom-scrollbar"></textarea>
          
          <!-- Dropdown Autocomplete de Menções -->
          <div id="mentions-dropdown-${itemId}" class="hidden absolute z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-40 overflow-y-auto p-1.5 min-w-[200px] text-xs font-semibold"></div>

          <div class="flex items-center justify-end gap-2 mt-2">
            <button id="btn-submit-comment-${itemId}" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
              Enviar Nota
            </button>
          </div>
        </div>
      </div>
    `;

    this.setupListeners(container, tipoItem, itemId, parentId, currentUserId, profiles);
  }

  /**
   * Configura ouvintes de evento para os inputs e botões do comentário
   */
  private static setupListeners(
    container: HTMLElement,
    tipoItem: 'orcamento' | 'viagem' | 'produto',
    itemId: string,
    parentId: string,
    currentUserId: string,
    profiles: PerfilConsultor[]
  ): void {
    const textarea = container.querySelector(`#comment-textarea-${itemId}`) as HTMLTextAreaElement;
    const btnSubmit = container.querySelector(`#btn-submit-comment-${itemId}`) as HTMLButtonElement;
    const dropdown = container.querySelector(`#mentions-dropdown-${itemId}`) as HTMLDivElement;

    if (!textarea || !btnSubmit || !dropdown) return;

    let isMentioning = false;
    let mentionSearchStart = -1;

    // Ouvinte para exclusão de comentários
    container.querySelectorAll('[data-delete-comment-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const commentId = btn.getAttribute('data-delete-comment-id');
        if (!commentId) return;

        const confirm = await showCustomConfirm(
          'Deseja realmente excluir este comentário?',
          'Excluir Comentário',
          { isDestructive: true, confirmText: 'Excluir', cancelText: 'Manter' }
        );

        if (confirm) {
          try {
            const { error } = await supabase
              .from('comentarios')
              .delete()
              .eq('id', commentId);

            if (error) throw error;

            // Recarregar
            this.renderCommentsSection(container, tipoItem, itemId, parentId, currentUserId, profiles);
          } catch (err) {
            console.error('Erro ao excluir comentário:', err);
          }
        }
      });
    });

    // Fechar dropdown de menções quando clicar fora
    const handleOutsideClick = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && e.target !== textarea) {
        dropdown.classList.add('hidden');
      }
    };
    document.addEventListener('click', handleOutsideClick);

    // Controle de autocompletar ao digitar
    textarea.addEventListener('input', () => {
      const text = textarea.value;
      const cursor = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursor);

      // Encontra a última ocorrência do caractere @ antes do cursor
      const lastAtIdx = textBeforeCursor.lastIndexOf('@');

      // Verifica se o @ está ativo (não está separado por espaços depois dele)
      if (lastAtIdx !== -1 && !/\s/.test(textBeforeCursor.substring(lastAtIdx + 1))) {
        isMentioning = true;
        mentionSearchStart = lastAtIdx;
        const searchTerm = textBeforeCursor.substring(lastAtIdx + 1).toLowerCase();

        const filtered = profiles.filter(p => 
          p.ativo && p.nome.toLowerCase().includes(searchTerm)
        );

        if (filtered.length > 0) {
          this.renderDropdownItems(dropdown, filtered, (selectedProfile) => {
            // Substitui a menção pelo nome completo do usuário selecionado
            const textAfterCursor = text.substring(cursor);
            const beforeMention = text.substring(0, mentionSearchStart);
            textarea.value = `${beforeMention}@${selectedProfile.nome} ${textAfterCursor}`;
            textarea.focus();
            
            // Move cursor para depois da menção autocompletada
            const newCursorPos = beforeMention.length + selectedProfile.nome.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);

            dropdown.classList.add('hidden');
            isMentioning = false;
          });

          // Posicionar o dropdown logo acima ou abaixo do textarea
          dropdown.className = "absolute z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-40 overflow-y-auto p-1.5 min-w-[200px] text-xs font-semibold left-0 bottom-full mb-1";
          dropdown.classList.remove('hidden');
        } else {
          dropdown.classList.add('hidden');
        }
      } else {
        dropdown.classList.add('hidden');
        isMentioning = false;
      }
    });

    // Enviar comentário ao clicar no botão
    btnSubmit.addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (!text) return;

      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Enviando...';

      try {
        // 1. Salvar o comentário
        const { data: newComment, error: errComment } = await supabase
          .from('comentarios')
          .insert({
            tipo_item: tipoItem,
            item_id: itemId,
            autor_id: currentUserId,
            texto: text
          })
          .select()
          .single();

        if (errComment) throw errComment;

        // 2. Disparar notificações de menções
        await this.processMentions(newComment.id, text, tipoItem, itemId, parentId, currentUserId, profiles);

        // 3. Limpar campo e re-renderizar
        textarea.value = '';
        this.renderCommentsSection(container, tipoItem, itemId, parentId, currentUserId, profiles);
      } catch (err) {
        console.error('Erro ao enviar comentário:', err);
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar Nota';
      }
    });
  }

  /**
   * Renderiza os itens do autocomplete
   */
  private static renderDropdownItems(
    dropdown: HTMLDivElement,
    list: PerfilConsultor[],
    onSelect: (p: PerfilConsultor) => void
  ): void {
    dropdown.innerHTML = list.map(p => `
      <button type="button" class="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg flex items-center gap-2 transition duration-200 text-slate-700 dark:text-slate-200" data-mention-user-id="${p.id}">
        <span class="shrink-0">${getAvatarSvg(p.avatar_url, p.nome, 'w-4 h-4')}</span>
        <span class="truncate">${p.nome}</span>
      </button>
    `).join('');

    dropdown.querySelectorAll('[data-mention-user-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const userId = btn.getAttribute('data-mention-user-id');
        const profile = list.find(p => p.id === userId);
        if (profile) onSelect(profile);
      });
    });
  }

  /**
   * Analisa menções e cria as notificações no Supabase
   */
  private static async processMentions(
    commentId: string,
    texto: string,
    tipoItem: 'orcamento' | 'viagem' | 'produto',
    itemId: string,
    parentId: string,
    currentUserId: string,
    profiles: PerfilConsultor[]
  ): Promise<void> {
    const mentions: PerfilConsultor[] = [];

    // Encontra todos os usuários mencionados no comentário
    for (const p of profiles) {
      if (p.id === currentUserId) continue; // Ignora auto-mencionar

      // Verifica se a menção existe no texto (exemplo: @João Silva)
      const mentionTag = `@${p.nome}`;
      const index = texto.indexOf(mentionTag);

      if (index !== -1) {
        // Garante que a menção está delimitada (espaço, pontuação ou fim de linha)
        const charAfter = texto[index + mentionTag.length];
        if (!charAfter || /[\s.,!?;:]/.test(charAfter)) {
          mentions.push(p);
        }
      }
    }

    if (mentions.length === 0) return;

    // Insere as notificações em lote
    const notificationsPayload = mentions.map(p => ({
      user_id: p.id,
      comentario_id: commentId,
      tipo_item: tipoItem,
      item_id: itemId,
      parent_id: parentId,
      lida: false,
      arquivada: false
    }));

    const { error } = await supabase
      .from('notificacoes')
      .insert(notificationsPayload);

    if (error) {
      console.error('Erro ao inserir notificações de menção:', error);
    }
  }

  /**
   * Abre um modal overlay secundário dedicado aos comentários de um produto
   */
  public static openProductCommentsModal(
    productId: string,
    viagemId: string,
    productName: string,
    currentUserId: string,
    profiles: PerfilConsultor[],
    onClose?: () => void
  ): void {
    const overlayId = 'modal-overlay-product-comments';
    let overlay = document.getElementById(overlayId);

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[60] flex items-center justify-center p-4 transition-all duration-300 opacity-0 pointer-events-none';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 transform scale-95 transition-all duration-300 max-h-[80vh] overflow-hidden flex flex-col" id="modal-container-product-comments">
          <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">📦 Notas do Produto</h3>
              <p class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate max-w-[300px]">${productName}</p>
            </div>
            <button id="btn-close-product-comments-modal" class="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-450 font-bold transition">✕</button>
          </div>
          <div id="product-comments-content-container" class="p-5 overflow-y-auto flex-1 custom-scrollbar"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const container = overlay.querySelector('#product-comments-content-container') as HTMLDivElement;
    const modalContainer = overlay.querySelector('#modal-container-product-comments') as HTMLDivElement;

    // Fecha o modal
    const closeCommentsModal = () => {
      modalContainer.classList.remove('scale-100');
      modalContainer.classList.add('scale-95');
      overlay.classList.remove('opacity-100', 'pointer-events-auto');
      overlay.classList.add('opacity-0', 'pointer-events-none');
      if (onClose) onClose();
    };

    // Remove existing event listener if any to avoid duplication
    const closeBtn = overlay.querySelector('#btn-close-product-comments-modal');
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener('click', closeCommentsModal);
    }

    // Animar abertura
    setTimeout(() => {
      if (overlay) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
      }
      if (modalContainer) {
        modalContainer.classList.remove('scale-95');
        modalContainer.classList.add('scale-100');
      }
    }, 10);

    // Renderizar a seção de comentários
    this.renderCommentsSection(container, 'produto', productId, viagemId, currentUserId, profiles);
  }
}
