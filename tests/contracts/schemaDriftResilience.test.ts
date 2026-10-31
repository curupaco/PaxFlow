import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';
import { FinRemessasService } from '../../src/services/finRemessasService';
import { FinPlanoContasService } from '../../src/services/finPlanoContasService';
import { FinContasPagarService } from '../../src/services/finContasPagarService';
import { ViagensDivisoesService } from '../../src/services/viagensDivisoesService';
import { ReembolsosService } from '../../src/services/reembolsosService';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Resiliência Sistêmica a Schema Drift e Falhas de Banco (Padrão Zero-Break)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Código de Erro PostgreSQL 42703: Coluna Inexistente (Schema Drift)', () => {
    it('deve listar contas bancárias ativas com fallback seguro caso a coluna "ativo" ainda não tenha sido criada', async () => {
      // Setup
      const erroColunaInexistente = {
        code: '42703',
        message: 'column "ativo" of relation "fin_contas_bancarias" does not exist'
      };

      (supabase.from as any).mockImplementation((tabela: string) => {
        if (tabela === 'fin_contas_bancarias') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: erroColunaInexistente })
              })
            })
          };
        }
        return {};
      });

      // Action
      const contas = await FinPlanoContasService.listarContasBancarias(true);

      // Assert
      expect(contas).toBeDefined();
      expect(Array.isArray(contas)).toBe(true);
      expect(contas.length).toBeGreaterThan(0);
      expect(contas.some(c => c.nome_banco?.toLowerCase().includes('itau') || c.nome_banco?.toLowerCase().includes('itaú'))).toBe(true);
    });

    it('deve salvar nova solicitação de reembolso com fallback em observacoes_financeiras quando campos não existirem', async () => {
      // Setup
      const erroColuna = {
        code: '42703',
        message: 'column "status_tratativa" of relation "reembolsos" does not exist'
      };

      const mockInsert = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: erroColuna })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'rmb-fallback-ok', observacoes_financeiras: '{"forma_devolucao":"Pix"}' },
              error: null
            })
          })
        });

      (supabase.from as any).mockImplementation((tabela: string) => {
        if (tabela === 'reembolsos') {
          return { insert: mockInsert };
        }
        if (tabela === 'produtos_viagem') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          };
        }
        return {};
      });

      // Action
      const res = await ReembolsosService.criarSolicitacao({
        viagemId: 'via-test-drift',
        produtoViagemId: 'prod-test-drift',
        consultorSolicitanteId: 'consultor-test',
        valorSolicitado: 3500.00,
        motivoCancelamento: 'Desistência do cliente',
        formaDevolucao: 'Pix'
      });

      // Assert
      expect(res.sucesso).toBe(true);
      expect(res.data?.id).toBe('rmb-fallback-ok');
    });

    it('deve salvar divisão de viagem com fallback para inserção simplificada quando "percentual_rav" não existir', async () => {
      // Setup
      const erroColunaRav = {
        code: '42703',
        message: 'column "percentual_rav" does not exist'
      };

      let fallbackExecutado = false;

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const insertMock = vi.fn()
        .mockResolvedValueOnce({ error: erroColunaRav })
        .mockImplementationOnce(() => {
          fallbackExecutado = true;
          return Promise.resolve({ error: null });
        });

      (supabase.from as any).mockImplementation((tabela: string) => {
        if (tabela === 'viagens_divisoes') {
          return { delete: deleteMock, insert: insertMock };
        }
        if (tabela === 'viagens') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        return {};
      });

      // Action
      const res = await ViagensDivisoesService.salvarDivisaoViagem({
        viagemId: 'via-drift-42703',
        titularId: 'consultor-titular',
        divisoes: [
          { consultor_id: 'consultor-titular', percentual: 100, percentual_rav: 100, is_titular: true }
        ]
      });

      // Assert
      expect(res.success).toBe(true);
      expect(fallbackExecutado).toBe(true);
    });
  });

  describe('Código de Erro PostgreSQL 42P01: Relação / Tabela Inexistente', () => {
    it('deve listar remessas com fallback seguro retornando lista vazia quando a tabela fin_remessas não existir', async () => {
      // Setup
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'relation "fin_remessas" does not exist' }
          })
        })
      });

      // Action
      const remessas = await FinRemessasService.listarRemessas();

      // Assert
      expect(remessas).toEqual([]);
    });

    it('deve retornar lista vazia de forma graciosa ao listar contas a pagar quando a tabela fin_contas_pagar não existir', async () => {
      // Setup
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '42P01', message: 'relation "fin_contas_pagar" does not exist' }
              })
            })
          })
        })
      });

      // Action
      const contas = await FinContasPagarService.listarContas({
        periodoTipo: 'mes',
        ano: 2026,
        mes: 10,
        status: 'todos'
      });

      // Assert
      expect(contas).toEqual([]);
    });

    it('deve retornar divisão padrão com 100% para o titular quando a tabela viagens_divisoes não existir', async () => {
      // Setup
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '42P01', message: 'relation "viagens_divisoes" does not exist' }
              })
            })
          })
        })
      });

      // Action
      const divisoes = await ViagensDivisoesService.obterDivisoesPorViagem('viagem-123', 'titular-fallback-id');

      // Assert
      expect(divisoes).toHaveLength(1);
      expect(divisoes[0].consultor_id).toBe('titular-fallback-id');
      expect(divisoes[0].percentual).toBe(100);
      expect(divisoes[0].percentual_rav).toBe(100);
      expect(divisoes[0].is_titular).toBe(true);
    });
  });

  describe('Código de Erro PostgREST 400: Bad Request / Consulta Malformada', () => {
    it('deve tratar erro 400 do PostgREST em obterContasCriticasAlerta sem propagar exceção não capturada', async () => {
      // Setup
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST100', message: 'Bad Request - invalid query parameter' }
              })
            })
          })
        })
      });

      // Action
      const contas = await FinContasPagarService.obterContasCriticasAlerta(2);

      // Assert
      expect(contas).toEqual([]);
    });
  });

  describe('Código de Erro PostgreSQL 23503: Violação de Chave Estrangeira (Foreign Key Constraint)', () => {
    it('deve capturar falha de chave estrangeira ao registrar auditoria e não travar a operação principal do usuário', async () => {
      // Setup
      const erroForeignKey = {
        code: '23503',
        message: 'insert or update on table "fin_auditoria" violates foreign key constraint "fin_auditoria_usuario_id_fkey"'
      };

      (supabase.from as any).mockImplementation((tabela: string) => {
        if (tabela === 'fin_auditoria') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: erroForeignKey })
          };
        }
        return {};
      });

      // Action & Assert: A chamada não deve disparar unhandled rejection que trave o fluxo
      await expect(
        FinContasPagarService.registrarAuditoria({
          contaId: 'conta-valida-123',
          usuarioId: 'usuario-inexistente-ou-excluido',
          usuarioNome: 'Ex-Funcionário',
          acao: 'edicao',
          detalhes: { campo: 'valor_nominal' }
        })
      ).resolves.not.toThrow();
    });
  });
});
