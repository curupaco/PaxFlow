import { Orcamento, PerfilConsultor } from '../../types';
import { getAvatarSvg } from '../../services/avatars';
import { CommentsService } from '../../services/comments';
import { showCustomConfirm } from '../../services/dialog';

export interface VerNotasModalOptions {
  user: any;
  perfil: PerfilConsultor | null;
  consultores: PerfilConsultor[];
  formatarDataBr: (dStr?: string) => string;
  calcularTempoAmigavel: (dataIso: string) => string;
  closeModal: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  onUpdate?: (updatedOrc: Orcamento) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
}

export class VerNotasModal {
  static open(orc: Orcamento, options: VerNotasModalOptions): void {
    const portal = document.getElementById('orcamento-modal-portal');
    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent || !portal) return;

    // Aumenta a largura do modal para acomodar o layout de duas colunas
    modalContent.classList.remove('max-w-lg');
    modalContent.classList.add('max-w-2xl');

    const filesHtml = orc.documentosUrl && orc.documentosUrl.length > 0 
      ? orc.documentosUrl.map((url, index) => `
          <a href="${url}" target="_blank" data-proposal-file-url="${url}" data-proposal-file-index="${index}" class="btn-view-proposal-file px-4 py-2.5 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 text-xs font-black transition flex items-center justify-center gap-2 select-none uppercase tracking-wide">
            📄 Documento da Proposta #${index + 1}
          </a>
        `).join('')
      : '<p class="text-xs text-slate-400 dark:text-slate-500 font-semibold italic">Nenhum arquivo anexado nesta proposta.</p>';

    // Preparação dos dados para a barra lateral
    const temperaturaClasses = {
      Frio: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-100/30 dark:border-sky-900/30',
      Normal: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/30 dark:border-amber-900/30',
      Quente: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/30 dark:border-rose-900/30'
    };
    const tempClass = temperaturaClasses[orc.temperatura] || temperaturaClasses.Normal;

    let statusText: string = orc.status;
    let statusClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/50';
    if (orc.status === 'SOLICITADO') {
      statusClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/30';
      statusText = 'Solicitado';
    } else if (orc.status === 'EM_ANDAMENTO') {
      statusClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100/30';
      statusText = 'Em Andamento';
    } else if (orc.status === 'AGUARDANDO') {
      statusClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/30';
      statusText = 'Aguardando';
    } else if (orc.status === 'CONCLUIDO') {
      if (orc.subStatus === 'ACEITO') {
        statusClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30';
        statusText = 'Concluído (Aceito) 🎉';
      } else {
        statusClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/30';
        statusText = 'Concluído (Desistência) 🚫';
      }
    }

    const dono = options.consultores.find(c => c.id === orc.consultorId);
    const consultorAvatar = getAvatarSvg(dono?.avatar_url, dono?.nome || 'Consultor', 'w-6 h-6');
    const consultorNome = dono?.nome || 'Consultor';

    const contacts = orc.contato.split('/');
    const phone = contacts[0] ? contacts[0].trim() : '';
    const email = contacts[1] ? contacts[1].trim() : '';
    const waLink = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : '';
    const mailLink = email ? `mailto:${email}` : '';

    const tagsHtml = orc.tags && orc.tags.length > 0 
      ? orc.tags.map(t => `<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-black text-[9px] uppercase tracking-wide border border-slate-200/20 dark:border-slate-700/20">${t}</span>`).join('')
      : '<span class="text-xs text-slate-400 dark:text-slate-500 font-semibold italic">Nenhuma tag cadastrada.</span>';

    const dataCriacao = orc.createdAt ? new Date(orc.createdAt).toLocaleDateString('pt-BR') : 'Não informada';
    const tempoAguardando = orc.createdAt ? options.calcularTempoAmigavel(orc.createdAt) : '';

    modalContent.innerHTML = `
      <div class="p-6 flex flex-col h-full max-h-[85vh]">
        <!-- Topo do Modal -->
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>📝 Detalhes do Orçamento</span>
          </h3>
          <button id="btn-close-modal-x" class="text-slate-400 hover:text-rose-500 font-bold transition text-lg">&times;</button>
        </div>

        <!-- Layout em Duas Colunas -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar flex-1 pb-4 pr-1">
          
          <!-- Coluna 1 & 2 (Dados principais e notas) -->
          <div class="md:col-span-2 space-y-5">
            <div>
              <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Cliente & Viagem</h4>
              <div class="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-400 space-y-1.5">
                <span class="block">Passageiro: <strong class="text-slate-800 dark:text-slate-100">${orc.nomeCliente}</strong></span>
                <span class="block">Destino: <strong class="text-slate-800 dark:text-slate-100">${orc.destino}</strong></span>
                <span class="block">Data da Viagem: <strong class="text-slate-800 dark:text-slate-100">${options.formatarDataBr(orc.dataViagem)}</strong></span>
                ${orc.valorProposta !== undefined && orc.valorProposta !== null ? `<span class="block">Valor da Proposta: <strong class="text-indigo-600 dark:text-indigo-400">R$ ${Number(orc.valorProposta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>` : ''}
                ${orc.status === 'CONCLUIDO' && orc.subStatus === 'ACEITO' && orc.valorViagem !== undefined && orc.valorViagem !== null ? `<span class="block">Valor da Viagem: <strong class="text-emerald-600 dark:text-emerald-400">R$ ${Number(orc.valorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>` : ''}
              </div>
            </div>

            <div>
              <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Notas da Negociação</h4>
              <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[120px]">
                ${orc.notasNegociacao || 'Nenhuma nota registrada.'}
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2.5">
                <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Documentos Anexos</h4>
                <div>
                  <input type="file" id="input-orc-upload-doc" class="hidden" accept="application/pdf,image/*" />
                  <button id="btn-orc-upload-doc" type="button" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
                    Anexar Arquivo
                  </button>
                </div>
              </div>
              <div id="orc-files-container" class="grid grid-cols-1 gap-2">
                ${filesHtml}
              </div>
              <div id="orc-upload-status" class="mt-2 hidden"></div>
            </div>

            <!-- Container de Comentários e Anotações -->
            <div id="orcamento-comments-container" class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4"></div>
          </div>

          <!-- Coluna 3 (Sidebar - Detalhes do Card) -->
          <div class="bg-slate-600/5 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 h-fit">
            
            <!-- Temperatura -->
            <div>
              <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Temperatura</span>
              <select id="select-detail-temperatura" class="w-full px-2.5 py-1 border border-transparent rounded text-xs font-black uppercase tracking-wider ${tempClass} text-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="Frio" class="bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400" ${orc.temperatura === 'Frio' ? 'selected' : ''}>Frio</option>
                <option value="Normal" class="bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400" ${orc.temperatura === 'Normal' ? 'selected' : ''}>Normal</option>
                <option value="Quente" class="bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400" ${orc.temperatura === 'Quente' ? 'selected' : ''}>Quente</option>
              </select>
            </div>

            <!-- Status do Lead -->
            <div>
              <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Status da Negociação</span>
              <span class="px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${statusClass} block text-center select-none">
                ${statusText}
              </span>
            </div>

            <!-- Consultor Responsável -->
            <div>
              <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Consultor Responsável</span>
              ${options.perfil?.role === 'admin' ? `
                <select id="select-detail-responsavel" class="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm cursor-pointer">
                  ${options.consultores.map(c => `<option value="${c.id}" ${c.id === orc.consultorId ? 'selected' : ''}>${c.nome} (${c.role})</option>`).join('')}
                </select>
              ` : `
                <div class="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                  <div class="shrink-0">${consultorAvatar}</div>
                  <span class="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate leading-snug">${consultorNome}</span>
                </div>
              `}
            </div>

            <!-- Origem do Lead -->
            <div>
              <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Origem do Lead</span>
              <select id="select-detail-origem" class="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm cursor-pointer">
                <option value="" disabled ${!orc.origem ? 'selected' : ''}>Selecione a Origem...</option>
                <option value="WhatsApp" ${orc.origem === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
                <option value="Instagram" ${orc.origem === 'Instagram' ? 'selected' : ''}>Instagram</option>
                <option value="Indicação" ${orc.origem === 'Indicação' ? 'selected' : ''}>Indicação</option>
                <option value="Google" ${orc.origem === 'Google' ? 'selected' : ''}>Google</option>
                <option value="Site" ${orc.origem === 'Site' ? 'selected' : ''}>Site</option>
                <option value="Outros" ${orc.origem === 'Outros' ? 'selected' : ''}>Outros</option>
              </select>
            </div>

            <!-- Contatos Clicáveis -->
            <div>
              <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Canais de Contato</span>
              <div class="space-y-2">
                ${phone ? `
                  <a href="${waLink}" target="_blank" class="w-full px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100/30 dark:border-emerald-900/30 text-xs font-bold transition flex items-center gap-2 select-none">
                    <span class="text-sm">💬</span> <span class="truncate">${phone}</span>
                  </a>
                ` : ''}
                ${email ? `
                  <a href="${mailLink}" target="_blank" class="w-full px-3 py-2 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 text-xs font-bold transition flex items-center gap-2 select-none">
                    <span class="text-sm">✉️</span> <span class="truncate">${email}</span>
                  </a>
                ` : ''}
                ${!phone && !email ? '<span class="text-xs text-slate-400 dark:text-slate-500 font-semibold italic">Nenhum contato</span>' : ''}
              </div>
            </div>

            <!-- Tags -->
            <div>
              <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Tags</span>
              <div class="flex flex-wrap gap-1.5">
                ${tagsHtml}
              </div>
            </div>

            <!-- Histórico de Datas -->
            <div class="border-t border-slate-200/50 dark:border-slate-800 pt-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold space-y-1">
              <span class="block">Criado em: <strong class="text-slate-500 dark:text-slate-400 font-extrabold">${dataCriacao}</strong></span>
              ${tempoAguardando ? `<span class="block flex items-center gap-1">Aguardando: <strong class="text-indigo-600 dark:text-indigo-400 font-extrabold">${tempoAguardando}</strong></span>` : ''}
            </div>

          </div>
        </div>

        <!-- Rodapé do Modal -->
        <div class="flex items-center justify-between gap-3 pt-5 border-t border-slate-200 dark:border-slate-800 mt-4">
          <div>
            ${(options.perfil?.role === 'admin' && options.onDelete) ? `
              <button id="btn-excluir-orcamento" type="button" class="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-extrabold text-xs tracking-wider rounded-xl transition uppercase">
                Excluir Orçamento
              </button>
            ` : ''}
          </div>
          <button id="btn-close-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Fechar</button>
        </div>
      </div>
    `;

    const handleClose = () => options.closeModal();
    document.getElementById('btn-close-modal-x')?.addEventListener('click', handleClose);
    document.getElementById('btn-close-modal')?.addEventListener('click', handleClose);

    // Event listener para excluir orçamento
    const btnExcluir = document.getElementById('btn-excluir-orcamento');
    btnExcluir?.addEventListener('click', async () => {
      const confirm = await showCustomConfirm(
        'Tem certeza de que deseja excluir permanentemente este orçamento? Esta ação não pode ser desfeita.',
        'Excluir Orçamento'
      );
      if (!confirm) return;

      if (options.onDelete) {
        const success = await options.onDelete(orc.id);
        if (success) {
          options.showToast('Orçamento excluído com sucesso!', 'success');
          options.closeModal();
        } else {
          options.showToast('Erro ao excluir orçamento.', 'error');
        }
      }
    });

    // Eventos de Upload de Documentos para o Orçamento
    const btnUploadTrigger = document.getElementById('btn-orc-upload-doc') as HTMLButtonElement;
    const inputUploadDoc = document.getElementById('input-orc-upload-doc') as HTMLInputElement;
    const uploadStatus = document.getElementById('orc-upload-status') as HTMLElement;
    const filesContainer = document.getElementById('orc-files-container') as HTMLElement;

    btnUploadTrigger?.addEventListener('click', () => inputUploadDoc.click());

    inputUploadDoc?.addEventListener('change', async () => {
      const file = inputUploadDoc.files?.[0];
      if (!file) return;

      btnUploadTrigger.disabled = true;
      if (uploadStatus) {
        uploadStatus.classList.remove('hidden');
        uploadStatus.innerHTML = `
          <div class="flex items-center gap-2 py-1.5 text-xs font-bold text-slate-500 animate-pulse">
            <div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Enviando arquivo (${file.name})...</span>
          </div>
        `;
      }

      try {
        const { uploadDocumentoCliente } = await import('../../services/googleDrive');
        const parts = orc.contato.split('/');
        const email = parts.length > 1 ? parts[1].trim() : 'lead@orcamentos.com';
        const telefone = parts.length > 0 ? parts[0].trim() : '(11) 90000-0000';

        const result = await uploadDocumentoCliente(
          orc.id,
          orc.nomeCliente,
          email,
          telefone,
          file
        );

        if (result.success && result.googleDriveFolderUrl) {
          orc.documentosUrl = orc.documentosUrl || [];
          orc.documentosUrl.push(result.googleDriveFolderUrl);

          if (options.onUpdate) {
            const success = await options.onUpdate(orc);
            if (success) {
              options.showToast('Arquivo anexado com sucesso!', 'success');
              
              // Atualizar a lista de arquivos renderizados
              const updatedFilesHtml = orc.documentosUrl.map((url, idx) => `
                <a href="${url}" target="_blank" data-proposal-file-url="${url}" data-proposal-file-index="${idx}" class="btn-view-proposal-file px-4 py-2.5 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 text-xs font-black transition flex items-center justify-center gap-2 select-none uppercase tracking-wide">
                  📄 Documento da Proposta #${idx + 1}
                </a>
              `).join('');
              if (filesContainer) {
                filesContainer.innerHTML = updatedFilesHtml;
              }

              // Re-vincular ouvintes dos botões de visualização
              modalContent.querySelectorAll('.btn-view-proposal-file').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                  e.preventDefault();
                  const url = btn.getAttribute('data-proposal-file-url');
                  const indexStr = btn.getAttribute('data-proposal-file-index');
                  if (!url) return;

                  const idx = indexStr ? parseInt(indexStr) : 0;
                  const { DocumentViewer } = await import('../../services/documentViewer');
                  DocumentViewer.open(
                    `Documento da Proposta #${idx + 1}.pdf`,
                    url,
                    'application/pdf',
                    {
                      nome_cliente: orc.nomeCliente,
                      destino: orc.destino,
                      valor_total: orc.valorProposta || 8500.00,
                      createdAt: orc.createdAt
                    }
                  );
                });
              });
            } else {
              throw new Error('Falha ao atualizar orçamento com o novo arquivo.');
            }
          }
        } else {
          throw new Error(result.error || 'Erro no upload.');
        }
      } catch (err: any) {
        console.error('Erro no upload de arquivo do orçamento:', err);
        options.showToast(`Erro no upload: ${err.message}`, 'error');
      } finally {
        btnUploadTrigger.disabled = false;
        if (uploadStatus) {
          uploadStatus.classList.add('hidden');
          uploadStatus.innerHTML = '';
        }
        inputUploadDoc.value = '';
      }
    });

    // Event listener para alterar temperatura
    const selectTemp = document.getElementById('select-detail-temperatura') as HTMLSelectElement;
    selectTemp?.addEventListener('change', async () => {
      const newVal = selectTemp.value as 'Frio' | 'Normal' | 'Quente';
      orc.temperatura = newVal;
      
      // Atualizar classe do seletor
      selectTemp.className = `w-full px-2.5 py-1 border border-transparent rounded text-xs font-black uppercase tracking-wider text-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 ${temperaturaClasses[newVal]}`;
      
      if (options.onUpdate) {
        const success = await options.onUpdate(orc);
        if (success) {
          options.showToast('Temperatura atualizada!', 'success');
        } else {
          options.showToast('Erro ao atualizar temperatura.', 'error');
        }
      }
    });

    // Event listener para alterar consultor responsável (apenas admin)
    const selectResp = document.getElementById('select-detail-responsavel') as HTMLSelectElement;
    selectResp?.addEventListener('change', async () => {
      const newVal = selectResp.value;
      orc.consultorId = newVal;
      
      if (options.onUpdate) {
        const success = await options.onUpdate(orc);
        if (success) {
          options.showToast('Consultor responsável atualizado!', 'success');
        } else {
          options.showToast('Erro ao reatribuir consultor.', 'error');
        }
      }
    });

    // Event listener para alterar origem do lead
    const selectOrigem = document.getElementById('select-detail-origem') as HTMLSelectElement;
    selectOrigem?.addEventListener('change', async () => {
      const newVal = selectOrigem.value;
      orc.origem = newVal;
      
      if (options.onUpdate) {
        const success = await options.onUpdate(orc);
        if (success) {
          options.showToast('Origem do lead atualizada!', 'success');
        } else {
          options.showToast('Erro ao atualizar origem do lead.', 'error');
        }
      }
    });

    // Botões de visualização de arquivos anexos
    modalContent.querySelectorAll('.btn-view-proposal-file').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = btn.getAttribute('data-proposal-file-url');
        const indexStr = btn.getAttribute('data-proposal-file-index');
        if (!url) return;

        const index = indexStr ? parseInt(indexStr) : 0;
        const { DocumentViewer } = await import('../../services/documentViewer');
        DocumentViewer.open(
          `Documento da Proposta #${index + 1}.pdf`,
          url,
          'application/pdf',
          {
            nome_cliente: orc.nomeCliente,
            destino: orc.destino,
            valor_total: orc.valorProposta || 8500.00,
            createdAt: orc.createdAt
          }
        );
      });
    });

    // Inicializar comentários do orçamento
    const commentsContainer = document.getElementById('orcamento-comments-container');
    if (commentsContainer && options.user) {
      CommentsService.renderCommentsSection(
        commentsContainer,
        'orcamento',
        orc.id,
        orc.id,
        options.user.id,
        options.consultores
      );
    }
  }
}
