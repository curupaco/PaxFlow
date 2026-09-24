import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PushSenderService } from '../../src/services/pushSenderService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('PushNotification & PushSender - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve abortar envio silenciosamente se o userId for nulo ou vazio', async () => {
    // Setup
    const payload = { title: 'Nova Mensagem', body: 'Conteúdo' };

    // Action
    await PushSenderService.sendToUser('', payload);

    // Assert
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('deve acionar a Edge Function send-push do Supabase com o payload formatado', async () => {
    // Setup
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true },
      error: null,
    } as any);

    const payload = {
      title: 'Alerta Operacional',
      body: 'Documento pendente de emissão.',
      url: '/inbox',
    };

    // Action
    await PushSenderService.sendToUser('user-alvo-1', payload);

    // Assert
    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push', {
      body: {
        userId: 'user-alvo-1',
        payload,
      },
    });
  });

  it('deve tratar falha da Edge Function de forma defensiva sem quebrar a execução', async () => {
    // Setup
    vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Edge function indisponível'));
    const payload = { title: 'Aviso Importante', body: 'Mensagem de fallback' };

    // Action & Assert
    await expect(PushSenderService.sendToUser('user-alvo-1', payload)).resolves.not.toThrow();
    expect(supabase.functions.invoke).toHaveBeenCalled();
  });
});
