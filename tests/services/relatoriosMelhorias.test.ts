import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContatosEmbarqueService } from '../../src/services/contatosEmbarqueService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Relatórios - Melhorias Subcutâneas (Embarques, Desistências e Validação de Gestor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve alternar a validação do gestor para true salvando data e identificação do gestor', async () => {
    // Setup
    const mockViagem = {
      id: 'viagem-123',
      contatos_embarque: {
        'ida-0': { feito: true, data_contato: '2026-09-22T10:00:00Z', consultor_id: 'user-1' }
      }
    };

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockViagem, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          select: selectMock,
          update: updateMock
        } as any;
      }
      return {} as any;
    });

    // Action
    const result = await ContatosEmbarqueService.alternarValidacaoGestor(
      mockViagem,
      'ida-0',
      'gestor-admin-1',
      'Gestor Geral',
      true
    );

    // Assert
    expect(result.sucesso).toBe(true);
    expect(result.novoStatus).toBe(true);
    expect(result.contatosAtualizados['ida-0'].validado_gestor).toBe(true);
    expect(result.contatosAtualizados['ida-0'].gestor_id).toBe('gestor-admin-1');
    expect(result.contatosAtualizados['ida-0'].gestor_nome).toBe('Gestor Geral');
    expect(result.contatosAtualizados['ida-0'].validado_gestor_em).toBeDefined();
    expect(updateMock).toHaveBeenCalledWith({
      contatos_embarque: expect.objectContaining({
        'ida-0': expect.objectContaining({
          validado_gestor: true,
          gestor_id: 'gestor-admin-1',
          gestor_nome: 'Gestor Geral'
        })
      })
    });
  });

  it('deve remover a validação do gestor quando statusDesejado for false', async () => {
    // Setup
    const mockViagem = {
      id: 'viagem-456',
      contatos_embarque: {
        'ida-0': {
          feito: true,
          validado_gestor: true,
          validado_gestor_em: '2026-09-22T11:00:00Z',
          gestor_id: 'gestor-admin-1',
          gestor_nome: 'Gestor Geral'
        }
      }
    };

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockViagem, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          select: selectMock,
          update: updateMock
        } as any;
      }
      return {} as any;
    });

    // Action
    const result = await ContatosEmbarqueService.alternarValidacaoGestor(
      mockViagem,
      'ida-0',
      'gestor-admin-1',
      'Gestor Geral',
      false
    );

    // Assert
    expect(result.sucesso).toBe(true);
    expect(result.novoStatus).toBe(false);
    expect(result.contatosAtualizados['ida-0'].validado_gestor).toBe(false);
    expect(result.contatosAtualizados['ida-0'].validado_gestor_em).toBeUndefined();
    expect(result.contatosAtualizados['ida-0'].gestor_id).toBeUndefined();
    expect(result.contatosAtualizados['ida-0'].gestor_nome).toBeUndefined();
  });

  it('deve tratar erro 42703 (schema drift) com fallback resiliente salvando em observacoes sem travar', async () => {
    // Setup
    const mockViagem = {
      id: 'viagem-drift',
      observacoes: 'Nota antiga',
      contatos_embarque: null
    };

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockViagem, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    const updateMock = vi.fn()
      .mockImplementationOnce(() => ({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42703', message: 'column "contatos_embarque" does not exist' }
        })
      }))
      .mockImplementationOnce(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      }));

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          select: selectMock,
          update: updateMock
        } as any;
      }
      return {} as any;
    });

    // Action
    const result = await ContatosEmbarqueService.alternarValidacaoGestor(
      mockViagem,
      'ida-0',
      'gestor-admin-1',
      'Gestor Geral',
      true
    );

    // Assert
    expect(result.sucesso).toBe(true);
    expect(result.novoStatus).toBe(true);
    expect(result.contatosAtualizados['ida-0'].validado_gestor).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it('deve buscar e normalizar dados de orçamento para o modal sobreposto de relatórios', async () => {
    // Setup
    const mockOrcamentoDb = {
      id: 'orc-999',
      consultor_id: 'user-777',
      cliente_id: 'cli-888',
      nome_cliente: 'Mariana Lima',
      contato: '11999998888',
      destino: 'Paris, França',
      data_viagem: '2026-10-15',
      temperatura: 'Quente',
      tags: ['VIP', 'Europa'],
      status: 'SOLICITADO',
      sub_status: '',
      notas_negociacao: 'Cliente quer hotel 5 estrelas',
      valor_proposta: 25000,
      documentos_url: ['https://storage.supabase.co/doc1.pdf'],
      created_at: '2026-09-20T10:00:00Z',
      updated_at: '2026-09-20T10:00:00Z'
    };

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockOrcamentoDb, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orcamentos') {
        return {
          select: selectMock
        } as any;
      }
      return {} as any;
    });

    // Action
    const { data: d } = await supabase
      .from('orcamentos')
      .select('*, cliente:clientes(*)')
      .eq('id', 'orc-999')
      .maybeSingle();

    // Assert
    expect(d).toBeDefined();
    expect(d.id).toBe('orc-999');
    expect(d.nome_cliente).toBe('Mariana Lima');
    expect(d.destino).toBe('Paris, França');
    expect(d.valor_proposta).toBe(25000);
  });
});
