import { supabase, getSessaoAtual } from '../services/supabase';
import { GlobalSettings, PerfilConsultor, Destino } from '../types';
import { NextTripEngineService } from '../services/nextTripEngineService';
import { NextTripDashboardWidget } from '../components/dashboard/NextTripDashboardWidget';
import { SendTemplateMessageModal } from '../components/dashboard/SendTemplateMessageModal';
import { mesclarAvataresLocais } from '../services/avatars';
import { showCustomConfirm } from '../services/dialog';
import { BalcaoService, ResultadoBuscaBalcao } from '../services/balcaoService';
import { DashboardFilterBar } from '../components/dashboard/DashboardFilterBar';
import {
  ViagensTableView,
  ViagensTableViewContext,
  ViagensTableViewHandlers
} from '../components/dashboard/ViagensTableView';
import { NovaViagemModal } from '../components/dashboard/NovaViagemModal';
import { ViagensTransicaoManager } from '../components/dashboard/ViagensTransicaoManager';
import { BalcaoCopilotoSection } from '../components/dashboard/BalcaoCopilotoSection';
import { DashboardFilterEngine } from '../components/dashboard/DashboardFilterEngine';
import { DashboardFilterStateManager } from '../components/dashboard/DashboardFilterStateManager';
import { DashboardExportManager } from '../components/dashboard/DashboardExportManager';
import { ORIGENS_LEAD_PADRAO } from '../controllers/cadastrosController';

import { isNextTripEnabled } from '../utils/featureFlags';
import { renderSkeletonTable } from '../utils/skeletonHelper';
import {
  calcularFinanceiroProduto,
  verificarViagemTotalmentePaga
} from '../utils/productFinancialHelper';
import { excluirViagemCascata } from '../controllers/viagensController';

// Injeta estilos premium e animações micro-interativas para SLAs diretamente no DOM
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes borderPulseRed {
      0%, 100% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
      50% { border-color: rgba(239, 68, 68, 0.9); box-shadow: 0 0 10px 2px rgba(239, 68, 68, 0.3); }
    }
    .sla-pulse-red {
      animation: borderPulseRed 2s infinite ease-in-out;
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
    agencyName: 'PaxFlow',
    taxaCancelamentoPadrao: 0,
    prazoReembolsoDias: 3,
    notificacoesAtivas: true,
    emailSuporte: 'suporte@paxflow.com.br'
  };
  
  // Parâmetros de SLA padrão (caso não existam no banco)
  private slaPreEmbarqueDias: number = 7;
  private slaPosViagemDias: number = 3;

  private viagens: any[] = [];
  private ultimasViagensFiltradas: any[] = [];
  private consultores: PerfilConsultor[] = [];
  private tiposProduto: any[] = [];
  private formasRecebimento: any[] = [];
  private origensLead: any[] = [];
  private listaDestinosDisponiveis: Destino[] = [];
  private locPagamentosMap: Map<string, any[]> = new Map();

  private balcaoResultados: ResultadoBuscaBalcao[] = [];
  private balcaoSearchTimeout: any = null;
  private isFallbackMode: boolean = false;
  private realtimeChannel: any = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private globalSearchListener: ((e: any) => void) | null = null;

  private sortField: string = '';
  private sortDirection: 'asc' | 'desc' = 'asc';

  private filterStateManager: DashboardFilterStateManager;

  constructor(container: HTMLElement) {
    this.container = container;
    this.filterStateManager = new DashboardFilterStateManager({
      user: this.user,
      perfil: this.perfil,
      settings: this.settings,
      consultores: this.consultores,
      formasRecebimento: this.formasRecebimento,
      origensLead: this.origensLead,
      listaDestinosDisponiveis: this.listaDestinosDisponiveis,
      tiposProduto: this.tiposProduto,
      onStateChange: () => this.render(),
      onNovaViagem: () => this.openNovaViagemModal(),
      onExportCsv: () => this.exportarViagensCsv(this.ultimasViagensFiltradas)
    });
  }

  // Getters e setters para compatibilidade com ouvintes globais ou testes
  public get buscaTermo(): string {
    return this.filterStateManager.buscaTermo;
  }
  public set buscaTermo(val: string) {
    this.filterStateManager.buscaTermo = val;
  }

  public get selectedConsultantId(): string {
    return this.filterStateManager.selectedConsultantId;
  }
  public set selectedConsultantId(val: string) {
    this.filterStateManager.selectedConsultantId = val;
  }

  public get activeStatusTab(): string {
    return this.filterStateManager.activeStatusTab;
  }
  public set activeStatusTab(val: string) {
    this.filterStateManager.activeStatusTab = val;
  }

  public get confFilters() {
    return this.filterStateManager.confFilters;
  }
  public set confFilters(val) {
    this.filterStateManager.confFilters = val;
  }

  public get viewModeMonth() {
    return this.filterStateManager.viewModeMonth;
  }
  public set viewModeMonth(val) {
    this.filterStateManager.viewModeMonth = val;
  }

  public get showFiltersPanel(): boolean {
    return this.filterStateManager.showFiltersPanel;
  }
  public set showFiltersPanel(val: boolean) {
    this.filterStateManager.showFiltersPanel = val;
  }

  public get showConfPopover(): boolean {
    return this.filterStateManager.showConfPopover;
  }
  public set showConfPopover(val: boolean) {
    this.filterStateManager.showConfPopover = val;
  }

  /**
   * Inicializa o painel operacional: valida autenticação, busca SLAs e dados, e renderiza o quadro.
   */
  public async init(targetId?: string): Promise<void> {
    try {
      this.renderLoading();

      // 1. Validar autenticação e perfil
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Por favor, faça o login.');
        return;
      }
      this.user = user;
      this.perfil = perfil;

      // 2. Carregar consultores ativos
      await this.loadConsultores();

      // 3. Carregar configurações globais de SLA
      await this.loadGlobalSettings();

      // 4. Carregar tipos de produtos, destinos, formas e origens cadastrados no banco
      await this.loadTiposProduto();
      await this.loadDestinos();
      await this.loadFormasRecebimento();
      await this.loadOrigensLead();

      // Atualiza configurações no gerenciador de filtros
      this.filterStateManager.updateConfig({
        user: this.user,
        perfil: this.perfil,
        settings: this.settings,
        consultores: this.consultores,
        formasRecebimento: this.formasRecebimento,
        origensLead: this.origensLead,
        listaDestinosDisponiveis: this.listaDestinosDisponiveis,
        tiposProduto: this.tiposProduto
      });

      // 5. Buscar viagens
      await this.loadViagens();

      // 6. Configurar atualizações em tempo real
      this.setupRealtime();
      this.setupStorageListener();

      // 7. Renderizar interface completa
      this.render();

      // 8. Ouvinte de Busca Global (Header)
      if (!this.globalSearchListener) {
        this.globalSearchListener = (e: any) => {
          const termo = e.detail?.termo !== undefined ? e.detail.termo : '';
          this.aplicarBuscaGlobal(termo);
        };
        window.addEventListener('paxflow-global-search-submit', this.globalSearchListener);
      }

      // 9. Deep linking para abrir viagem específica
      if (targetId) {
        await this.openEdicaoEProdutosModal(targetId);
      }

    } catch (err: any) {
      console.error('Erro na inicialização do Dashboard:', err);
      this.renderAuthError(`Ocorreu um erro interno: ${err.message}`);
    }
  }

  /**
   * Configura canal em tempo real do Supabase para atualizar as viagens automaticamente
   */
  private setupRealtime(): void {
    try {
      if (this.realtimeChannel) {
        try {
          supabase.removeChannel(this.realtimeChannel);
        } catch (e) {}
        this.realtimeChannel = null;
      }

      const channelName = `operational-dashboard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      this.realtimeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'viagens' },
          async () => {
            await this.loadViagens();
            this.render();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[Dashboard] Erro ao registrar realtime:', e);
    }
  }

  private setupStorageListener(): void {
    // Sincronização via Supabase Realtime é a fonte de verdade
  }

  /**
   * Aplica termo de busca submetido via Caixa de Pesquisa Global
   */
  public aplicarBuscaGlobal(termo: string): void {
    this.filterStateManager.buscaTermo = termo;
    this.balcaoResultados = [];
    this.render();
  }

  /**
   * Destrutor da página para limpar listeners globais
   */
  public destroy(): void {
    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {}
      this.realtimeChannel = null;
    }
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    if (this.globalSearchListener) {
      window.removeEventListener('paxflow-global-search-submit', this.globalSearchListener);
      this.globalSearchListener = null;
    }
    if (this.balcaoSearchTimeout) {
      clearTimeout(this.balcaoSearchTimeout);
      this.balcaoSearchTimeout = null;
    }
  }

  /**
   * Carrega configurações globais da agência
   */
  private async loadGlobalSettings(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        this.settings = {
          id: data.id,
          agencyName: data.agency_name || data.agencyName || 'PaxFlow',
          taxaCancelamentoPadrao: data.taxa_cancelamento_padrao || 0,
          prazoReembolsoDias: data.prazo_reembolso_dias || 3,
          notificacoesAtivas: data.notificacoes_ativas ?? true,
          emailSuporte: data.email_suporte || 'suporte@paxflow.com.br',
          slaPreEmbarqueDias: data.sla_pre_embarque_dias || 7,
          slaPosViagemDias: data.sla_pos_viagem_dias || 3
        };
        this.slaPreEmbarqueDias = data.sla_pre_embarque_dias || 7;
        this.slaPosViagemDias = data.sla_pos_viagem_dias || 3;
      }
    } catch (err: any) {
      console.warn('Configurações globais não carregadas (usando defaults):', err.message);
    }
  }

  /**
   * Busca todos os consultores ativos no sistema (apenas Admins)
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
      console.warn('Erro ao carregar consultores para filtros:', err.message);
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
   * Carrega os tipos de produtos cadastrados no banco
   */
  private async loadTiposProduto(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('tipos_produto')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      this.tiposProduto = data || [];
    } catch (err: any) {
      console.warn('Erro ao carregar tipos de produto do banco:', err.message);
      this.tiposProduto = [];
    }
  }

  /**
   * Carrega os destinos cadastrados no banco
   */
  private async loadDestinos(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('destinos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      this.listaDestinosDisponiveis = data || [];
    } catch (err: any) {
      console.warn('Erro ao carregar destinos do banco:', err.message);
      this.listaDestinosDisponiveis = [];
    }
  }

  /**
   * Carrega as formas de recebimento cadastradas no banco
   */
  private async loadFormasRecebimento(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('formas_recebimento')
        .select('*')
        .order('nome', { ascending: true });

      if (!error && data) {
        this.formasRecebimento = data;
      }
    } catch (err: any) {
      console.warn('Erro ao carregar formas de recebimento do banco:', err.message);
      this.formasRecebimento = [];
    }
  }

  /**
   * Carrega as origens de lead cadastradas no banco com fallback seguro
   */
  private async loadOrigensLead(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('origens_lead')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (!error && data && data.length > 0) {
        this.origensLead = data;
      } else {
        this.origensLead = [...ORIGENS_LEAD_PADRAO];
      }
    } catch (err: any) {
      console.warn('Erro ao carregar origens de lead do banco:', err.message);
      this.origensLead = [...ORIGENS_LEAD_PADRAO];
    }
  }

  /**
   * Exporta a lista atual de viagens filtradas para um arquivo CSV formatado para Excel (PT-BR)
   */
  private exportarViagensCsv(viagensParaExportar: any[]): void {
    const consultorContextoId = DashboardFilterEngine.getConsultorContextoAtivoId(
      this.user,
      this.perfil,
      this.filterStateManager.selectedConsultantId,
      this.filterStateManager.advConsultores
    );

    DashboardExportManager.exportarViagensCsv({
      viagensParaExportar,
      user: this.user,
      consultores: this.consultores,
      locPagamentosMap: this.locPagamentosMap,
      getTripFinancialTotals: (v) => DashboardFilterEngine.getTripFinancialTotals(v, consultorContextoId),
      onSuccess: (msg) => this.showToast(msg, 'success'),
      onError: (msg) => this.showToast(msg, 'error')
    });
  }

  /**
   * Busca as viagens e realiza o filtro baseado no cargo (Role) do consultor logado
   */
  private async loadViagens(): Promise<void> {
    try {
      this.isFallbackMode = false;
      const query = supabase
        .from('viagens')
        .select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)');

      const { data, error } = await query;
      if (error) throw error;

      let locConfs: any[] = [];
      if (!this.isFallbackMode) {
        try {
          const { data: confData, error: confError } = await supabase
            .from('loc_conferencias')
            .select('viagem_id, codigo_localizador, conferido');
          if (!confError && confData) {
            locConfs = confData;
          }
        } catch (errConf) {
          console.warn('Erro ao carregar loc_conferencias:', errConf);
        }
      }

      const locConfsMap = new Map<string, { [locKey: string]: boolean }>();
      locConfs.forEach((row: any) => {
        const vId = row.viagem_id;
        const locKey = (row.codigo_localizador || 'SEM LOCALIZADOR').trim().toUpperCase();
        if (!locConfsMap.has(vId)) {
          locConfsMap.set(vId, {});
        }
        locConfsMap.get(vId)![locKey] = row.conferido;
      });

      let locPags: any[] = [];
      if (!this.isFallbackMode) {
        try {
          const { data: pagsData, error: pagsError } = await supabase
            .from('loc_pagamentos')
            .select('viagem_id, codigo_localizador, forma_recebimento_id, valor, formas_recebimento(id, nome)');
          if (!pagsError && pagsData) {
            locPags = pagsData;
          } else if (pagsError) {
            const { data: fallbackData } = await supabase
              .from('loc_pagamentos')
              .select('viagem_id, codigo_localizador, forma_recebimento_id, valor');
            if (fallbackData) locPags = fallbackData;
          }
        } catch (errPags) {
          console.warn('Erro ao carregar loc_pagamentos:', errPags);
        }
      }

      this.locPagamentosMap = new Map<string, any[]>();
      locPags.forEach((p: any) => {
        const vId = p.viagem_id;
        if (!this.locPagamentosMap.has(vId)) {
          this.locPagamentosMap.set(vId, []);
        }
        const formaNome = (p.formas_recebimento && typeof p.formas_recebimento === 'object' && p.formas_recebimento.nome)
          ? p.formas_recebimento.nome
          : (p.forma_nome || '');
        this.locPagamentosMap.get(vId)!.push({
          ...p,
          codigo_localizador: p.codigo_localizador || '',
          forma_nome: formaNome
        });
      });

      let comments: any[] = [];
      if (!this.isFallbackMode) {
        try {
          const { data: cData, error: cError } = await supabase
            .from('comentarios')
            .select('item_id, tipo_item, texto')
            .in('tipo_item', ['viagem', 'produto']);
          if (!cError && cData) {
            comments = cData;
          }
        } catch (errComm) {
          console.warn('Erro ao carregar comentários para busca:', errComm);
        }
      }

      const divisoesMap = new Map<string, any[]>();
      if (!this.isFallbackMode) {
        try {
          let divData: any[] | null = null;
          let divError: any = null;
          
          const primaryRes = await supabase
            .from('viagens_divisoes')
            .select('viagem_id, consultor_id, percentual, percentual_rav, is_titular');
          divData = primaryRes.data;
          divError = primaryRes.error;
          
          if (divError && (divError.code === '42703' || divError.message?.includes('percentual_rav'))) {
            const fallbackRes = await supabase
              .from('viagens_divisoes')
              .select('viagem_id, consultor_id, percentual, is_titular');
            divData = fallbackRes.data;
            divError = fallbackRes.error;
          }

          if (!divError && divData) {
            divData.forEach((row: any) => {
              const arr = divisoesMap.get(row.viagem_id) || [];
              arr.push(row);
              divisoesMap.set(row.viagem_id, arr);
            });
          }
        } catch (errDiv) {
          console.warn('Erro defensivo ao carregar viagens_divisoes no Dashboard:', errDiv);
        }
      }

      const tripCommentsMap = new Map<string, string[]>();
      const productToTripMap = new Map<string, string>();
      (data || []).forEach((v: any) => {
        if (v.produtos && Array.isArray(v.produtos)) {
          v.produtos.forEach((p: any) => {
            productToTripMap.set(p.id, v.id);
          });
        }
      });

      (comments || []).forEach((c: any) => {
        let tripId: string | undefined;
        if (c.tipo_item === 'viagem') {
          tripId = c.item_id;
        } else if (c.tipo_item === 'produto') {
          tripId = productToTripMap.get(c.item_id);
        }

        if (tripId) {
          if (!tripCommentsMap.has(tripId)) {
            tripCommentsMap.set(tripId, []);
          }
          tripCommentsMap.get(tripId)!.push(c.texto);
        }
      });

      this.viagens = (data || []).map((v: any) => {
        v.divisoes = divisoesMap.get(v.id) || [];
        const produtos = v.produtos || [];
        const totalProdutos = produtos.reduce((sum: number, p: any) => sum + (Number(p.valor_venda) || 0), 0);
        const valorViagem = Number(v.valor_total) || 0;
        const saldoPendente = valorViagem - totalProdutos;
        const isSaldoZerado = Math.abs(saldoPendente) <= 0.01;
        const hasProdutos = produtos.length > 0;
        const todosDetalhados = produtos.every((p: any) => calcularFinanceiroProduto(p).isDetalhado);

        const locKeys = Array.from(new Set(produtos.map((p: any) => (p.codigo_reserva || 'SEM LOCALIZADOR').trim().toUpperCase())));
        const confMap = locConfsMap.get(v.id) || {};
        const todosLocsConferidos = locKeys.length > 0 && locKeys.every((k: any) => !!confMap[k]);

        const financeiroOk = hasProdutos && isSaldoZerado && todosDetalhados && todosLocsConferidos;
        const processoOk = !!v.processo_conferido;
        const pagsViagem = this.locPagamentosMap.get(v.id) || [];
        const isTotalmentePago = verificarViagemTotalmentePaga(produtos, pagsViagem);

        return {
          ...v,
          codigoRef: v.codigo_ref,
          destino: v.destino_ref ? `${v.destino_ref.nome}, ${v.destino_ref.pais}` : v.destino,
          destino_id: v.destino_id,
          destinoId: v.destino_id,
          destino_ref: v.destino_ref,
          destinoRef: v.destino_ref,
          comentarios_busca: tripCommentsMap.get(v.id) || [],
          isFinanceiroConferido: financeiroOk,
          isProcessoConferido: processoOk,
          isTotalmentePago
        };
      });
    } catch (err: any) {
      this.isFallbackMode = true;
      console.warn('Erro ao carregar viagens do banco. Mantendo estado atual:', err.message);
    }
  }

  /**
   * Deleta uma viagem e todas as suas dependências (apenas Admins)
   */
  private async deleteViagem(tripId: string): Promise<{ success: boolean; error?: string }> {
    if (this.isFallbackMode) {
      this.viagens = this.viagens.filter(v => v.id !== tripId);
      return { success: true };
    }

    const res = await excluirViagemCascata(supabase, tripId);
    if (res.success) {
      this.viagens = this.viagens.filter(v => v.id !== tripId);
    }
    return res;
  }

  /**
   * Valida a transição de status de uma viagem sob as regras operacionais do PaxFlow
   */
  private async validarTransicaoStatus(tripId: string, newStatus: string): Promise<boolean> {
    const viagem = this.viagens.find(v => v.id === tripId);
    return ViagensTransicaoManager.validarTransicaoStatus(viagem, newStatus, {
      isFallbackMode: this.isFallbackMode,
      showToast: (m, t, e) => this.showToast(m, t, e)
    });
  }

  /**
   * Abre o Modal Dinâmico para solicitação de reembolso de um produto
   */
  private async openRefundModal(tripId: string, oldStatus: string, selectEl?: HTMLSelectElement): Promise<void> {
    const viagem = this.viagens.find(v => v.id === tripId);
    if (!viagem) return;
    await ViagensTransicaoManager.openRefundModal(viagem, {
      user: this.user,
      oldStatus,
      selectEl,
      showToast: (m, t, e) => this.showToast(m, t, e),
      onSucesso: async () => {
        await this.init();
      }
    });
  }

  /**
   * Exibe uma caixa estruturada de carregamento (Skeleton loader)
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 space-y-6 font-sans">
        <div class="h-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 animate-pulse flex items-center justify-between">
          <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
          <div class="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-36"></div>
        </div>
        ${renderSkeletonTable(8, 6)}
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
      window.location.reload();
    });
  }

  /**
   * Abre o Modal Interativo de Criação de Viagem / Card
   */
  private async openNovaViagemModal(): Promise<void> {
    await NovaViagemModal.open({
      user: this.user,
      perfil: this.perfil,
      settings: this.settings,
      showToast: (m, t, e) => this.showToast(m, t, e),
      onSuccess: async () => {
        await this.loadViagens();
        this.render();
      }
    });
  }

  /**
   * Abre o Modal Dinâmico de Edição de Viagem e Gestão de Produtos
   */
  private async openEdicaoEProdutosModal(tripId: string, activeTab: 'detalhes' | 'produtos' = 'detalhes'): Promise<void> {
    const { EditTravelModal } = await import('../components/dashboard/EditTravelModal');
    const modal = new EditTravelModal({
      perfil: this.perfil,
      consultores: this.consultores,
      tiposProduto: this.tiposProduto,
      viagens: this.viagens,
      isFallbackMode: this.isFallbackMode,
      user: this.user,
      onUpdate: async () => {
        await this.loadViagens();
        this.render();
      },
      showToast: (message, type, err) => this.showToast(message, type, err),
      checkSLA: (viagem) => DashboardFilterEngine.checkSLA(viagem, this.slaPreEmbarqueDias, this.slaPosViagemDias, this.settings, this.tiposProduto)
    });
    await modal.open(tripId, activeTab);
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
   * Renderiza a seção Modo Co-Piloto (Pesquisa de Balcão - Outros Consultores)
   */
  private renderBalcaoSectionHTML(): string {
    return BalcaoCopilotoSection.renderHTML({
      buscaTermo: this.filterStateManager.buscaTermo,
      balcaoResultados: this.balcaoResultados,
      viagens: this.viagens,
      user: this.user,
      perfil: this.perfil
    });
  }

  /**
   * Renderiza a interface do Dashboard principal
   */
  private render(): void {
    const filterState = this.filterStateManager.getState();
    const { filtrados, counts, totalSlaAlerts } = DashboardFilterEngine.filtrarEOrdenarViagens({
      viagens: this.viagens,
      user: this.user,
      perfil: this.perfil,
      consultores: this.consultores,
      sortField: this.sortField,
      sortDirection: this.sortDirection,
      locPagamentosMap: this.locPagamentosMap,
      slaPreEmbarqueDias: this.slaPreEmbarqueDias,
      slaPosViagemDias: this.slaPosViagemDias,
      settings: this.settings,
      tiposProduto: this.tiposProduto,
      ...filterState
    });

    this.ultimasViagensFiltradas = filtrados;
    const filterContext = this.filterStateManager.getContext(this.viagens, filtrados, counts, totalSlaAlerts);

    const isSandbox = (window as any).paxflowSandbox;
    const desktopHeight = isSandbox ? 'calc(100vh - 36px)' : '100vh';
    const mobileHeight = isSandbox ? 'calc(100vh - 93px)' : 'calc(100vh - 57px)';

    this.container.innerHTML = `
      <style>
        .dashboard-container {
          height: ${mobileHeight};
        }
        @media (min-width: 768px) {
          .dashboard-container {
            height: ${desktopHeight};
          }
        }
      </style>
      <div class="dashboard-container bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200 overflow-hidden">
        
        <!-- CABEÇALHO PADRONIZADO IGUAL ÀS DEMAIS TELAS DO PAXFLOW -->
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 relative z-10 px-4 md:px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors duration-200 w-full">
          <div class="flex items-center gap-3 shrink-0">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-auto object-contain md:hidden" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${this.settings.agencyName}</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Viagens (Painel Operacional)</p>
            </div>
          </div>
          
          ${DashboardFilterBar.renderHeaderControls(filterContext, filterState)}
        </header>

        <!-- PAINEL DE FILTROS AVANÇADOS COLLAPSIBLE -->
        ${DashboardFilterBar.renderAdvancedFiltersPanelHTML(filterContext, filterState)}

        <!-- ABAS DE STATUS / FASES DE VENDA -->
        ${DashboardFilterBar.renderStatusTabsHTML(counts, filterState.activeStatusTab)}

        ${DashboardFilterBar.renderActiveFilterChipsHTML(filterContext, filterState)}
        ${DashboardFilterBar.renderFinancialSummaryBarHTML(filterContext)}

        <!-- CONTEÚDO PRINCIPAL (LISTA / TABELA) -->
        <main class="flex-1 p-6 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950 overflow-y-auto custom-scrollbar">
          <div id="next-trip-engine-mount"></div>
          ${this.renderBalcaoSectionHTML()}
          ${ViagensTableView.renderTableAndMobileView(filtrados, this.getViagensTableViewContext())}
        </main>
      </div>
    `;

    // Vincular ouvintes de eventos
    this.setupUIEventListeners();

    // Renderizar o Next Trip Engine Widget
    this.renderNextTripEngineWidget();
  }

  /**
   * Renderiza o Next Trip Engine Widget (Painel Preditivo de Recompra)
   */
  private async renderNextTripEngineWidget(): Promise<void> {
    const mount = this.container.querySelector('#next-trip-engine-mount') as HTMLElement;
    if (!mount) return;

    if (!isNextTripEnabled(this.user, this.perfil, this.settings)) {
      mount.innerHTML = '';
      mount.classList.add('hidden');
      return;
    }

    let oportunidades: any[] = [];

    try {
      const [{ data: clientesData }, { data: orcamentosData }] = await Promise.all([
        supabase.from('clientes').select('*'),
        supabase.from('orcamentos').select('*')
      ]);

      const clientes = clientesData || [];
      const orcamentos = orcamentosData || [];

      oportunidades = NextTripEngineService.calculateOpportunities(
        clientes,
        this.viagens,
        orcamentos,
        this.settings,
        this.user?.id,
        this.perfil?.role
      );
    } catch (e) {
      console.warn('Erro ao carregar Next Trip Engine Widget do Supabase:', e);
    }

    new NextTripDashboardWidget({
      container: mount,
      oportunidades,
      user: this.user,
      perfil: this.perfil,
      onCriarOrcamento: (op) => {
        this.openNovoOrcamentoPreditivo(op);
      },
      onDispararWhatsApp: (op) => {
        this.openWhatsAppPreditivo(op);
      },
      onUpdate: () => {
        this.renderNextTripEngineWidget();
      }
    });
  }

  private openNovoOrcamentoPreditivo(op: any): void {
    window.location.hash = `#orcamentos?novo=true&cliente_id=${op.clienteId}&destino=${encodeURIComponent(op.destinoRecomendado)}`;
  }

  private openWhatsAppPreditivo(op: any): void {
    SendTemplateMessageModal.open({
      clienteNome: op.clienteNome,
      clienteTelefone: op.clienteTelefone || '',
      destino: op.destinoRecomendado,
      consultorNome: op.consultorNome,
      showToast: (msg, type) => this.showToast(msg, type)
    });
  }

  /**
   * Monta o contexto para o componente de apresentação ViagensTableView
   */
  private getViagensTableViewContext(): ViagensTableViewContext {
    const consultorContextoId = DashboardFilterEngine.getConsultorContextoAtivoId(
      this.user,
      this.perfil,
      this.filterStateManager.selectedConsultantId,
      this.filterStateManager.advConsultores
    );

    return {
      user: this.user,
      perfil: this.perfil,
      settings: this.settings,
      consultores: this.consultores,
      buscaTermo: this.filterStateManager.buscaTermo,
      sortField: this.sortField,
      sortDirection: this.sortDirection,
      isTodosReembolsosConcluidos: (v) => DashboardFilterEngine.isTodosReembolsosConcluidos(v),
      checkSLA: (v) => DashboardFilterEngine.checkSLA(v, this.slaPreEmbarqueDias, this.slaPosViagemDias, this.settings, this.tiposProduto),
      getTripFinancialTotals: (v) => DashboardFilterEngine.getTripFinancialTotals(v, consultorContextoId),
      getConsultorContextoAtivoId: () => consultorContextoId
    };
  }

  /**
   * Monta os manipuladores de eventos da tabela e dos cards mobile para ViagensTableView
   */
  private getViagensTableViewHandlers(): ViagensTableViewHandlers {
    return {
      onSort: (field: string) => {
        if (this.sortField === field) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortField = field;
          this.sortDirection = 'asc';
        }
        this.render();
      },
      onOpenTripDetails: (tripId: string) => {
        this.openEdicaoEProdutosModal(tripId);
      },
      onOpenWhatsApp: (tripId: string) => {
        const v = this.viagens.find(trip => trip.id === tripId);
        if (!v) return;

        SendTemplateMessageModal.open({
          clienteNome: v.cliente?.nome || '',
          clienteTelefone: v.cliente?.telefone || '',
          destino: v.destino,
          localizador: v.codigo_localizador,
          dataIda: v.data_ida,
          viagemId: v.id,
          consultorNome: this.consultores.find(c => c.id === v.consultor_id)?.nome || this.perfil?.nome || 'Consultor',
          showToast: (msg, type) => this.showToast(msg, type)
        });
      },
      onCopyNPS: (tripId: string) => {
        const origin = window.location.origin + window.location.pathname;
        const linkFeedback = `${origin}#feedback?id=${tripId}`;
        navigator.clipboard.writeText(linkFeedback).then(() => {
          this.showToast('Link da Pesquisa NPS copiado!', 'success');
        }).catch(err => {
          console.error('Erro ao copiar link NPS:', err);
          this.showToast('Erro ao copiar link NPS.', 'error');
        });
      },
      onDeleteTrip: async (tripId: string) => {
        const confirmResult = await showCustomConfirm(
          'A exclusão apagará permanentemente esta viagem, todos os seus produtos vinculados, comentários e solicitações de reembolso. Deseja realmente prosseguir?',
          'Excluir Viagem',
          { isDestructive: true, confirmText: 'Excluir', cancelText: 'Manter' }
        );

        if (confirmResult) {
          const res = await this.deleteViagem(tripId);
          if (res.success) {
            this.showToast('Viagem excluída com sucesso!', 'success');
            await this.loadViagens();
            this.render();
          } else {
            this.showToast(res.error || 'Erro ao excluir viagem no banco de dados.', 'error');
          }
        }
      },
      onOpenRiskScore: async (tripId: string) => {
        const { RiskDiagnosisDrawer } = await import('../components/risk/RiskDiagnosisDrawer');
        RiskDiagnosisDrawer.open(tripId, this.user, this.perfil, async () => {
          await this.loadViagens();
          this.render();
        });
      },
      onStatusChange: async (tripId: string, newStatus: string, oldStatus: string, selectEl: HTMLSelectElement) => {
        if (newStatus === 'reembolso_solicitado') {
          await this.openRefundModal(tripId, oldStatus, selectEl);
          return;
        }

        const isTransitionValid = await this.validarTransicaoStatus(tripId, newStatus);
        if (!isTransitionValid) {
          selectEl.value = oldStatus;
          return;
        }

        const viagem = this.viagens.find(v => v.id === tripId);
        if (viagem) viagem.status = newStatus;
        this.render();

        try {
          const { error } = await supabase
            .from('viagens')
            .update({ status: newStatus })
            .eq('id', tripId);

          if (error) throw error;
          this.showToast('Status da viagem atualizado com sucesso!', 'success');
        } catch (err: any) {
          console.error('Erro ao atualizar status inline:', err);
          this.showToast('Erro ao atualizar status da viagem.', 'error', err);
          if (viagem) viagem.status = oldStatus;
          this.render();
        }
      },
      onShareMobile: (tripId: string) => {
        const viagem = this.viagens.find(v => v.id === tripId);
        if (viagem) {
          this.compartilharItinerarioMobile(viagem);
        }
      }
    };
  }

  /**
   * Vincula todos os ouvintes de eventos da nova interface em lista do operacional
   */
  private setupUIEventListeners(): void {
    DashboardFilterBar.attachFilterEvents(this.container, this.filterStateManager.createHandlers());

    const searchInput = document.getElementById('input-busca-viagem') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.filterStateManager.buscaTermo = val;
      this.render();

      const input = document.getElementById('input-busca-viagem') as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }

      clearTimeout(this.balcaoSearchTimeout);
      if (val.trim().length >= 2) {
        this.balcaoSearchTimeout = setTimeout(async () => {
          this.balcaoResultados = await BalcaoService.buscarMulticriterio(val);
          this.render();
          const inp = document.getElementById('input-busca-viagem') as HTMLInputElement;
          if (inp) {
            inp.focus();
            inp.setSelectionRange(inp.value.length, inp.value.length);
          }
        }, 300);
      } else {
        this.balcaoResultados = [];
      }
    });

    BalcaoCopilotoSection.attachEvents(this.container, {
      onOpenTrip: async (tripId) => {
        let trip = this.viagens.find(v => v.id === tripId);
        if (!trip) {
          try {
            const { data } = await supabase
              .from('viagens')
              .select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)')
              .eq('id', tripId)
              .maybeSingle();
            if (data) {
              trip = data;
              this.viagens.push(trip);
            }
          } catch (err) {}
        }
        if (trip) {
          this.openEdicaoEProdutosModal(tripId);
        }
      },
      onOpenOrcamento: (orcId) => {
        window.location.hash = `#orcamentos?id=${orcId}`;
      }
    });

    ViagensTableView.attachTableEvents(this.container, this.getViagensTableViewHandlers());

    document.getElementById('btn-fab-nova-viagem')?.addEventListener('click', () => {
      this.openNovaViagemModal();
    });
  }

  /**
   * Compartilha o link do itinerário público utilizando o recurso nativo navigator.share do dispositivo móvel
   */
  private async compartilharItinerarioMobile(viagem: any): Promise<void> {
    const url = `${window.location.origin}/#itinerario?id=${viagem.id}`;
    const title = `Itinerário de Viagem - ${viagem.destino}`;
    const text = `Olá ${viagem.cliente?.nome || 'Passageiro'}, confira os detalhes do seu itinerário de viagem para ${viagem.destino}:`;

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title,
          text,
          url
        });
        return;
      } catch (err) {
        // Usuário cancelou
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      this.showToast('Link do itinerário copiado para a área de transferência!', 'success');
    } catch (e) {
      this.showToast('Erro ao copiar link.', 'error');
    }
  }
}
