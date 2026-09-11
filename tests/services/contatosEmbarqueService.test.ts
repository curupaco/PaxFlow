import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContatosEmbarqueService } from '../../src/services/contatosEmbarqueService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('ContatosEmbarqueService (Subcutâneo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve extrair contatos da coluna nativa quando preenchida', () => {
    // Setup
    const viagem = {
      id: 'trip-1',
      contatos_embarque: {
        'viagem-ida': {
          feito: true,
          data_contato: '2026-09-11T12:00:00Z',
          consultor_id: 'user-1',
          consultor_nome: 'Ana'
        }
      }
    };

    // Action
    const resultado = ContatosEmbarqueService.extrairContatos(viagem);

    // Assert
    expect(resultado['viagem-ida']?.feito).toBe(true);
    expect(resultado['viagem-ida']?.consultor_nome).toBe('Ana');
  });

  it('deve extrair contatos da chave fallback em observacoes quando coluna nativa vazia', () => {
    // Setup
    const viagem = {
      id: 'trip-2',
      observacoes: 'Cliente VIP\n[CONTATOS_EMBARQUE]: {"viagem-volta":{"feito":true,"consultor_nome":"Carlos"}}'
    };

    // Action
    const resultado = ContatosEmbarqueService.extrairContatos(viagem);

    // Assert
    expect(resultado['viagem-volta']?.feito).toBe(true);
    expect(resultado['viagem-volta']?.consultor_nome).toBe('Carlos');
  });

  it('deve salvar diretamente na coluna nativa quando a coluna existir', async () => {
    // Setup
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock
    } as any);

    const contatos = {
      'viagem-ida': {
        feito: true,
        data_contato: '2026-09-11T14:00:00Z',
        consultor_id: 'user-1',
        consultor_nome: 'Consultor Teste'
      }
    };

    // Action
    const sucesso = await ContatosEmbarqueService.salvarContatos('trip-123', contatos);

    // Assert
    expect(sucesso).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contatos_embarque: contatos
      })
    );
  });

  it('deve aplicar fallback seguro em observações quando a coluna contatos_embarque não existir (erro 42703)', async () => {
    // Setup
    const updateError = { code: '42703', message: 'column "contatos_embarque" does not exist' };
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: updateError })
    });
    const selectSingleMock = vi.fn().mockResolvedValue({
      data: { observacoes: 'Observacao previa' },
      error: null
    });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: selectSingleMock
      })
    });
    const updateFallbackMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          update: vi.fn().mockImplementation((payload: any) => {
            if (payload.contatos_embarque !== undefined) {
              return updateMock();
            }
            return updateFallbackMock(payload);
          }),
          select: selectMock
        } as any;
      }
      return {} as any;
    });

    const contatos = {
      'viagem-ida': {
        feito: true,
        data_contato: '2026-09-11T14:00:00Z',
        consultor_id: 'user-1',
        consultor_nome: 'Consultor Teste'
      }
    };

    // Action
    const sucesso = await ContatosEmbarqueService.salvarContatos('trip-456', contatos);

    // Assert
    expect(sucesso).toBe(true);
    expect(updateFallbackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        observacoes: expect.stringContaining('[CONTATOS_EMBARQUE]:')
      })
    );
  });

  it('deve aplicar fallback seguro em observações quando a coluna contatos_embarque não existir (erro PGRST204 do schema cache)', async () => {
    // Setup
    const updateError = {
      code: 'PGRST204',
      message: "Could not find the 'contatos_embarque' column of 'viagens' in the schema cache"
    };
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: updateError })
    });
    const selectSingleMock = vi.fn().mockResolvedValue({
      data: { observacoes: 'Observacao original' },
      error: null
    });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: selectSingleMock
      })
    });
    const updateFallbackMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          update: vi.fn().mockImplementation((payload: any) => {
            if (payload.contatos_embarque !== undefined) {
              return updateMock();
            }
            return updateFallbackMock(payload);
          }),
          select: selectMock
        } as any;
      }
      return {} as any;
    });

    const contatos = {
      'viagem-volta': {
        feito: true,
        data_contato: '2026-09-11T15:00:00Z',
        consultor_id: 'user-2',
        consultor_nome: 'Consultor Dois'
      }
    };

    // Action
    const sucesso = await ContatosEmbarqueService.salvarContatos('trip-789', contatos);

    // Assert
    expect(sucesso).toBe(true);
    expect(updateFallbackMock).toHaveBeenCalledWith({
      observacoes: expect.stringContaining('[CONTATOS_EMBARQUE]:')
    });
  });
});
