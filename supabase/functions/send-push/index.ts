import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const VAPID_PUBLIC_KEY = 'BGftIe5tKDG01vXBhlcEK7f98RS77TwrJdCZwVkWvnB3-Xwbiv6tUBXfAbnejr6-pfN_lNNHXRF_ZzVDguDsyrk';
const VAPID_PRIVATE_JWK = {
  kty: 'EC',
  crv: 'P-256',
  x: 'Z-0h7m0oMbTW9cGGVwQrt_3xFLvtPCsl0JnBWRa-cHc',
  y: '-Xwbiv6tUBXfAbnejr6-pfN_lNNHXRF_ZzVDguDsyrk',
  d: 'SQ4lX4WG7pNMhCMHzJ_nTkzlXBNI0b2KauDIdpIZFVc',
  ext: true
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateVapidHeader(endpointUrl: string): Promise<string> {
  const urlObj = new URL(endpointUrl);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: 'mailto:contato@paxflow.com.br'
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  
  const key = await crypto.subtle.importKey(
    'jwk',
    VAPID_PRIVATE_JWK,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );

  const encoder = new TextEncoder();
  const sigBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    key,
    encoder.encode(unsignedToken)
  );

  const jwt = `${unsignedToken}.${arrayBufferToBase64Url(sigBuffer)}`;
  return `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, payload } = await req.json();

    if (!userId || !payload) {
      return new Response(JSON.stringify({ error: 'userId e payload são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Busca todas as inscrições do usuário
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error || !subs || subs.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma inscrição encontrada para o usuário', userId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    for (const sub of subs) {
      if (!sub.endpoint) continue;

      try {
        const vapidHeader = await generateVapidHeader(sub.endpoint);
        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': vapidHeader,
            'TTL': '86400',
            'Urgency': 'high'
          }
        });

        // Se o endpoint respondeu 410 Gone ou 404 Not Found, limpa a inscrição expirada
        if (res.status === 410 || res.status === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }

        results.push({ endpoint: sub.endpoint, status: res.status });
      } catch (e: any) {
        results.push({ endpoint: sub.endpoint, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
