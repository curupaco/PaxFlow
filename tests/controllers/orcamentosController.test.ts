import { describe, it, expect } from 'vitest';
import {
  agruparOrcamentosKanban,
  calcularMetricasPipeline
} from '../../src/controllers/orcamentosController';

describe('OrcamentosController - Lógica Subcutânea de Pipeline e Kanban', () => {
  const listaOrcamentos: any[] = [
    { id: 'o1', status: 'SOLICITADO', valorProposta: 10000, temperatura: 'QUENTE' },
    { id: 'o2', status: 'EM_ANDAMENTO', valorProposta: 20000, temperatura: 'QUENTE' },
    { id: 'o3', status: 'AGUARDANDO', valorProposta: 15000, temperatura: 'MORNO' },
    { id: 'o4', status: 'CONCLUIDO', valorProposta: 30000, temperatura: 'FRIO' },
    { id: 'o5', status: 'PERDIDO', valorProposta: 5000, temperatura: 'FRIO' },
    { id: 'o6', status: 'STATUS_DESCONHECIDO', valorProposta: 0, temperatura: '' },
  ];

  it('deve agrupar corretamente os orçamentos nas colunas do Kanban com fallback seguro', () => {
    // Action
    const kanban = agruparOrcamentosKanban(listaOrcamentos);

    // Assert
    expect(kanban.SOLICITADO).toHaveLength(2); // o1 + o6 (fallback)
    expect(kanban.EM_ANDAMENTO).toHaveLength(1);
    expect(kanban.AGUARDANDO).toHaveLength(1);
    expect(kanban.CONCLUIDO).toHaveLength(1);
    expect(kanban.PERDIDO).toHaveLength(1);
  });

  it('deve calcular métricas de pipeline, ticket médio e distribuição térmica com precisão', () => {
    // Action
    const metricas = calcularMetricasPipeline(listaOrcamentos);

    // Assert
    expect(metricas.totalOrcamentos).toBe(6);
    expect(metricas.valorTotalPipeline).toBe(80000); // 10k + 20k + 15k + 30k + 5k
    expect(metricas.ticketMedio).toBe(16000); // 80000 / 5
    expect(metricas.quentes).toBe(2);
    expect(metricas.mornos).toBe(1);
    expect(metricas.frios).toBe(2);
  });
});
