import { supabase } from './supabase';

export class DocumentViewer {
  private static activeObjectURL: string | null = null;

  /**
   * Abre o modal visualizador de documentos com suporte a Supabase Storage e compatibilidade a Google Drive legado.
   * 
   * @param fileName Nome legível do arquivo.
   * @param fileUrlOrId Caminho no Supabase Storage (supabase-storage://...) ou link do Google Drive legado.
   * @param mimeType Opcional. Tipo MIME do arquivo (ex: 'application/pdf', 'image/png').
   * @param clientData Opcional. Dados do passageiro (não utilizado mais após a remoção do sandbox).
   */
  public static async open(
    fileName: string,
    fileUrlOrId: string,
    mimeType: string = 'application/pdf',
    clientData?: any
  ): Promise<void> {
    // 1. Extrair o ID do arquivo/pasta
    let fileId = this.extrairFileId(fileUrlOrId);
    let targetMimeType = mimeType;
    let targetFileName = fileName;

    // 2. Criar ou obter o contêiner do modal no DOM
    let overlay = document.getElementById('paxflow-doc-viewer-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'paxflow-doc-viewer-overlay';
      overlay.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300';
      document.body.appendChild(overlay);
    }

    // 3. Renderizar estrutura básica do Modal Lightbox Premium
    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800/80 transform scale-95 transition-all duration-300 flex flex-col overflow-hidden" id="paxflow-doc-viewer-container">
        
        <!-- Barra Superior de Ações -->
        <header class="bg-slate-50 dark:bg-slate-900/60 px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2.5 overflow-hidden pr-4">
            <span class="text-xl p-1 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/80 rounded-lg flex items-center justify-center shrink-0">📄</span>
            <div class="overflow-hidden">
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 truncate tracking-tight leading-tight">${fileName}</h3>
              <p class="text-[10px] text-slate-400 dark:text-slate-505 font-bold uppercase tracking-wider mt-0.5">Visualizador de Documentos PaxFlow</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3.5">
            <!-- Botão de Download Local (Será habilitado após carregamento) -->
            <button id="paxflow-doc-download-btn" disabled class="px-3.5 py-2 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-400 dark:text-indigo-650 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-indigo-100/20 dark:border-indigo-900/20 transition flex items-center gap-1.5 opacity-50 cursor-not-allowed">
              <span>📥</span> Download
            </button>
            
            <!-- Botão de Abrir Original -->
            <a id="paxflow-doc-drive-link" href="${fileUrlOrId.startsWith('http') ? fileUrlOrId : `https://drive.google.com/open?id=${fileId}`}" target="_blank" class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-indigo-100/30 dark:border-indigo-900/30 transition flex items-center gap-1.5">
              <span>🌐</span> Abrir Original
            </a>
            
            <!-- Botão Fechar -->
            <button id="paxflow-doc-close-btn" class="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-450 hover:text-rose-550 dark:text-slate-400 dark:hover:text-rose-455 rounded-lg transition font-black leading-none text-sm">
              ✕
            </button>
          </div>
        </header> defense

        <!-- Corpo com Visualização do Documento -->
        <main class="flex-grow bg-slate-100/50 dark:bg-slate-950/40 relative flex items-center justify-center p-6 overflow-hidden min-h-0">
          <!-- Skeleton Loader -->
          <div id="paxflow-doc-viewer-loader" class="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-white/95 dark:bg-slate-900/95 z-10 transition-opacity duration-300">
            <div class="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse uppercase tracking-wider">Buscando arquivo de forma segura...</p>
          </div>

          <!-- Área de Injeção de Renderização -->
          <div id="paxflow-doc-viewer-content" class="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar"></div>
        </main>
      </div>
    `;

    // 4. Animar entrada do Modal
    setTimeout(() => {
      if (overlay) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
      }
      const container = document.getElementById('paxflow-doc-viewer-container');
      if (container) {
        container.classList.remove('scale-95');
        container.classList.add('scale-100');
      }
    }, 20);

    // 5. Vincular botões superiores
    const handleClose = () => this.close();
    document.getElementById('paxflow-doc-close-btn')?.addEventListener('click', handleClose);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) handleClose();
    });

    const contentEl = document.getElementById('paxflow-doc-viewer-content');
    const loaderEl = document.getElementById('paxflow-doc-viewer-loader');
    const downloadBtn = document.getElementById('paxflow-doc-download-btn') as HTMLButtonElement;

    if (!contentEl) return;

    try {
      const isSupabaseFile = fileUrlOrId.startsWith('supabase-storage://');

      if (isSupabaseFile) {
        // --- FLUXO SUPABASE STORAGE ---
        const cleanPath = fileUrlOrId.replace('supabase-storage://', '');
        
        // Baixar arquivo do bucket 'documentos-clientes'
        const { data: fileBlob, error: downloadErr } = await supabase.storage
          .from('documentos-clientes')
          .download(cleanPath);

        if (downloadErr) {
          throw new Error(`Falha ao carregar arquivo do storage: ${downloadErr.message}`);
        }

        if (!fileBlob) {
          throw new Error('Nenhum dado retornado do servidor de armazenamento.');
        }

        // Criar URL temporária na memória do navegador
        if (this.activeObjectURL) {
          URL.revokeObjectURL(this.activeObjectURL);
        }
        this.activeObjectURL = URL.createObjectURL(fileBlob);

        // Identificar se o arquivo é imagem ou PDF
        const fileExt = cleanPath.split('.').pop()?.toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt || '') || targetMimeType.startsWith('image/');

        if (isImage) {
          contentEl.innerHTML = `<img src="${this.activeObjectURL}" alt="${targetFileName}" class="max-w-full max-h-full object-contain rounded-lg shadow-md border border-slate-200/50 dark:border-slate-800" />`;
        } else {
          contentEl.innerHTML = `<iframe src="${this.activeObjectURL}#toolbar=0" class="w-full h-full border-0 rounded-lg shadow-sm" type="application/pdf"></iframe>`;
        }

        // Habilitar botão de download local
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.className = 'px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-indigo-100/30 dark:border-indigo-900/30 transition flex items-center gap-1.5 shadow-sm cursor-pointer';
          downloadBtn.addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = this.activeObjectURL!;
            a.download = targetFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
        }

        // Atualizar o link "Abrir Original" com uma Signed URL temporária válida por 15 minutos
        const { data: signedData } = await supabase.storage
          .from('documentos-clientes')
          .createSignedUrl(cleanPath, 900);

        const driveLink = document.getElementById('paxflow-doc-drive-link') as HTMLAnchorElement;
        if (driveLink && signedData?.signedUrl) {
          driveLink.href = signedData.signedUrl;
          driveLink.innerHTML = `<span>🌐</span> Abrir Original`;
        }
      } else {
        throw new Error('Este documento foi salvo no Google Drive legado e a visualização direta está desativada. Por favor, clique no botão "Abrir Original" acima para acessar o arquivo diretamente na sua conta do Google Drive.');
      }
    } catch (err: any) {
      console.error('Falha ao renderizar documento no modal:', err);

      const isGoogleDriveLink = !fileUrlOrId.startsWith('supabase-storage://');
      const friendlyErrorMessage = isGoogleDriveLink
        ? 'Este documento foi salvo no Google Drive legado e a visualização direta está inativa. Por favor, clique no botão "Abrir Original" acima para acessar o arquivo diretamente na sua conta do Google Drive.'
        : (err.message || 'Falha ao buscar ou ler o arquivo do Supabase Storage.');

      contentEl.innerHTML = `
        <div class="text-center p-8 max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg">
          <div class="text-rose-500 text-4xl mb-3">⚠️</div>
          <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Visualização Indisponível</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-4 leading-normal">${friendlyErrorMessage}</p>
          <div class="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-150 dark:border-slate-850 font-mono text-left truncate w-full">
            Ref: ${fileId}
          </div>
        </div>
      `;
    } finally {
      if (loaderEl) {
        loaderEl.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => loaderEl.remove(), 300);
      }
    }
  }

  /**
   * Fecha o modal limpando a URL temporária da memória.
   */
  public static close(): void {
    const overlay = document.getElementById('paxflow-doc-viewer-overlay');
    const container = document.getElementById('paxflow-doc-viewer-container');
    
    if (overlay && container) {
      container.classList.remove('scale-100');
      container.classList.add('scale-95');
      overlay.classList.remove('opacity-100', 'pointer-events-auto');
      overlay.classList.add('opacity-0', 'pointer-events-none');
    }

    if (this.activeObjectURL) {
      URL.revokeObjectURL(this.activeObjectURL);
      this.activeObjectURL = null;
    }
  }

  /**
   * Extrai o ID do arquivo a partir de um link do Drive ou ID direto
   */
  private static extrairFileId(urlOrId: string): string {
    if (!urlOrId) return '';
    if (!urlOrId.startsWith('http')) return urlOrId;

    if (urlOrId.includes('/folders/')) {
      const match = urlOrId.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : urlOrId;
    }

    if (urlOrId.includes('/file/d/')) {
      const match = urlOrId.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : urlOrId;
    }

    if (urlOrId.includes('id=')) {
      const match = urlOrId.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      return match ? match[1] : urlOrId;
    }

    return urlOrId;
  }
}
