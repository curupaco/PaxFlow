export class LandingPageV2 {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public init(): void {
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="landing-v2 min-h-screen bg-[#0b0f1a] text-white font-sans selection:bg-fuchsia-500 selection:text-white relative overflow-hidden flex flex-col">
        <!-- ===== Ambient Color Glows / Grid ===== -->
        <div class="pointer-events-none absolute inset-0 z-0">
          <div class="absolute -top-40 -left-32 w-[42rem] h-[42rem] rounded-full bg-gradient-to-br from-fuchsia-600/30 via-rose-500/20 to-transparent blur-3xl"></div>
          <div class="absolute top-1/3 -right-40 w-[38rem] h-[38rem] rounded-full bg-gradient-to-bl from-sky-500/25 via-indigo-600/20 to-transparent blur-3xl"></div>
          <div class="absolute bottom-0 left-1/4 w-[36rem] h-[36rem] rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-500/15 to-transparent blur-3xl"></div>
          <div class="absolute inset-0 opacity-[0.07] grid-bg"></div>
        </div>

        <!-- ===== Top Navigation ===== -->
        <header class="relative z-20 w-full px-6 py-4 flex items-center justify-between bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-sky-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            </div>
            <span class="text-lg font-black tracking-tight bg-gradient-to-r from-fuchsia-400 to-sky-400 bg-clip-text text-transparent">PaxFlow</span>
          </div>
          <nav class="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-300">
            <a href="#recursos" class="hover:text-white transition">Recursos</a>
            <a href="#integracao" class="hover:text-white transition">Integrações</a>
            <a href="#faq" class="hover:text-white transition">FAQ</a>
            <a href="#planos" class="hover:text-white transition">Planos</a>
          </nav>
          <div class="flex items-center gap-2.5">
            <button id="btn-header-whatsapp" class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
              <span class="hidden sm:inline">WhatsApp</span>
            </button>
            <button id="btn-acessar-login" class="px-4 py-2 bg-white text-slate-900 hover:bg-slate-200 font-bold text-xs rounded-xl transition shadow-md">Acessar Sistema</button>
          </div>
        </header>

        <!-- ===== Hero ===== -->
        <main class="relative z-10 w-full max-w-6xl mx-auto px-6 pt-20 pb-16 text-center flex flex-col items-center">
          <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-fuchsia-500/40 text-fuchsia-300 font-bold text-[11px] uppercase tracking-widest mb-6">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            O CRM & Pós-Venda 100% Especializado em Turismo
          </span>

          <h1 class="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-6 max-w-4xl">
            A gestão operacional da sua agência de viagens,
            <span class="bg-gradient-to-r from-fuchsia-400 via-rose-400 to-amber-400 bg-clip-text text-transparent">simplificada</span>.
          </h1>

          <p class="text-sm md:text-lg text-slate-300 max-w-2xl mb-9 leading-relaxed font-medium">
            Abandone as planilhas manuais e a desorganização. Centralize pós-vendas, controle de passaportes e vistos, conciliação de reembolsos aéreos, escala de funcionários e itinerários em uma plataforma viva e intuitiva.
          </p>

          <div class="flex flex-col sm:flex-row items-center gap-4 mb-12 w-full justify-center">
            <button id="btn-iniciar-demo" class="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-white font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 shadow-xl shadow-fuchsia-600/30 hover:shadow-2xl hover:scale-[1.03] transition-transform">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Iniciar Modo Demonstração
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs tracking-wider uppercase border border-white/15 transition">
              Entrar no Sistema Real
            </button>
          </div>

          <!-- Stats bar -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mx-auto mb-16 p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div class="text-center">
              <span class="block text-2xl font-black text-fuchsia-400">100%</span>
              <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Foco em Turismo</span>
            </div>
            <div class="text-center">
              <span class="block text-2xl font-black text-rose-400">180 dias</span>
              <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Alerta Vistos & Passaporte</span>
            </div>
            <div class="text-center">
              <span class="block text-2xl font-black text-emerald-400">Escala + Banco</span>
              <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Gestão de Equipe</span>
            </div>
            <div class="text-center">
              <span class="block text-2xl font-black text-amber-400">WhatsApp SLA</span>
              <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Hub Digisac Integrado</span>
            </div>
          </div>

          <!-- Module tour -->
          <div class="w-full text-center mb-8">
            <h2 class="text-2xl md:text-3xl font-black tracking-tight">Conheça os Módulos do PaxFlow</h2>
            <p class="text-sm text-slate-400 font-medium mt-2">Clique nas abas abaixo para visualizar as telas reais da nossa solução</p>
          </div>

          <div class="w-full mb-8">
            <div class="flex flex-wrap justify-center gap-2 p-2 rounded-3xl bg-white/5 border border-white/10 max-w-5xl mx-auto backdrop-blur-md">
              <button id="tab-btn-dashboard" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-rose-500 text-white shadow-lg">Painel Comercial</button>
              <button id="tab-btn-viagens" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-white">Viagens</button>
              <button id="tab-btn-orcamentos" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-white">Orçamentos</button>
              <button id="tab-btn-inbox" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-white">Alertas & SLAs</button>
              <button id="tab-btn-escala" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-white">Escala da Equipe</button>
              <button id="tab-btn-reembolsos" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-white">Reembolsos</button>
              <button id="tab-btn-relatorios" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-white">Relatórios</button>
              <button id="tab-btn-publicas" class="px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-white">Itinerários públicos</button>
            </div>
          </div>

          <!-- Live preview window -->
          <div class="w-full bg-white/[0.04] border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 text-left backdrop-blur-md min-h-[460px] flex flex-col justify-between">
            <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 bg-rose-500 rounded-full"></span>
                <span class="w-3 h-3 bg-amber-500 rounded-full"></span>
                <span class="w-3 h-3 bg-emerald-500 rounded-full"></span>
                <span id="window-path-text" class="text-[10px] font-black text-slate-300 ml-2 uppercase tracking-wide">PaxFlow - Painel de Controle</span>
              </div>
              <span class="px-2.5 py-0.5 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 font-extrabold text-[9px] uppercase">Demo em Tempo Real</span>
            </div>

            <div id="mockup-panels-container" class="flex-1 flex flex-col justify-center">
              <div id="panel-dashboard" class="space-y-4 tab-pane-transition">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-fuchsia-500/15 to-sky-500/10 border border-fuchsia-500/20 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">💡</span>
                  <span><strong>Visão Comercial Unificada:</strong> O PaxFlow calcula automaticamente faturamento bruto, margem de comissão, ticket médio e taxa de conversão da equipe sem exigir planilhas manuais.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-white/5 border border-white/10 p-5 rounded-2xl">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Faturamento Mensal</span>
                    <span class="block text-2xl font-black text-white mt-1">R$ 148.500,00 <span class="text-[10px] text-emerald-400 font-extrabold">+14.2%</span></span>
                  </div>
                  <div class="bg-white/5 border border-white/10 p-5 rounded-2xl">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Taxa de Conversão</span>
                    <span class="block text-2xl font-black text-fuchsia-400 mt-1">24,8%</span>
                  </div>
                  <div class="bg-white/5 border border-white/10 p-5 rounded-2xl">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
                    <span class="block text-2xl font-black text-emerald-400 mt-1">R$ 6.200,00</span>
                  </div>
                </div>
                <div class="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <span class="text-sm font-bold text-white">Funil Comercial Operativo</span>
                    <span class="px-2 py-0.5 bg-fuchsia-500/15 text-fuchsia-300 text-[9px] font-bold rounded-lg">Dados em Tempo Real</span>
                  </div>
                  <div class="space-y-3">
                    <div>
                      <div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Orçamentos Criados</span><span>120</span></div>
                      <div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="bg-fuchsia-500 h-full w-full rounded-full"></div></div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Propostas Enviadas</span><span>75 (62%)</span></div>
                      <div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="bg-rose-500 h-full w-[62%] rounded-full"></div></div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs font-bold mb-1 text-slate-400"><span>Negociações Fechadas</span><span>24 (20%)</span></div>
                      <div class="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div class="bg-emerald-500 h-full w-[20%] rounded-full"></div></div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="panel-viagens" class="space-y-4 tab-pane-transition hidden">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-sky-500/15 to-cyan-500/10 border border-sky-500/20 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">✈️</span>
                  <span><strong>Operação de Pós-Venda:</strong> Acompanhe todas as viagens por localizador (LOC), período e rentabilidade. O ícone de SLA (⚠️) avisa quando o passaporte precisa de atenção.</span>
                </div>
                <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-[600px] text-xs">
                      <thead>
                        <tr class="bg-white/5 text-[9px] font-bold uppercase text-slate-400 border-b border-white/10">
                          <th class="px-4 py-3 text-center">SLA</th>
                          <th class="px-4 py-3">Cliente / LOC</th>
                          <th class="px-4 py-3">Destino</th>
                          <th class="px-4 py-3">Financeiro</th>
                          <th class="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-white/10 text-slate-300 font-medium">
                        <tr class="hover:bg-white/5 transition">
                          <td class="px-4 py-3 text-center">⚠️</td>
                          <td class="px-4 py-3"><strong class="text-white">Passageiro Demo 01</strong> <span class="ml-1 text-[8px] px-1.5 py-0.5 bg-white/10 rounded uppercase">BA921</span></td>
                          <td class="px-4 py-3">✈️ Buenos Aires</td>
                          <td class="px-4 py-3 text-fuchsia-400 font-bold">R$ 5.400,00</td>
                          <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 text-[9px] font-bold uppercase border border-amber-500/20">Pré-Embarque</span></td>
                        </tr>
                        <tr class="hover:bg-white/5 transition">
                          <td class="px-4 py-3 text-center">🟢</td>
                          <td class="px-4 py-3"><strong class="text-white">Passageira Demo 02</strong> <span class="ml-1 text-[8px] px-1.5 py-0.5 bg-white/10 rounded uppercase">US441</span></td>
                          <td class="px-4 py-3">✈️ Orlando</td>
                          <td class="px-4 py-3 text-fuchsia-400 font-bold">R$ 12.800,00</td>
                          <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-400 text-[9px] font-bold uppercase border border-sky-500/20">Pós-Venda</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div id="panel-orcamentos" class="space-y-4 tab-pane-transition hidden">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">🎯</span>
                  <span><strong>CRM Comercial de Alta Performance:</strong> Arraste cards entre os estágios do funil. O sistema arquiva automaticamente propostas paradas há mais de 30 dias.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs">
                  <div class="bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 mb-2.5 uppercase text-[8px]">Novo (3)</span>
                    <div class="p-2.5 bg-white/[0.07] border border-white/10 rounded-xl"><span class="block font-bold truncate">Grécia / Lua de Mel</span><span class="block text-[8px] text-slate-400">Cliente Exemplo 01</span><span class="block text-[10px] font-black text-fuchsia-400 mt-1">R$ 24.000,00</span></div>
                  </div>
                  <div class="bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 mb-2.5 uppercase text-[8px]">Em Análise (2)</span>
                    <div class="p-2.5 bg-white/[0.07] border border-white/10 rounded-xl"><span class="block font-bold truncate">Férias em Família</span><span class="block text-[8px] text-slate-400">Cliente Exemplo 02</span><span class="block text-[10px] font-black text-fuchsia-400 mt-1">R$ 15.600,00</span></div>
                  </div>
                  <div class="bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 mb-2.5 uppercase text-[8px]">Proposta (4)</span>
                    <div class="p-2.5 bg-white/[0.07] border border-white/10 rounded-xl border-l-2 border-l-amber-500"><span class="block font-bold truncate">Férias em Natal</span><span class="block text-[8px] text-slate-400">Cliente Exemplo 03</span><span class="block text-[10px] font-black text-fuchsia-400 mt-1">R$ 8.900,00</span></div>
                  </div>
                  <div class="bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <span class="block font-extrabold text-slate-400 mb-2.5 uppercase text-[8px]">Ganho (9)</span>
                    <div class="p-2.5 bg-white/[0.07] border border-white/10 rounded-xl border-l-2 border-l-emerald-500"><span class="block font-bold truncate">Mochilão Europa</span><span class="block text-[8px] text-slate-400">Cliente Exemplo 04</span><span class="block text-[10px] font-black text-emerald-400 mt-1">R$ 18.200,00</span></div>
                  </div>
                </div>
              </div>

              <div id="panel-inbox" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 to-pink-500/10 border border-rose-500/20 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">🔔</span>
                  <span><strong>Alertas e Comunicação WhatsApp:</strong> Receba notificações automáticas de SLA de passaporte (validade &lt; 180 dias) e integre o atendimento Digisac diretamente no sistema.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-1 space-y-2 border-r border-white/10 pr-3">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Alertas Recentes</span>
                    <div class="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <div class="flex justify-between font-extrabold text-rose-400"><span>SLA Passaporte</span><span>Urgente</span></div>
                      <span class="block text-slate-400 truncate mt-0.5">Passageira Demo 03 (Validade &lt; 180d)</span>
                    </div>
                    <div class="p-2 bg-white/5 border border-white/10 rounded-xl">
                      <div class="flex justify-between font-bold text-slate-300"><span>Confirmação LOC</span><span>1h atrás</span></div>
                      <span class="block text-slate-400 truncate mt-0.5">Voo GRU-CDG confirmado</span>
                    </div>
                  </div>
                  <div class="md:col-span-2 space-y-3">
                    <div class="flex items-center justify-between border-b border-white/10 pb-2">
                      <span class="font-extrabold text-white">Thread: Alerta SLA - Passageira Demo 03</span>
                      <span class="text-[8px] font-bold text-rose-400">Viagem em 15/12/2026</span>
                    </div>
                    <div class="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl"><span class="font-extrabold text-rose-400">Sistema:</span><p class="text-slate-400 mt-0.5">Atenção! Passaporte vence em menos de 6 meses no dia da viagem.</p></div>
                    <div class="p-2.5 bg-white/5 border border-white/10 rounded-xl text-right ml-4"><span class="font-extrabold text-white">Consultor Demo:</span><p class="text-slate-400 mt-0.5">Solicitação de renovação já está em andamento.</p></div>
                  </div>
                </div>
              </div>

              <div id="panel-escala" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-violet-500/15 to-purple-500/10 border border-violet-500/20 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">👥</span>
                  <span><strong>Central Administrativa de Escala:</strong> Grade mensal de horários, banco de folgas, aprovação de trocas de turno e mural de treinamentos em um só painel.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
                    <span class="font-bold text-white block">Grade de Turnos (Visão da Agência)</span>
                    <p class="text-xs text-slate-400">Tabela interativa com cores por horário e coluna fixa de equipe.</p>
                  </div>
                  <div class="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
                    <span class="font-bold text-white block">Trocas & Banco de Folgas</span>
                    <p class="text-xs text-slate-400">Fluxo de aceite duplo com aprovação da gestão e controle de saldos.</p>
                  </div>
                </div>
              </div>

              <div id="panel-reembolsos" class="space-y-3 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">💸</span>
                  <span><strong>Conciliação de Estornos Aéreos:</strong> Acompanhe cada etapa dos reembolsos junto às cias aéreas. Não deixe nenhum crédito da agência esquecido.</span>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse">
                    <thead><tr class="border-b border-white/10 text-slate-400"><th class="pb-2 font-bold uppercase text-[8px]">Passageiro</th><th class="pb-2 font-bold uppercase text-[8px]">Fornecedor</th><th class="pb-2 font-bold uppercase text-[8px]">Valor</th><th class="pb-2 font-bold uppercase text-[8px]">Etapa</th></tr></thead>
                    <tbody class="divide-y divide-white/10 text-slate-300">
                      <tr><td class="py-2.5 font-bold text-white">Passageiro Demo 04</td><td class="py-2.5">LATAM Airlines</td><td class="py-2.5 font-bold">R$ 1.850,00</td><td class="py-2.5"><span class="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-bold rounded-md uppercase">Solicitado</span></td></tr>
                      <tr><td class="py-2.5 font-bold text-white">Passageira Demo 05</td><td class="py-2.5">Decolar</td><td class="py-2.5 font-bold">R$ 3.400,00</td><td class="py-2.5"><span class="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-bold rounded-md uppercase">Em Análise</span></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div id="panel-relatorios" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-violet-500/10 border border-indigo-500/20 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">📊</span>
                  <span><strong>Relatórios e Inteligência Financeira:</strong> Markups por produto, taxa de fechamento da equipe e projeções de receitas para 30/60/90 dias.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-white/5 border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Conversão Geral</span><span class="block text-lg font-black mt-1">28,4%</span></div>
                  <div class="bg-white/5 border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Markup Médio</span><span class="block text-lg font-black mt-1">18,5%</span></div>
                  <div class="bg-white/5 border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Pipeline Estimado</span><span class="block text-lg font-black mt-1">R$ 115.800,00</span></div>
                </div>
              </div>

              <div id="panel-publicas" class="space-y-4 tab-pane-transition hidden text-xs">
                <div class="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 to-fuchsia-500/10 border border-purple-500/20 text-sm text-slate-200 flex items-center gap-2">
                  <span class="text-lg">🌟</span>
                  <span><strong>Itinerários Digitais VIP & Pesquisa NPS:</strong> Links públicos de viagem com as cores da sua agência. O cliente acessa vouchers e responde à avaliação NPS no celular.</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-white/5 border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-bold text-fuchsia-400 uppercase tracking-wider block">Itinerário Digital do Cliente</span><p class="text-slate-400 leading-normal mt-1">O passageiro acompanha voos, hotéis, traslados e vouchers, organizados por dia com contagem regressiva.</p></div>
                  <div class="bg-white/5 border border-white/10 p-4 rounded-2xl"><span class="text-[8px] font-bold text-emerald-400 uppercase tracking-wider block">Pesquisa de Satisfação NPS</span><p class="text-slate-400 leading-normal mt-1">Pesquisa pós-viagem amigável que alimenta as estatísticas do painel de controle.</p></div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- ===== Integrações (NOVA) ===== -->
        <section id="integracao" class="relative z-10 w-full py-20 px-6 border-t border-white/10">
          <div class="max-w-6xl mx-auto">
            <div class="text-center max-w-3xl mx-auto mb-12 space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-black uppercase tracking-widest">Integrações</span>
              <h2 class="text-3xl sm:text-4xl font-black tracking-tight">Conecte-se às ferramentas que já usa</h2>
              <p class="text-sm text-slate-400 font-medium">O PaxFlow se integra nativamente à sua stack de atendimento e emissão, sem fricção.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div class="group p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-colors">
                <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
                </div>
                <h3 class="text-lg font-black text-white">Digisac / WhatsApp</h3>
                <p class="text-sm text-slate-400 font-medium mt-1 leading-relaxed">Atendimento com histórico split-screen, envio de modelos e notificações automáticas de embarque e NPS.</p>
              </div>
              <div class="group p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-sky-500/40 transition-colors">
                <div class="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center mb-4">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                </div>
                <h3 class="text-lg font-black text-white">Companhias Aéreas</h3>
                <p class="text-sm text-slate-400 font-medium mt-1 leading-relaxed">Conciliação de reembolsos e créditos, localizadores (LOC) e monitoramento de SLAs de estorno.</p>
              </div>
              <div class="group p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-colors">
                <div class="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-4">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                </div>
                <h3 class="text-lg font-black text-white">Upload & Documentos</h3>
                <p class="text-sm text-slate-400 font-medium mt-1 leading-relaxed">Armazenamento seguro por cliente no Supabase Storage com links de acesso controlados e compressed.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== Problem vs Solution ===== -->
        <section class="relative z-10 w-full py-16 px-6 border-t border-white/10">
          <div class="max-w-5xl mx-auto">
            <h2 class="text-2xl md:text-3xl font-black tracking-tight text-center mb-10">Por que substituir planilhas pelo PaxFlow?</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div class="p-6 rounded-3xl bg-white/5 border border-white/10">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] font-bold rounded-lg uppercase tracking-wider mb-4">❌ Como é hoje</span>
                <ul class="space-y-3 text-sm text-slate-400 font-medium">
                  <li class="flex items-start gap-2"><span class="text-rose-400 shrink-0">✕</span>Informações fragmentadas de localizadores de voo (LOC) e reservas.</li>
                  <li class="flex items-start gap-2"><span class="text-rose-400 shrink-0">✕</span>Falhas no monitoramento de datas de vencimento de passaportes e vistos.</li>
                  <li class="flex items-start gap-2"><span class="text-rose-400 shrink-0">✕</span>Esquecimento de saldos e créditos de reembolso com cias aéreas.</li>
                  <li class="flex items-start gap-2"><span class="text-rose-400 shrink-0">✕</span>Perda de orçamentos e leads no WhatsApp de consultores.</li>
                </ul>
              </div>
              <div class="p-6 rounded-3xl bg-gradient-to-br from-fuchsia-500/10 to-sky-500/5 border border-fuchsia-500/20">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded-lg uppercase tracking-wider mb-4">✅ Com o PaxFlow</span>
                <ul class="space-y-3 text-sm text-slate-300 font-medium">
                  <li class="flex items-start gap-2"><span class="text-emerald-400 shrink-0">✓</span>Painel comercial com faturamento e markups consolidados.</li>
                  <li class="flex items-start gap-2"><span class="text-emerald-400 shrink-0">✓</span>Monitoramento de SLAs com alertas automáticos antecipados.</li>
                  <li class="flex items-start gap-2"><span class="text-emerald-400 shrink-0">✓</span>Automações inteligentes de fluxo e transições de status.</li>
                  <li class="flex items-start gap-2"><span class="text-emerald-400 shrink-0">✓</span>Fichas de clientes e central de reembolsos unificadas.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== Planos ===== -->
        <section id="planos" class="relative z-10 w-full py-20 px-6 border-t border-white/10">
          <div class="max-w-5xl mx-auto">
            <div class="text-center max-w-3xl mx-auto mb-12 space-y-3">
              <span class="px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-widest">Planos</span>
              <h2 class="text-3xl sm:text-4xl font-black tracking-tight">Escolha o plano ideal para a sua agência</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div class="p-6 rounded-3xl bg-white/5 border border-white/10">
                <h3 class="text-lg font-black text-white">Starter</h3>
                <p class="text-sm text-slate-400 mt-1">Para agências em início de profissionalização</p>
                <div class="mt-4 mb-6"><span class="text-3xl font-black text-white">R$ 197</span><span class="text-sm text-slate-400">/mês</span></div>
                <ul class="space-y-2.5 text-sm text-slate-300 font-medium">
                  <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span>Até 5 consultores</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span>Pipeline de orçamentos</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span>Alertas de passaporte e SLA</li>
                </ul>
                <button class="mt-6 w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase transition">Começar</button>
              </div>
              <div class="p-6 rounded-3xl bg-gradient-to-b from-fuchsia-600 to-rose-500 shadow-2xl shadow-fuchsia-600/30 relative">
                <span class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-slate-900 text-[9px] font-black uppercase tracking-wider">Mais Popular</span>
                <h3 class="text-lg font-black text-white">Profissional</h3>
                <p class="text-sm text-white/80 mt-1">Para agências em crescimento</p>
                <div class="mt-4 mb-6"><span class="text-3xl font-black text-white">R$ 397</span><span class="text-sm text-white/70">/mês</span></div>
                <ul class="space-y-2.5 text-sm text-white/90 font-medium">
                  <li class="flex items-center gap-2"><span class="text-white">✓</span>Consultores ilimitados</li>
                  <li class="flex items-center gap-2"><span class="text-white">✓</span>Todos os módulos + Digisac</li>
                  <li class="flex items-center gap-2"><span class="text-white">✓</span>Relatórios e Analytics</li>
                  <li class="flex items-center gap-2"><span class="text-white">✓</span>Itinerárioswhite-label</li>
                </ul>
                <button id="btn-plano-profissional" class="mt-6 w-full py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs uppercase transition">Começar agora</button>
              </div>
              <div class="p-6 rounded-3xl bg-white/5 border border-white/10">
                <h3 class="text-lg font-black text-white">Enterprise</h3>
                <p class="text-sm text-slate-400 mt-1">Para franquias e grandes operações</p>
                <div class="mt-4 mb-6"><span class="text-3xl font-black text-white">Sob consulta</span></div>
                <ul class="space-y-2.5 text-sm text-slate-300 font-medium">
                  <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span>Multi-franquia</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span>Suporte dedicado</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400">✓</span>Onboarding guiado</li>
                </ul>
                <button id="btn-plano-enterprise" class="mt-6 w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase transition">Falar conosco</button>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== FAQ ===== -->
        <section id="faq" class="relative z-10 w-full py-20 px-6 border-t border-white/10">
          <div class="max-w-4xl mx-auto space-y-10">
            <div class="text-center space-y-2">
              <span class="px-3 py-1 rounded-full bg-white/10 text-slate-300 border border-white/10 text-[10px] font-black uppercase tracking-widest">Tire suas dúvidas</span>
              <h2 class="text-3xl font-black tracking-tight">Perguntas Frequentes</h2>
            </div>
            <div class="space-y-4">
              <details class="group bg-white/5 border border-white/10 rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden" open>
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-white">Como funciona o Modo Demonstração?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-white/10 p-1.5 text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </span>
                </summary>
                <p class="mt-3 text-sm leading-relaxed text-slate-400 font-medium">É um ambiente de simulação completo e interativo, pré-populado com dados fictícios de clientes, viagens, reembolsos e escalas. Permite testar todas as telas e recursos em tempo real, sem cadastro prévio.</p>
              </details>
              <details class="group bg-white/5 border border-white/10 rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-white">Posso controlar a escala de todos os funcionários?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-white/10 p-1.5 text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </span>
                </summary>
                <p class="mt-3 text-sm leading-relaxed text-slate-400 font-medium">Sim! O módulo de Central Administrativa permite atribuir turnos, controlar saldos no Banco de Folgas e aprovar solicitações de trocas.</p>
              </details>
              <details class="group bg-white/5 border border-white/10 rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-white">Como funciona o alerta de passaportes e vistos?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-white/10 p-1.5 text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </span>
                </summary>
                <p class="mt-3 text-sm leading-relaxed text-slate-400 font-medium">O PaxFlow calcula a diferença entre a validade dos documentos e a data da viagem. Se a validade for inferior a 6 meses, gera alertas prioritários no Inbox.</p>
              </details>
              <details class="group bg-white/5 border border-white/10 rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
                  <h3 class="text-sm font-extrabold text-white">Como a página do cliente assume as cores da minha agência?</h3>
                  <span class="ml-1.5 shrink-0 rounded-full bg-white/10 p-1.5 text-white transition group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </span>
                </summary>
                <p class="mt-3 text-sm leading-relaxed text-slate-400 font-medium">Em Configurações, você envia sua logomarca e seleciona a cor primária. Todos os itinerários públicos passam a exibir seu logotipo e paleta automaticamente.</p>
              </details>
            </div>
          </div>
        </section>

        <!-- ===== FAQ / Brand scroll-anchor (integração com v1) ===== -->
        <section id="recursos" class="relative z-10 w-full bg-gradient-to-br from-fuchsia-900/30 via-slate-900 to-sky-900/30 py-20 px-6 border-t border-white/10 text-center">
          <div class="max-w-3xl mx-auto space-y-6">
            <span class="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-widest">Leve sua agência para o próximo nível</span>
            <h2 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight">Pronto para revolucionar a operação da sua agência?</h2>
            <p class="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">Assuma o controle total dos pós-vendas, reembolsos, SLAs de vistos e escalas da sua equipe.</p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button id="btn-cta-demo-final" class="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 shadow-xl hover:scale-[1.03] transition-transform">Modo Demonstração</button>
              <button id="btn-cta-whatsapp-final" class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 transition">Falar com Consultor</button>
              <button id="btn-cta-login-final" class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs tracking-wider uppercase border border-white/15 transition">Acessar Sistema Real</button>
            </div>
          </div>
        </section>

        <!-- ===== Footer ===== -->
        <footer class="relative z-10 w-full border-t border-white/10 py-6 px-6 text-center text-xs text-slate-500 font-medium">
          <p>© 2026 PaxFlow. Todos os direitos reservados. Sistema Especializado em CRM & Pós-Venda Turístico.</p>
        </footer>

        <!-- Floating WhatsApp FAB -->
        <a id="btn-floating-whatsapp" href="https://wa.me/5511966989160?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20PaxFlow%20para%20minha%20ag%C3%AAncia." target="_blank" class="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-full shadow-2xl border border-emerald-400/40 transition-all flex items-center gap-2.5">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
          </span>
          <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654z"/></svg>
          <span>Falar com Especialista</span>
        </a>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const handleStartDemo = () => {
      (window as any).paxflowSandbox = true;
      sessionStorage.setItem('paxflowSandbox', 'true');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sandbox-')) localStorage.removeItem(key);
      });
      window.dispatchEvent(new CustomEvent('paxflow-navigate-to-demo'));
    };

    const handleAcessarReal = () => {
      (window as any).paxflowSandbox = false;
      sessionStorage.removeItem('paxflowSandbox');
      window.location.hash = '';
      window.location.search = '';
      window.location.pathname = '/';
    };

    const handleWhatsApp = () => {
      window.open('https://wa.me/5511966989160?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20PaxFlow%20para%20minha%20ag%C3%AAncia.', '_blank');
    };

    document.getElementById('btn-iniciar-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-acessar-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-conhecer-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-cta-demo-final')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-cta-login-final')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-cta-whatsapp-final')?.addEventListener('click', handleWhatsApp);
    document.getElementById('btn-header-whatsapp')?.addEventListener('click', handleWhatsApp);
    document.getElementById('btn-plano-profissional')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-plano-enterprise')?.addEventListener('click', handleWhatsApp);

    const tabs = ['dashboard', 'viagens', 'orcamentos', 'inbox', 'escala', 'reembolsos', 'relatorios', 'publicas'];
    const pathTexts: Record<string, string> = {
      dashboard: 'PaxFlow - Painel de Controle',
      viagens: 'PaxFlow - Operação de Viagens',
      orcamentos: 'PaxFlow - Funil de Orçamentos',
      inbox: 'PaxFlow - Central de Mensagens e Alertas',
      escala: 'PaxFlow - Controle de Escala da Equipe',
      reembolsos: 'PaxFlow - Gestão de Reembolsos',
      relatorios: 'PaxFlow - Relatórios Gerenciais',
      publicas: 'PaxFlow - Itinerário Digital do Passageiro'
    };

    const baseTab = "px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 text-slate-400 hover:text-white transition";
    const activeTab = "px-4 py-2 text-[10px] font-black tracking-wider uppercase rounded-2xl flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-rose-500 text-white shadow-lg";

    let currentTabIndex = 0;
    let autoTabTimer: any = null;

    const switchTab = (tabName: string) => {
      tabs.forEach(t => {
        const b = document.getElementById(`tab-btn-${t}`);
        if (b) b.className = baseTab;
        document.getElementById(`panel-${t}`)?.classList.add('hidden');
      });
      const btn = document.getElementById(`tab-btn-${tabName}`);
      if (btn) btn.className = activeTab;
      document.getElementById(`panel-${tabName}`)?.classList.remove('hidden');
      const pathEl = document.getElementById('window-path-text');
      if (pathEl) pathEl.textContent = pathTexts[tabName];
    };

    tabs.forEach((tab, index) => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      btn?.addEventListener('click', () => {
        if (autoTabTimer) { clearInterval(autoTabTimer); autoTabTimer = null; }
        currentTabIndex = index;
        switchTab(tab);
      });
    });

    autoTabTimer = setInterval(() => {
      currentTabIndex = (currentTabIndex + 1) % tabs.length;
      switchTab(tabs[currentTabIndex]);
    }, 3000);
  }
}
