import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelatoriosPage } from '../../src/pages/Relatorios';
import { RelatoriosOperacoesView, RelatoriosOperacoesContext } from '../../src/components/relatorios/operacoes/RelatoriosOperacoesView';

describe('Subcutaneous: Relatório de Embarques - Filtro Contextual e Atalhos Rápidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve calcular o período padrão geral (01 do mês corrente até a data atual)', () => {
    // Setup
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const esperadoInicio = `${ano}-${mes}-01`;
    const esperadoFim = `${ano}-${mes}-${dia}`;

    // Action
    const periodo = RelatoriosPage.obterPeriodoPadraoGeral();

    // Assert
    expect(periodo.inicio).toBe(esperadoInicio);
    expect(periodo.fim).toBe(esperadoFim);
  });

  it('deve calcular o período padrão de embarques (dia atual até Hoje + 30 dias)', () => {
    // Setup
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const esperadoInicio = `${ano}-${mes}-${dia}`;

    const dFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30);
    const esperadoFim = `${dFim.getFullYear()}-${String(dFim.getMonth() + 1).padStart(2, '0')}-${String(dFim.getDate()).padStart(2, '0')}`;

    // Action
    const periodo = RelatoriosPage.obterPeriodoPadraoEmbarques(30);

    // Assert
    expect(periodo.inicio).toBe(esperadoInicio);
    expect(periodo.fim).toBe(esperadoFim);
  });

  it('deve calcular janelas personalizadas de dias (ex: 7d, 15d, 60d) a partir de hoje', () => {
    // Setup
    const hoje = new Date();
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    // Action
    const periodo7 = RelatoriosPage.obterPeriodoPadraoEmbarques(7);
    const periodo15 = RelatoriosPage.obterPeriodoPadraoEmbarques(15);
    const periodo60 = RelatoriosPage.obterPeriodoPadraoEmbarques(60);

    // Assert
    expect(periodo7.inicio).toBe(hojeIso);
    expect(periodo15.inicio).toBe(hojeIso);
    expect(periodo60.inicio).toBe(hojeIso);

    const d7 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7);
    const d15 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 15);
    const d60 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 60);

    expect(periodo7.fim).toBe(`${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`);
    expect(periodo15.fim).toBe(`${d15.getFullYear()}-${String(d15.getMonth() + 1).padStart(2, '0')}-${String(d15.getDate()).padStart(2, '0')}`);
    expect(periodo60.fim).toBe(`${d60.getFullYear()}-${String(d60.getMonth() + 1).padStart(2, '0')}-${String(d60.getDate()).padStart(2, '0')}`);
  });

  it('deve renderizar os botões de atalho rápido de janela no cabeçalho do relatório de embarques com o botão de 30d ativo por padrão', () => {
    // Setup
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const hojeIso = `${ano}-${mes}-${dia}`;

    const d30 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30);
    const fim30Iso = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, '0')}-${String(d30.getDate()).padStart(2, '0')}`;

    const ctxMock: RelatoriosOperacoesContext = {
      user: { id: 'user-1' },
      perfil: { role: 'admin' },
      consultores: [],
      viagens: [],
      clientes: [],
      orcamentos: [],
      lembretes: [],
      feedbacksNps: [],
      tiposProduto: [],
      dataInicio: hojeIso,
      dataFim: fim30Iso,
      consultorIdFilter: 'todos',
      filtroContatoEmbarque: 'todos',
      satisfacaoFiltroCategoria: 'todos',
      satisfacaoBuscaTexto: '',
      showToast: vi.fn(),
      openTravelModal: vi.fn(),
      openCommentsModal: vi.fn(),
      onRefreshData: vi.fn(),
      onStateChange: vi.fn(),
      onAlterarPeriodo: vi.fn(),
      exportToCSV: vi.fn()
    };

    // Action
    const html = RelatoriosOperacoesView.renderEmbarques({}, ctxMock);

    // Assert
    expect(html).toContain('btn-janela-embarque');
    expect(html).toContain('data-dias="7"');
    expect(html).toContain('data-dias="15"');
    expect(html).toContain('data-dias="30"');
    expect(html).toContain('data-dias="60"');
    expect(html).toContain('bg-indigo-600 text-white font-black'); // botão 30d ativo
  });
});
