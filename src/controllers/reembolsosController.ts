/**
 * ReembolsosController
 * Funções puras de controle, cálculo de SLA e regras de negócio para Reembolsos.
 */

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

export function prepareReembolsoStatusPayload(
  novoStatus: string,
  resolutionDateIso?: string
): { status: string; data_resolucao: string | null } {
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
