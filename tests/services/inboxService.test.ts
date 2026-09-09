import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InboxService } from '../../src/services/inboxService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom
    }
  };
});

function createQueryMock(data: any = [], error: any = null) {
  const result = { data, error };
  const mock: any = {
    select: vi.fn(() => mock),
    order: vi.fn(() => mock),
    not: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    or: vi.fn(() => mock),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    insert: vi.fn(() => Promise.resolve(result)),
    update: vi.fn(() => mock),
    upsert: vi.fn(() => Promise.resolve(result)),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    }
  };
  return mock;
}

describe('InboxService Subcutaneous Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // FLUXO 1: LEITURA E PERSISTÊNCIA DE ALERTAS
  // ==========================================

  it('deve mapear corretamente variantes de IDs de alertas lidos a partir de notificacoes', async () => {
    // Setup
    const userId = 'user-uuid-1234';
    const targetItemId = 'c112f72b-5bde-4559-95b2-2a484ce10289';

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'notificacoes') {
        return createQueryMock([
          { id: 'notif-uuid-999', item_id: targetItemId, parent_id: targetItemId }
        ]);
      }
      return createQueryMock([]);
    });

    // Action
    const readIds = await InboxService.getReadAlerts(userId);

    // Assert
    expect(readIds).toContain('mention-notif-uuid-999');
    expect(readIds).toContain(`escala-sol-${targetItemId}-inbox`);
    expect(readIds).toContain(`escala-sol-${targetItemId}-decisao`);
    expect(readIds).toContain(`dm-direct-${targetItemId}`);
    expect(readIds).toContain(`manual-${targetItemId}`);
    expect(readIds).toContain(`passport-${targetItemId}`);
    expect(readIds).toContain(`refund-${targetItemId}`);
  });

  it('deve inserir notificacao de leitura no Supabase para alerta de escala sem registro previo', async () => {
    // Setup
    const userId = 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
    const targetItemId = 'c112f72b-5bde-4559-95b2-2a484ce10289';
    const alertId = `escala-sol-${targetItemId}-inbox`;

    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const queryMock = createQueryMock(null);
    queryMock.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    queryMock.insert = mockInsert;

    (supabase.from as any).mockReturnValue(queryMock);

    // Action
    await InboxService.markAlertAsRead(userId, alertId);

    // Assert
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        item_id: targetItemId,
        lida: true,
        arquivada: false
      })
    );
  });

  it('deve atualizar notificacao para lida = false ao marcar como nao lido', async () => {
    // Setup
    const userId = 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
    const targetItemId = '55d071a9-8210-45db-9637-6877a4d3f9fa';
    const alertId = `escala-sol-${targetItemId}-decisao`;

    const mockUpdate = vi.fn().mockReturnThis();
    const mockEqId = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEqId });

    const queryMock = createQueryMock(null);
    queryMock.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'existing-notif-uuid' },
      error: null
    });
    queryMock.update = mockUpdate;

    (supabase.from as any).mockReturnValue(queryMock);

    // Action
    await InboxService.markAlertAsUnread(userId, alertId);

    // Assert
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        lida: false
      })
    );
    expect(mockEqId).toHaveBeenCalledWith('id', 'existing-notif-uuid');
  });

  it('deve processar marcacao em lote para multiplos alertas de tipos distintos', async () => {
    // Setup
    const userId = 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
    const ids = [
      'escala-sol-c112f72b-5bde-4559-95b2-2a484ce10289-inbox',
      'dm-direct-44146337-adc5-45c6-8966-eaf38abe8f05'
    ];

    const markSingleSpy = vi.spyOn(InboxService, 'markAlertAsRead').mockResolvedValue();

    // Action
    await InboxService.markAllAlertsAsRead(userId, ids);

    // Assert
    expect(markSingleSpy).toHaveBeenCalledTimes(2);
    expect(markSingleSpy).toHaveBeenCalledWith(userId, ids[0]);
    expect(markSingleSpy).toHaveBeenCalledWith(userId, ids[1]);
  });

  // ==========================================
  // FLUXO 2: ARQUIVAMENTO E DESARQUIVAMENTO
  // ==========================================

  it('deve arquivar lembrete manual persistindo na tabela lembretes', async () => {
    // Setup
    const reminderUUID = '88888888-4444-4444-4444-121212121212';
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: reminderUUID }], error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'lembretes') {
        return {
          update: mockUpdate,
          eq: mockEq,
          select: mockSelect
        };
      }
      return createQueryMock([]);
    });

    // Action
    const result = await InboxService.archiveAlert({ id: `manual-${reminderUUID}`, type: 'manual' }, true);

    // Assert
    expect(mockUpdate).toHaveBeenCalledWith({ arquivado: true });
    expect(mockEq).toHaveBeenCalledWith('id', reminderUUID);
    expect(result).toBe(true);
  });

  it('deve arquivar notificacao de mencao persistindo na tabela notificacoes', async () => {
    // Setup
    const notifUUID = '77777777-3333-3333-3333-111111111111';
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: notifUUID }], error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'notificacoes') {
        return {
          update: mockUpdate,
          eq: mockEq,
          select: mockSelect
        };
      }
      return createQueryMock([]);
    });

    // Action
    const result = await InboxService.archiveAlert({ id: `mention-${notifUUID}`, type: 'mention' }, true);

    // Assert
    expect(mockUpdate).toHaveBeenCalledWith({ arquivada: true });
    expect(mockEq).toHaveBeenCalledWith('id', notifUUID);
    expect(result).toBe(true);
  });

  it('deve sincronizar arquivamento de mensagem direta via upsert em notificacoes', async () => {
    // Setup
    const msgUUID = '66666666-2222-2222-2222-000000000000';
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'notificacoes') {
        return { upsert: mockUpsert };
      }
      return createQueryMock([]);
    });

    // Action
    const result = await InboxService.archiveAlert({ id: `dm-direct-${msgUUID}` }, true);

    // Assert
    expect(mockUpsert).toHaveBeenCalledWith({
      item_id: msgUUID,
      parent_id: msgUUID,
      tipo_item: 'mensagem',
      arquivada: true
    });
    expect(result).toBe(true);
  });

  // ==========================================
  // FLUXO 3: COMPILAÇÃO E CARGA DE ALERTAS
  // ==========================================

  it('deve retornar lista vazia se usuario nao for fornecido em loadAndBuildAlerts', async () => {
    // Setup
    const user = null;
    const perfil = null;

    // Action
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, 15);

    // Assert
    expect(alerts).toEqual([]);
  });

  it('deve compilar alertas de SLA de passaporte (expirado e proximo ao vencimento)', async () => {
    // Setup
    const user = { id: 'admin-user-id' };
    const perfil = { id: 'admin-user-id', role: 'admin', nome: 'Administrador' } as any;

    const dataOntem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dataEm30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'clientes') {
        return createQueryMock([
          {
            id: 'cli-expired-1',
            nome: 'Passageiro Vencido',
            passaporte_validade: dataOntem,
            consultor_responsavel_id: 'admin-user-id'
          },
          {
            id: 'cli-warning-2',
            nome: 'Passageiro Alerta',
            passaporte_validade: dataEm30Dias,
            consultor_responsavel_id: 'admin-user-id'
          }
        ]);
      }
      return createQueryMock([]);
    });

    // Action
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, 15);
    const passAlerts = alerts.filter(a => a.type === 'passport');

    // Assert
    expect(passAlerts.length).toBe(2);
    expect(passAlerts[0].subject).toContain('expirado');
    expect(passAlerts[1].subject).toContain('perto de vencer');
  });

  it('deve compilar alertas de SLA de reembolso respeitando o prazo configurado', async () => {
    // Setup
    const user = { id: 'consultor-user-id' };
    const perfil = { id: 'consultor-user-id', role: 'consultor', nome: 'Consultor Teste' } as any;
    const prazoDias = 10;
    const dataCriacaoAtrasado = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString();

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'reembolsos') {
        return createQueryMock([
          {
            id: 'rem-uuid-1',
            created_at: dataCriacaoAtrasado,
            status: 'solicitado',
            valor_solicitado: 1500,
            consultor_solicitante_id: 'consultor-user-id',
            viagem: {
              consultor_id: 'consultor-user-id',
              destino: 'Paris',
              cliente: { nome: 'Maria Silva' }
            }
          }
        ]);
      }
      return createQueryMock([]);
    });

    // Action
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, prazoDias);
    const refundAlert = alerts.find(a => a.type === 'refund');

    // Assert
    expect(refundAlert).toBeDefined();
    expect(refundAlert?.title).toContain('CRÍTICO - Reembolso VENCIDO!');
    expect(refundAlert?.targetId).toBe('rem-uuid-1');
  });

  it('deve compilar solicitacoes de escala pendentes para aprovacao do administrador', async () => {
    // Setup
    const user = { id: 'admin-id' };
    const perfil = { id: 'admin-id', role: 'admin', nome: 'Admin Chefe' } as any;

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_solicitacoes') {
        return createQueryMock([
          {
            id: 'sol-escala-uuid-1',
            tipo: 'folga',
            status: 'pendente_admin',
            solicitante_id: 'consultor-carlos-id',
            solicitante_nome: 'Carlos',
            motivo: 'Compromisso pessoal',
            data_origem: '2026-09-20',
            created_at: new Date().toISOString()
          }
        ]);
      }
      return createQueryMock([]);
    });

    // Action
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, 15);
    const escalaAlert = alerts.find(a => a.id === 'escala-sol-sol-escala-uuid-1-inbox');

    // Assert
    expect(escalaAlert).toBeDefined();
    expect(escalaAlert?.type).toBe('escala_solicitacao');
    expect(escalaAlert?.title).toContain('Aprovação de Escala: Folga');
    expect(escalaAlert?.isDecision).toBe(false);
  });

  it('deve compilar notificacoes de atendimento presencial de balcao (co-piloto)', async () => {
    // Setup
    const user = { id: 'consultor-titular-id' };
    const perfil = { id: 'consultor-titular-id', role: 'consultor', nome: 'Thiago Costa' } as any;

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_solicitacoes') {
        return createQueryMock([
          {
            id: 'sol-balcao-uuid-2',
            tipo: 'atendimento_balcao',
            status: 'aprovado',
            solicitante_id: 'outro-consultor-id',
            solicitante_nome: 'Marina',
            destinatario_id: 'consultor-titular-id',
            destinatario_nome: 'Thiago Costa',
            motivo: 'Atendimento presencial ao cliente Marcelo',
            data_origem: '2026-09-09',
            created_at: new Date().toISOString()
          }
        ]);
      }
      return createQueryMock([]);
    });

    // Action
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, 15);
    const balcaoAlert = alerts.find(a => a.type === 'atendimento_balcao');

    // Assert
    expect(balcaoAlert).toBeDefined();
    expect(balcaoAlert?.title).toContain('Atendimento no Balcão (Co-Piloto)');
    expect(balcaoAlert?.sender).toBe('Marina');
    expect(balcaoAlert?.isSent).toBe(false);
  });

  // ==========================================
  // FLUXO 4: REGRAS DE FILTRAGEM (filterAlerts)
  // ==========================================

  it('deve filtrar apenas itens ativos na pasta ativos excluindo arquivados e enviados', () => {
    // Setup
    const mockList: any[] = [
      { id: '1', arquivado: false, isSent: false, isDecision: false, createdAt: '2026-09-09T10:00:00Z' },
      { id: '2', arquivado: true, isSent: false, isDecision: false, createdAt: '2026-09-09T11:00:00Z' },
      { id: '3', arquivado: false, isSent: true, isDecision: false, createdAt: '2026-09-09T12:00:00Z' },
      { id: '4', arquivado: false, isSent: false, isDecision: true, createdAt: '2026-09-09T13:00:00Z' }
    ];

    // Action
    const result = InboxService.filterAlerts(mockList, { activeTab: 'ativos' });

    // Assert
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('1');
  });

  it('deve filtrar apenas alertas nao lidos quando onlyUnreadFilter for verdadeiro', () => {
    // Setup
    const mockList: any[] = [
      { id: 'item-lido', arquivado: false, isSent: false, isDecision: false, createdAt: '2026-09-09T10:00:00Z' },
      { id: 'item-pendente', arquivado: false, isSent: false, isDecision: false, createdAt: '2026-09-09T11:00:00Z' }
    ];
    const readList = ['item-lido'];

    // Action
    const result = InboxService.filterAlerts(mockList, {
      activeTab: 'ativos',
      onlyUnreadFilter: true,
      readList
    });

    // Assert
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('item-pendente');
  });

  it('deve filtrar alertas por termo de busca textual (assunto, remetente ou corpo)', () => {
    // Setup
    const mockList: any[] = [
      { id: '1', title: 'Voo cancelado', subject: 'Passageiro João', sender: 'Latam', body: 'Detalhes voo', createdAt: '2026-09-09T10:00:00Z' },
      { id: '2', title: 'Hotel reservado', subject: 'Passageiro Maria', sender: 'Booking', body: 'Reserva confirmada', createdAt: '2026-09-09T11:00:00Z' }
    ];

    // Action
    const resultPorPassageiro = InboxService.filterAlerts(mockList, { activeTab: 'todos', searchQuery: 'joão' });
    const resultPorFornecedor = InboxService.filterAlerts(mockList, { activeTab: 'todos', searchQuery: 'booking' });

    // Assert
    expect(resultPorPassageiro.length).toBe(1);
    expect(resultPorPassageiro[0].id).toBe('1');
    expect(resultPorFornecedor.length).toBe(1);
    expect(resultPorFornecedor[0].id).toBe('2');
  });

  it('deve filtrar alertas por categoria especifica (passaportes ou reembolsos)', () => {
    // Setup
    const mockList: any[] = [
      { id: 'p1', type: 'passport', createdAt: '2026-09-09T10:00:00Z' },
      { id: 'r1', type: 'refund', createdAt: '2026-09-09T11:00:00Z' },
      { id: 'm1', type: 'manual', createdAt: '2026-09-09T12:00:00Z' }
    ];

    // Action
    const passaportes = InboxService.filterAlerts(mockList, { activeTab: 'todos', categoryFilter: 'passaporte' });
    const reembolsos = InboxService.filterAlerts(mockList, { activeTab: 'todos', categoryFilter: 'refund' });

    // Assert
    expect(passaportes.length).toBe(1);
    expect(passaportes[0].id).toBe('p1');
    expect(reembolsos.length).toBe(1);
    expect(reembolsos[0].id).toBe('r1');
  });
});
