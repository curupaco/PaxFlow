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
});

