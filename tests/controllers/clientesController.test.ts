import { describe, it, expect } from 'vitest';
import { ClientePassaporte } from '../../src/types';

// Funções puras de controle extraídas e espelhadas da lógica da ClientesPage
export function normalizarPassaportesCliente(d: any): ClientePassaporte[] {
  if (Array.isArray(d.passaportes) && d.passaportes.length > 0) {
    return d.passaportes;
  }
  const num = d.passaporte_numero || d.passaporteNumero;
  if (num) {
    return [{
      nome: d.nome || 'Passageiro Titular',
      numero: num,
      validade: d.passaporte_validade || d.passaporteValidade || ''
    }];
  }
  return [];
}

export function verificarAlertaValidadePassaporte(validadeIsoStr: string, refDateMs: number = Date.now()): 'vencido' | 'expirando_em_breve' | 'valido' {
  if (!validadeIsoStr) return 'valido';
  const dataValidade = new Date(validadeIsoStr).getTime();
  const diffDias = (dataValidade - refDateMs) / (1000 * 3600 * 24);

  if (diffDias <= 0) {
    return 'vencido';
  } else if (diffDias <= 180) { // menos de 6 meses (regra de viagem internacional)
    return 'expirando_em_breve';
  }
  return 'valido';
}

export function filtrarClientesCarteira(
  clientes: any[],
  userId: string,
  userRole: string,
  temBusca: boolean
): any[] {
  // Se estiver buscando por texto, permite buscar em toda a agência para evitar duplicações
  if (temBusca) {
    return clientes;
  }
  // Sem busca: admin vê tudo, consultor vê apenas clientes da sua carteira
  if (userRole === 'admin') {
    return clientes;
  }
  return clientes.filter(c => (c.consultor_responsavel_id || c.consultorResponsavelId) === userId);
}

export function gerenciarSelecaoEmMassa(
  selecionados: Set<string>,
  acao: 'toggle' | 'selecionar_todos' | 'limpar',
  idOuIds?: string | string[]
): Set<string> {
  const novoSet = new Set(selecionados);

  if (acao === 'toggle' && typeof idOuIds === 'string') {
    if (novoSet.has(idOuIds)) {
      novoSet.delete(idOuIds);
    } else {
      novoSet.add(idOuIds);
    }
  } else if (acao === 'selecionar_todos' && Array.isArray(idOuIds)) {
    idOuIds.forEach(id => novoSet.add(id));
  } else if (acao === 'limpar') {
    novoSet.clear();
  }

  return novoSet;
}

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
});
