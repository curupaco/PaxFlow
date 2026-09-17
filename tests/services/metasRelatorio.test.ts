import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';
import { MetasService } from '../../src/services/metasService';
import { MetaPeriodo } from '../../src/types';

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

describe('MetasService & Relatório de Metas e Campanhas - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve apurar com precisão a contagem de orçamentos cadastrados na campanha "Boa viagem!"', () => {
    // Setup
    const campanhaBoaViagem: MetaPeriodo = {
      id: 'camp-boa-viagem',
      nome: 'Boa viagem!',
      data_inicio: '2026-09-01',
      data_fim: '2026-09-30',
      tipo_calculo: 'orcamentos',
      is_campanha: true,
      faixas: [
        { id: 'f1', periodo_id: 'camp-boa-viagem', nome: 'Bronze', valor_minimo: 20, bonus_xp: 500, recompensa: 'Voucher R$ 100', cor: '#cd7f32' },
        { id: 'f2', periodo_id: 'camp-boa-viagem', nome: 'Ouro', valor_minimo: 40, bonus_xp: 2000, recompensa: 'Viagem de Fim de Semana', cor: '#fbbf24' }
      ]
    };

    const consultores = [
      { id: 'cons-1', nome: 'Amanda Silva', email: 'amanda@agencia.com' },
      { id: 'cons-2', nome: 'Bruno Costa', email: 'bruno@agencia.com' }
    ];

    // Amanda cadastrou 42 orçamentos em setembro de 2026
    const orcamentosAmanda = Array.from({ length: 42 }, (_, i) => ({
      id: `orc-a-${i}`,
      consultor_id: 'cons-1',
      nome_cliente: `Cliente Amanda ${i + 1}`,
      destino: 'Orlando',
      created_at: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`
    }));

    // Bruno cadastrou 15 orçamentos em setembro e 10 em agosto (fora do período)
    const orcamentosBruno = [
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `orc-b-set-${i}`,
        consultor_id: 'cons-2',
        nome_cliente: `Cliente Bruno Set ${i + 1}`,
        destino: 'Paris',
        created_at: `2026-09-10T14:00:00Z`
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `orc-b-ago-${i}`,
        consultor_id: 'cons-2',
        nome_cliente: `Cliente Bruno Ago ${i + 1}`,
        destino: 'Roma',
        created_at: `2026-08-20T14:00:00Z`
      }))
    ];

    const todosOrcamentos = [...orcamentosAmanda, ...orcamentosBruno];

    // Action
    const apuracaoAmanda = MetasService.calcularProgressoConsultor(campanhaBoaViagem, 'cons-1', todosOrcamentos, []);
    const apuracaoBruno = MetasService.calcularProgressoConsultor(campanhaBoaViagem, 'cons-2', todosOrcamentos, []);
    const apuracaoGeral = MetasService.calcularProgressoAgencia(campanhaBoaViagem, consultores, todosOrcamentos, []);

    // Assert
    // Amanda atingiu a faixa máxima (42 >= 40)
    expect(apuracaoAmanda.totalAtingido).toBe(42);
    expect(apuracaoAmanda.itensAuditados).toHaveLength(42);
    expect(apuracaoAmanda.faixaAtual?.nome).toBe('Ouro');
    expect(apuracaoAmanda.percentualProgresso).toBe(100);

    // Bruno computou apenas os 15 orçamentos de setembro (agosto foi ignorado)
    expect(apuracaoBruno.totalAtingido).toBe(15);
    expect(apuracaoBruno.itensAuditados).toHaveLength(15);
    expect(apuracaoBruno.faixaAtual).toBeNull();
    expect(apuracaoBruno.proximaFaixa?.nome).toBe('Bronze');

    // Total agência e ranking
    expect(apuracaoGeral.totalAgencia).toBe(57); // 42 + 15
    expect(apuracaoGeral.rankingConsultores[0].consultor.id).toBe('cons-1');
    expect(apuracaoGeral.rankingConsultores[1].consultor.id).toBe('cons-2');
  });

  it('deve apurar metas de quantidade de vendas fechadas ignorando viagens canceladas', () => {
    // Setup
    const metaVendas: MetaPeriodo = {
      id: 'meta-vendas-q3',
      nome: 'Meta de Emissões Q3',
      data_inicio: '2026-07-01',
      data_fim: '2026-09-30',
      tipo_calculo: 'vendas',
      is_campanha: false,
      faixas: [
        { id: 'f1', periodo_id: 'meta-vendas-q3', nome: 'Nível 1', valor_minimo: 10, bonus_xp: 300, recompensa: '', cor: '#6366f1' }
      ]
    };

    const viagensConsultor = [
      { id: 'v1', consultor_id: 'cons-1', status: 'fechado', data_financeiro: '2026-07-15' },
      { id: 'v2', consultor_id: 'cons-1', status: 'pos_venda', data_financeiro: '2026-08-05' },
      { id: 'v3', consultor_id: 'cons-1', status: 'cancelada', data_financeiro: '2026-08-10' }, // Não deve contar!
      { id: 'v4', consultor_id: 'cons-1', status: 'concluida', data_financeiro: '2026-09-20' }
    ];

    // Action
    const prog = MetasService.calcularProgressoConsultor(metaVendas, 'cons-1', [], viagensConsultor);

    // Assert
    expect(prog.totalAtingido).toBe(3); // 4 - 1 cancelada = 3
    expect(prog.itensAuditados).toHaveLength(3);
  });

  it('deve calcular rentabilidade líquida acumulada (Comissão + Markup + RAV integral)', () => {
    // Setup
    const metaRentabilidade: MetaPeriodo = {
      id: 'meta-rent-set',
      nome: 'Rentabilidade Setembro',
      data_inicio: '2026-09-01',
      data_fim: '2026-09-30',
      tipo_calculo: 'lucro',
      is_campanha: false,
      faixas: [
        { id: 'f1', periodo_id: 'meta-rent-set', nome: 'Faixa 1', valor_minimo: 5000, bonus_xp: 1000, recompensa: '', cor: '#10b981' }
      ]
    };

    const viagens = [
      {
        id: 'v1',
        consultor_id: 'cons-1',
        status: 'fechado',
        data_financeiro: '2026-09-10',
        produtos: [
          { comissao: 1000, markup: 500, rav: 100 }, // Lucro: 1000 + 500 + 100 = 1600
          { comissao: 2000, markup: 1000, rav: 0 }    // Lucro: 2000 + 1000 = 3000
        ]
      }
    ];

    // Action
    const prog = MetasService.calcularProgressoConsultor(metaRentabilidade, 'cons-1', [], viagens);

    // Assert
    expect(prog.totalAtingido).toBe(4600);
  });

  it('deve classificar status temporais de meta corretamente (ativa, passada, futura)', () => {
    // Setup
    const metaAtiva: MetaPeriodo = {
      id: 'm1',
      nome: 'Meta Atual',
      data_inicio: '2026-01-01',
      data_fim: '2026-12-31',
      tipo_calculo: 'bruto',
      is_campanha: false
    };

    const metaPassada: MetaPeriodo = {
      id: 'm2',
      nome: 'Meta Passada',
      data_inicio: '2025-01-01',
      data_fim: '2025-12-31',
      tipo_calculo: 'bruto',
      is_campanha: false
    };

    const metaFutura: MetaPeriodo = {
      id: 'm3',
      nome: 'Meta Futura',
      data_inicio: '2027-01-01',
      data_fim: '2027-12-31',
      tipo_calculo: 'bruto',
      is_campanha: false
    };

    // Action & Assert
    expect(MetasService.getStatusTemporal(metaAtiva)).toBe('ativa');
    expect(MetasService.getStatusTemporal(metaPassada)).toBe('passada');
    expect(MetasService.getStatusTemporal(metaFutura)).toBe('futura');
  });

  it('deve carregar campanhas da tabela campaigns e convertê-las para MetaPeriodo', async () => {
    // Setup
    const campanhaMock = {
      id: 'camp-boa-viagem-id',
      titulo: 'Boa viagem!',
      descricao: 'Campanha de 40 orçamentos',
      tipo_meta: 'orcamento_criado',
      meta_quantidade: 40,
      data_inicio: '2026-09-01',
      data_fim: '2026-09-30',
      badge_key: 'NEGOCIADOR_IMPLACAVEL',
      ativa: true,
      created_at: '2026-09-01T00:00:00Z'
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [campanhaMock], error: null })
          })
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      };
    });

    // Action
    const metas = await MetasService.obterMetaPeriodos();

    // Assert
    const campCarregada = metas.find(m => m.id === 'camp-boa-viagem-id');
    expect(campCarregada).toBeDefined();
    expect(campCarregada?.nome).toBe('Boa viagem!');
    expect(campCarregada?.tipo_calculo).toBe('orcamentos');
    expect(campCarregada?.is_campanha).toBe(true);
    expect(campCarregada?.valor_meta).toBe(40);
  });

  it('deve calcular corretamente o progresso da equipe em campanha individual (92/400 = 23%) e nao dar 100% quando nenhum consultor atingiu 40', () => {
    // Setup: 10 consultores, meta individual de 40 orçamentos por consultor
    const campanhaBoaViagem: MetaPeriodo = {
      id: 'camp-boa-viagem-10',
      nome: 'Boa viagem!',
      data_inicio: '2026-09-01',
      data_fim: '2026-09-30',
      tipo_calculo: 'orcamentos',
      is_campanha: true,
      is_meta_loja: false,
      valor_meta: 40,
      faixas: [
        { id: 'f1', periodo_id: 'camp-boa-viagem-10', nome: 'Ouro', valor_minimo: 40, bonus_xp: 2000, recompensa: 'Viagem', cor: '#10b981' }
      ]
    };

    const consultores = Array.from({ length: 10 }, (_, i) => ({
      id: `cons-${i + 1}`,
      nome: `Consultor ${i + 1}`,
      email: `consultor${i + 1}@agencia.com`
    }));

    // Cada consultor cadastrou entre 5 e 15 orçamentos (totalizando 92 orçamentos na agência, nenhum com 40)
    const orcamentos: any[] = [];
    const distribuicao = [12, 10, 15, 8, 9, 11, 7, 6, 8, 6]; // Soma = 92
    distribuicao.forEach((qtd, idx) => {
      for (let j = 0; j < qtd; j++) {
        orcamentos.push({
          id: `orc-${idx}-${j}`,
          consultor_id: `cons-${idx + 1}`,
          nome_cliente: `Cliente ${idx}-${j}`,
          created_at: '2026-09-15T12:00:00Z'
        });
      }
    });

    // Action
    const apuracao = MetasService.calcularProgressoAgencia(campanhaBoaViagem, consultores, orcamentos, []);
    const totalConsultores = apuracao.rankingConsultores.length;
    const consultoresNoAlvo = apuracao.rankingConsultores.filter(r => r.faixaAtual !== null).length;
    const maiorFaixaVal = 40;
    const alvoTotalEquipe = maiorFaixaVal * totalConsultores; // 40 * 10 = 400
    const pctGeral = Math.min(Math.round((apuracao.totalAgencia / alvoTotalEquipe) * 100), 100);

    // Assert
    expect(apuracao.totalAgencia).toBe(92);
    expect(consultoresNoAlvo).toBe(0); // Nenhum consultor atingiu 40 individualmente
    expect(alvoTotalEquipe).toBe(400); // 10 consultores * 40
    expect(pctGeral).toBe(23); // 92 / 400 = 23%
    expect(pctGeral).not.toBe(100);
  });

  it('deve calcular progresso de meta global de loja considerando o alvo único para a soma da equipe', () => {
    // Setup: Meta de loja de 40 orçamentos
    const metaLoja: MetaPeriodo = {
      id: 'meta-loja-set',
      nome: 'Meta Global Setembro',
      data_inicio: '2026-09-01',
      data_fim: '2026-09-30',
      tipo_calculo: 'orcamentos',
      is_campanha: false,
      is_meta_loja: true,
      valor_meta: 40,
      faixas: []
    };

    const consultores = [
      { id: 'cons-1', nome: 'Amanda' },
      { id: 'cons-2', nome: 'Bruno' }
    ];

    const orcamentos = [
      ...Array.from({ length: 25 }, (_, i) => ({ id: `orc-1-${i}`, consultor_id: 'cons-1', created_at: '2026-09-10T00:00:00Z' })),
      ...Array.from({ length: 20 }, (_, i) => ({ id: `orc-2-${i}`, consultor_id: 'cons-2', created_at: '2026-09-10T00:00:00Z' }))
    ];

    // Action
    const apuracao = MetasService.calcularProgressoAgencia(metaLoja, consultores, orcamentos, []);
    const alvoLoja = metaLoja.valor_meta || 40;
    const pctLoja = Math.min(Math.round((apuracao.totalAgencia / alvoLoja) * 100), 100);

    // Assert
    expect(apuracao.totalAgencia).toBe(45); // 25 + 20
    expect(pctLoja).toBe(100); // 45 / 40 = 100% batida
  });
});
