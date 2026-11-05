import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('PaxFlow Studio - Rastreamento de Leitura em Tempo Real (Viewer Analytics)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve registrar leitura da proposta incrementando contador e atualizando timestamp', async () => {
    // Setup
    const mockProposta = {
      id: 'prop-123',
      cliente_nome: 'Mariana Lima',
      destino: 'Maldivas',
      visualizacoes_count: 2,
      ultima_visualizacao_em: '2026-10-25T10:00:00Z',
      status: 'ENVIADO'
    };

    const mockPropostaAtualizada = {
      ...mockProposta,
      visualizacoes_count: 3,
      ultima_visualizacao_em: expect.any(String)
    };

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockProposta, error: null })
      })
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockPropostaAtualizada, error: null })
      })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'studio_propostas') {
        return {
          select: mockSelect,
          upsert: mockUpsert
        };
      }
      return {};
    });

    // Action
    const resultado = await StudioPropostasService.registrarAcessoLeitura('prop-123');

    // Assert
    expect(resultado).toBeDefined();
    expect(resultado?.visualizacoes_count).toBe(3);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'prop-123',
        visualizacoes_count: 3,
        ultima_visualizacao_em: expect.any(String)
      })
    );
  });

  it('deve lidar de forma não-bloqueante retornando null caso a atualização de visualizações falhe no banco', async () => {
    // Setup
    const mockProposta = {
      id: 'prop-drift-456',
      cliente_nome: 'Carlos Eduardo',
      destino: 'Paris',
      status: 'ENVIADO'
    };

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockProposta, error: null })
      })
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42703', message: 'column visualizacoes_count does not exist' }
        })
      })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'studio_propostas') {
        return {
          select: mockSelect,
          upsert: mockUpsert
        };
      }
      return {};
    });

    // Action
    const resultado = await StudioPropostasService.registrarAcessoLeitura('prop-drift-456');

    // Assert
    expect(resultado).toBeNull();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });
});
