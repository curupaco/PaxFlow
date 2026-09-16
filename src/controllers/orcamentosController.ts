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

export interface WizardStepValidationResult {
  valido: boolean;
  erros: string[];
}

/**
 * Valida os dados de cada passo do mini-wizard de conversão de orçamento em viagem
 */
export function validarPassoWizardConversao(
  passo: 1 | 2,
  dados: {
    nomeCliente?: string;
    email?: string;
    telefone?: string;
    documento?: string;
    dataNascimento?: string;
    destino?: string;
    dataIda?: string;
    valor?: number | string;
    isViagemExistente?: boolean;
    viagemExistenteId?: string;
  }
): WizardStepValidationResult {
  const erros: string[] = [];

  if (passo === 1) {
    // Validação Passo 1: Ficha do Passageiro
    if (!dados.nomeCliente || !dados.nomeCliente.trim()) {
      erros.push('Nome Completo é obrigatório.');
    }
    if (!dados.email || !dados.email.includes('@')) {
      erros.push('E-mail de Contato inválido ou ausente.');
    }
    const telDigits = (dados.telefone || '').replace(/\D/g, '');
    if (telDigits.length < 8) {
      erros.push('Telefone de Contato deve ter pelo menos 8 dígitos.');
    }
    const docDigits = (dados.documento || '').replace(/\D/g, '');
    if (!docDigits || (docDigits.length !== 11 && docDigits.length !== 14)) {
      erros.push('CPF (11 dígitos) ou CNPJ (14 dígitos) é obrigatório.');
    }
    // Se for CPF (Pessoa Física), data de nascimento é obrigatória
    if (docDigits.length === 11 && (!dados.dataNascimento || !dados.dataNascimento.trim())) {
      erros.push('Data de Nascimento é obrigatória para Pessoa Física (CPF).');
    }
  } else if (passo === 2) {
    // Validação Passo 2: Dados Operacionais / Roteiro
    if (dados.isViagemExistente) {
      if (!dados.viagemExistenteId) {
        erros.push('Selecione uma viagem existente para vincular o orçamento.');
      }
    } else {
      if (!dados.destino || !dados.destino.trim()) {
        erros.push('Destino da viagem é obrigatório.');
      }
      if (!dados.dataIda || !dados.dataIda.trim()) {
        erros.push('Data de Ida / Embarque é obrigatória.');
      }
      const valNum = typeof dados.valor === 'number' ? dados.valor : parseFloat(String(dados.valor || '0').replace(/\./g, '').replace(',', '.'));
      if (isNaN(valNum) || valNum <= 0) {
        erros.push('Valor da Venda deve ser maior que zero.');
      }
    }
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

