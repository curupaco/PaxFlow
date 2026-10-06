import { describe, it, expect } from 'vitest';
import {
  filterReembolsosByPermission,
  calculateElapsedTime,
  prepareReembolsoStatusPayload,
  filterReembolsosByTerm,
  formatStatusTratativa,
  calculateSaldoReembolso,
  STATUS_TRATATIVA_DEFINITIONS
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

  it('deve formatar os 4 status da tratativa com rótulos e badges corretos', () => {
    // Setup & Action & Assert
    const agencia = formatStatusTratativa('pendente_agencia');
    expect(agencia.label).toBe('Reembolso pendente ação agência');
    expect(agencia.key).toBe('pendente_agencia');

    const fornecedor = formatStatusTratativa('pendente_fornecedor');
    expect(fornecedor.label).toBe('Reembolso pendente ação fornecedor');
    expect(fornecedor.key).toBe('pendente_fornecedor');

    const agaxtur = formatStatusTratativa('pendente_agaxtur');
    expect(agaxtur.label).toBe('Reembolso pendente ação Agaxtur');
    expect(agaxtur.key).toBe('pendente_agaxtur');

    const concluido = formatStatusTratativa('concluido');
    expect(concluido.label).toBe('Reembolso concluido');
    expect(concluido.key).toBe('concluido');

    // Normalização defensiva de status legado 'pago' para 'concluido'
    const pagoLegado = formatStatusTratativa('pago');
    expect(pagoLegado.key).toBe('concluido');
  });

  it('deve calcular saldo de reembolso restante corretamente (Aprovado - Utilizado pelo Pax)', () => {
    // Setup & Action
    const saldoTotal = calculateSaldoReembolso(5000, 2000);
    const saldoZerado = calculateSaldoReembolso(3000, 3000);
    const saldoNegativoTratado = calculateSaldoReembolso(1000, 1500);

    // Assert
    expect(saldoTotal).toBe(3000);
    expect(saldoZerado).toBe(0);
    expect(saldoNegativoTratado).toBe(0);
  });

  it('deve definir data_resolucao e status_tratativa ao concluir reembolso', () => {
    // Setup & Action
    const payloadConcluido = prepareReembolsoStatusPayload('concluido', '2026-09-09T12:00:00.000Z');
    const payloadAgencia = prepareReembolsoStatusPayload('pendente_agencia');
    const payloadFornecedor = prepareReembolsoStatusPayload('pendente_fornecedor');

    // Assert
    expect(payloadConcluido.status).toBe('pago');
    expect(payloadConcluido.status_tratativa).toBe('concluido');
    expect(payloadConcluido.data_resolucao).toBe('2026-09-09');

    expect(payloadAgencia.status).toBe('solicitado');
    expect(payloadAgencia.status_tratativa).toBe('pendente_agencia');
    expect(payloadAgencia.data_resolucao).toBeNull();

    expect(payloadFornecedor.status).toBe('solicitado');
    expect(payloadFornecedor.status_tratativa).toBe('pendente_fornecedor');
    expect(payloadFornecedor.data_resolucao).toBeNull();
  });

  it('deve filtrar reembolsos por múltiplos critérios: ID, número da viagem, produto, fornecedor e valores', () => {
    // Setup
    const reembolsos = [
      { 
        id: 'rmb-001-uuid', 
        codigo_ref: 'RMB-01',
        valor_produto: 4500,
        valor_solicitado: 4500,
        valor_aprovado: 4000,
        valor_utilizado_pax: 1500,
        status_tratativa: 'pendente_agencia',
        produto: { tipo: 'AÉREO', fornecedor: 'LATAM', descricao: 'Voo GRU-MIA' },
        viagem: { codigo_ref: 'VIA-0100', destino: 'Miami', codigo_localizador: 'XYZ987', cliente: { nome: 'Carlos Silva', email: 'carlos@email.com' } } 
      },
      { 
        id: 'rmb-002-uuid', 
        codigo_ref: 'RMB-02',
        valor_produto: 2200,
        valor_solicitado: 2200,
        valor_aprovado: 2200,
        valor_utilizado_pax: 2200,
        status_tratativa: 'concluido',
        produto: { tipo: 'HOTEL', fornecedor: 'Agaxtur', descricao: 'Resort Cancun' },
        viagem: { codigo_ref: 'VIA-0200', destino: 'Cancun', codigo_localizador: 'HTL123', cliente: { nome: 'Mariana Costa', email: 'mariana@email.com' } } 
      }
    ];

    // Action
    const buscaId = filterReembolsosByTerm(reembolsos, 'RMB-01');
    const buscaViagem = filterReembolsosByTerm(reembolsos, 'VIA-0200');
    const buscaFornecedor = filterReembolsosByTerm(reembolsos, 'LATAM');
    const buscaTratativa = filterReembolsosByTerm(reembolsos, 'Agaxtur');
    const buscaInexistente = filterReembolsosByTerm(reembolsos, 'Disney');

    // Assert
    expect(buscaId).toHaveLength(1);
    expect(buscaId[0].id).toBe('rmb-001-uuid');

    expect(buscaViagem).toHaveLength(1);
    expect(buscaViagem[0].id).toBe('rmb-002-uuid');

    expect(buscaFornecedor).toHaveLength(1);
    expect(buscaFornecedor[0].id).toBe('rmb-001-uuid');

    expect(buscaTratativa).toHaveLength(1);
    expect(buscaTratativa[0].id).toBe('rmb-002-uuid');

    expect(buscaInexistente).toHaveLength(0);
  });
});
