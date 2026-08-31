import { NextTripOpportunity } from '../../types';
import { NextTripEngineService } from '../../services/nextTripEngineService';

export class NextTripDashboardWidget {
  private container: HTMLElement;
  private oportunidades: NextTripOpportunity[];
  private onCriarOrcamento: (op: NextTripOpportunity) => void;
  private onDispararWhatsApp: (op: NextTripOpportunity) => void;
  private onUpdate: () => void;
  private isCollapsed: boolean = localStorage.getItem('paxflow_next_trip_collapsed') === 'true';

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
        <div class="mb-4 p-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl shadow-lg border border-indigo-500/30 animate-fade-in shrink-0">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2.5">
              <span class="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 text-base">🎯</span>
              <div>
                <h3 class="text-xs font-black tracking-wide text-indigo-100 uppercase font-sans">Next Trip Engine™ — Motor Preditivo de Recompra</h3>
                <p class="text-[11px] text-indigo-300">Inteligência comercial preditiva para identificar clientes no momento ideal de nova compra.</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button id="btn-gerar-demo-next-trip" class="shrink-0 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-[10px] rounded-xl shadow transition uppercase tracking-wide border border-indigo-400/30 flex items-center gap-1.5">
                <span>🎯</span> Simular Oportunidades Demo
              </button>
            </div>
          </div>
        </div>
      `;

      this.container.querySelector('#btn-gerar-demo-next-trip')?.addEventListener('click', () => {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('next_trip_snooze_')) localStorage.removeItem(key);
        });
        (window as any).paxflowForceNextTripDemo = true;
        this.onUpdate();
      });

      return;
    }

    const altaProntidaoCount = this.oportunidades.filter(o => o.nivelProntidao === 'alto').length;
    const exibicaoOps = this.oportunidades.slice(0, 9); // Exibe até 9 oportunidades

    if (this.isCollapsed) {
      // VISÃO RECOLHIDA (Compacta - 1 linha)
      this.container.innerHTML = `
        <div class="mb-4 px-4 py-2.5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-xl shadow-md border border-indigo-500/30 flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="text-base">🎯</span>
            <span class="text-xs font-black tracking-wide text-indigo-100 uppercase font-sans">Next Trip Engine™</span>
            <span class="text-xs text-indigo-300 hidden sm:inline">&bull; ${this.oportunidades.length} Oportunidade(s) de Recompra</span>
            ${altaProntidaoCount > 0 ? `
              <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
                🔥 ${altaProntidaoCount} Alta Prontidão
              </span>
            ` : ''}
          </div>

          <button id="btn-toggle-next-trip-collapse" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold uppercase rounded-lg border border-indigo-400/30 transition flex items-center gap-1">
            <span>Expandir Painel ▼</span>
          </button>
        </div>
      `;

      this.container.querySelector('#btn-toggle-next-trip-collapse')?.addEventListener('click', () => {
        this.isCollapsed = false;
        localStorage.setItem('paxflow_next_trip_collapsed', 'false');
        this.render();
      });
      return;
    }

    // VISÃO EXPANDIDA (Com scroll máximo de 320px para não bloquear a página)
    const html = `
      <div class="mb-4 p-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl shadow-xl border border-indigo-500/30 animate-fade-in shrink-0">
        
        <!-- Cabeçalho do Widget -->
        <div class="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-indigo-500/20 flex-wrap">
          <div class="flex items-center gap-2.5">
            <span class="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 text-base">🎯</span>
            <div>
              <h3 class="text-xs font-black tracking-wide text-indigo-100 uppercase font-sans">Next Trip Engine™ — Oportunidades de Recompra</h3>
              <p class="text-[11px] text-indigo-300">Clientes com alto potencial de recompra identificados pelo algoritmo preditivo.</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              🔥 ${altaProntidaoCount} Alta Prontidão
            </span>
            <span class="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-500/30">
              ${this.oportunidades.length} Oportunidades
            </span>
            
            <button id="btn-open-full-next-trip" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold uppercase rounded-lg border border-indigo-400/30 transition flex items-center gap-1">
              <span>Ver Tela Completa ➔</span>
            </button>

            <button id="btn-toggle-next-trip-collapse" class="ml-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded-lg border border-slate-700 transition flex items-center gap-1">
              <span>Recolher ▲</span>
            </button>
          </div>
        </div>

        <!-- Cards de Oportunidade com Scroll Limitado -->
        <div class="max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${exibicaoOps.map(op => `
              <div class="bg-slate-800/90 border border-slate-700/70 rounded-xl p-3 flex flex-col justify-between gap-2.5 hover:border-indigo-500/60 transition shadow-md">
                
                <div>
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <div class="truncate">
                      <span class="font-black text-xs text-white block truncate">${op.clienteNome}</span>
                      <span class="text-[9px] text-slate-400 font-mono block">Titular: ${op.consultorNome}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[9px] font-black border ${
                      op.nivelProntidao === 'alto' 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }">
                      🎯 ${op.scoreProntidao}/100
                    </span>
                  </div>

                  <div class="p-2 bg-slate-900/80 rounded-lg border border-slate-700/40 space-y-0.5 my-1.5 text-xs">
                    <div class="flex items-center justify-between text-indigo-200 font-bold truncate text-[11px]">
                      <span>💡 ${op.destinoRecomendado}</span>
                    </div>
                    <div class="text-[10px] text-slate-300 font-medium leading-tight">
                      ${op.motivoSugestao}
                    </div>
                    <div class="text-[9px] text-slate-400 font-mono">
                      Última viagem: ${op.ultimoDestino} (${op.ultimaViagemData})
                    </div>
                  </div>
                </div>

                <!-- Ações Rápidas 1-Clique -->
                <div class="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-700/40">
                  <button class="btn-next-trip-orc flex-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase transition shadow-sm flex items-center justify-center gap-1" data-cliente-id="${op.clienteId}">
                    <span>🎯 Orçamento</span>
                  </button>
                  
                  <button class="btn-next-trip-wsp flex-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase transition shadow-sm flex items-center justify-center gap-1" data-cliente-id="${op.clienteId}">
                    <span>💬 WhatsApp</span>
                  </button>

                  <button class="btn-next-trip-snooze p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[9px] font-bold transition" title="Snooze / Pausar por 30 dias" data-cliente-id="${op.clienteId}">
                    <span>⏸️</span>
                  </button>
                </div>

              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.container) return;

    // Listener de Abrir Tela Completa
    this.container.querySelector('#btn-open-full-next-trip')?.addEventListener('click', () => {
      window.location.hash = '#next-trip';
    });

    // Listener de Recolher/Expandir
    this.container.querySelector('#btn-toggle-next-trip-collapse')?.addEventListener('click', () => {
      this.isCollapsed = true;
      localStorage.setItem('paxflow_next_trip_collapsed', 'true');
      this.render();
    });

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
