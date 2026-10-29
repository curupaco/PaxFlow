import { supabase, getSessaoAtual } from '../services/supabase';
import { 
  PerfilConsultor, 
  FinContaPagar, 
  FinRemessa, 
  FinTipoCusto, 
  FinCategoria, 
  FinSubcategoria, 
  FinContaBancaria,
  FinFiltrosContas,
  FinResumoLiquidez,
  FinPrevistoVsRealizadoItem
} from '../types';
import { FinContasPagarService } from '../services/finContasPagarService';
import { FinPlanoContasService } from '../services/finPlanoContasService';
import { FinRemessasService } from '../services/finRemessasService';
import { showCustomAlert, showCustomConfirm } from '../services/dialog';
import { renderHelpIcon } from '../utils/helpHelper';

export class FinanceiroPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private activeTab: 'contas' | 'remessas' | 'fluxo' | 'plano' = 'contas';
  private carregando: boolean = false;

  // Listagens de dados
  private contas: FinContaPagar[] = [];
  private remessas: FinRemessa[] = [];
  private tiposCusto: FinTipoCusto[] = [];
  private categorias: FinCategoria[] = [];
  private subcategorias: FinSubcategoria[] = [];
  private contasBancarias: FinContaBancaria[] = [];

  // Indicadores de liquidez
  private resumo: FinResumoLiquidez = {
    totalAPagarMes: 0,
    totalPagoMes: 0,
    totalAtrasadas: 0,
    totalProximos7Dias: 0,
    qtdPendentes: 0,
    qtdAtrasadas: 0
  };

  // Filtros ativos
  private filtros: FinFiltrosContas = {
    periodoTipo: 'mes',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    status: 'todos',
    tipoCustoId: '',
    categoriaId: '',
    contaBancariaId: '',
    buscaFavorecido: ''
  };

  // Estado da aba de Remessas (IDs de remessas expandidas)
  private remessasExpandidas: Set<string> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async init(): Promise<void> {
    try {
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }

      this.user = user;
      this.perfil = perfil;

      const podeAcessar = 
        perfil?.role === 'admin' || 
        perfil?.role === 'financeiro' || 
        perfil?.acesso_financeiro === true || 
        (perfil as any)?.acessoFinanceiro === true;

      if (!podeAcessar) {
        this.renderAuthError('Acesso Restrito: Apenas a Equipe Financeira ou Administradores autorizados possuem permissão para acessar este módulo.');
        return;
      }

      await this.carregarCadastrosBase();
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('[FinanceiroPage] Erro ao inicializar:', err);
      this.renderAuthError('Falha ao inicializar módulo financeiro.');
    }
  }

  public destroy(): void {
    // Limpeza de ouvintes ou timers
  }

  private async carregarCadastrosBase(): Promise<void> {
    const [tipos, categorias, bancos] = await Promise.all([
      FinPlanoContasService.listarTiposCusto(),
      FinPlanoContasService.listarCategorias(),
      FinPlanoContasService.listarContasBancarias()
    ]);
    this.tiposCusto = tipos;
    this.categorias = categorias;
    this.contasBancarias = bancos;
  }

  private async carregarDadosAbaAtiva(): Promise<void> {
    this.carregando = true;
    try {
      if (this.activeTab === 'contas' || this.activeTab === 'fluxo') {
        const listaContas = await FinContasPagarService.listarContas(this.filtros);
        this.contas = listaContas;
        this.resumo = FinContasPagarService.calcularResumoLiquidez(listaContas);
      } else if (this.activeTab === 'remessas') {
        this.remessas = await FinRemessasService.listarRemessas();
      }
    } catch (err) {
      console.error('[FinanceiroPage] Erro ao carregar dados:', err);
    } finally {
      this.carregando = false;
    }
  }

  private renderAuthError(mensagem: string): void {
    this.container.innerHTML = `
      <div class="min-h-[70vh] flex items-center justify-center p-6">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div class="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 border border-rose-100 dark:border-rose-900/50">
            🔒
          </div>
          <h2 class="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Ambiente Protegido</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">${mensagem}</p>
          <button onclick="window.history.back()" class="h-[42px] px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer">
            Voltar à Navegação
          </button>
        </div>
      </div>
    `;
  }

  private render(): void {
    const formatarMoeda = (val: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    this.container.innerHTML = `
      <div class="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <!-- Cabeçalho e Título -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 text-2xl font-black shrink-0">
              💰
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Gestão Financeira & Contas a Pagar</h1>
                ${renderHelpIcon('fin-contas-pagar')}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Controle de liquidez, despesas fixas recorrentes, parcelamentos e remessas agrupadas.</p>
            </div>
          </div>

          <div class="flex items-center gap-2.5">
            ${this.activeTab === 'contas' ? `
              <button id="btn-nova-conta" class="h-[42px] px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-2">
                <span>+</span> Nova Conta / Despesa
              </button>
            ` : ''}

            ${this.activeTab === 'remessas' ? `
              <button id="btn-nova-remessa" class="h-[42px] px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-2">
                <span>📦</span> Agrupar Nova Remessa
              </button>
            ` : ''}

            ${this.activeTab === 'plano' ? `
              <button id="btn-nova-categoria" class="h-[42px] px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-2">
                <span>+</span> Nova Categoria
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Cards de Indicadores de Liquidez (KPIs) -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
            <span class="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">A Pagar no Mês</span>
            <div class="flex items-baseline justify-between">
              <span class="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">${formatarMoeda(this.resumo.totalAPagarMes)}</span>
              <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">${this.resumo.qtdPendentes} pendentes</span>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
            <span class="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Total Liquidado</span>
            <div class="flex items-baseline justify-between">
              <span class="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">${formatarMoeda(this.resumo.totalPagoMes)}</span>
              <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40">Baixadas</span>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm ${this.resumo.qtdAtrasadas > 0 ? 'ring-2 ring-rose-500/20' : ''}">
            <span class="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Títulos em Atraso</span>
            <div class="flex items-baseline justify-between">
              <span class="text-lg sm:text-xl font-black ${this.resumo.qtdAtrasadas > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}">${formatarMoeda(this.resumo.totalAtrasadas)}</span>
              <span class="text-[10px] font-black ${this.resumo.qtdAtrasadas > 0 ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 animate-pulse' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'} px-2 py-0.5 rounded-lg">
                ${this.resumo.qtdAtrasadas} contas
              </span>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
            <span class="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Próximos 7 Dias</span>
            <div class="flex items-baseline justify-between">
              <span class="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">${formatarMoeda(this.resumo.totalProximos7Dias)}</span>
              <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-900/40">Janela Curta</span>
            </div>
          </div>
        </div>

        <!-- Barra de Navegação de Abas -->
        <div class="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar">
          <button data-tab="contas" class="tab-btn px-4 py-2.5 font-black text-xs transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${this.activeTab === 'contas' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}">
            <span>📋</span> Contas a Pagar
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${this.activeTab === 'contas' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">${this.contas.length}</span>
          </button>

          <button data-tab="remessas" class="tab-btn px-4 py-2.5 font-black text-xs transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${this.activeTab === 'remessas' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}">
            <span>📦</span> Remessas Agrupadas
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${this.activeTab === 'remessas' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">${this.remessas.length}</span>
          </button>

          <button data-tab="fluxo" class="tab-btn px-4 py-2.5 font-black text-xs transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${this.activeTab === 'fluxo' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}">
            <span>📈</span> Fluxo de Caixa & DRE
          </button>

          <button data-tab="plano" class="tab-btn px-4 py-2.5 font-black text-xs transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${this.activeTab === 'plano' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}">
            <span>⚙️</span> Plano de Contas & Bancos
          </button>
        </div>

        <!-- Conteúdo Específico da Aba Ativa -->
        <div id="fin-tab-content">
          ${this.renderAbaConteudo()}
        </div>
      </div>
    `;
  }

  private renderAbaConteudo(): string {
    if (this.carregando) {
      return `
        <div class="p-12 text-center">
          <div class="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando dados contábeis...</p>
        </div>
      `;
    }

    switch (this.activeTab) {
      case 'contas':
        return this.renderAbaContas();
      case 'remessas':
        return this.renderAbaRemessas();
      case 'fluxo':
        return this.renderAbaFluxoCaixa();
      case 'plano':
        return this.renderAbaPlanoContas();
      default:
        return '';
    }
  }

  // ==========================================================================
  // ABA 1: CONTAS A PAGAR (LISTAGEM, FILTROS, BAIXA INTELIGENTE)
  // ==========================================================================
  private renderAbaContas(): string {
    const meses = [
      { num: 1, nome: 'Janeiro' }, { num: 2, nome: 'Fevereiro' }, { num: 3, nome: 'Março' },
      { num: 4, nome: 'Abril' }, { num: 5, nome: 'Maio' }, { num: 6, nome: 'Junho' },
      { num: 7, nome: 'Julho' }, { num: 8, nome: 'Agosto' }, { num: 9, nome: 'Setembro' },
      { num: 10, nome: 'Outubro' }, { num: 11, nome: 'Novembro' }, { num: 12, nome: 'Dezembro' }
    ];

    const formatarMoeda = (val: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const formatarData = (dStr?: string) => {
      if (!dStr) return '-';
      const [y, m, d] = dStr.split('-');
      return `${d}/${m}/${y}`;
    };

    return `
      <div class="space-y-4">
        <!-- Barra de Filtros -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Mês de Referência</label>
              <select id="filtro-mes" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                ${meses.map(m => `
                  <option value="${m.num}" ${this.filtros.mes === m.num ? 'selected' : ''}>${m.nome}</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Status</label>
              <select id="filtro-status" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="todos" ${this.filtros.status === 'todos' ? 'selected' : ''}>Todos os Status</option>
                <option value="pendente" ${this.filtros.status === 'pendente' ? 'selected' : ''}>Pendentes</option>
                <option value="pago" ${this.filtros.status === 'pago' ? 'selected' : ''}>Pagos / Baixados</option>
                <option value="atrasado" ${this.filtros.status === 'atrasado' ? 'selected' : ''}>Em Atraso</option>
                <option value="cancelado" ${this.filtros.status === 'cancelado' ? 'selected' : ''}>Cancelados</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de Custo</label>
              <select id="filtro-tipo-custo" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Todos os Tipos</option>
                ${this.tiposCusto.map(t => `
                  <option value="${t.id}" ${this.filtros.tipoCustoId === t.id ? 'selected' : ''}>${t.nome}</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Categoria</label>
              <select id="filtro-categoria" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Todas as Categorias</option>
                ${this.categorias.map(c => `
                  <option value="${c.id}" ${this.filtros.categoriaId === c.id ? 'selected' : ''}>${c.nome}</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Buscar Favorecido</label>
              <input id="filtro-busca" type="text" placeholder="Nome do fornecedor..." value="${this.filtros.buscaFavorecido || ''}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            </div>
          </div>
        </div>

        <!-- Tabela de Títulos com Rolagem Defensiva -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto custom-scrollbar min-w-[900px]">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-[9px] uppercase tracking-widest font-black text-slate-400 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <th class="py-3 px-4">Vencimento</th>
                  <th class="py-3 px-4">Favorecido / Descrição</th>
                  <th class="py-3 px-4">Tipo / Categoria</th>
                  <th class="py-3 px-4 text-right">Valor Nominal</th>
                  <th class="py-3 px-4 text-right">Valor Pago</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4 w-32 text-center">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                ${this.contas.length === 0 ? `
                  <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400 font-bold">
                      Nenhuma conta localizada para o período e filtros selecionados.
                    </td>
                  </tr>
                ` : this.contas.map(c => {
                  const statusColors: Record<string, string> = {
                    pendente: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40',
                    pago: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40',
                    atrasado: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/40 animate-pulse',
                    cancelado: 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                  };

                  const ehEstimado = c.valor_estimado;
                  const parcelaLabel = (c.parcela_total && c.parcela_total > 1) ? `(${c.parcela_numero}/${c.parcela_total})` : '';
                  const isAdmin = this.perfil?.role === 'admin';

                  return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td class="py-3 px-4 whitespace-nowrap">
                        <span class="font-extrabold text-slate-900 dark:text-slate-100 block">${formatarData(c.data_vencimento_operacional || c.data_vencimento)}</span>
                        ${c.data_vencimento_operacional && c.data_vencimento_operacional !== c.data_vencimento ? `
                          <span class="text-[9px] text-slate-400 block font-semibold" title="Vencimento nominal no final de semana / feriado">Nominal: ${formatarData(c.data_vencimento)}</span>
                        ` : ''}
                      </td>

                      <td class="py-3 px-4">
                        <span class="font-bold text-slate-800 dark:text-slate-100 block truncate max-w-xs">${c.favorecido}</span>
                        <span class="text-[10px] text-slate-400 block truncate max-w-xs">${c.descricao || 'Despesa'} ${parcelaLabel}</span>
                      </td>

                      <td class="py-3 px-4 whitespace-nowrap">
                        <span class="font-bold text-slate-700 dark:text-slate-300 block">${c.categoria?.nome || 'Geral'}</span>
                        <span class="text-[10px] text-slate-400 block">${c.tipo_custo?.nome || 'Operacional'}</span>
                      </td>

                      <td class="py-3 px-4 text-right whitespace-nowrap">
                        <span class="font-extrabold text-slate-900 dark:text-slate-100">${formatarMoeda(c.valor_nominal)}</span>
                        ${ehEstimado ? `
                          <span class="ml-1 text-[9px] bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 px-1 py-0.5 rounded font-black uppercase">Estimado</span>
                        ` : ''}
                      </td>

                      <td class="py-3 px-4 text-right whitespace-nowrap">
                        <span class="font-extrabold ${c.status === 'pago' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                          ${c.valor_pago && c.valor_pago > 0 ? formatarMoeda(c.valor_pago) : '-'}
                        </span>
                      </td>

                      <td class="py-3 px-4 text-center whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${statusColors[c.status] || statusColors.pendente} uppercase">
                          ${c.status}
                        </span>
                      </td>

                      <td class="py-3 px-4 w-32 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1">
                          ${c.status !== 'pago' && c.status !== 'cancelado' ? `
                            <button data-id="${c.id}" class="btn-baixar-conta p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg transition cursor-pointer" title="Dar Baixa Inteligente">
                              ✅
                            </button>
                          ` : ''}

                          <button data-id="${c.id}" class="btn-editar-conta p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer" title="Editar Título">
                            ✏️
                          </button>

                          ${c.comprovante_url ? `
                            <a href="${c.comprovante_url}" target="_blank" class="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer" title="Ver Comprovante Anexo">
                              📎
                            </a>
                          ` : ''}

                          ${c.status === 'pago' && isAdmin ? `
                            <button data-id="${c.id}" class="btn-estornar-conta p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer" title="Estornar Baixa (Admin)">
                              ↩️
                            </button>
                          ` : ''}

                          ${c.status !== 'cancelado' && isAdmin ? `
                            <button data-id="${c.id}" class="btn-cancelar-conta p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer" title="Cancelar Título (Admin)">
                              🚫
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // ABA 2: REMESSAS AGRUPADAS (MESTRE-DETALHE ACCORDION)
  // ==========================================================================
  private renderAbaRemessas(): string {
    const formatarMoeda = (val: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const formatarData = (dStr?: string) => {
      if (!dStr) return '-';
      const [y, m, d] = dStr.split('-');
      return `${d}/${m}/${y}`;
    };

    return `
      <div class="space-y-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto custom-scrollbar min-w-[800px]">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-[9px] uppercase tracking-widest font-black text-slate-400 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <th class="py-3 px-4 w-10 text-center"></th>
                  <th class="py-3 px-4">Favorecido Principal</th>
                  <th class="py-3 px-4">Data Prevista</th>
                  <th class="py-3 px-4 text-center">Qtd. Títulos</th>
                  <th class="py-3 px-4 text-right">Valor Consolidado</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4 w-32 text-center">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                ${this.remessas.length === 0 ? `
                  <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400 font-bold">
                      Nenhuma remessa agrupada encontrada. Clique em "+ Agrupar Nova Remessa" para consolidar pagamentos.
                    </td>
                  </tr>
                ` : this.remessas.map(rem => {
                  const expandida = this.remessasExpandidas.has(rem.id);
                  const itens = rem.itens || [];

                  return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td class="py-3 px-2 text-center">
                        <button data-remessa-id="${rem.id}" class="btn-toggle-accordion p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition cursor-pointer">
                          ${expandida ? '▼' : '▶'}
                        </button>
                      </td>
                      <td class="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        ${rem.favorecido}
                        ${rem.observacoes ? `<span class="text-[10px] text-slate-400 block font-normal">${rem.observacoes}</span>` : ''}
                      </td>
                      <td class="py-3 px-4 whitespace-nowrap">${formatarData(rem.data_prevista)}</td>
                      <td class="py-3 px-4 text-center whitespace-nowrap font-bold">${itens.length || 0}</td>
                      <td class="py-3 px-4 text-right font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">${formatarMoeda(rem.valor_total)}</td>
                      <td class="py-3 px-4 text-center whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${rem.status === 'paga' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                          ${rem.status}
                        </span>
                      </td>
                      <td class="py-3 px-4 w-32 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1">
                          ${rem.status !== 'paga' ? `
                            <button data-remessa-id="${rem.id}" class="btn-baixar-remessa px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition cursor-pointer">
                              Baixar Tudo
                            </button>
                          ` : `
                            <span class="text-[10px] text-slate-400 font-bold">Liquidada</span>
                          `}
                        </div>
                      </td>
                    </tr>

                    ${expandida ? `
                      <tr class="bg-slate-50/70 dark:bg-slate-950/60">
                        <td colspan="7" class="p-4">
                          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                            <span class="text-[10px] uppercase tracking-wider font-black text-indigo-600 dark:text-indigo-400 block mb-2">Títulos Componentes Desta Remessa</span>
                            <div class="space-y-2">
                              ${itens.map(it => `
                                <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-none">
                                  <div>
                                    <span class="font-bold text-slate-800 dark:text-slate-200">${it.descricao || 'Item de pagamento'}</span>
                                    <span class="text-[10px] text-slate-400 block">${it.categoria?.nome || 'Geral'}</span>
                                  </div>
                                  <div class="text-right">
                                    <span class="font-black text-slate-900 dark:text-slate-100">${formatarMoeda(it.valor_nominal)}</span>
                                    <span class="text-[9px] block uppercase font-bold ${it.status === 'pago' ? 'text-emerald-600' : 'text-amber-600'}">${it.status}</span>
                                  </div>
                                </div>
                              `).join('')}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ` : ''}
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // ABA 3: FLUXO DE CAIXA, CALENDÁRIO & DRE SIMPLIFICADO
  // ==========================================================================
  private renderAbaFluxoCaixa(): string {
    const formatarMoeda = (val: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    // Agrupamento por Tipo de Custo (DRE Simplificado)
    const agrupamentoDRE: Record<string, { nome: string; nominal: number; pago: number }> = {};
    for (const t of this.tiposCusto) {
      agrupamentoDRE[t.id] = { nome: t.nome, nominal: 0, pago: 0 };
    }

    for (const c of this.contas) {
      if (c.tipo_custo_id && agrupamentoDRE[c.tipo_custo_id]) {
        agrupamentoDRE[c.tipo_custo_id].nominal += Number(c.valor_nominal || 0);
        agrupamentoDRE[c.tipo_custo_id].pago += Number(c.valor_pago || 0);
      }
    }

    return `
      <div class="space-y-6">
        <!-- Demonstrativo por Grupos (DRE Simplificado) -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Demonstrativo por Tipos de Custo (DRE)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Consolidação orçada vs desembolsada no mês de referência.</p>
            </div>
            <button id="btn-exportar-csv" class="h-[38px] px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5">
              <span>📥</span> Exportar CSV
            </button>
          </div>

          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-[9px] uppercase tracking-widest font-black text-slate-400 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <th class="py-2.5 px-4">Macro Grupo de Custo</th>
                  <th class="py-2.5 px-4 text-right">Previsto / Orçado</th>
                  <th class="py-2.5 px-4 text-right">Realizado / Pago</th>
                  <th class="py-2.5 px-4 text-right">Variação (R$)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                ${Object.values(agrupamentoDRE).map(item => {
                  const dif = item.nominal - item.pago;
                  return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                      <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">${item.nome}</td>
                      <td class="py-3 px-4 text-right">${formatarMoeda(item.nominal)}</td>
                      <td class="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">${formatarMoeda(item.pago)}</td>
                      <td class="py-3 px-4 text-right text-slate-500">${formatarMoeda(dif)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // ABA 4: PLANO DE CONTAS & CADASTROS
  // ==========================================================================
  private renderAbaPlanoContas(): string {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Árvore do Plano de Contas -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Estrutura do Plano de Contas</h3>
            <span class="text-[10px] text-slate-400 font-bold">${this.categorias.length} Categorias</span>
          </div>

          <div class="space-y-3">
            ${this.tiposCusto.map(tc => {
              const cats = this.categorias.filter(c => c.tipo_custo_id === tc.id);
              return `
                <div class="border border-slate-200/60 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50/40 dark:bg-slate-950/30">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">${tc.codigo}. ${tc.nome}</span>
                    <span class="text-[10px] font-bold text-slate-400">${cats.length} categorias</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    ${cats.map(c => `
                      <span class="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                        ${c.nome}
                      </span>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Contas Bancárias & Caixas -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Contas Bancárias & Caixas</h3>
            <button id="btn-nova-conta-bancaria" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition cursor-pointer">
              + Adicionar Banco
            </button>
          </div>

          <div class="space-y-2">
            ${this.contasBancarias.map(b => `
              <div class="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <div class="flex items-center gap-3">
                  <span class="text-lg">🏦</span>
                  <div>
                    <span class="font-bold text-slate-800 dark:text-slate-100 text-xs block">${b.nome_banco}</span>
                    <span class="text-[10px] text-slate-400 uppercase font-semibold">${b.tipo}</span>
                  </div>
                </div>
                <span class="text-xs font-black text-slate-900 dark:text-slate-100">
                  ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.saldo_inicial || 0)}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // CONFIGURAÇÃO DE EVENT LISTENERS E MODAIS
  // ==========================================================================
  private setupEventListeners(): void {
    // Alternância de Abas
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tab = btn.getAttribute('data-tab') as any;
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          await this.carregarDadosAbaAtiva();
          this.render();
          this.setupEventListeners();
        }
      });
    });

    // Filtros
    const mesEl = this.container.querySelector('#filtro-mes') as HTMLSelectElement;
    mesEl?.addEventListener('change', async () => {
      this.filtros.mes = Number(mesEl.value);
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
    });

    const statusEl = this.container.querySelector('#filtro-status') as HTMLSelectElement;
    statusEl?.addEventListener('change', async () => {
      this.filtros.status = statusEl.value as any;
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
    });

    const tipoEl = this.container.querySelector('#filtro-tipo-custo') as HTMLSelectElement;
    tipoEl?.addEventListener('change', async () => {
      this.filtros.tipoCustoId = tipoEl.value;
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
    });

    const catEl = this.container.querySelector('#filtro-categoria') as HTMLSelectElement;
    catEl?.addEventListener('change', async () => {
      this.filtros.categoriaId = catEl.value;
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
    });

    const buscaEl = this.container.querySelector('#filtro-busca') as HTMLInputElement;
    buscaEl?.addEventListener('input', () => {
      this.filtros.buscaFavorecido = buscaEl.value;
      // Debounce rápido
      clearTimeout((this as any)._buscaTimeout);
      (this as any)._buscaTimeout = setTimeout(async () => {
        await this.carregarDadosAbaAtiva();
        this.render();
        this.setupEventListeners();
      }, 350);
    });

    // Ações de Títulos (Baixar, Cancelar, Estornar)
    this.container.querySelectorAll('.btn-baixar-conta').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const c = this.contas.find(x => x.id === id);
        if (c) this.abrirModalBaixa(c);
      });
    });

    this.container.querySelectorAll('.btn-cancelar-conta').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        const confirmou = await showCustomConfirm('Tem certeza que deseja CANCELAR este título? Ação exclusiva de administrador registrada na auditoria.');
        if (confirmou) {
          const res = await FinContasPagarService.cancelarConta(
            id,
            this.perfil?.role || 'admin',
            this.user.id,
            'Cancelado pelo administrador na listagem',
            this.perfil?.nome
          );
          if (res.sucesso) {
            await showCustomAlert('Título cancelado com sucesso!', 'Sucesso');
            await this.carregarDadosAbaAtiva();
            this.render();
            this.setupEventListeners();
          } else {
            await showCustomAlert(res.erro || 'Falha ao cancelar título', 'Erro');
          }
        }
      });
    });

    this.container.querySelectorAll('.btn-estornar-conta').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        const confirmou = await showCustomConfirm('Deseja ESTORNAR este pagamento? O título retornará ao status pendente e a auditoria registrará o estorno.');
        if (confirmou) {
          const res = await FinContasPagarService.estornarBaixa(
            id,
            this.perfil?.role || 'admin',
            this.user.id,
            'Estorno efetuado pelo administrador',
            this.perfil?.nome
          );
          if (res.sucesso) {
            await showCustomAlert('Baixa estornada com sucesso!', 'Sucesso');
            await this.carregarDadosAbaAtiva();
            this.render();
            this.setupEventListeners();
          } else {
            await showCustomAlert(res.erro || 'Falha ao estornar pagamento', 'Erro');
          }
        }
      });
    });

    // Accordion de Remessas
    this.container.querySelectorAll('.btn-toggle-accordion').forEach(btn => {
      btn.addEventListener('click', () => {
        const remId = btn.getAttribute('data-remessa-id');
        if (!remId) return;
        if (this.remessasExpandidas.has(remId)) {
          this.remessasExpandidas.delete(remId);
        } else {
          this.remessasExpandidas.add(remId);
        }
        this.render();
        this.setupEventListeners();
      });
    });

    // Botão Nova Conta
    this.container.querySelector('#btn-nova-conta')?.addEventListener('click', () => {
      this.abrirModalNovaConta();
    });

    // Botão Exportar CSV
    this.container.querySelector('#btn-exportar-csv')?.addEventListener('click', () => {
      this.exportarCSV();
    });
  }

  // ==========================================================================
  // MODAL DE BAIXA INTELIGENTE COM JUROS, DESCONTO E BAIXA PARCIAL
  // ==========================================================================
  private abrirModalBaixa(c: FinContaPagar): void {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity';
    
    const hojeStr = new Date().toISOString().split('T')[0];

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">✅</span>
            <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Baixa de Pagamento</h3>
          </div>
          <button id="btn-fechar-modal-baixa" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer">✕</button>
        </div>

        <div class="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Favorecido:</span>
            <span class="font-extrabold text-slate-800 dark:text-slate-100">${c.favorecido}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Valor Nominal:</span>
            <span class="font-black text-indigo-600 dark:text-indigo-400">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor_nominal)}</span>
          </div>
        </div>

        <form id="form-baixa" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Data Pagamento *</label>
              <input type="date" id="input-baixa-data" required value="${hojeStr}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Forma de Pagamento *</label>
              <select id="select-baixa-forma" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="pix" selected>Pix</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="transferencia">Transferência / TED</option>
                <option value="debito">Débito em Conta</option>
                <option value="dinheiro">Dinheiro / Caixa</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Conta Bancária / Caixa de Saída</label>
            <select id="select-baixa-banco" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
              <option value="">Selecione o banco de liquidação...</option>
              ${this.contasBancarias.map(b => `<option value="${b.id}">${b.nome_banco}</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Juros / Multa (+)</label>
              <input type="number" step="0.01" min="0" id="input-baixa-juros" value="0" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Desconto (-)</label>
              <input type="number" step="0.01" min="0" id="input-baixa-desconto" value="0" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Valor Efetivamente Pago (R$) *</label>
            <input type="number" step="0.01" min="0.01" id="input-baixa-valor-pago" required value="${c.valor_nominal}" class="w-full h-[42px] px-3 border-2 border-indigo-600/40 bg-white dark:bg-slate-800 rounded-xl text-sm font-black text-indigo-600 dark:text-indigo-400" />
            <span class="text-[10px] text-slate-400 mt-1 block">Se valor pago for menor que o nominal líquido, será criada baixa parcial com resíduo.</span>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">URL / Link do Comprovante</label>
            <input type="url" id="input-baixa-comprovante" placeholder="https://..." class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200" />
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" id="btn-cancelar-baixa" class="h-[42px] px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" id="btn-confirmar-baixa" class="h-[42px] px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer">
              Confirmar Liquidação
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.querySelector('#btn-fechar-modal-baixa')?.addEventListener('click', fechar);
    overlay.querySelector('#btn-cancelar-baixa')?.addEventListener('click', fechar);

    // Recálculo dinâmico do valor sugerido ao alterar juros ou desconto
    const jurosInput = overlay.querySelector('#input-baixa-juros') as HTMLInputElement;
    const descInput = overlay.querySelector('#input-baixa-desconto') as HTMLInputElement;
    const pagoInput = overlay.querySelector('#input-baixa-valor-pago') as HTMLInputElement;

    const recalcularSugerido = () => {
      const juros = Number(jurosInput.value || 0);
      const desc = Number(descInput.value || 0);
      const sugerido = Math.max(0, c.valor_nominal + juros - desc);
      pagoInput.value = sugerido.toFixed(2);
    };

    jurosInput.addEventListener('input', recalcularSugerido);
    descInput.addEventListener('input', recalcularSugerido);

    const form = overlay.querySelector('#form-baixa') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = overlay.querySelector('#btn-confirmar-baixa') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processando...';

      const dataPagamento = (overlay.querySelector('#input-baixa-data') as HTMLInputElement).value;
      const formaPagamento = (overlay.querySelector('#select-baixa-forma') as HTMLSelectElement).value as any;
      const contaBancariaId = (overlay.querySelector('#select-baixa-banco') as HTMLSelectElement).value || undefined;
      const jurosMulta = Number(jurosInput.value || 0);
      const desconto = Number(descInput.value || 0);
      const valorPago = Number(pagoInput.value || 0);
      const comprovanteUrl = (overlay.querySelector('#input-baixa-comprovante') as HTMLInputElement).value || undefined;

      const res = await FinContasPagarService.baixarConta({
        contaId: c.id,
        dataPagamento,
        valorPagoTotal: valorPago,
        formaPagamento,
        contaBancariaId,
        jurosMulta,
        desconto,
        comprovanteUrl,
        usuarioId: this.user.id,
        usuarioNome: this.perfil?.nome
      });

      if (res.sucesso) {
        fechar();
        await showCustomAlert('Baixa efetuada com sucesso!', 'Sucesso');
        await this.carregarDadosAbaAtiva();
        this.render();
        this.setupEventListeners();
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar Liquidação';
        await showCustomAlert(res.erro || 'Falha ao processar baixa', 'Erro');
      }
    });
  }

  // ==========================================================================
  // MODAL DE NOVA CONTA / NOVO LANÇAMENTO
  // ==========================================================================
  private abrirModalNovaConta(): void {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity';
    
    const hojeStr = new Date().toISOString().split('T')[0];

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">💰</span>
            <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Novo Lançamento de Conta a Pagar</h3>
          </div>
          <button id="btn-fechar-modal-nova" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer">✕</button>
        </div>

        <form id="form-nova-conta" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de Custo *</label>
              <select id="input-nova-tipo" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Selecione o tipo...</option>
                ${this.tiposCusto.map(t => `<option value="${t.id}">${t.nome}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Categoria *</label>
              <select id="input-nova-categoria" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Selecione a categoria...</option>
                ${this.categorias.map(c => `<option value="${c.id}" data-tipo="${c.tipo_custo_id}">${c.nome}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Favorecido / Fornecedor *</label>
            <input type="text" id="input-nova-favorecido" required placeholder="Nome da empresa ou prestador" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Descrição do Título</label>
            <input type="text" id="input-nova-descricao" placeholder="Ex: Aluguel loja, fatura energia, honorários..." class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Valor Nominal (R$) *</label>
              <input type="number" step="0.01" min="0.01" id="input-nova-valor" required placeholder="0,00" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-black text-slate-900 dark:text-slate-100" />
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Vencimento Nominal *</label>
              <input type="date" id="input-nova-vencimento" required value="${hojeStr}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            </div>
          </div>

          <div class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <input type="checkbox" id="input-nova-estimado" class="w-4 h-4 accent-indigo-600 rounded cursor-pointer" />
            <label for="input-nova-estimado" class="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              Valor Estimado / Variável <span class="text-[10px] text-slate-400 block font-normal">(Ex: luz, telefone ou impostos cujos boletos ainda não chegaram)</span>
            </label>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Repetição / Recorrência</span>
              <select id="select-nova-recorrencia" class="h-[36px] px-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold">
                <option value="unica">Título Único / Esporádico</option>
                <option value="recorrente">Mensal Recorrente (Até o fim do ano)</option>
                <option value="parcelado">Parcelado (Quantidade fixa)</option>
              </select>
            </div>

            <div id="box-parcelas" class="hidden">
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Quantidade Total de Parcelas</label>
              <input type="number" min="2" max="120" id="input-nova-qtd-parcelas" value="10" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" id="btn-cancelar-nova" class="h-[42px] px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" id="btn-salvar-nova" class="h-[42px] px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer">
              Salvar Conta
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.querySelector('#btn-fechar-modal-nova')?.addEventListener('click', fechar);
    overlay.querySelector('#btn-cancelar-nova')?.addEventListener('click', fechar);

    const selectRec = overlay.querySelector('#select-nova-recorrencia') as HTMLSelectElement;
    const boxParcelas = overlay.querySelector('#box-parcelas') as HTMLElement;
    selectRec.addEventListener('change', () => {
      if (selectRec.value === 'parcelado') {
        boxParcelas.classList.remove('hidden');
      } else {
        boxParcelas.classList.add('hidden');
      }
    });

    const form = overlay.querySelector('#form-nova-conta') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = overlay.querySelector('#btn-salvar-nova') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';

      const tipoCustoId = (overlay.querySelector('#input-nova-tipo') as HTMLSelectElement).value;
      const categoriaId = (overlay.querySelector('#input-nova-categoria') as HTMLSelectElement).value;
      const favorecido = (overlay.querySelector('#input-nova-favorecido') as HTMLInputElement).value;
      const descricao = (overlay.querySelector('#input-nova-descricao') as HTMLInputElement).value;
      const valorNominal = Number((overlay.querySelector('#input-nova-valor') as HTMLInputElement).value);
      const dataVencimento = (overlay.querySelector('#input-nova-vencimento') as HTMLInputElement).value;
      const valorEstimado = (overlay.querySelector('#input-nova-estimado') as HTMLInputElement).checked;

      const selectRec = overlay.querySelector('#select-nova-recorrencia') as HTMLSelectElement;
      const recorrenciaTipo = selectRec?.value || 'unica';
      const parcelasTotal = recorrenciaTipo === 'parcelado' ? Number((overlay.querySelector('#input-nova-qtd-parcelas') as HTMLInputElement)?.value || 1) : 1;
      const tipoLancamento: 'avulso' | 'parcelado' | 'recorrente' = 
        recorrenciaTipo === 'recorrente' ? 'recorrente' : (recorrenciaTipo === 'parcelado' ? 'parcelado' : 'avulso');

      const res = await FinContasPagarService.cadastrarConta({
        tipoCustoId,
        categoriaId,
        favorecido,
        descricao,
        valorNominal,
        valorEstimado,
        dataVencimento,
        tipoLancamento,
        totalParcelas: parcelasTotal,
        criadoPorId: this.user.id
      });

      if (res.sucesso) {
        fechar();
        await showCustomAlert('Conta cadastrada com sucesso!', 'Sucesso');
        await this.carregarDadosAbaAtiva();
        this.render();
        this.setupEventListeners();
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Conta';
        await showCustomAlert(res.erro || 'Falha ao salvar conta', 'Erro');
      }
    });
  }

  // ==========================================================================
  // EXPORTAÇÃO CSV
  // ==========================================================================
  private exportarCSV(): void {
    if (this.contas.length === 0) {
      showCustomAlert('Não há contas para exportar no período.', 'Aviso');
      return;
    }

    const headers = ['Vencimento Nominal', 'Vencimento Operacional', 'Favorecido', 'Descrição', 'Tipo Custo', 'Categoria', 'Valor Nominal', 'Valor Pago', 'Status'];
    const rows = this.contas.map(c => [
      c.data_vencimento,
      c.data_vencimento_operacional || c.data_vencimento,
      `"${(c.favorecido || '').replace(/"/g, '""')}"`,
      `"${(c.descricao || '').replace(/"/g, '""')}"`,
      `"${(c.tipo_custo?.nome || '').replace(/"/g, '""')}"`,
      `"${(c.categoria?.nome || '').replace(/"/g, '""')}"`,
      c.valor_nominal,
      c.valor_pago || 0,
      c.status
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contas_a_pagar_${this.filtros.ano}_${this.filtros.mes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
