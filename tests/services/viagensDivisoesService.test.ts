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

describe('ViagensDivisoesService - Testes Subcutâneos de Divisão e Governança', () => {
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

  it('deve calcular corretamente a fração de participação de titular e co-consultor', () => {
    // Setup
    const viagemComDivisao = {
      id: 'via-1',
      consultor_id: 'user-titular',
      divisoes: [
        { consultor_id: 'user-titular', percentual: 80, is_titular: true },
        { consultor_id: 'user-parceiro', percentual: 20, is_titular: false }
      ]
    };

    // Action
    const fatiaTitular = ViagensDivisoesService.calcularParticipacaoConsultor(viagemComDivisao, 'user-titular');
    const fatiaParceiro = ViagensDivisoesService.calcularParticipacaoConsultor(viagemComDivisao, 'user-parceiro');
    const fatiaOutro = ViagensDivisoesService.calcularParticipacaoConsultor(viagemComDivisao, 'user-estranho');

    // Assert
    expect(fatiaTitular).toBe(0.8);
    expect(fatiaParceiro).toBe(0.2);
    expect(fatiaOutro).toBe(0);
  });

  it('deve retornar 100% para o titular quando for viagem legada sem divisão cadastrada', () => {
    // Setup
    const viagemLegada = {
      id: 'via-legada',
      consultor_id: 'user-titular',
      divisoes: []
    };

    // Action
    const fatiaTitular = ViagensDivisoesService.calcularParticipacaoConsultor(viagemLegada, 'user-titular');
    const fatiaParceiro = ViagensDivisoesService.calcularParticipacaoConsultor(viagemLegada, 'user-parceiro');

    // Assert
    expect(fatiaTitular).toBe(1);
    expect(fatiaParceiro).toBe(0);
  });

  it('deve persistir divisão válida no banco com sucesso e sincronizar titular', async () => {
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
      viagemId: 'viagem-123',
      titularId: 'consultor-titular',
      divisoes: [
        { consultor_id: 'consultor-titular', percentual: 80, is_titular: true },
        { consultor_id: 'consultor-parceiro', percentual: 20, is_titular: false }
      ]
    };

    // Action
    const res = await ViagensDivisoesService.salvarDivisaoViagem(params);

    // Assert
    expect(res.success).toBe(true);
    expect(mockDeleteEq).toHaveBeenCalledWith('viagem_id', 'viagem-123');
    expect(mockInsert).toHaveBeenCalledWith([
      { viagem_id: 'viagem-123', consultor_id: 'consultor-titular', percentual: 80, is_titular: true },
      { viagem_id: 'viagem-123', consultor_id: 'consultor-parceiro', percentual: 20, is_titular: false }
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
    expect(divisoes[0].is_titular).toBe(true);
  });
});
