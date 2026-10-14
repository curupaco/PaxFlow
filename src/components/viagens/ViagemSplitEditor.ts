import { PerfilConsultor, ViagemDivisao } from '../../types';
import { ViagensDivisoesService } from '../../services/viagensDivisoesService';
import { showToast } from '../../services/dialog';

export interface ViagemSplitEditorOptions {
  viagemId: string;
  titularId: string;
  consultores: PerfilConsultor[];
  divisoesIniciais?: ViagemDivisao[];
  bloqueadoPorConferencia?: boolean;
  isGestorAdmin?: boolean;
  onSave?: (divisoes: ViagemDivisao[]) => void;
  onClose?: () => void;
}

export class ViagemSplitEditor {
  private options: ViagemSplitEditorOptions;
  private modalContainer: HTMLDivElement | null = null;
  private divisoes: Array<{
    consultor_id: string;
    percentual: number;
    is_titular: boolean;
  }> = [];

  constructor(options: ViagemSplitEditorOptions) {
    this.options = options;
    this.initData();
  }

  private initData(): void {
    if (this.options.divisoesIniciais && this.options.divisoesIniciais.length > 0) {
      this.divisoes = this.options.divisoesIniciais.map(d => ({
        consultor_id: d.consultor_id || (d as any).consultorId,
        percentual: Number(d.percentual) || 0,
        is_titular: !!d.is_titular || d.consultor_id === this.options.titularId
      }));
    } else {
      // Padrão: 100% para o titular
      this.divisoes = [
        {
          consultor_id: this.options.titularId,
          percentual: 100,
          is_titular: true
        }
      ];
    }

    // Garante que o titular está na primeira posição e marcado como titular
    const titularIndex = this.divisoes.findIndex(d => d.consultor_id === this.options.titularId);
    if (titularIndex >= 0) {
      this.divisoes[titularIndex].is_titular = true;
    } else {
      this.divisoes.unshift({
        consultor_id: this.options.titularId,
        percentual: 100,
        is_titular: true
      });
    }
  }

  public open(): void {
    this.render();
  }

  public close(): void {
    if (this.modalContainer) {
      this.modalContainer.remove();
      this.modalContainer = null;
    }
    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  private render(): void {
    // Remove qualquer modal existente
    const old = document.getElementById('viagem-split-editor-modal');
    if (old) old.remove();

    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'viagem-split-editor-modal';
    this.modalContainer.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-sans';

    const validacao = ViagensDivisoesService.validarSomaDivisoes(this.divisoes);
    const atalhos = ViagensDivisoesService.obterAtalhosRapidos();
    const isReadOnly = !!this.options.bloqueadoPorConferencia && !this.options.isGestorAdmin;

    const titularConsultor = this.options.consultores.find(c => c.id === this.options.titularId);
    const titularNome = titularConsultor?.nome || 'Consultor Titular';

    this.modalContainer.innerHTML = `
      <div class="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Cabeçalho -->
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-xl shadow-sm">
              🤝
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Divisão de Viagem & Parceria
                ${isReadOnly ? '<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">🔒 Bloqueado</span>' : ''}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                A soma das participações deve fechar rigorosamente em 100,00%.
              </p>
            </div>
          </div>
          <button id="btn-close-split-editor" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg transition" title="Fechar">
            ✕
          </button>
        </div>

        <!-- Conteúdo do Modal -->
        <div class="p-6 overflow-y-auto space-y-5 flex-1">
          ${isReadOnly ? `
            <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
              <span>🔒</span>
              <div>
                <strong>Conferência Contábil Concluída</strong>: Esta viagem já passou pela validação do gestor. Alterações de divisão estão restritas a Administradores.
              </div>
            </div>
          ` : ''}

          <!-- Barra de Soma e Validação Visual -->
          <div class="p-4 rounded-xl border ${validacao.valida ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200' : (validacao.soma > 100 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200')} transition-all">
            <div class="flex items-center justify-between text-xs font-bold mb-2">
              <span class="flex items-center gap-1.5">
                ${validacao.valida ? '✅ Soma 100% Fechada' : (validacao.soma > 100 ? '🚨 Soma Excede 100%' : '⚠️ Soma Incompleta')}
              </span>
              <span class="text-sm font-extrabold">${validacao.soma.toFixed(2)}%</span>
            </div>
            <div class="w-full bg-white/70 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div class="h-2.5 rounded-full transition-all duration-300 ${validacao.valida ? 'bg-emerald-500' : (validacao.soma > 100 ? 'bg-rose-500' : 'bg-amber-500')}" style="width: ${Math.min(validacao.soma, 100)}%;"></div>
            </div>
            <p class="text-[11px] mt-2 opacity-90">${validacao.mensagem}</p>
          </div>

          <!-- Atalhos Rápidos de 1-Clique (apenas se não for somente leitura) -->
          ${!isReadOnly ? `
            <div>
              <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Atalhos Rápidos de Distribuição:
              </label>
              <div class="flex flex-wrap gap-2">
                ${atalhos.map(a => `
                  <button type="button" class="btn-atalho-split px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition" data-titular="${a.titular}" data-parceiro="${a.parceiro}">
                    ${a.label}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Lista de Participantes -->
          <div class="space-y-3">
            <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Consultores e Percentuais:
            </label>

            <!-- Linha Fixa do Titular -->
            <div class="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-base">👑</span>
                <div class="truncate">
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${titularNome}</div>
                  <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Consultor Titular (Canal de Contato)</div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  max="100" 
                  value="${(this.divisoes.find(d => d.consultor_id === this.options.titularId)?.percentual || 100).toFixed(2)}"
                  data-consultor-id="${this.options.titularId}"
                  ${isReadOnly ? 'disabled' : ''}
                  class="input-split-percentual w-24 px-2.5 py-1.5 text-right font-extrabold text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span class="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>

            <!-- Linhas dos Co-consultores Parceiros -->
            <div id="container-parceiros-split" class="space-y-2.5">
              ${this.divisoes.filter(d => d.consultor_id !== this.options.titularId).map((parceiro, idx) => {
                const consultorInfo = this.options.consultores.find(c => c.id === parceiro.consultor_id);
                return `
                  <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      ${isReadOnly ? `
                        <div class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          ${consultorInfo?.nome || 'Consultor Parceiro'}
                        </div>
                      ` : `
                        <select class="select-parceiro-split w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" data-index="${idx}">
                          ${this.options.consultores
                            .filter(c => c.ativo !== false)
                            .map(c => `
                              <option value="${c.id}" ${c.id === parceiro.consultor_id ? 'selected' : ''}>
                                ${c.nome} ${c.id === this.options.titularId ? '(Titular)' : ''}
                              </option>
                            `).join('')}
                        </select>
                      `}
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <div class="flex items-center gap-1.5">
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          max="100" 
                          value="${parceiro.percentual.toFixed(2)}"
                          data-consultor-id="${parceiro.consultor_id}"
                          ${isReadOnly ? 'disabled' : ''}
                          class="input-split-percentual w-24 px-2.5 py-1.5 text-right font-extrabold text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span class="text-xs font-bold text-slate-500">%</span>
                      </div>
                      ${!isReadOnly ? `
                        <button type="button" class="btn-remover-parceiro text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition" data-consultor-id="${parceiro.consultor_id}" title="Remover parceiro">
                          🗑️
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Botão Adicionar Parceiro -->
            ${!isReadOnly ? `
              <button type="button" id="btn-add-parceiro-split" class="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition">
                <span>➕</span> Adicionar Consultor Parceiro
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Rodapé de Ações -->
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <button type="button" id="btn-cancel-split" class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition">
            ${isReadOnly ? 'Fechar' : 'Cancelar'}
          </button>
          ${!isReadOnly ? `
            <button 
              type="button" 
              id="btn-save-split" 
              ${!validacao.valida ? 'disabled' : ''} 
              class="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-2 ${validacao.valida ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 cursor-pointer' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'}"
            >
              <span>💾</span> Salvar Divisão
            </button>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(this.modalContainer);
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.modalContainer) return;

    // Fechar modal
    this.modalContainer.querySelector('#btn-close-split-editor')?.addEventListener('click', () => this.close());
    this.modalContainer.querySelector('#btn-cancel-split')?.addEventListener('click', () => this.close());

    // Fechar ao clicar no backdrop escuro
    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) this.close();
    });

    // Alteração de percentual nos inputs
    this.modalContainer.querySelectorAll('.input-split-percentual').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const consultorId = target.getAttribute('data-consultor-id');
        const novoValor = parseFloat(target.value) || 0;

        const item = this.divisoes.find(d => d.consultor_id === consultorId);
        if (item) {
          item.percentual = novoValor;
        }

        this.atualizarStatusSoma();
      });
    });

    // Atalhos Rápidos
    this.modalContainer.querySelectorAll('.btn-atalho-split').forEach(btn => {
      btn.addEventListener('click', () => {
        const titularPct = parseFloat(btn.getAttribute('data-titular') || '100');
        const parceiroPct = parseFloat(btn.getAttribute('data-parceiro') || '0');

        // Se parceiroPct for 0, deixa apenas o titular com 100%
        if (parceiroPct === 0) {
          this.divisoes = [
            { consultor_id: this.options.titularId, percentual: 100, is_titular: true }
          ];
        } else {
          // Se houver pelo menos um parceiro, ajusta o primeiro parceiro
          let parceiros = this.divisoes.filter(d => d.consultor_id !== this.options.titularId);
          if (parceiros.length === 0) {
            // Escolhe o primeiro consultor ativo disponível que não seja o titular
            const outroConsultor = this.options.consultores.find(c => c.ativo !== false && c.id !== this.options.titularId);
            if (outroConsultor) {
              parceiros.push({
                consultor_id: outroConsultor.id,
                percentual: parceiroPct,
                is_titular: false
              });
            }
          } else {
            parceiros[0].percentual = parceiroPct;
          }

          const titular = this.divisoes.find(d => d.consultor_id === this.options.titularId);
          if (titular) titular.percentual = titularPct;

          this.divisoes = [
            titular || { consultor_id: this.options.titularId, percentual: titularPct, is_titular: true },
            ...parceiros
          ];
        }

        this.render();
      });
    });

    // Adicionar Parceiro
    this.modalContainer.querySelector('#btn-add-parceiro-split')?.addEventListener('click', () => {
      const idsJaUsados = new Set(this.divisoes.map(d => d.consultor_id));
      const disponivel = this.options.consultores.find(c => c.ativo !== false && !idsJaUsados.has(c.id));

      if (!disponivel) {
        showToast('Não há outros consultores ativos disponíveis para adicionar.', 'error');
        return;
      }

      // Calcula o percentual restante para fechar 100%
      const somaAtual = this.divisoes.reduce((acc, curr) => acc + (Number(curr.percentual) || 0), 0);
      const restante = Math.max(0, 100 - somaAtual);

      this.divisoes.push({
        consultor_id: disponivel.id,
        percentual: restante,
        is_titular: false
      });

      this.render();
    });

    // Remover Parceiro
    this.modalContainer.querySelectorAll('.btn-remover-parceiro').forEach(btn => {
      btn.addEventListener('click', () => {
        const consultorId = btn.getAttribute('data-consultor-id');
        this.divisoes = this.divisoes.filter(d => d.consultor_id !== consultorId);

        // Se restou apenas o titular, ajusta o titular para 100%
        if (this.divisoes.length === 1 && this.divisoes[0].consultor_id === this.options.titularId) {
          this.divisoes[0].percentual = 100;
        }

        this.render();
      });
    });

    // Mudança de consultor no dropdown do parceiro
    this.modalContainer.querySelectorAll('.select-parceiro-split').forEach(select => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const index = parseInt(target.getAttribute('data-index') || '0', 10);
        const parceiros = this.divisoes.filter(d => d.consultor_id !== this.options.titularId);

        if (parceiros[index]) {
          parceiros[index].consultor_id = target.value;
          this.render();
        }
      });
    });

    // Salvar Divisão
    this.modalContainer.querySelector('#btn-save-split')?.addEventListener('click', async () => {
      const validacao = ViagensDivisoesService.validarSomaDivisoes(this.divisoes);
      if (!validacao.valida) {
        showToast(validacao.mensagem, 'error');
        return;
      }

      const saveBtn = this.modalContainer?.querySelector('#btn-save-split') as HTMLButtonElement;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>⏳</span> Salvando...';
      }

      const res = await ViagensDivisoesService.salvarDivisaoViagem({
        viagemId: this.options.viagemId,
        titularId: this.options.titularId,
        divisoes: this.divisoes
      });

      if (!res.success) {
        showToast(res.error || 'Erro ao salvar divisão da viagem.', 'error');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<span>💾</span> Salvar Divisão';
        }
        return;
      }

      showToast('Divisão de viagem salva com sucesso!', 'success');

      if (this.options.onSave) {
        this.options.onSave(this.divisoes.map(d => ({
          ...d,
          consultor_nome: this.options.consultores.find(c => c.id === d.consultor_id)?.nome || 'Consultor'
        })));
      }

      this.close();
    });
  }

  private atualizarStatusSoma(): void {
    if (!this.modalContainer) return;

    const validacao = ViagensDivisoesService.validarSomaDivisoes(this.divisoes);
    const saveBtn = this.modalContainer.querySelector('#btn-save-split') as HTMLButtonElement;

    if (saveBtn) {
      if (validacao.valida) {
        saveBtn.disabled = false;
        saveBtn.className = 'px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 cursor-pointer';
      } else {
        saveBtn.disabled = true;
        saveBtn.className = 'px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-2 bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60';
      }
    }
  }
}
