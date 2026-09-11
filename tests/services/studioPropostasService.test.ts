import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { supabase } from '../../src/services/supabase';
import { StudioProposta, StudioAceiteFormal } from '../../src/types';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('StudioPropostasService - Testes Subcutâneos com Resiliência a Schema Drift', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve salvar proposta com sucesso quando a tabela studio_propostas existe no banco', async () => {
    // Setup
    const mockPropostaRetornada: StudioProposta = {
      id: 'prop-uuid-123',
      cliente_nome: 'Carolina Dieckmann',
      destino: 'Paris, França',
      data_ida: '2026-11-10',
      data_volta: '2026-11-20',
      valor_total: 15400,
      moeda: 'BRL',
      status: 'RASCUNHO',
      itinerario_dias: []
    };

    const mockFrom = vi.fn().mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockPropostaRetornada,
            error: null
          })
        })
      })
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await StudioPropostasService.salvarProposta({
      cliente_nome: 'Carolina Dieckmann',
      destino: 'Paris, França',
      valor_total: 15400
    });

    // Assert
    expect(resultado.id).toBe('prop-uuid-123');
    expect(resultado.cliente_nome).toBe('Carolina Dieckmann');
    expect(resultado.destino).toBe('Paris, França');
    expect(mockFrom).toHaveBeenCalledWith('studio_propostas');
  });

  it('deve ativar fallback resiliente sem quebrar ao receber erro 42703 (coluna inexistente) ou PGRST204', async () => {
    // Setup
    const fallbackDb = new Map<string, any>();
    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      if (tabela === 'studio_propostas') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  code: '42703',
                  message: 'column "foto_capa_url" does not exist'
                }
              })
            })
          })
        };
      }
      if (tabela === 'global_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockImplementation(async () => {
                return {
                  data: fallbackDb.get('studio_propostas_cache_drift') || null,
                  error: null
                };
              })
            })
          }),
          upsert: vi.fn().mockImplementation(async (payload: any) => {
            fallbackDb.set(payload.key, payload);
            return { error: null };
          })
        };
      }
      return {};
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await StudioPropostasService.salvarProposta({
      cliente_nome: 'Roberto Justus',
      destino: 'Nova York',
      valor_total: 28000
    });

    // Assert
    expect(resultado).toBeDefined();
    expect(resultado.cliente_nome).toBe('Roberto Justus');
    expect(resultado.destino).toBe('Nova York');
    expect(mockFrom).toHaveBeenCalledWith('global_settings');
  });

  it('deve registrar aceite formal do passageiro com status APROVADO e metadados de IP/dispositivo', async () => {
    // Setup
    const aceiteMock: StudioAceiteFormal = {
      data_aceite: new Date().toISOString(),
      cliente_nome: 'Fernanda Lima',
      documento: '123.456.789-00',
      ip: '189.40.122.9',
      dispositivo: 'iPhone 15 Pro / Safari 18'
    };

    const mockPropostaAprovada: StudioProposta = {
      id: 'prop-aceite-999',
      cliente_nome: 'Fernanda Lima',
      destino: 'Fernando de Noronha',
      valor_total: 19500,
      moeda: 'BRL',
      status: 'APROVADO',
      aceite_formal: aceiteMock,
      itinerario_dias: []
    };

    const mockFrom = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPropostaAprovada,
              error: null
            })
          })
        })
      })
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await StudioPropostasService.registrarAceite('prop-aceite-999', aceiteMock);

    // Assert
    expect(resultado).not.toBeNull();
    expect(resultado?.status).toBe('APROVADO');
    expect(resultado?.aceite_formal?.documento).toBe('123.456.789-00');
    expect(resultado?.aceite_formal?.ip).toBe('189.40.122.9');
  });
});
