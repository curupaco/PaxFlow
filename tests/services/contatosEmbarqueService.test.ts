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

  describe('obterEmbarquesViagem (Consolidação Sem Duplicação)', () => {
    it('deve retornar ida e volta gerais quando não houver produtos aéreos com trechos', () => {
      // Setup
      const viagem = {
        id: 'trip-hotel',
        destino: 'Gramado, RS',
        data_ida: '2026-11-01',
        data_volta: '2026-11-06',
        codigo_localizador: 'LOC-HOTEL',
        produtos: [
          { id: 'prod-1', tipo: 'HOTEL', fornecedor: 'Hotel Casa da Montanha' }
        ]
      };

      // Action
      const embarques = ContatosEmbarqueService.obterEmbarquesViagem(viagem);

      // Assert
      expect(embarques).toHaveLength(2);
      expect(embarques[0]).toEqual(expect.objectContaining({
        chave: 'viagem-ida',
        tipo: 'ida',
        dataStr: '2026-11-01',
        loc: 'LOC-HOTEL',
        destino: 'Gramado, RS'
      }));
      expect(embarques[1]).toEqual(expect.objectContaining({
        chave: 'viagem-volta',
        tipo: 'volta',
        dataStr: '2026-11-06',
        loc: 'LOC-HOTEL',
        destino: 'Gramado, RS'
      }));
    });

    it('deve priorizar exclusivamente os trechos de voo quando a viagem possuir produtos aéreos, eliminando duplicatas', () => {
      // Setup
      const viagem = {
        id: 'trip-voo',
        destino: 'Paris, França',
        data_ida: '2026-12-13',
        data_volta: '2026-12-20',
        codigo_localizador: 'LOC-GERAL',
        produtos: [
          {
            id: 'prod-aereo-latam',
            tipo: 'AÉREO OPERADORA',
            fornecedor: 'LATAM',
            codigo_reserva: 'UQPUMY',
            dados_adicionais: {
              trechos: [
                {
                  origem: 'São Paulo, Brasil',
                  destino: 'Paris, França',
                  dataIda: '2026-12-13',
                  dataVolta: '2026-12-20',
                  horarioIda: '18:30',
                  horarioVolta: '22:00'
                }
              ]
            }
          }
        ]
      };

      // Action
      const embarques = ContatosEmbarqueService.obterEmbarquesViagem(viagem);

      // Assert
      expect(embarques).toHaveLength(2); // Apenas os 2 trechos de voo, sem as 2 datas genéricas duplicadas
      expect(embarques[0]).toEqual(expect.objectContaining({
        chave: 'seg-ida-prod-aereo-latam-0',
        tipo: 'segmento-ida',
        tipoDesc: '✈️ Voo (Ida) - LATAM',
        dataStr: '2026-12-13',
        loc: 'UQPUMY',
        destino: 'São Paulo, Brasil ➔ Paris, França'
      }));
      expect(embarques[1]).toEqual(expect.objectContaining({
        chave: 'seg-volta-prod-aereo-latam-0',
        tipo: 'segmento-volta',
        tipoDesc: '✈️ Voo (Volta) - LATAM',
        dataStr: '2026-12-20',
        loc: 'UQPUMY',
        destino: 'São Paulo, Brasil ➔ Paris, França'
      }));
    });
  });
});
