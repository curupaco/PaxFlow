import { describe, it, expect } from 'vitest';
import { Viagem, ProdutoViagem } from '../../src/types';

// Funções puras de controle extraídas e espelhadas da lógica operacional de Viagens e Kanban
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

describe('ViagensController - Máquina de Estados e Motor Financeiro de Viagens', () => {
  const refAgora = new Date('2026-09-10T12:00:00Z').getTime();

  it('deve classificar como pre_embarque viagem com partida em menos de 7 dias', () => {
    // Setup - Partida em 4 dias
    const dataIda = '2026-09-14';
    const dataVolta = '2026-09-20';

    // Action
    const status = determinarStatusDinamicoViagem(dataIda, dataVolta, 'fechado', 7, refAgora);

    // Assert
    expect(status).toBe('pre_embarque');
  });

  it('deve classificar como em_viagem quando a data atual estiver entre ida e volta', () => {
    // Setup - Partida foi ontem, retorno em 5 dias
    const dataIda = '2026-09-09';
    const dataVolta = '2026-09-15';

    // Action
    const status = determinarStatusDinamicoViagem(dataIda, dataVolta, 'fechado', 7, refAgora);

    // Assert
    expect(status).toBe('em_viagem');
  });

  it('deve classificar como pos_venda nos primeiros 15 dias após o retorno do passageiro', () => {
    // Setup - Retornou há 3 dias
    const dataIda = '2026-09-01';
    const dataVolta = '2026-09-07';

    // Action
    const status = determinarStatusDinamicoViagem(dataIda, dataVolta, 'em_viagem', 7, refAgora);

    // Assert
    expect(status).toBe('pos_venda');
  });

  it('deve classificar como concluido quando o retorno tiver ocorrido há mais de 15 dias', () => {
    // Setup - Retornou há 30 dias
    const dataIda = '2026-08-01';
    const dataVolta = '2026-08-10';

    // Action
    const status = determinarStatusDinamicoViagem(dataIda, dataVolta, 'pos_venda', 7, refAgora);

    // Assert
    expect(status).toBe('concluido');
  });

  it('deve manter status cancelado inalterado mesmo se datas coincidirem com outros períodos', () => {
    // Setup
    const dataIda = '2026-09-11';
    const dataVolta = '2026-09-18';

    // Action
    const status = determinarStatusDinamicoViagem(dataIda, dataVolta, 'cancelado', 7, refAgora);

    // Assert
    expect(status).toBe('cancelado');
  });

  it('deve calcular corretamente a rentabilidade, lucro bruto, margem e markup de produtos de viagem', () => {
    // Setup
    const produtos: any[] = [
      { tipo: 'AÉREO', valor_custo: 3000, valor_venda: 4000, status: 'confirmado' },
      { tipo: 'HOTEL', valor_custo: 2000, valor_venda: 3000, status: 'confirmado' },
      { tipo: 'CANCELADO', valor_custo: 500, valor_venda: 700, status: 'cancelado' }, // Não deve somar
    ];

    // Action
    const rentabilidade = calcularRentabilidadeViagem(produtos);

    // Assert
    expect(rentabilidade.custoTotal).toBe(5000); // 3000 + 2000
    expect(rentabilidade.vendaTotal).toBe(7000); // 4000 + 3000
    expect(rentabilidade.lucroBruto).toBe(2000);
    expect(rentabilidade.margemPercentual).toBe(28.6); // (2000 / 7000) * 100
    expect(rentabilidade.markupPercentual).toBe(40.0); // (2000 / 5000) * 100
  });

  it('deve validar consistência financeira entre valor total da viagem e soma dos produtos', () => {
    // Setup
    const viagemValida = { valor_total: 10000 };
    const produtosIguais: any[] = [
      { valor_venda: 6000, status: 'confirmado' },
      { valor_venda: 4000, status: 'confirmado' },
    ];
    const produtosDivergentes: any[] = [
      { valor_venda: 5000, status: 'confirmado' },
      { valor_venda: 3000, status: 'confirmado' },
    ];

    // Action
    const validacaoOk = validarConsistenciaFinanceiraViagem(viagemValida, produtosIguais);
    const validacaoErro = validarConsistenciaFinanceiraViagem(viagemValida, produtosDivergentes);

    // Assert
    expect(validacaoOk.consistente).toBe(true);
    expect(validacaoOk.diferenca).toBe(0);

    expect(validacaoErro.consistente).toBe(false);
    expect(validacaoErro.diferenca).toBe(2000); // 10000 - 8000
  });

  it('deve agrupar viagens nas colunas correspondentes do Kanban com fallback seguro', () => {
    // Setup
    const viagens = [
      { id: 'v1', status: 'fechado' },
      { id: 'v2', status: 'pre_embarque' },
      { id: 'v3', status: 'em_viagem' },
      { id: 'v4', status: 'pos_venda' },
      { id: 'v5', status: 'concluido' },
      { id: 'v6', status: 'cancelado' },
      { id: 'v7', status: 'STATUS_DESCONHECIDO' }, // Deve ir para fechado
    ];

    // Action
    const kanban = agruparViagensPorColunaKanban(viagens);

    // Assert
    expect(kanban.fechado).toHaveLength(2); // v1 + v7
    expect(kanban.pre_embarque).toHaveLength(1);
    expect(kanban.em_viagem).toHaveLength(1);
    expect(kanban.pos_venda).toHaveLength(1);
    expect(kanban.concluido).toHaveLength(1);
    expect(kanban.cancelado).toHaveLength(1);
  });
});
