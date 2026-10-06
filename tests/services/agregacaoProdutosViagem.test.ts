import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrcamentosService } from '../../src/services/orcamentosService';
import { supabase } from '../../src/services/supabase';
import { Orcamento, ConvertToTripOptions } from '../../src/types';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

vi.mock('../../src/services/gamification', () => ({
  registrarXp: vi.fn().mockResolvedValue(true)
}));

describe('Agregação de Produtos e Junção de Viagens (Regras Financeiras)', () => {
  const baseOrcamento: Orcamento = {
    id: 'orc-123',
    cliente_id: 'cli-001',
    clienteId: 'cli-001',
    nomeCliente: 'Carlos Silva',
    destino: 'Paris',
    valorProposta: 5000,
    status: 'EM_ANDAMENTO',
    consultorId: 'user-001',
    dataCriacao: '2026-10-01'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve marcar viagens em pós-venda como não-elegíveis em getActiveTripsForClient', async () => {
    // Setup
    const mockViagens = [
      { id: 'trip-aberta', destino: 'Paris', status: 'fechado', valor_total: 3000 },
      { id: 'trip-pos-venda', destino: 'Roma', status: 'pos_venda', valor_total: 8000 }
    ];

    const selectSingleMock = vi.fn().mockResolvedValue({ data: { id: 'cli-001', nome: 'Carlos Silva' }, error: null });
    const selectTripsMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue({ data: mockViagens, error: null })
      })
    });
    const selectConfMock = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'clientes') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: selectSingleMock }) }) };
      }
      if (table === 'viagens') {
        return { select: selectTripsMock };
      }
      if (table === 'loc_conferencias') {
        return { select: selectConfMock };
      }
      return {};
    });

    // Action
    const result = await OrcamentosService.loadClientDetailsAndTrips('cli-001');

    // Assert
    expect(result.activeTrips).toHaveLength(2);
    const viagemAberta = result.activeTrips.find(t => t.id === 'trip-aberta');
    const viagemPosVenda = result.activeTrips.find(t => t.id === 'trip-pos-venda');

    expect(viagemAberta?.isElegivelAgregacao).toBe(true);
    expect(viagemPosVenda?.isElegivelAgregacao).toBe(false);
    expect(viagemPosVenda?.motivoIneligibilidade).toContain('Pós-Venda');
  });

  it('deve bloquear agregação e lançar erro se a viagem selecionada estiver em pós-venda', async () => {
    // Setup
    const options: ConvertToTripOptions = {
      cNome: 'Carlos Silva',
      cEmail: 'carlos@email.com',
      cTelefone: '11999999999',
      cDoc: '12345678900',
      isNovaViagem: false,
      vValor: 2500,
      prodTipo: 'HOTEL',
      prodFornecedor: 'Hotel Paris',
      prodDescricao: 'Hospedagem 3 noites',
      viagemId: 'trip-fechada-pos-venda'
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'clientes') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { classificacoes: [] }, error: null }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
        };
      }
      if (table === 'viagens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'trip-fechada-pos-venda', status: 'pos_venda', valor_total: 10000 },
                error: null
              })
            })
          })
        };
      }
      return {};
    });

    // Action & Assert
    await expect(OrcamentosService.convertToTrip(baseOrcamento, options)).rejects.toThrow(
      /Pós-Venda/
    );
  });

  it('deve realizar agregação com detalhamento financeiro completo e recalcular valor da viagem', async () => {
    // Setup
    const options: ConvertToTripOptions = {
      cNome: 'Carlos Silva',
      cEmail: 'carlos@email.com',
      cTelefone: '11999999999',
      cDoc: '12345678900',
      isNovaViagem: false,
      vValor: 4000,
      prodTipo: 'AEREO',
      prodFornecedor: 'Air France',
      prodDescricao: 'Voo SP - Paris',
      prodCodigoReserva: 'LOC789',
      prodTarifa: 3500,
      prodTaxa: 200,
      prodComissao: 300,
      prodMarkup: 0,
      prodRav: 0,
      prodDataServico: '2026-11-10',
      viagemId: 'trip-aberta-01'
    };

    let insertedProduct: any = null;
    let updatedViagem: any = null;

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'clientes') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { classificacoes: [] }, error: null }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
        };
      }
      if (table === 'viagens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'trip-aberta-01', status: 'fechado', valor_total: 5000 },
                error: null
              })
            })
          }),
          update: vi.fn().mockImplementation((payload) => {
            updatedViagem = payload;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          })
        };
      }
      if (table === 'produtos_viagem') {
        return {
          insert: vi.fn().mockImplementation((payload) => {
            insertedProduct = payload;
            return { error: null };
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ valor_venda: 5000 }, { valor_venda: 4000 }],
              error: null
            })
          })
        };
      }
      if (table === 'orcamentos') {
        return {
          insert: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
        };
      }
      return {};
    });

    // Action
    const result = await OrcamentosService.convertToTrip(baseOrcamento, options);

    // Assert
    expect(result.clienteId).toBe('cli-001');
    expect(result.newViagemId).toBe('trip-aberta-01');
    expect(insertedProduct).not.toBeNull();
    expect(insertedProduct.viagem_id).toBe('trip-aberta-01');
    expect(insertedProduct.tipo).toBe('AEREO');
    expect(insertedProduct.fornecedor).toBe('Air France');
    expect(insertedProduct.codigo_reserva).toBe('LOC789');
    expect(insertedProduct.tarifa).toBe(3500);
    expect(insertedProduct.taxa).toBe(200);
    expect(insertedProduct.comissao).toBe(300);
    expect(insertedProduct.valor_venda).toBe(4000);
    expect(updatedViagem.valor_total).toBe(9000); // 5000 prévio + 4000 novo
  });
});
