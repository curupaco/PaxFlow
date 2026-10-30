import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InboxService } from '../../src/services/inboxService';
import { supabase } from '../../src/services/supabase';
import { createSupabaseQueryMock as createQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-user-id' } } })
      }
    }
  };
});

describe('PaxFlow Risk Score - Alertas Proativos de Viagens em Risco Crítico no Inbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve gerar alerta com subject e body detalhados para viagem confirmada com partida em 5 dias e score 45/100', async () => {
    // Setup
    const user = { id: 'admin-user-id', role: 'admin' };
    const perfil = { id: 'admin-user-id', nome: 'Admin PaxFlow', role: 'admin' as const, email: 'admin@paxflow.com', ativo: true };

    const dataEmbarque = new Date();
    dataEmbarque.setDate(dataEmbarque.getDate() + 5);

    const mockViagens = [
      {
        id: 'viagem-critica-1',
        cliente_id: 'cli-1',
        cliente: { id: 'cli-1', nome: 'Gabriel Medina' },
        destino: 'Miami e Orlando',
        data_ida: dataEmbarque.toISOString().split('T')[0],
        status: 'CONFIRMADA',
        score_risco: 45,
        consultor_id: 'admin-user-id'
      }
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return createQueryMock(mockViagens);
      }
      return createQueryMock([]);
    });

    // Action
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, 15);

    // Assert
    const alertaRisco = alerts.find(a => a.id === 'risk-alerta-viagem-critica-1');
    expect(alertaRisco).toBeDefined();
    expect(alertaRisco?.type).toBe('risk_alerta');
    expect(alertaRisco?.title).toContain('PaxFlow Risk Score™');
    expect(alertaRisco?.subject).toContain('45/100');
    expect(alertaRisco?.subject).toContain('Gabriel Medina');
    expect(alertaRisco?.body).toContain('Score Operacional');
  });

  it('não deve gerar alerta de risco para viagem com score seguro (>= 60)', async () => {
    // Setup
    const user = { id: 'admin-user-id', role: 'admin' };
    const perfil = { id: 'admin-user-id', nome: 'Admin PaxFlow', role: 'admin' as const, email: 'admin@paxflow.com', ativo: true };

    const dataEmbarque = new Date();
    dataEmbarque.setDate(dataEmbarque.getDate() + 4);

    const mockViagens = [
      {
        id: 'viagem-segura-2',
        cliente_id: 'cli-2',
        cliente: { id: 'cli-2', nome: 'Laura Müller' },
        destino: 'Porto Seguro',
        data_ida: dataEmbarque.toISOString().split('T')[0],
        status: 'CONFIRMADA',
        score_risco: 90,
        consultor_id: 'admin-user-id'
      }
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return createQueryMock(mockViagens);
      }
      return createQueryMock([]);
    });

    // Action
    const alerts = await InboxService.loadAndBuildAlerts(user, perfil, 15);

    // Assert
    const alertaRisco = alerts.find(a => a.id === 'risk-alerta-viagem-segura-2');
    expect(alertaRisco).toBeUndefined();
  });
});
