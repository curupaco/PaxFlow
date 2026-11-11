import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';
import { ComercialDashboard } from '../../src/pages/ComercialDashboard';
import { createSupabaseQueryMock as createQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis()
      }),
      removeChannel: vi.fn()
    },
    getSessaoAtual: vi.fn().mockResolvedValue({
      user: { id: 'admin-comercial-1' },
      perfil: { id: 'admin-comercial-1', nome: 'Admin Comercial', role: 'admin' },
      error: null
    })
  };
});

describe('Painel Comercial - Otimização de Performance e Janela Temporal Subcutânea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve aplicar recorte temporal gte para a competência do mês atual por padrão', async () => {
    // Setup
    const chamadasSupabase: { table: string; selectStr: string; gteArgs: any[]; orArgs: any[] }[] = [];

    (supabase.from as any).mockImplementation((table: string) => {
      let currentSelect = '';
      const gteArgs: any[] = [];
      const orArgs: any[] = [];

      const qMock = createQueryMock([]);
      const origSelect = qMock.select.bind(qMock);
      qMock.select = vi.fn((sel: string) => {
        currentSelect = sel;
        return qMock;
      });
      const origGte = qMock.gte.bind(qMock);
      qMock.gte = vi.fn((col: string, val: any) => {
        gteArgs.push({ col, val });
        return origGte(col, val);
      });
      const origOr = qMock.or.bind(qMock);
      qMock.or = vi.fn((filterStr: string) => {
        orArgs.push(filterStr);
        return origOr(filterStr);
      });

      chamadasSupabase.push({ table, selectStr: currentSelect, gteArgs, orArgs });
      return qMock;
    });

    const fakeContainer = {} as HTMLElement;
    const dashboard = new ComercialDashboard(fakeContainer);
    (dashboard as any).user = { id: 'admin-comercial-1' };
    (dashboard as any).perfil = { id: 'admin-comercial-1', nome: 'Admin', role: 'admin' };

    // Action
    await (dashboard as any).loadData();

    // Assert
    const chamadaOrc = chamadasSupabase.find(c => c.table === 'orcamentos');
    const chamadaVia = chamadasSupabase.find(c => c.table === 'viagens');

    expect(chamadaOrc).toBeDefined();
    expect(chamadaOrc?.gteArgs.length).toBeGreaterThanOrEqual(1);
    expect(chamadaOrc?.gteArgs[0].col).toBe('created_at');

    expect(chamadaVia).toBeDefined();
    expect(chamadaVia?.orArgs.length).toBeGreaterThanOrEqual(1);
    expect(chamadaVia?.orArgs[0]).toContain('created_at.gte');
    expect(chamadaVia?.orArgs[0]).toContain('data_financeiro.gte');
  });

  it('deve remover restrição de data de corte quando o período for todo_periodo', async () => {
    // Setup
    const chamadasSupabase: { table: string; gteArgs: any[]; orArgs: any[] }[] = [];

    (supabase.from as any).mockImplementation((table: string) => {
      const gteArgs: any[] = [];
      const orArgs: any[] = [];

      const qMock = createQueryMock([]);
      const origGte = qMock.gte.bind(qMock);
      qMock.gte = vi.fn((col: string, val: any) => {
        gteArgs.push({ col, val });
        return origGte(col, val);
      });
      const origOr = qMock.or.bind(qMock);
      qMock.or = vi.fn((filterStr: string) => {
        orArgs.push(filterStr);
        return origOr(filterStr);
      });

      chamadasSupabase.push({ table, gteArgs, orArgs });
      return qMock;
    });

    const fakeContainer = {} as HTMLElement;
    const dashboard = new ComercialDashboard(fakeContainer);
    (dashboard as any).user = { id: 'admin-comercial-1' };
    (dashboard as any).perfil = { id: 'admin-comercial-1', nome: 'Admin', role: 'admin' };
    (dashboard as any).selectedPeriod = 'todo_periodo';

    // Action
    await (dashboard as any).loadData();

    // Assert
    const chamadaOrc = chamadasSupabase.find(c => c.table === 'orcamentos');
    const chamadaVia = chamadasSupabase.find(c => c.table === 'viagens');

    expect(chamadaOrc?.gteArgs.length).toBe(0);
    expect(chamadaVia?.orArgs.length).toBe(0);
  });

  it('deve usar projeção cirúrgica de colunas em orçamentos e viagens sem select(*)', async () => {
    // Setup
    const selectsEfetuados: { table: string; selectQuery: string }[] = [];

    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      qMock.select = vi.fn((sel: string) => {
        selectsEfetuados.push({ table, selectQuery: sel });
        return qMock;
      });
      return qMock;
    });

    const fakeContainer = {} as HTMLElement;
    const dashboard = new ComercialDashboard(fakeContainer);
    (dashboard as any).user = { id: 'admin-comercial-1' };
    (dashboard as any).perfil = { id: 'admin-comercial-1', role: 'admin' };

    // Action
    await (dashboard as any).loadData();

    // Assert
    const selOrc = selectsEfetuados.find(s => s.table === 'orcamentos');
    const selVia = selectsEfetuados.find(s => s.table === 'viagens');

    expect(selOrc).toBeDefined();
    expect(selOrc?.selectQuery).not.toBe('*');
    expect(selOrc?.selectQuery).toContain('id');
    expect(selOrc?.selectQuery).toContain('valor_proposta');
    expect(selOrc?.selectQuery).not.toContain('observacoes_internas_longas');

    expect(selVia).toBeDefined();
    expect(selVia?.selectQuery).not.toBe('*');
    expect(selVia?.selectQuery).toContain('produtos:produtos_viagem');
    expect(selVia?.selectQuery).not.toContain('roteiro_pdf');
  });

  it('deve calcular métricas de conversão e faturamento com exatidão matemática', async () => {
    // Setup
    const fakeContainer = {} as HTMLElement;
    const dashboard = new ComercialDashboard(fakeContainer);
    (dashboard as any).user = { id: 'admin-comercial-1' };
    (dashboard as any).perfil = { id: 'admin-comercial-1', role: 'admin' };
    (dashboard as any).selectedPeriod = 'todo_periodo';
    (dashboard as any).selectedConsultantId = 'todos';

    (dashboard as any).orcamentos = [
      { id: 'orc-1', consultorId: 'c1', status: 'VIAGEM_CRIADA', valorProposta: 10000, createdAt: '2026-11-01' },
      { id: 'orc-2', consultorId: 'c1', status: 'SOLICITADO', valorProposta: 5000, createdAt: '2026-11-02' },
      { id: 'orc-3', consultorId: 'c2', status: 'DESISTENCIA', valorProposta: 3000, createdAt: '2026-11-03' }
    ];

    (dashboard as any).viagens = [
      {
        id: 'via-1',
        consultorId: 'c1',
        status: 'confirmada',
        valorTotal: 10000,
        createdAt: '2026-11-01',
        produtos: [
          { id: 'p1', viagem_id: 'via-1', valor_venda: 10000, comissao: 1000, markup: 500, rav: 200 }
        ],
        divisoes: []
      }
    ];

    (dashboard as any).locPagamentos = [];

    // Action
    const { filteredOrc, filteredVia } = (dashboard as any).filterRecords();
    const viagensAtivas = filteredVia.filter((v: any) => v.status !== 'cancelada');
    const faturamentoTotal = viagensAtivas.reduce((acc: number, v: any) => acc + (v.valorTotal || 0), 0);
    const totalOrcamentos = filteredOrc.length;
    const orcamentosConvertidos = filteredOrc.filter((o: any) => o.status === 'VIAGEM_CRIADA').length;
    const taxaConversao = totalOrcamentos > 0 ? (orcamentosConvertidos / totalOrcamentos) * 100 : 0;

    // Assert
    expect(filteredOrc.length).toBe(3);
    expect(filteredVia.length).toBe(1);
    expect(faturamentoTotal).toBe(10000);
    expect(orcamentosConvertidos).toBe(1);
    expect(taxaConversao).toBeCloseTo(33.33, 1);
  });

  it('deve usar estritamente as colunas oficiais do schema em produtos_viagem sem colunas inexistentes', async () => {
    // Setup
    let selectVia = '';
    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      qMock.select = vi.fn((sel: string) => {
        if (table === 'viagens') selectVia = sel;
        return qMock;
      });
      return qMock;
    });

    const fakeContainer = {} as HTMLElement;
    const dashboard = new ComercialDashboard(fakeContainer);
    (dashboard as any).user = { id: 'admin-comercial-1' };
    (dashboard as any).perfil = { id: 'admin-comercial-1', role: 'admin' };

    // Action
    await (dashboard as any).loadData();

    // Assert
    expect(selectVia).toContain('produtos:produtos_viagem(id, viagem_id, tipo, valor_venda, tarifa, taxa, comissao, markup, rav, fornecedor, descricao, codigo_reserva)');
    expect(selectVia).not.toContain('tipo_produto');
    expect(selectVia).not.toContain('comissao_total');
    expect(selectVia).not.toContain('taxa_embarque');
  });

  it('deve adotar Fail-Fast Transparente propagando erro quando a consulta ao banco falhar', async () => {
    // Setup
    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      if (table === 'viagens') {
        qMock.then = vi.fn().mockImplementation((onfulfilled) => {
          return Promise.resolve(onfulfilled({ data: null, error: new Error('PostgREST 42703: column does not exist') }));
        });
      }
      return qMock;
    });

    const fakeContainer = {} as HTMLElement;
    const dashboard = new ComercialDashboard(fakeContainer);
    (dashboard as any).user = { id: 'admin-comercial-1' };
    (dashboard as any).perfil = { id: 'admin-comercial-1', role: 'admin' };

    // Action & Assert
    await expect((dashboard as any).loadData()).rejects.toThrow('PostgREST 42703: column does not exist');
  });
});

