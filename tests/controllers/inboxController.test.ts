import { describe, it, expect } from 'vitest';
import { InboxMessage } from '../../src/types';

// Funções puras que refletem a lógica de controle da página Inbox sem acoplamento ao DOM
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

describe('InboxController - Lógica Subcutânea de Página', () => {
  const mensagensExemplo: any[] = [
    {
      id: 'm1',
      titulo: 'Novo Orçamento Paris',
      cliente_nome: 'Roberto Carlos',
      remetente_nome: 'Sistema',
      lido: false,
      arquivado: false,
      destinatario_id: 'user-1',
    },
    {
      id: 'm2',
      titulo: 'Dúvida Roteiro Roma',
      cliente_nome: 'Ana Paula',
      remetente_nome: 'Ana Paula',
      lido: true,
      arquivado: false,
      destinatario_id: 'user-1',
    },
    {
      id: 'm3',
      titulo: 'Mensagem Antiga Arquivada',
      cliente_nome: 'Carlos Souza',
      lido: true,
      arquivado: true,
      destinatario_id: 'user-1',
    },
    {
      id: 'm4',
      titulo: 'Alerta de Escala de Colega',
      cliente_nome: '',
      remetente_nome: 'Outro Consultor',
      lido: false,
      arquivado: false,
      destinatario_id: 'outro-user',
    },
  ];

  it('deve calcular contadores de badges de não lidas e arquivadas com exatidão', () => {
    // Action
    const { naoLidasTotal, arquivadasTotal } = calcularBadgesInbox(mensagensExemplo);

    // Assert
    expect(naoLidasTotal).toBe(2); // m1 e m4
    expect(arquivadasTotal).toBe(1); // m3
  });

  it('deve filtrar apenas mensagens não lidas ativas descartando lidas e arquivadas', () => {
    // Action
    const filtradas = filtrarMensagensInbox(mensagensExemplo, 'nao_lidas', false, '', 'user-1');

    // Assert
    expect(filtradas).toHaveLength(2);
    expect(filtradas.map((m) => m.id)).toEqual(['m1', 'm4']);
  });

  it('deve filtrar mensagens arquivadas exclusivamente na aba de arquivadas', () => {
    // Action
    const arquivadas = filtrarMensagensInbox(mensagensExemplo, 'arquivadas', false, '', 'user-1');

    // Assert
    expect(arquivadas).toHaveLength(1);
    expect(arquivadas[0].id).toBe('m3');
  });

  it('deve combinar busca por termo com filtro de apenas não lidas', () => {
    // Action - Busca por "Roberto" entre as não lidas
    const resultado = filtrarMensagensInbox(mensagensExemplo, 'todas', true, 'roberto', 'user-1');

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('m1');
  });
});
