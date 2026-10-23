import { describe, it, expect } from 'vitest';
import { RelatoriosShellView, RelatoriosShellParams } from '../../src/components/relatorios/shell/RelatoriosShellView';

describe('Subcutaneous: Relatórios - Navegação Responsiva e Seletor Mobile', () => {
  it('deve renderizar seletor dropdown mobile com o relatório ativo selecionado e categorias agrupadas', () => {
    // Setup
    const params: RelatoriosShellParams = {
      filtros: {
        dataInicio: '2026-01-01',
        dataFim: '2026-12-31',
        consultorId: ''
      },
      consultoresList: [],
      menuLateralRecolhido: true,
      collapsedGroups: { comercial: false, financeiro: false, operacoes: false, equipe: false },
      activeTab: 'satisfacao',
      contentHtml: '<div id="conteudo-teste">Conteúdo do Relatório</div>'
    };

    // Action
    const html = RelatoriosShellView.renderShell(params);

    // Assert
    expect(html).toContain('id="select-relatorio-mobile"');
    expect(html).toContain('value="satisfacao" selected');
    expect(html).toContain('optgroup label="💼 GESTÃO COMERCIAL"');
    expect(html).toContain('optgroup label="💰 FINANCEIRO & AUDITORIA"');
    expect(html).toContain('optgroup label="✈️ OPERAÇÕES & SLAS"');
    expect(html).toContain('optgroup label="👥 GESTÃO DE EQUIPE"');
  });

  it('deve ocultar a mini-bar desktop no mobile aplicando classe hidden lg:flex', () => {
    // Setup
    const params: RelatoriosShellParams = {
      filtros: {
        dataInicio: '2026-01-01',
        dataFim: '2026-12-31',
        consultorId: ''
      },
      consultoresList: [],
      menuLateralRecolhido: true,
      collapsedGroups: { comercial: false, financeiro: false, operacoes: false, equipe: false },
      activeTab: 'faturamento',
      contentHtml: '<div>Conteúdo</div>'
    };

    // Action
    const html = RelatoriosShellView.renderShell(params);

    // Assert
    expect(html).toContain('hidden lg:flex w-16');
  });

  it('deve ocultar a sidebar expandida desktop no mobile aplicando classe hidden lg:flex', () => {
    // Setup
    const params: RelatoriosShellParams = {
      filtros: {
        dataInicio: '2026-01-01',
        dataFim: '2026-12-31',
        consultorId: ''
      },
      consultoresList: [],
      menuLateralRecolhido: false,
      collapsedGroups: { comercial: false, financeiro: false, operacoes: false, equipe: false },
      activeTab: 'desempenho',
      contentHtml: '<div>Conteúdo</div>'
    };

    // Action
    const html = RelatoriosShellView.renderShell(params);

    // Assert
    expect(html).toContain('hidden lg:flex lg:w-64');
  });
});
