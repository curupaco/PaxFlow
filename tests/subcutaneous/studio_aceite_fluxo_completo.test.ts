import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { supabase } from '../../src/services/supabase';
import { StudioAceiteFormal, StudioProposta } from '../../src/types';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('../../src/services/pushSenderService', () => ({
  PushSenderService: {
    sendToUser: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Fluxo Subcutâneo de Aceite Formal da Proposta e Conversão em Viagem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve executar o ciclo completo de aprovação: registrar aceite, criar viagem, concluir orçamento e criar alerta no Inbox', async () => {
    // Setup
    const propostaId = 'prop-ushuaia-62k';
    const consultorId = 'cons-100';
    const orcamentoOrigemId = 'orc-ushuaia-555';

    const propostaBase: StudioProposta = {
      id: propostaId,
      cliente_nome: 'Cecília Ganem Costa',
      cliente_email: 'cecilia@ganem.com.br',
      cliente_whatsapp: '11999998888',
      destino: 'Ushuaia - Fim do Mundo',
      data_ida: '2026-12-15',
      data_volta: '2026-12-24',
      valor_total: 62532,
      moeda: 'BRL',
      status: 'ENVIADO',
      consultor_id: consultorId,
      orcamento_origem_id: orcamentoOrigemId,
      itinerario_dias: []
    };

    const aceiteFormal: StudioAceiteFormal = {
      data_aceite: '2026-10-30T17:50:00.000Z',
      cliente_nome: 'Cecília Ganem Costa',
      documento: '222.333.444-55',
      ip: '201.88.45.10',
      dispositivo: 'MacBook Pro / Chrome 130'
    };

    const insertedTables: Record<string, any[]> = {
      viagens: [],
      lembretes: [],
      clientes: []
    };
    const updatedTables: Record<string, any[]> = {
      studio_propostas: [],
      orcamentos: []
    };

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'studio_propostas') {
        return {
          update: vi.fn().mockImplementation((payload: any) => ({
            eq: vi.fn().mockImplementation((_col: string, _val: string) => ({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...propostaBase, ...payload },
                  error: null
                })
              })
            }))
          })),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...propostaBase, aceite_formal: aceiteFormal },
                error: null
              })
            })
          }),
          upsert: vi.fn().mockImplementation((payload: any) => ({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: payload,
                error: null
              })
            })
          }))
        };
      }

      if (table === 'clientes') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'cli-cecilia-99' }],
                error: null
              })
            }),
            ilike: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'cli-cecilia-99' }],
                error: null
              })
            })
          }),
          insert: vi.fn().mockImplementation((payload: any) => {
            insertedTables.clientes.push(payload);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'cli-novo-id' },
                  error: null
                })
              })
            };
          })
        };
      }

      if (table === 'viagens') {
        return {
          insert: vi.fn().mockImplementation((payload: any) => {
            insertedTables.viagens.push(payload);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'via-gerada-888' },
                  error: null
                })
              })
            };
          })
        };
      }

      if (table === 'orcamentos') {
        return {
          update: vi.fn().mockImplementation((payload: any) => {
            updatedTables.orcamentos.push(payload);
            return {
              eq: vi.fn().mockResolvedValue({ error: null })
            };
          })
        };
      }

      if (table === 'lembretes') {
        return {
          insert: vi.fn().mockImplementation((payload: any) => {
            insertedTables.lembretes.push(payload);
            return Promise.resolve({ error: null });
          })
        };
      }

      return {};
    });

    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await StudioPropostasService.registrarAceite(propostaId, aceiteFormal);

    // Assert
    // 1. Proposta recebeu o status APROVADO e o aceite formal
    expect(resultado).toBeDefined();
    expect(resultado?.status).toBe('APROVADO');
    expect(resultado?.aceite_formal?.documento).toBe('222.333.444-55');

    // 2. Viagem Confirmada criada na tabela 'viagens'
    expect(insertedTables.viagens.length).toBeGreaterThanOrEqual(1);
    const viagemCriada = insertedTables.viagens[0];
    expect(viagemCriada.cliente_id).toBe('cli-cecilia-99');
    expect(viagemCriada.consultor_id).toBe(consultorId);
    expect(viagemCriada.destino).toBe('Ushuaia - Fim do Mundo');
    expect(viagemCriada.valor_total).toBe(62532);
    expect(viagemCriada.status).toBe('confirmada');
    expect(viagemCriada.orcamento_id).toBe(orcamentoOrigemId);

    // 3. Orçamento de origem movido para CONCLUIDO / ACEITO (Venda Fechada)
    expect(updatedTables.orcamentos.length).toBeGreaterThanOrEqual(1);
    const orcAtualizado = updatedTables.orcamentos[0];
    expect(orcAtualizado.status).toBe('CONCLUIDO');
    expect(orcAtualizado.sub_status).toBe('ACEITO');
    expect(orcAtualizado.valor_viagem).toBe(62532);

    // 4. Lembrete comemorativo criado no Inbox do consultor
    expect(insertedTables.lembretes.length).toBeGreaterThanOrEqual(1);
    const lembreteCriado = insertedTables.lembretes[0];
    expect(lembreteCriado.consultor_id).toBe(consultorId);
    expect(lembreteCriado.viagem_id).toBe('via-gerada-888');
    expect(lembreteCriado.descricao).toContain('Cecília Ganem Costa');
    expect(lembreteCriado.descricao).toContain('Ushuaia');
  });

  it('deve aplicar fallback Zero-Break resiliente se a coluna orcamento_id não existir na tabela viagens (erro 42703)', async () => {
    // Setup
    const propostaId = 'prop-drift-01';
    const propostaBase: StudioProposta = {
      id: propostaId,
      cliente_nome: 'Marcos Mion',
      destino: 'Miami',
      valor_total: 35000,
      moeda: 'BRL',
      status: 'ENVIADO',
      orcamento_origem_id: 'orc-123',
      itinerario_dias: []
    };

    let tentativa = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'studio_propostas') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: propostaBase,
                error: null
              })
            })
          }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: propostaBase, error: null })
            })
          })
        };
      }
      if (table === 'clientes') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'cli-novo' }, error: null })
            })
          })
        };
      }
      if (table === 'viagens') {
        return {
          insert: vi.fn().mockImplementation((payload: any) => {
            tentativa++;
            if (tentativa === 1) {
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: '42703', message: 'column "orcamento_id" does not exist' }
                  })
                })
              };
            }
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'via-salva-fallback' },
                  error: null
                })
              })
            };
          })
        };
      }
      if (table === 'orcamentos') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        };
      }
      return {};
    });

    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await StudioPropostasService.converterEmViagem(propostaId);

    // Assert
    expect(resultado.viagemId).toBe('via-salva-fallback');
    expect(tentativa).toBe(2);
  });
});
