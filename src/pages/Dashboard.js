import Sortable from 'sortablejs';
import { supabase, getSessaoAtual, logoutConsultor } from '../services/supabase';
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
    container;
    user = null;
    perfil = null;
    settings = {
        id: '',
        agencyName: 'PaxFlow CRM',
        taxaCancelamentoPadrao: 0,
        prazoReembolsoDias: 3,
        notificacoesAtivas: true,
        emailSuporte: 'suporte@paxflow.com.br'
    };
    // Parâmetros de SLA padrão (caso não existam no banco)
    slaPreEmbarqueDias = 7;
    slaPosViagemDias = 3;
    viagens = [];
    sortables = [];
    constructor(container) {
        this.container = container;
    }
    /**
     * Inicializa o painel operacional: valida autenticação, busca SLAs e dados, e renderiza o quadro.
     */
    async init() {
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
        }
        catch (err) {
            console.error('Erro na inicialização do Dashboard:', err);
            this.renderAuthError(`Ocorreu um erro interno: ${err.message}`);
        }
    }
    /**
     * Busca as configurações globais de SLA
     */
    async loadGlobalSettings() {
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
                this.settings = {
                    id: data.id,
                    agencyName: data.agency_name || data.agencyName || 'PaxFlow CRM',
                    taxaCancelamentoPadrao: data.taxa_cancelamento_padrao || 0,
                    prazoReembolsoDias: data.prazo_reembolso_dias || 3,
                    notificacoesAtivas: data.notificacoes_ativas ?? true,
                    emailSuporte: data.email_suporte || 'suporte@paxflow.com.br',
                    googleRefreshToken: data.google_refresh_token,
                    slaPreEmbarqueDias: data.sla_pre_embarque_dias,
                    slaPosViagemDias: data.sla_pos_viagem_dias
                };
                // Mapeia colunas específicas se presentes no banco de dados
                if (data.sla_pre_embarque_dias !== undefined) {
                    this.slaPreEmbarqueDias = Number(data.sla_pre_embarque_dias);
                }
                if (data.sla_pos_viagem_dias !== undefined) {
                    this.slaPosViagemDias = Number(data.sla_pos_viagem_dias);
                }
            }
        }
        catch (err) {
            console.error('Falha ao carregar configurações de SLA:', err);
        }
    }
    /**
     * Busca as viagens e realiza o filtro baseado no cargo (Role) do consultor logado
     */
    async loadViagens() {
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
        }
        catch (err) {
            console.error('Erro ao carregar viagens:', err.message);
            this.viagens = [];
        }
    }
    /**
     * Calcula o status do SLA para uma determinada viagem
     */
    checkSLA(viagem) {
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
    setupDragAndDrop() {
        // Destrói instâncias antigas se houver
        this.sortables.forEach(s => s.destroy());
        this.sortables = [];
        const colunas = ['fechado', 'pos_venda', 'pre_embarque', 'pos_viagem', 'reembolso_solicitado'];
        colunas.forEach(status => {
            const colEl = document.getElementById(`col-${status}`);
            if (!colEl)
                return;
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
                    if (!tripId || !newStatus || !oldStatus)
                        return;
                    // Se nenhuma mudança de coluna ocorreu, avisa sobre reordenação visual
                    if (newStatus === oldStatus) {
                        this.showToast('Viagem reordenada na coluna!', 'success');
                        return;
                    }
                    // Regra Especial: Se mover para "Reembolso Solicitado", abre o modal
                    if (newStatus === 'reembolso_solicitado') {
                        this.openRefundModal(tripId, oldStatus);
                    }
                    else {
                        // Atualização padrão de status no Supabase
                        try {
                            const { error } = await supabase
                                .from('viagens')
                                .update({ status: newStatus })
                                .eq('id', tripId);
                            if (error)
                                throw error;
                            // Atualiza o dado localmente e re-renderiza contadores rápidos
                            const viagem = this.viagens.find(v => v.id === tripId);
                            if (viagem)
                                viagem.status = newStatus;
                            this.showToast('Status da viagem atualizado com sucesso!', 'success');
                            this.init(); // Recarrega para recalcular SLAs e reorganizar
                        }
                        catch (err) {
                            console.error('Erro ao atualizar status:', err);
                            this.showToast('Erro ao atualizar status da viagem.', 'error');
                            this.init(); // Recarrega para voltar o card à coluna antiga na UI
                        }
                    }
                }
            });
            this.sortables.push(sortable);
        });
        // Habilita reordenação das colunas (estágios) no Kanban!
        const boardEl = document.getElementById('kanban-columns-container');
        if (boardEl) {
            const columnSortable = new Sortable(boardEl, {
                animation: 200,
                handle: '.column-header', // Permite arrastar segurando pelo cabeçalho da coluna
                ghostClass: 'kanban-ghost-class',
                onEnd: () => {
                    this.showToast('Ordem das colunas atualizada visualmente!', 'success');
                }
            });
            this.sortables.push(columnSortable);
        }
    }
    /**
     * Abre o Modal Dinâmico para solicitação de reembolso de um produto
     */
    async openRefundModal(tripId, oldStatus) {
        this.renderModalOverlay();
        const modalContent = document.getElementById('modal-content-container');
        if (!modalContent)
            return;
        try {
            // Busca os produtos vinculados à viagem
            const { data: produtos, error } = await supabase
                .from('produtos_viagem')
                .select('*')
                .eq('viagem_id', tripId);
            if (error)
                throw error;
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
            const selectProd = document.getElementById('select-produto');
            const inputValor = document.getElementById('input-valor-reembolso');
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
            const form = document.getElementById('form-reembolso');
            form?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const selectedProdId = selectProd.value;
                const valorReembolso = parseFloat(inputValor.value);
                const motivo = document.getElementById('textarea-motivo').value;
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
                    if (errorReembolso)
                        throw errorReembolso;
                    // 2. Atualizar o status da Viagem para 'reembolso_solicitado'
                    const { error: errorViagem } = await supabase
                        .from('viagens')
                        .update({ status: 'reembolso_solicitado' })
                        .eq('id', tripId);
                    if (errorViagem)
                        throw errorViagem;
                    // 3. Atualizar o status do Produto para 'cancelado' ou 'reembolsado'
                    const { error: errorProd } = await supabase
                        .from('produtos_viagem')
                        .update({ status: 'reembolsado' })
                        .eq('id', selectedProdId);
                    if (errorProd)
                        throw errorProd;
                    this.showToast('Reembolso solicitado e cadastrado com sucesso!', 'success');
                    this.closeModal();
                    this.init(); // Recarrega o quadro atualizado
                }
                catch (err) {
                    console.error('Erro ao processar reembolso:', err);
                    this.showToast('Erro interno ao processar solicitação de reembolso.', 'error');
                }
            });
        }
        catch (err) {
            console.error('Erro ao abrir modal:', err);
            this.closeModal();
            this.init();
        }
    }
    /**
     * Exibe uma caixa flutuante de carregamento (Skeleton loader)
     */
    renderLoading() {
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
    renderAuthError(msg) {
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
     * Abre o Modal Interativo de Criação de Viagem / Card
     */
    async openNovaViagemModal() {
        try {
            this.renderModalOverlay();
            const modalContent = document.getElementById('modal-content-container');
            if (!modalContent)
                return;
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
            if (errClientes)
                throw errClientes;
            if (!clientes || clientes.length === 0) {
                modalContent.innerHTML = `
          <div class="p-6 text-center">
            <span class="text-3xl">👥</span>
            <h3 class="text-lg font-bold text-slate-800 mt-2 mb-1">Nenhum cliente cadastrado</h3>
            <p class="text-xs text-slate-400 mb-4">É necessário cadastrar pelo menos um cliente para criar uma viagem.</p>
            <div class="flex justify-center gap-3">
              <button id="btn-fechar-aviso" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs tracking-wider rounded-xl transition uppercase">Fechar</button>
            </div>
          </div>
        `;
                document.getElementById('btn-fechar-aviso')?.addEventListener('click', () => this.closeModal());
                return;
            }
            modalContent.innerHTML = `
        <div class="p-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 class="text-lg font-black text-slate-800 flex items-center gap-1.5">✈️ Nova Viagem / Card</h3>
            <button id="btn-close-viagem-x" class="text-slate-400 hover:text-rose-500 font-bold transition">✕</button>
          </div>

          <form id="form-nova-viagem" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Passageiro / Cliente *</label>
              <select id="select-viagem-cliente" required class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm">
                <option value="">Selecione o cliente...</option>
                ${clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Destino *</label>
              <input id="input-viagem-destino" type="text" required placeholder="ex: Paris, Orlando, etc." class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Localizador (LOC)</label>
                <input id="input-viagem-loc" type="text" placeholder="ex: AX3R9" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm uppercase" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Total (R$) *</label>
                <input id="input-viagem-valor" type="number" step="0.01" required placeholder="0.00" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Ida *</label>
                <input id="input-viagem-ida" type="date" required class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Volta *</label>
                <input id="input-viagem-volta" type="date" required class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Status / Etapa Inicial *</label>
              <select id="select-viagem-status" required class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm">
                <option value="pos_venda">Pós-Venda</option>
                <option value="fechado">Fechado</option>
                <option value="pre_embarque">Pré-Embarque</option>
                <option value="pos_viagem">Pós-Viagem</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observações Operacionais</label>
              <textarea id="textarea-viagem-obs" placeholder="Detalhes de voo, hotel, etc." rows="2" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm"></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-4">
              <button id="btn-cancel-viagem" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
              <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Criar Viagem</button>
            </div>
          </form>
        </div>
      `;
            const handleClose = () => this.closeModal();
            document.getElementById('btn-close-viagem-x')?.addEventListener('click', handleClose);
            document.getElementById('btn-cancel-viagem')?.addEventListener('click', handleClose);
            const form = document.getElementById('form-nova-viagem');
            form?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const clienteId = document.getElementById('select-viagem-cliente').value;
                const destino = document.getElementById('input-viagem-destino').value;
                const loc = document.getElementById('input-viagem-loc').value;
                const valor = parseFloat(document.getElementById('input-viagem-valor').value);
                const dataIda = document.getElementById('input-viagem-ida').value;
                const dataVolta = document.getElementById('input-viagem-volta').value;
                const status = document.getElementById('select-viagem-status').value;
                const obs = document.getElementById('textarea-viagem-obs').value;
                const payload = {
                    cliente_id: clienteId,
                    consultor_id: this.user.id,
                    destino: destino,
                    codigo_localizador: loc || null,
                    valor_total: valor,
                    data_ida: dataIda,
                    data_volta: dataVolta,
                    status: status,
                    observacoes: obs || null
                };
                try {
                    const { error } = await supabase
                        .from('viagens')
                        .insert(payload);
                    if (error)
                        throw error;
                    this.showToast('Viagem cadastrada com sucesso no Kanban!', 'success');
                    this.closeModal();
                    await this.loadViagens();
                    this.render();
                    this.setupDragAndDrop();
                }
                catch (err) {
                    console.error('Erro ao cadastrar viagem:', err);
                    this.showToast(`Erro ao criar viagem: ${err.message}`, 'error');
                }
            });
        }
        catch (err) {
            console.error('Erro ao abrir modal de nova viagem:', err);
            this.showToast('Erro ao carregar modal de criação.', 'error');
            this.closeModal();
        }
    }
    /**
     * Abre o Modal Dinâmico de Edição de Viagem e Gestão de Produtos
     */
    async openEdicaoEProdutosModal(tripId) {
        try {
            this.renderModalOverlay();
            const modalContent = document.getElementById('modal-content-container');
            if (!modalContent)
                return;
            modalContent.innerHTML = `
        <div class="p-6 text-center text-slate-500 text-sm font-semibold">
          Carregando dados da viagem...
        </div>
      `;
            // 1. Busca detalhes da viagem
            const { data: viagem, error: errViagem } = await supabase
                .from('viagens')
                .select('*, cliente:clientes(*)')
                .eq('id', tripId)
                .single();
            if (errViagem)
                throw errViagem;
            // 2. Busca lista de clientes
            const { data: clientes, error: errClientes } = await supabase
                .from('clientes')
                .select('id, nome')
                .order('nome', { ascending: true });
            if (errClientes)
                throw errClientes;
            // 3. Renderiza a estrutura do Modal com as Abas
            this.renderEdicaoEProdutosModalContent(viagem, clientes || []);
            // 4. Carrega e exibe os produtos da viagem
            await this.loadAndRenderProdutosViagem(tripId);
        }
        catch (err) {
            console.error('Erro ao carregar detalhes da viagem:', err);
            this.showToast('Erro ao carregar detalhes da viagem.', 'error');
            this.closeModal();
        }
    }
    /**
     * Renderiza a estrutura interna do Modal de Edição & Produtos
     */
    renderEdicaoEProdutosModalContent(v, clientes) {
        const modalContent = document.getElementById('modal-content-container');
        if (!modalContent)
            return;
        modalContent.innerHTML = `
      <div class="p-6">
        <!-- Topo com Título e Fechar -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 class="text-lg font-black text-slate-800 flex items-center gap-1.5">✈️ Gerenciar Viagem</h3>
            <p class="text-xs text-slate-400 font-semibold">Destino: <span class="font-bold text-slate-600">${v.destino}</span> &bull; Loc: <span class="font-bold text-slate-600">${v.codigo_localizador || 'Sem LOC'}</span></p>
          </div>
          <button id="btn-close-edit-modal-x" class="text-slate-400 hover:text-rose-500 font-bold transition">✕</button>
        </div>

        <!-- Seletor de Abas Premium -->
        <div class="flex items-center gap-2 border-b border-slate-100 mb-5 pb-px">
          <button id="tab-detalhes-btn" class="border-b-2 border-indigo-600 px-4 py-2 text-sm font-black text-indigo-600 transition">
            📝 Detalhes e Edição
          </button>
          <button id="tab-produtos-btn" class="border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 transition">
            🛍️ Produtos e Serviços
          </button>
        </div>

        <!-- CONTEÚDO DA ABA 1: DETALHES E EDIÇÃO -->
        <div id="tab-detalhes-content" class="space-y-4">
          <form id="form-editar-viagem" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Passageiro / Cliente *</label>
              <select id="edit-viagem-cliente" required class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm">
                ${clientes.map(c => `<option value="${c.id}" ${c.id === v.cliente_id ? 'selected' : ''}>${c.nome}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Destino *</label>
              <input id="edit-viagem-destino" type="text" required value="${v.destino}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Localizador (LOC)</label>
                <input id="edit-viagem-loc" type="text" value="${v.codigo_localizador || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm uppercase" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Total (R$) *</label>
                <input id="edit-viagem-valor" type="number" step="0.01" required value="${v.valor_total || 0}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Ida *</label>
                <input id="edit-viagem-ida" type="date" required value="${v.data_ida || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Volta *</label>
                <input id="edit-viagem-volta" type="date" required value="${v.data_volta || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Status / Etapa *</label>
              <select id="edit-viagem-status" required class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm">
                <option value="pos_venda" ${v.status === 'pos_venda' ? 'selected' : ''}>Pós-Venda</option>
                <option value="fechado" ${v.status === 'fechado' ? 'selected' : ''}>Fechado</option>
                <option value="pre_embarque" ${v.status === 'pre_embarque' ? 'selected' : ''}>Pré-Embarque</option>
                <option value="pos_viagem" ${v.status === 'pos_viagem' ? 'selected' : ''}>Pós-Viagem</option>
                <option value="reembolso_solicitado" ${v.status === 'reembolso_solicitado' ? 'selected' : ''}>Reembolso Solicitado</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observações Operacionais</label>
              <textarea id="edit-viagem-obs" rows="2.5" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm font-medium">${v.observacoes || ''}</textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-4">
              <button id="btn-cancel-edit" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
              <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Salvar Alterações</button>
            </div>
          </form>
        </div>

        <!-- CONTEÚDO DA ABA 2: PRODUTOS E SERVIÇOS -->
        <div id="tab-produtos-content" class="hidden space-y-5">
          
          <!-- Lista de Produtos Existentes -->
          <div>
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-wide mb-2.5">Produtos Cadastrados nesta Viagem</h4>
            <div id="lista-produtos-viagem-container" class="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              <p class="text-center text-xs text-slate-400 font-medium py-4">Buscando produtos...</p>
            </div>
          </div>

          <!-- Formulário de Novo Produto (Inline) -->
          <div class="border-t border-slate-100 pt-4">
            <h4 class="text-xs font-black text-indigo-600 uppercase tracking-wide mb-3 flex items-center gap-1">➕ Adicionar Produto / Serviço</h4>
            
            <form id="form-novo-produto" class="space-y-3 bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Tipo *</label>
                  <select id="prod-tipo" required class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium text-xs">
                    <option value="voo">Voo</option>
                    <option value="hotel">Hotel</option>
                    <option value="seguro">Seguro</option>
                    <option value="passeio">Passeio</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Fornecedor *</label>
                  <input id="prod-fornecedor" type="text" required placeholder="ex: LATAM, Hilton" class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium text-xs" />
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Descrição *</label>
                <input id="prod-descricao" type="text" required placeholder="ex: Voo GRU-JFK ou Quarto Deluxe" class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium text-xs" />
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Código (LOC)</label>
                  <input id="prod-reserva" type="text" placeholder="ex: LOC12" class="w-full px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium text-xs uppercase" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Custo (R$) *</label>
                  <input id="prod-custo" type="number" step="0.01" required placeholder="0.00" class="w-full px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium text-xs" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Venda (R$) *</label>
                  <input id="prod-venda" type="number" step="0.01" required placeholder="0.00" class="w-full px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium text-xs" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Data do Serviço *</label>
                  <input id="prod-data" type="date" required class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium text-xs" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Status *</label>
                  <select id="prod-status" required class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium text-xs">
                    <option value="reservado">Reservado</option>
                    <option value="emitido" selected>Emitido</option>
                  </select>
                </div>
              </div>

              <div class="flex justify-end pt-1">
                <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
                  Adicionar Produto
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    `;
        // Fechar Modal
        const handleClose = () => this.closeModal();
        document.getElementById('btn-close-edit-modal-x')?.addEventListener('click', handleClose);
        document.getElementById('btn-cancel-edit')?.addEventListener('click', handleClose);
        // Seletores de Abas
        const tabDetalhesBtn = document.getElementById('tab-detalhes-btn');
        const tabProdutosBtn = document.getElementById('tab-produtos-btn');
        const tabDetalhesContent = document.getElementById('tab-detalhes-content');
        const tabProdutosContent = document.getElementById('tab-produtos-content');
        tabDetalhesBtn?.addEventListener('click', () => {
            tabDetalhesBtn.className = 'border-b-2 border-indigo-600 px-4 py-2 text-sm font-black text-indigo-600 transition';
            if (tabProdutosBtn)
                tabProdutosBtn.className = 'border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 transition';
            tabDetalhesContent?.classList.remove('hidden');
            tabProdutosContent?.classList.add('hidden');
        });
        tabProdutosBtn?.addEventListener('click', () => {
            tabProdutosBtn.className = 'border-b-2 border-indigo-600 px-4 py-2 text-sm font-black text-indigo-600 transition';
            if (tabDetalhesBtn)
                tabDetalhesBtn.className = 'border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 transition';
            tabProdutosContent?.classList.remove('hidden');
            tabDetalhesContent?.classList.add('hidden');
        });
        // Submissão do Formulário de Edição da Viagem
        const formEditar = document.getElementById('form-editar-viagem');
        formEditar?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clienteId = document.getElementById('edit-viagem-cliente').value;
            const destino = document.getElementById('edit-viagem-destino').value;
            const loc = document.getElementById('edit-viagem-loc').value;
            const valor = parseFloat(document.getElementById('edit-viagem-valor').value);
            const dataIda = document.getElementById('edit-viagem-ida').value;
            const dataVolta = document.getElementById('edit-viagem-volta').value;
            const status = document.getElementById('edit-viagem-status').value;
            const obs = document.getElementById('edit-viagem-obs').value;
            const payload = {
                cliente_id: clienteId,
                destino: destino,
                codigo_localizador: loc || null,
                valor_total: valor,
                data_ida: dataIda,
                data_volta: dataVolta,
                status: status,
                observacoes: obs || null
            };
            try {
                const { error } = await supabase
                    .from('viagens')
                    .update(payload)
                    .eq('id', v.id);
                if (error)
                    throw error;
                this.showToast('Viagem atualizada com sucesso!', 'success');
                this.closeModal();
                await this.loadViagens();
                this.render();
                this.setupDragAndDrop();
            }
            catch (err) {
                console.error('Erro ao editar viagem:', err);
                this.showToast(`Erro ao editar viagem: ${err.message}`, 'error');
            }
        });
        // Submissão do Formulário de Novo Produto
        const formNovoProduto = document.getElementById('form-novo-produto');
        formNovoProduto?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tipo = document.getElementById('prod-tipo').value;
            const fornecedor = document.getElementById('prod-fornecedor').value;
            const descricao = document.getElementById('prod-descricao').value;
            const reserva = document.getElementById('prod-reserva').value;
            const custo = parseFloat(document.getElementById('prod-custo').value);
            const venda = parseFloat(document.getElementById('prod-venda').value);
            const dataServico = document.getElementById('prod-data').value;
            const status = document.getElementById('prod-status').value;
            const payload = {
                viagem_id: v.id,
                tipo,
                fornecedor,
                descricao,
                codigo_reserva: reserva || null,
                valor_custo: custo,
                valor_venda: venda,
                status,
                data_servico: dataServico
            };
            try {
                const { error } = await supabase
                    .from('produtos_viagem')
                    .insert(payload);
                if (error)
                    throw error;
                this.showToast('Produto adicionado à viagem com sucesso!', 'success');
                formNovoProduto.reset();
                await this.loadAndRenderProdutosViagem(v.id);
            }
            catch (err) {
                console.error('Erro ao adicionar produto:', err);
                this.showToast(`Erro ao adicionar produto: ${err.message}`, 'error');
            }
        });
    }
    /**
     * Carrega os produtos da viagem do banco e renderiza na Aba 2
     */
    async loadAndRenderProdutosViagem(tripId) {
        const container = document.getElementById('lista-produtos-viagem-container');
        if (!container)
            return;
        try {
            const { data: produtos, error } = await supabase
                .from('produtos_viagem')
                .select('*')
                .eq('viagem_id', tripId)
                .order('created_at', { ascending: true });
            if (error)
                throw error;
            if (!produtos || produtos.length === 0) {
                container.innerHTML = `
          <p class="text-center text-xs text-slate-400 font-medium py-6">
            Nenhum produto cadastrado para esta viagem.
          </p>
        `;
                return;
            }
            const formatarData = (dStr) => {
                if (!dStr)
                    return '';
                const parts = dStr.split('-');
                if (parts.length !== 3)
                    return dStr;
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            };
            container.innerHTML = produtos.map(p => {
                const iconesMap = {
                    voo: '✈️',
                    hotel: '🏨',
                    seguro: '🛡️',
                    passeio: '🎟️',
                    outro: '📦'
                };
                return `
          <div class="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl hover:bg-slate-100/50 transition">
            <div class="flex items-start gap-2.5 overflow-hidden">
              <span class="text-lg p-1 bg-white border border-slate-100 rounded-lg shadow-sm flex items-center justify-center">${iconesMap[p.tipo] || '📦'}</span>
              <div class="overflow-hidden bg-slate-50/10">
                <span class="block text-xs font-black text-slate-700 truncate leading-tight">${p.fornecedor} &bull; ${p.descricao}</span>
                <span class="block text-[10px] text-slate-400 font-bold leading-normal">
                  ${p.codigo_reserva ? `LOC: <span class="text-slate-600 font-extrabold">${p.codigo_reserva}</span> &bull; ` : ''} 
                  Data: <span class="text-slate-600 font-semibold">${formatarData(p.data_servico)}</span>
                </span>
              </div>
            </div>
            
            <div class="flex items-center gap-3.5">
              <div class="text-right">
                <span class="block text-xs font-black text-indigo-600">R$ ${p.valor_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span class="block text-[9px] text-slate-400 font-semibold">Custo: R$ ${p.valor_custo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <button data-delete-prod-id="${p.id}" class="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-md transition text-xs font-bold" title="Remover Produto">
                🗑️
              </button>
            </div>
          </div>
        `;
            }).join('');
            // Ouvintes de exclusão de produtos
            container.querySelectorAll('[data-delete-prod-id]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const prodId = btn.getAttribute('data-delete-prod-id');
                    if (!prodId)
                        return;
                    if (confirm('Deseja realmente remover este produto da viagem?')) {
                        try {
                            const { error } = await supabase
                                .from('produtos_viagem')
                                .delete()
                                .eq('id', prodId);
                            if (error)
                                throw error;
                            this.showToast('Produto removido com sucesso!', 'success');
                            await this.loadAndRenderProdutosViagem(tripId);
                        }
                        catch (err) {
                            console.error('Erro ao remover produto:', err);
                            this.showToast(`Erro ao remover produto: ${err.message}`, 'error');
                        }
                    }
                });
            });
        }
        catch (err) {
            console.error('Erro ao listar produtos da viagem:', err);
            container.innerHTML = `
        <p class="text-center text-xs text-rose-500 font-bold py-4">
          Falha ao buscar produtos.
        </p>
      `;
        }
    }
    /**
     * Cria o overlay estrutural do modal se ele ainda não existir e abre a exibição
     */
    renderModalOverlay() {
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
    closeModal() {
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
    showToast(message, type = 'success') {
        const toastId = 'paxflow-toast';
        let toast = document.getElementById(toastId);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = toastId;
            toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
            document.body.appendChild(toast);
        }
        const isSuccess = type === 'success';
        toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'}`;
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
    render() {
        // Separa as viagens por colunas baseadas no status
        const colunasMap = {
            fechado: [],
            pos_venda: [],
            pre_embarque: [],
            pos_viagem: [],
            reembolso_solicitado: []
        };
        this.viagens.forEach(v => {
            if (colunasMap[v.status] !== undefined) {
                colunasMap[v.status].push(v);
            }
            else {
                // Fallback caso status não coincida
                colunasMap.fechado.push(v);
            }
        });
        // Conta alertas de SLA ativos para exibir no cabeçalho
        let totalSlaAlerts = 0;
        this.viagens.forEach(v => {
            if (this.checkSLA(v).alert)
                totalSlaAlerts++;
        });
        this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 flex flex-col font-sans">
        
        <!-- CABEÇALHO DO OPERACIONAL -->
        <header class="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="PaxFlow Logo" class="h-10 w-auto object-contain" />
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

            <!-- Botão Criar Card / Nova Viagem -->
            <button id="btn-nova-viagem" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase">
              ➕ Nova Viagem
            </button>

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
          <div id="kanban-columns-container" class="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-5 items-start overflow-x-auto pb-4 custom-scrollbar">
            
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
        // Evento de Criação de Nova Viagem
        document.getElementById('btn-nova-viagem')?.addEventListener('click', () => {
            this.openNovaViagemModal();
        });
        // Evento de cliques nos cards do Kanban para Abrir Detalhes/Edição/Produtos
        this.container.querySelectorAll('[data-trip-id]').forEach(card => {
            card.addEventListener('click', () => {
                const tripId = card.getAttribute('data-trip-id');
                if (tripId) {
                    this.openEdicaoEProdutosModal(tripId);
                }
            });
        });
    }
    /**
     * Renderiza a estrutura HTML de uma coluna do Kanban
     */
    renderColuna(titulo, status, items, styleBorders, styleBadge) {
        return `
      <div class="flex flex-col min-w-[280px] h-[calc(100vh-200px)] bg-white border border-slate-200/80 rounded-2xl shadow-sm border-t-4 ${styleBorders}">
        <!-- Header da Coluna -->
        <div class="column-header px-4 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 rounded-t-2xl cursor-grab active:cursor-grabbing">
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
    renderCard(v) {
        // Verifica se há algum reembolso concluído (status === 'pago')
        const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r) => r.status === 'pago');
        const sla = reembolsoConcluido ? { alert: false, type: null, text: '' } : this.checkSLA(v);
        // Classes CSS dinâmicas baseadas nos alertas de SLA ou reembolso finalizado
        let cardClasses = 'bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group';
        if (reembolsoConcluido) {
            cardClasses = 'bg-emerald-50/30 border border-emerald-500/80 shadow-emerald-500/10 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group';
        }
        else if (sla.alert) {
            if (sla.type === 'pre-embarque') {
                cardClasses += ' animate-sla-urgent';
            }
            else if (sla.type === 'pos-viagem') {
                cardClasses += ' animate-sla-warning';
            }
        }
        // Formatações de datas
        const formatarData = (dStr) => {
            if (!dStr)
                return '';
            const parts = dStr.split('-');
            if (parts.length !== 3)
                return dStr;
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
          <div class="mt-2.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 animate-pulse ${sla.type === 'pre-embarque'
            ? 'bg-rose-50 text-rose-600 border border-rose-100'
            : 'bg-amber-50 text-amber-600 border border-amber-100'}">
            ${sla.text}
          </div>
        ` : ''}

      </div>
    `;
    }
}
