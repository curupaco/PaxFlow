import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EscalaService, isSameConsultantName } from '../../src/services/escalaService';
import { supabase } from '../../src/services/supabase';
import { PushSenderService } from '../../src/services/pushSenderService';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom
    }
  };
});

vi.mock('../../src/services/pushSenderService', () => {
  return {
    PushSenderService: {
      sendToUser: vi.fn().mockResolvedValue({ success: true, status: 200 })
    }
  };
});

function createQueryMock(data: any = [], error: any = null) {
  const result = { data, error };
  const mock: any = {
    select: vi.fn(() => mock),
    order: vi.fn(() => mock),
    not: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    gte: vi.fn(() => mock),
    lte: vi.fn(() => mock),
    delete: vi.fn(() => mock),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    insert: vi.fn(() => Promise.resolve(result)),
    update: vi.fn(() => mock),
    upsert: vi.fn(() => Promise.resolve(result)),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    }
  };
  return mock;
}

describe('EscalaService Subcutaneous Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // FLUXO 1: UTILITÁRIOS E REGRAS DE NEGÓCIO
  // ==========================================

  it('deve identificar correspondencia de nomes de consultores com variacoes', () => {
    // Setup
    const nome1 = 'Thiago Costa';
    const nome2 = 'Thiago C.';
    const nome3 = 'Carlos Silva';

    // Action
    const matchSame = isSameConsultantName(nome1, 'thiago costa');
    const matchFirst = isSameConsultantName(nome1, nome2);
    const matchDiff = isSameConsultantName(nome1, nome3);

    // Assert
    expect(matchSame).toBe(true);
    expect(matchFirst).toBe(true);
    expect(matchDiff).toBe(false);
  });

  it('deve mapear feriados nacionais e estaduais do mes corretamente', () => {
    // Setup
    const ano = 2026;
    const mesSetembro = 9;

    // Action
    const feriados = EscalaService.getFeriadosDoMes(ano, mesSetembro);

    // Assert
    expect(feriados[7]).toBeDefined();
    expect(feriados[7].nome).toBe('Independência do Brasil');
    expect(feriados[7].tipo).toBe('nacional');
  });

  // ==========================================
  // FLUXO 2: ORDENAÇÃO E CÉLULAS DA ESCALA
  // ==========================================

  it('deve carregar ordem customizada de consultores a partir de escala_eventos', async () => {
    // Setup
    const mockOrdem = ['Thiago Costa', 'Carlos Consultor', 'Marina Gestora'];
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_eventos') {
        return createQueryMock({ consultor_nome: JSON.stringify(mockOrdem) });
      }
      return createQueryMock(null);
    });

    // Action
    const ordem = await EscalaService.loadOrdemConsultores();

    // Assert
    expect(ordem).toEqual(mockOrdem);
  });

  it('deve persistir celula da escala_diaria com observacao customizada', async () => {
    // Setup
    const ano = 2026;
    const mes = 9;
    const diaIndex = 14; // Dia 15
    const consultor = 'Thiago Costa';
    const turno = '12-19';
    const observacao = 'Plantão excepcional';

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_diaria') {
        return { upsert: mockUpsert };
      }
      return createQueryMock([]);
    });

    // Action
    const sucesso = await EscalaService.salvarCelulaEscala(ano, mes, consultor, diaIndex, turno, observacao);

    // Assert
    expect(sucesso).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        consultor_nome: consultor,
        data: '2026-09-15',
        turno_codigo: turno,
        observacao_custom: observacao
      }),
      expect.anything()
    );
  });

  it('deve preencher mes em lote atribuindo folgas semanais e turno padrao', async () => {
    // Setup
    const ano = 2026;
    const mes = 9; // Setembro tem 30 dias
    const consultor = 'Carlos Consultor';
    const turnoPadrao = '10-17';
    const diasFolga = [0, 6]; // Domingo e Sábado

    let rowsEnviadas: any[] = [];
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_diaria') {
        return {
          upsert: vi.fn((rows) => {
            rowsEnviadas = rows;
            return Promise.resolve({ error: null });
          })
        };
      }
      return createQueryMock([]);
    });

    // Action
    const sucesso = await EscalaService.preencherMesEmLote(ano, mes, consultor, turnoPadrao, diasFolga);

    // Assert
    expect(sucesso).toBe(true);
    expect(rowsEnviadas.length).toBe(30);
    // 06/09/2026 é Domingo (dow 0) -> deve ser Folga
    const domingoItem = rowsEnviadas.find(r => r.data === '2026-09-06');
    expect(domingoItem?.turno_codigo).toBe('Folga');
    // 08/09/2026 é Terça-feira (dow 2) -> deve ser 10-17
    const tercaItem = rowsEnviadas.find(r => r.data === '2026-09-08');
    expect(tercaItem?.turno_codigo).toBe('10-17');
  });

  // ==========================================
  // FLUXO 3: CRIAÇÃO E CANCELAMENTO DE SOLICITAÇÕES
  // ==========================================

  it('deve criar solicitacao de folga com status pendente_admin e notificar admins via push', async () => {
    // Setup
    const solicitacaoData = {
      tipo: 'folga' as const,
      solicitante_id: 'a1111111-b222-c333-d444-e55555555555',
      solicitante_nome: 'Thiago Costa',
      data_origem: '2026-09-20',
      data_destino: '2026-09-20',
      motivo: 'Casamento familiar',
      status: 'pendente_admin' as const
    };

    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_solicitacoes') {
        return { insert: mockInsert };
      }
      if (table === 'profiles') {
        return createQueryMock([{ id: 'admin-uuid-1', role: 'admin' }]);
      }
      return createQueryMock([]);
    });

    // Action
    const result = await EscalaService.criarSolicitacao(solicitacaoData);

    // Assert
    expect(result.id).toBeDefined();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'folga',
        solicitante_nome: 'Thiago Costa',
        status: 'pendente_admin'
      })
    );
    expect(PushSenderService.sendToUser).toHaveBeenCalledWith(
      'admin-uuid-1',
      expect.objectContaining({
        title: expect.stringContaining('Solicitação de Escala: Folga Semanal')
      })
    );
  });

  it('deve cancelar solicitacao pendente se executado pelo solicitante', async () => {
    // Setup
    const solId = 'sol-pendente-123';
    const userId = 'user-solicitante-uuid';

    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_solicitacoes') {
        const q = createQueryMock({
          id: solId,
          solicitante_id: userId,
          status: 'pendente_admin'
        });
        q.update = mockUpdate;
        return q;
      }
      return createQueryMock([]);
    });

    // Action
    const sucesso = await EscalaService.cancelarSolicitacao(solId, userId);

    // Assert
    expect(sucesso).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'recusado',
        resposta_admin: 'Cancelada pelo próprio solicitante'
      })
    );
  });

  it('nao deve permitir cancelar solicitacao que ja foi aprovada', async () => {
    // Setup
    const solId = 'sol-aprovada-999';
    const userId = 'user-solicitante-uuid';

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_solicitacoes') {
        return createQueryMock({
          id: solId,
          solicitante_id: userId,
          status: 'aprovado'
        });
      }
      return createQueryMock([]);
    });

    // Action
    const sucesso = await EscalaService.cancelarSolicitacao(solId, userId);

    // Assert
    expect(sucesso).toBe(false);
  });

  // ==========================================
  // FLUXO 4: APROVAÇÃO E INVERSÃO DE TURNOS
  // ==========================================

  it('deve bloquear atualizacao se solicitacao ja foi processada (alreadyProcessed)', async () => {
    // Setup
    const solId = 'sol-finalizada-1';

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_solicitacoes') {
        return createQueryMock({
          id: solId,
          status: 'aprovado',
          respondido_por: 'Marina Admin'
        });
      }
      return createQueryMock([]);
    });

    // Action
    const result = await EscalaService.atualizarStatusSolicitacao(solId, 'recusado');

    // Assert
    expect(result.success).toBe(false);
    expect(result.alreadyProcessed).toBe(true);
    expect(result.currentStatus).toBe('aprovado');
  });

  it('deve aprovar troca bilateral invertendo turnos dos consultores na escala_diaria', async () => {
    // Setup
    const solId = 'sol-troca-uuid-777';
    const solicitacaoTroca = {
      id: solId,
      tipo: 'troca',
      status: 'pendente_admin',
      solicitante_id: 'a1111111-0000-0000-0000-000000000001',
      solicitante_nome: 'Thiago Costa',
      destinatario_id: 'b2222222-0000-0000-0000-000000000002',
      destinatario_nome: 'Carlos Consultor',
      data_origem: '2026-09-10', // Dia 10
      data_destino: '2026-09-15' // Dia 15
    };

    const spySalvarCelula = vi.spyOn(EscalaService, 'salvarCelulaEscala').mockResolvedValue(true);
    const spyLoadEscala = vi.spyOn(EscalaService, 'loadEscalaMensal').mockResolvedValue({
      'Thiago Costa': ['10-17', '10-17', '10-17', '10-17', '10-17', '10-17', '10-17', '10-17', '10-17', '10-17'], // Dia 10 é índice 9 ('10-17')
      'Carlos Consultor': ['14-21', '14-21', '14-21', '14-21', '14-21', '14-21', '14-21', '14-21', '14-21', '14-21', '14-21', '14-21', '14-21', '14-21', '14-21'] // Dia 15 é índice 14 ('14-21')
    });

    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_solicitacoes') {
        const q = createQueryMock(solicitacaoTroca);
        q.update = mockUpdate;
        return q;
      }
      return createQueryMock([]);
    });

    // Action
    const result = await EscalaService.atualizarStatusSolicitacao(solId, 'aprovado', 'Troca aprovada', 'Gestor');

    // Assert
    expect(result.success).toBe(true);
    // Deve salvar turno do Carlos (14-21) para o Thiago no dia 10 (idx 9)
    expect(spySalvarCelula).toHaveBeenCalledWith(2026, 9, 'Thiago Costa', 9, '14-21');
    // Deve salvar turno do Thiago (10-17) para o Carlos no dia 15 (idx 14)
    expect(spySalvarCelula).toHaveBeenCalledWith(2026, 9, 'Carlos Consultor', 14, '10-17');
    // Notifica solicitante original do deferimento
    expect(PushSenderService.sendToUser).toHaveBeenCalledWith(
      'a1111111-0000-0000-0000-000000000001',
      expect.objectContaining({
        title: expect.stringContaining('Resposta da Escala: Aprovada ✅')
      })
    );
  });

  it('deve carregar comentários e observações customizadas da escala_diaria', async () => {
    // Setup
    const mockRows = [
      { consultor_nome: 'Thiago Costa', data: '2026-09-05', observacao_custom: 'Entrada às 11h' },
      { consultor_nome: 'Carlos Consultor', data: '2026-09-12', observacao_custom: 'Reunião comercial' }
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_diaria') {
        return createQueryMock(mockRows);
      }
      return createQueryMock([]);
    });

    // Action
    const obsMap = await EscalaService.loadEscalaComentarios(2026, 9);

    // Assert
    expect(obsMap['Thiago Costa']).toBeDefined();
    expect(obsMap['Thiago Costa'][4]).toBe('Entrada às 11h'); // Dia 5 -> índice 4
    expect(obsMap['Carlos Consultor']).toBeDefined();
    expect(obsMap['Carlos Consultor'][11]).toBe('Reunião comercial'); // Dia 12 -> índice 11
  });

  it('deve persistir a ordenação customizada de consultores no Supabase', async () => {
    // Setup
    const novaOrdem = ['Marina Gestora', 'Thiago Costa', 'Carlos Consultor'];
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'escala_eventos') {
        return {
          upsert: mockUpsert
        };
      }
      return createQueryMock([]);
    });

    // Action
    const sucesso = await EscalaService.salvarOrdemConsultores(novaOrdem);

    // Assert
    expect(sucesso).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'CONFIG_ORDEM_ESCALA',
      consultor_nome: JSON.stringify(novaOrdem)
    }));
  });
});

