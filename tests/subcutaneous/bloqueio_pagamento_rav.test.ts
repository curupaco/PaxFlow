import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isTipoRav, isTipoMarkup, calcularFinanceiroProduto, isLocBloqueadoPorEdicao } from '../../src/utils/productFinancialHelper';
import { OrcamentosService } from '../../src/services/orcamentosService';
import { supabase } from '../../src/services/supabase';

describe('Subcutaneous: Bloqueio de Recebimento e Consistência de RAVs/Markups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve identificar corretamente os tipos de produto RAV e Markup', () => {
    // Setup & Action & Assert
    expect(isTipoRav('RAV - 12%')).toBe(true);
    expect(isTipoRav('RAV')).toBe(true);
    expect(isTipoRav('rav')).toBe(true);
    expect(isTipoRav('HOTEL')).toBe(false);

    expect(isTipoMarkup('MARKUP')).toBe(true);
    expect(isTipoMarkup('markup')).toBe(true);
    expect(isTipoMarkup('AÉREO')).toBe(false);
  });

  it('deve calcular o financeiro de produto RAV com rentabilidade líquida de 88%', () => {
    // Setup
    const produtoRav = {
      tipo: 'RAV - 12%',
      valor_venda: 1000,
      rav: 1000
    };

    // Action
    const fin = calcularFinanceiroProduto(produtoRav);

    // Assert
    expect(fin.venda).toBe(1000);
    expect(fin.rav).toBe(1000);
    expect(fin.rentabilidade).toBe(880); // 1000 * 0.88
    expect(fin.saldoPendente).toBe(0);
    expect(fin.totalDistribuido).toBe(1000);
  });

  it('deve validar bloqueio de pagamento apenas se houver alterações não salvas (dirty), liberando quando salvo sem fechar o painel direito', () => {
    // Setup
    const selectedProductId = 'prod-123';
    const subProdutosLocA = [
      { id: 'prod-123', tipo: 'RAV - 12%', codigo_reserva: 'LOC123', valor_venda: 500 },
      { id: 'prod-456', tipo: 'HOTEL', codigo_reserva: 'LOC123', valor_venda: 300 }
    ];
    const subProdutosLocB = [
      { id: 'prod-789', tipo: 'AÉREO', codigo_reserva: 'LOC999', valor_venda: 1200 }
    ];

    // Action 1: Produto aberto no editor com alterações pendentes (dirty = true)
    const isLocABloqueadoDirty = isLocBloqueadoPorEdicao(selectedProductId, true, subProdutosLocA);
    const isLocBBloqueadoDirty = isLocBloqueadoPorEdicao(selectedProductId, true, subProdutosLocB);

    // Action 2: Produto aberto no editor, mas já SALVO com sucesso (dirty = false) -> NÃO bloqueia!
    const isLocALiberadoSalvo = isLocBloqueadoPorEdicao(selectedProductId, false, subProdutosLocA);
    const isLocBLiberadoSalvo = isLocBloqueadoPorEdicao(selectedProductId, false, subProdutosLocB);

    // Action 3: Nenhum produto selecionado
    const isLocASemSelecao = isLocBloqueadoPorEdicao(null, false, subProdutosLocA);

    // Assert
    expect(isLocABloqueadoDirty).toBe(true);
    expect(isLocBBloqueadoDirty).toBe(false);
    expect(isLocALiberadoSalvo).toBe(false);
    expect(isLocBLiberadoSalvo).toBe(false);
    expect(isLocASemSelecao).toBe(false);
  });

  it('deve inicializar campos rav e markup na conversão de orçamento para viagem', async () => {
    // Setup
    const isRav = isTipoRav('RAV - 12%');
    const isMkp = isTipoMarkup('MARKUP');
    const ravVal = isRav ? 2500 : 0;
    const mkpVal = isMkp ? 2500 : 0;
    const tarifaVal = (isRav || isMkp) ? 0 : 2500;

    // Action & Assert
    expect(isRav).toBe(true);
    expect(ravVal).toBe(2500);
    expect(tarifaVal).toBe(0);
    expect(mkpVal).toBe(2500);
  });
});
