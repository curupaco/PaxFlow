import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrcamentosService } from '../../src/services/orcamentosService';
import { ClienteSearchService } from '../../src/services/clienteSearchService';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('OrcamentosService - Recomendação e Busca de Clientes (Subcutâneo)', () => {
  const listaClientesMock = [
    {
      id: 'cli-001',
      codigo_ref: 'CLI-0001',
      nome: 'João da Silva Santos',
      email: 'joao.silva@gmail.com',
      telefone: '(11) 98765-4321',
      documento: '123.456.789-00',
      documento_limpo: '12345678900',
      telefone_limpo: '11987654321'
    },
    {
      id: 'cli-002',
      codigo_ref: 'CLI-0002',
      nome: 'Maria Aparecida de Souza',
      email: 'maria.souza@empresa.com.br',
      telefone: '(21) 99888-7777',
      documento: '987.654.321-99',
      documento_limpo: '98765432199',
      telefone_limpo: '21998887777'
    },
    {
      id: 'cli-003',
      codigo_ref: 'CLI-0003',
      nome: 'Érica Álvares Guimarães',
      email: 'erica.guimaraes@viagens.com',
      telefone: '+55 (31) 3222-1111',
      documento: '456.789.123-45',
      documento_limpo: '45678912345',
      telefone_limpo: '3132221111'
    },
    {
      id: 'cli-004',
      codigo_ref: 'CLI-0004',
      nome: 'Carlos Eduardo Passos',
      email: 'carlos.passos@outlook.com',
      telefone: '(41) 99111-2233',
      documento: '333.444.555-66',
      documento_limpo: '33344455566',
      telefone_limpo: '41991112233'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve recomendar cliente ao buscar por nome com ou sem acentos', () => {
    // Setup
    const termoComAcento = 'Érica';
    const termoSemAcento = 'erica';
    const termoMeioNome = 'Aparecida';

    // Action
    const resAcento = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, termoComAcento);
    const resSemAcento = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, termoSemAcento);
    const resMeio = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, termoMeioNome);

    // Assert
    expect(resAcento.map(c => c.id)).toContain('cli-003');
    expect(resSemAcento.map(c => c.id)).toContain('cli-003');
    expect(resMeio.map(c => c.id)).toContain('cli-002');
  });

  it('deve recomendar cliente ao buscar por CPF com pontuação', () => {
    // Setup
    const cpfFormatado = '123.456.789-00';

    // Action
    const resultado = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, cpfFormatado);

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('João da Silva Santos');
    expect(resultado[0].id).toBe('cli-001');
  });

  it('deve recomendar cliente ao buscar por CPF apenas com números sem pontuação', () => {
    // Setup
    const cpfNumeros = '98765432199';
    const cpfParcial = '987654';

    // Action
    const resultadoCompleto = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, cpfNumeros);
    const resultadoParcial = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, cpfParcial);

    // Assert
    expect(resultadoCompleto).toHaveLength(1);
    expect(resultadoCompleto[0].nome).toBe('Maria Aparecida de Souza');
    expect(resultadoParcial.map(c => c.id)).toContain('cli-002');
  });

  it('deve recomendar cliente ao buscar por e-mail completo ou parcial', () => {
    // Setup
    const emailCompleto = 'carlos.passos@outlook.com';
    const emailParcial = 'carlos.passos';
    const dominio = 'empresa.com.br';

    // Action
    const resCompleto = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, emailCompleto);
    const resParcial = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, emailParcial);
    const resDominio = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, dominio);

    // Assert
    expect(resCompleto[0]?.id).toBe('cli-004');
    expect(resParcial[0]?.id).toBe('cli-004');
    expect(resDominio[0]?.id).toBe('cli-002');
  });

  it('deve recomendar cliente ao buscar por telefone com formatação, apenas dígitos ou sem DDD', () => {
    // Setup
    const telFormatado = '(11) 98765-4321';
    const telNumeros = '11987654321';
    const telSemDdd = '987654321';

    // Action
    const resFormatado = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, telFormatado);
    const resNumeros = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, telNumeros);
    const resSemDdd = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, telSemDdd);

    // Assert
    expect(resFormatado[0]?.id).toBe('cli-001');
    expect(resNumeros[0]?.id).toBe('cli-001');
    expect(resSemDdd[0]?.id).toBe('cli-001');
  });

  it('deve recomendar cliente ao buscar por código de referência', () => {
    // Setup
    const codRef = 'CLI-0004';

    // Action
    const resultado = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, codRef);

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('Carlos Eduardo Passos');
  });

  it('deve retornar array vazio para termos vazios ou sem correspondência', () => {
    // Setup
    const termoVazio = '   ';
    const termoInexistente = 'NomeInexistenteXYZ123';

    // Action
    const resVazio = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, termoVazio);
    const resInexistente = OrcamentosService.filtrarClientesRecomendados(listaClientesMock, termoInexistente);

    // Assert
    expect(resVazio).toEqual([]);
    expect(resInexistente).toEqual([]);
  });

  it('deve funcionar com ClienteSearchService.matchCliente mantendo paridade nas buscas', () => {
    // Setup
    const cliente = listaClientesMock[0];

    // Action & Assert
    expect(ClienteSearchService.matchCliente(cliente, 'João')).toBe(true);
    expect(ClienteSearchService.matchCliente(cliente, '12345678900')).toBe(true);
    expect(ClienteSearchService.matchCliente(cliente, '123.456.789-00')).toBe(true);
    expect(ClienteSearchService.matchCliente(cliente, 'joao.silva@gmail.com')).toBe(true);
    expect(ClienteSearchService.matchCliente(cliente, '987654321')).toBe(true);
    expect(ClienteSearchService.matchCliente(cliente, 'CLI-0001')).toBe(true);
    expect(ClienteSearchService.matchCliente(cliente, '99999999999')).toBe(false);
  });
});
