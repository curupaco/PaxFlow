import Sortable from 'sortablejs';
import { supabase, getSessaoAtual, logoutConsultor } from '../services/supabase';
import { Viagem, Cliente, ProdutoViagem, GlobalSettings, PerfilConsultor } from '../types';
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
  private selectedConferenceFilter: 'todos' | 'nenhuma' | 'financeiro' | 'processo' | 'completo' = 'todos';
  private sortables: Sortable[] = [];
  private buscaTermo: string = '';
  private balcaoResultados: ResultadoBuscaBalcao[] = [];
  private balcaoSearchTimeout: any = null;
  private isFallbackMode: boolean = false;
  private realtimeChannel: any = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private selectedProductId: string | null = null;
  private destAutocomplete: DestinosAutocomplete | null = null;

  // Propriedades para filtros de data e controle de abas de status
  private activeStatusTab: string = 'todos';
  private dataFinStart: string = '';
  private dataFinEnd: string = '';
  private dataIdaStart: string = '';
  private dataIdaEnd: string = '';
  private dataVoltaStart: string = '';
  private dataVoltaEnd: string = '';
  private showFiltersPanel: boolean = false;
  private sortField: string = '';
  private sortDirection: 'asc' | 'desc' = 'asc';
  private viewModeMonth: 'current' | 'all' = (localStorage.getItem('paxflow-view-mode-month') as any) || 'current';

  constructor(container: HTMLElement) {
    this.container = container;
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

      // 4. Buscar viagens
      await this.loadViagens();

      // 5. Configurar atualizações em tempo real
      this.setupRealtime();
      this.setupStorageListener();

      // 6. Renderizar interface completa
      this.render();

      // 7. Configurar Drag & Drop com SortableJS
      this.setupDragAndDrop();

      // 8. Deep linking para abrir viagem específica
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
    if (this.realtimeChannel) return;

    this.realtimeChannel = supabase
      .channel('operational-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viagens' },
        async (payload: any) => {
          console.log('[Dashboard] Realtime update on viagens:', payload.eventType);
          await this.loadViagens();
          this.render();
          this.setupDragAndDrop();
        }
      )
      .subscribe();
  }

  /**
   * Configura ouvinte para sincronização do localStorage de viagens entre abas
   */
  private setupStorageListener(): void {
    if (this.storageListener) return;

    this.storageListener = (e: StorageEvent) => {
      if (e.key === 'paxflow-viagens-local') {
        console.log('[Dashboard] localStorage update detected for viagens. Reloading...');
        if (this.isFallbackMode) {
          this.loadViagensFromLocalStorage();
          this.render();
          this.setupDragAndDrop();
        } else {
          this.loadViagens().then(() => {
            this.render();
            this.setupDragAndDrop();
          });
        }
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  /**
   * Destrutor da página para limpar listeners globais e sortables
   */
  public destroy(): void {
    this.sortables.forEach(s => s.destroy());
    this.sortables = [];
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
        this.settings = {
          ...data,
          id: data.id,
          agencyName: data.agency_name || data.agencyName || 'PaxFlow',
          taxaCancelamentoPadrao: data.taxa_cancelamento_padrao || 0,
          prazoReembolsoDias: data.prazo_reembolso_dias || 3,
          notificacoesAtivas: data.notificacoes_ativas ?? true,
          emailSuporte: data.email_suporte || 'suporte@paxflow.com.br',
          googleRefreshToken: data.google_refresh_token,
          slaPreEmbarqueDias: data.sla_pre_embarque_dias,
          slaPosViagemDias: data.sla_pos_viagem_dias
        };
        if (data.sla_pre_embarque_dias !== undefined) {
          this.slaPreEmbarqueDias = Number(data.sla_pre_embarque_dias);
        }
        if (data.sla_pos_viagem_dias !== undefined) {
          this.slaPosViagemDias = Number(data.sla_pos_viagem_dias);
        }
        if (data.permitir_consultor_criar_viagem !== undefined) {
          this.settings.permitir_consultor_criar_viagem = data.permitir_consultor_criar_viagem;
          this.settings.permitirConsultorCriarViagem = data.permitir_consultor_criar_viagem;
        }
      }
    } catch (err) {
      console.error('Falha ao carregar configurações de SLA:', err);
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

      this.saveViagensToLocalStorage();
    } catch (err: any) {
      this.isFallbackMode = true;
      console.warn('Erro ao carregar viagens do banco. Ativando fallback offline:', err.message);
      this.loadViagensFromLocalStorage();
    }
  }

  private saveViagensToLocalStorage(): void {
    localStorage.setItem('paxflow-viagens-local', JSON.stringify(this.viagens));
  }

  private loadViagensFromLocalStorage(): void {
    const saved = localStorage.getItem('paxflow-viagens-local');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.viagens = parsed || [];
      } catch (e) {
        this.viagens = [];
      }
    } else {
      this.viagens = [];
    }
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

      // 3. Deletar reembolsos vinculados
      const { error: errRefunds } = await supabase
        .from('reembolsos')
        .delete()
        .eq('viagem_id', tripId);
      if (errRefunds) console.warn('Aviso ao excluir reembolsos:', errRefunds.message);

      // 4. Deletar produtos vinculados
      const { error: errProducts } = await supabase
        .from('produtos_viagem')
        .delete()
        .eq('viagem_id', tripId);
      if (errProducts) console.warn('Aviso ao excluir produtos:', errProducts.message);

      // 5. Deletar a viagem em si
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
    if (viagem.status === 'pos_viagem' && viagem.data_volta) {
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

    // 1. Validação de data financeira
    if (!viagem.data_financeiro) {
      this.showToast('Não é possível alterar o status. A Data Financeiro é obrigatória para fases operacionais (como Pós-Venda). Por favor, defina a data abrindo os detalhes da viagem.', 'error');
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
      const saved = localStorage.getItem(`paxflow-produtos-viagem-${tripId}`);
      if (saved) {
        try {
          produtos = JSON.parse(saved);
        } catch (e) {
          produtos = [];
        }
      }
    }

    // 3. Validar saldo pendente (soma dos produtos deve bater com o total da viagem)
    const totalProdutos = produtos.reduce((sum, p) => sum + (Number(p.valor_venda) || 0), 0);
    const valorViagem = Number(viagem.valor_total) || 0;
    const pendente = valorViagem - totalProdutos;

    if (Math.abs(pendente) > 0.01) {
      this.showToast(`Não é possível avançar a viagem. Existe um saldo financeiro pendente de R$ ${pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Adicione produtos na aba "Produtos e Serviços" para zerar este saldo.`, 'error');
      return false;
    }

    // 4. Validar se todos os produtos cadastrados estão detalhados (Tarifa + Taxa + Comissão)
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
      this.showToast(`Não é possível avançar a viagem. O produto "${produtoNaoDetalhado.fornecedor} - ${produtoNaoDetalhado.descricao}" não está com seus valores 100% detalhados (soma de Tarifa + Taxa + Comissão deve ser igual ao Valor de Venda do produto).`, 'error');
      return false;
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
                    [${p.tipo.toUpperCase()}] ${p.fornecedor} - ${p.descricao} (Venda: R$ ${Number(p.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
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
      toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
    }`;
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${translatedMessage}`;

    const duration = isSuccess ? 3500 : 5500;
    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
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
      if (!this.buscaTermo) {
        if (this.perfil?.role !== 'admin') {
          if (v.consultor_id !== this.user?.id && v.consultor_responsavel_id !== this.user?.id) return false;
        }
        if (this.viewModeMonth === 'current' && !this.isCurrentMonthTrip(v)) return false;
      }
      if (this.perfil?.role === 'admin' && this.selectedConsultantId !== 'todos') {
        return v.consultor_id === this.selectedConsultantId;
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
      // Filtro de Consultor e Mês Corrente (se não estiver buscando por texto no Co-Piloto)
      if (!this.buscaTermo) {
        if (this.perfil?.role !== 'admin') {
          if (v.consultor_id !== this.user?.id && v.consultor_responsavel_id !== this.user?.id) return false;
        }
        if (this.viewModeMonth === 'current' && !this.isCurrentMonthTrip(v)) return false;
      } else if (this.perfil?.role === 'admin' && this.selectedConsultantId !== 'todos') {
        if (v.consultor_id !== this.selectedConsultantId) return false;
      }

      // Filtro de Aba de Status ativa
      if (this.activeStatusTab !== 'todos') {
        if (v.status !== this.activeStatusTab) return false;
      }

      // Filtro de Conferência (Apenas para Admins)
      if (this.perfil?.role === 'admin' && this.selectedConferenceFilter !== 'todos') {
        const isFinOk = !!v.isFinanceiroConferido;
        const isProcOk = !!v.isProcessoConferido;

        if (this.selectedConferenceFilter === 'nenhuma') {
          if (isFinOk || isProcOk) return false;
        } else if (this.selectedConferenceFilter === 'financeiro') {
          if (!isFinOk) return false;
        } else if (this.selectedConferenceFilter === 'processo') {
          if (!isProcOk) return false;
        } else if (this.selectedConferenceFilter === 'completo') {
          if (!isFinOk || !isProcOk) return false;
        }
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

      // Filtros de Data Avançados:
      // Data Financeiro
      if (this.dataFinStart) {
        if (!v.data_financeiro || v.data_financeiro < this.dataFinStart) return false;
      }
      if (this.dataFinEnd) {
        if (!v.data_financeiro || v.data_financeiro > this.dataFinEnd) return false;
      }

      // Data Embarque Ida
      if (this.dataIdaStart) {
        if (!v.data_ida || v.data_ida < this.dataIdaStart) return false;
      }
      if (this.dataIdaEnd) {
        if (!v.data_ida || v.data_ida > this.dataIdaEnd) return false;
      }

      // Data Retorno Volta
      if (this.dataVoltaStart) {
        if (!v.data_volta || v.data_volta < this.dataVoltaStart) return false;
      }
      if (this.dataVoltaEnd) {
        if (!v.data_volta || v.data_volta > this.dataVoltaEnd) return false;
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
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 relative z-10 px-4 md:px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors duration-200 w-full">
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

            <!-- Botão de Filtros de Data -->
            <button id="btn-toggle-filtros" class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center gap-1.5 transition shrink-0">
              <span>📅 Data</span>
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
              <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 select-none">Conf.:</span>
                <select id="select-dashboard-conferencia" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[130px]">
                  <option value="todos" ${this.selectedConferenceFilter === 'todos' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Todas</option>
                  <option value="nenhuma" ${this.selectedConferenceFilter === 'nenhuma' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Nenhuma</option>
                  <option value="financeiro" ${this.selectedConferenceFilter === 'financeiro' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Financeiro</option>
                  <option value="processo" ${this.selectedConferenceFilter === 'processo' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Processo</option>
                  <option value="completo" ${this.selectedConferenceFilter === 'completo' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Completo</option>
                </select>
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
        <div id="advanced-filters-panel" class="${this.showFiltersPanel ? 'block' : 'hidden'} bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-4 transition-colors duration-200">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Data Financeiro -->
            <div class="space-y-2">
              <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">📅 Data Financeiro</span>
              <div class="flex items-center gap-2">
                <input id="filter-fin-start" type="date" value="${this.dataFinStart}" class="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span class="text-xs text-slate-400">a</span>
                <input id="filter-fin-end" type="date" value="${this.dataFinEnd}" class="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
            <!-- Embarque Ida -->
            <div class="space-y-2">
              <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">✈️ Data de Embarque (Ida)</span>
              <div class="flex items-center gap-2">
                <input id="filter-ida-start" type="date" value="${this.dataIdaStart}" class="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span class="text-xs text-slate-400">a</span>
                <input id="filter-ida-end" type="date" value="${this.dataIdaEnd}" class="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
            <!-- Embarque Volta -->
            <div class="space-y-2">
              <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">🚐 Data de Retorno (Volta)</span>
              <div class="flex items-center gap-2">
                <input id="filter-volta-start" type="date" value="${this.dataVoltaStart}" class="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span class="text-xs text-slate-400">a</span>
                <input id="filter-volta-end" type="date" value="${this.dataVoltaEnd}" class="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
            <button id="btn-clear-date-filters" class="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition">Limpar Filtros</button>
          </div>
        </div>

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
                      <th class="px-5 py-4">${this.renderSortHeader('Cliente / LOC', 'cliente')}</th>
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

    // Calcular Rentabilidade (Comissão + Markup + RAV * 0.88)
    let rentabilidade = 0;
    if (v.produtos && Array.isArray(v.produtos)) {
      v.produtos.forEach((p: any) => {
        rentabilidade += (Number(p.comissao) || 0) + (Number(p.markup) || 0) + ((Number(p.rav) || 0) * 0.88);
      });
    }
    const valorVenda = Number(v.valor_total) || 0;

    // Calcular PaxFlow Risk Score™
    const risk = RiskScoreService.calculateTripRiskScore(v, v.cliente, v.produtos, this.settings);

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
            ${this.settings?.habilitar_risk_score !== false ? `
              <button class="btn-open-risk-score px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1 border shadow-xs transition transform hover:scale-105 ${risk.badgeClass}" data-trip-id="${v.id}" title="PaxFlow Risk Score™: ${risk.score}/100 (${risk.fraseStatus}) — Clique para abrir o diagnósticos">
                <span>🛡️ ${risk.score}</span>
              </button>
            ` : ''}
          </div>
        </td>

        <!-- Cliente / LOC -->
        <td class="px-5 py-4 min-w-[200px]">
          <div class="font-black text-slate-800 dark:text-slate-100">${v.cliente?.nome || 'Cliente Desconhecido'}</div>
          <div class="flex flex-wrap items-center gap-1.5 mt-1">
            ${v.codigoRef ? `
              <span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 font-mono font-bold text-[9px] rounded tracking-wider border border-indigo-200/40 dark:border-indigo-850 uppercase">
                ${v.codigoRef}
              </span>
            ` : ''}
            <span class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[9px] rounded tracking-wider border border-slate-200/40 dark:border-slate-700/50 uppercase">
              ${v.codigo_localizador || 'S/ LOC'}
            </span>
          </div>
        </td>

        <!-- Destino / Produtos -->
        <td class="px-5 py-4">
          <div class="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            ✈️ ${v.destino}
          </div>
          <!-- Ícones dos Produtos -->
          ${v.produtos && v.produtos.length > 0 ? `
            <div class="flex flex-wrap gap-1 mt-1.5">
              ${(() => {
                const counts: { [tipo: string]: number } = {};
                v.produtos.forEach((p: any) => {
                  const t = (p.tipo || 'outro').toLowerCase();
                  counts[t] = (counts[t] || 0) + 1;
                });
                return Object.entries(counts).map(([tipo, count]) => {
                  const icon = this.getIconForType(tipo);
                  const suffix = count > 1 ? ` +${count - 1}` : '';
                  return `
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider" title="${tipo}">
                      <span>${icon}${suffix}</span>
                    </span>
                  `;
                }).join('');
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
            R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5" title="Margem de Lucro (Venda - Custos de Fornecedor)">
            Rent: R$ ${rentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
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
    if (v.produtos && Array.isArray(v.produtos)) {
      v.produtos.forEach((p: any) => {
        rentabilidade += (Number(p.comissao) || 0) + (Number(p.markup) || 0) + ((Number(p.rav) || 0) * 0.88);
      });
    }
    const valorVenda = Number(v.valor_total) || 0;

    // Calcular PaxFlow Risk Score™
    const risk = RiskScoreService.calculateTripRiskScore(v, v.cliente, v.produtos, this.settings);

    return `
      <div class="${cardBg} border border-slate-200/60 dark:border-slate-800 border-l-4 ${cardBorder} rounded-2xl p-5 shadow-sm space-y-4">
        <!-- Header: SLA + Risk Score + Cliente + LOC -->
        <div class="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="space-y-1">
            <div class="font-black text-sm text-slate-800 dark:text-slate-100">${v.cliente?.nome || 'Cliente Desconhecido'}</div>
            <div class="flex flex-wrap items-center gap-1.5">
              ${v.codigoRef ? `
                <span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 font-mono font-bold text-[9px] rounded tracking-wider border border-indigo-200/40 dark:border-indigo-850 uppercase">
                  REF: ${v.codigoRef}
                </span>
              ` : ''}
              <span class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[9px] rounded tracking-wider border border-slate-200/40 dark:border-slate-700/50 uppercase">
                LOC: ${v.codigo_localizador || 'S/ LOC'}
              </span>
              ${this.perfil?.role === 'admin' ? `
                <span class="text-[9px] text-slate-400 font-bold bg-slate-100/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200/20 dark:border-slate-700/20">
                  👤 ${v.consultor_id === this.user.id ? 'Você' : (this.consultores.find(c => c.id === v.consultor_id)?.nome?.split(' ')[0] || 'Outro')}
                </span>
              ` : ''}
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${this.settings?.habilitar_risk_score !== false ? `
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
              ✈️ ${v.destino}
            </div>
            <!-- Ícones dos Produtos -->
            ${v.produtos && v.produtos.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-1">
                ${(() => {
                  const counts: { [tipo: string]: number } = {};
                  v.produtos.forEach((p: any) => {
                    const t = (p.tipo || 'outro').toLowerCase();
                    counts[t] = (counts[t] || 0) + 1;
                  });
                  return Object.entries(counts).map(([tipo, count]) => {
                    const icon = this.getIconForType(tipo);
                    const suffix = count > 1 ? ` +${count - 1}` : '';
                    return `
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider" title="${tipo}">
                        <span>${icon}${suffix}</span>
                      </span>
                    `;
                  }).join('');
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
            <span class="font-black text-indigo-600 dark:text-indigo-400 text-sm">R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="text-right">
            <span class="block text-[8px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Rentabilidade</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">R$ ${rentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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

    // 2. Botão de Toggle Filtros de Data
    document.getElementById('btn-toggle-filtros')?.addEventListener('click', () => {
      this.showFiltersPanel = !this.showFiltersPanel;
      this.render();
    });

    // 3. Ouvintes para inputs de Filtro de Data
    const bindDateFilter = (elementId: string, propertyName: string) => {
      const el = document.getElementById(elementId) as HTMLInputElement;
      el?.addEventListener('change', () => {
        (this as any)[propertyName] = el.value;
        this.render();
      });
    };

    bindDateFilter('filter-fin-start', 'dataFinStart');
    bindDateFilter('filter-fin-end', 'dataFinEnd');
    bindDateFilter('filter-ida-start', 'dataIdaStart');
    bindDateFilter('filter-ida-end', 'dataIdaEnd');
    bindDateFilter('filter-volta-start', 'dataVoltaStart');
    bindDateFilter('filter-volta-end', 'dataVoltaEnd');

    // 4. Botão de Limpar Filtros de Data
    document.getElementById('btn-clear-date-filters')?.addEventListener('click', () => {
      this.dataFinStart = '';
      this.dataFinEnd = '';
      this.dataIdaStart = '';
      this.dataIdaEnd = '';
      this.dataVoltaStart = '';
      this.dataVoltaEnd = '';
      this.render();
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

    const selectConferencia = document.getElementById('select-dashboard-conferencia') as HTMLSelectElement;
    selectConferencia?.addEventListener('change', () => {
      this.selectedConferenceFilter = selectConferencia.value as any;
      this.render();
    });

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
