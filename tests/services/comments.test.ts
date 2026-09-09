import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentsService } from '../../src/services/comments';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('CommentsService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve registrar log de auditoria de atendimento presencial nos comentários', async () => {
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

  it('deve buscar comentários do banco ordenados cronologicamente', async () => {
    // Setup
    const comentariosMock = [
      { id: 'c1', texto: 'Primeiro comentário', created_at: '2026-09-01T10:00:00Z' },
      { id: 'c2', texto: 'Segundo comentário', created_at: '2026-09-01T11:00:00Z' },
    ];
    const orderMock = vi.fn().mockResolvedValue({ data: comentariosMock, error: null });
    const eqItemMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqTipoMock = vi.fn().mockReturnValue({ eq: eqItemMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqTipoMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    const mockContainer = { innerHTML: '' } as any;

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
});
