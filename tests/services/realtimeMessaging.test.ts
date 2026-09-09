import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealtimeMessagingService } from '../../src/services/realtimeMessaging';
import { supabase } from '../../src/services/supabase';

let registeredHandlers: Record<string, (payload: any) => void> = {};

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    channel: vi.fn(() => {
      const channelMock: any = {
        on: vi.fn((event: string, filter: any, callback: (payload: any) => void) => {
          registeredHandlers[filter.table] = callback;
          return channelMock;
        }),
        subscribe: vi.fn((cb?: any) => {
          if (cb) cb('SUBSCRIBED');
          return channelMock;
        }),
        unsubscribe: vi.fn()
      };
      return channelMock;
    })
  }
}));

describe('RealtimeMessagingService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers = {};
    RealtimeMessagingService.stop();
  });

  it('deve registrar assinaturas no canal Realtime ao inicializar', () => {
    // Setup
    const userId = 'user-test-10';
    const role = 'consultor';

    // Action
    RealtimeMessagingService.init(userId, role);

    // Assert
    expect(supabase.channel).toHaveBeenCalledWith(`paxflow-realtime-user-${userId}`);
    expect(registeredHandlers['escala_solicitacoes']).toBeDefined();
    expect(registeredHandlers['lembretes']).toBeDefined();
    expect(registeredHandlers['notificacoes']).toBeDefined();
    expect(registeredHandlers['mensagens_diretas']).toBeDefined();
    expect(registeredHandlers['comentarios']).toBeDefined();
    expect(registeredHandlers['escala_diaria']).toBeDefined();
  });

  it('deve filtrar e processar notificacoes destinadas exclusivamente ao usuário ativo', () => {
    // Setup
    const userId = 'user-test-10';
    const callback = vi.fn();
    RealtimeMessagingService.init(userId, 'consultor', callback);

    // Action
    // Evento destinado a outro usuário (deve ignorar)
    registeredHandlers['notificacoes']({
      eventType: 'INSERT',
      new: { id: 'notif-1', user_id: 'outro-user' }
    });

    // Evento destinado ao usuário ativo (deve acionar)
    registeredHandlers['notificacoes']({
      eventType: 'INSERT',
      new: { id: 'notif-2', user_id: userId }
    });

    // Assert
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      table: 'notificacoes',
      eventType: 'INSERT',
      newRecord: { id: 'notif-2', user_id: userId }
    }));
  });

  it('deve autorizar escala_solicitacoes se usuário for admin, solicitante ou destinatário', () => {
    // Setup
    const callbackAdmin = vi.fn();
    RealtimeMessagingService.init('admin-1', 'admin', callbackAdmin);

    // Action - Admin recebe qualquer solicitação
    registeredHandlers['escala_solicitacoes']({
      eventType: 'UPDATE',
      new: { id: 'sol-1', solicitante_id: 'user-a', destinatario_id: 'user-b', status: 'aprovado' },
      old: { id: 'sol-1', status: 'pendente' }
    });

    // Assert
    expect(callbackAdmin).toHaveBeenCalledTimes(1);

    // Setup - Consultor comum não envolvido
    RealtimeMessagingService.stop();
    const callbackConsultor = vi.fn();
    RealtimeMessagingService.init('consultor-c', 'consultor', callbackConsultor);

    // Action - Solicitação de A para B (consultor C não deve ser notificado)
    registeredHandlers['escala_solicitacoes']({
      eventType: 'INSERT',
      new: { id: 'sol-2', solicitante_id: 'user-a', destinatario_id: 'user-b' }
    });

    // Assert
    expect(callbackConsultor).not.toHaveBeenCalled();
  });

  it('deve limpar o canal e os callbacks no stop()', () => {
    // Setup
    const callback = vi.fn();
    RealtimeMessagingService.init('user-1', 'consultor', callback);

    // Action
    RealtimeMessagingService.stop();

    // Assert
    // Tentativa de envio com canal parado não deve atingir callback
    if (registeredHandlers['notificacoes']) {
      registeredHandlers['notificacoes']({
        eventType: 'INSERT',
        new: { user_id: 'user-1' }
      });
    }
    expect(callback).not.toHaveBeenCalled();
  });
});
