import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { StudioExtractionService } from '../../src/services/studioExtractionService';
import { StudioProposta, StudioItemItinerario } from '../../src/types';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => {
  const fakeUpsert = vi.fn();
  return {
    supabase: {
      from: vi.fn(() => ({
        upsert: fakeUpsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
        eq: vi.fn().mockReturnThis()
      }))
    }
  };
});

describe('Studio - Testes Subcutâneos de Fluxo de Revisão e Persistência de Dados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve permitir ao usuário alterar a companhia aérea e dados estruturados e persistir com sucesso', async () => {
    // Setup: proposta extraída inicialmente com companhia a confirmar
    const itemInicial: StudioItemItinerario = {
      id: 'voo-123',
      tipo: 'voo',
      titulo: 'Voo Confirmado (GRU ➔ CDG)',
      origem: 'GRU',
      destino: 'CDG',
      companhia: '',
      numeroVoo: 'AF 443',
      localizador: 'AFR999',
      status: 'confirmado'
    };

    const proposta: Partial<StudioProposta> = {
      id: 'prop-teste-revisao',
      cliente_nome: 'Mariana Vasconcellos',
      destino: 'Paris',
      valor_total: 7500,
      moeda: 'BRL',
      status: 'RASCUNHO',
      itinerario_dias: [
        {
          diaNumero: 1,
          dataStr: '2026-11-10',
          tituloDia: 'Dia 1: Embarque e Chegada',
          itens: [itemInicial]
        }
      ]
    };

    // Action 1: Usuário revisa e altera a companhia aérea para "Air France" e atualiza horários
    const itemRevisado = { ...itemInicial };
    itemRevisado.companhia = 'Air France';
    itemRevisado.numeroVoo = 'AF 443';
    itemRevisado.horaInicio = '21:55';
    itemRevisado.horaFim = '14:20';
    itemRevisado.titulo = `Voo ${itemRevisado.companhia} (${itemRevisado.origem} ➔ ${itemRevisado.destino})`;
    itemRevisado.subtitulo = `Voo ${itemRevisado.numeroVoo} · Embarque Previsto`;

    proposta.itinerario_dias![0].itens[0] = itemRevisado;

    // Action 2: Mock de resposta do Supabase para o salvamento
    const mockFrom = vi.mocked(supabase.from);
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { ...proposta, id: 'prop-teste-revisao' },
          error: null
        })
      })
    });
    mockFrom.mockReturnValue({ upsert: mockUpsert } as any);

    const salva = await StudioPropostasService.salvarProposta(proposta);

    // Assert
    expect(salva).toBeDefined();
    expect(salva.itinerario_dias[0].itens[0].companhia).toBe('Air France');
    expect(salva.itinerario_dias[0].itens[0].numeroVoo).toBe('AF 443');
    expect(salva.itinerario_dias[0].itens[0].horaInicio).toBe('21:55');
    expect(salva.itinerario_dias[0].itens[0].titulo).toContain('Air France');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'prop-teste-revisao',
        cliente_nome: 'Mariana Vasconcellos',
        itinerario_dias: expect.arrayContaining([
          expect.objectContaining({
            itens: expect.arrayContaining([
              expect.objectContaining({
                companhia: 'Air France',
                numeroVoo: 'AF 443'
              })
            ])
          })
        ])
      })
    );
  });

  it('deve permitir ao usuário revisar e alterar dados de hospedagem (quarto, regime, voucher)', async () => {
    // Setup
    const itemHotel: StudioItemItinerario = {
      id: 'hotel-888',
      tipo: 'hotel',
      titulo: 'Hotel Fasano Rio de Janeiro',
      quarto: 'Standard',
      regime: 'Café da Manhã',
      localizador: 'BK-100',
      dataInicio: '2026-10-16',
      dataFim: '2026-10-20',
      status: 'confirmado'
    };

    // Action: Usuário altera acomodação para Suíte Deluxe e regime para Meia Pensão
    itemHotel.quarto = 'Suíte Deluxe Vista Mar';
    itemHotel.regime = 'Meia Pensão';
    itemHotel.localizador = 'BK-99999';

    // Assert
    expect(itemHotel.quarto).toBe('Suíte Deluxe Vista Mar');
    expect(itemHotel.regime).toBe('Meia Pensão');
    expect(itemHotel.localizador).toBe('BK-99999');
  });

  it('deve processar texto colado e disponibilizar campos para revisão imediata', async () => {
    // Setup
    const textoVooColado = `
      CONFIRMAÇÃO DE VOO - TAP AIR PORTUGAL
      Voo TP 012
      Origem: LIS
      Destino: FOR
      Data: 05/12/2026 10:30
      Localizador: TAP777
    `;

    // Action
    const extraido = await StudioExtractionService.processarTextoColado(textoVooColado);

    // Assert
    expect(extraido.itens.length).toBe(1);
    const item = extraido.itens[0];
    expect(item.companhia).toBe('TAP Air Portugal');
    expect(item.numeroVoo).toContain('TP 012');
    expect(item.localizador).toBe('TAP777');
    expect(item.origem).toBe('LIS');
    expect(item.destino).toBe('FOR');
  });
});
