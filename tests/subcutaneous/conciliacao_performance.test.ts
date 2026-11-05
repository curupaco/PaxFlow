import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';
import { ConciliacaoService } from '../../src/services/conciliacaoService';
import { ConciliacaoPage } from '../../src/pages/Conciliacao';
import { createSupabaseQueryMock as createQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom
    },
    getSessaoAtual: vi.fn().mockResolvedValue({
      user: { id: 'admin-conciliacao-1' },
      perfil: { id: 'admin-conciliacao-1', nome: 'Admin Conciliação', role: 'admin' },
      error: null
    })
  };
});

describe('Conciliação Bancária - Otimização de Performance e Smart Match Indexado Subcutâneo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve delimitar temporalmente a consulta de recebimentos pendentes de loc_pagamentos', async () => {
    // Setup
    const chamadasLocPagamentos: { orFilters: string[]; gteFilters: any[]; lteFilters: any[] }[] = [];

    (supabase.from as any).mockImplementation((table: string) => {
      const orFilters: string[] = [];
      const gteFilters: any[] = [];
      const lteFilters: any[] = [];

      const qMock = createQueryMock([]);
      const origOr = qMock.or.bind(qMock);
      qMock.or = vi.fn((val: string) => {
        orFilters.push(val);
        return origOr(val);
      });
      const origGte = qMock.gte.bind(qMock);
      qMock.gte = vi.fn((col: string, val: any) => {
        gteFilters.push({ col, val });
        return origGte(col, val);
      });
      const origLte = qMock.lte.bind(qMock);
      qMock.lte = vi.fn((col: string, val: any) => {
        lteFilters.push({ col, val });
        return origLte(col, val);
      });

      if (table === 'loc_pagamentos') {
        chamadasLocPagamentos.push({ orFilters, gteFilters, lteFilters });
      }
      return qMock;
    });

    // Action
    const dataInicio = '2026-10-01T00:00:00.000Z';
    const dataFim = '2026-11-30T23:59:59.000Z';
    await ConciliacaoService.listarRecebimentosPendentes({ dataInicio, dataFim });

    // Assert
    expect(chamadasLocPagamentos.length).toBe(1);
    expect(chamadasLocPagamentos[0].orFilters[0]).toContain('conciliado.is.null');
    expect(chamadasLocPagamentos[0].gteFilters[0]).toEqual({ col: 'created_at', val: dataInicio });
    expect(chamadasLocPagamentos[0].lteFilters[0]).toEqual({ col: 'created_at', val: dataFim });
  });

  it('deve parear com exatidão matemática transações e pendências pelo algoritmo indexado de Smart Match', () => {
    // Setup
    const transacoes: any[] = [
      {
        id: 'tx-1',
        tipo: 'CREDITO',
        valor: 1500.00,
        data_transacao: '2026-11-03',
        descricao: 'PIX RECEBIDO CLIENTE JOAO SILVA LOC-9988',
        status: 'pendente'
      },
      {
        id: 'tx-2',
        tipo: 'DEBITO',
        valor: -800.00,
        data_transacao: '2026-11-04',
        descricao: 'PGTO LATAM AIRLINES OPERACAO',
        status: 'pendente'
      }
    ];

    const pendentes: any[] = [
      {
        id: 'loc-1',
        valor: 1500.00,
        loc_codigo: 'LOC-9988',
        cliente_nome: 'JOAO SILVA',
        data_vencimento: '2026-11-03',
        conciliado: false
      },
      {
        id: 'loc-outro',
        valor: 3500.00,
        loc_codigo: 'LOC-1111',
        cliente_nome: 'OUTRO CLIENTE',
        data_vencimento: '2026-11-05',
        conciliado: false
      }
    ];

    const contasPagar: any[] = [
      {
        id: 'cp-1',
        favorecido: 'LATAM AIRLINES',
        valor_nominal: 800.00,
        data_vencimento: '2026-11-04',
        status: 'pendente',
        categoria: { id: 'cat-1', nome: 'FORNECEDOR AÉREO' }
      }
    ];

    // Action
    const sugestoes = ConciliacaoService.calcularSmartMatches(transacoes, pendentes, contasPagar);

    // Assert
    expect(sugestoes.length).toBe(2);

    const matchCredito = sugestoes.find(s => s.transacaoExtratoId === 'tx-1');
    expect(matchCredito).toBeDefined();
    expect(matchCredito?.locPagamentoId).toBe('loc-1');
    expect(matchCredito?.tipoMatch).toBe('recebimento');
    expect(matchCredito?.score).toBe(100);

    const matchDebito = sugestoes.find(s => s.transacaoExtratoId === 'tx-2');
    expect(matchDebito).toBeDefined();
    expect(matchDebito?.contaPagarId).toBe('cp-1');
    expect(matchDebito?.tipoMatch).toBe('conta_pagar');
    expect(matchDebito?.score).toBe(100);
  });

  it('deve atualizar o estado da conciliação cirurgicamente em memória sem recarregar dados do banco', () => {
    // Setup
    const fakeContainer = {} as HTMLElement;
    const page = new ConciliacaoPage(fakeContainer);

    (page as any).transacoes = [
      { id: 'tx-1', status: 'pendente', valor: 500, tipo: 'CREDITO' },
      { id: 'tx-2', status: 'pendente', valor: 300, tipo: 'CREDITO' }
    ];

    (page as any).pendentesLocs = [
      { id: 'loc-1', valor: 500, conciliado: false },
      { id: 'loc-2', valor: 300, conciliado: false }
    ];

    (page as any).sugestoes = [
      { transacaoExtratoId: 'tx-1', locPagamentoId: 'loc-1', score: 100 }
    ];

    const spyCarregarDados = vi.spyOn(page, 'carregarDados');
    const spyRender = vi.spyOn(page, 'render').mockImplementation(() => {});

    // Action
    page.aplicarConciliacaoEmMemoria('tx-1', ['loc-1']);

    // Assert
    expect(spyCarregarDados).not.toHaveBeenCalled();
    expect(spyRender).toHaveBeenCalledTimes(1);

    const txConciliada = (page as any).transacoes.find((t: any) => t.id === 'tx-1');
    expect(txConciliada?.status).toBe('conciliado');
    expect(txConciliada?.loc_pagamento_id).toBe('loc-1');

    const pendenteRestante = (page as any).pendentesLocs.find((p: any) => p.id === 'loc-1');
    expect(pendenteRestante).toBeUndefined();
    expect((page as any).pendentesLocs.length).toBe(1);

    expect((page as any).sugestoes.length).toBe(0);
  });
});

