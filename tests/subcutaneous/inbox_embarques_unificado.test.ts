import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InboxService } from '../../src/services/inboxService';
import { DashboardFilterEngine } from '../../src/components/dashboard/DashboardFilterEngine';
import { ContatosEmbarqueService } from '../../src/services/contatosEmbarqueService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'consultor-aline' } } })
    }
  }
}));

describe('Motor Unificado de Embarques, Inbox e SLA Subcutâneo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve disparar alerta de SLA de Pré-Embarque no Dashboard para viagens com status pos_venda', () => {
    // Setup
    const hoje = new Date();
    const dataIdaEm3Dias = new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const viagemPosVenda = {
      id: 'via-0316',
      codigo_viagem: 'VIA-0316',
      status: 'pos_venda',
      data_ida: dataIdaEm3Dias,
      produtos: []
    };

    // Action: Executa o checkSLA com janela de 7 dias
    const resultadoSla = DashboardFilterEngine.checkSLA(viagemPosVenda, 7, 1);

    // Assert: O SLA deve acender com alerta de pré-embarque mesmo estando em pos_venda
    expect(resultadoSla.alert).toBe(true);
    expect(resultadoSla.type).toBe('pre-embarque');
    expect(resultadoSla.text).toContain('Embarque em 3 dias');
  });

  it('deve extrair embarques de produtos aéreos com qualquer nomenclatura e trechos', () => {
    // Setup
    const viagem = {
      id: 'via-0316',
      destino: 'Barcelona, Espanha',
      data_ida: '2026-10-11', // Data antiga provisória no cabeçalho
      data_volta: '2026-10-25',
      produtos: [
        {
          id: 'prod-aereo-1',
          tipo: 'AÉREO REGULAR',
          fornecedor: 'Iberia',
          codigo_reserva: 'KK7F05',
          dados_adicionais: {
            trechos: [
              {
                origem: 'GRU',
                destino: 'BCN',
                dataIda: '2026-11-14',
                dataVolta: '2026-11-28',
                loc: 'KK7F05'
              }
            ]
          }
        }
      ]
    };

    // Action: O motor de embarques consolidados processa a viagem
    const embarques = ContatosEmbarqueService.obterEmbarquesViagem(viagem, viagem.produtos);

    // Assert: Deve priorizar os trechos reais do voo em 14/11 com LOC
    expect(embarques.length).toBe(2);
    expect(embarques[0].dataStr).toBe('2026-11-14');
    expect(embarques[0].loc).toBe('KK7F05');
    expect(embarques[0].tipo).toBe('segmento-ida');
    expect(embarques[1].dataStr).toBe('2026-11-28');
  });

  it('deve gerar alertas no Inbox do consultor parceiro e titular considerando sla_pre_embarque_dias dinâmico', async () => {
    // Setup
    const hoje = new Date();
    const dataVooEm4Dias = new Date(hoje.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const mockViagens = [
      {
        id: 'via-0316',
        codigo_viagem: 'VIA-0316',
        consultor_id: 'outro-consultor',
        destino: 'Barcelona',
        status: 'pos_venda',
        cliente: { nome: 'Thais Cristine Carvalho Poggio' },
        divisoes: [
          { consultor_id: 'consultor-aline', percentual: 50 } // Aline como parceira
        ],
        produtos: [
          {
            id: 'prod-voo',
            tipo: 'AÉREO',
            fornecedor: 'Air Europa',
            codigo_reserva: '601419',
            dados_adicionais: {
              trechos: [{ origem: 'GRU', destino: 'MAD', dataIda: dataVooEm4Dias, loc: '601419' }]
            }
          }
        ]
      }
    ];

    // Mock das tabelas do Supabase
    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'global_settings') {
        return {
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { sla_pre_embarque_dias: 7, sla_pos_viagem_dias: 1 }
          })
        };
      }
      if (tabela === 'viagens') {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((resolve: any) => resolve({ data: mockViagens, error: null }))
        };
      }
      if (tabela === 'viagens_divisoes') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ viagem_id: 'via-0316' }] })
        };
      }
      // Outras tabelas do Inbox retornam listas vazias
      return {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: [], error: null }))
      };
    });

    const userAline = { id: 'consultor-aline' };
    const perfilAline = { id: 'consultor-aline', role: 'consultor' } as any;

    // Action: Carrega e constrói alertas para o Inbox da Aline
    const alertas = await InboxService.loadAndBuildAlerts(userAline, perfilAline, 3);

    // Assert: O alerta de pré-embarque de 4 dias deve figurar no Inbox da Aline
    const alertaPreEmbarque = alertas.find(a => a.type === 'pre-embarque' && a.targetId === 'via-0316');
    expect(alertaPreEmbarque).toBeDefined();
    expect(alertaPreEmbarque?.subject).toContain('Thais Cristine Carvalho Poggio');
    expect(alertaPreEmbarque?.body).toContain('601419');
    expect(alertaPreEmbarque?.eventDate).toBe(dataVooEm4Dias);
  });
});

