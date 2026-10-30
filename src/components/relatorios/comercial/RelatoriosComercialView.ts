// ==========================================
// SUBMÓDULO ESPECIALISTA DE RELATÓRIOS: COMERCIAL & METAS
// Extraído de src/pages/Relatorios.ts (Fase 1 - Pacote 1.3)
// Abrangência: Desempenho & Produtividade, Metas & Campanhas, Campanhas & Segmentação
// ==========================================

import { MetasService } from '../../../services/metasService';
import { ViagensDivisoesService } from '../../../services/viagensDivisoesService';
import { CampanhasService, FiltrosCampanha, PresetCampanha } from '../../../services/campanhasService';
import { showCustomPrompt } from '../../../services/dialog';
import { SendTemplateMessageModal } from '../../dashboard/SendTemplateMessageModal';
import { ORIGENS_LEAD_PADRAO } from '../../../controllers/cadastrosController';

export interface RelatoriosComercialContext {
  viagens: any[];
  orcamentos: any[];
  consultores: any[];
  clientes: any[];
  reembolsos: any[];
  locPagamentos: any[];
  metas: any[];
  feedbacksNps: any[];
  campanhasPresets: PresetCampanha[];
  campanhasFiltros: FiltrosCampanha;
  selectedMetaId: string | null;
  consultorIdFilter: string;
  perfil: any;
  user: any;
  activeTab: string;
  showToast: (message: string, type?: 'success' | 'error', err?: any) => void;
  onStateChange: () => void;
  exportToCSV: () => void;
  getFilteredData: () => any;
}

export class RelatoriosComercialView {
  // ==========================================
  // VIEW: 1. DESEMPENHO E PRODUTIVIDADE
  // ==========================================
  public static renderDesempenho(data: any, ctx: RelatoriosComercialContext): string {
    // Volume de Vendas
    const activeViaIds = new Set(data.viagens.map((v: any) => v.id));
    const pagsSub = data.locPagamentos.filter((p: any) => 
      activeViaIds.has(p.viagem_id || p.viagemId) &&
      p.formas_recebimento &&
      ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
    );
    const totalSub = pagsSub.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0);
    const totalVendido = Math.max(0, data.viagens.reduce((acc: number, v: any) => acc + (v.valor_total || v.valorTotal || 0), 0) - totalSub);
    const orcados = data.orcamentos.length;
    
    // Conversão
    const fechadosAceitos = data.orcamentos.filter((o: any) => o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO').length;
    const fechadosRecusados = data.orcamentos.filter((o: any) => o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA').length;
    const finalizados = fechadosAceitos + fechadosRecusados;
    const conversao = finalizados > 0 ? Math.round((fechadosAceitos / finalizados) * 100) : 0;
    
    // Atendimentos ativos
    const ativos = data.orcamentos.filter((o: any) => o.status !== 'CONCLUIDO').length;

    // Tempo médio de fechamento (dias)
    let totalDias = 0;
    let countDias = 0;
    data.orcamentos.forEach((o: any) => {
      if ((o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO') && o.created_at && o.updated_at) {
        const diff = new Date(o.updated_at).getTime() - new Date(o.created_at).getTime();
        totalDias += Math.max(0, diff / (1000 * 60 * 60 * 24));
        countDias++;
      }
    });
    const tempoMedio = countDias > 0 ? Math.round(totalDias / countDias) : 0;

    // Build SVG chart: Sales per consultant (apenas usuários ativos)
    const consultantSales: Record<string, number> = {};
    data.viagens.forEach((v: any) => {
      const cId = v.consultor_id || v.consultorId || 'unknown';
      const consultorObj = ctx.consultores.find(c => c.id === cId);
      if (consultorObj && consultorObj.ativo === false) return; // Ignora inativos
      const cNome = consultorObj?.nome || 'Outros';
      const vPayments = data.locPagamentos.filter((p: any) => 
        (p.viagem_id === v.id || p.viagemId === v.id) &&
        p.formas_recebimento &&
        ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
      );
      const vSub = vPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
      consultantSales[cNome] = (consultantSales[cNome] || 0) + Math.max(0, (v.valor_total || v.valorTotal || 0) - vSub);
    });

    const entries = Object.entries(consultantSales);
    const maxVal = entries.length > 0 ? (Math.max(...entries.map(e => e[1])) || 1) : 1;
    
    let chartRows = '';
    entries.forEach(([nome, val]) => {
      const widthPct = Math.round((val / maxVal) * 80) + 5; // scaled to fits in SVG
      const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
      chartRows += `
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>${nome}</span>
            <span>${formattedVal}</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-lg overflow-hidden flex">
            <div class="bg-indigo-600 h-full rounded-lg transition-all duration-500" style="width: ${widthPct}%"></div>
          </div>
        </div>
      `;
    });

    if (!chartRows) {
      chartRows = '<p class="text-xs text-slate-400 font-bold py-6 text-center">Nenhum dado de vendas no período selecionado.</p>';
    }

    const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🎯 Desempenho e Produtividade Comercial</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Volume de Vendas</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalVendido)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cotações Criadas</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${orcados}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxa de Conversão</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${conversao}%</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Média de Fechamento</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${tempoMedio} dias</p>
          </div>
        </div>

        ${isAdmin ? `
          <!-- Sales Chart Section (Visível apenas para Administradores) -->
          <div class="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl gap-4 flex flex-col">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Ranking de Vendas por Consultor</h3>
            <div class="space-y-4">
              ${chartRows}
            </div>
          </div>

          <!-- Table detailing data (Visível apenas para Administradores) -->
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Consultor</th>
                  <th class="p-3">Orçamentos</th>
                  <th class="p-3">Fechados (Sim)</th>
                  <th class="p-3">Taxa Conv.</th>
                  <th class="p-3">Total Vendido</th>
                  <th class="p-3">RAV (Rateada)</th>
                </tr>
              </thead>
              <tbody>
                ${ctx.consultores
                  .filter(c => c.ativo !== false && c.participa_metricas !== false && c.participaMetricas !== false && (ctx.consultorIdFilter === 'todos' || c.id === ctx.consultorIdFilter))
                  .map(c => {
                    const subOrc = data.orcamentos.filter((o: any) => (o.consultor_id || o.consultorId) === c.id);
                    const subVia = data.viagens.filter((v: any) => ViagensDivisoesService.calcularParticipacaoConsultor(v, c.id) > 0);
                    
                    const cAceito = subOrc.filter((o: any) => o.sub_status === 'ACEITO' || o.subStatus === 'ACEITO').length;
                    const cRecuso = subOrc.filter((o: any) => o.sub_status === 'DESISTENCIA' || o.subStatus === 'DESISTENCIA').length;
                    const cConv = (cAceito + cRecuso) > 0 ? Math.round((cAceito / (cAceito + cRecuso)) * 100) : 0;
                    
                    const cSales = subVia.reduce((sum: number, v: any) => {
                      const fatia = ViagensDivisoesService.calcularParticipacaoConsultor(v, c.id);
                      const vPayments = data.locPagamentos.filter((p: any) => 
                        (p.viagem_id === v.id || p.viagemId === v.id) &&
                        p.formas_recebimento &&
                        ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
                      );
                      const vSub = vPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
                      return sum + (Math.max(0, (v.valor_total || v.valorTotal || 0) - vSub) * fatia);
                    }, 0);

                    const cRav = subVia.reduce((sum: number, v: any) => {
                      const fatiaRav = ViagensDivisoesService.calcularParticipacaoRavConsultor(v, c.id);
                      const prods = Array.isArray(v.produtos) ? v.produtos : [];
                      const totalRavViagem = prods.reduce((accP: number, p: any) => accP + (Number(p.rav) || 0), 0);
                      return sum + (totalRavViagem * fatiaRav);
                    }, 0);
                    
                    return `
                    <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                      <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${c.nome}</td>
                      <td class="p-3">${subOrc.length}</td>
                      <td class="p-3">${cAceito}</td>
                      <td class="p-3 font-extrabold text-emerald-600">${cConv}%</td>
                      <td class="p-3 font-extrabold">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cSales)}</td>
                      <td class="p-3 font-extrabold text-amber-600 dark:text-amber-400">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cRav)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ==========================================
  // VIEW: RELATÓRIO DE METAS & CAMPANHAS
  // ==========================================
  public static renderMetasCampanhas(data: any, ctx: RelatoriosComercialContext): string {
    const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';

    if (!ctx.metas || ctx.metas.length === 0) {
      return `
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
          <div class="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-3xl">🏆</div>
          <h3 class="text-base font-black text-slate-800 dark:text-slate-100">Nenhuma Meta ou Campanha Cadastrada</h3>
          <p class="text-xs text-slate-400 max-w-md font-semibold">
            Defina metas comerciais e crie campanhas de incentivo (por faturamento, rentabilidade ou quantidade de orçamentos/vendas) no menu Cadastros.
          </p>
          ${isAdmin ? `
            <a href="#cadastros" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition uppercase tracking-wider">
              ➕ Cadastrar Nova Meta / Campanha
            </a>
          ` : ''}
        </div>
      `;
    }

    // Identificar meta selecionada
    let metaAtual = ctx.metas.find(m => m.id === ctx.selectedMetaId);
    if (!metaAtual) {
      const ativa = ctx.metas.find(m => MetasService.getStatusTemporal(m) === 'ativa');
      metaAtual = ativa || ctx.metas[0];
      ctx.selectedMetaId = metaAtual.id;
    }

    const statusTemporal = MetasService.getStatusTemporal(metaAtual);
    const tipoCalculo = (metaAtual.tipo_calculo || 'bruto').toLowerCase();
    const isMetricaNumerica = [
      'orcamentos', 'qtd_orcamentos', 'orcamento_criado', 'orcamentos_andamento',
      'vendas', 'qtd_vendas', 'venda_aceita', 'orcamento_fechado',
      'clientes', 'cliente_criado',
      'reembolsos', 'reembolso_pago',
      'xp', 'xp_acumulado'
    ].includes(tipoCalculo);

    let unidadeSufixo = 'R$';
    if (tipoCalculo.includes('orcamento')) unidadeSufixo = 'orçamentos';
    else if (tipoCalculo.includes('venda')) unidadeSufixo = 'vendas';
    else if (tipoCalculo.includes('cliente')) unidadeSufixo = 'clientes';
    else if (tipoCalculo.includes('reembolso')) unidadeSufixo = 'reembolsos';
    else if (tipoCalculo.includes('xp')) unidadeSufixo = 'XP';

    const formatarValorMetrica = (val: number): string => {
      if (isMetricaNumerica) {
        return `${val} ${unidadeSufixo}`;
      }
      return 'R$ ' + (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Apuração do progresso da agência e ranking
    const apuracao = MetasService.calcularProgressoAgencia(
      metaAtual,
      ctx.consultores,
      ctx.orcamentos,
      ctx.viagens,
      ctx.locPagamentos,
      ctx.clientes,
      ctx.reembolsos
    );

    // Agrupamento de metas para o select
    const metasAtivas = ctx.metas.filter(m => MetasService.getStatusTemporal(m) === 'ativa');
    const metasPassadas = ctx.metas.filter(m => MetasService.getStatusTemporal(m) === 'passada');
    const metasFuturas = ctx.metas.filter(m => MetasService.getStatusTemporal(m) === 'futura');

    // Status temporal badge
    let statusBadge = '';
    if (statusTemporal === 'ativa') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">🟢 Em Andamento</span>';
    } else if (statusTemporal === 'passada') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">⏳ Encerrada (Histórico)</span>';
    } else {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">📅 Não Iniciada</span>';
    }

    // Tipo de cálculo badge
    let tipoCalculoBadge = '';
    if (tipoCalculo === 'orcamentos' || tipoCalculo === 'qtd_orcamentos' || tipoCalculo === 'orcamento_criado') {
      tipoCalculoBadge = '<span class="inline-flex px-2 py-0.5 bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 text-[10px] font-black uppercase rounded-lg">Qtd. Orçamentos Cadastrados</span>';
    } else if (tipoCalculo === 'orcamentos_andamento') {
      tipoCalculoBadge = '<span class="inline-flex px-2 py-0.5 bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 text-[10px] font-black uppercase rounded-lg">Orçamentos em Andamento</span>';
    } else if (tipoCalculo === 'vendas' || tipoCalculo === 'qtd_vendas' || tipoCalculo === 'venda_aceita' || tipoCalculo === 'orcamento_fechado') {
      tipoCalculoBadge = '<span class="inline-flex px-2 py-0.5 bg-sky-50 dark:bg-sky-950/45 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-900/40 text-[10px] font-black uppercase rounded-lg">Qtd. Vendas Fechadas</span>';
    } else if (tipoCalculo === 'clientes' || tipoCalculo === 'cliente_criado') {
      tipoCalculoBadge = '<span class="inline-flex px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 text-[10px] font-black uppercase rounded-lg">Qtd. Clientes Cadastrados</span>';
    } else if (tipoCalculo === 'reembolsos' || tipoCalculo === 'reembolso_pago') {
      tipoCalculoBadge = '<span class="inline-flex px-2 py-0.5 bg-purple-50 dark:bg-purple-950/45 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40 text-[10px] font-black uppercase rounded-lg">Qtd. Reembolsos Pagos</span>';
    } else if (tipoCalculo === 'xp' || tipoCalculo === 'xp_acumulado') {
      tipoCalculoBadge = '<span class="inline-flex px-2 py-0.5 bg-yellow-50 dark:bg-yellow-950/45 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/40 text-[10px] font-black uppercase rounded-lg">XP Acumulado</span>';
    } else if (tipoCalculo === 'bruto') {
      tipoCalculoBadge = '<span class="inline-flex px-2 py-0.5 bg-blue-50 dark:bg-blue-950/45 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 text-[10px] font-black uppercase rounded-lg">Faturamento Bruto</span>';
    } else {
      tipoCalculoBadge = '<span class="inline-flex px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 text-[10px] font-black uppercase rounded-lg">Rentabilidade Líquida</span>';
    }

    // Alvo global / maior faixa e apuração de progresso
    const sortedFaixas = [...(metaAtual.faixas || [])].sort((a, b) => a.valor_minimo - b.valor_minimo);
    const maiorFaixaVal = sortedFaixas.length > 0 ? sortedFaixas[sortedFaixas.length - 1].valor_minimo : (metaAtual.valor_meta || 0);
    const consultoresNoAlvo = apuracao.rankingConsultores.filter(r => r.faixaAtual !== null).length;
    const totalConsultoresAvaliados = apuracao.rankingConsultores.length || ctx.consultores.length || 1;

    let alvoExibido = maiorFaixaVal;
    let alvoLabel = 'Alvo da Meta / Maior Faixa';
    let alvoSubtexto = sortedFaixas.length > 0 ? `${sortedFaixas.length} faixas de premiação` : 'Meta global';
    let pctGeral = 0;

    if (alvoExibido > 0) {
      pctGeral = Math.min(100, Math.round((apuracao.totalAgencia / alvoExibido) * 100));
    }

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        
        <!-- Header da Aba de Metas -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>🏆 Termômetro de Metas & Campanhas</span>
              </h2>
              ${statusBadge}
              ${tipoCalculoBadge}
            </div>
            <p class="text-xs text-slate-400 font-semibold">
              Acompanhamento de objetivos, pontuações, premiações e apuração por consultor.
            </p>
          </div>

          <!-- Seletor de Meta Ativa -->
          <div class="w-full lg:w-80">
            <label for="select-relatorio-meta" class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Selecionar Campanha / Meta:</label>
            <select id="select-relatorio-meta" class="w-full px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100">
              ${metasAtivas.length > 0 ? `
                <optgroup label="🟢 Campanhas em Andamento">
                  ${metasAtivas.map(m => `
                    <option value="${m.id}" ${m.id === metaAtual.id ? 'selected' : ''}>${m.nome}</option>
                  `).join('')}
                </optgroup>
              ` : ''}
              ${metasPassadas.length > 0 ? `
                <optgroup label="⏳ Campanhas Encerradas (Histórico)">
                  ${metasPassadas.map(m => `
                    <option value="${m.id}" ${m.id === metaAtual.id ? 'selected' : ''}>${m.nome}</option>
                  `).join('')}
                </optgroup>
              ` : ''}
              ${metasFuturas.length > 0 ? `
                <optgroup label="📅 Campanhas Futuras">
                  ${metasFuturas.map(m => `
                    <option value="${m.id}" ${m.id === metaAtual.id ? 'selected' : ''}>${m.nome}</option>
                  `).join('')}
                </optgroup>
              ` : ''}
            </select>
          </div>
        </div>

        <!-- Cards de Resumo da Meta Atual -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Card 1: Total Realizado da Agência -->
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Produção Acumulada da Agência</span>
            <div class="text-xl font-black text-slate-800 dark:text-slate-100 mt-2">
              ${formatarValorMetrica(apuracao.totalAgencia)}
            </div>
            <span class="text-[11px] text-slate-400 font-semibold mt-1">Soma de todos os consultores</span>
          </div>

          <!-- Card 2: Alvo / Maior Faixa -->
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">${alvoLabel}</span>
            <div class="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
              ${formatarValorMetrica(alvoExibido)}
            </div>
            <span class="text-[11px] text-slate-400 font-semibold mt-1">${alvoSubtexto}</span>
          </div>

          <!-- Card 3: Consultores Premiados -->
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Consultores em Faixas de Prêmio</span>
            <div class="text-xl font-black text-emerald-600 mt-2">
              ${consultoresNoAlvo} de ${totalConsultoresAvaliados}
            </div>
            <span class="text-[11px] text-slate-400 font-semibold mt-1">${Math.round((consultoresNoAlvo / totalConsultoresAvaliados) * 100)}% da equipe qualificada</span>
          </div>

          <!-- Card 4: Termômetro Geral da Agência -->
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Atingimento Global</span>
              <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">${pctGeral}%</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden my-2">
              <div class="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500" style="width: ${pctGeral}%"></div>
            </div>
            <span class="text-[11px] text-slate-400 font-semibold">Rumo à faixa máxima</span>
          </div>

        </div>

        <!-- Termômetro Visual das Faixas Configuradas -->
        ${sortedFaixas.length > 0 ? `
          <div class="border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl space-y-3">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">
              Níveis e Premiações da Campanha (${sortedFaixas.length} Faixas)
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(4, sortedFaixas.length)} gap-3">
              ${sortedFaixas.map((f, i) => `
                <div class="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between gap-2">
                  <div class="flex items-center justify-between">
                    <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase text-white shadow-xs" style="background-color: ${f.cor || '#6366f1'}">
                      Nível ${i + 1}: ${f.nome}
                    </span>
                    <span class="text-xs font-black text-slate-800 dark:text-slate-100">${formatarValorMetrica(f.valor_minimo)}</span>
                  </div>
                  ${f.recompensa ? `
                    <div class="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span>🎁</span> <span>${f.recompensa}</span>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Tabela do Ranking de Consultores -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">
            Ranking e Produção por Consultor
          </h3>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3 text-center w-12">Posição</th>
                  <th class="p-3">Consultor</th>
                  <th class="p-3">Produção Apurada</th>
                  <th class="p-3">Faixa Atual</th>
                  <th class="p-3">Progresso</th>
                  <th class="p-3 text-center w-28">Auditoria</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                ${apuracao.rankingConsultores.map((r, idx) => {
                  let posMedalha = `<span class="font-black text-slate-400 text-xs">${idx + 1}º</span>`;
                  if (idx === 0) posMedalha = '<span class="text-base" title="1º Lugar">🥇</span>';
                  if (idx === 1) posMedalha = '<span class="text-base" title="2º Lugar">🥈</span>';
                  if (idx === 2) posMedalha = '<span class="text-base" title="3º Lugar">🥉</span>';

                  const faixaBadge = r.faixaAtual
                    ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase text-white shadow-xs" style="background-color: ${r.faixaAtual.cor || '#6366f1'}">
                        ⭐ ${r.faixaAtual.nome} ${r.faixaAtual.recompensa ? `(${r.faixaAtual.recompensa})` : ''}
                      </span>`
                    : '<span class="text-slate-400 text-[11px] italic font-medium">Em busca da 1ª faixa</span>';

                  const proximaFaixaText = r.proximaFaixa
                    ? `Falta ${formatarValorMetrica(Math.max(0, r.proximaFaixa.valor_minimo - r.totalAtingido))} para ${r.proximaFaixa.nome}`
                    : (r.faixaAtual ? 'Faixa máxima conquistada! 🏆' : 'Sem faixa configurada');

                  return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td class="p-3 text-center">${posMedalha}</td>
                      <td class="p-3">
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                            ${(r.consultor.nome || 'CO').substring(0, 2).toUpperCase()}
                          </div>
                          <div class="min-w-0">
                            <span class="font-black text-slate-800 dark:text-slate-100 block truncate">${r.consultor.nome || 'Consultor'}</span>
                            <span class="text-[10px] text-slate-400 font-medium truncate block">${r.consultor.email || ''}</span>
                          </div>
                        </div>
                      </td>
                      <td class="p-3">
                        <span class="font-black text-slate-900 dark:text-slate-100 text-sm block">
                          ${formatarValorMetrica(r.totalAtingido)}
                        </span>
                      </td>
                      <td class="p-3">${faixaBadge}</td>
                      <td class="p-3">
                        <div class="space-y-1 w-44">
                          <div class="flex justify-between items-center text-[10px] font-bold">
                            <span class="text-slate-500">${r.percentualProgresso}%</span>
                          </div>
                          <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" style="width: ${r.percentualProgresso}%"></div>
                          </div>
                          <span class="text-[9px] text-slate-400 block truncate" title="${proximaFaixaText}">${proximaFaixaText}</span>
                        </div>
                      </td>
                      <td class="p-3 text-center">
                        <button type="button" class="btn-auditar-meta-consultor px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-extrabold text-[10px] rounded-xl transition uppercase flex items-center gap-1 mx-auto shadow-xs" data-meta-id="${metaAtual.id}" data-consultor-id="${r.consultor.id}" data-consultor-nome="${r.consultor.nome}">
                          <span>🔍</span> Auditar (${r.itensAuditados.length})
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
    `;
  }

  // ==========================================
  // VIEW: 🚀 CAMPANHAS & SEGMENTAÇÃO DE BASE
  // ==========================================
  public static renderSegmentacaoCampanhas(data: any, ctx: RelatoriosComercialContext): string {
    const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';
    const usuarioLogado = {
      id: ctx.user?.id || '',
      nome: ctx.perfil?.nome || ctx.user?.email || 'Usuário',
      role: ctx.perfil?.role || 'consultor'
    };

    // 1. Normalizar base agregando viagens, orçamentos e NPS
    const todosItens = CampanhasService.normalizarDados(data.viagens || [], data.orcamentos || [], ctx.feedbacksNps || []);

    // 2. Aplicar filtros dinâmicos
    let itensFiltrados = CampanhasService.filtrarItens(todosItens, ctx.campanhasFiltros, usuarioLogado);

    // Se o usuário selecionou agrupamento por cliente único
    if (ctx.campanhasFiltros.tipoVisao === 'cliente_unico') {
      itensFiltrados = CampanhasService.agruparPorCliente(itensFiltrados);
    }

    // 3. KPIs da Segmentação
    const kpis = CampanhasService.calcularMetricas(itensFiltrados);
    const f = ctx.campanhasFiltros;

    // 4. Lista dinâmica de Origens de Lead
    const origensLeadSet = new Set<string>();
    ORIGENS_LEAD_PADRAO.forEach(o => origensLeadSet.add(o.nome));
    todosItens.forEach(it => {
      if (it.origemLead && it.origemLead !== 'Não Informada') {
        origensLeadSet.add(it.origemLead);
      }
    });
    const listaOrigensLead = Array.from(origensLeadSet);

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        
        <!-- Header da Aba de Segmentação -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>🚀 Campanhas, Remarketing & Segmentação de Base</span>
              </h2>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Segmentação Ativa
              </span>
            </div>
            <p class="text-xs text-slate-400 font-semibold">
              Cruze históricos de viagens, orçamentos e NPS para disparar campanhas de reengajamento altamente segmentadas.
            </p>
          </div>

          <!-- Ações Rápidas de Exportação e Disparo -->
          <div class="flex items-center gap-2 flex-wrap">
            <button id="btn-campanha-exportar-csv" type="button" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black rounded-xl transition uppercase tracking-wider flex items-center gap-1.5">
              <span>📥</span> Exportar CSV
            </button>
            <button id="btn-campanha-copiar-lote" type="button" class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-black rounded-xl transition uppercase tracking-wider flex items-center gap-1.5">
              <span>📋</span> Copiar Contatos
            </button>
            <button id="btn-campanha-salvar-preset" type="button" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-md uppercase tracking-wider flex items-center gap-1.5">
              <span>💾</span> Salvar Modelo
            </button>
          </div>
        </div>

        <!-- Barra de Presets Salvos -->
        ${ctx.campanhasPresets.length > 0 ? `
          <div class="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Modelos Salvos:</span>
            ${ctx.campanhasPresets.map(p => `
              <div class="flex items-center bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                <button type="button" class="btn-carregar-preset hover:text-indigo-600 transition mr-2" data-preset-id="${p.id}">
                  🎯 ${p.nome}
                </button>
                <button type="button" class="btn-excluir-preset text-slate-400 hover:text-rose-500 transition text-[10px]" data-preset-id="${p.id}" title="Excluir modelo">
                  ✕
                </button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Painel Expansível de Filtros de Segmentação -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <div>
              <span class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔍</span> Matriz de Filtros de Segmentação
              </span>
              <p class="text-[11px] text-slate-400 font-semibold mt-0.5">Refine seu público-alvo (filtros reativos ou via Enter)</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button id="btn-campanha-limpar-filtros-topo" type="button" class="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer">
                Restaurar Padrão
              </button>
              <button id="btn-campanha-aplicar-filtros-topo" type="button" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                <span>🔍</span> Aplicar Segmentação
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            <!-- Modo de Visualização -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Modo de Agrupamento</label>
              <select id="filtro-campanha-visao" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="oportunidade" ${f.tipoVisao === 'oportunidade' ? 'selected' : ''}>Oportunidades Individuais</option>
                <option value="cliente_unico" ${f.tipoVisao === 'cliente_unico' ? 'selected' : ''}>Clientes Únicos (Deduplicado)</option>
              </select>
            </div>

            <!-- Origem dos Dados / Fonte da Base -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Fonte da Base</label>
              <select id="filtro-campanha-origem" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="todos" ${f.origem === 'todos' ? 'selected' : ''}>Viagens Realizadas + Orçamentos</option>
                <option value="viagens" ${f.origem === 'viagens' ? 'selected' : ''}>Apenas Viagens Realizadas</option>
                <option value="orcamentos" ${f.origem === 'orcamentos' ? 'selected' : ''}>Apenas Orçamentos Cadastrados</option>
              </select>
            </div>

            <!-- Origem do Lead (Canal de Entrada) -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Origem do Lead</label>
              <select id="filtro-campanha-origem-lead" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="TODOS" ${!f.origemLead || f.origemLead === 'TODOS' ? 'selected' : ''}>Todas as Origens de Lead</option>
                ${listaOrigensLead.map(orig => `
                  <option value="${orig}" ${f.origemLead === orig ? 'selected' : ''}>${orig}</option>
                `).join('')}
              </select>
            </div>

            <!-- Período de Atividade -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Janela de Atividade</label>
              <select id="filtro-campanha-periodo-meses" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="3" ${f.periodoMeses === 3 ? 'selected' : ''}>Últimos 3 meses</option>
                <option value="6" ${f.periodoMeses === 6 ? 'selected' : ''}>Últimos 6 meses</option>
                <option value="12" ${f.periodoMeses === 12 ? 'selected' : ''}>Últimos 12 meses (1 ano)</option>
                <option value="24" ${f.periodoMeses === 24 ? 'selected' : ''}>Últimos 24 meses (2 anos)</option>
                <option value="36" ${f.periodoMeses === 36 ? 'selected' : ''}>Últimos 36 meses (3 anos)</option>
                <option value="0" ${f.periodoMeses === 0 ? 'selected' : ''}>Todo o Histórico</option>
              </select>
            </div>

            <!-- Tipo de Destino -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Tipo de Destino</label>
              <select id="filtro-campanha-tipo-destino" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="todos" ${f.tipoDestino === 'todos' ? 'selected' : ''}>Nacional e Internacional</option>
                <option value="nacional" ${f.tipoDestino === 'nacional' ? 'selected' : ''}>Apenas Nacional</option>
                <option value="internacional" ${f.tipoDestino === 'internacional' ? 'selected' : ''}>Apenas Internacional</option>
              </select>
            </div>

            <!-- Busca por Destino / Palavra-chave -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Destino (Busca)</label>
              <input id="filtro-campanha-destino-busca" type="text" placeholder="Ex: Paris, Caribe, Orlando..." value="${f.destinoBusca || ''}" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <!-- Faixa de Valor Mínimo / Máximo -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Faixa de Valor (R$)</label>
              <div class="grid grid-cols-2 gap-1.5">
                <input id="filtro-campanha-valor-min" type="number" placeholder="Mínimo" value="${f.valorMinimo ?? ''}" class="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200" />
                <input id="filtro-campanha-valor-max" type="number" placeholder="Máximo" value="${f.valorMaximo ?? ''}" class="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200" />
              </div>
            </div>

            <!-- Fornecedor -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Fornecedor / Cia Aérea</label>
              <input id="filtro-campanha-fornecedor" type="text" placeholder="Ex: CVC, Latam, Azul..." value="${f.fornecedor || ''}" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <!-- Mês de Embarque / Viagem -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Mês Típico de Embarque</label>
              <select id="filtro-campanha-mes-embarque" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Qualquer Mês</option>
                <option value="1" ${f.mesEmbarque === 1 ? 'selected' : ''}>Janeiro (Férias de Verão)</option>
                <option value="2" ${f.mesEmbarque === 2 ? 'selected' : ''}>Fevereiro (Carnaval)</option>
                <option value="3" ${f.mesEmbarque === 3 ? 'selected' : ''}>Março</option>
                <option value="4" ${f.mesEmbarque === 4 ? 'selected' : ''}>Abril (Páscoa / Tiradentes)</option>
                <option value="5" ${f.mesEmbarque === 5 ? 'selected' : ''}>Maio</option>
                <option value="6" ${f.mesEmbarque === 6 ? 'selected' : ''}>Junho</option>
                <option value="7" ${f.mesEmbarque === 7 ? 'selected' : ''}>Julho (Férias de Inverno)</option>
                <option value="8" ${f.mesEmbarque === 8 ? 'selected' : ''}>Agosto</option>
                <option value="9" ${f.mesEmbarque === 9 ? 'selected' : ''}>Setembro</option>
                <option value="10" ${f.mesEmbarque === 10 ? 'selected' : ''}>Outubro</option>
                <option value="11" ${f.mesEmbarque === 11 ? 'selected' : ''}>Novembro</option>
                <option value="12" ${f.mesEmbarque === 12 ? 'selected' : ''}>Dezembro (Fim de Ano)</option>
              </select>
            </div>

            <!-- Status de Orçamento -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Status do Orçamento</label>
              <select id="filtro-campanha-status-orcamento" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="TODOS" ${f.statusOrcamento === 'TODOS' ? 'selected' : ''}>Todos os Status</option>
                <option value="SOLICITADO" ${f.statusOrcamento === 'SOLICITADO' ? 'selected' : ''}>Solicitado / Em aberto</option>
                <option value="EM_ANDAMENTO" ${f.statusOrcamento === 'EM_ANDAMENTO' ? 'selected' : ''}>Em Andamento</option>
                <option value="AGUARDANDO" ${f.statusOrcamento === 'AGUARDANDO' ? 'selected' : ''}>Aguardando Resposta</option>
                <option value="DESISTENCIA" ${f.statusOrcamento === 'DESISTENCIA' ? 'selected' : ''}>Perdido / Desistência</option>
              </select>
            </div>

            <!-- NPS -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Classificação NPS</label>
              <select id="filtro-campanha-nps" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="todos" ${f.classificacaoNps === 'todos' ? 'selected' : ''}>Todas as notas</option>
                <option value="promotores" ${f.classificacaoNps === 'promotores' ? 'selected' : ''}>🟢 Promotores (9 - 10)</option>
                <option value="neutros" ${f.classificacaoNps === 'neutros' ? 'selected' : ''}>🟡 Neutros (7 - 8)</option>
                <option value="detratores" ${f.classificacaoNps === 'detratores' ? 'selected' : ''}>🔴 Detratores (0 - 6)</option>
              </select>
            </div>

            <!-- Consultor Responsável -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Consultor Original</label>
              ${isAdmin ? `
                <select id="filtro-campanha-consultor" class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="TODOS" ${f.consultorId === 'TODOS' ? 'selected' : ''}>Toda a Equipe</option>
                  ${ctx.consultores.map(c => `
                    <option value="${c.id}" ${f.consultorId === c.id ? 'selected' : ''}>${c.nome}</option>
                  `).join('')}
                </select>
              ` : `
                <div class="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  👤 ${usuarioLogado.nome} (Sua Carteira)
                </div>
              `}
            </div>

          </div>

          <!-- Botões de Ação do Filtro -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <span class="text-xs font-bold text-slate-500">
              ⚡ Segmentação calculada: <strong class="text-slate-800 dark:text-slate-100">${itensFiltrados.length}</strong> itens encontrados
            </span>
            <div class="flex items-center gap-2">
              <button id="btn-campanha-limpar-filtros" type="button" class="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer">
                Restaurar Padrão
              </button>
              <button id="btn-campanha-aplicar-filtros" type="button" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                <span>🔍</span> Aplicar Segmentação
              </button>
            </div>
          </div>

        </div>

        <!-- Cards de Indicadores / KPIs da Segmentação -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Clientes Únicos Mapeados</span>
            <div class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
              ${kpis.totalClientesUnicos}
            </div>
            <span class="text-[11px] text-slate-400 font-semibold mt-1">${kpis.totalRegistros} interações no filtro</span>
          </div>

          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Volume Financeiro Segmentado</span>
            <div class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
              R$ ${kpis.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span class="text-[11px] text-slate-400 font-semibold mt-1">Valor negociado / viajado</span>
          </div>

          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ticket Médio</span>
            <div class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
              R$ ${kpis.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span class="text-[11px] text-slate-400 font-semibold mt-1">Por registro do filtro</span>
          </div>

          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Termômetro NPS</span>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-xs font-black text-emerald-600">🟢 ${kpis.promotoresCount}</span>
              <span class="text-xs font-black text-amber-500">🟡 ${kpis.neutrosCount}</span>
              <span class="text-xs font-black text-rose-500">🔴 ${kpis.detratoresCount}</span>
            </div>
            <span class="text-[11px] text-slate-400 font-semibold mt-1">Satisfação mapeada</span>
          </div>

        </div>

        <!-- Tabela Rica de Resultados -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">
              Contatos Mapeados (${itensFiltrados.length})
            </h3>
            <span class="text-[11px] text-slate-400 font-semibold">
              ${f.tipoVisao === 'cliente_unico' ? 'Modo: Cliente Único Consolidado' : 'Modo: Oportunidade Individual'}
            </span>
          </div>

          <div class="overflow-x-auto overflow-y-auto max-h-[650px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold min-w-[1000px]">
              <thead class="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3 text-center w-16">Tipo</th>
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Destino(s)</th>
                  <th class="p-3 text-center">Tipo Destino</th>
                  <th class="p-3 text-right">Valor</th>
                  <th class="p-3">Fornecedores</th>
                  <th class="p-3">Consultor Original</th>
                  <th class="p-3 text-center">NPS</th>
                  <th class="p-3 text-center">Última Atividade</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                ${itensFiltrados.map(item => {
                  const badgeTipo = item.tipo === 'viagem' 
                    ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">✈️ Viagem</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">📄 Orçamento</span>';

                  let badgeNps = '<span class="text-slate-400 text-[10px]">-</span>';
                  if (item.npsCategoria === 'promotor') badgeNps = '<span class="text-xs" title="Promotor">🟢</span>';
                  else if (item.npsCategoria === 'neutro') badgeNps = '<span class="text-xs" title="Neutro">🟡</span>';
                  else if (item.npsCategoria === 'detrator') badgeNps = '<span class="text-xs" title="Detrator">🔴</span>';

                  const consultorObj = ctx.consultores.find(c => c.id === item.consultorId);
                  const consultorNome = consultorObj?.nome || 'Consultor';

                  return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td class="p-3 text-center">${badgeTipo}</td>
                      <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">
                        ${item.clienteNome}
                        ${item.clienteTelefone ? `<div class="text-[10px] text-slate-400 font-normal">${item.clienteTelefone}</div>` : ''}
                        ${item.origemLead && item.origemLead !== 'Não Informada' ? `<div class="mt-0.5"><span class="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">📣 ${item.origemLead}</span></div>` : ''}
                      </td>
                      <td class="p-3 font-semibold text-slate-700 dark:text-slate-200">
                        ${item.destino}
                      </td>
                      <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${item.tipoDestino === 'internacional' ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40' : 'bg-sky-50 text-sky-600 dark:bg-sky-950/40'}">
                          ${item.tipoDestino === 'internacional' ? '🌍 Inter' : '🇧🇷 Nac'}
                        </span>
                      </td>
                      <td class="p-3 text-right font-black text-slate-800 dark:text-slate-100">
                        ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                      </td>
                      <td class="p-3 text-slate-500 text-[11px] truncate max-w-[150px]" title="${item.fornecedores.join(', ')}">
                        ${item.fornecedores.length > 0 ? item.fornecedores.join(', ') : '-'}
                      </td>
                      <td class="p-3 text-slate-600 dark:text-slate-300">
                        ${consultorNome}
                      </td>
                      <td class="p-3 text-center">${badgeNps}</td>
                      <td class="p-3 text-center text-[10px] font-mono text-slate-400">
                        ${item.dataReferencia ? new Date(item.dataReferencia).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  `;
                }).join('') || `
                  <tr>
                    <td colspan="9" class="p-8 text-center text-slate-400 font-bold">
                      Nenhum contato encontrado com os critérios de segmentação selecionados.
                    </td>
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
  // MODAL DE AUDITORIA DE METAS
  // ==========================================
  public static abrirModalAuditoriaMeta(metaId: string, consultorId: string, consultorNome: string, ctx: RelatoriosComercialContext): void {
    const meta = ctx.metas.find(m => m.id === metaId);
    if (!meta) return;

    const tipo = (meta.tipo_calculo || 'bruto').toLowerCase();
    const isOrcamento = tipo.includes('orcamento');
    const isCliente = tipo.includes('cliente');
    const isReembolso = tipo.includes('reembolso');
    const prog = MetasService.calcularProgressoConsultor(meta, consultorId, ctx.orcamentos, ctx.viagens, ctx.locPagamentos, ctx.clientes, ctx.reembolsos);

    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay-auditoria-meta';
    overlay.className = 'fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-5 animate-fadeIn font-sans';

    const formatDataLocal = (dStr?: string) => {
      if (!dStr) return '-';
      const clean = dStr.includes('T') ? dStr.split('T')[0] : dStr.split(' ')[0];
      const p = clean.split('-');
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dStr;
    };

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform scale-95 transition-all duration-300">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-lg">🔍</span>
              <h3 class="text-base font-black text-slate-800 dark:text-slate-100">
                Auditoria de Registros • ${consultorNome}
              </h3>
            </div>
            <p class="text-xs text-slate-400 font-semibold mt-0.5">
              Meta/Campanha: <strong>${meta.nome}</strong> (${formatDataLocal(meta.data_inicio)} a ${formatDataLocal(meta.data_fim)}) • <strong>${prog.itensAuditados.length}</strong> registros computados
            </p>
          </div>
          <button id="btn-close-auditoria-meta" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-400 flex items-center justify-center font-bold text-sm transition">
            ✕
          </button>
        </div>

        <!-- Lista de Registros -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
          ${prog.itensAuditados.length === 0 ? `
            <div class="p-8 text-center text-slate-400 text-xs font-semibold">
              Nenhum registro computado para este consultor no período da meta/campanha.
            </div>
          ` : `
            <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
              <table class="w-full text-left border-collapse text-xs font-semibold">
                <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                  <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                    <th class="p-3">Data</th>
                    <th class="p-3">${isCliente ? 'Nome do Cliente' : isOrcamento ? 'Cliente / Lead' : isReembolso ? 'Titular / Passageiro' : 'Passageiro'}</th>
                    <th class="p-3">${isCliente ? 'Contato / Documento' : isReembolso ? 'Fornecedor' : 'Destino'}</th>
                    <th class="p-3">${isCliente ? 'Tipo' : isOrcamento ? 'Status / Proposta' : isReembolso ? 'Valor Reembolso' : 'Valor Total'}</th>
                    <th class="p-3 text-right">Referência</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                  ${prog.itensAuditados.map((item: any) => {
                    const dataFormatada = formatDataLocal(item.data_financeiro || item.data_pagamento || item.created_at || item.createdAt);
                    const clienteNome = item.nome || item.nome_cliente || item.nomeCliente || item.cliente?.nome || item.cliente_nome || 'Cliente';
                    const col2 = isCliente 
                      ? (item.cpf || item.cnpj || item.email || item.telefone || 'Sem contato')
                      : isReembolso 
                        ? (item.fornecedor || 'Fornecedor')
                        : (item.destino || 'Não especificado');
                    
                    let col3 = '';
                    if (isCliente) {
                      col3 = item.tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física';
                    } else if (isOrcamento) {
                      col3 = item.valor_proposta ? 'R$ ' + Number(item.valor_proposta).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : (item.status || 'Orçamento');
                    } else if (isReembolso) {
                      col3 = 'R$ ' + (Number(item.valor_reembolso || item.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    } else {
                      col3 = 'R$ ' + (Number(item.valor_total || item.valorTotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    }

                    const refCod = item.codigo_ref || item.codigo_localizador || (isOrcamento ? 'ORÇ' : isCliente ? 'CLI' : isReembolso ? 'RBS' : 'VIA');

                    return `
                      <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td class="p-3 font-mono text-[11px] text-slate-500">${dataFormatada}</td>
                        <td class="p-3 font-bold text-slate-800 dark:text-slate-100">${clienteNome}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${col2}</td>
                        <td class="p-3 font-black text-slate-800 dark:text-slate-100">${col3}</td>
                        <td class="p-3 text-right font-mono text-[10px] text-slate-400">${refCod}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Footer -->
        <div class="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex justify-end">
          <button id="btn-fechar-auditoria-footer" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition">
            Fechar Auditoria
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => {
      overlay.remove();
    };

    overlay.querySelector('#btn-close-auditoria-meta')?.addEventListener('click', closeModal);
    overlay.querySelector('#btn-fechar-auditoria-footer')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // ==========================================
  // ATTACH EVENTS: COMERCIAL, METAS & CAMPANHAS
  // ==========================================
  public static attachEvents(activeTab: string, ctx: RelatoriosComercialContext): void {
    if (activeTab === 'metas_campanhas') {
      const selectMetaEl = document.getElementById('select-relatorio-meta') as HTMLSelectElement;
      selectMetaEl?.addEventListener('change', () => {
        ctx.selectedMetaId = selectMetaEl.value;
        ctx.onStateChange();
      });

      document.querySelectorAll('.btn-auditar-meta-consultor').forEach(btn => {
        btn.addEventListener('click', () => {
          const metaId = btn.getAttribute('data-meta-id') || '';
          const consultorId = btn.getAttribute('data-consultor-id') || '';
          const consultorNome = btn.getAttribute('data-consultor-nome') || '';
          RelatoriosComercialView.abrirModalAuditoriaMeta(metaId, consultorId, consultorNome, ctx);
        });
      });
    }
 
    if (activeTab === 'segmentacao_campanhas') {
      const aplicarFiltrosCampanhas = (showToast = true) => {
        const origem = (document.getElementById('filtro-campanha-origem') as HTMLSelectElement)?.value as any || 'todos';
        const tipoVisao = (document.getElementById('filtro-campanha-visao') as HTMLSelectElement)?.value as any || 'oportunidade';
        const tipoDestino = (document.getElementById('filtro-campanha-tipo-destino') as HTMLSelectElement)?.value as any || 'todos';
        const destinoBusca = (document.getElementById('filtro-campanha-destino-busca') as HTMLInputElement)?.value || '';
        const pMeses = Number((document.getElementById('filtro-campanha-periodo-meses') as HTMLSelectElement)?.value || 12);
        
        const valMinStr = (document.getElementById('filtro-campanha-valor-min') as HTMLInputElement)?.value;
        const valMaxStr = (document.getElementById('filtro-campanha-valor-max') as HTMLInputElement)?.value;
        const valorMinimo = valMinStr !== '' && !isNaN(Number(valMinStr)) ? Number(valMinStr) : undefined;
        const valorMaximo = valMaxStr !== '' && !isNaN(Number(valMaxStr)) ? Number(valMaxStr) : undefined;

        const fornecedor = (document.getElementById('filtro-campanha-fornecedor') as HTMLInputElement)?.value || '';
        const mesEmbStr = (document.getElementById('filtro-campanha-mes-embarque') as HTMLSelectElement)?.value;
        const mesEmbarque = mesEmbStr ? Number(mesEmbStr) : undefined;

        const statusOrcamento = (document.getElementById('filtro-campanha-status-orcamento') as HTMLSelectElement)?.value || 'TODOS';
        const classificacaoNps = (document.getElementById('filtro-campanha-nps') as HTMLSelectElement)?.value as any || 'todos';
        const consultorSelect = (document.getElementById('filtro-campanha-consultor') as HTMLSelectElement)?.value;
        const origemLead = (document.getElementById('filtro-campanha-origem-lead') as HTMLSelectElement)?.value || 'TODOS';

        const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';

        ctx.campanhasFiltros = {
          origem,
          tipoVisao,
          tipoDestino,
          destinoBusca,
          periodoMeses: pMeses,
          valorMinimo,
          valorMaximo,
          fornecedor,
          mesEmbarque,
          statusOrcamento,
          classificacaoNps,
          perfilPassageiro: 'todos',
          consultorId: isAdmin ? (consultorSelect || 'TODOS') : (ctx.user?.id || ''),
          origemLead: origemLead
        };

        if (showToast) {
          ctx.showToast('Segmentação atualizada com sucesso!', 'success');
        }
        ctx.onStateChange();
      };

      const restaurarFiltrosCampanhas = () => {
        const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';
        ctx.campanhasFiltros = {
          origem: 'todos',
          tipoVisao: 'oportunidade',
          tipoDestino: 'todos',
          destinoBusca: '',
          periodoMeses: 12,
          valorMinimo: undefined,
          valorMaximo: undefined,
          fornecedor: '',
          mesEmbarque: undefined,
          statusOrcamento: 'TODOS',
          classificacaoNps: 'todos',
          perfilPassageiro: 'todos',
          consultorId: isAdmin ? 'TODOS' : (ctx.user?.id || ''),
          origemLead: 'TODOS'
        };
        ctx.showToast('Filtros restaurados para o padrão.', 'success');
        ctx.onStateChange();
      };

      // Botões aplicar (topo e rodapé)
      document.getElementById('btn-campanha-aplicar-filtros-topo')?.addEventListener('click', () => aplicarFiltrosCampanhas(true));
      document.getElementById('btn-campanha-aplicar-filtros')?.addEventListener('click', () => aplicarFiltrosCampanhas(true));

      // Botões restaurar (topo e rodapé)
      document.getElementById('btn-campanha-limpar-filtros-topo')?.addEventListener('click', restaurarFiltrosCampanhas);
      document.getElementById('btn-campanha-limpar-filtros')?.addEventListener('click', restaurarFiltrosCampanhas);

      // Reatividade nos 9 selects de segmentação (trocou, filtra imediatamente!)
      const selectsIds = [
        'filtro-campanha-visao',
        'filtro-campanha-origem',
        'filtro-campanha-origem-lead',
        'filtro-campanha-periodo-meses',
        'filtro-campanha-tipo-destino',
        'filtro-campanha-mes-embarque',
        'filtro-campanha-status-orcamento',
        'filtro-campanha-nps',
        'filtro-campanha-consultor'
      ];
      selectsIds.forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => aplicarFiltrosCampanhas(false));
      });

      // Tecla Enter nos inputs de busca e valores
      const inputsIds = [
        'filtro-campanha-destino-busca',
        'filtro-campanha-valor-min',
        'filtro-campanha-valor-max',
        'filtro-campanha-fornecedor'
      ];
      inputsIds.forEach(id => {
        document.getElementById(id)?.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            aplicarFiltrosCampanhas(true);
          }
        });
      });

      // Exportar CSV
      document.getElementById('btn-campanha-exportar-csv')?.addEventListener('click', () => {
        ctx.exportToCSV();
      });

      // Copiar contatos em lote
      document.getElementById('btn-campanha-copiar-lote')?.addEventListener('click', async () => {
        const usuarioLogado = {
          id: ctx.user?.id || '',
          nome: ctx.perfil?.nome || ctx.user?.email || 'Usuário',
          role: ctx.perfil?.role || 'consultor'
        };
        const todosItens = CampanhasService.normalizarDados(ctx.viagens, ctx.orcamentos, ctx.feedbacksNps);
        let itensFiltrados = CampanhasService.filtrarItens(todosItens, ctx.campanhasFiltros, usuarioLogado);
        if (ctx.campanhasFiltros.tipoVisao === 'cliente_unico') {
          itensFiltrados = CampanhasService.agruparPorCliente(itensFiltrados);
        }

        const textoLote = CampanhasService.formatarListaContatosLote(itensFiltrados);
        if (!textoLote) {
          ctx.showToast('Nenhum telefone encontrado para copiar.', 'error');
          return;
        }

        try {
          await navigator.clipboard.writeText(textoLote);
          ctx.showToast('Lista de contatos copiada para a área de transferência!', 'success');
        } catch {
          ctx.showToast('Falha ao acessar área de transferência.', 'error');
        }
      });

      // Salvar Preset de Campanha
      document.getElementById('btn-campanha-salvar-preset')?.addEventListener('click', async () => {
        const nome = await showCustomPrompt(
          'Dê um nome para este modelo de filtros (ex: "Campanha Cuba & Caribe 2026"):',
          'Salvar Modelo de Campanha',
          'Nome do modelo...'
        );

        if (!nome || !nome.trim()) return;

        const usuario = {
          id: ctx.user?.id || '',
          nome: ctx.perfil?.nome || ctx.user?.email || 'Gestor'
        };

        const res = await CampanhasService.salvarPreset(nome, ctx.campanhasFiltros, usuario);
        if (res.sucesso && res.preset) {
          ctx.campanhasPresets.unshift(res.preset);
          ctx.showToast(res.aviso || 'Modelo de campanha salvo com sucesso!', 'success');
          ctx.onStateChange();
        } else {
          ctx.showToast(res.aviso || 'Erro ao salvar modelo de campanha.', 'error');
        }
      });

      // Carregar Preset
      document.querySelectorAll('.btn-carregar-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          const presetId = btn.getAttribute('data-preset-id');
          const preset = ctx.campanhasPresets.find(p => p.id === presetId);
          if (preset) {
            ctx.campanhasFiltros = { ...preset.filtros };
            ctx.showToast(`Modelo "${preset.nome}" carregado com sucesso!`, 'success');
            ctx.onStateChange();
          }
        });
      });

      // Excluir Preset
      document.querySelectorAll('.btn-excluir-preset').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const presetId = btn.getAttribute('data-preset-id');
          if (!presetId) return;

          const sucesso = await CampanhasService.excluirPreset(presetId);
          if (sucesso) {
            ctx.campanhasPresets = ctx.campanhasPresets.filter(p => p.id !== presetId);
            ctx.showToast('Modelo de campanha excluído.', 'success');
            ctx.onStateChange();
          } else {
            ctx.showToast('Erro ao excluir modelo de campanha.', 'error');
          }
        });
      });

      // Botão de WhatsApp / Visualização de Conversa no Digisac (Sem disparo automático)
      document.querySelectorAll('.btn-chat-digisac').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const clienteNome = btn.getAttribute('data-cliente-nome') || '';
          const clienteTelefone = btn.getAttribute('data-cliente-telefone') || '';
          const consultorNome = btn.getAttribute('data-consultor-nome') || (ctx.perfil?.nome || ctx.user?.email || 'Consultor');
          const destino = btn.getAttribute('data-destino') || undefined;
          const localizador = btn.getAttribute('data-loc') || undefined;
          const viagemId = btn.getAttribute('data-trip-id') || undefined;

          SendTemplateMessageModal.open({
            clienteNome,
            clienteTelefone,
            consultorNome,
            destino,
            localizador,
            viagemId,
            focusChatHistory: true,
            showToast: (msg, type) => ctx.showToast(msg, type)
          });
        });
      });
    }
  }

  // ==========================================
  // EXPORTAÇÃO CSV: DESEMPENHO & SEGMENTAÇÃO
  // ==========================================
  public static appendCsvContent(activeTab: string, data: any, ctx: RelatoriosComercialContext): string | null {
    if (activeTab === 'desempenho') {
      let csvContent = 'Consultor;Orcamentos Criados;Fechados Aceitos;Taxa Conversao;Total Vendido (R$);RAV Rateada (R$)\n';
      const filteredConsultores = ctx.consultores.filter(c => ctx.consultorIdFilter === 'todos' || c.id === ctx.consultorIdFilter);
      filteredConsultores.forEach(c => {
        const subOrc = data.orcamentos.filter((o: any) => (o.consultor_id || o.consultorId) === c.id);
        const subVia = data.viagens.filter((v: any) => ViagensDivisoesService.calcularParticipacaoConsultor(v, c.id) > 0);
        const cAceito = subOrc.filter((o: any) => o.sub_status === 'ACEITO' || o.subStatus === 'ACEITO').length;
        const cRecuso = subOrc.filter((o: any) => o.sub_status === 'DESISTENCIA' || o.subStatus === 'DESISTENCIA').length;
        const cConv = (cAceito + cRecuso) > 0 ? Math.round((cAceito / (cAceito + cRecuso)) * 100) : 0;
        const cSales = subVia.reduce((sum: number, v: any) => {
          const fatia = ViagensDivisoesService.calcularParticipacaoConsultor(v, c.id);
          const vPayments = data.locPagamentos.filter((p: any) => 
            (p.viagem_id === v.id || p.viagemId === v.id) &&
            p.formas_recebimento &&
            ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
          );
          const vSub = vPayments.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
          return sum + (Math.max(0, (v.valor_total || v.valorTotal || 0) - vSub) * fatia);
        }, 0);
        const cRav = subVia.reduce((sum: number, v: any) => {
          const fatiaRav = ViagensDivisoesService.calcularParticipacaoRavConsultor(v, c.id);
          const prods = Array.isArray(v.produtos) ? v.produtos : [];
          const totalRavViagem = prods.reduce((accP: number, p: any) => accP + (Number(p.rav) || 0), 0);
          return sum + (totalRavViagem * fatiaRav);
        }, 0);
        
        csvContent += `"${c.nome}";${subOrc.length};${cAceito};"${cConv}%";${cSales};${cRav}\n`;
      });
      return csvContent;
    }

    if (activeTab === 'segmentacao_campanhas') {
      const usuarioLogado = {
        id: ctx.user?.id || '',
        nome: ctx.perfil?.nome || ctx.user?.email || 'Usuário',
        role: ctx.perfil?.role || 'consultor'
      };
      const todosItens = CampanhasService.normalizarDados(data.viagens || [], data.orcamentos || [], ctx.feedbacksNps || []);
      let itensFiltrados = CampanhasService.filtrarItens(todosItens, ctx.campanhasFiltros, usuarioLogado);
      if (ctx.campanhasFiltros.tipoVisao === 'cliente_unico') {
        itensFiltrados = CampanhasService.agruparPorCliente(itensFiltrados);
      }
      return CampanhasService.gerarCsv(itensFiltrados);
    }

    return null;
  }
}
