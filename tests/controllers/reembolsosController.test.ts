import { describe, it, expect } from 'vitest';
import {
  filterReembolsosByPermission,
  calculateElapsedTime,
  prepareReembolsoStatusPayload,
  filterReembolsosByTerm
} from '../../src/controllers/reembolsosController';

describe('ReembolsosController - Testes Subcutâneos', () => {
  it('deve aplicar RLS de software permitindo visão total para admin e restrita para consultor', () => {
    // Setup
    const mockReembolsos = [
      { id: '1', consultor_solicitante_id: 'c1', viagem: { consultor_id: 'c1' } },
      { id: '2', consultor_solicitante_id: 'c2', viagem: { consultor_id: 'c2' } },
      { id: '3', consultor_solicitante_id: 'c3', viagem: { consultor_responsavel_id: 'c1' } }
    ];

    // Action
    const visaoAdmin = filterReembolsosByPermission(mockReembolsos, 'c1', 'admin');
    const visaoConsultorC1 = filterReembolsosByPermission(mockReembolsos, 'c1', 'consultor');

    // Assert
    expect(visaoAdmin).toHaveLength(3);
    expect(visaoConsultorC1).toHaveLength(2);
    expect(visaoConsultorC1.map(r => r.id)).toEqual(['1', '3']);
  });

  it('deve suportar mapeamento camelCase de consultores na regra de permissão', () => {
    // Setup - dados em formato camelCase
    const mockReembolsosCamel = [
      { id: '1', consultorSolicitanteId: 'u10', viagem: { consultorId: 'u20' } },
      { id: '2', consultorSolicitanteId: 'u99', viagem: { consultorResponsavelId: 'u10' } },
    ];

    // Action
    const resultado = filterReembolsosByPermission(mockReembolsosCamel, 'u10', 'consultor');

    // Assert
    expect(resultado).toHaveLength(2);
  });

  it('deve calcular o tempo de SLA decorrido com precisão', () => {
    // Setup
    const fixedNow = new Date('2026-09-09T17:00:00.000Z').getTime();
    // 2 dias, 3 horas, 15 minutos e 30 segundos antes
    const createdAt = new Date(fixedNow - (2 * 86400 + 3 * 3600 + 15 * 60 + 30) * 1000).toISOString();

    // Action
    const elapsed = calculateElapsedTime(createdAt, fixedNow);

    // Assert
    expect(elapsed).toBe('2d 3h 15m 30s');
  });

  it('deve formatar 0d 0h 0m 0s se a data do reembolso for futura', () => {
    // Setup
    const fixedNow = new Date('2026-09-09T17:00:00.000Z').getTime();
    const futureDate = new Date(fixedNow + 60000).toISOString();

    // Action
    const elapsed = calculateElapsedTime(futureDate, fixedNow);

    // Assert
    expect(elapsed).toBe('0d 0h 0m 0s');
  });

  it('deve definir data_resolucao ao pagar reembolso e anular se retornar para outro status', () => {
    // Setup & Action
    const payloadPago = prepareReembolsoStatusPayload('pago', '2026-09-09T12:00:00.000Z');
    const payloadAguardando = prepareReembolsoStatusPayload('Aguardando Fornecedor');
    const payloadAnalise = prepareReembolsoStatusPayload('em_analise');

    // Assert
    expect(payloadPago.status).toBe('pago');
    expect(payloadPago.data_resolucao).toBe('2026-09-09');

    expect(payloadAguardando.status).toBe('solicitado');
    expect(payloadAguardando.data_resolucao).toBeNull();

    expect(payloadAnalise.status).toBe('em_analise');
    expect(payloadAnalise.data_resolucao).toBeNull();
  });

  it('deve preencher data de resolução automaticamente com a data de hoje quando omitida no status pago', () => {
    // Setup
    const hojeIso = new Date().toISOString().split('T')[0];

    // Action
    const payload = prepareReembolsoStatusPayload('pago');

    // Assert
    expect(payload.status).toBe('pago');
    expect(payload.data_resolucao).toBe(hojeIso);
  });

  it('deve filtrar reembolsos por termo de busca no cliente, viagem ou motivo', () => {
    // Setup
    const reembolsos = [
      { id: '1', motivo: 'Cancelamento voo', viagem: { codigo: 'TRIP-100', cliente: { nome: 'Carlos Silva' } } },
      { id: '2', motivo: 'Cobrança indevida', viagem: { codigo: 'TRIP-200', cliente: { nome: 'Mariana Costa' } } }
    ];

    // Action
    const buscaVoo = filterReembolsosByTerm(reembolsos, 'cancelamento');
    const buscaCodigo = filterReembolsosByTerm(reembolsos, 'TRIP-200');
    const buscaInexistente = filterReembolsosByTerm(reembolsos, 'hotel');

    // Assert
    expect(buscaVoo).toHaveLength(1);
    expect(buscaVoo[0].id).toBe('1');
    expect(buscaCodigo).toHaveLength(1);
    expect(buscaCodigo[0].id).toBe('2');
    expect(buscaInexistente).toHaveLength(0);
  });

  it('deve retornar lista completa se termo de busca for vazio ou apenas espaços em branco', () => {
    // Setup
    const reembolsos = [
      { id: '1', motivo: 'Voo', viagem: null },
      { id: '2', motivo: 'Hotel', viagem: null }
    ];

    // Action
    const resVazio = filterReembolsosByTerm(reembolsos, '   ');

    // Assert
    expect(resVazio).toHaveLength(2);
  });
});
