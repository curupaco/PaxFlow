import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReembolsosService } from '../../src/services/reembolsosService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('ReembolsosService - Testes Subcutâneos e Resiliência a Schema Drift (Zero-Break)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar solicitação de reembolso com sucesso, atualizando produto e viagem', async () => {
    // Setup
    const mockReembolsoCriado = {
      id: 'reemb-123',
      viagem_id: 'trip-999',
      produto_viagem_id: 'prod-888',
      consultor_solicitante_id: 'user-777',
      valor_solicitado: 1500,
      motivo_cancelamento: 'Cancelamento por motivos de saúde',
      forma_devolucao: 'Pix / Transferência Bancária',
      status: 'solicitado'
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockReembolsoCriado, error: null })
      })
    });

    const mockUpdateProduto = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    const mockUpdateViagem = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'reembolsos') {
        return { insert: mockInsert };
      }
      if (table === 'produtos_viagem') {
        return { update: mockUpdateProduto };
      }
      if (table === 'viagens') {
        return { update: mockUpdateViagem };
      }
      return {};
    });

    // Action
    const resultado = await ReembolsosService.criarSolicitacao({
      viagemId: 'trip-999',
      produtoViagemId: 'prod-888',
      consultorSolicitanteId: 'user-777',
      valorSolicitado: 1500,
      valorProdutoOriginal: 1500,
      motivoCancelamento: 'Cancelamento por motivos de saúde',
      formaDevolucao: 'Pix / Transferência Bancária',
      atualizarStatusViagem: true
    });

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(resultado.data).toEqual(mockReembolsoCriado);
    expect(mockUpdateProduto).toHaveBeenCalledWith({ status: 'reembolsado' });
    expect(mockUpdateViagem).toHaveBeenCalledWith({ status: 'reembolso_solicitado' });
  });

  it('deve acionar fallback Zero-Break ao detectar erro 42703 (coluna inexistente) e salvar em observacoes_financeiras', async () => {
    // Setup
    const erroDrift42703 = {
      code: '42703',
      message: 'column "forma_devolucao" of relation "reembolsos" does not exist'
    };

    const mockFallbackReembolso = {
      id: 'reemb-fallback-456',
      viagem_id: 'trip-999',
      produto_viagem_id: 'prod-888',
      valor_solicitado: 2300,
      observacoes_financeiras: JSON.stringify({
        forma_devolucao: 'Estorno Cartão de Crédito',
        valor_produto: 2300,
        valor_utilizado_pax: 0,
        status_tratativa: 'pendente_agencia'
      })
    };

    let tentativaInsert = 0;
    const mockInsert = vi.fn().mockImplementation((payload: any) => {
      tentativaInsert++;
      if (tentativaInsert === 1) {
        // Primeira tentativa falha com erro 42703 (schema drift)
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: erroDrift42703 })
          })
        };
      }
      // Segunda tentativa com fallback estruturado tem sucesso
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockFallbackReembolso, error: null })
        })
      };
    });

    const mockUpdateProduto = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    const mockUpdateViagem = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'reembolsos') return { insert: mockInsert };
      if (table === 'produtos_viagem') return { update: mockUpdateProduto };
      if (table === 'viagens') return { update: mockUpdateViagem };
      return {};
    });

    // Action
    const resultado = await ReembolsosService.criarSolicitacao({
      viagemId: 'trip-999',
      produtoViagemId: 'prod-888',
      consultorSolicitanteId: 'user-777',
      valorSolicitado: 2300,
      motivoCancelamento: 'Cliente desmaiou no embarque',
      formaDevolucao: 'Estorno Cartão de Crédito'
    });

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(tentativaInsert).toBe(2);
    expect(resultado.data?.id).toBe('reemb-fallback-456');
    expect(mockUpdateProduto).toHaveBeenCalledWith({ status: 'reembolsado' });
  });

  it('não deve alterar status da viagem se atualizarStatusViagem for falso (cancelamento parcial)', async () => {
    // Setup
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'rem-part-1' }, error: null })
      })
    });
    const mockUpdateProduto = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });
    const mockUpdateViagem = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'reembolsos') return { insert: mockInsert };
      if (table === 'produtos_viagem') return { update: mockUpdateProduto };
      if (table === 'viagens') return { update: mockUpdateViagem };
      return {};
    });

    // Action
    const resultado = await ReembolsosService.criarSolicitacao({
      viagemId: 'trip-parcial',
      produtoViagemId: 'prod-passeio',
      consultorSolicitanteId: 'consultor-1',
      valorSolicitado: 350,
      motivoCancelamento: 'Passeio cancelado pelo receptivo',
      formaDevolucao: 'Carta de Crédito / Voucher Fornecedor',
      atualizarStatusViagem: false
    });

    // Assert
    expect(resultado.sucesso).toBe(true);
    expect(mockUpdateProduto).toHaveBeenCalledWith({ status: 'reembolsado' });
    expect(mockUpdateViagem).not.toHaveBeenCalled();
  });

  it('deve buscar viagens órfãs com status reembolso_solicitado sem linha em reembolsos', async () => {
    // Setup
    const mockViagensDoBanco = [
      {
        id: 'v1',
        codigo_ref: 'VIA-001',
        status: 'reembolso_solicitado',
        reembolsos: [], // Órfã
        cliente: { id: 'c1', nome: 'João da Silva' },
        produtos: [{ id: 'p1', valor_venda: 1000 }]
      },
      {
        id: 'v2',
        codigo_ref: 'VIA-002',
        status: 'reembolso_solicitado',
        reembolsos: [{ id: 'r2' }], // Já possui reembolso
        cliente: { id: 'c2', nome: 'Maria Santos' },
        produtos: [{ id: 'p2', valor_venda: 2500 }]
      }
    ];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockViagensDoBanco, error: null })
      })
    });

    (supabase.from as any).mockReturnValue({ select: mockSelect });

    // Action
    const orfas = await ReembolsosService.buscarViagensOrfasReembolso();

    // Assert
    expect(orfas).toHaveLength(1);
    expect(orfas[0].id).toBe('v1');
    expect(orfas[0].codigo_ref).toBe('VIA-001');
    expect(orfas[0].cliente?.nome).toBe('João da Silva');
  });
});
