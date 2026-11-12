import { describe, it, expect } from 'vitest';
import { ViagensTransicaoManager } from '../../src/components/dashboard/ViagensTransicaoManager';
import { DashboardFilterEngine } from '../../src/components/dashboard/DashboardFilterEngine';

describe('Ciclo de Vida Operacional - Status Em Viagem e Transições Temporais', () => {
  // Setup
  const hoje = new Date('2026-11-12T12:00:00Z');
  const slaPreEmbarqueDias = 7;

  it('deve transicionar automaticamente para pos_viagem quando a data de volta já passou', () => {
    // Setup
    const viagemPassada = {
      id: 'via-0303',
      status: 'pos_venda',
      destino: 'Barcelona, Espanha',
      data_ida: '2026-09-20',
      data_volta: '2026-10-05',
      produtos: []
    };

    // Action
    const novoStatus = ViagensTransicaoManager.determinarStatusTemporal(
      viagemPassada,
      hoje,
      slaPreEmbarqueDias
    );

    // Assert
    expect(novoStatus).toBe('pos_viagem');
  });

  it('deve transicionar para em_viagem quando o cliente já embarcou e a volta ainda não ocorreu', () => {
    // Setup
    const viagemEmAndamento = {
      id: 'via-0500',
      status: 'pre_embarque',
      destino: 'Paris, França',
      data_ida: '2026-11-10',
      data_volta: '2026-11-20',
      produtos: []
    };

    // Action
    const novoStatus = ViagensTransicaoManager.determinarStatusTemporal(
      viagemEmAndamento,
      hoje,
      slaPreEmbarqueDias
    );

    // Assert
    expect(novoStatus).toBe('em_viagem');
  });

  it('deve transicionar para pre_embarque quando a viagem estiver dentro da janela de SLA de embarque', () => {
    // Setup
    const viagemProxima = {
      id: 'via-0316',
      status: 'pos_venda',
      destino: 'Nova York, EUA',
      data_ida: '2026-11-15',
      data_volta: '2026-11-25',
      produtos: []
    };

    // Action
    const novoStatus = ViagensTransicaoManager.determinarStatusTemporal(
      viagemProxima,
      hoje,
      slaPreEmbarqueDias
    );

    // Assert
    expect(novoStatus).toBe('pre_embarque');
  });

  it('deve manter pos_venda quando o embarque estiver distante (fora da janela de SLA)', () => {
    // Setup
    const viagemDistante = {
      id: 'via-0999',
      status: 'pos_venda',
      destino: 'Tóquio, Japão',
      data_ida: '2027-04-10',
      data_volta: '2027-04-25',
      produtos: []
    };

    // Action
    const novoStatus = ViagensTransicaoManager.determinarStatusTemporal(
      viagemDistante,
      hoje,
      slaPreEmbarqueDias
    );

    // Assert
    expect(novoStatus).toBeNull();
  });

  it('não deve alterar status de viagens em fechado, canceladas ou reembolso_solicitado', () => {
    // Setup
    const viagemFechada = {
      id: 'via-fechada',
      status: 'fechado',
      data_ida: '2026-10-01',
      data_volta: '2026-10-10'
    };
    const viagemReembolso = {
      id: 'via-reembolso',
      status: 'reembolso_solicitado',
      data_ida: '2026-10-01',
      data_volta: '2026-10-10'
    };

    // Action
    const resFechada = ViagensTransicaoManager.determinarStatusTemporal(viagemFechada, hoje, slaPreEmbarqueDias);
    const resReembolso = ViagensTransicaoManager.determinarStatusTemporal(viagemReembolso, hoje, slaPreEmbarqueDias);

    // Assert
    expect(resFechada).toBeNull();
    expect(resReembolso).toBeNull();
  });

  it('deve calcular contadores e filtrar por aba em_viagem no DashboardFilterEngine', () => {
    // Setup
    const viagens = [
      { id: '1', status: 'fechado', consultor_id: 'u1' },
      { id: '2', status: 'pos_venda', consultor_id: 'u1' },
      { id: '3', status: 'pre_embarque', consultor_id: 'u1' },
      { id: '4', status: 'em_viagem', consultor_id: 'u1' },
      { id: '5', status: 'em_viagem', consultor_id: 'u1' },
      { id: '6', status: 'pos_viagem', consultor_id: 'u1' },
      { id: '7', status: 'reembolso_solicitado', consultor_id: 'u1' }
    ];

    // Action
    const resultado = DashboardFilterEngine.filtrarEOrdenarViagens({
      viagens,
      user: { id: 'u1' },
      perfil: { id: 'u1', role: 'admin', nome: 'Admin' } as any,
      consultores: [],
      selectedConsultantId: 'todos',
      buscaTermo: '',
      viewModeMonth: 'all',
      activeStatusTab: 'em_viagem',
      confFilters: { finPendente: false, finOk: false, procPendente: false, procOk: false },
      dataFinStart: '',
      dataFinEnd: '',
      dataIdaStart: '',
      dataIdaEnd: '',
      dataVoltaStart: '',
      dataVoltaEnd: '',
      advMesAno: '',
      advProdutos: [],
      advProdutoMatchMode: 'AND',
      advDestinos: [],
      advFornecedor: '',
      advValorMin: null,
      advValorMax: null,
      advTarifaMin: null,
      advTarifaMax: null,
      advTaxaMin: null,
      advTaxaMax: null,
      advComissaoMin: null,
      advComissaoMax: null,
      advMarkupMin: null,
      advMarkupMax: null,
      advRavMin: null,
      advRavMax: null,
      advRentabilidadeMin: null,
      advRentabilidadeMax: null,
      advMarkupRav: 'todos',
      advAnexos: 'todos',
      advSla: 'todos',
      advRiskScore: [],
      advConsultores: [],
      advFormasRecebimento: [],
      advOrigensLead: [],
      advPaxFaixas: [],
      advTags: [],
      sortField: 'data_financeiro',
      sortDirection: 'desc'
    });

    // Assert
    expect(resultado.counts.em_viagem).toBe(2);
    expect(resultado.filtrados.length).toBe(2);
    expect(resultado.filtrados.every(v => v.status === 'em_viagem')).toBe(true);
  });
});
