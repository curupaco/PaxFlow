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

export function gerarRankingConsultores(
  viagens: any[],
  consultores?: any[]
): Array<{ consultorId: string; consultorNome: string; totalVendas: number; totalViagens: number }> {
  const consultoresMap = new Map<string, { consultorId: string; consultorNome: string; totalVendas: number; totalViagens: number }>();
  const idsNaoParticipantes = new Set(
    (consultores || [])
      .filter(c => c.participa_metricas === false || c.participaMetricas === false)
      .map(c => c.id)
  );

  viagens.forEach((v) => {
    if (v.status === 'cancelado') return;

    const cId = v.consultor_id || v.consultorId || 'agencia';
    if (idsNaoParticipantes.has(cId)) return;

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

export interface ItemExtratoRecebimento {
  id: string;
  viagemId: string;
  viagemCodigoRef: string;
  clienteNome: string;
  destino: string;
  codigoLocalizador: string;
  formaRecebimentoNome: string;
  formaRecebimentoIcone: string;
  valor: number;
  data: string;
  dataFormatada: string;
  consultorId: string;
  consultorNome: string;
  produtosVinculados: Array<{
    id: string;
    tipo: string;
    fornecedor: string;
    descricao: string;
    valorVenda: number;
  }>;
}

export function formatarDataSimplesBR(dataStr?: string): string {
  if (!dataStr) return '';
  try {
    const raw = dataStr.includes('T') ? dataStr.split('T')[0] : dataStr;
    const partes = raw.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    const d = new Date(dataStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch (e) {}
  return dataStr;
}

export function processarExtratoRecebimentos(
  viagens: any[],
  locPagamentos: any[],
  consultores: any[] = []
): ItemExtratoRecebimento[] {
  const viagensMap = new Map<string, any>();
  (viagens || []).forEach(v => {
    if (v && v.id) viagensMap.set(v.id, v);
  });

  const consultoresMap = new Map<string, string>();
  (consultores || []).forEach(c => {
    if (c && c.id) consultoresMap.set(c.id, c.nome || c.email || 'Consultor');
  });

  const itens: ItemExtratoRecebimento[] = [];

  (locPagamentos || []).forEach(p => {
    const vId = p.viagem_id || p.viagemId;
    const v = viagensMap.get(vId);
    if (!v || v.status === 'cancelada') return;

    const locUpper = (p.codigo_localizador || '').trim().toUpperCase();
    const formaNome = p.formas_recebimento?.nome || p.forma_nome || 'Outros';
    const formaIcone = p.formas_recebimento?.icone || p.forma_icone || '💰';
    const valor = Number(p.valor) || 0;
    const dataCriacao = p.created_at || p.data || v.created_at || '';

    // Localiza os produtos da viagem vinculados a este localizador (LOC)
    const produtosViagem = v.produtos || [];
    const produtosVinculados = produtosViagem
      .filter((prod: any) => {
        const prodLoc = (prod.codigo_reserva || prod.codigoReserva || prod.codigo_localizador || '').trim().toUpperCase();
        if (!locUpper || locUpper === 'SEM LOCALIZADOR') {
          return !prodLoc || prodLoc === 'SEM LOCALIZADOR';
        }
        return prodLoc === locUpper;
      })
      .map((prod: any) => ({
        id: prod.id || '',
        tipo: prod.tipo || 'Serviço',
        fornecedor: prod.fornecedor || 'Fornecedor',
        descricao: prod.descricao || '',
        valorVenda: Number(prod.valor_venda || prod.valorVenda || 0)
      }));

    const cId = v.consultor_id || v.consultorId || '';
    const cNome = consultoresMap.get(cId) || v.consultor_nome || v.consultorNome || 'Agência';

    itens.push({
      id: p.id || `pag-${Math.random().toString(36).substr(2, 9)}`,
      viagemId: v.id,
      viagemCodigoRef: v.codigo_ref || v.codigoRef || '',
      clienteNome: v.cliente?.nome || v.nome_cliente || v.passageiro || 'Cliente não informado',
      destino: v.destino || 'Destino não informado',
      codigoLocalizador: locUpper || 'SEM LOCALIZADOR',
      formaRecebimentoNome: formaNome,
      formaRecebimentoIcone: formaIcone,
      valor,
      data: dataCriacao,
      dataFormatada: formatarDataSimplesBR(dataCriacao),
      consultorId: cId,
      consultorNome: cNome,
      produtosVinculados
    });
  });

  return itens.sort((a, b) => b.data.localeCompare(a.data));
}

