/**
 * src/components/dashboard/BalcaoCopilotoSection.ts
 *
 * Seção de Resgate e Atendimento Balcão no Modo Co-Piloto.
 * Exibe oportunidades e clientes de outros consultores localizados para atendimento
 * presencial ou cruzamento operacional na agência.
 */

export interface BalcaoCopilotoContext {
  buscaTermo: string;
  balcaoResultados: any[];
  viagens: any[];
  user: any;
  perfil: any;
}

export interface BalcaoCopilotoHandlers {
  onOpenTrip: (tripId: string) => void;
  onOpenOrcamento?: (orcId: string) => void;
}

export class BalcaoCopilotoSection {
  /**
   * Renderiza a seção de balcão Co-Piloto quando houver resultados de outros consultores
   */
  public static renderHTML(ctx: BalcaoCopilotoContext): string {
    const { buscaTermo, balcaoResultados, viagens, user, perfil } = ctx;

    if (!buscaTermo || !balcaoResultados || balcaoResultados.length === 0) return '';

    const currentUserId = user?.id;
    const mainListTripIds = new Set(viagens.filter(v => {
      if (perfil?.role !== 'admin') {
        return v.consultor_id === currentUserId || v.consultor_responsavel_id === currentUserId;
      }
      return true;
    }).map(v => v.id));

    // Filtra balcaoResultados removendo os itens do próprio usuário ou que já estejam na lista principal
    const resultadosFiltrados = balcaoResultados.map(res => {
      const viagensOutros = (res.viagens || []).filter((v: any) => {
        const isMinhaViagem = v.consultorId === currentUserId;
        const jaEstaNaListaPrincipal = mainListTripIds.has(v.id);
        return !isMinhaViagem && !jaEstaNaListaPrincipal;
      });

      const orcamentosOutros = (res.orcamentos || []).filter((o: any) => {
        const isMeuOrcamento = o.consultorId === currentUserId;
        return !isMeuOrcamento;
      });

      return {
        ...res,
        viagens: viagensOutros,
        orcamentos: orcamentosOutros
      };
    }).filter(res => res.viagens.length > 0 || res.orcamentos.length > 0);

    if (resultadosFiltrados.length === 0) return '';

    return `
      <div class="mb-6 p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-xl border border-indigo-500/30 animate-fade-in shrink-0">
        <div class="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-indigo-500/20">
          <div class="flex items-center gap-2.5">
            <span class="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-base">🤝</span>
            <div>
              <h3 class="text-sm font-black tracking-wide text-indigo-100 uppercase">Modo Co-Piloto — Pesquisa de Balcão (Outros Consultores)</h3>
              <p class="text-xs text-indigo-300">Clientes de outros consultores localizados para atendimento presencial no balcão.</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider">${resultadosFiltrados.length} cliente(s) localizado(s)</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${resultadosFiltrados.map(res => `
            <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-indigo-500/50 transition">
              <div>
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="font-extrabold text-sm text-white truncate">${res.cliente.nome}</span>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Cliente</span>
                </div>
                <div class="text-[11px] text-slate-400 space-y-0.5 font-mono">
                  ${res.cliente.cpf ? `<div>CPF: ${res.cliente.cpf}</div>` : ''}
                  ${res.cliente.telefone ? `<div>Tel: ${res.cliente.telefone}</div>` : ''}
                  ${res.cliente.email ? `<div>Email: ${res.cliente.email}</div>` : ''}
                </div>
              </div>

              <div class="space-y-1.5 pt-2 border-t border-slate-700/40">
                ${res.viagens.map((v: any) => `
                  <div class="flex items-center justify-between gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                    <div class="truncate">
                      <span class="block font-bold text-indigo-200 truncate">✈️ ${v.titulo}</span>
                      <span class="block text-[10px] text-slate-400">Consultor: ${v.consultorNome}</span>
                    </div>
                    <button class="btn-balcao-open-trip shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-extrabold transition uppercase shadow-md cursor-pointer" data-trip-id="${v.id}">
                      Atender 🤝
                    </button>
                  </div>
                `).join('')}

                ${res.orcamentos.map((o: any) => `
                  <div class="flex items-center justify-between gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                    <div class="truncate">
                      <span class="block font-bold text-amber-200 truncate">📋 ${o.titulo}</span>
                      <span class="block text-[10px] text-slate-400">Consultor: ${o.consultorNome}</span>
                    </div>
                    <button class="btn-balcao-open-orc shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-extrabold transition uppercase shadow-md cursor-pointer" data-orc-id="${o.id}">
                      Atender 🤝
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Conecta os eventos de atendimento rápido nos botões da seção de balcão
   */
  public static attachEvents(container: HTMLElement, handlers: BalcaoCopilotoHandlers): void {
    container.querySelectorAll('.btn-balcao-open-trip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-trip-id');
        if (tripId) {
          handlers.onOpenTrip(tripId);
        }
      });
    });

    if (handlers.onOpenOrcamento) {
      container.querySelectorAll('.btn-balcao-open-orc').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const orcId = btn.getAttribute('data-orc-id');
          if (orcId && handlers.onOpenOrcamento) {
            handlers.onOpenOrcamento(orcId);
          }
        });
      });
    }
  }
}
