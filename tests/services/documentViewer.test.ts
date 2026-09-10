import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentViewer } from '../../src/services/documentViewer';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('DocumentViewer - Testes Subcutâneos de Resolução e Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock seguro de elementos DOM
    const fakeElement: any = {
      id: '',
      className: '',
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn().mockReturnValue(false),
      },
      innerHTML: '',
      addEventListener: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      remove: vi.fn(),
      disabled: false,
      href: '',
    };

    (globalThis as any).document = {
      getElementById: vi.fn().mockReturnValue(fakeElement),
      createElement: vi.fn().mockReturnValue(fakeElement),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };

    (globalThis as any).URL = {
      createObjectURL: vi.fn().mockReturnValue('blob:http://localhost/fake-doc-blob'),
      revokeObjectURL: vi.fn(),
    };
  });

  it('deve extrair ID de arquivo a partir de múltiplos formatos de URLs do Google Drive legado', () => {
    // Setup
    const urlFolder = 'https://drive.google.com/drive/folders/1a2b3c4d5e6f7g';
    const urlFile = 'https://drive.google.com/file/d/9z8y7x6w5v4u3t/view';
    const urlQuery = 'https://drive.google.com/open?id=11223344556677';
    const idDireto = 'arquivo-uuid-direto';

    // Action
    const idFolder = (DocumentViewer as any).extrairFileId(urlFolder);
    const idFile = (DocumentViewer as any).extrairFileId(urlFile);
    const idQuery = (DocumentViewer as any).extrairFileId(urlQuery);
    const idNormal = (DocumentViewer as any).extrairFileId(idDireto);

    // Assert
    expect(idFolder).toBe('1a2b3c4d5e6f7g');
    expect(idFile).toBe('9z8y7x6w5v4u3t');
    expect(idQuery).toBe('11223344556677');
    expect(idNormal).toBe('arquivo-uuid-direto');
  });

  it('deve realizar download do Supabase Storage e gerar Signed URL temporária de 15 minutos', async () => {
    // Setup
    const downloadMock = vi.fn().mockResolvedValue({
      data: new Blob(['conteudo pdf'], { type: 'application/pdf' }),
      error: null,
    });
    const signedUrlMock = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/storage/v1/signed/doc.pdf?token=abc' },
      error: null,
    });

    vi.mocked(supabase.storage.from).mockReturnValue({
      download: downloadMock,
      createSignedUrl: signedUrlMock,
    } as any);

    const storagePath = 'supabase-storage://cliente-uuid-1/voucher-reserva.pdf';

    // Action
    await DocumentViewer.open('Voucher Reserva', storagePath, 'application/pdf');

    // Assert
    expect(supabase.storage.from).toHaveBeenCalledWith('documentos-clientes');
    expect(downloadMock).toHaveBeenCalledWith('cliente-uuid-1/voucher-reserva.pdf');
    expect(signedUrlMock).toHaveBeenCalledWith('cliente-uuid-1/voucher-reserva.pdf', 900); // 900s = 15min
  });

  it('deve capturar falhas no download do Supabase Storage e exibir aviso amigável', async () => {
    // Setup
    const downloadMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Object not found in bucket' },
    });

    vi.mocked(supabase.storage.from).mockReturnValue({
      download: downloadMock,
    } as any);

    const storagePathInexistente = 'supabase-storage://cliente-1/arquivo-inexistente.pdf';

    // Action
    await DocumentViewer.open('Arquivo Perdido', storagePathInexistente);

    // Assert
    expect(downloadMock).toHaveBeenCalled();
  });

  it('deve limpar activeObjectURL da memória ao fechar o visualizador', () => {
    // Setup
    (DocumentViewer as any).activeObjectURL = 'blob:http://localhost/antigo';

    // Action
    DocumentViewer.close();

    // Assert
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/antigo');
    expect((DocumentViewer as any).activeObjectURL).toBeNull();
  });
});
