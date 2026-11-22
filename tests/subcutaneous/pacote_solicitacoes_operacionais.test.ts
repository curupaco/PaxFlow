import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardFilterEngine } from '../../src/components/dashboard/DashboardFilterEngine';
import { InboxService } from '../../src/services/inboxService';
import { RELATORIOS_PERMITIDOS_CONSULTOR } from '../../src/components/relatorios/shell/RelatoriosShellView';
import { buscarAeroportosPorTermo } from '../../src/utils/iataCatalog';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { supabase } from '../../src/services/supabase';
import { ViagensTableView } from '../../src/components/dashboard/ViagensTableView';
import { DashboardFilterBar } from '../../src/components/dashboard/DashboardFilterBar';
import { DashboardFilterStateManager } from '../../src/components/dashboard/DashboardFilterStateManager';
import {
  normalizarDocumentoLeady,
  processarConteudosCsvLeady,
  gerarSqlCargaLeady
} from '../../scripts/importar_leady_sql';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'consultor-teste' } } })
    }
  }
}));

describe('Pacote de Solicitações Operacionais — Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve filtrar corretamente viagens por presença de anexos (anexos_count e voucher em produto)', () => {
    // Setup
    const user = { id: 'admin-1' };
    const perfil = { id: 'admin-1', nome: 'Admin', role: 'admin', ativo: true } as any;
    const baseOptions: any = {
      user,
      perfil,
      consultores: [perfil],
      selectedConsultantId: 'todos',
      buscaTermo: '',
      viewModeMonth: 'all',
      activeStatusTab: 'todos',
      confFilters: { finPendente: false, finOk: false, procPendente: false, procOk: false },
      dataFinStart: '',
      dataFinEnd: '',
      dataIdaStart: '',
      dataIdaEnd: '',
      dataVoltaStart: '',
      dataVoltaEnd: '',
      advMesAno: '',
      advProdutos: [],
      advProdutoMatchMode: 'OR',
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
      advSla: 'todos',
      advRiskScore: [],
      advConsultores: [],
      advFormasRecebimento: [],
      advOrigensLead: [],
      advPaxFaixas: [],
      advTags: [],
      sortField: '',
      sortDirection: 'asc',
      locPagamentosMap: new Map(),
      slaPreEmbarqueDias: 7,
      slaPosViagemDias: 3,
      settings: { id: '1', agencyName: 'PaxFlow', taxaCancelamentoPadrao: 0, prazoReembolsoDias: 3, notificacoesAtivas: true, emailSuporte: 'a@b.com' },
      tiposProduto: [],
      viagens: [
        {
          id: 'v-com-anexo',
          consultor_id: 'admin-1',
          destino: 'Paris',
          status: 'pos_venda',
          anexos_count: 2,
          produtos: [],
          cliente: { nome: 'Maria Silva' }
        },
        {
          id: 'v-com-voucher-prod',
          consultor_id: 'admin-1',
          destino: 'Roma',
          status: 'pos_venda',
          anexos_count: 0,
          produtos: [{ id: 'p1', tipo: 'Hotel', voucher_url: 'https://drive.google.com/doc.pdf' }],
          cliente: { nome: 'João Souza' }
        },
        {
          id: 'v-sem-anexo',
          consultor_id: 'admin-1',
          destino: 'Lisboa',
          status: 'pos_venda',
          anexos_count: 0,
          produtos: [{ id: 'p2', tipo: 'Aéreo' }],
          cliente: { nome: 'Carlos Lima' }
        }
      ]
    };

    // Action
    const resComAnexo = DashboardFilterEngine.filtrarEOrdenarViagens({ ...baseOptions, advAnexos: 'com_anexo' });
    const resSemAnexo = DashboardFilterEngine.filtrarEOrdenarViagens({ ...baseOptions, advAnexos: 'sem_anexo' });

    // Assert
    expect(resComAnexo.filtrados.map(v => v.id)).toEqual(['v-com-anexo', 'v-com-voucher-prod']);
    expect(resSemAnexo.filtrados.map(v => v.id)).toEqual(['v-sem-anexo']);
  });

  it('deve aplicar SLA de pré-embarque diferenciado de 20 dias para Cruzeiros vs 7 dias para Aéreo', () => {
    // Setup
    const hoje = new Date();
    const em15Dias = new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const viagemCruzeiro = {
      id: 'via-cruz-1',
      status: 'pos_venda',
      data_ida: em15Dias,
      produtos: [
        { id: 'p1', tipo: 'Cruzeiro', fornecedor: 'MSC', data_servico: em15Dias }
      ]
    };

    const viagemAerea = {
      id: 'via-aer-1',
      status: 'pos_venda',
      data_ida: em15Dias,
      produtos: [
        { id: 'p2', tipo: 'Aéreo Facial', fornecedor: 'LATAM', data_servico: em15Dias }
      ]
    };

    const settings = {
      id: 's1',
      agencyName: 'PaxFlow',
      taxaCancelamentoPadrao: 0,
      prazoReembolsoDias: 3,
      notificacoesAtivas: true,
      emailSuporte: 'a@b.com',
      slaPreEmbarqueDias: 7,
      slaCruzeiroPreEmbarqueDias: 20
    };

    // Action
    const slaCruzeiro = DashboardFilterEngine.checkSLA(viagemCruzeiro, 7, 3, settings);
    const slaAerea = DashboardFilterEngine.checkSLA(viagemAerea, 7, 3, settings);

    // Assert: Aos 15 dias do embarque, apenas o Cruzeiro deve acender alerta de pré-embarque
    expect(slaCruzeiro.alert).toBe(true);
    expect(slaCruzeiro.type).toBe('pre-embarque');
    expect(slaAerea.alert).toBe(false);
  });

  it('deve gerar visão dupla no Calendário imediatamente para viagens futuras (Embarque real + Ação SLA + Retorno)', () => {
    // Setup
    const user = { id: 'consultor-1' };
    const perfil = { id: 'consultor-1', role: 'consultor', nome: 'Ana' } as any;
    const viagens = [
      {
        id: 'via-fut-2027',
        consultor_id: 'consultor-1',
        status: 'pos_venda',
        destino: 'Orlando, Estados Unidos',
        data_ida: '2027-07-15',
        data_volta: '2027-07-25',
        codigo_localizador: 'ABC123',
        cliente: { nome: 'Marcos Paulo' },
        produtos: []
      },
      {
        id: 'via-cruz-2027',
        consultor_id: 'consultor-1',
        status: 'pos_venda',
        destino: 'Mediterrâneo',
        data_ida: '2027-09-25',
        cliente: { nome: 'Lúcia Helena' },
        produtos: [{ id: 'p-cruz', tipo: 'Cruzeiro', fornecedor: 'Costa', data_servico: '2027-09-25' }]
      }
    ];

    // Action
    const events = InboxService.buildCalendarScheduleFromViagens(viagens, user, perfil, 7, 20);

    // Assert
    const embAereo = events.find(e => e.targetId === 'via-fut-2027' && e.calendarCategory === 'embarque_agenda');
    const slaAereo = events.find(e => e.targetId === 'via-fut-2027' && e.calendarCategory === 'sla_acao');
    const retAereo = events.find(e => e.targetId === 'via-fut-2027' && e.calendarCategory === 'retorno_agenda');
    const slaCruzeiro = events.find(e => e.targetId === 'via-cruz-2027' && e.calendarCategory === 'sla_acao');

    expect(embAereo?.eventDate).toBe('2027-07-15');
    expect(embAereo?.calendarOnly).toBe(true);
    expect(slaAereo?.eventDate).toBe('2027-07-08'); // 7 dias antes de 15/07/2027
    expect(slaAereo?.calendarOnly).toBe(true);
    expect(retAereo?.eventDate).toBe('2027-07-25');
    expect(slaCruzeiro?.eventDate).toBe('2027-09-05'); // 20 dias antes de 25/09/2027
  });

  it('deve restringir os relatórios do Consultor exatamente aos 5 módulos operacionais definidos e suportar busca IATA', () => {
    // Setup & Action
    const permitidos = [...RELATORIOS_PERMITIDOS_CONSULTOR];
    const mco = buscarAeroportosPorTermo('MCO');
    const gru = buscarAeroportosPorTermo('GRU');

    // Assert
    expect(permitidos).toEqual([
      'embarques',
      'faturamento',
      'metas_campanhas',
      'perdas',
      'satisfacao'
    ]);
    expect(permitidos).not.toContain('desempenho');
    expect(permitidos).not.toContain('auditoria');
    expect(mco[0].code).toBe('MCO');
    expect(mco[0].city).toBe('Orlando');
    expect(gru[0].code).toBe('GRU');
  });

  it('deve desduplicar clientes históricos do Leady priorizando lote recente e gerando SQL com COALESCE', () => {
    // Setup
    const header = 'Nome;Consultor;"E-mail 1";"E-mail 2";"Telefone 1";"Telefone 2";"Telefone 3";CPF/CNPJ;"Primeiro Atendimento";"Último Atendimento";"Primeira Compra";"Última Compra";Rentabilidade;"Ticket Médio";"Menor Compra";"Maior Compra";"Atendimentos Totais";"Atendimentos Fechados";"Atendimentos Abertos"\n';
    const csvLote1 = header + '"Joao Silva";Malta;antigo@email.com;;"(11) 91111-1111";;;8677577874;"2020-08-01";"2021-10-01";2020-08-01;2021-10-01;"1.000,00";5000;5000;5000;1;1;0\n';
    const csvLote2 = header + '"Joao Silva";Cadu;novo@email.com;;"(11) 99999-9999";;;08677577874;"2024-01-01";"2025-05-10";2024-01-01;2025-05-10;"2.500,50";10000;10000;10000;2;2;0\n';

    // Action
    const docNorm = normalizarDocumentoLeady('8677577874');
    const proc = processarConteudosCsvLeady([csvLote1, csvLote2]);
    const sql = gerarSqlCargaLeady(proc);

    // Assert
    expect(docNorm.limpo).toBe('08677577874');
    expect(docNorm.formatado).toBe('086.775.778-74');
    expect(proc.totalLinhasBrutas).toBe(2);
    expect(proc.totalClientesUnicos).toBe(1);
    expect(proc.duplicatasMescladas).toBe(1);
    expect(proc.clientes[0].consultorLeady).toBe('Cadu');
    expect(proc.clientes[0].email).toBe('novo@email.com');
    expect(proc.clientes[0].atendimentosFechados).toBe(3);
    expect(proc.clientes[0].rentabilidade).toBeCloseTo(3500.50);
    expect(sql).toContain('BEGIN;');
    expect(sql).toContain('COMMIT;');
    expect(sql).toContain('COALESCE');
    expect(sql).toContain('[Histórico Leady]');
  });

  it('deve higienizar IDs temporários orc-... para null e preservar UUID real ao criar proposta do Studio a partir de orçamento', async () => {
    // Setup
    const payloadsEnviados: any[] = [];
    (supabase.from as any).mockImplementation(() => ({
      upsert: (payload: any) => {
        payloadsEnviados.push(payload);
        return {
          select: () => ({
            single: async () => ({
              data: { id: 'prop-uuid-1', ...payload },
              error: null
            })
          })
        };
      }
    }));

    const uuidReal = '550e8400-e29b-41d4-a716-446655440000';

    // Action
    await StudioPropostasService.criarPropostaFromOrcamento({
      id: 'orc-temp123',
      nomeCliente: 'Maria Silva',
      destino: 'Orlando'
    });
    await StudioPropostasService.criarPropostaFromOrcamento({
      id: uuidReal,
      nomeCliente: 'Carlos Souza',
      destino: 'Paris'
    });

    // Assert
    expect(payloadsEnviados).toHaveLength(2);
    expect(payloadsEnviados[0].orcamento_origem_id).toBeNull();
    expect(payloadsEnviados[1].orcamento_origem_id).toBe(uuidReal);
  });

  it('deve renderizar cards mobile sem rolagem interna aninhada, compactar resumo financeiro na busca e limpar busca global', () => {
    // Setup
    const tableCtx: any = {
      user: { id: 'u1' },
      perfil: { id: 'u1', role: 'admin' },
      settings: {},
      consultores: [],
      buscaTermo: 'João',
      sortField: '',
      sortDirection: 'asc',
      isTodosReembolsosConcluidos: () => false,
      checkSLA: () => ({ alert: false, type: null, text: '' }),
      getTripFinancialTotals: () => ({
        totalVenda: 5000,
        totalRentabilidade: 500,
        totalMarkup: 0,
        totalRav: 0,
        isDividida: false,
        fatiaVenda: 1,
        fatiaRav: 1
      }),
      getConsultorContextoAtivoId: () => null
    };
    const filterCtx: any = {
      totalViagens: 1,
      totalVendas: 5000,
      totalRentabilidade: 500,
      totalMarkupAcumulado: 0,
      totalRavAcumulado: 0,
      ticketMedio: 5000
    };

    const globalInput = { value: 'João' };
    const clearBtn = { classList: { add: vi.fn() } };
    const dropdown = { classList: { add: vi.fn() } };
    const localInput = { value: 'João' };

    vi.stubGlobal('document', {
      getElementById: (id: string) => {
        if (id === 'global-search-input') return globalInput;
        if (id === 'btn-clear-global-search') return clearBtn;
        if (id === 'global-search-dropdown') return dropdown;
        if (id === 'input-busca-viagem') return localInput;
        return null;
      }
    });

    try {
      const stateManager = new DashboardFilterStateManager({
        user: { id: 'u1' },
        perfil: { id: 'u1', role: 'admin' } as any,
        settings: {} as any,
        consultores: [],
        formasRecebimento: [],
        origensLead: [],
        listaDestinosDisponiveis: [],
        tiposProduto: [],
        onStateChange: vi.fn(),
        onNovaViagem: vi.fn(),
        onExportCsv: vi.fn()
      });

      // Action
      const tableHtml = ViagensTableView.renderTableAndMobileView(
        [{ id: 'v1', destino: 'Orlando', status: 'fechado', cliente: { nome: 'João' }, produtos: [] }],
        tableCtx
      );
      const summaryModoFoco = DashboardFilterBar.renderFinancialSummaryBarHTML(filterCtx, { buscaTermo: 'João' } as any);

      stateManager.buscaTermo = 'João';
      stateManager.removeSingleFilter('busca');
      const valorAposRemoveSingle = globalInput.value;

      globalInput.value = 'Orlando';
      stateManager.buscaTermo = 'Orlando';
      stateManager.resetAllFilters();

      // Assert
      expect(tableHtml).toContain('class="block md:hidden space-y-3.5 pb-6"');
      expect(summaryModoFoco).toContain('hidden sm:flex');
      expect(valorAposRemoveSingle).toBe('');
      expect(globalInput.value).toBe('');
      expect(localInput.value).toBe('');
      expect(clearBtn.classList.add).toHaveBeenCalledWith('hidden');
      expect(dropdown.classList.add).toHaveBeenCalledWith('hidden');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

