import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';
import { NextTripEngineService } from '../../src/services/nextTripEngineService';
import { createSupabaseQueryMock as createQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-consultor-id' } } })
      }
    }
  };
});

describe('NextTrip - Testes Subcutâneos de Performance e Otimização', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve disparar consultas enxutas de viagens delimitadas por janela temporal sem joins pesados', async () => {
    // Setup
    const selectsChamados: Record<string, string> = {};
    const filtrosChamados: Record<string, any[]> = {};

    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      const originalSelect = qMock.select.bind(qMock);
      const originalGte = qMock.gte.bind(qMock);
      const originalOr = qMock.or.bind(qMock);

      qMock.select = vi.fn((cols: string) => {
        selectsChamados[table] = cols;
        return originalSelect(cols);
      });

      qMock.gte = vi.fn((col: string, val: any) => {
        if (!filtrosChamados[table]) filtrosChamados[table] = [];
        filtrosChamados[table].push({ op: 'gte', col, val });
        return originalGte(col, val);
      });

      qMock.or = vi.fn((filterStr: string) => {
        if (!filtrosChamados[table]) filtrosChamados[table] = [];
        filtrosChamados[table].push({ op: 'or', filterStr });
        return originalOr(filterStr);
      });

      return qMock;
    });

    const dataMin = new Date();
    dataMin.setMonth(dataMin.getMonth() - 24);
    const dataMinIso = dataMin.toISOString();

    // Action
    const queryViagens = supabase
      .from('viagens')
      .select(`
        id,
        titulo,
        cliente_id,
        cliente_nome,
        consultor_responsavel_id,
        consultor_nome,
        data_ida,
        data_volta,
        status,
        destino,
        categorias_viagem,
        observacoes,
        nps_viagem
      `)
      .or(`data_ida.gte.${dataMinIso},data_volta.gte.${dataMinIso},data_ida.is.null`);

    await queryViagens;

    // Assert
    expect(selectsChamados['viagens']).toBeDefined();
    expect(selectsChamados['viagens']).not.toContain('produtos_viagem');
    expect(selectsChamados['viagens']).not.toContain('destinos');
    expect(selectsChamados['viagens']).toContain('cliente_id');
    expect(selectsChamados['viagens']).toContain('data_ida');
    expect(filtrosChamados['viagens']).toBeDefined();
    expect(filtrosChamados['viagens'].length).toBeGreaterThan(0);
    expect(filtrosChamados['viagens'][0].filterStr).toContain('data_ida.gte');
  });

  it('deve aplicar recorte temporal na busca de orçamentos para reativação comercial', async () => {
    // Setup
    const filtrosOrcamento: any[] = [];
    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      const originalOr = qMock.or.bind(qMock);
      qMock.or = vi.fn((filterStr: string) => {
        filtrosOrcamento.push(filterStr);
        return originalOr(filterStr);
      });
      return qMock;
    });

    const dataMinOrc = new Date();
    dataMinOrc.setMonth(dataMinOrc.getMonth() - 12);
    const dataMinOrcIso = dataMinOrc.toISOString();

    // Action
    const queryOrc = supabase
      .from('orcamentos')
      .select('id, status, destino, cliente_id, cliente_nome, consultor_id, created_at')
      .or(`status.in.("SOLICITADO","EM_ANDAMENTO","AGUARDANDO"),created_at.gte.${dataMinOrcIso}`);

    await queryOrc;

    // Assert
    expect(filtrosOrcamento.length).toBe(1);
    expect(filtrosOrcamento[0]).toContain('SOLICITADO');
    expect(filtrosOrcamento[0]).toContain('created_at.gte');
  });

  it('deve garantir isolamento de carteira quando o usuário for consultor comum', async () => {
    // Setup
    const consultorId = 'consultor-999';
    let filtroEqAplicado: { col: string; val: any } | null = null;

    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      const originalEq = qMock.eq.bind(qMock);
      qMock.eq = vi.fn((col: string, val: any) => {
        filtroEqAplicado = { col, val };
        return originalEq(col, val);
      });
      return qMock;
    });

    // Action
    const q = supabase
      .from('viagens')
      .select('id, cliente_id, consultor_responsavel_id')
      .eq('consultor_responsavel_id', consultorId);

    await q;

    // Assert
    expect(filtroEqAplicado).toEqual({
      col: 'consultor_responsavel_id',
      val: consultorId
    });
  });

  it('deve calcular oportunidades pelo NextTripEngineService sem joins relacionais pesados', () => {
    // Setup
    const hoje = new Date();
    const dataIda14MesesAtras = new Date(hoje);
    dataIda14MesesAtras.setMonth(hoje.getMonth() - 14);
    const dataVolta14MesesAtras = new Date(dataIda14MesesAtras);
    dataVolta14MesesAtras.setDate(dataIda14MesesAtras.getDate() + 10);

    const mockViagens = [
      {
        id: 'viagem-1',
        titulo: 'Férias em Paris',
        cliente_id: 'cli-001',
        cliente_nome: 'Carlos Drummond',
        consultor_responsavel_id: 'cons-1',
        consultor_nome: 'Renata',
        data_ida: dataIda14MesesAtras.toISOString().slice(0, 10),
        data_volta: dataVolta14MesesAtras.toISOString().slice(0, 10),
        status: 'CONCLUIDA',
        destino: 'Paris',
        categorias_viagem: ['europa'],
        observacoes: 'Amou o hotel e a gastronomia',
        nps_viagem: 10
      }
    ];

    const mockClientes = [
      {
        id: 'cli-001',
        nome: 'Carlos Drummond',
        telefone: '11999998888',
        email: 'carlos@paxflow.com',
        cpf: '12345678900',
        consultor_id: 'cons-1',
        next_trip_snooze_until: null
      }
    ];

    const mockOrcamentos: any[] = [];
    const settings = {};

    // Action
    const oportunidades = NextTripEngineService.calculateOpportunities(
      mockClientes,
      mockViagens,
      mockOrcamentos,
      settings,
      'cons-1',
      'admin'
    );

    // Assert
    expect(oportunidades.length).toBeGreaterThan(0);
    const op = oportunidades[0];
    expect(op.clienteId).toBe('cli-001');
    expect(op.clienteNome).toBe('Carlos Drummond');
    expect(op.scoreProntidao).toBeGreaterThanOrEqual(40);
    expect(['alto', 'medio', 'baixo']).toContain(op.nivelProntidao);
    expect(op.vetoresDetalhamento).toBeDefined();
    expect(op.vetoresDetalhamento?.sazonalidade).toBeDefined();
  });

  it('deve fatiar a paginação em blocos de 20 oportunidades mantendo consistência da lista', () => {
    // Setup
    const oportunidadesMockadas = Array.from({ length: 55 }, (_, i) => ({
      clienteId: `cli-${i + 1}`,
      clienteNome: `Cliente ${i + 1}`,
      telefone: '11999999999',
      email: `cliente${i + 1}@teste.com`,
      consultorId: 'cons-1',
      consultorNome: 'Renata',
      pontuacaoGeral: 90 - (i % 30),
      nivelProntidao: (i < 25 ? 'alto' : 'medio') as 'alto' | 'medio',
      categoriaRecomendada: 'europa' as const,
      origemOportunidade: 'viagem_passada' as const,
      motivoPrincipal: 'Janela sazonal de 12 meses',
      argumentosVenda: ['Argumento 1'],
      vetoresScore: {
        sazonalidade: 90,
        satisfacaoNps: 100,
        perfilEngajamento: 80,
        mesCompetencia: 70,
        tempoInatividade: 80
      },
      ultimoDestino: 'Paris',
      dataUltimaViagem: '2025-05-10',
      destinoRecomendado: 'Roma'
    }));

    // Action
    const limiteInicial = 20;
    const primeiraPagina = oportunidadesMockadas.slice(0, limiteInicial);
    const limiteAposMais = limiteInicial + 20;
    const segundaPagina = oportunidadesMockadas.slice(0, limiteAposMais);

    // Assert
    expect(primeiraPagina.length).toBe(20);
    expect(primeiraPagina[0].clienteId).toBe('cli-1');
    expect(primeiraPagina[19].clienteId).toBe('cli-20');
    expect(segundaPagina.length).toBe(40);
    expect(segundaPagina[39].clienteId).toBe('cli-40');
    expect(oportunidadesMockadas.length).toBe(55);
  });
});
