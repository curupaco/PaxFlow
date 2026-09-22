import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrcamentosService } from '../../src/services/orcamentosService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('Orçamentos Desistidos - Validação de Contato do Gestor e Reabertura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve marcar contato_realizado como true salvando identificação do administrador e data/hora', async () => {
    // Setup
    const orcId = 'orc-desistido-1';
    const perfilAdmin = {
      id: 'admin-uuid-1',
      nome: 'Administrador Master',
      role: 'admin'
    } as any;

    const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orcamentos') {
        return { update: updateMock } as any;
      }
      return {} as any;
    });

    // Action
    const result = await OrcamentosService.alternarContatoDesistencia(orcId, true, perfilAdmin);

    // Assert
    expect(result.success).toBe(true);
    expect(result.contatoRealizado).toBe(true);
    expect(result.contatoRealizadoPor).toBe('admin-uuid-1');
    expect(result.contatoRealizadoPorNome).toBe('Administrador Master');
    expect(result.contatoRealizadoEm).toBeDefined();
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      contato_realizado: true,
      contato_realizado_por: 'admin-uuid-1',
      contato_realizado_em: expect.any(String)
    }));
    expect(updateEqMock).toHaveBeenCalledWith('id', orcId);
  });

  it('deve desmarcar contato_realizado limpando identificação e data quando status for false', async () => {
    // Setup
    const orcId = 'orc-desistido-2';
    const perfilAdmin = {
      id: 'admin-uuid-1',
      nome: 'Administrador Master',
      role: 'admin'
    } as any;

    const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orcamentos') {
        return { update: updateMock } as any;
      }
      return {} as any;
    });

    // Action
    const result = await OrcamentosService.alternarContatoDesistencia(orcId, false, perfilAdmin);

    // Assert
    expect(result.success).toBe(true);
    expect(result.contatoRealizado).toBe(false);
    expect(result.contatoRealizadoPor).toBeUndefined();
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      contato_realizado: false,
      contato_realizado_por: null,
      contato_realizado_em: null
    }));
  });

  it('deve tratar erro 42703 (schema drift) em alternarContatoDesistencia com fallback resiliente sem travar', async () => {
    // Setup
    const orcId = 'orc-desistido-3';
    const perfilAdmin = {
      id: 'admin-uuid-1',
      nome: 'Administrador Master',
      role: 'admin'
    } as any;

    const schemaDriftError = {
      code: '42703',
      message: 'column "contato_realizado" does not exist'
    };

    const firstUpdateEqMock = vi.fn().mockResolvedValue({ data: null, error: schemaDriftError });
    const retryUpdateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn()
      .mockReturnValueOnce({ eq: firstUpdateEqMock })
      .mockReturnValueOnce({ eq: retryUpdateEqMock });

    const singleMock = vi.fn().mockResolvedValue({
      data: { notas_negociacao: 'Notas anteriores do cliente' },
      error: null
    });
    const eqSelectMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqSelectMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orcamentos') {
        return {
          update: updateMock,
          select: selectMock
        } as any;
      }
      return {} as any;
    });

    // Action
    const result = await OrcamentosService.alternarContatoDesistencia(orcId, true, perfilAdmin);

    // Assert
    expect(result.success).toBe(true);
    expect(result.contatoRealizado).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      notas_negociacao: expect.stringContaining('[Contato Gestor: Confirmado')
    }));
  });

  it('deve reabrir o orçamento movendo para SOLICITADO, limpando sub_status e gravando o motivo no histórico', async () => {
    // Setup
    const orcId = 'orc-reabrir-1';
    const motivoReabertura = 'Cliente retomou contato e quer alterar as datas';
    const perfilConsultor = {
      id: 'consultor-uuid-2',
      nome: 'Consultora Juliana',
      role: 'consultor'
    } as any;

    const mockOrcamentoAtual = {
      id: orcId,
      nome_cliente: 'Mariana Silva',
      destino: 'Paris, França',
      status: 'CONCLUIDO',
      sub_status: 'DESISTENCIA',
      notas_negociacao: '[Desistência em 15/09/2026] Motivo: Desistiu da compra'
    };

    const singleMock = vi.fn().mockResolvedValue({ data: mockOrcamentoAtual, error: null });
    const eqSelectMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqSelectMock });

    const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    const insertCommentMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orcamentos') {
        return {
          select: selectMock,
          update: updateMock
        } as any;
      }
      if (table === 'comentarios') {
        return {
          insert: insertCommentMock
        } as any;
      }
      return {} as any;
    });

    // Action
    const result = await OrcamentosService.reabrirOrcamento(orcId, motivoReabertura, perfilConsultor);

    // Assert
    expect(result.success).toBe(true);
    expect(result.orcamentoAtualizado.status).toBe('SOLICITADO');
    expect(result.orcamentoAtualizado.sub_status).toBeNull();
    expect(result.orcamentoAtualizado.contato_realizado).toBe(false);
    expect(result.orcamentoAtualizado.notas_negociacao).toContain('[Orçamento Reaberto em');
    expect(result.orcamentoAtualizado.notas_negociacao).toContain('por Consultora Juliana');
    expect(result.orcamentoAtualizado.notas_negociacao).toContain('Motivo da Reabertura: Cliente retomou contato e quer alterar as datas');
    expect(result.orcamentoAtualizado.notas_negociacao).toContain('[Desistência em 15/09/2026]');
    
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'SOLICITADO',
      sub_status: null,
      contato_realizado: false,
      contato_realizado_por: null,
      contato_realizado_em: null,
      notas_negociacao: expect.stringContaining('Cliente retomou contato')
    }));

    expect(insertCommentMock).toHaveBeenCalledWith(expect.objectContaining({
      tipo_item: 'orcamento',
      item_id: orcId,
      usuario_id: 'consultor-uuid-2',
      conteudo: expect.stringContaining('🔄 Orçamento reaberto para a etapa SOLICITADO')
    }));
  });
});
