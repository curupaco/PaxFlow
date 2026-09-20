import { describe, it, expect } from 'vitest';

describe('Dashboard - Painel de Filtros Avançados Subcutâneo', () => {
  // Mock dataset de viagens operacionais com produtos, valores, markup, rav, pagamentos, origens, pax e tags
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
      rentabilidade: 1200,
      status: 'pos_venda',
      voucher_geral_anexado: true,
      tags: ['Família', 'Resort'],
      passageiros: [{ nome: 'Carlos Eduardo' }, { nome: 'Carla Silva' }, { nome: 'Lucas Silva' }, { nome: 'Ana Silva' }],
      cliente: { nome: 'Carlos Eduardo', documento: '12345678900', lead_origin: 'Instagram', classificacoes: ['VIP'] },
      produtos: [
        { id: 'p1', tipo: 'Aéreo Facial', fornecedor: 'LATAM', valor_venda: 3000, markup: 200, rav: 0, comissao: 100 },
        { id: 'p2', tipo: 'Carro', fornecedor: 'Movida', valor_venda: 2500, markup: 0, rav: 0, comissao: 250 }
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
      rentabilidade: 350,
      status: 'fechado',
      voucher_geral_anexado: false,
      tags: ['Lua de Mel'],
      passageiros: [{ nome: 'Mariana Lima' }, { nome: 'Pedro Lima' }],
      cliente: { nome: 'Mariana Lima', documento: '98765432100', lead_origin: 'Indicação', classificacoes: ['Casal'] },
      produtos: [
        { id: 'p3', tipo: 'Aéreo Facial', fornecedor: 'Air France', valor_venda: 1800, markup: 0, rav: 150, comissao: 150 }
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
      rentabilidade: 2100,
      status: 'pre_embarque',
      voucher_geral_anexado: false,
      tags: ['Corporativo', 'VIP'],
      passageiros: [{ nome: 'Roberto Silva' }],
      cliente: { nome: 'Roberto Silva', documento: '11122233344', lead_origin: 'Google', classificacoes: ['Corporativo'] },
      produtos: [
        { id: 'p4', tipo: 'Hotel', fornecedor: 'Resort Cancún Palace', valor_venda: 6000, markup: 500, rav: 300, comissao: 400 },
        { id: 'p5', tipo: 'Carro', fornecedor: 'Hertz', valor_venda: 2900, markup: 100, rav: 0, comissao: 290 }
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
      rentabilidade: 3200,
      status: 'fechado',
      voucher_geral_anexado: true,
      tags: ['Grupo Disney', 'Aventura'],
      passageiros: [{ nome: 'P1' }, { nome: 'P2' }, { nome: 'P3' }, { nome: 'P4' }, { nome: 'P5' }, { nome: 'P6' }, { nome: 'P7' }],
      cliente: { nome: 'Grupo Neve 2026', documento: '55566677788', lead_origin: 'WhatsApp', classificacoes: ['Grupo'] },
      produtos: [
        { id: 'p6', tipo: 'Aéreo Operadora', fornecedor: 'Aerolíneas Argentinas', valor_venda: 9000, markup: 0, rav: 0, comissao: 900 },
        { id: 'p7', tipo: 'Hotel', fornecedor: 'Llao Llao Resort', valor_venda: 6000, markup: 0, rav: 0, comissao: 600 }
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
    advRentabilidadeMin?: number | null;
    advRentabilidadeMax?: number | null;
    advMarkupRav?: 'todos' | 'com_markup' | 'com_rav' | 'com_markup_ou_rav' | 'com_markup_e_rav' | 'sem_markup_rav';
    advMarkupMin?: number | null;
    advMarkupMax?: number | null;
    advRavMin?: number | null;
    advRavMax?: number | null;
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
      advRentabilidadeMin = null,
      advRentabilidadeMax = null,
      advMarkupRav = 'todos',
      advMarkupMin = null,
      advMarkupMax = null,
      advRavMin = null,
      advRavMax = null,
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

      // Valores Financeiros
      const valTotal = Number(v.valor_total) || 0;
      if (advValorMin !== null && valTotal < advValorMin) return false;
      if (advValorMax !== null && valTotal > advValorMax) return false;

      const valRent = Number(v.rentabilidade) || 0;
      if (advRentabilidadeMin !== null && valRent < advRentabilidadeMin) return false;
      if (advRentabilidadeMax !== null && valRent > advRentabilidadeMax) return false;

      // Produtos com Markup & RAV
      const prodsMarkupRav = Array.isArray(v.produtos) ? v.produtos : [];
      const totalTripMarkup = prodsMarkupRav.reduce((sum: number, p: any) => sum + (Number(p.markup) || 0), 0);
      const totalTripRav = prodsMarkupRav.reduce((sum: number, p: any) => sum + (Number(p.rav) || 0), 0);

      if (advMarkupRav !== 'todos') {
        if (advMarkupRav === 'com_markup' && totalTripMarkup <= 0) return false;
        if (advMarkupRav === 'com_rav' && totalTripRav <= 0) return false;
        if (advMarkupRav === 'com_markup_ou_rav' && totalTripMarkup <= 0 && totalTripRav <= 0) return false;
        if (advMarkupRav === 'com_markup_e_rav' && (totalTripMarkup <= 0 || totalTripRav <= 0)) return false;
        if (advMarkupRav === 'sem_markup_rav' && (totalTripMarkup > 0 || totalTripRav > 0)) return false;
      }

      if (advMarkupMin !== null && totalTripMarkup < advMarkupMin) return false;
      if (advMarkupMax !== null && totalTripMarkup > advMarkupMax) return false;
      if (advRavMin !== null && totalTripRav < advRavMin) return false;
      if (advRavMax !== null && totalTripRav > advRavMax) return false;

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

  // 10. Teste de Viagens Sem Markup nem RAV (sem_markup_rav)
  it('deve filtrar viagens que NÃO possuem nem Markup nem RAV (apenas comissão)', () => {
    // Setup
    const filtros = { advMarkupRav: 'sem_markup_rav' as const };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert (Apenas viagem-4 não tem markup nem rav)
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('viagem-4');
  });

  // 11. Teste de Faixas Numéricas de Markup e RAV (advMarkupMin / advRavMin)
  it('deve filtrar viagens por faixas numéricas de Markup e RAV', () => {
    // Setup: Viagens com Markup >= R$ 500
    const filtrosMarkupAlto = { advMarkupMin: 500 };
    // Setup: Viagens com RAV entre R$ 100 e R$ 200
    const filtrosRavFaixa = { advRavMin: 100, advRavMax: 200 };

    // Action
    const resMarkup = filtrarViagensSubcutaneo(mockViagens, filtrosMarkupAlto);
    const resRav = filtrarViagensSubcutaneo(mockViagens, filtrosRavFaixa);

    // Assert
    expect(resMarkup).toHaveLength(1);
    expect(resMarkup[0].id).toBe('viagem-3'); // Markup total = 600

    expect(resRav).toHaveLength(1);
    expect(resRav[0].id).toBe('viagem-2'); // RAV total = 150
  });

  // 12. Teste de Combinação Extrema com Resumo Financeiro
  it('deve combinar múltiplos critérios novos (Consultor Ana + Origem Instagram + 3-5 PAX + Tag VIP + Com Markup)', () => {
    // Setup
    const filtros = {
      advConsultores: ['user-ana'],
      advOrigensLead: ['Instagram'],
      advPaxFaixas: ['3-5'],
      advTags: ['VIP'],
      advMarkupRav: 'com_markup' as const
    };

    // Action
    const filtrados = filtrarViagensSubcutaneo(mockViagens, filtros);
    const totalVendas = filtrados.reduce((acc, v) => acc + (v.valor_total || 0), 0);
    const rentabilidadeTotal = filtrados.reduce((acc, v) => acc + (v.rentabilidade || 0), 0);
    const ticketMedio = filtrados.length > 0 ? totalVendas / filtrados.length : 0;

    // Assert
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].id).toBe('viagem-1');
    expect(totalVendas).toBe(5500);
    expect(rentabilidadeTotal).toBe(1200);
    expect(ticketMedio).toBe(5500);
  });
});
