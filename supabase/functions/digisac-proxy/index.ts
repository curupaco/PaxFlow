// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Trata preflight CORS do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('apikey');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado: token ausente' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, domain, token, number, text, serviceId } = body;

    if (!domain || !token) {
      return new Response(JSON.stringify({ error: 'Configurações do Digisac (domínio e token) são obrigatórias' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitiza o domínio do Digisac
    let cleanDomain = domain.trim().replace(/\/$/, '');
    if (cleanDomain.endsWith('/api/v1')) {
      cleanDomain = cleanDomain.slice(0, -7);
    } else if (cleanDomain.endsWith('/api/v1/')) {
      cleanDomain = cleanDomain.slice(0, -8);
    } else if (cleanDomain.endsWith('/api')) {
      cleanDomain = cleanDomain.slice(0, -4);
    }
    if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
      cleanDomain = 'https://' + cleanDomain;
    }

    const cleanNumber = String(number || '').replace(/\D/g, '');

    // Ação 1: Enviar Mensagem via Digisac API (Server-Side sem bloqueio CORS)
    if (action === 'sendMessage') {
      if (!cleanNumber || !text) {
        return new Response(JSON.stringify({ error: 'Número e texto da mensagem são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const url = `${cleanDomain}/api/v1/messages`;
      const payload: any = {
        text,
        number: cleanNumber,
        origin: 'bot',
        dontOpenTicket: true
      };
      if (serviceId) {
        payload.serviceId = serviceId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let resJson: any = {};
      try { resJson = JSON.parse(responseText); } catch (_) { resJson = { raw: responseText }; }

      if (!response.ok) {
        return new Response(JSON.stringify({ error: resJson.message || `Digisac HTTP ${response.status}`, details: resJson }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, data: resJson }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação 2: Buscar Histórico de Mensagens via Digisac API (Server-Side sem bloqueio CORS)
    if (action === 'getHistory') {
      if (!cleanNumber) {
        return new Response(JSON.stringify({ error: 'Número do cliente é obrigatório para carregar histórico' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 1. Localizar o contato pelo número de telefone no Digisac
      // A API do Digisac não filtra mensagens por telefone em /api/v1/messages diretamente (retorna aleatórias da agência).
      // É obrigatório localizar o contato via /api/v1/contacts e filtrar as mensagens por contactId.
      const searchDigits = cleanNumber.length >= 8 ? cleanNumber.slice(-8) : cleanNumber;
      const contactsUrl = `${cleanDomain}/api/v1/contacts?where[data.number][$iLike]=${encodeURIComponent(`%${searchDigits}%`)}&limit=10`;

      const contactsRes = await fetch(contactsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const contactsText = await contactsRes.text();
      let contactsJson: any = {};
      try { contactsJson = JSON.parse(contactsText); } catch (_) { contactsJson = { raw: contactsText }; }

      if (!contactsRes.ok) {
        return new Response(JSON.stringify({ error: contactsJson.message || `Digisac HTTP ${contactsRes.status}`, details: contactsJson }), {
          status: contactsRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const contactsList: any[] = Array.isArray(contactsJson) ? contactsJson : (contactsJson.data || []);

      if (contactsList.length === 0) {
        // Contato ainda não cadastrado no Digisac. Retorna histórico vazio com segurança.
        return new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Se houver mais de um contato retornado pela busca dos dígitos,
      // seleciona preferencialmente o mais exato ou do serviceId correspondente
      let selectedContact = contactsList[0];
      if (contactsList.length > 1) {
        const exactMatch = contactsList.find((c: any) => {
          const cNum = String(c.data?.number || c.number || '').replace(/\D/g, '');
          return cNum.includes(cleanNumber) || cleanNumber.includes(cNum);
        });
        if (exactMatch) {
          selectedContact = exactMatch;
        } else if (serviceId) {
          const serviceMatch = contactsList.find((c: any) => c.serviceId === serviceId);
          if (serviceMatch) selectedContact = serviceMatch;
        }
      }

      const contactId = selectedContact.id;
      if (!contactId) {
        return new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Buscar as mensagens específicas do contato identificado
      const messagesUrl = `${cleanDomain}/api/v1/messages?where[contactId]=${encodeURIComponent(contactId)}&limit=50`;
      const messagesRes = await fetch(messagesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const messagesText = await messagesRes.text();
      let messagesJson: any = {};
      try { messagesJson = JSON.parse(messagesText); } catch (_) { messagesJson = { raw: messagesText }; }

      if (!messagesRes.ok) {
        return new Response(JSON.stringify({ error: messagesJson.message || `Digisac HTTP ${messagesRes.status}`, details: messagesJson }), {
          status: messagesRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let messages: any[] = Array.isArray(messagesJson) ? messagesJson : (messagesJson.data || []);

      // Ordenar cronologicamente para a visualização correta do chat
      messages.sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });

      return new Response(JSON.stringify({ success: true, data: messages }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação 3: Testar Conexão com o Serviço do Digisac (Server-Side sem bloqueio CORS)
    if (action === 'testConnection') {
      if (!serviceId) {
        return new Response(JSON.stringify({ error: 'ID de Serviço é obrigatório para testar a conexão' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const url = `${cleanDomain}/api/v1/services/${serviceId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const responseText = await response.text();
      let resJson: any = {};
      try { resJson = JSON.parse(responseText); } catch (_) { resJson = { raw: responseText }; }

      if (!response.ok) {
        return new Response(JSON.stringify({ error: resJson.message || `Digisac HTTP ${response.status}`, details: resJson }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, data: resJson }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Ação inválida: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro interno no proxy Digisac' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
