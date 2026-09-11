import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnexosService } from '../../src/services/anexosService';
import { supabase } from '../../src/services/supabase';

class MockFile {
  name: string;
  size: number;
  type: string;
  constructor(parts: any[], name: string, options?: { type?: string }) {
    this.name = name;
    this.type = options?.type || 'application/octet-stream';
    this.size = parts.reduce((acc, p) => acc + (typeof p === 'string' ? p.length : 100), 0);
  }
}
if (typeof globalThis.File === 'undefined') {
  (globalThis as any).File = MockFile;
}

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    }
  }
}));

describe('AnexosService - Testes Subcutâneos com Múltiplos Anexos e Resiliência a Drift', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve realizar upload e salvar metadados do documento com categoria e identificador no banco', async () => {
    // Setup
    const mockFile = new File(['conteudo dummy pdf'], 'voucher_fasano.pdf', { type: 'application/pdf' });
    const mockDocRetornado = {
      id: 'doc-uuid-1',
      viagem_id: 'viagem-123',
      rotulo: 'Voucher Hotel Fasano',
      tipo_documento: 'VOUCHER_HOTEL',
      nome_original: 'voucher_fasano.pdf',
      storage_path: 'supabase-storage://viagem-123/123456_voucher_fasano.pdf',
      mime_type: 'application/pdf',
      tamanho_bytes: 1024
    };

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { limite_upload_mb: 50 }, error: null })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockDocRetornado,
            error: null
          })
        })
      })
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await AnexosService.uploadAnexo({
      file: mockFile,
      rotulo: 'Voucher Hotel Fasano',
      tipo_documento: 'VOUCHER_HOTEL',
      viagem_id: 'viagem-123'
    });

    // Assert
    expect(resultado.id).toBe('doc-uuid-1');
    expect(resultado.rotulo).toBe('Voucher Hotel Fasano');
    expect(resultado.tipo_documento).toBe('VOUCHER_HOTEL');
    expect(mockFrom).toHaveBeenCalledWith('documentos_anexos');
  });

  it('deve listar anexos filtrando por viagem e cliente', async () => {
    // Setup
    const mockLista = [
      {
        id: 'doc-1',
        viagem_id: 'viagem-999',
        rotulo: 'Passagem Aérea',
        tipo_documento: 'VOUCHER_AEREO',
        nome_original: 'bilhete.pdf',
        storage_path: 'supabase-storage://viagem-999/bilhete.pdf'
      },
      {
        id: 'doc-2',
        cliente_id: 'cliente-555',
        rotulo: 'Passaporte Maria',
        tipo_documento: 'PASSAPORTE',
        nome_original: 'passaporte.pdf',
        storage_path: 'supabase-storage://cliente-555/passaporte.pdf'
      }
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({
            data: mockLista,
            error: null
          })
        })
      })
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await AnexosService.listarAnexos('viagem-999', 'cliente-555');

    // Assert
    expect(resultado.length).toBe(2);
    expect(resultado[0].rotulo).toBe('Passagem Aérea');
    expect(resultado[1].rotulo).toBe('Passaporte Maria');
  });

  it('deve ativar fallback resiliente sem travar ao receber erro 42P01 (tabela inexistente) ou 42703', async () => {
    // Setup
    const mockFile = new File(['passaporte data'], 'passaporte.jpg', { type: 'image/jpeg' });
    const fallbackDb = new Map<string, any>();

    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      if (tabela === 'documentos_anexos') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  code: '42P01',
                  message: 'relation "documentos_anexos" does not exist'
                }
              })
            })
          })
        };
      }
      if (tabela === 'global_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockImplementation(async () => {
                return {
                  data: fallbackDb.get('anexos_storage_cache_drift') || null,
                  error: null
                };
              })
            })
          }),
          upsert: vi.fn().mockImplementation(async (payload: any) => {
            fallbackDb.set(payload.key, payload);
            return { error: null };
          })
        };
      }
      return {};
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await AnexosService.uploadAnexo({
      file: mockFile,
      rotulo: 'Passaporte Titular',
      tipo_documento: 'PASSAPORTE',
      viagem_id: 'viagem-drift'
    });

    // Assert
    expect(resultado).toBeDefined();
    expect(resultado.rotulo).toBe('Passaporte Titular');
    expect(resultado.tipo_documento).toBe('PASSAPORTE');
    expect(mockFrom).toHaveBeenCalledWith('global_settings');
  });

  it('deve excluir anexo com sucesso e solicitar remoção do Supabase Storage', async () => {
    // Setup
    const mockFrom = vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });
    (supabase.from as any) = mockFrom;

    // Action
    const sucesso = await AnexosService.excluirAnexo('doc-10', 'supabase-storage://viagem-10/file.pdf');

    // Assert
    expect(sucesso).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('documentos_anexos');
    expect(supabase.storage.from).toHaveBeenCalledWith('documentos-clientes');
  });
});
