import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReembolsosService } from '../../src/services/reembolsosService';
import { supabase } from '../../src/services/supabase';
import {
  areAllReembolsosConcluidos,
  filterReembolsosByTerm,
  formatStatusTratativa
} from '../../src/controllers/reembolsosController';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Reembolsos Fluxo Completo - Testes Subcutâneos de Integridade, SLA e Regras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve excluir o reembolso e restaurar o status do produto vinculado para "confirmado" se não houver outros reembolsos', async () => {
    // Setup
    const reembolsoId = 'rmb-teste-001';
    const produtoId = 'prod-teste-888';

    const mockSelectReembolso = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: reembolsoId, produto_viagem_id: produtoId, viagem_id: 'trip-111' },
          error: null
        })
      })
    });

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockSelectOutros = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [], // Nenhum outro reembolso
        error: null
      })
    });

    const mockUpdateProduto = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'reembolsos') {
        return {
          select: mockSelectReembolso,
          delete: mockDelete
        } as any;
      }
      if (table === 'produtos_viagem') {
        return {
          update: mockUpdateProduto
        } as any;
      }
      return {} as any;
    });

    // Mock para a segunda consulta em 'reembolsos' verificando se restam outros
    mockSelectReembolso.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: reembolsoId, produto_viagem_id: produtoId, viagem_id: 'trip-111' },
          error: null
        })
      })
    }).mockReturnValueOnce(mockSelectOutros());

    // Action
    const resultado = await ReembolsosService.excluirReembolso(reembolsoId);

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockUpdateProduto).toHaveBeenCalledWith({ status: 'confirmado' });
  });

  it('não deve restaurar produto para "confirmado" ao excluir se ainda restar outro reembolso ativo para o mesmo produto', async () => {
    // Setup
    const reembolsoId = 'rmb-teste-001';
    const produtoId = 'prod-teste-888';

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockUpdateProduto = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    let selectCall = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'reembolsos') {
        return {
          select: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) {
              return {
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: reembolsoId, produto_viagem_id: produtoId, viagem_id: 'trip-111' },
                    error: null
                  })
                })
              };
            }
            return {
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'rmb-outro-ativo' }], // Ainda existe outro reembolso
                error: null
              })
            };
          }),
          delete: mockDelete
        } as any;
      }
      if (table === 'produtos_viagem') {
        return {
          update: mockUpdateProduto
        } as any;
      }
      return {} as any;
    });

    // Action
    const resultado = await ReembolsosService.excluirReembolso(reembolsoId);

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockUpdateProduto).not.toHaveBeenCalled();
  });

  it('deve identificar corretamente se todos os reembolsos de uma viagem estão concluídos (areAllReembolsosConcluidos)', () => {
    // Setup
    const reembolsosMisto = [
      { id: 'r1', status: 'pago', status_tratativa: 'concluido' },
      { id: 'r2', status: 'solicitado', status_tratativa: 'pendente_fornecedor' }
    ];

    const reembolsosTodosConcluidos = [
      { id: 'r1', status: 'pago', status_tratativa: 'concluido' },
      { id: 'r2', status: 'recusado', status_tratativa: 'concluido' },
      { id: 'r3', status: 'cancelado', status_tratativa: 'pendente_agencia' }
    ];

    const reembolsosVazio: any[] = [];

    // Action & Assert
    // Viagem com um reembolso pago e um em aberto NÃO pode ser considerada concluída (não silencia SLA)
    expect(areAllReembolsosConcluidos(reembolsosMisto)).toBe(false);

    // Viagem onde todos foram pagos/recusados/cancelados DEVE ser considerada concluída
    expect(areAllReembolsosConcluidos(reembolsosTodosConcluidos)).toBe(true);

    // Lista vazia não deve ser considerada concluída
    expect(areAllReembolsosConcluidos(reembolsosVazio)).toBe(false);
  });

  it('deve filtrar reembolsos por termo e por forma de devolução financeira', () => {
    // Setup
    const listaReembolsos = [
      {
        id: 'rmb-01',
        codigo_ref: 'RBS-0001',
        forma_devolucao: 'Pix / Transferência Bancária',
        status_tratativa: 'pendente_agencia',
        viagem: { destino: 'Paris', cliente: { nome: 'Maria Silva' } }
      },
      {
        id: 'rmb-02',
        codigo_ref: 'RBS-0002',
        forma_devolucao: 'Carta de Crédito',
        status_tratativa: 'pendente_fornecedor',
        viagem: { destino: 'Lisboa', cliente: { nome: 'João Souza' } }
      },
      {
        id: 'rmb-03',
        codigo_ref: 'RBS-0003',
        forma_devolucao: 'Estorno Cartão de Crédito',
        status_tratativa: 'pendente_agaxtur',
        viagem: { destino: 'Roma', cliente: { nome: 'Carlos Silva' } }
      }
    ];

    // Action 1: Filtrar apenas por forma de devolução 'Carta de Crédito'
    const resultadoForma = filterReembolsosByTerm(listaReembolsos, '', 'Carta de Crédito');

    // Assert 1
    expect(resultadoForma).toHaveLength(1);
    expect(resultadoForma[0].id).toBe('rmb-02');

    // Action 2: Filtrar por termo 'Silva' com forma de devolução 'Pix'
    const resultadoTermoEForma = filterReembolsosByTerm(listaReembolsos, 'Silva', 'Pix');

    // Assert 2
    expect(resultadoTermoEForma).toHaveLength(1);
    expect(resultadoTermoEForma[0].id).toBe('rmb-01');

    // Action 3: Filtrar por termo 'Silva' com todas as formas de devolução
    const resultadoTodosSilva = filterReembolsosByTerm(listaReembolsos, 'Silva', 'todas');

    // Assert 3
    expect(resultadoTodosSilva).toHaveLength(2);
    expect(resultadoTodosSilva.map(r => r.id)).toEqual(['rmb-01', 'rmb-03']);
  });

  it('deve formatar corretamente as chaves e rótulos de tratativas de reembolso', () => {
    // Setup & Action & Assert
    expect(formatStatusTratativa('pendente_agencia').key).toBe('pendente_agencia');
    expect(formatStatusTratativa('pendente_fornecedor').key).toBe('pendente_fornecedor');
    expect(formatStatusTratativa('pendente_agaxtur').key).toBe('pendente_agaxtur');
    expect(formatStatusTratativa('concluido').key).toBe('concluido');
    expect(formatStatusTratativa('pago').key).toBe('concluido');
    expect(formatStatusTratativa(undefined).key).toBe('pendente_agencia');
  });
});
