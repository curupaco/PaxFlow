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

  it('deve respeitar piso mínimo de valor estimado para seguro saúde de 1 passageiro', () => {
    // Setup - 1 passageiro (1 * 290 = 290, mas piso mínimo é 380)
    const produtos = [{ tipo: 'Aéreo Internacional', nome: 'Voo SP - Lisboa' }];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, 'Lisboa', 1, 4000);

    // Assert
    const opSeguro = oportunidades.find((o) => o.id === 'upsell-seguro-saude');
    expect(opSeguro).toBeDefined();
    expect(opSeguro?.valorEstimado).toBe(380); // Piso de R$ 380
  });

  it('deve disparar múltiplos gatilhos simultâneos para pacote internacional completo sem adicionais', () => {
    // Setup - 4 passageiros para Orlando apenas com hotel
    const produtos = [{ tipo: 'Hotel', nome: 'Hotel Disney' }];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, 'Orlando', 4, 25000);

    // Assert
    expect(oportunidades.length).toBeGreaterThanOrEqual(3);
    const tipos = oportunidades.map((o) => o.tipo);
    expect(tipos).toContain('seguro_saude');
    expect(tipos).toContain('passes_experiencias');
    expect(tipos).toContain('transfer_privativo');
  });

  it('deve sugerir upgrade de hotel para all-inclusive/luxo quando houver hospedagem padrão', () => {
    // Setup - Viagem nacional com hotel padrão
    const produtos = [{ tipo: 'Hotel', nome: 'Hotel Pousada das Águas' }];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, 'Gramado', 2, 5000);

    // Assert
    const opUpgrade = oportunidades.find((o) => o.id === 'upsell-upgrade-hotel');
    expect(opUpgrade).toBeDefined();
    expect(opUpgrade?.categoriaProduto).toBe('hotel');
    expect(opUpgrade?.valorEstimado).toBe(Math.max(600, Math.round(5000 * 0.18)));
  });

  it('deve sugerir garantia de cancelamento flexível para orçamentos acima de R$ 10.000', () => {
    // Setup
    const produtos = [{ tipo: 'Pacote', nome: 'Pacote Família 15 Dias' }];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, 'Fortaleza', 4, 15000);

    // Assert
    const opCancel = oportunidades.find((o) => o.id === 'upsell-cancel-flex');
    expect(opCancel).toBeDefined();
    expect(opCancel?.tipo).toBe('cancel_flex');
    expect(opCancel?.valorEstimado).toBe(Math.round(15000 * 0.06)); // 6% de 15000 = 900
  });

  it('deve sugerir seguro viagem nacional e transfer receptivo para viagens pelo Brasil', () => {
    // Setup - Viagem para Florianópolis sem seguro ou transfer
    const produtos = [{ tipo: 'Hospedagem', nome: 'Pousada Praia da Joaquina' }];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, 'Florianópolis', 2, 3500);

    // Assert
    const opSeguroNac = oportunidades.find((o) => o.id === 'upsell-seguro-nacional');
    const opTransferNac = oportunidades.find((o) => o.id === 'upsell-transfer-nacional');
    expect(opSeguroNac).toBeDefined();
    expect(opTransferNac).toBeDefined();
    expect(opSeguroNac?.valorEstimado).toBe(220);
    expect(opTransferNac?.valorEstimado).toBe(380);
  });

  it('deve validar alias retroativo isUserThiagoCosta chamando isUpsellEnabled', () => {
    // Setup & Action
    const habilitado = UpsellEngineService.isUserThiagoCosta({ id: 'u1' }, { id: 'u1' });

    // Assert
    expect(habilitado).toBe(true);
  });
});
