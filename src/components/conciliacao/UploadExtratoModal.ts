import { parseOFX, TransacaoOFX } from '../../services/ofxParser';
import { parseCSVExtrato } from '../../services/csvExtratoParser';
import { ConciliacaoService } from '../../services/conciliacaoService';
import { showCustomAlert } from '../../services/dialog';

export class UploadExtratoModal {
  private static overlay: HTMLElement | null = null;
  private static transacoesParseadas: TransacaoOFX[] = [];
  private static arquivoSelecionado: File | null = null;
  private static onSucessoCallback: (() => void) | null = null;

  public static abrir(onSucesso?: () => void): void {
    this.onSucessoCallback = onSucesso || null;
    this.transacoesParseadas = [];
    this.arquivoSelecionado = null;

    this.overlay = document.createElement('div');
    this.overlay.id = 'modal-upload-extrato-overlay';
    this.overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';

    this.overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[650px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden" id="modal-upload-extrato-card">
        
        <div class="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xl border border-emerald-100 dark:border-emerald-900/40">
              📁
            </div>
            <div>
              <h2 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Importar Extrato Bancário</h2>
              <p class="text-xs text-slate-400 font-medium">Arquivos OFX ou CSV de qualquer Internet Banking</p>
            </div>
          </div>
          <button id="btn-fechar-upload-extrato" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1">✕</button>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Banco / Instituição *</label>
              <select id="select-banco-origem" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-bold text-xs">
                <option value="Itaú Unibanco">Itaú Unibanco</option>
                <option value="Bradesco">Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="Banco do Brasil">Banco do Brasil</option>
                <option value="Banco Inter">Banco Inter</option>
                <option value="Nubank">Nubank</option>
                <option value="C6 Bank">C6 Bank</option>
                <option value="Caixa Econômica">Caixa Econômica</option>
                <option value="Outro Banco">Outro Banco / Conta</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Formato Suportado</label>
              <div class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs font-semibold text-slate-500 flex items-center gap-2">
                <span class="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded">.OFX</span>
                <span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] font-black rounded">.CSV</span>
              </div>
            </div>
          </div>

          <!-- Dropzone -->
          <div id="dropzone-extrato" class="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/30">
            <input type="file" id="input-file-extrato" accept=".ofx,.csv,.txt" class="hidden" />
            <div class="flex flex-col items-center">
              <span class="text-3xl mb-2">📥</span>
              <p class="text-xs font-bold text-slate-700 dark:text-slate-200">Arraste e solte o arquivo do extrato aqui</p>
              <p class="text-[11px] text-slate-400 mt-1">ou clique para selecionar do computador</p>
            </div>
          </div>

          <!-- Preview da Importação -->
          <div id="container-preview-extrato" class="hidden space-y-3">
            <div class="flex items-center justify-between p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl">
              <div>
                <span class="block text-xs font-black text-emerald-800 dark:text-emerald-300" id="preview-nome-arquivo">extrato.ofx</span>
                <span class="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold" id="preview-resumo-linhas">0 transações identificadas</span>
              </div>
              <div class="text-right">
                <span class="block text-[10px] text-slate-400 uppercase font-bold">Total Créditos</span>
                <span class="block text-xs font-black text-emerald-700 dark:text-emerald-400" id="preview-total-creditos">R$ 0,00</span>
              </div>
            </div>

            <div class="max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left text-[11px] border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-800/80 text-[9px] text-slate-400 font-black uppercase sticky top-0">
                  <tr>
                    <th class="p-2.5">Data</th>
                    <th class="p-2.5">Descrição</th>
                    <th class="p-2.5 text-center">Tipo</th>
                    <th class="p-2.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody id="tbody-preview-linhas" class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button id="btn-cancelar-upload-extrato" class="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition">
            Cancelar
          </button>
          <button id="btn-confirmar-upload-extrato" disabled class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-1.5">
            <span>⚡ Confirmar e Importar</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    setTimeout(() => {
      this.overlay?.classList.add('opacity-100');
      document.getElementById('modal-upload-extrato-card')?.classList.remove('scale-95');
      document.getElementById('modal-upload-extrato-card')?.classList.add('scale-100');
    }, 10);

    this.setupListeners();
  }

  private static fechar(): void {
    const card = document.getElementById('modal-upload-extrato-card');
    if (card) {
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
    }
    this.overlay?.classList.remove('opacity-100');
    this.overlay?.classList.add('opacity-0');
    setTimeout(() => this.overlay?.remove(), 300);
  }

  private static setupListeners(): void {
    document.getElementById('btn-fechar-upload-extrato')?.addEventListener('click', () => this.fechar());
    document.getElementById('btn-cancelar-upload-extrato')?.addEventListener('click', () => this.fechar());

    const dropzone = document.getElementById('dropzone-extrato');
    const fileInput = document.getElementById('input-file-extrato') as HTMLInputElement;

    dropzone?.addEventListener('click', () => fileInput?.click());

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-emerald-500', 'bg-emerald-50/20');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-emerald-500', 'bg-emerald-50/20');
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-emerald-500', 'bg-emerald-50/20');
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        this.processarArquivo(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.processarArquivo(fileInput.files[0]);
      }
    });

    document.getElementById('btn-confirmar-upload-extrato')?.addEventListener('click', async () => {
      await this.salvarLote();
    });
  }

  private static async processarArquivo(file: File): Promise<void> {
    this.arquivoSelecionado = file;
    const nome = file.name.toLowerCase();
    const texto = await file.text();

    if (nome.endsWith('.ofx')) {
      const res = parseOFX(texto);
      this.transacoesParseadas = res.transacoes;
    } else {
      const res = parseCSVExtrato(texto);
      this.transacoesParseadas = res.transacoes;
    }

    this.renderizarPreview(file.name);
  }

  private static renderizarPreview(nomeArquivo: string): void {
    const container = document.getElementById('container-preview-extrato');
    const submitBtn = document.getElementById('btn-confirmar-upload-extrato') as HTMLButtonElement;
    const tbody = document.getElementById('tbody-preview-linhas');

    if (!container || !tbody || !submitBtn) return;

    if (this.transacoesParseadas.length === 0) {
      showCustomAlert('Não foi possível identificar nenhuma transação válida no arquivo. Verifique o formato.', 'Arquivo Vazio');
      return;
    }

    container.classList.remove('hidden');
    submitBtn.disabled = false;

    const totalCreditos = this.transacoesParseadas
      .filter(t => t.tipo === 'CREDITO')
      .reduce((acc, t) => acc + t.valor, 0);

    const nomeEl = document.getElementById('preview-nome-arquivo');
    const resumoEl = document.getElementById('preview-resumo-linhas');
    const totalEl = document.getElementById('preview-total-creditos');

    if (nomeEl) nomeEl.textContent = nomeArquivo;
    if (resumoEl) resumoEl.textContent = `${this.transacoesParseadas.length} transações encontradas (${this.transacoesParseadas.filter(t => t.tipo === 'CREDITO').length} créditos)`;
    if (totalEl) totalEl.textContent = `R$ ${totalCreditos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    tbody.innerHTML = this.transacoesParseadas.slice(0, 50).map(t => {
      const dataFmt = t.data.split('-').reverse().join('/');
      const isCredito = t.tipo === 'CREDITO';
      return `
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
          <td class="p-2.5 font-bold whitespace-nowrap">${dataFmt}</td>
          <td class="p-2.5 font-medium truncate max-w-[200px]" title="${t.descricao}">${t.descricao}</td>
          <td class="p-2.5 text-center">
            <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${isCredito ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'}">
              ${t.tipo}
            </span>
          </td>
          <td class="p-2.5 text-right font-black whitespace-nowrap ${isCredito ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}">
            R$ ${t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `;
    }).join('');
  }

  private static async salvarLote(): Promise<void> {
    const submitBtn = document.getElementById('btn-confirmar-upload-extrato') as HTMLButtonElement;
    const bancoSelect = document.getElementById('select-banco-origem') as HTMLSelectElement;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1"></span> Gravando...`;
    }

    try {
      const bancoNome = bancoSelect?.value || 'Banco Principal';
      const nomeArquivo = this.arquivoSelecionado?.name || 'extrato_bancario.ofx';

      const res = await ConciliacaoService.importarLoteExtrato(
        nomeArquivo,
        bancoNome,
        this.transacoesParseadas,
        this.arquivoSelecionado || undefined
      );

      if (!res.sucesso) {
        throw new Error(res.erro || 'Falha ao salvar lote');
      }

      this.fechar();
      if (this.onSucessoCallback) {
        this.onSucessoCallback();
      }
    } catch (err: any) {
      console.error('Erro no salvamento:', err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '⚡ Confirmar e Importar';
      }
      await showCustomAlert(`Não foi possível concluir a importação:\n\n${err.message}`, 'Erro de Importação');
    }
  }
}
