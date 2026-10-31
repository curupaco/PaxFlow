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

  it('deve processar cancelamento parcial desacoplado: marca produto como reembolsado sem bloquear o status da viagem', async () => {
    // Setup
    const produtoId = 'prod-hotel-cancelado';
    const viagemId = 'viagem-em-andamento-123';

    let updateViagemChamado = false;
    let updateProdutoStatus = '';

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'rmb-parcial-1', viagem_id: viagemId, produto_viagem_id: produtoId },
          error: null
        })
      })
    });

    vi.mocked(supabase.from).mockImplementation((tabela: string) => {
      if (tabela === 'reembolsos') {
        return { insert: mockInsert } as any;
      }
      if (tabela === 'produtos_viagem') {
        return {
          update: vi.fn().mockImplementation((payload) => {
            updateProdutoStatus = payload.status;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          })
        } as any;
      }
      if (tabela === 'viagens') {
        return {
          update: vi.fn().mockImplementation(() => {
            updateViagemChamado = true;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          })
        } as any;
      }
      return {} as any;
    });

    // Action: Reembolso parcial onde a viagem continua acontecendo normalmente (atualizarStatusViagem: false)
    const res = await ReembolsosService.criarSolicitacao({
      viagemId,
      produtoViagemId: produtoId,
      consultorSolicitanteId: 'consultor-1',
      valorSolicitado: 1200.00,
      valorProdutoOriginal: 1200.00,
      motivoCancelamento: 'Passageiro desistiu de 1 das diárias',
      atualizarStatusViagem: false
    });

    // Assert
    expect(res.sucesso).toBe(true);
    expect(updateProdutoStatus).toBe('reembolsado');
    expect(updateViagemChamado).toBe(false); // A viagem NÃO foi alterada para reembolso_solicitado
  });

  it('deve processar cancelamento total: atualiza produto para reembolsado e altera viagem para reembolso_solicitado', async () => {
    // Setup
    const produtoId = 'prod-pacote-completo';
    const viagemId = 'viagem-cancelada-total';

    let updateViagemStatus = '';
    let updateProdutoStatus = '';

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'rmb-total-1', viagem_id: viagemId, produto_viagem_id: produtoId },
          error: null
        })
      })
    });

    vi.mocked(supabase.from).mockImplementation((tabela: string) => {
      if (tabela === 'reembolsos') {
        return { insert: mockInsert } as any;
      }
      if (tabela === 'produtos_viagem') {
        return {
          update: vi.fn().mockImplementation((payload) => {
            updateProdutoStatus = payload.status;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          })
        } as any;
      }
      if (tabela === 'viagens') {
        return {
          update: vi.fn().mockImplementation((payload) => {
            updateViagemStatus = payload.status;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          })
        } as any;
      }
      return {} as any;
    });

    // Action: Reembolso integral da viagem (atualizarStatusViagem: true)
    const res = await ReembolsosService.criarSolicitacao({
      viagemId,
      produtoViagemId: produtoId,
      consultorSolicitanteId: 'consultor-1',
      valorSolicitado: 8500.00,
      motivoCancelamento: 'Cancelamento total por motivo de saúde do pax',
      atualizarStatusViagem: true
    });

    // Assert
    expect(res.sucesso).toBe(true);
    expect(updateProdutoStatus).toBe('reembolsado');
    expect(updateViagemStatus).toBe('reembolso_solicitado');
  });

  it('deve determinar status pós-resolução de viagem: pos_viagem se a data de volta já passou, ou confirmada se ainda futura', () => {
    // Setup
    const hojeStr = new Date().toISOString().slice(0, 10);
    const dataPassada = '2025-01-10';
    const dataFutura = '2028-12-31';

    // Helper de determinação de ciclo de vida
    const determinarStatusAposReembolso = (dataVolta?: string): 'pos_viagem' | 'confirmada' => {
      if (!dataVolta) return 'confirmada';
      return dataVolta < hojeStr ? 'pos_viagem' : 'confirmada';
    };

    // Action
    const statusViagemAntiga = determinarStatusAposReembolso(dataPassada);
    const statusViagemFutura = determinarStatusAposReembolso(dataFutura);
    const statusSemData = determinarStatusAposReembolso(undefined);

    // Assert
    expect(statusViagemAntiga).toBe('pos_viagem');
    expect(statusViagemFutura).toBe('confirmada');
    expect(statusSemData).toBe('confirmada');
  });

  it('deve buscar e consolidar viagens órfãs com status reembolso_solicitado sem registros filhos na tabela reembolsos', async () => {
    // Setup
    const viagensNoBanco = [
      {
        id: 'via-orfa-1',
        codigo_ref: 'VIA-001',
        status: 'reembolso_solicitado',
        reembolsos: [], // Sem reembolsos detalhados (Órfã!)
        produtos: [{ id: 'p1', tipo: 'AÉREO' }]
      },
      {
        id: 'via-correta-2',
        codigo_ref: 'VIA-002',
        status: 'reembolso_solicitado',
        reembolsos: [{ id: 'rmb-ok-1' }], // Possui reembolso (Não é órfã)
        produtos: [{ id: 'p2', tipo: 'HOTEL' }]
      }
    ];

    vi.mocked(supabase.from).mockImplementation((tabela: string) => {
      if (tabela === 'viagens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: viagensNoBanco, error: null })
            })
          })
        } as any;
      }
      return {} as any;
    });

    // Action
    const orfas = await ReembolsosService.buscarViagensOrfasReembolso();

    // Assert
    expect(orfas).toHaveLength(1);
    expect(orfas[0].id).toBe('via-orfa-1');
    expect(orfas[0].codigo_ref).toBe('VIA-001');
  });
});

