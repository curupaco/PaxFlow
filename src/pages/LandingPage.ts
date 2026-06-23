export class LandingPage {
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
      <div class="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col relative overflow-hidden">
        
        <!-- Background Decorative Gradients -->
        <div class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div class="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] bg-emerald-900/10 rounded-full blur-[150px] pointer-events-none"></div>

        <!-- Top Header Navigation -->
        <header class="w-full bg-slate-900/60 backdrop-blur-lg border-b border-slate-800/80 sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="PaxFlow Logo" class="h-9 w-9 object-contain filter drop-shadow-md shrink-0" />
            <span class="text-lg font-black text-white tracking-tight">PaxFlow</span>
          </div>
          <div class="flex items-center gap-3">
            <button id="btn-acessar-login" class="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white font-extrabold text-xs tracking-wider rounded-xl border border-slate-700/50 hover:border-slate-600 transition uppercase shadow-inner">
              Acessar Plataforma
            </button>
          </div>
        </header>

        <!-- Hero Section -->
        <main class="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center max-w-5xl mx-auto relative z-10">
          
          <!-- Badge -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-black text-[10px] uppercase tracking-widest rounded-full mb-6 animate-pulse">
            <span>✨</span> Apresentação Comercial PaxFlow
          </div>

          <!-- Headline -->
          <h1 class="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
            O Controle Operacional que Sua <br class="hidden md:block"/>
            <span class="bg-gradient-to-r from-indigo-400 via-indigo-500 to-emerald-400 bg-clip-text text-transparent">Agência de Viagens</span> Precisa
          </h1>

          <!-- Subtitle -->
          <p class="text-base md:text-xl text-slate-400 font-medium max-w-3xl mb-10 leading-relaxed">
            Elimine planilhas paralelas. Gerencie pós-vendas, automatize alertas de SLA de passaportes, controle reembolsos de forma integrada e acompanhe a rentabilidade em tempo real.
          </p>

          <!-- CTAs -->
          <div class="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full justify-center">
            <button id="btn-iniciar-demo" class="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm tracking-widest rounded-2xl shadow-xl shadow-indigo-600/25 transition-all transform hover:-translate-y-1 uppercase flex items-center justify-center gap-2">
              <span>🚀</span> Experimentar PaxFlow (Modo Demo)
            </button>
            <button id="btn-conhecer-login" class="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-extrabold text-sm tracking-widest rounded-2xl border border-slate-800 hover:border-slate-700 transition-all transform hover:-translate-y-1 uppercase">
              Entrar no Sistema Real
            </button>
          </div>

          <!-- Interactive UI Dashboard Mockup (Pure CSS) -->
          <div class="w-full bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-4 md:p-6 text-left relative overflow-hidden backdrop-blur-md">
            
            <!-- Window header -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 bg-rose-500 rounded-full"></span>
                <span class="w-3 h-3 bg-amber-500 rounded-full"></span>
                <span class="w-3 h-3 bg-emerald-500 rounded-full"></span>
                <span class="text-[10px] text-slate-500 font-bold ml-2">paxflow-demonstracao-dashboard.html</span>
              </div>
              <div class="flex gap-2">
                <span class="px-2 py-0.5 bg-slate-800/80 text-slate-400 font-black text-[9px] rounded-lg">MODO DEMONSTRAÇÃO</span>
              </div>
            </div>

            <!-- Dashboard Mini Emulation -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <!-- Left Col: Stats -->
              <div class="md:col-span-1 space-y-4">
                <div class="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Faturamento do Mês</span>
                  <div class="flex items-baseline gap-2 mt-1">
                    <span class="text-2xl font-black text-white">R$ 23.700,00</span>
                    <span class="text-[10px] text-emerald-400 font-extrabold">+18.2%</span>
                  </div>
                </div>
                <div class="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider block">SLAs Urgentes</span>
                  <div class="flex items-baseline gap-2 mt-1">
                    <span class="text-2xl font-black text-amber-500">01 Ativo</span>
                    <span class="text-[10px] text-slate-500">Passaporte vence em 45d</span>
                  </div>
                </div>
              </div>

              <!-- Right Col: Tabular Grid Mockup -->
              <div class="md:col-span-2 bg-slate-950/40 border border-slate-800/60 rounded-xl p-4">
                <div class="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                  <span class="text-xs font-black text-slate-300">Tabela Operacional de Viagens (Fictive)</span>
                  <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-black rounded-lg">Pós-Venda</span>
                </div>
                <div class="space-y-2">
                  <!-- Row 1 -->
                  <div class="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs hover:border-slate-700 transition">
                    <div>
                      <span class="block font-black text-white">João da Silva Fictício</span>
                      <span class="block text-[10px] text-slate-500">Destino: Terra do Nunca • LOC: LOCFAK1</span>
                    </div>
                    <div class="text-right">
                      <span class="block font-black text-slate-300">R$ 3.500,00</span>
                      <span class="block text-[9px] text-amber-400 font-extrabold uppercase">✈️ Pré-Embarque</span>
                    </div>
                  </div>
                  <!-- Row 2 -->
                  <div class="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs hover:border-slate-700 transition">
                    <div>
                      <span class="block font-black text-white">Maria de Orlando Fake</span>
                      <span class="block text-[10px] text-slate-500">Destino: El Dorado • LOC: LOCFAK2</span>
                    </div>
                    <div class="text-right">
                      <span class="block font-black text-slate-300">R$ 8.200,00</span>
                      <span class="block text-[9px] text-emerald-400 font-extrabold uppercase">🚐 Pós-Viagem</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </main>

        <!-- Pillars / Benefits Section -->
        <section class="w-full bg-slate-900/30 border-t border-slate-900/80 py-16 px-6 relative z-10">
          <div class="max-w-5xl mx-auto">
            <h2 class="text-2xl md:text-3xl font-black text-white tracking-tight text-center mb-12">
              Pilares Fundamentais do PaxFlow
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <!-- Pillar 1 -->
              <div class="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                <div class="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center text-xl mb-4 font-bold">📋</div>
                <h3 class="text-lg font-black text-white mb-2">Tabela Operacional</h3>
                <p class="text-xs text-slate-400 leading-relaxed font-medium">Acompanhe todas as viagens segmentadas por abas de status inteligentes (Pós-Venda, Pré-Embarque, Pós-Viagem, Reembolso) com facilidade.</p>
              </div>

              <!-- Pillar 2 -->
              <div class="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                <div class="w-10 h-10 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-center justify-center text-xl mb-4 font-bold">⚠️</div>
                <h3 class="text-lg font-black text-white mb-2">Controle de SLAs</h3>
                <p class="text-xs text-slate-400 leading-relaxed font-medium">Alertas automáticos avisam quando a validade dos passaportes dos passageiros está em risco ou quando processos operacionais estão pendentes.</p>
              </div>

              <!-- Pillar 3 -->
              <div class="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                <div class="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center text-xl mb-4 font-bold">💬</div>
                <h3 class="text-lg font-black text-white mb-2">Central Inbox P2P</h3>
                <p class="text-xs text-slate-400 leading-relaxed font-medium">Comunicação e compartilhamento de alertas direto entre consultores e coordenação operacional por meio de mensagens diretas e threads.</p>
              </div>

            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="w-full bg-slate-950 border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500 font-semibold relative z-10">
          <p>© 2026 PaxFlow Systems. Todos os direitos reservados. Sandbox de dados fictícios para fins de apresentação comercial.</p>
        </footer>

      </div>
    `;
  }

  private setupEventListeners(): void {
    const handleStartDemo = () => {
      // Ativa flag sandbox
      (window as any).paxflowSandbox = true;
      sessionStorage.setItem('paxflowSandbox', 'true');

      // Limpa chaves anteriores de sandbox do localStorage para forçar reset ao iniciar demo ("reiniciou, perdeu")
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sandbox-')) {
          localStorage.removeItem(key);
        }
      });

      // Redireciona disparando navegação interna
      window.dispatchEvent(new CustomEvent('paxflow-navigate-to-demo'));
    };

    const handleAcessarReal = () => {
      // Desativa flag de sandbox
      (window as any).paxflowSandbox = false;
      sessionStorage.removeItem('paxflowSandbox');
      
      // Dispara redirecionamento para raiz do app
      window.location.hash = '';
      window.location.search = '';
      window.location.pathname = '/';
    };

    document.getElementById('btn-iniciar-demo')?.addEventListener('click', handleStartDemo);
    document.getElementById('btn-acessar-login')?.addEventListener('click', handleAcessarReal);
    document.getElementById('btn-conhecer-login')?.addEventListener('click', handleAcessarReal);
  }
}
