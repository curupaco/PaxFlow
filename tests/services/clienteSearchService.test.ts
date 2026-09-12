import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClienteSearchService } from '../../src/services/clienteSearchService';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('ClienteSearchService - Testes Subcutâneos de Busca e Resiliência', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve construir filtro com documento_limpo e telefone_limpo ao pesquisar por dígitos numéricos', () => {
    // Setup
    const cpfSemPontuacao = '33687583813';

    // Action
    const filtro = ClienteSearchService.buildOrFilter(cpfSemPontuacao, true);

    // Assert
    expect(filtro).toContain('documento_limpo.ilike.%33687583813%');
    expect(filtro).toContain('telefone_limpo.ilike.%33687583813%');
    expect(filtro).toContain('documento.ilike.%336.875.838-13%');
  });

  it('deve encontrar correspondência em memória para CPF ou telefone independentemente de pontuação', () => {
    // Setup
    const clienteComMascara = {
      nome: 'Carlos Eduardo',
      email: 'carlos@paxflow.com',
      documento: '336.875.838-13',
      telefone: '(11) 98765-4321'
    };

    // Action
    const matchCpfCompleto = ClienteSearchService.matchCliente(clienteComMascara, '33687583813');
    const matchCpfParcial = ClienteSearchService.matchCliente(clienteComMascara, '336875');
    const matchCpfMeio = ClienteSearchService.matchCliente(clienteComMascara, '875838');
    const matchTelSemDdd = ClienteSearchService.matchCliente(clienteComMascara, '987654321');
    const matchTelComDdd = ClienteSearchService.matchCliente(clienteComMascara, '11987654321');
    const matchInvalido = ClienteSearchService.matchCliente(clienteComMascara, '999999');

    // Assert
    expect(matchCpfCompleto).toBe(true);
    expect(matchCpfParcial).toBe(true);
    expect(matchCpfMeio).toBe(true);
    expect(matchTelSemDdd).toBe(true);
    expect(matchTelComDdd).toBe(true);
    expect(matchInvalido).toBe(false);
  });

  it('deve realizar busca no banco com colunas limpas quando o schema estiver atualizado', async () => {
    // Setup
    const mockClientesData = [
      { id: 'cli-1', nome: 'Ana Paula', documento: '336.875.838-13', telefone: '(11) 98765-4321' }
    ];
    const orMock = vi.fn().mockResolvedValue({ data: mockClientesData, error: null, count: 1 });
    const rangeMock = vi.fn().mockReturnValue({ or: orMock });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    const mockClient = {
      from: vi.fn().mockReturnValue({ select: selectMock })
    };

    // Action
    const resultado = await ClienteSearchService.buscarClientes({
      termo: '336875',
      clientOverride: mockClient
    });

    // Assert
    expect(resultado.fallbackUsed).toBe(false);
    expect(resultado.data).toEqual(mockClientesData);
    expect(resultado.count).toBe(1);
    expect(orMock).toHaveBeenCalledWith(expect.stringContaining('documento_limpo.ilike.%336875%'));
  });

  it('deve acionar fallback resiliente (Padrão Zero-Break) quando o banco retornar erro 42703 (coluna inexistente)', async () => {
    // Setup
    const mockClientesDataFallback = [
      { id: 'cli-1', nome: 'Carlos Eduardo', documento: '336.875.838-13', telefone: '(11) 98765-4321' }
    ];

    let chamadasOr = 0;
    const orMock = vi.fn().mockImplementation((filtro: string) => {
      chamadasOr++;
      if (chamadasOr === 1) {
        // Primeira chamada simula erro 42703 (coluna documento_limpo não existe no banco antes da migration)
        return Promise.resolve({
          data: null,
          error: { code: '42703', message: 'column clientes.documento_limpo does not exist' },
          count: null
        });
      }
      // Segunda chamada (fallback) executa com sucesso sem as colunas geradas
      return Promise.resolve({
        data: mockClientesDataFallback,
        error: null,
        count: mockClientesDataFallback.length
      });
    });

    const rangeMock = vi.fn().mockReturnValue({ or: orMock });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    const mockClient = {
      from: vi.fn().mockReturnValue({ select: selectMock })
    };

    // Action
    const resultado = await ClienteSearchService.buscarClientes({
      termo: '336875',
      clientOverride: mockClient
    });

    // Assert
    expect(resultado.fallbackUsed).toBe(true);
    expect(resultado.data.length).toBe(1);
    expect(resultado.data[0].id).toBe('cli-1');
    expect(chamadasOr).toBe(2);
  });
});
