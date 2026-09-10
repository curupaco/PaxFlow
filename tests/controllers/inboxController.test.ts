import { describe, it, expect } from 'vitest';
import {
  filtrarMensagensInbox,
  calcularBadgesInbox
} from '../../src/controllers/inboxController';

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
