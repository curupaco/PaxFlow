import { PerfilConsultor, GlobalSettings } from '../../types';
import { areAllReembolsosConcluidos } from '../../controllers/reembolsosController';
import { ViagensDivisoesService } from '../../services/viagensDivisoesService';
import {
  calcularTotaisViagem,
  parseFinancialNumber
} from '../../utils/productFinancialHelper';

export interface TripFinancialTotals {
  totalVenda: number;
  totalTarifa: number;
  totalTaxa: number;
  totalComissao: number;
  totalMarkup: number;
  totalRav: number;
  totalRavLiquido: number;
  totalRentabilidade: number;
  hasProdutos: boolean;
  fatiaVenda: number;
  fatiaRav: number;
  isDividida: boolean;
}

export interface SlaCheckResult {
  alert: boolean;
  type: 'pre-embarque' | 'pos-viagem' | 'reembolso' | null;
  text: string;
}

export interface FilterViagensOptions {
  viagens: any[];
  user: any;
  perfil: PerfilConsultor | null;
  consultores: PerfilConsultor[];
  selectedConsultantId: string;
  buscaTermo: string;
  viewModeMonth: 'current' | 'all';
  activeStatusTab: string;
  confFilters: { finPendente: boolean; finOk: boolean; procPendente: boolean; procOk: boolean };
  dataFinStart: string;
  dataFinEnd: string;
  dataIdaStart: string;
  dataIdaEnd: string;
  dataVoltaStart: string;
  dataVoltaEnd: string;
  advMesAno: string;
  advProdutos: string[];
  advProdutoMatchMode: 'AND' | 'OR';
  advDestinos: string[];
  advFornecedor: string;
  advValorMin: number | null;
  advValorMax: number | null;
  advTarifaMin: number | null;
  advTarifaMax: number | null;
  advTaxaMin: number | null;
  advTaxaMax: number | null;
  advComissaoMin: number | null;
  advComissaoMax: number | null;
  advMarkupMin: number | null;
  advMarkupMax: number | null;
  advRavMin: number | null;
  advRavMax: number | null;
  advRentabilidadeMin: number | null;
  advRentabilidadeMax: number | null;
  advMarkupRav: string;
  advAnexos: string;
  advSla: string;
  advRiskScore: string[];
  advConsultores: string[];
  advFormasRecebimento: string[];
  advOrigensLead: string[];
  advPaxFaixas: string[];
  advTags: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  locPagamentosMap: Map<string, any[]>;
  slaPreEmbarqueDias: number;
  slaPosViagemDias: number;
  settings: GlobalSettings;
  tiposProduto: any[];
}

export interface FilterViagensResult {
  totalPorConsultor: any[];
  filtrados: any[];
  counts: {
    todos: number;
    fechado: number;
    pos_venda: number;
    pre_embarque: number;
    pos_viagem: number;
    reembolso_solicitado: number;
  };
  totalSlaAlerts: number;
}

export class DashboardFilterEngine {
  /**
   * Helper para ícones de tipo de produto
   */
  public static getIconForType(tipo: string, tiposProduto: any[] = []): string {
    const cleanTipo = (tipo || '').trim().toLowerCase();
    const found = tiposProduto.find(t => (t.nome || '').trim().toLowerCase() === cleanTipo);
    if (found) return found.icone;

    const fallbackMap: Record<string, string> = {
      'aéreo facial': '✈️',
      'aéreo operadora': '✈️',
      'carro': '🚗',
      'circuito': '🗺️',
      'cruzeiro': '🚢',
      'hotel': '🏨',
      'passeios': '🎟️',
      'seguro viagem': '🛡️',
      'ingressos': '🎫',
      'transfer': '🚐',
      'trem': '🚂',
      'diversos': '📦',
      'casas': '🏡',
      'cias aéreas - assento/bagagem': '🧳',
      'cias aéreas - emissão com pontos': '🪙',
      'mudar!': '⚠️',
      'voo': '✈️',
      'seguro': '🛡️',
      'passeio': '🎟️',
      'outro': '📦'
    };
    return fallbackMap[cleanTipo] || '📦';
  }

  /**
   * Verifica se todos os reembolsos de uma viagem foram concluídos ou cancelados
   */
  public static isTodosReembolsosConcluidos(viagem: any): boolean {
    return areAllReembolsosConcluidos(viagem?.reembolsos);
  }

  /**
   * Obtém o ID do consultor atualmente sob visualização de contexto
   */
  public static getConsultorContextoAtivoId(
    user: any,
    perfil: PerfilConsultor | null,
    selectedConsultantId: string,
    advConsultores: string[]
  ): string | null {
    if (perfil?.role !== 'admin') {
      return user?.id || null;
    }
    if (selectedConsultantId && selectedConsultantId !== 'todos') {
      return selectedConsultantId;
    }
    if (advConsultores.length === 1) {
      return advConsultores[0];
    }
    return null;
  }

  /**
   * Consolida todos os valores financeiros dos produtos e da viagem de forma padronizada.
   */
  public static getTripFinancialTotals(
    v: any,
    consultorContextoId?: string | null
  ): TripFinancialTotals {
    const totals = calcularTotaisViagem(v);
    const targetConsultorId = consultorContextoId !== undefined ? consultorContextoId : null;

    let fatiaVenda = 1;
    let fatiaRav = 1;
    const temDivisoes = Array.isArray(v.divisoes) && v.divisoes.length > 0;

    if (targetConsultorId && temDivisoes) {
      fatiaVenda = ViagensDivisoesService.calcularParticipacaoConsultor(v, targetConsultorId);
      fatiaRav = ViagensDivisoesService.calcularParticipacaoRavConsultor(v, targetConsultorId);
    }

    const totalVenda = totals.totalVenda * fatiaVenda;
    const totalTarifa = totals.totalTarifa * fatiaVenda;
    const totalTaxa = totals.totalTaxa * fatiaVenda;
    const totalComissao = totals.totalComissao * fatiaVenda;
    const totalMarkup = totals.totalMarkup * fatiaVenda;
    const totalRav = totals.totalRav * fatiaRav;
    const totalRavLiquido = totals.totalRavLiquido * fatiaRav;
    const totalRentabilidade = (totals.totalComissao * fatiaVenda) + (totals.totalMarkup * fatiaVenda) + (totals.totalRavLiquido * fatiaRav);

    return {
      totalVenda,
      totalTarifa,
      totalTaxa,
      totalComissao,
      totalMarkup,
      totalRav,
      totalRavLiquido,
      totalRentabilidade,
      hasProdutos: totals.hasProdutos,
      fatiaVenda,
      fatiaRav,
      isDividida: temDivisoes && (fatiaVenda < 1 || fatiaRav < 1)
    };
  }

  public static getFormattedCurrentMonthLabel(): string {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    return `${months[now.getMonth()]}/${now.getFullYear()}`;
  }

  public static isCurrentMonthTrip(v: any): boolean {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const rawDate = v.data_financeiro || v.data_ida || v.created_at;
    if (!rawDate) return true;

    let year = 0;
    let month = 0;

    if (typeof rawDate === 'string') {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }
    } else if (rawDate instanceof Date) {
      year = rawDate.getFullYear();
      month = rawDate.getMonth() + 1;
    }

    return year === curYear && month === curMonth;
  }

  /**
   * Avalia SLAs operacionais da viagem (Pré-Embarque, Pós-Viagem e Reembolso)
   */
  public static checkSLA(
    viagem: any,
    slaPreEmbarqueDias: number,
    slaPosViagemDias: number,
    settings?: GlobalSettings,
    tiposProduto: any[] = []
  ): SlaCheckResult {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let urgentAlert: { dias: number; text: string } | null = null;

    const checkDateUrgency = (dateStr: string, label: string) => {
      if (!dateStr) return;
      const targetDate = new Date(dateStr + 'T00:00:00');
      targetDate.setHours(0, 0, 0, 0);

      const diferencaTempo = targetDate.getTime() - hoje.getTime();
      const diasRestantes = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

      if (diasRestantes >= 0 && diasRestantes <= slaPreEmbarqueDias) {
        if (!urgentAlert || diasRestantes < urgentAlert.dias) {
          urgentAlert = {
            dias: diasRestantes,
            text: `${label} em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`
          };
        }
      }
    };

    // Regra de SLA para "Pré-Embarque"
    if (viagem.status === 'pre_embarque' || viagem.status === 'fechado') {
      checkDateUrgency(viagem.data_ida, 'Embarque');

      if (viagem.produtos && Array.isArray(viagem.produtos)) {
        viagem.produtos.forEach((p: any) => {
          const icon = this.getIconForType(p.tipo, tiposProduto);
          const labelBase = `${icon} ${p.fornecedor}`;

          checkDateUrgency(p.data_servico, `${labelBase}`);

          if (p.datas_adicionais && Array.isArray(p.datas_adicionais)) {
            p.datas_adicionais.forEach((d: any) => {
              checkDateUrgency(d.data, `${labelBase} (${d.rotulo})`);
            });
          }

          if (p.dados_adicionais && Array.isArray(p.dados_adicionais.trechos)) {
            p.dados_adicionais.trechos.forEach((t: any, idx: number) => {
              const labelTrecho = `${icon} ${p.fornecedor} - Trecho ${idx + 1} (${t.origem} ➔ ${t.destino})`;
              if (t.dataIda) checkDateUrgency(t.dataIda, `${labelTrecho} (Ida)`);
              if (t.dataVolta) checkDateUrgency(t.dataVolta, `${labelTrecho} (Volta)`);
            });
          }
        });
      }

      if (urgentAlert) {
        return {
          alert: true,
          type: 'pre-embarque',
          text: `⚠️ ${(urgentAlert as any).text}!`
        };
      }
    }

    // Regra de SLA para "Pós-Viagem"
    const isPosContatoConcluido = Boolean(
      viagem.pos_contato_concluido ||
      viagem.nps_respondido ||
      viagem.nps_nota !== undefined ||
      viagem.npsNota !== undefined ||
      viagem.status === 'concluida'
    );

    if (viagem.status === 'pos_viagem' && viagem.data_volta && !isPosContatoConcluido) {
      const dataVolta = new Date(viagem.data_volta + 'T00:00:00');
      dataVolta.setHours(0, 0, 0, 0);

      const diferencaTempo = hoje.getTime() - dataVolta.getTime();
      const diasDesdeRetorno = Math.floor(diferencaTempo / (1000 * 60 * 60 * 24));

      if (diasDesdeRetorno >= slaPosViagemDias) {
        return {
          alert: true,
          type: 'pos-viagem',
          text: `🚨 SLA Excedido! ${diasDesdeRetorno} dias sem pós-contato.`
        };
      }
    }

    // Regra de SLA para "Reembolso Solicitado"
    if (viagem.status === 'reembolso_solicitado') {
      const pendentes = (viagem.reembolsos || []).filter((r: any) => {
        const st = String(r.status || '').toLowerCase();
        const trat = String(r.status_tratativa || '').toLowerCase();
        return st !== 'pago' && st !== 'concluido' && st !== 'cancelado' && trat !== 'concluido';
      });

      if (pendentes.length > 0) {
        let maisAntigoMs = hoje.getTime();
        pendentes.forEach((r: any) => {
          const dStr = r.data_solicitacao || r.created_at;
          if (dStr) {
            const dMs = new Date(dStr).getTime();
            if (dMs < maisAntigoMs) maisAntigoMs = dMs;
          }
        });
        const diasAbertos = Math.floor((hoje.getTime() - maisAntigoMs) / (1000 * 60 * 60 * 24));
        const limiteDias = settings?.prazoReembolsoDias || 3;
        if (diasAbertos >= limiteDias) {
          return {
            alert: true,
            type: 'reembolso',
            text: `🚨 SLA Excedido! ${diasAbertos} dias em reembolso pendente.`
          };
        }
      }
    }

    return { alert: false, type: null, text: '' };
  }

  public static getListaTagsDisponiveis(viagens: any[]): string[] {
    const tagSet = new Set<string>();
    const tagsPadroes = ['VIP', 'Corporativo', 'Família', 'Lua de Mel', 'Resort', 'Aventura', 'Grupo Disney', 'Exótico', 'Cruzeiro'];
    tagsPadroes.forEach(t => tagSet.add(t));

    viagens.forEach(v => {
      if (Array.isArray(v.tags)) {
        v.tags.forEach((t: any) => {
          if (t && typeof t === 'string' && t.trim()) tagSet.add(t.trim());
        });
      }
      if (v.cliente && Array.isArray(v.cliente.classificacoes)) {
        v.cliente.classificacoes.forEach((t: any) => {
          if (t && typeof t === 'string' && t.trim()) tagSet.add(t.trim());
        });
      }
    });

    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  public static getListaTiposProdutoDisponiveis(tiposProduto: any[] = []): { id: string; nome: string; icone: string }[] {
    const padroes = [
      { id: 'aéreo facial', nome: 'Aéreo Facial', icone: '✈️' },
      { id: 'aéreo operadora', nome: 'Aéreo Operadora', icone: '✈️' },
      { id: 'hotel', nome: 'Hotel', icone: '🏨' },
      { id: 'carro', nome: 'Carro', icone: '🚗' },
      { id: 'seguro viagem', nome: 'Seguro Viagem', icone: '🛡️' },
      { id: 'cruzeiro', nome: 'Cruzeiro', icone: '🚢' },
      { id: 'passeios', nome: 'Passeios', icone: '🎟️' },
      { id: 'transfer', nome: 'Transfer', icone: '🚐' },
      { id: 'trem', nome: 'Trem', icone: '🚂' },
      { id: 'ingressos', nome: 'Ingressos', icone: '🎫' },
      { id: 'casas', nome: 'Casas', icone: '🏡' },
      { id: 'circuito', nome: 'Circuito', icone: '🗺️' }
    ];

    const map = new Map<string, { id: string; nome: string; icone: string }>();
    padroes.forEach(p => map.set(p.id.toLowerCase(), p));

    (tiposProduto || []).forEach((t: any) => {
      const key = (t.nome || '').trim().toLowerCase();
      if (key) {
        map.set(key, {
          id: key,
          nome: t.nome,
          icone: t.icone || this.getIconForType(t.nome, tiposProduto)
        });
      }
    });

    return Array.from(map.values());
  }

  /**
   * Executa a filtragem completa em memória e ordenação de viagens
   */
  public static filtrarEOrdenarViagens(options: FilterViagensOptions): FilterViagensResult {
    const {
      viagens,
      user,
      perfil,
      consultores,
      selectedConsultantId,
      buscaTermo,
      viewModeMonth,
      activeStatusTab,
      confFilters,
      dataFinStart,
      dataFinEnd,
      dataIdaStart,
      dataIdaEnd,
      dataVoltaStart,
      dataVoltaEnd,
      advMesAno,
      advProdutos,
      advProdutoMatchMode,
      advDestinos,
      advFornecedor,
      advValorMin,
      advValorMax,
      advTarifaMin,
      advTarifaMax,
      advTaxaMin,
      advTaxaMax,
      advComissaoMin,
      advComissaoMax,
      advMarkupMin,
      advMarkupMax,
      advRavMin,
      advRavMax,
      advRentabilidadeMin,
      advRentabilidadeMax,
      advMarkupRav,
      advAnexos,
      advSla,
      advRiskScore,
      advConsultores,
      advFormasRecebimento,
      advOrigensLead,
      advPaxFaixas,
      advTags,
      sortField,
      sortDirection,
      locPagamentosMap,
      slaPreEmbarqueDias,
      slaPosViagemDias,
      settings,
      tiposProduto
    } = options;

    const consultorContextoId = this.getConsultorContextoAtivoId(
      user,
      perfil,
      selectedConsultantId,
      advConsultores
    );

    // 1. Filtragem por consultor e Mês Corrente
    const totalPorConsultor = viagens.filter(v => {
      const vConsultorId = v.consultor_id || (v as any).consultorId;
      const vRespId = v.consultor_responsavel_id || (v as any).consultorResponsavelId;
      const isParticipante = vConsultorId === user?.id || 
                             vRespId === user?.id || 
                             (Array.isArray(v.divisoes) && v.divisoes.some((d: any) => d.consultor_id === user?.id));

      if (perfil?.role !== 'admin') {
        if (!isParticipante) return false;
      } else if (selectedConsultantId !== 'todos') {
        const isMatchSelected = vConsultorId === selectedConsultantId || 
                                vRespId === selectedConsultantId || 
                                (Array.isArray(v.divisoes) && v.divisoes.some((d: any) => d.consultor_id === selectedConsultantId));
        if (!isMatchSelected) return false;
      }

      if (!buscaTermo) {
        if (viewModeMonth === 'current' && !this.isCurrentMonthTrip(v)) return false;
      }
      return true;
    });

    // 2. Contadores para cada aba de status
    const counts = {
      todos: totalPorConsultor.length,
      fechado: totalPorConsultor.filter(v => v.status === 'fechado').length,
      pos_venda: totalPorConsultor.filter(v => v.status === 'pos_venda').length,
      pre_embarque: totalPorConsultor.filter(v => v.status === 'pre_embarque').length,
      pos_viagem: totalPorConsultor.filter(v => v.status === 'pos_viagem').length,
      reembolso_solicitado: totalPorConsultor.filter(v => v.status === 'reembolso_solicitado').length
    };

    // 3. Aplicação completa de filtros
    const filtrados = viagens.filter(v => {
      const vConsultorId = v.consultor_id || (v as any).consultorId;
      const vRespId = v.consultor_responsavel_id || (v as any).consultorResponsavelId;
      const isParticipante = vConsultorId === user?.id || 
                             vRespId === user?.id || 
                             (Array.isArray(v.divisoes) && v.divisoes.some((d: any) => d.consultor_id === user?.id));

      if (perfil?.role !== 'admin') {
        if (!isParticipante) return false;
      } else if (selectedConsultantId !== 'todos') {
        const isMatchSelected = vConsultorId === selectedConsultantId || 
                                vRespId === selectedConsultantId || 
                                (Array.isArray(v.divisoes) && v.divisoes.some((d: any) => d.consultor_id === selectedConsultantId));
        if (!isMatchSelected) return false;
      }

      if (!buscaTermo) {
        if (viewModeMonth === 'current' && !this.isCurrentMonthTrip(v)) return false;
      }

      if (activeStatusTab !== 'todos') {
        if (v.status !== activeStatusTab) return false;
      }

      if (perfil?.role === 'admin') {
        const { finPendente, finOk, procPendente, procOk } = confFilters;
        const isFinOk = !!v.isFinanceiroConferido;
        const isProcOk = !!v.isProcessoConferido;

        if (finPendente && !finOk && isFinOk) return false;
        if (finOk && !finPendente && !isFinOk) return false;
        if (procPendente && !procOk && isProcOk) return false;
        if (procOk && !procPendente && !isProcOk) return false;
      }

      if (buscaTermo) {
        const q = buscaTermo.toLowerCase().trim();
        const qClean = q.replace(/\D/g, '');

        const cliNome = (v.cliente?.nome || v.cliente_nome || v.nome_cliente || v.nomeCliente || '').toLowerCase();
        const cliDoc = (v.cliente?.documento || v.cliente?.cpf || v.cpf || v.documento || '').toLowerCase();
        const cliDocClean = cliDoc.replace(/\D/g, '');
        const cliEmail = (v.cliente?.email || v.email || '').toLowerCase();
        const cliTelefone = (v.cliente?.telefone || v.telefone || '').toLowerCase();
        const cliTelClean = cliTelefone.replace(/\D/g, '');

        const titulo = (v.titulo || v.nome_viagem || v.nomeViagem || v.nome || '').toLowerCase();
        const dest = (v.destino || v.destino_ref?.nome || v.destinoRef?.nome || '').toLowerCase();
        const loc = (v.codigo_localizador || v.codigoLocalizador || v.localizador || '').toLowerCase();
        const ref = (v.codigo_ref || v.codigoRef || '').toLowerCase();
        const obs = (v.observacoes || v.obs || '').toLowerCase();
        const statusStr = (v.status || '').toLowerCase();
        const consultorNomeReal = (v.consultor?.nome || v.consultor_nome || '').toLowerCase();
        const consultorNome = v.consultor_id === user?.id ? 'você' : 'outro consultor';

        const matchesPassageiros = Array.isArray(v.passageiros) && v.passageiros.some((p: any) => {
          const pName = typeof p === 'string' ? p : (p?.nome || p?.name || '');
          return (pName || '').toLowerCase().includes(q);
        });

        const matchesProdutos = Array.isArray(v.produtos) && v.produtos.some((p: any) => {
          const prodTitle = (p.titulo || p.nome || p.descricao || '').toLowerCase();
          const prodForn = (p.fornecedor || '').toLowerCase();
          const prodTipo = (p.tipo || p.tipo_produto || '').toLowerCase();
          const prodReserva = (p.codigo_reserva || p.localizador || '').toLowerCase();
          const prodObs = (p.observacoes || '').toLowerCase();
          return prodTitle.includes(q) || prodForn.includes(q) || prodTipo.includes(q) || prodReserva.includes(q) || prodObs.includes(q);
        });

        const matchesComments = Array.isArray(v.comentarios_busca) && v.comentarios_busca.some((text: string) => {
          return (text || '').toLowerCase().includes(q);
        });

        const matchesCleanDigits = qClean.length >= 3 && (
          (cliDocClean.length > 0 && cliDocClean.includes(qClean)) ||
          (cliTelClean.length > 0 && cliTelClean.includes(qClean))
        );

        const matches = (
          cliNome.includes(q) ||
          cliDoc.includes(q) ||
          cliEmail.includes(q) ||
          cliTelefone.includes(q) ||
          titulo.includes(q) ||
          dest.includes(q) ||
          loc.includes(q) ||
          ref.includes(q) ||
          obs.includes(q) ||
          statusStr.includes(q) ||
          consultorNomeReal.includes(q) ||
          consultorNome.includes(q) ||
          matchesPassageiros ||
          matchesProdutos ||
          matchesComments ||
          matchesCleanDigits
        );

        if (!matches) return false;
      }

      // Filtros de Datas
      if (dataFinStart && (!v.data_financeiro || v.data_financeiro < dataFinStart)) return false;
      if (dataFinEnd && (!v.data_financeiro || v.data_financeiro > dataFinEnd)) return false;
      if (dataIdaStart && (!v.data_ida || v.data_ida < dataIdaStart)) return false;
      if (dataIdaEnd && (!v.data_ida || v.data_ida > dataIdaEnd)) return false;
      if (dataVoltaStart && (!v.data_volta || v.data_volta < dataVoltaStart)) return false;
      if (dataVoltaEnd && (!v.data_volta || v.data_volta > dataVoltaEnd)) return false;

      // Filtro Mês/Ano Competência
      if (advMesAno) {
        const rawDate = v.data_financeiro || v.data_ida || v.created_at;
        if (!rawDate) return false;
        const datePrefix = typeof rawDate === 'string' ? rawDate.substring(0, 7) : '';
        if (datePrefix !== advMesAno) return false;
      }

      // Produtos
      if (advProdutos.length > 0) {
        const prods = Array.isArray(v.produtos) ? v.produtos : [];
        const prodTypes = prods.map((p: any) => (p.tipo || '').toLowerCase().trim());

        if (advProdutoMatchMode === 'AND') {
          const hasAll = advProdutos.every(wanted => prodTypes.includes(wanted.toLowerCase().trim()));
          if (!hasAll) return false;
        } else {
          const hasAny = advProdutos.some(wanted => prodTypes.includes(wanted.toLowerCase().trim()));
          if (!hasAny) return false;
        }
      }

      // Destinos
      if (advDestinos.length > 0) {
        const destViagem = (v.destino || '').toLowerCase();
        const destRef = (v.destino_ref ? `${v.destino_ref.nome}, ${v.destino_ref.pais}` : '').toLowerCase();
        const matchesDest = advDestinos.some(d => {
          const dLower = d.toLowerCase();
          return destViagem.includes(dLower) || destRef.includes(dLower) || dLower.includes(destViagem);
        });
        if (!matchesDest) return false;
      }

      // Fornecedor
      if (advFornecedor) {
        const fornLower = advFornecedor.toLowerCase().trim();
        const prods = Array.isArray(v.produtos) ? v.produtos : [];
        const hasForn = prods.some((p: any) => (p.fornecedor || '').toLowerCase().includes(fornLower));
        if (!hasForn) return false;
      }

      // Valores Financeiros
      const totals = this.getTripFinancialTotals(v, consultorContextoId);

      if (advValorMin !== null && totals.totalVenda < advValorMin) return false;
      if (advValorMax !== null && totals.totalVenda > advValorMax) return false;
      if (advTarifaMin !== null && totals.totalTarifa < advTarifaMin) return false;
      if (advTarifaMax !== null && totals.totalTarifa > advTarifaMax) return false;
      if (advTaxaMin !== null && totals.totalTaxa < advTaxaMin) return false;
      if (advTaxaMax !== null && totals.totalTaxa > advTaxaMax) return false;
      if (advComissaoMin !== null && totals.totalComissao < advComissaoMin) return false;
      if (advComissaoMax !== null && totals.totalComissao > advComissaoMax) return false;
      if (advMarkupMin !== null && totals.totalMarkup < advMarkupMin) return false;
      if (advMarkupMax !== null && totals.totalMarkup > advMarkupMax) return false;
      if (advRavMin !== null && totals.totalRav < advRavMin) return false;
      if (advRavMax !== null && totals.totalRav > advRavMax) return false;
      if (advRentabilidadeMin !== null && totals.totalRentabilidade < advRentabilidadeMin) return false;
      if (advRentabilidadeMax !== null && totals.totalRentabilidade > advRentabilidadeMax) return false;

      // Markup / RAV Categorias
      if (advMarkupRav !== 'todos') {
        const hasMarkup = totals.totalMarkup > 0;
        const hasRav = totals.totalRav > 0;
        if (advMarkupRav === 'com_markup' && !hasMarkup) return false;
        if (advMarkupRav === 'com_rav' && !hasRav) return false;
        if (advMarkupRav === 'com_markup_ou_rav' && !hasMarkup && !hasRav) return false;
        if (advMarkupRav === 'com_markup_e_rav' && (!hasMarkup || !hasRav)) return false;
        if (advMarkupRav === 'apenas_comissao' && (hasMarkup || hasRav)) return false;
        if (advMarkupRav === 'sem_markup_rav' && (hasMarkup || hasRav)) return false;
      }

      // Anexos / Vouchers
      if (advAnexos !== 'todos') {
        const hasVoucher = !!v.voucher_geral_anexado;
        const totalAnexos = Number(v.anexos_count) || (Array.isArray(v.anexos) ? v.anexos.length : 0);
        if (advAnexos === 'com_voucher' && !hasVoucher) return false;
        if (advAnexos === 'sem_voucher' && hasVoucher) return false;
        if (advAnexos === 'com_anexo' && totalAnexos === 0 && !hasVoucher) return false;
        if (advAnexos === 'sem_anexo' && (totalAnexos > 0 || hasVoucher)) return false;
      }

      // Alertas SLA
      if (advSla !== 'todos') {
        const isReemb = v.status === 'reembolso_solicitado';
        const concl = this.isTodosReembolsosConcluidos(v);
        const sla = (isReemb && concl) ? { alert: false } : this.checkSLA(v, slaPreEmbarqueDias, slaPosViagemDias, settings, tiposProduto);
        if (advSla === 'com_alerta' && !sla.alert) return false;
        if (advSla === 'sem_alerta' && sla.alert) return false;
      }

      // Risk Score
      if (advRiskScore.length > 0) {
        const level = (v.risk_score_level || 'healthy').toLowerCase();
        const matchesLevel = advRiskScore.some(l => {
          if (l === 'critico') return level === 'critical';
          if (l === 'atencao') return level === 'attention';
          if (l === 'saudavel') return level === 'healthy';
          return level === l;
        });
        if (!matchesLevel) return false;
      }

      // Consultores Selecionados
      if (advConsultores.length > 0) {
        const cId = v.consultor_id || (v as any).consultorId;
        const rId = v.consultor_responsavel_id || (v as any).consultorResponsavelId;
        const matchesConsultor = advConsultores.includes(cId) || advConsultores.includes(rId) ||
          (Array.isArray(v.divisoes) && v.divisoes.some((d: any) => advConsultores.includes(d.consultor_id)));
        if (!matchesConsultor) return false;
      }

      // Formas de Recebimento
      if (advFormasRecebimento.length > 0) {
        const pags = locPagamentosMap.get(v.id) || [];
        const matchesForma = advFormasRecebimento.some(f => {
          const fLower = f.toLowerCase();
          return pags.some((p: any) => {
            const pId = (p.forma_recebimento_id || '').toLowerCase();
            const pNome = (p.forma_nome || '').toLowerCase();
            return pId === fLower || pNome.includes(fLower) || fLower.includes(pNome);
          });
        });
        if (!matchesForma) return false;
      }

      // Origem do Lead
      if (advOrigensLead.length > 0) {
        const cliOrigem = (v.cliente?.lead_origin || v.lead_origin || '').toLowerCase();
        const cliOrigemId = (v.cliente?.origem_lead_id || v.origem_lead_id || '').toLowerCase();
        const matchesOrigem = advOrigensLead.some(o => {
          const oLower = o.toLowerCase();
          return (cliOrigem && (cliOrigem.includes(oLower) || oLower.includes(cliOrigem))) || (cliOrigemId && cliOrigemId === oLower);
        });
        if (!matchesOrigem) return false;
      }

      // Quantidade de Passageiros (PAX)
      if (advPaxFaixas.length > 0) {
        const paxCount = Array.isArray(v.passageiros) && v.passageiros.length > 0 ? v.passageiros.length : (Number(v.pax_count) || 1);
        const matchesPax = advPaxFaixas.some(faixa => {
          if (faixa === '1') return paxCount === 1;
          if (faixa === '2') return paxCount === 2;
          if (faixa === '3-5') return paxCount >= 3 && paxCount <= 5;
          if (faixa === '6+') return paxCount >= 6;
          return false;
        });
        if (!matchesPax) return false;
      }

      // Tags
      if (advTags.length > 0) {
        const tripTags = [
          ...(Array.isArray(v.tags) ? v.tags : []),
          ...(v.cliente && Array.isArray(v.cliente.classificacoes) ? v.cliente.classificacoes : [])
        ].map(t => (typeof t === 'string' ? t.trim().toLowerCase() : ''));

        const matchesTag = advTags.some(wanted => {
          const wantedLower = wanted.toLowerCase();
          return tripTags.some(t => t.includes(wantedLower) || wantedLower.includes(t));
        });
        if (!matchesTag) return false;
      }

      return true;
    });

    // 4. Ordenação
    if (sortField) {
      filtrados.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortField === 'sla') {
          const aConcluido = this.isTodosReembolsosConcluidos(a);
          const bConcluido = this.isTodosReembolsosConcluidos(b);
          const aIsReemb = a.status === 'reembolso_solicitado';
          const bIsReemb = b.status === 'reembolso_solicitado';
          const aSla = (aIsReemb && aConcluido) ? { alert: false, type: null } : this.checkSLA(a, slaPreEmbarqueDias, slaPosViagemDias, settings, tiposProduto);
          const bSla = (bIsReemb && bConcluido) ? { alert: false, type: null } : this.checkSLA(b, slaPreEmbarqueDias, slaPosViagemDias, settings, tiposProduto);

          const getSlaPriority = (sla: any, reembolsado: boolean) => {
            if (reembolsado) return 0;
            if (!sla.alert) return 1;
            if (sla.type === 'pos-viagem') return 2;
            if (sla.type === 'pre-embarque') return 3;
            if (sla.type === 'reembolso') return 4;
            return 1;
          };
          valA = getSlaPriority(aSla, aIsReemb && aConcluido);
          valB = getSlaPriority(bSla, bIsReemb && bConcluido);
        } else if (sortField === 'cliente') {
          valA = (a.cliente?.nome || '').toLowerCase();
          valB = (b.cliente?.nome || '').toLowerCase();
        } else if (sortField === 'destino') {
          valA = (a.destino || '').toLowerCase();
          valB = (b.destino || '').toLowerCase();
        } else if (sortField === 'periodo') {
          valA = a.data_ida || '';
          valB = b.data_ida || '';
        } else if (sortField === 'data_financeiro') {
          valA = a.data_financeiro || '';
          valB = b.data_financeiro || '';
        } else if (sortField === 'financeiro') {
          valA = Number(a.valor_total) || 0;
          valB = Number(b.valor_total) || 0;
        } else if (sortField === 'consultor') {
          const nameA = a.consultor_id === user?.id ? 'Você' : (consultores.find(c => c.id === a.consultor_id)?.nome || '');
          const nameB = b.consultor_id === user?.id ? 'Você' : (consultores.find(c => c.id === b.consultor_id)?.nome || '');
          valA = nameA.toLowerCase();
          valB = nameB.toLowerCase();
        } else if (sortField === 'status') {
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // 5. Total de alertas de SLA
    let totalSlaAlerts = 0;
    totalPorConsultor.forEach(v => {
      const todosConcluidos = this.isTodosReembolsosConcluidos(v);
      const isViagemReembolso = v.status === 'reembolso_solicitado';
      if (!(isViagemReembolso && todosConcluidos) && this.checkSLA(v, slaPreEmbarqueDias, slaPosViagemDias, settings, tiposProduto).alert) {
        totalSlaAlerts++;
      }
    });

    return {
      totalPorConsultor,
      filtrados,
      counts,
      totalSlaAlerts
    };
  }
}
