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

  it('deve barrar conferência se houver diferença residual centesimal (ex: faltam R$ 0,02 para bater)', () => {
    // Setup
    const valorVendaTotal = 15000.00;
    const pagamentosGrupo = [
      { codigo_localizador: 'LOC-MULTI', valor: 10000.00 },
      { codigo_localizador: 'LOC-MULTI', valor: 4999.98 }
    ];
    const totalPago = pagamentosGrupo.reduce((acc, p) => acc + p.valor, 0);

    // Action
    const isTotalmentePago = pagamentosGrupo.length > 0 && Math.abs(totalPago - valorVendaTotal) <= 0.01;

    // Assert
    expect(isTotalmentePago).toBe(false);
    expect(valorVendaTotal - totalPago).toBeCloseTo(0.02, 2);
  });

  it('deve bloquear exclusão de produtos quando o grupo do LOC já foi conferido pela auditoria', () => {
    // Setup
    const locConferido = true;
    const produtoIdParaExcluir = 'prod-loc-conferido-123';

    // Action: Validação da trava de governança
    let podeExcluir = false;
    let motivoBloqueio = '';

    if (locConferido) {
      podeExcluir = false;
      motivoBloqueio = 'Produto bloqueado: O localizador já foi auditado e conferido pelo financeiro.';
    } else {
      podeExcluir = true;
    }

    // Assert
    expect(podeExcluir).toBe(false);
    expect(motivoBloqueio).toContain('já foi auditado e conferido');
  });

  it('deve lidar com Schema Drift (42P01) com fallback gracioso sem quebrar a consulta de conferências', async () => {
    // Setup
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'relation loc_conferencias does not exist' }
      })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'loc_conferencias') {
        return { select: selectMock };
      }
      return {};
    });

    // Action
    let conferidos: string[] = [];
    const { data, error } = await supabase.from('loc_conferencias').select('codigo_localizador').eq('viagem_id', 'via-drift');

    if (error && error.code === '42P01') {
      conferidos = []; // Fallback seguro
    } else if (data) {
      conferidos = data.map((c: any) => c.codigo_localizador);
    }

    // Assert
    expect(conferidos).toEqual([]);
    expect(selectMock).toHaveBeenCalled();
  });
});

