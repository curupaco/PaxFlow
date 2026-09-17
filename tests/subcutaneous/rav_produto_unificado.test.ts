import { describe, it, expect, vi } from 'vitest';
import { calcularFaturamentoLucratividade } from '../../src/controllers/relatoriosController';
import { MetasService } from '../../src/services/metasService';
import type { MetaPeriodo } from '../../src/types/gamification';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  },
  getSessaoAtual: vi.fn().mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@agencia.com' },
    perfil: { id: 'admin-1', role: 'admin' },
    error: null
  })
}));

describe('Testes Subcutâneos - RAV Unificada como Linha de Produto Comercial', () => {
  it('deve calcular rentabilidade total (100% margem) quando a RAV é adicionada como produto de comissão integral', () => {
    // Setup
    const produtoRav = {
      id: 'prod-rav-1',
      tipo: 'RAV',
      fornecedor: 'AGÊNCIA',
      descricao: 'Taxa de Emissão e Serviço RAV',
      valor_venda: 250,
      tarifa: 0,
      taxa: 0,
      comissao: 250,
      markup: 0,
      status: 'emitido'
    };

    const produtoAereo = {
      id: 'prod-aereo-1',
      tipo: 'AÉREO',
      fornecedor: 'LATAM',
      descricao: 'Voo SP / Salvador',
      valor_venda: 2000,
      tarifa: 1700,
      taxa: 100,
      comissao: 200,
      markup: 0,
      status: 'emitido'
    };

    const viagem = {
      id: 'v-rav-test',
      valor_total: 2250,
      produtos: [produtoAereo, produtoRav]
    };

    // Action
    const resultado = calcularFaturamentoLucratividade([viagem], [], { tipoProduto: 'todos' });

    // Assert
    expect(resultado.faturamentoBruto).toBe(2250);
    expect(resultado.taxasTotal).toBe(100);
    expect(resultado.comissaoTotal).toBe(450); // 200 aéreo + 250 rav
    expect(resultado.lucroLiquidoReal).toBe(450); // 200 + 250
    expect(resultado.categorias).toHaveLength(2);
    
    const catRav = resultado.categorias.find(c => c.tipo === 'RAV');
    expect(catRav).toBeDefined();
    expect(catRav?.faturamento).toBe(250);
    expect(catRav?.comissao).toBe(250);
    expect(catRav?.lucro).toBe(250);
    expect(catRav?.margem).toBe(100); // 100% de margem
  });

  it('deve contabilizar atingimento de metas com produto RAV e compatibilidade retroativa', () => {
    // Setup
    const meta: MetaPeriodo = {
      id: 'meta-lucro-2026',
      nome: 'Meta Lucro Agência',
      data_inicio: '2026-09-01',
      data_fim: '2026-09-30',
      tipo_calculo: 'lucro',
      is_campanha: false,
      faixas: [
        { id: 'fx-1', periodo_id: 'meta-lucro-2026', nome: 'Ouro', valor_minimo: 1000, bonus_xp: 500, recompensa: '', cor: '#eab308' }
      ]
    };

    const viagens = [
      {
        id: 'v-101',
        consultor_id: 'consultor-alpha',
        status: 'fechado',
        data_financeiro: '2026-09-15',
        produtos: [
          { tipo: 'HOTEL', valor_venda: 5000, comissao: 500, markup: 200 }, // Lucro: 700
          { tipo: 'RAV', valor_venda: 300, comissao: 300, markup: 0 }        // Lucro: 300
        ]
      },
      {
        id: 'v-102',
        consultor_id: 'consultor-alpha',
        status: 'fechado',
        data_financeiro: '2026-09-16',
        produtos: [
          // Registro histórico com campo rav legado
          { tipo: 'PACOTE', valor_venda: 4000, comissao: 400, markup: 100, rav: 150 } // Lucro: 400 + 100 + 150 = 650
        ]
      }
    ];

    // Action
    const progresso = MetasService.calcularProgressoConsultor(meta, 'consultor-alpha', [], viagens);

    // Assert
    // Total atingido: (700 + 300) + (650) = 1650
    expect(progresso.totalAtingido).toBe(1650);
    expect(progresso.faixaAtual?.nome).toBe('Ouro');
  });

  it('deve validar consistência da fórmula de tarifa e rentabilidade de produto', () => {
    // Setup
    const venda = 1000;
    const taxa = 50;
    const comissao = 100;
    const markup = 50;

    // Action: Fórmula aplicada no modal EditTravelModal
    const tarifa = Math.max(0, venda - (taxa + comissao + markup));
    const rentabilidade = comissao + markup;

    // Assert
    expect(tarifa).toBe(800); // 1000 - (50 + 100 + 50)
    expect(rentabilidade).toBe(150); // 100 + 50
  });
});
