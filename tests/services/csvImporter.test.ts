import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCSV, batchInsertOrcamentos, formatBrDateToYmd, parseBrFloat } from '../../src/services/csvImporter';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('csvImporter - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve fazer parsing correto de CSV delimitado por ponto e vírgula com aspas escapadas', () => {
    // Setup
    const csvContent = 'Nome;Destino;Valor\n"João ""O Viajante"" Silva";Paris;15000\nMaria Souza;Lisboa;8000';

    // Action
    const linhas = parseCSV(csvContent);

    // Assert
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toEqual(['Nome', 'Destino', 'Valor']);
    expect(linhas[1][0]).toBe('João "O Viajante" Silva');
    expect(linhas[1][1]).toBe('Paris');
    expect(linhas[2][0]).toBe('Maria Souza');
  });

  it('deve bloquear importação em lote quando o sistema estiver operando em modo offline', async () => {
    // Setup
    const orcamentos = [{ nome_cliente: 'Teste' }];

    // Action
    const resultado = await batchInsertOrcamentos(orcamentos, 'user-1', true);

    // Assert
    expect(resultado.success).toBe(false);
    expect(resultado.count).toBe(0);
    expect(resultado.error?.message).toContain('Conexão indisponível');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('deve realizar inserção em lote de orçamentos no Supabase quando conectado', async () => {
    // Setup
    const orcamentos = [
      { nome_cliente: 'Cliente 1', destino: 'Orlando', valor_proposta: 12000 },
      { nome_cliente: 'Cliente 2', destino: 'Roma', valor_proposta: 18000 },
    ];

    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    // Action
    const resultado = await batchInsertOrcamentos(orcamentos, 'user-1', false);

    // Assert
    expect(resultado.success).toBe(true);
    expect(resultado.count).toBe(2);
    expect(supabase.from).toHaveBeenCalledWith('orcamentos');
    expect(insertMock).toHaveBeenCalledWith(orcamentos);
  });

  it('deve processar campos que contenham quebras de linha legítimas dentro de aspas duplas', () => {
    // Setup - Campo "Observações" com texto em múltiplos parágrafos
    const csvComQuebra = 'Nome;Observacao\n"Cliente 1";"Primeira linha da nota\nSegunda linha da nota"\n"Cliente 2";"Nota simples"';

    // Action
    const linhas = parseCSV(csvComQuebra);

    // Assert
    expect(linhas).toHaveLength(3);
    expect(linhas[1][1]).toBe('Primeira linha da nota\nSegunda linha da nota');
    expect(linhas[2][0]).toBe('Cliente 2');
  });

  it('deve realizar fallback resiliente limpando campos opcionais se o Supabase acusar coluna inexistente no batch insert', async () => {
    // Setup
    const erroColuna = { code: '42703', message: 'column valor_proposta does not exist' };
    const insertComErro = vi.fn().mockResolvedValueOnce({ error: erroColuna });
    const insertComSucesso = vi.fn().mockResolvedValueOnce({ data: null, error: null });

    const insertMock = vi.fn()
      .mockImplementationOnce(insertComErro)
      .mockImplementationOnce(insertComSucesso);

    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    const orcamentosComCamposNovos = [
      { nome_cliente: 'Cliente A', valor_proposta: 5000, destino: 'Santiago' },
    ];

    // Action
    const resultado = await batchInsertOrcamentos(orcamentosComCamposNovos, 'user-1', false);

    // Assert
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it('deve formatar data brasileira DD/MM/YYYY para YYYY-MM-DD com e sem hora', () => {
    // Setup & Action & Assert
    expect(formatBrDateToYmd('25/12/2026')).toBe('2026-12-25');
    expect(formatBrDateToYmd('05/01/2027 14:30:00')).toBe('2027-01-05');
    expect(formatBrDateToYmd('3/8/2026')).toBe('2026-08-03');
    expect(formatBrDateToYmd('')).toBeNull();
    expect(formatBrDateToYmd('2026-12-25')).toBeNull(); // Não é formato brasileiro
    expect(formatBrDateToYmd('99/99')).toBeNull(); // Formato incompleto
  });

  it('deve converter valores monetários brasileiros com R$, pontos e vírgulas para float', () => {
    // Setup & Action & Assert
    expect(parseBrFloat('R$ 1.234,56')).toBe(1234.56);
    expect(parseBrFloat('12.500,00')).toBe(12500);
    expect(parseBrFloat('850,50')).toBe(850.5);
    expect(parseBrFloat('500')).toBe(500);
    expect(parseBrFloat('')).toBeNull();
    expect(parseBrFloat('invalido')).toBeNull();
  });

  it('deve retornar contagem zero sem chamar banco se lista de orçamentos estiver vazia', async () => {
    // Setup & Action
    const resultado = await batchInsertOrcamentos([], 'user-1', false);

    // Assert
    expect(resultado.success).toBe(true);
    expect(resultado.count).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('deve retornar falha capturada se erro do Supabase não for código 42703', async () => {
    // Setup
    const erroGrave = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const insertMock = vi.fn().mockResolvedValue({ error: erroGrave });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    // Action
    const resultado = await batchInsertOrcamentos([{ nome: 'Duplicado' }], 'user-1', false);

    // Assert
    expect(resultado.success).toBe(false);
    expect(resultado.count).toBe(0);
    expect(resultado.error).toEqual(erroGrave);
  });
});
