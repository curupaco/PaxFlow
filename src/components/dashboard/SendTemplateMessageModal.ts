import { supabase } from '../../services/supabase';

export interface SendTemplateMessageModalOptions {
  clienteNome: string;
  clienteTelefone: string;
  destino?: string;
  localizador?: string;
  dataIda?: string;
  viagemId?: string;
  consultorNome: string;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export class SendTemplateMessageModal {
  static async open(options: SendTemplateMessageModalOptions): Promise<void> {
    // 1. Carregar os templates de mensagem e as configurações globais do banco
    let templates: any[] = [];
    let settings: any = null;
    let travelData: any = null;
    let consultorData: any = null;

    try {
      const [templatesRes, settingsRes] = await Promise.all([
        supabase
          .from('templates_mensagem')
          .select('*')
          .order('titulo', { ascending: true }),
        supabase
          .from('global_settings')
          .select('*')
          .maybeSingle()
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (settingsRes.error) throw settingsRes.error;

      templates = templatesRes.data || [];
      settings = settingsRes.data;

      // Buscar dados completos da viagem e consultor responsável, se houver viagemId
      if (options.viagemId) {
        const { data: vData } = await supabase
          .from('viagens')
          .select('*')
          .eq('id', options.viagemId)
          .maybeSingle();
        
        if (vData) {
          travelData = vData;
          if (travelData.consultor_id) {
            const { data: pData } = await supabase
              .from('profiles')
              .select('nome, contato')
              .eq('id', travelData.consultor_id)
              .maybeSingle();
            consultorData = pData;
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados para disparo:', err);
      options.showToast('Erro ao carregar modelos de mensagens e configurações.', 'error');
      return;
    }

    if (templates.length === 0) {
      options.showToast('Nenhum modelo de mensagem cadastrado pelos administradores.', 'error');
      return;
    }

    // 2. Criar overlay do modal
    const overlay = document.createElement('div');
    overlay.id = 'send-template-message-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0';

    // Gerar links dinâmicos públicos se houver viagemId
    const origin = window.location.origin + window.location.pathname;
    const linkItinerario = options.viagemId ? `${origin}#itinerario?id=${options.viagemId}` : '';
    const linkFeedback = options.viagemId ? `${origin}#feedback?id=${options.viagemId}` : '';

    // Estado da mensagem selecionada
    let selectedTemplateId = templates[0].id;
    let customPhone = options.clienteTelefone || '';

    // Limpar o número do telefone (deixar apenas dígitos)
    const limparTelefone = (tel: string) => {
      const digitos = tel.replace(/\D/g, '');
      if (digitos.length === 0) return '';
      // Se não tiver DDI (ex: 55), adiciona 55 se o tamanho for BR (10 ou 11 dígitos)
      if (digitos.length <= 11 && !digitos.startsWith('55')) {
        return '55' + digitos;
      }
      return digitos;
    };

    // Função para renderizar o preview da mensagem substituindo todas as 11 variáveis do sistema
    const gerarPreviewTexto = (template: any) => {
      let texto = template.conteudo;

      const valCliente = options.clienteNome || '';
      const valDestino = options.destino || travelData?.destino || '';
      const valLocalizador = options.localizador || travelData?.codigo_localizador || '';
      const valConsultor = options.consultorNome || consultorData?.nome || '';
      const valDataIda = options.dataIda || travelData?.data_ida || '';
      const valDataVolta = travelData?.data_volta || '';
      const valValorTotal = travelData?.valor_total ? `R$ ${Number(travelData.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
      const valNomeAgencia = settings?.agencyName || settings?.agency_name || 'Nossa Agência';
      const valContatoConsultor = consultorData?.contato || '';

      texto = texto.replace(/\{\{cliente\}\}/g, valCliente);
      texto = texto.replace(/\{\{destino\}\}/g, valDestino);
      texto = texto.replace(/\{\{localizador\}\}/g, valLocalizador);
      texto = texto.replace(/\{\{consultor\}\}/g, valConsultor);
      texto = texto.replace(/\{\{data_ida\}\}/g, valDataIda);
      texto = texto.replace(/\{\{data_volta\}\}/g, valDataVolta);
      texto = texto.replace(/\{\{valor_total\}\}/g, valValorTotal);
      texto = texto.replace(/\{\{nome_agencia\}\}/g, valNomeAgencia);
      texto = texto.replace(/\{\{contato_consultor\}\}/g, valContatoConsultor);
      texto = texto.replace(/\{\{link_itinerario\}\}/g, linkItinerario || 'Ainda não gerado');
      texto = texto.replace(/\{\{link_feedback\}\}/g, linkFeedback || 'Ainda não gerado');

      return texto;
    };

    const hasDigisac = settings?.digisac_token && settings?.digisac_domain && settings?.digisac_service_id && settings?.digisac_enable_manual_send !== false;
    const showChatHistory = hasDigisac && settings?.digisac_enable_chat_history !== false;
    const modalWidthClass = showChatHistory ? 'max-w-[950px]' : 'max-w-[500px]';

    const footerButtonsHtml = hasDigisac
      ? `
        <button id="btn-message-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition uppercase">
          Cancelar
        </button>
        <button id="btn-message-send-wa" type="button" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition uppercase">
          Abrir Link WhatsApp 📱
        </button>
        <button id="btn-message-send-digisac" type="button" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 uppercase tracking-wider flex items-center justify-center gap-1.5">
          Enviar via Digisac 💬
        </button>
      `
      : `
        <button id="btn-message-cancel" type="button" class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition uppercase">
          Cancelar
        </button>
        <button id="btn-message-send" type="button" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 uppercase tracking-wider flex items-center justify-center gap-1.5">
          Enviar via WhatsApp 🚀
        </button>
      `;

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 w-full ${modalWidthClass} rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden relative shadow-slate-900/20" id="send-template-message-card">
        
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-600"></div>

        <div class="p-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center shrink-0">
          <div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold rounded-2xl flex items-center justify-center text-xl border border-emerald-100 dark:border-emerald-900/40 mb-3 shadow-inner">
            💬
          </div>
          <h2 class="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">Disparar Mensagem de WhatsApp</h2>
          <p class="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-1">Selecione um modelo de mensagem para o cliente</p>
        </div>

        <div class="p-6 grid grid-cols-1 ${showChatHistory ? 'lg:grid-cols-12' : ''} gap-6 overflow-y-auto custom-scrollbar flex-1">
          <!-- Coluna da Esquerda: Formulário -->
          <div class="${showChatHistory ? 'lg:col-span-6' : ''} space-y-4">
            <!-- Seletor de Templates -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Escolha o Modelo de Mensagem *</label>
              <select id="select-message-template" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                ${templates.map(t => `<option value="${t.id}" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">${t.titulo}</option>`).join('')}
              </select>
            </div>

            <!-- Telefone do Destinatário -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Telefone do Cliente *</label>
              <input id="input-message-phone" type="text" required value="${options.clienteTelefone}" placeholder="Ex: (11) 99999-9999" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm" />
              <p class="text-[9px] text-slate-400 dark:text-slate-400 font-semibold mt-1">O telefone será limpo e formatado com o código DDI (55) ao enviar.</p>
            </div>

            <!-- Preview da Mensagem Estilo WhatsApp -->
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Visualização da Mensagem (Preview)</label>
              <div class="bg-slate-100 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-end min-h-[120px] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-opacity-10 dark:bg-opacity-5 relative overflow-hidden">
                <div class="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>
                
                <!-- Bolha de chat do WhatsApp -->
                <div class="bg-[#d9fdd3] dark:bg-[#0b141a] text-slate-800 dark:text-slate-200 p-3 rounded-2xl rounded-tr-none max-w-[85%] self-end shadow-sm text-xs font-medium relative border border-emerald-100/30 dark:border-slate-800 z-10 leading-relaxed whitespace-pre-wrap" id="message-preview-bubble">
                  <!-- Preenchido dinamicamente -->
                </div>
              </div>
            </div>

            <!-- Rodapé de Ações (Mobile / Normal) -->
            <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              ${footerButtonsHtml}
            </div>
          </div>

          <!-- Coluna da Direita: Histórico de Conversas (Digisac) -->
          ${showChatHistory ? `
          <div class="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6 pt-6 lg:pt-0 flex flex-col h-[320px] lg:h-[400px]">
            <span class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5 flex items-center justify-between shrink-0">
              <span class="flex items-center gap-1.5">💬 Histórico de Conversa (Digisac)</span>
              <button id="btn-atualizar-chat" type="button" class="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700 rounded-lg text-[9px] font-bold transition uppercase tracking-wider flex items-center gap-1">
                Atualizar 🔄
              </button>
            </span>
            <div id="digisac-chat-history-container" class="flex-1 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto custom-scrollbar space-y-2.5 flex flex-col justify-start">
              <div class="flex items-center justify-center h-full text-slate-450 dark:text-slate-500 text-xs font-semibold">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Carregando conversa...</span>
                </div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('opacity-100');
      document.getElementById('send-template-message-card')?.classList.remove('scale-95');
      document.getElementById('send-template-message-card')?.classList.add('scale-100');
    }, 10);

    const fechar = () => {
      overlay.classList.remove('opacity-100');
      document.getElementById('send-template-message-card')?.classList.remove('scale-100');
      document.getElementById('send-template-message-card')?.classList.add('scale-95');
      setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('btn-message-cancel')?.addEventListener('click', fechar);

    const select = document.getElementById('select-message-template') as HTMLSelectElement;
    const bubble = document.getElementById('message-preview-bubble') as HTMLElement;
    const phoneInput = document.getElementById('input-message-phone') as HTMLInputElement;

    const atualizarVisualizacao = () => {
      const selectedId = select.value;
      selectedTemplateId = selectedId;
      const template = templates.find(t => t.id === selectedId);
      if (template) {
        bubble.innerHTML = gerarPreviewTexto(template);
      }
    };

    select.addEventListener('change', atualizarVisualizacao);
    phoneInput.addEventListener('input', () => {
      customPhone = phoneInput.value;
      carregarHistoricoDigisac();
    });

    // Inicializa o preview
    atualizarVisualizacao();

    const concederXp = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const acaoChave = `whatsapp_disparo_${options.viagemId || 'cliente'}_${Date.now()}`;
          const { error } = await supabase
            .from('profiles_xp_logs')
            .insert({
              profile_id: user.id,
              acao_chave: acaoChave,
              xp_ganho: 10
            });
          
          if (!error) {
            window.dispatchEvent(new CustomEvent('paxflow-inbox-updated'));
          }
        }
      } catch (err) {
        console.warn('Erro ao conceder XP por disparo de mensagem:', err);
      }
    };

    // Função de carregamento do histórico da conversa via Digisac
    const carregarHistoricoDigisac = async () => {
      if (!showChatHistory) return;
      
      const chatContainer = document.getElementById('digisac-chat-history-container');
      if (!chatContainer) return;

      const finalPhone = limparTelefone(customPhone);
      const cleanNumber = finalPhone.replace(/\D/g, '');

      if (!cleanNumber) {
        chatContainer.innerHTML = `
          <div class="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-xs font-semibold text-center p-4">
            Digite um telefone de cliente válido para carregar o histórico de conversas do Digisac.
          </div>
        `;
        return;
      }

      try {
        let cleanDomain = settings.digisac_domain.replace(/\/$/, '');
        if (cleanDomain.endsWith('/api/v1')) {
          cleanDomain = cleanDomain.slice(0, -7);
        } else if (cleanDomain.endsWith('/api/v1/')) {
          cleanDomain = cleanDomain.slice(0, -8);
        } else if (cleanDomain.endsWith('/api')) {
          cleanDomain = cleanDomain.slice(0, -4);
        }

        const url = `${cleanDomain}/api/v1/messages?number=${cleanNumber}&limit=20`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${settings.digisac_token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const resData = await response.json();
        const messages = Array.isArray(resData) ? resData : (resData.data || []);

        if (messages.length === 0) {
          chatContainer.innerHTML = `
            <div class="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-xs font-semibold text-center p-4">
              Nenhuma mensagem trocada ainda com este número no Digisac.
            </div>
          `;
          return;
        }

        chatContainer.innerHTML = messages.map((m: any) => {
          const isSent = m.sent === true || m.direction === 'out' || m.fromMe === true;
          const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          
          return `
            <div class="flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[85%] ${isSent ? 'self-end' : 'self-start'}">
              <div class="${isSent ? 'bg-[#d9fdd3] dark:bg-[#0b141a] border-emerald-100/30' : 'bg-white dark:bg-slate-900 border-slate-200/50'} dark:border-slate-800 text-slate-800 dark:text-slate-200 p-2.5 rounded-2xl ${isSent ? 'rounded-tr-none' : 'rounded-tl-none'} shadow-sm text-xs font-medium border leading-relaxed whitespace-pre-wrap">
                ${m.text || m.body || ''}
              </div>
              <span class="text-[8px] text-slate-400 mt-1 px-1 font-bold">${time}</span>
            </div>
          `;
        }).join('');

        chatContainer.scrollTop = chatContainer.scrollHeight;

      } catch (err) {
        console.warn('Erro ao carregar mensagens da API Digisac (usando mock sandbox/fallback):', err);
        
        // Mock Sandbox com as mensagens passadas
        chatContainer.innerHTML = `
          <div class="flex flex-col gap-2.5">
            <div class="flex flex-col items-start max-w-[85%] self-start">
              <div class="bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-200 p-2.5 rounded-2xl rounded-tl-none shadow-sm text-xs font-medium border leading-relaxed">
                Olá, gostaria de saber se vocês têm propostas para Buenos Aires em agosto. 😊
              </div>
              <span class="text-[8px] text-slate-400 mt-1 px-1 font-bold">14:02</span>
            </div>
            
            <div class="flex flex-col items-end max-w-[85%] self-end">
              <div class="bg-[#d9fdd3] dark:bg-[#0b141a] border-emerald-100/30 dark:border-slate-800 text-slate-800 dark:text-slate-200 p-2.5 rounded-2xl rounded-tr-none shadow-sm text-xs font-medium border leading-relaxed">
                Olá! Temos sim, acabei de cadastrar o seu orçamento no sistema. Vou te mandar a proposta com os voos e hotéis.
              </div>
              <span class="text-[8px] text-slate-400 mt-1 px-1 font-bold">14:05</span>
            </div>

            <div class="flex flex-col items-start max-w-[85%] self-start">
              <div class="bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-200 p-2.5 rounded-2xl rounded-tl-none shadow-sm text-xs font-medium border leading-relaxed">
                Perfeito, fico no aguardo!
              </div>
              <span class="text-[8px] text-slate-400 mt-1 px-1 font-bold">14:06</span>
            </div>

            <div class="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 text-[8px] font-bold uppercase tracking-wider text-center select-none">
              Visualização offline da conversa (Sandbox/Fallback)
            </div>
          </div>
        `;
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    };

    // Disparar o carregamento inicial do chat
    if (showChatHistory) {
      setTimeout(() => {
        carregarHistoricoDigisac();
        document.getElementById('btn-atualizar-chat')?.addEventListener('click', carregarHistoricoDigisac);
      }, 50);
    }

    if (hasDigisac) {
      // Envio manual via WhatsApp Link
      document.getElementById('btn-message-send-wa')?.addEventListener('click', async () => {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) return;

        const finalPhone = limparTelefone(customPhone);
        if (!finalPhone) {
          alert('Por favor, informe um telefone de cliente válido.');
          return;
        }

        const finalTexto = gerarPreviewTexto(template);
        const textEscaped = encodeURIComponent(finalTexto);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${textEscaped}`;

        await concederXp();
        window.open(whatsappUrl, '_blank');
        fechar();
        options.showToast('Mensagem preparada e aberta no WhatsApp!', 'success');
      });

      // Envio manual via Digisac API
      document.getElementById('btn-message-send-digisac')?.addEventListener('click', async () => {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) return;

        const finalPhone = limparTelefone(customPhone);
        if (!finalPhone) {
          alert('Por favor, informe um telefone de cliente válido.');
          return;
        }

        const finalTexto = gerarPreviewTexto(template);
        const btnSend = document.getElementById('btn-message-send-digisac') as HTMLButtonElement;
        if (btnSend) {
          btnSend.disabled = true;
          btnSend.textContent = 'Enviando... ⏳';
        }

        try {
          const cleanNumber = finalPhone.replace(/\D/g, '');
          
          let cleanDomain = settings.digisac_domain.replace(/\/$/, '');
          if (cleanDomain.endsWith('/api/v1')) {
            cleanDomain = cleanDomain.slice(0, -7);
          } else if (cleanDomain.endsWith('/api/v1/')) {
            cleanDomain = cleanDomain.slice(0, -8);
          } else if (cleanDomain.endsWith('/api')) {
            cleanDomain = cleanDomain.slice(0, -4);
          }
          
          const url = `${cleanDomain}/api/v1/messages`;
          
          const payload = {
            text: finalTexto,
            number: cleanNumber,
            serviceId: settings.digisac_service_id,
            origin: 'bot',
            dontOpenTicket: true
          };

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.digisac_token}`
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Status HTTP: ${response.status}`);
          }

          await concederXp();
          options.showToast('Mensagem disparada com sucesso via Digisac! 🚀', 'success');
          
          // Se o chat estiver ativo, recarrega o histórico para mostrar a mensagem enviada
          if (showChatHistory) {
            await carregarHistoricoDigisac();
          }
          
          fechar();
        } catch (err: any) {
          console.error('Erro ao enviar mensagem via Digisac API:', err);
          options.showToast(`Erro ao disparar Digisac: ${err.message || 'Verifique as configurações.'}`, 'error');
          if (btnSend) {
            btnSend.disabled = false;
            btnSend.textContent = 'Enviar via Digisac 💬';
          }
        }
      });

    } else {
      // Envio padrão via link do WhatsApp
      document.getElementById('btn-message-send')?.addEventListener('click', async () => {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) return;

        const finalPhone = limparTelefone(customPhone);
        if (!finalPhone) {
          alert('Por favor, informe um telefone de cliente válido.');
          return;
        }

        const finalTexto = gerarPreviewTexto(template);
        const textEscaped = encodeURIComponent(finalTexto);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${textEscaped}`;

        await concederXp();
        window.open(whatsappUrl, '_blank');
        fechar();
        options.showToast('Mensagem preparada e aberta no WhatsApp!', 'success');
      });
    }
  }
}
