import { describe, it, expect } from 'vitest';

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
        { id: 'p1', tipo: 'Aéreo Facial', fornecedor: 'LATAM', valor_venda: 3000, tarifa: 2500, taxa: 200, markup: 200, rav: 0, comissao: 100 },
        { id: 'p2', tipo: 'Carro', fornecedor: 'Movida', valor_venda: 2500, tarifa: 2200, taxa: 50, markup: 0, rav: 0, comissao: 250 }
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
        { id: 'p3', tipo: 'Aéreo Facial', fornecedor: 'Air France', valor_venda: 1800, tarifa: 1400, taxa: 100, markup: 0, rav: 150, comissao: 150 }
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
        { id: 'p4', tipo: 'Hotel', fornecedor: 'Resort Cancún Palace', valor_venda: 6000, tarifa: 4500, taxa: 300, markup: 500, rav: 300, comissao: 400 },
        { id: 'p5', tipo: 'Carro', fornecedor: 'Hertz', valor_venda: 2900, tarifa: 2400, taxa: 110, markup: 100, rav: 0, comissao: 290 }
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
        { id: 'p6', tipo: 'Aéreo Operadora', fornecedor: 'Aerolíneas Argentinas', valor_venda: 9000, tarifa: 7500, taxa: 600, markup: 0, rav: 0, comissao: 900 },
        { id: 'p7', tipo: 'Hotel', fornecedor: 'Llao Llao Resort', valor_venda: 6000, tarifa: 5000, taxa: 400, markup: 0, rav: 0, comissao: 600 }
      ],
      pagamentos: [
        { forma_recebimento_id: 'pix', forma_nome: 'Pix', valor: 15000 }
      ]
    }
  ];

  function parseFinancialNumber(val: any): number {
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

  function getTripFinancialTotals(v: any) {
    const prods = Array.isArray(v.produtos) ? v.produtos : [];
    let totalTarifa = 0;
    let totalTaxa = 0;
    let totalComissao = 0;
    let totalMarkup = 0;
    let totalRav = 0;
    let totalVenda = 0;
    let totalRentabilidade = 0;

    if (prods.length > 0) {
      prods.forEach((p: any) => {
        const tarifa = parseFinancialNumber(p.tarifa);
        const taxa = parseFinancialNumber(p.taxa);
        const comissao = parseFinancialNumber(p.comissao);
        const markup = parseFinancialNumber(p.markup);
        const rav = parseFinancialNumber(p.rav);
        const venda = parseFinancialNumber(p.valor_venda);

        totalTarifa += tarifa;
        totalTaxa += taxa;
        totalComissao += comissao;
        totalMarkup += markup;
        totalRav += rav;
        totalVenda += venda;
        totalRentabilidade += comissao + markup + (rav * 0.88);
      });

      if (totalVenda === 0) {
        totalVenda = parseFinancialNumber(v.valor_total);
      }
    } else {
      totalVenda = parseFinancialNumber(v.valor_total);
      totalRentabilidade = parseFinancialNumber(v.rentabilidade);
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
      hasProdutos: prods.length > 0
    };
  }

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
      const totals = getTripFinancialTotals(v);

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

      // Presença de Margens de Rentabilidade
      if (advMarkupRav !== 'todos') {
        if (advMarkupRav === 'com_markup' && totals.totalMarkup <= 0) return false;
        if (advMarkupRav === 'com_rav' && totals.totalRav <= 0) return false;
        if (advMarkupRav === 'com_markup_ou_rav' && totals.totalMarkup <= 0 && totals.totalRav <= 0) return false;
        if (advMarkupRav === 'com_markup_e_rav' && (totals.totalMarkup <= 0 || totals.totalRav <= 0)) return false;
        if (advMarkupRav === 'apenas_comissao' && (totals.totalComissao <= 0 || totals.totalMarkup > 0 || totals.totalRav > 0)) return false;
        if (advMarkupRav === 'sem_markup_rav' && (totals.totalMarkup > 0 || totals.totalRav > 0)) return false;
      }

      // Anexos & Vouchers
      if (advAnexos !== 'todos') {
        const hasVoucherGeral = !!v.voucher_geral_anexado;
        if (advAnexos === 'com_voucher' && !hasVoucherGeral) return false;
        if (advAnexos === 'sem_voucher' && hasVoucherGeral) return false;
      }

      // Consultores (Multi-Select)
      if (advConsultores.length > 0) {
        const vConsultor = v.consultor_id || v.consultor_responsavel_id;
        if (!advConsultores.includes(vConsultor)) return false;
      }

      // Formas de Recebimento
      if (advFormasRecebimento.length > 0) {
        const pags = Array.isArray(v.pagamentos) ? v.pagamentos : [];
        const matchesForma = advFormasRecebimento.some(f => {
          const fLower = f.toLowerCase();
          return pags.some((p: any) => {
            const pId = (p.forma_recebimento_id || '').toLowerCase();
            const pNome = (p.forma_nome || '').toLowerCase();
            return pId === fLower || pNome.includes(fLower) || fLower.includes(pNome);
          });
        });
        if (!matchesForma) return false;
      }

      // Origem do Lead
      if (advOrigensLead.length > 0) {
        const cliOrigem = (v.cliente?.lead_origin || v.lead_origin || '').toLowerCase();
        const matchesOrigem = advOrigensLead.some(o => {
          const oLower = o.toLowerCase();
          return cliOrigem.includes(oLower) || oLower.includes(cliOrigem);
        });
        if (!matchesOrigem) return false;
      }

      // Quantidade de Passageiros (PAX)
      if (advPaxFaixas.length > 0) {
        const paxCount = Array.isArray(v.passageiros) && v.passageiros.length > 0 ? v.passageiros.length : 1;
        const matchesPax = advPaxFaixas.some(faixa => {
          if (faixa === '1') return paxCount === 1;
          if (faixa === '2') return paxCount === 2;
          if (faixa === '3-5') return paxCount >= 3 && paxCount <= 5;
          if (faixa === '6+') return paxCount >= 6;
          return false;
        });
        if (!matchesPax) return false;
      }

      // Tags / Classificações
      if (advTags.length > 0) {
        const tripTags = [
          ...(Array.isArray(v.tags) ? v.tags : []),
          ...(v.cliente && Array.isArray(v.cliente.classificacoes) ? v.cliente.classificacoes : [])
        ].map(t => (typeof t === 'string' ? t.trim().toLowerCase() : ''));

        const matchesTag = advTags.some(wanted => {
          const wantedLower = wanted.toLowerCase();
          return tripTags.some(t => t.includes(wantedLower) || wantedLower.includes(t));
        });
        if (!matchesTag) return false;
      }

      return true;
    });
  }

  // 1. Teste de Consultores em Pills (Multi-Select)
  it('deve filtrar viagens por múltiplos consultores simultaneamente em pills', () => {
    // Setup
    const filtros = { advConsultores: ['user-ana', 'user-bruno'] };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert
    expect(resultado).toHaveLength(3);
    expect(resultado.map(r => r.id)).toEqual(['viagem-1', 'viagem-2', 'viagem-4']);
  });

  // 2. Teste de Formas de Recebimento
  it('deve filtrar viagens que possuem pagamento via Pix ou Cartão de Crédito', () => {
    // Setup
    const filtros = { advFormasRecebimento: ['pix'] };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert
    expect(resultado).toHaveLength(2);
    expect(resultado.map(r => r.id)).toEqual(['viagem-1', 'viagem-4']);
  });

  // 3. Teste de Origem do Lead
  it('deve filtrar viagens com base na origem do lead do cliente (Instagram vs Google)', () => {
    // Setup
    const filtros = { advOrigensLead: ['Instagram'] };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('viagem-1');
  });

  // 4. Teste de Faixas de Passageiros (PAX)
  it('deve filtrar viagens por faixa de passageiros (ex: Casal = 2 PAX e Grande Grupo = 6+ PAX)', () => {
    // Setup
    const filtrosCasal = { advPaxFaixas: ['2'] };
    const filtrosGrupo = { advPaxFaixas: ['6+'] };

    // Action
    const resultadoCasal = filtrarViagensSubcutaneo(mockViagens, filtrosCasal);
    const resultadoGrupo = filtrarViagensSubcutaneo(mockViagens, filtrosGrupo);

    // Assert
    expect(resultadoCasal).toHaveLength(1);
    expect(resultadoCasal[0].id).toBe('viagem-2');

    expect(resultadoGrupo).toHaveLength(1);
    expect(resultadoGrupo[0].id).toBe('viagem-4');
  });

  // 5. Teste de Tags / Classificações
  it('deve filtrar viagens por tags do cliente e da viagem (ex: VIP ou Aventura)', () => {
    // Setup
    const filtrosVIP = { advTags: ['VIP'] };
    const filtrosAventura = { advTags: ['Aventura'] };

    // Action
    const resultadoVIP = filtrarViagensSubcutaneo(mockViagens, filtrosVIP);
    const resultadoAventura = filtrarViagensSubcutaneo(mockViagens, filtrosAventura);

    // Assert
    expect(resultadoVIP.map(r => r.id)).toEqual(['viagem-1', 'viagem-3']);
    expect(resultadoAventura.map(r => r.id)).toEqual(['viagem-4']);
  });

  // 6. Teste de Produtos com Markup (com_markup)
  it('deve filtrar apenas viagens cujos produtos possuem Markup (> R$ 0)', () => {
    // Setup
    const filtros = { advMarkupRav: 'com_markup' as const };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert (viagem-1 tem markup 200, viagem-3 tem markup 600)
    expect(resultado).toHaveLength(2);
    expect(resultado.map(r => r.id)).toEqual(['viagem-1', 'viagem-3']);
  });

  // 7. Teste de Produtos com RAV (com_rav)
  it('deve filtrar apenas viagens cujos produtos possuem RAV (> R$ 0)', () => {
    // Setup
    const filtros = { advMarkupRav: 'com_rav' as const };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert (viagem-2 tem RAV 150, viagem-3 tem RAV 300)
    expect(resultado).toHaveLength(2);
    expect(resultado.map(r => r.id)).toEqual(['viagem-2', 'viagem-3']);
  });

  // 8. Teste de Produtos com Markup OU RAV (com_markup_ou_rav)
  it('deve filtrar viagens com produtos que possuem Markup OU RAV', () => {
    // Setup
    const filtros = { advMarkupRav: 'com_markup_ou_rav' as const };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert (viagem-1, viagem-2 e viagem-3 possuem markup ou rav)
    expect(resultado).toHaveLength(3);
    expect(resultado.map(r => r.id)).toEqual(['viagem-1', 'viagem-2', 'viagem-3']);
  });

  // 9. Teste de Produtos com Ambos (Markup E RAV - com_markup_e_rav)
  it('deve filtrar viagens que possuem simultaneamente produtos com Markup E com RAV', () => {
    // Setup
    const filtros = { advMarkupRav: 'com_markup_e_rav' as const };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert (Apenas viagem-3 possui ambos markup 600 e rav 300)
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('viagem-3');
  });

  // 10. Teste de Viagens com Apenas Comissão (apenas_comissao)
  it('deve filtrar viagens que possuem apenas comissão pura (sem markup nem rav)', () => {
    // Setup
    const filtros = { advMarkupRav: 'apenas_comissao' as const };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert (Apenas viagem-4 tem comissao 1500 e zero markup/rav)
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('viagem-4');
  });

  // 11. Teste de Filtros por Todos os Valores Financeiros do Produto (Tarifa, Taxa, Comissão)
  it('deve filtrar viagens por faixas de Tarifa Base, Taxas e Comissão dos produtos', () => {
    // Setup: Viagens com Tarifa total > R$ 10.000
    const filtrosTarifaAlta = { advTarifaMin: 10000 };
    // Setup: Viagens com Taxa total entre R$ 300 e R$ 500
    const filtrosTaxaFaixa = { advTaxaMin: 300, advTaxaMax: 500 };
    // Setup: Viagens com Comissão total >= R$ 1.000
    const filtrosComissaoAlta = { advComissaoMin: 1000 };

    // Action
    const resTarifa = filtrarViagensSubcutaneo(mockViagens, filtrosTarifaAlta);
    const resTaxa = filtrarViagensSubcutaneo(mockViagens, filtrosTaxaFaixa);
    const resComissao = filtrarViagensSubcutaneo(mockViagens, filtrosComissaoAlta);

    // Assert
    expect(resTarifa).toHaveLength(1);
    expect(resTarifa[0].id).toBe('viagem-4'); // Tarifa = 12500

    expect(resTaxa).toHaveLength(1);
    expect(resTaxa[0].id).toBe('viagem-3'); // Taxa = 410

    expect(resComissao).toHaveLength(1);
    expect(resComissao[0].id).toBe('viagem-4'); // Comissao = 1500
  });

  // 12. Teste de Combinação Extrema com Todos os Valores Financeiros
  it('deve combinar múltiplos critérios financeiros e operacionais com exatidão', () => {
    // Setup: Consultor Ana + Com Markup + Tarifa Min 4000 + Venda Min 5000
    const filtros = {
      advConsultores: ['user-ana'],
      advMarkupRav: 'com_markup' as const,
      advTarifaMin: 4000,
      advValorMin: 5000
    };

    // Action
    const filtrados = filtrarViagensSubcutaneo(mockViagens, filtros);
    const totals = getTripFinancialTotals(filtrados[0]);

    // Assert
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].id).toBe('viagem-1');
    expect(totals.totalVenda).toBe(5500);
    expect(totals.totalTarifa).toBe(4700);
    expect(totals.totalTaxa).toBe(250);
    expect(totals.totalComissao).toBe(350);
    expect(totals.totalMarkup).toBe(200);
    expect(totals.totalRav).toBe(0);
    expect(totals.totalRentabilidade).toBe(550);
  });
});
