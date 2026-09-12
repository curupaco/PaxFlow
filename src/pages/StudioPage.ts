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
  private itensExpandidos: Set<string> = new Set();

  // Fotos de capa sugeridas por destino
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
  }

  public async init(propostaId?: string): Promise<void> {
    await this.carregarPropostas();

    if (propostaId) {
      const encontrada = await StudioPropostasService.buscarPorId(propostaId);
      if (encontrada) {
        this.propostaAtual = encontrada;
      }
    } else if (this.propostasSalvas.length > 0 && !this.propostaAtual.id) {
      // Carrega a mais recente como rascunho base se o usuário quiser editar
      this.propostaAtual = { ...this.propostasSalvas[0] };
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

  private render(): void {
    this.container.innerHTML = `
      <div class="min-h-full pb-16 space-y-6">
        <!-- HEADER DA PÁGINA COM BADGE STUDIO PRO -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">PaxFlow Studio™</h1>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-sm uppercase">
                Studio Pro
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Unifique múltiplos PDFs de fornecedores em propostas visuais de luxo, links interativos e cadernos de viagem prontos para impressão.
            </p>
          </div>

          <!-- AÇÕES DO TOPO -->
          <div class="flex flex-wrap items-center gap-2">
            <button id="btn-nova-proposta" class="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5">
              <span>➕</span> Nova Proposta
            </button>
            <button id="btn-salvar-proposta" class="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition flex items-center gap-1.5">
              <span>💾</span> Salvar Proposta
            </button>
            <button id="btn-imprimir-pdf" class="px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl shadow-sm transition flex items-center gap-1.5">
              <span>📄</span> Caderno de Viagem PDF
            </button>
            <button id="btn-link-publico" class="px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5">
              <span>🔗</span> Link de Aprovação
            </button>
            ${this.propostaAtual.id ? `
              <button id="btn-efetivar-viagem" class="px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl transition flex items-center gap-1.5">
                <span>🚀</span> Efetivar Viagem
              </button>
            ` : ''}
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- COLUNA ESQUERDA: INGESTÃO E DADOS GERAIS (5 cols) -->
          <div class="lg:col-span-5 space-y-6">
            <!-- DROPZONE MULTI-PDF E COLAR TEXTO -->
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📥</span> Ingestão de Documentos
                </h2>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Fidelidade Estrita
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Arraste PDFs de consolidadoras ou cole mensagens de WhatsApp e e-mails de reserva. Suas companhias aéreas e vouchers são preservados com precisão documental.
              </p>

              <div id="dropzone-pdf" class="border-2 border-dashed border-indigo-300 dark:border-indigo-900 hover:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2">
                <input type="file" id="input-files-pdf" multiple accept=".pdf,.txt" class="hidden" />
                <div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
                  📁
                </div>
                <div class="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Clique ou arraste seus PDFs aqui
                </div>
                <span class="text-[11px] text-slate-500">LATAM, Gol, Azul, TAP, Air France, CVC, Trend, Coris...</span>
              </div>

              <!-- BOTÃO COLAR TEXTO DE RESERVA -->
              <button id="btn-abrir-modal-colar" type="button" class="w-full mt-3 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-xl transition flex items-center justify-center gap-2">
                <span>📋</span> Colar Texto da Reserva / E-mail / WhatsApp
              </button>

              <!-- FEEDBACK DE PROCESSAMENTO -->
              <div id="status-processamento" class="mt-3 hidden">
                <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                  <span class="animate-spin">🔄</span> Processando documentos com fidelidade estrita...
                </div>
              </div>

              <!-- ARQUIVOS JÁ PROCESSADOS -->
              ${this.propostaAtual.dados_extraidos?.arquivosProcessados && this.propostaAtual.dados_extraidos.arquivosProcessados.length > 0 ? `
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Arquivos Ingeridos:</span>
                  <div class="flex flex-wrap gap-1.5 mt-1.5">
                    ${this.propostaAtual.dados_extraidos.arquivosProcessados.map(a => `
                      <span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        📄 ${a}
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- FORMULÁRIO DE DADOS BÁSICOS -->
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📋</span> Dados Principais da Proposta
              </h2>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Cliente / Passageiro *</label>
                <input type="text" id="campo-cliente" value="${this.propostaAtual.cliente_nome || ''}" placeholder="Ex: Dra. Mariana Vasconcellos" class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp</label>
                  <input type="text" id="campo-whatsapp" value="${this.propostaAtual.cliente_whatsapp || ''}" placeholder="(11) 99999-9999" class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                  <input type="email" id="campo-email" value="${this.propostaAtual.cliente_email || ''}" placeholder="cliente@email.com" class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Destino Principal *</label>
                <input type="text" id="campo-destino" value="${this.propostaAtual.destino || ''}" placeholder="Ex: Paris & Costa Amalfitana" class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Ida / Embarque</label>
                  <input type="date" id="campo-data-ida" value="${this.propostaAtual.data_ida || ''}" class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Retorno</label>
                  <input type="date" id="campo-data-volta" value="${this.propostaAtual.data_volta || ''}" class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Total</label>
                  <input type="number" step="0.01" id="campo-valor-total" value="${this.propostaAtual.valor_total || 0}" class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Moeda</label>
                  <select id="campo-moeda" class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500">
                    <option value="BRL" ${this.propostaAtual.moeda === 'BRL' ? 'selected' : ''}>BRL (R$)</option>
                    <option value="USD" ${this.propostaAtual.moeda === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="EUR" ${this.propostaAtual.moeda === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                  </select>
                </div>
              </div>

              <!-- SELETOR DE CAPA -->
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Foto de Capa Cinematográfica</label>
                <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  ${StudioPage.FOTOS_CAPA.map(foto => `
                    <button type="button" class="btn-selecionar-capa flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 ${this.propostaAtual.foto_capa_url === foto.url ? 'border-indigo-600 scale-105' : 'border-transparent opacity-75 hover:opacity-100'} transition relative group" data-url="${foto.url}">
                      <img src="${foto.url}" alt="${foto.nome}" class="w-full h-full object-cover" />
                      <span class="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white font-bold truncate px-1 py-0.5 text-center">
                        ${foto.nome}
                      </span>
                    </button>
                  `).join('')}
                </div>
                <input type="text" id="campo-foto-custom" value="${this.propostaAtual.foto_capa_url || ''}" placeholder="Ou cole a URL da imagem de capa..." class="w-full mt-2 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          </div>

          <!-- COLUNA DIREITA: PREVIEW DA LINHA DO TEMPO & REVISÃO EDITÁVEL (7 cols) -->
          <div class="lg:col-span-7 space-y-6">
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📅</span> Roteiro &amp; Revisão da Linha do Tempo
                  </h2>
                  <p class="text-xs text-slate-500">
                    Clique em <strong class="text-indigo-600">Revisar Detalhes</strong> para alterar qualquer voo, companhia, hotel ou voucher.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button id="btn-toggle-todos" class="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition">
                    Expandir / Recolher Tudo
                  </button>
                  <button id="btn-adicionar-dia" class="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg transition">
                    + Adicionar Dia
                  </button>
                </div>
              </div>

              <!-- LISTA DE DIAS E ITENS EXPANSÍVEIS -->
              <div id="container-dias-itinerario" class="space-y-4">
                ${this.renderDiasItinerario()}
              </div>
            </div>

            <!-- TABELA DE PROPOSTAS RECENTES -->
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 class="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span>🗂️</span> Propostas Salvas na Agência
              </h2>
              ${this.renderTabelaPropostas()}
            </div>
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

      <!-- MODAL PARA COLAR TEXTO DA RESERVA -->
      <div id="modal-colar-texto" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>📋</span> Colar Texto de Reserva / Voo / Hotel
            </h3>
            <button id="btn-fechar-modal-colar" class="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Cole aqui a confirmação copiada de e-mail, WhatsApp ou GDS (Sabre, Amadeus). O sistema extrairá os voos, trechos e hotéis com estrita fidelidade.
          </p>
          <textarea id="textarea-texto-colado" rows="8" placeholder="Ex: Bilhete Eletrônico LATAM Airlines, Voo LA3421, GRU para MIA, Localizador: LAX99Z..." class="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500"></textarea>
          <div class="flex justify-end gap-2">
            <button id="btn-cancelar-colar" type="button" class="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
              Cancelar
            </button>
            <button id="btn-confirmar-colar" type="button" class="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5">
              <span>⚡</span> Extrair Informações
            </button>
          </div>
        </div>
      </div>
    `;

    this.setupListeners();
  }

  private renderDiasItinerario(): string {
    const dias = this.propostaAtual.itinerario_dias || [];
    if (dias.length === 0) {
      return `
        <div class="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-400">
          Nenhum dia cadastrado ainda. Arraste PDFs ao lado, cole texto de reservas ou clique em "+ Adicionar Dia".
        </div>
      `;
    }

    return dias.map((dia, dIdx) => `
      <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3" data-dia-idx="${dIdx}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">DIA ${dia.diaNumero}</span>
            <input type="text" class="input-titulo-dia text-xs font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 text-slate-800 dark:text-slate-100" value="${dia.tituloDia}" data-dia-idx="${dIdx}" />
            <input type="date" class="input-data-dia text-[11px] text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1" value="${dia.dataStr || dia.data || ''}" data-dia-idx="${dIdx}" />
          </div>
          <div class="flex items-center gap-2">
            <button type="button" class="btn-add-atividade text-[11px] font-bold text-indigo-600 hover:text-indigo-700" data-dia-idx="${dIdx}">
              + Atividade
            </button>
            <button type="button" class="btn-remover-dia text-xs text-rose-500 hover:text-rose-700" data-dia-idx="${dIdx}">
              🗑️
            </button>
          </div>
        </div>

        <!-- LISTA DE ITENS DO DIA COM REVISÃO EXPANSÍVEL -->
        <div class="space-y-3 pl-2 border-l-2 border-indigo-200 dark:border-indigo-900">
          ${dia.itens.map((item, iIdx) => this.renderCardItem(item, dIdx, iIdx)).join('')}
        </div>
      </div>
    `).join('');
  }

  private renderCardItem(item: StudioItemItinerario, dIdx: number, iIdx: number): string {
    const itemChave = `${dIdx}-${iIdx}`;
    const estaExpandido = this.itensExpandidos.has(itemChave);

    const badgeTipo = (tipo: string) => {
      switch (tipo) {
        case 'voo':
          return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Voo</span>`;
        case 'hotel':
          return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Hotel</span>`;
        case 'transfer':
          return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">Transfer</span>`;
        case 'seguro':
          return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Seguro</span>`;
        default:
          return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Passeio</span>`;
      }
    };

    return `
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-xs overflow-hidden transition" data-dia-idx="${dIdx}" data-item-idx="${iIdx}">
        <!-- CABEÇALHO / VISUAL RESUMO DO ITEM -->
        <div class="p-3 flex items-start justify-between gap-2">
          <div class="flex items-start gap-2.5 flex-1 min-w-0">
            <span class="text-base flex-shrink-0 mt-0.5">${this.obterIconeTipo(item.tipo)}</span>
            <div class="space-y-1 min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                ${badgeTipo(item.tipo)}
                ${item.companhia ? `
                  <span class="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    ✈️ ${item.companhia}
                  </span>
                ` : ''}
                ${item.localizador ? `
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    LOC: ${item.localizador}
                  </span>
                ` : ''}
                ${item.horario || item.horaInicio ? `
                  <span class="text-[10px] text-slate-500 font-bold">
                    ⏰ ${item.horario || item.horaInicio}
                  </span>
                ` : ''}
              </div>

              <div class="font-bold text-slate-800 dark:text-slate-100 truncate text-xs">
                ${item.titulo || 'Item sem título'}
              </div>

              <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                ${item.subtitulo || item.observacoes || 'Clique em Revisar Detalhes para preencher.'}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1 flex-shrink-0">
            <button type="button" class="btn-toggle-revisao px-2 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition" data-chave="${itemChave}">
              ${estaExpandido ? '▲ Recolher' : '✏️ Revisar Detalhes'}
            </button>
            <button type="button" class="btn-remover-item text-slate-400 hover:text-rose-500 p-1 text-xs" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" title="Excluir Item">
              ✕
            </button>
          </div>
        </div>

        <!-- FORMULÁRIO COMPLETO DE REVISÃO E ALTERAÇÃO DO ITEM (EXPANSÍVEL) -->
        <div id="form-revisao-${itemChave}" class="border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 p-3.5 space-y-3 ${estaExpandido ? '' : 'hidden'}">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Configurações &amp; Dados Estruturados do Documento
            </span>
            <div class="flex items-center gap-1.5">
              <label class="text-[10px] text-slate-500 font-bold">Tipo:</label>
              <select class="input-item-campo px-2 py-0.5 rounded text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="tipo">
                <option value="voo" ${item.tipo === 'voo' ? 'selected' : ''}>✈️ Voo</option>
                <option value="hotel" ${item.tipo === 'hotel' ? 'selected' : ''}>🏨 Hotel</option>
                <option value="passeio" ${item.tipo === 'passeio' ? 'selected' : ''}>🗺️ Passeio</option>
                <option value="transfer" ${item.tipo === 'transfer' ? 'selected' : ''}>🚐 Transfer</option>
                <option value="seguro" ${item.tipo === 'seguro' ? 'selected' : ''}>🛡️ Seguro</option>
                <option value="nota" ${item.tipo === 'nota' ? 'selected' : ''}>📌 Nota / Dica</option>
              </select>
            </div>
          </div>

          ${item.tipo === 'voo' ? `
            <!-- CAMPOS ESPECÍFICOS DE VOO -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Companhia Aérea *</label>
                <input type="text" list="lista-cias-aereas" class="input-item-campo input-sync-voo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-indigo-700 dark:text-indigo-300" value="${item.companhia || ''}" placeholder="Ex: LATAM Airlines" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="companhia" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Número do Voo</label>
                <input type="text" class="input-item-campo input-sync-voo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono" value="${item.numeroVoo || ''}" placeholder="Ex: LA 3421, AF 443" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="numeroVoo" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Localizador (LOC / PNR)</label>
                <input type="text" class="input-item-campo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold" value="${item.localizador || ''}" placeholder="Ex: LAX99Z" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="localizador" />
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Origem (IATA / Cidade)</label>
                <input type="text" class="input-item-campo input-sync-voo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase" value="${item.origem || ''}" placeholder="GRU" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="origem" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Destino (IATA / Cidade)</label>
                <input type="text" class="input-item-campo input-sync-voo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase" value="${item.destino || ''}" placeholder="MIA" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="destino" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Horário de Embarque</label>
                <input type="text" class="input-item-campo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" value="${item.horaInicio || item.horario || ''}" placeholder="22:15" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="horaInicio" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Horário de Chegada</label>
                <input type="text" class="input-item-campo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" value="${item.horaFim || ''}" placeholder="06:30" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="horaFim" />
              </div>
            </div>
          ` : item.tipo === 'hotel' ? `
            <!-- CAMPOS ESPECÍFICOS DE HOTEL -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div class="md:col-span-2">
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Nome do Hotel / Pousada *</label>
                <input type="text" class="input-item-campo input-sync-hotel w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" value="${item.titulo || ''}" placeholder="Ex: Hotel Fasano Rio de Janeiro" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="titulo" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Voucher / Confirmação</label>
                <input type="text" class="input-item-campo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold" value="${item.localizador || ''}" placeholder="Ex: BK-88412" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="localizador" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Tipo de Quarto / Acomodação</label>
                <input type="text" class="input-item-campo input-sync-hotel w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" value="${item.quarto || ''}" placeholder="Ex: Suíte Deluxe Vista Mar" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="quarto" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Regime de Alimentação</label>
                <input type="text" class="input-item-campo input-sync-hotel w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" value="${item.regime || ''}" placeholder="Ex: Café da Manhã Incluso, All Inclusive" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="regime" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Link Google Maps / Endereço</label>
                <input type="text" class="input-item-campo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" value="${item.linkMaps || item.endereco || ''}" placeholder="https://maps.google.com/..." data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="linkMaps" />
              </div>
            </div>
          ` : `
            <!-- CAMPOS PARA SERVIÇO / PASSEIO / SEGURO / TRANSFER -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div class="md:col-span-2">
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Nome do Serviço / Passeio *</label>
                <input type="text" class="input-item-campo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" value="${item.titulo || ''}" placeholder="Ex: Transfer Receptivo Privativo" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="titulo" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Fornecedor / Operadora</label>
                <input type="text" class="input-item-campo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" value="${item.fornecedor || ''}" placeholder="Ex: Coris, GTA, Operadora..." data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="fornecedor" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Localizador / Apólice / Voucher</label>
                <input type="text" class="input-item-campo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold" value="${item.localizador || ''}" placeholder="Ex: AP-99412" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="localizador" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Horário Programado</label>
                <input type="text" class="input-item-campo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" value="${item.horario || item.horaInicio || ''}" placeholder="Ex: 09:30" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="horario" />
              </div>
            </div>
          `}

          <!-- CAMPOS GERAIS DE TEXTO (TÍTULO E SUBTÍTULO LIVRES) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Título no PDF / Link Público</label>
              <input type="text" class="input-item-campo input-item-titulo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" value="${item.titulo}" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="titulo" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">Subtítulo / Instruções para o Passageiro</label>
              <input type="text" class="input-item-campo input-item-subtitulo w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300" value="${item.subtitulo || ''}" placeholder="Ex: Check-in online 48h antes / Apresentar voucher na recepção" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" data-campo="subtitulo" />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderTabelaPropostas(): string {
    if (this.propostasSalvas.length === 0) {
      return `<div class="text-xs text-slate-400 py-3">Nenhuma proposta cadastrada ainda.</div>`;
    }

    const badgeStatus = (status: string) => {
      switch (status) {
        case 'APROVADO':
          return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Aprovado</span>`;
        case 'EFETIVADO':
          return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Efetivado em Viagem</span>`;
        case 'ENVIADO':
          return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Enviado</span>`;
        default:
          return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Rascunho</span>`;
      }
    };

    return `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th class="py-2">Cliente</th>
              <th class="py-2">Destino</th>
              <th class="py-2">Valor</th>
              <th class="py-2">Status</th>
              <th class="py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            ${this.propostasSalvas.map(p => `
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td class="py-2.5 font-bold text-slate-800 dark:text-slate-200">${p.cliente_nome}</td>
                <td class="py-2.5 text-slate-600 dark:text-slate-300">${p.destino}</td>
                <td class="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                  ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: p.moeda || 'BRL' }).format(p.valor_total || 0)}
                </td>
                <td class="py-2.5">${badgeStatus(p.status)}</td>
                <td class="py-2.5 text-right space-x-1">
                  <button class="btn-carregar-proposta px-2 py-1 bg-indigo-50 text-indigo-600 rounded font-bold hover:bg-indigo-100" data-id="${p.id}">
                    Editar
                  </button>
                  <button class="btn-imprimir-tabela px-2 py-1 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200" data-id="${p.id}">
                    PDF
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
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

  private setupListeners(): void {
    // 1. Dropzone de arquivos PDF
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

    // 2. Modal de Colar Texto de Reserva
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

    const fecharModal = () => modalColar?.classList.add('hidden');
    btnFecharColar?.addEventListener('click', fecharModal);
    btnCancelarColar?.addEventListener('click', fecharModal);

    btnConfirmarColar?.addEventListener('click', async () => {
      const texto = textareaColar?.value.trim();
      if (!texto) {
        alert('Por favor, cole o texto do bilhete ou reserva.');
        return;
      }
      fecharModal();
      await this.processarTextoColado(texto);
    });

    // 3. Seletor de fotos de capa
    this.container.querySelectorAll('.btn-selecionar-capa').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (url) {
          this.propostaAtual.foto_capa_url = url;
          const inputCustom = this.container.querySelector('#campo-foto-custom') as HTMLInputElement;
          if (inputCustom) inputCustom.value = url;
          this.container.querySelectorAll('.btn-selecionar-capa').forEach(b => b.classList.remove('border-indigo-600', 'scale-105'));
          btn.classList.add('border-indigo-600', 'scale-105');
        }
      });
    });

    // 4. Botão Nova Proposta
    this.container.querySelector('#btn-nova-proposta')?.addEventListener('click', () => {
      this.propostaAtual = {
        cliente_nome: '',
        destino: '',
        valor_total: 0,
        moeda: 'BRL',
        status: 'RASCUNHO',
        itinerario_dias: []
      };
      this.itensExpandidos.clear();
      this.render();
    });

    // 5. Salvar Proposta
    this.container.querySelector('#btn-salvar-proposta')?.addEventListener('click', async () => {
      await this.salvarPropostaAtual();
    });

    // 6. Imprimir Caderno PDF
    this.container.querySelector('#btn-imprimir-pdf')?.addEventListener('click', () => {
      this.atualizarDadosDoFormulario();
      StudioPdfGenerator.imprimirOuSalvarPdf(this.propostaAtual as StudioProposta);
    });

    // 7. Link Público / Copiar Link
    this.container.querySelector('#btn-link-publico')?.addEventListener('click', async () => {
      await this.salvarPropostaAtual();
      if (this.propostaAtual.id) {
        const url = `${window.location.origin}${window.location.pathname}#proposta?id=${this.propostaAtual.id}`;
        navigator.clipboard.writeText(url);
        alert(`Link de aprovação copiado com sucesso para a área de transferência:\n\n${url}`);
      }
    });

    // 8. Efetivar em Viagem
    this.container.querySelector('#btn-efetivar-viagem')?.addEventListener('click', async () => {
      if (!this.propostaAtual.id) return;
      if (confirm('Deseja converter esta proposta em uma viagem confirmada no PaxFlow?')) {
        try {
          const res = await StudioPropostasService.converterEmViagem(this.propostaAtual.id);
          alert(`Viagem criada com sucesso no PaxFlow! Código: ${res.viagemId}`);
          window.location.hash = '#dashboard';
        } catch (err: any) {
          alert('Erro ao converter viagem: ' + err.message);
        }
      }
    });

    // 9. Adicionar Dia
    this.container.querySelector('#btn-adicionar-dia')?.addEventListener('click', () => {
      this.atualizarDadosDoFormulario();
      if (!this.propostaAtual.itinerario_dias) this.propostaAtual.itinerario_dias = [];
      const novoNum = this.propostaAtual.itinerario_dias.length + 1;
      this.propostaAtual.itinerario_dias.push({
        diaNumero: novoNum,
        dataStr: new Date().toISOString().split('T')[0],
        tituloDia: `Dia ${novoNum}: Atividades Livres`,
        itens: [
          {
            id: `item-${Date.now()}`,
            tipo: 'passeio',
            titulo: 'Passeio ou Atividade',
            subtitulo: 'Horário livre para aproveitar o destino'
          }
        ]
      });
      this.render();
    });

    // 10. Expandir / Recolher Todos os Cards
    this.container.querySelector('#btn-toggle-todos')?.addEventListener('click', () => {
      const totalItens = (this.propostaAtual.itinerario_dias || []).reduce((acc, d) => acc + d.itens.length, 0);
      if (this.itensExpandidos.size >= totalItens) {
        this.itensExpandidos.clear();
      } else {
        this.propostaAtual.itinerario_dias?.forEach((dia, dIdx) => {
          dia.itens.forEach((_, iIdx) => {
            this.itensExpandidos.add(`${dIdx}-${iIdx}`);
          });
        });
      }
      this.atualizarDadosDoFormulario();
      this.render();
    });

    // 11. Toggle individual de revisão do item
    this.container.querySelectorAll('.btn-toggle-revisao').forEach(btn => {
      btn.addEventListener('click', () => {
        const chave = btn.getAttribute('data-chave');
        if (chave) {
          if (this.itensExpandidos.has(chave)) {
            this.itensExpandidos.delete(chave);
          } else {
            this.itensExpandidos.add(chave);
          }
          this.atualizarDadosDoFormulario();
          this.render();
        }
      });
    });

    // 12. Adicionar atividade no dia
    this.container.querySelectorAll('.btn-add-atividade').forEach(btn => {
      btn.addEventListener('click', () => {
        const dIdx = parseInt(btn.getAttribute('data-dia-idx') || '0', 10);
        this.atualizarDadosDoFormulario();
        if (this.propostaAtual.itinerario_dias?.[dIdx]) {
          const novoItem: StudioItemItinerario = {
            id: `item-${Date.now()}`,
            tipo: 'voo',
            titulo: 'Novo Voo',
            subtitulo: 'Horário a definir',
            companhia: '',
            status: 'confirmado'
          };
          this.propostaAtual.itinerario_dias[dIdx].itens.push(novoItem);
          const novoIdx = this.propostaAtual.itinerario_dias[dIdx].itens.length - 1;
          this.itensExpandidos.add(`${dIdx}-${novoIdx}`);
          this.render();
        }
      });
    });

    // 13. Remover dia
    this.container.querySelectorAll('.btn-remover-dia').forEach(btn => {
      btn.addEventListener('click', () => {
        const dIdx = parseInt(btn.getAttribute('data-dia-idx') || '0', 10);
        this.atualizarDadosDoFormulario();
        if (this.propostaAtual.itinerario_dias && confirm(`Deseja excluir o Dia ${dIdx + 1} e todos os seus itens?`)) {
          this.propostaAtual.itinerario_dias.splice(dIdx, 1);
          // Renumera dias
          this.propostaAtual.itinerario_dias.forEach((d, idx) => d.diaNumero = idx + 1);
          this.itensExpandidos.clear();
          this.render();
        }
      });
    });

    // 14. Remover item
    this.container.querySelectorAll('.btn-remover-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const dIdx = parseInt(btn.getAttribute('data-dia-idx') || '0', 10);
        const iIdx = parseInt(btn.getAttribute('data-item-idx') || '0', 10);
        this.atualizarDadosDoFormulario();
        if (this.propostaAtual.itinerario_dias?.[dIdx]?.itens) {
          this.propostaAtual.itinerario_dias[dIdx].itens.splice(iIdx, 1);
          this.itensExpandidos.delete(`${dIdx}-${iIdx}`);
          this.render();
        }
      });
    });

    // 15. Sincronização inteligente e captura de alterações inline
    this.container.querySelectorAll('.input-item-campo').forEach(el => {
      el.addEventListener('input', (e: any) => {
        const dIdx = parseInt(el.getAttribute('data-dia-idx') || '0', 10);
        const iIdx = parseInt(el.getAttribute('data-item-idx') || '0', 10);
        const campo = el.getAttribute('data-campo');
        const valor = e.target.value;

        if (this.propostaAtual.itinerario_dias?.[dIdx]?.itens?.[iIdx] && campo) {
          (this.propostaAtual.itinerario_dias[dIdx].itens[iIdx] as any)[campo] = valor;

          // Sincronização inteligente para Voos: Cia, Voo, Origem e Destino atualizam título
          const item = this.propostaAtual.itinerario_dias[dIdx].itens[iIdx];
          if (item.tipo === 'voo' && (campo === 'companhia' || campo === 'numeroVoo' || campo === 'origem' || campo === 'destino')) {
            const formContainer = this.container.querySelector(`#form-revisao-${dIdx}-${iIdx}`);
            const inputTitulo = formContainer?.querySelector('.input-item-titulo') as HTMLInputElement;
            const inputSubtitulo = formContainer?.querySelector('.input-item-subtitulo') as HTMLInputElement;

            const novoTitulo = item.companhia
              ? `Voo ${item.companhia} (${item.origem || 'Origem'} ➔ ${item.destino || 'Destino'})`
              : `Voo ${item.numeroVoo || ''} (${item.origem || 'Origem'} ➔ ${item.destino || 'Destino'})`.replace(/\s+/g, ' ').trim();

            const novoSubtitulo = item.numeroVoo ? `Voo ${item.numeroVoo} · Embarque Previsto` : item.subtitulo;

            if (inputTitulo && (!inputTitulo.value || inputTitulo.value.startsWith('Voo '))) {
              inputTitulo.value = novoTitulo;
              item.titulo = novoTitulo;
            }
            if (inputSubtitulo && novoSubtitulo) {
              inputSubtitulo.value = novoSubtitulo;
              item.subtitulo = novoSubtitulo;
            }
          }

          // Se mudou o tipo do item, re-renderiza o card para ajustar os campos
          if (campo === 'tipo') {
            this.render();
          }
        }
      });
    });

    // 16. Ações na tabela
    this.container.querySelectorAll('.btn-carregar-proposta').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          const p = this.propostasSalvas.find(item => item.id === id);
          if (p) {
            this.propostaAtual = { ...p };
            this.itensExpandidos.clear();
            this.render();
          }
        }
      });
    });

    this.container.querySelectorAll('.btn-imprimir-tabela').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = this.propostasSalvas.find(item => item.id === id);
        if (p) {
          StudioPdfGenerator.imprimirOuSalvarPdf(p);
        }
      });
    });
  }

  private async processarArquivos(files: File[]): Promise<void> {
    const statusEl = this.container.querySelector('#status-processamento');
    if (statusEl) statusEl.classList.remove('hidden');

    try {
      const extraidos = await StudioExtractionService.processarArquivos(files);
      this.aplicarDadosExtraidos(extraidos);
    } catch (err: any) {
      alert('Erro na extração dos arquivos: ' + err.message);
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
    } catch (err: any) {
      alert('Erro ao processar texto colado: ' + err.message);
    } finally {
      if (statusEl) statusEl.classList.add('hidden');
    }
  }

  private aplicarDadosExtraidos(extraidos: any, itensDiretos?: StudioItemItinerario[]): void {
    this.propostaAtual.dados_extraidos = extraidos;

    // Auto-preenche valores e dados se vazios
    if (extraidos.valores && extraidos.valores.total > 0 && (!this.propostaAtual.valor_total || this.propostaAtual.valor_total === 0)) {
      this.propostaAtual.valor_total = extraidos.valores.total;
    }

    // Sugere destino a partir do primeiro voo ou hotel
    if (!this.propostaAtual.destino || this.propostaAtual.destino === 'Destino a definir') {
      if (extraidos.voos && extraidos.voos.length > 0 && extraidos.voos[0].destino) {
        this.propostaAtual.destino = extraidos.voos[0].destino;
      } else if (extraidos.hospedagens && extraidos.hospedagens.length > 0) {
        this.propostaAtual.destino = extraidos.hospedagens[0].hotel;
      }
    }

    // Se vieram itens diretos (ex: texto colado)
    if (itensDiretos && itensDiretos.length > 0) {
      const novosDias = StudioExtractionService.gerarItinerarioDiaADia(itensDiretos);
      this.propostaAtual.itinerario_dias = novosDias;
    } else if (!this.propostaAtual.itinerario_dias || this.propostaAtual.itinerario_dias.length === 0) {
      this.propostaAtual.itinerario_dias = StudioExtractionService.gerarItinerarioDias(extraidos);
    }

    // Abre os primeiros cards para o usuário revisar imediatamente
    this.itensExpandidos.clear();
    this.propostaAtual.itinerario_dias?.forEach((_, dIdx) => {
      this.itensExpandidos.add(`${dIdx}-0`);
    });

    this.render();
  }

  private atualizarDadosDoFormulario(): void {
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

    // Varrer todos os inputs de dias e itens para persistência 100% fiel
    this.container.querySelectorAll('.input-titulo-dia').forEach(el => {
      const dIdx = parseInt(el.getAttribute('data-dia-idx') || '0', 10);
      const val = (el as HTMLInputElement).value;
      if (this.propostaAtual.itinerario_dias?.[dIdx]) {
        this.propostaAtual.itinerario_dias[dIdx].tituloDia = val;
      }
    });

    this.container.querySelectorAll('.input-data-dia').forEach(el => {
      const dIdx = parseInt(el.getAttribute('data-dia-idx') || '0', 10);
      const val = (el as HTMLInputElement).value;
      if (this.propostaAtual.itinerario_dias?.[dIdx]) {
        this.propostaAtual.itinerario_dias[dIdx].dataStr = val;
        this.propostaAtual.itinerario_dias[dIdx].data = val;
      }
    });

    this.container.querySelectorAll('.input-item-campo').forEach(el => {
      const dIdx = parseInt(el.getAttribute('data-dia-idx') || '0', 10);
      const iIdx = parseInt(el.getAttribute('data-item-idx') || '0', 10);
      const campo = el.getAttribute('data-campo');
      const val = (el as HTMLInputElement).value;
      if (this.propostaAtual.itinerario_dias?.[dIdx]?.itens?.[iIdx] && campo) {
        (this.propostaAtual.itinerario_dias[dIdx].itens[iIdx] as any)[campo] = val;
      }
    });
  }

  private async salvarPropostaAtual(): Promise<void> {
    this.atualizarDadosDoFormulario();

    if (!this.propostaAtual.cliente_nome) {
      alert('Por favor, informe o nome do cliente antes de salvar.');
      return;
    }

    try {
      const salva = await StudioPropostasService.salvarProposta(this.propostaAtual);
      this.propostaAtual = salva;
      await this.carregarPropostas();
      alert('Proposta salva com sucesso no PaxFlow Studio!');
      this.render();
    } catch (err: any) {
      alert('Erro ao salvar proposta: ' + err.message);
    }
  }
}
