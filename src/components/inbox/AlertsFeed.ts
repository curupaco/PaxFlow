import { AlertItem, PerfilConsultor } from '../../types';
import { getAvatarSvg } from '../../services/avatars';

export interface AlertsFeedOptions {
  container?: HTMLElement;
  filteredAlerts: AlertItem[];
  readList: string[];
  selectedAlertIds: Set<string>;
  perfil: PerfilConsultor | null;
  onAlertClick: (alert: AlertItem) => void;
  onQuickArchive: (alert: AlertItem) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectItem: (alertId: string, checked: boolean) => void;
  onBulkRead: () => void;
  onBulkUnread: () => void;
  onBulkArchive: () => void;
  onMarkAllRead: () => void;
  onEscalaAdminAction: (solId: string, action: 'aprovado' | 'recusado', btn: HTMLButtonElement) => void;
  onEscalaColleagueAction?: (solId: string, action: 'aceitar' | 'recusar', isProposta: boolean, btn: HTMLButtonElement) => void;
  onVerNaEscala?: (solId: string | null) => void;
}

export class AlertsFeed {
  private container?: HTMLElement;
  private filteredAlerts: AlertItem[] = [];
  private readList: string[] = [];
  private selectedAlertIds: Set<string> = new Set();
  private perfil: PerfilConsultor | null = null;

  private onAlertClick: (alert: AlertItem) => void;
  private onQuickArchive: (alert: AlertItem) => void;
  private onSelectAll: (checked: boolean) => void;
  private onSelectItem: (alertId: string, checked: boolean) => void;
  private onBulkRead: () => void;
  private onBulkUnread: () => void;
  private onBulkArchive: () => void;
  private onMarkAllRead: () => void;
  private onEscalaAdminAction: (solId: string, action: 'aprovado' | 'recusado', btn: HTMLButtonElement) => void;
  private onEscalaColleagueAction?: (solId: string, action: 'aceitar' | 'recusar', isProposta: boolean, btn: HTMLButtonElement) => void;
  private onVerNaEscala?: (solId: string | null) => void;

  constructor(options: AlertsFeedOptions) {
    this.container = options.container;
    this.filteredAlerts = options.filteredAlerts;
    this.readList = options.readList;
    this.selectedAlertIds = options.selectedAlertIds;
    this.perfil = options.perfil;
    this.onAlertClick = options.onAlertClick;
    this.onQuickArchive = options.onQuickArchive;
    this.onSelectAll = options.onSelectAll;
    this.onSelectItem = options.onSelectItem;
    this.onBulkRead = options.onBulkRead;
    this.onBulkUnread = options.onBulkUnread;
    this.onBulkArchive = options.onBulkArchive;
    this.onMarkAllRead = options.onMarkAllRead;
    this.onEscalaAdminAction = options.onEscalaAdminAction;
    this.onEscalaColleagueAction = options.onEscalaColleagueAction;
    this.onVerNaEscala = options.onVerNaEscala;
  }

  public updateState(
    filteredAlerts: AlertItem[],
    readList: string[],
    selectedAlertIds: Set<string>,
    perfil: PerfilConsultor | null,
    container?: HTMLElement
  ): void {
    this.filteredAlerts = filteredAlerts;
    this.readList = readList;
    this.selectedAlertIds = selectedAlertIds;
    this.perfil = perfil;
    if (container) this.container = container;
  }

  /**
   * Renderiza a barra de ações em massa e a pilha de cards de alertas
   */
  public render(): string {
    const isAllSelected = this.selectedAlertIds.size > 0 && this.selectedAlertIds.size === this.filteredAlerts.length;

    return `
      <!-- Bulk Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm mb-3 text-xs">
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
            <input type="checkbox" id="inbox-select-all-checkbox" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" ${isAllSelected ? 'checked' : ''} />
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
          } else if (a.type === 'escala_solicitacao') {
            badgeClass = 'bg-gradient-to-tr from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white font-extrabold';
            badgeText = 'Escala 📅';
          } else if (a.type === 'direct_message') {
            badgeClass = 'bg-gradient-to-tr from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-500 text-white font-extrabold';
            badgeText = 'Mensagem ✉️';
          }

          const isUnread = !a.arquivado && !a.isSent && !a.isDecision && !this.readList.includes(a.id);

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
                  <span class="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center gap-1 ${badgeClass}">
                    ${badgeText}
                  </span>
                  <span class="truncate">${a.title}</span>
                </h4>

                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  ${a.subject}
                </p>

                ${(this.perfil?.role === 'admin' && a.type === 'escala_solicitacao' && !a.isSent && a.solicitacaoStatus === 'pendente_admin') ? `
                  <div class="flex flex-wrap items-center gap-2 pt-2" onclick="event.stopPropagation()">
                    <button class="btn-aprovar-escala-inbox inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-xs" data-sol-id="${a.targetId}">
                      <span>✅ Aprovar</span>
                    </button>
                    <button class="btn-recusar-escala-inbox inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold transition shadow-xs" data-sol-id="${a.targetId}">
                      <span>❌ Recusar</span>
                    </button>
                  </div>
                ` : ''}

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
    `;
  }

  /**
   * Configura os ouvintes de eventos da lista de alertas
   */
  public setupEventListeners(scope: HTMLElement = document.body): void {
    const root = this.container || scope;

    // 1. Quick Archive trigger clicks
    root.querySelectorAll('.btn-archive-quick').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const alertId = btn.getAttribute('data-alert-id');
        if (!alertId) return;
        const alertItem = this.filteredAlerts.find(a => a.id === alertId);
        if (alertItem) {
          this.onQuickArchive(alertItem);
        }
      });
    });

    // 2. Bulk selection checkbox all
    const selectAllCheckbox = root.querySelector('#inbox-select-all-checkbox') as HTMLInputElement;
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', () => {
        this.onSelectAll(selectAllCheckbox.checked);
      });
    }

    // 3. Bulk individual checkboxes
    root.querySelectorAll('.inbox-item-checkbox').forEach(cb => {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => {
        const alertId = (cb as HTMLElement).dataset.alertId;
        if (alertId) {
          this.onSelectItem(alertId, (cb as HTMLInputElement).checked);
        }
      });
    });

    // 4. Bulk action buttons
    root.querySelector('#btn-bulk-read')?.addEventListener('click', () => {
      this.onBulkRead();
    });

    root.querySelector('#btn-bulk-unread')?.addEventListener('click', () => {
      this.onBulkUnread();
    });

    root.querySelector('#btn-bulk-archive')?.addEventListener('click', () => {
      this.onBulkArchive();
    });

    root.querySelector('#btn-mark-all-read')?.addEventListener('click', () => {
      this.onMarkAllRead();
    });

    // 5. Open Alert Reader Modal when clicking card
    root.querySelectorAll('.inbox-card').forEach(card => {
      card.addEventListener('click', () => {
        const alertId = card.getAttribute('data-alert-id');
        if (!alertId) return;
        const alertItem = this.filteredAlerts.find(a => a.id === alertId);
        if (alertItem) {
          this.onAlertClick(alertItem);
        }
      });
    });

    // 6. Botões de aprovação e recusa rápida de escala (Admin)
    root.querySelectorAll('.btn-aprovar-escala-inbox').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        if (solId) {
          this.onEscalaAdminAction(solId, 'aprovado', btn as HTMLButtonElement);
        }
      });
    });

    root.querySelectorAll('.btn-recusar-escala-inbox').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        if (solId) {
          this.onEscalaAdminAction(solId, 'recusado', btn as HTMLButtonElement);
        }
      });
    });

    // 7. Botões de aceite/recusa de colegas e propostas
    root.querySelectorAll('.btn-aceitar-troca-inbox, .btn-aceitar-proposta-inbox').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        if (solId && this.onEscalaColleagueAction) {
          const isProposta = btn.classList.contains('btn-aceitar-proposta-inbox');
          this.onEscalaColleagueAction(solId, 'aceitar', isProposta, btn as HTMLButtonElement);
        }
      });
    });

    root.querySelectorAll('.btn-recusar-troca-inbox, .btn-recusar-proposta-inbox').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        if (solId && this.onEscalaColleagueAction) {
          const isProposta = btn.classList.contains('btn-recusar-proposta-inbox');
          this.onEscalaColleagueAction(solId, 'recusar', isProposta, btn as HTMLButtonElement);
        }
      });
    });

    // 8. Botão Ver na Escala
    root.querySelectorAll('.btn-ver-na-escala').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const solId = btn.getAttribute('data-sol-id');
        if (this.onVerNaEscala) {
          this.onVerNaEscala(solId);
        }
      });
    });
  }
}
