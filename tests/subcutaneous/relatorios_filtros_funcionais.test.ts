import { describe, it, expect, vi } from 'vitest';
import { RelatoriosComercialView } from '../../src/components/relatorios/comercial/RelatoriosComercialView';
import { CampanhasService, FiltrosCampanha } from '../../src/services/campanhasService';
import { RelatoriosShellView } from '../../src/components/relatorios/shell/RelatoriosShellView';

describe('Relatórios: Filtros Funcionais e Reatividade de Segmentação (Subcutâneo)', () => {
  it('deve renderizar os botões de ação e filtro no topo e no rodapé da aba de campanhas', () => {
    // Setup
    const mockData = {
      viagens: [
        { id: 'v1', consultor_id: 'c1', destino: 'Paris', valor_total: 15000, data_ida: '2026-06-10', cliente: { id: 'cli-1', nome: 'Ana Costa', email: 'ana@teste.com' } }
      ],
      orcamentos: []
    };
    const mockContext: any = {
      user: { id: 'c1' },
      perfil: { role: 'admin', nome: 'Administrador' },
      consultores: [{ id: 'c1', nome: 'Consultor 1' }],
      feedbacksNps: [],
      campanhasPresets: [],
      campanhasFiltros: {
        origem: 'todos',
        tipoVisao: 'oportunidade',
        tipoDestino: 'todos',
        periodoMeses: 12
      }
    };

    // Action
    const html = RelatoriosComercialView.renderSegmentacaoCampanhas(mockData, mockContext);

    // Assert
    expect(html).toContain('id="btn-campanha-aplicar-filtros-topo"');
    expect(html).toContain('id="btn-campanha-aplicar-filtros"');
    expect(html).toContain('id="btn-campanha-limpar-filtros-topo"');
    expect(html).toContain('id="btn-campanha-limpar-filtros"');
    expect(html).toContain('Aplicar Segmentação');
  });

  it('deve filtrar corretamente histórico de 24 meses sem perda prematura de dados', () => {
    // Setup
    const agora = new Date();
    const data10MesesAtras = new Date(agora);
    data10MesesAtras.setMonth(data10MesesAtras.getMonth() - 10);
    const data18MesesAtras = new Date(agora);
    data18MesesAtras.setMonth(data18MesesAtras.getMonth() - 18);

    const viagens = [
      { id: 'v1', consultor_id: 'c1', destino: 'Roma', valor_total: 10000, data_ida: data10MesesAtras.toISOString().slice(0, 10), cliente: { id: 'cli-1', nome: 'Carlos' } },
      { id: 'v2', consultor_id: 'c1', destino: 'Tóquio', valor_total: 25000, data_ida: data18MesesAtras.toISOString().slice(0, 10), cliente: { id: 'cli-2', nome: 'Beatriz' } }
    ];
    const orcamentos: any[] = [];
    const nps: any[] = [];

    const usuarioLogado = { id: 'c1', nome: 'Consultor 1', role: 'consultor' };
    const todosItens = CampanhasService.normalizarDados(viagens, orcamentos, nps);

    // Action 1: Janela de 12 meses deve incluir apenas a viagem de 10 meses atrás
    const filtros12m: FiltrosCampanha = {
      origem: 'todos',
      tipoVisao: 'oportunidade',
      tipoDestino: 'todos',
      periodoMeses: 12
    };
    const res12m = CampanhasService.filtrarItens(todosItens, filtros12m, usuarioLogado);

    // Action 2: Janela de 24 meses deve incluir ambas as viagens
    const filtros24m: FiltrosCampanha = {
      origem: 'todos',
      tipoVisao: 'oportunidade',
      tipoDestino: 'todos',
      periodoMeses: 24
    };
    const res24m = CampanhasService.filtrarItens(todosItens, filtros24m, usuarioLogado);

    // Assert
    expect(res12m).toHaveLength(1);
    expect(res12m[0].destino).toBe('Roma');
    expect(res24m).toHaveLength(2);
  });

  it('deve renderizar a barra global de filtros com seletor de consultor e botões de ação', () => {
    // Setup
    const shellParams: any = {
      activeTab: 'segmentacao_campanhas',
      menuLateralRecolhido: false,
      collapsedGroups: {},
      dataInicio: '2026-01-01',
      dataFim: '2026-01-31',
      consultorIdFilter: 'todos',
      consultores: [{ id: 'c1', nome: 'Lucas' }, { id: 'c2', nome: 'Mariana' }],
      isAdmin: true,
      perfilNome: 'Gestor Geral',
      contentHtml: '<div id="relatorio-conteudo">Mock Conteúdo</div>'
    };

    // Action
    const html = RelatoriosShellView.renderShell(shellParams);

    // Assert
    expect(html).toContain('id="filter-consultores"');
    expect(html).toContain('id="btn-aplicar-filtros"');
    expect(html).toContain('id="btn-limpar-filtros"');
    expect(html).toContain('Consolidado (Todos os Consultores)');
    expect(html).toContain('Lucas');
    expect(html).toContain('Mariana');
  });

  it('deve deduplicar clientes únicos corretamente no modo cliente_unico', () => {
    // Setup
    const viagens = [
      { id: 'v1', consultor_id: 'c1', destino: 'Lisboa', valor_total: 8000, data_ida: '2026-04-10', cliente: { id: 'cli-10', nome: 'Roberto Alves' } },
      { id: 'v2', consultor_id: 'c1', destino: 'Madrid', valor_total: 12000, data_ida: '2026-08-15', cliente: { id: 'cli-10', nome: 'Roberto Alves' } }
    ];
    const usuarioLogado = { id: 'c1', nome: 'Consultor 1', role: 'admin' };
    const todosItens = CampanhasService.normalizarDados(viagens, [], []);

    // Action
    const agrupados = CampanhasService.agruparPorCliente(todosItens);
    const metricas = CampanhasService.calcularMetricas(agrupados);

    // Assert
    expect(agrupados).toHaveLength(1);
    expect(agrupados[0].clienteNome).toBe('Roberto Alves');
    expect(metricas.totalClientesUnicos).toBe(1);
    expect(metricas.valorTotal).toBe(20000);
  });
});
