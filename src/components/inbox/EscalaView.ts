import { supabase } from '../../services/supabase';
import { PerfilConsultor, BancoFolgasItem, EventoEscalaItem, FeriadoPlantaoInfo, SolicitacaoEscala } from '../../types';
import { EscalaService, TURNO_PRESETS, isSameConsultantName } from '../../services/escalaService';
import { showCustomConfirm, showCustomAlert } from '../../services/dialog';
import { formatarDataBR } from '../../utils/messageFormatter';

export interface EscalaViewOptions {
  container?: HTMLElement;
  perfil: PerfilConsultor | null;
  user: any;
  consultants: PerfilConsultor[];
  allConsultants: PerfilConsultor[];
  showToast: (message: string, type?: 'success' | 'error', err?: any) => void;
  onDataChanged?: () => Promise<void>;
  onStateUpdate?: () => void;
}

export class EscalaView {
  private container?: HTMLElement;
  private perfil: PerfilConsultor | null = null;
  private user: any = null;
  private consultants: PerfilConsultor[] = [];
  private allConsultants: PerfilConsultor[] = [];
  private showToast: (message: string, type?: 'success' | 'error', err?: any) => void;
  private onDataChanged?: () => Promise<void>;
  private onStateUpdate?: () => void;

  // Estado interno da Escala
  public escalaAno: number = new Date().getFullYear();
  public escalaMes: number = new Date().getMonth() + 1;
  public escalaData: Record<string, string[]> = {};
  public escalaObservacoesData: Record<string, string[]> = {};
  public bancoFolgasData: BancoFolgasItem[] = [];
  public eventosEscalaData: EventoEscalaItem[] = [];
  public feriadosPlantoesData: FeriadoPlantaoInfo[] = [];

  constructor(options: EscalaViewOptions) {
    this.container = options.container;
    this.perfil = options.perfil;
    this.user = options.user;
    this.consultants = options.consultants;
    this.allConsultants = options.allConsultants;
    this.showToast = options.showToast;
    this.onDataChanged = options.onDataChanged;
    this.onStateUpdate = options.onStateUpdate;
  }

  public updateContext(
    perfil: PerfilConsultor | null,
    user: any,
    consultants: PerfilConsultor[],
    allConsultants: PerfilConsultor[],
    container?: HTMLElement
  ): void {
    this.perfil = perfil;
    this.user = user;
    this.consultants = consultants;
    this.allConsultants = allConsultants;
    if (container) this.container = container;
  }

  /**
   * Carrega dados da grade da escala, comentários, banco de folgas e eventos
   */
  public async loadEscalaData(): Promise<void> {
    try {
      const rawEscala = await EscalaService.loadEscalaMensal(this.escalaAno, this.escalaMes);
      const rawObs = await EscalaService.loadEscalaComentarios(this.escalaAno, this.escalaMes);
      const rawBanco = await EscalaService.loadBancoFolgas();
      this.eventosEscalaData = await EscalaService.loadEventosEscala();

      const daysInMonth = new Date(this.escalaAno, this.escalaMes, 0).getDate();

      // Mapa para desduplicar consultores por chave normalizada
      const teamMap = new Map<string, { displayName: string; participates: boolean }>();

      // 1. Mapeia todos os consultores cadastrados oficialmente no banco de dados (profiles)
      const profileByNameMap = new Map<string, PerfilConsultor>();
      (this.allConsultants || []).forEach(c => {
        if (c.nome && c.nome.trim()) {
          const key = c.nome.trim().toLowerCase();
          profileByNameMap.set(key, c);
          const participates = c.ativo !== false && c.participa_escala !== false && c.participaEscala !== false;
          teamMap.set(key, { displayName: c.nome.trim(), participates });
        }
      });

      // 2. Inclui apenas consultores que possuem cadastro real em profiles
      Object.keys(rawEscala).forEach(n => {
        if (n && n.trim()) {
          const key = n.trim().toLowerCase();
          const prof = profileByNameMap.get(key);
          if (prof) {
            const participates = prof.ativo !== false && prof.participa_escala !== false && prof.participaEscala !== false;
            teamMap.set(key, { displayName: prof.nome.trim(), participates });
          }
        }
      });

      // Reconstrói escalaData e escalaObservacoesData desduplicadas apenas para quem participa_escala === true
      const cleanEscalaData: Record<string, string[]> = {};
      const cleanObsData: Record<string, string[]> = {};

      teamMap.forEach((info, key) => {
        if (!info.participates) return; // Omitir se o funcionário não participa da escala

        // Busca chave exata pelo nome completo do consultor
        const existingKey = Object.keys(rawEscala).find(k => k.trim().toLowerCase() === key);
        const existingObsKey = Object.keys(rawObs).find(k => k.trim().toLowerCase() === key);

        if (existingKey && rawEscala[existingKey]) {
          const arr = rawEscala[existingKey];
          if (arr.length < daysInMonth) {
            cleanEscalaData[info.displayName] = [...arr, ...new Array(daysInMonth - arr.length).fill('')];
          } else {
            cleanEscalaData[info.displayName] = arr.slice(0, daysInMonth);
          }
        } else {
          cleanEscalaData[info.displayName] = new Array(daysInMonth).fill('');
        }

        if (existingObsKey && rawObs[existingObsKey]) {
          const obsArr = rawObs[existingObsKey];
          if (obsArr.length < daysInMonth) {
            cleanObsData[info.displayName] = [...obsArr, ...new Array(daysInMonth - obsArr.length).fill('')];
          } else {
            cleanObsData[info.displayName] = obsArr.slice(0, daysInMonth);
          }
        } else {
          cleanObsData[info.displayName] = new Array(daysInMonth).fill('');
        }
      });

      // Aplica a ordem salva dos consultores em escalaData e escalaObservacoesData
      const customOrder = await EscalaService.loadOrdemConsultores();
      if (customOrder && customOrder.length > 0) {
        const orderedEscalaData: Record<string, string[]> = {};
        const orderedObsData: Record<string, string[]> = {};

        customOrder.forEach(name => {
          const matchedKey = Object.keys(cleanEscalaData).find(k => k.trim().toLowerCase() === name.trim().toLowerCase());
          if (matchedKey && cleanEscalaData[matchedKey]) {
            orderedEscalaData[matchedKey] = cleanEscalaData[matchedKey];
            orderedObsData[matchedKey] = cleanObsData[matchedKey] || new Array(daysInMonth).fill('');
          }
        });
        Object.keys(cleanEscalaData).forEach(name => {
          if (!orderedEscalaData[name]) {
            orderedEscalaData[name] = cleanEscalaData[name];
            orderedObsData[name] = cleanObsData[name] || new Array(daysInMonth).fill('');
          }
        });
        this.escalaData = orderedEscalaData;
        this.escalaObservacoesData = orderedObsData;
      } else {
        this.escalaData = cleanEscalaData;
        this.escalaObservacoesData = cleanObsData;
      }

      // Reconstrói bancoFolgasData desduplicada apenas para quem participa_escala === true
      const cleanBancoData: BancoFolgasItem[] = [];
      teamMap.forEach((info, key) => {
        if (!info.participates) return;

        const existing = rawBanco.find(b => isSameConsultantName(b.consultor_nome, key) || isSameConsultantName(b.consultor_nome, info.displayName));

        if (existing) {
          cleanBancoData.push({ ...existing, consultor_nome: info.displayName });
        } else {
          cleanBancoData.push({
            consultor_id: `c-${info.displayName}`,
            consultor_nome: info.displayName,
            equipe: 'Equipe Agaxtur',
            saldo_dias: '—',
            detalhes_historico: 'Sem saldo acumulado'
          });
        }
      });
      this.bancoFolgasData = cleanBancoData;

      // Carrega plantões dos últimos 3 feriados
      this.feriadosPlantoesData = await EscalaService.loadFeriadosPlantoes();

    } catch (err) {
      console.error('Erro ao carregar dados da escala:', err);
    }
  }

  /**
   * Renderiza a interface da Central de Escala de Funcionários
   */
  public render(): string {
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

    const now = new Date();
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
                    const dayOfWeek = dateObj.getDay();
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
                            <small class="text-slate-400 block">Equipe Agaxtur</small>
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
                        const obs = this.escalaObservacoesData[name]?.[dayIdx] || '';
                        const cls = EscalaService.getTurnoCls(v);
                        const dateObj = new Date(this.escalaAno, this.escalaMes - 1, dayIdx + 1);
                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        const feriado = feriadosDoMes[dayIdx + 1];

                        let tdBgCls = '';
                        if (feriado) tdBgCls = 'escala-holiday-td';
                        else if (isWeekend) tdBgCls = 'escala-weekend-td';

                        return `
                          <td class="${tdBgCls}">
                            <div class="escala-cell ${cls}" data-escala-consultor="${name}" data-escala-day="${dayIdx}" ${obs ? `data-escala-obs="${obs.replace(/"/g, '&quot;')}"` : ''}>
                              <span>${v || '—'}</span>
                              ${obs ? `<span class="escala-obs-dot"></span>` : ''}
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
          <section class="escala-card flex flex-col">
            <div class="escala-card-head">
              <h2 class="flex items-center gap-2 font-black text-slate-800 dark:text-slate-100 text-sm">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </span>
                Banco de folgas
              </h2>
              <div class="flex items-center gap-2 shrink-0">
                <span class="escala-badge whitespace-nowrap">Saldo atual</span>
                ${isAdmin ? `
                  <button id="btn-edit-banco-folgas" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">Editar</button>
                ` : ''}
              </div>
            </div>
            <div class="p-2.5 space-y-1.5 flex-1">
              <div class="flex items-center justify-between px-2.5 py-1 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                <span>Consultor</span>
                <span>Saldo Acumulado</span>
              </div>
              ${this.bancoFolgasData.map((b, idx) => `
                <div class="banco-folgas-accordion-item rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-indigo-500/30 transition overflow-hidden">
                  <button type="button" class="btn-toggle-banco-row w-full flex items-center justify-between gap-2 p-2.5 h-[42px] hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-left transition select-none" data-banco-row-idx="${idx}">
                    <strong class="text-slate-800 dark:text-slate-100 text-xs font-black truncate" title="${b.consultor_nome}">${b.consultor_nome.split(' ')[0]}</strong>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="escala-balance">${b.saldo_dias}</span>
                      <svg class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 icon-banco-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                  </button>
                  <div class="banco-row-details hidden p-2.5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-snug break-words">
                    ${b.detalhes_historico || 'Sem saldo acumulado.'}
                  </div>
                </div>
              `).join('')}
            </div>
          </section>

          <!-- Feriados Card (Últimos 3 Feriados) -->
          <section class="escala-card flex flex-col">
            <div class="escala-card-head">
              <h2 class="flex items-center gap-2 font-black text-slate-800 dark:text-slate-100 text-sm">
                <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </span>
                Feriados
              </h2>
              <div class="flex items-center gap-2 shrink-0">
                <span class="escala-badge whitespace-nowrap">3 Feriados</span>
                ${isAdmin ? `
                  <button id="btn-edit-feriados-plantoes" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">Ajustar</button>
                ` : ''}
              </div>
            </div>
            <div class="p-2.5 space-y-1.5 flex-1">
              <div class="flex items-center justify-between px-2.5 py-1 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                <span class="w-[72px] shrink-0">Consultor</span>
                <div class="grid grid-cols-3 gap-1.5 flex-1 text-center">
                  ${(this.feriadosPlantoesData || []).map(f => `
                    <span title="${f.nome}" class="truncate min-w-0">
                      <strong class="block text-slate-700 dark:text-slate-300 font-extrabold text-[10px]">${f.data}</strong>
                      <span class="block text-[8px] font-semibold text-slate-400 truncate">${f.nomeCurto ? f.nomeCurto.split(' ').slice(1).join(' ') : f.nome.split(' ')[0]}</span>
                    </span>
                  `).join('')}
                </div>
              </div>
              ${this.bancoFolgasData.map(b => {
                const cNome = b.consultor_nome;
                const primeiroNome = cNome.split(' ')[0];
                return `
                  <div class="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-2.5 h-[42px] flex items-center justify-between gap-1.5 hover:border-indigo-500/30 transition">
                    <strong class="text-slate-800 dark:text-slate-100 text-xs font-black truncate w-[72px] shrink-0" title="${cNome}">${primeiroNome}</strong>
                    <div class="grid grid-cols-3 gap-1.5 flex-1">
                      ${(this.feriadosPlantoesData || []).map(f => {
                        const trabalhou = f.consultoresTrabalharam.some(n => isSameConsultantName(n, cNome));
                        return `
                          <div class="text-center min-w-0 flex items-center justify-center">
                            ${trabalhou ? `
                              <span class="inline-flex items-center justify-center py-1 px-2 rounded-lg bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black text-[10px] leading-none w-full truncate" title="Trabalhou no feriado ${f.nome}">
                                Sim
                              </span>
                            ` : `
                              <span class="inline-flex items-center justify-center py-1 px-2 rounded-lg bg-amber-100/60 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px] leading-none w-full truncate" title="Folgou no feriado ${f.nome}">
                                Folga
                              </span>
                            `}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </section>

          <!-- Eventos Card -->
          <section class="escala-card flex flex-col">
            <div class="escala-card-head">
              <h2 class="flex items-center gap-2 font-black text-slate-800 dark:text-slate-100 text-sm">
                <span class="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </span>
                Eventos
              </h2>
              <div class="flex items-center gap-2 shrink-0">
                <span class="escala-badge whitespace-nowrap">${monthNames[this.escalaMes - 1]}</span>
                ${isAdmin ? `
                  <button id="btn-add-evento-escala" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">+ Adicionar</button>
                ` : ''}
              </div>
            </div>
            <div class="p-2.5 space-y-1.5 flex-1">
              <div class="flex items-center justify-between px-2.5 py-1 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                <span>Data & Consultor</span>
                <span>Descrição</span>
              </div>
              ${(() => {
                const mesStr = String(this.escalaMes).padStart(2, '0');
                const eventosDoMes = (this.eventosEscalaData || []).filter(ev => {
                  if (!ev.data) return false;
                  const d = ev.data.trim();
                  return d.includes(`/${mesStr}`) || d.includes(`/${this.escalaMes}`) || d.includes(`-${mesStr}-`);
                });

                if (eventosDoMes.length === 0) {
                  return `<div class="text-xs text-slate-400 italic p-3 text-center">Nenhum evento registrado em ${monthNames[this.escalaMes - 1]}.</div>`;
                }

                return eventosDoMes.map(ev => `
                  <div class="escala-eventrow flex items-center justify-between p-2.5 h-[42px] rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-indigo-500/30 transition shadow-2xs">
                    <div class="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                      <div class="escala-event-date shrink-0 font-black text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg border border-indigo-100 dark:border-indigo-900/40 font-mono">${ev.data}</div>
                      <div class="flex-1 min-w-0">
                        <strong class="text-slate-800 dark:text-slate-100 text-xs font-black block truncate">${ev.consultor_nome}</strong>
                        <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">${ev.titulo}</div>
                      </div>
                    </div>
                    ${isAdmin ? `
                      <button data-delete-evento-id="${ev.id}" class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition shrink-0" title="Excluir evento">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
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
   * Configura listeners de eventos da grade da escala
   */
  public setupEventListeners(): void {
    const root = this.container || document;

    // Prev / Next Month
    root.querySelector('#btn-escala-prev-month')?.addEventListener('click', async () => {
      if (this.escalaMes > 1) {
        this.escalaMes--;
      } else {
        this.escalaMes = 12;
        this.escalaAno--;
      }
      await this.loadEscalaData();
      this.onStateUpdate?.();
    });

    root.querySelector('#btn-escala-next-month')?.addEventListener('click', async () => {
      if (this.escalaMes < 12) {
        this.escalaMes++;
      } else {
        this.escalaMes = 1;
        this.escalaAno++;
      }
      await this.loadEscalaData();
      this.onStateUpdate?.();
    });

    // Scroll helper para HOJE
    const scrollToToday = (behavior: ScrollBehavior = 'smooth') => {
      const scroll = root.querySelector('#escalaTableScroll') as HTMLElement;
      const todayTh = root.querySelector('.escala-today-th') as HTMLElement;
      if (scroll) {
        const targetLeft = todayTh ? Math.max(0, todayTh.offsetLeft - 220) : Math.max(0, (new Date().getDate() - 3) * 45);
        if (typeof scroll.scrollTo === 'function') {
          scroll.scrollTo({ left: targetLeft, behavior });
        } else {
          scroll.scrollLeft = targetLeft;
        }
      }
    };

    // Botão Hoje
    root.querySelector('#btn-escala-hoje')?.addEventListener('click', async () => {
      const now = new Date();
      this.escalaAno = now.getFullYear();
      this.escalaMes = now.getMonth() + 1;
      await this.loadEscalaData();
      this.onStateUpdate?.();
      setTimeout(() => scrollToToday('smooth'), 60);
    });

    // Auto-focus no HOJE
    setTimeout(() => scrollToToday('auto'), 60);

    // Exportar PDF
    root.querySelector('#btn-escala-export-pdf')?.addEventListener('click', () => {
      this.exportarEscalaPDF();
    });

    // Gerenciar Integrantes
    root.querySelector('#btn-escala-gerenciar-membros')?.addEventListener('click', () => {
      this.openGerenciarMembrosEscalaModal();
    });

    // Admin Edit Button
    root.querySelector('#btn-escala-admin-edit')?.addEventListener('click', () => {
      this.openAdminCellEditModal('Eduardo', 24, this.escalaData['Eduardo']?.[24] || '');
    });

    // Solicitar Troca Button
    root.querySelector('#btn-escala-solicitar-troca')?.addEventListener('click', () => {
      this.openSolicitarTrocaModal();
    });

    // Cliques nas células
    root.querySelectorAll('.escala-cell').forEach(cellEl => {
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

    // Tooltip Flutuante Global para Comentários
    let tooltipEl = document.getElementById('escala-global-tooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'escala-global-tooltip';
      tooltipEl.className = 'fixed hidden z-[9999] px-3 py-1.5 text-xs font-semibold bg-slate-900/95 text-slate-100 dark:bg-slate-800/95 dark:text-slate-100 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none transition-opacity duration-150 max-w-xs leading-snug';
      document.body.appendChild(tooltipEl);
    }

    const tableScroll = root.querySelector('#escalaTableScroll');
    if (tableScroll) {
      tableScroll.addEventListener('mouseover', (e) => {
        const cell = (e.target as HTMLElement).closest('[data-escala-obs]');
        if (cell && tooltipEl) {
          const obsText = cell.getAttribute('data-escala-obs');
          if (obsText) {
            tooltipEl.textContent = `💬 ${obsText}`;
            tooltipEl.classList.remove('hidden');
          }
        }
      });

      tableScroll.addEventListener('mousemove', (e) => {
        const cell = (e.target as HTMLElement).closest('[data-escala-obs]');
        if (cell && tooltipEl && !tooltipEl.classList.contains('hidden')) {
          const rect = cell.getBoundingClientRect();
          const x = Math.min(Math.max(rect.left + rect.width / 2 - 80, 10), window.innerWidth - 200);
          const y = rect.top > 45 ? rect.top - 38 : rect.bottom + 8;
          tooltipEl.style.left = `${x}px`;
          tooltipEl.style.top = `${y}px`;
        }
      });

      tableScroll.addEventListener('mouseout', (e) => {
        const related = (e as MouseEvent).relatedTarget as HTMLElement;
        if (!related || !related.closest('[data-escala-obs]')) {
          if (tooltipEl) tooltipEl.classList.add('hidden');
        }
      });
    }

    // Toggle colapsável do Banco de Folgas
    root.querySelectorAll('.btn-toggle-banco-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = (e.currentTarget as HTMLElement).closest('.banco-folgas-accordion-item');
        if (!item) return;
        const details = item.querySelector('.banco-row-details');
        const chevron = item.querySelector('.icon-banco-chevron');
        if (details) {
          const isHidden = details.classList.contains('hidden');
          if (isHidden) {
            details.classList.remove('hidden');
            chevron?.classList.add('rotate-180');
          } else {
            details.classList.add('hidden');
            chevron?.classList.remove('rotate-180');
          }
        }
      });
    });

    // Editar Banco de Folgas
    root.querySelector('#btn-edit-banco-folgas')?.addEventListener('click', () => {
      this.openBancoFolgasModal();
    });

    // Editar Plantões em Feriados
    root.querySelector('#btn-edit-feriados-plantoes')?.addEventListener('click', () => {
      this.openEditarFeriadosPlantoesModal();
    });

    // Adicionar Evento
    root.querySelector('#btn-add-evento-escala')?.addEventListener('click', () => {
      this.openAddEventoModal();
    });

    // Deletar Evento
    root.querySelectorAll('[data-delete-evento-id]').forEach(btn => {
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
            this.onStateUpdate?.();
          }
        }
      });
    });

    // Mover Consultor para Cima / Baixo na Escala
    root.querySelectorAll('.btn-escala-move-up').forEach(btn => {
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
          this.onStateUpdate?.();
        }
      });
    });

    root.querySelectorAll('.btn-escala-move-down').forEach(btn => {
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
          this.onStateUpdate?.();
        }
      });
    });
  }

  /**
   * Modal: Admin Edit Cell
   */
  public openAdminCellEditModal(consultor: string, dayIdx: number, valorAtual: string): void {
    const dayNum = dayIdx + 1;
    const dateStr = `${dayNum}/${String(this.escalaMes).padStart(2, '0')}/${this.escalaAno}`;
    const obsAtual = this.escalaObservacoesData[consultor]?.[dayIdx] || '';

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
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Horário / Situação Padrão</label>
              <select id="modal-escala-select" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Vazio / Limpar —</option>
                ${TURNO_PRESETS.map(p => `
                  <option value="${p.codigo}" ${valorAtual === p.codigo ? 'selected' : ''}>${p.codigo} (${p.label})</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Ou Digite Texto Livre / Turno Customizado</label>
              <input id="modal-escala-custom" type="text" placeholder="Ex: Plantão Franquia, Treinamento às 14h..." value="${TURNO_PRESETS.some(p => p.codigo === valorAtual) ? '' : valorAtual}" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">💬 Comentário / Observação do Dia (Opcional)</label>
              <input id="modal-escala-obs" type="text" placeholder="Ex: Entrada 30min atrasada autorizada por Marinna" value="${obsAtual}" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
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
      const finalObs = (document.getElementById('modal-escala-obs') as HTMLInputElement).value.trim();

      const currentVal = this.escalaData[consultor]?.[dayIdx] || '';
      const isCurrentlyOffOrVacation = currentVal === 'Folga' || currentVal === 'Férias';
      const isSettingWorkShift = finalVal && finalVal !== 'Folga' && finalVal !== 'Férias' && finalVal !== '';

      if (isCurrentlyOffOrVacation && isSettingWorkShift) {
        const confirmMsg = `⚠️ ALERTA DE CONFLITO OPERACIONAL:\n\n${consultor} está registrado(a) como "${currentVal}" no dia ${dayIdx + 1}/${this.escalaMes}.\n\nDeseja realmente sobrepor este registro por um turno de trabalho normal (${finalVal})?`;
        if (!confirm(confirmMsg)) {
          return;
        }
      }

      await EscalaService.salvarCelulaEscala(this.escalaAno, this.escalaMes, consultor, dayIdx, finalVal, finalObs);
      await this.loadEscalaData();
      close();
      this.showToast('Escala atualizada com sucesso!', 'success');
      this.onStateUpdate?.();
    };
  }

  /**
   * Modal: Admin Batch Fill Month Schedule
   */
  public openAdminBatchFillModal(consultor: string): void {
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
                <option value="">— Vazio / Limpar —</option>
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

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">💬 Comentário / Observação para os Dias do Lote (Opcional)</label>
              <input id="modal-batch-obs" type="text" placeholder="Ex: Plantão Teletrabalho Franquia" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
      const observacaoLote = (modalEl.querySelector('#modal-batch-obs') as HTMLInputElement).value.trim();

      await EscalaService.preencherMesEmLote(this.escalaAno, this.escalaMes, consultor, turnoPadrao, diasFolga, observacaoLote);
      close();
      this.showToast(`Padrão mensal aplicado para ${consultor}!`, 'success');
      await this.loadEscalaData();
      this.onStateUpdate?.();
    };
  }

  /**
   * Modal: Consultor Request Swap / Off
   */
  public openSolicitarTrocaModal(targetConsultor?: string, targetDayIdx?: number): void {
    const initialDay = targetDayIdx !== undefined ? targetDayIdx + 1 : new Date().getDate();
    const dateStr = `${this.escalaAno}-${String(this.escalaMes).padStart(2, '0')}-${String(initialDay).padStart(2, '0')}`;

    const otherConsultants = (this.consultants || []).filter(c => c.nome !== this.perfil?.nome);

    const isAdmin = this.perfil?.role === 'admin';
    const modalTitle = isAdmin ? 'Propor Alteração / Troca de Escala' : 'Solicitar Alteração de Escala';
    const modalSub = isAdmin ? 'Envie uma proposta de troca de horário para aprovação do consultor.' : 'Envie uma solicitação para a equipe ou gestão.';

    const modalHtml = `
      <div id="escala-solicitar-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </span>
                ${modalTitle}
              </h3>
              <p class="text-xs text-slate-400 font-semibold mt-0.5">${modalSub}</p>
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
      } else {
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
      const isUserAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
      let statusFinal: 'pendente_colega' | 'pendente_admin' | 'pendente_consultor' = 'pendente_admin';
      if (isUserAdmin) {
        statusFinal = (destinatarioId && destinatarioId !== this.user?.id) ? 'pendente_consultor' : 'pendente_admin';
      } else {
        statusFinal = tipo === 'troca' ? 'pendente_colega' : 'pendente_admin';
      }

      try {
        await EscalaService.criarSolicitacao({
          tipo,
          solicitante_id: this.user?.id || 'usr-1',
          solicitante_nome: solicitanteNome,
          destinatario_id: (tipo === 'troca' || isUserAdmin) ? destinatarioId : undefined,
          destinatario_nome: (tipo === 'troca' || isUserAdmin) ? destinatarioNome : undefined,
          data_origem: dataOrigem,
          data_destino: tipo === 'folga' ? dataOrigem : (dataDestino || dataOrigem),
          motivo,
          status: statusFinal
        });

        close();
        const msg = isUserAdmin 
          ? `Proposta enviada para ${destinatarioNome}! Notificação gerada.` 
          : 'Solicitação enviada com sucesso! Notificação gerada no Inbox.';
        this.showToast(msg, 'success');
        if (this.onDataChanged) {
          await this.onDataChanged();
        }
        this.onStateUpdate?.();
      } catch (err: any) {
        console.error('Erro ao criar solicitação:', err);
        this.showToast(err.message || 'Erro de conexão ao enviar solicitação ao banco de dados.', 'error');
      }
    };
  }

  /**
   * Modal: Add Event / Training
   */
  public openAddEventoModal(): void {
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

          <div class="space-y-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Data do Evento *</label>
              <input id="evento-data" type="date" value="${new Date().toISOString().split('T')[0]}" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Consultor / Responsável *</label>
              <select id="evento-consultor" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="Toda a Equipe" selected>Toda a Equipe</option>
                <option value="Equipe Agaxtur">Equipe Agaxtur</option>
                <option value="Gestão">Gestão da Agência</option>
                ${(this.allConsultants || []).map(c => `<option value="${c.nome}">${c.nome}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Título do Evento / Treinamento *</label>
              <input id="evento-titulo" type="text" placeholder="Ex: Treinamento Produtos Disney & Universal" class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
      const rawData = (document.getElementById('evento-data') as HTMLInputElement).value;
      const consultor_nome = (document.getElementById('evento-consultor') as HTMLSelectElement).value;
      const titulo = (document.getElementById('evento-titulo') as HTMLInputElement).value.trim();

      if (!titulo) {
        showCustomAlert('Por favor, informe o título do treinamento ou evento.', 'Campo Obrigatório');
        return;
      }

      let data = rawData;
      if (rawData && rawData.includes('-')) {
        const parts = rawData.split('-');
        if (parts.length === 3) {
          data = `${parts[2]}/${parts[1]}`;
        }
      }

      await EscalaService.adicionarEvento({ data, consultor_nome, titulo });
      await this.loadEscalaData();
      close();
      this.showToast('Evento cadastrado na agenda!', 'success');
      this.onStateUpdate?.();
    };
  }

  /**
   * Modal: Edit Leave Bank Balances
   */
  public openBancoFolgasModal(): void {
    if (this.perfil?.role !== 'admin') {
      this.showToast('Apenas administradores podem alterar o Banco de Folgas.', 'error');
      return;
    }

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
      await this.loadEscalaData();
      this.onStateUpdate?.();
    };
  }

  /**
   * Modal: Edit Holiday Shifts (Plantões nos Feriados)
   */
  public openEditarFeriadosPlantoesModal(): void {
    if (this.perfil?.role !== 'admin') {
      this.showToast('Apenas administradores podem ajustar o histórico de feriados.', 'error');
      return;
    }

    const feriadosList = (this.feriadosPlantoesData && this.feriadosPlantoesData.length > 0)
      ? [...this.feriadosPlantoesData]
      : [
          { id: 'fp-1', data: '09/07', nome: 'Revolução Constitucionalista (SP)', nomeCurto: '09/07 Rev. SP', consultoresTrabalharam: [] },
          { id: 'fp-2', data: '01/05', nome: 'Dia do Trabalho', nomeCurto: '01/05 Trab.', consultoresTrabalharam: [] },
          { id: 'fp-3', data: '21/04', nome: 'Tiradentes', nomeCurto: '21/04 Tirad.', consultoresTrabalharam: [] }
        ];

    const consultores = this.bancoFolgasData.map(b => b.consultor_nome);

    const modalHtml = `
      <div id="escala-feriados-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 class="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <span class="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </span>
              Ajustar Plantões nos Últimos 3 Feriados
            </h3>
            <button id="modal-feriados-close" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
          </div>

          <div class="space-y-4">
            ${feriadosList.map((f, fIdx) => `
              <div class="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400">Data (ex: 09/07)</label>
                    <input type="text" id="feriado-data-${fIdx}" value="${f.data}" class="w-full text-xs font-bold p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-slate-400">Nome do Feriado</label>
                    <input type="text" id="feriado-nome-${fIdx}" value="${f.nome}" class="w-full text-xs font-bold p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1.5">Quem trabalhou neste feriado? (Marque para indicar plantão)</label>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    ${consultores.map(cNome => {
                      const checked = f.consultoresTrabalharam.some(n => isSameConsultantName(n, cNome));
                      return `
                        <label class="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-500">
                          <input type="checkbox" data-feriado-idx="${fIdx}" data-consultor-nome="${cNome}" ${checked ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                          <span class="truncate">${cNome}</span>
                        </label>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button id="modal-feriados-cancel" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">Cancelar</button>
            <button id="modal-feriados-save" class="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20">Salvar Plantões</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild!);

    const backdrop = document.getElementById('escala-feriados-modal-backdrop')!;
    const closeBtn = document.getElementById('modal-feriados-close')!;
    const cancelBtn = document.getElementById('modal-feriados-cancel')!;
    const saveBtn = document.getElementById('modal-feriados-save')!;

    const close = () => backdrop.remove();
    closeBtn.onclick = close;
    cancelBtn.onclick = close;

    saveBtn.onclick = async () => {
      const updatedList: FeriadoPlantaoInfo[] = feriadosList.map((f, fIdx) => {
        const dataVal = (document.getElementById(`feriado-data-${fIdx}`) as HTMLInputElement)?.value.trim() || f.data;
        const nomeVal = (document.getElementById(`feriado-nome-${fIdx}`) as HTMLInputElement)?.value.trim() || f.nome;
        
        const checkboxes = backdrop.querySelectorAll(`input[type="checkbox"][data-feriado-idx="${fIdx}"]:checked`);
        const consultoresTrabalharam: string[] = [];
        checkboxes.forEach(cb => {
          const cNome = cb.getAttribute('data-consultor-nome');
          if (cNome) consultoresTrabalharam.push(cNome);
        });

        return {
          id: f.id || `fp-${fIdx + 1}`,
          data: dataVal,
          nome: nomeVal,
          nomeCurto: `${dataVal} ${nomeVal.split(' ')[0]}`,
          consultoresTrabalharam
        };
      });

      await EscalaService.salvarFeriadosPlantoes(updatedList);
      close();
      this.showToast('Histórico de plantões em feriados atualizado!', 'success');
      await this.loadEscalaData();
      this.onStateUpdate?.();
    };
  }

  /**
   * Modal: Gerenciar membros que participam da escala
   */
  public openGerenciarMembrosEscalaModal(): void {
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
        this.onStateUpdate?.();

      } catch (err: any) {
        console.error('Erro ao salvar integrantes da escala:', err);
        this.showToast('Erro ao salvar integrantes.', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Alterações';
      }
    });
  }

  /**
   * Exporta a escala mensal atual em um PDF formatado para controle operacional e jurídico
   */
  public exportarEscalaPDF(): void {
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

    const printComments: { consultor: string; dia: number; obs: string }[] = [];

    const printHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Escala de Funcionários - ${monthStr}</title>
        <style>
          @page { size: landscape; margin: 6mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 9.5px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
          .header p { margin: 3px 0 0 0; color: #64748b; font-size: 9.5px; }
          .badge-juridico { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 10px; border: 1px solid #c7d2fe; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: auto; }
          th, td { border: 1px solid #cbd5e1; text-align: center; padding: 5px 2px; font-size: 9px; overflow: visible; white-space: nowrap; }
          th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
          th.weekend { background-color: #fef3c7; color: #92400e; }
          th.holiday { background-color: #ffe4e6; color: #9f1239; }
          td.name-col { text-align: left; font-weight: bold; width: 170px; min-width: 170px; background-color: #f8fafc; padding-left: 8px; white-space: nowrap; overflow: visible; font-size: 10px; }
          .shift-c10 { background: #e0f2fe; color: #0369a1; font-weight: bold; }
          .shift-c12 { background: #e0e7ff; color: #4338ca; font-weight: bold; }
          .shift-c14 { background: #fae8ff; color: #86198f; font-weight: bold; }
          .shift-c15 { background: #fce7f3; color: #9d174d; font-weight: bold; }
          .shift-folga { background: #dcfce7; color: #15803d; font-weight: bold; }
          .shift-ferias { background: #ffedd5; color: #c2410c; font-weight: bold; }
          .shift-event { background: #f1f5f9; color: #475569; font-style: italic; }
          .legend { display: flex; gap: 12px; font-size: 9px; margin-top: 10px; padding: 8px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
          .legend-item { display: flex; align-items: center; gap: 4px; }
          .comments-section { margin-top: 12px; padding: 10px 14px; background: #fffbe0; border: 1px solid #fef08a; border-radius: 8px; font-size: 9px; page-break-inside: avoid; }
          .footer-signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 10px; page-break-inside: avoid; }
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
                  const obs = this.escalaObservacoesData[name]?.[dayIdx];
                  if (obs && obs.trim()) {
                    printComments.push({ consultor: name, dia: dayIdx + 1, obs: obs.trim() });
                  }

                  let shiftCls = '';
                  if (v.includes('10') || v.includes('11')) shiftCls = 'shift-c10';
                  else if (v.includes('12') || v.includes('13')) shiftCls = 'shift-c12';
                  else if (v.includes('14')) shiftCls = 'shift-c14';
                  else if (v.includes('15')) shiftCls = 'shift-c15';
                  else if (v.toLowerCase().includes('folga')) shiftCls = 'shift-folga';
                  else if (v.toLowerCase().includes('féria')) shiftCls = 'shift-ferias';
                  else if (v.toLowerCase().includes('reuniã')) shiftCls = 'shift-event';

                  return `<td class="${shiftCls}">${v}${obs ? ` <sup style="color: #d97706; font-weight: bold;">*</sup>` : ''}</td>`;
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
          <span class="legend-item"><sup style="color: #d97706; font-weight: bold;">*</sup> Possui Observação</span>
        </div>

        ${printComments.length > 0 ? `
          <div class="comments-section">
            <strong style="color: #854d0e; display: block; margin-bottom: 6px; font-size: 10px;">💬 Observações e Notas Registradas do Mês (${monthStr}):</strong>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px;">
              ${printComments.map(c => `
                <div style="color: #334155;">
                  <strong style="color: #0f172a;">• Dia ${String(c.dia).padStart(2, '0')}/${String(this.escalaMes).padStart(2, '0')} — ${c.consultor}:</strong>
                  <span>${c.obs}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

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
   * Abre o modal de aprovação/rejeição para a gerência diretamente a partir de um ID de solicitação
   */
  public async abrirModalSolicitacaoPorId(solId: string): Promise<void> {
    const list = await EscalaService.loadSolicitacoes();
    const sol = list.find(s => s.id === solId);
    if (!sol) {
      this.showToast('Solicitação de escala não encontrada.', 'error');
      return;
    }

    const isSolicitante = (String(sol.solicitante_id) === String(this.user?.id) || sol.solicitante_nome === this.perfil?.nome);
    const isUserColega = (String(sol.destinatario_id) === String(this.user?.id) || sol.destinatario_nome === this.perfil?.nome);
    const isPendenteColega = sol.status === 'pendente_colega';
    const isPendenteConsultor = sol.status === 'pendente_consultor';
    const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
    const isPendente = isPendenteColega || sol.status === 'pendente_admin';

    let actionButtonsHtml = '';
    if (isPendenteConsultor && isUserColega) {
      actionButtonsHtml = `
        <button id="btn-decidir-recusar" class="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition">Recusar Proposta</button>
        <button id="btn-decidir-aprovar" class="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20">Aceitar e Atualizar Escala</button>
      `;
    } else if (isPendenteColega && isUserColega) {
      actionButtonsHtml = `
        <button id="btn-decidir-recusar" class="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition">Recusar Troca</button>
        <button id="btn-decidir-aprovar" class="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20">Aceitar e Enviar para Gestão</button>
      `;
    } else if (isAdmin && (sol.status === 'pendente_admin' || isPendenteColega)) {
      actionButtonsHtml = `
        <button id="btn-decidir-recusar" class="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition">Recusar</button>
        <button id="btn-decidir-aprovar" class="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20">Aprovar e Atualizar Escala</button>
      `;
    } else {
      actionButtonsHtml = `
        <div class="flex items-center justify-between w-full">
          <span class="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-1.5">
            <span>⏳</span>
            <span>Aguardando aprovação da gestão</span>
          </span>
          <div class="flex items-center gap-2">
            ${isSolicitante && isPendente ? `
              <button id="btn-decidir-cancelar" class="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition border border-rose-200 dark:border-rose-900/50">Cancelar Solicitação</button>
            ` : ''}
            <button id="modal-decidir-close-btn" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">Fechar</button>
          </div>
        </div>
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

            ${isAdmin ? `
              <div>
                <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Observação / Justificativa</label>
                <input id="decidir-resposta-admin" type="text" placeholder="Ex: De acordo com a troca de horário..." class="w-full text-xs font-semibold p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ` : ''}
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
    const closeSecondaryBtn = modalEl.querySelector('#modal-decidir-close-btn');
    const btnAprovar = modalEl.querySelector('#btn-decidir-aprovar');
    const btnRecusar = modalEl.querySelector('#btn-decidir-recusar');
    const btnCancelar = modalEl.querySelector('#btn-decidir-cancelar');

    const close = () => modalEl.remove();
    (closeBtn as HTMLElement).onclick = close;
    if (closeSecondaryBtn) (closeSecondaryBtn as HTMLElement).onclick = close;

    if (btnCancelar) {
      (btnCancelar as HTMLElement).onclick = async () => {
        if (!confirm('Deseja realmente cancelar esta solicitação de escala?')) return;
        await EscalaService.cancelarSolicitacao(sol.id, this.user?.id || '');
        close();
        this.showToast('Solicitação cancelada com sucesso.', 'success');
        await this.loadEscalaData();
        if (this.onDataChanged) {
          await this.onDataChanged();
        }
        this.onStateUpdate?.();
      };
    }

    if (btnAprovar) {
      (btnAprovar as HTMLElement).onclick = async () => {
        const resp = (modalEl.querySelector('#decidir-resposta-admin') as HTMLInputElement)?.value?.trim() || '';
        const novoStatus = isPendenteColega ? 'pendente_admin' : 'aprovado';
        await EscalaService.atualizarStatusSolicitacao(sol.id, novoStatus, resp);
        close();
        const msg = isPendenteColega 
          ? 'Troca aceita! Encaminhada para aprovação da gestão.' 
          : (isPendenteConsultor ? 'Proposta aceita! Escala atualizada automaticamente e administradores notificados.' : 'Solicitação aprovada e escala atualizada!');
        this.showToast(msg, 'success');
        await this.loadEscalaData();
        if (this.onDataChanged) {
          await this.onDataChanged();
        }
        this.onStateUpdate?.();
      };
    }

    if (btnRecusar) {
      (btnRecusar as HTMLElement).onclick = async () => {
        const resp = (modalEl.querySelector('#decidir-resposta-admin') as HTMLInputElement)?.value?.trim() || '';
        await EscalaService.atualizarStatusSolicitacao(sol.id, 'recusado', resp);
        close();
        this.showToast('Solicitação recusada com sucesso.', 'success');
        await this.loadEscalaData();
        if (this.onDataChanged) {
          await this.onDataChanged();
        }
        this.onStateUpdate?.();
      };
    }
  }
}
