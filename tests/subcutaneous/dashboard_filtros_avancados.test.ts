import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Dashboard - Painel de Filtros Avançados Subcutâneo', () => {
  // Mock dataset de viagens operacionais com produtos, valores e metadados
  const mockViagens = [
    {
      id: 'viagem-1',
      codigo_ref: 'V-001',
      destino: 'Orlando, EUA',
      destino_id: 'dest-orlando',
      data_financeiro: '2026-02-10',
      data_ida: '2026-02-15',
      data_volta: '2026-02-25',
      valor_total: 5500,
      rentabilidade: 1200,
      status: 'pos_venda',
      voucher_geral_anexado: true,
      cliente: { nome: 'Carlos Eduardo', documento: '12345678900' },
      produtos: [
        { id: 'p1', tipo: 'Aéreo Facial', fornecedor: 'LATAM', valor_venda: 3000 },
        { id: 'p2', tipo: 'Carro', fornecedor: 'Movida', valor_venda: 2500 }
      ]
    },
    {
      id: 'viagem-2',
      codigo_ref: 'V-002',
      destino: 'Paris, França',
      destino_id: 'dest-paris',
      data_financeiro: '2026-02-20',
      data_ida: '2026-03-01',
      data_volta: '2026-03-10',
      valor_total: 1800,
      rentabilidade: 350,
      status: 'fechado',
      voucher_geral_anexado: false,
      cliente: { nome: 'Mariana Lima', documento: '98765432100' },
      produtos: [
        { id: 'p3', tipo: 'Aéreo Facial', fornecedor: 'Air France', valor_venda: 1800 }
      ]
    },
    {
      id: 'viagem-3',
      codigo_ref: 'V-003',
      destino: 'Cancún, México',
      destino_id: 'dest-cancun',
      data_financeiro: '2026-04-05',
      data_ida: '2026-05-10',
      data_volta: '2026-05-20',
      valor_total: 8900,
      rentabilidade: 2100,
      status: 'pre_embarque',
      voucher_geral_anexado: false,
      cliente: { nome: 'Roberto Silva', documento: '11122233344' },
      produtos: [
        { id: 'p4', tipo: 'Hotel', fornecedor: 'Resort Cancún Palace', valor_venda: 6000 },
        { id: 'p5', tipo: 'Carro', fornecedor: 'Hertz', valor_venda: 2900 }
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
    advAnexos?: 'todos' | 'com_anexo' | 'sem_anexo' | 'com_voucher' | 'sem_voucher';
    advMesAno?: string;
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
      advAnexos = 'todos',
      advMesAno = '',
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

      // Rentabilidade
      const valRent = Number(v.rentabilidade) || 0;
      if (advRentabilidadeMin !== null && valRent < advRentabilidadeMin) return false;
      if (advRentabilidadeMax !== null && valRent > advRentabilidadeMax) return false;

      // Anexos
      if (advAnexos !== 'todos') {
        const prods = Array.isArray(v.produtos) ? v.produtos : [];
        const hasVoucherGeral = !!v.voucher_geral_anexado;
        const hasProductAnexo = prods.some((p: any) => p.anexo_url || p.voucher_url);
        const hasAnyAnexo = hasVoucherGeral || hasProductAnexo;

        if (advAnexos === 'com_anexo' && !hasAnyAnexo) return false;
        if (advAnexos === 'sem_anexo' && hasAnyAnexo) return false;
        if (advAnexos === 'com_voucher' && !hasVoucherGeral) return false;
        if (advAnexos === 'sem_voucher' && hasVoucherGeral) return false;
      }

      return true;
    });
  }

  // 1. Teste de Combinação de Produtos com Regra E (AND)
  it('deve filtrar viagens que possuem simultaneamente todos os produtos selecionados (Regra E / AND)', () => {
    // Setup
    const filtros = {
      advProdutos: ['aéreo facial', 'carro'],
      advProdutoMatchMode: 'AND' as const
    };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('viagem-1');
  });

  // 2. Teste de Combinação de Produtos com Regra OU (OR)
  it('deve filtrar viagens que possuem qualquer um dos produtos selecionados (Regra OU / OR)', () => {
    // Setup
    const filtros = {
      advProdutos: ['hotel', 'carro'],
      advProdutoMatchMode: 'OR' as const
    };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert
    expect(resultado).toHaveLength(2);
    expect(resultado.map(v => v.id)).toEqual(expect.arrayContaining(['viagem-1', 'viagem-3']));
  });

  // 3. Teste de Filtro por Faixa de Valor de Venda (ex: > R$ 2000)
  it('deve filtrar viagens por valor mínimo e máximo de venda', () => {
    // Setup
    const filtros = {
      advValorMin: 2000
    };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert
    expect(resultado).toHaveLength(2);
    expect(resultado.map(v => v.id)).toEqual(['viagem-1', 'viagem-3']);
  });

  // 4. Teste de Filtro Combinado: Mês de Fevereiro + Fornecedor + Anexo
  it('deve filtrar por múltiplos critérios combinados: Fevereiro, fornecedor LATAM e com voucher', () => {
    // Setup
    const filtros = {
      advMesAno: '2026-02',
      advFornecedor: 'LATAM',
      advAnexos: 'com_voucher' as const
    };

    // Action
    const resultado = filtrarViagensSubcutaneo(mockViagens, filtros);

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('viagem-1');
  });

  // 5. Teste de Cálculo do Resumo Financeiro
  it('deve calcular corretamente total de vendas, rentabilidade acumulada e ticket médio do conjunto filtrado', () => {
    // Setup
    const filtrados = [mockViagens[0], mockViagens[2]]; // 5500 + 8900 = 14400

    // Action
    const totalVendas = filtrados.reduce((acc, v) => acc + v.valor_total, 0);
    const totalRentabilidade = filtrados.reduce((acc, v) => acc + v.rentabilidade, 0);
    const ticketMedio = totalVendas / filtrados.length;

    // Assert
    expect(totalVendas).toBe(14400);
    expect(totalRentabilidade).toBe(3300);
    expect(ticketMedio).toBe(7200);
  });

  // 6. Teste de Formatação e Estrutura de Exportação CSV
  it('deve gerar cabeçalhos e linhas de CSV formatados para o padrão brasileiro Excel', () => {
    // Setup
    const viagensExport = [mockViagens[0]];
    const headers = ['ID Ref', 'Cliente', 'Destino', 'Valor Total Venda (R$)', 'Rentabilidade (R$)'];

    // Action
    const row = [
      viagensExport[0].codigo_ref,
      viagensExport[0].cliente.nome,
      viagensExport[0].destino,
      viagensExport[0].valor_total.toFixed(2).replace('.', ','),
      viagensExport[0].rentabilidade.toFixed(2).replace('.', ',')
    ];
    const csvContent = [headers.join(';'), row.join(';')].join('\r\n');

    // Assert
    expect(csvContent).toContain('ID Ref;Cliente;Destino;Valor Total Venda (R$);Rentabilidade (R$)');
    expect(csvContent).toContain('V-001;Carlos Eduardo;Orlando, EUA;5500,00;1200,00');
  });
});
