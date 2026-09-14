import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfCompressorService } from '../../src/services/pdfCompressorService';

class MockFile {
  name: string;
  size: number;
  type: string;
  constructor(parts: any[], name: string, options?: { type?: string }) {
    this.name = name;
    this.type = options?.type || 'application/octet-stream';
    this.size = parts.reduce((acc, p) => acc + (typeof p === 'string' ? p.length : (p?.byteLength ?? p?.length ?? 100)), 0);
  }
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(100));
  }
}
if (typeof globalThis.File === 'undefined') {
  (globalThis as any).File = MockFile;
}

let mockPdfSaveBytes: Uint8Array = new Uint8Array(8 * 1024 * 1024);

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: () => Promise.resolve({
        getViewport: () => ({ width: 800, height: 1100 }),
        render: () => ({ promise: Promise.resolve() })
      })
    })
  })
}));

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: () => Promise.resolve({
      embedJpg: () => Promise.resolve({}),
      addPage: () => ({ drawImage: vi.fn() }),
      save: () => Promise.resolve(mockPdfSaveBytes)
    })
  }
}));

describe('PdfCompressorService - Testes Subcutâneos de Compressão Inteligente de PDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfSaveBytes = new Uint8Array(8 * 1024 * 1024);
    (globalThis as any).window = {};
    (globalThis as any).document = {
      createElement: () => ({
        getContext: () => ({}),
        toBlob: (cb: any) => cb({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(50))
        })
      })
    };
  });

  it('não deve acionar compressão quando o arquivo for PDF mas tiver tamanho menor ou igual a 25MB', async () => {
    // Setup
    const tamanho10Mb = 10 * 1024 * 1024;
    const mockFilePequeno = new File([new Uint8Array(tamanho10Mb)], 'voucher_pequeno.pdf', {
      type: 'application/pdf'
    });

    // Action
    const precisa = PdfCompressorService.precisaComprimir(mockFilePequeno);
    const resultado = await PdfCompressorService.comprimirPdfSeNecessario(mockFilePequeno);

    // Assert
    expect(precisa).toBe(false);
    expect(resultado).toBe(mockFilePequeno);
    expect(resultado.size).toBe(tamanho10Mb);
  });

  it('não deve acionar compressão para arquivos que não sejam PDF mesmo se maiores que 25MB', async () => {
    // Setup
    const tamanho30Mb = 30 * 1024 * 1024;
    const mockArquivoImagem = new File([new Uint8Array(tamanho30Mb)], 'foto_alta_resolucao.png', {
      type: 'image/png'
    });

    // Action
    const precisa = PdfCompressorService.precisaComprimir(mockArquivoImagem);
    const resultado = await PdfCompressorService.comprimirPdfSeNecessario(mockArquivoImagem);

    // Assert
    expect(precisa).toBe(false);
    expect(resultado).toBe(mockArquivoImagem);
  });

  it('deve identificar corretamente quando um arquivo PDF excede o limite de 25MB', () => {
    // Setup
    const tamanho103Mb = 103 * 1024 * 1024;
    const mockPdfPesado = new File([new Uint8Array(tamanho103Mb)], 'contrato_103mb.pdf', {
      type: 'application/pdf'
    });

    // Action
    const precisa = PdfCompressorService.precisaComprimir(mockPdfPesado);

    // Assert
    expect(precisa).toBe(true);
  });

  it('deve lançar erro explicativo quando o documento comprimido ainda ultrapassar o limite permitido', async () => {
    // Setup
    const tamanho30Mb = 30 * 1024 * 1024;
    const mockPdf = new File([new Uint8Array(tamanho30Mb)], 'documento_extenso.pdf', {
      type: 'application/pdf'
    });
    // Simula saída ainda pesada com 28MB (> 25MB)
    mockPdfSaveBytes = new Uint8Array(28 * 1024 * 1024);

    // Action & Assert
    await expect(
      PdfCompressorService.comprimirPdfSeNecessario(mockPdf, 25)
    ).rejects.toThrow(/ainda excede o limite máximo permitido/);
  });

  it('deve emitir notificações de progresso por página durante a compressão de PDF', async () => {
    // Setup
    const tamanho35Mb = 35 * 1024 * 1024;
    const mockPdf = new File([new Uint8Array(tamanho35Mb)], 'passaporte_scaneado.pdf', {
      type: 'application/pdf'
    });
    mockPdfSaveBytes = new Uint8Array(8 * 1024 * 1024);

    const mensagensProgresso: string[] = [];
    const callbackProgresso = (prog: any) => {
      mensagensProgresso.push(prog.mensagem);
    };

    // Action
    const arquivoComprimido = await PdfCompressorService.comprimirPdfSeNecessario(
      mockPdf,
      25,
      callbackProgresso
    );

    // Assert
    expect(mensagensProgresso.length).toBeGreaterThan(0);
    expect(mensagensProgresso.some(m => m.includes('Iniciando otimização'))).toBe(true);
    expect(arquivoComprimido.size).toBe(8 * 1024 * 1024);
  });
});
