import { UpsellOpportunity, Destino } from '../types';
import { isUpsellEnabled } from '../utils/featureFlags';
import { supabase } from './supabase';

export interface UpsellCalculationOptions {
  produtos?: any[];
  destino?: string;
  totalPax?: number;
  valorTotal?: number;
  clienteNome?: string;
  dispensados?: string[];
  perfil?: any;
  user?: any;
  settings?: any;
  destinosCadastrados?: Destino[];
}

export class UpsellEngineService {
  /**
   * Verifica se o PaxFlow Upsell Engine™ está habilitado para o usuário atual.
   * Respeita rigorosamente configurações do sistema e regras de negócio sem uso de localStorage.
   */
  public static isUpsellEnabled(settings?: any, user?: any, perfil?: any): boolean {
    return isUpsellEnabled(user, perfil, settings);
  }

  /**
   * Alias de compatibilidade retroativa.
   */
  public static isUserThiagoCosta(perfil?: any, user?: any): boolean {
    return this.isUpsellEnabled(null, user, perfil);
  }

  /**
   * Identifica se um destino informado é internacional através de correspondência inteligente
   * com capitais, países e cruzamento com destinos cadastrados no banco de dados.
   */
  public static isDestinoInternacional(destino: string = '', destinosCadastrados?: Destino[]): boolean {
    const dest = (destino || '').toLowerCase().trim();
    if (!dest) return false;

    // Se temos a lista de destinos do banco de dados, cruzamos a referência
    if (destinosCadastrados && destinosCadastrados.length > 0) {
      const matchDb = destinosCadastrados.find(d => 
        dest.includes(d.nome.toLowerCase()) || 
        d.nome.toLowerCase().includes(dest)
      );
      if (matchDb && matchDb.pais) {
        const paisLower = matchDb.pais.toLowerCase();
        if (paisLower !== 'brasil' && paisLower !== 'brazil' && paisLower !== 'br') {
          return true;
        }
      }
    }

    // Lista abrangente de palavras-chave e destinos internacionais
    const keywordsInternacionais = [
      // Continentes e regiões
      'europa', 'américa do norte', 'america do norte', 'oriente médio', 'oriente medio', 'ásia', 'asia', 'oceania', 'caribe',
      // Europa
      'paris', 'frança', 'franca', 'roma', 'itália', 'italia', 'lisboa', 'porto', 'portugal',
      'madri', 'madrid', 'barcelona', 'espanha', 'londres', 'inglaterra', 'reino unido', 'uk',
      'amsterdã', 'amsterdam', 'holanda', 'berlim', 'munique', 'frankfurt', 'alemanha',
      'suíça', 'suica', 'zurique', 'genebra', 'viena', 'áustria', 'austria',
      'atenas', 'grécia', 'grecia', 'praga', 'república tcheca', 'budapeste', 'hungria',
      // América do Norte
      'orlando', 'disney', 'miami', 'ny', 'nova york', 'nova iorque', 'eua', 'estados unidos', 'usa',
      'los angeles', 'las vegas', 'califórnia', 'california', 'chicago', 'san francisco',
      'cancun', 'cancún', 'méxico', 'mexico', 'toronto', 'vancouver', 'canadá', 'canada',
      // América do Sul Internacional
      'chile', 'santiago', 'argentina', 'buenos aires', 'bariloche', 'mendoza', 'patagônia', 'patagonia',
      'peru', 'lima', 'cusco', 'machu picchu', 'uruguai', 'montevideu', 'punta del este',
      'colômbia', 'colombia', 'cartagena', 'bogotá', 'san andres',
      // Ásia, Oceania e Oriente Médio
      'dubai', 'emirados', 'doha', 'qatar', 'catar', 'tóquio', 'tokyo', 'japão', 'japao',
      'tailândia', 'tailandia', 'bangkok', 'bali', 'indonésia', 'indonesia',
      'sydney', 'melbourne', 'austrália', 'australia', 'nova zelândia', 'nova zelandia'
    ];

    return keywordsInternacionais.some(k => dest.includes(k));
  }

  /**
   * Avalia os produtos e dados de um orçamento/viagem para gerar sugestões preditivas de Upgrades & Experiências.
   * Suporta chamada legada de múltiplos parâmetros ou opções estruturadas.
   */
  public static calculateUpsellOpportunities(
    produtosOrOptions: any[] | UpsellCalculationOptions = [],
    destinoArg?: string,
    totalPaxArg?: number,
    valorTotalArg?: number,
    perfilArg?: any,
    userArg?: any,
    settingsArg?: any
  ): UpsellOpportunity[] {
    let produtos: any[] = [];
    let destino = '';
    let totalPax = 1;
    let valorTotal = 0;
    let clienteNome = '';
    let dispensados: string[] = [];
    let perfil: any = null;
    let user: any = null;
    let settings: any = null;
    let destinosCadastrados: Destino[] = [];

    // Suporte a chamada com objeto de opções ou parâmetros posicionais
    if (Array.isArray(produtosOrOptions)) {
      produtos = produtosOrOptions;
      destino = destinoArg || '';
      totalPax = Math.max(1, totalPaxArg || 1);
      valorTotal = Number(valorTotalArg) || 0;
      perfil = perfilArg;
      user = userArg;
      settings = settingsArg;
    } else if (produtosOrOptions && typeof produtosOrOptions === 'object') {
      const opts = produtosOrOptions as UpsellCalculationOptions;
      produtos = opts.produtos || [];
      destino = opts.destino || '';
      totalPax = Math.max(1, opts.totalPax || 1);
      valorTotal = Number(opts.valorTotal) || 0;
      clienteNome = opts.clienteNome || '';
      dispensados = opts.dispensados || [];
      perfil = opts.perfil;
      user = opts.user;
      settings = opts.settings;
      destinosCadastrados = opts.destinosCadastrados || [];
    }

    // Verifica permissão e feature flag do Upsell Engine
    if (!this.isUpsellEnabled(settings, user, perfil)) {
      return [];
    }

    const upsellConfig = settings?.upsell_config || settings?.upsellConfig || {};
    const isRuleEnabled = (key: string) => upsellConfig[key] !== false;

    totalPax = Math.max(1, totalPax);
    valorTotal = Math.max(0, valorTotal);

    const oportunidades: UpsellOpportunity[] = [];
    const safeProdutos = (produtos || []).filter(p => p && typeof p === 'object');
    const prodTipos = safeProdutos.map(p => (p.tipo || p.categoria || '').toLowerCase());
    const prodNomes = safeProdutos.map(p => (p.nome || p.titulo || p.produto || p.descricao || '').toLowerCase());
    const dest = (destino || '').toLowerCase();
    const destDisplay = destino ? destino.trim() : 'o destino';
    const trimmedNome = (clienteNome || '').trim();
    const primeiroNome = trimmedNome ? trimmedNome.split(' ')[0] : 'Cliente';

    const isInternacional = this.isDestinoInternacional(dest, destinosCadastrados);

    const temSeguro = prodTipos.some(t => t.includes('seguro')) || prodNomes.some(n => n.includes('seguro'));
    const temTransfer = prodTipos.some(t => t.includes('transfer') || t.includes('traslado')) || prodNomes.some(n => n.includes('transfer') || n.includes('traslado'));
    const temPasseio = prodTipos.some(t => t.includes('passeio') || t.includes('ingresso') || t.includes('tour') || t.includes('experi')) || prodNomes.some(n => n.includes('passeio') || n.includes('ingresso') || n.includes('tour') || n.includes('experi'));
    const temHotel = prodTipos.some(t => t.includes('hotel') || t.includes('resort') || t.includes('hospedagem')) || prodNomes.some(n => n.includes('hotel') || n.includes('resort') || n.includes('hospedagem'));
    const temAereo = prodTipos.some(t => t.includes('aereo') || t.includes('aéreo') || t.includes('voo')) || prodNomes.some(n => n.includes('aereo') || n.includes('aéreo') || n.includes('voo') || n.includes('passagem'));
    const temEsim = prodTipos.some(t => t.includes('chip') || t.includes('esim') || t.includes('dados')) || prodNomes.some(n => n.includes('chip') || n.includes('esim') || n.includes('e-sim') || n.includes('dados') || n.includes('conectividade'));
    const temSalaVip = prodTipos.some(t => t.includes('sala vip') || t.includes('lounge')) || prodNomes.some(n => n.includes('sala vip') || n.includes('lounge') || n.includes('vip pass'));
    const temCarro = prodTipos.some(t => t.includes('carro') || t.includes('locação') || t.includes('locacao') || t.includes('veiculo') || t.includes('veículo')) || prodNomes.some(n => n.includes('locação') || n.includes('locacao') || n.includes('rent a car') || n.includes('aluguel de carro'));
    const temBagagem = prodNomes.some(n => n.includes('bagagem') || n.includes('mala despachada') || n.includes('assento conforto') || n.includes('espaço conforto'));

    // GATILHO 1: Seguro Saúde Internacional Obrigatório
    if (isInternacional && !temSeguro && isRuleEnabled('seguro_saude')) {
      const valor = Math.max(380, Math.round(totalPax * 290));
      oportunidades.push({
        id: 'upsell-seguro-saude',
        tipo: 'seguro_saude',
        titulo: '🛡️ Seguro Saúde Internacional Obrigatório',
        descricao: 'Nenhum seguro saúde anexado para viagem internacional. Adicionar cobertura médica garante margem e protege o cliente contra imprevistos com exigência consular.',
        produtoSugerido: 'Seguro Viagem Internacional (Cobertura US$ 60.000 + COVID + Bagagem)',
        categoriaProduto: 'seguro',
        valorEstimado: valor,
        badgeTexto: '+8% a 15% Ticket',
        corBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Tudo bem? ✈️ Verifiquei aqui os preparativos para ${destDisplay} e notei que ainda não adicionamos o Seguro Viagem Internacional com cobertura médica completa. Em viagens internacionais é fundamental (e em muitos países, obrigatório) para evitar custos altíssimos de emergência. Posso incluir na sua reserva por R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`
      });
    }

    // GATILHO 2: Chip / eSIM Internacional de Conectividade Total
    if (isInternacional && !temEsim && isRuleEnabled('esim')) {
      const valor = Math.max(190, Math.round(totalPax * 190));
      oportunidades.push({
        id: 'upsell-esim-internacional',
        tipo: 'esim_internacional',
        titulo: '📶 Chip / eSIM Internacional com Dados Ilimitados',
        descricao: 'Viagem ao exterior sem chip internacional de dados. Garanta conectividade 5G imediata sem depender de Wi-Fi de aeroporto ou roaming exorbitante.',
        produtoSugerido: 'eSIM Dados Ilimitados Alta Velocidade 5G (Cobertura Global)',
        categoriaProduto: 'esim',
        valorEstimado: valor,
        badgeTexto: '+R$ 190/pax',
        corBadge: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Uma dica prática para sua viagem para ${destDisplay}: já temos disponível o chip virtual eSIM de alta velocidade com internet ilimitada. Você já pousa conectado, com WhatsApp e GPS funcionando na hora, sem precisar trocar de chip físico. Deseja que eu emita para você? Fica apenas R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}!`
      });
    }

    // GATILHO 3: Sala VIP / Lounge Pass Aeroportos
    if ((temAereo || isInternacional || valorTotal > 5000) && !temSalaVip && isRuleEnabled('sala_vip')) {
      const valor = Math.max(280, Math.round(totalPax * 280));
      oportunidades.push({
        id: 'upsell-sala-vip',
        tipo: 'sala_vip',
        titulo: '☕ Sala VIP & Lounge Pass em Aeroportos',
        descricao: 'Passageiros com voos ou conexões sem acesso a Lounge VIP. Propor passes com buffet à vontade, bebidas premium e descanso eleva a experiência.',
        produtoSugerido: 'Acesso Sala VIP Aeroportos (Embarque e Conexões com Buffet e Open Bar)',
        categoriaProduto: 'sala_vip',
        valorEstimado: valor,
        badgeTexto: 'Alta Aceitação',
        corBadge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Pensando no seu conforto durante o embarque e conexões para ${destDisplay}, separei acessos exclusivos para as Salas VIPs dos aeroportos. Você terá direito a buffet liberado, bebidas especiais, Wi-Fi ultra rápido e poltronas de descanso. Fica R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para os viajantes. Quer que eu garanta seus acessos?`
      });
    }

    // GATILHO 4: Locação de Veículo com Cobertura Total (Rent a Car)
    const demandaCarro = dest.includes('orlando') || dest.includes('miami') || dest.includes('califórnia') || 
      dest.includes('california') || dest.includes('bariloche') || dest.includes('mendoza') || 
      dest.includes('gramado') || dest.includes('serra gaúcha') || dest.includes('maceió') || 
      dest.includes('natal') || dest.includes('fortaleza') || dest.includes('cancun');

    if (demandaCarro && !temCarro && !temTransfer && isRuleEnabled('locacao_veiculo')) {
      const valor = Math.max(680, Math.round(totalPax * 340));
      oportunidades.push({
        id: 'upsell-locacao-veiculo',
        tipo: 'locacao_veiculo',
        titulo: '🚗 Locação de Veículo SUV/Conforto com Seguro Total',
        descricao: `Destino ${destDisplay} com forte apelo para deslocamento de carro. Oferecer aluguel com franquia zero traz autonomia e rentabilidade.`,
        produtoSugerido: 'Aluguel de Carro Categoria Intermediária/SUV com Seguro Total Franquia Zero',
        categoriaProduto: 'carro',
        valorEstimado: valor,
        badgeTexto: '+Margem Auto',
        corBadge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Em ${destDisplay}, ter a liberdade de um carro à disposição faz toda a diferença para passear no seu próprio ritmo. Temos condições especiais para locação de SUV com seguro total e proteção completa (sem surpresas no balcão). Quer que eu inclua um veículo no seu pacote? Estimativa: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      });
    }

    // GATILHO 5: Bagagem Extra Despachada / Assento Conforto
    if (temAereo && !temBagagem && isRuleEnabled('bagagem_assento')) {
      const valor = Math.max(240, Math.round(totalPax * 240));
      oportunidades.push({
        id: 'upsell-bagagem-assento',
        tipo: 'bagagem_assento',
        titulo: '🧳 Bagagem Despachada (23kg) + Assento Espaço Conforto',
        descricao: 'Reserva aérea sem inclusão prévia de bagagem despachada ou assento de maior espaço. A compra antecipada evita sobretaxas no aeroporto.',
        produtoSugerido: 'Franquia de Mala Despachada 23kg + Marcação de Assento Conforto',
        categoriaProduto: 'aereo',
        valorEstimado: valor,
        badgeTexto: 'Sem Estresse',
        corBadge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Verifiquei a emissão dos seus voos para ${destDisplay} e recomendo anteciparmos a inclusão da bagagem de 23kg e a reserva de assentos com mais espaço para as pernas. Deixar para comprar no aeroporto custa quase o dobro. Posso emitir os adicionais de voo agora para você? Total estimado: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      });
    }

    // GATILHO 6: Experiências, Passeios VIP & Ingressos
    if ((dest.includes('orlando') || dest.includes('disney') || dest.includes('paris') || dest.includes('roma') || dest.includes('cancun') || dest.includes('barcelona') || dest.includes('londres') || dest.includes('madri')) && !temPasseio && isRuleEnabled('passes_experiencias')) {
      const valor = Math.max(850, Math.round(totalPax * 650));
      const sugestao = dest.includes('disney') || dest.includes('orlando') 
        ? 'Combo Ingressos Disney 4 Dias Park Hopper + Universal Studios' 
        : 'Passes VIPs Sem Fila + City Tour Privativo com Guia em Português';

      oportunidades.push({
        id: 'upsell-passes-experiencias',
        tipo: 'passes_experiencias',
        titulo: '🎟️ Passeios VIPs, Ingressos & Experiências Exclusivas',
        descricao: `Destino ${destDisplay} com alta procura turística. Garantir ingressos antecipados evita filas de horas e esgotamento de atrações.`,
        produtoSugerido: sugestao,
        categoriaProduto: 'passeio',
        valorEstimado: valor,
        badgeTexto: '+20% Ticket',
        corBadge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Para aproveitar o melhor de ${destDisplay} sem perder horas em filas, selecionei os passeios e ingressos mais recomendados com acesso prioritário e guias especializados. Deseja que eu anexe essas experiências ao seu roteiro? Valor estimado: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      });
    }

    // GATILHO 7: Transfer Privativo Aeroporto-Hotel
    if ((totalPax >= 3 || isInternacional || valorTotal > 8000) && !temTransfer && isRuleEnabled('transfer_privativo')) {
      const valor = Math.max(350, Math.round(totalPax * 180));
      oportunidades.push({
        id: 'upsell-transfer-privativo',
        tipo: 'transfer_privativo',
        titulo: '🚘 Transfer Privativo Aeroporto-Hotel (Receptivo VIP)',
        descricao: `Viagem para ${totalPax} passageiro(s) sem traslado terrestre contratado. Motorista aguardando no desembarque garante segurança e tranquilidade.`,
        produtoSugerido: 'Transfer Privativo In/Out com Receptivo VIP (Aeroporto ↔ Hotel)',
        categoriaProduto: 'transfer',
        valorEstimado: valor,
        badgeTexto: '+R$ 450 Média',
        corBadge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Chegar de viagem cansado e ter que negociar táxi ou esperar aplicativo pode ser estressante. Podemos já deixar agendado seu Transfer Privativo, com motorista esperando no desembarque com placa de identificação até o hotel. Gostaria de adicionar esse conforto para a sua chegada em ${destDisplay}? Valor: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      });
    }

    // GATILHO 8: Upgrade de Categoria de Hotel / All-Inclusive
    if (temHotel && !prodNomes.some(n => n.includes('all inclusive') || n.includes('5 estrelas') || n.includes('luxury') || n.includes('categoria luxo')) && isRuleEnabled('upgrade_hotel')) {
      const valor = Math.max(600, Math.round(valorTotal * 0.18));
      oportunidades.push({
        id: 'upsell-upgrade-hotel',
        tipo: 'upgrade_hotel',
        titulo: '🏨 Upgrade para Categoria Superior / Vista Mar / All-Inclusive',
        descricao: 'Hotelaria padrão selecionada. Apresentar a opção de upgrade com meia pensão ou quarto superior eleva o valor percebido pelo cliente.',
        produtoSugerido: 'Upgrade de Acomodação (Apartamento Luxo Vista Mar + Café Completo/Meia Pensão)',
        categoriaProduto: 'hotel',
        valorEstimado: valor,
        badgeTexto: '+18% Margem',
        corBadge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Estava revisando sua hospedagem em ${destDisplay} e consegui uma oportunidade excelente de upgrade para uma categoria superior (quarto mais espaçoso com vista privilegiada e benefícios exclusivos). O acréscimo fica em torno de R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para toda a estadia. Gostaria que eu fizesse esse upgrade para você?`
      });
    }

    // GATILHO 9: Proteção de Cancelamento Flexível (Cancel Flex)
    if (valorTotal > 10000 && !prodNomes.some(n => n.includes('cancel flex') || n.includes('multa zero') || n.includes('cancelamento flexivel')) && isRuleEnabled('cancel_flex')) {
      const valor = Math.round(valorTotal * 0.06);
      oportunidades.push({
        id: 'upsell-cancel-flex',
        tipo: 'cancel_flex',
        titulo: '📋 Seguro Cancel Flex (Garantia de Reembolso 100%)',
        descricao: 'Cotação de alto ticket. Cláusula de cancelamento por qualquer motivo reduz o atrito de decisão e traz máxima segurança contratual.',
        produtoSugerido: 'Garantia de Cancelamento Flexível PaxFlow (Reembolso Integral por Qualquer Motivo)',
        categoriaProduto: 'seguro',
        valorEstimado: valor,
        badgeTexto: 'Fechamento Rápido',
        corBadge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Sabendo que imprevistos acontecem, temos a opção do Cancel Flex: uma garantia especial que permite remarcar ou cancelar sua viagem recuperando o valor pago caso surja qualquer imprevisto pessoal ou profissional. Para o seu pacote, fica apenas R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Quer que eu inclua essa tranquilidade no contrato?`
      });
    }

    // GATILHO NACIONAL / FALLBACK 1: Transfer & Receptivo Nacional
    if (!isInternacional && !temTransfer && oportunidades.every(o => o.tipo !== 'transfer_privativo') && isRuleEnabled('transfer_privativo')) {
      const valor = 380;
      oportunidades.push({
        id: 'upsell-transfer-nacional',
        tipo: 'transfer_privativo',
        titulo: '🚘 Transfer Privativo & Receptivo VIP Nacional',
        descricao: `Destino ${destDisplay}. Incluir receptivo com motorista privativo na chegada agrega conforto e agiliza o check-in do hotel.`,
        produtoSugerido: 'Transfer Privativo Receptivo (Aeroporto ↔ Hotel / Passeios)',
        categoriaProduto: 'transfer',
        valorEstimado: valor,
        badgeTexto: '+R$ 380 Média',
        corBadge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Já podemos deixar pronto seu transfer privativo para a chegada em ${destDisplay}. O motorista estará aguardando vocês no aeroporto para levar direto ao hotel com total comodidade. O valor fica em R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Deseja incluir?`
      });
    }

    // GATILHO NACIONAL / FALLBACK 2: Seguro Viagem Nacional & Bagagem
    if (!isInternacional && !temSeguro && oportunidades.every(o => o.tipo !== 'seguro_saude') && isRuleEnabled('seguro_saude')) {
      const valor = 220;
      oportunidades.push({
        id: 'upsell-seguro-nacional',
        tipo: 'seguro_saude',
        titulo: '🛡️ Seguro Viagem Nacional & Proteção de Bagagem',
        descricao: 'Proteção hospitalar, telemedicina e extravio de bagagem para viagens pelo Brasil com custo muito acessível.',
        produtoSugerido: 'Seguro Viagem Brasil (Cobertura R$ 30.000 + Assistência Farmacêutica + Bagagem)',
        categoriaProduto: 'seguro',
        valorEstimado: valor,
        badgeTexto: '+R$ 220 Margem',
        corBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        mensagemWhatsApp: `Olá, ${primeiroNome}! Mesmo em viagens nacionais, os planos de saúde regionais muitas vezes não dão cobertura fora do estado. Recomendo adicionarmos o Seguro Viagem Nacional com telemedicina e proteção de bagagem por apenas R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Posso incluir para você viajar 100% seguro(a)?`
      });
    }

    // FILTRO DE OPORTUNIDADES DISPENSADAS
    // Se o consultor já dispensou a oportunidade para esta viagem, não exibe novamente
    if (dispensados && dispensados.length > 0) {
      return oportunidades.filter(op => !dispensados.includes(op.id));
    }

    return oportunidades;
  }

  /**
   * Registra a dispensa de uma oportunidade de upsell diretamente na tabela viagens do Supabase.
   * RESPEITA A REGRA FUNDAMENTAL: Zero localStorage, o banco de dados é a única fonte da verdade.
   */
  public static async dismissOpportunity(viagemId: string, opportunityId: string): Promise<{ success: boolean; error?: string }> {
    if (!viagemId || !opportunityId) {
      return { success: false, error: 'ID da viagem e ID da oportunidade são obrigatórios.' };
    }

    try {
      // 1. Busca a lista atual de dispensados da viagem
      const { data: viagem, error: fetchErr } = await supabase
        .from('viagens')
        .select('upsell_dispensados')
        .eq('id', viagemId)
        .single();

      if (fetchErr) {
        // Se a coluna ainda não existir no schema local ou der erro de leitura, registra no log
        console.error('Erro ao buscar upsell_dispensados da viagem:', fetchErr);
        return { success: false, error: fetchErr.message };
      }

      const listaAtual: string[] = Array.isArray(viagem?.upsell_dispensados) ? viagem.upsell_dispensados : [];
      
      if (listaAtual.includes(opportunityId)) {
        return { success: true };
      }

      const novaLista = [...listaAtual, opportunityId];

      // 2. Persiste atomicamente no Supabase
      const { error: updateErr } = await supabase
        .from('viagens')
        .update({ upsell_dispensados: novaLista })
        .eq('id', viagemId);

      if (updateErr) {
        console.error('Erro ao atualizar upsell_dispensados no Supabase:', updateErr);
        return { success: false, error: updateErr.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Exceção ao dispensar oportunidade de upsell:', err);
      return { success: false, error: err?.message || 'Erro inesperado ao persistir no banco.' };
    }
  }
}
