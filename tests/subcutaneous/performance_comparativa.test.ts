import { describe, it, expect } from 'vitest';
import { PerformanceComparativaService } from '../../src/services/performanceComparativaService';

describe('Performance Comparativa & Pacing - Testes Subcutâneos de Negócio', () => {
  it('deve calcular deltas nominais e percentuais com tratamento seguro de divisão por zero', () => {
    // Setup & Action
    const d1 = PerformanceComparativaService.calcularDelta(120000, 100000);
    const d2 = PerformanceComparativaService.calcularDelta(80000, 100000);
    const d3 = PerformanceComparativaService.calcularDelta(50000, 0);
    const d4 = PerformanceComparativaService.calcularDelta(0, 0);

    // Assert
    expect(d1.deltaNominal).toBe(20000);
    expect(d1.deltaPercentual).toBe(20);
    expect(d1.direcao).toBe('up');

    expect(d2.deltaNominal).toBe(-20000);
    expect(d2.deltaPercentual).toBe(-20);
    expect(d2.direcao).toBe('down');

    expect(d3.deltaPercentual).toBe(100);
    expect(d3.direcao).toBe('up');

    expect(d4.deltaPercentual).toBe(0);
    expect(d4.direcao).toBe('equal');
  });

  it('deve resolver corretamente o preset MoM Same-Period respeitando o dia de corte', () => {
    // Setup: Simula hoje sendo 17 de Novembro de 2026
    const dataRef = new Date('2026-11-17T12:00:00Z');

    // Action
    const { atual, anterior } = PerformanceComparativaService.resolverDatasPreset('mom_same_period', dataRef);

    // Assert
    expect(atual.inicio).toBe('2026-11-01');
    expect(atual.fim).toBe('2026-11-17');
    expect(atual.diasCorte).toBe(17);

    expect(anterior.inicio).toBe('2026-10-01');
    expect(anterior.fim).toBe('2026-10-17');
    expect(anterior.diasCorte).toBe(17);
  });

  it('deve calcular a rentabilidade unificada (Comissão + Markup + 88% RAV)', () => {
    // Setup: Viagem com produtos de comissão, markup e RAV
    const viagem = {
      id: 'v1',
      produtos: [
        { tipo: 'AÉREO', valor_venda: 5000, comissao: 500, markup: 200, rav: 100, status: 'confirmado' },
        { tipo: 'HOTEL', valor_venda: 3000, comissao: 300, markup: 0, rav: 0, status: 'confirmado' },
        { tipo: 'SEGURO', valor_venda: 400, comissao: 100, markup: 0, rav: 0, status: 'reembolsado' } // Reembolsado ignorado
      ]
    };

    // Action
    const lucro = PerformanceComparativaService.calcularRentabilidadeViagem(viagem);

    // Assert: (500 + 200 + 88) + (300) = 1088 (seguro reembolsado desconsiderado)
    expect(lucro).toBe(1088);
  });

  it('deve descartar estritamente viagens sem data_financeiro válida (proibição de fallbacks)', () => {
    // Setup
    const viagens = [
      { id: 'v1', valor_total: 10000, data_financeiro: '2026-11-10', destino: 'Paris' },
      { id: 'v2', valor_total: 8000, data_financeiro: null, destino: 'Londres' }, // Sem data_financeiro
      { id: 'v3', valor_total: 5000, data_financeiro: '', destino: 'Roma' }       // Vazia
    ];

    // Action
    const validas = PerformanceComparativaService.processarViagens(viagens, { consultorId: 'todos' });

    // Assert
    expect(validas.length).toBe(1);
    expect(validas[0].id).toBe('v1');
  });

  it('deve calcular o rateio proporcional de vendas em viagens_divisoes com total exato da loja', () => {
    // Setup
    const viagensAtual = [
      {
        id: 'v-div',
        valor_total: 10000,
        data_financeiro: '2026-11-10',
        consultor_id: 'c1', // Titular
        produtos: [{ valor_venda: 10000, comissao: 1000, markup: 0, rav: 0 }],
        divisoes: [
          { consultor_id: 'c2', percentual: 40 } // Parceiro recebe 40%
        ]
      },
      {
        id: 'v-indiv',
        valor_total: 5000,
        data_financeiro: '2026-11-12',
        consultor_id: 'c1',
        produtos: [{ valor_venda: 5000, comissao: 500, markup: 0, rav: 0 }],
        divisoes: []
      }
    ];

    const perfis = [
      { id: 'c1', nome: 'Aline Barros', role: 'consultor' } as any,
      { id: 'c2', nome: 'Carlos Silva', role: 'consultor' } as any
    ];

    // Action
    const tabela = PerformanceComparativaService.calcularTabelaConsultores(
      viagensAtual,
      [],
      [],
      perfis
    );

    // Assert:
    // C1 titular: 60% de 10.000 (6.000) + 100% de 5.000 (5.000) = 11.000
    // C2 parceiro: 40% de 10.000 = 4.000
    // Soma total = 15.000 (exatamente o total da loja)
    const linhaC1 = tabela.find(t => t.consultorId === 'c1');
    const linhaC2 = tabela.find(t => t.consultorId === 'c2');

    expect(linhaC1?.vendasAtualValor).toBe(11000);
    expect(linhaC2?.vendasAtualValor).toBe(4000);
    expect(linhaC1!.shareLojaPercentual + linhaC2!.shareLojaPercentual).toBeCloseTo(100, 1);
  });

  it('deve calcular a Curva S diária e a projeção linear de fechamento (Run-Rate)', () => {
    // Setup
    const vendasAtual = [
      { id: 'v1', valor_total: 10000, data_financeiro: '2026-11-05' },
      { id: 'v2', valor_total: 20000, data_financeiro: '2026-11-10' }
    ];
    const vendasAnt = [
      { id: 'v3', valor_total: 15000, data_financeiro: '2026-10-05' }
    ];

    // Action: 10 dias decorridos em um mês de 30 dias
    const curvaS = PerformanceComparativaService.calcularPacingCurvaS(
      vendasAtual,
      vendasAnt,
      10,
      30,
      50000
    );

    // Assert:
    // Total acumulado até dia 10: 30.000
    // Média diária: 3.000/dia
    // Projeção final: 30.000 + (3.000 * 20 dias restantes) = 90.000
    expect(curvaS.totalAtualAteCorte).toBe(30000);
    expect(curvaS.runRateFinal).toBe(90000);
    expect(curvaS.benchmarkFechamentoAnterior).toBe(50000);
    expect(curvaS.pontos.length).toBeGreaterThanOrEqual(30);
  });
});

