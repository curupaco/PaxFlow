import { describe, it, expect } from 'vitest';
import {
  determinarStatusDinamicoViagem,
  calcularRentabilidadeViagem,
  validarConsistenciaFinanceiraViagem,
  agruparViagensPorColunaKanban
} from '../../src/controllers/viagensController';
import { ProdutoViagem } from '../../src/types';

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

  it('deve classificar como pos_venda viagens cujo retorno ocorreu há até 15 dias', () => {
    // Setup - Retornou há 3 dias
    const dataIda = '2026-08-20';
    const dataVolta = '2026-09-07';

    // Action
    const status = determinarStatusDinamicoViagem(dataIda, dataVolta, 'fechado', 7, refAgora);

    // Assert
    expect(status).toBe('pos_venda');
  });

  it('deve classificar como concluido viagens cujo retorno ocorreu há mais de 15 dias', () => {
    // Setup - Retornou há 20 dias
    const dataIda = '2026-08-01';
    const dataVolta = '2026-08-21';

    // Action
    const status = determinarStatusDinamicoViagem(dataIda, dataVolta, 'fechado', 7, refAgora);

    // Assert
    expect(status).toBe('concluido');
  });

  it('deve manter status cancelado ou concluido imutáveis mesmo se datas mudarem', () => {
    // Setup
    const dataFutura = '2026-12-01';

    // Action
    const cancelada = determinarStatusDinamicoViagem(dataFutura, dataFutura, 'cancelado', 7, refAgora);
    const concluida = determinarStatusDinamicoViagem(dataFutura, dataFutura, 'concluido', 7, refAgora);

    // Assert
    expect(cancelada).toBe('cancelado');
    expect(concluida).toBe('concluido');
  });

  it('deve calcular rentabilidade, lucro bruto, margem e markup com precisão monetária', () => {
    // Setup
    const produtos: ProdutoViagem[] = [
      { id: '1', viagem_id: 'v1', tipo: 'aereo', descricao: 'Voo SP-Paris', valor_custo: 4000, valor_venda: 5000, status: 'confirmado' },
      { id: '2', viagem_id: 'v1', tipo: 'hotel', descricao: 'Hotel Paris', valor_custo: 3000, valor_venda: 4500, status: 'confirmado' },
      { id: '3', viagem_id: 'v1', tipo: 'seguro', descricao: 'Seguro GTA', valor_custo: 500, valor_venda: 500, status: 'cancelado' } // cancelado é ignorado
    ];

    // Action
    const r = calcularRentabilidadeViagem(produtos);

    // Assert
    // Custo: 4000 + 3000 = 7000
    // Venda: 5000 + 4500 = 9500
    // Lucro: 2500
    // Margem: (2500 / 9500) * 100 = 26.3%
    // Markup: (2500 / 7000) * 100 = 35.7%
    expect(r.custoTotal).toBe(7000);
    expect(r.vendaTotal).toBe(9500);
    expect(r.lucroBruto).toBe(2500);
    expect(r.margemPercentual).toBe(26.3);
    expect(r.markupPercentual).toBe(35.7);
  });

  it('deve validar consistência entre total da viagem e soma dos produtos ativos', () => {
    // Setup
    const viagemConsistente = { valor_total: 9500 };
    const viagemDivergente = { valor_total: 10000 };
    const produtos: ProdutoViagem[] = [
      { id: '1', viagem_id: 'v1', tipo: 'aereo', valor_venda: 5000, status: 'confirmado' },
      { id: '2', viagem_id: 'v1', tipo: 'hotel', valor_venda: 4500, status: 'confirmado' },
    ];

    // Action
    const resConsistente = validarConsistenciaFinanceiraViagem(viagemConsistente, produtos);
    const resDivergente = validarConsistenciaFinanceiraViagem(viagemDivergente, produtos);

    // Assert
    expect(resConsistente.consistente).toBe(true);
    expect(resConsistente.diferenca).toBe(0);

    expect(resDivergente.consistente).toBe(false);
    expect(resDivergente.diferenca).toBe(500);
  });

  it('deve distribuir viagens nas 6 colunas do Kanban com agrupamento confiável', () => {
    // Setup
    const viagens = [
      { id: 'v1', status: 'fechado' },
      { id: 'v2', status: 'pre_embarque' },
      { id: 'v3', status: 'em_viagem' },
      { id: 'v4', status: 'pos_venda' },
      { id: 'v5', status: 'concluido' },
      { id: 'v6', status: 'cancelado' },
      { id: 'v7', status: 'qualquer_outro' }, // fallback
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

  it('deve recalcular rentabilidade e manter consistência financeira ao incorporar produtos de upsell', () => {
    // Setup - Pacote original: Aéreo (margem baixa) + Hotel. Adicionado: Seguro e Transfer (alta margem) via Upsell
    const produtosBase: ProdutoViagem[] = [
      { id: 'p1', viagem_id: 'v-up', tipo: 'aereo', valor_venda: 6000, valor_custo: 5700, status: 'confirmado' },
      { id: 'p2', viagem_id: 'v-up', tipo: 'hotel', valor_venda: 4000, valor_custo: 3400, status: 'confirmado' },
    ];
    const rentabilidadeOriginal = calcularRentabilidadeViagem(produtosBase); // Lucro bruto = 300 + 600 = 900 (9%)

    // Adição de produtos oriundos do PaxFlow Upsell Engine
    const produtosComUpsell: ProdutoViagem[] = [
      ...produtosBase,
      { id: 'p3', viagem_id: 'v-up', tipo: 'seguro', valor_venda: 580, valor_custo: 320, status: 'confirmado' }, // Lucro = 260 (~45%)
      { id: 'p4', viagem_id: 'v-up', tipo: 'transfer', valor_venda: 360, valor_custo: 200, status: 'confirmado' }, // Lucro = 160 (~44%)
    ];

    const viagemAtualizada = { valor_total: 10940 }; // 6000 + 4000 + 580 + 360

    // Action
    const rentabilidadeFinal = calcularRentabilidadeViagem(produtosComUpsell);
    const consistencia = validarConsistenciaFinanceiraViagem(viagemAtualizada, produtosComUpsell);

    // Assert
    expect(consistencia.consistente).toBe(true);
    expect(consistencia.diferenca).toBe(0);
    expect(rentabilidadeFinal.lucroBruto).toBe(1320); // 900 + 260 + 160
    expect(rentabilidadeFinal.lucroBruto).toBeGreaterThan(rentabilidadeOriginal.lucroBruto);
    expect(rentabilidadeFinal.margemPercentual).toBeGreaterThan(rentabilidadeOriginal.margemPercentual);
  });
});

