/**
 * ReembolsosController
 * Funções puras de controle, cálculo de SLA e regras de negócio para Reembolsos.
 */

export const STATUS_TRATATIVA_DEFINITIONS = {
  pendente_agencia: {
    label: 'Reembolso pendente ação agência',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60',
    icon: '🏢'
  },
  pendente_fornecedor: {
    label: 'Reembolso pendente ação fornecedor',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60',
    icon: '✈️'
  },
  pendente_agaxtur: {
    label: 'Reembolso pendente ação Agaxtur',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/60',
    icon: '🌐'
  },
  concluido: {
    label: 'Reembolso concluido',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60',
    icon: '✅'
  }
};

export type StatusTratativaKey = keyof typeof STATUS_TRATATIVA_DEFINITIONS;

export function formatStatusTratativa(status?: string): { label: string; badgeClass: string; icon: string; key: string } {
  if (!status) {
    return {
      key: 'pendente_agencia',
      ...STATUS_TRATATIVA_DEFINITIONS.pendente_agencia
    };
  }

  // Normalização de chaves conhecidas
  const normalizado = status.toLowerCase().trim();
  if (normalizado === 'pendente_agencia' || normalizado.includes('agência') || normalizado.includes('agencia')) {
    return { key: 'pendente_agencia', ...STATUS_TRATATIVA_DEFINITIONS.pendente_agencia };
  }
  if (normalizado === 'pendente_fornecedor' || normalizado.includes('fornecedor') || normalizado === 'solicitado') {
    return { key: 'pendente_fornecedor', ...STATUS_TRATATIVA_DEFINITIONS.pendente_fornecedor };
  }
  if (normalizado === 'pendente_agaxtur' || normalizado.includes('agaxtur')) {
    return { key: 'pendente_agaxtur', ...STATUS_TRATATIVA_DEFINITIONS.pendente_agaxtur };
  }
  if (normalizado === 'concluido' || normalizado === 'pago' || normalizado.includes('conclu')) {
    return { key: 'concluido', ...STATUS_TRATATIVA_DEFINITIONS.concluido };
  }

  return {
    key: 'pendente_agencia',
    ...STATUS_TRATATIVA_DEFINITIONS.pendente_agencia
  };
}

export function calculateSaldoReembolso(valorAprovado: number = 0, valorUtilizadoPax: number = 0): number {
  const saldo = Number(valorAprovado || 0) - Number(valorUtilizadoPax || 0);
  return Math.max(0, saldo);
}

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
): { status: string; status_tratativa: string; data_resolucao: string | null } {
  const tratativaInfo = formatStatusTratativa(novoStatus);
  const isConcluido = tratativaInfo.key === 'concluido';

  return {
    status: isConcluido ? 'pago' : 'solicitado',
    status_tratativa: tratativaInfo.key,
    data_resolucao: isConcluido 
      ? (resolutionDateIso ? resolutionDateIso.split('T')[0] : new Date().toISOString().split('T')[0])
      : null
  };
}

export function filterReembolsosByTerm(reembolsos: any[], termo: string): any[] {
  if (!termo.trim()) return reembolsos;
  const t = termo.toLowerCase().trim();

  return reembolsos.filter(r => {
    const nomeCliente = r.viagem?.cliente?.nome?.toLowerCase() || '';
    const emailCliente = r.viagem?.cliente?.email?.toLowerCase() || '';
    const destino = r.viagem?.destino?.toLowerCase() || '';
    const loc = r.viagem?.codigo_localizador?.toLowerCase() || '';
    
    // Identificadores de Viagem e Reembolso
    const idReembolso = (r.id || '').toLowerCase();
    const codigoRefReembolso = (r.codigo_ref || r.codigoRef || '').toLowerCase();
    const idViagem = (r.viagem_id || r.viagemId || r.viagem?.id || '').toLowerCase();
    const codigoRefViagem = (r.viagem?.codigo_ref || r.viagem?.codigoRef || r.viagem?.codigo || '').toLowerCase();

    // Produto
    const prodTipo = (r.produto?.tipo || '').toLowerCase();
    const prodDesc = (r.produto?.descricao || '').toLowerCase();
    const prodForn = (r.produto?.fornecedor || '').toLowerCase();

    // Status da Tratativa
    const tratativa = formatStatusTratativa(r.status_tratativa || r.status).label.toLowerCase();
    const motivo = (r.motivo_cancelamento || r.motivoCancelamento || r.motivo || '').toLowerCase();

    // Valores formatados
    const valorProdStr = Number(r.valor_produto || r.produto?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const valorSolStr = Number(r.valor_solicitado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const valorAprovStr = Number(r.valor_aprovado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const valorUtilStr = Number(r.valor_utilizado_pax || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    return (
      nomeCliente.includes(t) ||
      emailCliente.includes(t) ||
      destino.includes(t) ||
      loc.includes(t) ||
      idReembolso.includes(t) ||
      codigoRefReembolso.includes(t) ||
      idViagem.includes(t) ||
      codigoRefViagem.includes(t) ||
      prodTipo.includes(t) ||
      prodDesc.includes(t) ||
      prodForn.includes(t) ||
      tratativa.includes(t) ||
      motivo.includes(t) ||
      valorProdStr.includes(t) ||
      valorSolStr.includes(t) ||
      valorAprovStr.includes(t) ||
      valorUtilStr.includes(t)
    );
  });
}
