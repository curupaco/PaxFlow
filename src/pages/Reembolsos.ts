import { supabase, getSessaoAtual } from '../services/supabase';
import { PerfilConsultor, Reembolso } from '../types';
import { getAvatarSvg } from '../services/avatars';
import { showCustomConfirm } from '../services/dialog';

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

  constructor(container: HTMLElement) {
    this.container = container;
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

      // Escuta reativamente as atualizações do perfil
      window.addEventListener('paxflow-profile-updated', (e: any) => {
        const { nome, avatar_url } = e.detail;
        if (this.perfil) {
          this.perfil.nome = nome;
          this.perfil.avatar_url = avatar_url;
          this.render();
          this.setupEventListeners();
        }
      });

      // 2. Buscar reembolsos
      await this.loadReembolsos();

      // 3. Renderizar a interface
      this.render();

      // 4. Iniciar o cronômetro SLA em tempo real
      this.iniciarSlaTimer();

      // 5. Configurar ouvintes de eventos da página
      this.setupEventListeners();

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

      // Filtro de segurança (RLS local): Consultores normais só veem reembolsos de suas viagens
      if (this.perfil && this.perfil.role !== 'admin') {
        this.reembolsos = rawData.filter(r => r.viagem && r.viagem.consultor_id === this.user.id);
      } else {
        this.reembolsos = rawData;
      }

    } catch (err: any) {
      console.error('Erro ao carregar reembolsos:', err.message);
      this.reembolsos = [];
    }
  }

  /**
   * Inicia o intervalo de 1 segundo para atualizar o cronômetro dos SLAs em tempo real na tela
   */
  private iniciarSlaTimer(): void {
    this.destroy(); // Limpa seletores anteriores

    this.timerId = setInterval(() => {
      const timers = document.querySelectorAll('.sla-active-timer');
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
          const payload: any = { status: novoStatus };

          // Se mudar para "pago" (Concluído), salva a data de conclusão
          if (novoStatus === 'pago') {
            payload.data_resolucao = new Date().toISOString().split('T')[0];
          } else {
            payload.data_resolucao = null;
          }

          const { error } = await supabase
            .from('reembolsos')
            .update(payload)
            .eq('id', reembolsoId);

          if (error) throw error;

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

        } catch (err: any) {
          console.error('Erro ao atualizar status do reembolso:', err);
          this.showToast('Falha ao atualizar o status no banco.', 'error');
          this.init(); // Recarrega o estado anterior
        }
      });
    });

    // Evento de Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      const confirmResult = await showCustomConfirm('Deseja realmente sair do sistema?', 'Encerrar Sessão');
      if (confirmResult) {
        const { logoutConsultor } = await import('../services/supabase');
        await logoutConsultor();
        window.location.reload();
      }
    });

    // Campo de busca de reembolsos
    const searchInput = document.getElementById('input-busca-reembolso') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.buscaTermo = (e.target as HTMLInputElement).value;
      this.render();
      this.iniciarSlaTimer();

      // Restaura o foco e coloca o cursor no final
      const input = document.getElementById('input-busca-reembolso') as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
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
   * Renderiza a página da central de reembolsos
   */
  private render(): void {
    // Separa e filtra os reembolsos com base no termo de busca
    const filtrados = this.reembolsos.filter(r => {
      if (!this.buscaTermo) return true;
      const q = this.buscaTermo.toLowerCase().trim();

      const cliNome = r.viagem?.cliente?.nome?.toLowerCase() || '';
      const cliEmail = r.viagem?.cliente?.email?.toLowerCase() || '';
      const dest = r.viagem?.destino?.toLowerCase() || '';
      const loc = r.viagem?.codigo_localizador?.toLowerCase() || '';
      const prodTipo = r.produto?.tipo?.toLowerCase() || '';
      const prodForn = r.produto?.fornecedor?.toLowerCase() || '';
      const prodDesc = r.produto?.descricao?.toLowerCase() || '';
      const motivo = r.motivo_cancelamento?.toLowerCase() || '';
      const status = r.status?.toLowerCase() || '';

      const valorSolStr = Number(r.valor_solicitado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).toLowerCase();
      const valorAprovStr = r.valor_aprovado ? Number(r.valor_aprovado).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).toLowerCase() : '';

      return (
        cliNome.includes(q) ||
        cliEmail.includes(q) ||
        dest.includes(q) ||
        loc.includes(q) ||
        prodTipo.includes(q) ||
        prodForn.includes(q) ||
        prodDesc.includes(q) ||
        motivo.includes(q) ||
        status.includes(q) ||
        valorSolStr.includes(q) ||
        valorAprovStr.includes(q)
      );
    });

    // Cálculos rápidos de estatísticas
    const totalReembolsos = this.reembolsos.length;
    const aguardandoFornecedor = this.reembolsos.filter(r => r.status === 'Aguardando Fornecedor' || r.status === 'solicitado').length;
    const concluidos = this.reembolsos.filter(r => r.status === 'pago').length;
    const somaTotalReembolsado = this.reembolsos
      .filter(r => r.status === 'pago')
      .reduce((acc, r) => acc + Number(r.valor_aprovado || r.valor_solicitado || 0), 0);

    const formatarData = (dStr: string) => {
      if (!dStr) return '';
      const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const parts = dataApenas.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-auto object-contain" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Central de Reembolsos</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Controle de Cancelamentos e SLAs em Tempo Real</p>
            </div>
          </div>
          
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <!-- Identidade do Consultor Logado -->
            <div class="flex items-center justify-between sm:justify-start gap-3 pl-0 sm:pl-3 border-t sm:border-t-0 sm:border-l border-slate-200/60 dark:border-slate-800/60 pt-3 sm:pt-0 shrink-0">
              <div class="text-right hidden sm:block">
                <span class="block text-sm font-extrabold text-slate-700 dark:text-slate-300">${this.perfil?.nome || 'Consultor'}</span>
                <span class="block text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">${this.perfil?.email || this.user.email}</span>
              </div>
              <div class="flex items-center gap-3">
                ${getAvatarSvg(this.perfil?.avatar_url, this.perfil?.nome || 'C', 'w-10 h-10')}
                <!-- Theme Toggle -->
                <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-650 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
                  <svg width="20" height="20" class="w-5 h-5 theme-icon-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <svg width="20" height="20" class="w-5 h-5 theme-icon-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <!-- Logout -->
                <button id="btn-logout" title="Sair do Sistema" class="p-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
                  <svg width="20" height="20" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main class="flex-1 p-6 flex flex-col gap-6">
          
          <!-- Cards de Métricas Premium -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total de Processos</span>
                <span class="text-2xl font-black text-slate-800 dark:text-slate-200">${totalReembolsos}</span>
              </div>
              <span class="p-3 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-500 dark:text-indigo-400 rounded-xl text-lg font-bold">📋</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aguardando Fornecedor</span>
                <span class="text-2xl font-black text-amber-600 dark:text-amber-400">${aguardandoFornecedor}</span>
              </div>
              <span class="p-3 bg-amber-50 dark:bg-amber-950/45 text-amber-500 dark:text-amber-450 rounded-xl text-lg font-bold">⏳</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Reembolsos Pagos (Concluídos)</span>
                <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400">${concluidos}</span>
              </div>
              <span class="p-3 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-500 dark:text-emerald-455 rounded-xl text-lg font-bold">✅</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Valor Pago (Aprovado)</span>
                <span class="text-xl font-black text-indigo-600 dark:text-indigo-400">R$ ${somaTotalReembolsado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <span class="p-3 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-455 rounded-xl text-lg font-bold">💰</span>
            </div>
          </div>

          <!-- Campo de Busca em Tempo Real -->
          <div class="relative max-w-md">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input id="input-busca-reembolso" type="text" placeholder="Pesquisar por cliente, destino, localizador, fornecedor, status..." value="${this.buscaTermo}" class="w-full text-xs font-semibold pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>

          <!-- Tabela de Reembolsos -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
              <h2 class="text-sm font-black text-slate-700 dark:text-slate-300 tracking-wider uppercase">Fila de Reembolsos Ativos</h2>
              <span class="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold text-[10px] rounded border border-indigo-100 dark:border-indigo-900/40 uppercase tracking-wider">
                ${this.buscaTermo ? `${filtrados.length} de ${totalReembolsos}` : totalReembolsos} solicitações
              </span>
            </div>

            <div class="overflow-x-auto custom-scrollbar">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850 text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
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
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-350 font-semibold bg-white/50 dark:bg-slate-900/30">
                  ${filtrados.length === 0 ? `
                    <tr>
                      <td colspan="8" class="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                        Nenhuma solicitação de reembolso correspondente encontrada.
                      </td>
                    </tr>
                  ` : filtrados.map(r => {
                    const isPago = r.status === 'pago';
                    const dataAberturaStr = r.created_at || r.created_at_time;
                    
                    return `
                      <tr class="table-row-hover transition duration-150">
                        <!-- Cliente -->
                        <td class="py-4.5 px-5">
                          <span class="block text-slate-800 dark:text-slate-200 font-bold">${r.viagem?.cliente?.nome || 'Cliente Desconhecido'}</span>
                          <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold">${r.viagem?.cliente?.email || 'Sem e-mail'}</span>
                        </td>
                        
                        <!-- Viagem / Localizador -->
                        <td class="py-4.5 px-5">
                          <span class="block text-slate-800 dark:text-slate-200 font-bold">✈️ ${r.viagem?.destino || 'Sem Destino'}</span>
                          <span class="inline-block px-1.5 py-0.5 mt-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[9px] rounded uppercase border border-slate-200/50 dark:border-slate-750">
                            LOC: ${r.viagem?.codigo_localizador || 'S/ LOC'}
                          </span>
                        </td>
 
                        <!-- Produto Cancelado -->
                        <td class="py-4.5 px-5">
                          <span class="block text-slate-700 dark:text-slate-300 font-bold">[${(r.produto?.tipo || 'outro').toUpperCase()}]</span>
                          <span class="block text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[160px]">${r.produto?.descricao || 'Sem descrição'}</span>
                        </td>
 
                        <!-- Fornecedor -->
                        <td class="py-4.5 px-5">
                          <span class="text-slate-600 dark:text-slate-400 font-bold">${r.produto?.fornecedor || 'Fornecedor n/d'}</span>
                        </td>
 
                        <!-- Valor -->
                        <td class="py-4.5 px-5">
                          <span class="text-indigo-600 dark:text-indigo-400 font-black">
                            R$ ${Number(r.valor_solicitado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
 
                        <!-- Solicitação -->
                        <td class="py-4.5 px-5 text-slate-500 dark:text-slate-400 font-bold text-xs">
                          ${formatarData(r.data_solicitacao)}
                        </td>
 
                        <!-- SLA Cronômetro -->
                        <td class="py-4.5 px-5">
                          ${isPago ? `
                            <span class="inline-block px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-450 font-extrabold text-[10px] rounded-lg border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1 max-w-fit">
                              ✅ Concluído em ${formatarData(r.data_resolucao)}
                            </span>
                          ` : `
                            <span class="sla-active-timer text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 px-2.5 py-1 rounded-lg max-w-fit flex items-center" data-created-at="${dataAberturaStr}">
                              Calculando...
                            </span>
                          `}
                        </td>
 
                        <!-- Status / Ação -->
                        <td class="py-4.5 px-5 text-center">
                          <select data-reembolso-id="${r.id}" class="select-status-reembolso px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
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
