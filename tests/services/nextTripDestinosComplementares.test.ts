import { describe, it, expect } from 'vitest';
import { NextTripEngineService } from '../../src/services/nextTripEngineService';

describe('Next Trip Engine - Radar Heurístico de Destinos Complementares ("Próximo Passo Natural")', () => {
  it('deve mapear destinos complementares ideais de acordo com o histórico da viagem anterior', () => {
    // Setup & Action
    const compDisney = NextTripEngineService.calcularDestinoComplementar('Orlando Disney World', 'disney', 'Lucas Silva');
    const compParis = NextTripEngineService.calcularDestinoComplementar('Paris França', 'europa', 'Renata Martins');
    const compCancun = NextTripEngineService.calcularDestinoComplementar('Cancún All-Inclusive', 'resort', 'Carlos Eduardo');
    const compGramado = NextTripEngineService.calcularDestinoComplementar('Gramado e Canela', 'nacional', 'Fernanda Souza');
    const compBahia = NextTripEngineService.calcularDestinoComplementar('Porto de Galinhas Resort', 'resort', 'Marcos Paulo');

    // Assert
    expect(compDisney.destinoComplementarSugerido).toContain('Universal');
    expect(compDisney.scriptAbordagemComplementar).toContain('Lucas');

    expect(compParis.destinoComplementarSugerido).toContain('Itália');
    expect(compParis.scriptAbordagemComplementar).toContain('Renata');

    expect(compCancun.destinoComplementarSugerido).toMatch(/Punta Cana|Aruba/);
    expect(compCancun.scriptAbordagemComplementar).toContain('Carlos');

    expect(compGramado.destinoComplementarSugerido).toMatch(/Mendoza|Bariloche/);
    expect(compGramado.scriptAbordagemComplementar).toContain('Fernanda');

    expect(compBahia.destinoComplementarSugerido).toMatch(/Tivoli|Trancoso/);
    expect(compBahia.scriptAbordagemComplementar).toContain('Marcos');
  });

  it('deve enriquecer oportunidades calculadas com o destino complementar e script comercial', () => {
    // Setup
    const clientes = [
      { id: 'c1', nome: 'Beatriz Castro', email: 'beatriz@teste.com', telefone: '11999991111' }
    ];

    // Viagem realizada há 12 meses para Paris
    const dataRetorno = new Date();
    dataRetorno.setMonth(dataRetorno.getMonth() - 12);

    const viagens = [
      {
        id: 'v1',
        cliente_id: 'c1',
        destino: 'Paris',
        data_volta: dataRetorno.toISOString().split('T')[0],
        nps_nota: 10
      }
    ];

    // Action
    const oportunidades = NextTripEngineService.calculateOpportunities(clientes, viagens, []);

    // Assert
    expect(oportunidades).toHaveLength(1);
    const op = oportunidades[0];
    expect(op.destinoComplementarSugerido).toBeDefined();
    expect(op.destinoComplementarSugerido).toContain('Itália');
    expect(op.motivoComplementar).toBeDefined();
    expect(op.scriptAbordagemComplementar).toContain('Beatriz');
  });
});
