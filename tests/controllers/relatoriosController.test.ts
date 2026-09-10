import { describe, it, expect } from 'vitest';

// Funções puras de controle extraídas e espelhadas da inteligência de Relatórios e Dashboard Comercial
export function calcularTaxaConversao(totalOrcamentos: number, orcamentosConcluidos: number): number {
  if (!totalOrcamentos || totalOrcamentos <= 0) return 0;
  return Number(((orcamentosConcluidos / totalOrcamentos) * 100).toFixed(1));
}

export function calcularTicketMedioPax(viagens: any[]): { ticketMedioViagem: number; ticketMedioPax: number } {
  if (!viagens || viagens.length === 0) {
    return { ticketMedioViagem: 0, ticketMedioPax: 0 };
  }

  let totalValor = 0;
  let totalPax = 0;

  viagens.forEach((v) => {
    totalValor += Number(v.valor_total || v.valorTotal || 0);
    const numPax = Array.isArray(v.passageiros) && v.passageiros.length > 0 ? v.passageiros.length : 1;
    totalPax += numPax;
  });

  const ticketMedioViagem = Math.round(totalValor / viagens.length);
  const ticketMedioPax = totalPax > 0 ? Math.round(totalValor / totalPax) : 0;

  return { ticketMedioViagem, ticketMedioPax };
}

export function agruparVendasPorCategoriaProduto(produtos: any[]): Record<string, { totalValor: number; quantidade: number }> {
  const categorias: Record<string, { totalValor: number; quantidade: number }> = {
    Aereo: { totalValor: 0, quantidade: 0 },
    Hospedagem: { totalValor: 0, quantidade: 0 },
    Cruzeiro: { totalValor: 0, quantidade: 0 },
    Seguro: { totalValor: 0, quantidade: 0 },
    Outros: { totalValor: 0, quantidade: 0 },
  };

  (produtos || []).forEach((p) => {
    if (p.status === 'cancelado') return;

    const tipo = (p.tipo || '').toLowerCase();
    const val = Number(p.valor_venda || p.valorVenda || 0);

    let catKey = 'Outros';
    if (tipo.includes('aéreo') || tipo.includes('aereo') || tipo.includes('voo')) catKey = 'Aereo';
    else if (tipo.includes('hotel') || tipo.includes('resort') || tipo.includes('hospedagem')) catKey = 'Hospedagem';
    else if (tipo.includes('cruzeiro') || tipo.includes('navio') || tipo.includes('msc')) catKey = 'Cruzeiro';
    else if (tipo.includes('seguro')) catKey = 'Seguro';

    categorias[catKey].totalValor += val;
    categorias[catKey].quantidade += 1;
  });

  return categorias;
}

export function gerarRankingConsultores(viagens: any[]): Array<{ consultorId: string; consultorNome: string; totalVendas: number; totalViagens: number }> {
  const consultoresMap = new Map<string, { consultorId: string; consultorNome: string; totalVendas: number; totalViagens: number }>();

  viagens.forEach((v) => {
    if (v.status === 'cancelado') return;

    const cId = v.consultor_id || v.consultorId || 'agencia';
    const cNome = v.consultor_nome || v.consultorNome || 'Consultor Não Identificado';
    const val = Number(v.valor_total || v.valorTotal || 0);

    if (!consultoresMap.has(cId)) {
      consultoresMap.set(cId, { consultorId: cId, consultorNome: cNome, totalVendas: 0, totalViagens: 0 });
    }

    const item = consultoresMap.get(cId)!;
    item.totalVendas += val;
    item.totalViagens += 1;
  });

  return Array.from(consultoresMap.values()).sort((a, b) => b.totalVendas - a.totalVendas);
}

describe('RelatoriosController - Métricas Comerciais e Desempenho da Agência', () => {
  it('deve calcular taxa de conversão do funil de vendas com proteção contra divisão por zero', () => {
    // Setup & Action & Assert
    expect(calcularTaxaConversao(10, 4)).toBe(40.0);
    expect(calcularTaxaConversao(25, 8)).toBe(32.0);
    expect(calcularTaxaConversao(0, 0)).toBe(0);
    expect(calcularTaxaConversao(-5, 2)).toBe(0);
  });

  it('deve calcular ticket médio por viagem e por passageiro (PAX)', () => {
    // Setup
    const viagens = [
      { valor_total: 10000, passageiros: [{ nome: 'Pax 1' }, { nome: 'Pax 2' }] }, // 2 pax
      { valor_total: 6000, passageiros: [] }, // fallback 1 pax
      { valor_total: 8000, passageiros: [{ nome: 'Pax A' }] }, // 1 pax
    ];

    // Action
    const resultado = calcularTicketMedioPax(viagens);

    // Assert
    // Total Valor = 24.000 / 3 viagens = 8.000
    // Total Pax = 2 + 1 + 1 = 4 pax -> 24.000 / 4 = 6.000
    expect(resultado.ticketMedioViagem).toBe(8000);
    expect(resultado.ticketMedioPax).toBe(6000);
  });

  it('deve agrupar faturamento por categoria de produto ignorando itens cancelados', () => {
    // Setup
    const produtos = [
      { tipo: 'Aéreo Internacional', valor_venda: 5000, status: 'confirmado' },
      { tipo: 'Hotel Resort', valor_venda: 4000, status: 'confirmado' },
      { tipo: 'Seguro Viagem', valor_venda: 500, status: 'confirmado' },
      { tipo: 'Cruzeiro MSC', valor_venda: 6000, status: 'confirmado' },
      { tipo: 'Passeio Ingresso', valor_venda: 800, status: 'confirmado' }, // Outros
      { tipo: 'Aéreo Cancelado', valor_venda: 3000, status: 'cancelado' }, // Não deve somar
    ];

    // Action
    const categorias = agruparVendasPorCategoriaProduto(produtos);

    // Assert
    expect(categorias.Aereo.totalValor).toBe(5000);
    expect(categorias.Hospedagem.totalValor).toBe(4000);
    expect(categorias.Seguro.totalValor).toBe(500);
    expect(categorias.Cruzeiro.totalValor).toBe(6000);
    expect(categorias.Outros.totalValor).toBe(800);
    expect(categorias.Aereo.quantidade).toBe(1);
  });

  it('deve gerar ranking de consultores ordenado decrescentemente por faturamento total', () => {
    // Setup
    const viagens = [
      { consultor_id: 'c1', consultor_nome: 'Marinna Morena', valor_total: 50000, status: 'fechado' },
      { consultor_id: 'c2', consultor_nome: 'Guto Brassaroto', valor_total: 80000, status: 'fechado' },
      { consultor_id: 'c1', consultor_nome: 'Marinna Morena', valor_total: 40000, status: 'fechado' },
      { consultor_id: 'c3', consultor_nome: 'Maria Carvalho', valor_total: 20000, status: 'cancelado' }, // Não deve contar
    ];

    // Action
    const ranking = gerarRankingConsultores(viagens);

    // Assert
    expect(ranking).toHaveLength(2);
    // 1º lugar: Marinna (50k + 40k = 90k)
    expect(ranking[0].consultorNome).toBe('Marinna Morena');
    expect(ranking[0].totalVendas).toBe(90000);
    expect(ranking[0].totalViagens).toBe(2);

    // 2º lugar: Guto (80k)
    expect(ranking[1].consultorNome).toBe('Guto Brassaroto');
    expect(ranking[1].totalVendas).toBe(80000);
  });
});
