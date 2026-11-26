import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FinContasPagarService } from '../../src/services/finContasPagarService';
import { FinRemessasService } from '../../src/services/finRemessasService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Build Integrity & Governança Bancária Contas a Pagar', () => {
  it('deve garantir que dist/index.html aponta exclusivamente para assets físicos existentes e sem _redirects conflitante', () => {
    // Setup
    const rootDir = path.resolve(__dirname, '../..');
    const distDir = path.join(rootDir, 'dist');
    const distIndexPath = path.join(distDir, 'index.html');
    const publicRedirects = path.join(rootDir, 'public/_redirects');
    const distRedirects = path.join(distDir, '_redirects');

    // Action & Assert
    expect(fs.existsSync(publicRedirects)).toBe(false);
    expect(fs.existsSync(distRedirects)).toBe(false);
    expect(fs.existsSync(distIndexPath)).toBe(true);

    const html = fs.readFileSync(distIndexPath, 'utf-8');
    const matches = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]);
    expect(matches.length).toBeGreaterThanOrEqual(2);

    for (const assetRelPath of matches) {
      const fullAssetPath = path.join(distDir, assetRelPath.replace(/^\//, ''));
      expect(fs.existsSync(fullAssetPath)).toBe(true);
      const stat = fs.statSync(fullAssetPath);
      expect(stat.size).toBeGreaterThan(0);

      if (assetRelPath.endsWith('.css')) {
        const cssContent = fs.readFileSync(fullAssetPath, 'utf-8');
        expect(cssContent.trim().startsWith('<!DOCTYPE')).toBe(false);
        expect(cssContent.trim().startsWith('<html')).toBe(false);
      }
    }
  });

  it('deve exigir conta bancária na baixa avulsa e aceitar quando informada', async () => {
    // Setup
    const contaPendente = {
      id: 'conta-validacao-1',
      valor_nominal: 850.00,
      conta_bancaria_id: null,
      status: 'pendente'
    };

    let payloadAtualizado: any = null;

    vi.mocked(supabase.from).mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_pagar') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: contaPendente, error: null })
            })
          }),
          update: vi.fn().mockImplementation((payload) => {
            payloadAtualizado = payload;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          })
        } as any;
      }
      if (tabela === 'fin_auditoria') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      }
      return {} as any;
    });

    // Action 1: Tentativa sem banco
    const resSemBanco = await FinContasPagarService.baixarConta({
      contaId: 'conta-validacao-1',
      dataPagamento: '2026-11-25',
      valorPagoTotal: 850.00,
      usuarioId: 'admin-1'
    });

    // Assert 1
    expect(resSemBanco.sucesso).toBe(false);
    expect(resSemBanco.erro).toContain('Selecione a conta bancária');

    // Action 2: Baixa com banco informado
    const resComBanco = await FinContasPagarService.baixarConta({
      contaId: 'conta-validacao-1',
      dataPagamento: '2026-11-25',
      contaBancariaId: 'banco-itau-matriz',
      formaPagamento: 'pix',
      valorPagoTotal: 850.00,
      usuarioId: 'admin-1'
    });

    // Assert 2
    expect(resComBanco.sucesso).toBe(true);
    expect(payloadAtualizado.conta_bancaria_id).toBe('banco-itau-matriz');
    expect(payloadAtualizado.status).toBe('pago');
  });

  it('deve garantir que pagamento em lote exige banco e grava o banco escolhido no lote e itens', async () => {
    // Setup
    let remessaUpdate: any = null;
    const itensUpdates: any[] = [];

    vi.mocked(supabase.from).mockImplementation((tabela: string) => {
      if (tabela === 'fin_remessas') {
        return {
          update: vi.fn().mockImplementation((p) => {
            remessaUpdate = p;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          })
        } as any;
      }
      if (tabela === 'fin_contas_pagar') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'c1', valor_nominal: 300 }], error: null })
          }),
          update: vi.fn().mockImplementation((p) => {
            itensUpdates.push(p);
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          })
        } as any;
      }
      if (tabela === 'fin_auditoria') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      }
      return {} as any;
    });

    // Action 1: sem banco
    const resSemBanco = await FinRemessasService.baixarRemessaConsolidada({
      remessaId: 'rem-1',
      dataPagamento: '2026-11-25',
      contaBancariaId: '',
      formaPagamento: 'pix',
      usuarioId: 'admin-1'
    });

    // Assert 1
    expect(resSemBanco.sucesso).toBe(false);

    // Action 2: com banco
    const resComBanco = await FinRemessasService.baixarRemessaConsolidada({
      remessaId: 'rem-1',
      dataPagamento: '2026-11-25',
      contaBancariaId: 'banco-bradesco-1',
      formaPagamento: 'transferencia',
      usuarioId: 'admin-1'
    });

    // Assert 2
    expect(resComBanco.sucesso).toBe(true);
    expect(remessaUpdate.conta_bancaria_id).toBe('banco-bradesco-1');
    expect(itensUpdates[0].conta_bancaria_id).toBe('banco-bradesco-1');
  });

  it('deve regularizar todos os pagamentos e lotes sem banco atribuindo-os à conta SANTANDER', async () => {
    // Setup
    let remessaUpdatePayload: any = null;
    let contaUpdatePayload: any = null;

    vi.mocked(supabase.from).mockImplementation((tabela: string) => {
      if (tabela === 'fin_contas_bancarias') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockResolvedValue({
              data: [{ id: 'banco-santander-uuid', nome_banco: 'SANTANDER', ativo: true }],
              error: null
            })
          })
        } as any;
      }
      if (tabela === 'fin_remessas') {
        return {
          update: vi.fn().mockImplementation((payload) => {
            remessaUpdatePayload = payload;
            return { is: vi.fn().mockResolvedValue({ error: null }) };
          })
        } as any;
      }
      if (tabela === 'fin_contas_pagar') {
        return {
          update: vi.fn().mockImplementation((payload) => {
            contaUpdatePayload = payload;
            return {
              is: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue({ error: null })
              })
            };
          })
        } as any;
      }
      return {} as any;
    });

    // Action
    const res = await FinContasPagarService.regularizarPagamentosSemBancoParaSantander();

    // Assert
    expect(res.sucesso).toBe(true);
    expect(res.santanderId).toBe('banco-santander-uuid');
    expect(remessaUpdatePayload.conta_bancaria_id).toBe('banco-santander-uuid');
    expect(contaUpdatePayload.conta_bancaria_id).toBe('banco-santander-uuid');
  });
});
