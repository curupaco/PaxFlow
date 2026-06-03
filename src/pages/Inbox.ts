import { supabase, getSessaoAtual, logoutConsultor } from '../services/supabase';
import { PerfilConsultor, Lembrete, Orcamento, Cliente } from '../types';
import { getAvatarSvg } from '../services/avatars';
import { showCustomConfirm, showCustomAlert } from '../services/dialog';

// Inject premium styling for the Inbox dashboard
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .inbox-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .inbox-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1);
    }
    .inbox-glass {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.4);
    }
    .dark .inbox-glass {
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .badge-gradient-indigo {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    }
    .badge-gradient-amber {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    .badge-gradient-rose {
      background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 5px;
      height: 5px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(156, 163, 175, 0.3);
      border-radius: 9999px;
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(71, 85, 105, 0.4);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(156, 163, 175, 0.5);
    }
    @keyframes ring-glow {
      0% {
        box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
      }
      70% {
        box-shadow: 0 0 0 6px rgba(245, 158, 11, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
      }
    }
    .unread-avatar-glow {
      animation: ring-glow 2s infinite;
      box-shadow: 0 0 0 2.5px #f59e0b;
      border-radius: 0.75rem;
    }

    /* Premium Calendar Grid Styles */
    .calendar-container {
      background: rgba(255, 255, 255, 0.4);
      border-radius: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(12px);
    }
    .dark .calendar-container {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 1px;
      background: rgba(226, 232, 240, 0.8);
      border-radius: 1.25rem;
      overflow: hidden;
      border: 1px solid rgba(226, 232, 240, 0.8);
    }
    .dark .calendar-grid {
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid rgba(51, 65, 85, 0.5);
    }
    .calendar-day-header {
      background: #f8fafc;
      padding: 0.75rem 0.5rem;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .dark .calendar-day-header {
      background: #0f172a;
      color: #94a3b8;
    }
    .calendar-day-cell {
      background: #ffffff;
      min-height: 120px;
      padding: 0.5rem;
      transition: background-color 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      position: relative;
      min-width: 0; /* Lock standard content contraction */
    }
    .dark .calendar-day-cell {
      background: #1e293b;
    }
    .calendar-day-cell:hover {
      background: #f1f5f9;
    }
    .dark .calendar-day-cell:hover {
      background: #334155;
    }
    .calendar-day-cell.other-month {
      background: #f8fafc;
      color: #94a3b8;
      opacity: 0.5;
    }
    .dark .calendar-day-cell.other-month {
      background: #0f172a;
      color: #475569;
    }
    .calendar-day-cell.today {
      background: #f5f7ff;
      border: 2px solid #6366f1;
    }
    .dark .calendar-day-cell.today {
      background: #1e1b4b;
      border: 2px solid #818cf8;
    }
    .calendar-day-number {
      font-size: 0.75rem;
      font-weight: 800;
      color: #475569;
    }
    .dark .calendar-day-number {
      color: #cbd5e1;
    }
    .calendar-day-cell.today .calendar-day-number {
      color: #4f46e5;
      font-weight: 900;
    }
    .dark .calendar-day-cell.today .calendar-day-number {
      color: #a5b4fc;
    }

    /* Event Pill style */
    .calendar-event-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: 0.5rem;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      border: none;
      text-align: left;
      width: 100%;
      display: block; /* Force contract inside cells */
    }
    .calendar-event-pill:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
      filter: brightness(1.08);
    }
    .calendar-event-pill:active {
      transform: translateY(0);
    }

    /* Week Columns layout */
    .calendar-week-container {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .calendar-week-column {
      background: rgba(255, 255, 255, 0.6);
      border-radius: 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 0.75rem;
      min-height: 480px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 0; /* Lock standard column contraction */
    }
    .dark .calendar-week-column {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .calendar-week-day-header {
      text-align: center;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 0.25rem;
    }
    .dark .calendar-week-day-header {
      border-bottom-color: #334155;
    }

    /* Agenda Timeline layout */
    .agenda-timeline {
      position: relative;
      padding-left: 2rem;
    }
    .agenda-timeline::before {
      content: '';
      position: absolute;
      left: 9px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e2e8f0;
    }
    .dark .agenda-timeline::before {
      background: #334155;
    }
    .agenda-day-group {
      position: relative;
      margin-bottom: 2rem;
    }
    .agenda-day-dot {
      position: absolute;
      left: -2rem;
      top: 0.25rem;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #cbd5e1;
      border: 4px solid #ffffff;
      transform: translateX(0);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .dark .agenda-day-dot {
      background: #475569;
      border-color: #0f172a;
    }
    .agenda-day-group.today .agenda-day-dot {
      background: #6366f1;
      border-color: #eef2ff;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }
    .dark .agenda-day-group.today .agenda-day-dot {
      background: #818cf8;
      border-color: #1e1b4b;
    }
  `;
  document.head.appendChild(style);
}

interface AlertItem {
  id: string; // Unique combined key
  type: 'manual' | 'passport' | 'refund';
  title: string;
  sender: string;
  senderAvatar: string;
  dateStr: string;
  periodText?: string;
  subject: string;
  body: string;
  targetId: string; // For linking
  arquivado: boolean;
  consultorId: string;
  consultorNome: string;
  createdAt: string;
  eventDate: string; // Target event date (YYYY-MM-DD)
}

export class InboxPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private alerts: AlertItem[] = [];
  private filteredAlerts: AlertItem[] = [];
  
  // App state
  private activeTab: 'ativos' | 'arquivados' | 'todos' = 'ativos';
  private selectedConsultantFilter: string = 'todos';
  private searchQuery: string = '';
  private consultants: PerfilConsultor[] = [];
  
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
    this.renderLoading();

    try {
      // 1. Fetch current session and user profile
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }
      this.user = user;
      this.perfil = perfil;

      // Handle profile updates reactively
      window.addEventListener('paxflow-profile-updated', (e: any) => {
        const { nome, avatar_url } = e.detail;
        if (this.perfil) {
          this.perfil.nome = nome;
          this.perfil.avatar_url = avatar_url;
          this.render();
          this.setupEventListeners();
        }
      });

      // 2. Fetch global settings for refund SLAs
      await this.loadGlobalSettings();

      // 3. Fetch active consultants list if current user is admin
      if (this.perfil?.role === 'admin') {
        await this.loadConsultants();
      }

      // 4. Fetch all reminders and build unified alert list
      await this.loadAndBuildAlerts();

      // 5. Render Page UI and attach action listeners
      this.render();
      this.setupEventListeners();

    } catch (err: any) {
      console.error('Erro na inicialização da Caixa de Alertas:', err);
      this.renderAuthError(`Erro interno ao carregar Inbox: ${err.message}`);
    }
  }

  /**
   * Destroy page elements if necessary
   */
  public destroy(): void {
    // No background timers to clear, cleanly unmounts
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
    const list: AlertItem[] = [];
    const archivedList = this.getArchivedLocalAlerts();

    try {
      // --- PART 1: MANUAL REMINDERS ("Me Lembre Depois") ---
      let lembretesQuery = supabase
          .from('lembretes')
          .select(`
          *,
          orcamento:orcamentos (*),
          consultor:profiles (*)
        `)
          .order('created_at', { ascending: false });

      if (this.perfil && this.perfil.role !== 'admin') {
        lembretesQuery = lembretesQuery.eq('consultor_id', this.user.id);
      }

      const { data: lembretesData, error: lembretesErr } = await lembretesQuery;
      if (lembretesErr) throw lembretesErr;

      (lembretesData || []).forEach((lem: any) => {
        if (!lem.orcamento) return; // Orçamento deleted
        
        const dataFormatada = new Date(lem.data_lembrete + 'T00:00:00').toLocaleDateString('pt-BR');
        const periodosMap: any = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
        const periodoText = periodosMap[lem.periodo] || lem.periodo;

        list.push({
          id: `manual-${lem.id}`,
          type: 'manual',
          title: 'Lembrete cadastrado - Orçamento',
          sender: lem.consultor?.nome || 'PaxFlow Reminders',
          senderAvatar: lem.consultor?.avatar_url || 'panda',
          dateStr: dataFormatada,
          periodText: periodoText,
          subject: `Você cadastrou um alerta sobre o orçamento de [${lem.orcamento.nome_cliente} - ${lem.orcamento.destino}].`,
          body: `Você cadastrou um alerta sobre o orçamento <a href="#" class="inbox-deep-link font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline" data-orcamento-id="${lem.orcamento.id}">[${lem.orcamento.nome_cliente} - ${lem.orcamento.destino}]</a> para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.<br><br>Por favor, clique no link acima para abrir e editar a negociação correspondente.`,
          targetId: lem.orcamento.id,
          arquivado: lem.arquivado,
          consultorId: lem.consultor_id,
          consultorNome: lem.consultor?.nome || 'Consultor',
          createdAt: lem.created_at,
          eventDate: lem.data_lembrete
        });
      });

      // --- PART 2: PASSPORT SLA ALERTS ---
      let clientesQuery = supabase.from('clientes').select('*');
      const { data: clientesData } = await clientesQuery;

      (clientesData || []).forEach((c: any) => {
        // Filter by consultant responsibility if not admin
        if (this.perfil && this.perfil.role !== 'admin' && c.consultor_responsavel_id !== this.user.id) {
          return;
        }

        const validade = c.passaporte_validade || c.passaporteValidade;
        if (!validade) return;

        const passSla = this.checkPassaporteSLA(validade);
        if (passSla.status === 'warning' || passSla.status === 'expired') {
          const uniqueId = `passport-${c.id}`;
          const isArchived = archivedList.includes(uniqueId);
          
          list.push({
            id: uniqueId,
            type: 'passport',
            title: passSla.status === 'expired' ? '🚨 Passaporte EXPIRADO!' : '⚠️ Alerta SLA - Validade de Passaporte',
            sender: 'PaxFlow SLA Control',
            senderAvatar: 'lion',
            dateStr: new Date(validade).toLocaleDateString('pt-BR'),
            subject: `O passaporte do passageiro ${c.nome} está ${passSla.status === 'expired' ? 'expirado' : 'perto de vencer'}.`,
            body: `O passaporte do passageiro <strong>${c.nome}</strong> está ${passSla.status === 'expired' ? '<strong class="text-rose-500">expirado!</strong>' : `próximo ao vencimento (${passSla.days} dias restantes).`}<br><br><strong>Detalhes do Cliente:</strong><br>• E-mail: ${c.email || 'Não cadastrado'}<br>• Telefone: ${c.telefone || 'Não cadastrado'}<br>• Passaporte: ${c.passaporte_numero || 'S/N'}<br>• Vencimento: ${new Date(validade).toLocaleDateString('pt-BR')}<br><br>Recomenda-se contatar o cliente para providenciar a emissão de um novo passaporte para viagens internacionais.`,
            targetId: c.id,
            arquivado: isArchived,
            consultorId: c.consultor_responsavel_id || '',
            consultorNome: 'PaxFlow Automático',
            createdAt: c.created_at || new Date().toISOString(),
            eventDate: validade.split('T')[0]
          });
        }
      });

      // --- PART 3: REFUND SLA ALERTS ---
      let reembolsosQuery = supabase
          .from('reembolsos')
          .select(`
          *,
          viagem:viagens (
            *,
            cliente:clientes (*)
          )
        `)
          .not('status', 'in', '("pago","cancelado")')
          .order('created_at', { ascending: false });

      const { data: reembolsosData } = await reembolsosQuery;

      (reembolsosData || []).forEach((rem: any) => {
        const consultorId = rem.viagem?.consultor_id || rem.consultor_solicitante_id;
        
        // Filter by consultant responsability if not admin
        if (this.perfil && this.perfil.role !== 'admin' && consultorId !== this.user.id) {
          return;
        }

        const dataAbertura = new Date(rem.created_at);
        const hoje = new Date();
        const diffMs = hoje.getTime() - dataAbertura.getTime();
        const diasAbertos = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diasAbertos > this.prazoReembolsoDias) {
          const uniqueId = `refund-${rem.id}`;
          const isArchived = archivedList.includes(uniqueId);
          const clienteNome = rem.viagem?.cliente?.nome || 'Passageiro';
          const destino = rem.viagem?.destino || 'Destino';

          const dataSla = new Date(rem.created_at);
          dataSla.setDate(dataSla.getDate() + this.prazoReembolsoDias);
          const eventDateStr = dataSla.toISOString().split('T')[0];

          list.push({
            id: uniqueId,
            type: 'refund',
            title: '🚨 Alerta SLA - Reembolso Atrasado',
            sender: 'PaxFlow Finance Alert',
            senderAvatar: 'fox',
            dateStr: `${diasAbertos} dias aberto`,
            subject: `O reembolso de ${clienteNome} para ${destino} excedeu o SLA de ${this.prazoReembolsoDias} dias.`,
            body: `O processo de reembolso referente à viagem de <strong>${clienteNome}</strong> para <strong>${destino}</strong> ultrapassou o limite operacional estabelecido pela agência.<br><br>• <strong>Prazo da Agência:</strong> ${this.prazoReembolsoDias} dias.<br>• <strong>Tempo Decorrido:</strong> ${diasAbertos} dias.<br>• <strong>Status Atual:</strong> ${(rem.status || 'solicitado').toUpperCase()}<br>• <strong>Valor Solicitado:</strong> R$ ${Number(rem.valor_solicitado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br><br>Por favor, averigue com o financeiro ou fornecedor a situação para agilizar o encerramento do processo.`,
            targetId: rem.id,
            arquivado: isArchived,
            consultorId: consultorId || '',
            consultorNome: 'PaxFlow Automático',
            createdAt: rem.created_at,
            eventDate: eventDateStr
          });
        }
      });

    } catch (err) {
      console.error('Erro ao compilar alertas:', err);
    }

    // Assign globally
    this.alerts = list;
    this.applyFilters();
  }

  /**
   * Applies the current active filters, search queries, and consultant filters to the compiled alert list
   */
  private applyFilters(): void {
    let result = [...this.alerts];

    // 1. Filter by Active / Archived / All
    if (this.activeTab === 'ativos') {
      result = result.filter(a => !a.arquivado);
    } else if (this.activeTab === 'arquivados') {
      result = result.filter(a => a.arquivado);
    }

    // 2. Filter by Consultant (Admin only)
    if (this.perfil?.role === 'admin' && this.selectedConsultantFilter !== 'todos') {
      result = result.filter(a => a.consultorId === this.selectedConsultantFilter);
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
   * Simple passport validity calculator
   */
  private checkPassaporteSLA(validadeStr: string): { status: 'ok' | 'warning' | 'expired'; days: number } {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const validade = new Date(validadeStr);
    validade.setHours(0, 0, 0, 0);

    const diferencaTempo = validade.getTime() - hoje.getTime();
    const diasParaVencer = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

    if (diasParaVencer < 0) {
      return { status: 'expired', days: diasParaVencer };
    } else if (diasParaVencer <= 180) {
      return { status: 'warning', days: diasParaVencer };
    }
    return { status: 'ok', days: diasParaVencer };
  }

  /**
   * Retrieves list of locally archived auto-alert IDs from localStorage
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
   * Archives or unarchives a local auto-alert item ID
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
   * Retrieves list of locally read alert IDs from localStorage
   */
  private getReadLocalAlerts(): string[] {
    try {
      const val = localStorage.getItem('paxflow_read_alerts');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  /**
   * Marks a specific alert ID as read
   */
  private markAlertAsRead(id: string): void {
    try {
      const list = this.getReadLocalAlerts();
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('paxflow_read_alerts', JSON.stringify(list));
      }
    } catch (err) {
      console.error('Erro ao marcar alerta como lido:', err);
    }
  }

  /**
   * Triggers the load loading placeholder
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
        <p class="text-slate-550 dark:text-slate-400 font-semibold animate-pulse text-sm">Acessando Caixa de Entrada e analisando SLAs...</p>
      </div>
    `;
  }

  /**
   * Triggers authentication failure block
   */
  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-8 rounded-2xl shadow-xl text-center">
          <div class="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-550 dark:text-rose-450 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Erro de Acesso</h2>
          <p class="text-slate-550 dark:text-slate-450 text-sm mb-6">${msg}</p>
        </div>
      </div>
    `;
  }

   private render(): void {
    // 1. Calculate counters for badges
    const totalAtivos = this.alerts.filter(a => !a.arquivado).length;
    const totalManual = this.alerts.filter(a => a.type === 'manual' && !a.arquivado).length;
    const totalPassport = this.alerts.filter(a => a.type === 'passport' && !a.arquivado).length;
    const totalRefund = this.alerts.filter(a => a.type === 'refund' && !a.arquivado).length;

    // Determine unread alerts status for visual header badge indicator
    const readList = this.getReadLocalAlerts();
    const hasUnread = this.alerts.some(a => !a.arquivado && !readList.includes(a.id));

    // 2. Build the main page container markup
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <!-- Header Section -->
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-850 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3.5">
            <div class="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl">
              <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Mission Control</h1>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Inbox de Alertas & Centro Operacional</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <!-- Seletor de Consultores (Apenas para Admins) -->
            ${this.perfil?.role === 'admin' ? `
              <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-550 select-none">Equipe:</span>
                <select id="admin-consultant-select" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer max-w-[150px]">
                  <option value="todos" ${this.selectedConsultantFilter === 'todos' ? 'selected' : ''}>Todos os Consultores</option>
                  ${this.consultants.map(c => `<option value="${c.id}" ${this.selectedConsultantFilter === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                </select>
              </div>
            ` : ''}

            <!-- Identidade do Consultor Logado -->
            <div class="flex items-center gap-3 pl-2 border-l border-slate-200/60 dark:border-slate-800/60 shrink-0">
              <div class="text-right hidden sm:block">
                <span class="block text-sm font-extrabold text-slate-700 dark:text-slate-300">${this.perfil?.nome || 'Consultor'}</span>
                <span class="block text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">${this.perfil?.email || this.user.email}</span>
              </div>
              <div class="${hasUnread ? 'unread-avatar-glow' : ''}">
                ${getAvatarSvg(this.perfil?.avatar_url, this.perfil?.nome?.charAt(0) || 'C', 'w-10 h-10')}
              </div>
              
              <!-- Theme toggle button -->
              <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-455 hover:text-slate-650 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
                <svg width="20" height="20" class="w-5 h-5 theme-icon-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <svg width="20" height="20" class="w-5 h-5 theme-icon-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              <!-- Sair do Sistema (Logout) -->
              <button id="btn-logout" title="Sair do Sistema" class="p-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 dark:text-slate-550 dark:hover:text-rose-400 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
                <svg width="20" height="20" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Dashboard Cockpit Content -->
        <main class="flex-grow p-6 max-w-7xl w-full mx-auto space-y-6">
          
          <!-- Glass Stats Summary Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div class="inbox-glass p-5 rounded-2xl shadow-sm flex items-center justify-between border border-white/60 dark:border-slate-900/60">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Alertas Ativos</span>
                <span class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${totalAtivos}</span>
              </div>
              <div class="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
            </div>

            <div class="inbox-glass p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Agendados "Depois"</span>
                <span class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${totalManual}</span>
              </div>
              <div class="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              </div>
            </div>

            <div class="inbox-glass p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Passaportes SLA</span>
                <span class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${totalPassport}</span>
              </div>
              <div class="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
              </div>
            </div>

            <div class="inbox-glass p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Reembolsos SLA</span>
                <span class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${totalRefund}</span>
              </div>
              <div class="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-450 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
            </div>

          </div>

          <!-- Mail Workspace Container -->
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            <!-- Left Workspace sidebar (Filter Panel) -->
            <div class="lg:col-span-1 space-y-4">
              
              <!-- Folders glass card -->
              <div class="inbox-glass p-4 rounded-2xl shadow-sm space-y-2">
                <h3 class="px-2 text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-3">Folders</h3>
                
                <button id="folder-ativos" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'ativos' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Caixa de Entrada
                  </span>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">${totalAtivos}</span>
                </button>

                <button id="folder-arquivados" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'arquivados' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                      <polyline points="21 8 21 21 3 21 3 8"></polyline>
                      <rect x="1" y="3" width="22" height="5"></rect>
                      <line x1="10" y1="12" x2="14" y2="12"></line>
                    </svg>
                    Arquivados
                  </span>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">${
                    this.alerts.filter(a => a.arquivado).length
                  }</span>
                </button>

                <button id="folder-todos" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'todos' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    Mensagens Totais
                  </span>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">${this.alerts.length}</span>
                </button>

              </div>

            </div>

            <!-- Middle Workspace panel (Mail List Client / Calendar) -->
            <div class="lg:col-span-3 space-y-4">
              
              <!-- Search and filter summary bar -->
              <div class="inbox-glass p-3 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-3">
                <!-- Search -->
                <div class="relative w-full flex-grow">
                  <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-550">
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
                  <button id="view-list-btn" class="px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${this.currentView === 'list' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-200'}" title="Visualização em Lista">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
                    Lista
                  </button>
                  <button id="view-calendar-btn" class="px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${this.currentView === 'calendar' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-200'}" title="Visualização em Calendário">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    Calendário
                  </button>
                </div>
              </div>

              ${this.currentView === 'list' ? `
                <!-- Alerts Mail Stack -->
                <div class="space-y-3 custom-scrollbar overflow-y-auto max-h-[calc(100vh-310px)] pr-1">
                  ${this.filteredAlerts.length === 0 ? `
                    <div class="inbox-glass p-12 text-center rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                      <div class="w-12 h-12 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-550 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </div>
                      <h3 class="text-sm font-black text-slate-700 dark:text-slate-350 uppercase tracking-wide">Caixa Vazia</h3>
                      <p class="text-xs text-slate-400 dark:text-slate-550 mt-1 font-medium">Nenhum alerta ou lembrete corresponde aos filtros atuais.</p>
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
                    }

                    const isUnread = !a.arquivado && !readList.includes(a.id);

                    return `
                      <div class="inbox-card inbox-glass p-5 rounded-2xl border ${isUnread ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/5 dark:bg-indigo-950/5' : 'border-white/60 dark:border-slate-900/60'} shadow-sm flex items-start gap-4 cursor-pointer relative" data-alert-id="${a.id}">
                        
                        <!-- Unread Indicator Dot -->
                        ${isUnread ? `<span class="absolute top-5 left-2 w-2 h-2 rounded-full bg-indigo-650 dark:bg-indigo-400 animate-pulse"></span>` : ''}

                        <!-- Avatar -->
                        <div class="w-10 h-10 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 flex-shrink-0 ${isUnread ? 'ring-2 ring-indigo-500/20' : ''}">
                          ${getAvatarSvg(a.senderAvatar, a.sender.charAt(0), 'w-full h-full')}
                        </div>

                        <!-- Text info -->
                        <div class="flex-grow min-w-0 space-y-1">
                          <div class="flex items-center justify-between gap-2">
                            <span class="block text-xs font-black text-slate-800 dark:text-slate-200 truncate">${a.sender}</span>
                            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-550 whitespace-nowrap">${a.dateStr}</span>
                          </div>

                          <h4 class="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider ${badgeClass}">
                              ${badgeText}
                            </span>
                            <span class="truncate">${a.title}</span>
                          </h4>

                          <p class="text-xs text-slate-505 dark:text-slate-450 line-clamp-2 leading-relaxed">
                            ${a.subject}
                          </p>

                          ${this.perfil?.role === 'admin' ? `
                            <div class="flex items-center gap-1.5 pt-1 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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

            </div>

          </div>

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
        <div class="inbox-glass p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <!-- Mode Tabs -->
          <div class="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/40 w-full sm:w-auto">
            <button id="cal-mode-month" class="flex-grow sm:flex-grow-0 px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${this.calendarMode === 'month' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-200'}">
              Mês
            </button>
            <button id="cal-mode-week" class="flex-grow sm:flex-grow-0 px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${this.calendarMode === 'week' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-200'}">
              Semana
            </button>
            <button id="cal-mode-agenda" class="flex-grow sm:flex-grow-0 px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${this.calendarMode === 'agenda' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-200'}">
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
            <button id="cal-nav-today" class="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-extrabold text-slate-650 dark:text-slate-300 transition border border-slate-200/40 dark:border-slate-750/40 bg-white dark:bg-slate-900 shadow-sm">
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
                <h4 class="text-xs font-black text-slate-850 dark:text-slate-250 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-3 text-left">Legenda de Cores</h4>
                <div class="space-y-2.5 text-left">
                  <div class="flex items-center gap-2.5">
                    <span class="w-3.5 h-3.5 rounded-md badge-gradient-indigo flex-shrink-0"></span>
                    <span class="text-xs font-bold text-slate-650 dark:text-slate-350">Lembretes Manuais</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="w-3.5 h-3.5 rounded-md badge-gradient-amber flex-shrink-0"></span>
                    <span class="text-xs font-bold text-slate-650 dark:text-slate-350">Passaportes SLA</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="w-3.5 h-3.5 rounded-md badge-gradient-rose flex-shrink-0"></span>
                    <span class="text-xs font-bold text-slate-650 dark:text-slate-350">Reembolsos SLA</span>
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
              if (a.type === 'passport') colorClass = 'badge-gradient-amber';
              if (a.type === 'refund') colorClass = 'badge-gradient-rose';

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
          <div class="calendar-week-day-header ${isToday ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-450'}">
            <span class="block text-[10px] font-black uppercase tracking-wider">${weekdays[i]}</span>
            <span class="text-xl font-black ${isToday ? 'bg-indigo-600 text-white w-8 h-8 inline-flex items-center justify-center rounded-full shadow-sm mt-0.5' : 'text-slate-800 dark:text-slate-200'}">${currentDay.getDate()}</span>
          </div>
          <div class="flex-grow flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-0.5">
            ${dayAlerts.length === 0 ? `
              <div class="flex-grow flex flex-col items-center justify-center border border-dashed border-slate-250 dark:border-slate-800 rounded-xl p-3 text-center opacity-40">
                <span class="text-[9px] font-black text-slate-350 dark:text-slate-650 uppercase tracking-widest">Sem Alertas</span>
              </div>
            ` : dayAlerts.map(a => {
              let badgeClass = 'badge-gradient-indigo';
              let badgeText = 'Lembrete';
              if (a.type === 'passport') {
                badgeClass = 'badge-gradient-amber';
                badgeText = 'Passaporte';
              } else if (a.type === 'refund') {
                badgeClass = 'badge-gradient-rose';
                badgeText = 'Reembolso';
              }

              return `
                <div class="inbox-card inbox-glass p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-850 bg-white/50 dark:bg-slate-900/50 cursor-pointer shadow-sm relative flex flex-col gap-1.5" data-alert-id="${a.id}">
                  <!-- Accent color bar -->
                  <div class="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r ${a.type === 'manual' ? 'bg-indigo-500' : a.type === 'passport' ? 'bg-amber-500' : 'bg-rose-500'}"></div>
                  
                  <div class="pl-2 flex items-center justify-between gap-1">
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider ${badgeClass}">
                      ${badgeText}
                    </span>
                    ${a.periodText ? `<span class="text-[8px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">${a.periodText}</span>` : ''}
                  </div>
                  
                  <div class="pl-2">
                    <h5 class="text-xs font-extrabold text-slate-850 dark:text-slate-200 line-clamp-1 leading-snug">${this.getEventSummary(a)}</h5>
                    <p class="text-[10px] text-slate-500 dark:text-slate-450 line-clamp-2 leading-relaxed mt-0.5">${a.subject}</p>
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
          <div class="w-12 h-12 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-550 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h3 class="text-sm font-black text-slate-700 dark:text-slate-350 uppercase tracking-wide">Agenda Vazia</h3>
          <p class="text-xs text-slate-450 dark:text-slate-500 mt-1 font-medium">Nenhum evento futuro ou lembrete para exibir.</p>
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
          
          <h4 class="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>${formattedDate}</span>
            ${isToday ? '<span class="px-2 py-0.5 bg-indigo-650 dark:bg-indigo-600 text-white rounded text-[8px] font-black tracking-widest scale-90 uppercase">Hoje</span>' : ''}
          </h4>
          
          <div class="space-y-3">
            ${groups[dateStr].map(a => {
              let badgeClass = 'badge-gradient-indigo';
              let badgeText = 'Lembrete';
              if (a.type === 'passport') {
                badgeClass = 'badge-gradient-amber';
                badgeText = 'Passaporte SLA';
              } else if (a.type === 'refund') {
                badgeClass = 'badge-gradient-rose';
                badgeText = 'Reembolso SLA';
              }

              return `
                <div class="inbox-card inbox-glass p-4 rounded-xl border border-white/60 dark:border-slate-900/60 shadow-sm flex items-start gap-4 cursor-pointer relative" data-alert-id="${a.id}">
                  <!-- Colored indicator border on the left side of the agenda card -->
                  <div class="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r ${a.type === 'manual' ? 'bg-indigo-500' : a.type === 'passport' ? 'bg-amber-500' : 'bg-rose-500'}"></div>
                  
                  <!-- Avatar -->
                  <div class="w-9 h-9 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 flex-shrink-0">
                    ${getAvatarSvg(a.senderAvatar, a.sender.charAt(0), 'w-full h-full')}
                  </div>

                  <!-- Alert Content details -->
                  <div class="flex-grow min-w-0 space-y-1 pl-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="block text-xs font-black text-slate-805 dark:text-slate-200 truncate">${a.sender}</span>
                      ${a.periodText ? `<span class="text-[9px] font-extrabold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md uppercase tracking-wider">${a.periodText}</span>` : ''}
                    </div>

                    <h5 class="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider ${badgeClass}">
                        ${badgeText}
                      </span>
                      <span class="truncate">${a.title}</span>
                    </h5>

                    <p class="text-xs text-slate-500 dark:text-slate-450 line-clamp-2 leading-relaxed">
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
   * Set up page event listeners (clicks, tabs, selects, modal triggers)
   */
  private setupEventListeners(): void {
    // 1. Folders click listeners
    const folderAtivos = document.getElementById('folder-ativos');
    folderAtivos?.addEventListener('click', () => {
      this.activeTab = 'ativos';
      this.applyFilters();
      this.render();
      this.setupEventListeners();
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
          showCustomAlert(`Erro ao atualizar mensagem: ${err.message}`, 'Erro Operacional');
        }
      });
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

    // 10. Logoff / Sair do Sistema com modal de confirmação customizado
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      const confirmLogout = await showCustomConfirm(
        'Tem certeza que deseja sair do sistema?',
        'Confirmação de Logoff',
        { isDestructive: true, confirmText: 'Sair do PaxFlow', cancelText: 'Cancelar' }
      );
      if (confirmLogout) {
        await logoutConsultor();
        window.location.reload();
      }
    });
  }

  /**
   * Opens the Corporate styled Email modal details
   */
  private openEmailReaderModal(item: AlertItem): void {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'email-reader-modal';
    modalOverlay.className = 'fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn';
    
    let badgeClass = 'badge-gradient-indigo';
    let badgeText = 'Lembrete';
    if (item.type === 'passport') {
      badgeClass = 'badge-gradient-amber';
      badgeText = 'Passaporte SLA';
    } else if (item.type === 'refund') {
      badgeClass = 'badge-gradient-rose';
      badgeText = 'Reembolso SLA';
    }

    modalOverlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 max-w-2xl w-full border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transform scale-95 transition-all duration-300 relative">
        
        <!-- Modal Top Bar / Fake email tools -->
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider ${badgeClass}">
              ${badgeText}
            </span>
            <span class="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Leitor de Mensagem</span>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- Header Archive action -->
            <button id="modal-archive-btn" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition" title="${item.arquivado ? 'Desarquivar Mensagem' : 'Arquivar Mensagem'}">
              ${item.arquivado ? `
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/></svg>
              ` : `
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <polyline points="21 8 21 21 3 21 3 8"></polyline>
                  <rect x="1" y="3" width="22" height="5"></rect>
                  <line x1="10" y1="12" x2="14" y2="12"></line>
                </svg>
              `}
            </button>
            
            <button id="modal-close-btn" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition" title="Fechar">
              <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Corporate Email Workspace -->
        <div class="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          
          <!-- Subject -->
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
            ${item.title}
          </h2>

          <!-- Email headers -->
          <div class="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800/80 pb-5">
            <div class="w-10 h-10 border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 flex-shrink-0">
              ${getAvatarSvg(item.senderAvatar, item.sender.charAt(0), 'w-full h-full')}
            </div>
            <div class="flex-grow min-w-0">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <span class="block text-sm font-extrabold text-slate-800 dark:text-slate-250 truncate">${item.sender}</span>
                  <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">De: &lt;alertas@paxflow.com.br&gt;</span>
                </div>
                <div class="text-left sm:text-right">
                  <span class="block text-[10px] font-bold text-slate-400 dark:text-slate-550">${item.dateStr}</span>
                  <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Para: Você</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Email body (Corporate Paper design) -->
          <div class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold bg-slate-50/40 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/30 dark:border-slate-850/40 shadow-inner">
            <p class="mb-4">Prezado(a) Consultor(a),</p>
            
            <p class="mb-4">${item.body}</p>

            <p class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs text-slate-400 dark:text-slate-500">
              Atenciosamente,<br>
              <strong>PaxFlow Cockpit Automático</strong><br>
              Gestão Operacional e Fluxo de Passageiros
            </p>
          </div>

        </div>

        <!-- Modal Action Footer -->
        <div class="px-5 py-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 bg-slate-50/40 dark:bg-slate-900/40">
          <button id="modal-footer-close-btn" class="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40">
            Fechar
          </button>
          
          <button id="modal-footer-archive-btn" class="px-4 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <polyline points="21 8 21 21 3 21 3 8"></polyline>
              <rect x="1" y="3" width="22" height="5"></rect>
              <line x1="10" y1="12" x2="14" y2="12"></line>
            </svg>
            ${item.arquivado ? 'Desarquivar Mensagem' : 'Arquivar Mensagem'}
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Apply scaling zoom animation in timeout
    setTimeout(() => {
      const modalContent = modalOverlay.querySelector('.scale-95');
      if (modalContent) {
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
      }
    }, 10);

    // Modal interaction helper actions
    const closeModal = (isNavigatingAway = false) => {
      const modalContent = modalOverlay.querySelector('.scale-100');
      if (modalContent) {
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('scale-95');
      }
      modalOverlay.classList.add('opacity-0');
      setTimeout(() => {
        modalOverlay.remove();
        if (!isNavigatingAway) {
          // Redraw workspace immediately to remove read highlight and update glows
          this.render();
          this.setupEventListeners();
        }
      }, 200);
    };

    // Close on clicks outside
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => closeModal());
    document.getElementById('modal-footer-close-btn')?.addEventListener('click', () => closeModal());

    // Archive handlers
    const handleArchiveClick = async () => {
      try {
        if (item.type === 'manual') {
          const tableId = item.id.replace('manual-', '');
          const { error } = await supabase
            .from('lembretes')
            .update({ arquivado: !item.arquivado })
            .eq('id', tableId);

          if (error) throw error;
        } else {
          this.toggleLocalAlertArchive(item.id, !item.arquivado);
        }

        // Close modal
        closeModal();

        // Reload data and redraw page
        await this.loadAndBuildAlerts();
        this.render();
        this.setupEventListeners();

        this.showToast(item.arquivado ? 'Mensagem restaurada!' : 'Mensagem arquivada!', 'success');

      } catch (err: any) {
        showCustomAlert(`Erro ao arquivar mensagem:\n\n${err.message || err}`, 'Erro de Ação');
      }
    };

    document.getElementById('modal-archive-btn')?.addEventListener('click', handleArchiveClick);
    document.getElementById('modal-footer-archive-btn')?.addEventListener('click', handleArchiveClick);

    // DEEP LINK INTERACTIVE TRIGGER CLICK
    modalOverlay.querySelectorAll('.inbox-deep-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const orcId = link.getAttribute('data-orcamento-id');
        if (!orcId) return;

        // 1. Close Modal
        closeModal(true);

        // 2. Dispatch global navigation event to redirect to Orcamentos with parameters!
        window.dispatchEvent(new CustomEvent('paxflow-navigate', {
          detail: { page: 'orcamentos', extraId: orcId }
        }));
      });
    });
  }

  /**
   * Premium Toast Notification system
   */
  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
    
    if (type === 'success') {
      toast.classList.add('bg-indigo-650', 'dark:bg-indigo-600');
      toast.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> ${message}`;
    } else {
      toast.classList.add('bg-rose-500');
      toast.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> ${message}`;
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.className = toast.className.replace('translate-y-10 opacity-0', 'translate-y-0 opacity-100');
    }, 10);

    setTimeout(() => {
      toast.className = toast.className.replace('translate-y-0 opacity-100', 'translate-y-10 opacity-0');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }
}
