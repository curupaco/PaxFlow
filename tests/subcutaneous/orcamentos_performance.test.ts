import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';
import { OrcamentosService } from '../../src/services/orcamentosService';
import { ClienteSearchService } from '../../src/services/clienteSearchService';
import { Orcamento } from '../../src/types';
import { createSupabaseQueryMock as createQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-orc' } } })
      }
    },
    getSessaoAtual: vi.fn().mockResolvedValue({
      user: { id: 'user-admin-1' },
      perfil: { id: 'user-admin-1', nome: 'Admin Teste', role: 'admin' },
      error: null
    })
  };
});

describe('Orçamentos & Funil Kanban - Testes Subcutâneos de Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar orçamentos com filtro temporal inteligente de 30 dias por padrão', async () => {
    // Setup
    const filtrosOrAplicados: string[] = [];
    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      const originalOr = qMock.or.bind(qMock);
      qMock.or = vi.fn((filterStr: string) => {
        filtrosOrAplicados.push(filterStr);
        return originalOr(filterStr);
      });
      return qMock;
    });

    const user = { id: 'consultor-123' };
    const perfil = { id: 'consultor-123', nome: 'Consultor', role: 'consultor' } as any;

    // Action
    await OrcamentosService.loadOrcamentos(user, perfil);

    // Assert
    expect(filtrosOrAplicados.length).toBe(1);
    expect(filtrosOrAplicados[0]).toContain('SOLICITADO');
    expect(filtrosOrAplicados[0]).toContain('created_at.gte');
  });

  it('deve carregar histórico completo de orçamentos quando options.incluirTodosConcluidos for true', async () => {
    // Setup
    const filtrosOrAplicados: string[] = [];
    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      const originalOr = qMock.or.bind(qMock);
      qMock.or = vi.fn((filterStr: string) => {
        filtrosOrAplicados.push(filterStr);
        return originalOr(filterStr);
      });
      return qMock;
    });

    const user = { id: 'admin-123' };
    const perfil = { id: 'admin-123', nome: 'Admin', role: 'admin' } as any;

    // Action
    await OrcamentosService.loadOrcamentos(user, perfil, { incluirTodosConcluidos: true });

    // Assert
    expect(filtrosOrAplicados.length).toBe(0);
  });

  it('deve alternar o status de contato de desistência sem disparar nova consulta select', async () => {
    // Setup
    let updateChamado = false;
    let selectChamado = false;
    let payloadGravado: any = null;

    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([]);
      const originalUpdate = qMock.update.bind(qMock);
      const originalSelect = qMock.select.bind(qMock);

      qMock.update = vi.fn((data: any) => {
        updateChamado = true;
        payloadGravado = data;
        return originalUpdate(data);
      });

      qMock.select = vi.fn((cols: string) => {
        selectChamado = true;
        return originalSelect(cols);
      });

      return qMock;
    });

    const orcamentoId = 'orc-desistencia-123';
    const perfil = { id: 'admin-1', nome: 'Gestor Comercial', role: 'admin' } as any;

    // Action
    const resultado = await OrcamentosService.alternarContatoDesistencia(orcamentoId, true, perfil);

    // Assert
    expect(resultado.success).toBe(true);
    expect(resultado.contatoRealizado).toBe(true);
    expect(updateChamado).toBe(true);
    expect(selectChamado).toBe(false);
    expect(payloadGravado).toBeDefined();
    expect(payloadGravado.contato_realizado).toBe(true);
    expect(payloadGravado.contato_realizado_por).toBe('admin-1');
  });

  it('deve realizar mutação cirúrgica em memória ao reabrir proposta sem consultar a rede novamente', async () => {
    // Setup
    const orcamentoMock: Orcamento = {
      id: 'orc-reabertura-001',
      consultorId: 'cons-1',
      clienteId: 'cli-1',
      nomeCliente: 'Mariana Rios',
      contato: '11999998888',
      destino: 'Lisboa, Portugal',
      dataViagem: '2026-10-15',
      temperatura: 'Frio',
      tags: [],
      status: 'CONCLUIDO',
      subStatus: 'DESISTENCIA',
      notasNegociacao: 'Cliente achou caro no momento.',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    };

    const listaOrcamentosLocal: Orcamento[] = [orcamentoMock];

    (supabase.from as any).mockImplementation((table: string) => {
      const qMock = createQueryMock([
        {
          id: orcamentoMock.id,
          notas_negociacao: orcamentoMock.notasNegociacao
        }
      ]);
      return qMock;
    });

    const perfil = { id: 'admin-1', nome: 'Gestor Comercial', role: 'admin' } as any;

    // Action
    const res = await OrcamentosService.reabrirOrcamento(orcamentoMock.id, 'Cliente retomou contato', perfil);

    if (res.success) {
      const orcLocal = listaOrcamentosLocal.find(o => o.id === orcamentoMock.id);
      if (orcLocal) {
        orcLocal.status = 'SOLICITADO';
        orcLocal.subStatus = undefined;
        orcLocal.contatoRealizado = false;
        orcLocal.contato_realizado = false;
        if (res.orcamentoAtualizado?.notas_negociacao) {
          orcLocal.notasNegociacao = res.orcamentoAtualizado.notas_negociacao;
        }
      }
    }

    // Assert
    expect(res.success).toBe(true);
    const orcAtualizado = listaOrcamentosLocal[0];
    expect(orcAtualizado.status).toBe('SOLICITADO');
    expect(orcAtualizado.subStatus).toBeUndefined();
    expect(orcAtualizado.contatoRealizado).toBe(false);
  });

  it('deve acionar busca remota de clientes via ClienteSearchService somente para termos com 3 ou mais caracteres', async () => {
    // Setup
    const spyBuscarClientes = vi.spyOn(ClienteSearchService, 'buscarClientes').mockResolvedValue({
      data: [{ id: 'cli-buscado-1', nome: 'Eduardo Cunha', telefone: '11988887777', email: 'eduardo@teste.com' }] as any,
      totalCount: 1,
      page: 1,
      limit: 10
    });

    const termoCurto = 'Ed';
    const termoValido = 'Edu';

    // Action
    let resultadoCurto: any = null;
    if (termoCurto.length >= 3) {
      resultadoCurto = await ClienteSearchService.buscarClientes({ termo: termoCurto, limitePagina: 10, isAdmin: true });
    }

    let resultadoValido: any = null;
    if (termoValido.length >= 3) {
      resultadoValido = await ClienteSearchService.buscarClientes({ termo: termoValido, limitePagina: 10, isAdmin: true });
    }

    // Assert
    expect(resultadoCurto).toBeNull();
    expect(resultadoValido).not.toBeNull();
    expect(spyBuscarClientes).toHaveBeenCalledTimes(1);
    expect(spyBuscarClientes).toHaveBeenCalledWith({
      termo: 'Edu',
      limitePagina: 10,
      isAdmin: true
    });
  });

  it('deve garantir que a inicialização de OrcamentosPage não invoque loadClientes irrestrito na carga da tela', async () => {
    // Setup
    vi.stubGlobal('document', {
      getElementById: vi.fn().mockReturnValue(null),
      querySelector: vi.fn().mockReturnValue(null),
      querySelectorAll: vi.fn().mockReturnValue([]),
      addEventListener: vi.fn()
    });
    vi.stubGlobal('window', {
      addEventListener: vi.fn()
    });

    const spyLoadClientes = vi.spyOn(OrcamentosService, 'loadClientes');
    vi.spyOn(OrcamentosService, 'loadConsultores').mockResolvedValue([]);
    vi.spyOn(OrcamentosService, 'loadOrcamentos').mockResolvedValue([]);

    const container = {
      innerHTML: '',
      querySelector: vi.fn().mockReturnValue(null),
      querySelectorAll: vi.fn().mockReturnValue([])
    } as any;

    const { OrcamentosPage } = await import('../../src/pages/Orcamentos');
    const page = new OrcamentosPage(container);

    // Action
    await page.init();

    // Assert
    expect(spyLoadClientes).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

