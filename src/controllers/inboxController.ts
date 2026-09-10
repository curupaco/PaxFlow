/**
 * InboxController
 * Funções puras de controle e filtros da Caixa de Entrada (Inbox) e Alertas.
 */
import { InboxMessage } from '../types';

export function filtrarMensagensInbox(
  mensagens: InboxMessage[],
  abaAtiva: 'todas' | 'nao_lidas' | 'arquivadas' | 'minhas',
  apenasNaoLidasBotao: boolean,
  termoBusca: string,
  currentUserId: string
): InboxMessage[] {
  let lista = [...mensagens];

  // 1. Filtro de abas
  if (abaAtiva === 'arquivadas') {
    lista = lista.filter((m) => m.arquivado === true);
  } else {
    lista = lista.filter((m) => m.arquivado !== true);
  }

  if (abaAtiva === 'nao_lidas' || apenasNaoLidasBotao) {
    lista = lista.filter((m) => !m.lido);
  }

  if (abaAtiva === 'minhas') {
    lista = lista.filter((m) => m.destinatario_id === currentUserId || m.solicitante_id === currentUserId);
  }

  // 2. Filtro por termo de busca
  if (termoBusca && termoBusca.trim().length > 0) {
    const q = termoBusca.toLowerCase().trim();
    lista = lista.filter((m) => {
      const tit = (m.titulo || '').toLowerCase();
      const cli = (m.cliente_nome || '').toLowerCase();
      const rem = (m.remetente_nome || m.solicitante_nome || '').toLowerCase();
      const mot = (m.motivo || '').toLowerCase();
      return tit.includes(q) || cli.includes(q) || rem.includes(q) || mot.includes(q);
    });
  }

  return lista;
}

export function calcularBadgesInbox(mensagens: InboxMessage[]): { naoLidasTotal: number; arquivadasTotal: number } {
  let naoLidasTotal = 0;
  let arquivadasTotal = 0;

  mensagens.forEach((m) => {
    if (m.arquivado) {
      arquivadasTotal++;
    } else {
      if (!m.lido) naoLidasTotal++;
    }
  });

  return { naoLidasTotal, arquivadasTotal };
}
