import { StudioExtractionService, CATALOGO_CIAS_AEREAS } from '../services/studioExtractionService';
import { StudioPropostasService } from '../services/studioPropostasService';
import { StudioPdfGenerator } from '../components/studio/StudioPdfGenerator';
import { StudioProposta, StudioDiaItinerario, StudioItemItinerario } from '../types';

export class StudioPage {
  private container: HTMLElement;
  private propostaAtual: Partial<StudioProposta> = {
    cliente_nome: '',
    destino: '',
    valor_total: 0,
    moeda: 'BRL',
    status: 'RASCUNHO',
    itinerario_dias: []
  };
  private propostasSalvas: StudioProposta[] = [];
  private processandoArquivo: boolean = false;
  private modoPreview: 'desktop' | 'mobile' = 'desktop';
  private drawerAberto: boolean = false;
  private termoBuscaDrawer: string = '';
  private alteracoesNaoSalvas: boolean = false;
  private secaoIngestaoAberta: boolean = true;

  // Estado para o Modal Focado de Atividade/Item
  private itemEmEdicao: {
    diaIdx: number;
    itemIdx: number;
    isNovo: boolean;
    item: StudioItemItinerario;
  } | null = null;

  // Fotos de capa sugeridas com curadoria de luxo
  private static FOTOS_CAPA = [
    { nome: 'Paris', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80' },
    { nome: 'Roma', url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80' },
    { nome: 'Nova York', url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80' },
    { nome: 'Orlando / Disney', url: 'https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?auto=format&fit=crop&w=1200&q=80' },
    { nome: 'Maldivas', url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80' },
    { nome: 'Santiago / Chile', url: 'https://images.unsplash.com/photo-1578852612716-854e527abf2e?auto=format&fit=crop&w=1200&q=80' },
    { nome: 'Bariloche', url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80' },
    { nome: 'Fernando de Noronha', url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80' },
    { nome: 'Rio de Janeiro', url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&q=80' }
  ];

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupGlobalShortcuts();
  }

  public async init(propostaId?: string): Promise<void> {
    await this.carregarPropostas();

    if (propostaId) {
      const encontrada = await StudioPropostasService.buscarPorId(propostaId);
      if (encontrada) {
        this.propostaAtual = { ...encontrada };
        this.alteracoesNaoSalvas = false;
      }
    } else if (!this.propostaAtual.foto_capa_url) {
      this.propostaAtual.foto_capa_url = StudioPage.FOTOS_CAPA[0].url;
    }

    this.render();
  }

  private async carregarPropostas(): Promise<void> {
    try {
      this.propostasSalvas = await StudioPropostasService.listarPropostas();
    } catch (err) {
      console.warn('[StudioPage] Falha ao listar propostas:', err);
    }
  }

  private setupGlobalShortcuts(): void {
    // Atalho global Ctrl+S / Cmd+S para salvar no Studio
    window.addEventListener('keydown', async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        if (this.container && document.body.contains(this.container)) {
          e.preventDefault();
          await this.salvarPropostaAtual();
        }
      }
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="min-h-screen pb-28 space-y-5">
        <!-- BARRA SUPERIOR DO STUDIO -->
        <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">PaxFlow Studio™</h1>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-sm uppercase">
                Studio Pro
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Editor visual em tempo real para propostas de luxo e cadernos de viagem prontos para impressão.
            </p>
          </div>

          <!-- AÇÕES RÁPIDAS DO TOPO -->
          <div class="flex flex-wrap items-center gap-2">
            <button id="btn-abrir-drawer" type="button" class="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <span>📂</span> Minhas Propostas
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                ${this.propostasSalvas.length}
              </span>
            </button>
            <button id="btn-nova-proposta" type="button" class="px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer">
              <span>➕</span> Nova Proposta
            </button>
          </div>
        </header>

        <!-- BANNER DE STATUS QUANDO EDITANDO PROPOSTA EXISTENTE -->
        ${this.propostaAtual.id ? `
          <div class="bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">✏️</span>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-black text-indigo-950 dark:text-indigo-200 text-xs">Editando:</span>
                  <span class="font-black text-indigo-700 dark:text-indigo-400">${this.propostaAtual.cliente_nome || 'Cliente'}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200/70 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 uppercase">${this.propostaAtual.status || 'RASCUNHO'}</span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Destino: <strong>${this.propostaAtual.destino || 'A definir'}</strong></p>
              </div>
            </div>
            <button id="btn-limpar-para-novo" type="button" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
              + Criar nova em branco
            </button>
          </div>
        ` : ''}

        <!-- ÁREA PRINCIPAL SPLIT SCREEN (COLUNA ESQUERDA: EDITOR | COLUNA DIREITA: LIVE PREVIEW) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- COLUNA ESQUERDA: EDITOR E FORMULÁRIOS ESTRUTURADOS (6 COLS) -->
          <div class="lg:col-span-6 space-y-5">

            <!-- SEÇÃO 1: INGESTÃO DE DOCUMENTOS & TEXTO -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer" id="toggle-secao-ingestao">
                <div class="flex items-center gap-2">
                  <span class="text-base">📥</span>
                  <h2 class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    1. Ingestão de Documentos (PDF / Texto)
                  </h2>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Fidelidade Estrita
                  </span>
                </div>
                <button type="button" class="text-xs font-bold text-slate-400 hover:text-slate-600">
                  ${this.secaoIngestaoAberta ? '▲ Recolher' : '▼ Expandir'}
                </button>
              </div>

              <div id="corpo-secao-ingestao" class="p-5 space-y-3 ${this.secaoIngestaoAberta ? '' : 'hidden'}">
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Arraste arquivos PDF (LATAM, Gol, Azul, TAP, CVC, Coris...) ou cole confirmações do WhatsApp/e-mail para extração automática.
                </p>

                <div id="dropzone-pdf" class="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5">
                  <input type="file" id="input-files-pdf" multiple accept=".pdf,.txt" class="hidden" />
                  <span class="text-2xl">📁</span>
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Clique ou arraste seus PDFs aqui
                  </div>
                  <span class="text-[11px] text-slate-400">Suporta múltiplos vouchers e passagens aéreas</span>
                </div>

                <button id="btn-abrir-modal-colar" type="button" class="w-full px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer">
                  <span>📋</span> Colar Texto de Reserva / E-mail / WhatsApp
                </button>

                <!-- FEEDBACK DE PROCESSAMENTO -->
                <div id="status-processamento" class="mt-2 hidden">
                  <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                    <span class="animate-spin">🔄</span> Processando e estruturando itinerário...
                  </div>
                </div>

                <!-- ARQUIVOS PROCESSADOS -->
                ${this.propostaAtual.dados_extraidos?.arquivosProcessados && this.propostaAtual.dados_extraidos.arquivosProcessados.length > 0 ? `
                  <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arquivos Ingeridos:</span>
                    <div class="flex flex-wrap gap-1 mt-1">
                      ${this.propostaAtual.dados_extraidos.arquivosProcessados.map(a => `
                        <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          📄 ${a}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- SEÇÃO 2: DADOS DO PASSAGEIRO & FOTO DE CAPA -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h2 class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span>👤</span> 2. Dados do Passageiro &amp; Capa
                </h2>
                <span class="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">Live Sync Ativo</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="md:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Passageiro / Cliente *</label>
                  <input type="text" id="campo-cliente" value="${this.propostaAtual.cliente_nome || ''}" placeholder="Ex: Dra. Mariana Vasconcellos" class="input-sync w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 font-medium" />
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp</label>
                  <input type="text" id="campo-whatsapp" value="${this.propostaAtual.cliente_whatsapp || ''}" placeholder="(11) 99999-9999" class="input-sync w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                  <input type="email" id="campo-email" value="${this.propostaAtual.cliente_email || ''}" placeholder="cliente@email.com" class="input-sync w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div class="md:col-span-3">
                  <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Destino Principal da Viagem *</label>
                  <input type="text" id="campo-destino" value="${this.propostaAtual.destino || ''}" placeholder="Ex: Paris & Costa Amalfitana" class="input-sync w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 font-bold" />
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Embarque</label>
                  <input type="date" id="campo-data-ida" value="${this.propostaAtual.data_ida || ''}" class="input-sync w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Retorno</label>
                  <input type="date" id="campo-data-volta" value="${this.propostaAtual.data_volta || ''}" class="input-sync w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Total &amp; Moeda</label>
                  <div class="flex gap-1.5">
                    <select id="campo-moeda" class="input-sync w-20 px-2 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:border-indigo-500">
                      <option value="BRL" ${this.propostaAtual.moeda === 'BRL' ? 'selected' : ''}>BRL</option>
                      <option value="USD" ${this.propostaAtual.moeda === 'USD' ? 'selected' : ''}>USD</option>
                      <option value="EUR" ${this.propostaAtual.moeda === 'EUR' ? 'selected' : ''}>EUR</option>
                    </select>
                    <input type="number" step="0.01" id="campo-valor-total" value="${this.propostaAtual.valor_total || 0}" class="input-sync flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 font-bold" />
                  </div>
                </div>
              </div>

              <!-- FOTO DE CAPA -->
              <div>
                <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">Foto de Capa da Proposta</label>
                <div class="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                  ${StudioPage.FOTOS_CAPA.map(foto => `
                    <button type="button" class="btn-selecionar-capa shrink-0 w-20 h-12 rounded-lg overflow-hidden border-2 ${this.propostaAtual.foto_capa_url === foto.url ? 'border-indigo-600 ring-2 ring-indigo-500/30' : 'border-transparent opacity-75 hover:opacity-100'} transition relative cursor-pointer" data-url="${foto.url}">
                      <img src="${foto.url}" alt="${foto.nome}" class="w-full h-full object-cover" />
                      <span class="absolute inset-x-0 bottom-0 bg-black/60 text-[8px] text-white font-bold truncate px-1 text-center">${foto.nome}</span>
                    </button>
                  `).join('')}
                </div>
                <input type="text" id="campo-foto-custom" value="${this.propostaAtual.foto_capa_url || ''}" placeholder="Ou cole o link direto da imagem de capa..." class="input-sync w-full mt-2 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <!-- SEÇÃO 3: ROTEIRO & ATIVIDADES DIA A DIA -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📅</span> 3. Roteiro &amp; Itinerário
                  </h2>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Clique em qualquer atividade para editar com foco total.
                  </p>
                </div>
                <button id="btn-adicionar-dia" type="button" class="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition border border-indigo-200 dark:border-indigo-800 cursor-pointer flex items-center gap-1">
                  <span>➕</span> Adicionar Dia
                </button>
              </div>

              <!-- LISTA DE DIAS E CARDS COMPACTOS -->
              <div id="container-dias-editor" class="space-y-4">
                ${this.renderDiasEditor()}
              </div>
            </div>

          </div>

          <!-- COLUNA DIREITA: LIVE PREVIEW EM TEMPO REAL (6 COLS) -->
          <div class="lg:col-span-6 lg:sticky lg:top-4 space-y-3">
            
            <!-- CONTROLES DO LIVE PREVIEW -->
            <div class="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Live Preview
                </span>
                <span class="text-[10px] text-slate-400 font-semibold hidden sm:inline">
                  (O que você vê é o que o cliente recebe)
                </span>
              </div>

              <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button type="button" id="btn-preview-desktop" class="px-2.5 py-1 text-xs font-bold rounded-lg transition ${this.modoPreview === 'desktop' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">
                  🖥️ Desktop
                </button>
                <button type="button" id="btn-preview-mobile" class="px-2.5 py-1 text-xs font-bold rounded-lg transition ${this.modoPreview === 'mobile' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">
                  📱 Mobile
                </button>
              </div>
            </div>

            <!-- CONTAINER COM SCROLL INDEPENDENTE DA PRÉVIA VISUAL -->
            <div id="frame-live-preview" class="transition-all duration-300 ${this.modoPreview === 'mobile' ? 'max-w-sm mx-auto shadow-2xl rounded-3xl border-4 border-slate-800 dark:border-slate-700 p-1.5 bg-slate-900' : 'w-full'}">
              <div id="container-live-preview-content" class="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg max-h-[calc(100vh-210px)] overflow-y-auto custom-scrollbar">
                ${this.renderLivePreviewHtml()}
              </div>
            </div>

          </div>

        </div>

        <!-- BARRA INFERIOR FIXA DE SALVAMENTO & AÇÕES PRINCIPAIS -->
        <div class="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-3 px-6 shadow-2xl z-40 flex flex-wrap items-center justify-between gap-3">
          <!-- STATUS DO SALVAMENTO -->
          <div class="flex items-center gap-2.5">
            <div id="indicador-status-salvamento" class="flex items-center gap-2 text-xs font-bold">
              ${this.alteracoesNaoSalvas ? `
                <span class="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
                <span class="text-amber-700 dark:text-amber-400">Modificações pendentes de salvamento</span>
              ` : `
                <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span class="text-emerald-700 dark:text-emerald-400">Todas as alterações salvas no banco</span>
              `}
            </div>
          </div>

          <!-- BOTÕES DE AÇÃO -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-slate-400 font-mono hidden md:inline mr-1" title="Atalho de teclado">
              [Ctrl+S]
            </span>
            <button id="btn-salvar-proposta" type="button" class="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <span>💾</span> Salvar Proposta
            </button>
            <button id="btn-imprimir-pdf" type="button" class="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
              <span>📄</span> Caderno PDF
            </button>
            <button id="btn-link-publico" type="button" class="px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
              <span>🔗</span> Link do Cliente
            </button>
            ${this.propostaAtual.id ? `
              <button id="btn-efetivar-viagem" type="button" class="px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                <span>🚀</span> Efetivar Viagem
              </button>
            ` : ''}
          </div>
        </div>

        <!-- DRAWER LATERAL DE PROPOSTAS SALVAS NA AGÊNCIA -->
        <div id="drawer-propostas-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${this.drawerAberto ? 'opacity-100' : 'opacity-0 pointer-events-none'}">
          <div id="drawer-propostas-content" class="fixed inset-y-0 right-0 max-w-md w-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col justify-between transform transition-transform duration-300 ${this.drawerAberto ? 'translate-x-0' : 'translate-x-full'}">
            
            <div class="space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div class="flex items-center gap-2">
                  <span class="text-lg">📂</span>
                  <h3 class="text-sm font-black text-slate-900 dark:text-white">
                    Minhas Propostas Salvas
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    ${this.propostasSalvas.length}
                  </span>
                </div>
                <button id="btn-fechar-drawer" type="button" class="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer">✕</button>
              </div>

              <!-- CAMPO DE BUSCA RÁPIDA -->
              <div>
                <input type="text" id="busca-drawer" value="${this.termoBuscaDrawer}" placeholder="Buscar por cliente ou destino..." class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
              </div>

              <!-- LISTA DE CARDS DE PROPOSTAS -->
              <div id="lista-propostas-drawer" class="space-y-2.5 max-h-[calc(100vh-210px)] overflow-y-auto custom-scrollbar pr-1">
                ${this.renderListaPropostasDrawer()}
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button id="btn-fechar-drawer-rodape" type="button" class="w-full py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer">
                Fechar Painel
              </button>
            </div>

          </div>
        </div>

        <!-- MODAL FOCADO DE EDIÇÃO / ADIÇÃO DE ATIVIDADE DO ROTEIRO -->
        <div id="modal-edicao-item" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 ${this.itemEmEdicao ? '' : 'hidden'}">
          ${this.itemEmEdicao ? this.renderModalEdicaoItem() : ''}
        </div>

        <!-- MODAL PARA COLAR TEXTO DA RESERVA -->
        <div id="modal-colar-texto" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📋</span> Colar Texto de Reserva / Voo / Hotel
              </h3>
              <button id="btn-fechar-modal-colar" class="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">✕</button>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Cole aqui confirmação de bilhete, mensagem de WhatsApp ou e-mail. Extraímos companhias, voos e vouchers automaticamente.
            </p>
            <textarea id="textarea-texto-colado" rows="8" placeholder="Ex: Bilhete Eletrônico LATAM Airlines, Voo LA3421, GRU para MIA, Localizador: LAX99Z..." class="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500"></textarea>
            <div class="flex justify-end gap-2">
              <button id="btn-cancelar-colar" type="button" class="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer">
                Cancelar
              </button>
              <button id="btn-confirmar-colar" type="button" class="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                <span>⚡</span> Extrair Informações
              </button>
            </div>
          </div>
        </div>

        <!-- DATALIST COM COMPANHIAS AÉREAS OFICIAIS -->
        <datalist id="lista-cias-aereas">
          ${CATALOGO_CIAS_AEREAS.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('')}
          <option value="GOL Linhas Aéreas">G3 - GOL</option>
          <option value="LATAM Airlines">LA - LATAM</option>
          <option value="Azul Linhas Aéreas">AD - Azul</option>
          <option value="TAP Air Portugal">TP - TAP</option>
          <option value="Air France">AF - Air France</option>
          <option value="KLM">KL - KLM</option>
          <option value="Emirates">EK - Emirates</option>
          <option value="Qatar Airways">QR - Qatar Airways</option>
          <option value="American Airlines">AA - American Airlines</option>
          <option value="Delta Air Lines">DL - Delta</option>
          <option value="United Airlines">UA - United</option>
          <option value="Turkish Airlines">TK - Turkish</option>
        </datalist>

      </div>
    `;

    this.setupListeners();
  }

  // ==========================================================================
  // RENDERIZADORES DE DIAS E CARDS DO EDITOR
  // ==========================================================================

  private renderDiasEditor(): string {
    const dias = this.propostaAtual.itinerario_dias || [];
    if (dias.length === 0) {
      return `
        <div class="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-xs text-slate-400 space-y-2">
          <span class="text-3xl block">🗺️</span>
          <p class="font-bold text-slate-600 dark:text-slate-300">Nenhum dia cadastrado ainda no roteiro.</p>
          <p class="text-[11px]">Arraste PDFs no topo ou clique em <strong>+ Adicionar Dia</strong> para começar a montar.</p>
        </div>
      `;
    }

    return dias.map((dia, dIdx) => `
      <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3" data-dia-idx="${dIdx}">
        <!-- CABEÇALHO DO DIA -->
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2 flex-1 min-w-[200px]">
            <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-600 text-white shrink-0">
              DIA ${dia.diaNumero}
            </span>
            <input type="text" class="input-titulo-dia text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-100 flex-1 focus:outline-none focus:border-indigo-500" value="${dia.tituloDia || `Dia ${dia.diaNumero}`}" data-dia-idx="${dIdx}" placeholder="Título do Dia" />
            <input type="date" class="input-data-dia text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500 shrink-0" value="${dia.dataStr || dia.data || ''}" data-dia-idx="${dIdx}" />
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" class="btn-abrir-add-item px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition cursor-pointer" data-dia-idx="${dIdx}">
              + Atividade
            </button>
            <button type="button" class="btn-remover-dia text-slate-400 hover:text-rose-500 p-1 text-xs cursor-pointer" data-dia-idx="${dIdx}" title="Excluir este dia">
              🗑️
            </button>
          </div>
        </div>

        <!-- LISTA COMPACTA DE ATIVIDADES DO DIA -->
        <div class="space-y-2 pl-2 border-l-2 border-indigo-200 dark:border-indigo-900/80">
          ${dia.itens.length === 0 ? `
            <div class="text-[11px] text-slate-400 italic py-1">Nenhuma atividade neste dia. Clique em "+ Atividade".</div>
          ` : dia.itens.map((item, iIdx) => this.renderCardCompactoItem(item, dIdx, iIdx)).join('')}
        </div>
      </div>
    `).join('');
  }

  private renderCardCompactoItem(item: StudioItemItinerario, dIdx: number, iIdx: number): string {
    const badgeTipo = (tipo: string) => {
      switch (tipo) {
        case 'voo':
          return `<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">Voo</span>`;
        case 'hotel':
          return `<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">Hotel</span>`;
        case 'transfer':
          return `<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">Transfer</span>`;
        case 'seguro':
          return `<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 uppercase">Seguro</span>`;
        default:
          return `<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 uppercase">Passeio</span>`;
      }
    };

    return `
      <div class="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-600 transition group cursor-pointer btn-abrir-editar-item" data-dia-idx="${dIdx}" data-item-idx="${iIdx}">
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <span class="text-base shrink-0">${this.obterIconeTipo(item.tipo)}</span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${badgeTipo(item.tipo)}
              ${item.companhia ? `
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  ${item.companhia}
                </span>
              ` : ''}
              ${item.localizador ? `
                <span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  LOC: ${item.localizador}
                </span>
              ` : ''}
              ${item.horario || item.horaInicio ? `
                <span class="text-[10px] text-slate-400 font-semibold">
                  ⏰ ${item.horario || item.horaInicio}
                </span>
              ` : ''}
            </div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
              ${item.titulo || 'Item sem título'}
            </div>
            ${item.subtitulo ? `
              <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                ${item.subtitulo}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-lg">
            ✏️ Editar
          </span>
          <button type="button" class="btn-excluir-item text-slate-400 hover:text-rose-500 p-1 text-xs cursor-pointer" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" title="Excluir">
            ✕
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // RENDERIZADOR DO LIVE PREVIEW EM TEMPO REAL (PROPOSTA DE LUXO)
  // ==========================================================================

  private renderLivePreviewHtml(): string {
    const moeda = this.propostaAtual.moeda || 'BRL';
    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(this.propostaAtual.valor_total || 0);
    const capaUrl = this.propostaAtual.foto_capa_url || StudioPage.FOTOS_CAPA[0].url;
    const dias = this.propostaAtual.itinerario_dias || [];

    const formatarData = (dStr?: string) => {
      if (!dStr) return '';
      try {
        const [ano, mes, dia] = dStr.split('-');
        if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
        return dStr;
      } catch {
        return dStr;
      }
    };

    return `
      <div class="proposta-preview-document text-slate-900 dark:text-slate-100 font-sans">
        
        <!-- CAPA CINEMATOGRÁFICA DE LUXO -->
        <div class="relative h-64 sm:h-72 w-full overflow-hidden flex flex-col justify-between p-6 bg-slate-900">
          <img src="${capaUrl}" alt="${this.propostaAtual.destino || 'Destino'}" class="absolute inset-0 w-full h-full object-cover opacity-60" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/60"></div>

          <!-- TOPO DA CAPA -->
          <div class="relative z-10 flex items-center justify-between">
            <span class="px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest bg-white/20 backdrop-blur-md text-white uppercase border border-white/30">
              PAXFLOW LUXURY TRAVEL
            </span>
            <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/90 text-slate-950 uppercase font-mono">
              ${this.propostaAtual.status || 'RASCUNHO EXCLUSIVO'}
            </span>
          </div>

          <!-- CENTRO / TÍTULOS DA CAPA -->
          <div class="relative z-10 space-y-1">
            <div class="text-[10px] font-black tracking-widest uppercase text-indigo-300">
              PROPOSTA DE VIAGEM PERSONALIZADA
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none drop-shadow-md">
              ${this.propostaAtual.destino || 'Destino a Definir'}
            </h1>
            <p class="text-xs text-slate-200 font-medium">
              Preparado especialmente para <strong class="text-white font-bold">${this.propostaAtual.cliente_nome || 'Passageiro Ilustre'}</strong>
            </p>
          </div>

          <!-- RODAPÉ DA CAPA COM DATAS E COTAÇÃO -->
          <div class="relative z-10 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-slate-300">
            <div>
              ${this.propostaAtual.data_ida ? `
                <span>📅 ${formatarData(this.propostaAtual.data_ida)} ${this.propostaAtual.data_volta ? `➔ ${formatarData(this.propostaAtual.data_volta)}` : ''}</span>
              ` : '<span>Datas sob consulta</span>'}
            </div>
            <div class="font-black text-white text-sm">
              ${valorFormatado}
            </div>
          </div>
        </div>

        <!-- CONTEÚDO PRINCIPAL DO ROTEIRO NO PREVIEW -->
        <div class="p-6 space-y-6">

          <!-- BANNER RESUMO FINANCEIRO -->
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Total do Pacote</span>
              <div class="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-tight">
                ${valorFormatado}
              </div>
            </div>
            <div class="text-right text-xs text-slate-500">
              <div>Passageiro: <strong>${this.propostaAtual.cliente_nome || 'A definir'}</strong></div>
              <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Vouchers &amp; Fidelidade Verificados</div>
            </div>
          </div>

          <!-- CRONOGRAMA DIA A DIA -->
          <div class="space-y-6">
            <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span class="text-base">🧭</span>
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Itinerário Detalhado
              </h3>
            </div>

            ${dias.length === 0 ? `
              <div class="text-center py-6 text-xs text-slate-400">
                O itinerário aparecerá aqui assim que você adicionar os dias ou enviar os PDFs.
              </div>
            ` : dias.map(dia => `
              <div class="space-y-3">
                <!-- MARCADOR DO DIA -->
                <div class="flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    ${dia.diaNumero}
                  </span>
                  <div>
                    <h4 class="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      ${dia.tituloDia || `Dia ${dia.diaNumero}`}
                    </h4>
                    ${dia.dataStr || dia.data ? `
                      <span class="text-[10px] text-slate-400 font-medium">${formatarData(dia.dataStr || dia.data)}</span>
                    ` : ''}
                  </div>
                </div>

                <!-- CARDS ESTILIZADOS DAS ATIVIDADES DO DIA -->
                <div class="pl-4 ml-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-2.5">
                  ${dia.itens.map(item => this.renderCardPreviewItem(item)).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- RODAPÉ DA PROPOSTA NO PREVIEW -->
          <div class="pt-6 border-t border-slate-200 dark:border-slate-800 text-center space-y-1 text-slate-400 text-[10px]">
            <p class="font-bold text-slate-600 dark:text-slate-300">PaxFlow Luxury Travel • Sua Viagem Perfeita</p>
            <p>Proposta gerada com fidelidade estrita às reservas dos fornecedores.</p>
          </div>

        </div>

      </div>
    `;
  }

  private renderCardPreviewItem(item: StudioItemItinerario): string {
    if (item.tipo === 'voo') {
      return `
        <div class="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 text-xs space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="text-sm">✈️</span>
              <span class="font-bold text-blue-900 dark:text-blue-200">${item.companhia || 'Companhia Aérea'}</span>
              ${item.numeroVoo ? `<span class="font-mono text-[11px] text-blue-700 dark:text-blue-300">${item.numeroVoo}</span>` : ''}
            </div>
            ${item.localizador ? `
              <span class="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-blue-200/70 dark:bg-blue-900 text-blue-900 dark:text-blue-200">
                LOC: ${item.localizador}
              </span>
            ` : ''}
          </div>

          ${item.origem || item.destino ? `
            <div class="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg">
              <div>${item.origem || 'Origem'} ${item.horaInicio ? `(${item.horaInicio})` : ''}</div>
              <span class="text-indigo-600 dark:text-indigo-400">➔</span>
              <div>${item.destino || 'Destino'} ${item.horaFim ? `(${item.horaFim})` : ''}</div>
            </div>
          ` : ''}

          ${item.subtitulo ? `
            <p class="text-[11px] text-slate-600 dark:text-slate-400">${item.subtitulo}</p>
          ` : ''}
        </div>
      `;
    }

    if (item.tipo === 'hotel') {
      return `
        <div class="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="text-sm">🏨</span>
              <span class="font-bold text-emerald-900 dark:text-emerald-200">${item.titulo || 'Hospedagem'}</span>
            </div>
            ${item.localizador ? `
              <span class="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-emerald-200/70 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                VOUCHER: ${item.localizador}
              </span>
            ` : ''}
          </div>

          ${item.quarto || item.regime ? `
            <div class="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              ${[item.quarto, item.regime].filter(Boolean).join(' • ')}
            </div>
          ` : ''}

          ${item.subtitulo ? `
            <p class="text-[11px] text-slate-600 dark:text-slate-400">${item.subtitulo}</p>
          ` : ''}

          ${item.linkMaps ? `
            <a href="${item.linkMaps}" target="_blank" rel="noopener noreferrer" class="inline-block text-[10px] font-bold text-indigo-600 hover:underline mt-1">
              📍 Ver localização no mapa ➔
            </a>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-sm">${this.obterIconeTipo(item.tipo)}</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">${item.titulo || 'Atividade'}</span>
          </div>
          ${item.localizador ? `
            <span class="px-1.5 py-0.5 rounded font-mono text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              ${item.localizador}
            </span>
          ` : ''}
        </div>

        ${item.horario || item.horaInicio ? `
          <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
            ⏰ ${item.horario || item.horaInicio}
          </div>
        ` : ''}

        ${item.subtitulo ? `
          <p class="text-[11px] text-slate-600 dark:text-slate-400">${item.subtitulo}</p>
        ` : ''}
      </div>
    `;
  }

  // ==========================================================================
  // MODAL FOCADO DE EDIÇÃO DE ITEM DO ROTEIRO
  // ==========================================================================

  private renderModalEdicaoItem(): string {
    if (!this.itemEmEdicao) return '';
    const { item, isNovo } = this.itemEmEdicao;

    return `
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-lg">✏️</span>
            <h3 class="text-sm font-black text-slate-900 dark:text-white">
              ${isNovo ? 'Adicionar Atividade ao Roteiro' : 'Editar Detalhes da Atividade'}
            </h3>
          </div>
          <button id="btn-fechar-modal-item" type="button" class="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">✕</button>
        </div>

        <!-- SELETOR DE TIPO COM BOTÕES VISUAIS -->
        <div>
          <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">Tipo de Atividade / Serviço</label>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            ${[
              { tipo: 'voo', label: 'Voo', icone: '✈️' },
              { tipo: 'hotel', label: 'Hotel', icone: '🏨' },
              { tipo: 'transfer', label: 'Transfer', icone: '🚐' },
              { tipo: 'passeio', label: 'Passeio', icone: '🗺️' },
              { tipo: 'seguro', label: 'Seguro', icone: '🛡️' },
              { tipo: 'nota', label: 'Dica', icone: '📌' }
            ].map(t => `
              <button type="button" class="btn-trocar-tipo-modal py-2 px-1 rounded-xl text-center border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${item.tipo === t.tipo ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}" data-tipo="${t.tipo}">
                <span class="text-base">${t.icone}</span>
                <span class="text-[10px]">${t.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- CAMPOS CONDICIONAIS PELO TIPO -->
        <div class="space-y-3">
          ${item.tipo === 'voo' ? `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Companhia Aérea</label>
                <input type="text" id="modal-campo-cia" list="lista-cias-aereas" value="${item.companhia || ''}" placeholder="Ex: LATAM" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-indigo-600" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Número do Voo</label>
                <input type="text" id="modal-campo-voo" value="${item.numeroVoo || ''}" placeholder="LA 3421" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Localizador (PNR)</label>
                <input type="text" id="modal-campo-loc" value="${item.localizador || ''}" placeholder="LAX99Z" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Origem (IATA)</label>
                <input type="text" id="modal-campo-origem" value="${item.origem || ''}" placeholder="GRU" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Destino (IATA)</label>
                <input type="text" id="modal-campo-destino" value="${item.destino || ''}" placeholder="MIA" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Embarque</label>
                <input type="text" id="modal-campo-hora-inicio" value="${item.horaInicio || item.horario || ''}" placeholder="22:15" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Chegada</label>
                <input type="text" id="modal-campo-hora-fim" value="${item.horaFim || ''}" placeholder="06:30" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </div>
            </div>
          ` : item.tipo === 'hotel' ? `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div class="sm:col-span-2">
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Nome do Hotel / Pousada *</label>
                <input type="text" id="modal-campo-hotel-nome" value="${item.titulo || ''}" placeholder="Ex: Hotel Fasano Rio de Janeiro" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Voucher / Confirmação</label>
                <input type="text" id="modal-campo-loc" value="${item.localizador || ''}" placeholder="BK-88412" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Quarto / Acomodação</label>
                <input type="text" id="modal-campo-quarto" value="${item.quarto || ''}" placeholder="Ex: Suíte Deluxe Vista Mar" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Regime de Alimentação</label>
                <input type="text" id="modal-campo-regime" value="${item.regime || ''}" placeholder="Ex: Café da Manhã Incluso" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Link Google Maps</label>
                <input type="text" id="modal-campo-maps" value="${item.linkMaps || item.endereco || ''}" placeholder="https://maps.google.com/..." class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </div>
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div class="sm:col-span-2">
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Nome do Serviço / Passeio *</label>
                <input type="text" id="modal-campo-generico-nome" value="${item.titulo || ''}" placeholder="Ex: Transfer Receptivo Privativo" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Fornecedor / Operadora</label>
                <input type="text" id="modal-campo-fornecedor" value="${item.fornecedor || ''}" placeholder="Ex: Coris, Trend..." class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Voucher / Apólice</label>
                <input type="text" id="modal-campo-loc" value="${item.localizador || ''}" placeholder="AP-99412" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Horário Programado</label>
                <input type="text" id="modal-campo-hora-inicio" value="${item.horario || item.horaInicio || ''}" placeholder="Ex: 09:30" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </div>
            </div>
          `}

          <!-- CAMPOS GERAIS DE TÍTULO E SUBTÍTULO VISÍVEIS NA PROPOSTA -->
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Título no PDF / Live Preview</label>
              <input type="text" id="modal-campo-titulo-final" value="${item.titulo || ''}" placeholder="Título exibido na proposta" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Subtítulo / Instruções ao Passageiro</label>
              <input type="text" id="modal-campo-subtitulo" value="${item.subtitulo || ''}" placeholder="Ex: Apresentar voucher impresso na recepção" class="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300" />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button id="btn-cancelar-modal-item" type="button" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer">
            Cancelar
          </button>
          <button id="btn-salvar-modal-item" type="button" class="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer">
            <span>✅</span> Aplicar ao Roteiro
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // RENDERIZADOR DO DRAWER DE PROPOSTAS SALVAS
  // ==========================================================================

  private renderListaPropostasDrawer(): string {
    const termo = this.termoBuscaDrawer.toLowerCase().trim();
    const filtradas = this.propostasSalvas.filter(p => {
      if (!termo) return true;
      return (
        (p.cliente_nome && p.cliente_nome.toLowerCase().includes(termo)) ||
        (p.destino && p.destino.toLowerCase().includes(termo)) ||
        (p.status && p.status.toLowerCase().includes(termo))
      );
    });

    if (filtradas.length === 0) {
      return `
        <div class="text-center py-8 text-xs text-slate-400">
          Nenhuma proposta encontrada.
        </div>
      `;
    }

    const badgeStatus = (status: string) => {
      switch (status) {
        case 'APROVADO':
          return `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Aprovado</span>`;
        case 'EFETIVADO':
          return `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Efetivado</span>`;
        case 'ENVIADO':
          return `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Enviado</span>`;
        default:
          return `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Rascunho</span>`;
      }
    };

    return filtradas.map(p => `
      <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-500 transition space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-bold text-xs text-slate-800 dark:text-slate-100">${p.cliente_nome || 'Cliente sem nome'}</div>
            <div class="text-[11px] text-slate-500">${p.destino || 'Destino a definir'}</div>
          </div>
          ${badgeStatus(p.status)}
        </div>

        <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
          <span class="font-bold text-indigo-600 dark:text-indigo-400">
            ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: p.moeda || 'BRL' }).format(p.valor_total || 0)}
          </span>
          <div class="flex items-center gap-1.5">
            <button type="button" class="btn-drawer-carregar px-2 py-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition cursor-pointer" data-id="${p.id}">
              ✏️ Carregar
            </button>
            <button type="button" class="btn-drawer-pdf px-2 py-1 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 transition cursor-pointer" data-id="${p.id}">
              📄 PDF
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  private obterIconeTipo(tipo: string): string {
    switch (tipo) {
      case 'voo': return '✈️';
      case 'hotel': return '🏨';
      case 'passeio': return '🗺️';
      case 'seguro': return '🛡️';
      case 'transfer': return '🚐';
      default: return '📌';
    }
  }

  // ==========================================================================
  // ATUALIZAÇÃO REATIVA DO LIVE PREVIEW (SEM RECARREGAR A PÁGINA)
  // ==========================================================================

  private atualizarLivePreview(): void {
    const el = this.container.querySelector('#container-live-preview-content');
    if (el) {
      el.innerHTML = this.renderLivePreviewHtml();
    }
  }

  private marcarAlteracaoPendente(): void {
    this.alteracoesNaoSalvas = true;
    const statusEl = this.container.querySelector('#indicador-status-salvamento');
    if (statusEl) {
      statusEl.innerHTML = `
        <span class="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
        <span class="text-amber-700 dark:text-amber-400">Modificações pendentes de salvamento</span>
      `;
    }
  }

  // ==========================================================================
  // LISTENERS E EVENTOS
  // ==========================================================================

  private setupListeners(): void {
    // 1. Alternador da Seção de Ingestão (Accordion)
    const toggleIngestao = this.container.querySelector('#toggle-secao-ingestao');
    const corpoIngestao = this.container.querySelector('#corpo-secao-ingestao');
    toggleIngestao?.addEventListener('click', () => {
      this.secaoIngestaoAberta = !this.secaoIngestaoAberta;
      if (corpoIngestao) {
        corpoIngestao.classList.toggle('hidden', !this.secaoIngestaoAberta);
      }
      const btnTxt = toggleIngestao.querySelector('button');
      if (btnTxt) {
        btnTxt.textContent = this.secaoIngestaoAberta ? '▲ Recolher' : '▼ Expandir';
      }
    });

    // 2. Dropzone de arquivos PDF
    const dropzone = this.container.querySelector('#dropzone-pdf');
    const inputFiles = this.container.querySelector('#input-files-pdf') as HTMLInputElement;

    dropzone?.addEventListener('click', () => inputFiles?.click());

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-indigo-600', 'bg-indigo-100/50');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-indigo-600', 'bg-indigo-100/50');
    });

    dropzone?.addEventListener('drop', async (e: any) => {
      e.preventDefault();
      dropzone.classList.remove('border-indigo-600', 'bg-indigo-100/50');
      if (e.dataTransfer?.files?.length) {
        await this.processarArquivos(Array.from(e.dataTransfer.files));
      }
    });

    inputFiles?.addEventListener('change', async () => {
      if (inputFiles.files?.length) {
        await this.processarArquivos(Array.from(inputFiles.files));
      }
    });

    // 3. Modal de Colar Texto de Reserva
    const modalColar = this.container.querySelector('#modal-colar-texto');
    const btnAbrirColar = this.container.querySelector('#btn-abrir-modal-colar');
    const btnFecharColar = this.container.querySelector('#btn-fechar-modal-colar');
    const btnCancelarColar = this.container.querySelector('#btn-cancelar-colar');
    const btnConfirmarColar = this.container.querySelector('#btn-confirmar-colar');
    const textareaColar = this.container.querySelector('#textarea-texto-colado') as HTMLTextAreaElement;

    btnAbrirColar?.addEventListener('click', () => {
      modalColar?.classList.remove('hidden');
      if (textareaColar) {
        textareaColar.value = '';
        textareaColar.focus();
      }
    });

    const fecharModalColar = () => modalColar?.classList.add('hidden');
    btnFecharColar?.addEventListener('click', fecharModalColar);
    btnCancelarColar?.addEventListener('click', fecharModalColar);

    btnConfirmarColar?.addEventListener('click', async () => {
      const texto = textareaColar?.value.trim();
      if (!texto) {
        alert('Por favor, cole o texto do bilhete ou reserva.');
        return;
      }
      fecharModalColar();
      await this.processarTextoColado(texto);
    });

    // 4. Seletor de fotos de capa
    this.container.querySelectorAll('.btn-selecionar-capa').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (url) {
          this.propostaAtual.foto_capa_url = url;
          const inputCustom = this.container.querySelector('#campo-foto-custom') as HTMLInputElement;
          if (inputCustom) inputCustom.value = url;
          this.container.querySelectorAll('.btn-selecionar-capa').forEach(b => b.classList.remove('border-indigo-600', 'ring-2', 'ring-indigo-500/30'));
          btn.classList.add('border-indigo-600', 'ring-2', 'ring-indigo-500/30');
          this.marcarAlteracaoPendente();
          this.atualizarLivePreview();
        }
      });
    });

    // 5. Sincronização em tempo real dos dados gerais (Passageiro, Destino, Datas, Valores)
    this.container.querySelectorAll('.input-sync').forEach(el => {
      el.addEventListener('input', () => {
        this.capturarDadosGeraisDoFormulario();
        this.marcarAlteracaoPendente();
        this.atualizarLivePreview();
      });
    });

    // 6. Controles do Live Preview (Desktop vs Mobile)
    const btnDesktop = this.container.querySelector('#btn-preview-desktop');
    const btnMobile = this.container.querySelector('#btn-preview-mobile');
    const framePreview = this.container.querySelector('#frame-live-preview');

    btnDesktop?.addEventListener('click', () => {
      this.modoPreview = 'desktop';
      btnDesktop.classList.add('bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-white', 'shadow-xs');
      btnDesktop.classList.remove('text-slate-500');
      btnMobile?.classList.remove('bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-white', 'shadow-xs');
      btnMobile?.classList.add('text-slate-500');

      if (framePreview) {
        framePreview.className = 'w-full transition-all duration-300';
      }
    });

    btnMobile?.addEventListener('click', () => {
      this.modoPreview = 'mobile';
      btnMobile.classList.add('bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-white', 'shadow-xs');
      btnMobile.classList.remove('text-slate-500');
      btnDesktop?.classList.remove('bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-white', 'shadow-xs');
      btnDesktop?.classList.add('text-slate-500');

      if (framePreview) {
        framePreview.className = 'max-w-sm mx-auto shadow-2xl rounded-3xl border-4 border-slate-800 dark:border-slate-700 p-1.5 bg-slate-900 transition-all duration-300';
      }
    });

    // 7. Ações no Roteiro: Título e data do dia
    this.container.querySelectorAll('.input-titulo-dia').forEach(el => {
      el.addEventListener('input', (e: any) => {
        const dIdx = parseInt(el.getAttribute('data-dia-idx') || '0', 10);
        if (this.propostaAtual.itinerario_dias?.[dIdx]) {
          this.propostaAtual.itinerario_dias[dIdx].tituloDia = e.target.value;
          this.marcarAlteracaoPendente();
          this.atualizarLivePreview();
        }
      });
    });

    this.container.querySelectorAll('.input-data-dia').forEach(el => {
      el.addEventListener('change', (e: any) => {
        const dIdx = parseInt(el.getAttribute('data-dia-idx') || '0', 10);
        if (this.propostaAtual.itinerario_dias?.[dIdx]) {
          this.propostaAtual.itinerario_dias[dIdx].dataStr = e.target.value;
          this.propostaAtual.itinerario_dias[dIdx].data = e.target.value;
          this.marcarAlteracaoPendente();
          this.atualizarLivePreview();
        }
      });
    });

    // 8. Botão Adicionar Dia
    this.container.querySelector('#btn-adicionar-dia')?.addEventListener('click', () => {
      this.capturarDadosGeraisDoFormulario();
      if (!this.propostaAtual.itinerario_dias) this.propostaAtual.itinerario_dias = [];
      const novoNum = this.propostaAtual.itinerario_dias.length + 1;
      this.propostaAtual.itinerario_dias.push({
        diaNumero: novoNum,
        dataStr: new Date().toISOString().split('T')[0],
        tituloDia: `Dia ${novoNum}: Atividades Livres`,
        itens: []
      });
      this.marcarAlteracaoPendente();
      this.render();
    });

    // 9. Botão Remover Dia
    this.container.querySelectorAll('.btn-remover-dia').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dIdx = parseInt(btn.getAttribute('data-dia-idx') || '0', 10);
        if (this.propostaAtual.itinerario_dias && confirm(`Deseja excluir o Dia ${dIdx + 1} e todos os seus itens?`)) {
          this.capturarDadosGeraisDoFormulario();
          this.propostaAtual.itinerario_dias.splice(dIdx, 1);
          this.propostaAtual.itinerario_dias.forEach((d, idx) => d.diaNumero = idx + 1);
          this.marcarAlteracaoPendente();
          this.render();
        }
      });
    });

    // 10. Abrir Modal de Edição para Item Existente
    this.container.querySelectorAll('.btn-abrir-editar-item').forEach(card => {
      card.addEventListener('click', (e: any) => {
        if (e.target.closest('.btn-excluir-item')) return;
        const dIdx = parseInt(card.getAttribute('data-dia-idx') || '0', 10);
        const iIdx = parseInt(card.getAttribute('data-item-idx') || '0', 10);
        const item = this.propostaAtual.itinerario_dias?.[dIdx]?.itens?.[iIdx];
        if (item) {
          this.abrirModalItem(dIdx, iIdx, JSON.parse(JSON.stringify(item)), false);
        }
      });
    });

    // 11. Abrir Modal para Adicionar Novo Item em um Dia
    this.container.querySelectorAll('.btn-abrir-add-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const dIdx = parseInt(btn.getAttribute('data-dia-idx') || '0', 10);
        const novoItem: StudioItemItinerario = {
          id: `item-${Date.now()}`,
          tipo: 'voo',
          titulo: 'Novo Voo',
          subtitulo: 'Horário a definir'
        };
        const iIdx = this.propostaAtual.itinerario_dias?.[dIdx]?.itens?.length || 0;
        this.abrirModalItem(dIdx, iIdx, novoItem, true);
      });
    });

    // 12. Excluir Item do Roteiro
    this.container.querySelectorAll('.btn-excluir-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dIdx = parseInt(btn.getAttribute('data-dia-idx') || '0', 10);
        const iIdx = parseInt(btn.getAttribute('data-item-idx') || '0', 10);
        if (this.propostaAtual.itinerario_dias?.[dIdx]?.itens) {
          this.capturarDadosGeraisDoFormulario();
          this.propostaAtual.itinerario_dias[dIdx].itens.splice(iIdx, 1);
          this.marcarAlteracaoPendente();
          this.render();
        }
      });
    });

    // 13. Drawer de Propostas Salvas
    const btnAbrirDrawer = this.container.querySelector('#btn-abrir-drawer');
    const btnFecharDrawer = this.container.querySelector('#btn-fechar-drawer');
    const btnFecharDrawerRodape = this.container.querySelector('#btn-fechar-drawer-rodape');
    const drawerBackdrop = this.container.querySelector('#drawer-propostas-backdrop');
    const drawerContent = this.container.querySelector('#drawer-propostas-content');
    const buscaDrawer = this.container.querySelector('#busca-drawer') as HTMLInputElement;

    const abrirDrawer = () => {
      this.drawerAberto = true;
      drawerBackdrop?.classList.remove('opacity-0', 'pointer-events-none');
      drawerBackdrop?.classList.add('opacity-100');
      drawerContent?.classList.remove('translate-x-full');
      drawerContent?.classList.add('translate-x-0');
      buscaDrawer?.focus();
    };

    const fecharDrawer = () => {
      this.drawerAberto = false;
      drawerBackdrop?.classList.remove('opacity-100');
      drawerBackdrop?.classList.add('opacity-0', 'pointer-events-none');
      drawerContent?.classList.remove('translate-x-0');
      drawerContent?.classList.add('translate-x-full');
    };

    btnAbrirDrawer?.addEventListener('click', abrirDrawer);
    btnFecharDrawer?.addEventListener('click', fecharDrawer);
    btnFecharDrawerRodape?.addEventListener('click', fecharDrawer);
    drawerBackdrop?.addEventListener('click', (e) => {
      if (e.target === drawerBackdrop) fecharDrawer();
    });

    buscaDrawer?.addEventListener('input', (e: any) => {
      this.termoBuscaDrawer = e.target.value;
      const listaEl = this.container.querySelector('#lista-propostas-drawer');
      if (listaEl) {
        listaEl.innerHTML = this.renderListaPropostasDrawer();
        this.setupDrawerItemListeners(fecharDrawer);
      }
    });

    this.setupDrawerItemListeners(fecharDrawer);

    // 14. Botão Nova Proposta no Topo
    const resetarNovaProposta = () => {
      this.propostaAtual = {
        cliente_nome: '',
        destino: '',
        valor_total: 0,
        moeda: 'BRL',
        status: 'RASCUNHO',
        foto_capa_url: StudioPage.FOTOS_CAPA[0].url,
        itinerario_dias: []
      };
      this.alteracoesNaoSalvas = false;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.showToast('Novo rascunho de proposta iniciado.', 'success');
    };

    this.container.querySelector('#btn-nova-proposta')?.addEventListener('click', resetarNovaProposta);
    this.container.querySelector('#btn-limpar-para-novo')?.addEventListener('click', resetarNovaProposta);

    // 15. Salvar Proposta (Barra Inferior)
    this.container.querySelector('#btn-salvar-proposta')?.addEventListener('click', async () => {
      await this.salvarPropostaAtual();
    });

    // 16. Imprimir PDF (Barra Inferior)
    this.container.querySelector('#btn-imprimir-pdf')?.addEventListener('click', () => {
      this.capturarDadosGeraisDoFormulario();
      StudioPdfGenerator.imprimirOuSalvarPdf(this.propostaAtual as StudioProposta);
    });

    // 17. Link do Cliente (Barra Inferior)
    this.container.querySelector('#btn-link-publico')?.addEventListener('click', async () => {
      await this.salvarPropostaAtual();
      if (this.propostaAtual.id) {
        const url = `${window.location.origin}${window.location.pathname}#proposta?id=${this.propostaAtual.id}`;
        navigator.clipboard.writeText(url);
        this.showToast('Link público copiado para a área de transferência!', 'success');
      }
    });

    // 18. Efetivar Viagem (Barra Inferior)
    this.container.querySelector('#btn-efetivar-viagem')?.addEventListener('click', async () => {
      if (!this.propostaAtual.id) return;
      if (confirm('Deseja converter esta proposta em uma viagem confirmada no PaxFlow?')) {
        try {
          await StudioPropostasService.converterEmViagem(this.propostaAtual.id);
          this.showToast(`Viagem criada com sucesso no PaxFlow!`, 'success');
          window.location.hash = '#dashboard';
        } catch (err: any) {
          this.showToast('Erro ao converter viagem: ' + err.message, 'error');
        }
      }
    });
  }

  // ==========================================================================
  // LOGICA DO MODAL FOCADO DE EDIÇÃO DE ATIVIDADE
  // ==========================================================================

  private abrirModalItem(diaIdx: number, itemIdx: number, item: StudioItemItinerario, isNovo: boolean): void {
    this.itemEmEdicao = { diaIdx, itemIdx, item, isNovo };
    const modal = this.container.querySelector('#modal-edicao-item');
    if (modal) {
      modal.innerHTML = this.renderModalEdicaoItem();
      modal.classList.remove('hidden');
      this.setupModalItemListeners();
    }
  }

  private fecharModalItem(): void {
    this.itemEmEdicao = null;
    const modal = this.container.querySelector('#modal-edicao-item');
    if (modal) {
      modal.classList.add('hidden');
      modal.innerHTML = '';
    }
  }

  private setupModalItemListeners(): void {
    const modal = this.container.querySelector('#modal-edicao-item');
    if (!modal || !this.itemEmEdicao) return;

    // Trocar de tipo de atividade
    modal.querySelectorAll('.btn-trocar-tipo-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const novoTipo = btn.getAttribute('data-tipo') as any;
        if (this.itemEmEdicao && novoTipo) {
          this.itemEmEdicao.item.tipo = novoTipo;
          if (novoTipo === 'voo' && !this.itemEmEdicao.item.titulo) {
            this.itemEmEdicao.item.titulo = 'Voo a definir';
          }
          modal.innerHTML = this.renderModalEdicaoItem();
          this.setupModalItemListeners();
        }
      });
    });

    // Fechar / Cancelar
    modal.querySelector('#btn-fechar-modal-item')?.addEventListener('click', () => this.fecharModalItem());
    modal.querySelector('#btn-cancelar-modal-item')?.addEventListener('click', () => this.fecharModalItem());

    // Sincronização inteligente dos inputs de Voo e Hotel no Modal
    const syncTituloVoo = () => {
      const cia = (modal.querySelector('#modal-campo-cia') as HTMLInputElement)?.value || '';
      const voo = (modal.querySelector('#modal-campo-voo') as HTMLInputElement)?.value || '';
      const origem = (modal.querySelector('#modal-campo-origem') as HTMLInputElement)?.value || '';
      const destino = (modal.querySelector('#modal-campo-destino') as HTMLInputElement)?.value || '';
      const tituloFinal = modal.querySelector('#modal-campo-titulo-final') as HTMLInputElement;

      if (tituloFinal && (!tituloFinal.value || tituloFinal.value.startsWith('Voo '))) {
        const descCia = cia ? cia : (voo ? `Voo ${voo}` : 'Voo');
        tituloFinal.value = `${descCia} (${origem || 'Origem'} ➔ ${destino || 'Destino'})`.trim();
      }
    };

    modal.querySelector('#modal-campo-cia')?.addEventListener('input', syncTituloVoo);
    modal.querySelector('#modal-campo-voo')?.addEventListener('input', syncTituloVoo);
    modal.querySelector('#modal-campo-origem')?.addEventListener('input', syncTituloVoo);
    modal.querySelector('#modal-campo-destino')?.addEventListener('input', syncTituloVoo);

    // Salvar e Aplicar alterações do item
    modal.querySelector('#btn-salvar-modal-item')?.addEventListener('click', () => {
      if (!this.itemEmEdicao) return;
      const { diaIdx, itemIdx, isNovo, item } = this.itemEmEdicao;

      const getVal = (id: string) => (modal.querySelector(`#${id}`) as HTMLInputElement)?.value || '';

      item.titulo = getVal('modal-campo-titulo-final') || getVal('modal-campo-hotel-nome') || getVal('modal-campo-generico-nome') || item.titulo || 'Atividade';
      item.subtitulo = getVal('modal-campo-subtitulo') || item.subtitulo;

      if (item.tipo === 'voo') {
        item.companhia = getVal('modal-campo-cia');
        item.numeroVoo = getVal('modal-campo-voo');
        item.localizador = getVal('modal-campo-loc');
        item.origem = getVal('modal-campo-origem');
        item.destino = getVal('modal-campo-destino');
        item.horaInicio = getVal('modal-campo-hora-inicio');
        item.horaFim = getVal('modal-campo-hora-fim');
      } else if (item.tipo === 'hotel') {
        item.localizador = getVal('modal-campo-loc');
        item.quarto = getVal('modal-campo-quarto');
        item.regime = getVal('modal-campo-regime');
        item.linkMaps = getVal('modal-campo-maps');
      } else {
        item.fornecedor = getVal('modal-campo-fornecedor');
        item.localizador = getVal('modal-campo-loc');
        item.horario = getVal('modal-campo-hora-inicio');
        item.horaInicio = getVal('modal-campo-hora-inicio');
      }

      // Aplica na proposta em memória
      if (!this.propostaAtual.itinerario_dias) this.propostaAtual.itinerario_dias = [];
      if (!this.propostaAtual.itinerario_dias[diaIdx]) {
        this.propostaAtual.itinerario_dias[diaIdx] = {
          diaNumero: diaIdx + 1,
          dataStr: new Date().toISOString().split('T')[0],
          tituloDia: `Dia ${diaIdx + 1}`,
          itens: []
        };
      }

      if (isNovo) {
        this.propostaAtual.itinerario_dias[diaIdx].itens.push(item);
      } else {
        this.propostaAtual.itinerario_dias[diaIdx].itens[itemIdx] = item;
      }

      this.fecharModalItem();
      this.marcarAlteracaoPendente();
      this.render();
      this.showToast('Atividade aplicada ao roteiro com sucesso!', 'success');
    });
  }

  private setupDrawerItemListeners(fecharDrawerCallback: () => void): void {
    this.container.querySelectorAll('.btn-drawer-carregar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) {
          fecharDrawerCallback();
          await this.carregarPropostaPorId(id);
        }
      });
    });

    this.container.querySelectorAll('.btn-drawer-pdf').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const p = this.propostasSalvas.find(item => String(item.id) === String(id));
        if (p) {
          StudioPdfGenerator.imprimirOuSalvarPdf(p);
        }
      });
    });
  }

  private async carregarPropostaPorId(id: string): Promise<void> {
    let p = this.propostasSalvas.find(item => String(item.id) === String(id));
    if (!p) {
      p = (await StudioPropostasService.buscarPorId(id)) || undefined;
    }

    if (p) {
      this.propostaAtual = JSON.parse(JSON.stringify(p));
      this.alteracoesNaoSalvas = false;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.showToast(`Proposta de "${p.cliente_nome || 'Cliente'}" carregada para edição!`, 'success');
    } else {
      this.showToast('Proposta não encontrada no banco.', 'error');
    }
  }

  // ==========================================================================
  // PROCESSAMENTO DE ARQUIVOS E TEXTO COM FIDELIDADE ESTRITA
  // ==========================================================================

  private async processarArquivos(files: File[]): Promise<void> {
    const statusEl = this.container.querySelector('#status-processamento');
    if (statusEl) statusEl.classList.remove('hidden');

    try {
      const extraidos = await StudioExtractionService.processarArquivos(files);
      this.aplicarDadosExtraidos(extraidos);
      this.marcarAlteracaoPendente();
      this.showToast('Documentos processados com fidelidade estrita!', 'success');
    } catch (err: any) {
      this.showToast('Erro na extração dos arquivos: ' + err.message, 'error');
    } finally {
      if (statusEl) statusEl.classList.add('hidden');
    }
  }

  private async processarTextoColado(texto: string): Promise<void> {
    const statusEl = this.container.querySelector('#status-processamento');
    if (statusEl) statusEl.classList.remove('hidden');

    try {
      const extraidos = await StudioExtractionService.processarTextoColado(texto);
      this.aplicarDadosExtraidos(extraidos.dadosBrutos, extraidos.itens);
      this.marcarAlteracaoPendente();
      this.showToast('Informações extraídas do texto com sucesso!', 'success');
    } catch (err: any) {
      this.showToast('Erro ao processar texto: ' + err.message, 'error');
    } finally {
      if (statusEl) statusEl.classList.add('hidden');
    }
  }

  private aplicarDadosExtraidos(extraidos: any, itensDiretos?: StudioItemItinerario[]): void {
    this.propostaAtual.dados_extraidos = extraidos;

    if (extraidos.valores && extraidos.valores.total > 0 && (!this.propostaAtual.valor_total || this.propostaAtual.valor_total === 0)) {
      this.propostaAtual.valor_total = extraidos.valores.total;
    }

    if (!this.propostaAtual.destino || this.propostaAtual.destino === 'Destino a definir') {
      if (extraidos.voos && extraidos.voos.length > 0 && extraidos.voos[0].destino) {
        this.propostaAtual.destino = extraidos.voos[0].destino;
      } else if (extraidos.hospedagens && extraidos.hospedagens.length > 0) {
        this.propostaAtual.destino = extraidos.hospedagens[0].hotel;
      }
    }

    if (itensDiretos && itensDiretos.length > 0) {
      this.propostaAtual.itinerario_dias = StudioExtractionService.gerarItinerarioDiaADia(itensDiretos);
    } else if (!this.propostaAtual.itinerario_dias || this.propostaAtual.itinerario_dias.length === 0) {
      this.propostaAtual.itinerario_dias = StudioExtractionService.gerarItinerarioDias(extraidos);
    }

    this.render();
  }

  // ==========================================================================
  // CAPTURA E PERSISTÊNCIA NO BANCO (SUPABASE)
  // ==========================================================================

  private capturarDadosGeraisDoFormulario(): void {
    const getVal = (id: string) => (this.container.querySelector(`#${id}`) as HTMLInputElement)?.value || '';

    this.propostaAtual.cliente_nome = getVal('campo-cliente');
    this.propostaAtual.cliente_whatsapp = getVal('campo-whatsapp');
    this.propostaAtual.cliente_email = getVal('campo-email');
    this.propostaAtual.destino = getVal('campo-destino');
    this.propostaAtual.data_ida = getVal('campo-data-ida') || undefined;
    this.propostaAtual.data_volta = getVal('campo-data-volta') || undefined;
    this.propostaAtual.valor_total = parseFloat(getVal('campo-valor-total')) || 0;
    this.propostaAtual.moeda = getVal('campo-moeda') || 'BRL';
    this.propostaAtual.foto_capa_url = getVal('campo-foto-custom') || this.propostaAtual.foto_capa_url;
  }

  private async salvarPropostaAtual(): Promise<void> {
    this.capturarDadosGeraisDoFormulario();

    if (!this.propostaAtual.cliente_nome) {
      this.showToast('Por favor, informe o nome do cliente antes de salvar.', 'error');
      const inputCliente = this.container.querySelector('#campo-cliente') as HTMLInputElement | null;
      inputCliente?.focus();
      return;
    }

    try {
      const btnSalvar = this.container.querySelector('#btn-salvar-proposta') as HTMLButtonElement | null;
      if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = `<span>⏳</span> Salvando...`;
      }

      const salva = await StudioPropostasService.salvarProposta(this.propostaAtual);
      this.propostaAtual = salva;
      this.alteracoesNaoSalvas = false;
      await this.carregarPropostas();
      this.render();
      this.showToast('Proposta salva com sucesso no Supabase!', 'success');
    } catch (err: any) {
      this.showToast('Erro ao salvar proposta: ' + (err.message || err), 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const toastId = 'paxflow-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = toastId;
      document.body.appendChild(toast);
    }
    const isSuccess = type === 'success';
    toast.className = `fixed bottom-20 right-6 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-xs z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-rose-600 shadow-rose-600/30'
    }`;
    toast.innerHTML = `<span>${isSuccess ? '✅' : '⚠️'}</span> <span>${message}</span>`;
    setTimeout(() => {
      if (toast) {
        toast.className = toast.className.replace('translate-y-0 opacity-100', 'translate-y-10 opacity-0');
      }
    }, 4000);
  }
}
