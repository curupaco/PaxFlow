import { supabase, getSessaoAtual } from '../services/supabase';
import { uploadDocumentoCliente } from '../services/googleDrive';
import { getAvatarSvg } from '../services/avatars';
import { Cliente, PerfilConsultor } from '../types';
import { showCustomConfirm } from '../services/dialog';
import { registrarXp } from '../services/gamification';
import {
  renderPhoneInputHTML,
  renderEmailInputHTML,
  renderDateInputHTML,
  renderDocumentInputHTML,
  setupFormValidation,
  getFormattedPhoneToDb,
  formatBrDateToIso
} from '../utils/masks';
import './Clientes.css';

export class ClientesPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private clientes: Cliente[] = [];
  private clienteSelecionado: Cliente | null = null;
  private carregandoUpload: boolean = false;
  private buscaTermo: string = '';


  // Variáveis para paginação infinita
  private paginaAtual: number = 0;
  private limitePagina: number = 30;
  private hasMore: boolean = true;
  private carregandoMais: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa a página de clientes: valida autenticação, busca clientes e renderiza a tela.
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



      // 2. Buscar clientes cadastrados
      await this.loadClientes();

      // 3. Renderizar interface
      this.render();

      // 4. Configurar ouvintes de eventos da página principal
      this.setupGlobalEventListeners();

    } catch (err: any) {
      console.error('Erro ao carregar ClientesPage:', err);
      this.renderAuthError(`Erro interno: ${err.message}`);
    }
  }

  /**
   * Limpa ouvintes de eventos globais ao desmontar a página
   */
  public destroy(): void {
  }

  /**
   * Busca os clientes no Supabase com paginação infinita e busca no servidor
   */
  private async loadClientes(isIncremental: boolean = false): Promise<void> {
    if (this.carregandoMais) return;
    if (!isIncremental) {
      this.paginaAtual = 0;
      this.hasMore = true;
    }
    this.carregandoMais = true;
    try {
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .order('nome', { ascending: true })
        .range(this.paginaAtual * this.limitePagina, (this.paginaAtual + 1) * this.limitePagina - 1);

      if (this.buscaTermo.trim()) {
        const q = `%${this.buscaTermo.trim()}%`;
        query = query.or(`nome.ilike.${q},email.ilike.${q},documento.ilike.${q},telefone.ilike.${q}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const mapped = (data || []).map(d => ({
        id: d.id,
        nome: d.nome,
        email: d.email,
        telefone: d.telefone,
        documento: d.documento,
        dataNascimento: d.data_nascimento || d.dataNascimento,
        endereco: d.endereco,
        observacoes: d.observacoes,
        consultorResponsavelId: d.consultor_responsavel_id || d.consultorResponsavelId,
        passaporteNumero: d.passaporte_numero || d.passaporteNumero,
        passaporteValidade: d.passaporte_validade || d.passaporteValidade,
        vistosInformacoes: d.vistos_informacoes || d.vistosInformacoes,
        googleDriveFolderUrl: d.google_drive_folder_url || d.googleDriveFolderUrl,
        classificacoes: d.classificacoes || [],
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));

      if (isIncremental) {
        this.clientes = [...this.clientes, ...mapped];
      } else {
        this.clientes = mapped;
      }

      this.hasMore = this.clientes.length < (count || 0);
    } catch (err: any) {
      console.error('Erro ao carregar lista de clientes:', err.message);
      if (!isIncremental) this.clientes = [];
    } finally {
      this.carregandoMais = false;
    }
  }

  /**
   * Calcula o status de validade do passaporte do cliente
   */
  private checkPassaporteSLA(validadeStr?: string): { status: 'ok' | 'warning' | 'expired' | 'none'; days: number; message: string } {
    if (!validadeStr) return { status: 'none', days: 0, message: 'Passaporte não cadastrado.' };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const validade = new Date(validadeStr);
    validade.setHours(0, 0, 0, 0);

    const diferencaTempo = validade.getTime() - hoje.getTime();
    const diasParaVencer = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

    if (diasParaVencer < 0) {
      return {
        status: 'expired',
        days: diasParaVencer,
        message: `❌ PASSAPORTE EXPIRADO! (Vencido há ${Math.abs(diasParaVencer)} dias)`
      };
    } else if (diasParaVencer <= 180) {
      // 180 dias (6 meses) é o padrão de exigência na maioria dos países
      return {
        status: 'warning',
        days: diasParaVencer,
        message: `⚠️ ATENÇÃO: Passaporte expira em ${diasParaVencer} dias! (Necessário renovar para viagens internacionais)`
      };
    }

    return {
      status: 'ok',
      days: diasParaVencer,
      message: `✅ Passaporte Regular (Validade de mais de 6 meses - ${diasParaVencer} dias)`
    };
  }

  /**
   * Associa os eventos gerais da tela (como busca e seleção de novo cliente)
   */
  private setupGlobalEventListeners(): void {
    // Input de busca com debounce
    const searchInput = document.getElementById('input-busca-cliente') as HTMLInputElement;
    let debounceTimer: any;
    searchInput?.addEventListener('input', (e) => {
      this.buscaTermo = (e.target as HTMLInputElement).value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        await this.loadClientes(false);
        this.filtrarERenderizarLista();
      }, 300);
    });

    // Evento de scroll para paginação infinita
    const listaEl = document.getElementById('lista-clientes-container');
    listaEl?.addEventListener('scroll', async () => {
      if (this.carregandoMais || !this.hasMore) return;
      
      const { scrollTop, clientHeight, scrollHeight } = listaEl;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        this.paginaAtual++;
        await this.loadClientes(true);
        this.filtrarERenderizarLista();
      }
    });

    // Botão de novo cliente
    document.getElementById('btn-novo-cliente')?.addEventListener('click', () => {
      this.selecionarCliente(null);
    });


  }

  private filtrarERenderizarLista(): void {
    const listaEl = document.getElementById('lista-clientes-container');
    if (!listaEl) return;

    const filtrados = this.clientes;

    if (filtrados.length === 0) {
      listaEl.innerHTML = `
        <div class="p-6 text-center text-slate-400 text-xs font-semibold">
          Nenhum cliente correspondente.
        </div>
      `;
      return;
    }

    listaEl.innerHTML = filtrados.map(c => {
      const isSelected = this.clienteSelecionado?.id === c.id;
      const passSla = this.checkPassaporteSLA(c.passaporteValidade);
      
      let borderSlaClass = 'border-l-4 border-l-slate-200 dark:border-l-slate-700';
      if (passSla.status === 'expired') borderSlaClass = 'border-l-4 border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10';
      if (passSla.status === 'warning') borderSlaClass = 'border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10';
      if (passSla.status === 'ok') borderSlaClass = 'border-l-4 border-l-emerald-500';

      const hasEmail = c.email && c.email.trim() !== '' && c.email !== 'NULL';
      const contatoExibido = hasEmail 
        ? c.email 
        : (c.telefone && c.telefone.trim() !== '' && c.telefone !== 'NULL' ? c.telefone : '');

      return `
        <button data-cliente-id="${c.id}" class="w-full text-left p-4 rounded-xl border ${
          isSelected 
            ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 shadow-sm' 
            : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
        } transition flex items-center justify-between gap-3 ${borderSlaClass} group">
          <div class="overflow-hidden">
            <span class="block text-sm font-black truncate">${c.nome && c.nome !== 'NULL' ? c.nome : 'Cliente sem nome'}</span>
            <span class="block text-[11px] text-slate-400 dark:text-slate-500 font-semibold truncate group-hover:text-slate-500 dark:group-hover:text-slate-400 transition">${contatoExibido}</span>
          </div>
          <span class="text-xs">👤</span>
        </button>
      `;
    }).join('');

    // Adiciona o ouvinte em cada botão da lista
    listaEl.querySelectorAll('button[data-cliente-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-cliente-id');
        const selected = this.clientes.find(c => c.id === id) || null;
        this.selecionarCliente(selected);
      });
    });
  }

  /**
   * Atualiza a ficha de detalhes do cliente selecionado (ou abre formulário limpo para cadastro)
   */
  private selecionarCliente(cliente: Cliente | null): void {
    if (cliente === null) {
      // Cria um objeto de cliente vazio para novo cadastro
      this.clienteSelecionado = {
        id: '', // ID vazio indica novo cadastro
        nome: '',
        email: '',
        telefone: '',
        documento: '',
        dataNascimento: '',
        endereco: '',
        observacoes: '',
        consultorResponsavelId: this.user?.id || '',
        passaporteNumero: '',
        passaporteValidade: '',
        vistosInformacoes: '',
        googleDriveFolderUrl: ''
      };
    } else {
      this.clienteSelecionado = cliente;
    }
    
    this.filtrarERenderizarLista(); // Atualiza seleção na lista lateral
    this.renderFichaDetalhada();
    this.setupFormEventListeners();
  }

  /**
   * Gerencia os ouvintes específicos do formulário e upload de arquivos
   */
  private setupFormEventListeners(): void {
    const form = document.getElementById('form-cliente') as HTMLFormElement;
    
    // Inicializa a validação em tempo real para os campos de contato e datas
    setupFormValidation('form-cliente', [
      { id: 'input-email', type: 'email' },
      { id: 'input-telefone', type: 'phone', required: false },
      { id: 'input-documento', type: 'cpf_cnpj', required: false },
      { id: 'input-data-nasc', type: 'date', required: false },
      { id: 'input-pass-validade', type: 'date', required: false }
    ]);

    // Aplica classes de alerta visual para o passaporte caso esteja expirado/alerta
    if (this.clienteSelecionado) {
      const passSla = this.checkPassaporteSLA(this.clienteSelecionado.passaporteValidade);
      const passValidadeInput = document.getElementById('input-pass-validade') as HTMLInputElement;
      if (passValidadeInput && passSla.status !== 'none' && passSla.status !== 'ok') {
        passValidadeInput.classList.add('passport-expired-alert');
        if (passSla.status === 'expired') passValidadeInput.classList.add('text-rose-600', 'dark:text-rose-400');
        if (passSla.status === 'warning') passValidadeInput.classList.add('text-amber-600', 'dark:text-amber-400');
      }
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const isEditing = !!(this.clienteSelecionado && this.clienteSelecionado.id);
      
      const nomeVal = (document.getElementById('input-nome') as HTMLInputElement).value;
      const emailVal = (document.getElementById('input-email') as HTMLInputElement).value;
      const telefoneVal = getFormattedPhoneToDb('input-telefone');
      const documentoVal = (document.getElementById('input-documento') as HTMLInputElement).value;
      const dataNascVal = formatBrDateToIso((document.getElementById('input-data-nasc') as HTMLInputElement).value);
      const enderecoVal = (document.getElementById('input-endereco') as HTMLInputElement).value;
      const passNumeroVal = (document.getElementById('input-pass-numero') as HTMLInputElement).value;
      const passValidadeVal = formatBrDateToIso((document.getElementById('input-pass-validade') as HTMLInputElement).value);
      const vistosVal = (document.getElementById('textarea-vistos') as HTMLTextAreaElement).value;
      const obsVal = (document.getElementById('textarea-observacoes') as HTMLTextAreaElement).value;

      // Validação de passaporte vencido no passado
      if (passValidadeVal) {
        const validadeDate = new Date(passValidadeVal);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        validadeDate.setHours(0, 0, 0, 0);
        if (validadeDate.getTime() < hoje.getTime()) {
          const confirmSave = await showCustomConfirm(
            'A data de validade do passaporte informada está no passado (vencido). Tem certeza de que deseja salvar os dados do cliente mesmo assim?',
            'Aviso de Passaporte Vencido'
          );
          if (!confirmSave) return;
        }
      }

      const payload: any = {
        nome: nomeVal,
        email: emailVal,
        telefone: telefoneVal,
        documento: documentoVal,
        data_nascimento: dataNascVal || null,
        endereco: enderecoVal || null,
        passaporte_numero: passNumeroVal || null,
        passaporte_validade: passValidadeVal || null,
        vistos_informacoes: vistosVal || null,
        observacoes: obsVal || null,
        consultor_responsavel_id: this.user.id
      };

      try {
        let recemCriado: Cliente | null = null;
        if (isEditing && this.clienteSelecionado) {
          const newUpdatedAt = new Date().toISOString();
          // Executa o update com verificação de bloqueio otimista
          const { data: updateData, error } = await supabase
            .from('clientes')
            .update({ ...payload, updated_at: newUpdatedAt })
            .eq('id', this.clienteSelecionado.id)
            .eq('updated_at', this.clienteSelecionado.updatedAt)
            .select();

          if (error) throw error;

          if (!updateData || updateData.length === 0) {
            // Divergência de concorrência detectada
            const { data: dbData } = await supabase
              .from('clientes')
              .select('*')
              .eq('id', this.clienteSelecionado.id)
              .single();

            const confirmOverwrite = await showCustomConfirm(
              `Outro consultor modificou a ficha deste cliente enquanto você editava.\n\nDeseja sobrescrever as alterações dele com os seus dados ou cancelar e atualizar a tela com os dados novos?`,
              'Divergência de Dados (Concorrência)'
            );

            if (confirmOverwrite) {
              const { error: forceError } = await supabase
                .from('clientes')
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq('id', this.clienteSelecionado.id);

              if (forceError) throw forceError;
              this.showToast('Alterações salvas forçadamente!', 'success');
            } else {
              this.showToast('Atualizando dados do cliente...', 'success');
              await this.loadClientes();
              const freshClient = this.clientes.find(c => c.id === this.clienteSelecionado?.id) || null;
              this.selecionarCliente(freshClient);
              return;
            }
          } else {
            this.showToast('Ficha do cliente atualizada com sucesso!', 'success');
          }

          await this.loadClientes();
          recemCriado = this.clientes.find(c => c.id === this.clienteSelecionado?.id) || null;
        } else {
          // Inicializa novo cliente no Supabase
          const { data, error } = await supabase
            .from('clientes')
            .insert(payload)
            .select();

          if (error) throw error;
          this.showToast('Cliente cadastrado com sucesso!', 'success');

          await this.loadClientes();
          if (data && data.length > 0) {
            const d = data[0];
            recemCriado = {
              id: d.id,
              nome: d.nome,
              email: d.email,
              telefone: d.telefone,
              documento: d.documento,
              dataNascimento: d.data_nascimento || d.dataNascimento,
              endereco: d.endereco,
              observacoes: d.observacoes,
              consultorResponsavelId: d.consultor_responsavel_id || d.consultorResponsavelId,
              passaporteNumero: d.passaporte_numero || d.passaporteNumero,
              passaporteValidade: d.passaporte_validade || d.passaporteValidade,
              vistosInformacoes: d.vistos_informacoes || d.vistosInformacoes,
              googleDriveFolderUrl: d.google_drive_folder_url || d.googleDriveFolderUrl,
              createdAt: d.created_at,
              updatedAt: d.updated_at
            };
          }
        }

        if (recemCriado) {
          // 1. Cliente Completo (Nome, Email, Telefone, Documento)
          if (recemCriado.nome && recemCriado.email && recemCriado.telefone && recemCriado.documento) {
            await registrarXp(this.user.id, `cliente_completo_${recemCriado.id}`, 30);
          }

          // 2. Passaporte com SLA Válido (Passaporte número e validade futura)
          if (recemCriado.passaporteNumero && recemCriado.passaporteValidade) {
            const validadeDate = new Date(recemCriado.passaporteValidade);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            validadeDate.setHours(0, 0, 0, 0);
            if (validadeDate.getTime() >= hoje.getTime()) {
              await registrarXp(this.user.id, `passaporte_valido_${recemCriado.id}`, 50);
            }
          }
        }

        this.selecionarCliente(recemCriado);
      } catch (err: any) {
        console.error('Erro ao salvar cliente:', err);
        this.showToast('Erro ao salvar ficha do cliente.', 'error');
      }
    });

    // Configuração de Drag & Drop para Documentos
    const uploadEl = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input-documento') as HTMLInputElement;

    if (uploadEl && fileInput && this.clienteSelecionado) {
      const activeClass = 'upload-zone-active';

      // Abre seletor ao clicar na zona
      uploadEl.addEventListener('click', () => fileInput.click());

      // Muda visual ao arrastar arquivos sobre a zona
      ['dragenter', 'dragover'].forEach(eventName => {
        uploadEl.addEventListener(eventName, (e) => {
          e.preventDefault();
          uploadEl.classList.add(activeClass);
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        uploadEl.addEventListener(eventName, (e) => {
          e.preventDefault();
          uploadEl.classList.remove(activeClass);
        }, false);
      });

      // Captura o arquivo ao soltar (drop)
      uploadEl.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt?.files;
        if (files && files.length > 0) {
          this.handleFileSelected(files[0]);
        }
      });

      // Captura o arquivo ao selecionar pela caixa padrão
      fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        if (files && files.length > 0) {
          this.handleFileSelected(files[0]);
        }
      });
    }

    // Botão de Visualização de Passaporte Inline
    const btnViewPassport = document.getElementById('btn-view-passport-inline');
    btnViewPassport?.addEventListener('click', async () => {
      const { DocumentViewer } = await import('../services/documentViewer');
      if (this.clienteSelecionado) {
        DocumentViewer.open(
          `Passaporte - ${this.clienteSelecionado.nome}.pdf`,
          this.clienteSelecionado.googleDriveFolderUrl || 'mock-id',
          'application/pdf',
          this.clienteSelecionado
        );
      }
    });

    // Botão de Exclusão de Cliente
    const btnExcluirCliente = document.getElementById('btn-excluir-cliente');
    btnExcluirCliente?.addEventListener('click', () => {
      if (this.clienteSelecionado && this.clienteSelecionado.id) {
        this.excluirCliente(this.clienteSelecionado.id);
      }
    });
  }

  /**
   * Processa o upload do arquivo selecionado chamando o serviço do Google Drive
   */
  private async handleFileSelected(file: File): Promise<void> {
    if (!this.clienteSelecionado || this.carregandoUpload) return;

    this.carregandoUpload = true;
    this.renderUploadState(true, file.name);

    try {
      const result = await uploadDocumentoCliente(
        this.clienteSelecionado.id,
        this.clienteSelecionado.nome,
        this.clienteSelecionado.email,
        this.clienteSelecionado.telefone,
        file
      );

      if (result.success && result.googleDriveFolderUrl) {
        this.showToast('Documento carregado no Google Drive com sucesso!', 'success');
        
        // Atualiza o objeto do cliente localmente
        this.clienteSelecionado.googleDriveFolderUrl = result.googleDriveFolderUrl;
        
        // Recarrega todos os clientes e atualiza a exibição da ficha
        await this.loadClientes();
        const atualizado = this.clientes.find(c => c.id === this.clienteSelecionado?.id) || null;
        this.selecionarCliente(atualizado);
      } else {
        throw new Error(result.error || 'Erro desconhecido no servidor.');
      }

    } catch (err: any) {
      console.error('Falha no upload do passaporte:', err);
      this.showToast(`Erro no upload: ${err.message}`, 'error');
      this.renderUploadState(false);
    } finally {
      this.carregandoUpload = false;
    }
  }

  /**
   * Exibe a ficha detalhada de dados do cliente selecionado no lado direito da tela
   */
  private renderFichaDetalhada(): void {
    const fichaEl = document.getElementById('ficha-cliente-container');
    if (!fichaEl) return;

    const c = this.clienteSelecionado;

    // Se nenhum cliente estiver selecionado, exibe uma bela tela inicial (Glassmorphic)
    if (!c) {
      fichaEl.innerHTML = `
        <div class="h-full min-h-[500px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-sm">
          <div class="w-20 h-20 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 rounded-3xl flex items-center justify-center text-4xl mb-4 border border-indigo-100/30 dark:border-indigo-900/30 shadow-inner animate-pulse">
            👥
          </div>
          <h3 class="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight mb-2">Ficha de Gestão de Clientes</h3>
          <p class="text-sm text-slate-400 dark:text-slate-500 max-w-sm mb-6 font-medium">Selecione um cliente na barra lateral para editar suas informações, validar passaportes ou anexar arquivos diretamente no Google Drive corporativo.</p>
          <button id="btn-novo-cliente-vazio" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/10 transition">
            ➕ Cadastrar Novo Cliente
          </button>
        </div>
      `;
      
      document.getElementById('btn-novo-cliente-vazio')?.addEventListener('click', () => {
        this.selecionarCliente(null);
      });
      return;
    }

    // SLA do passaporte
    const passSla = this.checkPassaporteSLA(c.passaporteValidade);
    
    // Classes de input do passaporte se expirar ou expitado
    let passValidadeInputClass = 'w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold';
    if (passSla.status === 'expired') passValidadeInputClass += ' passport-expired-alert text-rose-600 dark:text-rose-400';
    if (passSla.status === 'warning') passValidadeInputClass += ' passport-expired-alert text-amber-600 dark:text-amber-400';

    const isNew = !c.id;

    fichaEl.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        
        <!-- Topo da Ficha: Nome & Botão Google Drive -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner">
              ${isNew ? 'NC' : (c.nome || 'NC').substring(0,2).toUpperCase()}
            </div>
            <div>
              <h2 class="text-xl font-black text-slate-800 dark:text-slate-200 leading-snug tracking-tight">
                ${isNew ? 'Novo Cliente / Passageiro' : c.nome}
              </h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
                <span>Cadastro e Documentação</span>
                ${!isNew ? `&bull; <span class="text-indigo-600 dark:text-indigo-400 font-bold">${c.email}</span>` : ''}
              </p>
              ${!isNew && c.classificacoes && c.classificacoes.length > 0 ? `
                <div class="flex flex-wrap gap-1.5 mt-1.5">
                  ${c.classificacoes.map(tag => `
                    <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-black text-[9px] uppercase tracking-wider border border-slate-200/50 dark:border-slate-800 flex items-center gap-0.5">
                      📢 ${tag}
                    </span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Botão Proeminente do Google Drive (Exibido apenas para clientes existentes) -->
          ${isNew ? '' : (c.googleDriveFolderUrl ? `
            <div class="flex items-center gap-2.5">
              <button type="button" id="btn-view-passport-inline" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wide rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 uppercase">
                <span class="text-lg">🔍</span> Ver Passaporte
              </button>
              <a href="${c.googleDriveFolderUrl}" target="_blank" class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs tracking-wide rounded-xl shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 uppercase">
                <span class="text-lg">📁</span> Pasta no Drive
              </a>
            </div>
          ` : `
            <span class="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-xs font-semibold border border-slate-200/40 dark:border-slate-700/40 text-center">
              Sem pasta ativa no Drive
            </span>
          `)}
        </div>

        <form id="form-cliente" class="space-y-6">
          
          <!-- Seção 1: Informações Pessoais -->
          <div>
            <h3 class="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 border-b border-indigo-50/50 dark:border-slate-800 pb-1">1. Dados Pessoais e Contato</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Nome Completo *</label>
                <input id="input-nome" type="text" required value="${c.nome}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">E-mail *</label>
                ${renderEmailInputHTML('input-email', c.email)}
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Telefone/WhatsApp</label>
                ${renderPhoneInputHTML('input-telefone', c.telefone, '(11) 99999-9999', false)}
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Documento (CPF/CNPJ)</label>
                ${renderDocumentInputHTML('input-documento', c.documento || '', 'CPF ou CNPJ', false)}
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Data de Nascimento</label>
                ${renderDateInputHTML('input-data-nasc', c.dataNascimento || '', 'DD/MM/AAAA', false)}
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Endereço Residencial</label>
                <input id="input-endereco" type="text" value="${c.endereco || ''}" placeholder="Rua, Número, Bairro, Cidade..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium" />
              </div>
            </div>
          </div>

          <!-- Seção 2: Documentação Internacional (Passaporte & Vistos) -->
          <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h3 class="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 border-b border-indigo-50/50 dark:border-slate-800 pb-1">2. Documentação Internacional</h3>
            
            <!-- Alertas Visuais de SLA do Passaporte -->
            ${passSla.status !== 'none' && passSla.status !== 'ok' ? `
              <div class="mb-4 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold ${
                passSla.status === 'expired' 
                  ? 'bg-rose-50 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50' 
                  : 'bg-amber-50 dark:bg-amber-950/45 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 animate-pulse'
              }">
                <span>${passSla.status === 'expired' ? '🚨' : '⚠️'}</span>
                <p>${passSla.message}</p>
              </div>
            ` : ''}

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Número do Passaporte</label>
                <input id="input-pass-numero" type="text" placeholder="ex: AB123456" value="${c.passaporteNumero || ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Validade do Passaporte</label>
                ${renderDateInputHTML('input-pass-validade', c.passaporteValidade || '', 'DD/MM/AAAA', false)}
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Vistos Ativos (Detalhes)</label>
                <textarea id="textarea-vistos" placeholder="Informe os vistos que o cliente possui (ex: Americano B1/B2 válido até 12/2030, Canadense e-TA, etc.)" rows="2.5" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-sm font-medium">${c.vistosInformacoes || ''}</textarea>
              </div>
            </div>
          </div>

          <!-- Seção 3: Anexos e Upload Google Drive (Exibida apenas para clientes existentes) -->
          ${isNew ? '' : `
            <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h3 class="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 border-b border-indigo-50/50 dark:border-slate-800 pb-1">3. Upload Seguro de Documentos (Google Drive Agência)</h3>
              <p class="text-xs text-slate-400 dark:text-slate-500 mb-3.5 font-medium">Os arquivos anexados serão inseridos automaticamente em uma pasta estruturada do Google Drive central da agência, sem vinculação com contas pessoais.</p>
              
              <!-- Componente de Upload Drag & Drop -->
              <div class="relative">
                <input type="file" id="file-input-documento" accept="image/*,application/pdf" class="hidden" />
                <div id="upload-dropzone" class="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400/80 bg-slate-50/30 dark:bg-slate-800/10 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl p-6 text-center cursor-pointer transition transform hover:-translate-y-0.5 flex flex-col items-center justify-center space-y-2 group">
                  <div id="upload-zone-visual" class="flex flex-col items-center justify-center space-y-2">
                    <span class="text-3xl filter group-hover:scale-110 transition duration-300">📤</span>
                    <p class="text-sm text-slate-700 dark:text-slate-300 font-extrabold">Arraste e solte arquivos aqui</p>
                    <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold">Ou clique para selecionar (PDF, JPEG, PNG - Máx. 10MB)</p>
                  </div>
                </div>
              </div>
            </div>
          `}

          <!-- Seção 4: Observações Gerais -->
          <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h3 class="text-sm font-black text-slate-700 dark:text-slate-300 uppercase mb-3">Observações Adicionais</h3>
            <textarea id="textarea-observacoes" placeholder="Informações de suporte adicionais sobre o passageiro..." rows="2.5" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-sm font-medium">${c.observacoes || ''}</textarea>
          </div>

          <!-- Ações Finais do Formulário -->
          <div class="flex items-center justify-between gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div>
              ${(!isNew && this.perfil?.role === 'admin') ? `
                <button type="button" id="btn-excluir-cliente" class="px-5 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-extrabold text-sm tracking-wider rounded-xl transition uppercase">
                  Excluir Cliente
                </button>
              ` : ''}
            </div>
            <button type="submit" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 transition uppercase">
              ${isNew ? 'Cadastrar Cliente' : 'Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>
    `;
  }

  /**
   * Modifica a interface da zona de upload para exibir o status de carregamento
   */
  private renderUploadState(loading: boolean, fileName: string = ''): void {
    const visualEl = document.getElementById('upload-zone-visual');
    const dropzone = document.getElementById('upload-dropzone');
    if (!visualEl || !dropzone) return;

    if (loading) {
      dropzone.classList.add('pointer-events-none');
      visualEl.innerHTML = `
        <div class="flex flex-col items-center justify-center space-y-3 p-4">
          <div class="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-indigo-600 font-bold animate-pulse">Enviando "${fileName}" de forma segura para o Google Drive...</p>
        </div>
      `;
    } else {
      dropzone.classList.remove('pointer-events-none');
      visualEl.innerHTML = `
        <span class="text-3xl filter group-hover:scale-110 transition duration-300">📤</span>
        <p class="text-sm text-slate-700 font-extrabold">Arraste e solte arquivos aqui</p>
        <p class="text-xs text-slate-400 font-semibold">Ou clique para selecionar (PDF, JPEG, PNG - Máx. 10MB)</p>
      `;
    }
  }

  /**
   * Exibe tela de carregamento (Skeleton loader)
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 p-8 flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-semibold animate-pulse">Carregando a ficha única do cliente...</p>
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
          <h2 class="text-xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
          <p class="text-slate-500 text-sm mb-6">${msg}</p>
          <button id="btn-login-redirect" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition">
            Voltar
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Deleta um cliente se não houver vínculos impeditivos (apenas Admins)
   */
  private async excluirCliente(clientId: string): Promise<void> {
    const confirm = await showCustomConfirm(
      'Deseja realmente excluir permanentemente este cliente? Esta ação não pode ser desfeita e pode ser impedida se houver viagens vinculadas.',
      'Excluir Cliente'
    );
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clientId);

      if (error) {
        // Se der erro de foreign key constraint
        if (error.code === '23503') {
          await showCustomConfirm(
            'Não é possível excluir o cliente pois existem viagens ou orçamentos associados a ele. Remova os vínculos primeiro.',
            'Erro de Exclusão'
          );
          return;
        }
        throw error;
      }

      this.showToast('Cliente excluído com sucesso!', 'success');
      this.clienteSelecionado = null;
      await this.loadClientes();
      this.render();
    } catch (err: any) {
      console.error('Erro ao excluir cliente:', err);
      this.showToast(`Erro ao excluir cliente: ${err.message || err}`, 'error');
    }
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
   * Renderiza a página de clientes com estrutura de duas colunas (barra lateral e formulário)
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <!-- Cabeçalho -->
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-auto object-contain md:hidden" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Clientes</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Ficha Única e Documentação</p>
            </div>
          </div>
          
          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
            <!-- Botão de Ação Primária -->
            <button id="btn-novo-cliente" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase shrink-0">
              <svg width="16" height="16" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Novo Cliente</span>
            </button>
          </div>
        </header>

        <!-- Corpo Principal com Duas Colunas -->
        <main class="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- Coluna Esquerda: Lista de Clientes (Busca & Navegação) -->
          <div class="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
            
            <!-- Barra de Busca -->
            <div>
              <label class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Pesquisar Cliente</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input id="input-busca-cliente" type="text" placeholder="Nome, email ou CPF/RG..." class="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium text-sm" />
              </div>
            </div>

            <!-- Listagem Container -->
            <div>
              <label class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Clientes Ativos</label>
              <div id="lista-clientes-container" class="max-h-[600px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                <!-- Injetado via JS -->
              </div>
            </div>

          </div>

          <!-- Coluna Direita: Ficha Única do Cliente (Formulários & Uploads) -->
          <div class="lg:col-span-8" id="ficha-cliente-container">
            <!-- Injetado via JS -->
          </div>

        </main>
      </div>
    `;

    // Renderiza a lista de clientes inicial
    this.filtrarERenderizarLista();

    // Renderiza o detalhe do primeiro cliente por padrão, se houver
    if (this.clientes.length > 0) {
      this.selecionarCliente(this.clientes[0]);
    } else {
      this.selecionarCliente(null);
    }
  }
}
export default ClientesPage;
