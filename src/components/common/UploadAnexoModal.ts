import { AnexosService } from '../../services/anexosService';
import { PdfCompressorService } from '../../services/pdfCompressorService';
import { TipoDocumentoAnexo } from '../../types';

export interface PassageiroOpcao {
  id: string;
  nome: string;
}

export interface UploadAnexoModalOptions {
  arquivos: File[];
  viagemId?: string;
  clienteId?: string;
  passageiros?: PassageiroOpcao[];
  usuarioId?: string;
  showToast: (msg: string, tipo?: 'success' | 'error' | 'info') => void;
  onSuccess: () => Promise<void> | void;
}

interface ItemArquivoEdicao {
  file: File;
  id: string;
  tipo: TipoDocumentoAnexo;
  rotulo: string;
  numeroDocumento: string;
  dataValidade: string;
  clienteIdVinculado?: string;
}

export class UploadAnexoModal {
  private options: UploadAnexoModalOptions;
  private modalEl: HTMLElement | null = null;
  private itens: ItemArquivoEdicao[] = [];
  private enviando: boolean = false;

  constructor(options: UploadAnexoModalOptions) {
    this.options = options;
    this.inicializarItens();
  }

  private inicializarItens(): void {
    this.itens = this.options.arquivos.map((file, idx) => {
      const { tipo, rotulo } = AnexosService.inferirTipoPorNome(file.name);
      return {
        file,
        id: `anexo-item-${Date.now()}-${idx}`,
        tipo,
        rotulo,
        numeroDocumento: '',
        dataValidade: '',
        clienteIdVinculado: this.options.clienteId || undefined
      };
    });
  }

  public open(): void {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'paxflow-modal-upload-anexo';
    this.modalEl.className = 'fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto';

    this.render();
    document.body.appendChild(this.modalEl);
    this.bindEvents();
  }

  private close(): void {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }

  private getCategoriasOptionsHTML(tipoSelecionado: TipoDocumentoAnexo): string {
    const categorias: { value: TipoDocumentoAnexo; label: string }[] = [
      { value: 'PASSAPORTE', label: '🛂 Passaporte do Passageiro' },
      { value: 'RG', label: '🪪 RG / Carteira de Identidade' },
      { value: 'CNH', label: '🚗 CNH / Habilitação' },
      { value: 'VISTO', label: '📄 Visto de Entrada' },
      { value: 'VOUCHER_AEREO', label: '✈️ Passagem Aérea / Bilhete' },
      { value: 'VOUCHER_HOTEL', label: '🏨 Voucher de Hotel / Hospedagem' },
      { value: 'INGRESSO', label: '🎫 Ingressos / Passeios / Atrações' },
      { value: 'VOUCHER_TRANSPORTE', label: '🚐 Transfer / Aluguel de Carro' },
      { value: 'SEGURO', label: '🛡️ Apólice de Seguro Viagem' },
      { value: 'CONTRATO', label: '📝 Contrato / Termo de Viagem' },
      { value: 'ROTEIRO', label: '🗺️ Roteiro / Guia de Viagem' },
      { value: 'OUTROS', label: '📎 Outros Documentos' }
    ];

    return categorias
      .map(c => `<option value="${c.value}" ${c.value === tipoSelecionado ? 'selected' : ''}>${c.label}</option>`)
      .join('');
  }

  private render(): void {
    if (!this.modalEl) return;

    const totalArquivos = this.itens.length;
    const temPassageiros = this.options.passageiros && this.options.passageiros.length > 0;

    this.modalEl.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        
        <!-- Cabeçalho -->
        <div class="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold border border-indigo-500/20">
              📁
            </div>
            <div>
              <h3 class="text-base font-black text-slate-900 dark:text-white tracking-tight">
                ${totalArquivos > 1 ? `Identificar ${totalArquivos} Anexos em Lote` : 'Identificar Documento / Anexo'}
              </h3>
              <p class="text-xs text-slate-400 dark:text-slate-400 font-medium">
                Defina a categoria e rótulo para organização e sincronização automática.
              </p>
            </div>
          </div>
          <button id="btn-fechar-upload-modal" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold transition">
            ✕
          </button>
        </div>

        <!-- Lista de Arquivos para Configuração -->
        <div class="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          ${this.itens.map((item, index) => {
            const isPessoal = ['PASSAPORTE', 'RG', 'CNH', 'VISTO'].includes(item.tipo);
            const sizeInMb = item.file.size / (1024 * 1024);
            const tamanhoFormatado = sizeInMb >= 1.0 ? `${sizeInMb.toFixed(1)} MB` : `${(item.file.size / 1024).toFixed(1)} KB`;
            const precisaOtimizar = PdfCompressorService.precisaComprimir(item.file);

            return `
              <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3.5" data-item-id="${item.id}">
                
                <!-- Informações do Arquivo Original -->
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                  <div class="flex items-center gap-2 overflow-hidden min-w-0">
                    <span class="text-base shrink-0">📄</span>
                    <strong class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title="${item.file.name}">
                      ${item.file.name}
                    </strong>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    ${precisaOtimizar ? `
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Este PDF excede 25MB e será otimizado visualmente no navegador antes do envio.">
                        ⚡ Otimização Automática
                      </span>
                    ` : ''}
                    <span class="text-[10px] font-bold ${precisaOtimizar ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} uppercase tracking-wider">
                      ${tamanhoFormatado}
                    </span>
                  </div>
                </div>

                <!-- Campos de Classificação -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Categoria do Documento *
                    </label>
                    <select class="select-item-categoria w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold" data-idx="${index}">
                      ${this.getCategoriasOptionsHTML(item.tipo)}
                    </select>
                  </div>

                  <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Rótulo / Nome de Exibição *
                    </label>
                    <input type="text" class="input-item-rotulo w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value="${item.rotulo}" placeholder="Ex: Passaporte João, Voucher Fasano" data-idx="${index}" />
                  </div>
                </div>

                <!-- Campos Específicos para Documentos Pessoais (Número e Validade) -->
                <div class="container-campos-pessoais grid grid-cols-1 sm:grid-cols-2 gap-3 ${isPessoal ? '' : 'hidden'}" id="campos-pessoais-${index}">
                  <div>
                    <label class="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Número do Documento (Opcional)
                    </label>
                    <input type="text" class="input-item-numero w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value="${item.numeroDocumento}" placeholder="Ex: FP123456 ou 12.345.678-9" data-idx="${index}" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Data de Validade (Opcional)
                    </label>
                    <input type="date" class="input-item-validade w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value="${item.dataValidade}" data-idx="${index}" />
                  </div>
                </div>

                <!-- Seletor de Passageiro (Se no contexto de Viagem com múltiplos passageiros) -->
                ${temPassageiros ? `
                  <div class="pt-1">
                    <label class="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Vincular a Passageiro Específico
                    </label>
                    <select class="select-item-passageiro w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" data-idx="${index}">
                      <option value="" ${!item.clienteIdVinculado ? 'selected' : ''}>🌐 Geral da Viagem (Todos os Passageiros)</option>
                      ${this.options.passageiros!.map(p => `
                        <option value="${p.id}" ${item.clienteIdVinculado === p.id ? 'selected' : ''}>
                          👤 ${p.nome}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                ` : ''}

              </div>
            `;
          }).join('')}
        </div>

        <!-- Status de Upload e Ações -->
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <div id="upload-status-indicator" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hidden flex items-center gap-2">
            <div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span id="upload-status-text">Enviando arquivos com segurança...</span>
          </div>

          <div class="flex items-center gap-2 ml-auto">
            <button id="btn-cancelar-upload" class="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
              Cancelar
            </button>
            <button id="btn-confirmar-upload" class="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2">
              <span>💾</span>
              <span>${totalArquivos > 1 ? `Salvar Todos (${totalArquivos})` : 'Salvar Anexo'}</span>
            </button>
          </div>
        </div>

      </div>
    `;
  }

  private bindEvents(): void {
    if (!this.modalEl) return;

    this.modalEl.querySelector('#btn-fechar-upload-modal')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-cancelar-upload')?.addEventListener('click', () => this.close());

    // Atualização de Categoria
    this.modalEl.querySelectorAll('.select-item-categoria').forEach((el) => {
      el.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const idx = parseInt(target.getAttribute('data-idx') || '0', 10);
        this.itens[idx].tipo = target.value as TipoDocumentoAnexo;

        const camposPessoais = this.modalEl?.querySelector(`#campos-pessoais-${idx}`);
        if (camposPessoais) {
          const isPessoal = ['PASSAPORTE', 'RG', 'CNH', 'VISTO'].includes(target.value);
          if (isPessoal) {
            camposPessoais.classList.remove('hidden');
          } else {
            camposPessoais.classList.add('hidden');
          }
        }
      });
    });

    // Atualização de Rótulo
    this.modalEl.querySelectorAll('.input-item-rotulo').forEach((el) => {
      el.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const idx = parseInt(target.getAttribute('data-idx') || '0', 10);
        this.itens[idx].rotulo = target.value;
      });
    });

    // Atualização de Número
    this.modalEl.querySelectorAll('.input-item-numero').forEach((el) => {
      el.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const idx = parseInt(target.getAttribute('data-idx') || '0', 10);
        this.itens[idx].numeroDocumento = target.value;
      });
    });

    // Atualização de Validade
    this.modalEl.querySelectorAll('.input-item-validade').forEach((el) => {
      el.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const idx = parseInt(target.getAttribute('data-idx') || '0', 10);
        this.itens[idx].dataValidade = target.value;
      });
    });

    // Atualização de Passageiro
    this.modalEl.querySelectorAll('.select-item-passageiro').forEach((el) => {
      el.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const idx = parseInt(target.getAttribute('data-idx') || '0', 10);
        this.itens[idx].clienteIdVinculado = target.value || undefined;
      });
    });

    // Submissão
    this.modalEl.querySelector('#btn-confirmar-upload')?.addEventListener('click', () => this.processarUpload());
  }

  private async processarUpload(): Promise<void> {
    if (this.enviando) return;

    for (const item of this.itens) {
      if (!item.rotulo.trim()) {
        this.options.showToast(`Por favor, informe o rótulo do arquivo "${item.file.name}".`, 'error');
        return;
      }
    }

    this.enviando = true;
    const statusEl = this.modalEl?.querySelector('#upload-status-indicator');
    const statusText = this.modalEl?.querySelector('#upload-status-text');
    const btnSalvar = this.modalEl?.querySelector('#btn-confirmar-upload') as HTMLButtonElement | null;
    const btnCancelar = this.modalEl?.querySelector('#btn-cancelar-upload') as HTMLButtonElement | null;

    if (statusEl) statusEl.classList.remove('hidden');
    if (btnSalvar) btnSalvar.disabled = true;
    if (btnCancelar) btnCancelar.disabled = true;

    let enviados = 0;
    try {
      for (let i = 0; i < this.itens.length; i++) {
        const item = this.itens[i];
        if (statusText) {
          statusText.textContent = `Enviando "${item.rotulo}" (${i + 1}/${this.itens.length})...`;
        }

        await AnexosService.uploadAnexo({
          file: item.file,
          rotulo: item.rotulo.trim(),
          tipo_documento: item.tipo,
          numero_documento: item.numeroDocumento.trim() || undefined,
          data_validade: item.dataValidade.trim() || undefined,
          viagem_id: this.options.viagemId,
          cliente_id: item.clienteIdVinculado || this.options.clienteId,
          user_id: this.options.usuarioId,
          onProgress: (mensagem) => {
            if (statusText) {
              statusText.textContent = mensagem;
            }
          }
        });

        enviados++;
      }

      this.options.showToast(
        enviados > 1 ? `${enviados} documentos anexados com sucesso!` : `Documento "${this.itens[0].rotulo}" anexado com sucesso!`,
        'success'
      );

      this.close();
      await this.options.onSuccess();
    } catch (err: any) {
      console.error('[UploadAnexoModal] Erro ao enviar anexos:', err);
      this.options.showToast(`Falha no upload: ${err.message || 'Erro desconhecido.'}`, 'error');
    } finally {
      this.enviando = false;
      if (statusEl) statusEl.classList.add('hidden');
      if (btnSalvar) btnSalvar.disabled = false;
      if (btnCancelar) btnCancelar.disabled = false;
    }
  }
}
