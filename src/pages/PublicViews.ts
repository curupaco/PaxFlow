import { supabase } from '../services/supabase';
import { showCustomAlert } from '../services/dialog';


// Injeta estilos premium para as views públicas (itinerário e NPS) no DOM
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .public-glass {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(226, 232, 240, 0.8);
    }
    html.dark .public-glass {
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.5);
    }
    .timeline-badge {
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
    }
    html.dark .timeline-badge {
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3);
    }
  `;
  document.head.appendChild(style);
}

export class PublicViews {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Inicializa a visualização do itinerário público
   */
  public async initItinerario(viagemId: string): Promise<void> {
    this.renderLoading('Carregando seu itinerário...');

    try {
      // Buscar configurações de marca da agência
      const { data: settings } = await supabase
        .from('global_settings')
        .select('*')
        .maybeSingle();

      if (settings) {
        this.applyBrandingStyle(settings);
      }

      // Chama a função RPC de segurança do PostgreSQL
      const { data, error } = await supabase.rpc('obter_itinerario_publico', {
        viagem_uuid: viagemId
      });

      if (error || !data) {
        throw new Error(error?.message || 'Viagem não encontrada ou código inválido.');
      }

      this.renderItinerario(data, settings);
    } catch (err: any) {
      console.error('Erro ao buscar itinerário público:', err);
      this.renderError('Não foi possível carregar seu itinerário de viagem.', err.message);
    }
  }

  /**
   * Inicializa a visualização da pesquisa NPS
   */
  public async initNps(viagemId: string): Promise<void> {
    this.renderLoading('Carregando pesquisa...');

    try {
      // Buscar configurações de marca da agência
      const { data: settings } = await supabase
        .from('global_settings')
        .select('*')
        .maybeSingle();

      if (settings) {
        this.applyBrandingStyle(settings);
      }

      const { data, error } = await supabase.rpc('obter_itinerario_publico', {
        viagem_uuid: viagemId
      });

      if (error || !data) {
        throw new Error(error?.message || 'Dados de viagem inválidos para esta pesquisa.');
      }

      this.renderNpsForm(data, viagemId, settings);
    } catch (err: any) {
      console.error('Erro ao carregar formulário NPS:', err);
      this.renderError('Não foi possível carregar esta pesquisa de avaliação.', err.message);
    }
  }

  /**
   * Applies the agency's primary color as dynamic style overrides
   */
  private applyBrandingStyle(settings: any): void {
    if (!settings) return;
    
    const primaryColor = settings.agency_primary_color || settings.agencyPrimaryColor || '#4f46e5';
    
    let styleEl = document.getElementById('public-branding-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'public-branding-style';
      document.head.appendChild(styleEl);
    }
    
    styleEl.innerHTML = `
      :root {
        --public-primary: ${primaryColor};
      }
      .text-indigo-600 { color: ${primaryColor} !important; }
      .bg-indigo-600 { background-color: ${primaryColor} !important; }
      .bg-indigo-700 { background-color: ${primaryColor} !important; }
      .bg-indigo-800 { background-color: ${primaryColor}e6 !important; }
      .from-indigo-700 { --tw-gradient-from: ${primaryColor} !important; --tw-gradient-to: ${primaryColor}cc !important; }
      .via-indigo-800 { --tw-gradient-via: ${primaryColor}d9 !important; }
      .to-purple-800 { --tw-gradient-to: ${primaryColor}bf !important; }
      .text-indigo-200\\/90 { color: #ffffffcc !important; }
      .bg-indigo-900\\/40 { background-color: rgba(255, 255, 255, 0.1) !important; }
      .border-indigo-500\\/20 { border-color: rgba(255, 255, 255, 0.2) !important; }
      .focus\\:ring-indigo-500:focus { --tw-ring-color: ${primaryColor} !important; }
      .border-indigo-600 { border-color: ${primaryColor} !important; }
      .bg-indigo-600\\/20 { background-color: ${primaryColor}33 !important; }
      .bg-indigo-600\\/10 { background-color: ${primaryColor}1a !important; }
      .hover\\:bg-indigo-700:hover { filter: brightness(0.9); background-color: ${primaryColor} !important; }
      .indigo-pill { background-color: ${primaryColor} !important; }
      .timeline-badge { border-color: ${primaryColor}40 !important; color: ${primaryColor} !important; background-color: ${primaryColor}0a !important; }
      .bg-indigo-50 { background-color: ${primaryColor}0f !important; }
      .text-indigo-400 { color: ${primaryColor} !important; }
      .border-indigo-150 { border-color: ${primaryColor}20 !important; }
    `;
  }

  /**
   * Renderiza tela de carregamento elegante
   */
  private renderLoading(msg: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center transition-colors duration-200">
        <div class="w-12 h-12 border-3 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-sm font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest animate-pulse">${msg}</p>
      </div>
    `;
  }

  /**
   * Renderiza tela de erro com design glassmorphic
   */
  private renderError(titulo: string, detalhe: string): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-200">
        <div class="public-glass p-8 rounded-3xl max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
          <div class="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-rose-100 dark:border-rose-900/30">
            ⚠️
          </div>
          <h2 class="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">${titulo}</h2>
          <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-2">${detalhe}</p>
          <a href="#" class="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider rounded-xl transition shadow-lg shadow-indigo-600/20 uppercase">
            Acessar PaxFlow
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza a página do itinerário de viagem
   */
  private renderItinerario(data: any, settings?: any): void {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataIda = new Date(data.data_ida);
    dataIda.setHours(0, 0, 0, 0);
    const dataVolta = new Date(data.data_volta);
    dataVolta.setHours(0, 0, 0, 0);

    // Cálculo da contagem regressiva
    const diffTime = dataIda.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let countdownHTML = '';
    if (diffDays > 0) {
      countdownHTML = `
        <div class="public-glass p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-200 dark:border-slate-800 mb-6 animate-fade-in relative overflow-hidden">
          <div class="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-600 dark:bg-indigo-500"></div>
          <span class="text-3xl shrink-0">⏳</span>
          <div>
            <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-200">Faltam ${diffDays} dias para o embarque!</h3>
            <p class="text-[11px] text-slate-400 dark:text-slate-400 font-medium mt-0.5">Sua contagem regressiva para ${data.destino} começou.</p>
          </div>
        </div>
      `;
    } else if (hoje >= dataIda && hoje <= dataVolta) {
      countdownHTML = `
        <div class="public-glass p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-200 dark:border-slate-800 mb-6 animate-fade-in relative overflow-hidden">
          <div class="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500"></div>
          <span class="text-3xl shrink-0">✈️</span>
          <div>
            <h3 class="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Você está em viagem!</h3>
            <p class="text-[11px] text-slate-400 dark:text-slate-400 font-medium mt-0.5">Aproveite ao máximo a sua estadia em ${data.destino}.</p>
          </div>
        </div>
      `;
    }

    const formatarDataAmigavel = (dStr: string) => {
      const parts = dStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Garante que showCustomAlert esteja disponível globalmente para handlers inline
    (window as any).showCustomAlert = showCustomAlert;

    // Configuração oficial do canal de suporte do viajante
    const passageiro = data.cliente_nome || 'Passageiro';
    const destino = data.destino || 'minha viagem';
    const loc = data.codigo_localizador || 'S/N';
    const consultor = data.consultor_nome || 'meu consultor';
    const msgWhatsApp = `Olá! Sou ${passageiro} da viagem para ${destino} (Localizador: ${loc}). Gostaria de falar com meu consultor ${consultor}.`;
    const whatsappOficial = '551130907070';
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappOficial}&text=${encodeURIComponent(msgWhatsApp)}`;

    // Renderização dos produtos na linha do tempo com selo de serviço confirmado
    let timelineHTML = '';
    if (data.produtos && data.produtos.length > 0) {
      timelineHTML = data.produtos.map((p: any, idx: number) => {
        let icone = '📦';
        if (p.tipo.toLowerCase().includes('voo') || p.tipo.toLowerCase().includes('aereo')) icone = '✈️';
        else if (p.tipo.toLowerCase().includes('hotel') || p.tipo.toLowerCase().includes('hospedagem')) icone = '🏨';
        else if (p.tipo.toLowerCase().includes('seguro')) icone = '🛡️';
        else if (p.tipo.toLowerCase().includes('passeio') || p.tipo.toLowerCase().includes('ingresso') || p.tipo.toLowerCase().includes('tour')) icone = '🎟️';
        else if (p.tipo.toLowerCase().includes('carro') || p.tipo.toLowerCase().includes('aluguel') || p.tipo.toLowerCase().includes('trans')) icone = '🚗';

        return `
          <div class="relative pl-8 pb-8 last:pb-0">
            <!-- Linha vertical da timeline -->
            ${idx !== data.produtos.length - 1 ? '<div class="absolute left-3.5 top-7 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800"></div>' : ''}
            
            <!-- Badge redondo -->
            <div class="timeline-badge absolute left-0 top-0.5 w-7.5 h-7.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center text-sm z-10 select-none">
              ${icone}
            </div>
            
            <!-- Conteúdo do card -->
            <div class="public-glass p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition transform hover:scale-[1.01]">
              <div class="flex items-center justify-between gap-2 flex-wrap mb-2">
                <span class="inline-flex px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase rounded-md tracking-wider border border-indigo-100/30 dark:border-indigo-900/30">
                  ${p.tipo}
                </span>
                <span class="text-[10px] text-slate-400 dark:text-slate-400 font-bold">
                  📅 ${formatarDataAmigavel(p.data_servico)}
                </span>
              </div>
              
              <h4 class="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight">${p.fornecedor}</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 leading-relaxed">${p.descricao}</p>
              
              <!-- Selo de confirmação e emissão -->
              <div class="mt-3 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20">
                  <svg class="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  Serviço Confirmado &amp; Emitido
                </span>

                ${p.codigo_reserva ? `
                  <div class="flex items-center gap-1.5 ml-auto">
                    <span class="text-[9px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Localizador:</span>
                    <span id="loc-code-${idx}" class="text-xs font-black text-slate-800 dark:text-slate-300 font-mono tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md select-all">${p.codigo_reserva}</span>
                    <button onclick="navigator.clipboard.writeText('${p.codigo_reserva}'); showCustomAlert('Código localizador copiado para a área de transferência!', 'Copiado');" class="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition" title="Copiar localizador">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z"/></svg>
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      timelineHTML = `
        <div class="public-glass p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-medium italic">
          Nenhum detalhe ou voucher inserido até o momento.
        </div>
      `;
    }

    // Card do consultor reformulado com número oficial e botão direto
    let consultorHTML = '';
    if (data.consultor_nome) {
      const avatarSVG = data.consultor_avatar 
        ? `<img src="${data.consultor_avatar}" class="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0" />`
        : `<div class="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-lg shrink-0 select-none">${data.consultor_nome.charAt(0)}</div>`;

      consultorHTML = `
        <div class="public-glass p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 mt-6 flex flex-col gap-4">
          <div class="flex items-center gap-4">
            ${avatarSVG}
            <div class="flex-1 min-w-0">
              <span class="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Seu Consultor Dedicado</span>
              <h4 class="text-sm font-black text-slate-800 dark:text-slate-200 truncate leading-snug">${data.consultor_nome}</h4>
              <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                WhatsApp Oficial: (11) 3090-7070
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-[0.98]">
              <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.777 1.451 5.51 0 9.997-4.493 10-10.008.002-2.673-1.037-5.186-2.93-7.079-1.892-1.893-4.401-2.934-7.078-2.934-5.518 0-10.007 4.493-10.01 10.01-.001 1.708.455 3.377 1.32 4.887L1.134 22.84l4.513-1.186zm11.23-7.925c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.669.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
              <span>WhatsApp</span>
            </a>
            <a href="tel:+551130907070" class="py-3 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-[0.98]">
              <svg class="w-4 h-4 fill-none stroke-current shrink-0" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
              <span>Ligar Agora</span>
            </a>
          </div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 pb-20">
        <!-- Banner Superior com Degradê e Glassmorphism -->
        <header class="relative bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-800 text-white py-10 px-6 overflow-hidden">
          <div class="absolute inset-0 bg-grid-white/[0.05] pointer-events-none"></div>
          <div class="max-w-md mx-auto w-full relative z-10 flex flex-col items-center text-center">
            ${settings?.agency_logo_url ? `
              <div class="mb-4">
                <img src="${settings.agency_logo_url}" class="max-h-12 max-w-[200px] object-contain rounded bg-white/10 p-1 backdrop-blur-sm" />
              </div>
            ` : `
              <span class="text-xs font-black uppercase tracking-widest text-indigo-200/90 bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-500/20 mb-4 select-none">
                ${settings?.agency_name || 'Itinerário de Viagem'}
              </span>
            `}
            <h1 class="text-3xl font-black tracking-tight">${data.destino}</h1>
            <p class="text-xs text-indigo-100/80 font-semibold mt-1">Período: ${formatarDataAmigavel(data.data_ida)} até ${formatarDataAmigavel(data.data_volta)}</p>
            ${data.codigo_localizador ? `
              <span class="inline-block mt-3 px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl text-[10px] font-mono tracking-widest text-white border border-white/10 uppercase select-all">
                LOC Geral: ${data.codigo_localizador}
              </span>
            ` : ''}

            <!-- Botões de Ação Rápida no Topo -->
            <div class="flex items-center justify-center gap-2 mt-5 w-full">
              <button id="btn-share-itinerary" class="flex-1 py-2 px-3 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-md border border-white/15 transition flex items-center justify-center gap-1.5 shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/></svg>
                Compartilhar
              </button>
              <button id="btn-copy-summary" class="flex-1 py-2 px-3 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-md border border-white/15 transition flex items-center justify-center gap-1.5 shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v2.25A2.25 2.25 0 0113.5 21.75h-7.5A2.25 2.25 0 013.75 19.5V8.25A2.25 2.25 0 016 6h2.25m3 3h7.5A2.25 2.25 0 0121 11.25v8.25A2.25 2.25 0 0118.75 21.75h-7.5A2.25 2.25 0 019 19.5V11.25A2.25 2.25 0 0111.25 9z"/></svg>
                Copiar Resumo
              </button>
            </div>
          </div>
        </header>

        <!-- Container de Conteúdo -->
        <main class="max-w-md mx-auto w-full px-4 py-6 flex flex-col gap-1">
          <!-- Alerta de contagem regressiva -->
          ${countdownHTML}

          <!-- Linha do Tempo de Serviços -->
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-4 pl-1">Cronograma de Serviços</h2>
          
          <div class="flex flex-col">
            ${timelineHTML}
          </div>

          <!-- Orientações Pré-Embarque e Checklist -->
          <div class="public-glass p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 mt-6">
            <div class="flex items-center gap-2.5 mb-3.5">
              <span class="text-xl">📋</span>
              <div>
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Orientações Pré-Embarque</h3>
                <p class="text-[10px] text-slate-400 font-medium">Recomendações importantes para uma viagem tranquila</p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-2.5">
              <div class="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                <span class="text-base shrink-0 mt-0.5">📄</span>
                <div>
                  <h4 class="text-xs font-black text-slate-800 dark:text-slate-200">Documentação Obrigatória</h4>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">
                    Tenha em mãos seu documento oficial original com foto (RG recente com menos de 10 anos ou Passaporte válido). Verifique também eventuais vistos e vacinas necessárias.
                  </p>
                </div>
              </div>

              <div class="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                <span class="text-base shrink-0 mt-0.5">⏰</span>
                <div>
                  <h4 class="text-xs font-black text-slate-800 dark:text-slate-200">Antecedência no Aeroporto</h4>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">
                    Apresente-se com no mínimo <strong>2 horas</strong> de antecedência para voos nacionais e <strong>3 horas</strong> para voos internacionais.
                  </p>
                </div>
              </div>

              <div class="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                <span class="text-base shrink-0 mt-0.5">🧳</span>
                <div>
                  <h4 class="text-xs font-black text-slate-800 dark:text-slate-200">Bagagem &amp; Normas de Bordo</h4>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">
                    Respeite as dimensões e peso da bagagem contratada. Objetos cortantes e recipientes de líquidos acima de 100ml devem ser despachados em voos ao exterior.
                  </p>
                </div>
              </div>

              <div class="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                <span class="text-base shrink-0 mt-0.5">🛡️</span>
                <div>
                  <h4 class="text-xs font-black text-slate-800 dark:text-slate-200">Seguro &amp; Assistência Médica</h4>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">
                    Mantenha o número da sua apólice e o contato da central de emergência 24h acessíveis no celular durante todo o período da viagem.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Card do Consultor -->
          ${consultorHTML}

          <div class="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-400 font-bold select-none pb-4">
            Gerado automaticamente por PaxFlow © 2026.
          </div>
        </main>

        <!-- Barra Flutuante de Suporte ao Viajante (WhatsApp Oficial e Ligação) -->
        <div class="fixed bottom-5 right-5 z-50 flex items-center p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full shadow-2xl border border-slate-200/80 dark:border-slate-800 gap-1.5">
          <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-black shadow-sm transition transform active:scale-95 group" title="Falar no WhatsApp">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.777 1.451 5.51 0 9.997-4.493 10-10.008.002-2.673-1.037-5.186-2.93-7.079-1.892-1.893-4.401-2.934-7.078-2.934-5.518 0-10.007 4.493-10.01 10.01-.001 1.708.455 3.377 1.32 4.887L1.134 22.84l4.513-1.186zm11.23-7.925c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.669.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            <span>WhatsApp</span>
          </a>
          <a href="tel:+551130907070" class="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-black shadow-sm transition transform active:scale-95 group" title="Ligar para o consultor">
            <svg class="w-4 h-4 fill-none stroke-current shrink-0" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
            <span>Ligar</span>
          </a>
        </div>
      </div>
    `;

    // Configuração dos ouvintes de eventos para botões de ação rápida
    const btnShare = this.container.querySelector('#btn-share-itinerary') as HTMLButtonElement | null;
    if (btnShare) {
      btnShare.onclick = async () => {
        const shareData = {
          title: `Itinerário de Viagem - ${data.destino}`,
          text: `Confira o itinerário completo da viagem para ${data.destino}:`,
          url: window.location.href,
        };

        if (navigator.share) {
          try {
            await navigator.share(shareData);
          } catch (err) {
            // Se o usuário cancelou o compartilhamento nativo, não faz nada
          }
        } else {
          navigator.clipboard.writeText(window.location.href).then(() => {
            showCustomAlert('Link do itinerário copiado para a área de transferência!', 'Link Copiado');
          }).catch(() => {
            showCustomAlert('Não foi possível copiar o link automaticamente.', 'Atenção');
          });
        }
      };
    }

    const btnCopySummary = this.container.querySelector('#btn-copy-summary') as HTMLButtonElement | null;
    if (btnCopySummary) {
      btnCopySummary.onclick = () => {
        let resumo = `✈️ ITINERÁRIO DE VIAGEM: ${data.destino.toUpperCase()}\n` +
          `📅 Período: ${formatarDataAmigavel(data.data_ida)} a ${formatarDataAmigavel(data.data_volta)}\n` +
          (data.codigo_localizador ? `🔖 Localizador Geral: ${data.codigo_localizador}\n` : '') +
          (data.consultor_nome ? `👤 Consultor: ${data.consultor_nome} (WhatsApp: (11) 3090-7070)\n` : '') +
          `\n📋 SERVIÇOS CONFIRMADOS:\n`;

        if (data.produtos && data.produtos.length > 0) {
          data.produtos.forEach((p: any, i: number) => {
            resumo += `${i + 1}. [${p.tipo}] ${p.fornecedor} - ${formatarDataAmigavel(p.data_servico)}${p.codigo_reserva ? ` (Localizador: ${p.codigo_reserva})` : ''}\n`;
          });
        } else {
          resumo += `Nenhum voucher detalhado cadastrado no momento.\n`;
        }

        resumo += `\n🔗 Link completo do itinerário: ${window.location.href}`;

        navigator.clipboard.writeText(resumo).then(() => {
          showCustomAlert('Resumo da viagem copiado com sucesso para a sua área de transferência!', 'Resumo Copiado');
        }).catch(() => {
          showCustomAlert('Não foi possível copiar o resumo automaticamente.', 'Atenção');
        });
      };
    }
  }

  /**
   * Renderiza a página do formulário NPS público
   */
  private renderNpsForm(data: any, viagemId: string, settings?: any): void {
    const consultorNome = data.consultor_nome || 'seu consultor';
    
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-200">
        <div class="public-glass p-6 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden animate-fade-in">
          
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

          <div class="text-center flex flex-col items-center mb-6 pt-3">
            ${settings?.agency_logo_url ? `
              <div class="mb-4">
                <img src="${settings.agency_logo_url}" class="max-h-12 max-w-[200px] object-contain rounded bg-white/5 p-1 border border-slate-200/30" />
              </div>
            ` : `
              <span class="text-3xl">🌟</span>
            `}
            <h1 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight mt-3">Sua opinião vale muito!</h1>
            <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">Como foi sua viagem para <span class="text-indigo-600 dark:text-indigo-400 font-black">${data.destino}</span> com o atendimento de <span class="font-bold">${consultorNome}</span>?</p>
          </div>

          <form id="form-public-nps" class="space-y-6">
            <!-- Escala NPS -->
            <div>
              <label class="block text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                De 0 a 10, qual a probabilidade de nos recomendar a um amigo?
              </label>
              
              <!-- Grid de Botões NPS -->
              <div class="grid grid-cols-6 gap-2 sm:grid-cols-11 sm:gap-1.5 justify-center">
                ${Array.from({ length: 11 }).map((_, i) => {
                  let colorClass = 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300';
                  if (i <= 6) {
                    // Detratores
                    colorClass += ' hover:text-rose-600 hover:border-rose-500 dark:hover:text-rose-400';
                  } else if (i <= 8) {
                    // Neutros
                    colorClass += ' hover:text-amber-600 hover:border-amber-500 dark:hover:text-amber-400';
                  } else {
                    // Promotores
                    colorClass += ' hover:text-emerald-600 hover:border-emerald-500 dark:hover:text-emerald-400';
                  }

                  return `
                    <button type="button" data-score="${i}" class="btn-nps-score h-10 border border-slate-200/50 dark:border-slate-800 rounded-xl flex items-center justify-center text-sm font-black transition-all ${colorClass}">
                      ${i}
                    </button>
                  `;
                }).join('')}
              </div>
              <input type="hidden" id="input-nps-score" required />
              
              <!-- Legendas -->
              <div class="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-400 font-black uppercase mt-2.5 px-1">
                <span>0 - Nunca recomendaria</span>
                <span>10 - Recomendo com certeza</span>
              </div>
            </div>

            <!-- Comentários Opcionais -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Conte-nos mais sobre sua experiência (opcional)
              </label>
              <textarea id="input-nps-comentarios" rows="3" placeholder="Sua opinião nos ajuda a evoluir..." class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-xs resize-none"></textarea>
            </div>

            <!-- Botão de Enviar -->
            <button id="btn-nps-submit" type="submit" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs tracking-wider rounded-xl transition shadow-lg shadow-indigo-600/20 uppercase flex items-center justify-center gap-2">
              Enviar Avaliação
            </button>
          </form>

        </div>
      </div>
    `;

    // Seleção de nota do NPS
    let selectedScore: number | null = null;
    const scoreButtons = document.querySelectorAll('.btn-nps-score');
    scoreButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const score = Number((e.currentTarget as HTMLElement).getAttribute('data-score'));
        selectedScore = score;
        
        // Reset classes
        scoreButtons.forEach(b => {
          b.classList.remove('bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'text-white', 'scale-110', 'border-transparent');
          b.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
        });

        // Highlight selected
        const targetBtn = e.currentTarget as HTMLElement;
        targetBtn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
        
        if (score <= 6) {
          targetBtn.classList.add('bg-rose-500', 'text-white', 'scale-110', 'border-transparent');
        } else if (score <= 8) {
          targetBtn.classList.add('bg-amber-500', 'text-white', 'scale-110', 'border-transparent');
        } else {
          targetBtn.classList.add('bg-emerald-500', 'text-white', 'scale-110', 'border-transparent');
        }

        (document.getElementById('input-nps-score') as HTMLInputElement).value = String(score);
      });
    });

    // Submissão do formulário
    const form = document.getElementById('form-public-nps') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (selectedScore === null) {
        showCustomAlert('Por favor, selecione uma nota de 0 a 10 antes de enviar.', 'Avaliação Requerida');
        return;
      }

      const submitBtn = document.getElementById('btn-nps-submit') as HTMLButtonElement;
      const comentarios = (document.getElementById('input-nps-comentarios') as HTMLTextAreaElement).value;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      try {
        const { error } = await supabase
          .from('feedbacks_nps')
          .insert({
            viagem_id: viagemId,
            cliente_id: data.cliente_id,
            consultor_id: data.consultor_id || null,
            nps_rating: selectedScore,
            comentarios: comentarios || null
          });

        if (error) throw error;

        // Atualiza a viagem no banco com a nota NPS e finaliza o SLA pós-viagem
        try {
          await supabase
            .from('viagens')
            .update({
              nps_nota: selectedScore,
              nps_respondido: true,
              nps_respondido_em: new Date().toISOString(),
              pos_contato_concluido: true,
              status: 'concluida',
              updated_at: new Date().toISOString()
            })
            .eq('id', viagemId);
        } catch (vErr) {
          console.warn('Aviso ao atualizar viagem com resposta do NPS:', vErr);
        }

        // Renderiza tela de obrigado
        this.renderObrigado(data);
      } catch (err: any) {
        console.error('Erro ao enviar feedback:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Avaliação';
        showCustomAlert(`Ocorreu um erro ao enviar sua avaliação: ${err.message || 'Tente novamente em instantes.'}`, 'Erro no Envio');
      }
    });
  }

  /**
   * Renderiza a tela de obrigado após preenchimento do NPS
   */
  private renderObrigado(data: any): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-200">
        <div class="public-glass p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-slate-800/80 text-center flex flex-col items-center relative overflow-hidden animate-fade-in">
          
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

          <div class="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-emerald-100 dark:border-emerald-900/30">
            🙏
          </div>
          <h2 class="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">Muito obrigado pelo feedback!</h2>
          <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-3 leading-relaxed">
            Sua opinião sobre a viagem para <span class="font-bold text-indigo-600 dark:text-indigo-400">${data.destino}</span> foi enviada e nos ajudará a aprimorar cada vez mais nossa consultoria de viagens.
          </p>
          
          <div class="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-400 font-bold select-none">
            PaxFlow © 2026.
          </div>
        </div>
      </div>
    `;
  }
}
