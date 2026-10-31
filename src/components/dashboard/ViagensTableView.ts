/**
 * src/components/dashboard/ViagensTableView.ts
 *
 * Módulo de Apresentação da Lista de Viagens do Dashboard Operacional PaxFlow.
 * Renderiza de forma sincronizada:
 *  - Tabela densa desktop com colunas ordenáveis e ações operacionais.
 *  - Cards mobile responsivos com suporte a gestos swipe e botões rápidos.
 *  - Badges de SLA, Risk Score, status financeiro (PAGO), localizadores e parcerias/splits.
 */

import { highlightMatch } from '../../utils/textHelper';
import { isRiskScoreEnabled } from '../../utils/featureFlags';
import { RiskScoreService } from '../../services/riskScoreService';

export interface ViagensTableViewContext {
  user: any;
  perfil: any;
  settings: any;
  consultores: any[];
  buscaTermo: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  isTodosReembolsosConcluidos: (viagem: any) => boolean;
  checkSLA: (viagem: any) => { alert: boolean; type: 'pre-embarque' | 'pos-viagem' | 'reembolso' | null; text: string };
  getTripFinancialTotals: (viagem: any) => {
    totalVenda: number;
    totalRentabilidade: number;
    totalMarkup: number;
    totalRav: number;
    isDividida: boolean;
    fatiaVenda: number;
    fatiaRav: number;
  };
  getConsultorContextoAtivoId: () => string | null;
}

export interface ViagensTableViewHandlers {
  onSort: (field: string) => void;
  onOpenTripDetails: (tripId: string) => void;
  onOpenWhatsApp: (tripId: string) => void;
  onCopyNPS: (tripId: string) => void;
  onDeleteTrip?: (tripId: string) => void;
  onOpenRiskScore: (tripId: string) => void;
  onStatusChange: (tripId: string, newStatus: string, oldStatus: string, selectEl: HTMLSelectElement) => void;
  onShareMobile: (tripId: string) => void;
}

export class ViagensTableView {
  /**
   * Renderiza a visualização conjunta da listagem (Estado Vazio OU Mobile Cards + Desktop Table)
   */
  public static renderTableAndMobileView(viagens: any[], ctx: ViagensTableViewContext): string {
    if (viagens.length === 0) {
      return `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4 flex-1">
          <div class="text-slate-300 dark:text-slate-700 text-5xl">✈️</div>
          <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Nenhuma venda operacional localizada</h3>
          <p class="text-xs text-slate-400 dark:text-slate-400 font-medium max-w-sm">Tente limpar os filtros de data, alterar o termo de busca ou selecionar outra aba de status.</p>
        </div>
      `;
    }

    return `
      <!-- Mobile View: Cards Layout (Visible only on mobile portrait) -->
      <div class="block md:hidden overflow-y-auto flex-1 space-y-4 custom-scrollbar pr-1 pb-4">
        ${viagens.map(v => this.renderMobileCard(v, ctx)).join('')}
      </div>

      <!-- Desktop View: Table Layout (Hidden on mobile portrait) -->
      <div class="hidden md:flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex-1 flex-col min-h-0 scroll-indicator-fade">
        <div class="overflow-auto flex-1 min-h-0 custom-scrollbar pb-1">
          <table class="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-950 text-[9px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 shadow-xs">
                <th class="px-4 py-3 w-[80px] text-center">${this.renderSortHeader('SLA', 'sla', ctx)}</th>
                <th class="px-5 py-3">${this.renderSortHeader('Cliente', 'cliente', ctx)}</th>
                <th class="px-5 py-3">${this.renderSortHeader('Destino / Produtos', 'destino', ctx)}</th>
                <th class="px-5 py-3">${this.renderSortHeader('Data Fin.', 'data_financeiro', ctx)}</th>
                <th class="px-5 py-3">${this.renderSortHeader('Financeiro', 'financeiro', ctx)}</th>
                <th class="px-5 py-3">${this.renderSortHeader('Consultor', 'consultor', ctx)}</th>
                <th class="px-5 py-3 w-[180px]">${this.renderSortHeader('Fase / Status', 'status', ctx)}</th>
                <th class="px-2 py-3 w-32 text-center text-slate-400 tracking-widest text-[9px] font-black uppercase">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
              ${viagens.map(v => this.renderTableRow(v, ctx)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza o cabeçalho de coluna ordenável
   */
  public static renderSortHeader(label: string, field: string, ctx: ViagensTableViewContext): string {
    const isSorted = ctx.sortField === field;
    const arrow = isSorted
      ? (ctx.sortDirection === 'asc' ? '▲' : '▼')
      : '⇅';
    const activeClass = isSorted
      ? 'text-indigo-600 dark:text-indigo-400 font-black'
      : 'text-slate-300 dark:text-slate-400 group-hover:text-slate-400';

    return `
      <button class="btn-sort-column group inline-flex items-center gap-1.5 focus:outline-none uppercase tracking-wider text-[10px] font-black text-slate-400 dark:text-slate-400" data-sort-field="${field}">
        <span>${label}</span>
        <span class="${activeClass} text-[8px] transition-transform duration-200">${arrow}</span>
      </button>
    `;
  }

  /**
   * Renderiza uma linha individual da tabela desktop
   */
  public static renderTableRow(v: any, ctx: ViagensTableViewContext): string {
    const todosConcluidos = ctx.isTodosReembolsosConcluidos(v);
    const isViagemReembolso = v.status === 'reembolso_solicitado';
    const sla = (isViagemReembolso && todosConcluidos) ? { alert: false, type: null, text: '' } : ctx.checkSLA(v);
    const temReembolsoPendente = !todosConcluidos && (isViagemReembolso || (v.reembolsos && v.reembolsos.length > 0));

    let slaIcon = '🟢';
    let rowBg = 'bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/20';

    if (isViagemReembolso && todosConcluidos) {
      slaIcon = '✅';
      rowBg = 'bg-emerald-50/10 dark:bg-emerald-950/5 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10';
    } else if (sla.alert) {
      if (sla.type === 'pre-embarque') {
        slaIcon = '⚠️';
        rowBg = 'bg-rose-50/15 dark:bg-rose-950/5 hover:bg-rose-50/25 dark:hover:bg-rose-950/10';
      } else if (sla.type === 'pos-viagem') {
        slaIcon = '🚨';
        rowBg = 'bg-amber-50/15 dark:bg-amber-950/5 hover:bg-amber-50/25 dark:hover:bg-amber-950/10';
      } else if (sla.type === 'reembolso') {
        slaIcon = '🚨';
        rowBg = 'bg-rose-50/20 dark:bg-rose-950/20 hover:bg-rose-50/30 dark:hover:bg-rose-950/30';
      }
    }

    const formatarData = (dStr: string) => {
      if (!dStr) return '-';
      const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const parts = dataApenas.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Obter totais financeiros já calculados e rateados proporcionalmente para o consultor em foco
    const finTotals = ctx.getTripFinancialTotals(v);
    const valorVenda = finTotals.totalVenda;
    const rentabilidade = finTotals.totalRentabilidade;
    const totalMarkup = finTotals.totalMarkup;
    const totalRav = finTotals.totalRav;

    // Calcular PaxFlow Risk Score™
    const risk = RiskScoreService.calculateTripRiskScore(v, v.cliente, v.produtos, ctx.settings, ctx.user, ctx.perfil);

    return `
      <tr class="${rowBg} group transition-colors duration-150">
        <!-- SLA & Risk Score -->
        <td class="px-4 py-4 text-center select-none" title="Legenda do SLA:
🟢 Normal (Tudo em dia)
⚠️ Alerta (Pré-embarque próximo)
🚨 Atrasado (Pós-viagem excedido)
✅ Concluído (Reembolso pago)

Atual: ${sla.alert ? sla.text : (isViagemReembolso && todosConcluidos ? 'Reembolso Concluído' : 'SLA Normal')}">
          <div class="flex items-center justify-center gap-2">
            <span class="text-base">${slaIcon}</span>
            ${isRiskScoreEnabled(ctx.user, ctx.perfil, ctx.settings) ? `
              <button class="btn-open-risk-score px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1 border shadow-xs transition transform hover:scale-105 ${risk.badgeClass}" data-trip-id="${v.id}" title="PaxFlow Risk Score™: ${risk.score}/100 (${risk.fraseStatus}) — Clique para abrir o diagnósticos">
                <span>🛡️ ${risk.score}</span>
              </button>
            ` : ''}
          </div>
        </td>

        <!-- Cliente -->
        <td class="px-5 py-4 min-w-[200px]">
          <div class="font-black text-slate-800 dark:text-slate-100">${highlightMatch(v.cliente?.nome || 'Cliente Desconhecido', ctx.buscaTermo)}</div>
          ${v.codigoRef ? `
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 font-mono font-bold text-[9px] rounded tracking-wider border border-indigo-200/40 dark:border-indigo-850 uppercase">
                ${highlightMatch(v.codigoRef, ctx.buscaTermo)}
              </span>
            </div>
          ` : ''}
        </td>

        <!-- Destino / Produtos -->
        <td class="px-5 py-4">
          <div class="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
            <span>✈️ ${highlightMatch(v.destino, ctx.buscaTermo)}</span>
            ${temReembolsoPendente ? `
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[10px] font-black text-rose-600 dark:text-rose-400 shrink-0" title="Existe processo de reembolso em andamento para esta viagem">
                <span>💸</span>
                <span>Reembolso</span>
              </span>
            ` : ''}
          </div>
          <!-- Localizadores dos Produtos -->
          ${v.produtos && v.produtos.length > 0 ? `
            <div class="flex flex-wrap gap-1 mt-1.5">
              ${(() => {
                const locs: string[] = Array.from(new Set<string>(
                  (v.produtos || [])
                    .map((p: any) => (p.codigo_reserva || p.codigoReserva || '').trim().toUpperCase())
                    .filter(Boolean)
                ));
                if (locs.length === 0) {
                  return `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SEM LOC</span>`;
                }
                return locs.map((loc: string) => `
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 tracking-wider" title="Localizador: ${loc}">
                    ${highlightMatch(loc, ctx.buscaTermo)}
                  </span>
                `).join('');
              })()}
            </div>
          ` : ''}
        </td>

        <!-- Data Fin. -->
        <td class="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-semibold">
          ${v.data_financeiro ? formatarData(v.data_financeiro) : '-'}
        </td>

        <!-- Financeiro -->
        <td class="px-5 py-4 whitespace-nowrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-black text-indigo-600 dark:text-indigo-400">
              R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            ${finTotals.isDividida ? `
              <span class="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800" title="Cota de Venda proporcional: ${Math.round(finTotals.fatiaVenda * 100)}%">
                (${Math.round(finTotals.fatiaVenda * 100)}%)
              </span>
            ` : ''}
            ${v.isTotalmentePago ? `
              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 uppercase tracking-wider" title="Todos os produtos/serviços quitados">
                ✔️ PAGO
              </span>
            ` : ''}
          </div>
          <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5" title="Rentabilidade Total (Venda - Custos de Fornecedor)">
            Rent: R$ ${rentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          ${(totalMarkup > 0 || totalRav > 0) ? `
            <div class="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
              MKP: R$ ${totalMarkup.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | RAV: R$ ${totalRav.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              ${finTotals.isDividida && finTotals.fatiaRav !== finTotals.fatiaVenda ? `
                <span class="text-[8px] font-black text-amber-600 dark:text-amber-400 ml-0.5" title="Cota de RAV proporcional: ${Math.round(finTotals.fatiaRav * 100)}%">
                  (${Math.round(finTotals.fatiaRav * 100)}% RAV)
                </span>
              ` : ''}
            </div>
          ` : ''}
        </td>

        <!-- Consultor -->
        <td class="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-extrabold text-xs">
          ${(() => {
            const contextConsultorId = ctx.getConsultorContextoAtivoId() || ctx.user?.id;
            const temParceria = Array.isArray(v.divisoes) && v.divisoes.length > 1;
            const minhaDivisao = Array.isArray(v.divisoes) ? v.divisoes.find((d: any) => d.consultor_id === contextConsultorId) : null;
            if (minhaDivisao && temParceria) {
              const pctVenda = Math.round(minhaDivisao.percentual);
              const rawRav = minhaDivisao.percentual_rav ?? minhaDivisao.percentualRav;
              const pctRav = rawRav !== undefined && rawRav !== null ? Math.round(rawRav) : pctVenda;
              const badgeTexto = pctRav !== pctVenda
                ? `🤝 Parceria ${pctVenda}% • ✈️ RAV ${pctRav}%`
                : `🤝 Parceria (${pctVenda}%)`;
              return `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 text-[10px] font-black">
                  ${badgeTexto}
                </span>
              `;
            }
            if (ctx.perfil?.role === 'admin') {
              const consultorNome = v.consultor_id === ctx.user?.id ? 'Você' : (ctx.consultores.find(c => c.id === v.consultor_id)?.nome || 'Outro Consultor');
              return `
                <span class="flex items-center gap-1">
                  ${consultorNome}
                  ${temParceria ? '<span class="text-xs" title="Venda compartilhada em parceria">🤝</span>' : ''}
                </span>
              `;
            }
            return '<span class="text-slate-400 text-[10px] font-bold">Titular</span>';
          })()}
        </td>

        <!-- Dropdown Fase/Status com Status Dot Luminoso -->
        <td class="px-5 py-3.5">
          <div class="relative flex items-center">
            <select class="select-status-inline w-full h-[36px] pl-3 pr-2 border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-xs cursor-pointer shadow-xs transition-all hover:border-indigo-400 dark:hover:border-indigo-600" data-trip-id="${v.id}" data-old-value="${v.status}">
              <option value="fechado" ${v.status === 'fechado' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🟢 Fechado</option>
              <option value="pos_venda" ${v.status === 'fechado' ? 'disabled' : ''} ${v.status === 'pos_venda' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🟡 Pós-Venda</option>
              <option value="pre_embarque" ${v.status === 'pre_embarque' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🟠 Pré-Embarque</option>
              <option value="pos_viagem" ${v.status === 'pos_viagem' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🔵 Pós-Viagem</option>
              <option value="reembolso_solicitado" ${v.status === 'reembolso_solicitado' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🔴 Reembolso Solicitado</option>
            </select>
          </div>
        </td>

        <!-- Ações (Travada em w-32 centralizada, com revelação elegante no hover do grupo) -->
        <td class="px-2 py-3.5 text-center w-32 whitespace-nowrap">
          <div class="flex items-center justify-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity duration-150">
            <button class="btn-action-view h-[32px] px-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 transition active:scale-95 text-[10px] uppercase shadow-xs flex items-center gap-1 cursor-pointer" data-trip-id="${v.id}" title="Ver detalhes completos da viagem">
              <span>🔍</span>
              <span>Ver</span>
            </button>
            <button class="btn-action-whatsapp w-8 h-8 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/45 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100/30 dark:border-emerald-900/30 transition active:scale-95 flex items-center justify-center shadow-xs cursor-pointer" data-trip-id="${v.id}" title="Enviar Mensagem de WhatsApp">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.777 1.451 5.51 0 9.997-4.493 10-10.008.002-2.673-1.037-5.186-2.93-7.079-1.892-1.893-4.401-2.934-7.078-2.934-5.518 0-10.007 4.493-10.01 10.01-.001 1.708.455 3.377 1.32 4.887L1.134 22.84l4.513-1.186zm11.23-7.925c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.669.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            </button>
            ${v.status === 'pos_viagem' ? `
              <button class="btn-action-copiar-nps w-8 h-8 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 transition active:scale-95 flex items-center justify-center font-bold text-xs shadow-xs cursor-pointer" data-trip-id="${v.id}" title="Copiar link da pesquisa de NPS">
                📋
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Renderiza um card individual de viagem para exibição em dispositivos móveis
   */
  public static renderMobileCard(v: any, ctx: ViagensTableViewContext): string {
    const todosConcluidos = ctx.isTodosReembolsosConcluidos(v);
    const isViagemReembolso = v.status === 'reembolso_solicitado';
    const sla = (isViagemReembolso && todosConcluidos) ? { alert: false, type: null, text: '' } : ctx.checkSLA(v);

    let slaIcon = '🟢';
    let cardBorder = 'border-l-emerald-500';
    let cardBg = 'bg-white dark:bg-slate-900';

    if (isViagemReembolso && todosConcluidos) {
      slaIcon = '✅';
      cardBorder = 'border-l-emerald-500';
      cardBg = 'bg-emerald-50/5 dark:bg-emerald-950/5';
    } else if (sla.alert) {
      if (sla.type === 'pre-embarque') {
        slaIcon = '⚠️';
        cardBorder = 'border-l-rose-500';
        cardBg = 'bg-rose-50/5 dark:bg-rose-950/5';
      } else if (sla.type === 'pos-viagem') {
        slaIcon = '🚨';
        cardBorder = 'border-l-amber-500';
        cardBg = 'bg-amber-50/5 dark:bg-amber-950/5';
      } else if (sla.type === 'reembolso') {
        slaIcon = '🚨';
        cardBorder = 'border-l-rose-600';
        cardBg = 'bg-rose-50/10 dark:bg-rose-950/10';
      }
    }

    const formatarData = (dStr: string) => {
      if (!dStr) return '-';
      const dataApenas = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const parts = dataApenas.split('-');
      if (parts.length !== 3) return dStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Obter totais financeiros rateados proporcionalmente para o consultor em foco
    const finTotals = ctx.getTripFinancialTotals(v);
    const valorVenda = finTotals.totalVenda;
    const rentabilidade = finTotals.totalRentabilidade;
    const totalMarkup = finTotals.totalMarkup;
    const totalRav = finTotals.totalRav;

    // Calcular PaxFlow Risk Score™
    const risk = RiskScoreService.calculateTripRiskScore(v, v.cliente, v.produtos, ctx.settings, ctx.user, ctx.perfil);

    return `
      <div class="dashboard-mobile-card ${cardBg} border border-slate-200/60 dark:border-slate-800 border-l-4 ${cardBorder} rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden transition-transform duration-200" data-mobile-trip-id="${v.id}">
        <!-- Header: SLA + Risk Score + Cliente + LOC -->
        <div class="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="space-y-1">
            <div class="font-black text-sm text-slate-800 dark:text-slate-100">${highlightMatch(v.cliente?.nome || 'Cliente Desconhecido', ctx.buscaTermo)}</div>
            <div class="flex flex-wrap items-center gap-1.5">
              ${v.codigoRef ? `
                <span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 font-mono font-bold text-[9px] rounded tracking-wider border border-indigo-200/40 dark:border-indigo-850 uppercase">
                  REF: ${highlightMatch(v.codigoRef, ctx.buscaTermo)}
                </span>
              ` : ''}
              ${(() => {
                const contextConsultorId = ctx.getConsultorContextoAtivoId() || ctx.user?.id;
                const temParceria = Array.isArray(v.divisoes) && v.divisoes.length > 1;
                const minhaDivisao = Array.isArray(v.divisoes) ? v.divisoes.find((d: any) => d.consultor_id === contextConsultorId) : null;
                if (minhaDivisao && temParceria) {
                  const pctVenda = Math.round(minhaDivisao.percentual);
                  const rawRav = minhaDivisao.percentual_rav ?? minhaDivisao.percentualRav;
                  const pctRav = rawRav !== undefined && rawRav !== null ? Math.round(rawRav) : pctVenda;
                  const badgeTexto = pctRav !== pctVenda
                    ? `🤝 Parceria ${pctVenda}% • ✈️ RAV ${pctRav}%`
                    : `🤝 Parceria ${pctVenda}%`;
                  return `
                    <span class="text-[9px] text-indigo-700 dark:text-indigo-300 font-extrabold bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                      ${badgeTexto}
                    </span>
                  `;
                }
                if (ctx.perfil?.role === 'admin') {
                  return `
                    <span class="text-[9px] text-slate-400 font-bold bg-slate-100/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200/20 dark:border-slate-700/20">
                      👤 ${v.consultor_id === ctx.user?.id ? 'Você' : (ctx.consultores.find(c => c.id === v.consultor_id)?.nome?.split(' ')[0] || 'Outro')}
                      ${temParceria ? ' 🤝' : ''}
                    </span>
                  `;
                }
                return '';
              })()}
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${isRiskScoreEnabled(ctx.user, ctx.perfil, ctx.settings) ? `
              <button class="btn-open-risk-score px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider flex items-center gap-1 border shadow-xs transition transform hover:scale-105 ${risk.badgeClass}" data-trip-id="${v.id}" title="PaxFlow Risk Score™: ${risk.score}/100 — Clique para abrir o diagnósticos">
                <span>🛡️ ${risk.score}</span>
              </button>
            ` : ''}
            <div class="flex flex-col items-end shrink-0" title="${sla.alert ? sla.text : (isViagemReembolso && todosConcluidos ? 'Reembolso Concluído' : 'SLA Normal')}">
              <span class="text-lg">${slaIcon}</span>
              ${sla.alert ? `<span class="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-0.5">SLA ATIVO</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Body: Destino, Datas e Produtos -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="space-y-1">
            <span class="block text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Destino & Viagem</span>
            <div class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
              <span>✈️ ${highlightMatch(v.destino, ctx.buscaTermo)}</span>
              ${(v.reembolsos && v.reembolsos.some((r: any) => {
                const st = String(r.status || '').toLowerCase();
                return st !== 'pago' && st !== 'concluido' && st !== 'recusado' && st !== 'cancelado';
              })) ? `
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[9px] font-black text-rose-600 dark:text-rose-400 shrink-0">
                  <span>💸</span>
                  <span>Reembolso</span>
                </span>
              ` : ''}
            </div>
            <!-- Localizadores dos Produtos -->
            ${v.produtos && v.produtos.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-1">
                ${(() => {
                  const locs: string[] = Array.from(new Set<string>(
                    (v.produtos || [])
                      .map((p: any) => (p.codigo_reserva || p.codigoReserva || '').trim().toUpperCase())
                      .filter(Boolean)
                  ));
                  if (locs.length === 0) {
                    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/30 dark:border-slate-700/30 text-[8px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SEM LOC</span>`;
                  }
                  return locs.map((loc: string) => `
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[8px] font-mono font-bold text-slate-700 dark:text-slate-300 tracking-wider" title="Localizador: ${loc}">
                      ${highlightMatch(loc, ctx.buscaTermo)}
                    </span>
                  `).join('');
                })()}
              </div>
            ` : ''}
          </div>
          <div class="space-y-1">
            <span class="block text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Período</span>
            <div class="text-slate-700 dark:text-slate-300 font-semibold leading-tight">
              <div>${formatarData(v.data_ida)}</div>
              <div class="text-[10px] text-slate-400 font-medium">até</div>
              <div>${formatarData(v.data_volta)}</div>
            </div>
          </div>
        </div>

        <!-- Finance Info: Valor e Rentabilidade -->
        <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs">
          <div>
            <span class="block text-[8px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Valor Venda</span>
            <span class="font-black text-indigo-600 dark:text-indigo-400 text-sm">
              R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              ${finTotals.isDividida ? `<span class="text-[9px] font-bold text-indigo-500"> (${Math.round(finTotals.fatiaVenda * 100)}%)</span>` : ''}
            </span>
          </div>
          <div class="text-right">
            <span class="block text-[8px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Rentabilidade</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">R$ ${rentabilidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            ${(totalMarkup > 0 || totalRav > 0) ? `
              <span class="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                MKP: R$ ${totalMarkup.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | RAV: R$ ${totalRav.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                ${finTotals.isDividida && finTotals.fatiaRav !== finTotals.fatiaVenda ? `<span class="text-[8px] font-black text-amber-500"> (${Math.round(finTotals.fatiaRav * 100)}% RAV)</span>` : ''}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Footer Actions: Status Dropdown + Detalhes Button -->
        <div class="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex-wrap">
          <div class="flex-1 min-w-[120px]">
            <select class="select-status-inline w-full h-[40px] px-3 border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-xs cursor-pointer shadow-xs transition-all hover:border-indigo-400 dark:hover:border-indigo-600" data-trip-id="${v.id}" data-old-value="${v.status}">
              <option value="fechado" ${v.status === 'fechado' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🟢 Fechado</option>
              <option value="pos_venda" ${v.status === 'fechado' ? 'disabled' : ''} ${v.status === 'pos_venda' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🟡 Pós-Venda</option>
              <option value="pre_embarque" ${v.status === 'pre_embarque' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🟠 Pré-Embarque</option>
              <option value="pos_viagem" ${v.status === 'pos_viagem' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🔵 Pós-Viagem</option>
              <option value="reembolso_solicitado" ${v.status === 'reembolso_solicitado' ? 'selected' : ''} class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🔴 Reembolso Solicitado</option>
            </select>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn-action-view px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md shadow-indigo-600/10 transition text-xs uppercase" data-trip-id="${v.id}">
              🔍 Detalhes
            </button>
            <button class="btn-action-share-mobile p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 transition flex items-center justify-center font-bold text-xs" data-trip-id="${v.id}" title="Compartilhar Itinerário">
              🔗
            </button>
            <button class="btn-action-whatsapp p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/45 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100/30 dark:border-emerald-900/30 transition flex items-center justify-center" data-trip-id="${v.id}" title="Enviar Mensagem de WhatsApp">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.777 1.451 5.51 0 9.997-4.493 10-10.008.002-2.673-1.037-5.186-2.93-7.079-1.892-1.893-4.401-2.934-7.078-2.934-5.518 0-10.007 4.493-10.01 10.01-.001 1.708.455 3.377 1.32 4.887L1.134 22.84l4.513-1.186zm11.23-7.925c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.669.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            </button>
            ${v.status === 'pos_viagem' ? `
              <button class="btn-action-copiar-nps p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 transition flex items-center justify-center font-bold text-xs" data-trip-id="${v.id}" title="Copiar link da pesquisa de NPS">
                📋
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Vincula todos os ouvintes de eventos da tabela e dos cards mobile
   */
  public static attachTableEvents(container: HTMLElement, handlers: ViagensTableViewHandlers): void {
    // 1. Clique nos cabeçalhos para ordenação de colunas
    container.querySelectorAll('.btn-sort-column').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.getAttribute('data-sort-field');
        if (field) {
          handlers.onSort(field);
        }
      });
    });

    // 2. Clique no PaxFlow Risk Score Badge
    container.querySelectorAll('.btn-open-risk-score').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          handlers.onOpenRiskScore(tripId);
        }
      });
    });

    // 3. Clique nos botões "Ver Detalhes"
    container.querySelectorAll('.btn-action-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          handlers.onOpenTripDetails(tripId);
        }
      });
    });

    // 4. Clique nos botões "WhatsApp"
    container.querySelectorAll('.btn-action-whatsapp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          handlers.onOpenWhatsApp(tripId);
        }
      });
    });

    // 5. Clique nos botões "Copiar NPS"
    container.querySelectorAll('.btn-action-copiar-nps').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          handlers.onCopyNPS(tripId);
        }
      });
    });

    // 6. Clique nos botões "Excluir"
    if (handlers.onDeleteTrip) {
      container.querySelectorAll('.btn-action-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const tripId = btn.getAttribute('data-trip-id');
          if (tripId && handlers.onDeleteTrip) {
            handlers.onDeleteTrip(tripId);
          }
        });
      });
    }

    // 7. Alteração de status inline na tabela / card
    container.querySelectorAll('.select-status-inline').forEach(select => {
      select.addEventListener('change', (e) => {
        const selectEl = e.target as HTMLSelectElement;
        const tripId = selectEl.getAttribute('data-trip-id');
        const oldStatus = selectEl.getAttribute('data-old-value');
        const newStatus = selectEl.value;

        if (!tripId || !oldStatus || newStatus === oldStatus) return;

        handlers.onStatusChange(tripId, newStatus, oldStatus, selectEl);
      });
    });

    // 8. Botão de Compartilhamento Nativo no Celular
    container.querySelectorAll('.btn-action-share-mobile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          handlers.onShareMobile(tripId);
        }
      });
    });

    // 9. Gestos de Swipe nos Cards Mobile
    this.setupMobileSwipeActions(container);
  }

  /**
   * Configura suporte a gestos de swipe (deslizar) nos cards da visualização mobile:
   * - Deslizar para a direita ➔ Dispara WhatsApp
   * - Deslizar para a esquerda ➔ Abre detalhes da viagem
   */
  public static setupMobileSwipeActions(container: HTMLElement): void {
    const cards = container.querySelectorAll('.dashboard-mobile-card');
    cards.forEach((cardEl: any) => {
      let touchStartX = 0;
      let touchStartY = 0;
      let currentX = 0;

      cardEl.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        currentX = touchStartX;
        cardEl.style.transition = 'none';
      }, { passive: true });

      cardEl.addEventListener('touchmove', (e: TouchEvent) => {
        currentX = e.touches[0].clientX;
        const deltaX = currentX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;

        // Se for movimento primordialmente horizontal
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 15) {
          cardEl.style.transform = `translateX(${deltaX * 0.35}px)`;
        }
      }, { passive: true });

      cardEl.addEventListener('touchend', () => {
        cardEl.style.transition = 'transform 0.25s ease-out';
        const deltaX = currentX - touchStartX;
        cardEl.style.transform = 'translateX(0px)';

        const tripId = cardEl.getAttribute('data-mobile-trip-id');
        if (!tripId) return;

        if (deltaX > 90) {
          // Swipe Right: Dispara WhatsApp
          const btnWhatsapp = cardEl.querySelector('.btn-action-whatsapp');
          if (btnWhatsapp) (btnWhatsapp as HTMLElement).click();
        } else if (deltaX < -90) {
          // Swipe Left: Abre detalhes da viagem
          const btnView = cardEl.querySelector('.btn-action-view');
          if (btnView) (btnView as HTMLElement).click();
        }
      });
    });
  }
}
