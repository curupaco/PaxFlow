import { describe, it, expect } from 'vitest';
import {
  calcularTaxaConversao,
  calcularTicketMedioPax,
  agruparVendasPorCategoriaProduto,
  gerarRankingConsultores
} from '../../src/controllers/relatoriosController';

describe('RelatoriosController - Métricas Comerciais e Desempenho da Agência', () => {
  it('deve calcular taxa de conversão do funil de vendas com proteção contra divisão por zero', () => {
    // Setup & Action & Assert
    expect(calcularTaxaConversao(10, 4)).toBe(40.0);
    expect(calcularTaxaConversao(25, 8)).toBe(32.0);
    expect(calcularTaxaConversao(7, 3)).toBe(42.9); // Arredondamento com 1 casa decimal
    expect(calcularTaxaConversao(0, 0)).toBe(0);
    expect(calcularTaxaConversao(-5, 2)).toBe(0);
  });

  it('deve calcular ticket médio por viagem e por passageiro (PAX)', () => {
    // Setup
    const viagens = [
      { valor_total: 10000, passageiros: [{ nome: 'Pax 1' }, { nome: 'Pax 2' }] }, // 2 pax
      { valor_total: 6000, passageiros: [] }, // fallback 1 pax
      { valor_total: 8000, passageiros: [{ nome: 'Pax A' }] }, // 1 pax
    ];

    // Action
    const resultado = calcularTicketMedioPax(viagens);

    // Assert
    // Total Valor = 24.000 / 3 viagens = 8.000
    // Total Pax = 2 + 1 + 1 = 4 pax -> 24.000 / 4 = 6.000
    expect(resultado.ticketMedioViagem).toBe(8000);
    expect(resultado.ticketMedioPax).toBe(6000);
  });

  it('deve retornar ticket médio zerado para lista vazia de viagens', () => {
    // Setup & Action
    const res = calcularTicketMedioPax([]);

    // Assert
    expect(res.ticketMedioViagem).toBe(0);
    expect(res.ticketMedioPax).toBe(0);
  });

  it('deve agrupar faturamento por categoria de produto ignorando itens cancelados', () => {
    // Setup
    const produtos = [
      { tipo: 'Aéreo Internacional', valor_venda: 5000, status: 'emitido' },
      { tipo: 'Hotel Resort', valor_venda: 4000, status: 'emitido' },
      { tipo: 'Seguro Viagem', valor_venda: 500, status: 'emitido' },
      { tipo: 'Cruzeiro MSC', valor_venda: 6000, status: 'emitido' },
      { tipo: 'Passeio Ingresso', valor_venda: 800, status: 'emitido' }, // Outros
      { tipo: 'Aéreo Cancelado', valor_venda: 3000, status: 'cancelado' }, // Não deve somar
    ];

    // Action
    const categorias = agruparVendasPorCategoriaProduto(produtos);

    // Assert
    expect(categorias.Aereo.totalValor).toBe(5000);
    expect(categorias.Hospedagem.totalValor).toBe(4000);
    expect(categorias.Seguro.totalValor).toBe(500);
    expect(categorias.Cruzeiro.totalValor).toBe(6000);
    expect(categorias.Outros.totalValor).toBe(800);
    expect(categorias.Aereo.quantidade).toBe(1);
  });

  it('deve lidar com produtos nulos ou vazios no agrupamento de vendas por categoria', () => {
    // Setup & Action
    const categorias = agruparVendasPorCategoriaProduto(null as any);

    // Assert
    expect(categorias.Aereo.totalValor).toBe(0);
    expect(categorias.Hospedagem.totalValor).toBe(0);
    expect(categorias.Cruzeiro.totalValor).toBe(0);
    expect(categorias.Seguro.totalValor).toBe(0);
    expect(categorias.Outros.totalValor).toBe(0);
  });

  it('deve gerar ranking de consultores ordenado decrescentemente por faturamento total', () => {
    // Setup
    const viagens = [
      { consultor_id: 'c1', consultor_nome: 'Marinna Morena', valor_total: 50000, status: 'fechado' },
      { consultor_id: 'c2', consultor_nome: 'Guto Brassaroto', valor_total: 80000, status: 'fechado' },
      { consultor_id: 'c1', consultor_nome: 'Marinna Morena', valor_total: 40000, status: 'fechado' },
      { consultor_id: 'c3', consultor_nome: 'Maria Carvalho', valor_total: 20000, status: 'cancelado' }, // Não deve contar
    ];

    // Action
    const ranking = gerarRankingConsultores(viagens);

    // Assert
    expect(ranking).toHaveLength(2);
    // 1º lugar: Marinna (50k + 40k = 90k)
    expect(ranking[0].consultorNome).toBe('Marinna Morena');
    expect(ranking[0].totalVendas).toBe(90000);
    expect(ranking[0].totalViagens).toBe(2);

    // 2º lugar: Guto (80k)
    expect(ranking[1].consultorNome).toBe('Guto Brassaroto');
    expect(ranking[1].totalVendas).toBe(80000);
  });

  it('deve agrupar vendas sem consultor atribuído sob a agência geral', () => {
    // Setup - Vendas sem consultor
    const vendasAgencia = [
      { valor_total: 15000, status: 'fechado' } // consultor_id omitido
    ];

    // Action
    const ranking = gerarRankingConsultores(vendasAgencia);

    // Assert
    expect(ranking).toHaveLength(1);
    expect(ranking[0].consultorId).toBe('agencia');
    expect(ranking[0].consultorNome).toBe('Consultor Não Identificado');
    expect(ranking[0].totalVendas).toBe(15000);
  });
});
