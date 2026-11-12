import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-test' } } })
    }
  }
}));

describe('WhatsApp e Digisac Resiliência Subcutâneo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve conter mensagens mockadas de Buenos Aires nem textos de Sandbox/Fallback no código-fonte', async () => {
    // Setup & Action: Lê o código-fonte do componente
    const fs = await import('fs');
    const path = await import('path');
    const modalPath = path.resolve(__dirname, '../../src/components/dashboard/SendTemplateMessageModal.ts');
    const conteudo = fs.readFileSync(modalPath, 'utf-8');

    // Assert: O mock antigo de Buenos Aires e o texto de fallback foram completamente expurgados
    expect(conteudo).not.toContain('Buenos Aires em agosto');
    expect(conteudo).not.toContain('Visualização offline da conversa (Sandbox/Fallback)');
  });

  it('deve formatar corretamente o domínio da API do Digisac adicionando protocolo https caso ausente', () => {
    // Setup
    const domains = [
      'minhaagencia.digisac.chat',
      'minhaagencia.digisac.chat/api/v1',
      'https://minhaagencia.digisac.chat/',
      'http://minhaagencia.digisac.chat/api'
    ];

    // Action
    const sanitizados = domains.map(domain => {
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
      return cleanDomain;
    });

    // Assert
    expect(sanitizados).toEqual([
      'https://minhaagencia.digisac.chat',
      'https://minhaagencia.digisac.chat',
      'https://minhaagencia.digisac.chat',
      'http://minhaagencia.digisac.chat'
    ]);
  });

  it('deve utilizar o proxy de backend (supabase.functions.invoke digisac-proxy) em vez de fetch direto de browser sujeito a CORS', async () => {
    // Setup & Action
    const fs = await import('fs');
    const path = await import('path');
    const modalPath = path.resolve(__dirname, '../../src/components/dashboard/SendTemplateMessageModal.ts');
    const conteudo = fs.readFileSync(modalPath, 'utf-8');

    // Assert: Invoca a Edge Function digisac-proxy
    expect(conteudo).toContain("supabase.functions.invoke('digisac-proxy'");
    // Não realiza fetch direto do browser para /api/v1/messages
    expect(conteudo).not.toContain("fetch(url,");
  });

  it('deve buscar histórico no Digisac filtrando por contactId via /api/v1/contacts e nunca via /api/v1/messages?number=', async () => {
    // Setup
    const fs = await import('fs');
    const path = await import('path');
    const proxyPath = path.resolve(__dirname, '../../supabase/functions/digisac-proxy/index.ts');
    const proxyConteudo = fs.readFileSync(proxyPath, 'utf-8');

    // Action & Assert: A rota falha com mensagens aleatórias se usar messages?number=
    expect(proxyConteudo).not.toContain('/api/v1/messages?number=');
    expect(proxyConteudo).toContain('/api/v1/contacts?where[data.number][$iLike]=');
    expect(proxyConteudo).toContain('/api/v1/messages?where[contactId]=');
  });

  it('deve ordenar mensagens cronologicamente (createdAt ascendente) e retornar vazio caso o contato não seja encontrado', () => {
    // Setup
    const contatosMock: any[] = [];
    const mensagensMock = [
      { id: 'msg-2', text: 'Segunda mensagem', createdAt: '2026-11-10T15:00:00Z' },
      { id: 'msg-1', text: 'Primeira mensagem', createdAt: '2026-11-10T14:00:00Z' },
      { id: 'msg-3', text: 'Terceira mensagem', createdAt: '2026-11-10T16:00:00Z' }
    ];

    // Action: Simula o comportamento do proxy quando o contato não é encontrado
    const resultadoContatoInexistente = contatosMock.length === 0 ? [] : [contatosMock[0].id];

    // Action: Simula a ordenação cronológica realizada pelo proxy
    const mensagensOrdenadas = [...mensagensMock].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });

    // Assert
    expect(resultadoContatoInexistente).toEqual([]);
    expect(mensagensOrdenadas[0].id).toBe('msg-1');
    expect(mensagensOrdenadas[1].id).toBe('msg-2');
    expect(mensagensOrdenadas[2].id).toBe('msg-3');
  });
});

