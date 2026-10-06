import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemarcacaoService } from '../../src/services/remarcacaoService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('RemarcacaoService - Assistente de Remarcação de Viagens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve blindar data_financeiro ao remarcar viagem e atualizar data_ida e data_volta', async () => {
    // Setup
    const mockViagemOriginal = {
      id: 'v-123',
      cliente_id: 'c-1',
      consultor_id: 'cons-1',
      data_financeiro: '2026-10-15',
      data_ida: '2026-10-20',
      data_volta: '2026-10-28',
      valor_total: 5000,
      produtos: []
    };

    const mockUpdateViagem = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    const mockInsertComentario = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSelectProdutos = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          update: mockUpdateViagem,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockViagemOriginal,
                error: null
              })
            })
          })
        } as any;
      }
      if (table === 'produtos_viagem') {
        return {
          select: mockSelectProdutos,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      }
      if (table === 'comentarios') {
        return {
          insert: mockInsertComentario
        } as any;
      }
      return {} as any;
    });

    // Action
    const resultado = await RemarcacaoService.executarRemarcacao({
      viagemId: 'v-123',
      novaDataIda: '2026-11-10',
      novaDataVolta: '2026-11-18',
      motivoRemarcacao: 'Solicitação do passageiro para férias em novembro',
      consultorId: 'cons-1',
      consultorNome: 'Especialista PaxFlow'
    });

    // Assert
    expect(resultado.success).toBe(true);
    expect(mockUpdateViagem).toHaveBeenCalledWith(
      expect.objectContaining({
        data_ida: '2026-11-10',
        data_volta: '2026-11-18'
      })
    );
    // Garante que data_financeiro NÃO foi passada no payload de update, mantendo o fechamento contábil intocado
    const updatePayload = mockUpdateViagem.mock.calls[0][0];
    expect(updatePayload.data_financeiro).toBeUndefined();
    expect(mockInsertComentario).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_item: 'viagem',
        item_id: 'v-123',
        autor_id: 'cons-1',
        texto: expect.stringContaining('Viagem Remarcada')
      })
    );
  });

  it('deve atualizar trechos aéreos nos produtos existentes ao remarcar', async () => {
    // Setup
    const mockViagemOriginal = {
      id: 'v-456',
      cliente_id: 'c-1',
      consultor_id: 'cons-1',
      data_financeiro: '2026-08-01',
      data_ida: '2026-09-01',
      data_volta: '2026-09-10',
      valor_total: 4000,
      produtos: []
    };

    const mockUpdateViagem = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    const mockUpdateProduto = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    const mockSelectProdutos = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'prod-aereo-1',
            tipo: 'AÉREO',
            dados_adicionais: {
              trechos: [
                { cia: 'AA', voo: '930', dataIda: '2026-09-01', origem: 'GRU', destino: 'MIA' },
                { cia: 'AA', voo: '931', dataVolta: '2026-09-10', origem: 'MIA', destino: 'GRU' }
              ]
            }
          }
        ],
        error: null
      })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          update: mockUpdateViagem,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockViagemOriginal, error: null })
            })
          })
        } as any;
      }
      if (table === 'produtos_viagem') {
        return {
          select: mockSelectProdutos,
          update: mockUpdateProduto,
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      }
      if (table === 'comentarios') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      }
      return {} as any;
    });

    // Action
    const novosTrechos = [
      { cia: 'AA', voo: '930', dataIda: '2026-12-05', origem: 'GRU', destino: 'MIA' },
      { cia: 'AA', voo: '931', dataVolta: '2026-12-15', origem: 'MIA', destino: 'GRU' }
    ];

    const resultado = await RemarcacaoService.executarRemarcacao({
      viagemId: 'v-456',
      novaDataIda: '2026-12-05',
      novaDataVolta: '2026-12-15',
      novosTrechos: novosTrechos,
      consultorId: 'cons-1'
    });

    // Assert
    expect(resultado.success).toBe(true);
    expect(mockUpdateProduto).toHaveBeenCalledWith(
      expect.objectContaining({
        dados_adicionais: expect.objectContaining({
          trechos: expect.arrayContaining([
            expect.objectContaining({ dataIda: '2026-12-05' })
          ])
        }),
        data_servico: '2026-12-05'
      })
    );
  });

  it('deve inserir produto de taxa de remarcação e somar ao valor_total da viagem', async () => {
    // Setup
    const mockViagemOriginal = {
      id: 'v-789',
      cliente_id: 'c-1',
      consultor_id: 'cons-1',
      data_financeiro: '2026-05-10',
      data_ida: '2026-06-01',
      data_volta: '2026-06-10',
      valor_total: 10000,
      produtos: []
    };

    const mockUpdateViagem = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    const mockInsertProduto = vi.fn().mockResolvedValue({
      data: [{ id: 'prod-taxa-1' }],
      error: null
    });

    let selectProdutosCallCount = 0;
    const mockSelectProdutos = vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation(() => {
        selectProdutosCallCount++;
        if (selectProdutosCallCount === 1) {
          return Promise.resolve({ data: [], error: null });
        }
        // Segunda chamada para recalcular o valor_total da viagem
        return Promise.resolve({
          data: [
            { id: 'p1', valor_venda: 10000 },
            { id: 'p2', valor_venda: 650.50 }
          ],
          error: null
        });
      })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          update: mockUpdateViagem,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockViagemOriginal, error: null })
            })
          })
        } as any;
      }
      if (table === 'produtos_viagem') {
        return {
          select: mockSelectProdutos,
          insert: mockInsertProduto,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })
        } as any;
      }
      if (table === 'comentarios') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      }
      return {} as any;
    });

    // Action
    const resultado = await RemarcacaoService.executarRemarcacao({
      viagemId: 'v-789',
      novaDataIda: '2026-07-01',
      novaDataVolta: '2026-07-10',
      temTaxaRemarcacao: true,
      taxaValor: 650.50,
      taxaFornecedor: 'LATAM Airlines',
      consultorId: 'cons-1'
    });

    // Assert
    expect(resultado.success).toBe(true);
    expect(mockInsertProduto).toHaveBeenCalledWith(
      expect.objectContaining({
        viagem_id: 'v-789',
        tipo: 'OUTROS',
        fornecedor: 'LATAM Airlines',
        valor_venda: 650.50
      })
    );
    expect(mockUpdateViagem).toHaveBeenCalledWith(
      expect.objectContaining({
        valor_total: 10650.50
      })
    );
  });
});
