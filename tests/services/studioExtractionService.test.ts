import { describe, it, expect } from 'vitest';
import { StudioExtractionService } from '../../src/services/studioExtractionService';

describe('StudioExtractionService - Testes Subcutâneos de Extração e Linha do Tempo', () => {
  it('deve extrair voos a partir de texto com padrões comuns de companhias aéreas', async () => {
    // Setup
    const textoMockFornecedor = `
      CONFIRMAÇÃO DE VOO - LATAM AIRLINES
      Voo LA3456
      Origem: GRU - São Paulo
      Destino: MIA - Miami
      Data: 15/10/2026 22:15
      Chegada: 16/10/2026 06:30
      Localizador de Reserva: LAX99Z
      Valor total: R$ 4.850,00
    `;

    // Action
    const resultado = await StudioExtractionService.extrairDados(textoMockFornecedor, 'voo_latam.pdf');

    // Assert
    expect(resultado.tipoDetectado).toBe('voo');
    expect(resultado.fornecedor).toContain('LATAM');
    expect(resultado.loc).toBe('LAX99Z');
    expect(resultado.itens.length).toBeGreaterThan(0);
    const itemVoo = resultado.itens[0];
    expect(itemVoo.tipo).toBe('voo');
    expect(itemVoo.origem).toBe('GRU');
    expect(itemVoo.destino).toBe('MIA');
    expect(resultado.valorTotal).toBe(4850);
  });

  it('deve extrair hospedagem com check-in, check-out e noites calculadas', async () => {
    // Setup
    const textoMockHotel = `
      VOUCHER DE HOSPEDAGEM
      Hotel Fasano Rio de Janeiro
      Check-in: 16/10/2026
      Check-out: 20/10/2026
      Acomodação: Suíte Deluxe Vista Mar
      Regime: Café da Manhã incluso
      Código de Confirmação: BK-88412
      Valor da Estadia: R$ 8.200,00
    `;

    // Action
    const resultado = await StudioExtractionService.extrairDados(textoMockHotel, 'voucher_hotel.pdf');

    // Assert
    expect(resultado.tipoDetectado).toBe('hotel');
    expect(resultado.loc).toBe('BK-88412');
    expect(resultado.itens.length).toBe(1);
    const itemHotel = resultado.itens[0];
    expect(itemHotel.tipo).toBe('hotel');
    expect(itemHotel.titulo).toContain('Fasano');
    expect(itemHotel.dataInicio).toBe('2026-10-16');
    expect(itemHotel.dataFim).toBe('2026-10-20');
    expect(resultado.valorTotal).toBe(8200);
  });

  it('deve consolidar múltiplos itens e gerar itinerário dia a dia ordenado', () => {
    // Setup
    const itens = [
      {
        id: '1',
        tipo: 'voo' as const,
        titulo: 'Voo GRU -> MIA',
        dataInicio: '2026-10-15',
        horaInicio: '22:00',
        origem: 'GRU',
        destino: 'MIA',
        status: 'confirmado' as const
      },
      {
        id: '2',
        tipo: 'hotel' as const,
        titulo: 'Hotel Fontainebleau Miami',
        dataInicio: '2026-10-16',
        dataFim: '2026-10-19',
        horaInicio: '15:00',
        status: 'confirmado' as const
      },
      {
        id: '3',
        tipo: 'passeio' as const,
        titulo: 'Passeio de Barco Biscayne Bay',
        dataInicio: '2026-10-17',
        horaInicio: '10:00',
        status: 'confirmado' as const
      }
    ];

    // Action
    const dias = StudioExtractionService.gerarItinerarioDiaADia(itens);

    // Assert
    expect(dias.length).toBeGreaterThanOrEqual(3);
    expect(dias[0].data).toBe('2026-10-15');
    expect(dias[0].diaNumero).toBe(1);
    expect(dias[0].itens[0].id).toBe('1');
    expect(dias[1].data).toBe('2026-10-16');
    expect(dias[1].diaNumero).toBe(2);
    expect(dias[2].data).toBe('2026-10-17');
    expect(dias[2].itens.some(i => i.id === '3')).toBe(true);
  });
});
