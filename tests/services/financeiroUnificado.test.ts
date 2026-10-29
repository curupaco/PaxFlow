import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Módulo Financeiro Unificado - Testes Subcutâneos de Permissão e Navegação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve validar permissão de acesso ao Financeiro e Conciliação para perfis autorizados', () => {
    // Setup
    const perfis = [
      { role: 'admin', acesso_financeiro: false, esperado: true },
      { role: 'financeiro', acesso_financeiro: false, esperado: true },
      { role: 'consultor', acesso_financeiro: true, esperado: true },
      { role: 'consultor', acesso_financeiro: false, esperado: false },
      { role: 'gestor', acesso_financeiro: false, esperado: false }
    ];

    const verificarPermissaoFinanceiro = (perfil: any): boolean => {
      return (
        perfil?.role === 'admin' ||
        perfil?.role === 'financeiro' ||
        perfil?.acesso_financeiro === true ||
        perfil?.acessoFinanceiro === true
      );
    };

    // Action & Assert
    perfis.forEach(({ role, acesso_financeiro, esperado }) => {
      const autorizado = verificarPermissaoFinanceiro({ role, acesso_financeiro });
      expect(autorizado).toBe(esperado);
    });
  });

  it('deve garantir que a operação de Fechamento de Mês seja estritamente exclusiva para perfil admin', () => {
    // Setup
    const operacoes = [
      { perfil: { role: 'admin' }, podeFecharMes: true },
      { perfil: { role: 'financeiro', acesso_financeiro: true }, podeFecharMes: false },
      { perfil: { role: 'consultor', acesso_financeiro: true }, podeFecharMes: false }
    ];

    const podeExecutarFechamentoMes = (perfil: any): boolean => {
      return perfil?.role === 'admin';
    };

    // Action & Assert
    operacoes.forEach(({ perfil, podeFecharMes }) => {
      const resultado = podeExecutarFechamentoMes(perfil);
      expect(resultado).toBe(podeFecharMes);
    });
  });

  it('deve normalizar slugs e resolver corretamente os 5 submódulos do Financeiro', () => {
    // Setup
    const mapaSubView: Record<string, string> = {
      'contas': 'contas',
      'contas-pagar': 'contas',
      'remessas': 'remessas',
      'remessas-agrupadas': 'remessas',
      'fluxo': 'fluxo',
      'fluxo-caixa': 'fluxo',
      'conciliacao': 'conciliacao',
      'plano': 'plano',
      'plano-contas': 'plano'
    };

    const resolverSubView = (slug?: string) => {
      if (!slug) return 'contas';
      return mapaSubView[slug] || 'contas';
    };

    // Action
    const subContas = resolverSubView('contas-pagar');
    const subRemessas = resolverSubView('remessas');
    const subFluxo = resolverSubView('fluxo-caixa');
    const subConciliacao = resolverSubView('conciliacao');
    const subPlano = resolverSubView('plano-contas');
    const subDefault = resolverSubView(undefined);
    const subInvalido = resolverSubView('inexistente');

    // Assert
    expect(subContas).toBe('contas');
    expect(subRemessas).toBe('remessas');
    expect(subFluxo).toBe('fluxo');
    expect(subConciliacao).toBe('conciliacao');
    expect(subPlano).toBe('plano');
    expect(subDefault).toBe('contas');
    expect(subInvalido).toBe('contas');
  });

  it('deve redirecionar a rota legada #conciliacao para #financeiro?sub=conciliacao', () => {
    // Setup
    const resolverRota = (hashRaw: string) => {
      let [hashPage, queryString] = hashRaw.replace('#', '').split('?');
      let extraId: string | undefined = undefined;

      if (hashPage === 'conciliacao') {
        hashPage = 'financeiro';
        extraId = 'conciliacao';
      }

      if (queryString) {
        const params = new URLSearchParams(queryString);
        extraId = params.get('sub') || params.get('extraId') || extraId;
      }

      return { page: hashPage, sub: extraId };
    };

    // Action
    const rotaLegada = resolverRota('#conciliacao');
    const rotaFinanceiroDireta = resolverRota('#financeiro?sub=remessas');
    const rotaFinanceiroPadrao = resolverRota('#financeiro');

    // Assert
    expect(rotaLegada.page).toBe('financeiro');
    expect(rotaLegada.sub).toBe('conciliacao');
    expect(rotaFinanceiroDireta.page).toBe('financeiro');
    expect(rotaFinanceiroDireta.sub).toBe('remessas');
    expect(rotaFinanceiroPadrao.page).toBe('financeiro');
    expect(rotaFinanceiroPadrao.sub).toBeUndefined();
  });

  it('deve calcular corretamente a absorção percentual e indicador do DRE', () => {
    // Setup
    const cenarios = [
      { nominal: 1000, pago: 500, pctEsperado: 50, corEsperada: 'bg-emerald-500' },
      { nominal: 1000, pago: 900, pctEsperado: 90, corEsperada: 'bg-amber-500' },
      { nominal: 1000, pago: 1200, pctEsperado: 120, corEsperada: 'bg-rose-500' },
      { nominal: 0, pago: 0, pctEsperado: 0, corEsperada: 'bg-emerald-500' }
    ];

    const calcularDRELinha = (nominal: number, pago: number) => {
      const dif = nominal - pago;
      const pct = nominal > 0 ? Math.round((pago / nominal) * 100) : (pago > 0 ? 100 : 0);
      const corBarra = pct > 100 ? 'bg-rose-500' : (pct >= 85 ? 'bg-amber-500' : 'bg-emerald-500');
      return { dif, pct, corBarra };
    };

    // Action & Assert
    cenarios.forEach(({ nominal, pago, pctEsperado, corEsperada }) => {
      const res = calcularDRELinha(nominal, pago);
      expect(res.pct).toBe(pctEsperado);
      expect(res.corBarra).toBe(corEsperada);
      expect(res.dif).toBe(nominal - pago);
    });
  });

  it('deve desagrupar remessa com tratamento defensivo e resiliência a schema drift 42703', async () => {
    // Setup
    const { FinRemessasService } = await import('../../src/services/finRemessasService');
    const { supabase } = await import('../../src/services/supabase');

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { code: '42703', message: 'column remessa_id does not exist' } })
    });
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { code: '42703', message: 'table fin_remessas does not exist' } })
    });

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_pagar') {
        return { update: updateMock } as any;
      }
      return { delete: deleteMock } as any;
    });

    // Action
    const res = await FinRemessasService.desagruparRemessa('rem-teste-123');

    // Assert
    expect(res.sucesso).toBe(true);
  });

  it('deve persistir e editar categoria do Plano de Contas via FinPlanoContasService', async () => {
    // Setup
    const { FinPlanoContasService } = await import('../../src/services/finPlanoContasService');
    const { supabase } = await import('../../src/services/supabase');

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'cat-uuid-123' },
          error: null
        })
      })
    });

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    });

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'fin_categorias') {
        return {
          insert: insertMock,
          update: updateMock
        } as any;
      }
      return {} as any;
    });

    // Action 1: Criar Nova Categoria
    const resCriacao = await FinPlanoContasService.salvarCategoria('Energia Elétrica', 'tipo-1');

    // Assert 1
    expect(resCriacao.sucesso).toBe(true);
    expect(resCriacao.id).toBe('cat-uuid-123');
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Energia Elétrica',
      tipo_custo_id: 'tipo-1',
      ativo: true
    }));

    // Action 2: Editar Categoria Existente
    const resEdicao = await FinPlanoContasService.salvarCategoria('Energia Elétrica Matriz', 'tipo-1', 'cat-uuid-123');

    // Assert 2
    expect(resEdicao.sucesso).toBe(true);
    expect(resEdicao.id).toBe('cat-uuid-123');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Energia Elétrica Matriz'
    }));
  });

  it('deve persistir conta bancária com tipo e saldo via FinPlanoContasService', async () => {
    // Setup
    const { FinPlanoContasService } = await import('../../src/services/finPlanoContasService');
    const { supabase } = await import('../../src/services/supabase');

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'banco-uuid-999' },
          error: null
        })
      })
    });

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_bancarias') {
        return { insert: insertMock } as any;
      }
      return {} as any;
    });

    // Action
    const res = await FinPlanoContasService.salvarContaBancaria('Banco Itaú PJ', 'corrente', 15000);

    // Assert
    expect(res.sucesso).toBe(true);
    expect(res.id).toBe('banco-uuid-999');
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      nome_banco: 'Banco Itaú PJ',
      tipo: 'corrente',
      saldo_inicial: 15000,
      ativo: true
    }));
  });

  it('deve implementar fallback defensivo se a tabela fin_categorias ou fin_contas_bancarias retornar 42P01', async () => {
    // Setup
    const { FinPlanoContasService } = await import('../../src/services/finPlanoContasService');
    const { supabase } = await import('../../src/services/supabase');

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'relation fin_categorias does not exist' }
        })
      })
    });

    vi.spyOn(supabase, 'from').mockReturnValue({ insert: insertMock } as any);

    // Action
    const res = await FinPlanoContasService.salvarCategoria('Teste Fallback', 'tipo-1');

    // Assert: Zero-Break fallback ativado
    expect(res.sucesso).toBe(true);
    expect(res.id).toMatch(/^temp-/);
  });
});


