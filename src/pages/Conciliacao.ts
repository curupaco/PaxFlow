import { supabase, getSessaoAtual } from '../services/supabase';
import { PerfilConsultor } from '../types';
import {
  ConciliacaoService,
  ExtratoTransacao,
  LocPagamentoPendente,
  SugestaoMatch,
  ResumoConciliacao,
  FechamentoMes
} from '../services/conciliacaoService';
import { UploadExtratoModal } from '../components/conciliacao/UploadExtratoModal';
import { VincularRecebimentoModal } from '../components/conciliacao/VincularRecebimentoModal';
import { JustificarEntradaModal } from '../components/conciliacao/JustificarEntradaModal';
import { FecharMesModal } from '../components/conciliacao/FecharMesModal';
import { showCustomAlert } from '../services/dialog';
import { renderHelpIcon } from '../utils/helpHelper';

export class ConciliacaoPage {
  private container: HTMLElement;
  private user: any = null;
  private perfil: PerfilConsultor | null = null;
  private transacoes: ExtratoTransacao[] = [];
  private pendentesLocs: LocPagamentoPendente[] = [];
  private sugestoes: SugestaoMatch[] = [];
  private fechamentos: FechamentoMes[] = [];
  private resumo: ResumoConciliacao = {
    totalExtrato: 0,
    totalConciliado: 0,
    totalPendenteExtrato: 0,
    totalRecebimentosSemBanco: 0,
    qtdExtrato: 0,
    qtdConciliado: 0,
    qtdPendenteExtrato: 0,
    qtdRecebimentosSemBanco: 0,
    taxaConciliacao: 0
  };

  private activeTab: 'pendentes' | 'conciliados' | 'sem_banco' | 'fechamentos' = 'pendentes';
  private filtroBusca: string = '';
  private filtroBanco: string = 'todos';
  private carregando: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async init(): Promise<void> {
    try {
      const { user, perfil, error } = await getSessaoAtual();
      if (error || !user) {
        this.renderAuthError('Usuário não autenticado. Faça login para acessar.');
        return;
      }

      // Check role permissions: Gestor/Admin
      const isAdmin = perfil?.role === 'admin';

      if (!isAdmin) {
        this.renderAuthError('Acesso Restrito: Apenas Gestores e a equipe Financeira têm acesso à Conciliação Bancária.');
        return;
      }

      this.user = user;
      this.perfil = perfil;

      await this.carregarDados();
    } catch (e: any) {
      console.error('Erro ao inicializar ConciliacaoPage:', e);
      this.renderAuthError('Erro ao carregar módulo de conciliação bancária.');
    }
  }

  private async carregarDados(): Promise<void> {
    this.carregando = true;
    this.render();

    try {
      const [transacoes, pendentesLocs, fechamentos] = await Promise.all([
        ConciliacaoService.listarTransacoesExtrato(),
        ConciliacaoService.listarRecebimentosPendentes(),
        ConciliacaoService.listarFechamentos()
      ]);

      this.transacoes = transacoes;
      this.pendentesLocs = pendentesLocs;
      this.fechamentos = fechamentos;
      this.resumo = ConciliacaoService.calcularResumo(transacoes, pendentesLocs);
      this.sugestoes = ConciliacaoService.calcularSmartMatches(transacoes, pendentesLocs);
    } catch (e) {
      console.error('Erro ao buscar dados de conciliação:', e);
      showCustomAlert('Aviso: Não foi possível carregar os dados completos do extrato.', 'warning');
    } finally {
      this.carregando = false;
      this.render();
    }
  }

  public render(): void {
    if (this.carregando) {
      this.container.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs font-bold text-slate-500 animate-pulse">Carregando dados da Conciliação Bancária...</p>
        </div>
      `;
      return;
    }

    const bancosDisponiveis = Array.from(
      new Set(this.transacoes.map(t => t.banco_origem).filter(Boolean))
    );

    this.container.innerHTML = `
      <div class="space-y-6 pb-12 animate-fade-in">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div>
            <div class="flex items-center gap-2">
              <span class="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black text-xl border border-emerald-100 dark:border-emerald-900/40">🪙</span>
              <h1 class="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Conciliação Bancária
                <span class="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">FinRecon™</span>
                ${renderHelpIcon('conciliacao-bancaria')}
              </h1>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Casamento inteligente de extratos bancários com recebimentos de vendas e fechamento de competências.
            </p>
          </div>

          <!-- Botões de Ação -->
          <div class="flex flex-wrap items-center gap-2">
            <button id="btn-exportar-conciliacao" class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700">
              📥 Exportar
            </button>

            <button id="btn-fechar-mes-modal" class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700">
              🔒 Fechar Mês
            </button>

            <button id="btn-abrir-upload-extrato" class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-500/20 transition transform active:scale-95 flex items-center gap-1.5">
              📁 Importar Extrato (OFX/CSV)
            </button>
          </div>
        </div>

        <!-- KPI Scorecards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Card 1: Entradas Bancárias -->
          <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Importado</span>
              <span class="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs">🏦</span>
            </div>
            <div class="text-xl font-black text-slate-900 dark:text-slate-100 mt-2">
              ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.resumo.totalExtrato)}
            </div>
            <p class="text-[11px] text-slate-500 font-medium mt-1">
              ${this.resumo.qtdExtrato} lançamentos bancários
            </p>
          </div>

          <!-- Card 2: Total Conciliado -->
          <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black uppercase tracking-wider text-slate-400">Conciliado</span>
              <span class="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs">🎯</span>
            </div>
            <div class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.resumo.totalConciliado)}
            </div>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                ${this.resumo.taxaConciliacao.toFixed(1)}% resolvido
              </span>
              <span class="text-[11px] text-slate-500 font-medium">(${this.resumo.qtdConciliado} itens)</span>
            </div>
          </div>

          <!-- Card 3: Pendente no Extrato -->
          <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black uppercase tracking-wider text-slate-400">Pendente no Extrato</span>
              <span class="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs">⏳</span>
            </div>
            <div class="text-xl font-black text-amber-600 dark:text-amber-400 mt-2">
              ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.resumo.totalPendenteExtrato)}
            </div>
            <p class="text-[11px] text-slate-500 font-medium mt-1">
              ${this.resumo.qtdPendenteExtrato} aguardando vínculo
            </p>
          </div>

          <!-- Card 4: Recebimentos sem Depósito -->
          <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-purple-500"></div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black uppercase tracking-wider text-slate-400">LOCs sem Extrato</span>
              <span class="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs">⚠️</span>
            </div>
            <div class="text-xl font-black text-purple-600 dark:text-purple-400 mt-2">
              ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.resumo.totalRecebimentosSemBanco)}
            </div>
            <p class="text-[11px] text-slate-500 font-medium mt-1">
              ${this.resumo.qtdRecebimentosSemBanco} recebimentos em aberto
            </p>
          </div>

        </div>

        <!-- Seção de Sugestões Smart Match (se houver) -->
        ${this.renderSugestoesSmartMatch()}

        <!-- Workspace com Abas e Tabela -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          
          <!-- Barra de Abas e Filtros -->
          <div class="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <!-- Abas -->
            <div class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit">
              <button class="tab-conciliacao px-4 py-2 rounded-xl text-xs font-bold transition ${this.activeTab === 'pendentes' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}" data-tab="pendentes">
                ⏳ Pendentes no Extrato (${this.resumo.qtdPendenteExtrato})
              </button>
              <button class="tab-conciliacao px-4 py-2 rounded-xl text-xs font-bold transition ${this.activeTab === 'conciliados' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}" data-tab="conciliados">
                ✅ Conciliados (${this.resumo.qtdConciliado})
              </button>
              <button class="tab-conciliacao px-4 py-2 rounded-xl text-xs font-bold transition ${this.activeTab === 'sem_banco' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}" data-tab="sem_banco">
                📋 LOCs em Aberto (${this.resumo.qtdRecebimentosSemBanco})
              </button>
              <button class="tab-conciliacao px-4 py-2 rounded-xl text-xs font-bold transition ${this.activeTab === 'fechamentos' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}" data-tab="fechamentos">
                🔒 Fechamentos (${this.fechamentos.length})
              </button>
            </div>

            <!-- Filtros de Busca e Banco -->
            <div class="flex items-center gap-2">
              ${bancosDisponiveis.length > 1 ? `
                <select id="select-filtro-banco" class="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="todos">Todos os Bancos</option>
                  ${bancosDisponiveis.map(b => `<option value="${b}" ${this.filtroBanco === b ? 'selected' : ''}>${b}</option>`).join('')}
                </select>
              ` : ''}

              <div class="relative">
                <input type="text" id="input-busca-conciliacao" value="${this.filtroBusca}" placeholder="Filtrar por texto, valor ou código..." class="pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-64" />
                <span class="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>
            </div>
          </div>

          <!-- Conteúdo da Tabela por Aba -->
          <div class="overflow-x-auto">
            ${this.renderTabelaPorAba()}
          </div>

        </div>

      </div>
    `;

    this.setupEventListeners();
  }

  private renderSugestoesSmartMatch(): string {
    const pendentesComSugestao = this.sugestoes.filter(s => {
      const transacao = this.transacoes.find(t => t.id === s.transacaoExtratoId);
      return transacao && transacao.status === 'pendente';
    });

    if (pendentesComSugestao.length === 0) return '';

    return `
      <div class="bg-gradient-to-r from-teal-900/10 via-emerald-900/10 to-indigo-900/10 dark:from-teal-950/30 dark:via-emerald-950/30 dark:to-indigo-950/30 border border-teal-200/80 dark:border-teal-800/50 rounded-3xl p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-base">⚡</span>
            <h3 class="text-xs font-black uppercase tracking-wide text-teal-800 dark:text-teal-300">
              Sugestões de Casamento Inteligente (Smart Match™)
            </h3>
            <span class="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-[10px] font-black">
              ${pendentesComSugestao.length} encontrada(s)
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${pendentesComSugestao.slice(0, 3).map(s => {
            const transacao = this.transacoes.find(t => t.id === s.transacaoExtratoId);
            const loc = this.pendentesLocs.find(p => p.id === s.locPagamentoId);
            if (!transacao || !loc) return '';

            return `
              <div class="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-teal-200/60 dark:border-teal-900/40 shadow-sm flex flex-col justify-between gap-3">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                      ${s.score}% Confiança
                    </span>
                    <span class="text-[10px] font-bold text-slate-400">
                      ${new Date(transacao.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div class="mt-2">
                    <p class="text-xs font-black text-slate-800 dark:text-slate-100 truncate">${transacao.descricao}</p>
                    <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      LOC: <strong class="text-slate-700 dark:text-slate-200">${loc.loc_codigo}</strong> • ${loc.cliente_nome}
                    </p>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span class="text-[10px] text-slate-400 uppercase font-black">Valor</span>
                    <div class="text-xs font-black text-slate-800 dark:text-slate-100">
                      ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transacao.valor)}
                    </div>
                  </div>

                  <button class="btn-aceitar-smart-match px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-[11px] font-black transition transform active:scale-95 shadow-sm shadow-teal-500/20" data-transacao-id="${transacao.id}" data-loc-id="${loc.id}">
                    ⚡ Conciliar 1-Clique
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderTabelaPorAba(): string {
    const termo = this.filtroBusca.toLowerCase().trim();

    if (this.activeTab === 'pendentes') {
      const lista = this.transacoes.filter(t => {
        if (t.status !== 'pendente') return false;
        if (this.filtroBanco !== 'todos' && t.banco_origem !== this.filtroBanco) return false;
        if (!termo) return true;
        return (
          t.descricao.toLowerCase().includes(termo) ||
          (t.documento && t.documento.toLowerCase().includes(termo)) ||
          t.valor.toString().includes(termo)
        );
      });

      if (lista.length === 0) {
        return `
          <div class="p-12 text-center">
            <span class="text-4xl">🎉</span>
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 mt-2">Nenhum lançamento pendente no extrato</h3>
            <p class="text-xs text-slate-400 mt-1">Todas as entradas importadas estão devidamente conciliadas ou justificadas.</p>
          </div>
        `;
      }

      return `
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="p-4">Data / Banco</th>
              <th class="p-4">Descrição do Extrato</th>
              <th class="p-4">Documento / FitID</th>
              <th class="p-4 text-right">Valor Creditado</th>
              <th class="p-4 text-center w-52">Ações de Conciliação</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            ${lista.map(t => `
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="p-4 align-middle">
                  <div class="font-bold text-slate-800 dark:text-slate-100">
                    ${new Date(t.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </div>
                  <div class="text-[10px] text-slate-400 font-semibold">${t.banco_origem || 'Extrato'}</div>
                </td>
                <td class="p-4 align-middle">
                  <div class="font-bold text-slate-800 dark:text-slate-100">${t.descricao}</div>
                  <span class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black">
                    Pendente
                  </span>
                </td>
                <td class="p-4 align-middle text-slate-500 font-mono text-[11px]">
                  ${t.documento || t.fitid || '-'}
                </td>
                <td class="p-4 align-middle text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)}
                </td>
                <td class="p-4 align-middle text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button class="btn-abrir-vincular px-2.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-[11px] font-black transition transform active:scale-95 shadow-sm shadow-teal-500/20" data-id="${t.id}">
                      🔗 Vincular LOC
                    </button>
                    <button class="btn-abrir-justificar px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-bold transition" data-id="${t.id}" title="Justificar não venda">
                      🏷️
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    if (this.activeTab === 'conciliados') {
      const lista = this.transacoes.filter(t => {
        if (t.status === 'pendente') return false;
        if (this.filtroBanco !== 'todos' && t.banco_origem !== this.filtroBanco) return false;
        if (!termo) return true;
        return (
          t.descricao.toLowerCase().includes(termo) ||
          (t.categoria_nao_venda && t.categoria_nao_venda.toLowerCase().includes(termo)) ||
          t.valor.toString().includes(termo)
        );
      });

      if (lista.length === 0) {
        return `
          <div class="p-12 text-center">
            <span class="text-4xl">🔍</span>
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 mt-2">Nenhuma transação conciliada encontrada</h3>
            <p class="text-xs text-slate-400 mt-1">Lançamentos vinculados ou justificados aparecerão listados aqui.</p>
          </div>
        `;
      }

      return `
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="p-4">Data / Banco</th>
              <th class="p-4">Descrição do Lançamento</th>
              <th class="p-4">Status / Enquadramento</th>
              <th class="p-4 text-right">Valor Extrato</th>
              <th class="p-4 text-center w-36">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            ${lista.map(t => `
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="p-4 align-middle">
                  <div class="font-bold text-slate-800 dark:text-slate-100">
                    ${new Date(t.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </div>
                  <div class="text-[10px] text-slate-400 font-semibold">${t.banco_origem || 'Extrato'}</div>
                </td>
                <td class="p-4 align-middle">
                  <div class="font-bold text-slate-800 dark:text-slate-100">${t.descricao}</div>
                  ${t.observacao_justificativa ? `<div class="text-[10px] text-slate-400 truncate max-w-xs">${t.observacao_justificativa}</div>` : ''}
                </td>
                <td class="p-4 align-middle">
                  ${t.status === 'conciliado' ? `
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black">
                      ✅ Conciliado (LOC)
                    </span>
                  ` : `
                    <span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black">
                      🏷️ ${t.categoria_nao_venda || 'Justificado'}
                    </span>
                  `}
                </td>
                <td class="p-4 align-middle text-right font-black text-slate-800 dark:text-slate-100 text-sm">
                  ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)}
                </td>
                <td class="p-4 align-middle text-center">
                  <button class="btn-reverter-conciliacao px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-[11px] font-bold transition border border-rose-200/60 dark:border-rose-900/40" data-id="${t.id}" title="Desfazer conciliação">
                    ↩️ Desfazer
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    if (this.activeTab === 'sem_banco') {
      const lista = this.pendentesLocs.filter(p => {
        if (!termo) return true;
        return (
          p.loc_codigo.toLowerCase().includes(termo) ||
          p.cliente_nome.toLowerCase().includes(termo) ||
          p.forma_pagamento.toLowerCase().includes(termo) ||
          p.valor.toString().includes(termo)
        );
      });

      if (lista.length === 0) {
        return `
          <div class="p-12 text-center">
            <span class="text-4xl">✨</span>
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 mt-2">Nenhum recebimento em aberto sem depósito</h3>
            <p class="text-xs text-slate-400 mt-1">Todos os recebimentos registrados no PaxFlow foram conciliados com sucesso.</p>
          </div>
        `;
      }

      return `
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="p-4">Vencimento / LOC</th>
              <th class="p-4">Cliente / Titular</th>
              <th class="p-4">Forma / Parcela</th>
              <th class="p-4 text-right">Valor PaxFlow</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            ${lista.map(p => `
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="p-4 align-middle">
                  <div class="font-bold text-slate-800 dark:text-slate-100">${p.loc_codigo}</div>
                  <div class="text-[10px] text-slate-400">${new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                </td>
                <td class="p-4 align-middle">
                  <div class="font-bold text-slate-700 dark:text-slate-200">${p.cliente_nome}</div>
                  ${p.observacoes ? `<div class="text-[10px] text-slate-400 truncate max-w-xs">${p.observacoes}</div>` : ''}
                </td>
                <td class="p-4 align-middle">
                  <span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                    ${p.forma_pagamento} ${p.parcela_numero ? `(${p.parcela_numero}ª)` : ''}
                  </span>
                </td>
                <td class="p-4 align-middle text-right font-black text-slate-800 dark:text-slate-100 text-sm">
                  ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    if (this.activeTab === 'fechamentos') {
      if (this.fechamentos.length === 0) {
        return `
          <div class="p-12 text-center">
            <span class="text-4xl">🔒</span>
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 mt-2">Nenhum mês fechado até o momento</h3>
            <p class="text-xs text-slate-400 mt-1">Utilize o botão "Fechar Mês" acima para consolidar uma competência contábil.</p>
          </div>
        `;
      }

      return `
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="p-4">Competência</th>
              <th class="p-4">Data do Fechamento</th>
              <th class="p-4">Total Conciliado</th>
              <th class="p-4">Diferença / Ajustes</th>
              <th class="p-4">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            ${this.fechamentos.map(f => `
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="p-4 align-middle font-black text-slate-800 dark:text-slate-100 text-sm">
                  ${f.ano_mes}
                </td>
                <td class="p-4 align-middle text-slate-600 dark:text-slate-300">
                  ${new Date(f.data_fechamento).toLocaleString('pt-BR')}
                </td>
                <td class="p-4 align-middle font-black text-emerald-600 dark:text-emerald-400">
                  ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.total_conciliado || 0)}
                </td>
                <td class="p-4 align-middle text-slate-600 dark:text-slate-300">
                  ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.total_diferenca || 0)}
                </td>
                <td class="p-4 align-middle">
                  <span class="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-black flex items-center gap-1 w-fit">
                    🔒 Trancado
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    return '';
  }

  private setupEventListeners(): void {
    // Abas de navegação
    this.container.querySelectorAll('.tab-conciliacao').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as any;
        if (tab) {
          this.activeTab = tab;
          this.render();
        }
      });
    });

    // Filtro de busca
    const inputBusca = this.container.querySelector('#input-busca-conciliacao') as HTMLInputElement;
    inputBusca?.addEventListener('input', () => {
      this.filtroBusca = inputBusca.value;
      const tbodyContainer = this.container.querySelector('.overflow-x-auto');
      if (tbodyContainer) {
        tbodyContainer.innerHTML = this.renderTabelaPorAba();
        this.setupTabelaActions();
      }
    });

    // Filtro de banco
    const selectBanco = this.container.querySelector('#select-filtro-banco') as HTMLSelectElement;
    selectBanco?.addEventListener('change', () => {
      this.filtroBanco = selectBanco.value;
      const tbodyContainer = this.container.querySelector('.overflow-x-auto');
      if (tbodyContainer) {
        tbodyContainer.innerHTML = this.renderTabelaPorAba();
        this.setupTabelaActions();
      }
    });

    // Botão Importar Extrato
    this.container.querySelector('#btn-abrir-upload-extrato')?.addEventListener('click', () => {
      UploadExtratoModal.abrir(() => this.carregarDados());
    });

    // Botão Fechar Mês
    this.container.querySelector('#btn-fechar-mes-modal')?.addEventListener('click', () => {
      FecharMesModal.abrir(() => this.carregarDados());
    });

    // Botão Exportar
    this.container.querySelector('#btn-exportar-conciliacao')?.addEventListener('click', () => {
      ConciliacaoService.exportarRelatorioCSV(this.transacoes);
    });

    // Smart Match 1-clique
    this.container.querySelectorAll('.btn-aceitar-smart-match').forEach(btn => {
      btn.addEventListener('click', async () => {
        const transacaoId = btn.getAttribute('data-transacao-id');
        const locId = btn.getAttribute('data-loc-id');
        if (!transacaoId || !locId) return;

        try {
          (btn as HTMLButtonElement).disabled = true;
          (btn as HTMLButtonElement).textContent = 'Conciliando...';
          await ConciliacaoService.conciliarTransacao({
            transacaoId,
            locPagamentoIds: [locId]
          });
          showCustomAlert('Casamento inteligente realizado com sucesso! 🎯', 'success');
          await this.carregarDados();
        } catch (e: any) {
          showCustomAlert(`Erro ao conciliar: ${e.message || 'Erro desconhecido'}`, 'error');
          (btn as HTMLButtonElement).disabled = false;
          (btn as HTMLButtonElement).textContent = '⚡ Conciliar 1-Clique';
        }
      });
    });

    this.setupTabelaActions();
  }

  private setupTabelaActions(): void {
    // Ações de vincular
    this.container.querySelectorAll('.btn-abrir-vincular').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const transacao = this.transacoes.find(t => t.id === id);
        if (transacao) {
          VincularRecebimentoModal.abrir(transacao, () => this.carregarDados());
        }
      });
    });

    // Ações de justificar
    this.container.querySelectorAll('.btn-abrir-justificar').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const transacao = this.transacoes.find(t => t.id === id);
        if (transacao) {
          JustificarEntradaModal.abrir(transacao, () => this.carregarDados());
        }
      });
    });

    // Ações de reverter
    this.container.querySelectorAll('.btn-reverter-conciliacao').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;

        if (!confirm('Deseja realmente desfazer esta conciliação? Os recebimentos voltarão a ficar pendentes.')) {
          return;
        }

        try {
          await ConciliacaoService.reverterConciliacao(id);
          showCustomAlert('Conciliação revertida com sucesso.', 'success');
          await this.carregarDados();
        } catch (e: any) {
          showCustomAlert(`Falha ao reverter: ${e.message || 'Erro inesperado'}`, 'error');
        }
      });
    });
  }

  private renderAuthError(msg: string): void {
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <span class="text-4xl mb-3">🔒</span>
        <h2 class="text-base font-black text-slate-800 dark:text-slate-100">Acesso Restrito</h2>
        <p class="text-xs text-slate-500 max-w-md mt-1 mb-4">${msg}</p>
        <button onclick="window.location.hash='#dashboard'" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition">
          Voltar ao Início
        </button>
      </div>
    `;
  }
}
