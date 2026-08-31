import { NextTripOpportunity } from '../../types';
import { UpsellEngineService } from '../../services/upsellEngineService';
import { NextTripEngineService } from '../../services/nextTripEngineService';

export class NextTripDashboardWidget {
  private container: HTMLElement;
  private oportunidades: NextTripOpportunity[];
  private onCriarOrcamento: (op: NextTripOpportunity) => void;
  private onDispararWhatsApp: (op: NextTripOpportunity) => void;
  private onUpdate: () => void;

  constructor(options: {
    container: HTMLElement;
    oportunidades: NextTripOpportunity[];
    onCriarOrcamento: (op: NextTripOpportunity) => void;
    onDispararWhatsApp: (op: NextTripOpportunity) => void;
    onUpdate: () => void;
  }) {
    this.container = options.container;
    this.oportunidades = options.oportunidades.filter(op => op.statusAbordagem !== 'snoozed');
    this.onCriarOrcamento = options.onCriarOrcamento;
    this.onDispararWhatsApp = options.onDispararWhatsApp;
    this.onUpdate = options.onUpdate;

    this.render();
  }

  public render(): void {
    if (!this.container) return;

    if (this.oportunidades.length === 0) {
      this.container.innerHTML = `
        <div class="mb-4 px-4 py-2.5 bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-md text-white rounded-2xl shadow-md border border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="text-base">🎯</span>
            <span class="text-xs font-black tracking-wide text-slate-200 uppercase font-sans">Next Trip Engine™</span>
            <span class="text-xs text-slate-400 hidden sm:inline">&bull; Nenhuma oportunidade pendente (> 90 dias)</span>
          </div>
          <button id="btn-open-full-next-trip-empty" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold uppercase rounded-xl border border-indigo-400/30 transition flex items-center gap-1 shrink-0">
            <span>Ver Tela Completa ➔</span>
          </button>
        </div>
      `;

      this.container.querySelector('#btn-open-full-next-trip-empty')?.addEventListener('click', () => {
        window.location.hash = '#next-trip';
      });

      return;
    }

    const altaProntidaoCount = this.oportunidades.filter(o => o.nivelProntidao === 'alto').length;

    // BARRA ULTRA-DISCRETA DE 1-LINHA (Pílula Compacta)
    this.container.innerHTML = `
      <div class="mb-4 px-4 py-2.5 bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-md text-white rounded-2xl shadow-md border border-indigo-500/30 flex items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-2.5 truncate">
          <span class="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm">🎯</span>
          <span class="text-xs font-black tracking-wide text-indigo-100 uppercase font-sans">Next Trip Engine™</span>
          <span class="text-xs text-indigo-300 font-bold hidden sm:inline">&bull; ${this.oportunidades.length} Oportunidade(s) Preditiva(s)</span>
          ${altaProntidaoCount > 0 ? `
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
              🔥 ${altaProntidaoCount} Alto Potencial
            </span>
          ` : ''}
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button id="btn-open-next-trip-drawer" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-xl shadow-md border border-indigo-400/30 transition flex items-center gap-1">
            <span>🚀 Ver Oportunidades</span>
          </button>

          <button id="btn-open-full-next-trip" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded-xl border border-slate-700 transition flex items-center gap-1">
            <span>Ver Tudo ➔</span>
          </button>
        </div>
      </div>
    `;

    // Listeners da Barra Discreta
    this.container.querySelector('#btn-open-next-trip-drawer')?.addEventListener('click', () => {
      this.openDrawer();
    });

    this.container.querySelector('#btn-open-full-next-trip')?.addEventListener('click', () => {
      window.location.hash = '#next-trip';
    });
  }

  /**
   * Abre a Gaveta Lateral (Drawer/Modal) sem poluir a tela principal
   */
  private openDrawer(): void {
    let portal = document.getElementById('next-trip-drawer-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'next-trip-drawer-portal';
      document.body.appendChild(portal);
    }

    const altaProntidaoCount = this.oportunidades.filter(o => o.nivelProntidao === 'alto').length;
    const exibicaoOps = this.oportunidades.slice(0, 12);

    portal.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
        <div class="w-full max-w-2xl bg-slate-900 text-white h-full shadow-2xl border-l border-slate-800 flex flex-col justify-between overflow-hidden animate-slide-left">
          
          <!-- Cabeçalho da Gaveta -->
          <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
            <div class="flex items-center gap-2.5">
              <span class="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 text-lg">🎯</span>
              <div>
                <h3 class="text-sm font-black uppercase text-white tracking-wide">Next Trip Engine™ & Upsell</h3>
                <p class="text-xs text-indigo-300 font-medium">Oportunidades de Recompra e Upgrades Preditivos</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase border border-emerald-500/30">
                🔥 ${altaProntidaoCount} Alto Potencial
              </span>
              <button id="btn-close-next-trip-drawer" class="text-slate-400 hover:text-white text-2xl font-bold p-1 transition">&times;</button>
            </div>
          </div>

          <!-- Conteúdo da Gaveta (Lista Scrollável) -->
          <div class="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
            <div class="grid grid-cols-1 gap-4">
              ${exibicaoOps.map(op => {
                const upsells = UpsellEngineService.calculateUpsellOpportunities([], op.destinoRecomendado, 2, 5000, null, null);
                
                return `
                  <div class="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md hover:border-indigo-500/60 transition space-y-2">
                    
                    <div class="flex items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
                      <div class="truncate">
                        <h4 class="font-black text-sm text-white truncate">${op.clienteNome}</h4>
                        <span class="text-[10px] text-slate-400 font-mono">Consultor: ${op.consultorNome}</span>
                      </div>
                      <span class="px-2.5 py-1 rounded-xl text-xs font-black border ${
                        op.nivelProntidao === 'alto'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }">
                        🎯 ${op.scoreProntidao}/100
                      </span>
                    </div>

                    <!-- Sugestão Recompra -->
                    <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-700/40 space-y-1">
                      <div class="flex items-center justify-between text-indigo-300 font-extrabold text-xs">
                        <span>💡 Sugestão: ${op.destinoRecomendado}</span>
                      </div>
                      <p class="text-xs text-slate-300 font-medium leading-relaxed">${op.motivoSugestao}</p>
                      <div class="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                        Última viagem: <strong>${op.ultimoDestino}</strong> (${op.ultimaViagemData})
                      </div>
                    </div>

                    ${upsells && upsells.length > 0 ? `
                      <!-- Oportunidade de Upsell -->
                      <div class="p-3 bg-gradient-to-r from-purple-950/70 to-indigo-950/70 border border-purple-500/40 rounded-xl text-white space-y-1">
                        <div class="flex items-center justify-between text-[10px] font-black uppercase text-purple-300">
                          <span>🚀 Upsell Recomendado</span>
                          <span class="text-emerald-400 font-extrabold text-xs">+ R$ ${upsells[0].valorEstimado.toLocaleString('pt-BR')}</span>
                        </div>
                        <p class="text-xs font-bold text-slate-100">${upsells[0].titulo}</p>
                        <p class="text-[10px] text-slate-300 leading-tight">${upsells[0].descricao}</p>
                      </div>
                    ` : ''}

                    <!-- Ações Rápidas 1-Clique -->
                    <div class="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                      <button class="btn-drawer-orc flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold uppercase transition flex items-center justify-center gap-1" data-cliente-id="${op.clienteId}">
                        <span>🎯 Criar Orçamento</span>
                      </button>

                      <button class="btn-drawer-wsp flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold uppercase transition flex items-center justify-center gap-1" data-cliente-id="${op.clienteId}">
                        <span>💬 WhatsApp</span>
                      </button>

                      <button class="btn-drawer-snooze px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold transition" title="Adiar por 30 dias" data-cliente-id="${op.clienteId}">
                        <span>⏸️</span>
                      </button>
                    </div>

                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Rodapé da Gaveta -->
          <div class="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <span class="text-xs text-slate-400 font-medium">PaxFlow Preditivo &bull; Piloto Thiago Costa</span>
            <button id="btn-drawer-full-page" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide transition">
              Ver Tela Completa ➔
            </button>
          </div>

        </div>
      </div>
    `;

    // Listeners da Gaveta
    const closeDrawer = () => {
      if (portal) portal.innerHTML = '';
    };

    portal.querySelector('#btn-close-next-trip-drawer')?.addEventListener('click', closeDrawer);
    portal.querySelector('#btn-drawer-full-page')?.addEventListener('click', () => {
      closeDrawer();
      window.location.hash = '#next-trip';
    });

    // Listeners de Ações dentro do Drawer
    portal.querySelectorAll('.btn-drawer-orc').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-cliente-id');
        const op = this.oportunidades.find(o => o.clienteId === cId);
        if (op) {
          NextTripEngineService.aplicarSnoozeAbordagem(op.clienteId, 30);
          closeDrawer();
          this.onCriarOrcamento(op);
          this.onUpdate();
        }
      });
    });

    portal.querySelectorAll('.btn-drawer-wsp').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-cliente-id');
        const op = this.oportunidades.find(o => o.clienteId === cId);
        if (op) {
          NextTripEngineService.aplicarSnoozeAbordagem(op.clienteId, 30);
          closeDrawer();
          this.onDispararWhatsApp(op);
          this.onUpdate();
        }
      });
    });

    portal.querySelectorAll('.btn-drawer-snooze').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-cliente-id');
        if (cId) {
          NextTripEngineService.aplicarSnoozeAbordagem(cId, 30);
          closeDrawer();
          this.onUpdate();
        }
      });
    });
  }
}
