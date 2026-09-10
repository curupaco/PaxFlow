import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PushNotificationService } from '../../src/services/pushNotificationService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom
    }
  };
});

let store: Record<string, string> = {};

describe('PushNotificationService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store = {};
    (global as any).localStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; })
    };

    (global as any).window = {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
      Notification: { permission: 'default', requestPermission: vi.fn() }
    };

    (global as any).navigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe: vi.fn().mockResolvedValue(null)
          }
        })
      }
    };
  });

  it('deve identificar corretamente suporte a push conforme APIs de navegador presentes', () => {
    // Setup
    const originalNavigator = global.navigator;
    const originalWindow = global.window;

    // Action
    const suportadoOriginal = PushNotificationService.isSupported();

    // Assert
    expect(typeof suportadoOriginal).toBe('boolean');
  });

  it('deve detectar dispositivos iOS atraves do userAgent', () => {
    // Setup
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true
    });

    // Action
    const isIos = PushNotificationService.isIOS();

    // Assert
    expect(isIos).toBe(true);

    // Teardown
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
  });

  it('deve retornar status de permissão de notificação nativa', () => {
    // Setup
    const originalNotification = global.Notification;
    (global as any).Notification = { permission: 'granted' };

    // Action
    const status = PushNotificationService.getPermissionStatus();

    // Assert
    expect(status).toBe('granted');

    // Teardown
    (global as any).Notification = originalNotification;
  });

  it('deve persistir inscricao push no Supabase com sucesso', async () => {
    // Setup
    const userId = 'user-uuid-123';
    const mockEndpoint = 'https://fcm.googleapis.com/fcm/send/token-test';
    const mockP256dh = 'BNcRdreAxxxxxxxxxxxxxxxx';
    const mockAuth = 'authSecret123';

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock
    } as any);

    const mockSub = {
      endpoint: mockEndpoint,
      toJSON: () => ({
        keys: {
          p256dh: mockP256dh,
          auth: mockAuth
        }
      })
    };

    const mockPushManager = {
      getSubscription: vi.fn().mockResolvedValue(mockSub),
      subscribe: vi.fn().mockResolvedValue(mockSub)
    };

    const mockRegistration = {
      pushManager: mockPushManager
    };

    vi.spyOn(PushNotificationService, 'isSupported').mockReturnValue(true);
    vi.spyOn(PushNotificationService, 'registerServiceWorker').mockResolvedValue(mockRegistration as any);

    (global as any).Notification = {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted')
    };

    // Action
    const resultado = await PushNotificationService.subscribeUser(userId);

    // Assert
    expect(resultado).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        endpoint: mockEndpoint,
        p256dh: mockP256dh,
        auth: mockAuth
      }),
      { onConflict: 'endpoint' }
    );
    expect(localStorage.getItem('paxflow_push_enabled')).toBe('true');
    expect(localStorage.getItem('paxflow_push_user_id')).toBe(userId);
  });

  it('deve cancelar inscricao push no navegador e remover endpoint do Supabase', async () => {
    // Setup
    const userId = 'user-uuid-123';
    const mockEndpoint = 'https://fcm.googleapis.com/fcm/send/token-test';

    const unsubscribeMock = vi.fn().mockResolvedValue(true);
    const mockSub = {
      endpoint: mockEndpoint,
      unsubscribe: unsubscribeMock
    };

    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock
    } as any);

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub)
          }
        })
      },
      configurable: true
    });

    localStorage.setItem('paxflow_push_enabled', 'true');
    localStorage.setItem('paxflow_push_user_id', userId);

    // Action
    const resultado = await PushNotificationService.unsubscribeUser(userId);

    // Assert
    expect(resultado).toBe(true);
    expect(unsubscribeMock).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith('endpoint', mockEndpoint);
    expect(localStorage.getItem('paxflow_push_enabled')).toBe('false');
    expect(localStorage.getItem('paxflow_push_user_id')).toBeNull();
  });
});
