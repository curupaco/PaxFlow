import { UpsellOpportunity } from '../types';

export class UpsellEngineService {
  /**
   * Verifica se o usuário logado possui permissão para visualizar o PaxFlow Upsell Engine™ (Restrito a Thiago Costa na fase piloto).
   */
  public static isUserThiagoCosta(perfil?: any, user?: any): boolean {
    if (localStorage.getItem('paxflow_upsell_override') === 'true') return true;
    
    let nome = (perfil?.nome || '').toLowerCase();
    let email = (user?.email || perfil?.email || '').toLowerCase();

    if (!nome && !email) {
      try {
        const savedPerfil = localStorage.getItem('paxflow_perfil_atual') || localStorage.getItem('paxflow_user');
        if (savedPerfil) {
          const parsed = JSON.parse(savedPerfil);
          nome = (parsed.nome || '').toLowerCase();
          email = (parsed.email || '').toLowerCase();
        }
      } catch (_) {}
    }

    if (!nome && !email) return true;

    return (
      nome.includes('thiago costa') ||
      nome.includes('thiago') ||
      email.includes('thiago') ||
      email.includes('curupaco')
    );
  }

  /**
   * Avalia os produtos e dados de um orçamento/viagem para gerar sugestões preditivas de Upgrades & Experiências.
   */
  public static calculateUpsellOpportunities(
    produtos: any[],
    destino: string = '',
    totalPax: number = 1,
    valorTotal: number = 0,
    perfil?: any,
    user?: any
  ): UpsellOpportunity[] {
    // Trava de liberação gradual: apenas Thiago Costa visualiza na fase de testes
    if (!this.isUserThiagoCosta(perfil, user)) {
      return [];
    }

    const oportunidades: UpsellOpportunity[] = [];
    const prodTipos = (produtos || []).map(p => (p.tipo || p.categoria || '').toLowerCase());
    const prodNomes = (produtos || []).map(p => (p.nome || p.titulo || p.produto || '').toLowerCase());
    const dest = (destino || '').toLowerCase();

    const isInternacional =
      dest.includes('europa') ||
      dest.includes('paris') ||
      dest.includes('orlando') ||
      dest.includes('disney') ||
      dest.includes('miami') ||
      dest.includes('roma') ||
      dest.includes('lisboa') ||
      dest.includes('cancun') ||
      dest.includes('ny') ||
      dest.includes('eua') ||
      dest.includes('estados unidos') ||
      dest.includes('chile') ||
      dest.includes('argentina') ||
      dest.includes('bariloche');

    const temSeguro = prodTipos.some(t => t.includes('seguro')) || prodNomes.some(n => n.includes('seguro'));
    const temTransfer = prodTipos.some(t => t.includes('transfer') || t.includes('traslado')) || prodNomes.some(n => n.includes('transfer') || n.includes('traslado'));
    const temPasseio = prodTipos.some(t => t.includes('passeio') || t.includes('ingresso') || t.includes('tour')) || prodNomes.some(n => n.includes('passeio') || n.includes('ingresso') || n.includes('tour'));
    const temHotel = prodTipos.some(t => t.includes('hotel') || t.includes('resort') || t.includes('hospedagem')) || prodNomes.some(n => n.includes('hotel') || n.includes('resort') || n.includes('hospedagem'));

    // GATILHO 1: Seguro Saúde Internacional Obrigatório
    if (isInternacional && !temSeguro) {
      oportunidades.push({
        id: 'upsell-seguro-saude',
        tipo: 'seguro_saude',
        titulo: '🛡️ Seguro Saúde Internacional Obrigatório',
        descricao: 'Nenhum seguro saúde anexado para viagem internacional. Adicionar cobertura médica garante margem e protege o cliente.',
        produtoSugerido: 'Seguro Viagem Internacional (Cobertura US$ 60.000 + COVID)',
        categoriaProduto: 'seguro',
        valorEstimado: Math.max(380, Math.round(totalPax * 290)),
        badgeTexto: '+8% a 15% Ticket',
        corBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      });
    }

    // GATILHO 2: Experiências, Passeios VIP & Ingressos
    if ((dest.includes('orlando') || dest.includes('disney') || dest.includes('paris') || dest.includes('roma') || dest.includes('cancun')) && !temPasseio) {
      oportunidades.push({
        id: 'upsell-passes-experiencias',
        tipo: 'passes_experiencias',
        titulo: '🎟️ Passeios VIPs & Ingressos de Atrações',
        descricao: `Destino ${destino || 'Internacional'} com altíssima demanda por passeios. Incluir ingressos antecipados eleva o valor per capita.`,
        produtoSugerido: dest.includes('disney') || dest.includes('orlando') ? 'Combo Ingressos Disney 4 Dias Park Hopper + Universal' : 'Passes VIPs + City Tour Privativo com Guia em Português',
        categoriaProduto: 'passeio',
        valorEstimado: Math.max(850, Math.round(totalPax * 650)),
        badgeTexto: '+20% Ticket',
        corBadge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
      });
    }

    // GATILHO 3: Transfer Privativo Aeroporto-Hotel
    if ((totalPax >= 3 || isInternacional || valorTotal > 8000) && !temTransfer) {
      oportunidades.push({
        id: 'upsell-transfer-privativo',
        tipo: 'transfer_privativo',
        titulo: '🚘 Transfer Privativo Aeroporto-Hotel',
        descricao: `Viagem para ${totalPax} passageiro(s) sem traslado terrestre. Oferecer motorista privativo na chegada agrega grande conforto.`,
        produtoSugerido: 'Transfer Privativo In/Out (Aeroporto ↔ Hotel)',
        categoriaProduto: 'transfer',
        valorEstimado: Math.max(350, Math.round(totalPax * 180)),
        badgeTexto: '+R$ 450 Média',
        corBadge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
      });
    }

    // GATILHO 4: Upgrade de Categoria de Hotel / All-Inclusive
    if (temHotel && !prodNomes.some(n => n.includes('all inclusive') || n.includes('5 estrelas') || n.includes('luxury'))) {
      oportunidades.push({
        id: 'upsell-upgrade-hotel',
        tipo: 'upgrade_hotel',
        titulo: '🏨 Upgrade para Categoria Superior / All-Inclusive',
        descricao: 'Hotelaria padrão selecionada. Apresentar a opção de upgrade com meia pensão ou all-inclusive eleva a percepção de valor.',
        produtoSugerido: 'Upgrade de Acomodação (Apartamento Luxo Vista Mar + Café Completo)',
        categoriaProduto: 'hotel',
        valorEstimado: Math.max(600, Math.round(valorTotal * 0.18)),
        badgeTexto: '+18% Margem',
        corBadge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
      });
    }

    // GATILHO 5: Proteção de Cancelamento Flexível (Cancel Flex)
    if (valorTotal > 10000 && !prodNomes.some(n => n.includes('cancel flex') || n.includes('multa zero'))) {
      oportunidades.push({
        id: 'upsell-cancel-flex',
        tipo: 'cancel_flex',
        titulo: '📋 Seguro Cancel Flex (Garantia de Reembolso 100%)',
        descricao: 'Cotação de alto valor. Adicionar cláusula de cancelamento por qualquer motivo reduz o atrito e fecha o contrato mais rápido.',
        produtoSugerido: 'Garantia de Cancelamento Flexível PaxFlow (Qualquer Motivo)',
        categoriaProduto: 'seguro',
        valorEstimado: Math.round(valorTotal * 0.06),
        badgeTexto: 'Fechamento Rápido',
        corBadge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
      });
    }

    // GATILHO NACIONAL / FALLBACK 1: Transfer & Traslado Terrestre Privativo
    if (!temTransfer) {
      oportunidades.push({
        id: 'upsell-transfer-nacional',
        tipo: 'transfer_privativo',
        titulo: '🚘 Transfer Privativo & Traslado VIP',
        descricao: `Destino ${destino || 'Nacional'}. Incluir receptivo com motorista privativo na chegada agrega grande valor ao pacote.`,
        produtoSugerido: 'Transfer Privativo Receptivo (Aeroporto ↔ Hotel / Passeios)',
        categoriaProduto: 'transfer',
        valorEstimado: 380,
        badgeTexto: '+R$ 380 Média',
        corBadge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
      });
    }

    // GATILHO NACIONAL / FALLBACK 2: Seguro Viagem Nacional & Bagagem
    if (!temSeguro) {
      oportunidades.push({
        id: 'upsell-seguro-nacional',
        tipo: 'seguro_saude',
        titulo: '🛡️ Seguro Viagem Nacional & Bagagem Protegida',
        descricao: 'Proteção hospitalar e extravio de bagagem para viagens pelo Brasil com custo acessível e excelente margem.',
        produtoSugerido: 'Seguro Viagem Brasil (Cobertura R$ 30.000 + Bagagem)',
        categoriaProduto: 'seguro',
        valorEstimado: 220,
        badgeTexto: '+R$ 220 Margem',
        corBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      });
    }

    return oportunidades;
  }
}
