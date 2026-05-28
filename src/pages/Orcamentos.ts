import { supabase, getSessaoAtual } from '../services/supabase';
import { uploadDocumentoCliente } from '../services/googleDrive';
import { Orcamento, PerfilConsultor } from '../types';
import { getAvatarSvg, mesclarAvataresLocais } from '../services/avatars';
import { showCustomConfirm, showCustomAlert } from '../services/dialog';

// Injeta estilos específicos premium para o Kanban de Orçamentos
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .orcamentos-column {
      min-height: 550px;
      transition: all 0.2s ease;
    }
    .card-orcamento {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }
    .card-orcamento:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03);
    }
    html.dark .card-orcamento:hover {
      box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.3), 0 4px 8px -2px rgba(0, 0, 0, 0.2);
    }
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slideInUp 0.3s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

export class OrcamentosPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private orcamentos: Orcamento[] = [];
  private consultores: PerfilConsultor[] = [];
  private loading: boolean = false;
  private isFallbackMode: boolean = false;
  private realtimeChannel: any = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa a página de Orçamentos
   */
  public async init(targetId?: string): Promise<void> {
    this.renderLoading();

    try {
      // 1. Validar autenticação e perfil
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }
      this.user = user;
      this.perfil = perfil;

      // Escuta reativamente as atualizações do perfil
      window.addEventListener('paxflow-profile-updated', (e: any) => {
        const { nome, avatar_url } = e.detail;
        if (this.perfil) {
          this.perfil.nome = nome;
          this.perfil.avatar_url = avatar_url;
          this.render();
          this.setupGlobalEventListeners();
        }
      });

      // 2. Carregar dados (Orçamentos e Consultores)
      await this.loadConsultores();
      await this.loadOrcamentos();

      // 3. Renderizar interface principal
      this.render();

      // 4. Configurar ouvintes de eventos da página principal
      this.setupGlobalEventListeners();

      // 5. Configurar Canal Realtime do Supabase
      this.setupRealtimeChannel();

      // 6. Deep linking from Inbox
      if (targetId) {
        this.openVerNotasModal(targetId);
      }

    } catch (err: any) {
      console.error('Erro ao inicializar OrcamentosPage:', err);
      this.renderAuthError(`Erro interno ao carregar a página: ${err.message}`);
    }
  }

  /**
   * Busca todos os consultores cadastrados para o seletor "Mudar Consultor"
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
      console.warn('Erro ao carregar consultores da tabela "profiles" (usando fallback local):', err.message);
      // Fallback local caso a tabela ou a conexão falhe
      this.consultores = [
        {
          id: this.user?.id || 'me',
          nome: this.perfil?.nome || 'Você',
          email: this.perfil?.email || '',
          role: this.perfil?.role || 'consultor',
          ativo: true
        },
        {
          id: 'fc7a0491-039c-4822-ba3b-01a4e1d6706e',
          nome: 'Fernanda Ganem',
          email: 'fernanda@paxflow.com.br',
          role: 'consultor',
          ativo: true
        },
        {
          id: 'd9bba231-11c9-40ee-a7aa-aa9a4a7cf56d',
          nome: 'Gabriel Santos',
          email: 'gabriel@paxflow.com.br',
          role: 'admin',
          ativo: true
        }
      ];
    }
  }

  /**
   * Busca os orçamentos no Supabase com fallback offline robusto
   */
  private async loadOrcamentos(): Promise<void> {
    try {
      let query = supabase
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });

      // Consultor comum só vê seus próprios orçamentos
      if (this.perfil && this.perfil.role !== 'admin') {
        query = query.eq('consultor_id', this.user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      this.isFallbackMode = false;
      this.orcamentos = (data || []).map(d => ({
        id: d.id,
        consultorId: d.consultor_id,
        nomeCliente: d.nome_cliente,
        contato: d.contato,
        destino: d.destino,
        dataViagem: d.data_viagem,
        temperatura: d.temperatura,
        tags: d.tags || [],
        status: d.status,
        subStatus: d.sub_status,
        notasNegociacao: d.notas_negociacao,
        documentosUrl: d.documentos_url || [],
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
    } catch (err: any) {
      console.warn('Tabela "orcamentos" indisponível ou erro na consulta. Ativando fallback de armazenamento local (localStorage):', err.message);
      this.isFallbackMode = true;
      this.loadOrcamentosFromLocalStorage();
    }
  }

  /**
   * Carrega orçamentos salvos no LocalStorage (Modo Fallback / Offline)
   */
  private loadOrcamentosFromLocalStorage(): void {
    const key = `paxflow-orcamentos-${this.user?.id || 'global'}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filtra para consultor normal se for o caso
        if (this.perfil && this.perfil.role !== 'admin') {
          this.orcamentos = parsed.filter((o: any) => o.consultorId === this.user.id);
        } else {
          this.orcamentos = parsed;
        }
      } catch (e) {
        console.error('Erro ao fazer parse dos orçamentos locais:', e);
        this.orcamentos = [];
      }
    } else {
      // Massa de dados de demonstração inicial
      const defaultData: Orcamento[] = [
        {
          id: 'orc-demo-1',
          consultorId: this.user?.id || 'me',
          nomeCliente: 'Guilherme Siqueira',
          contato: '(11) 99111-2233 / guilherme@email.com',
          destino: 'Orlando, EUA',
          dataViagem: '2026-11-15',
          temperatura: 'Quente',
          tags: ['Família', 'Parques', 'EUA'],
          status: 'SOLICITADO',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 horas atrás
        },
        {
          id: 'orc-demo-2',
          consultorId: this.user?.id || 'me',
          nomeCliente: 'Natália Albuquerque',
          contato: 'natalia@viagens.com',
          destino: 'Roma, Itália',
          dataViagem: '2027-04-10',
          temperatura: 'Normal',
          tags: ['Lua de Mel', 'Europa'],
          status: 'EM_ANDAMENTO',
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 2 dias atrás
        },
        {
          id: 'orc-demo-3',
          consultorId: this.user?.id || 'me',
          nomeCliente: 'Roberto Carlos',
          contato: '(21) 98888-7777',
          destino: 'Buenos Aires, Argentina',
          dataViagem: '2026-08-20',
          temperatura: 'Frio',
          tags: ['Nacional/América do Sul', 'Show'],
          status: 'AGUARDANDO',
          notasNegociacao: 'Opção de voo direto Aerolíneas Argentinas enviado, aguardando resposta sobre o hotel.',
          documentosUrl: ['https://drive.google.com/drive/folders/mock-proposal'],
          createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() // 3 dias atrás
        }
      ];

      this.orcamentos = defaultData;
      this.saveOrcamentosToLocalStorage();
    }
  }

  /**
   * Salva o estado dos orçamentos locais
   */
  private saveOrcamentosToLocalStorage(): void {
    const key = `paxflow-orcamentos-${this.user?.id || 'global'}`;
    localStorage.setItem(key, JSON.stringify(this.orcamentos));
  }

  /**
   * Salva ou atualiza um orçamento (de forma reativa no Supabase ou local)
   */
  private async persistOrcamento(o: Orcamento): Promise<boolean> {
    if (this.isFallbackMode) {
      const idx = this.orcamentos.findIndex(item => item.id === o.id);
      if (idx !== -1) {
        this.orcamentos[idx] = { ...o, updatedAt: new Date().toISOString() };
      } else {
        this.orcamentos.unshift({ ...o, id: o.id || 'orc-' + Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      this.saveOrcamentosToLocalStorage();
      return true;
    }

    try {
      const payload = {
        consultor_id: o.consultorId,
        nome_cliente: o.nomeCliente,
        contato: o.contato,
        destino: o.destino,
        data_viagem: o.dataViagem || null,
        temperatura: o.temperatura,
        tags: o.tags,
        status: o.status,
        sub_status: o.subStatus || null,
        notas_negociacao: o.notasNegociacao || null,
        documentos_url: o.documentosUrl || []
      };

      if (o.id && !o.id.startsWith('orc-')) {
        const { error } = await supabase
          .from('orcamentos')
          .update(payload)
          .eq('id', o.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('orcamentos')
          .insert(payload);
        if (error) throw error;
      }
      return true;
    } catch (err: any) {
      console.error('Erro ao persistir orçamento no Supabase:', err);
      this.showToast(`Erro de rede. Salvando localmente no navegador!`, 'error');
      // Ativa fallback para salvar as alterações em andamento
      this.isFallbackMode = true;
      this.loadOrcamentosFromLocalStorage();
      return this.persistOrcamento(o);
    }
  }

  /**
   * Deleta um orçamento (apenas Admins)
   */
  private async deleteOrcamento(id: string): Promise<boolean> {
    if (this.isFallbackMode) {
      this.orcamentos = this.orcamentos.filter(o => o.id !== id);
      this.saveOrcamentosToLocalStorage();
      return true;
    }

    try {
      const { error } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Erro ao deletar orçamento:', err);
      return false;
    }
  }

  /**
   * Utilitário para formatar a data de exibição YYYY-MM-DD para DD/MM/YYYY
   */
  private formatarDataBr(dStr?: string): string {
    if (!dStr) return 'Não definida';
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private formatarDataInputBr(dStr?: string): string {
    if (!dStr) return '';
    const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
    const parts = dataApenas.split('-');
    if (parts.length !== 3) return dStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  /**
   * Retorna o tempo decorrido amigável em português
   */
  private calcularTempoAmigavel(dataIso: string): string {
    const agora = new Date();
    const criado = new Date(dataIso);
    const diffMs = agora.getTime() - criado.getTime();
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutos < 60) {
      return `há ${diffMinutos <= 0 ? 1 : diffMinutos} ${diffMinutos === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffHoras < 24) {
      return `há ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
    } else {
      return `há ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`;
    }
  }

  /**
   * Associa eventos gerais da página
   */
  private setupGlobalEventListeners(): void {
    // Botão de Novo Orçamento
    document.getElementById('btn-novo-orcamento')?.addEventListener('click', () => {
      this.openNovoOrcamentoModal();
    });

    // Vincular botões dentro do Kanban
    this.setupColumnButtons();

    // Evento de Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      const confirmResult = await showCustomConfirm('Deseja realmente sair do sistema?', 'Encerrar Sessão');
      if (confirmResult) {
        const { logoutConsultor } = await import('../services/supabase');
        await logoutConsultor();
        window.location.reload();
      }
    });
  }

  /**
   * Configura os cliques dos botões dos cards
   */
  private setupColumnButtons(): void {
    // Botões de Transição - SOLICITADO -> INICIAR
    this.container.querySelectorAll('[data-action="iniciar"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        const orc = this.orcamentos.find(o => o.id === id);
        if (orc) {
          orc.status = 'EM_ANDAMENTO';
          const success = await this.persistOrcamento(orc);
          if (success) {
            this.showToast('Orçamento em andamento! Hora de criar a proposta.', 'success');
            await this.loadOrcamentos();
            this.render();
          }
        }
      });
    });

    // Botões de Transição - EM ANDAMENTO -> ENVIAR PROPOSTA
    this.container.querySelectorAll('[data-action="inserir-proposta"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) this.openEnviarPropostaModal(id);
      });
    });

    // Botões da coluna AGUARDANDO: ALTERAR
    this.container.querySelectorAll('[data-action="alterar"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        const orc = this.orcamentos.find(o => o.id === id);
        if (orc) {
          orc.status = 'SOLICITADO';
          const success = await this.persistOrcamento(orc);
          if (success) {
            this.showToast('Orçamento retornado para ajuste.', 'success');
            await this.loadOrcamentos();
            this.render();
          }
        }
      });
    });

    // Botões da coluna AGUARDANDO: DESISTIR
    this.container.querySelectorAll('[data-action="desistir"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) this.openMotivoDesistenciaModal(id);
      });
    });

    // Botões da coluna AGUARDANDO: INICIAR NEGOCIAÇÃO (ACEITAR)
    this.container.querySelectorAll('[data-action="aceitar"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) this.openAceitarOrcamentoModal(id);
      });
    });

    // Botão Mudar Consultor
    this.container.querySelectorAll('[data-action="mudar-consultor"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) this.openMudarConsultorModal(id);
      });
    });

    // Botão Lembrar Depois (🔔)
    this.container.querySelectorAll('[data-action="lembrar-depois"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) this.openLembrarDepoisModal(id);
      });
    });

    // Botões de Visualizar Notas/Documentos
    this.container.querySelectorAll('[data-action="ver-notas"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) this.openVerNotasModal(id);
      });
    });

    // Botão Excluir (Disponível apenas para ADMIN)
    this.container.querySelectorAll('[data-action="excluir"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        const confirmResult = await showCustomConfirm(
          'Atenção Admin: Deseja realmente excluir este cartão permanentemente?',
          'Excluir Orçamento',
          { isDestructive: true, confirmText: 'Excluir Permanentemente', cancelText: 'Cancelar' }
        );
        if (confirmResult) {
          const success = await this.deleteOrcamento(id);
          if (success) {
            this.showToast('Orçamento excluído com sucesso!', 'success');
            await this.loadOrcamentos();
            this.render();
          } else {
            this.showToast('Erro ao deletar orçamento.', 'error');
          }
        }
      });
    });

    // Click no Card inteiro (excluindo cliques em botões e ações do card) para abrir visualização/edição em qualquer coluna
    this.container.querySelectorAll('.card-orcamento').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Se clicar em um botão, link ou outro elemento de ação, não abre o modal principal
        if (
          target.closest('button') || 
          target.closest('a') || 
          target.closest('[data-action]') ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'A'
        ) {
          return;
        }
        const id = (card as HTMLElement).dataset.id;
        if (id) this.openVerNotasModal(id);
      });
    });
  }

  /**
   * Renderiza a estrutura da tela
   */
  private render(): void {
    // Separação dos orçamentos por coluna
    const solicitado = this.orcamentos.filter(o => o.status === 'SOLICITADO');
    const emAndamento = this.orcamentos.filter(o => o.status === 'EM_ANDAMENTO');
    const aguardando = this.orcamentos.filter(o => o.status === 'AGUARDANDO');
    const concluido = this.orcamentos.filter(o => o.status === 'CONCLUIDO');

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <!-- Cabeçalho Principal -->
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="PaxFlow Logo" class="h-10 w-auto object-contain" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <span>Orçamentos em Aberto</span>
                ${this.isFallbackMode ? `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-450 border border-amber-500/30 text-[10px] font-black rounded-lg uppercase tracking-wider">Modo Offline</span>` : ''}
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Controle de captações, cotações e propostas</p>
            </div>
          </div>
          
          <div class="flex flex-wrap items-center gap-4">
            <!-- Botão de Ação Primária -->
            <button id="btn-novo-orcamento" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase">
              <svg width="16" height="16" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Novo Orçamento
            </button>

            <!-- Identidade do Consultor Logado -->
            <div class="flex items-center gap-3 pl-2 border-l border-slate-200/60 dark:border-slate-800/60">
              <div class="text-right hidden sm:block">
                <span class="block text-sm font-extrabold text-slate-700 dark:text-slate-300">${this.perfil?.nome || 'Consultor'}</span>
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">${this.perfil?.email || this.user.email}</span>
              </div>
              ${getAvatarSvg(this.perfil?.avatar_url, this.perfil?.nome || 'C', 'w-10 h-10')}
              <!-- Theme Toggle -->
              <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-650 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
                <svg width="20" height="20" class="w-5 h-5 theme-icon-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <svg width="20" height="20" class="w-5 h-5 theme-icon-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <!-- Logout -->
              <button id="btn-logout" title="Sair do Sistema" class="p-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
                <svg width="20" height="20" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <!-- Corpo Principal Kanban -->
        <main class="flex-1 p-6 overflow-x-auto flex gap-6 items-start custom-scrollbar">
          
          <!-- Coluna 1: SOLICITADO -->
          <div class="w-80 bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 border-t-4 border-t-indigo-500 rounded-2xl p-4 flex flex-col shrink-0 orcamentos-column">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60 select-none">
              <div class="flex items-center gap-2">
                <span class="p-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </span>
                <span class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Solicitado</span>
                <span class="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-455 rounded-full text-[10px] font-black">${solicitado.length}</span>
              </div>
            </div>
            <div class="flex flex-col gap-4 overflow-y-auto max-h-[700px] pr-1 custom-scrollbar">
              ${solicitado.map(o => this.renderCardHtml(o)).join('')}
              ${solicitado.length === 0 ? this.renderEmptySlot() : ''}
            </div>
          </div>

          <!-- Coluna 2: EM ANDAMENTO -->
          <div class="w-80 bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 border-t-4 border-t-amber-500 rounded-2xl p-4 flex flex-col shrink-0 orcamentos-column">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60 select-none">
              <div class="flex items-center gap-2">
                <span class="p-1 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Em Andamento</span>
                <span class="px-2 py-0.5 bg-amber-100 dark:bg-indigo-950/80 text-amber-600 dark:text-amber-455 rounded-full text-[10px] font-black">${emAndamento.length}</span>
              </div>
            </div>
            <div class="flex flex-col gap-4 overflow-y-auto max-h-[700px] pr-1 custom-scrollbar">
              ${emAndamento.map(o => this.renderCardHtml(o)).join('')}
              ${emAndamento.length === 0 ? this.renderEmptySlot() : ''}
            </div>
          </div>

          <!-- Coluna 3: AGUARDANDO -->
          <div class="w-80 bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 border-t-4 border-t-rose-500 rounded-2xl p-4 flex flex-col shrink-0 orcamentos-column">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60 select-none">
              <div class="flex items-center gap-2">
                <span class="p-1 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Aguardando</span>
                <span class="px-2 py-0.5 bg-rose-100 dark:bg-indigo-950/80 text-rose-600 dark:text-rose-455 rounded-full text-[10px] font-black">${aguardando.length}</span>
              </div>
            </div>
            <div class="flex flex-col gap-4 overflow-y-auto max-h-[700px] pr-1 custom-scrollbar">
              ${aguardando.map(o => this.renderCardHtml(o)).join('')}
              ${aguardando.length === 0 ? this.renderEmptySlot() : ''}
            </div>
          </div>

          <!-- Coluna 4: CONCLUÍDO -->
          <div class="w-80 bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 border-t-4 border-t-emerald-500 rounded-2xl p-4 flex flex-col shrink-0 orcamentos-column">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60 select-none">
              <div class="flex items-center gap-2">
                <span class="p-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Concluído</span>
                <span class="px-2 py-0.5 bg-emerald-100 dark:bg-indigo-950/80 text-emerald-600 dark:text-emerald-455 rounded-full text-[10px] font-black">${concluido.length}</span>
              </div>
            </div>
            <div class="flex flex-col gap-4 overflow-y-auto max-h-[700px] pr-1 custom-scrollbar">
              ${concluido.map(o => this.renderCardHtml(o)).join('')}
              ${concluido.length === 0 ? this.renderEmptySlot() : ''}
            </div>
          </div>

        </main>
      </div>

      <!-- Portal de Modais -->
      <div id="orcamento-modal-portal"></div>
    `;

    // Re-vincula os ouvintes de eventos da renderização dinâmica das colunas
    this.setupColumnButtons();
  }

  /**
   * Renderiza a representação visual de um card individual
   */
  private renderCardHtml(o: Orcamento): string {
    const temperaturaClasses = {
      Frio: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-100/30 dark:border-sky-900/30',
      Normal: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/30 dark:border-amber-900/30',
      Quente: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/30 dark:border-rose-900/30'
    };

    const tempClass = temperaturaClasses[o.temperatura] || temperaturaClasses.Normal;
    const dono = this.consultores.find(c => c.id === o.consultorId);
    const siglaDono = (dono?.nome || 'A').substring(0, 2).toUpperCase();

    // Data de criação e contadores
    const dataCriacaoFormato = o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : '';
    const tempoAguardando = o.createdAt ? this.calcularTempoAmigavel(o.createdAt) : '';

    const isAdmin = this.perfil?.role === 'admin';

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/85 p-4 rounded-xl shadow-sm card-orcamento relative flex flex-col gap-3.5 select-none animate-card-in" data-id="${o.id}">
        
        <!-- Topo do Card: Nome e Detalhes -->
        <div class="flex items-start justify-between gap-2.5">
          <div class="overflow-hidden flex-1">
            <h4 class="text-xs font-black text-slate-800 dark:text-slate-100 leading-snug truncate">${o.nomeCliente}</h4>
            <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate mt-0.5">${o.contato}</span>
          </div>
          
          <div class="flex flex-col items-end gap-1 shrink-0">
            <!-- Seletor de Temperatura -->
            <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${tempClass}">
              ${o.temperatura}
            </span>
            ${isAdmin ? `
              <span class="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30" title="Consultor Responsável: ${dono?.nome || 'Consultor'}">
                👤 ${(dono?.nome || 'Consultor').split(' ')[0]}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Informações do Destino e Data da Viagem -->
        <div class="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
          <div class="flex justify-between items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Destino:</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${o.destino}</span>
          </div>
          <div class="flex justify-between items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Data Viagem:</span>
            <span class="font-extrabold text-slate-700 dark:text-slate-300">${this.formatarDataBr(o.dataViagem)}</span>
          </div>
        </div>

        <!-- Tags livres -->
        ${o.tags && o.tags.length > 0 ? `
          <div class="flex flex-wrap gap-1.5">
            ${o.tags.map(t => `<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450 rounded font-black text-[9px] uppercase tracking-wide border border-slate-200/20 dark:border-slate-750/20">${t}</span>`).join('')}
          </div>
        ` : ''}

        <!-- Histórico e Contador na Coluna AGUARDANDO -->
        ${o.status === 'AGUARDANDO' ? `
          <div class="border-t border-dashed border-slate-150 dark:border-slate-850 pt-2.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold">
            <span class="flex items-center gap-1">⏱️ ${tempoAguardando}</span>
            <button data-action="ver-notas" data-id="${o.id}" class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-350 font-black transition uppercase text-[9px] tracking-wider flex items-center gap-0.5">
              👁️ Ver Proposta
            </button>
          </div>
        ` : ''}

        <!-- Informações Finais na Coluna CONCLUÍDO -->
        ${o.status === 'CONCLUIDO' ? `
          <div class="border-t border-dashed border-slate-150 dark:border-slate-850 pt-2.5 flex items-center justify-between">
            ${o.subStatus === 'ACEITO' 
              ? `<span class="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100/30 text-[9px] font-black uppercase tracking-wider rounded">Viagem Fechada! 🎉</span>` 
              : `<span class="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-450 dark:text-slate-500 border border-slate-200/20 text-[9px] font-black uppercase tracking-wider rounded">Desistência 🚫</span>`
            }
            <button data-action="ver-notas" data-id="${o.id}" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-black transition uppercase text-[9px] tracking-wider">
              Ver Histórico
            </button>
          </div>
        ` : ''}

        <!-- Rodapé do Card: Responsável, Mudança de Dono e Ações -->
        <div class="border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 flex items-center justify-between gap-2">
          
          <!-- Avatar e botão de alteração do Consultor -->
          <div class="flex items-center gap-1">
            <div title="Responsável: ${dono?.nome || 'Consultor'}" class="shrink-0">
              ${getAvatarSvg(dono?.avatar_url, dono?.nome || 'Consultor', 'w-6 h-6')}
            </div>
            <button data-action="mudar-consultor" data-id="${o.id}" title="Reatribuir Consultor" class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded transition flex items-center justify-center shrink-0">
              <svg width="14" height="14" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M17 14l2-2 2 2" />
                <path d="M19 12v5" />
              </svg>
            </button>
            <button data-action="lembrar-depois" data-id="${o.id}" title="Me Lembre Depois" class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 rounded transition flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>

          <!-- AÇÕES DO FLUXO (Exibidas na extrema direita) -->
          <div class="flex items-center gap-1.5 shrink-0">
            ${o.status === 'SOLICITADO' ? `
              <button data-action="iniciar" data-id="${o.id}" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black tracking-wider uppercase rounded-lg shadow-sm transition flex items-center gap-0.5">
                Iniciar ▶️
              </button>
            ` : ''}

            ${o.status === 'EM_ANDAMENTO' ? `
              <button data-action="inserir-proposta" data-id="${o.id}" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black tracking-wider uppercase rounded-lg shadow-sm transition flex items-center gap-0.5">
                Enviar Proposta 📤
              </button>
            ` : ''}

            ${o.status === 'AGUARDANDO' ? `
              <div class="flex items-center gap-1">
                <button data-action="alterar" data-id="${o.id}" title="Alterar Proposta" class="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-lg transition text-xs">
                  🔄
                </button>
                <button data-action="desistir" data-id="${o.id}" title="Desistir" class="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-black rounded-lg transition text-xs">
                  🚫
                </button>
                <button data-action="aceitar" data-id="${o.id}" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black tracking-wider uppercase rounded-lg shadow-sm transition flex items-center gap-0.5">
                  Vender 🏆
                </button>
              </div>
            ` : ''}

            ${isAdmin ? `
              <button data-action="excluir" data-id="${o.id}" title="Excluir Card (Admin Only)" class="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-300 hover:text-rose-500 rounded transition flex items-center justify-center">
                <svg width="12" height="12" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            ` : ''}
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Renderiza slot de coluna vazia estilizado
   */
  private renderEmptySlot(): string {
    return `
      <div class="border-2 border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl flex flex-col items-center justify-center p-8 text-center text-slate-350 dark:text-slate-600/80 text-[10px] font-bold uppercase tracking-wider select-none min-h-[140px] gap-1.5">
        <span>Sem orçamentos</span>
        <span class="text-[9px] font-semibold text-slate-400 dark:text-slate-650 normal-case">Estágio vazio</span>
      </div>
    `;
  }

  /**
   * Exibe indicador de carregamento
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 p-8 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-semibold animate-pulse">Carregando painel de orçamentos...</p>
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
          <h2 class="text-xl font-bold text-slate-800 mb-2">Erro de Acesso</h2>
          <p class="text-slate-500 text-sm mb-6">${msg}</p>
          <button id="btn-login-redirect" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition">
            Voltar
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Abre o Modal de Criação de Novo Orçamento (Estágio SOLICITADO)
   */
  private openNovoOrcamentoModal(): void {
    this.renderModalOverlay();
    const portal = document.getElementById('orcamento-modal-portal');
    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent || !portal) return;

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-5">
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" class="w-5 h-5 text-indigo-500 mr-1.5 shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span>Novo Orçamento</span>
          </h3>
          <button id="btn-close-modal-x" class="text-slate-400 hover:text-rose-500 font-bold transition text-lg">&times;</button>
        </div>

        <form id="form-novo-orcamento" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Nome Completo do Cliente *</label>
            <input id="input-orc-nome" type="text" required placeholder="ex: João da Silva" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Telefone</label>
              <input id="input-orc-telefone" type="tel" placeholder="ex: (11) 98888-7777" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">E-mail</label>
              <input id="input-orc-email" type="email" placeholder="ex: joao@email.com" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Destino da Viagem *</label>
              <input id="input-orc-destino" type="text" required placeholder="ex: Miami, EUA" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Data Estimada (DD/MM/AAAA) *</label>
              <input id="input-orc-data" type="text" required placeholder="DD/MM/AAAA" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Temperatura do Lead *</label>
              <select id="select-orc-temp" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="Normal">Normal (50% de chance)</option>
                <option value="Quente">Quente (Alta chance)</option>
                <option value="Frio">Frio (Baixa chance)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Consultor Responsável</label>
              <select id="select-orc-consultor" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" ${this.perfil?.role !== 'admin' ? 'disabled' : ''}>
                ${this.consultores.map(c => `<option value="${c.id}" ${c.id === this.user.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tags (Digite e aperte Enter)</label>
            <div class="flex flex-wrap items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 min-h-[46px]">
              <div id="tags-container-modal" class="flex flex-wrap gap-1.5"></div>
              <input id="input-orc-tag" type="text" placeholder="Adicionar tag..." class="flex-1 bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 font-semibold text-sm min-w-[100px]" />
            </div>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Ex: Casal, Nacional, Luxo, Disney</p>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
            <button id="btn-cancel-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
            <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Criar Orçamento</button>
          </div>
        </form>
      </div>
    `;

    // Fechamento de Modais
    const closeModal = () => this.closeModal();
    document.getElementById('btn-close-modal-x')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    // Máscara e auto-formatação para a Data Estimada (dd/mm/aaaa) em conformidade com .cursorrules
    const dataInput = document.getElementById('input-orc-data') as HTMLInputElement;
    dataInput?.addEventListener('input', () => {
      let v = dataInput.value.replace(/\D/g, '').slice(0, 8);
      if (v.length >= 5) {
        dataInput.value = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
      } else if (v.length >= 3) {
        dataInput.value = `${v.slice(0, 2)}/${v.slice(2)}`;
      } else {
        dataInput.value = v;
      }
    });

    // Gerenciador de Tags
    const tagsContainer = document.getElementById('tags-container-modal') as HTMLElement;
    const tagInput = document.getElementById('input-orc-tag') as HTMLInputElement;
    const tagsList: string[] = [];

    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const rawTag = tagInput.value.trim();
        if (rawTag && !tagsList.includes(rawTag)) {
          tagsList.push(rawTag);
          
          const tagBadge = document.createElement('span');
          tagBadge.className = 'px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md font-bold text-xs border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1 select-none';
          tagBadge.innerHTML = `
            <span>${rawTag}</span>
            <button type="button" class="text-slate-400 hover:text-rose-500 font-bold text-[10px] leading-none transition" data-tag="${rawTag}">&times;</button>
          `;
          
          // Evento de remover a tag do badge
          tagBadge.querySelector('button')?.addEventListener('click', () => {
            const index = tagsList.indexOf(rawTag);
            if (index > -1) {
              tagsList.splice(index, 1);
            }
            tagBadge.remove();
          });

          tagsContainer.appendChild(tagBadge);
          tagInput.value = '';
        }
      }
    });

    // Submissão do Formulário
    const form = document.getElementById('form-novo-orcamento') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nomeVal = (document.getElementById('input-orc-nome') as HTMLInputElement).value;
      const telVal = (document.getElementById('input-orc-telefone') as HTMLInputElement).value.trim();
      const emailVal = (document.getElementById('input-orc-email') as HTMLInputElement).value.trim();
      const destinoVal = (document.getElementById('input-orc-destino') as HTMLInputElement).value;
      const dataRaw = (document.getElementById('input-orc-data') as HTMLInputElement).value.trim();
      const tempVal = (document.getElementById('select-orc-temp') as HTMLSelectElement).value as 'Frio' | 'Normal' | 'Quente';
      const consultorVal = (document.getElementById('select-orc-consultor') as HTMLSelectElement).value;

      // Validação do padrão DD/MM/AAAA estipulado no .cursorrules
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!dateRegex.test(dataRaw)) {
        this.showToast('Por favor, informe a data no formato correto DD/MM/AAAA.', 'error');
        return;
      }

      const [, dia, mes, ano] = dataRaw.match(dateRegex)!;
      const dataVal = `${ano}-${mes}-${dia}`;

      if (!telVal && !emailVal) {
        this.showToast('Por favor, informe pelo menos um meio de contato (Telefone ou E-mail).', 'error');
        return;
      }

      let contatoVal = '';
      if (telVal && emailVal) {
        contatoVal = `${telVal} / ${emailVal}`;
      } else if (telVal) {
        contatoVal = telVal;
      } else {
        contatoVal = emailVal;
      }

      const payload: Orcamento = {
        id: 'orc-' + Math.random().toString(36).substr(2, 9),
        consultorId: consultorVal,
        nomeCliente: nomeVal,
        contato: contatoVal,
        destino: destinoVal,
        dataViagem: dataVal,
        temperatura: tempVal,
        tags: tagsList,
        status: 'SOLICITADO'
      };

      const success = await this.persistOrcamento(payload);
      if (success) {
        this.showToast('Orçamento registrado com sucesso!', 'success');
        this.closeModal();
        await this.loadOrcamentos();
        this.render();
      } else {
        this.showToast('Erro ao criar orçamento.', 'error');
      }
    });
  }

  /**
   * Abre o modal obrigatório para a coluna EM ANDAMENTO -> AGUARDANDO
   * Exige notas textuais e upload de proposta comercial integrando com Google Drive corporativo
   */
  private openEnviarPropostaModal(id: string): void {
    const orc = this.orcamentos.find(o => o.id === id);
    if (!orc) return;

    this.renderModalOverlay();
    const portal = document.getElementById('orcamento-modal-portal');
    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent || !portal) return;

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-5">
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>📤 Enviar Proposta de Orçamento</span>
          </h3>
          <button id="btn-close-modal-x" class="text-slate-400 hover:text-rose-500 font-bold transition text-lg">&times;</button>
        </div>

        <p class="text-xs text-slate-400 dark:text-slate-500 mb-4 font-semibold">
          Para avançar o orçamento de <span class="font-extrabold text-indigo-600 dark:text-indigo-400">${orc.nomeCliente}</span> para o estágio de <strong>AGUARDANDO</strong>, é obrigatório registrar o resumo da proposta comercial ou fazer upload do documento corporativo (pelo menos um dos dois).
        </p>

        <form id="form-enviar-proposta" class="space-y-5">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Resumo / Notas da Negociação</label>
            <textarea id="textarea-orc-notas" placeholder="Insira o escopo da cotação, hotéis ofertados, voos, valores, tarifas e qualquer observação importante da negociação..." rows="4.5" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-sm font-semibold">${orc.notasNegociacao || ''}</textarea>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Obrigatório caso não anexe o documento da proposta.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Upload de Documento da Proposta (PDF/Imagem)</label>
            <input type="file" id="file-input-proposta" accept="application/pdf,image/*" class="hidden" />
            <div id="upload-proposta-dropzone" class="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400/80 bg-slate-50/30 dark:bg-slate-800/10 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl p-6 text-center cursor-pointer transition transform hover:-translate-y-0.5 flex flex-col items-center justify-center space-y-2 group">
              <div id="upload-proposta-visual" class="flex flex-col items-center justify-center space-y-2">
                <span class="text-3xl filter group-hover:scale-110 transition duration-300">📄</span>
                <p class="text-sm text-slate-700 dark:text-slate-300 font-extrabold">Selecionar arquivo de proposta</p>
                <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold">Clique para anexar arquivo (Máx. 15MB)</p>
              </div>
            </div>
            <div id="selected-file-label" class="hidden text-xs text-emerald-600 dark:text-emerald-450 font-bold mt-2 flex items-center gap-1">
              <span>✅</span> <span id="file-name-span"></span>
            </div>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Obrigatório caso o campo de notas acima esteja vazio.</p>

            ${orc.documentosUrl && orc.documentosUrl.length > 0 ? `
              <div class="mt-4 bg-indigo-50/35 dark:bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-100/30 dark:border-indigo-900/35">
                <p class="text-[10px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-wide mb-2 flex items-center gap-1 select-none">
                  <span>📎</span> Documentos já salvos nesta proposta
                </p>
                <div class="grid grid-cols-1 gap-2">
                  ${orc.documentosUrl.map((url, index) => `
                    <div class="flex items-center justify-between p-2 bg-white dark:bg-slate-800/60 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700/60">
                      <a href="${url}" target="_blank" class="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 truncate flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                        📄 Proposta #${index + 1}
                      </a>
                      <span class="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-black select-none border border-emerald-100/10">Salvo no Drive</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
            <button id="btn-cancel-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
            <button type="submit" id="btn-submit-proposta" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Avançar Orçamento 🚀</button>
          </div>
        </form>
      </div>
    `;

    // Fechamento de Modais
    const closeModal = () => this.closeModal();
    document.getElementById('btn-close-modal-x')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    // Upload Lógica
    const dropzone = document.getElementById('upload-proposta-dropzone') as HTMLElement;
    const fileInput = document.getElementById('file-input-proposta') as HTMLInputElement;
    const visual = document.getElementById('upload-proposta-visual') as HTMLElement;
    const fileLabel = document.getElementById('selected-file-label') as HTMLElement;
    const fileNameSpan = document.getElementById('file-name-span') as HTMLElement;

    let selectedFile: File | null = null;

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        selectedFile = fileInput.files[0];
        fileNameSpan.textContent = selectedFile.name;
        fileLabel.classList.remove('hidden');
      }
    });

    const form = document.getElementById('form-enviar-proposta') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const notasVal = (document.getElementById('textarea-orc-notas') as HTMLTextAreaElement).value.trim();
      const temDocumentoAnterior = orc.documentosUrl && orc.documentosUrl.length > 0;

      if (!notasVal && !selectedFile && !temDocumentoAnterior) {
        this.showToast('Por favor, preencha o Resumo/Notas ou anexe o arquivo da proposta comercial.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-proposta') as HTMLButtonElement;
      submitBtn.disabled = true;

      if (selectedFile) {
        submitBtn.textContent = 'Enviando ao Drive...';
        visual.innerHTML = `
          <div class="flex flex-col items-center justify-center space-y-2">
            <div class="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs text-slate-500 font-bold animate-pulse">Processando upload corporativo...</p>
          </div>
        `;
      } else {
        submitBtn.textContent = 'Processando...';
      }

      try {
        if (selectedFile) {
          // Envia o documento via Edge Function/Mock do Google Drive
          // Formata os contatos para extrair e-mail de teste ou campos vazios
          const parts = orc.contato.split('/');
          const email = parts.length > 1 ? parts[1].trim() : 'lead@orcamentos.com';
          const telefone = parts.length > 0 ? parts[0].trim() : '(11) 90000-0000';

          const result = await uploadDocumentoCliente(
            orc.id,
            orc.nomeCliente,
            email,
            telefone,
            selectedFile
          );

          if (result.success && result.googleDriveFolderUrl) {
            orc.notasNegociacao = notasVal;
            orc.documentosUrl = orc.documentosUrl || [];
            orc.documentosUrl.push(result.googleDriveFolderUrl);
            orc.status = 'AGUARDANDO';

            const success = await this.persistOrcamento(orc);
            if (success) {
              this.showToast('Proposta enviada com sucesso ao cliente!', 'success');
              this.closeModal();
              await this.loadOrcamentos();
              this.render();
            } else {
              throw new Error('Falha ao atualizar orçamento.');
            }
          } else {
            throw new Error(result.error || 'Erro no upload.');
          }
        } else {
          // Apenas atualiza as notas da proposta sem fazer upload
          orc.notasNegociacao = notasVal;
          orc.status = 'AGUARDANDO';

          const success = await this.persistOrcamento(orc);
          if (success) {
            this.showToast('Orçamento avançado com sucesso!', 'success');
            this.closeModal();
            await this.loadOrcamentos();
            this.render();
          } else {
            throw new Error('Falha ao atualizar orçamento.');
          }
        }

      } catch (err: any) {
        console.error('Erro na submissão da proposta:', err);
        this.showToast(`Erro ao avançar proposta: ${err.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Avançar Orçamento 🚀';

        // Restaurar visual da dropzone em caso de falha de upload
        if (selectedFile) {
          visual.innerHTML = `
            <span class="text-3xl filter group-hover:scale-110 transition duration-300">📄</span>
            <p class="text-sm text-slate-700 dark:text-slate-300 font-extrabold">Selecionar arquivo de proposta</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold">Clique para anexar arquivo (Máx. 15MB)</p>
          `;
        }
      }
    });
  }

  /**
   * Abre o modal inteligente para fechar o orçamento (AGUARDANDO -> CONCLUIDO / ACEITO)
   * Permite cadastrar automaticamente o Cliente e a Viagem pré-preenchendo os dados
   */
  private openAceitarOrcamentoModal(id: string): void {
    const orc = this.orcamentos.find(o => o.id === id);
    if (!orc) return;

    this.renderModalOverlay();
    const portal = document.getElementById('orcamento-modal-portal');
    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent || !portal) return;

    // Tenta extrair telefone e e-mail do contato
    const parts = orc.contato.split('/');
    const tVal = parts.length > 0 ? parts[0].trim() : '';
    const eVal = parts.length > 1 ? parts[1].trim() : '';

    modalContent.innerHTML = `
      <div class="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
        <div class="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-5">
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🏆 Iniciar Negociação / Fechar Viagem</span>
          </h3>
          <button id="btn-close-modal-x" class="text-slate-400 hover:text-rose-500 font-bold transition text-lg">&times;</button>
        </div>

        <div class="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border border-emerald-100/30 rounded-xl text-xs font-bold mb-5 leading-normal flex items-start gap-2">
          <span class="text-base select-none">🎉</span>
          <p>
            Parabéns pela venda! Ao confirmar os dados abaixo, o PaxFlow criará **automaticamente** a ficha única do passageiro na Ficha de Clientes e adicionará a viagem no Kanban Operacional, vinculando todos os históricos.
          </p>
        </div>

        <form id="form-fechar-viagem" class="space-y-6">
          
          <!-- SEÇÃO 1: DADOS DO NOVO CLIENTE -->
          <div>
            <h4 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3.5 border-b border-indigo-50/50 dark:border-slate-800 pb-1">1. Ficha Única do Passageiro</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Nome Completo *</label>
                <input id="input-fechar-cli-nome" type="text" required value="${orc.nomeCliente}" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">E-mail de Contato *</label>
                <input id="input-fechar-cli-email" type="email" required value="${eVal}" placeholder="ex: passageiro@email.com" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Telefone/WhatsApp *</label>
                <input id="input-fechar-cli-telefone" type="tel" required value="${tVal}" placeholder="ex: (11) 98888-7777" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Documento de Identificação *</label>
                <input id="input-fechar-cli-doc" type="text" required placeholder="Digite o CPF ou RG do cliente" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
              </div>
            </div>
          </div>

          <!-- SEÇÃO 2: DADOS DO KANBAN OPERACIONAL (VIAGENS) -->
          <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h4 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3.5 border-b border-indigo-50/50 dark:border-slate-800 pb-1">2. Dados Operacionais da Viagem</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Destino *</label>
                <input id="input-fechar-via-destino" type="text" required value="${orc.destino}" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Código Localizador (LOC)</label>
                <input id="input-fechar-via-loc" type="text" placeholder="ex: F3R9W (opcional)" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm uppercase" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Data de Ida (DD/MM/AAAA) *</label>
                <input id="input-fechar-via-ida" type="text" required placeholder="DD/MM/AAAA" value="${this.formatarDataInputBr(orc.dataViagem)}" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Data de Volta (DD/MM/AAAA) *</label>
                <input id="input-fechar-via-volta" type="text" required placeholder="DD/MM/AAAA" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Valor da Venda (R$) *</label>
                <input id="input-fechar-via-valor" type="text" required placeholder="0,00" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Etapa Inicial Operacional *</label>
                <select id="select-fechar-via-status" required class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                  <option value="fechado">Fechado (Aguardando pós-venda)</option>
                  <option value="pos_venda">Pós-Venda</option>
                  <option value="pre_embarque">Pré-Embarque</option>
                </select>
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Notas Operacionais</label>
              <textarea id="textarea-fechar-via-obs" placeholder="Mais detalhes operacionais..." rows="2" class="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-sm font-semibold">${orc.notasNegociacao || ''}</textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
            <button id="btn-cancel-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
            <button type="submit" id="btn-submit-fechar" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-emerald-600/10 transition uppercase">Emitir Viagem & Confirmar 🏆</button>
          </div>
        </form>
      </div>
    `;

    // Fechamento de Modais
    const closeModal = () => this.closeModal();
    document.getElementById('btn-close-modal-x')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    const form = document.getElementById('form-fechar-viagem') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btnSubmit = document.getElementById('btn-submit-fechar') as HTMLButtonElement;
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Processando...';

      try {
        const cNome = (document.getElementById('input-fechar-cli-nome') as HTMLInputElement).value;
        const cEmail = (document.getElementById('input-fechar-cli-email') as HTMLInputElement).value;
        const cTelefone = (document.getElementById('input-fechar-cli-telefone') as HTMLInputElement).value;
        const cDoc = (document.getElementById('input-fechar-cli-doc') as HTMLInputElement).value;

        const vDestino = (document.getElementById('input-fechar-via-destino') as HTMLInputElement).value;
        const vLoc = (document.getElementById('input-fechar-via-loc') as HTMLInputElement).value;
        const vIdaRaw = (document.getElementById('input-fechar-via-ida') as HTMLInputElement).value.trim();
        const vVoltaRaw = (document.getElementById('input-fechar-via-volta') as HTMLInputElement).value.trim();
        const vValorRaw = (document.getElementById('input-fechar-via-valor') as HTMLInputElement).value.trim();
        const vStatus = (document.getElementById('select-fechar-via-status') as HTMLSelectElement).value;
        const vObs = (document.getElementById('textarea-fechar-via-obs') as HTMLTextAreaElement).value;

        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dateRegex.test(vIdaRaw)) {
          throw new Error('Por favor, informe a Data de Ida no formato correto DD/MM/AAAA.');
        }
        if (!dateRegex.test(vVoltaRaw)) {
          throw new Error('Por favor, informe a Data de Volta no formato correto DD/MM/AAAA.');
        }

        const [, idaDia, idaMes, idaAno] = vIdaRaw.match(dateRegex)!;
        const vIda = `${idaAno}-${idaMes}-${idaDia}`;

        const [, voltaDia, voltaMes, voltaAno] = vVoltaRaw.match(dateRegex)!;
        const vVolta = `${voltaAno}-${voltaMes}-${voltaDia}`;

        const parseDoubleBr = (valStr: string): number => {
          const clean = valStr.replace(/R\$\s?/gi, '').replace(/\./g, '').replace(',', '.').trim();
          const num = parseFloat(clean);
          return isNaN(num) ? 0 : num;
        };
        const vValor = parseDoubleBr(vValorRaw);

        let clienteId = 'cli-mocked-' + Math.random().toString(36).substr(2, 9);
        let folderDriveUrl = orc.documentosUrl && orc.documentosUrl.length > 0 ? orc.documentosUrl[0] : '';

        // 1. Cadastrar Cliente no Supabase
        if (!this.isFallbackMode) {
          const { data: newCli, error: errCli } = await supabase
            .from('clientes')
            .insert({
              nome: cNome,
              email: cEmail,
              telefone: cTelefone,
              documento: cDoc,
              consultor_responsavel_id: orc.consultorId,
              google_drive_folder_url: folderDriveUrl || null,
              observacoes: `Criado automaticamente através do Orçamento aprovado ID ${orc.id}`
            })
            .select()
            .single();

          if (errCli) throw errCli;
          if (newCli) clienteId = newCli.id;
        }

        // 2. Cadastrar Viagem no Supabase
        if (!this.isFallbackMode) {
          const { error: errVia } = await supabase
            .from('viagens')
            .insert({
              cliente_id: clienteId,
              consultor_id: orc.consultorId,
              destino: vDestino,
              codigo_localizador: vLoc || null,
              valor_total: vValor,
              data_ida: vIda,
              data_volta: vVolta,
              status: vStatus,
              observacoes: vObs || null
            });

          if (errVia) throw errVia;
        } else {
          // Mock local de viagem no console em modo offline
          console.log('Modo Offline: Nova viagem mock criada no Kanban Operacional para', cNome);
        }

        // 3. Atualizar Orçamento para CONCLUÍDO (ACEITO)
        orc.status = 'CONCLUIDO';
        orc.subStatus = 'ACEITO';
        await this.persistOrcamento(orc);

        this.showToast('Negócio Fechado! Cliente e Viagem gerados com sucesso!', 'success');
        this.closeModal();
        await this.loadOrcamentos();
        this.render();

      } catch (err: any) {
        console.error('Erro ao fechar venda do orçamento:', err);
        this.showToast(`Erro no fechamento: ${err.message}`, 'error');
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Emitir Viagem & Confirmar 🏆';
      }
    });
  }

  /**
   * Abre o Modal de reatribuição "Mudar Consultor"
   */
  private openMudarConsultorModal(id: string): void {
    const orc = this.orcamentos.find(o => o.id === id);
    if (!orc) return;

    this.renderModalOverlay();
    const portal = document.getElementById('orcamento-modal-portal');
    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent || !portal) return;

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-5">
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>👤 Reatribuir Consultor Responsável</span>
          </h3>
          <button id="btn-close-modal-x" class="text-slate-400 hover:text-rose-500 font-bold transition text-lg">&times;</button>
        </div>

        <p class="text-xs text-slate-400 dark:text-slate-500 mb-4 font-semibold">
          Selecione o novo consultor para gerenciar o orçamento de <span class="font-extrabold text-indigo-600 dark:text-indigo-400">${orc.nomeCliente}</span>.
          ${this.perfil?.role !== 'admin' ? '<br><span class="text-rose-500">Atenção: Ao reatribuir, este card sairá imediatamente da sua tela.</span>' : ''}
        </p>

        <form id="form-reatribuir-consultor" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Novo Responsável *</label>
            <select id="select-novo-consultor" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
              <option value="" disabled selected>Escolha um consultor ativo...</option>
              ${this.consultores.map(c => `<option value="${c.id}" ${c.id === orc.consultorId ? 'disabled class="text-slate-400"' : ''}>${c.nome} (${c.role})</option>`).join('')}
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
            <button id="btn-cancel-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
            <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Confirmar Transferência</button>
          </div>
        </form>
      </div>
    `;

    // Fechamento de Modais
    const closeModal = () => this.closeModal();
    document.getElementById('btn-close-modal-x')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    const form = document.getElementById('form-reatribuir-consultor') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const novoConsultorId = (document.getElementById('select-novo-consultor') as HTMLSelectElement).value;
      if (!novoConsultorId) return;

      const anteriorDono = this.consultores.find(c => c.id === orc.consultorId)?.nome || 'Antigo';
      const novoDono = this.consultores.find(c => c.id === novoConsultorId)?.nome || 'Novo';

      orc.consultorId = novoConsultorId;
      const success = await this.persistOrcamento(orc);

      if (success) {
        this.showToast(`Orçamento transferido com sucesso para ${novoDono}!`, 'success');
        this.closeModal();
        await this.loadOrcamentos();
        this.render();
      } else {
        this.showToast('Erro ao reatribuir orçamento.', 'error');
      }
    });
  }

  /**
   * Abre o Modal de Visualização de Notas e Históricos
   */
  private openVerNotasModal(id: string): void {
    const orc = this.orcamentos.find(o => o.id === id);
    if (!orc) return;

    this.renderModalOverlay();
    const portal = document.getElementById('orcamento-modal-portal');
    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent || !portal) return;

    const filesHtml = orc.documentosUrl && orc.documentosUrl.length > 0 
      ? orc.documentosUrl.map((url, index) => `
          <a href="${url}" target="_blank" class="px-4 py-2.5 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 text-xs font-black transition flex items-center justify-center gap-2 select-none uppercase tracking-wide">
            📄 Documento da Proposta #${index + 1}
          </a>
        `).join('')
      : '<p class="text-xs text-slate-400 dark:text-slate-500 font-semibold italic">Nenhum arquivo anexado nesta proposta.</p>';

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-5">
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>📝 Histórico da Proposta Comercial</span>
          </h3>
          <button id="btn-close-modal-x" class="text-slate-400 hover:text-rose-500 font-bold transition text-lg">&times;</button>
        </div>

        <div class="space-y-5">
          <div>
            <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Cliente & Destino</h4>
            <div class="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350">
              <span class="block">Passageiro: <strong class="text-slate-800 dark:text-slate-100">${orc.nomeCliente}</strong></span>
              <span class="block mt-1">Destino: <strong>${orc.destino}</strong> (${this.formatarDataBr(orc.dataViagem)})</span>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Notas da Negociação</h4>
            <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-750 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              ${orc.notasNegociacao || 'Nenhuma nota registrada.'}
            </div>
          </div>

          <div>
            <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Documentos Anexos</h4>
            <div class="grid grid-cols-1 gap-2">
              ${filesHtml}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-5 border-t border-slate-150 dark:border-slate-800 mt-5">
          <button id="btn-close-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Fechar</button>
        </div>
      </div>
    `;

    const handleClose = () => this.closeModal();
    document.getElementById('btn-close-modal-x')?.addEventListener('click', handleClose);
    document.getElementById('btn-close-modal')?.addEventListener('click', handleClose);
  }

  /**
   * Renderiza a base escura dos modais com Glassmorphism
   */
  private renderModalOverlay(): void {
    const portal = document.getElementById('orcamento-modal-portal');
    if (!portal) return;

    portal.innerHTML = `
      <div id="modal-overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center opacity-0 transition-opacity duration-200">
        <div id="modal-content-container" class="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden transform scale-95 transition-all duration-200 flex flex-col">
          <!-- Injetado dinamicamente -->
        </div>
      </div>
    `;

    // Ativa animações de entrada
    setTimeout(() => {
      const overlay = document.getElementById('modal-overlay');
      const content = document.getElementById('modal-content-container');
      if (overlay && content) {
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
      }
    }, 10);
  }

  /**
   * Fecha os modais com animações
   */
  private closeModal(): void {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content-container');
    if (overlay && content) {
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      content.classList.remove('scale-100');
      content.classList.add('scale-95');
      setTimeout(() => {
        const portal = document.getElementById('orcamento-modal-portal');
        if (portal) portal.innerHTML = '';
      }, 200);
    }
  }

  /**
   * Exibe mensagens flutuantes (Toasts)
   */
  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
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
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${message}`;

    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      }
    }, 3500);
  }

  /**
   * Configura o Canal de Comunicação em Tempo Real do Supabase
   */
  private setupRealtimeChannel(): void {
    if (this.isFallbackMode) return;

    this.realtimeChannel = supabase
      .channel('orcamentos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orcamentos' }, async () => {
        await this.loadOrcamentos();
        this.render();
      })
      .subscribe();
  }

  /**
   * Limpeza de listeners ao fechar ou transicionar a página
   */
  public destroy(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }
  }

  /**
   * Abre o Modal de "Me Lembre Depois" para agendamento de lembretes
   */
  private openLembrarDepoisModal(id: string): void {
    const orc = this.orcamentos.find(o => o.id === id);
    if (!orc) return;

    this.renderModalOverlay();
    const portal = document.getElementById('orcamento-modal-portal');
    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent || !portal) return;

    const hoje = new Date().toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-5">
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🔔 Agendar Lembrete "Me Lembre Depois"</span>
          </h3>
          <button id="btn-close-modal-x" class="text-slate-400 hover:text-rose-500 font-bold transition text-lg">&times;</button>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-450 mb-4 font-semibold">
          Defina uma data e um período para receber um alerta no seu inbox sobre o orçamento de <span class="font-extrabold text-indigo-650 dark:text-indigo-400">${orc.nomeCliente} - ${orc.destino}</span>.
        </p>

        <form id="form-lembrar-depois" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Data do Alerta *</label>
            <input id="input-lembrete-data" type="text" placeholder="DD/MM/YYYY" required value="${this.formatarDataBr(hoje)}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Período *</label>
            <select id="select-lembrete-periodo" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
              <option value="manha">🌅 Manhã</option>
              <option value="tarde" selected>☀️ Tarde</option>
              <option value="noite">🌙 Noite</option>
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
            <button id="btn-cancel-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
            <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">Agendar Alerta</button>
          </div>
        </form>
      </div>
    `;

    const closeModal = () => this.closeModal();
    document.getElementById('btn-close-modal-x')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    // Auto-mask para data em formato DD/MM/YYYY
    const dataInput = document.getElementById('input-lembrete-data') as HTMLInputElement;
    dataInput?.addEventListener('input', () => {
      let v = dataInput.value.replace(/\D/g, '');
      if (v.length > 8) v = v.slice(0, 8);
      if (v.length > 4) {
        dataInput.value = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
      } else if (v.length > 2) {
        dataInput.value = `${v.slice(0, 2)}/${v.slice(2)}`;
      } else {
        dataInput.value = v;
      }
    });

    const form = document.getElementById('form-lembrar-depois') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const dataLembreteRaw = (document.getElementById('input-lembrete-data') as HTMLInputElement).value.trim();
      const periodo = (document.getElementById('select-lembrete-periodo') as HTMLSelectElement).value;

      if (!dataLembreteRaw || !periodo) return;

      // Validação do formato DD/MM/YYYY
      const regexData = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!regexData.test(dataLembreteRaw)) {
        showCustomAlert('Por favor, insira a data no formato DD/MM/YYYY (ex: 28/05/2026).', 'Formato de Data Inválido');
        return;
      }

      const parts = dataLembreteRaw.split('/');
      const dataLembrete = `${parts[2]}-${parts[1]}-${parts[0]}`; // Converte para YYYY-MM-DD para o banco

      try {
        const { error } = await supabase
          .from('lembretes')
          .insert({
            orcamento_id: id,
            consultor_id: this.user.id,
            data_lembrete: dataLembrete,
            periodo: periodo,
            arquivado: false
          });

        if (error) throw error;

        this.showToast('Lembrete agendado com sucesso!', 'success');
        this.closeModal();

      } catch (err: any) {
        showCustomAlert(`Erro ao agendar lembrete:\n\n${err.message || err}`, 'Erro de Agendamento');
      }
    });
  }

  private openMotivoDesistenciaModal(id: string): void {
    const orc = this.orcamentos.find(o => o.id === id);
    if (!orc) return;

    this.renderModalOverlay();
    const portal = document.getElementById('orcamento-modal-portal');
    const modalContent = document.getElementById('modal-content-container');
    if (!modalContent || !portal) return;

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-5">
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🚫 Motivo da Desistência</span>
          </h3>
          <button id="btn-close-modal-x" class="text-slate-400 hover:text-rose-500 font-bold transition text-lg">&times;</button>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-455 mb-4 font-semibold">
          Selecione o motivo da desistência para o orçamento de <span class="font-extrabold text-indigo-650 dark:text-indigo-400">${orc.nomeCliente} - ${orc.destino}</span>:
        </p>

        <form id="form-motivo-desistencia" class="space-y-4">
          <div class="space-y-2.5">
            <label class="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition">
              <input type="radio" name="motivo" value="Comprou com a concorrência" required class="text-indigo-650 focus:ring-indigo-500 h-4 w-4" />
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Comprou com a concorrência</span>
            </label>

            <label class="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition">
              <input type="radio" name="motivo" value="Desistiu da compra" class="text-indigo-650 focus:ring-indigo-500 h-4 w-4" />
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Desistiu da compra</span>
            </label>

            <label class="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition">
              <input type="radio" name="motivo" value="Parou de responder" class="text-indigo-650 focus:ring-indigo-500 h-4 w-4" />
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Parou de responder</span>
            </label>

            <label class="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition">
              <input type="radio" name="motivo" value="Outro" id="radio-motivo-outro" class="text-indigo-650 focus:ring-indigo-500 h-4 w-4" />
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Outro</span>
            </label>
          </div>

          <!-- Linha para digitação do motivo customizado (inicialmente oculta) -->
          <div id="container-motivo-customizado" class="hidden animate-card-in">
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Especifique o Motivo *</label>
            <input id="input-motivo-customizado" type="text" placeholder="Digite o motivo da desistência..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
            <button id="btn-cancel-modal" type="button" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-xl transition uppercase">Cancelar</button>
            <button type="submit" class="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-rose-600/10 transition uppercase">Confirmar Desistência</button>
          </div>
        </form>
      </div>
    `;

    const closeModal = () => this.closeModal();
    document.getElementById('btn-close-modal-x')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    const form = document.getElementById('form-motivo-desistencia') as HTMLFormElement;
    const containerCustom = document.getElementById('container-motivo-customizado') as HTMLElement;
    const inputCustom = document.getElementById('input-motivo-customizado') as HTMLInputElement;

    // Monitora a mudança dos radios para mostrar/ocultar o campo customizado
    form.querySelectorAll('input[name="motivo"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isOutro = (radio as HTMLInputElement).value === 'Outro' && (radio as HTMLInputElement).checked;
        if (isOutro) {
          containerCustom.classList.remove('hidden');
          inputCustom.setAttribute('required', 'true');
          inputCustom.focus();
        } else {
          containerCustom.classList.add('hidden');
          inputCustom.removeAttribute('required');
          inputCustom.value = '';
        }
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const radioSelecionado = form.querySelector('input[name="motivo"]:checked') as HTMLInputElement;
      if (!radioSelecionado) return;

      let motivoFinal = radioSelecionado.value;
      if (motivoFinal === 'Outro') {
        motivoFinal = inputCustom.value.trim();
        if (!motivoFinal) {
          showCustomAlert('Por favor, especifique o motivo da desistência.', 'Motivo Requerido');
          return;
        }
      }

      try {
        orc.status = 'CONCLUIDO';
        orc.subStatus = 'DESISTENCIA';

        // 1. Salvar no histórico das notas de negociação
        const timestamp = new Date().toLocaleString('pt-BR');
        const registroDesistencia = `[Desistência em ${timestamp}] Motivo: ${motivoFinal}`;
        orc.notasNegociacao = orc.notasNegociacao 
          ? `${registroDesistencia}\n----------------------------------\n${orc.notasNegociacao}`
          : registroDesistencia;

        // 2. Adicionar como tag visual no card
        const tagMotivo = `Desistência: ${motivoFinal}`;
        // Limpar tags anteriores que comecem com "Desistência:" para não duplicar
        orc.tags = orc.tags.filter(t => !t.startsWith('Desistência:'));
        orc.tags.push(tagMotivo);

        const success = await this.persistOrcamento(orc);
        if (success) {
          this.showToast('Orçamento marcado como desistência com sucesso!', 'success');
          this.closeModal();
          await this.loadOrcamentos();
          this.render();
        } else {
          throw new Error('Erro ao salvar no banco de dados.');
        }

      } catch (err: any) {
        showCustomAlert(`Erro ao registrar desistência:\n\n${err.message || err}`, 'Erro de Registro');
      }
    });
  }
}
export default OrcamentosPage;
