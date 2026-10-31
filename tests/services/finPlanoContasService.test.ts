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

  it('deve permitir inativar uma conta bancária com sucesso', async () => {
    // Setup
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    (supabase.from as any).mockReturnValue({
      update: mockUpdate
    });

    // Action
    const resultado = await FinPlanoContasService.inativarContaBancaria('conta-cora-123', false);

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ ativo: false }));
  });

  it('deve inativar automaticamente (soft delete amigável) caso a conta bancária tenha lançamentos vinculados', async () => {
    // Setup: simula 5 contas vinculadas no fin_contas_pagar
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_pagar') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null })
          })
        };
      }
      if (tabela === 'fin_remessas') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null })
          })
        };
      }
      if (tabela === 'fin_contas_bancarias') {
        return {
          update: mockUpdate
        };
      }
      return {};
    });

    // Action
    const resultado = await FinPlanoContasService.excluirContaBancaria('conta-cora-123');

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(resultado.inativada).toBe(true);
    expect(resultado.erro).toContain('inativada');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ ativo: false }));
  });

  it('deve excluir fisicamente a conta bancária quando não houver vínculos históricos', async () => {
    // Setup: 0 contas a pagar e 0 remessas
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_pagar' || tabela === 'fin_remessas') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null })
          })
        };
      }
      if (tabela === 'fin_contas_bancarias') {
        return {
          delete: mockDelete
        };
      }
      return {};
    });

    // Action
    const resultado = await FinPlanoContasService.excluirContaBancaria('conta-sem-uso');

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(resultado.inativada).toBe(false);
    expect(mockDelete).toHaveBeenCalled();
  });

  it('deve tratar Schema Drift 42703 (coluna ativo inexistente) aplicando fallback seguro ao salvar conta bancária', async () => {
    // Setup: insert retorna erro 42703
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42703', message: 'column ativo does not exist' }
        })
      })
    });

    (supabase.from as any).mockReturnValue({
      insert: mockInsert
    });

    // Action
    const res = await FinPlanoContasService.salvarContaBancaria(
      'Banco Cora Teste',
      'corrente',
      0,
      undefined,
      true
    );

    // Assert
    expect(res.sucesso).toBe(true);
    expect(res.id).toBeDefined();
  });
});
