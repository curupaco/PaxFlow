import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskScoreService } from '../../src/services/riskScoreService';
import { Viagem, Cliente, ProdutoViagem } from '../../src/types';

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
});
