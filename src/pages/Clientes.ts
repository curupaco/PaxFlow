import { supabase, getSessaoAtual } from '../services/supabase';
import { uploadDocumentoCliente } from '../services/googleDrive';
import { AnexosService } from '../services/anexosService';
import { UploadAnexoModal } from '../components/common/UploadAnexoModal';
import { getAvatarSvg } from '../services/avatars';
import { Cliente, ClientePassaporte, PerfilConsultor } from '../types';
import { showCustomConfirm, showCustomPrompt } from '../services/dialog';
import { ClienteSearchService } from '../services/clienteSearchService';

import { registrarXp } from '../services/gamification';
import { SendTemplateMessageModal } from '../components/dashboard/SendTemplateMessageModal';
import { renderHelpIcon } from '../utils/helpHelper';
import {
  renderPhoneInputHTML,
  renderEmailInputHTML,
  renderDateInputHTML,
  renderDocumentInputHTML,
  setupFormValidation,
  getFormattedPhoneToDb,
  formatBrDateToIso,
  formatIsoDateToBr,
  formatCpfCnpj
} from '../utils/masks';
import {
  calcularCompletudeCadastral,
  consolidarLinhaDoTempoCliente,
  TimelineEvent
} from '../controllers/clientesController';
import { renderSkeletonTable, renderSkeletonClientDetail } from '../utils/skeletonHelper';
import './Clientes.css';

export class ClientesPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private clientes: Cliente[] = [];
  private clienteSelecionado: Cliente | null = null;
  private passaportesEdicao: ClientePassaporte[] = [];
  private carregandoUpload: boolean = false;
  private buscaTermo: string = '';
  private mobileDetailOpen: boolean = false;
  private fichaTabAtiva: 'cadastro' | 'timeline' = 'cadastro';
  private timelineCarregando: boolean = false;
  private timelineEventos: TimelineEvent[] = [];

  // Variáveis para seleção em massa e limpeza de recursos
  private selectedClientIds: Set<string> = new Set();
  private activeCleanups: (() => void)[] = [];

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
    this.activeCleanups.forEach(fn => {
      try { fn(); } catch (e) { console.error('Erro ao executar cleanup:', e); }
    });
    this.activeCleanups = [];
    this.selectedClientIds.clear();
    document.getElementById('clientes-bulk-action-bar')?.remove();
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
      const { data, count } = await ClienteSearchService.buscarClientes({
        termo: this.buscaTermo,
        paginaAtual: this.paginaAtual,
        limitePagina: this.limitePagina,
        consultorId: this.user?.id,
        isAdmin: this.perfil?.role === 'admin'
      });

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
        passaportes: (Array.isArray(d.passaportes) && d.passaportes.length > 0)
          ? d.passaportes
          : ((d.passaporte_numero || d.passaporteNumero) ? [{
              nome: d.nome || 'Passageiro Titular',
              numero: d.passaporte_numero || d.passaporteNumero,
              validade: d.passaporte_validade || d.passaporteValidade || ''
            }] : []),
        vistosInformacoes: d.vistos_informacoes || d.vistosInformacoes,
        googleDriveFolderUrl: d.google_drive_folder_url || d.googleDriveFolderUrl,
        classificacoes: d.classificacoes || [],
        codigo_ref: d.codigo_ref,
        codigoRef: d.codigo_ref,
        documento_limpo: d.documento_limpo,
        telefone_limpo: d.telefone_limpo,
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
      this.renderBulkActionBar();
      return;
    }

    listaEl.innerHTML = filtrados.map(c => {
      const isSelected = this.clienteSelecionado?.id === c.id;
      const isChecked = this.selectedClientIds.has(c.id);
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
        <div class="flex items-center gap-2 p-1 rounded-xl ${isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}">
          <input type="checkbox" data-select-cliente-id="${c.id}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 ml-2" />
          <button data-cliente-id="${c.id}" class="flex-1 text-left p-3.5 rounded-xl border ${
            isSelected 
              ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 shadow-sm' 
              : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          } transition flex items-center justify-between gap-3 ${borderSlaClass} group">
            <div class="overflow-hidden">
              <span class="block text-sm font-black truncate">
                ${c.codigoRef ? `<span class="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded mr-1.5">${c.codigoRef}</span>` : ''}
                ${c.nome && c.nome !== 'NULL' ? c.nome : 'Cliente sem nome'}
              </span>
              <span class="block text-[11px] text-slate-400 dark:text-slate-400 font-semibold truncate group-hover:text-slate-500 dark:group-hover:text-slate-400 transition">${contatoExibido}</span>
            </div>
            <span class="text-xs">👤</span>
          </button>
        </div>
      `;
    }).join('');

    // Adiciona o ouvinte em cada checkbox
    listaEl.querySelectorAll('input[data-select-cliente-id]').forEach((chk: any) => {
      chk.addEventListener('change', (e: Event) => {
        const id = chk.getAttribute('data-select-cliente-id');
        if (id) {
          if ((e.target as HTMLInputElement).checked) {
            this.selectedClientIds.add(id);
          } else {
            this.selectedClientIds.delete(id);
          }
          this.renderBulkActionBar();
        }
      });
    });

    // Adiciona o ouvinte em cada botão da lista
    listaEl.querySelectorAll('button[data-cliente-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-cliente-id');
        const selected = this.clientes.find(c => c.id === id) || null;
        this.selecionarCliente(selected);
      });
    });

    this.renderBulkActionBar();
  }

  /**
   * Renderiza a barra flutuante de ações em massa para clientes selecionados
   */
  private renderBulkActionBar(): void {
    let bar = document.getElementById('clientes-bulk-action-bar');
    if (this.selectedClientIds.size === 0) {
      if (bar) bar.remove();
      return;
    }

    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'clientes-bulk-action-bar';
      bar.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-fadeInCard';
      document.body.appendChild(bar);
    }

    bar.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-bold border-r border-slate-700 pr-4">
        <span class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">${this.selectedClientIds.size}</span>
        <span>Selecionados</span>
      </div>
      <button id="btn-bulk-tag" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5">
        <span>🏷️</span> Tag em Massa
      </button>
      <button id="btn-bulk-clear" class="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition">
        Limpar
      </button>
    `;

    bar.querySelector('#btn-bulk-clear')?.addEventListener('click', () => {
      this.selectedClientIds.clear();
      this.filtrarERenderizarLista();
    });

    bar.querySelector('#btn-bulk-tag')?.addEventListener('click', async () => {
      const tagInput = await showCustomPrompt(
        'Digite a tag a ser adicionada aos clientes selecionados:',
        'Adicionar Tag em Massa',
        '',
        'Ex: VIP, Disney2027, Europa'
      );
      if (!tagInput || !tagInput.trim()) return;
      const tagClean = tagInput.trim();


      try {
        const ids = Array.from(this.selectedClientIds);
        for (const id of ids) {
          const cli = this.clientes.find(c => c.id === id);
          if (cli) {
            const currentTags = cli.classificacoes || [];
            if (!currentTags.includes(tagClean)) {
              const updatedTags = [...currentTags, tagClean];
              await supabase.from('clientes').update({ classificacoes: updatedTags }).eq('id', id);
              cli.classificacoes = updatedTags;
            }
          }
        }
        this.showToast(`Tag "${tagClean}" adicionada a ${ids.length} clientes!`, 'success');
        this.selectedClientIds.clear();
        this.filtrarERenderizarLista();
      } catch (err: any) {
        this.showToast('Erro ao aplicar tags em massa.', 'error', err);
      }
    });
  }

  /**
   * Controla a visibilidade dos painéis no celular (Master-Detail)
   */
  private updateMobileViewVisibility(): void {
    const listCol = document.getElementById('clientes-lista-col');
    const detailCol = document.getElementById('ficha-cliente-container');
    if (!listCol || !detailCol) return;

    if (this.mobileDetailOpen) {
      listCol.classList.add('hidden');
      detailCol.classList.remove('hidden');
    } else {
      listCol.classList.remove('hidden');
      detailCol.classList.add('hidden');
    }
  }

  /**
   * Atualiza a ficha de detalhes do cliente selecionado (ou abre formulário limpo para cadastro)
   */
  private selecionarCliente(cliente: Cliente | null, openMobile: boolean = true): void {
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
        passaportes: [{ nome: '', numero: '', validade: '' }],
        vistosInformacoes: '',
        googleDriveFolderUrl: ''
      };
      this.passaportesEdicao = [{ nome: '', numero: '', validade: '' }];
    } else {
      this.clienteSelecionado = cliente;
      if (cliente.passaportes && Array.isArray(cliente.passaportes) && cliente.passaportes.length > 0) {
        this.passaportesEdicao = cliente.passaportes.map(p => ({ ...p }));
      } else if (cliente.passaporteNumero) {
        this.passaportesEdicao = [{
          nome: cliente.nome || 'Passageiro Titular',
          numero: cliente.passaporteNumero,
          validade: cliente.passaporteValidade || ''
        }];
      } else {
        this.passaportesEdicao = [{ nome: cliente.nome || '', numero: '', validade: '' }];
      }
    }
    
    if (openMobile) {
      this.mobileDetailOpen = true;
    } else {
      this.mobileDetailOpen = false;
    }

    this.filtrarERenderizarLista(); // Atualiza seleção na lista lateral
    this.renderFichaDetalhada();
    this.setupFormEventListeners();
    this.updateMobileViewVisibility();

    if (this.clienteSelecionado?.id) {
      this.carregarEDesenharDocumentosCliente(this.clienteSelecionado.id);
    }
  }

  /**
   * Renderiza os cards editáveis para cada passaporte cadastrado (Titular + Familiares)
   */
  private renderPassaportesCardsHTML(): string {
    if (!this.passaportesEdicao || this.passaportesEdicao.length === 0) {
      this.passaportesEdicao = [{
        nome: this.clienteSelecionado?.nome || '',
        numero: this.clienteSelecionado?.passaporteNumero || '',
        validade: this.clienteSelecionado?.passaporteValidade || ''
      }];
    }

    return this.passaportesEdicao.map((p, index) => {
      const isTitular = index === 0;
      const passSla = this.checkPassaporteSLA(p.validade);
      const nomeExibicao = isTitular 
        ? (p.nome || this.clienteSelecionado?.nome || '')
        : (p.nome || '');

      let slaBadge = '';
      if (p.validade && passSla.status !== 'none') {
        if (passSla.status === 'expired') {
          slaBadge = `
            <div class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold bg-rose-50 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
              <span>🚨</span>
              <span>Passaporte Vencido (${passSla.days < 0 ? Math.abs(passSla.days) + ' dias atrás' : 'Vencido'})</span>
            </div>
          `;
        } else if (passSla.status === 'warning') {
          slaBadge = `
            <div class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold bg-amber-50 dark:bg-amber-950/45 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 animate-pulse">
              <span>⚠️</span>
              <span>Atenção: Expira em ${passSla.days} dias (&lt; 6 meses)</span>
            </div>
          `;
        } else if (passSla.status === 'ok') {
          slaBadge = `
            <div class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <span>✅</span>
              <span>Validade Regular (${passSla.days} dias restantes)</span>
            </div>
          `;
        }
      }

      return `
        <div class="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-4 transition-all" data-pass-card-index="${index}">
          <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/50 dark:border-slate-800/60">
            <div class="flex items-center gap-2">
              <span class="text-sm">${isTitular ? '👤' : '👥'}</span>
              <span class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                ${isTitular ? 'Passageiro Titular (Cliente Principal)' : `Familiar / Acompanhante #${index + 1}`}
              </span>
            </div>
            ${!isTitular ? `
              <button type="button" class="btn-remover-passaporte text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 text-xs font-black flex items-center gap-1 transition px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg" data-pass-index="${index}" title="Remover este passaporte">
                <span>🗑️</span> Remover
              </button>
            ` : ''}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div class="md:col-span-5">
              <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome Completo *</label>
              <input 
                type="text" 
                id="pass-nome-${index}" 
                data-pass-index="${index}" 
                value="${nomeExibicao}" 
                placeholder="${isTitular ? 'Nome do cliente titular' : 'Nome do familiar / acompanhante'}" 
                class="pass-input-nome w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-xs" 
              />
            </div>

            <div class="md:col-span-4">
              <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Número do Passaporte</label>
              <input 
                type="text" 
                id="pass-numero-${index}" 
                data-pass-index="${index}" 
                value="${p.numero || ''}" 
                placeholder="ex: FP123456" 
                class="pass-input-numero uppercase w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium text-xs tracking-wider" 
              />
            </div>

            <div class="md:col-span-3">
              <label class="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Validade</label>
              ${renderDateInputHTML(`pass-validade-${index}`, p.validade ? (p.validade.includes('-') ? formatIsoDateToBr(p.validade) : p.validade) : '', 'DD/MM/AAAA', false)}
            </div>
          </div>

          ${slaBadge ? `<div class="mt-3">${slaBadge}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  private setupPassaportesEventListeners(): void {
    // Sincroniza dados digitados com this.passaportesEdicao
    this.syncPassaportesFromInputs();

    // Botão Adicionar Passaporte Familiar
    const btnAdd = document.getElementById('btn-add-passaporte-familiar');
    btnAdd?.addEventListener('click', () => {
      this.syncPassaportesFromInputs();
      this.passaportesEdicao.push({ nome: '', numero: '', validade: '' });
      this.refreshPassaportesCards();
    });

    // Botões Remover Passaporte
    document.querySelectorAll('.btn-remover-passaporte').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement);
        const idx = Number(target.getAttribute('data-pass-index'));
        if (!isNaN(idx) && idx > 0) {
          this.syncPassaportesFromInputs();
          this.passaportesEdicao.splice(idx, 1);
          this.refreshPassaportesCards();
        }
      });
    });

    // Sincronização em tempo real do nome do Titular com o input #input-nome
    const inputNomePrincipal = document.getElementById('input-nome') as HTMLInputElement | null;
    inputNomePrincipal?.addEventListener('input', () => {
      const pass0Nome = document.getElementById('pass-nome-0') as HTMLInputElement | null;
      if (pass0Nome && this.passaportesEdicao.length > 0) {
        pass0Nome.value = inputNomePrincipal.value;
        this.passaportesEdicao[0].nome = inputNomePrincipal.value;
      }
    });
  }

  private syncPassaportesFromInputs(): void {
    this.passaportesEdicao.forEach((p, index) => {
      const nomeEl = document.getElementById(`pass-nome-${index}`) as HTMLInputElement | null;
      const numEl = document.getElementById(`pass-numero-${index}`) as HTMLInputElement | null;
      const valEl = document.getElementById(`pass-validade-${index}`) as HTMLInputElement | null;

      if (nomeEl) p.nome = nomeEl.value.trim();
      if (numEl) p.numero = numEl.value.trim().toUpperCase();
      if (valEl) p.validade = valEl.value.trim();
    });
  }

  private refreshPassaportesCards(): void {
    const container = document.getElementById('container-passaportes-lista');
    if (container) {
      container.innerHTML = this.renderPassaportesCardsHTML();
      this.setupPassaportesEventListeners();
    }
  }

  /**
   * Gerencia os ouvintes específicos do formulário e upload de arquivos
   */
  private setupFormEventListeners(): void {
    const form = document.getElementById('form-cliente') as HTMLFormElement;

    // Botão Voltar no mobile
    const btnVoltar = document.getElementById('btn-voltar-lista-mobile');
    btnVoltar?.addEventListener('click', () => {
      this.mobileDetailOpen = false;
      this.updateMobileViewVisibility();
    });
    
    // Inicializa a validação em tempo real para os campos de contato e datas
    const validator = setupFormValidation('form-cliente', [
      { id: 'input-email', type: 'email' },
      { id: 'input-telefone', type: 'phone', required: false },
      { id: 'input-documento', type: 'cpf_cnpj', required: false },
      { id: 'input-data-nasc', type: 'date', required: false }
    ]);

    // Configura ouvintes de passaportes da família
    this.setupPassaportesEventListeners();

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validator.validateAll()) {
        this.showToast('Por favor, preencha todos os campos obrigatórios com valores válidos.', 'error');
        return;
      }

      this.syncPassaportesFromInputs();

      const isEditing = !!(this.clienteSelecionado && this.clienteSelecionado.id);
      
      const nomeVal = (document.getElementById('input-nome') as HTMLInputElement).value;
      const emailVal = (document.getElementById('input-email') as HTMLInputElement).value;
      const telefoneVal = getFormattedPhoneToDb('input-telefone');
      const documentoVal = (document.getElementById('input-documento') as HTMLInputElement).value;
      const dataNascVal = formatBrDateToIso((document.getElementById('input-data-nasc') as HTMLInputElement).value);
      const enderecoVal = (document.getElementById('input-endereco') as HTMLInputElement).value;
      const origemLeadVal = (document.getElementById('select-origem-lead') as HTMLSelectElement).value;
      const obsVal = (document.getElementById('textarea-observacoes') as HTMLTextAreaElement).value;

      let classificacoesVal: string[] = [];
      if (isEditing && this.clienteSelecionado) {
        const existingClass = this.clienteSelecionado.classificacoes || [];
        const standardOrigens = ['WhatsApp', 'Instagram', 'Indicação', 'Google', 'Site', 'Outros'];
        classificacoesVal = existingClass.filter(tag => !standardOrigens.includes(tag));
        if (origemLeadVal) {
          classificacoesVal.push(origemLeadVal);
        }
      } else {
        classificacoesVal = origemLeadVal ? [origemLeadVal] : [];
      }

      // Validação de passaportes vencidos no passado para qualquer membro
      const passaportesVencidos = this.passaportesEdicao.filter(p => {
        if (!p.validade) return false;
        const iso = p.validade.includes('/') ? formatBrDateToIso(p.validade) : p.validade;
        if (!iso) return false;
        const d = new Date(iso);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < hoje.getTime();
      });

      if (passaportesVencidos.length > 0) {
        const nomesVencidos = passaportesVencidos.map(p => p.nome || 'Passageiro').join(', ');
        const confirmSave = await showCustomConfirm(
          `Atenção: O(s) passaporte(s) de [${nomesVencidos}] está(ão) com data de validade no passado (vencido). Deseja salvar os dados do cliente mesmo assim?`,
          'Aviso de Passaporte Vencido'
        );
        if (!confirmSave) return;
      }

      // Verificação de duplicidade de CPF, E-mail e Telefone
      const conflitoMsg = await this.verificarDuplicidade(emailVal, telefoneVal, documentoVal);
      if (conflitoMsg) {
        const prosseguir = await showCustomConfirm(
          `${conflitoMsg}\n\nDeseja cadastrar/salvar este cliente assim mesmo?`,
          'Duplicidade de Cadastro Detectada',
          { confirmText: 'Salvar mesmo assim', cancelText: 'Revisar Cadastro' }
        );
        if (!prosseguir) return;
      }

      // Processa passaportes da família
      const passaportesFormatados = this.passaportesEdicao
        .map(p => ({
          nome: p.nome.trim(),
          numero: p.numero.trim().toUpperCase(),
          validade: p.validade ? (p.validade.includes('/') ? formatBrDateToIso(p.validade) : p.validade) : ''
        }))
        .filter(p => p.nome || p.numero || p.validade);

      const titularPass = passaportesFormatados[0];

      const payload: any = {
        nome: nomeVal,
        email: emailVal,
        telefone: telefoneVal,
        documento: documentoVal,
        data_nascimento: dataNascVal || null,
        endereco: enderecoVal || null,
        passaporte_numero: titularPass?.numero || null,
        passaporte_validade: titularPass?.validade || null,
        passaportes: passaportesFormatados,
        vistos_informacoes: null,
        observacoes: obsVal || null,
        classificacoes: classificacoesVal,
        consultor_responsavel_id: (isEditing && this.clienteSelecionado) 
          ? (this.clienteSelecionado.consultorResponsavelId || (this.clienteSelecionado as any).consultor_responsavel_id || this.user.id)
          : this.user.id
      };

      try {
        let recemCriado: Cliente | null = null;
        if (isEditing && this.clienteSelecionado) {
          const newUpdatedAt = new Date().toISOString();
          const { error } = await supabase
            .from('clientes')
            .update({ ...payload, updated_at: newUpdatedAt })
            .eq('id', this.clienteSelecionado.id);

          if (error) throw error;
          this.showToast('Ficha do cliente atualizada com sucesso!', 'success');

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
              passaportes: d.passaportes || passaportesFormatados,
              vistosInformacoes: d.vistos_informacoes || d.vistosInformacoes,
              googleDriveFolderUrl: d.google_drive_folder_url || d.googleDriveFolderUrl,
              classificacoes: d.classificacoes || [],
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
        this.showToast('Erro ao salvar ficha do cliente.', 'error', err);
      }
    });

    // Configuração de Drag & Drop e Upload para Documentos
    const uploadEl = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input-documento') as HTMLInputElement;
    const btnAbrirAnexo = document.getElementById('btn-abrir-anexo-cliente');

    if (btnAbrirAnexo && fileInput) {
      btnAbrirAnexo.addEventListener('click', () => fileInput.click());
    }

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

      // Captura múltiplos arquivos ao soltar (drop)
      uploadEl.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt?.files;
        if (files && files.length > 0) {
          this.abrirModalUploadAnexo(Array.from(files));
        }
      });

      // Captura múltiplos arquivos ao selecionar pela caixa padrão
      fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        if (files && files.length > 0) {
          this.abrirModalUploadAnexo(Array.from(files));
          fileInput.value = ''; // Limpa para permitir reenvio do mesmo arquivo se necessário
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

    // Botão de WhatsApp (Templates)
    document.getElementById('btn-cliente-whatsapp')?.addEventListener('click', async () => {
      if (this.clienteSelecionado) {
        // Obter nome do consultor atual logado
        let consultorNome = 'Consultor';
        try {
          const { data } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', this.clienteSelecionado.consultorResponsavelId || '')
            .maybeSingle();
          if (data && data.nome) {
            consultorNome = data.nome;
          }
        } catch(e) {}

        SendTemplateMessageModal.open({
          clienteNome: this.clienteSelecionado.nome || '',
          clienteTelefone: this.clienteSelecionado.telefone || '',
          consultorNome,
          showToast: (msg, type) => this.showToast(msg, type)
        });
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
   * Verifica se o e-mail, telefone ou documento fornecido já pertencem a outro cliente cadastrado.
   */
  private async verificarDuplicidade(emailVal: string, telefoneVal: string, documentoVal: string): Promise<string | null> {
    const orConditions: string[] = [];

    // 1. E-mail (exato/ilike)
    const emailLimpo = emailVal.trim();
    if (emailLimpo) {
      orConditions.push(`email.ilike.${emailLimpo}`);
    }

    // 2. CPF / CNPJ (limpo ou formatado)
    const cleanDoc = documentoVal.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (cleanDoc) {
      orConditions.push(`documento.eq.${cleanDoc}`);
      const formattedDoc = formatCpfCnpj(cleanDoc);
      if (formattedDoc !== cleanDoc) {
        orConditions.push(`documento.eq.${formattedDoc}`);
      }
    }

    // 3. Telefone (últimos 8 dígitos)
    const phoneDigits = telefoneVal.replace(/\D/g, '');
    if (phoneDigits.length >= 8) {
      const last8 = phoneDigits.slice(-8);
      orConditions.push(`telefone.ilike.%${last8}`);
    }

    if (orConditions.length === 0) {
      return null;
    }

    try {
      let query = supabase
        .from('clientes')
        .select('id, nome, email, telefone, documento, consultor_responsavel_id, consultor:profiles!consultor_responsavel_id(nome)');

      if (this.clienteSelecionado && this.clienteSelecionado.id) {
        query = query.neq('id', this.clienteSelecionado.id);
      }

      query = query.or(orConditions.join(','));

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao verificar duplicidade de clientes:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const duplicados: string[] = [];
      for (const row of data) {
        const colisoes: string[] = [];

        // Comparação do E-mail
        if (emailLimpo && row.email && row.email.trim().toLowerCase() === emailLimpo.toLowerCase()) {
          colisoes.push(`E-mail (${row.email})`);
        }

        // Comparação do CPF/CNPJ
        if (cleanDoc && row.documento) {
          const dbDocClean = row.documento.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
          if (dbDocClean === cleanDoc) {
            colisoes.push(`Documento (${row.documento})`);
          }
        }

        // Comparação do Telefone
        if (phoneDigits && row.telefone) {
          const dbPhoneClean = row.telefone.replace(/\D/g, '');
          if (dbPhoneClean && dbPhoneClean.endsWith(phoneDigits.slice(-8))) {
            colisoes.push(`Telefone (${row.telefone})`);
          }
        }

        if (colisoes.length > 0) {
          const consultorNome = (row as any).consultor?.nome || (row as any).profiles?.nome || 'Não definido';
          duplicados.push(`- ${colisoes.join(', ')} já cadastrado(s) no cliente "${row.nome}" (Consultor: ${consultorNome})`);
        }
      }

      if (duplicados.length > 0) {
        return `Aviso: Encontramos duplicidade com registros existentes no sistema:\n\n${duplicados.join('\n')}`;
      }
    } catch (err) {
      console.error('Erro na verificação de duplicidade:', err);
    }

    return null;
  }

  /**
   * Processa o upload do arquivo selecionado chamando o serviço do Google Drive
   */
  /**
   * Abre o modal inteligente de identificação e upload de anexos
   */
  private abrirModalUploadAnexo(files: File[]): void {
    if (!this.clienteSelecionado?.id || files.length === 0) return;

    const modal = new UploadAnexoModal({
      arquivos: files,
      clienteId: this.clienteSelecionado.id,
      usuarioId: this.user?.id,
      showToast: (msg, tipo) => this.showToast(msg, tipo === 'error' ? 'error' : 'success'),
      onSuccess: async () => {
        if (this.clienteSelecionado?.id) {
          await this.carregarEDesenharDocumentosCliente(this.clienteSelecionado.id);
          await this.loadClientes();
          const atualizado = this.clientes.find(c => c.id === this.clienteSelecionado?.id) || null;
          if (atualizado) {
            this.clienteSelecionado = atualizado;
          }
        }
      }
    });

    modal.open();
  }

  /**
   * Carrega e desenha a galeria de documentos anexados do cliente
   */
  private async carregarEDesenharDocumentosCliente(clienteId: string): Promise<void> {
    const container = document.getElementById('container-documentos-cliente');
    if (!container) return;

    try {
      const anexos = await AnexosService.listarAnexos(undefined, clienteId);

      if (!anexos || anexos.length === 0) {
        container.innerHTML = `
          <div class="p-6 bg-slate-50/60 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80 text-center space-y-2">
            <span class="text-2xl">📁</span>
            <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum documento anexado ainda</p>
            <p class="text-[11px] text-slate-400 font-medium">Anexe Passaportes, RGs, CNHs ou Vistos abaixo para arquivamento e consulta imediata.</p>
          </div>
        `;
        return;
      }

      const getBadgeEstilo = (tipo: string) => {
        switch (tipo) {
          case 'PASSAPORTE':
            return { icon: '🛂', label: 'Passaporte', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800' };
          case 'RG':
            return { icon: '🪪', label: 'Identidade (RG)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' };
          case 'CNH':
            return { icon: '🚗', label: 'CNH Habilitação', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' };
          case 'VISTO':
            return { icon: '📄', label: 'Visto Consular', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' };
          case 'VOUCHER_AEREO':
            return { icon: '✈️', label: 'Bilhete Aéreo', cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800' };
          case 'VOUCHER_HOTEL':
            return { icon: '🏨', label: 'Hospedagem', cls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800' };
          case 'INGRESSO':
            return { icon: '🎫', label: 'Ingresso / Atração', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' };
          case 'SEGURO':
            return { icon: '🛡️', label: 'Seguro Viagem', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800' };
          case 'CONTRATO':
            return { icon: '📝', label: 'Contrato', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
          default:
            return { icon: '📎', label: 'Documento', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
        }
      };

      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${anexos.map((doc) => {
            const badge = getBadgeEstilo(doc.tipo_documento);
            const tamanhoFormatado = AnexosService.formatarTamanho(doc.tamanho_bytes);
            const podeExcluir = AnexosService.podeExcluirAnexo(doc, this.user?.id, this.perfil?.role);

            // Validação de SLA de validade se houver data
            let validadeBadge = '';
            if (doc.data_validade) {
              const dtVal = new Date(doc.data_validade);
              const hoje = new Date();
              const dias = Math.ceil((dtVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              if (dias < 0) {
                validadeBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20 uppercase">Vencido (${new Date(doc.data_validade).toLocaleDateString('pt-BR')})</span>`;
              } else if (dias <= 180) {
                validadeBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase">Vence em ${dias}d</span>`;
              } else {
                validadeBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-bold text-slate-400">Validade: ${new Date(doc.data_validade).toLocaleDateString('pt-BR')}</span>`;
              }
            }

            return `
              <div class="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col justify-between gap-3 hover:border-indigo-400/60 transition group">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${badge.cls}">
                      <span>${badge.icon}</span> ${badge.label}
                    </span>
                    ${tamanhoFormatado ? `<span class="text-[10px] font-bold text-slate-400">${tamanhoFormatado}</span>` : ''}
                  </div>

                  <h4 class="text-xs font-black text-slate-900 dark:text-slate-100 truncate" title="${doc.rotulo}">
                    ${doc.rotulo}
                  </h4>

                  ${doc.numero_documento || validadeBadge ? `
                    <div class="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                      ${doc.numero_documento ? `<span class="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">Nº ${doc.numero_documento}</span>` : ''}
                      ${validadeBadge}
                    </div>
                  ` : ''}
                </div>

                <!-- Ações do Documento -->
                <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 gap-1.5">
                  <div class="flex items-center gap-1.5">
                    <button type="button" class="btn-visualizar-doc px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] rounded-lg transition uppercase flex items-center gap-1" data-id="${doc.id}" data-rotulo="${doc.rotulo}" data-path="${doc.storage_path}" data-mime="${doc.mime_type || ''}">
                      <span>👁️</span> Ver
                    </button>
                    <a href="${doc.storage_path.startsWith('http') ? doc.storage_path : '#'}" target="_blank" class="btn-baixar-doc px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-[10px] rounded-lg transition uppercase flex items-center gap-1" data-id="${doc.id}" data-path="${doc.storage_path}">
                      <span>📥</span> Baixar
                    </a>
                    ${this.clienteSelecionado?.telefone ? `
                      <button type="button" class="btn-whatsapp-doc px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] rounded-lg transition uppercase flex items-center gap-1" data-id="${doc.id}" title="Enviar documento via WhatsApp">
                        <span>💬</span>
                      </button>
                    ` : ''}
                  </div>

                  ${podeExcluir ? `
                    <button type="button" class="btn-excluir-doc p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Excluir documento" data-id="${doc.id}" data-path="${doc.storage_path}" data-rotulo="${doc.rotulo}">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Eventos de Ações nos cards
      container.querySelectorAll('.btn-visualizar-doc').forEach(btn => {
        btn.addEventListener('click', async () => {
          const rotulo = btn.getAttribute('data-rotulo') || 'Documento';
          const path = btn.getAttribute('data-path') || '';
          const mime = btn.getAttribute('data-mime') || 'application/pdf';
          const { DocumentViewer } = await import('../services/documentViewer');
          DocumentViewer.open(rotulo, path, mime, this.clienteSelecionado);
        });
      });

      container.querySelectorAll('.btn-baixar-doc').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const path = btn.getAttribute('data-path') || '';
          if (path.startsWith('supabase-storage://')) {
            e.preventDefault();
            const { DocumentViewer } = await import('../services/documentViewer');
            DocumentViewer.open('Download de Documento', path, 'application/pdf', this.clienteSelecionado);
          }
        });
      });

      container.querySelectorAll('.btn-whatsapp-doc').forEach(btn => {
        btn.addEventListener('click', () => {
          const docId = btn.getAttribute('data-id');
          const anexo = anexos.find(a => a.id === docId);
          if (anexo && this.clienteSelecionado?.telefone) {
            const telLimpo = this.clienteSelecionado.telefone.replace(/\D/g, '');
            const msgEncoded = AnexosService.montarMensagemWhatsApp(anexo, this.clienteSelecionado.nome);
            window.open(`https://api.whatsapp.com/send?phone=55${telLimpo}&text=${msgEncoded}`, '_blank');
          }
        });
      });

      container.querySelectorAll('.btn-excluir-doc').forEach(btn => {
        btn.addEventListener('click', async () => {
          const docId = btn.getAttribute('data-id');
          const path = btn.getAttribute('data-path') || '';
          const rotulo = btn.getAttribute('data-rotulo') || 'este documento';

          const confirmar = await showCustomConfirm(
            `Deseja realmente remover o documento "${rotulo}"? Esta ação não pode ser desfeita.`,
            'Remover Documento'
          );

          if (confirmar && docId) {
            const excluiu = await AnexosService.excluirAnexo(docId, path || undefined);
            if (excluiu) {
              this.showToast('Documento removido com sucesso!', 'success');
              if (this.clienteSelecionado && this.clienteSelecionado.id === clienteId) {
                if (docId.startsWith('legado-cliente-') || path === this.clienteSelecionado.googleDriveFolderUrl) {
                  this.clienteSelecionado.googleDriveFolderUrl = undefined;
                  this.clienteSelecionado.passaporteNumero = undefined;
                  this.clienteSelecionado.passaporteValidade = undefined;
                  this.clienteSelecionado.passaportes = [];
                  this.renderFichaDetalhada();
                }
              }
              await this.carregarEDesenharDocumentosCliente(clienteId);
            } else {
              this.showToast('Erro ao remover documento.', 'error');
            }
          }
        });
      });

    } catch (err) {
      console.error('[ClientesPage] Erro ao carregar documentos do cliente:', err);
      container.innerHTML = `
        <div class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-600 dark:text-rose-400">
          Não foi possível carregar os documentos anexados no momento.
        </div>
      `;
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
        <div class="h-full min-h-[500px] pf-card-glass rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-lg border border-slate-200/80 dark:border-slate-800/80">
          <div class="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center text-4xl mb-4 border border-indigo-500/30 shadow-inner animate-pulse">
            👥
          </div>
          <h3 class="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">Ficha de Gestão de Clientes</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 font-semibold leading-relaxed">
            Selecione um cliente na lista à esquerda para editar informações, acompanhar histórico de vendas, consultar passaportes e gerenciar pastas no Google Drive corporativo.
          </p>
          <button id="btn-novo-cliente-vazio" class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-600/25 pf-button-press pf-focus-ring transition flex items-center gap-2">
            <span>➕</span> Cadastrar Novo Cliente
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
    const completude = calcularCompletudeCadastral(c);

    fichaEl.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-5 min-w-0 max-w-full overflow-hidden">
        
        <!-- Botão Voltar (Apenas Mobile) -->
        <div class="lg:hidden flex items-center mb-1">
          <button id="btn-voltar-lista-mobile" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl flex items-center gap-1.5 transition">
            <span>←</span> Voltar para a lista
          </button>
        </div>

        <!-- Topo da Ficha: Nome, Completude & Botão Google Drive -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 min-w-0 max-w-full">
          <div class="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-black text-base shadow-sm shrink-0">
              ${isNew ? 'NC' : (c.nome || 'NC').substring(0,2).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1 overflow-hidden">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-snug tracking-tight truncate">
                  ${isNew ? 'Novo Cliente / Passageiro' : c.nome}
                </h2>
                ${!isNew ? `
                  <div class="relative group cursor-pointer inline-block">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${completude.corBadge} transition">
                      <span>${completude.porcentagem === 100 ? '⭐' : '📊'}</span>
                      <span>${completude.porcentagem}% Preenchido</span>
                    </span>
                    <!-- Tooltip de Completude -->
                    <div class="absolute left-0 top-full mt-1.5 hidden group-hover:block z-50 w-64 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-sans animate-fade-in pointer-events-none">
                      <div class="font-extrabold text-[11px] mb-1.5 text-indigo-300">Auditoria Cadastral (${completude.porcentagem}%)</div>
                      ${completude.concluidos.length > 0 ? `
                        <div class="space-y-0.5 mb-1.5 text-[10px] text-emerald-400">
                          ${completude.concluidos.map(item => `<div>✅ ${item}</div>`).join('')}
                        </div>
                      ` : ''}
                      ${completude.pendencias.length > 0 ? `
                        <div class="space-y-0.5 text-[10px] text-amber-400 border-t border-slate-700/60 pt-1">
                          ${completude.pendencias.map(item => `<div>⚠️ Pendente: ${item}</div>`).join('')}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                ` : ''}
              </div>

              <div class="text-xs text-slate-500 dark:text-slate-400 font-semibold flex flex-wrap items-center gap-1.5 mt-0.5">
                <span>Ficha e Documentação</span>
                ${c.codigoRef ? `<span class="font-mono text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 rounded border border-indigo-100 dark:border-indigo-900/30">${c.codigoRef}</span>` : ''}
                ${!isNew && c.email ? `<span class="text-slate-400">&bull;</span><span class="text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-[200px] sm:max-w-xs inline-block align-bottom">${c.email}</span>` : ''}
              </div>

              ${!isNew && c.classificacoes && c.classificacoes.length > 0 ? `
                <div class="flex flex-wrap gap-1.5 mt-2">
                  ${c.classificacoes.map(tag => `
                    <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-black text-[9px] uppercase tracking-wider border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1">
                      <span>📢</span> ${tag}
                    </span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Botões de Ação na Ficha -->
          ${isNew ? '' : `
            <div class="flex flex-wrap items-center gap-2 max-w-full">
              <button type="button" id="btn-cliente-whatsapp" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase shrink-0">
                <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.777 1.451 5.51 0 9.997-4.493 10-10.008.002-2.673-1.037-5.186-2.93-7.079-1.892-1.893-4.401-2.934-7.078-2.934-5.518 0-10.007 4.493-10.01 10.01-.001 1.708.455 3.377 1.32 4.887L1.134 22.84l4.513-1.186zm11.23-7.925c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.669.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                <span>WhatsApp</span>
              </button>
              ${c.googleDriveFolderUrl ? `
                <button type="button" id="btn-view-passport-inline" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase shrink-0">
                  <span>🔍</span> Ver Passaporte
                </button>
                <a href="${c.googleDriveFolderUrl}" target="_blank" class="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs tracking-wide rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase shrink-0">
                  <span>📁</span> Drive
                </a>
              ` : `
                <span class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 rounded-xl text-xs font-semibold border border-slate-200/50 dark:border-slate-700/50 text-center">
                  Sem pasta no Drive
                </span>
              `}
            </div>
          `}
        </div>

        <!-- Abas da Ficha: Cadastro vs Linha do Tempo Customer 360° -->
        ${!isNew ? `
          <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <button type="button" id="btn-tab-ficha-cadastro" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${this.fichaTabAtiva === 'cadastro' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100/70 dark:bg-slate-800/70'}">
              <span>📝</span> Ficha Cadastral
            </button>
            <button type="button" id="btn-tab-ficha-timeline" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${this.fichaTabAtiva === 'timeline' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100/70 dark:bg-slate-800/70'}">
              <span>⏱️</span> Linha do Tempo 360°
            </button>
          </div>
        ` : ''}

        <div id="ficha-tab-conteudo">
          ${this.fichaTabAtiva === 'timeline' && !isNew ? this.renderTimelineClienteHTML() : `
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
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center">
                  Documento (CPF/CNPJ) ${renderHelpIcon('tipo-pessoa-cliente')}
                </label>
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
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Origem do Lead</label>
                <select id="select-origem-lead" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium">
                  <option value="" ${!c.classificacoes || c.classificacoes.length === 0 ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Selecione a Origem...</option>
                  <option value="WhatsApp" ${c.classificacoes && c.classificacoes.includes('WhatsApp') ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">WhatsApp</option>
                  <option value="Instagram" ${c.classificacoes && c.classificacoes.includes('Instagram') ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Instagram</option>
                  <option value="Indicação" ${c.classificacoes && c.classificacoes.includes('Indicação') ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Indicação</option>
                  <option value="Google" ${c.classificacoes && c.classificacoes.includes('Google') ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Google</option>
                  <option value="Site" ${c.classificacoes && c.classificacoes.includes('Site') ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Site</option>
                  <option value="Loja" ${c.classificacoes && c.classificacoes.includes('Loja') ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Loja</option>
                  <option value="Outros" ${c.classificacoes && c.classificacoes.includes('Outros') ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Outros</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Seção 2: Documentação Internacional (Passaportes da Família) -->
          <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-50/50 dark:border-slate-800 pb-2 mb-4">
              <div>
                <h3 class="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  2. Documentação Internacional / Passaportes ${renderHelpIcon('alerta-passaporte-validade')}
                </h3>
                <p class="text-[11px] text-slate-400 dark:text-slate-400 font-medium mt-0.5">Cadastre o passaporte do cliente titular e de seus familiares/acompanhantes.</p>
              </div>
              <button type="button" id="btn-add-passaporte-familiar" class="self-start sm:self-auto px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-extrabold text-xs rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 transition flex items-center gap-1.5 uppercase tracking-wide shadow-xs">
                <span>➕</span> Adicionar Passaporte
              </button>
            </div>

            <!-- Lista Dinâmica de Cards de Passaportes -->
            <div id="container-passaportes-lista" class="space-y-4 mb-2">
              ${this.renderPassaportesCardsHTML()}
            </div>
          </div>

          <!-- Seção 3: Documentos & Identificações do Passageiro (Exibida apenas para clientes existentes) -->
          ${isNew ? '' : `
            <div class="border-t border-slate-100 dark:border-slate-800 pt-5">
              <div class="flex items-center justify-between mb-3 border-b border-indigo-50/50 dark:border-slate-800 pb-1.5 flex-wrap gap-2">
                <h3 class="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  3. Documentos &amp; Identificações do Passageiro ${renderHelpIcon('upload-google-drive')}
                </h3>
                <button type="button" id="btn-abrir-anexo-cliente" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] tracking-wide rounded-xl shadow-sm transition flex items-center gap-1.5 uppercase shrink-0">
                  <span>➕</span> Anexar Documentos
                </button>
              </div>
              <p class="text-xs text-slate-400 dark:text-slate-400 mb-3.5 font-medium">
                Passaportes, RGs, CNHs, Vistos e outros documentos oficiais com armazenamento seguro na nuvem e sincronização automática com viagens.
              </p>
              
              <!-- Galeria de Documentos Anexados do Passageiro -->
              <div id="container-documentos-cliente" class="space-y-2 mb-4">
                <div class="flex items-center gap-2 p-4 text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Carregando documentos cadastrados...</span>
                </div>
              </div>

              <!-- Componente de Upload Drag & Drop (Suporte a Lote) -->
              <div class="relative">
                <input type="file" id="file-input-documento" accept="image/*,application/pdf" multiple class="hidden" />
                <div id="upload-dropzone" class="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400/80 bg-slate-50/30 dark:bg-slate-800/10 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl p-5 text-center cursor-pointer transition transform hover:-translate-y-0.5 flex flex-col items-center justify-center space-y-1.5 group">
                  <div id="upload-zone-visual" class="flex flex-col items-center justify-center space-y-1.5">
                    <span class="text-2xl filter group-hover:scale-110 transition duration-300">📤</span>
                    <p class="text-xs text-slate-700 dark:text-slate-300 font-extrabold">Arraste e solte múltiplos arquivos aqui</p>
                    <p class="text-[11px] text-slate-400 dark:text-slate-400 font-semibold">Ou clique para selecionar (PDF, JPEG, PNG - Máx. 25MB)</p>
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
          `}
        </div>
      </div>
    `;

    // Listeners de alternância de abas da ficha
    document.getElementById('btn-tab-ficha-cadastro')?.addEventListener('click', () => {
      this.fichaTabAtiva = 'cadastro';
      this.renderFichaDetalhada();
      this.setupFormEventListeners();
    });

    document.getElementById('btn-tab-ficha-timeline')?.addEventListener('click', async () => {
      this.fichaTabAtiva = 'timeline';
      this.renderFichaDetalhada();
      await this.carregarTimelineCliente();
    });
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
   * Renderiza o HTML da Linha do Tempo Customer 360°
   */
  private renderTimelineClienteHTML(): string {
    if (this.timelineCarregando) {
      return `
        <div class="py-12 flex flex-col items-center justify-center space-y-3">
          <div class="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-500 font-bold animate-pulse">Carregando histórico 360° do viajante...</p>
        </div>
      `;
    }

    if (this.timelineEventos.length === 0) {
      return `
        <div class="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 space-y-2">
          <span class="text-3xl block">⏱️</span>
          <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum evento registrado ainda.</p>
          <p class="text-[11px] text-slate-400">Orçamentos, viagens e documentos vinculados aparecerão aqui em ordem cronológica.</p>
        </div>
      `;
    }

    return `
      <div class="space-y-4 py-2">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Jornada do Cliente (${this.timelineEventos.length} eventos)</h3>
          <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold">PaxFlow Customer 360°</span>
        </div>
        <div class="relative pl-6 border-l-2 border-indigo-100 dark:border-slate-800 space-y-4 my-2">
          ${this.timelineEventos.map(ev => `
            <div class="relative">
              <div class="absolute -left-[31px] top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center text-[10px] shadow-xs">
                ${ev.icone}
              </div>
              <div class="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1 hover:border-indigo-300 transition">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="text-xs font-black text-slate-800 dark:text-slate-200">${ev.titulo}</span>
                  <span class="text-[10px] font-mono font-bold text-slate-400">${ev.data}</span>
                </div>
                <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">${ev.descricao}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Carrega os dados vinculados do cliente e consolida a Linha do Tempo 360°
   */
  private async carregarTimelineCliente(): Promise<void> {
    if (!this.clienteSelecionado?.id) return;
    this.timelineCarregando = true;
    const tabEl = document.getElementById('ficha-tab-conteudo');
    if (tabEl) tabEl.innerHTML = this.renderTimelineClienteHTML();

    try {
      const cliId = this.clienteSelecionado.id;
      const [resViagens, resOrcamentos, resAnexos] = await Promise.all([
        supabase.from('viagens').select('*').eq('cliente_id', cliId),
        supabase.from('orcamentos').select('*').or(`cliente_id.eq.${cliId},clienteId.eq.${cliId}`),
        AnexosService.listarAnexos(undefined, cliId)
      ]);

      this.timelineEventos = consolidarLinhaDoTempoCliente({
        cliente: this.clienteSelecionado,
        viagens: resViagens.data || [],
        orcamentos: resOrcamentos.data || [],
        anexos: resAnexos || []
      });
    } catch (e) {
      console.warn('Erro ao carregar timeline 360 do cliente:', e);
    } finally {
      this.timelineCarregando = false;
      const tabElAtual = document.getElementById('ficha-tab-conteudo');
      if (tabElAtual && this.fichaTabAtiva === 'timeline') {
        tabElAtual.innerHTML = this.renderTimelineClienteHTML();
      }
    }
  }

  /**
   * Exibe tela de carregamento (Skeleton loader)
   */
  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 space-y-6 font-sans">
        <div class="h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 animate-pulse flex items-center justify-between">
          <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
          <div class="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-32"></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-4">
            ${renderSkeletonTable(6, 2)}
          </div>
          <div class="lg:col-span-8">
            ${renderSkeletonClientDetail()}
          </div>
        </div>
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
      this.showToast('Erro ao excluir cliente.', 'error', err);
    }
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
      toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
      document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    toast.className = `fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
      isSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
    }`;
    toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${translatedMessage}`;

    const duration = isSuccess ? 3500 : 5500;
    setTimeout(() => {
      if (toast) {
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-[99999] transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      }
    }, duration);
  }

  /**
   * Renderiza a página de clientes com estrutura de duas colunas (barra lateral e formulário)
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="w-full flex-1 flex flex-col overflow-hidden font-sans transition-colors duration-200">
        
        <!-- Corpo Principal com Duas Colunas -->
        <main class="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start overflow-y-auto custom-scrollbar min-w-0 max-w-full">
          
          <!-- Coluna Esquerda: Lista de Clientes (Busca & Navegação) -->
          <div id="clientes-lista-col" class="lg:col-span-4 min-w-0 max-w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col gap-4 lg:flex ${this.mobileDetailOpen ? 'hidden' : 'flex'}">
            
            <!-- Topo da Listagem: Título e Botão Novo Cliente Integrado -->
            <div class="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shadow-inner">👥</span>
                <div>
                  <h1 class="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">Clientes</h1>
                  <p class="text-[10px] text-slate-400 dark:text-slate-400 font-semibold leading-none mt-0.5">Gestão de Passageiros</p>
                </div>
              </div>
              
              <button id="btn-novo-cliente" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] tracking-wider rounded-xl shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-1 transition transform hover:-translate-y-0.5 uppercase shrink-0">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Novo Cliente</span>
              </button>
            </div>

            <!-- Barra de Busca -->
            <div>
              <label class="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-1.5">Pesquisar Cliente</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input id="input-busca-cliente" type="text" placeholder="Nome, email ou CPF/RG..." class="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium text-sm" />
              </div>
            </div>

            <!-- Listagem Container -->
            <div>
              <label class="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Clientes Ativos</label>
              <div id="lista-clientes-container" class="max-h-[600px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                <!-- Injetado via JS -->
              </div>
            </div>

          </div>

          <!-- Coluna Direita: Ficha Única do Cliente (Formulários & Uploads) -->
          <div class="lg:col-span-8 min-w-0 max-w-full lg:block ${this.mobileDetailOpen ? 'block' : 'hidden'}" id="ficha-cliente-container">
            <!-- Injetado via JS -->
          </div>

        </main>
      </div>
    `;

    // Renderiza a lista de clientes inicial
    this.filtrarERenderizarLista();

    // Renderiza o detalhe do primeiro cliente por padrão, se houver
    if (this.clientes.length > 0) {
      this.selecionarCliente(this.clientes[0], false);
    } else {
      this.selecionarCliente(null, false);
    }
  }
}
export default ClientesPage;
