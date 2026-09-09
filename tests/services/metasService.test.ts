import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetasService } from '../../src/services/metasService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => {
  const fromMock = vi.fn();
  return {
    supabase: {
      from: fromMock,
    },
  };
});

describe('MetasService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar períodos de metas agrupando com suas faixas de premiação', async () => {
    // Setup
    const periodosMock = [
      {
        id: 'p-1',
        nome: 'Meta Outubro 2026',
        data_inicio: '2026-10-01',
        data_fim: '2026-10-31',
        tipo_calculo: 'comissao',
        is_campanha: false,
        is_meta_loja: true,
        valor_meta: 50000,
      },
    ];

    const faixasMock = [
      {
        id: 'f-1',
        periodo_id: 'p-1',
        nome: 'Bronze',
        valor_minimo: 10000,
        bonus_xp: 50,
        recompensa: 'Troféu Bronze',
        cor: '#cd7f32',
      },
      {
        id: 'f-2',
        periodo_id: 'p-1',
        nome: 'Ouro',
        valor_minimo: 50000,
        bonus_xp: 200,
        recompensa: 'Bônus R$ 500',
        cor: '#ffd700',
      },
    ];

    const orderPeriodos = vi.fn().mockResolvedValue({ data: periodosMock, error: null });
    const selectPeriodos = vi.fn().mockReturnValue({ order: orderPeriodos });

    const orderFaixas = vi.fn().mockResolvedValue({ data: faixasMock, error: null });
    const selectFaixas = vi.fn().mockReturnValue({ order: orderFaixas });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'meta_periodos') return { select: selectPeriodos } as any;
      if (table === 'meta_faixas') return { select: selectFaixas } as any;
      return {} as any;
    });

    // Action
    const resultado = await MetasService.obterMetaPeriodos();

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('p-1');
    expect(resultado[0].faixas).toHaveLength(2);
    expect(resultado[0].faixas[0].nome).toBe('Bronze');
    expect(resultado[0].faixas[1].valor_minimo).toBe(50000);
  });

  it('deve cadastrar novo período de metas persistindo faixas associadas', async () => {
    // Setup
    const periodoCriadoMock = {
      id: 'p-novo-99',
      nome: 'Campanha de Verão',
      data_inicio: '2026-11-01',
      data_fim: '2026-11-30',
      tipo_calculo: 'lucro',
      is_campanha: true,
      is_meta_loja: false,
      valor_meta: 30000,
    };

    const singlePeriodo = vi.fn().mockResolvedValue({ data: periodoCriadoMock, error: null });
    const selectPeriodo = vi.fn().mockReturnValue({ single: singlePeriodo });
    const insertPeriodo = vi.fn().mockReturnValue({ select: selectPeriodo });

    const selectFaixas = vi.fn().mockResolvedValue({
      data: [{ id: 'f-1', periodo_id: 'p-novo-99', nome: 'Nível 1', valor_minimo: 10000 }],
      error: null,
    });
    const insertFaixas = vi.fn().mockReturnValue({ select: selectFaixas });

    const deletePeriodoEq = vi.fn().mockResolvedValue({ error: null });
    const deletePeriodo = vi.fn().mockReturnValue({ eq: deletePeriodoEq });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'meta_periodos') return { insert: insertPeriodo, delete: deletePeriodo } as any;
      if (table === 'meta_faixas') return { insert: insertFaixas } as any;
      return {} as any;
    });

    const novoPeriodo: any = {
      nome: 'Campanha de Verão',
      data_inicio: '2026-11-01',
      data_fim: '2026-11-30',
      tipo_calculo: 'lucro',
      is_campanha: true,
      is_meta_loja: false,
      valor_meta: 30000,
    };

    const faixasInput: any[] = [
      { nome: 'Nível 1', valor_minimo: 10000, bonus_xp: 100, recompensa: 'Prêmio A', cor: '#fff' },
    ];

    // Action
    const resultado = await MetasService.criarMetaPeriodo(novoPeriodo, faixasInput);

    // Assert
    expect(resultado.id).toBe('p-novo-99');
    expect(insertPeriodo).toHaveBeenCalled();
    expect(insertFaixas).toHaveBeenCalled();
  });

  it('deve excluir período de meta diretamente no banco de dados', async () => {
    // Setup
    const deletePeriodoEq = vi.fn().mockResolvedValue({ error: null });
    const deletePeriodo = vi.fn().mockReturnValue({ eq: deletePeriodoEq });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'meta_periodos') return { delete: deletePeriodo } as any;
      return {} as any;
    });

    // Action
    await MetasService.excluirMetaPeriodo('p-del-1');

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('meta_periodos');
    expect(deletePeriodoEq).toHaveBeenCalledWith('id', 'p-del-1');
  });
});
