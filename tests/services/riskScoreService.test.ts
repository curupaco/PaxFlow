import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskScoreService } from '../../src/services/riskScoreService';
import { Viagem, Cliente, ProdutoViagem } from '../../src/types';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../src/utils/featureFlags', () => ({
  isRiskScoreEnabled: vi.fn().mockReturnValue(true),
}));

describe('RiskScoreService - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar status neutro se o recurso estiver desativado pela feature flag', async () => {
    // Setup
    const { isRiskScoreEnabled } = await import('../../src/utils/featureFlags');
    vi.mocked(isRiskScoreEnabled).mockReturnValueOnce(false);

    const viagemMock: any = {
      id: 'v1',
      destino: 'Paris',
      data_ida: '2026-12-01',
    };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemMock);

    // Assert
    expect(resultado.score).toBe(100);
    expect(resultado.nivel).toBe('verde');
    expect(resultado.fraseStatus).toBe('PaxFlow Risk Score™ Desativado');
    expect(resultado.badgeClass).toBe('hidden');
  });

  it('deve identificar grace period quando a partida estiver além da janela de carência', () => {
    // Setup
    const dataFuturaDistante = new Date();
    dataFuturaDistante.setDate(dataFuturaDistante.getDate() + 90); // 90 dias no futuro (> 60 dias)

    const viagemMock: any = {
      id: 'v2',
      destino: 'São Paulo',
      data_ida: dataFuturaDistante.toISOString().split('T')[0],
      data_volta: dataFuturaDistante.toISOString().split('T')[0],
    };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemMock, null, [], {
      risk_score_janela_carencia_dias: 60,
    } as any);

    // Assert
    expect(resultado.isGracePeriod).toBe(true);
  });

  it('deve sinalizar risco documental em viagem internacional se cliente não tiver passaporte cadastrado', () => {
    // Setup
    const dataProxima = new Date();
    dataProxima.setDate(dataProxima.getDate() + 20); // 20 dias da viagem (< carência de 60)

    const viagemInternacional: any = {
      id: 'v3',
      destino: 'Orlando',
      data_ida: dataProxima.toISOString().split('T')[0],
      data_volta: dataProxima.toISOString().split('T')[0],
      status: 'confirmada',
    };

    const clienteSemPassaporte: any = {
      id: 'cli-1',
      nome: 'Carlos Eduardo',
      passaporte_numero: null,
      passaporte_validade: null,
    };

    const produtos: any[] = [
      { id: 'p1', tipo: 'Voo Internacional', dataServico: dataProxima.toISOString().split('T')[0] },
    ];

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemInternacional, clienteSemPassaporte, produtos);

    // Assert
    expect(resultado.score).toBeLessThan(100);
    const itemPassaporte = resultado.itens.find((i) => i.titulo.toLowerCase().includes('passaporte'));
    expect(itemPassaporte).toBeDefined();
    expect(itemPassaporte?.pilar).toBe(1);
  });

  it('deve manter nota 100 para viagem nacional sem pendências operacionais', () => {
    // Setup
    const dataProxima = new Date();
    dataProxima.setDate(dataProxima.getDate() + 15);

    const viagemNacional: any = {
      id: 'v4',
      destino: 'Gramado',
      data_ida: dataProxima.toISOString().split('T')[0],
      data_volta: dataProxima.toISOString().split('T')[0],
      voucher_geral_anexado: true,
      processo_conferido: true,
      status: 'confirmada',
    };

    const clienteCompleto: any = {
      id: 'cli-2',
      nome: 'Mariana Lima',
      documento: '123.456.789-00',
      telefone: '11999992222',
      email: 'mariana@email.com',
    };

    const produtos: any[] = [
      { id: 'p2', tipo: 'Hospedagem', voucher_anexado: true },
    ];

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemNacional, clienteCompleto, produtos);

    // Assert
    expect(resultado.score).toBe(100);
    expect(resultado.nivel).toBe('verde');
    expect(resultado.itens.filter((i) => i.nivel === 'vermelho')).toHaveLength(0);
  });

  it('deve acumular penalidades de múltiplos pilares e garantir que o score nunca seja inferior a 0', () => {
    // Setup
    const dataProxima = new Date();
    dataProxima.setDate(dataProxima.getDate() + 10);

    const viagemCritica: any = {
      id: 'v-critica',
      destino: 'Paris',
      data_ida: dataProxima.toISOString().split('T')[0],
      data_volta: dataProxima.toISOString().split('T')[0],
      processo_conferido: false,
      status: 'confirmada',
    };

    // Cliente sem documentos, telefone ou email (Pilar 5: -10)
    const clienteIncompleto: any = { id: 'c-critico', nome: 'Pendente' };

    // Sem voucher geral, com voo sem LOC (Pilar 2: -15) e hotel sem voucher (Pilar 2: -15)
    // Sem passaporte (Pilar 1: -30)
    // Sem processo conferido (Pilar 3: -15)
    // Sem seguro (Pilar 4: -10)
    const produtos: any[] = [
      { id: 'p1', tipo: 'Voo Internacional' },
      { id: 'p2', tipo: 'Hotel Paris' },
    ];

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemCritica, clienteIncompleto, produtos);

    // Assert
    expect(resultado.score).toBeGreaterThanOrEqual(0);
    expect(resultado.nivel).toBe('vermelho');
    expect(resultado.itens.length).toBeGreaterThanOrEqual(3);
  });

  it('deve aplicar bonificação de +25 pontos quando houver justificativa operacional aprovada', () => {
    // Setup
    const dataProxima = new Date();
    dataProxima.setDate(dataProxima.getDate() + 10);

    const viagemBase: any = {
      id: 'v-justificada',
      destino: 'São Paulo',
      data_ida: dataProxima.toISOString().split('T')[0],
      data_volta: dataProxima.toISOString().split('T')[0],
      processo_conferido: false, // Perde 15 pontos
      risk_score_justificativa: 'Aguardando confirmação formal de emissão da companhia aérea autorizada pelo gerente',
    };

    const clienteCompleto: any = {
      id: 'c-ok',
      nome: 'Silvia',
      documento: '111',
      telefone: '222',
      email: 's@teste.com',
    };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemBase, clienteCompleto, []);

    // Assert
    // Base: 100 - 15 = 85. Com justificativa: 85 + 25 = 110 -> limitado a 100
    expect(resultado.score).toBe(100);
    expect(resultado.nivel).toBe('verde');
  });

  it('deve penalizar passaporte com validade crítica menor que 180 dias da data de volta', () => {
    // Setup
    const dataIda = new Date();
    dataIda.setDate(dataIda.getDate() + 10);
    const dataVolta = new Date();
    dataVolta.setDate(dataVolta.getDate() + 20);

    // Passaporte vence apenas 60 dias após a volta (< 180 dias exigidos para internacional)
    const validadeCritica = new Date(dataVolta);
    validadeCritica.setDate(validadeCritica.getDate() + 60);

    const viagemInternacional: any = {
      id: 'v-pass-critico',
      destino: 'Roma',
      data_ida: dataIda.toISOString().split('T')[0],
      data_volta: dataVolta.toISOString().split('T')[0],
      processo_conferido: true,
      voucher_geral_anexado: true,
    };

    const clienteComPassaporteQuaseVencido: any = {
      id: 'c-pass-1',
      nome: 'Lucas Lima',
      documento: '123',
      telefone: '123',
      email: 'l@teste.com',
      passaporteNumero: 'FP123456',
      passaporteValidade: validadeCritica.toISOString().split('T')[0],
    };

    const produtos: any[] = [{ tipo: 'Aéreo Internacional', dataServico: dataIda.toISOString().split('T')[0] }];

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemInternacional, clienteComPassaporteQuaseVencido, produtos);

    // Assert
    const itemValidade = resultado.itens.find((i) => i.titulo.includes('Validade Crítica'));
    expect(itemValidade).toBeDefined();
    expect(resultado.score).toBeLessThan(100);
  });

  it('deve conceder isenção inteligente de voucher de hospedagem para viagens bate-volta', () => {
    // Setup
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 10);
    const mesmoDia = hoje.toISOString().split('T')[0];

    const viagemBateVolta: any = {
      id: 'v-bate-volta',
      destino: 'Rio de Janeiro',
      data_ida: mesmoDia,
      data_volta: mesmoDia, // Bate-volta (1 dia)
      processo_conferido: true,
      voucher_geral_anexado: false,
    };

    const cliente: any = { id: 'c1', nome: 'Ana', documento: '1', telefone: '2', email: 'e@teste.com' };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemBateVolta, cliente, []);

    // Assert
    const itemGapHotel = resultado.itens.find((i) => i.id === 'p2-voucher-hotel');
    expect(itemGapHotel).toBeUndefined(); // Isento de hotel
    expect(resultado.score).toBe(100);
  });

  it('deve persistir voucher geral do pacote diretamente na tabela viagens', async () => {
    // Setup
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

    // Action
    const sucesso = await RiskScoreService.salvarVoucherGeralPacote('v-pacote-10', 'https://storage/voucher.pdf');

    // Assert
    expect(sucesso).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      voucher_geral_pacote: 'https://storage/voucher.pdf',
      voucher_geral_anexado: true,
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'v-pacote-10');
  });

  it('deve utilizar fallback nas observações se as colunas de voucher geral não existirem', async () => {
    // Setup
    let updateCallCount = 0;
    const updateEqMock = vi.fn().mockImplementation(() => {
      updateCallCount++;
      if (updateCallCount === 1) {
        return Promise.resolve({ error: { message: 'column voucher_geral_pacote does not exist' } });
      }
      return Promise.resolve({ error: null });
    });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    const selectSingle = vi.fn().mockResolvedValue({ data: { observacoes: 'Notas prévias' }, error: null });
    const selectEq = vi.fn().mockReturnValue({ single: selectSingle });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEq });

    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
      select: selectMock,
    } as any);

    // Action
    const sucesso = await RiskScoreService.salvarVoucherGeralPacote('v-fallback-1', 'https://storage/voucher.pdf');

    // Assert
    expect(sucesso).toBe(true);
    expect(updateEqMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenLastCalledWith({
      observacoes: 'Notas prévias\n[VOUCHER_GERAL]: https://storage/voucher.pdf',
    });
  });

  it('deve persistir justificativa de risco na tabela viagens', async () => {
    // Setup
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

    // Action
    const sucesso = await RiskScoreService.registrarJustificativaRisco('v-risco-1', 'Voo já reconfirmado com a Gol', 'Thiago Costa');

    // Assert
    expect(sucesso).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        risk_score_justificativa: 'Voo já reconfirmado com a Gol',
        risk_score_justificado_por: 'Thiago Costa',
      })
    );
    expect(updateEqMock).toHaveBeenCalledWith('id', 'v-risco-1');
  });

  it('deve retornar false caso ocorra falha de rede/exceção não tratada ao salvar justificativa', async () => {
    // Setup
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error('Falha catastrófica de rede');
    });

    // Action
    const sucesso = await RiskScoreService.registrarJustificativaRisco('v-erro-1', 'Justificativa', 'Consultor');

    // Assert
    expect(sucesso).toBe(false);
  });

  it('deve penalizar em 25 pontos viagem com embarque em menos de 24h sem contato pré-embarque', () => {
    // Setup
    const hoje = new Date();
    const hojeIso = hoje.toISOString().split('T')[0];

    const viagemMock: any = {
      id: 'v-urgente-1',
      destino: 'Rio de Janeiro',
      data_ida: hojeIso,
      data_volta: hojeIso,
      processo_conferido: true,
      contatos_embarque: {},
    };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemMock, null, [], {
      risk_score_janela_carencia_dias: 60,
    } as any);

    // Assert
    expect(resultado.score).toBe(75); // 100 - 25
    expect(resultado.itens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'p3-contato-pre-embarque-24h',
          penalidadePontos: 25,
          acaoTipo: 'abrir_pre_embarque',
        }),
      ])
    );
  });

  it('não deve penalizar viagem com embarque em menos de 24h se o contato pré-embarque estiver marcado como feito', () => {
    // Setup
    const hoje = new Date();
    const hojeIso = hoje.toISOString().split('T')[0];

    const viagemMock: any = {
      id: 'v-urgente-2',
      destino: 'Rio de Janeiro',
      data_ida: hojeIso,
      data_volta: hojeIso,
      processo_conferido: true,
      contatos_embarque: {
        'viagem-ida': { feito: true, data_contato: new Date().toISOString(), consultor_nome: 'Thiago' },
        'viagem-volta': { feito: true, data_contato: new Date().toISOString(), consultor_nome: 'Thiago' },
      },
    };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemMock, null, [], {
      risk_score_janela_carencia_dias: 60,
    } as any);

    // Assert
    expect(resultado.score).toBe(100);
    expect(resultado.itens.some(i => i.id === 'p3-contato-pre-embarque-24h')).toBe(false);
  });

  it('não deve aplicar penalidade de 24h para viagem com embarque além da janela crítica', () => {
    // Setup
    const dataFutura = new Date();
    dataFutura.setDate(dataFutura.getDate() + 10);
    const dataFuturaIso = dataFutura.toISOString().split('T')[0];

    const viagemMock: any = {
      id: 'v-distante-1',
      destino: 'Gramado',
      data_ida: dataFuturaIso,
      data_volta: dataFuturaIso,
      processo_conferido: true,
      contatos_embarque: {},
    };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemMock, null, [], {
      risk_score_janela_carencia_dias: 60,
    } as any);

    // Assert
    expect(resultado.itens.some(i => i.id === 'p3-contato-pre-embarque-24h')).toBe(false);
  });

  it('deve penalizar trecho aéreo iminente nas próximas 24h se o contato daquele trecho específico estiver pendente', () => {
    // Setup
    const hoje = new Date();
    const hojeIso = hoje.toISOString().split('T')[0];

    const viagemMock: any = {
      id: 'v-aereo-1',
      destino: 'São Paulo',
      data_ida: '2026-12-01', // ida distante
      data_volta: '2026-12-10',
      processo_conferido: true,
      contatos_embarque: {
        'viagem-ida': { feito: true },
      },
    };

    const produtosMock: any = [
      {
        id: 'prod-aereo-1',
        tipo: 'AÉREO OPERADORA',
        dados_adicionais: {
          trechos: [
            {
              origem: 'BSB',
              destino: 'CGH',
              dataIda: hojeIso, // trecho acontecendo hoje
            },
          ],
        },
      },
    ];

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemMock, null, produtosMock, {
      risk_score_janela_carencia_dias: 60,
    } as any);

    // Assert
    expect(resultado.score).toBe(75);
    expect(resultado.itens.some(i => i.id === 'p3-contato-pre-embarque-24h')).toBe(true);
  });
});

