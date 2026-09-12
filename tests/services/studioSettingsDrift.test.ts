import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Studio Settings - Resiliência a Schema Drift (42703)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve salvar as configurações do Studio com sucesso quando o banco possui as colunas', async () => {
    // Setup
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    });
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'global_settings') {
        return { update: mockUpdate } as any;
      }
      return {} as any;
    });

    // Action
    const resultado = await StudioPropostasService.salvarConfiguracoesStudio('settings-123', {
      habilitar_studio_pro: true,
      studio_moeda_padrao: 'USD',
      studio_validade_dias: 10,
      studio_permitir_aceite_formal: true
    });

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(resultado.fallbackAplicado).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith({
      habilitar_studio_pro: true,
      studio_moeda_padrao: 'USD',
      studio_validade_dias: 10,
      studio_permitir_aceite_formal: true
    });
  });

  it('deve interceptar erro 42703 (coluna inexistente) e aplicar fallback resiliente sem quebrar a agência', async () => {
    // Setup
    const erroColunaInexistente = {
      code: '42703',
      message: 'column "habilitar_studio_pro" does not exist'
    };
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: erroColunaInexistente
      })
    });
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'global_settings') {
        return { update: mockUpdate } as any;
      }
      return {} as any;
    });

    // Action
    const resultado = await StudioPropostasService.salvarConfiguracoesStudio('settings-123', {
      habilitar_studio_pro: false,
      studio_moeda_padrao: 'EUR',
      studio_validade_dias: 14,
      studio_permitir_aceite_formal: false
    });

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(resultado.fallbackAplicado).toBe(true);
  });
});
