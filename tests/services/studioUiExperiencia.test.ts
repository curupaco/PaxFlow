import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { StudioExtractionService } from '../../src/services/studioExtractionService';
import { StudioProposta } from '../../src/types';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('PaxFlow Studio - Testes Subcutâneos de Experiência e Serviços', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve formatar e persistir proposta montada com múltiplos tipos de atividades no roteiro', async () => {
    // Setup
    const mockProposta: Partial<StudioProposta> = {
      cliente_nome: 'Mariana Vasconcellos',
      destino: 'Paris & Costa Amalfitana',
      valor_total: 18500,
      moeda: 'BRL',
      status: 'RASCUNHO',
      itinerario_dias: [
        {
          diaNumero: 1,
          dataStr: '2026-10-15',
          tituloDia: 'Embarque Internacional',
          itens: [
            {
              id: 'item-voo-1',
              tipo: 'voo',
              titulo: 'Voo LATAM LA8100 (GRU ➔ CDG)',
              companhia: 'LATAM Airlines',
              numeroVoo: 'LA 8100',
              localizador: 'LAT99X',
              origem: 'GRU',
              destino: 'CDG',
              horaInicio: '23:15',
              horaFim: '15:30'
            }
          ]
        },
        {
          diaNumero: 2,
          dataStr: '2026-10-16',
          tituloDia: 'Chegada e Check-in',
          itens: [
            {
              id: 'item-hotel-1',
              tipo: 'hotel',
              titulo: 'Hotel Le Meurice Paris',
              localizador: 'VCH-4412',
              quarto: 'Deluxe King',
              regime: 'Café da manhã incluso'
            }
          ]
        }
      ]
    };

    const mockRetornoSupabase: StudioProposta = {
      ...(mockProposta as StudioProposta),
      id: 'prop-uuid-999',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockFrom = vi.fn().mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockRetornoSupabase,
            error: null
          })
        })
      })
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await StudioPropostasService.salvarProposta(mockProposta);

    // Assert
    expect(resultado).toBeDefined();
    expect(resultado.id).toBe('prop-uuid-999');
    expect(resultado.cliente_nome).toBe('Mariana Vasconcellos');
    expect(resultado.itinerario_dias).toHaveLength(2);
    expect(resultado.itinerario_dias[0].itens[0].companhia).toBe('LATAM Airlines');
    expect(resultado.itinerario_dias[1].itens[0].tipo).toBe('hotel');
    expect(mockFrom).toHaveBeenCalledWith('studio_propostas');
  });

  it('deve extrair e agrupar itens de texto colado em dias sequenciais estruturados', async () => {
    // Setup
    const textoReserva = `
      CONFIRMAÇÃO DE VOO LATAM
      Voo LA3421 de GRU para MIA
      Localizador: LAT123
      Partida: 22:15 Chegada: 06:30
      HOTEL: Fontainebleau Miami Beach
      Voucher: BK-77123
    `;

    // Action
    const extraidos = await StudioExtractionService.processarTextoColado(textoReserva);
    const diasGerados = StudioExtractionService.gerarItinerarioDiaADia(extraidos.itens);

    // Assert
    expect(extraidos.itens).toBeDefined();
    expect(extraidos.itens.length).toBeGreaterThan(0);
    expect(diasGerados).toBeDefined();
    expect(diasGerados[0].diaNumero).toBe(1);
  });

  it('deve converter proposta em viagem com status confirmado mantendo integridade', async () => {
    // Setup
    const propostaId = 'prop-uuid-123';
    const propostaFake: StudioProposta = {
      id: propostaId,
      cliente_nome: 'Carlos Drummond',
      destino: 'Roma',
      valor_total: 12000,
      moeda: 'BRL',
      status: 'APROVADO',
      itinerario_dias: []
    };

    const viagemCriadaFake = {
      id: 'viagem-uuid-777',
      destino: 'Roma',
      valor_total: 12000,
      status: 'confirmada'
    };

    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      if (tabela === 'studio_propostas') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: propostaFake, error: null })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...propostaFake, status: 'EFETIVADO' },
                error: null
              })
            })
          })
        };
      }
      if (tabela === 'viagens') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: viagemCriadaFake, error: null })
            })
          })
        };
      }
      return { select: vi.fn() };
    });
    (supabase.from as any) = mockFrom;

    // Action
    const res = await StudioPropostasService.converterEmViagem(propostaId);

    // Assert
    expect(res).toBeDefined();
    expect(res.viagemId).toBe('viagem-uuid-777');
  });
});
