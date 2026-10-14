import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViagensDivisoesService } from '../../src/services/viagensDivisoesService';
import { supabase } from '../../src/services/supabase';

// Mock do módulo supabase
vi.mock('../../src/services/supabase', () => {
  return {
    supabase: {
      from: vi.fn()
    }
  };
});

describe('ViagensDivisoesService - Testes Subcutâneos de Divisão, RAV e Governança', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve aprovar soma quando o total for rigorosamente 100,00%', () => {
    // Setup
    const divisoes = [
      { percentual: 80 },
      { percentual: 20 }
    ];

    // Action
    const resultado = ViagensDivisoesService.validarSomaDivisoes(divisoes);

    // Assert
    expect(resultado.valida).toBe(true);
    expect(resultado.soma).toBe(100);
    expect(resultado.diferenca).toBe(0);
  });

  it('deve rejeitar soma quando for menor que 100,00% e indicar a falta exata', () => {
    // Setup
    const divisoes = [
      { percentual: 60 },
      { percentual: 30 }
    ];

    // Action
    const resultado = ViagensDivisoesService.validarSomaDivisoes(divisoes);

    // Assert
    expect(resultado.valida).toBe(false);
    expect(resultado.soma).toBe(90);
    expect(resultado.diferenca).toBe(10);
    expect(resultado.mensagem).toContain('Faltam 10.00%');
  });

  it('deve rejeitar soma quando for maior que 100,00% e indicar o excesso', () => {
    // Setup
    const divisoes = [
      { percentual: 70 },
      { percentual: 40 }
    ];

    // Action
    const resultado = ViagensDivisoesService.validarSomaDivisoes(divisoes);

    // Assert
    expect(resultado.valida).toBe(false);
    expect(resultado.soma).toBe(110);
    expect(resultado.diferenca).toBe(-10);
    expect(resultado.mensagem).toContain('ultrapassa 100,00% em 10.00%');
  });

  it('deve validar com precisão divisões decimais centesimais (33.34 + 33.33 + 33.33)', () => {
    // Setup
    const divisoes = [
      { percentual: 33.34 },
      { percentual: 33.33 },
      { percentual: 33.33 }
    ];

    // Action
    const resultado = ViagensDivisoesService.validarSomaDivisoes(divisoes);

    // Assert
    expect(resultado.valida).toBe(true);
    expect(resultado.soma).toBe(100);
    expect(resultado.diferenca).toBe(0);
  });

  it('deve validar soma de RAV independentemente da soma de venda', () => {
    // Setup
    const divisoesValidas = [
      { percentual: 50, percentual_rav: 100 },
      { percentual: 50, percentual_rav: 0 }
    ];
    const divisoesInvalidas = [
      { percentual: 50, percentual_rav: 70 },
      { percentual: 50, percentual_rav: 20 }
    ];

    // Action
    const resValido = ViagensDivisoesService.validarSomaRav(divisoesValidas);
    const resInvalido = ViagensDivisoesService.validarSomaRav(divisoesInvalidas);

    // Assert
    expect(resValido.valida).toBe(true);
    expect(resValido.soma).toBe(100);
    expect(resInvalido.valida).toBe(false);
    expect(resInvalido.soma).toBe(90);
    expect(resInvalido.mensagem).toContain('Faltam 10.00% para totalizar 100,00% da RAV');
  });

  it('deve calcular corretamente a segregação de Venda 50/50 e RAV 100% para o Rafael (caso VIA-0325)', () => {
    // Setup
    const viagemVia0325 = {
      id: 'via-0325',
      consultor_id: 'user-rafael',
      divisoes: [
        { consultor_id: 'user-rafael', percentual: 50, percentual_rav: 100, is_titular: true },
        { consultor_id: 'user-guto', percentual: 50, percentual_rav: 0, is_titular: false }
      ]
    };

    // Action
    const vendaRafael = ViagensDivisoesService.calcularParticipacaoConsultor(viagemVia0325, 'user-rafael');
    const vendaGuto = ViagensDivisoesService.calcularParticipacaoConsultor(viagemVia0325, 'user-guto');
    const ravRafael = ViagensDivisoesService.calcularParticipacaoRavConsultor(viagemVia0325, 'user-rafael');
    const ravGuto = ViagensDivisoesService.calcularParticipacaoRavConsultor(viagemVia0325, 'user-guto');

    // Assert
    expect(vendaRafael).toBe(0.5);
    expect(vendaGuto).toBe(0.5);
    expect(ravRafael).toBe(1.0);
    expect(ravGuto).toBe(0.0);
  });

  it('deve fazer fallback para percentual geral quando percentual_rav não for especificado', () => {
    // Setup
    const viagemSemRavCustomizada = {
      id: 'via-padrao',
      consultor_id: 'user-titular',
      divisoes: [
        { consultor_id: 'user-titular', percentual: 80, is_titular: true },
        { consultor_id: 'user-parceiro', percentual: 20, is_titular: false }
      ]
    };

    // Action
    const ravTitular = ViagensDivisoesService.calcularParticipacaoRavConsultor(viagemSemRavCustomizada, 'user-titular');
    const ravParceiro = ViagensDivisoesService.calcularParticipacaoRavConsultor(viagemSemRavCustomizada, 'user-parceiro');

    // Assert
    expect(ravTitular).toBe(0.8);
    expect(ravParceiro).toBe(0.2);
  });

  it('deve persistir divisão com percentual_rav e sincronizar titular no Supabase', async () => {
    // Setup
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'viagens_divisoes') {
        return {
          delete: () => ({ eq: mockDeleteEq }),
          insert: mockInsert
        };
      }
      if (table === 'viagens') {
        return {
          update: () => ({ eq: mockUpdateEq })
        };
      }
      return {};
    });

    const params = {
      viagemId: 'viagem-0325',
      titularId: 'user-rafael',
      divisoes: [
        { consultor_id: 'user-rafael', percentual: 50, percentual_rav: 100, is_titular: true },
        { consultor_id: 'user-guto', percentual: 50, percentual_rav: 0, is_titular: false }
      ]
    };

    // Action
    const res = await ViagensDivisoesService.salvarDivisaoViagem(params);

    // Assert
    expect(res.success).toBe(true);
    expect(mockDeleteEq).toHaveBeenCalledWith('viagem_id', 'viagem-0325');
    expect(mockInsert).toHaveBeenCalledWith([
      { viagem_id: 'viagem-0325', consultor_id: 'user-rafael', percentual: 50, percentual_rav: 100, is_titular: true },
      { viagem_id: 'viagem-0325', consultor_id: 'user-guto', percentual: 50, percentual_rav: 0, is_titular: false }
    ]);
  });

  it('deve aplicar fallback Zero-Break ao salvar se a coluna percentual_rav for inexistente (erro 42703)', async () => {
    // Setup
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockInsert = vi.fn()
      .mockResolvedValueOnce({ error: { code: '42703', message: 'column "percentual_rav" does not exist' } })
      .mockResolvedValueOnce({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'viagens_divisoes') {
        return {
          delete: () => ({ eq: mockDeleteEq }),
          insert: mockInsert
        };
      }
      if (table === 'viagens') {
        return {
          update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) })
        };
      }
      return {};
    });

    const params = {
      viagemId: 'viagem-0325',
      titularId: 'user-rafael',
      divisoes: [
        { consultor_id: 'user-rafael', percentual: 50, percentual_rav: 100, is_titular: true },
        { consultor_id: 'user-guto', percentual: 50, percentual_rav: 0, is_titular: false }
      ]
    };

    // Action
    const res = await ViagensDivisoesService.salvarDivisaoViagem(params);

    // Assert
    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(2);
    // Na segunda chamada de insert (fallback), deve ter inserido sem a coluna percentual_rav
    expect(mockInsert).toHaveBeenLastCalledWith([
      { viagem_id: 'viagem-0325', consultor_id: 'user-rafael', percentual: 50, is_titular: true },
      { viagem_id: 'viagem-0325', consultor_id: 'user-guto', percentual: 50, is_titular: false }
    ]);
  });

  it('deve aplicar fallback Zero-Break sem quebrar ao detectar erro 42P01 de tabela inexistente', async () => {
    // Setup
    const mockOrder2 = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation "viagens_divisoes" does not exist' }
    });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    (supabase.from as any).mockReturnValue({
      select: mockSelect
    });

    // Action
    const divisoes = await ViagensDivisoesService.obterDivisoesPorViagem('viagem-123', 'titular-fallback');

    // Assert
    expect(divisoes).toHaveLength(1);
    expect(divisoes[0].consultor_id).toBe('titular-fallback');
    expect(divisoes[0].percentual).toBe(100);
    expect(divisoes[0].percentual_rav).toBe(100);
    expect(divisoes[0].is_titular).toBe(true);
  });
});
