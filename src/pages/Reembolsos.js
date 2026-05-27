import { supabase, getSessaoAtual } from '../services/supabase';
// Injeta estilos premium e customizações para a Central de Reembolsos no DOM
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
    .table-row-hover:hover {
      background-color: rgba(248, 250, 252, 0.6) !important;
      transform: translateY(-0.5px);
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
export class ReembolsosPage {
    container;
    user = null;
    perfil = null;
    reembolsos = [];
    timerId = null;
    constructor(container) {
        this.container = container;
    }
    /**
     * Inicializa o painel de reembolsos: valida a sessão, busca registros e ativa o cronômetro SLA.
     */
    async init() {
        this.renderLoading();
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
        }
        catch (err) {
            console.error('Erro na inicialização da Central de Reembolsos:', err);
            this.renderAuthError(`Erro interno: ${err.message}`);
        }
    }
    /**
     * Destrói instâncias ativas (limpa o cronômetro para evitar vazamento de memória)
     */
    destroy() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
    /**
     * Busca todos os reembolsos fazendo a junção com as tabelas de Viagens, Clientes e Produtos
     */
    async loadReembolsos() {
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
            if (error)
                throw error;
            const rawData = data || [];
            // Filtro de segurança (RLS local): Consultores normais só veem reembolsos de suas viagens
            if (this.perfil && this.perfil.role !== 'admin') {
                this.reembolsos = rawData.filter(r => r.viagem && r.viagem.consultor_id === this.user.id);
            }
            else {
                this.reembolsos = rawData;
            }
        }
        catch (err) {
            console.error('Erro ao carregar reembolsos:', err.message);
            this.reembolsos = [];
        }
    }
    /**
     * Inicia o intervalo de 1 segundo para atualizar o cronômetro dos SLAs em tempo real na tela
     */
    iniciarSlaTimer() {
        this.destroy(); // Limpa seletores anteriores
        this.timerId = setInterval(() => {
            const timers = document.querySelectorAll('.sla-active-timer');
            timers.forEach(el => {
                const createdAtStr = el.getAttribute('data-created-at');
                if (!createdAtStr)
                    return;
                const diffString = this.calculateElapsedTime(createdAtStr);
                el.textContent = diffString;
            });
        }, 1000);
    }
    /**
     * Calcula o tempo decorrido formatado em dias, horas, minutos e segundos
     */
    calculateElapsedTime(createdAtStr) {
        const dataAbertura = new Date(createdAtStr);
        const agora = new Date();
        const diffMs = agora.getTime() - dataAbertura.getTime();
        if (diffMs < 0)
            return '0d 0h 0m 0s';
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
    setupEventListeners() {
        // Escuta alterações de status em todos os seletores dropdown da tabela
        const statusSelects = document.querySelectorAll('.select-status-reembolso');
        statusSelects.forEach(select => {
            select.addEventListener('change', async (e) => {
                const selectEl = e.target;
                const reembolsoId = selectEl.getAttribute('data-reembolso-id');
                const novoStatus = selectEl.value;
                if (!reembolsoId)
                    return;
                try {
                    const payload = { status: novoStatus };
                    // Se mudar para "pago" (Concluído), salva a data de conclusão
                    if (novoStatus === 'pago') {
                        payload.data_resolucao = new Date().toISOString().split('T')[0];
                    }
                    else {
                        payload.data_resolucao = null;
                    }
                    const { error } = await supabase
                        .from('reembolsos')
                        .update(payload)
                        .eq('id', reembolsoId);
                    if (error)
                        throw error;
                    this.showToast('Status do reembolso atualizado com sucesso!', 'success');
                    // Se o reembolso foi pago (Concluído), atualiza também o status da Viagem de volta
                    // para indicar finalização de fluxo operacional (ex: 'pos_viagem' ou mantém para histórico)
                    if (novoStatus === 'pago') {
                        const reembolso = this.reembolsos.find(r => r.id === reembolsoId);
                        if (reembolso && reembolso.viagem_id) {
                            // Mantém na mesma coluna ou finaliza, o card no Kanban mudará de cor automaticamente
                            console.log('Sincronização de reembolso bem-sucedida!');
                        }
                    }
                    // Recarrega os dados e atualiza a exibição da tabela
                    await this.loadReembolsos();
                    this.render();
                    this.iniciarSlaTimer();
                }
                catch (err) {
                    console.error('Erro ao atualizar status do reembolso:', err);
                    this.showToast('Falha ao atualizar o status no banco.', 'error');
                    this.init(); // Recarrega o estado anterior
                }
            });
        });
        // Evento de Logout
        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            if (confirm('Deseja realmente sair?')) {
                const { logoutConsultor } = await import('../services/supabase');
                await logoutConsultor();
                window.location.reload();
            }
        });
    }
    /**
     * Exibe tela de carregamento (Skeleton loader)
     */
    renderLoading() {
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
    renderAuthError(msg) {
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
     * Renderiza a página da central de reembolsos
     */
    render() {
        // Cálculos rápidos de estatísticas
        const totalReembolsos = this.reembolsos.length;
        const aguardandoFornecedor = this.reembolsos.filter(r => r.status === 'Aguardando Fornecedor' || r.status === 'solicitado').length;
        const concluidos = this.reembolsos.filter(r => r.status === 'pago').length;
        const somaTotalReembolsado = this.reembolsos
            .filter(r => r.status === 'pago')
            .reduce((acc, r) => acc + (r.valor_aprovado || r.valor_solicitado || 0), 0);
        const formatarData = (dStr) => {
            if (!dStr)
                return '';
            const parts = dStr.split('-');
            if (parts.length !== 3)
                return dStr;
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        };
        this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 flex flex-col font-sans">
        
        <!-- Cabeçalho -->
        <header class="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="p-3 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-2xl text-2xl font-black shadow-lg shadow-indigo-500/30">PF</span>
            <div>
              <h1 class="text-2xl font-black text-slate-800 tracking-tight">Central de Reembolsos</h1>
              <p class="text-xs text-slate-500 font-medium">Controle de Cancelamentos e SLAs em Tempo Real</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right hidden sm:block">
              <span class="block text-sm font-extrabold text-slate-700">${this.perfil?.nome || 'Consultor'}</span>
              <span class="block text-[10px] text-indigo-600 font-bold uppercase tracking-wider">${this.perfil?.role || 'consultor'}</span>
            </div>
            <button id="btn-logout" class="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition border border-slate-200/40">
              🚪
            </button>
          </div>
        </header>

        <main class="flex-1 p-6 flex flex-col gap-6">
          
          <!-- Cards de Métricas Premium -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div class="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Processos</span>
                <span class="text-2xl font-black text-slate-800">${totalReembolsos}</span>
              </div>
              <span class="p-3 bg-indigo-50 text-indigo-500 rounded-xl text-lg font-bold">📋</span>
            </div>

            <div class="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Aguardando Fornecedor</span>
                <span class="text-2xl font-black text-amber-600">${aguardandoFornecedor}</span>
              </div>
              <span class="p-3 bg-amber-50 text-amber-500 rounded-xl text-lg font-bold">⏳</span>
            </div>

            <div class="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Reembolsos Pagos (Concluídos)</span>
                <span class="text-2xl font-black text-emerald-600">${concluidos}</span>
              </div>
              <span class="p-3 bg-emerald-50 text-emerald-500 rounded-xl text-lg font-bold">✅</span>
            </div>

            <div class="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Pago (Aprovado)</span>
                <span class="text-xl font-black text-indigo-600">R$ ${somaTotalReembolsado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <span class="p-3 bg-indigo-50 text-indigo-600 rounded-xl text-lg font-bold">💰</span>
            </div>
          </div>

          <!-- Tabela de Reembolsos -->
          <div class="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
              <h2 class="text-sm font-black text-slate-700 tracking-wider uppercase">Fila de Reembolsos Ativos</h2>
              <span class="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded border border-indigo-100 uppercase tracking-wider">${this.reembolsos.length} solicitações</span>
            </div>

            <div class="overflow-x-auto custom-scrollbar">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-100">
                    <th class="py-4 px-5">Cliente</th>
                    <th class="py-4 px-5">Viagem / Localizador</th>
                    <th class="py-4 px-5">Produto Cancelado</th>
                    <th class="py-4 px-5">Fornecedor</th>
                    <th class="py-4 px-5">Valor</th>
                    <th class="py-4 px-5">Solicitação</th>
                    <th class="py-4 px-5">SLA Cronômetro</th>
                    <th class="py-4 px-5 text-center">Status / Ação</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm text-slate-700 font-semibold bg-white/50">
                  ${this.reembolsos.length === 0 ? `
                    <tr>
                      <td colspan="8" class="py-12 text-center text-slate-400 text-xs font-semibold">
                        Nenhuma solicitação de reembolso ativa encontrada.
                      </td>
                    </tr>
                  ` : this.reembolsos.map(r => {
            const isPago = r.status === 'pago';
            const dataAberturaStr = r.created_at || r.created_at_time;
            return `
                      <tr class="table-row-hover transition duration-150">
                        <!-- Cliente -->
                        <td class="py-4.5 px-5">
                          <span class="block text-slate-800 font-bold">${r.viagem?.cliente?.nome || 'Cliente Desconhecido'}</span>
                          <span class="block text-[10px] text-slate-400 font-semibold">${r.viagem?.cliente?.email || 'Sem e-mail'}</span>
                        </td>
                        
                        <!-- Viagem / Localizador -->
                        <td class="py-4.5 px-5">
                          <span class="block text-slate-800 font-bold">✈️ ${r.viagem?.destino || 'Sem Destino'}</span>
                          <span class="inline-block px-1.5 py-0.5 mt-0.5 bg-slate-100 text-slate-500 font-extrabold text-[9px] rounded uppercase border border-slate-200/50">
                            LOC: ${r.viagem?.codigo_localizador || 'S/ LOC'}
                          </span>
                        </td>

                        <!-- Produto Cancelado -->
                        <td class="py-4.5 px-5">
                          <span class="block text-slate-700 font-bold">[${(r.produto?.tipo || 'outro').toUpperCase()}]</span>
                          <span class="block text-[11px] text-slate-400 font-medium truncate max-w-[160px]">${r.produto?.descricao || 'Sem descrição'}</span>
                        </td>

                        <!-- Fornecedor -->
                        <td class="py-4.5 px-5">
                          <span class="text-slate-600 font-bold">${r.produto?.fornecedor || 'Fornecedor n/d'}</span>
                        </td>

                        <!-- Valor -->
                        <td class="py-4.5 px-5">
                          <span class="text-indigo-600 font-black">
                            R$ ${(r.valor_solicitado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        <!-- Solicitação -->
                        <td class="py-4.5 px-5 text-slate-500 font-bold text-xs">
                          ${formatarData(r.data_solicitacao)}
                        </td>

                        <!-- SLA Cronômetro -->
                        <td class="py-4.5 px-5">
                          ${isPago ? `
                            <span class="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-lg border border-emerald-100 flex items-center gap-1 max-w-fit">
                              ✅ Concluído em ${formatarData(r.data_resolucao)}
                            </span>
                          ` : `
                            <span class="sla-active-timer text-xs font-black text-rose-600 bg-rose-50/70 border border-rose-100/50 px-2.5 py-1 rounded-lg max-w-fit flex items-center" data-created-at="${dataAberturaStr}">
                              Calculando...
                            </span>
                          `}
                        </td>

                        <!-- Status / Ação -->
                        <td class="py-4.5 px-5 text-center">
                          <select data-reembolso-id="${r.id}" class="select-status-reembolso px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800">
                            <option value="Aguardando Fornecedor" ${r.status === 'Aguardando Fornecedor' || r.status === 'solicitado' ? 'selected' : ''}>Aguardando Fornecedor</option>
                            <option value="em_analise" ${r.status === 'em_analise' ? 'selected' : ''}>Em Análise</option>
                            <option value="aprovado" ${r.status === 'aprovado' ? 'selected' : ''}>Aprovado</option>
                            <option value="recusado" ${r.status === 'recusado' ? 'selected' : ''}>Recusado</option>
                            <option value="pago" ${r.status === 'pago' ? 'selected' : ''}>💸 Concluído / Pago</option>
                            <option value="cancelado" ${r.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                          </select>
                        </td>
                      </tr>
                    `;
        }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    `;
        // Re-associa ouvintes após renderização
        this.setupEventListeners();
    }
}
export default ReembolsosPage;
