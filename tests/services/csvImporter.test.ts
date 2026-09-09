import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCSV, batchInsertOrcamentos } from '../../src/services/csvImporter';
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
});
