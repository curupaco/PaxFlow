import Sortable from 'sortablejs';
import { supabase, getSessaoAtual, logoutConsultor } from '../services/supabase';
import { Viagem, Cliente, ProdutoViagem, GlobalSettings, PerfilConsultor } from '../types';

// Injeta estilos premium e animações micro-interativas para SLAs diretamente no DOM
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes borderPulseRed {
      0%, 100% { border-color: #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.4); }
      50% { border-color: #fca5a5; box-shadow: 0 0 2px rgba(239, 68, 68, 0.1); }
    }
    @keyframes borderPulseOrange {
      0%, 100% { border-color: #f97316; box-shadow: 0 0 12px rgba(249, 115, 22, 0.4); }
      50% { border-color: #fdba74; box-shadow: 0 0 2px rgba(249, 115, 22, 0.1); }
    }
    .animate-sla-urgent {
      animation: borderPulseRed 2s infinite ease-in-out;
      border-width: 2px !important;
    }
    .animate-sla-warning {
      animation: borderPulseOrange 2s infinite ease-in-out;
      border-width: 2px !important;
    }
    .kanban-ghost-class {
      opacity: 0.35;
      background-color: rgba(226, 232, 240, 0.8) !important;
      border: 2px dashed #94a3b8 !important;
    }
    .kanban-drag-class {
      transform: rotate(1.5deg) scale(1.02);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
      cursor: grabbing !important;
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
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `;
  document.head.appendChild(style);
}

export class Dashboard {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private settings: GlobalSettings = {
    id: '',
    agencyName: 'PaxFlow CRM',
    taxaCancelamentoPadrao: 0,
    prazoReembolsoDias: 3,
    notificacoesAtivas: true,
    emailSuporte: 'suporte@paxflow.com.br'
  };
  
  // Parâmetros de SLA padrão (caso não existam no banco)
  private slaPreEmbarqueDias: number = 7;
  private slaPosViagemDias: number = 3;

  private viagens: any[] = [];
  private sortables: Sortable[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa o painel operacional: valida autenticação, busca SLAs e dados, e renderiza o quadro.
   */
  public async init(): Promise<void> {
    this.renderLoading();

    try {
      // 1. Validar autenticação e perfil
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Por favor, faça o login.');
        return;
      }
      this.user = user;
      this.perfil = perfil;

      // 2. Carregar configurações globais de SLA
      await this.loadGlobalSettings();

      // 3. Buscar viagens
      await this.loadViagens();

      // 4. Renderizar interface completa
      this.render();

      // 5. Configurar Drag & Drop com SortableJS
      this.setupDragAndDrop();

    } catch (err: any) {
      console.error('Erro na inicialização do Dashboard:', err);
      this.renderAuthError(`Ocorreu um erro interno: ${err.message}`);
    }
  }

  /**
   * Busca as configurações globais de SLA
   */
  private async loadGlobalSettings(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar global_settings (usando SLAs padrão):', error.message);
        return;
      }

      if (data) {
        this.settings = data as GlobalSettings;
        // Mapeia colunas específicas se presentes no banco de dados
        if (data.sla_pre_embarque_dias !== undefined) {
          this.slaPreEmbarqueDias = Number(data.sla_pre_embarque_dias);
        }
        if (data.sla_pos_viagem_dias !== undefined) {
          this.slaPosViagemDias = Number(data.sla_pos_viagem_dias);
        }
      }
    } catch (err) {
      console.error('Falha ao carregar configurações de SLA:', err);
    }
  }

  /**
   * Busca as viagens e realiza o filtro baseado no cargo (Role) do consultor logado
   */
  private async loadViagens(): Promise<void> {
    try {
      // Junção com a tabela de clientes e reembolsos para obter informações completas
      let query = supabase
        .from('viagens')
        .select('*, cliente:clientes(*), reembolsos(*)');

      // Regra de Exibição: Consultores normais só veem seus próprios cards; admins veem todos.
      if (this.perfil && this.perfil.role !== 'admin') {
        query = query.eq('consultor_id', this.user.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      this.viagens = data || [];
    } catch (err: any) {
      console.error('Erro ao carregar viagens:', err.message);
      this.viagens = [];
    }
  }

  /**
   * Calcula o status do SLA para uma determinada viagem
   */
  private checkSLA(viagem: any): { alert: boolean; type: 'pre-embarque' | 'pos-viagem' | null; text: string } {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Regra de SLA para "Pré-Embarque"
    if (viagem.status === 'pre_embarque' && viagem.data_ida) {
      const dataIda = new Date(viagem.data_ida);
      dataIda.setHours(0, 0, 0, 0);

      const diferencaTempo = dataIda.getTime() - hoje.getTime();
      const diasParaEmbarque = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

      if (diasParaEmbarque >= 0 && diasParaEmbarque <= this.slaPreEmbarqueDias) {
        return {
          alert: true,
          type: 'pre-embarque',
          text: `⚠️ Embarque em ${diasParaEmbarque} ${diasParaEmbarque === 1 ? 'dia' : 'dias'}!`
        };
      }
    }

    // Regra de SLA para "Pós-Viagem" (contato obrigatório pós-retorno dentro do prazo de SLA)
    if (viagem.status === 'pos_viagem' && viagem.data_volta) {
      const dataVolta = new Date(viagem.data_volta);
      dataVolta.setHours(0, 0, 0, 0);

      const diferencaTempo = hoje.getTime() - dataVolta.getTime();
      const diasDesdeRetorno = Math.floor(diferencaTempo / (1000 * 60 * 60 * 24));

      if (diasDesdeRetorno >= this.slaPosViagemDias) {
        return {
          alert: true,
          type: 'pos-viagem',
          text: `🚨 SLA Excedido! ${diasDesdeRetorno} dias sem pós-contato.`
        };
      }
    }

    return { alert: false, type: null, text: '' };
  }

  /**
   * Configura o Drag & Drop em cada coluna utilizando SortableJS
   */
  private setupDragAndDrop(): void {
    // Destrói instâncias antigas se houver
    this.sortables.forEach(s => s.destroy());
    this.sortables = [];

    const colunas = ['fechado', 'pos_venda', 'pre_embarque', 'pos_viagem', 'reembolso_solicitado'];

    colunas.forEach(status => {
      const colEl = document.getElementById(`col-${status}`);
      if (!colEl) return;

      const sortable = new Sortable(colEl, {
        group: 'kanban',
        animation: 200,
        ghostClass: 'kanban-ghost-class',
        dragClass: 'kanban-drag-class',
        fallbackTolerance: 3,
        // Handler executado ao soltar o card
        onEnd: async (evt) => {
          const cardEl = evt.item;
          const tripId = cardEl.dataset.tripId;
          const newStatus = evt.to.dataset.status;
          const oldStatus = evt.from.dataset.status;

          if (!tripId || !newStatus || !oldStatus) return;

          // Se nenhuma mudança de coluna ocorreu, não faz nada
          if (newStatus === oldStatus) return;

          // Regra Especial: Se mover para "Reembolso Solicitado", abre o modal
          if (newStatus === 'reembolso_solicitado') {
            this.openRefundModal(tripId, oldStatus);
          } else {
            // Atualização padrão de status no Supabase
            try {
              const { error } = await supabase
                .from('viagens')
                .update({ status: newStatus })
                .eq('id', tripId);

              if (error) throw error;

              // Atualiza o dado localmente e re-renderiza contadores rápidos
              const viagem = this.viagens.find(v => v.id === tripId);
              if (viagem) viagem.status = newStatus;

              this.showToast('Status da viagem atualizado com sucesso!', 'success');
              this.init(); // Recarrega para recalcular SLAs e reorganizar
            } catch (err: any) {
              console.error('Erro ao atualizar status:', err);
              this.showToast('Erro ao atualizar status da viagem.', 'error');
              this.init(); // Recarrega para voltar o card à coluna antiga na UI
            }
          }
        }
      });

      this.sortables.push(sortable);
    });
  }

  /**
   * Abre o Modal Dinâmico para solicitação de reembolso de um produto
   */
  private async openRefundModal(tripId: string, oldStatus: string): Promise<void> {
    this.renderModalOverlay();

    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent) return;

    try {
      // Busca os produtos vinculados à viagem
      const { data: produtos, error } = await supabase
        .from('produtos_viagem')
        .select('*')
        .eq('viagem_id', tripId);

      if (error) throw error;

      if (!produtos || produtos.length === 0) {
        modalContent.innerHTML = `
          <div class="p-6 text-center">
            <div class="text-amber-500 text-4xl mb-3">⚠️</div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">Nenhum produto cadastrado</h3>
            <p class="text-sm text-slate-500 mb-6">Esta viagem não possui produtos/serviços vinculados para reembolso.</p>
            <button id="btn-cancel-modal" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition">
              Voltar
            </button>
          </div>
        `;
        document.getElementById('btn-cancel-modal')?.addEventListener('click', () => {
          this.closeModal();
          this.init(); // Restaura o Kanban
        });
        return;
      }

      // Renderiza o formulário de reembolso no modal
      modalContent.innerHTML = `
        <div class="p-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span class="p-2 bg-rose-50 text-rose-500 rounded-lg text-lg">💸</span>
              Solicitar Reembolso / Cancelamento
            </h3>
            <button id="btn-close-x" class="text-slate-400 hover:text-slate-600 transition text-lg">&times;</button>
          </div>
          
          <form id="form-reembolso" class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Selecione o Produto a Cancelar *</label>
              <select id="select-produto" required class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white text-slate-800 font-medium">
                <option value="" disabled selected>Escolha um produto da viagem...</option>
                ${produtos.map(p => `
                  <option value="${p.id}" data-valor="${p.valor_venda}">
                    [${p.tipo.toUpperCase()}] ${p.fornecedor} - ${p.descricao} (Venda: R$ ${p.valor_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Valor do Reembolso Solicitado (R$) *</label>
              <div class="relative">
                <span class="absolute left-3.5 top-2.5 text-slate-400 font-medium">R$</span>
                <input id="input-valor-reembolso" type="number" step="0.01" min="0" required placeholder="0,00" class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800 font-semibold" />
              </div>
              <p class="text-xs text-slate-400 mt-1.5">Sugerido por padrão o valor integral de venda do produto.</p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Motivo do Cancelamento / Justificativa *</label>
              <textarea id="textarea-motivo" required placeholder="Descreva de forma detalhada o motivo do cancelamento solicitado..." rows="3" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800 text-sm"></textarea>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Status Inicial do Reembolso</label>
              <input type="text" value="Aguardando Fornecedor" disabled class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-semibold" />
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
              <button id="btn-cancel-form" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition">
                Cancelar
              </button>
              <button type="submit" class="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg shadow-lg shadow-rose-500/20 transition">
                Confirmar Solicitação
              </button>
            </div>
          </form>
        </div>
      `;

      // Auto-preenche o valor do reembolso quando um produto é selecionado
      const selectProd = document.getElementById('select-produto') as HTMLSelectElement;
      const inputValor = document.getElementById('input-valor-reembolso') as HTMLInputElement;
      
      selectProd?.addEventListener('change', () => {
        const option = selectProd.options[selectProd.selectedIndex];
        const valorVenda = option.getAttribute('data-valor');
        if (valorVenda) {
          inputValor.value = parseFloat(valorVenda).toFixed(2);
        }
      });

      // Fechamento e cancelamento
      const handleCancel = () => {
        this.closeModal();
        this.init(); // Recarrega o Kanban restaurando o card para a coluna de origem
      };
      
      document.getElementById('btn-close-x')?.addEventListener('click', handleCancel);
      document.getElementById('btn-cancel-form')?.addEventListener('click', handleCancel);

      // Tratamento do envio do formulário
      const form = document.getElementById('form-reembolso') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedProdId = selectProd.value;
        const valorReembolso = parseFloat(inputValor.value);
        const motivo = (document.getElementById('textarea-motivo') as HTMLTextAreaElement).value;

        if (!selectedProdId || isNaN(valorReembolso) || !motivo) {
          this.showToast('Preencha todos os campos obrigatórios.', 'error');
          return;
        }

        try {
          // 1. Criar a solicitação na tabela 'reembolsos'
          const { error: errorReembolso } = await supabase
            .from('reembolsos')
            .insert({
              viagem_id: tripId,
              produto_viagem_id: selectedProdId,
              consultor_solicitante_id: this.user.id,
              valor_solicitado: valorReembolso,
              motivo_cancelamento: motivo,
              status: 'Aguardando Fornecedor',
              data_solicitacao: new Date().toISOString().split('T')[0]
            });

          if (errorReembolso) throw errorReembolso;

          // 2. Atualizar o status da Viagem para 'reembolso_solicitado'
          const { error: errorViagem } = await supabase
            .from('viagens')
            .update({ status: 'reembolso_solicitado' })
            .eq('id', tripId);

          if (errorViagem) throw errorViagem;

          // 3. Atualizar o status do Produto para 'cancelado' ou 'reembolsado'
          const { error: errorProd } = await supabase
            .from('produtos_viagem')
            .update({ status: 'reembolsado' })
            .eq('id', selectedProdId);

          if (errorProd) throw errorProd;

          this.showToast('Reembolso solicitado e cadastrado com sucesso!', 'success');
          this.closeModal();
          this.init(); // Recarrega o quadro atualizado
        } catch (err: any) {
          console.error('Erro ao processar reembolso:', err);
          this.showToast('Erro interno ao processar solicitação de reembolso.', 'error');
        }
      });

    } catch (err: any) {
      console.error('Erro ao abrir modal:', err);
      this.closeModal();
      this.init();
    }
  }

  /**
   * Exibe uma caixa flutuante de carregamento (Skeleton loader)
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 p-8 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-semibold animate-pulse">Carregando painel operacional da agência...</p>
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
          <h2 class="text-xl font-bold text-slate-800 mb-2">Erro de Autenticação</h2>
          <p class="text-slate-500 text-sm mb-6">${msg}</p>
          <button id="btn-login-redirect" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition">
            Ir para Login
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('btn-login-redirect')?.addEventListener('click', () => {
      // Caso haja fluxo de navegação, redirecionar para a home
      window.location.reload();
    });
  }

  /**
   * Cria o overlay estrutural do modal se ele ainda não existir e abre a exibição
   */
  private renderModalOverlay(): void {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300';
      overlay.innerHTML = `
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100 transform scale-95 transition-all duration-300" id="modal-container">
          <div id="modal-content-container"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    
    // Anima a abertura
    setTimeout(() => {
      overlay?.classList.add('opacity-100', 'pointer-events-auto');
      const container = document.getElementById('modal-container');
      container?.classList.remove('scale-95');
      container?.classList.add('scale-100');
    }, 10);
  }

  /**
   * Fecha o modal com transição suave
   */
  private closeModal(): void {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    if (overlay && container) {
      container.classList.remove('scale-100');
      container.classList.add('scale-95');
      overlay.classList.remove('opacity-100', 'pointer-events-auto');
      overlay.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  /**
   * Exibe mensagens flutuantes (Toasts)
   */
  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const toastId = 'paxflow-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
    }`;
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${message}`;

    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      }
    }, 3500);
  }

  /**
   * Renderiza a interface do Dashboard principal
   */
  private render(): void {
    // Separa as viagens por colunas baseadas no status
    const colunasMap: { [key: string]: any[] } = {
      fechado: [],
      pos_venda: [],
      pre_embarque: [],
      pos_viagem: [],
      reembolso_solicitado: []
    };

    this.viagens.forEach(v => {
      if (colunasMap[v.status] !== undefined) {
        colunasMap[v.status].push(v);
      } else {
        // Fallback caso status não coincida
        colunasMap.fechado.push(v);
      }
    });

    // Conta alertas de SLA ativos para exibir no cabeçalho
    let totalSlaAlerts = 0;
    this.viagens.forEach(v => {
      if (this.checkSLA(v).alert) totalSlaAlerts++;
    });

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 flex flex-col font-sans">
        
        <!-- CABEÇALHO DO OPERACIONAL -->
        <header class="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="p-3 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-2xl text-2xl font-black shadow-lg shadow-indigo-500/30">PF</span>
            <div>
              <h1 class="text-2xl font-black text-slate-800 tracking-tight">${this.settings.agencyName}</h1>
              <p class="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span>Painel Operacional</span> &bull; 
                <span class="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold uppercase tracking-wider text-[10px]">${this.perfil?.role || 'consultor'}</span>
              </p>
            </div>
          </div>
          
          <div class="flex flex-wrap items-center gap-4">
            <!-- Stats Rápidos -->
            <div class="flex items-center gap-2 bg-slate-100/60 p-1.5 rounded-xl border border-slate-200/30">
              <div class="px-3.5 py-1.5 text-center">
                <span class="block text-xs text-slate-400 font-bold uppercase tracking-wider">Viagens</span>
                <span class="text-sm font-black text-slate-700">${this.viagens.length}</span>
              </div>
              <div class="w-px h-6 bg-slate-200"></div>
              <div class="px-3.5 py-1.5 text-center">
                <span class="block text-xs text-slate-400 font-bold uppercase tracking-wider">SLAs Ativos</span>
                <span class="text-sm font-black ${totalSlaAlerts > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}">${totalSlaAlerts}</span>
              </div>
            </div>

            <!-- Identidade do Consultor Logado -->
            <div class="flex items-center gap-3 pl-2">
              <div class="text-right hidden sm:block">
                <span class="block text-sm font-extrabold text-slate-700">${this.perfil?.nome || 'Consultor'}</span>
                <span class="block text-xs text-slate-400">${this.perfil?.email || this.user.email}</span>
              </div>
              <div class="w-10 h-10 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center border border-indigo-100">
                ${(this.perfil?.nome || 'C').substring(0, 2).toUpperCase()}
              </div>
              <button id="btn-logout" title="Sair do Sistema" class="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition border border-slate-200/40">
                🚪
              </button>
            </div>
          </div>
        </header>

        <!-- QUADRO KANBAN OPERACIONAL -->
        <main class="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
          
          <!-- Grid de Colunas Kanban -->
          <div class="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-5 items-start overflow-x-auto pb-4 custom-scrollbar">
            
            <!-- Coluna: Fechado -->
            ${this.renderColuna('Fechado', 'fechado', colunasMap.fechado, 'border-t-emerald-500 bg-emerald-500/5', 'bg-emerald-500')}

            <!-- Coluna: Pós-Venda -->
            ${this.renderColuna('Pós-Venda', 'pos_venda', colunasMap.pos_venda, 'border-t-indigo-500 bg-indigo-500/5', 'bg-indigo-500')}

            <!-- Coluna: Pré-Embarque -->
            ${this.renderColuna('Pré-Embarque', 'pre_embarque', colunasMap.pre_embarque, 'border-t-amber-500 bg-amber-500/5', 'bg-amber-500')}

            <!-- Coluna: Pós-Viagem -->
            ${this.renderColuna('Pós-Viagem', 'pos_viagem', colunasMap.pos_viagem, 'border-t-violet-500 bg-violet-500/5', 'bg-violet-500')}

            <!-- Coluna: Reembolso Solicitado -->
            ${this.renderColuna('Reembolso Solicitado', 'reembolso_solicitado', colunasMap.reembolso_solicitado, 'border-t-rose-500 bg-rose-500/5', 'bg-rose-500')}

          </div>
        </main>
      </div>
    `;

    // Evento de Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      if (confirm('Deseja realmente sair do sistema?')) {
        await logoutConsultor();
        window.location.reload();
      }
    });
  }

  /**
   * Renderiza a estrutura HTML de uma coluna do Kanban
   */
  private renderColuna(titulo: string, status: string, items: any[], styleBorders: string, styleBadge: string): string {
    return `
      <div class="flex flex-col min-w-[280px] h-[calc(100vh-200px)] bg-white border border-slate-200/80 rounded-2xl shadow-sm border-t-4 ${styleBorders}">
        <!-- Header da Coluna -->
        <div class="px-4 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <h3 class="text-sm font-black text-slate-700 tracking-tight uppercase">${titulo}</h3>
          <span class="px-2 py-0.5 text-xs text-white font-bold rounded-full ${styleBadge}">${items.length}</span>
        </div>

        <!-- Lista de Cards (Sortable area) -->
        <div id="col-${status}" data-status="${status}" class="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar min-h-[150px]">
          ${items.length === 0 ? `
            <div class="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center p-4 text-center">
              <span class="text-xs text-slate-400 font-medium">Solte viagens aqui</span>
            </div>
          ` : items.map(v => this.renderCard(v)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza a estrutura HTML de um card de viagem individual
   */
  private renderCard(v: any): string {
    // Verifica se há algum reembolso concluído (status === 'pago')
    const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r: any) => r.status === 'pago');
    
    const sla = reembolsoConcluido ? { alert: false, type: null, text: '' } : this.checkSLA(v);
    
    // Classes CSS dinâmicas baseadas nos alertas de SLA ou reembolso finalizado
    let cardClasses = 'bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group';
    
    if (reembolsoConcluido) {
      cardClasses = 'bg-emerald-50/30 border border-emerald-500/80 shadow-emerald-500/10 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group';
    } else if (sla.alert) {
      if (sla.type === 'pre-embarque') {
        cardClasses += ' animate-sla-urgent';
      } else if (sla.type === 'pos-viagem') {
        cardClasses += ' animate-sla-warning';
      }
    }

    // Formatações de datas
    const formatarData = (dStr: string) => {
      if (!dStr) return '';
      const parts = dStr.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    return `
      <div class="${cardClasses}" data-trip-id="${v.id}">
        
        <!-- Linha do Localizador & Preço -->
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <span class="px-2 py-0.5 bg-slate-100 text-slate-600 font-extrabold text-[10px] rounded tracking-wider border border-slate-200/55 uppercase">
            ${v.codigo_localizador || 'S/ LOC'}
          </span>
          <span class="text-xs font-black text-indigo-600">
            R$ ${v.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <!-- Título do Destino -->
        <h4 class="text-sm font-black text-slate-800 leading-snug group-hover:text-indigo-600 transition mb-1 flex items-center gap-1">
          ✈️ ${v.destino}
        </h4>

        <!-- Nome do Cliente/Passageiro -->
        <p class="text-xs text-slate-500 font-extrabold mb-3 flex items-center gap-1.5">
          <span class="text-slate-400">👤</span> ${v.cliente?.nome || 'Cliente Desconhecido'}
        </p>

        <!-- Calendário/Datas -->
        <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-2 mb-2">
          <div>
            <span class="block text-slate-300 font-bold uppercase tracking-wider text-[8px]">Data Ida</span>
            <span class="text-slate-600 font-bold">${formatarData(v.data_ida)}</span>
          </div>
          <div>
            <span class="block text-slate-300 font-bold uppercase tracking-wider text-[8px]">Data Volta</span>
            <span class="text-slate-600 font-bold">${formatarData(v.data_volta)}</span>
          </div>
        </div>

        <!-- Se for Admin, exibe o consultor responsável pela venda -->
        ${this.perfil?.role === 'admin' ? `
          <div class="border-t border-slate-50 pt-1.5 mt-1.5 flex items-center justify-between text-[9px] text-slate-400 font-medium">
            <span>Consultor Resp:</span>
            <span class="font-extrabold text-slate-600">${v.consultor_id === this.user.id ? 'Você' : 'Outro Consultor'}</span>
          </div>
        ` : ''}

        <!-- Alerta de SLA visual ou Status de Reembolso Concluído -->
        ${reembolsoConcluido ? `
          <div class="mt-2.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide flex items-center justify-center gap-1 bg-emerald-100/85 text-emerald-800 border border-emerald-200">
            ✅ Reembolso Concluído!
          </div>
        ` : sla.alert ? `
          <div class="mt-2.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 animate-pulse ${
            sla.type === 'pre-embarque' 
              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
              : 'bg-amber-50 text-amber-600 border border-amber-100'
          }">
            ${sla.text}
          </div>
        ` : ''}

      </div>
    `;
  }
}
