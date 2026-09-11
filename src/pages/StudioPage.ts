import { StudioExtractionService } from '../services/studioExtractionService';
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
    const formatarMoeda = (val?: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: this.propostaAtual.moeda || 'BRL' }).format(val || 0);
    };

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
            <!-- DROPZONE MULTI-PDF -->
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 class="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <span>📥</span> Ingestão Inteligente de Documentos
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Arraste ou selecione 1 ou mais PDFs de fornecedores (LATAM, Azul, CVC, Trend, E-HTL, Coris, etc.). O sistema detectará automaticamente voos, hotéis e valores.
              </p>

              <div id="dropzone-pdf" class="border-2 border-dashed border-indigo-300 dark:border-indigo-900 hover:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2">
                <input type="file" id="input-files-pdf" multiple accept=".pdf,.txt" class="hidden" />
                <div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
                  📁
                </div>
                <div class="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Clique ou arraste seus PDFs aqui
                </div>
                <span class="text-[11px] text-slate-500">Aceita múltiplos arquivos de uma só vez</span>
              </div>

              <!-- FEEDBACK DE PROCESSAMENTO -->
              <div id="status-processamento" class="mt-3 hidden">
                <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                  <span class="animate-spin">🔄</span> Extraindo voos, vouchers e valores...
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

          <!-- COLUNA DIREITA: PREVIEW DA LINHA DO TEMPO & EDITOR (7 cols) -->
          <div class="lg:col-span-7 space-y-6">
            <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📅</span> Roteiro &amp; Linha do Tempo Interativa
                  </h2>
                  <p class="text-xs text-slate-500">Organize os dias, botões de ação e notas para o cliente.</p>
                </div>
                <button id="btn-adicionar-dia" class="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg transition">
                  + Adicionar Dia
                </button>
              </div>

              <!-- LISTA DE DIAS -->
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
    `;

    this.setupListeners();
  }

  private renderDiasItinerario(): string {
    const dias = this.propostaAtual.itinerario_dias || [];
    if (dias.length === 0) {
      return `
        <div class="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-400">
          Nenhum dia cadastrado ainda. Arraste PDFs de fornecedores ao lado ou clique em "+ Adicionar Dia".
        </div>
      `;
    }

    return dias.map((dia, dIdx) => `
      <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3" data-dia-idx="${dIdx}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">DIA ${dia.diaNumero}</span>
            <input type="text" class="input-titulo-dia text-xs font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 text-slate-800 dark:text-slate-100" value="${dia.tituloDia}" />
            <span class="text-[11px] text-slate-400">(${dia.dataStr || dia.data || 'Data livre'})</span>
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

        <!-- ATIVIDADES DO DIA -->
        <div class="space-y-2 pl-2 border-l-2 border-indigo-200 dark:border-indigo-900">
          ${dia.itens.map((item, iIdx) => `
            <div class="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex items-start justify-between gap-2 shadow-xs">
              <div class="flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm">${this.obterIconeTipo(item.tipo)}</span>
                  <input type="text" class="input-item-titulo font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full" value="${item.titulo}" data-dia-idx="${dIdx}" data-item-idx="${iIdx}" />
                </div>
                <input type="text" class="input-item-subtitulo text-[11px] text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full" value="${item.subtitulo || ''}" placeholder="Detalhes, horários, observações..." data-dia-idx="${dIdx}" data-item-idx="${iIdx}" />
                ${item.linkMaps ? `
                  <a href="${item.linkMaps}" target="_blank" class="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-bold hover:underline">
                    📍 Ver no Google Maps
                  </a>
                ` : ''}
              </div>
              <button type="button" class="btn-remover-item text-slate-400 hover:text-rose-500 text-xs" data-dia-idx="${dIdx}" data-item-idx="${iIdx}">
                ✕
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
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

    // 2. Seletor de fotos de capa
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

    // 3. Botão Nova Proposta
    this.container.querySelector('#btn-nova-proposta')?.addEventListener('click', () => {
      this.propostaAtual = {
        cliente_nome: '',
        destino: '',
        valor_total: 0,
        moeda: 'BRL',
        status: 'RASCUNHO',
        itinerario_dias: []
      };
      this.render();
    });

    // 4. Salvar Proposta
    this.container.querySelector('#btn-salvar-proposta')?.addEventListener('click', async () => {
      await this.salvarPropostaAtual();
    });

    // 5. Imprimir Caderno PDF
    this.container.querySelector('#btn-imprimir-pdf')?.addEventListener('click', () => {
      this.atualizarDadosDoFormulario();
      StudioPdfGenerator.imprimirOuSalvarPdf(this.propostaAtual as StudioProposta);
    });

    // 6. Link Público / Copiar Link
    this.container.querySelector('#btn-link-publico')?.addEventListener('click', async () => {
      await this.salvarPropostaAtual();
      if (this.propostaAtual.id) {
        const url = `${window.location.origin}${window.location.pathname}#proposta?id=${this.propostaAtual.id}`;
        navigator.clipboard.writeText(url);
        alert(`Link de aprovação copiado com sucesso para a área de transferência:\n\n${url}`);
      }
    });

    // 7. Efetivar em Viagem
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

    // 8. Adicionar Dia
    this.container.querySelector('#btn-adicionar-dia')?.addEventListener('click', () => {
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

    // 9. Ações na tabela
    this.container.querySelectorAll('.btn-carregar-proposta').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          const p = this.propostasSalvas.find(item => item.id === id);
          if (p) {
            this.propostaAtual = { ...p };
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

      // Se ainda não houver itinerário, gera automaticamente a linha do tempo inicial
      if (!this.propostaAtual.itinerario_dias || this.propostaAtual.itinerario_dias.length === 0) {
        this.propostaAtual.itinerario_dias = StudioExtractionService.gerarItinerarioDias(extraidos);
      }

      this.render();
    } catch (err: any) {
      alert('Erro na extração dos arquivos: ' + err.message);
    } finally {
      if (statusEl) statusEl.classList.add('hidden');
    }
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
