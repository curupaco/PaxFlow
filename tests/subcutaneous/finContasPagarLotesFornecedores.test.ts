import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinRemessasService } from '../../src/services/finRemessasService';
import { FinFornecedoresService } from '../../src/services/finFornecedoresService';
import { calcularFaturamentoLucratividade } from '../../src/controllers/relatoriosController';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom
    }
  };
});

describe('Módulo Financeiro: Lotes de Remessa, Fornecedores e Fechamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve baixar remessa consolidada aplicando o mesmo banco e forma de pagamento em todos os itens', async () => {
    // Setup
    const mockRemessaId = 'rem-123';
    const mockContaBancariaId = 'banco-itau';
    const mockFormaPagamento = 'pix';
    const mockDataPagamento = '2026-11-09';

    const mockSelectItens = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: 'conta-1', favorecido: 'Fornecedor A', valor_nominal: 1500 },
          { id: 'conta-2', favorecido: 'Fornecedor A', valor_nominal: 2500 }
        ],
        error: null
      })
    });

    const mockUpdateContas = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockUpdateRemessa = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockInsertAuditoria = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_pagar') {
        return {
          select: mockSelectItens,
          update: mockUpdateContas
        };
      }
      if (tabela === 'fin_remessas') {
        return {
          update: mockUpdateRemessa
        };
      }
      if (tabela === 'fin_auditoria') {
        return {
          insert: mockInsertAuditoria
        };
      }
      return {};
    });

    // Action
    const resultado = await FinRemessasService.baixarRemessaConsolidada({
      remessaId: mockRemessaId,
      contaBancariaId: mockContaBancariaId,
      formaPagamento: mockFormaPagamento as any,
      dataPagamento: mockDataPagamento,
      usuarioId: 'usr-admin',
      usuarioNome: 'Admin PaxFlow'
    });

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(mockUpdateContas).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pago',
      conta_bancaria_id: mockContaBancariaId,
      forma_pagamento: mockFormaPagamento,
      data_pagamento: mockDataPagamento
    }));
    expect(mockUpdateRemessa).toHaveBeenCalledWith(expect.objectContaining({
      status: 'paga',
      conta_bancaria_id: mockContaBancariaId,
      forma_pagamento: mockFormaPagamento,
      data_pagamento: mockDataPagamento
    }));
  });

  it('deve reverter remessa baixada limpando pagamentos e voltando status para pendente', async () => {
    // Setup
    const mockRemessaId = 'rem-456';

    const mockSelectItens = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: 'conta-3', favorecido: 'Hotel X', valor_nominal: 800, data_vencimento: '2026-11-20' },
          { id: 'conta-4', favorecido: 'Hotel X', valor_nominal: 1200, data_vencimento: '2026-10-01' }
        ],
        error: null
      })
    });

    const mockUpdateContas = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockUpdateRemessa = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockInsertAuditoria = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_pagar') {
        return {
          select: mockSelectItens,
          update: mockUpdateContas
        };
      }
      if (tabela === 'fin_remessas') {
        return {
          update: mockUpdateRemessa
        };
      }
      if (tabela === 'fin_auditoria') {
        return {
          insert: mockInsertAuditoria
        };
      }
      return {};
    });

    // Action
    const resultado = await FinRemessasService.reverterBaixaRemessa({
      remessaId: mockRemessaId,
      usuarioId: 'usr-admin',
      usuarioNome: 'Admin PaxFlow'
    });

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(mockUpdateRemessa).toHaveBeenCalledWith(expect.objectContaining({
      status: 'aberta',
      data_pagamento: null,
      conta_bancaria_id: null,
      forma_pagamento: null,
      baixado_por: null
    }));
  });

  it('deve realizar o fluxo completo de cadastro, listagem e exclusão de fornecedores', async () => {
    // Setup
    const mockFornecedor = {
      id: 'forn-1',
      nome: 'LATAM Airlines',
      cpf_cnpj: '02.012.862/0001-60',
      observacoes: 'Consolidadora oficial',
      ativo: true
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockFornecedor, error: null })
      })
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [mockFornecedor], error: null })
    });

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'fin_fornecedores') {
        return {
          insert: mockInsert,
          select: mockSelect,
          delete: mockDelete
        };
      }
      return {};
    });

    // Action
    const resCriacao = await FinFornecedoresService.criarFornecedor({
      nome: 'LATAM Airlines',
      cpf_cnpj: '02.012.862/0001-60',
      observacoes: 'Consolidadora oficial'
    });

    const resLista = await FinFornecedoresService.listarFornecedores();
    const resExclusao = await FinFornecedoresService.excluirFornecedor('forn-1');

    // Assert
    expect(resCriacao.sucesso).toBe(true);
    expect(resCriacao.fornecedor?.nome).toBe('LATAM Airlines');
    expect(resLista).toHaveLength(1);
    expect(resLista[0].nome).toBe('LATAM Airlines');
    expect(resExclusao.sucesso).toBe(true);
  });

  it('deve calcular faturamento bruto sincronizado com os produtos e rateio de cotas de parceria', () => {
    // Setup
    const viagens = [
      {
        id: 'via-0325',
        valor_total: 13644.66,
        status: 'fechado',
        produtos: [
          {
            id: 'p1',
            tipo: 'AÉREO',
            valor_venda: 13644.66,
            taxa: 1000,
            comissao: 1616.11,
            markup: 0,
            rav: 1200
          }
        ],
        divisoes: [
          { consultor_id: 'user-rafael', percentual: 50, percentual_rav: 50, is_titular: true },
          { consultor_id: 'user-guto', percentual: 50, percentual_rav: 50, is_titular: false }
        ]
      }
    ];

    // Action
    const resGuto = calcularFaturamentoLucratividade(viagens, [], {
      tipoProduto: 'todos',
      filtroRav: 'todos',
      consultorId: 'user-guto'
    });

    // Assert
    expect(resGuto.faturamentoBruto).toBeCloseTo(6822.33, 2);
    expect(resGuto.comissaoTotal).toBeCloseTo(808.055, 2);
    expect(resGuto.ravTotal).toBeCloseTo(528, 2); // 600 * 0.88
    expect(resGuto.lucroLiquidoReal).toBeCloseTo(1336.055, 2);
  });
});

