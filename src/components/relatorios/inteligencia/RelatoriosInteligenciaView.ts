// ==========================================
// SUBMÓDULO ESPECIALISTA DE RELATÓRIOS: INTELIGÊNCIA & PREDIÇÃO
// Extraído de src/pages/Relatorios.ts (Fase 1 - Pacote 1.4)
// Abrangência: Previsões Comerciais, Origem de Leads, Gamificação & Risco Preditivo
// ==========================================

import { supabase } from '../../../services/supabase';
import { PerfilConsultor } from '../../../types';
import { obterProgressoNivel, BADGE_DEFINITIONS } from '../../../services/gamification';
import { EditTravelModal } from '../../dashboard/EditTravelModal';

export interface RelatoriosInteligenciaContext {
  orcamentos: any[];
  viagens: any[];
  clientes: any[];
  consultores: any[];
  consultoresBadges: any[];
  locPagamentos: any[];
  locConferencias: any[];
  tiposProduto: any[];
  perfil: PerfilConsultor | null;
  user: any;
  activeTab: string;
  consultorIdFilter: string;
  prazoReembolsoDias: number;
  showToast: (message: string, type?: 'success' | 'error', err?: any) => void;
  abrirModalOrcamento: (id: string) => Promise<void>;
  onStateChange: () => void;
  loadData: () => Promise<void>;
}

export class RelatoriosInteligenciaView {

  // ==========================================
  // VIEW: PREVISÕES PREDITIVAS
  // ==========================================
  public static renderPrevisoes(data: any, ctx: RelatoriosInteligenciaContext): string {
    const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';
    const effectiveFilter = isAdmin ? ctx.consultorIdFilter : (ctx.user?.id || '');

    const matchConsultant = (id: string) => {
      if (!isAdmin) return id === effectiveFilter;
      if (effectiveFilter === 'todos') return true;
      return id === effectiveFilter;
    };

    // 1. Pipeline ativo
    const pipelineOrc = (data.orcamentos || []).filter((o: any) => o.status !== 'CONCLUIDO' && matchConsultant(o.consultor_id || o.consultorId));
    const valorPipelineBruto = pipelineOrc.reduce((acc: number, o: any) => acc + (o.valorProposta || o.valor_proposta || 0), 0);

    // Probabilidades por fase do funil
    // SOLICITADO = 15%, EM_ANDAMENTO = 45%, AGUARDANDO = 75%
    let valorPonderado = 0;
    const counts = { solicitado: 0, em_andamento: 0, aguardando: 0 };
    const values = { solicitado: 0, em_andamento: 0, aguardando: 0 };

    pipelineOrc.forEach((o: any) => {
      const val = o.valorProposta || o.valor_proposta || 0;
      if (o.status === 'SOLICITADO') {
        valorPonderado += val * 0.15;
        counts.solicitado++;
        values.solicitado += val;
      } else if (o.status === 'EM_ANDAMENTO') {
        valorPonderado += val * 0.45;
        counts.em_andamento++;
        values.em_andamento += val;
      } else if (o.status === 'AGUARDANDO') {
        valorPonderado += val * 0.75;
        counts.aguardando++;
        values.aguardando += val;
      }
    });

    // Projeções futuras de embarques nos próximos 30 dias (Faturamento caixa iminente)
    const hoje = new Date();
    const limite30Dias = new Date();
    limite30Dias.setDate(hoje.getDate() + 30);

    const proximosEmbarques = (data.viagens || []).filter((v: any) => {
      if (!v.data_ida && !v.dataIda) return false;
      const dataIda = new Date(v.data_ida || v.dataIda);
      return dataIda >= hoje && dataIda <= limite30Dias && v.status !== 'cancelada' && matchConsultant(v.consultor_id || v.consultorId);
    });

    const valorEmbarquesProximos = proximosEmbarques.reduce((acc: number, v: any) => acc + (v.valor_total || v.valorTotal || 0), 0);

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width animate-fadeIn">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🔮 Projeções Comerciais e Previsão Preditiva</span>
        </h2>
        
        <!-- Alerta de compliance offline -->
        <div class="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
          <span>🔒</span>
          <span><strong>Compliance de Dados:</strong> Este relatório utiliza algoritmos estatísticos lineares executados localmente em seu navegador. Nenhum dado é enviado para APIs de IA externas ou consome tokens online.</span>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pipeline Ativo Total (Cotação)</p>
            <p class="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorPipelineBruto)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center border-l-4 border-l-indigo-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fechamento Previsto (Ponderado)</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorPonderado)}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Embarques Próximos (30 dias)</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorEmbarquesProximos)}</p>
          </div>
        </div>

        <!-- Funil preditivo -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Funil de Cotação Ativa (Pipeline Ponderado)</h3>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Etapa/Status</th>
                  <th class="p-3 text-center">Quantidade</th>
                  <th class="p-3">Volume Bruto</th>
                  <th class="p-3 text-center">Conversão Est. (%)</th>
                  <th class="p-3">Receita Prevista (Ponderado)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">1. Solicitado (Novo Lead)</td>
                  <td class="p-3 text-center">${counts.solicitado}</td>
                  <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.solicitado)}</td>
                  <td class="p-3 text-center text-rose-500">15%</td>
                  <td class="p-3 font-extrabold text-indigo-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.solicitado * 0.15)}</td>
                </tr>
                <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">2. Em Andamento (Negociação)</td>
                  <td class="p-3 text-center">${counts.em_andamento}</td>
                  <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.em_andamento)}</td>
                  <td class="p-3 text-center text-amber-500">45%</td>
                  <td class="p-3 font-extrabold text-indigo-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.em_andamento * 0.45)}</td>
                </tr>
                <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">3. Aguardando (Fechamento)</td>
                  <td class="p-3 text-center">${counts.aguardando}</td>
                  <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.aguardando)}</td>
                  <td class="p-3 text-center text-emerald-500">75%</td>
                  <td class="p-3 font-extrabold text-indigo-600">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.aguardando * 0.75)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: ORIGEM DE LEADS
  // ==========================================
  public static renderOrigens(data: any, _ctx?: RelatoriosInteligenciaContext): string {
    const orcados = data.orcamentos.length;
    const fechadosAceitos = data.orcamentos.filter((o: any) => o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO').length;
    const fechadosRecusados = data.orcamentos.filter((o: any) => o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA').length;
    const finalizados = fechadosAceitos + fechadosRecusados;
    const conversaoGlobal = finalizados > 0 ? Math.round((fechadosAceitos / finalizados) * 100) : 0;
    
    // Grouping by origin
    const originStats: Record<string, { count: number, won: number, lost: number, revenue: number }> = {
      'WhatsApp': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Instagram': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Indicação': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Google': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Site': { count: 0, won: 0, lost: 0, revenue: 0 },
      'Outros': { count: 0, won: 0, lost: 0, revenue: 0 }
    };

    data.orcamentos.forEach((o: any) => {
      const orig = o.origem || 'Outros';
      const k = originStats[orig] ? orig : 'Outros';
      originStats[k].count++;
      if (o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO') {
        originStats[k].won++;
        originStats[k].revenue += (o.valorViagem || o.valor_viagem || o.valorProposta || o.valor_proposta || 0);
      } else if (o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA') {
        originStats[k].lost++;
      }
    });

    // Best performing channel by revenue or conversion
    let bestChannel = 'Nenhum';
    let maxRevenue = -1;
    Object.entries(originStats).forEach(([chan, stats]) => {
      if (stats.revenue > maxRevenue && stats.won > 0) {
        maxRevenue = stats.revenue;
        bestChannel = chan;
      }
    });

    // Build SVG bar chart data
    const originVals = Object.values(originStats).map(s => s.count);
    const maxCount = originVals.length > 0 ? (Math.max(...originVals) || 1) : 1;
    let barChartHtml = '';
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#6b7280'];
    Object.entries(originStats).forEach(([orig, stats], idx) => {
      if (stats.count === 0) return;
      const pct = Math.round((stats.count / maxCount) * 80) + 5;
      const sharePct = Math.round((stats.count / (orcados || 1)) * 100);
      const color = colors[idx % colors.length];
      barChartHtml += `
        <div class="space-y-1">
          <div class="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>${orig} (${stats.count} leads)</span>
            <span>${sharePct}% do share</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-5 rounded-lg overflow-hidden flex">
            <div class="h-full rounded-lg transition-all duration-500" style="width: ${pct}%; background-color: ${color}"></div>
          </div>
        </div>
      `;
    });

    if (!barChartHtml) {
      barChartHtml = '<p class="text-xs text-slate-400 font-bold py-6 text-center">Nenhum lead catalogado no período.</p>';
    }

    const tableRows = Object.entries(originStats).map(([orig, stats]) => {
      const totalFin = stats.won + stats.lost;
      const conv = totalFin > 0 ? Math.round((stats.won / totalFin) * 100) : 0;
      const avgTicket = stats.won > 0 ? Math.round(stats.revenue / stats.won) : 0;
      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${orig}</td>
          <td class="p-3 text-center">${stats.count}</td>
          <td class="p-3 text-center">${stats.won}</td>
          <td class="p-3 font-extrabold text-center text-emerald-600">${conv}%</td>
          <td class="p-3 font-extrabold text-slate-700 dark:text-slate-200">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.revenue)}</td>
          <td class="p-3">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(avgTicket)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width animate-fadeIn">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>📢 Origem de Leads e Eficiência de Funil</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Leads</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${orcados}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Conversão Média</p>
            <p class="text-lg font-black text-indigo-650 dark:text-indigo-400 mt-1">${conversaoGlobal}%</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Canal Campeão (Faturamento)</p>
            <p class="text-lg font-black text-emerald-600 mt-1 truncate">${bestChannel}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Faturamento Leads (Won)</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Object.values(originStats).reduce((s, o) => s + o.revenue, 0))}</p>
          </div>
        </div>

        <!-- SVG Bar Chart -->
        <div class="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl gap-4 flex flex-col">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Volume de Leads por Canal de Entrada</h3>
          <div class="space-y-4">
            ${barChartHtml}
          </div>
        </div>

        <!-- Table detailing data -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Performance por Origem de Leads</h3>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Origem</th>
                  <th class="p-3 text-center">Total Leads</th>
                  <th class="p-3 text-center">Ganhos</th>
                  <th class="p-3 text-center">Conversão</th>
                  <th class="p-3">Faturamento Realizado</th>
                  <th class="p-3">Tíquete Médio</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: RELATÓRIO DE GAMIFICAÇÃO
  // ==========================================
  public static renderGamificacao(data: any, ctx: RelatoriosInteligenciaContext): string {
    const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';

    // Se NÃO for administrador: exibe estritamente o progresso e conquistas individuais do consultor
    if (!isAdmin) {
      const meuPerfil = ctx.perfil || ctx.consultores.find(c => c.id === ctx.user?.id) || {
        id: ctx.user?.id || '',
        nome: 'Você',
        email: ctx.user?.email || '',
        xp: 0
      };
      const meuXp = (meuPerfil as any).xp || 0;
      const prog = obterProgressoNivel(meuXp);
      const minhasBadges = (data.consultoresBadges || [])
        .filter((b: any) => (b.profile_id || b.profileId) === ctx.user?.id)
        .map((b: any) => b.badge_key);

      const badgesGrid = BADGE_DEFINITIONS.map(b => {
        const conquistado = minhasBadges.includes(b.key);
        return `
          <div class="p-4 rounded-2xl border transition-all ${conquistado 
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 shadow-sm' 
            : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'} flex flex-col justify-between gap-3">
            <div class="flex items-start gap-3">
              <span class="text-3xl p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xs shrink-0">${b.emoji}</span>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h4 class="font-black text-xs text-slate-800 dark:text-slate-100">${b.nome}</h4>
                  ${conquistado 
                    ? `<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase">Conquistada ✅</span>` 
                    : `<span class="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500 text-[9px] font-black uppercase">Bloqueada 🔒</span>`}
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">${b.descricao}</p>
              </div>
            </div>
            <div class="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span>${b.categoria}</span>
              <span class="${conquistado ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''}">${conquistado ? 'Ativa no Perfil' : 'A Conquistar'}</span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width animate-fadeIn">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>🏆 Seu Progresso de Gamificação & Conquistas</span>
              </h2>
              <p class="text-xs text-slate-400 font-semibold mt-0.5">Acompanhe sua pontuação de experiência, patente e condecorações acumuladas.</p>
            </div>
            <span class="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60 rounded-xl text-xs font-black">
              ${minhasBadges.length} de ${BADGE_DEFINITIONS.length} Conquistas
            </span>
          </div>

          <!-- Cards de Nível e XP -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Patente Atual</p>
              <p class="text-lg font-black text-slate-800 dark:text-slate-100 mt-1 flex items-center justify-center gap-2">
                <span class="text-2xl">${prog.patenteEmoji}</span>
                <span>${prog.patente}</span>
              </p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nível de Carreira</p>
              <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">Nível ${prog.nivel}</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">XP Total Acumulado</p>
              <p class="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">${meuXp.toLocaleString('pt-BR')} XP</p>
            </div>
          </div>

          <!-- Barra de Evolução até o próximo nível -->
          <div class="p-5 bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-indigo-950/10 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-3">
            <div class="flex justify-between items-center text-xs font-black">
              <span class="text-slate-700 dark:text-slate-200">Progresso para o Nível ${prog.nivel + 1}</span>
              <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">${prog.xpAtual} / ${prog.xpProximoNivel} XP (${Math.round(prog.percent)}%)</span>
            </div>
            <div class="w-full bg-slate-200/80 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div class="bg-indigo-600 h-full rounded-full transition-all duration-500" style="width: ${Math.round(prog.percent)}%"></div>
            </div>
            <p class="text-[11px] text-slate-400 font-medium">Faltam <strong>${prog.xpProximoNivel - prog.xpAtual} XP</strong> para alcançar o próximo nível.</p>
          </div>

          <!-- Grid de Conquistas Pessoais -->
          <div class="space-y-3">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Suas Conquistas e Medalhas</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              ${badgesGrid}
            </div>
          </div>
        </div>
      `;
    }

    // Visão Completa de Administração
    const consultoresParticipantes = ctx.consultores.filter(c => c.ativo !== false && c.participa_metricas !== false && c.participaMetricas !== false);
    const totalConsultores = consultoresParticipantes.length || 1;
    
    // Process each consultant's progress and badges
    const ranking = consultoresParticipantes.map((c: any) => {
      const xp = c.xp || 0;
      const prog = obterProgressoNivel(xp);
      const cBadges = (data.consultoresBadges || []).filter((b: any) => (b.profile_id || b.profileId) === c.id).map((b: any) => b.badge_key);
      return {
        ...c,
        xp,
        nivel: prog.nivel,
        prog,
        badges: cBadges,
        badgesCount: cBadges.length
      };
    });

    // Sort: Level desc, then XP desc
    ranking.sort((a, b) => {
      if (b.nivel !== a.nivel) return b.nivel - a.nivel;
      return b.prog.xpAtual - a.prog.xpAtual;
    });

    // Compute metrics
    const mediaXp = ranking.length > 0 ? Math.round(ranking.reduce((sum, c) => sum + c.xp, 0) / ranking.length) : 0;
    
    let topDecoratedName = 'Nenhum';
    let maxBadges = -1;
    ranking.forEach(c => {
      if (c.badgesCount > maxBadges) {
        maxBadges = c.badgesCount;
        topDecoratedName = c.nome;
      }
    });

    // Count achievements per badge definition
    const badgeUnlocks: Record<string, string[]> = {};
    BADGE_DEFINITIONS.forEach(b => {
      badgeUnlocks[b.key] = [];
    });

    ranking.forEach(c => {
      c.badges.forEach((bKey: string) => {
        if (badgeUnlocks[bKey]) {
          badgeUnlocks[bKey].push(c.nome);
        }
      });
    });

    // Find rarest badge (unlocked by > 0 people, but with lowest count)
    let rarestBadgeName = 'Nenhuma';
    let rarestBadgeEmoji = '🏆';
    let minUnlocks = Infinity;
    
    Object.entries(badgeUnlocks).forEach(([key, list]) => {
      const count = list.length;
      if (count > 0 && count < minUnlocks) {
        minUnlocks = count;
        const def = BADGE_DEFINITIONS.find(b => b.key === key);
        if (def) {
          rarestBadgeName = def.nome;
          rarestBadgeEmoji = def.emoji;
        }
      }
    });

    if (minUnlocks === Infinity) {
      rarestBadgeName = 'Nenhuma conquista';
      rarestBadgeEmoji = '🔒';
    }

    // Leaderboard Rows
    const leaderboardRows = ranking.map((c, index) => {
      const pct = Math.round(c.prog.percent);
      const isTop = index === 0;
      const rankBadge = isTop ? '👑' : `#${index + 1}`;
      const rankColor = isTop ? 'text-amber-500 font-black' : 'text-slate-400';
      const formattedXp = c.xp.toLocaleString('pt-BR');
      
      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors text-slate-600 dark:text-slate-300">
          <td class="p-3 align-middle text-center ${rankColor}">${rankBadge}</td>
          <td class="p-3 align-middle">
            <div class="flex items-center gap-3">
              <span class="text-xl shrink-0">${c.prog.patenteEmoji}</span>
              <div class="min-w-0">
                <p class="font-extrabold text-slate-800 dark:text-slate-100 truncate">${c.nome}</p>
                <p class="text-[10px] text-slate-400 dark:text-slate-400 font-semibold truncate">${c.email}</p>
              </div>
            </div>
          </td>
          <td class="p-3 align-middle text-center font-extrabold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">Nível ${c.nivel}</td>
          <td class="p-3 align-middle font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">${c.prog.patente}</td>
          <td class="p-3 align-middle font-bold whitespace-nowrap">${formattedXp} XP</td>
          <td class="p-3 align-middle w-1/4">
            <div class="space-y-1">
              <div class="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>${c.prog.xpAtual} / ${c.prog.xpProximoNivel} XP</span>
                <span>${pct}%</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-indigo-600 h-full rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>
          </td>
          <td class="p-3 align-middle text-center font-black text-emerald-600 whitespace-nowrap">${c.badgesCount} conquistas</td>
        </tr>
      `;
    }).join('');

    // Badge Analytics Rows
    const badgeRows = BADGE_DEFINITIONS.map(b => {
      const list = badgeUnlocks[b.key] || [];
      const count = list.length;
      const rate = totalConsultores > 0 ? Math.round((count / totalConsultores) * 100) : 0;
      const unlockedByText = count > 0 
        ? list.map(name => `<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded-lg font-bold">${name}</span>`).join(' ')
        : `<span class="text-slate-400 dark:text-slate-400 italic text-[11px]">Ninguém conquistou ainda</span>`;
        
      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <td class="p-3 text-2xl text-center">${b.emoji}</td>
          <td class="p-3">
            <p class="font-extrabold text-slate-800 dark:text-slate-100">${b.nome}</p>
            <p class="text-[10px] text-slate-400 dark:text-slate-400 font-semibold">${b.descricao}</p>
          </td>
          <td class="p-3 font-bold text-slate-600 dark:text-slate-400">${b.categoria}</td>
          <td class="p-3 text-center font-extrabold text-indigo-650">${rate}% (${count} de ${totalConsultores})</td>
          <td class="p-3">${unlockedByText}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width animate-fadeIn">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🏆 Auditoria de Gamificação e Desempenho da Equipe</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Média de XP da Equipe</p>
            <p class="text-lg font-black text-indigo-650 dark:text-indigo-400 mt-1">${mediaXp.toLocaleString('pt-BR')} XP</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mais Condecorado(a)</p>
            <p class="text-lg font-black text-emerald-650 mt-1 truncate">${topDecoratedName} (${maxBadges} medalhas)</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Medalha Mais Rara Ativa</p>
            <p class="text-lg font-black text-amber-600 mt-1 truncate flex items-center justify-center gap-1">
              <span>${rarestBadgeEmoji}</span> <span>${rarestBadgeName}</span>
            </p>
          </div>
        </div>

        <!-- Section: Leaderboard -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Ranking Geral de Engajamento</h3>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3 text-center w-12">Posição</th>
                  <th class="p-3">Consultor</th>
                  <th class="p-3 text-center">Nível</th>
                  <th class="p-3">Patente</th>
                  <th class="p-3">XP Total</th>
                  <th class="p-3">Progresso do Nível</th>
                  <th class="p-3 text-center">Conquistas</th>
                </tr>
              </thead>
              <tbody>
                ${leaderboardRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section: Badge Analytics -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Distribuição e Adoção de Medalhas (Badge Analytics)</h3>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3 text-center w-12">Medalha</th>
                  <th class="p-3">Nome / Detalhe</th>
                  <th class="p-3">Categoria</th>
                  <th class="p-3 text-center">Taxa de Adoção</th>
                  <th class="p-3">Consultores Condecorados</th>
                </tr>
              </thead>
              <tbody>
                ${badgeRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // VIEW: PAINEL PREDITIVO DE RISCO & CHURN
  // ==========================================
  public static renderRiscoPreditivo(data: any, ctx: RelatoriosInteligenciaContext): string {
    const agora = new Date();
    const antecedenciaDias = ctx.prazoReembolsoDias || 15;

    // 1. Risco Comercial (Orçamentos)
    const orcamentosAtivos = (data.orcamentos || []).filter((o: any) => o.status !== 'CONCLUIDO');
    const orcamentosEmRisco: any[] = [];

    orcamentosAtivos.forEach((o: any) => {
      const updatedDate = new Date(o.updated_at || o.created_at || Date.now());
      const diffHours = (agora.getTime() - updatedDate.getTime()) / (1000 * 60 * 60);
      const temp = (o.temperatura || o.lead_temperatura || 'QUENTE').toUpperCase();
      const valor = Number(o.valor_total || o.valorTotal || 0);

      let emRisco = false;
      let nivelRisco = 'BAIXO';
      let motivoRisco = '';

      if (temp === 'QUENTE' && diffHours >= 48) {
        emRisco = true;
        nivelRisco = 'ALTO';
        motivoRisco = `Lead Quente sem contato há ${Math.floor(diffHours / 24)}d (${Math.floor(diffHours)}h)`;
      } else if (temp === 'MORNO' && diffHours >= 120) {
        emRisco = true;
        nivelRisco = 'MÉDIO';
        motivoRisco = `Lead Morno estagnado há ${Math.floor(diffHours / 24)} dias`;
      } else if (temp === 'FRIO' && diffHours >= 240) {
        emRisco = true;
        nivelRisco = 'BAIXO';
        motivoRisco = `Lead Frio sem interação há ${Math.floor(diffHours / 24)} dias`;
      }

      if (emRisco) {
        const consultor = ctx.consultores.find((c: any) => c.id === (o.consultor_id || o.consultorId));
        const clienteObj = (data.clientes || []).find((cl: any) => cl.id === (o.cliente_id || o.clienteId));
        const clienteNomeExibido = clienteObj?.nome || o.nome_cliente || o.nomeCliente || o.cliente_nome || o.clienteNome || 'Cliente sem nome';
        const clienteTelExibido = clienteObj?.telefone || clienteObj?.contato || o.cliente_telefone || o.clienteTelefone || '';

        orcamentosEmRisco.push({
          ...o,
          diffHours,
          nivelRisco,
          motivoRisco,
          valor,
          clienteNomeExibido,
          clienteTelExibido,
          consultorNome: consultor?.nome || 'Consultor'
        });
      }
    });

    orcamentosEmRisco.sort((a, b) => b.valor - a.valor);

    // 2. Risco Operacional (Viagens Fechadas)
    const viagensEmRisco: any[] = [];

    (data.viagens || []).forEach((v: any) => {
      if (!v.data_saida && !v.dataSaida) return;
      const dataSaida = new Date(v.data_saida || v.dataSaida);
      const diffDiasEmbarque = Math.ceil((dataSaida.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDiasEmbarque >= 0 && diffDiasEmbarque <= antecedenciaDias) {
        const pendencias: string[] = [];

        // Inconsistência 1: LOC sem conferência financeira ou saldo aberto
        const hasOpenLoc = (v.produtos || []).some((p: any) => {
          const loc = (p.codigo_reserva || p.codigoReserva || '').trim().toUpperCase();
          const conf = (data.locConferencias || []).find((c: any) => c.codigo_localizador === loc);
          return !conf || !conf.conferido;
        });
        if (hasOpenLoc) pendencias.push('LOC sem conferência financeira');

        // Inconsistência 2: Passaporte/visto expirando
        if (v.cliente?.passaporte_validade) {
          const validade = new Date(v.cliente.passaporte_validade);
          const diffSla = Math.ceil((validade.getTime() - dataSaida.getTime()) / (1000 * 60 * 60 * 24));
          if (diffSla < 180) pendencias.push(`Passaporte vence em SLA crítico (${diffSla}d)`);
        }

        // Inconsistência 3: Sem vouchers salvos
        if (!v.produtos || v.produtos.length === 0) {
          pendencias.push('Viagem sem produtos/vouchers salvos');
        }

        if (pendencias.length > 0) {
          viagensEmRisco.push({
            ...v,
            diffDiasEmbarque,
            pendencias,
            consultorNome: v.consultor?.nome || 'Consultor'
          });
        }
      }
    });

    const ticketRiscoTotal = orcamentosEmRisco.reduce((s, o) => s + o.valor, 0);

    return `
      <div class="space-y-6 animate-fadeIn print-full-width">
        
        <!-- Header banner -->
        <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[10px] uppercase rounded-full tracking-wider mb-2">
              🚨 Algoritmo Preditivo Ativo
            </span>
            <h2 class="text-xl font-black tracking-tight text-white font-style-normal">Painel de Previsão de Risco & Churn</h2>
            <p class="text-xs text-slate-300 font-medium mt-1">Monitoramento ativo em tempo real de oportunidades comerciais esfriando e sinistros operacionais em viagens.</p>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <div class="text-right">
              <span class="block text-[10px] font-bold text-slate-400 uppercase">Ticket em Risco</span>
              <span class="text-2xl font-black text-amber-400">R$ ${ticketRiscoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <!-- Seção 1: Orçamentos em Risco (Comercial) -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">🔥</span>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100">Leads & Orçamentos em Risco de Desistência</h3>
            </div>
            <span class="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-extrabold text-xs rounded-xl border border-amber-200/60 dark:border-amber-900/60">
              ${orcamentosEmRisco.length} em alerta
            </span>
          </div>

          ${orcamentosEmRisco.length === 0 ? `
            <div class="p-8 text-center text-slate-400 text-xs font-semibold">
              Nenhum orçamento em risco identificado. Excelente ritmo de contato com os clientes! 🎉
            </div>
          ` : `
            <div class="overflow-x-auto overflow-y-auto max-h-[500px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-xl relative">
              <table class="w-full text-left border-collapse text-xs font-semibold">
                <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                  <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                    <th class="p-3">Gravidade</th>
                    <th class="p-3">Cliente</th>
                    <th class="p-3">Destino</th>
                    <th class="p-3">Valor Estimado</th>
                    <th class="p-3">Consultor</th>
                    <th class="p-3">Diagnóstico</th>
                    <th class="p-3 text-center">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                  ${orcamentosEmRisco.map(o => {
                    let badgeGravidade = '<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-600">Baixo</span>';
                    if (o.nivelRisco === 'ALTO') badgeGravidade = '<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/10 text-rose-600 border border-rose-500/20">Crítico 🔥</span>';
                    if (o.nivelRisco === 'MÉDIO') badgeGravidade = '<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">Atenção ⚠️</span>';

                    return `
                      <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td class="p-3">${badgeGravidade}</td>
                        <td class="p-3 font-bold text-slate-800 dark:text-slate-100">${o.clienteNomeExibido}</td>
                        <td class="p-3 text-slate-600 dark:text-slate-300">${o.destino || 'Não informado'}</td>
                        <td class="p-3 font-black text-slate-800 dark:text-slate-100">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.valor)}</td>
                        <td class="p-3 text-slate-500">${o.consultorNome}</td>
                        <td class="p-3 text-rose-600 dark:text-rose-400 font-bold">${o.motivoRisco}</td>
                        <td class="p-3 text-center">
                          <div class="flex items-center justify-center gap-1.5">
                            ${o.clienteTelExibido ? `
                              <button data-phone="${o.clienteTelExibido}" data-name="${o.clienteNomeExibido}" class="btn-risk-wa px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition shadow-sm" title="Disparar WhatsApp">
                                💬 WhatsApp
                              </button>
                            ` : ''}
                            <button data-title="${o.clienteNomeExibido} - ${o.destino || ''}" data-consultor="${o.consultor_id || o.consultorId}" class="btn-risk-remind px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition shadow-sm" title="Criar Lembrete Urgente">
                              ⏰ Cobrar
                            </button>
                            <button data-orc-id="${o.id}" class="btn-risk-orc px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition" title="Abrir Orçamento">
                              📄 Ver
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Seção 2: Viagens em Risco Operacional -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">🛫</span>
              <h3 class="text-sm font-black text-slate-800 dark:text-slate-100">Viagens Iminentes com Pendências Críticas (${antecedenciaDias} dias)</h3>
            </div>
            <span class="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold text-xs rounded-xl border border-rose-200/60 dark:border-rose-900/60">
              ${viagensEmRisco.length} em risco
            </span>
          </div>

          ${viagensEmRisco.length === 0 ? `
            <div class="p-8 text-center text-slate-400 text-xs font-semibold">
              Nenhuma viagem em risco operacional iminente identificada. SLAs e documentos sob controle! 🛡️
            </div>
          ` : `
            <div class="overflow-x-auto overflow-y-auto max-h-[500px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-xl relative">
              <table class="w-full text-left border-collapse text-xs font-semibold">
                <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                  <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                    <th class="p-3">Embarque</th>
                    <th class="p-3">Passageiro / Titular</th>
                    <th class="p-3">Destino</th>
                    <th class="p-3">Consultor</th>
                    <th class="p-3">Pendências Identificadas</th>
                    <th class="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                  ${viagensEmRisco.map(v => `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td class="p-3 font-mono font-bold text-rose-600">
                        ${v.diffDiasEmbarque === 0 ? 'HOJE ⚠️' : `Em ${v.diffDiasEmbarque} dias`}
                      </td>
                      <td class="p-3 font-bold text-slate-800 dark:text-slate-100">${v.cliente?.nome || 'Passageiro'}</td>
                      <td class="p-3 text-slate-600 dark:text-slate-300">${v.destino || 'Destino'}</td>
                      <td class="p-3 text-slate-500">${v.consultorNome}</td>
                      <td class="p-3">
                        <div class="flex flex-wrap gap-1">
                          ${v.pendencias.map((p: string) => `
                            <span class="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] font-black rounded-md border border-rose-200/60 dark:border-rose-900/60">
                              ⚠️ ${p}
                            </span>
                          `).join('')}
                        </div>
                      </td>
                      <td class="p-3 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                          <button data-trip-id="${v.id}" class="btn-risk-edit px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg transition shadow-sm" title="Abrir Ficha da Viagem">
                            📝 Ver Viagem
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>
    `;
  }

  // ==========================================
  // EVENTOS DO SUBMÓDULO DE INTELIGÊNCIA
  // ==========================================
  public static attachEvents(activeTab: string, ctx: RelatoriosInteligenciaContext): void {
    if (activeTab === 'riscopreditivo') {
      // Disparo de WhatsApp
      document.querySelectorAll('.btn-risk-wa').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const phone = btn.getAttribute('data-phone') || '';
          const name = btn.getAttribute('data-name') || 'Cliente';
          const msg = encodeURIComponent(`Olá ${name}, tudo bem? Estou passando para alinhar os detalhes da sua proposta na agência...`);
          window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
        });
      });

      // Lembrete Urgente de Cobrança
      document.querySelectorAll('.btn-risk-remind').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const title = btn.getAttribute('data-title') || 'Acompanhamento de Risco';
          const consultorId = btn.getAttribute('data-consultor') || ctx.user?.id;
          try {
            await supabase.from('lembretes').insert({
              title: `🚨 RISCO: ${title}`,
              consultor_id: consultorId,
              status: 'PENDENTE',
              prioridade: 'URGENTE',
              created_at: new Date().toISOString()
            });
            ctx.showToast('Lembrete urgente de risco criado no Inbox com sucesso!', 'success');
          } catch (err: any) {
            ctx.showToast('Erro ao criar lembrete de risco.', 'error', err);
          }
        });
      });

      // Ver Orçamento Modal
      document.querySelectorAll('.btn-risk-orc').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const orcId = btn.getAttribute('data-orc-id');
          if (orcId) {
            await ctx.abrirModalOrcamento(orcId);
          }
        });
      });

      // Ver Viagem Modal
      document.querySelectorAll('.btn-risk-edit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const tripId = btn.getAttribute('data-trip-id');
          if (tripId) {
            const editModal = new EditTravelModal({
              perfil: ctx.perfil,
              consultores: ctx.consultores,
              tiposProduto: ctx.tiposProduto,
              viagens: ctx.viagens,
              isFallbackMode: false,
              user: ctx.user,
              onUpdate: async () => {
                await ctx.loadData();
                ctx.onStateChange();
              },
              showToast: (m, t, err) => ctx.showToast(m, t, err),
              checkSLA: () => ({ alert: false, type: null, text: '' })
            });
            await editModal.open(tripId, 'detalhes');
          }
        });
      });
    }
  }

  // ==========================================
  // EXPORTAÇÃO CSV: PREVISÕES, ORIGENS & GAMIFICAÇÃO
  // ==========================================
  public static appendCsvContent(activeTab: string, data: any, ctx: RelatoriosInteligenciaContext): string | null {
    if (activeTab === 'previsoes') {
      let csvContent = 'Fase;Valor Total;Probabilidade;Valor Ponderado\n';
      const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';
      const effectiveFilter = isAdmin ? ctx.consultorIdFilter : (ctx.user?.id || '');

      const matchConsultant = (id: string) => {
        if (!isAdmin) return id === effectiveFilter;
        if (effectiveFilter === 'todos') return true;
        return id === effectiveFilter;
      };
      const pipelineOrc = (data.orcamentos || []).filter((o: any) => o.status !== 'CONCLUIDO' && matchConsultant(o.consultor_id || o.consultorId));
      
      const values = { solicitado: 0, em_andamento: 0, aguardando: 0 };
      pipelineOrc.forEach((o: any) => {
        const val = o.valorProposta || o.valor_proposta || 0;
        if (o.status === 'SOLICITADO') values.solicitado += val;
        else if (o.status === 'EM_ANDAMENTO') values.em_andamento += val;
        else if (o.status === 'AGUARDANDO') values.aguardando += val;
      });

      csvContent += `Solicitado;${values.solicitado};15%;${values.solicitado * 0.15}\n`;
      csvContent += `Em Andamento;${values.em_andamento};45%;${values.em_andamento * 0.45}\n`;
      csvContent += `Aguardando;${values.aguardando};75%;${values.aguardando * 0.75}\n`;
      return csvContent;
    }

    if (activeTab === 'origens') {
      let csvContent = 'Origem;Leads Criados;Leads Concluidos Ganhos;Taxa Conversao;Receita Realizada (R$);Tiquete Medio (R$)\n';
      const originStats: Record<string, { count: number, won: number, lost: number, revenue: number }> = {
        'WhatsApp': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Instagram': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Indicação': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Google': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Site': { count: 0, won: 0, lost: 0, revenue: 0 },
        'Outros': { count: 0, won: 0, lost: 0, revenue: 0 }
      };
      (data.orcamentos || []).forEach((o: any) => {
        const orig = o.origem || 'Outros';
        const k = originStats[orig] ? orig : 'Outros';
        originStats[k].count++;
        if (o.subStatus === 'ACEITO' || o.sub_status === 'ACEITO') {
          originStats[k].won++;
          originStats[k].revenue += (o.valorViagem || o.valor_viagem || o.valorProposta || o.valor_proposta || 0);
        } else if (o.subStatus === 'DESISTENCIA' || o.sub_status === 'DESISTENCIA') {
          originStats[k].lost++;
        }
      });
      Object.entries(originStats).forEach(([orig, stats]) => {
        const totalFin = stats.won + stats.lost;
        const conv = totalFin > 0 ? Math.round((stats.won / totalFin) * 100) : 0;
        const avgTicket = stats.won > 0 ? Math.round(stats.revenue / stats.won) : 0;
        csvContent += `"${orig}";${stats.count};${stats.won};"${conv}%";${stats.revenue};${avgTicket}\n`;
      });
      return csvContent;
    }

    if (activeTab === 'gamificacao') {
      let csvContent = 'Posição;Consultor;Nível;Patente;XP Total;Conquistas\n';
      const consultoresParticipantes = ctx.consultores.filter(c => c.ativo !== false && c.participa_metricas !== false && c.participaMetricas !== false);
      const ranking = consultoresParticipantes.map((c: any) => {
        const xp = c.xp || 0;
        const prog = obterProgressoNivel(xp);
        const cBadges = (data.consultoresBadges || []).filter((b: any) => (b.profile_id || b.profileId) === c.id).map((b: any) => b.badge_key);
        return {
          ...c,
          xp,
          nivel: prog.nivel,
          prog,
          badgesCount: cBadges.length
        };
      });
      ranking.sort((a, b) => {
        if (b.nivel !== a.nivel) return b.nivel - a.nivel;
        return b.prog.xpAtual - a.prog.xpAtual;
      });
      ranking.forEach((c, index) => {
        csvContent += `${index + 1};"${c.nome}";${c.nivel};"${c.prog.patente}";${c.xp};${c.badgesCount}\n`;
      });
      return csvContent;
    }

    return null;
  }
}
