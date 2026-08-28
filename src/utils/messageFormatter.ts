/**
 * Mapeador e Formatador de Mensagens e Notificações do PaxFlow
 * Elimina jargões técnicos, enums em caixa alta e formata mensagens em tom de voz cortês.
 */

export interface FormattedEscalaType {
  label: string;
  emoji: string;
  title: string;
}

export function formatTipoSolicitacaoEscala(tipo: string): FormattedEscalaType {
  const cleanType = (tipo || '').trim().toLowerCase();

  switch (cleanType) {
    case 'troca':
      return { label: 'Troca de Turno', emoji: '🔄', title: 'Solicitação de Troca de Turno' };
    case 'folga':
      return { label: 'Folga Semanal', emoji: '📅', title: 'Solicitação de Folga Semanal' };
    case 'ferias':
      return { label: 'Período de Férias', emoji: '🏖️', title: 'Solicitação de Férias' };
    case 'atendimento_balcao':
      return { label: 'Atendimento no Balcão', emoji: '🤝', title: 'Atendimento no Balcão (Co-Piloto)' };
    default:
      return { label: 'Solicitação de Escala', emoji: '📋', title: 'Solicitação de Escala' };
  }
}

export function formatStatusEscala(status: string): { label: string; badgeClass: string } {
  const cleanStatus = (status || '').trim().toLowerCase();

  switch (cleanStatus) {
    case 'aprovado':
      return { label: 'Aprovada', badgeClass: 'text-emerald-600 dark:text-emerald-400 font-extrabold' };
    case 'recusado':
      return { label: 'Recusada', badgeClass: 'text-rose-600 dark:text-rose-400 font-extrabold' };
    case 'pendente_admin':
      return { label: 'Aguardando Gestão', badgeClass: 'text-amber-600 dark:text-amber-400 font-extrabold' };
    default:
      return { label: 'Em Análise', badgeClass: 'text-indigo-600 dark:text-indigo-400 font-extrabold' };
  }
}

export function formatReembolsoStatus(status: string): string {
  const cleanStatus = (status || '').trim().toLowerCase();

  switch (cleanStatus) {
    case 'solicitado':
      return 'Solicitado / Em Análise';
    case 'solicitado_fornecedor':
      return 'Aguardando Resposta do Fornecedor';
    case 'aprovado':
      return 'Aprovado pelo Financeiro';
    case 'pago':
      return 'Reembolso Concluído (Pago)';
    case 'recusado':
      return 'Solicitação Indeferida';
    default:
      return status || 'Em Processamento';
  }
}

/**
 * Converte qualquer string de data (YYYY-MM-DD, ISO, YYYY-MM-DDTHH:mm:ss) para dd/mm/aaaa
 */
export function formatarDataBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str;

  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (ymdMatch) {
    const [_, ano, mes, dia, hora, min] = ymdMatch;
    let formatted = `${dia}/${mes}/${ano}`;
    if (hora && min) formatted += ` às ${hora}:${min}`;
    return formatted;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch {}

  return str;
}

/**
 * Formata um intervalo de datas para dd/mm/aaaa ou dd/mm/aaaa a dd/mm/aaaa
 */
export function formatarPeriodoDataBR(dataOrigem: string, dataDestino?: string): string {
  const fOrigem = formatarDataBR(dataOrigem);
  const fDestino = formatarDataBR(dataDestino);
  if (fDestino && fDestino !== fOrigem) {
    return `${fOrigem} a ${fDestino}`;
  }
  return fOrigem;
}
