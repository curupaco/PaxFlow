import { supabase, getSessaoAtual, atualizarSenhaAtual } from '../services/supabase';
import { PerfilConsultor, GlobalSettings } from '../types';
import { getAvatarSvg, AVATAR_OPTIONS, mesclarAvataresLocais, salvarAvatarLocal } from '../services/avatars';

import { renderEmailInputHTML, setupFormValidation } from '../utils/masks';
import { showCustomAlert, showCustomConfirm } from '../services/dialog';
import { parseCSV, batchInsertOrcamentos, formatBrDateToYmd, parseBrFloat } from '../services/csvImporter';
import { renderHelpIcon } from '../utils/helpHelper';


declare const process: any;

function compressLogo(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas error'));
          return;
        }
        
        let width = img.width;
        let height = img.height;
        const maxDim = 400;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Blob error'));
        }, 'image/jpeg', 0.85);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
  private activeTab: 'branding' | 'automacoes' | 'integracoes' | 'consultores' | 'importacoes' = 'branding';

  // Propriedades do estado de importação de CSV
  private parsedHeaders: string[] = [];
  private csvRows: string[][] = [];
  private uniqueAttendants: string[] = [];
  private columnMapping: { [key: string]: string } = {};
  private attendantMapping: { [key: string]: string } = {};
  private isImporting: boolean = false;
  private defaultDestino: string = 'Importação DIGISAC';
  private defaultTemperatura: 'Frio' | 'Normal' | 'Quente' = 'Normal';
  private defaultStatus: 'SOLICITADO' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'CONCLUIDO' = 'SOLICITADO';
  private storageError: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa o painel de configurações: valida o nível de acesso admin, busca dados e renderiza.
   */
  public async init(): Promise<void> {
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
   * Destrutor da página para limpar listeners globais
   */
  public destroy(): void {

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
          agencyName: data.agency_name || data.agencyName || 'PaxFlow',
          taxaCancelamentoPadrao: data.taxa_cancelamento_padrao || data.taxaCancelamentoPadrao || 0,
          prazoReembolsoDias: data.prazo_reembolso_dias || data.prazoReembolsoDias || 3,
          notificacoesAtivas: data.notificacoes_ativas !== undefined ? data.notificacoes_ativas : true,
          emailSuporte: data.email_suporte || data.emailSuporte || 'suporte@paxflow.com.br',
          googleRefreshToken: data.google_refresh_token || data.googleRefreshToken,
          googleParentFolderId: data.google_parent_folder_id || data.googleParentFolderId,
          slaPreEmbarqueDias: data.sla_pre_embarque_dias !== undefined ? data.sla_pre_embarque_dias : 7,
          slaPosViagemDias: data.sla_pos_viagem_dias !== undefined ? data.sla_pos_viagem_dias : 3,
          limiteUploadMb: data.limite_upload_mb !== undefined ? data.limite_upload_mb : 25,
          enviarNpsAutomatico: data.enviar_nps_automatico !== undefined ? data.enviar_nps_automatico : false,
          agencyLogoUrl: data.agency_logo_url || data.agencyLogoUrl || '',
          agency_logo_url: data.agency_logo_url || data.agencyLogoUrl || '',
          agencyPrimaryColor: data.agency_primary_color || data.agencyPrimaryColor || '#4f46e5',
          agency_primary_color: data.agency_primary_color || data.agencyPrimaryColor || '#4f46e5',
          digisacToken: data.digisac_token || '',
          digisacDomain: data.digisac_domain || '',
          digisacServiceId: data.digisac_service_id || '',
          digisac_enable_manual_send: data.digisac_enable_manual_send !== false,
          digisacEnableManualSend: data.digisac_enable_manual_send !== false,
          digisac_enable_chat_history: data.digisac_enable_chat_history !== false,
          digisacEnableChatHistory: data.digisac_enable_chat_history !== false,
          digisac_enable_vouchers: data.digisac_enable_vouchers !== false,
          digisacEnableVouchers: data.digisac_enable_vouchers !== false,
          digisac_enable_routing: data.digisac_enable_routing !== false,
          digisacEnableRouting: data.digisac_enable_routing !== false,
          digisac_enable_bot_triggers: data.digisac_enable_bot_triggers !== false,
          digisacEnableBotTriggers: data.digisac_enable_bot_triggers !== false,
          digisac_enable_webhooks: data.digisac_enable_webhooks !== false,
          digisacEnableWebhooks: data.digisac_enable_webhooks !== false,
          tempoDesistenciaOrcamentoDias: data.tempo_desistencia_orcamento_dias !== undefined ? data.tempo_desistencia_orcamento_dias : 30,
          tempo_desistencia_orcamento_dias: data.tempo_desistencia_orcamento_dias !== undefined ? data.tempo_desistencia_orcamento_dias : 30,
          permitirConsultorCriarViagem: data.permitir_consultor_criar_viagem !== undefined ? data.permitir_consultor_criar_viagem : (data.permitirConsultorCriarViagem !== undefined ? data.permitirConsultorCriarViagem : false),
          permitir_consultor_criar_viagem: data.permitir_consultor_criar_viagem !== undefined ? data.permitir_consultor_criar_viagem : (data.permitirConsultorCriarViagem !== undefined ? data.permitirConsultorCriarViagem : false),
          copilotoAtivo: data.copiloto_ativo !== undefined ? data.copiloto_ativo : (data.copilotoAtivo !== undefined ? data.copilotoAtivo : true),
          copiloto_ativo: data.copiloto_ativo !== undefined ? data.copiloto_ativo : (data.copilotoAtivo !== undefined ? data.copilotoAtivo : true)
        };
      } else {
        const initialPayload = {
          agency_name: 'PaxFlow',
          taxa_cancelamento_padrao: 0,
          prazo_reembolso_dias: 3,
          notificacoes_ativas: true,
          email_suporte: 'suporte@paxflow.com.br',
          sla_pre_embarque_dias: 7,
          sla_pos_viagem_dias: 3,
          limite_upload_mb: 25,
          enviar_nps_automatico: false,
          agency_logo_url: '',
          agency_primary_color: '#4f46e5',
          copiloto_ativo: true,
          digisac_token: '',
          digisac_domain: '',
          digisac_service_id: '',
          digisac_enable_manual_send: true,
          digisac_enable_chat_history: true,
          digisac_enable_vouchers: true,
          digisac_enable_routing: true,
          digisac_enable_bot_triggers: true,
          digisac_enable_webhooks: true,
          tempo_desistencia_orcamento_dias: 30,
          permitir_consultor_criar_viagem: false
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
          googleParentFolderId: inserted.google_parent_folder_id,
          slaPreEmbarqueDias: inserted.sla_pre_embarque_dias,
          slaPosViagemDias: inserted.sla_pos_viagem_dias,
          limiteUploadMb: inserted.limite_upload_mb,
          enviarNpsAutomatico: inserted.enviar_nps_automatico,
          agencyLogoUrl: inserted.agency_logo_url || '',
          agency_logo_url: inserted.agency_logo_url || '',
          agencyPrimaryColor: inserted.agency_primary_color || '#4f46e5',
          agency_primary_color: inserted.agency_primary_color || '#4f46e5',
          digisacToken: inserted.digisac_token || '',
          digisacDomain: inserted.digisac_domain || '',
          digisacServiceId: inserted.digisac_service_id || '',
          digisac_enable_manual_send: inserted.digisac_enable_manual_send !== false,
          digisacEnableManualSend: inserted.digisac_enable_manual_send !== false,
          digisac_enable_chat_history: inserted.digisac_enable_chat_history !== false,
          digisacEnableChatHistory: inserted.digisac_enable_chat_history !== false,
          digisac_enable_vouchers: inserted.digisac_enable_vouchers !== false,
          digisacEnableVouchers: inserted.digisac_enable_vouchers !== false,
          digisac_enable_routing: inserted.digisac_enable_routing !== false,
          digisacEnableRouting: inserted.digisac_enable_routing !== false,
          digisac_enable_bot_triggers: inserted.digisac_enable_bot_triggers !== false,
          digisacEnableBotTriggers: inserted.digisac_enable_bot_triggers !== false,
          digisac_enable_webhooks: inserted.digisac_enable_webhooks !== false,
          digisacEnableWebhooks: inserted.digisac_enable_webhooks !== false,
          tempoDesistenciaOrcamentoDias: inserted.tempo_desistencia_orcamento_dias !== undefined ? inserted.tempo_desistencia_orcamento_dias : 30,
          tempo_desistencia_orcamento_dias: inserted.tempo_desistencia_orcamento_dias !== undefined ? inserted.tempo_desistencia_orcamento_dias : 30,
          permitirConsultorCriarViagem: inserted.permitir_consultor_criar_viagem !== undefined ? inserted.permitir_consultor_criar_viagem : false,
          permitir_consultor_criar_viagem: inserted.permitir_consultor_criar_viagem !== undefined ? inserted.permitir_consultor_criar_viagem : false
        };
      }

      // Validar a conexão com o Supabase Storage em segundo plano ao carregar
      try {
        const { error: storageErr } = await supabase.storage.from('documentos-clientes').list('', { limit: 1 });
        if (storageErr) {
          this.storageError = storageErr.message;
        } else {
          this.storageError = null;
        }
      } catch (err: any) {
        this.storageError = err.message || 'Erro de conexão com o Supabase Storage.';
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
  private switchTab(tab: 'branding' | 'automacoes' | 'integracoes' | 'consultores' | 'importacoes'): void {
    this.activeTab = tab;
    this.render();
    this.setupEventListeners();
  }

  /**
   * Associa os eventos da barra lateral e dos formulários por aba
   */
  private setupEventListeners(): void {
    // Configura os botões da barra lateral Master-Detail
    document.getElementById('tab-branding-btn')?.addEventListener('click', () => this.switchTab('branding'));
    document.getElementById('tab-automacoes-btn')?.addEventListener('click', () => this.switchTab('automacoes'));
    document.getElementById('tab-integracoes-btn')?.addEventListener('click', () => this.switchTab('integracoes'));
    document.getElementById('tab-consultores-btn')?.addEventListener('click', () => this.switchTab('consultores'));
    document.getElementById('tab-importacoes-btn')?.addEventListener('click', () => this.switchTab('importacoes'));

    if (this.activeTab === 'branding') {
      this.setupBrandingEvents();
    } else if (this.activeTab === 'automacoes') {
      this.setupAutomacoesEvents();
    } else if (this.activeTab === 'integracoes') {
      this.setupIntegracoesEvents();
    } else if (this.activeTab === 'consultores') {
      this.setupConsultoresEvents();
    } else if (this.activeTab === 'importacoes') {
      this.setupImportacoesEvents();
    }
  }

  /**
   * Eventos da Aba 1: Identidade & Marca
   */
  private setupBrandingEvents(): void {
    const form = document.getElementById('form-config-branding') as HTMLFormElement;
    setupFormValidation('form-config-branding', [
      { id: 'input-email-suporte', type: 'email' }
    ]);
    
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.settings) return;

      const agencyNameVal = (document.getElementById('input-agency-name') as HTMLInputElement).value;
      const emailSuporteVal = (document.getElementById('input-email-suporte') as HTMLInputElement).value;
      const taxaVal = Number((document.getElementById('input-taxa') as HTMLInputElement).value);
      const limiteUploadVal = Number((document.getElementById('input-limite-upload') as HTMLInputElement).value);
      const primaryColorVal = (document.getElementById('input-agency-primary-color') as HTMLInputElement).value;
      const logoUrlVal = (document.getElementById('input-agency-logo-url') as HTMLInputElement).value;
      const copilotoAtivoVal = (document.getElementById('input-copiloto-ativo') as HTMLInputElement)?.checked ?? true;

      const payload = {
        agency_name: agencyNameVal,
        email_suporte: emailSuporteVal,
        taxa_cancelamento_padrao: taxaVal,
        limite_upload_mb: limiteUploadVal,
        agency_primary_color: primaryColorVal,
        agency_logo_url: logoUrlVal,
        copiloto_ativo: copilotoAtivoVal
      };

      try {
        const { error } = await supabase
          .from('global_settings')
          .update(payload)
          .eq('id', this.settings.id);

        if (error) throw error;

        this.showToast('Identidade visual e marca salvas com sucesso!', 'success');
        await this.loadSettings();
        window.dispatchEvent(new CustomEvent('paxflow-settings-updated', { detail: this.settings }));
        this.render();
        this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro ao salvar marca:', err);
        this.showToast('Falha ao gravar configurações de marca.', 'error');
      }
    });

    // Color picker listener
    document.getElementById('input-agency-primary-color')?.addEventListener('input', (e) => {
      const color = (e.target as HTMLInputElement).value;
      const span = document.querySelector('#input-agency-primary-color + span');
      if (span) span.textContent = color.toUpperCase();

      const previewBadge = document.getElementById('brand-color-preview-badge');
      if (previewBadge) {
        previewBadge.style.backgroundColor = color;
      }
    });

    // Logo upload listener
    const logoInput = document.getElementById('input-agency-logo-file') as HTMLInputElement;
    logoInput?.addEventListener('change', async () => {
      const file = logoInput.files?.[0];
      if (!file) return;

      const loader = document.getElementById('logo-upload-spinner');
      if (loader) loader.classList.remove('hidden');

      try {
        const blob = await compressLogo(file);
        const ext = file.name.split('.').pop() || 'jpg';
        const userId = this.perfil?.id || 'public';
        const path = `${userId}/logos/agency_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);

        const publicUrl = data.publicUrl;

        const inputUrl = document.getElementById('input-agency-logo-url') as HTMLInputElement;
        if (inputUrl) inputUrl.value = publicUrl;

        const previewImg = document.getElementById('img-agency-logo-preview') as HTMLImageElement;
        if (previewImg) {
          previewImg.src = publicUrl;
          previewImg.classList.remove('hidden');
        }

        this.showToast('Logotipo carregado com sucesso!', 'success');
      } catch (err: any) {
        console.error('Erro no upload do logo:', err);
        this.showToast('Erro ao carregar logotipo.', 'error');
      } finally {
        if (loader) loader.classList.add('hidden');
      }
    });

    // Alteração de Senha do Administrador
    const formSenha = document.getElementById('form-senha-admin') as HTMLFormElement;
    formSenha?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const novaSenha = (document.getElementById('input-nova-senha') as HTMLInputElement).value;
      const confSenha = (document.getElementById('input-confirmar-senha') as HTMLInputElement).value;

      if (!novaSenha || novaSenha.length < 6) {
        this.showToast('A senha precisa ter no mínimo 6 caracteres.', 'error');
        return;
      }
      if (novaSenha !== confSenha) {
        this.showToast('As senhas digitadas não coincidem.', 'error');
        return;
      }

      try {
        const { error } = await atualizarSenhaAtual(novaSenha);
        if (error) throw error;

        this.showToast('Sua senha foi alterada com sucesso!', 'success');
        formSenha.reset();
      } catch (err: any) {
        console.error('Erro ao atualizar senha:', err);
        this.showToast('Erro ao atualizar senha.', 'error');
      }
    });
  }

  /**
   * Eventos da Aba 3: Integrações & Comunicação
   */
  private setupIntegracoesEvents(): void {
    const form = document.getElementById('form-config-integracoes') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.settings) return;

      const digisacDomainVal = (document.getElementById('input-digisac-domain') as HTMLInputElement).value;
      const digisacServiceIdVal = (document.getElementById('input-digisac-service-id') as HTMLInputElement).value;
      const digisacTokenVal = (document.getElementById('input-digisac-token') as HTMLInputElement).value;
      const digisacEnableManualSendVal = (document.getElementById('input-digisac-enable-manual-send') as HTMLInputElement).checked;
      const digisacEnableChatHistoryVal = (document.getElementById('input-digisac-enable-chat-history') as HTMLInputElement).checked;
      const digisacEnableVouchersVal = (document.getElementById('input-digisac-enable-vouchers') as HTMLInputElement).checked;
      const digisacEnableRoutingVal = (document.getElementById('input-digisac-enable-routing') as HTMLInputElement).checked;
      const digisacEnableBotTriggersVal = (document.getElementById('input-digisac-enable-bot-triggers') as HTMLInputElement).checked;
      const digisacEnableWebhooksVal = (document.getElementById('input-digisac-enable-webhooks') as HTMLInputElement).checked;

      const payload = {
        digisac_domain: digisacDomainVal,
        digisac_service_id: digisacServiceIdVal,
        digisac_token: digisacTokenVal,
        digisac_enable_manual_send: digisacEnableManualSendVal,
        digisac_enable_chat_history: digisacEnableChatHistoryVal,
        digisac_enable_vouchers: digisacEnableVouchersVal,
        digisac_enable_routing: digisacEnableRoutingVal,
        digisac_enable_bot_triggers: digisacEnableBotTriggersVal,
        digisac_enable_webhooks: digisacEnableWebhooksVal
      };

      try {
        const { error } = await supabase
          .from('global_settings')
          .update(payload)
          .eq('id', this.settings.id);

        if (error) throw error;

        this.showToast('Configurações do DigiSac salvas!', 'success');
        await this.loadSettings();
        this.render();
        this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro ao salvar integrações:', err);
        this.showToast('Falha ao salvar integrações.', 'error');
      }
    });

    // Testar Digisac
    document.getElementById('btn-testar-digisac')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-testar-digisac') as HTMLButtonElement;
      const statusEl = document.getElementById('digisac-status-badge');
      const resultEl = document.getElementById('digisac-test-result');
      
      const domainInput = document.getElementById('input-digisac-domain') as HTMLInputElement;
      const serviceIdInput = document.getElementById('input-digisac-service-id') as HTMLInputElement;
      const tokenInput = document.getElementById('input-digisac-token') as HTMLInputElement;

      if (!domainInput || !serviceIdInput || !tokenInput) return;

      const domain = domainInput.value.trim();
      const serviceId = serviceIdInput.value.trim();
      const token = tokenInput.value.trim();

      if (!domain || !serviceId || !token) {
        this.showToast('Preencha os campos do Digisac antes de testar.', 'error');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Testando...';
      }
      if (statusEl) {
        statusEl.className = 'px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
        statusEl.textContent = 'Verificando...';
      }
      if (resultEl) {
        resultEl.className = 'text-[10px] font-semibold text-amber-500';
        resultEl.textContent = 'Verificando status do canal no Digisac...';
      }

      try {
        let cleanDomain = domain.replace(/\/$/, '');
        if (cleanDomain.endsWith('/api/v1')) {
          cleanDomain = cleanDomain.slice(0, -7);
        } else if (cleanDomain.endsWith('/api/v1/')) {
          cleanDomain = cleanDomain.slice(0, -8);
        } else if (cleanDomain.endsWith('/api')) {
          cleanDomain = cleanDomain.slice(0, -4);
        }

        const url = `${cleanDomain}/api/v1/services/${serviceId}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 200) {
          const serviceData = await response.json();
          const serviceName = serviceData.name || 'WhatsApp';
          
          if (statusEl) {
            statusEl.className = 'px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
            statusEl.textContent = 'Conectado';
          }
          if (resultEl) {
            resultEl.className = 'text-[10px] font-semibold text-emerald-600 dark:text-emerald-450';
            resultEl.textContent = `Sucesso! Canal: "${serviceName}"`;
          }
          this.showToast('Conexão estabelecida com o Digisac!', 'success');
        } else if (response.status === 401 || response.status === 403) {
          if (statusEl) {
            statusEl.className = 'px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20';
            statusEl.textContent = 'Erro Auth';
          }
          if (resultEl) {
            resultEl.className = 'text-[10px] font-semibold text-rose-555';
            resultEl.textContent = 'Token de acesso inválido ou expirado.';
          }
          this.showToast('Erro: Token do Digisac inválido.', 'error');
        } else if (response.status === 404) {
          if (statusEl) {
            statusEl.className = 'px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20';
            statusEl.textContent = 'ID Inválido';
          }
          if (resultEl) {
            resultEl.className = 'text-[10px] font-semibold text-rose-555';
            resultEl.textContent = 'ID de Conexão não encontrado.';
          }
          this.showToast('ID da Conexão não encontrado no Digisac.', 'error');
        } else {
          const errText = await response.text();
          throw new Error(errText || `Erro HTTP ${response.status}`);
        }
      } catch (err: any) {
        console.error('Erro de teste Digisac:', err);
        if (statusEl) {
          statusEl.className = 'px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20';
          statusEl.textContent = 'Erro Conexão';
        }
        if (resultEl) {
          resultEl.className = 'text-[10px] font-semibold text-rose-555';
          resultEl.textContent = `Falha de conexão: ${err.message || 'Verifique o domínio.'}`;
        }
        this.showToast('Não foi possível conectar ao servidor do Digisac.', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '⚡ Testar Conexão';
        }
      }
    });

    // Testar Storage / Google Drive
    document.getElementById('btn-test-drive-connection')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-test-drive-connection') as HTMLButtonElement;
      if (!btn || !this.settings) return;
      
      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block align-middle mr-1.5 font-black"></span> Testando...`;
      
      try {
        const { data, error } = await supabase.storage.from('documentos-clientes').list('', { limit: 1 });
        
        if (error) {
          throw error;
        }
        
        this.storageError = null;
        this.showToast('Conexão com Supabase Storage ativa! Bucket "documentos-clientes" acessado com sucesso.', 'success');
        this.render();
        this.setupEventListeners();
      } catch (err: any) {
        console.error('[Storage Connection Test Error]:', err);
        this.storageError = err.message || 'Erro de conexão com o Supabase Storage.';
        await showCustomAlert(
          `Falha ao conectar ao Supabase Storage:\n\n` +
          `- Mensagem: ${this.storageError}\n\n` +
          `Dica: Certifique-se de que o bucket 'documentos-clientes' foi criado no painel do Supabase e as políticas RLS foram aplicadas.`,
          'Erro de Armazenamento'
        );
        this.showToast('Falha no teste da conexão de armazenamento.', 'error');
        this.render();
        this.setupEventListeners();
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  /**
   * Eventos da Aba 4: Equipe & Permissões
   */
  private setupConsultoresEvents(): void {
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

    // Permissão do botão "Nova Viagem" para Consultores
    document.getElementById('toggle-permitir-consultor-criar-viagem')?.addEventListener('change', async (e) => {
      const checkbox = e.target as HTMLInputElement;
      const newValue = checkbox.checked;
      if (!this.settings) return;

      this.settings.permitirConsultorCriarViagem = newValue;
      this.settings.permitir_consultor_criar_viagem = newValue;

      try {
        const { error } = await supabase
          .from('global_settings')
          .update({ permitir_consultor_criar_viagem: newValue })
          .eq('id', this.settings.id);

        if (error) throw error;

        this.showToast(
          newValue
            ? 'Criação direta de viagens PERMITIDA para consultores.'
            : 'Criação direta de viagens BLOQUEADA para consultores (botão oculto).',
          'success'
        );
      } catch (err: any) {
        console.error('Erro ao atualizar permissão de criação de viagem:', err);
        this.showToast('Erro ao atualizar permissão.', 'error');
        checkbox.checked = !newValue;
      }
    });
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
          <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">Defina o e-mail, nível de acesso e senha provisória</p>
        </div>

        <form id="form-novo-consultor" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome Completo *</label>
            <input id="input-nc-nome" type="text" required autocomplete="name" placeholder="Nome do Consultor" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail de Acesso *</label>
            ${renderEmailInputHTML('input-nc-email', '', 'email@agencia.com')}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nível de Acesso *</label>
              <select id="select-nc-role" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="consultor" selected class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Consultor</option>
                <option value="admin" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">ADMIN</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Senha Provisória *</label>
              <input id="input-nc-senha" type="password" required autocomplete="new-password" minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-nc-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition uppercase">
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
    setupFormValidation('form-novo-consultor', [
      { id: 'input-nc-email', type: 'email' }
    ]);
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
        // Invoca a RPC administrativa de criação de usuário no Supabase de forma segura
        const { data: userId, error: rpcError } = await supabase.rpc('admin_create_user', {
          user_email: email,
          user_password: senha,
          user_nome: nome,
          user_role: role
        });

        if (rpcError) throw rpcError;

        this.showToast('Novo consultor cadastrado com sucesso!', 'success');
        this.fecharModalNovoConsultor();
        await this.loadConsultores();
        this.render();
        this.setupEventListeners();

      } catch (err: any) {
        console.error('Erro ao cadastrar consultor:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Cadastrar Agente';
        await showCustomAlert(`Falha no Cadastro:\n\n${err.message || 'Erro inesperado na gravação dos dados.'}`, 'Erro de Cadastro');
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
              ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20' 
              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-800'
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
          <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">Atualize informações de cadastro e altere senhas diretamente</p>
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
            <input id="input-ec-email" type="email" disabled autocomplete="username" value="${c.email || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-400 dark:text-slate-400 font-bold text-sm cursor-not-allowed select-none" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nível de Acesso *</label>
              <select id="select-ec-role" ${isSelf ? 'disabled' : ''} class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="consultor" ${c.role === 'consultor' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Consultor</option>
                <option value="admin" ${c.role === 'admin' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">ADMIN</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Status da Conta *</label>
              <select id="select-ec-ativo" ${isSelf ? 'disabled' : ''} class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="true" ${c.ativo ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Ativo</option>
                <option value="false" ${!c.ativo ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Inativo</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <label class="text-xs font-bold text-slate-700 dark:text-slate-200 block">📅 Participa da Escala de Funcionários</label>
              <span class="text-[10px] text-slate-400 block">Exibe o consultor na grade mensal de turnos e no Banco de Folgas.</span>
            </div>
            <input type="checkbox" id="input-ec-participa-escala" ${c.participa_escala !== false ? 'checked' : ''} class="w-4 h-4 accent-indigo-600 rounded cursor-pointer" />
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h3 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">Alterar Senha do Consultor</h3>
            <p class="text-[10px] text-slate-400 dark:text-slate-400 mb-2 font-semibold italic">Nota de desenvolvimento: você pode alterar diretamente a senha do usuário preenchendo o campo abaixo.</p>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Definir Nova Senha (Mínimo 6 dígitos)</label>
              <input id="input-ec-senha" type="password" minlength="6" autocomplete="new-password" placeholder="Insira a nova senha diretamente" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-ec-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold text-xs rounded-xl transition uppercase">
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
      const participaEscalaVal = (overlay.querySelector('#input-ec-participa-escala') as HTMLInputElement).checked;
      const senhaVal = (overlay.querySelector('#input-ec-senha') as HTMLInputElement).value;

      if (!nomeVal) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';

      try {
        const isOffline = supabase.from === undefined || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !import.meta.env.VITE_SUPABASE_URL);

        // Sempre persiste localmente
        salvarAvatarLocal(c.id, selectedAvatarId);

        if (!isOffline) {
          // 1. Atualiza na tabela Profiles do Supabase
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({
              nome: nomeVal,
              role: roleVal,
              ativo: ativoVal,
              participa_escala: participaEscalaVal,
              avatar_url: selectedAvatarId
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
            // Se for outro usuário, e digitou a senha, chamamos a RPC para atualizar a senha no Supabase Auth de forma oficial
            if (senhaVal) {
              const { error: rpcErr } = await supabase.rpc('admin_set_user_password', {
                user_id: c.id,
                new_password: senhaVal
              });
              if (rpcErr) throw rpcErr;
              console.log(`[Admin] Senha de ${c.email} atualizada com sucesso no Supabase Auth via RPC.`);
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
        await showCustomAlert(`Erro ao atualizar consultor:\n\n${err.message || err}`, 'Erro de Atualização');
      }
    });
  }

  /**
  }

  /**
   * Associa os eventos da aba de Importações
   */
  private setupImportacoesEvents(): void {
    const dropzone = document.getElementById('csv-dropzone');
    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;

    const handleFile = (file: File) => {
      if (!file) return;
      if (!file.name.endsWith('.csv')) {
        this.showToast('Por favor, envie apenas arquivos .csv!', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;
        this.processCsvData(text);
      };
      reader.readAsText(file, 'utf-8');
    };

    // Eventos de drag and drop do dropzone
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-indigo-500', 'bg-indigo-50/10', 'dark:bg-indigo-950/20');
    });
    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/10', 'dark:bg-indigo-950/20');
    });
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/10', 'dark:bg-indigo-950/20');
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    });
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) handleFile(file);
    });

    // Ouvintes dos seletores de mapeamento de colunas
    ['nome', 'contato', 'atendente', 'tags', 'notas', 'data_viagem', 'valor_proposta'].forEach(field => {
      const select = document.getElementById(`select-map-${field}`) as HTMLSelectElement;
      select?.addEventListener('change', () => {
        this.columnMapping[field] = select.value;
        if (field === 'atendente') {
          this.extractUniqueAttendants();
          this.render();
          this.setupEventListeners();
        } else {
          this.render();
          this.setupEventListeners();
        }
      });
    });

    // Ouvintes de mapeamento de atendentes únicos para consultores
    this.uniqueAttendants.forEach((att, idx) => {
      const select = document.getElementById(`select-atendente-mapping-${idx}`) as HTMLSelectElement;
      select?.addEventListener('change', () => {
        this.attendantMapping[att] = select.value;
      });
    });

    // Ouvintes de parâmetros gerais
    const inputDestino = document.getElementById('input-default-destino') as HTMLInputElement;
    inputDestino?.addEventListener('input', () => {
      this.defaultDestino = inputDestino.value;
    });

    const selectTemp = document.getElementById('select-default-temp') as HTMLSelectElement;
    selectTemp?.addEventListener('change', () => {
      this.defaultTemperatura = selectTemp.value as 'Frio' | 'Normal' | 'Quente';
    });

    const selectStatus = document.getElementById('select-default-status') as HTMLSelectElement;
    selectStatus?.addEventListener('change', () => {
      this.defaultStatus = selectStatus.value as 'SOLICITADO' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'CONCLUIDO';
    });

    // Botão de confirmação de importação
    const btnConfirmar = document.getElementById('btn-confirmar-importacao');
    btnConfirmar?.addEventListener('click', async () => {
      await this.executeImportFlow();
    });
  }

  /**
   * Processa os dados brutos de texto do CSV carregado
   */
  private processCsvData(text: string): void {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      this.showToast('O arquivo CSV parece estar vazio ou sem linhas de dados.', 'error');
      return;
    }
    this.parsedHeaders = rows[0] || [];
    this.csvRows = rows.slice(1);

    // Auto-detecta mapeamento de colunas principais baseado em nomes
    this.columnMapping = {
      nome: this.parsedHeaders.find(h => /nome/i.test(h)) || this.parsedHeaders[1] || '',
      contato: this.parsedHeaders.find(h => /n[uú]mero/i.test(h) || /contato/i.test(h) || /telefone/i.test(h) || /celular/i.test(h)) || this.parsedHeaders[2] || '',
      atendente: this.parsedHeaders.find(h => /atendente/i.test(h) || /operador/i.test(h) || /consultor/i.test(h)) || this.parsedHeaders[3] || '',
      tags: this.parsedHeaders.find(h => /tags/i.test(h) || /tag/i.test(h)) || this.parsedHeaders[4] || '',
      notas: this.parsedHeaders.find(h => /resumo/i.test(h) || /protocolo/i.test(h) || /assunto/i.test(h)) || this.parsedHeaders[0] || '',
      data_viagem: this.parsedHeaders.find(h => /data.*in[ií]cio/i.test(h) || /data.*viagem/i.test(h)) || '',
      valor_proposta: this.parsedHeaders.find(h => /valor/i.test(h) || /proposta/i.test(h) || /pre[cç]o/i.test(h)) || ''
    };

    this.extractUniqueAttendants();
    this.render();
    this.setupEventListeners();
    this.showToast('Arquivo CSV carregado e analisado com sucesso!', 'success');
  }

  /**
   * Extrai os atendentes únicos com base na coluna de atendente selecionada
   */
  private extractUniqueAttendants(): void {
    const attendantCol = this.columnMapping['atendente'];
    const attendantColIndex = this.parsedHeaders.indexOf(attendantCol);
    const uniqueVals = new Set<string>();
    
    if (attendantColIndex !== -1) {
      this.csvRows.forEach(row => {
        const val = row[attendantColIndex] ? row[attendantColIndex].trim() : '';
        uniqueVals.add(val || '(Sem Atendente)');
      });
    } else {
      uniqueVals.add('(Sem Atendente)');
    }
    this.uniqueAttendants = Array.from(uniqueVals);

    // Mapeia automaticamente por correspondência inteligente (fuzzy match)
    this.attendantMapping = {};
    this.uniqueAttendants.forEach(att => {
      if (att === '(Sem Atendente)' || !att) {
        this.attendantMapping[att] = '';
        return;
      }

      const normalizedAtt = att.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const match = this.consultores.find(c => {
        const normalizedConsultant = c.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalizedConsultant.includes(normalizedAtt) || normalizedAtt.includes(normalizedConsultant);
      });

      if (match) {
        this.attendantMapping[att] = match.id;
      } else {
        this.attendantMapping[att] = '';
      }
    });
  }

  /**
   * Executa a gravação do lote de orçamentos mapeados no banco de dados ou local
   */
  private async executeImportFlow(): Promise<void> {
    if (this.isImporting) return;
    this.isImporting = true;
    this.render();

    try {
      const nomeIndex = this.parsedHeaders.indexOf(this.columnMapping['nome']);
      const contatoIndex = this.parsedHeaders.indexOf(this.columnMapping['contato']);
      const atendenteIndex = this.parsedHeaders.indexOf(this.columnMapping['atendente']);
      const tagsIndex = this.parsedHeaders.indexOf(this.columnMapping['tags']);
      const notasIndex = this.parsedHeaders.indexOf(this.columnMapping['notas']);
      const dataViagemIndex = this.parsedHeaders.indexOf(this.columnMapping['data_viagem']);
      const valorPropostaIndex = this.parsedHeaders.indexOf(this.columnMapping['valor_proposta']);

      const payloads = this.csvRows.map(row => {
        const rawAtendente = atendenteIndex !== -1 ? (row[atendenteIndex] || '').trim() : '';
        const lookupKey = rawAtendente || '(Sem Atendente)';
        const consultorId = this.attendantMapping[lookupKey] || this.user.id;

        const nomeCliente = (nomeIndex !== -1 ? row[nomeIndex] : '') || 'Cliente Importado';
        const contato = contatoIndex !== -1 ? row[contatoIndex] : '';
        const rawTags = tagsIndex !== -1 ? row[tagsIndex] : '';
        const tags = rawTags 
          ? rawTags.split(/[;,|]+/).map(t => t.trim()).filter(Boolean) 
          : [];

        const rawNotas = notasIndex !== -1 ? row[notasIndex] : '';
        const notasNegociacao = rawNotas 
          ? `${rawNotas}\n\n(Chamado importado do DIGISAC)` 
          : 'Chamado importado do DIGISAC';

        const rawDataViagem = dataViagemIndex !== -1 ? (row[dataViagemIndex] || '').trim() : '';
        const data_viagem = rawDataViagem ? formatBrDateToYmd(rawDataViagem) : null;

        const rawValorProposta = valorPropostaIndex !== -1 ? (row[valorPropostaIndex] || '').trim() : '';
        const valor_proposta = rawValorProposta ? parseBrFloat(rawValorProposta) : null;

        return {
          consultor_id: consultorId,
          nome_cliente: nomeCliente,
          contato,
          destino: this.defaultDestino || 'Importação DIGISAC',
          temperatura: this.defaultTemperatura,
          status: this.defaultStatus,
          tags,
          notas_negociacao: notasNegociacao,
          data_viagem,
          valor_proposta,
          documentos_url: []
        };
      });

      const isOffline = supabase.from === undefined || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !import.meta.env.VITE_SUPABASE_URL);

      const result = await batchInsertOrcamentos(payloads, this.user.id, isOffline);
      if (result.success) {
        await showCustomAlert(`Sucesso total!\n\nForam importados ${result.count} novos orçamentos (leads) na coluna 'Solicitado' com atribuição inteligente de consultores.`, 'Importação Concluída');
        // Reseta o estado do componente
        this.parsedHeaders = [];
        this.csvRows = [];
        this.uniqueAttendants = [];
        this.columnMapping = {};
        this.attendantMapping = {};
      } else {
        throw result.error;
      }
    } catch (err: any) {
      console.error('Erro na importação de CSV:', err);
      await showCustomAlert(`Ocorreu um erro durante a importação em lote:\n\n${err.message || err}`, 'Erro de Importação');
    } finally {
      this.isImporting = false;
      this.render();
      this.setupEventListeners();
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
  private showToast(message: string, type: 'success' | 'error' = 'success', err?: any): void {
    let finalMessage = message;
    if (err) {
      const translator = (window as any).traduzirErro;
      const translated = translator ? translator(err) : (err.message || err);
      if (translated && !message.includes(translated)) {
        finalMessage = `${message} Detalhes: ${translated}`;
      }
    }
    const translatedMessage = (window as any).traduzirErro ? (window as any).traduzirErro(finalMessage) : finalMessage;
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

    const duration = isSuccess ? 3500 : 5500;
    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      }
    }, duration);
  }

  /**
   * Renderiza a página administrativa no formato Master-Detail (Sidebar Vertical + Conteúdo por Categoria)
   */
  private render(): void {
    if (!this.settings) return;

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-auto object-contain animate-fade-in md:hidden" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Configurações da Agência</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <span>Painel de Controle Central</span> &bull; 
                <span class="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[10px]">Administrador</span>
              </p>
            </div>
          </div>
        </header>

        <div class="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-6 gap-6 items-start">
          <aside class="w-full md:w-64 lg:w-72 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-sm shrink-0">
            <div class="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Categorias de Configuração</div>
            <nav class="space-y-1.5 mt-1">
              ${['branding', 'automacoes', 'integracoes', 'consultores', 'importacoes'].map(tab => {
                const labels = { branding: 'Identidade & Marca', automacoes: 'SLAs & Prazos', integracoes: 'Integrações', consultores: 'Equipe & Permissões', importacoes: 'Importações & CSV' };
                const sub = { branding: 'Logo, cor e senhas', automacoes: 'Vistos, churn e risco', integracoes: 'DigiSac e Storage', consultores: 'Cargos e acesso', importacoes: 'Carga em lote de dados' };
                const icons = { branding: '🎨', automacoes: '⏰', integracoes: '🔌', consultores: '👥', importacoes: '🛠️' };
                const isActive = this.activeTab === tab;
                return `
                  <button id="tab-${tab}-btn" class="w-full text-left p-3 rounded-xl transition flex items-start gap-3 select-none ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold border border-indigo-200/70 dark:border-indigo-800/70 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold'}">
                    <span class="text-xl shrink-0">${icons[tab as keyof typeof icons]}</span>
                    <div class="min-w-0">
                      <strong class="block text-xs leading-none">${labels[tab as keyof typeof labels]}</strong>
                      <span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal block mt-1">${sub[tab as keyof typeof sub]}</span>
                    </div>
                  </button>
                `;
              }).join('')}
            </nav>
          </aside>
          <main class="flex-1 w-full min-w-0 animate-fade-in">
            ${this.renderActiveTabContent()}
          </main>
        </div>
      </div>
    `;
  }

  private renderActiveTabContent(): string {
    switch (this.activeTab) {
      case 'branding': return this.renderTabBranding();
      case 'automacoes': return this.renderTabAutomacoes();
      case 'integracoes': return this.renderTabIntegracoes();
      case 'consultores': return this.renderTabConsultores();
      case 'importacoes': return this.renderTabImportacoes();
      default: return this.renderTabBranding();
    }
  }

  /**
   * Renderiza a Aba 1: Identidade & Marca
   */
  private renderTabBranding(): string {
    if (!this.settings) return '';

    return `
      <div class="space-y-6 animate-fade-in">
        
        <!-- Card Marca & Logotipo -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 class="text-base font-black text-slate-800 dark:text-slate-200 tracking-tight border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-5 flex items-center gap-2">
            <span>🎨</span> Identidade Visual & Branding White-Label
          </h2>

          <form id="form-config-branding" class="space-y-6">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  Nome da Agência de Viagens * ${renderHelpIcon('customizacao-logo-branding')}
                </label>
                <input id="input-agency-name" type="text" required value="${this.settings.agencyName}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold" />
                <p class="text-[10px] text-slate-400 mt-1">Exibido no topo do sistema, PDFs e itinerários públicos dos clientes.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  E-mail de Suporte e Alertas * ${renderHelpIcon('seguranca-privacidade-lgpd')}
                </label>
                ${renderEmailInputHTML('input-email-suporte', this.settings.emailSuporte || '', 'email@agencia.com')}
                <p class="text-[10px] text-slate-400 mt-1">Remetente oficial das notificações da agência.</p>
              </div>
            </div>

            <!-- Upload de Logotipo -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                Logotipo da Agência (White-Label) ${renderHelpIcon('customizacao-logo-branding')}
              </label>
              
              <div class="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <div class="w-20 h-20 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                  <img id="img-agency-logo-preview" src="${this.settings.agencyLogoUrl || '/logo.svg'}" alt="Preview Logo" class="max-w-full max-h-full object-contain" />
                  <div id="logo-upload-spinner" class="absolute inset-0 bg-slate-900/60 flex items-center justify-center hidden">
                    <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>

                <div class="flex-1 space-y-2 text-center sm:text-left">
                  <input id="input-agency-logo-url" type="hidden" value="${this.settings.agencyLogoUrl || ''}" />
                  <input id="input-agency-logo-file" type="file" accept="image/*" class="hidden" />
                  <label for="input-agency-logo-file" class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm">
                    📁 Selecionar Arquivo de Imagem
                  </label>
                  <p class="text-[10px] text-slate-400 font-medium">Recomendado: PNG ou JPG com fundo transparente (compressão automática).</p>
                </div>
              </div>
            </div>

            <!-- Seletor de Cor Primária White-Label -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Cor Primária de Destaque (White-Label)
              </label>

              <div class="flex items-center gap-4">
                <div class="flex items-center gap-3 p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <input id="input-agency-primary-color" type="color" value="${this.settings.agencyPrimaryColor || '#4f46e5'}" class="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                  <span class="text-xs font-black text-slate-800 dark:text-slate-200 tracking-wider">${(this.settings.agencyPrimaryColor || '#4f46e5').toUpperCase()}</span>
                </div>

                <div class="flex items-center gap-2 px-3 py-2 rounded-xl text-white font-extrabold text-xs shadow-md transition" id="brand-color-preview-badge" style="background-color: ${this.settings.agencyPrimaryColor || '#4f46e5'};">
                  <span>Pré-visualização do Botão</span>
                </div>
              </div>
            </div>

            <!-- Outras preferências de marca -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-5">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center">
                  Taxa de Cancelamento Retida (%) ${renderHelpIcon('taxas-multas-cancelamento')}
                </label>
                <input id="input-taxa" type="number" step="0.01" min="0" max="100" value="${this.settings.taxaCancelamentoPadrao}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                <p class="text-[10px] text-slate-400 mt-1">Taxa retida padrão sugerida nos cálculos de reembolso.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Limite de Upload por Arquivo (MB)</label>
                <input id="input-limite-upload" type="number" min="1" max="500" value="${this.settings.limiteUploadMb || 25}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                <p class="text-[10px] text-slate-400 mt-1">Tamanho máximo permitido para anexos de clientes.</p>
              </div>
            </div>

            <!-- Assistente Co-piloto toggle -->
            <div class="flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl border-t">
              <div class="flex flex-col gap-1 pr-4">
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  🤖 Assistente Co-Piloto de IA ${renderHelpIcon('copiloto-ativacao-desativacao')}
                </span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Habilita alertas em tempo real de atendimento presencial de balcão e assistente inteligente.
                </span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input id="input-copiloto-ativo" type="checkbox" ${this.settings.copilotoAtivo !== false ? 'checked' : ''} class="sr-only peer">
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div class="pt-3 flex justify-end">
              <button type="submit" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 transition transform hover:-translate-y-0.5">
                💾 Salvar Identidade & Marca
              </button>
            </div>

          </form>
        </div>

        <!-- Card Segurança & Minha Conta -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 class="text-base font-black text-slate-800 dark:text-slate-200 tracking-tight border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-5 flex items-center gap-2">
            <span>🔑</span> Segurança & Alteração de Senha
          </h2>

          <form id="form-senha-admin" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nova Senha de Acesso *</label>
                <input id="input-nova-senha" type="password" minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Confirmar Nova Senha *</label>
                <input id="input-confirmar-senha" type="password" minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold" />
              </div>
            </div>

            <div class="pt-2 flex justify-end">
              <button type="submit" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition">
                🔒 Atualizar Minha Senha
              </button>
            </div>
          </form>
        </div>

      </div>
    `;
  }

  /**
   * Renderiza a Aba 2: SLAs, Prazos & Algoritmo Preditivo
   */
  private renderTabAutomacoes(): string {
    if (!this.settings) return '';

    return `
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start animate-fade-in">
        
        <div class="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 class="text-base font-black text-slate-800 dark:text-slate-200 tracking-tight border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-5 flex items-center gap-2">
            <span>⏰</span> Parâmetros de SLAs & Prazos Automáticos
          </h2>

          <form id="form-automacoes" class="space-y-6">
            
            <!-- Passaporte SLA Badge -->
            <div class="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl flex items-start gap-3">
              <span class="text-xl shrink-0">🛂</span>
              <div>
                <strong class="block text-xs font-black text-amber-800 dark:text-amber-300">SLA de Passaporte & Vistos (Fixado em 180 Dias) ${renderHelpIcon('alerta-passaporte-validade')}</strong>
                <p class="text-[11px] text-amber-700/90 dark:text-amber-400 mt-1 leading-relaxed">
                  O PaxFlow monitora automaticamente a expiração de passaportes e vistos dos clientes, gerando alertas no Inbox com 180 dias de antecedência para viagens internacionais.
                </p>
              </div>
            </div>

            <!-- Viagens Kanban SLAs -->
            <div>
              <h3 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">SLAs de Kanban & Viagens</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Alerta Pré-Embarque (Dias antes) *</label>
                  <input id="input-sla-pre" type="number" min="1" required value="${this.settings.slaPreEmbarqueDias}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                  <p class="text-[10px] text-slate-400 mt-1">Sinaliza alerta de prioridade em viagens a menos de X dias do embarque.</p>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Alerta Pós-Viagem (Dias depois) *</label>
                  <input id="input-sla-pos" type="number" min="1" required value="${this.settings.slaPosViagemDias}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                  <p class="text-[10px] text-slate-400 mt-1">Alerta a equipe caso a finalização do pós-venda passe de X dias.</p>
                </div>
              </div>
            </div>

            <!-- Orçamentos e Churn -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h3 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Funil de Orçamentos & Churn de Leads</h3>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Inatividade para Desistência de Orçamento (Dias) *</label>
                <input id="input-tempo-desistencia" type="number" min="1" max="365" required value="${this.settings.tempoDesistenciaOrcamentoDias || 30}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                <p class="text-[10px] text-slate-400 mt-1">Orçamentos parados sem atualização por mais de X dias serão marcados como Desistência.</p>
              </div>
            </div>

            <!-- Algoritmo Preditivo de Risco Operacional & PaxFlow Risk Score™ -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛡️</span> PaxFlow Risk Score™ & Algoritmo Preditivo ${renderHelpIcon('painel-preditivo-risco')}
                  </h3>
                  <p class="text-[10px] text-slate-400 mt-0.5">Auditoria automática de saúde de viagens (0 a 100) e ações de resolução em 1-clique.</p>
                </div>
                
                <label class="relative inline-flex items-center cursor-pointer shrink-0">
                  <input id="input-habilitar-risk-score" type="checkbox" ${this.settings.habilitar_risk_score !== false ? 'checked' : ''} class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-rose-600"></div>
                </label>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Janela de Carência Operacional (Dias antes do embarque) *</label>
                  <input id="input-risk-score-carencia-dias" type="number" min="15" max="180" required value="${this.settings.risk_score_janela_carencia_dias || 60}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                  <p class="text-[10px] text-slate-400 mt-1">Viagens com embarque a mais de X dias mantêm nota 100 (evita falsos positivos em vendas antecipadas).</p>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nota Limite para Alerta Crítico (Nível Vermelho) *</label>
                  <input id="input-risk-score-limite-critico" type="number" min="10" max="80" required value="${this.settings.risk_score_limite_critico || 50}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                  <p class="text-[10px] text-slate-400 mt-1">Pontuações abaixo deste patamar disparam alerta de perigo e notificação de gerência.</p>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Antecedência Padrão de Auditoria de Embarque (Dias) *</label>
                <input id="input-antecedencia-risco" type="number" min="1" max="90" required value="${this.settings.antecedencia_risco_operacional_dias || this.settings.antecedenciaRiscoOperacionalDias || 15}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
              </div>
            </div>

            <!-- Reembolsos & NPS -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h3 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Reembolsos & Pesquisas NPS</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Prazo Padrão de Reembolso (Dias) *</label>
                  <input id="input-prazo-reembolso" type="number" min="1" max="180" required value="${this.settings.prazoReembolsoDias || 30}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold" />
                  <p class="text-[10px] text-slate-400 mt-1">Prazo limite sugerido aos clientes para desfecho financeiro.</p>
                </div>

                <div class="flex flex-col justify-between p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <div class="space-y-0.5">
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">Disparo Automático de NPS</label>
                    <p class="text-[10px] text-slate-400">Envia pesquisa de satisfação no término da viagem.</p>
                  </div>
                  <div class="mt-2">
                    <input id="input-enviar-nps" type="checkbox" ${this.settings.enviarNpsAutomatico ? 'checked' : ''} class="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 rounded cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-3 flex justify-end">
              <button type="submit" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 transition transform hover:-translate-y-0.5">
                💾 Salvar SLAs & Automações
              </button>
            </div>

          </form>
        </div>

        <div class="md:col-span-4 space-y-4">
          <div class="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5">
            <h3 class="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-2">💡 Funcionamento Autônomo</h3>
            <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              O PaxFlow executa checagens periódicas 24/7 com base nestes prazos para manter os Kanban, alertas e relatórios gerenciais sempre sincronizados.
            </p>
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Renderiza a Aba 3: Integrações & Comunicação
   */
  private renderTabIntegracoes(): string {
    if (!this.settings) return '';

    return `
      <div class="space-y-6 animate-fade-in">
        
        <!-- Card DigiSac API -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-5">
            <h2 class="text-base font-black text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
              <span>💬</span> Integração WhatsApp / DigiSac API ${renderHelpIcon('historico-conversas-digisac')}
            </h2>
            <div id="digisac-status-badge" class="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Não Verificado
            </div>
          </div>

          <form id="form-config-integracoes" class="space-y-6">
            
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">URL da Instância / Domínio *</label>
              <input id="input-digisac-domain" type="url" placeholder="Ex: https://minhaagencia.digisac.chat" value="${this.settings.digisacDomain || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
              <p class="text-[9px] text-slate-400 mt-1">Endereço do seu ambiente DigiSac.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">ID da Conexão (serviceId) *</label>
                <input id="input-digisac-service-id" type="text" placeholder="Ex: 5ac6..." value="${this.settings.digisacServiceId || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
                <p class="text-[9px] text-slate-400 mt-1">ID do canal WhatsApp no Digisac.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Token de Acesso Pessoal (API) *</label>
                <input id="input-digisac-token" type="password" placeholder="••••••••••••••••" value="${this.settings.digisacToken || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" />
                <p class="text-[9px] text-slate-400 mt-1">Token gerado em Menu > Conta > API.</p>
              </div>
            </div>

            <div class="flex items-center gap-3 pt-1">
              <button id="btn-testar-digisac" type="button" class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                ⚡ Testar Conexão DigiSac
              </button>
              <span id="digisac-test-result" class="text-[10px] font-bold text-slate-500 dark:text-slate-400"></span>
            </div>

            <!-- Toggles DigiSac -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Recursos Habilitados (DigiSac)</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div class="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 rounded-xl">
                  <div class="pr-2">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">Envio Manual de Mensagens</span>
                    <span class="text-[10px] text-slate-400">Permite envio manual de mensagens no chat.</span>
                  </div>
                  <input id="input-digisac-enable-manual-send" type="checkbox" ${this.settings.digisac_enable_manual_send !== false ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer shrink-0" />
                </div>

                <div class="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 rounded-xl">
                  <div class="pr-2">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">Sincronização de Histórico</span>
                    <span class="text-[10px] text-slate-400">Exibe histórico das conversas no Inbox.</span>
                  </div>
                  <input id="input-digisac-enable-chat-history" type="checkbox" ${this.settings.digisac_enable_chat_history !== false ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer shrink-0" />
                </div>

                <div class="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 rounded-xl">
                  <div class="pr-2">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">Envio de Vouchers</span>
                    <span class="text-[10px] text-slate-400">Anexa vouchers em formato PDF diretamente no chat.</span>
                  </div>
                  <input id="input-digisac-enable-vouchers" type="checkbox" ${this.settings.digisac_enable_vouchers !== false ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer shrink-0" />
                </div>

                <div class="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 rounded-xl">
                  <div class="pr-2">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">Roteamento Inteligente</span>
                    <span class="text-[10px] text-slate-400">Encaminha mensagens para o consultor titular.</span>
                  </div>
                  <input id="input-digisac-enable-routing" type="checkbox" ${this.settings.digisac_enable_routing !== false ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer shrink-0" />
                </div>

                <div class="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 rounded-xl">
                  <div class="pr-2">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">Gatilhos de Bot</span>
                    <span class="text-[10px] text-slate-400">Dispara bots do DigiSac via automações.</span>
                  </div>
                  <input id="input-digisac-enable-bot-triggers" type="checkbox" ${this.settings.digisac_enable_bot_triggers !== false ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer shrink-0" />
                </div>

                <div class="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 rounded-xl">
                  <div class="pr-2">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">Webhooks de Eventos</span>
                    <span class="text-[10px] text-slate-400">Recebe notificações de status em tempo real.</span>
                  </div>
                  <input id="input-digisac-enable-webhooks" type="checkbox" ${this.settings.digisac_enable_webhooks !== false ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer shrink-0" />
                </div>

              </div>
            </div>

            <div class="pt-3 flex justify-end">
              <button type="submit" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 transition transform hover:-translate-y-0.5">
                💾 Salvar Integração DigiSac
              </button>
            </div>

          </form>
        </div>

        <!-- Card Storage / Google Drive -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 class="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
              <span>📁</span> Armazenamento Seguro de Documentos (Storage) ${renderHelpIcon('upload-google-drive')}
            </h3>
            <span class="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${this.storageError ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200'}">
              ${this.storageError ? 'Erro de Conexão' : 'Ativo & Protegido'}
            </span>
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Os arquivos e passaportes dos clientes são mantidos em bucket privado com criptografia de ponta a ponta e links de acesso temporário com expiração.
          </p>

          <div class="flex items-center justify-between pt-2">
            <button id="btn-test-drive-connection" type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition shadow-sm">
              🧪 Testar Conexão do Storage
            </button>
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Renderiza a Aba 4: Equipe & Permissões
   */
  private renderTabConsultores(): string {
    return `
      <div class="space-y-6 animate-fade-in">
        
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight">Equipe de Consultores</h2>
            <p class="text-xs text-slate-400 font-medium">Controle de acessos, status e papéis de permissão (RBAC)</p>
          </div>
          <button id="btn-novo-consultor" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase">
            <span>+</span> Novo Consultor
          </button>
        </div>

        <!-- Tabela de Consultores -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-800/60 text-[10px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th class="py-4 px-5">Consultor</th>
                  <th class="py-4 px-5">E-mail</th>
                  <th class="py-4 px-5 text-center">Cargo</th>
                  <th class="py-4 px-5 text-center">Status</th>
                  <th class="py-4 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300 font-semibold">
                ${this.consultores.map(c => {
                  const isSelf = c.id === this.user?.id;
                  const statusBadge = c.ativo 
                    ? `<span class="inline-flex px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 text-[10px] font-bold rounded">Ativo</span>` 
                    : `<span class="inline-flex px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800 text-[10px] font-bold rounded">Inativo</span>`;
                  const roleBadge = c.role === 'admin'
                    ? `<span class="inline-flex px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/45 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 text-[10px] font-bold rounded">ADMIN</span>`
                    : `<span class="inline-flex px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 text-[10px] font-bold rounded">Consultor</span>`;
                  
                  return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td class="py-4 px-5 flex items-center gap-3">
                        ${getAvatarSvg(c.avatar_url, c.nome || 'C', 'w-8 h-8')}
                        <div>
                          <span class="block text-slate-800 dark:text-slate-200 font-bold">${c.nome}</span>
                          ${isSelf ? '<span class="inline-block text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">Você</span>' : ''}
                        </div>
                      </td>
                      
                      <td class="py-4 px-5 text-slate-500 dark:text-slate-400 font-medium">
                        ${c.email}
                      </td>
                      
                      <td class="py-4 px-5 text-center">
                        ${roleBadge}
                      </td>
                      
                      <td class="py-4 px-5 text-center">
                        ${statusBadge}
                      </td>
                      
                      <td class="py-4 px-5 text-right space-x-1.5">
                        <button data-id="${c.id}" class="btn-editar-user px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold transition uppercase">
                          Editar ✏️
                        </button>
                        
                        ${isSelf ? `
                          <span class="text-xs text-slate-400 font-semibold italic ml-2">Você</span>
                        ` : `
                          <select data-id="${c.id}" class="select-role-user px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            <option value="consultor" ${c.role === 'consultor' ? 'selected' : ''}>Tornar Consultor</option>
                            <option value="admin" ${c.role === 'admin' ? 'selected' : ''}>Tornar ADMIN</option>
                          </select>
                          
                          <button data-id="${c.id}" data-active="${c.ativo}" class="btn-toggle-status-user px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            c.ativo 
                              ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' 
                              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
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

        <!-- Card Permissões Especiais -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
                🔒 Regras de Permissão de Operação
              </h3>
              <p class="text-xs text-slate-400 font-medium">Restrições de criação e edição de viagens para consultores</p>
            </div>
          </div>

          <div class="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-800">
            <div class="space-y-0.5 pr-4">
              <label for="toggle-permitir-consultor-criar-viagem" class="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                Permitir botão "Nova Viagem" para Consultores
              </label>
              <p class="text-[11px] text-slate-400 font-medium leading-relaxed">
                Quando desativado, consultores só criam vendas convertendo orçamentos aprovados.
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" id="toggle-permitir-consultor-criar-viagem" ${this.settings?.permitirConsultorCriarViagem ? 'checked' : ''} class="sr-only peer" />
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

      </div>
    `;
  }

  /**
   * Renderiza a Aba 5: Importações & CSV
   */
  private renderTabImportacoes(): string {
    return `
      <div class="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
        ${this.isImporting ? `
          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xl flex flex-col items-center justify-center gap-4">
            <div class="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <h3 class="text-lg font-black text-slate-800 dark:text-slate-100">Processando Carga de Dados...</h3>
            <p class="text-xs text-slate-400">Por favor, aguarde enquanto inserimos os registros em lote no PaxFlow.</p>
          </div>
        ` : this.csvRows.length === 0 ? `
          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 shadow-sm text-center space-y-6">
            <div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-indigo-100 dark:border-indigo-900">
              🛠️
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-800 dark:text-slate-100">Importação em Lote de Chamados DigiSac (CSV)</h2>
              <p class="text-xs text-slate-400 font-medium max-w-md mx-auto mt-1 leading-relaxed">
                Carregue relatórios de exportação de atendimentos do DigiSac para gerar orçamentos e sincronizar histórico de vendas automaticamente.
              </p>
            </div>

            <div id="csv-dropzone" class="max-w-md mx-auto p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 transition text-center cursor-pointer">
              <input id="input-csv-file" type="file" accept=".csv" class="hidden" />
              <input id="csv-file-input" type="file" accept=".csv" class="hidden" />
              <label for="input-csv-file" class="cursor-pointer block space-y-2">
                <span class="block text-3xl">📄</span>
                <span class="block text-xs font-bold text-indigo-600 dark:text-indigo-400">Clique ou arraste o arquivo CSV aqui</span>
                <span class="block text-[10px] text-slate-400 font-medium">Delimitado por vírgula (,) ou ponto e vírgula (;)</span>
              </label>
            </div>
          </div>
        ` : `
          <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 class="text-base font-black text-slate-800 dark:text-slate-100">Mapeamento de Colunas (${this.csvRows.length} Registros Detectados)</h3>
                <p class="text-xs text-slate-400 font-medium">Associe os campos do seu CSV aos dados do PaxFlow</p>
              </div>
              <button id="btn-cancelar-importacao" class="px-4 py-2 border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition uppercase">
                Cancelar
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${[
                { key: 'nome', label: 'Nome do Cliente *' },
                { key: 'contato', label: 'Contato/Telefone *' },
                { key: 'atendente', label: 'Atendente/Operador' },
                { key: 'tags', label: 'Tags do Chamado' },
                { key: 'notas', label: 'Notas e Protocolo' },
                { key: 'data_viagem', label: 'Data da Viagem' },
                { key: 'valor_proposta', label: 'Valor da Proposta' }
              ].map(field => {
                const selectedVal = this.columnMapping[field.key] || '';
                return `
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">${field.label}</label>
                    <select data-key="${field.key}" class="select-mapping-column w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <option value="">-- Não Mapear --</option>
                      ${this.parsedHeaders.map(h => `<option value="${h}" ${selectedVal === h ? 'selected' : ''}>${h}</option>`).join('')}
                    </select>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Parâmetros Padrão -->
            <div class="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Destino Padrão</label>
                <input id="input-default-destino" type="text" value="${this.defaultDestino}" class="w-full px-3 py-2 border rounded-lg text-xs font-semibold" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Temperatura Padrão</label>
                <select id="select-default-temp" class="w-full px-3 py-2 border rounded-lg text-xs font-semibold">
                  <option value="Quente" ${this.defaultTemperatura === 'Quente' ? 'selected' : ''}>Quente 🔥</option>
                  <option value="Normal" ${this.defaultTemperatura === 'Normal' ? 'selected' : ''}>Normal 🟡</option>
                  <option value="Frio" ${this.defaultTemperatura === 'Frio' ? 'selected' : ''}>Frio ❄️</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Status Inicial</label>
                <select id="select-default-status" class="w-full px-3 py-2 border rounded-lg text-xs font-semibold">
                  <option value="SOLICITADO" ${this.defaultStatus === 'SOLICITADO' ? 'selected' : ''}>Solicitado</option>
                  <option value="EM_ANDAMENTO" ${this.defaultStatus === 'EM_ANDAMENTO' ? 'selected' : ''}>Em Andamento</option>
                  <option value="AGUARDANDO" ${this.defaultStatus === 'AGUARDANDO' ? 'selected' : ''}>Aguardando</option>
                  <option value="CONCLUIDO" ${this.defaultStatus === 'CONCLUIDO' ? 'selected' : ''}>Concluído</option>
                </select>
              </div>
            </div>

            <!-- De-Para Atendentes -->
            ${this.uniqueAttendants.length > 0 ? `
              <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <h4 class="text-xs font-black text-slate-500 uppercase tracking-wide">Mapeamento de Atendentes</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  ${this.uniqueAttendants.map(att => {
                    const assignedId = this.attendantMapping[att] || '';
                    return `
                      <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700">
                        <span class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 truncate">DIGISAC: ${att}</span>
                        <select data-attendant="${att}" class="select-mapping-attendant w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold">
                          <option value="">-- Atribuir a Mim --</option>
                          ${this.consultores.map(c => `<option value="${c.id}" ${assignedId === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
                        </select>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <div class="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button id="btn-confirmar-importacao" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition">
                🚀 Confirmar Importação (${this.csvRows.length} Registros)
              </button>
            </div>
          </div>
        `}
      </div>
    `;
  }

  private setupAutomacoesEvents(): void {
    const form = document.getElementById('form-automacoes') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!this.settings) return;

      const tempoDesistenciaInput = document.getElementById('input-tempo-desistencia') as HTMLInputElement;
      const slaPreInput = document.getElementById('input-sla-pre') as HTMLInputElement;
      const slaPosInput = document.getElementById('input-sla-pos') as HTMLInputElement;
      const enviarNpsInput = document.getElementById('input-enviar-nps') as HTMLInputElement;
      const prazoReembolsoInput = document.getElementById('input-prazo-reembolso') as HTMLInputElement;
      const antecedenciaRiscoInput = document.getElementById('input-antecedencia-risco') as HTMLInputElement;
      const habilitarRiskScoreInput = document.getElementById('input-habilitar-risk-score') as HTMLInputElement;
      const carenciaRiskScoreInput = document.getElementById('input-risk-score-carencia-dias') as HTMLInputElement;
      const limiteCriticoRiskScoreInput = document.getElementById('input-risk-score-limite-critico') as HTMLInputElement;

      const tempoDesistenciaVal = tempoDesistenciaInput ? Number(tempoDesistenciaInput.value) : this.settings.tempoDesistenciaOrcamentoDias;
      const slaPreVal = slaPreInput ? Number(slaPreInput.value) : this.settings.slaPreEmbarqueDias;
      const slaPosVal = slaPosInput ? Number(slaPosInput.value) : this.settings.slaPosViagemDias;
      const enviarNpsVal = enviarNpsInput ? enviarNpsInput.checked : this.settings.enviarNpsAutomatico;
      const prazoReembolsoVal = prazoReembolsoInput ? Number(prazoReembolsoInput.value) : this.settings.prazoReembolsoDias;
      const antecedenciaRiscoVal = antecedenciaRiscoInput ? Number(antecedenciaRiscoInput.value) : (this.settings.antecedencia_risco_operacional_dias || 15);
      const habilitarRiskScoreVal = habilitarRiskScoreInput ? habilitarRiskScoreInput.checked : (this.settings.habilitar_risk_score !== false);
      const carenciaRiskScoreVal = carenciaRiskScoreInput ? Number(carenciaRiskScoreInput.value) : (this.settings.risk_score_janela_carencia_dias || 60);
      const limiteCriticoRiskScoreVal = limiteCriticoRiskScoreInput ? Number(limiteCriticoRiskScoreInput.value) : (this.settings.risk_score_limite_critico || 50);

      const payload = {
        tempo_desistencia_orcamento_dias: tempoDesistenciaVal,
        sla_pre_embarque_dias: slaPreVal,
        sla_pos_viagem_dias: slaPosVal,
        enviar_nps_automatico: enviarNpsVal,
        prazo_reembolso_dias: prazoReembolsoVal,
        antecedencia_risco_operacional_dias: antecedenciaRiscoVal,
        habilitar_risk_score: habilitarRiskScoreVal,
        risk_score_janela_carencia_dias: carenciaRiskScoreVal,
        risk_score_limite_critico: limiteCriticoRiskScoreVal
      };

      try {
        const { error } = await supabase
          .from('global_settings')
          .update(payload)
          .eq('id', this.settings.id);

        if (error) throw error;

        this.showToast('Automações salvas com sucesso!', 'success');
        await this.loadSettings();
        this.render();
        this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro ao salvar automações:', err);
        this.showToast('Falha ao salvar as configurações de automações.', 'error');
      }
    });
  }
}

export default ConfiguracoesPage;
