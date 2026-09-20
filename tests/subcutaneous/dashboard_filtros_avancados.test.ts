import { describe, it, expect } from 'vitest';
import {
  isTipoRav,
  isTipoMarkup,
  calcularFinanceiroProduto,
  calcularTotaisViagem,
  parseFinancialNumber
} from '../../src/utils/productFinancialHelper';

describe('Dashboard - Painel de Filtros Avançados Subcutâneo', () => {
  // Mock dataset de viagens operacionais com produtos, valores financeiros completos, pagamentos, origens, pax e tags
  const mockViagens = [
    {
      id: 'viagem-1',
      codigo_ref: 'V-001',
      destino: 'Orlando, EUA',
      destino_id: 'dest-orlando',
      consultor_id: 'user-ana',
      consultor_responsavel_id: 'user-ana',
      data_financeiro: '2026-02-10',
      data_ida: '2026-02-15',
      data_volta: '2026-02-25',
      valor_total: 5500,
      rentabilidade: 550,
      status: 'pos_venda',
      voucher_geral_anexado: true,
      tags: ['Família', 'Resort'],
      passageiros: [{ nome: 'Carlos Eduardo' }, { nome: 'Carla Silva' }, { nome: 'Lucas Silva' }, { nome: 'Ana Silva' }],
      cliente: { nome: 'Carlos Eduardo', documento: '12345678900', lead_origin: 'Instagram', classificacoes: ['VIP'] },
      produtos: [
        { id: 'p1', tipo: 'Aéreo Facial', fornecedor: 'LATAM', valor_venda: 3000, tarifa: 2500, taxa: 200, markup: 0, rav: 0, comissao: 300 },
        { id: 'p2', tipo: 'MARKUP', fornecedor: 'Agência', valor_venda: 500, tarifa: 0, taxa: 0, markup: 500, rav: 0, comissao: 0 },
        { id: 'p3', tipo: 'Carro', fornecedor: 'Movida', valor_venda: 2000, tarifa: 1750, taxa: 50, markup: 0, rav: 0, comissao: 200 }
      ],
      pagamentos: [
        { forma_recebimento_id: 'pix', forma_nome: 'Pix', valor: 3000 },
        { forma_recebimento_id: 'cartao_credito', forma_nome: 'Cartão de Crédito', valor: 2500 }
      ]
    },
    {
      id: 'viagem-2',
      codigo_ref: 'V-002',
      destino: 'Paris, França',
      destino_id: 'dest-paris',
      consultor_id: 'user-bruno',
      consultor_responsavel_id: 'user-bruno',
      data_financeiro: '2026-02-20',
      data_ida: '2026-03-01',
      data_volta: '2026-03-10',
      valor_total: 1800,
      rentabilidade: 282,
      status: 'fechado',
      voucher_geral_anexado: false,
      tags: ['Lua de Mel'],
      passageiros: [{ nome: 'Mariana Lima' }, { nome: 'Pedro Lima' }],
      cliente: { nome: 'Mariana Lima', documento: '98765432100', lead_origin: 'Indicação', classificacoes: ['Casal'] },
      produtos: [
        { id: 'p4', tipo: 'Aéreo Facial', fornecedor: 'Air France', valor_venda: 1600, tarifa: 1400, taxa: 100, markup: 0, rav: 0, comissao: 100 },
        { id: 'p5', tipo: 'RAV - 12%', fornecedor: 'Agência', valor_venda: 200, tarifa: 0, taxa: 0, markup: 0, rav: 200, comissao: 0 }
      ],
      pagamentos: [
        { forma_recebimento_id: 'boleto', forma_nome: 'Boleto', valor: 1800 }
      ]
    },
    {
      id: 'viagem-3',
      codigo_ref: 'V-003',
      destino: 'Cancún, México',
      destino_id: 'dest-cancun',
      consultor_id: 'user-carlos',
      consultor_responsavel_id: 'user-carlos',
      data_financeiro: '2026-04-05',
      data_ida: '2026-05-10',
      data_volta: '2026-05-20',
      valor_total: 8900,
      rentabilidade: 1554,
      status: 'pre_embarque',
      voucher_geral_anexado: false,
      tags: ['Corporativo', 'VIP'],
      passageiros: [{ nome: 'Roberto Silva' }],
      cliente: { nome: 'Roberto Silva', documento: '11122233344', lead_origin: 'Google', classificacoes: ['Corporativo'] },
      produtos: [
        { id: 'p6', tipo: 'Hotel', fornecedor: 'Resort Cancún Palace', valor_venda: 6000, tarifa: 5300, taxa: 300, markup: 0, rav: 0, comissao: 400 },
        { id: 'p7', tipo: 'MARKUP', fornecedor: 'Agência', valor_venda: 500, markup: 500 },
        { id: 'p8', tipo: 'RAV - 12%', fornecedor: 'Agência', valor_venda: 300, rav: 300 },
        { id: 'p9', tipo: 'Carro', fornecedor: 'Hertz', valor_venda: 2100, tarifa: 1700, taxa: 110, markup: 0, rav: 0, comissao: 290 }
      ],
      pagamentos: [
        { forma_recebimento_id: 'faturado', forma_nome: 'Faturado', valor: 8900 }
      ]
    },
    {
      id: 'viagem-4',
      codigo_ref: 'V-004',
      destino: 'Bariloche, Argentina',
      destino_id: 'dest-bariloche',
      consultor_id: 'user-ana',
      consultor_responsavel_id: 'user-ana',
      data_financeiro: '2026-06-15',
      data_ida: '2026-07-01',
      data_volta: '2026-07-10',
      valor_total: 15000,
      rentabilidade: 1500,
      status: 'fechado',
      voucher_geral_anexado: true,
      tags: ['Grupo Disney', 'Aventura'],
      passageiros: [{ nome: 'P1' }, { nome: 'P2' }, { nome: 'P3' }, { nome: 'P4' }, { nome: 'P5' }, { nome: 'P6' }, { nome: 'P7' }],
      cliente: { nome: 'Grupo Neve 2026', documento: '55566677788', lead_origin: 'WhatsApp', classificacoes: ['Grupo'] },
      produtos: [
        { id: 'p10', tipo: 'Aéreo Operadora', fornecedor: 'Aerolíneas Argentinas', valor_venda: 9000, tarifa: 7500, taxa: 600, markup: 0, rav: 0, comissao: 900 },
        { id: 'p11', tipo: 'Hotel', fornecedor: 'Llao Llao Resort', valor_venda: 6000, tarifa: 5000, taxa: 400, markup: 0, rav: 0, comissao: 600 }
      ],
      pagamentos: [
        { forma_recebimento_id: 'pix', forma_nome: 'Pix', valor: 15000 }
      ]
    }
  ];

  // Função pura de filtragem subcutânea espelhando as regras implementadas no Dashboard
  function filtrarViagensSubcutaneo(viagens: any[], filtros: {
    advProdutos?: string[];
    advProdutoMatchMode?: 'AND' | 'OR';
    advDestinos?: string[];
    advFornecedor?: string;
    advValorMin?: number | null;
    advValorMax?: number | null;
    advTarifaMin?: number | null;
    advTarifaMax?: number | null;
    advTaxaMin?: number | null;
    advTaxaMax?: number | null;
    advComissaoMin?: number | null;
    advComissaoMax?: number | null;
    advMarkupMin?: number | null;
    advMarkupMax?: number | null;
    advRavMin?: number | null;
    advRavMax?: number | null;
    advRentabilidadeMin?: number | null;
    advRentabilidadeMax?: number | null;
    advMarkupRav?: 'todos' | 'com_markup' | 'com_rav' | 'com_markup_ou_rav' | 'com_markup_e_rav' | 'apenas_comissao' | 'sem_markup_rav';
    advAnexos?: 'todos' | 'com_anexo' | 'sem_anexo' | 'com_voucher' | 'sem_voucher';
    advMesAno?: string;
    advConsultores?: string[];
    advFormasRecebimento?: string[];
    advOrigensLead?: string[];
    advPaxFaixas?: string[];
    advTags?: string[];
    dataFinStart?: string;
    dataFinEnd?: string;
    dataIdaStart?: string;
    dataIdaEnd?: string;
    dataVoltaStart?: string;
    dataVoltaEnd?: string;
  }) {
    const {
      advProdutos = [],
      advProdutoMatchMode = 'AND',
      advDestinos = [],
      advFornecedor = '',
      advValorMin = null,
      advValorMax = null,
      advTarifaMin = null,
      advTarifaMax = null,
      advTaxaMin = null,
      advTaxaMax = null,
      advComissaoMin = null,
      advComissaoMax = null,
      advMarkupMin = null,
      advMarkupMax = null,
      advRavMin = null,
      advRavMax = null,
      advRentabilidadeMin = null,
      advRentabilidadeMax = null,
      advMarkupRav = 'todos',
      advAnexos = 'todos',
      advMesAno = '',
      advConsultores = [],
      advFormasRecebimento = [],
      advOrigensLead = [],
      advPaxFaixas = [],
      advTags = [],
      dataFinStart = '',
      dataFinEnd = '',
      dataIdaStart = '',
      dataIdaEnd = '',
      dataVoltaStart = '',
      dataVoltaEnd = ''
    } = filtros;

    return viagens.filter(v => {
      // Datas
      if (dataFinStart && (!v.data_financeiro || v.data_financeiro < dataFinStart)) return false;
      if (dataFinEnd && (!v.data_financeiro || v.data_financeiro > dataFinEnd)) return false;
      if (dataIdaStart && (!v.data_ida || v.data_ida < dataIdaStart)) return false;
      if (dataIdaEnd && (!v.data_ida || v.data_ida > dataIdaEnd)) return false;
      if (dataVoltaStart && (!v.data_volta || v.data_volta < dataVoltaStart)) return false;
      if (dataVoltaEnd && (!v.data_volta || v.data_volta > dataVoltaEnd)) return false;

      // Atalho Mês/Ano (YYYY-MM)
      if (advMesAno) {
        const rawDate = v.data_financeiro || v.data_ida || '';
        if (rawDate.substring(0, 7) !== advMesAno) return false;
      }

      // Produtos (Regra E vs OU)
      if (advProdutos.length > 0) {
        const prods = Array.isArray(v.produtos) ? v.produtos : [];
        const tripProdTypes = prods.map((p: any) => (p.tipo || '').trim().toLowerCase());

        if (advProdutoMatchMode === 'AND') {
          const hasAll = advProdutos.every(wanted =>
            tripProdTypes.some((t: string) => t.includes(wanted.toLowerCase()) || wanted.toLowerCase().includes(t))
          );
          if (!hasAll) return false;
        } else {
          const hasAny = advProdutos.some(wanted =>
            tripProdTypes.some((t: string) => t.includes(wanted.toLowerCase()) || wanted.toLowerCase().includes(t))
          );
          if (!hasAny) return false;
        }
      }

      // Destinos
      if (advDestinos.length > 0) {
        const destNome = (v.destino || '').toLowerCase();
        const destId = v.destino_id || '';
        const matchesDest = advDestinos.some(d =>
          destNome.includes(d.toLowerCase()) || destId === d
        );
        if (!matchesDest) return false;
      }

      // Fornecedor
      if (advFornecedor.trim()) {
        const fornQ = advFornecedor.trim().toLowerCase();
        const prods = Array.isArray(v.produtos) ? v.produtos : [];
        if (!prods.some((p: any) => (p.fornecedor || '').toLowerCase().includes(fornQ))) return false;
      }

      // Valores Financeiros dos Produtos & Viagem
      const totals = calcularTotaisViagem(v);

      if (advValorMin !== null && totals.totalVenda < advValorMin) return false;
      if (advValorMax !== null && totals.totalVenda > advValorMax) return false;
      if (advTarifaMin !== null && totals.totalTarifa < advTarifaMin) return false;
      if (advTarifaMax !== null && totals.totalTarifa > advTarifaMax) return false;
      if (advTaxaMin !== null && totals.totalTaxa < advTaxaMin) return false;
      if (advTaxaMax !== null && totals.totalTaxa > advTaxaMax) return false;
      if (advComissaoMin !== null && totals.totalComissao < advComissaoMin) return false;
      if (advComissaoMax !== null && totals.totalComissao > advComissaoMax) return false;
      if (advMarkupMin !== null && totals.totalMarkup < advMarkupMin) return false;
      if (advMarkupMax !== null && totals.totalMarkup > advMarkupMax) return false;
      if (advRavMin !== null && totals.totalRav < advRavMin) return false;
      if (advRavMax !== null && totals.totalRav > advRavMax) return false;
      if (advRentabilidadeMin !== null && totals.totalRentabilidade < advRentabilidadeMin) return false;
      if (advRentabilidadeMax !== null && totals.totalRentabilidade > advRentabilidadeMax) return false;

      // Tipo de Margem de Rentabilidade
      if (advMarkupRav !== 'todos') {
        if (advMarkupRav === 'com_markup' && totals.totalMarkup <= 0) return false;
        if (advMarkupRav === 'com_rav' && totals.totalRav <= 0) return false;
        if (advMarkupRav === 'com_markup_ou_rav' && totals.totalMarkup <= 0 && totals.totalRav <= 0) return false;
        if (advMarkupRav === 'com_markup_e_rav' && (totals.totalMarkup <= 0 || totals.totalRav <= 0)) return false;
        if (advMarkupRav === 'apenas_comissao' && (totals.totalComissao <= 0 || totals.totalMarkup > 0 || totals.totalRav > 0)) return false;
        if (advMarkupRav === 'sem_markup_rav' && (totals.totalMarkup > 0 || totals.totalRav > 0)) return false;
      }

      // Status de Arquivos & Anexos
      if (advAnexos !== 'todos') {
        const hasVoucherGeral = !!v.voucher_geral_anexado;
        if (advAnexos === 'com_anexo' && !hasVoucherGeral) return false;
        if (advAnexos === 'sem_anexo' && hasVoucherGeral) return false;
        if (advAnexos === 'com_voucher' && !hasVoucherGeral) return false;
        if (advAnexos === 'sem_voucher' && hasVoucherGeral) return false;
      }

      // Consultores
      if (advConsultores.length > 0) {
        const cId = v.consultor_id || v.consultor_responsavel_id || '';
        if (!advConsultores.includes(cId)) return false;
      }

      // Formas de Recebimento
      if (advFormasRecebimento.length > 0) {
        const pags = Array.isArray(v.pagamentos) ? v.pagamentos : [];
        const hasForma = pags.some((p: any) => advFormasRecebimento.includes(p.forma_recebimento_id));
        if (!hasForma) return false;
      }

      // Origem do Lead
      if (advOrigensLead.length > 0) {
        const leadOrig = (v.cliente?.lead_origin || '').trim();
        const matchesLead = advOrigensLead.some(o => o.toLowerCase() === leadOrig.toLowerCase());
        if (!matchesLead) return false;
      }

      // Faixas de Passageiros (PAX)
      if (advPaxFaixas.length > 0) {
        const paxCount = Array.isArray(v.passageiros) && v.passageiros.length > 0 ? v.passageiros.length : 1;
        const matchesPax = advPaxFaixas.some(faixa => {
          if (faixa === '1' && paxCount === 1) return true;
          if (faixa === '2' && paxCount === 2) return true;
          if (faixa === '3-5' && paxCount >= 3 && paxCount <= 5) return true;
          if (faixa === '6+' && paxCount >= 6) return true;
          return false;
        });
        if (!matchesPax) return false;
      }

      // Tags / Classificações
      if (advTags.length > 0) {
        const vTags = Array.isArray(v.tags) ? v.tags : [];
        const cTags = Array.isArray(v.cliente?.classificacoes) ? v.cliente.classificacoes : [];
        const allTags = [...vTags, ...cTags].map(t => (t || '').trim().toLowerCase());

        const matchesTag = advTags.some(wanted =>
          allTags.includes(wanted.toLowerCase())
        );
        if (!matchesTag) return false;
      }

      return true;
    });
  }

  // ==================== TESTES SUBCUTÂNEOS ====================

  it('deve identificar corretamente os tipos de produto RAV e MARKUP', () => {
    // Setup & Action & Assert
    expect(isTipoRav('RAV - 12%')).toBe(true);
    expect(isTipoRav('RAV')).toBe(true);
    expect(isTipoRav('rav')).toBe(true);
    expect(isTipoRav('Aéreo Facial')).toBe(false);

    expect(isTipoMarkup('MARKUP')).toBe(true);
    expect(isTipoMarkup('markup')).toBe(true);
    expect(isTipoMarkup('Hotel')).toBe(false);
  });

  it('deve calcular produto do tipo RAV considerando apenas Venda e RAV', () => {
    // Setup
    const prodRav = { tipo: 'RAV - 12%', valor_venda: 250, rav: 250, taxa: 0, comissao: 0 };

    // Action
    const res = calcularFinanceiroProduto(prodRav);

    // Assert
    expect(res.venda).toBe(250);
    expect(res.rav).toBe(250);
    expect(res.ravLiquido).toBeCloseTo(220, 2); // 250 * 0.88
    expect(res.rentabilidade).toBeCloseTo(220, 2);
    expect(res.tarifa).toBe(0);
    expect(res.taxa).toBe(0);
    expect(res.comissao).toBe(0);
    expect(res.markup).toBe(0);
    expect(res.isDetalhado).toBe(true);
  });

  it('deve calcular produto do tipo MARKUP considerando apenas Venda e MARKUP', () => {
    // Setup
    const prodMkp = { tipo: 'MARKUP', valor_venda: 600, markup: 600 };

    // Action
    const res = calcularFinanceiroProduto(prodMkp);

    // Assert
    expect(res.venda).toBe(600);
    expect(res.markup).toBe(600);
    expect(res.rentabilidade).toBe(600);
    expect(res.rav).toBe(0);
    expect(res.tarifa).toBe(0);
    expect(res.taxa).toBe(0);
    expect(res.comissao).toBe(0);
    expect(res.isDetalhado).toBe(true);
  });

  it('deve zerar markup e rav em produtos padrão de Aéreo ou Hotel', () => {
    // Setup
    const prodAereo = { tipo: 'Aéreo Facial', valor_venda: 3000, tarifa: 2500, taxa: 200, comissao: 300, markup: 50, rav: 50 };

    // Action
    const res = calcularFinanceiroProduto(prodAereo);

    // Assert
    expect(res.venda).toBe(3000);
    expect(res.tarifa).toBe(2500);
    expect(res.taxa).toBe(200);
    expect(res.comissao).toBe(300);
    expect(res.markup).toBe(0); // markup ignorado em produto aéreo
    expect(res.rav).toBe(0); // rav ignorada em produto aéreo
    expect(res.rentabilidade).toBe(300);
    expect(res.isDetalhado).toBe(true);
  });

  it('deve filtrar apenas viagens cujos produtos possuem Markup (> R$ 0)', () => {
    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, {
      advMarkupRav: 'com_markup'
    });

    // Assert: Viagens 1 e 3 possuem produtos do tipo MARKUP
    expect(resultado.map(v => v.id)).toEqual(['viagem-1', 'viagem-3']);
  });

  it('deve filtrar apenas viagens cujos produtos possuem RAV (> R$ 0)', () => {
    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, {
      advMarkupRav: 'com_rav'
    });

    // Assert: Viagens 2 e 3 possuem produtos do tipo RAV
    expect(resultado.map(v => v.id)).toEqual(['viagem-2', 'viagem-3']);
  });

  it('deve filtrar viagens com produtos que possuem Markup OU RAV (e/ou)', () => {
    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, {
      advMarkupRav: 'com_markup_ou_rav'
    });

    // Assert: Viagens 1 (tem markup), 2 (tem rav) e 3 (tem markup e rav)
    expect(resultado.map(v => v.id)).toEqual(['viagem-1', 'viagem-2', 'viagem-3']);
  });

  it('deve filtrar viagens que possuem simultaneamente produtos com Markup E com RAV', () => {
    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, {
      advMarkupRav: 'com_markup_e_rav'
    });

    // Assert: Apenas viagem 3 tem produtos com Markup E RAV simultaneamente
    expect(resultado.map(v => v.id)).toEqual(['viagem-3']);
  });

  it('deve filtrar viagens que possuem apenas comissão pura (sem markup nem rav)', () => {
    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, {
      advMarkupRav: 'apenas_comissao'
    });

    // Assert: Viagem 4 não tem nem markup nem rav, apenas comissão de Aéreo/Hotel
    expect(resultado.map(v => v.id)).toEqual(['viagem-4']);
  });

  it('deve filtrar viagens por faixas de Tarifa Base, Taxas e Comissão dos produtos', () => {
    // Action
    const resTarifa = filtrarViagensSubcutaneo(mockViagens, { advTarifaMin: 5000 });
    const resTaxa = filtrarViagensSubcutaneo(mockViagens, { advTaxaMax: 100 });
    const resComissao = filtrarViagensSubcutaneo(mockViagens, { advComissaoMin: 1000 });

    // Assert
    expect(resTarifa.map(v => v.id)).toEqual(['viagem-3', 'viagem-4']);
    expect(resTaxa.map(v => v.id)).toEqual(['viagem-2']);
    expect(resComissao.map(v => v.id)).toEqual(['viagem-4']);
  });

  it('deve filtrar viagens por múltiplos consultores simultaneamente em pills', () => {
    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, {
      advConsultores: ['user-ana', 'user-bruno']
    });

    // Assert
    expect(resultado.map(v => v.id)).toEqual(['viagem-1', 'viagem-2', 'viagem-4']);
  });

  it('deve combinar múltiplos critérios financeiros e operacionais com exatidão', () => {
    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, {
      advDestinos: ['Orlando'],
      advMarkupRav: 'com_markup',
      advFormasRecebimento: ['pix'],
      advPaxFaixas: ['3-5']
    });

    // Assert
    expect(resultado.map(v => v.id)).toEqual(['viagem-1']);
  });
});
