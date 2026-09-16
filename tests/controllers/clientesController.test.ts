import { describe, it, expect } from 'vitest';
import {
  normalizarPassaportesCliente,
  verificarAlertaValidadePassaporte,
  filtrarClientesCarteira,
  gerenciarSelecaoEmMassa,
  calcularCompletudeCadastral,
  consolidarLinhaDoTempoCliente
} from '../../src/controllers/clientesController';

describe('ClientesController - Testes Subcutâneos', () => {
  it('deve normalizar passaportes legados e múltiplos em array estruturado', () => {
    // Setup
    const clienteLegado = {
      nome: 'João Silva',
      passaporte_numero: 'FP123456',
      passaporte_validade: '2028-10-15'
    };

    const clienteComMultiplos = {
      nome: 'Família Souza',
      passaportes: [
        { nome: 'Pedro Souza', numero: 'FP111111', validade: '2029-01-01' },
        { nome: 'Ana Souza', numero: 'FP222222', validade: '2027-05-10' }
      ]
    };

    const clienteSemPassaporte = {
      nome: 'Carlos Sem Doc'
    };

    // Action
    const passLegado = normalizarPassaportesCliente(clienteLegado);
    const passMultiplos = normalizarPassaportesCliente(clienteComMultiplos);
    const passVazio = normalizarPassaportesCliente(clienteSemPassaporte);

    // Assert
    expect(passLegado).toHaveLength(1);
    expect(passLegado[0].numero).toBe('FP123456');
    expect(passLegado[0].nome).toBe('João Silva');

    expect(passMultiplos).toHaveLength(2);
    expect(passMultiplos[0].nome).toBe('Pedro Souza');
    expect(passMultiplos[1].nome).toBe('Ana Souza');

    expect(passVazio).toHaveLength(0);
  });

  it('deve classificar alertas de validade de passaporte (< 6 meses para viagens internacionais)', () => {
    // Setup
    const refDate = new Date('2026-09-09T12:00:00.000Z').getTime();
    const dataVencida = '2026-08-01';
    const dataExpirandoEm4Meses = '2027-01-15';
    const dataSegura2Anos = '2028-10-10';

    // Action & Assert
    expect(verificarAlertaValidadePassaporte(dataVencida, refDate)).toBe('vencido');
    expect(verificarAlertaValidadePassaporte(dataExpirandoEm4Meses, refDate)).toBe('expirando_em_breve');
    expect(verificarAlertaValidadePassaporte(dataSegura2Anos, refDate)).toBe('valido');
  });

  it('deve testar os limites de fronteira exatos de 180 e 181 dias para validade de passaporte', () => {
    // Setup
    const refDate = new Date('2026-09-10T12:00:00.000Z').getTime();
    const exatos180Dias = new Date(refDate + 180 * 86400 * 1000).toISOString().split('T')[0];
    const maisDe180Dias = new Date(refDate + 185 * 86400 * 1000).toISOString().split('T')[0];

    // Action & Assert
    expect(verificarAlertaValidadePassaporte(exatos180Dias, refDate)).toBe('expirando_em_breve');
    expect(verificarAlertaValidadePassaporte(maisDe180Dias, refDate)).toBe('valido');
    expect(verificarAlertaValidadePassaporte('', refDate)).toBe('valido'); // Vazio é seguro
  });

  it('deve filtrar carteira de clientes preservando privacidade sem busca e ampliando durante pesquisa', () => {
    // Setup
    const baseClientes = [
      { id: '1', nome: 'Cliente Thiago', consultor_responsavel_id: 'user-thiago' },
      { id: '2', nome: 'Cliente Marina', consultor_responsavel_id: 'user-marina' },
      { id: '3', nome: 'Cliente Novo', consultor_responsavel_id: 'user-thiago' }
    ];

    // Action
    // Thiago sem busca (só vê a própria carteira)
    const thiagoSemBusca = filtrarClientesCarteira(baseClientes, 'user-thiago', 'consultor', false);
    // Thiago buscando texto (acessa base toda para evitar cadastro duplicado)
    const thiagoComBusca = filtrarClientesCarteira(baseClientes, 'user-thiago', 'consultor', true);
    // Admin sem busca (vê base inteira)
    const adminSemBusca = filtrarClientesCarteira(baseClientes, 'user-admin', 'admin', false);

    // Assert
    expect(thiagoSemBusca).toHaveLength(2);
    expect(thiagoSemBusca.map(c => c.id)).toEqual(['1', '3']);
    expect(thiagoComBusca).toHaveLength(3);
    expect(adminSemBusca).toHaveLength(3);
  });

  it('deve reconhecer propriedade consultorResponsavelId em formato camelCase', () => {
    // Setup
    const baseClientesCamel = [
      { id: '1', nome: 'Cliente A', consultorResponsavelId: 'user-1' },
      { id: '2', nome: 'Cliente B', consultorResponsavelId: 'user-2' },
    ];

    // Action
    const resultado = filtrarClientesCarteira(baseClientesCamel, 'user-1', 'consultor', false);

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('1');
  });

  it('deve gerenciar seleção em lote (toggle, selecionar todos e limpar)', () => {
    // Setup
    let selecao = new Set<string>();

    // Action & Assert - Adicionar e remover cliente
    selecao = gerenciarSelecaoEmMassa(selecao, 'toggle', 'cli-1');
    expect(selecao.has('cli-1')).toBe(true);

    selecao = gerenciarSelecaoEmMassa(selecao, 'toggle', 'cli-2');
    expect(selecao.size).toBe(2);

    selecao = gerenciarSelecaoEmMassa(selecao, 'toggle', 'cli-1');
    expect(selecao.has('cli-1')).toBe(false);
    expect(selecao.size).toBe(1);

    // Action & Assert - Selecionar todos e limpar
    selecao = gerenciarSelecaoEmMassa(selecao, 'selecionar_todos', ['cli-1', 'cli-2', 'cli-3']);
    expect(selecao.size).toBe(3);

    selecao = gerenciarSelecaoEmMassa(selecao, 'limpar');
    expect(selecao.size).toBe(0);
  });

  it('deve calcular a completude cadastral corretamente com pendencias e nivel', () => {
    // Setup
    const clienteIncompleto = {
      nome: 'Carlos Viajante',
      email: 'carlos@teste.com'
    };

    const clienteCompleto = {
      nome: 'Mariana Souza',
      email: 'mariana@teste.com',
      telefone: '11999998888',
      documento: '12345678901',
      dataNascimento: '1990-05-15',
      passaporteNumero: 'FP999888',
      passaporteValidade: '2030-01-01'
    };

    // Action
    const compIncompleto = calcularCompletudeCadastral(clienteIncompleto);
    const compCompleto = calcularCompletudeCadastral(clienteCompleto);
    const compNulo = calcularCompletudeCadastral(null);

    // Assert
    expect(compIncompleto.porcentagem).toBe(40);
    expect(compIncompleto.nivel).toBe('baixo');
    expect(compIncompleto.pendencias).toContain('Telefone/WhatsApp');
    expect(compIncompleto.pendencias).toContain('CPF ou CNPJ');

    expect(compCompleto.porcentagem).toBe(100);
    expect(compCompleto.nivel).toBe('alto');
    expect(compCompleto.concluidos).toHaveLength(6);
    expect(compCompleto.pendencias).toHaveLength(0);

    expect(compNulo.porcentagem).toBe(0);
    expect(compNulo.nivel).toBe('baixo');
  });

  it('deve consolidar a linha do tempo Customer 360 em ordem cronológica decrescente', () => {
    // Setup
    const cliente = {
      id: 'cli-100',
      nome: 'Beatriz Reis',
      createdAt: '2026-01-10T10:00:00Z'
    };
    const orcamentos = [
      { id: 'orc-1', destino: 'Paris & Roma', valor_proposta: 18500, created_at: '2026-02-01T10:00:00Z', status: 'CONCLUIDO', sub_status: 'ACEITO' }
    ];
    const viagens = [
      { id: 'via-1', destino: 'Paris & Roma', valor_total: 18500, status: 'fechado', created_at: '2026-02-15T10:00:00Z', codigo_localizador: 'LOC123' }
    ];
    const anexos = [
      { id: 'anx-1', rotulo: 'Passaporte Beatriz', tipo_documento: 'PASSAPORTE', created_at: '2026-02-20T10:00:00Z' }
    ];
    const feedbacks = [
      { id: 'nps-1', nota: 10, comentario: 'Viagem perfeita!', created_at: '2026-03-05T10:00:00Z' }
    ];

    // Action
    const timeline = consolidarLinhaDoTempoCliente({ cliente, orcamentos, viagens, anexos, feedbacks });

    // Assert
    expect(timeline).toHaveLength(5);
    // Primeiro evento deve ser o mais recente (NPS em 05/03/2026)
    expect(timeline[0].tipo).toBe('nps');
    expect(timeline[0].titulo).toContain('Nota 10/10');
    // Último evento deve ser o cadastro do cliente em 10/01/2026
    expect(timeline[timeline.length - 1].tipo).toBe('cadastro');
  });
});

