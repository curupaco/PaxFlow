import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC_KEY = 'BGftIe5tKDG01vXBhlcEK7f98RS77TwrJdCZwVkWvnB3-Xwbiv6tUBXfAbnejr6-pfN_lNNHXRF_ZzVDguDsyrk';
const VAPID_PRIVATE_KEY = 'SQ4lX4WG7pNMhCMHzJ_nTkzlXBNI0b2KauDIdpIZFVc';

webpush.setVapidDetails(
  'mailto:contato@paxflow.com.br',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Busca todas as inscrições de dispositivo ativas do usuário
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
      if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;

      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        const pushPayloadStr = JSON.stringify({
          title: payload.title || 'PaxFlow',
          body: payload.body || 'Nova mensagem recebida',
          url: payload.url || '/#inbox'
        });

        const res = await webpush.sendNotification(pushSubscription, pushPayloadStr);
        results.push({ endpoint: sub.endpoint, status: res.statusCode });
      } catch (e: any) {
        // Se a inscrição expirou (410 Gone / 404 Not Found), remove do banco
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
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
