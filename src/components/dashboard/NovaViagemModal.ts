/**
 * src/components/dashboard/NovaViagemModal.ts
 *
 * Componente especialista para Criação de Novas Viagens / Vendas no Dashboard.
 * Gerencia o formulário modal, validações de data/financeiro, autocomplete de destinos
 * e inserção direta no banco de dados Supabase.
 */

import { supabase } from '../../services/supabase';
import { DestinosAutocomplete } from '../DestinosAutocomplete';
import {
  renderCurrencyInputHTML,
  renderDateInputHTML,
  setupFormValidation,
  formatBrDateToIso,
  parseDoubleBr,
  validateDate
} from '../../utils/masks';

export interface NovaViagemModalOptions {
  user: any;
  perfil: any;
  settings: any;
  showToast: (message: string, type?: 'success' | 'error', err?: any) => void;
  onSuccess: () => Promise<void> | void;
}

export class NovaViagemModal {
  private static destAutocomplete: DestinosAutocomplete | null = null;

  /**
   * Abre o Modal Interativo de Criação de Viagem / Card
   */
  public static async open(options: NovaViagemModalOptions): Promise<void> {
    const { user, perfil, settings, showToast, onSuccess } = options;

    const canCreateTripDirectly = perfil?.role === 'admin' ||
      !!settings?.permitirConsultorCriarViagem ||
      !!settings?.permitir_consultor_criar_viagem;

    if (!canCreateTripDirectly) {
      showToast('Criação direta de viagens desativada para consultores. Utilize o fluxo de Orçamentos.', 'error');
      return;
    }

    try {
      this.renderModalOverlay('max-w-lg');
      const modalContent = document.getElementById('modal-content-container');
      if (!modalContent) return;

      modalContent.innerHTML = `
        <div class="p-6 text-center text-slate-500 text-sm font-semibold">
          Carregando passageiros...
        </div>
      `;

      // Busca clientes ativos do banco para associar à viagem
      const { data: clientes, error: errClientes } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome', { ascending: true });

      if (errClientes) throw errClientes;

      if (!clientes || clientes.length === 0) {
        modalContent.innerHTML = `
          <div class="p-6 text-center">
            <span class="text-3xl">👥</span>
            <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2 mb-1">Nenhum cliente cadastrado</h3>
            <p class="text-xs text-slate-400 mb-4">É necessário cadastrar pelo menos um cliente para criar uma viagem.</p>
            <div class="flex justify-center gap-3">
              <button id="btn-fechar-aviso" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs tracking-wider rounded-xl transition uppercase">Fechar</button>
            </div>
          </div>
        `;
        document.getElementById('btn-fechar-aviso')?.addEventListener('click', () => this.close());
        return;
      }

      modalContent.innerHTML = `
        <div class="p-6">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">✈️ Nova Viagem / Card</h3>
            <button id="btn-close-viagem-x" class="text-slate-400 hover:text-rose-500 font-bold transition">✕</button>
          </div>

          <form id="form-nova-viagem" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Passageiro / Cliente *</label>
              <select id="select-viagem-cliente" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm">
                <option value="" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Selecione o cliente...</option>
                ${clientes.map(c => `<option value="${c.id}" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${c.nome}</option>`).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Destino *</label>
                <input id="input-viagem-destino" type="text" required placeholder="ex: Paris, Orlando, etc." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Código Localizador (LOC)</label>
                <input id="input-viagem-loc" type="text" placeholder="ex: F3R9W" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm uppercase" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Total (R$) *</label>
              ${renderCurrencyInputHTML('input-viagem-valor', '')}
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data de Ida (DD/MM/AAAA) *</label>
                ${renderDateInputHTML('input-viagem-ida', '')}
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data de Volta (DD/MM/AAAA) *</label>
                ${renderDateInputHTML('input-viagem-volta', '')}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status / Etapa Inicial *</label>
                <select id="select-viagem-status" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm">
                  <option value="pos_venda" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pós-Venda</option>
                  <option value="fechado" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Fechado</option>
                  <option value="pre_embarque" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pré-Embarque</option>
                  <option value="pos_viagem" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pós-Viagem</option>
                </select>
              </div>
              <div>
                <label id="label-input-viagem-data-financeiro" class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data Financeiro (DD/MM/AAAA) *</label>
                ${renderDateInputHTML('input-viagem-data-financeiro', '', 'DD/MM/AAAA', true)}
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Observações Operacionais</label>
              <textarea id="textarea-viagem-obs" placeholder="Detalhes de voo, hotel, etc." rows="2" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm"></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button id="btn-cancel-viagem" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
              <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Criar Viagem</button>
            </div>
          </form>
        </div>
      `;

      const novaViagemValidator = setupFormValidation('form-nova-viagem', [
        { id: 'input-viagem-valor', type: 'currency' },
        { id: 'input-viagem-ida', type: 'date' },
        { id: 'input-viagem-volta', type: 'date' },
        { id: 'input-viagem-data-financeiro', type: 'date', required: true }
      ]);

      let selectedDestinoId: string | null = null;
      const inputDestino = document.getElementById('input-viagem-destino') as HTMLInputElement;
      if (inputDestino) {
        this.destAutocomplete = new DestinosAutocomplete(inputDestino, (destino) => {
          selectedDestinoId = destino ? destino.id : null;
        });
      }

      const selectStatus = document.getElementById('select-viagem-status') as HTMLSelectElement;
      const inputFinNew = document.getElementById('input-viagem-data-financeiro') as HTMLInputElement;
      const labelFinNew = document.getElementById('label-input-viagem-data-financeiro');

      const updateNewFinRequired = () => {
        if (!selectStatus || !inputFinNew) return;
        const isRequired = selectStatus.value !== 'fechado';
        if (isRequired) {
          inputFinNew.setAttribute('required', '');
          if (labelFinNew) labelFinNew.innerHTML = 'Data Financeiro (DD/MM/AAAA) *';
        } else {
          inputFinNew.removeAttribute('required');
          if (labelFinNew) labelFinNew.innerHTML = 'Data Financeiro (DD/MM/AAAA)';
        }
        inputFinNew.dispatchEvent(new Event('input'));
      };

      selectStatus?.addEventListener('change', updateNewFinRequired);
      updateNewFinRequired();

      const handleClose = () => this.close();
      document.getElementById('btn-close-viagem-x')?.addEventListener('click', handleClose);
      document.getElementById('btn-cancel-viagem')?.addEventListener('click', handleClose);

      const form = document.getElementById('form-nova-viagem') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clienteId = (document.getElementById('select-viagem-cliente') as HTMLSelectElement).value;
        const destino = (document.getElementById('input-viagem-destino') as HTMLInputElement).value;
        const loc = (document.getElementById('input-viagem-loc') as HTMLInputElement).value.trim();
        const valorRaw = (document.getElementById('input-viagem-valor') as HTMLInputElement).value.trim();
        const vIdaRaw = (document.getElementById('input-viagem-ida') as HTMLInputElement).value.trim();
        const vVoltaRaw = (document.getElementById('input-viagem-volta') as HTMLInputElement).value.trim();
        const vFinRaw = (document.getElementById('input-viagem-data-financeiro') as HTMLInputElement).value.trim();
        const status = (document.getElementById('select-viagem-status') as HTMLSelectElement).value;
        const obs = (document.getElementById('textarea-viagem-obs') as HTMLTextAreaElement).value;

        if (!novaViagemValidator.validateAll()) {
          showToast('Preencha todos os campos obrigatórios com valores válidos.', 'error');
          return;
        }

        const vIdaResult = validateDate(vIdaRaw);
        if (!vIdaResult.isValid) {
          showToast(`Data de Ida inválida: ${vIdaResult.message}`, 'error');
          return;
        }
        const vVoltaResult = validateDate(vVoltaRaw);
        if (!vVoltaResult.isValid) {
          showToast(`Data de Volta inválida: ${vVoltaResult.message}`, 'error');
          return;
        }
        if (status !== 'fechado') {
          const vFinResult = validateDate(vFinRaw);
          if (!vFinResult.isValid) {
            showToast(`Data Financeiro inválida: ${vFinResult.message}`, 'error');
            return;
          }
        }

        const vIda = formatBrDateToIso(vIdaRaw)!;
        const vVolta = formatBrDateToIso(vVoltaRaw)!;
        const vFin = vFinRaw ? formatBrDateToIso(vFinRaw) : null;

        const idaDate = new Date(vIda);
        const voltaDate = new Date(vVolta);
        if (voltaDate.getTime() < idaDate.getTime()) {
          showToast('A data de volta não pode ser anterior à data de ida.', 'error');
          return;
        }

        const valor = parseDoubleBr(valorRaw);

        const payload = {
          cliente_id: clienteId,
          consultor_id: user.id,
          destino: destino,
          destino_id: selectedDestinoId || null,
          codigo_localizador: loc || null,
          valor_total: valor,
          data_ida: vIda,
          data_volta: vVolta,
          data_financeiro: vFin,
          status: status,
          observacoes: obs || null
        };

        try {
          const { error } = await supabase
            .from('viagens')
            .insert(payload);

          if (error) throw error;

          showToast('Viagem cadastrada com sucesso!', 'success');
          this.close();
          await onSuccess();
        } catch (err: any) {
          console.error('Erro ao cadastrar viagem:', err);
          showToast('Erro ao criar viagem.', 'error', err);
        }
      });

    } catch (err: any) {
      console.error('Erro ao abrir modal de nova viagem:', err);
      showToast('Erro ao carregar modal de criação.', 'error', err);
      this.close();
    }
  }

  /**
   * Renderiza a estrutura base de overlay do modal
   */
  public static renderModalOverlay(maxWidthClass: string = 'max-w-lg'): void {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'fixed inset-0 modal-overlay-blur z-50 flex items-center justify-center opacity-0 pointer-events-none';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 transform scale-95 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar" id="modal-container">
          <div id="modal-content-container"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const container = document.getElementById('modal-container');
    if (container) {
      container.className = container.className.replace(/\bmax-w-\S+/g, '');
      const classes = maxWidthClass.split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        container.classList.add(...classes);
      }
    }

    setTimeout(() => {
      if (overlay) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
      }
      if (container) {
        container.classList.remove('scale-95');
        container.classList.add('scale-100');
      }
    }, 10);
  }

  /**
   * Fecha o modal
   */
  public static close(): void {
    if (this.destAutocomplete) {
      this.destAutocomplete.destroy();
      this.destAutocomplete = null;
    }
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    if (overlay && container) {
      container.classList.remove('scale-100');
      container.classList.add('scale-95');
      overlay.classList.remove('opacity-100', 'pointer-events-auto');
      overlay.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        overlay.remove();
      }, 300);
    }
  }
}
