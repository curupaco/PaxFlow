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
    this.size = parts.reduce((acc, p) => acc + (typeof p === 'string' ? p.length : (p?.byteLength ?? p?.length ?? 100)), 0);
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
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    }
  }
}));

describe('AnexosService - Testes Subcutâneos com Múltiplos Anexos e Resiliência a Drift', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.storage.from as any).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null })
    });
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

    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      if (tabela === 'documentos_anexos') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({
                data: mockLista,
                error: null
              })
            })
          })
        };
      }
      if (tabela === 'clientes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        };
      }
      return {};
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await AnexosService.listarAnexos('viagem-999', 'cliente-555');

    // Assert
    expect(resultado.length).toBe(2);
    expect(resultado[0].rotulo).toBe('Passagem Aérea');
    expect(resultado[1].rotulo).toBe('Passaporte Maria');
  });

  it('deve ativar fallback resiliente persistindo em viagens.observacoes ao receber erro 42P01', async () => {
    // Setup
    const mockFile = new File(['passaporte data'], 'passaporte.jpg', { type: 'image/jpeg' });
    let obsGravada = '';

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
      if (tabela === 'viagens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { observacoes: obsGravada },
                error: null
              })
            })
          }),
          update: vi.fn().mockImplementation((payload: any) => ({
            eq: vi.fn().mockImplementation(async () => {
              obsGravada = payload.observacoes;
              return { error: null };
            })
          }))
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
    expect(mockFrom).toHaveBeenCalledWith('viagens');
    expect(obsGravada).toContain('PAXFLOW_ANEXOS');
  });

  it('deve listar arquivos existentes no Supabase Storage mesmo com tabela do banco ausente', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'viagens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { observacoes: '' }, error: null })
            })
          })
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42P01', message: 'relation does not exist' }
            })
          })
        })
      };
    });
    (supabase.from as any) = mockFrom;

    (supabase.storage.from as any) = vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue({
        data: [
          {
            name: '1741123456_voucher_hotel_fasano.pdf',
            id: 'file-storage-1',
            metadata: { size: 54321, mimetype: 'application/pdf' },
            created_at: '2026-09-11T20:00:00Z'
          }
        ],
        error: null
      })
    });

    // Action
    const resultado = await AnexosService.listarAnexos('viagem-fernanda');

    // Assert
    expect(resultado.length).toBeGreaterThan(0);
    expect(resultado[0].nome_original).toContain('voucher_hotel_fasano.pdf');
    expect(resultado[0].tipo_documento).toBe('VOUCHER_HOTEL');
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

  it('deve excluir documento de passaporte legado do cliente sem erro de UUID na tabela documentos_anexos', async () => {
    // Setup
    const clienteId = 'ca760007-d4ce-4c31-b371-6aaa9d916b66';
    const anexoIdLegado = `legado-cliente-${clienteId}`;
    const storagePath = `supabase-storage://${clienteId}/passaporte.pdf`;

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      if (tabela === 'clientes') {
        return { update: updateMock };
      }
      return { delete: deleteMock };
    });
    (supabase.from as any) = mockFrom;

    // Action
    const sucesso = await AnexosService.excluirAnexo(anexoIdLegado, storagePath);

    // Assert
    expect(sucesso).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('clientes');
    expect(mockFrom).not.toHaveBeenCalledWith('documentos_anexos');
    expect(updateMock).toHaveBeenCalledWith({
      google_drive_folder_url: null,
      passaporte_numero: null,
      passaporte_validade: null
    });
    expect(supabase.storage.from).toHaveBeenCalledWith('documentos-clientes');
  });

  it('deve realizar upload de CNH com número e validade opcionais e sincronizar documento do cliente', async () => {
    // Setup
    const mockFile = new File(['conteudo cnh'], 'cnh_motorista.pdf', { type: 'application/pdf' });
    const mockDocRetornado = {
      id: 'doc-cnh-1',
      cliente_id: 'cliente-cnh-123',
      rotulo: 'CNH do Passageiro',
      tipo_documento: 'CNH',
      numero_documento: '12345678900',
      data_validade: '2030-05-15',
      nome_original: 'cnh_motorista.pdf',
      storage_path: 'supabase-storage://cliente-cnh-123/123_cnh_motorista.pdf',
      mime_type: 'application/pdf',
      tamanho_bytes: 2048
    };

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'clientes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { documento: '' }, error: null })
            })
          }),
          update: mockUpdate
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { limite_upload_mb: 25 }, error: null })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockDocRetornado, error: null })
          })
        })
      };
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await AnexosService.uploadAnexo({
      file: mockFile,
      rotulo: 'CNH do Passageiro',
      tipo_documento: 'CNH',
      numero_documento: '12345678900',
      data_validade: '2030-05-15',
      cliente_id: 'cliente-cnh-123'
    });

    // Assert
    expect(resultado.tipo_documento).toBe('CNH');
    expect(resultado.numero_documento).toBe('12345678900');
    expect(resultado.data_validade).toBe('2030-05-15');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ documento: '12345678900' }));
  });

  it('deve lidar com erro de schema drift 42703 (coluna inexistente) fazendo fallback sem quebrar', async () => {
    // Setup
    const mockFile = new File(['dummy'], 'rg_passageiro.pdf', { type: 'application/pdf' });
    const mockDocRetornadoBase = {
      id: 'doc-rg-base',
      rotulo: 'RG Titular',
      tipo_documento: 'RG',
      nome_original: 'rg_passageiro.pdf',
      storage_path: 'supabase-storage://geral/rg.pdf'
    };

    let tentativa = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'global_settings') {
        return {
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        };
      }
      return {
        insert: vi.fn().mockImplementation((payload: any) => {
          tentativa++;
          if (tentativa === 1) {
            // Simula erro 42703 (coluna numero_documento não existe no banco)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: '42703', message: 'column numero_documento does not exist' }
                })
              })
            };
          }
          // Segunda tentativa: insere com sucesso sem as novas colunas
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockDocRetornadoBase,
                error: null
              })
            })
          };
        })
      };
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await AnexosService.uploadAnexo({
      file: mockFile,
      rotulo: 'RG Titular',
      tipo_documento: 'RG',
      numero_documento: 'MG-12.345.678'
    });

    // Assert
    expect(resultado.id).toBe('doc-rg-base');
    expect(resultado.tipo_documento).toBe('RG');
    expect(tentativa).toBe(2);
  });

  it('deve inferir tipos e rótulos inteligentes baseados no nome do arquivo', () => {
    // Setup & Action
    const resPassaporte = AnexosService.inferirTipoPorNome('passaporte_joao_silva.pdf');
    const resCnh = AnexosService.inferirTipoPorNome('minha_cnh_digital.jpg');
    const resRg = AnexosService.inferirTipoPorNome('rg_frente_verso.pdf');
    const resIngresso = AnexosService.inferirTipoPorNome('ingresso_disney_magic_kingdom.pdf');
    const resTransfer = AnexosService.inferirTipoPorNome('transfer_in_out_resort.pdf');

    // Assert
    expect(resPassaporte.tipo).toBe('PASSAPORTE');
    expect(resCnh.tipo).toBe('CNH');
    expect(resRg.tipo).toBe('RG');
    expect(resIngresso.tipo).toBe('INGRESSO');
    expect(resTransfer.tipo).toBe('VOUCHER_TRANSPORTE');
  });

  it('deve controlar permissão de exclusão permitindo ao autor ou admin e bloqueando outros consultores', () => {
    // Setup
    const anexoCriadoPorUser1: any = { id: 'a1', created_by: 'user-1' };
    const anexoLegadoSemAutor: any = { id: 'a2' };

    // Action & Assert
    // Admin pode sempre
    expect(AnexosService.podeExcluirAnexo(anexoCriadoPorUser1, 'user-999', 'admin')).toBe(true);
    // Autor pode
    expect(AnexosService.podeExcluirAnexo(anexoCriadoPorUser1, 'user-1', 'consultor')).toBe(true);
    // Outro consultor NÃO pode
    expect(AnexosService.podeExcluirAnexo(anexoCriadoPorUser1, 'user-2', 'consultor')).toBe(false);
    // Anexo legado sem autor pode
    expect(AnexosService.podeExcluirAnexo(anexoLegadoSemAutor, 'user-2', 'consultor')).toBe(true);
  });

  it('deve montar mensagem formatada para WhatsApp com variáveis dinâmicas e URL codificada', () => {
    // Setup
    const anexo: any = {
      id: 'doc-hotel-1',
      rotulo: 'Voucher Grand Palladium Imbassaí',
      tipo_documento: 'VOUCHER_HOTEL',
      numero_documento: 'RES-998822',
      data_validade: '2026-12-31'
    };

    // Action
    const msgEncoded = AnexosService.montarMensagemWhatsApp(anexo, 'Carlos Alberto', 'Bahia');
    const msgDecoded = decodeURIComponent(msgEncoded);

    // Assert
    expect(msgDecoded).toContain('Olá, *Carlos Alberto*!');
    expect(msgDecoded).toContain('referente à sua viagem para *Bahia*');
    expect(msgDecoded).toContain('seu Voucher de Hospedagem');
    expect(msgDecoded).toContain('Voucher Grand Palladium Imbassaí');
    expect(msgDecoded).toContain('Número/Localizador: *RES-998822*');
    expect(msgDecoded).toContain('Validade:');
    expect(msgDecoded).toContain('Qualquer dúvida, nossa equipe está à disposição! ✈️');
  });

  it('deve inferir corretamente categorias adicionais como CONTRATO, ROTEIRO, SEGURO, HOTEL e AÉREO', () => {
    // Setup & Action
    const resContrato = AnexosService.inferirTipoPorNome('contrato_viagem_assinado.pdf');
    const resRoteiro = AnexosService.inferirTipoPorNome('roteiro_dia_a_dia_paris.pdf');
    const resSeguro = AnexosService.inferirTipoPorNome('apolice_seguro_assistencia.pdf');
    const resHotel = AnexosService.inferirTipoPorNome('voucher_reserva_hotel_copacabana.pdf');
    const resAereo = AnexosService.inferirTipoPorNome('bilhete_passagem_aerea_azul.pdf');

    // Assert
    expect(resContrato.tipo).toBe('CONTRATO');
    expect(resRoteiro.tipo).toBe('ROTEIRO');
    expect(resSeguro.tipo).toBe('SEGURO');
    expect(resHotel.tipo).toBe('VOUCHER_HOTEL');
    expect(resAereo.tipo).toBe('VOUCHER_AEREO');
  });

  it('deve persistir cliente_id no upload quando vinculado a passageiro de viagem em grupo', async () => {
    // Setup
    const mockFile = new File(['conteudo voucher'], 'voucher_ingresso.pdf', { type: 'application/pdf' });
    let payloadInserido: any = null;

    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      return {
        insert: vi.fn().mockImplementation((payload: any) => {
          payloadInserido = payload;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'doc-ingresso-1', ...payload },
                error: null
              })
            })
          };
        })
      };
    });
    (supabase.from as any) = mockFrom;

    // Action
    const resultado = await AnexosService.uploadAnexo({
      file: mockFile,
      viagem_id: 'viagem-grupo-10',
      cliente_id: 'cliente-pedro-123',
      rotulo: 'Ingresso Magic Kingdom - Pedro',
      tipo_documento: 'INGRESSO'
    });

    // Assert
    expect(resultado.id).toBe('doc-ingresso-1');
    expect(payloadInserido.viagem_id).toBe('viagem-grupo-10');
    expect(payloadInserido.cliente_id).toBe('cliente-pedro-123');
    expect(payloadInserido.tipo_documento).toBe('INGRESSO');
  });

  it('deve orquestrar a compressão inteligente do PDF quando o tamanho exceder o limite de upload antes de persistir no Storage', async () => {
    // Setup
    const tamanho103Mb = 103 * 1024 * 1024;
    const mockPdf103Mb = new File([new Uint8Array(tamanho103Mb)], 'contrato_pesado.pdf', {
      type: 'application/pdf'
    });
    const mockPdfComprimido = new File([new Uint8Array(6 * 1024 * 1024)], 'contrato_pesado.pdf', {
      type: 'application/pdf'
    });

    const spyCompress = vi.spyOn(
      (await import('../../src/services/pdfCompressorService')).PdfCompressorService,
      'comprimirPdfSeNecessario'
    ).mockResolvedValue(mockPdfComprimido);

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { limite_upload_mb: 25 }, error: null })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'doc-pdf-comprimido-1',
              nome_original: 'contrato_pesado.pdf',
              tamanho_bytes: 6 * 1024 * 1024
            },
            error: null
          })
        })
      })
    });
    (supabase.from as any) = mockFrom;

    const progressoMensagens: string[] = [];

    // Action
    const resultado = await AnexosService.uploadAnexo({
      file: mockPdf103Mb,
      rotulo: 'Contrato Pesado',
      tipo_documento: 'CONTRATO',
      onProgress: (msg) => progressoMensagens.push(msg)
    });

    // Assert
    expect(spyCompress).toHaveBeenCalledWith(mockPdf103Mb, 25, expect.any(Function));
    expect(resultado.id).toBe('doc-pdf-comprimido-1');
    expect(supabase.storage.from).toHaveBeenCalledWith('documentos-clientes');
  });

  it('deve formatar tamanho de arquivo em formato legível exibindo KB e MB em conjunto', () => {
    // Setup & Action & Assert
    // Arquivo nulo ou zerado
    expect(AnexosService.formatarTamanho(0)).toBe('');
    expect(AnexosService.formatarTamanho(undefined)).toBe('');

    // Arquivo de 100 MB (104.857.600 bytes)
    const tamanho100Mb = 100 * 1024 * 1024;
    expect(AnexosService.formatarTamanho(tamanho100Mb)).toContain('100.0 MB');
    expect(AnexosService.formatarTamanho(tamanho100Mb)).toContain('102.400 KB');

    // Arquivo de 2.5 MB (2.621.440 bytes)
    const tamanho2_5Mb = 2.5 * 1024 * 1024;
    expect(AnexosService.formatarTamanho(tamanho2_5Mb)).toContain('2.5 MB');
    expect(AnexosService.formatarTamanho(tamanho2_5Mb)).toContain('2.560 KB');

    // Arquivo de 450 KB (460.800 bytes)
    const tamanho450Kb = 450 * 1024;
    expect(AnexosService.formatarTamanho(tamanho450Kb)).toContain('450 KB');
    expect(AnexosService.formatarTamanho(tamanho450Kb)).toContain('0.4 MB');

    // Arquivo pequeno (5 KB = 5120 bytes)
    const tamanho5Kb = 5 * 1024;
    expect(AnexosService.formatarTamanho(tamanho5Kb)).toContain('5.0 KB');
  });
});


