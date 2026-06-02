import { supabase } from './supabase';
import { obterArquivoBlob, exportarGoogleDocPdf } from './googleDrive';

export class DocumentViewer {
  private static activeObjectURL: string | null = null;

  /**
   * Abre o modal visualizador de documentos com suporte a visualização real e sandbox.
   * 
   * @param fileName Nome legível do arquivo.
   * @param fileUrlOrId Link do Google Drive (contendo o ID da pasta/arquivo) ou o ID direto do arquivo.
   * @param mimeType Opcional. Tipo MIME do arquivo (ex: 'application/pdf', 'image/png').
   * @param clientData Opcional. Dados do passageiro para simular o documento em Sandbox.
   */
  public static async open(
    fileName: string,
    fileUrlOrId: string,
    mimeType: string = 'application/pdf',
    clientData?: any
  ): Promise<void> {
    // 1. Extrair o ID do arquivo a partir de uma URL do Drive ou ID direto
    const fileId = this.extrairFileId(fileUrlOrId);

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
              <p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Visualizador de Documentos PaxFlow</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3.5">
            <!-- Botão de Download Local (Será habilitado após carregamento) -->
            <button id="paxflow-doc-download-btn" disabled class="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-450 dark:text-slate-500 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-slate-200 dark:border-slate-700/80 transition flex items-center gap-1.5 opacity-50 cursor-not-allowed">
              <span>📥</span> Download
            </button>
            
            <!-- Botão de Abrir Original no Drive -->
            <a id="paxflow-doc-drive-link" href="${fileUrlOrId.startsWith('http') ? fileUrlOrId : `https://drive.google.com/open?id=${fileId}`}" target="_blank" class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-indigo-100/30 dark:border-indigo-900/30 transition flex items-center gap-1.5">
              <span>🌐</span> Abrir Original
            </a>
            
            <!-- Botão Fechar -->
            <button id="paxflow-doc-close-btn" class="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-450 hover:text-rose-550 dark:text-slate-400 dark:hover:text-rose-450 rounded-lg transition font-black leading-none text-sm">
              ✕
            </button>
          </div>
        </header>

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

    // 6. Determinar se estamos em Sandbox ou Modo Real
    const isSandbox = await this.checkIfSandbox();

    // 7. Renderizar Documento conforme o Modo
    const contentEl = document.getElementById('paxflow-doc-viewer-content');
    const loaderEl = document.getElementById('paxflow-doc-viewer-loader');
    const downloadBtn = document.getElementById('paxflow-doc-download-btn') as HTMLButtonElement;

    if (!contentEl) return;

    try {
      if (isSandbox) {
        // --- MODO SANDBOX: SIMULAÇÃO PREMIUM COM DADOS REAIS DO CLIENTE ---
        await new Promise((resolve) => setTimeout(resolve, 800)); // Latência realista do simulador
        
        const isPassport = fileName.toLowerCase().includes('passaporte') || mimeType.includes('passport') || (clientData && clientData.passaporteNumero);
        
        if (isPassport) {
          contentEl.innerHTML = this.renderSimulatedPassport(clientData || {});
        } else {
          contentEl.innerHTML = this.renderSimulatedProposal(clientData || {});
        }

        // Habilita download do mock gerado
        this.setupMockDownload(fileName, isPassport ? 'passport' : 'proposal', clientData);
      } else {
        // --- MODO REAL: DOWNLOAD SEGURO VIA API DO GOOGLE DRIVE ---
        const isGoogleDoc = mimeType.includes('vnd.google-apps');
        let fileBlob: Blob;

        if (isGoogleDoc) {
          fileBlob = await exportarGoogleDocPdf(fileId);
        } else {
          fileBlob = await obterArquivoBlob(fileId);
        }

        // Criar URL do objeto e renderizar no DOM
        if (this.activeObjectURL) {
          URL.revokeObjectURL(this.activeObjectURL);
        }
        this.activeObjectURL = URL.createObjectURL(fileBlob);

        const isImage = mimeType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        if (isImage) {
          contentEl.innerHTML = `<img src="${this.activeObjectURL}" alt="${fileName}" class="max-w-full max-h-full object-contain rounded-lg shadow-md border border-slate-200/50 dark:border-slate-800" />`;
        } else {
          contentEl.innerHTML = `<iframe src="${this.activeObjectURL}#toolbar=0" class="w-full h-full border-0 rounded-lg shadow-sm" type="application/pdf"></iframe>`;
        }

        // Habilita botão de download real
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.className = 'px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-250 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-slate-200 dark:border-slate-700/80 transition flex items-center gap-1.5 shadow-sm cursor-pointer';
          downloadBtn.addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = this.activeObjectURL!;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
        }
      }
    } catch (err: any) {
      console.error('Falha ao renderizar documento no modal:', err);
      contentEl.innerHTML = `
        <div class="text-center p-8 max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-lg">
          <div class="text-rose-500 text-4xl mb-3">⚠️</div>
          <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Erro de Carregamento</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-4 leading-normal">${err.message || 'Falha ao buscar ou ler o arquivo do Google Drive.'}</p>
          <div class="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-150 dark:border-slate-850 font-mono text-left truncate">
            Ref: ${fileId}
          </div>
        </div>
      `;
    } finally {
      // Remover loader
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

    // Trata links de pasta (/folders/...)
    if (urlOrId.includes('/folders/')) {
      const match = urlOrId.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : urlOrId;
    }

    // Trata links de arquivo (/file/d/...)
    if (urlOrId.includes('/file/d/')) {
      const match = urlOrId.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : urlOrId;
    }

    // Trata links com parâmetro id=
    if (urlOrId.includes('id=')) {
      const match = urlOrId.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      return match ? match[1] : urlOrId;
    }

    return urlOrId;
  }

  /**
   * Verifica se a agência está em Modo Sandbox (refresh token nulo ou mock)
   */
  private static async checkIfSandbox(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('google_refresh_token')
        .maybeSingle();

      if (error || !data || !data.google_refresh_token) return true;
      
      const token = data.google_refresh_token.trim();
      return token === '' || token.startsWith('mock_');
    } catch {
      return true; // Fallback para sandbox por segurança
    }
  }

  /**
   * Renderiza a simulação estética e interativa do Passaporte (Modo Sandbox)
   */
  private static renderSimulatedPassport(c: any): string {
    const nome = (c.nome || 'NOME DO PASSAGEIRO').toUpperCase();
    const doc = c.documento || 'XXX.XXX.XXX-XX';
    const passNumero = (c.passaporteNumero || 'PA000000').toUpperCase();
    const validadeRaw = c.passaporteValidade || '';
    const validade = validadeRaw ? new Date(validadeRaw).toLocaleDateString('pt-BR') : 'Sem data';

    // Determina o status do passaporte
    const validadeDate = validadeRaw ? new Date(validadeRaw) : null;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const diffDays = validadeDate ? Math.ceil((validadeDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : null;

    let alertHtml = '';
    let passSlaBorderColor = 'border-emerald-500/30';
    if (diffDays !== null) {
      if (diffDays < 0) {
        passSlaBorderColor = 'border-rose-500/50';
        alertHtml = `
          <div class="mt-3 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-[10px] font-black text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-900/30 text-center animate-pulse">
            🚨 ATENÇÃO: ESTE PASSAPORTE ESTÁ EXPIRADO HÁ ${Math.abs(diffDays)} DIAS!
          </div>
        `;
      } else if (diffDays <= 180) {
        passSlaBorderColor = 'border-amber-500/50';
        alertHtml = `
          <div class="mt-3 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 text-[10px] font-black text-amber-600 dark:text-amber-400 rounded-lg border border-amber-100 dark:border-amber-900/30 text-center animate-pulse">
            ⚠️ ALERTA SLA: VENCE EM ${diffDays} DIAS! EXIGE RENOVAÇÃO PARA EMBARQUE.
          </div>
        `;
      }
    }

    return `
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border ${passSlaBorderColor} flex flex-col gap-4 relative overflow-hidden transform transition duration-300 hover:scale-[1.01]">
        
        <!-- Faixa Azul Premium do Passaporte -->
        <div class="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-4 -mx-6 -mt-6 rounded-t-2xl flex items-center justify-between border-b border-indigo-900">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🇧🇷</span>
            <div>
              <h4 class="text-xs font-black tracking-widest uppercase">REPÚBLICA FEDERATIVA DO BRASIL</h4>
              <p class="text-[8px] font-extrabold text-blue-300 tracking-wider">MINISTÉRIO DA JUSTIÇA E SEGURANÇA PÚBLICA</p>
            </div>
          </div>
          <span class="text-lg font-black text-blue-200">PASSAPORTE</span>
        </div>

        <!-- Layout do Passaporte Interno -->
        <div class="grid grid-cols-12 gap-4 mt-2">
          <!-- Foto e Detalhes do Chip -->
          <div class="col-span-4 flex flex-col items-center gap-2">
            <div class="w-full aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 relative overflow-hidden shadow-inner">
              <span class="text-4xl filter grayscale">👤</span>
              <p class="text-[8px] font-black uppercase tracking-wider text-slate-400 mt-2">FOTO DOC</p>
              <div class="absolute bottom-1 right-1 text-[8px] p-0.5 bg-slate-200 dark:bg-slate-750 text-slate-500 dark:text-slate-455 rounded font-mono font-bold border border-slate-300/40">${passNumero}</div>
            </div>
            <div class="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-1">
              <span>🖃</span> ASSINATURA DIGITAL
            </div>
          </div>

          <!-- Campos do Passaporte -->
          <div class="col-span-8 grid grid-cols-2 gap-3.5 text-xs">
            <div class="col-span-2">
              <span class="block text-[8px] text-slate-450 dark:text-slate-550 font-bold uppercase tracking-wider">Sobrenome / Nome</span>
              <strong class="text-slate-800 dark:text-slate-200 font-black tracking-wide">${nome}</strong>
            </div>
            <div>
              <span class="block text-[8px] text-slate-450 dark:text-slate-550 font-bold uppercase tracking-wider">Documento Identidade (CPF)</span>
              <strong class="text-slate-800 dark:text-slate-200 font-extrabold font-mono">${doc}</strong>
            </div>
            <div>
              <span class="block text-[8px] text-slate-450 dark:text-slate-550 font-bold uppercase tracking-wider">Número Passaporte</span>
              <strong class="text-indigo-650 dark:text-indigo-400 font-black font-mono">${passNumero}</strong>
            </div>
            <div>
              <span class="block text-[8px] text-slate-450 dark:text-slate-550 font-bold uppercase tracking-wider">Nacionalidade</span>
              <strong class="text-slate-700 dark:text-slate-300 font-bold">BRASILEIRA</strong>
            </div>
            <div>
              <span class="block text-[8px] text-slate-450 dark:text-slate-550 font-bold uppercase tracking-wider">Data de Vencimento</span>
              <strong class="text-slate-800 dark:text-slate-200 font-black font-mono">${validade}</strong>
            </div>
            
            <div class="col-span-2 pt-2 border-t border-dashed border-slate-250 dark:border-slate-800 flex items-center justify-between text-[8px] text-slate-400 font-bold font-mono tracking-widest uppercase">
              <span>P&lt;BRA${nome.replace(/\s+/g, '&lt;')}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span>
              <span>${passNumero}&lt;5BRA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</span>
            </div>
          </div>
        </div>

        <!-- Alerta de SLA se ativo -->
        ${alertHtml}

        <!-- Rodapé do Simulador Sandbox -->
        <div class="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1 flex items-center justify-between text-[8.5px] text-slate-400 dark:text-slate-500 font-semibold italic">
          <span>⚠️ Documento gerado de forma simulada do passageiro.</span>
          <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider rounded border border-indigo-500/15">MODO SANDBOX</span>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza a simulação de uma Proposta de Viagem Comercial (Modo Sandbox)
   */
  private static renderSimulatedProposal(orc: any): string {
    const passageiro = (orc.nome_cliente || orc.nome || 'Cliente Interessado').toUpperCase();
    const destino = orc.destino || 'Destino de Sonho';
    const valor = orc.valor_total || orc.valorRaw || 8500.00;
    const valorFormatado = Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const dataCriacao = orc.createdAt ? new Date(orc.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

    return `
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-indigo-500/20 flex flex-col gap-5 transform transition duration-300 hover:scale-[1.01]">
        
        <!-- Header da Proposta -->
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div class="flex items-center gap-2">
            <span class="text-2xl">✈️</span>
            <div>
              <h4 class="text-sm font-black text-slate-850 dark:text-slate-100 leading-tight">PROPOSTA COMERCIAL</h4>
              <p class="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">PaxFlow Operadora Turística</p>
            </div>
          </div>
          <div class="text-right">
            <span class="block text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase">Data de Criação</span>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">${dataCriacao}</span>
          </div>
        </div>

        <!-- Conteúdo Interno da Proposta -->
        <div class="space-y-4 text-xs">
          <div>
            <span class="block text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide mb-1">Destinatário / Passageiro</span>
            <div class="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
              <strong class="text-sm text-slate-850 dark:text-slate-150 font-black block">${passageiro}</strong>
              <p class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Passageiro corporativo cadastrado no CRM PaxFlow</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="block text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide mb-1">Destino Turístico</span>
              <strong class="text-slate-850 dark:text-slate-200 font-black text-sm block">📍 ${destino}</strong>
            </div>
            <div>
              <span class="block text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide mb-1">Valor do Pacote (Sugerido)</span>
              <strong class="text-indigo-600 dark:text-indigo-400 font-black text-sm block">R$ ${valorFormatado}</strong>
            </div>
          </div>

          <div>
            <span class="block text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide mb-1.5">Itens Inclusos na Proposta</span>
            <div class="space-y-1.5">
              <div class="flex items-center justify-between p-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-500/15 rounded-lg text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
                <span>✈️ Vôo Regular (GRU-JFK) - Ida e Volta</span>
                <span>Incluso</span>
              </div>
              <div class="flex items-center justify-between p-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-500/15 rounded-lg text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
                <span>🏨 Hospedagem 4 Estrelas Central (5 Noites)</span>
                <span>Incluso</span>
              </div>
              <div class="flex items-center justify-between p-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-500/15 rounded-lg text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
                <span>🎟️ Passeio Premium Customizado e Seguro Viagem</span>
                <span>Incluso</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Rodapé do Simulador Sandbox -->
        <div class="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex items-center justify-between text-[8.5px] text-slate-400 dark:text-slate-500 font-semibold italic">
          <span>⚠️ Documento simulado com base no destino e passageiro.</span>
          <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider rounded border border-indigo-500/15">MODO SANDBOX</span>
        </div>
      </div>
    `;
  }

  /**
   * Prepara o arquivo de download para a simulação de Sandbox
   */
  private static setupMockDownload(fileName: string, type: 'passport' | 'proposal', c: any): void {
    const downloadBtn = document.getElementById('paxflow-doc-download-btn') as HTMLButtonElement;
    if (!downloadBtn) return;

    downloadBtn.disabled = false;
    downloadBtn.className = 'px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-250 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border border-slate-200 dark:border-slate-700/80 transition flex items-center gap-1.5 shadow-sm cursor-pointer';

    downloadBtn.addEventListener('click', () => {
      // Cria e baixa um arquivo de texto resumido da simulação
      const text = type === 'passport' 
        ? `SIMULAÇÃO DE PASSAPORTE PAXFLOW\n=================================\nNome: ${c.nome || 'N/D'}\nCPF: ${c.documento || 'N/D'}\nPassaporte: ${c.passaporteNumero || 'N/D'}\nValidade: ${c.passaporteValidade || 'N/D'}\n`
        : `SIMULAÇÃO DE PROPOSTA PAXFLOW\n===============================\nPassageiro: ${c.nome_cliente || c.nome || 'N/D'}\nDestino: ${c.destino || 'N/D'}\nValor: R$ ${Number(c.valor_total || 8500.00).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}
