import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConciliacaoService, ExtratoTransacao, LocPagamentoPendente } from '../../src/services/conciliacaoService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'extratos/test.ofx' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://supabase.co/extratos/test.ofx' } }),
      }),
    },
  },
  getSessaoAtual: vi.fn().mockResolvedValue({
    user: { id: 'user-admin-123' },
    perfil: { id: 'user-admin-123', role: 'admin' },
  }),
}));

describe('ConciliacaoService (PaxFlow FinRecon™)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve calcular Smart Matches com pontuação máxima para valor e data exatos', () => {
    // Setup
    const transacoes: ExtratoTransacao[] = [
      {
        id: 't-1',
        lote_id: 'l-1',
        data_transacao: '2026-10-15',
        descricao: 'PIX RECEBIDO JOAO DA SILVA',
        valor: 4500.00,
        tipo: 'CREDIT',
        status: 'pendente'
      }
    ];

    const pendentes: LocPagamentoPendente[] = [
      {
        id: 'p-1',
        loc_codigo: 'LOC-2026-001',
        cliente_nome: 'Joao da Silva',
        data_vencimento: '2026-10-15',
        valor: 4500.00,
        forma_pagamento: 'PIX',
        conciliado: false
      }
    ];

    // Action
    const sugestoes = ConciliacaoService.calcularSmartMatches(transacoes, pendentes);

    // Assert
    expect(sugestoes.length).toBe(1);
    expect(sugestoes[0].score).toBeGreaterThanOrEqual(90);
    expect(sugestoes[0].motivo).toContain('Valor exato');
    expect(sugestoes[0].motivo).toContain('Mesmo dia');
    expect(sugestoes[0].motivo).toContain('Nome/LOC coincide');
  });

  it('deve identificar correspondência com desconto de taxa de gateway de até 5%', () => {
    // Setup
    // LOC de R$ 1.000,00 onde no extrato entrou R$ 970,00 (taxa de cartão de 3%)
    const transacoes: ExtratoTransacao[] = [
      {
        id: 't-2',
        lote_id: 'l-1',
        data_transacao: '2026-10-16',
        descricao: 'CREDITO CIELO VISA D+1',
        valor: 970.00,
        tipo: 'CREDIT',
        status: 'pendente'
      }
    ];

    const pendentes: LocPagamentoPendente[] = [
      {
        id: 'p-2',
        loc_codigo: 'LOC-2026-002',
        cliente_nome: 'Maria Fernandes',
        data_vencimento: '2026-10-15',
        valor: 1000.00,
        forma_pagamento: 'Cartão de Crédito',
        conciliado: false
      }
    ];

    // Action
    const sugestoes = ConciliacaoService.calcularSmartMatches(transacoes, pendentes);

    // Assert
    expect(sugestoes.length).toBe(1);
    expect(sugestoes[0].score).toBeGreaterThanOrEqual(50);
    expect(sugestoes[0].motivo).toContain('taxa de gateway');
  });

  it('deve calcular resumo financeiro e taxa de conciliação corretamente', () => {
    // Setup
    const transacoes: ExtratoTransacao[] = [
      { id: 't-1', lote_id: 'l-1', data_transacao: '2026-10-15', descricao: 'PIX 1', valor: 2000, tipo: 'CREDIT', status: 'conciliado' },
      { id: 't-2', lote_id: 'l-1', data_transacao: '2026-10-16', descricao: 'PIX 2', valor: 3000, tipo: 'CREDIT', status: 'pendente' },
      { id: 't-3', lote_id: 'l-1', data_transacao: '2026-10-17', descricao: 'APORTE', valor: 5000, tipo: 'CREDIT', status: 'justificado' }
    ];

    const pendentes: LocPagamentoPendente[] = [
      { id: 'p-1', loc_codigo: 'LOC-1', cliente_nome: 'Cli 1', data_vencimento: '2026-10-15', valor: 1500, forma_pagamento: 'PIX', conciliado: false }
    ];

    // Action
    const resumo = ConciliacaoService.calcularResumo(transacoes, pendentes);

    // Assert
    expect(resumo.totalExtrato).toBe(10000);
    expect(resumo.totalConciliado).toBe(7000); // 2000 (conciliado) + 5000 (justificado)
    expect(resumo.totalPendenteExtrato).toBe(3000);
    expect(resumo.totalRecebimentosSemBanco).toBe(1500);
    expect(resumo.qtdExtrato).toBe(3);
    expect(resumo.qtdConciliado).toBe(2);
    expect(resumo.qtdPendenteExtrato).toBe(1);
    expect(resumo.qtdRecebimentosSemBanco).toBe(1);
    expect(resumo.taxaConciliacao).toBe(70); // 7000 / 10000 = 70%
  });

  it('deve conciliar transação 1:1 e marcar o status no banco de dados', async () => {
    // Setup
    const updateTransacaoMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    const insertVinculoMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateLocMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'extratos_bancarios_transacoes') {
        return { update: updateTransacaoMock };
      }
      if (table === 'extratos_conciliacoes_vinculos') {
        return { insert: insertVinculoMock };
      }
      if (table === 'loc_pagamentos') {
        return { update: updateLocMock };
      }
      return {};
    });

    // Action
    await ConciliacaoService.conciliarTransacao({
      transacaoId: 't-1',
      locPagamentoIds: ['p-1'],
      taxaDesconto: 30.00
    });

    // Assert
    expect(updateTransacaoMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'conciliado'
    }));
    expect(insertVinculoMock).toHaveBeenCalled();
    expect(updateLocMock).toHaveBeenCalledWith(expect.objectContaining({
      conciliado: true
    }));
  });

  it('deve reverter conciliação e desvincular pagamentos', async () => {
    // Setup
    const selectVinculosMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ loc_pagamento_id: 'p-1' }],
        error: null
      })
    });
    const deleteVinculosMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    const updateTransacaoMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    const updateLocMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'extratos_conciliacoes_vinculos') {
        return { select: selectVinculosMock, delete: deleteVinculosMock };
      }
      if (table === 'extratos_bancarios_transacoes') {
        return { update: updateTransacaoMock };
      }
      if (table === 'loc_pagamentos') {
        return { update: updateLocMock };
      }
      return {};
    });

    // Action
    await ConciliacaoService.reverterConciliacao('t-1');

    // Assert
    expect(deleteVinculosMock).toHaveBeenCalled();
    expect(updateTransacaoMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pendente'
    }));
    expect(updateLocMock).toHaveBeenCalledWith(expect.objectContaining({
      conciliado: false
    }));
  });

  it('deve resistir a schema drift (42P01 / 42703) sem estourar exceções não tratadas', async () => {
    // Setup
    // Simula erro 42P01 (relation does not exist) na tabela de extratos
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'extratos_bancarios_transacoes') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42P01', message: 'relation extratos_bancarios_transacoes does not exist' }
            })
          })
        };
      }
      if (table === 'loc_pagamentos') {
        const orderMock = vi.fn().mockResolvedValue({
          data: [],
          error: null
        });
        return {
          select: vi.fn().mockReturnValue({
            order: orderMock,
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '42703', message: 'column conciliado does not exist' }
              })
            })
          })
        };
      }
      return {};
    });

    // Action
    const transacoes = await ConciliacaoService.listarTransacoesExtrato();
    const pendentes = await ConciliacaoService.listarRecebimentosPendentes();

    // Assert
    // Deve retornar arrays vazios graciosamente com fallback nativo de schema drift
    expect(transacoes).toEqual([]);
    expect(pendentes).toEqual([]);
  });
});
