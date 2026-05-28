import { supabase, getSessaoAtual, atualizarSenhaAtual, salvarSenhaLocal } from '../services/supabase';
import { PerfilConsultor, GlobalSettings } from '../types';
import { createClient } from '@supabase/supabase-js';
import { getAvatarSvg, AVATAR_OPTIONS, mesclarAvataresLocais, salvarAvatarLocal } from '../services/avatars';

declare const process: any;

const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || 
  '';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || 
  '';

// Injeta estilos premium adicionais para a tela de configurações no DOM
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .google-btn {
      background-color: #ffffff;
      border: 1px solid #dadce0;
      color: #3c4043;
      transition: background-color .218s, border-color .218s, box-shadow .218s;
    }
    .google-btn:hover {
      background-color: #f8f9fa;
      border-color: #e8eaed;
      box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
    }
    .dark .google-btn {
      background-color: #1e293b;
      border: 1px solid #334155;
      color: #e2e8f0;
    }
    .dark .google-btn:hover {
      background-color: #334155;
      border-color: #475569;
    }
    @keyframes googlePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    .google-attention {
      animation: googlePulse 2.5s infinite ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `;
  document.head.appendChild(style);
}

export class ConfiguracoesPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private settings: GlobalSettings | null = null;
  private consultores: PerfilConsultor[] = [];
  private activeTab: 'geral' | 'consultores' = 'geral';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa o painel de configurações: valida o nível de acesso admin, busca dados e renderiza.
   */
  public async init(): Promise<void> {
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

      // Escuta reativamente as atualizações do perfil proprio
      window.addEventListener('paxflow-profile-updated', (e: any) => {
        const { nome, avatar_url } = e.detail;
        if (this.perfil) {
          this.perfil.nome = nome;
          this.perfil.avatar_url = avatar_url;
          this.render();
          this.setupEventListeners();
        }
      });

      // 2. Bloqueio Rígido de Segurança: Apenas administrador acessa esta tela
      if (!this.perfil || this.perfil.role !== 'admin') {
        this.renderAcessoNegado();
        return;
      }

      // 3. Buscar configurações globais e consultores
      await this.loadSettings();
      await this.loadConsultores();

      // 4. Renderizar interface
      this.render();

      // 5. Configurar ouvintes de eventos
      this.setupEventListeners();

    } catch (err: any) {
      console.error('Erro na inicialização da tela de configurações:', err);
      this.renderAuthError(`Erro interno: ${err.message}`);
    }
  }

  /**
   * Busca as configurações administrativas na tabela global_settings
   */
  private async loadSettings(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.settings = {
          id: data.id,
          agencyName: data.agency_name || data.agencyName || 'PaxFlow CRM',
          taxaCancelamentoPadrao: data.taxa_cancelamento_padrao || data.taxaCancelamentoPadrao || 0,
          prazoReembolsoDias: data.prazo_reembolso_dias || data.prazoReembolsoDias || 3,
          notificacoesAtivas: data.notificacoes_ativas !== undefined ? data.notificacoes_ativas : true,
          emailSuporte: data.email_suporte || data.emailSuporte || 'suporte@paxflow.com.br',
          googleRefreshToken: data.google_refresh_token || data.googleRefreshToken,
          slaPreEmbarqueDias: data.sla_pre_embarque_dias !== undefined ? data.sla_pre_embarque_dias : 7,
          slaPosViagemDias: data.sla_pos_viagem_dias !== undefined ? data.sla_pos_viagem_dias : 3
        };
      } else {
        const initialPayload = {
          agency_name: 'PaxFlow CRM',
          taxa_cancelamento_padrao: 0,
          prazo_reembolso_dias: 3,
          notificacoes_ativas: true,
          email_suporte: 'suporte@paxflow.com.br',
          sla_pre_embarque_dias: 7,
          sla_pos_viagem_dias: 3
        };

        const { data: inserted, error: insertError } = await supabase
          .from('global_settings')
          .insert(initialPayload)
          .select()
          .single();

        if (insertError) throw insertError;

        this.settings = {
          id: inserted.id,
          agencyName: inserted.agency_name,
          taxaCancelamentoPadrao: inserted.taxa_cancelamento_padrao,
          prazoReembolsoDias: inserted.prazo_reembolso_dias,
          notificacoesAtivas: inserted.notificacoes_ativas,
          emailSuporte: inserted.email_suporte,
          slaPreEmbarqueDias: inserted.sla_pre_embarque_dias,
          slaPosViagemDias: inserted.sla_pos_viagem_dias
        };
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações administrativas:', err.message);
    }
  }

  /**
   * Busca a listagem de perfis cadastrados no sistema
   */
  private async loadConsultores(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      this.consultores = mesclarAvataresLocais(data || []) as PerfilConsultor[];
    } catch (err: any) {
      console.error('Erro ao carregar consultores:', err);
    }
  }

  /**
   * Altera a aba ativa e re-renderiza o componente
   */
  private switchTab(tab: 'geral' | 'consultores'): void {
    this.activeTab = tab;
    this.render();
    this.setupEventListeners();
  }

  /**
   * Associa os eventos gerais de salvamento e login com o Google
   */
  private setupEventListeners(): void {
    // Configura os botões das abas
    document.getElementById('tab-geral-btn')?.addEventListener('click', () => this.switchTab('geral'));
    document.getElementById('tab-consultores-btn')?.addEventListener('click', () => this.switchTab('consultores'));

    // Configura o logout e theme toggle
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      if (confirm('Deseja realmente sair?')) {
        const { logoutConsultor } = await import('../services/supabase');
        await logoutConsultor();
        window.location.reload();
      }
    });

    if (this.activeTab === 'geral') {
      const form = document.getElementById('form-configuracoes') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!this.settings) return;

        const agencyNameVal = (document.getElementById('input-agency-name') as HTMLInputElement).value;
        const emailSuporteVal = (document.getElementById('input-email-suporte') as HTMLInputElement).value;
        const slaPreVal = Number((document.getElementById('input-sla-pre') as HTMLInputElement).value);
        const slaPosVal = Number((document.getElementById('input-sla-pos') as HTMLInputElement).value);
        const taxaVal = Number((document.getElementById('input-taxa') as HTMLInputElement).value);

        const payload = {
          agency_name: agencyNameVal,
          email_suporte: emailSuporteVal,
          sla_pre_embarque_dias: slaPreVal,
          sla_pos_viagem_dias: slaPosVal,
          taxa_cancelamento_padrao: taxaVal
        };

        try {
          const { error } = await supabase
            .from('global_settings')
            .update(payload)
            .eq('id', this.settings.id);

          if (error) throw error;

          this.showToast('Configurações globais salvas!', 'success');
          await this.loadSettings();
          this.render();
          this.setupEventListeners();
        } catch (err: any) {
          console.error('Erro ao salvar configurações globais:', err);
          this.showToast('Falha ao gravar configurações.', 'error');
        }
      });

      document.getElementById('btn-google-auth')?.addEventListener('click', () => {
        this.abrirSimuladorGoogleOAuth2();
      });

      document.getElementById('btn-test-drive-connection')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-test-drive-connection') as HTMLButtonElement;
        if (!btn || !this.settings) return;
        
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block align-middle mr-1.5"></span> Testando...`;
        
        const googleToken = this.settings.googleRefreshToken || '';
        const isSandbox = !googleToken || googleToken.startsWith('mock_');
        
        try {
          if (isSandbox) {
            // Em modo Sandbox, simulamos sucesso instantâneo com delay visual de 1s
            await new Promise((resolve) => setTimeout(resolve, 1000));
            this.showToast('Conexão Sandbox ativa! A simulação de uploads está operacional (links locais).', 'success');
          } else {
            // Em modo Produção, invocamos a Edge Function
            if (!supabase.functions) {
              throw new Error('Supabase Functions não disponível neste ambiente.');
            }
            
            const { data, error } = await supabase.functions.invoke('upload-to-drive', {
              body: { test: true }
            });
            
            if (error) {
              if (error.status === 404 || (error.message && error.message.includes('Function not found'))) {
                throw new Error('A Edge Function "upload-to-drive" não está implantada no seu Supabase (Erro 404). Por favor, implante a função para habilitar uploads reais de produção.');
              }
              throw new Error(error.message || 'Erro retornado pela Edge Function.');
            }
            
            this.showToast('Integração com Google Drive ativa e respondendo! Teste concluído com sucesso.', 'success');
          }
        } catch (err: any) {
          console.error(err);
          alert(`❌ Falha no Teste de Integração:\n\n${err.message || err}`);
          this.showToast('Falha no teste da conexão Google Drive.', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });

      document.getElementById('btn-google-disconnect')?.addEventListener('click', async () => {
        if (confirm('Deseja realmente desconectar a integração com o Google Drive?')) {
          try {
            const { error } = await supabase
              .from('global_settings')
              .update({ google_refresh_token: null })
              .eq('id', this.settings!.id);
            
            if (error) throw error;
            
            this.showToast('Integração com Google Drive desconectada!', 'success');
            await this.loadSettings();
            this.render();
            this.setupEventListeners();
          } catch (err: any) {
            console.error(err);
            this.showToast('Erro ao desconectar conta.', 'error');
          }
        }
      });
    }

    if (this.activeTab === 'consultores') {
      // Cadastro de consultor
      document.getElementById('btn-novo-consultor')?.addEventListener('click', () => {
        this.abrirModalNovoConsultor();
      });

      // Clique no botão Editar Consultor
      const editButtons = document.querySelectorAll('.btn-editar-user');
      editButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const consultor = this.consultores.find(c => c.id === id);
          if (consultor) {
            this.abrirModalEditarConsultor(consultor);
          }
        });
      });

      // Alteração de Role (Dropdown)
      const roleSelects = document.querySelectorAll('.select-role-user');
      roleSelects.forEach(select => {
        select.addEventListener('change', async (e) => {
          const el = e.target as HTMLSelectElement;
          const id = el.getAttribute('data-id');
          const roleVal = el.value as 'admin' | 'consultor';
          if (id) {
            await this.atualizarRoleConsultor(id, roleVal);
          }
        });
      });

      // Ativar/Desativar
      const toggleButtons = document.querySelectorAll('.btn-toggle-status-user');
      toggleButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const el = e.currentTarget as HTMLButtonElement;
          const id = el.getAttribute('data-id');
          const currentActive = el.getAttribute('data-active') === 'true';
          if (id) {
            await this.atualizarStatusConsultor(id, !currentActive);
          }
        });
      });
    }
  }

  /**
   * Atualiza a função (role) de um consultor no banco
   */
  private async atualizarRoleConsultor(id: string, role: 'admin' | 'consultor'): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id);

      if (error) throw error;
      this.showToast('Nível de acesso atualizado com sucesso!', 'success');
      await this.loadConsultores();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro ao atualizar role:', err);
      this.showToast('Erro ao atualizar permissão.', 'error');
    }
  }

  /**
   * Ativa ou desativa um consultor no banco
   */
  private async atualizarStatusConsultor(id: string, ativo: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
      this.showToast(`Consultor ${ativo ? 'ativado' : 'desativado'} com sucesso!`, 'success');
      await this.loadConsultores();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      this.showToast('Erro ao atualizar status.', 'error');
    }
  }

  /**
   * Exibe o modal premium de cadastro de novo consultor sem desconectar o administrador ativo.
   */
  private abrirModalNovoConsultor(): void {
    const overlay = document.createElement('div');
    overlay.id = 'novo-consultor-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[450px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar" id="novo-consultor-card">
        
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
          <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl flex items-center justify-center text-xl border border-indigo-100 dark:border-indigo-900/40 mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">Cadastrar Novo Consultor</h2>
          <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">Defina o e-mail, nível de acesso e senha provisória</p>
        </div>

        <form id="form-novo-consultor" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome Completo *</label>
            <input id="input-nc-nome" type="text" required autocomplete="name" placeholder="Nome do Consultor" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail de Acesso *</label>
            <input id="input-nc-email" type="email" required autocomplete="username" placeholder="email@agencia.com" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nível de Acesso *</label>
              <select id="select-nc-role" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="consultor" selected>Consultor</option>
                <option value="admin">ADMIN</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Senha Provisória *</label>
              <input id="input-nc-senha" type="password" required autocomplete="new-password" minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-nc-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition uppercase">
              Cancelar
            </button>
            <button id="btn-nc-submit" type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20 uppercase tracking-wider flex items-center justify-center">
              Cadastrar Agente
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('novo-consultor-card')?.classList.remove('scale-95');
      document.getElementById('novo-consultor-card')?.classList.add('scale-100');
    }, 10);

    document.getElementById('btn-nc-cancel')?.addEventListener('click', () => this.fecharModalNovoConsultor());

    // Submit handler para o cadastro
    const form = document.getElementById('form-novo-consultor') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('btn-nc-submit') as HTMLButtonElement;
      const nome = (document.getElementById('input-nc-nome') as HTMLInputElement).value;
      const email = (document.getElementById('input-nc-email') as HTMLInputElement).value;
      const role = (document.getElementById('select-nc-role') as HTMLSelectElement).value as 'admin' | 'consultor';
      const senha = (document.getElementById('input-nc-senha') as HTMLInputElement).value;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Cadastrando...';

      try {
        // Inicializa o cliente Supabase alternativo com persistSession: false
        const secondaryClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        // 1. Cadastra o novo usuário na autenticação (cria a credencial)
        const { data: authData, error: authError } = await secondaryClient.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome,
            }
          }
        });

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error('Erro ao criar registro de autenticação do usuário.');
        }

        // Salva a senha localmente para viabilizar login direto em sandbox
        salvarSenhaLocal(email, senha);

        // 2. Insere ou atualiza os dados correspondentes na tabela profiles (evita conflito se houver trigger automática no Supabase)
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          nome,
          email,
          role,
          ativo: true
        });

        if (profileError) throw profileError;

        this.showToast('Novo consultor cadastrado com sucesso!', 'success');
        this.fecharModalNovoConsultor();
        await this.loadConsultores();
        this.render();
        this.setupEventListeners();

      } catch (err: any) {
        console.error('Erro ao cadastrar consultor:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Cadastrar Agente';
        alert(`⚠️ Falha no Cadastro:\n\n${err.message || 'Erro inesperado na gravação dos dados.'}`);
      }
    });
  }

  /**
   * Fecha o modal de novo consultor com animação
   */
  private fecharModalNovoConsultor(): void {
    const overlay = document.getElementById('novo-consultor-overlay');
    const card = document.getElementById('novo-consultor-card');
    if (overlay && card) {
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  /**
   * Abre o modal premium de edição de consultor ("Editar Consultor") permitindo alteração direta de senha.
   */
  private abrirModalEditarConsultor(c: PerfilConsultor): void {
    const overlay = document.createElement('div');
    overlay.id = 'editar-consultor-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    let selectedAvatarId = c.avatar_url || '';
    const isSelf = c.id === this.user.id;

    // Grade de seleção de avatares com efeito ativo e hover de zoom
    const renderAvatarsHtml = () => {
      return AVATAR_OPTIONS.map(opt => {
        const isSelected = selectedAvatarId === opt.id;
        return `
          <button type="button" data-avatar-id="${opt.id}" class="btn-edit-select-avatar w-12 h-12 p-0.5 rounded-xl border-2 transition duration-200 transform hover:scale-110 relative flex items-center justify-center ${
            isSelected 
              ? 'border-indigo-650 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20' 
              : 'border-transparent hover:border-slate-350 dark:hover:border-slate-750'
          }" title="${opt.nome}">
            ${opt.svg}
            ${isSelected ? `<div class="absolute -top-1 -right-1 bg-indigo-600 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm">✓</div>` : ''}
          </button>
        `;
      }).join('');
    };

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[440px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col relative max-h-[90vh] overflow-y-auto custom-scrollbar" id="editar-consultor-card">
        
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
          <div id="modal-edit-avatar-preview" class="mb-3">
            ${getAvatarSvg(selectedAvatarId, c.nome || 'Consultor', 'w-16 h-16')}
          </div>
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">Editar Perfil do Consultor</h2>
          <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">Atualize informações de cadastro e altere senhas diretamente</p>
        </div>

        <form id="form-editar-consultor" class="p-6 space-y-4">
          <!-- Grade de avatares -->
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Selecione uma Carinha de Animal *</label>
            <div class="grid grid-cols-6 gap-2.5 justify-items-center" id="modal-edit-avatar-selection-grid">
              ${renderAvatarsHtml()}
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome Completo *</label>
            <input id="input-ec-nome" type="text" required autocomplete="name" value="${c.nome || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail de Acesso</label>
            <input id="input-ec-email" type="email" disabled autocomplete="username" value="${c.email || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850/50 rounded-lg text-slate-400 dark:text-slate-500 font-bold text-sm cursor-not-allowed select-none" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nível de Acesso *</label>
              <select id="select-ec-role" ${isSelf ? 'disabled' : ''} class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="consultor" ${c.role === 'consultor' ? 'selected' : ''}>Consultor</option>
                <option value="admin" ${c.role === 'admin' ? 'selected' : ''}>ADMIN</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Status da Conta *</label>
              <select id="select-ec-ativo" ${isSelf ? 'disabled' : ''} class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="true" ${c.ativo ? 'selected' : ''}>Ativo</option>
                <option value="false" ${!c.ativo ? 'selected' : ''}>Inativo</option>
              </select>
            </div>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h3 class="text-xs font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mb-1.5">Alterar Senha do Consultor</h3>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 mb-2 font-semibold italic">Nota de desenvolvimento: você pode alterar diretamente a senha do usuário preenchendo o campo abaixo.</p>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Definir Nova Senha (Mínimo 6 dígitos)</label>
              <input id="input-ec-senha" type="password" minlength="6" autocomplete="new-password" placeholder="Insira a nova senha diretamente" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-ec-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold text-xs rounded-xl transition uppercase">
              Cancelar
            </button>
            <button id="btn-ec-submit" type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20 uppercase tracking-wider flex items-center justify-center">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animação fade-in
    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('editar-consultor-card')?.classList.remove('scale-95');
      document.getElementById('editar-consultor-card')?.classList.add('scale-100');
    }, 10);

    const fecharECModal = () => {
      const card = document.getElementById('editar-consultor-card');
      if (card) {
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
      }
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('btn-ec-cancel')?.addEventListener('click', fecharECModal);

    // Eventos da grade de seleção de avatares no modal
    const setupEditAvatarGridEvents = () => {
      const grid = overlay.querySelector('#modal-edit-avatar-selection-grid') as HTMLElement;
      const preview = overlay.querySelector('#modal-edit-avatar-preview') as HTMLElement;
      const nomeInput = overlay.querySelector('#input-ec-nome') as HTMLInputElement;

      grid.querySelectorAll('.btn-edit-select-avatar').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedAvatarId = btn.getAttribute('data-avatar-id') || '';
          
          // Re-renderiza grade para mover a borda ativa
          grid.innerHTML = renderAvatarsHtml();
          // Atualiza o preview
          preview.innerHTML = getAvatarSvg(selectedAvatarId, nomeInput?.value || 'Consultor', 'w-16 h-16');
          
          setupEditAvatarGridEvents();
        });
      });
    };

    setupEditAvatarGridEvents();

    const ecNomeInput = overlay.querySelector('#input-ec-nome') as HTMLInputElement;
    ecNomeInput?.addEventListener('input', () => {
      const preview = overlay.querySelector('#modal-edit-avatar-preview') as HTMLElement;
      preview.innerHTML = getAvatarSvg(selectedAvatarId, ecNomeInput.value || 'Consultor', 'w-16 h-16');
    });

    // Enviar formulário de edição
    const form = overlay.querySelector('#form-editar-consultor') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-ec-submit') as HTMLButtonElement;
      const nomeVal = ecNomeInput.value.trim();
      const roleVal = (overlay.querySelector('#select-ec-role') as HTMLSelectElement).value as 'admin' | 'consultor';
      const ativoVal = (overlay.querySelector('#select-ec-ativo') as HTMLSelectElement).value === 'true';
      const senhaVal = (overlay.querySelector('#input-ec-senha') as HTMLInputElement).value;

      if (!nomeVal) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';

      try {
        const isOffline = supabase.from === undefined || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !import.meta.env.VITE_SUPABASE_URL);

        // Sempre persiste localmente
        salvarAvatarLocal(c.id, selectedAvatarId);

        if (!isOffline) {
          // 1. Atualiza na tabela Profiles do Supabase (avatar_url é gerenciado localmente)
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({
              nome: nomeVal,
              role: roleVal,
              ativo: ativoVal
            })
            .eq('id', c.id);

          if (profileErr) throw profileErr;

          // 2. Se for a si mesmo, atualiza também a sessão ativa no auth
          if (isSelf) {
            const { error: authMetaErr } = await supabase.auth.updateUser({
              data: { nome: nomeVal, avatar_url: selectedAvatarId }
            });
            if (authMetaErr) console.warn('Erro ao sincronizar metadados do ADMIN logado:', authMetaErr);

            // Atualiza senha própria
            if (senhaVal) {
              const { error: passwordErr } = await atualizarSenhaAtual(senhaVal);
              if (passwordErr) throw passwordErr;
            }
          } else {
            // Se for outro usuário, e digitou a senha, salvamos localmente na sandbox para permitir login direto e instantâneo
            if (senhaVal) {
              salvarSenhaLocal(c.email, senhaVal);
              console.log(`[Dev] Senha de ${c.email} atualizada com sucesso localmente na sandbox.`);
            }
          }
        }

        // Atualiza a lista local de consultores na tela
        const idx = this.consultores.findIndex(u => u.id === c.id);
        if (idx > -1) {
          this.consultores[idx].nome = nomeVal;
          this.consultores[idx].avatar_url = selectedAvatarId;
          this.consultores[idx].role = roleVal;
          this.consultores[idx].ativo = ativoVal;
        }

        // Se for a si mesmo, dispara o evento de sincronização geral do app
        if (isSelf) {
          window.dispatchEvent(new CustomEvent('paxflow-profile-updated', {
            detail: { nome: nomeVal, avatar_url: selectedAvatarId }
          }));
        }

        this.showToast('Cadastro do consultor atualizado com sucesso!', 'success');
        fecharECModal();
        this.render();
        this.setupEventListeners();

      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Alterações';
        alert(`❌ Erro ao atualizar consultor:\n\n${err.message || err}`);
      }
    });
  }

  /**
   * Abre o simulador visual Google OAuth2
   */
  private abrirSimuladorGoogleOAuth2(): void {
    const overlay = document.createElement('div');
    overlay.id = 'oauth-simulator-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[460px] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col" id="oauth-card">
        
        <div class="p-6 text-center border-b border-slate-100 dark:border-slate-800 flex flex-col items-center bg-white dark:bg-slate-900 shrink-0">
          <div class="flex items-center gap-1.5 mb-2.5">
            <span class="text-xl font-bold tracking-tight select-none">
              <span class="text-blue-600 font-extrabold">G</span><span class="text-red-500 font-extrabold">o</span><span class="text-yellow-500 font-extrabold">o</span><span class="text-blue-600 font-extrabold">g</span><span class="text-green-500 font-extrabold">l</span><span class="text-red-500 font-extrabold">e</span>
            </span>
          </div>
          <h2 class="text-base font-black text-slate-800 dark:text-slate-100 leading-snug">Vincular Conta Google Drive</h2>
          <p class="text-[10px] text-slate-400 dark:text-slate-505 font-semibold mt-1">Autorize o armazenamento seguro de passaportes no <span class="text-indigo-600 dark:text-indigo-400 font-black">PaxFlow</span></p>
        </div>

        <div class="border-b border-slate-100 dark:border-slate-800 flex text-xs font-black bg-slate-50 dark:bg-slate-950/40 shrink-0">
          <button id="btn-popup-tab-sandbox" class="flex-1 py-3 text-center border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 transition-all">
            🧪 Sandbox (Simulação)
          </button>
          <button id="btn-popup-tab-production" class="flex-1 py-3 text-center border-b-2 border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition-all">
            💼 Produção (Real)
          </button>
        </div>

        <div class="p-5 flex-1 space-y-4 bg-white dark:bg-slate-900 overflow-y-auto max-h-[60vh]" id="oauth-step-container">
          <!-- CONTEÚDO DA TAB: SANDBOX (SIMULADO) -->
          <div id="oauth-step-sandbox" class="space-y-4">
            <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Escolha uma conta para simular:</p>
            
            <button id="btn-oauth-acc-corp" class="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center justify-between text-left transition group">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-full flex items-center justify-center text-sm">
                  PF
                </div>
                <div>
                  <span class="block text-sm font-extrabold text-slate-700 dark:text-slate-300">PaxFlow Agência de Viagens</span>
                  <span class="block text-xs text-slate-400 dark:text-slate-500 font-medium group-hover:text-slate-500">paxflow.agencia@gmail.com (Corporativa)</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30 font-black rounded uppercase">Recomendada</span>
            </button>

            <button id="btn-oauth-acc-pessoal" class="w-full p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center justify-between text-left transition group">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-full flex items-center justify-center text-sm">
                  TC
                </div>
                <div>
                  <span class="block text-sm font-bold text-slate-700 dark:text-slate-350">Thiago Costa (Pessoal)</span>
                  <span class="block text-xs text-slate-400 dark:text-slate-500 font-medium">thiago.personal@gmail.com</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold rounded uppercase">Pessoal</span>
            </button>
            
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button id="btn-oauth-cancel" class="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-300 transition py-2 px-3 uppercase">
                Cancelar
              </button>
            </div>
          </div>

          <!-- CONTEÚDO DA TAB: PRODUÇÃO (REAL) -->
          <div id="oauth-step-production" class="space-y-4 hidden">
            <div class="bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100/40 dark:border-indigo-900/40 text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-semibold space-y-2">
              <p class="font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">💼 Configuração de Produção Resiliente:</p>
              <p>Insira os parâmetros obtidos no Google Cloud para permitir que a integração funcione em qualquer ambiente, inclusive no **paxflow.pages.dev**!</p>
            </div>
            
            <div class="space-y-2">
              <div>
                <label class="block text-[10px] font-black text-slate-450 dark:text-slate-405 uppercase tracking-wide mb-1">Google Client ID *</label>
                <input id="input-oauth-real-client-id" type="text" placeholder="Cole o seu Client ID do Google Cloud aqui..." value="${process.env.GOOGLE_CLIENT_ID || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100" />
              </div>
              
              <div>
                <label class="block text-[10px] font-black text-slate-450 dark:text-slate-405 uppercase tracking-wide mb-1">Google Client Secret *</label>
                <input id="input-oauth-real-client-secret" type="password" placeholder="Cole o seu Client Secret aqui..." value="${process.env.GOOGLE_CLIENT_SECRET || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100" />
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-450 dark:text-slate-405 uppercase tracking-wide mb-1">Google Refresh Token Real *</label>
                <input id="input-oauth-real-token" type="text" placeholder="Cole o Refresh Token gerado aqui..." class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100" />
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <button id="btn-oauth-real-cancel" class="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-550 dark:text-slate-400 font-bold text-xs rounded-xl transition uppercase">
                Cancelar
              </button>
              <button id="btn-oauth-real-save" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 uppercase tracking-wide">
                Salvar e Conectar Real
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('oauth-card')?.classList.remove('scale-95');
      document.getElementById('oauth-card')?.classList.add('scale-100');
    }, 10);

    // Eventos de troca de abas no modal
    const btnTabSandbox = document.getElementById('btn-popup-tab-sandbox');
    const btnTabProduction = document.getElementById('btn-popup-tab-production');
    const stepSandbox = document.getElementById('oauth-step-sandbox');
    const stepProduction = document.getElementById('oauth-step-production');

    btnTabSandbox?.addEventListener('click', () => {
      btnTabSandbox.className = 'flex-1 py-3 text-center border-b-2 border-indigo-650 text-indigo-650 dark:text-indigo-455 bg-white dark:bg-slate-900 transition-all font-black';
      btnTabProduction!.className = 'flex-1 py-3 text-center border-b-2 border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition-all';
      stepSandbox!.classList.remove('hidden');
      stepProduction!.classList.add('hidden');
    });

    btnTabProduction?.addEventListener('click', () => {
      btnTabProduction.className = 'flex-1 py-3 text-center border-b-2 border-indigo-650 text-indigo-650 dark:text-indigo-455 bg-white dark:bg-slate-900 transition-all font-black';
      btnTabSandbox!.className = 'flex-1 py-3 text-center border-b-2 border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition-all';
      stepProduction!.classList.remove('hidden');
      stepSandbox!.classList.add('hidden');
    });

    // Eventos gerais do modal
    document.getElementById('btn-oauth-cancel')?.addEventListener('click', () => this.fecharSimuladorGoogleOAuth2());
    document.getElementById('btn-oauth-real-cancel')?.addEventListener('click', () => this.fecharSimuladorGoogleOAuth2());

    document.getElementById('btn-oauth-acc-pessoal')?.addEventListener('click', () => {
      alert(
        '⚠️ Acesso Negado!\n\nPor favor, selecione apenas a conta corporativa da agência ' +
        '(paxflow.agencia@gmail.com) para garantir que os arquivos sejam ' +
        'centralizados no Drive oficial da empresa.'
      );
    });

    document.getElementById('btn-oauth-acc-corp')?.addEventListener('click', () => {
      this.mostrarOAuthConsentimento();
    });

    document.getElementById('btn-oauth-real-save')?.addEventListener('click', () => {
      const clientIdInput = document.getElementById('input-oauth-real-client-id') as HTMLInputElement;
      const clientSecretInput = document.getElementById('input-oauth-real-client-secret') as HTMLInputElement;
      const tokenInput = document.getElementById('input-oauth-real-token') as HTMLInputElement;
      
      if (clientIdInput && clientSecretInput && tokenInput) {
        const cid = clientIdInput.value.trim();
        const sec = clientSecretInput.value.trim();
        const tok = tokenInput.value.trim();
        
        if (!cid || !sec || !tok) {
          alert('Por favor, preencha todos os três campos obrigatórios da integração real.');
          return;
        }
        
        const combinedToken = `${cid}|||${sec}|||${tok}`;
        this.concluirOAuth2Real(combinedToken);
      }
    });
  }

  private mostrarOAuthConsentimento(): void {
    const container = document.getElementById('oauth-step-container');
    if (!container) return;

    container.innerHTML = `
      <div id="oauth-step-2" class="space-y-5 animate-fade-in">
        <div class="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100/40 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-400 font-semibold space-y-1">
          <p>O PaxFlow deseja acessar a sua Conta do Google</p>
          <p class="text-indigo-500 font-bold text-[10px]">paxflow.agencia@gmail.com</p>
        </div>

        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
          Para realizar o armazenamento seguro de passaportes e vistos, o PaxFlow necessita das seguintes permissões:
        </p>

        <div class="space-y-3.5 border-t border-b border-slate-100 dark:border-slate-800 py-4.5">
          <div class="flex items-start gap-3">
            <span class="text-base">📁</span>
            <div>
              <span class="block text-xs font-black text-slate-800 dark:text-slate-200">Ver, criar, editar e excluir arquivos do Google Drive</span>
              <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-medium">Permite salvar e organizar passaportes dos passageiros em pastas automáticas.</span>
            </div>
          </div>
          
          <div class="flex items-start gap-3">
            <span class="text-base">⚙️</span>
            <div>
              <span class="block text-xs font-black text-slate-800 dark:text-slate-200">Manter acesso contínuo aos dados (Offline Access)</span>
              <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-medium">Garante que os consultores consigam fazer uploads mesmo sem você estar logado.</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button id="btn-oauth-deny" class="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl transition uppercase">
            Negar
          </button>
          <button id="btn-oauth-allow" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-blue-500/20 uppercase tracking-wide">
            Permitir e Conectar
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-oauth-deny')?.addEventListener('click', () => {
      this.fecharSimuladorGoogleOAuth2();
    });

    document.getElementById('btn-oauth-allow')?.addEventListener('click', async () => {
      this.concluirOAuth2Fluxo();
    });
  }

  private async concluirOAuth2Fluxo(): Promise<void> {
    if (!this.settings) return;

    const stepContainer = document.getElementById('oauth-step-container');
    if (stepContainer) {
      stepContainer.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center space-y-4">
          <div class="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-500 font-bold animate-pulse">Estabelecendo conexão segura de credenciais...</p>
        </div>
      `;
    }

    try {
      const mockRefreshToken = `mock_oauth2_refresh_token_paxflow_agency_active_${Math.random().toString(36).substring(2, 10)}`;

      const { error } = await supabase
        .from('global_settings')
        .update({ google_refresh_token: mockRefreshToken })
        .eq('id', this.settings.id);

      if (error) throw error;

      this.showToast('Conta Google Drive corporativa vinculada!', 'success');
      this.fecharSimuladorGoogleOAuth2();
      await this.loadSettings();
      this.render();
      this.setupEventListeners();

    } catch (err: any) {
      console.error('Erro ao salvar google_refresh_token:', err);
      this.showToast('Erro interno na vinculação.', 'error');
      this.fecharSimuladorGoogleOAuth2();
    }
  }

  private async concluirOAuth2Real(token: string): Promise<void> {
    if (!this.settings) return;
    if (!token || token.trim() === '') {
      alert('Por favor, insira um token de atualização válido.');
      return;
    }

    const stepContainer = document.getElementById('oauth-step-container');
    if (stepContainer) {
      stepContainer.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center space-y-4">
          <div class="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-500 font-bold animate-pulse">Validando e salvando credencial de produção...</p>
        </div>
      `;
    }

    try {
      const { error } = await supabase
        .from('global_settings')
        .update({ google_refresh_token: token.trim() })
        .eq('id', this.settings.id);

      if (error) throw error;

      this.showToast('Token Google Drive de produção vinculado!', 'success');
      this.fecharSimuladorGoogleOAuth2();
      await this.loadSettings();
      this.render();
      this.setupEventListeners();

    } catch (err: any) {
      console.error('Erro ao salvar google_refresh_token real:', err);
      this.showToast('Erro ao salvar token de produção.', 'error');
      this.fecharSimuladorGoogleOAuth2();
    }
  }

  private fecharSimuladorGoogleOAuth2(): void {
    const overlay = document.getElementById('oauth-simulator-overlay');
    const card = document.getElementById('oauth-card');
    if (overlay && card) {
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  /**
   * Exibe tela de carregamento
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-8 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-semibold animate-pulse">Carregando painel de configurações...</p>
      </div>
    `;
  }

  /**
   * Exibe tela de erro de autenticação
   */
  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-white border border-slate-100 p-8 rounded-2xl shadow-xl text-center">
          <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
          <h2 class="text-xl font-bold text-slate-800 mb-2">Erro de Carregamento</h2>
          <p class="text-slate-500 text-sm mb-6">${msg}</p>
        </div>
      </div>
    `;
  }

  /**
   * Exibe tela de Acesso Negado
   */
  private renderAcessoNegado(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-white border border-slate-200/80 p-8 rounded-3xl shadow-2xl text-center">
          <div class="w-18 h-18 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner">
            🔒
          </div>
          <h2 class="text-xl font-black text-slate-800 mb-2">Acesso Restrito</h2>
          <p class="text-slate-400 text-xs font-semibold max-w-xs mx-auto mb-6 leading-relaxed">
            Esta área é destinada exclusivamente a administradores do PaxFlow. Suas credenciais não possuem o nível de acesso necessário.
          </p>
          <button id="btn-login-voltar" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 transition uppercase">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('btn-login-voltar')?.addEventListener('click', () => {
      window.location.reload();
    });
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
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      }
    }, 3500);
  }

  /**
   * Renderiza a página administrativa
   */
  private render(): void {
    if (!this.settings) return;

    const googleToken = this.settings.googleRefreshToken || '';
    const drivesConectado = !!googleToken;
    const isSandboxMode = drivesConectado && (googleToken.startsWith('mock_') || googleToken === '');

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="PaxFlow Logo" class="h-10 w-auto object-contain animate-fade-in" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Configurações Administrativas</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <span>Configurações Globais</span> &bull; 
                <span class="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[10px]">Administrador</span>
              </p>
            </div>
          </div>
          
          <div class="flex flex-wrap items-center gap-4">
            <!-- Identidade do Consultor Logado -->
            <div class="flex items-center gap-3 pl-2 border-l border-slate-200/60 dark:border-slate-800/60">
              <div class="text-right hidden sm:block">
                <span class="block text-sm font-extrabold text-slate-700 dark:text-slate-300">${this.perfil?.nome || 'Administrador'}</span>
                <span class="block text-[10px] text-slate-400 dark:text-slate-505 font-bold uppercase tracking-wider">${this.perfil?.email || this.user.email}</span>
              </div>
              ${getAvatarSvg(this.perfil?.avatar_url, this.perfil?.nome || 'C', 'w-10 h-10')}
              <!-- Theme Toggle -->
              <button id="theme-toggle-btn" title="Alternar Tema" class="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-550 rounded-xl transition border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-center">
                <svg width="20" height="20" class="w-5 h-5 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <svg width="20" height="20" class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
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

        <!-- Abas de Navegação -->
        <div class="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
          <div class="max-w-4xl mx-auto w-full flex gap-6">
            <button id="tab-geral-btn" class="py-4 px-1 border-b-2 text-sm font-extrabold transition select-none flex items-center gap-2 ${
              this.activeTab === 'geral' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Parâmetros Globais
            </button>
            <button id="tab-consultores-btn" class="py-4 px-1 border-b-2 text-sm font-extrabold transition select-none flex items-center gap-2 ${
              this.activeTab === 'consultores' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gestão de Consultores
            </button>
          </div>
        </div>

        <!-- Renderização da Aba: Parâmetros Gerais -->
        ${this.activeTab === 'geral' ? `
          <main class="flex-1 p-6 max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-start animate-fade-in">
            
            <!-- Coluna Esquerda: SLAs e Regras -->
            <div class="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 class="text-base font-black text-slate-800 dark:text-slate-200 tracking-tight border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-5 flex items-center gap-2.5">
                <svg class="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Regras do Negócio & Parâmetros de SLAs
              </h2>

              <form id="form-configuracoes" class="space-y-6">
                
                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome da Agência de Viagens *</label>
                  <input id="input-agency-name" type="text" required value="${this.settings.agencyName}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail de Suporte e Alertas *</label>
                  <input id="input-email-suporte" type="email" required value="${this.settings.emailSuporte}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold" />
                </div>

                <div class="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                  <h3 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Parâmetros das Colunas do Kanban</h3>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Dias Alerta Pré-Embarque *</label>
                      <input id="input-sla-pre" type="number" min="1" required value="${this.settings.slaPreEmbarqueDias}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                      <p class="text-[10px] text-slate-450 dark:text-slate-500 mt-1.5 font-medium leading-relaxed">Dispara alerta visual vermelho no card se o embarque estiver a menos dias do que este limite.</p>
                    </div>

                    <div>
                      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Dias Alerta Pós-Viagem *</label>
                      <input id="input-sla-pos" type="number" min="1" required value="${this.settings.slaPosViagemDias}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                      <p class="text-[10px] text-slate-450 dark:text-slate-500 mt-1.5 font-medium leading-relaxed">Dispara alerta visual laranja se a viagem já terminou e o pós-venda não foi fechado dentro deste limite.</p>
                    </div>
                  </div>
                </div>

                <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
                  <div>
                    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Taxa de Cancelamento Retida (%)</label>
                    <input id="input-taxa" type="number" step="0.01" min="0" max="100" value="${this.settings.taxaCancelamentoPadrao}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                    <p class="text-[10px] text-slate-450 dark:text-slate-500 mt-1.5 font-medium">Taxa retida padrão sugerida durante a solicitação de reembolsos.</p>
                  </div>
                </div>

                <div class="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                  <button type="submit" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">
                    Salvar Parâmetros
                  </button>
                </div>
              </form>
            </div>

            <!-- Coluna Direita: Google Drive -->
            <div class="md:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <h2 class="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <svg class="w-5 h-5 text-emerald-500 dark:text-emerald-450" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                Integração Google Drive
              </h2>

              <p class="text-xs text-slate-450 dark:text-slate-500 font-medium leading-relaxed">
                O PaxFlow realiza o upload de passaportes e vistos de forma centralizada em uma conta corporativa única no Google Drive.
              </p>

              <div class="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 bg-slate-50/50 dark:bg-slate-950/40 transition-colors">
                ${!drivesConectado ? `
                  <span class="text-3xl animate-fade-in">⚠️</span>
                  <span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-450 border border-amber-100 dark:border-amber-900/40 font-black text-[9px] rounded uppercase tracking-wider">Sem Integração</span>
                  <p class="text-[10px] text-slate-400 dark:text-slate-550 font-semibold mt-1">É necessário realizar a vinculação corporativa para ativar uploads.</p>
                ` : isSandboxMode ? `
                  <span class="text-3xl animate-fade-in">🧪</span>
                  <span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/45 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 font-black text-[9px] rounded uppercase tracking-wider">Modo Simulação (Sandbox)</span>
                  <p class="text-[10px] text-slate-500 dark:text-slate-450 font-bold mt-1">Simulação local de uploads ativa</p>
                  <p class="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed mt-0.5">Os uploads gerarão links locais de demonstração sem enviar para o Google Drive real.</p>
                ` : `
                  <span class="text-3xl animate-fade-in">✅</span>
                  <span class="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40 font-black text-[9px] rounded uppercase tracking-wider">Conectado (Produção)</span>
                  <p class="text-[10px] text-slate-550 dark:text-slate-400 font-bold mt-1">Conexão real ativa</p>
                  <p class="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed mt-0.5">Pronto para uploads em produção no Drive oficial.</p>
                `}
              </div>

              <div class="space-y-2.5">
                <button id="btn-google-auth" class="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition shadow-sm font-extrabold text-xs tracking-wider uppercase ${
                  drivesConectado 
                    ? 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850' 
                    : 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100/50 google-attention'
                }">
                  <span class="text-base select-none">
                    <span class="text-blue-600 font-extrabold">G</span><span class="text-red-500 font-extrabold">o</span><span class="text-yellow-500 font-extrabold">o</span><span class="text-blue-600 font-extrabold">g</span><span class="text-green-500 font-extrabold">l</span><span class="text-red-500 font-extrabold">e</span>
                  </span>
                  ${drivesConectado ? 'Reconfigurar Integração' : 'Conectar Conta Corporativa'}
                </button>

                ${drivesConectado ? `
                  <button id="btn-test-drive-connection" class="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-250 font-extrabold text-xs tracking-wider rounded-xl transition uppercase flex items-center justify-center gap-2">
                    🧪 Testar Conexão
                  </button>

                  <button id="btn-google-disconnect" class="w-full py-2.5 px-4 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-455 font-extrabold text-xs tracking-wider rounded-xl transition uppercase flex items-center justify-center gap-2">
                    🚫 Desconectar Conta
                  </button>
                ` : ''}
              </div>

              <!-- Informativo sobre Credenciais do Google Cloud -->
              <div class="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150/60 dark:border-slate-800/80 rounded-xl p-4.5 space-y-3">
                <span class="text-xs font-black text-slate-700 dark:text-slate-350 block uppercase tracking-wide border-b border-slate-200/50 dark:border-slate-800/60 pb-1.5">⚙️ Configurações Globais (.env)</span>
                <p class="text-[10px] text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">
                  A API do Google utiliza segurança criptográfica OAuth2. O e-mail pessoal e a senha da agência não funcionam se forem colocados nas chaves <code class="font-mono text-indigo-500 bg-indigo-50/40 dark:bg-indigo-950 px-1 py-0.5 rounded">GOOGLE_CLIENT_ID</code> e <code class="font-mono text-indigo-500 bg-indigo-50/40 dark:bg-indigo-950 px-1 py-0.5 rounded">GOOGLE_CLIENT_SECRET</code> do seu arquivo de ambiente.
                </p>
                <a href="https://console.cloud.google.com" target="_blank" class="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold block">Acessar Google Cloud Console &rarr;</a>
              </div>
              
              <p class="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-normal text-center">
                Apenas contas autorizadas podem armazenar arquivos. Os consultores não têm acesso direto às credenciais da conta.
              </p>
            </div>
          </main>
        ` : `
          <!-- Renderização da Aba: Gestão de Consultores -->
          <main class="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
            
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight">Consultores da Agência</h2>
                <p class="text-xs text-slate-400 dark:text-slate-500 font-medium">Controle de acessos, status e níveis de permissão</p>
              </div>
              <button id="btn-novo-consultor" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Novo Consultor
              </button>
            </div>

            <!-- Tabela de Consultores -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 dark:bg-slate-850 text-[10px] text-slate-450 dark:text-slate-505 font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th class="py-4 px-5">Consultor</th>
                      <th class="py-4 px-5">E-mail</th>
                      <th class="py-4 px-5 text-center">Nível de Acesso</th>
                      <th class="py-4 px-5 text-center">Status</th>
                      <th class="py-4 px-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300 font-semibold bg-white/50 dark:bg-slate-900/30">
                    ${this.consultores.map(c => {
                      const isSelf = c.id === this.user.id;
                      const statusBadge = c.ativo 
                        ? `<span class="inline-flex px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40 text-[10px] font-bold rounded">Ativo</span>` 
                        : `<span class="inline-flex px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-250 dark:border-slate-750 text-[10px] font-bold rounded">Inativo</span>`;
                      const roleBadge = c.role === 'admin'
                        ? `<span class="inline-flex px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/45 text-purple-700 dark:text-purple-450 border border-purple-100 dark:border-purple-900/40 text-[10px] font-bold rounded">ADMIN</span>`
                        : `<span class="inline-flex px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 text-[10px] font-bold rounded">Consultor</span>`;
                      
                      return `
                        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          <!-- Consultor -->
                          <td class="py-4 px-5 flex items-center gap-3">
                            ${getAvatarSvg(c.avatar_url, c.nome || 'C', 'w-8 h-8')}
                            <div>
                              <span class="block text-slate-800 dark:text-slate-200 font-bold">${c.nome}</span>
                              ${isSelf ? '<span class="inline-block text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-450 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">Você</span>' : ''}
                            </div>
                          </td>
                          
                          <!-- E-mail -->
                          <td class="py-4 px-5 text-slate-500 dark:text-slate-450 font-medium">
                            ${c.email}
                          </td>
                          
                          <!-- Nível de Acesso -->
                          <td class="py-4 px-5 text-center">
                            ${roleBadge}
                          </td>
                          
                          <!-- Status -->
                          <td class="py-4 px-5 text-center">
                            ${statusBadge}
                          </td>
                          
                          <!-- Ações -->
                          <td class="py-4 px-5 text-right space-x-1.5">
                            <button data-id="${c.id}" class="btn-editar-user px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-bold transition uppercase">
                              Editar ✏️
                            </button>
                            
                            ${isSelf ? `
                              <span class="text-xs text-slate-400 dark:text-slate-500 font-semibold italic ml-2">Você</span>
                            ` : `
                              <select data-id="${c.id}" class="select-role-user px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                <option value="consultor" ${c.role === 'consultor' ? 'selected' : ''}>Tornar Consultor</option>
                                <option value="admin" ${c.role === 'admin' ? 'selected' : ''}>Tornar ADMIN</option>
                              </select>
                              
                              <button data-id="${c.id}" data-active="${c.ativo}" class="btn-toggle-status-user px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                c.ativo 
                                  ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 hover:dark:bg-rose-950/30' 
                                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 hover:dark:bg-emerald-950/30'
                              }">
                                ${c.ativo ? 'Desativar' : 'Ativar'}
                              </button>
                            `}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        `}
      </div>
    `;
  }
}

export default ConfiguracoesPage;
