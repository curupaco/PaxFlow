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

export interface FiltrosFaturamento {
  tipoProduto?: string;
  filtroRav?: 'todos' | 'com_rav' | 'sem_rav';
}

export interface CategoriaFaturamentoStat {
  tipo: string;
  faturamento: number;
  taxas: number;
  comissao: number;
  markup: number;
  rav: number;
  lucro: number;
  margem: number;
  quantidade: number;
}

export interface ResultadoFaturamentoLucratividade {
  faturamentoBruto: number;
  taxasTotal: number;
  comissaoTotal: number;
  markupTotal: number;
  ravTotal: number;
  lucroLiquidoReal: number;
  margemMedia: number;
  porCategoria: Record<string, CategoriaFaturamentoStat>;
  categoriasLista: CategoriaFaturamentoStat[];
  categorias: CategoriaFaturamentoStat[];
  totalProdutosFiltrados: number;
}

/**
 * Calcula os totalizadores e lucratividade por linha de produto com suporte a filtros
 */
export function calcularFaturamentoLucratividade(
  viagens: any[],
  locPagamentos: any[] = [],
  filtros: FiltrosFaturamento = {}
): ResultadoFaturamentoLucratividade {
  const tipoFiltro = (filtros.tipoProduto || 'todos').trim().toLowerCase();
  const filtroRav = filtros.filtroRav || 'todos';

  let faturamentoBruto = 0;
  let taxasTotal = 0;
  let comissaoTotal = 0;
  let markupTotal = 0;
  let ravTotal = 0;
  let totalSubtrair = 0;
  let totalProdutosFiltrados = 0;

  const porCategoria: Record<string, CategoriaFaturamentoStat> = {};
  const isFiltroAtivo = tipoFiltro !== 'todos' || filtroRav !== 'todos';

  (viagens || []).forEach((v: any) => {
    if (v.status === 'cancelada' || v.status === 'cancelado') return;

    const vPayments = (locPagamentos || []).filter((p: any) => 
      (p.viagem_id === v.id || p.viagemId === v.id) &&
      p.formas_recebimento &&
      ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
    );
    const subViagem = vPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);

    const prods = (v.produtos || []).filter((p: any) => p.status !== 'cancelado');

    prods.forEach((p: any) => {
      const tipoProd = p.tipo || 'Outros';
      const tipoProdLower = tipoProd.trim().toLowerCase();
      const pRav = Number(p.rav) || 0;

      // 1. Filtro por Produto / Categoria
      if (tipoFiltro !== 'todos' && tipoProdLower !== tipoFiltro) {
        return;
      }

      // 2. Filtro por RAV (<> 0)
      if (filtroRav === 'com_rav' && pRav === 0) {
        return;
      }
      if (filtroRav === 'sem_rav' && pRav !== 0) {
        return;
      }

      totalProdutosFiltrados++;

      const pVenda = Number(p.valor_venda ?? p.valorVenda ?? 0);
      const pTaxa = Number(p.taxa) || 0;
      const pComissao = Number(p.comissao) || 0;
      const pMarkup = Number(p.markup) || 0;
      const pRavLiquido = pRav * 0.88;
      const pLucro = pComissao + pMarkup + pRavLiquido;

      taxasTotal += pTaxa;
      comissaoTotal += pComissao;
      markupTotal += pMarkup;
      ravTotal += pRavLiquido;

      if (!porCategoria[tipoProd]) {
        porCategoria[tipoProd] = {
          tipo: tipoProd,
          faturamento: 0,
          taxas: 0,
          comissao: 0,
          markup: 0,
          rav: 0,
          lucro: 0,
          margem: 0,
          quantidade: 0
        };
      }

      porCategoria[tipoProd].faturamento += pVenda;
      porCategoria[tipoProd].taxas += pTaxa;
      porCategoria[tipoProd].comissao += pComissao;
      porCategoria[tipoProd].markup += pMarkup;
      porCategoria[tipoProd].rav += pRavLiquido;
      porCategoria[tipoProd].lucro += pLucro;
      porCategoria[tipoProd].quantidade += 1;

      if (isFiltroAtivo) {
        faturamentoBruto += pVenda;
      }
    });

    if (!isFiltroAtivo) {
      faturamentoBruto += Number(v.valor_total || v.valorTotal || 0);
      totalSubtrair += subViagem;
    }
  });

  if (!isFiltroAtivo) {
    faturamentoBruto = Math.max(0, faturamentoBruto - totalSubtrair);
  }

  const lucroLiquidoReal = Math.max(0, comissaoTotal + markupTotal + ravTotal - (!isFiltroAtivo ? totalSubtrair : 0));
  const margemMedia = faturamentoBruto > 0 ? Math.round((lucroLiquidoReal / faturamentoBruto) * 100) : 0;

  const categoriasLista = Object.values(porCategoria).map(cat => ({
    ...cat,
    margem: cat.faturamento > 0 ? Math.round((cat.lucro / cat.faturamento) * 100) : 0
  })).sort((a, b) => b.faturamento - a.faturamento);

  return {
    faturamentoBruto,
    taxasTotal,
    comissaoTotal,
    markupTotal,
    ravTotal,
    lucroLiquidoReal,
    margemMedia,
    porCategoria,
    categoriasLista,
    categorias: categoriasLista,
    totalProdutosFiltrados
  };
}

