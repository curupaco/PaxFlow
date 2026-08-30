import { NextTripOpportunity } from '../../types';
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
      this.container.innerHTML = '';
      return;
    }

    const altaProntidaoCount = this.oportunidades.filter(o => o.nivelProntidao === 'alto').length;
    const exibicaoOps = this.oportunidades.slice(0, 6); // Exibe até 6 principais oportunidades

    const html = `
      <div class="mb-6 p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl shadow-xl border border-indigo-500/30 animate-fade-in shrink-0">
        
        <!-- Cabeçalho do Widget -->
        <div class="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-indigo-500/20 flex-wrap">
          <div class="flex items-center gap-2.5">
            <span class="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-base">🎯</span>
            <div>
              <h3 class="text-sm font-black tracking-wide text-indigo-100 uppercase font-sans">Next Trip Engine™ — Oportunidades de Recompra</h3>
              <p class="text-xs text-indigo-300">Clientes com alto potencial de recompra identificados pelo algoritmo preditivo.</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              🔥 ${altaProntidaoCount} Alta Prontidão
            </span>
            <span class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-500/30">
              ${this.oportunidades.length} Oportunidade(s)
            </span>
          </div>
        </div>

        <!-- Cards de Oportunidade -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${exibicaoOps.map(op => `
            <div class="bg-slate-800/90 border border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-indigo-500/60 transition shadow-md">
              
              <div>
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <div class="truncate">
                    <span class="font-black text-sm text-white block truncate">${op.clienteNome}</span>
                    <span class="text-[10px] text-slate-400 font-mono block">Titular: ${op.consultorNome}</span>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-black border ${
                    op.nivelProntidao === 'alto' 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }">
                    🎯 ${op.scoreProntidao}/100
                  </span>
                </div>

                <div class="p-2 bg-slate-900/80 rounded-lg border border-slate-700/40 space-y-1 my-2 text-xs">
                  <div class="flex items-center justify-between text-indigo-200 font-bold truncate">
                    <span>💡 ${op.destinoRecomendado}</span>
                  </div>
                  <div class="text-[11px] text-slate-300 font-medium">
                    ${op.motivoSugestao}
                  </div>
                  <div class="text-[10px] text-slate-400 font-mono">
                    Última viagem: ${op.ultimoDestino} (${op.ultimaViagemData})
                  </div>
                </div>
              </div>

              <!-- Ações Rápidas 1-Clique -->
              <div class="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-700/40">
                <button class="btn-next-trip-orc flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase transition shadow-sm flex items-center justify-center gap-1" data-cliente-id="${op.clienteId}">
                  <span>🎯 Orçamento</span>
                </button>
                
                <button class="btn-next-trip-wsp flex-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase transition shadow-sm flex items-center justify-center gap-1" data-cliente-id="${op.clienteId}">
                  <span>💬 WhatsApp</span>
                </button>

                <button class="btn-next-trip-snooze p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[10px] font-bold transition" title="Snooze / Pausar por 30 dias" data-cliente-id="${op.clienteId}">
                  <span>⏸️</span>
                </button>
              </div>

            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.container) return;

    // Listener para Criar Orçamento Preditivo
    this.container.querySelectorAll('.btn-next-trip-orc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        const op = this.oportunidades.find(o => o.clienteId === cId);
        if (op) {
          NextTripEngineService.aplicarSnoozeAbordagem(op.clienteId, 30);
          this.onCriarOrcamento(op);
          this.onUpdate();
        }
      });
    });

    // Listener para Disparar WhatsApp
    this.container.querySelectorAll('.btn-next-trip-wsp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        const op = this.oportunidades.find(o => o.clienteId === cId);
        if (op) {
          NextTripEngineService.aplicarSnoozeAbordagem(op.clienteId, 30);
          this.onDispararWhatsApp(op);
          this.onUpdate();
        }
      });
    });

    // Listener para Snooze manual
    this.container.querySelectorAll('.btn-next-trip-snooze').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        if (cId) {
          NextTripEngineService.aplicarSnoozeAbordagem(cId, 30);
          this.onUpdate();
        }
      });
    });
  }
}
