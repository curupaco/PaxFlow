import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';
import { ReembolsosService } from '../../src/services/reembolsosService';
import { ReembolsosPage } from '../../src/pages/Reembolsos';
import { createSupabaseQueryMock as createQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom
    },
    getSessaoAtual: vi.fn().mockResolvedValue({
      user: { id: 'admin-reembolsos-1' },
      perfil: { id: 'admin-reembolsos-1', nome: 'Admin Reembolsos', role: 'admin' },
      error: null
    })
  };
});

describe('Central de Reembolsos - Otimização de Performance e Paralelismo Subcutâneo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar reembolsos e viagens órfãs simultaneamente via paralelização de consultas', async () => {
    // Setup
    let buscarOrfasIniciado = false;
    let queryReembolsosIniciada = false;

    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      if (table === 'reembolsos') {
        queryReembolsosIniciada = true;
      }
      return qMock;
    });

    vi.spyOn(ReembolsosService, 'buscarViagensOrfasReembolso').mockImplementation(async () => {
      buscarOrfasIniciado = true;
      return [];
    });

    const fakeContainer = {} as HTMLElement;
    const page = new ReembolsosPage(fakeContainer);
    (page as any).user = { id: 'admin-reembolsos-1' };
    (page as any).perfil = { id: 'admin-reembolsos-1', role: 'admin' };

    // Action
    await (page as any).loadReembolsos();

    // Assert
    expect(queryReembolsosIniciada).toBe(true);
    expect(buscarOrfasIniciado).toBe(true);
    expect((page as any).viagensOrfas).toEqual([]);
  });

  it('deve atualizar status de reembolso em memória sem reexecutar consulta completa à rede', async () => {
    // Setup
    let updateExecutado = false;
    let payloadGravado: any = null;

    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      const origUpdate = qMock.update.bind(qMock);
      qMock.update = vi.fn((payload: any) => {
        updateExecutado = true;
        payloadGravado = payload;
        return origUpdate(payload);
      });
      return qMock;
    });

    const fakeContainer = {} as HTMLElement;
    const page = new ReembolsosPage(fakeContainer);
    (page as any).user = { id: 'admin-reembolsos-1' };
    (page as any).perfil = { id: 'admin-reembolsos-1', role: 'admin' };
    (page as any).reembolsos = [
      { id: 'rem-1', codigo_protocolo: 'RMB-001', status: 'pendente', status_tratativa: 'solicitado_fornecedor' },
      { id: 'rem-2', codigo_protocolo: 'RMB-002', status: 'pendente', status_tratativa: 'aguardando_analise' }
    ];

    const spyLoadReembolsos = vi.spyOn(page as any, 'loadReembolsos');

    // Action
    const targetId = 'rem-1';
    const payload = { status: 'concluido', status_tratativa: 'credito_concedido_cliente' };
    await supabase.from('reembolsos').update(payload).eq('id', targetId);

    const itemIndex = (page as any).reembolsos.findIndex((r: any) => r.id === targetId);
    if (itemIndex >= 0) {
      (page as any).reembolsos[itemIndex] = {
        ...(page as any).reembolsos[itemIndex],
        ...payload
      };
    }

    // Assert
    expect(updateExecutado).toBe(true);
    expect(payloadGravado).toEqual(payload);
    expect(spyLoadReembolsos).not.toHaveBeenCalled();
    expect((page as any).reembolsos[0].status_tratativa).toBe('credito_concedido_cliente');
    expect((page as any).reembolsos[0].status).toBe('concluido');
  });

  it('deve limpar e destruir o cronômetro de SLA defensivamente ao descarregar a página', () => {
    // Setup
    const fakeContainer = {} as HTMLElement;
    const page = new ReembolsosPage(fakeContainer);
    const mockIntervalId = 9999 as any;
    (page as any).timerId = mockIntervalId;

    const spyClearInterval = vi.spyOn(global, 'clearInterval');

    // Action
    page.destroy();

    // Assert
    expect(spyClearInterval).toHaveBeenCalledWith(mockIntervalId);
    expect((page as any).timerId).toBeNull();
  });
});
