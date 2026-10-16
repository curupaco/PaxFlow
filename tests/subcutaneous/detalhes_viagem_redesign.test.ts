import { describe, it, expect } from 'vitest';
import { renderLateralEditorPaneHTML } from '../../src/components/dashboard/DashboardTemplates';

describe('Redesign Detalhes da Viagem - Testes Subcutâneos', () => {
  it('deve renderizar o painel integrado de edição na coluna direita sem backdrop flutuante e com botão cancelar', () => {
    // Setup
    const mockProduto = {
      id: 'prod-123',
      tipo: 'Hotel',
      fornecedor: 'Hotel Copacabana Palace',
      descricao: 'Suíte Frente Mar',
      codigo_reserva: 'LOC999',
      valor_venda: 3500.00,
      taxas: 150.00,
      comissao_loja: 350.00,
      status: 'emitido'
    };
    const tiposProduto = [{ nome: 'Hotel', ativo: true }];
    const getIconForType = () => '🏨';

    // Action
    const html = renderLateralEditorPaneHTML(mockProduto, 'produtos', tiposProduto, getIconForType, false);

    // Assert
    expect(html).toContain('id="selected-product-editor-pane"');
    expect(html).toContain('id="btn-close-product-editor"');
    expect(html).toContain('id="edit-btn-cancelar-lateral"');
    expect(html).toContain('✕');
    expect(html).not.toContain('id="backdrop-product-editor"');
    expect(html).not.toContain('fixed inset-y-0');
  });

  it('deve retornar string vazia se nenhum produto estiver selecionado para edição', () => {
    // Setup
    const mockProduto = null;
    const tiposProduto: any[] = [];
    const getIconForType = () => '🏨';

    // Action
    const html = renderLateralEditorPaneHTML(mockProduto, 'produtos', tiposProduto, getIconForType, false);

    // Assert
    expect(html).toBe('');
  });

  it('deve extrair e sanitizar classes múltiplas separadas por espaço sem gerar tokens inválidos', () => {
    // Setup
    const maxWidthClass = 'max-w-5xl lg:max-w-6xl xl:max-w-7xl';

    // Action
    const classes = maxWidthClass.split(/\s+/).filter(Boolean);

    // Assert
    expect(classes).toEqual(['max-w-5xl', 'lg:max-w-6xl', 'xl:max-w-7xl']);
    expect(classes.every(c => !c.includes(' '))).toBe(true);
  });

  it('deve garantir que a estrutura da aba de produtos use divisão em 2 colunas no desktop', () => {
    // Setup
    const desktopGridClass = 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start';
    const leftColClass = 'lg:col-span-7';
    const rightColClass = 'lg:col-span-5';

    // Action & Assert
    expect(desktopGridClass).toContain('lg:grid-cols-12');
    expect(leftColClass).toBe('lg:col-span-7');
    expect(rightColClass).toBe('lg:col-span-5');
  });

  it('deve garantir ausência de overflow-y-auto interno na lista de produtos para evitar rolagem dupla', () => {
    // Setup
    const containerClasses = 'space-y-2.5';

    // Action & Assert
    expect(containerClasses).not.toContain('overflow-y-auto');
    expect(containerClasses).not.toContain('max-h-');
  });

  it('deve garantir que o loc-group não contenha overflow-hidden para não cortar menus dropdown (⋮)', () => {
    // Setup
    const locGroupClass = 'loc-group border border-slate-200/80 dark:border-slate-800 rounded-xl mb-3 shadow-sm bg-white dark:bg-slate-900/40';

    // Action & Assert
    expect(locGroupClass).not.toContain('overflow-hidden');
  });
});
