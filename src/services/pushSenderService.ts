import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BGftIe5tKDG01vXBhlcEK7f98RS77TwrJdCZwVkWvnB3-Xwbiv6tUBXfAbnejr6-pfN_lNNHXRF_ZzVDguDsyrk';
const VAPID_PRIVATE_JWK = {
  kty: 'EC',
  crv: 'P-256',
  x: 'Z-0h7m0oMbTW9cGGVwQrt_3xFLvtPCsl0JnBWRa-cHc',
  y: '-Xwbiv6tUBXfAbnejr6-pfN_lNNHXRF_ZzVDguDsyrk',
  d: 'SQ4lX4WG7pNMhCMHzJ_nTkzlXBNI0b2KauDIdpIZFVc',
  ext: true
};

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let cachedPrivateKey: CryptoKey | null = null;

async function getVapidPrivateKey(): Promise<CryptoKey | null> {
  if (cachedPrivateKey) return cachedPrivateKey;
  try {
    const cryptoObj = window.crypto || (globalThis as any).crypto;
    if (!cryptoObj || !cryptoObj.subtle) return null;

    cachedPrivateKey = await cryptoObj.subtle.importKey(
      'jwk',
      VAPID_PRIVATE_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign']
    );
    return cachedPrivateKey;
  } catch (e) {
    console.warn('Erro ao importar chave privada VAPID:', e);
    return null;
  }
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateVapidHeader(endpointUrl: string): Promise<string | null> {
  try {
    const urlObj = new URL(endpointUrl);
    const audience = `${urlObj.protocol}//${urlObj.host}`;

    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = {
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: 'mailto:contato@paxflow.com.br'
    };

    const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
    const key = await getVapidPrivateKey();
    if (!key) return null;

    const encoder = new TextEncoder();
    const cryptoObj = window.crypto || (globalThis as any).crypto;

    const sigBuffer = await cryptoObj.subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      key,
      encoder.encode(unsignedToken)
    );

    const jwt = `${unsignedToken}.${arrayBufferToBase64Url(sigBuffer)}`;
    return `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;
  } catch (e) {
    console.warn('Erro ao gerar cabeçalho VAPID:', e);
    return null;
  }
}

export class PushSenderService {
  /**
   * Dispara uma notificação Push em segundo plano para o usuário no celular (mesmo com app fechado)
   */
  public static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!userId) return;

    // 1. Tenta invocar a Edge Function do Supabase (envio server-side livre de CORS)
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { userId, payload }
      });
      if (!error && data?.success) {
        return;
      }
    } catch (e) {
      // Ignora e continua para o fallback VAPID local
    }

    // 2. Fallback: Envio VAPID direto via client
    try {
      const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error || !subs || subs.length === 0) return;

      for (const sub of subs) {
        if (!sub.endpoint) continue;

        try {
          const vapidHeader = await generateVapidHeader(sub.endpoint);
          if (!vapidHeader) continue;

          await fetch(sub.endpoint, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Authorization': vapidHeader,
              'TTL': '86400',
              'Urgency': 'high'
            }
          });
        } catch (e) {
          // Erro silencioso em caso de restrição de navegador
        }
      }
    } catch (err) {
      console.warn('Aviso ao disparar Web Push:', err);
    }
  }
}
