import { PerfilConsultor, GlobalSettings } from '../../types';
import {
  DashboardFilterState,
  DashboardFilterContext,
  DashboardFilterBarHandlers
} from './DashboardFilterBar';
import { DashboardFilterEngine } from './DashboardFilterEngine';

export interface DashboardFilterStateConfig {
  user: any;
  perfil: PerfilConsultor | null;
  settings: GlobalSettings;
  consultores: PerfilConsultor[];
  formasRecebimento: any[];
  origensLead: any[];
  listaDestinosDisponiveis: any[];
  tiposProduto: any[];
  onStateChange: () => void;
  onNovaViagem: () => void;
  onExportCsv: () => void;
}

export class DashboardFilterStateManager {
  public viewModeMonth: 'current' | 'all' = 'current';
  public showFiltersPanel: boolean = false;
  public showConfPopover: boolean = false;
  public selectedConsultantId: string = 'todos';
  public confFilters = {
    finPendente: false,
    finOk: false,
    procPendente: false,
    procOk: false
  };
  public buscaTermo: string = '';
  public activeStatusTab: string = 'todos';

  public dataFinStart: string = '';
  public dataFinEnd: string = '';
  public dataIdaStart: string = '';
  public dataIdaEnd: string = '';
  public dataVoltaStart: string = '';
  public dataVoltaEnd: string = '';

  public advMesAno: string = '';
  public advProdutos: string[] = [];
  public advProdutoMatchMode: 'AND' | 'OR' = 'AND';
  public advDestinos: string[] = [];
  public advFornecedor: string = '';
  public advValorMin: number | null = null;
  public advValorMax: number | null = null;
  public advTarifaMin: number | null = null;
  public advTarifaMax: number | null = null;
  public advTaxaMin: number | null = null;
  public advTaxaMax: number | null = null;
  public advComissaoMin: number | null = null;
  public advComissaoMax: number | null = null;
  public advMarkupMin: number | null = null;
  public advMarkupMax: number | null = null;
  public advRavMin: number | null = null;
  public advRavMax: number | null = null;
  public advRentabilidadeMin: number | null = null;
  public advRentabilidadeMax: number | null = null;
  public advMarkupRav: 'todos' | 'com_markup' | 'com_rav' | 'com_markup_ou_rav' | 'com_markup_e_rav' | 'apenas_comissao' | 'sem_markup_rav' = 'todos';
  public advAnexos: 'todos' | 'com_anexo' | 'sem_anexo' | 'com_voucher' | 'sem_voucher' = 'todos';
  public advSla: 'todos' | 'com_alerta' | 'sem_alerta' = 'todos';
  public advRiskScore: string[] = [];
  public advConsultores: string[] = [];
  public advFormasRecebimento: string[] = [];
  public advOrigensLead: string[] = [];
  public advPaxFaixas: string[] = [];
  public advTags: string[] = [];

  private config: DashboardFilterStateConfig;

  constructor(config: DashboardFilterStateConfig) {
    this.config = config;
    try {
      const savedMode = localStorage.getItem('paxflow-view-mode-month');
      if (savedMode === 'all' || savedMode === 'current') {
        this.viewModeMonth = savedMode;
      }
    } catch (e) {}
  }

  public updateConfig(config: Partial<DashboardFilterStateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getState(): DashboardFilterState {
    return {
      viewModeMonth: this.viewModeMonth,
      showFiltersPanel: this.showFiltersPanel,
      showConfPopover: this.showConfPopover,
      selectedConsultantId: this.selectedConsultantId,
      confFilters: this.confFilters,
      activeStatusTab: this.activeStatusTab,
      buscaTermo: this.buscaTermo,
      dataFinStart: this.dataFinStart,
      dataFinEnd: this.dataFinEnd,
      dataIdaStart: this.dataIdaStart,
      dataIdaEnd: this.dataIdaEnd,
      dataVoltaStart: this.dataVoltaStart,
      dataVoltaEnd: this.dataVoltaEnd,
      advMesAno: this.advMesAno,
      advProdutos: this.advProdutos,
      advDestinos: this.advDestinos,
      advFornecedor: this.advFornecedor,
      advValorMin: this.advValorMin,
      advValorMax: this.advValorMax,
      advTarifaMin: this.advTarifaMin,
      advTarifaMax: this.advTarifaMax,
      advTaxaMin: this.advTaxaMin,
      advTaxaMax: this.advTaxaMax,
      advComissaoMin: this.advComissaoMin,
      advComissaoMax: this.advComissaoMax,
      advMarkupMin: this.advMarkupMin,
      advMarkupMax: this.advMarkupMax,
      advRavMin: this.advRavMin,
      advRavMax: this.advRavMax,
      advRentabilidadeMin: this.advRentabilidadeMin,
      advRentabilidadeMax: this.advRentabilidadeMax,
      advMarkupRav: this.advMarkupRav,
      advAnexos: this.advAnexos,
      advSla: this.advSla,
      advRiskScore: this.advRiskScore,
      advConsultores: this.advConsultores,
      advFormasRecebimento: this.advFormasRecebimento,
      advOrigensLead: this.advOrigensLead,
      advPaxFaixas: this.advPaxFaixas,
      advTags: this.advTags,
      advProdutoMatchMode: this.advProdutoMatchMode
    };
  }

  public getActiveFiltersCount(): number {
    let count = 0;
    if (this.dataFinStart || this.dataFinEnd) count++;
    if (this.dataIdaStart || this.dataIdaEnd) count++;
    if (this.dataVoltaStart || this.dataVoltaEnd) count++;
    if (this.advMesAno) count++;
    count += this.advProdutos.length;
    count += this.advDestinos.length;
    if (this.advFornecedor.trim()) count++;
    if (this.advValorMin !== null || this.advValorMax !== null) count++;
    if (this.advTarifaMin !== null || this.advTarifaMax !== null) count++;
    if (this.advTaxaMin !== null || this.advTaxaMax !== null) count++;
    if (this.advComissaoMin !== null || this.advComissaoMax !== null) count++;
    if (this.advMarkupMin !== null || this.advMarkupMax !== null) count++;
    if (this.advRavMin !== null || this.advRavMax !== null) count++;
    if (this.advRentabilidadeMin !== null || this.advRentabilidadeMax !== null) count++;
    if (this.advMarkupRav !== 'todos') count++;
    if (this.advAnexos !== 'todos') count++;
    if (this.advSla !== 'todos') count++;
    count += this.advRiskScore.length;
    count += this.advConsultores.length;
    count += this.advFormasRecebimento.length;
    count += this.advOrigensLead.length;
    count += this.advPaxFaixas.length;
    count += this.advTags.length;
    if (this.confFilters.finPendente) count++;
    if (this.confFilters.finOk) count++;
    if (this.confFilters.procPendente) count++;
    if (this.confFilters.procOk) count++;
    return count;
  }

  public getContext(
    viagens: any[],
    viagensFiltradas: any[],
    counts: any,
    totalSlaAlerts: number
  ): DashboardFilterContext {
    const tripDestSet = new Set<string>();
    viagens.forEach(v => {
      if (v.destino && typeof v.destino === 'string') tripDestSet.add(v.destino.trim());
    });
    this.config.listaDestinosDisponiveis.forEach(d => {
      if (d.nome) tripDestSet.add(`${d.nome}, ${d.pais}`.trim());
    });
    const destinosList = Array.from(tripDestSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const totalViagens = viagensFiltradas.length;
    let totalVendas = 0;
    let totalRentabilidade = 0;
    let totalMarkupAcumulado = 0;
    let totalRavAcumulado = 0;

    const consultorContextoId = DashboardFilterEngine.getConsultorContextoAtivoId(
      this.config.user,
      this.config.perfil,
      this.selectedConsultantId,
      this.advConsultores
    );

    viagensFiltradas.forEach(v => {
      const totals = DashboardFilterEngine.getTripFinancialTotals(v, consultorContextoId);
      totalVendas += totals.totalVenda;
      totalRentabilidade += totals.totalRentabilidade;
      totalMarkupAcumulado += totals.totalMarkup;
      totalRavAcumulado += totals.totalRav;
    });

    const ticketMedio = totalViagens > 0 ? totalVendas / totalViagens : 0;

    return {
      user: this.config.user,
      perfil: this.config.perfil,
      settings: this.config.settings,
      consultores: this.config.consultores,
      formasRecebimento: this.config.formasRecebimento,
      origensLead: this.config.origensLead,
      destinosList,
      tiposDisponiveis: DashboardFilterEngine.getListaTiposProdutoDisponiveis(this.config.tiposProduto),
      tiposProduto: this.config.tiposProduto,
      tagsDisponiveis: DashboardFilterEngine.getListaTagsDisponiveis(viagens),
      counts,
      totalSlaAlerts,
      totalViagens,
      totalVendas,
      totalRentabilidade,
      totalMarkupAcumulado,
      totalRavAcumulado,
      ticketMedio,
      currentMonthLabel: DashboardFilterEngine.getFormattedCurrentMonthLabel(),
      totalFiltrosAtivos: this.getActiveFiltersCount()
    };
  }

  public createHandlers(): DashboardFilterBarHandlers {
    return {
      onSetViewModeMonth: (mode) => {
        this.viewModeMonth = mode;
        try {
          localStorage.setItem('paxflow-view-mode-month', mode);
        } catch (e) {}
        this.config.onStateChange();
      },
      onToggleFiltersPanel: () => {
        this.showFiltersPanel = !this.showFiltersPanel;
        this.config.onStateChange();
      },
      onCollapseFiltersPanel: () => {
        this.showFiltersPanel = false;
        this.config.onStateChange();
      },
      onToggleConfPopover: () => {
        this.showConfPopover = !this.showConfPopover;
        this.config.onStateChange();
      },
      onCloseConfPopover: () => {
        this.showConfPopover = false;
        this.config.onStateChange();
      },
      onSelectConsultor: (id) => {
        this.selectedConsultantId = id;
        this.config.onStateChange();
      },
      onNovaViagem: () => {
        this.config.onNovaViagem();
      },
      onExportCsv: () => {
        this.config.onExportCsv();
      },
      onSelectStatusTab: (statusKey) => {
        this.activeStatusTab = statusKey;
        this.config.onStateChange();
      },
      onDateFilterChange: (field, value) => {
        (this as any)[field] = value;
        this.config.onStateChange();
      },
      onAdvMesAnoChange: (value) => {
        this.advMesAno = value;
        this.config.onStateChange();
      },
      onAdvDestinoChange: (value) => {
        this.advDestinos = value ? [value] : [];
        this.config.onStateChange();
      },
      onAdvFornecedorChange: (value) => {
        this.advFornecedor = value;
        this.config.onStateChange();
      },
      onNumericFilterChange: (field, value) => {
        (this as any)[field] = value;
        this.config.onStateChange();
      },
      onClearAdvFinancas: () => {
        this.advValorMin = null;
        this.advValorMax = null;
        this.advTarifaMin = null;
        this.advTarifaMax = null;
        this.advTaxaMin = null;
        this.advTaxaMax = null;
        this.advComissaoMin = null;
        this.advComissaoMax = null;
        this.advMarkupMin = null;
        this.advMarkupMax = null;
        this.advRavMin = null;
        this.advRavMax = null;
        this.advRentabilidadeMin = null;
        this.advRentabilidadeMax = null;
        this.advMarkupRav = 'todos';
        this.config.onStateChange();
      },
      onToggleMarkupRav: (val) => {
        this.advMarkupRav = val as any;
        this.config.onStateChange();
      },
      onToggleMatchMode: (mode) => {
        this.advProdutoMatchMode = mode;
        this.config.onStateChange();
      },
      onClearAdvProdutos: () => {
        this.advProdutos = [];
        this.config.onStateChange();
      },
      onToggleAdvProduto: (pId) => {
        if (this.advProdutos.includes(pId)) {
          this.advProdutos = this.advProdutos.filter(p => p !== pId);
        } else {
          this.advProdutos.push(pId);
        }
        this.config.onStateChange();
      },
      onToggleAdvConsultor: (cId) => {
        if (this.advConsultores.includes(cId)) {
          this.advConsultores = this.advConsultores.filter(id => id !== cId);
        } else {
          this.advConsultores.push(cId);
        }
        this.config.onStateChange();
      },
      onClearAdvConsultores: () => {
        this.advConsultores = [];
        this.config.onStateChange();
      },
      onToggleAdvForma: (fKey) => {
        if (this.advFormasRecebimento.includes(fKey)) {
          this.advFormasRecebimento = this.advFormasRecebimento.filter(id => id !== fKey);
        } else {
          this.advFormasRecebimento.push(fKey);
        }
        this.config.onStateChange();
      },
      onClearAdvFormas: () => {
        this.advFormasRecebimento = [];
        this.config.onStateChange();
      },
      onToggleAdvOrigem: (oKey) => {
        if (this.advOrigensLead.includes(oKey)) {
          this.advOrigensLead = this.advOrigensLead.filter(id => id !== oKey);
        } else {
          this.advOrigensLead.push(oKey);
        }
        this.config.onStateChange();
      },
      onToggleAdvPax: (paxKey) => {
        if (this.advPaxFaixas.includes(paxKey)) {
          this.advPaxFaixas = this.advPaxFaixas.filter(k => k !== paxKey);
        } else {
          this.advPaxFaixas.push(paxKey);
        }
        this.config.onStateChange();
      },
      onToggleAdvTag: (tagName) => {
        if (this.advTags.includes(tagName)) {
          this.advTags = this.advTags.filter(t => t !== tagName);
        } else {
          this.advTags.push(tagName);
        }
        this.config.onStateChange();
      },
      onClearAdvTags: () => {
        this.advTags = [];
        this.config.onStateChange();
      },
      onToggleAdvAnexo: (anexoVal) => {
        this.advAnexos = anexoVal as any;
        this.config.onStateChange();
      },
      onToggleAdvSla: (slaVal) => {
        this.advSla = (this.advSla === slaVal ? 'todos' : slaVal) as any;
        this.config.onStateChange();
      },
      onToggleAdvRisk: (riskVal) => {
        if (this.advRiskScore.includes(riskVal)) {
          this.advRiskScore = this.advRiskScore.filter(l => l !== riskVal);
        } else {
          this.advRiskScore.push(riskVal);
        }
        this.config.onStateChange();
      },
      onToggleConfFilter: (key) => {
        this.confFilters[key] = !this.confFilters[key];
        this.config.onStateChange();
      },
      onConfAtalho100: () => {
        this.confFilters = { finPendente: false, finOk: true, procPendente: false, procOk: true };
        this.config.onStateChange();
      },
      onConfAtalhoNenhum: () => {
        this.confFilters = { finPendente: true, finOk: false, procPendente: true, procOk: false };
        this.config.onStateChange();
      },
      onConfLimpar: () => {
        this.confFilters = { finPendente: false, finOk: false, procPendente: false, procOk: false };
        this.config.onStateChange();
      },
      onResetAllFilters: () => {
        this.resetAllFilters();
      },
      onRemoveSingleFilter: (key) => {
        this.removeSingleFilter(key);
      }
    };
  }

  public resetAllFilters(): void {
    this.buscaTermo = '';
    const searchInput = document.getElementById('input-busca-viagem') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
    const globalInput = document.getElementById('global-header-search-input') as HTMLInputElement;
    if (globalInput) {
      globalInput.value = '';
      const clearBtn = document.getElementById('btn-clear-global-search');
      if (clearBtn) clearBtn.classList.add('hidden');
    }
    this.dataFinStart = '';
    this.dataFinEnd = '';
    this.dataIdaStart = '';
    this.dataIdaEnd = '';
    this.dataVoltaStart = '';
    this.dataVoltaEnd = '';
    this.advMesAno = '';
    this.advProdutos = [];
    this.advDestinos = [];
    this.advFornecedor = '';
    this.advValorMin = null;
    this.advValorMax = null;
    this.advTarifaMin = null;
    this.advTarifaMax = null;
    this.advTaxaMin = null;
    this.advTaxaMax = null;
    this.advComissaoMin = null;
    this.advComissaoMax = null;
    this.advMarkupMin = null;
    this.advMarkupMax = null;
    this.advRavMin = null;
    this.advRavMax = null;
    this.advRentabilidadeMin = null;
    this.advRentabilidadeMax = null;
    this.advMarkupRav = 'todos';
    this.advAnexos = 'todos';
    this.advSla = 'todos';
    this.advRiskScore = [];
    this.advConsultores = [];
    this.advFormasRecebimento = [];
    this.advOrigensLead = [];
    this.advPaxFaixas = [];
    this.advTags = [];
    this.selectedConsultantId = 'todos';
    this.confFilters = {
      finPendente: false,
      finOk: false,
      procPendente: false,
      procOk: false
    };
    this.activeStatusTab = 'todos';
    this.config.onStateChange();
  }

  public removeSingleFilter(filterKey: string): void {
    if (filterKey === 'busca') {
      this.buscaTermo = '';
      const searchInput = document.getElementById('input-busca-viagem') as HTMLInputElement;
      if (searchInput) searchInput.value = '';
      const globalInput = document.getElementById('global-header-search-input') as HTMLInputElement;
      if (globalInput) {
        globalInput.value = '';
        const clearBtn = document.getElementById('btn-clear-global-search');
        if (clearBtn) clearBtn.classList.add('hidden');
      }
    } else if (filterKey === 'dataFin') {
      this.dataFinStart = '';
      this.dataFinEnd = '';
    } else if (filterKey === 'dataIda') {
      this.dataIdaStart = '';
      this.dataIdaEnd = '';
    } else if (filterKey === 'dataVolta') {
      this.dataVoltaStart = '';
      this.dataVoltaEnd = '';
    } else if (filterKey === 'adv-mes-ano') {
      this.advMesAno = '';
    } else if (filterKey?.startsWith('adv-prod-')) {
      const pId = filterKey.replace('adv-prod-', '');
      this.advProdutos = this.advProdutos.filter(p => p !== pId);
    } else if (filterKey?.startsWith('adv-consultor-')) {
      const cId = filterKey.replace('adv-consultor-', '');
      this.advConsultores = this.advConsultores.filter(id => id !== cId);
    } else if (filterKey?.startsWith('adv-forma-')) {
      const fKey = filterKey.replace('adv-forma-', '');
      this.advFormasRecebimento = this.advFormasRecebimento.filter(id => id !== fKey);
    } else if (filterKey?.startsWith('adv-origem-')) {
      const oKey = filterKey.replace('adv-origem-', '');
      this.advOrigensLead = this.advOrigensLead.filter(id => id !== oKey);
    } else if (filterKey?.startsWith('adv-pax-')) {
      const paxKey = filterKey.replace('adv-pax-', '');
      this.advPaxFaixas = this.advPaxFaixas.filter(k => k !== paxKey);
    } else if (filterKey?.startsWith('adv-tag-')) {
      const tagName = filterKey.replace('adv-tag-', '');
      this.advTags = this.advTags.filter(t => t !== tagName);
    } else if (filterKey?.startsWith('adv-dest-')) {
      const dest = filterKey.replace('adv-dest-', '');
      this.advDestinos = this.advDestinos.filter(d => d !== dest);
    } else if (filterKey === 'adv-fornecedor') {
      this.advFornecedor = '';
    } else if (filterKey === 'adv-valor') {
      this.advValorMin = null;
      this.advValorMax = null;
    } else if (filterKey === 'adv-tarifa-val') {
      this.advTarifaMin = null;
      this.advTarifaMax = null;
    } else if (filterKey === 'adv-taxa-val') {
      this.advTaxaMin = null;
      this.advTaxaMax = null;
    } else if (filterKey === 'adv-comissao-val') {
      this.advComissaoMin = null;
      this.advComissaoMax = null;
    } else if (filterKey === 'adv-markup-val') {
      this.advMarkupMin = null;
      this.advMarkupMax = null;
    } else if (filterKey === 'adv-rav-val') {
      this.advRavMin = null;
      this.advRavMax = null;
    } else if (filterKey === 'adv-rent') {
      this.advRentabilidadeMin = null;
      this.advRentabilidadeMax = null;
    } else if (filterKey === 'adv-markup-rav') {
      this.advMarkupRav = 'todos';
    } else if (filterKey === 'adv-anexos') {
      this.advAnexos = 'todos';
    } else if (filterKey === 'adv-sla') {
      this.advSla = 'todos';
    } else if (filterKey?.startsWith('adv-risk-')) {
      const r = filterKey.replace('adv-risk-', '');
      this.advRiskScore = this.advRiskScore.filter(l => l !== r);
    } else if (filterKey === 'consultor') {
      this.selectedConsultantId = 'todos';
    } else if (filterKey === 'conf-fin-pendente') {
      this.confFilters.finPendente = false;
    } else if (filterKey === 'conf-fin-ok') {
      this.confFilters.finOk = false;
    } else if (filterKey === 'conf-proc-pendente') {
      this.confFilters.procPendente = false;
    } else if (filterKey === 'conf-proc-ok') {
      this.confFilters.procOk = false;
    } else if (filterKey === 'status') {
      this.activeStatusTab = 'todos';
    }
    this.config.onStateChange();
  }
}
