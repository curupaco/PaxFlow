/**
 * DashboardController
 * Funções puras de controle e regras operacionais para o Dashboard e Kanban.
 */

export type ViagemKanbanColumn = 
  | 'planejamento' 
  | 'reservas_confirmadas' 
  | 'documentacao_enviada' 
  | 'embarque_proximo' 
  | 'em_viagem' 
  | 'pos_viagem';

export interface ViagemMock {
  id: string;
  codigo?: string;
  status: string;
  data_inicio?: string;
  consultor_id?: string;
  cliente?: { nome: string };
  destino?: string;
  isFinanceiroConferido?: boolean;
  isProcessoConferido?: boolean;
}

export function agruparViagensPorColuna(viagens: ViagemMock[]): Record<ViagemKanbanColumn, ViagemMock[]> {
  const colunas: Record<ViagemKanbanColumn, ViagemMock[]> = {
    planejamento: [],
    reservas_confirmadas: [],
    documentacao_enviada: [],
    embarque_proximo: [],
    em_viagem: [],
    pos_viagem: []
  };

  viagens.forEach(v => {
    const st = (v.status || 'planejamento') as ViagemKanbanColumn;
    if (colunas[st]) {
      colunas[st].push(v);
    } else {
      colunas['planejamento'].push(v);
    }
  });

  return colunas;
}

export function calcularUrgenciaEmbarque(
  dataInicioStr?: string,
  status?: string,
  refDateMs: number = Date.now()
): 'urgente' | 'alerta' | 'normal' {
  if (!dataInicioStr || status === 'pos_viagem' || status === 'em_viagem') {
    return 'normal';
  }

  const dataEmbarque = new Date(dataInicioStr).getTime();
  const diffHoras = (dataEmbarque - refDateMs) / (1000 * 3600);

  if (diffHoras <= 48 && diffHoras >= 0) {
    return 'urgente';
  } else if (diffHoras > 48 && diffHoras <= 168) { // até 7 dias
    return 'alerta';
  }

  return 'normal';
}

export interface ConfFiltersInput {
  finPendente?: boolean;
  finOk?: boolean;
  procPendente?: boolean;
  procOk?: boolean;
}

export function filtrarViagensOperacionais(
  viagens: ViagemMock[],
  filtros: {
    consultorId?: string;
    busca?: string;
    apenasAtivas?: boolean;
    confFilters?: ConfFiltersInput;
  }
): ViagemMock[] {
  return viagens.filter(v => {
    // Filtro por consultor
    if (filtros.consultorId && v.consultor_id !== filtros.consultorId) {
      return false;
    }

    // Filtro apenas ativas (exclui pos_viagem)
    if (filtros.apenasAtivas && v.status === 'pos_viagem') {
      return false;
    }

    // Filtro por conferência (Pills compostos com interseção)
    if (filtros.confFilters) {
      const { finPendente, finOk, procPendente, procOk } = filtros.confFilters;
      const isFinOk = !!v.isFinanceiroConferido;
      const isProcOk = !!v.isProcessoConferido;

      if (finPendente && !finOk && isFinOk) return false;
      if (finOk && !finPendente && !isFinOk) return false;

      if (procPendente && !procOk && isProcOk) return false;
      if (procOk && !procPendente && !isProcOk) return false;
    }

    // Filtro por busca
    if (filtros.busca && filtros.busca.trim()) {
      const b = filtros.busca.toLowerCase().trim();
      const nomeCli = v.cliente?.nome?.toLowerCase() || '';
      const cod = v.codigo?.toLowerCase() || '';
      const dest = v.destino?.toLowerCase() || '';
      const match = nomeCli.includes(b) || cod.includes(b) || dest.includes(b);
      if (!match) return false;
    }

    return true;
  });
}

import { ViagensDivisoesService } from '../services/viagensDivisoesService';
import { calcularTotaisViagem, TotaisFinanceirosViagem } from '../utils/productFinancialHelper';

export interface ValidacaoTransicaoResultado {
  valido: boolean;
  mensagemErro?: string;
  requerSincronizacao?: boolean;
  diferencaValor?: number;
  totalProdutos?: number;
  valorViagem?: number;
}

/**
 * Valida se uma viagem pode transicionar para o novo status
 */
export function validarTransicaoStatusViagem(
  viagem: any,
  newStatus: string,
  produtos: any[] = []
): ValidacaoTransicaoResultado {
  if (newStatus === 'fechado') {
    return { valido: true };
  }

  if (!viagem) {
    return { valido: false, mensagemErro: 'Viagem não encontrada.' };
  }

  if (viagem.status === 'fechado' && newStatus === 'pos_venda') {
    return {
      valido: false,
      mensagemErro: 'Não é possível alterar o status manualmente de Fechado para Pós-Venda. Essa alteração ocorre automaticamente quando as validações Financeira e de Processo estiverem concluídas.'
    };
  }

  // 1. Data financeiro obrigatória para pós-venda
  if (newStatus === 'pos_venda' && !viagem.data_financeiro) {
    return {
      valido: false,
      mensagemErro: 'Não é possível alterar para Pós-Venda. A Data Financeiro é obrigatória para esta fase.'
    };
  }

  // 2. Produtos ativos
  const prods = produtos.length > 0 ? produtos : (viagem.produtos || []);
  const produtosAtivos = prods.filter((p: any) => String(p.status || '').toLowerCase() !== 'reembolsado');
  const produtosParaCalculo = produtosAtivos.length > 0 ? produtosAtivos : prods;

  const totalProdutos = produtosParaCalculo.reduce((sum: number, p: any) => sum + (Number(p.valor_venda) || 0), 0);
  const valorViagem = Number(viagem.valor_total) || 0;
  const pendente = valorViagem - totalProdutos;

  if (produtosParaCalculo.length > 0 && Math.abs(pendente) > 0.01) {
    return {
      valido: false,
      requerSincronizacao: true,
      diferencaValor: Math.abs(pendente),
      totalProdutos,
      valorViagem,
      mensagemErro: `Existe uma diferença de R$ ${Math.abs(pendente).toFixed(2)} entre a viagem e os produtos ativos.`
    };
  } else if (produtosParaCalculo.length === 0 && valorViagem > 0) {
    return {
      valido: false,
      mensagemErro: 'Esta viagem ainda não possui produtos ativos cadastrados.'
    };
  }

  // 3. Produtos 100% detalhados ao avançar para pós-venda
  if (newStatus === 'pos_venda') {
    const produtoNaoDetalhado = produtosParaCalculo.find((p: any) => {
      const tarifa = Number(p.tarifa) || 0;
      const taxa = Number(p.taxa) || 0;
      const comissao = Number(p.comissao) || 0;
      const markup = Number(p.markup) || 0;
      const rav = Number(p.rav) || 0;
      const totalDet = tarifa + taxa + comissao + markup + rav;
      return Math.abs((Number(p.valor_venda) || 0) - totalDet) > 0.01;
    });

    if (produtoNaoDetalhado) {
      return {
        valido: false,
        mensagemErro: `Não é possível avançar para Pós-Venda. O produto "${produtoNaoDetalhado.fornecedor || 'Produto'}" não está com seus valores 100% detalhados.`
      };
    }
  }

  return { valido: true };
}

export interface AlertaSLAResultado {
  alert: boolean;
  type: 'pre-embarque' | 'pos-viagem' | 'reembolso' | null;
  text: string;
}

/**
 * Avalia o SLA operacional de uma viagem
 */
export function verificarSLAViagem(
  viagem: any,
  options?: {
    slaPreEmbarqueDias?: number;
    slaPosViagemDias?: number;
    prazoReembolsoDias?: number;
    dataReferencia?: Date;
  }
): AlertaSLAResultado {
  const hoje = options?.dataReferencia ? new Date(options.dataReferencia) : new Date();
  hoje.setHours(0, 0, 0, 0);

  const slaPreEmbarqueDias = options?.slaPreEmbarqueDias ?? 7;
  const slaPosViagemDias = options?.slaPosViagemDias ?? 3;
  const prazoReembolsoDias = options?.prazoReembolsoDias ?? 3;

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

  // Regra Pré-Embarque
  if (viagem.status === 'pre_embarque' || viagem.status === 'fechado') {
    checkDateUrgency(viagem.data_ida, 'Embarque');

    if (Array.isArray(viagem.produtos)) {
      viagem.produtos.forEach((p: any) => {
        checkDateUrgency(p.data_servico, p.fornecedor || 'Serviço');
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

  // Regra Pós-Viagem
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

  // Regra Reembolso
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
      if (diasAbertos >= prazoReembolsoDias) {
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

/**
 * Calcula totais financeiros aplicando divisão/split de consultor se existente
 */
export function calcularTotaisViagemComDivisao(
  viagem: any,
  consultorId?: string | null
): TotaisFinanceirosViagem & { fatiaVenda: number; fatiaRav: number; isDividida: boolean } {
  const totals = calcularTotaisViagem(viagem);
  let fatiaVenda = 1;
  let fatiaRav = 1;
  const temDivisoes = Array.isArray(viagem?.divisoes) && viagem.divisoes.length > 0;

  if (consultorId && temDivisoes) {
    fatiaVenda = ViagensDivisoesService.calcularParticipacaoConsultor(viagem, consultorId);
    fatiaRav = ViagensDivisoesService.calcularParticipacaoRavConsultor(viagem, consultorId);
  }

  return {
    ...totals,
    totalVenda: totals.totalVenda * fatiaVenda,
    totalTarifa: totals.totalTarifa * fatiaVenda,
    totalTaxa: totals.totalTaxa * fatiaVenda,
    totalComissao: totals.totalComissao * fatiaVenda,
    totalMarkup: totals.totalMarkup * fatiaVenda,
    totalRav: totals.totalRav * fatiaRav,
    totalRavLiquido: totals.totalRavLiquido * fatiaRav,
    totalRentabilidade: (totals.totalComissao * fatiaVenda) + (totals.totalMarkup * fatiaVenda) + (totals.totalRavLiquido * fatiaRav),
    fatiaVenda,
    fatiaRav,
    isDividida: temDivisoes && (fatiaVenda < 1 || fatiaRav < 1)
  };
}
