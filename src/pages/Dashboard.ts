import Sortable from 'sortablejs';
import { supabase, getSessaoAtual, logoutConsultor } from '../services/supabase';
import { Viagem, Cliente, ProdutoViagem, GlobalSettings, PerfilConsultor } from '../types';
import { getAvatarSvg, mesclarAvataresLocais } from '../services/avatars';
import { showCustomConfirm } from '../services/dialog';
import { CommentsService } from '../services/comments';
import {
  renderCurrencyInputHTML,
  renderDateInputHTML,
  setupFormValidation,
  formatCurrencyValue,
  formatBrDateToIso,
  parseDoubleBr,
  formatDateBr,
  validateDate
} from '../utils/masks';

// Injeta estilos premium e animações micro-interativas para SLAs diretamente no DOM
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes borderPulseRed {
      0%, 100% { border-color: #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.4); }
      50% { border-color: #fca5a5; box-shadow: 0 0 2px rgba(239, 68, 68, 0.1); }
    }
    @keyframes borderPulseOrange {
      0%, 100% { border-color: #f97316; box-shadow: 0 0 12px rgba(249, 115, 22, 0.4); }
      50% { border-color: #fdba74; box-shadow: 0 0 2px rgba(249, 115, 22, 0.1); }
    }
    .animate-sla-urgent {
      animation: borderPulseRed 2s infinite ease-in-out;
      border-width: 2px !important;
    }
    .animate-sla-warning {
      animation: borderPulseOrange 2s infinite ease-in-out;
      border-width: 2px !important;
    }
    .kanban-ghost-class {
      opacity: 0.35;
      background-color: rgba(226, 232, 240, 0.8) !important;
      border: 2px dashed #94a3b8 !important;
    }
    .card-viagem {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: grab;
    }
    .card-viagem:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03);
    }
    html.dark .card-viagem:hover {
      box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.3), 0 4px 8px -2px rgba(0, 0, 0, 0.2);
    }
    .kanban-drag-class {
      transform: rotate(1.5deg) scale(1.02);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
      cursor: grabbing !important;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `;
  document.head.appendChild(style);
}

export class Dashboard {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private settings: GlobalSettings = {
    id: '',
    agencyName: 'PaxFlow',
    taxaCancelamentoPadrao: 0,
    prazoReembolsoDias: 3,
    notificacoesAtivas: true,
    emailSuporte: 'suporte@paxflow.com.br'
  };
  
  // Parâmetros de SLA padrão (caso não existam no banco)
  private slaPreEmbarqueDias: number = 7;
  private slaPosViagemDias: number = 3;

  private viagens: any[] = [];
  private consultores: PerfilConsultor[] = [];
  private tiposProduto: any[] = [];
  private selectedConsultantId: string = 'todos';
  private sortables: Sortable[] = [];
  private buscaTermo: string = '';
  private isFallbackMode: boolean = false;
  private realtimeChannel: any = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private selectedProductId: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa o painel operacional: valida autenticação, busca SLAs e dados, e renderiza o quadro.
   */
  public async init(targetId?: string): Promise<void> {
    try {
      // 1. Validar autenticação e perfil
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Por favor, faça o login.');
        return;
      }
      this.user = user;
      this.perfil = perfil;

      // 2. Carregar consultores ativos
      await this.loadConsultores();

      // 3. Carregar configurações globais de SLA
      await this.loadGlobalSettings();

      // Carregar tipos de produtos e serviços cadastrados no banco
      await this.loadTiposProduto();

      // 4. Buscar viagens
      await this.loadViagens();

      // 5. Configurar atualizações em tempo real
      this.setupRealtime();
      this.setupStorageListener();

      // 6. Renderizar interface completa
      this.render();

      // 7. Configurar Drag & Drop com SortableJS
      this.setupDragAndDrop();

      // 8. Deep linking para abrir viagem específica
      if (targetId) {
        await this.openEdicaoEProdutosModal(targetId);
      }

    } catch (err: any) {
      console.error('Erro na inicialização do Dashboard:', err);
      this.renderAuthError(`Ocorreu um erro interno: ${err.message}`);
    }
  }

  /**
   * Configura canal em tempo real do Supabase para atualizar as viagens automaticamente
   */
  private setupRealtime(): void {
    if (this.realtimeChannel) return;

    this.realtimeChannel = supabase
      .channel('operational-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viagens' },
        async (payload: any) => {
          console.log('[Dashboard] Realtime update on viagens:', payload.eventType);
          await this.loadViagens();
          this.render();
          this.setupDragAndDrop();
        }
      )
      .subscribe();
  }

  /**
   * Configura ouvinte para sincronização do localStorage de viagens entre abas
   */
  private setupStorageListener(): void {
    if (this.storageListener) return;

    this.storageListener = (e: StorageEvent) => {
      if (e.key === 'paxflow-viagens-local') {
        console.log('[Dashboard] localStorage update detected for viagens. Reloading...');
        if (this.isFallbackMode) {
          this.loadViagensFromLocalStorage();
          this.render();
          this.setupDragAndDrop();
        } else {
          this.loadViagens().then(() => {
            this.render();
            this.setupDragAndDrop();
          });
        }
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  /**
   * Destrutor da página para limpar listeners globais e sortables
   */
  public destroy(): void {
    this.sortables.forEach(s => s.destroy());
    this.sortables = [];
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
  }

  /**
   * Busca as configurações globais de SLA
   */
  private async loadGlobalSettings(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar global_settings (usando SLAs padrão):', error.message);
        return;
      }

      if (data) {
        this.settings = {
          id: data.id,
          agencyName: data.agency_name || data.agencyName || 'PaxFlow',
          taxaCancelamentoPadrao: data.taxa_cancelamento_padrao || 0,
          prazoReembolsoDias: data.prazo_reembolso_dias || 3,
          notificacoesAtivas: data.notificacoes_ativas ?? true,
          emailSuporte: data.email_suporte || 'suporte@paxflow.com.br',
          googleRefreshToken: data.google_refresh_token,
          slaPreEmbarqueDias: data.sla_pre_embarque_dias,
          slaPosViagemDias: data.sla_pos_viagem_dias
        };
        // Mapeia colunas específicas se presentes no banco de dados
        if (data.sla_pre_embarque_dias !== undefined) {
          this.slaPreEmbarqueDias = Number(data.sla_pre_embarque_dias);
        }
        if (data.sla_pos_viagem_dias !== undefined) {
          this.slaPosViagemDias = Number(data.sla_pos_viagem_dias);
        }
      }
    } catch (err) {
      console.error('Falha ao carregar configurações de SLA:', err);
    }
  }

  /**
   * Busca todos os consultores ativos no sistema (apenas Admins)
   */
  private async loadConsultores(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;

      this.consultores = mesclarAvataresLocais(data || []) as PerfilConsultor[];
    } catch (err: any) {
      console.warn('Erro ao carregar consultores para filtros:', err.message);
      this.consultores = [
        {
          id: this.user?.id || 'me',
          nome: this.perfil?.nome || 'Você',
          email: this.perfil?.email || '',
          role: this.perfil?.role || 'consultor',
          ativo: true
        }
      ];
    }
  }

  /**
   * Carrega os tipos de produtos cadastrados no banco
   */
  private async loadTiposProduto(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('tipos_produto')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      this.tiposProduto = data || [];
    } catch (err: any) {
      console.warn('Erro ao carregar tipos de produto do banco:', err.message);
      this.tiposProduto = [];
    }
  }

  /**
   * Obtém o ícone emoji correspondente a um determinado tipo de produto
   */
  private getIconForType(tipo: string): string {
    const found = this.tiposProduto.find(t => t.nome === tipo);
    if (found) return found.icone;

    const fallbackMap: Record<string, string> = {
      'Aéreo Facial': '✈️',
      'Aéreo Operadora': '✈️',
      'Carro': '🚗',
      'Circuito': '🗺️',
      'Cruzeiro': '🚢',
      'Hotel': '🏨',
      'Passeios': '🎟️',
      'Seguro Viagem': '🛡️',
      'Ingressos': '🎫',
      'Transfer': '🚐',
      'Trem': '🚂',
      'Diversos': '📦',
      'Casas': '🏡',
      'Cias aéreas - Assento/bagagem': '🧳',
      'Cias aéreas - Emissão Com Pontos': '🪙',
      'MUDAR!': '⚠️',
      'voo': '✈️',
      'hotel': '🏨',
      'seguro': '🛡️',
      'passeio': '🎟️',
      'outro': '📦'
    };
    return fallbackMap[tipo] || '📦';
  }

  /**
   * Busca as viagens e realiza o filtro baseado no cargo (Role) do consultor logado
   */
  private async loadViagens(): Promise<void> {
    try {
      this.isFallbackMode = false;
      // Junção com a tabela de clientes e reembolsos para obter informações completas
      let query = supabase
        .from('viagens')
        .select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*)');

      // Regra de Exibição: Consultores normais só veem seus próprios cards; admins veem todos.
      if (this.perfil && this.perfil.role !== 'admin') {
        query = query.eq('consultor_id', this.user.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      let comments: any[] = [];
      if (!this.isFallbackMode) {
        try {
          const { data: cData, error: cError } = await supabase
            .from('comentarios')
            .select('item_id, tipo_item, texto')
            .in('tipo_item', ['viagem', 'produto']);
          if (!cError && cData) {
            comments = cData;
          }
        } catch (errComm) {
          console.warn('Erro ao carregar comentários para busca:', errComm);
        }
      }

      // Agrupa comentários por viagem relacionada
      const tripCommentsMap = new Map<string, string[]>();
      
      // Mapeia IDs de produtos para seus respectivos IDs de viagem
      const productToTripMap = new Map<string, string>();
      (data || []).forEach((v: any) => {
        if (v.produtos && Array.isArray(v.produtos)) {
          v.produtos.forEach((p: any) => {
            productToTripMap.set(p.id, v.id);
          });
        }
      });

      (comments || []).forEach((c: any) => {
        let tripId: string | undefined;
        if (c.tipo_item === 'viagem') {
          tripId = c.item_id;
        } else if (c.tipo_item === 'produto') {
          tripId = productToTripMap.get(c.item_id);
        }

        if (tripId) {
          if (!tripCommentsMap.has(tripId)) {
            tripCommentsMap.set(tripId, []);
          }
          tripCommentsMap.get(tripId)!.push(c.texto);
        }
      });

      this.viagens = (data || []).map((v: any) => {
        return {
          ...v,
          comentarios_busca: tripCommentsMap.get(v.id) || []
        };
      });

      this.saveViagensToLocalStorage();
    } catch (err: any) {
      this.isFallbackMode = true;
      console.warn('Erro ao carregar viagens do banco. Ativando fallback offline:', err.message);
      this.loadViagensFromLocalStorage();
    }
  }

  private saveViagensToLocalStorage(): void {
    localStorage.setItem('paxflow-viagens-local', JSON.stringify(this.viagens));
  }

  private loadViagensFromLocalStorage(): void {
    const saved = localStorage.getItem('paxflow-viagens-local');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (this.perfil && this.perfil.role !== 'admin') {
          this.viagens = parsed.filter((v: any) => v.consultor_id === this.user.id);
        } else {
          this.viagens = parsed;
        }
      } catch (e) {
        this.viagens = [];
      }
    } else {
      this.viagens = [];
    }
  }

  /**
   * Deleta uma viagem e todas as suas dependências (apenas Admins)
   */
  private async deleteViagem(tripId: string): Promise<boolean> {
    if (this.isFallbackMode) {
      this.viagens = this.viagens.filter(v => v.id !== tripId);
      this.saveViagensToLocalStorage();
      return true;
    }

    try {
      // 1. Deletar comentários vinculados
      const { error: errComments } = await supabase
        .from('comentarios')
        .delete()
        .eq('tipo_item', 'viagem')
        .eq('item_id', tripId);
      if (errComments) console.warn('Aviso ao excluir comentários:', errComments.message);

      // 2. Deletar notificações vinculadas
      const { error: errNotifs } = await supabase
        .from('notificacoes')
        .delete()
        .eq('tipo_item', 'viagem')
        .eq('parent_id', tripId);
      if (errNotifs) console.warn('Aviso ao excluir notificações:', errNotifs.message);

      // 3. Deletar reembolsos vinculados
      const { error: errRefunds } = await supabase
        .from('reembolsos')
        .delete()
        .eq('viagem_id', tripId);
      if (errRefunds) console.warn('Aviso ao excluir reembolsos:', errRefunds.message);

      // 4. Deletar produtos vinculados
      const { error: errProducts } = await supabase
        .from('produtos_viagem')
        .delete()
        .eq('viagem_id', tripId);
      if (errProducts) console.warn('Aviso ao excluir produtos:', errProducts.message);

      // 5. Deletar a viagem em si
      const { error: errTrip } = await supabase
        .from('viagens')
        .delete()
        .eq('id', tripId);

      if (errTrip) throw errTrip;

      this.viagens = this.viagens.filter(v => v.id !== tripId);
      this.saveViagensToLocalStorage();
      return true;
    } catch (err: any) {
      console.error('Erro ao deletar viagem:', err);
      return false;
    }
  }

  /**
   * Calcula o status do SLA para uma determinada viagem
   */
  private checkSLA(viagem: any): { alert: boolean; type: 'pre-embarque' | 'pos-viagem' | null; text: string } {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let urgentAlert: { dias: number; text: string } | null = null;

    const checkDateUrgency = (dateStr: string, label: string) => {
      if (!dateStr) return;
      const targetDate = new Date(dateStr + 'T00:00:00');
      targetDate.setHours(0, 0, 0, 0);

      const diferencaTempo = targetDate.getTime() - hoje.getTime();
      const diasRestantes = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

      if (diasRestantes >= 0 && diasRestantes <= this.slaPreEmbarqueDias) {
        if (!urgentAlert || diasRestantes < urgentAlert.dias) {
          urgentAlert = {
            dias: diasRestantes,
            text: `${label} em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`
          };
        }
      }
    };

    // Regra de SLA para "Pré-Embarque"
    if (viagem.status === 'pre_embarque') {
      // 1. Verificar data principal da viagem
      checkDateUrgency(viagem.data_ida, 'Embarque');

      // 2. Verificar datas de cada produto/serviço
      if (viagem.produtos && Array.isArray(viagem.produtos)) {
        viagem.produtos.forEach((p: any) => {
          const icon = this.getIconForType(p.tipo);
          const labelBase = `${icon} ${p.fornecedor}`;

          // Data principal do serviço
          checkDateUrgency(p.data_servico, `${labelBase}`);

          // Datas adicionais
          if (p.datas_adicionais && Array.isArray(p.datas_adicionais)) {
            p.datas_adicionais.forEach((d: any) => {
              checkDateUrgency(d.data, `${labelBase} (${d.rotulo})`);
            });
          }
        });
      }

      if (urgentAlert) {
        return {
          alert: true,
          type: 'pre-embarque',
          text: `⚠️ ${(urgentAlert as any).text}!`
        };
      }
    }

    // Regra de SLA para "Pós-Viagem" (contato obrigatório pós-retorno dentro do prazo de SLA)
    if (viagem.status === 'pos_viagem' && viagem.data_volta) {
      const dataVolta = new Date(viagem.data_volta + 'T00:00:00');
      dataVolta.setHours(0, 0, 0, 0);

      const diferencaTempo = hoje.getTime() - dataVolta.getTime();
      const diasDesdeRetorno = Math.floor(diferencaTempo / (1000 * 60 * 60 * 24));

      if (diasDesdeRetorno >= this.slaPosViagemDias) {
        return {
          alert: true,
          type: 'pos-viagem',
          text: `🚨 SLA Excedido! ${diasDesdeRetorno} dias sem pós-contato.`
        };
      }
    }

    return { alert: false, type: null, text: '' };
  }

  /**
   * Configura o Drag & Drop em cada coluna utilizando SortableJS
   */
  private setupDragAndDrop(): void {
    // Destrói instâncias antigas se houver
    this.sortables.forEach(s => s.destroy());
    this.sortables = [];

    const colunas = ['fechado', 'pos_venda', 'pre_embarque', 'pos_viagem', 'reembolso_solicitado'];

    colunas.forEach(status => {
      const colEl = document.getElementById(`col-${status}`);
      if (!colEl) return;

      const sortable = new Sortable(colEl, {
        group: 'kanban',
        animation: 200,
        ghostClass: 'kanban-ghost-class',
        dragClass: 'kanban-drag-class',
        fallbackTolerance: 3,
        // Handler executado ao soltar o card
        onEnd: async (evt) => {
          const cardEl = evt.item;
          const tripId = cardEl.dataset.tripId;
          const newStatus = evt.to.dataset.status;
          const oldStatus = evt.from.dataset.status;

          if (!tripId || !newStatus || !oldStatus) return;

          // Se nenhuma mudança de coluna ocorreu, avisa sobre reordenação visual
          if (newStatus === oldStatus) {
            this.showToast('Viagem reordenada na coluna!', 'success');
            return;
          }

          // Validação de data financeira se mover para status diferente de 'fechado'
          if (newStatus !== 'fechado') {
            const viagem = this.viagens.find(v => v.id === tripId);
            if (!viagem?.data_financeiro) {
              this.showToast('Não é possível mover a viagem. A Data Financeiro é obrigatória para colunas operacionais (como Pós-Venda). Por favor, defina a data abrindo os detalhes do card.', 'error');
              // Reverte a movimentação no Kanban
              this.render();
              this.setupDragAndDrop();
              return;
            }
          }

          // Validação de saldo pendente se tentar mover para status diferente de 'fechado'
          if (newStatus !== 'fechado') {
            let produtos: any[] = [];
            if (!this.isFallbackMode) {
              try {
                const { data, error } = await supabase
                  .from('produtos_viagem')
                  .select('valor_venda, tarifa, taxa, comissao, fornecedor, descricao')
                  .eq('viagem_id', tripId);
                if (!error && data) {
                  produtos = data;
                }
              } catch (errCheck) {
                console.warn('Erro ao carregar produtos para validação no drag:', errCheck);
              }
            }
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

            const totalProdutos = produtos.reduce((sum, p) => sum + (Number(p.valor_venda) || 0), 0);
            const viagem = this.viagens.find(v => v.id === tripId);
            const valorViagem = viagem ? (Number(viagem.valor_total) || 0) : 0;
            const pendente = valorViagem - totalProdutos;

            if (Math.abs(pendente) > 0.01) {
              this.showToast(`Não é possível avançar a viagem. Existe um saldo financeiro pendente de R$ ${pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Adicione produtos na aba "Produtos e Serviços" para zerar este saldo.`, 'error');
              
              // Reverte a movimentação no Kanban
              this.render();
              this.setupDragAndDrop();
              return;
            }

            // Validação de detalhamento dos produtos
            const produtoNaoDetalhado = produtos.find(p => {
              const tarifa = Number(p.tarifa) || 0;
              const taxa = Number(p.taxa) || 0;
              const comissao = Number(p.comissao) || 0;
              const totalDet = tarifa + taxa + comissao;
              return Math.abs(Number(p.valor_venda || 0) - totalDet) > 0.01;
            });

            if (produtoNaoDetalhado) {
              this.showToast(`Não é possível avançar a viagem. O produto "${produtoNaoDetalhado.fornecedor} - ${produtoNaoDetalhado.descricao}" não está com seus valores 100% detalhados (soma de Tarifa + Taxa + Comissão deve ser igual ao Valor de Venda do produto).`, 'error');
              
              // Reverte a movimentação no Kanban
              this.render();
              this.setupDragAndDrop();
              return;
            }
          }

          // Regra Especial: Se mover para "Reembolso Solicitado", abre o modal
          if (newStatus === 'reembolso_solicitado') {
            this.openRefundModal(tripId, oldStatus);
          } else {
            // 1. Atualização Otimista local
            const viagem = this.viagens.find(v => v.id === tripId);
            if (viagem) viagem.status = newStatus;
            this.saveViagensToLocalStorage();
 
            // Renderização síncrona instantânea (sem piscar a tela com loading spinner)
            this.render();
            this.setupDragAndDrop();
 
            // 2. Atualização assíncrona no Supabase
            try {
              const { error } = await supabase
                .from('viagens')
                .update({ status: newStatus })
                .eq('id', tripId);
 
              if (error) throw error;
 
              this.showToast('Status da viagem updated com sucesso!', 'success');
              this.saveViagensToLocalStorage();
            } catch (err: any) {
              console.error('Erro ao atualizar status:', err);
              this.showToast('Erro ao atualizar status da viagem.', 'error');
              
              // Se falhar, reverte o status da viagem na memória
              if (viagem) viagem.status = oldStatus;
              this.saveViagensToLocalStorage();
              
              // Re-renderiza para devolver o card para a coluna antiga
              this.render();
              this.setupDragAndDrop();
            }
          }
        }
      });

      this.sortables.push(sortable);
    });

    // Habilita reordenação das colunas (estágios) no Kanban!
    const boardEl = document.getElementById('kanban-columns-container');
    if (boardEl) {
      const columnSortable = new Sortable(boardEl, {
        animation: 200,
        handle: '.column-header', // Permite arrastar segurando pelo cabeçalho da coluna
        ghostClass: 'kanban-ghost-class',
        onEnd: () => {
          this.showToast('Ordem das colunas atualizada visualmente!', 'success');
        }
      });
      this.sortables.push(columnSortable);
    }
  }

  /**
   * Abre o Modal Dinâmico para solicitação de reembolso de um produto
   */
  private async openRefundModal(tripId: string, oldStatus: string): Promise<void> {
    this.renderModalOverlay('max-w-lg');

    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent) return;

    try {
      // Busca os produtos vinculados à viagem
      const { data: produtos, error } = await supabase
        .from('produtos_viagem')
        .select('*')
        .eq('viagem_id', tripId);

      if (error) throw error;

      if (!produtos || produtos.length === 0) {
        modalContent.innerHTML = `
          <div class="p-6 text-center">
            <div class="text-amber-500 text-4xl mb-3">⚠️</div>
            <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Nenhum produto cadastrado</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Esta viagem não possui produtos/serviços vinculados para reembolso.</p>
            <button id="btn-cancel-modal" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition">
              Voltar
            </button>
          </div>
        `;
        document.getElementById('btn-cancel-modal')?.addEventListener('click', () => {
          this.closeModal();
          this.render();
          this.setupDragAndDrop();
        });
        return;
      }

      // Renderiza o formulário de reembolso no modal
      modalContent.innerHTML = `
        <div class="p-6">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span class="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-lg text-lg">💸</span>
              Solicitar Reembolso / Cancelamento
            </h3>
            <button id="btn-close-x" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 transition text-lg">&times;</button>
          </div>
          
          <form id="form-reembolso" class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Selecione o Produto a Cancelar *</label>
              <select id="select-produto" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium">
                <option value="" disabled selected class="text-slate-400 dark:text-slate-500">Escolha um produto da viagem...</option>
                ${produtos.map(p => `
                  <option value="${p.id}" data-valor="${p.valor_venda}" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                    [${p.tipo.toUpperCase()}] ${p.fornecedor} - ${p.descricao} (Venda: R$ ${Number(p.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor do Reembolso Solicitado (R$) *</label>
              ${renderCurrencyInputHTML('input-valor-reembolso', '')}
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">Sugerido por padrão o valor integral de venda do produto.</p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Motivo / Justificativa do Cancelamento</label>
              <textarea id="textarea-motivo" placeholder="Justifique o motivo do cancelamento para documentar o processo..." rows="3" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800 dark:text-slate-100 text-sm font-medium"></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button id="btn-cancel-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition uppercase text-xs tracking-wider">Cancelar</button>
              <button type="submit" class="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-rose-500/20 transition uppercase">Solicitar Reembolso</button>
            </div>
          </form>
        </div>
      `;

      // Inicializa a validação do formulário de reembolso
      setupFormValidation('form-reembolso', [
        { id: 'input-valor-reembolso', type: 'currency' }
      ]);

      // Auto-preenche o valor do reembolso quando um produto é selecionado
      const selectProd = document.getElementById('select-produto') as HTMLSelectElement;
      const inputValor = document.getElementById('input-valor-reembolso') as HTMLInputElement;
      
      selectProd?.addEventListener('change', () => {
        const option = selectProd.options[selectProd.selectedIndex];
        const valorVenda = option.getAttribute('data-valor');
        if (valorVenda) {
          inputValor.value = formatCurrencyValue(parseFloat(valorVenda));
        }
      });

      const handleCancel = () => {
        this.closeModal();
        this.render();
        this.setupDragAndDrop();
      };
      
      document.getElementById('btn-close-x')?.addEventListener('click', handleCancel);
      document.getElementById('btn-cancel-modal')?.addEventListener('click', handleCancel);

      // Tratamento do envio do formulário
      const form = document.getElementById('form-reembolso') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedProdId = selectProd.value;
        const valorReembolso = parseDoubleBr(inputValor.value);
        const motivo = (document.getElementById('textarea-motivo') as HTMLTextAreaElement).value;

        if (!selectedProdId || !valorReembolso || !motivo) {
          this.showToast('Preencha todos os campos obrigatórios.', 'error');
          return;
        }

        try {
          // 1. Criar a solicitação na tabela 'reembolsos'
          const { error: errorReembolso } = await supabase
            .from('reembolsos')
            .insert({
              viagem_id: tripId,
              produto_viagem_id: selectedProdId,
              consultor_solicitante_id: this.user.id,
              valor_solicitado: valorReembolso,
              motivo_cancelamento: motivo,
              status: 'Aguardando Fornecedor',
              data_solicitacao: new Date().toISOString().split('T')[0]
            });

          if (errorReembolso) throw errorReembolso;

          // 2. Atualizar o status da Viagem para 'reembolso_solicitado'
          const { error: errorViagem } = await supabase
            .from('viagens')
            .update({ status: 'reembolso_solicitado' })
            .eq('id', tripId);

          if (errorViagem) throw errorViagem;

          // 3. Atualizar o status do Produto para 'cancelado' ou 'reembolsado'
          const { error: errorProd } = await supabase
            .from('produtos_viagem')
            .update({ status: 'reembolsado' })
            .eq('id', selectedProdId);

          if (errorProd) throw errorProd;

          this.showToast('Reembolso solicitado e cadastrado com sucesso!', 'success');
          this.closeModal();
          this.init(); // Recarrega o quadro atualizado
        } catch (err: any) {
          console.error('Erro ao processar reembolso:', err);
          this.showToast('Erro interno ao processar solicitação de reembolso.', 'error');
        }
      });

    } catch (err: any) {
      console.error('Erro ao abrir modal:', err);
      this.closeModal();
      this.render();
      this.setupDragAndDrop();
    }
  }

  /**
   * Exibe uma caixa flutuante de carregamento (Skeleton loader)
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 p-8 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-semibold animate-pulse">Carregando painel operacional da agência...</p>
      </div>
    `;
  }

  /**
   * Exibe tela de erro de autenticação ou carregamento
   */
  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-white border border-slate-100 p-8 rounded-2xl shadow-xl text-center">
          <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
          <h2 class="text-xl font-bold text-slate-800 mb-2">Erro de Autenticação</h2>
          <p class="text-slate-500 text-sm mb-6">${msg}</p>
          <button id="btn-login-redirect" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition">
            Ir para Login
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('btn-login-redirect')?.addEventListener('click', () => {
      // Caso haja fluxo de navegação, redirecionar para a home
      window.location.reload();
    });
  }

  /**
   * Abre o Modal Interativo de Criação de Viagem / Card
   */
  private async openNovaViagemModal(): Promise<void> {
    try {
      this.renderModalOverlay('max-w-lg');
      const modalContent = document.getElementById('modal-content-container');
      if (!modalContent) return;

      modalContent.innerHTML = `
        <div class="p-6 text-center text-slate-500 text-sm font-semibold">
          Carregando passageiros...
        </div>
      `;

      // Busca clientes ativos do banco para associar à viagem
      const { data: clientes, error: errClientes } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome', { ascending: true });

      if (errClientes) throw errClientes;

      if (!clientes || clientes.length === 0) {
        modalContent.innerHTML = `
          <div class="p-6 text-center">
            <span class="text-3xl">👥</span>
            <h3 class="text-lg font-bold text-slate-800 mt-2 mb-1">Nenhum cliente cadastrado</h3>
            <p class="text-xs text-slate-400 mb-4">É necessário cadastrar pelo menos um cliente para criar uma viagem.</p>
            <div class="flex justify-center gap-3">
              <button id="btn-fechar-aviso" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs tracking-wider rounded-xl transition uppercase">Fechar</button>
            </div>
          </div>
        `;
        document.getElementById('btn-fechar-aviso')?.addEventListener('click', () => this.closeModal());
        return;
      }

      modalContent.innerHTML = `
        <div class="p-6">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">✈️ Nova Viagem / Card</h3>
            <button id="btn-close-viagem-x" class="text-slate-400 hover:text-rose-500 font-bold transition">✕</button>
          </div>

          <form id="form-nova-viagem" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Passageiro / Cliente *</label>
              <select id="select-viagem-cliente" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm">
                <option value="" class="text-slate-400 dark:text-slate-500">Selecione o cliente...</option>
                ${clientes.map(c => `<option value="${c.id}" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">${c.nome}</option>`).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Destino *</label>
                <input id="input-viagem-destino" type="text" required placeholder="ex: Paris, Orlando, etc." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Código Localizador (LOC)</label>
                <input id="input-viagem-loc" type="text" placeholder="ex: F3R9W" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm uppercase" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Total (R$) *</label>
              ${renderCurrencyInputHTML('input-viagem-valor', '')}
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data de Ida (DD/MM/AAAA) *</label>
                ${renderDateInputHTML('input-viagem-ida', '')}
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data de Volta (DD/MM/AAAA) *</label>
                ${renderDateInputHTML('input-viagem-volta', '')}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status / Etapa Inicial *</label>
                <select id="select-viagem-status" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm">
                  <option value="pos_venda" class="bg-white dark:bg-slate-800">Pós-Venda</option>
                  <option value="fechado" class="bg-white dark:bg-slate-800">Fechado</option>
                  <option value="pre_embarque" class="bg-white dark:bg-slate-800">Pré-Embarque</option>
                  <option value="pos_viagem" class="bg-white dark:bg-slate-800">Pós-Viagem</option>
                </select>
              </div>
              <div>
                <label id="label-input-viagem-data-financeiro" class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data Financeiro (DD/MM/AAAA) *</label>
                ${renderDateInputHTML('input-viagem-data-financeiro', '', 'DD/MM/AAAA', true)}
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Observações Operacionais</label>
              <textarea id="textarea-viagem-obs" placeholder="Detalhes de voo, hotel, etc." rows="2" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm"></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button id="btn-cancel-viagem" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
              <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Criar Viagem</button>
            </div>
          </form>
        </div>
      `;

      setupFormValidation('form-nova-viagem', [
        { id: 'input-viagem-valor', type: 'currency' },
        { id: 'input-viagem-ida', type: 'date' },
        { id: 'input-viagem-volta', type: 'date' },
        { id: 'input-viagem-data-financeiro', type: 'date', required: true }
      ]);

      const selectStatus = document.getElementById('select-viagem-status') as HTMLSelectElement;
      const inputFinNew = document.getElementById('input-viagem-data-financeiro') as HTMLInputElement;
      const labelFinNew = document.getElementById('label-input-viagem-data-financeiro');

      const updateNewFinRequired = () => {
        if (!selectStatus || !inputFinNew) return;
        const isRequired = selectStatus.value !== 'fechado';
        if (isRequired) {
          inputFinNew.setAttribute('required', '');
          if (labelFinNew) labelFinNew.innerHTML = 'Data Financeiro (DD/MM/AAAA) *';
        } else {
          inputFinNew.removeAttribute('required');
          if (labelFinNew) labelFinNew.innerHTML = 'Data Financeiro (DD/MM/AAAA)';
        }
        inputFinNew.dispatchEvent(new Event('input'));
      };

      selectStatus?.addEventListener('change', updateNewFinRequired);
      updateNewFinRequired();

      const handleClose = () => this.closeModal();
      document.getElementById('btn-close-viagem-x')?.addEventListener('click', handleClose);
      document.getElementById('btn-cancel-viagem')?.addEventListener('click', handleClose);

      const form = document.getElementById('form-nova-viagem') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clienteId = (document.getElementById('select-viagem-cliente') as HTMLSelectElement).value;
        const destino = (document.getElementById('input-viagem-destino') as HTMLInputElement).value;
        const loc = (document.getElementById('input-viagem-loc') as HTMLInputElement).value.trim();
        const valorRaw = (document.getElementById('input-viagem-valor') as HTMLInputElement).value.trim();
        const vIdaRaw = (document.getElementById('input-viagem-ida') as HTMLInputElement).value.trim();
        const vVoltaRaw = (document.getElementById('input-viagem-volta') as HTMLInputElement).value.trim();
        const vFinRaw = (document.getElementById('input-viagem-data-financeiro') as HTMLInputElement).value.trim();
        const status = (document.getElementById('select-viagem-status') as HTMLSelectElement).value;
        const obs = (document.getElementById('textarea-viagem-obs') as HTMLTextAreaElement).value;

        const vIda = formatBrDateToIso(vIdaRaw);
        const vVolta = formatBrDateToIso(vVoltaRaw);
        const vFin = vFinRaw ? formatBrDateToIso(vFinRaw) : null;
        
        if (!vIda) {
          this.showToast('Por favor, informe a Data de Ida no formato correto DD/MM/AAAA.', 'error');
          return;
        }
        if (!vVolta) {
          this.showToast('Por favor, informe a Data de Volta no formato correto DD/MM/AAAA.', 'error');
          return;
        }
        if (status !== 'fechado' && !vFin) {
          this.showToast('Por favor, informe a Data Financeiro no formato correto DD/MM/AAAA.', 'error');
          return;
        }

        const idaDate = new Date(vIda);
        const voltaDate = new Date(vVolta);
        if (voltaDate.getTime() < idaDate.getTime()) {
          this.showToast('A data de volta não pode ser anterior à data de ida.', 'error');
          return;
        }

        const valor = parseDoubleBr(valorRaw);

        const payload = {
          cliente_id: clienteId,
          consultor_id: this.user.id,
          destino: destino,
          codigo_localizador: loc || null,
          valor_total: valor,
          data_ida: vIda,
          data_volta: vVolta,
          data_financeiro: vFin,
          status: status,
          observacoes: obs || null
        };

        try {
          const { error } = await supabase
            .from('viagens')
            .insert(payload);

          if (error) throw error;

          this.showToast('Viagem cadastrada com sucesso no Kanban!', 'success');
          this.closeModal();
          await this.loadViagens();
          this.render();
          this.setupDragAndDrop();
        } catch (err: any) {
          console.error('Erro ao cadastrar viagem:', err);
          this.showToast(`Erro ao criar viagem: ${err.message}`, 'error');
        }
      });

    } catch (err: any) {
      console.error('Erro ao abrir modal de nova viagem:', err);
      this.showToast('Erro ao carregar modal de criação.', 'error');
      this.closeModal();
    }
  }

  /**
   * Abre o Modal Dinâmico de Edição de Viagem e Gestão de Produtos
   */
  private async openEdicaoEProdutosModal(tripId: string, activeTab: 'detalhes' | 'produtos' = 'detalhes'): Promise<void> {
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
        if (!this.isFallbackMode) {
          const { data, error } = await supabase
            .from('viagens')
            .select('*, cliente:clientes(*), reembolsos(*, produto:produtos_viagem(*)), produtos:produtos_viagem(*)')
            .eq('id',  tripId)
            .single();
          viagem = data;
          errViagem = error;
        }
      } catch (e) {
        errViagem = e;
      }

      if (errViagem || !viagem) {
        viagem = this.viagens.find(v => v.id === tripId);
        if (!viagem) throw errViagem || new Error('Viagem não encontrada.');
      }

      if (viagem && !viagem.produtos) {
        const cached = localStorage.getItem(`paxflow-produtos-viagem-${tripId}`);
        if (cached) {
          try { viagem.produtos = JSON.parse(cached); } catch (e) {}
        }
      }

      // 1.1. Busca o consultor de forma separada pois a tabela profiles não possui relacionamento direto mapeado no cache do PostgREST
      if (viagem && viagem.consultor_id) {
        const { data: consultorData, error: errConsultor } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', viagem.consultor_id)
          .single();
        if (!errConsultor && consultorData) {
          viagem.consultor = consultorData;
        } else {
          viagem.consultor = null;
        }
      } else if (viagem) {
        viagem.consultor = null;
      }

      // 2. Busca lista de clientes
      const { data: clientes, error: errClientes } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome', { ascending: true });

      if (errClientes) throw errClientes;

      // 3. Renderiza a estrutura do Modal com as Abas
      this.renderEdicaoEProdutosModalContent(viagem, clientes || [], activeTab);
      
// 4. Carrega e exibe os produtos da viagem
      await this.loadAndRenderProdutosViagem(tripId);

    } catch (err: any) {
      console.error('Erro ao carregar detalhes da viagem:', err);
      this.showToast('Erro ao carregar detalhes da viagem.', 'error');
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

    let cronogramaHTML = '';
    if (cronograma.length > 0) {
      cronogramaHTML = `
        <div class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">📅 Cronograma Geral de Datas</h4>
          <div class="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-3.5 my-2">
            ${cronograma.map(item => `
              <div class="relative flex items-start gap-3">
                <!-- Bullet indicator -->
                <div class="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 border border-white dark:border-slate-900"></div>
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${item.cor}">
                      ${formatarDataLocal(item.data)}
                    </span>
                  </div>
                  <p class="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">${item.rotulo}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      cronogramaHTML = `
        <div class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">📅 Cronograma Geral de Datas</h4>
          <p class="text-xs text-slate-400 dark:text-slate-500 italic">Nenhuma data cadastrada nesta viagem.</p>
        </div>
      `;
    }

    // Cálculos de SLA e Consultor para exibição proeminente
    const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r: any) => r.status === 'pago');
    const sla = reembolsoConcluido ? { alert: false, type: null, text: '' } : this.checkSLA(v);
    
    const dono = v.consultor;
    const consultorAvatar = dono ? getAvatarSvg(dono.avatar_url, dono.nome, 'w-6 h-6') : '👤';
    const consultorNome = dono ? dono.nome : 'Não atribuído';

    const renderReembolsosHTML = (): string => {
      if (!v.reembolsos || v.reembolsos.length === 0) return '';
      return `
        <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Solicitações de Reembolso nesta Viagem</h4>
        <div class="space-y-3">
          ${v.reembolsos.map((r: any) => {
            let statusBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
            let statusLabel = r.status;
            if (r.status === 'solicitado' || r.status === 'Aguardando Fornecedor') {
              statusBadgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/30';
              statusLabel = 'Aguardando Fornecedor';
            } else if (r.status === 'em_analise') {
              statusBadgeClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/30';
              statusLabel = 'Em Análise';
            } else if (r.status === 'aprovado') {
              statusBadgeClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100/30';
              statusLabel = 'Aprovado';
            } else if (r.status === 'recusado') {
              statusBadgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/30';
              statusLabel = 'Recusado';
            } else if (r.status === 'pago') {
              statusBadgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30';
              statusLabel = '💸 Pago / Concluído';
            } else if (r.status === 'cancelado') {
              statusBadgeClass = 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200/50';
              statusLabel = 'Cancelado';
            }

            const dataSolicitacao = r.data_solicitacao ? new Date(r.data_solicitacao).toLocaleDateString('pt-BR') : '';
            const dataResolucao = r.data_resolucao ? new Date(r.data_resolucao).toLocaleDateString('pt-BR') : '';

            return `
              <div class="p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-2">
                <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">Solicitação de Reembolso</span>
                  <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${statusBadgeClass}">
                    ${statusLabel}
                  </span>
                </div>
                
                <div class="grid grid-cols-2 gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                  <div>
                    <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Produto Afetado:</span>
                    <strong class="font-extrabold text-slate-800 dark:text-slate-200">${r.produto ? `[${(r.produto.tipo || 'outro').toUpperCase()}] ${r.produto.fornecedor}` : 'Viagem Integral'}</strong>
                  </div>
                  <div>
                    <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Valor Solicitado:</span>
                    <strong class="text-slate-800 dark:text-slate-200">R$ ${Number(r.valor_solicitado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  ${r.valor_aprovado ? `
                    <div>
                      <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Valor Aprovado:</span>
                      <strong class="text-emerald-600 dark:text-emerald-400 font-black">R$ ${Number(r.valor_aprovado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ` : ''}
                  ${r.taxa_retencao ? `
                    <div>
                      <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Taxa Retenção:</span>
                      <strong class="text-rose-600 dark:text-rose-400 font-bold">R$ ${Number(r.taxa_retencao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ` : ''}
                  <div>
                    <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Data Abertura:</span>
                    <span class="font-semibold text-slate-800 dark:text-slate-200">${dataSolicitacao}</span>
                  </div>
                  ${dataResolucao ? `
                    <div>
                      <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Data Conclusão:</span>
                      <span class="font-semibold text-emerald-600 dark:text-emerald-400">${dataResolucao}</span>
                    </div>
                  ` : ''}
                </div>

                <div class="pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                  <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Motivo / Justificativa:</span>
                  <p class="text-xs text-slate-700 dark:text-slate-300 font-semibold italic mt-0.5 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">${r.motivo_cancelamento || 'Sem motivo registrado.'}</p>
                </div>

                ${r.observacoes_financeiras ? `
                  <div class="pt-1 text-[11px]">
                    <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Obs Financeiras:</span>
                    <p class="text-slate-600 dark:text-slate-400 font-medium mt-0.5">${r.observacoes_financeiras}</p>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    };

    modalContent.innerHTML = `
      <div class="p-6">
        <!-- Topo com Título e Fechar -->
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div>
            <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">✈️ Gerenciar Viagem</h3>
            <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold">Destino: <span class="font-bold text-slate-600 dark:text-slate-300">${v.destino}</span> &bull; Loc: <span class="font-bold text-slate-600 dark:text-slate-300">${v.codigo_localizador || 'Sem LOC'}</span></p>
          </div>
          <button id="btn-close-edit-modal-x" class="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 font-bold transition">✕</button>
        </div>

        <!-- Seletor de Abas Premium (visível apenas no mobile) -->
        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 mb-5 pb-px lg:hidden">
          <button id="tab-detalhes-btn" class="border-b-2 ${activeTab === 'detalhes' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 font-semibold'} px-4 py-2 text-sm transition">
            📝 Detalhes e Edição
          </button>
          <button id="tab-produtos-btn" class="border-b-2 ${activeTab === 'produtos' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 font-semibold'} px-4 py-2 text-sm transition">
            🛍️ Produtos e Serviços
          </button>
          ${v.reembolsos && v.reembolsos.length > 0 ? `
            <button id="tab-reembolsos-btn" class="border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition">
              💸 Histórico de Reembolsos
            </button>
          ` : ''}
        </div>

        <!-- Layout de duas/três colunas no Desktop / abas no Mobile -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <!-- COLUNA DA ESQUERDA (Detalhes e Edição) -->
          <div id="tab-detalhes-content" class="space-y-4 tab-pane-transition ${activeTab === 'produtos' ? 'hidden' : ''} ${this.selectedProductId ? 'lg:col-span-4' : 'lg:col-span-5'} lg:!block">
            <!-- Detalhes do Dono e SLA no Topo -->
            <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Responsável:</span>
                <select id="edit-viagem-consultor" required class="px-2.5 py-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm cursor-pointer">
                  ${this.consultores.map(c => `<option value="${c.id}" ${c.id === v.consultor_id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                </select>
              </div>
              
              ${sla.alert ? `
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Alerta SLA:</span>
                  <span class="px-2.5 py-1 rounded-lg text-xs font-black tracking-wide animate-pulse border ${
                    sla.type === 'pre-embarque' 
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/55' 
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/55'
                  }">
                    ⚠️ ${sla.text}
                  </span>
                </div>
              ` : ''}
            </div>

            <form id="form-editar-viagem" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Passageiro / Cliente *</label>
                <select id="edit-viagem-cliente" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm">
                  ${clientes.map(c => `<option value="${c.id}" class="bg-white dark:bg-slate-800" ${c.id === v.cliente_id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                </select>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Destino *</label>
                  <input id="edit-viagem-destino" type="text" required value="${v.destino}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Código Localizador (LOC)</label>
                  <input id="edit-viagem-loc" type="text" value="${v.codigo_localizador || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm uppercase" placeholder="ex: F3R9W" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Total (R$) *</label>
                ${renderCurrencyInputHTML('edit-viagem-valor', v.valor_total || 0)}
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 leading-tight">Data Ida *</label>
                  ${renderDateInputHTML('edit-viagem-ida', v.data_ida || '')}
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 leading-tight">Data Volta</label>
                  ${renderDateInputHTML('edit-viagem-volta', v.data_volta || '', 'DD/MM/AAAA', false)}
                </div>
                <div>
                  <label id="label-edit-viagem-data-financeiro" class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 leading-tight">Data Finan. ${v.status !== 'fechado' ? '*' : ''}</label>
                  ${renderDateInputHTML('edit-viagem-data-financeiro', v.data_financeiro || '', 'DD/MM/AAAA', v.status !== 'fechado')}
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status / Etapa *</label>
                <select id="edit-viagem-status" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-sm">
                  <option value="pos_venda" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'pos_venda' ? 'selected' : ''}>Pós-Venda</option>
                  <option value="fechado" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'fechado' ? 'selected' : ''}>Fechado</option>
                  <option value="pre_embarque" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'pre_embarque' ? 'selected' : ''}>Pré-Embarque</option>
                  <option value="pos_viagem" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'pos_viagem' ? 'selected' : ''}>Pós-Viagem</option>
                  <option value="reembolso_solicitado" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" ${v.status === 'reembolso_solicitado' ? 'selected' : ''}>Reembolso Solicitado</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Observações Operacionais</label>
                <textarea id="edit-viagem-obs" rows="2.5" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-sm font-medium">${v.observacoes || ''}</textarea>
              </div>

              <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
                <div>
                  ${this.perfil?.role === 'admin' ? `
                    <button id="btn-excluir-viagem" type="button" class="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-extrabold text-xs tracking-wider rounded-xl transition uppercase">
                      Excluir Viagem
                    </button>
                  ` : ''}
                </div>
                <div class="flex items-center gap-3">
                  <button id="btn-cancel-edit" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
                  <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Salvar Alterações</button>
                </div>
              </div>
            </form>

            <!-- Seção de Documentos do Cliente -->
            <div class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
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
                  <p class="text-xs text-slate-400 dark:text-slate-500 italic">Nenhum documento anexado para este passageiro.</p>
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
            <div id="painel-financeiro-produtos" class="grid grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800 mb-4">
              <div>
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-tight">Valor da Venda</span>
                <strong id="fin-valor-venda" class="text-sm font-black text-slate-800 dark:text-slate-100">R$ 0,00</strong>
              </div>
              <div>
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-tight">Total em Produtos</span>
                <strong id="fin-valor-produtos" class="text-sm font-black text-slate-800 dark:text-slate-100 font-bold">R$ 0,00</strong>
              </div>
              <div>
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-tight">Saldo Pendente</span>
                <strong id="fin-valor-pendente" class="text-sm font-black text-rose-600 dark:text-rose-400">R$ 0,00</strong>
              </div>
              <div>
                <span class="block text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider leading-tight">Rentabilidade</span>
                <strong id="fin-valor-rentabilidade" class="text-sm font-black text-indigo-600 dark:text-indigo-400">R$ 0,00</strong>
              </div>
            </div>
            
            <!-- Lista de Produtos Existentes -->
            <div>
              <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2.5">Produtos Cadastrados nesta Viagem</h4>
              <div id="lista-produtos-viagem-container" class="space-y-2 max-h-[220px] lg:max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                <p class="text-center text-xs text-slate-400 dark:text-slate-500 font-medium py-4">Buscando produtos...</p>
              </div>
            </div>

            <!-- Formulário de Novo Produto (Inline) -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h4 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3 flex items-center gap-1">➕ Adicionar Produto / Serviço</h4>
              
              <form id="form-novo-produto" class="space-y-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Tipo *</label>
                    <select id="prod-tipo" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155">
                      <option value="" disabled selected class="bg-white dark:bg-slate-800 text-slate-400">Selecione o tipo...</option>
                      ${this.tiposProduto.filter(t => t.ativo && t.nome !== 'MUDAR!').map(t => `
                        <option value="${t.nome}" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">${t.nome}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Fornecedor</label>
                    <input id="prod-fornecedor" type="text" placeholder="ex: LATAM, Hilton" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
                  </div>
                  
                  <div id="container-campos-condicionais" class="hidden bg-slate-100/40 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/30 col-span-2"></div>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Descrição</label>
                  <input id="prod-descricao" type="text" placeholder="ex: Voo GRU-JFK ou Quarto Deluxe" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Código (LOC) *</label>
                    <input id="prod-reserva" list="existing-locs-list" type="text" required maxlength="20" placeholder="ex: LOC12" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155 uppercase" />
                    <datalist id="existing-locs-list"></datalist>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Venda (R$) *</label>
                    ${renderCurrencyInputHTML('prod-venda', '')}
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Data do Serviço (DD/MM/AAAA) *</label>
                    ${renderDateInputHTML('prod-data', '')}
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Status *</label>
                    <select id="prod-status" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155">
                      <option value="reservado" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Reservado</option>
                      <option value="emitido" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" selected>Emitido</option>
                    </select>
                  </div>
                </div>

                <!-- Datas Adicionais -->
                <div id="container-datas-adicionais" class="space-y-2.5 mt-2"></div>
                <div class="flex justify-start">
                  <button type="button" id="btn-add-data-adicional" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black text-[9px] tracking-wider rounded-lg transition uppercase flex items-center gap-1">
                    ➕ Adicionar Outra Data
                  </button>
                </div>

                <div class="flex justify-end pt-1">
                  <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
                    Adicionar Produto
                  </button>
                </div>
              </form>
            </div>

            <!-- Histórico de Reembolsos (Desktop inline) -->
            ${v.reembolsos && v.reembolsos.length > 0 ? `
              <div id="reembolsos-wrapper-desktop" class="hidden lg:block border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                ${renderReembolsosHTML()}
              </div>
            ` : ''}

          </div>

          <!-- COLUNA DO EDITOR LATERAL (Editor do Produto Selecionado) -->
          ${selectedProduct ? `
            <div id="selected-product-editor-pane" class="space-y-4 lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6 pt-4 lg:pt-0 ${activeTab === 'produtos' ? 'block' : 'hidden lg:block'}">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
                <h4 class="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                  <span class="p-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-lg text-xs flex items-center justify-center">${this.getIconForType(selectedProduct.tipo)}</span>
                  <span>Detalhes do Serviço</span>
                </h4>
                <button id="btn-close-product-editor" type="button" class="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded transition uppercase tracking-wider">
                  Fechar
                </button>
              </div>

              <form id="form-editar-produto-lateral" class="space-y-4">
                <div class="grid grid-cols-1 gap-4">
                  
                  <!-- Seção de Dados (Campos de Entrada) -->
                  <div class="space-y-3.5">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Tipo *</label>
                      <select id="edit-prod-tipo" required class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155">
                        ${this.tiposProduto.filter(t => t.ativo && t.nome !== 'MUDAR!').map(t => `
                          <option value="${t.nome}" ${t.nome === selectedProduct.tipo ? 'selected' : ''}>${t.nome}</option>
                        `).join('')}
                      </select>
                    </div>

                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Fornecedor *</label>
                      <input id="edit-prod-fornecedor" type="text" required value="${selectedProduct.fornecedor || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
                    </div>

                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Descrição</label>
                      <input id="edit-prod-descricao" type="text" value="${selectedProduct.descricao || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Código (LOC) *</label>
                        <input id="edit-prod-reserva" type="text" required maxlength="20" value="${selectedProduct.codigo_reserva || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs uppercase transition duration-155" />
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Status *</label>
                        <select id="edit-prod-status" required class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155">
                          <option value="reservado" ${selectedProduct.status === 'reservado' ? 'selected' : ''}>Reservado</option>
                          <option value="emitido" ${selectedProduct.status === 'emitido' ? 'selected' : ''}>Emitido</option>
                          <option value="cancelado" ${selectedProduct.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                          <option value="reembolsado" ${selectedProduct.status === 'reembolsado' ? 'selected' : ''}>Reembolsado</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Data do Serviço *</label>
                      ${renderDateInputHTML('edit-prod-data', formatarDataLocal(selectedProduct.data_servico))}
                    </div>

                    <!-- Container para Campos Dinâmicos (dados_adicionais) -->
                    <div id="edit-container-campos-condicionais" class="hidden bg-slate-100/40 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/30 space-y-2"></div>

                    <!-- Demais Serviços Aninhados (Datas Adicionais) -->
                    <div class="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">📅 Demais Serviços Aninhados</span>
                      <div id="edit-container-datas-adicionais" class="space-y-2"></div>
                      <div class="flex justify-start">
                        <button type="button" id="edit-btn-add-data-adicional" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black text-[9px] tracking-wider rounded-lg transition uppercase flex items-center gap-1 mt-1">
                          ➕ Adicionar Outra Data
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Seção Financeira (Valores e Rentabilidade) -->
                  <div class="space-y-3.5 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-850 pb-2 mb-1">Valores do Serviço</span>
                    
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Venda (R$) *</label>
                      ${renderCurrencyInputHTML('edit-prod-venda', selectedProduct.valor_venda || 0)}
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Custo (R$) *</label>
                      ${renderCurrencyInputHTML('edit-prod-custo', selectedProduct.valor_custo || 0)}
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Tarifa (Valor Líquido)</label>
                      ${renderCurrencyInputHTML('edit-prod-tarifa', selectedProduct.tarifa || 0)}
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Taxa (Embarque/Serviço)</label>
                      ${renderCurrencyInputHTML('edit-prod-taxa', selectedProduct.taxa || 0)}
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Comissão da Agência</label>
                      ${renderCurrencyInputHTML('edit-prod-comissao', selectedProduct.comissao || 0)}
                    </div>

                    <!-- Totalizadores locais -->
                    <div class="p-3 bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-2 mt-4 shadow-sm">
                      <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider">Total Distribuído:</span>
                        <strong id="edit-det-total-distribuido" class="font-black text-slate-700 dark:text-slate-200">R$ 0,00</strong>
                      </div>
                      <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider">Saldo Pendente:</span>
                        <strong id="edit-det-saldo-pendente" class="font-black text-rose-600 dark:text-rose-400">R$ 0,00</strong>
                      </div>
                    </div>
                  </div>

                </div>

                <!-- Botões de Ação -->
                <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button id="edit-btn-cancelar-lateral" type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-lg transition uppercase">
                    Cancelar
                  </button>
                  <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-lg shadow-sm transition uppercase">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          ` : ''}

        </div>

        <!-- ABA 3: HISTÓRICO DE REEMBOLSOS (Apenas Mobile) -->
        ${v.reembolsos && v.reembolsos.length > 0 ? `
            </div>
          </div>
        ` : ''}

      </div>
    `;

    // Fechar Modal
    const handleClose = async () => {
      this.closeModal();
      await this.loadViagens();
      this.render();
      this.setupDragAndDrop();
    };
    document.getElementById('btn-close-edit-modal-x')?.addEventListener('click', handleClose);
    document.getElementById('btn-cancel-edit')?.addEventListener('click', handleClose);

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
        const { uploadDocumentoCliente } = await import('../services/googleDrive');
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

          this.showToast('Documento anexado ao cliente com sucesso!', 'success');

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
              const { DocumentViewer } = await import('../services/documentViewer');
              DocumentViewer.open(
                `Passaporte - ${v.cliente?.nome || 'Cliente'}.pdf`,
                result.googleDriveFolderUrl,
                'application/pdf',
                v.cliente
              );
            });
          }

          await this.loadViagens();
          this.render();
          this.setupDragAndDrop();
        } else {
          throw new Error(result.error || 'Erro no upload.');
        }
      } catch (err: any) {
        console.error('Erro no upload de arquivo do cliente da viagem:', err);
        this.showToast(`Erro no upload: ${err.message}`, 'error');
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
          const { DocumentViewer } = await import('../services/documentViewer');
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
    if (commentsContainer && this.user) {
      CommentsService.renderCommentsSection(
        commentsContainer,
        'viagem',
        v.id,
        v.id,
        this.user.id,
        this.consultores
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
      tabDetalhesBtn?.setAttribute('class', 'border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition');
      tabProdutosBtn?.setAttribute('class', 'border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition');
      tabReembolsosBtn?.setAttribute('class', 'border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition');
      
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
    setupFormValidation('form-editar-viagem', [
      { id: 'edit-viagem-valor', type: 'currency' },
      { id: 'edit-viagem-ida', type: 'date' },
      { id: 'edit-viagem-volta', type: 'date', required: false },
      { id: 'edit-viagem-data-financeiro', type: 'date', required: true }
    ]);

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
      const loc = (document.getElementById('edit-viagem-loc') as HTMLInputElement).value.trim();
      const valorRaw = (document.getElementById('edit-viagem-valor') as HTMLInputElement).value.trim();
      const dataIdaRaw = (document.getElementById('edit-viagem-ida') as HTMLInputElement).value.trim();
      const dataVoltaRaw = (document.getElementById('edit-viagem-volta') as HTMLInputElement).value.trim();
      const dataFinanceiroRaw = (document.getElementById('edit-viagem-data-financeiro') as HTMLInputElement).value.trim();
      const status = (document.getElementById('edit-viagem-status') as HTMLSelectElement).value;
      const obs = (document.getElementById('edit-viagem-obs') as HTMLTextAreaElement).value;

      const dataIda = formatBrDateToIso(dataIdaRaw);
      const dataVolta = formatBrDateToIso(dataVoltaRaw);
      const dataFinanceiro = dataFinanceiroRaw ? formatBrDateToIso(dataFinanceiroRaw) : null;

      if (!dataIda) {
        this.showToast('Por favor, informe a Data de Ida no formato correto DD/MM/AAAA.', 'error');
        return;
      }
      if (status !== 'fechado' && !dataFinanceiro) {
        this.showToast('Por favor, informe a Data Financeiro no formato correto DD/MM/AAAA.', 'error');
        return;
      }

      if (dataIda && dataVolta) {
        const idaDate = new Date(dataIda);
        const voltaDate = new Date(dataVolta);
        if (voltaDate.getTime() < idaDate.getTime()) {
          this.showToast('A data de volta não pode ser anterior à data de ida.', 'error');
          return;
        }
      }

      const valor = parseDoubleBr(valorRaw);

      // Validação de saldo pendente se tentar mudar para status diferente de 'fechado'
      if (status !== v.status && status !== 'fechado') {
        let produtos: any[] = [];
        if (!this.isFallbackMode) {
          try {
            const { data, error } = await supabase
              .from('produtos_viagem')
              .select('valor_venda, tarifa, taxa, comissao, fornecedor, descricao')
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
          this.showToast(`Não é possível alterar o status para "${status.replace('_', ' ')}". Existe um saldo financeiro pendente de R$ ${pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Adicione produtos na aba "Produtos e Serviços" para zerar este saldo.`, 'error');
          return;
        }

        // Validação de detalhamento dos produtos
        const produtoNaoDetalhado = produtos.find(p => {
          const tarifa = Number(p.tarifa) || 0;
          const taxa = Number(p.taxa) || 0;
          const comissao = Number(p.comissao) || 0;
          const totalDet = tarifa + taxa + comissao;
          return Math.abs(Number(p.valor_venda || 0) - totalDet) > 0.01;
        });

        if (produtoNaoDetalhado) {
          this.showToast(`Não é possível alterar o status para "${status.replace('_', ' ')}". O produto "${produtoNaoDetalhado.fornecedor} - ${produtoNaoDetalhado.descricao}" não está com seus valores 100% detalhados (soma de Tarifa + Taxa + Comissão deve ser igual ao Valor de Venda do produto).`, 'error');
          return;
        }
      }

      const payload = {
        cliente_id: clienteId,
        consultor_id: consultorId,
        destino: destino,
        codigo_localizador: loc || null,
        valor_total: valor,
        data_ida: dataIda,
        data_volta: dataVolta,
        data_financeiro: dataFinanceiro,
        status: status,
        observacoes: obs || null
      };

      try {
        const { error } = await supabase
          .from('viagens')
          .update(payload)
          .eq('id',  v.id);

        if (error) throw error;

        // Atualização otimista/offline em memória e LocalStorage
        const clientObj = clientes.find(c => c.id === clienteId);
        const viagemIdx = this.viagens.findIndex(item => item.id === v.id);
        if (viagemIdx !== -1) {
          const existing = this.viagens[viagemIdx];
          this.viagens[viagemIdx] = {
            ...existing,
            cliente_id: clienteId,
            cliente: clientObj ? { id: clientObj.id, nome: clientObj.nome } : existing.cliente,
            consultor_id: consultorId,
            destino: destino,
            codigo_localizador: loc || null,
            valor_total: valor,
            data_ida: dataIda,
            data_volta: dataVolta,
            data_financeiro: dataFinanceiro,
            status: status,
            observacoes: obs || null,
            updated_at: new Date().toISOString()
          };
          this.saveViagensToLocalStorage();
        }

        this.showToast('Viagem atualizada com sucesso!', 'success');
        this.closeModal();
        await this.loadViagens();
        this.render();
        this.setupDragAndDrop();
      } catch (err: any) {
        console.error('Erro ao editar viagem:', err);
        this.showToast(`Erro ao editar viagem: ${err.message}`, 'error');
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
        const success = await this.deleteViagem(v.id);
        if (success) {
          this.showToast('Viagem excluída com sucesso!', 'success');
          this.closeModal();
          await this.loadViagens();
          this.render();
          this.setupDragAndDrop();
        } else {
          this.showToast('Erro ao excluir viagem.', 'error');
        }
      } catch (err: any) {
        console.error('Erro ao excluir viagem:', err);
        this.showToast(`Erro ao excluir viagem: ${err.message}`, 'error');
      }
    });

    // Evento de alteração no tipo de produto para exibir campos condicionais
    const prodTipoSelect = document.getElementById('prod-tipo') as HTMLSelectElement;
    const condContainer = document.getElementById('container-campos-condicionais') as HTMLElement;
    const prodFornecedorInput = document.getElementById('prod-fornecedor') as HTMLInputElement;

    prodTipoSelect?.addEventListener('change', () => {
      const selectedType = prodTipoSelect.value;
      const tipoConfig = this.tiposProduto.find(t => t.nome === selectedType);

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
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">${label}</label>
                <select id="prod-campo-${campo.id}" ${requiredAttr} class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155">
                  <option value="" disabled selected>Selecione...</option>
                  ${options.map((opt: string) => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
              </div>
            `;
          } else if (campo.tipo === 'number') {
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">${label}</label>
                <input type="number" id="prod-campo-${campo.id}" ${requiredAttr} placeholder="${campo.placeholder || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
              </div>
            `;
          } else {
            // text fallback
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">${label}</label>
                <input type="text" id="prod-campo-${campo.id}" ${requiredAttr} placeholder="${campo.placeholder || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
              </div>
            `;
          }
        });

        condContainer.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${fieldsHTML}</div>`;

        // Hook automatic description/provider updates on change
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
    });

    // Inicializa a validação do formulário de novos produtos
    setupFormValidation('form-novo-produto', [
      { id: 'prod-venda', type: 'currency' },
      { id: 'prod-data', type: 'date' }
    ]);

    // Evento de clique para adicionar datas adicionais dinâmicas
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
          <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Rótulo (ex: Check-out)</label>
          <input type="text" placeholder="Rótulo" required class="prod-adicional-rotulo w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
        </div>
        <div>
          <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Data (DD/MM/AAAA)</label>
          <input type="text" placeholder="DD/MM/AAAA" required class="prod-adicional-data w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
        </div>
        <button type="button" class="btn-remove-data-adicional p-2 hover:bg-rose-50/80 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-lg transition" title="Remover data">
          🗑️
        </button>
      `;
      container.appendChild(newRow);

      // Máscara e validação em tempo real para o campo de data recém-criado
      const dataInput = newRow.querySelector('.prod-adicional-data') as HTMLInputElement;
      dataInput.addEventListener('input', (ev) => {
        const target = ev.target as HTMLInputElement;
        let val = target.value;
        let digits = val.replace(/\D/g, '');
        if (digits.length > 8) {
          digits = digits.slice(0, 8);
        }
        target.value = formatDateBr(digits);
      });

      // Evento de remoção da linha
      newRow.querySelector('.btn-remove-data-adicional')?.addEventListener('click', () => {
        newRow.remove();
      });
    });

    // Submissão do Formulário de Novo Produto
    const formNovoProduto = document.getElementById('form-novo-produto') as HTMLFormElement;
    formNovoProduto?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const tipo = (document.getElementById('prod-tipo') as HTMLSelectElement).value;
      let fornecedor = (document.getElementById('prod-fornecedor') as HTMLInputElement).value.trim() || 'Não informado';
      let descricao = (document.getElementById('prod-descricao') as HTMLInputElement).value.trim() || 'Sem descrição';

      // Coleta e validação de campos dinâmicos adicionais
      const tipoConfig = this.tiposProduto.find(t => t.nome === tipo);
      const dadosAdicionais: Record<string, any> = {};

      if (tipoConfig && Array.isArray(tipoConfig.campos_adicionais)) {
        for (const campo of tipoConfig.campos_adicionais) {
          const el = document.getElementById(`prod-campo-${campo.id}`) as HTMLInputElement | HTMLSelectElement | null;
          if (el) {
            const val = el.value.trim();
            if (campo.obrigatorio && !val) {
              this.showToast(`O campo "${campo.label}" é obrigatório.`, 'error');
              return;
            }
            dadosAdicionais[campo.id] = val;

            // Regra de negócios: automatizar fornecedor ou descrição dependendo do alvo do campo
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
      const dataServicoRaw = (document.getElementById('prod-data') as HTMLInputElement).value.trim();
      const status = (document.getElementById('prod-status') as HTMLSelectElement).value;

      if (!reserva) {
        this.showToast('Por favor, informe o Código (LOC) do serviço.', 'error');
        return;
      }
      if (reserva.length > 20) {
        this.showToast('O Código (LOC) deve ter no máximo 20 caracteres.', 'error');
        return;
      }
      if (/\s|[,;\/\\]/.test(reserva)) {
        this.showToast('Insira apenas um Código (LOC) por serviço (sem espaços ou caracteres de separação).', 'error');
        return;
      }

      const dataServico = formatBrDateToIso(dataServicoRaw);
      if (!dataServico) {
        this.showToast('Por favor, informe a Data do Serviço no formato correto DD/MM/AAAA.', 'error');
        return;
      }

      const venda = parseDoubleBr(vendaRaw);

      // Coleta e validação de datas adicionais
      const datasAdicionais: { data: string; rotulo: string }[] = [];
      const rotuloInputs = formNovoProduto.querySelectorAll('.prod-adicional-rotulo') as NodeListOf<HTMLInputElement>;
      const dataInputs = formNovoProduto.querySelectorAll('.prod-adicional-data') as NodeListOf<HTMLInputElement>;
      
      let datesValid = true;
      for (let i = 0; i < rotuloInputs.length; i++) {
        const rotulo = rotuloInputs[i].value.trim();
        const dataBr = dataInputs[i].value.trim();
        if (!rotulo || !dataBr) {
          this.showToast('Por favor, preencha todos os campos das datas adicionais.', 'error');
          datesValid = false;
          break;
        }

        const dataIso = formatBrDateToIso(dataBr);
        if (!dataIso || !validateDate(dataBr).isValid) {
          this.showToast(`A data "${dataBr}" para "${rotulo}" é inválida ou está em formato incorreto.`, 'error');
          datesValid = false;
          break;
        }

        datasAdicionais.push({
          rotulo,
          data: dataIso
        });
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
        if (!this.isFallbackMode) {
          const { error } = await supabase
            .from('produtos_viagem')
            .insert(payload);

          if (error) throw error;
        } else {
          // Modo offline: adiciona à lista local e salva
          const saved = localStorage.getItem(`paxflow-produtos-viagem-${v.id}`);
          const list = saved ? JSON.parse(saved) : [];
          list.push({
            ...payload,
            id: 'prod-offline-' + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString()
          });
          localStorage.setItem(`paxflow-produtos-viagem-${v.id}`, JSON.stringify(list));
        }

        this.showToast('Produto adicionado à viagem com sucesso!', 'success');
        formNovoProduto.reset();

        // Limpar o container de datas adicionais
        const containerDatas = document.getElementById('container-datas-adicionais');
        if (containerDatas) containerDatas.innerHTML = '';

        // Recarregar viagens locais/globais e atualizar visualização
        await this.loadViagens();
        this.render();
        this.setupDragAndDrop();

        // Reabrir o modal no estado atualizado
        await this.openEdicaoEProdutosModal(v.id, 'produtos');
      } catch (err: any) {
        console.error('Erro ao adicionar produto:', err);
        this.showToast(`Erro ao adicionar produto: ${err.message}`, 'error');
      }
    });

    // Inicializa o editor lateral se um produto estiver selecionado
    if (selectedProduct) {
      this.setupProductEditor(selectedProduct, v);
    }
  }

  /**
   * Configura e gerencia o editor lateral do produto selecionado
   */
  private setupProductEditor(selectedProduct: any, v: any): void {
    const formEditProd = document.getElementById('form-editar-produto-lateral') as HTMLFormElement;
    if (!formEditProd) return;

    // 1. Fechar editor lateral
    const closeEditor = () => {
      this.selectedProductId = null;
      this.openEdicaoEProdutosModal(v.id, 'produtos');
    };
    document.getElementById('btn-close-product-editor')?.addEventListener('click', closeEditor);
    document.getElementById('edit-btn-cancelar-lateral')?.addEventListener('click', closeEditor);

    // 2. Inicializar validação do formulário com setupFormValidation
    setupFormValidation('form-editar-produto-lateral', [
      { id: 'edit-prod-venda', type: 'currency' },
      { id: 'edit-prod-custo', type: 'currency' },
      { id: 'edit-prod-tarifa', type: 'currency', required: false },
      { id: 'edit-prod-taxa', type: 'currency', required: false },
      { id: 'edit-prod-comissao', type: 'currency', required: false },
      { id: 'edit-prod-data', type: 'date' }
    ]);

    // 3. Renderizar campos dinâmicos (dados_adicionais)
    const editTipoSelect = document.getElementById('edit-prod-tipo') as HTMLSelectElement;
    const editCondContainer = document.getElementById('edit-container-campos-condicionais') as HTMLElement;
    const editFornecedorInput = document.getElementById('edit-prod-fornecedor') as HTMLInputElement;

    const renderDynamicFields = (tipo: string, currentData: any) => {
      const tipoConfig = this.tiposProduto.find(t => t.nome === tipo);
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
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">${label}</label>
                <select id="edit-prod-campo-${campo.id}" ${requiredAttr} class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155">
                  <option value="" disabled ${!currentVal ? 'selected' : ''}>Selecione...</option>
                  ${options.map((opt: string) => `<option value="${opt}" ${opt === currentVal ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>
            `;
          } else if (campo.tipo === 'number') {
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">${label}</label>
                <input type="number" id="edit-prod-campo-${campo.id}" ${requiredAttr} value="${currentVal}" placeholder="${campo.placeholder || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
              </div>
            `;
          } else {
            fieldsHTML += `
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">${label}</label>
                <input type="text" id="edit-prod-campo-${campo.id}" ${requiredAttr} value="${currentVal}" placeholder="${campo.placeholder || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
              </div>
            `;
          }
        });

        editCondContainer.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${fieldsHTML}</div>`;

        // Hook automatic description/provider updates on change
        tipoConfig.campos_adicionais.forEach((campo: any) => {
          const inputEl = document.getElementById(`edit-prod-campo-${campo.id}`);
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

    // Render initially
    renderDynamicFields(selectedProduct.tipo, selectedProduct.dados_adicionais || {});

    // Listen to tipo change to update fields
    editTipoSelect?.addEventListener('change', () => {
      renderDynamicFields(editTipoSelect.value, {});
    });

    // 4. Renderizar e gerenciar datas adicionais (aninhadas)
    const editContainerDatas = document.getElementById('edit-container-datas-adicionais') as HTMLElement;
    const addDateRow = (rotulo: string, dataIso: string) => {
      const dataBr = dataIso ? dataIso.split('-').reverse().join('/') : '';
      const rowId = `row-edit-data-adicional-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newRow = document.createElement('div');
      newRow.id = rowId;
      newRow.className = 'grid grid-cols-[1fr_1fr_auto] gap-2 items-end bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/40';
      newRow.innerHTML = `
        <div>
          <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Rótulo</label>
          <input type="text" placeholder="Rótulo" value="${rotulo}" required class="edit-prod-adicional-rotulo w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
        </div>
        <div>
          <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Data</label>
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

    // Render initial additional dates
    if (Array.isArray(selectedProduct.datas_adicionais)) {
      selectedProduct.datas_adicionais.forEach((d: any) => {
        addDateRow(d.rotulo, d.data);
      });
    }

    document.getElementById('edit-btn-add-data-adicional')?.addEventListener('click', () => {
      addDateRow('', '');
    });

    // 5. Totalizadores e recalculo financeiro local
    const editVendaInput = document.getElementById('edit-prod-venda') as HTMLInputElement;
    const editTarifaInput = document.getElementById('edit-prod-tarifa') as HTMLInputElement;
    const editTaxaInput = document.getElementById('edit-prod-taxa') as HTMLInputElement;
    const editComissaoInput = document.getElementById('edit-prod-comissao') as HTMLInputElement;
    const totalDistEl = document.getElementById('edit-det-total-distribuido') as HTMLElement;
    const saldoPendEl = document.getElementById('edit-det-saldo-pendente') as HTMLElement;

    const recalcularValoresLocais = () => {
      if (!editVendaInput || !editTarifaInput || !editTaxaInput || !editComissaoInput || !totalDistEl || !saldoPendEl) return;
      const venda = parseDoubleBr(editVendaInput.value) || 0;
      const tarifa = parseDoubleBr(editTarifaInput.value) || 0;
      const taxa = parseDoubleBr(editTaxaInput.value) || 0;
      const comissao = parseDoubleBr(editComissaoInput.value) || 0;

      const totalDist = tarifa + taxa + comissao;
      const saldoPend = venda - totalDist;

      totalDistEl.textContent = `R$ ${totalDist.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      saldoPendEl.textContent = `R$ ${saldoPend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

      if (Math.abs(saldoPend) > 0.01) {
        saldoPendEl.className = 'font-black text-rose-600 dark:text-rose-400';
      } else {
        saldoPendEl.className = 'font-black text-emerald-600 dark:text-emerald-400';
      }
    };

    [editVendaInput, editTarifaInput, editTaxaInput, editComissaoInput].forEach(inp => {
      inp?.addEventListener('input', recalcularValoresLocais);
    });

    // Executa inicialmente
    recalcularValoresLocais();

    // 6. Envio do Formulário de Edição do Produto
    formEditProd.addEventListener('submit', async (e) => {
      e.preventDefault();

      const editTipo = editTipoSelect.value;
      const editFornecedor = editFornecedorInput.value.trim() || 'Não informado';
      const editDescricao = (document.getElementById('edit-prod-descricao') as HTMLInputElement).value.trim() || 'Sem descrição';
      const editReserva = (document.getElementById('edit-prod-reserva') as HTMLInputElement).value.trim();
      const editStatus = (document.getElementById('edit-prod-status') as HTMLSelectElement).value;
      const editDataServicoRaw = (document.getElementById('edit-prod-data') as HTMLInputElement).value.trim();

      if (!editReserva) {
        this.showToast('Por favor, informe o Código (LOC) do serviço.', 'error');
        return;
      }
      if (editReserva.length > 20) {
        this.showToast('O Código (LOC) deve ter no máximo 20 caracteres.', 'error');
        return;
      }
      if (/\s|[,;\/\\]/.test(editReserva)) {
        this.showToast('Insira apenas um Código (LOC) por serviço (sem espaços ou caracteres de separação).', 'error');
        return;
      }

      const editDataServico = formatBrDateToIso(editDataServicoRaw);
      if (!editDataServico) {
        this.showToast('Por favor, informe a Data do Serviço no formato correto DD/MM/AAAA.', 'error');
        return;
      }

      const venda = parseDoubleBr(editVendaInput.value) || 0;
      const custo = parseDoubleBr((document.getElementById('edit-prod-custo') as HTMLInputElement).value) || 0;
      const tarifa = parseDoubleBr(editTarifaInput.value) || 0;
      const taxa = parseDoubleBr(editTaxaInput.value) || 0;
      const comissao = parseDoubleBr(editComissaoInput.value) || 0;

      const totalDist = tarifa + taxa + comissao;
      if (Math.abs(venda - totalDist) > 0.01) {
        this.showToast(`O valor total distribuído (Tarifa + Taxa + Comissão = R$ ${totalDist.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) deve ser igual ao Valor de Venda do produto (R$ ${venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). O saldo pendente deve ser R$ 0,00.`, 'error');
        return;
      }

      // Coleta campos dinâmicos
      const tipoConfig = this.tiposProduto.find(t => t.nome === editTipo);
      const editDadosAdicionais: Record<string, any> = {};
      if (tipoConfig && Array.isArray(tipoConfig.campos_adicionais)) {
        for (const campo of tipoConfig.campos_adicionais) {
          const el = document.getElementById(`edit-prod-campo-${campo.id}`) as HTMLInputElement | HTMLSelectElement | null;
          if (el) {
            const val = el.value.trim();
            if (campo.obrigatorio && !val) {
              this.showToast(`O campo "${campo.label}" é obrigatório.`, 'error');
              return;
            }
            editDadosAdicionais[campo.id] = val;
          }
        }
      }

      // Coleta datas adicionais
      const editDatasAdicionais: { data: string; rotulo: string }[] = [];
      const rotuloInputs = formEditProd.querySelectorAll('.edit-prod-adicional-rotulo') as NodeListOf<HTMLInputElement>;
      const dataInputs = formEditProd.querySelectorAll('.edit-prod-adicional-data') as NodeListOf<HTMLInputElement>;
      
      let datesValid = true;
      for (let i = 0; i < rotuloInputs.length; i++) {
        const rotulo = rotuloInputs[i].value.trim();
        const dataBr = dataInputs[i].value.trim();
        if (!rotulo || !dataBr) {
          this.showToast('Por favor, preencha todos os campos das datas adicionais.', 'error');
          datesValid = false;
          break;
        }

        const dataIso = formatBrDateToIso(dataBr);
        if (!dataIso || !validateDate(dataBr).isValid) {
          this.showToast(`A data "${dataBr}" para "${rotulo}" é inválida ou está em formato incorreto.`, 'error');
          datesValid = false;
          break;
        }

        editDatasAdicionais.push({
          rotulo,
          data: dataIso
        });
      }

      if (!datesValid) return;

      const payload = {
        tipo: editTipo,
        fornecedor: editFornecedor,
        descricao: editDescricao,
        codigo_reserva: editReserva || null,
        valor_custo: custo,
        valor_venda: venda,
        tarifa: tarifa,
        taxa: taxa,
        comissao: comissao,
        status: editStatus,
        data_servico: editDataServico,
        datas_adicionais: editDatasAdicionais,
        dados_adicionais: editDadosAdicionais,
        updated_at: new Date().toISOString()
      };

      try {
        if (!this.isFallbackMode) {
          const { error } = await supabase
            .from('produtos_viagem')
            .update(payload)
            .eq('id', selectedProduct.id);

          if (error) throw error;
        } else {
          // Offline update
          const saved = localStorage.getItem(`paxflow-produtos-viagem-${v.id}`);
          if (saved) {
            const list = JSON.parse(saved);
            const idx = list.findIndex((x: any) => x.id === selectedProduct.id);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...payload };
              localStorage.setItem(`paxflow-produtos-viagem-${v.id}`, JSON.stringify(list));
            }
          }
        }

        this.showToast('Produto/Serviço atualizado com sucesso!', 'success');
        this.selectedProductId = null; // Limpa o produto selecionado após sucesso

        // Recarregar viagens e reabrir modal
        await this.loadViagens();
        this.render();
        this.setupDragAndDrop();

        await this.openEdicaoEProdutosModal(v.id, 'produtos');
      } catch (err: any) {
        console.error('Erro ao atualizar produto:', err);
        this.showToast(`Erro ao atualizar produto: ${err.message}`, 'error');
      }
    });
  }

  /**
   * Carrega os produtos da viagem do banco e renderiza na Aba 2
   */
  private async loadAndRenderProdutosViagem(tripId: string): Promise<void> {
    const container = document.getElementById('lista-produtos-viagem-container');
    if (!container) return;

    let produtos: any[] = [];
    let isError = false;

    try {
      const { data, error } = await supabase
        .from('produtos_viagem')
        .select('*')
        .eq('viagem_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      produtos = data || [];
      localStorage.setItem(`paxflow-produtos-viagem-${tripId}`, JSON.stringify(produtos));
    } catch (err: any) {
      console.error('Erro ao listar produtos da viagem:', err);
      isError = true;
      const saved = localStorage.getItem(`paxflow-produtos-viagem-${tripId}`);
      if (saved) {
        try {
          produtos = JSON.parse(saved);
          isError = false;
        } catch (e) {
          produtos = [];
        }
      }
    }

    if (isError) {
      container.innerHTML = `
        <p class="text-center text-xs text-rose-500 font-bold py-4">
          Falha ao buscar produtos.
        </p>
      `;
      return;
    }

    // Calcula e atualiza o painel financeiro (Totalizador e Saldo Pendente)
    const viagem = this.viagens.find(x => x.id === tripId);
    const valorTotalViagem = viagem ? (Number(viagem.valor_total) || 0) : 0;
    const totalProdutos = produtos.reduce((sum, p) => sum + (Number(p.valor_venda) || 0), 0);
    const totalRentabilidade = produtos.reduce((sum, p) => sum + ((Number(p.valor_venda) || 0) - (Number(p.valor_custo) || 0)), 0);
    const saldoPendente = valorTotalViagem - totalProdutos;

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

    // Buscar quantidade de comentários para cada produto (se não estiver em fallback)
    let commentsCountMap: { [key: string]: number } = {};
    produtos.forEach(p => { commentsCountMap[p.id] = 0; });
    
    if (!this.isFallbackMode) {
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
        console.warn('Erro ao carregar contagem de comentários de produtos:', errComm);
      }
    }

    // Atualizar o datalist de LOCs existentes para o autocompletar do formulário
    const datalist = document.getElementById('existing-locs-list');
    if (datalist) {
      const uniqueLocs = Array.from(new Set(
        produtos
          .map(p => (p.codigo_reserva || '').trim().toUpperCase())
          .filter(loc => loc.length > 0)
      ));
      datalist.innerHTML = uniqueLocs.map(loc => `<option value="${loc}"></option>`).join('');
    }

    const formatarData = (dStr: string) => {
      if (!dStr) return '';
      const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const parts = dataApenas.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Agrupamento de produtos por Código de Reserva (LOC)
    const produtosAgrupados: {
      [locKey: string]: {
        loc: string;
        produtos: any[];
        valorVendaTotal: number;
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
          isGroupDetalhado: true
        };
      }

      produtosAgrupados[locKey].produtos.push(p);
      produtosAgrupados[locKey].valorVendaTotal += Number(p.valor_venda || 0);

      const tarifa = Number(p.tarifa) || 0;
      const taxa = Number(p.taxa) || 0;
      const comissao = Number(p.comissao) || 0;
      const totalDet = tarifa + taxa + comissao;
      const isProdDetalhado = Math.abs(Number(p.valor_venda || 0) - totalDet) < 0.01;
      
      if (!isProdDetalhado) {
        produtosAgrupados[locKey].isGroupDetalhado = false;
      }
    });

    container.innerHTML = Object.values(produtosAgrupados).map(grupo => {
      const locKey = grupo.loc;
      const isGroupDetalhado = grupo.isGroupDetalhado;
      const valorVendaTotal = grupo.valorVendaTotal;
      const subProdutos = grupo.produtos;

      const innerCardsHTML = subProdutos.map(p => {
        const tipoIcon = this.getIconForType(p.tipo);

        const commentsCount = commentsCountMap[p.id] || 0;
        const tarifa = Number(p.tarifa) || 0;
        const taxa = Number(p.taxa) || 0;
        const comissao = Number(p.comissao) || 0;
        const totalDet = tarifa + taxa + comissao;
        const isDetalhado = Math.abs(Number(p.valor_venda || 0) - totalDet) < 0.01;

        const isSelected = p.id === this.selectedProductId;
        const selectedBorderClass = isSelected
          ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/10 dark:bg-indigo-950/10 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-500/5'
          : 'border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/80';

        return `
          <div class="product-card-clickable flex items-center justify-between gap-3 p-3 ${selectedBorderClass} border rounded-xl transition cursor-pointer" data-product-id="${p.id}">
            <div class="flex items-start gap-2.5 overflow-hidden w-full">
              <span class="text-lg p-1 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm flex items-center justify-center">${tipoIcon}</span>
              <div class="overflow-hidden flex-1">
                <span class="block text-xs font-black text-slate-700 dark:text-slate-200 truncate leading-tight">
                  <span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded text-[9px] uppercase tracking-wider font-extrabold mr-1">${p.tipo}</span>
                  ${p.fornecedor} &bull; ${p.descricao}
                </span>
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                  Data Principal: <span class="text-slate-600 dark:text-slate-400 font-semibold">${formatarData(p.data_servico)}</span>
                  ${p.datas_adicionais && p.datas_adicionais.length > 0 ? p.datas_adicionais.map((d: any) => `
                    <br/><span class="text-indigo-600 dark:text-indigo-400">${d.rotulo}:</span> <span class="text-slate-600 dark:text-slate-400 font-semibold">${formatarData(d.data)}</span>
                  `).join('') : ''}
                </span>
                <span class="block text-[10px] leading-normal font-bold ${isDetalhado ? 'text-indigo-500 dark:text-indigo-400' : 'text-amber-500 dark:text-amber-400 animate-pulse'}">
                  ${isDetalhado 
                    ? `Tarifa: R$ ${tarifa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} &bull; Taxa: R$ ${taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} &bull; Comis.: R$ ${comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                    : '⚠️ Detalhamento pendente (clique para detalhar)'}
                </span>
              </div>
            </div>
            
            <div class="flex items-center gap-3.5">
              <div class="text-right">
                <span class="block text-xs font-black text-indigo-600 dark:text-indigo-400">R$ ${Number(p.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <button data-comments-prod-id="${p.id}" data-comments-prod-name="${p.fornecedor} - ${p.descricao}" class="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-300 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition text-xs font-bold flex items-center gap-1" title="Notas e Comentários">
                💬 <span class="text-[10px]">${commentsCount}</span>
              </button>
              <button data-delete-prod-id="${p.id}" class="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition text-xs font-bold" title="Remover Produto">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="loc-group border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden mb-2 shadow-sm">
          <!-- Header -->
          <div class="loc-header flex items-center justify-between p-2.5 bg-slate-100/50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80 transition select-none" data-loc-key="${locKey}">
            <div class="flex items-center gap-2">
              <!-- Chevron / Arrow indicator -->
              <span class="loc-chevron inline-block transition-transform duration-200 text-xs text-slate-400 dark:text-slate-500" style="transform: rotate(90deg);">▶</span>
              
              <!-- LOC Badge -->
              <span class="px-2 py-0.5 text-[10px] font-black tracking-wider rounded bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 uppercase">${locKey}</span>
              
              <!-- Badge de Alerta de detalhamento pendente -->
              ${!isGroupDetalhado ? `<span class="px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">⚠️ Detalhamento Pendente</span>` : ''}
            </div>
            
            <div class="flex items-center gap-2">
              <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">R$ ${valorVendaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <!-- Accordion Body (contains the product cards) -->
          <div class="loc-body border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/10 dark:bg-slate-900/5 p-2 pl-4 space-y-2 border-l-2 border-l-slate-200 dark:border-l-slate-700">
            ${innerCardsHTML}
          </div>
        </div>
      `;
    }).join('');

    // Ouvinte para colapsar/expandir os acordeões de LOC
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

    // Ouvintes de comentários
    container.querySelectorAll('[data-comments-prod-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const prodId = btn.getAttribute('data-comments-prod-id');
        const prodName = btn.getAttribute('data-comments-prod-name') || 'Produto';
        if (!prodId) return;

        CommentsService.openProductCommentsModal(
          prodId,
          tripId,
          prodName,
          this.user.id,
          this.consultores,
          () => {
            this.loadAndRenderProdutosViagem(tripId);
          }
        );
      });
    });

    // Ouvintes de exclusão de produtos
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
            if (!this.isFallbackMode) {
              const { error } = await supabase
                .from('produtos_viagem')
                .delete()
                .eq('id', prodId);

              if (error) throw error;
            } else {
              // Modo offline: remove do local storage cache
              const saved = localStorage.getItem(`paxflow-produtos-viagem-${tripId}`);
              if (saved) {
                const list = JSON.parse(saved);
                const updatedList = list.filter((p: any) => p.id !== prodId);
                localStorage.setItem(`paxflow-produtos-viagem-${tripId}`, JSON.stringify(updatedList));
              }
            }

            this.showToast('Produto removido com sucesso!', 'success');
            await this.loadAndRenderProdutosViagem(tripId);
          } catch (err: any) {
            console.error('Erro ao remover produto:', err);
            this.showToast(`Erro ao remover produto: ${err.message}`, 'error');
          }
        }
      });
    });

    // Ouvintes de clique no card para detalhamento (painel lateral)
    container.querySelectorAll('.product-card-clickable').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        const prodId = card.getAttribute('data-product-id');
        const prod = produtos.find(x => x.id === prodId);
        if (prod) {
          this.selectedProductId = prod.id;
          this.openEdicaoEProdutosModal(tripId, 'produtos');
        }
      });
    });
  }

  /**
   * Cria o overlay estrutural do modal se ele ainda não existir e abre a exibição
   */
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
      // Remove any existing max-w- class and apply the new one
      container.className = container.className.replace(/\bmax-w-\S+/g, '');
      container.classList.add(maxWidthClass);
    }
    
    // Anima a abertura removendo as classes de fechamento e adicionando as de abertura
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

  /**
   * Fecha o modal com transição suave
   */
  private closeModal(): void {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    if (overlay && container) {
      container.classList.remove('scale-100');
      container.classList.add('scale-95');
      overlay.classList.remove('opacity-100', 'pointer-events-auto');
      overlay.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  /**
   * Abre o Modal de Detalhamento de Valores (Tarifa, Taxa, Comissão) para um produto
   */
  private openProductDetailsModal(p: any, tripId: string): void {
    this.renderModalOverlay('max-w-lg');

    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent) return;

    const tipoIcon = this.getIconForType(p.tipo);
    const valorVenda = Number(p.valor_venda) || 0;

    modalContent.innerHTML = `
      <div class="p-6">
        <!-- Topo com Título e Fechar -->
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span class="p-1.5 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-500 rounded-lg">${tipoIcon}</span>
            <span>Detalhamento de Valores</span>
          </h3>
          <button id="btn-close-det-modal-x" class="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 font-bold transition">✕</button>
        </div>

        <!-- Resumo do Produto -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 mb-5">
          <div class="flex justify-between items-start mb-1">
            <span class="text-xs font-black text-slate-700 dark:text-slate-300 truncate">${p.fornecedor} &bull; ${p.descricao}</span>
            <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">Total: R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold">
            ${p.codigo_reserva ? `LOC: ${p.codigo_reserva} &bull; ` : ''} 
            Serviço: ${new Date(p.data_servico).toLocaleDateString('pt-BR')}
          </span>
        </div>

        <form id="form-detalhes-produto" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tarifa (Valor Líquido)</label>
            ${renderCurrencyInputHTML('input-prod-tarifa', p.tarifa || 0, '0,00', true)}
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Taxa (Embarque/Serviço)</label>
            ${renderCurrencyInputHTML('input-prod-taxa', p.taxa || 0, '0,00', true)}
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Comissão da Agência</label>
            ${renderCurrencyInputHTML('input-prod-comissao', p.comissao || 0, '0,00', true)}
          </div>

          <!-- Totalizadores Locais e Saldo Pendente -->
          <div class="flex justify-between items-center p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/70 rounded-xl mt-4">
            <div>
              <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Saldo Pendente do Produto</span>
              <strong id="det-saldo-pendente" class="text-base font-black text-rose-600 dark:text-rose-400">R$ 0,00</strong>
            </div>
            <div class="text-right">
              <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total Distribuído</span>
              <span id="det-total-distribuido" class="text-sm font-black text-slate-700 dark:text-slate-300">R$ 0,00</span>
            </div>
          </div>

          <!-- Botões de Ação -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-cancel-det-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Voltar</button>
            <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Salvar Detalhes</button>
          </div>
        </form>
      </div>
    `;

    // Eventos de Fechamento / Cancelamento (Volta para o modal da Viagem na aba de Produtos)
    const handleClose = () => {
      this.closeModal();
      // Reabre o modal da Viagem na aba de Produtos
      setTimeout(() => {
        this.openEdicaoEProdutosModal(tripId, 'produtos');
      }, 150);
    };

    document.getElementById('btn-close-det-modal-x')?.addEventListener('click', handleClose);
    document.getElementById('btn-cancel-det-modal')?.addEventListener('click', handleClose);

    // Inicializa a validação e formatação
    setupFormValidation('form-detalhes-produto', [
      { id: 'input-prod-tarifa', type: 'currency' },
      { id: 'input-prod-taxa', type: 'currency' },
      { id: 'input-prod-comissao', type: 'currency' }
    ]);

    const inputTarifa = document.getElementById('input-prod-tarifa') as HTMLInputElement;
    const inputTaxa = document.getElementById('input-prod-taxa') as HTMLInputElement;
    const inputComissao = document.getElementById('input-prod-comissao') as HTMLInputElement;
    
    const pendingValEl = document.getElementById('det-saldo-pendente');
    const totalDistEl = document.getElementById('det-total-distribuido');

    const updatePendingBalance = () => {
      const tarifa = parseDoubleBr(inputTarifa.value);
      const taxa = parseDoubleBr(inputTaxa.value);
      const comissao = parseDoubleBr(inputComissao.value);

      const totalDistributed = tarifa + taxa + comissao;
      const pendente = valorVenda - totalDistributed;

      if (totalDistEl) {
        totalDistEl.textContent = `R$ ${totalDistributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }

      if (pendingValEl) {
        pendingValEl.textContent = `R$ ${pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        if (Math.abs(pendente) < 0.01) {
          pendingValEl.className = 'text-base font-black text-emerald-600 dark:text-emerald-400';
        } else {
          pendingValEl.className = 'text-base font-black text-rose-600 dark:text-rose-400';
        }
      }
    };

    inputTarifa.addEventListener('input', updatePendingBalance);
    inputTaxa.addEventListener('input', updatePendingBalance);
    inputComissao.addEventListener('input', updatePendingBalance);

    // Inicializa os valores acumulados
    updatePendingBalance();

    // Evento do Formulario
    const form = document.getElementById('form-detalhes-produto') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const tarifa = parseDoubleBr(inputTarifa.value);
      const taxa = parseDoubleBr(inputTaxa.value);
      const comissao = parseDoubleBr(inputComissao.value);

      const totalDistributed = tarifa + taxa + comissao;
      const pendente = valorVenda - totalDistributed;

      if (Math.abs(pendente) > 0.01) {
        this.showToast(`Não é possível salvar. A soma de Tarifa, Taxa e Comissão (R$ ${totalDistributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) deve ser exatamente igual ao Valor de Venda do produto (R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Saldo restante: R$ ${pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`, 'error');
        return;
      }

      const payload = {
        tarifa,
        taxa,
        comissao
      };

      try {
        if (!this.isFallbackMode) {
          const { error } = await supabase
            .from('produtos_viagem')
            .update(payload)
            .eq('id', p.id);

          if (error) throw error;
        } else {
          // Modo offline local storage
          const saved = localStorage.getItem(`paxflow-produtos-viagem-${tripId}`);
          if (saved) {
            const list = JSON.parse(saved);
            const idx = list.findIndex((x: any) => x.id === p.id);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...payload };
              localStorage.setItem(`paxflow-produtos-viagem-${tripId}`, JSON.stringify(list));
            }
          }
        }

        this.showToast('Detalhamento de valores salvo com sucesso!', 'success');
        
        // Fecha e reabre o modal de viagem com a aba de produtos ativa
        this.closeModal();
        setTimeout(() => {
          this.openEdicaoEProdutosModal(tripId, 'produtos');
        }, 150);
      } catch (err: any) {
        console.error('Erro ao salvar detalhamento do produto:', err);
        this.showToast(`Erro ao salvar detalhamento do produto: ${err.message}`, 'error');
      }
    });
  }

  /**
   * Exibe mensagens flutuantes (Toasts)
   */
  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const translatedMessage = (window as any).traduzirErro ? (window as any).traduzirErro(message) : message;
    const toastId = 'paxflow-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
    }`;
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${translatedMessage}`;

    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      }
    }, 3500);
  }
     /**
   * Renderiza a interface do Dashboard principal
   */
  private render(): void {
    // Separa as viagens por colunas baseadas no status aplicando a busca em tempo real
    const colunasMap: { [key: string]: any[] } = {
      fechado: [],
      pos_venda: [],
      pre_embarque: [],
      pos_viagem: [],
      reembolso_solicitado: []
    };

    const filtrados = this.viagens.filter(v => {
      if (this.perfil?.role === 'admin' && this.selectedConsultantId !== 'todos') {
        if (v.consultor_id !== this.selectedConsultantId) return false;
      }

      if (!this.buscaTermo) return true;
      const q = this.buscaTermo.toLowerCase().trim();
      const cliNome = v.cliente?.nome?.toLowerCase() || '';
      const cliDoc = v.cliente?.documento?.toLowerCase() || '';
      const cliEmail = v.cliente?.email?.toLowerCase() || '';
      const cliTelefone = v.cliente?.telefone?.toLowerCase() || '';
      const dest = v.destino?.toLowerCase() || '';
      const loc = v.codigo_localizador?.toLowerCase() || '';
      const obs = v.observacoes?.toLowerCase() || '';
      const consultorNome = v.consultor_id === this.user.id ? 'você' : 'outro consultor';

      // Busca em códigos de reserva dos produtos/serviços (LOCs internos)
      const matchesProductLoc = v.produtos && Array.isArray(v.produtos) && v.produtos.some((p: any) => {
        const prodLoc = (p.codigo_reserva || '').toLowerCase();
        return prodLoc.includes(q);
      });

      // Busca nos comentários associados à viagem (comentários da viagem ou de seus produtos)
      const matchesComments = v.comentarios_busca && Array.isArray(v.comentarios_busca) && v.comentarios_busca.some((text: string) => {
        return (text || '').toLowerCase().includes(q);
      });

      return (
        cliNome.includes(q) ||
        cliDoc.includes(q) ||
        cliEmail.includes(q) ||
        cliTelefone.includes(q) ||
        dest.includes(q) ||
        loc.includes(q) ||
        obs.includes(q) ||
        consultorNome.includes(q) ||
        matchesProductLoc ||
        matchesComments
      );
    });

    filtrados.forEach(v => {
      if (colunasMap[v.status] !== undefined) {
        colunasMap[v.status].push(v);
      } else {
        // Fallback caso status não coincida
        colunasMap.fechado.push(v);
      }
    });

    // Conta alertas de SLA ativos para exibir no cabeçalho
    let totalSlaAlerts = 0;
    this.viagens.forEach(v => {
      if (this.checkSLA(v).alert) totalSlaAlerts++;
    });

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
         <!-- CABEÇALHO DO OPERACIONAL -->
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-auto object-contain md:hidden" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">${this.settings.agencyName}</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <span>Painel Operacional</span>
              </p>
            </div>
          </div>
          
          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end">
            <!-- Stats Rápidos -->
            <div class="flex items-center gap-2 bg-slate-100/60 dark:bg-slate-800/40 p-1.5 rounded-xl border border-slate-200/30 dark:bg-slate-700/30 shrink-0">
              <div class="px-3.5 py-1.5 text-center">
                <span class="block text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Viagens</span>
                <span class="text-sm font-black text-slate-700 dark:text-slate-200">${this.viagens.length}</span>
              </div>
              <div class="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
              <div class="px-3.5 py-1.5 text-center">
                <span class="block text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">SLAs Ativos</span>
                <span class="text-sm font-black ${totalSlaAlerts > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-700 dark:text-slate-200'}">${totalSlaAlerts}</span>
              </div>
            </div>

            <!-- Campo de Busca de Viagens -->
            <div class="relative min-w-[200px] md:min-w-[280px] flex-1 sm:flex-initial">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input id="input-busca-viagem" type="text" placeholder="Pesquisar viagens..." value="${this.buscaTermo}" class="w-full text-xs font-semibold pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
            </div>

            <!-- Botão Criar Card / Nova Viagem -->
            <button id="btn-nova-viagem" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Nova Viagem</span>
            </button>

            <!-- Seletor de Consultores (Apenas para Admins) -->
            ${this.perfil?.role === 'admin' ? `
              <div class="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl shadow-sm">
                <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 select-none">Equipe:</span>
                <select id="select-dashboard-consultor" class="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-400 focus:outline-none cursor-pointer max-w-[150px]">
                  <option value="todos" ${this.selectedConsultantId === 'todos' ? 'selected' : ''}>Todos os Consultores</option>
                  ${this.consultores.map(c => `<option value="${c.id}" ${this.selectedConsultantId === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>
        </header>

        <!-- QUADRO KANBAN OPERACIONAL -->
        <main id="kanban-columns-container" class="flex-1 p-6 flex gap-6 items-start overflow-x-auto pb-4 custom-scrollbar">
          
          <!-- Coluna: Fechado -->
          ${this.renderColuna('Fechado', 'fechado', colunasMap.fechado)}

          <!-- Coluna: Pós-Venda -->
          ${this.renderColuna('Pós-Venda', 'pos_venda', colunasMap.pos_venda)}

          <!-- Coluna: Pré-Embarque -->
          ${this.renderColuna('Pré-Embarque', 'pre_embarque', colunasMap.pre_embarque)}

          <!-- Coluna: Pós-Viagem -->
          ${this.renderColuna('Pós-Viagem', 'pos_viagem', colunasMap.pos_viagem)}

          <!-- Coluna: Reembolso Solicitado -->
          ${this.renderColuna('Reembolso Solicitado', 'reembolso_solicitado', colunasMap.reembolso_solicitado)}

        </main>
      </div>
    `;

    // Evento de Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      const confirmResult = await showCustomConfirm('Deseja realmente sair do sistema?', 'Encerrar Sessão');
      if (confirmResult) {
        await logoutConsultor();
        window.location.reload();
      }
    });

    // Campo de busca de viagens
    const searchInput = document.getElementById('input-busca-viagem') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.buscaTermo = (e.target as HTMLInputElement).value;
      this.render();
      this.setupDragAndDrop();

      // Restaura o foco e coloca o cursor no final
      const input = document.getElementById('input-busca-viagem') as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    // Evento de Criação de Nova Viagem
    document.getElementById('btn-nova-viagem')?.addEventListener('click', () => {
      this.openNovaViagemModal();
    });

    // Evento de Filtro de Consultor (Admins)
    const selectConsultor = document.getElementById('select-dashboard-consultor') as HTMLSelectElement;
    selectConsultor?.addEventListener('change', () => {
      this.selectedConsultantId = selectConsultor.value;
      this.render();
      this.setupDragAndDrop();
    });

    // Evento de cliques nos cards do Kanban para Abrir Detalhes/Edição/Produtos
    this.container.querySelectorAll('[data-trip-id]').forEach(card => {
      card.addEventListener('click', () => {
        const tripId = card.getAttribute('data-trip-id');
        if (tripId) {
          this.openEdicaoEProdutosModal(tripId);
        }
      });
    });
  }

  /**
   * Renderiza a estrutura HTML de uma coluna do Kanban
   */
  private renderColuna(titulo: string, status: string, items: any[]): string {
    const configMap: { [key: string]: { border: string; iconBg: string; iconText: string; badgeBg: string; badgeText: string; iconSvg: string } } = {
      fechado: {
        border: 'border-t-emerald-500',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
        iconText: 'text-emerald-500 dark:text-emerald-400',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
        badgeText: 'text-emerald-600 dark:text-emerald-400',
        iconSvg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
      },
      pos_venda: {
        border: 'border-t-indigo-500',
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
        iconText: 'text-indigo-500 dark:text-indigo-400',
        badgeBg: 'bg-indigo-100 dark:bg-indigo-950/80',
        badgeText: 'text-indigo-600 dark:text-indigo-400',
        iconSvg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>`
      },
      pre_embarque: {
        border: 'border-t-amber-500',
        iconBg: 'bg-amber-50 dark:bg-amber-950/40',
        iconText: 'text-amber-500 dark:text-amber-400',
        badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
        badgeText: 'text-amber-600 dark:text-amber-400',
        iconSvg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>`
      },
      pos_viagem: {
        border: 'border-t-violet-500',
        iconBg: 'bg-violet-50 dark:bg-violet-950/40',
        iconText: 'text-violet-500 dark:text-violet-400',
        badgeBg: 'bg-violet-100 dark:bg-violet-950/80',
        badgeText: 'text-violet-600 dark:text-violet-400',
        iconSvg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`
      },
      reembolso_solicitado: {
        border: 'border-t-rose-500',
        iconBg: 'bg-rose-50 dark:bg-rose-950/40',
        iconText: 'text-rose-500 dark:text-rose-400',
        badgeBg: 'bg-rose-100 dark:bg-rose-950/80',
        badgeText: 'text-rose-600 dark:text-rose-400',
        iconSvg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
      }
    };
    const cfg = configMap[status] || configMap.fechado;

    return `
      <div class="w-80 h-[calc(100vh-200px)] bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 border-t-4 ${cfg.border} rounded-2xl p-4 flex flex-col shrink-0 transition-colors duration-200">
        <!-- Header da Coluna -->
        <div class="column-header flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60 select-none cursor-grab active:cursor-grabbing">
          <div class="flex items-center gap-2">
            <span class="p-1 ${cfg.iconBg} ${cfg.iconText} rounded-lg flex items-center justify-center shrink-0">
              ${cfg.iconSvg}
            </span>
            <span class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">${titulo}</span>
            <span class="px-2 py-0.5 ${cfg.badgeBg} ${cfg.badgeText} rounded-full text-[10px] font-black">${items.length}</span>
          </div>
        </div>

        <!-- Lista de Cards (Sortable area) -->
        <div id="col-${status}" data-status="${status}" class="flex-1 overflow-y-auto space-y-3 custom-scrollbar min-h-[150px] pr-1">
          ${items.length === 0 ? `
            <div class="h-28 border border-dashed border-slate-200 dark:border-slate-800/85 rounded-xl flex items-center justify-center p-4 text-center">
              <span class="text-xs text-slate-400 dark:text-slate-500 font-medium">Solte viagens aqui</span>
            </div>
          ` : items.map(v => this.renderCard(v)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza a estrutura HTML de um card de viagem individual
   */
  private renderCard(v: any): string {
    // Verifica se há algum reembolso concluído (status === 'pago')
    const reembolsoConcluido = v.reembolsos && v.reembolsos.some((r: any) => r.status === 'pago');
    
    const sla = reembolsoConcluido ? { alert: false, type: null, text: '' } : this.checkSLA(v);
    
    // Classes CSS dinâmicas baseadas nos alertas de SLA ou reembolso finalizado
    let cardClasses = 'bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-800 shadow-sm hover:shadow-md dark:shadow-slate-950/30 transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group card-viagem';
    
    if (reembolsoConcluido) {
      cardClasses = 'bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-500/80 dark:border-emerald-500/50 shadow-emerald-500/10 dark:shadow-emerald-950/20 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group card-viagem';
    } else if (sla.alert) {
      if (sla.type === 'pre-embarque') {
        cardClasses += ' animate-sla-urgent';
      } else if (sla.type === 'pos-viagem') {
        cardClasses += ' animate-sla-warning';
      }
    }

    // Formatações de datas robusta
    const formatarData = (dStr: string) => {
      if (!dStr) return '';
      const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const parts = dataApenas.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    return `
      <div class="${cardClasses}" data-trip-id="${v.id}">
        
        <!-- Linha do Localizador & Preço -->
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold text-[10px] rounded tracking-wider border border-slate-200/55 dark:border-slate-700/55 uppercase">
            ${v.codigo_localizador || 'S/ LOC'}
          </span>
          <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">
            R$ ${Number(v.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <!-- Título do Destino -->
        <h4 class="text-sm font-black text-slate-800 dark:text-slate-200 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-1 flex items-center gap-1">
          ✈️ ${v.destino}
        </h4>

        <!-- Nome do Cliente/Passageiro -->
        <p class="text-xs text-slate-500 dark:text-slate-400 font-extrabold mb-1.5 flex items-center gap-1.5">
          <span class="text-slate-400 dark:text-slate-500">👤</span> ${v.cliente?.nome || 'Cliente Desconhecido'}
        </p>

        <!-- Ícones de Produtos Cadastrados -->
        ${v.produtos && v.produtos.length > 0 ? `
          <div class="flex flex-wrap gap-1.5 mb-3">
            ${(() => {
              const counts: { [tipo: string]: number } = {};
              v.produtos.forEach((p: any) => {
                const t = (p.tipo || 'outro').toLowerCase();
                counts[t] = (counts[t] || 0) + 1;
              });
              return Object.entries(counts).map(([tipo, count]) => {
                const icon = this.getIconForType(tipo);
                const suffix = count > 1 ? ` +${count - 1}` : '';
                return `
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider" title="${tipo}">
                    <span>${icon}${suffix}</span>
                  </span>
                `;
              }).join('');
            })()}
          </div>
        ` : ''}

        <!-- Calendário/Datas -->
        <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-semibold border-t border-slate-100 dark:border-slate-800 pt-2 mb-2">
          <div>
            <span class="block text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider text-[8px]">Data Ida</span>
            <span class="text-slate-600 dark:text-slate-400 font-bold">${formatarData(v.data_ida)}</span>
          </div>
          <div>
            <span class="block text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider text-[8px]">Data Volta</span>
            <span class="text-slate-600 dark:text-slate-400 font-bold">${formatarData(v.data_volta)}</span>
          </div>
        </div>

        ${v.data_financeiro ? `
          <div class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold border-t border-slate-100 dark:border-slate-800 pt-1.5 mb-1.5 flex items-center justify-between">
            <span class="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider text-[8px]">Data Financeiro</span>
            <span class="text-slate-600 dark:text-slate-400 font-bold">${formatarData(v.data_financeiro)}</span>
          </div>
        ` : ''}

        <!-- Se for Admin, exibe o consultor responsável pela venda -->
        ${this.perfil?.role === 'admin' ? `
          <div class="border-t border-slate-50 dark:border-slate-800/40 pt-1.5 mt-1.5 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-medium">
            <span>Consultor Resp:</span>
            <span class="font-extrabold text-slate-600 dark:text-slate-400">
              ${v.consultor_id === this.user.id ? 'Você' : (this.consultores.find(c => c.id === v.consultor_id)?.nome || 'Outro Consultor')}
            </span>
          </div>
        ` : ''}

        <!-- Alerta de SLA visual ou Status de Reembolso Concluído -->
        ${reembolsoConcluido ? `
          <div class="mt-2.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide flex items-center justify-center gap-1 bg-emerald-100/85 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            ✅ Reembolso Concluído!
          </div>
        ` : sla.alert ? `
          <div class="mt-2.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 animate-pulse ${
            sla.type === 'pre-embarque' 
              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/55' 
              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/55'
          }">
            ${sla.text}
          </div>
        ` : ''}

      </div>
    `;
  }
}
