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
    expect(mockFrom).not.toHaveBeenCalledWith('global_settings');
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
              // Primeira tentativa simula rejeição do PostgREST para colunas que ainda não foram criadas no banco
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
            // Segunda tentativa: o serviço removeu as colunas inexistentes e guardou em dados_extraidos._paxflow_meta
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
    expect(payloadGravado.dados_extraidos?._paxflow_meta?.consultor_avatar).toBe('https://exemplo.com/avatar.jpg');
    expect(payloadGravado.consultor_avatar).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalledWith('global_settings');
  });

  it('deve buscar proposta por ID e desempacotar metadados gravados em dados_extraidos._paxflow_meta', async () => {
    // Setup
    const mockPropostaDoBanco = {
      id: 'prop-id-456',
      cliente_nome: 'Mariana Rios',
      destino: 'Toscana, Itália',
      valor_total: 22000,
      moeda: 'BRL',
      status: 'ENVIADO',
      consultor_avatar: null, // Nulo na coluna física
      consultor_whatsapp: null,
      titulo_cabecalho: null,
      dados_extraidos: {
        _paxflow_meta: {
          consultor_avatar: 'https://exemplo.com/mariana.jpg',
          consultor_whatsapp: '(11) 98888-7777',
          consultor_telefone: '(11) 3333-2222',
          consultor_email: 'mariana@agencia.com',
          titulo_cabecalho: 'VIAGEM EXCLUSIVA TOSCANA',
          visualizacoes_count: 5
        }
      }
    };

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockPropostaDoBanco,
            error: null
          })
        })
      })
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await StudioPropostasService.buscarPorId('prop-id-456');

    // Assert
    expect(resultado).not.toBeNull();
    expect(resultado?.id).toBe('prop-id-456');
    expect(resultado?.cliente_nome).toBe('Mariana Rios');
    expect(resultado?.consultor_avatar).toBe('https://exemplo.com/mariana.jpg');
    expect(resultado?.consultor_whatsapp).toBe('(11) 98888-7777');
    expect(resultado?.consultor_email).toBe('mariana@agencia.com');
    expect(resultado?.titulo_cabecalho).toBe('VIAGEM EXCLUSIVA TOSCANA');
    expect(resultado?.visualizacoes_count).toBe(5);
  });

  it('deve listar propostas desempacotando metadados de contingência para todas as linhas', async () => {
    // Setup
    const listaMock = [
      {
        id: 'prop-1',
        cliente_nome: 'Cliente Um',
        destino: 'Londres',
        dados_extraidos: {
          _paxflow_meta: {
            consultor_nome: 'Consultor Alpha',
            titulo_cabecalho: 'LONDON CALLING'
          }
        }
      },
      {
        id: 'prop-2',
        cliente_nome: 'Cliente Dois',
        destino: 'Tóquio',
        dados_extraidos: {}
      }
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: listaMock,
          error: null
        })
      })
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await StudioPropostasService.listarPropostas();

    // Assert
    expect(resultado.length).toBe(2);
    expect(resultado[0].titulo_cabecalho).toBe('LONDON CALLING');
    expect(resultado[1].titulo_cabecalho).toBe('PAXFLOW LUXURY TRAVEL'); // Padrão
  });

  it('deve registrar acesso de leitura incrementando contador sem quebrar a execução', async () => {
    // Setup
    const propostaExistente: StudioProposta = {
      id: 'prop-view-789',
      cliente_nome: 'Bruno Gagliasso',
      destino: 'Fernando de Noronha',
      valor_total: 45000,
      moeda: 'BRL',
      status: 'ENVIADO',
      visualizacoes_count: 2,
      itinerario_dias: []
    };

    let propostaSalvaNoFinal: any = null;

    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      if (tabela === 'studio_propostas') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: propostaExistente,
                error: null
              })
            })
          }),
          upsert: vi.fn().mockImplementation((payload: any) => {
            propostaSalvaNoFinal = payload;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...propostaExistente, ...payload },
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
    const resultado = await StudioPropostasService.registrarAcessoLeitura('prop-view-789');

    // Assert
    expect(resultado).not.toBeNull();
    expect(propostaSalvaNoFinal).toBeDefined();
    expect(propostaSalvaNoFinal.visualizacoes_count).toBe(3);
    expect(propostaSalvaNoFinal.ultima_visualizacao_em).toBeDefined();
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
    expect(mockFrom).not.toHaveBeenCalledWith('global_settings');
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
