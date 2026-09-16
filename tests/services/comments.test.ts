import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentsService } from '../../src/services/comments';
import { supabase } from '../../src/services/supabase';
import { parseSmartDate } from '../../src/utils/masks';

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

  describe('parseSmartDate - Parser Inteligente de Datas de Agendamento', () => {
    const dataReferencia = new Date(2026, 8, 15); // 15 de setembro de 2026

    it('deve normalizar entrada contendo apenas o número do dia ("27")', () => {
      // Setup
      const raw = '27';

      // Action
      const parsed = parseSmartDate(raw, dataReferencia);

      // Assert
      expect(parsed).not.toBeNull();
      expect(parsed?.dataIso).toBe('2026-09-27');
      expect(parsed?.dataBr).toBe('27/09/2026');
    });

    it('deve normalizar entrada contendo dia e mês ("27/09")', () => {
      // Setup
      const raw = '27/09';

      // Action
      const parsed = parseSmartDate(raw, dataReferencia);

      // Assert
      expect(parsed).not.toBeNull();
      expect(parsed?.dataIso).toBe('2026-09-27');
      expect(parsed?.dataBr).toBe('27/09/2026');
    });

    it('deve normalizar data completa no padrão brasileiro ("27/09/2026")', () => {
      // Setup
      const raw = '27/09/2026';

      // Action
      const parsed = parseSmartDate(raw, dataReferencia);

      // Assert
      expect(parsed).not.toBeNull();
      expect(parsed?.dataIso).toBe('2026-09-27');
      expect(parsed?.dataBr).toBe('27/09/2026');
    });

    it('deve normalizar data ISO nativa ("2026-09-27")', () => {
      // Setup
      const raw = '2026-09-27';

      // Action
      const parsed = parseSmartDate(raw, dataReferencia);

      // Assert
      expect(parsed).not.toBeNull();
      expect(parsed?.dataIso).toBe('2026-09-27');
      expect(parsed?.dataBr).toBe('27/09/2026');
    });

    it('deve rejeitar dias inválidos como 32 de janeiro ou 31 de abril', () => {
      // Setup & Action
      const invalido1 = parseSmartDate('32/01/2026', dataReferencia);
      const invalido2 = parseSmartDate('31/04/2026', dataReferencia);
      const invalido3 = parseSmartDate('dia-errado', dataReferencia);

      // Assert
      expect(invalido1).toBeNull();
      expect(invalido2).toBeNull();
      expect(invalido3).toBeNull();
    });
  });

  describe('checkAndParseCommentSchedule - Agendamento Inteligente por Texto', () => {
    it('deve identificar menção @Fernanda com data "dia 27" e criar lembrete na tabela lembretes', async () => {
      // Setup
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const perfis = [
        { id: 'user-fernanda-id', nome: 'Fernanda Oliveira', ativo: true }
      ] as any[];

      // Action
      const agendou = await CommentsService.checkAndParseCommentSchedule(
        '@Fernanda favor verificar reservas para o dia 27 tarde',
        'orcamento',
        'orc-777',
        'user-criador-id',
        perfis
      );

      // Assert
      expect(agendou).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('lembretes');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orcamento_id: 'orc-777',
          consultor_id: 'user-fernanda-id',
          criador_id: 'user-criador-id',
          periodo: 'tarde',
          arquivado: false,
          data_lembrete: expect.stringMatching(/^\d{4}-\d{2}-27$/)
        })
      );
    });

    it('deve atribuir lembrete a si mesmo se houver data mas nenhuma outra menção', async () => {
      // Setup
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      // Action
      const agendou = await CommentsService.checkAndParseCommentSchedule(
        'lembrete pessoal para 28/09/2026 manha',
        'viagem',
        'viagem-444',
        'user-eu-mesmo',
        []
      );

      // Assert
      expect(agendou).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('lembretes');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          viagem_id: 'viagem-444',
          consultor_id: 'user-eu-mesmo',
          criador_id: 'user-eu-mesmo',
          periodo: 'manha',
          data_lembrete: '2026-09-28'
        })
      );
    });
  });
});
