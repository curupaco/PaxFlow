// ==========================================
// SUBMÓDULO ESPECIALISTA DE RELATÓRIOS: FINANCEIRO & AUDITORIA
// Extraído de src/pages/Relatorios.ts (Fase 1 - Pacote 1.2)
// Abrangência: Faturamento & Lucratividade, Desistências & Perdas, Auditoria & Recebimentos
// ==========================================

import { calcularFaturamentoLucratividade, processarExtratoRecebimentos } from '../../../controllers/relatoriosController';
import { OrcamentosService } from '../../../services/orcamentosService';
import { ExtratoRecebimentosModal } from '../ExtratoRecebimentosModal';
import { EditTravelModal } from '../../dashboard/EditTravelModal';
import { showCustomAlert, showCustomPrompt } from '../../../services/dialog';
import { SendTemplateMessageModal } from '../../dashboard/SendTemplateMessageModal';

export interface RelatoriosFinanceiroContext {
  viagens: any[];
  orcamentos: any[];
  consultores: any[];
  clientes: any[];
  formasRecebimento: any[];
  tiposProduto: any[];
  perfil: any;
  user: any;
  filtroFaturamentoProduto: string;
  filtroFaturamentoRav: 'todos' | 'com_rav' | 'sem_rav';
  activeTab: string;
  showToast: (message: string, type?: 'success' | 'error', err?: any) => void;
  onStateChange: () => void;
  abrirModalOrcamento: (orcId: string) => void;
  getFilteredData: () => any;
  loadData: () => Promise<void>;
  render: () => void;
  setupEventListeners: () => void;
}

export class RelatoriosFinanceiroView {
  // ==========================================
  // VIEW: 3. FATURAMENTO E LUCRATIVIDADE
  // ==========================================
  public static renderFaturamento(data: any, ctx: RelatoriosFinanceiroContext): string {
    const tiposUnicosSet = new Set<string>();
    (ctx.tiposProduto || []).forEach(t => { if (t?.nome) tiposUnicosSet.add(t.nome.toUpperCase()); });
    (data.viagens || []).forEach((v: any) => {
      (v.produtos || []).forEach((p: any) => {
        if (p.tipo) tiposUnicosSet.add(p.tipo.toUpperCase());
      });
    });
    const tiposUnicos = Array.from(tiposUnicosSet).sort();

    const {
      faturamentoBruto,
      taxasTotal,
      comissaoTotal,
      markupTotal,
      ravTotal,
      lucroLiquidoReal,
      margemMedia,
      categorias
    } = calcularFaturamentoLucratividade(data.viagens, data.locPagamentos, {
      tipoProduto: ctx.filtroFaturamentoProduto,
      filtroRav: ctx.filtroFaturamentoRav
    });

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>💰 Faturamento e Lucratividade</span>
          </h2>
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
              <label for="filtro-faturamento-produto" class="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Produto:</label>
              <select id="filtro-faturamento-produto" class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer">
                <option value="todos" ${ctx.filtroFaturamentoProduto === 'todos' ? 'selected' : ''}>Todos os Produtos</option>
                ${tiposUnicos.map(tipo => `
                  <option value="${tipo}" ${ctx.filtroFaturamentoProduto === tipo ? 'selected' : ''}>${tipo}</option>
                `).join('')}
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label for="filtro-faturamento-rav" class="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">RAV:</label>
              <select id="filtro-faturamento-rav" class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer">
                <option value="todos" ${ctx.filtroFaturamentoRav === 'todos' ? 'selected' : ''}>Todos</option>
                <option value="com_rav" ${ctx.filtroFaturamentoRav === 'com_rav' ? 'selected' : ''}>⚡ Apenas com RAV (RAV <> 0)</option>
                <option value="sem_rav" ${ctx.filtroFaturamentoRav === 'sem_rav' ? 'selected' : ''}>Sem RAV (RAV = 0)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">FATURAMENTO VENDA</p>
            <p class="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(faturamentoBruto)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">TAXAS</p>
            <p class="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(taxasTotal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">COMISSÃO DA AGÊNCIA</p>
            <p class="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(comissaoTotal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">MARKUP</p>
            <p class="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(markupTotal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">RAV</p>
            <p class="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(ravTotal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">RENTABILIDADE TOTAL</p>
            <p class="text-sm sm:text-base font-black text-emerald-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lucroLiquidoReal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2 sm:col-span-1">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">MARGEM MÉDIA</p>
            <p class="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200 mt-1">${margemMedia}%</p>
          </div>
        </div>

        <!-- Profit by category table -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Rentabilidade por Linha de Produto</h3>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Categoria</th>
                  <th class="p-3">Faturamento Venda</th>
                  <th class="p-3">Taxas</th>
                  <th class="p-3">Comissão da Agência</th>
                  <th class="p-3">Markup</th>
                  <th class="p-3">RAV</th>
                  <th class="p-3">Rentabilidade Total</th>
                  <th class="p-3">Margem (%)</th>
                </tr>
              </thead>
              <tbody>
                ${categorias.map((cat: any) => `
                  <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${cat.tipo}</td>
                    <td class="p-3 font-bold text-slate-800 dark:text-slate-200">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.faturamento)}</td>
                    <td class="p-3 text-sky-600 dark:text-sky-400">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.taxas)}</td>
                    <td class="p-3 text-indigo-600 dark:text-indigo-400">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.comissao)}</td>
                    <td class="p-3 text-purple-600 dark:text-purple-400">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.markup)}</td>
                    <td class="p-3 text-amber-600 dark:text-amber-400">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.rav)}</td>
                    <td class="p-3 font-extrabold text-emerald-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.lucro)}</td>
                    <td class="p-3 font-extrabold">${cat.margem}%</td>
                  </tr>
                `).join('') || `
                  <tr>
                    <td colspan="8" class="p-6 text-center text-slate-400 font-extrabold">Nenhum produto registrado ou faturado correspondente aos filtros selecionados.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 4. DESISTÊNCIAS E PERDAS
  // ==========================================
  public static renderPerdas(data: any, ctx: RelatoriosFinanceiroContext): string {
    const perdidos = data.orcamentos.filter((o: any) => o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA');
    
    // Valor total de fuga de receita
    const totalPerdido = perdidos.reduce((acc: number, o: any) => acc + (o.valorProposta || o.valor_proposta || 0), 0);
    const countPerdas = perdidos.length;

    // Custos operacionais com reembolsos retidos
    const taxaRetencaoTotal = data.reembolsos.reduce((acc: number, r: any) => acc + (r.taxa_retencao || r.taxaRetencao || 0), 0);

    // Grouping by cancel reasons from tags
    const reasonsMap: Record<string, number> = {};
    perdidos.forEach((o: any) => {
      const tagMotivo = o.tags?.find((t: string) => t.startsWith('Desistência:'));
      const reason = tagMotivo ? tagMotivo.replace('Desistência: ', '').replace('Desistência:', '').trim() : 'Não informado';
      reasonsMap[reason] = (reasonsMap[reason] || 0) + 1;
    });

    const entries = Object.entries(reasonsMap);
    
    // Build Donut Chart via SVG
    let donutSegments = '';
    let totalReasons = entries.reduce((acc, e) => acc + e[1], 0) || 1;
    let accumulatedAngle = 0;
    const colors = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#6b7280'];

    entries.forEach(([motivo, count], i) => {
      const percentage = (count / totalReasons) * 100;
      const color = colors[i % colors.length];
      const strokeOffset = 100 - accumulatedAngle + 25; // 25 is rotation offset to start from top
      
      donutSegments += `
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="${color}" stroke-width="4.5" stroke-dasharray="${percentage} ${100 - percentage}" stroke-dashoffset="${strokeOffset}"></circle>
      `;
      accumulatedAngle += percentage;
    });

    // Render legend
    const legendHtml = entries.map(([motivo, count], i) => {
      const color = colors[i % colors.length];
      const pct = Math.round((count / totalReasons) * 100);
      return `
        <div class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${color}"></span>
          <span class="truncate flex-grow">${motivo}</span>
          <span class="font-extrabold text-slate-800 dark:text-slate-100">${pct}% (${count})</span>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>📉 Desistências, Fugas de Receita e Perdas</span>
        </h2>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fuga de Receita Estimada</p>
            <p class="text-xl font-black text-rose-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPerdido)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Desistências</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${countPerdas}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxas Retidas (Reembolsos)</p>
            <p class="text-lg font-black text-rose-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(taxaRetencaoTotal)}</p>
          </div>
        </div>

        <!-- Donut reasons -->
        <div class="grid grid-cols-1 md:grid-cols-12 items-center gap-6 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl">
          <div class="md:col-span-5 flex justify-center">
            <!-- SVG Donut Chart -->
            <svg viewBox="0 0 42 42" class="w-36 h-36 transform -rotate-90">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" stroke-width="4.5" class="dark:stroke-slate-800"></circle>
              ${donutSegments || `<circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" stroke-width="4.5"></circle>`}
            </svg>
          </div>
          <div class="md:col-span-7 space-y-2.5">
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-wider">Motivos de Desistência Registrados</h4>
            <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              ${legendHtml || '<p class="text-xs text-slate-400 font-bold">Nenhum motivo catalogado no período.</p>'}
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Lista Analítica de Ocorrências e Perdas</h3>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Destino</th>
                  <th class="p-3">Valor Proposta</th>
                  <th class="p-3">Motivo da Desistência</th>
                  <th class="p-3 text-center">Falamos c/ Cliente</th>
                  <th class="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${perdidos.map((o: any) => {
                  const tagMotivo = o.tags?.find((t: string) => t.startsWith('Desistência:'));
                  const reason = tagMotivo ? tagMotivo.replace('Desistência: ', '').replace('Desistência:', '').trim() : 'Não informado';
                  const cNome = o.nome_cliente || o.nomeCliente || 'Cliente';
                  const cTelefone = o.telefone_cliente || o.telefoneCliente || o.telefone || (ctx.clientes.find(c => c.id === (o.cliente_id || o.clienteId))?.telefone) || '';
                  const cConsultor = ctx.consultores.find(c => c.id === (o.consultor_id || o.consultorId))?.nome || 'Consultor';
                  const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';
                  const cContatoRealizado = Boolean(o.contato_realizado || o.contatoRealizado);
                  const cContatoEm = o.contato_realizado_em || o.contatoRealizadoEm;
                  const cContatoPor = o.contato_realizado_por || o.contatoRealizadoPor;
                  const cContatoPorNome = o.contato_realizado_por_profile?.nome || ctx.consultores.find(c => c.id === cContatoPor)?.nome || '';
                  const tooltipContato = cContatoRealizado 
                    ? `Contato realizado${cContatoPorNome ? ' por ' + cContatoPorNome : ''}${cContatoEm ? ' em ' + new Date(cContatoEm).toLocaleDateString('pt-BR') : ''}` 
                    : 'Marcar se já houve contato com o cliente desistente';
                  
                  return `
                    <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                      <td class="p-3 font-extrabold">
                        <button type="button" class="btn-ir-orcamento hover:underline text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-extrabold text-left cursor-pointer focus:outline-none" data-orcamento-id="${o.id}" title="Ver detalhes do Orçamento">
                          <span>${cNome}</span>
                        </button>
                      </td>
                      <td class="p-3">${o.destino}</td>
                      <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.valorProposta || o.valor_proposta || 0)}</td>
                      <td class="p-3 font-extrabold text-rose-500">${reason}</td>
                      <td class="p-3 text-center">
                        ${isAdmin ? `
                          <label class="inline-flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300" title="${tooltipContato}">
                            <input type="checkbox" class="checkbox-contato-desistencia w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer" data-orcamento-id="${o.id}" ${cContatoRealizado ? 'checked' : ''} />
                            <span class="${cContatoRealizado ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400'}">${cContatoRealizado ? 'Sim' : 'Não'}</span>
                          </label>
                        ` : `
                          <span class="inline-flex items-center gap-1 text-[11px] font-extrabold ${cContatoRealizado ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}" title="${tooltipContato}">
                            <span>${cContatoRealizado ? '✅' : '⏳'}</span>
                            <span>${cContatoRealizado ? 'Sim' : 'Pendente'}</span>
                          </span>
                        `}
                      </td>
                      <td class="p-3 text-center">
                        <div class="flex items-center justify-center gap-1.5 flex-wrap">
                          <button class="btn-ir-orcamento px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-lg transition uppercase tracking-wider flex items-center gap-1" data-orcamento-id="${o.id}" title="Ir direto para o Orçamento">
                            📄 Orçamento
                          </button>
                          <button class="btn-reabrir-orcamento-relatorio px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 text-[10px] font-black rounded-lg transition uppercase tracking-wider flex items-center gap-1 cursor-pointer" data-orcamento-id="${o.id}" title="Reabrir Orçamento (Mover para Solicitado)">
                            🔄 Reabrir
                          </button>
                          <button class="btn-chat-digisac px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 text-[10px] font-black rounded-lg transition uppercase tracking-wider flex items-center gap-1" data-cliente-nome="${cNome}" data-cliente-telefone="${cTelefone}" data-consultor-nome="${cConsultor}" data-destino="${o.destino || ''}" title="Abrir conversa no Digisac">
                            💬 WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('') || `
                  <tr>
                    <td colspan="6" class="p-6 text-center text-slate-400 font-extrabold">Nenhuma desistência registrada no período.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: 8. AUDITORIA OPERACIONAL E RECEBIMENTOS
  // ==========================================
  public static renderAuditoria(data: any, ctx: RelatoriosFinanceiroContext): string {
    const viagensAtivas = data.viagens.filter((v: any) => v.status !== 'cancelada');
    
    // Subtrair pagamentos de desconto/prejuízo do faturamento comercial bruto
    const activeViaIds = new Set(viagensAtivas.map((v: any) => v.id));
    const pagsSub = data.locPagamentos.filter((p: any) => 
      activeViaIds.has(p.viagem_id || p.viagemId) &&
      p.formas_recebimento &&
      ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
    );
    const totalSub = pagsSub.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0);
    const faturamentoTotal = Math.max(0, viagensAtivas.reduce((sum: number, v: any) => sum + (v.valor_total || v.valorTotal || 0), 0) - totalSub);

    // Sum all payments in the period matching active viagens
    let totalPago = 0;
    const paymentsGrouped: Record<string, { valor: number, icone: string }> = {};

    data.locPagamentos.forEach((p: any) => {
      const v = viagensAtivas.find((item: any) => item.id === p.viagem_id || item.id === p.viagemId);
      if (v) {
        const val = Number(p.valor) || 0;
        const formaNome = p.formas_recebimento?.nome || 'Outros';
        const formaIcone = p.formas_recebimento?.icone || '💰';
        
        const isSubtractive = ['DESCONTO', 'PREJUÍZO'].includes(formaNome.trim().toUpperCase());
        
        if (isSubtractive) {
          totalPago -= val;
        } else {
          totalPago += val;
        }
        
        if (!paymentsGrouped[formaNome]) {
          paymentsGrouped[formaNome] = { valor: 0, icone: formaIcone };
        }
        
        if (isSubtractive) {
          paymentsGrouped[formaNome].valor -= val;
        } else {
          paymentsGrouped[formaNome].valor += val;
        }
      }
    });

    const saldoPendente = Math.max(0, faturamentoTotal - totalPago);
    const quitacaoPct = faturamentoTotal > 0 ? Math.round((totalPago / faturamentoTotal) * 100) : 100;

    // Payments breakdown horizontal bars
    let paymentBreakdownHtml = '';
    const paymentEntries = Object.entries(paymentsGrouped);
    const maxPayment = paymentEntries.length > 0 ? (Math.max(...paymentEntries.map(e => Math.abs(e[1].valor))) || 1) : 1;
    paymentEntries.forEach(([nome, info]) => {
      const pct = Math.round((info.valor / (totalPago || 1)) * 100);
      const widthPct = Math.round((Math.abs(info.valor) / maxPayment) * 80) + 5;
      
      let barColorClass = 'bg-indigo-500';
      if (['DESCONTO', 'PREJUÍZO'].includes(nome.trim().toUpperCase())) {
        barColorClass = nome.trim().toUpperCase() === 'DESCONTO' ? 'bg-amber-500' : 'bg-rose-500';
      }

      paymentBreakdownHtml += `
        <div class="btn-forma-recebimento-item p-2 rounded-xl border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group select-none" data-forma="${nome}" title="Clique para ver o extrato detalhado de ${nome}">
          <div class="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
            <span class="flex items-center gap-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              <span>${info.icone}</span> 
              <span class="font-extrabold text-slate-700 dark:text-slate-200">${nome}</span>
            </span>
            <div class="flex items-center gap-2">
              <span>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(info.valor)} (${pct}%)</span>
              <span class="text-[10px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition">Ver Detalhes ➔</span>
            </div>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-lg overflow-hidden flex mt-1.5 shadow-inner">
            <div class="${barColorClass} h-full rounded-lg transition-all duration-500" style="width: ${widthPct}%"></div>
          </div>
        </div>
      `;
    });

    if (!paymentBreakdownHtml) {
      paymentBreakdownHtml = '<p class="text-xs text-slate-400 font-bold py-6 text-center">Nenhum pagamento registrado no período.</p>';
    }

    // Warnings list
    const pendencias: { cliente: string, destino: string, motivo: string, gravidade: 'alta' | 'media' }[] = [];

    viagensAtivas.forEach((v: any) => {
      const clienteNome = v.cliente?.nome || 'Cliente não informado';
      const destino = v.destino || 'Destino não informado';
      
      // 1. Check if paid value matches total value
      const vPayments = data.locPagamentos.filter((p: any) => p.viagem_id === v.id || p.viagemId === v.id);
      const vPaidSum = vPayments.reduce((s: number, p: any) => s + (p.valor || 0), 0);
      const vTotal = v.valor_total || v.valorTotal || 0;
      if (vPaidSum < vTotal) {
        pendencias.push({
          cliente: clienteNome,
          destino: destino,
          motivo: `Recebimento Pendente: quitado R$ ${vPaidSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de R$ ${vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Aberto: R$ ${(vTotal - vPaidSum).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
          gravidade: 'alta'
        });
      }

      // 2. Check process clearance
      if (!v.processo_conferido) {
        pendencias.push({
          cliente: clienteNome,
          destino: destino,
          motivo: 'Conferência de Processo da viagem pendente (dados cadastrais travados)',
          gravidade: 'media'
        });
      }

      // 3. Check LOCs financial clearance
      if (v.produtos) {
        v.produtos.forEach((p: any) => {
          const loc = (p.codigoReserva || p.codigo_reserva || p.codigo_localizador || '').trim().toUpperCase();
          if (loc) {
            const conf = data.locConferencias.find((c: any) => (c.viagem_id === v.id || c.viagemId === v.id) && (c.codigo_localizador || '').trim().toUpperCase() === loc);
            if (!conf || !conf.conferido) {
              pendencias.push({
                cliente: clienteNome,
                destino: `${destino} (LOC ${loc})`,
                motivo: `Conferência Financeira pendente para localizador ${loc} (${p.fornecedor})`,
                gravidade: 'media'
              });
            }
          }
        });
      }
    });

    const tableRows = pendencias.map(p => {
      const badgeColor = p.gravidade === 'alta' 
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' 
        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30';
      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${p.cliente}</td>
          <td class="p-3">${p.destino}</td>
          <td class="p-3 font-semibold ${p.gravidade === 'alta' ? 'text-rose-500 font-bold' : ''}">${p.motivo}</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${badgeColor}">
              ${p.gravidade === 'alta' ? 'Crítica' : 'Atenção'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🪙 Auditoria Operacional e Fluxo de Recebimento</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Faturamento Comercial</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(faturamentoTotal)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Recebido</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPago)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Saldo Pendente</p>
            <p class="text-lg font-black text-rose-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(saldoPendente)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxa de Quitação</p>
            <p class="text-lg font-black text-indigo-650 mt-1">${quitacaoPct}%</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Payment breakdown -->
          <div class="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl gap-4 flex flex-col">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Entradas por Meio de Pagamento</h3>
              <button id="btn-abrir-extrato-geral" class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 transition shadow-xs flex items-center gap-1.5 cursor-pointer">
                <span>📄</span> Extrato Completo ↗
              </button>
            </div>
            <div class="space-y-2">
              ${paymentBreakdownHtml}
            </div>
          </div>

          <!-- Audit coverage stats -->
          <div class="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Gargalos de Auditoria Gerencial</h3>
              <ul class="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <li class="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                  <span>Conferência de Processo Pendente</span>
                  <span class="text-rose-500 font-extrabold">${viagensAtivas.filter((v: any) => !v.processo_conferido).length} viagens</span>
                </li>
                <li class="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                  <span>Conferência Financeira Pendente</span>
                  <span class="text-rose-500 font-extrabold">
                    ${viagensAtivas.reduce((acc: number, v: any) => {
                      let pnd = 0;
                      if (v.produtos) {
                        v.produtos.forEach((p: any) => {
                          const loc = (p.codigoReserva || p.codigo_reserva || '').trim().toUpperCase();
                          if (loc) {
                            const conf = data.locConferencias.find((c: any) => (c.viagem_id === v.id || c.viagemId === v.id) && (c.codigo_localizador || '').trim().toUpperCase() === loc);
                            if (!conf || !conf.conferido) pnd++;
                          }
                        });
                      }
                      return acc + pnd;
                    }, 0)} localizadores
                  </span>
                </li>
                <li class="flex justify-between py-1.5">
                  <span>Viagens com Saldo em Aberto</span>
                  <span class="text-rose-500 font-extrabold">
                    ${viagensAtivas.filter((v: any) => {
                      const vPayments = data.locPagamentos.filter((p: any) => p.viagem_id === v.id || p.viagemId === v.id);
                      const vPaidSum = vPayments.reduce((s: number, p: any) => s + (p.valor || 0), 0);
                      return vPaidSum < (v.valor_total || v.valorTotal || 0);
                    }).length} viagens
                  </span>
                </li>
              </ul>
            </div>
            <div class="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 text-[10px] text-indigo-750 dark:text-indigo-400 font-semibold rounded-xl">
              ⚠️ <strong>Regra de Negócio:</strong> Viagens marcadas como "Fechadas" exigem saldo zerado e bloqueiam edições cadastrais. Certifique-se de quitar o saldo e conferir localizadores antes do embarque.
            </div>
          </div>
        </div>

        <!-- Table detailing warnings -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Fila de Pendências de Conciliação e Auditoria</h3>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Destino</th>
                  <th class="p-3">Pendência Identificada</th>
                  <th class="p-3 text-center">Criticidade</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows || `
                  <tr>
                    <td colspan="4" class="p-6 text-center text-slate-400 font-extrabold">🎉 Excelente! Nenhuma pendência financeira ou de auditoria ativa.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // ATTACH EVENTS: FATURAMENTO, PERDAS, AUDITORIA
  // ==========================================
  public static attachEvents(activeTab: string, ctx: RelatoriosFinanceiroContext): void {
    if (activeTab === 'faturamento') {
      const selectFiltroProduto = document.getElementById('filtro-faturamento-produto') as HTMLSelectElement;
      if (selectFiltroProduto) {
        selectFiltroProduto.addEventListener('change', () => {
          ctx.filtroFaturamentoProduto = selectFiltroProduto.value || 'todos';
          const container = document.getElementById('report-view-container');
          if (container) {
            container.innerHTML = RelatoriosFinanceiroView.renderFaturamento(ctx.getFilteredData(), ctx);
            RelatoriosFinanceiroView.attachEvents(activeTab, ctx);
          }
        });
      }

      const selectFiltroRav = document.getElementById('filtro-faturamento-rav') as HTMLSelectElement;
      if (selectFiltroRav) {
        selectFiltroRav.addEventListener('change', () => {
          ctx.filtroFaturamentoRav = (selectFiltroRav.value as any) || 'todos';
          const container = document.getElementById('report-view-container');
          if (container) {
            container.innerHTML = RelatoriosFinanceiroView.renderFaturamento(ctx.getFilteredData(), ctx);
            RelatoriosFinanceiroView.attachEvents(activeTab, ctx);
          }
        });
      }
    }

    if (activeTab === 'perdas') {
      // Visualização de Orçamento
      document.querySelectorAll('.btn-ir-orcamento').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const orcId = btn.getAttribute('data-orcamento-id');
          if (orcId) {
            ctx.abrirModalOrcamento(orcId);
          }
        });
      });

      // Alternância de Contato com o Cliente em Desistências (Apenas Administradores)
      document.querySelectorAll('.checkbox-contato-desistencia').forEach(input => {
        input.addEventListener('change', async (e) => {
          e.stopPropagation();
          if ((ctx.perfil?.role || '').toLowerCase() !== 'admin') {
            ctx.showToast('Apenas administradores podem validar contatos de desistência.', 'error');
            return;
          }

          const target = input as HTMLInputElement;
          const orcId = target.getAttribute('data-orcamento-id');
          if (!orcId) return;

          const checked = target.checked;
          try {
            const res = await OrcamentosService.alternarContatoDesistencia(orcId, checked, ctx.perfil);
            if (res.success) {
              const orc = ctx.orcamentos.find(o => o.id === orcId);
              if (orc) {
                orc.contato_realizado = checked;
                orc.contatoRealizado = checked;
                orc.contato_realizado_em = res.contatoRealizadoEm;
                orc.contatoRealizadoEm = res.contatoRealizadoEm;
                orc.contato_realizado_por = res.contatoRealizadoPor;
                orc.contatoRealizadoPor = res.contatoRealizadoPor;
              }

              ctx.showToast(checked ? 'Contato com cliente registrado com sucesso!' : 'Contato de desistência desmarcado.', 'success');
              
              const container = document.getElementById('report-view-container');
              if (container && ctx.activeTab === 'perdas') {
                container.innerHTML = RelatoriosFinanceiroView.renderPerdas(ctx.getFilteredData(), ctx);
                RelatoriosFinanceiroView.attachEvents(activeTab, ctx);
              }
            }
          } catch (err: any) {
            console.error('Erro ao alternar contato com cliente:', err);
            ctx.showToast('Erro ao atualizar status de contato.', 'error');
            target.checked = !checked;
          }
        });
      });

      // Botão de Reabrir Orçamento Desistido no Relatório
      document.querySelectorAll('.btn-reabrir-orcamento-relatorio').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const orcId = btn.getAttribute('data-orcamento-id');
          if (!orcId) return;

          const orc = ctx.orcamentos.find(o => o.id === orcId);
          const nomeCliente = orc?.nome_cliente || orc?.nomeCliente || 'Cliente';

          const motivo = await showCustomPrompt(
            `Informe o motivo da reabertura para o orçamento de ${nomeCliente} (opcional):`,
            'Reabrir Orçamento',
            'Ex: Cliente voltou a solicitar cotação...'
          );
          if (motivo === null) return; // Usuário cancelou

          try {
            const res = await OrcamentosService.reabrirOrcamento(orcId, motivo, ctx.perfil);
            if (res.success) {
              ctx.showToast('Orçamento reaberto com sucesso e movido para Solicitado!', 'success');
              
              if (orc) {
                orc.status = 'SOLICITADO';
                orc.sub_status = null;
                orc.subStatus = undefined;
                orc.contato_realizado = false;
                orc.contatoRealizado = false;
              }

              const container = document.getElementById('report-view-container');
              if (container && ctx.activeTab === 'perdas') {
                container.innerHTML = RelatoriosFinanceiroView.renderPerdas(ctx.getFilteredData(), ctx);
                RelatoriosFinanceiroView.attachEvents(activeTab, ctx);
              }
            }
          } catch (err: any) {
            showCustomAlert(`Erro ao reabrir orçamento:\n\n${err.message || err}`, 'Erro na Reabertura');
          }
        });
      });

      // WhatsApp / Digisac
      document.querySelectorAll('.btn-chat-digisac').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const clienteNome = btn.getAttribute('data-cliente-nome') || '';
          const clienteTelefone = btn.getAttribute('data-cliente-telefone') || '';
          const consultorNome = btn.getAttribute('data-consultor-nome') || '';
          const destino = btn.getAttribute('data-destino') || '';

          if (!clienteTelefone) {
            ctx.showToast('Cliente não possui telefone cadastrado para WhatsApp.', 'error');
            return;
          }

          SendTemplateMessageModal.open({
            clienteNome,
            clienteTelefone,
            consultorNome,
            destino,
            focusChatHistory: true,
            showToast: (msg: string, type?: 'success' | 'error') => ctx.showToast(msg, type)
          });
        });
      });
    }

    if (activeTab === 'auditoria') {
      const abrirExtratoRecebimentos = (formaInicial: string = 'TODAS') => {
        const dataRelatorio = ctx.getFilteredData();
        const itensExtrato = processarExtratoRecebimentos(
          dataRelatorio.viagens,
          dataRelatorio.locPagamentos,
          ctx.consultores
        );

        ExtratoRecebimentosModal.open({
          itens: itensExtrato,
          formaInicial,
          consultores: ctx.consultores,
          formasDisponiveis: ctx.formasRecebimento,
          onAbrirViagem: async (tripId: string) => {
            const editModal = new EditTravelModal({
              perfil: ctx.perfil,
              consultores: ctx.consultores,
              tiposProduto: ctx.tiposProduto,
              viagens: ctx.viagens,
              isFallbackMode: false,
              user: ctx.user,
              onUpdate: async () => {
                await ctx.loadData();
                ctx.render();
                ctx.setupEventListeners();
              },
              showToast: (m, t, err) => ctx.showToast(m, t, err),
              checkSLA: () => ({ alert: false, type: null, text: '' })
            });
            await editModal.open(tripId, 'detalhes');
          }
        });
      };

      document.getElementById('btn-abrir-extrato-geral')?.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirExtratoRecebimentos('TODAS');
      });

      document.querySelectorAll('.btn-forma-recebimento-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const forma = btn.getAttribute('data-forma') || 'TODAS';
          abrirExtratoRecebimentos(forma);
        });
      });
    }
  }

  // ==========================================
  // EXPORTAÇÃO CSV: FATURAMENTO, PERDAS, AUDITORIA
  // ==========================================
  public static appendCsvContent(activeTab: string, data: any, ctx: RelatoriosFinanceiroContext): string | null {
    if (activeTab === 'faturamento') {
      let csvContent = 'Categoria;Faturamento Venda;Taxas;Comissão da Agência;Markup;RAV;Rentabilidade Total;Margem (%)\n';
      
      const resFat = calcularFaturamentoLucratividade(data.viagens, data.locPagamentos, {
        tipoProduto: ctx.filtroFaturamentoProduto,
        filtroRav: ctx.filtroFaturamentoRav
      });

      // Linhas detalhadas por categoria
      resFat.categorias.forEach((c: any) => {
        csvContent += `"${c.tipo}";${c.faturamento};${c.taxas};${c.comissao};${c.markup};${c.rav};${c.lucro};"${c.margem}%"\n`;
      });

      // Linha consolidada total
      csvContent += `"CONSOLIDADO TOTAL";${resFat.faturamentoBruto};${resFat.taxasTotal};${resFat.comissaoTotal};${resFat.markupTotal};${resFat.ravTotal};${resFat.lucroLiquidoReal};"${resFat.margemMedia}%"\n`;
      return csvContent;
    }

    if (activeTab === 'perdas') {
      let csvContent = 'Cliente;Destino;Valor Cotacao;Motivo Desistencia\n';
      const perdidos = data.orcamentos.filter((o: any) => o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA');
      perdidos.forEach((o: any) => {
        const tagMotivo = o.tags?.find((t: string) => t.startsWith('Desistência:'));
        const reason = tagMotivo ? tagMotivo.replace('Desistência: ', '').replace('Desistência:', '').trim() : 'Não informado';
        csvContent += `"${o.nome_cliente || o.nomeCliente}";"${o.destino}";${o.valorProposta || o.valor_proposta || 0};"${reason}"\n`;
      });
      return csvContent;
    }

    if (activeTab === 'auditoria') {
      let csvContent = 'Métrica / Pendência;Cliente / Detalhe;Destino / Localizador;Valor / Detalhamento\n';
      
      const viagensAtivas = data.viagens.filter((v: any) => v.status !== 'cancelada');
      const activeViaIds = new Set(viagensAtivas.map((v: any) => v.id));
      const pagsSub = data.locPagamentos.filter((p: any) => 
        activeViaIds.has(p.viagem_id || p.viagemId) &&
        p.formas_recebimento &&
        ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
      );
      const totalSub = pagsSub.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0);
      const faturamentoTotal = Math.max(0, viagensAtivas.reduce((sum: number, v: any) => sum + (v.valor_total || v.valorTotal || 0), 0) - totalSub);

      let totalPago = 0;
      data.locPagamentos.forEach((p: any) => {
        const v = viagensAtivas.find((item: any) => item.id === p.viagem_id || item.id === p.viagemId);
        if (v) {
          const val = Number(p.valor) || 0;
          const formaNome = p.formas_recebimento?.nome || '';
          if (['DESCONTO', 'PREJUÍZO'].includes(formaNome.trim().toUpperCase())) {
            totalPago -= val;
          } else {
            totalPago += val;
          }
        }
      });

      csvContent += `"Faturamento Comercial";"Consolidado";"-";${faturamentoTotal}\n`;
      csvContent += `"Total Recebido";"Consolidado";"-";${totalPago}\n`;
      csvContent += `"Saldo Pendente";"Consolidado";"-";${Math.max(0, faturamentoTotal - totalPago)}\n`;

      // Export warnings
      viagensAtivas.forEach((v: any) => {
        const clienteNome = v.cliente?.nome || 'Cliente não informado';
        const destino = v.destino || 'Destino não informado';
        const vPayments = data.locPagamentos.filter((p: any) => p.viagem_id === v.id || p.viagemId === v.id);
        const vPaidSum = vPayments.reduce((s: number, p: any) => s + (p.valor || 0), 0);
        const vTotal = v.valor_total || v.valorTotal || 0;
        
        if (vPaidSum < vTotal) {
          csvContent += `"Pagamento Pendente";"${clienteNome}";"${destino}";"Pendente: R$ ${(vTotal - vPaidSum).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"\n`;
        }
        if (!v.processo_conferido) {
          csvContent += `"Processo Pendente";"${clienteNome}";"${destino}";"Auditoria de Processo pendente"\n`;
        }
        if (v.produtos) {
          v.produtos.forEach((p: any) => {
            const loc = (p.codigoReserva || p.codigo_reserva || '').trim().toUpperCase();
            if (loc) {
              const conf = data.locConferencias.find((c: any) => (c.viagem_id === v.id || c.viagemId === v.id) && (c.codigo_localizador || '').trim().toUpperCase() === loc);
              if (!conf || !conf.conferido) {
                const vVenda = Number(p.valor_venda ?? p.valorVenda ?? 0);
                csvContent += `"Conferência Financeira Pendente";"${clienteNome}";"${destino} (LOC ${loc})";"${p.fornecedor} - Venda: R$ ${vVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"\n`;
              }
            }
          });
        }
      });
      return csvContent;
    }

    return null;
  }
}
