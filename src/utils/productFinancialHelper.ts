/**
 * Utilitário centralizado para cálculo e tratamento financeiro de produtos e viagens
 */

/**
 * Converte com segurança qualquer valor monetário (número ou string formatada pt-BR) para float
 */
export function parseFinancialNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/\s/g, '').replace('R$', '').trim();
    if (cleaned.includes(',') && cleaned.includes('.')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (cleaned.includes(',')) {
      return parseFloat(cleaned.replace(',', '.')) || 0;
    }
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

/**
 * Verifica se um tipo de produto corresponde a RAV (ex: 'RAV - 12%', 'RAV')
 */
export function isTipoRav(tipo: string): boolean {
  if (!tipo) return false;
  const t = tipo.trim().toUpperCase();
  return t === 'RAV - 12%' || t === 'RAV' || t.startsWith('RAV');
}

/**
 * Verifica se um tipo de produto corresponde a MARKUP (ex: 'MARKUP')
 */
export function isTipoMarkup(tipo: string): boolean {
  if (!tipo) return false;
  const t = tipo.trim().toUpperCase();
  return t === 'MARKUP' || t.startsWith('MARKUP');
}

/**
 * Verifica se um LOC possui produto com alterações pendentes não salvas no editor lateral
 */
export function isLocBloqueadoPorEdicao(
  selectedProductId: string | null,
  isDirty: boolean,
  produtosLoc: any[]
): boolean {
  if (!selectedProductId || !isDirty || !Array.isArray(produtosLoc)) {
    return false;
  }
  return produtosLoc.some(p => p && p.id === selectedProductId);
}

export interface ProdutoFinanceiroCalculado {
  venda: number;
  tarifa: number;
  taxa: number;
  comissao: number;
  markup: number;
  rav: number;
  ravLiquido: number;
  rentabilidade: number;
  totalDistribuido: number;
  saldoPendente: number;
  isDetalhado: boolean;
}

/**
 * Calcula todos os componentes financeiros de um produto com base no seu tipo
 */
export function calcularFinanceiroProduto(p: any): ProdutoFinanceiroCalculado {
  const tipo = p?.tipo || '';
  const venda = parseFinancialNumber(p?.valor_venda);

  let tarifa = 0;
  let taxa = 0;
  let comissao = 0;
  let markup = 0;
  let rav = 0;
  let totalDistribuido = 0;
  let saldoPendente = 0;
  let rentabilidade = 0;

  if (isTipoRav(tipo)) {
    // Para produtos do tipo 'RAV - 12%' ou 'RAV', a remuneração é o RAV (ou a própria venda se não preenchido)
    const rawRav = parseFinancialNumber(p?.rav);
    rav = rawRav > 0 ? rawRav : venda;
    totalDistribuido = rav;
    saldoPendente = Math.abs(venda - rav) < 0.01 ? 0 : venda - rav;
    rentabilidade = rav * 0.88;
  } else if (isTipoMarkup(tipo)) {
    // Para produtos do tipo 'MARKUP', a remuneração é o Markup (ou a própria venda se não preenchido)
    const rawMarkup = parseFinancialNumber(p?.markup);
    markup = rawMarkup > 0 ? rawMarkup : venda;
    totalDistribuido = markup;
    saldoPendente = Math.abs(venda - markup) < 0.01 ? 0 : venda - markup;
    rentabilidade = markup;
  } else {
    // Para todos os demais tipos de produto (Aéreo, Hotel, etc.)
    taxa = parseFinancialNumber(p?.taxa);
    comissao = parseFinancialNumber(p?.comissao);
    const rawTarifa = parseFinancialNumber(p?.tarifa);

    if (rawTarifa > 0) {
      tarifa = rawTarifa;
    } else if (venda > 0 && (taxa > 0 || comissao > 0)) {
      tarifa = Math.max(0, venda - (taxa + comissao));
    }

    totalDistribuido = tarifa + taxa + comissao;
    saldoPendente = Math.abs(venda - totalDistribuido) < 0.01 ? 0 : venda - totalDistribuido;
    rentabilidade = comissao;
  }

  const isDetalhado = venda <= 0 || (venda > 0 && totalDistribuido > 0 && Math.abs(saldoPendente) < 0.01);

  return {
    venda,
    tarifa,
    taxa,
    comissao,
    markup,
    rav,
    ravLiquido: rav * 0.88,
    rentabilidade,
    totalDistribuido,
    saldoPendente,
    isDetalhado
  };
}

export interface TotaisFinanceirosViagem {
  totalVenda: number;
  totalTarifa: number;
  totalTaxa: number;
  totalComissao: number;
  totalMarkup: number;
  totalRav: number;
  totalRavLiquido: number;
  totalRentabilidade: number;
  hasProdutos: boolean;
  todosDetalhados: boolean;
}

/**
 * Consolida os totais financeiros de uma viagem acumulando seus produtos ou campos legados
 */
export function calcularTotaisViagem(v: any): TotaisFinanceirosViagem {
  const prods = Array.isArray(v?.produtos) ? v.produtos : [];
  let totalTarifa = 0;
  let totalTaxa = 0;
  let totalComissao = 0;
  let totalMarkup = 0;
  let totalRav = 0;
  let totalVenda = 0;
  let totalRentabilidade = 0;
  let todosDetalhados = true;

  if (prods.length > 0) {
    prods.forEach((p: any) => {
      const calc = calcularFinanceiroProduto(p);
      totalTarifa += calc.tarifa;
      totalTaxa += calc.taxa;
      totalComissao += calc.comissao;
      totalMarkup += calc.markup;
      totalRav += calc.rav;
      totalVenda += calc.venda;
      totalRentabilidade += calc.rentabilidade;

      if (!calc.isDetalhado) {
        todosDetalhados = false;
      }
    });

    if (totalVenda === 0) {
      totalVenda = parseFinancialNumber(v?.valor_total);
    }
  } else {
    totalVenda = parseFinancialNumber(v?.valor_total);
    totalRentabilidade = parseFinancialNumber(v?.rentabilidade);
    todosDetalhados = true;
  }

  return {
    totalVenda,
    totalTarifa,
    totalTaxa,
    totalComissao,
    totalMarkup,
    totalRav,
    totalRavLiquido: totalRav * 0.88,
    totalRentabilidade,
    hasProdutos: prods.length > 0,
    todosDetalhados
  };
}
