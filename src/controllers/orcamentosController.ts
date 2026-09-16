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

export function calcularLeadAgingInfo(dateIso?: string): { dias: number; badgeHtml: string; nivel: 'recente' | 'moderado' | 'critico' } {
  if (!dateIso) return { dias: 0, badgeHtml: '', nivel: 'recente' };
  const criado = new Date(dateIso).getTime();
  if (isNaN(criado)) return { dias: 0, badgeHtml: '', nivel: 'recente' };
  const diffDias = Math.floor((Date.now() - criado) / (1000 * 60 * 60 * 24));

  if (diffDias <= 2) {
    const texto = diffDias === 0 ? 'Hoje' : `${diffDias}d na etapa`;
    return {
      dias: diffDias,
      nivel: 'recente',
      badgeHtml: `<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40" title="Lead recente na etapa (${diffDias}d)">🟢 ${texto}</span>`
    };
  } else if (diffDias <= 5) {
    return {
      dias: diffDias,
      nivel: 'moderado',
      badgeHtml: `<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40" title="Atenção: ${diffDias} dias nesta etapa">🟡 ${diffDias}d na etapa</span>`
    };
  } else {
    return {
      dias: diffDias,
      nivel: 'critico',
      badgeHtml: `<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40 animate-pulse" title="Crítico: parado há ${diffDias} dias">🔴 ${diffDias}d na etapa</span>`
    };
  }
}
