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
          createdAt: lem.created_at
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
            createdAt: c.created_at || new Date().toISOString()
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
            createdAt: rem.created_at
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
        a.title.toLowerCase().includes(q) ||
        a.sender.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q)
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

  /**
   * Render the main dashboard panel markup
   */
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
              <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 5-8-5M6 20h12a2 2 0 002-2v-3H4v3a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Mission Control</h1>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Inbox de Alertas & Centro Operacional</p>
            </div>
          </div>

          <div class="flex items-center gap-3 pl-2 border-l border-slate-200/60 dark:border-slate-800/60">
            <div class="text-right hidden sm:block">
              <span class="block text-sm font-extrabold text-slate-700 dark:text-slate-300">${this.perfil?.nome || 'Consultor'}</span>
              <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">${this.perfil?.email || this.user.email}</span>
            </div>
            <div class="${hasUnread ? 'unread-avatar-glow' : ''}">
              ${getAvatarSvg(this.perfil?.avatar_url, this.perfil?.nome?.charAt(0) || 'C', 'w-10 h-10')}
            </div>
            
            <!-- Theme toggle button -->
            <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-550 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
              <svg class="w-4.5 h-4.5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
              <svg class="w-4.5 h-4.5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            </button>
            
            <!-- Sair do Sistema (Logout) -->
            <button id="btn-logout" title="Sair do Sistema" class="p-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
              <svg width="18" height="18" class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
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
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10h18M12 3v14"/></svg>
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
                <h3 class="px-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Folders</h3>
                
                <button id="folder-ativos" class="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition select-none ${
                  this.activeTab === 'ativos' 
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }">
                  <span class="flex items-center gap-2.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 5-8-5"/></svg>
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
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
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

              <!-- Admin consultant dropdown selector -->
              ${this.perfil?.role === 'admin' ? `
                <div class="inbox-glass p-4 rounded-2xl shadow-sm space-y-3">
                  <div>
                    <h3 class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Filtro Administrativo</h3>
                    <p class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Exibir alertas de outro consultor:</p>
                  </div>
                  <select id="admin-consultant-select" class="w-full text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-250 transition">
                    <option value="todos" ${this.selectedConsultantFilter === 'todos' ? 'selected' : ''}>🌍 Todos os Consultores</option>
                    ${this.consultants.map(c => `
                      <option value="${c.id}" ${this.selectedConsultantFilter === c.id ? 'selected' : ''}>👤 ${c.nome}</option>
                    `).join('')}
                  </select>
                </div>
              ` : ''}

            </div>

            <!-- Middle Workspace panel (Mail List Client) -->
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
              </div>

              <!-- Alerts Mail Stack -->
              <div class="space-y-3 custom-scrollbar overflow-y-auto max-h-[calc(100vh-310px)] pr-1">
                ${this.filteredAlerts.length === 0 ? `
                  <div class="inbox-glass p-12 text-center rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                    <div class="w-12 h-12 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-550 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10h18M12 3v14"/></svg>
                    </div>
                    <h3 class="text-sm font-black text-slate-700 dark:text-slate-350 uppercase tracking-wide">Caixa Vazia</h3>
                    <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Nenhum alerta ou lembrete corresponde aos filtros atuais.</p>
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

                        <p class="text-xs text-slate-500 dark:text-slate-450 line-clamp-2 leading-relaxed">
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
                          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                        ` : `
                          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
                        `}
                      </button>

                    </div>
                  `;
                }).join('')}
              </div>

            </div>

          </div>

        </main>
      </div>
    `;
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

    // 4. Quick Archive trigger clicks
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

    // 5. Open Email modal reader when clicking alert cards
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

    // 6. Logoff / Sair do Sistema com modal de confirmação customizado
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
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
              ` : `
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
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
              Sistema de Controle Operacional de Pós-Venda
            </p>
          </div>

        </div>

        <!-- Modal Action Footer -->
        <div class="px-5 py-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 bg-slate-50/40 dark:bg-slate-900/40">
          <button id="modal-footer-close-btn" class="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40">
            Fechar
          </button>
          
          <button id="modal-footer-archive-btn" class="px-4 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
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
    const closeModal = () => {
      const modalContent = modalOverlay.querySelector('.scale-100');
      if (modalContent) {
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('scale-95');
      }
      modalOverlay.classList.add('opacity-0');
      setTimeout(() => {
        modalOverlay.remove();
        // Redraw workspace immediately to remove read highlight and update glows
        this.render();
        this.setupEventListeners();
      }, 200);
    };

    // Close on clicks outside
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-footer-close-btn')?.addEventListener('click', closeModal);

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
        closeModal();

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
