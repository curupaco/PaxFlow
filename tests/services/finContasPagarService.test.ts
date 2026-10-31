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
    const dataFutura = new Date();
    dataFutura.setDate(dataFutura.getDate() + 3);
    const dataFuturaStr = dataFutura.toISOString().slice(0, 10);

    const contasMock: any[] = [
      { id: '1', valor_nominal: 1000, status: 'pendente', data_vencimento: '2020-01-01', data_vencimento_operacional: '2020-01-01' }, // Atrasada
      { id: '2', valor_nominal: 500, status: 'pago', valor_pago: 480, data_vencimento: '2020-01-05' },
      { id: '3', valor_nominal: 2000, status: 'pendente', data_vencimento: dataFuturaStr, data_vencimento_operacional: dataFuturaStr }
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

  it('deve obter contas críticas de alerta e classificar nível de urgência do badge', async () => {
    // Setup
    const hoje = new Date();
    const hojeIso = hoje.toISOString().split('T')[0];
    const ontemDate = new Date(hoje);
    ontemDate.setDate(ontemDate.getDate() - 1);
    const ontemIso = ontemDate.toISOString().split('T')[0];

    const mockSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        lte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'conta-atrasada-1',
                descricao: 'Conta de Luz Atrasada',
                valor_nominal: 350,
                status: 'pendente',
                data_vencimento: ontemIso,
                data_vencimento_operacional: ontemIso
              },
              {
                id: 'conta-hoje-2',
                descricao: 'Internet Vence Hoje',
                valor_nominal: 180,
                status: 'pendente',
                data_vencimento: hojeIso,
                data_vencimento_operacional: hojeIso
              }
            ],
            error: null
          })
        })
      })
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any);

    // Action
    const contasCriticas = await FinContasPagarService.obterContasCriticasAlerta(2);
    const resumo = await FinContasPagarService.obterResumoBadge();

    // Assert
    expect(contasCriticas.length).toBe(2);
    expect(contasCriticas[0].status).toBe('atrasado');
    expect(resumo.totalAtrasadas).toBe(1);
    expect(resumo.totalVencendoHoje).toBe(1);
    expect(resumo.totalCriticas).toBe(2);
    expect(resumo.nivelAlerta).toBe('urgente');

    // Verifica que a query não solicita a coluna inexistente "codigo" em fin_categorias
    const queryEnviada = mockSelect.mock.calls[0]?.[0] || '';
    expect(queryEnviada).not.toContain('categoria:fin_categorias(id, nome, codigo)');
    expect(queryEnviada).toContain('categoria:fin_categorias(id, nome)');
  });

  it('deve executar fallback resiliente e retornar vazio de forma segura ao capturar erro 400, 42P01 ou 42703', async () => {
    // Setup: simula erro de relação (ex: 400 Bad Request) e fallback também vazio
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST100', message: 'Could not find column' }
    });
    const mockSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        lte: vi.fn().mockReturnValue({
          order: mockOrder
        })
      })
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any);

    // Action
    const contas = await FinContasPagarService.obterContasCriticasAlerta(2);
    const resumo = await FinContasPagarService.obterResumoBadge();

    // Assert
    expect(contas).toEqual([]);
    expect(resumo.totalCriticas).toBe(0);
    expect(resumo.nivelAlerta).toBe('normal');
  });

  it('deve editar exclusivamente o título selecionado quando modoCascata for apenas_esta', async () => {
    // Setup
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    const insertAuditSpy = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'fin_auditoria') {
        return { insert: insertAuditSpy } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'conta-aluguel-out',
                contrato_recorrente_id: 'contrato-aluguel-123',
                recorrente: true,
                favorecido: 'Imobiliária Central',
                descricao: 'Aluguel Outubro',
                valor_nominal: 28000,
                data_vencimento: '2026-10-10',
                status: 'pendente'
              },
              error: null
            })
          })
        }),
        update: updateSpy
      } as any;
    });

    // Action
    const res = await FinContasPagarService.editarConta({
      contaId: 'conta-aluguel-out',
      modoCascata: 'apenas_esta',
      valorNominal: 29500,
      descricao: 'Aluguel Outubro com taxa extra'
    });

    // Assert
    expect(res.sucesso).toBe(true);
    expect(res.afetadas).toBe(1);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      valor_nominal: 29500,
      descricao: 'Aluguel Outubro com taxa extra'
    }));
  });

  it('deve propagar alterações em cascata para parcelas futuras pendentes preservando sufixo de parcelas', async () => {
    // Setup
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    const insertAuditSpy = vi.fn().mockResolvedValue({ error: null });

    const parcelasFuturas = [
      {
        id: 'parcela-3',
        contrato_recorrente_id: 'contrato-seguro-999',
        data_vencimento: '2026-10-15',
        descricao: 'Seguro Empresarial (3/10)',
        valor_nominal: 1200,
        status: 'pendente'
      },
      {
        id: 'parcela-4',
        contrato_recorrente_id: 'contrato-seguro-999',
        data_vencimento: '2026-11-15',
        descricao: 'Seguro Empresarial (4/10)',
        valor_nominal: 1200,
        status: 'pendente'
      }
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'fin_auditoria') {
        return { insert: insertAuditSpy } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: parcelasFuturas[0],
              error: null
            }),
            gte: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: parcelasFuturas,
                error: null
              })
            })
          })
        }),
        update: updateSpy
      } as any;
    });

    // Action
    const res = await FinContasPagarService.editarConta({
      contaId: 'parcela-3',
      modoCascata: 'esta_e_futuras',
      valorNominal: 1350,
      descricao: 'Seguro Reajustado (3/10)',
      dataVencimento: '2026-10-20' // Mudou dia 15 para 20
    });

    // Assert
    expect(res.sucesso).toBe(true);
    expect(res.afetadas).toBe(2);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      valor_nominal: 1350,
      data_vencimento: '2026-10-20',
      descricao: 'Seguro Reajustado (3/10)'
    }));
    expect(updateSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
      valor_nominal: 1350,
      data_vencimento: '2026-11-20', // Propagou dia 20 para novembro
      descricao: 'Seguro Reajustado (4/10)' // Preservou (4/10)
    }));
  });

  it('deve retornar sucesso com fallback Zero-Break ao capturar erro 42P01 em editarConta', async () => {
    // Setup
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'relation does not exist' }
          })
        })
      })
    } as any);

    // Action
    const res = await FinContasPagarService.editarConta({
      contaId: 'qualquer-id',
      valorNominal: 100
    });

    // Assert
    expect(res.sucesso).toBe(true);
    expect(res.afetadas).toBe(1);
  });

  it('deve buscar todas as contas atrasadas históricas ignorando travas de mês quando status for atrasado', async () => {
    // Setup
    const gteMock = vi.fn();
    const lteMock = vi.fn();
    const inMock = vi.fn();

    const contasMock = [
      {
        id: 'conta-passada-1',
        favorecido: 'Fornecedor Antigo Jan',
        data_vencimento: '2026-01-15',
        valor_nominal: 1500,
        status: 'pendente'
      },
      {
        id: 'conta-passada-2',
        favorecido: 'Fornecedor Antigo Fev',
        data_vencimento: '2026-02-10',
        valor_nominal: 2000,
        status: 'atrasado'
      }
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: gteMock,
        lte: lteMock,
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: contasMock,
            error: null
          })
        })
      })
    } as any);

    // Action
    const resultado = await FinContasPagarService.listarContas({
      periodoTipo: 'mes',
      mes: 10,
      ano: 2026,
      status: 'atrasado'
    });

    // Assert
    // Não deve chamar gte ou lte de período
    expect(gteMock).not.toHaveBeenCalled();
    expect(lteMock).not.toHaveBeenCalled();
    // Deve retornar ambas as contas com status atrasado
    expect(resultado.length).toBe(2);
    expect(resultado.every(c => c.status === 'atrasado')).toBe(true);
  });

  it('deve obter métricas globais de atraso consolidando passivo total da agência', async () => {
    // Setup
    const contasAtrasadasBanco = [
      {
        id: 'c-1',
        valor_nominal: 3500,
        data_vencimento: '2026-05-10',
        status: 'atrasado',
        descricao: 'Fatura Maio'
      },
      {
        id: 'c-2',
        valor_nominal: 2500,
        data_vencimento: '2026-08-20',
        status: 'pendente',
        descricao: 'Aluguel Agosto'
      }
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: contasAtrasadasBanco,
          error: null
        })
      })
    } as any);

    // Action
    const metricas = await FinContasPagarService.obterMetricasAtrasoGlobais();

    // Assert
    expect(metricas.qtdAtrasadas).toBe(2);
    expect(metricas.totalAtrasadas).toBe(6000);
  });

  it('deve permitir converter título avulso em recorrente na edição gerando as parcelas futuras até o fim do ano', async () => {
    // // Setup
    const contaOriginal = {
      id: 'conta-avulsa-1',
      favorecido: 'Leady',
      descricao: 'Assinatura',
      valor_nominal: 180,
      data_vencimento: '2026-10-30',
      tipo_custo_id: 'tipo-fixo',
      categoria_id: 'cat-sistema',
      recorrente: false,
      parcela_total: 1
    };

    let updateChamado = false;
    let insertsFuturosRecebidos: any[] = [];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'fin_contas_pagar') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: contaOriginal, error: null })
            })
          }),
          update: vi.fn().mockImplementation(() => {
            updateChamado = true;
            return {
              eq: vi.fn().mockResolvedValue({ error: null })
            };
          }),
          insert: vi.fn().mockImplementation((payload) => {
            insertsFuturosRecebidos = payload;
            return Promise.resolve({ data: payload, error: null });
          })
        } as any;
      }
      if (table === 'fin_auditoria') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        } as any;
      }
      return {} as any;
    });

    // // Action
    const res = await FinContasPagarService.editarConta({
      contaId: 'conta-avulsa-1',
      novoTipoLancamento: 'recorrente',
      dataVencimento: '2026-10-30',
      valorNominal: 180,
      favorecido: 'Leady'
    });

    // // Assert
    expect(res.sucesso).toBe(true);
    expect(updateChamado).toBe(true);
    // Vencimento base em Outubro (10): projeta Novembro (11) e Dezembro (12) -> 2 parcelas futuras
    expect(insertsFuturosRecebidos.length).toBe(2);
    expect(insertsFuturosRecebidos[0].data_vencimento).toBe('2026-11-30');
    expect(insertsFuturosRecebidos[1].data_vencimento).toBe('2026-12-30');
    expect(res.afetadas).toBe(3); // 1 atualizada + 2 criadas
  });
});


