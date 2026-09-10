import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpsellEngineService } from '../../src/services/upsellEngineService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

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
    expect(opSeguro?.mensagemWhatsApp).toContain('Paris');
  });

  it('deve sugerir chip eSIM internacional para destinos no exterior com mensagem de WhatsApp', () => {
    // Setup
    const produtos = [{ tipo: 'Aéreo', nome: 'Voo GRU - Lisboa' }];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities({
      produtos,
      destino: 'Lisboa',
      totalPax: 2,
      valorTotal: 8000,
      clienteNome: 'Mariana Silva'
    });

    // Assert
    const opEsim = oportunidades.find((o) => o.id === 'upsell-esim-internacional');
    expect(opEsim).toBeDefined();
    expect(opEsim?.categoriaProduto).toBe('esim');
    expect(opEsim?.valorEstimado).toBe(380); // 2 * 190
    expect(opEsim?.mensagemWhatsApp).toContain('Mariana');
    expect(opEsim?.mensagemWhatsApp).toContain('eSIM');
  });

  it('deve sugerir sala VIP para pacotes com voos ou valor acima de R$ 5.000', () => {
    // Setup
    const produtos = [{ tipo: 'Aéreo', nome: 'Voo Rio - Santiago' }];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, 'Santiago', 3, 7000);

    // Assert
    const opSalaVip = oportunidades.find((o) => o.id === 'upsell-sala-vip');
    expect(opSalaVip).toBeDefined();
    expect(opSalaVip?.categoriaProduto).toBe('sala_vip');
    expect(opSalaVip?.valorEstimado).toBe(840); // 3 * 280
  });

  it('deve sugerir locação de veículo para destinos com alta demanda rodoviária (ex: Orlando, Miami, Bariloche)', () => {
    // Setup
    const produtos = [{ tipo: 'Hotel', nome: 'Resort Internacional' }];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, 'Miami', 2, 9000);

    // Assert
    const opCarro = oportunidades.find((o) => o.id === 'upsell-locacao-veiculo');
    expect(opCarro).toBeDefined();
    expect(opCarro?.categoriaProduto).toBe('carro');
    expect(opCarro?.valorEstimado).toBe(680); // Math.max(680, 2 * 340)
  });

  it('deve sugerir bagagem despachada e assento conforto quando houver aéreo sem adicionais', () => {
    // Setup
    const produtos = [{ tipo: 'Aéreo', nome: 'Voo Congonhas - Salvador' }];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities(produtos, 'Salvador', 2, 2500);

    // Assert
    const opBagagem = oportunidades.find((o) => o.id === 'upsell-bagagem-assento');
    expect(opBagagem).toBeDefined();
    expect(opBagagem?.categoriaProduto).toBe('aereo');
    expect(opBagagem?.valorEstimado).toBe(480); // 2 * 240
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

  it('deve filtrar oportunidades já dispensadas pelo consultor', () => {
    // Setup - Destino internacional sem seguro nem chip, mas com chip dispensado
    const produtos = [{ tipo: 'Aéreo', nome: 'Voo SP - Madri' }];
    const dispensados = ['upsell-esim-internacional'];

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities({
      produtos,
      destino: 'Madri',
      totalPax: 2,
      valorTotal: 12000,
      dispensados
    });

    // Assert
    const opEsim = oportunidades.find((o) => o.id === 'upsell-esim-internacional');
    const opSeguro = oportunidades.find((o) => o.id === 'upsell-seguro-saude');
    expect(opEsim).toBeUndefined(); // Filtrado
    expect(opSeguro).toBeDefined(); // Permanece
  });

  it('deve respeitar toggles granulares configurados em settings.upsell_config', () => {
    // Setup - Desativar regra de sala_vip via configuração administrativa
    const produtos = [{ tipo: 'Aéreo', nome: 'Voo SP - Barcelona' }];
    const settings = {
      habilitar_upsell_preditivo: true,
      upsell_config: {
        sala_vip: false,
        esim: true,
        seguro_saude: true
      }
    };

    // Action
    const oportunidades = UpsellEngineService.calculateUpsellOpportunities({
      produtos,
      destino: 'Barcelona',
      totalPax: 2,
      valorTotal: 10000,
      settings
    });

    // Assert
    const opSalaVip = oportunidades.find((o) => o.id === 'upsell-sala-vip');
    const opEsim = oportunidades.find((o) => o.id === 'upsell-esim-internacional');
    expect(opSalaVip).toBeUndefined(); // Regra desativada
    expect(opEsim).toBeDefined(); // Regra ativa
  });

  it('deve reconhecer destino internacional vindo do cadastro de destinos do banco', () => {
    // Setup - Destino incomum cadastrado no banco com país Espanha
    const destinosCadastrados = [
      { id: 'd1', nome: 'Sevilha', pais: 'Espanha' }
    ];

    // Action
    const isInternacional = UpsellEngineService.isDestinoInternacional('Sevilha Tour', destinosCadastrados);

    // Assert
    expect(isInternacional).toBe(true);
  });

  it('deve persistir dispensa de oportunidade no Supabase sem uso de localStorage', async () => {
    // Setup
    const mockViagem = { id: 'v123', upsell_dispensados: ['upsell-antigo'] };
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockViagem, error: null })
      })
    });
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          select: mockSelect,
          update: mockUpdate
        } as any;
      }
      return {} as any;
    });

    // Action
    const res = await UpsellEngineService.dismissOpportunity('v123', 'upsell-esim-internacional');

    // Assert
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      upsell_dispensados: ['upsell-antigo', 'upsell-esim-internacional']
    });
  });

  it('deve validar alias retroativo isUserThiagoCosta chamando isUpsellEnabled', () => {
    // Setup & Action
    const habilitado = UpsellEngineService.isUserThiagoCosta({ id: 'u1' }, { id: 'u1' });

    // Assert
    expect(habilitado).toBe(true);
  });
});
