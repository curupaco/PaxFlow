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
    percentual_rav: number;
    is_titular: boolean;
  }> = [];

  constructor(options: ViagemSplitEditorOptions) {
    this.options = options;
    this.initData();
  }

  private initData(): void {
    if (this.options.divisoesIniciais && this.options.divisoesIniciais.length > 0) {
      this.divisoes = this.options.divisoesIniciais.map(d => {
        const pctGeral = Number(d.percentual) || 0;
        const rawRav = d.percentual_rav ?? d.percentualRav;
        const pctRav = rawRav !== undefined && rawRav !== null ? Number(rawRav) : pctGeral;

        return {
          consultor_id: d.consultor_id || (d as any).consultorId,
          percentual: pctGeral,
          percentual_rav: pctRav,
          is_titular: !!d.is_titular || d.consultor_id === this.options.titularId
        };
      });
    } else {
      // Padrão: 100% para o titular (Venda e RAV)
      this.divisoes = [
        {
          consultor_id: this.options.titularId,
          percentual: 100,
          percentual_rav: 100,
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
        percentual_rav: 100,
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
    const old = document.getElementById('viagem-split-editor-modal');
    if (old) old.remove();

    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'viagem-split-editor-modal';
    this.modalContainer.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-sans';

    const validacaoVenda = ViagensDivisoesService.validarSomaDivisoes(this.divisoes);
    const validacaoRav = ViagensDivisoesService.validarSomaRav(this.divisoes);
    const tudoValido = validacaoVenda.valida && validacaoRav.valida;

    const atalhos = ViagensDivisoesService.obterAtalhosRapidos();
    const isReadOnly = !!this.options.bloqueadoPorConferencia && !this.options.isGestorAdmin;

    const titularConsultor = this.options.consultores.find(c => c.id === this.options.titularId);
    const titularNome = titularConsultor?.nome || 'Consultor Titular';

    this.modalContainer.innerHTML = `
      <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
                Rateio de vendas e comissões com suporte a regras exclusivas de RAV aérea.
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

          <!-- Dupla Barra de Validação Visual (Venda Geral e RAV Aérea) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Barra 1: Venda Geral -->
            <div class="p-3.5 rounded-xl border ${validacaoVenda.valida ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200' : (validacaoVenda.soma > 100 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200')} transition-all">
              <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="flex items-center gap-1.5">
                  ${validacaoVenda.valida ? '✅' : (validacaoVenda.soma > 100 ? '🚨' : '⚠️')} Total da Venda
                </span>
                <span class="text-sm font-extrabold">${validacaoVenda.soma.toFixed(0)}%</span>
              </div>
              <div class="w-full bg-white/70 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-300 ${validacaoVenda.valida ? 'bg-emerald-500' : (validacaoVenda.soma > 100 ? 'bg-rose-500' : 'bg-amber-500')}" style="width: ${Math.min(validacaoVenda.soma, 100)}%;"></div>
              </div>
              <p class="text-[11px] mt-1.5 opacity-90">${validacaoVenda.mensagem}</p>
            </div>

            <!-- Barra 2: RAV Aérea -->
            <div class="p-3.5 rounded-xl border ${validacaoRav.valida ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40 text-indigo-800 dark:text-indigo-200' : (validacaoRav.soma > 100 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200')} transition-all">
              <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="flex items-center gap-1.5">
                  ${validacaoRav.valida ? '✈️' : (validacaoRav.soma > 100 ? '🚨' : '⚠️')} Total da RAV
                </span>
                <span class="text-sm font-extrabold">${validacaoRav.soma.toFixed(0)}%</span>
              </div>
              <div class="w-full bg-white/70 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-300 ${validacaoRav.valida ? 'bg-indigo-500' : (validacaoRav.soma > 100 ? 'bg-rose-500' : 'bg-amber-500')}" style="width: ${Math.min(validacaoRav.soma, 100)}%;"></div>
              </div>
              <p class="text-[11px] mt-1.5 opacity-90">${validacaoRav.mensagem}</p>
            </div>
          </div>

          <!-- Atalhos Rápidos de 1-Clique -->
          ${!isReadOnly ? `
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Atalhos de 1-Clique:
                </label>
                <button type="button" id="btn-sync-rav-venda" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer">
                  <span>⚡</span> Igualar RAV à Venda
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                ${atalhos.map(a => `
                  <button type="button" class="btn-atalho-split px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition" data-titular="${a.titular}" data-parceiro="${a.parceiro}">
                    ${a.label}
                  </button>
                `).join('')}
                <button type="button" id="btn-atalho-rav-titular" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:border-amber-500 transition">
                  ✈️ RAV 100% Titular
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Lista de Participantes com Venda e RAV Lado a Lado -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Consultores e Rateios (%):
              </label>
              <span class="text-[11px] text-slate-400">Incremento de 1% em 1%</span>
            </div>

            <!-- Linha Fixa do Titular -->
            <div class="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <span class="text-base">👑</span>
                <div class="truncate">
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${titularNome}</div>
                  <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Consultor Titular (Canal do Passageiro)</div>
                </div>
              </div>

              <!-- Inputs de Venda e RAV lado a lado -->
              <div class="flex items-center gap-3 shrink-0">
                <!-- Venda -->
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] font-bold text-slate-500">Venda:</span>
                  <input 
                    type="number" 
                    step="1" 
                    min="0" 
                    max="100" 
                    value="${Math.round(this.divisoes.find(d => d.consultor_id === this.options.titularId)?.percentual ?? 100)}"
                    data-consultor-id="${this.options.titularId}"
                    data-tipo="venda"
                    ${isReadOnly ? 'disabled' : ''}
                    class="input-split-percentual w-20 px-2 py-1.5 text-right font-extrabold text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span class="text-xs font-bold text-slate-500">%</span>
                </div>

                <!-- RAV -->
                <div class="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400">RAV:</span>
                  <input 
                    type="number" 
                    step="1" 
                    min="0" 
                    max="100" 
                    value="${Math.round(this.divisoes.find(d => d.consultor_id === this.options.titularId)?.percentual_rav ?? 100)}"
                    data-consultor-id="${this.options.titularId}"
                    data-tipo="rav"
                    ${isReadOnly ? 'disabled' : ''}
                    class="input-split-rav w-20 px-2 py-1.5 text-right font-extrabold text-sm rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span class="text-xs font-bold text-amber-600 dark:text-amber-400">%</span>
                </div>
              </div>
            </div>

            <!-- Linhas dos Co-consultores Parceiros -->
            <div id="container-parceiros-split" class="space-y-2.5">
              ${this.divisoes.filter(d => d.consultor_id !== this.options.titularId).map((parceiro, idx) => {
                const consultorInfo = this.options.consultores.find(c => c.id === parceiro.consultor_id);
                return `
                  <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    <!-- Inputs de Venda e RAV -->
                    <div class="flex items-center gap-3 shrink-0">
                      <!-- Venda -->
                      <div class="flex items-center gap-1.5">
                        <span class="text-[11px] font-bold text-slate-500">Venda:</span>
                        <input 
                          type="number" 
                          step="1" 
                          min="0" 
                          max="100" 
                          value="${Math.round(parceiro.percentual)}"
                          data-consultor-id="${parceiro.consultor_id}"
                          data-tipo="venda"
                          ${isReadOnly ? 'disabled' : ''}
                          class="input-split-percentual w-20 px-2 py-1.5 text-right font-extrabold text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span class="text-xs font-bold text-slate-500">%</span>
                      </div>

                      <!-- RAV -->
                      <div class="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                        <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400">RAV:</span>
                        <input 
                          type="number" 
                          step="1" 
                          min="0" 
                          max="100" 
                          value="${Math.round(parceiro.percentual_rav)}"
                          data-consultor-id="${parceiro.consultor_id}"
                          data-tipo="rav"
                          ${isReadOnly ? 'disabled' : ''}
                          class="input-split-rav w-20 px-2 py-1.5 text-right font-extrabold text-sm rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span class="text-xs font-bold text-amber-600 dark:text-amber-400">%</span>
                      </div>

                      ${!isReadOnly ? `
                        <button type="button" class="btn-remover-parceiro text-slate-400 hover:text-rose-500 p-1 rounded-lg transition" data-consultor-id="${parceiro.consultor_id}" title="Remover parceiro">
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
              ${!tudoValido ? 'disabled' : ''} 
              class="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-2 ${tudoValido ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 cursor-pointer' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'}"
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

    // Alteração de % de Venda
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

    // Alteração de % de RAV
    this.modalContainer.querySelectorAll('.input-split-rav').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const consultorId = target.getAttribute('data-consultor-id');
        const novoValor = parseFloat(target.value) || 0;

        const item = this.divisoes.find(d => d.consultor_id === consultorId);
        if (item) {
          item.percentual_rav = novoValor;
        }

        this.atualizarStatusSoma();
      });
    });

    // Botão Sincronizar RAV com Venda
    this.modalContainer.querySelector('#btn-sync-rav-venda')?.addEventListener('click', () => {
      this.divisoes.forEach(d => {
        d.percentual_rav = d.percentual;
      });
      showToast('Porcentagens de RAV sincronizadas com a venda!', 'success');
      this.render();
    });

    // Atalho RAV 100% Titular (caso Rafael & Guto)
    this.modalContainer.querySelector('#btn-atalho-rav-titular')?.addEventListener('click', () => {
      this.divisoes.forEach(d => {
        if (d.consultor_id === this.options.titularId) {
          d.percentual_rav = 100;
        } else {
          d.percentual_rav = 0;
        }
      });
      showToast('RAV definida como 100% para o titular!', 'success');
      this.render();
    });

    // Atalhos Rápidos tradicionais (Venda e RAV)
    this.modalContainer.querySelectorAll('.btn-atalho-split').forEach(btn => {
      btn.addEventListener('click', () => {
        const titularPct = parseFloat(btn.getAttribute('data-titular') || '100');
        const parceiroPct = parseFloat(btn.getAttribute('data-parceiro') || '0');

        if (parceiroPct === 0) {
          this.divisoes = [
            { consultor_id: this.options.titularId, percentual: 100, percentual_rav: 100, is_titular: true }
          ];
        } else {
          let parceiros = this.divisoes.filter(d => d.consultor_id !== this.options.titularId);
          if (parceiros.length === 0) {
            const outroConsultor = this.options.consultores.find(c => c.ativo !== false && c.id !== this.options.titularId);
            if (outroConsultor) {
              parceiros.push({
                consultor_id: outroConsultor.id,
                percentual: parceiroPct,
                percentual_rav: parceiroPct,
                is_titular: false
              });
            }
          } else {
            parceiros[0].percentual = parceiroPct;
            parceiros[0].percentual_rav = parceiroPct;
          }

          const titular = this.divisoes.find(d => d.consultor_id === this.options.titularId);
          if (titular) {
            titular.percentual = titularPct;
            titular.percentual_rav = titularPct;
          }

          this.divisoes = [
            titular || { consultor_id: this.options.titularId, percentual: titularPct, percentual_rav: titularPct, is_titular: true },
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

      const somaVenda = this.divisoes.reduce((acc, curr) => acc + (Number(curr.percentual) || 0), 0);
      const restanteVenda = Math.max(0, 100 - somaVenda);

      const somaRav = this.divisoes.reduce((acc, curr) => acc + (Number(curr.percentual_rav) || 0), 0);
      const restanteRav = Math.max(0, 100 - somaRav);

      this.divisoes.push({
        consultor_id: disponivel.id,
        percentual: restanteVenda,
        percentual_rav: restanteRav,
        is_titular: false
      });

      this.render();
    });

    // Remover Parceiro
    this.modalContainer.querySelectorAll('.btn-remover-parceiro').forEach(btn => {
      btn.addEventListener('click', () => {
        const consultorId = btn.getAttribute('data-consultor-id');
        this.divisoes = this.divisoes.filter(d => d.consultor_id !== consultorId);

        if (this.divisoes.length === 1 && this.divisoes[0].consultor_id === this.options.titularId) {
          this.divisoes[0].percentual = 100;
          this.divisoes[0].percentual_rav = 100;
        }

        this.render();
      });
    });

    // Mudança de consultor no select do parceiro
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
      const validacaoVenda = ViagensDivisoesService.validarSomaDivisoes(this.divisoes);
      if (!validacaoVenda.valida) {
        showToast(validacaoVenda.mensagem, 'error');
        return;
      }

      const validacaoRav = ViagensDivisoesService.validarSomaRav(this.divisoes);
      if (!validacaoRav.valida) {
        showToast(validacaoRav.mensagem, 'error');
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

    const validacaoVenda = ViagensDivisoesService.validarSomaDivisoes(this.divisoes);
    const validacaoRav = ViagensDivisoesService.validarSomaRav(this.divisoes);
    const tudoValido = validacaoVenda.valida && validacaoRav.valida;

    const saveBtn = this.modalContainer.querySelector('#btn-save-split') as HTMLButtonElement;
    if (saveBtn) {
      if (tudoValido) {
        saveBtn.disabled = false;
        saveBtn.className = 'px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 cursor-pointer';
      } else {
        saveBtn.disabled = true;
        saveBtn.className = 'px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center gap-2 bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60';
      }
    }
  }
}
