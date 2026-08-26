import { supabase, getSessaoAtual } from '../services/supabase';
import { Orcamento, Viagem, PerfilConsultor, MetaPeriodo, MetaFaixa } from '../types';
import { getAvatarSvg, mesclarAvataresLocais } from '../services/avatars';
import { showCustomConfirm } from '../services/dialog';
import { MetasService } from '../services/metasService';
import { parseBrFloat } from '../services/csvImporter';
import { renderHelpIcon } from '../utils/helpHelper';

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
  private locPagamentos: any[] = [];
  private metas: MetaPeriodo[] = [];
  
  // Estados de filtros
  private selectedPeriod: PeriodType = 'mes_atual';
  private selectedConsultantId: string = 'todos'; // 'todos' ou ID específico (apenas para admins)
  private selectedMetaId: string = 'todas';
  
  // Auxiliares de carregamento/offline
  private isFallbackMode: boolean = false;
  private realtimeChannel: any = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private lastFetchedMetasTime: number = 0;
  private countdownInterval: any = null;

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
      await this.loadMetas();
      this.startMetasTimer();

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
      if (e.key === keyOrc || e.key === 'paxflow-viagens-local') {
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
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
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

      // 2. Carregar Viagens do banco para busca Co-Piloto e relatorios
      let queryVia = supabase.from('viagens').select('*, produtos:produtos_viagem(*)');
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
        updatedAt: d.updated_at,
        dataFinanceiro: d.data_financeiro,
        data_financeiro: d.data_financeiro,
        produtos: d.produtos || []
      }));
        // Persist viagens to localStorage
        localStorage.setItem('paxflow-viagens-local', JSON.stringify(this.viagens));

        // 3. Carregar Pagamentos e Formas de Recebimento
        this.locPagamentos = [];
        try {
          const { data: dataPags } = await supabase
            .from('loc_pagamentos')
            .select('*, formas_recebimento(*)');
          if (dataPags) {
            this.locPagamentos = dataPags;
            localStorage.setItem('paxflow-loc-pagamentos-dashboard', JSON.stringify(this.locPagamentos));
          }
        } catch (err) {
          console.warn('Erro ao carregar pagamentos no dashboard:', err);
        }
  
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
          updatedAt: d.updated_at || d.updatedAt,
          dataFinanceiro: d.data_financeiro || d.dataFinanceiro,
          data_financeiro: d.data_financeiro || d.dataFinanceiro
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

    const savedPags = localStorage.getItem('paxflow-loc-pagamentos-dashboard');
    if (savedPags) {
      try {
        this.locPagamentos = JSON.parse(savedPags);
      } catch (e) {
        this.locPagamentos = [];
      }
    } else {
      this.locPagamentos = [];
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
      // Se for apenas data YYYY-MM-DD, adiciona T00:00:00 para forçar parse no fuso horário local e evitar perdas de dia/mês
      const recordDate = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
      
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
      filteredVia: tempVia.filter(v => filterByDate(v.dataFinanceiro || v.createdAt))
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

    // Event delegation para elementos dinâmicos do metricsContainer (metas e refresh)
    this.container.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target && target.id === 'select-dashboard-meta-periodo') {
        const select = target as HTMLSelectElement;
        this.selectedMetaId = select.value;
        this.renderMetricsSection();
      }
    });

    this.container.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('#btn-refresh-metas') as HTMLButtonElement;
      if (btn) {
        const spanText = btn.querySelector('span');
        if (spanText) spanText.textContent = 'Recarregando...';
        else btn.innerHTML = '🔄 Recarregando...';
        
        await this.loadMetas(true);
        this.renderMetricsSection();
        this.showToast('Metas atualizadas com sucesso!', 'success');
      }
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
                ${this.isFallbackMode ? `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black rounded-lg uppercase tracking-wider">Modo Offline</span>` : ''}
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Sumarizador financeiro, gaps de propostas e taxa de conversão</p>
            </div>
          </div>
          
          <!-- Filtros de Dashboard & Perfil -->
          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
            
            <!-- Seletor de Período -->
            <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm">
              <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 select-none">Período:</span>
              <select id="select-dashboard-periodo" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-400 focus:outline-none cursor-pointer">
                <option value="mes_atual" ${this.selectedPeriod === 'mes_atual' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Mês Atual</option>
                <option value="30_dias" ${this.selectedPeriod === '30_dias' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Últimos 30 dias</option>
                <option value="90_dias" ${this.selectedPeriod === '90_dias' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Últimos 90 dias</option>
                <option value="ano_atual" ${this.selectedPeriod === 'ano_atual' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Ano Atual</option>
                <option value="todo_periodo" ${this.selectedPeriod === 'todo_periodo' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Todo o Período</option>
              </select>
            </div>

            <!-- Seletor de Consultores (Apenas para Admins) -->
            ${isAdmin ? `
              <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 select-none">Equipe:</span>
                <select id="select-dashboard-consultor" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-400 focus:outline-none cursor-pointer max-w-[150px]">
                  <option value="todos" ${this.selectedConsultantId === 'todos' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Todos os Consultores</option>
                  ${this.consultores.map(c => `<option value="${c.id}" ${this.selectedConsultantId === c.id ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${c.nome}</option>`).join('')}
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

    // A. Realizado (Viagens confirmadas/concluídas/planejadas - tirando as canceladas)
    const viagensAtivas = filteredVia.filter(v => v.status !== 'cancelada');
    
    // Subtrair pagamentos de desconto/prejuízo
    const activeViaIds = new Set(viagensAtivas.map(v => v.id));
    const pagsSub = this.locPagamentos.filter(p => 
      activeViaIds.has(p.viagem_id || p.viagemId) &&
      p.formas_recebimento &&
      ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
    );
    const totalSub = pagsSub.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    const faturamentoRealizado = Math.max(0, viagensAtivas.reduce((acc, v) => acc + (v.valorTotal || 0), 0) - totalSub);

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
      <!-- SEÇÃO METAS -->
      ${this.renderMetasSection()}

      <!-- GRID DE CARDS KPI PREMIUM -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- CARD: FATURAMENTO REALIZADO -->
        <div class="kpi-card dashboard-glass rounded-3xl p-6 relative overflow-hidden select-none border-l-4 border-l-indigo-500">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Faturamento Realizado</span>
            <div class="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl text-lg">💰</div>
          </div>
          <div class="mt-4">
            <span class="block text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              R$ ${faturamentoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="block text-[10px] text-slate-400 dark:text-slate-400 font-semibold mt-1">
              Reflete vendas ganhas convertidas em viagens
            </span>
          </div>
        </div>

        <!-- CARD: PIPELINE ATIVO -->
        <div class="kpi-card dashboard-glass rounded-3xl p-6 relative overflow-hidden select-none border-l-4 border-l-amber-500">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Pipeline Ativo</span>
            <div class="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl text-lg">🔥</div>
          </div>
          <div class="mt-4">
            <span class="block text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              R$ ${faturamentoPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="block text-[10px] text-slate-400 dark:text-slate-400 font-semibold mt-1">
              Valores em negociação e propostas abertas
            </span>
          </div>
        </div>

        <!-- CARD: GAP DE DESISTÊNCIA -->
        <div class="kpi-card dashboard-glass rounded-3xl p-6 relative overflow-hidden select-none border-l-4 border-l-rose-500">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Gap de Desistência</span>
            <div class="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl text-lg">⚠️</div>
          </div>
          <div class="mt-4">
            <span class="block text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              R$ ${faturamentoGap.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="block text-[10px] text-slate-400 dark:text-slate-400 font-semibold mt-1">
              Fuga de caixa por cotações não fechadas
            </span>
          </div>
        </div>

        <!-- CARD: TAXA DE CONVERSÃO -->
        <div class="kpi-card dashboard-glass rounded-3xl p-6 relative overflow-hidden select-none border-l-4 border-l-emerald-500">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Conversão Comercial</span>
            <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl text-lg">📈</div>
          </div>
          <div class="mt-4">
            <span class="block text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              ${taxaConversao.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </span>
            <span class="block text-[10px] text-slate-400 dark:text-slate-400 font-semibold mt-1">
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
            <h3 class="text-sm font-black text-slate-800 dark:text-slate-100">Distribuição Comercial do Caixa</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Comparativo entre faturamento real, potencial e o gap de perdas</p>
          </div>
          
          <div class="flex flex-col sm:flex-row items-center justify-center gap-8 py-6 my-auto">
            <!-- SVG Donut -->
            <div class="relative w-48 h-48 flex items-center justify-center shrink-0">
              ${volumeTotalFinanceiro > 0 ? this.renderDonutChart(pctRealizado, pctPipeline, pctGap) : `
                <div class="w-full h-full border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-full flex flex-col items-center justify-center text-center p-4">
                  <span class="text-xl">📊</span>
                  <span class="text-[10px] text-slate-400 font-bold mt-1 uppercase">Sem dados financeiros</span>
                </div>
              `}
              
              <!-- Texto Central do Donut -->
              <div class="absolute flex flex-col items-center justify-center text-center">
                <span class="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider">Volume Total</span>
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
                  <span class="block text-xs font-black text-slate-700 dark:text-slate-300 leading-none">Realizado</span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-400 font-semibold mt-0.5 block">
                    R$ ${faturamentoRealizado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${pctRealizado.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <!-- Item 2: Pipeline -->
              <div class="flex items-center gap-3">
                <div class="w-3.5 h-3.5 rounded-lg bg-amber-500 shrink-0"></div>
                <div class="flex-1">
                  <span class="block text-xs font-black text-slate-700 dark:text-slate-300 leading-none">Pipeline Ativo</span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-400 font-semibold mt-0.5 block">
                    R$ ${faturamentoPipeline.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (${pctPipeline.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <!-- Item 3: Gap -->
              <div class="flex items-center gap-3">
                <div class="w-3.5 h-3.5 rounded-lg bg-rose-500 shrink-0"></div>
                <div class="flex-1">
                  <span class="block text-xs font-black text-slate-700 dark:text-slate-300 leading-none">Desistências</span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-400 font-semibold mt-0.5 block">
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
            <h3 class="text-sm font-black text-slate-800 dark:text-slate-100">Funil de Conversão Comercial</h3>
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
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" class="dark:stroke-slate-800" stroke-width="4.5" />
        
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
        <div class="h-44 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
          <span class="text-2xl">📋</span>
          <span class="text-xs text-slate-400 font-bold mt-1.5 uppercase">Sem dados para montar o funil</span>
        </div>
      `;
    }

    return `
      <div class="flex flex-col gap-4">
        <!-- Nível 1: Captação/Solicitado -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide">
            <span>1. Captação (Total)</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${t1_leads} orçamentos &bull; R$ ${formatBRL(valorTotalFunnel)}</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-7 rounded-xl overflow-hidden relative">
            <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-xl funnel-bar-fill transition-all duration-300" style="width: ${width1}%"></div>
            <span class="absolute inset-0 flex items-center pl-3.5 text-[10px] font-black text-white select-none">100% dos Leads</span>
          </div>
        </div>

        <!-- Nível 2: Cotação/Em Andamento -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide">
            <span>2. Cotações / Elaboração</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${t2_cotacao} orçamentos (${(t1_leads > 0 ? (t2_cotacao/t1_leads)*100 : 0).toFixed(0)}% avanço)</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-7 rounded-xl overflow-hidden relative">
            <div class="bg-gradient-to-r from-violet-500 to-violet-700 h-full rounded-xl funnel-bar-fill transition-all duration-300" style="width: ${width2 > 0 ? Math.max(width2, 10) : 0}%"></div>
            <span class="absolute inset-0 flex items-center pl-3.5 text-[10px] font-black ${w2 > 35 ? 'text-white' : 'text-slate-600 dark:text-slate-400'} select-none">${w2.toFixed(0)}% do volume</span>
          </div>
        </div>

        <!-- Nível 3: Apresentado/Aguardando -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide">
            <span>3. Proposta Enviada</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${t3_negociacao} orçamentos (${(t2_cotacao > 0 ? (t3_negociacao/t2_cotacao)*100 : 0).toFixed(0)}% avanço)</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-7 rounded-xl overflow-hidden relative">
            <div class="bg-gradient-to-r from-purple-500 to-purple-700 h-full rounded-xl funnel-bar-fill transition-all duration-300" style="width: ${width3 > 0 ? Math.max(width3, 10) : 0}%"></div>
            <span class="absolute inset-0 flex items-center pl-3.5 text-[10px] font-black ${w3 > 35 ? 'text-white' : 'text-slate-600 dark:text-slate-400'} select-none">${w3.toFixed(0)}% de cotações</span>
          </div>
        </div>

        <!-- Nível 4: Ganho -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide">
            <span>4. Negócios Fechados</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${t4_ganho} fechamentos (${(t3_negociacao > 0 ? (t4_ganho/t3_negociacao)*100 : 0).toFixed(0)}% conversão final)</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-7 rounded-xl overflow-hidden relative">
            <div class="bg-gradient-to-r from-emerald-500 to-emerald-700 h-full rounded-xl funnel-bar-fill transition-all duration-300" style="width: ${width4 > 0 ? Math.max(width4, 10) : 0}%"></div>
            <span class="absolute inset-0 flex items-center pl-3.5 text-[10px] font-black ${w4 > 35 ? 'text-white' : 'text-slate-600 dark:text-slate-400'} select-none">${w4.toFixed(0)}% conversão</span>
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
      tempoMedioDias: number;
      xp: number;
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
        valGap: 0,
        tempoMedioDias: 0,
        xp: c.xp || 0
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
          valGap: 0,
          tempoMedioDias: 0,
          xp: 0
        };
        rankingMap.set(o.consultorId, metrics);
      }
      
      const m = metrics!;
      m.orcCriados += 1;
      m.valProposto += o.valorProposta || 0;

      if (o.status === 'CONCLUIDO') {
        m.orcConcluidos += 1;
        if (o.subStatus === 'ACEITO') {
          m.orcGanhos += 1;
        } else if (o.subStatus === 'DESISTENCIA') {
          m.valGap += o.valorProposta || 0;
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
          valGap: 0,
          tempoMedioDias: 0,
          xp: 0
        };
        rankingMap.set(v.consultorId, metrics);
      }
      
      const m = metrics!;
      const vPayments = this.locPagamentos.filter(p => 
        (p.viagem_id === v.id || p.viagemId === v.id) &&
        p.formas_recebimento &&
        ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
      );
      const vSub = vPayments.reduce((s, p) => s + (Number(p.valor) || 0), 0);
      m.valVendido += Math.max(0, (v.valorTotal || 0) - vSub);
    });

    // Calcular tempo médio de fechamento para cada consultor
    rankingMap.forEach((metrics, id) => {
      let totalWonWithOrc = 0;
      let totalDays = 0;

      const consultorViagens = viagens.filter(v => (v.consultorId === id || v.consultor_id === id) && v.status !== 'cancelada');
      consultorViagens.forEach(v => {
        const oId = v.orcamentoId || v.orcamento_id;
        if (oId) {
          const correspondingOrc = orcamentos.find(o => o.id === oId);
          if (correspondingOrc && correspondingOrc.createdAt && v.createdAt) {
            const dateOrc = new Date(correspondingOrc.createdAt);
            const dateVia = new Date(v.createdAt);
            const diffMs = dateVia.getTime() - dateOrc.getTime();
            if (diffMs > 0) {
              totalDays += diffMs / (1000 * 60 * 60 * 24);
              totalWonWithOrc += 1;
            }
          }
        }
      });

      metrics.tempoMedioDias = totalWonWithOrc > 0 ? totalDays / totalWonWithOrc : 0;
    });

    // Converter map para array e ordenar pelo maior Faturamento de Viagens Vendidas
    const rankingArray = Array.from(rankingMap.values())
      .sort((a, b) => b.valVendido - a.valVendido);

    return `
      <!-- TABELA DE RENDIMENTO DA EQUIPE -->
      <section class="dashboard-glass rounded-3xl p-6 select-none overflow-x-auto">
        <div class="mb-4">
          <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            👥 Rendimento e Performance da Equipe
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Quadro comparativo de conversão, faturamento e gap financeiro de desistências</p>
        </div>

        <table class="w-full text-left border-collapse text-xs min-w-[700px]">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-400 font-extrabold uppercase tracking-wider">
              <th class="py-3 pl-2">Consultor</th>
              <th class="py-3 text-center">Orçamentos</th>
              <th class="py-3 text-center">Conversão</th>
              <th class="py-3 text-center">Tempo Médio</th>
              <th class="py-3 text-right">Valor Proposto</th>
              <th class="py-3 text-right">Faturamento Realizado</th>
              <th class="py-3 text-right">Gap (Perdas)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
            ${rankingArray.map((r, index) => {
              const conversion = r.orcConcluidos > 0 ? (r.orcGanhos / r.orcConcluidos) * 100 : (r.orcGanhos > 0 ? 100 : 0);
              
              // Estilização das medalhas ou ícones de colocação
              let placingIcon = `<span class="text-slate-400 dark:text-slate-400 w-5 block text-center">${index + 1}</span>`;
              if (index === 0 && r.valVendido > 0) placingIcon = `<span class="text-lg w-5 block text-center animate-bounce" title="Top 1 Vendedor">🥇</span>`;
              else if (index === 1 && r.valVendido > 0) placingIcon = `<span class="text-lg w-5 block text-center" title="Top 2 Vendedor">🥈</span>`;
              else if (index === 2 && r.valVendido > 0) placingIcon = `<span class="text-lg w-5 block text-center" title="Top 3 Vendedor">🥉</span>`;

              return `
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <td class="py-3.5 flex items-center gap-2.5">
                    ${placingIcon}
                    ${getAvatarSvg(r.avatarUrl, r.nome, 'w-8 h-8')}
                    <div>
                      <span class="block font-black text-slate-700 dark:text-slate-200 leading-snug">${r.nome}</span>
                      <span class="block text-[9px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wide leading-none mt-0.5">${r.email} &bull; ${r.xp} XP</span>
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
                  <td class="py-3.5 text-center text-slate-700 dark:text-slate-300 font-semibold">
                    ${r.tempoMedioDias > 0 ? `${r.tempoMedioDias.toFixed(1)} dias` : '—'}
                  </td>
                  <td class="py-3.5 text-right text-slate-700 dark:text-slate-300">
                    R$ ${r.valProposto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td class="py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                    R$ ${r.valVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td class="py-3.5 text-right font-black text-rose-600 dark:text-rose-400">
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

  private async loadMetas(force: boolean = false): Promise<void> {
    const cacheLimit = 5 * 60 * 1000;
    const timeSinceLastFetch = Date.now() - this.lastFetchedMetasTime;

    if (!force && this.metas.length > 0 && timeSinceLastFetch < cacheLimit) {
      return;
    }

    try {
      const allMetas = await MetasService.obterMetaPeriodos();
      this.lastFetchedMetasTime = Date.now();
      
      const isAdmin = this.perfil?.role === 'admin';
      if (!isAdmin) {
        this.metas = allMetas.filter(m => !m.is_meta_loja);
      } else {
        this.metas = allMetas;
      }
      
      if (this.metas.length > 0) {
        if (this.selectedMetaId === 'todas' || !this.metas.some(m => m.id === this.selectedMetaId)) {
          this.selectedMetaId = this.metas[0].id;
        }
      } else {
        this.selectedMetaId = 'todas';
      }
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
    }
  }

  private startMetasTimer(): void {
    if (this.countdownInterval) return;
    this.countdownInterval = setInterval(async () => {
      const btnText = document.querySelector('#btn-refresh-metas span');
      if (btnText) {
        const diff = Date.now() - this.lastFetchedMetasTime;
        const cacheLimit = 5 * 60 * 1000;
        if (diff >= cacheLimit) {
          btnText.textContent = 'Carregando...';
          await this.loadMetas(true);
          this.renderMetricsSection();
        } else {
          const remainingSecs = Math.max(0, Math.ceil((cacheLimit - diff) / 1000));
          const mins = Math.floor(remainingSecs / 60);
          const secs = remainingSecs % 60;
          btnText.textContent = `Atualiza em ${mins}:${secs.toString().padStart(2, '0')}`;
        }
      }
    }, 1000);
  }

  private renderGoalPieChart(val: number, faixas: MetaFaixa[], isMetaLoja?: boolean, valorMeta?: number): string {
    if (isMetaLoja) {
      const maxVal = valorMeta || 1;
      if (maxVal <= 0) return '';
      const pct = Math.min((val / maxVal) * 100, 100);
      const remaining = 100 - pct;

      return `
        <svg viewBox="0 0 42 42" class="w-full h-full transform -rotate-90">
          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" class="dark:stroke-slate-800" stroke-width="4.5" />
          ${pct > 0 ? `
            <circle cx="21" cy="21" r="15.915" fill="transparent" 
              stroke="#10b981" stroke-width="5" 
              stroke-dasharray="${pct} ${remaining}" 
              stroke-dashoffset="25"
              class="donut-segment transition-all duration-500" />
          ` : ''}
        </svg>
      `;
    }

    if (!faixas || faixas.length === 0) return '';
    const sorted = [...faixas].sort((a, b) => a.valor_minimo - b.valor_minimo);
    const maxVal = sorted[sorted.length - 1].valor_minimo;
    if (maxVal <= 0) return '';

    let currentOffset = 25;
    let svgCircles = '';
    let prevVal = 0;

    sorted.forEach(f => {
      const wSize = f.valor_minimo - prevVal;
      if (wSize <= 0) return;

      const pSize = (wSize / maxVal) * 100;
      const achieved = Math.max(0, Math.min(wSize, val - prevVal));
      const paSize = (achieved / maxVal) * 100;
      const ruSize = pSize - paSize;

      const tierColor = f.cor || '#6366f1';

      if (paSize > 0) {
        svgCircles += `
          <circle cx="21" cy="21" r="15.915" fill="transparent" 
            stroke="${tierColor}" stroke-width="5" 
            stroke-dasharray="${paSize} ${100 - paSize}" 
            stroke-dashoffset="${currentOffset}"
            class="donut-segment transition-all duration-500" />
        `;
        currentOffset -= paSize;
      }

      if (ruSize > 0) {
        svgCircles += `
          <circle cx="21" cy="21" r="15.915" fill="transparent" 
            stroke="${tierColor}" stroke-width="4.5" 
            stroke-dasharray="${ruSize} ${100 - ruSize}" 
            stroke-dashoffset="${currentOffset}"
            class="donut-segment opacity-20" />
        `;
        currentOffset -= ruSize;
      }

      prevVal = f.valor_minimo;
    });

    return `
      <svg viewBox="0 0 42 42" class="w-full h-full transform -rotate-90">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" class="dark:stroke-slate-800" stroke-width="4" />
        ${svgCircles}
      </svg>
    `;
  }

  private renderMetasSection(): string {
    if (this.metas.length === 0) {
      return '';
    }

    const currentMeta = this.metas.find(m => m.id === this.selectedMetaId) || this.metas[0];
    if (!currentMeta) return '';

    const start = new Date(currentMeta.data_inicio + 'T00:00:00');
    const end = new Date(currentMeta.data_fim + 'T23:59:59');

    const filterByPeriodDates = (v: Viagem): boolean => {
      const dateStr = v.dataFinanceiro || v.createdAt;
      if (!dateStr) return false;
      const recordDate = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
      return recordDate >= start && recordDate <= end;
    };

    const getConsultantMetricVal = (consultantId: string): number => {
      const consultantVoyages = this.viagens.filter(v => 
        v.status !== 'cancelada' && 
        v.consultorId === consultantId && 
        filterByPeriodDates(v)
      );

      if (currentMeta.tipo_calculo === 'bruto') {
        const activeViaIds = new Set(consultantVoyages.map(v => v.id));
        const pagsSub = this.locPagamentos.filter(p => 
          activeViaIds.has(p.viagem_id || p.viagemId) &&
          p.formas_recebimento &&
          ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
        );
        const totalSub = pagsSub.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
        return Math.max(0, consultantVoyages.reduce((acc, v) => acc + (v.valorTotal || 0), 0) - totalSub);
      } else {
        let profit = 0;
        consultantVoyages.forEach(v => {
          const prods = (v as any).produtos || [];
          prods.forEach((p: any) => {
            profit += (Number(p.comissao) || 0) + (Number(p.markup) || 0) + ((Number(p.rav) || 0) * 0.88);
          });
        });
        return profit;
      }
    };

    const isAdmin = this.perfil?.role === 'admin';
    const isConsultant = this.perfil?.role === 'consultor';
    
    const nextUpdateText = Math.max(0, Math.ceil((5 * 60 * 1000 - (Date.now() - this.lastFetchedMetasTime)) / 1000));
    const nextUpdateMins = Math.floor(nextUpdateText / 60);
    const nextUpdateSecs = nextUpdateText % 60;

    let goalsHTML = '';
    const sortedFaixas = [...(currentMeta.faixas || [])].sort((a, b) => a.valor_minimo - b.valor_minimo);

    const renderProgressBar = (val: number) => {
      if (sortedFaixas.length === 0) return '';
      
      const maxVal = sortedFaixas[sortedFaixas.length - 1].valor_minimo * 1.1;
      const pct = Math.min((val / maxVal) * 100, 100);

      let currentFaixaName = 'Nenhuma';
      let nextFaixaName = '';
      let nextFaixaVal = 0;

      for (let i = 0; i < sortedFaixas.length; i++) {
        if (val >= sortedFaixas[i].valor_minimo) {
          currentFaixaName = sortedFaixas[i].nome;
        } else {
          nextFaixaName = sortedFaixas[i].nome;
          nextFaixaVal = sortedFaixas[i].valor_minimo;
          break;
        }
      }

      const diffVal = nextFaixaVal > 0 ? nextFaixaVal - val : 0;
      const progressDesc = nextFaixaVal > 0 
        ? `Faltam <span class="font-extrabold text-indigo-650 dark:text-indigo-400">R$ ${diffVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> para atingir a faixa <span class="font-extrabold uppercase text-indigo-500">${nextFaixaName}</span>`
        : `🎉 Parabéns! Você atingiu a faixa máxima: <span class="font-black text-emerald-600 dark:text-emerald-450 uppercase">${currentFaixaName}</span>!`;

      return `
        <div class="space-y-2.5">
          <div class="flex justify-between items-end text-xs font-semibold">
            <span class="text-slate-400 dark:text-slate-400">Faixa Atual: <strong class="text-slate-700 dark:text-slate-200 uppercase">${currentFaixaName}</strong></span>
            <span class="text-slate-700 dark:text-slate-200 font-extrabold">R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="relative w-full h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/20">
            <div class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-550 rounded-full" style="width: ${pct}%"></div>
            ${sortedFaixas.map(f => {
              const tickPct = (f.valor_minimo / maxVal) * 100;
              return `
                <div class="absolute top-0 bottom-0 w-0.5 bg-white/70 dark:bg-slate-900/80" style="left: ${tickPct}%" title="${f.nome}: R$ ${f.valor_minimo}"></div>
              `;
            }).join('')}
          </div>

          <div class="flex flex-wrap gap-3 pt-1">
            ${(() => {
              const formatRecompensa = (rec: string) => {
                if (!rec) return '';
                const parsed = parseBrFloat(rec);
                if (parsed !== null && !isNaN(parsed)) {
                  return 'R$ ' + parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                return rec;
              };

              return sortedFaixas.map(f => {
                const reached = val >= f.valor_minimo;
                return `
                  <div class="flex items-center gap-1.5 text-[10px] font-bold ${reached ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-400'}">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${f.cor || '#6366f1'}"></span>
                    <span>${f.nome} (R$ ${f.valor_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${f.recompensa ? ` - Prêmio: ${formatRecompensa(f.recompensa)}` : ''})</span>
                  </div>
                `;
              }).join('');
            })()}
          </div>

          <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            ${progressDesc}
          </div>
        </div>
      `;
    };

    if (isConsultant) {
      const myVal = getConsultantMetricVal(this.user.id);
      goalsHTML = `
        <div class="dashboard-glass rounded-3xl p-6 relative overflow-hidden border border-slate-200/50 dark:border-slate-800/40">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-4">
            <div>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100">Seu Progresso de Metas</h3>
              <p class="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">${currentMeta.nome} &bull; Base: ${currentMeta.tipo_calculo === 'bruto' ? 'Faturamento Bruto' : 'Lucro Real'} ${renderHelpIcon('tipo-calculo-meta')}</p>
            </div>
            <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl text-lg">🏆</div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <!-- Pie Chart Column -->
            <div class="md:col-span-4 flex items-center justify-center">
              <div class="relative w-36 h-36">
                ${this.renderGoalPieChart(myVal, currentMeta.faixas || [])}
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Atingido</span>
                  <span class="text-base font-black text-slate-800 dark:text-slate-100">
                    ${(() => {
                      const maxVal = sortedFaixas.length > 0 ? sortedFaixas[sortedFaixas.length - 1].valor_minimo : 1;
                      return ((myVal / maxVal) * 100).toFixed(0);
                    })()}%
                  </span>
                </div>
              </div>
            </div>

            <!-- Progress Details Column -->
            <div class="md:col-span-8">
              ${renderProgressBar(myVal)}
            </div>
          </div>
        </div>
      `;
    } else if (isAdmin) {
      const agencyTotal = this.consultores.reduce((sum, c) => sum + getConsultantMetricVal(c.id), 0);
      goalsHTML = `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
          <!-- Coluna 1: Total da Agência (4 cols) -->
          <div class="md:col-span-4 dashboard-glass rounded-3xl p-6 flex flex-col justify-between border border-slate-200/50 dark:border-slate-800/40">
            <div>
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
                <h3 class="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Total Consolidado da Agência</h3>
                <span class="text-lg">🏢</span>
              </div>
              
              <div class="flex flex-col items-center justify-center py-2">
                <div class="relative w-32 h-32 mb-4">
                  ${this.renderGoalPieChart(agencyTotal, currentMeta.faixas || [], currentMeta.is_meta_loja, currentMeta.valor_meta)}
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span class="text-[9px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Atingido</span>
                    <span class="text-sm font-black text-slate-800 dark:text-slate-100">
                      ${(() => {
                        const maxVal = currentMeta.is_meta_loja 
                          ? (currentMeta.valor_meta || 1) 
                          : (sortedFaixas.length > 0 ? sortedFaixas[sortedFaixas.length - 1].valor_minimo : 1);
                        return ((agencyTotal / maxVal) * 100).toFixed(0);
                      })()}%
                    </span>
                  </div>
                </div>

                <div class="text-center w-full">
                  <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block">Acumulado da Equipe ${renderHelpIcon('acumulado-equipe')}</span>
                  <span class="text-xl font-black text-slate-800 dark:text-slate-100 mt-1 block">
                    R$ ${agencyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  ${currentMeta.is_meta_loja ? `
                    <span class="text-[10px] text-slate-400 dark:text-slate-400 font-bold block mt-1.5">Alvo Loja: R$ ${(currentMeta.valor_meta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Coluna 2: Progresso dos Consultores (8 cols) -->
          <div class="md:col-span-8 dashboard-glass rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/40">
            <h3 class="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">Acompanhamento por Consultor</h3>
            <div class="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              ${this.consultores
                .map(c => ({ consultant: c, val: getConsultantMetricVal(c.id) }))
                .sort((a, b) => b.val - a.val)
                .map(({ consultant: c, val }) => {
                  let currentFaixaName = 'Nenhuma';
                  let currentFaixaColor = '#6366f1';
                  
                  if (currentMeta.is_meta_loja) {
                    currentFaixaName = 'Contribuição';
                    currentFaixaColor = '#10b981';
                  } else {
                    for (let i = 0; i < sortedFaixas.length; i++) {
                      if (val >= sortedFaixas[i].valor_minimo) {
                        currentFaixaName = sortedFaixas[i].nome;
                        currentFaixaColor = sortedFaixas[i].cor || '#6366f1';
                      }
                    }
                  }

                  const maxVal = currentMeta.is_meta_loja
                    ? (currentMeta.valor_meta || 1)
                    : (sortedFaixas.length > 0 ? sortedFaixas[sortedFaixas.length - 1].valor_minimo * 1.1 : 1);
                  const pct = Math.min((val / maxVal) * 100, 100);

                  const badgeHTML = currentMeta.is_meta_loja
                    ? ''
                    : `<span style="color: ${currentFaixaColor}; border-color: ${currentFaixaColor}30; background-color: ${currentFaixaColor}10" class="px-1.5 py-0.5 border rounded text-[9px] font-black uppercase tracking-wider">${currentFaixaName}</span>`;

                  return `
                    <div class="space-y-1.5">
                      <div class="flex justify-between items-center text-xs">
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            ${getAvatarSvg(c.avatar_url || 'panda')}
                          </div>
                          <span class="font-extrabold text-slate-700 dark:text-slate-200">${c.nome}</span>
                          ${badgeHTML}
                        </div>
                        <span class="font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          ${currentMeta.is_meta_loja ? `<span class="text-[10px] text-slate-400 dark:text-slate-400 font-bold">(${((val / maxVal) * 100).toFixed(0)}%)</span>` : ''}
                        </span>
                      </div>
                      <div class="relative w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-300" style="width: ${pct}%; background-color: ${currentFaixaColor}"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <!-- SEÇÃO METAS FINANCEIRAS REAL-TIME -->
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 class="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>🏆</span> Acompanhamento de Metas Comerciais
          </h2>
          
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm">
              <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 select-none">Campanha/Período:</span>
              <select id="select-dashboard-meta-periodo" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-400 focus:outline-none cursor-pointer">
                ${this.metas.map(m => `
                  <option value="${m.id}" ${this.selectedMetaId === m.id ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${m.nome}</option>
                `).join('')}
              </select>
            </div>
            
            <button id="btn-refresh-metas" class="p-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition shadow-sm text-xs font-black uppercase flex items-center gap-1" title="Atualizar agora">
              🔄 <span class="text-[9px] text-slate-400 dark:text-slate-400 font-semibold tracking-tight normal-case">Atualiza em ${nextUpdateMins}:${nextUpdateSecs.toString().padStart(2, '0')}</span>
            </button>
          </div>
        </div>
        
        ${goalsHTML}
      </div>
    `;
  }

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
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      }
    }, 3500);
  }
}

