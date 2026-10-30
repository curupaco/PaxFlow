import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskScoreService } from '../../src/services/riskScoreService';
import { Viagem, Cliente, ProdutoViagem } from '../../src/types';

describe('PaxFlow Risk Score™ - Validador de Exigências Sanitárias, Vacinas e Vistos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve classificar corretamente exigências para o Espaço Schengen (Europa) e penalizar falta de seguro', () => {
    // // Setup
    const viagemSchengen: Viagem = {
      id: 'v-schengen-1',
      cliente_id: 'c-1',
      destino: 'Paris, França',
      data_ida: '2026-11-15',
      data_volta: '2026-11-30',
      status: 'confirmada',
      valor_total: 15000,
      processo_conferido: true,
      voucher_geral_anexado: false
    };

    const cliente: Cliente = {
      id: 'c-1',
      nome: 'Carlos Viajante',
      email: 'carlos@exemplo.com',
      telefone: '11999998888',
      documento: '12345678900',
      dataNascimento: '1985-05-15',
      consultorResponsavelId: 'user-1',
      passaportes: [{ nome: 'Carlos Viajante', numero: 'FP123456', validade: '2028-12-31' }]
    };

    // Produtos sem seguro viagem
    const produtos: ProdutoViagem[] = [
      { id: 'p-1', viagemId: 'v-schengen-1', tipo: 'Voo Aéreo', fornecedor: 'Air France', descricao: 'GRU-CDG', dataServico: '2026-11-15', codigoReserva: 'LOC123', status: 'emitido', valorVenda: 8000, valorCusto: 7000 },
      { id: 'p-2', viagemId: 'v-schengen-1', tipo: 'Hotel Paris', fornecedor: 'Accor', descricao: 'Hotel Paris', dataServico: '2026-11-16', codigoReserva: 'HOTEL99', status: 'emitido', valorVenda: 7000, valorCusto: 6000 }
    ];

    // // Action
    const settings = { habilitar_risk_score: true } as any;
    const exigencias = RiskScoreService.obterExigenciasDestino(viagemSchengen.destino);
    const diagnosis = RiskScoreService.calculateTripRiskScore(viagemSchengen, cliente, produtos, settings);

    // // Assert
    expect(exigencias.categoria).toBe('schengen');
    expect(exigencias.seguroObrigatorio).toBe(true);
    expect(exigencias.seguroMinimoEur).toBe(30000);
    expect(diagnosis.exigenciasDestino?.categoria).toBe('schengen');
    
    // Deve conter pendência crítica do Tratado de Schengen
    const itemSeguro = diagnosis.itens.find(i => i.id === 'p4-seguro-schengen-ausente');
    expect(itemSeguro).toBeDefined();
    expect(itemSeguro?.penalidadePontos).toBe(25);
    expect(itemSeguro?.titulo).toContain('Espaço Schengen');
  });

  it('deve identificar exigência de vacina contra Febre Amarela (CIVP Anvisa) para destinos como Tailândia e África do Sul', () => {
    // // Setup
    const viagemTailandia: Viagem = {
      id: 'v-thai-1',
      cliente_id: 'c-2',
      destino: 'Bangkok, Tailândia',
      data_ida: '2026-11-20',
      data_volta: '2026-12-05',
      status: 'confirmada',
      valor_total: 20000,
      processo_conferido: true,
      voucher_geral_anexado: false
    };

    const cliente: Cliente = {
      id: 'c-2',
      nome: 'Mariana Silva',
      email: 'mariana@exemplo.com',
      telefone: '11988887777',
      documento: '98765432100',
      dataNascimento: '1990-08-20',
      consultorResponsavelId: 'user-1',
      passaportes: [{ nome: 'Mariana Silva', numero: 'FP654321', validade: '2028-10-10' }]
    };

    const produtos: ProdutoViagem[] = [
      { id: 'p-1', viagemId: 'v-thai-1', tipo: 'Aéreo Emirates', fornecedor: 'Emirates', descricao: 'GRU-DXB-BKK', dataServico: '2026-11-20', codigoReserva: 'LOC999', status: 'emitido', valorVenda: 12000, valorCusto: 11000 },
      { id: 'p-2', viagemId: 'v-thai-1', tipo: 'Seguro Viagem Global', fornecedor: 'GTA', descricao: 'Seguro Internacional', dataServico: '2026-11-20', codigoReserva: 'SEG123', status: 'emitido', valorVenda: 1000, valorCusto: 800 }
    ];

    // // Action
    const settings = { habilitar_risk_score: true } as any;
    const exigencias = RiskScoreService.obterExigenciasDestino(viagemTailandia.destino);
    const diagnosis = RiskScoreService.calculateTripRiskScore(viagemTailandia, cliente, produtos, settings);

    // // Assert
    expect(exigencias.categoria).toBe('febre_amarela');
    expect(exigencias.vacinaObrigatoria).toBe(true);
    expect(exigencias.vacinaDescricao).toContain('CIVP');
    
    const itemVacina = diagnosis.itens.find(i => i.id === 'p1-civp-febre-amarela');
    expect(itemVacina).toBeDefined();
    expect(itemVacina?.acaoTipo).toBe('orientar_visto_vacina');
  });

  it('deve orientar sobre RG < 10 anos e recusa de CNH para destinos do Mercosul', () => {
    // // Setup
    const viagemArgentina: Viagem = {
      id: 'v-arg-1',
      cliente_id: 'c-3',
      destino: 'Buenos Aires & Bariloche, Argentina',
      data_ida: '2026-11-10',
      data_volta: '2026-11-18',
      status: 'confirmada',
      valor_total: 9000,
      processo_conferido: true
    };

    const clienteSemPassaporte: Cliente = {
      id: 'c-3',
      nome: 'Lucas Mendes',
      email: 'lucas@exemplo.com',
      telefone: '11977776666',
      documento: '11122233344',
      dataNascimento: '1995-03-12',
      consultorResponsavelId: 'user-1'
    };

    // // Action
    const settings = { habilitar_risk_score: true } as any;
    const exigencias = RiskScoreService.obterExigenciasDestino(viagemArgentina.destino);
    const diagnosis = RiskScoreService.calculateTripRiskScore(viagemArgentina, clienteSemPassaporte, [], settings);

    // // Assert
    expect(exigencias.categoria).toBe('mercosul');
    expect(exigencias.vistoExigido).toBe(false);
    expect(exigencias.docExigido).toContain('RG Original');
    
    const itemMercosul = diagnosis.itens.find(i => i.id === 'p1-mercosul-rg-10anos');
    expect(itemMercosul).toBeDefined();
    expect(itemMercosul?.descricaoHumana).toContain('CNH não é aceita');
  });

  it('deve mapear destinos nacionais sem requisitos consulares ou sanitários internacionais', () => {
    // // Setup
    const destinoNacional = 'Gramado, Rio Grande do Sul';

    // // Action
    const exigencias = RiskScoreService.obterExigenciasDestino(destinoNacional);

    // // Assert
    expect(exigencias.categoria).toBe('nacional');
    expect(exigencias.vistoExigido).toBe(false);
    expect(exigencias.seguroObrigatorio).toBe(false);
    expect(exigencias.vacinaObrigatoria).toBe(false);
  });
});
