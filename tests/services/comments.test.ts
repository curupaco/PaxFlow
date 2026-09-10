import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentsService } from '../../src/services/comments';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../src/services/pushSenderService', () => ({
  PushSenderService: {
    sendToUser: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('CommentsService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve registrar log de auditoria de atendimento presencial nos comentários de viagem', async () => {
    // Setup
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    // Action
    const resultado = await CommentsService.registrarLogAtendimentoBalcao(
      'viagem',
      'viagem-123',
      'Roberto Co-Piloto',
      'user-copiloto-id'
    );

    // Assert
    expect(resultado).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('comentarios');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_item: 'viagem',
        item_id: 'viagem-123',
        autor_id: 'user-copiloto-id',
        texto: expect.stringContaining('Atendimento Presencial / Balcão: Item acessado por Roberto Co-Piloto'),
      })
    );
  });

  it('deve registrar log de auditoria de atendimento presencial nos comentários de orçamento', async () => {
    // Setup
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    // Action
    const resultado = await CommentsService.registrarLogAtendimentoBalcao(
      'orcamento',
      'orc-555',
      'Marinna Consultora',
      'user-marinna-id'
    );

    // Assert
    expect(resultado).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('comentarios');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_item: 'orcamento',
        item_id: 'orc-555',
        autor_id: 'user-marinna-id',
        texto: expect.stringContaining('Atendimento Presencial / Balcão: Item acessado por Marinna Consultora'),
      })
    );
  });

  it('deve buscar comentários do banco ordenados cronologicamente', async () => {
    // Setup
    const comentariosMock = [
      { id: 'c1', texto: 'Primeiro comentário', created_at: '2026-09-01T10:00:00Z', autor: { nome: 'Admin' } },
      { id: 'c2', texto: 'Segundo comentário', created_at: '2026-09-01T11:00:00Z', autor: { nome: 'Consultor' } },
    ];
    const orderMock = vi.fn().mockResolvedValue({ data: comentariosMock, error: null });
    const eqItemMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqTipoMock = vi.fn().mockReturnValue({ eq: eqItemMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqTipoMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    const mockSubElement = {
      addEventListener: vi.fn(),
      classList: { contains: vi.fn().mockReturnValue(true), add: vi.fn(), remove: vi.fn() },
      value: '',
      innerHTML: '',
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([])
    };

    const mockContainer = {
      innerHTML: '',
      querySelector: vi.fn().mockReturnValue(mockSubElement),
      querySelectorAll: vi.fn().mockReturnValue([])
    } as any;

    // Action
    await CommentsService.renderCommentsSection(
      mockContainer,
      'orcamento',
      'orc-999',
      'parent-1',
      'user-1',
      []
    );

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('comentarios');
    expect(eqTipoMock).toHaveBeenCalledWith('tipo_item', 'orcamento');
    expect(eqItemMock).toHaveBeenCalledWith('item_id', 'orc-999');
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('deve capturar erro e retornar false se o registro de log de auditoria falhar no Supabase', async () => {
    // Setup
    const insertMock = vi.fn().mockRejectedValue(new Error('Erro de conexão'));
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    // Action
    const resultado = await CommentsService.registrarLogAtendimentoBalcao(
      'viagem',
      'viagem-falha',
      'Consultor',
      'user-falha'
    );

    // Assert
    expect(resultado).toBe(false);
  });
});
