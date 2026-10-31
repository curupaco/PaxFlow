import { describe, it, expect, vi } from 'vitest';
import { FinRemessasService } from '../../src/services/finRemessasService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('FinRemessasService - Testes Subcutâneos', () => {
  it('deve listar remessas com fallback seguro em caso de Schema Drift (42P01)', async () => {
    // Setup
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'relation fin_remessas does not exist' }
        })
      })
    });

    // Action
    const remessas = await FinRemessasService.listarRemessas();

    // Assert
    expect(remessas).toEqual([]);
  });

  it('deve criar uma nova remessa calculando a soma total dos títulos selecionados e vinculando-os', async () => {
    // Setup
    const mockTítulos = [
      { id: 'conta-1', valor_nominal: 1500.50 },
      { id: 'conta-2', valor_nominal: 2499.50 }
    ];

    const mockRemessaCriada = { id: 'remessa-uuid-123' };

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_pagar') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockTítulos, error: null })
          }),
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null })
          })
        };
      }
      if (tabela === 'fin_remessas') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockRemessaCriada, error: null })
            })
          })
        };
      }
      return {};
    });

    // Action
    const res = await FinRemessasService.criarRemessa({
      favorecido: 'Fornecedor Consolidado SA',
      dataPrevista: '2026-11-10',
      contasIds: ['conta-1', 'conta-2'],
      observacoes: 'Agrupamento para pagamento conjunto'
    });

    // Assert
    expect(res.sucesso).toBe(true);
    expect(res.remessaId).toBe('remessa-uuid-123');
  });

  it('deve baixar a remessa consolidada atualizando o mestre e liquidando todos os títulos vinculados', async () => {
    // Setup
    const itensMock = [
      { id: 'conta-1', valor_nominal: 1500.50 },
      { id: 'conta-2', valor_nominal: 2499.50 }
    ];

    const mockUpdateRemessa = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockUpdateConta = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'fin_remessas') {
        return {
          update: mockUpdateRemessa
        };
      }
      if (tabela === 'fin_contas_pagar') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ data: itensMock, error: null })
            })
          }),
          update: mockUpdateConta
        };
      }
      return {};
    });

    // Action
    const res = await FinRemessasService.baixarRemessaConsolidada({
      remessaId: 'remessa-uuid-123',
      dataPagamento: '2026-11-10',
      contaBancariaId: 'banco-itau-id',
      comprovanteUrl: 'https://storage/comprovante.pdf',
      usuarioId: 'admin-id'
    });

    // Assert
    expect(res.sucesso).toBe(true);
    expect(mockUpdateRemessa).toHaveBeenCalled();
  });

  it('deve desagrupar remessa desvinculando todos os títulos e excluindo a remessa mestre', async () => {
    // Setup
    const remessaId = 'remessa-para-desagrupar-999';

    const mockUpdateTítulos = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockDeleteRemessa = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_pagar') {
        return {
          update: mockUpdateTítulos
        };
      }
      if (tabela === 'fin_remessas') {
        return {
          delete: mockDeleteRemessa
        };
      }
      return {};
    });

    // Action
    const res = await FinRemessasService.desagruparRemessa(remessaId);

    // Assert
    expect(res.sucesso).toBe(true);
    expect(mockUpdateTítulos).toHaveBeenCalledWith({ remessa_id: null });
    expect(mockDeleteRemessa).toHaveBeenCalled();
  });

  it('deve retornar erro amigável ao tentar desagrupar sem fornecer o ID da remessa', async () => {
    // Setup
    const remessaIdInvalido = '';

    // Action
    const res = await FinRemessasService.desagruparRemessa(remessaIdInvalido);

    // Assert
    expect(res.sucesso).toBe(false);
    expect(res.erro).toContain('ID da remessa não fornecido');
  });

  it('deve ser resiliente a Schema Drift (42P01 / 42703) ao desagrupar remessa sem quebrar a agência', async () => {
    // Setup
    const remessaId = 'remessa-drift-test';

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_pagar') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { code: '42703', message: 'column remessa_id does not exist' } })
          })
        };
      }
      if (tabela === 'fin_remessas') {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { code: '42P01', message: 'relation fin_remessas does not exist' } })
          })
        };
      }
      return {};
    });

    // Action
    const res = await FinRemessasService.desagruparRemessa(remessaId);

    // Assert
    expect(res.sucesso).toBe(true);
  });
});

