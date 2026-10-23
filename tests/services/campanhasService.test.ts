import { describe, it, expect, vi } from 'vitest';
import { CampanhasService, ItemSegmentacaoCampanha, FiltrosCampanha } from '../../src/services/campanhasService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('CampanhasService - Testes Subcutâneos', () => {
  // Setup dos dados mockados
  const viagensMock = [
    {
      id: 'viagem-1',
      cliente_id: 'cli-1',
      cliente_nome: 'Ana Paula',
      cliente_telefone: '11999990001',
      cliente_email: 'ana@email.com',
      destino: 'Havana / Cuba',
      data_ida: '2026-06-15',
      valor_total: 15000,
      consultor_id: 'cons-1',
      consultor_nome: 'Carlos Consultor',
      produtos_viagem: [
        { fornecedor: 'Copa Airlines', valor_venda: 6000 },
        { fornecedor: 'Iberostar Cuba', valor_venda: 9000 }
      ],
      passageiros: [{ tipo: 'ADT' }, { tipo: 'CHD', faixaEtaria: 'crianca_8' }]
    },
    {
      id: 'viagem-2',
      cliente_id: 'cli-2',
      cliente_nome: 'Bruno Silva',
      cliente_telefone: '11999990002',
      destino: 'Gramado - RS',
      data_ida: '2026-07-20',
      valor_total: 4500,
      consultor_id: 'cons-2',
      consultor_nome: 'Mariana Silva',
      produtos_viagem: [
        { fornecedor: 'Azul Linhas Aéreas' },
        { fornecedor: 'Wish Serrano Resort' }
      ]
    }
  ];

  const orcamentosMock = [
    {
      id: 'orc-1',
      cliente_id: 'cli-1',
      nome_cliente: 'Ana Paula',
      contato: '11999990001',
      destino: 'Cancun / México',
      data_viagem: '2026-09-10',
      valor_viagem: 12000,
      consultor_id: 'cons-1',
      consultor_nome: 'Carlos Consultor',
      status: 'SOLICITADO'
    },
    {
      id: 'orc-2',
      cliente_id: 'cli-3',
      nome_cliente: 'Marcos Souza',
      contato: '21988880003',
      destino: 'Lisboa e Porto',
      data_viagem: '2026-10-05',
      valor_viagem: 22000,
      consultor_id: 'cons-1',
      consultor_nome: 'Carlos Consultor',
      status: 'SOLICITADO',
      sub_status: 'DESISTENCIA'
    }
  ];

  const npsMock = [
    { viagem_id: 'viagem-1', cliente_id: 'cli-1', nota: 10 },
    { viagem_id: 'viagem-2', cliente_id: 'cli-2', nota: 6 }
  ];

  it('deve normalizar e classificar destinos corretamente (Nacional vs Internacional)', () => {
    // Action
    const normalizados = CampanhasService.normalizarDados(viagensMock, orcamentosMock, npsMock);

    // Assert
    expect(normalizados).toHaveLength(4);
    const cuba = normalizados.find(i => i.registroId === 'viagem-1');
    const gramado = normalizados.find(i => i.registroId === 'viagem-2');

    expect(cuba?.tipoDestino).toBe('internacional');
    expect(cuba?.npsCategoria).toBe('promotor');
    expect(cuba?.possuiCriancas).toBe(true);
    expect(cuba?.fornecedores).toContain('Copa Airlines');
    expect(cuba?.fornecedores).toContain('Iberostar Cuba');

    expect(gramado?.tipoDestino).toBe('nacional');
    expect(gramado?.npsCategoria).toBe('detrator');
    expect(gramado?.possuiCriancas).toBe(false);
  });

  it('deve filtrar por múltiplos destinos informados por vírgula (ex: Cuba, Cancun)', () => {
    // Setup
    const normalizados = CampanhasService.normalizarDados(viagensMock, orcamentosMock, npsMock);
    const filtros: FiltrosCampanha = {
      origem: 'todos',
      tipoVisao: 'oportunidade',
      tipoDestino: 'todos',
      destinoBusca: 'cuba, cancun'
    };

    // Action
    const resultado = CampanhasService.filtrarItens(normalizados, filtros, { id: 'admin-1', role: 'admin' });

    // Assert
    expect(resultado).toHaveLength(2);
    expect(resultado.map(r => r.destino)).toEqual(expect.arrayContaining(['Havana / Cuba', 'Cancun / México']));
  });

  it('deve respeitar a regra RBAC de consultor visualizando apenas seus próprios clientes', () => {
    // Setup
    const normalizados = CampanhasService.normalizarDados(viagensMock, orcamentosMock, npsMock);
    const filtros: FiltrosCampanha = {
      origem: 'todos',
      tipoVisao: 'oportunidade',
      tipoDestino: 'todos'
    };

    // Action: consultor cons-2 (Mariana)
    const resultadoConsultor = CampanhasService.filtrarItens(normalizados, filtros, { id: 'cons-2', role: 'consultor' });

    // Assert
    expect(resultadoConsultor).toHaveLength(1);
    expect(resultadoConsultor[0].consultorId).toBe('cons-2');
    expect(resultadoConsultor[0].clienteNome).toBe('Bruno Silva');
  });

  it('deve consolidar e deduplicar na visão por cliente único com ticket somado', () => {
    // Setup
    const normalizados = CampanhasService.normalizarDados(viagensMock, orcamentosMock, npsMock);

    // Action
    const agrupados = CampanhasService.agruparPorCliente(normalizados);

    // Assert (Ana Paula tem 1 viagem de 15.000 e 1 orçamento de 12.000 => total 27.000)
    expect(agrupados).toHaveLength(3); // 3 clientes únicos: Ana Paula, Bruno Silva, Marcos Souza
    const ana = agrupados.find(c => c.clienteNome === 'Ana Paula');
    expect(ana).toBeDefined();
    expect(ana?.valor).toBe(27000);
    expect(ana?.totalOportunidadesCliente).toBe(2);
    expect(ana?.destino).toContain('Havana / Cuba');
    expect(ana?.destino).toContain('Cancun / México');
  });

  it('deve calcular métricas financeiras e contadores de NPS com precisão', () => {
    // Setup
    const normalizados = CampanhasService.normalizarDados(viagensMock, orcamentosMock, npsMock);

    // Action
    const metricas = CampanhasService.calcularMetricas(normalizados);

    // Assert
    expect(metricas.totalRegistros).toBe(4);
    expect(metricas.totalClientesUnicos).toBe(3);
    expect(metricas.valorTotal).toBe(53500); // 15000 + 4500 + 12000 + 22000
    expect(metricas.ticketMedio).toBe(13375);
    expect(metricas.promotoresCount).toBe(2); // Ana Paula viagem e orçamento
    expect(metricas.detratoresCount).toBe(1); // Bruno Silva
  });

  it('deve formatar CSV e cópia de contatos em lote adequadamente', () => {
    // Setup
    const normalizados = CampanhasService.normalizarDados(viagensMock, orcamentosMock, npsMock);

    // Action
    const csv = CampanhasService.gerarCsv(normalizados);
    const contatos = CampanhasService.formatarListaContatosLote(normalizados);

    // Assert
    expect(csv).toContain('"Havana / Cuba"');
    expect(csv).toContain('"Viagem"');
    expect(csv).toContain('"Orçamento"');
    expect(contatos).toContain('Ana Paula (11999990001)');
    expect(contatos).toContain('Bruno Silva (11999990002)');
  });

  it('deve tratar Schema Drift (código 42P01 / 42703) ao salvar preset com fallback resiliente', async () => {
    // Setup: Simula erro 42P01 (relation does not exist)
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'relation campanhas_presets does not exist' }
        })
      })
    });

    (supabase.from as any).mockReturnValue({
      insert: mockInsert
    });

    // Action
    const resultado = await CampanhasService.salvarPreset(
      'Campanha Cuba 2026',
      { origem: 'todos', tipoVisao: 'oportunidade', tipoDestino: 'internacional' },
      { id: 'admin-1', nome: 'Admin' }
    );

    // Assert: O sistema não deve quebrar nem estourar erro vermelho
    expect(resultado.sucesso).toBe(true);
    expect(resultado.preset?.id).toContain('temp-');
    expect(resultado.aviso).toContain('lembre-se de rodar a migração DDL no Supabase');
  });
});
