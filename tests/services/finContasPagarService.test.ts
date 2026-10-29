import { describe, it, expect, vi } from 'vitest';
import { FinContasPagarService } from '../../src/services/finContasPagarService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('FinContasPagarService - Testes Subcutâneos', () => {
  it('deve antecipar o vencimento para o dia útil anterior se for IMPOSTO que cai em fim de semana ou feriado', () => {
    // Setup: 2026-10-10 é Sábado
    const dataNominal = '2026-10-10';
    
    // Action: Imposto
    const vencImposto = FinContasPagarService.calcularVencimentoOperacional(dataNominal, 'IMPOSTO', 'DAS Simples Nacional');
    
    // Assert: Deve antecipar para sexta-feira (2026-10-09)
    expect(vencImposto).toBe('2026-10-09');
  });

  it('deve postergar o vencimento para o próximo dia útil se for despesa COMUM que cai em fim de semana ou feriado', () => {
    // Setup: 2026-10-10 é Sábado
    const dataNominal = '2026-10-10';
    
    // Action: Aluguel
    const vencAluguel = FinContasPagarService.calcularVencimentoOperacional(dataNominal, 'ALUGUEL', 'Aluguel do Ponto');
    
    // Assert: Deve postergar para segunda-feira (2026-10-12 é feriado nacional N. Sra Aparecida! Logo, vai para terça 2026-10-13)
    expect(vencAluguel).toBe('2026-10-13');
  });

  it('deve manter a data nominal inalterada se já for dia útil comercial', () => {
    // Setup: 2026-10-14 é Quarta-feira
    const dataNominal = '2026-10-14';

    // Action
    const venc = FinContasPagarService.calcularVencimentoOperacional(dataNominal, 'SALÁRIO', 'Folha Salarial');

    // Assert
    expect(venc).toBe('2026-10-14');
  });

  it('deve calcular o resumo de liquidez e contadores de atraso com precisão', () => {
    // Setup
    const contasMock: any[] = [
      { id: '1', valor_nominal: 1000, status: 'pendente', data_vencimento: '2026-10-01', data_vencimento_operacional: '2026-10-01' }, // Atrasada
      { id: '2', valor_nominal: 500, status: 'pago', valor_pago: 480, data_vencimento: '2026-10-05' },
      { id: '3', valor_nominal: 2000, status: 'pendente', data_vencimento: '2026-10-29', data_vencimento_operacional: '2026-10-29' }
    ];

    // Action
    const resumo = FinContasPagarService.calcularResumoLiquidez(contasMock);

    // Assert
    expect(resumo.totalPagoMes).toBe(480);
    expect(resumo.totalAPagarMes).toBe(3000);
    expect(resumo.totalAtrasadas).toBe(1000);
    expect(resumo.qtdAtrasadas).toBe(1);
    expect(resumo.qtdPendentes).toBe(2);
  });

  it('deve consolidar o painel Previsto vs Realizado com variações monetárias e percentuais', () => {
    // Setup
    const contasMock: any[] = [
      {
        id: '1',
        tipo_custo_id: 'tipo-2',
        tipo_custo: { nome: 'Despesas Fixas' },
        categoria_id: 'cat-aluguel',
        categoria: { nome: 'ALUGUEL' },
        valor_nominal: 28000,
        valor_pago: 28000,
        status: 'pago'
      },
      {
        id: '2',
        tipo_custo_id: 'tipo-2',
        tipo_custo: { nome: 'Despesas Fixas' },
        categoria_id: 'cat-energia',
        categoria: { nome: 'ENERGIA ELÉTRICA' },
        valor_nominal: 800,
        valor_pago: 920,
        status: 'pago'
      }
    ];

    // Action
    const resultado = FinContasPagarService.calcularPrevistoVsRealizado(contasMock);

    // Assert
    const energia = resultado.find(r => r.categoriaNome === 'ENERGIA ELÉTRICA');
    expect(energia).toBeDefined();
    expect(energia?.valorPrevisto).toBe(800);
    expect(energia?.valorRealizado).toBe(920);
    expect(energia?.variacao).toBe(120); // Saiu R$ 120 a mais
    expect(energia?.percentualVariacao).toBe(15); // +15%
  });

  it('deve bloquear estorno de pagamento se o usuário não tiver papel admin (governança RBAC)', async () => {
    // Setup: consultor tentando estornar
    const resultado = await FinContasPagarService.estornarBaixa(
      'conta-1',
      'consultor',
      'user-123',
      'Estorno indevido'
    );

    // Assert
    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain('Apenas administradores');
  });

  it('deve tratar Schema Drift (código 42P01) com fallback seguro ao listar ou cadastrar contas', async () => {
    // Setup: simula tabela fin_contas_pagar inexistente com query builder completo
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation fin_contas_pagar does not exist' }
    });

    const mockChain: any = {
      order: mockOrder,
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis()
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(mockChain)
    });

    // Action
    const contas = await FinContasPagarService.listarContas({
      periodoTipo: 'mes',
      mes: 10,
      ano: 2026,
      status: 'todos'
    });

    // Assert: não deve estourar erro, deve retornar array vazio resiliente
    expect(contas).toEqual([]);
  });

  it('deve calcular a matriz do calendário mensal de vencimentos identificando dias de pico (1, 5, 10, 15, 20, 30) e fins de semana', () => {
    // Setup: Outubro 2026 (31 dias)
    const contasMock: any[] = [
      { id: '1', valor_nominal: 28434.42, status: 'pendente', data_vencimento: '2026-10-05', data_vencimento_operacional: '2026-10-05' },
      { id: '2', valor_nominal: 26000.00, status: 'pago', valor_pago: 26000.00, data_vencimento: '2026-10-10', data_vencimento_operacional: '2026-10-13' } // Vencimento operacional após feriado
    ];

    // Action
    const cal = FinContasPagarService.calcularCalendarioMensal(contasMock, 10, 2026);

    // Assert
    expect(cal.dias).toHaveLength(31);
    
    // Dia 5 é dia de pico e segunda-feira
    const dia5 = cal.dias.find(d => d.dia === 5)!;
    expect(dia5.ehDiaPico).toBe(true);
    expect(dia5.totalNominal).toBe(28434.42);
    expect(dia5.qtdTitulos).toBe(1);
    expect(dia5.qtdPendentes).toBe(1);

    // Dia 10 (Sábado) é dia de pico, mas o título operou no dia 13
    const dia10 = cal.dias.find(d => d.dia === 10)!;
    expect(dia10.ehDiaPico).toBe(true);
    expect(dia10.ehFimDeSemana).toBe(true);

    // Dia 13 recebeu a conta do dia 10
    const dia13 = cal.dias.find(d => d.dia === 13)!;
    expect(dia13.totalNominal).toBe(26000.00);
    expect(dia13.qtdPagas).toBe(1);

    // Maior desembolso aponta para o dia 5
    expect(cal.diaMaiorDesembolso).toEqual({ dia: 5, total: 28434.42 });
    expect(cal.diasComVencimento).toBe(2);
  });

  it('deve desconsiderar contas canceladas na contabilidade dos dias do calendário', () => {
    // Setup
    const contasMock: any[] = [
      { id: '1', valor_nominal: 5000, status: 'cancelado', data_vencimento: '2026-10-15', data_vencimento_operacional: '2026-10-15' }
    ];

    // Action
    const cal = FinContasPagarService.calcularCalendarioMensal(contasMock, 10, 2026);

    // Assert
    const dia15 = cal.dias.find(d => d.dia === 15)!;
    expect(dia15.totalNominal).toBe(0);
    expect(dia15.qtdTitulos).toBe(0);
    expect(cal.diasComVencimento).toBe(0);
  });
});
