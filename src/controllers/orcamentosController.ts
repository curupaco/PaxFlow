/**
 * OrcamentosController
 * Funções puras que orquestram o estado da tela de Orçamentos, métricas e Kanban comercial.
 */
import { Orcamento } from '../types';

export function agruparOrcamentosKanban(orcamentos: Orcamento[]): Record<string, Orcamento[]> {
  const colunas: Record<string, Orcamento[]> = {
    SOLICITADO: [],
    EM_ANDAMENTO: [],
    AGUARDANDO: [],
    CONCLUIDO: [],
    PERDIDO: [],
  };

  orcamentos.forEach((o) => {
    const st = (o.status || 'SOLICITADO').toUpperCase();
    if (colunas[st]) {
      colunas[st].push(o);
    } else {
      colunas.SOLICITADO.push(o);
    }
  });

  return colunas;
}

export function calcularMetricasPipeline(orcamentos: Orcamento[]): {
  totalOrcamentos: number;
  valorTotalPipeline: number;
  ticketMedio: number;
  quentes: number;
  mornos: number;
  frios: number;
} {
  let valorTotal = 0;
  let countValor = 0;
  let quentes = 0;
  let mornos = 0;
  let frios = 0;

  orcamentos.forEach((o) => {
    const val = o.valorProposta || o.valorViagem || 0;
    if (val > 0) {
      valorTotal += val;
      countValor++;
    }

    const temp = (o.temperatura || '').toUpperCase();
    if (temp === 'QUENTE') quentes++;
    else if (temp === 'MORNO') mornos++;
    else if (temp === 'FRIO') frios++;
  });

  const ticketMedio = countValor > 0 ? Math.round(valorTotal / countValor) : 0;

  return {
    totalOrcamentos: orcamentos.length,
    valorTotalPipeline: valorTotal,
    ticketMedio,
    quentes,
    mornos,
    frios,
  };
}
