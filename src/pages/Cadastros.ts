import { supabase, getSessaoAtual } from '../services/supabase';
import { TipoProduto, CampoAdicional } from '../types';
import { showCustomConfirm } from '../services/dialog';

export class CadastrosPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: any = null;
  private tiposProduto: TipoProduto[] = [];
  
  // Estado para formulário de cadastro/edição
  private editandoTipoId: string | null = null;
  private camposAdicionaisEmEdicao: CampoAdicional[] = [];

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
      await this.loadTiposProduto();

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
      this.showToast('Erro ao carregar tipos de produtos do banco de dados.', 'error');
    }
  }

  /**
   * Renderiza a página
   */
  private render(): void {
    const tipoEmEdicao = this.editandoTipoId 
      ? this.tiposProduto.find(t => t.id === this.editandoTipoId) 
      : null;

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

        <!-- Grade Principal -->
        <main class="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar animate-fade-in">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Coluna da Esquerda: Listagem de Tipos (2/3 de largura no LG) -->
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

            <!-- Coluna da Direita: Formulário de Adicionar / Editar (1/3 de largura no LG) -->
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
        </main>

      </div>
    `;

    this.renderCamposAdicionaisList();
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
   * Envia as alterações ou inserções para o Supabase
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
      this.showToast(`Falha ao salvar tipo de produto: ${err.message}`, 'error');
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
      this.showToast('Erro ao atualizar status do tipo.', 'error');
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
        toast.className = 'fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm z-50 transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2 pointer-events-none';
      }
    }, 3500);
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
