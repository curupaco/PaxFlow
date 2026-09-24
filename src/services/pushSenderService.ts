import { supabase } from './supabase';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export class PushSenderService {
  /**
   * Dispara uma notificação Push em segundo plano para o usuário no celular (mesmo com app fechado)
   * delegando a execução segura para a Edge Function 'send-push' do Supabase.
   */
  public static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!userId || !payload) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { userId, payload }
      });

      if (error) {
        console.warn('[PushSenderService] Aviso ao invocar Edge Function send-push:', error.message || error);
        return;
      }

      if (data && !data.success && data.message) {
        console.info('[PushSenderService]', data.message);
      }
    } catch (err) {
      console.warn('[PushSenderService] Erro ao disparar notificação Push:', err);
    }
  }
}

