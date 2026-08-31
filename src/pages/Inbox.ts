import { supabase, getSessaoAtual, logoutConsultor } from '../services/supabase';
import { PerfilConsultor, Lembrete, Orcamento, Cliente, AlertItem, BancoFolgasItem, EventoEscalaItem, SolicitacaoEscala } from '../types';
import { getAvatarSvg } from '../services/avatars';
import { showCustomConfirm, showCustomAlert } from '../services/dialog';
import { InboxService } from '../services/inboxService';
import { EscalaService, TURNO_PRESETS } from '../services/escalaService';
import { EmailReaderModal } from '../components/inbox/EmailReaderModal';
import { NewMessageModal } from '../components/inbox/NewMessageModal';
import { formatarDataBR } from '../utils/messageFormatter';
import './Inbox.css';


export class InboxPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private alerts: AlertItem[] = [];
  private filteredAlerts: AlertItem[] = [];
  
  // App state
  private activeTab: 'ativos' | 'arquivados' | 'todos' | 'enviadas' | 'escala' = 'ativos';
  private selectedConsultantFilter: string = 'todos';
  private categoryFilter: string = 'todos';
  private selectedAlertIds: Set<string> = new Set();
  private readList: string[] = [];
  private searchQuery: string = '';
  private consultants: PerfilConsultor[] = [];

  // Escala specific state
  private escalaAno: number = 2026;
  private escalaMes: number = 8;
  private escalaData: Record<string, string[]> = {};
  private bancoFolgasData: BancoFolgasItem[] = [];
  private eventosEscalaData: EventoEscalaItem[] = [];
  private selectedLojaEquipeFilter: string = 'todas';
  
  // Calendar specific state
  private currentView: 'list' | 'calendar' = 'list';
  private calendarMode: 'month' | 'week' | 'agenda' = 'month';
  private calendarSelectedDate: Date = new Date();
  
  // Global settings
  private prazoReembolsoDias: number = 3;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Initializes the Inbox Cockpit page
   */
  public async init(): Promise<void> {
    try {
      // 1. Fetch current session and user profile
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }
      this.user = user;
      this.perfil = perfil;

      // 2. Fetch global settings for refund SLAs
      await this.loadGlobalSettings();

      // 3. Fetch active consultants list
      await this.loadConsultants();
      if (this.perfil?.role === 'admin') {
        this.selectedConsultantFilter = this.user.id;
      }

      // 4. Fetch all reminders and build unified alert list
      await this.loadAndBuildAlerts();

      // 5. Load Escala data
      await this.loadEscalaData();

      // 6. Render Page UI and attach action listeners
      this.render();
      this.setupEventListeners();
      this.setupGlobalEventListeners();

    } catch (err: any) {
      console.error('Erro na inicialização da Caixa de Alertas:', err);
      this.renderAuthError(`Erro interno ao carregar Inbox: ${err.message}`);
    }
  }

  /**
   * Loads scale schedule data, leave bank balances, and events
   */
  private async loadEscalaData(): Promise<void> {
    try {
      const rawEscala = await EscalaService.loadEscalaMensal(this.escalaAno, this.escalaMes);
      const rawBanco = await EscalaService.loadBancoFolgas();
      this.eventosEscalaData = await EscalaService.loadEventosEscala();

      const daysInMonth = new Date(this.escalaAno, this.escalaMes, 0).getDate();

      // Mapa para desduplicar consultores por chave normalizada
      const teamMap = new Map<string, { displayName: string; participates: boolean }>();

      // 1. Integrantes padrão da agência para garantir roster completo
      const defaultTeam = ["Marinna Morena", "Guto Bassaroto", "Maria Carvalho", "Rafael Sousa", "Eduardo Mariano", "Laura Montu", "Fernanda Ganem"];
      defaultTeam.forEach(n => {
        teamMap.set(n.trim().toLowerCase(), { displayName: n.trim(), participates: true });
      });

      // 2. Inclui todos os consultores que já possuem turnos cadastrados na escala (rawEscala)
      Object.keys(rawEscala).forEach(n => {
        if (n && n.trim()) {
          const key = n.trim().toLowerCase();
          if (!teamMap.has(key)) {
            teamMap.set(key, { displayName: n.trim(), participates: true });
          }
        }
      });

      // 3. Se houver consultores do banco de dados, mescla-os garantindo que qualquer consultor com escala continue visível
      if (this.consultants && this.consultants.length > 0) {
        this.consultants.forEach(c => {
          if (c.nome) {
            const key = c.nome.trim().toLowerCase();
            const isExplicitlyDisabled = c.participa_escala === false || c.participaEscala === false;
            // Se o consultor tem dados na escala bruta, mantemos visível para exibição completa
            const hasShiftsInRaw = rawEscala[c.nome] && rawEscala[c.nome].some(v => v !== '');
            const doesParticipate = !isExplicitlyDisabled || hasShiftsInRaw;

            teamMap.set(key, { displayName: c.nome.trim(), participates: doesParticipate });
          }
        });
      }

      // Reconstrói escalaData desduplicada apenas para quem participa_escala === true
      const cleanEscalaData: Record<string, string[]> = {};
      teamMap.forEach((info, key) => {
        if (!info.participates) return; // Omitir se o funcionário não participa da escala

        const firstName = info.displayName.split(' ')[0].toLowerCase();
        
        // Busca chave exata pelo nome completo ou por primeiro nome (ex: 'Marinna' -> 'Marinna Morena')
        const existingKey = Object.keys(rawEscala).find(k => {
          const kLower = k.trim().toLowerCase();
          const kFirstName = kLower.split(' ')[0];
          return kLower === key || kFirstName === firstName;
        });

        if (existingKey && rawEscala[existingKey]) {
          // Ajusta tamanho do vetor para o número real de dias do mês
          const arr = rawEscala[existingKey];
          if (arr.length < daysInMonth) {
            cleanEscalaData[info.displayName] = [...arr, ...new Array(daysInMonth - arr.length).fill('')];
          } else {
            cleanEscalaData[info.displayName] = arr.slice(0, daysInMonth);
          }
        } else {
          cleanEscalaData[info.displayName] = new Array(daysInMonth).fill('');
        }
      });

      // Aplica a ordem salva dos consultores em escalaData
      const customOrder = EscalaService.loadOrdemConsultores();
      if (customOrder && customOrder.length > 0) {
        const orderedEscalaData: Record<string, string[]> = {};
        customOrder.forEach(name => {
          const matchedKey = Object.keys(cleanEscalaData).find(k => k.trim().toLowerCase() === name.trim().toLowerCase());
          if (matchedKey && cleanEscalaData[matchedKey]) {
            orderedEscalaData[matchedKey] = cleanEscalaData[matchedKey];
          }
        });
        Object.keys(cleanEscalaData).forEach(name => {
          if (!orderedEscalaData[name]) {
            orderedEscalaData[name] = cleanEscalaData[name];
          }
        });
        this.escalaData = orderedEscalaData;
      } else {
        this.escalaData = cleanEscalaData;
      }

      // Reconstrói bancoFolgasData desduplicada apenas para quem participa_escala === true
      const cleanBancoData: BancoFolgasItem[] = [];
      teamMap.forEach((info, key) => {
        if (!info.participates) return;

        const firstName = info.displayName.split(' ')[0].toLowerCase();
        const existing = rawBanco.find(b => {
          const bLower = b.consultor_nome.trim().toLowerCase();
          const bFirstName = bLower.split(' ')[0];
          return bLower === key || bFirstName === firstName;
        });

        if (existing) {
          cleanBancoData.push({ ...existing, consultor_nome: info.displayName });
        } else {
          cleanBancoData.push({
            consultor_id: `c-${info.displayName}`,
            consultor_nome: info.displayName,
            equipe: 'Equipe Agatur',
            saldo_dias: '—',
            detalhes_historico: 'Sem saldo acumulado'
          });
        }
      });
      this.bancoFolgasData = cleanBancoData;

    } catch (err) {
      console.error('Erro ao carregar dados da escala:', err);
    }
  }

  /**
   * Destroy page elements if necessary
   */
  public destroy(): void {
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
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      this.consultants = data || [];
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

    // 1. Filter by Active / Archived / All / Sent
    if (this.activeTab === 'ativos') {
      result = result.filter(a => !a.arquivado && !a.isSent);
    } else if (this.activeTab === 'arquivados') {
      result = result.filter(a => a.arquivado && !a.isSent);
    } else if (this.activeTab === 'enviadas') {
      result = result.filter(a => a.isSent);
    } else if (this.activeTab === 'todos') {
      result = result.filter(a => !a.isSent);
    }

    // 2. Filter by Consultant (Admin only)
    if (this.perfil?.role === 'admin' && this.selectedConsultantFilter !== 'todos') {
      result = result.filter(a => a.consultorId === this.selectedConsultantFilter || a.isReceivedByMe || a.isCreatedByMe);
    }

    // 2.5 Filter by Category (Summary Cards & Mobile Pills)
    if (this.categoryFilter !== 'todos') {
      if (this.categoryFilter === 'alertas') {
        result = result.filter(a => a.type === 'passport' || a.type === 'refund' || a.type === 'pre-embarque' || a.type === 'pos-viagem-nps' || a.type === 'campaign_notification');
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
        result = result.filter(a => a.type === 'mention');
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

    // Sort by creation date descending
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    this.filteredAlerts = result;
  }

  /**
   * Retrieves list of archived alert IDs
   */
  private getArchivedLocalAlerts(): string[] {
    try {
      const val = localStorage.getItem('paxflow_archived_alerts');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  /**
   * Archives or unarchives a local alert item ID
   */
  private toggleLocalAlertArchive(id: string, shouldArchive: boolean): void {
    try {
      const list = this.getArchivedLocalAlerts();
      if (shouldArchive) {
        if (!list.includes(id)) list.push(id);
      } else {
        const index = list.indexOf(id);
        if (index > -1) list.splice(index, 1);
      }
      localStorage.setItem('paxflow_archived_alerts', JSON.stringify(list));
    } catch (err) {
      console.error('Erro ao gerenciar arquivo local:', err);
    }
  }

  /**
   * Marks a specific alert ID as read
   */
  private async markAlertAsRead(id: string): Promise<void> {
    if (!this.user?.id) return;
    await InboxService.markAlertAsRead(this.user.id, id);
    this.readList = await InboxService.getReadAlerts(this.user.id);
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
    if (this.perfil?.role === 'admin' && this.selectedConsultantFilter !== 'todos') {
      baseAlertsForCounters = baseAlertsForCounters.filter(a => a.consultorId === this.selectedConsultantFilter || a.isReceivedByMe || a.isCreatedByMe);
    }

    const readList = this.readList;

    // Filter subsets for totals and unread counts
    const activeAlerts = baseAlertsForCounters.filter(a => !a.arquivado && !a.isSent);
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

    const totalEnviadas = baseAlertsForCounters.filter(a => a.isSent).length;

    const archivedAlerts = baseAlertsForCounters.filter(a => a.arquivado && !a.isSent);
    const totalArquivados = archivedAlerts.length;
    const unreadArquivados = archivedAlerts.filter(a => !readList.includes(a.id)).length;

    const allInboxAlerts = baseAlertsForCounters.filter(a => !a.isSent);
    const totalGeral = allInboxAlerts.length;
    const unreadGeral = allInboxAlerts.filter(a => !readList.includes(a.id)).length;

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
            <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shrink-0">
              <button id="inbox-top-tab-mensagens" class="px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 select-none ${
                this.activeTab !== 'escala'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }">
                <span>📨 Mensagens & Alertas</span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black ${
                  this.activeTab !== 'escala' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }">${unreadAtivos > 0 ? `🔴 ${unreadAtivos} / ${totalAtivos}` : `${totalAtivos}`}</span>
              </button>

              <button id="inbox-top-tab-escala" class="px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 select-none ${
                this.activeTab === 'escala'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20'
                  : 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200/40 dark:border-violet-800/40'
              }">
                <span>📅 ESCALA DE FUNCIONÁRIOS</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-black ${
                  this.activeTab === 'escala' ? 'bg-white/20 text-white' : 'bg-violet-200/60 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200'
                }">AGÊNCIA</span>
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
                  ${unreadAtivos > 0 ? `🔴 ${unreadAtivos}/${totalAtivos}` : `${totalAtivos}`}
                </span>
              </button>
              <button data-filter-category="escala" class="px-3 py-2 rounded-xl ${
                this.categoryFilter === 'escala' || this.activeTab === 'escala'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md font-black'
                  : 'bg-violet-50 dark:bg-violet-950/40 border border-violet-200/50 dark:border-violet-900/40 text-violet-700 dark:text-violet-300 font-bold'
              } flex items-center gap-1.5 shrink-0 text-xs select-none">
                <span>📅 Escala</span>
              </button>
              <button data-filter-category="depois" class="px-3 py-2 rounded-xl ${this.categoryFilter === 'depois' ? 'bg-slate-700 text-white font-black' : 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200'} border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2 shrink-0 text-xs font-bold cursor-pointer">
                <span>📌 Depois:</span>
                <span class="px-2 py-0.5 rounded-md ${unreadManual > 0 ? 'bg-rose-600 text-white' : 'bg-slate-700 dark:bg-slate-600 text-white'} font-black text-[11px]">
                  ${unreadManual > 0 ? `🔴 ${unreadManual}/${totalManual}` : `${totalManual}`}
                </span>
              </button>
              <button data-filter-category="passaporte" class="px-3 py-2 rounded-xl ${this.categoryFilter === 'passaporte' ? 'bg-amber-600 text-white font-black' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'} border border-amber-100/50 dark:border-amber-900/40 flex items-center gap-2 shrink-0 text-xs font-bold cursor-pointer">
                <span>🛂 Passaportes:</span>
                <span class="px-2 py-0.5 rounded-md ${unreadPassport > 0 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'} font-black text-[11px]">
                  ${unreadPassport > 0 ? `🔴 ${unreadPassport}/${totalPassport}` : `${totalPassport}`}
                </span>
              </button>
              <button data-filter-category="refund" class="px-3 py-2 rounded-xl ${this.categoryFilter === 'refund' ? 'bg-rose-600 text-white font-black' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'} border border-rose-100/50 dark:border-rose-900/40 flex items-center gap-2 shrink-0 text-xs font-bold cursor-pointer">
                <span>💰 Reembolsos:</span>
                <span class="px-2 py-0.5 rounded-md ${unreadRefund > 0 ? 'bg-rose-600 text-white' : 'bg-rose-600 text-white'} font-black text-[11px]">
                  ${unreadRefund > 0 ? `🔴 ${unreadRefund}/${totalRefund}` : `${totalRefund}`}
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
                    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">🔴 ${unreadAtivos} não lida(s)</span>`
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
                    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">🔴 ${unreadManual} não lida(s)</span>`
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
                    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">🔴 ${unreadPassport} não lida(s)</span>`
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
                    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">🔴 ${unreadRefund} não lida(s)</span>`
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
                    ${unreadArquivados > 0 ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white whitespace-nowrap inline-flex items-center shrink-0">🔴 ${unreadArquivados}</span>` : ''}
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
                    ${unreadGeral > 0 ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white whitespace-nowrap inline-flex items-center shrink-0">🔴 ${unreadGeral}</span>` : ''}
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap inline-flex items-center shrink-0">${totalGeral}</span>
                  </div>
                </button>

                <button id="folder-escala" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'escala' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5 min-w-0 flex-1 truncate text-left">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span class="truncate">Escala</span>
                  </span>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 whitespace-nowrap inline-flex items-center shrink-0 ml-2">Nova</span>
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
                    📥 Entrada (${totalAtivos}${unreadAtivos > 0 ? ` • 🔴 ${unreadAtivos}` : ''})
                  </button>
                  <button id="mobile-folder-enviadas" class="px-4 py-2.5 bg-white dark:bg-slate-900 border ${
                    this.activeTab === 'enviadas' 
                      ? 'border-indigo-600/50 text-indigo-600 bg-indigo-600/5 dark:border-indigo-500/50 dark:text-indigo-400 dark:bg-indigo-500/10' 
                      : 'border-slate-200/60 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  } rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none">
                    📤 Enviadas (${totalEnviadas})
                  </button>
                  <button id="mobile-folder-arquivados" class="px-4 py-2.5 bg-white dark:bg-slate-900 border ${
                    this.activeTab === 'arquivados' 
                      ? 'border-indigo-600/50 text-indigo-600 bg-indigo-600/5 dark:border-indigo-500/50 dark:text-indigo-400 dark:bg-indigo-500/10' 
                      : 'border-slate-200/60 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  } rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none">
                    🗄️ Arquivados (${totalArquivados}${unreadArquivados > 0 ? ` • 🔴 ${unreadArquivados}` : ''})
                  </button>
                  <button id="mobile-folder-todos" class="px-4 py-2.5 bg-white dark:bg-slate-900 border ${
                    this.activeTab === 'todos' 
                      ? 'border-indigo-600/50 text-indigo-600 bg-indigo-600/5 dark:border-indigo-500/50 dark:text-indigo-400 dark:bg-indigo-500/10' 
                      : 'border-slate-200/60 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  } rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none">
                    📋 Total (${totalGeral}${unreadGeral > 0 ? ` • 🔴 ${unreadGeral}` : ''})
                  </button>
                  <button id="mobile-folder-escala" class="px-4 py-2.5 bg-white dark:bg-slate-900 border ${
                    this.activeTab === 'escala' 
                      ? 'border-indigo-600/50 text-indigo-600 bg-indigo-600/5 dark:border-indigo-500/50 dark:text-indigo-400 dark:bg-indigo-500/10' 
                      : 'border-slate-200/60 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  } rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 focus:outline-none">
                    📅 Escala
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
                  
                  <!-- Counter info -->
                  <div class="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                    Mostrando ${this.filteredAlerts.length} de ${this.alerts.length} alertas
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
                  <!-- Bulk Action Bar -->
                  <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm mb-3 text-xs">
                    <div class="flex items-center gap-3">
                      <label class="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                        <input type="checkbox" id="inbox-select-all-checkbox" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" ${this.selectedAlertIds.size > 0 && this.selectedAlertIds.size === this.filteredAlerts.length ? 'checked' : ''} />
                        <span>Selecionar todos (${this.filteredAlerts.length})</span>
                      </label>
                      ${this.selectedAlertIds.size > 0 ? `
                        <span class="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px]">
                          ${this.selectedAlertIds.size} selecionado(s)
                        </span>
                      ` : ''}
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      ${this.selectedAlertIds.size > 0 ? `
                        <button id="btn-bulk-read" class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold hover:bg-indigo-100 transition">
                          ✓ Marcar Lida(s)
                        </button>
                        <button id="btn-bulk-unread" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold hover:bg-slate-200 transition">
                          ✉️ Marcar Não Lida(s)
                        </button>
                        <button id="btn-bulk-archive" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold hover:bg-slate-200 transition">
                          📦 Arquivar Selecionada(s)
                        </button>
                      ` : `
                        <button id="btn-mark-all-read" class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold hover:bg-indigo-100 transition flex items-center gap-1.5">
                          ✓ Marcar TODAS como lidas
                        </button>
                      `}
                    </div>
                  </div>

                  <!-- Alerts Mail Stack -->
                  <div class="space-y-3 custom-scrollbar overflow-y-auto max-h-[calc(100vh-310px)] pr-1">
                    ${this.filteredAlerts.length === 0 ? `
                      <div class="inbox-glass p-12 text-center rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                        <div class="w-12 h-12 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                          </svg>
                        </div>
                        <h3 class="text-sm font-black text-slate-700 dark:text-slate-400 uppercase tracking-wide">Caixa Vazia</h3>
                        <p class="text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">Nenhum alerta ou lembrete corresponde aos filtros atuais.</p>
                      </div>
                    ` : this.filteredAlerts.map(a => {
                      let badgeClass = 'badge-gradient-indigo';
                      let badgeText = 'Lembrete';
                      if (a.type === 'passport') {
                        badgeClass = 'badge-gradient-amber';
                        badgeText = 'Passaporte SLA';
                      } else if (a.type === 'refund') {
                        badgeClass = 'badge-gradient-rose';
                        badgeText = 'Reembolso SLA';
                      } else if (a.type === 'mention') {
                        badgeClass = 'bg-gradient-to-tr from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-500';
                        badgeText = 'Menção @';
                      } else if (a.type === 'campaign_notification') {
                        badgeClass = 'bg-gradient-to-tr from-emerald-500 to-indigo-600 dark:from-emerald-600 dark:to-indigo-500';
                        badgeText = 'Campanha 🎯';
                      } else if (a.type === 'pre-embarque') {
                        badgeClass = 'bg-gradient-to-tr from-sky-500 to-indigo-600 dark:from-sky-600 dark:to-indigo-500';
                        badgeText = 'Pré-Embarque ✈️';
                      } else if (a.type === 'pos-viagem-nps') {
                        badgeClass = 'bg-gradient-to-tr from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-500';
                        badgeText = 'Pós-Viagem NPS ⭐';
                      }

                      const isUnread = !a.arquivado && !readList.includes(a.id);

                      return `
                        <div class="inbox-card inbox-glass p-5 rounded-2xl border ${isUnread ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/5 dark:bg-indigo-950/5' : 'border-white/60 dark:border-slate-900/60'} shadow-sm flex items-start gap-3 cursor-pointer relative" data-alert-id="${a.id}">
                          
                          <!-- Checkbox de Seleção em Massa -->
                          <div class="pt-0.5" onclick="event.stopPropagation()">
                            <input type="checkbox" class="inbox-item-checkbox w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" data-alert-id="${a.id}" ${this.selectedAlertIds.has(a.id) ? 'checked' : ''} />
                          </div>

                          <!-- Unread Indicator Dot -->
                          ${isUnread ? `<span class="absolute top-5 left-1 w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse"></span>` : ''}

                          <!-- Avatar -->
                          <div class="w-10 h-10 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 flex-shrink-0 ${isUnread ? 'ring-2 ring-indigo-500/20' : ''}">
                            ${getAvatarSvg(a.senderAvatar, a.sender, 'w-full h-full')}
                          </div>

                          <!-- Text info -->
                          <div class="flex-grow min-w-0 space-y-1">
                            <div class="flex items-center justify-between gap-2">
                              <span class="block text-xs font-black text-slate-800 dark:text-slate-200 truncate">${a.sender}</span>
                              <span class="text-[10px] font-bold text-slate-400 dark:text-slate-400 whitespace-nowrap">${a.dateStr}</span>
                            </div>

                            <h4 class="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                              <span class="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider ${badgeClass}">
                                ${badgeText}
                              </span>
                              <span class="truncate">${a.title}</span>
                            </h4>

                            <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              ${a.subject}
                            </p>

                            ${this.perfil?.role === 'admin' ? `
                              <div class="flex items-center gap-1.5 pt-1 text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                Consultor: ${a.consultorNome}
                              </div>
                            ` : ''}
                          </div>

                          <!-- Archive Quick Action -->
                          <button class="btn-archive-quick p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition flex-shrink-0 self-center" title="${a.arquivado ? 'Desarquivar' : 'Arquivar'}" data-alert-id="${a.id}">
                            ${a.arquivado ? `
                              <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/></svg>
                            ` : `
                              <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                <rect x="1" y="3" width="22" height="5"></rect>
                                <line x1="10" y1="12" x2="14" y2="12"></line>
                              </svg>
                            `}
                          </button>

                        </div>
                      `;
                    }).join('')}
                  </div>
                ` : `
                  <!-- Calendar View Container -->
                  ${this.renderCalendarContainer()}
                `}
              `}

        </main>
      </div>
    `;
  }

  /**
   * Builds the general layout wrapper for the calendar views
   */
  private renderCalendarContainer(): string {
    const formattedTitle = this.getCalendarHeaderLabel();
    
    return `
      <div class="space-y-4">
        <!-- Calendar Control Bar -->
        <div class="inbox-glass p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 relative z-30">
          
          <!-- Mode Tabs -->
          <div class="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/40 w-full sm:w-auto">
            <button id="cal-mode-month" class="flex-grow sm:flex-grow-0 px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${this.calendarMode === 'month' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}">
              Mês
            </button>
            <button id="cal-mode-week" class="flex-grow sm:flex-grow-0 px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${this.calendarMode === 'week' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}">
              Semana
            </button>
            <button id="cal-mode-agenda" class="flex-grow sm:flex-grow-0 px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${this.calendarMode === 'agenda' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}">
              Agenda
            </button>
          </div>

          <!-- Date Label -->
          <div class="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide text-center">
            ${formattedTitle}
          </div>

          <!-- Navigation Controls -->
          <div class="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end relative">
            <button id="cal-nav-prev" class="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition" title="Período Anterior">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button id="cal-nav-today" class="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-extrabold text-slate-600 dark:text-slate-300 transition border border-slate-200/40 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-sm">
              Hoje
            </button>
            <button id="cal-nav-next" class="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition" title="Próximo Período">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>

            <!-- Legend help tooltip trigger -->
            <div class="relative group ml-1 flex items-center">
              <button id="cal-legend-btn" class="w-9 h-9 inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 font-bold text-xs shadow-sm cursor-help focus:outline-none" title="Legenda de Cores">
                ?
              </button>
              
              <!-- Popover Legend Tooltip -->
              <div class="absolute right-0 top-11 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl w-56 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <h4 class="text-xs font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-3 text-left">Legenda de Cores</h4>
                <div class="space-y-2.5 text-left">
                  <div class="flex items-center gap-2.5">
                     <span class="w-3.5 h-3.5 rounded-md badge-gradient-indigo flex-shrink-0"></span>
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">Lembretes Manuais</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                     <span class="w-3.5 h-3.5 rounded-md badge-gradient-amber flex-shrink-0"></span>
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">Passaportes SLA</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                     <span class="w-3.5 h-3.5 rounded-md badge-gradient-rose flex-shrink-0"></span>
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">Reembolsos SLA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Rendered Calendar View -->
        <div class="custom-scrollbar overflow-y-auto max-h-[calc(100vh-310px)] pr-1">
          ${this.renderCalendarContent()}
        </div>
      </div>
    `;
  }

  /**
   * Selects the rendering method based on current mode
   */
  private renderCalendarContent(): string {
    if (this.calendarMode === 'month') {
      return this.renderMonthCalendar();
    } else if (this.calendarMode === 'week') {
      return this.renderWeekCalendar();
    } else {
      return this.renderAgendaCalendar();
    }
  }

  /**
   * Summarizes alert titles for compact view representations
   */
  private getEventSummary(a: AlertItem): string {
    if (a.type === 'manual') {
      const match = a.subject.match(/\[(.*?)\]/);
      return match && match[1] ? match[1] : 'Lembrete';
    } else if (a.type === 'passport') {
      const match = a.subject.match(/passageiro\s+(.*?)\s+está/);
      return match && match[1] ? `Passaporte: ${match[1]}` : 'Passaporte SLA';
    } else if (a.type === 'refund') {
      const match = a.subject.match(/reembolso de\s+(.*?)\s+excedeu/);
      return match && match[1] ? `Reembolso: ${match[1]}` : 'Reembolso SLA';
    }
    return a.title;
  }

  /**
   * Generates Month Calendar Grid with events
   */
  private renderMonthCalendar(): string {
    const year = this.calendarSelectedDate.getFullYear();
    const month = this.calendarSelectedDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Day of the week of the first day (0 = Sunday, ..., 6 = Saturday)
    const startDayOfWeek = firstDay.getDay();

    // Number of days in the current month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Number of days in the previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add previous month's padding cells
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false
      });
    }

    // Add current month's cells
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Add next month's padding cells to make a multiple of 7
    let nextMonthDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        date: new Date(year, month + 1, nextMonthDay++),
        isCurrentMonth: false
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Build the grid HTML
    let html = `
      <div class="calendar-container p-4">
        <div class="calendar-grid">
          <!-- Weekday headers -->
          <div class="calendar-day-header">Dom</div>
          <div class="calendar-day-header">Seg</div>
          <div class="calendar-day-header">Ter</div>
          <div class="calendar-day-header">Qua</div>
          <div class="calendar-day-header">Qui</div>
          <div class="calendar-day-header">Sex</div>
          <div class="calendar-day-header">Sáb</div>
    `;

    cells.forEach(cell => {
      // Use local timezone values for formatting correctly
      const cellYear = cell.date.getFullYear();
      const cellMonth = String(cell.date.getMonth() + 1).padStart(2, '0');
      const cellDay = String(cell.date.getDate()).padStart(2, '0');
      const cellDateStr = `${cellYear}-${cellMonth}-${cellDay}`;
      
      const isToday = cellDateStr === todayStr;
      const otherMonthClass = cell.isCurrentMonth ? '' : 'other-month';
      const todayClass = isToday ? 'today' : '';

      // Find alerts for this day
      const dayAlerts = this.filteredAlerts.filter(a => a.eventDate === cellDateStr);

      html += `
        <div class="calendar-day-cell ${otherMonthClass} ${todayClass}" data-date="${cellDateStr}">
          <div class="flex justify-between items-center mb-1">
            <span class="calendar-day-number">${cell.date.getDate()}</span>
            ${isToday ? '<span class="text-[8px] bg-indigo-600 text-white font-extrabold px-1 rounded uppercase tracking-wider scale-90">Hoje</span>' : ''}
          </div>
          <div class="flex-grow overflow-y-auto custom-scrollbar space-y-1 max-h-[85px] w-full">
            ${dayAlerts.map(a => {
              let colorClass = 'badge-gradient-indigo';
              if (a.type === 'passport') {
                colorClass = 'badge-gradient-amber';
              } else if (a.type === 'refund') {
                colorClass = 'badge-gradient-rose';
              } else if (a.type === 'mention') {
                colorClass = 'bg-gradient-to-tr from-purple-500 to-indigo-650';
              } else if (a.type === 'campaign_notification') {
                colorClass = 'bg-gradient-to-tr from-emerald-500 to-indigo-650';
              } else if (a.type === 'manual') {
                if (a.isCreatedByMe) {
                  colorClass = 'bg-sky-600 text-white';
                } else if (a.isReceivedByMe) {
                  colorClass = 'bg-amber-500 text-white';
                } else {
                  colorClass = 'bg-emerald-600 text-white';
                }
              }

              if (a.arquivado) {
                colorClass += ' line-through opacity-50';
              }

              const summary = this.getEventSummary(a);
              const displayTitle = a.type === 'manual' && a.periodText 
                ? `[${a.periodText}] ${summary}`
                : summary;

              return `
                <button class="calendar-event-pill ${colorClass}" data-alert-id="${a.id}" title="${a.title} - ${a.subject}">
                  ${displayTitle}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Generates modern 7-column Week View columns
   */
  private renderWeekCalendar(): string {
    const startOfWeek = new Date(this.calendarSelectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // adjust to Sunday
    startOfWeek.setDate(diff);

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const todayStr = new Date().toISOString().split('T')[0];

    let html = `
      <div class="calendar-container p-4">
        <div class="calendar-week-container">
    `;

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      
      const cellYear = currentDay.getFullYear();
      const cellMonth = String(currentDay.getMonth() + 1).padStart(2, '0');
      const cellDay = String(currentDay.getDate()).padStart(2, '0');
      const dayDateStr = `${cellYear}-${cellMonth}-${cellDay}`;
      
      const isToday = dayDateStr === todayStr;

      const dayAlerts = this.filteredAlerts.filter(a => a.eventDate === dayDateStr);

      html += `
        <div class="calendar-week-column" data-date="${dayDateStr}">
          <div class="calendar-week-day-header ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}">
            <span class="block text-[10px] font-black uppercase tracking-wider">${weekdays[i]}</span>
            <span class="text-xl font-black ${isToday ? 'bg-indigo-600 text-white w-8 h-8 inline-flex items-center justify-center rounded-full shadow-sm mt-0.5' : 'text-slate-800 dark:text-slate-200'}">${currentDay.getDate()}</span>
          </div>
          <div class="flex-grow flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-0.5">
            ${dayAlerts.length === 0 ? `
              <div class="flex-grow flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center opacity-40">
                <span class="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Sem Alertas</span>
              </div>
            ` : dayAlerts.map(a => {
              let badgeClass = 'badge-gradient-indigo';
              let badgeText = 'Lembrete';
              let accentClass = 'bg-indigo-500';
              let cardClass = '';

              if (a.type === 'passport') {
                badgeClass = 'badge-gradient-amber';
                badgeText = 'Passaporte';
                accentClass = 'bg-amber-500';
              } else if (a.type === 'refund') {
                badgeClass = 'badge-gradient-rose';
                badgeText = 'Reembolso';
                accentClass = 'bg-rose-500';
              } else if (a.type === 'mention') {
                badgeClass = 'bg-gradient-to-tr from-purple-500 to-indigo-600';
                badgeText = 'Menção @';
                accentClass = 'bg-purple-500';
              } else if (a.type === 'campaign_notification') {
                badgeClass = 'bg-gradient-to-tr from-emerald-500 to-indigo-600';
                badgeText = 'Campanha 🎯';
                accentClass = 'bg-emerald-500';
              } else if (a.type === 'manual') {
                if (a.isCreatedByMe) {
                  badgeClass = 'bg-sky-600 text-white';
                  badgeText = 'Delegado';
                  accentClass = 'bg-sky-500';
                } else if (a.isReceivedByMe) {
                  badgeClass = 'bg-amber-500 text-white';
                  badgeText = 'Recebido';
                  accentClass = 'bg-amber-500';
                } else {
                  badgeClass = 'bg-emerald-600 text-white';
                  badgeText = 'Pessoal';
                  accentClass = 'bg-emerald-500';
                }
              }

              if (a.arquivado) {
                cardClass += ' line-through opacity-50';
              }

              return `
                <div class="inbox-card inbox-glass p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 cursor-pointer shadow-sm relative flex flex-col gap-1.5 ${cardClass}" data-alert-id="${a.id}">
                  <!-- Accent color bar -->
                  <div class="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r ${accentClass}"></div>
                  
                  <div class="pl-2 flex items-center justify-between gap-1">
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider ${badgeClass}">
                      ${badgeText}
                    </span>
                    ${a.periodText ? `<span class="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">${a.periodText}</span>` : ''}
                  </div>
                  
                  <div class="pl-2">
                    <h5 class="text-xs font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1 leading-snug">${this.getEventSummary(a)}</h5>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-0.5">${a.subject}</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Generates premium Agenda View (Vertical chronological timeline)
   */
  private renderAgendaCalendar(): string {
    // Group alerts by eventDate
    const groups: { [key: string]: AlertItem[] } = {};
    this.filteredAlerts.forEach(a => {
      if (!groups[a.eventDate]) groups[a.eventDate] = [];
      groups[a.eventDate].push(a);
    });

    // Sort dates chronologically ascending for agenda view
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (sortedDates.length === 0) {
      return `
        <div class="inbox-glass p-12 text-center rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
          <div class="w-12 h-12 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h3 class="text-sm font-black text-slate-700 dark:text-slate-400 uppercase tracking-wide">Agenda Vazia</h3>
          <p class="text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">Nenhum evento futuro ou lembrete para exibir.</p>
        </div>
      `;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    let html = `
      <div class="calendar-container p-6">
        <div class="agenda-timeline">
    `;

    sortedDates.forEach(dateStr => {
      const dateObj = new Date(dateStr + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const isToday = dateStr === todayStr;

      html += `
        <div class="agenda-day-group ${isToday ? 'today' : ''}">
          <div class="agenda-day-dot"></div>
          
          <h4 class="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>${formattedDate}</span>
            ${isToday ? '<span class="px-2 py-0.5 bg-indigo-600 dark:bg-indigo-600 text-white rounded text-[8px] font-black tracking-widest scale-90 uppercase">Hoje</span>' : ''}
          </h4>
          
          <div class="space-y-3">
            ${groups[dateStr].map(a => {
              let badgeClass = 'badge-gradient-indigo';
              let badgeText = 'Lembrete';
              let accentClass = 'bg-indigo-500';
              let cardClass = '';

              if (a.type === 'passport') {
                badgeClass = 'badge-gradient-amber';
                badgeText = 'Passaporte SLA';
                accentClass = 'bg-amber-500';
              } else if (a.type === 'refund') {
                badgeClass = 'badge-gradient-rose';
                badgeText = 'Reembolso SLA';
                accentClass = 'bg-rose-500';
              } else if (a.type === 'mention') {
                badgeClass = 'bg-gradient-to-tr from-purple-500 to-indigo-600';
                badgeText = 'Menção @';
                accentClass = 'bg-purple-500';
              } else if (a.type === 'campaign_notification') {
                badgeClass = 'bg-gradient-to-tr from-emerald-500 to-indigo-600';
                badgeText = 'Campanha 🎯';
                accentClass = 'bg-emerald-500';
              } else if (a.type === 'manual') {
                if (a.isCreatedByMe) {
                  badgeClass = 'bg-sky-600 text-white';
                  badgeText = 'Delegado';
                  accentClass = 'bg-sky-500';
                } else if (a.isReceivedByMe) {
                  badgeClass = 'bg-amber-500 text-white';
                  badgeText = 'Recebido';
                  accentClass = 'bg-amber-500';
                } else {
                  badgeClass = 'bg-emerald-600 text-white';
                  badgeText = 'Pessoal';
                  accentClass = 'bg-emerald-500';
                }
              }

              if (a.arquivado) {
                cardClass += ' line-through opacity-50';
              }

              return `
                <div class="inbox-card inbox-glass p-4 rounded-xl border border-white/60 dark:border-slate-900/60 shadow-sm flex items-start gap-4 cursor-pointer relative ${cardClass}" data-alert-id="${a.id}">
                  <!-- Colored indicator border on the left side of the agenda card -->
                  <div class="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r ${accentClass}"></div>
                  
                  <!-- Avatar -->
                  <div class="w-9 h-9 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 flex-shrink-0">
                    ${getAvatarSvg(a.senderAvatar, a.sender, 'w-full h-full')}
                  </div>

                  <!-- Alert Content details -->
                  <div class="flex-grow min-w-0 space-y-1 pl-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="block text-xs font-black text-slate-800 dark:text-slate-200 truncate">${a.sender}</span>
                      ${a.periodText ? `<span class="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md uppercase tracking-wider">${a.periodText}</span>` : ''}
                    </div>

                    <h5 class="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider ${badgeClass}">
                        ${badgeText}
                      </span>
                      <span class="truncate">${a.title}</span>
                    </h5>

                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      ${a.subject}
                    </p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Formats the label shown in the calendar controls header
   */
  private getCalendarHeaderLabel(): string {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    if (this.calendarMode === 'month') {
      return `${meses[this.calendarSelectedDate.getMonth()]} de ${this.calendarSelectedDate.getFullYear()}`;
    } else if (this.calendarMode === 'week') {
      const startOfWeek = new Date(this.calendarSelectedDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day; // adjust to Sunday
      startOfWeek.setDate(diff);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const formatPart = (d: Date) => {
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        return `${dia}/${mes}`;
      };

      return `Semana de ${formatPart(startOfWeek)} a ${formatPart(endOfWeek)}`;
    } else {
      return 'Linha do Tempo de Alertas';
    }
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
      this.render();
      this.setupEventListeners();
    };
    window.addEventListener('paxflow:new-message', (this as any)._onRealtimeInboxBound);

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

    // 1.1 Botão Ver na Escala dentro dos cards do Inbox
    document.querySelectorAll('.btn-ver-na-escala').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        this.activeTab = 'escala';
        this.render();
        this.setupEventListeners();
        if (solId) {
          this.abrirModalSolicitacaoPorId(solId);
        }
      });
    });

    const folderEnviadas = document.getElementById('folder-enviadas');
    folderEnviadas?.addEventListener('click', () => {
      this.activeTab = 'enviadas';
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

    const folderEscala = document.getElementById('folder-escala');
    folderEscala?.addEventListener('click', () => {
      this.activeTab = 'escala';
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

    const mobileFolderEscala = document.getElementById('mobile-folder-escala');
    mobileFolderEscala?.addEventListener('click', () => {
      this.activeTab = 'escala';
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

    // 5. Calendar Mode Selector Tab listeners
    document.getElementById('cal-mode-month')?.addEventListener('click', () => {
      this.calendarMode = 'month';
      this.render();
      this.setupEventListeners();
    });
    document.getElementById('cal-mode-week')?.addEventListener('click', () => {
      this.calendarMode = 'week';
      this.render();
      this.setupEventListeners();
    });
    document.getElementById('cal-mode-agenda')?.addEventListener('click', () => {
      this.calendarMode = 'agenda';
      this.render();
      this.setupEventListeners();
    });

    // 6. Calendar Temporal Navigation listeners
    document.getElementById('cal-nav-prev')?.addEventListener('click', () => {
      if (this.calendarMode === 'month') {
        this.calendarSelectedDate.setMonth(this.calendarSelectedDate.getMonth() - 1);
      } else if (this.calendarMode === 'week') {
        this.calendarSelectedDate.setDate(this.calendarSelectedDate.getDate() - 7);
      }
      this.render();
      this.setupEventListeners();
    });
    document.getElementById('cal-nav-today')?.addEventListener('click', () => {
      this.calendarSelectedDate = new Date();
      this.render();
      this.setupEventListeners();
    });
    document.getElementById('cal-nav-next')?.addEventListener('click', () => {
      if (this.calendarMode === 'month') {
        this.calendarSelectedDate.setMonth(this.calendarSelectedDate.getMonth() + 1);
      } else if (this.calendarMode === 'week') {
        this.calendarSelectedDate.setDate(this.calendarSelectedDate.getDate() + 7);
      }
      this.render();
      this.setupEventListeners();
    });

    // 7. Month View Alert Pill clicks
    const eventPills = document.querySelectorAll('.calendar-event-pill');
    eventPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita borbulhamento de clique no container
        const alertId = pill.getAttribute('data-alert-id');
        if (!alertId) return;

        const alertItem = this.filteredAlerts.find(a => a.id === alertId);
        if (alertItem) {
          this.markAlertAsRead(alertId);
          this.openEmailReaderModal(alertItem);
        }
      });
    });

    // 8. Quick Archive trigger clicks (on standard list)
    const archiveButtons = document.querySelectorAll('.btn-archive-quick');
    archiveButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Avoid opening the e-mail reader modal
        const alertId = btn.getAttribute('data-alert-id');
        if (!alertId) return;

        const alertItem = this.alerts.find(a => a.id === alertId);
        if (!alertItem) return;

        try {
          if (alertItem.type === 'manual') {
            const tableId = alertId.replace('manual-', '');
            // Update row in Supabase
            const { error } = await supabase
              .from('lembretes')
              .update({ arquivado: !alertItem.arquivado })
              .eq('id', tableId);

            if (error) throw error;
          } else if ((alertItem.type === 'mention' || alertItem.type === 'campaign_notification' || alertItem.type === 'direct_message') && alertId.startsWith('mention-')) {
            const tableId = alertId.replace('mention-', '');
            // Update row in Supabase
            const { error } = await supabase
              .from('notificacoes')
              .update({ arquivada: !alertItem.arquivado })
              .eq('id', tableId);

            if (error) throw error;
          } else {
            // Local SLA archive toggle
            this.toggleLocalAlertArchive(alertId, !alertItem.arquivado);
          }

          // Reload and update UI
          await this.loadAndBuildAlerts();
          this.render();
          this.setupEventListeners();
          
          // Toast or simple notification
          this.showToast(alertItem.arquivado ? 'Mensagem restaurada!' : 'Mensagem arquivada com sucesso!', 'success');

        } catch (err: any) {
          console.error('Erro ao atualizar mensagem:', err);
          this.showToast('Erro ao atualizar mensagem.', 'error', err);
        }
      });
    });

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

    // Bulk selection listeners
    const selectAllCheckbox = this.container.querySelector('#inbox-select-all-checkbox') as HTMLInputElement;
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', () => {
        if (selectAllCheckbox.checked) {
          this.filteredAlerts.forEach(a => this.selectedAlertIds.add(a.id));
        } else {
          this.selectedAlertIds.clear();
        }
        this.render();
        this.setupEventListeners();
      });
    }

    this.container.querySelectorAll('.inbox-item-checkbox').forEach(cb => {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', (e) => {
        const alertId = (cb as HTMLElement).dataset.alertId;
        if (alertId) {
          if ((cb as HTMLInputElement).checked) {
            this.selectedAlertIds.add(alertId);
          } else {
            this.selectedAlertIds.delete(alertId);
          }
          this.render();
          this.setupEventListeners();
        }
      });
    });

    this.container.querySelector('#btn-bulk-read')?.addEventListener('click', async () => {
      if (!this.user?.id) return;
      const ids = Array.from(this.selectedAlertIds);
      await InboxService.markAllAlertsAsRead(this.user.id, ids);
      this.selectedAlertIds.clear();
      this.readList = await InboxService.getReadAlerts(this.user.id);
      this.showToast(`${ids.length} mensagem(ns) marcada(s) como lida(s).`, 'success');
      this.render();
      this.setupEventListeners();
    });

    this.container.querySelector('#btn-bulk-unread')?.addEventListener('click', async () => {
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
    });

    this.container.querySelector('#btn-bulk-archive')?.addEventListener('click', async () => {
      const ids = Array.from(this.selectedAlertIds);
      ids.forEach(id => this.toggleLocalAlertArchive(id, true));
      this.selectedAlertIds.clear();
      this.showToast(`${ids.length} mensagem(ns) arquivada(s).`, 'success');
      await this.loadAndBuildAlerts();
      this.render();
      this.setupEventListeners();
    });

    this.container.querySelector('#btn-mark-all-read')?.addEventListener('click', async () => {
      await this.markAllAlertsAsRead();
    });

    // 9. Open Email modal reader when clicking alert cards (List, Week, or Agenda)
    const alertCards = document.querySelectorAll('.inbox-card');
    alertCards.forEach(card => {
      card.addEventListener('click', () => {
        const alertId = card.getAttribute('data-alert-id');
        if (!alertId) return;

        const alertItem = this.filteredAlerts.find(a => a.id === alertId);
        if (alertItem) {
          this.markAlertAsRead(alertId);
          this.openEmailReaderModal(alertItem);
        }
      });
    });

  }

  /**
   * Opens the Corporate styled Email modal details
   */
  private openEmailReaderModal(item: AlertItem): void {
    EmailReaderModal.open(item, {
      perfil: this.perfil,
      onMarkUnread: async (clickedItem: AlertItem) => {
        await this.markAlertAsUnread(clickedItem.id);
      },
      onArchive: async (clickedItem) => {
        try {
          if (clickedItem.type === 'manual') {
            const tableId = clickedItem.id.replace('manual-', '');
            const { error } = await supabase
              .from('lembretes')
              .update({ arquivado: !clickedItem.arquivado })
              .eq('id', tableId);

            if (error) throw error;
          } else if ((clickedItem.type === 'mention' || clickedItem.type === 'direct_message' || clickedItem.type === 'campaign_notification') && clickedItem.id.startsWith('mention-')) {
            const tableId = clickedItem.id.replace('mention-', '');
            const { error } = await supabase
              .from('notificacoes')
              .update({ arquivada: !clickedItem.arquivado })
              .eq('id', tableId);

            if (error) throw error;
          } else {
            this.toggleLocalAlertArchive(clickedItem.id, !clickedItem.arquivado);
          }

          // Reload data and redraw page
          await this.loadAndBuildAlerts();
          this.render();
          this.setupEventListeners();

          this.showToast(clickedItem.arquivado ? 'Mensagem restaurada!' : 'Mensagem arquivada!', 'success');
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
          } else {
            const tableId = clickedItem.id.replace('mention-', '').replace('sent-', '');
            const { error } = await supabase
              .from('notificacoes')
              .delete()
              .eq('id', tableId);
            if (error) throw error;
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
        if (replyItem.senderId) {
          this.openNewMessageModal({
            senderId: replyItem.senderId,
            senderNome: replyItem.sender,
            assunto: replyItem.title,
            messageId: replyItem.targetId,
            threadId: replyItem.threadId
          });
        }
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
   * Renders the Escala de Funcionários interface (Agatur style)
   */
  private renderEscalaView(): string {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthNameStr = `${monthNames[this.escalaMes - 1]} ${this.escalaAno}`;
    const dayNamesShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const daysInMonth = new Date(this.escalaAno, this.escalaMes, 0).getDate();
    const feriadosDoMes = EscalaService.getFeriadosDoMes(this.escalaAno, this.escalaMes);

    const activeEntries = Object.entries(this.escalaData);
    const isAdmin = this.perfil?.role === 'admin';

    // Regras de Navegação por Perfil (Ponto 04)
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-indexed

    let maxYear = curYear;
    let maxMonth = curMonth + 2;
    if (maxMonth > 12) {
      maxMonth -= 12;
      maxYear += 1;
    }

    const isPrevDisabled = false;
    const isNextDisabled = false;

    let html = `
      <div class="escala-container">
        
        <!-- Hero Header -->
        <section class="escala-hero">
          <div class="space-y-1 max-w-md">
            <h1>Escala da equipe</h1>
            <p>A mesma lógica da sua escala atual, com uma apresentação mais moderna e fácil de consultar.</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <!-- Month & Today Nav Bar -->
            <div class="flex items-center bg-white/10 dark:bg-slate-900/40 border border-white/15 dark:border-slate-800 rounded-xl p-1 backdrop-blur-md shrink-0">
              <button id="btn-escala-prev-month" ${isPrevDisabled ? 'disabled' : ''} class="w-7 h-7 rounded-lg flex items-center justify-center ${isPrevDisabled ? 'opacity-30 cursor-not-allowed text-white/40' : 'hover:bg-white/20 text-white font-bold transition'} text-xs">‹</button>
              <div id="escalaMonthName" class="px-2.5 text-[11px] font-black text-white min-w-[95px] text-center uppercase tracking-wide">${monthNameStr}</div>
              <button id="btn-escala-next-month" ${isNextDisabled ? 'disabled' : ''} class="w-7 h-7 rounded-lg flex items-center justify-center ${isNextDisabled ? 'opacity-30 cursor-not-allowed text-white/40' : 'hover:bg-white/20 text-white font-bold transition'} text-xs">›</button>
              <div class="h-3.5 w-px bg-white/20 mx-1"></div>
              <button id="btn-escala-hoje" class="px-2.5 py-1 hover:bg-white/20 text-white rounded-lg text-[11px] font-extrabold transition">Hoje</button>
            </div>

            <!-- Action Buttons Group -->
            <button id="btn-escala-solicitar-troca" class="h-9 px-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/20 border border-emerald-400/30 shrink-0">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Solicitar Troca / Folga</span>
            </button>
            ${isAdmin ? `
              <button id="btn-escala-export-pdf" class="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-rose-950/20 border border-rose-400/30 shrink-0" title="Exportar Escala Mensal em PDF">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span>Exportar PDF</span>
              </button>
              <button id="btn-escala-admin-edit" class="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-950/20 border border-indigo-400/30 shrink-0">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>Editar Escala</span>
              </button>
              <button id="btn-escala-gerenciar-membros" class="h-9 px-3.5 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-violet-950/20 border border-violet-400/30 shrink-0" title="Gerenciar quem participa da escala">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                <span>Integrantes</span>
              </button>
            ` : ''}
          </div>
        </section>

        <!-- Grid Table Wrapper -->
        <section class="escala-gridwrap">
          <div class="escala-toolbar">
            <div>
              <strong class="text-slate-800 dark:text-slate-100 text-sm">Escala mensal</strong>
              <div class="muted text-slate-400 text-xs">Clique em um horário para consultar ou editar.</div>
            </div>

            <!-- Legend Dots -->
            <div class="escala-legend">
              <span><i class="dot c10"></i> 10–17</span>
              <span><i class="dot c12"></i> 12–19</span>
              <span><i class="dot c14"></i> 14–21</span>
              <span><i class="dot c15"></i> 15–22</span>
              <span><i class="dot folga"></i> Folga</span>
              <span><i class="dot ferias"></i> Férias</span>
              <span><i class="dot event"></i> Reunião</span>
            </div>
          </div>

          <!-- Scrollable Table -->
          <div class="escala-table-scroll custom-scrollbar" id="escalaTableScroll">
            <table class="escala-table">
              <thead>
                <tr>
                  <th class="name-col">Equipe</th>
                  ${Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const dateObj = new Date(this.escalaAno, this.escalaMes - 1, dayNum);
                    const dayOfWeek = dateObj.getDay(); // 0 = Dom, 6 = Sáb
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const feriado = feriadosDoMes[dayNum];
                    const isToday = dayNum === now.getDate() && (now.getMonth() + 1) === this.escalaMes && now.getFullYear() === this.escalaAno;

                    let thExtraCls = '';
                    if (isToday) thExtraCls += ' escala-today-th';
                    if (feriado) thExtraCls += ' escala-holiday-th';
                    else if (isWeekend) thExtraCls += ' escala-weekend-th';

                    return `
                      <th class="${thExtraCls}" title="${feriado ? `Feriado ${feriado.tipo.toUpperCase()}: ${feriado.nome}` : dayNamesShort[dayOfWeek]}">
                        <span class="daynum">${dayNum}</span>
                        <span class="dow text-[9px] uppercase tracking-tighter">${feriado ? 'FER' : dayNamesShort[dayOfWeek]}</span>
                      </th>
                    `;
                  }).join('')}
                </tr>
              </thead>
              <tbody>
                ${activeEntries.map(([name, vals]) => {
                  let totalTrab = 0;
                  let totalFolga = 0;
                  let totalFerias = 0;

                  Array.from({ length: daysInMonth }, (_, dayIdx) => {
                    const v = vals[dayIdx] || '';
                    if (!v || v === '-' || v === '—' || v === 'F' || v.toLowerCase().includes('folga')) {
                      totalFolga++;
                    } else if (v.toLowerCase().includes('féria')) {
                      totalFerias++;
                    } else {
                      totalTrab++;
                    }
                  });

                  return `
                    <tr>
                      <td class="name-col">
                        <div class="flex items-center justify-between gap-1">
                          <div class="truncate">
                            <strong>${name}</strong>
                            <small class="text-slate-400 block">Equipe Agatur</small>
                          </div>
                          ${isAdmin ? `
                            <div class="flex flex-col items-center gap-0.5 shrink-0 opacity-80 hover:opacity-100 transition select-none">
                              <button class="btn-escala-move-up p-1 text-[9px] font-black leading-none bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-500 rounded text-slate-500 dark:text-slate-400 transition" data-name="${name}" title="Mover para cima">▲</button>
                              <button class="btn-escala-move-down p-1 text-[9px] font-black leading-none bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-500 rounded text-slate-500 dark:text-slate-400 transition" data-name="${name}" title="Mover para baixo">▼</button>
                            </div>
                          ` : ''}
                        </div>
                        <div class="flex items-center gap-1 mt-1 font-mono text-[9px]">
                          <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold" title="Dias Trabalhados">${totalTrab}d Trab</span>
                          <span class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold" title="Folgas / Descontos">${totalFolga}d Folga</span>
                          ${totalFerias > 0 ? `<span class="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold" title="Férias">${totalFerias}d Férias</span>` : ''}
                        </div>
                      </td>
                      ${Array.from({ length: daysInMonth }, (_, dayIdx) => {
                        const v = vals[dayIdx] || '';
                        const cls = EscalaService.getTurnoCls(v);
                        const dateObj = new Date(this.escalaAno, this.escalaMes - 1, dayIdx + 1);
                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        const feriado = feriadosDoMes[dayIdx + 1];

                        let tdBgCls = '';
                        if (feriado) tdBgCls = 'escala-holiday-td';
                        else if (isWeekend) tdBgCls = 'escala-weekend-td';

                        return `
                          <td class="${tdBgCls}">
                            <div class="escala-cell ${cls}" data-escala-consultor="${name}" data-escala-day="${dayIdx}">
                              ${v || '—'}
                            </div>
                          </td>
                        `;
                      }).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Bottom Cards: Banco de Folgas & Treinamentos/Eventos -->
        <div class="escala-bottom-grid">
          
          <!-- Banco de Folgas Card -->
          <section class="escala-card">
            <div class="escala-card-head">
              <h2 class="flex items-center gap-2 font-black text-slate-800 dark:text-slate-100 text-sm">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </span>
                Banco de folgas
              </h2>
              <div class="flex items-center gap-2">
                <span class="escala-badge">Saldo atual</span>
                ${isAdmin ? `
                  <button id="btn-edit-banco-folgas" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">Editar</button>
                ` : ''}
              </div>
            </div>
            <div>
              ${this.bancoFolgasData.map(b => `
                <div class="escala-row">
                  <strong class="text-slate-800 dark:text-slate-100">${b.consultor_nome}</strong>
                  <span class="escala-balance">${b.saldo_dias}</span>
                  <span class="text-xs text-slate-400 truncate" title="${b.detalhes_historico}">${b.detalhes_historico}</span>
                </div>
              `).join('')}
            </div>
          </section>

          <!-- Treinamentos · Coffee · Eventos Card -->
          <section class="escala-card">
            <div class="escala-card-head">
              <h2 class="flex items-center gap-2 font-black text-slate-800 dark:text-slate-100 text-sm">
                <span class="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </span>
                Treinamentos · Coffee · Eventos
              </h2>
              <div class="flex items-center gap-2">
                <span class="escala-badge">${monthNames[this.escalaMes - 1]}</span>
                ${isAdmin ? `
                  <button id="btn-add-evento-escala" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">+ Adicionar</button>
                ` : ''}
              </div>
            </div>
            <div class="space-y-2">
              ${(() => {
                const mesStr = String(this.escalaMes).padStart(2, '0');
                const eventosDoMes = (this.eventosEscalaData || []).filter(ev => {
                  if (!ev.data) return false;
                  return ev.data.includes(`/${mesStr}`) || ev.data.includes(`/${this.escalaMes}`);
                });

                if (eventosDoMes.length === 0) {
                  return `<div class="text-xs text-slate-400 italic p-3 text-center">Nenhum evento registrado em ${monthNames[this.escalaMes - 1]}.</div>`;
                }

                return eventosDoMes.map(ev => `
                  <div class="escala-eventrow flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="escala-event-date">${ev.data}</div>
                      <div>
                        <strong class="text-slate-800 dark:text-slate-100 text-xs">${ev.consultor_nome}</strong>
                        <div class="text-xs text-slate-400 font-medium">${ev.titulo}</div>
                      </div>
                    </div>
                    ${isAdmin ? `
                      <button data-delete-evento-id="${ev.id}" class="text-slate-400 hover:text-rose-600 p-1 transition" title="Excluir evento">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    ` : ''}
                  </div>
                `).join('');
              })()}
            </div>
          </section>

        </div>

      </div>
    `;

    return html;
  }

  /**
   * Sets up event listeners for the Escala View
   */
  private setupEscalaEventListeners(): void {
    // Prev / Next Month
    document.getElementById('btn-escala-prev-month')?.addEventListener('click', async () => {
      if (this.escalaMes > 1) {
        this.escalaMes--;
      } else {
        this.escalaMes = 12;
        this.escalaAno--;
      }
      await this.loadEscalaData();
      this.render();
      this.setupEventListeners();
    });

    document.getElementById('btn-escala-next-month')?.addEventListener('click', async () => {
      if (this.escalaMes < 12) {
        this.escalaMes++;
      } else {
        this.escalaMes = 1;
        this.escalaAno++;
      }
      await this.loadEscalaData();
      this.render();
      this.setupEventListeners();
    });

    // Scroll helper for HOJE
    const scrollToToday = (behavior: ScrollBehavior = 'smooth') => {
      const scroll = document.getElementById('escalaTableScroll');
      const todayTh = document.querySelector('.escala-today-th') as HTMLElement;
      if (scroll) {
        if (todayTh) {
          scroll.scrollTo({ left: Math.max(0, todayTh.offsetLeft - 220), behavior });
        } else {
          const todayNum = new Date().getDate();
          scroll.scrollTo({ left: Math.max(0, (todayNum - 3) * 45), behavior });
        }
      }
    };

    // Hoje button click
    document.getElementById('btn-escala-hoje')?.addEventListener('click', async () => {
      const now = new Date();
      this.escalaAno = now.getFullYear();
      this.escalaMes = now.getMonth() + 1;
      await this.loadEscalaData();
      this.render();
      this.setupEventListeners();
      setTimeout(() => scrollToToday('smooth'), 60);
    });

    // Auto-focus on HOJE immediately when the module opens
    setTimeout(() => scrollToToday('auto'), 60);

    // Admin Export PDF Button
    document.getElementById('btn-escala-export-pdf')?.addEventListener('click', () => {
      this.exportarEscalaPDF();
    });

    // Admin Gerenciar Integrantes Button
    document.getElementById('btn-escala-gerenciar-membros')?.addEventListener('click', () => {
      this.openGerenciarMembrosEscalaModal();
    });

    // Admin Edit Button
    document.getElementById('btn-escala-admin-edit')?.addEventListener('click', () => {
      this.openAdminCellEditModal('Eduardo', 24, this.escalaData['Eduardo']?.[24] || '');
    });

    // Consultor Solicitar Troca Button
    document.getElementById('btn-escala-solicitar-troca')?.addEventListener('click', () => {
      this.openSolicitarTrocaModal();
    });

    // Cell clicks
    document.querySelectorAll('.escala-cell').forEach(cellEl => {
      cellEl.addEventListener('click', () => {
        const consultor = cellEl.getAttribute('data-escala-consultor') || '';
        const dayIdx = parseInt(cellEl.getAttribute('data-escala-day') || '0', 10);
        const valorAtual = this.escalaData[consultor]?.[dayIdx] || '';

        if (this.perfil?.role === 'admin') {
          this.openAdminCellEditModal(consultor, dayIdx, valorAtual);
        } else {
          this.openSolicitarTrocaModal(consultor, dayIdx);
        }
      });
    });

    // Edit Banco de Folgas
    document.getElementById('btn-edit-banco-folgas')?.addEventListener('click', () => {
      this.openBancoFolgasModal();
    });

    // Add Evento
    document.getElementById('btn-add-evento-escala')?.addEventListener('click', () => {
      this.openAddEventoModal();
    });

    // Delete Evento
    document.querySelectorAll('[data-delete-evento-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const evId = btn.getAttribute('data-delete-evento-id');
        if (evId) {
          const confirmed = await showCustomConfirm(
            'Deseja realmente excluir este treinamento/evento?',
            'Excluir Evento',
            { isDestructive: true, confirmText: 'Excluir' }
          );
          if (confirmed) {
            await EscalaService.deletarEvento(evId);
            this.showToast('Evento excluído com sucesso.', 'success');
            await this.loadEscalaData();
            this.render();
            this.setupEventListeners();
          }
        }
      });
    });

    // Mover Consultor para Cima / Baixo na Escala
    this.container.querySelectorAll('.btn-escala-move-up').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = btn.getAttribute('data-name');
        if (!name) return;

        const currentOrder = Object.keys(this.escalaData);
        const idx = currentOrder.indexOf(name);
        if (idx > 0) {
          const temp = currentOrder[idx - 1];
          currentOrder[idx - 1] = currentOrder[idx];
          currentOrder[idx] = temp;

          await EscalaService.salvarOrdemConsultores(currentOrder);
          await this.loadEscalaData();
          this.render();
          this.setupEventListeners();
        }
      });
    });

    this.container.querySelectorAll('.btn-escala-move-down').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = btn.getAttribute('data-name');
        if (!name) return;

        const currentOrder = Object.keys(this.escalaData);
        const idx = currentOrder.indexOf(name);
        if (idx !== -1 && idx < currentOrder.length - 1) {
          const temp = currentOrder[idx + 1];
          currentOrder[idx + 1] = currentOrder[idx];
          currentOrder[idx] = temp;

          await EscalaService.salvarOrdemConsultores(currentOrder);
          await this.loadEscalaData();
          this.render();
          this.setupEventListeners();
        }
      });
    });
  }

  /**
   * Modal: Admin Edit Cell
   */
  private openAdminCellEditModal(consultor: string, dayIdx: number, valorAtual: string): void {
    const dayNum = dayIdx + 1;
    const dateStr = `${dayNum}/${String(this.escalaMes).padStart(2, '0')}/${this.escalaAno}`;

    const modalHtml = `
      <div id="escala-edit-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100">${consultor} • ${dateStr}</h3>
              <p class="text-xs text-slate-400 font-semibold">${valorAtual ? `Atual: ${valorAtual}` : 'Sem escala cadastrada'}</p>
            </div>
            <button id="modal-escala-close" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3">
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">Horário / Situação Padrão</label>
            <select id="modal-escala-select" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— Vazio / Limpar —</option>
              ${TURNO_PRESETS.map(p => `
                <option value="${p.codigo}" ${valorAtual === p.codigo ? 'selected' : ''}>${p.codigo} (${p.label})</option>
              `).join('')}
            </select>

            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 pt-1">Ou Digite Texto Livre / Observação Customizada</label>
            <input id="modal-escala-custom" type="text" placeholder="Ex: Reunião Matriz, Treinamento às 14h..." value="${TURNO_PRESETS.some(p => p.codigo === valorAtual) ? '' : valorAtual}" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button id="modal-escala-batch" class="px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5">
              <span>⚡</span> Preencher Mês em Lote
            </button>
            <div class="flex gap-2">
              <button id="modal-escala-cancel" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">Cancelar</button>
              <button id="modal-escala-save" class="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20">Salvar Alteração</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild!);

    const backdrop = document.getElementById('escala-edit-modal-backdrop')!;
    const closeBtn = document.getElementById('modal-escala-close')!;
    const cancelBtn = document.getElementById('modal-escala-cancel')!;
    const saveBtn = document.getElementById('modal-escala-save')!;
    const batchBtn = document.getElementById('modal-escala-batch')!;

    const close = () => backdrop.remove();

    closeBtn.onclick = close;
    cancelBtn.onclick = close;

    batchBtn.onclick = () => {
      close();
      this.openAdminBatchFillModal(consultor);
    };

    saveBtn.onclick = async () => {
      const selectVal = (document.getElementById('modal-escala-select') as HTMLSelectElement).value;
      const customVal = (document.getElementById('modal-escala-custom') as HTMLInputElement).value.trim();
      const finalVal = customVal || selectVal;

      await EscalaService.salvarCelulaEscala(this.escalaAno, this.escalaMes, consultor, dayIdx, finalVal);
      await this.loadEscalaData();
      close();
      this.showToast('Escala atualizada com sucesso!', 'success');
      this.render();
      this.setupEventListeners();
    };
  }

  /**
   * Modal: Admin Batch Fill Month Schedule
   */
  private openAdminBatchFillModal(consultor: string): void {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthNameStr = `${monthNames[this.escalaMes - 1]} / ${this.escalaAno}`;

    const modalHtml = `
      <div id="escala-batch-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">⚡</span>
                Preenchimento em Lote • ${consultor}
              </h3>
              <p class="text-xs text-slate-400 font-semibold mt-0.5">Aplicar padrão para todo o mês de ${monthNameStr}</p>
            </div>
            <button id="modal-batch-close" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Turno Padrão de Trabalho</label>
              <select id="modal-batch-turno" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                ${TURNO_PRESETS.filter(p => !['Folga', 'Férias', 'F'].includes(p.codigo)).map(p => `
                  <option value="${p.codigo}">${p.codigo} (${p.label})</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Dias de Folga Semanal Fixa</label>
              <div class="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800">
                <label class="flex items-center gap-2"><input type="checkbox" value="6" checked class="batch-folga-check accent-indigo-600" /> Sábado</label>
                <label class="flex items-center gap-2"><input type="checkbox" value="0" checked class="batch-folga-check accent-indigo-600" /> Domingo</label>
                <label class="flex items-center gap-2"><input type="checkbox" value="1" class="batch-folga-check accent-indigo-600" /> Segunda</label>
                <label class="flex items-center gap-2"><input type="checkbox" value="2" class="batch-folga-check accent-indigo-600" /> Terça</label>
                <label class="flex items-center gap-2"><input type="checkbox" value="3" class="batch-folga-check accent-indigo-600" /> Quarta</label>
                <label class="flex items-center gap-2"><input type="checkbox" value="4" class="batch-folga-check accent-indigo-600" /> Quinta</label>
                <label class="flex items-center gap-2"><input type="checkbox" value="5" class="batch-folga-check accent-indigo-600" /> Sexta</label>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button id="modal-batch-cancel" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">Cancelar</button>
            <button id="modal-batch-apply" class="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20">Aplicar Padrão Mensal</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    const modalEl = div.firstElementChild!;
    document.body.appendChild(modalEl);

    const close = () => modalEl.remove();
    (modalEl.querySelector('#modal-batch-close') as HTMLElement).onclick = close;
    (modalEl.querySelector('#modal-batch-cancel') as HTMLElement).onclick = close;

    (modalEl.querySelector('#modal-batch-apply') as HTMLElement).onclick = async () => {
      const turnoPadrao = (modalEl.querySelector('#modal-batch-turno') as HTMLSelectElement).value;
      const folgaChecks = modalEl.querySelectorAll<HTMLInputElement>('.batch-folga-check:checked');
      const diasFolga = Array.from(folgaChecks).map(c => parseInt(c.value, 10));

      await EscalaService.preencherMesEmLote(this.escalaAno, this.escalaMes, consultor, turnoPadrao, diasFolga);
      close();
      this.showToast(`Padrão mensal aplicado para ${consultor}!`, 'success');
      await this.loadEscalaData();
      this.render();
      this.setupEventListeners();
    };
  }

  /**
   * Modal: Consultor Request Swap / Off
   */
  private openSolicitarTrocaModal(targetConsultor?: string, targetDayIdx?: number): void {
    const initialDay = targetDayIdx !== undefined ? targetDayIdx + 1 : new Date().getDate();
    const dateStr = `${this.escalaAno}-${String(this.escalaMes).padStart(2, '0')}-${String(initialDay).padStart(2, '0')}`;

    const otherConsultants = (this.consultants || []).filter(c => c.nome !== this.perfil?.nome);

    const modalHtml = `
      <div id="escala-solicitar-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </span>
                Solicitar Alteração de Escala
              </h3>
              <p class="text-xs text-slate-400 font-semibold mt-0.5">Envie uma solicitação para a equipe ou gestão.</p>
            </div>
            <button id="modal-solicitar-close" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tipo de Solicitação</label>
              <select id="solicitar-tipo" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="troca">Troca de Turno com Colega</option>
                <option value="folga">Solicitação de Folga Semanal</option>
                <option value="ferias">Solicitação de Férias</option>
              </select>
            </div>

            <div>
              <label id="label-data-origem" class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Data de Início / Turno</label>
              <input id="solicitar-data-origem" type="date" value="${dateStr}" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div id="block-colega">
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Colega para Troca</label>
              <select id="solicitar-destinatario" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                ${otherConsultants.length > 0 ? otherConsultants.map(c => `
                  <option value="${c.id}" data-nome="${c.nome}" ${targetConsultor === c.nome ? 'selected' : ''}>${c.nome}</option>
                `).join('') : `
                  <option value="c-1" data-nome="Marinna">Marinna</option>
                  <option value="c-2" data-nome="Maria">Maria</option>
                  <option value="c-3" data-nome="Rafael">Rafael</option>
                  <option value="c-4" data-nome="Guto">Guto</option>
                `}
              </select>
            </div>

            <div id="block-data-destino">
              <label id="label-data-destino" class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Data de Fim / Término</label>
              <input id="solicitar-data-destino" type="date" value="${dateStr}" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Motivo / Justificativa</label>
              <textarea id="solicitar-motivo" rows="2" placeholder="Ex: Preciso realizar um exame médico nesta data..." class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button id="modal-solicitar-cancel" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">Cancelar</button>
            <button id="modal-solicitar-submit" class="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20">Enviar Solicitação</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild!);

    const backdrop = document.getElementById('escala-solicitar-modal-backdrop')!;
    const closeBtn = document.getElementById('modal-solicitar-close')!;
    const cancelBtn = document.getElementById('modal-solicitar-cancel')!;
    const submitBtn = document.getElementById('modal-solicitar-submit')!;
    const tipoSelect = document.getElementById('solicitar-tipo') as HTMLSelectElement;
    const blockColega = document.getElementById('block-colega')!;
    const blockDataDestino = document.getElementById('block-data-destino')!;

    const labelOrigem = document.getElementById('label-data-origem');
    const labelDestino = document.getElementById('label-data-destino');

    const updateFormFields = () => {
      const val = tipoSelect.value;
      if (val === 'troca') {
        blockColega.style.display = 'block';
        blockDataDestino.style.display = 'block';
        if (labelOrigem) labelOrigem.innerText = 'Sua Data do Turno';
        if (labelDestino) labelDestino.innerText = 'Data do Turno do Colega (Para Troca)';
      } else if (val === 'ferias') {
        blockColega.style.display = 'none';
        blockDataDestino.style.display = 'block';
        if (labelOrigem) labelOrigem.innerText = 'Data de Início das Férias';
        if (labelDestino) labelDestino.innerText = 'Data de Fim das Férias';
      } else { // folga
        blockColega.style.display = 'none';
        blockDataDestino.style.display = 'none';
        if (labelOrigem) labelOrigem.innerText = 'Data Alvo da Folga';
      }
    };

    tipoSelect.onchange = updateFormFields;
    updateFormFields();

    const close = () => backdrop.remove();
    closeBtn.onclick = close;
    cancelBtn.onclick = close;

    submitBtn.onclick = async () => {
      const tipo = tipoSelect.value as 'troca' | 'folga' | 'ferias';
      const dataOrigem = (document.getElementById('solicitar-data-origem') as HTMLInputElement).value;
      const dataDestino = (document.getElementById('solicitar-data-destino') as HTMLInputElement)?.value;
      const motivo = (document.getElementById('solicitar-motivo') as HTMLTextAreaElement).value.trim();

      const destSelect = document.getElementById('solicitar-destinatario') as HTMLSelectElement;
      const selectedOpt = destSelect?.options[destSelect.selectedIndex];
      const destinatarioId = destSelect?.value || '';
      const destinatarioNome = selectedOpt?.getAttribute('data-nome') || selectedOpt?.text || 'Colega';

      const solicitanteNome = this.perfil?.nome || 'Consultor';

      await EscalaService.criarSolicitacao({
        tipo,
        solicitante_id: this.user?.id || 'usr-1',
        solicitante_nome: solicitanteNome,
        destinatario_id: tipo === 'troca' ? destinatarioId : undefined,
        destinatario_nome: tipo === 'troca' ? destinatarioNome : undefined,
        data_origem: dataOrigem,
        data_destino: tipo === 'folga' ? dataOrigem : (dataDestino || dataOrigem),
        motivo,
        status: tipo === 'troca' ? 'pendente_colega' : 'pendente_admin'
      });

      close();
      this.showToast('Solicitação enviada com sucesso! Notificação gerada no Inbox.', 'success');
      await this.loadAndBuildAlerts();
      this.render();
      this.setupEventListeners();
    };
  }

  /**
   * Modal: Add Event / Training
   */
  private openAddEventoModal(): void {
    const modalHtml = `
      <div id="escala-evento-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 class="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <span class="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              </span>
              Adicionar Treinamento / Evento
            </h3>
            <button id="modal-evento-close" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Data (Ex: 18/08)</label>
              <input id="evento-data" type="text" placeholder="18/08" value="18/08" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Consultor / Responsável</label>
              <input id="evento-consultor" type="text" placeholder="Ex: Eduardo ou Equipe" value="Eduardo" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Título do Evento</label>
              <input id="evento-titulo" type="text" placeholder="Ex: SACFLOW às 14:30" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button id="modal-evento-cancel" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">Cancelar</button>
            <button id="modal-evento-save" class="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20">Salvar Evento</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild!);

    const backdrop = document.getElementById('escala-evento-modal-backdrop')!;
    const closeBtn = document.getElementById('modal-evento-close')!;
    const cancelBtn = document.getElementById('modal-evento-cancel')!;
    const saveBtn = document.getElementById('modal-evento-save')!;

    const close = () => backdrop.remove();
    closeBtn.onclick = close;
    cancelBtn.onclick = close;

    saveBtn.onclick = async () => {
      const data = (document.getElementById('evento-data') as HTMLInputElement).value;
      const consultor_nome = (document.getElementById('evento-consultor') as HTMLInputElement).value;
      const titulo = (document.getElementById('evento-titulo') as HTMLInputElement).value.trim();

      if (!titulo) return;

      await EscalaService.adicionarEvento({ data, consultor_nome, titulo });
      await this.loadEscalaData();
      close();
      this.showToast('Evento cadastrado na agenda!', 'success');
      this.render();
      this.setupEventListeners();
    };
  }

  /**
   * Modal: Edit Leave Bank Balances
   */
  private openBancoFolgasModal(): void {
    const modalHtml = `
      <div id="escala-banco-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 class="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <span class="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </span>
              Editar Banco de Folgas
            </h3>
            <button id="modal-banco-close" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <div id="banco-folgas-inputs" class="space-y-4">
            ${this.bancoFolgasData.map((b, idx) => `
              <div class="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-800/40">
                <strong class="text-xs font-black text-slate-800 dark:text-slate-100">${b.consultor_nome}</strong>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400">Saldo (Dias)</label>
                    <input type="text" value="${b.saldo_dias}" data-banco-idx="${idx}" data-field="saldo" class="w-full text-xs font-extrabold p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-slate-400">Detalhes / Justificativas</label>
                    <input type="text" value="${b.detalhes_historico}" data-banco-idx="${idx}" data-field="historico" class="w-full text-xs font-medium p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button id="modal-banco-cancel" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">Cancelar</button>
            <button id="modal-banco-save" class="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20">Salvar Saldos</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild!);

    const backdrop = document.getElementById('escala-banco-modal-backdrop')!;
    const closeBtn = document.getElementById('modal-banco-close')!;
    const cancelBtn = document.getElementById('modal-banco-cancel')!;
    const saveBtn = document.getElementById('modal-banco-save')!;

    const close = () => backdrop.remove();
    closeBtn.onclick = close;
    cancelBtn.onclick = close;

    saveBtn.onclick = async () => {
      const inputs = document.querySelectorAll('#banco-folgas-inputs input[data-banco-idx]');
      inputs.forEach(inp => {
        const idx = parseInt(inp.getAttribute('data-banco-idx') || '0', 10);
        const field = inp.getAttribute('data-field');
        const val = (inp as HTMLInputElement).value;
        if (field === 'saldo') this.bancoFolgasData[idx].saldo_dias = val;
        if (field === 'historico') this.bancoFolgasData[idx].detalhes_historico = val;
      });

      await EscalaService.salvarBancoFolgas(this.bancoFolgasData);
      close();
      this.showToast('Banco de folgas atualizado!', 'success');
      this.render();
      this.setupEventListeners();
    };
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

  /**
   * Opens modal for Admin to manage who participates in the schedule
   */
  private openGerenciarMembrosEscalaModal(): void {
    const backdrop = document.createElement('div');
    backdrop.id = 'escala-membros-modal-backdrop';
    backdrop.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in';

    const membersListHtml = (this.consultants || []).map(c => {
      const isChecked = c.participa_escala !== false && c.participaEscala !== false;
      return `
        <div class="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <strong class="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">${c.nome}</strong>
            <span class="text-[10px] text-slate-400 block">${c.email} • ${c.role === 'admin' ? 'ADMIN' : 'Consultor'}</span>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" data-profile-id="${c.id}" ${isChecked ? 'checked' : ''} class="sr-only peer member-escala-toggle">
            <div class="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      `;
    }).join('');

    backdrop.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 class="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </span>
            Integrantes da Escala
          </h3>
          <button id="modal-membros-close" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400">Marque quem participa da grade mensal. Funcionários desmarcados serão omitidos da tabela de escala e do Banco de Folgas.</p>

        <div class="space-y-2">
          ${membersListHtml || '<div class="text-xs text-slate-400 p-2">Nenhum membro cadastrado encontrado.</div>'}
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button id="modal-membros-save" class="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-md shadow-indigo-600/20">Salvar Alterações</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.querySelector('#modal-membros-close')?.addEventListener('click', () => backdrop.remove());

    backdrop.querySelector('#modal-membros-save')?.addEventListener('click', async () => {
      const saveBtn = backdrop.querySelector('#modal-membros-save') as HTMLButtonElement;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';

      try {
        const toggles = backdrop.querySelectorAll<HTMLInputElement>('.member-escala-toggle');
        for (const toggle of Array.from(toggles)) {
          const profileId = toggle.getAttribute('data-profile-id');
          const isChecked = toggle.checked;
          if (profileId) {
            await supabase
              .from('profiles')
              .update({ participa_escala: isChecked })
              .eq('id', profileId);

            const found = (this.consultants || []).find(c => c.id === profileId);
            if (found) {
              found.participa_escala = isChecked;
              found.participaEscala = isChecked;
            }
          }
        }

        this.showToast('Integrantes da escala atualizados!', 'success');
        backdrop.remove();
        await this.loadEscalaData();
        this.render();
        this.setupEventListeners();

      } catch (err: any) {
        console.error('Erro ao salvar integrantes da escala:', err);
        this.showToast('Erro ao salvar integrantes.', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Alterações';
      }
    });
  }

  /**
   * Exporta a escala mensal atual em um PDF formatado para controle jurídico/arquivamento
   */
  private exportarEscalaPDF(): void {
    const daysInMonth = new Date(this.escalaAno, this.escalaMes, 0).getDate();
    const feriadosDoMes = EscalaService.getFeriadosDoMes(this.escalaAno, this.escalaMes);
    const dayNamesShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthStr = `${monthNames[this.escalaMes - 1]} / ${this.escalaAno}`;
    const activeEntries = Object.entries(this.escalaData);

    const win = window.open('', '_blank');
    if (!win) {
      this.showToast('Permita popups para exportar a escala em PDF.', 'error');
      return;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Escala de Funcionários - ${monthStr}</title>
        <style>
          @page { size: landscape; margin: 8mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 10px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
          .header p { margin: 3px 0 0 0; color: #64748b; font-size: 10px; }
          .badge-juridico { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 10px; border: 1px solid #c7d2fe; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
          th, td { border: 1px solid #cbd5e1; text-align: center; padding: 5px 2px; font-size: 9px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
          th.weekend { background-color: #fef3c7; color: #92400e; }
          th.holiday { background-color: #ffe4e6; color: #9f1239; }
          td.name-col { text-align: left; font-weight: bold; width: 140px; background-color: #f8fafc; padding-left: 6px; }
          .shift-c10 { background: #e0f2fe; color: #0369a1; font-weight: bold; }
          .shift-c12 { background: #e0e7ff; color: #4338ca; font-weight: bold; }
          .shift-c14 { background: #fae8ff; color: #86198f; font-weight: bold; }
          .shift-c15 { background: #fce7f3; color: #9d174d; font-weight: bold; }
          .shift-folga { background: #dcfce7; color: #15803d; font-weight: bold; }
          .shift-ferias { background: #ffedd5; color: #c2410c; font-weight: bold; }
          .shift-event { background: #f1f5f9; color: #475569; font-style: italic; }
          .legend { display: flex; gap: 12px; font-size: 9px; margin-top: 15px; padding: 8px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
          .legend-item { display: flex; align-items: center; gap: 4px; }
          .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
          .sig-box { width: 42%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 10px; color: #475569; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>PaxFlow — Escala Mensal de Trabalho</h1>
            <p>Agência de Viagens • Documento Oficial para Registro Operacional e Jurídico</p>
          </div>
          <div style="text-align: right;">
            <span class="badge-juridico">Referência: ${monthStr}</span>
            <div style="font-size: 8px; color: #64748b; margin-top: 5px;">Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="name-col">Colaborador / Turno</th>
              ${Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dateObj = new Date(this.escalaAno, this.escalaMes - 1, dayNum);
                const dow = dateObj.getDay();
                const isWeekend = dow === 0 || dow === 6;
                const feriado = feriadosDoMes[dayNum];
                const cls = feriado ? 'holiday' : isWeekend ? 'weekend' : '';
                return `
                  <th class="${cls}">
                    <div>${dayNum}</div>
                    <div style="font-size: 7px;">${feriado ? 'FER' : dayNamesShort[dow]}</div>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${activeEntries.map(([name, vals]) => `
              <tr>
                <td class="name-col">${name}</td>
                ${Array.from({ length: daysInMonth }, (_, dayIdx) => {
                  const v = vals[dayIdx] || '—';
                  let shiftCls = '';
                  if (v.includes('10') || v.includes('11')) shiftCls = 'shift-c10';
                  else if (v.includes('12') || v.includes('13')) shiftCls = 'shift-c12';
                  else if (v.includes('14')) shiftCls = 'shift-c14';
                  else if (v.includes('15')) shiftCls = 'shift-c15';
                  else if (v.toLowerCase().includes('folga')) shiftCls = 'shift-folga';
                  else if (v.toLowerCase().includes('féria')) shiftCls = 'shift-ferias';
                  else if (v.toLowerCase().includes('reuniã')) shiftCls = 'shift-event';

                  return `<td class="${shiftCls}">${v}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="legend">
          <strong>Legenda dos Turnos:</strong>
          <span class="legend-item"><span class="shift-c10" style="padding: 1px 4px;">10-17 / 11-18</span> Manhã/Tarde</span>
          <span class="legend-item"><span class="shift-c12" style="padding: 1px 4px;">12-19 / 13-20</span> Intermediário</span>
          <span class="legend-item"><span class="shift-c14" style="padding: 1px 4px;">14-21</span> Tarde/Noite</span>
          <span class="legend-item"><span class="shift-c15" style="padding: 1px 4px;">15-22</span> Fechamento</span>
          <span class="legend-item"><span class="shift-folga" style="padding: 1px 4px;">Folga</span> DSR / Folga</span>
          <span class="legend-item"><span class="shift-ferias" style="padding: 1px 4px;">Férias</span> Férias</span>
        </div>

        <div class="footer-signatures">
          <div class="sig-box">
            <strong>Gerência Operacional / RH</strong><br>
            Visto de Aprovação da Escala
          </div>
          <div class="sig-box">
            <strong>Supervisão de Equipe</strong><br>
            Conferência de Cumpriação de Turnos
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    win.document.write(printHtml);
    win.document.close();
  }

  /**
   * Abre o modal de aprovação/rejeição para a gerência diretamente a partir do botão "Ver na Escala" do Inbox
   */
  private async abrirModalSolicitacaoPorId(solId: string): Promise<void> {
    const list = await EscalaService.loadSolicitacoes();
    const sol = list.find(s => s.id === solId);
    if (!sol) {
      this.showToast('Solicitação de escala não encontrada.', 'error');
      return;
    }

    const isUserColega = (String(sol.destinatario_id) === String(this.user?.id) || sol.destinatario_nome === this.perfil?.nome);
    const isPendenteColega = sol.status === 'pendente_colega';

    let actionButtonsHtml = '';
    if (isPendenteColega && isUserColega) {
      actionButtonsHtml = `
        <button id="btn-decidir-recusar" class="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition">Recusar Troca</button>
        <button id="btn-decidir-aprovar" class="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20">Aceitar e Enviar para Gestão</button>
      `;
    } else {
      actionButtonsHtml = `
        <button id="btn-decidir-recusar" class="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition">Recusar</button>
        <button id="btn-decidir-aprovar" class="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20">Aprovar e Atualizar Escala</button>
      `;
    }

    const modalHtml = `
      <div id="escala-decidir-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </span>
                Análise de Solicitação de Escala
              </h3>
              <p class="text-xs text-slate-400 font-semibold mt-0.5">Decisão operacional da agência</p>
            </div>
            <button id="modal-decidir-close" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-800">
              <p><strong>Solicitante:</strong> ${sol.solicitante_nome}</p>
              <p><strong>Tipo:</strong> ${sol.tipo === 'troca' ? 'Troca de Turno' : sol.tipo === 'folga' ? 'Folga Semanal' : sol.tipo === 'atendimento_balcao' ? '🤝 Atendimento de Balcão' : 'Férias'}</p>
              <p><strong>Data Solicitante (Origem):</strong> ${formatarDataBR(sol.data_origem)}</p>
              ${sol.destinatario_nome ? `<p><strong>Troca com Colega:</strong> ${sol.destinatario_nome}</p>` : ''}
              ${sol.data_destino ? `<p><strong>Data do Colega (Destino):</strong> ${formatarDataBR(sol.data_destino)}</p>` : ''}
              <p><strong>Motivo:</strong> ${sol.motivo || 'Sem justificativa informada'}</p>
              <p><strong>Status Atual:</strong> <span class="px-2 py-0.5 rounded text-[10px] font-bold ${sol.status === 'aprovado' ? 'bg-emerald-500/20 text-emerald-600' : sol.status === 'recusado' ? 'bg-rose-500/20 text-rose-600' : 'bg-amber-500/20 text-amber-600'}">${sol.status === 'aprovado' ? 'Aprovada' : sol.status === 'recusado' ? 'Recusada' : 'Em Análise'}</span></p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Observação / Justificativa</label>
              <input id="decidir-resposta-admin" type="text" placeholder="Ex: De acordo com a troca de horário..." class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            ${actionButtonsHtml}
          </div>
        </div>
      </div>
    `;

    const backdrop = document.createElement('div');
    backdrop.innerHTML = modalHtml;
    const modalEl = backdrop.firstElementChild!;
    document.body.appendChild(modalEl);

    const closeBtn = modalEl.querySelector('#modal-decidir-close')!;
    const btnAprovar = modalEl.querySelector('#btn-decidir-aprovar')!;
    const btnRecusar = modalEl.querySelector('#btn-decidir-recusar')!;

    const close = () => modalEl.remove();
    (closeBtn as HTMLElement).onclick = close;

    (btnAprovar as HTMLElement).onclick = async () => {
      const resp = (modalEl.querySelector('#decidir-resposta-admin') as HTMLInputElement).value.trim();
      const novoStatus = isPendenteColega ? 'pendente_admin' : 'aprovado';
      await EscalaService.atualizarStatusSolicitacao(sol.id, novoStatus, resp);
      close();
      const msg = isPendenteColega ? 'Troca aceita! Encaminhada para aprovação da gestão.' : 'Solicitação aprovada e escala atualizada!';
      this.showToast(msg, 'success');
      await this.loadEscalaData();
      await this.loadAndBuildAlerts();
      this.render();
      this.setupEventListeners();
    };

    (btnRecusar as HTMLElement).onclick = async () => {
      const resp = (modalEl.querySelector('#decidir-resposta-admin') as HTMLInputElement).value.trim();
      await EscalaService.atualizarStatusSolicitacao(sol.id, 'recusado', resp);
      close();
      this.showToast('Solicitação recusada com sucesso.', 'success');
      await this.loadEscalaData();
      await this.loadAndBuildAlerts();
      this.render();
      this.setupEventListeners();
    };
  }
}

