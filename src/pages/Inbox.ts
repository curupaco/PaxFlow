import { supabase, getSessaoAtual, logoutConsultor } from '../services/supabase';
import { PerfilConsultor, Lembrete, Orcamento, Cliente, AlertItem, BancoFolgasItem, EventoEscalaItem, SolicitacaoEscala, FeriadoPlantaoInfo } from '../types';
import { getAvatarSvg } from '../services/avatars';
import { showCustomConfirm, showCustomAlert } from '../services/dialog';
import { InboxService } from '../services/inboxService';
import { EscalaService, TURNO_PRESETS, isSameConsultantName } from '../services/escalaService';
import { EmailReaderModal } from '../components/inbox/EmailReaderModal';
import { NewMessageModal } from '../components/inbox/NewMessageModal';
import { EscalaView } from '../components/inbox/EscalaView';
import { CalendarView } from '../components/inbox/CalendarView';
import { AlertsFeed } from '../components/inbox/AlertsFeed';
import { formatarDataBR } from '../utils/messageFormatter';
import './Inbox.css';


export class InboxPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private alerts: AlertItem[] = [];
  private filteredAlerts: AlertItem[] = [];
  
  // App state
  private activeTab: 'ativos' | 'arquivados' | 'todos' | 'enviadas' | 'escala' | 'decisoes' = 'ativos';
  private selectedConsultantFilter: string = 'todos';
  private categoryFilter: string = 'todos';
  private onlyUnreadFilter: boolean = false;
  private selectedAlertIds: Set<string> = new Set();
  private readList: string[] = [];
  private searchQuery: string = '';
  private consultants: PerfilConsultor[] = [];
  private allConsultants: PerfilConsultor[] = [];

  // Módulos especializados
  private escalaView: EscalaView;
  private calendarView: CalendarView;
  private alertsFeed: AlertsFeed;

  // Visualização ativa
  private currentView: 'list' | 'calendar' = 'list';
  
  // Global settings
  private prazoReembolsoDias: number = 3;

  constructor(container: HTMLElement) {
    this.container = container;
    this.escalaView = new EscalaView({
      container: this.container,
      perfil: this.perfil,
      user: this.user,
      consultants: this.consultants,
      allConsultants: this.allConsultants,
      showToast: (msg, type, err) => this.showToast(msg, type, err),
      onDataChanged: async () => {
        await this.loadAndBuildAlerts();
      },
      onStateUpdate: () => {
        this.render();
        this.setupEventListeners();
      }
    });
    this.calendarView = new CalendarView({
      container: this.container,
      alerts: this.alerts,
      filteredAlerts: this.filteredAlerts,
      onAlertClick: (alertItem) => {
        this.markAlertAsRead(alertItem.id);
        this.openEmailReaderModal(alertItem);
      },
      onStateUpdate: () => {
        this.render();
        this.setupEventListeners();
      }
    });
    this.alertsFeed = new AlertsFeed({
      container: this.container,
      filteredAlerts: this.filteredAlerts,
      readList: this.readList,
      selectedAlertIds: this.selectedAlertIds,
      perfil: this.perfil,
      onAlertClick: (alertItem) => {
        this.markAlertAsRead(alertItem.id);
        this.openEmailReaderModal(alertItem);
      },
      onQuickArchive: async (alertItem) => {
        await this.handleQuickArchive(alertItem);
      },
      onSelectAll: (checked) => {
        if (checked) {
          this.filteredAlerts.forEach(a => this.selectedAlertIds.add(a.id));
        } else {
          this.selectedAlertIds.clear();
        }
        this.render();
        this.setupEventListeners();
      },
      onSelectItem: (alertId, checked) => {
        if (checked) {
          this.selectedAlertIds.add(alertId);
        } else {
          this.selectedAlertIds.delete(alertId);
        }
        this.render();
        this.setupEventListeners();
      },
      onBulkRead: async () => {
        if (!this.user?.id) return;
        const ids = Array.from(this.selectedAlertIds);
        await InboxService.markAllAlertsAsRead(this.user.id, ids);
        this.selectedAlertIds.clear();
        this.readList = await InboxService.getReadAlerts(this.user.id);
        this.showToast(`${ids.length} mensagem(ns) marcada(s) como lida(s).`, 'success');
        this.render();
        this.setupEventListeners();
      },
      onBulkUnread: async () => {
        if (!this.user?.id) return;
        const ids = Array.from(this.selectedAlertIds);
        for (const id of ids) {
          await InboxService.markAlertAsUnread(this.user.id, id);
        }
        this.selectedAlertIds.clear();
        this.readList = await InboxService.getReadAlerts(this.user.id);
        this.showToast(`${ids.length} mensagem(ns) marcada(s) como não lida(s).`, 'success');
        this.render();
        this.setupEventListeners();
      },
      onBulkArchive: async () => {
        const ids = Array.from(this.selectedAlertIds);
        for (const id of ids) {
          const alert = this.filteredAlerts.find(a => a.id === id) || this.alerts.find(a => a.id === id);
          if (alert) {
            await InboxService.archiveAlert(alert, true);
          }
        }
        this.selectedAlertIds.clear();
        this.showToast(`${ids.length} mensagem(ns) arquivada(s).`, 'success');
        await this.loadAndBuildAlerts();
        this.render();
        this.setupEventListeners();
      },
      onMarkAllRead: async () => {
        await this.markAllAlertsAsRead();
      },
      onEscalaAdminAction: async (solId, action, btn) => {
        await this.handleEscalaAdminAction(solId, action, btn);
      },
      onEscalaColleagueAction: async (solId, action, isProposta, btn) => {
        await this.handleEscalaColleagueAction(solId, action, isProposta, btn);
      },
      onVerNaEscala: (solId) => {
        this.activeTab = 'escala';
        this.render();
        this.setupEventListeners();
        if (solId) {
          this.abrirModalSolicitacaoPorId(solId);
        }
      }
    });
  }

  /**
   * Initializes the Inbox Cockpit page
   */
  public async init(extraId?: string): Promise<void> {
    try {
      // 1. Fetch current session and user profile
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }
      this.user = user;
      this.perfil = perfil;
      if (this.perfil?.id) {
        this.selectedConsultantFilter = this.perfil.id;
      }

      // 2. Fetch global settings for refund SLAs
      await this.loadGlobalSettings();

      // 3. Fetch active consultants list
      await this.loadConsultants();
      this.escalaView.updateContext(this.perfil, this.user, this.consultants, this.allConsultants, this.container);

      // 4. Fetch all reminders and build unified alert list
      await this.loadAndBuildAlerts();

      // 5. Load Escala data
      await this.loadEscalaData();

      // 6. Configura sincronização em tempo real (Realtime)
      this.setupRealtime();

      // 7. Render Page UI and attach action listeners
      this.render();
      this.setupEventListeners();
      this.setupGlobalEventListeners();

      // 8. Se um ID de mensagem/alerta foi informado via notificação Push (deep link), abre o modal imediatamente
      if (extraId) {
        const cleanId = extraId.trim();
        const targetAlert = this.alerts.find(a => 
          a.id === cleanId || 
          a.id.includes(cleanId) || 
          cleanId.includes(a.id) ||
          a.targetId === cleanId
        );
        if (targetAlert) {
          this.markAlertAsRead(targetAlert.id);
          this.openEmailReaderModal(targetAlert);
        } else if (this.alerts.length > 0) {
          // Fallback: abre a notificação mais recente do topo da lista
          const firstMsg = this.alerts.find(a => a.type === 'direct_message' || a.type === 'mention') || this.alerts[0];
          if (firstMsg) {
            this.markAlertAsRead(firstMsg.id);
            this.openEmailReaderModal(firstMsg);
          }
        }
      }

    } catch (err: any) {
      console.error('Erro na inicialização da Caixa de Alertas:', err);
      this.renderAuthError(`Erro interno ao carregar Inbox: ${err.message}`);
    }
  }

  /**
   * Loads scale schedule data, leave bank balances, and events
   */
  private async loadEscalaData(): Promise<void> {
    await this.escalaView.loadEscalaData();
  }

  private realtimeChannel: any = null;
  private localSyncChannel: BroadcastChannel | null = null;

  /**
   * Configura ouvinte em tempo real para sincronização entre usuários
   */
  private setupRealtime(): void {
    try {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }

      if (!this.localSyncChannel && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.localSyncChannel = new BroadcastChannel('paxflow_escala_sync');
        this.localSyncChannel.onmessage = async () => {
          await this.loadEscalaData();
          this.render();
          this.setupEventListeners();
        };
      }

      const channelName = `inbox-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.realtimeChannel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes' }, async () => {
          await this.loadAndBuildAlerts();
          this.render();
          this.setupEventListeners();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_diretas' }, async () => {
          await this.loadAndBuildAlerts();
          this.render();
          this.setupEventListeners();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comentarios' }, async () => {
          await this.loadAndBuildAlerts();
          this.render();
          this.setupEventListeners();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lembretes' }, async () => {
          await this.loadAndBuildAlerts();
          this.render();
          this.setupEventListeners();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'escala_banco_folgas' }, async () => {
          await this.loadEscalaData();
          this.render();
          this.setupEventListeners();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'escala_eventos' }, async () => {
          await this.loadEscalaData();
          this.render();
          this.setupEventListeners();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'escala_solicitacoes' }, async () => {
          await this.loadAndBuildAlerts();
          await this.loadEscalaData();
          this.render();
          this.setupEventListeners();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'escala_diaria' }, async () => {
          await this.loadEscalaData();
          this.render();
          this.setupEventListeners();
        })
        .subscribe();
    } catch (err) {
      console.warn('Erro ao configurar realtime no inbox:', err);
    }
  }

  /**
   * Destroy page elements if necessary
   */
  public destroy(): void {
    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {}
      this.realtimeChannel = null;
    }
    if (this.localSyncChannel) {
      try {
        this.localSyncChannel.close();
      } catch (e) {}
      this.localSyncChannel = null;
    }
  }

  /**
   * Loads global settings for SLA configurations
   */
  private async loadGlobalSettings(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        this.prazoReembolsoDias = data.prazo_reembolso_dias || 3;
      }
    } catch (err) {
      console.warn('Erro ao buscar global_settings, usando SLA padrão:', err);
    }
  }

  /**
   * Loads list of active consultants (Admin only)
   */
  private async loadConsultants(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      this.allConsultants = data || [];
      this.consultants = (data || []).filter(c => c.ativo !== false);
    } catch (err) {
      console.error('Erro ao carregar consultores para filtro:', err);
    }
  }

  /**
   * Fetches data and compiles alert items (manual & SLAs)
   */
  private async loadAndBuildAlerts(): Promise<void> {
    try {
      this.alerts = await InboxService.loadAndBuildAlerts(this.user, this.perfil, this.prazoReembolsoDias);
      if (this.user?.id) {
        this.readList = await InboxService.getReadAlerts(this.user.id);
      }
    } catch (err) {
      console.error('Erro ao compilar alertas no serviço:', err);
    }
    this.applyFilters();
    window.dispatchEvent(new CustomEvent('paxflow-inbox-updated'));
  }

  /**
   * Applies the current active filters, search queries, category filters, and consultant filters
   */
  private applyFilters(): void {
    let result = [...this.alerts];

    // 1. Filter by Active / Archived / All / Sent / Escala / Decisões
    if (this.activeTab === 'ativos') {
      result = result.filter(a => !a.arquivado && !a.isSent && !a.isDecision);
    } else if (this.activeTab === 'arquivados') {
      result = result.filter(a => a.arquivado);
    } else if (this.activeTab === 'enviadas') {
      result = result.filter(a => a.isSent && !a.isDecision);
    } else if (this.activeTab === 'decisoes') {
      result = result.filter(a => a.isDecision || (a.type === 'escala_solicitacao' && a.isSent));
    } else if (this.activeTab === 'todos') {
      result = result.filter(a => true);
    } else if (this.activeTab === 'escala') {
      result = result.filter(a => a.type === 'escala_solicitacao' && !a.arquivado);
    }

    const isUserAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
    const isViewingOwnProfile = isUserAdmin && Boolean(this.perfil?.id) && this.selectedConsultantFilter === this.perfil?.id;

    // 2. Filter by Consultant (Admin dropdown)
    if (isUserAdmin && this.selectedConsultantFilter !== 'todos') {
      const filterId = this.selectedConsultantFilter;
      result = result.filter(a => {
        if (a.isSent) {
          return a.consultorId === filterId || a.senderId === filterId;
        }
        return (
          a.consultorId === filterId ||
          (a.type === 'manual' && a.criadorId === filterId) ||
          (isViewingOwnProfile && a.type === 'escala_solicitacao')
        );
      });
    }

    // 2.5 Filter by Category (Summary Cards & Mobile Pills)
    if (this.categoryFilter !== 'todos') {
      if (this.categoryFilter === 'alertas') {
        result = result.filter(a => a.type === 'passport' || a.type === 'refund' || a.type === 'pre-embarque' || a.type === 'pos-viagem-nps' || a.type === 'campaign_notification' || a.type === 'atendimento_balcao' || (isUserAdmin && a.type === 'escala_solicitacao' && !a.isSent));
      } else if (this.categoryFilter === 'depois') {
        result = result.filter(a => a.type === 'manual');
      } else if (this.categoryFilter === 'passaporte') {
        result = result.filter(a => a.type === 'passport');
      } else if (this.categoryFilter === 'refund') {
        result = result.filter(a => a.type === 'refund');
      } else if (this.categoryFilter === 'direct_message') {
        result = result.filter(a => a.type === 'direct_message');
      } else if (this.categoryFilter === 'escala') {
        result = result.filter(a => a.type === 'escala_solicitacao');
      } else if (this.categoryFilter === 'mention') {
        result = result.filter(a => a.type === 'mention' || a.type === 'atendimento_balcao');
      }
    }

    // 3. Search query filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(a => 
        (a.title?.toLowerCase() || '').includes(q) ||
        (a.sender?.toLowerCase() || '').includes(q) ||
        (a.subject?.toLowerCase() || '').includes(q) ||
        (a.body?.toLowerCase() || '').includes(q) ||
        (a.eventDate?.toLowerCase() || '').includes(q) ||
        (a.dateStr?.toLowerCase() || '').includes(q) ||
        (a.consultorNome?.toLowerCase() || '').includes(q) ||
        (a.periodText?.toLowerCase() || '').includes(q)
      );
    }

    // 3.5. Filtro de apenas não lidas
    if (this.onlyUnreadFilter) {
      result = result.filter(a => !this.readList.includes(a.id));
    }

    // Sort by creation date descending
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    this.filteredAlerts = result;
    this.calendarView?.updateAlerts(this.alerts, this.filteredAlerts, this.container);
    this.alertsFeed?.updateState(this.filteredAlerts, this.readList, this.selectedAlertIds, this.perfil, this.container);
  }

  /**
   * Marks a specific alert ID as read
   */
  private async markAlertAsRead(id: string): Promise<void> {
    if (!this.user?.id) return;
    await InboxService.markAlertAsRead(this.user.id, id);
    this.readList = await InboxService.getReadAlerts(this.user.id);
    this.applyFilters();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Marks a specific alert ID as unread
   */
  private async markAlertAsUnread(id: string): Promise<void> {
    if (!this.user?.id) return;
    await InboxService.markAlertAsUnread(this.user.id, id);
    this.readList = await InboxService.getReadAlerts(this.user.id);
    this.showToast('Mensagem marcada como não lida.', 'success');
    this.render();
    this.setupEventListeners();
  }

  /**
   * Marks all currently displayed alerts as read
   */
  private async markAllAlertsAsRead(): Promise<void> {
    if (!this.user?.id) return;
    const idsToMark = this.filteredAlerts.map(a => a.id);
    await InboxService.markAllAlertsAsRead(this.user.id, idsToMark);
    this.readList = await InboxService.getReadAlerts(this.user.id);
    this.showToast('Todas as mensagens exibidas foram marcadas como lidas.', 'success');
    this.render();
    this.setupEventListeners();
  }

  /**
   * Executa arquivamento/desarquivamento rápido de um alerta
   */
  private async handleQuickArchive(alertItem: AlertItem): Promise<void> {
    try {
      const shouldArchive = !alertItem.arquivado;
      await InboxService.archiveAlert(alertItem, shouldArchive);

      await this.loadAndBuildAlerts();
      this.render();
      this.setupEventListeners();
      this.showToast(shouldArchive ? 'Mensagem arquivada com sucesso!' : 'Mensagem restaurada!', 'success');
    } catch (err: any) {
      console.error('Erro ao atualizar mensagem:', err);
      this.showToast('Erro ao atualizar mensagem.', 'error', err);
    }
  }

  /**
   * Aprova ou recusa solicitação de escala diretamente a partir do feed (Ação do Admin)
   */
  private async handleEscalaAdminAction(solId: string, action: 'aprovado' | 'recusado', btn: HTMLButtonElement): Promise<void> {
    try {
      btn.disabled = true;
      btn.textContent = action === 'aprovado' ? 'Aprovando...' : 'Recusando...';
      const adminName = this.perfil?.nome || 'Admin';
      const motivo = action === 'aprovado' ? 'Aprovado via Caixa de Entrada' : 'Recusado pela Gestão via Caixa de Entrada';
      const res = await EscalaService.atualizarStatusSolicitacao(solId, action, motivo, adminName);
      if (this.user?.id) {
        await InboxService.markAllAlertsAsRead(this.user.id, [
          `escala-sol-${solId}-inbox`,
          `escala-sol-${solId}-sent`,
          `escala-sol-${solId}-decisao`
        ]);
      }
      if (res.success) {
        this.showToast(action === 'aprovado' ? '✅ Solicitação APROVADA com sucesso! Escala atualizada no banco.' : '❌ Solicitação RECUSADA.', action === 'aprovado' ? 'success' : 'error');
      } else if (res.alreadyProcessed) {
        this.showToast(`⚠️ Esta solicitação já foi respondida anteriormente por ${res.respondidoPor || 'outro Administrador'}.`, 'error');
      } else {
        this.showToast('⚠️ Não foi possível atualizar o status no banco de dados.', 'error');
      }
      await this.loadAndBuildAlerts();
      await this.loadEscalaData();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      this.showToast(err.message || 'Erro ao processar solicitação.', 'error');
    }
  }

  /**
   * Responde aceite/recusa de colegas ou propostas diretamente a partir do feed
   */
  private async handleEscalaColleagueAction(solId: string, action: 'aceitar' | 'recusar', isProposta: boolean, btn: HTMLButtonElement): Promise<void> {
    try {
      btn.disabled = true;
      let nextStatus: 'aprovado' | 'pendente_admin' | 'recusado';
      let obs: string;
      if (action === 'aceitar') {
        nextStatus = isProposta ? 'aprovado' : 'pendente_admin';
        obs = isProposta ? 'Aceito pelo consultor' : 'Aceito pelo colega, encaminhado à gestão';
      } else {
        nextStatus = 'recusado';
        obs = isProposta ? 'Proposta da gestão recusada pelo consultor' : 'Recusado pelo colega';
      }
      const res = await EscalaService.atualizarStatusSolicitacao(solId, nextStatus, obs);
      if (res.success) {
        if (action === 'aceitar') {
          this.showToast(isProposta ? '✅ Proposta aceita! Escala atualizada.' : '✅ Troca aceita! Encaminhada à gestão.', 'success');
        } else {
          this.showToast('❌ Solicitação recusada.', 'error');
        }
      }
      await this.loadAndBuildAlerts();
      await this.loadEscalaData();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      this.showToast(err.message || 'Erro ao responder solicitação.', 'error');
    }
  }

  /**
   * Triggers the load loading placeholder
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
        <p class="text-slate-500 dark:text-slate-400 font-semibold animate-pulse text-sm">Acessando Caixa de Entrada e analisando SLAs...</p>
      </div>
    `;
  }

  /**
   * Triggers authentication failure block
   */
  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl text-center">
          <div class="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Erro de Acesso</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm mb-6">${msg}</p>
        </div>
      </div>
    `;
  }

   private render(): void {
    // 1. Calculate counters for badges
    let baseAlertsForCounters = [...this.alerts];
    const isUserAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
    const isViewingOwnProfile = isUserAdmin && Boolean(this.perfil?.id) && this.selectedConsultantFilter === this.perfil?.id;

    if (isUserAdmin && this.selectedConsultantFilter !== 'todos') {
      const filterId = this.selectedConsultantFilter;
      baseAlertsForCounters = baseAlertsForCounters.filter(a => {
        if (a.isSent) {
          return a.consultorId === filterId || a.senderId === filterId;
        }
        return (
          a.consultorId === filterId ||
          (a.type === 'manual' && a.criadorId === filterId) ||
          (isViewingOwnProfile && a.type === 'escala_solicitacao')
        );
      });
    }

    const readList = this.readList;

    // Filter subsets for totals and unread counts
    const activeAlerts = baseAlertsForCounters.filter(a => !a.arquivado && !a.isSent && !a.isDecision);
    const totalAtivos = activeAlerts.length;
    const unreadAtivos = activeAlerts.filter(a => !readList.includes(a.id)).length;

    const manualAlerts = activeAlerts.filter(a => a.type === 'manual');
    const totalManual = manualAlerts.length;
    const unreadManual = manualAlerts.filter(a => !readList.includes(a.id)).length;

    const passportAlerts = activeAlerts.filter(a => a.type === 'passport');
    const totalPassport = passportAlerts.length;
    const unreadPassport = passportAlerts.filter(a => !readList.includes(a.id)).length;

    const refundAlerts = activeAlerts.filter(a => a.type === 'refund');
    const totalRefund = refundAlerts.length;
    const unreadRefund = refundAlerts.filter(a => !readList.includes(a.id)).length;

    const sentAlerts = baseAlertsForCounters.filter(a => a.isSent && !a.isDecision);
    const totalEnviadas = sentAlerts.length;

    const decisionAlerts = baseAlertsForCounters.filter(a => a.isDecision || (a.type === 'escala_solicitacao' && a.isSent));
    const totalDecisoes = decisionAlerts.length;

    const archivedAlerts = baseAlertsForCounters.filter(a => a.arquivado);
    const totalArquivados = archivedAlerts.length;
    const unreadArquivados = archivedAlerts.filter(a => !a.isSent && !a.isDecision && !readList.includes(a.id)).length;

    const allInboxAlerts = baseAlertsForCounters.filter(a => true);
    const totalGeral = allInboxAlerts.length;
    const unreadGeral = allInboxAlerts.filter(a => !a.isSent && !a.isDecision && !readList.includes(a.id)).length;

    // 2. Build the main page container markup
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <!-- Header Section -->
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 relative z-10 px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3.5">
            <div class="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl md:hidden">
              <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Inbox</h1>
              <p class="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Mensagens e Alertas</p>
            </div>
          </div>

           <div class="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
             <!-- Barra de Abas de Topo (Alternador Mensagens vs Escala) -->
             <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shrink-0 max-w-full overflow-x-auto custom-scrollbar">
               <button id="inbox-top-tab-mensagens" class="px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 select-none whitespace-nowrap shrink-0 ${
                 this.activeTab !== 'escala'
                   ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                   : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
               }">
                 <span>📨 Mensagens & Alertas</span>
                 <span class="px-2 py-0.5 rounded-md text-[10px] font-black ${
                   this.activeTab !== 'escala' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                 }">${unreadAtivos > 0 ? `${unreadAtivos} / ${totalAtivos}` : `${totalAtivos}`}</span>
               </button>

               <button id="inbox-top-tab-escala" class="px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 select-none whitespace-nowrap shrink-0 ${
                 this.activeTab === 'escala'
                   ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20'
                   : 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200/40 dark:border-violet-800/40'
               }">
                 <span>📅 Escala de Funcionários</span>
               </button>
             </div>

            <!-- Seletor de Consultores (Apenas para Admins) -->
            ${this.perfil?.role === 'admin' ? `
              <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 select-none">Equipe:</span>
                <select id="admin-consultant-select" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-400 focus:outline-none cursor-pointer max-w-[150px]">
                  <option value="todos" ${this.selectedConsultantFilter === 'todos' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Todos os Consultores</option>
                  ${this.consultants.map(c => `<option value="${c.id}" ${this.selectedConsultantFilter === c.id ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${c.nome}</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>
        </header>

        <!-- Main Dashboard Cockpit Content -->
        <main class="flex-grow p-4 md:p-6 max-w-7xl w-full mx-auto space-y-4 md:space-y-6">
          
          <!-- Mobile View: Compact 1-line Horizontal Pill Bar (Hidden on desktop) -->
          <div class="block md:hidden overflow-x-auto pb-1 custom-scrollbar">
            <div class="flex items-center gap-2">
              <button data-filter-category="todos" class="px-3 py-2 rounded-xl ${this.categoryFilter === 'todos' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold'} shrink-0 text-xs select-none flex items-center gap-1.5">
                <span>📋 Entrada</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-black ${this.categoryFilter === 'todos' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'}">
                  ${unreadAtivos > 0 ? `${unreadAtivos}/${totalAtivos}` : `${totalAtivos}`}
                </span>
              </button>
              <button data-filter-category="depois" class="px-3 py-2 rounded-xl ${this.categoryFilter === 'depois' ? 'bg-slate-700 text-white font-black' : 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200'} border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2 shrink-0 text-xs font-bold cursor-pointer">
                <span>📌 Depois:</span>
                <span class="px-2 py-0.5 rounded-md ${unreadManual > 0 ? 'bg-rose-600 text-white' : 'bg-slate-700 dark:bg-slate-600 text-white'} font-black text-[11px]">
                  ${unreadManual > 0 ? `${unreadManual}/${totalManual}` : `${totalManual}`}
                </span>
              </button>
              <button data-filter-category="passaporte" class="px-3 py-2 rounded-xl ${this.categoryFilter === 'passaporte' ? 'bg-amber-600 text-white font-black' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'} border border-amber-100/50 dark:border-amber-900/40 flex items-center gap-2 shrink-0 text-xs font-bold cursor-pointer">
                <span>🛂 Passaportes:</span>
                <span class="px-2 py-0.5 rounded-md ${unreadPassport > 0 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'} font-black text-[11px]">
                  ${unreadPassport > 0 ? `${unreadPassport}/${totalPassport}` : `${totalPassport}`}
                </span>
              </button>
              <button data-filter-category="refund" class="px-3 py-2 rounded-xl ${this.categoryFilter === 'refund' ? 'bg-rose-600 text-white font-black' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'} border border-rose-100/50 dark:border-rose-900/40 flex items-center gap-2 shrink-0 text-xs font-bold cursor-pointer">
                <span>💰 Reembolsos:</span>
                <span class="px-2 py-0.5 rounded-md ${unreadRefund > 0 ? 'bg-rose-600 text-white' : 'bg-rose-600 text-white'} font-black text-[11px]">
                  ${unreadRefund > 0 ? `${unreadRefund}/${totalRefund}` : `${totalRefund}`}
                </span>
              </button>
            </div>
          </div>

          <!-- Desktop View: Glass Stats Summary Row (Hidden on mobile) -->
          <div class="hidden md:grid md:grid-cols-4 gap-4">
            
            <div data-filter-category="todos" class="inbox-glass p-5 rounded-2xl shadow-sm flex items-center justify-between border ${this.categoryFilter === 'todos' ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-white/60 dark:border-slate-900/60'} cursor-pointer hover:shadow-md transition">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Entrada (Todas)</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${totalAtivos}</span>
                  ${unreadAtivos > 0 
                    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">${unreadAtivos} não lida(s)</span>`
                    : `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">✓ 0 não lidas</span>`
                  }
                </div>
              </div>
              <div class="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
            </div>

            <div data-filter-category="depois" class="inbox-glass p-5 rounded-2xl shadow-sm flex items-center justify-between border ${this.categoryFilter === 'depois' ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-white/60 dark:border-slate-900/60'} cursor-pointer hover:shadow-md transition">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Agendados "Depois"</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${totalManual}</span>
                  ${unreadManual > 0 
                    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">${unreadManual} não lida(s)</span>`
                    : `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500">✓ 0 não lidas</span>`
                  }
                </div>
              </div>
              <div class="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              </div>
            </div>

            <div data-filter-category="passaporte" class="inbox-glass p-5 rounded-2xl shadow-sm flex items-center justify-between border ${this.categoryFilter === 'passaporte' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20 dark:bg-amber-950/20' : 'border-white/60 dark:border-slate-900/60'} cursor-pointer hover:shadow-md transition">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Passaportes SLA</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${totalPassport}</span>
                  ${unreadPassport > 0 
                    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">${unreadPassport} não lida(s)</span>`
                    : `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500">✓ 0 não lidas</span>`
                  }
                </div>
              </div>
              <div class="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
              </div>
            </div>

            <div data-filter-category="refund" class="inbox-glass p-5 rounded-2xl shadow-sm flex items-center justify-between border ${this.categoryFilter === 'refund' ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/20 dark:bg-rose-950/20' : 'border-white/60 dark:border-slate-900/60'} cursor-pointer hover:shadow-md transition">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Reembolsos SLA</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${totalRefund}</span>
                  ${unreadRefund > 0 
                    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">${unreadRefund} não lida(s)</span>`
                    : `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500">✓ 0 não lidas</span>`
                  }
                </div>
              </div>
              <div class="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
            </div>

          </div>

          <!-- Mail Workspace Container -->
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            <!-- Left Workspace sidebar (Filter Panel) -->
            <div class="hidden lg:block lg:col-span-1 space-y-4">

              <!-- Action compose button -->
              <button id="btn-nova-mensagem" class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 mb-2 select-none">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                NOVA MENSAGEM
              </button>
              
              <!-- Folders glass card -->
              <div class="inbox-glass p-4 rounded-2xl shadow-sm space-y-2">
                <h3 class="px-2 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-3">Pastas</h3>
                
                <button id="folder-ativos" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'ativos' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5 min-w-0 flex-1 truncate text-left">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span class="truncate">Caixa de Entrada</span>
                  </span>
                  <div class="flex items-center gap-1 shrink-0 ml-2">
                    ${unreadAtivos > 0 ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white animate-pulse whitespace-nowrap inline-flex items-center shrink-0">🔴 ${unreadAtivos}</span>` : ''}
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 whitespace-nowrap inline-flex items-center shrink-0">${totalAtivos}</span>
                  </div>
                </button>

                <button id="folder-enviadas" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'enviadas' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5 min-w-0 flex-1 truncate text-left">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span class="truncate">Enviadas</span>
                  </span>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap inline-flex items-center shrink-0 ml-2">${totalEnviadas}</span>
                </button>

                <button id="folder-decisoes" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'decisoes' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5 min-w-0 flex-1 truncate text-left">
                    <svg class="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="truncate">Decisões</span>
                  </span>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap inline-flex items-center shrink-0 ml-2">${totalDecisoes}</span>
                </button>

                <button id="folder-arquivados" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'arquivados' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5 min-w-0 flex-1 truncate text-left">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                      <polyline points="21 8 21 21 3 21 3 8"></polyline>
                      <rect x="1" y="3" width="22" height="5"></rect>
                      <line x1="10" y1="12" x2="14" y2="12"></line>
                    </svg>
                    <span class="truncate">Arquivados</span>
                  </span>
                  <div class="flex items-center gap-1 shrink-0 ml-2">
                    ${unreadArquivados > 0 ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap inline-flex items-center shrink-0" title="${unreadArquivados} não lido(s)">${unreadArquivados}</span>` : ''}
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap inline-flex items-center shrink-0">${totalArquivados}</span>
                  </div>
                </button>

                <button id="folder-todos" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'todos' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5 min-w-0 flex-1 truncate text-left">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    <span class="truncate">Todas</span>
                  </span>
                  <div class="flex items-center gap-1 shrink-0 ml-2">
                    ${unreadGeral > 0 ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap inline-flex items-center shrink-0" title="${unreadGeral} não lido(s)">${unreadGeral}</span>` : ''}
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap inline-flex items-center shrink-0">${totalGeral}</span>
                  </div>
                </button>

              </div>

            </div>

            <!-- Middle Workspace panel (Mail List Client / Calendar) -->
            <div class="lg:col-span-3 space-y-4">

              <!-- Mobile Folders Bar (Visible only on mobile/tablet) -->
              <div class="lg:hidden flex flex-col sm:flex-row gap-3">
                <button id="btn-nova-mensagem-mobile" class="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 select-none uppercase shrink-0 w-full sm:w-auto">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  NOVA MENSAGEM
                </button>
                
                <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar w-full">
                  <button id="mobile-folder-ativos" class="px-4 py-2.5 bg-white dark:bg-slate-900 border ${
                    this.activeTab === 'ativos' 
                      ? 'border-indigo-600/50 text-indigo-600 bg-indigo-600/5 dark:border-indigo-500/50 dark:text-indigo-400 dark:bg-indigo-500/10' 
                      : 'border-slate-200/60 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  } rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none">
                    📥 Entrada (${totalAtivos}${unreadAtivos > 0 ? ` • ${unreadAtivos} não lida(s)` : ''})
                  </button>
                  <button id="mobile-folder-enviadas" class="px-4 py-2.5 bg-white dark:bg-slate-900 border ${
                    this.activeTab === 'enviadas' 
                      ? 'border-indigo-600/50 text-indigo-600 bg-indigo-600/5 dark:border-indigo-500/50 dark:text-indigo-400 dark:bg-indigo-500/10' 
                      : 'border-slate-200/60 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  } rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none">
                    📤 Enviadas (${totalEnviadas})
                  </button>
                  <button id="mobile-folder-decisoes" class="px-4 py-2.5 bg-white dark:bg-slate-900 border ${
                    this.activeTab === 'decisoes' 
                      ? 'border-indigo-600/50 text-indigo-600 bg-indigo-600/5 dark:border-indigo-500/50 dark:text-indigo-400 dark:bg-indigo-500/10' 
                      : 'border-slate-200/60 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  } rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none">
                    ✅ Decisões (${totalDecisoes})
                  </button>
                  <button id="mobile-folder-arquivados" class="px-4 py-2.5 bg-white dark:bg-slate-900 border ${
                    this.activeTab === 'arquivados' 
                      ? 'border-indigo-600/50 text-indigo-600 bg-indigo-600/5 dark:border-indigo-500/50 dark:text-indigo-400 dark:bg-indigo-500/10' 
                      : 'border-slate-200/60 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  } rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none">
                    🗄️ Arquivados (${totalArquivados}${unreadArquivados > 0 ? ` • ${unreadArquivados} não lida(s)` : ''})
                  </button>
                  <button id="mobile-folder-todos" class="px-4 py-2.5 bg-white dark:bg-slate-900 border ${
                    this.activeTab === 'todos' 
                      ? 'border-indigo-600/50 text-indigo-600 bg-indigo-600/5 dark:border-indigo-500/50 dark:text-indigo-400 dark:bg-indigo-500/10' 
                      : 'border-slate-200/60 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  } rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none">
                    📋 Total (${totalGeral}${unreadGeral > 0 ? ` • ${unreadGeral} não lida(s)` : ''})
                  </button>
                </div>
              </div>

              ${this.activeTab === 'escala' ? `
                ${this.renderEscalaView()}
              ` : `
                <!-- Search and filter summary bar -->
                <div class="inbox-glass p-3 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-3">
                  <!-- Search -->
                  <div class="relative w-full flex-grow">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-400">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </span>
                    <input id="inbox-search-input" type="text" placeholder="Buscar mensagens, passageiros ou destinos..." value="${this.searchQuery}" class="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition" />
                  </div>

                  <!-- Unread Filter Toggle Button -->
                  <button id="toggle-unread-filter-btn" class="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shrink-0 select-none ${
                    this.onlyUnreadFilter 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20' 
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }" title="Filtrar apenas mensagens não lidas">
                    <svg class="w-3.5 h-3.5 ${this.onlyUnreadFilter ? 'text-white' : 'text-slate-400 dark:text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span>Apenas Não Lidas</span>
                    ${unreadAtivos > 0 ? `<span class="px-1.5 py-0.5 rounded-full text-[9px] font-black ${this.onlyUnreadFilter ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'}">${unreadAtivos}</span>` : ''}
                  </button>
                  
                  <!-- Counter info -->
                  <div class="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                    Mostrando ${this.filteredAlerts.length} de ${this.alerts.length}
                  </div>

                  <!-- View Switcher Toggle Button Group -->
                  <div class="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/40 flex-shrink-0">
                    <button id="view-list-btn" class="px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${this.currentView === 'list' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}" title="Visualização em Lista">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
                      Lista
                    </button>
                    <button id="view-calendar-btn" class="px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${this.currentView === 'calendar' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}" title="Visualização em Calendário">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      Calendário
                    </button>
                  </div>
                </div>

                ${this.currentView === 'list' ? `
                  ${this.alertsFeed.render()}
                ` : `
                  <!-- Calendar View Container -->
                  ${this.calendarView.render()}
                `}
              `}

        </main>
      </div>
    `;
  }

  /**
   * Configura delegação global de eventos no document.body para garantir que botões
   * dinâmicos (como 'VER NA ESCALA' no painel de leitura do Inbox) funcionem sempre.
   */
  private setupGlobalEventListeners(): void {
    if ((window as any).__paxflow_inbox_delegated) return;
    (window as any).__paxflow_inbox_delegated = true;

    document.body.addEventListener('click', (e) => {
      const btnVerEscala = (e.target as HTMLElement).closest('.btn-ver-na-escala') as HTMLElement;
      if (btnVerEscala) {
        e.preventDefault();
        e.stopPropagation();
        const solId = btnVerEscala.getAttribute('data-sol-id');
        this.activeTab = 'escala';
        this.render();
        this.setupEventListeners();
        if (solId) {
          setTimeout(() => this.abrirModalSolicitacaoPorId(solId), 50);
        }
      }
    });
  }

  /**
   * Set up page event listeners (clicks, tabs, selects, modal triggers)
   */
  private setupEventListeners(): void {
    // Escuta de tempo real para receber novas mensagens e atualizar a lista sem F5
    window.removeEventListener('paxflow:new-message', (this as any)._onRealtimeInboxBound);
    (this as any)._onRealtimeInboxBound = async () => {
      await this.loadAndBuildAlerts();
      await this.loadEscalaData();
      this.render();
      this.setupEventListeners();
    };
    window.addEventListener('paxflow:new-message', (this as any)._onRealtimeInboxBound);

    window.removeEventListener('paxflow-switch-inbox-tab', (this as any)._onSwitchInboxTabBound);
    (this as any)._onSwitchInboxTabBound = (e: any) => {
      if (e.detail?.tab) {
        this.activeTab = e.detail.tab;
        this.render();
        this.setupEventListeners();
      }
    };
    window.addEventListener('paxflow-switch-inbox-tab', (this as any)._onSwitchInboxTabBound);

    // 0. Top Header Tabs & Mobile Pills (Alternadores de Mensagens vs Escala)
    const topTabMensagens = document.getElementById('inbox-top-tab-mensagens');
    topTabMensagens?.addEventListener('click', () => {
      this.activeTab = 'ativos';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    const topTabEscala = document.getElementById('inbox-top-tab-escala');
    topTabEscala?.addEventListener('click', () => {
      this.activeTab = 'escala';
      this.render();
      this.setupEventListeners();
    });

    const mobilePillEscala = document.getElementById('mobile-pill-escala');
    mobilePillEscala?.addEventListener('click', () => {
      this.activeTab = 'escala';
      this.render();
      this.setupEventListeners();
    });

    // 1. Folders click listeners
    const folderAtivos = document.getElementById('folder-ativos');
    folderAtivos?.addEventListener('click', () => {
      this.activeTab = 'ativos';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    const folderEnviadas = document.getElementById('folder-enviadas');
    folderEnviadas?.addEventListener('click', () => {
      this.activeTab = 'enviadas';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    const folderDecisoes = document.getElementById('folder-decisoes');
    folderDecisoes?.addEventListener('click', () => {
      this.activeTab = 'decisoes';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    const btnNovaMensagem = document.getElementById('btn-nova-mensagem');
    btnNovaMensagem?.addEventListener('click', () => {
      this.openNewMessageModal();
    });

    const folderArquivados = document.getElementById('folder-arquivados');
    folderArquivados?.addEventListener('click', () => {
      this.activeTab = 'arquivados';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    const folderTodos = document.getElementById('folder-todos');
    folderTodos?.addEventListener('click', () => {
      this.activeTab = 'todos';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    // Mobile folders click listeners
    const mobileFolderAtivos = document.getElementById('mobile-folder-ativos');
    mobileFolderAtivos?.addEventListener('click', () => {
      this.activeTab = 'ativos';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    const mobileFolderEnviadas = document.getElementById('mobile-folder-enviadas');
    mobileFolderEnviadas?.addEventListener('click', () => {
      this.activeTab = 'enviadas';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    const mobileFolderDecisoes = document.getElementById('mobile-folder-decisoes');
    mobileFolderDecisoes?.addEventListener('click', () => {
      this.activeTab = 'decisoes';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    const mobileFolderArquivados = document.getElementById('mobile-folder-arquivados');
    mobileFolderArquivados?.addEventListener('click', () => {
      this.activeTab = 'arquivados';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    const mobileFolderTodos = document.getElementById('mobile-folder-todos');
    mobileFolderTodos?.addEventListener('click', () => {
      this.activeTab = 'todos';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    if (this.activeTab === 'escala') {
      this.setupEscalaEventListeners();
      return;
    }

    const btnNovaMensagemMobile = document.getElementById('btn-nova-mensagem-mobile');
    btnNovaMensagemMobile?.addEventListener('click', () => {
      this.openNewMessageModal();
    });

    // 2. Admin filter selector listener
    const adminSelect = document.getElementById('admin-consultant-select') as HTMLSelectElement;
    adminSelect?.addEventListener('change', () => {
      this.selectedConsultantFilter = adminSelect.value;
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });

    // 3. Search keyup input listener
    const searchInput = document.getElementById('inbox-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.applyFilters();
      this.render();
      this.setupEventListeners();
      
      // Keep cursor at end of input
      const input = document.getElementById('inbox-search-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    // 4. View Switcher Toggle listeners
    document.getElementById('toggle-unread-filter-btn')?.addEventListener('click', () => {
      this.onlyUnreadFilter = !this.onlyUnreadFilter;
      this.applyFilters();
      this.render();
      this.setupEventListeners();
    });
    document.getElementById('view-list-btn')?.addEventListener('click', () => {
      this.currentView = 'list';
      this.render();
      this.setupEventListeners();
    });
    document.getElementById('view-calendar-btn')?.addEventListener('click', () => {
      this.currentView = 'calendar';
      this.render();
      this.setupEventListeners();
    });

    // 5. Delegar ouvintes do modo Calendário quando ativo
    if (this.currentView === 'calendar') {
      this.calendarView.setupEventListeners();
    }

    // Category Cards & Pills click listeners
    this.container.querySelectorAll('[data-filter-category]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cat = (btn as HTMLElement).dataset.filterCategory;
        if (cat) {
          if (cat === 'escala') {
            this.activeTab = 'escala';
            this.categoryFilter = 'todos';
          } else {
            if (this.activeTab === 'escala') this.activeTab = 'ativos';
            this.categoryFilter = this.categoryFilter === cat ? 'todos' : cat;
          }
          this.applyFilters();
          this.render();
          this.setupEventListeners();
        }
      });
    });

    // 6. Delegar ouvintes do modo Lista (Feed de Alertas) quando ativo
    if (this.currentView === 'list') {
      this.alertsFeed.setupEventListeners();
    }
  }

  /**
   * Opens the Corporate styled Email modal details
   */
  private openEmailReaderModal(item: AlertItem): void {
    EmailReaderModal.open(item, {
      perfil: this.perfil,
      user: this.user,
      onMarkUnread: async (clickedItem: AlertItem) => {
        await this.markAlertAsUnread(clickedItem.id);
      },
      onArchive: async (clickedItem) => {
        try {
          const shouldArchive = !clickedItem.arquivado;
          await InboxService.archiveAlert(clickedItem, shouldArchive);

          // Reload data and redraw page
          await this.loadAndBuildAlerts();
          this.render();
          this.setupEventListeners();

          this.showToast(shouldArchive ? 'Mensagem arquivada!' : 'Mensagem restaurada!', 'success');
        } catch (err: any) {
          console.error('Erro ao arquivar/restaurar mensagem:', err);
          this.showToast('Erro ao atualizar status de arquivamento da mensagem.', 'error', err);
        }
      },
      onDelete: async (clickedItem) => {
        try {
          if (clickedItem.type === 'direct_message') {
            if (clickedItem.threadId) {
              const { error } = await supabase
                .from('mensagens_diretas')
                .delete()
                .eq('thread_id', clickedItem.threadId);
              if (error) throw error;
            } else if (clickedItem.targetId) {
              const { error } = await supabase
                .from('mensagens_diretas')
                .delete()
                .eq('id', clickedItem.targetId);
              if (error) throw error;
            }
          } else if (clickedItem.type === 'manual') {
            const tableId = clickedItem.id.replace('manual-', '');
            const { error } = await supabase
              .from('lembretes')
              .delete()
              .eq('id', tableId);
            if (error) throw error;
          } else if (clickedItem.type === 'escala_solicitacao' || clickedItem.type === 'atendimento_balcao') {
            const tableId = clickedItem.targetId;
            if (tableId) {
              const { error } = await supabase
                .from('escala_solicitacoes')
                .delete()
                .eq('id', tableId);
              if (error) throw error;
            }
          } else if (clickedItem.id.startsWith('mention-') || clickedItem.type === 'campaign_notification' || clickedItem.type === 'mention') {
            const tableId = clickedItem.id.replace('mention-', '').replace('sent-', '');
            const { error } = await supabase
              .from('notificacoes')
              .delete()
              .eq('id', tableId);
            if (error) throw error;
          } else {
            // Alertas gerados pelo sistema (passport, refund, pre-embarque, pos-viagem-nps)
            await InboxService.archiveAlert(clickedItem, true);
          }

          // Reload data and redraw page
          await this.loadAndBuildAlerts();
          this.render();
          this.setupEventListeners();

          this.showToast('Mensagem excluída com sucesso!', 'success');
        } catch (err: any) {
          console.error('Erro ao excluir mensagem:', err);
          this.showToast('Erro ao excluir mensagem.', 'error', err);
        }
      },
      onClose: () => {
        // Redraw workspace immediately to remove read highlight and update glows
        this.render();
        this.setupEventListeners();
      },
      onReply: (replyItem) => {
        let targetSenderId = replyItem.senderId;
        if (!targetSenderId && replyItem.sender) {
          const cleanSenderName = replyItem.sender.trim().toLowerCase();
          const matchedProfile = (this.allConsultants || this.consultants || []).find(c => 
            c.nome.trim().toLowerCase() === cleanSenderName
          );
          if (matchedProfile) {
            targetSenderId = matchedProfile.id;
          }
        }

        this.openNewMessageModal({
          senderId: targetSenderId || '',
          senderNome: replyItem.sender || 'Consultor',
          assunto: replyItem.title || 'Mensagem Direta',
          messageId: replyItem.targetId,
          threadId: replyItem.threadId
        });
      }
    });
  }

  /**
   * Opens the New Message modal dialog
   */
  private openNewMessageModal(replyTo?: { senderId: string; senderNome: string; assunto: string; messageId?: string; threadId?: string }): void {
    NewMessageModal.open({
      replyTo,
      onSent: async () => {
        this.showToast('Mensagem enviada com sucesso!', 'success');
        await this.loadAndBuildAlerts();
        this.render();
        this.setupEventListeners();
      }
    });
  }


  /**
   * Renders the Escala de Funcionários interface (delegated to EscalaView)
   */
  private renderEscalaView(): string {
    return this.escalaView.render();
  }

  /**
   * Sets up event listeners for the Escala View (delegated to EscalaView)
   */
  private setupEscalaEventListeners(): void {
    this.escalaView.setupEventListeners();
  }

  /**
   * Abre o modal de aprovação/rejeição da solicitação na escala
   */
  private async abrirModalSolicitacaoPorId(solId: string): Promise<void> {
    await this.escalaView.abrirModalSolicitacaoPorId(solId);
  }

  /**
   * Premium Toast Notification system
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
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
    
    if (type === 'success') {
      toast.classList.add('bg-indigo-600', 'dark:bg-indigo-600');
      toast.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> ${translatedMessage}`;
    } else {
      toast.classList.add('bg-rose-500');
      toast.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> ${translatedMessage}`;
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.className = toast.className.replace('translate-y-10 opacity-0', 'translate-y-0 opacity-100');
    }, 10);

    const duration = type === 'success' ? 3000 : 5500;
    setTimeout(() => {
      toast.className = toast.className.replace('translate-y-0 opacity-100', 'translate-y-10 opacity-0');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
}


