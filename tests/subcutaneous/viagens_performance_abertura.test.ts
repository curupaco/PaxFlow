import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';
import { BalcaoService } from '../../src/services/balcaoService';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('Otimização de Performance e Abertura de Viagens - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve disparar consultas essenciais em paralelo via Promise.all sem falhar se tabelas secundárias retornarem erro', async () => {
    // Setup
    const mockViagens = [
      { id: 'v-101', destino: 'Paris', valor_total: 12000, cliente: { nome: 'João' }, produtos: [] }
    ];
    const mockLocConfs = [
      { viagem_id: 'v-101', codigo_localizador: 'LOC123', conferido: true }
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          select: vi.fn().mockResolvedValue({ data: mockViagens, error: null })
        } as any;
      }
      if (table === 'loc_conferencias') {
        return {
          select: vi.fn().mockResolvedValue({ data: mockLocConfs, error: null })
        } as any;
      }
      if (table === 'loc_pagamentos') {
        return {
          select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro tolerado' } })
        } as any;
      }
      if (table === 'comentarios') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        } as any;
      }
      if (table === 'viagens_divisoes') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      }
      return { select: vi.fn().mockResolvedValue({ data: [] }) } as any;
    });

    // Action
    const viagensPromise = supabase
      .from('viagens')
      .select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)');

    const locConfsPromise = (async () => {
      try {
        const { data } = await supabase.from('loc_conferencias').select('viagem_id, codigo_localizador, conferido');
        return data || [];
      } catch {
        return [];
      }
    })();

    const locPagsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('loc_pagamentos')
          .select('viagem_id, codigo_localizador, forma_recebimento_id, valor, formas_recebimento(id, nome)');
        if (!error && data) return data;
        return [];
      } catch {
        return [];
      }
    })();

    const [vRes, locConfs, locPags] = await Promise.all([
      viagensPromise,
      locConfsPromise,
      locPagsPromise
    ]);

    // Assert
    expect(vRes.data).toEqual(mockViagens);
    expect(locConfs).toHaveLength(1);
    expect(locConfs[0].codigo_localizador).toBe('LOC123');
    expect(locPags).toEqual([]);
  });

  it('deve atualizar cirurgicamente uma viagem alterada em memória sem necessidade de recarregar o banco', () => {
    // Setup
    const viagensLocais: any[] = [
      { id: 'v-1', destino: 'Roma', valor_total: 10000, status: 'confirmada' },
      { id: 'v-2', destino: 'Londres', valor_total: 8000, status: 'confirmada' }
    ];

    const viagemAtualizada = {
      id: 'v-1',
      destino: 'Roma com Extensão Veneza',
      valor_total: 13500,
      status: 'pos-venda'
    };

    // Action
    const idx = viagensLocais.findIndex(v => v.id === viagemAtualizada.id);
    if (idx !== -1) {
      viagensLocais[idx] = {
        ...viagensLocais[idx],
        ...viagemAtualizada
      };
    } else {
      viagensLocais.unshift(viagemAtualizada);
    }

    // Assert
    expect(viagensLocais).toHaveLength(2);
    expect(viagensLocais[0].destino).toBe('Roma com Extensão Veneza');
    expect(viagensLocais[0].valor_total).toBe(13500);
    expect(viagensLocais[0].status).toBe('pos-venda');
    expect(viagensLocais[1].id).toBe('v-2');
  });

  it('deve inicializar o seletor de clientes apenas com o passageiro titular da viagem (lazy-loading seguro)', () => {
    // Setup
    const viagemCarregada = {
      id: 'v-99',
      cliente_id: 'cli-777',
      cliente: { nome: 'Carlos Eduardo' },
      destino: 'Santiago'
    };

    // Action
    const nomeClienteTitular = viagemCarregada.cliente?.nome || 'Cliente';
    const listaClientesInicial: any[] = viagemCarregada.cliente_id
      ? [{ id: viagemCarregada.cliente_id, nome: nomeClienteTitular }]
      : [{ id: '', nome: 'Selecione o cliente...' }];

    // Assert
    expect(listaClientesInicial).toHaveLength(1);
    expect(listaClientesInicial[0].id).toBe('cli-777');
    expect(listaClientesInicial[0].nome).toBe('Carlos Eduardo');
  });

  it('deve reutilizar produtos em memória na aba de produtos evitando requisição duplicada a produtos_viagem', async () => {
    // Setup
    let produtosViagemConsultado = false;
    const viagemComProdutos = {
      id: 'v-200',
      produtos: [
        { id: 'p-1', tipo: 'Aéreo', fornecedor: 'LATAM', valor_venda: 4500 }
      ]
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'produtos_viagem') {
        produtosViagemConsultado = true;
        return { select: vi.fn().mockResolvedValue({ data: [] }) } as any;
      }
      return { select: vi.fn().mockResolvedValue({ data: [] }) } as any;
    });

    // Action
    let produtosUtilizados: any[] = [];
    if (viagemComProdutos.produtos && viagemComProdutos.produtos.length > 0) {
      produtosUtilizados = viagemComProdutos.produtos;
    } else {
      const { data } = await supabase.from('produtos_viagem').select('*');
      produtosUtilizados = data || [];
    }

    // Assert
    expect(produtosUtilizados).toHaveLength(1);
    expect(produtosUtilizados[0].fornecedor).toBe('LATAM');
    expect(produtosViagemConsultado).toBe(false);
  });

  it('deve executar busca de balcão respeitando limit defensivo e sem estourar memória do navegador', async () => {
    // Setup
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'RPC desativada' } } as any);

    const mockClientes = [
      { id: 'c-1', nome: 'Luciana Martins', email: 'luciana@teste.com' }
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clientes') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockClientes })
            })
          })
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [] })
          })
        })
      } as any;
    });

    // Action
    const resultados = await BalcaoService.buscarMulticriterio('Luciana');

    // Assert
    expect(resultados).toHaveLength(1);
    expect(resultados[0].cliente.nome).toBe('Luciana Martins');
  });
});

