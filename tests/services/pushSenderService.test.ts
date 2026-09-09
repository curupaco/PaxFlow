import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PushSenderService } from '../../src/services/pushSenderService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn()
  }
}));

describe('PushSenderService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve disparar se userId for vazio ou indefinido', async () => {
    // Setup
    const payload = { title: 'Aviso', body: 'Mensagem teste' };

    // Action
    await PushSenderService.sendToUser('', payload);

    // Assert
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('deve priorizar o envio via Edge Function do Supabase se bem-sucedido', async () => {
    // Setup
    const userId = 'user-uuid-123';
    const payload = { title: 'Nova Notificação', body: 'Você tem um novo orçamento', url: '/orcamentos' };
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { success: true },
      error: null
    } as any);

    // Action
    await PushSenderService.sendToUser(userId, payload);

    // Assert
    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push', {
      body: { userId, payload }
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('deve executar fallback consultando push_subscriptions se Edge Function falhar', async () => {
    // Setup
    const userId = 'user-uuid-456';
    const payload = { title: 'Alerta', body: 'Verifique a escala de hoje' };
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error('Edge function indisponível')
    } as any);

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValueOnce({
      data: [
        { id: 'sub-1', user_id: userId, endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token' }
      ],
      error: null
    });

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: mockSelect,
      eq: mockEq
    } as any);

    // Action
    await PushSenderService.sendToUser(userId, payload);

    // Assert
    expect(supabase.functions.invoke).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
  });

  it('deve encerrar silenciosamente se usuário não possuir inscrições registradas', async () => {
    // Setup
    const userId = 'user-sem-sub';
    const payload = { title: 'Teste', body: 'Sem destinatário' };
    vi.mocked(supabase.functions.invoke).mockRejectedValueOnce(new Error('Falha de rede'));

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValueOnce({
      data: [],
      error: null
    });

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: mockSelect,
      eq: mockEq
    } as any);

    // Action
    await PushSenderService.sendToUser(userId, payload);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
  });
});
