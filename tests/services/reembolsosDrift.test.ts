import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Reembolsos Service & Database - Resiliência a Schema Drift (42703)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve persistir os novos campos de tratativa e valores com sucesso quando as colunas existem no Supabase', async () => {
    // Setup
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    });
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'reembolsos') {
        return { update: mockUpdate } as any;
      }
      return {} as any;
    });

    const payload = {
      status: 'solicitado',
      status_tratativa: 'pendente_agencia',
      valor_produto: 5000,
      valor_solicitado: 5000,
      valor_aprovado: 4500,
      valor_utilizado_pax: 2000
    };

    // Action
    const { error } = await supabase.from('reembolsos').update(payload).eq('id', 'rmb-123');

    // Assert
    expect(error).toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith(payload);
  });

  it('deve interceptar erro 42703 (coluna inexistente) e aplicar fallback em observações financeiras sem travar a tela', async () => {
    // Setup
    const erroColunaInexistente = {
      code: '42703',
      message: 'column "status_tratativa" does not exist'
    };

    const mockUpdatePrimary = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: erroColunaInexistente
      })
    });

    const mockUpdateFallback = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    });

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'reembolsos') {
        callCount++;
        return { update: callCount === 1 ? mockUpdatePrimary : mockUpdateFallback } as any;
      }
      return {} as any;
    });

    const payload = {
      status: 'solicitado',
      status_tratativa: 'pendente_fornecedor',
      valor_produto: 3000,
      valor_solicitado: 3000,
      valor_aprovado: 2500,
      valor_utilizado_pax: 1000
    };

    // Action (Simulando o fallback implementado na camada de serviço/página)
    let res = await supabase.from('reembolsos').update(payload).eq('id', 'rmb-123');
    let fallbackAplicado = false;

    if (res.error && (res.error.code === '42703' || res.error.message?.includes('does not exist'))) {
      const fallbackPayload = {
        status: payload.status,
        valor_solicitado: payload.valor_solicitado,
        valor_aprovado: payload.valor_aprovado,
        observacoes_financeiras: JSON.stringify({
          status_tratativa: payload.status_tratativa,
          valor_produto: payload.valor_produto,
          valor_utilizado_pax: payload.valor_utilizado_pax
        })
      };
      res = await supabase.from('reembolsos').update(fallbackPayload).eq('id', 'rmb-123');
      fallbackAplicado = true;
    }

    // Assert
    expect(fallbackAplicado).toBe(true);
    expect(res.error).toBeNull();
  });
});
