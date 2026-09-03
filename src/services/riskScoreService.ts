import { Viagem, Cliente, GlobalSettings, RiskScoreResult, RiskItem, RiskTimelineEntry, ProdutoViagem, PerfilConsultor } from '../types';
import { supabase } from './supabase';
import { isRiskScoreEnabled } from '../utils/featureFlags';

/**
 * Serviço responsável pela inteligência do PaxFlow Risk Score™
 */
export class RiskScoreService {
  /**
   * Calcula a nota de Saúde Operacional (0 a 100) e diagnostica pendências de uma viagem.
   */
  public static calculateTripRiskScore(
    viagem: Viagem,
    cliente?: Cliente | null,
    produtos: ProdutoViagem[] = [],
    settings?: GlobalSettings | null,
    user?: any,
    perfil?: PerfilConsultor | null
  ): RiskScoreResult {
    // 0. Se o recurso estiver desativado para o usuário atual, retorna status neutro desativado
    if (!isRiskScoreEnabled(user, perfil, settings)) {
      return {
        score: 100,
        nivel: 'verde',
        corHex: '#10b981',
        badgeClass: 'hidden',
        fraseStatus: 'PaxFlow Risk Score™ Desativado',
        isGracePeriod: false,
        itens: [],
        historico: []
      };
    }

    const hoje = new Date();
    const dataIda = viagem.data_ida ? new Date(viagem.data_ida) : null;
    const dataVolta = viagem.data_volta ? new Date(viagem.data_volta) : null;

    // Janela de carência (Grace Period)
    const carenciaDias = settings?.risk_score_janela_carencia_dias || 60;
    let daysToDeparture = 999;
    if (dataIda) {
      const diffTime = dataIda.getTime() - hoje.getTime();
      daysToDeparture = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const isGracePeriod = daysToDeparture > carenciaDias;
    const itens: RiskItem[] = [];

    // Isenções Inteligentes por Categoria
    const destinoNome = (viagem.destino || '').toLowerCase().trim();
    const termosInternacionais = [
      'orlando', 'miami', 'paris', 'roma', 'cancun', 'lisboa', 'madrid', 'londres', 
      'ny', 'new york', 'tulum', 'bariloche', 'santiago', 'buenos aires', 'disney',
      'eua', 'usa', 'europa', 'tokyo', 'toquio', 'japao', 'japan', 'italia', 'franca', 'grécia', 'grecia',
      'espanha', 'portugal', 'argentina', 'chile', 'uruguay', 'uruguai', 'colombia', 'peru',
      'mexico', 'dubai', 'emirados', 'inglaterra', 'canada', 'australia', 'internacional', 'exterior'
    ];
    const termosNacionais = [
      'brasil', 'br', 'são paulo', 'sao paulo', 'rio de janeiro', 'gramado', 'caldas novas', 'salvador', 'fortaleza',
      'recife', 'florianopolis', 'maceio', 'natal', 'porto seguro', 'curitiba', 'belo horizonte',
      'manaus', 'foz do iguacu', 'bonito', 'noronha', 'porto de galinhas', 'maragogi', 'campos do jordao'
    ];

    const temTermoInternacional = termosInternacionais.some(d => destinoNome.includes(d));
    const temTermoNacional = termosNacionais.some(d => destinoNome.includes(d));

    const isNacional = temTermoInternacional ? false : (temTermoNacional || destinoNome.length === 0);

    
    const temVoo = produtos.some(p => (p.tipo || '').toLowerCase().includes('voo') || (p.tipo || '').toLowerCase().includes('aéreo'));
    
    let tripDays = 1;
    if (dataIda && dataVolta) {
      const diffDays = Math.ceil((dataVolta.getTime() - dataIda.getTime()) / (1000 * 60 * 60 * 24));
      tripDays = Math.max(1, diffDays);
    }
    const isBateVolta = tripDays <= 1;

    // Checagem de Voucher Geral Unificado da Operadora
    const temVoucherGeral = Boolean(viagem.voucher_geral_anexado || viagem.voucher_geral_pacote);

    let score = 100;

    // PILAR 1: Documental & Vistos (Peso 30%)
    if (!isNacional) {
      if (cliente && cliente.passaporteValidade && dataVolta) {
        const valPass = new Date(cliente.passaporteValidade);
        const diffPass = Math.ceil((valPass.getTime() - dataVolta.getTime()) / (1000 * 60 * 60 * 24));
        if (diffPass < 180) {
          const pen = 30;
          score -= pen;
          itens.push({
            id: 'p1-passaporte',
            pilar: 1,
            pilarNome: 'Documental & Vistos',
            titulo: 'Passaporte com Validade Crítica',
            descricaoHumana: `O passaporte de ${cliente.nome.split(' ')[0]} expira em menos de 180 dias da data de volta (${diffPass < 0 ? 'já vencido' : diffPass + ' dias de validade restante'}).`,
            penalidadePontos: pen,
            resolvido: false,
            acaoTipo: 'preencher_passaporte',
            acaoRotulo: '🛂 Atualizar Passaporte'
          });
        }
      } else if (!cliente?.passaporteNumero && !isGracePeriod) {
        const pen = 20;
        score -= pen;
        itens.push({
          id: 'p1-passaporte-ausente',
          pilar: 1,
          pilarNome: 'Documental & Vistos',
          titulo: 'Passaporte Não Cadastrado',
          descricaoHumana: 'Viagem internacional sem número ou validade de passaporte cadastrada no perfil do cliente.',
          penalidadePontos: pen,
          resolvido: false,
          acaoTipo: 'preencher_passaporte',
          acaoRotulo: '🛂 Preencher Passaporte'
        });
      }
    }

    // PILAR 2: Vouchers & Confirmações de Fornecedores (Peso 25%)
    if (!temVoucherGeral && !isGracePeriod) {
      // Check hoteis
      const hoteis = produtos.filter(p => (p.tipo || '').toLowerCase().includes('hotel') || (p.tipo || '').toLowerCase().includes('hospedagem'));
      const hoteisSemVoucher = hoteis.filter(h => !h.codigoReserva && !h.dados_adicionais?.voucher_url && !h.dadosAdicionais?.voucher_url);
      if (hoteisSemVoucher.length > 0 && !isBateVolta) {
        const pen = 15;
        score -= pen;
        itens.push({
          id: 'p2-voucher-hotel',
          pilar: 2,
          pilarNome: 'Vouchers & Confirmados',
          titulo: 'Voucher de Hospedagem Pendente',
          descricaoHumana: `Falta anexar ou vincular o voucher de hospedagem para ${hoteisSemVoucher.length} hotel(is) reservado(s).`,
          penalidadePontos: pen,
          resolvido: false,
          acaoTipo: 'anexar_voucher',
          acaoRotulo: '📁 Anexar Voucher de Hotel'
        });
      }

      // Check voos
      if (temVoo) {
        const voos = produtos.filter(p => (p.tipo || '').toLowerCase().includes('voo') || (p.tipo || '').toLowerCase().includes('aéreo'));
        const voosSemLoc = voos.filter(v => !v.codigoReserva && !viagem.codigo_localizador);
        if (voosSemLoc.length > 0) {
          const pen = 15;
          score -= pen;
          itens.push({
            id: 'p2-loc-voo',
            pilar: 2,
            pilarNome: 'Vouchers & Confirmados',
            titulo: 'E-Ticket / Localizador do Voo Pendente',
            descricaoHumana: 'Existe produto aéreo cadastrado sem o número de bilhete emitido ou código de reserva (LOC).',
            penalidadePontos: pen,
            resolvido: false,
            acaoTipo: 'vincular_loc',
            acaoRotulo: '✈️ Vincular E-ticket / LOC'
          });
        }
      }
    }

    // PILAR 3: Governança Operacional & Financeira (Peso 20%)
    if (!viagem.processo_conferido && !viagem.isProcessoConferido && !isGracePeriod) {
      const pen = 15;
      score -= pen;
      itens.push({
        id: 'p3-conferencia-op',
        pilar: 3,
        pilarNome: 'Governança & Financeiro',
        titulo: 'Conferência Operacional Não Concluída',
        descricaoHumana: 'A lista de verificação de conferência da viagem ainda não foi validada pela equipe.',
        penalidadePontos: pen,
        resolvido: false,
        acaoTipo: 'conferir_operacional',
        acaoRotulo: '✍️ Marcar Operacional Conferido'
      });
    }

    // PILAR 4: Cobertura Inteligente de Roteiro (Peso 15%)
    if (!temVoucherGeral && !isGracePeriod) {
      const hoteis = produtos.filter(p => (p.tipo || '').toLowerCase().includes('hotel') || (p.tipo || '').toLowerCase().includes('hospedagem'));
      if (hoteis.length === 0 && tripDays > 2 && !isNacional) {
        const pen = 15;
        score -= pen;
        itens.push({
          id: 'p4-gap-hospedagem',
          pilar: 4,
          pilarNome: 'Cobertura de Roteiro',
          titulo: 'Viagem sem Hospedagem Cadastrada',
          descricaoHumana: `Viagem internacional de ${tripDays} dias sem nenhuma reserva de hospedagem vinculada.`,
          penalidadePontos: pen,
          resolvido: false,
          acaoTipo: 'anexar_voucher_geral',
          acaoRotulo: '🏨 Anexar Voucher / Pacote'
        });
      }

      const temSeguro = produtos.some(p => (p.tipo || '').toLowerCase().includes('seguro'));
      if (!isNacional && !temSeguro) {
        const pen = 10;
        score -= pen;
        itens.push({
          id: 'p4-seguro-ausente',
          pilar: 4,
          pilarNome: 'Cobertura de Roteiro',
          titulo: 'Sem Seguro Viagem Internacional',
          descricaoHumana: 'Viagem internacional sem apólice de seguro viagem contratada ou anexada.',
          penalidadePontos: pen,
          resolvido: false,
          acaoTipo: 'anexar_voucher',
          acaoRotulo: '🛡️ Vincular Seguro Viagem'
        });
      }
    }

    // PILAR 5: Qualidade Cadastral do Cliente (Peso 10%)
    if (cliente && (!cliente.documento || !cliente.telefone || !cliente.email)) {
      const pen = 10;
      score -= pen;
      itens.push({
        id: 'p5-dados-cliente',
        pilar: 5,
        pilarNome: 'Qualidade Cadastral',
        titulo: 'Dados Cadastrais Incompletos',
        descricaoHumana: 'Perfil do cliente sem CPF/RG, telefone de contato ou e-mail cadastrado.',
        penalidadePontos: pen,
        resolvido: false,
        acaoTipo: 'preencher_passaporte',
        acaoRotulo: '👤 Completar Perfil do Cliente'
      });
    }

    // Aplicação de Risco Justificado (Se aprovado pelo gerente)
    if (viagem.risk_score_justificativa) {
      score = Math.min(100, score + 25);
    }

    // Garantir intervalo entre 0 e 100
    const finalScore = Math.max(0, Math.min(100, score));

    // Determinar Nível e Identidade Visual
    let nivel: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    let corHex = '#10b981';
    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40';
    let fraseStatus = 'Viagem 100% blindada para você curtir seu fim de semana sem emergências! 🛡️';

    const limiteCritico = settings?.risk_score_limite_critico || 50;

    if (finalScore < limiteCritico) {
      nivel = 'vermelho';
      corHex = '#ef4444';
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40 animate-pulse';
      fraseStatus = 'Atenção! Pendências críticas exigem resolução antes do embarque.';
    } else if (finalScore < 80) {
      nivel = 'amarelo';
      corHex = '#f59e0b';
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40';
      fraseStatus = 'Acompanhe as pendências operacionais médias para atingir nível máximo de segurança.';
    }

    if (isGracePeriod && finalScore >= 70) {
      fraseStatus = '🟢 Viagem dentro do prazo (Aguardando janela de fornecedores de até 60 dias do embarque).';
    }

    return {
      score: finalScore,
      nivel,
      corHex,
      badgeClass,
      fraseStatus,
      isGracePeriod,
      gracePeriodMensagem: isGracePeriod ? `Faltam ${daysToDeparture} dias para o embarque. A cobrança fina de vouchers inicia nos últimos ${carenciaDias} dias.` : undefined,
      itens,
      historico: []
    };
  }

  /**
   * Salva o comprovante de voucher unificado da operadora (Pacote Completo)
   */
  public static async salvarVoucherGeralPacote(viagemId: string, urlPdf: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('viagens').update({
        voucher_geral_pacote: urlPdf,
        voucher_geral_anexado: true
      }).eq('id', viagemId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Erro ao salvar voucher geral:', err);
      return false;
    }
  }

  /**
   * Registra justificativa técnica para atenuar o Risco Operacional
   */
  public static async registrarJustificativaRisco(viagemId: string, justificativa: string, autorNome: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('viagens').update({
        risk_score_justificativa: justificativa,
        risk_score_justificado_por: autorNome,
        risk_score_justificado_em: new Date().toISOString()
      }).eq('id', viagemId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Erro ao registrar justificativa de risco:', err);
      return false;
    }
  }
}
