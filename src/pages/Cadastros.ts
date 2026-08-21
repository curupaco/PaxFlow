import { supabase, getSessaoAtual } from '../services/supabase';
import { TipoProduto, CampoAdicional, MetaPeriodo, MetaFaixa } from '../types';
import { showCustomAlert, showCustomConfirm } from '../services/dialog';
import { MetasService } from '../services/metasService';
import { BADGE_DEFINITIONS } from '../services/gamification';
import { parseBrFloat } from '../services/csvImporter';

export class CadastrosPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: any = null;
  private tiposProduto: TipoProduto[] = [];
  
  // Gestão de Abas
  private activeTab: 'tipos' | 'destinos' | 'formas' | 'campanhas' | 'templates' | 'metas' = 'tipos';

  // Estado para formulário de cadastro/edição de Tipos
  private editandoTipoId: string | null = null;
  private camposAdicionaisEmEdicao: CampoAdicional[] = [];

  // Estado para Gestão de Destinos
  private destinos: any[] = [];
  private editandoDestinoId: string | null = null;
  private buscaDestinoTermo: string = '';

  // Estado para Gestão de Formas de Recebimento
  private formasRecebimento: any[] = [];
  private editandoFormaId: string | null = null;
  private selectedIconForma: string = '💵';
  private iconesFormaDisponiveis: string[] = ['💵', '💳', '🏦', '📱', '💰', '🪙', '🧾', '🔌', '⚡', '🔐'];

  // Estados migrados para Campanhas, Metas e Templates
  private campaigns: any[] = [];
  private templates: any[] = [];
  private metas: MetaPeriodo[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa a página
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

      // 2. Apenas administradores
      if (!this.perfil || this.perfil.role !== 'admin') {
        this.renderAcessoNegado();
        return;
      }

      // 3. Buscar dados
      await Promise.all([
        this.loadTiposProduto(),
        this.loadDestinos(),
        this.loadFormasRecebimento(),
        this.loadCampaigns(),
        this.loadTemplates(),
        this.loadMetas()
      ]);

      // 4. Renderizar
      this.render();
      this.setupEventListeners();

    } catch (err: any) {
      console.error('Erro ao inicializar página de cadastros:', err);
      this.renderAuthError(`Erro interno: ${err.message}`);
    }
  }

  public destroy(): void {
    // Limpeza de recursos se necessário
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
      console.error('Erro ao carregar tipos de produtos:', err);
      this.showToast('Erro ao carregar tipos de produtos do banco de dados.', 'error', err);
    }
  }

  /**
   * Carrega os destinos do Supabase
   */
  private async loadDestinos(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('destinos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      this.destinos = data || [];
    } catch (err: any) {
      console.error('Erro ao carregar destinos:', err);
      this.showToast('Erro ao carregar destinos do banco de dados.', 'error', err);
    }
  }

  /**
   * Renderiza a página
   */
  private render(): void {
    const tipoEmEdicao = this.editandoTipoId 
      ? this.tiposProduto.find(t => t.id === this.editandoTipoId) 
      : null;

    const destinoEmEdicao = this.editandoDestinoId
      ? this.destinos.find(d => d.id === this.editandoDestinoId)
      : null;

    // Filtrar destinos pela busca local
    const query = this.buscaDestinoTermo.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filteredDestinos = this.destinos.filter(d => {
      const nomeClean = d.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const paisClean = d.pais.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nomeClean.includes(query) || paisClean.includes(query);
    });

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
        
        <!-- Cabeçalho -->
        <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-10 w-auto object-contain md:hidden" />
            <div>
              <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <span>Central de Cadastros</span>
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Normalização de dados e configuração de campos dinâmicos do sistema</p>
            </div>
          </div>
        </header>

        <!-- Navegação de Abas Premium -->
        <div class="px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 flex gap-6 overflow-x-auto custom-scrollbar pb-1 transition-colors duration-200">
          <button id="tab-tipos-servicos" class="shrink-0 px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${this.activeTab === 'tipos' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">
            📦 Tipos de Serviços
          </button>
          <button id="tab-gestao-destinos" class="shrink-0 px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${this.activeTab === 'destinos' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">
            📍 Gestão de Destinos
          </button>
          <button id="tab-formas-recebimento" class="shrink-0 px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${this.activeTab === 'formas' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">
            💰 Formas de Recebimento
          </button>
          <button id="tab-campanhas-btn" class="shrink-0 px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${this.activeTab === 'campanhas' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">
            🎯 Campanhas
          </button>
          <button id="tab-metas-btn" class="shrink-0 px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${this.activeTab === 'metas' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">
            🏆 Metas Financeiras
          </button>
          <button id="tab-templates-btn" class="shrink-0 px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${this.activeTab === 'templates' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}">
            💬 Modelos de Mensagem
          </button>
        </div>

        <!-- Grade Principal -->
        <main class="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar animate-fade-in">
          
          ${this.activeTab === 'tipos' ? `
            <!-- ABA: TIPOS DE PRODUTOS E SERVIÇOS -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <!-- Coluna da Esquerda: Listagem de Tipos (2/3) -->
              <div class="lg:col-span-2 space-y-4">
                <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
                  <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">Tipos de Produtos e Serviços</h2>
                  
                  <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th class="py-3 px-4">Ícone</th>
                          <th class="py-3 px-4">Nome do Tipo</th>
                          <th class="py-3 px-4">Campos Adicionais</th>
                          <th class="py-3 px-4">Status</th>
                          <th class="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody id="lista-tipos-body">
                        ${this.tiposProduto.length === 0 ? `
                          <tr>
                            <td colspan="5" class="py-8 text-center text-xs text-slate-400 dark:text-slate-400 font-semibold">
                              Nenhum tipo cadastrado.
                            </td>
                          </tr>
                        ` : this.tiposProduto.map(t => {
                          const qtdeCampos = t.campos_adicionais?.length || 0;
                          return `
                            <tr class="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                              <td class="py-3 px-4 text-base">${t.icone}</td>
                              <td class="py-3 px-4">${t.nome}</td>
                              <td class="py-3 px-4">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${qtdeCampos > 0 ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}">
                                  ${qtdeCampos} ${qtdeCampos === 1 ? 'campo' : 'campos'}
                                </span>
                              </td>
                              <td class="py-3 px-4">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${t.ativo ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}">
                                  ${t.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td class="py-3 px-4 text-right space-x-2">
                                <button data-id="${t.id}" class="btn-editar-tipo p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition" title="Editar Tipo">
                                  ✏️
                                </button>
                                ${t.nome !== 'MUDAR!' ? `
                                  <button data-id="${t.id}" class="btn-toggle-ativo-tipo p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition" title="${t.ativo ? 'Desativar' : 'Ativar'}">
                                    🔌
                                  </button>
                                ` : ''}
                              </td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Coluna da Direita: Formulário de Adicionar / Editar (1/3) -->
              <div class="space-y-4">
                <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors sticky top-6">
                  <h2 id="form-titulo" class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">
                    ${this.editandoTipoId ? '✏️ Editar Tipo' : '➕ Novo Tipo de Serviço'}
                  </h2>

                  <form id="form-cadastro-tipo" class="space-y-4">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Nome do Tipo *</label>
                      <input id="input-tipo-nome" type="text" required value="${tipoEmEdicao ? tipoEmEdicao.nome : ''}" ${tipoEmEdicao?.nome === 'MUDAR!' ? 'disabled' : ''} placeholder="ex: Circuito, Chip de Viagem" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Ícone / Emoji *</label>
                        <input id="input-tipo-icone" type="text" required value="${tipoEmEdicao ? tipoEmEdicao.icone : ''}" placeholder="ex: ✈️, 🚢" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs text-center transition" />
                      </div>
                      <div class="flex items-center pt-5">
                        <label class="inline-flex items-center cursor-pointer select-none">
                          <input id="check-tipo-ativo" type="checkbox" ${tipoEmEdicao ? (tipoEmEdicao.ativo ? 'checked' : '') : 'checked'} class="sr-only peer" />
                          <div class="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                          <span class="ml-2 text-xs font-bold text-slate-500 dark:text-slate-400">Ativo</span>
                        </label>
                      </div>
                    </div>

                    <!-- Subcampos / Campos Adicionais -->
                    <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div class="flex items-center justify-between mb-3">
                        <h3 class="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Campos Adicionais</h3>
                        <button id="btn-adicionar-campo-adicional" type="button" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black tracking-wider transition uppercase">
                          ➕ Campo
                        </button>
                      </div>
                      
                      <!-- Container de listagem de subcampos -->
                      <div id="lista-campos-adicionais-container" class="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                        <!-- Gerado dinamicamente -->
                      </div>
                    </div>

                    <!-- Ações do Form -->
                    <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      ${this.editandoTipoId ? `
                        <button id="btn-cancelar-edicao" type="button" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 font-bold text-[10px] rounded-lg transition uppercase">
                          Cancelar
                        </button>
                      ` : ''}
                      <button id="btn-salvar-tipo" type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg transition shadow-md shadow-indigo-600/20 uppercase tracking-wider flex items-center justify-center">
                        Salvar Tipo
                      </button>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          ` : this.activeTab === 'destinos' ? `
            <!-- ABA: GESTÃO DE DESTINOS -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <!-- Coluna da Esquerda: Listagem de Destinos (2/3) -->
              <div class="lg:col-span-2 space-y-4">
                <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Destinos Cadastrados</h2>
                    <div class="relative w-full sm:w-64">
                      <input id="input-busca-destino" type="text" placeholder="Pesquisar destino ou país..." value="${this.buscaDestinoTermo}" class="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                      <span class="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
                    </div>
                  </div>
                  
                  <div class="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900 z-10">
                          <th class="py-3 px-4">Cidade / Destino</th>
                          <th class="py-3 px-4">País</th>
                          <th class="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody id="lista-destinos-body">
                        ${filteredDestinos.length === 0 ? `
                          <tr>
                            <td colspan="3" class="py-8 text-center text-xs text-slate-400 dark:text-slate-400 font-semibold">
                              Nenhum destino encontrado.
                            </td>
                          </tr>
                        ` : filteredDestinos.map(d => {
                          const isArrumar = d.nome.startsWith('ARRUMAR | ');
                          const displayName = isArrumar ? d.nome.replace('ARRUMAR | ', '⚠️ Arrumar: ') : d.nome;
                          const displayPais = isArrumar ? '<span class="text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Pendente</span>' : d.pais;
                          return `
                            <tr class="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                              <td class="py-3 px-4">${displayName}</td>
                              <td class="py-3 px-4">${displayPais}</td>
                              <td class="py-3 px-4 text-right space-x-2">
                                <button data-id="${d.id}" class="btn-editar-destino p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition" title="Editar Destino">
                                  ✏️
                                </button>
                                <button data-id="${d.id}" class="btn-excluir-destino p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition" title="Excluir Destino">
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
 
              <!-- Coluna da Direita: Formulário de Destino (1/3) -->
              <div class="space-y-4">
                <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors sticky top-6">
                  <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">
                    ${this.editandoDestinoId ? '✏️ Editar Destino' : '➕ Novo Destino'}
                  </h2>
 
                  <form id="form-cadastro-destino" class="space-y-4">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Cidade / Nome do Destino *</label>
                      <input id="input-destino-nome" type="text" required value="${destinoEmEdicao ? (destinoEmEdicao.nome.startsWith('ARRUMAR | ') ? destinoEmEdicao.nome.replace('ARRUMAR | ', '') : destinoEmEdicao.nome) : ''}" placeholder="ex: Buenos Aires, Maceió" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition" />
                    </div>
 
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">País *</label>
                      <input id="input-destino-pais" type="text" required value="${destinoEmEdicao && destinoEmEdicao.pais !== 'ARRUMAR' ? destinoEmEdicao.pais : ''}" placeholder="ex: Argentina, Brasil" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition" />
                    </div>
 
                    <!-- Ações do Form -->
                    <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      ${this.editandoDestinoId ? `
                        <button id="btn-cancelar-destino-edicao" type="button" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 font-bold text-[10px] rounded-lg transition uppercase">
                          Cancelar
                        </button>
                      ` : ''}
                      <button id="btn-salvar-destino" type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg transition shadow-md shadow-indigo-600/20 uppercase tracking-wider flex items-center justify-center">
                        Salvar Destino
                      </button>
                    </div>
                  </form>
                </div>
              </div>
 
            </div>
          ` : this.activeTab === 'formas' ? `
            <!-- ABA: FORMAS DE RECEBIMENTO -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <!-- Coluna da Esquerda: Listagem de Formas (2/3) -->
              <div class="lg:col-span-2 space-y-4">
                <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
                  <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">Formas de Recebimento Cadastradas</h2>
                  
                  <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th class="py-3 px-4 w-20">Ícone</th>
                          <th class="py-3 px-4">Tipo de Recebimento</th>
                          <th class="py-3 px-4 w-32">Status</th>
                          <th class="py-3 px-4 text-right w-40">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${this.formasRecebimento.length === 0 ? `
                          <tr>
                            <td colspan="4" class="py-8 text-center text-xs text-slate-400 dark:text-slate-400 font-semibold">
                              Nenhuma forma de recebimento cadastrada.
                            </td>
                          </tr>
                        ` : this.formasRecebimento.map(f => {
                          return `
                            <tr class="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                              <td class="py-3 px-4 text-base">${f.icone}</td>
                              <td class="py-3 px-4">${f.nome}</td>
                              <td class="py-3 px-4">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${f.ativo ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}">
                                  ${f.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td class="py-3 px-4 text-right space-x-2">
                                ${['DESCONTO', 'PREJUÍZO'].includes((f.nome || '').trim().toUpperCase()) ? `
                                  <span class="text-[10px] text-slate-400 dark:text-slate-400 font-bold italic select-none pr-4">
                                    Fixo do Sistema
                                  </span>
                                ` : `
                                  <button data-id="${f.id}" class="btn-editar-forma p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition" title="Editar Forma de Recebimento">
                                    ✏️
                                  </button>
                                  <button data-id="${f.id}" class="btn-toggle-ativo-forma p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition" title="${f.ativo ? 'Desativar' : 'Ativar'}">
                                    ${f.ativo ? '🔴 Desativar' : '🟢 Ativar'}
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
              </div>
              
              <!-- Coluna da Direita: Formulário de Cadastro/Edição (1/3) -->
              <div class="lg:col-span-1">
                <div class="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors sticky top-24">
                  <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">
                    ${this.editandoFormaId ? 'Editar Forma' : 'Nova Forma de Recebimento'}
                  </h2>
                  
                  <form id="form-cadastro-forma" class="space-y-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo de Recebimento *</label>
                      <input id="input-forma-nome" type="text" required value="${this.editandoFormaId ? (this.formasRecebimento.find(f => f.id === this.editandoFormaId)?.nome || '') : ''}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs" placeholder="ex: Pix, Dinheiro, etc." />
                    </div>
                    
                    <div>
                      <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Ícone *</label>
                      <div class="grid grid-cols-5 gap-2" id="grid-forma-icones">
                        ${this.iconesFormaDisponiveis.map(ico => {
                          const isSelected = this.selectedIconForma === ico;
                          return `
                            <button type="button" data-icon="${ico}" class="btn-select-icone-forma p-2.5 border text-base rounded-xl transition ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 font-bold' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}" style="outline: none;">
                              ${ico}
                            </button>
                          `;
                        }).join('')}
                      </div>
                      <input type="hidden" id="input-forma-icone" value="${this.selectedIconForma}" />
                    </div>
                    
                    <div class="flex gap-2 pt-2">
                      <button type="submit" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
                        ${this.editandoFormaId ? 'Salvar Alterações' : 'Cadastrar'}
                      </button>
                      ${this.editandoFormaId ? `
                        <button type="button" id="btn-cancelar-forma-edicao" class="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] tracking-wider rounded-lg transition uppercase">
                          Cancelar
                        </button>
                      ` : ''}
                    </div>
                  </form>
                </div>
              </div>
              
            </div>
          ` : this.activeTab === 'campanhas' ? `
            <!-- ABA: CAMPANHAS -->
            <div class="max-w-4xl mx-auto w-full flex flex-col gap-6 text-slate-850 dark:text-slate-100">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Campanhas Internas</h2>
                  <p class="text-xs text-slate-400 dark:text-slate-400 font-medium">Criação, ativação e controle de metas por período</p>
                </div>
                <button id="btn-nova-campanha" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase">
                  Nova Campanha
                </button>
              </div>

              <!-- Tabela de Campanhas -->
              <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-slate-600/5 dark:bg-slate-800/60 text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th class="py-4 px-5">Título</th>
                        <th class="py-4 px-5">Parâmetro de Meta</th>
                        <th class="py-4 px-5 text-center">Período</th>
                        <th class="py-4 px-5 text-center">Medalha</th>
                        <th class="py-4 px-5 text-center">Status</th>
                        <th class="py-4 px-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300 font-semibold bg-white/50 dark:bg-slate-900/30">
                      ${this.campaigns.length === 0 ? `
                        <tr>
                          <td colspan="6" class="py-8 px-5 text-center text-slate-400 dark:text-slate-400 font-medium italic">
                            Nenhuma campanha cadastrada até o momento.
                          </td>
                        </tr>
                      ` : this.campaigns.map(cam => {
                        const hoje = new Date().toISOString().split('T')[0];
                        const isExpired = cam.data_fim < hoje;
                        const statusBadge = cam.ativa && !isExpired
                          ? `<span class="inline-flex px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 text-[10px] font-bold rounded">Ativa</span>`
                          : isExpired
                            ? `<span class="inline-flex px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/45 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 text-[10px] font-bold rounded">Expirada</span>`
                            : `<span class="inline-flex px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800 text-[10px] font-bold rounded">Inativa</span>`;
                        
                        const badgeObj = BADGE_DEFINITIONS.find(b => b.key === cam.badge_key);
                        const badgeDisplay = badgeObj ? `${badgeObj.emoji} ${badgeObj.nome}` : 'Nenhuma';

                        let metaLabel = '';
                        if (cam.tipo_meta === 'xp_acumulado') metaLabel = `${cam.meta_quantidade} XP`;
                        else if (cam.tipo_meta === 'cliente_criado') metaLabel = `${cam.meta_quantidade} Clientes`;
                        else if (cam.tipo_meta === 'venda_aceita') metaLabel = `${cam.meta_quantidade} Vendas`;
                        else if (cam.tipo_meta === 'lembrete_criado') metaLabel = `${cam.meta_quantidade} Lembretes`;
                        else if (cam.tipo_meta === 'reembolso_pago') metaLabel = `${cam.meta_quantidade} Reembolsos`;
                        else if (cam.tipo_meta === 'produto_detalhado') metaLabel = `${cam.meta_quantidade} Produtos`;

                        const formatarData = (dStr: string) => {
                          const parts = dStr.split('-');
                          return `${parts[2]}/${parts[1]}/${parts[0]}`;
                        };

                        return `
                          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td class="py-4 px-5">
                              <span class="block text-slate-800 dark:text-slate-200 font-bold">${cam.titulo}</span>
                              <span class="block text-[10px] text-slate-400 dark:text-slate-400 font-semibold max-w-[250px] truncate">${cam.descricao}</span>
                            </td>
                            <td class="py-4 px-5 text-slate-600 dark:text-slate-400 font-medium">
                              ${metaLabel}
                            </td>
                            <td class="py-4 px-5 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
                              ${formatarData(cam.data_inicio)} até ${formatarData(cam.data_fim)}
                            </td>
                            <td class="py-4 px-5 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                              ${badgeDisplay}
                            </td>
                            <td class="py-4 px-5 text-center">
                              ${statusBadge}
                            </td>
                            <td class="py-4 px-5 text-right space-x-2">
                              <button data-id="${cam.id}" data-active="${cam.ativa}" class="btn-toggle-status-campanha px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                cam.ativa 
                                  ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:dark:bg-rose-950/30' 
                                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:dark:bg-emerald-950/30'
                              }">
                                ${cam.ativa ? 'Pausar' : 'Ativar'}
                              </button>
                              <button data-id="${cam.id}" class="btn-excluir-campanha px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-rose-50 dark:bg-rose-950/30 text-slate-400 hover:text-rose-500 transition border border-slate-200/40 dark:border-slate-700/40 uppercase">
                                Excluir
                              </button>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ` : this.activeTab === 'templates' ? `
            <!-- ABA: MODELOS DE MENSAGENS -->
            <div class="max-w-4xl mx-auto w-full flex flex-col gap-6 text-slate-850 dark:text-slate-100">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Modelos de Mensagem</h2>
                  <p class="text-xs text-slate-400 dark:text-slate-400 font-medium">Configure os textos de WhatsApp que serão enviados aos clientes</p>
                </div>
                <button id="btn-novo-template" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase">
                  Novo Modelo
                </button>
              </div>

              <!-- Tabela de Templates -->
              <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-slate-600/5 dark:bg-slate-800/60 text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th class="py-4 px-5">Título / Descrição</th>
                        <th class="py-4 px-5">Variáveis Mapeadas</th>
                        <th class="py-4 px-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300 font-semibold bg-white/50 dark:bg-slate-900/30">
                      ${this.templates.length === 0 ? `
                        <tr>
                          <td colspan="3" class="py-8 px-5 text-center text-slate-400 dark:text-slate-400 font-medium italic">
                            Nenhum modelo de mensagem cadastrado.
                          </td>
                        </tr>
                      ` : this.templates.map(tem => {
                        const tagsHTML = tem.variaveis_suportadas && tem.variaveis_suportadas.length > 0 
                          ? tem.variaveis_suportadas.map((v: string) => `<span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30 rounded text-[9px] font-bold font-mono">{{${v}}}</span>`).join(' ')
                          : '<span class="text-slate-400 text-xs italic">Nenhuma</span>';

                        return `
                          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td class="py-4 px-5">
                              <span class="block text-slate-800 dark:text-slate-200 font-bold">${tem.titulo}</span>
                              <span class="block text-[10px] text-slate-400 dark:text-slate-400 font-semibold max-w-[400px] truncate">${tem.descricao}</span>
                            </td>
                            <td class="py-4 px-5 text-slate-600 dark:text-slate-400 font-medium">
                              <div class="flex flex-wrap gap-1">
                                ${tagsHTML}
                              </div>
                            </td>
                            <td class="py-4 px-5 text-right space-x-2">
                              <button data-id="${tem.id}" class="btn-editar-template px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition uppercase">
                                Editar
                              </button>
                              <button data-id="${tem.id}" class="btn-excluir-template px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-rose-50 dark:bg-rose-950/30 text-slate-400 hover:text-rose-500 transition border border-slate-200/40 dark:border-slate-700/40 uppercase">
                                Excluir
                              </button>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ` : this.activeTab === 'metas' ? `
            <!-- ABA: METAS FINANCEIRAS -->
            <div class="max-w-4xl mx-auto w-full flex flex-col gap-6 text-slate-850 dark:text-slate-100">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Metas Financeiras & Campanhas</h2>
                  <p class="text-xs text-slate-400 dark:text-slate-400 font-medium">Cadastre períodos de metas financeiras (bruto/lucro) e faixas de prêmios por consultor</p>
                </div>
                <button id="btn-nova-meta" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition transform hover:-translate-y-0.5 uppercase">
                  Nova Meta
                </button>
              </div>

              <!-- Tabela de Metas -->
              <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-slate-600/5 dark:bg-slate-800/60 text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th class="py-4 px-5">Nome / Tipo</th>
                        <th class="py-4 px-5">Período</th>
                        <th class="py-4 px-5">Cálculo</th>
                        <th class="py-4 px-5">Faixas de Premiação</th>
                        <th class="py-4 px-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300 font-semibold bg-white/50 dark:bg-slate-900/30">
                      ${this.metas.length === 0 ? 
                        '<tr>' +
                          '<td colspan="5" class="py-8 px-5 text-center text-slate-400 dark:text-slate-400 font-medium italic">' +
                            'Nenhum período de metas cadastrado.' +
                          '</td>' +
                        '</tr>'
                       : this.metas.map(meta => {
                        const formatarData = (dStr: string) => {
                          if (!dStr) return '';
                          const clean = dStr.substring(0, 10);
                          const parts = clean.split('-');
                          if (parts.length < 3) return dStr;
                          return parts[2] + '/' + parts[1] + '/' + parts[0];
                        };

                        const formatRecompensa = (rec: string) => {
                          if (!rec) return '';
                          const parsed = parseBrFloat(rec);
                          if (parsed !== null && !isNaN(parsed)) {
                            return 'R$ ' + parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          }
                          return rec;
                        };

                        const faixasHTML = meta.is_meta_loja
                          ? '<div class="text-xs text-emerald-600 dark:text-emerald-400 font-black">Meta Alvo: R$ ' + (meta.valor_meta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>'
                          : (meta.faixas && meta.faixas.length > 0 
                              ? meta.faixas.map(f => 
                                  '<div class="text-xs text-slate-600 dark:text-slate-400 font-bold mb-0.5 flex items-center gap-1.5">' +
                                  '<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ' + (f.cor || '#6366f1') + '"></span>' +
                                  '• <span style="color: ' + (f.cor || '#6366f1') + '" class="font-black">' + f.nome + '</span>: >= R$ ' + f.valor_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
                                  (f.recompensa ? ' <span class="text-[10px] text-slate-400 dark:text-slate-400 font-normal italic">(' + formatRecompensa(f.recompensa) + ')</span>' : '') +
                                  '</div>'
                                ).join('')
                              : '<span class="text-slate-400 text-xs italic">Nenhuma faixa cadastrada</span>');

                        const tipoCalculoBadge = meta.tipo_calculo === 'bruto'
                          ? '<span class="inline-flex px-2 py-0.5 bg-blue-50 dark:bg-blue-950/45 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 text-[9px] font-black uppercase rounded">Faturamento Bruto</span>'
                          : '<span class="inline-flex px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 text-[9px] font-black uppercase rounded">Lucro Real</span>';

                        const tipoPeriodoBadge = meta.is_meta_loja
                          ? '<span class="inline-flex px-2 py-0.5 bg-teal-50 dark:bg-teal-950/45 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40 text-[9px] font-black uppercase rounded font-bold">Meta Loja</span>'
                          : (meta.is_campanha
                              ? '<span class="inline-flex px-2 py-0.5 bg-purple-50 dark:bg-purple-950/45 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 text-[9px] font-black uppercase rounded">Campanha</span>'
                              : '<span class="inline-flex px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase rounded">Regular</span>');

                        return '<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">' +
                            '<td class="py-4 px-5">' +
                              '<span class="block text-slate-800 dark:text-slate-200 font-bold">' + meta.nome + '</span>' +
                              '<div class="flex items-center gap-1.5 mt-1">' +
                                tipoPeriodoBadge +
                              '</div>' +
                            '</td>' +
                            '<td class="py-4 px-5 text-slate-600 dark:text-slate-400 font-semibold text-xs">' +
                              formatarData(meta.data_inicio) + ' até ' + formatarData(meta.data_fim) +
                            '</td>' +
                            '<td class="py-4 px-5">' +
                              tipoCalculoBadge +
                            '</td>' +
                            '<td class="py-4 px-5">' +
                              '<div class="flex flex-col">' +
                                faixasHTML +
                              '</div>' +
                            '</td>' +
                            '<td class="py-4 px-5 text-right">' +
                              '<div class="flex items-center justify-end gap-2">' +
                                '<button data-id="' + meta.id + '" class="btn-editar-meta px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-indigo-55 dark:bg-indigo-950/30 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition border border-slate-200/40 dark:border-slate-700/40 uppercase">' +
                                  'Editar' +
                                '</button>' +
                                '<button data-id="' + meta.id + '" class="btn-excluir-meta px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-rose-50 dark:bg-rose-950/30 text-slate-400 hover:text-rose-500 transition border border-slate-200/40 dark:border-slate-700/40 uppercase">' +
                                  'Excluir' +
                                '</button>' +
                              '</div>' +
                            '</td>' +
                          '</tr>';
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ` : ''}
        </main>

      </div>
    `;

    if (this.activeTab === 'tipos') {
      this.renderCamposAdicionaisList();
    }
  }

  /**
   * Renderiza a lista de campos adicionais em edição no painel lateral
   */
  private renderCamposAdicionaisList(): void {
    const container = document.getElementById('lista-campos-adicionais-container');
    if (!container) return;

    if (this.camposAdicionaisEmEdicao.length === 0) {
      container.innerHTML = `
        <p class="text-center text-[10px] text-slate-400 dark:text-slate-400 font-semibold py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          Nenhum campo dinâmico configurado.
        </p>
      `;
      return;
    }

    container.innerHTML = this.camposAdicionaisEmEdicao.map((campo, idx) => {
      const isSelect = campo.tipo === 'select';
      return `
        <div class="p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/80 rounded-xl space-y-2 relative animate-fade-in">
          
          <!-- Botão Remover no canto superior direito -->
          <button type="button" data-idx="${idx}" class="btn-remover-campo absolute top-2 right-2 text-slate-400 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition font-bold text-xs">
            ✕
          </button>

          <div class="grid grid-cols-2 gap-2 pr-4">
            <div>
              <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase">Código/ID *</label>
              <input type="text" data-idx="${idx}" data-field="id" required value="${campo.id || ''}" placeholder="ex: cia_aerea" class="input-campo-adicional w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-[10px] transition" />
            </div>
            <div>
              <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase">Rótulo/Label *</label>
              <input type="text" data-idx="${idx}" data-field="label" required value="${campo.label || ''}" placeholder="ex: Cia Aérea" class="input-campo-adicional w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-[10px] transition" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase">Tipo *</label>
              <select data-idx="${idx}" data-field="tipo" class="select-campo-adicional w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-[10px]">
                <option value="text" ${campo.tipo === 'text' ? 'selected' : ''}>Texto</option>
                <option value="number" ${campo.tipo === 'number' ? 'selected' : ''}>Número</option>
                <option value="select" ${campo.tipo === 'select' ? 'selected' : ''}>Opções (Dropdown)</option>
              </select>
            </div>
            <div>
              <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase">Destino *</label>
              <select data-idx="${idx}" data-field="alvo" class="select-campo-adicional w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-[10px]">
                <option value="dados_adicionais" ${campo.alvo === 'dados_adicionais' ? 'selected' : ''}>Metadados</option>
                <option value="fornecedor" ${campo.alvo === 'fornecedor' ? 'selected' : ''}>Fornecedor</option>
                <option value="descricao" ${campo.alvo === 'descricao' ? 'selected' : ''}>Descrição</option>
              </select>
            </div>
          </div>

          <!-- Campo de Opções (Visível apenas se tipo for Select) -->
          <div class="${isSelect ? '' : 'hidden'} select-opcoes-container">
            <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase">Opções (Separadas por vírgula) *</label>
            <input type="text" data-idx="${idx}" data-field="opcoes" placeholder="ex: MSC, Costa, Royal" value="${campo.opcoes ? campo.opcoes.join(', ') : ''}" class="input-campo-adicional w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-[10px] transition" />
          </div>

          <div class="flex items-center mt-1">
            <label class="inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" data-idx="${idx}" data-field="obrigatorio" ${campo.obrigatorio ? 'checked' : ''} class="check-campo-adicional sr-only peer" />
              <div class="w-7 h-4 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500 relative"></div>
              <span class="ml-1.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">Obrigatório</span>
            </label>
          </div>

        </div>
      `;
    }).join('');

    this.setupCamposAdicionaisEvents();
  }

  /**
   * Associa os listeners dos campos adicionais dinâmicos
   */
  private setupCamposAdicionaisEvents(): void {
    const container = document.getElementById('lista-campos-adicionais-container');
    if (!container) return;

    // Sincronizar inputs normais
    container.querySelectorAll('.input-campo-adicional').forEach(input => {
      input.addEventListener('input', (e) => {
        const el = e.target as HTMLInputElement;
        const idx = Number(el.getAttribute('data-idx'));
        const field = el.getAttribute('data-field') as keyof CampoAdicional;
        
        if (field === 'opcoes') {
          this.camposAdicionaisEmEdicao[idx].opcoes = el.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
        } else if (field === 'id') {
          // Normaliza o ID para slug (apenas letras, números e underlines)
          const slug = el.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
          el.value = slug;
          this.camposAdicionaisEmEdicao[idx].id = slug;
        } else {
          (this.camposAdicionaisEmEdicao[idx] as any)[field] = el.value;
        }
      });
    });

    // Sincronizar select
    container.querySelectorAll('.select-campo-adicional').forEach(select => {
      select.addEventListener('change', (e) => {
        const el = e.target as HTMLSelectElement;
        const idx = Number(el.getAttribute('data-idx'));
        const field = el.getAttribute('data-field') as keyof CampoAdicional;

        (this.camposAdicionaisEmEdicao[idx] as any)[field] = el.value;

        // Se o tipo mudou, re-renderizar para mostrar/esconder o campo de opções
        if (field === 'tipo') {
          if (el.value !== 'select') {
            delete this.camposAdicionaisEmEdicao[idx].opcoes;
          } else {
            this.camposAdicionaisEmEdicao[idx].opcoes = [];
          }
          this.renderCamposAdicionaisList();
        }
      });
    });

    // Sincronizar checkbox de obrigatoriedade
    container.querySelectorAll('.check-campo-adicional').forEach(check => {
      check.addEventListener('change', (e) => {
        const el = e.target as HTMLInputElement;
        const idx = Number(el.getAttribute('data-idx'));
        this.camposAdicionaisEmEdicao[idx].obrigatorio = el.checked;
      });
    });

    // Remover campo
    container.querySelectorAll('.btn-remover-campo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLButtonElement;
        const idx = Number(el.getAttribute('data-idx'));
        this.camposAdicionaisEmEdicao.splice(idx, 1);
        this.renderCamposAdicionaisList();
      });
    });
  }

  /**
   * Associa os eventos gerais da tela
   */
  private setupEventListeners(): void {
    // 0. Alternar Abas (Tabs)
    document.getElementById('tab-tipos-servicos')?.addEventListener('click', () => {
      this.activeTab = 'tipos';
      this.render();
      this.setupEventListeners();
    });

    document.getElementById('tab-gestao-destinos')?.addEventListener('click', () => {
      this.activeTab = 'destinos';
      this.render();
      this.setupEventListeners();
    });

    document.getElementById('tab-formas-recebimento')?.addEventListener('click', () => {
      this.activeTab = 'formas';
      this.render();
      this.setupEventListeners();
    });

    document.getElementById('tab-campanhas-btn')?.addEventListener('click', () => {
      this.activeTab = 'campanhas';
      this.render();
      this.setupEventListeners();
    });

    document.getElementById('tab-templates-btn')?.addEventListener('click', () => {
      this.activeTab = 'templates';
      this.render();
      this.setupEventListeners();
    });

    document.getElementById('tab-metas-btn')?.addEventListener('click', () => {
      this.activeTab = 'metas';
      this.render();
      this.setupEventListeners();
    });

    if (this.activeTab === 'campanhas') {
      this.setupCampanhasEvents();
    }

    if (this.activeTab === 'templates') {
      this.setupTemplatesEvents();
    }

    if (this.activeTab === 'metas') {
      this.setupMetasEvents();
    }

    if (this.activeTab === 'tipos') {
      // 1. Botão Adicionar Campo Adicional
      document.getElementById('btn-adicionar-campo-adicional')?.addEventListener('click', () => {
        this.camposAdicionaisEmEdicao.push({
          id: 'campo_' + Date.now().toString().slice(-4),
          label: '',
          tipo: 'text',
          obrigatorio: false,
          alvo: 'dados_adicionais'
        });
        this.renderCamposAdicionaisList();
      });

      // 2. Submissão do Formulário de Tipo
      const form = document.getElementById('form-cadastro-tipo') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.salvarTipoProduto();
      });

      // 3. Botão Cancelar Edição
      document.getElementById('btn-cancelar-edicao')?.addEventListener('click', () => {
        this.resetForm();
      });

      // 4. Botões de Ação na Tabela (Editar e Toggle Status)
      const btnEditar = this.container.querySelectorAll('.btn-editar-tipo');
      btnEditar.forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const tipo = this.tiposProduto.find(t => t.id === id);
          if (tipo) {
            this.prepararEdicao(tipo);
          }
        });
      });

      const btnToggle = this.container.querySelectorAll('.btn-toggle-ativo-tipo');
      btnToggle.forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const tipo = this.tiposProduto.find(t => t.id === id);
          if (tipo) {
            await this.toggleAtivoTipo(tipo);
          }
        });
      });
    } else if (this.activeTab === 'destinos') {
      // ABA: GESTÃO DE DESTINOS
      // A. Input de Busca
      const inputBusca = document.getElementById('input-busca-destino') as HTMLInputElement;
      inputBusca?.addEventListener('input', () => {
        this.buscaDestinoTermo = inputBusca.value;
        this.renderDestinosTableBodyOnly();
      });

      // B. Submissão do Formulário de Destino
      const formDestino = document.getElementById('form-cadastro-destino') as HTMLFormElement;
      formDestino?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.salvarDestino();
      });

      // C. Cancelar Edição de Destino
      document.getElementById('btn-cancelar-destino-edicao')?.addEventListener('click', () => {
        this.editandoDestinoId = null;
        this.render();
        this.setupEventListeners();
      });

      // D. Botões de Ação na Tabela (Editar e Excluir)
      this.container.querySelectorAll('.btn-editar-destino').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          if (id) {
            this.editandoDestinoId = id;
            this.render();
            this.setupEventListeners();
          }
        });
      });

      this.container.querySelectorAll('.btn-excluir-destino').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (id) {
            await this.excluirDestino(id);
          }
        });
      });
    } else if (this.activeTab === 'formas') {
      // 1. Seleção de ícones no grid
      this.container.querySelectorAll('.btn-select-icone-forma').forEach(btn => {
        btn.addEventListener('click', () => {
          const ico = btn.getAttribute('data-icon') || '💵';
          this.selectedIconForma = ico;
          const inputIcone = document.getElementById('input-forma-icone') as HTMLInputElement;
          if (inputIcone) inputIcone.value = ico;
          this.render();
          this.setupEventListeners();
        });
      });

      // 2. Submissão do formulário de forma
      const formForma = document.getElementById('form-cadastro-forma') as HTMLFormElement;
      formForma?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.salvarFormaRecebimento();
      });

      // 3. Cancelar Edição de Forma
      document.getElementById('btn-cancelar-forma-edicao')?.addEventListener('click', () => {
        this.editandoFormaId = null;
        this.selectedIconForma = '💵';
        this.render();
        this.setupEventListeners();
      });

      // 4. Botão Editar Forma
      this.container.querySelectorAll('.btn-editar-forma').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const forma = this.formasRecebimento.find(f => f.id === id);
          if (forma) {
            this.prepararEdicaoForma(forma);
          }
        });
      });

      // 5. Botão Toggle Ativo (Tomara)
      this.container.querySelectorAll('.btn-toggle-ativo-forma').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const forma = this.formasRecebimento.find(f => f.id === id);
          if (forma) {
            await this.toggleAtivoForma(forma);
          }
        });
      });
    }
  }

  /**
   * Atualiza apenas o corpo da tabela de destinos para evitar re-renderizar todo o formulário
   */
  private renderDestinosTableBodyOnly(): void {
    const tbody = document.getElementById('lista-destinos-body');
    if (!tbody) return;

    const query = this.buscaDestinoTermo.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtered = this.destinos.filter(d => {
      const nomeClean = d.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const paisClean = d.pais.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nomeClean.includes(query) || paisClean.includes(query);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="py-8 text-center text-xs text-slate-400 dark:text-slate-400 font-semibold">
            Nenhum destino encontrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(d => {
      const isArrumar = d.nome.startsWith('ARRUMAR | ');
      const displayName = isArrumar ? d.nome.replace('ARRUMAR | ', '⚠️ Arrumar: ') : d.nome;
      const displayPais = isArrumar ? '<span class="text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Pendente</span>' : d.pais;
      return `
        <tr class="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors animate-fade-in">
          <td class="py-3 px-4">${displayName}</td>
          <td class="py-3 px-4">${displayPais}</td>
          <td class="py-3 px-4 text-right space-x-2">
            <button data-id="${d.id}" class="btn-editar-destino p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition" title="Editar Destino">
              ✏️
            </button>
            <button data-id="${d.id}" class="btn-excluir-destino p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition" title="Excluir Destino">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Reassociar eventos aos botões
    tbody.querySelectorAll('.btn-editar-destino').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          this.editandoDestinoId = id;
          this.render();
          this.setupEventListeners();
        }
      });
    });

    tbody.querySelectorAll('.btn-excluir-destino').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          await this.excluirDestino(id);
        }
      });
    });
  }

  /**
   * Salva ou atualiza o destino no Supabase
   */
  private async salvarDestino(): Promise<void> {
    const nomeVal = (document.getElementById('input-destino-nome') as HTMLInputElement).value.trim();
    const paisVal = (document.getElementById('input-destino-pais') as HTMLInputElement).value.trim();

    if (!nomeVal || !paisVal) {
      this.showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    // Verificar duplicidade antes de inserir/atualizar (case-insensitive)
    const normalizedNome = nomeVal.toLowerCase();
    const normalizedPais = paisVal.toLowerCase();

    const duplicado = this.destinos.find(d => 
      d.id !== this.editandoDestinoId && 
      d.nome.toLowerCase() === normalizedNome && 
      d.pais.toLowerCase() === normalizedPais
    );

    if (duplicado) {
      this.showToast(`O destino "${nomeVal}, ${paisVal}" já está cadastrado.`, 'error');
      return;
    }

    const payload = {
      nome: nomeVal,
      pais: paisVal,
      updated_at: new Date().toISOString()
    };

    try {
      if (this.editandoDestinoId) {
        const { error } = await supabase
          .from('destinos')
          .update(payload)
          .eq('id', this.editandoDestinoId);

        if (error) throw error;
        this.showToast('Destino atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('destinos')
          .insert(payload);

        if (error) throw error;
        this.showToast('Destino cadastrado com sucesso!', 'success');
      }

      this.editandoDestinoId = null;
      await this.loadDestinos();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro ao salvar destino:', err);
      this.showToast('Falha ao salvar destino.', 'error', err);
    }
  }

  /**
   * Exclui um destino do banco de dados
   */
  private async excluirDestino(id: string): Promise<void> {
    const destino = this.destinos.find(d => d.id === id);
    if (!destino) return;

    const confirm = await showCustomConfirm(
      `Tem certeza que deseja excluir o destino "${destino.nome}, ${destino.pais}"? O histórico de viagens e orçamentos que utilizam este destino permanecerá, mas o vínculo de destino_id será removido.`,
      'Excluir Destino'
    );

    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('destinos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.showToast('Destino excluído com sucesso!', 'success');
      await this.loadDestinos();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro ao excluir destino:', err);
      this.showToast('Falha ao excluir destino do banco.', 'error', err);
    }
  }

  private async loadFormasRecebimento(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('formas_recebimento')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.warn('Erro ao carregar formas do Supabase, carregando local:', error);
        this.loadFormasRecebimentoLocal();
      } else {
        this.formasRecebimento = data || [];
        localStorage.setItem('paxflow-formas-recebimento', JSON.stringify(this.formasRecebimento));
      }
    } catch (err: any) {
      console.warn('Erro ao buscar formas de recebimento, carregando local:', err);
      this.loadFormasRecebimentoLocal();
    }
  }

  private loadFormasRecebimentoLocal(): void {
    const saved = localStorage.getItem('paxflow-formas-recebimento');
    if (saved) {
      try {
        this.formasRecebimento = JSON.parse(saved);
        // Garante que DESCONTO e PREJUÍZO estejam presentes no array do localStorage
        const nomesFormas = this.formasRecebimento.map(f => (f.nome || '').trim().toUpperCase());
        let alterou = false;
        if (!nomesFormas.includes('DESCONTO')) {
          this.formasRecebimento.push({ id: 'forma-desconto', nome: 'DESCONTO', icone: '🏷️', ativo: true });
          alterou = true;
        }
        if (!nomesFormas.includes('PREJUÍZO') && !nomesFormas.includes('PREJUIZO')) {
          this.formasRecebimento.push({ id: 'forma-prejuizo', nome: 'PREJUÍZO', icone: '📉', ativo: true });
          alterou = true;
        }
        if (alterou) {
          localStorage.setItem('paxflow-formas-recebimento', JSON.stringify(this.formasRecebimento));
        }
      } catch (e) {
        this.formasRecebimento = [];
      }
    } else {
      this.formasRecebimento = [
        { id: 'forma-pix', nome: 'PIX', icone: '🏦', ativo: true },
        { id: 'forma-credito', nome: 'Cartão de Crédito', icone: '💳', ativo: true },
        { id: 'forma-dinheiro', nome: 'Dinheiro', icone: '💵', ativo: true },
        { id: 'forma-boleto', nome: 'Boleto Bancário', icone: '🧾', ativo: true },
        { id: 'forma-desconto', nome: 'DESCONTO', icone: '🏷️', ativo: true },
        { id: 'forma-prejuizo', nome: 'PREJUÍZO', icone: '📉', ativo: true }
      ];
      localStorage.setItem('paxflow-formas-recebimento', JSON.stringify(this.formasRecebimento));
    }
  }

  private async salvarFormaRecebimento(): Promise<void> {
    const nomeVal = (document.getElementById('input-forma-nome') as HTMLInputElement).value.trim();
    const iconeVal = (document.getElementById('input-forma-icone') as HTMLInputElement).value;

    if (!nomeVal) {
      this.showToast('Por favor, insira o Tipo de Recebimento.', 'error');
      return;
    }

    const payload = {
      nome: nomeVal,
      icone: iconeVal,
      ativo: true
    };

    try {
      if (this.editandoFormaId) {
        if (this.editandoFormaId.startsWith('forma_local_') || this.formasRecebimento.find(f => f.id === this.editandoFormaId)?.id.startsWith('forma_local_')) {
          throw new Error('Edição local apenas');
        }
        const { error } = await supabase
          .from('formas_recebimento')
          .update(payload)
          .eq('id', this.editandoFormaId);

        if (error) throw error;
        this.showToast('Forma de recebimento atualizada com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('formas_recebimento')
          .insert(payload);

        if (error) throw error;
        this.showToast('Forma de recebimento cadastrada com sucesso!', 'success');
      }

      this.editandoFormaId = null;
      this.selectedIconForma = '💵';
      await this.loadFormasRecebimento();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.warn('Salvando forma localmente devido a falha ou ID local:', err);
      let localFormas = [...this.formasRecebimento];
      if (this.editandoFormaId) {
        localFormas = localFormas.map(f => {
          if (f.id === this.editandoFormaId) {
            return { ...f, nome: nomeVal, icone: iconeVal };
          }
          return f;
        });
        this.showToast('Forma de recebimento atualizada localmente!', 'success');
      } else {
        const novaForma = {
          id: 'forma_local_' + Date.now().toString(),
          nome: nomeVal,
          icone: iconeVal,
          ativo: true
        };
        localFormas.push(novaForma);
        this.showToast('Forma de recebimento cadastrada localmente!', 'success');
      }
      this.formasRecebimento = localFormas;
      localStorage.setItem('paxflow-formas-recebimento', JSON.stringify(localFormas));

      this.editandoFormaId = null;
      this.selectedIconForma = '💵';
      this.render();
      this.setupEventListeners();
    }
  }

  private async toggleAtivoForma(forma: any): Promise<void> {
    if (['DESCONTO', 'PREJUÍZO'].includes((forma.nome || '').trim().toUpperCase())) {
      this.showToast('Este método de recebimento é fixo do sistema e não pode ser desativado.', 'error');
      return;
    }
    const novoStatus = !forma.ativo;
    try {
      if (forma.id.startsWith('forma_local_')) {
        throw new Error('Forma local');
      }
      const { error } = await supabase
        .from('formas_recebimento')
        .update({ ativo: novoStatus })
        .eq('id', forma.id);

      if (error) throw error;
      this.showToast(`Forma de recebimento ${novoStatus ? 'ativada' : 'desativada'} com sucesso!`, 'success');
      
      await this.loadFormasRecebimento();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.warn('Erro ao atualizar no Supabase, alterando local:', err);
      const localFormas = this.formasRecebimento.map(f => {
        if (f.id === forma.id) {
          return { ...f, ativo: novoStatus };
        }
        return f;
      });
      this.formasRecebimento = localFormas;
      localStorage.setItem('paxflow-formas-recebimento', JSON.stringify(localFormas));
      this.showToast(`Forma de recebimento ${novoStatus ? 'ativada' : 'desativada'} localmente!`, 'success');

      this.render();
      this.setupEventListeners();
    }
  }

  private prepararEdicaoForma(forma: any): void {
    this.editandoFormaId = forma.id;
    this.selectedIconForma = forma.icone;
    this.render();
    this.setupEventListeners();
  }

  /**
   * Prepara o formulário para edição de um tipo existente
   */
  private prepararEdicao(tipo: TipoProduto): void {
    this.editandoTipoId = tipo.id;

    // Copia os campos adicionais para edição
    this.camposAdicionaisEmEdicao = JSON.parse(JSON.stringify(tipo.campos_adicionais || []));

    // Re-renderiza o form
    this.render();
    this.setupEventListeners();
  }

  /**
   * Reseta o formulário para o estado de "Adicionar Novo"
   */
  private resetForm(): void {
    this.editandoTipoId = null;
    this.camposAdicionaisEmEdicao = [];
    
    this.render();
    this.setupEventListeners();
  }

  /**
   * Envia as alterações ou inserções para o Supabase (Tipos de Produto)
   */
  private async salvarTipoProduto(): Promise<void> {
    const nomeVal = (document.getElementById('input-tipo-nome') as HTMLInputElement).value.trim();
    const iconeVal = (document.getElementById('input-tipo-icone') as HTMLInputElement).value.trim();
    const ativoVal = (document.getElementById('check-tipo-ativo') as HTMLInputElement).checked;

    if (!nomeVal || !iconeVal) {
      this.showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    // Validar slugs dos campos dinâmicos
    const idsSet = new Set<string>();
    for (const campo of this.camposAdicionaisEmEdicao) {
      if (!campo.id) {
        this.showToast('Todos os campos adicionais precisam ter um código/ID.', 'error');
        return;
      }
      if (!campo.label) {
        this.showToast(`O campo com ID "${campo.id}" precisa ter um rótulo/label.`, 'error');
        return;
      }
      if (idsSet.has(campo.id)) {
        this.showToast(`O ID de campo "${campo.id}" está duplicado. Use identificadores únicos.`, 'error');
        return;
      }
      if (campo.tipo === 'select' && (!campo.opcoes || campo.opcoes.length === 0)) {
        this.showToast(`O campo do tipo opções "${campo.label}" precisa ter pelo menos uma opção definida.`, 'error');
        return;
      }
      idsSet.add(campo.id);
    }

    const payload = {
      nome: nomeVal,
      icone: iconeVal,
      ativo: ativoVal,
      campos_adicionais: this.camposAdicionaisEmEdicao,
      updated_at: new Date().toISOString()
    };

    try {
      if (this.editandoTipoId) {
        const { error } = await supabase
          .from('tipos_produto')
          .update(payload)
          .eq('id', this.editandoTipoId);

        if (error) throw error;
        this.showToast('Tipo de produto atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('tipos_produto')
          .insert(payload);

        if (error) throw error;
        this.showToast('Tipo de produto cadastrado com sucesso!', 'success');
      }

      // Recarregar e resetar
      this.resetForm();
      await this.loadTiposProduto();
      this.render();
      this.setupEventListeners();

    } catch (err: any) {
      console.error('Erro ao salvar tipo de produto:', err);
      this.showToast('Falha ao salvar tipo de produto.', 'error', err);
    }
  }

  /**
   * Ativa ou desativa um tipo de produto/serviço
   */
  private async toggleAtivoTipo(tipo: TipoProduto): Promise<void> {
    const confirm = await showCustomConfirm(
      `Deseja realmente ${tipo.ativo ? 'desativar' : 'ativar'} o tipo de serviço "${tipo.nome}"?`,
      'Alterar Status'
    );

    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('tipos_produto')
        .update({ ativo: !tipo.ativo })
        .eq('id', tipo.id);

      if (error) throw error;

      this.showToast(`Tipo "${tipo.nome}" ${!tipo.ativo ? 'ativado' : 'desativado'} com sucesso!`, 'success');
      await this.loadTiposProduto();
      this.render();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('Erro ao alternar status do tipo:', err);
      this.showToast('Erro ao atualizar status do tipo.', 'error', err);
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

  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-white border border-slate-200 p-8 rounded-2xl shadow-xl text-center">
          <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
          <h2 class="text-xl font-bold text-slate-800 mb-2">Erro de Carregamento</h2>
          <p class="text-slate-500 text-sm mb-6">${msg}</p>
        </div>
      </div>
    `;
  }

  // --- MIGRATED METHODS FOR CAMPAIGNS, TEMPLATES AND GOALS ---

  private async loadCampaigns(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.campaigns = data || [];
    } catch (err: any) {
      console.error('Erro ao carregar campanhas:', err);
    }
  }

  private async loadTemplates(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('templates_mensagem')
        .select('*')
        .order('titulo', { ascending: true });

      if (error) throw error;
      this.templates = data || [];
    } catch (err: any) {
      console.error('Erro ao carregar templates de mensagem:', err);
      this.showToast('Erro ao carregar modelos de mensagens do banco.', 'error', err);
    }
  }

  private async loadMetas(): Promise<void> {
    try {
      this.metas = await MetasService.obterMetaPeriodos();
    } catch (err: any) {
      console.error('Erro ao carregar metas financeiras:', err);
    }
  }

  private setupCampanhasEvents(): void {
    // Abrir modal de criação
    document.getElementById('btn-nova-campanha')?.addEventListener('click', () => this.abrirModalNovaCampanha());

    // Toggle status ativa/inativa
    document.querySelectorAll('.btn-toggle-status-campanha').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const active = (e.currentTarget as HTMLElement).getAttribute('data-active') === 'true';
        if (!id) return;
        
        try {
          const { error } = await supabase
            .from('campaigns')
            .update({ ativa: !active })
            .eq('id', id);

          if (error) throw error;
          
          this.showToast(`Campanha ${!active ? 'ativada' : 'pausada'} com sucesso!`, 'success');
          await this.loadCampaigns();
          this.render();
          this.setupEventListeners();
        } catch (err: any) {
          console.error(err);
          this.showToast('Erro ao atualizar status da campanha.', 'error');
        }
      });
    });

    // Excluir campanha
    document.querySelectorAll('.btn-excluir-campanha').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (!id) return;
        
        const confirmResult = await showCustomConfirm('Deseja realmente excluir esta campanha permanentemente?', 'Excluir Campanha');
        if (confirmResult) {
          try {
            const { error } = await supabase
              .from('campaigns')
              .delete()
              .eq('id', id);

            if (error) throw error;
            
            this.showToast('Campanha excluída com sucesso!', 'success');
            await this.loadCampaigns();
            this.render();
            this.setupEventListeners();
          } catch (err: any) {
            console.error(err);
            this.showToast('Erro ao excluir campanha.', 'error');
          }
        }
      });
    });
  }

  private setupTemplatesEvents(): void {
    // Abrir modal de criação
    document.getElementById('btn-novo-template')?.addEventListener('click', () => this.abrirModalNovoTemplate());

    // Editar template
    document.querySelectorAll('.btn-editar-template').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.abrirModalNovoTemplate(id);
      });
    });

    // Excluir template
    document.querySelectorAll('.btn-excluir-template').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (!id) return;
        
        const confirmResult = await showCustomConfirm('Deseja realmente excluir este modelo de mensagem permanentemente?', 'Excluir Modelo');
        if (confirmResult) {
          try {
            const { error } = await supabase
              .from('templates_mensagem')
              .delete()
              .eq('id', id);

            if (error) throw error;
            
            this.showToast('Modelo de mensagem excluído com sucesso!', 'success');
            await this.loadTemplates();
            this.render();
            this.setupEventListeners();
          } catch (err: any) {
            console.error(err);
            this.showToast('Erro ao excluir modelo de mensagem.', 'error');
          }
        }
      });
    });
  }

  private setupMetasEvents(): void {
    const deleteButtons = document.querySelectorAll('.btn-excluir-meta');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;

        const confirm = await showCustomConfirm(
          'Deseja realmente excluir este período de meta? Todas as faixas associadas serão excluídas definitivamente.',
          'Confirmar Exclusão de Meta'
        );

        if (confirm) {
          try {
            await MetasService.excluirMetaPeriodo(id);
            this.showToast('Período de meta excluído com sucesso!', 'success');
            await this.loadMetas();
            this.render();
            this.setupEventListeners();
          } catch (err: any) {
            this.showToast('Erro ao excluir meta.', 'error');
          }
        }
      });
    });

    const editButtons = document.querySelectorAll('.btn-editar-meta');
    editButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        this.abrirModalEditarMeta(id);
      });
    });

    document.getElementById('btn-nova-meta')?.addEventListener('click', () => {
      this.abrirModalNovaMeta();
    });
  }

  private abrirModalNovoTemplate(templateId?: string): void {
    const editando = this.templates.find(t => t.id === templateId);
    
    const overlay = document.createElement('div');
    overlay.id = 'novo-template-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[500px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar relative" id="novo-template-card">
        
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
          <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl flex items-center justify-center text-xl border border-indigo-100/40 mb-3">
            💬
          </div>
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">${editando ? 'Editar Modelo' : 'Criar Novo Modelo'}</h2>
          <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">Configure o texto da mensagem e as variáveis de substituição</p>
        </div>

        <form id="form-novo-template" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Título do Modelo *</label>
            <input id="input-tem-titulo" type="text" required value="${editando ? editando.titulo : ''}" placeholder="Ex: Boas-vindas Pós-Viagem" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Descrição / Finalidade *</label>
            <input id="input-tem-descricao" type="text" required value="${editando ? editando.descricao : ''}" placeholder="Ex: Mensagem enviada após o retorno, com NPS." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center justify-between">
              <span>Conteúdo da Mensagem *</span>
              <span class="text-[9px] text-slate-400 dark:text-slate-400 font-semibold lowercase">variáveis suportadas: {{cliente}}, {{destino}}, {{localizador}}, etc.</span>
            </label>
            <div class="flex flex-wrap gap-1.5 mb-2.5 select-none" id="container-variaveis-pills">
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{cliente}}">📋 {{cliente}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{destino}}">✈️ {{destino}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{localizador}}">🔑 {{localizador}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{consultor}}">👤 {{consultor}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{link_itinerario}}">🔗 {{link_itinerario}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{link_feedback}}">⭐ {{link_feedback}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{data_ida}}">📅 {{data_ida}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{data_volta}}">📅 {{data_volta}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{valor_total}}">💰 {{valor_total}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{nome_agencia}}">🏢 {{nome_agencia}}</span>
              <span class="var-pill cursor-pointer px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1" draggable="true" data-var="{{contato_consultor}}">📞 {{contato_consultor}}</span>
            </div>
            <textarea id="input-tem-conteudo" required rows="6" placeholder="Olá, {{cliente}}! Como foi sua viagem para {{destino}}?..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs resize-none">${editando ? editando.conteudo : ''}</textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Variáveis do Sistema Utilizadas (separadas por vírgula) *</label>
            <input id="input-tem-variaveis" type="text" required value="${editando && editando.variaveis_suportadas ? editando.variaveis_suportadas.join(', ') : 'cliente, destino, consultor'}" placeholder="cliente, destino, localizador, consultor, link_itinerario, link_feedback" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            <p class="text-[9px] text-slate-400 dark:text-slate-400 font-semibold mt-1">Insira exatamente as variáveis que você usou entre {{ }} no texto (ex: cliente, destino, consultor).</p>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-tem-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition uppercase">
              Cancelar
            </button>
            <button id="btn-tem-submit" type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20 uppercase tracking-wider flex items-center justify-center">
              ${editando ? 'Salvar Alterações' : 'Criar Modelo'}
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Configurar Drag & Drop e Clique nas variáveis
    const textarea = overlay.querySelector('#input-tem-conteudo') as HTMLTextAreaElement;
    const inputVariaveis = overlay.querySelector('#input-tem-variaveis') as HTMLInputElement;
    const pills = overlay.querySelectorAll('.var-pill');

    const sincronizarVariavelNoInput = (varName: string) => {
      const cleanVarName = varName.replace(/[{}]/g, '').trim();
      const currentVars = inputVariaveis.value.split(',').map(v => v.trim()).filter(v => v !== '');
      if (!currentVars.includes(cleanVarName)) {
        currentVars.push(cleanVarName);
        inputVariaveis.value = currentVars.join(', ');
      }
    };

    const inserirTextoNaPosicaoCursor = (textoParaInserir: string) => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const originalText = textarea.value;
      textarea.value = originalText.substring(0, start) + textoParaInserir + originalText.substring(end);
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textoParaInserir.length;
      sincronizarVariavelNoInput(textoParaInserir);
    };

    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const varName = (pill as HTMLElement).dataset.var || '';
        inserirTextoNaPosicaoCursor(varName);
      });

      pill.addEventListener('dragstart', (e: any) => {
        e.dataTransfer.setData('text/plain', (pill as HTMLElement).dataset.var || '');
      });
    });

    textarea.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    textarea.addEventListener('drop', (e: any) => {
      e.preventDefault();
      const varName = e.dataTransfer.getData('text/plain');
      if (varName && varName.startsWith('{{')) {
        inserirTextoNaPosicaoCursor(varName);
      }
    });

    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('novo-template-card')?.classList.remove('scale-95');
      document.getElementById('novo-template-card')?.classList.add('scale-100');
    }, 10);

    const fechar = () => {
      overlay.classList.remove('opacity-100');
      document.getElementById('novo-template-card')?.classList.remove('scale-100');
      document.getElementById('novo-template-card')?.classList.add('scale-95');
      setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('btn-tem-cancel')?.addEventListener('click', fechar);

    const form = document.getElementById('form-novo-template') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('btn-tem-submit') as HTMLButtonElement;
      const titulo = (document.getElementById('input-tem-titulo') as HTMLInputElement).value;
      const descricao = (document.getElementById('input-tem-descricao') as HTMLInputElement).value;
      const conteudo = (document.getElementById('input-tem-conteudo') as HTMLTextAreaElement).value;
      const variaveisRaw = (document.getElementById('input-tem-variaveis') as HTMLInputElement).value;
      const variaveis = variaveisRaw.split(',').map(v => v.trim()).filter(v => v !== '');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Gravando...';

      try {
        const payload = {
          titulo,
          descricao,
          conteudo,
          variaveis_suportadas: variaveis
        };

        let dbResult;
        if (editando) {
          dbResult = await supabase
            .from('templates_mensagem')
            .update(payload)
            .eq('id', editando.id);
        } else {
          dbResult = await supabase
            .from('templates_mensagem')
            .insert(payload);
        }

        if (dbResult.error) throw dbResult.error;

        this.showToast(editando ? 'Modelo atualizado com sucesso!' : 'Modelo criado com sucesso!', 'success');
        fechar();
        await this.loadTemplates();
        this.render();
        this.setupEventListeners();

      } catch (err: any) {
        console.error('Erro ao gravar modelo de mensagem:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = editando ? 'Salvar Alterações' : 'Criar Modelo';
        showCustomAlert('Erro ao gravar modelo de mensagem.', 'Erro');
      }
    });
  }

  private abrirModalNovaCampanha(): void {
    const overlay = document.createElement('div');
    overlay.id = 'nova-campanha-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';
    
    // Obter lista de medalhas do BADGE_DEFINITIONS
    const badgeOptions = BADGE_DEFINITIONS.map(b => `
      <option value="${b.key}">${b.emoji} ${b.nome} (${b.categoria})</option>
    `).join('');

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[500px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar relative" id="nova-campanha-card">
        
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
          <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl flex items-center justify-center text-xl border border-indigo-100/40 mb-3">
            🎯
          </div>
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">Criar Nova Campanha</h2>
          <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">Configure o período, o parâmetro do processo e a recompensa</p>
        </div>

        <form id="form-nova-campanha" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Título da Campanha *</label>
            <input id="input-cam-titulo" type="text" required placeholder="Ex: Meta de Vendas de Agosto" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Descrição / Regras *</label>
            <textarea id="input-cam-descricao" required rows="3" placeholder="Descreva os detalhes e regras da campanha..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm resize-none"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Data de Início *</label>
              <input id="input-cam-inicio" type="date" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Data de Fim *</label>
              <input id="input-cam-fim" type="date" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Métrica da Meta *</label>
              <select id="select-cam-tipo" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="venda_aceita" selected>Vendas Aceitas</option>
                <option value="cliente_criado">Clientes Cadastrados</option>
                <option value="xp_acumulado">XP Acumulado</option>
                <option value="lembrete_criado">Lembretes Criados</option>
                <option value="reembolso_pago">Reembolsos Pagos</option>
                <option value="produto_detalhado">Produtos Detalhados</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Quantidade Meta *</label>
              <input id="input-cam-quantidade" type="number" min="1" required value="5" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Medalha de Recompensa (Badge) *</label>
            <select id="select-cam-badge" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm select-badge-campaign">
              ${badgeOptions}
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-cam-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition uppercase">
              Cancelar
            </button>
            <button id="btn-cam-submit" type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20 uppercase tracking-wider flex items-center justify-center">
              Criar Campanha
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('nova-campanha-card')?.classList.remove('scale-95');
      document.getElementById('nova-campanha-card')?.classList.add('scale-100');
    }, 10);

    const fechar = () => {
      overlay.classList.remove('opacity-100');
      document.getElementById('nova-campanha-card')?.classList.remove('scale-100');
      document.getElementById('nova-campanha-card')?.classList.add('scale-95');
      setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('btn-cam-cancel')?.addEventListener('click', fechar);

    const form = document.getElementById('form-nova-campanha') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('btn-cam-submit') as HTMLButtonElement;
      const titulo = (document.getElementById('input-cam-titulo') as HTMLInputElement).value;
      const descricao = (document.getElementById('input-cam-descricao') as HTMLInputElement).value;
      const data_inicio = (document.getElementById('input-cam-inicio') as HTMLInputElement).value;
      const data_fim = (document.getElementById('input-cam-fim') as HTMLInputElement).value;
      const tipo_meta = (document.getElementById('select-cam-tipo') as HTMLSelectElement).value;
      const meta_quantidade = Number((document.getElementById('input-cam-quantidade') as HTMLInputElement).value);
      const badge_key = (document.getElementById('select-cam-badge') as HTMLSelectElement).value;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Criando...';

      try {
        // 1. Inserir campanha no banco
        const { data: camData, error: camError } = await supabase
          .from('campaigns')
          .insert({
            titulo,
            descricao,
            data_inicio,
            data_fim,
            tipo_meta,
            meta_quantidade,
            badge_key,
            ativa: true
          })
          .select()
          .single();

        if (camError) throw camError;

        // 2. Criar notificações para todos os consultores (para que eles vejam no Inbox e no login)
        const { data: perfis, error: pErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('ativo', true);

        if (!pErr && perfis && perfis.length > 0) {
          const notificationsPayload = perfis.map(p => ({
            user_id: p.id,
            tipo_item: 'campanha',
            comentario_id: null,
            mensagem_id: null,
            item_id: camData.id,
            parent_id: camData.id,
            campaign_id: camData.id,
            lida: false,
            arquivada: false
          }));

          await supabase.from('notificacoes').insert(notificationsPayload);
        }

        this.showToast('Campanha criada com sucesso e equipe notificada!', 'success');
        fechar();
        await this.loadCampaigns();
        this.render();
        this.setupEventListeners();

      } catch (err: any) {
        console.error('Erro ao criar campanha:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Campanha';
        showCustomAlert(`Falha ao criar campanha: ${err.message}`, 'Erro');
      }
    });
  }

  private abrirModalNovaMeta(): void {
    const aplicarMascaraMonetaria = (inputEl: HTMLInputElement) => {
      inputEl.addEventListener('input', (e) => {
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
    };

    const overlay = document.createElement('div');
    overlay.id = 'nova-meta-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[550px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar" id="nova-meta-card">
        
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
          <div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold rounded-2xl flex items-center justify-center text-xl border border-emerald-100 mb-3">
            📅
          </div>
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">Criar Período de Metas</h2>
          <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">Crie metas financeiras de faturamento e faixas de premiação</p>
        </div>

        <form id="form-nova-meta" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome do Período *</label>
            <input id="input-meta-nome" type="text" required placeholder="Ex: Metas de Agosto 2026, Campanha Ouro..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Data de Início *</label>
              <input id="input-meta-inicio" type="date" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Data de Fim *</label>
              <input id="input-meta-fim" type="date" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Cálculo baseado em *</label>
              <select id="select-meta-calculo" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="bruto" selected>Faturamento Bruto (Total das Vendas)</option>
                <option value="liquido">Markup / Lucro Estimado</option>
              </select>
            </div>

            <div class="flex items-center gap-6 pt-5">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input id="input-meta-campanha" type="checkbox" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5" />
                <span class="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase">É Campanha</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input id="input-meta-loja" type="checkbox" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5" />
                <span class="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase">Meta Global Loja</span>
              </label>
            </div>
          </div>

          <div id="wrapper-meta-loja" class="hidden">
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Valor da Meta Global da Loja (R$) *</label>
            <input id="input-meta-valor-loja" type="text" value="0,00" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-bold text-sm text-right" />
          </div>

          <!-- Seção de Faixas de Premiação -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faixas de Premiação / Metas</h3>
              <button id="btn-add-faixa" type="button" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-155 text-indigo-650 rounded-lg text-[10px] font-black uppercase tracking-wider transition">
                + Adicionar Faixa
              </button>
            </div>
            
            <div class="space-y-2" id="container-faixas-premios">
              <!-- Grid dinâmico de faixas -->
              <div class="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150/40 dark:border-slate-800/40 target-faixa-row">
                <div class="col-span-3">
                  <input type="text" placeholder="Nome Faixa" required class="input-faixa-nome w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100" value="Bronze" />
                </div>
                <div class="col-span-3">
                  <input type="text" placeholder="Valor Mín. (R$)" required class="input-faixa-valor w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 text-right" value="10.000,00" />
                </div>
                <div class="col-span-4">
                  <input type="text" placeholder="Recompensa / Bônus" class="input-faixa-recompensa w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100" value="Recompensa Bronze" />
                </div>
                <div class="col-span-1.5 flex items-center justify-center">
                  <input type="color" class="input-faixa-cor w-7 h-7 rounded border border-slate-250 cursor-pointer" value="#b45309" />
                </div>
                <div class="col-span-0.5 flex justify-end">
                  <button type="button" class="btn-remove-faixa text-rose-500 hover:text-rose-700 font-bold text-xs p-1">❌</button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-meta-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition uppercase">
              Cancelar
            </button>
            <button id="btn-meta-submit" type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 uppercase tracking-wider flex items-center justify-center">
              Criar Meta / Campanha
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Aplicar máscaras
    aplicarMascaraMonetaria(overlay.querySelector('#input-meta-valor-loja') as HTMLInputElement);
    aplicarMascaraMonetaria(overlay.querySelector('.input-faixa-valor') as HTMLInputElement);

    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('nova-meta-card')?.classList.remove('scale-95');
      document.getElementById('nova-meta-card')?.classList.add('scale-100');
    }, 10);

    // Toggle meta loja
    overlay.querySelector('#input-meta-loja')?.addEventListener('change', (e) => {
      const active = (e.target as HTMLInputElement).checked;
      const wrap = document.getElementById('wrapper-meta-loja');
      if (active) {
        wrap?.classList.remove('hidden');
      } else {
        wrap?.classList.add('hidden');
      }
    });

    // Add Faixa click
    document.getElementById('btn-add-faixa')?.addEventListener('click', () => {
      const container = document.getElementById('container-faixas-premios');
      if (!container) return;

      const row = document.createElement('div');
      row.className = 'grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150/40 dark:border-slate-800/40 target-faixa-row';
      row.innerHTML = `
        <div class="col-span-3">
          <input type="text" placeholder="Nome Faixa" required class="input-faixa-nome w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100" />
        </div>
        <div class="col-span-3">
          <input type="text" placeholder="Valor Mín. (R$)" required class="input-faixa-valor w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 text-right" value="0,00" />
        </div>
        <div class="col-span-4">
          <input type="text" placeholder="Recompensa / Bônus" class="input-faixa-recompensa w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100" />
        </div>
        <div class="col-span-1.5 flex items-center justify-center">
          <input type="color" class="input-faixa-cor w-7 h-7 rounded border border-slate-250 cursor-pointer" value="#6366f1" />
        </div>
        <div class="col-span-0.5 flex justify-end">
          <button type="button" class="btn-remove-faixa text-rose-500 hover:text-rose-700 font-bold text-xs p-1">❌</button>
        </div>
      `;
      container.appendChild(row);
      aplicarMascaraMonetaria(row.querySelector('.input-faixa-valor') as HTMLInputElement);

      row.querySelector('.btn-remove-faixa')?.addEventListener('click', () => {
        row.remove();
      });
    });

    // Remove first row trigger
    overlay.querySelector('.btn-remove-faixa')?.addEventListener('click', (e) => {
      (e.target as HTMLElement).closest('.target-faixa-row')?.remove();
    });

    document.getElementById('btn-meta-cancel')?.addEventListener('click', () => this.fecharModalNovaMeta());

    const form = document.getElementById('form-nova-meta') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('btn-meta-submit') as HTMLButtonElement;
      const nome = (document.getElementById('input-meta-nome') as HTMLInputElement).value;
      const dataInicio = (document.getElementById('input-meta-inicio') as HTMLInputElement).value;
      const dataFim = (document.getElementById('input-meta-fim') as HTMLInputElement).value;
      const tipoCalculo = (document.getElementById('select-meta-calculo') as HTMLSelectElement).value as 'bruto' | 'lucro';
      const isCampanha = (document.getElementById('input-meta-campanha') as HTMLInputElement).checked;
      const isMetaLoja = (document.getElementById('input-meta-loja') as HTMLInputElement).checked;
      const valorMetaLojaRaw = (document.getElementById('input-meta-valor-loja') as HTMLInputElement).value;
      const valorMetaLoja = isMetaLoja ? (parseBrFloat(valorMetaLojaRaw) || 0) : 0;

      const faixas: any[] = [];
      const rows = document.querySelectorAll('.target-faixa-row');
      rows.forEach(row => {
        const fNome = (row.querySelector('.input-faixa-nome') as HTMLInputElement).value;
        const fValorRaw = (row.querySelector('.input-faixa-valor') as HTMLInputElement).value;
        const fValor = parseBrFloat(fValorRaw) || 0;
        const fRecompensa = (row.querySelector('.input-faixa-recompensa') as HTMLInputElement).value || '';
        const fCor = (row.querySelector('.input-faixa-cor') as HTMLInputElement).value || '#6366f1';
        if (fNome && fValor > 0) {
          faixas.push({
            nome: fNome,
            valor_minimo: fValor,
            bonus_xp: Math.round(fValor * 0.1),
            recompensa: fRecompensa,
            cor: fCor
          });
        }
      });

      if (faixas.length === 0) {
        this.showToast('Por favor, adicione pelo menos uma faixa de premiação válida.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Criando...';

      try {
        await MetasService.criarMetaPeriodo({
          nome,
          data_inicio: dataInicio,
          data_fim: dataFim,
          tipo_calculo: tipoCalculo,
          is_campanha: isCampanha,
          is_meta_loja: isMetaLoja,
          valor_meta: valorMetaLoja
        }, faixas);

        this.showToast('Período de meta criado com sucesso!', 'success');
        this.fecharModalNovaMeta();
        await this.loadMetas();
        this.render();
        this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro ao criar metas:', err);
        this.showToast('Erro ao criar período de metas.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Meta / Campanha';
      }
    });
  }

  private fecharModalNovaMeta(): void {
    const overlay = document.getElementById('nova-meta-overlay');
    if (!overlay) return;
    document.getElementById('nova-meta-card')?.classList.remove('scale-100');
    document.getElementById('nova-meta-card')?.classList.add('scale-95');
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }

  private abrirModalEditarMeta(metaId: string): void {
    const meta = this.metas.find(m => m.id === metaId);
    if (!meta) {
      this.showToast('Meta não encontrada.', 'error');
      return;
    }

    const aplicarMascaraMonetaria = (inputEl: HTMLInputElement) => {
      inputEl.addEventListener('input', (e) => {
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
    };

    const overlay = document.createElement('div');
    overlay.id = 'editar-meta-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';

    const renderFaixasHTML = (meta.faixas || []).map(f => {
      const formattedMin = f.valor_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      return `
        <div class="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150/40 dark:border-slate-800/40 target-faixa-row">
          <div class="col-span-3">
            <input type="text" placeholder="Nome Faixa" required class="input-faixa-nome w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100" value="${f.nome}" />
          </div>
          <div class="col-span-3">
            <input type="text" placeholder="Valor Mín. (R$)" required class="input-faixa-valor w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 text-right" value="${formattedMin}" />
          </div>
          <div class="col-span-4">
            <input type="text" placeholder="Recompensa / Bônus" class="input-faixa-recompensa w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100" value="${f.recompensa || ''}" />
          </div>
          <div class="col-span-1.5 flex items-center justify-center">
            <input type="color" class="input-faixa-cor w-7 h-7 rounded border border-slate-250 cursor-pointer" value="${f.cor || '#6366f1'}" />
          </div>
          <div class="col-span-0.5 flex justify-end">
            <button type="button" class="btn-remove-faixa text-rose-500 hover:text-rose-700 font-bold text-xs p-1">❌</button>
          </div>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full max-w-[550px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar" id="editar-meta-card">
        
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
          <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl flex items-center justify-center text-xl border border-indigo-100 mb-3">
            ✏️
          </div>
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">Editar Período de Metas</h2>
          <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">Atualize as regras e faixas de premiação</p>
        </div>

        <form id="form-editar-meta" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome do Período *</label>
            <input id="input-meta-nome" type="text" required value="${meta.nome}" placeholder="Ex: Metas de Agosto 2026, Campanha Ouro..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Data de Início *</label>
              <input id="input-meta-inicio" type="date" required value="${meta.data_inicio}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Data de Fim *</label>
              <input id="input-meta-fim" type="date" required value="${meta.data_fim}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Cálculo baseado em *</label>
              <select id="select-meta-calculo" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                <option value="bruto" ${meta.tipo_calculo === 'bruto' ? 'selected' : ''}>Faturamento Bruto (Total das Vendas)</option>
                <option value="lucro" ${meta.tipo_calculo === 'lucro' ? 'selected' : ''}>Markup / Lucro Estimado</option>
              </select>
            </div>

            <div class="flex items-center gap-6 pt-5">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input id="input-meta-campanha" type="checkbox" ${meta.is_campanha ? 'checked' : ''} class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5" />
                <span class="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase">É Campanha</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input id="input-meta-loja" type="checkbox" ${meta.is_meta_loja ? 'checked' : ''} class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5" />
                <span class="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase">Meta Global Loja</span>
              </label>
            </div>
          </div>

          <div id="wrapper-meta-loja" class="${meta.is_meta_loja ? '' : 'hidden'}">
            <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Valor da Meta Global da Loja (R$) *</label>
            <input id="input-meta-valor-loja" type="text" value="${(meta.valor_meta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-bold text-sm text-right" />
          </div>

          <!-- Seção de Faixas de Premiação -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faixas de Premiação / Metas</h3>
              <button id="btn-add-faixa" type="button" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-155 text-indigo-650 rounded-lg text-[10px] font-black uppercase tracking-wider transition">
                + Adicionar Faixa
              </button>
            </div>
            
            <div class="space-y-2" id="container-faixas-premios">
              ${renderFaixasHTML}
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button id="btn-meta-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition uppercase">
              Cancelar
            </button>
            <button id="btn-meta-submit" type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 uppercase tracking-wider flex items-center justify-center">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    aplicarMascaraMonetaria(overlay.querySelector('#input-meta-valor-loja') as HTMLInputElement);
    overlay.querySelectorAll('.input-faixa-valor').forEach(inp => aplicarMascaraMonetaria(inp as HTMLInputElement));

    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('editar-meta-card')?.classList.remove('scale-95');
      document.getElementById('editar-meta-card')?.classList.add('scale-100');
    }, 10);

    // Toggle meta loja
    overlay.querySelector('#input-meta-loja')?.addEventListener('change', (e) => {
      const active = (e.target as HTMLInputElement).checked;
      const wrap = document.getElementById('wrapper-meta-loja');
      if (active) {
        wrap?.classList.remove('hidden');
      } else {
        wrap?.classList.add('hidden');
      }
    });

    // Add Faixa click
    document.getElementById('btn-add-faixa')?.addEventListener('click', () => {
      const container = document.getElementById('container-faixas-premios');
      if (!container) return;

      const row = document.createElement('div');
      row.className = 'grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150/40 dark:border-slate-800/40 target-faixa-row';
      row.innerHTML = `
        <div class="col-span-3">
          <input type="text" placeholder="Nome Faixa" required class="input-faixa-nome w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100" />
        </div>
        <div class="col-span-3">
          <input type="text" placeholder="Valor Mín. (R$)" required class="input-faixa-valor w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 text-right" value="0,00" />
        </div>
        <div class="col-span-4">
          <input type="text" placeholder="Recompensa / Bônus" class="input-faixa-recompensa w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100" />
        </div>
        <div class="col-span-1.5 flex items-center justify-center">
          <input type="color" class="input-faixa-cor w-7 h-7 rounded border border-slate-250 cursor-pointer" value="#6366f1" />
        </div>
        <div class="col-span-0.5 flex justify-end">
          <button type="button" class="btn-remove-faixa text-rose-500 hover:text-rose-700 font-bold text-xs p-1">❌</button>
        </div>
      `;
      container.appendChild(row);
      aplicarMascaraMonetaria(row.querySelector('.input-faixa-valor') as HTMLInputElement);

      row.querySelector('.btn-remove-faixa')?.addEventListener('click', () => {
        row.remove();
      });
    });

    // Remove row triggers
    overlay.querySelectorAll('.btn-remove-faixa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        (e.target as HTMLElement).closest('.target-faixa-row')?.remove();
      });
    });

    document.getElementById('btn-meta-cancel')?.addEventListener('click', () => this.fecharModalEditarMeta());

    const form = document.getElementById('form-editar-meta') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('btn-meta-submit') as HTMLButtonElement;
      const nome = (document.getElementById('input-meta-nome') as HTMLInputElement).value;
      const dataInicio = (document.getElementById('input-meta-inicio') as HTMLInputElement).value;
      const dataFim = (document.getElementById('input-meta-fim') as HTMLInputElement).value;
      const tipoCalculo = (document.getElementById('select-meta-calculo') as HTMLSelectElement).value as 'bruto' | 'lucro';
      const isCampanha = (document.getElementById('input-meta-campanha') as HTMLInputElement).checked;
      const isMetaLoja = (document.getElementById('input-meta-loja') as HTMLInputElement).checked;
      const valorMetaLojaRaw = (document.getElementById('input-meta-valor-loja') as HTMLInputElement).value;
      const valorMetaLoja = isMetaLoja ? (parseBrFloat(valorMetaLojaRaw) || 0) : 0;

      const faixas: any[] = [];
      const rows = document.querySelectorAll('.target-faixa-row');
      rows.forEach(row => {
        const fNome = (row.querySelector('.input-faixa-nome') as HTMLInputElement).value;
        const fValorRaw = (row.querySelector('.input-faixa-valor') as HTMLInputElement).value;
        const fValor = parseBrFloat(fValorRaw) || 0;
        const fRecompensa = (row.querySelector('.input-faixa-recompensa') as HTMLInputElement).value || '';
        const fCor = (row.querySelector('.input-faixa-cor') as HTMLInputElement).value || '#6366f1';
        if (fNome && fValor > 0) {
          faixas.push({
            nome: fNome,
            valor_minimo: fValor,
            bonus_xp: Math.round(fValor * 0.1),
            recompensa: fRecompensa,
            cor: fCor
          });
        }
      });

      if (faixas.length === 0) {
        this.showToast('Por favor, adicione pelo menos uma faixa de premiação válida.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';

      try {
        await MetasService.atualizarMetaPeriodo(meta.id, {
          nome,
          data_inicio: dataInicio,
          data_fim: dataFim,
          tipo_calculo: tipoCalculo,
          is_campanha: isCampanha,
          is_meta_loja: isMetaLoja,
          valor_meta: valorMetaLoja
        }, faixas);

        this.showToast('Período de meta atualizado com sucesso!', 'success');
        this.fecharModalEditarMeta();
        await this.loadMetas();
        this.render();
        this.setupEventListeners();
      } catch (err: any) {
        console.error('Erro ao atualizar metas:', err);
        this.showToast('Erro ao atualizar período de metas.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Alterações';
      }
    });
  }

  private fecharModalEditarMeta(): void {
    const overlay = document.getElementById('editar-meta-overlay');
    if (!overlay) return;
    document.getElementById('editar-meta-card')?.classList.remove('scale-100');
    document.getElementById('editar-meta-card')?.classList.add('scale-95');
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}
