import Sortable from 'sortablejs';
import { supabase, getSessaoAtual, logoutConsultor } from '../services/supabase';
import { Viagem, Cliente, ProdutoViagem, GlobalSettings, PerfilConsultor, Destino } from '../types';
import { RiskScoreService } from '../services/riskScoreService';
import { NextTripEngineService } from '../services/nextTripEngineService';
import { NextTripDashboardWidget } from '../components/dashboard/NextTripDashboardWidget';
import { DestinosAutocomplete } from '../components/DestinosAutocomplete';
import { SendTemplateMessageModal } from '../components/dashboard/SendTemplateMessageModal';
import { getAvatarSvg, mesclarAvataresLocais } from '../services/avatars';
import { showCustomConfirm } from '../services/dialog';
import { CommentsService } from '../services/comments';
import { BalcaoService, ResultadoBuscaBalcao } from '../services/balcaoService';
import {
  renderCurrencyInputHTML,
  renderDateInputHTML,
  setupFormValidation,
  formatCurrencyValue,
  formatBrDateToIso,
  formatIsoDateToBr,
  parseDoubleBr,
  formatDateBr,
  validateDate
} from '../utils/masks';
import {
  renderTimelineHTML,
  renderReembolsosTabHTML,
  renderNovoProdutoFormHTML,
  renderLateralEditorPaneHTML
} from '../components/dashboard/DashboardTemplates';

import { ORIGENS_LEAD_PADRAO } from '../controllers/cadastrosController';
import { isNextTripEnabled, isRiskScoreEnabled, isUpsellEnabled } from '../utils/featureFlags';
import { highlightMatch } from '../utils/textHelper';
import { renderSkeletonTable } from '../utils/skeletonHelper';

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
    .animate-sla-critical {
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
    .card-viagem {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: grab;
    }
    .card-viagem:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03);
    }
    html.dark .card-viagem:hover {
      box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.3), 0 4px 8px -2px rgba(0, 0, 0, 0.2);
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
  private consultores: PerfilConsultor[] = [];
  private tiposProduto: any[] = [];
  private selectedConsultantId: string = 'todos';
  private confFilters = {
    finPendente: false,
    finOk: false,
    procPendente: false,
    procOk: false
  };
  private showConfPopover: boolean = false;
  private sortables: Sortable[] = [];
  private buscaTermo: string = '';
  private balcaoResultados: ResultadoBuscaBalcao[] = [];
  private balcaoSearchTimeout: any = null;
  private isFallbackMode: boolean = false;
  private realtimeChannel: any = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private globalSearchListener: ((e: any) => void) | null = null;
  private selectedProductId: string | null = null;
  private destAutocomplete: DestinosAutocomplete | null = null;

  // Propriedades para filtros avançados e controle do painel
  private activeStatusTab: string = 'todos';
  private dataFinStart: string = '';
  private dataFinEnd: string = '';
  private dataIdaStart: string = '';
  private dataIdaEnd: string = '';
  private dataVoltaStart: string = '';
  private dataVoltaEnd: string = '';
  private advMesAno: string = '';
  private advProdutos: string[] = [];
  private advProdutoMatchMode: 'AND' | 'OR' = 'AND';
  private advDestinos: string[] = [];
  private advFornecedor: string = '';
  private advValorMin: number | null = null;
  private advValorMax: number | null = null;
  private advTarifaMin: number | null = null;
  private advTarifaMax: number | null = null;
  private advTaxaMin: number | null = null;
  private advTaxaMax: number | null = null;
  private advComissaoMin: number | null = null;
  private advComissaoMax: number | null = null;
  private advMarkupMin: number | null = null;
  private advMarkupMax: number | null = null;
  private advRavMin: number | null = null;
  private advRavMax: number | null = null;
  private advRentabilidadeMin: number | null = null;
  private advRentabilidadeMax: number | null = null;
  private advMarkupRav: 'todos' | 'com_markup' | 'com_rav' | 'com_markup_ou_rav' | 'com_markup_e_rav' | 'apenas_comissao' | 'sem_markup_rav' = 'todos';
  private advAnexos: 'todos' | 'com_anexo' | 'sem_anexo' | 'com_voucher' | 'sem_voucher' = 'todos';
  private advSla: 'todos' | 'com_alerta' | 'sem_alerta' = 'todos';
  private advRiskScore: string[] = [];
  private advConsultores: string[] = [];
  private advFormasRecebimento: string[] = [];
  private advOrigensLead: string[] = [];
  private advPaxFaixas: string[] = [];
  private advTags: string[] = [];
  private formasRecebimento: any[] = [];
  private origensLead: any[] = [];
  private locPagamentosMap: Map<string, any[]> = new Map();
  private listaDestinosDisponiveis: Destino[] = [];
  private showFiltersPanel: boolean = false;
  private sortField: string = '';
  private sortDirection: 'asc' | 'desc' = 'asc';
  private viewModeMonth: 'current' | 'all' = (localStorage.getItem('paxflow-view-mode-month') as any) || 'current';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Converte com segurança qualquer valor monetário (número ou string formatada pt-BR) para float
   */
  private parseFinancialNumber(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/\s/g, '').replace('R$', '').trim();
      if (cleaned.includes(',') && cleaned.includes('.')) {
        return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
      }
      if (cleaned.includes(',')) {
        return parseFloat(cleaned.replace(',', '.')) || 0;
      }
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  /**
   * Consolida todos os valores financeiros dos produtos e da viagem de forma padronizada
   */
  private getTripFinancialTotals(v: any): {
    totalVenda: number;
    totalTarifa: number;
    totalTaxa: number;
    totalComissao: number;
    totalMarkup: number;
    totalRav: number;
    totalRavLiquido: number;
    totalRentabilidade: number;
    hasProdutos: boolean;
  } {
    const prods = Array.isArray(v.produtos) ? v.produtos : [];
    let totalTarifa = 0;
    let totalTaxa = 0;
    let totalComissao = 0;
    let totalMarkup = 0;
    let totalRav = 0;
    let totalVenda = 0;
    let totalRentabilidade = 0;

    if (prods.length > 0) {
      prods.forEach((p: any) => {
        const tarifa = this.parseFinancialNumber(p.tarifa);
        const taxa = this.parseFinancialNumber(p.taxa);
        const comissao = this.parseFinancialNumber(p.comissao);
        const markup = this.parseFinancialNumber(p.markup);
        const rav = this.parseFinancialNumber(p.rav);
        const venda = this.parseFinancialNumber(p.valor_venda);

        totalTarifa += tarifa;
        totalTaxa += taxa;
        totalComissao += comissao;
        totalMarkup += markup;
        totalRav += rav;
        totalVenda += venda;
        totalRentabilidade += comissao + markup + (rav * 0.88);
      });

      if (totalVenda === 0) {
        totalVenda = this.parseFinancialNumber(v.valor_total);
      }
    } else {
      totalVenda = this.parseFinancialNumber(v.valor_total);
      totalRentabilidade = this.parseFinancialNumber(v.rentabilidade);
    }

    return {
      totalVenda,
      totalTarifa,
      totalTaxa,
      totalComissao,
      totalMarkup,
      totalRav,
      totalRavLiquido: totalRav * 0.88,
      totalRentabilidade,
      hasProdutos: prods.length > 0
    };
  }

  private getFormattedCurrentMonthLabel(): string {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    return `${months[now.getMonth()]}/${now.getFullYear()}`;
  }

  private isCurrentMonthTrip(v: any): boolean {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const rawDate = v.data_financeiro || v.data_ida || v.created_at;
    if (!rawDate) return true;

    let year = 0;
    let month = 0;

    if (typeof rawDate === 'string') {
      const dataStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
      const parts = dataStr.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }
    } else if (rawDate instanceof Date) {
      year = rawDate.getFullYear();
      month = rawDate.getMonth() + 1;
    }

    if (isNaN(year) || isNaN(month) || year === 0 || month === 0) return true;

    return year === curYear && month === curMonth;
  }

  /**
   * Inicializa o painel operacional: valida autenticação, busca SLAs e dados, e renderiza o quadro.
   */
  public async init(targetId?: string): Promise<void> {
    try {
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

      // Carregar tipos de produtos e serviços cadastrados no banco
      await this.loadTiposProduto();
      await this.loadDestinos();

      // 4. Buscar viagens
      await this.loadViagens();

      // 5. Configurar atualizações em tempo real
      this.setupRealtime();
      this.setupStorageListener();

      // 6. Renderizar interface completa
      this.render();

      // 7. Configurar Drag & Drop com SortableJS
      this.setupDragAndDrop();

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
          async (payload: any) => {
            await this.loadViagens();
            this.render();
            this.setupDragAndDrop();
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
    this.buscaTermo = termo;
    this.balcaoResultados = [];
    this.render();
  }

  /**
   * Destrutor da página para limpar listeners globais e sortables
   */
  public destroy(): void {
    this.sortables.forEach(s => s.destroy());
    this.sortables = [];
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
   * Obtém o ícone emoji correspondente a um determinado tipo de produto
   */
  private getIconForType(tipo: string): string {
    const cleanTipo = (tipo || '').trim().toLowerCase();
    const found = this.tiposProduto.find(t => (t.nome || '').trim().toLowerCase() === cleanTipo);
    if (found) return found.icone;

    const fallbackMap: Record<string, string> = {
      'aéreo facial': '✈️',
      'aéreo operadora': '✈️',
      'carro': '🚗',
      'circuito': '🗺️',
      'cruzeiro': '🚢',
      'hotel': '🏨',
      'passeios': '🎟️',
      'seguro viagem': '🛡️',
      'ingressos': '🎫',
      'transfer': '🚐',
      'trem': '🚂',
      'diversos': '📦',
      'casas': '🏡',
      'cias aéreas - assento/bagagem': '🧳',
      'cias aéreas - emissão com pontos': '🪙',
      'mudar!': '⚠️',
      'voo': '✈️',
      'seguro': '🛡️',
      'passeio': '🎟️',
      'outro': '📦'
    };
    return fallbackMap[cleanTipo] || '📦';
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
      console.warn('Erro ao carregar destinos cadastrados:', err.message);
      this.listaDestinosDisponiveis = [];
    }
  }

  /**
   * Carrega as formas de recebimento cadastradas no banco
   */
  private async loadFormasRecebimento(): Promise<void> {
    const padroes = [
      { id: 'pix', nome: 'Pix', icone: '🪙', ativo: true },
      { id: 'cartao_credito', nome: 'Cartão de Crédito', icone: '💳', ativo: true },
      { id: 'boleto', nome: 'Boleto', icone: '📄', ativo: true },
      { id: 'faturado', nome: 'Faturado', icone: '💼', ativo: true },
      { id: 'dinheiro', nome: 'Dinheiro', icone: '💵', ativo: true },
      { id: 'transferencia', nome: 'Transferência / TED', icone: '🏦', ativo: true }
    ];

    try {
      const { data, error } = await supabase
        .from('formas_recebimento')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      this.formasRecebimento = data && data.length > 0 ? data : padroes;
    } catch (err: any) {
      console.warn('Erro ao carregar formas de recebimento (usando fallback padrão):', err.message);
      this.formasRecebimento = padroes;
    }
  }

  /**
   * Carrega as origens de lead cadastradas no banco
   */
  private async loadOrigensLead(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('origens_lead')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      this.origensLead = data && data.length > 0 ? data : ORIGENS_LEAD_PADRAO.filter(o => o.ativo);
    } catch (err: any) {
      console.warn('Erro ao carregar origens de lead (usando fallback padrão):', err.message);
      this.origensLead = ORIGENS_LEAD_PADRAO.filter(o => o.ativo);
    }
  }

  /**
   * Retorna a lista consolidada de tags / classificações únicas presentes em clientes e viagens
   */
  private getListaTagsDisponiveis(): string[] {
    const tagSet = new Set<string>();
    const tagsPadroes = ['VIP', 'Corporativo', 'Família', 'Lua de Mel', 'Resort', 'Aventura', 'Grupo Disney', 'Exótico', 'Cruzeiro'];
    tagsPadroes.forEach(t => tagSet.add(t));

    this.viagens.forEach(v => {
      if (Array.isArray(v.tags)) {
        v.tags.forEach((t: any) => {
          if (t && typeof t === 'string' && t.trim()) tagSet.add(t.trim());
        });
      }
      if (v.cliente && Array.isArray(v.cliente.classificacoes)) {
        v.cliente.classificacoes.forEach((t: any) => {
          if (t && typeof t === 'string' && t.trim()) tagSet.add(t.trim());
        });
      }
    });

    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  /**
   * Retorna a lista completa e normalizada de tipos de produtos disponíveis
   */
  private getListaTiposProdutoDisponiveis(): { id: string; nome: string; icone: string }[] {
    const padroes = [
      { id: 'aéreo facial', nome: 'Aéreo Facial', icone: '✈️' },
      { id: 'aéreo operadora', nome: 'Aéreo Operadora', icone: '✈️' },
      { id: 'hotel', nome: 'Hotel', icone: '🏨' },
      { id: 'carro', nome: 'Carro', icone: '🚗' },
      { id: 'seguro viagem', nome: 'Seguro Viagem', icone: '🛡️' },
      { id: 'cruzeiro', nome: 'Cruzeiro', icone: '🚢' },
      { id: 'passeios', nome: 'Passeios', icone: '🎟️' },
      { id: 'transfer', nome: 'Transfer', icone: '🚐' },
      { id: 'trem', nome: 'Trem', icone: '🚂' },
      { id: 'ingressos', nome: 'Ingressos', icone: '🎫' },
      { id: 'casas', nome: 'Casas', icone: '🏡' },
      { id: 'circuito', nome: 'Circuito', icone: '🗺️' }
    ];

    const map = new Map<string, { id: string; nome: string; icone: string }>();
    padroes.forEach(p => map.set(p.id.toLowerCase(), p));

    (this.tiposProduto || []).forEach((t: any) => {
      const key = (t.nome || '').trim().toLowerCase();
      if (key) {
        map.set(key, {
          id: key,
          nome: t.nome,
          icone: t.icone || this.getIconForType(t.nome)
        });
      }
    });

    return Array.from(map.values());
  }

  /**
   * Retorna a contagem total de critérios de filtro ativos no momento
   */
  private getActiveFiltersCount(): number {
    let count = 0;
    if (this.dataFinStart || this.dataFinEnd) count++;
    if (this.dataIdaStart || this.dataIdaEnd) count++;
    if (this.dataVoltaStart || this.dataVoltaEnd) count++;
    if (this.advMesAno) count++;
    count += this.advProdutos.length;
    count += this.advDestinos.length;
    if (this.advFornecedor.trim()) count++;
    if (this.advValorMin !== null || this.advValorMax !== null) count++;
    if (this.advTarifaMin !== null || this.advTarifaMax !== null) count++;
    if (this.advTaxaMin !== null || this.advTaxaMax !== null) count++;
    if (this.advComissaoMin !== null || this.advComissaoMax !== null) count++;
    if (this.advMarkupMin !== null || this.advMarkupMax !== null) count++;
    if (this.advRavMin !== null || this.advRavMax !== null) count++;
    if (this.advRentabilidadeMin !== null || this.advRentabilidadeMax !== null) count++;
    if (this.advMarkupRav !== 'todos') count++;
    if (this.advAnexos !== 'todos') count++;
    if (this.advSla !== 'todos') count++;
    count += this.advRiskScore.length;
    count += this.advConsultores.length;
    count += this.advFormasRecebimento.length;
    count += this.advOrigensLead.length;
    count += this.advPaxFaixas.length;
    count += this.advTags.length;
    if (this.confFilters.finPendente) count++;
    if (this.confFilters.finOk) count++;
    if (this.confFilters.procPendente) count++;
    if (this.confFilters.procOk) count++;
    return count;
  }

  /**
   * Exporta a lista atual de viagens filtradas para um arquivo CSV formatado para Excel (PT-BR)
   */
  private exportarViagensCsv(viagensParaExportar: any[]): void {
    if (!viagensParaExportar || viagensParaExportar.length === 0) {
      this.showToast('Nenhuma viagem para exportar com os filtros atuais.', 'error');
      return;
    }

    const headers = [
      'ID Ref',
      'Cliente',
      'CPF/Doc',
      'Telefone',
      'Email',
      'Origem do Lead',
      'Qtd PAX',
      'Tags / Classificações',
      'Destino',
      'Data Financeiro',
      'Embarque (Ida)',
      'Retorno (Volta)',
      'Produtos / Serviços',
      'Fornecedores',
      'Localizadores',
      'Formas de Recebimento',
      'Valor Total Venda (R$)',
      'Rentabilidade (R$)',
      'Consultor Responsável',
      'Fase / Status',
      'Conf. Financeira',
      'Conf. Processo',
      'Voucher Geral Anexado'
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatMoedaCsv = (val?: number): string => {
      if (val === undefined || val === null || isNaN(val)) return '0,00';
      return val.toFixed(2).replace('.', ',');
    };

    const rows = viagensParaExportar.map(v => {
      const prods = Array.isArray(v.produtos) ? v.produtos : [];
      const prodNomes = prods.map((p: any) => `${p.tipo || 'Item'}: ${p.descricao || p.nome || ''}`.trim()).join(' | ');
      const fornecedores = Array.from(new Set(prods.map((p: any) => (p.fornecedor || '').trim()).filter(Boolean))).join(', ');
      const locs = Array.from(new Set(prods.map((p: any) => (p.codigo_reserva || '').trim()).filter(Boolean))).join(', ');
      const consultorNome = v.consultor_id === this.user.id ? 'Você' : (this.consultores.find(c => c.id === v.consultor_id)?.nome || 'Consultor');

      const pags = this.locPagamentosMap.get(v.id) || [];
      const formasNomes = Array.from(new Set(pags.map((p: any) => (p.forma_nome || p.forma_recebimento_id || '').trim()).filter(Boolean))).join(', ');
      const origemLead = v.cliente?.lead_origin || v.lead_origin || '';
      const paxCount = Array.isArray(v.passageiros) && v.passageiros.length > 0 ? v.passageiros.length : (Number(v.pax_count) || 1);
      const tagsList = Array.from(new Set([...(v.cliente?.classificacoes || []), ...(v.tags || [])])).join(', ');

      return [
        escapeCsv(v.codigo_ref || v.id?.substring(0, 8) || ''),
        escapeCsv(v.cliente?.nome || 'Cliente não identificado'),
        escapeCsv(v.cliente?.documento || ''),
        escapeCsv(v.cliente?.telefone || ''),
        escapeCsv(v.cliente?.email || ''),
        escapeCsv(origemLead),
        escapeCsv(paxCount),
        escapeCsv(tagsList),
        escapeCsv(v.destino || ''),
        escapeCsv(v.data_financeiro ? formatIsoDateToBr(v.data_financeiro) : ''),
        escapeCsv(v.data_ida ? formatIsoDateToBr(v.data_ida) : ''),
        escapeCsv(v.data_volta ? formatIsoDateToBr(v.data_volta) : ''),
        escapeCsv(prodNomes),
        escapeCsv(fornecedores),
        escapeCsv(locs),
        escapeCsv(formasNomes),
        escapeCsv(formatMoedaCsv(Number(v.valor_total) || 0)),
        escapeCsv(formatMoedaCsv(Number(v.rentabilidade) || 0)),
        escapeCsv(consultorNome),
        escapeCsv(v.status || ''),
        escapeCsv(v.isFinanceiroConferido ? 'OK' : 'Pendente'),
        escapeCsv(v.isProcessoConferido ? 'OK' : 'Pendente'),
        escapeCsv(v.voucher_geral_anexado ? 'SIM' : 'NÃO')
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dataHora = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    link.setAttribute('download', `PaxFlow_Viagens_Export_${dataHora}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast(`Planilha exportada com sucesso! (${viagensParaExportar.length} viagens)`, 'success');
  }

  /**
   * Busca as viagens e realiza o filtro baseado no cargo (Role) do consultor logado
   */
  private async loadViagens(): Promise<void> {
    try {
      this.isFallbackMode = false;
      // Junção com a tabela de clientes e reembolsos para obter informações completas
      let query = supabase
        .from('viagens')
        .select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)');

      // Carrega viagens para busca global (Modo Co-Piloto) e visualização operacional
      const { data, error } = await query;

      if (error) {
        throw error;
      }

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
            .select('viagem_id, forma_recebimento_id, forma_nome, valor');
          if (!pagsError && pagsData) {
            locPags = pagsData;
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
        this.locPagamentosMap.get(vId)!.push(p);
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

      // Agrupa comentários por viagem relacionada
      const tripCommentsMap = new Map<string, string[]>();
      
      // Mapeia IDs de produtos para seus respectivos IDs de viagem
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
        const produtos = v.produtos || [];
        const totalProdutos = produtos.reduce((sum: number, p: any) => sum + (Number(p.valor_venda) || 0), 0);
        const valorViagem = Number(v.valor_total) || 0;
        const saldoPendente = valorViagem - totalProdutos;
        const isSaldoZerado = Math.abs(saldoPendente) <= 0.01;
        const hasProdutos = produtos.length > 0;

        const todosDetalhados = produtos.every((p: any) => {
          const tarifa = Number(p.tarifa) || 0;
          const taxa = Number(p.taxa) || 0;
          const comissao = Number(p.comissao) || 0;
          const markup = Number(p.markup) || 0;
          const rav = Number(p.rav) || 0;
          const totalDet = tarifa + taxa + comissao + markup + rav;
          return Math.abs(Number(p.valor_venda || 0) - totalDet) < 0.01;
        });

        const locKeys = Array.from(new Set(produtos.map((p: any) => (p.codigo_reserva || 'SEM LOCALIZADOR').trim().toUpperCase())));
        const confMap = locConfsMap.get(v.id) || {};
        const todosLocsConferidos = locKeys.length > 0 && locKeys.every((k: any) => !!confMap[k]);

        const financeiroOk = hasProdutos && isSaldoZerado && todosDetalhados && todosLocsConferidos;
        const processoOk = !!v.processo_conferido;

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
          isProcessoConferido: processoOk
        };
      });
    } catch (err: any) {
      this.isFallbackMode = true;
      console.warn('Erro ao carregar viagens do banco. Mantendo estado atual:', err.message);
    }
  }

  private saveViagensToLocalStorage(): void {
    // Operação em memória: viagens já gerenciadas pelo estado da aplicação
  }

  private loadViagensFromLocalStorage(): void {
    // Operação em memória
  }

  /**
   * Deleta uma viagem e todas as suas dependências (apenas Admins)
   */
  private async deleteViagem(tripId: string): Promise<boolean> {
    if (this.isFallbackMode) {
      this.viagens = this.viagens.filter(v => v.id !== tripId);
      this.saveViagensToLocalStorage();
      return true;
    }

    try {
      // 1. Deletar comentários vinculados
      const { error: errComments } = await supabase
        .from('comentarios')
        .delete()
        .eq('tipo_item', 'viagem')
        .eq('item_id', tripId);
      if (errComments) console.warn('Aviso ao excluir comentários:', errComments.message);

      // 2. Deletar notificações vinculadas
      const { error: errNotifs } = await supabase
        .from('notificacoes')
        .delete()
        .eq('tipo_item', 'viagem')
        .eq('parent_id', tripId);
      if (errNotifs) console.warn('Aviso ao excluir notificações:', errNotifs.message);

      // 3. Deletar pagamentos e conferências de localizadores
      const { error: errPags } = await supabase
        .from('loc_pagamentos')
        .delete()
        .eq('viagem_id', tripId);
      if (errPags) console.warn('Aviso ao excluir loc_pagamentos:', errPags.message);

      const { error: errConfs } = await supabase
        .from('loc_conferencias')
        .delete()
        .eq('viagem_id', tripId);
      if (errConfs) console.warn('Aviso ao excluir loc_conferencias:', errConfs.message);

      // 4. Deletar lembretes e NPS da viagem
      try {
        await supabase.from('lembretes').delete().eq('viagem_id', tripId);
      } catch (e) {}

      try {
        await supabase.from('feedbacks_nps').delete().eq('viagem_id', tripId);
      } catch (e) {}

      // 5. Deletar reembolsos vinculados
      const { error: errRefunds } = await supabase
        .from('reembolsos')
        .delete()
        .eq('viagem_id', tripId);
      if (errRefunds) console.warn('Aviso ao excluir reembolsos:', errRefunds.message);

      // 6. Deletar produtos vinculados
      const { error: errProducts } = await supabase
        .from('produtos_viagem')
        .delete()
        .eq('viagem_id', tripId);
      if (errProducts) console.warn('Aviso ao excluir produtos:', errProducts.message);

      // 7. Deletar a viagem em si
      const { error: errTrip } = await supabase
        .from('viagens')
        .delete()
        .eq('id', tripId);

      if (errTrip) throw errTrip;

      this.viagens = this.viagens.filter(v => v.id !== tripId);
      this.saveViagensToLocalStorage();
      return true;
    } catch (err: any) {
      console.error('Erro ao deletar viagem:', err);
      return false;
    }
  }

  /**
   * Calcula o status do SLA para uma determinada viagem
   */
  private checkSLA(viagem: any): { alert: boolean; type: 'pre-embarque' | 'pos-viagem' | null; text: string } {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let urgentAlert: { dias: number; text: string } | null = null;

    const checkDateUrgency = (dateStr: string, label: string) => {
      if (!dateStr) return;
      const targetDate = new Date(dateStr + 'T00:00:00');
      targetDate.setHours(0, 0, 0, 0);

      const diferencaTempo = targetDate.getTime() - hoje.getTime();
      const diasRestantes = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

      if (diasRestantes >= 0 && diasRestantes <= this.slaPreEmbarqueDias) {
        if (!urgentAlert || diasRestantes < urgentAlert.dias) {
          urgentAlert = {
            dias: diasRestantes,
            text: `${label} em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`
          };
        }
      }
    };

    // Regra de SLA para "Pré-Embarque"
    if (viagem.status === 'pre_embarque' || viagem.status === 'fechado') {
      // 1. Verificar data principal da viagem
      checkDateUrgency(viagem.data_ida, 'Embarque');

      // 2. Verificar datas de cada produto/serviço
      if (viagem.produtos && Array.isArray(viagem.produtos)) {
        viagem.produtos.forEach((p: any) => {
          const icon = this.getIconForType(p.tipo);
          const labelBase = `${icon} ${p.fornecedor}`;

          // Data principal do serviço
          checkDateUrgency(p.data_servico, `${labelBase}`);

          // Datas adicionais
          if (p.datas_adicionais && Array.isArray(p.datas_adicionais)) {
            p.datas_adicionais.forEach((d: any) => {
              checkDateUrgency(d.data, `${labelBase} (${d.rotulo})`);
            });
          }

          // Trechos aéreos
          if (p.dados_adicionais && Array.isArray(p.dados_adicionais.trechos)) {
            p.dados_adicionais.trechos.forEach((t: any, idx: number) => {
              const labelTrecho = `${icon} ${p.fornecedor} - Trecho ${idx + 1} (${t.origem} ➔ ${t.destino})`;
              if (t.dataIda) {
                checkDateUrgency(t.dataIda, `${labelTrecho} (Ida)`);
              }
              if (t.dataVolta) {
                checkDateUrgency(t.dataVolta, `${labelTrecho} (Volta)`);
              }
            });
          }
        });
      }

      if (urgentAlert) {
        return {
          alert: true,
          type: 'pre-embarque',
          text: `⚠️ ${(urgentAlert as any).text}!`
        };
      }
    }

    // Regra de SLA para "Pós-Viagem" (contato obrigatório pós-retorno dentro do prazo de SLA)
    const isPosContatoConcluido = Boolean(
      viagem.pos_contato_concluido ||
      viagem.nps_respondido ||
      viagem.nps_nota !== undefined ||
      viagem.npsNota !== undefined ||
      viagem.status === 'concluida'
    );

    if (viagem.status === 'pos_viagem' && viagem.data_volta && !isPosContatoConcluido) {
      const dataVolta = new Date(viagem.data_volta + 'T00:00:00');
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
   * (Desativado na transição de Kanban para Tabela Operacional)
   */
  private setupDragAndDrop(): void {
    // Deprecado
  }

  /**
   * Valida a transição de status de uma viagem operando sob as mesmas regras do antigo Kanban
   */
  private async validarTransicaoStatus(tripId: string, newStatus: string): Promise<boolean> {
    if (newStatus === 'fechado') return true;

    const viagem = this.viagens.find(v => v.id === tripId);
    if (!viagem) return false;

    if (viagem.status === 'fechado' && newStatus === 'pos_venda') {
      this.showToast('Não é possível alterar o status manualmente de Fechado para Pós-Venda. Essa alteração ocorre automaticamente quando as validações Financeira e de Processo estiverem concluídas.', 'error');
      return false;
    }

    // 1. Validação de data financeira (obrigatória para fases finais/operacionais como Pós-Venda)
    if (newStatus === 'pos_venda' && !viagem.data_financeiro) {
      this.showToast('Não é possível alterar para Pós-Venda. A Data Financeiro é obrigatória para esta fase. Por favor, defina a data abrindo os detalhes da viagem.', 'error');
      return false;
    }

    // 2. Buscar produtos da viagem
    let produtos: any[] = [];
    if (!this.isFallbackMode) {
      try {
        const { data, error } = await supabase
          .from('produtos_viagem')
          .select('valor_venda, tarifa, taxa, comissao, markup, rav, fornecedor, descricao')
          .eq('viagem_id', tripId);
        if (!error && data) {
          produtos = data;
        }
      } catch (errCheck) {
        console.warn('Erro ao carregar produtos para validação:', errCheck);
      }
    }
    if (produtos.length === 0) {
      produtos = viagem.produtos || [];
    }

    // 3. Validar relação entre produtos e total da viagem
    const totalProdutos = produtos.reduce((sum, p) => sum + (Number(p.valor_venda) || 0), 0);
    const valorViagem = Number(viagem.valor_total) || 0;
    const pendente = valorViagem - totalProdutos;

    if (produtos.length > 0 && Math.abs(pendente) > 0.01) {
      const confirmSync = await showCustomConfirm(
        `O valor total da viagem (R$ ${valorViagem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) difere da soma dos produtos (R$ ${totalProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Deseja sincronizar automaticamente o valor da viagem com a soma dos produtos para avançar?`,
        'Sincronizar Valor da Viagem'
      );
      if (confirmSync) {
        try {
          await supabase.from('viagens').update({ valor_total: totalProdutos }).eq('id', tripId);
          viagem.valor_total = totalProdutos;
        } catch (syncErr) {
          console.warn('Falha ao sincronizar valor total da viagem:', syncErr);
        }
      } else {
        this.showToast(`Existe uma diferença de R$ ${Math.abs(pendente).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} entre a viagem e os produtos. Ajuste os produtos ou o valor da viagem para prosseguir.`, 'error');
        return false;
      }
    } else if (produtos.length === 0 && valorViagem > 0) {
      this.showToast('Esta viagem ainda não possui produtos cadastrados. Adicione ao menos um produto na aba "Produtos e Serviços" para avançar.', 'error');
      return false;
    }

    // 4. Validar se todos os produtos cadastrados estão detalhados ao avançar para Pós-Venda
    if (newStatus === 'pos_venda') {
      const produtoNaoDetalhado = produtos.find(p => {
        const tarifa = Number(p.tarifa) || 0;
        const taxa = Number(p.taxa) || 0;
        const comissao = Number(p.comissao) || 0;
        const markup = Number(p.markup) || 0;
        const rav = Number(p.rav) || 0;
        const totalDet = tarifa + taxa + comissao + markup + rav;
        return Math.abs(Number(p.valor_venda || 0) - totalDet) > 0.01;
      });

      if (produtoNaoDetalhado) {
        this.showToast(`Não é possível avançar para Pós-Venda. O produto "${produtoNaoDetalhado.fornecedor} - ${produtoNaoDetalhado.descricao}" não está com seus valores 100% detalhados (soma de Tarifa + Taxa + Comissão deve ser igual ao Valor de Venda do produto).`, 'error');
        return false;
      }
    }

    return true;
  }

  /**
   * Abre o Modal Dinâmico para solicitação de reembolso de um produto
   */
  private async openRefundModal(tripId: string, oldStatus: string): Promise<void> {
    this.renderModalOverlay('max-w-lg');

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
            <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Nenhum produto cadastrado</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Esta viagem não possui produtos/serviços vinculados para reembolso.</p>
            <button id="btn-cancel-modal" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition">
              Voltar
            </button>
          </div>
        `;
        document.getElementById('btn-cancel-modal')?.addEventListener('click', () => {
          this.closeModal();
          this.render();
          this.setupDragAndDrop();
        });
        return;
      }

      // Renderiza o formulário de reembolso no modal
      modalContent.innerHTML = `
        <div class="p-6">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span class="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-lg text-lg">💸</span>
              Solicitar Reembolso / Cancelamento
            </h3>
            <button id="btn-close-x" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 transition text-lg">&times;</button>
          </div>
          
          <form id="form-reembolso" class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Selecione o Produto a Cancelar *</label>
              <select id="select-produto" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium">
                <option value="" disabled selected class="text-slate-400 dark:text-slate-400">Escolha um produto da viagem...</option>
                ${produtos.map(p => `
                  <option value="${p.id}" data-valor="${p.valor_venda}" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                    [${p.tipo.toUpperCase()}] ${p.fornecedor} - ${p.descricao} (Venda: R$ ${Number(p.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor do Reembolso Solicitado (R$) *</label>
              ${renderCurrencyInputHTML('input-valor-reembolso', '')}
              <p class="text-xs text-slate-400 dark:text-slate-400 mt-1.5 font-medium">Sugerido por padrão o valor integral de venda do produto.</p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Motivo / Justificativa do Cancelamento</label>
              <textarea id="textarea-motivo" placeholder="Justifique o motivo do cancelamento para documentar o processo..." rows="3" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800 dark:text-slate-100 text-sm font-medium"></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button id="btn-cancel-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition uppercase text-xs tracking-wider">Cancelar</button>
              <button type="submit" class="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-rose-500/20 transition uppercase">Solicitar Reembolso</button>
            </div>
          </form>
        </div>
      `;

      // Inicializa a validação do formulário de reembolso
      setupFormValidation('form-reembolso', [
        { id: 'input-valor-reembolso', type: 'currency' }
      ]);

      // Auto-preenche o valor do reembolso quando um produto é selecionado
      const selectProd = document.getElementById('select-produto') as HTMLSelectElement;
      const inputValor = document.getElementById('input-valor-reembolso') as HTMLInputElement;
      
      selectProd?.addEventListener('change', () => {
        const option = selectProd.options[selectProd.selectedIndex];
        const valorVenda = option.getAttribute('data-valor');
        if (valorVenda) {
          inputValor.value = formatCurrencyValue(parseFloat(valorVenda));
        }
      });

      const handleCancel = () => {
        this.closeModal();
        this.render();
        this.setupDragAndDrop();
      };
      
      document.getElementById('btn-close-x')?.addEventListener('click', handleCancel);
      document.getElementById('btn-cancel-modal')?.addEventListener('click', handleCancel);

      // Tratamento do envio do formulário
      const form = document.getElementById('form-reembolso') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedProdId = selectProd.value;
        const valorReembolso = parseDoubleBr(inputValor.value);
        const motivo = (document.getElementById('textarea-motivo') as HTMLTextAreaElement).value;

        if (!selectedProdId || !valorReembolso || !motivo) {
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
              status: 'solicitado',
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
          this.showToast('Erro interno ao processar solicitação de reembolso.', 'error', err);
        }
      });

    } catch (err: any) {
      console.error('Erro ao abrir modal:', err);
      this.closeModal();
      this.render();
      this.setupDragAndDrop();
    }
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
      // Caso haja fluxo de navegação, redirecionar para a home
      window.location.reload();
    });
  }

  /**
   * Abre o Modal Interativo de Criação de Viagem / Card
   */
  private async openNovaViagemModal(): Promise<void> {
    const canCreateTripDirectly = this.perfil?.role === 'admin' || !!this.settings?.permitirConsultorCriarViagem || !!this.settings?.permitir_consultor_criar_viagem;
    if (!canCreateTripDirectly) {
      this.showToast('Criação direta de viagens desativada para consultores. Utilize o fluxo de Orçamentos.', 'error');
      return;
    }

    try {
      this.renderModalOverlay('max-w-lg');
      const modalContent = document.getElementById('modal-content-container');
      if (!modalContent) return;

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

      if (errClientes) throw errClientes;

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
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">✈️ Nova Viagem / Card</h3>
            <button id="btn-close-viagem-x" class="text-slate-400 hover:text-rose-500 font-bold transition">✕</button>
          </div>

          <form id="form-nova-viagem" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Passageiro / Cliente *</label>
              <select id="select-viagem-cliente" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm">
                <option value="" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Selecione o cliente...</option>
                ${clientes.map(c => `<option value="${c.id}" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${c.nome}</option>`).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Destino *</label>
                <input id="input-viagem-destino" type="text" required placeholder="ex: Paris, Orlando, etc." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Código Localizador (LOC)</label>
                <input id="input-viagem-loc" type="text" placeholder="ex: F3R9W" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm uppercase" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Total (R$) *</label>
              ${renderCurrencyInputHTML('input-viagem-valor', '')}
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data de Ida (DD/MM/AAAA) *</label>
                ${renderDateInputHTML('input-viagem-ida', '')}
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data de Volta (DD/MM/AAAA) *</label>
                ${renderDateInputHTML('input-viagem-volta', '')}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status / Etapa Inicial *</label>
                <select id="select-viagem-status" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm">
                  <option value="pos_venda" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pós-Venda</option>
                  <option value="fechado" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Fechado</option>
                  <option value="pre_embarque" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pré-Embarque</option>
                  <option value="pos_viagem" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pós-Viagem</option>
                </select>
              </div>
              <div>
                <label id="label-input-viagem-data-financeiro" class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data Financeiro (DD/MM/AAAA) *</label>
                ${renderDateInputHTML('input-viagem-data-financeiro', '', 'DD/MM/AAAA', true)}
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Observações Operacionais</label>
              <textarea id="textarea-viagem-obs" placeholder="Detalhes de voo, hotel, etc." rows="2" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm"></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button id="btn-cancel-viagem" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
              <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Criar Viagem</button>
            </div>
          </form>
        </div>
      `;

      const novaViagemValidator = setupFormValidation('form-nova-viagem', [
        { id: 'input-viagem-valor', type: 'currency' },
        { id: 'input-viagem-ida', type: 'date' },
        { id: 'input-viagem-volta', type: 'date' },
        { id: 'input-viagem-data-financeiro', type: 'date', required: true }
      ]);

      let selectedDestinoId: string | null = null;
      const inputDestino = document.getElementById('input-viagem-destino') as HTMLInputElement;
      if (inputDestino) {
        this.destAutocomplete = new DestinosAutocomplete(inputDestino, (destino) => {
          selectedDestinoId = destino ? destino.id : null;
        });
      }

      const selectStatus = document.getElementById('select-viagem-status') as HTMLSelectElement;
      const inputFinNew = document.getElementById('input-viagem-data-financeiro') as HTMLInputElement;
      const labelFinNew = document.getElementById('label-input-viagem-data-financeiro');

      const updateNewFinRequired = () => {
        if (!selectStatus || !inputFinNew) return;
        const isRequired = selectStatus.value !== 'fechado';
        if (isRequired) {
          inputFinNew.setAttribute('required', '');
          if (labelFinNew) labelFinNew.innerHTML = 'Data Financeiro (DD/MM/AAAA) *';
        } else {
          inputFinNew.removeAttribute('required');
          if (labelFinNew) labelFinNew.innerHTML = 'Data Financeiro (DD/MM/AAAA)';
        }
        inputFinNew.dispatchEvent(new Event('input'));
      };

      selectStatus?.addEventListener('change', updateNewFinRequired);
      updateNewFinRequired();

      const handleClose = () => this.closeModal();
      document.getElementById('btn-close-viagem-x')?.addEventListener('click', handleClose);
      document.getElementById('btn-cancel-viagem')?.addEventListener('click', handleClose);

      const form = document.getElementById('form-nova-viagem') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clienteId = (document.getElementById('select-viagem-cliente') as HTMLSelectElement).value;
        const destino = (document.getElementById('input-viagem-destino') as HTMLInputElement).value;
        const loc = (document.getElementById('input-viagem-loc') as HTMLInputElement).value.trim();
        const valorRaw = (document.getElementById('input-viagem-valor') as HTMLInputElement).value.trim();
        const vIdaRaw = (document.getElementById('input-viagem-ida') as HTMLInputElement).value.trim();
        const vVoltaRaw = (document.getElementById('input-viagem-volta') as HTMLInputElement).value.trim();
        const vFinRaw = (document.getElementById('input-viagem-data-financeiro') as HTMLInputElement).value.trim();
        const status = (document.getElementById('select-viagem-status') as HTMLSelectElement).value;
        const obs = (document.getElementById('textarea-viagem-obs') as HTMLTextAreaElement).value;

        if (!novaViagemValidator.validateAll()) {
          this.showToast('Preencha todos os campos obrigatórios com valores válidos.', 'error');
          return;
        }

        const vIdaResult = validateDate(vIdaRaw);
        if (!vIdaResult.isValid) {
          this.showToast(`Data de Ida inválida: ${vIdaResult.message}`, 'error');
          return;
        }
        const vVoltaResult = validateDate(vVoltaRaw);
        if (!vVoltaResult.isValid) {
          this.showToast(`Data de Volta inválida: ${vVoltaResult.message}`, 'error');
          return;
        }
        if (status !== 'fechado') {
          const vFinResult = validateDate(vFinRaw);
          if (!vFinResult.isValid) {
            this.showToast(`Data Financeiro inválida: ${vFinResult.message}`, 'error');
            return;
          }
        }

        const vIda = formatBrDateToIso(vIdaRaw)!;
        const vVolta = formatBrDateToIso(vVoltaRaw)!;
        const vFin = vFinRaw ? formatBrDateToIso(vFinRaw) : null;

        const idaDate = new Date(vIda);
        const voltaDate = new Date(vVolta);
        if (voltaDate.getTime() < idaDate.getTime()) {
          this.showToast('A data de volta não pode ser anterior à data de ida.', 'error');
          return;
        }

        const valor = parseDoubleBr(valorRaw);

        const payload = {
          cliente_id: clienteId,
          consultor_id: this.user.id,
          destino: destino,
          destino_id: selectedDestinoId || null,
          codigo_localizador: loc || null,
          valor_total: valor,
          data_ida: vIda,
          data_volta: vVolta,
          data_financeiro: vFin,
          status: status,
          observacoes: obs || null
        };

        try {
          const { error } = await supabase
            .from('viagens')
            .insert(payload);

          if (error) throw error;

          this.showToast('Viagem cadastrada com sucesso!', 'success');
          this.closeModal();
          await this.loadViagens();
          this.render();
          this.setupDragAndDrop();
        } catch (err: any) {
          console.error('Erro ao cadastrar viagem:', err);
          this.showToast('Erro ao criar viagem.', 'error', err);
        }
      });

    } catch (err: any) {
      console.error('Erro ao abrir modal de nova viagem:', err);
      this.showToast('Erro ao carregar modal de criação.', 'error', err);
      this.closeModal();
    }
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
        this.setupDragAndDrop();
      },
      showToast: (message, type, err) => this.showToast(message, type, err),
      checkSLA: (viagem) => this.checkSLA(viagem)
    });
    await modal.open(tripId, activeTab);
  }

  /**
   * Cria o overlay estrutural do modal se ele ainda não existir e abre a exibição
   */
  private renderModalOverlay(maxWidthClass: string = 'max-w-lg'): void {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'fixed inset-0 modal-overlay-blur z-50 flex items-center justify-center opacity-0 pointer-events-none';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 transform scale-95 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar" id="modal-container">
          <div id="modal-content-container"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const container = document.getElementById('modal-container');
    if (container) {
      // Remove any existing max-w- class and apply the new one
      container.className = container.className.replace(/\bmax-w-\S+/g, '');
      container.classList.add(maxWidthClass);
    }
    
    // Anima a abertura removendo as classes de fechamento e adicionando as de abertura
    setTimeout(() => {
      if (overlay) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
      }
      if (container) {
        container.classList.remove('scale-95');
        container.classList.add('scale-100');
      }
    }, 10);
  }

  /**
   * Fecha o modal com transição suave
   */
  private closeModal(): void {
    if (this.destAutocomplete) {
      this.destAutocomplete.destroy();
      this.destAutocomplete = null;
    }
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
   * Abre o Modal de Detalhamento de Valores (Tarifa, Taxa, Comissão) para um produto
   */


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
    if (!this.buscaTermo || !this.balcaoResultados || this.balcaoResultados.length === 0) return '';

    const currentUserId = this.user?.id;
    const mainListTripIds = new Set(this.viagens.filter(v => {
      if (this.perfil?.role !== 'admin') {
        return v.consultor_id === currentUserId || v.consultor_responsavel_id === currentUserId;
      }
      return true;
    }).map(v => v.id));

    // Filtra balcaoResultados removendo os itens do próprio usuário ou que já estejam na lista principal
    const resultadosFiltrados = this.balcaoResultados.map(res => {
      const viagensOutros = (res.viagens || []).filter(v => {
        const isMinhaViagem = v.consultorId === currentUserId;
        const jaEstaNaListaPrincipal = mainListTripIds.has(v.id);
        return !isMinhaViagem && !jaEstaNaListaPrincipal;
      });

      const orcamentosOutros = (res.orcamentos || []).filter(o => {
        const isMeuOrcamento = o.consultorId === currentUserId;
        return !isMeuOrcamento;
      });

      return {
        ...res,
        viagens: viagensOutros,
        orcamentos: orcamentosOutros
      };
    }).filter(res => res.viagens.length > 0 || res.orcamentos.length > 0);

    if (resultadosFiltrados.length === 0) return '';

    return `
      <div class="mb-6 p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-xl border border-indigo-500/30 animate-fade-in shrink-0">
        <div class="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-indigo-500/20">
          <div class="flex items-center gap-2.5">
            <span class="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-base">🤝</span>
            <div>
              <h3 class="text-sm font-black tracking-wide text-indigo-100 uppercase">Modo Co-Piloto — Pesquisa de Balcão (Outros Consultores)</h3>
              <p class="text-xs text-indigo-300">Clientes de outros consultores localizados para atendimento presencial no balcão.</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider">${resultadosFiltrados.length} cliente(s) localizado(s)</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${resultadosFiltrados.map(res => `
            <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-indigo-500/50 transition">
              <div>
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="font-extrabold text-sm text-white truncate">${res.cliente.nome}</span>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Cliente</span>
                </div>
                <div class="text-[11px] text-slate-400 space-y-0.5 font-mono">
                  ${res.cliente.cpf ? `<div>CPF: ${res.cliente.cpf}</div>` : ''}
                  ${res.cliente.telefone ? `<div>Tel: ${res.cliente.telefone}</div>` : ''}
                  ${res.cliente.email ? `<div>Email: ${res.cliente.email}</div>` : ''}
                </div>
              </div>

              <div class="space-y-1.5 pt-2 border-t border-slate-700/40">
                ${res.viagens.map(v => `
                  <div class="flex items-center justify-between gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                    <div class="truncate">
                      <span class="block font-bold text-indigo-200 truncate">✈️ ${v.titulo}</span>
                      <span class="block text-[10px] text-slate-400">Consultor: ${v.consultorNome}</span>
                    </div>
                    <button class="btn-balcao-open-trip shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-extrabold transition uppercase shadow-md" data-trip-id="${v.id}">
                      Atender 🤝
                    </button>
                  </div>
                `).join('')}

                ${res.orcamentos.map(o => `
                  <div class="flex items-center justify-between gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                    <div class="truncate">
                      <span class="block font-bold text-amber-200 truncate">📋 ${o.titulo}</span>
                      <span class="block text-[10px] text-slate-400">Consultor: ${o.consultorNome}</span>
                    </div>
                    <button class="btn-balcao-open-orc shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-extrabold transition uppercase shadow-md" data-orc-id="${o.id}">
                      Atender 🤝
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

     /**
   * Renderiza a interface do Dashboard principal
   */
  private render(): void {
    // 1. Filtragem por consultor e Mês Corrente
    const totalPorConsultor = this.viagens.filter(v => {
      const vConsultorId = v.consultor_id || (v as any).consultorId;
      const vRespId = v.consultor_responsavel_id || (v as any).consultorResponsavelId;

      if (this.perfil?.role !== 'admin') {
        if (vConsultorId !== this.user?.id && vRespId !== this.user?.id) return false;
      } else if (this.selectedConsultantId !== 'todos') {
        if (vConsultorId !== this.selectedConsultantId && vRespId !== this.selectedConsultantId) return false;
      }

      if (!this.buscaTermo) {
        if (this.viewModeMonth === 'current' && !this.isCurrentMonthTrip(v)) return false;
      }
      return true;
    });

    // 2. Contadores para cada aba de status (com base no consultor selecionado)
    const counts = {
      todos: totalPorConsultor.length,
      fechado: totalPorConsultor.filter(v => v.status === 'fechado').length,
      pos_venda: totalPorConsultor.filter(v => v.status === 'pos_venda').length,
      pre_embarque: totalPorConsultor.filter(v => v.status === 'pre_embarque').length,
      pos_viagem: totalPorConsultor.filter(v => v.status === 'pos_viagem').length,
      reembolso_solicitado: totalPorConsultor.filter(v => v.status === 'reembolso_solicitado').length
    };

    // 3. Aplicação completa de filtros: Busca textual + Mês Corrente + Aba ativa + Filtros de Data Avançados
    const filtrados = this.viagens.filter(v => {
      const vConsultorId = v.consultor_id || (v as any).consultorId;
      const vRespId = v.consultor_responsavel_id || (v as any).consultorResponsavelId;

      // Filtro de Consultor (aplica-se sempre, com ou sem busca textual)
      if (this.perfil?.role !== 'admin') {
        if (vConsultorId !== this.user?.id && vRespId !== this.user?.id) return false;
      } else if (this.selectedConsultantId !== 'todos') {
        if (vConsultorId !== this.selectedConsultantId && vRespId !== this.selectedConsultantId) return false;
      }

      // Filtro de Mês Corrente (apenas quando não houver busca textual global)
      if (!this.buscaTermo) {
        if (this.viewModeMonth === 'current' && !this.isCurrentMonthTrip(v)) return false;
      }

      // Filtro de Aba de Status ativa
      if (this.activeStatusTab !== 'todos') {
        if (v.status !== this.activeStatusTab) return false;
      }

      // Filtro de Conferência Avançado (Multi-Pills para Admins)
      if (this.perfil?.role === 'admin') {
        const { finPendente, finOk, procPendente, procOk } = this.confFilters;
        const isFinOk = !!v.isFinanceiroConferido;
        const isProcOk = !!v.isProcessoConferido;

        // Filtro Financeiro: se marcou apenas pendente ou apenas OK
        if (finPendente && !finOk && isFinOk) return false;
        if (finOk && !finPendente && !isFinOk) return false;

        // Filtro Processo: se marcou apenas pendente ou apenas OK
        if (procPendente && !procOk && isProcOk) return false;
        if (procOk && !procPendente && !isProcOk) return false;
      }

      // Busca Textual Multicritério Global (Nome, CPF, Telefone, E-mail, Título, Destino, LOC, Produtos, Passageiros)
      if (this.buscaTermo) {
        const q = this.buscaTermo.toLowerCase().trim();
        const qClean = q.replace(/\D/g, '');

        // 1. Cliente
        const cliNome = (v.cliente?.nome || v.cliente_nome || v.nome_cliente || v.nomeCliente || '').toLowerCase();
        const cliDoc = (v.cliente?.documento || v.cliente?.cpf || v.cpf || v.documento || '').toLowerCase();
        const cliDocClean = cliDoc.replace(/\D/g, '');
        const cliEmail = (v.cliente?.email || v.email || '').toLowerCase();
        const cliTelefone = (v.cliente?.telefone || v.telefone || '').toLowerCase();
        const cliTelClean = cliTelefone.replace(/\D/g, '');

        // 2. Dados da Viagem
        const titulo = (v.titulo || v.nome_viagem || v.nomeViagem || v.nome || '').toLowerCase();
        const dest = (v.destino || v.destino_ref?.nome || v.destinoRef?.nome || '').toLowerCase();
        const loc = (v.codigo_localizador || v.codigoLocalizador || v.localizador || '').toLowerCase();
        const ref = (v.codigo_ref || v.codigoRef || '').toLowerCase();
        const obs = (v.observacoes || v.obs || '').toLowerCase();
        const statusStr = (v.status || '').toLowerCase();
        const consultorNomeReal = (v.consultor?.nome || v.consultor_nome || '').toLowerCase();
        const consultorNome = v.consultor_id === this.user?.id ? 'você' : 'outro consultor';

        // 3. Passageiros
        const matchesPassageiros = Array.isArray(v.passageiros) && v.passageiros.some((p: any) => {
          const pName = typeof p === 'string' ? p : (p?.nome || p?.name || '');
          return (pName || '').toLowerCase().includes(q);
        });

        // 4. Produtos e Serviços vinculados
        const matchesProdutos = Array.isArray(v.produtos) && v.produtos.some((p: any) => {
          const prodTitle = (p.titulo || p.nome || p.descricao || '').toLowerCase();
          const prodForn = (p.fornecedor || '').toLowerCase();
          const prodTipo = (p.tipo || p.tipo_produto || '').toLowerCase();
          const prodReserva = (p.codigo_reserva || p.localizador || '').toLowerCase();
          const prodObs = (p.observacoes || '').toLowerCase();
          return prodTitle.includes(q) || prodForn.includes(q) || prodTipo.includes(q) || prodReserva.includes(q) || prodObs.includes(q);
        });

        // 5. Comentários
        const matchesComments = Array.isArray(v.comentarios_busca) && v.comentarios_busca.some((text: string) => {
          return (text || '').toLowerCase().includes(q);
        });

        // 6. Números Limpos (CPF / Telefone)
        const matchesCleanDigits = qClean.length >= 3 && (
          (cliDocClean.length > 0 && cliDocClean.includes(qClean)) ||
          (cliTelClean.length > 0 && cliTelClean.includes(qClean))
        );

        const matches = (
          cliNome.includes(q) ||
          cliDoc.includes(q) ||
          cliEmail.includes(q) ||
          cliTelefone.includes(q) ||
          titulo.includes(q) ||
          dest.includes(q) ||
          loc.includes(q) ||
          ref.includes(q) ||
          obs.includes(q) ||
          statusStr.includes(q) ||
          consultorNomeReal.includes(q) ||
          consultorNome.includes(q) ||
          matchesPassageiros ||
          matchesProdutos ||
          matchesComments ||
          matchesCleanDigits
        );

        if (!matches) return false;
      }

      // Filtros Avançados:
      // 1. Data Financeiro
      if (this.dataFinStart) {
        if (!v.data_financeiro || v.data_financeiro < this.dataFinStart) return false;
      }
      if (this.dataFinEnd) {
        if (!v.data_financeiro || v.data_financeiro > this.dataFinEnd) return false;
      }

      // 2. Data Embarque Ida
      if (this.dataIdaStart) {
        if (!v.data_ida || v.data_ida < this.dataIdaStart) return false;
      }
      if (this.dataIdaEnd) {
        if (!v.data_ida || v.data_ida > this.dataIdaEnd) return false;
      }

      // 3. Data Retorno Volta
      if (this.dataVoltaStart) {
        if (!v.data_volta || v.data_volta < this.dataVoltaStart) return false;
      }
      if (this.dataVoltaEnd) {
        if (!v.data_volta || v.data_volta > this.dataVoltaEnd) return false;
      }

      // 4. Atalho Mês/Ano específico (YYYY-MM)
      if (this.advMesAno) {
        const rawDate = v.data_financeiro || v.data_ida || v.created_at || '';
        const tripMonth = rawDate.substring(0, 7);
        if (tripMonth !== this.advMesAno) return false;
      }

      // 5. Produtos / Serviços (Multi-select com Regra E / OU)
      if (this.advProdutos.length > 0) {
        const prods = Array.isArray(v.produtos) ? v.produtos : [];
        const tripProdTypes = prods.map((p: any) => (p.tipo || p.tipo_produto || '').trim().toLowerCase());

        if (this.advProdutoMatchMode === 'AND') {
          const hasAll = this.advProdutos.every(wanted =>
            tripProdTypes.some((t: string) => t.includes(wanted) || wanted.includes(t))
          );
          if (!hasAll) return false;
        } else {
          const hasAny = this.advProdutos.some(wanted =>
            tripProdTypes.some((t: string) => t.includes(wanted) || wanted.includes(t))
          );
          if (!hasAny) return false;
        }
      }

      // 6. Destinos Selecionados
      if (this.advDestinos.length > 0) {
        const destNome = (v.destino || '').toLowerCase();
        const destId = v.destino_id || v.destinoId || '';
        const matchesDest = this.advDestinos.some(d => {
          const dLower = d.toLowerCase();
          return destNome.includes(dLower) || destId === d;
        });
        if (!matchesDest) return false;
      }

      // 7. Fornecedor / Companhia
      if (this.advFornecedor.trim()) {
        const fornQ = this.advFornecedor.trim().toLowerCase();
        const prods = Array.isArray(v.produtos) ? v.produtos : [];
        const matchesForn = prods.some((p: any) => (p.fornecedor || '').toLowerCase().includes(fornQ));
        if (!matchesForn) return false;
      }

      // 8. Filtros de Valores Financeiros Completos dos Produtos & Viagem
      const finTotals = this.getTripFinancialTotals(v);

      // 8.1. Valor Total de Venda
      if (this.advValorMin !== null && finTotals.totalVenda < this.advValorMin) return false;
      if (this.advValorMax !== null && finTotals.totalVenda > this.advValorMax) return false;

      // 8.2. Tarifa Base / Custo
      if (this.advTarifaMin !== null && finTotals.totalTarifa < this.advTarifaMin) return false;
      if (this.advTarifaMax !== null && finTotals.totalTarifa > this.advTarifaMax) return false;

      // 8.3. Taxas / Impostos
      if (this.advTaxaMin !== null && finTotals.totalTaxa < this.advTaxaMin) return false;
      if (this.advTaxaMax !== null && finTotals.totalTaxa > this.advTaxaMax) return false;

      // 8.4. Comissão da Agência
      if (this.advComissaoMin !== null && finTotals.totalComissao < this.advComissaoMin) return false;
      if (this.advComissaoMax !== null && finTotals.totalComissao > this.advComissaoMax) return false;

      // 8.5. Markup
      if (this.advMarkupMin !== null && finTotals.totalMarkup < this.advMarkupMin) return false;
      if (this.advMarkupMax !== null && finTotals.totalMarkup > this.advMarkupMax) return false;

      // 8.6. RAV
      if (this.advRavMin !== null && finTotals.totalRav < this.advRavMin) return false;
      if (this.advRavMax !== null && finTotals.totalRav > this.advRavMax) return false;

      // 8.7. Rentabilidade Líquida Total (Comissão + Markup + RAV * 0.88)
      if (this.advRentabilidadeMin !== null && finTotals.totalRentabilidade < this.advRentabilidadeMin) return false;
      if (this.advRentabilidadeMax !== null && finTotals.totalRentabilidade > this.advRentabilidadeMax) return false;

      // 8.8. Tipo de Margem de Rentabilidade (Pills de Presença de Markup/RAV)
      if (this.advMarkupRav !== 'todos') {
        if (this.advMarkupRav === 'com_markup' && finTotals.totalMarkup <= 0) return false;
        if (this.advMarkupRav === 'com_rav' && finTotals.totalRav <= 0) return false;
        if (this.advMarkupRav === 'com_markup_ou_rav' && finTotals.totalMarkup <= 0 && finTotals.totalRav <= 0) return false;
        if (this.advMarkupRav === 'com_markup_e_rav' && (finTotals.totalMarkup <= 0 || finTotals.totalRav <= 0)) return false;
        if (this.advMarkupRav === 'apenas_comissao' && (finTotals.totalComissao <= 0 || finTotals.totalMarkup > 0 || finTotals.totalRav > 0)) return false;
        if (this.advMarkupRav === 'sem_markup_rav' && (finTotals.totalMarkup > 0 || finTotals.totalRav > 0)) return false;
      }

      // 10. Status de Arquivos & Anexos
      if (this.advAnexos !== 'todos') {
        const prods = Array.isArray(v.produtos) ? v.produtos : [];
        const hasVoucherGeral = !!v.voucher_geral_anexado;
        const hasProductAnexo = prods.some((p: any) =>
          p.dados_adicionais?.anexo_url ||
          p.dados_adicionais?.voucher_url ||
          p.dadosAdicionais?.anexo_url ||
          p.dadosAdicionais?.voucher_url
        );
        const hasAnyAnexo = hasVoucherGeral || hasProductAnexo;

        if (this.advAnexos === 'com_anexo' && !hasAnyAnexo) return false;
        if (this.advAnexos === 'sem_anexo' && hasAnyAnexo) return false;
        if (this.advAnexos === 'com_voucher' && !hasVoucherGeral) return false;
        if (this.advAnexos === 'sem_voucher' && hasVoucherGeral) return false;
      }

      // 11. Status de SLA
      if (this.advSla !== 'todos') {
        const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r: any) => r.status === 'pago');
        const slaResult = reembolsoConcluido ? { alert: false } : this.checkSLA(v);
        if (this.advSla === 'com_alerta' && !slaResult.alert) return false;
        if (this.advSla === 'sem_alerta' && slaResult.alert) return false;
      }

      // 12. PaxFlow Risk Score™
      if (this.advRiskScore.length > 0) {
        const risk = RiskScoreService.calculateTripRiskScore(v, v.cliente, v.produtos, this.settings, this.user, this.perfil);
        if (!this.advRiskScore.includes(risk.nivel)) return false;
      }

      // 13. Consultores (Pills Multi-Select)
      if (this.advConsultores.length > 0) {
        const matchesConsultant = this.advConsultores.includes(vConsultorId) || this.advConsultores.includes(vRespId);
        if (!matchesConsultant) return false;
      }

      // 14. Formas de Recebimento
      if (this.advFormasRecebimento.length > 0) {
        const pags = this.locPagamentosMap.get(v.id) || [];
        const matchesForma = this.advFormasRecebimento.some(f => {
          const fLower = f.toLowerCase();
          return pags.some((p: any) => {
            const pId = (p.forma_recebimento_id || '').toLowerCase();
            const pNome = (p.forma_nome || '').toLowerCase();
            return pId === fLower || pNome.includes(fLower) || fLower.includes(pNome);
          });
        });
        if (!matchesForma) return false;
      }

      // 15. Origem do Lead (Canal de Captação)
      if (this.advOrigensLead.length > 0) {
        const cliOrigem = (v.cliente?.lead_origin || v.lead_origin || '').toLowerCase();
        const cliOrigemId = (v.cliente?.origem_lead_id || v.origem_lead_id || '').toLowerCase();
        const matchesOrigem = this.advOrigensLead.some(o => {
          const oLower = o.toLowerCase();
          return (cliOrigem && (cliOrigem.includes(oLower) || oLower.includes(cliOrigem))) || (cliOrigemId && cliOrigemId === oLower);
        });
        if (!matchesOrigem) return false;
      }

      // 16. Quantidade de Passageiros (PAX)
      if (this.advPaxFaixas.length > 0) {
        const paxCount = Array.isArray(v.passageiros) && v.passageiros.length > 0 ? v.passageiros.length : (Number(v.pax_count) || 1);
        const matchesPax = this.advPaxFaixas.some(faixa => {
          if (faixa === '1') return paxCount === 1;
          if (faixa === '2') return paxCount === 2;
          if (faixa === '3-5') return paxCount >= 3 && paxCount <= 5;
          if (faixa === '6+') return paxCount >= 6;
          return false;
        });
        if (!matchesPax) return false;
      }

      // 17. Tags / Classificações
      if (this.advTags.length > 0) {
        const tripTags = [
          ...(Array.isArray(v.tags) ? v.tags : []),
          ...(v.cliente && Array.isArray(v.cliente.classificacoes) ? v.cliente.classificacoes : [])
        ].map(t => (typeof t === 'string' ? t.trim().toLowerCase() : ''));

        const matchesTag = this.advTags.some(wanted => {
          const wantedLower = wanted.toLowerCase();
          return tripTags.some(t => t.includes(wantedLower) || wantedLower.includes(t));
        });
        if (!matchesTag) return false;
      }

      return true;
    });

    // Ordenação do array filtrados se sortField estiver definido
    if (this.sortField) {
      filtrados.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (this.sortField === 'sla') {
          const aReembolso = a.reembolsos && a.reembolsos.some((r: any) => r.status === 'pago');
          const bReembolso = b.reembolsos && b.reembolsos.some((r: any) => r.status === 'pago');
          const aSla = aReembolso ? { alert: false, type: null } : this.checkSLA(a);
          const bSla = bReembolso ? { alert: false, type: null } : this.checkSLA(b);

          const getSlaPriority = (sla: any, reembolsado: boolean) => {
            if (reembolsado) return 0;
            if (!sla.alert) return 1;
            if (sla.type === 'pos-viagem') return 2;
            if (sla.type === 'pre-embarque') return 3;
            return 1;
          };
          valA = getSlaPriority(aSla, aReembolso);
          valB = getSlaPriority(bSla, bReembolso);
        } else if (this.sortField === 'cliente') {
          valA = (a.cliente?.nome || '').toLowerCase();
          valB = (b.cliente?.nome || '').toLowerCase();
        } else if (this.sortField === 'destino') {
          valA = (a.destino || '').toLowerCase();
          valB = (b.destino || '').toLowerCase();
        } else if (this.sortField === 'periodo') {
          valA = a.data_ida || '';
          valB = b.data_ida || '';
        } else if (this.sortField === 'data_financeiro') {
          valA = a.data_financeiro || '';
          valB = b.data_financeiro || '';
        } else if (this.sortField === 'financeiro') {
          valA = Number(a.valor_total) || 0;
          valB = Number(b.valor_total) || 0;
        } else if (this.sortField === 'consultor') {
          const nameA = a.consultor_id === this.user.id ? 'Você' : (this.consultores.find(c => c.id === a.consultor_id)?.nome || '');
          const nameB = b.consultor_id === this.user.id ? 'Você' : (this.consultores.find(c => c.id === b.consultor_id)?.nome || '');
          valA = nameA.toLowerCase();
          valB = nameB.toLowerCase();
        } else if (this.sortField === 'status') {
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
        }

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // 4. Contar alertas de SLA ativos no total do consultor ativo
    let totalSlaAlerts = 0;
    totalPorConsultor.forEach(v => {
      const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r: any) => r.status === 'pago');
      if (!reembolsoConcluido && this.checkSLA(v).alert) totalSlaAlerts++;
    });

    const isSandbox = (window as any).paxflowSandbox;
    const desktopHeight = isSandbox ? 'calc(100vh - 36px)' : '100vh';
    const mobileHeight = isSandbox ? 'calc(100vh - 93px)' : 'calc(100vh - 57px)';
    const totalFiltrosAtivos = this.getActiveFiltersCount();

    // 5. Renderizar o HTML base do painel operacional baseado em lista
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
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 relative z-30 px-4 md:px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors duration-200 w-full">
          <div class="flex items-center gap-3 shrink-0">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-auto object-contain md:hidden" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${this.settings.agencyName}</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Viagens (Painel Operacional)</p>
            </div>
          </div>
          
          <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto lg:justify-end py-0.5">
            <!-- Pill Switch Segmentado: Mês Corrente vs Ver Tudo -->
            <div class="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0 select-none">
              <button id="btn-view-month-current" class="px-3 py-1.5 rounded-lg text-xs font-black transition ${this.viewModeMonth === 'current' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}">
                📅 Mês Corrente (${this.getFormattedCurrentMonthLabel()})
              </button>
              <button id="btn-view-month-all" class="px-3 py-1.5 rounded-lg text-xs font-black transition ${this.viewModeMonth === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}">
                🌐 Ver Tudo
              </button>
            </div>

            <!-- Stats Rápidos em Linha Única -->
            <div class="flex items-center gap-2 bg-slate-100/70 dark:bg-slate-800/50 px-3.5 py-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shrink-0 text-xs">
              <span class="font-extrabold text-slate-600 dark:text-slate-300">Viagens: <strong class="text-slate-900 dark:text-white font-black">${counts.todos}</strong></span>
              <span class="text-slate-300 dark:text-slate-700">&bull;</span>
              <span class="font-extrabold text-slate-600 dark:text-slate-300">SLAs: <strong class="${totalSlaAlerts > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900 dark:text-white'} font-black">${totalSlaAlerts}</strong></span>
            </div>

            <!-- Botão de Filtros Avançados -->
            <button id="btn-toggle-filtros" class="px-3.5 py-2 ${totalFiltrosAtivos > 0 ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400/30' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold'} text-xs rounded-xl border ${totalFiltrosAtivos > 0 ? 'border-indigo-500' : 'border-slate-200/60 dark:border-slate-700/60'} flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer">
              <span>🎛️ Avançado${totalFiltrosAtivos > 0 ? ` (${totalFiltrosAtivos})` : ''}</span>
              <span class="text-[9px]">${this.showFiltersPanel ? '▲' : '▼'}</span>
            </button>

            <!-- Seletor de Consultores (Apenas para Admins) -->
            ${this.perfil?.role === 'admin' ? `
              <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 select-none">Equipe:</span>
                <select id="select-dashboard-consultor" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[130px]">
                  <option value="todos" ${this.selectedConsultantId === 'todos' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Todos</option>
                  ${this.consultores.map(c => `<option value="${c.id}" ${this.selectedConsultantId === c.id ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${c.nome}</option>`).join('')}
                </select>
              </div>

              <!-- Seletor Popover de Conferência Avançado com Pills -->
              <div class="relative inline-block text-left shrink-0" id="container-conf-popover">
                <button id="btn-toggle-conf-popover" type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border ${
                  (this.confFilters.finPendente || this.confFilters.finOk || this.confFilters.procPendente || this.confFilters.procOk)
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black shadow-sm ring-1 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold'
                } rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <span class="text-[10px] font-black uppercase text-slate-400 select-none">Conf.:</span>
                  <span>${
                    (this.confFilters.finPendente || this.confFilters.finOk || this.confFilters.procPendente || this.confFilters.procOk)
                      ? `Ativo (${(this.confFilters.finPendente ? 1 : 0) + (this.confFilters.finOk ? 1 : 0) + (this.confFilters.procPendente ? 1 : 0) + (this.confFilters.procOk ? 1 : 0)})`
                      : 'Todas'
                  }</span>
                  <span class="text-[8px] ml-0.5">${this.showConfPopover ? '▲' : '▼'}</span>
                </button>

                <!-- Popover Menu Suspenso com Pills -->
                <div id="popover-conf-filter" class="${this.showConfPopover ? 'block' : 'hidden'} absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[70] p-3.5 space-y-3 animate-fade-in font-sans">
                  <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span class="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Filtros de Conferência</span>
                    <button id="btn-conf-limpar" type="button" class="text-[10px] font-bold text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer">
                      Limpar
                    </button>
                  </div>

                  <!-- Seção Financeiro -->
                  <div>
                    <span class="block text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">💳 Conferência Financeira</span>
                    <div class="flex flex-wrap gap-1.5">
                      <button id="pill-conf-fin-pendente" type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${this.confFilters.finPendente ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'}">
                        ⏳ Fin. Pendente
                      </button>
                      <button id="pill-conf-fin-ok" type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${this.confFilters.finOk ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}">
                        ✅ Fin. OK
                      </button>
                    </div>
                  </div>

                  <!-- Seção Processo -->
                  <div>
                    <span class="block text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">📋 Conferência de Processo</span>
                    <div class="flex flex-wrap gap-1.5">
                      <button id="pill-conf-proc-pendente" type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${this.confFilters.procPendente ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'}">
                        ⏳ Proc. Pendente
                      </button>
                      <button id="pill-conf-proc-ok" type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${this.confFilters.procOk ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}">
                        ✅ Proc. OK
                      </button>
                    </div>
                  </div>

                  <!-- Atalhos Rápidos -->
                  <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button id="btn-conf-atalho-100" type="button" class="flex-1 py-1 px-2 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition text-center">
                      ✨ 100% OK
                    </button>
                    <button id="btn-conf-atalho-nenhum" type="button" class="flex-1 py-1 px-2 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/60 transition text-center">
                      ⏳ Nenhum OK
                    </button>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Botão Criar Card / Nova Viagem -->
            ${(this.perfil?.role === 'admin' || !!this.settings?.permitirConsultorCriarViagem || !!this.settings?.permitir_consultor_criar_viagem) ? `
              <button id="btn-nova-viagem" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Nova Viagem</span>
              </button>
            ` : ''}
          </div>
        </header>

        <!-- PAINEL DE FILTROS AVANÇADOS COLLAPSIBLE -->
        ${this.renderAdvancedFiltersPanelHTML()}

        <!-- ABAS DE STATUS / FASES DE VENDA -->
        <div class="px-6 pt-4 bg-slate-50/50 dark:bg-slate-950">
          <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto custom-scrollbar pb-1">
            ${this.renderStatusTab('Todos', 'todos', counts.todos)}
            ${this.renderStatusTab('Fechado', 'fechado', counts.fechado)}
            ${this.renderStatusTab('Pós-Venda', 'pos_venda', counts.pos_venda)}
            ${this.renderStatusTab('Pré-Embarque', 'pre_embarque', counts.pre_embarque)}
            ${this.renderStatusTab('Pós-Viagem', 'pos_viagem', counts.pos_viagem)}
            ${this.renderStatusTab('Reembolso Solicitado', 'reembolso_solicitado', counts.reembolso_solicitado)}
          </div>
        </div>

        ${this.renderActiveFilterChipsHTML()}
        ${this.renderFinancialSummaryBarHTML(filtrados)}

        <!-- CONTEÚDO PRINCIPAL (LISTA / TABELA) -->
        <main class="flex-1 p-6 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950 overflow-y-auto custom-scrollbar">
          <div id="next-trip-engine-mount"></div>
          ${this.renderBalcaoSectionHTML()}
          ${filtrados.length === 0 ? `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4 flex-1">
              <div class="text-slate-300 dark:text-slate-700 text-5xl">✈️</div>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Nenhuma venda operacional localizada</h3>
              <p class="text-xs text-slate-400 dark:text-slate-400 font-medium max-w-sm">Tente limpar os filtros de data, alterar o termo de busca ou selecionar outra aba de status.</p>
            </div>
          ` : `
            <!-- Mobile View: Cards Layout (Visible only on mobile portrait) -->
            <div class="block md:hidden overflow-y-auto flex-1 space-y-4 custom-scrollbar pr-1 pb-4">
              ${filtrados.map(v => this.renderMobileCard(v)).join('')}
            </div>

            <!-- Desktop View: Table Layout (Hidden on mobile portrait) -->
            <div class="hidden md:flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex-1 flex-col min-h-0">
              <div class="overflow-auto flex-1 min-h-0 custom-scrollbar">
                <table class="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr class="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-xs">
                      <th class="px-5 py-4 w-[80px] text-center">${this.renderSortHeader('SLA', 'sla')}</th>
                      <th class="px-5 py-4">${this.renderSortHeader('Cliente', 'cliente')}</th>
                      <th class="px-5 py-4">${this.renderSortHeader('Destino / Produtos', 'destino')}</th>
                      <th class="px-5 py-4">${this.renderSortHeader('Data Fin.', 'data_financeiro')}</th>
                      <th class="px-5 py-4">${this.renderSortHeader('Financeiro', 'financeiro')}</th>
                      ${this.perfil?.role === 'admin' ? `<th class="px-5 py-4">${this.renderSortHeader('Consultor', 'consultor')}</th>` : ''}
                      <th class="px-5 py-4 w-[200px]">${this.renderSortHeader('Fase / Status', 'status')}</th>
                      <th class="px-5 py-4 w-[160px] text-center text-slate-400 dark:text-slate-400 tracking-wider text-[10px] font-black">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    ${filtrados.map(v => this.renderTableRow(v)).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `}
        </main>
      </div>
    `;

    // 6. Vincular ouvintes de eventos
    this.setupUIEventListeners();

    // 7. Renderizar o Next Trip Engine Widget
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

  /**
   * Abre o modal de Novo Orçamento pré-preenchido com dados da oportunidade preditiva
   */
  private openNovoOrcamentoPreditivo(op: any): void {
    window.location.hash = `#orcamentos?novo=true&cliente_id=${op.clienteId}&destino=${encodeURIComponent(op.destinoRecomendado)}`;
  }

  /**
   * Abre o modal de disparo de mensagem de WhatsApp pré-preenchido para o cliente
   */
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
   * Renderiza a barra com o resumo financeiro em tempo real e o botão de exportar CSV/Excel
   */
  private renderFinancialSummaryBarHTML(viagensFiltradas: any[]): string {
    const totalViagens = viagensFiltradas.length;
    let totalVendas = 0;
    let totalRentabilidade = 0;
    let totalMarkupAcumulado = 0;
    let totalRavAcumulado = 0;

    viagensFiltradas.forEach(v => {
      const totals = this.getTripFinancialTotals(v);
      totalVendas += totals.totalVenda;
      totalRentabilidade += totals.totalRentabilidade;
      totalMarkupAcumulado += totals.totalMarkup;
      totalRavAcumulado += totals.totalRav;
    });

    const ticketMedio = totalViagens > 0 ? totalVendas / totalViagens : 0;

    return `
      <div id="financial-summary-export-bar" class="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Viagens:</span>
            <span class="font-black text-slate-800 dark:text-slate-100">${totalViagens}</span>
          </div>
          <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Total Vendas:</span>
            <span class="font-extrabold text-emerald-600 dark:text-emerald-400">R$ ${totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Rentabilidade:</span>
            <span class="font-extrabold text-indigo-600 dark:text-indigo-400">R$ ${totalRentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ${(totalMarkupAcumulado > 0 || totalRavAcumulado > 0) ? `
            <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">Markup:</span>
              <span class="font-bold text-purple-600 dark:text-purple-400">R$ ${totalMarkupAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">RAV:</span>
              <span class="font-bold text-amber-600 dark:text-amber-400">R$ ${totalRavAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">Ticket Médio:</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <button id="btn-export-filtered-csv" type="button" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1.5 transition shadow-xs cursor-pointer">
          <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span>Exportar CSV</span>
        </button>
      </div>
    `;
  }

  /**
   * Renderiza o Painel Completo de Filtros Avançados Expansível
   */
  private renderAdvancedFiltersPanelHTML(): string {
    const tiposDisponiveis = this.getListaTiposProdutoDisponiveis();

    const tripDestSet = new Set<string>();
    this.viagens.forEach(v => {
      if (v.destino && typeof v.destino === 'string') tripDestSet.add(v.destino.trim());
    });
    this.listaDestinosDisponiveis.forEach(d => {
      if (d.nome) tripDestSet.add(`${d.nome}, ${d.pais}`.trim());
    });
    const destinosList = Array.from(tripDestSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    const monthOptions: { value: string; label: string }[] = [];
    for (let i = -6; i <= 12; i++) {
      const d = new Date(curYear, curMonth + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${months[d.getMonth()]}/${d.getFullYear()}`;
      monthOptions.push({ value: val, label });
    }

    const tagsDisponiveis = this.getListaTagsDisponiveis();
    const totalAtivos = this.getActiveFiltersCount();

    return `
      <div id="advanced-filters-panel" class="${this.showFiltersPanel ? 'flex' : 'hidden'} flex-col max-h-[75vh] md:max-h-[70vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 py-4 md:py-5 transition-colors duration-200 shadow-xl z-30 animate-fadeIn shrink-0">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 pb-2">

          <!-- Bloco 1: Período & Datas -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>📅</span>
                <span>Período & Datas</span>
              </span>
              <!-- Atalho Mês/Ano -->
              <select id="filter-adv-mes-ano" class="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                <option value="">Todos os Meses</option>
                ${monthOptions.map(m => `<option value="${m.value}" ${this.advMesAno === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
              </select>
            </div>

            <!-- Data Financeiro -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Data Financeiro</span>
              <div class="flex items-center gap-1.5">
                <input id="filter-fin-start" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${this.dataFinStart ? formatIsoDateToBr(this.dataFinStart) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span class="text-xs text-slate-400">a</span>
                <input id="filter-fin-end" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${this.dataFinEnd ? formatIsoDateToBr(this.dataFinEnd) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>

            <!-- Embarque Ida -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">✈️ Embarque (Ida)</span>
              <div class="flex items-center gap-1.5">
                <input id="filter-ida-start" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${this.dataIdaStart ? formatIsoDateToBr(this.dataIdaStart) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span class="text-xs text-slate-400">a</span>
                <input id="filter-ida-end" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${this.dataIdaEnd ? formatIsoDateToBr(this.dataIdaEnd) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>

            <!-- Retorno Volta -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">🚐 Retorno (Volta)</span>
              <div class="flex items-center gap-1.5">
                <input id="filter-volta-start" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${this.dataVoltaStart ? formatIsoDateToBr(this.dataVoltaStart) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span class="text-xs text-slate-400">a</span>
                <input id="filter-volta-end" type="text" data-mask="date" inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA" value="${this.dataVoltaEnd ? formatIsoDateToBr(this.dataVoltaEnd) : ''}" class="date-input w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          <!-- Bloco 2: Produtos & Serviços -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>🏷️</span>
                <span>Produtos & Serviços</span>
              </span>
              <!-- Toggle E / OU -->
              <div class="inline-flex p-0.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold select-none">
                <button id="btn-match-mode-and" type="button" class="px-2 py-0.5 rounded transition ${this.advProdutoMatchMode === 'AND' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">
                  TODOS (E)
                </button>
                <button id="btn-match-mode-or" type="button" class="px-2 py-0.5 rounded transition ${this.advProdutoMatchMode === 'OR' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">
                  QUALQUER (OU)
                </button>
              </div>
            </div>

            <!-- Grid de Pills de Produtos -->
            <div class="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              ${tiposDisponiveis.map(t => {
                const isSelected = this.advProdutos.includes(t.id);
                return `
                  <button type="button" class="pill-adv-produto px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-prod-id="${t.id}">
                    <span>${t.icone}</span>
                    <span>${t.nome}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${this.advProdutos.length > 0 ? `
              <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                <span>${this.advProdutos.length} produto(s) selecionado(s) (${this.advProdutoMatchMode === 'AND' ? 'precisa ter todos' : 'pelo menos um'})</span>
                <button id="btn-clear-adv-produtos" type="button" class="text-rose-500 hover:underline cursor-pointer">Limpar</button>
              </div>
            ` : ''}
          </div>

          <!-- Bloco 3: Consultores (Usuários) em Pills -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>👤</span>
                <span>Consultores (Usuários)</span>
              </span>
              ${this.advConsultores.length > 0 ? `
                <button id="btn-clear-adv-consultores" type="button" class="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer">Limpar</button>
              ` : ''}
            </div>

            <div class="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              ${this.consultores.map(c => {
                const isSelected = this.advConsultores.includes(c.id);
                const iniciais = (c.nome || 'C').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                return `
                  <button type="button" class="pill-adv-consultor px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-consultant-id="${c.id}">
                    <span class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${isSelected ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'}">${iniciais}</span>
                    <span>${c.nome || 'Consultor'}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${this.advConsultores.length > 0 ? `
              <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                ${this.advConsultores.length} consultor(es) selecionado(s)
              </div>
            ` : ''}
          </div>

          <!-- Bloco 4: Formas de Recebimento -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>🪙</span>
                <span>Formas de Recebimento</span>
              </span>
              ${this.advFormasRecebimento.length > 0 ? `
                <button id="btn-clear-adv-formas" type="button" class="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer">Limpar</button>
              ` : ''}
            </div>

            <div class="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              ${(this.formasRecebimento || []).map(f => {
                const fKey = f.id || f.nome;
                const isSelected = this.advFormasRecebimento.includes(fKey) || this.advFormasRecebimento.includes(f.nome);
                return `
                  <button type="button" class="pill-adv-forma px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-forma-id="${fKey}" data-forma-nome="${f.nome}">
                    <span>${f.icone || '🪙'}</span>
                    <span>${f.nome}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${this.advFormasRecebimento.length > 0 ? `
              <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                ${this.advFormasRecebimento.length} forma(s) selecionada(s)
              </div>
            ` : ''}
          </div>

          <!-- Bloco 5: Origem do Lead & PAX -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <span>📣</span>
              <span>Origem do Lead & Passageiros</span>
            </span>

            <!-- Origens de Lead -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Canal de Captação</span>
              <div class="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                ${(this.origensLead || []).map(o => {
                  const oKey = o.id || o.nome;
                  const isSelected = this.advOrigensLead.includes(oKey) || this.advOrigensLead.includes(o.nome);
                  return `
                    <button type="button" class="pill-adv-origem px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }" data-origem-id="${oKey}" data-origem-nome="${o.nome}">
                      <span>${o.icone || '📣'}</span>
                      <span>${o.nome}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Quantidade de Passageiros (PAX) -->
            <div class="space-y-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">👥 Qtd de Passageiros (PAX)</span>
              <div class="flex flex-wrap gap-1">
                ${[
                  { id: '1', label: '👤 1 PAX' },
                  { id: '2', label: '👥 2 PAX' },
                  { id: '3-5', label: '👨‍👩‍👧 3 a 5 PAX' },
                  { id: '6+', label: '🚌 6+ PAX' }
                ].map(pax => `
                  <button type="button" class="pill-adv-pax px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    this.advPaxFaixas.includes(pax.id)
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-pax-key="${pax.id}">
                    ${pax.label}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Bloco 6: Tags & Classificações -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>🏷️</span>
                <span>Tags / Classificações</span>
              </span>
              ${this.advTags.length > 0 ? `
                <button id="btn-clear-adv-tags" type="button" class="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer">Limpar</button>
              ` : ''}
            </div>

            <div class="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              ${tagsDisponiveis.map(t => {
                const isSelected = this.advTags.includes(t);
                return `
                  <button type="button" class="pill-adv-tag px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-tag-name="${t}">
                    <span>🏷️</span>
                    <span>${t}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${this.advTags.length > 0 ? `
              <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                ${this.advTags.length} tag(s) selecionada(s)
              </div>
            ` : ''}
          </div>

          <!-- Bloco 7: Destinos & Fornecedores -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <span>📍</span>
              <span>Destinos & Fornecedores</span>
            </span>

            <!-- Destino -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Destino</span>
              <select id="filter-adv-destino" class="w-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                <option value="">Todos os Destinos</option>
                ${destinosList.map(d => `<option value="${d}" ${this.advDestinos.includes(d) ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>

            <!-- Fornecedor -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">🏢 Fornecedor / Companhia</span>
              <input id="filter-adv-fornecedor" type="text" placeholder="Ex: LATAM, Movida, Disney, Hotel..." value="${this.advFornecedor}" class="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <!-- Status de Documentos / Anexos -->
            <div class="space-y-1 pt-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">📎 Anexos & Vouchers</span>
              <div class="flex flex-wrap gap-1">
                ${[
                  { id: 'todos', label: 'Todos' },
                  { id: 'com_anexo', label: '📎 Com Anexos' },
                  { id: 'sem_anexo', label: '🚫 Sem Anexos' },
                  { id: 'com_voucher', label: '📑 Com Voucher Geral' },
                  { id: 'sem_voucher', label: '⏳ Sem Voucher Geral' }
                ].map(opt => `
                  <button type="button" class="pill-adv-anexo px-2 py-0.5 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                    this.advAnexos === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }" data-anexo-val="${opt.id}">
                    ${opt.label}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Bloco 8: Valores Financeiros Detalhados dos Produtos & Viagem -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>💰</span>
                <span>Valores Financeiros do Produto</span>
              </span>
              ${(this.advValorMin !== null || this.advValorMax !== null || this.advTarifaMin !== null || this.advTarifaMax !== null || this.advTaxaMin !== null || this.advTaxaMax !== null || this.advComissaoMin !== null || this.advComissaoMax !== null || this.advMarkupMin !== null || this.advMarkupMax !== null || this.advRavMin !== null || this.advRavMax !== null || this.advRentabilidadeMin !== null || this.advRentabilidadeMax !== null || this.advMarkupRav !== 'todos') ? `
                <button id="btn-clear-adv-financas" type="button" class="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer">Limpar</button>
              ` : ''}
            </div>

            <!-- Tipo de Margem / Rentabilidade -->
            <div class="space-y-1">
              <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">💎 Tipo de Margem / Rentabilidade</span>
              <div class="flex flex-wrap gap-1">
                ${[
                  { id: 'todos', label: 'Todos' },
                  { id: 'com_markup', label: '💎 Com Markup' },
                  { id: 'com_rav', label: '⚡ Com RAV' },
                  { id: 'com_markup_ou_rav', label: '💎⚡ Markup OU RAV' },
                  { id: 'com_markup_e_rav', label: '✨ Ambos (MKP + RAV)' },
                  { id: 'apenas_comissao', label: '💰 Apenas Comissão' },
                  { id: 'sem_markup_rav', label: '🚫 Sem MKP/RAV' }
                ].map(opt => `
                  <button type="button" class="pill-adv-markup-rav px-2 py-0.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                    this.advMarkupRav === opt.id
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-1 ring-purple-400/30'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                  }" data-markup-rav-val="${opt.id}">
                    ${opt.label}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Grade de Inputs de Faixas Financeiras (Tarifa, Taxa, Comissão, Markup, RAV, Venda, Rentabilidade) -->
            <div class="space-y-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              
              <!-- Linha 1: Valor Venda & Rentabilidade -->
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-slate-400 uppercase">Valor Venda Total (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-valor-min" type="number" min="0" step="100" placeholder="Min" value="${this.advValorMin !== null ? this.advValorMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-valor-max" type="number" min="0" step="100" placeholder="Max" value="${this.advValorMax !== null ? this.advValorMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-slate-400 uppercase">Rentabilidade Total (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-rent-min" type="number" min="0" step="50" placeholder="Min" value="${this.advRentabilidadeMin !== null ? this.advRentabilidadeMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-rent-max" type="number" min="0" step="50" placeholder="Max" value="${this.advRentabilidadeMax !== null ? this.advRentabilidadeMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>

              <!-- Linha 2: Markup & RAV -->
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-purple-600 dark:text-purple-400 uppercase">💎 Markup (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-markup-min" type="number" min="0" step="50" placeholder="Min" value="${this.advMarkupMin !== null ? this.advMarkupMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-markup-max" type="number" min="0" step="50" placeholder="Max" value="${this.advMarkupMax !== null ? this.advMarkupMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  </div>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase">⚡ RAV (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-rav-min" type="number" min="0" step="50" placeholder="Min" value="${this.advRavMin !== null ? this.advRavMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-rav-max" type="number" min="0" step="50" placeholder="Max" value="${this.advRavMax !== null ? this.advRavMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  </div>
                </div>
              </div>

              <!-- Linha 3: Comissão & Tarifa -->
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-slate-400 uppercase">💰 Comissão (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-comissao-min" type="number" min="0" step="50" placeholder="Min" value="${this.advComissaoMin !== null ? this.advComissaoMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-comissao-max" type="number" min="0" step="50" placeholder="Max" value="${this.advComissaoMax !== null ? this.advComissaoMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div class="space-y-0.5">
                  <span class="text-[8px] font-bold text-slate-400 uppercase">🏷️ Tarifa Custo (R$)</span>
                  <div class="flex items-center gap-1">
                    <input id="filter-adv-tarifa-min" type="number" min="0" step="100" placeholder="Min" value="${this.advTarifaMin !== null ? this.advTarifaMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span class="text-[10px] text-slate-400">-</span>
                    <input id="filter-adv-tarifa-max" type="number" min="0" step="100" placeholder="Max" value="${this.advTarifaMax !== null ? this.advTarifaMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>

              <!-- Linha 4: Taxas / Impostos -->
              <div class="space-y-0.5">
                <span class="text-[8px] font-bold text-slate-400 uppercase">🧾 Taxas & Impostos (R$)</span>
                <div class="flex items-center gap-1">
                  <input id="filter-adv-taxa-min" type="number" min="0" step="50" placeholder="Min" value="${this.advTaxaMin !== null ? this.advTaxaMin : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  <span class="text-[10px] text-slate-400">-</span>
                  <input id="filter-adv-taxa-max" type="number" min="0" step="50" placeholder="Max" value="${this.advTaxaMax !== null ? this.advTaxaMax : ''}" class="w-full text-[11px] font-semibold px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

            </div>
          </div>

          <!-- Bloco 9: Conferência, SLAs & Risk Score -->
          <div class="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <span class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Conferência & SLAs</span>
            </span>

            <div class="space-y-2">
              <!-- Conferência -->
              <div class="space-y-1">
                <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Conferência</span>
                <div class="flex flex-wrap gap-1">
                  <button type="button" class="pill-adv-conf-fin-ok px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${this.confFilters.finOk ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}">
                    ✅ Fin. OK
                  </button>
                  <button type="button" class="pill-adv-conf-fin-pendente px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${this.confFilters.finPendente ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'}">
                    ⏳ Fin. Pend.
                  </button>
                  <button type="button" class="pill-adv-conf-proc-ok px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${this.confFilters.procOk ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}">
                    ✅ Proc. OK
                  </button>
                  <button type="button" class="pill-adv-conf-proc-pendente px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${this.confFilters.procPendente ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'}">
                    ⏳ Proc. Pend.
                  </button>
                </div>
              </div>

              <!-- Alertas de SLA & Risk Score -->
              <div class="space-y-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                <span class="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">SLAs & Risco</span>
                <div class="flex flex-wrap gap-1">
                  <button type="button" class="pill-adv-sla-alerta px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${this.advSla === 'com_alerta' ? 'bg-rose-600 text-white border-rose-700 shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'}" data-sla-val="com_alerta">
                    🚨 Alerta SLA
                  </button>
                  ${[
                    { id: 'verde', label: '🟢 Verde', bg: 'bg-emerald-600 text-white border-emerald-700' },
                    { id: 'amarelo', label: '🟡 Amarelo', bg: 'bg-amber-500 text-white border-amber-600' },
                    { id: 'vermelho', label: '🔴 Vermelho', bg: 'bg-rose-600 text-white border-rose-700' }
                  ].map(r => `
                    <button type="button" class="pill-adv-risk px-2 py-0.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      this.advRiskScore.includes(r.id)
                        ? r.bg
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }" data-risk-level="${r.id}">
                      ${r.label}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Rodapé de Ações do Painel (Sticky) -->
        <div class="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-5 px-4 md:px-6 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 mt-4 z-10 shadow-sm">
          <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">
            ${totalAtivos > 0 ? `<span class="text-indigo-600 dark:text-indigo-400 font-extrabold">🎯 ${totalAtivos} critério(s) ativo(s)</span> &bull; Filtro reativo aplicado` : 'Nenhum filtro ativo selecionado'}
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-clear-all-adv-filters" type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-xl border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer">
              Limpar Todos os Filtros
            </button>
            <button id="btn-collapse-adv-panel" type="button" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer">
              Recolher Painel ▲
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza a barra de chips com os filtros ativos para feedback visual imediato e desativação rápida em 1 clique
   */
  private renderActiveFilterChipsHTML(): string {
    const chips: { key: string; label: string; icon: string }[] = [];

    if (this.buscaTermo && this.buscaTermo.trim()) {
      chips.push({ key: 'busca', label: `Busca: "${this.buscaTermo.trim()}"`, icon: '🔍' });
    }

    if (this.dataFinStart || this.dataFinEnd) {
      const startBr = this.dataFinStart ? formatIsoDateToBr(this.dataFinStart) : '...';
      const endBr = this.dataFinEnd ? formatIsoDateToBr(this.dataFinEnd) : '...';
      chips.push({ key: 'dataFin', label: `Data Fin: ${startBr} a ${endBr}`, icon: '📅' });
    }

    if (this.dataIdaStart || this.dataIdaEnd) {
      const startBr = this.dataIdaStart ? formatIsoDateToBr(this.dataIdaStart) : '...';
      const endBr = this.dataIdaEnd ? formatIsoDateToBr(this.dataIdaEnd) : '...';
      chips.push({ key: 'dataIda', label: `Embarque: ${startBr} a ${endBr}`, icon: '✈️' });
    }

    if (this.dataVoltaStart || this.dataVoltaEnd) {
      const startBr = this.dataVoltaStart ? formatIsoDateToBr(this.dataVoltaStart) : '...';
      const endBr = this.dataVoltaEnd ? formatIsoDateToBr(this.dataVoltaEnd) : '...';
      chips.push({ key: 'dataVolta', label: `Retorno: ${startBr} a ${endBr}`, icon: '🚐' });
    }

    if (this.advMesAno) {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const [y, m] = this.advMesAno.split('-');
      const monthName = months[parseInt(m, 10) - 1] || m;
      chips.push({ key: 'adv-mes-ano', label: `Mês: ${monthName}/${y}`, icon: '📆' });
    }

    this.advConsultores.forEach(cId => {
      const consultor = this.consultores.find(c => c.id === cId);
      const nome = consultor?.nome || (cId === this.user?.id ? 'Você' : 'Consultor');
      chips.push({ key: `adv-consultor-${cId}`, label: `Consultor: ${nome}`, icon: '👤' });
    });

    this.advFormasRecebimento.forEach(fKey => {
      const forma = this.formasRecebimento.find(f => f.id === fKey || f.nome === fKey);
      const label = forma?.nome || fKey;
      chips.push({ key: `adv-forma-${fKey}`, label: `Recebimento: ${label}`, icon: '🪙' });
    });

    this.advOrigensLead.forEach(oKey => {
      const origem = this.origensLead.find(o => o.id === oKey || o.nome === oKey);
      const label = origem?.nome || oKey;
      chips.push({ key: `adv-origem-${oKey}`, label: `Origem: ${label}`, icon: '📣' });
    });

    this.advPaxFaixas.forEach(paxKey => {
      const labelMap: Record<string, string> = {
        '1': '1 PAX',
        '2': '2 PAX',
        '3-5': '3 a 5 PAX',
        '6+': '6+ PAX'
      };
      chips.push({ key: `adv-pax-${paxKey}`, label: `PAX: ${labelMap[paxKey] || paxKey}`, icon: '👥' });
    });

    this.advTags.forEach(tag => {
      chips.push({ key: `adv-tag-${tag}`, label: `Tag: ${tag}`, icon: '🏷️' });
    });

    this.advProdutos.forEach(pId => {
      const icon = this.getIconForType(pId);
      chips.push({ key: `adv-prod-${pId}`, label: `Produto: ${icon} ${pId.toUpperCase()}`, icon: '🏷️' });
    });

    this.advDestinos.forEach(d => {
      chips.push({ key: `adv-dest-${d}`, label: `Destino: ${d}`, icon: '📍' });
    });

    if (this.advFornecedor.trim()) {
      chips.push({ key: 'adv-fornecedor', label: `Fornecedor: "${this.advFornecedor}"`, icon: '🏢' });
    }

    if (this.advValorMin !== null || this.advValorMax !== null) {
      const minStr = this.advValorMin !== null ? `R$ ${this.advValorMin}` : 'R$ 0';
      const maxStr = this.advValorMax !== null ? `R$ ${this.advValorMax}` : '...';
      chips.push({ key: 'adv-valor', label: `Venda: ${minStr} a ${maxStr}`, icon: '💰' });
    }

    if (this.advTarifaMin !== null || this.advTarifaMax !== null) {
      const minStr = this.advTarifaMin !== null ? `R$ ${this.advTarifaMin}` : 'R$ 0';
      const maxStr = this.advTarifaMax !== null ? `R$ ${this.advTarifaMax}` : '...';
      chips.push({ key: 'adv-tarifa-val', label: `Tarifa: ${minStr} a ${maxStr}`, icon: '🏷️' });
    }

    if (this.advTaxaMin !== null || this.advTaxaMax !== null) {
      const minStr = this.advTaxaMin !== null ? `R$ ${this.advTaxaMin}` : 'R$ 0';
      const maxStr = this.advTaxaMax !== null ? `R$ ${this.advTaxaMax}` : '...';
      chips.push({ key: 'adv-taxa-val', label: `Taxas: ${minStr} a ${maxStr}`, icon: '🧾' });
    }

    if (this.advComissaoMin !== null || this.advComissaoMax !== null) {
      const minStr = this.advComissaoMin !== null ? `R$ ${this.advComissaoMin}` : 'R$ 0';
      const maxStr = this.advComissaoMax !== null ? `R$ ${this.advComissaoMax}` : '...';
      chips.push({ key: 'adv-comissao-val', label: `Comissão: ${minStr} a ${maxStr}`, icon: '💰' });
    }

    if (this.advMarkupMin !== null || this.advMarkupMax !== null) {
      const minStr = this.advMarkupMin !== null ? `R$ ${this.advMarkupMin}` : 'R$ 0';
      const maxStr = this.advMarkupMax !== null ? `R$ ${this.advMarkupMax}` : '...';
      chips.push({ key: 'adv-markup-val', label: `Markup: ${minStr} a ${maxStr}`, icon: '💎' });
    }

    if (this.advRavMin !== null || this.advRavMax !== null) {
      const minStr = this.advRavMin !== null ? `R$ ${this.advRavMin}` : 'R$ 0';
      const maxStr = this.advRavMax !== null ? `R$ ${this.advRavMax}` : '...';
      chips.push({ key: 'adv-rav-val', label: `RAV: ${minStr} a ${maxStr}`, icon: '⚡' });
    }

    if (this.advRentabilidadeMin !== null || this.advRentabilidadeMax !== null) {
      const minStr = this.advRentabilidadeMin !== null ? `R$ ${this.advRentabilidadeMin}` : 'R$ 0';
      const maxStr = this.advRentabilidadeMax !== null ? `R$ ${this.advRentabilidadeMax}` : '...';
      chips.push({ key: 'adv-rent', label: `Rentabilidade: ${minStr} a ${maxStr}`, icon: '📈' });
    }

    if (this.advMarkupRav !== 'todos') {
      const labelMap: Record<string, string> = {
        com_markup: 'Com Markup',
        com_rav: 'Com RAV',
        com_markup_ou_rav: 'Markup OU RAV',
        com_markup_e_rav: 'Markup + RAV',
        apenas_comissao: 'Apenas Comissão',
        sem_markup_rav: 'Sem Markup/RAV'
      };
      chips.push({ key: 'adv-markup-rav', label: labelMap[this.advMarkupRav] || this.advMarkupRav, icon: '💎' });
    }

    if (this.advAnexos !== 'todos') {
      const labelMap: Record<string, string> = {
        com_anexo: 'Com Anexos',
        sem_anexo: 'Sem Anexos',
        com_voucher: 'Com Voucher Geral',
        sem_voucher: 'Sem Voucher Geral'
      };
      chips.push({ key: 'adv-anexos', label: labelMap[this.advAnexos] || this.advAnexos, icon: '📎' });
    }

    if (this.advSla !== 'todos') {
      chips.push({ key: 'adv-sla', label: this.advSla === 'com_alerta' ? 'Com Alerta SLA' : 'SLA em Dia', icon: '🚨' });
    }

    this.advRiskScore.forEach(r => {
      chips.push({ key: `adv-risk-${r}`, label: `Risco ${r.toUpperCase()}`, icon: '🛡️' });
    });

    if (this.selectedConsultantId !== 'todos') {
      const consultorNome = this.consultores.find(c => c.id === this.selectedConsultantId)?.nome || 'Consultor';
      chips.push({ key: 'consultor', label: `Consultor: ${consultorNome}`, icon: '👤' });
    }

    if (this.confFilters.finPendente) chips.push({ key: 'conf-fin-pendente', label: 'Fin. Pendente', icon: '⏳' });
    if (this.confFilters.finOk) chips.push({ key: 'conf-fin-ok', label: 'Fin. OK', icon: '✅' });
    if (this.confFilters.procPendente) chips.push({ key: 'conf-proc-pendente', label: 'Proc. Pendente', icon: '⏳' });
    if (this.confFilters.procOk) chips.push({ key: 'conf-proc-ok', label: 'Proc. OK', icon: '✅' });

    if (this.activeStatusTab !== 'todos') {
      const statusLabels: Record<string, string> = {
        fechado: 'Fechado',
        pos_venda: 'Pós-Venda',
        pre_embarque: 'Pré-Embarque',
        pos_viagem: 'Pós-Viagem',
        reembolso_solicitado: 'Reembolso Solicitado'
      };
      chips.push({ key: 'status', label: `Status: ${statusLabels[this.activeStatusTab] || this.activeStatusTab}`, icon: '🏷️' });
    }

    if (chips.length === 0) return '';

    return `
      <div id="active-filter-chips-bar" class="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-2 animate-fadeIn">
        <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider select-none flex items-center gap-1">
          <span>🎯 Filtros Ativos:</span>
        </span>
        ${chips.map(chip => `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-xs font-bold text-slate-700 dark:text-slate-200 group transition hover:border-indigo-400">
            <span>${chip.icon}</span>
            <span>${chip.label}</span>
            <button type="button" class="btn-remove-filter-chip text-slate-400 hover:text-rose-500 transition p-0.5 ml-0.5 cursor-pointer" data-clear-filter="${chip.key}" title="Remover este filtro">
              ✕
            </button>
          </span>
        `).join('')}
        <button id="btn-clear-all-chips" type="button" class="text-xs font-extrabold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer ml-1">
          Limpar Todos
        </button>
      </div>
    `;
  }

  /**
   * Renderiza uma aba de status individual com contador
   */
  private renderStatusTab(label: string, statusKey: string, count: number): string {
    const isActive = this.activeStatusTab === statusKey;
    const activeClass = isActive
      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-black'
      : 'border-transparent text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 font-bold hover:border-slate-300 dark:hover:border-slate-800';

    return `
      <button class="tab-status-btn shrink-0 whitespace-nowrap px-4 py-3 border-b-2 text-xs transition duration-200 flex items-center gap-1.5 focus:outline-none ${activeClass}" data-status-key="${statusKey}">
        <span>${label}</span>
        <span class="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold">${count}</span>
      </button>
    `;
  }

  /**
   * Renderiza o cabeçalho da coluna com botões e setas de ordenação
   */
  private renderSortHeader(label: string, field: string): string {
    const isSorted = this.sortField === field;
    const arrow = isSorted
      ? (this.sortDirection === 'asc' ? '▲' : '▼')
      : '⇅';
    const activeClass = isSorted
      ? 'text-indigo-600 dark:text-indigo-400 font-black'
      : 'text-slate-300 dark:text-slate-400 group-hover:text-slate-400';

    return `
      <button class="btn-sort-column group inline-flex items-center gap-1.5 focus:outline-none uppercase tracking-wider text-[10px] font-black text-slate-400 dark:text-slate-400" data-sort-field="${field}">
        <span>${label}</span>
        <span class="${activeClass} text-[8px] transition-transform duration-200">${arrow}</span>
      </button>
    `;
  }

  /**
   * Renderiza a linha de dados da tabela operacional
   */
  private renderTableRow(v: any): string {
    const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r: any) => r.status === 'pago');
    const sla = reembolsoConcluido ? { alert: false, type: null, text: '' } : this.checkSLA(v);

    let slaIcon = '🟢';
    let rowBg = 'bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/20';

    if (reembolsoConcluido) {
      slaIcon = '✅';
      rowBg = 'bg-emerald-50/10 dark:bg-emerald-950/5 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10';
    } else if (sla.alert) {
      if (sla.type === 'pre-embarque') {
        slaIcon = '⚠️';
        rowBg = 'bg-rose-50/15 dark:bg-rose-950/5 hover:bg-rose-50/25 dark:hover:bg-rose-950/10';
      } else if (sla.type === 'pos-viagem') {
        slaIcon = '🚨';
        rowBg = 'bg-amber-50/15 dark:bg-amber-950/5 hover:bg-amber-50/25 dark:hover:bg-amber-950/10';
      }
    }

    const formatarData = (dStr: string) => {
      if (!dStr) return '-';
      const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const parts = dataApenas.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Calcular Rentabilidade (Comissão + Markup + RAV * 0.88), Markup e RAV brutos
    let rentabilidade = 0;
    let totalMarkup = 0;
    let totalRav = 0;
    if (v.produtos && Array.isArray(v.produtos)) {
      v.produtos.forEach((p: any) => {
        const comissao = Number(p.comissao) || 0;
        const markup = Number(p.markup) || 0;
        const rav = Number(p.rav) || 0;
        totalMarkup += markup;
        totalRav += rav;
        rentabilidade += comissao + markup + (rav * 0.88);
      });
    }
    const valorVenda = Number(v.valor_total) || 0;

    // Calcular PaxFlow Risk Score™
    const risk = RiskScoreService.calculateTripRiskScore(v, v.cliente, v.produtos, this.settings, this.user, this.perfil);

    return `
      <tr class="${rowBg} transition-colors duration-200">
        <!-- SLA & Risk Score -->
        <td class="px-4 py-4 text-center select-none" title="Legenda do SLA:
🟢 Normal (Tudo em dia)
⚠️ Alerta (Pré-embarque próximo)
🚨 Atrasado (Pós-viagem excedido)
✅ Concluído (Reembolso pago)

Atual: ${sla.alert ? sla.text : (reembolsoConcluido ? 'Reembolso Concluído' : 'SLA Normal')}">
          <div class="flex items-center justify-center gap-2">
            <span class="text-base">${slaIcon}</span>
            ${isRiskScoreEnabled(this.user, this.perfil, this.settings) ? `
              <button class="btn-open-risk-score px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1 border shadow-xs transition transform hover:scale-105 ${risk.badgeClass}" data-trip-id="${v.id}" title="PaxFlow Risk Score™: ${risk.score}/100 (${risk.fraseStatus}) — Clique para abrir o diagnósticos">
                <span>🛡️ ${risk.score}</span>
              </button>
            ` : ''}
          </div>
        </td>

        <!-- Cliente -->
        <td class="px-5 py-4 min-w-[200px]">
          <div class="font-black text-slate-800 dark:text-slate-100">${highlightMatch(v.cliente?.nome || 'Cliente Desconhecido', this.buscaTermo)}</div>
          ${v.codigoRef ? `
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 font-mono font-bold text-[9px] rounded tracking-wider border border-indigo-200/40 dark:border-indigo-850 uppercase">
                ${highlightMatch(v.codigoRef, this.buscaTermo)}
              </span>
            </div>
          ` : ''}
        </td>

        <!-- Destino / Produtos -->
        <td class="px-5 py-4">
          <div class="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            ✈️ ${highlightMatch(v.destino, this.buscaTermo)}
          </div>
          <!-- Localizadores dos Produtos -->
          ${v.produtos && v.produtos.length > 0 ? `
            <div class="flex flex-wrap gap-1 mt-1.5">
              ${(() => {
                const locs: string[] = Array.from(new Set<string>(
                  (v.produtos || [])
                    .map((p: any) => (p.codigo_reserva || p.codigoReserva || '').trim().toUpperCase())
                    .filter(Boolean)
                ));
                if (locs.length === 0) {
                  return `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SEM LOC</span>`;
                }
                return locs.map((loc: string) => `
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 tracking-wider" title="Localizador: ${loc}">
                    ${highlightMatch(loc, this.buscaTermo)}
                  </span>
                `).join('');
              })()}
            </div>
          ` : ''}
        </td>



        <!-- Data Fin. -->
        <td class="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-semibold">
          ${v.data_financeiro ? formatarData(v.data_financeiro) : '-'}
        </td>

        <!-- Financeiro -->
        <td class="px-5 py-4 whitespace-nowrap">
          <div class="font-black text-indigo-600 dark:text-indigo-400">
            R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5" title="Margem de Lucro (Venda - Custos de Fornecedor)">
            Rent: R$ ${rentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          ${(totalMarkup > 0 || totalRav > 0) ? `
            <div class="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
              MKP: R$ ${totalMarkup.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | RAV: R$ ${totalRav.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          ` : ''}
        </td>

        <!-- Consultor -->
        ${this.perfil?.role === 'admin' ? `
          <td class="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-extrabold">
            ${v.consultor_id === this.user.id ? 'Você' : (this.consultores.find(c => c.id === v.consultor_id)?.nome || 'Outro Consultor')}
          </td>
        ` : ''}

        <!-- Dropdown Fase/Status -->
        <td class="px-5 py-4">
          <select class="select-status-inline w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-xs cursor-pointer" data-trip-id="${v.id}" data-old-value="${v.status}">
            <option value="fechado" ${v.status === 'fechado' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Fechado</option>
            <option value="pos_venda" ${v.status === 'fechado' ? 'disabled' : ''} ${v.status === 'pos_venda' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pós-Venda</option>
            <option value="pre_embarque" ${v.status === 'pre_embarque' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pré-Embarque</option>
            <option value="pos_viagem" ${v.status === 'pos_viagem' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pós-Viagem</option>
            <option value="reembolso_solicitado" ${v.status === 'reembolso_solicitado' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Reembolso Solicitado</option>
          </select>
        </td>

        <!-- Ações -->
        <td class="px-5 py-4 text-center whitespace-nowrap">
          <div class="flex items-center justify-center gap-2">
            <button class="btn-action-view px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black rounded-lg border border-indigo-100/30 dark:border-indigo-900/30 transition text-[10px] uppercase" data-trip-id="${v.id}">
              🔍 Ver Detalhes
            </button>
            <button class="btn-action-whatsapp p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/45 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100/30 dark:border-emerald-900/30 transition flex items-center justify-center" data-trip-id="${v.id}" title="Enviar Mensagem de WhatsApp">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.777 1.451 5.51 0 9.997-4.493 10-10.008.002-2.673-1.037-5.186-2.93-7.079-1.892-1.893-4.401-2.934-7.078-2.934-5.518 0-10.007 4.493-10.01 10.01-.001 1.708.455 3.377 1.32 4.887L1.134 22.84l4.513-1.186zm11.23-7.925c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.669.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            </button>
            ${v.status === 'pos_viagem' ? `
              <button class="btn-action-copiar-nps p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100/30 dark:border-indigo-900/30 transition flex items-center justify-center font-bold text-xs" data-trip-id="${v.id}" title="Copiar link da pesquisa de NPS">
                📋
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Renderiza um card individual de viagem para exibição em dispositivos móveis
   */
  private renderMobileCard(v: any): string {
    const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r: any) => r.status === 'pago');
    const sla = reembolsoConcluido ? { alert: false, type: null, text: '' } : this.checkSLA(v);

    let slaIcon = '🟢';
    let cardBorder = 'border-l-emerald-500';
    let cardBg = 'bg-white dark:bg-slate-900';

    if (reembolsoConcluido) {
      slaIcon = '✅';
      cardBorder = 'border-l-emerald-500';
      cardBg = 'bg-emerald-50/5 dark:bg-emerald-950/5';
    } else if (sla.alert) {
      if (sla.type === 'pre-embarque') {
        slaIcon = '⚠️';
        cardBorder = 'border-l-rose-500';
        cardBg = 'bg-rose-50/5 dark:bg-rose-950/5';
      } else if (sla.type === 'pos-viagem') {
        slaIcon = '🚨';
        cardBorder = 'border-l-amber-500';
        cardBg = 'bg-amber-50/5 dark:bg-amber-950/5';
      }
    }

    const formatarData = (dStr: string) => {
      if (!dStr) return '-';
      const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const parts = dataApenas.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    let rentabilidade = 0;
    let totalMarkup = 0;
    let totalRav = 0;
    if (v.produtos && Array.isArray(v.produtos)) {
      v.produtos.forEach((p: any) => {
        const comissao = Number(p.comissao) || 0;
        const markup = Number(p.markup) || 0;
        const rav = Number(p.rav) || 0;
        totalMarkup += markup;
        totalRav += rav;
        rentabilidade += comissao + markup + (rav * 0.88);
      });
    }
    const valorVenda = Number(v.valor_total) || 0;

    // Calcular PaxFlow Risk Score™
    const risk = RiskScoreService.calculateTripRiskScore(v, v.cliente, v.produtos, this.settings, this.user, this.perfil);

    return `
      <div class="dashboard-mobile-card ${cardBg} border border-slate-200/60 dark:border-slate-800 border-l-4 ${cardBorder} rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden transition-transform duration-200" data-mobile-trip-id="${v.id}">
        <!-- Header: SLA + Risk Score + Cliente + LOC -->
        <div class="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="space-y-1">
            <div class="font-black text-sm text-slate-800 dark:text-slate-100">${highlightMatch(v.cliente?.nome || 'Cliente Desconhecido', this.buscaTermo)}</div>
            <div class="flex flex-wrap items-center gap-1.5">
              ${v.codigoRef ? `
                <span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 font-mono font-bold text-[9px] rounded tracking-wider border border-indigo-200/40 dark:border-indigo-850 uppercase">
                  REF: ${highlightMatch(v.codigoRef, this.buscaTermo)}
                </span>
              ` : ''}
              ${this.perfil?.role === 'admin' ? `
                <span class="text-[9px] text-slate-400 font-bold bg-slate-100/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200/20 dark:border-slate-700/20">
                  👤 ${v.consultor_id === this.user.id ? 'Você' : (this.consultores.find(c => c.id === v.consultor_id)?.nome?.split(' ')[0] || 'Outro')}
                </span>
              ` : ''}
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${isRiskScoreEnabled(this.user, this.perfil, this.settings) ? `
              <button class="btn-open-risk-score px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider flex items-center gap-1 border shadow-xs transition transform hover:scale-105 ${risk.badgeClass}" data-trip-id="${v.id}" title="PaxFlow Risk Score™: ${risk.score}/100 — Clique para abrir o diagnósticos">
                <span>🛡️ ${risk.score}</span>
              </button>
            ` : ''}
            <div class="flex flex-col items-end shrink-0" title="${sla.alert ? sla.text : (reembolsoConcluido ? 'Reembolso Concluído' : 'SLA Normal')}">
              <span class="text-lg">${slaIcon}</span>
              ${sla.alert ? `<span class="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-0.5">SLA ATIVO</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Body: Destino, Datas e Produtos -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="space-y-1">
            <span class="block text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Destino & Viagem</span>
            <div class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              ✈️ ${highlightMatch(v.destino, this.buscaTermo)}
            </div>
            <!-- Localizadores dos Produtos -->
            ${v.produtos && v.produtos.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-1">
                ${(() => {
                  const locs: string[] = Array.from(new Set<string>(
                    (v.produtos || [])
                      .map((p: any) => (p.codigo_reserva || p.codigoReserva || '').trim().toUpperCase())
                      .filter(Boolean)
                  ));
                  if (locs.length === 0) {
                    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SEM LOC</span>`;
                  }
                  return locs.map((loc: string) => `
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[8px] font-mono font-bold text-slate-700 dark:text-slate-300 tracking-wider" title="Localizador: ${loc}">
                      ${highlightMatch(loc, this.buscaTermo)}
                    </span>
                  `).join('');
                })()}
              </div>
            ` : ''}
          </div>
          <div class="space-y-1">
            <span class="block text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Período</span>
            <div class="text-slate-700 dark:text-slate-300 font-semibold leading-tight">
              <div>${formatarData(v.data_ida)}</div>
              <div class="text-[10px] text-slate-400 font-medium">até</div>
              <div>${formatarData(v.data_volta)}</div>
            </div>
          </div>
        </div>

        <!-- Finance Info: Valor e Rentabilidade -->
        <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs">
          <div>
            <span class="block text-[8px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Valor Venda</span>
            <span class="font-black text-indigo-600 dark:text-indigo-400 text-sm">R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="text-right">
            <span class="block text-[8px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Rentabilidade</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">R$ ${rentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            ${(totalMarkup > 0 || totalRav > 0) ? `
              <span class="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                MKP: R$ ${totalMarkup.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | RAV: R$ ${totalRav.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Footer Actions: Status Dropdown + Detalhes Button -->
        <div class="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex-wrap">
          <div class="flex-1 min-w-[120px]">
            <select class="select-status-inline w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-xs cursor-pointer" data-trip-id="${v.id}" data-old-value="${v.status}">
              <option value="fechado" ${v.status === 'fechado' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Fechado</option>
              <option value="pos_venda" ${v.status === 'fechado' ? 'disabled' : ''} ${v.status === 'pos_venda' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pós-Venda</option>
              <option value="pre_embarque" ${v.status === 'pre_embarque' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pré-Embarque</option>
              <option value="pos_viagem" ${v.status === 'pos_viagem' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Pós-Viagem</option>
              <option value="reembolso_solicitado" ${v.status === 'reembolso_solicitado' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Reembolso Solicitado</option>
            </select>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn-action-view px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md shadow-indigo-600/10 transition text-xs uppercase" data-trip-id="${v.id}">
              🔍 Detalhes
            </button>
            <button class="btn-action-share-mobile p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 transition flex items-center justify-center font-bold text-xs" data-trip-id="${v.id}" title="Compartilhar Itinerário">
              🔗
            </button>
            <button class="btn-action-whatsapp p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/45 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100/30 dark:border-emerald-900/30 transition flex items-center justify-center" data-trip-id="${v.id}" title="Enviar Mensagem de WhatsApp">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.777 1.451 5.51 0 9.997-4.493 10-10.008.002-2.673-1.037-5.186-2.93-7.079-1.892-1.893-4.401-2.934-7.078-2.934-5.518 0-10.007 4.493-10.01 10.01-.001 1.708.455 3.377 1.32 4.887L1.134 22.84l4.513-1.186zm11.23-7.925c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.669.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            </button>
            ${v.status === 'pos_viagem' ? `
              <button class="btn-action-copiar-nps p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 transition flex items-center justify-center font-bold text-xs" data-trip-id="${v.id}" title="Copiar link da pesquisa de NPS">
                📋
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Vincula todos os ouvintes de eventos da nova interface em lista do operacional
   */
  private setupUIEventListeners(): void {
    // 0. Pill Switch: Mês Corrente vs Ver Tudo
    document.getElementById('btn-view-month-current')?.addEventListener('click', () => {
      this.viewModeMonth = 'current';
      localStorage.setItem('paxflow-view-mode-month', 'current');
      this.render();
    });

    document.getElementById('btn-view-month-all')?.addEventListener('click', () => {
      this.viewModeMonth = 'all';
      localStorage.setItem('paxflow-view-mode-month', 'all');
      this.render();
    });

    // 1. Campo de busca de viagens com resgate Co-Piloto (Toda a Agência)
    const searchInput = document.getElementById('input-busca-viagem') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.buscaTermo = val;
      this.render();

      // Restaura o foco e coloca o cursor no final
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

    // Ouvintes para abrir viagem no Modo Co-Piloto a partir dos resultados de Balcão
    this.container.querySelectorAll('.btn-balcao-open-trip').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (!tripId) return;

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
      });
    });

    // 2. Botão de Toggle Filtros Avançados
    document.getElementById('btn-toggle-filtros')?.addEventListener('click', () => {
      this.showFiltersPanel = !this.showFiltersPanel;
      this.render();
    });

    // 2.1. Botão de Recolher Painel
    document.getElementById('btn-collapse-adv-panel')?.addEventListener('click', () => {
      this.showFiltersPanel = false;
      this.render();
    });

    // 2.2. Botão de Exportar CSV
    document.getElementById('btn-export-filtered-csv')?.addEventListener('click', () => {
      const filtrados = this.viagens.filter(v => {
        const vConsultorId = v.consultor_id || (v as any).consultorId;
        const vRespId = v.consultor_responsavel_id || (v as any).consultorResponsavelId;

        if (this.selectedConsultantId !== 'todos' && vConsultorId !== this.selectedConsultantId && vRespId !== this.selectedConsultantId) return false;
        if (this.confFilters.finPendente && v.isFinanceiroConferido) return false;
        if (this.confFilters.finOk && !v.isFinanceiroConferido) return false;
        if (this.confFilters.procPendente && v.isProcessoConferido) return false;
        if (this.confFilters.procOk && !v.isProcessoConferido) return false;
        if (this.viewModeMonth === 'current' && !this.isCurrentMonthTrip(v)) return false;
        if (this.activeStatusTab !== 'todos' && (v.status || '').toLowerCase().trim() !== this.activeStatusTab.toLowerCase().trim()) return false;
        if (this.dataFinStart && (!v.data_financeiro || v.data_financeiro < this.dataFinStart)) return false;
        if (this.dataFinEnd && (!v.data_financeiro || v.data_financeiro > this.dataFinEnd)) return false;
        if (this.dataIdaStart && (!v.data_ida || v.data_ida < this.dataIdaStart)) return false;
        if (this.dataIdaEnd && (!v.data_ida || v.data_ida > this.dataIdaEnd)) return false;
        if (this.dataVoltaStart && (!v.data_volta || v.data_volta < this.dataVoltaStart)) return false;
        if (this.dataVoltaEnd && (!v.data_volta || v.data_volta > this.dataVoltaEnd)) return false;
        if (this.advMesAno) {
          const rawDate = v.data_financeiro || v.data_ida || v.created_at || '';
          if (rawDate.substring(0, 7) !== this.advMesAno) return false;
        }
        if (this.advProdutos.length > 0) {
          const prods = Array.isArray(v.produtos) ? v.produtos : [];
          const tripProdTypes = prods.map((p: any) => (p.tipo || p.tipo_produto || '').trim().toLowerCase());
          if (this.advProdutoMatchMode === 'AND') {
            const hasAll = this.advProdutos.every(wanted => tripProdTypes.some((t: string) => t.includes(wanted) || wanted.includes(t)));
            if (!hasAll) return false;
          } else {
            const hasAny = this.advProdutos.some(wanted => tripProdTypes.some((t: string) => t.includes(wanted) || wanted.includes(t)));
            if (!hasAny) return false;
          }
        }
        if (this.advDestinos.length > 0) {
          const destNome = (v.destino || '').toLowerCase();
          const destId = v.destino_id || v.destinoId || '';
          const matchesDest = this.advDestinos.some(d => destNome.includes(d.toLowerCase()) || destId === d);
          if (!matchesDest) return false;
        }
        if (this.advFornecedor.trim()) {
          const fornQ = this.advFornecedor.trim().toLowerCase();
          const prods = Array.isArray(v.produtos) ? v.produtos : [];
          if (!prods.some((p: any) => (p.fornecedor || '').toLowerCase().includes(fornQ))) return false;
        }
        // Filtros de Valores Financeiros Completos dos Produtos & Viagem
        const finTotals = this.getTripFinancialTotals(v);
        if (this.advValorMin !== null && finTotals.totalVenda < this.advValorMin) return false;
        if (this.advValorMax !== null && finTotals.totalVenda > this.advValorMax) return false;
        if (this.advTarifaMin !== null && finTotals.totalTarifa < this.advTarifaMin) return false;
        if (this.advTarifaMax !== null && finTotals.totalTarifa > this.advTarifaMax) return false;
        if (this.advTaxaMin !== null && finTotals.totalTaxa < this.advTaxaMin) return false;
        if (this.advTaxaMax !== null && finTotals.totalTaxa > this.advTaxaMax) return false;
        if (this.advComissaoMin !== null && finTotals.totalComissao < this.advComissaoMin) return false;
        if (this.advComissaoMax !== null && finTotals.totalComissao > this.advComissaoMax) return false;
        if (this.advMarkupMin !== null && finTotals.totalMarkup < this.advMarkupMin) return false;
        if (this.advMarkupMax !== null && finTotals.totalMarkup > this.advMarkupMax) return false;
        if (this.advRavMin !== null && finTotals.totalRav < this.advRavMin) return false;
        if (this.advRavMax !== null && finTotals.totalRav > this.advRavMax) return false;
        if (this.advRentabilidadeMin !== null && finTotals.totalRentabilidade < this.advRentabilidadeMin) return false;
        if (this.advRentabilidadeMax !== null && finTotals.totalRentabilidade > this.advRentabilidadeMax) return false;

        if (this.advMarkupRav !== 'todos') {
          if (this.advMarkupRav === 'com_markup' && finTotals.totalMarkup <= 0) return false;
          if (this.advMarkupRav === 'com_rav' && finTotals.totalRav <= 0) return false;
          if (this.advMarkupRav === 'com_markup_ou_rav' && finTotals.totalMarkup <= 0 && finTotals.totalRav <= 0) return false;
          if (this.advMarkupRav === 'com_markup_e_rav' && (finTotals.totalMarkup <= 0 || finTotals.totalRav <= 0)) return false;
          if (this.advMarkupRav === 'apenas_comissao' && (finTotals.totalComissao <= 0 || finTotals.totalMarkup > 0 || finTotals.totalRav > 0)) return false;
          if (this.advMarkupRav === 'sem_markup_rav' && (finTotals.totalMarkup > 0 || finTotals.totalRav > 0)) return false;
        }
        if (this.advAnexos !== 'todos') {
          const prods = Array.isArray(v.produtos) ? v.produtos : [];
          const hasVoucherGeral = !!v.voucher_geral_anexado;
          const hasProductAnexo = prods.some((p: any) => p.dados_adicionais?.anexo_url || p.dados_adicionais?.voucher_url || p.dadosAdicionais?.anexo_url || p.dadosAdicionais?.voucher_url);
          const hasAnyAnexo = hasVoucherGeral || hasProductAnexo;
          if (this.advAnexos === 'com_anexo' && !hasAnyAnexo) return false;
          if (this.advAnexos === 'sem_anexo' && hasAnyAnexo) return false;
          if (this.advAnexos === 'com_voucher' && !hasVoucherGeral) return false;
          if (this.advAnexos === 'sem_voucher' && hasVoucherGeral) return false;
        }
        if (this.advSla !== 'todos') {
          const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r: any) => r.status === 'pago');
          const slaResult = reembolsoConcluido ? { alert: false } : this.checkSLA(v);
          if (this.advSla === 'com_alerta' && !slaResult.alert) return false;
          if (this.advSla === 'sem_alerta' && slaResult.alert) return false;
        }
        if (this.advRiskScore.length > 0) {
          const risk = RiskScoreService.calculateTripRiskScore(v, v.cliente, v.produtos, this.settings, this.user, this.perfil);
          if (!this.advRiskScore.includes(risk.nivel)) return false;
        }
        if (this.advConsultores.length > 0) {
          if (!this.advConsultores.includes(vConsultorId) && !this.advConsultores.includes(vRespId)) return false;
        }
        if (this.advFormasRecebimento.length > 0) {
          const pags = this.locPagamentosMap.get(v.id) || [];
          const matchesForma = this.advFormasRecebimento.some(f => {
            const fLower = f.toLowerCase();
            return pags.some((p: any) => {
              const pId = (p.forma_recebimento_id || '').toLowerCase();
              const pNome = (p.forma_nome || '').toLowerCase();
              return pId === fLower || pNome.includes(fLower) || fLower.includes(pNome);
            });
          });
          if (!matchesForma) return false;
        }
        if (this.advOrigensLead.length > 0) {
          const cliOrigem = (v.cliente?.lead_origin || v.lead_origin || '').toLowerCase();
          const cliOrigemId = (v.cliente?.origem_lead_id || v.origem_lead_id || '').toLowerCase();
          const matchesOrigem = this.advOrigensLead.some(o => {
            const oLower = o.toLowerCase();
            return (cliOrigem && (cliOrigem.includes(oLower) || oLower.includes(cliOrigem))) || (cliOrigemId && cliOrigemId === oLower);
          });
          if (!matchesOrigem) return false;
        }
        if (this.advPaxFaixas.length > 0) {
          const paxCount = Array.isArray(v.passageiros) && v.passageiros.length > 0 ? v.passageiros.length : (Number(v.pax_count) || 1);
          const matchesPax = this.advPaxFaixas.some(faixa => {
            if (faixa === '1') return paxCount === 1;
            if (faixa === '2') return paxCount === 2;
            if (faixa === '3-5') return paxCount >= 3 && paxCount <= 5;
            if (faixa === '6+') return paxCount >= 6;
            return false;
          });
          if (!matchesPax) return false;
        }
        if (this.advTags.length > 0) {
          const tripTags = [
            ...(Array.isArray(v.tags) ? v.tags : []),
            ...(v.cliente && Array.isArray(v.cliente.classificacoes) ? v.cliente.classificacoes : [])
          ].map(t => (typeof t === 'string' ? t.trim().toLowerCase() : ''));
          const matchesTag = this.advTags.some(wanted => {
            const wantedLower = wanted.toLowerCase();
            return tripTags.some(t => t.includes(wantedLower) || wantedLower.includes(t));
          });
          if (!matchesTag) return false;
        }
        return true;
      });
      this.exportarViagensCsv(filtrados);
    });

    // 3. Ouvintes para inputs de Filtro de Data
    const bindDateFilter = (elementId: string, propertyName: string) => {
      const el = document.getElementById(elementId) as HTMLInputElement;
      el?.addEventListener('change', () => {
        const raw = el.value.trim();
        (this as any)[propertyName] = raw ? (formatBrDateToIso(raw) || raw) : '';
        this.render();
      });
    };

    bindDateFilter('filter-fin-start', 'dataFinStart');
    bindDateFilter('filter-fin-end', 'dataFinEnd');
    bindDateFilter('filter-ida-start', 'dataIdaStart');
    bindDateFilter('filter-ida-end', 'dataIdaEnd');
    bindDateFilter('filter-volta-start', 'dataVoltaStart');
    bindDateFilter('filter-volta-end', 'dataVoltaEnd');

    // 3.1. Atalho Mês/Ano
    const selectMesAno = document.getElementById('filter-adv-mes-ano') as HTMLSelectElement;
    selectMesAno?.addEventListener('change', () => {
      this.advMesAno = selectMesAno.value;
      this.render();
    });

    // 3.2. Destinos
    const selectDest = document.getElementById('filter-adv-destino') as HTMLSelectElement;
    selectDest?.addEventListener('change', () => {
      const val = selectDest.value;
      this.advDestinos = val ? [val] : [];
      this.render();
    });

    // 3.3. Fornecedor
    const inputForn = document.getElementById('filter-adv-fornecedor') as HTMLInputElement;
    inputForn?.addEventListener('change', () => {
      this.advFornecedor = inputForn.value.trim();
      this.render();
    });

    // 3.4. Faixas Financeiras Completas
    const bindNumericFilter = (elementId: string, propertyName: string) => {
      const el = document.getElementById(elementId) as HTMLInputElement;
      el?.addEventListener('change', () => {
        const val = el.value ? this.parseFinancialNumber(el.value) : null;
        (this as any)[propertyName] = val;
        this.render();
      });
    };

    bindNumericFilter('filter-adv-valor-min', 'advValorMin');
    bindNumericFilter('filter-adv-valor-max', 'advValorMax');
    bindNumericFilter('filter-adv-tarifa-min', 'advTarifaMin');
    bindNumericFilter('filter-adv-tarifa-max', 'advTarifaMax');
    bindNumericFilter('filter-adv-taxa-min', 'advTaxaMin');
    bindNumericFilter('filter-adv-taxa-max', 'advTaxaMax');
    bindNumericFilter('filter-adv-comissao-min', 'advComissaoMin');
    bindNumericFilter('filter-adv-comissao-max', 'advComissaoMax');
    bindNumericFilter('filter-adv-markup-min', 'advMarkupMin');
    bindNumericFilter('filter-adv-markup-max', 'advMarkupMax');
    bindNumericFilter('filter-adv-rav-min', 'advRavMin');
    bindNumericFilter('filter-adv-rav-max', 'advRavMax');
    bindNumericFilter('filter-adv-rent-min', 'advRentabilidadeMin');
    bindNumericFilter('filter-adv-rent-max', 'advRentabilidadeMax');

    document.getElementById('btn-clear-adv-financas')?.addEventListener('click', () => {
      this.advValorMin = null;
      this.advValorMax = null;
      this.advTarifaMin = null;
      this.advTarifaMax = null;
      this.advTaxaMin = null;
      this.advTaxaMax = null;
      this.advComissaoMin = null;
      this.advComissaoMax = null;
      this.advMarkupMin = null;
      this.advMarkupMax = null;
      this.advRavMin = null;
      this.advRavMax = null;
      this.advRentabilidadeMin = null;
      this.advRentabilidadeMax = null;
      this.advMarkupRav = 'todos';
      this.render();
    });

    // 3.4.2. Pills de Produtos com Markup & RAV
    this.container.querySelectorAll('.pill-adv-markup-rav').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-markup-rav-val') as any;
        if (val) {
          this.advMarkupRav = val;
          this.render();
        }
      });
    });

    // 3.5. Toggle Modo de Correspondência de Produtos (E vs OU)
    document.getElementById('btn-match-mode-and')?.addEventListener('click', () => {
      this.advProdutoMatchMode = 'AND';
      this.render();
    });
    document.getElementById('btn-match-mode-or')?.addEventListener('click', () => {
      this.advProdutoMatchMode = 'OR';
      this.render();
    });
    document.getElementById('btn-clear-adv-produtos')?.addEventListener('click', () => {
      this.advProdutos = [];
      this.render();
    });

    // 3.6. Pills de Produtos
    this.container.querySelectorAll('.pill-adv-produto').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-prod-id');
        if (!pId) return;
        if (this.advProdutos.includes(pId)) {
          this.advProdutos = this.advProdutos.filter(p => p !== pId);
        } else {
          this.advProdutos.push(pId);
        }
        this.render();
      });
    });

    // 3.6.1. Pills de Consultores
    this.container.querySelectorAll('.pill-adv-consultor').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-consultant-id');
        if (!cId) return;
        if (this.advConsultores.includes(cId)) {
          this.advConsultores = this.advConsultores.filter(id => id !== cId);
        } else {
          this.advConsultores.push(cId);
        }
        this.render();
      });
    });
    document.getElementById('btn-clear-adv-consultores')?.addEventListener('click', () => {
      this.advConsultores = [];
      this.render();
    });

    // 3.6.2. Pills de Formas de Recebimento
    this.container.querySelectorAll('.pill-adv-forma').forEach(btn => {
      btn.addEventListener('click', () => {
        const fKey = btn.getAttribute('data-forma-id') || btn.getAttribute('data-forma-nome');
        if (!fKey) return;
        if (this.advFormasRecebimento.includes(fKey)) {
          this.advFormasRecebimento = this.advFormasRecebimento.filter(id => id !== fKey);
        } else {
          this.advFormasRecebimento.push(fKey);
        }
        this.render();
      });
    });
    document.getElementById('btn-clear-adv-formas')?.addEventListener('click', () => {
      this.advFormasRecebimento = [];
      this.render();
    });

    // 3.6.3. Pills de Origem do Lead
    this.container.querySelectorAll('.pill-adv-origem').forEach(btn => {
      btn.addEventListener('click', () => {
        const oKey = btn.getAttribute('data-origem-id') || btn.getAttribute('data-origem-nome');
        if (!oKey) return;
        if (this.advOrigensLead.includes(oKey)) {
          this.advOrigensLead = this.advOrigensLead.filter(id => id !== oKey);
        } else {
          this.advOrigensLead.push(oKey);
        }
        this.render();
      });
    });

    // 3.6.4. Pills de Faixas de PAX
    this.container.querySelectorAll('.pill-adv-pax').forEach(btn => {
      btn.addEventListener('click', () => {
        const paxKey = btn.getAttribute('data-pax-key');
        if (!paxKey) return;
        if (this.advPaxFaixas.includes(paxKey)) {
          this.advPaxFaixas = this.advPaxFaixas.filter(k => k !== paxKey);
        } else {
          this.advPaxFaixas.push(paxKey);
        }
        this.render();
      });
    });

    // 3.6.5. Pills de Tags
    this.container.querySelectorAll('.pill-adv-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const tagName = btn.getAttribute('data-tag-name');
        if (!tagName) return;
        if (this.advTags.includes(tagName)) {
          this.advTags = this.advTags.filter(t => t !== tagName);
        } else {
          this.advTags.push(tagName);
        }
        this.render();
      });
    });
    document.getElementById('btn-clear-adv-tags')?.addEventListener('click', () => {
      this.advTags = [];
      this.render();
    });

    // 3.7. Pills de Anexos
    this.container.querySelectorAll('.pill-adv-anexo').forEach(btn => {
      btn.addEventListener('click', () => {
        const anexoVal = btn.getAttribute('data-anexo-val') as any;
        if (anexoVal) {
          this.advAnexos = anexoVal;
          this.render();
        }
      });
    });

    // 3.8. Pills de SLA
    this.container.querySelectorAll('.pill-adv-sla-alerta').forEach(btn => {
      btn.addEventListener('click', () => {
        const slaVal = btn.getAttribute('data-sla-val') as any;
        if (slaVal) {
          this.advSla = this.advSla === slaVal ? 'todos' : slaVal;
          this.render();
        }
      });
    });

    // 3.9. Pills de Risk Score
    this.container.querySelectorAll('.pill-adv-risk').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = btn.getAttribute('data-risk-level');
        if (!level) return;
        if (this.advRiskScore.includes(level)) {
          this.advRiskScore = this.advRiskScore.filter(l => l !== level);
        } else {
          this.advRiskScore.push(level);
        }
        this.render();
      });
    });

    // 3.10. Pills de Conferência no Painel
    this.container.querySelectorAll('.pill-adv-conf-fin-ok').forEach(btn => {
      btn.addEventListener('click', () => {
        this.confFilters.finOk = !this.confFilters.finOk;
        this.render();
      });
    });
    this.container.querySelectorAll('.pill-adv-conf-fin-pendente').forEach(btn => {
      btn.addEventListener('click', () => {
        this.confFilters.finPendente = !this.confFilters.finPendente;
        this.render();
      });
    });
    this.container.querySelectorAll('.pill-adv-conf-proc-ok').forEach(btn => {
      btn.addEventListener('click', () => {
        this.confFilters.procOk = !this.confFilters.procOk;
        this.render();
      });
    });
    this.container.querySelectorAll('.pill-adv-conf-proc-pendente').forEach(btn => {
      btn.addEventListener('click', () => {
        this.confFilters.procPendente = !this.confFilters.procPendente;
        this.render();
      });
    });

    // 4. Botão de Limpar Todos os Filtros
    const resetAllFilters = () => {
      this.buscaTermo = '';
      const searchInput = document.getElementById('input-busca-viagem') as HTMLInputElement;
      if (searchInput) searchInput.value = '';
      const globalInput = document.getElementById('global-header-search-input') as HTMLInputElement;
      if (globalInput) {
        globalInput.value = '';
        const clearBtn = document.getElementById('btn-clear-global-search');
        if (clearBtn) clearBtn.classList.add('hidden');
      }
      this.balcaoResultados = [];
      this.dataFinStart = '';
      this.dataFinEnd = '';
      this.dataIdaStart = '';
      this.dataIdaEnd = '';
      this.dataVoltaStart = '';
      this.dataVoltaEnd = '';
      this.advMesAno = '';
      this.advProdutos = [];
      this.advDestinos = [];
      this.advFornecedor = '';
      this.advValorMin = null;
      this.advValorMax = null;
      this.advTarifaMin = null;
      this.advTarifaMax = null;
      this.advTaxaMin = null;
      this.advTaxaMax = null;
      this.advComissaoMin = null;
      this.advComissaoMax = null;
      this.advMarkupMin = null;
      this.advMarkupMax = null;
      this.advRavMin = null;
      this.advRavMax = null;
      this.advRentabilidadeMin = null;
      this.advRentabilidadeMax = null;
      this.advMarkupRav = 'todos';
      this.advAnexos = 'todos';
      this.advSla = 'todos';
      this.advRiskScore = [];
      this.advConsultores = [];
      this.advFormasRecebimento = [];
      this.advOrigensLead = [];
      this.advPaxFaixas = [];
      this.advTags = [];
      this.selectedConsultantId = 'todos';
      this.confFilters = {
        finPendente: false,
        finOk: false,
        procPendente: false,
        procOk: false
      };
      this.activeStatusTab = 'todos';
      this.render();
    };

    document.getElementById('btn-clear-date-filters')?.addEventListener('click', resetAllFilters);
    document.getElementById('btn-clear-all-adv-filters')?.addEventListener('click', resetAllFilters);
    document.getElementById('btn-clear-all-chips')?.addEventListener('click', resetAllFilters);

    // 4.1. Listeners dos Chips de Filtros Ativos
    this.container.querySelectorAll('[data-clear-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filterKey = btn.getAttribute('data-clear-filter');
        if (filterKey === 'busca') {
          this.buscaTermo = '';
          const searchInput = document.getElementById('input-busca-viagem') as HTMLInputElement;
          if (searchInput) searchInput.value = '';
          const globalInput = document.getElementById('global-header-search-input') as HTMLInputElement;
          if (globalInput) {
            globalInput.value = '';
            const clearBtn = document.getElementById('btn-clear-global-search');
            if (clearBtn) clearBtn.classList.add('hidden');
          }
          this.balcaoResultados = [];
        } else if (filterKey === 'dataFin') {
          this.dataFinStart = '';
          this.dataFinEnd = '';
        } else if (filterKey === 'dataIda') {
          this.dataIdaStart = '';
          this.dataIdaEnd = '';
        } else if (filterKey === 'dataVolta') {
          this.dataVoltaStart = '';
          this.dataVoltaEnd = '';
        } else if (filterKey === 'adv-mes-ano') {
          this.advMesAno = '';
        } else if (filterKey?.startsWith('adv-prod-')) {
          const pId = filterKey.replace('adv-prod-', '');
          this.advProdutos = this.advProdutos.filter(p => p !== pId);
        } else if (filterKey?.startsWith('adv-consultor-')) {
          const cId = filterKey.replace('adv-consultor-', '');
          this.advConsultores = this.advConsultores.filter(id => id !== cId);
        } else if (filterKey?.startsWith('adv-forma-')) {
          const fKey = filterKey.replace('adv-forma-', '');
          this.advFormasRecebimento = this.advFormasRecebimento.filter(id => id !== fKey);
        } else if (filterKey?.startsWith('adv-origem-')) {
          const oKey = filterKey.replace('adv-origem-', '');
          this.advOrigensLead = this.advOrigensLead.filter(id => id !== oKey);
        } else if (filterKey?.startsWith('adv-pax-')) {
          const paxKey = filterKey.replace('adv-pax-', '');
          this.advPaxFaixas = this.advPaxFaixas.filter(k => k !== paxKey);
        } else if (filterKey?.startsWith('adv-tag-')) {
          const tagName = filterKey.replace('adv-tag-', '');
          this.advTags = this.advTags.filter(t => t !== tagName);
        } else if (filterKey?.startsWith('adv-dest-')) {
          const dest = filterKey.replace('adv-dest-', '');
          this.advDestinos = this.advDestinos.filter(d => d !== dest);
        } else if (filterKey === 'adv-fornecedor') {
          this.advFornecedor = '';
        } else if (filterKey === 'adv-valor') {
          this.advValorMin = null;
          this.advValorMax = null;
        } else if (filterKey === 'adv-tarifa-val') {
          this.advTarifaMin = null;
          this.advTarifaMax = null;
        } else if (filterKey === 'adv-taxa-val') {
          this.advTaxaMin = null;
          this.advTaxaMax = null;
        } else if (filterKey === 'adv-comissao-val') {
          this.advComissaoMin = null;
          this.advComissaoMax = null;
        } else if (filterKey === 'adv-markup-val') {
          this.advMarkupMin = null;
          this.advMarkupMax = null;
        } else if (filterKey === 'adv-rav-val') {
          this.advRavMin = null;
          this.advRavMax = null;
        } else if (filterKey === 'adv-rent') {
          this.advRentabilidadeMin = null;
          this.advRentabilidadeMax = null;
        } else if (filterKey === 'adv-markup-rav') {
          this.advMarkupRav = 'todos';
        } else if (filterKey === 'adv-anexos') {
          this.advAnexos = 'todos';
        } else if (filterKey === 'adv-sla') {
          this.advSla = 'todos';
        } else if (filterKey?.startsWith('adv-risk-')) {
          const r = filterKey.replace('adv-risk-', '');
          this.advRiskScore = this.advRiskScore.filter(l => l !== r);
        } else if (filterKey === 'consultor') {
          this.selectedConsultantId = 'todos';
        } else if (filterKey === 'conf-fin-pendente') {
          this.confFilters.finPendente = false;
        } else if (filterKey === 'conf-fin-ok') {
          this.confFilters.finOk = false;
        } else if (filterKey === 'conf-proc-pendente') {
          this.confFilters.procPendente = false;
        } else if (filterKey === 'conf-proc-ok') {
          this.confFilters.procOk = false;
        } else if (filterKey === 'status') {
          this.activeStatusTab = 'todos';
        }
        this.render();
      });
    });

    // 5. Clique nas Abas de Status
    this.container.querySelectorAll('.tab-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const statusKey = btn.getAttribute('data-status-key');
        if (statusKey) {
          this.activeStatusTab = statusKey;
          this.render();
        }
      });
    });

    // 6. Evento de Criação de Nova Viagem
    document.getElementById('btn-nova-viagem')?.addEventListener('click', () => {
      this.openNovaViagemModal();
    });

    // 7. Evento de Filtro de Consultor (Admins)
    const selectConsultor = document.getElementById('select-dashboard-consultor') as HTMLSelectElement;
    selectConsultor?.addEventListener('change', () => {
      this.selectedConsultantId = selectConsultor.value;
      this.render();
    });

    // 8. Eventos do Popover e Pills de Conferência
    const btnToggleConf = document.getElementById('btn-toggle-conf-popover');
    btnToggleConf?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showConfPopover = !this.showConfPopover;
      this.render();
    });

    document.getElementById('pill-conf-fin-pendente')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confFilters.finPendente = !this.confFilters.finPendente;
      this.render();
    });

    document.getElementById('pill-conf-fin-ok')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confFilters.finOk = !this.confFilters.finOk;
      this.render();
    });

    document.getElementById('pill-conf-proc-pendente')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confFilters.procPendente = !this.confFilters.procPendente;
      this.render();
    });

    document.getElementById('pill-conf-proc-ok')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confFilters.procOk = !this.confFilters.procOk;
      this.render();
    });

    document.getElementById('btn-conf-atalho-100')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confFilters = { finPendente: false, finOk: true, procPendente: false, procOk: true };
      this.render();
    });

    document.getElementById('btn-conf-atalho-nenhum')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confFilters = { finPendente: true, finOk: false, procPendente: true, procOk: false };
      this.render();
    });

    document.getElementById('btn-conf-limpar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confFilters = { finPendente: false, finOk: false, procPendente: false, procOk: false };
      this.render();
    });

    // Fechar Popover ao clicar fora
    if (this.showConfPopover) {
      const popoverContainer = document.getElementById('container-conf-popover');
      const handleOutsideConfClick = (e: MouseEvent) => {
        if (this.showConfPopover && popoverContainer && !popoverContainer.contains(e.target as Node)) {
          this.showConfPopover = false;
          this.render();
        }
      };
      setTimeout(() => {
        document.addEventListener('click', handleOutsideConfClick, { once: true });
      }, 50);
    }

    // Evento de clique no PaxFlow Risk Score Badge
    this.container.querySelectorAll('.btn-open-risk-score').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          const { RiskDiagnosisDrawer } = await import('../components/risk/RiskDiagnosisDrawer');
          RiskDiagnosisDrawer.open(tripId, this.user, this.perfil, async () => {
            await this.loadViagens();
            this.render();
          });
        }
      });
    });

    // Evento de clique nos botões "Ver Detalhes"
    this.container.querySelectorAll('.btn-action-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          this.openEdicaoEProdutosModal(tripId);
        }
      });
    });

    // Evento de clique nos botões "WhatsApp"
    this.container.querySelectorAll('.btn-action-whatsapp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (!tripId) return;

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
      });
    });

    // Evento de clique nos botões "Copiar NPS"
    this.container.querySelectorAll('.btn-action-copiar-nps').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (!tripId) return;

        const origin = window.location.origin + window.location.pathname;
        const linkFeedback = `${origin}#feedback?id=${tripId}`;
        navigator.clipboard.writeText(linkFeedback).then(() => {
          this.showToast('Link da Pesquisa NPS copiado!', 'success');
        }).catch(err => {
          console.error('Erro ao copiar link NPS:', err);
          this.showToast('Erro ao copiar link NPS.', 'error');
        });
      });
    });

    // 9. Evento de clique nos botões "Excluir"
    this.container.querySelectorAll('.btn-action-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tripId = btn.getAttribute('data-trip-id');
        if (!tripId) return;

        const confirmResult = await showCustomConfirm(
          'A exclusão apagará permanentemente esta viagem, todos os seus produtos vinculados, comentários e solicitações de reembolso. Deseja realmente prosseguir?',
          'Excluir Viagem',
          { isDestructive: true, confirmText: 'Excluir', cancelText: 'Manter' }
        );

        if (confirmResult) {
          const success = await this.deleteViagem(tripId);
          if (success) {
            this.showToast('Viagem excluída com sucesso!', 'success');
            await this.loadViagens();
            this.render();
          } else {
            this.showToast('Erro ao excluir viagem.', 'error');
          }
        }
      });
    });

    // 10. Evento de alteração de status inline na tabela com as travas de transição
    this.container.querySelectorAll('.select-status-inline').forEach(select => {
      select.addEventListener('change', async (e) => {
        const selectEl = e.target as HTMLSelectElement;
        const tripId = selectEl.getAttribute('data-trip-id');
        const oldStatus = selectEl.getAttribute('data-old-value');
        const newStatus = selectEl.value;

        if (!tripId || !oldStatus || newStatus === oldStatus) return;

        // Se for reembolso solicitado, chama o modal específico
        if (newStatus === 'reembolso_solicitado') {
          await this.openRefundModal(tripId, oldStatus);
          return;
        }

        // Executa a validação das regras de negócio (data financeiro + saldo zerado + produtos detalhados)
        const isTransitionValid = await this.validarTransicaoStatus(tripId, newStatus);
        if (!isTransitionValid) {
          selectEl.value = oldStatus; // Reverte o select
          return;
        }

        // 1. Atualização otimista local
        const viagem = this.viagens.find(v => v.id === tripId);
        if (viagem) viagem.status = newStatus;
        this.saveViagensToLocalStorage();
        this.render();

        // 2. Atualização no banco de dados (Supabase)
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
          this.saveViagensToLocalStorage();
          this.render();
        }
      });
    });

    // 11. Evento de clique para ordenação de colunas da tabela de vendas
    this.container.querySelectorAll('.btn-sort-column').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.getAttribute('data-sort-field');
        if (!field) return;

        if (this.sortField === field) {
          // Se já está ordenando por esta coluna, inverte a direção
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          // Nova coluna de ordenação, padrão 'asc'
          this.sortField = field;
          this.sortDirection = 'asc';
        }
        this.render();
      });
    });

    // 12. Botão Flutuante (FAB) de Nova Viagem para Mobile
    document.getElementById('btn-fab-nova-viagem')?.addEventListener('click', () => {
      this.openNovaViagemModal();
    });

    // 13. Botão de Compartilhamento Nativo no Celular (navigator.share)
    this.container.querySelectorAll('.btn-action-share-mobile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        const viagem = this.viagens.find(v => v.id === tripId);
        if (viagem) {
          this.compartilharItinerarioMobile(viagem);
        }
      });
    });

    // 14. Gestos de Deslizar nos Cards Mobile (Swipe Actions)
    this.setupMobileSwipeActions();
  }

  /**
   * Configura suporte a gestos de swipe (deslizar) nos cards da visualização mobile
   * - Deslizar para a direita ➔ Dispara WhatsApp
   * - Deslizar para a esquerda ➔ Abre detalhes da viagem
   */
  private setupMobileSwipeActions(): void {
    const cards = this.container.querySelectorAll('.dashboard-mobile-card');
    cards.forEach((cardEl: any) => {
      let touchStartX = 0;
      let touchStartY = 0;
      let currentX = 0;

      cardEl.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        currentX = touchStartX;
        cardEl.style.transition = 'none';
      }, { passive: true });

      cardEl.addEventListener('touchmove', (e: TouchEvent) => {
        currentX = e.touches[0].clientX;
        const deltaX = currentX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;

        // Se for movimento primordialmente horizontal
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 15) {
          cardEl.style.transform = `translateX(${deltaX * 0.35}px)`;
        }
      }, { passive: true });

      cardEl.addEventListener('touchend', () => {
        cardEl.style.transition = 'transform 0.25s ease-out';
        const deltaX = currentX - touchStartX;
        cardEl.style.transform = 'translateX(0px)';

        const tripId = cardEl.getAttribute('data-mobile-trip-id');
        if (!tripId) return;

        if (deltaX > 90) {
          // Swipe Right: Dispara WhatsApp
          const btnWhatsapp = cardEl.querySelector('.btn-action-whatsapp');
          if (btnWhatsapp) btnWhatsapp.click();
        } else if (deltaX < -90) {
          // Swipe Left: Abre detalhes da viagem
          const btnView = cardEl.querySelector('.btn-action-view');
          if (btnView) btnView.click();
        }
      });
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
        // Usuário cancelou ou navegador não concluiu
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
