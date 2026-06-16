import { supabase, getSessaoAtual } from '../services/supabase';
import { Orcamento, Viagem, PerfilConsultor } from '../types';
import { getAvatarSvg, mesclarAvataresLocais } from '../services/avatars';
import { showCustomConfirm } from '../services/dialog';

// Injeta estilos específicos premium para o Dashboard de Relatórios
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .dashboard-glass {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    html.dark .dashboard-glass {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(51, 65, 85, 0.5);
    }
    .dashboard-glass:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 20px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03);
    }
    html.dark .dashboard-glass:hover {
      box-shadow: 0 12px 24px -3px rgba(0, 0, 0, 0.35), 0 4px 8px -2px rgba(0, 0, 0, 0.25);
    }
    .kpi-card {
      position: relative;
      overflow: hidden;
    }
    .kpi-card::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%);
      pointer-events: none;
      transition: all 0.5s ease;
      opacity: 0;
    }
    .kpi-card:hover::after {
      top: -20%;
      left: -20%;
      opacity: 1;
    }
    @keyframes drawDonut {
      to { stroke-dashoffset: 0; }
    }
    .donut-segment {
      transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease, stroke-width 0.2s ease;
      cursor: pointer;
    }
    .donut-segment:hover {
      stroke-width: 7.5;
    }
    @keyframes progressFill {
      from { width: 0%; }
    }
    .funnel-bar-fill {
      animation: progressFill 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `;
  document.head.appendChild(style);
}

type PeriodType = 'mes_atual' | '30_dias' | '90_dias' | 'ano_atual' | 'todo_periodo';

export class ComercialDashboard {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  
  // Dados brutos carregados
  private orcamentos: Orcamento[] = [];
  private viagens: Viagem[] = [];
  private consultores: PerfilConsultor[] = [];
  
  // Estados de filtros
  private selectedPeriod: PeriodType = 'mes_atual';
  private selectedConsultantId: string = 'todos'; // 'todos' ou ID específico (apenas para admins)
  
  // Auxiliares de carregamento/offline
  private isFallbackMode: boolean = false;
  private realtimeChannel: any = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa o Dashboard: valida autenticação, busca dados e renderiza
   */
  public async init(): Promise<void> {
    try {
      // 1. Validar autenticação e perfil
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Por favor, faça login.');
        return;
      }
      this.user = user;
      this.perfil = perfil;

      // 2. Carregar dados (consultores, orçamentos, viagens)
      await this.loadConsultores();
      await this.loadData();

      // 3. Configurar atualizações em tempo real (Supabase Realtime e localStorage)
      this.setupRealtime();
      this.setupStorageListener();

      // 4. Renderizar interface principal
      this.render();
      this.setupEventListeners();

    } catch (err: any) {
      console.error('Erro na inicialização do Dashboard Comercial:', err);
      this.renderAuthError(`Ocorreu um erro interno: ${err.message}`);
    }
  }

  /**
   * Configura canal em tempo real do Supabase para atualizar o Dashboard automaticamente
   */
  private setupRealtime(): void {
    if (this.realtimeChannel) return;

    this.realtimeChannel = supabase
      .channel('comercial-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orcamentos' },
        async (payload: any) => {
          console.log('[ComercialDashboard] Realtime update on orcamentos:', payload.eventType);
          await this.loadData();
          this.renderMetricsSection();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viagens' },
        async (payload: any) => {
          console.log('[ComercialDashboard] Realtime update on viagens:', payload.eventType);
          await this.loadData();
          this.renderMetricsSection();
        }
      )
      .subscribe();
  }

  /**
   * Configura ouvinte para sincronização do localStorage entre abas
   */
  private setupStorageListener(): void {
    if (this.storageListener) return;

    this.storageListener = (e: StorageEvent) => {
      const keyOrc = `paxflow-orcamentos-${this.user?.id || 'global'}`;
      if (e.key === keyOrc) {
        console.log('[ComercialDashboard] localStorage update detected. Reloading...');
        if (this.isFallbackMode) {
          this.loadDataFromLocalStorage();
          this.renderMetricsSection();
        } else {
          this.loadData().then(() => this.renderMetricsSection());
        }
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  /**
   * Destrutor da página (caso precise limpar timers/ouvintes)
   */
  public destroy(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
  }

  /**
   * Busca todos os consultores cadastrados (apenas admins)
   */
  private async loadConsultores(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;

      this.consultores = mesclarAvataresLocais(data || []) as PerfilConsultor[];
    } catch (err: any) {
      console.warn('Erro ao carregar consultores para filtros (usando fallback):', err.message);
      this.consultores = [
        {
          id: this.user?.id || 'me',
          nome: this.perfil?.nome || 'Você',
          email: this.perfil?.email || '',
          role: this.perfil?.role || 'consultor',
          ativo: true
        }
      ];
    }
  }

  /**
   * Carrega os orçamentos e viagens com tratamento de fallback local/offline
   */
  private async loadData(): Promise<void> {
    try {
      // 1. Carregar Orçamentos do banco
      let queryOrc = supabase.from('orcamentos').select('*');
      
      // Consultor comum só vê seus próprios dados
      if (this.perfil && this.perfil.role !== 'admin') {
        queryOrc = queryOrc.eq('consultor_id', this.user.id);
      }
      const { data: dataOrc, error: errOrc } = await queryOrc;
      if (errOrc) throw errOrc;

      this.orcamentos = (dataOrc || []).map(d => ({
        id: d.id,
        consultorId: d.consultor_id,
        clienteId: d.cliente_id,
        cliente_id: d.cliente_id,
        nomeCliente: d.nome_cliente,
        contato: d.contato,
        destino: d.destino,
        dataViagem: d.data_viagem,
        temperatura: d.temperatura,
        tags: d.tags || [],
        status: d.status,
        subStatus: d.sub_status,
        notasNegociacao: d.notas_negociacao,
        valorProposta: d.valor_proposta !== null && d.valor_proposta !== undefined ? Number(d.valor_proposta) : undefined,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
        // Persist orcamentos to localStorage
        const keyOrc = `paxflow-orcamentos-${this.user?.id || 'global'}`;
        localStorage.setItem(keyOrc, JSON.stringify(this.orcamentos));

      // 2. Carregar Viagens do banco
      let queryVia = supabase.from('viagens').select('*');
      
      if (this.perfil && this.perfil.role !== 'admin') {
        queryVia = queryVia.eq('consultor_id', this.user.id);
      }
      const { data: dataVia, error: errVia } = await queryVia;
      if (errVia) throw errVia;

      this.viagens = (dataVia || []).map(d => ({
        id: d.id,
        clienteId: d.cliente_id,
        consultorId: d.consultor_id,
        destino: d.destino,
        dataIda: d.data_ida,
        dataVolta: d.data_volta,
        valorTotal: d.valor_total ? Number(d.valor_total) : 0,
        status: d.status,
        codigoLocalizador: d.codigo_localizador,
        observacoes: d.observacoes,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
        // Persist viagens to localStorage
        localStorage.setItem('paxflow-viagens-local', JSON.stringify(this.viagens));
        // Persist viagens to localStorage
        localStorage.setItem('paxflow-viagens-local', JSON.stringify(this.viagens));

  
    } catch (err: any) {
      console.warn('Ativando fallback offline no Dashboard: obtendo do LocalStorage.', err.message);
      this.isFallbackMode = true;
      this.loadDataFromLocalStorage();
    }
  }

  /**
   * Recupera dados salvos localmente
   */
  private loadDataFromLocalStorage(): void {
    // Orçamentos
    const keyOrc = `paxflow-orcamentos-${this.user?.id || 'global'}`;
    const savedOrc = localStorage.getItem(keyOrc);
    if (savedOrc) {
      try {
        const parsed = JSON.parse(savedOrc);
        const mapped = (parsed || []).map((d: any) => ({
          id: d.id,
          consultorId: d.consultor_id || d.consultorId,
          clienteId: d.cliente_id || d.clienteId,
          cliente_id: d.cliente_id || d.clienteId,
          nomeCliente: d.nome_cliente || d.nomeCliente,
          contato: d.contato,
          destino: d.destino,
          dataViagem: d.data_viagem || d.dataViagem,
          temperatura: d.temperatura,
          tags: d.tags || [],
          status: d.status,
          subStatus: d.sub_status || d.subStatus,
          notasNegociacao: d.notas_negociacao || d.notasNegociacao,
          valorProposta: d.valor_proposta !== undefined ? Number(d.valor_proposta) : (d.valorProposta !== undefined ? Number(d.valorProposta) : undefined),
          createdAt: d.created_at || d.createdAt,
          updatedAt: d.updated_at || d.updatedAt
        }));
        this.orcamentos = (this.perfil && this.perfil.role !== 'admin')
          ? mapped.filter((o: any) => o.consultorId === this.user.id)
          : mapped;
      } catch (e) {
        this.orcamentos = [];
      }
    }

    // Viagens
    const savedVia = localStorage.getItem('paxflow-viagens-local'); // Se houver
    if (savedVia) {
      try {
        const parsed = JSON.parse(savedVia);
        const mapped = (parsed || []).map((d: any) => ({
          id: d.id,
          clienteId: d.cliente_id || d.clienteId,
          consultorId: d.consultor_id || d.consultorId,
          destino: d.destino,
          dataIda: d.data_ida || d.dataIda,
          dataVolta: d.data_volta || d.dataVolta,
          valorTotal: d.valor_total !== undefined ? Number(d.valor_total) : (d.valorTotal !== undefined ? Number(d.valorTotal) : 0),
          status: d.status,
          codigoLocalizador: d.codigo_localizador || d.codigoLocalizador,
          observacoes: d.observacoes,
          createdAt: d.created_at || d.createdAt,
          updatedAt: d.updated_at || d.updatedAt
        }));
        this.viagens = (this.perfil && this.perfil.role !== 'admin')
          ? mapped.filter((v: any) => v.consultorId === this.user.id)
          : mapped;
      } catch (e) {
        this.viagens = [];
      }
    } else {
      // Mock de viagens base
      this.viagens = [
        {
          id: 'v1',
          clienteId: 'c1',
          consultorId: this.user?.id || 'me',
          destino: 'Orlando, EUA',
          dataIda: '2026-11-15',
          dataVolta: '2026-11-28',
          valorTotal: 18450,
          status: 'confirmada',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'v2',
          clienteId: 'c2',
          consultorId: this.user?.id || 'me',
          destino: 'Roma, Itália',
          dataIda: '2027-04-10',
          dataVolta: '2027-04-22',
          valorTotal: 24300,
          status: 'planejamento',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    }
  }

  /**
   * Aplica filtros temporais (Intervalo) e filtros por consultor aos registros carregados
   */
  private filterRecords(): { filteredOrc: Orcamento[]; filteredVia: Viagem[] } {
    const now = new Date();
    
    // 1. Filtragem por consultor
    let tempOrc = this.orcamentos;
    let tempVia = this.viagens;

    // Se admin, filtra pelo consultor selecionado no dropdown
    if (this.perfil?.role === 'admin' && this.selectedConsultantId !== 'todos') {
      tempOrc = tempOrc.filter(o => o.consultorId === this.selectedConsultantId);
      tempVia = tempVia.filter(v => v.consultorId === this.selectedConsultantId);
    }

    // 2. Filtragem por período temporal
    const filterByDate = (dateStr?: string): boolean => {
      if (!dateStr) return false;
      const recordDate = new Date(dateStr);
      
      switch (this.selectedPeriod) {
        case 'mes_atual':
          return (
            recordDate.getFullYear() === now.getFullYear() &&
            recordDate.getMonth() === now.getMonth()
          );
        case '30_dias': {
          const cutOff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return recordDate >= cutOff30 && recordDate <= now;
        }
        case '90_dias': {
          const cutOff90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          return recordDate >= cutOff90 && recordDate <= now;
        }
        case 'ano_atual':
          return recordDate.getFullYear() === now.getFullYear();
        case 'todo_periodo':
        default:
          return true;
      }
    };

    return {
      filteredOrc: tempOrc.filter(o => filterByDate(o.createdAt)),
      filteredVia: tempVia.filter(v => filterByDate(v.createdAt))
    };
  }

  /**
   * Associa os eventos interativos dos seletores
   */
  private setupEventListeners(): void {
    // Filtro de Período
    const selectPeriodo = document.getElementById('select-dashboard-periodo') as HTMLSelectElement;
    selectPeriodo?.addEventListener('change', () => {
      this.selectedPeriod = selectPeriodo.value as PeriodType;
      this.renderMetricsSection();
    });

    // Filtro de Consultor (apenas Admins)
    const selectConsultor = document.getElementById('select-dashboard-consultor') as HTMLSelectElement;
    selectConsultor?.addEventListener('change', () => {
      this.selectedConsultantId = selectConsultor.value;
      this.renderMetricsSection();
    });
  }

  /**
   * Renderiza a carcaça/estrutura fixa da página com o cabeçalho e seletores
   */
  private render(): void {
    const isAdmin = this.perfil?.role === 'admin';

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
               <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-auto object-contain md:hidden" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <span>Dashboard de Resultados</span>
                ${this.isFallbackMode ? `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-450 border border-amber-500/30 text-[10px] font-black rounded-lg uppercase tracking-wider">Modo Offline</span>` : ''}
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Sumarizador financeiro, gaps de propostas e taxa de conversão</p>
            </div>
          </div>
          
          <!-- Filtros de Dashboard & Perfil -->
          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
            
            <!-- Seletor de Período -->
            <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm">
              <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-550 select-none">Período:</span>
              <select id="select-dashboard-periodo" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer">
                <option value="mes_atual" ${this.selectedPeriod === 'mes_atual' ? 'selected' : ''}>Mês Atual</option>
                <option value="30_dias" ${this.selectedPeriod === '30_dias' ? 'selected' : ''}>Últimos 30 dias</option>
                <option value="90_dias" ${this.selectedPeriod === '90_dias' ? 'selected' : ''}>Últimos 90 dias</option>
                <option value="ano_atual" ${this.selectedPeriod === 'ano_atual' ? 'selected' : ''}>Ano Atual</option>
                <option value="todo_periodo" ${this.selectedPeriod === 'todo_periodo' ? 'selected' : ''}>Todo o Período</option>
              </select>
            </div>

            <!-- Seletor de Consultores (Apenas para Admins) -->
            ${isAdmin ? `
              <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-550 select-none">Equipe:</span>
                <select id="select-dashboard-consultor" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer max-w-[150px]">
                  <option value="todos" ${this.selectedConsultantId === 'todos' ? 'selected' : ''}>Todos os Consultores</option>
                  ${this.consultores.map(c => `<option value="${c.id}" ${this.selectedConsultantId === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>
        </header>

        <!-- Corpo Principal de Conteúdo Analítico -->
        <main class="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar" id="dashboard-metrics-container">
          <!-- Injetado dinamicamente via renderMetricsSection -->
        </main>
      </div>
    `;

    // Renderiza inicialmente a seção de métricas com base nos filtros atuais
    this.renderMetricsSection();
  }

  /**
   * Renderiza a seção inteira de KPIs, Gráficos e Tabelas recalculados reativamente
   */
  private renderMetricsSection(): void {
    const metricsContainer = document.getElementById('dashboard-metrics-container');
    if (!metricsContainer) return;

    // 1. Aplica filtros
    const { filteredOrc, filteredVia } = this.filterRecords();

    // 2. Executa cálculos
    // A. Realizado (Viagens confirmadas/concluídas/planejadas - tirando as canceladas)
    const viagensAtivas = filteredVia.filter(v => v.status !== 'cancelada');
    const faturamentoRealizado = viagensAtivas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);

    // B. Pipeline Ativo (Orçamentos em andamento/cotação)
    const orcamentosAtivos = filteredOrc.filter(o => o.status === 'SOLICITADO' || o.status === 'EM_ANDAMENTO' || o.status === 'AGUARDANDO');
    const faturamentoPipeline = orcamentosAtivos.reduce((acc, o) => acc + (o.valorProposta || 0), 0);

    // C. Gap de Desistências (Orçamentos finalizados com desistência)
    const orcamentosDesistentes = filteredOrc.filter(o => o.status === 'CONCLUIDO' && o.subStatus === 'DESISTENCIA');
    const faturamentoGap = orcamentosDesistentes.reduce((acc, o) => acc + (o.valorProposta || 0), 0);

    // D. Taxa de Conversão
    // Conversão = (Orçamentos Ganhos / Total de Orçamentos Concluídos) * 100
    const orcamentosGanhos = filteredOrc.filter(o => o.status === 'CONCLUIDO' && o.subStatus === 'ACEITO');
    const orcamentosConcluidos = filteredOrc.filter(o => o.status === 'CONCLUIDO');
    
    let taxaConversao = 0;
    if (orcamentosConcluidos.length > 0) {
      taxaConversao = (orcamentosGanhos.length / orcamentosConcluidos.length) * 100;
    } else if (orcamentosGanhos.length > 0) {
      // Caso haja ganho mas os status estejam ligeiramente inconsistentes
      taxaConversao = 100;
    }

    // Proporções para o gráfico donut
    const volumeTotalFinanceiro = faturamentoRealizado + faturamentoPipeline + faturamentoGap;
    const pctRealizado = volumeTotalFinanceiro > 0 ? (faturamentoRealizado / volumeTotalFinanceiro) * 100 : 0;
    const pctPipeline = volumeTotalFinanceiro > 0 ? (faturamentoPipeline / volumeTotalFinanceiro) * 100 : 0;
    const pctGap = volumeTotalFinanceiro > 0 ? (faturamentoGap / volumeTotalFinanceiro) * 100 : 0;

    // 3. Montar HTML de Métricas
    metricsContainer.innerHTML = `
      <!-- GRID DE CARDS KPI PREMIUM -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- CARD: FATURAMENTO REALIZADO -->
        <div class="kpi-card dashboard-glass rounded-3xl p-6 relative overflow-hidden select-none border-l-4 border-l-indigo-500">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Faturamento Realizado</span>
            <div class="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl text-lg">💰</div>
          </div>
          <div class="mt-4">
            <span class="block text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              R$ ${faturamentoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="block text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-1">
              Reflete vendas ganhas convertidas em viagens
            </span>
          </div>
        </div>

        <!-- CARD: PIPELINE ATIVO -->
        <div class="kpi-card dashboard-glass rounded-3xl p-6 relative overflow-hidden select-none border-l-4 border-l-amber-500">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pipeline Ativo</span>
            <div class="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl text-lg">🔥</div>
          </div>
          <div class="mt-4">
            <span class="block text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              R$ ${faturamentoPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="block text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-1">
              Valores em negociação e propostas abertas
            </span>
          </div>
        </div>

        <!-- CARD: GAP DE DESISTÊNCIA -->
        <div class="kpi-card dashboard-glass rounded-3xl p-6 relative overflow-hidden select-none border-l-4 border-l-rose-500">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gap de Desistência</span>
            <div class="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl text-lg">⚠️</div>
          </div>
          <div class="mt-4">
            <span class="block text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              R$ ${faturamentoGap.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="block text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-1">
              Fuga de caixa por cotações não fechadas
            </span>
          </div>
        </div>

        <!-- CARD: TAXA DE CONVERSÃO -->
        <div class="kpi-card dashboard-glass rounded-3xl p-6 relative overflow-hidden select-none border-l-4 border-l-emerald-500">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Conversão Comercial</span>
            <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl text-lg">📈</div>
          </div>
          <div class="mt-4">
            <span class="block text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              ${taxaConversao.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </span>
            <span class="block text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-1">
              ${orcamentosGanhos.length} fechamentos de ${orcamentosConcluidos.length} decididos
            </span>
          </div>
        </div>

      </section>

      <!-- SEÇÃO GRÁFICA: ROSCA DE GAPS + FUNIL DE CONVERSÃO -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- COLUNA 1: GRÁFICO DE ROSCA (DONUT) -->
        <div class="dashboard-glass rounded-3xl p-6 flex flex-col justify-between select-none">
          <div>
            <h3 class="text-sm font-black text-slate-850 dark:text-slate-100">Distribuição Comercial do Caixa</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Comparativo entre faturamento real, potencial e o gap de perdas</p>
          </div>
          
          <div class="flex flex-col sm:flex-row items-center justify-center gap-8 py-6 my-auto">
            <!-- SVG Donut -->
            <div class="relative w-48 h-48 flex items-center justify-center shrink-0">
              ${volumeTotalFinanceiro > 0 ? this.renderDonutChart(pctRealizado, pctPipeline, pctGap) : `
                <div class="w-full h-full border-4 border-dashed border-slate-200 dark:border-slate-850 rounded-full flex flex-col items-center justify-center text-center p-4">
                  <span class="text-xl">📊</span>
                  <span class="text-[10px] text-slate-400 font-bold mt-1 uppercase">Sem dados financeiros</span>
                </div>
              `}
              
              <!-- Texto Central do Donut -->
              <div class="absolute flex flex-col items-center justify-center text-center">
                <span class="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">Volume Total</span>
                <span class="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  R$ ${(volumeTotalFinanceiro > 1000000 ? (volumeTotalFinanceiro / 1000000).toFixed(2) + 'M' : volumeTotalFinanceiro.toLocaleString('pt-BR', { maximumFractionDigits: 0 }))}
                </span>
              </div>
            </div>

            <!-- Legendas e Porcentagens -->
            <div class="flex flex-col gap-3 w-full sm:w-auto">
              <!-- Item 1: Realizado -->
              <div class="flex items-center gap-3">
                <div class="w-3.5 h-3.5 rounded-lg bg-indigo-500 shrink-0"></div>
                <div class="flex-1">
                  <span class="block text-xs font-black text-slate-700 dark:text-slate-250 leading-none">Realizado</span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 block">
                    R$ ${faturamentoRealizado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${pctRealizado.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <!-- Item 2: Pipeline -->
              <div class="flex items-center gap-3">
                <div class="w-3.5 h-3.5 rounded-lg bg-amber-500 shrink-0"></div>
                <div class="flex-1">
                  <span class="block text-xs font-black text-slate-700 dark:text-slate-250 leading-none">Pipeline Ativo</span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 block">
                    R$ ${faturamentoPipeline.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${pctPipeline.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <!-- Item 3: Gap -->
              <div class="flex items-center gap-3">
                <div class="w-3.5 h-3.5 rounded-lg bg-rose-500 shrink-0"></div>
                <div class="flex-1">
                  <span class="block text-xs font-black text-slate-700 dark:text-slate-250 leading-none">Desistências</span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 block">
                    R$ ${faturamentoGap.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${pctGap.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- COLUNA 2: FUNIL DE VENDAS -->
        <div class="dashboard-glass rounded-3xl p-6 flex flex-col select-none justify-between">
          <div>
            <h3 class="text-sm font-black text-slate-850 dark:text-slate-100">Funil de Conversão Comercial</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Fluxo de volume e valor das captações de orçamentos</p>
          </div>
          
          <div class="py-4 my-auto">
            ${this.renderFunnel(filteredOrc, orcamentosGanhos.length)}
          </div>
        </div>

      </section>

      <!-- SEÇÃO EXCLUSIVA DE ADMINS: PERFORMANCE DE CONSULTOR -->
      ${this.perfil?.role === 'admin' ? this.renderConsultantPerformanceTable(filteredOrc, filteredVia) : ''}
    `;
  }

  /**
   * Renders the Donut Chart using modern, clean SVG based on calculated percentages
   */
  private renderDonutChart(pctRealizado: number, pctPipeline: number, pctGap: number): string {
    // Para um donut de raio 15.91549430918954, a circunferência é exatamente 100.
    // Assim, o stroke-dasharray é diretamente correspondente à porcentagem!
    
    // Tratamento para evitar que se divida tudo se não houver faturamento
    let realVal = pctRealizado;
    let pipeVal = pctPipeline;
    let gapVal = pctGap;

    if (pctRealizado === 0 && pctPipeline === 0 && pctGap === 0) {
      realVal = 100;
    }

    // Calcula os offsets acumulados
    const offsetReal = 25; // Começa no topo (25 é o offset para começar a 0 graus)
    const offsetPipe = 25 - realVal;
    const offsetGap = 25 - realVal - pipeVal;

    return `
      <svg viewBox="0 0 42 42" class="w-full h-full transform -rotate-90">
        <!-- Background Track -->
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" class="dark:stroke-slate-850" stroke-width="4.5" />
        
        <!-- Segment 1: Realizado (Indigo) -->
        ${pctRealizado > 0 ? `
          <circle cx="21" cy="21" r="15.915" fill="transparent" 
            stroke="#6366f1" stroke-width="5" 
            stroke-dasharray="${realVal} ${100 - realVal}" 
            stroke-dashoffset="${offsetReal}"
            class="donut-segment" />
        ` : ''}

        <!-- Segment 2: Pipeline (Amber) -->
        ${pctPipeline > 0 ? `
          <circle cx="21" cy="21" r="15.915" fill="transparent" 
            stroke="#f59e0b" stroke-width="5" 
            stroke-dasharray="${pipeVal} ${100 - pipeVal}" 
            stroke-dashoffset="${offsetPipe}"
            class="donut-segment" />
        ` : ''}

        <!-- Segment 3: Gap/Desistência (Rose) -->
        ${pctGap > 0 ? `
          <circle cx="21" cy="21" r="15.915" fill="transparent" 
            stroke="#f43f5e" stroke-width="5" 
            stroke-dasharray="${gapVal} ${100 - gapVal}" 
            stroke-dashoffset="${offsetGap}"
            class="donut-segment" />
        ` : ''}
      </svg>
    `;
  }

  /**
   * Renders the conversion funnel using beautiful, CSS-styled responsive bars
   */
  private renderFunnel(orcamentos: Orcamento[], ganhosCount: number): string {
    const total = orcamentos.length;
    
    // Contagem por status
    const solicitado = orcamentos.filter(o => o.status === 'SOLICITADO').length;
    const emAndamento = orcamentos.filter(o => o.status === 'EM_ANDAMENTO').length;
    const aguardando = orcamentos.filter(o => o.status === 'AGUARDANDO').length;

    // Valores financeiros totais
    const valorTotalFunnel = orcamentos.reduce((acc, o) => acc + (o.valorProposta || 0), 0);

    // Contadores cumulativos de passagem
    // 1. Solicitado (Entrada total de Leads no funil)
    const t1_leads = total; 
    // 2. Em Cotação (Passaram de Solicitado para Em Andamento ou adiante)
    const t2_cotacao = total - solicitado;
    // 3. Negociação (Passaram para Aguardando Proposta ou Ganho)
    const t3_negociacao = total - solicitado - emAndamento;
    // 4. Ganho (Concluído Aceito)
    const t4_ganho = ganhosCount;

    // Percentuais de largura dos cards
    const w1 = 100;
    const w2 = t1_leads > 0 ? (t2_cotacao / t1_leads) * 100 : 0;
    const w3 = t2_cotacao > 0 ? (t3_negociacao / t2_cotacao) * 100 : 0;
    const w4 = t3_negociacao > 0 ? (t4_ganho / t3_negociacao) * 100 : 0;

    // Percentuais absolutos para largura visual do funil (tapering width relative to Stage 1)
    const width1 = 100;
    const width2 = w2;
    const width3 = t1_leads > 0 ? (t3_negociacao / t1_leads) * 100 : 0;
    const width4 = t1_leads > 0 ? (t4_ganho / t1_leads) * 100 : 0;

    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

    if (total === 0) {
      return `
        <div class="h-44 border-4 border-dashed border-slate-200 dark:border-slate-850 rounded-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
          <span class="text-2xl">📋</span>
          <span class="text-xs text-slate-400 font-bold mt-1.5 uppercase">Sem dados para montar o funil</span>
        </div>
      `;
    }

    return `
      <div class="flex flex-col gap-4">
        <!-- Nível 1: Captação/Solicitado -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide">
            <span>1. Captação (Total)</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${t1_leads} orçamentos &bull; R$ ${formatBRL(valorTotalFunnel)}</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-850 h-7 rounded-xl overflow-hidden relative">
            <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-xl funnel-bar-fill transition-all duration-300" style="width: ${width1}%"></div>
            <span class="absolute inset-0 flex items-center pl-3.5 text-[10px] font-black text-white select-none">100% dos Leads</span>
          </div>
        </div>

        <!-- Nível 2: Cotação/Em Andamento -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide">
            <span>2. Cotações / Elaboração</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${t2_cotacao} orçamentos (${(t1_leads > 0 ? (t2_cotacao/t1_leads)*100 : 0).toFixed(0)}% avanço)</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-850 h-7 rounded-xl overflow-hidden relative">
            <div class="bg-gradient-to-r from-violet-500 to-violet-650 h-full rounded-xl funnel-bar-fill transition-all duration-300" style="width: ${width2 > 0 ? Math.max(width2, 10) : 0}%"></div>
            <span class="absolute inset-0 flex items-center pl-3.5 text-[10px] font-black ${w2 > 35 ? 'text-white' : 'text-slate-650 dark:text-slate-350'} select-none">${w2.toFixed(0)}% do volume</span>
          </div>
        </div>

        <!-- Nível 3: Apresentado/Aguardando -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wide">
            <span>3. Proposta Enviada</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${t3_negociacao} orçamentos (${(t2_cotacao > 0 ? (t3_negociacao/t2_cotacao)*100 : 0).toFixed(0)}% avanço)</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-850 h-7 rounded-xl overflow-hidden relative">
            <div class="bg-gradient-to-r from-purple-500 to-purple-650 h-full rounded-xl funnel-bar-fill transition-all duration-300" style="width: ${width3 > 0 ? Math.max(width3, 10) : 0}%"></div>
            <span class="absolute inset-0 flex items-center pl-3.5 text-[10px] font-black ${w3 > 35 ? 'text-white' : 'text-slate-650 dark:text-slate-350'} select-none">${w3.toFixed(0)}% de cotações</span>
          </div>
        </div>

        <!-- Nível 4: Ganho -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide">
            <span>4. Negócios Fechados</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${t4_ganho} fechamentos (${(t3_negociacao > 0 ? (t4_ganho/t3_negociacao)*100 : 0).toFixed(0)}% conversão final)</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-850 h-7 rounded-xl overflow-hidden relative">
            <div class="bg-gradient-to-r from-emerald-500 to-emerald-650 h-full rounded-xl funnel-bar-fill transition-all duration-300" style="width: ${width4 > 0 ? Math.max(width4, 10) : 0}%"></div>
            <span class="absolute inset-0 flex items-center pl-3.5 text-[10px] font-black ${w4 > 35 ? 'text-white' : 'text-slate-650 dark:text-slate-350'} select-none">${w4.toFixed(0)}% conversão</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the consultant comparative performance table (exclusively for admins)
   */
  private renderConsultantPerformanceTable(orcamentos: Orcamento[], viagens: Viagem[]): string {
    // Agrupar métricas por consultor
    const rankingMap = new Map<string, {
      nome: string;
      email: string;
      avatarUrl?: string;
      orcCriados: number;
      orcGanhos: number;
      orcConcluidos: number;
      valProposto: number;
      valVendido: number;
      valGap: number;
    }>();

    // Inicializa a lista de consultores para que mesmo sem dados eles apareçam na lista
    this.consultores.forEach(c => {
      rankingMap.set(c.id, {
        nome: c.nome,
        email: c.email,
        avatarUrl: c.avatar_url,
        orcCriados: 0,
        orcGanhos: 0,
        orcConcluidos: 0,
        valProposto: 0,
        valVendido: 0,
        valGap: 0
      });
    });

    // 1. Processar dados de orçamentos por consultor
    orcamentos.forEach(o => {
      if (!o.consultorId) return;
      let metrics = rankingMap.get(o.consultorId);
      if (!metrics) {
        metrics = {
          nome: 'Consultor Desconhecido',
          email: '',
          orcCriados: 0,
          orcGanhos: 0,
          orcConcluidos: 0,
          valProposto: 0,
          valVendido: 0,
          valGap: 0
        };
        rankingMap.set(o.consultorId, metrics);
      }
      
      metrics.orcCriados += 1;
      metrics.valProposto += o.valorProposta || 0;

      if (o.status === 'CONCLUIDO') {
        metrics.orcConcluidos += 1;
        if (o.subStatus === 'ACEITO') {
          metrics.orcGanhos += 1;
        } else if (o.subStatus === 'DESISTENCIA') {
          metrics.valGap += o.valorProposta || 0;
        }
      }
    });

    // 2. Processar dados de vendas (viagens) por consultor
    viagens.forEach(v => {
      if (!v.consultorId || v.status === 'cancelada') return;
      let metrics = rankingMap.get(v.consultorId);
      if (!metrics) {
        metrics = {
          nome: 'Consultor Desconhecido',
          email: '',
          orcCriados: 0,
          orcGanhos: 0,
          orcConcluidos: 0,
          valProposto: 0,
          valVendido: 0,
          valGap: 0
        };
        rankingMap.set(v.consultorId, metrics);
      }
      metrics.valVendido += v.valorTotal || 0;
    });

    // Converter map para array e ordenar pelo maior Faturamento de Viagens Vendidas
    const rankingArray = Array.from(rankingMap.values())
      .sort((a, b) => b.valVendido - a.valVendido);

    return `
      <!-- TABELA DE RENDIMENTO DA EQUIPE -->
      <section class="dashboard-glass rounded-3xl p-6 select-none overflow-x-auto">
        <div class="mb-4">
          <h3 class="text-sm font-black text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
            👥 Rendimento e Performance da Equipe
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Quadro comparativo de conversão, faturamento e gap financeiro de desistências</p>
        </div>

        <table class="w-full text-left border-collapse text-xs min-w-[700px]">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-850 text-[10px] text-slate-450 dark:text-slate-500 font-extrabold uppercase tracking-wider">
              <th class="py-3 pl-2">Consultor</th>
              <th class="py-3 text-center">Orçamentos</th>
              <th class="py-3 text-center">Conversão</th>
              <th class="py-3 text-right">Valor Proposto</th>
              <th class="py-3 text-right">Faturamento Realizado</th>
              <th class="py-3 text-right">Gap (Perdas)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-850 font-semibold">
            ${rankingArray.map((r, index) => {
              const conversion = r.orcConcluidos > 0 ? (r.orcGanhos / r.orcConcluidos) * 100 : (r.orcGanhos > 0 ? 100 : 0);
              
              // Estilização das medalhas ou ícones de colocação
              let placingIcon = `<span class="text-slate-400 dark:text-slate-500 w-5 block text-center">${index + 1}</span>`;
              if (index === 0 && r.valVendido > 0) placingIcon = `<span class="text-lg w-5 block text-center animate-bounce" title="Top 1 Vendedor">🥇</span>`;
              else if (index === 1 && r.valVendido > 0) placingIcon = `<span class="text-lg w-5 block text-center" title="Top 2 Vendedor">🥈</span>`;
              else if (index === 2 && r.valVendido > 0) placingIcon = `<span class="text-lg w-5 block text-center" title="Top 3 Vendedor">🥉</span>`;

              return `
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <td class="py-3.5 flex items-center gap-2.5">
                    ${placingIcon}
                    ${getAvatarSvg(r.avatarUrl, r.nome, 'w-8 h-8')}
                    <div>
                      <span class="block font-black text-slate-750 dark:text-slate-200 leading-snug">${r.nome}</span>
                      <span class="block text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide leading-none mt-0.5">${r.email}</span>
                    </div>
                  </td>
                  <td class="py-3.5 text-center text-slate-700 dark:text-slate-300">
                    ${r.orcCriados} criados
                  </td>
                  <td class="py-3.5 text-center">
                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      conversion >= 50 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/30'
                        : conversion >= 25
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/30 dark:border-amber-900/30'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/30 dark:border-rose-900/30'
                    }">
                      ${conversion.toFixed(1)}%
                    </span>
                  </td>
                  <td class="py-3.5 text-right text-slate-700 dark:text-slate-300">
                    R$ ${r.valProposto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td class="py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                    R$ ${r.valVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td class="py-3.5 text-right font-black text-rose-650 dark:text-rose-455">
                    R$ ${r.valGap.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </section>
    `;
  }

  /**
   * Renders the loading skeleton
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-8 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-semibold animate-pulse">Carregando métricas e relatórios do dashboard...</p>
      </div>
    `;
  }

  /**
   * Renders the generic authentication/load error view
   */
  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl shadow-xl text-center">
          <div class="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Erro de Acesso</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm mb-6">${msg}</p>
          <button id="btn-reload-dash-login" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition">
            Tentar Novamente
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('btn-reload-dash-login')?.addEventListener('click', () => {
      window.location.reload();
    });
  }
}
