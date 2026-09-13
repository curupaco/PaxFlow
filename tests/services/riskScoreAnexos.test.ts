import { describe, it, expect, vi } from 'vitest';
import { RiskScoreService } from '../../src/services/riskScoreService';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../src/utils/featureFlags', () => ({
  isRiskScoreEnabled: vi.fn().mockReturnValue(true),
}));

describe('RiskScoreService - Abatimento de Pendências por Anexos', () => {
  it('deve abater risco de hotel pendente quando houver anexo de VOUCHER_HOTEL na viagem', () => {
    // Setup
    const viagemSemAnexo: any = {
      id: 'v1',
      data_ida: '2026-10-01',
      data_volta: '2026-10-10',
      destino: 'Paris',
      processo_conferido: true,
      anexos: []
    };
    const produtosHotel: any[] = [
      { id: 'p1', tipo: 'hotel', valorVenda: 5000, status: 'confirmado' }
    ];
    const cliente: any = { id: 'c1', nome: 'João', documento: '123', telefone: '119999', email: 'j@a.com', passaporteNumero: 'FP123' };

    // Action
    const resultadoSemAnexo = RiskScoreService.calculateTripRiskScore(viagemSemAnexo, cliente, produtosHotel);
    const pendenciaHotelSemAnexo = resultadoSemAnexo.itens.find(i => i.id === 'p2-voucher-hotel');

    const viagemComAnexo: any = {
      ...viagemSemAnexo,
      anexos: [
        { id: 'anx-1', tipo_documento: 'VOUCHER_HOTEL', rotulo: 'Voucher Hotel Paris' }
      ]
    };
    const resultadoComAnexo = RiskScoreService.calculateTripRiskScore(viagemComAnexo, cliente, produtosHotel);
    const pendenciaHotelComAnexo = resultadoComAnexo.itens.find(i => i.id === 'p2-voucher-hotel');

    // Assert
    expect(pendenciaHotelSemAnexo).toBeDefined();
    expect(pendenciaHotelComAnexo).toBeUndefined();
    expect(resultadoComAnexo.score).toBeGreaterThan(resultadoSemAnexo.score);
  });

  it('deve abater risco de bilhete aéreo / LOC pendente quando houver anexo de VOUCHER_AEREO na viagem', () => {
    // Setup
    const viagem: any = {
      id: 'v2',
      data_ida: '2026-10-01',
      data_volta: '2026-10-10',
      destino: 'Miami',
      processo_conferido: true,
      anexos: [
        { id: 'anx-voo', tipo_documento: 'VOUCHER_AEREO', rotulo: 'E-Ticket American Airlines' }
      ]
    };
    const produtosAereo: any[] = [
      { id: 'p-air', tipo: 'aéreo', valorVenda: 4000, status: 'confirmado' }
    ];
    const cliente: any = { id: 'c2', nome: 'Maria', documento: '123', telefone: '119999', email: 'm@a.com', passaporteNumero: 'FP999' };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagem, cliente, produtosAereo);
    const pendenciaVoo = resultado.itens.find(i => i.id === 'p2-loc-voo');

    // Assert
    expect(pendenciaVoo).toBeUndefined();
  });

  it('deve abater risco de seguro viagem internacional quando houver anexo do tipo SEGURO', () => {
    // Setup
    const viagem: any = {
      id: 'v3',
      data_ida: '2026-10-01',
      data_volta: '2026-10-10',
      destino: 'Orlando',
      processo_conferido: true,
      anexos: [
        { id: 'anx-seguro', tipo_documento: 'SEGURO', rotulo: 'Apólice SulAmérica' }
      ]
    };
    const produtos: any[] = [];
    const cliente: any = { id: 'c3', nome: 'Carlos', documento: '123', telefone: '119999', email: 'c@a.com', passaporteNumero: 'FP888' };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagem, cliente, produtos);
    const pendenciaSeguro = resultado.itens.find(i => i.id === 'p4-seguro-ausente');

    // Assert
    expect(pendenciaSeguro).toBeUndefined();
  });

  it('deve validar documentação em viagem nacional se o cliente possuir anexo de CNH ou RG', () => {
    // Setup
    const viagemNacional: any = {
      id: 'v4',
      data_ida: '2026-10-01',
      data_volta: '2026-10-05',
      destino: 'Gramado',
      processo_conferido: true,
      anexos: [
        { id: 'anx-cnh', tipo_documento: 'CNH', rotulo: 'CNH Titular' }
      ]
    };
    const clienteSemCpfTexto: any = { id: 'c4', nome: 'Ana', documento: '', telefone: '119999', email: 'ana@a.com' };

    // Action
    const resultado = RiskScoreService.calculateTripRiskScore(viagemNacional, clienteSemCpfTexto, []);
    const pendenciaDoc = resultado.itens.find(i => i.id === 'p5-dados-cliente');

    // Assert
    expect(pendenciaDoc).toBeUndefined();
  });
});
