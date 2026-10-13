/**
 * SolicitarReembolsoModal
 * Componente modal moderno e reutilizável para solicitação de reembolso de produtos/viagem.
 * Compatível com EditTravelModal, Dashboard Kanban e Central de Reembolsos.
 */

import { supabase } from '../../services/supabase';
import { ReembolsosService } from '../../services/reembolsosService';
import { renderCurrencyInputHTML, parseDoubleBr, formatCurrencyValue, setupFormValidation } from '../../utils/masks';

export interface SolicitarReembolsoModalOptions {
  viagemId: string;
  viagemDescricao?: string;
  produtos?: any[];
  produtoPreselecionadoId?: string;
  user: any;
  onSucesso?: (reembolso: any) => void | Promise<void>;
  showToast: (msg: string, type: 'success' | 'error', err?: any) => void;
}

export class SolicitarReembolsoModal {
  private static modalId = 'paxflow-solicitar-reembolso-modal';

  public static async abrir(options: SolicitarReembolsoModalOptions): Promise<void> {
    const { viagemId, viagemDescricao, user, showToast, onSucesso } = options;

    // Remove modal anterior se ainda existir no DOM
    const existing = document.getElementById(this.modalId);
    if (existing) existing.remove();

    // 1. Carrega produtos se não foram fornecidos
    let produtos = options.produtos || [];
    if (produtos.length === 0) {
      try {
        const { data, error } = await supabase
          .from('produtos_viagem')
          .select('*')
          .eq('viagem_id', viagemId);
        if (!error && data) {
          produtos = data;
        }
      } catch (e) {
        console.warn('Erro ao carregar produtos para modal de reembolso:', e);
      }
    }

    // Cria container do modal
    const modalEl = document.createElement('div');
    modalEl.id = this.modalId;
    modalEl.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in';

    if (produtos.length === 0) {
      modalEl.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
          <div class="text-amber-500 text-4xl mb-3">⚠️</div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Nenhum Produto Cadastrado</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
            Esta viagem ainda não possui produtos ou serviços vinculados para abertura de reembolso. Cadastre um produto na viagem antes de solicitar.
          </p>
          <button id="btn-close-modal-sem-prod" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs uppercase tracking-wider transition">
            Fechar
          </button>
        </div>
      `;
      document.body.appendChild(modalEl);
      document.getElementById('btn-close-modal-sem-prod')?.addEventListener('click', () => modalEl.remove());
      return;
    }

    const prodPreselecionado = options.produtoPreselecionadoId 
      ? produtos.find(p => p.id === options.produtoPreselecionadoId)
      : produtos[0];

    const valorInicial = prodPreselecionado ? Number(prodPreselecionado.valor_venda || 0) : 0;

    modalEl.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-up">
        <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-xl text-xl">💸</span>
            <div>
              <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">
                Solicitar Reembolso
              </h3>
              <p class="text-xs text-slate-400 dark:text-slate-400 font-medium">
                ${viagemDescricao ? viagemDescricao : 'Abertura de ficha detalhada para o financeiro'}
              </p>
            </div>
          </div>
          <button id="btn-fechar-modal-reembolso" type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-2xl leading-none">&times;</button>
        </div>

        <form id="form-solicitar-reembolso" class="p-5 sm:p-6 space-y-4">
          <!-- Produto -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
              Selecione o Produto *
            </label>
            <select id="modal-select-produto" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold">
              ${produtos.map(p => `
                <option value="${p.id}" data-valor="${p.valor_venda}" ${p.id === prodPreselecionado?.id ? 'selected' : ''}>
                  [${(p.tipo || 'ITEM').toUpperCase()}] ${p.fornecedor || ''} - ${p.descricao || ''} ${p.codigo_reserva ? `(LOC: ${p.codigo_reserva})` : ''} - R$ ${Number(p.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Valor e Forma de Devolução -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Valor Solicitado (R$) *
              </label>
              ${renderCurrencyInputHTML('modal-input-valor-reembolso', formatCurrencyValue(valorInicial))}
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Forma de Devolução *
              </label>
              <select id="modal-select-forma-devolucao" required class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold">
                <option value="Estorno Cartão de Crédito" selected>Estorno Cartão de Crédito</option>
                <option value="Pix / Transferência Bancária">Pix / Transferência Bancária</option>
                <option value="Carta de Crédito / Voucher Fornecedor">Carta de Crédito / Voucher Fornecedor</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <!-- Motivo -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
              Motivo / Justificativa do Cancelamento *
            </label>
            <textarea id="modal-textarea-motivo-reembolso" required rows="3" placeholder="Explique o motivo do cancelamento e reembolso para documentação financeira..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100 text-xs font-medium"></textarea>
          </div>

          <!-- Checkbox para Viagem -->
          <div class="pt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <label class="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" id="modal-check-atualizar-viagem" class="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer" />
              <div class="space-y-0.5">
                <span class="text-xs text-slate-700 dark:text-slate-200 font-semibold block">
                  Marcar viagem inteira como "Reembolso Solicitado" (Apenas cancelamento total)
                </span>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Deixe desmarcado se for cancelamento de item avulso (transfer, passeio, hotel). A viagem continuará seu fluxo normal de embarque e pós-venda.
                </p>
              </div>
            </label>
          </div>

          <!-- Ações -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button id="modal-btn-cancelar-reembolso" type="button" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs uppercase tracking-wider transition">
              Cancelar
            </button>
            <button id="modal-btn-enviar-reembolso" type="submit" class="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/20 transition flex items-center gap-2">
              <span>💸 Confirmar Solicitação</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modalEl);

    // Validação de formulário
    setupFormValidation('form-solicitar-reembolso', [
      { id: 'modal-input-valor-reembolso', type: 'currency' }
    ]);

    const selectProd = document.getElementById('modal-select-produto') as HTMLSelectElement;
    const inputValor = document.getElementById('modal-input-valor-reembolso') as HTMLInputElement;
    const selectForma = document.getElementById('modal-select-forma-devolucao') as HTMLSelectElement;
    const textareaMotivo = document.getElementById('modal-textarea-motivo-reembolso') as HTMLTextAreaElement;
    const checkViagem = document.getElementById('modal-check-atualizar-viagem') as HTMLInputElement;
    const btnSubmit = document.getElementById('modal-btn-enviar-reembolso') as HTMLButtonElement;

    // Atualiza valor sugerido quando troca produto
    selectProd?.addEventListener('change', () => {
      const opt = selectProd.options[selectProd.selectedIndex];
      const val = opt.getAttribute('data-valor');
      if (val) {
        inputValor.value = formatCurrencyValue(parseFloat(val) || 0);
      }
    });

    const fechar = () => modalEl.remove();
    document.getElementById('btn-fechar-modal-reembolso')?.addEventListener('click', fechar);
    document.getElementById('modal-btn-cancelar-reembolso')?.addEventListener('click', fechar);

    const form = document.getElementById('form-solicitar-reembolso') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const prodId = selectProd.value;
      const valor = parseDoubleBr(inputValor.value);
      const motivo = textareaMotivo.value.trim();
      const forma = selectForma.value;
      const atualizarViagem = checkViagem.checked;

      if (!prodId || !valor || valor <= 0) {
        showToast('Informe um produto e um valor válido para o reembolso.', 'error');
        return;
      }

      if (!motivo) {
        showToast('Por favor, informe a justificativa do cancelamento.', 'error');
        return;
      }

      const prodObj = produtos.find(p => p.id === prodId);
      const valorOrig = prodObj ? Number(prodObj.valor_venda || valor) : valor;

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `
        <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Processando...</span>
      `;

      try {
        const resultado = await ReembolsosService.criarSolicitacao({
          viagemId,
          produtoViagemId: prodId,
          consultorSolicitanteId: user?.id,
          valorSolicitado: valor,
          valorProdutoOriginal: valorOrig,
          motivoCancelamento: motivo,
          formaDevolucao: forma,
          atualizarStatusViagem: atualizarViagem
        });

        if (!resultado.sucesso) {
          throw resultado.error || new Error('Falha ao registrar solicitação no banco.');
        }

        showToast('Reembolso solicitado com sucesso! Registro integrado à Central de Reembolsos.', 'success');
        fechar();

        if (onSucesso) {
          await onSucesso(resultado.data);
        }
      } catch (err: any) {
        console.error('Erro ao solicitar reembolso:', err);
        showToast('Erro ao processar solicitação de reembolso.', 'error', err);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>💸 Confirmar Solicitação</span>`;
      }
    });
  }
}
