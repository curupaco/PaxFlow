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
      motivo: 'Solicitação de Proposta',
      lido: false,
      arquivado: false,
      destinatario_id: 'user-1',
    },
    {
      id: 'm2',
      titulo: 'Dúvida Roteiro Roma',
      cliente_nome: 'Ana Paula',
      remetente_nome: 'Ana Paula',
      motivo: 'Ajuste de hotel',
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
      motivo: 'Plantão de balcão',
      lido: false,
      arquivado: false,
      destinatario_id: 'outro-user',
      solicitante_id: 'user-1', // user-1 é o solicitante
    },
  ];

  it('deve calcular contadores de badges de não lidas e arquivadas com exatidão', () => {
    // Action
    const { naoLidasTotal, arquivadasTotal } = calcularBadgesInbox(mensagensExemplo);

    // Assert
    expect(naoLidasTotal).toBe(2); // m1 e m4
    expect(arquivadasTotal).toBe(1); // m3
  });

  it('deve retornar badges zeradas quando a lista for vazia ou todas lidas', () => {
    // Setup
    const todasLidas: any[] = [
      { id: '1', lido: true, arquivado: false },
      { id: '2', lido: true, arquivado: false },
    ];

    // Action
    const badgesVazio = calcularBadgesInbox([]);
    const badgesLidas = calcularBadgesInbox(todasLidas);

    // Assert
    expect(badgesVazio.naoLidasTotal).toBe(0);
    expect(badgesVazio.arquivadasTotal).toBe(0);
    expect(badgesLidas.naoLidasTotal).toBe(0);
    expect(badgesLidas.arquivadasTotal).toBe(0);
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

  it('deve filtrar aba "minhas" considerando tanto destinatário quanto solicitante', () => {
    // Action - m1 e m2 são destinatário user-1; m4 é solicitante user-1
    const minhas = filtrarMensagensInbox(mensagensExemplo, 'minhas', false, '', 'user-1');

    // Assert
    expect(minhas).toHaveLength(3); // m1, m2, m4 (m3 é arquivada, fica de fora)
    expect(minhas.map(m => m.id)).toEqual(['m1', 'm2', 'm4']);
  });

  it('deve combinar busca por termo com filtro de apenas não lidas', () => {
    // Action - Busca por "Roberto" entre as não lidas
    const resultado = filtrarMensagensInbox(mensagensExemplo, 'todas', true, 'roberto', 'user-1');

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('m1');
  });

  it('deve permitir busca por motivo de alerta na caixa de entrada', () => {
    // Action - Busca por "Plantão"
    const resultado = filtrarMensagensInbox(mensagensExemplo, 'todas', false, 'plantão', 'user-1');

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('m4');
  });
});
