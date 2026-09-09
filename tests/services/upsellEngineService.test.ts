import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpsellEngineService } from '../../src/services/upsellEngineService';

vi.mock('../../src/utils/featureFlags', () => ({
  isUpsellEnabled: vi.fn().mockReturnValue(true),
}));

describe('UpsellEngineService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar lista vazia se o Upsell Engine estiver desabilitado', async () => {
    // Setup
    const { isUpsellEnabled } = await import('../../src/utils/featureFlags');
    vi.mocked(isUpsellEnabled).mockReturnValueOnce(false);

    // Action
    const resultado = UpsellEngineService.calculateUpsellOpportunities([], 'Orlando', 2, 5000);

    // Assert
    expect(resultado).toEqual([]);
  });

  it('deve sugerir seguro saúde obrigatório para destinos internacionais sem seguro cadastrado', () => {
    // Setup
    const produtos = [{ tipo: 'Aéreo Internacional', nome: 'Voo SP - Paris' }];
    const destino = 'Paris';

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, destino, 2, 10000);

    // Assert
    const opSeguro = oportunidades.find((o) => o.id === 'upsell-seguro-saude');
    expect(opSeguro).toBeDefined();
    expect(opSeguro?.categoriaProduto).toBe('seguro');
    expect(opSeguro?.valorEstimado).toBe(580); // 2 * 290
  });

  it('deve sugerir ingressos e atrações para Orlando quando nenhum passeio estiver incluído', () => {
    // Setup
    const produtos = [{ tipo: 'Hotel', nome: 'Resort Disney' }];
    const destino = 'Orlando';

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, destino, 4, 18000);

    // Assert
    const opPasseio = oportunidades.find((o) => o.id === 'upsell-passes-experiencias');
    expect(opPasseio).toBeDefined();
    expect(opPasseio?.categoriaProduto).toBe('passeio');
    expect(opPasseio?.produtoSugerido).toContain('Disney');
  });

  it('deve sugerir transfer privativo para grupos de 3 ou mais passageiros', () => {
    // Setup
    const produtos = [
      { tipo: 'Hotel', nome: 'Hotel Centro' },
      { tipo: 'Seguro', nome: 'Seguro Viagem' },
    ];
    const destino = 'Buenos Aires';

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, destino, 3, 6000);

    // Assert
    const opTransfer = oportunidades.find((o) => o.id === 'upsell-transfer-privativo');
    expect(opTransfer).toBeDefined();
    expect(opTransfer?.tipo).toBe('transfer_privativo');
  });
});
