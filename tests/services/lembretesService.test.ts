import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InboxService } from '../../src/services/inboxService';
import { OrcamentosService } from '../../src/services/orcamentosService';
import { supabase } from '../../src/services/supabase';
import { createSupabaseQueryMock as createQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/pushSenderService', () => ({
  PushSenderService: {
    sendToUser: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
    getSessaoAtual: vi.fn(),
    logoutConsultor: vi.fn(),
  };
});

describe('Lembretes e Resolução de Passageiro - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve resolver corretamente o nome do passageiro titular da viagem em vez de Cliente Viagem', async () => {
    // Setup
    const user = { id: 'consultor-1' };
    const perfil = { id: 'consultor-1', nome: 'Consultor Titular', role: 'consultor' };

    const lembreteViagem = {
      id: 'lem-1',
      viagem_id: 'viagem-100',
      consultor_id: 'consultor-1',
      criador_id: 'consultor-1',
      data_lembrete: '2026-10-20',
      periodo: 'tarde',
      descricao: 'Verificar emissão de passagens executivas',
      arquivado: false,
      created_at: '2026-09-22T10:00:00Z',
      viagem: {
        id: 'viagem-100',
        destino: 'Paris',
        cliente_id: 'cli-100',
        cliente: {
          id: 'cli-100',
          nome: 'Maria Fernandes da Silva',
        },
      },
      consultor: {
        id: 'consultor-1',
        nome: 'Consultor Titular',
      },
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'lembretes') return createQueryMock([lembreteViagem]);
      if (table === 'profiles') return createQueryMock([perfil]);
      return createQueryMock([]);
    });

    // Action
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, 3);
    const lembreteAlert = alerts.find(a => a.id === 'manual-lem-1');

    // Assert
    expect(lembreteAlert).toBeDefined();
    expect(lembreteAlert?.subject).toBe('Verificar emissão de passagens executivas');
    expect(lembreteAlert?.body).toContain('Maria Fernandes da Silva');
    expect(lembreteAlert?.body).not.toContain('Cliente Viagem');
    expect(lembreteAlert?.body).toContain('📝 Descrição do Lembrete:');
  });

  it('deve usar o nome do orçamento e fallback quando não houver descrição personalizada', async () => {
    // Setup
    const user = { id: 'consultor-1' };
    const perfil = { id: 'consultor-1', nome: 'Consultor Titular', role: 'consultor' };

    const lembreteOrcamento = {
      id: 'lem-2',
      orcamento_id: 'orc-200',
      consultor_id: 'consultor-1',
      criador_id: 'consultor-1',
      data_lembrete: '2026-11-05',
      periodo: 'manha',
      descricao: null,
      arquivado: false,
      created_at: '2026-09-22T10:00:00Z',
      orcamento: {
        id: 'orc-200',
        nome_cliente: 'João Carlos Pereira',
        destino: 'Roma',
      },
      consultor: {
        id: 'consultor-1',
        nome: 'Consultor Titular',
      },
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'lembretes') return createQueryMock([lembreteOrcamento]);
      if (table === 'profiles') return createQueryMock([perfil]);
      return createQueryMock([]);
    });

    // Action
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, 3);
    const alert = alerts.find(a => a.id === 'manual-lem-2');

    // Assert
    expect(alert).toBeDefined();
    expect(alert?.subject).toBe('Você cadastrou um alerta sobre o orçamento de [João Carlos Pereira - Roma].');
    expect(alert?.body).toContain('João Carlos Pereira - Roma');
  });

  it('deve enviar mensagem direta com lembrete e descrição tratando schema drift 42703', async () => {
    // Setup
    const lembreteInsertMock = vi.fn()
      .mockResolvedValueOnce({ error: { code: '42703', message: 'column descricao does not exist' } })
      .mockResolvedValueOnce({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'mensagens_diretas') {
        const mock = createQueryMock({
          id: 'msg-1',
          assunto: 'Urgente: Confirmar Voo',
          conteudo: 'Favor confirmar com o passageiro',
        });
        mock.insert = vi.fn(() => mock);
        return mock;
      }
      if (table === 'notificacoes') {
        const mock = createQueryMock([{ id: 'notif-1', user_id: 'user-dest' }]);
        mock.insert = vi.fn(() => mock);
        return mock;
      }
      if (table === 'lembretes') {
        const mock = createQueryMock([]);
        mock.insert = lembreteInsertMock;
        return mock;
      }
      return createQueryMock([]);
    });

    // Action
    const result = await InboxService.sendDirectMessage({
      remetenteId: 'user-remetente',
      senderNome: 'Consultor Emissor',
      recipients: ['user-dest'],
      assunto: 'Urgente: Confirmar Voo',
      conteudo: 'Favor confirmar com o passageiro',
      lembrete: {
        dataLembrete: '2026-10-25',
        periodo: 'tarde',
        descricao: 'Confirmar poltronas do voo',
        orcamentoId: 'orc-123',
      },
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe('msg-1');
    expect(lembreteInsertMock).toHaveBeenCalledTimes(2);
    expect(lembreteInsertMock).toHaveBeenNthCalledWith(1, [
      {
        orcamento_id: 'orc-123',
        viagem_id: null,
        consultor_id: 'user-dest',
        criador_id: 'user-remetente',
        data_lembrete: '2026-10-25',
        periodo: 'tarde',
        descricao: 'Confirmar poltronas do voo',
        arquivado: false,
      },
    ]);
    expect(lembreteInsertMock).toHaveBeenNthCalledWith(2, [
      {
        orcamento_id: 'orc-123',
        viagem_id: null,
        consultor_id: 'user-dest',
        criador_id: 'user-remetente',
        data_lembrete: '2026-10-25',
        periodo: 'tarde',
        arquivado: false,
      },
    ]);
  });
});
