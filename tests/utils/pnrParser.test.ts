import { describe, it, expect } from 'vitest';
import { parsePnrText } from '../../src/utils/pnrParser';

describe('PNR & Flight Ticket Parser - Testes Subcutâneos', () => {
  it('deve extrair localizador (LOC) e fornecedor de e-mails da LATAM', () => {
    // Setup
    const emailLatam = `
      Confirmação de Compra - LATAM Airlines
      Código de reserva: W9KJ2P
      Passageiro: SILVA/CARLOS
      LA 3040 GRU - SDU em 20/11/2026
    `;

    // Action
    const pnr = parsePnrText(emailLatam);

    // Assert
    expect(pnr.localizador).toBe('W9KJ2P');
    expect(pnr.fornecedor).toBe('LATAM Airlines');
    expect(pnr.passageiros).toContain('SILVA CARLOS');
    expect(pnr.voos).toHaveLength(1);
    expect(pnr.voos[0].cia).toBe('LA');
    expect(pnr.voos[0].numeroVoo).toBe('3040');
    expect(pnr.voos[0].origem).toBe('GRU');
    expect(pnr.voos[0].destino).toBe('SDU');
    expect(pnr.voos[0].dataPartida).toBe('20/11/2026');
  });

  it('deve extrair localizador e dados de voo em padrão da GOL Linhas Aéreas', () => {
    // Setup
    const emailGol = `
      Sua viagem está confirmada!
      GOL Linhas Aéreas
      Localizador: GOL77X
      1. SOUZA/MARIANA
      G3 1520 BSB -> CGH 10/12/2026
    `;

    // Action
    const pnr = parsePnrText(emailGol);

    // Assert
    expect(pnr.localizador).toBe('GOL77X');
    expect(pnr.fornecedor).toBe('GOL Linhas Aéreas');
    expect(pnr.passageiros.length).toBeGreaterThan(0);
  });

  it('deve ignorar palavras reservadas de 6 letras como falso positivo de localizador', () => {
    // Setup
    const textoComPalavraReservada = `
      STATUS: Confirmado
      ORIGEM: São Paulo
      DESTIN: Fortaleza
      Código: AZ89LK
      Azul Linhas Aéreas
    `;

    // Action
    const pnr = parsePnrText(textoComPalavraReservada);

    // Assert
    expect(pnr.localizador).toBe('AZ89LK');
    expect(pnr.fornecedor).toBe('Azul Linhas Aéreas');
  });

  it('deve retornar estrutura vazia e íntegra ao receber texto vazio ou nulo', () => {
    // Setup & Action
    const pnrVazio = parsePnrText('');
    const pnrEspacos = parsePnrText('    ');

    // Assert
    expect(pnrVazio.localizador).toBeNull();
    expect(pnrVazio.passageiros).toEqual([]);
    expect(pnrVazio.voos).toEqual([]);
    expect(pnrEspacos.localizador).toBeNull();
  });
});
