import { supabase, getSessaoAtual } from '../services/supabase';
import { NextTripEngineService } from '../services/nextTripEngineService';
import { NextTripOpportunity, PerfilConsultor } from '../types';
import { SendTemplateMessageModal } from '../components/dashboard/SendTemplateMessageModal';
import { renderHelpIcon } from '../utils/helpHelper';
import { UpsellEngineService } from '../services/upsellEngineService';
import { isNextTripEnabled } from '../utils/featureFlags';
import { showCustomAlert, showCustomConfirm } from '../services/dialog';
import { debounce } from '../utils/textHelper';

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
  private debouncedSearch: (val: string) => void;

  // Seleção e Ações em Lote
  private oportunidadesSelecionadas: Set<string> = new Set();


  constructor(container: HTMLElement) {
    this.container = container;
    this.debouncedSearch = debounce((val: string) => {
      this.filterBusca = val;
      this.render();
      this.setupEventListeners();
      const input = this.container?.querySelector('#input-busca-next-trip') as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 300);
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
        supabase.from('viagens').select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)'),
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
    const userRole = this.perfil?.role || (this.user?.id === 'sandbox-user-id' ? 'admin' : 'consultor');
    const ops = NextTripEngineService.calculateOpportunities(
      this.clientes,
      this.viagens,
      this.orcamentos,
      this.settings,
      this.user?.id,
      userRole
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
    const opsConsultor = this.filterConsultor === 'todos'
      ? this.oportunidades
      : this.oportunidades.filter(o => o.consultorId === this.filterConsultor);
    const totalOps = opsConsultor.length;
    const altaProntidaoCount = opsConsultor.filter(o => o.nivelProntidao === 'alto').length;
    const mediaProntidaoCount = opsConsultor.filter(o => o.nivelProntidao === 'medio').length;

    const todasSelecionadas = filtradas.length > 0 && filtradas.every(op => this.oportunidadesSelecionadas.has(op.clienteId));

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
              <div class="text-2xl font-black text-slate-800 dark:text-white">${totalOps}</div>
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

            <div id="card-algoritmo-preditivo" class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs border-l-4 border-l-indigo-500 cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition group">
              <div class="flex items-center justify-between text-slate-400 mb-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  Algoritmo Preditivo
                  <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 group-hover:bg-indigo-600 group-hover:text-white transition">Clique para Ver Regras ➔</span>
                </span>
                <span class="text-lg group-hover:scale-110 transition-transform">🧠</span>
              </div>
              <div class="text-2xl font-black text-indigo-600 dark:text-indigo-400">5 Vetores</div>
              <span class="text-[10px] text-slate-400 font-medium">Sazonalidade + NPS + Perfil + Mês + SLA</span>
            </div>
          </section>

          <!-- BARRA DE FILTROS E BUSCA -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
            
            <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              
              <!-- Checkbox Selecionar Todos -->
              <div class="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-700">
                <input type="checkbox" id="chk-selecionar-todas-next-trip" class="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer" ${todasSelecionadas ? 'checked' : ''} />
                <label for="chk-selecionar-todas-next-trip" class="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  Selecionar Todos
                </label>
              </div>

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
              Exibindo <strong class="text-indigo-600 dark:text-indigo-400 font-black">${filtradas.length}</strong> de ${totalOps}
            </span>
          </div>

          <!-- BARRA DE AÇÕES EM LOTE COM PRESETS (QUANDO HOUVER SELECIONADOS) -->
          ${this.oportunidadesSelecionadas.size > 0 ? `
            <div class="p-4 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-black shadow-xs">⚡</span>
                <div>
                  <h4 class="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                    ${this.oportunidadesSelecionadas.size} oportunidades selecionadas
                  </h4>
                  <p class="text-[10.5px] text-indigo-700/80 dark:text-indigo-400 font-medium">Dispare ações comerciais ou aplique snooze em bloco diretamente no banco.</p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button type="button" id="btn-lote-exportar-texto" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                  <span>💬</span> Roteiro WhatsApp (Texto)
                </button>

                <button type="button" id="btn-lote-exportar-csv" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                  <span>📊</span> Exportar CSV
                </button>

                <button type="button" id="btn-lote-copiar-telefones" class="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                  <span>📋</span> Copiar Telefones
                </button>

                <button type="button" id="btn-lote-snooze-30" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                  <span>⏸️</span> Snooze em Bloco (30D)
                </button>

                <button type="button" id="btn-lote-limpar-selecao" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold transition cursor-pointer" title="Desmarcar todos">
                  ✕
                </button>
              </div>
            </div>
          ` : ''}

          <!-- LISTAGEM DE CARDS DE OPORTUNIDADES -->
          ${filtradas.length === 0 ? `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
              <div class="text-slate-300 dark:text-slate-700 text-5xl">🎯</div>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Nenhuma oportunidade localizada</h3>
              <p class="text-xs text-slate-400 font-medium max-w-sm">Nenhum cliente atendeu aos filtros selecionados ou ainda não há viagens ou orçamentos elegíveis (> 30 dias de inatividade).</p>
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
    const isSelected = this.oportunidadesSelecionadas.has(op.clienteId);
    const badgeColor = isHigh
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';

    const isOrcamento = op.origemOportunidade === 'orcamento_recusado';
    const tagOrigemHtml = isOrcamento
      ? `<span class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 inline-flex items-center gap-1">🎯 Orçamento Reativado</span>`
      : `<span class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">✈️ Viagem Concluída</span>`;

    const labelUltimaInteracao = isOrcamento ? 'Último orçamento' : 'Última viagem';

    return `
      <div class="bg-white dark:bg-slate-900 border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-5 shadow-xs hover:border-indigo-500/50 transition duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden group">
        
        <!-- Faixa superior de prioridade com Checkbox de seleção -->
        <div class="flex items-center justify-between gap-3">
          <div class="truncate space-y-1 flex items-start gap-2.5">
            <input type="checkbox" class="chk-next-trip-item h-4 w-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0" data-cliente-id="${op.clienteId}" ${isSelected ? 'checked' : ''} />
            <div class="truncate">
              <div class="flex items-center gap-2">
                <h4 class="font-black text-slate-900 dark:text-white text-base truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${op.clienteNome}</h4>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                ${tagOrigemHtml}
                <span class="text-[10px] text-slate-400 font-mono block">Consultor: ${op.consultorNome}</span>
              </div>
            </div>
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
            ${labelUltimaInteracao}: <strong>${op.ultimoDestino}</strong> (${op.ultimaViagemData})
          </div>
        </div>

        <!-- BLOCO RADAR HEURÍSTICO: PRÓXIMO PASSO NATURAL -->
        ${op.destinoComplementarSugerido ? `
          <div class="p-3 bg-gradient-to-r from-sky-950/70 via-indigo-950/70 to-slate-900/70 border border-sky-500/30 rounded-xl space-y-1.5 text-white">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-sky-300 tracking-wider flex items-center gap-1">
                <span>🧭</span> Radar de Destinos Complementares
              </span>
              <span class="px-1.5 py-0.5 rounded text-[8px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">Próximo Passo</span>
            </div>
            <div class="text-xs font-bold text-sky-100 flex items-center gap-1.5">
              <span>📍 Sugestão:</span> <span class="text-white">${op.destinoComplementarSugerido}</span>
            </div>
            <p class="text-[10px] text-slate-300 font-medium leading-relaxed">
              ${op.motivoComplementar || ''}
            </p>
          </div>
        ` : ''}

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
                <span class="px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">Preditivo</span>
              </div>
              <div class="space-y-1.5">
                ${upsells.map(u => `
                  <div class="p-2 bg-white/5 rounded-lg border border-white/10 space-y-0.5">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-100">
                      <span>${u.titulo}</span>
                      <span class="text-emerald-400 font-extrabold text-[11px]">+ R$ ${u.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

          <button class="btn-next-trip-auditoria h-10 w-10 shrink-0 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition flex items-center justify-center border border-indigo-200/50 dark:border-slate-700" title="Ver auditoria detalhada dos 5 vetores deste cliente" data-cliente-id="${op.clienteId}">
            <span>🧠</span>
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

    // Clique no Card 4 do Algoritmo Preditivo (Transparência total)
    this.container.querySelector('#card-algoritmo-preditivo')?.addEventListener('click', () => {
      this.openAlgoritmoModal();
    });

    // Busca textual
    const inputBusca = this.container.querySelector('#input-busca-next-trip') as HTMLInputElement;
    inputBusca?.addEventListener('input', (e: any) => {
      this.debouncedSearch(e.target.value);
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

    // Checkbox Selecionar Todos
    const chkTodos = this.container.querySelector('#chk-selecionar-todas-next-trip') as HTMLInputElement | null;
    chkTodos?.addEventListener('change', (e: any) => {
      const filtradas = this.getFilteredOportunidades();
      if (e.target.checked) {
        filtradas.forEach(op => this.oportunidadesSelecionadas.add(op.clienteId));
      } else {
        filtradas.forEach(op => this.oportunidadesSelecionadas.delete(op.clienteId));
      }
      this.render();
      this.setupEventListeners();
    });

    // Checkbox Individual de Cada Oportunidade
    this.container.querySelectorAll('.chk-next-trip-item').forEach(chk => {
      chk.addEventListener('change', (e: any) => {
        const cId = chk.getAttribute('data-cliente-id');
        if (!cId) return;
        if (e.target.checked) {
          this.oportunidadesSelecionadas.add(cId);
        } else {
          this.oportunidadesSelecionadas.delete(cId);
        }
        this.render();
        this.setupEventListeners();
      });
    });

    // Ações em Lote: Limpar Seleção
    this.container.querySelector('#btn-lote-limpar-selecao')?.addEventListener('click', () => {
      this.oportunidadesSelecionadas.clear();
      this.render();
      this.setupEventListeners();
    });

    // Ações em Lote: Exportar Roteiro WhatsApp (Texto)
    this.container.querySelector('#btn-lote-exportar-texto')?.addEventListener('click', async () => {
      const opsSelecionadas = this.oportunidades.filter(op => this.oportunidadesSelecionadas.has(op.clienteId));
      if (opsSelecionadas.length === 0) return;

      const textoLote = NextTripEngineService.gerarLoteAbordagemTexto(opsSelecionadas);
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(textoLote);
        }
      } catch (_) {}

      // Dispara download do arquivo .txt
      const blob = new Blob([textoLote], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `next-trip-roteiros-whatsapp-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      showCustomAlert(`Roteiro comercial de ${opsSelecionadas.length} clientes gerado e baixado! O conteúdo também foi copiado para sua área de transferência.`, 'Roteiros WhatsApp Exportados');
    });

    // Ações em Lote: Exportar Planilha CSV
    this.container.querySelector('#btn-lote-exportar-csv')?.addEventListener('click', () => {
      const opsSelecionadas = this.oportunidades.filter(op => this.oportunidadesSelecionadas.has(op.clienteId));
      if (opsSelecionadas.length === 0) return;

      const csvContent = NextTripEngineService.gerarCsvAbordagem(opsSelecionadas);
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `next-trip-oportunidades-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      showCustomAlert(`Planilha CSV com ${opsSelecionadas.length} oportunidades exportada com sucesso!`, 'Exportação CSV Concluída');
    });

    // Ações em Lote: Copiar Telefones
    this.container.querySelector('#btn-lote-copiar-telefones')?.addEventListener('click', async () => {
      const opsSelecionadas = this.oportunidades.filter(op => this.oportunidadesSelecionadas.has(op.clienteId));
      const telefones = opsSelecionadas
        .map(o => o.clienteTelefone ? o.clienteTelefone.replace(/\D/g, '') : '')
        .filter(t => t.length >= 8);

      if (telefones.length === 0) {
        showCustomAlert('Nenhum telefone válido encontrado entre as oportunidades selecionadas.', 'Aviso');
        return;
      }

      const listaStr = telefones.join(', ');
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(listaStr);
        }
      } catch (_) {}

      showCustomAlert(`${telefones.length} número(s) de WhatsApp copiados para a área de transferência!`, 'Telefones Copiados');
    });

    // Ações em Lote: Snooze em Bloco (30 Dias)
    this.container.querySelector('#btn-lote-snooze-30')?.addEventListener('click', async () => {
      const ids = Array.from(this.oportunidadesSelecionadas);
      if (ids.length === 0) return;

      const confirmou = await showCustomConfirm(
        `Tem certeza de que deseja pausar (snooze de 30 dias) a abordagem para as ${ids.length} oportunidades selecionadas?`,
        'Confirmar Snooze em Lote'
      );
      if (!confirmou) return;

      try {
        const res = await NextTripEngineService.aplicarSnoozeEmLote(ids, 30);
        this.clientes.forEach(c => {
          if (this.oportunidadesSelecionadas.has(c.id)) {
            c.next_trip_snooze_until = res.dataLimiteIso;
          }
        });

        this.oportunidadesSelecionadas.clear();
        this.calcularOportunidades();
        this.render();
        this.setupEventListeners();

        showCustomAlert(`Snooze de 30 dias aplicado com sucesso no Supabase para ${res.sucesso} oportunidades!`, 'Snooze em Bloco Concluído');
      } catch (err) {
        console.error('Falha ao aplicar snooze em lote:', err);
        showCustomAlert('Ocorreu um erro ao persistir o snooze em lote no banco. Verifique sua conexão.', 'Erro no Snooze');
      }
    });

    // Botão recarregar
    this.container.querySelector('#btn-recarregar-next-trip')?.addEventListener('click', async () => {
      await this.loadData();
      this.render();
      this.setupEventListeners();
    });

    // Auditoria de cada cliente
    this.container.querySelectorAll('.btn-next-trip-auditoria').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        const op = this.oportunidades.find(o => o.clienteId === cId);
        if (op) {
          this.openAuditoriaClienteModal(op);
        }
      });
    });

    // Eventos dos cards
    this.container.querySelectorAll('.btn-next-trip-orc').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        const op = this.oportunidades.find(o => o.clienteId === cId);
        if (op) {
          try {
            await NextTripEngineService.aplicarSnoozeAbordagem(op.clienteId, 30);
          } catch (err) {
            console.error('Falha ao registrar snooze de orçamento:', err);
          }
          window.location.hash = `#orcamentos?novo=true&cliente_id=${op.clienteId}&destino=${encodeURIComponent(op.destinoRecomendado)}`;
        }
      });
    });

    this.container.querySelectorAll('.btn-next-trip-wsp').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        const op = this.oportunidades.find(o => o.clienteId === cId);
        if (op) {
          try {
            await NextTripEngineService.aplicarSnoozeAbordagem(op.clienteId, 30);
          } catch (err) {
            console.error('Falha ao registrar snooze de whatsapp:', err);
          }
          SendTemplateMessageModal.open({
            clienteNome: op.clienteNome,
            clienteTelefone: op.clienteTelefone || '',
            destino: op.destinoRecomendado,
            consultorNome: op.consultorNome,
            showToast: (msg, type) => {
              if (type === 'error') console.error(msg);
            }
          });
        }
      });
    });

    this.container.querySelectorAll('.btn-next-trip-snooze').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const cId = btn.getAttribute('data-cliente-id');
        if (cId) {
          try {
            const snoozeIso = await NextTripEngineService.aplicarSnoozeAbordagem(cId, 30);
            const cli = this.clientes.find(c => c.id === cId);
            if (cli) {
              cli.next_trip_snooze_until = snoozeIso;
            }
            this.calcularOportunidades();
            this.render();
            this.setupEventListeners();
          } catch (err) {
            console.error('Falha ao aplicar snooze:', err);
            showCustomAlert('Não foi possível adiar o contato com este cliente. Verifique sua conexão e tente novamente.', 'Falha ao Adiar Contato');
          }
        }
      });
    });
  }

  /**
   * Abre o Modal Explicativo dos 5 Vetores (Auditoria e Transparência do Motor)
   */
  private openAlgoritmoModal(): void {
    let portal = document.getElementById('next-trip-algoritmo-modal-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'next-trip-algoritmo-modal-portal';
      document.body.appendChild(portal);
    }

    portal.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div class="w-full max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
          
          <!-- Cabeçalho -->
          <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <div class="flex items-center gap-3">
              <span class="p-2.5 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xl font-bold">🧠</span>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Next Trip Engine™ &bull; 5 Vetores Preditivos
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Arquitetura Matemática e Regras de Negócio do Motor de Recompra</p>
              </div>
            </div>
            <button id="btn-close-algoritmo-modal" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Corpo do Modal -->
          <div class="p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs">
            
            <div class="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-indigo-900 dark:text-indigo-200 leading-relaxed font-medium">
              💡 <strong>Transparência Operacional:</strong> O PaxFlow calcula o <em>Score de Prontidão (0 a 100)</em> de forma 100% determinística através de 5 vetores estatísticos baseados nos registros reais de viagens, NPS e orçamentos do Supabase. Não há "caixa preta".
            </div>

            <div class="space-y-3">
              <!-- Vetor 1 -->
              <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <div class="flex items-center justify-between font-black text-slate-800 dark:text-white">
                  <span class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <span>📅</span> 1. Sazonalidade & Janela Temporal
                  </span>
                  <span class="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px]">Até 30 pts</span>
                </div>
                <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Calcula o intervalo desde a última viagem ou orçamento do cliente. Clientes na janela de <strong>10 a 14 meses (~1 ano)</strong> recebem a pontuação máxima (30 pts), pois coincide com o ciclo anual de férias. Entre 5 a 9 meses ou 15 a 24 meses recebem pontuação intermediária (20 a 25 pts).
                </p>
              </div>

              <!-- Vetor 2 -->
              <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <div class="flex items-center justify-between font-black text-slate-800 dark:text-white">
                  <span class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <span>⭐</span> 2. Satisfação do Cliente (NPS)
                  </span>
                  <span class="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px]">Até 25 pts</span>
                </div>
                <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Clientes <strong>Promotores (NPS 9 ou 10)</strong> somam 25 pts pela alta probabilidade de recompra. Clientes no patamar neutro (NPS &ge; 8 ou sem avaliação cadastrada) recebem 15 pts neutros de segurança. Clientes <em>Detratores (NPS &lt; 8)</em> são <strong>descartados preventivamente</strong> para que a agência faça recuperação prévia de relacionamento antes de ofertar vendas.
                </p>
              </div>

              <!-- Vetor 3 -->
              <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <div class="flex items-center justify-between font-black text-slate-800 dark:text-white">
                  <span class="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <span>🌍</span> 3. Perfil de Destino & Passageiros
                  </span>
                  <span class="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px]">Até 20 pts</span>
                </div>
                <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Identifica afinidade temática baseada nos destinos cotados e emitidos (Europa, Resorts All-Inclusive, Cruzeiros, Disney/Orlando ou Nacional). Atribui até 20 pts e sugere automaticamente um roteiro compatível com a composição de passageiros.
                </p>
              </div>

              <!-- Vetor 4 -->
              <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <div class="flex items-center justify-between font-black text-slate-800 dark:text-white">
                  <span class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <span>☀️</span> 4. Mês Habitual de Férias
                  </span>
                  <span class="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px]">Até 15 pts</span>
                </div>
                <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Compara o mês corrente e o mês subsequente com o mês em que o cliente tradicionalmente viaja. Se houver coincidência de calendário, concede <strong>15 pts de bônus</strong> (gatilho de antecipação comercial).
                </p>
              </div>

              <!-- Vetor 5 -->
              <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <div class="flex items-center justify-between font-black text-slate-800 dark:text-white">
                  <span class="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <span>🛡️</span> 5. Conformidade Operacional & SLA
                  </span>
                  <span class="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px]">Até 10 pts</span>
                </div>
                <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Audita se o cliente possui reembolsos não finalizados ou pendências em aberto. Se estiver 100% regular, concede 10 pts. Se houver reembolso em aberto, o vetor é zerado para proteger a experiência do cliente.
                </p>
              </div>
            </div>

            <!-- Regras de Exclusão Defensiva -->
            <div class="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-700">
              <h4 class="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span>🚫</span> Regras Rígidas de Bloqueio (Governança)
              </h4>
              <ul class="space-y-1 text-slate-600 dark:text-slate-300 pl-4 list-disc font-medium">
                <li><strong>Viagem Futura Ativa:</strong> Se o cliente já tem viagem agendada no sistema, ele NUNCA é abordado.</li>
                <li><strong>Orçamento Ativo no Funil:</strong> Clientes com cotação em status SOLICITADO, EM_ANDAMENTO ou AGUARDANDO são protegidos para não gerar ruído no atendimento.</li>
                <li><strong>Carência Mínima:</strong> Carência de 30 dias após retorno de viagem ou recusa de proposta.</li>
                <li><strong>Snooze (Pausa):</strong> Ao clicar no botão de pausa (⏸️), a oportunidade fica oculta pelo período determinado via Supabase.</li>
              </ul>
            </div>

          </div>

          <!-- Rodapé do Modal -->
          <div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
            <button id="btn-close-algoritmo-modal-footer" class="h-[42px] px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wide transition shadow-md shadow-indigo-600/15">
              Entendido
            </button>
          </div>

        </div>
      </div>
    `;

    const closeModal = () => {
      if (portal) portal.innerHTML = '';
    };

    portal.querySelector('#btn-close-algoritmo-modal')?.addEventListener('click', closeModal);
    portal.querySelector('#btn-close-algoritmo-modal-footer')?.addEventListener('click', closeModal);
  }

  /**
   * Abre o Modal de Auditoria Específica de um Cliente
   */
  private openAuditoriaClienteModal(op: NextTripOpportunity): void {
    let portal = document.getElementById('next-trip-auditoria-modal-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'next-trip-auditoria-modal-portal';
      document.body.appendChild(portal);
    }

    const det = op.vetoresDetalhamento;

    portal.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div class="w-full max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
          
          <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <div>
              <div class="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Auditoria Matemática</div>
              <h3 class="text-base font-black text-slate-900 dark:text-white truncate">${op.clienteNome}</h3>
            </div>
            <span class="px-3 py-1 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-sm">
              🎯 ${op.scoreProntidao}/100
            </span>
          </div>

          <div class="p-5 overflow-y-auto space-y-3.5 custom-scrollbar text-xs">
            
            ${det ? `
              <!-- Vetor 1 -->
              <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <div class="flex items-center justify-between font-bold text-slate-800 dark:text-white">
                  <span>📅 Sazonalidade & Janela</span>
                  <span class="text-indigo-600 dark:text-indigo-400 font-black">${det.sazonalidade.score}/${det.sazonalidade.max} pts</span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">${det.sazonalidade.detalhe}</p>
              </div>

              <!-- Vetor 2 -->
              <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <div class="flex items-center justify-between font-bold text-slate-800 dark:text-white">
                  <span>⭐ Satisfação & NPS</span>
                  <span class="text-emerald-600 dark:text-emerald-400 font-black">${det.nps.score}/${det.nps.max} pts</span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">${det.nps.detalhe}</p>
              </div>

              <!-- Vetor 3 -->
              <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <div class="flex items-center justify-between font-bold text-slate-800 dark:text-white">
                  <span>🌍 Perfil de Destino</span>
                  <span class="text-purple-600 dark:text-purple-400 font-black">${det.perfil.score}/${det.perfil.max} pts</span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">${det.perfil.detalhe}</p>
              </div>

              <!-- Vetor 4 -->
              <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <div class="flex items-center justify-between font-bold text-slate-800 dark:text-white">
                  <span>☀️ Mês Habitual de Férias</span>
                  <span class="text-amber-600 dark:text-amber-400 font-black">${det.mesHabitual.score}/${det.mesHabitual.max} pts</span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">${det.mesHabitual.detalhe}</p>
              </div>

              <!-- Vetor 5 -->
              <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <div class="flex items-center justify-between font-bold text-slate-800 dark:text-white">
                  <span>🛡️ Conformidade & SLA</span>
                  <span class="text-blue-600 dark:text-blue-400 font-black">${det.conformidadeSla.score}/${det.conformidadeSla.max} pts</span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">${det.conformidadeSla.detalhe}</p>
              </div>
            ` : `
              <p class="text-slate-400">Score consolidado: <strong>${op.scoreProntidao}/100</strong>.</p>
            `}

            <div class="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              Última interação: <strong>${op.ultimoDestino}</strong> em ${op.ultimaViagemData}. Consultor responsável: <strong>${op.consultorNome}</strong>.
            </div>

          </div>

          <div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
            <button id="btn-close-auditoria-modal" class="h-[42px] px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-black uppercase tracking-wide transition">
              Fechar
            </button>
          </div>

        </div>
      </div>
    `;

    portal.querySelector('#btn-close-auditoria-modal')?.addEventListener('click', () => {
      if (portal) portal.innerHTML = '';
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

  /**
   * Destrutor da página para limpeza de referências e eventos ao transicionar rotas
   */
  public destroy(): void {
    this.oportunidades = [];
    this.clientes = [];
    this.viagens = [];
    this.orcamentos = [];
    this.consultores = [];
  }
}
