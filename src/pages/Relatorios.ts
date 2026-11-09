import { supabase, getSessaoAtual } from '../services/supabase';
import { PerfilConsultor, MetaPeriodo, MetaFaixa, Orcamento } from '../types';
import { InboxService } from '../services/inboxService';
import { formatBrDateToIso, formatIsoDateToBr } from '../utils/masks';
import { obterProgressoNivel, BADGE_DEFINITIONS } from '../services/gamification';
import { EditTravelModal } from '../components/dashboard/EditTravelModal';
import { CommentsService } from '../services/comments';
import { ContatosEmbarqueService } from '../services/contatosEmbarqueService';
import { confirmUnsavedChanges } from '../components/common/UnsavedChangesModal';
import { ExtratoRecebimentosModal } from '../components/relatorios/ExtratoRecebimentosModal';
import { processarExtratoRecebimentos, calcularFaturamentoLucratividade } from '../controllers/relatoriosController';
import { MetasService } from '../services/metasService';
import { getAvatarSvg } from '../services/avatars';
import { VerNotasModal } from '../components/orcamentos/VerNotasModal';
import { OrcamentosService } from '../services/orcamentosService';
import { showCustomPrompt, showCustomAlert } from '../services/dialog';
import { ViagensDivisoesService } from '../services/viagensDivisoesService';
import { CampanhasService, FiltrosCampanha, ItemSegmentacaoCampanha, PresetCampanha } from '../services/campanhasService';
import { RelatoriosOperacoesView, RelatoriosOperacoesContext } from '../components/relatorios/operacoes/RelatoriosOperacoesView';
import { RelatoriosFinanceiroView, RelatoriosFinanceiroContext } from '../components/relatorios/financeiro/RelatoriosFinanceiroView';
import { RelatoriosComercialView, RelatoriosComercialContext } from '../components/relatorios/comercial/RelatoriosComercialView';
import { RelatoriosInteligenciaView, RelatoriosInteligenciaContext } from '../components/relatorios/inteligencia/RelatoriosInteligenciaView';
import { RelatoriosShellView, RelatorioTab } from '../components/relatorios/shell/RelatoriosShellView';

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .report-tab-active {
      background-color: rgba(79, 70, 229, 0.08) !important;
      color: rgb(79, 70, 229) !important;
      border-left: 4px solid rgb(79, 70, 229) !important;
    }
    .dark .report-tab-active {
      background-color: rgba(99, 102, 241, 0.15) !important;
      color: rgb(129, 140, 248) !important;
      border-left: 4px solid rgb(129, 140, 248) !important;
    }
    @media print {
      body * {
        visibility: hidden !important;
      }
      #page-content, #page-content * {
        visibility: visible !important;
      }
      #page-content {
        position: absolute;
        left: 0;
        top: 0;
        width: 100% !important;
        background: white !important;
        color: black !important;
      }
      .no-print, aside, header, .global-filters-bar, .report-tabs-bar {
        display: none !important;
      }
      .print-full-width {
        width: 100% !important;
        max-width: 100% !important;
        box-shadow: none !important;
        border: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export class RelatoriosPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private activeTab: RelatorioTab = 'desempenho';
  private metas: MetaPeriodo[] = [];
  private selectedMetaId: string = '';

  // Filtros da aba de Pesquisa de Satisfação
  private satisfacaoFiltroCategoria: 'todos' | 'promotores' | 'neutros' | 'detratores' | 'com_comentario' = 'todos';
  private satisfacaoBuscaTexto: string = '';

  // Estado e filtros da aba Campanhas & Segmentação
  private campanhasFiltros: FiltrosCampanha = {
    origem: 'todos',
    tipoVisao: 'oportunidade',
    tipoDestino: 'todos',
    destinoBusca: '',
    periodoMeses: 12,
    valorMinimo: undefined,
    valorMaximo: undefined,
    fornecedor: '',
    mesEmbarque: undefined,
    statusOrcamento: 'TODOS',
    classificacaoNps: 'todos',
    perfilPassageiro: 'todos',
    consultorId: 'TODOS',
    origemLead: 'TODOS'
  };
  private campanhasPresets: PresetCampanha[] = [];
  private feedbacksNps: any[] = [];

  // Controle de estado para grupos colapsáveis e recolhimento geral da barra lateral
  private menuLateralRecolhido: boolean = false;
  private collapsedGroups: { [key: string]: boolean } = {
    comercial: false,
    financeiro: false,
    operacional: false,
    equipe: false
  };
  
  // Data stores
  private orcamentos: any[] = [];
  private viagens: any[] = [];
  private clientes: any[] = [];
  private reembolsos: any[] = [];
  private alertas: any[] = [];
  private consultores: any[] = [];
  private locPagamentos: any[] = [];
  private locConferencias: any[] = [];
  private lembretes: any[] = [];
  private tiposProduto: any[] = [];
  private formasRecebimento: any[] = [];
  private consultoresBadges: any[] = [];
  
  // Filter states
  private dataInicio: string = '';
  private dataFim: string = '';
  private consultorIdFilter: string = 'todos';
  private filtroContatoEmbarque: 'todos' | 'feitos' | 'pendentes' = 'todos';
  private filtroFaturamentoProduto: string = 'todos';
  private filtroFaturamentoRav: 'todos' | 'com_rav' | 'sem_rav' = 'todos';
  
  private loading: boolean = false;
  private prazoReembolsoDias: number = 30;

  // Cache de competência temporal e controle de histórico em memória
  private dadosCarregadosInicio: string = '';
  private dadosCarregadosFim: string = '';
  private carregouHistoricoCompleto: boolean = false;

  /**
   * Verifica se o intervalo de datas solicitado já está coberto pelos dados atualmente em memória
   */
  public estaPeriodoEmCache(inicioIso: string, fimIso: string): boolean {
    if (this.carregouHistoricoCompleto) return true;
    if (!this.dadosCarregadosInicio || !this.dadosCarregadosFim) return false;
    return inicioIso >= this.dadosCarregadosInicio && fimIso <= this.dadosCarregadosFim;
  }

  /**
   * Retorna o período padrão para relatórios gerenciais e de fechamento:
   * Do dia 01 do mês corrente até a data atual.
   */
  public static obterPeriodoPadraoGeral(): { inicio: string; fim: string } {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return {
      inicio: `${ano}-${mes}-01`,
      fim: `${ano}-${mes}-${dia}`
    };
  }

  /**
   * Retorna o período padrão para o Relatório de Embarques:
   * Do dia atual até a quantidade de dias para frente (padrão: 30 dias).
   */
  public static obterPeriodoPadraoEmbarques(dias: number = 30): { inicio: string; fim: string } {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    const dFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias);
    const anoFim = dFim.getFullYear();
    const mesFim = String(dFim.getMonth() + 1).padStart(2, '0');
    const diaFim = String(dFim.getDate()).padStart(2, '0');

    return {
      inicio: `${ano}-${mes}-${dia}`,
      fim: `${anoFim}-${mesFim}-${diaFim}`
    };
  }

  constructor(container: HTMLElement) {
    this.container = container;
    
    // Set default date range contextual
    if (this.activeTab === 'embarques') {
      const p = RelatoriosPage.obterPeriodoPadraoEmbarques(30);
      this.dataInicio = p.inicio;
      this.dataFim = p.fim;
    } else {
      const p = RelatoriosPage.obterPeriodoPadraoGeral();
      this.dataInicio = p.inicio;
      this.dataFim = p.fim;
    }
  }

  /**
   * Initializes the Reports page: validates auth, loads database tables, and renders views.
   */
  public async init(initialTab?: string): Promise<void> {
    try {
      if (initialTab && typeof initialTab === 'string') {
        this.activeTab = initialTab as RelatorioTab;
        if (this.activeTab === 'embarques') {
          const p = RelatoriosPage.obterPeriodoPadraoEmbarques(30);
          this.dataInicio = p.inicio;
          this.dataFim = p.fim;
        }
      }
      this.loading = true;
      this.render();

      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }
      this.user = user;
      this.perfil = perfil;
      const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';

      // Restringe rigidamente o filtro padrão ao próprio consultor se não for admin
      if (!isAdmin) {
        this.consultorIdFilter = this.user.id;
      }

      await this.loadData();
      this.loading = false;
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro na inicialização da página de relatórios:', err);
      this.renderAuthError(`Erro interno ao carregar relatórios: ${err.message}`);
    }
  }

  public destroy(): void {
    const portal = document.getElementById('orcamento-modal-portal');
    if (portal) {
      portal.innerHTML = '';
    }
  }

  /**
   * Carrega os dados analíticos do Supabase em paralelo aplicando corte temporal e projeções otimizadas.
   * Evita transferir históricos acumulados de anos e desacopla requisições secundárias pesadas.
   */
  private async loadData(dataInicioParam?: string, dataFimParam?: string, forceReload: boolean = false, todoHistorico: boolean = false): Promise<void> {
    const inicioAlvo = dataInicioParam || this.dataInicio;
    const fimAlvo = dataFimParam || this.dataFim;

    if (!forceReload && !todoHistorico && inicioAlvo && fimAlvo && this.estaPeriodoEmCache(inicioAlvo, fimAlvo)) {
      return;
    }

    try {
      const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';

      // 0. Determinação da Janela de Competência no Banco de Dados
      let janelaInicio = '';
      let janelaFim = '';

      if (!todoHistorico) {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const inicioAnoCorrente = `${anoAtual}-01-01`;

        if (this.activeTab === 'embarques') {
          // Embarques: 7 dias para trás e até 120 dias para frente (ou dataFim informada)
          const dInicioEmb = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
          janelaInicio = inicioAlvo && inicioAlvo < dInicioEmb.toISOString().split('T')[0]
            ? inicioAlvo
            : dInicioEmb.toISOString().split('T')[0];

          const dFimEmb = new Date(hoje.getTime() + 120 * 24 * 60 * 60 * 1000);
          const dFimIso = dFimEmb.toISOString().split('T')[0];
          janelaFim = fimAlvo && fimAlvo > dFimIso ? fimAlvo : dFimIso;
        } else {
          // Relatórios gerais: Se o usuário selecionou algo anterior ao ano corrente, usa a data solicitada
          if (inicioAlvo && inicioAlvo < inicioAnoCorrente) {
            janelaInicio = inicioAlvo;
          } else {
            // Garante ao menos todo o ano corrente ou últimos 180 dias aquecidos no cache
            janelaInicio = inicioAnoCorrente;
          }

          if (fimAlvo) {
            // Folga de 30 dias para frente para considerar pacotes faturados com embarques futuros
            const dFimDate = new Date(fimAlvo + 'T00:00:00');
            dFimDate.setDate(dFimDate.getDate() + 30);
            janelaFim = dFimDate.toISOString().split('T')[0];
          }
        }

        this.dadosCarregadosInicio = janelaInicio;
        this.dadosCarregadosFim = janelaFim || '2099-12-31';
      } else {
        this.carregouHistoricoCompleto = true;
        this.dadosCarregadosInicio = '1970-01-01';
        this.dadosCarregadosFim = '2099-12-31';
      }

      // 1. Preparar consultas paralelas com projeções cirúrgicas e cortes temporais
      const pProfiles = isAdmin
        ? supabase.from('profiles').select('id, nome, email, role, avatar_url, ativo').order('nome')
        : Promise.resolve({ data: this.perfil ? [this.perfil] : [], error: null });

      const pSettings = supabase.from('global_settings').select('*');

      let orcQuery = supabase.from('orcamentos').select(`
        id,
        consultor_id,
        cliente_id,
        nome_cliente,
        contato,
        destino,
        data_viagem,
        temperatura,
        tags,
        status,
        sub_status,
        valor_proposta,
        contato_realizado,
        contato_realizado_em,
        contato_realizado_por,
        created_at,
        updated_at
      `);
      if (!isAdmin) {
        orcQuery = orcQuery.eq('consultor_id', this.user.id);
      }
      if (janelaInicio) {
        orcQuery = orcQuery.gte('created_at', janelaInicio);
      }
      const pOrcamentos = orcQuery;

      let cliQuery = supabase.from('clientes').select('id, nome, telefone, email, consultor_responsavel_id, created_at, classificacoes');
      if (!isAdmin) {
        cliQuery = cliQuery.eq('consultor_responsavel_id', this.user.id);
      }
      const pClientes = cliQuery;

      let reemQuery = supabase.from('reembolsos').select(`
        id,
        codigo_ref,
        status,
        status_tratativa,
        valor_solicitado,
        valor_aprovado,
        motivo_cancelamento,
        forma_devolucao,
        created_at,
        consultor_solicitante_id,
        viagem_id,
        produto_viagem_id,
        viagem:viagens (id, consultor_id, codigo_ref, destino),
        produto:produtos_viagem (id, tipo, fornecedor)
      `);
      if (janelaInicio) {
        reemQuery = reemQuery.gte('created_at', janelaInicio);
      }
      const pReembolsos = reemQuery;

      let pagQuery = supabase.from('loc_pagamentos').select('id, viagem_id, codigo_localizador, valor, status, data_pagamento, forma_pagamento, parcela_numero, created_at, formas_recebimento(*)');
      if (janelaInicio) {
        pagQuery = pagQuery.gte('created_at', janelaInicio);
      }
      const pPagamentos = pagQuery;

      let confQuery = supabase.from('loc_conferencias').select('id, viagem_id, loc_codigo, status, valor, created_at');
      if (janelaInicio) {
        confQuery = confQuery.gte('created_at', janelaInicio);
      }
      const pConferencias = confQuery;

      const pFormas = supabase.from('formas_recebimento').select('*');

      let badgeQuery = supabase.from('profiles_badges').select('*');
      if (!isAdmin) {
        badgeQuery = badgeQuery.eq('profile_id', this.user.id);
      }
      const pBadges = badgeQuery;

      let lembretesQuery = supabase.from('lembretes').select('*').eq('arquivado', false);
      if (!isAdmin) {
        lembretesQuery = lembretesQuery.eq('user_id', this.user.id);
      }
      const pLembretes = lembretesQuery;

      const pTipos = supabase.from('tipos_produto').select('id, nome, campos_adicionais').order('nome');

      const pMetas = MetasService.obterMetaPeriodos().catch(err => {
        console.warn('Erro defensivo ao carregar metas em RelatoriosPage:', err);
        return [];
      });

      const pNps = (async () => {
        try {
          let npsQuery = supabase.from('feedbacks_nps').select('*');
          if (janelaInicio) {
            npsQuery = npsQuery.gte('created_at', janelaInicio);
          }
          const res = await npsQuery;
          return res;
        } catch (errNps) {
          console.warn('Erro defensivo ao carregar feedbacks_nps em RelatoriosPage:', errNps);
          return { data: [], error: null };
        }
      })();

      const pPresets = CampanhasService.listarPresets().catch(err => {
        console.warn('Erro defensivo ao carregar presets de campanhas em RelatoriosPage:', err);
        return [];
      });

      const pDivisoes = supabase
        .from('viagens_divisoes')
        .select('viagem_id, consultor_id, percentual, percentual_rav, is_titular');

      const pViagens = (async () => {
        let viaQuery = supabase.from('viagens').select(`
          id,
          codigo_ref,
          codigo_localizador,
          consultor_id,
          cliente_id,
          data_ida,
          data_volta,
          data_financeiro,
          valor_total,
          status,
          observacoes,
          processo_conferido,
          destino,
          created_at,
          cliente:clientes (id, nome, telefone, email),
          reembolsos (id, status, valor_solicitado, valor_aprovado, created_at),
          produtos:produtos_viagem (id, viagem_id, tipo, valor_venda, taxa, comissao, fornecedor, markup, rav)
        `);

        if (janelaInicio) {
          viaQuery = viaQuery.or(`data_ida.gte.${janelaInicio},created_at.gte.${janelaInicio}`);
        }

        if (!isAdmin) {
          const parceiroViagemIds = await ViagensDivisoesService.obterViagensDivididasPorConsultor(this.user.id);
          if (parceiroViagemIds.length > 0) {
            viaQuery = viaQuery.or(`consultor_id.eq.${this.user.id},id.in.(${parceiroViagemIds.join(',')})`);
          } else {
            viaQuery = viaQuery.eq('consultor_id', this.user.id);
          }
        }
        return viaQuery;
      })();

      // Desacopla alertas: só executa a carga da Inbox em abas operacionais que utilizam alertas
      const precisaAlertas = ['prazos', 'posvenda'].includes(this.activeTab);
      const pAlertas = precisaAlertas
        ? InboxService.loadAndBuildAlerts(this.user, this.perfil, this.prazoReembolsoDias).catch(errA => {
            console.warn('Erro defensivo ao carregar alertas em RelatoriosPage:', errA);
            return [];
          })
        : Promise.resolve(this.alertas.length > 0 ? this.alertas : []);

      // 2. Executar TODAS as consultas simultaneamente em paralelo via Promise.all!
      const [
        resProfiles,
        resSettings,
        resOrcamentos,
        resClientes,
        resReembolsos,
        resPagamentos,
        resConferencias,
        resFormas,
        resBadges,
        resLembretes,
        resTipos,
        resMetas,
        resNps,
        resPresets,
        resDivisoes,
        resViagens,
        resAlertas
      ] = await Promise.all([
        pProfiles,
        pSettings,
        pOrcamentos,
        pClientes,
        pReembolsos,
        pPagamentos,
        pConferencias,
        pFormas,
        pBadges,
        pLembretes,
        pTipos,
        pMetas,
        pNps,
        pPresets,
        pDivisoes,
        pViagens,
        pAlertas
      ]);

      // 3. Processar resultados
      this.consultores = resProfiles.data || (this.perfil ? [this.perfil] : []);

      if (resSettings.data && resSettings.data.length > 0) {
        this.prazoReembolsoDias = resSettings.data[0].prazoReembolsoDias || 30;
      }

      // Fail-Fast: Se qualquer consulta essencial falhar, propaga o erro de forma transparente
      if (resViagens?.error) throw new Error(`Falha ao carregar viagens: ${resViagens.error.message || resViagens.error}`);
      if (resOrcamentos?.error) throw new Error(`Falha ao carregar orçamentos: ${resOrcamentos.error.message || resOrcamentos.error}`);
      if (resClientes?.error) throw new Error(`Falha ao carregar clientes: ${resClientes.error.message || resClientes.error}`);
      if (resReembolsos?.error) throw new Error(`Falha ao carregar reembolsos: ${resReembolsos.error.message || resReembolsos.error}`);

      this.orcamentos = resOrcamentos.data || [];
      this.clientes = resClientes.data || [];

      // Mapear divisões
      const divisoesMap = new Map<string, any[]>();
      if (resDivisoes && resDivisoes.data) {
        resDivisoes.data.forEach((row: any) => {
          const arr = divisoesMap.get(row.viagem_id) || [];
          arr.push(row);
          divisoesMap.set(row.viagem_id, arr);
        });
      }

      const rawViagens = resViagens.data || [];
      this.viagens = rawViagens.map((v: any) => ({
        ...v,
        divisoes: divisoesMap.get(v.id) || []
      }));

      const rawReem = resReembolsos.data || [];
      if (!isAdmin) {
        this.reembolsos = rawReem.filter((r: any) => r.viagem?.consultor_id === this.user.id || r.consultor_solicitante_id === this.user.id);
      } else {
        this.reembolsos = rawReem;
      }

      const travelIds = new Set(this.viagens.map((v: any) => v.id));
      const rawPags = resPagamentos.data || [];
      this.locPagamentos = isAdmin ? rawPags : rawPags.filter((p: any) => travelIds.has(p.viagem_id || p.viagemId));

      const rawConf = resConferencias.data || [];
      this.locConferencias = isAdmin ? rawConf : rawConf.filter((c: any) => travelIds.has(c.viagem_id || c.viagemId));

      this.formasRecebimento = resFormas.data || [];
      this.consultoresBadges = resBadges.data || [];
      this.lembretes = resLembretes.data || [];
      this.tiposProduto = resTipos.data || [];

      this.metas = Array.isArray(resMetas) ? resMetas : [];
      if (this.metas.length > 0 && (!this.selectedMetaId || !this.metas.some(m => m.id === this.selectedMetaId))) {
        const ativa = this.metas.find(m => MetasService.getStatusTemporal(m) === 'ativa');
        this.selectedMetaId = ativa ? ativa.id : this.metas[0].id;
      }

      this.feedbacksNps = resNps?.data || [];
      this.campanhasPresets = Array.isArray(resPresets) ? resPresets : [];
      this.alertas = Array.isArray(resAlertas) ? resAlertas : [];
    } catch (err: any) {
      console.error('Erro ao ler tabelas de relatórios no servidor:', err);
      this.viagens = [];
      this.orcamentos = [];
      this.clientes = [];
      this.reembolsos = [];
      this.locPagamentos = [];
      this.locConferencias = [];
      const msgErro = err?.message?.includes('42703') || err?.code === '42703'
        ? 'Erro de schema no banco de dados. Execute a migração pendente no Supabase.'
        : 'Erro de conexão ao carregar dados do servidor. Verifique a internet e tente novamente.';
      this.showToast(msgErro, 'error');
    }
  }

  /**
   * Filters database records locally based on date ranges and consultant filters
   */
  private getFilteredData() {
    const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
    const effectiveConsultorFilter = isAdmin ? this.consultorIdFilter : (this.user?.id || '');

    const start = new Date(this.dataInicio + 'T00:00:00');
    const end = new Date(this.dataFim + 'T23:59:59');

    // Helper to check date range (timezone-safe alfanumeric comparison)
    const inRange = (dateStr: string) => {
      if (!dateStr) return false;
      const cleanDate = dateStr.substring(0, 10);
      return cleanDate >= this.dataInicio && cleanDate <= this.dataFim;
    };

    // Helper to check consultant filter: Não-admin NUNCA vê dados de outros consultores
    const matchConsultant = (id: string) => {
      if (!isAdmin) {
        return id === effectiveConsultorFilter;
      }
      if (effectiveConsultorFilter === 'todos') return true;
      return id === effectiveConsultorFilter;
    };

    // Helper para viagens: reconhece consultor titular OU consultor parceiro com cota na viagem
    const matchViagemConsultant = (v: any) => {
      const cId = v.consultor_id || v.consultorId;
      if (!isAdmin) {
        return cId === effectiveConsultorFilter || ViagensDivisoesService.calcularParticipacaoConsultor(v, effectiveConsultorFilter) > 0;
      }
      if (effectiveConsultorFilter === 'todos') return true;
      return cId === effectiveConsultorFilter || ViagensDivisoesService.calcularParticipacaoConsultor(v, effectiveConsultorFilter) > 0;
    };

    const filteredViagens = this.viagens.filter(v => {
      // Para relatórios de faturamento e auditoria, a competência contábil de fechamento é estritamente data_financeiro
      const isAbaFinanceira = this.activeTab === 'faturamento' || this.activeTab === 'auditoria';
      const date = isAbaFinanceira
        ? (v.data_financeiro || v.dataFinanceiro)
        : (v.data_financeiro || v.dataFinanceiro || v.data_ida || v.dataIda);
      return inRange(date) && matchViagemConsultant(v);
    });
    const travelIds = new Set(filteredViagens.map(v => v.id));

    return {
      orcamentos: this.orcamentos.filter(o => inRange(o.created_at || o.createdAt) && matchConsultant(o.consultor_id || o.consultorId)),
      viagens: filteredViagens,
      reembolsos: this.reembolsos.filter(r => {
        const date = r.created_at || r.createdAt;
        const consultorId = r.viagem?.consultor_id || r.consultor_solicitante_id || r.consultorSolicitanteId;
        return inRange(date) && matchConsultant(consultorId);
      }),
      alertas: this.alertas.filter(a => {
        const date = a.createdAt || a.eventDate;
        return inRange(date) && matchConsultant(a.consultorId);
      }),
      locPagamentos: this.locPagamentos.filter(p => travelIds.has(p.viagem_id || p.viagemId)),
      locConferencias: this.locConferencias.filter(c => travelIds.has(c.viagem_id || c.viagemId)),
      formasRecebimento: this.formasRecebimento,
      consultoresBadges: this.consultoresBadges
    };
  }

  /**
   * Renders the basic scaffold of the page.
   */
  private render(): void {
    if (this.loading) {
      this.container.innerHTML = `
        <div class="flex-grow flex items-center justify-center p-12 h-screen">
          <div class="text-center space-y-4">
            <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">Compilando relatórios e análises preditivas...</p>
          </div>
        </div>
      `;
      return;
    }

    const data = this.getFilteredData();
    const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
    const contentHtml = this.renderActiveTabContent(data);

    this.container.innerHTML = RelatoriosShellView.renderShell({
      activeTab: this.activeTab,
      menuLateralRecolhido: this.menuLateralRecolhido,
      collapsedGroups: this.collapsedGroups,
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      consultorIdFilter: this.consultorIdFilter,
      consultores: this.consultores,
      isAdmin,
      perfilNome: this.perfil?.nome,
      contentHtml
    });
  }

  private getOperacoesContext(): RelatoriosOperacoesContext {
    const self = this;
    return {
      user: this.user,
      perfil: this.perfil,
      consultores: this.consultores,
      viagens: this.viagens,
      clientes: this.clientes,
      orcamentos: this.orcamentos,
      lembretes: this.lembretes,
      feedbacksNps: this.feedbacksNps,
      tiposProduto: this.tiposProduto,
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      get consultorIdFilter() {
        return self.consultorIdFilter;
      },
      set consultorIdFilter(val: string) {
        self.consultorIdFilter = val;
      },
      get filtroContatoEmbarque() {
        return self.filtroContatoEmbarque;
      },
      set filtroContatoEmbarque(val: 'todos' | 'feitos' | 'pendentes') {
        self.filtroContatoEmbarque = val;
      },
      get satisfacaoFiltroCategoria() {
        return self.satisfacaoFiltroCategoria;
      },
      set satisfacaoFiltroCategoria(val: 'todos' | 'promotores' | 'neutros' | 'detratores' | 'com_comentario') {
        self.satisfacaoFiltroCategoria = val;
      },
      get satisfacaoBuscaTexto() {
        return self.satisfacaoBuscaTexto;
      },
      set satisfacaoBuscaTexto(val: string) {
        self.satisfacaoBuscaTexto = val;
      },
      showToast: (msg: string, type?: 'success' | 'error', err?: any) => this.showToast(msg, type, err),
      openTravelModal: async (tripId: string) => {
        const modal = new EditTravelModal({
          perfil: this.perfil,
          consultores: this.consultores,
          tiposProduto: this.tiposProduto,
          viagens: this.viagens,
          isFallbackMode: false,
          user: this.user,
          onUpdate: async () => {
            await this.loadData();
            this.render();
            this.setupEventListeners();
          },
          showToast: (msg: string, type: any) => this.showToast(msg, type),
          checkSLA: () => ({ alert: false, type: null, text: '' })
        });
        await modal.open(tripId, 'detalhes');
      },
      openCommentsModal: (tipo: 'viagem' | 'produto', entityId: string, tripId: string, titulo: string, label: string) => {
        CommentsService.openCommentsModal(
          tipo,
          entityId,
          tripId,
          titulo,
          label,
          this.user?.id || '',
          this.consultores,
          async () => {
            await this.loadData();
            this.render();
            this.setupEventListeners();
          }
        );
      },
      onRefreshData: async () => {
        await this.loadData();
      },
      onStateChange: () => {
        const container = document.getElementById('report-view-container');
        if (container) {
          container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
          this.setupEventListeners();
        }
      },
      exportToCSV: () => {
        this.exportToCSV();
      },
      onAlterarPeriodo: (dias: number) => {
        const periodo = RelatoriosPage.obterPeriodoPadraoEmbarques(dias);
        this.dataInicio = periodo.inicio;
        this.dataFim = periodo.fim;

        // Sincroniza bidirecionalmente os campos de input da barra global superior
        const inputInicio = document.getElementById('filter-data-inicio') as HTMLInputElement;
        const inputFim = document.getElementById('filter-data-fim') as HTMLInputElement;
        if (inputInicio) inputInicio.value = formatIsoDateToBr(this.dataInicio);
        if (inputFim) inputFim.value = formatIsoDateToBr(this.dataFim);

        const container = document.getElementById('report-view-container');
        if (container) {
          container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
          this.setupEventListeners();
        }
      }
    };
  }

  private getFinanceiroContext(): RelatoriosFinanceiroContext {
    const self = this;
    return {
      viagens: this.viagens,
      orcamentos: this.orcamentos,
      consultores: this.consultores,
      clientes: this.clientes,
      formasRecebimento: this.formasRecebimento,
      tiposProduto: this.tiposProduto,
      perfil: this.perfil,
      user: this.user,
      get filtroFaturamentoProduto() {
        return self.filtroFaturamentoProduto;
      },
      set filtroFaturamentoProduto(val: string) {
        self.filtroFaturamentoProduto = val;
      },
      get filtroFaturamentoRav() {
        return self.filtroFaturamentoRav;
      },
      set filtroFaturamentoRav(val: 'todos' | 'com_rav' | 'sem_rav') {
        self.filtroFaturamentoRav = val;
      },
      activeTab: this.activeTab,
      consultorIdFilter: this.consultorIdFilter,
      showToast: (m, t, err) => this.showToast(m, t, err),
      onStateChange: () => {
        const container = document.getElementById('report-view-container');
        if (container) {
          container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
          this.setupEventListeners();
        }
      },
      abrirModalOrcamento: (orcId: string) => {
        this.abrirModalOrcamento(orcId);
      },
      getFilteredData: () => this.getFilteredData(),
      loadData: async () => {
        await this.loadData();
      },
      render: () => {
        this.render();
      },
      setupEventListeners: () => {
        this.setupEventListeners();
      }
    };
  }

  private getComercialContext(): RelatoriosComercialContext {
    const self = this;
    return {
      viagens: this.viagens,
      orcamentos: this.orcamentos,
      consultores: this.consultores,
      clientes: this.clientes,
      reembolsos: this.reembolsos,
      locPagamentos: this.locPagamentos,
      metas: this.metas,
      feedbacksNps: this.feedbacksNps,
      campanhasPresets: this.campanhasPresets,
      get campanhasFiltros() {
        return self.campanhasFiltros;
      },
      set campanhasFiltros(val: FiltrosCampanha) {
        self.campanhasFiltros = { ...val };
      },
      get selectedMetaId() {
        return self.selectedMetaId;
      },
      set selectedMetaId(val: string | null) {
        self.selectedMetaId = val || '';
      },
      get consultorIdFilter() {
        return self.consultorIdFilter;
      },
      set consultorIdFilter(val: string) {
        self.consultorIdFilter = val;
      },
      perfil: this.perfil,
      user: this.user,
      activeTab: this.activeTab,
      showToast: (m, t, err) => this.showToast(m, t, err),
      onStateChange: () => {
        const container = document.getElementById('report-view-container');
        if (container) {
          container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
          this.setupEventListeners();
        }
      },
      exportToCSV: () => {
        this.exportToCSV();
      },
      getFilteredData: () => this.getFilteredData()
    };
  }

  private getInteligenciaContext(): RelatoriosInteligenciaContext {
    return {
      orcamentos: this.orcamentos,
      viagens: this.viagens,
      clientes: this.clientes,
      consultores: this.consultores,
      consultoresBadges: this.consultoresBadges,
      locPagamentos: this.locPagamentos,
      locConferencias: this.locConferencias,
      tiposProduto: this.tiposProduto,
      perfil: this.perfil,
      user: this.user,
      activeTab: this.activeTab,
      consultorIdFilter: this.consultorIdFilter,
      prazoReembolsoDias: this.prazoReembolsoDias,
      showToast: (m, t, err) => this.showToast(m, t, err),
      abrirModalOrcamento: (id: string) => this.abrirModalOrcamento(id),
      loadData: async () => {
        await this.loadData();
      },
      onStateChange: () => {
        const container = document.getElementById('report-view-container');
        if (container) {
          container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
          this.setupEventListeners();
        }
      }
    };
  }

  /**
   * Router/Switch for displaying active sub-report view
   */
  private renderActiveTabContent(data: any): string {
    switch (this.activeTab) {
      case 'desempenho':
        return RelatoriosComercialView.renderDesempenho(data, this.getComercialContext());
      case 'prazos':
        return RelatoriosOperacoesView.renderPrazos(data);
      case 'faturamento':
        return RelatoriosFinanceiroView.renderFaturamento(data, this.getFinanceiroContext());
      case 'perdas':
        return RelatoriosFinanceiroView.renderPerdas(data, this.getFinanceiroContext());
      case 'previsoes':
        return RelatoriosInteligenciaView.renderPrevisoes(data, this.getInteligenciaContext());
      case 'origens':
        return RelatoriosInteligenciaView.renderOrigens(data, this.getInteligenciaContext());
      case 'auditoria':
        return RelatoriosFinanceiroView.renderAuditoria(data, this.getFinanceiroContext());
      case 'posvenda':
        return RelatoriosOperacoesView.renderPosVenda(data, this.getOperacoesContext());
      case 'satisfacao':
        return RelatoriosOperacoesView.renderSatisfacao(data, this.getOperacoesContext());
      case 'embarques':
        return RelatoriosOperacoesView.renderEmbarques(data, this.getOperacoesContext());
      case 'gamificacao':
        return RelatoriosInteligenciaView.renderGamificacao(data, this.getInteligenciaContext());
      case 'metas_campanhas':
        return RelatoriosComercialView.renderMetasCampanhas(data, this.getComercialContext());
      case 'segmentacao_campanhas': {
        const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
        const effectiveConsultorFilter = isAdmin ? this.consultorIdFilter : (this.user?.id || '');
        const matchViagemConsultant = (v: any) => {
          const cId = v.consultor_id || v.consultorId;
          if (!isAdmin) {
            return cId === effectiveConsultorFilter || ViagensDivisoesService.calcularParticipacaoConsultor(v, effectiveConsultorFilter) > 0;
          }
          if (effectiveConsultorFilter === 'todos') return true;
          return cId === effectiveConsultorFilter || ViagensDivisoesService.calcularParticipacaoConsultor(v, effectiveConsultorFilter) > 0;
        };
        const matchConsultant = (id: string) => {
          if (!isAdmin) return id === effectiveConsultorFilter;
          if (effectiveConsultorFilter === 'todos') return true;
          return id === effectiveConsultorFilter;
        };
        const dataCampanhas = {
          ...data,
          viagens: this.viagens.filter(v => matchViagemConsultant(v)),
          orcamentos: this.orcamentos.filter(o => matchConsultant(o.consultor_id || o.consultorId))
        };
        return RelatoriosComercialView.renderSegmentacaoCampanhas(dataCampanhas, this.getComercialContext());
      }
      case 'riscopreditivo':
        return RelatoriosInteligenciaView.renderRiscoPreditivo(data, this.getInteligenciaContext());
      default:
        return '';
    }
  }

  private setupEventListeners(): void {
    RelatoriosShellView.attachShellEvents(this.container, {
      onToggleMenuLateral: () => {
        this.menuLateralRecolhido = !this.menuLateralRecolhido;
        this.render();
        this.setupEventListeners();
      },
      onToggleGroup: (group: string) => {
        if (group in this.collapsedGroups) {
          this.collapsedGroups[group] = !this.collapsedGroups[group];
          this.render();
          this.setupEventListeners();
        }
      },
      onSelectTab: async (tab: RelatorioTab) => {
        const previousTab = this.activeTab;
        this.activeTab = tab;
        this.menuLateralRecolhido = true;

        // Comportamento contextual inteligente para o filtro de datas global
        if (tab === 'embarques') {
          const periodo = RelatoriosPage.obterPeriodoPadraoEmbarques(30);
          this.dataInicio = periodo.inicio;
          this.dataFim = periodo.fim;
        } else if (previousTab === 'embarques') {
          const periodo = RelatoriosPage.obterPeriodoPadraoGeral();
          this.dataInicio = periodo.inicio;
          this.dataFim = periodo.fim;
        }

        // Se a nova aba não estiver coberta pelo cache (ex: embarques futuros), busca janela
        if (!this.estaPeriodoEmCache(this.dataInicio, this.dataFim)) {
          this.loading = true;
          this.render();
          await this.loadData(this.dataInicio, this.dataFim);
          this.loading = false;
        }

        // Se a aba necessitar de alertas e eles ainda não foram carregados, busca sob demanda
        if (['prazos', 'posvenda'].includes(tab) && this.alertas.length === 0) {
          InboxService.loadAndBuildAlerts(this.user, this.perfil, this.prazoReembolsoDias)
            .then(alertas => {
              this.alertas = alertas || [];
              const container = document.getElementById('report-view-container');
              if (container && ['prazos', 'posvenda'].includes(this.activeTab)) {
                container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
                this.setupEventListeners();
              }
            })
            .catch(err => console.warn('Erro defensivo ao carregar alertas sob demanda para relatórios:', err));
        }

        this.render();
        this.setupEventListeners();
      },
      onApplyFilters: async (dataInicioIso: string, dataFimIso: string, consultorId: string) => {
        const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';
        this.dataInicio = dataInicioIso;
        this.dataFim = dataFimIso;
        if (isAdmin && consultorId) {
          this.consultorIdFilter = consultorId;
        } else if (!isAdmin) {
          this.consultorIdFilter = this.user?.id || '';
        }

        // Se o período selecionado extrapolar o que já está em memória, carrega a janela sob demanda
        if (!this.estaPeriodoEmCache(dataInicioIso, dataFimIso)) {
          this.loading = true;
          this.render();
          await this.loadData(dataInicioIso, dataFimIso);
          this.loading = false;
        }

        this.render();
        this.setupEventListeners();
      },
      onClearFilters: async () => {
        const isAdmin = (this.perfil?.role || '').toLowerCase() === 'admin';

        if (this.activeTab === 'embarques') {
          const periodo = RelatoriosPage.obterPeriodoPadraoEmbarques(30);
          this.dataInicio = periodo.inicio;
          this.dataFim = periodo.fim;
          this.filtroContatoEmbarque = 'todos';
        } else {
          const periodo = RelatoriosPage.obterPeriodoPadraoGeral();
          this.dataInicio = periodo.inicio;
          this.dataFim = periodo.fim;
        }

        this.consultorIdFilter = isAdmin ? 'todos' : (this.user?.id || '');

        if (!this.estaPeriodoEmCache(this.dataInicio, this.dataFim)) {
          this.loading = true;
          this.render();
          await this.loadData(this.dataInicio, this.dataFim);
          this.loading = false;
        }
        
        this.render();
        this.setupEventListeners();
      },
      onExportCsv: () => {
        this.exportToCSV();
      },
      onPrintPdf: () => {
        window.print();
      }
    });

    // Ouvintes dos submódulos específicos por aba
    if (['faturamento', 'perdas', 'auditoria'].includes(this.activeTab)) {
      RelatoriosFinanceiroView.attachEvents(this.activeTab, this.getFinanceiroContext());
    }

    if (['embarques', 'satisfacao', 'prazos', 'posvenda'].includes(this.activeTab)) {
      RelatoriosOperacoesView.attachEvents(this.activeTab, this.getOperacoesContext());
    }

    if (['desempenho', 'metas_campanhas', 'segmentacao_campanhas'].includes(this.activeTab)) {
      RelatoriosComercialView.attachEvents(this.activeTab, this.getComercialContext());
    }

    if (['riscopreditivo', 'previsoes', 'origens', 'gamificacao'].includes(this.activeTab)) {
      RelatoriosInteligenciaView.attachEvents(this.activeTab, this.getInteligenciaContext());
    }
  }

  private showToast(message: string, type: 'success' | 'error' = 'success', err?: any): void {
    let finalMessage = message;
    if (err) {
      const translator = (window as any).traduzirErro;
      const translated = translator ? translator(err) : (err.message || err);
      if (translated && !message.includes(translated)) {
        finalMessage = `${message} Detalhes: ${translated}`;
      }
    }
    const toastId = 'paxflow-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
    }`;
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} <span>${finalMessage}</span>`;

    setTimeout(() => {
      toast!.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
    }, 4500);
  }

  /**
   * Generates a clean Excel-compatible CSV file containing viewed report rows
   */
  private exportToCSV(): void {
    const data = this.getFilteredData();
    let csvContent = '\uFEFF'; // UTF-8 BOM
    let filename = `relatorio-${this.activeTab}-${new Date().toISOString().slice(0,10)}.csv`;

    const operacoesCsv = RelatoriosOperacoesView.appendCsvContent(this.activeTab, data, this.getOperacoesContext());
    const financeiroCsv = RelatoriosFinanceiroView.appendCsvContent(this.activeTab, data, this.getFinanceiroContext());
    const comercialCsv = RelatoriosComercialView.appendCsvContent(this.activeTab, data, this.getComercialContext());
    const inteligenciaCsv = RelatoriosInteligenciaView.appendCsvContent(this.activeTab, data, this.getInteligenciaContext());

    if (operacoesCsv !== null) {
      csvContent += operacoesCsv;
    } else if (financeiroCsv !== null) {
      csvContent += financeiroCsv;
    } else if (comercialCsv !== null) {
      csvContent += comercialCsv;
    } else if (inteligenciaCsv !== null) {
      csvContent += inteligenciaCsv;
    }

    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public async abrirModalOrcamento(id: string): Promise<void> {
    let orc = this.orcamentos.find(o => o.id === id);

    if (!orc) {
      try {
        const { data: d } = await supabase
          .from('orcamentos')
          .select('*, cliente:clientes(*)')
          .eq('id', id)
          .maybeSingle();

        if (d) {
          orc = {
            id: d.id,
            consultorId: d.consultor_id || d.consultorId,
            clienteId: d.cliente_id || d.clienteId,
            cliente_id: d.cliente_id || d.clienteId,
            nomeCliente: d.nome_cliente || d.nomeCliente || d.cliente?.nome || 'Cliente',
            contato: d.contato || d.cliente?.telefone || d.cliente?.email || '',
            destino: d.destino || '',
            destino_id: d.destino_id || d.destinoId,
            destinoId: d.destino_id || d.destinoId,
            dataViagem: d.data_viagem || d.dataViagem || '',
            temperatura: d.temperatura || 'Frio',
            tags: d.tags || [],
            status: d.status || 'SOLICITADO',
            subStatus: d.sub_status || d.subStatus || '',
            notasNegociacao: d.notas_negociacao || d.notasNegociacao || '',
            valorProposta: d.valor_proposta !== undefined ? Number(d.valor_proposta) : (d.valorProposta !== undefined ? Number(d.valorProposta) : undefined),
            valorViagem: d.valor_viagem !== undefined ? Number(d.valor_viagem) : (d.valorViagem !== undefined ? Number(d.valorViagem) : undefined),
            origem: d.origem,
            codigoRef: d.codigo_ref || d.codigoRef,
            codigo_ref: d.codigo_ref || d.codigoRef,
            contatoRealizado: Boolean(d.contato_realizado || d.contatoRealizado),
            contato_realizado: Boolean(d.contato_realizado || d.contatoRealizado),
            contatoRealizadoEm: d.contato_realizado_em || d.contatoRealizadoEm,
            contato_realizado_em: d.contato_realizado_em || d.contatoRealizadoEm,
            contatoRealizadoPor: d.contato_realizado_por || d.contatoRealizadoPor,
            contato_realizado_por: d.contato_realizado_por || d.contatoRealizadoPor,
            contatoRealizadoPorNome: d.contato_realizado_por_profile?.nome,
            documentosUrl: d.documentos_url || d.documentosUrl || [],
            createdAt: d.created_at || d.createdAt,
            updatedAt: d.updated_at || d.updatedAt
          };
          this.orcamentos.push(orc);
        }
      } catch (e) {
        console.warn('Erro ao buscar orçamento por ID no banco:', e);
      }
    }

    if (!orc) {
      this.showToast('Orçamento não encontrado ou sem permissão de acesso.', 'error');
      return;
    }

    // Normalização completa dos campos de orcamento para garantir compatibilidade e resiliência total
    const orcNormalizado: Orcamento = {
      id: orc.id,
      consultorId: orc.consultorId || orc.consultor_id || this.user?.id || '',
      clienteId: orc.clienteId || orc.cliente_id || '',
      nomeCliente: orc.nomeCliente || orc.nome_cliente || orc.cliente?.nome || 'Cliente',
      contato: (typeof orc.contato === 'string' ? orc.contato : (orc.contato ? String(orc.contato) : '')) || orc.cliente?.telefone || orc.cliente?.email || '',
      destino: orc.destino || '',
      destino_id: orc.destino_id || orc.destinoId,
      destinoId: orc.destino_id || orc.destinoId,
      dataViagem: orc.dataViagem || orc.data_viagem || '',
      temperatura: orc.temperatura || 'Normal',
      tags: Array.isArray(orc.tags) ? orc.tags : (typeof orc.tags === 'string' ? ((orc.tags as string).startsWith('{') ? (orc.tags as string).slice(1, -1).split(',').filter(Boolean) : [orc.tags]) : []),
      status: orc.status || 'SOLICITADO',
      subStatus: orc.subStatus || orc.sub_status || '',
      notasNegociacao: orc.notasNegociacao || orc.notas_negociacao || '',
      valorProposta: orc.valorProposta !== undefined ? Number(orc.valorProposta) : (orc.valor_proposta !== undefined ? Number(orc.valor_proposta) : undefined),
      valorViagem: orc.valorViagem !== undefined ? Number(orc.valorViagem) : (orc.valor_viagem !== undefined ? Number(orc.valor_viagem) : undefined),
      origem: orc.origem,
      codigoRef: orc.codigoRef || orc.codigo_ref,
      codigo_ref: orc.codigoRef || orc.codigo_ref,
      contatoRealizado: Boolean(orc.contatoRealizado || orc.contato_realizado),
      contato_realizado: Boolean(orc.contatoRealizado || orc.contato_realizado),
      contatoRealizadoEm: orc.contatoRealizadoEm || orc.contato_realizado_em,
      contato_realizado_em: orc.contatoRealizadoEm || orc.contato_realizado_em,
      contatoRealizadoPor: orc.contatoRealizadoPor || orc.contato_realizado_por,
      contato_realizado_por: orc.contatoRealizadoPor || orc.contato_realizado_por,
      contatoRealizadoPorNome: orc.contatoRealizadoPorNome || orc.contato_realizado_por_profile?.nome,
      documentosUrl: Array.isArray(orc.documentosUrl) ? orc.documentosUrl : (Array.isArray(orc.documentos_url) ? orc.documentos_url : (typeof orc.documentosUrl === 'string' ? [orc.documentosUrl] : [])),
      createdAt: orc.createdAt || orc.created_at,
      updatedAt: orc.updatedAt || orc.updated_at
    };

    // Garante o portal de modais de orçamento no DOM
    let portal = document.getElementById('orcamento-modal-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'orcamento-modal-portal';
      document.body.appendChild(portal);
    }
    portal.innerHTML = '';

    portal.innerHTML = `
      <div id="modal-overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center opacity-0 pointer-events-auto transition-opacity duration-200">
        <div id="modal-content-container" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden transform scale-95 transition-all duration-200 flex flex-col max-h-[90vh] pointer-events-auto">
          <!-- Injetado dinamicamente -->
        </div>
      </div>
    `;

    const overlay = portal.querySelector('#modal-overlay') as HTMLElement | null;
    const content = portal.querySelector('#modal-content-container') as HTMLElement | null;

    setTimeout(() => {
      if (overlay && content) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        content.classList.remove('scale-95', 'pointer-events-none');
        content.classList.add('scale-100', 'pointer-events-auto');
      }
    }, 10);

    let escListener: ((e: KeyboardEvent) => void) | null = null;

    const fecharModalOrcamento = () => {
      if (escListener) {
        window.removeEventListener('keydown', escListener);
        escListener = null;
      }
      if (overlay && content) {
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        setTimeout(() => {
          if (portal) portal.innerHTML = '';
        }, 200);
      } else if (portal) {
        portal.innerHTML = '';
      }
    };

    // Fechar ao clicar no backdrop escuro
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        fecharModalOrcamento();
      }
    });

    // Fechar ao pressionar a tecla Escape
    escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fecharModalOrcamento();
      }
    };
    window.addEventListener('keydown', escListener);

    const consultoresAtivos = (this.consultores && this.consultores.length > 0)
      ? this.consultores
      : (this.perfil ? [this.perfil] : []);

    try {
      VerNotasModal.open(orcNormalizado, {
        user: this.user,
        perfil: this.perfil,
        consultores: consultoresAtivos,
        formatarDataBr: (dStr?: string) => formatIsoDateToBr(dStr || '') || dStr || '',
        calcularTempoAmigavel: (dataIso: string) => {
          if (!dataIso) return '';
          try {
            const diff = Date.now() - new Date(dataIso).getTime();
            if (isNaN(diff)) return '';
            const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
            if (dias === 0) return 'hoje';
            if (dias === 1) return 'há 1 dia';
            return `há ${dias} dias`;
          } catch {
            return '';
          }
        },
        closeModal: () => fecharModalOrcamento(),
        showToast: (msg, type) => this.showToast(msg, type),
        onUpdate: async (updatedOrc) => {
          try {
            const payload = {
              consultor_id: updatedOrc.consultorId,
              destino: updatedOrc.destino,
              destino_id: updatedOrc.destino_id || null,
              data_viagem: updatedOrc.dataViagem,
              temperatura: updatedOrc.temperatura,
              tags: updatedOrc.tags,
              status: updatedOrc.status,
              sub_status: updatedOrc.subStatus,
              notas_negociacao: updatedOrc.notasNegociacao,
              valor_proposta: updatedOrc.valorProposta,
              valor_viagem: updatedOrc.valorViagem,
              documentos_url: updatedOrc.documentosUrl,
              updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('orcamentos').update(payload).eq('id', updatedOrc.id);
            if (error) throw error;

            // Atualiza o registro em memória local
            const index = this.orcamentos.findIndex(o => o.id === updatedOrc.id);
            if (index >= 0) {
              this.orcamentos[index] = { ...this.orcamentos[index], ...payload, ...updatedOrc };
            }

            // Atualiza visualização da aba ativa se necessário
            const container = document.getElementById('report-view-container');
            if (container) {
              container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
              this.setupEventListeners();
            }

            this.showToast('Orçamento atualizado com sucesso!', 'success');
            return true;
          } catch (e: any) {
            console.error('Erro ao atualizar orçamento:', e);
            this.showToast('Erro ao salvar alterações no orçamento.', 'error');
            return false;
          }
        },
        onDelete: async (idToDelete) => {
          try {
            const { error } = await supabase.from('orcamentos').delete().eq('id', idToDelete);
            if (error) throw error;
            this.orcamentos = this.orcamentos.filter(o => o.id !== idToDelete);
            fecharModalOrcamento();

            const container = document.getElementById('report-view-container');
            if (container) {
              container.innerHTML = this.renderActiveTabContent(this.getFilteredData());
              this.setupEventListeners();
            }

            this.showToast('Orçamento excluído com sucesso!', 'success');
            return true;
          } catch (e: any) {
            console.error('Erro ao excluir orçamento:', e);
            this.showToast('Erro ao excluir orçamento.', 'error');
            return false;
          }
        }
      });
    } catch (modalErr) {
      console.error('Erro ao inicializar VerNotasModal em RelatoriosPage:', modalErr);
      fecharModalOrcamento();
      this.showToast('Não foi possível exibir o orçamento selecionado.', 'error');
    }
  }

  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="flex-grow flex items-center justify-center p-12">
        <div class="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl text-center">
          <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Falha de Autenticação</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-2 font-semibold">${msg}</p>
        </div>
      </div>
    `;
  }
}
export default RelatoriosPage;
