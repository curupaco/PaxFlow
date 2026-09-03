import { supabase, getSessaoAtual } from '../services/supabase';
import { NextTripEngineService } from '../services/nextTripEngineService';
import { NextTripOpportunity, PerfilConsultor } from '../types';
import { SendTemplateMessageModal } from '../components/dashboard/SendTemplateMessageModal';
import { renderHelpIcon } from '../utils/helpHelper';
import { UpsellEngineService } from '../services/upsellEngineService';
import { isNextTripEnabled } from '../utils/featureFlags';

export class NextTripPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: any = null;
  private oportunidades: NextTripOpportunity[] = [];
  private clientes: any[] = [];
  private viagens: any[] = [];
  private orcamentos: any[] = [];
  private consultores: PerfilConsultor[] = [];
  private settings: any = null;

  // Filtros Locais
  private filterConsultor: string = 'todos';
  private filterProntidao: string = 'todos';
  private filterCategoria: string = 'todos';
  private filterBusca: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async init(): Promise<void> {
    try {
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Por favor, faça login.');
        return;
      }
      this.user = user;
      this.perfil = perfil;

      await this.loadData();

      if (!isNextTripEnabled(this.user, this.perfil, this.settings)) {
        this.renderAuthError('O recurso Next Trip Engine encontra-se desativado nas configurações globais.');
        return;
      }

      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro ao inicializar NextTripPage:', err);
      this.renderAuthError(`Falha ao carregar o Next Trip Engine: ${err.message}`);
    }
  }

  private async loadData(): Promise<void> {
    try {
      const [
        { data: clientesData },
        { data: viagensData },
        { data: orcamentosData },
        { data: consultoresData },
        { data: settingsData }
      ] = await Promise.all([
        supabase.from('clientes').select('*'),
        supabase.from('viagens').select('*, produtos:produtos_viagem(*)'),
        supabase.from('orcamentos').select('*'),
        supabase.from('profiles').select('*').eq('ativo', true),
        supabase.from('global_settings').select('*').limit(1).maybeSingle()
      ]);

      this.clientes = clientesData || [];
      this.viagens = viagensData || [];
      this.orcamentos = orcamentosData || [];
      this.consultores = consultoresData || [];
      this.settings = settingsData || {};

      this.calcularOportunidades();
    } catch (e) {
      console.error('Erro ao carregar dados do Supabase para NextTripPage:', e);
      this.clientes = [];
      this.viagens = [];
      this.orcamentos = [];
      this.consultores = [];
      this.calcularOportunidades();
    }
  }

  private calcularOportunidades(): void {
    const ops = NextTripEngineService.calculateOpportunities(
      this.clientes,
      this.viagens,
      this.orcamentos,
      this.settings,
      this.user?.id,
      this.perfil?.role || 'consultor'
    );

    this.oportunidades = (ops || []).filter(op => op.statusAbordagem !== 'snoozed');
  }

  private getFilteredOportunidades(): NextTripOpportunity[] {
    return this.oportunidades.filter(op => {
      if (this.filterConsultor !== 'todos' && op.consultorId !== this.filterConsultor) return false;
      if (this.filterProntidao === 'alto' && op.nivelProntidao !== 'alto') return false;
      if (this.filterProntidao === 'medio' && op.nivelProntidao !== 'medio') return false;
      if (this.filterCategoria !== 'todos' && op.categoriaDestino !== this.filterCategoria) return false;

      if (this.filterBusca) {
        const term = this.filterBusca.toLowerCase();
        const matchNome = op.clienteNome.toLowerCase().includes(term);
        const matchDestino = op.destinoRecomendado.toLowerCase().includes(term);
        const matchUltimo = op.ultimoDestino.toLowerCase().includes(term);
        if (!matchNome && !matchDestino && !matchUltimo) return false;
      }

      return true;
    });
  }

  private render(): void {
    const isAdmin = this.perfil?.role === 'admin';
    const filtradas = this.getFilteredOportunidades();
    const altaProntidaoCount = this.oportunidades.filter(o => o.nivelProntidao === 'alto').length;
    const mediaProntidaoCount = this.oportunidades.filter(o => o.nivelProntidao === 'medio').length;

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <!-- Cabeçalho -->
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 relative z-10 px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
              <svg width="22" height="22" class="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <span>Next Trip Engine™</span> ${renderHelpIcon('paxflow-next-trip-engine')}
                <span class="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-md self-center leading-none inline-flex items-center">Preditivo</span>
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Inteligência comercial preditiva para identificação e abordagem na janela ideal de recompra</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button id="btn-recarregar-next-trip" class="h-10 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition">
              <span>🔄 Recalcular</span>
            </button>
          </div>
        </header>

        <main class="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          <!-- KPIS SUPERIORES -->
          <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <div class="flex items-center justify-between text-slate-400 mb-2">
                <span class="text-[10px] font-black uppercase tracking-wider">Oportunidades Mapeadas</span>
                <svg width="18" height="18" class="w-4.5 h-4.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <div class="text-2xl font-black text-slate-800 dark:text-white">${this.oportunidades.length}</div>
              <span class="text-[10px] text-slate-400 font-medium">Clientes monitorados na janela de recompra</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs border-l-4 border-l-emerald-500">
              <div class="flex items-center justify-between text-slate-400 mb-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Alto Potencial (>= 75)</span>
                <span class="text-lg">🔥</span>
              </div>
              <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400">${altaProntidaoCount}</div>
              <span class="text-[10px] text-slate-400 font-medium">Prioridade máxima de abordagem comercial</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs border-l-4 border-l-amber-500">
              <div class="flex items-center justify-between text-slate-400 mb-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Médio Potencial</span>
                <span class="text-lg">⏳</span>
              </div>
              <div class="text-2xl font-black text-amber-600 dark:text-amber-400">${mediaProntidaoCount}</div>
              <span class="text-[10px] text-slate-400 font-medium">Clientes em aquecimento gradual</span>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs border-l-4 border-l-indigo-500">
              <div class="flex items-center justify-between text-slate-400 mb-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Algoritmo Preditivo</span>
                <span class="text-lg">🧠</span>
              </div>
              <div class="text-2xl font-black text-indigo-600 dark:text-indigo-400">5 Vetores</div>
              <span class="text-[10px] text-slate-400 font-medium">Sazonalidade + NPS + Perfil + Mês + SLA</span>
            </div>
          </section>

          <!-- BARRA DE FILTROS E BUSCA -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
            
            <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              
              <!-- Busca por Texto -->
              <div class="relative flex-1 min-w-[200px]">
                <input id="input-busca-next-trip" type="text" placeholder="Buscar cliente, destino ou observação..." value="${this.filterBusca}" class="h-10 w-full pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center" />
                <span class="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
              </div>

              <!-- Filtro de Potencial -->
              <select id="select-filter-prontidao" class="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                <option value="todos" ${this.filterProntidao === 'todos' ? 'selected' : ''}>Todos os Potenciais</option>
                <option value="alto" ${this.filterProntidao === 'alto' ? 'selected' : ''}>🔥 Alto Potencial (>= 75)</option>
                <option value="medio" ${this.filterProntidao === 'medio' ? 'selected' : ''}>⏳ Médio Potencial</option>
              </select>

              <!-- Filtro de Categoria -->
              <select id="select-filter-categoria" class="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                <option value="todos" ${this.filterCategoria === 'todos' ? 'selected' : ''}>Todas as Categorias</option>
                <option value="europa" ${this.filterCategoria === 'europa' ? 'selected' : ''}>🇪🇺 Europa</option>
                <option value="resort" ${this.filterCategoria === 'resort' ? 'selected' : ''}>🏖️ Resort All-Inclusive</option>
                <option value="disney" ${this.filterCategoria === 'disney' ? 'selected' : ''}>🏰 Disney / Orlando</option>
                <option value="cruzeiro" ${this.filterCategoria === 'cruzeiro' ? 'selected' : ''}>🚢 Cruzeiro Marítimo</option>
                <option value="nacional" ${this.filterCategoria === 'nacional' ? 'selected' : ''}>🇧🇷 Nacional</option>
              </select>

              <!-- Filtro de Consultores (Admins) -->
              ${isAdmin ? `
                <select id="select-filter-consultor" class="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[160px]">
                  <option value="todos" ${this.filterConsultor === 'todos' ? 'selected' : ''}>Todos Consultores</option>
                  ${this.consultores.map(c => `<option value="${c.id}" ${this.filterConsultor === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                </select>
              ` : ''}

            </div>

            <span class="text-xs font-extrabold text-slate-400 shrink-0">
              Exibindo <strong class="text-indigo-600 dark:text-indigo-400 font-black">${filtradas.length}</strong> de ${this.oportunidades.length}
            </span>
          </div>

          <!-- LISTAGEM DE CARDS DE OPORTUNIDADES -->
          ${filtradas.length === 0 ? `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
              <div class="text-slate-300 dark:text-slate-700 text-5xl">🎯</div>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Nenhuma oportunidade localizada</h3>
              <p class="text-xs text-slate-400 font-medium max-w-sm">Nenhum cliente atendeu aos filtros selecionados ou ainda não há viagens elegíveis (> 3 meses pós-volta).</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              ${filtradas.map(op => this.renderOpportunityCard(op)).join('')}
            </div>
          `}

        </main>
      </div>
    `;
  }

  private renderOpportunityCard(op: NextTripOpportunity): string {
    const isHigh = op.nivelProntidao === 'alto';
    const badgeColor = isHigh
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-500/50 transition duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden group">
        
        <!-- Faixa superior de prioridade -->
        <div class="flex items-center justify-between gap-3">
          <div class="truncate">
            <h4 class="font-black text-slate-900 dark:text-white text-base truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${op.clienteNome}</h4>
            <span class="text-[10px] text-slate-400 font-mono block">Consultor: ${op.consultorNome}</span>
          </div>

          <span class="px-2.5 py-1 rounded-xl text-xs font-black border ${badgeColor} shrink-0">
            🎯 ${op.scoreProntidao}/100
          </span>
        </div>

        <!-- Sugestão Preditiva -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1.5">
          <div class="flex items-center justify-between text-indigo-600 dark:text-indigo-300 font-extrabold text-xs">
            <span>💡 Sugestão: ${op.destinoRecomendado}</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            ${op.motivoSugestao}
          </p>
          <div class="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
            Última viagem: <strong>${op.ultimoDestino}</strong> (${op.ultimaViagemData})
          </div>
        </div>

        ${(() => {
          const upsells = UpsellEngineService.calculateUpsellOpportunities(
            [],
            op.destinoRecomendado,
            op.totalPassageirosGrupo || 2,
            5000,
            this.perfil,
            this.user,
            this.settings
          );
          if (!upsells || upsells.length === 0) return '';

          return `
            <!-- BLOCO PREDIÇÃO UPSELL ENGINE -->
            <div class="p-3 bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-slate-900/70 border border-purple-500/30 rounded-xl space-y-2 text-white">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1">
                  <span>🚀</span> PaxFlow Upsell Engine™
                </span>
                <span class="px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">Preditivo IA</span>
              </div>
              <div class="space-y-1.5">
                ${upsells.map(u => `
                  <div class="p-2 bg-white/5 rounded-lg border border-white/10 space-y-0.5">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-100">
                      <span>${u.titulo}</span>
                      <span class="text-emerald-400 font-extrabold text-[11px]">+ R$ ${u.valorEstimado.toLocaleString('pt-BR')}</span>
                    </div>
                    <p class="text-[10px] text-slate-300 font-medium leading-tight">${u.descricao}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        })()}

        <!-- Botões de Ação Rápida 1-Clique -->
        <div class="flex items-stretch gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button class="btn-next-trip-orc h-10 flex-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-extrabold uppercase tracking-wide transition shadow-sm flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis" data-cliente-id="${op.clienteId}">
            <span>🎯 Criar Orçamento</span>
          </button>

          <button class="btn-next-trip-wsp h-10 flex-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-extrabold uppercase tracking-wide transition shadow-sm flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis" data-cliente-id="${op.clienteId}">
            <span>💬 WhatsApp</span>
          </button>

          <button class="btn-next-trip-snooze h-10 w-10 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center" title="Adiar abordagem por 30 dias" data-cliente-id="${op.clienteId}">
            <span>⏸️</span>
          </button>
        </div>

      </div>
    `;
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // Busca textual
    const inputBusca = this.container.querySelector('#input-busca-next-trip') as HTMLInputElement;
    inputBusca?.addEventListener('input', (e: any) => {
      this.filterBusca = e.target.value;
      this.render();
      this.setupEventListeners();
    });

    // Filtros
    this.container.querySelector('#select-filter-prontidao')?.addEventListener('change', (e: any) => {
      this.filterProntidao = e.target.value;
      this.render();
      this.setupEventListeners();
    });

    this.container.querySelector('#select-filter-categoria')?.addEventListener('change', (e: any) => {
      this.filterCategoria = e.target.value;
      this.render();
      this.setupEventListeners();
    });

    this.container.querySelector('#select-filter-consultor')?.addEventListener('change', (e: any) => {
      this.filterConsultor = e.target.value;
      this.render();
      this.setupEventListeners();
    });

    // Botão recarregar
    this.container.querySelector('#btn-recarregar-next-trip')?.addEventListener('click', async () => {
      await this.loadData();
      this.render();
      this.setupEventListeners();
    });

    // Eventos dos cards
    this.container.querySelectorAll('.btn-next-trip-orc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        const op = this.oportunidades.find(o => o.clienteId === cId);
        if (op) {
          NextTripEngineService.aplicarSnoozeAbordagem(op.clienteId, 30);
          window.location.hash = `#orcamentos?novo=true&cliente_id=${op.clienteId}&destino=${encodeURIComponent(op.destinoRecomendado)}`;
        }
      });
    });

    this.container.querySelectorAll('.btn-next-trip-wsp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        const op = this.oportunidades.find(o => o.clienteId === cId);
        if (op) {
          NextTripEngineService.aplicarSnoozeAbordagem(op.clienteId, 30);
          SendTemplateMessageModal.open({
            clienteNome: op.clienteNome,
            clienteTelefone: op.clienteTelefone || '',
            destino: op.destinoRecomendado,
            consultorNome: op.consultorNome,
            showToast: (msg, type) => console.log(msg, type)
          });
        }
      });
    });

    this.container.querySelectorAll('.btn-next-trip-snooze').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        if (cId) {
          NextTripEngineService.aplicarSnoozeAbordagem(cId, 30);
          this.calcularOportunidades();
          this.render();
          this.setupEventListeners();
        }
      });
    });
  }

  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div class="text-4xl mb-3">⚠️</div>
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 uppercase">${msg}</h2>
      </div>
    `;
  }
}
