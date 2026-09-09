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

describe('InboxService Subcutaneous Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve mapear corretamente variantes de IDs de alertas lidos a partir de notificacoes', async () => {
    // Setup
    const userId = 'user-uuid-1234';
    const targetItemId = 'c112f72b-5bde-4559-95b2-2a484ce10289';
    const mockSelect = vi.fn().mockReturnThis();
    const mockEqUser = vi.fn().mockReturnThis();
    const mockEqLida = vi.fn().mockResolvedValue({
      data: [
        { id: 'notif-uuid-999', item_id: targetItemId, parent_id: targetItemId }
      ],
      error: null
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: vi.fn((col, val) => {
        if (col === 'user_id') return { eq: mockEqLida };
        return mockEqLida;
      })
    });

    // Action
    const readIds = await InboxService.getReadAlerts(userId);

    // Assert
    expect(readIds).toContain('mention-notif-uuid-999');
    expect(readIds).toContain(`escala-sol-${targetItemId}-inbox`);
    expect(readIds).toContain(`escala-sol-${targetItemId}-decisao`);
    expect(readIds).toContain(`dm-direct-${targetItemId}`);
    expect(readIds).toContain(`manual-${targetItemId}`);
  });

  it('deve inserir notificacao de leitura quando alerta de escala for lido pela primeira vez', async () => {
    // Setup
    const userId = 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
    const targetItemId = 'c112f72b-5bde-4559-95b2-2a484ce10289';
    const alertId = `escala-sol-${targetItemId}-inbox`;

    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
      insert: mockInsert
    });

    // Action
    await InboxService.markAlertAsRead(userId, alertId);

    // Assert
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        item_id: targetItemId,
        lida: true
      })
    );
  });

  it('deve atualizar notificacao existente para lida = false ao marcar como nao lida', async () => {
    // Setup
    const userId = 'd11433e1-06c5-4002-be7e-0e2c44bc5782';
    const targetItemId = '55d071a9-8210-45db-9637-6877a4d3f9fa';
    const alertId = `escala-sol-${targetItemId}-decisao`;

    const mockUpdate = vi.fn().mockReturnThis();
    const mockEqId = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEqId });

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'existing-notif-uuid' },
      error: null
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
      update: mockUpdate
    });

    // Action
    await InboxService.markAlertAsUnread(userId, alertId);

    // Assert
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        lida: false
      })
    );
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
});
