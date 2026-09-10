/**
 * RelatoriosController
 * Funções puras de controle e consolidação de inteligência comercial e relatórios.
 */

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
