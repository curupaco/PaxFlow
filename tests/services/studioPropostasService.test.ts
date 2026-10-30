import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { supabase } from '../../src/services/supabase';
import { StudioProposta, StudioAceiteFormal } from '../../src/types';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('StudioPropostasService - Testes Subcutâneos com Resiliência a Schema Drift (Zero-Break)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve salvar proposta com sucesso quando a tabela studio_propostas possui todas as colunas', async () => {
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

  it('deve tratar erro 42703 / PGRST204 de coluna inexistente encapsulando em dados_extraidos._paxflow_meta sem quebrar', async () => {
    // Setup
    let tentativas = 0;
    let payloadGravado: any = null;

    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      if (tabela === 'studio_propostas') {
        return {
          upsert: vi.fn().mockImplementation((payload: any) => {
            tentativas++;
            payloadGravado = payload;
            if (tentativas === 1) {
              // Primeira tentativa simula erro de coluna inexistente (PGRST204 / 42703)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: {
                      code: 'PGRST204',
                      message: "Could not find the 'consultor_avatar' column of 'studio_propostas' in the schema cache"
                    }
                  })
                })
              };
            }
            // Segunda tentativa: o serviço removeu as colunas inexistentes e guardou em dados_extraidos
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'prop-resiliente-123',
                    cliente_nome: payload.cliente_nome,
                    destino: payload.destino,
                    valor_total: payload.valor_total,
                    dados_extraidos: payload.dados_extraidos,
                    status: 'RASCUNHO'
                  },
                  error: null
                })
              })
            };
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
      valor_total: 28000,
      consultor_avatar: 'https://exemplo.com/avatar.jpg',
      consultor_whatsapp: '(11) 99999-8888',
      titulo_cabecalho: 'PAXFLOW PRIVATE JET'
    });

    // Assert
    expect(tentativas).toBe(2);
    expect(resultado).toBeDefined();
    expect(resultado.cliente_nome).toBe('Roberto Justus');
    expect(resultado.destino).toBe('Nova York');
    expect(resultado.consultor_avatar).toBe('https://exemplo.com/avatar.jpg');
    expect(resultado.consultor_whatsapp).toBe('(11) 99999-8888');
    expect(resultado.titulo_cabecalho).toBe('PAXFLOW PRIVATE JET');
    // Verifica que o payload da 2ª tentativa salvou no _paxflow_meta
    expect(payloadGravado.dados_extraidos?._paxflow_meta?.consultor_avatar).toBe('https://exemplo.com/avatar.jpg');
    expect(payloadGravado.consultor_avatar).toBeUndefined();
  });

  it('deve ativar fallback estruturado em templates_mensagem se a tabela studio_propostas inteira não existir (42P01)', async () => {
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
                  code: '42P01',
                  message: 'relation "studio_propostas" does not exist'
                }
              })
            })
          })
        };
      }
      if (tabela === 'templates_mensagem') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockImplementation(async () => {
                return {
                  data: fallbackDb.get('SYS_STUDIO_PROPOSTAS_CONTINGENCIA') || null,
                  error: null
                };
              })
            })
          }),
          insert: vi.fn().mockImplementation(async (payload: any) => {
            fallbackDb.set(payload.titulo, payload);
            return { error: null };
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        };
      }
      return {};
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await StudioPropostasService.salvarProposta({
      cliente_nome: 'Grazi Massafera',
      destino: 'Capadócia',
      valor_total: 32000
    });

    // Assert
    expect(resultado).toBeDefined();
    expect(resultado.cliente_nome).toBe('Grazi Massafera');
    expect(resultado.destino).toBe('Capadócia');
    expect(mockFrom).toHaveBeenCalledWith('templates_mensagem');
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
