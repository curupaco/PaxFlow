import { supabase, getSessaoAtual } from '../services/supabase';
import { PerfilConsultor, Reembolso } from '../types';
import { showCustomConfirm } from '../services/dialog';
import { renderHelpIcon } from '../utils/helpHelper';
import { highlightMatch, debounce } from '../utils/textHelper';
import { 
  formatStatusTratativa, 
  STATUS_TRATATIVA_DEFINITIONS, 
  calculateSaldoReembolso,
  prepareReembolsoStatusPayload,
  filterReembolsosByTerm 
} from '../controllers/reembolsosController';
import { renderCurrencyInputHTML, parseDoubleBr, formatCurrencyValue, setupFormValidation } from '../utils/masks';

// Injeta estilos premium e customizações para a Central de Reembolsos no DOM
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .table-row-hover:hover {
      background-color: rgba(248, 250, 252, 0.6) !important;
      transform: translateY(-0.5px);
    }
    .dark .table-row-hover:hover {
      background-color: rgba(15, 23, 42, 0.6) !important;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #475569;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #64748b;
    }
  `;
  document.head.appendChild(style);
}

export class ReembolsosPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private reembolsos: any[] = [];
  private timerId: any = null;
  private buscaTermo: string = '';
  private activeStatusTab: 'todos' | 'pendente_agencia' | 'pendente_fornecedor' | 'pendente_agaxtur' | 'concluido' = 'todos';
  private debouncedSearch: (termo: string) => void;
  private globalSearchListener: ((e: any) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.debouncedSearch = debounce((termo: string) => {
      this.buscaTermo = termo;
      this.render();
      this.iniciarSlaTimer();

      // Restaura o foco e coloca o cursor no final
      const input = document.getElementById('input-busca-reembolso') as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 300);
  }

  /**
   * Inicializa o painel de reembolsos: valida a sessão, busca registros e ativa o cronômetro SLA.
   */
  public async init(): Promise<void> {
    try {
      // 1. Validar autenticação e perfil
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }
      this.user = user;
      this.perfil = perfil;

      // 2. Buscar reembolsos
      await this.loadReembolsos();

      // 3. Renderizar a interface
      this.render();

      // 4. Iniciar o cronômetro SLA em tempo real
      this.iniciarSlaTimer();

      // 5. Configurar ouvintes de eventos da página
      this.setupEventListeners();

      // 6. Ouvinte de Busca Global (Header)
      if (!this.globalSearchListener) {
        this.globalSearchListener = (e: any) => {
          const termo = e.detail?.termo !== undefined ? e.detail.termo : '';
          this.aplicarBuscaGlobal(termo);
        };
        window.addEventListener('paxflow-global-search-submit', this.globalSearchListener);
      }

    } catch (err: any) {
      console.error('Erro na inicialização da Central de Reembolsos:', err);
      this.renderAuthError(`Erro interno: ${err.message}`);
    }
  }

  /**
   * Destrói instâncias ativas (limpa o cronômetro para evitar vazamento de memória)
   */
  public destroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.globalSearchListener) {
      window.removeEventListener('paxflow-global-search-submit', this.globalSearchListener);
      this.globalSearchListener = null;
    }
  }

  /**
   * Aplica termo de busca submetido via Caixa de Pesquisa Global
   */
  public aplicarBuscaGlobal(termo: string): void {
    this.buscaTermo = termo;
    this.render();
    const searchInput = document.getElementById('input-busca-reembolso') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = termo;
    }
  }

  /**
   * Busca todos os reembolsos fazendo a junção com as tabelas de Viagens, Clientes e Produtos
   */
  private async loadReembolsos(): Promise<void> {
    try {
      // Consulta com junções no Supabase
      const { data, error } = await supabase
        .from('reembolsos')
        .select(`
          *,
          viagem:viagens (
            *,
            cliente:clientes (*)
          ),
          produto:produtos_viagem (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rawData = data || [];

      // Filtro de segurança (RLS de software): Consultores normais só veem reembolsos de suas viagens ou solicitações
      if (this.perfil && this.perfil.role !== 'admin') {
        this.reembolsos = rawData.filter(r => {
          const rSolicitanteId = r.consultor_solicitante_id || (r as any).consultorSolicitanteId;
          const vConsultorId = r.viagem?.consultor_id || (r.viagem as any)?.consultorId;
          const vRespId = r.viagem?.consultor_responsavel_id || (r.viagem as any)?.consultorResponsavelId;
          return rSolicitanteId === this.user.id || vConsultorId === this.user.id || vRespId === this.user.id;
        });
      } else {
        this.reembolsos = rawData;
      }
    } catch (err: any) {
      console.error('Erro ao carregar reembolsos do servidor:', err.message);
      this.reembolsos = [];
      this.showToast('Erro de conexão ao carregar os reembolsos do servidor.', 'error');
    }
  }

  /**
   * Inicia o intervalo de 1 segundo para atualizar o cronômetro dos SLAs em tempo real na tela
   */
  private iniciarSlaTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.timerId = setInterval(() => {
      if (!this.container || !this.container.isConnected) {
        this.destroy();
        return;
      }
      const timers = this.container.querySelectorAll('.sla-active-timer');
      if (timers.length === 0) return;
      timers.forEach(el => {
        const createdAtStr = el.getAttribute('data-created-at');
        if (!createdAtStr) return;

        const diffString = this.calculateElapsedTime(createdAtStr);
        el.textContent = diffString;
      });
    }, 1000);
  }

  /**
   * Calcula o tempo decorrido formatado em dias, horas, minutos e segundos
   */
  private calculateElapsedTime(createdAtStr: string): string {
    const dataAbertura = new Date(createdAtStr);
    const agora = new Date();

    const diffMs = agora.getTime() - dataAbertura.getTime();
    if (diffMs < 0) return '0d 0h 0m 0s';

    const totalSegundos = Math.floor(diffMs / 1000);
    const dias = Math.floor(totalSegundos / 86400);
    const horas = Math.floor((totalSegundos % 86400) / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    return `${dias}d ${horas}h ${minutos}m ${segundos}s`;
  }

  /**
   * Associa os eventos gerais de interação direta na tabela
   */
  private setupEventListeners(): void {
    // Escuta alterações de status em todos os seletores dropdown da tabela
    const statusSelects = document.querySelectorAll('.select-status-reembolso');
    statusSelects.forEach(select => {
      select.addEventListener('change', async (e) => {
        const selectEl = e.target as HTMLSelectElement;
        const reembolsoId = selectEl.getAttribute('data-reembolso-id');
        const novoStatus = selectEl.value;

        if (!reembolsoId) return;

        try {
          const payload = prepareReembolsoStatusPayload(novoStatus);

          let { error } = await supabase
            .from('reembolsos')
            .update(payload)
            .eq('id', reembolsoId);

          // Fallback defensivo para schema drift caso a coluna status_tratativa não exista (42703)
          if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
            const fallbackPayload = {
              status: payload.status,
              data_resolucao: payload.data_resolucao,
              observacoes_financeiras: `[Status Tratativa]: ${payload.status_tratativa}`
            };
            const fallbackRes = await supabase.from('reembolsos').update(fallbackPayload).eq('id', reembolsoId);
            error = fallbackRes.error;
          }

          if (error) throw error;

          this.showToast('Status da tratativa atualizado com sucesso!', 'success');

          // Recarrega os dados e atualiza a exibição da tabela
          await this.loadReembolsos();
          this.render();
          this.iniciarSlaTimer();

        } catch (err: any) {
          console.error('Erro ao atualizar status do reembolso:', err);
          this.showToast('Falha ao atualizar o status no banco.', 'error', err);
          this.init();
        }
      });
    });

    // Escuta cliques nos botões de editar valores
    const editBtns = document.querySelectorAll('[data-edit-reembolso-id]');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        let target = e.target as HTMLElement;
        if (!target.hasAttribute('data-edit-reembolso-id')) {
          target = target.closest('[data-edit-reembolso-id]') as HTMLElement;
        }
        const reembolsoId = target?.getAttribute('data-edit-reembolso-id');
        if (reembolsoId) {
          const reembolso = this.reembolsos.find(r => r.id === reembolsoId);
          if (reembolso) {
            this.abrirModalEditarValores(reembolso);
          }
        }
      });
    });

    // Escuta cliques nos botões de excluir reembolso
    const deleteBtns = document.querySelectorAll('[data-delete-reembolso-id]');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        let target = e.target as HTMLElement;
        if (!target.hasAttribute('data-delete-reembolso-id')) {
          target = target.closest('[data-delete-reembolso-id]') as HTMLElement;
        }
        const reembolsoId = target?.getAttribute('data-delete-reembolso-id');
        if (reembolsoId) {
          await this.excluirReembolso(reembolsoId);
        }
      });
    });

    // Abas de Status com Contadores
    const tabBtns = document.querySelectorAll('.tab-reembolso-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-status-tab') as any;
        if (tab && this.activeStatusTab !== tab) {
          this.activeStatusTab = tab;
          this.render();
          this.iniciarSlaTimer();
        }
      });
    });

    // Campo de busca de reembolsos
    const searchInput = document.getElementById('input-busca-reembolso') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.debouncedSearch((e.target as HTMLInputElement).value);
    });
  }

  /**
   * Abre modal para edição completa de valores (Produto, Solicitado, Aprovado, Utilizado Pax) e Status da Tratativa
   */
  private abrirModalEditarValores(r: any): void {
    const modalId = 'modal-editar-valores-reembolso';
    document.getElementById(modalId)?.remove();

    const idFormatado = r.codigo_ref || r.codigoRef || `#RMB-${r.id.slice(0, 6).toUpperCase()}`;
    const valorProdutoAtual = Number(r.valor_produto || r.produto?.valor || r.produto?.valor_venda || 0);
    const valorSolicitadoAtual = Number(r.valor_solicitado || 0);
    const valorAprovadoAtual = Number(r.valor_aprovado || 0);
    const valorUtilizadoPaxAtual = Number(r.valor_utilizado_pax || 0);
    const tratativaAtual = formatStatusTratativa(r.status_tratativa || r.status).key;

    const modalEl = document.createElement('div');
    modalEl.id = modalId;
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

        this.showToast('Reembolso atualizado com sucesso!', 'success');
        fechar();
        await this.loadReembolsos();
        this.render();
        this.iniciarSlaTimer();

      } catch (err: any) {
        console.error('Erro ao salvar valores do reembolso:', err);
        this.showToast('Erro ao salvar alterações.', 'error', err);
      }
    });
  }

  /**
   * Deleta um processo de reembolso permanentemente (apenas Admins)
   */
  private async excluirReembolso(id: string): Promise<void> {
    const confirm = await showCustomConfirm(
      'Deseja realmente excluir permanentemente este processo de reembolso? Esta ação não pode ser desfeita.',
      'Excluir Reembolso'
    );
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('reembolsos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.showToast('Reembolso excluído com sucesso!', 'success');
      await this.loadReembolsos();
      this.render();
      this.iniciarSlaTimer();
    } catch (err: any) {
      console.error('Erro ao excluir reembolso:', err);
      this.showToast('Erro ao excluir reembolso.', 'error', err);
    }
  }

  /**
   * Exibe tela de carregamento (Skeleton loader)
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 p-8 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-semibold animate-pulse">Carregando central de reembolsos...</p>
      </div>
    `;
  }

  /**
   * Exibe tela de erro de autenticação ou carregamento
   */
  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-white border border-slate-100 p-8 rounded-2xl shadow-xl text-center">
          <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
          <h2 class="text-xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
          <p class="text-slate-500 text-sm mb-6">${msg}</p>
        </div>
      </div>
    `;
  }

  /**
   * Exibe mensagens flutuantes (Toasts)
   */
  private showToast(message: string, type: 'success' | 'error' = 'success', err?: any): void {
    let finalMessage = message;
    if (err) {
      const translator = (window as any).traduzirErro;
      const translated = translator ? translator(err) : (err.message || err);
      if (translated && !message.includes(translated)) {
        finalMessage = `${message} Detalhes: ${translated}`;
      }
    }
    const translatedMessage = (window as any).traduzirErro ? (window as any).traduzirErro(finalMessage) : finalMessage;
    const toastId = 'paxflow-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
    }`;
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${translatedMessage}`;

    const duration = isSuccess ? 3500 : 5500;
    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      }
    }, duration);
  }

  /**
   * Renderiza a página da central de reembolsos
   */
  private render(): void {
    // Cálculos de contagem por aba de status de tratativa
    const totalCount = this.reembolsos.length;
    const agenciaCount = this.reembolsos.filter(r => formatStatusTratativa(r.status_tratativa || r.status).key === 'pendente_agencia').length;
    const fornecedorCount = this.reembolsos.filter(r => formatStatusTratativa(r.status_tratativa || r.status).key === 'pendente_fornecedor').length;
    const agaxturCount = this.reembolsos.filter(r => formatStatusTratativa(r.status_tratativa || r.status).key === 'pendente_agaxtur').length;
    const concluidoCount = this.reembolsos.filter(r => formatStatusTratativa(r.status_tratativa || r.status).key === 'concluido').length;

    // Filtra por aba ativa
    let filtradosPorAba = this.reembolsos;
    if (this.activeStatusTab !== 'todos') {
      filtradosPorAba = this.reembolsos.filter(r => formatStatusTratativa(r.status_tratativa || r.status).key === this.activeStatusTab);
    }

    // Aplica busca multicritério
    const filtrados = filterReembolsosByTerm(filtradosPorAba, this.buscaTermo);

    // Cálculos de totais financeiros
    const totalReembolsos = this.reembolsos.length;
    const somaTotalSolicitado = this.reembolsos.reduce((acc, r) => acc + Number(r.valor_solicitado || 0), 0);
    const somaTotalAprovado = this.reembolsos.reduce((acc, r) => acc + Number(r.valor_aprovado || 0), 0);
    const somaTotalUtilizado = this.reembolsos.reduce((acc, r) => acc + Number(r.valor_utilizado_pax || 0), 0);

    const formatarData = (dStr: string) => {
      if (!dStr) return '';
      const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const parts = dataApenas.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const renderTabClass = (tabName: string) => {
      const isActive = this.activeStatusTab === tabName;
      if (isActive) {
        return 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black';
      }
      return 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-bold border border-slate-200 dark:border-slate-700';
    };

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 relative z-10 px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-auto object-contain md:hidden" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                Reembolsos ${renderHelpIcon('fluxo-reembolso-completo')}
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Controle de Cancelamentos, Acompanhamento Financeiro e Tratativas</p>
            </div>
          </div>
        </header>

        <main class="flex-1 p-6 flex flex-col gap-6">
          
          <!-- Cards de Métricas Premium -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center justify-between">
              <div>
                <span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total de Processos</span>
                <span class="text-2xl font-black text-slate-800 dark:text-slate-200">${totalReembolsos}</span>
              </div>
              <span class="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-500 dark:text-indigo-400 rounded-xl text-base font-extrabold flex items-center justify-center shrink-0">📋</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center justify-between">
              <div>
                <span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Pendente Ação Agência</span>
                <span class="text-2xl font-black text-amber-600 dark:text-amber-400">${agenciaCount}</span>
              </div>
              <span class="w-10 h-10 bg-amber-50 dark:bg-amber-950/45 text-amber-500 dark:text-amber-400 rounded-xl text-base font-extrabold flex items-center justify-center shrink-0">🏢</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center justify-between">
              <div>
                <span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Fornecedor / Agaxtur</span>
                <span class="text-2xl font-black text-blue-600 dark:text-blue-400">${fornecedorCount + agaxturCount}</span>
              </div>
              <span class="w-10 h-10 bg-blue-50 dark:bg-blue-950/45 text-blue-500 dark:text-blue-400 rounded-xl text-base font-extrabold flex items-center justify-center shrink-0">✈️</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center justify-between">
              <div>
                <span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Valor Aprovado Total</span>
                <span class="text-xl font-black text-emerald-600 dark:text-emerald-400">R$ ${somaTotalAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span class="block text-[9px] text-slate-400 font-semibold mt-0.5">Utilizado: R$ ${somaTotalUtilizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <span class="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-xl text-base font-extrabold flex items-center justify-center shrink-0">💰</span>
            </div>
          </div>

          <!-- Barra de Abas de Status e Busca -->
          <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            <!-- Abas Superiores com os 4 Status da Tratativa -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
              <button type="button" data-status-tab="todos" class="tab-reembolso-btn px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${renderTabClass('todos')}">
                <span>Todos</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black ${this.activeStatusTab === 'todos' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">${totalCount}</span>
              </button>

              <button type="button" data-status-tab="pendente_agencia" class="tab-reembolso-btn px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${renderTabClass('pendente_agencia')}">
                <span>🏢 Ação Agência</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black ${this.activeStatusTab === 'pendente_agencia' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'}">${agenciaCount}</span>
              </button>

              <button type="button" data-status-tab="pendente_fornecedor" class="tab-reembolso-btn px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${renderTabClass('pendente_fornecedor')}">
                <span>✈️ Ação Fornecedor</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black ${this.activeStatusTab === 'pendente_fornecedor' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'}">${fornecedorCount}</span>
              </button>

              <button type="button" data-status-tab="pendente_agaxtur" class="tab-reembolso-btn px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${renderTabClass('pendente_agaxtur')}">
                <span>🌐 Ação Agaxtur</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black ${this.activeStatusTab === 'pendente_agaxtur' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'}">${agaxturCount}</span>
              </button>

              <button type="button" data-status-tab="concluido" class="tab-reembolso-btn px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${renderTabClass('concluido')}">
                <span>✅ Concluídos</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black ${this.activeStatusTab === 'concluido' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'}">${concluidoCount}</span>
              </button>
            </div>

            <!-- Campo de Busca em Tempo Real -->
            <div class="relative w-full md:w-80 shrink-0">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input id="input-busca-reembolso" type="text" placeholder="Pesquisar viagem, ID, produto, cliente, status..." value="${this.buscaTermo}" class="h-10 w-full text-xs font-semibold pl-10 pr-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition flex items-center" />
            </div>

          </div>

          <!-- Tabela de Reembolsos -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
              <h2 class="text-sm font-black text-slate-700 dark:text-slate-300 tracking-wider uppercase flex items-center gap-1.5">Fila de Reembolsos e Tratativas ${renderHelpIcon('status-reembolso')}</h2>
              <span class="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold text-[10px] rounded border border-indigo-100 dark:border-indigo-900/40 uppercase tracking-wider">
                ${filtrados.length} de ${totalReembolsos} solicitações
              </span>
            </div>

            ${filtrados.length === 0 ? `
              <div class="p-12 text-center space-y-3">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 text-2xl flex items-center justify-center mx-auto shadow-xs border border-slate-200/50 dark:border-slate-700/50">
                  💸
                </div>
                <h3 class="text-sm font-extrabold text-slate-700 dark:text-slate-300">Nenhum reembolso encontrado</h3>
                <p class="text-xs text-slate-400 dark:text-slate-400 font-medium max-w-sm mx-auto">Não encontramos nenhuma solicitação correspondente ao termo ou filtro selecionado.</p>
              </div>
            ` : `
              <!-- Mobile View: Cards -->
              <div class="block md:hidden p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                ${filtrados.map(r => this.renderMobileCard(r)).join('')}
              </div>

              <!-- Desktop View: Table -->
              <div class="hidden md:block overflow-x-auto custom-scrollbar">
                <table class="w-full text-left border-collapse">
                  <thead class="sticky top-0 z-20 backdrop-blur-md">
                    <tr class="bg-slate-50/90 dark:bg-slate-800/90 text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th class="py-3 px-4">ID Reembolso</th>
                      <th class="py-3 px-4">Viagem / Localizador</th>
                      <th class="py-3 px-4">Passageiro</th>
                      <th class="py-3 px-4">Produto</th>
                      <th class="py-3 px-4">Valor Produto</th>
                      <th class="py-3 px-4">Valores (Sol. / Aprov. / Util.)</th>
                      <th class="py-3 px-4">SLA Cronômetro</th>
                      <th class="py-3 px-4 text-center whitespace-nowrap">Status da Tratativa</th>
                      <th class="py-3 px-4 text-center whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold bg-white/50 dark:bg-slate-900/30">
                    ${filtrados.map(r => {
                      const idReembolsoCurto = r.codigo_ref || r.codigoRef || `#RMB-${r.id.slice(0, 6).toUpperCase()}`;
                      const dataAberturaStr = r.created_at || r.created_at_time;
                      const tratativaInfo = formatStatusTratativa(r.status_tratativa || r.status);
                      const isConcluido = tratativaInfo.key === 'concluido';

                      const valorProduto = Number(r.valor_produto || r.produto?.valor || r.produto?.valor_venda || 0);
                      const valorSol = Number(r.valor_solicitado || 0);
                      const valorAprov = Number(r.valor_aprovado || 0);
                      const valorUtil = Number(r.valor_utilizado_pax || 0);
                      const saldo = calculateSaldoReembolso(valorAprov, valorUtil);

                      return `
                        <tr class="table-row-hover transition duration-150">
                          <!-- ID Reembolso -->
                          <td class="py-3 px-4 whitespace-nowrap">
                            <span class="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-black text-xs rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                              ${highlightMatch(idReembolsoCurto, this.buscaTermo)}
                            </span>
                          </td>

                          <!-- Viagem / Localizador -->
                          <td class="py-3 px-4 whitespace-nowrap">
                            <span class="block text-slate-800 dark:text-slate-100 font-bold">✈️ ${highlightMatch(r.viagem?.destino || 'Sem Destino', this.buscaTermo)}</span>
                            <div class="flex items-center gap-1.5 mt-0.5">
                              ${(r.viagem?.codigo_ref || r.viagem?.codigoRef) ? `
                                <span class="inline-block px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 font-mono font-bold text-[9px] rounded uppercase border border-indigo-200/40 dark:border-indigo-850">
                                  ${highlightMatch(r.viagem?.codigo_ref || r.viagem?.codigoRef, this.buscaTermo)}
                                </span>
                              ` : ''}
                              <span class="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[9px] rounded uppercase border border-slate-200/50 dark:border-slate-800">
                                LOC: ${highlightMatch(r.viagem?.codigo_localizador || 'S/ LOC', this.buscaTermo)}
                              </span>
                            </div>
                          </td>

                          <!-- Passageiro -->
                          <td class="py-3 px-4 whitespace-nowrap">
                            <span class="block text-slate-800 dark:text-slate-100 font-bold">
                              ${highlightMatch(r.viagem?.cliente?.nome || 'Cliente Desconhecido', this.buscaTermo)}
                            </span>
                            <span class="block text-[10px] text-slate-400 font-semibold">${r.viagem?.cliente?.email || 'Sem e-mail'}</span>
                          </td>
                          
                          <!-- Produto -->
                          <td class="py-3 px-4">
                            <span class="block text-slate-700 dark:text-slate-200 font-bold">[${(r.produto?.tipo || 'outro').toUpperCase()}] ${highlightMatch(r.produto?.fornecedor || '', this.buscaTermo)}</span>
                            <span class="block text-[11px] text-slate-400 font-medium truncate max-w-[160px]" title="${r.produto?.descricao || ''}">${highlightMatch(r.produto?.descricao || 'Sem descrição', this.buscaTermo)}</span>
                          </td>

                          <!-- Valor do Produto -->
                          <td class="py-3 px-4 whitespace-nowrap">
                            <span class="text-slate-700 dark:text-slate-300 font-mono font-bold">
                              R$ ${valorProduto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>

                          <!-- Valores: Solicitado / Aprovado / Utilizado -->
                          <td class="py-3 px-4 whitespace-nowrap">
                            <div class="space-y-0.5 text-[11px]">
                              <div class="flex items-center gap-1.5">
                                <span class="text-[9px] font-bold uppercase text-slate-400">Sol:</span>
                                <strong class="text-indigo-600 dark:text-indigo-400 font-mono">R$ ${valorSol.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                              </div>
                              <div class="flex items-center gap-1.5">
                                <span class="text-[9px] font-bold uppercase text-slate-400">Apr:</span>
                                <strong class="text-emerald-600 dark:text-emerald-400 font-mono">R$ ${valorAprov.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                              </div>
                              <div class="flex items-center gap-1.5">
                                <span class="text-[9px] font-bold uppercase text-slate-400">Pax:</span>
                                <strong class="text-purple-600 dark:text-purple-400 font-mono">R$ ${valorUtil.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                ${saldo > 0 ? `<span class="text-[9px] px-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded font-black border border-amber-200/50">Saldo: R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>` : ''}
                              </div>
                            </div>
                          </td>

                          <!-- SLA Cronômetro -->
                          <td class="py-3 px-4 whitespace-nowrap">
                            ${isConcluido ? `
                              <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                                ✅ Concluído em ${formatarData(r.data_resolucao)}
                              </span>
                            ` : `
                              <span class="sla-active-timer text-xs font-black font-mono tabular-nums text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 px-2.5 py-1 rounded-lg inline-flex items-center" data-created-at="${dataAberturaStr}">
                                Calculando...
                              </span>
                            `}
                          </td>

                          <!-- Status da Tratativa -->
                          <td class="py-3 px-4 text-center whitespace-nowrap">
                            <select data-reembolso-id="${r.id}" class="select-status-reembolso h-8 px-2.5 py-1 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs">
                              <option value="pendente_agencia" ${tratativaInfo.key === 'pendente_agencia' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🏢 Reembolso pendente ação agência</option>
                              <option value="pendente_fornecedor" ${tratativaInfo.key === 'pendente_fornecedor' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">✈️ Reembolso pendente ação fornecedor</option>
                              <option value="pendente_agaxtur" ${tratativaInfo.key === 'pendente_agaxtur' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🌐 Reembolso pendente ação Agaxtur</option>
                              <option value="concluido" ${tratativaInfo.key === 'concluido' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">✅ Reembolso concluido</option>
                            </select>
                          </td>

                          <!-- Ações -->
                          <td class="py-3 px-4 text-center whitespace-nowrap">
                            <div class="inline-flex items-center justify-center gap-1.5">
                              <button data-edit-reembolso-id="${r.id}" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-200/80 dark:border-indigo-800/60 transition text-xs font-bold shadow-xs cursor-pointer" title="Editar Valores e Detalhes">
                                ✏️ Valores
                              </button>
                              ${this.perfil?.role === 'admin' ? `
                                <button data-delete-reembolso-id="${r.id}" class="h-7 w-7 inline-flex items-center justify-center bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg border border-slate-200/60 dark:border-slate-700/60 transition text-xs shadow-xs cursor-pointer" title="Excluir Reembolso">
                                  🗑️
                                </button>
                              ` : ''}
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </main>
      </div>
    `;

    // Re-associa ouvintes após renderização
    this.setupEventListeners();
  }

  /**
   * Renderiza um card individual de reembolso para exibição em dispositivos móveis
   */
  private renderMobileCard(r: any): string {
    const idReembolsoCurto = r.codigo_ref || r.codigoRef || `#RMB-${r.id.slice(0, 6).toUpperCase()}`;
    const tratativaInfo = formatStatusTratativa(r.status_tratativa || r.status);
    const isConcluido = tratativaInfo.key === 'concluido';
    const dataAberturaStr = r.created_at || r.created_at_time;
    
    const valorProduto = Number(r.valor_produto || r.produto?.valor || r.produto?.valor_venda || 0);
    const valorSol = Number(r.valor_solicitado || 0);
    const valorAprov = Number(r.valor_aprovado || 0);
    const valorUtil = Number(r.valor_utilizado_pax || 0);
    const saldo = calculateSaldoReembolso(valorAprov, valorUtil);

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5">
        <!-- Header: Client & ID Info -->
        <div class="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
          <div class="space-y-1">
            <span class="inline-block px-1.5 py-0.5 rounded font-mono text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40">
              ${idReembolsoCurto}
            </span>
            <span class="block text-slate-800 dark:text-slate-200 font-bold">
              ${highlightMatch(r.viagem?.cliente?.nome || 'Cliente Desconhecido', this.buscaTermo)}
            </span>
            <span class="block text-[10px] text-slate-400 font-semibold">${r.viagem?.cliente?.email || 'Sem e-mail'}</span>
          </div>
          <div>
            <span class="inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${tratativaInfo.badgeClass}">
              ${tratativaInfo.icon} ${tratativaInfo.label}
            </span>
          </div>
        </div>

        <!-- Body: Travel + Product details -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="space-y-1">
            <span class="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Viagem & LOC</span>
            <span class="block text-slate-800 dark:text-slate-200 font-bold">✈️ ${highlightMatch(r.viagem?.destino || 'Sem Destino', this.buscaTermo)}</span>
            <div class="flex items-center gap-1 mt-0.5">
              ${(r.viagem?.codigo_ref || r.viagem?.codigoRef) ? `
                <span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[9px] rounded uppercase border border-indigo-200/40">
                  ${r.viagem?.codigo_ref || r.viagem?.codigoRef}
                </span>
              ` : ''}
              <span class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-extrabold text-[9px] rounded uppercase">
                LOC: ${r.viagem?.codigo_localizador || 'S/ LOC'}
              </span>
            </div>
          </div>
          <div class="space-y-1">
            <span class="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Produto</span>
            <span class="block text-slate-700 dark:text-slate-300 font-bold">[${(r.produto?.tipo || 'outro').toUpperCase()}] ${r.produto?.fornecedor || ''}</span>
            <span class="block text-[10px] text-slate-400 truncate">${r.produto?.descricao || 'Sem descrição'}</span>
          </div>
        </div>

        <!-- Row: Financial tracking -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span class="block text-[8px] font-black text-slate-400 uppercase">Valor Produto</span>
            <strong class="text-slate-700 dark:text-slate-300 font-mono text-xs">R$ ${valorProduto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div>
            <span class="block text-[8px] font-black text-slate-400 uppercase">Solicitado</span>
            <strong class="text-indigo-600 dark:text-indigo-400 font-mono text-xs">R$ ${valorSol.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div>
            <span class="block text-[8px] font-black text-slate-400 uppercase">Aprovado</span>
            <strong class="text-emerald-600 dark:text-emerald-400 font-mono text-xs">R$ ${valorAprov.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div>
            <span class="block text-[8px] font-black text-slate-400 uppercase">Utilizado Pax</span>
            <strong class="text-purple-600 dark:text-purple-400 font-mono text-xs">R$ ${valorUtil.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <!-- Action Section -->
        <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button data-edit-reembolso-id="${r.id}" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-200/80 transition">
            ✏️ Editar Valores
          </button>
          ${this.perfil?.role === 'admin' ? `
            <button data-delete-reembolso-id="${r.id}" class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 transition text-xs" title="Excluir Reembolso">
              🗑️
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
}
export default ReembolsosPage;
