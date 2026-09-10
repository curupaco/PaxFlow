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

  it('deve penalizar pilar de conformidade caso o cliente tenha reembolso pendente não concluído', () => {
    // Setup
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    const dataStr = seisMesesAtras.toISOString().split('T')[0];

    const clientes = [{ id: 'c-reembolso', nome: 'Rogério' }];
    const viagensComReembolsoPendente = [
      {
        id: 'v-reemb',
        cliente_id: 'c-reembolso',
        destino: 'Paris',
        data_volta: dataStr,
        nps: 9,
        reembolsos: [{ id: 'reemb-1', status: 'pendente' }],
      },
    ];

    const viagensSemReembolso = [
      {
        id: 'v-ok',
        cliente_id: 'c-reembolso',
        destino: 'Paris',
        data_volta: dataStr,
        nps: 9,
        reembolsos: [{ id: 'reemb-1', status: 'pago' }],
      },
    ];

    // Action
    const opComReembolsoPendente = NextTripEngineService.calculateOpportunities(clientes, viagensComReembolsoPendente, []);
    const opSemReembolso = NextTripEngineService.calculateOpportunities(clientes, viagensSemReembolso, []);

    // Assert
    // O cliente com reembolso pendente deve ter score menor por perder 10 pontos de conformidade
    expect(opComReembolsoPendente[0].scoreProntidao).toBeLessThan(opSemReembolso[0].scoreProntidao);
  });

  it('deve conceder bônus sazonal máximo de 15 pontos se o mês da viagem anterior coincidir com o mês atual', () => {
    // Setup
    const agora = new Date();
    // Viagem realizada exatamente há 1 ano (mesmo mês)
    const umAnoAtrasMesmoMes = new Date(agora.getFullYear() - 1, agora.getMonth(), 15);
    // Viagem realizada há 1 ano mas em mês bem distante (+5 meses)
    const umAnoAtrasMesDistante = new Date(agora.getFullYear() - 1, (agora.getMonth() + 5) % 12, 15);

    const clientes = [{ id: 'c-sazonal', nome: 'Helena' }];
    const viagemMesmoMes = [{ id: 'v1', cliente_id: 'c-sazonal', destino: 'Roma', data_volta: umAnoAtrasMesmoMes.toISOString(), nps: 9 }];
    const viagemMesDistante = [{ id: 'v2', cliente_id: 'c-sazonal', destino: 'Roma', data_volta: umAnoAtrasMesDistante.toISOString(), nps: 9 }];

    // Action
    const opMesmoMes = NextTripEngineService.calculateOpportunities(clientes, viagemMesmoMes, []);
    const opMesDistante = NextTripEngineService.calculateOpportunities(clientes, viagemMesDistante, []);

    // Assert
    expect(opMesmoMes[0].motivoSugestao).toContain('Período habitual de férias');
    expect(opMesmoMes[0].scoreProntidao).toBeGreaterThan(opMesDistante[0].scoreProntidao);
  });

  it('deve ignorar cliente se ele já tiver uma viagem futura agendada', () => {
    // Setup
    const dataPassada = new Date();
    dataPassada.setMonth(dataPassada.getMonth() - 8);

    const dataFutura = new Date();
    dataFutura.setMonth(dataFutura.getMonth() + 2);

    const clientes = [{ id: 'c-futura', nome: 'Eduarda' }];
    const viagens = [
      { id: 'v-antiga', cliente_id: 'c-futura', destino: 'Natal', data_volta: dataPassada.toISOString() },
      { id: 'v-marcada', cliente_id: 'c-futura', destino: 'Madri', data_ida: dataFutura.toISOString() },
    ];

    // Action
    const oportunidades = NextTripEngineService.calculateOpportunities(clientes, viagens, []);

    // Assert
    expect(oportunidades).toHaveLength(0);
  });

  it('deve restringir visualização para consultor titular mas permitir acesso total a administradores', () => {
    // Setup
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const clientes = [{ id: 'c-privado', nome: 'Cliente do Consultor 1' }];
    const viagens = [
      { id: 'v1', cliente_id: 'c-privado', consultor_id: 'consultor-1', data_volta: seisMesesAtras.toISOString(), nps: 10 },
    ];

    // Action
    // Consultor 2 tentando ver
    const opConsultorOutro = NextTripEngineService.calculateOpportunities(
      clientes,
      viagens,
      [],
      undefined,
      'consultor-2',
      'consultor'
    );
    // Administrador vendo
    const opAdmin = NextTripEngineService.calculateOpportunities(
      clientes,
      viagens,
      [],
      undefined,
      'admin-1',
      'admin'
    );

    // Assert
    expect(opConsultorOutro).toHaveLength(0);
    expect(opAdmin).toHaveLength(1);
    expect(opAdmin[0].clienteId).toBe('c-privado');
  });

  it('deve aplicar snooze e marcar status da oportunidade como snoozed', () => {
    // Setup
    const storageMap = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (key: string) => storageMap.get(key) || null,
      setItem: (key: string, val: string) => storageMap.set(key, String(val)),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    };

    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const clientes = [{ id: 'c-snooze', nome: 'Snoozed Client' }];
    const viagens = [{ id: 'v1', cliente_id: 'c-snooze', destino: 'Cruzeiro MSC', data_volta: seisMesesAtras.toISOString(), nps: 9 }];

    // Action
    NextTripEngineService.aplicarSnoozeAbordagem('c-snooze', 15);
    const oportunidades = NextTripEngineService.calculateOpportunities(clientes, viagens, []);

    // Assert
    expect(oportunidades).toHaveLength(1);
    expect(oportunidades[0].statusAbordagem).toBe('snoozed');
    expect(oportunidades[0].categoriaDestino).toBe('cruzeiro');
    expect(oportunidades[0].destinoRecomendado).toBe('Cruzeiro Marítimo');

    delete (globalThis as any).localStorage;
  });
});
