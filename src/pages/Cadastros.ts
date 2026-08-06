import { supabase, getSessaoAtual } from '../services/supabase';
import { TipoProduto, CampoAdicional } from '../types';
import { showCustomConfirm } from '../services/dialog';

export class CadastrosPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: any = null;
  private tiposProduto: TipoProduto[] = [];
  
  // Gestão de Abas
  private activeTab: 'tipos' | 'destinos' | 'formas' = 'tipos';

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
        this.loadFormasRecebimento()
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
                            <td colspan="5" class="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
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
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome do Tipo *</label>
                      <input id="input-tipo-nome" type="text" required value="${tipoEmEdicao ? tipoEmEdicao.nome : ''}" ${tipoEmEdicao?.nome === 'MUDAR!' ? 'disabled' : ''} placeholder="ex: Circuito, Chip de Viagem" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Ícone / Emoji *</label>
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
                            <td colspan="3" class="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
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
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Cidade / Nome do Destino *</label>
                      <input id="input-destino-nome" type="text" required value="${destinoEmEdicao ? (destinoEmEdicao.nome.startsWith('ARRUMAR | ') ? destinoEmEdicao.nome.replace('ARRUMAR | ', '') : destinoEmEdicao.nome) : ''}" placeholder="ex: Buenos Aires, Maceió" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition" />
                    </div>
 
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">País *</label>
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
          ` : `
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
                            <td colspan="4" class="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
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
                                <button data-id="${f.id}" class="btn-editar-forma p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition" title="Editar Forma de Recebimento">
                                  ✏️
                                </button>
                                <button data-id="${f.id}" class="btn-toggle-ativo-forma p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition" title="${f.ativo ? 'Desativar' : 'Ativar'}">
                                  ${f.ativo ? '🔴 Desativar' : '🟢 Ativar'}
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
                            <button type="button" data-icon="${ico}" class="btn-select-icone-forma p-2.5 border text-base rounded-xl transition ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 font-bold' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}" style="outline: none;">
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
          `}
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
        <p class="text-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
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
          <button type="button" data-idx="${idx}" class="btn-remover-campo absolute top-2 right-2 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition font-bold text-xs">
            ✕
          </button>

          <div class="grid grid-cols-2 gap-2 pr-4">
            <div>
              <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Código/ID *</label>
              <input type="text" data-idx="${idx}" data-field="id" required value="${campo.id || ''}" placeholder="ex: cia_aerea" class="input-campo-adicional w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-[10px] transition" />
            </div>
            <div>
              <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Rótulo/Label *</label>
              <input type="text" data-idx="${idx}" data-field="label" required value="${campo.label || ''}" placeholder="ex: Cia Aérea" class="input-campo-adicional w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-[10px] transition" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tipo *</label>
              <select data-idx="${idx}" data-field="tipo" class="select-campo-adicional w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-[10px]">
                <option value="text" ${campo.tipo === 'text' ? 'selected' : ''}>Texto</option>
                <option value="number" ${campo.tipo === 'number' ? 'selected' : ''}>Número</option>
                <option value="select" ${campo.tipo === 'select' ? 'selected' : ''}>Opções (Dropdown)</option>
              </select>
            </div>
            <div>
              <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Destino *</label>
              <select data-idx="${idx}" data-field="alvo" class="select-campo-adicional w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-[10px]">
                <option value="dados_adicionais" ${campo.alvo === 'dados_adicionais' ? 'selected' : ''}>Metadados</option>
                <option value="fornecedor" ${campo.alvo === 'fornecedor' ? 'selected' : ''}>Fornecedor</option>
                <option value="descricao" ${campo.alvo === 'descricao' ? 'selected' : ''}>Descrição</option>
              </select>
            </div>
          </div>

          <!-- Campo de Opções (Visível apenas se tipo for Select) -->
          <div class="${isSelect ? '' : 'hidden'} select-opcoes-container">
            <label class="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Opções (Separadas por vírgula) *</label>
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
          <td colspan="3" class="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
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
      } catch (e) {
        this.formasRecebimento = [];
      }
    } else {
      this.formasRecebimento = [
        { id: 'forma-pix', nome: 'PIX', icone: '🏦', ativo: true },
        { id: 'forma-credito', nome: 'Cartão de Crédito', icone: '💳', ativo: true },
        { id: 'forma-dinheiro', nome: 'Dinheiro', icone: '💵', ativo: true },
        { id: 'forma-boleto', nome: 'Boleto Bancário', icone: '🧾', ativo: true }
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
}
