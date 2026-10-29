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
import { ConciliacaoPage } from './Conciliacao';

export type FinSubView = 'contas' | 'remessas' | 'fluxo' | 'conciliacao' | 'plano';

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

  public async init(extraId?: string): Promise<void> {
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
      'remessas': 'remessas',
      'remessas-agrupadas': 'remessas',
      'fluxo': 'fluxo',
      'fluxo-caixa': 'fluxo',
      'conciliacao': 'conciliacao',
      'plano': 'plano',
      'plano-contas': 'plano'
    };
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
        subtitulo: 'Controle de liquidez, despesas fixas recorrentes, parcelamentos e liquidações bancárias.',
        icone: '📋',
        helpId: 'fin-contas-pagar',
        breadcrumb: 'Contas a Pagar',
        botoesAcao: `
          <button id="btn-exportar-contas-csv" class="h-[42px] px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700">
            <span>📥</span> Exportar CSV
          </button>
          <button id="btn-nova-conta" class="h-[42px] px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-2">
            <span>+</span> Nova Despesa
          </button>
        `
      },
      remessas: {
        titulo: 'Remessas Agrupadas',
        subtitulo: 'Agrupamento de contas a pagar para autorização e liquidação conjunta via PIX/TED.',
        icone: '📦',
        helpId: 'fin-remessas',
        breadcrumb: 'Remessas Agrupadas',
        botoesAcao: `
          <button id="btn-nova-remessa" class="h-[42px] px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer flex items-center gap-2">
            <span>📦</span> Agrupar Nova Remessa
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
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between ${this.resumo.qtdAtrasadas > 0 ? 'ring-2 ring-rose-500/30' : ''}">
              <div class="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Títulos em Atraso</span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold ${this.resumo.qtdAtrasadas > 0 ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700'} whitespace-nowrap">
                  ${this.resumo.qtdAtrasadas} contas
                </span>
              </div>
              <div class="mt-3">
                <span class="block text-2xl sm:text-3xl font-black ${this.resumo.qtdAtrasadas > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'} tracking-tight">
                  ${formatarMoeda(this.resumo.totalAtrasadas)}
                </span>
                <span class="block text-[11px] text-slate-400 font-medium mt-1">${this.resumo.qtdAtrasadas > 0 ? 'Exige atenção financeira imediata' : 'Nenhuma conta em atraso'}</span>
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

        ${this.activeTab === 'remessas' ? `
          <!-- Cards de Indicadores de Remessas Agrupadas -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div class="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Lotes Pendentes</span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 whitespace-nowrap">
                  ${qtdRemessasAbertas} lotes
                </span>
              </div>
              <div class="mt-3">
                <span class="block text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  ${formatarMoeda(totalRemessasAbertas)}
                </span>
                <span class="block text-[11px] text-slate-400 font-medium mt-1">Aguardando liquidação conjunta</span>
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div class="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Total Liquidado</span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 whitespace-nowrap">
                  ${qtdRemessasPagas} pagas
                </span>
              </div>
              <div class="mt-3">
                <span class="block text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  ${formatarMoeda(totalRemessasPagas)}
                </span>
                <span class="block text-[11px] text-slate-400 font-medium mt-1">Remessas com baixa concluída</span>
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div class="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Média por Lote</span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40 whitespace-nowrap">
                  ${this.remessas.length} total
                </span>
              </div>
              <div class="mt-3">
                <span class="block text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  ${formatarMoeda(mediaPorRemessa)}
                </span>
                <span class="block text-[11px] text-slate-400 font-medium mt-1">Ticket médio das remessas consolidadas</span>
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
      case 'remessas':
        return this.renderAbaRemessas();
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

    const temFiltroAtivo = 
      this.filtros.status !== 'todos' || 
      Boolean(this.filtros.tipoCustoId) || 
      Boolean(this.filtros.categoriaId) || 
      Boolean(this.filtros.buscaFavorecido?.trim());

    const statusColors: Record<string, string> = {
      pendente: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40',
      pago: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40',
      atrasado: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/40 animate-pulse',
      cancelado: 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
    };

    const isAdmin = this.perfil?.role === 'admin';

    return `
      <div class="space-y-4">
        <!-- Barra de Filtros com Reset e Exportação -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Filtros & Busca</span>
              ${temFiltroAtivo ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">Filtros Ativos</span>
              ` : ''}
            </div>
            <div class="flex items-center gap-2">
              ${temFiltroAtivo ? `
                <button id="btn-limpar-filtros" class="h-[32px] px-2.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center gap-1">
                  ✕ Limpar Filtros
                </button>
              ` : ''}
              <button id="btn-exportar-csv-tabela" class="h-[32px] px-2.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1">
                📥 Exportar CSV
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
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

            <div class="col-span-2 sm:col-span-2 lg:col-span-1">
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Buscar Favorecido</label>
              <input id="filtro-busca" type="text" placeholder="Nome do fornecedor..." value="${this.filtros.buscaFavorecido || ''}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
            </div>
          </div>
        </div>

        <!-- 1. Visão Desktop: Tabela com Rolagem Defensiva (hidden md:block) -->
        <div class="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto custom-scrollbar scroll-indicator-fade w-full">
            <table class="w-full text-left border-collapse min-w-[900px]">
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
                  const ehEstimado = c.valor_estimado;
                  const parcelaLabel = (c.parcela_total && c.parcela_total > 1) ? `(${c.parcela_numero}/${c.parcela_total})` : '';

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

        <!-- 2. Visão Mobile: Lista de Cards de Pagamento Otimizados (block md:hidden) -->
        <div class="block md:hidden space-y-3">
          ${this.contas.length === 0 ? `
            <div class="p-8 text-center text-slate-400 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              Nenhuma conta localizada para o período e filtros selecionados.
            </div>
          ` : this.contas.map(c => {
            const ehEstimado = c.valor_estimado;
            const parcelaLabel = (c.parcela_total && c.parcela_total > 1) ? `(${c.parcela_numero}/${c.parcela_total})` : '';

            return `
              <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black text-slate-900 dark:text-slate-100">${formatarData(c.data_vencimento_operacional || c.data_vencimento)}</span>
                    ${c.data_vencimento_operacional && c.data_vencimento_operacional !== c.data_vencimento ? `
                      <span class="text-[9px] text-slate-400 font-semibold">(Nominal: ${formatarData(c.data_vencimento)})</span>
                    ` : ''}
                  </div>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusColors[c.status] || statusColors.pendente} uppercase">
                    ${c.status}
                  </span>
                </div>

                <div>
                  <span class="font-extrabold text-slate-900 dark:text-slate-100 text-sm block">${c.favorecido}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-0.5">${c.descricao || 'Despesa'} ${parcelaLabel}</span>
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      ${c.categoria?.nome || 'Geral'}
                    </span>
                    <span class="text-[10px] text-slate-400 font-semibold">• ${c.tipo_custo?.nome || 'Operacional'}</span>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Valor</span>
                    <div class="flex items-baseline gap-1">
                      <span class="text-base font-black text-slate-900 dark:text-slate-100">${formatarMoeda(c.valor_nominal)}</span>
                      ${ehEstimado ? `<span class="text-[9px] text-sky-600 font-bold uppercase">(Estimado)</span>` : ''}
                    </div>
                    ${c.valor_pago && c.valor_pago > 0 ? `
                      <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Pago: ${formatarMoeda(c.valor_pago)}</span>
                    ` : ''}
                  </div>

                  <div class="flex items-center gap-1.5">
                    ${c.status !== 'pago' && c.status !== 'cancelado' ? `
                      <button data-id="${c.id}" class="btn-baixar-conta h-[36px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1" title="Dar Baixa">
                        <span>✓</span> Baixar
                      </button>
                    ` : ''}

                    <button data-id="${c.id}" class="btn-editar-conta h-[36px] w-[36px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer" title="Editar">
                      ✏️
                    </button>

                    ${c.comprovante_url ? `
                      <a href="${c.comprovante_url}" target="_blank" class="h-[36px] w-[36px] flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl transition cursor-pointer" title="Comprovante">
                        📎
                      </a>
                    ` : ''}

                    ${c.status === 'pago' && isAdmin ? `
                      <button data-id="${c.id}" class="btn-estornar-conta h-[36px] w-[36px] flex items-center justify-center bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl transition cursor-pointer" title="Estornar Baixa">
                        ↩️
                      </button>
                    ` : ''}

                    ${c.status !== 'cancelado' && isAdmin ? `
                      <button data-id="${c.id}" class="btn-cancelar-conta h-[36px] w-[36px] flex items-center justify-center bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer" title="Cancelar Título">
                        🚫
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
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
        <!-- 1. Visão Desktop: Tabela de Remessas com Rolagem Defensiva -->
        <div class="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto custom-scrollbar scroll-indicator-fade w-full">
            <table class="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr class="text-[9px] uppercase tracking-widest font-black text-slate-400 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <th class="py-3 px-4 w-10 text-center"></th>
                  <th class="py-3 px-4">Favorecido Principal</th>
                  <th class="py-3 px-4">Data Prevista</th>
                  <th class="py-3 px-4 text-center">Qtd. Títulos</th>
                  <th class="py-3 px-4 text-right">Valor Consolidado</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4 w-36 text-center">Ações</th>
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
                      <td class="py-3 px-4 w-36 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                          ${rem.status !== 'paga' ? `
                            <button data-remessa-id="${rem.id}" class="btn-baixar-remessa px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition cursor-pointer">
                              Baixar
                            </button>
                            <button data-remessa-id="${rem.id}" class="btn-desagrupar-remessa px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 rounded-lg font-bold text-[10px] transition cursor-pointer" title="Desfazer lote e devolver contas">
                              Desfazer
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

        <!-- 2. Visão Mobile: Lista de Cartões de Remessas (block md:hidden) -->
        <div class="block md:hidden space-y-3">
          ${this.remessas.length === 0 ? `
            <div class="p-8 text-center text-slate-400 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              Nenhuma remessa agrupada encontrada. Clique em "+ Agrupar Nova Remessa" para consolidar pagamentos.
            </div>
          ` : this.remessas.map(rem => {
            const expandida = this.remessasExpandidas.has(rem.id);
            const itens = rem.itens || [];

            return `
              <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <span class="text-xs font-black text-slate-900 dark:text-slate-100">Previsto: ${formatarData(rem.data_prevista)}</span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${rem.status === 'paga' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                    ${rem.status}
                  </span>
                </div>

                <div>
                  <span class="font-extrabold text-slate-900 dark:text-slate-100 text-sm block">${rem.favorecido}</span>
                  ${rem.observacoes ? `<span class="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">${rem.observacoes}</span>` : ''}
                  <span class="text-[11px] text-slate-400 font-bold block mt-1">Lote com ${itens.length} título(s)</span>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Consolidado</span>
                    <span class="text-base font-black text-slate-900 dark:text-slate-100">${formatarMoeda(rem.valor_total)}</span>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <button data-remessa-id="${rem.id}" class="btn-toggle-accordion h-[36px] px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer">
                      ${expandida ? 'Fechar Itens' : 'Ver Itens'}
                    </button>

                    ${rem.status !== 'paga' ? `
                      <button data-remessa-id="${rem.id}" class="btn-baixar-remessa h-[36px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer">
                        Baixar
                      </button>
                      <button data-remessa-id="${rem.id}" class="btn-desagrupar-remessa h-[36px] px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 rounded-xl font-bold text-xs transition cursor-pointer" title="Desfazer lote">
                        Desfazer
                      </button>
                    ` : ''}
                  </div>
                </div>

                ${expandida ? `
                  <div class="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800 space-y-2 mt-2">
                    <span class="text-[10px] uppercase tracking-wider font-black text-indigo-600 dark:text-indigo-400 block">Títulos Deste Lote:</span>
                    ${itens.map(it => `
                      <div class="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 dark:border-slate-800/60 last:border-none">
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
                ` : ''}
              </div>
            `;
          }).join('')}
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
            <button id="btn-exportar-csv" class="h-[38px] px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5">
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
            <h3 class="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Contas Bancárias & Caixas</h3>
            <button id="btn-nova-conta-bancaria" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition cursor-pointer">
              + Adicionar Banco
            </button>
          </div>

          <div class="space-y-2">
            ${this.contasBancarias.length === 0 ? `
              <div class="p-4 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhuma conta bancária cadastrada. Clique em "+ Adicionar Banco".
              </div>
            ` : this.contasBancarias.map(b => `
              <div class="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <div class="flex items-center gap-3">
                  <span class="text-lg">🏦</span>
                  <div>
                    <span class="font-bold text-slate-800 dark:text-slate-100 text-xs block">${b.nome_banco}</span>
                    <span class="text-[10px] text-slate-400 uppercase font-semibold">${b.tipo}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black text-slate-900 dark:text-slate-100">
                    ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.saldo_inicial || 0)}
                  </span>
                  <button class="btn-editar-conta-bancaria text-slate-400 hover:text-indigo-600 cursor-pointer text-xs p-1" data-banco-id="${b.id}" title="Editar conta bancária">✏️</button>
                </div>
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

    // Botão Limpar Filtros
    this.container.querySelector('#btn-limpar-filtros')?.addEventListener('click', async () => {
      this.filtros.status = 'todos';
      this.filtros.tipoCustoId = undefined;
      this.filtros.categoriaId = undefined;
      this.filtros.buscaFavorecido = undefined;
      await this.carregarDadosAbaAtiva();
      this.render();
      this.setupEventListeners();
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

    this.container.querySelectorAll('.btn-baixar-remessa').forEach(btn => {
      btn.addEventListener('click', async () => {
        const remId = btn.getAttribute('data-remessa-id');
        if (!remId) return;
        const confirmou = await showCustomConfirm('Confirmar a liquidação / baixa consolidada de TODOS os títulos desta remessa?');
        if (confirmou) {
          const res = await FinRemessasService.baixarRemessaConsolidada({
            remessaId: remId,
            dataPagamento: new Date().toISOString().split('T')[0],
            usuarioId: this.user.id,
            usuarioNome: this.perfil?.nome
          });
          if (res.sucesso) {
            window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
            await showCustomAlert('Remessa liquidada com sucesso!', 'Sucesso');
            await this.carregarDadosAbaAtiva();
            this.render();
            this.setupEventListeners();
          } else {
            await showCustomAlert(res.erro || 'Falha ao liquidar remessa', 'Erro');
          }
        }
      });
    });

    // Botão Nova Conta / Despesa
    this.container.querySelector('#btn-nova-conta')?.addEventListener('click', () => {
      this.abrirModalNovaConta();
    });

    // Botão Nova Remessa
    this.container.querySelector('#btn-nova-remessa')?.addEventListener('click', () => {
      showCustomAlert('Para agrupar uma remessa, acesse Contas a Pagar e selecione os títulos que deseja consolidar.', 'Info');
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

    // Botão de adicionar categoria rápida direto no card do tipo de custo
    this.container.querySelectorAll('.btn-add-cat-tipo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tipoId = btn.getAttribute('data-tipo-id');
        this.abrirModalNovaCategoria(undefined, tipoId || undefined);
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
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de Custo *</label>
              <select id="input-edit-tipo" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Selecione o tipo...</option>
                ${this.tiposCusto.map(t => `<option value="${t.id}" ${t.id === c.tipo_custo_id ? 'selected' : ''}>${t.nome}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Categoria *</label>
              <select id="input-edit-categoria" required class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                <option value="">Selecione a categoria...</option>
                ${this.categorias.map(cat => `<option value="${cat.id}" data-tipo="${cat.tipo_custo_id}" ${cat.id === c.categoria_id ? 'selected' : ''}>${cat.nome}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Favorecido / Fornecedor *</label>
            <input type="text" id="input-edit-favorecido" required value="${c.favorecido || ''}" placeholder="Nome da empresa ou prestador" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200" />
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Descrição do Título</label>
            <input type="text" id="input-edit-descricao" value="${c.descricao || ''}" placeholder="Ex: Aluguel loja, fatura energia..." class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Valor Nominal (R$) *</label>
              <input type="number" step="0.01" min="0.01" id="input-edit-valor" required value="${c.valor_nominal || ''}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-black text-slate-900 dark:text-slate-100" />
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
                ${this.contasBancarias.map(b => `<option value="${b.id}" ${b.id === c.conta_bancaria_id ? 'selected' : ''}>${b.nome_banco} (${b.tipo})</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <input type="checkbox" id="input-edit-estimado" ${c.valor_estimado ? 'checked' : ''} class="w-4 h-4 accent-indigo-600 rounded cursor-pointer" />
            <label for="input-edit-estimado" class="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              Valor Estimado / Variável <span class="text-[10px] text-slate-400 block font-normal">(Sinaliza que o montante final pode variar até o fechamento da fatura)</span>
            </label>
          </div>

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

    const form = overlay.querySelector('#form-editar-conta') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = overlay.querySelector('#btn-salvar-modal-editar') as HTMLButtonElement;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';

      const tipoCustoId = (overlay.querySelector('#input-edit-tipo') as HTMLSelectElement).value;
      const selectCat = overlay.querySelector('#input-edit-categoria') as HTMLSelectElement;
      const categoriaId = selectCat.value;
      const categoriaNome = selectCat.selectedOptions[0]?.textContent || undefined;
      const favorecido = (overlay.querySelector('#input-edit-favorecido') as HTMLInputElement).value;
      const descricao = (overlay.querySelector('#input-edit-descricao') as HTMLInputElement).value;
      const valorNominal = Number((overlay.querySelector('#input-edit-valor') as HTMLInputElement).value);
      const dataVencimento = (overlay.querySelector('#input-edit-vencimento') as HTMLInputElement).value;
      const formaPagamento = (overlay.querySelector('#input-edit-forma') as HTMLSelectElement).value as any;
      const contaBancariaId = (overlay.querySelector('#input-edit-banco') as HTMLSelectElement).value || undefined;
      const valorEstimado = (overlay.querySelector('#input-edit-estimado') as HTMLInputElement).checked;

      const modoCascata = (overlay.querySelector('input[name="modo-cascata"]:checked') as HTMLInputElement)?.value as 'apenas_esta' | 'esta_e_futuras' || 'apenas_esta';

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
              <input type="number" step="0.01" id="input-banco-saldo" placeholder="0,00" value="${contaParaEditar?.saldo_inicial || 0}" class="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-black text-slate-900 dark:text-slate-100" />
            </div>
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

    const form = overlay.querySelector('#form-nova-conta-bancaria') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nomeBanco = (overlay.querySelector('#input-banco-nome') as HTMLInputElement).value.trim();
      const tipo = (overlay.querySelector('#input-banco-tipo') as HTMLSelectElement).value as any;
      const saldo = Number((overlay.querySelector('#input-banco-saldo') as HTMLInputElement).value) || 0;

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
        const res = await FinPlanoContasService.salvarContaBancaria(nomeBanco, tipo, saldo, contaParaEditar?.id);
        if (!res.sucesso) {
          throw new Error(res.erro || 'Falha ao salvar conta bancária');
        }

        fechar();
        window.dispatchEvent(new CustomEvent('paxflow-financeiro-updated'));
        await showCustomAlert(
          isEdit ? 'Conta bancária atualizada com sucesso!' : 'Conta bancária cadastrada com sucesso!',
          'Sucesso'
        );

        this.contasBancarias = await FinPlanoContasService.listarContasBancarias();
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
}
