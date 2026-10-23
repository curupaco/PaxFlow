/**
 * RelatoriosOperacoesView.ts
 * Submódulo especializado em Relatórios de Operações & SLAs do PaxFlow:
 * 1. Embarques & Trechos de Voo (com controle preventivo de contato pré-embarque)
 * 2. SLAs de Prazos Operacionais
 * 3. Jornada de Pós-Venda e Validação Documental
 * 4. Pesquisa de Satisfação NPS (Mural, Indicadores e Ranking)
 */

import { ContatosEmbarqueService } from '../../../services/contatosEmbarqueService';
import { SatisfacaoService, FeedbackNpsItem } from '../../../services/satisfacaoService';
import { CommentsService } from '../../../services/comments';

export interface RelatoriosOperacoesContext {
  user: any;
  perfil: any;
  consultores: any[];
  viagens: any[];
  clientes: any[];
  orcamentos: any[];
  lembretes: any[];
  feedbacksNps: any[];
  tiposProduto: any[];
  dataInicio: string;
  dataFim: string;
  consultorIdFilter: string;
  filtroContatoEmbarque: 'todos' | 'feitos' | 'pendentes';
  satisfacaoFiltroCategoria: 'todos' | 'promotores' | 'neutros' | 'detratores' | 'com_comentario';
  satisfacaoBuscaTexto: string;
  showToast: (msg: string, type?: 'success' | 'error', err?: any) => void;
  openTravelModal: (tripId: string) => void;
  openCommentsModal: (tipo: 'viagem' | 'produto', entityId: string, tripId: string, titulo: string, label: string) => void;
  onRefreshData: () => Promise<void>;
  onStateChange: () => void;
  exportToCSV: () => void;
}

export class RelatoriosOperacoesView {

  // ==========================================
  // VIEW: 1. SLA & PRAZOS OPERACIONAIS
  // ==========================================
  public static renderPrazos(data: any): string {
    const totalAlertas = data.alertas?.length || 0;
    
    const vencidos = (data.alertas || []).filter((a: any) => {
      if (!a.eventDate) return false;
      const limite = new Date(a.eventDate);
      return limite < new Date() && !a.arquivado;
    }).length;

    const alertListHtml = (data.alertas || []).slice(0, 10).map((a: any) => `
      <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${a.title}</td>
        <td class="p-3">${a.consultorNome}</td>
        <td class="p-3">${a.dateStr}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
            vencidos > 0 
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' 
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
          }">
            ${vencidos > 0 ? 'Estourado' : 'Dentro do Prazo'}
          </span>
        </td>
      </tr>
    `).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>⏰ Painel de SLA, Prazos e Operações</span>
        </h2>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alertas Totais do Período</p>
            <p class="text-lg font-black text-indigo-600 mt-1">${totalAlertas}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prazos de SLA Estourados</p>
            <p class="text-lg font-black text-rose-600 mt-1">${vencidos}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2 md:col-span-1">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Segurança Operacional</p>
            <p class="text-lg font-black text-emerald-600 mt-1">${totalAlertas > 0 ? Math.round(((totalAlertas - vencidos) / totalAlertas) * 100) : 100}%</p>
          </div>
        </div>

        <!-- Timeline / Detailed report table -->
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Registros de Alertas Recentes</h3>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Alerta</th>
                  <th class="p-3">Consultor</th>
                  <th class="p-3">Data Limite</th>
                  <th class="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                ${alertListHtml || `
                  <tr>
                    <td colspan="4" class="p-6 text-center text-slate-400 font-extrabold">Nenhum alerta registrado neste período.</td>
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
  // VIEW: 2. JORNADA DE PÓS-VENDA E SLAS
  // ==========================================
  public static renderPosVenda(data: any, ctx: RelatoriosOperacoesContext): string {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limitePre = new Date();
    limitePre.setDate(hoje.getDate() + 15);
    limitePre.setHours(23, 59, 59, 999);

    const limitePos = new Date();
    limitePos.setDate(hoje.getDate() - 15);
    limitePos.setHours(0, 0, 0, 0);

    const preEmbarqueViagens: any[] = [];
    const emViagemViagens: any[] = [];
    const posViagemViagens: any[] = [];

    const docAlerts: { cliente: string; clienteTelefone?: string; destino: string; dataIda: string; tripId?: string; consultorNome?: string; motivo: string }[] = [];
    const posVendaPendente: { cliente: string; clienteTelefone?: string; destino: string; dataVolta: string; tripId?: string; consultor: string }[] = [];

    (data.viagens || []).forEach((v: any) => {
      if (v.status === 'cancelada') return;
      const dataIdaStr = v.data_ida || v.dataIda;
      const dataVoltaStr = v.data_volta || v.dataVolta;
      if (!dataIdaStr) return;

      const dIda = new Date(dataIdaStr + 'T00:00:00');
      const dVolta = dataVoltaStr ? new Date(dataVoltaStr + 'T23:59:59') : null;

      if (dIda >= hoje && dIda <= limitePre) {
        preEmbarqueViagens.push(v);
      } else if (dIda < hoje && dVolta && dVolta >= hoje) {
        emViagemViagens.push(v);
      } else if (dVolta && dVolta < hoje && dVolta >= limitePos) {
        posViagemViagens.push(v);
      }

      const passValidadeStr = v.cliente?.passaporteValidade || v.cliente?.passaporte_validade;
      const dataIdaParaDoc = new Date(dataIdaStr + 'T00:00:00');
      if (dataIdaParaDoc >= hoje && (dataIdaParaDoc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24) <= 90) {
        if (passValidadeStr) {
          const passVal = new Date(passValidadeStr + 'T00:00:00');
          const limitValid = new Date(dataIdaParaDoc);
          limitValid.setDate(limitValid.getDate() + 180);
          
          if (passVal < limitValid) {
            const diffDays = Math.round((passVal.getTime() - dataIdaParaDoc.getTime()) / (1000 * 60 * 60 * 24));
            docAlerts.push({
              cliente: v.cliente?.nome || 'Cliente não informado',
              clienteTelefone: v.cliente?.telefone || '',
              destino: v.destino,
              dataIda: dataIdaStr,
              tripId: v.id,
              consultorNome: ctx.consultores.find(c => c.id === (v.consultor_id || v.consultorId))?.nome || 'Consultor',
              motivo: `Passaporte expira em ${passValidadeStr.split('-').reverse().join('/')} (apenas ${diffDays} dias após embarque, exige-se 180 dias)`
            });
          }
        } else {
          const pais = (v.destino_ref?.pais || '').trim().toLowerCase();
          const isInternacional = pais && pais !== 'brasil' && pais !== 'brazil';
          if (isInternacional) {
            docAlerts.push({
              cliente: v.cliente?.nome || 'Cliente não informado',
              clienteTelefone: v.cliente?.telefone || '',
              destino: v.destino,
              dataIda: dataIdaStr,
              tripId: v.id,
              consultorNome: ctx.consultores.find(c => c.id === (v.consultor_id || v.consultorId))?.nome || 'Consultor',
              motivo: 'Viagem internacional pendente de passaporte cadastrado!'
            });
          }
        }
      }

      const isPosContatoDone = Boolean(
        v.pos_contato_concluido ||
        v.nps_respondido ||
        v.nps_nota !== undefined ||
        v.npsNota !== undefined ||
        v.status === 'concluida'
      );

      if (dVolta && dVolta < hoje && dVolta >= limitePos && v.status === 'pos_viagem' && !isPosContatoDone) {
        const cNome = ctx.consultores.find(c => c.id === (v.consultor_id || v.consultorId))?.nome || 'Não designado';
        posVendaPendente.push({
          cliente: v.cliente?.nome || 'Cliente não informado',
          clienteTelefone: v.cliente?.telefone || '',
          destino: v.destino,
          dataVolta: dataVoltaStr,
          tripId: v.id,
          consultor: cNome
        });
      }
    });

    const docAlertsHtml = docAlerts.map(a => `
      <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${a.cliente}</td>
        <td class="p-3">${a.destino}</td>
        <td class="p-3">${a.dataIda.split('-').reverse().join('/')}</td>
        <td class="p-3 font-bold text-rose-500">${a.motivo}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/30">
            Alerta Crítico
          </span>
        </td>
        <td class="p-3 text-center">
          <button class="btn-chat-digisac px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 text-[10px] font-black rounded-lg transition uppercase tracking-wider flex items-center gap-1 mx-auto cursor-pointer" data-cliente-nome="${a.cliente}" data-cliente-telefone="${a.clienteTelefone}" data-consultor-nome="${a.consultorNome}" data-trip-id="${a.tripId}" data-destino="${a.destino}" title="Abrir conversa no Digisac">
            💬 WhatsApp
          </button>
        </td>
      </tr>
    `).join('');

    const posVendaHtml = posVendaPendente.map(p => `
      <tr class="border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        <td class="p-3 font-extrabold text-slate-800 dark:text-slate-100">${p.cliente}</td>
        <td class="p-3">${p.destino}</td>
        <td class="p-3">${p.dataVolta.split('-').reverse().join('/')}</td>
        <td class="p-3 font-semibold">${p.consultor}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600 dark:bg-amber-950/30">
            Pós-Venda Pendente
          </span>
        </td>
        <td class="p-3 text-center">
          <button class="btn-chat-digisac px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 text-[10px] font-black rounded-lg transition uppercase tracking-wider flex items-center gap-1 mx-auto cursor-pointer" data-cliente-nome="${p.cliente}" data-cliente-telefone="${p.clienteTelefone}" data-consultor-nome="${p.consultor}" data-trip-id="${p.tripId}" data-destino="${p.destino}" title="Abrir conversa no Digisac">
            💬 WhatsApp
          </button>
        </td>
      </tr>
    `).join('');

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>✈️ Controle de SLAs e Jornada de Pós-Venda</span>
        </h2>
        
        <!-- Metric Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center border-l-4 border-l-amber-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pré-Embarque (Próximos 15 dias)</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${preEmbarqueViagens.length} passageiros</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center border-l-4 border-l-indigo-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Em Viagem (Acompanhamento Ativo)</p>
            <p class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">${emViagemViagens.length} passageiros</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center border-l-4 border-l-emerald-500">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Retornados (Últimos 15 dias)</p>
            <p class="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">${posViagemViagens.length} passageiros</p>
          </div>
        </div>

        <!-- Section: Document Validation Alerts -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Validação de Documentos de Embarque Iminente (90 dias)</h3>
            <span class="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-lg text-[10px] font-black">${docAlerts.length} inconsistências</span>
          </div>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Destino</th>
                  <th class="p-3">Data Ida</th>
                  <th class="p-3">Problema de SLA Documental</th>
                  <th class="p-3 text-center">Risco</th>
                  <th class="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${docAlertsHtml || `
                  <tr>
                    <td colspan="6" class="p-6 text-center text-slate-400 font-extrabold">🎉 Nenhum problema de SLA documental detectado para os próximos embarques.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section: Post-sales SLA Alerts -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Fila de Contatos de Pós-Venda Pendentes (Retornos Recentes)</h3>
            <span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 rounded-lg text-[10px] font-black">${posVendaPendente.length} pendentes</span>
          </div>
          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Destino</th>
                  <th class="p-3">Data Retorno</th>
                  <th class="p-3">Consultor Responsável</th>
                  <th class="p-3 text-center">Status SLA</th>
                  <th class="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${posVendaHtml || `
                  <tr>
                    <td colspan="6" class="p-6 text-center text-slate-400 font-extrabold">🎉 Todos os clientes retornados no período já receberam atendimento de pós-venda.</td>
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
  // VIEW: 3. ⭐ PESQUISA DE SATISFAÇÃO (NPS)
  // ==========================================
  public static renderSatisfacao(data: any, ctx: RelatoriosOperacoesContext): string {
    const isAdmin = (ctx.perfil?.role || '').toLowerCase() === 'admin';
    const effectiveConsultorId = isAdmin ? ctx.consultorIdFilter : (ctx.user?.id || '');

    const rawFeedbacks = ctx.feedbacksNps || [];
    const feedbacksItem: FeedbackNpsItem[] = rawFeedbacks.map(f => {
      const v = ctx.viagens.find(via => via.id === f.viagem_id);
      const cli = ctx.clientes.find(c => c.id === f.cliente_id) || (v ? v.cliente : undefined);
      const cons = ctx.consultores.find(c => c.id === (f.consultor_id || v?.consultor_id));

      return {
        id: f.id,
        viagem_id: f.viagem_id,
        cliente_id: f.cliente_id,
        consultor_id: f.consultor_id || v?.consultor_id,
        nps_rating: f.nps_rating !== undefined ? Number(f.nps_rating) : (f.nota !== undefined ? Number(f.nota) : 0),
        comentarios: f.comentarios || f.comentario || '',
        created_at: f.created_at || new Date().toISOString(),
        cliente: {
          id: cli?.id,
          nome: cli?.nome || v?.cliente_nome || 'Cliente',
          email: cli?.email || v?.cliente_email,
          telefone: cli?.telefone || v?.cliente_telefone
        },
        viagem: {
          id: v?.id,
          destino: v?.destino || 'Destino Não Informado',
          data_viagem: v?.data_ida || v?.dataIda,
          data_retorno: v?.data_volta || v?.dataVolta,
          consultor_id: v?.consultor_id || v?.consultorId
        },
        consultor: {
          id: cons?.id,
          nome: cons?.nome || v?.consultor_nome || 'Consultor',
          avatar_url: cons?.avatar_url || cons?.avatarUrl
        }
      };
    });

    const feedbacksFiltrados = SatisfacaoService.filtrarFeedbacks(feedbacksItem, {
      dataInicio: ctx.dataInicio,
      dataFim: ctx.dataFim,
      consultorId: effectiveConsultorId,
      categoria: ctx.satisfacaoFiltroCategoria,
      buscaTexto: ctx.satisfacaoBuscaTexto
    });

    const metricas = SatisfacaoService.calcularMetricas(feedbacksFiltrados);
    const rankingConsultores = SatisfacaoService.calcularPorConsultor(feedbacksFiltrados, ctx.consultores);

    let zonaBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (metricas.zona === 'excelencia') zonaBadgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
    else if (metricas.zona === 'qualidade') zonaBadgeClass = 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60';
    else if (metricas.zona === 'aperfeicoamento') zonaBadgeClass = 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60';
    else if (metricas.zona === 'critica') zonaBadgeClass = 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60';

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width animate-fadeIn">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div class="space-y-1">
            <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>⭐ Relatório de Pesquisa de Satisfação (NPS)</span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${zonaBadgeClass}">
                ${metricas.zonaDescricao}
              </span>
            </h2>
            <p class="text-xs text-slate-400 font-semibold max-w-2xl">
              Monitore a percepção e lealdade dos passageiros pós-viagem através da métrica Net Promoter Score e feedbacks qualitativos.
            </p>
          </div>
          <button id="btn-exportar-nps-csv" type="button" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 uppercase tracking-wider shrink-0 cursor-pointer">
            <span>📊</span> Exportar CSV
          </button>
        </div>

        <!-- Cards de Indicadores do NPS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Net Promoter Score (NPS)</span>
            <div class="text-3xl font-black mt-2 ${metricas.npsScore >= 50 ? 'text-emerald-600 dark:text-emerald-400' : (metricas.npsScore >= 0 ? 'text-amber-500' : 'text-rose-500')}">
              ${metricas.npsScore > 0 ? `+${metricas.npsScore}` : metricas.npsScore}
            </div>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-[10px] text-slate-400 font-bold">Média: <strong class="text-slate-700 dark:text-slate-200">${metricas.mediaNota} / 10</strong></span>
              <span class="text-[10px] text-slate-400 font-semibold">(${metricas.total} avaliações)</span>
            </div>
          </div>

          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between border-l-4 border-l-emerald-500">
            <span class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Promotores (9 - 10) 🟢</span>
            <div class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
              ${metricas.promotores} <span class="text-xs text-slate-400 font-normal">(${metricas.percPromotores}%)</span>
            </div>
            <span class="text-[10px] text-slate-400 font-semibold mt-1">Clientes fiéis e defensores da marca</span>
          </div>

          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between border-l-4 border-l-amber-500">
            <span class="text-[10px] font-black text-amber-500 uppercase tracking-wider">Neutros (7 - 8) 🟡</span>
            <div class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
              ${metricas.neutros} <span class="text-xs text-slate-400 font-normal">(${metricas.percNeutros}%)</span>
            </div>
            <span class="text-[10px] text-slate-400 font-semibold mt-1">Satisfeitos, porém vulneráveis</span>
          </div>

          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between border-l-4 border-l-rose-500">
            <span class="text-[10px] font-black text-rose-500 uppercase tracking-wider">Detratores (0 - 6) 🔴</span>
            <div class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
              ${metricas.detratores} <span class="text-xs text-slate-400 font-normal">(${metricas.percDetratores}%)</span>
            </div>
            <span class="text-[10px] text-slate-400 font-semibold mt-1">Insatisfeitos que exigem atenção</span>
          </div>
        </div>

        <!-- Barra de Filtros Internos da Pesquisa -->
        <div class="bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button type="button" class="btn-nps-categoria px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${ctx.satisfacaoFiltroCategoria === 'todos' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'}" data-categoria="todos">
              Todos (${feedbacksItem.length})
            </button>
            <button type="button" class="btn-nps-categoria px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${ctx.satisfacaoFiltroCategoria === 'promotores' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50'}" data-categoria="promotores">
              🟢 Promotores
            </button>
            <button type="button" class="btn-nps-categoria px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${ctx.satisfacaoFiltroCategoria === 'neutros' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50'}" data-categoria="neutros">
              🟡 Neutros
            </button>
            <button type="button" class="btn-nps-categoria px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${ctx.satisfacaoFiltroCategoria === 'detratores' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50'}" data-categoria="detratores">
              🔴 Detratores
            </button>
            <button type="button" class="btn-nps-categoria px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${ctx.satisfacaoFiltroCategoria === 'com_comentario' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50'}" data-categoria="com_comentario">
              💬 Com Depoimento (${metricas.totalComComentarios})
            </button>
          </div>

          <!-- Busca Textual -->
          <div class="relative w-full sm:w-72">
            <input id="input-nps-busca" type="text" placeholder="Buscar por cliente, destino ou texto..." value="${ctx.satisfacaoBuscaTexto}" class="w-full text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span class="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        <!-- Seção: Desempenho e Ranking NPS por Consultor -->
        ${isAdmin ? `
          <div class="space-y-3">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Ranking de Satisfação por Consultor</h3>
            <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
              <table class="w-full text-left border-collapse text-xs font-semibold">
                <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                  <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                    <th class="p-3 text-center w-12">Posição</th>
                    <th class="p-3">Consultor</th>
                    <th class="p-3 text-center">Score NPS</th>
                    <th class="p-3 text-center">Média de Nota</th>
                    <th class="p-3 text-center">Promotores</th>
                    <th class="p-3 text-center">Detratores</th>
                    <th class="p-3 text-center">Total de Avaliações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                  ${rankingConsultores.length === 0 ? `
                    <tr>
                      <td colspan="7" class="p-6 text-center text-slate-400 font-bold">Nenhum feedback registrado para os consultores no período selecionado.</td>
                    </tr>
                  ` : rankingConsultores.map((r, idx) => `
                    <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td class="p-3 text-center font-black ${idx === 0 ? 'text-amber-500 text-sm' : 'text-slate-400'}">${idx === 0 ? '👑 #1' : `#${idx + 1}`}</td>
                      <td class="p-3">
                        <div class="flex items-center gap-2">
                          <span class="font-extrabold text-slate-800 dark:text-slate-100">${r.consultorNome}</span>
                        </div>
                      </td>
                      <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded-lg text-xs font-black ${r.npsScore >= 50 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : (r.npsScore >= 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400')}">
                          ${r.npsScore > 0 ? `+${r.npsScore}` : r.npsScore}
                        </span>
                      </td>
                      <td class="p-3 text-center font-bold text-slate-700 dark:text-slate-200">${r.mediaNota} / 10</td>
                      <td class="p-3 text-center text-emerald-600 font-extrabold">🟢 ${r.promotores}</td>
                      <td class="p-3 text-center text-rose-600 font-extrabold">🔴 ${r.detratores}</td>
                      <td class="p-3 text-center font-bold text-slate-500">${r.totalFeedbacks}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- Seção: Mural Detalhado de Feedbacks Recebidos -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Depoimentos & Notas Recebidas (${feedbacksFiltrados.length})</h3>
          </div>

          <div class="overflow-x-auto overflow-y-auto max-h-[600px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
            <table class="w-full text-left border-collapse text-xs font-semibold min-w-[900px]">
              <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                  <th class="p-3 text-center w-20">Nota</th>
                  <th class="p-3">Passageiro</th>
                  <th class="p-3">Destino</th>
                  <th class="p-3">Consultor</th>
                  <th class="p-3">Depoimento / Comentário</th>
                  <th class="p-3 text-center">Data</th>
                  <th class="p-3 text-center sticky right-0 bg-slate-50 dark:bg-slate-950 shadow-[-6px_0_10px_-2px_rgba(0,0,0,0.06)] min-w-[130px]">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                ${feedbacksFiltrados.length === 0 ? `
                  <tr>
                    <td colspan="7" class="p-8 text-center text-slate-400 font-bold">
                      Nenhuma resposta de pesquisa de satisfação encontrada para os filtros aplicados.
                    </td>
                  </tr>
                ` : feedbacksFiltrados.map(f => {
                  const classificacao = SatisfacaoService.classificarNps(f.nps_rating);
                  const dataFormatada = f.created_at ? f.created_at.slice(0, 10).split('-').reverse().join('/') : '-';

                  return `
                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td class="p-3 text-center align-top">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border ${classificacao.badgeClass}">
                          <span>${classificacao.emoji}</span> ${f.nps_rating}
                        </span>
                      </td>
                      <td class="p-3 align-top">
                        <p class="font-extrabold text-slate-800 dark:text-slate-100 truncate">${f.cliente?.nome || 'Cliente'}</p>
                        <p class="text-[11px] text-slate-400 font-semibold truncate">${f.cliente?.telefone || f.cliente?.email || ''}</p>
                      </td>
                      <td class="p-3 align-top font-bold text-slate-700 dark:text-slate-200">
                        ${f.viagem?.destino || 'Viagem'}
                      </td>
                      <td class="p-3 align-top text-slate-600 dark:text-slate-300 font-semibold">
                        ${f.consultor?.nome || 'Consultor'}
                      </td>
                      <td class="p-3 align-top max-w-[320px]">
                        ${f.comentarios && f.comentarios.trim() ? `
                          <p class="text-xs text-slate-700 dark:text-slate-200 italic font-medium leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                            "${f.comentarios}"
                          </p>
                        ` : `
                          <span class="text-slate-300 dark:text-slate-600 text-xs italic">Sem comentário adicional</span>
                        `}
                      </td>
                      <td class="p-3 text-center align-top text-slate-400 font-semibold whitespace-nowrap">
                        ${dataFormatada}
                      </td>
                      <td class="p-3 text-center align-top sticky right-0 bg-white dark:bg-slate-900 shadow-[-6px_0_10px_-2px_rgba(0,0,0,0.06)] whitespace-nowrap">
                        <button class="btn-chat-digisac px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 text-[10px] font-black rounded-lg transition uppercase tracking-wider flex items-center justify-center gap-1 mx-auto shadow-xs cursor-pointer" data-cliente-nome="${f.cliente?.nome || ''}" data-cliente-telefone="${f.cliente?.telefone || ''}" data-consultor-nome="${f.consultor?.nome || ''}" data-destino="${f.viagem?.destino || ''}" title="Abrir conversa no Digisac">
                          <span>💬</span> Digisac
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
  // VIEW: 4. RELATÓRIO DE EMBARQUE E TRECHOS
  // ==========================================
  public static renderEmbarques(data: any, ctx: RelatoriosOperacoesContext): string {
    const start = ctx.dataInicio;
    const end = ctx.dataFim;
    const filterConsultorId = ctx.consultorIdFilter;

    const list: any[] = [];

    const formatarDataBr = (dStr: string): string => {
      if (!dStr) return '';
      const parts = dStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dStr;
    };

    ctx.viagens.forEach((v: any) => {
      if (filterConsultorId !== 'todos' && String(v.consultor_id) !== String(filterConsultorId)) {
        return;
      }

      const clientName = v.cliente?.nome || 'Passageiro';
      const clientPhone = v.cliente?.telefone || '';
      const consultorObj = ctx.consultores.find(c => c.id === v.consultor_id);
      const consultorName = consultorObj?.nome || 'Consultor';
      const consultorAvatar = consultorObj?.avatar_url || consultorObj?.avatar || '';
      const contatosViagem = ContatosEmbarqueService.extrairContatos(v);
      const embarquesConsolidados = ContatosEmbarqueService.obterEmbarquesViagem(v);

      const orcamentoId = v.orcamento_id || ctx.orcamentos.find(o => (o.cliente_id && o.cliente_id === v.cliente_id) || (o.clienteId && o.clienteId === v.cliente_id))?.id || '';

      embarquesConsolidados.forEach((emb) => {
        if (emb.dataStr && emb.dataStr >= start && emb.dataStr <= end) {
          const hasAlert = ctx.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === emb.dataStr);
          const contatoRegistro = contatosViagem[emb.chave];
          const contatoFeito = Boolean(contatoRegistro?.feito);
          const validadoGestor = Boolean(contatoRegistro?.validado_gestor);
          const validadoGestorEm = contatoRegistro?.validado_gestor_em;
          const gestorNome = contatoRegistro?.gestor_nome;

          list.push({
            data: emb.dataStr,
            cliente: clientName,
            clienteTelefone: clientPhone,
            destino: emb.destino,
            tipo: emb.tipoDesc,
            loc: emb.loc,
            consultor: consultorName,
            consultorAvatar,
            hasAlert,
            tripId: v.id,
            orcamentoId,
            productId: emb.productId || '',
            tipoEmbarque: emb.tipo,
            trechoKey: emb.chave,
            contatoRegistro,
            contatoFeito,
            validadoGestor,
            validadoGestorEm,
            gestorNome
          });
        }
      });
    });

    list.sort((a, b) => a.data.localeCompare(b.data));

    let filteredList = list;
    if (ctx.filtroContatoEmbarque === 'feitos') {
      filteredList = list.filter(item => item.contatoFeito);
    } else if (ctx.filtroContatoEmbarque === 'pendentes') {
      filteredList = list.filter(item => !item.contatoFeito);
    }

    const limparTrecho = (tipo: string): string => {
      if (!tipo) return '';
      return tipo
        .replace(/\s+da\s+viagem/gi, '')
        .replace(/\s+de\s+viagem/gi, '')
        .trim();
    };

    const rowsHtml = filteredList.map((item) => {
      let contatoBadge = '';
      if (item.contatoFeito) {
        const dHora = item.contatoRegistro?.data_contato 
          ? new Date(item.contatoRegistro.data_contato).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
          : '';
        const quem = item.contatoRegistro?.consultor_nome || 'Consultor';
        const tooltip = `Contato realizado por ${quem} em ${dHora}. Clique para desmarcar se necessário.`;

        contatoBadge = `
          <button class="btn-toggle-contato px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 mx-auto shadow-xs cursor-pointer" 
            data-trip-id="${item.tripId}" 
            data-trecho-key="${item.trechoKey}" 
            title="${tooltip}">
            <svg class="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>Feito</span>
          </button>
        `;
      } else {
        contatoBadge = `
          <button class="btn-toggle-contato px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 mx-auto shadow-xs cursor-pointer" 
            data-trip-id="${item.tripId}" 
            data-trecho-key="${item.trechoKey}" 
            title="Contato pré-embarque pendente. Clique para marcar como realizado.">
            <svg class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Pendente</span>
          </button>
        `;
      }

      const detalhesBtn = `
        <button class="btn-detalhes-viagem w-7 h-7 shrink-0 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 rounded-lg transition flex items-center justify-center shadow-xs cursor-pointer" data-trip-id="${item.tripId}" title="Ver detalhes da venda">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      `;

      const orcamentoBtn = item.orcamentoId ? `
        <button class="btn-ir-orcamento w-7 h-7 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-lg transition flex items-center justify-center shadow-xs cursor-pointer" data-orcamento-id="${item.orcamentoId}" title="Ir direto para o Orçamento">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </button>
      ` : '';

      const whatsAppBtn = `
        <button class="btn-chat-digisac w-7 h-7 shrink-0 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg transition flex items-center justify-center shadow-xs cursor-pointer" data-cliente-nome="${item.cliente}" data-cliente-telefone="${item.clienteTelefone}" data-consultor-nome="${item.consultor}" data-trip-id="${item.tripId}" data-destino="${item.destino}" data-loc="${item.loc}" title="Abrir conversa no Digisac (${item.cliente})">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.84-.84c.148-.795.34-1.57.574-2.316C3.96 16.335 3 14.28 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </button>
      `;

      const trechoDesc = limparTrecho(item.tipo);
      const primeiroNomeConsultor = (item.consultor || 'Consultor').trim().split(' ')[0];

      return `
        <tr class="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-300 transition-colors">
          <td class="p-2.5 font-extrabold text-slate-800 dark:text-slate-100 whitespace-nowrap w-24">${formatarDataBr(item.data)}</td>
          <td class="p-2.5">
            <div class="flex items-center gap-1.5">
              <button class="btn-detalhes-viagem text-left font-extrabold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer truncate max-w-[200px]" data-trip-id="${item.tripId}" title="Ver detalhes de ${item.cliente}">
                ${item.cliente}
              </button>
              ${item.hasAlert ? `
                <button class="btn-alerta-viagem inline-flex items-center justify-center text-xs shrink-0 cursor-pointer hover:scale-110 transition active:scale-95" data-trip-id="${item.tripId}" data-product-id="${item.productId}" data-type="${item.tipoEmbarque}" title="Alerta programado ativo! Clique para visualizar">
                  🚨
                </button>
              ` : ''}
            </div>
          </td>
          <td class="p-2.5">
            <button class="btn-detalhes-viagem text-left font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer block truncate max-w-[220px]" data-trip-id="${item.tripId}" title="Ver detalhes da viagem: ${item.destino}">
              ${item.destino}
            </button>
            ${trechoDesc ? `<span class="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">${trechoDesc}</span>` : ''}
          </td>
          <td class="p-2.5 whitespace-nowrap text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            ${item.loc || '<span class="text-slate-300 dark:text-slate-600 font-normal italic">N/I</span>'}
          </td>
          <td class="p-2.5 whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-200" title="Consultor: ${item.consultor}">
            ${primeiroNomeConsultor}
          </td>
          <td class="p-2.5 text-center whitespace-nowrap w-28">${contatoBadge}</td>
          <td class="p-2.5 text-center whitespace-nowrap w-28">
            <div class="flex items-center justify-center gap-1">
              ${detalhesBtn}
              ${orcamentoBtn}
              ${whatsAppBtn}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const colunasTotais = 7;

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 print-full-width">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
          <div>
            <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>✈️ Relatório de Embarque e Trechos de Voo</span>
            </h2>
            <p class="text-xs text-slate-400 font-semibold mt-0.5">Controle preventivo e auditoria de contatos pré-embarque.</p>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-xl">
              <label for="filtro-contato-embarque" class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filtrar Contato:</label>
              <select id="filtro-contato-embarque" class="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer">
                <option value="todos" class="bg-white dark:bg-slate-900" ${ctx.filtroContatoEmbarque === 'todos' ? 'selected' : ''}>Todos os Embarques</option>
                <option value="feitos" class="bg-white dark:bg-slate-900" ${ctx.filtroContatoEmbarque === 'feitos' ? 'selected' : ''}>✅ Contato Feito</option>
                <option value="pendentes" class="bg-white dark:bg-slate-900" ${ctx.filtroContatoEmbarque === 'pendentes' ? 'selected' : ''}>⏳ Contato Pendente</option>
              </select>
            </div>
            <span class="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider">${filteredList.length} de ${list.length} embarques</span>
          </div>
        </div>

        <!-- Embarques Table com cabeçalho congelado e rolagem defensiva -->
        <div class="overflow-x-auto overflow-y-auto max-h-[650px] scroll-indicator-fade custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl relative">
          <table class="w-full text-left border-collapse text-xs font-semibold min-w-[760px]">
            <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
              <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[9px] tracking-widest font-black">
                <th class="p-2.5 whitespace-nowrap w-24">Data</th>
                <th class="p-2.5">Passageiro</th>
                <th class="p-2.5">Destino &amp; Trecho</th>
                <th class="p-2.5 whitespace-nowrap">Código (LOC)</th>
                <th class="p-2.5 whitespace-nowrap">Consultor</th>
                <th class="p-2.5 text-center whitespace-nowrap w-28">Contato</th>
                <th class="p-2.5 text-center whitespace-nowrap w-28">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `
                <tr>
                  <td colspan="${colunasTotais}" class="p-8 text-center text-slate-400 font-extrabold italic">🎉 Nenhum embarque ou trecho de voo programado para o período ou filtro selecionado.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // ATTACH LISTENERS ESPECÍFICOS DAS 4 ABAS
  // ==========================================
  public static attachEvents(activeTab: string, ctx: RelatoriosOperacoesContext): void {
    if (activeTab === 'embarques') {
      // Filtro de Contato Pré-Embarque
      const selectFiltroContato = document.getElementById('filtro-contato-embarque') as HTMLSelectElement;
      if (selectFiltroContato) {
        selectFiltroContato.addEventListener('change', () => {
          ctx.filtroContatoEmbarque = (selectFiltroContato.value as any) || 'todos';
          ctx.onStateChange();
        });
      }

      // Alternância de Contato Feito / Pendente
      document.querySelectorAll('.btn-toggle-contato').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const tripId = btn.getAttribute('data-trip-id');
          const trechoKey = btn.getAttribute('data-trecho-key');
          if (!tripId || !trechoKey) return;

          const viagem = ctx.viagens.find(v => v.id === tripId);
          if (!viagem) return;

          const contatos = { ...ContatosEmbarqueService.extrairContatos(viagem) };
          const jaFeito = Boolean(contatos[trechoKey]?.feito);
          const novoStatus = !jaFeito;

          if (novoStatus) {
            contatos[trechoKey] = {
              feito: true,
              data_contato: new Date().toISOString(),
              consultor_id: ctx.user?.id || '',
              consultor_nome: ctx.perfil?.nome || ctx.user?.email || 'Consultor'
            };
          } else {
            contatos[trechoKey] = {
              feito: false,
              data_contato: undefined,
              consultor_id: undefined,
              consultor_nome: undefined
            };
          }

          try {
            await ContatosEmbarqueService.salvarContatos(tripId, contatos);

            viagem.contatos_embarque = contatos;
            ctx.showToast(
              novoStatus 
                ? 'Contato de pré-embarque marcado como concluído!' 
                : 'Marcação de contato desfeita.', 
              'success'
            );

            ctx.onStateChange();
          } catch (err: any) {
            console.error('Erro ao atualizar contato de pré-embarque:', err);
            ctx.showToast('Erro ao salvar marcação de contato no banco de dados.', 'error');
          }
        });
      });

      // Detalhes da Viagem
      document.querySelectorAll('.btn-detalhes-viagem').forEach(btn => {
        btn.addEventListener('click', () => {
          const tripId = btn.getAttribute('data-trip-id');
          if (tripId) {
            ctx.openTravelModal(tripId);
          }
        });
      });

      // Lembrete/Alerta da Viagem ou Produto
      document.querySelectorAll('.btn-alerta-viagem').forEach(btn => {
        btn.addEventListener('click', () => {
          const tripId = btn.getAttribute('data-trip-id');
          const productId = btn.getAttribute('data-product-id');
          if (tripId) {
            if (productId) {
              const viagem = ctx.viagens.find(v => v.id === tripId);
              const product = viagem?.produtos?.find((p: any) => p.id === productId);
              if (product) {
                const prodName = `${product.fornecedor || 'Aéreo'} - ${product.descricao || 'Voo'}`;
                ctx.openCommentsModal('produto', productId, tripId, '📦 Notas do Produto', prodName);
              } else {
                ctx.showToast('Erro ao carregar dados do produto para anotações.', 'error');
              }
            } else {
              const viagem = ctx.viagens.find(v => v.id === tripId);
              if (viagem) {
                const tripLabel = `${viagem.cliente?.nome || 'Passageiro'} - ${viagem.destino}`;
                ctx.openCommentsModal('viagem', tripId, tripId, '✈️ Notas da Viagem', tripLabel);
              }
            }
          }
        });
      });

      // Alternância de Validação de Embarque pelo Gestor (Apenas Administradores)
      document.querySelectorAll('.btn-toggle-validacao-gestor').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if ((ctx.perfil?.role || '').toLowerCase() !== 'admin') {
            ctx.showToast('Apenas administradores podem validar conferências de embarque.', 'error');
            return;
          }

          const tripId = btn.getAttribute('data-trip-id');
          const trechoKey = btn.getAttribute('data-trecho-key');
          if (!tripId || !trechoKey) return;

          const viagem = ctx.viagens.find(v => v.id === tripId);
          if (!viagem) return;

          const contatos = ContatosEmbarqueService.extrairContatos(viagem);
          const jaValidado = Boolean(contatos[trechoKey]?.validado_gestor);
          const novoStatus = !jaValidado;
          const gestorId = ctx.user?.id || '';
          const gestorNome = ctx.perfil?.nome || ctx.user?.email || 'Gestor';

          try {
            const res = await ContatosEmbarqueService.alternarValidacaoGestor(
              viagem,
              trechoKey,
              gestorId,
              gestorNome,
              novoStatus
            );

            viagem.contatos_embarque = res.contatosAtualizados;
            if (!viagem.contatos_embarque) viagem.contatos_embarque = {};
            if (!viagem.contatos_embarque[trechoKey]) {
              viagem.contatos_embarque[trechoKey] = { feito: false };
            }
            viagem.contatos_embarque[trechoKey].validado_gestor = novoStatus;
            viagem.contatos_embarque[trechoKey].validado_gestor_em = novoStatus ? new Date().toISOString() : undefined;
            viagem.contatos_embarque[trechoKey].gestor_id = novoStatus ? gestorId : undefined;
            viagem.contatos_embarque[trechoKey].gestor_nome = novoStatus ? gestorNome : undefined;

            ctx.showToast(
              novoStatus 
                ? 'Embarque validado pelo gestor com sucesso!' 
                : 'Validação de gestor removida.', 
              'success'
            );

            ctx.onStateChange();
          } catch (err: any) {
            console.error('Erro ao alternar validação de gestor:', err);
            ctx.showToast('Erro ao salvar validação no banco de dados.', 'error');
          }
        });
      });
    }

    if (activeTab === 'satisfacao') {
      // Alternar Categoria NPS
      document.querySelectorAll('.btn-nps-categoria').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.getAttribute('data-categoria') as any;
          if (cat) {
            ctx.satisfacaoFiltroCategoria = cat;
            ctx.onStateChange();
          }
        });
      });

      // Busca Textual
      const inputBusca = document.getElementById('input-nps-busca') as HTMLInputElement;
      if (inputBusca) {
        inputBusca.addEventListener('input', (e: any) => {
          ctx.satisfacaoBuscaTexto = e.target.value;
          ctx.onStateChange();
        });
      }

      // Exportar CSV de NPS
      document.getElementById('btn-exportar-nps-csv')?.addEventListener('click', () => {
        ctx.exportToCSV();
      });
    }
  }

  // ==========================================
  // EXPORTAÇÃO CSV ESPECÍFICA DAS 4 ABAS
  // ==========================================
  public static appendCsvContent(activeTab: string, data: any, ctx: RelatoriosOperacoesContext): string | null {
    if (activeTab === 'prazos') {
      let csvContent = 'Alerta;Consultor;Data Evento;Status\n';
      (data.alertas || []).forEach((a: any) => {
        csvContent += `"${a.title}";"${a.consultorNome}";"${a.dateStr}";"${a.arquivado ? 'Arquivado' : 'Ativo'}"\n`;
      });
      return csvContent;
    }

    if (activeTab === 'posvenda') {
      let csvContent = 'Categoria;Cliente;Destino;Data Evento;Detalhes\n';
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limitePre = new Date();
      limitePre.setDate(hoje.getDate() + 15);
      const limitePos = new Date();
      limitePos.setDate(hoje.getDate() - 15);

      (data.viagens || []).forEach((v: any) => {
        if (v.status === 'cancelada') return;
        const dataIdaStr = v.data_ida || v.dataIda;
        const dataVoltaStr = v.data_volta || v.dataVolta;
        if (!dataIdaStr) return;

        const dIda = new Date(dataIdaStr + 'T00:00:00');
        const dVolta = dataVoltaStr ? new Date(dataVoltaStr + 'T23:59:59') : null;
        const clienteNome = v.cliente?.nome || 'Cliente não informado';

        if (dIda >= hoje && dIda <= limitePre) {
          csvContent += `"Pré-Embarque";"${clienteNome}";"${v.destino}";"${dataIdaStr}";"Embarque em breve"\n`;
        } else if (dIda < hoje && dVolta && dVolta >= hoje) {
          csvContent += `"Em Viagem";"${clienteNome}";"${v.destino}";"${dataIdaStr} a ${dataVoltaStr}";"Acompanhamento ativo"\n`;
        } else if (dVolta && dVolta < hoje && dVolta >= limitePos) {
          csvContent += `"Pós-Viagem";"${clienteNome}";"${v.destino}";"${dataVoltaStr}";"Retorno recente"\n`;
        }

        const passValidadeStr = v.cliente?.passaporteValidade || v.cliente?.passaporte_validade;
        if (dIda >= hoje && (dIda.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24) <= 90) {
          if (passValidadeStr) {
            const passVal = new Date(passValidadeStr + 'T00:00:00');
            const limitValid = new Date(dIda);
            limitValid.setDate(limitValid.getDate() + 180);
            if (passVal < limitValid) {
              csvContent += `"Alerta Passaporte";"${clienteNome}";"${v.destino}";"${passValidadeStr}";"Expira em breve após embarque"\n`;
            }
          } else {
            const pais = (v.destino_ref?.pais || '').trim().toLowerCase();
            const isInternacional = pais && pais !== 'brasil' && pais !== 'brazil';
            if (isInternacional) {
              csvContent += `"Alerta Passaporte";"${clienteNome}";"${v.destino}";"-";"Viagem internacional sem passaporte cadastrado"\n`;
            }
          }
        }

        const isPosContatoDone = Boolean(
          v.pos_contato_concluido ||
          v.nps_respondido ||
          v.nps_nota !== undefined ||
          v.npsNota !== undefined ||
          v.status === 'concluida'
        );

        if (dVolta && dVolta < hoje && dVolta >= limitePos && v.status === 'pos_viagem' && !isPosContatoDone) {
          csvContent += `"Pós-Venda Pendente";"${clienteNome}";"${v.destino}";"${dataVoltaStr}";"Retornou em pos_viagem"\n`;
        }
      });
      return csvContent;
    }

    if (activeTab === 'embarques') {
      let csvContent = 'Data de Embarque;Cliente/Passageiro;Telefone;Destino;Trecho/Tipo;Código (LOC);Consultor;Tem Alerta;Contato Pré-Embarque\n';
      const start = ctx.dataInicio;
      const end = ctx.dataFim;
      
      const list: any[] = [];
      ctx.viagens.forEach((v: any) => {
        const clientName = v.cliente?.nome || 'Passageiro';
        const clientPhone = v.cliente?.telefone || '';
        const consultorName = ctx.consultores.find(c => c.id === v.consultor_id)?.nome || 'Consultor';
        const contatosViagem = ContatosEmbarqueService.extrairContatos(v);
        const embarquesConsolidados = ContatosEmbarqueService.obterEmbarquesViagem(v);

        embarquesConsolidados.forEach((emb) => {
          if (emb.dataStr && emb.dataStr >= start && emb.dataStr <= end) {
            const hasAlert = ctx.lembretes.some((l: any) => l.viagem_id === v.id && l.data_lembrete === emb.dataStr);
            const contatoRegistro = contatosViagem[emb.chave];
            const contatoFeito = Boolean(contatoRegistro?.feito);

            list.push({
              data: emb.dataStr,
              cliente: clientName,
              telefone: clientPhone,
              destino: emb.destino,
              tipo: emb.tipoDesc,
              loc: emb.loc,
              consultor: consultorName,
              hasAlert,
              contatoFeito
            });
          }
        });
      });

      list.sort((a, b) => a.data.localeCompare(b.data));

      list.forEach((item: any) => {
        const dateFormatted = item.data.split('-').reverse().join('/');
        csvContent += `"${dateFormatted}";"${item.cliente}";"${item.telefone}";"${item.destino}";"${item.tipo}";"${item.loc}";"${item.consultor}";"${item.hasAlert ? 'Sim' : 'Não'}";"${item.contatoFeito ? 'Feito' : 'Pendente'}"\n`;
      });
      return csvContent;
    }

    if (activeTab === 'satisfacao') {
      let csvContent = 'Nota;Categoria;Passageiro;Telefone;Destino;Consultor;Depoimento;Data\n';
      const rawFeedbacks = ctx.feedbacksNps || [];
      const feedbacksItem: FeedbackNpsItem[] = rawFeedbacks.map(f => {
        const v = ctx.viagens.find(via => via.id === f.viagem_id);
        const cli = ctx.clientes.find(c => c.id === f.cliente_id) || (v ? v.cliente : undefined);
        const cons = ctx.consultores.find(c => c.id === (f.consultor_id || v?.consultor_id));
        return {
          id: f.id,
          viagem_id: f.viagem_id,
          cliente_id: f.cliente_id,
          consultor_id: f.consultor_id || v?.consultor_id,
          nps_rating: f.nps_rating !== undefined ? Number(f.nps_rating) : (f.nota !== undefined ? Number(f.nota) : 0),
          comentarios: f.comentarios || f.comentario || '',
          created_at: f.created_at || new Date().toISOString(),
          cliente: {
            id: cli?.id,
            nome: cli?.nome || v?.cliente_nome || 'Cliente',
            email: cli?.email || v?.cliente_email,
            telefone: cli?.telefone || v?.cliente_telefone
          },
          viagem: {
            id: v?.id,
            destino: v?.destino || 'Destino Não Informado',
            data_viagem: v?.data_ida || v?.dataIda,
            data_retorno: v?.data_volta || v?.dataVolta,
            consultor_id: v?.consultor_id || v?.consultorId
          },
          consultor: {
            id: cons?.id,
            nome: cons?.nome || v?.consultor_nome || 'Consultor',
            avatar_url: cons?.avatar_url || cons?.avatarUrl
          }
        };
      });

      feedbacksItem.forEach(f => {
        const classificacao = SatisfacaoService.classificarNps(f.nps_rating);
        const dStr = f.created_at ? f.created_at.slice(0, 10).split('-').reverse().join('/') : '-';
        const depoimentoLimpo = (f.comentarios || '').replace(/"/g, '""');
        csvContent += `${f.nps_rating};"${classificacao.categoria.toUpperCase()}";"${f.cliente?.nome || ''}";"${f.cliente?.telefone || ''}";"${f.viagem?.destino || ''}";"${f.consultor?.nome || ''}";"${depoimentoLimpo}";"${dStr}"\n`;
      });
      return csvContent;
    }

    return null;
  }
}
