import { supabase } from './supabase';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export class PushSenderService {
  /**
   * Dispara uma notificação Push em segundo plano para o usuário no celular
   */
  public static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!userId) return;

    try {
      // Busca todas as inscrições registradas para este usuário no banco de dados
      const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error || !subs || subs.length === 0) return;

      // Dispara as requisições em lote para os aparelhos do usuário
      for (const sub of subs) {
        try {
          await fetch('/api/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth
                }
              },
              payload
            })
          });
        } catch (e) {
          // Silencioso em caso de indisponibilidade momentânea
        }
      }
    } catch (err) {
      console.warn('Aviso ao disparar Web Push:', err);
    }
  }
}
