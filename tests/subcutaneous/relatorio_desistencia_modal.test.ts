import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrcamentosService } from '../../src/services/orcamentosService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => {
  const fromMock = vi.fn();
  const rpcMock = vi.fn();
  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
    },
  };
});

describe('Subcutaneous: Relatório de Desistências - Abertura e Gestão de Propostas Desistidas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve normalizar orçamento desistido com dados incompletos ou nulos sem lançar exceções', async () => {
    // Setup
    const user = { id: 'consultor-1', email: 'consultor@agencia.com' };
    const orcamentoBrutoDesistente = {
      id: 'orc-desistente-nulo',
      consultor_id: 'consultor-1',
      cliente_id: 'cli-99',
      nome_cliente: 'Cliente Desistente Sem Contato',
      contato: null, // Testando campo nulo que causava crash no split('/')
      destino: 'Santiago, Chile',
      data_viagem: null,
      temperatura: 'Frio',
      tags: null, // Testando tags nulas
      status: 'CONCLUIDO',
      sub_status: 'DESISTENCIA',
      notas_negociacao: null,
      valor_proposta: 5000,
      valor_viagem: null,
      origem: null,
      documentos_url: null, // Testando array nulo
      codigo_ref: 'ORC-0099',
      contato_realizado: null,
      contato_realizado_em: null,
      contato_realizado_por: null,
      created_at: '2026-05-10T12:00:00Z',
      updated_at: '2026-05-11T14:00:00Z'
    };

    const orderMock = vi.fn().mockResolvedValue({ data: [orcamentoBrutoDesistente], error: null });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    // Action
    const resultado = await OrcamentosService.loadOrcamentos(user, null);
    const orc = resultado[0];

    // Normalização defensiva equivalente ao VerNotasModal / Relatorios
    const rawContato = typeof orc.contato === 'string' ? orc.contato : (orc.contato ? String(orc.contato) : '');
    const contacts = rawContato ? rawContato.split('/') : [''];
    const phone = contacts[0] ? contacts[0].trim() : '';
    const rawTags = Array.isArray(orc.tags) ? orc.tags : [];
    const rawDocs = Array.isArray(orc.documentosUrl) ? orc.documentosUrl : [];

    // Assert
    expect(resultado).toHaveLength(1);
    expect(orc.id).toBe('orc-desistente-nulo');
    expect(orc.status).toBe('CONCLUIDO');
    expect(orc.subStatus).toBe('DESISTENCIA');
    expect(phone).toBe('');
    expect(rawTags).toEqual([]);
    expect(rawDocs).toEqual([]);
    expect(orc.contatoRealizado).toBe(false);
  });

  it('deve reabrir orçamento desistido e mover para status SOLICITADO com limpeza de desistência', async () => {
    // Setup
    const orcId = 'orc-desistente-123';
    const motivoReabertura = 'Cliente retomou negociação para o segundo semestre';
    const perfilConsultor = { id: 'consultor-1', nome: 'Consultor Ativo', role: 'consultor' } as any;

    const orcamentoMock = {
      id: orcId,
      nome_cliente: 'Cliente Teste',
      destino: 'Santiago, Chile',
      status: 'CONCLUIDO',
      sub_status: 'DESISTENCIA',
      notas_negociacao: '[Desistência] Motivo: Preço alto',
      tags: ['Desistência: Preço Alto', 'Internacional']
    };

    const singleMock = vi.fn().mockResolvedValue({ data: orcamentoMock, error: null });
    const selectEqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });

    const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orcamentos') {
        return {
          select: selectMock,
          update: updateMock
        } as any;
      }
      if (table === 'comentarios') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      }
      return {} as any;
    });

    // Action
    const result = await OrcamentosService.reabrirOrcamento(orcId, motivoReabertura, perfilConsultor);

    // Assert
    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'SOLICITADO',
      sub_status: null,
      contato_realizado: false,
      contato_realizado_em: null,
      contato_realizado_por: null
    }));
    expect(updateEqMock).toHaveBeenCalledWith('id', orcId);
  });

  it('deve lidar de forma resiliente com schema drift (erro 42703) durante a reabertura sem quebrar', async () => {
    // Setup
    const orcId = 'orc-drift-42703';
    const perfilAdmin = { id: 'admin-1', nome: 'Admin Master', role: 'admin' } as any;

    const schemaDriftError = {
      code: '42703',
      message: 'column "contato_realizado" does not exist'
    };

    const singleMock = vi.fn().mockResolvedValue({
      data: { id: orcId, nome_cliente: 'Cliente Drift', destino: 'Paris', status: 'CONCLUIDO', sub_status: 'DESISTENCIA', tags: [] },
      error: null
    });
    const selectEqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });

    // Primeiro update falha com 42703, fallback subsequente é chamado
    const updateEqMock = vi.fn()
      .mockResolvedValueOnce({ data: null, error: schemaDriftError })
      .mockResolvedValueOnce({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orcamentos') {
        return {
          select: selectMock,
          update: updateMock
        } as any;
      }
      if (table === 'comentarios') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      }
      return {} as any;
    });

    // Action
    const result = await OrcamentosService.reabrirOrcamento(orcId, 'Cliente pediu remarcação', perfilAdmin);

    // Assert
    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it('deve alternar status de contato com cliente desistente por administrador com sucesso', async () => {
    // Setup
    const orcId = 'orc-contato-1';
    const perfilAdmin = { id: 'admin-1', nome: 'Admin PaxFlow', role: 'admin' } as any;

    const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
    } as any);

    // Action
    const result = await OrcamentosService.alternarContatoDesistencia(orcId, true, perfilAdmin);

    // Assert
    expect(result.success).toBe(true);
    expect(result.contatoRealizado).toBe(true);
    expect(result.contatoRealizadoPor).toBe('admin-1');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      contato_realizado: true,
      contato_realizado_por: 'admin-1'
    }));
    expect(updateEqMock).toHaveBeenCalledWith('id', orcId);
  });

  it('deve alternar status de contato com fallback resiliente para schema drift 42703', async () => {
    // Setup
    const orcId = 'orc-contato-drift';
    const perfilAdmin = { id: 'admin-1', nome: 'Admin PaxFlow', role: 'admin' } as any;

    const schemaDriftError = {
      code: '42703',
      message: 'column "contato_realizado" does not exist'
    };

    const singleMock = vi.fn().mockResolvedValue({
      data: { notas_negociacao: 'Nota anterior do cliente' },
      error: null
    });
    const selectEqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });

    const updateEqMock = vi.fn()
      .mockResolvedValueOnce({ data: null, error: schemaDriftError })
      .mockResolvedValueOnce({ data: null, error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      update: updateMock,
    } as any);

    // Action
    const result = await OrcamentosService.alternarContatoDesistencia(orcId, true, perfilAdmin);

    // Assert
    expect(result.success).toBe(true);
    expect(result.contatoRealizado).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(2);
  });
});

