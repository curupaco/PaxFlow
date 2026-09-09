import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextTripEngineService } from '../../src/services/nextTripEngineService';

describe('NextTripEngineService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve fazer parse correto de datas brasileiras e formatos ISO com tolerância a falhas', () => {
    // Setup
    const dataBR = '25/12/2026';
    const dataBRComHora = '15/10/2026 14:30';
    const dataISO = '2026-07-04T12:00:00Z';
    const dataInvalida = 'data-quebrada';

    // Action
    const dt1 = NextTripEngineService.parseDataSegura(dataBR);
    const dt2 = NextTripEngineService.parseDataSegura(dataBRComHora);
    const dt3 = NextTripEngineService.parseDataSegura(dataISO);
    const dt4 = NextTripEngineService.parseDataSegura(dataInvalida);

    // Assert
    expect(dt1).not.toBeNull();
    expect(dt1?.getFullYear()).toBe(2026);
    expect(dt1?.getMonth()).toBe(11); // Dezembro = 11
    expect(dt1?.getDate()).toBe(25);

    expect(dt2).not.toBeNull();
    expect(dt2?.getDate()).toBe(15);

    expect(dt3).not.toBeNull();
    expect(dt3?.getFullYear()).toBe(2026);

    expect(dt4).toBeNull();
  });

  it('deve retornar lista vazia se o motor estiver desabilitado pelas configurações globais', () => {
    // Setup
    const clientes = [{ id: 'c1', nome: 'Renato Silva' }];
    const viagens = [{ id: 'v1', cliente_id: 'c1', destino: 'Natal', data_volta: '2026-01-01' }];
    const settings: any = { habilitar_next_trip_engine: false };

    // Action
    const oportunidades = NextTripEngineService.calculateOpportunities(clientes, viagens, [], settings);

    // Assert
    expect(oportunidades).toEqual([]);
  });

  it('deve ignorar clientes que já possuam orçamentos abertos em andamento', () => {
    // Setup
    const clientes = [{ id: 'c1', nome: 'Juliana Costa' }];
    const viagens = [{ id: 'v1', cliente_id: 'c1', destino: 'Cancún', data_volta: '2026-01-10' }];
    const orcamentosAbertos = [{ id: 'orc-1', cliente_id: 'c1', status: 'EM_ANDAMENTO' }];
    const settings: any = { habilitar_next_trip_engine: true };

    // Action
    const oportunidades = NextTripEngineService.calculateOpportunities(clientes, viagens, orcamentosAbertos, settings);

    // Assert
    expect(oportunidades).toHaveLength(0);
  });

  it('deve gerar oportunidade de recompra para cliente com viagem pregressa concluída', () => {
    // Setup
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    const dataVoltaStr = seisMesesAtras.toISOString().split('T')[0];

    const clientes = [
      { id: 'cli-vip', nome: 'Camila Pitanga', email: 'camila@email.com', telefone: '11999991111' },
    ];
    const viagens = [
      {
        id: 'viagem-antiga-1',
        cliente_id: 'cli-vip',
        destino: 'Lisboa',
        data_ida: dataVoltaStr,
        data_volta: dataVoltaStr,
        status: 'concluida',
        nps: 10,
        consultor_id: 'consultor-1',
      },
    ];
    const orcamentos: any[] = [];
    const settings: any = {
      habilitar_next_trip_engine: true,
      next_trip_nps_minimo: 8,
      next_trip_snooze_dias: 30,
    };

    // Action
    const oportunidades = NextTripEngineService.calculateOpportunities(
      clientes,
      viagens,
      orcamentos,
      settings,
      'consultor-1',
      'consultor'
    );

    // Assert
    expect(oportunidades.length).toBeGreaterThanOrEqual(1);
    expect(oportunidades[0].clienteId).toBe('cli-vip');
    expect(oportunidades[0].clienteNome).toBe('Camila Pitanga');
    expect(oportunidades[0].scoreProntidao).toBeGreaterThan(0);
  });
});
