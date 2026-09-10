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
    // Setup - lista padrão de orçamentos com status mistos
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
    // Setup - lista padrão de orçamentos
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

  it('deve lidar com valores zero, nulos ou negativos sem poluir o cálculo de ticket médio', () => {
    // Setup - orçamentos com valores nulos, negativos ou zerados
    const orcamentosAtipicos: any[] = [
      { id: 'a1', status: 'SOLICITADO', valorProposta: 0, temperatura: 'QUENTE' },
      { id: 'a2', status: 'EM_ANDAMENTO', valorProposta: null, valorViagem: 12000, temperatura: 'MORNO' },
      { id: 'a3', status: 'AGUARDANDO', valorProposta: -500, temperatura: 'FRIO' },
      { id: 'a4', status: 'CONCLUIDO', valorProposta: 8000, temperatura: 'QUENTE' },
    ];

    // Action
    const metricas = calcularMetricasPipeline(orcamentosAtipicos);

    // Assert
    expect(metricas.totalOrcamentos).toBe(4);
    expect(metricas.valorTotalPipeline).toBe(20000); // 12000 (de valorViagem) + 8000 (de valorProposta)
    expect(metricas.ticketMedio).toBe(10000); // 20000 / 2 orçamentos válidos
    expect(metricas.quentes).toBe(2);
    expect(metricas.mornos).toBe(1);
    expect(metricas.frios).toBe(1);
  });

  it('deve retornar métricas zeradas com segurança para lista vazia de orçamentos', () => {
    // Setup
    const orcamentosVazios: any[] = [];

    // Action
    const metricas = calcularMetricasPipeline(orcamentosVazios);

    // Assert
    expect(metricas.totalOrcamentos).toBe(0);
    expect(metricas.valorTotalPipeline).toBe(0);
    expect(metricas.ticketMedio).toBe(0);
    expect(metricas.quentes).toBe(0);
    expect(metricas.mornos).toBe(0);
    expect(metricas.frios).toBe(0);
  });

  it('deve agrupar no Kanban com fallback seguro para status nulos, vazios ou indefinidos', () => {
    // Setup - orçamentos sem o campo status preenchido
    const semStatus: any[] = [
      { id: 's1', status: null },
      { id: 's2', status: undefined },
      { id: 's3', status: '' },
      { id: 's4', status: 'em_andamento' }, // minúsculo
    ];

    // Action
    const kanban = agruparOrcamentosKanban(semStatus);

    // Assert
    expect(kanban.SOLICITADO).toHaveLength(3); // s1, s2, s3 caem em SOLICITADO
    expect(kanban.EM_ANDAMENTO).toHaveLength(1); // s4 normalizado para maiúsculo
  });
});
