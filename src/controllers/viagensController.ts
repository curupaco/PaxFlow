/**
 * ViagensController
 * Funções puras de controle, máquina de estados operacionais e motor financeiro de viagens.
 */
import { Viagem, ProdutoViagem } from '../types';

export function determinarStatusDinamicoViagem(
  dataIdaStr?: string | null,
  dataVoltaStr?: string | null,
  statusAtual: string = 'fechado',
  slaPreEmbarqueDias: number = 7,
  refDateMs: number = Date.now()
): 'fechado' | 'pre_embarque' | 'em_viagem' | 'pos_venda' | 'concluido' | 'cancelado' {
  if (statusAtual === 'cancelado') return 'cancelado';
  if (statusAtual === 'concluido') return 'concluido';

  if (!dataIdaStr) return (statusAtual as any) || 'fechado';

  const ida = new Date(dataIdaStr).getTime();
  const volta = dataVoltaStr ? new Date(dataVoltaStr).getTime() : ida;

  // Zerar horas para comparação de dias inteiros
  const msPorDia = 1000 * 60 * 60 * 24;
  const diasParaIda = Math.ceil((ida - refDateMs) / msPorDia);
  const diasAposVolta = Math.floor((refDateMs - volta) / msPorDia);

  // 1. Passageiro já retornou
  if (refDateMs > volta) {
    if (diasAposVolta <= 15) {
      return 'pos_venda';
    }
    return 'concluido';
  }

  // 2. Passageiro em trânsito/viagem
  if (refDateMs >= ida && refDateMs <= volta) {
    return 'em_viagem';
  }

  // 3. Proximidade do embarque (SLA de Pré-Embarque)
  if (diasParaIda <= slaPreEmbarqueDias) {
    return 'pre_embarque';
  }

  // 4. Viagem futura além do SLA
  return 'fechado';
}

export function calcularRentabilidadeViagem(produtos: ProdutoViagem[]): {
  custoTotal: number;
  vendaTotal: number;
  lucroBruto: number;
  margemPercentual: number;
  markupPercentual: number;
} {
  let custoTotal = 0;
  let vendaTotal = 0;

  produtos.forEach((p) => {
    if (p.status !== 'cancelado') {
      custoTotal += Number(p.valor_custo || p.valorCusto || 0);
      vendaTotal += Number(p.valor_venda || p.valorVenda || 0);
    }
  });

  const lucroBruto = vendaTotal - custoTotal;
  const margemPercentual = vendaTotal > 0 ? (lucroBruto / vendaTotal) * 100 : 0;
  const markupPercentual = custoTotal > 0 ? (lucroBruto / custoTotal) * 100 : 0;

  return {
    custoTotal: Number(custoTotal.toFixed(2)),
    vendaTotal: Number(vendaTotal.toFixed(2)),
    lucroBruto: Number(lucroBruto.toFixed(2)),
    margemPercentual: Number(margemPercentual.toFixed(1)),
    markupPercentual: Number(markupPercentual.toFixed(1)),
  };
}

export function validarConsistenciaFinanceiraViagem(
  viagem: Partial<Viagem>,
  produtos: ProdutoViagem[]
): { consistente: boolean; diferenca: number } {
  const totalViagem = Number(viagem.valor_total || viagem.valorTotal || 0);
  const somaProdutos = produtos
    .filter((p) => p.status !== 'cancelado')
    .reduce((acc, p) => acc + Number(p.valor_venda || p.valorVenda || 0), 0);

  const diferenca = Math.abs(totalViagem - somaProdutos);
  return {
    consistente: diferenca < 0.05,
    diferenca: Number(diferenca.toFixed(2)),
  };
}

export function agruparViagensPorColunaKanban(viagens: any[]): Record<string, any[]> {
  const colunas: Record<string, any[]> = {
    fechado: [],
    pre_embarque: [],
    em_viagem: [],
    pos_venda: [],
    concluido: [],
    cancelado: [],
  };

  viagens.forEach((v) => {
    const st = v.status || 'fechado';
    if (colunas[st]) {
      colunas[st].push(v);
    } else {
      colunas.fechado.push(v);
    }
  });

  return colunas;
}
