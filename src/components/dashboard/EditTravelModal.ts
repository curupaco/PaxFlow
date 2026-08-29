import { supabase } from '../../services/supabase';
import { DestinosAutocomplete } from '../DestinosAutocomplete';
import { CommentsService } from '../../services/comments';
import { showCustomConfirm } from '../../services/dialog';
import { SendTemplateMessageModal } from './SendTemplateMessageModal';
import { renderHelpIcon } from '../../utils/helpHelper';
import {
  renderCurrencyInputHTML,
  renderDateInputHTML,
  setupFormValidation,
  formatCurrencyValue,
  formatBrDateToIso,
  parseDoubleBr,
  formatDateBr,
  validateDate
} from '../../utils/masks';
import {
  renderTimelineHTML,
  renderReembolsosTabHTML,
  renderNovoProdutoFormHTML,
  renderLateralEditorPaneHTML,
  renderTrechoRowHTML
} from './DashboardTemplates';

export interface EditTravelModalOptions {
  perfil: any;
  consultores: any[];
  tiposProduto: any[];
  viagens: any[];
  isFallbackMode: boolean;
  user: any;
  onUpdate: () => Promise<void>;
  showToast: (message: string, type: 'success' | 'error', err?: any) => void;
  checkSLA: (viagem: any) => { alert: boolean; type: string | null; text: string };
}

export class EditTravelModal {
  private options: EditTravelModalOptions;
  private tripId!: string;
  private selectedProductId: string | null = null;
  private destAutocomplete: DestinosAutocomplete | null = null;
  private locConferenciasMap: { [locKey: string]: boolean } = {};
  private currentLoadedViagem: any = null;

  constructor(options: EditTravelModalOptions) {
    this.options = options;
  }

  /**
   * Abre o modal buscando os dados atualizados da viagem
   */
  public async open(tripId: string, activeTab: 'detalhes' | 'produtos' = 'detalhes'): Promise<void> {
    this.tripId = tripId;

    // Destruir autocompletes ativos antes de reabrir/re-renderizar
    if (this.destAutocomplete) {
      this.destAutocomplete.destroy();
      this.destAutocomplete = null;
    }
    const oldRows = document.querySelectorAll('.trecho-item-row');
    oldRows.forEach((row: any) => {
      if (row._autocompletes) {
        row._autocompletes.forEach((ac: any) => ac.destroy());
      }
    });
    
    // Carrega conferências do LOC
    this.locConferenciasMap = {};
    if (!this.options.isFallbackMode) {
      try {
        const { data } = await supabase
          .from('loc_conferencias')
          .select('codigo_localizador, conferido')
          .eq('viagem_id', tripId);
        if (data) {
          data.forEach((row: any) => {
            this.locConferenciasMap[row.codigo_localizador.trim().toUpperCase()] = row.conferido;
          });
        }
      } catch (err) {
        console.warn('Erro ao carregar conferências do LOC:', err);
      }
    }
    const localConferenciasSaved = localStorage.getItem(`paxflow-loc-conferencias-${tripId}`);
    if (localConferenciasSaved) {
      try {
        const parsed = JSON.parse(localConferenciasSaved);
        Object.keys(parsed).forEach(k => {
          if (this.locConferenciasMap[k] === undefined) {
            this.locConferenciasMap[k] = parsed[k];
          }
        });
      } catch (e) {}
    }

    try {
      const modalWidthClass = this.selectedProductId ? 'max-w-[1380px]' : 'max-w-6xl';
      this.renderModalOverlay(modalWidthClass);
      
      const modalContent = document.getElementById('modal-content-container');
      if (!modalContent) return;

      modalContent.innerHTML = `
        <div class="p-6 text-center text-slate-500 text-sm font-semibold">
          Carregando dados da viagem...
        </div>
      `;

      let viagem: any = null;
      let errViagem: any = null;
      try {
        if (!this.options.isFallbackMode) {
          const { data, error } = await supabase
            .from('viagens')
            .select('*, cliente:clientes(*), reembolsos(*, produto:produtos_viagem(*)), produtos:produtos_viagem(*), destino_ref:destinos(*)')
            .eq('id', tripId)
            .maybeSingle();
          viagem = data;
          if (viagem && viagem.destino_ref) {
            viagem.destino = `${viagem.destino_ref.nome}, ${viagem.destino_ref.pais}`;
          }
          errViagem = error;
        }
      } catch (e) {
        errViagem = e;
      }

      if (!viagem) {
        // Tenta buscar via RPC SECURITY DEFINER (para Co-Piloto sem bloqueio de RLS)
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc('obter_viagem_co_piloto', { p_trip_id: tripId });
          if (!rpcErr && rpcData) {
            viagem = rpcData;
          }
        } catch (e) {
          console.warn('RPC obter_viagem_co_piloto falhou, usando fallbacks:', e);
        }
      }

      if (!viagem) {
        viagem = (this.options.viagens || []).find(v => v.id === tripId);
      }

      if (!viagem) {
        const saved = localStorage.getItem('paxflow-viagens-local');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            viagem = (parsed || []).find((v: any) => v.id === tripId);
          } catch (e) {}
        }
      }

      if (!viagem) {
        throw errViagem || new Error('Não foi possível carregar os detalhes desta viagem.');
      }

      if (viagem && !viagem.produtos) {
        const cached = localStorage.getItem(`paxflow-produtos-viagem-${tripId}`);
        if (cached) {
          try { viagem.produtos = JSON.parse(cached); } catch (e) {}
        }
      }

      // Busca o consultor de forma separada
      if (viagem && viagem.consultor_id) {
        const { data: consultorData, error: errConsultor } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', viagem.consultor_id)
          .maybeSingle();
        if (!errConsultor && consultorData) {
          viagem.consultor = consultorData;
        } else {
          viagem.consultor = null;
        }
      } else if (viagem) {
        viagem.consultor = null;
      }

      if (viagem) {
        const localProcessoSaved = localStorage.getItem(`paxflow-processo-conferido-${tripId}`);
        if (localProcessoSaved !== null) {
          viagem.processo_conferido = localProcessoSaved === 'true';
        }
      }

      // Verificação de Atendimento Presencial / Balcão (Modo Co-Piloto)
      const currentUserId = this.options.user?.id;
      const userRole = this.options.perfil?.role || 'consultor';
      const isOwner = viagem && (viagem.consultor_id === currentUserId || viagem.consultor_responsavel_id === currentUserId);
      const isCoPiloto = !isOwner && userRole !== 'admin';

      if (isCoPiloto && viagem) {
        const coPilotoNome = this.options.perfil?.nome || 'Consultor';
        const titularNome = this.options.consultores.find(c => c.id === viagem.consultor_id)?.nome || 'Consultor Titular';

        const sessionKey = `paxflow-balcao-logged-${tripId}-${currentUserId}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, 'true');
          await CommentsService.registrarLogAtendimentoBalcao('viagem', tripId, coPilotoNome, currentUserId || 'usr-1');

          const { BalcaoService } = await import('../../services/balcaoService');
          await BalcaoService.gerarAlertaAtendimentoBalcao(
            viagem.consultor_id,
            titularNome,
            viagem.cliente?.nome || 'Cliente',
            coPilotoNome,
            'viagem',
            tripId
          );
        }
        (viagem as any)._isCoPiloto = true;
        (viagem as any)._titularNome = titularNome;
      }

      this.currentLoadedViagem = viagem;

      // Busca lista de clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome', { ascending: true });

      const listaClientes: any[] = clientesData ? [...clientesData] : [];
      if (viagem && viagem.cliente_id) {
        const jaExiste = listaClientes.some(c => c.id === viagem.cliente_id);
        if (!jaExiste) {
          const nomeCliente = viagem.cliente?.nome || viagem.cliente_nome || 'Cliente (Atendimento Balcão)';
          listaClientes.unshift({ id: viagem.cliente_id, nome: nomeCliente });
        }
      }

      // Renderiza a estrutura do Modal com as Abas
      this.renderEdicaoEProdutosModalContent(viagem, listaClientes, activeTab);
      
      // Carrega e exibe os produtos da viagem
      await this.loadAndRenderProdutosViagem(tripId);

    } catch (err: any) {
      console.error('Erro ao carregar detalhes da viagem:', err);
      this.options.showToast('Erro ao carregar detalhes da viagem.', 'error', err);
      this.closeModal();
    }
  }

  private renderEdicaoEProdutosModalContent(v: any, clientes: any[], activeTab: 'detalhes' | 'produtos' = 'detalhes'): void {
    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent) return;

    if (this.selectedProductId && (!v.produtos || !v.produtos.some((p: any) => p.id === this.selectedProductId))) {
      this.selectedProductId = null;
    }
    const selectedProduct = this.selectedProductId
      ? v.produtos?.find((p: any) => p.id === this.selectedProductId)
      : null;

    // Compilar cronograma geral de datas
    const cronograma: { data: string; rotulo: string; tipo: string; cor: string }[] = [];

    const formatarDataLocal = (dStr: string) => {
      if (!dStr) return '';
      const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const parts = dataApenas.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    if (v.data_ida) {
      cronograma.push({
        data: v.data_ida,
        rotulo: '🛫 Embarque / Início da Viagem',
        tipo: 'viagem',
        cor: 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-100/35 dark:border-emerald-900/40'
      });
    }
    if (v.data_volta) {
      cronograma.push({
        data: v.data_volta,
        rotulo: '🛬 Desembarque / Fim da Viagem',
        tipo: 'viagem',
        cor: 'bg-rose-50 dark:bg-rose-950/45 text-rose-700 dark:text-rose-400 border border-rose-100/35 dark:border-rose-900/40'
      });
    }
    if (v.data_financeiro) {
      cronograma.push({
        data: v.data_financeiro,
        rotulo: '💳 Prazo Limite Financeiro',
        tipo: 'financeiro',
        cor: 'bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border border-amber-100/35 dark:border-amber-900/40'
      });
    }

    if (v.produtos && v.produtos.length > 0) {
      v.produtos.forEach((p: any) => {
        const prodTipoUpper = (p.tipo || 'outro').toUpperCase();
        const icon = this.getIconForType(p.tipo);

        if (p.data_servico) {
          cronograma.push({
            data: p.data_servico,
            rotulo: `${icon} [${prodTipoUpper}] ${p.fornecedor} &bull; ${p.descricao} (Data Principal)`,
            tipo: 'produto',
            cor: 'bg-indigo-50 dark:bg-indigo-950/35 text-indigo-700 dark:text-indigo-400 border border-indigo-200/30 dark:border-indigo-900/30'
          });
        }

        // Trechos aéreos no cronograma
        if (p.dados_adicionais && Array.isArray(p.dados_adicionais.trechos)) {
          p.dados_adicionais.trechos.forEach((t: any, idx: number) => {
            const labelTrecho = `${icon} [TRECHO ${idx + 1}] ${t.origem} ➔ ${t.destino}`;
            if (t.dataIda) {
              cronograma.push({
                data: t.dataIda,
                rotulo: `${labelTrecho} &bull; Ida do Trecho`,
                tipo: 'produto-adicional',
                cor: 'bg-indigo-50/75 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30'
              });
            }
            if (t.dataVolta) {
              cronograma.push({
                data: t.dataVolta,
                rotulo: `${labelTrecho} &bull; Volta do Trecho`,
                tipo: 'produto-adicional',
                cor: 'bg-indigo-50/75 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30'
              });
            }
          });
        }

        if (p.datas_adicionais && p.datas_adicionais.length > 0) {
          p.datas_adicionais.forEach((d: any) => {
            cronograma.push({
              data: d.data,
              rotulo: `${icon} [${prodTipoUpper}] ${p.fornecedor} &bull; ${p.descricao} (${d.rotulo})`,
              tipo: 'produto-adicional',
              cor: 'bg-slate-100/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-800/40'
            });
          });
        }
      });
    }

    cronograma.sort((a, b) => a.data.localeCompare(b.data));

    const cronogramaHTML = renderTimelineHTML(cronograma);

    // Prazos e SLAs
    const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r: any) => r.status === 'pago');
    const sla = reembolsoConcluido ? { alert: false, type: null, text: '' } : this.options.checkSLA(v);
    
    const dono = v.consultor;
    const consultorNome = dono ? dono.nome : 'Não atribuído';

    const renderReembolsosHTML = (): string => renderReembolsosTabHTML(v.reembolsos);

    const isSelectedProductLocConferido = selectedProduct 
      ? !!this.locConferenciasMap[(selectedProduct.codigo_reserva || '').trim().toUpperCase()]
      : false;

    const viagemProcessoConferido = !!v.processo_conferido;
    const isAdmin = this.options.perfil?.role === 'admin';

    modalContent.innerHTML = `
      <div class="p-6">
        ${v._isCoPiloto ? `
          <div class="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300 animate-fade-in">
            <div class="flex items-center gap-2">
              <span class="text-base">🤝</span>
              <div>
                <span class="font-extrabold">Modo Co-Piloto (Atendimento Presencial de Balcão)</span>
                <p class="text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80">Você está atendendo o cliente no balcão. O consultor titular continua sendo <strong>${v._titularNome}</strong>.</p>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded bg-amber-500/20 text-[10px] font-black uppercase tracking-wider shrink-0">Auditoria Ativa</span>
          </div>
        ` : ''}

        <!-- Topo com Título e Fechar -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 gap-3">
          <div>
            <h3 class="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-1.5 font-sans">
              ✈️ Gerenciar Viagem ${renderHelpIcon('conferencia-viagem')}
              ${(v.codigoRef || v.codigo_ref) ? `<span class="ml-1 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">${v.codigoRef || v.codigo_ref}</span>` : ''}
            </h3>
            <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold">Destino: <span class="font-bold text-slate-600 dark:text-slate-300">${v.destino}</span> &bull; Loc: <span class="font-bold text-slate-600 dark:text-slate-300">${v.codigo_localizador || 'Sem LOC'}</span></p>
          </div>
          <div class="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <!-- Botão de Processo -->
            ${isAdmin ? `
              <button id="btn-processo-global" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition uppercase shadow-sm border font-sans ${
                viagemProcessoConferido 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-800' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:border-slate-700'
              }">
                ${viagemProcessoConferido ? '✔️ Processo Conferido' : '⚙️ Conferir Processo'}
              </button>
            ` : (viagemProcessoConferido ? `
              <span class="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-[10px] font-black flex items-center gap-1 shadow-sm font-sans">
                ✔️ Processo Conferido
              </span>
            ` : '')}

            <button id="btn-financeiro-global" class="hidden px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition uppercase shadow-sm border font-sans"></button>
            <button id="btn-close-edit-modal-x" class="p-1 text-slate-400 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 font-bold transition text-lg ml-auto sm:ml-0">✕</button>
          </div>
        </div>

        <!-- Seletor de Abas Premium (visível apenas no mobile) -->
        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 mb-5 pb-px lg:hidden overflow-x-auto custom-scrollbar">
          <button id="tab-detalhes-btn" class="border-b-2 ${activeTab === 'detalhes' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'} px-3 py-2 text-xs sm:text-sm transition shrink-0">
            📝 Detalhes e Edição
          </button>
          <button id="tab-produtos-btn" class="border-b-2 ${activeTab === 'produtos' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'} px-3 py-2 text-xs sm:text-sm transition shrink-0">
            🛍️ Produtos e Serviços
          </button>
          ${v.reembolsos && v.reembolsos.length > 0 ? `
            <button id="tab-reembolsos-btn" class="border-b-2 border-transparent px-3 py-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition shrink-0">
              💸 Histórico de Reembolsos
            </button>
          ` : ''}
        </div>

        <!-- CONTEÚDO PRINCIPAL (Grid 3 Colunas no Desktop) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- COLUNA DA ESQUERDA (Detalhes da Viagem e Cronograma) -->
          <div id="tab-detalhes-content" class="space-y-4 ${activeTab === 'produtos' ? 'hidden lg:block' : ''} ${this.selectedProductId ? 'lg:col-span-4' : 'lg:col-span-5'}">
            
            <!-- Perfil do Responsável e SLA -->
            <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800 flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider font-sans">Responsável:</span>
                <select id="edit-viagem-consultor" ${!isAdmin ? 'disabled' : ''} class="text-xs font-extrabold bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer border border-slate-200/60 dark:border-slate-700 rounded-lg px-2 py-1 font-sans">
                  ${this.options.consultores.map(c => `
                    <option value="${c.id}" ${c.id === v.consultor_id ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${c.nome}</option>
                  `).join('')}
                </select>
              </div>

              ${sla.alert ? `
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider font-sans">Alerta SLA:</span>
                  <span class="px-2.5 py-1 rounded-lg text-xs font-black tracking-wide animate-pulse border font-sans ${
                    sla.type === 'pre-embarque' 
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/55' 
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/55'
                  }">
                    ⚠️ ${sla.text}
                  </span>
                </div>
              ` : ''}
            </div>

            <!-- Atalhos de Comunicação -->
            <div class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800 mt-2 flex-wrap">
              <span class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider font-sans">Comunicação:</span>
              <button id="btn-modal-whatsapp" type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-lg text-xs font-bold transition">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.777 1.451 5.51 0 9.997-4.493 10-10.008.002-2.673-1.037-5.186-2.93-7.079-1.892-1.893-4.401-2.934-7.078-2.934-5.518 0-10.007 4.493-10.01 10.01-.001 1.708.455 3.377 1.32 4.887L1.134 22.84l4.513-1.186zm11.23-7.925c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.669.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                WhatsApp
              </button>
              ${v.status === 'pos_viagem' ? `
                <button id="btn-modal-copiar-nps" type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 rounded-lg text-xs font-bold transition" title="Copiar link da pesquisa de NPS para enviar ao cliente">
                  📋 Copiar Link NPS
                </button>
              ` : ''}
            </div>

            <form id="form-editar-viagem" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-sans">Passageiro / Cliente *</label>
                <select id="edit-viagem-cliente" required ${viagemProcessoConferido ? 'disabled' : ''} class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm font-sans">
                  ${clientes.map(c => `<option value="${c.id}" class="bg-white dark:bg-slate-800" ${c.id === v.cliente_id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-sans">Destino *</label>
                <input id="edit-viagem-destino" type="text" required ${viagemProcessoConferido ? 'disabled' : ''} value="${v.destino}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm font-sans" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-sans">Valor Total (R$) *</label>
                ${renderCurrencyInputHTML('edit-viagem-valor', v.valor_total || 0, '0,00', true, viagemProcessoConferido)}
              </div>

              <!-- Datas Responsivas (1 coluna no mobile, 3 colunas no desktop) -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 leading-tight font-sans">Data Ida *</label>
                  ${renderDateInputHTML('edit-viagem-ida', v.data_ida || '', 'DD/MM/AAAA', true, viagemProcessoConferido)}
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 leading-tight font-sans">Data Volta</label>
                  ${renderDateInputHTML('edit-viagem-volta', v.data_volta || '', 'DD/MM/AAAA', false, viagemProcessoConferido)}
                </div>
                <div>
                  <label id="label-edit-viagem-data-financeiro" class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 leading-tight font-sans flex items-center gap-1">Data Finan. ${v.status !== 'fechado' ? '*' : ''} ${renderHelpIcon('data-financeiro')}</label>
                  ${renderDateInputHTML('edit-viagem-data-financeiro', v.data_financeiro || '', 'DD/MM/AAAA', v.status !== 'fechado', viagemProcessoConferido)}
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-sans flex items-center gap-1">Status / Etapa * ${renderHelpIcon('status-viagem')}</label>
                <select id="edit-viagem-status" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm font-sans">
                  <option value="pos_venda" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'fechado' ? 'disabled' : ''} ${v.status === 'pos_venda' ? 'selected' : ''}>Pós-Venda</option>
                  <option value="fechado" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'fechado' ? 'selected' : ''}>Fechado</option>
                  <option value="pre_embarque" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'pre_embarque' ? 'selected' : ''}>Pré-Embarque</option>
                  <option value="pos_viagem" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'pos_viagem' ? 'selected' : ''}>Pós-Viagem</option>
                  <option value="reembolso_solicitado" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'reembolso_solicitado' ? 'selected' : ''}>Reembolso Solicitado</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 font-sans">Observações Operacionais</label>
                <textarea id="edit-viagem-obs" rows="2.5" ${viagemProcessoConferido ? 'disabled' : ''} class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-sm font-medium font-sans">${v.observacoes || ''}</textarea>
              </div>

              <!-- Rodapé Fixo (Sticky Footer) para Ações de Salvamento -->
              <div class="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pt-3 pb-2 z-20 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 font-sans">
                <div class="flex items-center gap-2 w-full sm:w-auto">
                  ${this.options.perfil?.role === 'admin' && !viagemProcessoConferido ? `
                    <button id="btn-excluir-viagem" type="button" class="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-extrabold text-[11px] tracking-wider rounded-xl transition uppercase">
                      Excluir
                    </button>
                  ` : ''}
                </div>

                <div class="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                  <button id="btn-close-edit-modal" type="button" class="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase text-center">
                    Cancelar
                  </button>
                  <button type="submit" class="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 transition uppercase text-center">
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>

            <!-- Seção de Documentos do Cliente -->
            <div class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  📁 Documentos do Passageiro
                </h4>
                <div>
                  <input type="file" id="input-viagem-upload-doc" class="hidden" accept="application/pdf,image/*" />
                  <button id="btn-viagem-upload-doc" type="button" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
                    Anexar Arquivo
                  </button>
                </div>
              </div>
              <div id="viagem-doc-container">
                ${v.cliente?.google_drive_folder_url || v.cliente?.googleDriveFolderUrl ? `
                  <div class="flex items-center justify-between p-3.5 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 rounded-xl border border-indigo-200/30 dark:border-indigo-900/30 transition">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">📄 Passaporte / Documento do Cliente</span>
                    <button id="btn-viagem-view-doc" type="button" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
                      Visualizar
                    </button>
                  </div>
                ` : `
                  <p class="text-xs text-slate-400 dark:text-slate-400 italic">Nenhum documento anexado para este passageiro.</p>
                `}
              </div>
              <div id="viagem-upload-status" class="mt-2 hidden"></div>
            </div>

            <!-- Cronograma Geral de Datas -->
            ${cronogramaHTML}

            <!-- Container de Comentários da Viagem -->
            <div id="viagem-comments-container" class="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4"></div>
          </div>

          <!-- COLUNA DO MEIO (Produtos e Serviços) -->
          <div id="tab-produtos-content" class="space-y-5 tab-pane-transition ${activeTab === 'detalhes' || (this.selectedProductId && activeTab === 'produtos') ? 'hidden' : ''} ${this.selectedProductId ? 'lg:col-span-4 lg:!block' : 'lg:col-span-7 lg:!block'} lg:!mt-0">
            
            <!-- Painel Financeiro (Totalizadores e Saldo Pendente) -->
            <div id="painel-financeiro-produtos" class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800 mb-4">
              <div>
                <span class="block text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider leading-tight">Valor da Venda</span>
                <strong id="fin-valor-venda" class="text-sm font-black text-slate-800 dark:text-slate-100">R$ 0,00</strong>
              </div>
              <div>
                <span class="block text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider leading-tight">Total em Produtos</span>
                <strong id="fin-valor-produtos" class="text-sm font-black text-slate-800 dark:text-slate-100 font-bold">R$ 0,00</strong>
              </div>
              <div>
                <span class="block text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider leading-tight">Saldo Pendente</span>
                <strong id="fin-valor-pendente" class="text-sm font-black text-rose-600 dark:text-rose-400">R$ 0,00</strong>
              </div>
              <div>
                <span class="block text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider leading-tight">Rentabilidade</span>
                <strong id="fin-valor-rentabilidade" class="text-sm font-black text-indigo-600 dark:text-indigo-400">R$ 0,00</strong>
              </div>
            </div>
            
            <!-- Lista de Produtos Existentes -->
            <div>
              <h4 class="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2.5">Produtos Cadastrados nesta Viagem</h4>
              <div id="lista-produtos-viagem-container" class="space-y-2 max-h-[220px] lg:max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                <p class="text-center text-xs text-slate-400 dark:text-slate-400 font-medium py-4">Buscando produtos...</p>
              </div>
            </div>

            <!-- Formulário de Novo Produto (Inline) -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
              ${renderNovoProdutoFormHTML(this.options.tiposProduto)}
            </div>

            <!-- Histórico de Reembolsos (Desktop inline) -->
            ${v.reembolsos && v.reembolsos.length > 0 ? `
              <div id="reembolsos-wrapper-desktop" class="hidden lg:block border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                ${renderReembolsosHTML()}
              </div>
            ` : ''}

          </div>

          <!-- COLUNA DO EDITOR LATERAL (Editor do Produto Selecionado) -->
          ${renderLateralEditorPaneHTML(
            selectedProduct,
            activeTab,
            this.options.tiposProduto,
            (tipo) => this.getIconForType(tipo),
            isSelectedProductLocConferido
          )}

        </div>

        <!-- ABA 3: HISTÓRICO DE REEMBOLSOS (Apenas Mobile) -->
        ${v.reembolsos && v.reembolsos.length > 0 ? `
          <div id="tab-reembolsos-content" class="space-y-4 tab-pane-transition hidden lg:hidden">
            ${renderReembolsosHTML()}
          </div>
        ` : ''}

      </div>
    `;

    // Fechar Modal
    const handleClose = async () => {
      this.closeModal();
      await this.options.onUpdate();
    };
    document.getElementById('btn-close-edit-modal-x')?.addEventListener('click', handleClose);
    document.getElementById('btn-cancel-edit')?.addEventListener('click', handleClose);

    // Enviar WhatsApp (Ações rápidas)
    document.getElementById('btn-modal-whatsapp')?.addEventListener('click', () => {
      SendTemplateMessageModal.open({
        clienteNome: v.cliente?.nome || '',
        clienteTelefone: v.cliente?.telefone || '',
        destino: v.destino,
        localizador: v.codigo_localizador,
        dataIda: v.data_ida,
        viagemId: v.id,
        consultorNome: this.options.consultores.find(c => c.id === v.consultor_id)?.nome || this.options.perfil?.nome || 'Consultor',
        showToast: this.options.showToast
      });
    });

    // Copiar NPS Link
    document.getElementById('btn-modal-copiar-nps')?.addEventListener('click', () => {
      const origin = window.location.origin + window.location.pathname;
      const linkFeedback = `${origin}#feedback?id=${v.id}`;
      navigator.clipboard.writeText(linkFeedback).then(() => {
        this.options.showToast('Link da Pesquisa NPS copiado!', 'success');
      }).catch(err => {
        console.error('Erro ao copiar link NPS:', err);
        this.options.showToast('Erro ao copiar link NPS.', 'error');
      });
    });

    // Toggle Processo Global (topo)
    const btnProcessoGlobal = document.getElementById('btn-processo-global');
    if (btnProcessoGlobal && isAdmin) {
      btnProcessoGlobal.addEventListener('click', async () => {
        const nextStatus = !viagemProcessoConferido;
        const confirmResult = await showCustomConfirm(
          nextStatus 
            ? 'Deseja realmente marcar esta viagem como Processo Conferido? Isso irá bloquear as alterações cadastrais (exceto status e documentos).'
            : 'Deseja realmente remover a conferência de processo desta viagem?',
          nextStatus ? 'Conferência de Processo' : 'Remover Conferência',
          nextStatus ? { confirmText: 'Conferir', cancelText: 'Cancelar' } : { isDestructive: true, confirmText: 'Remover', cancelText: 'Cancelar' }
        );

        if (confirmResult) {
          try {
            if (!this.options.isFallbackMode) {
              const { error } = await supabase
                .from('viagens')
                .update({ processo_conferido: nextStatus })
                .eq('id', this.tripId);
              if (error) throw error;
            }
            
            // Salva localmente
            localStorage.setItem(`paxflow-processo-conferido-${this.tripId}`, String(nextStatus));
            
            this.options.showToast(
              nextStatus ? 'Viagem marcada como Processo Conferido!' : 'Conferência de processo da viagem removida!',
              'success'
            );
            
            // Tenta realizar a transição automática se as validações forem atendidas
            const transicaoRealizada = await this.verificarEExecutarTransicaoAutomatica();

            // Re-abre o modal para atualizar
            await this.open(this.tripId, transicaoRealizada ? 'detalhes' : activeTab);
          } catch (err: any) {
            console.error('Erro ao atualizar processo_conferido:', err);
            this.options.showToast('Erro ao atualizar conferência de processo.', 'error', err);
          }
        }
      });
    }

    // Monitora alteração no campo Status / Etapa para habilitar botões caso a viagem esteja bloqueada
    const statusSelect = document.getElementById('edit-viagem-status') as HTMLSelectElement;
    statusSelect?.addEventListener('change', () => {
      const initialStatus = v.status || '';
      const currentStatus = statusSelect.value;
      
      const btnSalvar = document.getElementById('btn-salvar-viagem') as HTMLButtonElement;
      const btnCancelar = document.getElementById('btn-cancel-edit') as HTMLButtonElement;
      
      if (viagemProcessoConferido) {
        if (currentStatus !== initialStatus) {
          btnSalvar?.removeAttribute('disabled');
          btnSalvar?.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
          
          btnCancelar?.removeAttribute('disabled');
          btnCancelar?.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        } else {
          btnSalvar?.setAttribute('disabled', 'true');
          btnSalvar?.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
          
          btnCancelar?.setAttribute('disabled', 'true');
          btnCancelar?.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
      }
    });

    // Documentos da Viagem / Passageiro
    const btnViagemUpload = document.getElementById('btn-viagem-upload-doc') as HTMLButtonElement;
    const inputViagemUpload = document.getElementById('input-viagem-upload-doc') as HTMLInputElement;
    const viagemUploadStatus = document.getElementById('viagem-upload-status') as HTMLElement;
    const viagemDocContainer = document.getElementById('viagem-doc-container') as HTMLElement;

    btnViagemUpload?.addEventListener('click', () => inputViagemUpload.click());

    inputViagemUpload?.addEventListener('change', async () => {
      const file = inputViagemUpload.files?.[0];
      if (!file) return;

      btnViagemUpload.disabled = true;
      if (viagemUploadStatus) {
        viagemUploadStatus.classList.remove('hidden');
        viagemUploadStatus.innerHTML = `
          <div class="flex items-center gap-2 py-1.5 text-xs font-bold text-slate-500 animate-pulse">
            <div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Enviando arquivo (${file.name})...</span>
          </div>
        `;
      }

      try {
        const { uploadDocumentoCliente } = await import('../../services/googleDrive');
        const clientEmail = v.cliente?.email || 'cliente@paxflow.com';
        const clientTelefone = v.cliente?.telefone || '(11) 99999-9999';

        const result = await uploadDocumentoCliente(
          v.cliente_id,
          v.cliente?.nome || 'Cliente',
          clientEmail,
          clientTelefone,
          file
        );

        if (result.success && result.googleDriveFolderUrl) {
          const { error } = await supabase
            .from('clientes')
            .update({ google_drive_folder_url: result.googleDriveFolderUrl })
            .eq('id', v.cliente_id);

          if (error) throw error;

          this.options.showToast('Documento anexado ao cliente com sucesso!', 'success');

          if (v.cliente) {
            v.cliente.google_drive_folder_url = result.googleDriveFolderUrl;
            v.cliente.googleDriveFolderUrl = result.googleDriveFolderUrl;
          }

          if (viagemDocContainer) {
            viagemDocContainer.innerHTML = `
              <div class="flex items-center justify-between p-3.5 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 rounded-xl border border-indigo-200/30 dark:border-indigo-900/30 transition">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">📄 Passaporte / Documento do Cliente</span>
                <button id="btn-viagem-view-doc" type="button" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
                  Visualizar
                </button>
              </div>
            `;
            
            document.getElementById('btn-viagem-view-doc')?.addEventListener('click', async () => {
              const { DocumentViewer } = await import('../../services/documentViewer');
              DocumentViewer.open(
                `Passaporte - ${v.cliente?.nome || 'Cliente'}.pdf`,
                result.googleDriveFolderUrl,
                'application/pdf',
                v.cliente
              );
            });
          }

          await this.options.onUpdate();
        } else {
          throw new Error(result.error || 'Erro no upload.');
        }
      } catch (err: any) {
        console.error('Erro ao fazer upload do passaporte:', err);
        this.options.showToast('Erro no upload.', 'error', err);
      } finally {
        btnViagemUpload.disabled = false;
        if (viagemUploadStatus) {
          viagemUploadStatus.classList.add('hidden');
          viagemUploadStatus.innerHTML = '';
        }
        inputViagemUpload.value = '';
      }
    });

    const bindViagemViewDoc = () => {
      const docUrl = v.cliente?.google_drive_folder_url || v.cliente?.googleDriveFolderUrl;
      if (docUrl) {
        document.getElementById('btn-viagem-view-doc')?.addEventListener('click', async () => {
          const { DocumentViewer } = await import('../../services/documentViewer');
          DocumentViewer.open(
            `Passaporte - ${v.cliente?.nome || 'Cliente'}.pdf`,
            docUrl,
            'application/pdf',
            v.cliente
          );
        });
      }
    };
    bindViagemViewDoc();

    // Inicializar comentários da viagem
    const commentsContainer = document.getElementById('viagem-comments-container');
    if (commentsContainer && this.options.user) {
      CommentsService.renderCommentsSection(
        commentsContainer,
        'viagem',
        v.id,
        v.id,
        this.options.user.id,
        this.options.consultores
      );
    }

    // Seletores de Abas Premium
    const tabDetalhesBtn = document.getElementById('tab-detalhes-btn');
    const tabProdutosBtn = document.getElementById('tab-produtos-btn');
    const tabReembolsosBtn = document.getElementById('tab-reembolsos-btn');
    
    const tabDetalhesContent = document.getElementById('tab-detalhes-content');
    const tabProdutosContent = document.getElementById('tab-produtos-content');
    const tabReembolsosContent = document.getElementById('tab-reembolsos-content');

    const resetTabs = () => {
      tabDetalhesBtn?.setAttribute('class', 'border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition');
      tabProdutosBtn?.setAttribute('class', 'border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition');
      tabReembolsosBtn?.setAttribute('class', 'border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition');
      
      tabDetalhesContent?.classList.add('hidden');
      tabProdutosContent?.classList.add('hidden');
      tabReembolsosContent?.classList.add('hidden');
    };

    tabDetalhesBtn?.addEventListener('click', () => {
      resetTabs();
      tabDetalhesBtn.className = 'border-b-2 border-indigo-600 dark:border-indigo-400 px-4 py-2 text-sm font-black text-indigo-600 dark:text-indigo-400 transition';
      tabDetalhesContent?.classList.remove('hidden');
    });

    tabProdutosBtn?.addEventListener('click', () => {
      resetTabs();
      tabProdutosBtn.className = 'border-b-2 border-indigo-600 dark:border-indigo-400 px-4 py-2 text-sm font-black text-indigo-600 dark:text-indigo-400 transition';
      tabProdutosContent?.classList.remove('hidden');
    });

    tabReembolsosBtn?.addEventListener('click', () => {
      resetTabs();
      tabReembolsosBtn.className = 'border-b-2 border-indigo-600 dark:border-indigo-400 px-4 py-2 text-sm font-black text-indigo-600 dark:text-indigo-400 transition';
      tabReembolsosContent?.classList.remove('hidden');
    });

    // Inicializa a validação do formulário de edição de viagem
    const editarViagemValidator = setupFormValidation('form-editar-viagem', [
      { id: 'edit-viagem-valor', type: 'currency' },
      { id: 'edit-viagem-ida', type: 'date' },
      { id: 'edit-viagem-volta', type: 'date', required: false },
      { id: 'edit-viagem-data-financeiro', type: 'date', required: true }
    ]);

    let selectedDestinoId: string | null = v.destino_id || v.destinoId || null;
    const inputDestino = document.getElementById('edit-viagem-destino') as HTMLInputElement;
    if (inputDestino) {
      this.destAutocomplete = new DestinosAutocomplete(inputDestino, (destino) => {
        selectedDestinoId = destino ? destino.id : null;
      }, selectedDestinoId);
    }

    const editStatus = document.getElementById('edit-viagem-status') as HTMLSelectElement;
    const inputFinEdit = document.getElementById('edit-viagem-data-financeiro') as HTMLInputElement;
    const labelFinEdit = document.getElementById('label-edit-viagem-data-financeiro');

    const updateEditFinRequired = () => {
      if (!editStatus || !inputFinEdit) return;
      const isRequired = editStatus.value !== 'fechado';
      if (isRequired) {
        inputFinEdit.setAttribute('required', '');
        if (labelFinEdit) labelFinEdit.innerHTML = 'Data Finan. *';
      } else {
        inputFinEdit.removeAttribute('required');
        if (labelFinEdit) labelFinEdit.innerHTML = 'Data Finan.';
      }
      inputFinEdit.dispatchEvent(new Event('input'));
    };

    editStatus?.addEventListener('change', updateEditFinRequired);
    updateEditFinRequired();

    // Submissão do Formulário de Edição da Viagem
    const formEditar = document.getElementById('form-editar-viagem') as HTMLFormElement;
    formEditar?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const clienteId = (document.getElementById('edit-viagem-cliente') as HTMLSelectElement).value;
      const consultorId = (document.getElementById('edit-viagem-consultor') as HTMLSelectElement).value;
      const destino = (document.getElementById('edit-viagem-destino') as HTMLInputElement).value;
      const loc = v.codigo_localizador;
      const valorRaw = (document.getElementById('edit-viagem-valor') as HTMLInputElement).value.trim();
      const dataIdaRaw = (document.getElementById('edit-viagem-ida') as HTMLInputElement).value.trim();
      const dataVoltaRaw = (document.getElementById('edit-viagem-volta') as HTMLInputElement).value.trim();
      const dataFinanceiroRaw = (document.getElementById('edit-viagem-data-financeiro') as HTMLInputElement).value.trim();
      const status = (document.getElementById('edit-viagem-status') as HTMLSelectElement).value;
      const obs = (document.getElementById('edit-viagem-obs') as HTMLTextAreaElement).value;

      if (v.status === 'fechado' && status === 'pos_venda') {
        this.options.showToast('Não é possível alterar o status manualmente de Fechado para Pós-Venda. Essa alteração ocorre automaticamente quando as validações Financeira e de Processo estiverem concluídas.', 'error');
        return;
      }

      if (!editarViagemValidator.validateAll()) {
        this.options.showToast('Preencha todos os campos obrigatórios com valores válidos.', 'error');
        return;
      }

      const dataIdaResult = validateDate(dataIdaRaw);
      if (!dataIdaResult.isValid) {
        this.options.showToast(`Data de Ida inválida: ${dataIdaResult.message}`, 'error');
        return;
      }
      if (dataVoltaRaw) {
        const dataVoltaResult = validateDate(dataVoltaRaw);
        if (!dataVoltaResult.isValid) {
          this.options.showToast(`Data de Volta inválida: ${dataVoltaResult.message}`, 'error');
          return;
        }
      }
      if (status !== 'fechado') {
        const dataFinResult = validateDate(dataFinanceiroRaw);
        if (!dataFinResult.isValid) {
          this.options.showToast(`Data Financeiro inválida: ${dataFinResult.message}`, 'error');
          return;
        }
      }

      const dataIda = formatBrDateToIso(dataIdaRaw)!;
      const dataVolta = formatBrDateToIso(dataVoltaRaw);
      const dataFinanceiro = dataFinanceiroRaw ? formatBrDateToIso(dataFinanceiroRaw) : null;

      if (dataIda && dataVolta) {
        const idaDate = new Date(dataIda);
        const voltaDate = new Date(dataVolta);
        if (voltaDate.getTime() < idaDate.getTime()) {
          this.options.showToast('A data de volta não pode ser anterior à data de ida.', 'error');
          return;
        }
      }

      const valor = parseDoubleBr(valorRaw);

      // Validação de saldo pendente
      if (status !== v.status && status !== 'fechado') {
        let produtos: any[] = [];
        if (!this.options.isFallbackMode) {
          try {
            const { data, error } = await supabase
              .from('produtos_viagem')
              .select('valor_venda, tarifa, taxa, comissao, markup, rav, fornecedor, descricao')
              .eq('viagem_id', v.id);
            if (!error && data) {
              produtos = data;
            }
          } catch (e) {}
        }
        if (produtos.length === 0) {
          const saved = localStorage.getItem(`paxflow-produtos-viagem-${v.id}`);
          if (saved) {
            try { produtos = JSON.parse(saved); } catch (e) {}
          }
        }
        const totalProdutos = produtos.reduce((sum, p) => sum + (Number(p.valor_venda) || 0), 0);
        const pendente = valor - totalProdutos;
        if (Math.abs(pendente) > 0.01) {
          this.options.showToast(`Não é possível alterar o status para "${status.replace('_', ' ')}". Existe um saldo financeiro pendente de R$ ${pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Adicione produtos na aba "Produtos e Serviços" para zerar este saldo.`, 'error');
          return;
        }

        // Validação de detalhamento dos produtos
        const produtoNaoDetalhado = produtos.find(p => {
          const tarifa = Number(p.tarifa) || 0;
          const taxa = Number(p.taxa) || 0;
          const comissao = Number(p.comissao) || 0;
          const markup = Number(p.markup) || 0;
          const rav = Number(p.rav) || 0;
          const totalDet = tarifa + taxa + comissao + markup + rav;
          return Math.abs(Number(p.valor_venda || 0) - totalDet) > 0.01;
        });

        if (produtoNaoDetalhado) {
          this.options.showToast(`Não é possível alterar o status para "${status.replace('_', ' ')}". O produto "${produtoNaoDetalhado.fornecedor} - ${produtoNaoDetalhado.descricao}" não está com seus valores 100% detalhados (soma de Tarifa + Taxa + Comissão deve ser igual ao Valor de Venda do produto).`, 'error');
          return;
        }
      }

      const payload = {
        cliente_id: clienteId,
        consultor_id: consultorId,
        destino: destino,
        destino_id: selectedDestinoId || null,
        codigo_localizador: loc || null,
        valor_total: valor,
        data_ida: dataIda,
        data_volta: dataVolta,
        data_financeiro: dataFinanceiro,
        status: status,
        observacoes: obs || null
      };

      try {
        let { error } = await supabase
          .from('viagens')
          .update(payload)
          .eq('id', v.id);

        if (error) {
          try {
            const { error: rpcErr } = await supabase.rpc('atualizar_viagem_co_piloto', {
              p_trip_id: v.id,
              p_payload: payload
            });
            if (!rpcErr) error = null;
          } catch (e) {}
        }

        if (error) throw error;

        // Atualização local
        const clientObj = clientes.find(c => c.id === clienteId);
        const viagemIdx = this.options.viagens.findIndex(item => item.id === v.id);
        if (viagemIdx !== -1) {
          const existing = this.options.viagens[viagemIdx];
          this.options.viagens[viagemIdx] = {
            ...existing,
            cliente_id: clienteId,
            cliente: clientObj ? { id: clientObj.id, nome: clientObj.nome } : existing.cliente,
            consultor_id: consultorId,
            destino: destino,
            destino_id: selectedDestinoId || null,
            destinoId: selectedDestinoId || null,
            codigo_localizador: loc || null,
            valor_total: valor,
            data_ida: dataIda,
            data_volta: dataVolta,
            data_financeiro: dataFinanceiro,
            status: status,
            observacoes: obs || null,
            updated_at: new Date().toISOString()
          };
        }

        this.options.showToast('Viagem atualizada com sucesso!', 'success');
        this.closeModal();
        await this.options.onUpdate();
      } catch (err: any) {
        console.error('Erro ao editar viagem:', err);
        this.options.showToast('Erro ao editar viagem.', 'error', err);
      }
    });

    // Evento para excluir a viagem
    const btnExcluirViagem = document.getElementById('btn-excluir-viagem');
    btnExcluirViagem?.addEventListener('click', async () => {
      const confirm = await showCustomConfirm(
        'Tem certeza de que deseja excluir permanentemente esta viagem e todos os seus produtos e reembolsos associados? Esta ação não pode ser desfeita.',
        'Excluir Viagem'
      );
      if (!confirm) return;

      try {
        const { error } = await supabase
          .from('viagens')
          .delete()
          .eq('id', v.id);

        if (error) throw error;

        this.options.showToast('Viagem excluída com sucesso!', 'success');
        this.closeModal();
        await this.options.onUpdate();
      } catch (err: any) {
        console.error('Erro ao excluir viagem:', err);
        this.options.showToast('Erro ao excluir viagem.', 'error', err);
      }
    });

    // Evento do formulário de novo produto para exibir campos condicionais
    const prodTipoSelect = document.getElementById('prod-tipo') as HTMLSelectElement;
    const condContainer = document.getElementById('container-campos-condicionais') as HTMLElement;
    const prodFornecedorInput = document.getElementById('prod-fornecedor') as HTMLInputElement;

    prodTipoSelect?.addEventListener('change', () => {
      const selectedType = prodTipoSelect.value;
      const tipoConfig = this.options.tiposProduto.find(t => t.nome === selectedType);

      if (tipoConfig && Array.isArray(tipoConfig.campos_adicionais) && tipoConfig.campos_adicionais.length > 0) {
        condContainer.classList.remove('hidden');

        let fieldsHTML = '';
        tipoConfig.campos_adicionais.forEach((campo: any) => {
          const requiredAttr = campo.obrigatorio ? 'required' : '';
          const label = `${campo.label}${campo.obrigatorio ? ' *' : ''}`;

          if (campo.tipo === 'select') {
            const options = Array.isArray(campo.opcoes) ? campo.opcoes : [];
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">${label}</label>
                <select id="prod-campo-${campo.id}" ${requiredAttr} class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155">
                  <option value="" disabled selected>Selecione...</option>
                  ${options.map((opt: string) => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
              </div>
            `;
          } else if (campo.tipo === 'number') {
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">${label}</label>
                <input type="number" id="prod-campo-${campo.id}" ${requiredAttr} placeholder="${campo.placeholder || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
              </div>
            `;
          } else {
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">${label}</label>
                <input type="text" id="prod-campo-${campo.id}" ${requiredAttr} placeholder="${campo.placeholder || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
              </div>
            `;
          }
        });

        condContainer.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${fieldsHTML}</div>`;

        tipoConfig.campos_adicionais.forEach((campo: any) => {
          const inputEl = document.getElementById(`prod-campo-${campo.id}`);
          if (inputEl) {
            inputEl.addEventListener('change', (ev: any) => {
              const val = ev.target.value;
              if (campo.alvo === 'fornecedor' && val && val !== 'Outra' && val !== 'Outro') {
                prodFornecedorInput.value = val;
              }
            });
          }
        });
      } else {
        condContainer.classList.add('hidden');
        condContainer.innerHTML = '';
      }

      const containerTrechos = document.getElementById('container-trechos-aereo');
      const listaTrechos = document.getElementById('lista-trechos');
      const selectedTypeUpper = (selectedType || '').trim().toUpperCase();
      if (selectedTypeUpper === 'AÉREO OPERADORA' || selectedTypeUpper === 'AÉREO FACIAL') {
        containerTrechos?.classList.remove('hidden');
        if (listaTrechos && listaTrechos.childElementCount === 0) {
          this.addNewTrechoRow(listaTrechos, 0);
        }
      } else {
        containerTrechos?.classList.add('hidden');
        if (listaTrechos) {
          const rows = listaTrechos.querySelectorAll('.trecho-item-row');
          rows.forEach((row: any) => {
            if (row._autocompletes) {
              row._autocompletes.forEach((ac: any) => ac.destroy());
            }
          });
          listaTrechos.innerHTML = '';
        }
      }
    });

    // Inicializa a validação do formulário de novos produtos
    const novoProdutoValidator = setupFormValidation('form-novo-produto', [
      { id: 'prod-venda', type: 'currency' }
    ]);

    // Trechos adicionais dinâmicos
    const btnAddTrecho = document.getElementById('btn-add-trecho');
    btnAddTrecho?.addEventListener('click', () => {
      const listaTrechos = document.getElementById('lista-trechos');
      if (listaTrechos) {
        const nextIndex = listaTrechos.querySelectorAll('.trecho-item-row').length;
        this.addNewTrechoRow(listaTrechos, nextIndex);
      }
    });

    // Datas adicionais dinâmicas
    const btnAddData = document.getElementById('btn-add-data-adicional');
    btnAddData?.addEventListener('click', () => {
      const container = document.getElementById('container-datas-adicionais');
      if (!container) return;

      const rowId = `row-data-adicional-${Date.now()}`;
      const newRow = document.createElement('div');
      newRow.id = rowId;
      newRow.className = 'grid grid-cols-[1fr_1fr_auto] gap-2 items-end bg-slate-100/50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40';
      newRow.innerHTML = `
        <div>
          <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">Rótulo (ex: Check-out)</label>
          <input type="text" placeholder="Rótulo" required class="prod-adicional-rotulo w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
        </div>
        <div>
          <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">Data (DD/MM/AAAA)</label>
          <input type="text" placeholder="DD/MM/AAAA" required class="prod-adicional-data w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
        </div>
        <button type="button" class="btn-remove-data-adicional p-2 hover:bg-rose-50/80 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-lg transition" title="Remover data">
          🗑️
        </button>
      `;
      container.appendChild(newRow);

      const dataInput = newRow.querySelector('.prod-adicional-data') as HTMLInputElement;
      dataInput.addEventListener('input', (ev) => {
        const target = ev.target as HTMLInputElement;
        let val = target.value;
        let digits = val.replace(/\D/g, '');
        if (digits.length > 8) digits = digits.slice(0, 8);
        target.value = formatDateBr(digits);
      });

      newRow.querySelector('.btn-remove-data-adicional')?.addEventListener('click', () => {
        newRow.remove();
      });
    });

    // Submissão de Novo Produto
    const formNovoProduto = document.getElementById('form-novo-produto') as HTMLFormElement;
    formNovoProduto?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const tipo = (document.getElementById('prod-tipo') as HTMLSelectElement).value;
      let fornecedor = (document.getElementById('prod-fornecedor') as HTMLInputElement).value.trim() || 'Não informado';
      let descricao = (document.getElementById('prod-descricao') as HTMLInputElement).value.trim() || 'Sem descrição';

      // Coleta campos dinâmicos
      const tipoConfig = this.options.tiposProduto.find(t => t.nome === tipo);
      const dadosAdicionais: Record<string, any> = {};

      if (tipoConfig && Array.isArray(tipoConfig.campos_adicionais)) {
        for (const campo of tipoConfig.campos_adicionais) {
          const el = document.getElementById(`prod-campo-${campo.id}`) as HTMLInputElement | HTMLSelectElement | null;
          if (el) {
            const val = el.value.trim();
            if (campo.obrigatorio && !val) {
              this.options.showToast(`O campo "${campo.label}" é obrigatório.`, 'error');
              return;
            }
            dadosAdicionais[campo.id] = val;

            if (campo.alvo === 'fornecedor' && val && val !== 'Outra' && val !== 'Outro') {
              fornecedor = val;
            } else if (campo.alvo === 'descricao' && val) {
              descricao = `[${val}] ${descricao}`;
            }
          }
        }
      }

      const reserva = (document.getElementById('prod-reserva') as HTMLInputElement).value.trim();
      const vendaRaw = (document.getElementById('prod-venda') as HTMLInputElement).value.trim();
      
      // Data do serviço e status removidos da UI: usam valores padrão (data de ida da viagem e status emitido)
      const dataServico = v.data_ida;
      const status = 'emitido';

      if (!reserva) {
        this.options.showToast('Por favor, info o Código (LOC) do serviço.', 'error');
        return;
      }
      
      const newLoc = reserva.trim().toUpperCase();
      const isLocConferido = !!this.locConferenciasMap[newLoc];
      if (isLocConferido) {
        this.options.showToast(`O LOC "${newLoc}" já está conferido pelo financeiro e encontra-se bloqueado.`, 'error');
        return;
      }

      if (reserva.length > 20) {
        this.options.showToast('O Código (LOC) deve ter no máximo 20 caracteres.', 'error');
        return;
      }
      if (/\s|[,;\/\\]/.test(reserva)) {
        this.options.showToast('Insira apenas um Código (LOC) por serviço.', 'error');
        return;
      }

      if (!novoProdutoValidator.validateAll()) {
        this.options.showToast('Preencha todos os campos obrigatórios com valores válidos.', 'error');
        return;
      }

      const venda = parseDoubleBr(vendaRaw);

      // Datas adicionais
      const datasAdicionais: { data: string; rotulo: string }[] = [];
      const rotuloInputs = formNovoProduto.querySelectorAll('.prod-adicional-rotulo') as NodeListOf<HTMLInputElement>;
      const dataInputs = formNovoProduto.querySelectorAll('.prod-adicional-data') as NodeListOf<HTMLInputElement>;
      
      let datesValid = true;
      for (let i = 0; i < rotuloInputs.length; i++) {
        const rotulo = rotuloInputs[i].value.trim();
        const dataBr = dataInputs[i].value.trim();
        if (!rotulo || !dataBr) {
          this.options.showToast('Preencha as datas adicionais.', 'error');
          datesValid = false;
          break;
        }

        const dataIso = formatBrDateToIso(dataBr);
        if (!dataIso || !validateDate(dataBr).isValid) {
          this.options.showToast(`A data "${dataBr}" para "${rotulo}" é inválida.`, 'error');
          datesValid = false;
          break;
        }

        datasAdicionais.push({ rotulo, data: dataIso });
      }

      // Coleta trechos aéreos do novo produto se aplicável
      const tipoUpper = (tipo || '').trim().toUpperCase();
      if (tipoUpper === 'AÉREO OPERADORA' || tipoUpper === 'AÉREO FACIAL') {
        const rows = formNovoProduto.querySelectorAll('.trecho-item-row');
        const trechos: any[] = [];
        let trechosValid = true;
        for (const row of Array.from(rows)) {
          const origem = (row.querySelector('.trecho-origem') as HTMLInputElement).value.trim();
          const destino = (row.querySelector('.trecho-destino') as HTMLInputElement).value.trim();
          const dataIdaRaw = (row.querySelector('.trecho-data-ida') as HTMLInputElement).value.trim();
          const dataVoltaRaw = (row.querySelector('.trecho-data-volta') as HTMLInputElement).value.trim();

          if (!origem || !destino || !dataIdaRaw) {
            this.options.showToast('Preencha os campos obrigatórios dos trechos (Origem, Destino e Data Ida).', 'error');
            trechosValid = false;
            break;
          }

          const dataIdaIso = formatBrDateToIso(dataIdaRaw);
          if (!dataIdaIso || !validateDate(dataIdaRaw).isValid) {
            this.options.showToast(`A data de ida "${dataIdaRaw}" do trecho é inválida.`, 'error');
            trechosValid = false;
            break;
          }

          let dataVoltaIso: string | null = null;
          if (dataVoltaRaw) {
            dataVoltaIso = formatBrDateToIso(dataVoltaRaw);
            if (!dataVoltaIso || !validateDate(dataVoltaRaw).isValid) {
              this.options.showToast(`A data de volta "${dataVoltaRaw}" do trecho é inválida.`, 'error');
              trechosValid = false;
              break;
            }
          }

          trechos.push({
            origem,
            destino,
            dataIda: dataIdaIso,
            dataVolta: dataVoltaIso || undefined
          });
        }

        if (!trechosValid) return;
        dadosAdicionais.trechos = trechos;
      }

      if (!datesValid) return;

      const payload = {
        viagem_id: v.id,
        tipo,
        fornecedor,
        descricao,
        codigo_reserva: reserva || null,
        valor_custo: 0,
        valor_venda: venda,
        status,
        data_servico: dataServico,
        datas_adicionais: datasAdicionais,
        dados_adicionais: dadosAdicionais
      };

      try {
        if (!this.options.isFallbackMode) {
          const { error } = await supabase
            .from('produtos_viagem')
            .insert(payload);

          if (error) throw error;
        } else {
          const saved = localStorage.getItem(`paxflow-produtos-viagem-${v.id}`);
          const list = saved ? JSON.parse(saved) : [];
          list.push({
            ...payload,
            id: 'prod-offline-' + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString()
          });
          localStorage.setItem(`paxflow-produtos-viagem-${v.id}`, JSON.stringify(list));
        }

        this.options.showToast('Produto adicionado à viagem com sucesso!', 'success');
        formNovoProduto.reset();

        const containerDatas = document.getElementById('container-datas-adicionais');
        if (containerDatas) containerDatas.innerHTML = '';

        await this.options.onUpdate();
        await this.open(v.id, 'produtos');
      } catch (err: any) {
        console.error('Erro ao adicionar produto:', err);
        this.options.showToast('Erro ao adicionar produto.', 'error', err);
      }
    });

    // Inicializa o editor lateral se houver um produto selecionado
    if (selectedProduct) {
      this.setupProductEditor(selectedProduct, v);
    }
  }

  private setupProductEditor(selectedProduct: any, v: any): void {
    const closeEditor = () => {
      this.selectedProductId = null;
      this.open(v.id, 'produtos');
    };
    document.getElementById('btn-close-product-editor')?.addEventListener('click', closeEditor);
    document.getElementById('edit-btn-cancelar-lateral')?.addEventListener('click', closeEditor);

    const prod = selectedProduct;
    const prodId = prod.id;
    const formEditProd = document.getElementById(`form-editar-produto-lateral-${prodId}`) as HTMLFormElement;
    if (!formEditProd) return;

    const isLocConferido = !!this.locConferenciasMap[prod.codigo_reserva || ''];

    const editarProdutoValidator = setupFormValidation(`form-editar-produto-lateral-${prodId}`, [
      { id: `edit-prod-venda-${prodId}`, type: 'currency' },
      { id: `edit-prod-taxa-${prodId}`, type: 'currency', required: false },
      { id: `edit-prod-comissao-${prodId}`, type: 'currency', required: false },
      { id: `edit-prod-markup-${prodId}`, type: 'currency', required: false },
      { id: `edit-prod-rav-${prodId}`, type: 'currency', required: false }
    ]);

    const editTipoSelect = document.getElementById(`edit-prod-tipo-${prodId}`) as HTMLSelectElement;
    const editCondContainer = document.getElementById(`edit-container-campos-condicionais-${prodId}`) as HTMLElement;
    const editFornecedorInput = document.getElementById(`edit-prod-fornecedor-${prodId}`) as HTMLInputElement;

    const renderDynamicFields = (tipo: string, currentData: any) => {
      const tipoConfig = this.options.tiposProduto.find(t => t.nome === tipo);
      if (tipoConfig && Array.isArray(tipoConfig.campos_adicionais) && tipoConfig.campos_adicionais.length > 0) {
        editCondContainer.classList.remove('hidden');
        let fieldsHTML = '';
        tipoConfig.campos_adicionais.forEach((campo: any) => {
          const requiredAttr = campo.obrigatorio ? 'required' : '';
          const label = `${campo.label}${campo.obrigatorio ? ' *' : ''}`;
          const currentVal = currentData[campo.id] || '';

          if (campo.tipo === 'select') {
            const options = Array.isArray(campo.opcoes) ? campo.opcoes : [];
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">${label}</label>
                <select id="edit-prod-campo-${campo.id}-${prodId}" ${requiredAttr} class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155">
                  <option value="" disabled ${!currentVal ? 'selected' : ''}>Selecione...</option>
                  ${options.map((opt: string) => `<option value="${opt}" ${opt === currentVal ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>
            `;
          } else if (campo.tipo === 'number') {
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">${label}</label>
                <input type="number" id="edit-prod-campo-${campo.id}-${prodId}" ${requiredAttr} value="${currentVal}" placeholder="${campo.placeholder || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
              </div>
            `;
          } else {
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">${label}</label>
                <input type="text" id="edit-prod-campo-${campo.id}-${prodId}" ${requiredAttr} value="${currentVal}" placeholder="${campo.placeholder || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
              </div>
            `;
          }
        });

        editCondContainer.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${fieldsHTML}</div>`;

        tipoConfig.campos_adicionais.forEach((campo: any) => {
          const inputEl = document.getElementById(`edit-prod-campo-${campo.id}-${prodId}`);
          if (inputEl) {
            inputEl.addEventListener('change', (ev: any) => {
              const val = ev.target.value;
              if (campo.alvo === 'fornecedor' && val && val !== 'Outra' && val !== 'Outro') {
                editFornecedorInput.value = val;
              }
            });
          }
        });
      } else {
        editCondContainer.classList.add('hidden');
        editCondContainer.innerHTML = '';
      }
    };

    renderDynamicFields(prod.tipo, prod.dados_adicionais || {});

    editTipoSelect?.addEventListener('change', () => {
      renderDynamicFields(editTipoSelect.value, {});

      const editSecaoTrechos = document.getElementById(`edit-secao-trechos-${prodId}`);
      const editContainerTrechos = document.getElementById(`edit-container-trechos-${prodId}`);
      const editTipoUpper = (editTipoSelect.value || '').trim().toUpperCase();
      if (editTipoUpper === 'AÉREO OPERADORA' || editTipoUpper === 'AÉREO FACIAL') {
        editSecaoTrechos?.classList.remove('hidden');
        if (editContainerTrechos && editContainerTrechos.childElementCount === 0) {
          this.addNewTrechoRow(editContainerTrechos, 0, '', '', '', '', isLocConferido);
        }
      } else {
        editSecaoTrechos?.classList.add('hidden');
        if (editContainerTrechos) {
          const rows = editContainerTrechos.querySelectorAll('.trecho-item-row');
          rows.forEach((row: any) => {
            if (row._autocompletes) {
              row._autocompletes.forEach((ac: any) => ac.destroy());
            }
          });
          editContainerTrechos.innerHTML = '';
        }
      }
    });

    // Trechos Aéreos
    const editContainerTrechos = document.getElementById(`edit-container-trechos-${prodId}`) as HTMLElement;
    if (editContainerTrechos) {
      if (prod.dados_adicionais && Array.isArray(prod.dados_adicionais.trechos)) {
        prod.dados_adicionais.trechos.forEach((t: any, idx: number) => {
          this.addNewTrechoRow(
            editContainerTrechos,
            idx,
            t.origem,
            t.destino,
            t.dataIda ? t.dataIda.split('-').reverse().join('/') : '',
            t.dataVolta ? t.dataVolta.split('-').reverse().join('/') : '',
            isLocConferido
          );
        });
      }

      document.getElementById(`edit-btn-add-trecho-${prodId}`)?.addEventListener('click', () => {
        const nextIndex = editContainerTrechos.querySelectorAll('.trecho-item-row').length;
        this.addNewTrechoRow(editContainerTrechos, nextIndex, '', '', '', '', isLocConferido);
      });
    }

    // Datas adicionais
    const editContainerDatas = document.getElementById(`edit-container-datas-adicionais-${prodId}`) as HTMLElement;
    const addDateRow = (rotulo: string, dataIso: string) => {
      const dataBr = dataIso ? dataIso.split('-').reverse().join('/') : '';
      const rowId = `row-edit-data-adicional-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newRow = document.createElement('div');
      newRow.id = rowId;
      newRow.className = 'grid grid-cols-[1fr_1fr_auto] gap-2 items-end bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/40';
      newRow.innerHTML = `
        <div>
          <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">Rótulo</label>
          <input type="text" placeholder="Rótulo" value="${rotulo}" required class="edit-prod-adicional-rotulo w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
        </div>
        <div>
          <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-0.5">Data</label>
          <input type="text" placeholder="DD/MM/AAAA" value="${dataBr}" required class="edit-prod-adicional-data w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
        </div>
        <button type="button" class="edit-btn-remove-data-adicional p-2 hover:bg-rose-50/80 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-lg transition" title="Remover data">
          🗑️
        </button>
      `;
      editContainerDatas.appendChild(newRow);

      const dataInput = newRow.querySelector('.edit-prod-adicional-data') as HTMLInputElement;
      dataInput.addEventListener('input', (ev) => {
        const target = ev.target as HTMLInputElement;
        let val = target.value;
        let digits = val.replace(/\D/g, '');
        if (digits.length > 8) digits = digits.slice(0, 8);
        target.value = formatDateBr(digits);
      });

      newRow.querySelector('.edit-btn-remove-data-adicional')?.addEventListener('click', () => {
        newRow.remove();
      });
    };

    if (Array.isArray(prod.datas_adicionais)) {
      prod.datas_adicionais.forEach((d: any) => {
        addDateRow(d.rotulo, d.data);
      });
    }

    document.getElementById(`edit-btn-add-data-adicional-${prodId}`)?.addEventListener('click', () => {
      addDateRow('', '');
    });

    const editVendaInput = document.getElementById(`edit-prod-venda-${prodId}`) as HTMLInputElement;
    const editTaxaInput = document.getElementById(`edit-prod-taxa-${prodId}`) as HTMLInputElement;
    const editComissaoInput = document.getElementById(`edit-prod-comissao-${prodId}`) as HTMLInputElement;
    const editMarkupInput = document.getElementById(`edit-prod-markup-${prodId}`) as HTMLInputElement;
    const editRavInput = document.getElementById(`edit-prod-rav-${prodId}`) as HTMLInputElement;
    const editTarifaInput = document.getElementById(`edit-prod-tarifa-${prodId}`) as HTMLInputElement;
    const totalDistEl = document.getElementById(`edit-det-total-distribuido-${prodId}`) as HTMLElement;
    const rentabilidadeEl = document.getElementById(`edit-det-rentabilidade-${prodId}`) as HTMLElement;
    const saldoPendEl = document.getElementById(`edit-det-saldo-pendente-${prodId}`) as HTMLElement;

    const toggleFieldsState = (enabled: boolean) => {
      const fields = [editTaxaInput, editComissaoInput, editMarkupInput, editRavInput];
      fields.forEach(el => {
        if (!el) return;
        if (enabled) {
          el.removeAttribute('readonly');
          el.classList.remove('cursor-not-allowed', 'text-slate-500', 'dark:text-slate-400', 'bg-slate-50', 'dark:bg-slate-900');
          el.classList.add('bg-transparent', 'text-slate-800', 'dark:text-slate-100');
        } else {
          el.setAttribute('readonly', 'readonly');
          el.classList.remove('bg-transparent', 'text-slate-800', 'dark:text-slate-100');
          el.classList.add('cursor-not-allowed', 'text-slate-500', 'dark:text-slate-400', 'bg-slate-50', 'dark:bg-slate-900');
        }
      });
    };

    const recalcularValoresLocais = () => {
      if (!editVendaInput || !editTaxaInput || !editComissaoInput || !editMarkupInput || !editRavInput || !editTarifaInput || !totalDistEl || !saldoPendEl || !rentabilidadeEl) return;
      const venda = parseDoubleBr(editVendaInput.value) || 0;
      const taxa = parseDoubleBr(editTaxaInput.value) || 0;
      const comissao = parseDoubleBr(editComissaoInput.value) || 0;
      const markup = parseDoubleBr(editMarkupInput.value) || 0;
      const rav = parseDoubleBr(editRavInput.value) || 0;

      let tarifa = venda - (taxa + comissao + markup + rav);
      if (Math.abs(tarifa) < 0.01) {
        tarifa = 0;
      }
      const totalDist = tarifa + taxa + comissao + markup + rav;
      let saldoPend = venda - totalDist;
      if (Math.abs(saldoPend) < 0.01) {
        saldoPend = 0;
      }
      const rentabilidade = comissao + markup + (rav * 0.88);

      editTarifaInput.value = formatCurrencyValue(tarifa);
      totalDistEl.textContent = `R$ ${totalDist.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      rentabilidadeEl.textContent = `R$ ${rentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      saldoPendEl.textContent = `R$ ${saldoPend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

      if (rentabilidade >= 0) {
        rentabilidadeEl.className = 'font-black text-emerald-600 dark:text-emerald-400';
      } else {
        rentabilidadeEl.className = 'font-black text-rose-600 dark:text-rose-400';
      }

      if (Math.abs(saldoPend) > 0.01) {
        saldoPendEl.className = 'font-black text-rose-600 dark:text-rose-400';
      } else {
        saldoPendEl.className = 'font-black text-emerald-600 dark:text-emerald-400';
      }
    };

    if (editVendaInput) {
      editVendaInput.addEventListener('input', () => {
        const venda = parseDoubleBr(editVendaInput.value) || 0;
        toggleFieldsState(venda > 0);
        recalcularValoresLocais();
      });
    }

    [editTaxaInput, editComissaoInput, editMarkupInput, editRavInput].forEach(inp => {
      inp?.addEventListener('input', recalcularValoresLocais);
    });

    if (editVendaInput) {
      const initialVenda = parseDoubleBr(editVendaInput.value) || 0;
      toggleFieldsState(initialVenda > 0);
    }
    recalcularValoresLocais();

    formEditProd.addEventListener('submit', async (e) => {
      e.preventDefault();

      const editTipo = editTipoSelect.value;
      const editFornecedor = editFornecedorInput.value.trim() || 'Não informado';
      const editDescricao = (document.getElementById(`edit-prod-descricao-${prodId}`) as HTMLInputElement).value.trim() || 'Sem descrição';
      const editReserva = (document.getElementById(`edit-prod-reserva-${prodId}`) as HTMLInputElement).value.trim();
      
      // Data do serviço e status removidos da UI: usam valores padrão (data de ida da viagem e status atual/emitido)
      const editDataServico = v.data_ida;
      const editStatus = prod.status || 'emitido';

      const oldLoc = (prod.codigo_reserva || '').trim().toUpperCase();
      const newLoc = editReserva.trim().toUpperCase();
      const isOldLocConferido = !!this.locConferenciasMap[oldLoc];
      const isNewLocConferido = !!this.locConferenciasMap[newLoc];
      if (isOldLocConferido || isNewLocConferido) {
        this.options.showToast('Este LOC está conferido pelo financeiro e encontra-se bloqueado para alterações.', 'error');
        return;
      }

      if (!editReserva) {
        this.options.showToast('Por favor, informe o Código (LOC) do serviço.', 'error');
        return;
      }
      if (editReserva.length > 20) {
        this.options.showToast('O Código (LOC) deve ter no máximo 20 caracteres.', 'error');
        return;
      }
      if (/\s|[,;\/\\]/.test(editReserva)) {
        this.options.showToast('Insira apenas um Código (LOC) por serviço.', 'error');
        return;
      }

      if (!editarProdutoValidator.validateAll()) {
        this.options.showToast('Preencha todos os campos obrigatórios com valores válidos.', 'error');
        return;
      }



      const venda = parseDoubleBr(editVendaInput.value) || 0;
      const taxa = parseDoubleBr(editTaxaInput.value) || 0;
      const comissao = parseDoubleBr(editComissaoInput.value) || 0;
      const markup = parseDoubleBr(editMarkupInput.value) || 0;
      const rav = parseDoubleBr(editRavInput.value) || 0;
      const tarifa = venda - (taxa + comissao + markup + rav);

      const totalDist = tarifa + taxa + comissao + markup + rav;
      if (Math.abs(venda - totalDist) > 0.01) {
        this.options.showToast(`O valor total distribuído deve ser igual ao Valor de Venda do produto.`, 'error');
        return;
      }

      // Dynamic fields
      const tipoConfig = this.options.tiposProduto.find(t => t.nome === editTipo);
      const editDadosAdicionais: Record<string, any> = {};
      if (tipoConfig && Array.isArray(tipoConfig.campos_adicionais)) {
        for (const campo of tipoConfig.campos_adicionais) {
          const el = document.getElementById(`edit-prod-campo-${campo.id}-${prodId}`) as HTMLInputElement | HTMLSelectElement | null;
          if (el) {
            const val = el.value.trim();
            if (campo.obrigatorio && !val) {
              this.options.showToast(`O campo "${campo.label}" é obrigatório.`, 'error');
              return;
            }
            editDadosAdicionais[campo.id] = val;
          }
        }
      }

      // Additional dates
      const editDatasAdicionais: { data: string; rotulo: string }[] = [];
      const rotuloInputs = formEditProd.querySelectorAll('.edit-prod-adicional-rotulo') as NodeListOf<HTMLInputElement>;
      const dataInputs = formEditProd.querySelectorAll('.edit-prod-adicional-data') as NodeListOf<HTMLInputElement>;
      
      let datesValid = true;
      for (let i = 0; i < rotuloInputs.length; i++) {
        const rotulo = rotuloInputs[i].value.trim();
        const dataBr = dataInputs[i].value.trim();
        if (!rotulo || !dataBr) {
          this.options.showToast('Preencha as datas adicionais.', 'error');
          datesValid = false;
          break;
        }

        const dataIso = formatBrDateToIso(dataBr);
        if (!dataIso || !validateDate(dataBr).isValid) {
          this.options.showToast(`A data "${dataBr}" para "${rotulo}" é inválida.`, 'error');
          datesValid = false;
          break;
        }

        editDatasAdicionais.push({ rotulo, data: dataIso });
      }

      // Coleta trechos aéreos do editor lateral se aplicável
      const editTipoUpper = (editTipo || '').trim().toUpperCase();
      if (editTipoUpper === 'AÉREO OPERADORA' || editTipoUpper === 'AÉREO FACIAL') {
        const rows = formEditProd.querySelectorAll('.trecho-item-row');
        const trechos: any[] = [];
        let trechosValid = true;
        for (const row of Array.from(rows)) {
          const origem = (row.querySelector('.trecho-origem') as HTMLInputElement).value.trim();
          const destino = (row.querySelector('.trecho-destino') as HTMLInputElement).value.trim();
          const dataIdaRaw = (row.querySelector('.trecho-data-ida') as HTMLInputElement).value.trim();
          const dataVoltaRaw = (row.querySelector('.trecho-data-volta') as HTMLInputElement).value.trim();

          if (!origem || !destino || !dataIdaRaw) {
            this.options.showToast('Preencha os campos obrigatórios dos trechos (Origem, Destino e Data Ida).', 'error');
            trechosValid = false;
            break;
          }

          const dataIdaIso = formatBrDateToIso(dataIdaRaw);
          if (!dataIdaIso || !validateDate(dataIdaRaw).isValid) {
            this.options.showToast(`A data de ida "${dataIdaRaw}" do trecho é inválida.`, 'error');
            trechosValid = false;
            break;
          }

          let dataVoltaIso: string | null = null;
          if (dataVoltaRaw) {
            dataVoltaIso = formatBrDateToIso(dataVoltaRaw);
            if (!dataVoltaIso || !validateDate(dataVoltaRaw).isValid) {
              this.options.showToast(`A data de volta "${dataVoltaRaw}" do trecho é inválida.`, 'error');
              trechosValid = false;
              break;
            }
          }

          trechos.push({
            origem,
            destino,
            dataIda: dataIdaIso,
            dataVolta: dataVoltaIso || undefined
          });
        }

        if (!trechosValid) return;
        editDadosAdicionais.trechos = trechos;
      }

      if (!datesValid) return;

      const payload = {
        tipo: editTipo,
        fornecedor: editFornecedor,
        descricao: editDescricao,
        codigo_reserva: editReserva || null,
        valor_custo: tarifa + taxa,
        valor_venda: venda,
        tarifa: tarifa,
        taxa: taxa,
        comissao: comissao,
        markup: markup,
        rav: rav,
        status: editStatus,
        data_servico: editDataServico,
        datas_adicionais: editDatasAdicionais,
        dados_adicionais: editDadosAdicionais
      };

      try {
        if (!this.options.isFallbackMode) {
          const { error } = await supabase
            .from('produtos_viagem')
            .update(payload)
            .eq('id', prodId);

          if (error) throw error;
        } else {
          const saved = localStorage.getItem(`paxflow-produtos-viagem-${v.id}`);
          if (saved) {
            const list = JSON.parse(saved);
            const idx = list.findIndex((x: any) => x.id === prodId);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...payload };
              localStorage.setItem(`paxflow-produtos-viagem-${v.id}`, JSON.stringify(list));
            }
          }
        }

        this.options.showToast('Produto atualizado com sucesso!', 'success');
        this.selectedProductId = prodId;

        await this.options.onUpdate();
        await this.open(v.id, 'produtos');
      } catch (err: any) {
        console.error('Erro ao editar produto lateral:', err);
        this.options.showToast('Erro ao editar produto.', 'error', err);
      }
    });
  }

  private async loadAndRenderProdutosViagem(tripId: string): Promise<void> {
    const container = document.getElementById('lista-produtos-viagem-container');
    if (!container) return;

    let produtos: any[] = [];
    let isError = false;

    // 1. Tenta usar os produtos presentes na viagem ja carregada (por exemplo via RPC obter_viagem_co_piloto)
    if (this.currentLoadedViagem && Array.isArray(this.currentLoadedViagem.produtos) && this.currentLoadedViagem.produtos.length > 0) {
      produtos = this.currentLoadedViagem.produtos;
    }

    // 2. Se vazio, consulta a tabela produtos_viagem no Supabase
    if (produtos.length === 0) {
      try {
        const { data, error } = await supabase
          .from('produtos_viagem')
          .select('*')
          .eq('viagem_id', tripId)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          produtos = data;
        }
      } catch (err: any) {
        console.warn('Busca direta de produtos falhou ou foi bloqueada por RLS:', err);
      }
    }

    // 3. Se ainda vazio, chama a RPC SECURITY DEFINER obter_produtos_co_piloto (bypasses RLS)
    if (produtos.length === 0) {
      try {
        const { data: rpcProds, error: rpcErr } = await supabase.rpc('obter_produtos_co_piloto', { p_trip_id: tripId });
        if (!rpcErr && rpcProds && Array.isArray(rpcProds) && rpcProds.length > 0) {
          produtos = rpcProds;
        }
      } catch (e) {
        console.warn('RPC obter_produtos_co_piloto nao disponivel:', e);
      }
    }

    // 4. Fallback final: localStorage
    if (produtos.length === 0) {
      const saved = localStorage.getItem(`paxflow-produtos-viagem-${tripId}`);
      if (saved) {
        try {
          produtos = JSON.parse(saved);
        } catch (e) {
          produtos = [];
        }
      }
    }

    if (produtos.length > 0) {
      localStorage.setItem(`paxflow-produtos-viagem-${tripId}`, JSON.stringify(produtos));
    }

    let formasAtivas: any[] = [];
    let locPagamentos: any[] = [];

    this.locConferenciasMap = {};
    if (!this.options.isFallbackMode) {
      try {
        const { data: dataFormas } = await supabase
          .from('formas_recebimento')
          .select('*')
          .eq('ativo', true);
        if (dataFormas) formasAtivas = dataFormas;

        const { data: dataPags } = await supabase
          .from('loc_pagamentos')
          .select('*, formas_recebimento(*)')
          .eq('viagem_id', tripId);
        if (dataPags) locPagamentos = dataPags;

        const { data: dataConf } = await supabase
          .from('loc_conferencias')
          .select('codigo_localizador, conferido')
          .eq('viagem_id', tripId);
        if (dataConf) {
          dataConf.forEach((row: any) => {
            this.locConferenciasMap[row.codigo_localizador.trim().toUpperCase()] = row.conferido;
          });
        }
      } catch (err) {
        console.warn('Erro ao carregar pagamentos/formas/conferencias do Supabase:', err);
      }
    }

    if (formasAtivas.length === 0) {
      const savedFormas = localStorage.getItem('paxflow-formas-recebimento');
      if (savedFormas) {
        try {
          formasAtivas = JSON.parse(savedFormas).filter((f: any) => f.ativo);
          const nomesFormas = formasAtivas.map(f => (f.nome || '').trim().toUpperCase());
          if (!nomesFormas.includes('DESCONTO')) {
            formasAtivas.push({ id: 'forma-desconto', nome: 'DESCONTO', icone: '🏷️', ativo: true });
          }
          if (!nomesFormas.includes('PREJUÍZO') && !nomesFormas.includes('PREJUIZO')) {
            formasAtivas.push({ id: 'forma-prejuizo', nome: 'PREJUÍZO', icone: '📉', ativo: true });
          }
        } catch (e) {}
      } else {
        formasAtivas = [
          { id: 'forma-pix', nome: 'PIX', icone: '🏦', ativo: true },
          { id: 'forma-credito', nome: 'Cartão de Crédito', icone: '💳', ativo: true },
          { id: 'forma-dinheiro', nome: 'Dinheiro', icone: '💵', ativo: true },
          { id: 'forma-boleto', nome: 'Boleto Bancário', icone: '🧾', ativo: true },
          { id: 'forma-desconto', nome: 'DESCONTO', icone: '🏷️', ativo: true },
          { id: 'forma-prejuizo', nome: 'PREJUÍZO', icone: '📉', ativo: true }
        ];
      }
    }

    const localPagamentosSaved = localStorage.getItem(`paxflow-loc-pagamentos-${tripId}`);
    if (localPagamentosSaved) {
      try {
        const parsed = JSON.parse(localPagamentosSaved);
        if (locPagamentos.length === 0) {
          locPagamentos = parsed;
        }
      } catch (e) {}
    }

    const localConferenciasSaved = localStorage.getItem(`paxflow-loc-conferencias-${tripId}`);
    if (localConferenciasSaved) {
      try {
        const parsed = JSON.parse(localConferenciasSaved);
        Object.keys(parsed).forEach(k => {
          if (this.locConferenciasMap[k] === undefined) {
            this.locConferenciasMap[k] = parsed[k];
          }
        });
      } catch (e) {}
    }

    const viagem = this.options.viagens.find(x => x.id === tripId);
    const valorTotalViagem = viagem ? (Number(viagem.valor_total) || 0) : 0;
    const totalProdutos = produtos.reduce((sum, p) => sum + (Number(p.valor_venda) || 0), 0);
    const totalRentabilidade = produtos.reduce((sum, p) => sum + (Number(p.comissao) || 0) + (Number(p.markup) || 0) + ((Number(p.rav) || 0) * 0.88), 0);
    let saldoPendente = valorTotalViagem - totalProdutos;
    if (Math.abs(saldoPendente) < 0.01) {
      saldoPendente = 0;
    }

    const finValorVenda = document.getElementById('fin-valor-venda');
    const finValorProdutos = document.getElementById('fin-valor-produtos');
    const finValorPendente = document.getElementById('fin-valor-pendente');
    const finValorRentabilidade = document.getElementById('fin-valor-rentabilidade');

    if (finValorVenda) {
      finValorVenda.textContent = `R$ ${valorTotalViagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    if (finValorProdutos) {
      finValorProdutos.textContent = `R$ ${totalProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    if (finValorPendente) {
      finValorPendente.textContent = `R$ ${saldoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      if (Math.abs(saldoPendente) < 0.01) {
        finValorPendente.className = 'text-sm font-black text-emerald-600 dark:text-emerald-400';
      } else {
        finValorPendente.className = 'text-sm font-black text-rose-600 dark:text-rose-400';
      }
    }
    if (finValorRentabilidade) {
      finValorRentabilidade.textContent = `R$ ${totalRentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    if (produtos.length === 0) {
      container.innerHTML = `
        <p class="text-center text-xs text-slate-400 font-medium py-6">
          Nenhum produto cadastrado para esta viagem.
        </p>
      `;
      return;
    }

    let commentsCountMap: { [key: string]: number } = {};
    produtos.forEach(p => { commentsCountMap[p.id] = 0; });
    
    if (!this.options.isFallbackMode) {
      try {
        const productIds = produtos.map(p => p.id);
        const { data: commentsCountData } = await supabase
          .from('comentarios')
          .select('item_id')
          .eq('tipo_item', 'produto')
          .in('item_id', productIds);

        if (commentsCountData) {
          commentsCountData.forEach(c => {
            commentsCountMap[c.item_id] = (commentsCountMap[c.item_id] || 0) + 1;
          });
        }
      } catch (errComm) {
        console.warn('Erro ao carregar contagem de comentários:', errComm);
      }
    }

    const datalist = document.getElementById('existing-locs-list');
    if (datalist) {
      const uniqueLocs = Array.from(new Set(
        produtos
          .map(p => (p.codigo_reserva || '').trim().toUpperCase())
          .filter(loc => loc.length > 0)
      ));
      datalist.innerHTML = uniqueLocs.map(loc => `<option value="${loc}"></option>`).join('');
    }

    const produtosAgrupados: {
      [locKey: string]: {
        loc: string;
        produtos: any[];
        valorVendaTotal: number;
        valorTaxasTotal: number;
        valorRentabilidadeTotal: number;
        isGroupDetalhado: boolean;
      }
    } = {};

    produtos.forEach(p => {
      const locKey = (p.codigo_reserva || 'SEM LOCALIZADOR').trim().toUpperCase();
      if (!produtosAgrupados[locKey]) {
        produtosAgrupados[locKey] = {
          loc: locKey,
          produtos: [],
          valorVendaTotal: 0,
          valorTaxasTotal: 0,
          valorRentabilidadeTotal: 0,
          isGroupDetalhado: true
        };
      }

      produtosAgrupados[locKey].produtos.push(p);
      produtosAgrupados[locKey].valorVendaTotal += Number(p.valor_venda || 0);

      const tarifa = Number(p.tarifa) || 0;
      const taxa = Number(p.taxa) || 0;
      const comissao = Number(p.comissao) || 0;
      const markup = Number(p.markup) || 0;
      const rav = Number(p.rav) || 0;
      const totalDet = tarifa + taxa + comissao + markup + rav;
      const isProdDetalhado = Math.abs(Number(p.valor_venda || 0) - totalDet) < 0.01;
      
      produtosAgrupados[locKey].valorTaxasTotal += taxa;
      produtosAgrupados[locKey].valorRentabilidadeTotal += comissao + markup + (rav * 0.88);

      if (!isProdDetalhado) {
        produtosAgrupados[locKey].isGroupDetalhado = false;
      }
    });

    container.innerHTML = Object.values(produtosAgrupados).map(grupo => {
      const locKey = grupo.loc;
      const isConferido = !!this.locConferenciasMap[locKey.toUpperCase()];
      const isGroupDetalhado = grupo.isGroupDetalhado;
      const valorVendaTotal = grupo.valorVendaTotal;
      const valorTaxasTotal = grupo.valorTaxasTotal;
      const valorRentabilidadeTotal = grupo.valorRentabilidadeTotal;
      const subProdutos = grupo.produtos;

      const innerCardsHTML = subProdutos.map(p => {
        const tipoIcon = this.getIconForType(p.tipo);
        const commentsCount = commentsCountMap[p.id] || 0;
        const isSelected = p.id === this.selectedProductId;
        const selectedBorderClass = isSelected
          ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/10 dark:bg-indigo-950/10 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-500/5'
          : 'border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/80';

        return `
          <div class="product-card-clickable flex items-center justify-between gap-3 p-3 ${selectedBorderClass} border rounded-xl transition cursor-pointer" data-product-id="${p.id}">
            <div class="flex items-start gap-2.5 overflow-hidden w-full">
              <span class="text-lg p-1 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm flex items-center justify-center">${tipoIcon}</span>
              <div class="overflow-hidden flex-1 self-center text-left">
                <span class="block text-xs font-black text-slate-700 dark:text-slate-200 truncate leading-tight">
                  ${p.tipo}
                </span>
              </div>
            </div>
            
            <div class="flex items-center gap-3.5">
              <div class="text-right">
                <span class="block text-xs font-black text-indigo-600 dark:text-indigo-400">R$ ${Number(p.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <button data-comments-prod-id="${p.id}" data-comments-prod-name="${p.fornecedor} - ${p.descricao}" class="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-300 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition text-xs font-bold flex items-center gap-1" title="Notas e Comentários">
                💬 <span class="text-[10px]">${commentsCount}</span>
              </button>
              <button data-delete-prod-id="${p.id}" class="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-300 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition text-xs font-bold ${isConferido ? 'hidden' : ''}" title="Remover Produto">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');

      const rentabilidadeColorClass = valorRentabilidadeTotal >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400';

      const pagamentosGrupo = locPagamentos.filter(lp => (lp.codigo_localizador || '').trim().toUpperCase() === locKey.toUpperCase());
      const totalPagoGrupo = pagamentosGrupo.reduce((sum, lp) => sum + (Number(lp.valor) || 0), 0);

      const hasNoPayment = pagamentosGrupo.length === 0;
      const isPaid = pagamentosGrupo.length > 0 && Math.abs(totalPagoGrupo - valorVendaTotal) <= 0.01;

      let btnPagamentoClass = 'bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border-slate-200 dark:border-slate-700';
      let btnPagamentoContent = '💰 Pagamento';

      if (hasNoPayment) {
        btnPagamentoClass = 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40';
        btnPagamentoContent = '⚠️ Pagamento';
      } else if (isPaid) {
        btnPagamentoClass = 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40';
        btnPagamentoContent = '✔️ Pago';
      }

      let statusPagamentoBadge = '';
      if (pagamentosGrupo.length === 0) {
        statusPagamentoBadge = '';
      } else if (Math.abs(totalPagoGrupo - valorVendaTotal) > 0.01) {
        statusPagamentoBadge = `<span class="px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">⚠️ Incompleto (R$ ${totalPagoGrupo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ ${valorVendaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>`;
      } else {
        statusPagamentoBadge = '';
      }

      const isAdmin = this.options.perfil?.role === 'admin';

      return `
        <div class="loc-group border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden mb-2 shadow-sm">
          <div class="loc-header flex items-center justify-between p-2.5 bg-slate-100/50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80 transition select-none" data-loc-key="${locKey}">
            <div class="flex items-center flex-wrap gap-2.5">
              <span class="loc-chevron inline-block transition-transform duration-200 text-xs text-slate-400 dark:text-slate-400" style="transform: rotate(90deg);">▶</span>
              <span class="px-2 py-0.5 text-[10px] font-black tracking-wider rounded bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 uppercase">${locKey}</span>
              
              ${isAdmin ? `
                <button class="btn-conferir-loc p-1 rounded-lg border text-[9px] font-bold flex items-center justify-center gap-1 shadow-sm transition font-sans ${isConferido ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40' : 'text-slate-400 bg-slate-50 dark:text-slate-400 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}" data-loc="${locKey}">
                  ${isConferido ? '✔️ Conferido' : '⚙️ Conferir'}
                </button>
              ` : (isConferido ? `
                <span class="px-1.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-[9px] font-bold flex items-center gap-1 shadow-sm font-sans">
                  ✔️ Conferido
                </span>
              ` : '')}

              <button class="btn-formas-pagamento-loc p-1 ${btnPagamentoClass} rounded-lg border transition text-[9px] font-bold flex items-center justify-center gap-1 shadow-sm font-sans ${isConferido ? 'opacity-55 cursor-not-allowed' : ''}" data-loc="${locKey}" title="${isConferido ? 'Bloqueado Financeiramente' : 'Definir Formas de Pagamento'}">
                ${btnPagamentoContent}
              </button>

              <span class="text-[10px] font-medium text-slate-400 dark:text-slate-400">
                Venda: <span class="font-extrabold text-indigo-600 dark:text-indigo-400">R$ ${valorVendaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </span>
              
              <span class="text-[10px] font-medium text-slate-400 dark:text-slate-400">
                Taxas: <span class="font-extrabold text-slate-700 dark:text-slate-200">R$ ${valorTaxasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </span>
              
              <span class="text-[10px] font-medium text-slate-400 dark:text-slate-400">
                Rentabilidade: <span class="font-extrabold ${rentabilidadeColorClass}">R$ ${valorRentabilidadeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </span>
              
              ${statusPagamentoBadge}
              ${!isGroupDetalhado ? `<span class="px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">⚠️ Detalhamento Pendente</span>` : ''}
            </div>
            <div class="flex items-center gap-2">
            </div>
          </div>
          
          <div class="loc-body border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/10 dark:bg-slate-900/5 p-2 pl-4 space-y-2 border-l-2 border-l-slate-200 dark:border-l-slate-700">
            ${innerCardsHTML}
          </div>
        </div>
      `;
    }).join('');

    // Acordeões LOC
    container.querySelectorAll('.loc-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling as HTMLElement;
        const chevron = header.querySelector('.loc-chevron') as HTMLElement;
        if (body && chevron) {
          const isHidden = body.classList.contains('hidden');
          if (isHidden) {
            body.classList.remove('hidden');
            chevron.style.transform = 'rotate(90deg)';
          } else {
            body.classList.add('hidden');
            chevron.style.transform = 'rotate(0deg)';
          }
        }
      });
    });

    // Formas de pagamento do LOC
    container.querySelectorAll('.btn-formas-pagamento-loc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const loc = btn.getAttribute('data-loc');
        if (loc) {
          const isLocConferido = !!this.locConferenciasMap[loc.toUpperCase()];
          if (isLocConferido) {
            this.options.showToast('Este LOC está conferido pelo financeiro e encontra-se bloqueado para alterações.', 'error');
            return;
          }
          this.abrirModalPagamentoLoc(loc, produtosAgrupados[loc]?.valorVendaTotal || 0, formasAtivas, locPagamentos);
        }
      });
    });

    // Botão individual de conferência do LOC (apenas admin pode clicar)
    container.querySelectorAll('.btn-conferir-loc').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const loc = btn.getAttribute('data-loc');
        if (!loc) return;
        
        const currentStatus = !!this.locConferenciasMap[loc.toUpperCase()];
        const nextStatus = !currentStatus;

        if (nextStatus) {
          const pagamentosGrupo = locPagamentos.filter(lp => (lp.codigo_localizador || '').trim().toUpperCase() === loc.toUpperCase());
          const totalPagoGrupo = pagamentosGrupo.reduce((sum, lp) => sum + (Number(lp.valor) || 0), 0);
          const valorVendaTotal = produtosAgrupados[loc]?.valorVendaTotal || 0;

          if (pagamentosGrupo.length === 0 || Math.abs(totalPagoGrupo - valorVendaTotal) > 0.01) {
            this.options.showToast('LOC com recebimento pendente.', 'error');
            return;
          }
        }

        try {
          if (!this.options.isFallbackMode) {
            await supabase
              .from('loc_conferencias')
              .delete()
              .eq('viagem_id', this.tripId)
              .eq('codigo_localizador', loc);

            if (nextStatus) {
              const { error } = await supabase
                .from('loc_conferencias')
                .insert({
                  viagem_id: this.tripId,
                  codigo_localizador: loc,
                  conferido: true
                });
              if (error) throw error;
            }
          }

          // Atualiza localmente
          const localKey = `paxflow-loc-conferencias-${this.tripId}`;
          const savedLocal = localStorage.getItem(localKey);
          let localMap: { [key: string]: boolean } = {};
          if (savedLocal) {
            try { localMap = JSON.parse(savedLocal); } catch (e) {}
          }
          if (nextStatus) {
            localMap[loc.toUpperCase()] = true;
          } else {
            delete localMap[loc.toUpperCase()];
          }
          localStorage.setItem(localKey, JSON.stringify(localMap));

          this.options.showToast(
            nextStatus 
              ? `LOC "${loc}" marcado como conferido!` 
              : `Conferência do LOC "${loc}" removida!`, 
            'success'
          );
          
          await this.loadAndRenderProdutosViagem(this.tripId);

          const transicaoRealizada = await this.verificarEExecutarTransicaoAutomatica();
          
          if (this.selectedProductId || transicaoRealizada) {
            await this.open(this.tripId, transicaoRealizada ? 'detalhes' : 'produtos');
          }
        } catch (err: any) {
          console.error('Erro ao atualizar status de conferência do LOC:', err);
          this.options.showToast('Erro ao atualizar conferência do LOC.', 'error', err);
        }
      });
    });

    // Atualização dinâmica do botão de Financeiro Global no topo
    const btnFinanceiroGlobal = document.getElementById('btn-financeiro-global') as HTMLButtonElement;
    if (btnFinanceiroGlobal) {
      const locKeys = Object.keys(produtosAgrupados);
      if (locKeys.length === 0) {
        btnFinanceiroGlobal.classList.add('hidden');
      } else {
        btnFinanceiroGlobal.classList.remove('hidden');
        const checkedCount = locKeys.filter(k => !!this.locConferenciasMap[k]).length;
        const totalCount = locKeys.length;
        
        // Remove classes de cor anteriores
        btnFinanceiroGlobal.className = 'px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition uppercase shadow-sm border font-sans';
        
        if (checkedCount === 0) {
          btnFinanceiroGlobal.classList.add('bg-slate-100', 'hover:bg-slate-200', 'text-slate-500', 'border-slate-200', 'dark:bg-slate-800', 'dark:hover:bg-slate-700', 'dark:text-slate-400', 'dark:border-slate-700');
        } else if (checkedCount === totalCount) {
          btnFinanceiroGlobal.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'text-white', 'border-emerald-700', 'dark:bg-emerald-500/20', 'dark:hover:bg-emerald-500/30', 'dark:text-emerald-400', 'dark:border-emerald-800');
        } else {
          btnFinanceiroGlobal.classList.add('bg-amber-100/50', 'hover:bg-amber-100', 'text-amber-700', 'border-amber-300', 'dark:bg-amber-950/20', 'dark:hover:bg-amber-950/40', 'dark:text-amber-400', 'dark:border-amber-900/50');
        }
        
        btnFinanceiroGlobal.innerHTML = `💸 Financeiro (${checkedCount}/${totalCount})`;

        // Clona botão para remover listeners antigos
        const newBtn = btnFinanceiroGlobal.cloneNode(true) as HTMLButtonElement;
        btnFinanceiroGlobal.parentNode?.replaceChild(newBtn, btnFinanceiroGlobal);

        const isAdmin = this.options.perfil?.role === 'admin';
        if (isAdmin) {
          newBtn.addEventListener('click', async () => {
            if (checkedCount === 0) {
              const hasPendente = locKeys.some(k => {
                const pagamentosGrupo = locPagamentos.filter(lp => (lp.codigo_localizador || '').trim().toUpperCase() === k.toUpperCase());
                const totalPagoGrupo = pagamentosGrupo.reduce((sum, lp) => sum + (Number(lp.valor) || 0), 0);
                const valorVendaTotal = produtosAgrupados[k]?.valorVendaTotal || 0;
                return pagamentosGrupo.length === 0 || Math.abs(totalPagoGrupo - valorVendaTotal) > 0.01;
              });

              if (hasPendente) {
                this.options.showToast('Não é possível conferir: existem LOCs com recebimento pendente.', 'error');
                return;
              }

              const confirmResult = await showCustomConfirm(
                `Deseja realmente marcar todos os ${totalCount} LOCs desta viagem como Conferido Financeiro? Isso irá bloquear as alterações de valores e produtos.`,
                'Conferência Financeira Global',
                { confirmText: 'Conferir Todos', cancelText: 'Cancelar' }
              );
              if (confirmResult) {
                await this.conferirTodosLocs(locKeys, true);
              }
            } else if (checkedCount === totalCount) {
              const confirmResult = await showCustomConfirm(
                `Deseja realmente remover a conferência financeira de todos os ${totalCount} LOCs desta viagem? Isso irá desbloquear as edições.`,
                'Remover Conferência Global',
                { isDestructive: true, confirmText: 'Remover Todos', cancelText: 'Cancelar' }
              );
              if (confirmResult) {
                await this.conferirTodosLocs(locKeys, false);
              }
            }
          });
        } else {
          newBtn.style.cursor = 'default';
          newBtn.classList.remove('hover:bg-slate-200', 'hover:bg-emerald-700', 'hover:bg-amber-100', 'dark:hover:bg-slate-700', 'dark:hover:bg-emerald-500/30', 'dark:hover:bg-amber-950/40');
        }
      }
    }

    // Comentários produto
    container.querySelectorAll('[data-comments-prod-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const prodId = btn.getAttribute('data-comments-prod-id');
        const prodName = btn.getAttribute('data-comments-prod-name') || 'Produto';
        if (!prodId) return;

        CommentsService.openProductCommentsModal(
          prodId,
          this.tripId,
          prodName,
          this.options.user.id,
          this.options.consultores,
          () => {
            this.loadAndRenderProdutosViagem(this.tripId);
          }
        );
      });
    });

    // Excluir produto
    container.querySelectorAll('[data-delete-prod-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const prodId = btn.getAttribute('data-delete-prod-id');
        if (!prodId) return;

        const confirmResult = await showCustomConfirm(
          'Deseja realmente remover este produto da viagem?',
          'Remover Produto',
          { isDestructive: true, confirmText: 'Remover', cancelText: 'Manter' }
        );
        if (confirmResult) {
          try {
            if (!this.options.isFallbackMode) {
              const { error } = await supabase
                .from('produtos_viagem')
                .delete()
                .eq('id', prodId);

              if (error) throw error;
            } else {
              const saved = localStorage.getItem(`paxflow-produtos-viagem-${this.tripId}`);
              if (saved) {
                const list = JSON.parse(saved);
                const updatedList = list.filter((p: any) => p.id !== prodId);
                localStorage.setItem(`paxflow-produtos-viagem-${this.tripId}`, JSON.stringify(updatedList));
              }
            }

            this.options.showToast('Produto removido com sucesso!', 'success');
            await this.options.onUpdate();
            await this.loadAndRenderProdutosViagem(this.tripId);
          } catch (err: any) {
            console.error('Erro ao remover produto:', err);
            this.options.showToast('Erro ao remover produto.', 'error', err);
          }
        }
      });
    });

    // Clicar para editar no painel lateral
    container.querySelectorAll('.product-card-clickable').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        const prodId = card.getAttribute('data-product-id');
        const prod = produtos.find(x => x.id === prodId);
        if (prod) {
          this.selectedProductId = prod.id;
          this.open(this.tripId, 'produtos');
        }
      });
    });
  }

  private getIconForType(tipo: string): string {
    switch (tipo?.toLowerCase()) {
      case 'hotel': return '🏨';
      case 'aéreo':
      case 'aereo': return '🛫';
      case 'seguro': return '🛡️';
      case 'ingresso': return '🎟️';
      case 'transfer': return '🚗';
      case 'cruzeiro': return '🚢';
      case 'aluguel':
      case 'carro': return '🚘';
      case 'pacote': return '📦';
      case 'circuito': return '🚌';
      case 'trem': return '🚊';
      case 'visto': return '🛂';
      default: return '💼';
    }
  }

  private renderModalOverlay(maxWidthClass: string = 'max-w-lg'): void {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'fixed inset-0 modal-overlay-blur z-50 flex items-center justify-center opacity-0 pointer-events-none';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 transform scale-95 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar" id="modal-container">
          <div id="modal-content-container"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const container = document.getElementById('modal-container');
    if (container) {
      container.className = container.className.replace(/\bmax-w-\S+/g, '');
      container.classList.add(maxWidthClass);
    }
    
    setTimeout(() => {
      if (overlay) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
      }
      if (container) {
        container.classList.remove('scale-95');
        container.classList.add('scale-100');
      }
    }, 10);
  }

  private abrirModalPagamentoLoc(
    locKey: string,
    valorVendaTotal: number,
    formasAtivas: any[],
    locPagamentos: any[]
  ): void {
    // 1. Filtrar pagamentos temporários desse LOC
    let tempPagamentos = locPagamentos
      .filter(lp => (lp.codigo_localizador || '').trim().toUpperCase() === locKey.toUpperCase())
      .map(lp => ({
        id: lp.id || 'local_' + Math.random().toString(),
        forma_recebimento_id: lp.forma_recebimento_id,
        valor: Number(lp.valor) || 0,
        formas_recebimento: lp.formas_recebimento || formasAtivas.find(f => f.id === lp.forma_recebimento_id)
      }));

    // 2. Criar overlay do modal
    const overlayId = 'modal-pagamentos-loc-overlay';
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in';
      document.body.appendChild(overlay);
    }

    const recalcularBalanco = () => {
      const totalPago = tempPagamentos.reduce((sum, p) => sum + p.valor, 0);
      let pendente = valorVendaTotal - totalPago;
      if (Math.abs(pendente) < 0.01) {
        pendente = 0;
      }
      return pendente;
    };

    const renderList = () => {
      const listContainer = document.getElementById('pag-loc-adicionados-list');
      if (!listContainer) return;

      if (tempPagamentos.length === 0) {
        listContainer.innerHTML = `
          <p class="text-center text-xs text-slate-400 dark:text-slate-400 font-semibold py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            Nenhuma forma de recebimento adicionada para este LOC.
          </p>
        `;
        return;
      }

      listContainer.innerHTML = tempPagamentos.map(tp => {
        const nomeForma = tp.formas_recebimento?.nome || 'Forma Desconhecida';
        const iconeForma = tp.formas_recebimento?.icone || '💰';
        return `
          <div class="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
            <div class="flex items-center gap-2">
              <span class="text-base">${iconeForma}</span>
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${nomeForma}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-black text-slate-800 dark:text-slate-100">R$ ${tp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <button class="btn-remove-pag-loc text-slate-400 hover:text-rose-500 transition p-1" data-id="${tp.id}">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      // Bind delete buttons
      listContainer.querySelectorAll('.btn-remove-pag-loc').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          tempPagamentos = tempPagamentos.filter(p => p.id !== id);
          updateUI();
        });
      });
    };

    const updateUI = () => {
      const pendente = recalcularBalanco();
      const pendenteEl = document.getElementById('pag-loc-pendente-val');
      if (pendenteEl) {
        pendenteEl.textContent = `R$ ${pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        if (pendente > 0) {
          pendenteEl.className = 'text-xs font-black text-rose-600 dark:text-rose-400';
        } else {
          pendenteEl.className = 'text-xs font-black text-emerald-600 dark:text-emerald-400';
        }
      }

      // Habilita salvar se o saldo pendente for zero OU se a lista de pagamentos estiver vazia (para permitir remover todos)
      const btnSalvar = document.getElementById('btn-pag-loc-salvar') as HTMLButtonElement;
      if (btnSalvar) {
        btnSalvar.disabled = Math.abs(pendente) > 0.01 && tempPagamentos.length > 0;
      }

      // Sugere o saldo pendente como valor padrão no input
      const valorInput = document.getElementById('pag-loc-valor-input') as HTMLInputElement;
      if (valorInput) {
        valorInput.value = pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      renderList();
    };

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-scale-up text-slate-800 dark:text-slate-100">
        <button id="btn-close-pagamentos-loc-modal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm">✕</button>
        
        <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-1 flex items-center gap-1.5 font-sans">
          💰 Forma de Recebimento do LOC
        </h3>
        <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 font-sans">
          LOC: <span class="text-indigo-600 dark:text-indigo-400 font-black">${locKey}</span>
        </p>
        
        <!-- Detalhes do LOC -->
        <div class="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200/40 dark:border-slate-800 mb-4 font-sans">
          <div>
            <span class="block text-[9px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider leading-tight">Valor Total do LOC</span>
            <strong class="text-xs font-black text-slate-800 dark:text-slate-100">R$ ${valorVendaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div>
            <span class="block text-[9px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider leading-tight">Pendente</span>
            <strong id="pag-loc-pendente-val" class="text-xs font-black text-rose-600 dark:text-rose-400">R$ 0,00</strong>
          </div>
        </div>
        
        <!-- Adicionar Novo Pagamento -->
        <div class="space-y-3 mb-4 p-3 bg-slate-50/40 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 font-sans">
          <span class="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wide">Vincular Recebimento</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">Forma *</label>
              <select id="pag-loc-forma-select" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100">
                ${formasAtivas.map(f => `<option value="${f.id}">${f.icone} ${f.nome}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">Valor (R$) *</label>
              <input id="pag-loc-valor-input" type="text" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100" placeholder="0,00" />
            </div>
          </div>
          <button id="btn-pag-loc-add" type="button" class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg transition uppercase">
            ➕ Adicionar Forma
          </button>
        </div>
        
        <!-- Lista de Pagamentos Adicionados -->
        <div class="space-y-2 mb-6 font-sans">
          <span class="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wide">Formas Selecionadas</span>
          <div id="pag-loc-adicionados-list" class="space-y-2 max-h-[120px] overflow-y-auto pr-1">
            <!-- JS render -->
          </div>
        </div>
        
        <!-- Ações -->
        <div class="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 font-sans">
          <button id="btn-pag-loc-salvar" type="button" disabled class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
            Salvar
          </button>
          <button id="btn-pag-loc-cancelar" type="button" class="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] tracking-wider rounded-lg transition uppercase">
            Cancelar
          </button>
        </div>
      </div>
    `;

    // Fechar modal handlers
    const fecharModal = () => {
      overlay.remove();
    };

    document.getElementById('btn-close-pagamentos-loc-modal')?.addEventListener('click', fecharModal);
    document.getElementById('btn-pag-loc-cancelar')?.addEventListener('click', fecharModal);

    // Máscara monetária pro input
    const valInput = document.getElementById('pag-loc-valor-input') as HTMLInputElement;
    valInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      let val = target.value;
      let digits = val.replace(/\D/g, '');
      if (digits.length > 12) {
        digits = digits.slice(0, 12);
      }
      if (!digits) {
        target.value = '0,00';
        return;
      }
      const num = parseInt(digits, 10) / 100;
      target.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    // Evento para adicionar item
    document.getElementById('btn-pag-loc-add')?.addEventListener('click', () => {
      const select = document.getElementById('pag-loc-forma-select') as HTMLSelectElement;
      const formaId = select.value;
      const valorRaw = valInput.value;
      const valor = parseDoubleBr(valorRaw) || 0;

      if (valor <= 0) {
        this.options.showToast('Por favor, informe um valor maior que zero.', 'error');
        return;
      }

      const pendente = recalcularBalanco();
      if (valor > pendente + 0.01) {
        this.options.showToast(`O valor inserido (R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o saldo pendente do LOC (R$ ${pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`, 'error');
        return;
      }

      const selectedFormaObj = formasAtivas.find(f => f.id === formaId);
      tempPagamentos.push({
        id: 'local_' + Date.now().toString(),
        forma_recebimento_id: formaId,
        valor: valor,
        formas_recebimento: selectedFormaObj
      });

      updateUI();
    });

    // Evento para salvar
    document.getElementById('btn-pag-loc-salvar')?.addEventListener('click', async () => {
      const btnSalvar = document.getElementById('btn-pag-loc-salvar') as HTMLButtonElement;
      btnSalvar.disabled = true;
      btnSalvar.textContent = 'Salvando...';

      try {
        if (!this.options.isFallbackMode) {
          // Deleta antigos
          await supabase
            .from('loc_pagamentos')
            .delete()
            .eq('viagem_id', this.tripId)
            .eq('codigo_localizador', locKey);

          // Insere novos
          if (tempPagamentos.length > 0) {
            const insertPayload = tempPagamentos.map(tp => ({
              viagem_id: this.tripId,
              codigo_localizador: locKey,
              forma_recebimento_id: tp.forma_recebimento_id,
              valor: tp.valor
            }));
            const { error } = await supabase
              .from('loc_pagamentos')
              .insert(insertPayload);

            if (error) throw error;
          }
        }

        // Salva localmente (fallback ou sincronização)
        const localSavedKey = `paxflow-loc-pagamentos-${this.tripId}`;
        const allSavedLocal = localStorage.getItem(localSavedKey);
        let localList: any[] = [];
        if (allSavedLocal) {
          try { localList = JSON.parse(allSavedLocal); } catch (e) {}
        }
        // Remove os do LOC atual
        localList = localList.filter(lp => (lp.codigo_localizador || '').trim().toUpperCase() !== locKey.toUpperCase());
        // Adiciona os novos
        tempPagamentos.forEach(tp => {
          localList.push({
            viagem_id: this.tripId,
            codigo_localizador: locKey,
            forma_recebimento_id: tp.forma_recebimento_id,
            valor: tp.valor,
            formas_recebimento: tp.formas_recebimento
          });
        });
        localStorage.setItem(localSavedKey, JSON.stringify(localList));

        this.options.showToast('Formas de pagamento salvas com sucesso!', 'success');
        fecharModal();
        // Recarrega a renderização dos produtos e grupos
        await this.loadAndRenderProdutosViagem(this.tripId);
      } catch (err: any) {
        console.error('Erro ao salvar formas de pagamento do LOC:', err);
        this.options.showToast('Erro ao salvar formas de pagamento.', 'error', err);
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar';
      }
    });

    // Inicializar UI
    updateUI();
  }

  private async conferirTodosLocs(locKeys: string[], conferir: boolean): Promise<void> {
    try {
      if (!this.options.isFallbackMode) {
        // Exclui os registros existentes primeiro para evitar conflitos de unique keys
        await supabase
          .from('loc_conferencias')
          .delete()
          .eq('viagem_id', this.tripId)
          .in('codigo_localizador', locKeys);

        if (conferir) {
          const insertPayload = locKeys.map(k => ({
            viagem_id: this.tripId,
            codigo_localizador: k,
            conferido: true
          }));
          const { error } = await supabase
            .from('loc_conferencias')
            .insert(insertPayload);
          if (error) throw error;
        }
      }

      // Sincroniza localmente
      const localKey = `paxflow-loc-conferencias-${this.tripId}`;
      const localMap: { [key: string]: boolean } = {};
      if (conferir) {
        locKeys.forEach(k => {
          localMap[k.toUpperCase()] = true;
        });
      }
      localStorage.setItem(localKey, JSON.stringify(localMap));

      this.options.showToast(
        conferir 
          ? 'Todos os LOCs foram conferidos e bloqueados com sucesso!' 
          : 'Todas as conferências dos LOCs foram removidas!', 
        'success'
      );
      
      await this.loadAndRenderProdutosViagem(this.tripId);

      const transicaoRealizada = await this.verificarEExecutarTransicaoAutomatica();
      
      if (this.selectedProductId || transicaoRealizada) {
        await this.open(this.tripId, transicaoRealizada ? 'detalhes' : 'produtos');
      }
    } catch (err: any) {
      console.error('Erro na conferência global de LOCs:', err);
      this.options.showToast('Erro ao realizar a operação global.', 'error', err);
    }
  }

  private async verificarEExecutarTransicaoAutomatica(): Promise<boolean> {
    let viagem: any = null;
    if (!this.options.isFallbackMode) {
      try {
        const { data } = await supabase
          .from('viagens')
          .select('*, produtos:produtos_viagem(*)')
          .eq('id', this.tripId)
          .single();
        if (data) viagem = data;
      } catch (e) {}
    }

    if (!viagem) {
      // Fallback local
      viagem = this.options.viagens.find(item => item.id === this.tripId);
      if (viagem) {
        const saved = localStorage.getItem(`paxflow-produtos-viagem-${this.tripId}`);
        if (saved) {
          try { viagem.produtos = JSON.parse(saved); } catch (e) {}
        }
      }
    }

    if (!viagem || viagem.status !== 'fechado') return false;

    // 1. Validação de Processo
    const localProcesso = localStorage.getItem(`paxflow-processo-conferido-${viagem.id}`);
    const processoValido = localProcesso !== null ? localProcesso === 'true' : !!viagem.processo_conferido;

    if (!processoValido) return false;

    // 2. Validação Financeira
    const produtos = viagem.produtos || [];
    if (produtos.length === 0) return false;

    // 2.1. Saldo pendente zerado
    const valorViagem = Number(viagem.valor_total) || 0;
    const totalProdutos = produtos.reduce((sum: number, p: any) => sum + (Number(p.valor_venda) || 0), 0);
    if (Math.abs(valorViagem - totalProdutos) > 0.01) return false;

    // 2.2. Todos os produtos detalhados
    const todosDetalhedos = produtos.every((p: any) => {
      const tarifa = Number(p.tarifa) || 0;
      const taxa = Number(p.taxa) || 0;
      const comissao = Number(p.comissao) || 0;
      const markup = Number(p.markup) || 0;
      const rav = Number(p.rav) || 0;
      const totalDet = tarifa + taxa + comissao + markup + rav;
      return Math.abs(Number(p.valor_venda || 0) - totalDet) < 0.01;
    });
    if (!todosDetalhedos) return false;

    // 2.3. Todos os LOCs conferidos
    let locConfs: any[] = [];
    if (!this.options.isFallbackMode) {
      try {
        const { data } = await supabase
          .from('loc_conferencias')
          .select('codigo_localizador, conferido')
          .eq('viagem_id', viagem.id);
        if (data) locConfs = data;
      } catch (err) {}
    }
    const locConfsMap: { [key: string]: boolean } = {};
    locConfs.forEach(row => {
      locConfsMap[row.codigo_localizador.trim().toUpperCase()] = row.conferido;
    });
    const localKey = `paxflow-loc-conferencias-${viagem.id}`;
    const localSaved = localStorage.getItem(localKey);
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        Object.keys(parsed).forEach(k => {
          if (locConfsMap[k] === undefined) locConfsMap[k] = parsed[k];
        });
      } catch (e) {}
    }

    const locKeys = Array.from(new Set(produtos.map((p: any) => (p.codigo_reserva || 'SEM LOCALIZADOR').trim().toUpperCase())));
    const todosLocsConferidos = locKeys.length > 0 && locKeys.every((k: any) => !!locConfsMap[k]);

    if (!todosLocsConferidos) return false;

    // Executa a transição automática
    try {
      if (!this.options.isFallbackMode) {
        const { error } = await supabase
          .from('viagens')
          .update({ status: 'pos_venda' })
          .eq('id', viagem.id);
        if (error) throw error;
      }

      // Sincroniza na memória local
      const viagemIdx = this.options.viagens.findIndex(item => item.id === viagem.id);
      if (viagemIdx !== -1) {
        this.options.viagens[viagemIdx].status = 'pos_venda';
        this.options.viagens[viagemIdx].updated_at = new Date().toISOString();
      }

      this.options.showToast(
        'Venda validada com sucesso! O status foi alterado automaticamente para Pós-Venda.',
        'success'
      );

      await this.options.onUpdate();
      return true;
    } catch (err) {
      console.error('Erro na transição automática de status:', err);
      this.options.showToast('Erro ao realizar a transição automática de status da venda.', 'error');
      return false;
    }
  }

  private addNewTrechoRow(container: HTMLElement, index: number, origem = '', destino = '', dataIda = '', dataVolta = '', disabled = false): void {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderTrechoRowHTML(index, origem, destino, dataIda, dataVolta, disabled);
    const row = tempDiv.firstElementChild as HTMLElement;
    container.appendChild(row);

    // Adicionar escutadores para formatar datas
    const inputIda = row.querySelector('.trecho-data-ida') as HTMLInputElement;
    const inputVolta = row.querySelector('.trecho-data-volta') as HTMLInputElement;

    const applyMask = (target: HTMLInputElement) => {
      let val = target.value;
      let digits = val.replace(/\D/g, '');
      if (digits.length > 8) digits = digits.slice(0, 8);
      target.value = formatDateBr(digits);
    };

    inputIda?.addEventListener('input', (e) => applyMask(e.target as HTMLInputElement));
    inputVolta?.addEventListener('input', (e) => applyMask(e.target as HTMLInputElement));

    // Inicializar DestinosAutocomplete para Origem e Destino
    const inputOrigem = row.querySelector('.trecho-origem') as HTMLInputElement;
    const inputDest = row.querySelector('.trecho-destino') as HTMLInputElement;
    let acOrigem: any = null;
    let acDest: any = null;

    if (inputOrigem && !disabled) {
      acOrigem = new DestinosAutocomplete(inputOrigem, () => {});
    }
    if (inputDest && !disabled) {
      acDest = new DestinosAutocomplete(inputDest, () => {});
    }

    (row as any)._autocompletes = [acOrigem, acDest].filter(Boolean);

    // Botão de remover trecho
    row.querySelector('.btn-remove-trecho')?.addEventListener('click', () => {
      if ((row as any)._autocompletes) {
        (row as any)._autocompletes.forEach((ac: any) => ac.destroy());
      }
      row.remove();
      this.reindexTrechoRows(container);
    });
  }

  private reindexTrechoRows(container: HTMLElement): void {
    const rows = container.querySelectorAll('.trecho-item-row');
    rows.forEach((row, idx) => {
      row.setAttribute('data-index', String(idx));
    });
  }

  private closeModal(): void {
    if (this.destAutocomplete) {
      this.destAutocomplete.destroy();
      this.destAutocomplete = null;
    }
    // Destruir autocompletes dos trechos
    const rows = document.querySelectorAll('.trecho-item-row');
    rows.forEach((row: any) => {
      if (row._autocompletes) {
        row._autocompletes.forEach((ac: any) => ac.destroy());
      }
    });

    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    if (overlay && container) {
      container.classList.remove('scale-100');
      container.classList.add('scale-95');
      overlay.classList.remove('opacity-100', 'pointer-events-auto');
      overlay.classList.add('opacity-0', 'pointer-events-none');
    }
  }
}
