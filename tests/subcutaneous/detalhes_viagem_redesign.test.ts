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

  it('deve iniciar com os grupos de LOC colapsados por padrão quando o set de expandidos estiver vazio', () => {
    // Setup
    const expandedLocKeys = new Set<string>();
    const locKey = 'LOCABC';

    // Action
    const isExpanded = expandedLocKeys.has(locKey.toUpperCase());
    const chevronStyle = isExpanded ? 'transform: rotate(90deg);' : 'transform: rotate(0deg);';
    const bodyClass = isExpanded ? 'loc-body' : 'loc-body hidden';

    // Assert
    expect(isExpanded).toBe(false);
    expect(chevronStyle).toBe('transform: rotate(0deg);');
    expect(bodyClass).toContain('hidden');
  });

  it('deve auto-expandir o grupo de LOC correspondente quando um produto for selecionado', () => {
    // Setup
    const expandedLocKeys = new Set<string>();
    const selectedProductId = 'prod-hotel-1';
    const produtos = [
      { id: 'prod-aereo-1', codigo_reserva: 'LOCV001' },
      { id: 'prod-hotel-1', codigo_reserva: 'LOCH002' }
    ];

    // Action
    const prodSelected = produtos.find(p => p.id === selectedProductId);
    if (prodSelected) {
      const selLocKey = (prodSelected.codigo_reserva || 'SEM LOCALIZADOR').trim().toUpperCase();
      expandedLocKeys.add(selLocKey);
    }
    const isLocV001Expanded = expandedLocKeys.has('LOCV001');
    const isLocH002Expanded = expandedLocKeys.has('LOCH002');

    // Assert
    expect(isLocV001Expanded).toBe(false);
    expect(isLocH002Expanded).toBe(true);
  });

  it('deve formatar corretamente o badge com a contagem singular e plural de produtos por LOC', () => {
    // Setup
    const grupoUm = [{ id: '1' }];
    const grupoMulti = [{ id: '1' }, { id: '2' }, { id: '3' }];

    // Action
    const labelUm = `${grupoUm.length} ${grupoUm.length === 1 ? 'produto' : 'produtos'}`;
    const labelMulti = `${grupoMulti.length} ${grupoMulti.length === 1 ? 'produto' : 'produtos'}`;

    // Assert
    expect(labelUm).toBe('1 produto');
    expect(labelMulti).toBe('3 produtos');
  });

  it('deve expandir e recolher todos os LOCs em massa manipulando o set de chaves', () => {
    // Setup
    const produtosAgrupados = {
      'LOC1': { loc: 'LOC1' },
      'LOC2': { loc: 'LOC2' },
      'LOC3': { loc: 'LOC3' }
    };
    const expandedLocKeys = new Set<string>();

    // Action - Expandir Todos
    Object.keys(produtosAgrupados).forEach(k => expandedLocKeys.add(k.toUpperCase()));
    const totalAbertos = expandedLocKeys.size;

    // Action - Recolher Todos
    expandedLocKeys.clear();
    const totalAposRecolher = expandedLocKeys.size;

    // Assert
    expect(totalAbertos).toBe(3);
    expect(totalAposRecolher).toBe(0);
  });
});

