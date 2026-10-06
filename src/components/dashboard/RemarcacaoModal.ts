import { RemarcacaoService } from '../../services/remarcacaoService';
import { RemarcacaoViagemParams } from '../../types';
import { renderDateInputHTML, renderCurrencyInputHTML, parseDoubleBr, formatBrDateToIso } from '../../utils/masks';

export interface RemarcacaoModalOptions {
  viagem: any;
  consultorId: string;
  consultorNome?: string;
  showToast: (msg: string, tipo?: 'success' | 'error' | 'info') => void;
  onSuccess: () => Promise<void> | void;
}

export class RemarcacaoModal {
  private options: RemarcacaoModalOptions;
  private modalEl: HTMLElement | null = null;
  private isProcessing: boolean = false;

  constructor(options: RemarcacaoModalOptions) {
    this.options = options;
  }

  public open(): void {
    const v = this.options.viagem;
    if (!v) return;

    // Fechar modal anterior se já existir
    const existing = document.getElementById('paxflow-modal-remarcacao');
    if (existing) existing.remove();

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'paxflow-modal-remarcacao';
    this.modalEl.className = 'fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto';

    const idaAtualBr = this.formatarDataBr(v.data_ida);
    const voltaAtualBr = this.formatarDataBr(v.data_volta);
    const dataFinBr = this.formatarDataBr(v.data_financeiro);
    const nomePax = v.cliente?.nome || v.cliente_nome || 'Passageiro';
    const destino = v.destino || 'Destino';
    const loc = v.codigo_localizador || 'Sem LOC';

    // Extrair trechos aéreos existentes se houver
    const trechosExistentes: any[] = [];
    const prods = v.produtos || [];
    prods.forEach((p: any) => {
      const tipoUpper = (p.tipo || '').toUpperCase();
      if ((tipoUpper.includes('AÉREO') || tipoUpper.includes('VOO') || tipoUpper === 'AEREO') && p.dados_adicionais?.trechos) {
        p.dados_adicionais.trechos.forEach((t: any) => {
          trechosExistentes.push(t);
        });
      }
    });

    this.modalEl.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-up my-auto">
        <!-- Header -->
        <div class="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">🔁</span>
            <div>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100">Remarcar Viagem &amp; Voos</h3>
              <p class="text-xs font-semibold text-slate-400">${nomePax} • ${destino} (LOC: ${loc})</p>
            </div>
          </div>
          <button id="btn-close-remarcacao" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg font-bold transition cursor-pointer">
            &times;
          </button>
        </div>

        <form id="form-remarcacao-viagem" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          <!-- Banner de Blindagem Contábil -->
          <div class="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-start gap-2.5 text-xs text-indigo-800 dark:text-indigo-300">
            <span class="text-base select-none">🛡️</span>
            <div>
              <p class="font-extrabold">Blindagem Contábil e de Metas Ativa</p>
              <p class="text-[11px] opacity-90 mt-0.5">
                A <strong>Data Financeiro (${dataFinBr || 'Mês Original'})</strong> permanecerá intocada. O faturamento, metas e comissões da venda original continuam no mês em que foram faturados. O Relatório de Embarques será atualizado para as novas datas.
              </p>
            </div>
          </div>

          <!-- Comparativo de Datas -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <!-- Datas Atuais -->
            <div class="space-y-1.5 opacity-75">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cronograma Atual</span>
              <div class="text-xs font-bold text-slate-700 dark:text-slate-300 flex flex-col gap-1">
                <div>🛫 Ida: <span class="font-mono text-slate-900 dark:text-white">${idaAtualBr}</span></div>
                <div>🛬 Volta: <span class="font-mono text-slate-900 dark:text-white">${voltaAtualBr || idaAtualBr}</span></div>
              </div>
            </div>

            <!-- Novas Datas -->
            <div class="space-y-2">
              <span class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Novas Datas da Viagem *</span>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Nova Data de Ida *</label>
                ${renderDateInputHTML('input-remarca-nova-ida', '', 'DD/MM/AAAA', true)}
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Nova Data de Volta</label>
                ${renderDateInputHTML('input-remarca-nova-volta', '', 'DD/MM/AAAA', false)}
              </div>
            </div>
          </div>

          <!-- Seção de Taxa / Diferença Tarifária -->
          <div class="p-4 bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" id="check-remarca-tem-taxa" class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <span>Houve cobrança de Taxa de Remarcação / Diferença Tarifária?</span>
              </label>
            </div>

            <div id="container-campos-taxa" class="hidden pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Valor da Taxa/Diferença (R$) *</label>
                  ${renderCurrencyInputHTML('input-remarca-taxa-valor', '0,00')}
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Fornecedor / Cia Aérea</label>
                  <input id="input-remarca-taxa-fornecedor" type="text" placeholder="Ex: LATAM, Gol, CVC..." class="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tarifa Repassada (R$)</label>
                  ${renderCurrencyInputHTML('input-remarca-taxa-tarifa', '0,00')}
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Comissão da Agência (R$)</label>
                  ${renderCurrencyInputHTML('input-remarca-taxa-comissao', '0,00')}
                </div>
              </div>
              <p class="text-[10px] text-slate-400">
                💡 Este valor será faturado na competência deste mês como produto adicional, mantendo a comissão e margem devidamente contabilizadas.
              </p>
            </div>
          </div>

          <!-- Motivo da Remarcação -->
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Motivo da Remarcação (Histórico de Auditoria)</label>
            <textarea id="textarea-remarca-motivo" placeholder="Ex: Solicitação do passageiro por motivos pessoais, alteração de escala aérea..." class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 h-16 resize-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>

          <!-- Footer Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button id="btn-cancel-remarcacao" type="button" class="h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer">
              Cancelar
            </button>
            <button id="btn-submit-remarcacao" type="submit" class="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs tracking-wider rounded-xl shadow-md shadow-indigo-600/20 transition uppercase flex items-center gap-1.5 cursor-pointer">
              <span>Executar Remarcação 🔁</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    // Event Listeners
    const closeBtn = this.modalEl.querySelector('#btn-close-remarcacao');
    const cancelBtn = this.modalEl.querySelector('#btn-cancel-remarcacao');
    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());

    // Toggle de Taxa
    const checkTaxa = this.modalEl.querySelector('#check-remarca-tem-taxa') as HTMLInputElement;
    const containerTaxa = this.modalEl.querySelector('#container-campos-taxa') as HTMLElement;
    checkTaxa?.addEventListener('change', () => {
      if (checkTaxa.checked) {
        containerTaxa.classList.remove('hidden');
      } else {
        containerTaxa.classList.add('hidden');
      }
    });

    // Submissão do Formulário
    const form = this.modalEl.querySelector('#form-remarcacao-viagem') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.processarRemarcacao();
    });
  }

  private async processarRemarcacao(): Promise<void> {
    if (this.isProcessing) return;

    const novaIdaRaw = (document.getElementById('input-remarca-nova-ida') as HTMLInputElement)?.value?.trim();
    const novaVoltaRaw = (document.getElementById('input-remarca-nova-volta') as HTMLInputElement)?.value?.trim();
    const motivo = (document.getElementById('textarea-remarca-motivo') as HTMLTextAreaElement)?.value?.trim();

    const novaDataIda = formatBrDateToIso(novaIdaRaw);
    const novaDataVolta = novaVoltaRaw ? formatBrDateToIso(novaVoltaRaw) : undefined;

    if (!novaDataIda) {
      this.options.showToast('Por favor, informe a nova Data de Ida no formato DD/MM/AAAA.', 'error');
      return;
    }

    if (novaDataVolta && novaDataVolta < novaDataIda) {
      this.options.showToast('A nova Data de Volta não pode ser anterior à Data de Ida.', 'error');
      return;
    }

    const checkTaxa = document.getElementById('check-remarca-tem-taxa') as HTMLInputElement;
    const temTaxa = checkTaxa ? checkTaxa.checked : false;

    let taxaValor = 0;
    let taxaFornecedor = '';
    let taxaTarifa = 0;
    let taxaComissao = 0;

    if (temTaxa) {
      const valRaw = (document.getElementById('input-remarca-taxa-valor') as HTMLInputElement)?.value?.trim();
      const fornRaw = (document.getElementById('input-remarca-taxa-fornecedor') as HTMLInputElement)?.value?.trim();
      const tarRaw = (document.getElementById('input-remarca-taxa-tarifa') as HTMLInputElement)?.value?.trim();
      const comRaw = (document.getElementById('input-remarca-taxa-comissao') as HTMLInputElement)?.value?.trim();

      taxaValor = parseDoubleBr(valRaw);
      taxaFornecedor = fornRaw || 'FORNECEDOR';
      taxaTarifa = parseDoubleBr(tarRaw) || taxaValor;
      taxaComissao = parseDoubleBr(comRaw);

      if (taxaValor <= 0) {
        this.options.showToast('Por favor, informe o valor da taxa de remarcação.', 'error');
        return;
      }
    }

    const submitBtn = document.getElementById('btn-submit-remarcacao') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Processando Remarcação...</span>';
    }
    this.isProcessing = true;

    try {
      const params: RemarcacaoViagemParams = {
        viagemId: this.options.viagem.id,
        novaDataIda,
        novaDataVolta,
        temTaxaRemarcacao: temTaxa,
        taxaValor,
        taxaFornecedor,
        taxaTarifa,
        taxaComissao,
        motivoRemarcacao: motivo,
        consultorId: this.options.consultorId,
        consultorNome: this.options.consultorNome
      };

      const res = await RemarcacaoService.executarRemarcacao(params);
      if (res.success) {
        this.options.showToast(res.mensagem, 'success');
        this.close();
        await this.options.onSuccess();
      }
    } catch (err: any) {
      console.error('Erro ao executar remarcação:', err);
      this.options.showToast(err.message || 'Erro ao processar a remarcação.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Executar Remarcação 🔁</span>';
      }
      this.isProcessing = false;
    }
  }

  public close(): void {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }

  private formatarDataBr(dataIso?: string | null): string {
    if (!dataIso) return '--/--/----';
    const clean = dataIso.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dataIso;
  }
}
