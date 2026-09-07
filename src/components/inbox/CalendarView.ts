import { AlertItem } from '../../types';
import { getAvatarSvg } from '../../services/avatars';

export interface CalendarViewOptions {
  container?: HTMLElement;
  alerts: AlertItem[];
  filteredAlerts: AlertItem[];
  onAlertClick: (alert: AlertItem) => void;
  onStateUpdate?: () => void;
}

export class CalendarView {
  private alerts: AlertItem[] = [];
  private filteredAlerts: AlertItem[] = [];
  private onAlertClick: (alert: AlertItem) => void;
  private onStateUpdate?: () => void;
  private container?: HTMLElement;

  public calendarMode: 'month' | 'week' | 'agenda' = 'month';
  public calendarSelectedDate: Date = new Date();

  constructor(options: CalendarViewOptions) {
    this.container = options.container;
    this.alerts = options.alerts;
    this.filteredAlerts = options.filteredAlerts;
    this.onAlertClick = options.onAlertClick;
    this.onStateUpdate = options.onStateUpdate;
  }

  public updateAlerts(alerts: AlertItem[], filteredAlerts: AlertItem[], container?: HTMLElement): void {
    this.alerts = alerts;
    this.filteredAlerts = filteredAlerts;
    if (container) this.container = container;
  }

  /**
   * Constrói o layout geral e barra de controle do calendário
   */
  public render(): string {
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
   * Configura listeners de eventos específicos do calendário
   */
  public setupEventListeners(): void {
    const root = this.container || document;

    // Seletores de Modo do Calendário
    root.querySelector('#cal-mode-month')?.addEventListener('click', () => {
      this.calendarMode = 'month';
      this.onStateUpdate?.();
    });
    root.querySelector('#cal-mode-week')?.addEventListener('click', () => {
      this.calendarMode = 'week';
      this.onStateUpdate?.();
    });
    root.querySelector('#cal-mode-agenda')?.addEventListener('click', () => {
      this.calendarMode = 'agenda';
      this.onStateUpdate?.();
    });

    // Navegação Temporal
    root.querySelector('#cal-nav-prev')?.addEventListener('click', () => {
      if (this.calendarMode === 'month') {
        this.calendarSelectedDate.setMonth(this.calendarSelectedDate.getMonth() - 1);
      } else if (this.calendarMode === 'week') {
        this.calendarSelectedDate.setDate(this.calendarSelectedDate.getDate() - 7);
      }
      this.onStateUpdate?.();
    });
    root.querySelector('#cal-nav-today')?.addEventListener('click', () => {
      this.calendarSelectedDate = new Date();
      this.onStateUpdate?.();
    });
    root.querySelector('#cal-nav-next')?.addEventListener('click', () => {
      if (this.calendarMode === 'month') {
        this.calendarSelectedDate.setMonth(this.calendarSelectedDate.getMonth() + 1);
      } else if (this.calendarMode === 'week') {
        this.calendarSelectedDate.setDate(this.calendarSelectedDate.getDate() + 7);
      }
      this.onStateUpdate?.();
    });

    // Cliques nas pílulas de eventos na visão mensal
    root.querySelectorAll('.calendar-event-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const alertId = pill.getAttribute('data-alert-id');
        if (!alertId) return;

        const alertItem = this.filteredAlerts.find(a => a.id === alertId);
        if (alertItem) {
          this.onAlertClick(alertItem);
        }
      });
    });
  }

  /**
   * Seleciona o método de renderização baseado no modo ativo
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
   * Resume os títulos dos alertas para exibição compacta no calendário
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
   * Gera a grade da visão mensal do calendário
   */
  private renderMonthCalendar(): string {
    const year = this.calendarSelectedDate.getFullYear();
    const month = this.calendarSelectedDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();

    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    let nextMonthDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        date: new Date(year, month + 1, nextMonthDay++),
        isCurrentMonth: false
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    let html = `
      <div class="calendar-container p-4">
        <div class="calendar-grid">
          <div class="calendar-day-header">Dom</div>
          <div class="calendar-day-header">Seg</div>
          <div class="calendar-day-header">Ter</div>
          <div class="calendar-day-header">Qua</div>
          <div class="calendar-day-header">Qui</div>
          <div class="calendar-day-header">Sex</div>
          <div class="calendar-day-header">Sáb</div>
    `;

    cells.forEach(cell => {
      const cellYear = cell.date.getFullYear();
      const cellMonth = String(cell.date.getMonth() + 1).padStart(2, '0');
      const cellDay = String(cell.date.getDate()).padStart(2, '0');
      const cellDateStr = `${cellYear}-${cellMonth}-${cellDay}`;
      
      const isToday = cellDateStr === todayStr;
      const otherMonthClass = cell.isCurrentMonth ? '' : 'other-month';
      const todayClass = isToday ? 'today' : '';

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
   * Gera a visão semanal do calendário com 7 colunas
   */
  private renderWeekCalendar(): string {
    const startOfWeek = new Date(this.calendarSelectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
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
              } else if (a.type === 'escala_solicitacao') {
                badgeClass = 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold';
                badgeText = 'Escala 📅';
                accentClass = 'bg-violet-500';
              } else if (a.type === 'direct_message') {
                badgeClass = 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-extrabold';
                badgeText = 'Mensagem ✉️';
                accentClass = 'bg-blue-500';
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
                  <div class="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r ${accentClass}"></div>
                  
                  <div class="pl-2 flex items-center justify-between gap-1">
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center gap-1 ${badgeClass}">
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
   * Gera a visão de Agenda (cronologia vertical)
   */
  private renderAgendaCalendar(): string {
    const groups: { [key: string]: AlertItem[] } = {};
    this.filteredAlerts.forEach(a => {
      if (!groups[a.eventDate]) groups[a.eventDate] = [];
      groups[a.eventDate].push(a);
    });

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
              } else if (a.type === 'escala_solicitacao') {
                badgeClass = 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold';
                badgeText = 'Escala 📅';
                accentClass = 'bg-violet-500';
              } else if (a.type === 'direct_message') {
                badgeClass = 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-extrabold';
                badgeText = 'Mensagem ✉️';
                accentClass = 'bg-blue-500';
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
                  <div class="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r ${accentClass}"></div>
                  
                  <div class="w-9 h-9 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 flex-shrink-0">
                    ${getAvatarSvg(a.senderAvatar, a.sender, 'w-full h-full')}
                  </div>

                  <div class="flex-grow min-w-0 space-y-1 pl-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="block text-xs font-black text-slate-800 dark:text-slate-200 truncate">${a.sender}</span>
                      ${a.periodText ? `<span class="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md uppercase tracking-wider">${a.periodText}</span>` : ''}
                    </div>

                    <h5 class="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider shrink-0 whitespace-nowrap inline-flex items-center gap-1 ${badgeClass}">
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
   * Formata o rótulo do cabeçalho de navegação temporal do calendário
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
      const diff = startOfWeek.getDate() - day;
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
}
