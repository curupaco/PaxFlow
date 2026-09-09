import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BalcaoService } from '../../src/services/balcaoService';
import { supabase } from '../../src/services/supabase';
import { EscalaService } from '../../src/services/escalaService';

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

vi.mock('../../src/services/escalaService', () => ({
  EscalaService: {
    criarSolicitacao: vi.fn().mockResolvedValue({ success: true, data: { id: 'sol-balcao-1' } }),
  },
}));

describe('BalcaoService - Testes Subcutâneos (Co-Piloto & Balcão)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar lista vazia se a busca tiver menos de 2 caracteres', async () => {
    // Setup
    const termoCurto = 'a';

    // Action
    const resultado = await BalcaoService.buscarMulticriterio(termoCurto);

    // Assert
    expect(resultado).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('deve utilizar os dados retornados pela RPC de alta performance quando disponível', async () => {
    // Setup
    const rpcMockData = [
      {
        cliente: { id: 'cli-10', nome: 'Eduardo Costa', cpf: '12345678900' },
        orcamentos: [],
        viagens: [{ id: 'v-10', titulo: 'Viagem para Lisboa', consultorNome: 'Mariana', consultorId: 'u2', destino: 'Lisboa', status: 'ativa' }],
        reembolsos: [],
      },
    ];
    vi.mocked(supabase.rpc).mockResolvedValue({ data: rpcMockData, error: null } as any);

    // Action
    const resultado = await BalcaoService.buscarMulticriterio('Eduardo');

    // Assert
    expect(resultado).toEqual(rpcMockData);
    expect(supabase.rpc).toHaveBeenCalledWith('buscar_balcao_co_piloto', { query_text: 'Eduardo' });
  });

  it('deve executar busca fallback por nome do cliente correlacionando orçamentos e viagens', async () => {
    // Setup
    // RPC falha/retorna vazio para acionar fallback
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'RPC inexistente' } } as any);

    const perfisMock = [{ id: 'c-1', nome: 'Consultor Carlos' }];
    const clientesMock = [{ id: 'cli-100', nome: 'Beatriz Almeida', telefone: '11988884444', email: 'beatriz@email.com' }];
    const viagensMock = [
      { id: 'v-1', cliente_id: 'cli-100', consultor_id: 'c-1', destino: 'Orlando', status: 'confirmada', codigo_ref: 'VIA-01' },
    ];
    const orcamentosMock = [
      { id: 'o-1', cliente_id: 'cli-100', consultor_id: 'c-1', destino: 'Orlando', valor_proposta: 9800, created_at: '2026-09-01' },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockResolvedValue({ data: perfisMock }) } as any;
      if (table === 'clientes') return { select: vi.fn().mockResolvedValue({ data: clientesMock }) } as any;
      if (table === 'viagens') return { select: vi.fn().mockResolvedValue({ data: viagensMock }) } as any;
      if (table === 'orcamentos') return { select: vi.fn().mockResolvedValue({ data: orcamentosMock }) } as any;
      return {} as any;
    });

    // Action
    const resultado = await BalcaoService.buscarMulticriterio('beatriz');

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].cliente.id).toBe('cli-100');
    expect(resultado[0].cliente.nome).toBe('Beatriz Almeida');
    expect(resultado[0].viagens).toHaveLength(1);
    expect(resultado[0].viagens[0].destino).toBe('Orlando');
    expect(resultado[0].orcamentos).toHaveLength(1);
    expect(resultado[0].orcamentos[0].id).toBe('o-1');
  });

  it('deve localizar viagem avulsa por código localizador no fallback', async () => {
    // Setup
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

    const viagensMock = [
      {
        id: 'v-loc-99',
        cliente_id: null,
        nome_cliente: 'Passageiro Localizador',
        destino: 'Miami',
        codigo_localizador: 'XYZ123',
        consultor_id: 'c-1',
        status: 'ativa',
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') return { select: vi.fn().mockResolvedValue({ data: [] }) } as any;
      if (table === 'clientes') return { select: vi.fn().mockResolvedValue({ data: [] }) } as any;
      if (table === 'viagens') return { select: vi.fn().mockResolvedValue({ data: viagensMock }) } as any;
      if (table === 'orcamentos') return { select: vi.fn().mockResolvedValue({ data: [] }) } as any;
      return {} as any;
    });

    // Action
    const resultado = await BalcaoService.buscarMulticriterio('xyz123');

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].cliente.id).toBe('viagem-v-loc-99');
    expect(resultado[0].cliente.nome).toBe('Passageiro Localizador');
    expect(resultado[0].viagens[0].titulo).toContain('[LOC XYZ123]');
  });

  it('deve disparar alerta de atendimento no balcão para o consultor titular via EscalaService', async () => {
    // Setup
    const titularId = 'user-titular-1';
    const titularNome = 'Amanda Silveira';
    const clienteNome = 'Carlos Alberto';
    const consultorCoPilotoNome = 'Renata Co-Piloto';
    const tipoItem = 'orçamento';
    const itemId = 'orc-777';
    const coPilotoId = 'user-copiloto-2';

    // Action
    const sucesso = await BalcaoService.gerarAlertaAtendimentoBalcao(
      titularId,
      titularNome,
      clienteNome,
      consultorCoPilotoNome,
      tipoItem,
      itemId,
      coPilotoId
    );

    // Assert
    expect(sucesso).toBe(true);
    expect(EscalaService.criarSolicitacao).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'atendimento_balcao',
        solicitante_id: coPilotoId,
        solicitante_nome: consultorCoPilotoNome,
        destinatario_id: titularId,
        destinatario_nome: titularNome,
        status: 'aprovado',
        motivo: expect.stringContaining('Carlos Alberto foi atendido no balcão por Renata Co-Piloto'),
      })
    );
  });

  it('deve localizar cliente por CPF mesmo quando o usuário digitar máscara com pontos e traços', async () => {
    // Setup
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

    const clientesMock = [
      { id: 'cli-cpf-1', nome: 'Márcio Souza', cpf: '98765432100', documento: '98765432100' },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clientes') return { select: vi.fn().mockResolvedValue({ data: clientesMock }) } as any;
      return { select: vi.fn().mockResolvedValue({ data: [] }) } as any;
    });

    // Action - Busca digitada com máscara completa
    const resultado = await BalcaoService.buscarMulticriterio('987.654.321-00');

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].cliente.id).toBe('cli-cpf-1');
    expect(resultado[0].cliente.nome).toBe('Márcio Souza');
  });

  it('deve deduplicar viagens e orçamentos de um mesmo cliente em um único registro consolidado', async () => {
    // Setup
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

    const clientesMock = [{ id: 'cli-multi', nome: 'Camila Ferreira' }];
    // Duas referências com o mesmo ID para simular duplicata de join
    const viagensMock = [
      { id: 'v-dup-1', cliente_id: 'cli-multi', destino: 'Madri', status: 'ativa' },
      { id: 'v-dup-1', cliente_id: 'cli-multi', destino: 'Madri', status: 'ativa' },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clientes') return { select: vi.fn().mockResolvedValue({ data: clientesMock }) } as any;
      if (table === 'viagens') return { select: vi.fn().mockResolvedValue({ data: viagensMock }) } as any;
      return { select: vi.fn().mockResolvedValue({ data: [] }) } as any;
    });

    // Action
    const resultado = await BalcaoService.buscarMulticriterio('Camila');

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].viagens).toHaveLength(1); // Deduplicado por ID
    expect(resultado[0].viagens[0].id).toBe('v-dup-1');
  });
});
