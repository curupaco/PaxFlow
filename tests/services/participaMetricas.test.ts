import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetasService } from '../../src/services/metasService';
import { gerarRankingConsultores } from '../../src/controllers/relatoriosController';
import { registrarXp, concederMedalha } from '../../src/services/gamification';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  getSessaoAtual: vi.fn().mockResolvedValue({
    user: { id: 'user-admin' },
    perfil: { id: 'user-admin', role: 'admin' },
  }),
}));

describe('Controle de Participação em Métricas e KPIs (participa_metricas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve somar faturamento no total da agência mas excluir usuário desmarcado do ranking de metas', () => {
    // Setup
    const metaMock: any = {
      id: 'meta-1',
      nome: 'Meta Outubro',
      data_inicio: '2026-10-01',
      data_fim: '2026-10-31',
      tipo_calculo: 'comissao',
      valor_meta: 100000,
      faixas: []
    };

    const consultoresMock = [
      { id: 'c-1', nome: 'Consultor Ativo 1', ativo: true, participa_metricas: true },
      { id: 'c-2', nome: 'Consultor Ativo 2', ativo: true, participa_metricas: true },
      { id: 'c-admin', nome: 'Admin / Suporte', ativo: true, participa_metricas: false }
    ];

    const viagensMock = [
      { id: 'v-1', consultor_id: 'c-1', valor_total: 10000, status: 'confirmada', created_at: '2026-10-15T10:00:00.000Z' },
      { id: 'v-2', consultor_id: 'c-2', valor_total: 20000, status: 'confirmada', created_at: '2026-10-15T10:00:00.000Z' },
      { id: 'v-3', consultor_id: 'c-admin', valor_total: 50000, status: 'confirmada', created_at: '2026-10-15T10:00:00.000Z' }
    ];

    // Action
    const resultado = MetasService.calcularProgressoAgencia(
      metaMock,
      consultoresMock,
      [],
      viagensMock
    );

    // Assert
    // O total da agência deve somar todas as vendas (inclusive do admin: 10000 + 20000 + 50000 = 80000 de faturamento)
    expect(resultado.totalAgencia).toBe(80000);
    // Mas o ranking individual deve conter apenas os 2 consultores participantes
    expect(resultado.rankingConsultores.length).toBe(2);
    expect(resultado.rankingConsultores.some(r => r.consultor.id === 'c-admin')).toBe(false);
    expect(resultado.rankingConsultores[0].consultor.id).toBe('c-2');
    expect(resultado.rankingConsultores[1].consultor.id).toBe('c-1');
  });

  it('deve excluir consultores não participantes do ranking de vendas do relatoriosController', () => {
    // Setup
    const viagensMock = [
      { consultor_id: 'c-1', consultor_nome: 'Vendedor 1', valor_total: 5000, status: 'confirmado' },
      { consultor_id: 'c-2', consultor_nome: 'Vendedor 2', valor_total: 8000, status: 'confirmado' },
      { consultor_id: 'c-diretoria', consultor_nome: 'Diretor', valor_total: 20000, status: 'confirmado' }
    ];

    const consultoresMock = [
      { id: 'c-1', nome: 'Vendedor 1', participa_metricas: true },
      { id: 'c-2', nome: 'Vendedor 2', participa_metricas: true },
      { id: 'c-diretoria', nome: 'Diretor', participa_metricas: false }
    ];

    // Action
    const ranking = gerarRankingConsultores(viagensMock, consultoresMock);

    // Assert
    expect(ranking.length).toBe(2);
    expect(ranking.some(r => r.consultorId === 'c-diretoria')).toBe(false);
    expect(ranking[0].consultorId).toBe('c-2');
    expect(ranking[0].totalVendas).toBe(8000);
  });

  it('não deve conceder XP para usuário com participa_metricas = false', async () => {
    // Setup
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { participa_metricas: false },
      error: null
    });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: maybeSingleMock
      })
    });
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: selectMock } as any;
      }
      if (table === 'profiles_xp_logs') {
        return { insert: insertMock } as any;
      }
      return {} as any;
    });

    // Action
    await registrarXp('user-teste', 'TEST_ACTION', 100);

    // Assert
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('não deve conceder badges para usuário com participa_metricas = false', async () => {
    // Setup
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { participa_metricas: false },
      error: null
    });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: maybeSingleMock
      })
    });
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: selectMock } as any;
      }
      if (table === 'profiles_badges') {
        return { insert: insertMock } as any;
      }
      return {} as any;
    });

    // Action
    const concedido = await concederMedalha('user-teste', 'FAST_SALE');

    // Assert
    expect(concedido).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('deve simular resiliência a Schema Drift (42703) caso a coluna participa_metricas não exista', async () => {
    // Setup
    const erro42703 = { code: '42703', message: 'column "participa_metricas" of relation "profiles" does not exist' };
    const mockUpdate = vi.fn()
      .mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: erro42703 })
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { update: mockUpdate } as any;
      }
      return {} as any;
    });

    // Action: simulação do handler de update com fallback
    const updatePayload: any = {
      nome: 'Usuário Teste',
      participa_metricas: false
    };

    let updateRes = await supabase.from('profiles').update(updatePayload).eq('id', 'u-1');
    if (updateRes.error && updateRes.error.code === '42703') {
      delete updatePayload.participa_metricas;
      updateRes = await supabase.from('profiles').update(updatePayload).eq('id', 'u-1');
    }

    // Assert
    expect(updateRes.error).toBeNull();
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenLastCalledWith({ nome: 'Usuário Teste' });
  });
});
