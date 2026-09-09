import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrcamentosService } from '../../src/services/orcamentosService';
import { supabase } from '../../src/services/supabase';
import { registrarXp } from '../../src/services/gamification';

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

vi.mock('../../src/services/gamification', () => ({
  registrarXp: vi.fn().mockResolvedValue({ success: true }),
}));

describe('OrcamentosService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar consultores ativos ordenados por nome', async () => {
    // Setup
    const perfisMock = [
      { id: 'u1', nome: 'Ana Costa', ativo: true },
      { id: 'u2', nome: 'Bruno Rocha', ativo: true },
    ];
    const orderMock = vi.fn().mockResolvedValue({ data: perfisMock, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    // Action
    const resultado = await OrcamentosService.loadConsultores();

    // Assert
    expect(resultado).toEqual(perfisMock);
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(eqMock).toHaveBeenCalledWith('ativo', true);
    expect(orderMock).toHaveBeenCalledWith('nome', { ascending: true });
  });

  it('deve carregar orçamentos com mapeamento completo de campos e destinos', async () => {
    // Setup
    const user = { id: 'user-1' };
    const orcamentosDb = [
      {
        id: 'orc-123',
        consultor_id: 'user-1',
        cliente_id: 'cli-1',
        nome_cliente: 'Maria Oliveira',
        contato: '11999998888',
        destino: 'Paris',
        destino_ref: { nome: 'Paris', pais: 'França' },
        data_viagem: '2026-12-10',
        temperatura: 'QUENTE',
        tags: ['lua de mel'],
        status: 'EM_ANDAMENTO',
        sub_status: 'PROPOSTA_ENVIADA',
        notas_negociacao: 'Negociação avançada',
        valor_proposta: 15000,
        valor_viagem: 16000,
        origem: 'Instagram',
        documentos_url: ['https://drive.google.com/doc1'],
        codigo_ref: 'ORC-2026-001',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T12:00:00Z',
      },
    ];

    const orderMock = vi.fn().mockResolvedValue({ data: orcamentosDb, error: null });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    // Action
    const resultado = await OrcamentosService.loadOrcamentos(user, null);

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      id: 'orc-123',
      consultorId: 'user-1',
      clienteId: 'cli-1',
      nomeCliente: 'Maria Oliveira',
      destino: 'Paris, França',
      valorProposta: 15000,
      codigoRef: 'ORC-2026-001',
    });
    expect(supabase.from).toHaveBeenCalledWith('orcamentos');
  });

  it('deve persistir novo orçamento gerando pontuação de XP de criação', async () => {
    // Setup
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    const novoOrcamento: any = {
      id: 'orc-temp-123',
      consultorId: 'consultor-456',
      nomeCliente: 'Lucas Mendes',
      contato: 'lucas@email.com',
      destino: 'Santiago',
      temperatura: 'MORNO',
      tags: ['família'],
      status: 'EM_ANDAMENTO',
      valorProposta: 8500,
    };

    // Action
    const res = await OrcamentosService.persistOrcamento(novoOrcamento);

    // Assert
    expect(res.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('orcamentos');
    expect(insertMock).toHaveBeenCalled();
    expect(registrarXp).toHaveBeenCalledWith('consultor-456', expect.stringContaining('orcamento_criado_'), 25);
    expect(registrarXp).toHaveBeenCalledWith('consultor-456', 'orcamento_andamento_orc-temp-123', 50);
  });

  it('deve atualizar orçamento existente persistindo alterações', async () => {
    // Setup
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

    const orcamentoExistente: any = {
      id: 'uuid-real-orcamento-1',
      consultorId: 'consultor-789',
      nomeCliente: 'Fernanda Lima',
      contato: '11988887777',
      destino: 'Lisboa',
      temperatura: 'QUENTE',
      tags: ['casal'],
      status: 'AGUARDANDO',
      valorProposta: 12000,
    };

    // Action
    const res = await OrcamentosService.persistOrcamento(orcamentoExistente);

    // Assert
    expect(res.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('orcamentos');
    expect(updateMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith('id', 'uuid-real-orcamento-1');
  });

  it('deve excluir orçamento e realizar limpeza em cascata de lembretes e comentários', async () => {
    // Setup
    const deleteLembretesEq = vi.fn().mockResolvedValue({ error: null });
    const deleteLembretes = vi.fn().mockReturnValue({ eq: deleteLembretesEq });

    const deleteComentariosEqItem = vi.fn().mockResolvedValue({ error: null });
    const deleteComentariosEqTipo = vi.fn().mockReturnValue({ eq: deleteComentariosEqItem });
    const deleteComentarios = vi.fn().mockReturnValue({ eq: deleteComentariosEqTipo });

    const deleteOrcamentoEq = vi.fn().mockResolvedValue({ error: null });
    const deleteOrcamento = vi.fn().mockReturnValue({ eq: deleteOrcamentoEq });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'lembretes') return { delete: deleteLembretes } as any;
      if (table === 'comentarios') return { delete: deleteComentarios } as any;
      if (table === 'orcamentos') return { delete: deleteOrcamento } as any;
      return {} as any;
    });

    // Action
    const resultado = await OrcamentosService.deleteOrcamento('orc-alvo-delete');

    // Assert
    expect(resultado).toBe(true);
    expect(deleteLembretesEq).toHaveBeenCalledWith('orcamento_id', 'orc-alvo-delete');
    expect(deleteComentariosEqTipo).toHaveBeenCalledWith('tipo_item', 'orcamento');
    expect(deleteComentariosEqItem).toHaveBeenCalledWith('item_id', 'orc-alvo-delete');
    expect(deleteOrcamentoEq).toHaveBeenCalledWith('id', 'orc-alvo-delete');
  });

  it('deve criar lembrete de acompanhamento vinculado ao orçamento', async () => {
    // Setup
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    // Action
    await OrcamentosService.createReminder('orc-999', 'user-consultor', '2026-10-15', 'MANHA');

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('lembretes');
    expect(insertMock).toHaveBeenCalledWith({
      orcamento_id: 'orc-999',
      consultor_id: 'user-consultor',
      data_lembrete: '2026-10-15',
      periodo: 'MANHA',
      arquivado: false,
    });
  });

  it('deve carregar detalhes do cliente e suas viagens ativas', async () => {
    // Setup
    const clienteMock = { id: 'cli-555', nome: 'Roberto Carlos', telefone: '11977776666' };
    const viagensAtivasMock = [
      { id: 'viagem-1', cliente_id: 'cli-555', destino: 'Cancún', status: 'confirmada' },
    ];

    const singleCliMock = vi.fn().mockResolvedValue({ data: clienteMock, error: null });
    const eqCliMock = vi.fn().mockReturnValue({ single: singleCliMock });
    const selectCliMock = vi.fn().mockReturnValue({ eq: eqCliMock });

    const notTripsMock = vi.fn().mockResolvedValue({ data: viagensAtivasMock, error: null });
    const eqTripsMock = vi.fn().mockReturnValue({ not: notTripsMock });
    const selectTripsMock = vi.fn().mockReturnValue({ eq: eqTripsMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clientes') return { select: selectCliMock } as any;
      if (table === 'viagens') return { select: selectTripsMock } as any;
      return {} as any;
    });

    // Action
    const { linkedClient, activeTrips } = await OrcamentosService.loadClientDetailsAndTrips('cli-555');

    // Assert
    expect(linkedClient).toEqual(clienteMock);
    expect(activeTrips).toEqual(viagensAtivasMock);
    expect(notTripsMock).toHaveBeenCalledWith('status', 'in', '("cancelada","concluida")');
  });

  it('deve converter orçamento aprovado em viagem criando cliente e produto', async () => {
    // Setup
    const orcMock: any = {
      id: 'uuid-orc-aprovado-1',
      consultorId: 'consultor-1',
      cliente_id: 'cli-novo-id',
      nomeCliente: 'Juliana Paes',
      destino: 'Roma',
    };

    const optionsMock: any = {
      cNome: 'Juliana Paes',
      cEmail: 'juliana@teste.com',
      cTelefone: '11988889999',
      isNovaViagem: true,
      vValor: 20000,
      vDestino: 'Roma',
      vLoc: 'LOC-ROMA-1',
      vIda: '2026-11-01',
      vVolta: '2026-11-15',
      vStatus: 'confirmada',
      prodTipo: 'PACOTE',
      prodFornecedor: 'CVC / Operadora',
      prodDescricao: 'Pacote Aéreo + Hotel',
      comissaoTotalReceber: 2000,
      comissaoConsultorTotal: 1000,
      comissaoAgenciaTotal: 1000,
      consultorId: 'consultor-1',
    };

    const singleCliInsert = vi.fn().mockResolvedValue({ data: { id: 'cli-novo-id' }, error: null });
    const selectCliInsert = vi.fn().mockReturnValue({ single: singleCliInsert });
    const insertCli = vi.fn().mockReturnValue({ select: selectCliInsert });

    const singleViagemInsert = vi.fn().mockResolvedValue({ data: { id: 'viagem-gerada-1' }, error: null });
    const selectViagemInsert = vi.fn().mockReturnValue({ single: singleViagemInsert });
    const insertViagem = vi.fn().mockReturnValue({ select: selectViagemInsert });

    const insertProduto = vi.fn().mockResolvedValue({ error: null });
    const updateOrcEq = vi.fn().mockResolvedValue({ error: null });
    const updateOrc = vi.fn().mockReturnValue({ eq: updateOrcEq });
    const insertOrc = vi.fn().mockResolvedValue({ error: null });

    const updateCliEq = vi.fn().mockResolvedValue({ error: null });
    const updateCli = vi.fn().mockReturnValue({ eq: updateCliEq });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clientes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
          insert: insertCli,
          update: updateCli,
        } as any;
      }
      if (table === 'viagens') return { insert: insertViagem } as any;
      if (table === 'produtos_viagem') return { insert: insertProduto } as any;
      if (table === 'orcamentos') {
        return {
          update: updateOrc,
          insert: insertOrc,
        } as any;
      }
      return {} as any;
    });

    // Action
    const resultado = await OrcamentosService.convertToTrip(orcMock, optionsMock);

    // Assert
    expect(resultado.clienteId).toBe('cli-novo-id');
    expect(resultado.newViagemId).toBe('viagem-gerada-1');
    expect(insertViagem).toHaveBeenCalled();
    expect(insertProduto).toHaveBeenCalled();
    expect(updateOrc).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONCLUIDO', sub_status: 'ACEITO' }));
    expect(registrarXp).toHaveBeenCalledWith('consultor-1', 'venda_aceita_uuid-orc-aprovado-1', 100);
  });

  it('deve realizar retry automático removendo colunas extras se o banco retornar erro 42703', async () => {
    // Setup
    const erroColunaInexistente = { code: '42703', message: 'column valor_proposta does not exist' };
    const insertComErro = vi.fn().mockResolvedValueOnce({ error: erroColunaInexistente });
    const insertComSucesso = vi.fn().mockResolvedValueOnce({ error: null });

    const insertMock = vi.fn()
      .mockImplementationOnce(insertComErro)
      .mockImplementationOnce(insertComSucesso);

    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    const orcamentoComColunasExtras: any = {
      id: 'orc-novo-99',
      consultorId: 'c-1',
      nomeCliente: 'Marina',
      valorProposta: 10000,
      valorViagem: 11000,
    };

    // Action
    const res = await OrcamentosService.persistOrcamento(orcamentoComColunasExtras);

    // Assert
    expect(res.success).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it('deve utilizar a RPC atualizar_orcamento_co_piloto caso ocorra bloqueio de RLS no update direto', async () => {
    // Setup
    const erroRls = { code: '42501', message: 'new row violates row-level security policy' };
    const eqMock = vi.fn().mockResolvedValue({ error: erroRls });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as any);

    const orcamentoCoPiloto: any = {
      id: 'uuid-orc-copiloto',
      consultorId: 'outro-consultor',
      nomeCliente: 'Cliente Compartilhado',
    };

    // Action
    const res = await OrcamentosService.persistOrcamento(orcamentoCoPiloto);

    // Assert
    expect(res.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('atualizar_orcamento_co_piloto', {
      p_orc_id: 'uuid-orc-copiloto',
      p_payload: expect.any(Object),
    });
  });
});
