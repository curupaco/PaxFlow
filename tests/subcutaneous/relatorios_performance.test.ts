import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelatoriosPage } from '../../src/pages/Relatorios';
import { supabase } from '../../src/services/supabase';
import { InboxService } from '../../src/services/inboxService';

vi.mock('../../src/services/supabase', () => {
  const queryBuilderMock: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data: [], error: null }))
  };

  return {
    supabase: {
      from: vi.fn(() => ({ ...queryBuilderMock }))
    },
    getSessaoAtual: vi.fn().mockResolvedValue({
      user: { id: 'consultor-1', email: 'consultor@agencia.com' },
      perfil: { id: 'consultor-1', nome: 'Consultor Teste', role: 'consultor' },
      error: null
    })
  };
});

vi.mock('../../src/services/inboxService', () => ({
  InboxService: {
    loadAndBuildAlerts: vi.fn().mockResolvedValue([])
  }
}));

describe('Relatórios - Testes Subcutâneos de Performance e Arquitetura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve aplicar corte temporal de competência e projeção cirúrgica de colunas ao carregar dados', async () => {
    // Setup
    const container = { innerHTML: '' } as any;
    const page = new RelatoriosPage(container);
    (page as any).user = { id: 'admin-1' };
    (page as any).perfil = { id: 'admin-1', role: 'admin' };

    // Action
    await (page as any).loadData('2026-06-01', '2026-06-30');

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('viagens');
    expect(supabase.from).toHaveBeenCalledWith('orcamentos');
    expect(supabase.from).toHaveBeenCalledWith('clientes');
    expect((page as any).estaPeriodoEmCache('2026-06-01', '2026-06-30')).toBe(true);
  });

  it('deve utilizar cache de competência em memória evitando consultas redundantes à rede quando o período já estiver carregado', async () => {
    // Setup
    const container = { innerHTML: '' } as any;
    const page = new RelatoriosPage(container);
    (page as any).user = { id: 'admin-1' };
    (page as any).perfil = { id: 'admin-1', role: 'admin' };
    await (page as any).loadData('2026-01-01', '2026-12-31');
    const chamadasIniciais = vi.mocked(supabase.from).mock.calls.length;

    // Action
    // Chama novamente para um mês contido no ano de 2026
    await (page as any).loadData('2026-05-01', '2026-05-31');

    // Assert
    expect((page as any).estaPeriodoEmCache('2026-05-01', '2026-05-31')).toBe(true);
    expect(vi.mocked(supabase.from).mock.calls.length).toBe(chamadasIniciais);
  });

  it('deve desacoplar alertas pesados da Inbox na aba comercial padrão (desempenho)', async () => {
    // Setup
    const container = { innerHTML: '' } as any;
    const page = new RelatoriosPage(container);
    (page as any).user = { id: 'admin-1' };
    (page as any).perfil = { id: 'admin-1', role: 'admin' };
    (page as any).activeTab = 'desempenho';

    // Action
    await (page as any).loadData('2026-01-01', '2026-12-31');

    // Assert
    expect(InboxService.loadAndBuildAlerts).not.toHaveBeenCalled();
  });

  it('deve interceptar erro de schema (código 42703) alertando o operador com transparência sem carregar dados fictícios', async () => {
    // Setup
    const container = { innerHTML: '' } as any;
    const page = new RelatoriosPage(container);
    (page as any).user = { id: 'admin-1' };
    (page as any).perfil = { id: 'admin-1', role: 'admin' };

    const showToastSpy = vi.spyOn(page as any, 'showToast').mockImplementation(() => {});

    vi.mocked(supabase.from).mockImplementation((table: string): any => {
      if (table === 'viagens') {
        return {
          select: vi.fn(() => ({
            or: vi.fn().mockReturnThis(),
            then: vi.fn((_resolve: any, reject: any) => reject({
              code: '42703',
              message: 'column "percentual_rav" does not exist'
            }))
          }))
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: [], error: null }))
      };
    });

    // Action
    await (page as any).loadData('2026-01-01', '2026-12-31');

    // Assert
    expect(showToastSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro de schema no banco de dados'),
      'error'
    );
    expect((page as any).viagens).toEqual([]);
    expect((page as any).orcamentos).toEqual([]);
  });
});
