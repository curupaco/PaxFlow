import { supabase, getSessaoAtual } from '../services/supabase';
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
    @keyframes googlePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    .google-attention {
      animation: googlePulse 2.5s infinite ease-in-out;
    }
  `;
    document.head.appendChild(style);
}
export class ConfiguracoesPage {
    container;
    user = null;
    perfil = null;
    settings = null;
    constructor(container) {
        this.container = container;
    }
    /**
     * Inicializa o painel de configurações: valida o nível de acesso admin, busca dados e renderiza.
     */
    async init() {
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
            // 2. Bloqueio Rígido de Segurança: Apenas administrador acessa esta tela
            if (!this.perfil || this.perfil.role !== 'admin') {
                this.renderAcessoNegado();
                return;
            }
            // 3. Buscar configurações globais
            await this.loadSettings();
            // 4. Renderizar interface
            this.render();
            // 5. Configurar ouvintes de eventos do formulário e OAuth2
            this.setupEventListeners();
        }
        catch (err) {
            console.error('Erro na inicialização da tela de configurações:', err);
            this.renderAuthError(`Erro interno: ${err.message}`);
        }
    }
    /**
     * Busca as configurações administrativas na tabela global_settings
     */
    async loadSettings() {
        try {
            const { data, error } = await supabase
                .from('global_settings')
                .select('*')
                .maybeSingle();
            if (error)
                throw error;
            if (data) {
                // Mapeia de snake_case do banco de dados para camelCase na interface
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
            }
            else {
                // Cria um registro inicial se não existir nenhum
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
                if (insertError)
                    throw insertError;
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
        }
        catch (err) {
            console.error('Erro ao carregar configurações administrativas:', err.message);
        }
    }
    /**
     * Associa os eventos gerais de salvamento e login com o Google
     */
    setupEventListeners() {
        const form = document.getElementById('form-configuracoes');
        // Tratamento de salvamento das configurações gerais
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!this.settings)
                return;
            const agencyNameVal = document.getElementById('input-agency-name').value;
            const emailSuporteVal = document.getElementById('input-email-suporte').value;
            const slaPreVal = Number(document.getElementById('input-sla-pre').value);
            const slaPosVal = Number(document.getElementById('input-sla-pos').value);
            const taxaVal = Number(document.getElementById('input-taxa').value);
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
                if (error)
                    throw error;
                this.showToast('Configurações atualizadas com sucesso!', 'success');
                await this.loadSettings();
                this.render();
                this.setupEventListeners();
            }
            catch (err) {
                console.error('Erro ao salvar configurações globais:', err);
                this.showToast('Falha ao gravar configurações administrativas.', 'error');
            }
        });
        // Evento para iniciar a Autenticação Google OAuth2
        const btnGoogle = document.getElementById('btn-google-auth');
        btnGoogle?.addEventListener('click', () => {
            this.abrirSimuladorGoogleOAuth2();
        });
        // Botão de Logout
        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            if (confirm('Deseja realmente sair?')) {
                const { logoutConsultor } = await import('../services/supabase');
                await logoutConsultor();
                window.location.reload();
            }
        });
    }
    /**
     * Abre um simulador visual de alta fidelidade para o consentimento OAuth2 do Google
     * garantindo o fluxo estrito para a conta corporativa.
     */
    abrirSimuladorGoogleOAuth2() {
        // Cria o overlay no DOM
        const overlay = document.createElement('div');
        overlay.id = 'oauth-simulator-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';
        // Conteúdo simulando tela oficial de login e consentimento Google
        overlay.innerHTML = `
      <div class="bg-white w-full max-w-[450px] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 transform scale-95 transition-all duration-300 flex flex-col" id="oauth-card">
        
        <!-- Topo com Logo e Título do Google -->
        <div class="p-6 text-center border-b border-slate-100 flex flex-col items-center">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="text-xl font-bold tracking-tight select-none">
              <span class="text-blue-600 font-extrabold">G</span><span class="text-red-500 font-extrabold">o</span><span class="text-yellow-500 font-extrabold">o</span><span class="text-blue-600 font-extrabold">g</span><span class="text-green-500 font-extrabold">l</span><span class="text-red-500 font-extrabold">e</span>
            </span>
          </div>
          <h2 class="text-lg font-bold text-slate-800 leading-snug">Escolha uma conta corporativa</h2>
          <p class="text-xs text-slate-400 font-semibold mt-1">para prosseguir para o aplicativo <span class="text-indigo-600 font-black">PaxFlow</span></p>
        </div>

        <div class="p-5 flex-1 space-y-4" id="oauth-step-container">
          
          <!-- Passo 1: Escolher a Conta -->
          <div id="oauth-step-1" class="space-y-3.5">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contas salvas neste dispositivo:</p>
            
            <!-- Opção A: Conta Corporativa (CORRETA) -->
            <button id="btn-oauth-acc-corp" class="w-full p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 flex items-center justify-between text-left transition group">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-indigo-50 text-indigo-600 font-bold rounded-full flex items-center justify-center text-sm">
                  PF
                </div>
                <div>
                  <span class="block text-sm font-extrabold text-slate-700">PaxFlow Agência de Viagens</span>
                  <span class="block text-xs text-slate-400 font-medium group-hover:text-slate-500">paxflow.agencia@gmail.com (Agência)</span>
                </div>
              </div>
              <span class="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold rounded">Recomendada</span>
            </button>

            <!-- Opção B: Conta Pessoal (BLOQUEADA / ALERTA) -->
            <button id="btn-oauth-acc-pessoal" class="w-full p-4 rounded-xl border border-slate-100 hover:border-rose-300 hover:bg-slate-50 flex items-center justify-between text-left transition group">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-slate-100 text-slate-500 font-bold rounded-full flex items-center justify-center text-sm">
                  TC
                </div>
                <div>
                  <span class="block text-sm font-bold text-slate-700">Thiago Costa (Pessoal)</span>
                  <span class="block text-xs text-slate-400 font-medium">thiago.personal@gmail.com</span>
                </div>
              </div>
              <span class="text-xs px-2 py-0.5 bg-slate-100 text-slate-400 font-medium rounded">Pessoal</span>
            </button>
            
            <div class="pt-3 border-t border-slate-100 flex justify-end">
              <button id="btn-oauth-cancel" class="text-xs font-bold text-slate-400 hover:text-slate-600 transition uppercase py-2 px-3">
                Cancelar
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
        document.body.appendChild(overlay);
        // Anima a abertura
        setTimeout(() => {
            overlay.classList.add('opacity-100');
            document.getElementById('oauth-card')?.classList.remove('scale-95');
            document.getElementById('oauth-card')?.classList.add('scale-100');
        }, 10);
        // Eventos do Passo 1
        const btnCancel = document.getElementById('btn-oauth-cancel');
        btnCancel?.addEventListener('click', () => this.fecharSimuladorGoogleOAuth2());
        // Se clicar na conta Pessoal, exibe alerta rígido
        const btnPessoal = document.getElementById('btn-oauth-acc-pessoal');
        btnPessoal?.addEventListener('click', () => {
            alert('⚠️ Acesso Negado!\n\nPor favor, selecione apenas a conta corporativa da agência ' +
                '(paxflow.agencia@gmail.com) para garantir que os arquivos sejam ' +
                'centralizados no Drive oficial da empresa e evitar misturar dados dos passageiros com contas pessoais.');
        });
        // Se clicar na conta Corporativa, avança para a tela de Consentimento de Permissões
        const btnCorp = document.getElementById('btn-oauth-acc-corp');
        btnCorp?.addEventListener('click', () => {
            this.mostrarOAuthConsentimento();
        });
    }
    /**
     * Mostra o segundo passo do simulador OAuth2 (Tela de Consentimento de Permissões do Google)
     */
    mostrarOAuthConsentimento() {
        const container = document.getElementById('oauth-step-container');
        if (!container)
            return;
        container.innerHTML = `
      <!-- Passo 2: Consentimento de Permissões -->
      <div id="oauth-step-2" class="space-y-5 animate-fade-in">
        <div class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/40 text-xs text-indigo-900 font-semibold space-y-1">
          <p>O PaxFlow deseja acessar a sua Conta do Google</p>
          <p class="text-indigo-500 font-bold text-[10px]">paxflow.agencia@gmail.com</p>
        </div>

        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
          Para realizar o armazenamento seguro de passaportes e vistos, o PaxFlow necessita das seguintes permissões:
        </p>

        <div class="space-y-3.5 border-t border-b border-slate-100 py-4.5">
          <div class="flex items-start gap-3">
            <span class="text-base">📁</span>
            <div>
              <span class="block text-xs font-black text-slate-800">Ver, criar, editar e excluir arquivos do Google Drive</span>
              <span class="block text-[10px] text-slate-400 font-medium">Permite salvar e organizar passaportes dos passageiros em pastas automáticas.</span>
            </div>
          </div>
          
          <div class="flex items-start gap-3">
            <span class="text-base">⚙️</span>
            <div>
              <span class="block text-xs font-black text-slate-800">Manter acesso contínuo aos dados (Offline Access)</span>
              <span class="block text-[10px] text-slate-400 font-medium">Garante que os consultores consigam fazer uploads mesmo sem você estar logado.</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button id="btn-oauth-deny" class="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition uppercase">
            Negar
          </button>
          <button id="btn-oauth-allow" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-blue-500/20 uppercase tracking-wide">
            Permitir e Conectar
          </button>
        </div>
      </div>
    `;
        // Eventos do Passo 2
        document.getElementById('btn-oauth-deny')?.addEventListener('click', () => {
            this.fecharSimuladorGoogleOAuth2();
        });
        // Se permitir, gera o token offline e salva no Supabase
        document.getElementById('btn-oauth-allow')?.addEventListener('click', async () => {
            this.concluirOAuth2Fluxo();
        });
    }
    /**
     * Conclui o fluxo OAuth2 gerando o refresh_token e persistindo na tabela global_settings
     */
    async concluirOAuth2Fluxo() {
        if (!this.settings)
            return;
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
            // 1. Gera um refresh_token mock de alta fidelidade
            const mockRefreshToken = `mock_oauth2_refresh_token_paxflow_agency_active_${Math.random().toString(36).substring(2, 10)}`;
            // 2. Grava no banco de dados na coluna google_refresh_token
            const { error } = await supabase
                .from('global_settings')
                .update({ google_refresh_token: mockRefreshToken })
                .eq('id', this.settings.id);
            if (error)
                throw error;
            this.showToast('Conta Google Drive corporativa vinculada com sucesso!', 'success');
            this.fecharSimuladorGoogleOAuth2();
            // 3. Atualiza os dados e re-renderiza o painel
            await this.loadSettings();
            this.render();
            this.setupEventListeners();
        }
        catch (err) {
            console.error('Erro ao salvar google_refresh_token:', err);
            this.showToast('Erro interno ao estabelecer vinculação com o Google.', 'error');
            this.fecharSimuladorGoogleOAuth2();
        }
    }
    /**
     * Fecha o simulador OAuth2 com animação
     */
    fecharSimuladorGoogleOAuth2() {
        const overlay = document.getElementById('oauth-simulator-overlay');
        const card = document.getElementById('oauth-card');
        if (overlay && card) {
            card.classList.remove('scale-100');
            card.classList.add('scale-95');
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    }
    /**
     * Exibe tela de carregamento (Skeleton loader)
     */
    renderLoading() {
        this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 p-8 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-semibold animate-pulse">Carregando painel de configurações...</p>
      </div>
    `;
    }
    /**
     * Exibe tela de erro de autenticação ou carregamento
     */
    renderAuthError(msg) {
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
     * Exibe tela de Acesso Negado se o consultor não for administrador
     */
    renderAcessoNegado() {
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
            // Recarrega para voltar à tela principal
            window.location.reload();
        });
    }
    /**
     * Exibe mensagens flutuantes (Toasts)
     */
    showToast(message, type = 'success') {
        const toastId = 'paxflow-toast';
        let toast = document.getElementById(toastId);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = toastId;
            toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
            document.body.appendChild(toast);
        }
        const isSuccess = type === 'success';
        toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'}`;
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
    render() {
        if (!this.settings)
            return;
        const drivesConectado = !!this.settings.googleRefreshToken;
        this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 flex flex-col font-sans">
        
        <!-- Cabeçalho -->
        <header class="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="PaxFlow Logo" class="h-10 w-auto object-contain" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 tracking-tight">Painel de Configurações</h1>
              <p class="text-xs text-slate-500 font-medium flex items-center gap-1">
                <span>Configurações Globais</span> &bull; 
                <span class="text-indigo-600 font-bold uppercase tracking-wider text-[10px]">Administrador</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right hidden sm:block">
              <span class="block text-sm font-extrabold text-slate-700">${this.perfil?.nome || 'Administrador'}</span>
              <span class="block text-xs text-slate-400">${this.perfil?.email || this.user.email}</span>
            </div>
            <button id="btn-logout" class="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition border border-slate-200/40">
              🚪
            </button>
          </div>
        </header>

        <!-- Corpo Principal de Configurações -->
        <main class="flex-1 p-6 max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          <!-- Coluna Esquerda: Formulário de SLA e Regras -->
          <div class="md:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h2 class="text-lg font-black text-slate-800 tracking-tight border-b border-slate-100 pb-3.5 mb-5 flex items-center gap-2">
              <span class="p-2 bg-indigo-50 text-indigo-500 rounded-lg text-sm">⚙️</span>
              Regras do Negócio & Parâmetros de SLAs
            </h2>

            <form id="form-configuracoes" class="space-y-6">
              
              <!-- Nome da Agência -->
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nome da Agência de Viagens *</label>
                <input id="input-agency-name" type="text" required value="${this.settings.agencyName}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold" />
              </div>

              <!-- E-mail de Suporte -->
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">E-mail de Suporte e Alertas *</label>
                <input id="input-email-suporte" type="email" required value="${this.settings.emailSuporte}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold" />
              </div>

              <!-- Seção de SLAs -->
              <div class="border-t border-slate-100 pt-5 space-y-4">
                <h3 class="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">Parâmetros das Colunas do Kanban</h3>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- SLA Pré-Embarque -->
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Dias Alerta Pré-Embarque *</label>
                    <input id="input-sla-pre" type="number" min="1" required value="${this.settings.slaPreEmbarqueDias}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold" />
                    <p class="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">Dispara alerta visual vermelho no card se a data de embarque estiver a menos dias do que este limite.</p>
                  </div>

                  <!-- SLA Pós-Viagem -->
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Dias Alerta Pós-Viagem *</label>
                    <input id="input-sla-pos" type="number" min="1" required value="${this.settings.slaPosViagemDias}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold" />
                    <p class="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">Dispara alerta visual laranja se a viagem já terminou e o pós-venda não foi fechado dentro deste limite.</p>
                  </div>
                </div>
              </div>

              <!-- Taxa Padrão de Cancelamento -->
              <div class="border-t border-slate-100 pt-5">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Taxa de Cancelamento Retida (%)</label>
                  <input id="input-taxa" type="number" step="0.01" min="0" max="100" value="${this.settings.taxaCancelamentoPadrao}" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold" />
                  <p class="text-[10px] text-slate-400 mt-1.5 font-medium">Taxa retida padrão sugerida durante a solicitação de reembolsos.</p>
                </div>
              </div>

              <!-- Botão de Ação -->
              <div class="flex justify-end pt-4 border-t border-slate-100 mt-6">
                <button type="submit" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">
                  Salvar Parâmetros
                </button>
              </div>

            </form>
          </div>

          <!-- Coluna Direita: Vinculação OAuth2 do Google Drive -->
          <div class="md:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <h2 class="text-sm font-black text-slate-800 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
              <span class="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg text-xs">☁️</span>
              Integração Segura Google Drive
            </h2>

            <p class="text-xs text-slate-400 font-medium leading-relaxed">
              O PaxFlow realiza o upload de passaportes e vistos de forma centralizada em uma conta única do Google Drive pertencente à agência.
            </p>

            <!-- Card de Status da Integração -->
            <div class="border border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 bg-slate-50/50">
              ${drivesConectado ? `
                <span class="text-3xl">✅</span>
                <span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[9px] rounded uppercase tracking-wider">Conectado</span>
                <p class="text-[10px] text-slate-500 font-bold mt-1">Conta central autorizada</p>
                <p class="text-[8px] text-slate-300 font-medium truncate max-w-[170px] select-all">Token: ${this.settings.googleRefreshToken?.substring(0, 25)}...</p>
              ` : `
                <span class="text-3xl">⚠️</span>
                <span class="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 font-black text-[9px] rounded uppercase tracking-wider">Sem Integração</span>
                <p class="text-[10px] text-slate-400 font-semibold mt-1">É necessário realizar a vinculação corporativa para ativar uploads.</p>
              `}
            </div>

            <!-- Botão de Vinculação (OAuth2) -->
            <div>
              <button id="btn-google-auth" class="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition shadow-sm font-extrabold text-xs tracking-wider uppercase ${drivesConectado
            ? 'google-btn border-slate-200'
            : 'bg-indigo-50 border border-indigo-200/50 text-indigo-700 hover:bg-indigo-100/50 google-attention'}">
                <span class="text-base select-none">
                  <span class="text-blue-600 font-extrabold">G</span><span class="text-red-500 font-extrabold">o</span><span class="text-yellow-500 font-extrabold">o</span><span class="text-blue-600 font-extrabold">g</span><span class="text-green-500 font-extrabold">l</span><span class="text-red-500 font-extrabold">e</span>
                </span>
                ${drivesConectado ? 'Reconectar Conta Google' : 'Conectar Conta Corporativa'}
              </button>
            </div>
            
            <p class="text-[9px] text-slate-400 font-medium leading-normal text-center">
              Apenas contas Google autorizadas podem armazenar arquivos. Os consultores não têm acesso direto às credenciais.
            </p>

          </div>

        </main>
      </div>
    `;
    }
}
export default ConfiguracoesPage;
