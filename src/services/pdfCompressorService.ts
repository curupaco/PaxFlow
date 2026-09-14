/**
 * Serviço de Compressão Inteligente de PDFs no PaxFlow.
 * 
 * Ativado estritamente quando um arquivo PDF excede o limite estipulado (padrão 25MB).
 * Utiliza lazy loading (importação dinâmica) de `pdfjs-dist` e `pdf-lib` para zero impacto
 * no tempo de carregamento inicial da aplicação.
 * 
 * Metodologia:
 * - Rasterização visual das páginas em ~150 DPI via Canvas API.
 * - Codificação JPEG com alta fidelidade visual (qualidade 0.75 a 0.80).
 * - Remontagem das páginas em um novo documento limpo e leve.
 */

export interface ProgressoCompressaoPdf {
  paginaAtual: number;
  totalPaginas: number;
  mensagem: string;
}

export class PdfCompressorService {
  public static readonly LIMITE_PADRAO_MB = 25;
  public static readonly QUALIDADE_JPEG = 0.75;
  public static readonly DPI_ALVO = 150;
  public static readonly DPI_BASE_PDF = 72;

  /**
   * Verifica se o arquivo é um PDF e se o tamanho ultrapassa o limite em megabytes.
   */
  public static precisaComprimir(file: File, limiteMb: number = this.LIMITE_PADRAO_MB): boolean {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return false;

    const sizeInMb = file.size / (1024 * 1024);
    return sizeInMb > limiteMb;
  }

  /**
   * Executa a compressão visual de um PDF caso ele exceda o limite estipulado.
   * Se o arquivo for menor ou igual ao limite, ou se não for um PDF, retorna o próprio arquivo original sem modificações.
   */
  public static async comprimirPdfSeNecessario(
    file: File,
    limiteMb: number = this.LIMITE_PADRAO_MB,
    onProgress?: (progresso: ProgressoCompressaoPdf) => void
  ): Promise<File> {
    // 1. Se não precisar comprimir, retorna o arquivo original sem carregar bibliotecas
    if (!this.precisaComprimir(file, limiteMb)) {
      return file;
    }

    const sizeInMbOriginal = file.size / (1024 * 1024);

    // 2. Verificação de ambiente navegador
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return file;
    }

    onProgress?.({
      paginaAtual: 0,
      totalPaginas: 0,
      mensagem: `Iniciando otimização do PDF (${sizeInMbOriginal.toFixed(1)}MB)...`
    });

    try {
      // 3. Lazy loading sob demanda das bibliotecas pesadas de PDF
      const [pdfjsLib, { PDFDocument }] = await Promise.all([
        import('pdfjs-dist'),
        import('pdf-lib')
      ]);

      // Configuração de worker do PDF.js
      if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
        }
      }

      // 4. Carrega o documento original
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true
      });

      const pdfOriginal = await loadingTask.promise;
      const totalPaginas = pdfOriginal.numPages;

      if (totalPaginas === 0) {
        return file;
      }

      // 5. Cria novo documento limpo
      const novoPdfDoc = await PDFDocument.create();

      // Escala para atingir 150 DPI (150 / 72 ≈ 2.0833)
      const scaleAlvo = this.DPI_ALVO / this.DPI_BASE_PDF;

      // 6. Processa cada página individualmente
      for (let i = 1; i <= totalPaginas; i++) {
        onProgress?.({
          paginaAtual: i,
          totalPaginas,
          mensagem: `Otimizando documento para o limite da agência: Página ${i} de ${totalPaginas}...`
        });

        const page = await pdfOriginal.getPage(i);
        const originalViewport = page.getViewport({ scale: 1.0 });

        // Ajusta escala respeitando dimensões máximas razoáveis para evitar estourar limites de memória
        let scale = scaleAlvo;
        const maxDim = Math.max(originalViewport.width, originalViewport.height) * scale;
        if (maxDim > 2800) {
          scale = 2800 / Math.max(originalViewport.width, originalViewport.height);
        }

        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) {
          throw new Error('Não foi possível inicializar o renderizador gráfico (Canvas 2D) do navegador.');
        }

        // Renderiza a página no canvas
        await (page.render as any)({
          canvasContext: ctx,
          viewport,
          canvas
        }).promise;

        // Converte para JPEG com compressão
        const jpegBlob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', this.QUALIDADE_JPEG);
        });

        if (!jpegBlob) {
          throw new Error(`Falha ao comprimir imagem da página ${i}.`);
        }

        const jpegBytes = await jpegBlob.arrayBuffer();
        const imagemEmbutida = await novoPdfDoc.embedJpg(jpegBytes);

        // Adiciona página com dimensões idênticas às originais em pontos PDF
        const novaPagina = novoPdfDoc.addPage([originalViewport.width, originalViewport.height]);
        novaPagina.drawImage(imagemEmbutida, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height
        });

        // Libera referências para coleta de lixo
        canvas.width = 0;
        canvas.height = 0;
      }

      onProgress?.({
        paginaAtual: totalPaginas,
        totalPaginas,
        mensagem: 'Finalizando empacotamento do documento...'
      });

      // 7. Salva novo documento PDF otimizado
      const pdfFinalBytes = await novoPdfDoc.save();
      const novoArquivo = new File([new Uint8Array(pdfFinalBytes)], file.name, {
        type: 'application/pdf',
        lastModified: Date.now()
      });

      const sizeInMbFinal = novoArquivo.size / (1024 * 1024);

      // 8. Se mesmo após a compressão em 150 DPI o arquivo ainda for > limiteMb
      if (sizeInMbFinal > limiteMb) {
        throw new Error(
          `O documento "${file.name}" foi otimizado de ${sizeInMbOriginal.toFixed(1)}MB para ${sizeInMbFinal.toFixed(1)}MB, mas ainda excede o limite máximo permitido de ${limiteMb}MB. Por favor, desmembre o PDF em arquivos menores com menos páginas.`
        );
      }

      return novoArquivo;
    } catch (err: any) {
      console.error('[PdfCompressorService] Erro durante compressão do PDF:', err);
      // Se for o erro explícito de limite excedido mesmo após compressão, repassa a mensagem
      if (err.message && err.message.includes('ainda excede o limite máximo permitido')) {
        throw err;
      }
      throw new Error(`Falha ao otimizar PDF de grande porte (${sizeInMbOriginal.toFixed(1)}MB): ${err.message || 'Erro de renderização.'}`);
    }
  }
}
