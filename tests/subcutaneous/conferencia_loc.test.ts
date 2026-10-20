import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';

// Mock do supabase
vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Conferência Financeira de LOC - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve barrar conferência de LOC quando houver recebimento pendente (saldo não quitado)', () => {
    // Setup
    const loc = 'LOC-590285';
    const valorVendaTotal = 9811.59;
    const pagamentosGrupo = [
      { codigo_localizador: 'LOC-590285', valor: 5000.00 }
    ];
    const totalPago = pagamentosGrupo.reduce((acc, p) => acc + p.valor, 0);

    // Action
    const isTotalmentePago = pagamentosGrupo.length > 0 && Math.abs(totalPago - valorVendaTotal) <= 0.01;

    // Assert
    expect(isTotalmentePago).toBe(false);
    expect(totalPago).toBeLessThan(valorVendaTotal);
  });

  it('deve aprovar e persistir conferência de LOC no Supabase quando recebimento for 100% quitado', async () => {
    // Setup
    const viagemId = 'via-test-123';
    const loc = 'LOC-590285';
    const valorVendaTotal = 9811.59;
    const pagamentosGrupo = [
      { codigo_localizador: 'LOC-590285', valor: 4969.94 },
      { codigo_localizador: 'LOC-590285', valor: 3549.99 },
      { codigo_localizador: 'LOC-590285', valor: 534.99 },
      { codigo_localizador: 'LOC-590285', valor: 756.67 }
    ];
    const totalPago = pagamentosGrupo.reduce((acc, p) => acc + p.valor, 0);

    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    });
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'loc_conferencias') {
        return {
          delete: deleteMock,
          insert: insertMock
        };
      }
      return {};
    });

    // Action
    const isTotalmentePago = pagamentosGrupo.length > 0 && Math.abs(totalPago - valorVendaTotal) <= 0.01;
    let persistidoComSucesso = false;

    if (isTotalmentePago) {
      await supabase.from('loc_conferencias').delete().eq('viagem_id', viagemId).eq('codigo_localizador', loc);
      const { error } = await supabase.from('loc_conferencias').insert({
        viagem_id: viagemId,
        codigo_localizador: loc,
        conferido: true
      });
      persistidoComSucesso = !error;
    }

    // Assert
    expect(isTotalmentePago).toBe(true);
    expect(persistidoComSucesso).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('loc_conferencias');
    expect(insertMock).toHaveBeenCalledWith({
      viagem_id: viagemId,
      codigo_localizador: loc,
      conferido: true
    });
  });

  it('deve remover conferência de LOC no Supabase liberando o grupo para edição', async () => {
    // Setup
    const viagemId = 'via-test-123';
    const loc = 'LOC-590285';

    const eqLocMock = vi.fn().mockResolvedValue({ error: null });
    const eqViagemMock = vi.fn().mockReturnValue({ eq: eqLocMock });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqViagemMock });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'loc_conferencias') {
        return { delete: deleteMock };
      }
      return {};
    });

    // Action
    const { error } = await supabase
      .from('loc_conferencias')
      .delete()
      .eq('viagem_id', viagemId)
      .eq('codigo_localizador', loc);

    // Assert
    expect(error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('loc_conferencias');
    expect(eqViagemMock).toHaveBeenCalledWith('viagem_id', viagemId);
    expect(eqLocMock).toHaveBeenCalledWith('codigo_localizador', loc);
  });
});
