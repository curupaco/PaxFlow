import { supabase, getSessaoAtual } from '../../services/supabase';
import { Cliente, ClientePassaporte, PerfilConsultor } from '../../types';
import { showCustomConfirm } from '../../services/dialog';
import {
  renderPhoneInputHTML,
  renderEmailInputHTML,
  renderDateInputHTML,
  renderDocumentInputHTML,
  setupFormValidation,
  getFormattedPhoneToDb,
  formatBrDateToIso,
  formatIsoDateToBr
} from '../../utils/masks';
import { calcularCompletudeCadastral } from '../../controllers/clientesController';
import { renderHelpIcon } from '../../utils/helpHelper';

export interface ClienteDetalhesModalOptions {
  onSave?: (cliente: Cliente) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning', err?: any) => void;
}

export class ClienteDetalhesModal {
  private static activeModal: HTMLElement | null = null;
  private static currentClient: Cliente | null = null;
  private static passaportesEdicao: ClientePassaporte[] = [];
  private static options: ClienteDetalhesModalOptions = {};
  private static user: any = null;
  private static perfil: PerfilConsultor | null = null;
  private static activeCleanups: (() => void)[] = [];

  /**
   * Abre o modal sobreposto para consulta e edição completa do cliente
   */
  public static async abrir(clienteId: string, options: ClienteDetalhesModalOptions = {}, clienteInicial?: any): Promise<void> {
    this.options = options;
    if (!clienteId && !clienteInicial) {
      this.notifyToast('Nenhum cliente selecionado.', 'warning');
      return;
    }

    try {
      // 1. Obter sessão atual
      const { user, perfil } = await getSessaoAtual();
      this.user = user;
      this.perfil = perfil;

      let rawCliente: any = clienteInicial || null;

      // 2. Buscar dados do cliente no Supabase
      if (clienteId) {
        try {
          const query = supabase.from('clientes').select('*').eq('id', clienteId);
          const { data, error } = typeof (query as any).maybeSingle === 'function'
            ? await (query as any).maybeSingle()
            : await query.single();

          if (!error && data) {
            rawCliente = data;
          }
        } catch (e) {
          console.warn('Erro ao consultar cliente no Supabase:', e);
        }
      }

      if (!rawCliente) {
        console.error('Erro ao buscar cliente:', clienteId);
        this.notifyToast('Não foi possível carregar os dados do cliente.', 'error');
        return;
      }

      // Mapear dados para a tipagem de Cliente
      this.currentClient = {
        id: rawCliente.id || clienteId,
        nome: rawCliente.nome || rawCliente.nomeCliente || '',
        email: rawCliente.email || '',
        telefone: rawCliente.telefone || '',
        documento: rawCliente.documento || rawCliente.cpf || rawCliente.cnpj || '',
        dataNascimento: rawCliente.data_nascimento ? formatIsoDateToBr(rawCliente.data_nascimento) : (rawCliente.dataNascimento || ''),
        endereco: rawCliente.endereco || '',
        passaporteNumero: rawCliente.passaporte_numero || rawCliente.passaporteNumero || '',
        passaporteValidade: rawCliente.passaporte_validade ? formatIsoDateToBr(rawCliente.passaporte_validade) : (rawCliente.passaporteValidade || ''),
        passaportes: rawCliente.passaportes || [],
        vistosInformacoes: rawCliente.vistos_informacoes || rawCliente.vistosInformacoes || '',
        googleDriveFolderUrl: rawCliente.google_drive_folder_url || rawCliente.googleDriveFolderUrl || '',
        observacoes: rawCliente.observacoes || '',
        classificacoes: rawCliente.classificacoes || [],
        consultorResponsavelId: rawCliente.consultor_responsavel_id || rawCliente.consultorResponsavelId,
        createdAt: rawCliente.created_at || rawCliente.createdAt,
        updatedAt: rawCliente.updated_at || rawCliente.updatedAt
      };

      // Inicializar passaportes para edição
      this.initPassaportesEdicao();

      // Renderizar o modal no DOM
      this.render();

    } catch (err: any) {
      console.error('Erro ao abrir ClienteDetalhesModal:', err);
      this.notifyToast('Erro inesperado ao carregar cliente.', 'error', err);
    }
  }

  /**
   * Retorna o cliente atualmente em edição no modal (para testes e inspeção de estado)
   */
  public static getClienteAtual(): Cliente | null {
    return this.currentClient;
  }

  /**
   * Inicializa a lista de passaportes para o formulário
   */
  private static initPassaportesEdicao(): void {
    if (!this.currentClient) return;

    if (this.currentClient.passaportes && this.currentClient.passaportes.length > 0) {
      this.passaportesEdicao = this.currentClient.passaportes.map(p => ({
        nome: p.nome || '',
        numero: p.numero || '',
        validade: p.validade ? (p.validade.includes('-') ? formatIsoDateToBr(p.validade) : p.validade) : ''
      }));
    } else if (this.currentClient.passaporteNumero || this.currentClient.passaporteValidade) {
      this.passaportesEdicao = [{
        nome: this.currentClient.nome || 'Titular',
        numero: this.currentClient.passaporteNumero || '',
        validade: this.currentClient.passaporteValidade || ''
      }];
    } else {
      this.passaportesEdicao = [{
        nome: this.currentClient.nome || 'Titular',
        numero: '',
        validade: ''
      }];
    }
  }

  /**
   * Calcula o SLA do passaporte
   */
  private static checkPassaporteSLA(validadeStr?: string): { status: 'ok' | 'warning' | 'expired' | 'none'; days: number; message: string } {
    if (!validadeStr) return { status: 'none', days: 0, message: 'Passaporte não cadastrado.' };

    const iso = validadeStr.includes('/') ? formatBrDateToIso(validadeStr) : validadeStr;
    if (!iso) return { status: 'none', days: 0, message: 'Data inválida.' };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const validade = new Date(iso);
    validade.setHours(0, 0, 0, 0);

    const diferencaTempo = validade.getTime() - hoje.getTime();
    const diasParaVencer = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

    if (diasParaVencer < 0) {
      return {
        status: 'expired',
        days: diasParaVencer,
        message: `❌ PASSAPORTE EXPIRADO! (Vencido há ${Math.abs(diasParaVencer)} dias)`
      };
    } else if (diasParaVencer <= 180) {
      return {
        status: 'warning',
        days: diasParaVencer,
        message: `⚠️ ATENÇÃO: Passaporte expira em ${diasParaVencer} dias! (Mínimo de 6 meses recomendado)`
      };
    }

    return {
      status: 'ok',
      days: diasParaVencer,
      message: `✅ Passaporte Regular (Mais de 6 meses de validade - ${diasParaVencer} dias)`
    };
  }

  /**
   * Renderiza a estrutura do modal
   */
  private static render(): void {
    if (typeof document === 'undefined') return;

    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }

    const c = this.currentClient;
    if (!c) return;

    const completude = calcularCompletudeCadastral(c);
    const passSla = this.checkPassaporteSLA(c.passaporteValidade);

    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay-cliente-detalhes';
    overlay.className = 'fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-5 animate-fadeIn font-sans overflow-y-auto';

    overlay.innerHTML = `
      <div id="modal-container-cliente-detalhes" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transform scale-95 transition-all duration-300">
        
        <!-- Topo do Modal: Header com Avatar e Completude -->
        <div class="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
              ${(c.nome || 'CL').substring(0, 2).toUpperCase()}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 truncate">
                  ${c.nome || 'Cadastro do Cliente'}
                </h3>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${completude.corBadge}">
                  <span>${completude.porcentagem === 100 ? '⭐' : '📊'}</span>
                  <span>${completude.porcentagem}% Preenchido</span>
                </span>
              </div>
              <p class="text-[11px] text-slate-400 dark:text-slate-400 font-medium truncate">
                Ficha cadastral completa e documentação de viagem
              </p>
            </div>
          </div>
          <button id="btn-close-modal-cliente" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-400 flex items-center justify-center font-bold text-sm transition shrink-0" title="Fechar (Esc)">
            ✕
          </button>
        </div>

        <!-- Corpo do Formulário com Scroll -->
        <div class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          <form id="form-cliente-modal" class="space-y-6">
            
            <!-- Bloco 1: Informações Pessoais e Contato -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span class="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">1. Dados Pessoais &amp; Contato</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome Completo *</label>
                  <input id="modal-cli-nome" type="text" required value="${c.nome}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">E-mail *</label>
                  ${renderEmailInputHTML('modal-cli-email', c.email)}
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone / WhatsApp</label>
                  ${renderPhoneInputHTML('modal-cli-telefone', c.telefone, '(11) 99999-9999', false)}
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center">
                    Documento (CPF / CNPJ) ${renderHelpIcon('tipo-pessoa-cliente')}
                  </label>
                  ${renderDocumentInputHTML('modal-cli-documento', c.documento || '', 'CPF ou CNPJ', false)}
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data de Nascimento</label>
                  ${renderDateInputHTML('modal-cli-data-nasc', c.dataNascimento || '', 'DD/MM/AAAA', false)}
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endereço Residencial</label>
                  <input id="modal-cli-endereco" type="text" value="${c.endereco || ''}" placeholder="Rua, Número, Bairro, Cidade - UF, CEP" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm" />
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Origem do Lead</label>
                  <select id="modal-cli-origem-lead" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm">
                    <option value="" ${!c.classificacoes || c.classificacoes.length === 0 ? 'selected' : ''}>Selecione a Origem...</option>
                    <option value="WhatsApp" ${c.classificacoes && c.classificacoes.includes('WhatsApp') ? 'selected' : ''}>WhatsApp</option>
                    <option value="Instagram" ${c.classificacoes && c.classificacoes.includes('Instagram') ? 'selected' : ''}>Instagram</option>
                    <option value="Indicação" ${c.classificacoes && c.classificacoes.includes('Indicação') ? 'selected' : ''}>Indicação</option>
                    <option value="Google" ${c.classificacoes && c.classificacoes.includes('Google') ? 'selected' : ''}>Google</option>
                    <option value="Site" ${c.classificacoes && c.classificacoes.includes('Site') ? 'selected' : ''}>Site</option>
                    <option value="Loja" ${c.classificacoes && c.classificacoes.includes('Loja') ? 'selected' : ''}>Loja</option>
                    <option value="Outros" ${c.classificacoes && c.classificacoes.includes('Outros') ? 'selected' : ''}>Outros</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Bloco 2: Passaportes & Documentação Internacional -->
            <div class="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-5">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <div>
                  <span class="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                    2. Documentação Internacional / Passaportes ${renderHelpIcon('alerta-passaporte-validade')}
                  </span>
                  <p class="text-[11px] text-slate-400 font-medium">Controle de passaportes do titular e acompanhantes.</p>
                </div>
                <button type="button" id="modal-btn-add-passaporte" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-extrabold text-xs rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 transition flex items-center gap-1.5 uppercase">
                  <span>➕</span> Adicionar Passaporte
                </button>
              </div>

              <!-- Lista de Passaportes Dinâmica -->
              <div id="modal-container-passaportes" class="space-y-3">
                ${this.renderPassaportesCardsHTML()}
              </div>
            </div>

            <!-- Bloco 3: Preferências, Milhas & Observações -->
            <div class="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-5">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span class="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">3. Preferências, Milhas &amp; Observações</span>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Observações Gerais / Fidelidade / Preferências</label>
                <textarea id="modal-cli-observacoes" rows="3" placeholder="Preferências de assento, restrições alimentares, programas de fidelidade, histórico de atendimento..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-xs leading-relaxed">${c.observacoes || ''}</textarea>
              </div>
            </div>

          </form>
        </div>

        <!-- Rodapé com Botões de Ação -->
        <div class="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-end gap-2.5 shrink-0">
          <button type="button" id="modal-btn-cancelar-cliente" class="px-4 py-2 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition">
            Cancelar
          </button>
          <button type="button" id="modal-btn-salvar-cliente" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-2">
            <span>💾</span> Salvar Cadastro
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);
    this.activeModal = overlay;

    // Animação de entrada
    requestAnimationFrame(() => {
      const container = overlay.querySelector('#modal-container-cliente-detalhes');
      container?.classList.remove('scale-95');
      container?.classList.add('scale-100');
    });

    // Configuração dos Event Listeners
    this.setupEventListeners();
  }

  /**
   * Renderiza a lista de cards de passaportes
   */
  private static renderPassaportesCardsHTML(): string {
    if (this.passaportesEdicao.length === 0) {
      return `
        <div class="p-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
          Nenhum passaporte adicionado.
        </div>
      `;
    }

    return this.passaportesEdicao.map((p, idx) => {
      const passSla = this.checkPassaporteSLA(p.validade);
      let statusBadge = '';
      let borderClass = 'border-slate-200 dark:border-slate-800';

      if (passSla.status === 'expired') {
        borderClass = 'border-rose-400/80 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20';
        statusBadge = `<span class="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-900/50 px-2 py-0.5 rounded-md">Vencido</span>`;
      } else if (passSla.status === 'warning') {
        borderClass = 'border-amber-400/80 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/20';
        statusBadge = `<span class="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">Expira em ${passSla.days}d</span>`;
      } else if (passSla.status === 'ok') {
        statusBadge = `<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">Regular</span>`;
      }

      return `
        <div class="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 border ${borderClass} rounded-2xl space-y-3 relative group">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-black text-[10px] flex items-center justify-center">
                ${idx + 1}
              </span>
              <span class="text-xs font-black text-slate-700 dark:text-slate-200">
                ${idx === 0 ? 'Passageiro Titular' : 'Passageiro / Acompanhante'}
              </span>
              ${statusBadge}
            </div>
            ${idx > 0 ? `
              <button type="button" class="modal-btn-remover-passaporte text-slate-400 hover:text-rose-500 text-xs font-bold transition p-1" data-idx="${idx}" title="Remover passaporte">
                ✕
              </button>
            ` : ''}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome no Passaporte</label>
              <input type="text" class="modal-input-pass-nome w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-medium uppercase" value="${p.nome}" data-idx="${idx}" placeholder="NOME SOBRENOME" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº Passaporte</label>
              <input type="text" class="modal-input-pass-num w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-mono font-bold uppercase text-slate-800 dark:text-slate-100" value="${p.numero}" data-idx="${idx}" placeholder="EX: FP123456" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data de Validade</label>
              ${renderDateInputHTML(`modal-pass-validade-${idx}`, p.validade, 'DD/MM/AAAA', false)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Sincroniza os inputs de passaporte para o array de estado
   */
  private static syncPassaportesFromInputs(): void {
    if (!this.activeModal) return;

    this.passaportesEdicao.forEach((_, idx) => {
      const nomeInput = this.activeModal?.querySelector(`.modal-input-pass-nome[data-idx="${idx}"]`) as HTMLInputElement;
      const numInput = this.activeModal?.querySelector(`.modal-input-pass-num[data-idx="${idx}"]`) as HTMLInputElement;
      const valInput = this.activeModal?.querySelector(`#modal-pass-validade-${idx}`) as HTMLInputElement;

      if (nomeInput) this.passaportesEdicao[idx].nome = nomeInput.value.trim();
      if (numInput) this.passaportesEdicao[idx].numero = numInput.value.trim().toUpperCase();
      if (valInput) this.passaportesEdicao[idx].validade = valInput.value.trim();
    });
  }

  /**
   * Associa os eventos aos botões e inputs do modal
   */
  private static setupEventListeners(): void {
    if (!this.activeModal) return;

    // Limpar cleanups anteriores
    this.activeCleanups.forEach(fn => {
      try { fn(); } catch (e) { console.error(e); }
    });
    this.activeCleanups = [];

    // Botões de fechar
    const btnClose = this.activeModal.querySelector('#btn-close-modal-cliente');
    const btnCancelar = this.activeModal.querySelector('#modal-btn-cancelar-cliente');
    const btnSalvar = this.activeModal.querySelector('#modal-btn-salvar-cliente');
    const form = this.activeModal.querySelector('#form-cliente-modal') as HTMLFormElement;

    const handleClose = () => this.fechar();
    btnClose?.addEventListener('click', handleClose);
    btnCancelar?.addEventListener('click', handleClose);

    // Fechar ao clicar fora do container
    const handleOverlayClick = (e: MouseEvent) => {
      if (e.target === this.activeModal) {
        this.fechar();
      }
    };
    this.activeModal.addEventListener('click', handleOverlayClick);

    // Fechar com Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.fechar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    this.activeCleanups.push(() => window.removeEventListener('keydown', handleKeyDown));

    // Validação em tempo real
    const validator = setupFormValidation('form-cliente-modal', [
      { id: 'modal-cli-email', type: 'email' },
      { id: 'modal-cli-telefone', type: 'phone', required: false },
      { id: 'modal-cli-documento', type: 'cpf_cnpj', required: false },
      { id: 'modal-cli-data-nasc', type: 'date', required: false }
    ]);

    // Botão Adicionar Passaporte
    const btnAddPass = this.activeModal.querySelector('#modal-btn-add-passaporte');
    btnAddPass?.addEventListener('click', () => {
      this.syncPassaportesFromInputs();
      this.passaportesEdicao.push({ nome: '', numero: '', validade: '' });
      this.refreshPassaportesContainer();
    });

    // Remotores de passaportes
    this.setupPassaportesRemoverEvents();

    // Ação Salvar
    btnSalvar?.addEventListener('click', async () => {
      if (!validator.validateAll()) {
        this.notifyToast('Por favor, preencha os campos obrigatórios corretamente.', 'error');
        return;
      }
      await this.salvarCliente();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validator.validateAll()) {
        this.notifyToast('Por favor, preencha os campos obrigatórios corretamente.', 'error');
        return;
      }
      await this.salvarCliente();
    });
  }

  /**
   * Atualiza a lista visual de passaportes sem desmontar o modal inteiro
   */
  private static refreshPassaportesContainer(): void {
    if (!this.activeModal) return;
    const container = this.activeModal.querySelector('#modal-container-passaportes');
    if (container) {
      container.innerHTML = this.renderPassaportesCardsHTML();
      this.setupPassaportesRemoverEvents();
    }
  }

  /**
   * Associa os botões de exclusão de passaporte
   */
  private static setupPassaportesRemoverEvents(): void {
    if (!this.activeModal) return;
    this.activeModal.querySelectorAll('.modal-btn-remover-passaporte').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        if (!isNaN(idx) && idx >= 0) {
          this.syncPassaportesFromInputs();
          this.passaportesEdicao.splice(idx, 1);
          this.refreshPassaportesContainer();
        }
      });
    });
  }

  /**
   * Executa a gravação do cliente no Supabase
   */
  private static async salvarCliente(): Promise<void> {
    if (!this.currentClient || !this.currentClient.id || !this.activeModal) return;

    this.syncPassaportesFromInputs();

    const nomeVal = (this.activeModal.querySelector('#modal-cli-nome') as HTMLInputElement)?.value?.trim();
    const emailVal = (this.activeModal.querySelector('#modal-cli-email') as HTMLInputElement)?.value?.trim();
    const telefoneVal = getFormattedPhoneToDb('modal-cli-telefone');
    const documentoVal = (this.activeModal.querySelector('#modal-cli-documento') as HTMLInputElement)?.value?.trim();
    const dataNascRaw = (this.activeModal.querySelector('#modal-cli-data-nasc') as HTMLInputElement)?.value?.trim();
    const dataNascVal = dataNascRaw ? formatBrDateToIso(dataNascRaw) : null;
    const enderecoVal = (this.activeModal.querySelector('#modal-cli-endereco') as HTMLInputElement)?.value?.trim() || null;
    const origemLeadVal = (this.activeModal.querySelector('#modal-cli-origem-lead') as HTMLSelectElement)?.value;
    const obsVal = (this.activeModal.querySelector('#modal-cli-observacoes') as HTMLTextAreaElement)?.value?.trim() || null;

    if (!nomeVal) {
      this.notifyToast('O nome do cliente é obrigatório.', 'error');
      return;
    }

    if (!emailVal) {
      this.notifyToast('O e-mail do cliente é obrigatório.', 'error');
      return;
    }

    // Processamento de classificações/tags
    const existingClass = this.currentClient.classificacoes || [];
    const standardOrigens = ['WhatsApp', 'Instagram', 'Indicação', 'Google', 'Site', 'Loja', 'Outros'];
    const customTags = existingClass.filter(tag => !standardOrigens.includes(tag));
    const classificacoesVal = origemLeadVal ? [...customTags, origemLeadVal] : customTags;

    // Alerta de passaportes vencidos
    const passaportesVencidos = this.passaportesEdicao.filter(p => {
      if (!p.validade) return false;
      const iso = p.validade.includes('/') ? formatBrDateToIso(p.validade) : p.validade;
      if (!iso) return false;
      const d = new Date(iso);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < hoje.getTime();
    });

    if (passaportesVencidos.length > 0) {
      const nomes = passaportesVencidos.map(p => p.nome || 'Passageiro').join(', ');
      const confirmSave = await showCustomConfirm(
        `Atenção: O(s) passaporte(s) de [${nomes}] está(ão) com data de validade vencida. Deseja salvar mesmo assim?`,
        'Aviso de Passaporte Vencido'
      );
      if (!confirmSave) return;
    }

    // Processa passaportes
    const passaportesFormatados = this.passaportesEdicao
      .map(p => ({
        nome: p.nome.trim(),
        numero: p.numero.trim().toUpperCase(),
        validade: p.validade ? (p.validade.includes('/') ? formatBrDateToIso(p.validade) : p.validade) : ''
      }))
      .filter(p => p.nome || p.numero || p.validade);

    const titularPass = passaportesFormatados[0];

    const payload: any = {
      nome: nomeVal,
      email: emailVal,
      telefone: telefoneVal || null,
      documento: documentoVal || null,
      data_nascimento: dataNascVal,
      endereco: enderecoVal,
      passaporte_numero: titularPass?.numero || null,
      passaporte_validade: titularPass?.validade || null,
      passaportes: passaportesFormatados,
      observacoes: obsVal,
      classificacoes: classificacoesVal,
      updated_at: new Date().toISOString()
    };

    const btnSalvar = this.activeModal.querySelector('#modal-btn-salvar-cliente') as HTMLButtonElement;
    if (btnSalvar) {
      btnSalvar.disabled = true;
      btnSalvar.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Salvando...`;
    }

    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', this.currentClient.id)
        .select()
        .single();

      if (error) throw error;

      const clienteAtualizado: Cliente = {
        ...this.currentClient,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone || '',
        documento: data.documento || '',
        dataNascimento: data.data_nascimento ? formatIsoDateToBr(data.data_nascimento) : '',
        endereco: data.endereco || '',
        passaporteNumero: data.passaporte_numero || '',
        passaporteValidade: data.passaporte_validade ? formatIsoDateToBr(data.passaporte_validade) : '',
        passaportes: data.passaportes || [],
        observacoes: data.observacoes || '',
        classificacoes: data.classificacoes || [],
        updatedAt: data.updated_at
      };

      this.notifyToast('Cadastro do cliente atualizado com sucesso!', 'success');

      if (this.options.onSave) {
        this.options.onSave(clienteAtualizado);
      }

      this.fechar();

    } catch (err: any) {
      console.error('Erro ao salvar cliente no modal:', err);
      this.notifyToast('Erro ao salvar dados do cliente.', 'error', err);
      if (btnSalvar) {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = `<span>💾</span> Salvar Cadastro`;
      }
    }
  }

  /**
   * Notifica mensagem ao usuário via toast
   */
  private static notifyToast(msg: string, type: 'success' | 'error' | 'warning' = 'success', err?: any): void {
    if (this.options.showToast) {
      this.options.showToast(msg, type, err);
    } else {
      console.log(`[Toast ${type}]: ${msg}`);
    }
  }

  /**
   * Fecha o modal e remove elementos do DOM
   */
  public static fechar(): void {
    if (this.activeModal) {
      const container = this.activeModal.querySelector('#modal-container-cliente-detalhes');
      if (container) {
        container.classList.remove('scale-100');
        container.classList.add('scale-95');
      }
      this.activeModal.remove();
      this.activeModal = null;
    }

    this.activeCleanups.forEach(fn => {
      try { fn(); } catch (e) { console.error(e); }
    });
    this.activeCleanups = [];
    this.currentClient = null;
    this.passaportesEdicao = [];
  }
}
