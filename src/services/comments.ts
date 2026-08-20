import { supabase } from './supabase';
import { getAvatarSvg } from './avatars';
import { showCustomConfirm } from './dialog';
import { Comentario, PerfilConsultor } from '../types';

function converterLinks(texto: string): string {
  if (!texto) return '';
  const textoEscapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const urlRegex = /(https?:\/\/[^\s<]+[^#.,?;()\]\s<])/g;
  return textoEscapado.replace(urlRegex, (url) => {
    const label = url.length > 50 ? url.substring(0, 47) + '...' : url;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-650 hover:underline dark:text-indigo-400 break-all font-bold">🔗 ${label}</a>`;
  });
}

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
      ? `<p class="text-center text-xs text-slate-400 dark:text-slate-500 font-medium py-4">Nenhum comentário inserido.</p>`
      : comments.map(c => {
          const autor = c.autor;
          const autorAvatar = autor ? getAvatarSvg(autor.avatar_url, autor.nome, 'w-6 h-6') : '👤';
          const autorNome = autor ? autor.nome : 'Removido';
          const isOwner = c.autor_id === currentUserId;

          // Destacar menções @nome no texto do comentário
          let textoFormatado = converterLinks(c.texto);
          if (consultoresAtivos.length > 0) {
            const namesToCheck: string[] = [];
            for (const p of consultoresAtivos) {
              namesToCheck.push(p.nome);
              const firstName = p.nome.split(' ')[0];
              if (firstName && firstName !== p.nome) {
                namesToCheck.push(firstName);
              }
            }
            const namesRegexPart = namesToCheck
              .map(n => n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
              .sort((a, b) => b.length - a.length)
              .join('|');
            const regex = new RegExp(`@(${namesRegexPart})(?=$|[\\s.,!?;:])`, 'gi');
            textoFormatado = textoFormatado.replace(regex, (match) => {
              return `<span class="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold px-1 py-0.5 rounded text-[11px] border border-indigo-100/30 dark:border-indigo-900/30">${match}</span>`;
            });
          }

          return `
            <div class="flex items-start gap-2.5 p-2.5 bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div class="shrink-0 mt-0.5">${autorAvatar}</div>
              <div class="flex-1 min-w-0 bg-slate-50/10">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="text-xs font-black text-slate-700 dark:text-slate-200 truncate leading-none">${autorNome}</span>
                  <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold">${formatarDataHora(c.created_at)}</span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-400 font-semibold whitespace-pre-wrap leading-relaxed break-words break-all">${textoFormatado}</p>
              </div>
              ${isOwner ? `
                <button data-delete-comment-id="${c.id}" class="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition text-[10px]" title="Excluir comentário">
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
          <textarea id="comment-textarea-${itemId}" rows="2" placeholder="Escreva uma nota... Use @ para mencionar alguém" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-xs font-medium resize-none custom-scrollbar"></textarea>
          
          <!-- Dropdown Autocomplete de Menções -->
          <div id="mentions-dropdown-${itemId}" class="hidden absolute z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-40 overflow-y-auto p-1.5 min-w-[200px] text-xs font-semibold"></div>

          <!-- Botões de Ação -->
          <div class="flex items-center justify-between mt-2 flex-wrap gap-2">
            <button id="btn-toggle-sched-${itemId}" type="button" class="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold flex items-center gap-1.5">
              📅 Agendar Alerta / Lembrete
            </button>
            <button id="btn-submit-comment-${itemId}" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
              Enviar Nota
            </button>
          </div>

          <!-- Painel colapsado do Agendador -->
          <div id="sched-panel-${itemId}" class="hidden border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/10 mt-3 space-y-2.5">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div class="space-y-1">
                <label class="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data do Alerta</label>
                <input id="sched-date-${itemId}" type="text" placeholder="DD/MM/YYYY" class="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-xs font-semibold" />
              </div>
              <div class="space-y-1">
                <label class="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Período</label>
                <select id="sched-period-${itemId}" class="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-xs font-semibold">
                  <option value="manha">🌅 Manhã</option>
                  <option value="tarde" selected>☀️ Tarde</option>
                  <option value="noite">🌙 Noite</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Para quem?</label>
                <select id="sched-user-${itemId}" class="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-xs font-semibold">
                  ${consultoresAtivos.map(p => `<option value="${p.id}" ${p.id === currentUserId ? 'selected' : ''}>${p.nome}</option>`).join('')}
                </select>
              </div>
            </div>
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

    const btnToggle = container.querySelector(`#btn-toggle-sched-${itemId}`) as HTMLButtonElement;
    const schedPanel = container.querySelector(`#sched-panel-${itemId}`) as HTMLDivElement;
    const schedDateInput = container.querySelector(`#sched-date-${itemId}`) as HTMLInputElement;
    const schedPeriodSelect = container.querySelector(`#sched-period-${itemId}`) as HTMLSelectElement;
    const schedUserSelect = container.querySelector(`#sched-user-${itemId}`) as HTMLSelectElement;

    btnToggle?.addEventListener('click', (e) => {
      e.preventDefault();
      if (schedPanel.classList.contains('hidden')) {
        schedPanel.classList.remove('hidden');
        schedDateInput.focus();
      } else {
        schedPanel.classList.add('hidden');
        schedDateInput.value = '';
      }
    });

    // Auto-mask for date field (DD/MM/YYYY)
    schedDateInput?.addEventListener('input', () => {
      let v = schedDateInput.value.replace(/\D/g, '');
      if (v.length > 8) v = v.slice(0, 8);
      if (v.length > 4) {
        schedDateInput.value = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
      } else if (v.length > 2) {
        schedDateInput.value = `${v.slice(0, 2)}/${v.slice(2)}`;
      } else {
        schedDateInput.value = v;
      }
    });

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

    let activeOutsideClickListener: ((e: MouseEvent) => void) | null = null;

    const hideDropdown = () => {
      dropdown.classList.add('hidden');
      if (activeOutsideClickListener) {
        document.removeEventListener('click', activeOutsideClickListener);
        activeOutsideClickListener = null;
      }
    };

    const showDropdown = () => {
      if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        if (!activeOutsideClickListener) {
          activeOutsideClickListener = (e: MouseEvent) => {
            if (!dropdown.contains(e.target as Node) && e.target !== textarea) {
              hideDropdown();
            }
          };
          // Usamos setTimeout para evitar que o clique atual feche imediatamente o dropdown recém-aberto
          setTimeout(() => {
            if (activeOutsideClickListener) {
              document.addEventListener('click', activeOutsideClickListener);
            }
          }, 0);
        }
      }
    };

    // Controle de autocompletar ao digitar
    textarea.addEventListener('input', () => {
      const text = textarea.value;
      const cursor = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursor);

      // Encontra a última ocorrência do caractere @ antes do cursor
      const lastAtIdx = textBeforeCursor.lastIndexOf('@');

      if (lastAtIdx !== -1) {
        const charBeforeAt = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : '';
        // Evita abrir dropdown ao digitar e-mails ou palavras normais coladas ao @
        if (!charBeforeAt || /[\s.,!?;:]/.test(charBeforeAt)) {
          const searchTerm = textBeforeCursor.substring(lastAtIdx + 1);

          // Só ativamos a menção se o termo de busca corresponder ao início do nome de algum consultor ativo
          // e não contiver quebra de linha
          const filtered = profiles.filter(p => 
            p.ativo && p.nome.toLowerCase().startsWith(searchTerm.toLowerCase())
          );

          if (filtered.length > 0 && !/\n/.test(searchTerm)) {
            isMentioning = true;
            mentionSearchStart = lastAtIdx;

            this.renderDropdownItems(dropdown, filtered, (selectedProfile) => {
              // Substitui a menção pelo nome completo do usuário selecionado
              const textAfterCursor = text.substring(cursor);
              const beforeMention = text.substring(0, mentionSearchStart);
              textarea.value = `${beforeMention}@${selectedProfile.nome} ${textAfterCursor}`;
              textarea.focus();
              
              // Move cursor para depois da menção autocompletada
              const newCursorPos = beforeMention.length + selectedProfile.nome.length + 2;
              textarea.setSelectionRange(newCursorPos, newCursorPos);

              hideDropdown();
              isMentioning = false;
            });

            // Posicionar o dropdown logo acima ou abaixo do textarea
            dropdown.className = "absolute z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-40 overflow-y-auto p-1.5 min-w-[200px] text-xs font-semibold left-0 bottom-full mb-1";
            showDropdown();
          } else {
            hideDropdown();
            isMentioning = false;
          }
        } else {
          hideDropdown();
          isMentioning = false;
        }
      } else {
        hideDropdown();
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

        // 2.5. Processar agendamento (visual ou automático por texto)
        let visualScheduled = false;
        if (schedPanel && !schedPanel.classList.contains('hidden') && schedDateInput.value.trim()) {
          const rawDate = schedDateInput.value.trim();
          const regexData = /^\d{2}\/\d{2}\/\d{4}$/;
          if (regexData.test(rawDate)) {
            const parts = rawDate.split('/');
            const dataLembrete = `${parts[2]}-${parts[1]}-${parts[0]}`;
            const periodo = schedPeriodSelect.value;
            const targetUser = schedUserSelect.value;

            let orcamentoId: string | null = null;
            let viagemId: string | null = null;

            if (tipoItem === 'orcamento') orcamentoId = itemId;
            else if (tipoItem === 'viagem') viagemId = itemId;
            else if (tipoItem === 'produto') {
              try {
                const { data: pData } = await supabase.from('produtos_viagem').select('viagem_id').eq('id', itemId).single();
                if (pData) viagemId = pData.viagem_id || null;
              } catch (e) {}
            }

            await supabase.from('lembretes').insert({
              orcamento_id: orcamentoId,
              viagem_id: viagemId,
              consultor_id: targetUser,
              criador_id: currentUserId,
              data_lembrete: dataLembrete,
              periodo: periodo,
              arquivado: false
            });
            visualScheduled = true;
          }
        }

        if (!visualScheduled) {
          await this.checkAndParseCommentSchedule(text, tipoItem, itemId, currentUserId, profiles);
        }

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
      <button type="button" class="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition duration-200 text-slate-700 dark:text-slate-200" data-mention-user-id="${p.id}">
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
    console.log('[Mentions] processMentions iniciado.', { commentId, texto, currentUserId, profilesCount: profiles?.length });
    const otherProfiles = (profiles || []).filter(p => p.id !== currentUserId && p.ativo);
    console.log('[Mentions] Consultores ativos (excluindo autor):', otherProfiles.map(p => p.nome));

    if (otherProfiles.length === 0) {
      console.warn('[Mentions] Nenhum outro consultor ativo encontrado para notificar.');
      return;
    }

    const matchedRanges: { start: number; end: number; profile: PerfilConsultor }[] = [];

    // Normaliza a string removendo acentos/diacríticos e convertendo para minúsculas
    const normalizeStr = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const textNormalized = normalizeStr(texto);

    // Encontra todas as ocorrências de menções no texto de forma case e accent-insensitive
    for (const p of otherProfiles) {
      const firstName = p.nome.split(' ')[0];
      const tagsToCheck = [
        `@${p.nome}`,
        `@${firstName}`
      ];
      // Remove duplicados e normaliza cada tag de busca
      const uniqueNormalizedTags = Array.from(new Set(tagsToCheck.map(t => normalizeStr(t))));

      for (const tag of uniqueNormalizedTags) {
        let index = textNormalized.indexOf(tag);
        while (index !== -1) {
          // Garante que a menção está delimitada (espaço, pontuação ou fim de linha)
          const charAfter = texto[index + tag.length];
          if (!charAfter || /[\s.,!?;:]/.test(charAfter)) {
            matchedRanges.push({
              start: index,
              end: index + tag.length,
              profile: p
            });
          }
          index = textNormalized.indexOf(tag, index + 1);
        }
      }
    }

    console.log('[Mentions] Ranges casados:', matchedRanges.map(r => ({ nome: r.profile.nome, start: r.start, end: r.end })));

    // Filtra ranges sobrepostos (ex: se houver @fernanda ganem e @fernanda no mesmo local, mantém apenas o mais longo)
    const finalMentions = matchedRanges.filter(r1 => {
      const isSubRange = matchedRanges.some(r2 => 
        r2 !== r1 && 
        r2.start <= r1.start && 
        r2.end >= r1.end && 
        (r2.end - r2.start) > (r1.end - r1.start)
      );
      return !isSubRange;
    });

    // Pega a lista única de IDs de perfis correspondentes
    const uniqueMentionIds = Array.from(new Set(finalMentions.map(r => r.profile.id)));
    const uniqueMentions = uniqueMentionIds
      .map(id => otherProfiles.find(p => p.id === id))
      .filter((p): p is PerfilConsultor => !!p);

    console.log('[Mentions] Menções finais desduplicadas:', uniqueMentions.map(p => p.nome));

    if (uniqueMentions.length === 0) {
      console.log('[Mentions] Nenhuma menção válida encontrada no texto.');
      return;
    }

    // Insere as notificações em lote
    const notificationsPayload = uniqueMentions.map(p => ({
      user_id: p.id,
      comentario_id: commentId,
      tipo_item: tipoItem,
      item_id: itemId,
      parent_id: parentId,
      lida: false,
      arquivada: false
    }));

    console.log('[Mentions] Inserindo notificações no Supabase:', notificationsPayload);
    const { data, error } = await supabase
      .from('notificacoes')
      .insert(notificationsPayload)
      .select();

    if (error) {
      console.error('[Mentions] Erro ao inserir notificações de menção:', error);
    } else {
      console.log('[Mentions] Notificações inseridas com sucesso no banco:', data);
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
            <button id="btn-close-product-comments-modal" class="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 font-bold transition">✕</button>
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

  /**
   * Abre um modal overlay secundário dedicado aos comentários de qualquer item (viagem, produto ou orçamento)
   */
  public static openCommentsModal(
    tipoItem: 'orcamento' | 'viagem' | 'produto',
    itemId: string,
    parentId: string,
    title: string,
    subtitle: string,
    currentUserId: string,
    profiles: PerfilConsultor[],
    onClose?: () => void
  ): void {
    const overlayId = 'modal-overlay-generic-comments';
    let overlay = document.getElementById(overlayId);

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[60] flex items-center justify-center p-4 transition-all duration-300 opacity-0 pointer-events-none';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 transform scale-95 transition-all duration-300 max-h-[80vh] overflow-hidden flex flex-col" id="modal-container-generic-comments">
          <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5" id="generic-comments-title">💬 Comentários</h3>
              <p class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate max-w-[300px]" id="generic-comments-subtitle">${subtitle}</p>
            </div>
            <button id="btn-close-generic-comments-modal" class="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 font-bold transition">✕</button>
          </div>
          <div id="generic-comments-content-container" class="p-5 overflow-y-auto flex-1 custom-scrollbar"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      const titleEl = overlay.querySelector('#generic-comments-title');
      const subtitleEl = overlay.querySelector('#generic-comments-subtitle');
      if (titleEl) titleEl.innerHTML = title;
      if (subtitleEl) subtitleEl.textContent = subtitle;
    }

    const container = overlay.querySelector('#generic-comments-content-container') as HTMLDivElement;
    const modalContainer = overlay.querySelector('#modal-container-generic-comments') as HTMLDivElement;

    // Fecha o modal
    const closeCommentsModal = () => {
      modalContainer.classList.remove('scale-100');
      modalContainer.classList.add('scale-95');
      overlay!.classList.remove('opacity-100', 'pointer-events-auto');
      overlay!.classList.add('opacity-0', 'pointer-events-none');
      if (onClose) onClose();
    };

    // Remove existing event listener if any to avoid duplication
    const closeBtn = overlay.querySelector('#btn-close-generic-comments-modal');
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
    this.renderCommentsSection(container, tipoItem, itemId, parentId, currentUserId, profiles);
  }

  /**
   * Scans comment text for a mention (@Name) and a valid date (DD/MM/YYYY)
   * to automatically schedule a reminder in the calendar.
   */
  private static async checkAndParseCommentSchedule(
    texto: string,
    tipoItem: 'orcamento' | 'viagem' | 'produto',
    itemId: string,
    currentUserId: string,
    profiles: PerfilConsultor[]
  ): Promise<void> {
    const dateRegex = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
    const dateMatch = texto.match(dateRegex);
    if (!dateMatch) return; // No date found

    const dataLembrete = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;

    // Period extraction
    const periodRegex = /\b(manha|manhã|tarde|noite)\b/i;
    let periodo: 'manha' | 'tarde' | 'noite' = 'tarde';
    const periodMatch = texto.match(periodRegex);
    if (periodMatch) {
      const pStr = periodMatch[1].toLowerCase();
      if (pStr.startsWith('man')) periodo = 'manha';
      else if (pStr === 'noite') periodo = 'noite';
    }

    // Mention extraction
    const activeProfiles = (profiles || []).filter(p => p.ativo);
    let targetConsultantId: string | null = null;

    for (const p of activeProfiles) {
      const escapedName = p.nome.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pRegex = new RegExp(`@${escapedName}`, 'i');
      
      const firstName = p.nome.split(' ')[0];
      const pFirstRegex = firstName ? new RegExp(`@${firstName}`, 'i') : null;

      if (pRegex.test(texto) || (pFirstRegex && pFirstRegex.test(texto))) {
        targetConsultantId = p.id;
        break;
      }
    }

    if (!targetConsultantId) {
      // If no other user mentioned but date found, assign to self
      targetConsultantId = currentUserId;
    }

    // Resolve IDs
    let orcamentoId: string | null = null;
    let viagemId: string | null = null;

    if (tipoItem === 'orcamento') {
      orcamentoId = itemId;
    } else if (tipoItem === 'viagem') {
      viagemId = itemId;
    } else if (tipoItem === 'produto') {
      try {
        const { data: pData } = await supabase.from('produtos_viagem').select('viagem_id').eq('id', itemId).single();
        if (pData) {
          viagemId = pData.viagem_id || null;
        }
      } catch (e) {
        console.warn('Failed to load product trip id:', e);
      }
    }

    await supabase.from('lembretes').insert({
      orcamento_id: orcamentoId,
      viagem_id: viagemId,
      consultor_id: targetConsultantId,
      criador_id: currentUserId,
      data_lembrete: dataLembrete,
      periodo: periodo,
      arquivado: false
    });
    console.log('[Comments Auto Sched] Parse succeeded:', { targetConsultantId, dataLembrete, periodo });
  }
}
