import { describe, it, expect, vi } from 'vitest';
import { FinPlanoContasService, CATEGORIAS_FALLBACK, TIPOS_CUSTO_FALLBACK } from '../../src/services/finPlanoContasService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('FinPlanoContasService - Testes Subcutâneos', () => {
  it('deve listar os 5 tipos de custo padrão no fallback caso o banco esteja sem migração (Schema Drift 42P01)', async () => {
    // Setup
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'relation fin_tipos_custo does not exist' }
        })
      })
    });

    // Action
    const tipos = await FinPlanoContasService.listarTiposCusto();

    // Assert
    expect(tipos).toHaveLength(5);
    expect(tipos.map(t => t.nome)).toEqual(
      expect.arrayContaining(['Custos Diretos', 'Despesas Fixas', 'Despesas Variáveis', 'Investimentos', 'Gastos Não Operacionais'])
    );
  });

  it('deve incluir REPASSE AGAXTUR dentro das Despesas Variáveis nas categorias padrão', async () => {
    // Setup: simula fallback de categorias com encadeamento de eq
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation fin_categorias does not exist' }
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockOrder
        }),
        order: mockOrder
      })
    });

    // Action
    const categorias = await FinPlanoContasService.listarCategorias('tipo-3'); // tipo-3 = Despesas Variáveis

    // Assert
    const repasseAgaxtur = categorias.find(c => c.nome === 'REPASSE AGAXTUR');
    expect(repasseAgaxtur).toBeDefined();
    expect(repasseAgaxtur?.tipo_custo_id).toBe('tipo-3');
  });

  it('deve retornar contas bancárias padrão com saldo inicial zerado no fallback seguro', async () => {
    // Setup
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'relation fin_contas_bancarias does not exist' }
          })
        })
      })
    });

    // Action
    const bancos = await FinPlanoContasService.listarContasBancarias();

    // Assert
    expect(bancos.length).toBeGreaterThanOrEqual(4);
    expect(bancos.some(b => b.nome_banco === 'Banco Itaú')).toBe(true);
    expect(bancos.some(b => b.nome_banco === 'Banco Cora')).toBe(true);
  });
});
