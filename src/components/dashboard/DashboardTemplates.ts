import { renderCurrencyInputHTML, renderDateInputHTML } from '../../utils/masks';

export const formatarDataLocal = (dStr: string): string => {
  if (!dStr) return '';
  const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
  const parts = dataApenas.split('-');
  if (parts.length !== 3) return dStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

/**
 * Renderiza o HTML da linha do tempo/cronograma de datas
 */
export function renderTimelineHTML(cronograma: any[]): string {
  if (cronograma.length === 0) {
    return `
      <div class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
        <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">📅 Cronograma Geral de Datas</h4>
        <p class="text-xs text-slate-400 dark:text-slate-500 italic">Nenhuma data cadastrada nesta viagem.</p>
      </div>
    `;
  }

  return `
    <div class="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
      <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">📅 Cronograma Geral de Datas</h4>
      <div class="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-3.5 my-2">
        ${cronograma.map(item => `
          <div class="relative flex items-start gap-3">
            <!-- Bullet indicator -->
            <div class="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 border border-white dark:border-slate-900"></div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${item.cor}">
                  ${formatarDataLocal(item.data)}
                </span>
              </div>
              <p class="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">${item.rotulo}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Renderiza a listagem de reembolsos
 */
export function renderReembolsosTabHTML(reembolsos: any[]): string {
  if (!reembolsos || reembolsos.length === 0) return '';
  return `
    <h4 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Solicitações de Reembolso nesta Viagem</h4>
    <div class="space-y-3">
      ${reembolsos.map((r: any) => {
        let statusBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        let statusLabel = r.status;
        if (r.status === 'solicitado' || r.status === 'Aguardando Fornecedor') {
          statusBadgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/30';
          statusLabel = 'Aguardando Fornecedor';
        } else if (r.status === 'em_analise') {
          statusBadgeClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/30';
          statusLabel = 'Em Análise';
        } else if (r.status === 'aprovado') {
          statusBadgeClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100/30';
          statusLabel = 'Aprovado';
        } else if (r.status === 'recusado') {
          statusBadgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/30';
          statusLabel = 'Recusado';
        } else if (r.status === 'pago') {
          statusBadgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30';
          statusLabel = '💸 Pago / Concluído';
        } else if (r.status === 'cancelado') {
          statusBadgeClass = 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200/50';
          statusLabel = 'Cancelado';
        }

        const dataSolicitacao = r.data_solicitacao ? new Date(r.data_solicitacao).toLocaleDateString('pt-BR') : '';
        const dataResolucao = r.data_resolucao ? new Date(r.data_resolucao).toLocaleDateString('pt-BR') : '';

        return `
          <div class="p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-2">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">Solicitação de Reembolso</span>
              <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${statusBadgeClass}">
                ${statusLabel}
              </span>
            </div>
            
            <div class="grid grid-cols-2 gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Produto Afetado:</span>
                <strong class="font-extrabold text-slate-800 dark:text-slate-200">${r.produto ? `[${(r.produto.tipo || 'outro').toUpperCase()}] ${r.produto.fornecedor}` : 'Viagem Integral'}</strong>
              </div>
              <div>
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Valor Solicitado:</span>
                <strong class="text-slate-800 dark:text-slate-200">R$ ${Number(r.valor_solicitado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              ${r.valor_aprovado ? `
                <div>
                  <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Valor Aprovado:</span>
                  <strong class="text-emerald-600 dark:text-emerald-400 font-black">R$ ${Number(r.valor_aprovado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
              ` : ''}
              ${r.taxa_retencao ? `
                <div>
                  <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Taxa Retenção:</span>
                  <strong class="text-rose-600 dark:text-rose-400 font-bold">R$ ${Number(r.taxa_retencao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
              ` : ''}
              <div>
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Data Abertura:</span>
                <span class="font-semibold text-slate-800 dark:text-slate-200">${dataSolicitacao}</span>
              </div>
              ${dataResolucao ? `
                <div>
                  <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Data Conclusão:</span>
                  <span class="font-semibold text-emerald-600 dark:text-emerald-400">${dataResolucao}</span>
                </div>
              ` : ''}
            </div>

            <div class="pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
              <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Motivo / Justificativa:</span>
              <p class="text-xs text-slate-700 dark:text-slate-300 font-semibold italic mt-0.5 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">${r.motivo_cancelamento || 'Sem motivo registrado.'}</p>
            </div>

            ${r.observacoes_financeiras ? `
              <div class="pt-1 text-[11px]">
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Obs Financeiras:</span>
                <p class="text-slate-600 dark:text-slate-400 font-medium mt-0.5">${r.observacoes_financeiras}</p>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Renderiza o formulário de cadastro de novo produto
 */
export function renderNovoProdutoFormHTML(tiposProduto: any[]): string {
  return `
    <h4 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3 flex items-center gap-1">➕ Adicionar Produto / Serviço</h4>
    
    <form id="form-novo-produto" class="space-y-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Tipo *</label>
          <select id="prod-tipo" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155">
            <option value="" disabled selected class="bg-white dark:bg-slate-800 text-slate-400">Selecione o tipo...</option>
            ${tiposProduto.filter((t: any) => t.ativo && t.nome !== 'MUDAR!').map((t: any) => `
              <option value="${t.nome}" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">${t.nome}</option>
            `).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Fornecedor</label>
          <input id="prod-fornecedor" type="text" placeholder="ex: LATAM, Hilton" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
        </div>
        
        <div id="container-campos-condicionais" class="hidden bg-slate-100/40 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/30 col-span-2"></div>
      </div>

      <div>
        <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Descrição</label>
        <input id="prod-descricao" type="text" placeholder="ex: Voo GRU-JFK ou Quarto Deluxe" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Código (LOC) *</label>
          <input id="prod-reserva" list="existing-locs-list" type="text" required maxlength="20" placeholder="ex: LOC12" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155 uppercase" />
          <datalist id="existing-locs-list"></datalist>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Venda (R$) *</label>
          ${renderCurrencyInputHTML('prod-venda', '')}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Data do Serviço (DD/MM/AAAA) *</label>
          ${renderDateInputHTML('prod-data', '')}
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Status *</label>
          <select id="prod-status" required class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155">
            <option value="reservado" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Reservado</option>
            <option value="emitido" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" selected>Emitido</option>
          </select>
        </div>
      </div>

      <!-- Datas Adicionais -->
      <div id="container-datas-adicionais" class="space-y-2.5 mt-2"></div>
      <div class="flex justify-start">
        <button type="button" id="btn-add-data-adicional" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black text-[9px] tracking-wider rounded-lg transition uppercase flex items-center gap-1">
          ➕ Adicionar Outra Data
        </button>
      </div>

      <div class="flex justify-end pt-1">
        <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
          Adicionar Produto
        </button>
      </div>
    </form>
  `;
}

/**
 * Renderiza o painel do editor lateral com múltiplos serviços (siblingProducts)
 */
export function renderLateralEditorPaneHTML(
  selectedProduct: any,
  activeTab: string,
  tiposProduto: any[],
  getIconForType: (tipo: string) => string
): string {
  if (!selectedProduct) return '';

  const isVendaValid = (selectedProduct.valor_venda || 0) > 0;

  return `
    <div id="selected-product-editor-pane" class="space-y-4 lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6 pt-4 lg:pt-0 ${activeTab === 'produtos' ? 'block' : 'hidden lg:block'} max-h-[80vh] overflow-y-auto pr-1">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2 sticky top-0 bg-white dark:bg-slate-900 z-10">
        <h4 class="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
          <span class="p-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-lg text-xs flex items-center justify-center">${getIconForType(selectedProduct.tipo)}</span>
          <span>Editar Serviço: ${selectedProduct.tipo}</span>
        </h4>
        <button id="btn-close-product-editor" type="button" class="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded transition uppercase tracking-wider">
          Fechar
        </button>
      </div>

      <div class="space-y-6 pb-4">
        <div class="p-4 rounded-2xl border border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-500/5 bg-indigo-50/5 dark:bg-indigo-950/5 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-1">
            <span class="text-xs font-extrabold text-slate-700 dark:text-slate-200">
              Detalhes do Serviço
            </span>
            <span class="px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider ${
              selectedProduct.status === 'emitido' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                : selectedProduct.status === 'cancelado'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                : selectedProduct.status === 'reembolsado'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
            }">${selectedProduct.status}</span>
          </div>

          <form id="form-editar-produto-lateral-${selectedProduct.id}" class="space-y-4">
            <div class="grid grid-cols-1 gap-4">
              
              <!-- Seção de Dados (Campos de Entrada) -->
              <div class="space-y-3.5">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Tipo *</label>
                  <select id="edit-prod-tipo-${selectedProduct.id}" required class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155">
                    ${tiposProduto.filter((t: any) => t.ativo && t.nome !== 'MUDAR!').map((t: any) => `
                      <option value="${t.nome}" ${t.nome === selectedProduct.tipo ? 'selected' : ''}>${t.nome}</option>
                    `).join('')}
                  </select>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Fornecedor *</label>
                  <input id="edit-prod-fornecedor-${selectedProduct.id}" type="text" required value="${selectedProduct.fornecedor || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Descrição</label>
                  <input id="edit-prod-descricao-${selectedProduct.id}" type="text" value="${selectedProduct.descricao || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155" />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Código (LOC) *</label>
                    <input id="edit-prod-reserva-${selectedProduct.id}" type="text" required maxlength="20" value="${selectedProduct.codigo_reserva || ''}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs uppercase transition duration-155" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Status *</label>
                    <select id="edit-prod-status-${selectedProduct.id}" required class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs transition duration-155">
                      <option value="reservado" ${selectedProduct.status === 'reservado' ? 'selected' : ''}>Reservado</option>
                      <option value="emitido" ${selectedProduct.status === 'emitido' ? 'selected' : ''}>Emitido</option>
                      <option value="cancelado" ${selectedProduct.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                      <option value="reembolsado" ${selectedProduct.status === 'reembolsado' ? 'selected' : ''}>Reembolsado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Data do Serviço *</label>
                  ${renderDateInputHTML(`edit-prod-data-${selectedProduct.id}`, formatarDataLocal(selectedProduct.data_servico))}
                </div>

                <!-- Container para Campos Dinâmicos (dados_adicionais) -->
                <div id="edit-container-campos-condicionais-${selectedProduct.id}" class="hidden bg-slate-100/40 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40 space-y-2"></div>

                <!-- Datas Adicionais -->
                <div class="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">📅 Demais Serviços Aninhados</span>
                  <div id="edit-container-datas-adicionais-${selectedProduct.id}" class="space-y-2"></div>
                  <div class="flex justify-start">
                    <button type="button" id="edit-btn-add-data-adicional-${selectedProduct.id}" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black text-[9px] tracking-wider rounded-lg transition uppercase flex items-center gap-1 mt-1">
                      ➕ Adicionar Outra Data
                    </button>
                  </div>
                </div>
              </div>

              <!-- Seção Financeira (Valores e Rentabilidade) -->
              <div class="space-y-3.5 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-850 pb-2 mb-1">Valores do Serviço</span>
                
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Venda (R$) *</label>
                  ${renderCurrencyInputHTML(`edit-prod-venda-${selectedProduct.id}`, selectedProduct.valor_venda || 0)}
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Taxas (Embarque/Serviço)</label>
                  ${renderCurrencyInputHTML(`edit-prod-taxa-${selectedProduct.id}`, selectedProduct.taxa || 0, '0,00', true, !isVendaValid)}
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Comissão da Agência</label>
                  ${renderCurrencyInputHTML(`edit-prod-comissao-${selectedProduct.id}`, selectedProduct.comissao || 0, '0,00', true, !isVendaValid)}
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Markup</label>
                  ${renderCurrencyInputHTML(`edit-prod-markup-${selectedProduct.id}`, selectedProduct.markup || 0, '0,00', true, !isVendaValid)}
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">RAV</label>
                  ${renderCurrencyInputHTML(`edit-prod-rav-${selectedProduct.id}`, selectedProduct.rav || 0, '0,00', true, !isVendaValid)}
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Tarifa (Informação)</label>
                  ${renderCurrencyInputHTML(`edit-prod-tarifa-${selectedProduct.id}`, selectedProduct.tarifa || 0, '0,00', true, true)}
                </div>

                <!-- Totalizadores locais -->
                <div class="p-3 bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-2 mt-4 shadow-sm">
                  <div class="flex justify-between items-center text-xs">
                    <span class="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider">Total Distribuído:</span>
                    <strong id="edit-det-total-distribuido-${selectedProduct.id}" class="font-black text-slate-700 dark:text-slate-200">R$ 0,00</strong>
                  </div>
                  <div class="flex justify-between items-center text-xs">
                    <span class="font-bold text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider">Saldo Pendente:</span>
                    <strong id="edit-det-saldo-pendente-${selectedProduct.id}" class="font-black text-rose-600 dark:text-rose-400">R$ 0,00</strong>
                  </div>
                </div>
              </div>

            </div>

            <!-- Botões de Ação -->
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="submit" class="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] tracking-wider rounded-lg shadow-sm transition uppercase">
                Salvar Este Serviço
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 z-10 py-2">
        <button id="edit-btn-cancelar-lateral" type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs tracking-wider rounded-lg transition uppercase">
          Voltar
        </button>
      </div>
    </div>
  `;
}
