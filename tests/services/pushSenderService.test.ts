import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PushSenderService } from '../../src/services/pushSenderService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('PushSenderService - Testes Subcutâneos (Segurança e Delegação)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve disparar se userId ou payload for vazio ou indefinido', async () => {
    // Setup
    const payload = { title: 'Aviso', body: 'Mensagem teste' };

    // Action
    await PushSenderService.sendToUser('', payload);
    await PushSenderService.sendToUser('user-123', null as any);

    // Assert
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('deve disparar envio seguro via Edge Function send-push', async () => {
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
  });

  it('deve tratar erros de invocação da Edge Function de forma defensiva sem quebrar a aplicação', async () => {
    // Setup
    const userId = 'user-uuid-456';
    const payload = { title: 'Alerta', body: 'Verifique a escala de hoje' };
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: { message: 'Edge function temporariamente indisponível' }
    } as any);

    // Action & Assert
    await expect(PushSenderService.sendToUser(userId, payload)).resolves.not.toThrow();
    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push', {
      body: { userId, payload }
    });
  });

  it('deve capturar exceções de rede inesperadas sem propagar falha para o chamador', async () => {
    // Setup
    const userId = 'user-sem-rede';
    const payload = { title: 'Teste', body: 'Sem conexão' };
    vi.mocked(supabase.functions.invoke).mockRejectedValueOnce(new Error('Falha de rede / Timeout'));

    // Action & Assert
    await expect(PushSenderService.sendToUser(userId, payload)).resolves.not.toThrow();
    expect(supabase.functions.invoke).toHaveBeenCalled();
  });
});
