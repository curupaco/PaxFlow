import { supabase, getSessaoAtual } from '../services/supabase';
import { 
  PerfilConsultor, 
  FinContaPagar, 
  FinRemessa, 
  FinTipoCusto, 
  FinCategoria, 
  FinSubcategoria, 
  FinContaBancaria,
  FinFornecedor,
  FinFiltrosContas,
  FinResumoLiquidez,
  FinPrevistoVsRealizadoItem
} from '../types';
import { FinContasPagarService } from '../services/finContasPagarService';
import { FinPlanoContasService } from '../services/finPlanoContasService';
import { FinRemessasService } from '../services/finRemessasService';
import { FinFornecedoresService } from '../services/finFornecedoresService';
import { showCustomAlert, showCustomConfirm } from '../services/dialog';
import { renderHelpIcon } from '../utils/helpHelper';
import { ConciliacaoPage } from './Conciliacao';
import { podeAcessarFinanceiro } from '../utils/permissaoFinanceiro';
import { attachCurrencyMask, parsePastedCurrency } from '../utils/masks';

export type FinSubView = 'contas' | 'fluxo' | 'conciliacao' | 'plano';

export class FinanceiroPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private activeTab: FinSubView = 'contas';
  private carregando: boolean = false;
  private conciliacaoInstance: ConciliacaoPage | null = null;

  // Listagens de dados
  private contas: FinContaPagar[] = [];
  private remessas: FinRemessa[] = [];
  private fornecedores: FinFornecedor[] = [];
  private tiposCusto: FinTipoCusto[] = [];
  private categorias: FinCategoria[] = [];
  private subcategorias: FinSubcategoria[] = [];
  private contasBancarias: FinContaBancaria[] = [];

  // Modo de visualização de agrupamento em Contas a Pagar
  private filtroAgrupamento: 'todos' | 'avulsos' = 'todos';
  private titulosSelecionados: Set<string> = new Set();
  private buscaFornecedorTermo: string = '';

  private escapeHtml(s: any): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

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
    meses: [new Date().getMonth() + 1],
    ano: new Date().getFullYear(),
    status: 'todos',
    tipoCustoId: '',
    categoriaId: '',
    contaBancariaId: '',
    buscaFavorecido: ''
  };

  // Controle de abertura do seletor múltiplo de meses
  private dropdownMesesAberto: boolean = false;

  // Estado das Remessas (IDs de remessas com accordion expandido)
  private remessasExpandidas: Set<string> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async init(extraId?: string): Promise<void> {
    try {
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }

      this.user = user;
      this.perfil = perfil;

      const podeAcessar = podeAcessarFinanceiro(perfil);

      if (!podeAcessar) {
        this.renderAuthError('Acesso Restrito: Apenas a Equipe Financeira ou Administradores autorizados possuem permissão para acessar este módulo.');
        return;
      }

      if (extraId) {
        this.definirSubViewPorSlug(extraId);
      }

      await this.carregarCadastrosBase();
      await this.carregarDadosAbaAtiva();
      this.render();
      await this.setupEventListeners();
    } catch (err: any) {
      console.error('[FinanceiroPage] Erro ao inicializar:', err);
      this.renderAuthError('Falha ao inicializar módulo financeiro.');
    }
  }

  public async setSubView(sub: string): Promise<void> {
    const mudou = this.definirSubViewPorSlug(sub);
    if (mudou) {
      await this.carregarDadosAbaAtiva();
      this.render();
      await this.setupEventListeners();
    }
  }

  private definirSubViewPorSlug(slug: string): boolean {
    const mapa: Record<string, FinSubView> = {
      'contas': 'contas',
      'contas-pagar': 'contas',
      'remessas': 'contas',
      'remessas-agrupadas': 'contas',
      'fluxo': 'fluxo',
      'fluxo-caixa': 'fluxo',
      'conciliacao': 'conciliacao',
      'plano': 'plano',
      'plano-contas': 'plano'
    };
    if (slug === 'remessas' || slug === 'remessas-agrupadas') {
      this.filtroAgrupamento = 'todos';
    }
    const target = mapa[slug] || 'contas';
    if (this.activeTab !== target) {
      this.activeTab = target;
      return true;
    }
    return false;
  }

  public destroy(): void {
    if (this.conciliacaoInstance && typeof (this.conciliacaoInstance as any).destroy === 'function') {
      (this.conciliacaoInstance as any).destroy();
    }
    this.conciliacaoInstance = null;
  }

  private async carregarCadastrosBase(): Promise<void> {
    const [tipos, categorias, bancos, fornecedores] = await Promise.all([
      FinPlanoContasService.listarTiposCusto(),
      FinPlanoContasService.listarCategorias(),
      FinPlanoContasService.listarContasBancarias(false), // Carrega todas (ativas e inativas) para gestão no Plano de Contas
      FinFornecedoresService.listarFornecedores().catch(() => [])
    ]);
    this.tiposCusto = tipos;
    this.categorias = categorias;
    this.contasBancarias = bancos;
    this.fornecedores = fornecedores;
  }

  private async carregarDadosAbaAtiva(): Promise<void> {
    this.carregando = true;
    try {
      if (this.activeTab === 'contas' || this.activeTab === 'fluxo') {
        const [listaContas, listaRemessas, metricasAtraso] = await Promise.all([
          FinContasPagarService.listarContas(this.filtros),
          FinRemessasService.listarRemessas(),
          FinContasPagarService.obterMetricasAtrasoGlobais()
        ]);
        this.contas = listaContas;
        this.remessas = listaRemessas;
        this.resumo = FinContasPagarService.calcularResumoLiquidez(listaContas);
        // O card KPI de títulos em atraso reflete o passivo global acumulado da agência
        this.resumo.totalAtrasadas = metricasAtraso.totalAtrasadas;
        this.resumo.qtdAtrasadas = metricasAtraso.qtdAtrasadas;
      } else if (this.activeTab === 'plano') {
        this.fornecedores = await FinFornecedoresService.listarFornecedores().catch(() => []);
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

    const configCabecalho: Record<FinSubView, {
      titulo: string;
      subtitulo: string;
      icone: string;
      helpId: string;
      breadcrumb: string;
      botoesAcao: string;
    }> = {
      contas: {
        titulo: 'Contas a Pagar',
        subtitulo: 'Controle integral de despesas: títulos avulsos, parcelamentos e remessas agrupadas em lote.',
        icone: '📋',
        helpId: 'fin-contas-pagar',
        breadcrumb: 'Contas a Pagar',
        botoesAcao: `
          <button id="btn-exportar-contas-csv" class="h-[42px] px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700">
            <span>📥</span> Exportar CSV
          </button>
          <button id="btn-agrupar-remessa-topo" class="h-[42px] px-3.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
            <span>📦</span> Agrupar em Lote
          </button>
          <button id="btn-nova-conta" class="h-[42px] px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-2">
            <span>+</span> Nova Despesa
          </button>
        `
      },
      fluxo: {
        titulo: 'Fluxo de Caixa & DRE Gerencial',
        subtitulo: 'Demonstrativo de Resultado do Exercício com regime de competência e previsão financeira.',
        icone: '📈',
        helpId: 'fin-fluxo-caixa',
        breadcrumb: 'Fluxo de Caixa & DRE',
        botoesAcao: `
          <button id="btn-exportar-dre" class="h-[42px] px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition border border-slate-200/60 dark:border-slate-700 cursor-pointer flex items-center gap-2">
            <span>📥</span> Exportar DRE (CSV)
          </button>
        `
      },
      conciliacao: {
        titulo: 'Conciliação Bancária',
        subtitulo: 'FinRecon™ - Casamento inteligente de extratos bancários com recebimentos de vendas e despesas.',
        icone: '🪙',
        helpId: 'conciliacao-bancaria',
        breadcrumb: 'Conciliação Bancária',
        botoesAcao: `
          <button id="btn-exportar-conciliacao-topo" class="h-[42px] px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700 cursor-pointer">
            📥 Exportar
          </button>
          <button id="btn-fechar-mes-topo" class="h-[42px] px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700 cursor-pointer">
            🔒 Fechar Mês
          </button>
          <button id="btn-abrir-upload-topo" class="h-[42px] px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-500/20 transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer">
            📁 Importar Extrato (OFX/CSV)
          </button>
        `
      },
      plano: {
        titulo: 'Plano de Contas & Contas Bancárias',
        subtitulo: 'Estruturação contábil de tipos de custo, categorias, subcategorias e contas correntes.',
        icone: '⚙️',
        helpId: 'fin-plano-contas',
        breadcrumb: 'Plano de Contas',
        botoesAcao: `
          <button id="btn-nova-categoria" class="h-[42px] px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-2">
            <span>+</span> Nova Categoria
          </button>
        `
      }
    };

    const cfg = configCabecalho[this.activeTab] || configCabecalho.contas;

    // Métricas para Scorecards de Remessas
    const totalRemessasAbertas = this.remessas
      .filter(r => r.status !== 'paga')
      .reduce((acc, r) => acc + Number(r.valor_total || 0), 0);
    const qtdRemessasAbertas = this.remessas.filter(r => r.status !== 'paga').length;
    const totalRemessasPagas = this.remessas
      .filter(r => r.status === 'paga')
      .reduce((acc, r) => acc + Number(r.valor_total || 0), 0);
    const qtdRemessasPagas = this.remessas.filter(r => r.status === 'paga').length;
    const mediaPorRemessa = this.remessas.length > 0
      ? (totalRemessasAbertas + totalRemessasPagas) / this.remessas.length
      : 0;

    this.container.innerHTML = `
      <div class="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
        <!-- Cabeçalho Dinâmico Unificado com Breadcrumbs -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 text-2xl font-black shrink-0">
              ${cfg.icone}
            </div>
            <div>
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 flex items-center gap-1.5">
                <span>Financeiro</span>
                <span>›</span>
                <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">${cfg.breadcrumb}</span>
              </div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">${cfg.titulo}</h1>
                ${renderHelpIcon(cfg.helpId)}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">${cfg.subtitulo}</p>
            </div>
          </div>

          <div class="flex items-center gap-2.5 flex-wrap">
            ${cfg.botoesAcao}
          </div>
        </div>

        ${this.activeTab === 'contas' ? `
          <!-- Cards de Indicadores de Liquidez (KPIs das Contas a Pagar) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Card 1: A Pagar no Mês -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div class="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">A Pagar no Mês</span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 whitespace-nowrap">
                  ${this.resumo.qtdPendentes} pendentes
                </span>
              </div>
              <div class="mt-3">
                <span class="block text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  ${formatarMoeda(this.resumo.totalAPagarMes)}
                </span>
                <span class="block text-[11px] text-slate-400 font-medium mt-1">Previsão total de saídas do mês</span>
              </div>
            </div>

            <!-- Card 2: Total Liquidado -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div class="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Total Liquidado</span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 whitespace-nowrap">
                  Baixadas
                </span>
              </div>
              <div class="mt-3">
                <span class="block text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  ${formatarMoeda(this.resumo.totalPagoMes)}
                </span>
                <span class="block text-[11px] text-slate-400 font-medium mt-1">Títulos quitados com comprovante</span>
              </div>
            </div>

            <!-- Card 3: Títulos em Atraso -->
            <div id="card-kpi-atrasadas" class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-rose-400 hover:shadow-md transition active:scale-98 ${this.resumo.qtdAtrasadas > 0 ? 'ring-2 ring-rose-500/30' : ''}" title="Clique para filtrar todas as contas em atraso da história">
              <div class="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>Títulos em Atraso</span>
                  <span class="text-[9px] text-rose-500 dark:text-rose-400 font-extrabold uppercase">(Global)</span>
                </span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold ${this.resumo.qtdAtrasadas > 0 ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700'} whitespace-nowrap">
                  ${this.resumo.qtdAtrasadas} contas
                </span>
              </div>
              <div class="mt-3">
                <span class="block text-2xl sm:text-3xl font-black ${this.resumo.qtdAtrasadas > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'} tracking-tight">
                  ${formatarMoeda(this.resumo.totalAtrasadas)}
                </span>
                <span class="block text-[11px] text-slate-400 font-medium mt-1">
                  ${this.resumo.qtdAtrasadas > 0 ? 'Passivo global da agência • Clique para filtrar' : 'Nenhuma conta em atraso'}
                </span>
              </div>
            </div>

            <!-- Card 4: Próximos 7 Dias -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div class="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Próximos 7 Dias</span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40 whitespace-nowrap">
                  Janela Curta
                </span>
              </div>
              <div class="mt-3">
                <span class="block text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  ${formatarMoeda(this.resumo.totalProximos7Dias)}
                </span>
                <span class="block text-[11px] text-slate-400 font-medium mt-1">Compromissos da semana vigente</span>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Conteúdo Específico da Sub-Visão Ativa -->
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
      case 'fluxo':
        return this.renderAbaFluxoCaixa();
      case 'conciliacao':
        return `<div id="fin-conciliacao-mount"></div>`;
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

    const contasAvulsas = this.contas.filter(c => !c.remessa_id);
    const contasAgrupadas = this.contas.filter(c => !!c.remessa_id);
    const contasParaExibir = this.filtroAgrupamento === 'avulsos' 
      ? contasAvulsas 
      : this.contas;

    type LinhaTabelaItem = 
      | { tipo: 'lote'; id: string; remessa: FinRemessa; itens: FinContaPagar[]; dataRef: string }
      | { tipo: 'avulso'; id: string; conta: FinContaPagar; dataRef: string };

    const linhasParaExibir: LinhaTabelaItem[] = [];
    const remessasProcessadas = new Set<string>();

    for (const c of contasParaExibir) {
      if (c.remessa_id) {
        if (this.filtroAgrupamento === 'todos' && !remessasProcessadas.has(c.remessa_id)) {
          remessasProcessadas.add(c.remessa_id);
          const rem = this.remessas.find(r => r.id === c.remessa_id) || {
            id: c.remessa_id,
            favorecido: c.favorecido,
            data_prevista: c.data_vencimento,
            valor_total: c.valor_nominal,
            status: c.status === 'pago' ? 'paga' : 'aberta'
          } as FinRemessa;

          const itensDoLote = this.contas.filter(it => it.remessa_id === c.remessa_id);
          linhasParaExibir.push({
            tipo: 'lote',
            id: rem.id,
            remessa: rem,
            itens: itensDoLote.length > 0 ? itensDoLote : [c],
            dataRef: rem.data_pagamento || rem.data_prevista || c.data_vencimento
          });
        }
      } else {
        linhasParaExibir.push({
          tipo: 'avulso',
          id: c.id,
          conta: c,
          dataRef: c.data_pagamento || c.data_vencimento_operacional || c.data_vencimento
        });
      }
    }

    linhasParaExibir.sort((a, b) => (b.dataRef || '').localeCompare(a.dataRef || ''));

    const totalSelecionado = Array.from(this.titulosSelecionados).reduce((acc, id) => {
      const conta = this.contas.find(c => c.id === id);
      return acc + (conta ? Number(conta.valor_nominal || 0) : 0);
    }, 0);

    const mesesSelecionados = (this.filtros.meses && this.filtros.meses.length > 0)
      ? this.filtros.meses
      : (this.filtros.mes ? [this.filtros.mes] : [new Date().getMonth() + 1]);

    let textoRotuloMeses = '';
    if (this.filtros.status === 'atrasado') {
      textoRotuloMeses = 'Histórico Global';
    } else if (mesesSelecionados.length === 12) {
      textoRotuloMeses = 'Ano Todo (12 meses)';
    } else if (mesesSelecionados.length === 1) {
      const mObj = meses.find(m => m.num === mesesSelecionados[0]);
      textoRotuloMeses = mObj ? mObj.nome : `Mês ${mesesSelecionados[0]}`;
    } else if (mesesSelecionados.length <= 3) {
      textoRotuloMeses = mesesSelecionados
        .slice()
        .sort((a, b) => a - b)
        .map(num => meses.find(m => m.num === num)?.nome.slice(0, 3))
        .join(', ');
    } else {
      textoRotuloMeses = `${mesesSelecionados.length} meses selecionados`;
    }

    const qtdFiltrosAvancados = (
      (this.filtros.dataInicio || this.filtros.dataFim ? 1 : 0) +
      (this.filtros.buscaGeral?.trim() ? 1 : 0) +
      (this.filtros.contaBancariaId ? 1 : 0) +
      (this.filtros.formaPagamento ? 1 : 0) +
      (this.filtros.valorMin !== undefined || this.filtros.valorMax !== undefined ? 1 : 0) +
      (this.filtros.naturezaLancamento && this.filtros.naturezaLancamento !== 'todos' ? 1 : 0) +
      (this.filtros.ignorarMes ? 1 : 0)
    );

    const temFiltroAtivo = 
      this.filtros.status !== 'todos' || 
      Boolean(this.filtros.tipoCustoId) || 
      Boolean(this.filtros.categoriaId) || 
      (this.filtros.meses && this.filtros.meses.length > 1) ||
      Boolean(this.filtros.buscaFavorecido?.trim()) ||
      qtdFiltrosAvancados > 0;

    const statusColors: Record<string, string> = {
      pendente: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40',
      pago: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40',
      atrasado: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/40 animate-pulse',
      cancelado: 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
    };

    const isAdmin = this.perfil?.role === 'admin';

    // Métricas para Scorecards de Remessas
    const totalRemessasAbertas = this.remessas
      .filter(r => r.status !== 'paga')
      .reduce((acc, r) => acc + Number(r.valor_total || 0), 0);
    const qtdRemessasAbertas = this.remessas.filter(r => r.status !== 'paga').length;
    const totalRemessasPagas = this.remessas
      .filter(r => r.status === 'paga')
      .reduce((acc, r) => acc + Number(r.valor_total || 0), 0);
    const qtdRemessasPagas = this.remessas.filter(r => r.status === 'paga').length;
    const mediaPorRemessa = this.remessas.length > 0
      ? (totalRemessasAbertas + totalRemessasPagas) / this.remessas.length
      : 0;

    return `
      <div class="space-y-4">
        <!-- Barra de Filtros Unificada com Alternador de Agrupamento -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <!-- Topo dos Filtros: Alternador de Visão de Agrupamento & Ações Rápidas -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full sm:w-fit overflow-x-auto">
              <button data-modo="todos" class="btn-filtro-agrupamento flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${this.filtroAgrupamento === 'todos' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}">
                <span>📋</span> Todos (${this.contas.length})
              </button>
              <button data-modo="avulsos" class="btn-filtro-agrupamento flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${this.filtroAgrupamento === 'avulsos' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}">
                <span>📄</span> Apenas Avulsos (${contasAvulsas.length})
              </button>
            </div>

            <div class="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              <button type="button" id="btn-abrir-filtros-avancados" class="h-[42px] px-3.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-xs ${
                qtdFiltrosAvancados > 0 
                  ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black ring-1 ring-indigo-500/30' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }" title="Configurar filtros avançados (período de datas, valores, contas bancárias, formas e natureza)">
                <span>⚡</span>
                <span>Filtros Avançados</span>
                ${qtdFiltrosAvancados > 0 ? `
                  <span class="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">${qtdFiltrosAvancados}</span>
                ` : ''}
              </button>
              ${temFiltroAtivo ? `
                <button id="btn-limpar-filtros" class="h-[42px] px-3.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center gap-1 border border-rose-200/60 dark:border-rose-900/40">
                  ✕ Limpar Filtros
                </button>
              ` : ''}
              <button id="btn-exportar-csv-tabela" class="h-[42px] px-3.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 border border-slate-200/60 dark:border-slate-700">
                📥 Exportar CSV
              </button>
            </div>
          </div>

          <!-- Campos de Filtro (Mês, Status, Tipo, Categoria, Busca) -->
          <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div class="relative" id="container-filtro-meses">
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                <span>Meses de Referência</span>
                ${this.filtros.status === 'atrasado' ? '<span class="text-rose-500 font-extrabold lowercase text-[9px]">(histórico global)</span>' : ''}
              </label>
              <button type="button" id="btn-toggle-dropdown-meses" ${this.filtros.status === 'atrasado' ? 'disabled title="Exibindo histórico de todos os meses"' : ''} class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between gap-1 transition shadow-sm hover:border-slate-300 dark:hover:border-slate-600 ${this.filtros.status === 'atrasado' ? 'opacity-80 bg-slate-100 dark:bg-slate-900 cursor-not-allowed' : 'cursor-pointer'}">
                <div class="flex items-center gap-1.5 truncate">
                  <span class="text-slate-400">📅</span>
                  <span id="texto-rotulo-meses" class="truncate">${textoRotuloMeses}</span>
                </div>
                <span class="text-[9px] text-slate-400 transition-transform ${this.dropdownMesesAberto ? 'rotate-180' : ''}">▼</span>
              </button>

              <!-- Dropdown Multi-mês Flutuante -->
              <div id="dropdown-meses-flutuante" class="${this.dropdownMesesAberto ? '' : 'hidden'} absolute left-0 top-[100%] mt-1.5 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-100">
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span class="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Filtro de Meses</span>
                  <span id="dropdown-meses-count" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    ${mesesSelecionados.length} selecionado(s)
                  </span>
                </div>

                <!-- Atalhos Rápidos -->
                <div class="grid grid-cols-3 gap-1.5 mb-2.5">
                  <button type="button" id="btn-atalho-mes-atual" class="h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer">
                    Mês Atual
                  </button>
                  <button type="button" id="btn-atalho-trimestre-atual" class="h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer">
                    Trimestre
                  </button>
                  <button type="button" id="btn-atalho-ano-todo" class="h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer">
                    Ano Todo
                  </button>
                </div>

                <!-- Grade de 12 Meses -->
                <div class="grid grid-cols-3 gap-1.5 mb-2.5">
                  ${meses.map(m => {
                    const isSelected = mesesSelecionados.includes(m.num);
                    return `
                      <button type="button" data-mes-num="${m.num}" class="btn-chip-mes h-8 rounded-lg text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-black' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }">
                        ${m.nome.slice(0, 3)}
                      </button>
                    `;
                  }).join('')}
                </div>

                <!-- Rodapé com Resetar e Aplicar -->
                <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" id="btn-limpar-meses" class="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer">
                    Resetar
                  </button>
                  <button type="button" id="btn-aplicar-filtro-meses" class="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-lg shadow-sm transition cursor-pointer">
                    Aplicar
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Status</label>
              <select id="filtro-status" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="todos" ${this.filtros.status === 'todos' ? 'selected' : ''}>Todos os Status</option>
                <option value="pendente" ${this.filtros.status === 'pendente' ? 'selected' : ''}>Pendentes</option>
                <option value="pago" ${this.filtros.status === 'pago' ? 'selected' : ''}>Pagos / Baixados</option>
                <option value="atrasado" ${this.filtros.status === 'atrasado' ? 'selected' : ''}>Em Atraso (Histórico)</option>
                <option value="cancelado" ${this.filtros.status === 'cancelado' ? 'selected' : ''}>Cancelados</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de Custo (A-Z)</label>
              <select id="filtro-tipo-custo" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Todos os Tipos</option>
                ${[...this.tiposCusto].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(t => `
                  <option value="${t.id}" ${this.filtros.tipoCustoId === t.id ? 'selected' : ''}>${t.nome}</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Categoria (A-Z)</label>
              <select id="filtro-categoria" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Todas as Categorias</option>
                ${[...this.categorias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(c => `
                  <option value="${c.id}" ${this.filtros.categoriaId === c.id ? 'selected' : ''}>${c.nome}</option>
                `).join('')}
              </select>
            </div>

            <div class="col-span-2 sm:col-span-2 lg:col-span-1">
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Buscar Favorecido</label>
              <input id="filtro-busca" type="text" placeholder="Nome do fornecedor..." value="${this.filtros.buscaFavorecido || ''}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            </div>
          </div>

          <!-- Linha de Chips de Filtros Avançados Ativos -->
          ${qtdFiltrosAvancados > 0 ? `
            <div class="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <span>⚡</span> Filtros Ativos:
              </span>
              ${this.filtros.dataInicio || this.filtros.dataFim ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <span>📅 ${this.filtros.tipoDataFiltro === 'pagamento' ? 'Pago' : 'Venc'}: ${formatarData(this.filtros.dataInicio || '')} a ${formatarData(this.filtros.dataFim || '')}</span>
                  <button type="button" data-remover-filtro="periodo" class="btn-remover-chip-filtro hover:text-rose-500 font-black cursor-pointer" title="Remover filtro de período">✕</button>
                </span>
              ` : ''}
              ${this.filtros.buscaGeral ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <span>🔍 "${this.filtros.buscaGeral}"</span>
                  <button type="button" data-remover-filtro="buscaGeral" class="btn-remover-chip-filtro hover:text-rose-500 font-black cursor-pointer" title="Remover busca geral">✕</button>
                </span>
              ` : ''}
              ${this.filtros.contaBancariaId ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <span>🏦 ${this.contasBancarias.find(b => b.id === this.filtros.contaBancariaId)?.nome_banco || 'Conta Bancária'}</span>
                  <button type="button" data-remover-filtro="contaBancaria" class="btn-remover-chip-filtro hover:text-rose-500 font-black cursor-pointer" title="Remover filtro de banco">✕</button>
                </span>
              ` : ''}
              ${this.filtros.formaPagamento ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <span>💳 ${this.filtros.formaPagamento.toUpperCase()}</span>
                  <button type="button" data-remover-filtro="formaPagamento" class="btn-remover-chip-filtro hover:text-rose-500 font-black cursor-pointer" title="Remover filtro de forma de pagamento">✕</button>
                </span>
              ` : ''}
              ${(this.filtros.valorMin !== undefined || this.filtros.valorMax !== undefined) ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <span>💰 R$ ${this.filtros.valorMin || 0} - R$ ${this.filtros.valorMax || '∞'}</span>
                  <button type="button" data-remover-filtro="valor" class="btn-remover-chip-filtro hover:text-rose-500 font-black cursor-pointer" title="Remover faixa de valor">✕</button>
                </span>
              ` : ''}
              ${this.filtros.naturezaLancamento && this.filtros.naturezaLancamento !== 'todos' ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <span>🏷️ ${this.filtros.naturezaLancamento.toUpperCase()}</span>
                  <button type="button" data-remover-filtro="natureza" class="btn-remover-chip-filtro hover:text-rose-500 font-black cursor-pointer" title="Remover filtro de natureza">✕</button>
                </span>
              ` : ''}
              ${this.filtros.ignorarMes ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <span>🌐 Todo o Histórico</span>
                  <button type="button" data-remover-filtro="ignorarMes" class="btn-remover-chip-filtro hover:text-rose-500 font-black cursor-pointer" title="Restaurar filtro de mês">✕</button>
                </span>
              ` : ''}
              <button type="button" id="btn-limpar-chips-avancados" class="text-[11px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer ml-auto">
                Limpar Todos
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Barra de Ação Flutuante para Itens Selecionados -->
        ${this.titulosSelecionados.size > 0 ? `
          <div class="p-3.5 sm:p-4 bg-indigo-600 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl shadow-indigo-600/25 animate-scale-in">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                📦
              </div>
              <div>
                <span class="font-black text-sm block">${this.titulosSelecionados.size} títulos avulsos selecionados</span>
                <span class="text-[11px] text-indigo-100 font-medium">Total Consolidado: ${formatarMoeda(totalSelecionado)}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <button id="btn-desmarcar-selecao" class="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer">
                Desmarcar
              </button>
              <button id="btn-agrupar-selecionadas" class="flex-1 sm:flex-none h-[40px] px-5 bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5">
                <span>✓</span> Agrupar em Lote de Remessa
              </button>
            </div>
          </div>
        ` : ''}

        <!-- VISÃO UNIFICADA: LISTAGEM DE TÍTULOS E LOTES DE REMESSA (ACCORDION MESTRE-DETALHE) -->
        <!-- 1. Visão Desktop: Tabela com Rolagem Defensiva (hidden md:block) -->
        <div class="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto custom-scrollbar scroll-indicator-fade w-full">
            <table class="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr class="text-[9px] uppercase tracking-widest font-black text-slate-400 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <th class="py-3 px-3 w-10 text-center">
                    <input type="checkbox" id="check-selecionar-todas-contas" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" title="Selecionar todos os títulos avulsos pendentes" />
                  </th>
                  <th class="py-3 px-4">Data</th>
                  <th class="py-3 px-4">Favorecido / Descrição</th>
                  <th class="py-3 px-4">Tipo / Categoria</th>
                  <th class="py-3 px-4 text-right">Valor Nominal</th>
                  <th class="py-3 px-4 text-right">Valor Pago</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4 w-36 text-center">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                ${linhasParaExibir.length === 0 ? `
                  <tr>
                    <td colspan="8" class="py-12 text-center text-slate-400 font-bold">
                      Nenhuma conta ou lote localizado para o período e filtros selecionados.
                    </td>
                  </tr>
                ` : linhasParaExibir.map(item => {
                  if (item.tipo === "lote") {
                    const rem = item.remessa;
                    const itens = item.itens;
                    const expandida = this.remessasExpandidas.has(rem.id);
                    const totalItens = itens.reduce((acc, it) => acc + Number(it.valor_nominal || 0), 0);
                    const totalPagoItens = itens.reduce((acc, it) => acc + Number(it.valor_pago || 0), 0);

                    return `
                      <!-- LINHA MESTRE DO LOTE CONSOLIDADO -->
                      <tr class="bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 transition-colors border-y border-indigo-100/80 dark:border-indigo-900/50 font-semibold">
                        <td class="py-3 px-3 text-center">
                          <span class="text-sm select-none" title="Lote de Remessa Agrupada">📦</span>
                        </td>

                        <td class="py-3 px-4 whitespace-nowrap">
                          <button type="button" data-remessa-id="${rem.id}" class="btn-toggle-remessa inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer">
                            <span class="transform transition-transform text-[10px] ${expandida ? "rotate-90" : ""}">▶</span>
                            <span>${formatarData(rem.data_pagamento || rem.data_prevista)}</span>
                          </button>
                          <span class="text-[9px] text-slate-400 block font-semibold mt-0.5">
                            ${rem.status === "paga" ? "Data Pagamento Lote" : "Previsão do Lote"}
                          </span>
                        </td>

                        <td class="py-3 px-4">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-black text-slate-900 dark:text-slate-100 text-xs">📦 LOTE: ${rem.favorecido}</span>
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              ${itens.length} títulos
                            </span>
                          </div>
                          <span class="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-sm mt-0.5">${rem.observacoes || "Pagamento unificado em lote"}</span>
                        </td>

                        <td class="py-3 px-4 whitespace-nowrap">
                          <span class="font-bold text-slate-700 dark:text-slate-300 block">Lote Consolidado</span>
                          <span class="text-[10px] text-slate-400 block">${rem.forma_pagamento ? rem.forma_pagamento.toUpperCase() : "Pagamento Unificado"}</span>
                        </td>

                        <td class="py-3 px-4 text-right whitespace-nowrap">
                          <span class="font-black text-slate-900 dark:text-slate-100 text-sm">${formatarMoeda(rem.valor_total || totalItens)}</span>
                        </td>

                        <td class="py-3 px-4 text-right whitespace-nowrap">
                          <span class="font-black ${rem.status === "paga" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}">
                            ${rem.status === "paga" ? formatarMoeda(rem.valor_total || totalPagoItens || totalItens) : "-"}
                          </span>
                        </td>

                        <td class="py-3 px-4 text-center whitespace-nowrap">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${rem.status === "paga" ? statusColors.pago : statusColors.pendente} uppercase">
                            ${rem.status === "paga" ? "Pago" : "Aberto"}
                          </span>
                        </td>

                        <td class="py-3 px-4 w-36 text-center whitespace-nowrap">
                          <div class="flex items-center justify-center gap-1">
                            ${rem.status !== "paga" ? `
                              <button data-remessa-id="${rem.id}" class="btn-abrir-baixa-remessa px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shadow-xs flex items-center gap-1" title="Liquidar pagamento do lote (escolher banco e forma)">
                                💳 Pagar
                              </button>
                              <button data-remessa-id="${rem.id}" class="btn-desagrupar-remessa px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-lg font-bold text-[10px] transition cursor-pointer" title="Desfazer lote e devolver contas">
                                Desfazer
                              </button>
                            ` : `
                              <button data-remessa-id="${rem.id}" class="btn-reverter-remessa px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shadow-xs flex items-center gap-1" title="Reverter baixa do lote inteiro (retornar todos os itens para pendente)">
                                ↩ Reverter
                              </button>
                              ${rem.comprovante_url ? `
                                <a href="${rem.comprovante_url}" target="_blank" class="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition" title="Ver Comprovante">
                                  📎
                                </a>
                              ` : ""}
                            `}
                          </div>
                        </td>
                      </tr>

                      <!-- LINHAS FILHAS INDENTADAS DO LOTE (SE EXPANDIDO) -->
                      ${expandida ? itens.map(c => `
                        <tr class="bg-indigo-50/25 dark:bg-indigo-950/20 border-b border-indigo-100/50 dark:border-indigo-900/30 text-xs hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-colors">
                          <td class="py-2.5 px-3 text-center">
                            <span class="text-indigo-400 font-black text-xs select-none">↳</span>
                          </td>
                          <td class="py-2.5 px-4 whitespace-nowrap pl-6">
                            <span class="font-bold text-slate-800 dark:text-slate-200 block">${formatarData(c.data_vencimento_operacional || c.data_vencimento)}</span>
                            <span class="text-[9px] text-indigo-500 font-semibold block">Vencimento Título</span>
                          </td>
                          <td class="py-2.5 px-4">
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
                                LOTE '${rem.favorecido}'
                              </span>
                              <span class="font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">${c.favorecido}</span>
                            </div>
                            <span class="text-[10px] text-slate-400 block truncate max-w-xs mt-0.5">${c.descricao || "Despesa"}</span>
                          </td>
                          <td class="py-2.5 px-4 whitespace-nowrap">
                            <span class="font-bold text-slate-600 dark:text-slate-400 block">${c.categoria?.nome || "Geral"}</span>
                            <span class="text-[10px] text-slate-400 block">${c.tipo_custo?.nome || "Operacional"}</span>
                          </td>
                          <td class="py-2.5 px-4 text-right whitespace-nowrap">
                            <span class="font-bold text-slate-800 dark:text-slate-200">${formatarMoeda(c.valor_nominal)}</span>
                          </td>
                          <td class="py-2.5 px-4 text-right whitespace-nowrap">
                            <span class="font-bold ${c.status === "pago" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}">
                              ${c.valor_pago && c.valor_pago > 0 ? formatarMoeda(c.valor_pago) : "-"}
                            </span>
                          </td>
                          <td class="py-2.5 px-4 text-center whitespace-nowrap">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold border ${statusColors[c.status] || statusColors.pendente} uppercase">
                              ${c.status === "pago" ? "Pago no Lote" : c.status}
                            </span>
                          </td>
                          <td class="py-2.5 px-4 text-center whitespace-nowrap text-[10px] text-slate-400 italic">
                            Item do Lote
                          </td>
                        </tr>
                      `).join("") : ""}
                    `;
                  }

                  // ITEM AVULSO NORMAL
                  const c = item.conta;
                  const ehEstimado = !!c.valor_estimado && c.status !== "pago";
                  const parcelaLabel = (c.parcela_total && c.parcela_total > 1) ? `(${c.parcela_numero}/${c.parcela_total})` : "";
                  const podeSelecionar = !c.remessa_id && (c.status === "pendente" || c.status === "atrasado");

                  const hojeIso = new Date().toISOString().split("T")[0];
                  const dataVencIso = (c.data_vencimento_operacional || c.data_vencimento || "").split("T")[0];
                  let chipVencimento = "";
                  if (c.status !== "pago" && c.status !== "cancelado" && dataVencIso) {
                    const diffTime = new Date(dataVencIso + "T12:00:00").getTime() - new Date(hojeIso + "T12:00:00").getTime();
                    const diffDias = Math.round(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDias < 0) {
                      const atraso = Math.abs(diffDias);
                      chipVencimento = `<span class="mt-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1 shadow-2xs">🔴 ${atraso}d em atraso</span>`;
                    } else if (diffDias === 0) {
                      chipVencimento = `<span class="mt-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1 animate-pulse shadow-2xs">🚨 Vence Hoje</span>`;
                    } else if (diffDias <= 3) {
                      chipVencimento = `<span class="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 inline-flex items-center gap-1">⏳ Vence em ${diffDias}d</span>`;
                    }
                  }

                  return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td class="py-3 px-3 text-center">
                        ${podeSelecionar ? `
                          <input type="checkbox" data-id="${c.id}" class="check-selecionar-conta h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" ${this.titulosSelecionados.has(c.id) ? "checked" : ""} />
                        ` : ""}
                      </td>

                      <td class="py-3 px-4 whitespace-nowrap">
                        ${c.status === "pago" ? `
                          <span class="font-extrabold text-slate-900 dark:text-slate-100 block" title="Data do pagamento">${formatarData(c.data_pagamento || c.data_vencimento_operacional || c.data_vencimento)}</span>
                          <span class="text-[9px] text-slate-400 block font-semibold mt-0.5" title="Vencimento original da obrigação">Venc: ${formatarData(c.data_vencimento_operacional || c.data_vencimento)}</span>
                        ` : `
                          <span class="font-extrabold text-slate-900 dark:text-slate-100 block">${formatarData(c.data_vencimento_operacional || c.data_vencimento)}</span>
                          ${chipVencimento ? `<div class="block">${chipVencimento}</div>` : ""}
                          ${c.data_vencimento_operacional && c.data_vencimento_operacional !== c.data_vencimento ? `
                            <span class="text-[9px] text-slate-400 block font-semibold mt-0.5" title="Vencimento nominal no final de semana / feriado">Nominal: ${formatarData(c.data_vencimento)}</span>
                          ` : ""}
                        `}
                      </td>

                      <td class="py-3 px-4">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs">${c.favorecido}</span>
                        </div>
                        <span class="text-[10px] text-slate-400 block truncate max-w-xs">${c.descricao || "Despesa"} ${parcelaLabel}</span>
                      </td>

                      <td class="py-3 px-4 whitespace-nowrap">
                        <span class="font-bold text-slate-700 dark:text-slate-300 block">${c.categoria?.nome || "Geral"}</span>
                        <span class="text-[10px] text-slate-400 block">${c.tipo_custo?.nome || "Operacional"}</span>
                      </td>

                      <td class="py-3 px-4 text-right whitespace-nowrap">
                        <span class="font-extrabold text-slate-900 dark:text-slate-100">${formatarMoeda(c.valor_nominal)}</span>
                        ${ehEstimado ? `
                          <span class="ml-1 text-[9px] bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 px-1 py-0.5 rounded font-black uppercase">Estimado</span>
                        ` : ""}
                      </td>

                      <td class="py-3 px-4 text-right whitespace-nowrap">
                        <span class="font-extrabold ${c.status === "pago" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}">
                          ${c.valor_pago && c.valor_pago > 0 ? formatarMoeda(c.valor_pago) : "-"}
                        </span>
                      </td>

                      <td class="py-3 px-4 text-center whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${statusColors[c.status] || statusColors.pendente} uppercase">
                          ${c.status}
                        </span>
                      </td>

                      <td class="py-3 px-4 w-36 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1">
                          ${c.status !== "pago" && c.status !== "cancelado" ? `
                            <button data-id="${c.id}" class="btn-baixar-conta p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg transition cursor-pointer" title="Dar Baixa Inteligente">
                              ✅
                            </button>
                          ` : ""}

                          <button data-id="${c.id}" class="btn-editar-conta p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer" title="Editar Título">
                            ✏️
                          </button>

                          ${c.comprovante_url ? `
                            <a href="${c.comprovante_url}" target="_blank" class="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer" title="Ver Comprovante Anexo">
                              📎
                            </a>
                          ` : ""}

                          ${c.status === "pago" && isAdmin ? `
                            <button data-id="${c.id}" class="btn-estornar-conta p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer" title="Estornar Baixa (Admin)">
                              ↩️
                            </button>
                          ` : ""}

                          ${c.status !== "cancelado" && isAdmin ? `
                            <button data-id="${c.id}" class="btn-cancelar-conta p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer" title="Cancelar Título (Admin)">
                              🚫
                            </button>
                          ` : ""}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. Visão Mobile: Lista de Cards Unificados (block md:hidden) -->
        <div class="block md:hidden space-y-3">
          ${linhasParaExibir.length === 0 ? `
            <div class="p-8 text-center text-slate-400 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              Nenhuma conta ou lote localizado para o período e filtros selecionados.
            </div>
          ` : linhasParaExibir.map(item => {
            if (item.tipo === "lote") {
              const rem = item.remessa;
              const itens = item.itens;
              const expandida = this.remessasExpandidas.has(rem.id);
              const totalItens = itens.reduce((acc, it) => acc + Number(it.valor_nominal || 0), 0);

              return `
                <div class="bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl p-4 shadow-sm space-y-3">
                  <div class="flex items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-2.5">
                    <div class="flex items-center gap-2">
                      <span class="text-base">📦</span>
                      <div>
                        <span class="text-xs font-black text-indigo-700 dark:text-indigo-300">LOTE: ${rem.favorecido}</span>
                        <span class="text-[9px] text-slate-400 block">${formatarData(rem.data_pagamento || rem.data_prevista)}</span>
                      </div>
                    </div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${rem.status === "paga" ? statusColors.pago : statusColors.pendente} uppercase">
                      ${rem.status === "paga" ? "Pago" : "Aberto"}
                    </span>
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-[10px] text-slate-400 font-bold uppercase block">Total do Lote</span>
                      <span class="text-base font-black text-slate-900 dark:text-slate-100">${formatarMoeda(rem.valor_total || totalItens)}</span>
                      <span class="text-[10px] text-slate-500 block font-medium mt-0.5">${itens.length} título(s) agrupado(s)</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      ${rem.status !== "paga" ? `
                        <button data-remessa-id="${rem.id}" class="btn-abrir-baixa-remessa h-[36px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1" title="Pagar Lote">
                          💳 Pagar
                        </button>
                        <button data-remessa-id="${rem.id}" class="btn-desagrupar-remessa h-[36px] px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 rounded-xl font-bold text-xs transition cursor-pointer" title="Desfazer Lote">
                          Desfazer
                        </button>
                      ` : `
                        <button data-remessa-id="${rem.id}" class="btn-reverter-remessa h-[36px] px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1" title="Reverter Lote">
                          ↩ Reverter
                        </button>
                        ${rem.comprovante_url ? `
                          <a href="${rem.comprovante_url}" target="_blank" class="h-[36px] w-[36px] flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl transition cursor-pointer" title="Comprovante">
                            📎
                          </a>
                        ` : ""}
                      `}
                    </div>
                  </div>

                  <button type="button" data-remessa-id="${rem.id}" class="btn-toggle-remessa w-full py-2 px-3 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center justify-between cursor-pointer">
                    <span>${expandida ? "▲ Recolher Títulos" : "▼ Ver " + itens.length + " Título(s) do Lote"}</span>
                    <span class="text-[10px] text-slate-400">LOTE '${rem.favorecido}'</span>
                  </button>

                  ${expandida ? `
                    <div class="space-y-2 pt-2 border-t border-indigo-100/60 dark:border-indigo-900/40 pl-2">
                      ${itens.map(c => `
                        <div class="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-indigo-100/50 dark:border-indigo-900/40 text-xs space-y-1">
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-slate-800 dark:text-slate-200">${c.favorecido}</span>
                            <span class="font-black text-slate-900 dark:text-slate-100">${formatarMoeda(c.valor_nominal)}</span>
                          </div>
                          <p class="text-[10px] text-slate-400 truncate">${c.descricao || "Despesa"} • Venc: ${formatarData(c.data_vencimento_operacional || c.data_vencimento)}</p>
                        </div>
                      `).join("")}
                    </div>
                  ` : ""}
                </div>
              `;
            }

            // ITEM AVULSO NO MOBILE
            const c = item.conta;
            const ehEstimado = !!c.valor_estimado && c.status !== "pago";
            const parcelaLabel = (c.parcela_total && c.parcela_total > 1) ? `(${c.parcela_numero}/${c.parcela_total})` : "";
            const podeSelecionar = !c.remessa_id && (c.status === "pendente" || c.status === "atrasado");

            const hojeIsoMobile = new Date().toISOString().split("T")[0];
            const dataVencIsoMobile = (c.data_vencimento_operacional || c.data_vencimento || "").split("T")[0];
            let chipVencimentoMobile = "";
            if (c.status !== "pago" && c.status !== "cancelado" && dataVencIsoMobile) {
              const diffTime = new Date(dataVencIsoMobile + "T12:00:00").getTime() - new Date(hojeIsoMobile + "T12:00:00").getTime();
              const diffDias = Math.round(diffTime / (1000 * 60 * 60 * 24));
              if (diffDias < 0) {
                const atraso = Math.abs(diffDias);
                chipVencimentoMobile = `<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1 shadow-2xs">🔴 ${atraso}d em atraso</span>`;
              } else if (diffDias === 0) {
                chipVencimentoMobile = `<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1 animate-pulse shadow-2xs">🚨 Vence Hoje</span>`;
              } else if (diffDias <= 3) {
                chipVencimentoMobile = `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 inline-flex items-center gap-1">⏳ Vence em ${diffDias}d</span>`;
              }
            }

            return `
              <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div class="flex items-center gap-2 flex-wrap">
                    ${podeSelecionar ? `
                      <input type="checkbox" data-id="${c.id}" class="check-selecionar-conta h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" ${this.titulosSelecionados.has(c.id) ? "checked" : ""} />
                    ` : ""}
                    ${c.status === "pago" ? `
                      <div class="flex flex-col">
                        <span class="text-xs font-black text-slate-900 dark:text-slate-100" title="Data do pagamento">${formatarData(c.data_pagamento || c.data_vencimento_operacional || c.data_vencimento)}</span>
                        <span class="text-[9px] text-slate-400 font-semibold" title="Vencimento original">Venc: ${formatarData(c.data_vencimento_operacional || c.data_vencimento)}</span>
                      </div>
                    ` : `
                      <div class="flex flex-col">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="text-xs font-black text-slate-900 dark:text-slate-100">${formatarData(c.data_vencimento_operacional || c.data_vencimento)}</span>
                          ${chipVencimentoMobile}
                        </div>
                        ${c.data_vencimento_operacional && c.data_vencimento_operacional !== c.data_vencimento ? `
                          <span class="text-[9px] text-slate-400 font-semibold mt-0.5">Nominal: ${formatarData(c.data_vencimento)}</span>
                        ` : ""}
                      </div>
                    `}
                  </div>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusColors[c.status] || statusColors.pendente} uppercase">
                    ${c.status}
                  </span>
                </div>

                <div>
                  <span class="font-extrabold text-slate-900 dark:text-slate-100 text-sm block">${c.favorecido}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-0.5">${c.descricao || "Despesa"} ${parcelaLabel}</span>
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      ${c.categoria?.nome || "Geral"}
                    </span>
                    <span class="text-[10px] text-slate-400 font-semibold">• ${c.tipo_custo?.nome || "Operacional"}</span>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Valor</span>
                    <div class="flex items-baseline gap-1">
                      <span class="text-base font-black text-slate-900 dark:text-slate-100">${formatarMoeda(c.valor_nominal)}</span>
                      ${ehEstimado ? `<span class="text-[9px] text-sky-600 font-bold uppercase">(Estimado)</span>` : ""}
                    </div>
                    ${c.valor_pago && c.valor_pago > 0 ? `
                      <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Pago: ${formatarMoeda(c.valor_pago)}</span>
                    ` : ""}
                  </div>

                  <div class="flex items-center gap-1.5">
                    ${c.status !== "pago" && c.status !== "cancelado" ? `
                      <button data-id="${c.id}" class="btn-baixar-conta h-[36px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1" title="Dar Baixa">
                        <span>✓</span> Baixar
                      </button>
                    ` : ""}

                    <button data-id="${c.id}" class="btn-editar-conta h-[36px] w-[36px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer" title="Editar">
                      ✏️
                    </button>

                    ${c.comprovante_url ? `
                      <a href="${c.comprovante_url}" target="_blank" class="h-[36px] w-[36px] flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl transition cursor-pointer" title="Comprovante">
                        📎
                      </a>
                    ` : ""}

                    ${c.status === "pago" && isAdmin ? `
                      <button data-id="${c.id}" class="btn-estornar-conta h-[36px] w-[36px] flex items-center justify-center bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl transition cursor-pointer" title="Estornar Baixa">
                        ↩️
                      </button>
                    ` : ""}

                    ${c.status !== "cancelado" && isAdmin ? `
                      <button data-id="${c.id}" class="btn-cancelar-conta h-[36px] w-[36px] flex items-center justify-center bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer" title="Cancelar Título">
                        🚫
                      </button>
                    ` : ""}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
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

    const mesAtivo = this.filtros.mes || (new Date().getMonth() + 1);
    const anoAtivo = this.filtros.ano || new Date().getFullYear();

    // 1. Apuração da Matriz do Calendário Diário
    const cal = FinContasPagarService.calcularCalendarioMensal(this.contas, mesAtivo, anoAtivo);

    // Identifica o dia da semana do dia 1 do mês para preencher espaços vazios iniciais
    const primeiroDiaSemana = new Date(anoAtivo, mesAtivo - 1, 1).getDay(); // 0 = Dom, 6 = Sáb
    const diasSemanaCabecalho = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    // 2. Agrupamento por Tipo de Custo (DRE Simplificado)
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
        <!-- Painel do Calendário Diário de Desembolsos -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-lg">🗓️</span>
                <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Calendário Diário de Vencimentos & Picos de Caixa</h3>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">Distribuição temporal dos desembolsos com destaque para dias de pico estratégico (1, 5, 10, 15, 20 e 30).</p>
            </div>

            <!-- Resumo Rápido do Calendário -->
            <div class="flex items-center gap-2 flex-wrap">
              ${cal.diaMaiorDesembolso ? `
                <div class="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-left">
                  <span class="text-[9px] uppercase tracking-wider font-black text-amber-700 dark:text-amber-400 block">⚡ Maior Desembolso</span>
                  <span class="text-xs font-black text-slate-900 dark:text-slate-100">Dia ${cal.diaMaiorDesembolso.dia}: ${formatarMoeda(cal.diaMaiorDesembolso.total)}</span>
                </div>
              ` : ''}

              <div class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-xl text-left">
                <span class="text-[9px] uppercase tracking-wider font-black text-slate-400 block">Dias com Vencimento</span>
                <span class="text-xs font-black text-slate-800 dark:text-slate-200">${cal.diasComVencimento} dias ativos</span>
              </div>

              <div class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-xl text-left">
                <span class="text-[9px] uppercase tracking-wider font-black text-slate-400 block">Média por Dia Ativo</span>
                <span class="text-xs font-black text-slate-800 dark:text-slate-200">${formatarMoeda(cal.mediaDiariaDesembolso)}</span>
              </div>
            </div>
          </div>

          <!-- Legenda Visual Rápida -->
          <div class="flex items-center gap-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex-wrap">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30"></span> Dias de Pico (1, 5, 10, 15, 20, 30)</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Liquidado</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pendente</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span> Em Atraso</span>
          </div>

          <!-- Grade Calendário (7 Colunas de Domingo a Sábado com rolagem defensiva) -->
          <div class="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
            <div class="overflow-x-auto custom-scrollbar scroll-indicator-fade w-full">
              <div class="min-w-[680px] lg:min-w-0">
                <!-- Cabeçalho dos Dias da Semana -->
                <div class="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center py-2 bg-slate-100/60 dark:bg-slate-900/60 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ${diasSemanaCabecalho.map(d => `<div>${d}</div>`).join('')}
                </div>

                <!-- Células dos Dias -->
                <div class="grid grid-cols-7 gap-px bg-slate-200/60 dark:bg-slate-800/80">
                  <!-- Espaços vazios antes do dia 1 -->
                  ${Array.from({ length: primeiroDiaSemana }).map(() => `
                    <div class="min-h-[85px] sm:min-h-[95px] p-2 bg-slate-50/20 dark:bg-slate-950/10"></div>
                  `).join('')}

                  <!-- Dias do Mês -->
                  ${cal.dias.map(d => {
                    const temTitulos = d.qtdTitulos > 0;
                    const ehPico = d.ehDiaPico;
                    const temAtrasadas = d.qtdAtrasadas > 0;
                    const todasPagas = temTitulos && d.qtdPagas === d.qtdTitulos;

                    return `
                      <div 
                        data-cal-dia="${d.dia}" 
                        class="btn-detalhes-dia-cal min-h-[85px] sm:min-h-[95px] p-2 flex flex-col justify-between transition relative text-left select-none ${
                          temTitulos ? 'cursor-pointer hover:bg-white dark:hover:bg-slate-900 hover:ring-2 hover:ring-indigo-500/50 hover:z-10 shadow-2xs' : 'cursor-default'
                        } ${
                          ehPico 
                            ? 'bg-amber-50/40 dark:bg-amber-950/25 ring-1 ring-amber-400/25' 
                            : d.ehFimDeSemana 
                              ? 'bg-slate-50/60 dark:bg-slate-950/40' 
                              : 'bg-white dark:bg-slate-900'
                        }"
                        title="${temTitulos ? `Clique para conferir os ${d.qtdTitulos} títulos do Dia ${d.dia}` : `Dia ${d.dia} sem vencimentos`}"
                      >
                        <!-- Linha do Número do Dia e Badge de Pico -->
                        <div class="flex items-center justify-between">
                          <span class="text-xs sm:text-sm font-black ${
                            temTitulos 
                              ? (temAtrasadas ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100') 
                              : (d.ehFimDeSemana ? 'text-slate-400 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400')
                          }">
                            ${d.dia}
                          </span>

                          ${ehPico ? `
                            <span class="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-500/90 text-white tracking-wider shadow-2xs">
                              Pico
                            </span>
                          ` : ''}
                        </div>

                        <!-- Conteúdo Financeiro do Dia -->
                        <div class="my-1">
                          ${temTitulos ? `
                            <span class="text-[11px] sm:text-xs font-black block truncate ${
                              todasPagas 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : temAtrasadas 
                                  ? 'text-rose-600 dark:text-rose-400' 
                                  : 'text-indigo-600 dark:text-indigo-400'
                            }">
                              ${formatarMoeda(d.totalNominal)}
                            </span>
                          ` : `
                            <span class="text-[9px] text-slate-300 dark:text-slate-700 font-semibold block">-</span>
                          `}
                        </div>

                        <!-- Rodapé da Célula com Contadores -->
                        <div>
                          ${temTitulos ? `
                            <span class="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              todasPagas 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                                : temAtrasadas 
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 animate-pulse' 
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                            }">
                              ${todasPagas ? '✓ ' : ''}${d.qtdTitulos} ${d.qtdTitulos === 1 ? 'conta' : 'contas'}
                            </span>
                          ` : `
                            <span class="text-[9px] text-slate-300 dark:text-slate-700 font-medium block"></span>
                          `}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Demonstrativo por Grupos (DRE Simplificado) com Barra de Progresso Visual -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Demonstrativo por Tipos de Custo (DRE)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Consolidação orçada vs desembolsada no mês de referência com taxa de realização.</p>
            </div>
            <button id="btn-exportar-csv" class="h-[42px] px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5">
              <span>📥</span> Exportar CSV
            </button>
          </div>

          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr class="text-[9px] uppercase tracking-widest font-black text-slate-400 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <th class="py-2.5 px-4">Macro Grupo de Custo</th>
                  <th class="py-2.5 px-4 text-right">Previsto / Orçado</th>
                  <th class="py-2.5 px-4 text-right">Realizado / Pago</th>
                  <th class="py-2.5 px-4 text-right">Variação (R$)</th>
                  <th class="py-2.5 px-4 text-center w-40">% Executado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                ${Object.values(agrupamentoDRE).map(item => {
                  const dif = item.nominal - item.pago;
                  const pct = item.nominal > 0 ? Math.round((item.pago / item.nominal) * 100) : (item.pago > 0 ? 100 : 0);
                  const corBarra = pct > 100 ? 'bg-rose-500' : (pct >= 85 ? 'bg-amber-500' : 'bg-emerald-500');

                  return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                      <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">${item.nome}</td>
                      <td class="py-3 px-4 text-right font-medium">${formatarMoeda(item.nominal)}</td>
                      <td class="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">${formatarMoeda(item.pago)}</td>
                      <td class="py-3 px-4 text-right font-medium ${dif < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}">${formatarMoeda(dif)}</td>
                      <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                          <div class="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div class="${corBarra} h-full rounded-full transition-all" style="width: ${Math.min(100, pct)}%"></div>
                          </div>
                          <span class="text-[11px] font-black ${pct > 100 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}">${pct}%</span>
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
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-bold text-slate-400">${cats.length} categorias</span>
                      <button class="btn-add-cat-tipo text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer flex items-center gap-0.5" data-tipo-id="${tc.id}" title="Adicionar categoria a este grupo">
                        <span>+</span> Adicionar
                      </button>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    ${cats.length === 0 ? `
                      <span class="text-[11px] text-slate-400 italic">Nenhuma categoria cadastrada.</span>
                    ` : cats.map(c => `
                      <div class="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs flex items-center gap-1.5 group">
                        <span>${c.nome}</span>
                        <button class="btn-editar-categoria opacity-60 hover:opacity-100 transition text-slate-400 hover:text-indigo-600 cursor-pointer text-[10px]" data-cat-id="${c.id}" title="Editar categoria">✏️</button>
                      </div>
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
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Contas Bancárias & Caixas</h3>
              <p class="text-[10px] text-slate-400">Contas ativas aparecem para baixas e pagamentos. Inative as que não usar mais.</p>
            </div>
            <button id="btn-nova-conta-bancaria" class="px-3.5 h-[36px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95">
              <span>+</span> Adicionar Banco
            </button>
          </div>

          <div class="space-y-2.5">
            ${this.contasBancarias.length === 0 ? `
              <div class="p-4 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhuma conta bancária cadastrada. Clique em "+ Adicionar Banco".
              </div>
            ` : this.contasBancarias.map(b => {
              const isAtivo = b.ativo !== false;
              return `
                <div class="flex items-center justify-between p-3.5 border ${isAtivo ? 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30' : 'border-dashed border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 opacity-70'} rounded-xl transition-all">
                  <div class="flex items-center gap-3">
                    <span class="text-xl">${isAtivo ? '🏦' : '🔒'}</span>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-800 dark:text-slate-100 text-xs">${b.nome_banco}</span>
                        ${isAtivo ? `
                          <span class="px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-black border border-emerald-200/50 uppercase">Ativo</span>
                        ` : `
                          <span class="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 text-[9px] font-bold border border-slate-300 dark:border-slate-700 uppercase">Inativo</span>
                        `}
                      </div>
                      <span class="text-[10px] text-slate-400 uppercase font-semibold block mt-0.5">${b.tipo}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-black tabular-nums text-slate-900 dark:text-slate-100 mr-1">
                      ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.saldo_inicial || 0)}
                    </span>
                    <button class="btn-toggle-status-banco text-xs p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer transition" data-banco-id="${b.id}" data-ativo="${isAtivo}" title="${isAtivo ? 'Inativar banco' : 'Reativar banco'}">
                      ${isAtivo ? '⏸️' : '▶️'}
                    </button>
                    <button class="btn-editar-conta-bancaria text-slate-500 hover:text-indigo-600 cursor-pointer text-xs p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition" data-banco-id="${b.id}" title="Editar conta bancária">
                      ✏️
                    </button>
                    <button class="btn-excluir-conta-bancaria text-slate-400 hover:text-rose-600 cursor-pointer text-xs p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" data-banco-id="${b.id}" data-nome="${b.nome_banco}" title="Excluir ou inativar banco">
                      🗑️
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Fornecedores & Favorecidos -->
        <div class="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">🏢 Fornecedores & Favorecidos Cadastrados</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  ${this.fornecedores.filter(f => !this.buscaFornecedorTermo || f.nome.toLowerCase().includes(this.buscaFornecedorTermo.toLowerCase()) || (f.cpf_cnpj && f.cpf_cnpj.includes(this.buscaFornecedorTermo))).length} cadastrado(s)
                </span>
              </div>
              <p class="text-[10px] text-slate-400">Favorecidos oficiais para autocomplete e padronização contábil em Contas a Pagar e Lotes.</p>
            </div>
            <div class="flex items-center gap-2">
              <input type="text" id="busca-fornecedor-input" value="${this.escapeHtml(this.buscaFornecedorTermo)}" placeholder="🔍 Filtrar fornecedor..." class="h-[36px] px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-60" />
              <button id="btn-novo-fornecedor" class="h-[36px] px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95">
                <span>+</span> Novo Fornecedor
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${(() => {
              const filtrados = this.fornecedores.filter(f => 
                !this.buscaFornecedorTermo || 
                f.nome.toLowerCase().includes(this.buscaFornecedorTermo.toLowerCase()) || 
                (f.cpf_cnpj && f.cpf_cnpj.includes(this.buscaFornecedorTermo)) ||
                (f.observacoes && f.observacoes.toLowerCase().includes(this.buscaFornecedorTermo.toLowerCase()))
              );

              if (filtrados.length === 0) {
                return `
                  <div class="col-span-full p-6 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    Nenhum fornecedor encontrado. Clique em "+ Novo Fornecedor".
                  </div>
                `;
              }

              return filtrados.map(f => `
                <div class="p-3.5 border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl flex items-start justify-between gap-2 hover:border-slate-200 dark:hover:border-slate-700 transition">
                  <div class="min-w-0 space-y-1">
                    <span class="font-bold text-xs text-slate-800 dark:text-slate-100 truncate block">${this.escapeHtml(f.nome)}</span>
                    ${f.cpf_cnpj ? `
                      <span class="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 block">${this.escapeHtml(f.cpf_cnpj)}</span>
                    ` : ''}
                    ${f.observacoes ? `
                      <p class="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">${this.escapeHtml(f.observacoes)}</p>
                    ` : ''}
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button class="btn-editar-fornecedor text-slate-400 hover:text-indigo-600 cursor-pointer text-xs p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition" data-forn-id="${f.id}" title="Editar fornecedor">
                      ✏️
                    </button>
                    <button class="btn-excluir-fornecedor text-slate-400 hover:text-rose-600 cursor-pointer text-xs p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" data-forn-id="${f.id}" data-nome="${this.escapeHtml(f.nome)}" title="Excluir fornecedor">
                      🗑️
                    </button>
                  </div>
                </div>
              `).join('');
            })()}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // CONFIGURAÇÃO DE EVENT LISTENERS E MODAIS
  // ==========================================================================
  private async setupEventListeners(): Promise<void> {
    if (this.activeTab === 'conciliacao') {
      const concMount = this.container.querySelector('#fin-conciliacao-mount') as HTMLElement;
      if (concMount) {
        this.conciliacaoInstance = new ConciliacaoPage(concMount, { showHeader: false });
        await this.conciliacaoInstance.init(this.user, this.perfil);
      }

      this.container.querySelector('#btn-abrir-upload-topo')?.addEventListener('click', () => {
        this.conciliacaoInstance?.abrirUploadExtrato();
      });

      this.container.querySelector('#btn-fechar-mes-topo')?.addEventListener('click', () => {
        this.conciliacaoInstance?.abrirFecharMes();
      });

      this.container.querySelector('#btn-exportar-conciliacao-topo')?.addEventListener('click', () => {
        this.conciliacaoInstance?.exportarCSV();
      });

      return;
    }

    if (this.conciliacaoInstance) {
      if (typeof (this.conciliacaoInstance as any).destroy === 'function') {
        (this.conciliacaoInstance as any).destroy();
      }
      this.conciliacaoInstance = null;
    }

    // Alternância de Abas (retrocompatibilidade)
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tab = btn.getAttribute('data-tab') as any;
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          await this.carregarDadosAbaAtiva();
          this.render();
          await this.setupEventListeners();
        }
      });
    });

    // Controle do Filtro Multi-Meses
    const btnToggleMeses = this.container.querySelector('#btn-toggle-dropdown-meses');
    const dropdownMeses = this.container.querySelector('#dropdown-meses-flutuante');
    btnToggleMeses?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dropdownMesesAberto = !this.dropdownMesesAberto;
      dropdownMeses?.classList.toggle('hidden', !this.dropdownMesesAberto);
    });

    const nomesMesesFmt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const atualizarVisualDropdownMeses = () => {
      const mesesSel = (this.filtros.meses && this.filtros.meses.length > 0)
        ? this.filtros.meses
        : [new Date().getMonth() + 1];

      // Atualiza estilo dos chips
      this.container.querySelectorAll('.btn-chip-mes').forEach(c => {
        const num = Number(c.getAttribute('data-mes-num'));
        const ativo = mesesSel.includes(num);
        if (ativo) {
          c.className = 'btn-chip-mes h-8 rounded-lg text-xs font-black transition flex items-center justify-center border cursor-pointer bg-indigo-600 border-indigo-600 text-white shadow-sm';
        } else {
          c.className = 'btn-chip-mes h-8 rounded-lg text-xs font-bold transition flex items-center justify-center border cursor-pointer bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600';
        }
      });

      // Atualiza badge de contagem no cabeçalho do dropdown
      const badgeCount = this.container.querySelector('#dropdown-meses-count');
      if (badgeCount) {
        badgeCount.textContent = `${mesesSel.length} selecionado(s)`;
      }

      // Atualiza o texto do botão trigger
      const labelEl = this.container.querySelector('#texto-rotulo-meses');
      if (labelEl) {
        let texto = '';
        if (mesesSel.length === 12) {
          texto = 'Ano Todo (12 meses)';
        } else if (mesesSel.length === 1) {
          texto = nomesMesesFmt[mesesSel[0] - 1] || `Mês ${mesesSel[0]}`;
        } else if (mesesSel.length <= 3) {
          texto = mesesSel.slice().sort((a, b) => a - b).map(num => nomesMesesFmt[num - 1]).join(', ');
        } else {
          texto = `${mesesSel.length} meses selecionados`;
        }
        labelEl.textContent = texto;
      }
    };

    // Fechar e aplicar ao clicar fora
    if (this.dropdownMesesAberto) {
      const clickOutsideHandler = async (e: MouseEvent) => {
        const containerMeses = this.container.querySelector('#container-filtro-meses');
        if (containerMeses && !containerMeses.contains(e.target as Node)) {
          this.dropdownMesesAberto = false;
          dropdownMeses?.classList.add('hidden');
          document.removeEventListener('click', clickOutsideHandler);
          this.filtros.mes = this.filtros.meses?.[0] || (new Date().getMonth() + 1);
          await this.carregarDadosAbaAtiva();
          this.render();
          this.setupEventListeners();
        }
      };
      setTimeout(() => document.addEventListener('click', clickOutsideHandler), 10);
    }

    // Toggle de chips de mês
    this.container.querySelectorAll('.btn-chip-mes').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const mesNum = Number(chip.getAttribute('data-mes-num'));
        if (!mesNum) return;
        if (!this.filtros.meses) {
          this.filtros.meses = [this.filtros.mes || (new Date().getMonth() + 1)];
        }
        if (this.filtros.meses.includes(mesNum)) {
          if (this.filtros.meses.length > 1) {
            this.filtros.meses = this.filtros.meses.filter(m => m !== mesNum);
          }
        } else {
          this.filtros.meses.push(mesNum);
          this.filtros.meses.sort((a, b) => a - b);
        }
        atualizarVisualDropdownMeses();
      });
    });

    // Atalhos Rápidos com atualização visual instantânea
    this.container.querySelector('#btn-atalho-mes-atual')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.filtros.meses = [new Date().getMonth() + 1];
      atualizarVisualDropdownMeses();
    });

    this.container.querySelector('#btn-atalho-trimestre-atual')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const curMonth = new Date().getMonth() + 1;
      const quarter = Math.ceil(curMonth / 3);
      const startM = (quarter - 1) * 3 + 1;
      this.filtros.meses = [startM, startM + 1, startM + 2];
      atualizarVisualDropdownMeses();
    });

    this.container.querySelector('#btn-atalho-ano-todo')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.filtros.meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      atualizarVisualDropdownMeses();
    });

    this.container.querySelector('#btn-limpar-meses')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.filtros.meses = [new Date().getMonth() + 1];
      atualizarVisualDropdownMeses();
    });

    this.container.querySelector('#btn-aplicar-filtro-meses')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      this.dropdownMesesAberto = false;
      this.filtros.mes = this.filtros.meses?.[0] || (new Date().getMonth() + 1);
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

    // Clique no Card KPI de Atraso: ativa filtro global de atrasadas imediatamente
    this.container.querySelector('#card-kpi-atrasadas')?.addEventListener('click', async () => {
      this.filtros.status = 'atrasado';
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
    });

    // Ações de Títulos (Baixar, Editar, Cancelar, Estornar)
    this.container.querySelectorAll('.btn-baixar-conta').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const c = this.contas.find(x => x.id === id);
        if (c) this.abrirModalBaixa(c);
      });
    });

    this.container.querySelectorAll('.btn-editar-conta').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.abrirModalEditarConta(id);
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
            window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
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
            window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
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

    // Botão Abrir Filtros Avançados
    this.container.querySelector('#btn-abrir-filtros-avancados')?.addEventListener('click', () => {
      this.abrirModalFiltrosAvancados();
    });

    // Botão Limpar Filtros (Reset Geral)
    const limparTodosFiltros = async () => {
      this.filtros.status = 'todos';
      this.filtros.tipoCustoId = undefined;
      this.filtros.categoriaId = undefined;
      this.filtros.buscaFavorecido = undefined;
      this.filtros.buscaGeral = undefined;
      this.filtros.dataInicio = undefined;
      this.filtros.dataFim = undefined;
      this.filtros.tipoDataFiltro = undefined;
      this.filtros.contaBancariaId = undefined;
      this.filtros.formaPagamento = undefined;
      this.filtros.valorMin = undefined;
      this.filtros.valorMax = undefined;
      this.filtros.naturezaLancamento = 'todos';
      this.filtros.ignorarMes = false;
      this.filtros.periodoTipo = 'mes';
      this.filtros.meses = [new Date().getMonth() + 1];
      this.filtros.mes = new Date().getMonth() + 1;
      this.dropdownMesesAberto = false;
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
    };

    this.container.querySelector('#btn-limpar-filtros')?.addEventListener('click', limparTodosFiltros);
    this.container.querySelector('#btn-limpar-chips-avancados')?.addEventListener('click', limparTodosFiltros);

    // Remoção Individual de Chip de Filtro Avançado
    this.container.querySelectorAll('.btn-remover-chip-filtro').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tipoChip = btn.getAttribute('data-remover-filtro');
        if (tipoChip === 'periodo') {
          this.filtros.dataInicio = undefined;
          this.filtros.dataFim = undefined;
          this.filtros.periodoTipo = 'mes';
        } else if (tipoChip === 'buscaGeral') {
          this.filtros.buscaGeral = undefined;
        } else if (tipoChip === 'contaBancaria') {
          this.filtros.contaBancariaId = undefined;
        } else if (tipoChip === 'formaPagamento') {
          this.filtros.formaPagamento = undefined;
        } else if (tipoChip === 'valor') {
          this.filtros.valorMin = undefined;
          this.filtros.valorMax = undefined;
        } else if (tipoChip === 'natureza') {
          this.filtros.naturezaLancamento = 'todos';
        } else if (tipoChip === 'ignorarMes') {
          this.filtros.ignorarMes = false;
        }
        await this.carregarDadosAbaAtiva();
        this.render();
        this.setupEventListeners();
      });
    });

    // Botões de Exportar CSV
    this.container.querySelector('#btn-exportar-contas-csv')?.addEventListener('click', () => {
      this.exportarCSV();
    });
    this.container.querySelector('#btn-exportar-csv-tabela')?.addEventListener('click', () => {
      this.exportarCSV();
    });
    this.container.querySelector('#btn-exportar-dre')?.addEventListener('click', () => {
      this.exportarCSV();
    });
    this.container.querySelector('#btn-exportar-csv')?.addEventListener('click', () => {
      this.exportarCSV();
    });

    // Ações de Remessa: Desagrupar e Baixar
    this.container.querySelectorAll('.btn-desagrupar-remessa').forEach(btn => {
      btn.addEventListener('click', async () => {
        const remId = btn.getAttribute('data-remessa-id');
        if (!remId) return;
        const confirmou = await showCustomConfirm('Deseja realmente DESFAZER este lote de remessa? Os títulos associados voltarão a ficar disponíveis individualmente.');
        if (confirmou) {
          const res = await FinRemessasService.desagruparRemessa(remId);
          if (res.sucesso) {
            await showCustomAlert('Lote de remessa desfeito com sucesso! Títulos desagrupados.', 'Sucesso');
            await this.carregarDadosAbaAtiva();
            this.render();
            this.setupEventListeners();
          } else {
            await showCustomAlert(res.erro || 'Falha ao desagrupar remessa', 'Erro');
          }
        }
      });
    });

    // Expansão e recolhimento de itens do Lote (Accordion)
    this.container.querySelectorAll('.btn-toggle-remessa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
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

    // Abrir Modal de Baixa Consolidada do Lote
    this.container.querySelectorAll('.btn-abrir-baixa-remessa, .btn-baixar-remessa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const remId = btn.getAttribute('data-remessa-id');
        if (remId) this.abrirModalBaixaRemessa(remId);
      });
    });

    // Reverter Baixa do Lote
    this.container.querySelectorAll('.btn-reverter-remessa').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const remId = btn.getAttribute('data-remessa-id');
        if (remId) await this.reverterLoteRemessa(remId);
      });
    });

    // Botão Nova Conta / Despesa
    this.container.querySelector('#btn-nova-conta')?.addEventListener('click', () => {
      this.abrirModalNovaConta();
    });

    // Alternador de Filtro de Agrupamento (Todos, Avulsos)
    this.container.querySelectorAll('.btn-filtro-agrupamento').forEach(btn => {
      btn.addEventListener('click', () => {
        const modo = btn.getAttribute('data-modo') as 'todos' | 'avulsos';
        if (modo && modo !== this.filtroAgrupamento) {
          this.filtroAgrupamento = modo;
          this.render();
          this.setupEventListeners();
        }
      });
    });

    // Checkbox Mestre: Selecionar todos os títulos avulsos pendentes
    const checkAll = this.container.querySelector('#check-selecionar-todas-contas') as HTMLInputElement;
    checkAll?.addEventListener('change', () => {
      const contasAvulsasPendentes = this.contas.filter(c => !c.remessa_id && (c.status === 'pendente' || c.status === 'atrasado'));
      if (checkAll.checked) {
        contasAvulsasPendentes.forEach(c => this.titulosSelecionados.add(c.id));
      } else {
        this.titulosSelecionados.clear();
      }
      this.render();
      this.setupEventListeners();
    });

    // Checkbox Individual de Título Avulso
    this.container.querySelectorAll('.check-selecionar-conta').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute('data-id');
        if (!id) return;
        if (target.checked) {
          this.titulosSelecionados.add(id);
        } else {
          this.titulosSelecionados.delete(id);
        }
        this.render();
        this.setupEventListeners();
      });
    });

    // Barra Flutuante de Seleção: Desmarcar
    this.container.querySelector('#btn-desmarcar-selecao')?.addEventListener('click', () => {
      this.titulosSelecionados.clear();
      this.render();
      this.setupEventListeners();
    });

    // Botões de Agrupar em Lote de Remessa
    this.container.querySelector('#btn-agrupar-selecionadas')?.addEventListener('click', () => {
      if (this.titulosSelecionados.size === 0) {
        showCustomAlert('Selecione ao menos um título avulso para agrupar em lote de remessa.', 'Atenção');
        return;
      }
      this.abrirModalCriarRemessa(Array.from(this.titulosSelecionados));
    });

    this.container.querySelector('#btn-agrupar-remessa-topo')?.addEventListener('click', () => {
      if (this.titulosSelecionados.size === 0) {
        this.filtroAgrupamento = 'avulsos';
        this.render();
        this.setupEventListeners();
        showCustomAlert('Marque as caixas de seleção dos títulos avulsos que deseja agrupar e clique em "Agrupar em Lote de Remessa".', 'Instrução');
        return;
      }
      this.abrirModalCriarRemessa(Array.from(this.titulosSelecionados));
    });

    // Botão Nova Remessa (Atalho)
    this.container.querySelector('#btn-nova-remessa')?.addEventListener('click', () => {
      this.filtroAgrupamento = 'avulsos';
      this.render();
      this.setupEventListeners();
      showCustomAlert('Marque as caixas de seleção dos títulos avulsos que deseja agrupar e clique em "Agrupar em Lote de Remessa".', 'Instrução');
    });

    // Botão Nova Categoria (Plano de Contas)
    this.container.querySelector('#btn-nova-categoria')?.addEventListener('click', () => {
      this.abrirModalNovaCategoria();
    });

    // Botão Nova Conta Bancária
    this.container.querySelector('#btn-nova-conta-bancaria')?.addEventListener('click', () => {
      this.abrirModalNovaContaBancaria();
    });

    // Cliques em botões de editar categoria
    this.container.querySelectorAll('.btn-editar-categoria').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catId = btn.getAttribute('data-cat-id');
        const cat = this.categorias.find(c => c.id === catId);
        if (cat) this.abrirModalNovaCategoria(cat);
      });
    });

    // Cliques em botões de editar conta bancária
    this.container.querySelectorAll('.btn-editar-conta-bancaria').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bancoId = btn.getAttribute('data-banco-id');
        const banco = this.contasBancarias.find(b => b.id === bancoId);
        if (banco) this.abrirModalNovaContaBancaria(banco);
      });
    });

    // Alternar status ativo/inativo de conta bancária com 1-clique
    this.container.querySelectorAll('.btn-toggle-status-banco').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const bancoId = btn.getAttribute('data-banco-id');
        const isAtivoAtual = btn.getAttribute('data-ativo') === 'true';
        if (!bancoId) return;

        const novoStatus = !isAtivoAtual;
        const confirmou = await showCustomConfirm(
          novoStatus 
            ? 'Deseja REATIVAR esta conta bancária para operações de pagamento e baixa?' 
            : 'Deseja INATIVAR esta conta bancária? Ela deixará de aparecer para novas baixas, mas seus históricos contábeis serão preservados.'
        );

        if (confirmou) {
          const res = await FinPlanoContasService.inativarContaBancaria(bancoId, novoStatus);
          if (res.sucesso) {
            await showCustomAlert(novoStatus ? 'Conta bancária reativada com sucesso!' : 'Conta bancária inativada com sucesso!', 'Sucesso');
            await this.carregarCadastrosBase();
            this.render();
            this.setupEventListeners();
          } else {
            await showCustomAlert(res.erro || 'Falha ao alterar status da conta bancária.', 'Erro');
          }
        }
      });
    });

    // Exclusão ou Inativação segura de conta bancária
    this.container.querySelectorAll('.btn-excluir-conta-bancaria').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const bancoId = btn.getAttribute('data-banco-id');
        const nomeBanco = btn.getAttribute('data-nome') || 'esta conta bancária';
        if (!bancoId) return;

        const confirmou = await showCustomConfirm(
          `Deseja realmente remover ${nomeBanco}? Se houver títulos vinculados no histórico, a conta será apenas inativada com segurança.`
        );

        if (confirmou) {
          const res = await FinPlanoContasService.excluirContaBancaria(bancoId);
          if (res.sucesso) {
            if (res.inativada) {
              await showCustomAlert(res.erro || `${nomeBanco} possui histórico e foi inativada para manter a governança contábil.`, 'Atenção');
            } else {
              await showCustomAlert(`${nomeBanco} excluída com sucesso!`, 'Sucesso');
            }
            await this.carregarCadastrosBase();
            this.render();
            this.setupEventListeners();
          } else {
            await showCustomAlert(res.erro || 'Falha ao excluir conta bancária.', 'Erro');
          }
        }
      });
    });

    // Botão de adicionar categoria rápida direto no card do tipo de custo
    this.container.querySelectorAll('.btn-add-cat-tipo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tipoId = btn.getAttribute('data-tipo-id');
        this.abrirModalNovaCategoria(undefined, tipoId || undefined);
      });
    });

    // Eventos de Fornecedores & Favorecidos na aba Plano de Contas
    const inputBuscaForn = this.container.querySelector('#busca-fornecedor-input') as HTMLInputElement;
    if (inputBuscaForn) {
      inputBuscaForn.addEventListener('input', () => {
        this.buscaFornecedorTermo = inputBuscaForn.value;
        this.render();
        this.setupEventListeners();
        const reInput = this.container.querySelector('#busca-fornecedor-input') as HTMLInputElement;
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
      });
    }

    this.container.querySelector('#btn-novo-fornecedor')?.addEventListener('click', () => {
      this.abrirModalNovoFornecedor();
    });

    this.container.querySelectorAll('.btn-editar-fornecedor').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fornId = btn.getAttribute('data-forn-id');
        const forn = this.fornecedores.find(f => f.id === fornId);
        if (forn) this.abrirModalEditarFornecedor(forn);
      });
    });

    this.container.querySelectorAll('.btn-excluir-fornecedor').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fornId = btn.getAttribute('data-forn-id');
        const nome = btn.getAttribute('data-nome') || 'Fornecedor';
        if (fornId) await this.excluirFornecedor(fornId, nome);
      });
    });

    // Cliques nos dias do Calendário de Fluxo de Caixa
    this.container.querySelectorAll('.btn-detalhes-dia-cal').forEach(btn => {
      btn.addEventListener('click', () => {
        const diaStr = btn.getAttribute('data-cal-dia');
        if (!diaStr) return;
        this.abrirModalDetalhesDia(Number(diaStr));
      });
    });
  }

  // ==========================================================================
  // MODAL DE DETALHES DOS TÍTULOS DO DIA DO CALENDÁRIO
  // ==========================================================================
  private abrirModalDetalhesDia(diaNum: number): void {
    const mesAtivo = this.filtros.mes || (new Date().getMonth() + 1);
    const anoAtivo = this.filtros.ano || new Date().getFullYear();
    const cal = FinContasPagarService.calcularCalendarioMensal(this.contas, mesAtivo, anoAtivo);
    const diaObj = cal.dias.find(d => d.dia === diaNum);

    if (!diaObj || diaObj.qtdTitulos === 0) {
      return;
    }

    const formatarMoeda = (val: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity';

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-scale-in max-h-[85vh] flex flex-col">
        <!-- Topo do Modal -->
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl ${diaObj.ehDiaPico ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'} flex items-center justify-center text-lg font-black shrink-0">
              ${diaObj.dia}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Vencimentos do Dia ${diaObj.dia} (${diaObj.diaSemanaLabel})</h3>
                ${diaObj.ehDiaPico ? `
                  <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white tracking-wider">
                    ⚡ Pico de Caixa
                  </span>
                ` : ''}
              </div>
              <p class="text-xs text-slate-400 font-semibold">${diaObj.qtdTitulos} ${diaObj.qtdTitulos === 1 ? 'título previsto' : 'títulos previstos'} • Total: <strong class="text-indigo-600 dark:text-indigo-400">${formatarMoeda(diaObj.totalNominal)}</strong></p>
            </div>
          </div>
          <button id="btn-fechar-modal-dia" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer">✕</button>
        </div>

        <!-- Lista de Títulos do Dia -->
        <div class="overflow-y-auto custom-scrollbar flex-1 space-y-2 pr-1">
          ${diaObj.titulos.map(t => {
            const ehPago = t.status === 'pago';
            const ehAtrasado = t.status === 'atrasado';

            return `
              <div class="p-3.5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">${t.favorecido}</span>
                    <span class="text-[9px] uppercase font-black px-1.5 py-0.2 rounded ${
                      ehPago 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                        : ehAtrasado 
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 animate-pulse' 
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                    }">
                      ${t.status}
                    </span>
                  </div>
                  <span class="text-[11px] text-slate-500 dark:text-slate-400 block truncate">${t.descricao || 'Despesa'} • <strong class="text-slate-600 dark:text-slate-300">${t.categoria?.nome || 'Geral'}</strong></span>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <div class="text-right">
                    <span class="text-xs font-black text-slate-900 dark:text-slate-100 block">${formatarMoeda(t.valor_nominal)}</span>
                    ${ehPago && t.valor_pago ? `
                      <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Pago: ${formatarMoeda(t.valor_pago)}</span>
                    ` : ''}
                  </div>

                  ${!ehPago && t.status !== 'cancelado' ? `
                    <button data-conta-id="${t.id}" class="btn-baixar-do-calendario px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer">
                      Baixar
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Rodapé do Modal -->
        <div class="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button id="btn-fechar-modal-dia-footer" class="h-[42px] px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer">
            Fechar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.querySelector('#btn-fechar-modal-dia')?.addEventListener('click', fechar);
    overlay.querySelector('#btn-fechar-modal-dia-footer')?.addEventListener('click', fechar);

    // Ouvinte para dar baixa diretamente a partir do modal do dia
    overlay.querySelectorAll('.btn-baixar-do-calendario').forEach(btn => {
      btn.addEventListener('click', () => {
        const contaId = btn.getAttribute('data-conta-id');
        const c = diaObj.titulos.find(x => x.id === contaId);
        if (c) {
          fechar();
          this.abrirModalBaixa(c);
        }
      });
    });
  }

  // ==========================================================================
  // MODAL DE FILTROS AVANÇADOS - CONTAS A PAGAR
  // ==========================================================================
  private abrirModalFiltrosAvancados(): void {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity';

    let tipoDataFiltro: 'vencimento' | 'pagamento' = this.filtros.tipoDataFiltro || 'vencimento';
    let naturezaLancamento = this.filtros.naturezaLancamento || 'todos';

    const fmtMoedaInput = (v?: number) => {
      if (!v && v !== 0) return '';
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    };

    const bancosOptions = this.contasBancarias
      .filter(b => b.ativo !== false)
      .map(b => `
        <option value="${b.id}" ${this.filtros.contaBancariaId === b.id ? 'selected' : ''}>
          ${b.nome_banco}
        </option>
      `).join('');

    const formasPagamento = [
      { id: 'pix', label: 'Pix' },
      { id: 'boleto', label: 'Boleto Bancário' },
      { id: 'transferencia', label: 'Transferência TED/DOC' },
      { id: 'debito', label: 'Débito em Conta' },
      { id: 'cartao_corp', label: 'Cartão Corporativo' },
      { id: 'dinheiro', label: 'Dinheiro em Espécie' }
    ];

    const formasOptions = formasPagamento.map(f => `
      <option value="${f.id}" ${this.filtros.formaPagamento === f.id ? 'selected' : ''}>${f.label}</option>
    `).join('');

    const naturezas = [
      { id: 'todos', label: 'Todos' },
      { id: 'avulso', label: 'Avulsos' },
      { id: 'recorrente', label: 'Recorrentes' },
      { id: 'parcelado', label: 'Parcelados' },
      { id: 'remessa', label: 'Lotes de Remessa' },
      { id: 'estimado', label: 'Valores Estimados' }
    ];

    const naturezasHtml = naturezas.map(n => `
      <button type="button" data-natureza="${n.id}" class="adv-btn-nat px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
        naturezaLancamento === n.id
          ? 'bg-indigo-600 text-white shadow-xs'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }">
        ${n.label}
      </button>
    `).join('');

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[92vh] overflow-y-auto custom-scrollbar">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">⚡</span>
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Filtros Avançados</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Refine as despesas do Contas a Pagar por múltiplos critérios combinados</p>
            </div>
          </div>
          <button id="btn-fechar-modal-adv" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer">✕</button>
        </div>

        <form id="form-filtros-avancados" class="space-y-4">
          <!-- 1. Busca Geral -->
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              🔍 Busca Abrangente (Favorecido, Descrição ou Obs)
            </label>
            <input 
              type="text" 
              id="adv-busca-geral" 
              value="${this.filtros.buscaGeral || ''}" 
              placeholder="Ex: Fornecedor, NF 1234, taxa, aluguel, contrato..."
              class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <!-- 2. Período Personalizado com Chaveamento -->
          <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                📅 Intervalo de Datas
              </label>
              <!-- Switch Vencimento vs Pagamento -->
              <div class="inline-flex p-0.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-xl text-[11px] font-bold">
                <button 
                  type="button" 
                  id="adv-btn-tipo-vencimento" 
                  class="px-2.5 py-1 rounded-lg transition cursor-pointer ${tipoDataFiltro === 'vencimento' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-300'}">
                  Por Vencimento
                </button>
                <button 
                  type="button" 
                  id="adv-btn-tipo-pagamento" 
                  class="px-2.5 py-1 rounded-lg transition cursor-pointer ${tipoDataFiltro === 'pagamento' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-300'}">
                  Por Pagamento
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <span class="block text-[10px] font-bold text-slate-400 mb-1">Data Inicial</span>
                <input 
                  type="date" 
                  id="adv-data-inicio" 
                  value="${this.filtros.dataInicio || ''}" 
                  class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <span class="block text-[10px] font-bold text-slate-400 mb-1">Data Final</span>
                <input 
                  type="date" 
                  id="adv-data-fim" 
                  value="${this.filtros.dataFim || ''}" 
                  class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>

            <!-- Checkbox Ignorar Mês de Referência -->
            <label class="flex items-center gap-2 cursor-pointer pt-1">
              <input 
                type="checkbox" 
                id="adv-check-ignorar-mes" 
                ${this.filtros.ignorarMes ? 'checked' : ''} 
                class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300">
                Buscar em todo o histórico / ano <span class="text-[11px] font-normal text-slate-400">(ignora o filtro de mês da barra principal)</span>
              </span>
            </label>
          </div>

          <!-- 3. Conta Bancária e Forma de Pagamento -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                🏦 Conta Bancária de Saída
              </label>
              <select 
                id="adv-select-conta-bancaria" 
                class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Todas as contas bancárias</option>
                ${bancosOptions}
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                💳 Forma de Pagamento
              </label>
              <select 
                id="adv-select-forma-pagamento" 
                class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Todas as formas</option>
                ${formasOptions}
              </select>
            </div>
          </div>

          <!-- 4. Faixa de Valor Nominal -->
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              💰 Faixa de Valor Nominal (R$)
            </label>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <input 
                  type="text" 
                  id="adv-valor-min" 
                  placeholder="R$ Mínimo" 
                  value="${fmtMoedaInput(this.filtros.valorMin)}"
                  class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <input 
                  type="text" 
                  id="adv-valor-max" 
                  placeholder="R$ Máximo" 
                  value="${fmtMoedaInput(this.filtros.valorMax)}"
                  class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          <!-- 5. Natureza do Lançamento -->
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              🏷️ Natureza do Lançamento
            </label>
            <div class="flex flex-wrap gap-1.5">
              ${naturezasHtml}
            </div>
          </div>

          <!-- Rodapé de Ações -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              id="adv-btn-limpar" 
              class="w-full sm:w-auto px-4 h-[42px] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer">
              Limpar Filtros
            </button>

            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button 
                type="button" 
                id="adv-btn-cancelar" 
                class="px-4 h-[42px] rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer">
                Cancelar
              </button>
              <button 
                type="submit" 
                id="adv-btn-aplicar" 
                class="px-6 h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer">
                OK - Aplicar Filtros
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.querySelector('#btn-fechar-modal-adv')?.addEventListener('click', fechar);
    overlay.querySelector('#adv-btn-cancelar')?.addEventListener('click', fechar);

    // Anexa máscaras de moeda
    const inputMin = overlay.querySelector('#adv-valor-min') as HTMLInputElement;
    const inputMax = overlay.querySelector('#adv-valor-max') as HTMLInputElement;
    if (inputMin) attachCurrencyMask(inputMin);
    if (inputMax) attachCurrencyMask(inputMax);

    // Switch de tipo de data
    const btnVenc = overlay.querySelector('#adv-btn-tipo-vencimento') as HTMLButtonElement;
    const btnPag = overlay.querySelector('#adv-btn-tipo-pagamento') as HTMLButtonElement;
    btnVenc?.addEventListener('click', () => {
      tipoDataFiltro = 'vencimento';
      btnVenc.className = 'px-2.5 py-1 rounded-lg transition cursor-pointer bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs';
      btnPag.className = 'px-2.5 py-1 rounded-lg transition cursor-pointer text-slate-600 dark:text-slate-300';
    });
    btnPag?.addEventListener('click', () => {
      tipoDataFiltro = 'pagamento';
      btnPag.className = 'px-2.5 py-1 rounded-lg transition cursor-pointer bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs';
      btnVenc.className = 'px-2.5 py-1 rounded-lg transition cursor-pointer text-slate-600 dark:text-slate-300';
    });

    // Pills de Natureza do Lançamento
    overlay.querySelectorAll('.adv-btn-nat').forEach(btn => {
      btn.addEventListener('click', () => {
        const nat = btn.getAttribute('data-natureza') as any;
        if (!nat) return;
        naturezaLancamento = nat;
        overlay.querySelectorAll('.adv-btn-nat').forEach(b => {
          b.className = 'adv-btn-nat px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';
        });
        btn.className = 'adv-btn-nat px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer bg-indigo-600 text-white shadow-xs';
      });
    });

    // Botão Limpar Filtros do Modal
    overlay.querySelector('#adv-btn-limpar')?.addEventListener('click', async () => {
      this.filtros.buscaGeral = undefined;
      this.filtros.dataInicio = undefined;
      this.filtros.dataFim = undefined;
      this.filtros.tipoDataFiltro = undefined;
      this.filtros.contaBancariaId = undefined;
      this.filtros.formaPagamento = undefined;
      this.filtros.valorMin = undefined;
      this.filtros.valorMax = undefined;
      this.filtros.naturezaLancamento = 'todos';
      this.filtros.ignorarMes = false;
      this.filtros.periodoTipo = 'mes';
      fechar();
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
    });

    // Submissão do Formulário de Filtros Avançados
    const form = overlay.querySelector('#form-filtros-avancados') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputBusca = overlay.querySelector('#adv-busca-geral') as HTMLInputElement;
      const inputInicio = overlay.querySelector('#adv-data-inicio') as HTMLInputElement;
      const inputFim = overlay.querySelector('#adv-data-fim') as HTMLInputElement;
      const checkIgnorar = overlay.querySelector('#adv-check-ignorar-mes') as HTMLInputElement;
      const selectBanco = overlay.querySelector('#adv-select-conta-bancaria') as HTMLSelectElement;
      const selectForma = overlay.querySelector('#adv-select-forma-pagamento') as HTMLSelectElement;

      this.filtros.buscaGeral = inputBusca?.value.trim() || undefined;
      this.filtros.dataInicio = inputInicio?.value || undefined;
      this.filtros.dataFim = inputFim?.value || undefined;
      this.filtros.tipoDataFiltro = tipoDataFiltro;
      this.filtros.ignorarMes = checkIgnorar?.checked || false;

      if (this.filtros.dataInicio || this.filtros.dataFim) {
        this.filtros.periodoTipo = 'personalizado';
      }

      this.filtros.contaBancariaId = selectBanco?.value || undefined;
      this.filtros.formaPagamento = selectForma?.value || undefined;

      const vMinRaw = inputMin?.value ? parsePastedCurrency(inputMin.value) : 0;
      const vMaxRaw = inputMax?.value ? parsePastedCurrency(inputMax.value) : 0;
      this.filtros.valorMin = vMinRaw > 0 ? vMinRaw : undefined;
      this.filtros.valorMax = vMaxRaw > 0 ? vMaxRaw : undefined;

      this.filtros.naturezaLancamento = naturezaLancamento as any;

      fechar();
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
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
              ${this.contasBancarias.filter(b => b.ativo !== false).map(b => `<option value="${b.id}">${b.nome_banco}</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Juros / Multa (+)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                <input type="text" data-mask="currency" id="input-baixa-juros" value="0,00" class="w-full h-[42px] pl-9 pr-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Desconto (-)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                <input type="text" data-mask="currency" id="input-baixa-desconto" value="0,00" class="w-full h-[42px] pl-9 pr-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Valor Efetivamente Pago (R$) *</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-500">R$</span>
              <input type="text" data-mask="currency" id="input-baixa-valor-pago" required value="${(c.valor_nominal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}" class="w-full h-[42px] pl-9 pr-3 border-2 border-indigo-600/40 bg-white dark:bg-slate-800 rounded-xl text-sm font-black text-indigo-600 dark:text-indigo-400" />
            </div>
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

    // Anexa máscaras monetárias aos campos da baixa
    const jurosInput = overlay.querySelector('#input-baixa-juros') as HTMLInputElement;
    const descInput = overlay.querySelector('#input-baixa-desconto') as HTMLInputElement;
    const pagoInput = overlay.querySelector('#input-baixa-valor-pago') as HTMLInputElement;

    if (jurosInput) attachCurrencyMask(jurosInput);
    if (descInput) attachCurrencyMask(descInput);
    if (pagoInput) attachCurrencyMask(pagoInput);

    // Recálculo dinâmico do valor sugerido ao alterar juros ou desconto
    const recalcularSugerido = () => {
      const juros = parsePastedCurrency(jurosInput?.value || '0');
      const desc = parsePastedCurrency(descInput?.value || '0');
      const sugerido = Math.max(0, c.valor_nominal + juros - desc);
      if (pagoInput) {
        pagoInput.value = sugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    };

    jurosInput?.addEventListener('input', recalcularSugerido);
    descInput?.addEventListener('input', recalcularSugerido);

    const form = overlay.querySelector('#form-baixa') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = overlay.querySelector('#btn-confirmar-baixa') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processando...';

      const dataPagamento = (overlay.querySelector('#input-baixa-data') as HTMLInputElement).value;
      const formaPagamento = (overlay.querySelector('#select-baixa-forma') as HTMLSelectElement).value as any;
      const contaBancariaId = (overlay.querySelector('#select-baixa-banco') as HTMLSelectElement).value || undefined;
      const jurosMulta = parsePastedCurrency(jurosInput.value);
      const desconto = parsePastedCurrency(descInput.value);
      const valorPago = parsePastedCurrency(pagoInput.value);
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
        window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
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
    const tiposOrdenados = [...this.tiposCusto].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const categoriasOrdenadas = [...this.categorias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

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
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de Custo (A-Z) *</label>
              <select id="input-nova-tipo" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Selecione o tipo...</option>
                ${tiposOrdenados.map(t => `<option value="${t.id}">${t.nome}</option>`).join('')}
              </select>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400">Categoria (A-Z) *</label>
                <span class="text-[9px] text-indigo-500 font-extrabold uppercase">Filtro rápido</span>
              </div>
              <input type="text" id="busca-categoria-nova" placeholder="🔍 Filtrar categoria..." class="w-full h-[32px] px-2.5 mb-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <select id="input-nova-categoria" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Selecione a categoria...</option>
                ${categoriasOrdenadas.map(c => `<option value="${c.id}" data-tipo="${c.tipo_custo_id}">${c.nome}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400">Favorecido / Fornecedor *</label>
              <button type="button" id="btn-cadastrar-forn-rapido-nova" class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                <span>+</span> Cadastrar Favorecido
              </button>
            </div>
            <input type="text" id="input-nova-favorecido" list="datalist-fornecedores-nova" required placeholder="Nome da empresa ou prestador" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            <datalist id="datalist-fornecedores-nova">
              ${this.fornecedores.map(f => `<option value="${this.escapeHtml(f.nome)}">${f.cpf_cnpj ? `Doc: ${this.escapeHtml(f.cpf_cnpj)}` : ''}</option>`).join('')}
            </datalist>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Descrição do Título</label>
            <input type="text" id="input-nova-descricao" placeholder="Ex: Aluguel loja, fatura energia, honorários..." class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Valor Nominal (R$) *</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                <input type="text" data-mask="currency" id="input-nova-valor" required placeholder="0,00" value="0,00" class="w-full h-[42px] pl-9 pr-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-black text-slate-900 dark:text-slate-100" />
              </div>
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

    // Cadastro ágil de favorecido direto pelo modal
    overlay.querySelector('#btn-cadastrar-forn-rapido-nova')?.addEventListener('click', () => {
      const inputFav = overlay.querySelector('#input-nova-favorecido') as HTMLInputElement;
      this.abrirModalNovoFornecedor(inputFav?.value, (novoForn) => {
        if (inputFav) inputFav.value = novoForn.nome;
        const dl = overlay.querySelector('#datalist-fornecedores-nova');
        if (dl) {
          dl.innerHTML = this.fornecedores.map(f => `<option value="${this.escapeHtml(f.nome)}">${f.cpf_cnpj ? `Doc: ${this.escapeHtml(f.cpf_cnpj)}` : ''}</option>`).join('');
        }
      });
    });

    // Anexa máscara monetária brasileira em tempo real no valor nominal
    const inputValor = overlay.querySelector('#input-nova-valor') as HTMLInputElement;
    if (inputValor) attachCurrencyMask(inputValor);

    // Busca rápida e sincronização de categoria
    const buscaCatInput = overlay.querySelector('#busca-categoria-nova') as HTMLInputElement;
    const selectTipo = overlay.querySelector('#input-nova-tipo') as HTMLSelectElement;
    const selectCat = overlay.querySelector('#input-nova-categoria') as HTMLSelectElement;

    const filtrarCategorias = () => {
      const termo = (buscaCatInput?.value || '').toLowerCase().trim();
      const tipoId = selectTipo?.value;

      Array.from(selectCat.options).forEach((opt, idx) => {
        if (idx === 0) return; // Opção "Selecione..."
        const matchTipo = !tipoId || opt.getAttribute('data-tipo') === tipoId;
        const matchBusca = !termo || (opt.textContent || '').toLowerCase().includes(termo);
        opt.hidden = !(matchTipo && matchBusca);
      });
    };

    buscaCatInput?.addEventListener('input', filtrarCategorias);
    selectTipo?.addEventListener('change', () => {
      filtrarCategorias();
      const optAtual = selectCat.selectedOptions[0];
      if (optAtual && optAtual.hidden) {
        selectCat.value = '';
      }
    });

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
      const valorNominal = parsePastedCurrency(inputValor.value);
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
        window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
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
  // MODAL DE EDIÇÃO DE CONTA (COM SUPORTE A CASCATA RECORRENTE)
  // ==========================================================================
  private abrirModalEditarConta(contaId: string): void {
    const c = this.contas.find(x => x.id === contaId);
    if (!c) return;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity';

    const ehRecorrenteOuParcelado = Boolean(
      c.contrato_recorrente_id || 
      c.recorrente || 
      (c.parcela_total && c.parcela_total > 1)
    );

    const tiposOrdenados = [...this.tiposCusto].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const categoriasOrdenadas = [...this.categorias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const valorInicialFormatado = (c.valor_nominal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">✏️</span>
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Editar Título a Pagar</h3>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${c.favorecido} • Vencimento: ${c.data_vencimento.split('-').reverse().join('/')}</p>
            </div>
          </div>
          <button id="btn-fechar-modal-editar" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer">✕</button>
        </div>

        <form id="form-editar-conta" class="space-y-4">
          ${ehRecorrenteOuParcelado ? `
            <div class="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-sm">🔁</span>
                <span class="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Lançamento em Série / Recorrente Detectado</span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Este título faz parte de uma programação financeira recorrente. Selecione como deseja aplicar as alterações:
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 cursor-pointer hover:border-indigo-500 transition select-none shadow-xs">
                  <input type="radio" name="modo-cascata" value="apenas_esta" checked class="mt-0.5 accent-indigo-600 cursor-pointer" />
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>📌 Apenas este mês</span>
                    <span class="block text-[10px] font-normal text-slate-400 leading-tight">Altera exclusivamente o lançamento selecionado</span>
                  </div>
                </label>
                <label class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 cursor-pointer hover:border-indigo-500 transition select-none shadow-xs">
                  <input type="radio" name="modo-cascata" value="esta_e_futuras" class="mt-0.5 accent-indigo-600 cursor-pointer" />
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>🔄 Esta e futuras pendentes</span>
                    <span class="block text-[10px] font-normal text-slate-400 leading-tight">Propaga as alterações para as próximas parcelas</span>
                  </div>
                </label>
              </div>
            </div>
          ` : ''}

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de Custo (A-Z) *</label>
              <select id="input-edit-tipo" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Selecione o tipo...</option>
                ${tiposOrdenados.map(t => `<option value="${t.id}" ${t.id === c.tipo_custo_id ? 'selected' : ''}>${t.nome}</option>`).join('')}
              </select>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400">Categoria (A-Z) *</label>
                <span class="text-[9px] text-indigo-500 font-extrabold uppercase">Filtro rápido</span>
              </div>
              <input type="text" id="busca-categoria-edit" placeholder="🔍 Filtrar categoria..." class="w-full h-[32px] px-2.5 mb-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <select id="input-edit-categoria" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Selecione a categoria...</option>
                ${categoriasOrdenadas.map(cat => `<option value="${cat.id}" data-tipo="${cat.tipo_custo_id}" ${cat.id === c.categoria_id ? 'selected' : ''}>${cat.nome}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400">Favorecido / Fornecedor *</label>
              <button type="button" id="btn-cadastrar-forn-rapido-edit" class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                <span>+</span> Cadastrar Favorecido
              </button>
            </div>
            <input type="text" id="input-edit-favorecido" list="datalist-fornecedores-edit" required value="${this.escapeHtml(c.favorecido || '')}" placeholder="Nome da empresa ou prestador" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            <datalist id="datalist-fornecedores-edit">
              ${this.fornecedores.map(f => `<option value="${this.escapeHtml(f.nome)}">${f.cpf_cnpj ? `Doc: ${this.escapeHtml(f.cpf_cnpj)}` : ''}</option>`).join('')}
            </datalist>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Descrição do Título</label>
            <input type="text" id="input-edit-descricao" value="${c.descricao || ''}" placeholder="Ex: Aluguel loja, fatura energia..." class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Valor Nominal (R$) *</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                <input type="text" data-mask="currency" id="input-edit-valor" required value="${valorInicialFormatado}" class="w-full h-[42px] pl-9 pr-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-black text-slate-900 dark:text-slate-100" />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Vencimento Nominal *</label>
              <input type="date" id="input-edit-vencimento" required value="${c.data_vencimento || ''}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Forma de Pagamento</label>
              <select id="input-edit-forma" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="pix" ${c.forma_pagamento === 'pix' ? 'selected' : ''}>PIX</option>
                <option value="boleto" ${c.forma_pagamento === 'boleto' ? 'selected' : ''}>Boleto Bancário</option>
                <option value="transferencia" ${c.forma_pagamento === 'transferencia' ? 'selected' : ''}>Transferência (TED/DOC)</option>
                <option value="debito" ${c.forma_pagamento === 'debito' ? 'selected' : ''}>Débito em Conta</option>
                <option value="dinheiro" ${c.forma_pagamento === 'dinheiro' ? 'selected' : ''}>Dinheiro em Espécie</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Conta Bancária de Saída</label>
              <select id="input-edit-banco" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Não vinculada (definir na baixa)</option>
                ${this.contasBancarias.filter(b => b.ativo !== false || b.id === c.conta_bancaria_id).map(b => `<option value="${b.id}" ${b.id === c.conta_bancaria_id ? 'selected' : ''}>${b.nome_banco} (${b.tipo})${b.ativo === false ? ' [Inativo]' : ''}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <input type="checkbox" id="input-edit-estimado" ${c.valor_estimado && c.status !== 'pago' ? 'checked' : ''} ${c.status === 'pago' ? 'disabled' : ''} class="w-4 h-4 accent-indigo-600 rounded cursor-pointer ${c.status === 'pago' ? 'opacity-50 cursor-not-allowed' : ''}" />
            <label for="input-edit-estimado" class="text-xs font-bold text-slate-700 dark:text-slate-300 ${c.status === 'pago' ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer'}">
              Valor Estimado / Variável ${c.status === 'pago' ? '<span class="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">✓ Título já liquidado / realizado (não é mais estimado)</span>' : '<span class="text-[10px] text-slate-400 block font-normal">(Sinaliza que o montante final pode variar até o fechamento da fatura)</span>'}
            </label>
          </div>

          ${!ehRecorrenteOuParcelado ? `
            <div class="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>🔁</span> Repetição / Recorrência
                </span>
                <select id="select-edit-recorrencia" class="h-[36px] px-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200">
                  <option value="unica">Título Único / Esporádico</option>
                  <option value="recorrente">Tornar Mensal Recorrente (Até o fim do ano)</option>
                  <option value="parcelado">Tornar Parcelado (Quantidade fixa)</option>
                </select>
              </div>

              <div id="box-edit-parcelas" class="hidden">
                <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Quantidade Total de Parcelas</label>
                <input type="number" min="2" max="120" id="input-edit-qtd-parcelas" value="10" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold" />
              </div>
            </div>
          ` : ''}

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" id="btn-cancelar-modal-editar" class="h-[42px] px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" id="btn-salvar-modal-editar" class="h-[42px] px-5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = () => {
      overlay.remove();
    };

    overlay.querySelector('#btn-fechar-modal-editar')?.addEventListener('click', fechar);
    overlay.querySelector('#btn-cancelar-modal-editar')?.addEventListener('click', fechar);

    // Anexa máscara monetária no valor nominal
    const inputValor = overlay.querySelector('#input-edit-valor') as HTMLInputElement;
    if (inputValor) attachCurrencyMask(inputValor);

    // Busca rápida e sincronização de categoria na edição
    const buscaCatInput = overlay.querySelector('#busca-categoria-edit') as HTMLInputElement;
    const selectTipo = overlay.querySelector('#input-edit-tipo') as HTMLSelectElement;
    const selectCat = overlay.querySelector('#input-edit-categoria') as HTMLSelectElement;

    const filtrarCategoriasEdit = () => {
      const termo = (buscaCatInput?.value || '').toLowerCase().trim();
      const tipoId = selectTipo?.value;

      Array.from(selectCat.options).forEach((opt, idx) => {
        if (idx === 0) return; // Opção "Selecione..."
        const matchTipo = !tipoId || opt.getAttribute('data-tipo') === tipoId;
        const matchBusca = !termo || (opt.textContent || '').toLowerCase().includes(termo);
        opt.hidden = !(matchTipo && matchBusca);
      });
    };

    buscaCatInput?.addEventListener('input', filtrarCategoriasEdit);
    selectTipo?.addEventListener('change', () => {
      filtrarCategoriasEdit();
      const optAtual = selectCat.selectedOptions[0];
      if (optAtual && optAtual.hidden) {
        selectCat.value = '';
      }
    });

    const selectEditRec = overlay.querySelector('#select-edit-recorrencia') as HTMLSelectElement | null;
    const boxEditParcelas = overlay.querySelector('#box-edit-parcelas') as HTMLElement | null;
    selectEditRec?.addEventListener('change', () => {
      if (selectEditRec.value === 'parcelado') {
        boxEditParcelas?.classList.remove('hidden');
      } else {
        boxEditParcelas?.classList.add('hidden');
      }
    });

    // Cadastro ágil de favorecido direto pelo modal de edição
    overlay.querySelector('#btn-cadastrar-forn-rapido-edit')?.addEventListener('click', () => {
      const inputFav = overlay.querySelector('#input-edit-favorecido') as HTMLInputElement;
      this.abrirModalNovoFornecedor(inputFav?.value, (novoForn) => {
        if (inputFav) inputFav.value = novoForn.nome;
        const dl = overlay.querySelector('#datalist-fornecedores-edit');
        if (dl) {
          dl.innerHTML = this.fornecedores.map(f => `<option value="${this.escapeHtml(f.nome)}">${f.cpf_cnpj ? `Doc: ${this.escapeHtml(f.cpf_cnpj)}` : ''}</option>`).join('');
        }
      });
    });

    const form = overlay.querySelector('#form-editar-conta') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = overlay.querySelector('#btn-salvar-modal-editar') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';

      const tipoCustoId = (overlay.querySelector('#input-edit-tipo') as HTMLSelectElement).value;
      const categoriaId = selectCat.value;
      const categoriaNome = selectCat.selectedOptions[0]?.textContent || undefined;
      const favorecido = (overlay.querySelector('#input-edit-favorecido') as HTMLInputElement).value;
      const descricao = (overlay.querySelector('#input-edit-descricao') as HTMLInputElement).value;
      const valorNominal = parsePastedCurrency(inputValor.value);
      const dataVencimento = (overlay.querySelector('#input-edit-vencimento') as HTMLInputElement).value;
      const formaPagamento = (overlay.querySelector('#input-edit-forma') as HTMLSelectElement).value as any;
      const contaBancariaId = (overlay.querySelector('#input-edit-banco') as HTMLSelectElement).value || undefined;
      const valorEstimado = c.status === 'pago' ? false : (overlay.querySelector('#input-edit-estimado') as HTMLInputElement).checked;

      const modoCascata = (overlay.querySelector('input[name="modo-cascata"]:checked') as HTMLInputElement)?.value as 'apenas_esta' | 'esta_e_futuras' || 'apenas_esta';

      // Conversão de título avulso em recorrente/parcelado
      const editRecTipo = selectEditRec?.value || 'unica';
      const novoTipoLancamento: 'avulso' | 'recorrente' | 'parcelado' | undefined = 
        editRecTipo === 'recorrente' ? 'recorrente' : (editRecTipo === 'parcelado' ? 'parcelado' : undefined);
      const totalParcelas = editRecTipo === 'parcelado' ? Number((overlay.querySelector('#input-edit-qtd-parcelas') as HTMLInputElement)?.value || 2) : undefined;

      if (modoCascata === 'esta_e_futuras') {
        const confirmouCascata = await showCustomConfirm(
          'Deseja realmente atualizar ESTA e TODAS as próximas parcelas pendentes desta série recorrente? Essa ação atualizará valores e vencimentos futuros.',
          'Confirmar Edição em Cascata'
        );
        if (!confirmouCascata) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Salvar Alterações';
          return;
        }
      }

      const res = await FinContasPagarService.editarConta({
        contaId: c.id,
        modoCascata,
        tipoCustoId,
        categoriaId,
        categoriaNome,
        contaBancariaId,
        favorecido,
        descricao,
        valorNominal,
        valorEstimado,
        dataVencimento,
        formaPagamento,
        novoTipoLancamento,
        totalParcelas,
        usuarioId: this.user.id,
        usuarioNome: this.perfil?.nome
      });

      if (res.sucesso) {
        fechar();
        window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
        const msgSucesso = res.afetadas && res.afetadas > 1
          ? `${res.afetadas} títulos atualizados em cascata com sucesso!`
          : 'Título atualizado com sucesso!';
        await showCustomAlert(msgSucesso, 'Sucesso');
        await this.carregarDadosAbaAtiva();
        this.render();
        this.setupEventListeners();
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Alterações';
        await showCustomAlert(res.erro || 'Falha ao salvar alterações do título', 'Erro');
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

    const headers = ['Vencimento Nominal', 'Vencimento Operacional', 'Data Pagamento', 'Favorecido', 'Descrição', 'Tipo Custo', 'Categoria', 'Valor Nominal', 'Valor Pago', 'Status'];
    const rows = this.contas.map(c => [
      c.data_vencimento,
      c.data_vencimento_operacional || c.data_vencimento,
      c.data_pagamento || '',
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

    const nomesMesesAbrev = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const labelMeses = (this.filtros.meses && this.filtros.meses.length > 0)
      ? this.filtros.meses.slice().sort((a, b) => a - b).map(m => nomesMesesAbrev[m - 1]).join('_')
      : (nomesMesesAbrev[(this.filtros.mes || 1) - 1] || 'mes');

    link.setAttribute('download', `contas_a_pagar_${this.filtros.ano}_${labelMeses}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================================================
  // MODAL NOVA / EDITAR CATEGORIA (PLANO DE CONTAS)
  // ==========================================================================
  private abrirModalNovaCategoria(catParaEditar?: FinCategoria, tipoCustoIdSugerido?: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity';

    const isEdit = !!catParaEditar;
    const tipoSelecionado = catParaEditar?.tipo_custo_id || tipoCustoIdSugerido || (this.tiposCusto[0]?.id || '');

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">🏷️</span>
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                ${isEdit ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <p class="text-[11px] text-slate-400">Classificação contábil do Plano de Contas</p>
            </div>
          </div>
          <button id="btn-fechar-modal-cat" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer">✕</button>
        </div>

        <form id="form-nova-categoria" class="space-y-4">
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Grupo de Custo (Nível 1) *</label>
            <select id="input-cat-tipo-custo" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
              <option value="">Selecione o Grupo de Custo...</option>
              ${this.tiposCusto.map(t => `
                <option value="${t.id}" ${t.id === tipoSelecionado ? 'selected' : ''}>
                  ${t.codigo}. ${t.nome}
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Nome da Categoria (Nível 2) *</label>
            <input type="text" id="input-cat-nome" required placeholder="Ex: Energia Elétrica, Aluguel, Google Ads..." value="${catParaEditar?.nome || ''}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
          </div>

          ${!isEdit ? `
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Subcategoria Inicial (Opcional - Nível 3)</label>
              <input type="text" id="input-cat-subcategoria" placeholder="Ex: Matriz, Filial, Campanha Institucional..." class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200" />
            </div>
          ` : ''}

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" id="btn-cancelar-cat" class="h-[42px] px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" id="btn-salvar-cat" class="h-[42px] px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-2">
              <span>✓</span> ${isEdit ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = () => {
      overlay.remove();
    };

    overlay.querySelector('#btn-fechar-modal-cat')?.addEventListener('click', fechar);
    overlay.querySelector('#btn-cancelar-cat')?.addEventListener('click', fechar);

    const form = overlay.querySelector('#form-nova-categoria') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const tipoCustoId = (overlay.querySelector('#input-cat-tipo-custo') as HTMLSelectElement).value;
      const nome = (overlay.querySelector('#input-cat-nome') as HTMLInputElement).value.trim();
      const subcatInput = overlay.querySelector('#input-cat-subcategoria') as HTMLInputElement | null;
      const subcategoria = subcatInput?.value?.trim();

      if (!nome || !tipoCustoId) {
        await showCustomAlert('Por favor, preencha o grupo e o nome da categoria.', 'Atenção');
        return;
      }

      const btnSalvar = overlay.querySelector('#btn-salvar-cat') as HTMLButtonElement;
      if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Gravando...';
      }

      try {
        const res = await FinPlanoContasService.salvarCategoria(nome, tipoCustoId, catParaEditar?.id);
        if (!res.sucesso) {
          throw new Error(res.erro || 'Falha ao salvar categoria no banco');
        }

        if (subcategoria && res.id) {
          await FinPlanoContasService.salvarSubcategoria(subcategoria, res.id);
        }

        fechar();
        window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
        await showCustomAlert(
          isEdit ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso no Plano de Contas!',
          'Sucesso'
        );

        this.categorias = await FinPlanoContasService.listarCategorias();
        this.render();
        await this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro ao salvar categoria:', err);
        await showCustomAlert(err.message || 'Erro ao persistir categoria.', 'Erro');
        if (btnSalvar) {
          btnSalvar.disabled = false;
          btnSalvar.textContent = isEdit ? 'Salvar Alterações' : 'Criar Categoria';
        }
      }
    });
  }

  // ==========================================================================
  // MODAL NOVA / EDITAR CONTA BANCÁRIA
  // ==========================================================================
  private abrirModalNovaContaBancaria(contaParaEditar?: FinContaBancaria): void {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity';

    const isEdit = !!contaParaEditar;

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">🏦</span>
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                ${isEdit ? 'Editar Conta Bancária' : 'Nova Conta Bancária / Caixa'}
              </h3>
              <p class="text-[11px] text-slate-400">Controle de saldos e conciliação bancária</p>
            </div>
          </div>
          <button id="btn-fechar-modal-banco" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer">✕</button>
        </div>

        <form id="form-nova-conta-bancaria" class="space-y-4">
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Nome do Banco ou Caixa *</label>
            <input type="text" id="input-banco-nome" required placeholder="Ex: Banco Itaú, Nubank PJ, Caixa Físico..." value="${contaParaEditar?.nome_banco || ''}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de Conta *</label>
              <select id="input-banco-tipo" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="corrente" ${contaParaEditar?.tipo === 'corrente' ? 'selected' : ''}>Conta Corrente</option>
                <option value="poupanca" ${contaParaEditar?.tipo === 'poupanca' ? 'selected' : ''}>Poupança / Aplicação</option>
                <option value="caixa" ${contaParaEditar?.tipo === 'caixa' ? 'selected' : ''}>Caixa Interno</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Saldo Inicial (R$)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                <input type="text" data-mask="currency" id="input-banco-saldo" placeholder="0,00" value="${(contaParaEditar?.saldo_inicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}" class="w-full h-[42px] pl-9 pr-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-black text-slate-900 dark:text-slate-100" />
              </div>
            </div>
          </div>

          <div class="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block">Conta Ativa para Pagamentos</span>
              <span class="text-[10px] text-slate-400 block">Se desmarcada, não aparece nas opções de baixa e pagamento</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" id="input-banco-ativo" ${contaParaEditar?.ativo !== false ? 'checked' : ''} class="sr-only peer">
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" id="btn-cancelar-banco" class="h-[42px] px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" id="btn-salvar-banco" class="h-[42px] px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-2">
              <span>✓</span> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Banco'}
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = () => {
      overlay.remove();
    };

    overlay.querySelector('#btn-fechar-modal-banco')?.addEventListener('click', fechar);
    overlay.querySelector('#btn-cancelar-banco')?.addEventListener('click', fechar);

    const inputSaldo = overlay.querySelector('#input-banco-saldo') as HTMLInputElement;
    if (inputSaldo) attachCurrencyMask(inputSaldo);

    const form = overlay.querySelector('#form-nova-conta-bancaria') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nomeBanco = (overlay.querySelector('#input-banco-nome') as HTMLInputElement).value.trim();
      const tipo = (overlay.querySelector('#input-banco-tipo') as HTMLSelectElement).value as any;
      const saldo = parsePastedCurrency(inputSaldo.value);
      const ativo = (overlay.querySelector('#input-banco-ativo') as HTMLInputElement).checked;

      if (!nomeBanco) {
        await showCustomAlert('Por favor, informe o nome do banco ou caixa.', 'Atenção');
        return;
      }

      const btnSalvar = overlay.querySelector('#btn-salvar-banco') as HTMLButtonElement;
      if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Gravando...';
      }

      try {
        const res = await FinPlanoContasService.salvarContaBancaria(nomeBanco, tipo, saldo, contaParaEditar?.id, ativo);
        if (!res.sucesso) {
          throw new Error(res.erro || 'Falha ao salvar conta bancária');
        }

        fechar();
        window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
        await showCustomAlert(
          isEdit ? 'Conta bancária atualizada com sucesso!' : 'Conta bancária cadastrada com sucesso!',
          'Sucesso'
        );

        this.contasBancarias = await FinPlanoContasService.listarContasBancarias(false);
        this.render();
        await this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro ao salvar conta bancária:', err);
        await showCustomAlert(err.message || 'Erro ao persistir conta bancária.', 'Erro');
        if (btnSalvar) {
          btnSalvar.disabled = false;
          btnSalvar.textContent = isEdit ? 'Salvar Alterações' : 'Cadastrar Banco';
        }
      }
    });
  }

  // ==========================================================================
  // MODAL DE CRIAÇÃO DE LOTE DE REMESSA (AGRUPAMENTO)
  // ==========================================================================
  private abrirModalCriarRemessa(contasIds?: string[]): void {
    const ids = contasIds && contasIds.length > 0 ? contasIds : Array.from(this.titulosSelecionados);
    const titulosAgrupamento = this.contas.filter(c => ids.includes(c.id));

    if (titulosAgrupamento.length === 0) {
      showCustomAlert('Nenhum título selecionado para agrupar em remessa.', 'Atenção');
      return;
    }

    const formatarMoeda = (val: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const totalCalculado = titulosAgrupamento.reduce((acc, c) => acc + Number(c.valor_nominal || 0), 0);
    const favorecidoPadrao = titulosAgrupamento[0]?.favorecido || '';
    const hojeStr = new Date().toISOString().split('T')[0];

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity';

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">📦</span>
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Criar Lote de Remessa Agrupada</h3>
              <p class="text-[11px] text-slate-400 font-medium">Consolidação de títulos avulsos para pagamento em lote</p>
            </div>
          </div>
          <button id="btn-fechar-modal-remessa" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer">✕</button>
        </div>

        <div class="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">Total do Lote Consolidado</span>
            <span class="text-xl font-black text-slate-900 dark:text-slate-100">${formatarMoeda(totalCalculado)}</span>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-600 text-white shadow-xs">
            ${titulosAgrupamento.length} título(s)
          </span>
        </div>

        <form id="form-criar-remessa" class="space-y-4">
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Favorecido / Nome Identificador do Lote *</label>
            <input type="text" id="remessa-favorecido" required value="${favorecidoPadrao}" placeholder="Ex: Fornecedor Central ou Lote Operacional 10/26" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200" />
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Data Prevista de Liquidação / Pagamento *</label>
            <input type="date" id="remessa-data-prevista" required value="${hojeStr}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200" />
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Instruções Bancárias / Observações (Opcional)</label>
            <textarea id="remessa-observacoes" rows="2" placeholder="Observações do lote, chave PIX agregada ou instruções para o financeiro..." class="w-full p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 resize-none"></textarea>
          </div>

          <!-- Resumo dos Títulos Inclusos -->
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Títulos Componentes do Lote:</label>
            <div class="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
              ${titulosAgrupamento.map(t => `
                <div class="flex items-center justify-between text-xs py-1 border-b border-slate-200/40 dark:border-slate-800/60 last:border-none">
                  <div class="truncate max-w-[280px]">
                    <span class="font-bold text-slate-800 dark:text-slate-200">${t.favorecido}</span>
                    <span class="text-[10px] text-slate-400 block">${t.descricao || 'Despesa'}</span>
                  </div>
                  <span class="font-black text-slate-900 dark:text-slate-100">${formatarMoeda(t.valor_nominal)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" id="btn-cancelar-modal-remessa" class="h-[42px] px-4 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" id="btn-confirmar-criar-remessa" class="h-[42px] px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-1.5">
              <span>✓</span> Concluir Agrupamento
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.querySelector('#btn-fechar-modal-remessa')?.addEventListener('click', fechar);
    overlay.querySelector('#btn-cancelar-modal-remessa')?.addEventListener('click', fechar);

    const form = overlay.querySelector('#form-criar-remessa') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = overlay.querySelector('#btn-confirmar-criar-remessa') as HTMLButtonElement;
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Agrupando...';
      }

      const favorecido = (overlay.querySelector('#remessa-favorecido') as HTMLInputElement).value;
      const dataPrevista = (overlay.querySelector('#remessa-data-prevista') as HTMLInputElement).value;
      const observacoes = (overlay.querySelector('#remessa-observacoes') as HTMLTextAreaElement).value;

      try {
        const res = await FinRemessasService.criarRemessa({
          favorecido,
          dataPrevista,
          contasIds: ids,
          observacoes,
          criadoPorId: this.user.id
        });

        if (!res.sucesso) {
          throw new Error(res.erro || 'Falha ao agrupar títulos em lote de remessa.');
        }

        fechar();
        this.titulosSelecionados.clear();
        this.filtroAgrupamento = 'todos';
        window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
        await showCustomAlert('Lote de remessa agrupado com sucesso!', 'Sucesso');

        await this.carregarDadosAbaAtiva();
        this.render();
        await this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro ao agrupar remessa:', err);
        await showCustomAlert(err.message || 'Erro ao processar criação da remessa.', 'Erro');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Concluir Agrupamento';
        }
      }
    });
  }

  private abrirModalBaixaRemessa(remessaId: string): void {
    const remessa = this.remessas.find(r => r.id === remessaId);
    if (!remessa) return;

    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const itensRemessa = this.contas.filter(c => c.remessa_id === remessaId);
    const totalRemessa = remessa.valor_total || itensRemessa.reduce((acc, c) => acc + (Number(c.valor_nominal) || 0), 0);
    const bancosAtivos = this.contasBancarias.filter(b => b.ativo !== false);
    const hoje = new Date().toISOString().split('T')[0];

    const backdrop = document.createElement('div');
    backdrop.id = 'modal-baixa-remessa-backdrop';
    backdrop.className = 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in';

    backdrop.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">📦</span>
            <div>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100">Baixar Pagamento do Lote</h3>
              <p class="text-xs text-slate-500 font-semibold">${esc(remessa.favorecido)} • ${itensRemessa.length} lançamento(s)</p>
            </div>
          </div>
          <button type="button" id="btn-fechar-modal-baixa-remessa" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 font-bold transition cursor-pointer">✕</button>
        </div>

        <form id="form-baixa-remessa" class="p-6 space-y-4">
          <div class="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-wider text-slate-500">Valor Total do Lote</span>
            <strong class="text-lg font-black text-emerald-600 dark:text-emerald-400">R$ ${totalRemessa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Conta Bancária / Caixa de Origem *</label>
            <select id="baixa-remessa-conta-bancaria" required class="w-full h-[42px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Selecione o banco de saída...</option>
              ${bancosAtivos.map(b => `<option value="${b.id}">${esc(b.nome_banco)} (${esc(b.tipo)})</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Forma de Pagamento *</label>
              <select id="baixa-remessa-forma-pagamento" required class="w-full h-[42px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="pix">PIX</option>
                <option value="transferencia">TED / Transferência</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="debito">Débito em Conta</option>
                <option value="dinheiro">Dinheiro / Espécie</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Data do Pagamento *</label>
              <input type="date" id="baixa-remessa-data" required value="${hoje}" class="w-full h-[42px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Comprovante de Quitação (URL ou Anexo)</label>
            <input type="text" id="baixa-remessa-comprovante" placeholder="Link do comprovante ou drive..." class="w-full h-[42px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Observações do Pagamento</label>
            <textarea id="baixa-remessa-obs" rows="2" placeholder="Informações adicionais do pagamento do lote..." class="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2.5">
            <button type="button" id="btn-cancelar-baixa-remessa" class="h-[42px] px-4 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">Cancelar</button>
            <button type="submit" id="btn-confirmar-baixa-remessa" class="h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer">Confirmar Baixa do Lote</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);

    const fechar = () => backdrop.remove();
    backdrop.querySelector('#btn-fechar-modal-baixa-remessa')?.addEventListener('click', fechar);
    backdrop.querySelector('#btn-cancelar-baixa-remessa')?.addEventListener('click', fechar);

    const form = backdrop.querySelector('#form-baixa-remessa') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bancoId = (document.getElementById('baixa-remessa-conta-bancaria') as HTMLSelectElement).value;
      const formaPag = (document.getElementById('baixa-remessa-forma-pagamento') as HTMLSelectElement).value;
      const dataPag = (document.getElementById('baixa-remessa-data') as HTMLInputElement).value;
      const comprovante = (document.getElementById('baixa-remessa-comprovante') as HTMLInputElement).value.trim();
      const obs = (document.getElementById('baixa-remessa-obs') as HTMLTextAreaElement).value.trim();

      if (!bancoId) {
        await showCustomAlert('Por favor, selecione a conta bancária de saída.', 'Atenção');
        return;
      }

      const btnSubmit = backdrop.querySelector('#btn-confirmar-baixa-remessa') as HTMLButtonElement;
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Baixando lote...';
      }

      try {
        const res = await FinRemessasService.baixarRemessaConsolidada({
          remessaId,
          contaBancariaId: bancoId,
          formaPagamento: formaPag as any,
          dataPagamento: dataPag,
          comprovanteUrl: comprovante || undefined,
          observacoes: obs || undefined,
          usuarioId: this.user.id,
          usuarioNome: this.perfil?.nome
        });

        if (!res.sucesso) {
          throw new Error(res.erro || 'Falha ao baixar remessa');
        }

        fechar();
        window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
        const qtdBaixada = itensRemessa.length;
        await showCustomAlert(`Lote baixado com sucesso! Todos os ${qtdBaixada} itens foram liquidados com o mesmo banco e forma de pagamento.`, 'Sucesso');
        await this.carregarDadosAbaAtiva();
        this.render();
        await this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro na baixa da remessa:', err);
        await showCustomAlert(err.message || 'Erro ao processar baixa consolidada da remessa.', 'Erro');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Confirmar Baixa do Lote';
        }
      }
    });
  }

  private async reverterLoteRemessa(remessaId: string): Promise<void> {
    const remessa = this.remessas.find(r => r.id === remessaId);
    if (!remessa) return;

    const itensRemessa = this.contas.filter(c => c.remessa_id === remessaId);
    const confirmou = await showCustomConfirm(
      `Deseja realmente reverter a baixa do Lote "${remessa.favorecido}"?\n\nEsta ação irá estornar o lote e TODOS os ${itensRemessa.length} lançamentos vinculados a ele, retornando seu status para Pendente e limpando os dados de pagamento.`,
      'Reverter Baixa do Lote',
      { isDestructive: true, confirmText: 'Sim, Reverter Lote', cancelText: 'Cancelar' }
    );

    if (!confirmou) return;

    try {
      const res = await FinRemessasService.reverterBaixaRemessa({
        remessaId,
        usuarioId: this.user.id,
        usuarioNome: this.perfil?.nome
      });

      if (!res.sucesso) {
        throw new Error(res.erro || 'Falha ao reverter remessa');
      }

      window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
      const qtdRev = itensRemessa.length;
      await showCustomAlert(`Lote revertido com sucesso! ${qtdRev} títulos retornaram para o status Pendente.`, 'Sucesso');
      await this.carregarDadosAbaAtiva();
      this.render();
      await this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro ao reverter remessa:', err);
      await showCustomAlert(err.message || 'Erro ao reverter baixa do lote.', 'Erro');
    }
  }

  private abrirModalNovoFornecedor(nomeInicial?: string, callback?: (forn: FinFornecedor) => void): void {
    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const backdrop = document.createElement('div');
    backdrop.id = 'modal-novo-fornecedor-backdrop';
    backdrop.className = 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in';

    backdrop.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">🏢</span>
            <div>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100">Novo Fornecedor / Favorecido</h3>
              <p class="text-xs text-slate-500 font-semibold">Cadastro ágil de parceiros e credores</p>
            </div>
          </div>
          <button type="button" id="btn-fechar-modal-fornecedor" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 font-bold transition cursor-pointer">✕</button>
        </div>

        <form id="form-novo-fornecedor" class="p-6 space-y-4">
          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Nome / Razão Social *</label>
            <input type="text" id="fornecedor-input-nome" required value="${esc(nomeInicial || '')}" placeholder="Ex: CVC Consolidadora, Hotel Copacabana..." class="w-full h-[42px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">CPF / CNPJ</label>
            <input type="text" id="fornecedor-input-documento" placeholder="00.000.000/0000-00 ou 000.000.000-00" class="w-full h-[42px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Observações / Chave PIX / Contato</label>
            <textarea id="fornecedor-input-obs" rows="2" placeholder="Dados bancários, contato financeiro, chave pix..." class="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2.5">
            <button type="button" id="btn-cancelar-fornecedor" class="h-[42px] px-4 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">Cancelar</button>
            <button type="submit" id="btn-salvar-fornecedor" class="h-[42px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer">Cadastrar Fornecedor</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);

    const fechar = () => backdrop.remove();
    backdrop.querySelector('#btn-fechar-modal-fornecedor')?.addEventListener('click', fechar);
    backdrop.querySelector('#btn-cancelar-fornecedor')?.addEventListener('click', fechar);

    const form = backdrop.querySelector('#form-novo-fornecedor') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = (document.getElementById('fornecedor-input-nome') as HTMLInputElement).value.trim();
      const documento = (document.getElementById('fornecedor-input-documento') as HTMLInputElement).value.trim();
      const obs = (document.getElementById('fornecedor-input-obs') as HTMLTextAreaElement).value.trim();

      if (!nome) {
        await showCustomAlert('Por favor, preencha o nome do fornecedor.', 'Atenção');
        return;
      }

      const btnSubmit = backdrop.querySelector('#btn-salvar-fornecedor') as HTMLButtonElement;
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Salvando...';
      }

      try {
        const { FinFornecedoresService } = await import('../services/finFornecedoresService');
        const res = await FinFornecedoresService.criarFornecedor({
          nome,
          cpf_cnpj: documento || undefined,
          observacoes: obs || undefined
        });

        if (!res.sucesso || !res.fornecedor) {
          throw new Error(res.erro || 'Falha ao cadastrar fornecedor.');
        }

        fechar();
        const novo = res.fornecedor;
        this.fornecedores.push(novo);
        this.fornecedores.sort((a, b) => a.nome.localeCompare(b.nome));

        if (callback) {
          callback(novo);
        } else {
          await showCustomAlert(`Fornecedor "${novo.nome}" cadastrado com sucesso!`, 'Sucesso');
          this.render();
          await this.setupEventListeners();
        }
      } catch (err: any) {
        console.error('Erro ao cadastrar fornecedor:', err);
        await showCustomAlert(err.message || 'Erro ao cadastrar fornecedor.', 'Erro');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Cadastrar Fornecedor';
        }
      }
    });
  }

  private abrirModalEditarFornecedor(forn: FinFornecedor): void {
    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const backdrop = document.createElement('div');
    backdrop.id = 'modal-editar-fornecedor-backdrop';
    backdrop.className = 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in';

    backdrop.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">✏️</span>
            <div>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100">Editar Fornecedor</h3>
              <p class="text-xs text-slate-500 font-semibold">${esc(forn.nome)}</p>
            </div>
          </div>
          <button type="button" id="btn-fechar-modal-editar-fornecedor" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 font-bold transition cursor-pointer">✕</button>
        </div>

        <form id="form-editar-fornecedor" class="p-6 space-y-4">
          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Nome / Razão Social *</label>
            <input type="text" id="fornecedor-edit-nome" required value="${esc(forn.nome)}" class="w-full h-[42px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">CPF / CNPJ</label>
            <input type="text" id="fornecedor-edit-documento" value="${esc(forn.cpf_cnpj || '')}" class="w-full h-[42px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Observações / Chave PIX</label>
            <textarea id="fornecedor-edit-obs" rows="2" class="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">${esc(forn.observacoes || '')}</textarea>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2.5">
            <button type="button" id="btn-cancelar-editar-fornecedor" class="h-[42px] px-4 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">Cancelar</button>
            <button type="submit" id="btn-salvar-editar-fornecedor" class="h-[42px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer">Salvar Alterações</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);

    const fechar = () => backdrop.remove();
    backdrop.querySelector('#btn-fechar-modal-editar-fornecedor')?.addEventListener('click', fechar);
    backdrop.querySelector('#btn-cancelar-editar-fornecedor')?.addEventListener('click', fechar);

    const form = backdrop.querySelector('#form-editar-fornecedor') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = (document.getElementById('fornecedor-edit-nome') as HTMLInputElement).value.trim();
      const documento = (document.getElementById('fornecedor-edit-documento') as HTMLInputElement).value.trim();
      const obs = (document.getElementById('fornecedor-edit-obs') as HTMLTextAreaElement).value.trim();

      if (!nome) {
        await showCustomAlert('Por favor, informe o nome do fornecedor.', 'Atenção');
        return;
      }

      try {
        const { FinFornecedoresService } = await import('../services/finFornecedoresService');
        const res = await FinFornecedoresService.atualizarFornecedor(forn.id, {
          nome,
          cpf_cnpj: documento || undefined,
          observacoes: obs || undefined
        });

        if (!res.sucesso || !res.fornecedor) {
          throw new Error(res.erro || 'Falha ao atualizar fornecedor.');
        }

        fechar();
        const atualizado = res.fornecedor;
        const idx = this.fornecedores.findIndex(f => f.id === forn.id);
        if (idx !== -1) {
          this.fornecedores[idx] = atualizado;
        }
        await showCustomAlert(`Fornecedor "${atualizado.nome}" atualizado com sucesso!`, 'Sucesso');
        this.render();
        await this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro ao atualizar fornecedor:', err);
        await showCustomAlert(err.message || 'Erro ao salvar alterações do fornecedor.', 'Erro');
      }
    });
  }

  private async excluirFornecedor(id: string, nome: string): Promise<void> {
    const confirmou = await showCustomConfirm(
      `Deseja realmente excluir o fornecedor "${nome}"?`,
      'Excluir Fornecedor',
      { isDestructive: true, confirmText: 'Excluir', cancelText: 'Cancelar' }
    );
    if (!confirmou) return;

    try {
      const { FinFornecedoresService } = await import('../services/finFornecedoresService');
      await FinFornecedoresService.excluirFornecedor(id);
      this.fornecedores = this.fornecedores.filter(f => f.id !== id);
      await showCustomAlert(`Fornecedor "${nome}" excluído com sucesso!`, 'Sucesso');
      this.render();
      await this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro ao excluir fornecedor:', err);
      await showCustomAlert(err.message || 'Erro ao excluir fornecedor.', 'Erro');
    }
  }
}
