import { describe, it, expect } from 'vitest';

// Funções puras de controle extraídas e espelhadas da lógica de ReembolsosPage
export function filterReembolsosByPermission(
  reembolsos: any[],
  userId: string,
  userRole: string
): any[] {
  if (userRole === 'admin') {
    return reembolsos;
  }

  return reembolsos.filter(r => {
    const rSolicitanteId = r.consultor_solicitante_id || r.consultorSolicitanteId;
    const vConsultorId = r.viagem?.consultor_id || r.viagem?.consultorId;
    const vRespId = r.viagem?.consultor_responsavel_id || r.viagem?.consultorResponsavelId;
    return rSolicitanteId === userId || vConsultorId === userId || vRespId === userId;
  });
}

export function calculateElapsedTime(createdAtStr: string, nowMs: number = Date.now()): string {
  const dataAbertura = new Date(createdAtStr);
  const diffMs = nowMs - dataAbertura.getTime();

  if (diffMs < 0) return '0d 0h 0m 0s';

  const totalSegundos = Math.floor(diffMs / 1000);
  const dias = Math.floor(totalSegundos / 86400);
  const horas = Math.floor((totalSegundos % 86400) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  return `${dias}d ${horas}h ${minutos}m ${segundos}s`;
}

export function prepareReembolsoStatusPayload(novoStatus: string, resolutionDateIso?: string): { status: string; data_resolucao: string | null } {
  const statusFinal = novoStatus === 'Aguardando Fornecedor' ? 'solicitado' : novoStatus;
  const payload: { status: string; data_resolucao: string | null } = {
    status: statusFinal,
    data_resolucao: null
  };

  if (statusFinal === 'pago') {
    payload.data_resolucao = resolutionDateIso ? resolutionDateIso.split('T')[0] : new Date().toISOString().split('T')[0];
  }

  return payload;
}

export function filterReembolsosByTerm(reembolsos: any[], termo: string): any[] {
  if (!termo.trim()) return reembolsos;
  const t = termo.toLowerCase().trim();

  return reembolsos.filter(r => {
    const nomeCliente = r.viagem?.cliente?.nome?.toLowerCase() || '';
    const codigoViagem = r.viagem?.codigo?.toLowerCase() || '';
    const motivo = r.motivo?.toLowerCase() || '';
    return nomeCliente.includes(t) || codigoViagem.includes(t) || motivo.includes(t);
  });
}

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
});
