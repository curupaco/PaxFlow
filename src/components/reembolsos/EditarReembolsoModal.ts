/**
 * EditarReembolsoModal
 * Componente modal moderno e reutilizável para edição de valores financeiros
 * e status da tratativa de um reembolso.
 * Utilizado na Central de Reembolsos e na aba de Reembolsos do EditTravelModal.
 */

import { supabase } from '../../services/supabase';
import { formatStatusTratativa, prepareReembolsoStatusPayload } from '../../controllers/reembolsosController';
import { renderCurrencyInputHTML, parseDoubleBr, formatCurrencyValue, setupFormValidation } from '../../utils/masks';

export interface EditarReembolsoModalOptions {
  reembolso: any;
  showToast: (msg: string, type: 'success' | 'error', err?: any) => void;
  onSucesso?: (novoStatusTratativa: string) => void | Promise<void>;
}

export class EditarReembolsoModal {
  private static modalId = 'modal-editar-valores-reembolso';

  public static abrir(options: EditarReembolsoModalOptions): void {
    const { reembolso: r, showToast, onSucesso } = options;

    document.getElementById(this.modalId)?.remove();

    const idFormatado = r.codigo_ref || r.codigoRef || `#RMB-${r.id.slice(0, 6).toUpperCase()}`;
    const valorProdutoAtual = Number(r.valor_produto || r.produto?.valor || r.produto?.valor_venda || 0);
    const valorSolicitadoAtual = Number(r.valor_solicitado || 0);
    const valorAprovadoAtual = Number(r.valor_aprovado || 0);
    const valorUtilizadoPaxAtual = Number(r.valor_utilizado_pax || 0);
    const tratativaAtual = formatStatusTratativa(r.status_tratativa || r.status).key;

    const modalEl = document.createElement('div');
    modalEl.id = this.modalId;
    modalEl.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in font-sans';
    modalEl.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Cabeçalho do Modal -->
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded font-mono text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/60">${idFormatado}</span>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100">Atualizar Valores e Tratativa</h3>
            </div>
            <p class="text-xs text-slate-400 font-semibold mt-0.5">
              Viagem ${r.viagem?.codigo_ref || r.viagem?.codigoRef || 'VIA'} · ${r.viagem?.cliente?.nome || 'Passageiro'}
            </p>
          </div>
          <button id="btn-fechar-modal-valores" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-lg">&times;</button>
        </div>

        <!-- Formulário -->
        <form id="form-editar-valores-reembolso" class="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <!-- Produto Vinculado -->
          <div class="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-1">
            <span class="block text-[10px] font-black uppercase text-slate-400">Produto Afetado:</span>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-100">
              [${(r.produto?.tipo || 'outro').toUpperCase()}] ${r.produto?.fornecedor || ''} - ${r.produto?.descricao || 'Produto da Viagem'}
            </p>
          </div>

          <!-- Status da Tratativa -->
          <div>
            <label class="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">Status da Tratativa *</label>
            <select id="modal-input-status-tratativa" class="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs">
              <option value="pendente_agencia" ${tratativaAtual === 'pendente_agencia' ? 'selected' : ''}>🏢 Reembolso pendente ação agência</option>
              <option value="pendente_fornecedor" ${tratativaAtual === 'pendente_fornecedor' ? 'selected' : ''}>✈️ Reembolso pendente ação fornecedor</option>
              <option value="pendente_agaxtur" ${tratativaAtual === 'pendente_agaxtur' ? 'selected' : ''}>🌐 Reembolso pendente ação Agaxtur</option>
              <option value="concluido" ${tratativaAtual === 'concluido' ? 'selected' : ''}>✅ Reembolso concluido</option>
            </select>
          </div>

          <!-- Grade de 4 Valores Financeiros -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Valor do Produto (R$)</label>
              ${renderCurrencyInputHTML('modal-input-valor-produto', formatCurrencyValue(valorProdutoAtual))}
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Valor Solicitado (R$)</label>
              ${renderCurrencyInputHTML('modal-input-valor-solicitado', formatCurrencyValue(valorSolicitadoAtual))}
            </div>

            <div>
              <label class="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">Valor Aprovado (R$)</label>
              ${renderCurrencyInputHTML('modal-input-valor-aprovado', formatCurrencyValue(valorAprovadoAtual))}
            </div>

            <div>
              <label class="block text-[11px] font-bold text-purple-600 dark:text-purple-400 mb-1">Valor Utilizado pelo Pax (R$)</label>
              ${renderCurrencyInputHTML('modal-input-valor-utilizado-pax', formatCurrencyValue(valorUtilizadoPaxAtual))}
            </div>
          </div>

          <!-- Observações Financeiras -->
          <div>
            <label class="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Observações / Notas da Negociação</label>
            <textarea id="modal-input-obs" rows="3" placeholder="Informações adicionais sobre cartas de crédito, números de protocolo ou compensações..." class="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">${r.observacoes_financeiras || ''}</textarea>
          </div>

          <!-- Ações do Modal -->
          <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-cancelar-modal-valores" type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl transition shadow-md shadow-indigo-600/20">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modalEl);

    // Inicializa máscaras monetárias no modal
    setupFormValidation('form-editar-valores-reembolso', [
      { id: 'modal-input-valor-produto', type: 'currency' },
      { id: 'modal-input-valor-solicitado', type: 'currency' },
      { id: 'modal-input-valor-aprovado', type: 'currency' },
      { id: 'modal-input-valor-utilizado-pax', type: 'currency' }
    ]);

    const fechar = () => modalEl.remove();
    document.getElementById('btn-fechar-modal-valores')?.addEventListener('click', fechar);
    document.getElementById('btn-cancelar-modal-valores')?.addEventListener('click', fechar);

    const form = document.getElementById('form-editar-valores-reembolso') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const novoStatusTratativa = (document.getElementById('modal-input-status-tratativa') as HTMLSelectElement).value;
      const novoValorProduto = parseDoubleBr((document.getElementById('modal-input-valor-produto') as HTMLInputElement).value);
      const novoValorSolicitado = parseDoubleBr((document.getElementById('modal-input-valor-solicitado') as HTMLInputElement).value);
      const novoValorAprovado = parseDoubleBr((document.getElementById('modal-input-valor-aprovado') as HTMLInputElement).value);
      const novoValorUtilizadoPax = parseDoubleBr((document.getElementById('modal-input-valor-utilizado-pax') as HTMLInputElement).value);
      const novasObs = (document.getElementById('modal-input-obs') as HTMLTextAreaElement).value;

      const basePayload = prepareReembolsoStatusPayload(novoStatusTratativa);

      const updatePayload: any = {
        ...basePayload,
        valor_produto: novoValorProduto,
        valor_solicitado: novoValorSolicitado,
        valor_aprovado: novoValorAprovado,
        valor_utilizado_pax: novoValorUtilizadoPax,
        observacoes_financeiras: novasObs
      };

      try {
        let { error } = await supabase
          .from('reembolsos')
          .update(updatePayload)
          .eq('id', r.id);

        // Fallback defensivo para schema drift (42703)
        if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
          const fallbackPayload = {
            status: basePayload.status,
            data_resolucao: basePayload.data_resolucao,
            valor_solicitado: novoValorSolicitado,
            valor_aprovado: novoValorAprovado,
            observacoes_financeiras: JSON.stringify({
              status_tratativa: basePayload.status_tratativa,
              valor_produto: novoValorProduto,
              valor_utilizado_pax: novoValorUtilizadoPax,
              obs: novasObs,
              atualizado_em: new Date().toISOString()
            })
          };
          const fallbackRes = await supabase.from('reembolsos').update(fallbackPayload).eq('id', r.id);
          error = fallbackRes.error;
        }

        if (error) throw error;

        showToast('Reembolso atualizado com sucesso!', 'success');
        fechar();

        if (onSucesso) {
          await onSucesso(novoStatusTratativa);
        }

      } catch (err: any) {
        console.error('Erro ao salvar valores do reembolso:', err);
        showToast('Erro ao salvar alterações.', 'error', err);
      }
    });
  }
}
