import { supabase } from './supabase';

// Chave pública VAPID válida padrão P-256 uncompressed EC public key (65 bytes, RFC 8292)
const VAPID_PUBLIC_KEY = 'BDl0ts9WHN3s9YEIfC-K8qrFXZDliWz97UuvX52zQfGrjolzANyj8XXwKlI7oeYAxrnSqBrGKiLkLVnYZ2X0OGQ';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class PushNotificationService {
  /**
   * Verifica se o navegador/aparelho atual suporta Notificações Push
   */
  public static isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Verifica se o aparelho é um dispositivo iOS (iPhone / iPad / iPod)
   */
  public static isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /**
   * Verifica se o app está rodando no modo PWA instalado (Standalone) no iOS/Android
   */
  public static isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    );
  }

  /**
   * Registra o Service Worker no navegador
   */
  public static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.warn('Erro ao registrar Service Worker do PaxFlow:', err);
      return null;
    }
  }

  /**
   * Obtém o status da permissão de notificação nativa
   */
  public static getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  /**
   * Solicita permissão e inscreve o celular para receber Web Push
   */
  public static async subscribeUser(userId: string): Promise<boolean> {
    if (!this.isSupported()) {
      if (this.isIOS() && !this.isStandalone()) {
        throw new Error('No iOS, as Notificações Push exigem que você adicione o PaxFlow à Tela de Início (Compartilhar > Adicionar à Tela de Início).');
      }
      throw new Error('Seu navegador ou dispositivo não possui suporte a Notificações Push.');
    }

    // Solicita permissão primeiro durante a interação do usuário para compatibilidade com iOS WebKit
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permissão de notificação negada no seu aparelho.');
    }

    const reg = await this.registerServiceWorker();
    if (!reg) {
      throw new Error('Não foi possível registrar o Service Worker no seu celular.');
    }

    try {
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey.buffer as ArrayBuffer
        });
      }

      const subJson = sub.toJSON();
      const endpoint = sub.endpoint;
      const p256dh = subJson.keys?.p256dh || '';
      const auth = subJson.keys?.auth || '';

      if (!endpoint || !p256dh || !auth) {
        throw new Error('Chaves de notificação inválidas geradas pelo navegador.');
      }

      // Persiste a inscrição no Supabase na tabela push_subscriptions
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            endpoint: endpoint,
            p256dh: p256dh,
            auth: auth,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'endpoint' }
        );

      if (error) {
        console.warn('Aviso ao salvar push_subscriptions no Supabase:', error.message);
      }

      localStorage.setItem('paxflow_push_enabled', 'true');
      return true;
    } catch (err: any) {
      console.error('Erro ao inscrever para Web Push:', err);
      if (err.message && err.message.includes('applicationServerKey')) {
        throw new Error('Erro nas chaves de notificação P-256 do dispositivo. Tente novamente.');
      }
      throw err;
    }
  }

  /**
   * Cancela a inscrição de notificações push neste aparelho
   */
  public static async unsubscribeUser(userId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        // Remove do Supabase
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
      localStorage.setItem('paxflow_push_enabled', 'false');
      return true;
    } catch (err) {
      console.error('Erro ao cancelar notificação push:', err);
      return false;
    }
  }

  /**
   * Verifica se as notificações push já estão ativas para este usuário
   */
  public static async isSubscribed(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return !!sub && Notification.permission === 'granted';
    } catch (e) {
      return false;
    }
  }

  /**
   * Pede permissão de notificação automaticamente apenas na primeira vez no dispositivo (Android, iOS e Web)
   */
  public static async checkAndPromptAutoPermission(userId: string): Promise<void> {
    if (!userId || !this.isSupported()) return;

    const alreadyPrompted = localStorage.getItem('paxflow_auto_push_prompted');
    if (alreadyPrompted === 'true') return;

    // Marca imediatamente no localStorage para não repetir a solicitação automática
    localStorage.setItem('paxflow_auto_push_prompted', 'true');

    try {
      const permStatus = this.getPermissionStatus();
      if (permStatus === 'granted' || permStatus === 'default') {
        await this.subscribeUser(userId);
      }
    } catch (err) {
      console.info('Solicitação automática de notificação push finalizada:', err);
    }
  }
}


