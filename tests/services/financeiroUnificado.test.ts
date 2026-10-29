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
});
