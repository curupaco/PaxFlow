import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InboxService } from '../../src/services/inboxService';
import { supabase } from '../../src/services/supabase';
import { createSupabaseQueryMock as createQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/pushSenderService', () => ({
  PushSenderService: {
    sendToUser: vi.fn().mockResolvedValue({ success: true })
  }
}));

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } } })
      }
    }
  };
});

describe('Inbox - Testes Subcutâneos de Performance e Arquitetura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve disparar consultas independentes em bloco paralelo via Promise.all sem cascata bloqueante', async () => {
    // Setup
    const user = { id: 'admin-123' };
    const perfil = { id: 'admin-123', role: 'admin', nome: 'Admin PaxFlow' } as any;

    const tablesCalled: string[] = [];
    (supabase.from as any).mockImplementation((table: string) => {
      tablesCalled.push(table);
      if (table === 'profiles') {
        return createQueryMock([{ id: 'admin-123', nome: 'Admin PaxFlow' }]);
      }
      if (table === 'clientes') {
        return createQueryMock([]);
      }
      if (table === 'viagens') {
        return createQueryMock([]);
      }
      if (table === 'lembretes') {
        return createQueryMock([]);
      }
      if (table === 'reembolsos') {
        return createQueryMock([]);
      }
      if (table === 'notificacoes') {
        return createQueryMock([]);
      }
      if (table === 'mensagens_diretas') {
        return createQueryMock([]);
      }
      if (table === 'campaigns') {
        return createQueryMock([]);
      }
      return createQueryMock([]);
    });

    // Action
    const inicio = Date.now();
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, 15);
    const duracao = Date.now() - inicio;

    // Assert
    expect(Array.isArray(alerts)).toBe(true);
    expect(tablesCalled).toContain('profiles');
    expect(tablesCalled).toContain('clientes');
    expect(tablesCalled).toContain('viagens');
    expect(tablesCalled).toContain('lembretes');
    expect(tablesCalled).toContain('reembolsos');
    expect(duracao).toBeLessThan(1000);
  });

  it('deve realizar consulta cirúrgica indexada de passaportes com restrição lte eliminando varredura irrestrita', async () => {
    // Setup
    const user = { id: 'consultor-456' };
    const perfil = { id: 'consultor-456', role: 'consultor', nome: 'Consultor Vendas' } as any;

    let clientesQueryBuilder: any = null;
    (supabase.from as any).mockImplementation((table: string) => {
      const q = createQueryMock([]);
      if (table === 'clientes') {
        clientesQueryBuilder = q;
      }
      return q;
    });

    // Action
    await InboxService.loadAndBuildAlerts(user, perfil, 15);

    // Assert
    expect(clientesQueryBuilder).toBeDefined();
    expect(clientesQueryBuilder.not).toHaveBeenCalledWith('passaporte_validade', 'is', null);
    expect(clientesQueryBuilder.lte).toHaveBeenCalled();
    expect(clientesQueryBuilder.eq).toHaveBeenCalledWith('consultor_responsavel_id', 'consultor-456');
  });

  it('deve aplicar janela operacional de viagens com filtro temporal e de consultor responsável', async () => {
    // Setup
    const user = { id: 'consultor-789' };
    const perfil = { id: 'consultor-789', role: 'consultor', nome: 'Consultor Operacional' } as any;

    let viagensQueryBuilder: any = null;
    (supabase.from as any).mockImplementation((table: string) => {
      const q = createQueryMock([]);
      if (table === 'viagens') {
        viagensQueryBuilder = q;
      }
      return q;
    });

    // Action
    await InboxService.loadAndBuildAlerts(user, perfil, 15);

    // Assert
    expect(viagensQueryBuilder).toBeDefined();
    expect(viagensQueryBuilder.not).toHaveBeenCalledWith('status', 'eq', 'cancelada');
    expect(viagensQueryBuilder.or).toHaveBeenCalled();
  });

  it('deve consultar alertas lidos no Supabase e compilar chaves sintéticas corretamente', async () => {
    // Setup
    const userId = 'user-test-777';
    const alertId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'notificacoes') {
        return createQueryMock([
          { id: 'notif-1', item_id: alertId, parent_id: alertId }
        ]);
      }
      return createQueryMock([]);
    });

    // Action
    const readAlerts = await InboxService.getReadAlerts(userId);

    // Assert
    expect(readAlerts).toContain(`passport-${alertId}`);
    expect(readAlerts).toContain(`refund-${alertId}`);
    expect(readAlerts).toContain(`pre-embarque-${alertId}`);
    expect(readAlerts).toContain(`pos-viagem-nps-${alertId}`);
  });
});

