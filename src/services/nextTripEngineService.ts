import { GlobalSettings, NextTripOpportunity } from '../types';
import { supabase } from './supabase';

export class NextTripEngineService {
  /**
   * Converte strings de datas nos formatos BR (DD/MM/AAAA) ou ISO para um objeto Date válido.
   */
  public static parseDataSegura(rawDate: any): Date | null {
    if (!rawDate) return null;
    if (rawDate instanceof Date) return isNaN(rawDate.getTime()) ? null : rawDate;

    if (typeof rawDate === 'string') {
      const str = rawDate.trim();
      if (!str) return null;

      // Formato BR: DD/MM/AAAA ou DD/MM/AAAA HH:mm
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const parts = str.split(' ')[0].split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          const dt = new Date(y, m, d);
          return isNaN(dt.getTime()) ? null : dt;
        }
      }

      // Formato ISO ou YYYY-MM-DD
      const dt = new Date(str.includes('T') ? str : `${str}T00:00:00`);
      return isNaN(dt.getTime()) ? null : dt;
    }

    const dt = new Date(rawDate);
    return isNaN(dt.getTime()) ? null : dt;
  }

  /**
   * Calcula as oportunidades de recompra para os clientes da agência
   */
  public static calculateOpportunities(
    clientes: any[],
    viagens: any[] = [],
    orcamentos: any[] = [],
    settings?: GlobalSettings,
    currentUserId?: string,
    userRole: string = 'consultor'
  ): NextTripOpportunity[] {
    if (!clientes || clientes.length === 0) return [];
    if (settings && (settings.habilitar_next_trip_engine === false || settings.habilitarNextTripEngine === false)) {
      return [];
    }

    const npsMinimo = settings?.next_trip_nps_minimo ?? settings?.nextTripNpsMinimo ?? 8;
    const corteAltaProntidao = settings?.next_trip_corte_prontidao_alta ?? settings?.nextTripCorteProntidaoAlta ?? 75;

    const agora = new Date();
    const oportunidades: NextTripOpportunity[] = [];

    // Agrupa viagens por cliente_id, clienteId, e-mail ou CPF do cliente
    const viagensPorCliente = new Map<string, any[]>();
    (viagens || []).forEach(v => {
      const cId = v.cliente_id || v.clienteId || (v.cliente && (v.cliente.id || v.cliente.cliente_id));
      const cEmail = (v.cliente_email || v.clienteEmail || (v.cliente && v.cliente.email) || '').toLowerCase().trim();
      const cCpf = (v.cliente_cpf || v.clienteCpf || (v.cliente && v.cliente.cpf) || '').replace(/\D/g, '');

      if (cId) {
        if (!viagensPorCliente.has(cId)) viagensPorCliente.set(cId, []);
        viagensPorCliente.get(cId)!.push(v);
      }
      if (cEmail) {
        if (!viagensPorCliente.has(`email:${cEmail}`)) viagensPorCliente.set(`email:${cEmail}`, []);
        viagensPorCliente.get(`email:${cEmail}`)!.push(v);
      }
      if (cCpf) {
        if (!viagensPorCliente.has(`cpf:${cCpf}`)) viagensPorCliente.set(`cpf:${cCpf}`, []);
        viagensPorCliente.get(`cpf:${cCpf}`)!.push(v);
      }
    });

    // Mapeia orçamentos em aberto vs encerrados/recusados por cliente
    const orcamentosAbertosPorCliente = new Set<string>();
    const orcamentosEncerradosPorCliente = new Map<string, any[]>();

    (orcamentos || []).forEach(o => {
      const cId = o.cliente_id || o.clienteId;
      const cEmail = (o.cliente_email || o.clienteEmail || (o.cliente && o.cliente.email) || '').toLowerCase().trim();
      const st = (o.status || '').toUpperCase();

      if (st === 'SOLICITADO' || st === 'EM_ANDAMENTO' || st === 'AGUARDANDO') {
        if (cId) orcamentosAbertosPorCliente.add(cId);
        if (cEmail) orcamentosAbertosPorCliente.add(`email:${cEmail}`);
      } else {
        // Encerrados, concluídos, desistência ou recusados
        if (cId) {
          if (!orcamentosEncerradosPorCliente.has(cId)) orcamentosEncerradosPorCliente.set(cId, []);
          orcamentosEncerradosPorCliente.get(cId)!.push(o);
        }
        if (cEmail) {
          if (!orcamentosEncerradosPorCliente.has(`email:${cEmail}`)) orcamentosEncerradosPorCliente.set(`email:${cEmail}`, []);
          orcamentosEncerradosPorCliente.get(`email:${cEmail}`)!.push(o);
        }
      }
    });

    clientes.forEach(cliente => {
      const clienteEmailKey = cliente.email ? `email:${cliente.email.toLowerCase().trim()}` : '';
      const clienteCpfKey = cliente.cpf ? `cpf:${cliente.cpf.replace(/\D/g, '')}` : '';

      const cViagens = viagensPorCliente.get(cliente.id) ||
                       (clienteEmailKey ? viagensPorCliente.get(clienteEmailKey) : undefined) ||
                       (clienteCpfKey ? viagensPorCliente.get(clienteCpfKey) : undefined) || [];

      const cOrcEncerrados = orcamentosEncerradosPorCliente.get(cliente.id) ||
                             (clienteEmailKey ? orcamentosEncerradosPorCliente.get(clienteEmailKey) : undefined) || [];

      // Se o cliente não tem nem viagens nem orçamentos antigos, não há histórico para recompra/reativação
      if (cViagens.length === 0 && cOrcEncerrados.length === 0) return;

      // 1. Regra de Bloqueio: Se já tem orçamento em aberto no funil ativo, não abordar
      const temOrcamentoAberto = orcamentosAbertosPorCliente.has(cliente.id) ||
                                (clienteEmailKey && orcamentosAbertosPorCliente.has(clienteEmailKey));
      if (temOrcamentoAberto) return;

      // 2. Regra de Bloqueio: Se o cliente tem viagem agendada para o futuro
      const temViagemFutura = cViagens.some(v => {
        const dIda = v.data_ida || v.dataIda;
        if (!dIda) return false;
        const parsedIda = NextTripEngineService.parseDataSegura(dIda);
        return parsedIda ? parsedIda.getTime() > agora.getTime() : false;
      });
      if (temViagemFutura) return;

      // Ordena viagens da mais recente para a mais antiga
      cViagens.sort((a, b) => {
        const dateA = NextTripEngineService.parseDataSegura(a.data_volta || a.dataVolta || a.data_ida || a.dataIda || a.created_at || a.createdAt);
        const dateB = NextTripEngineService.parseDataSegura(b.data_volta || b.dataVolta || b.data_ida || b.dataIda || b.created_at || b.createdAt);
        const tA = dateA ? dateA.getTime() : 0;
        const tB = dateB ? dateB.getTime() : 0;
        return tB - tA;
      });

      // Ordena orçamentos encerrados do mais recente para o mais antigo
      cOrcEncerrados.sort((a, b) => {
        const dateA = NextTripEngineService.parseDataSegura(a.updated_at || a.updatedAt || a.created_at || a.createdAt);
        const dateB = NextTripEngineService.parseDataSegura(b.updated_at || b.updatedAt || b.created_at || b.createdAt);
        const tA = dateA ? dateA.getTime() : 0;
        const tB = dateB ? dateB.getTime() : 0;
        return tB - tA;
      });

      const ultimaViagem = cViagens.length > 0 ? cViagens[0] : null;
      const ultimoOrcamento = cOrcEncerrados.length > 0 ? cOrcEncerrados[0] : null;

      // Determina a origem primária da oportunidade
      const temViagemPassada = !!ultimaViagem;
      const origemOportunidade: 'viagem' | 'orcamento_recusado' = temViagemPassada ? 'viagem' : 'orcamento_recusado';

      // Consultor Titular (Qualquer ADMIN vê tudo irrestrito)
      const consultorTitularId = (ultimaViagem && (ultimaViagem.consultor_id || ultimaViagem.consultorId)) ||
                                 (ultimoOrcamento && (ultimoOrcamento.consultor_id || ultimoOrcamento.consultorId)) ||
                                 cliente.consultor_id || cliente.consultorId || '';

      const consultorTitularNome = (ultimaViagem && (ultimaViagem.consultor_nome || ultimaViagem.consultorNome)) ||
                                   (ultimoOrcamento && (ultimoOrcamento.consultor_nome || ultimoOrcamento.consultorNome)) ||
                                   cliente.consultor_nome || cliente.consultorNome || 'Agência';

      const isSandbox = typeof window !== 'undefined' && (window as any).paxflowSandbox === true;
      const isAdmin = userRole === 'admin';

      // Se não for admin nem sandbox, consultor só vê os próprios clientes
      if (!isSandbox && !isAdmin && currentUserId && consultorTitularId && consultorTitularId !== currentUserId) {
        return;
      }

      // Verificação de Snooze
      const rawSnooze = cliente.next_trip_snooze_until || cliente.nextTripSnoozeUntil;
      let isSnoozed = false;
      let snoozeUntilStr: string | null = null;
      if (rawSnooze) {
        const snoozeUntil = NextTripEngineService.parseDataSegura(rawSnooze);
        if (snoozeUntil && snoozeUntil.getTime() > agora.getTime()) {
          isSnoozed = true;
          snoozeUntilStr = snoozeUntil.toISOString();
        }
      }

      // --- CÁLCULO DOS 5 VETORES DE RECOMPRA / REATIVAÇÃO ---
      let scoreSazonalidade = 0;
      let scoreNps = 0;
      let scorePerfil = 0;
      let scoreMes = 0;
      let scoreConformidade = 10;

      let dataReferencia: Date | null = null;
      let ultimoDestinoTexto = '';
      let npsNota: number | null = null;
      let totalPax = 1;

      if (origemOportunidade === 'viagem' && ultimaViagem) {
        const rawDate = ultimaViagem.data_volta || ultimaViagem.dataVolta || ultimaViagem.data_ida || ultimaViagem.dataIda || ultimaViagem.created_at || ultimaViagem.createdAt;
        dataReferencia = NextTripEngineService.parseDataSegura(rawDate);
        ultimoDestinoTexto = ultimaViagem.destino || 'Destino Anterior';
        totalPax = (ultimaViagem.passageiros && Array.isArray(ultimaViagem.passageiros)) ? ultimaViagem.passageiros.length : 1;

        if (!dataReferencia) return;

        const diffMs = agora.getTime() - dataReferencia.getTime();
        if (diffMs < 0) return; // Data no futuro tratada acima

        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        // Carência mínima de 30 dias para recompra pós-viagem
        if (diffDias < 30) return;

        const diffMeses = Math.floor(diffDias / 30.43);
        if (diffMeses >= 10 && diffMeses <= 14) {
          scoreSazonalidade = 30; // Janela ideal de ~1 ano
        } else if (diffMeses >= 5 && diffMeses <= 9) {
          scoreSazonalidade = 20;
        } else if (diffMeses >= 15 && diffMeses <= 24) {
          scoreSazonalidade = 25;
        } else {
          scoreSazonalidade = 15;
        }

        // NPS
        const rawNps = ultimaViagem.nps_nota ?? ultimaViagem.npsNota ?? (ultimaViagem as any).nps ?? cliente.nps_nota ?? cliente.npsNota;
        if (rawNps !== undefined && rawNps !== null && rawNps !== '') {
          npsNota = Number(rawNps);
          if (npsNota >= 9) scoreNps = 25;
          else if (npsNota >= npsMinimo) scoreNps = 15;
          else {
            scoreNps = 0;
            return; // Não sugere recompra para detratores
          }
        } else {
          scoreNps = 15;
        }

        // Mês habitual
        const mesVolta = dataReferencia.getMonth();
        const mesAtual = agora.getMonth();
        if (mesVolta === mesAtual || mesVolta === (mesAtual + 1) % 12) {
          scoreMes = 15;
        } else {
          scoreMes = 5;
        }

        // Reembolso pendente
        const temReembolsoPendente = ultimaViagem.reembolsos && ultimaViagem.reembolsos.some((r: any) => r.status !== 'pago' && r.status !== 'concluido');
        if (temReembolsoPendente) scoreConformidade = 0;

      } else if (ultimoOrcamento) {
        // Origem Orçamento Recusado / Antigo
        const rawDate = ultimoOrcamento.updated_at || ultimoOrcamento.updatedAt || ultimoOrcamento.created_at || ultimoOrcamento.createdAt;
        dataReferencia = NextTripEngineService.parseDataSegura(rawDate);
        ultimoDestinoTexto = ultimoOrcamento.destino || 'Destino Cotado';

        if (!dataReferencia) return;

        const diffMs = agora.getTime() - dataReferencia.getTime();
        if (diffMs < 0) return;

        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        // Carência mínima de 30 dias após recusa/inatividade do orçamento
        if (diffDias < 30) return;

        const diffMeses = Math.floor(diffDias / 30.43);
        if (diffMeses >= 1 && diffMeses <= 6) {
          scoreSazonalidade = 25; // Momento quente para resgatar proposta
        } else {
          scoreSazonalidade = 15;
        }

        scoreNps = 15; // Neutro
        scoreMes = 10;
        scoreConformidade = 10;
      }

      if (!dataReferencia) return;

      // Perfil de Destino
      const destLower = ultimoDestinoTexto.toLowerCase();
      let categoriaDestino: NextTripOpportunity['categoriaDestino'] = 'geral';
      let destinoSugerido = ultimoDestinoTexto || 'Novo Roteiro';

      if (destLower.includes('europa') || destLower.includes('paris') || destLower.includes('itália') || destLower.includes('portugal') || destLower.includes('espanha')) {
        categoriaDestino = 'europa';
        scorePerfil = 20;
        destinoSugerido = 'Europa (Temporada 2027)';
      } else if (destLower.includes('resort') || destLower.includes('praia') || destLower.includes('bahia') || destLower.includes('maragogi') || destLower.includes('cancún')) {
        categoriaDestino = 'resort';
        scorePerfil = 20;
        destinoSugerido = 'Resort de Verão All-Inclusive';
      } else if (destLower.includes('disney') || destLower.includes('orlando') || destLower.includes('park')) {
        categoriaDestino = 'disney';
        scorePerfil = 20;
        destinoSugerido = 'Disney / Orlando (Pacote Família)';
      } else if (destLower.includes('cruzeiro') || destLower.includes('navio') || destLower.includes('msc')) {
        categoriaDestino = 'cruzeiro';
        scorePerfil = 20;
        destinoSugerido = 'Cruzeiro Marítimo';
      } else {
        categoriaDestino = 'nacional';
        scorePerfil = 15;
        destinoSugerido = `Novo Roteiro (${ultimoDestinoTexto || 'Nacional'})`;
      }

      const totalScore = Math.min(100, Math.max(0, scoreSazonalidade + scoreNps + scorePerfil + scoreMes + scoreConformidade));

      let nivelProntidao: NextTripOpportunity['nivelProntidao'] = 'baixo';
      if (totalScore >= corteAltaProntidao) {
        nivelProntidao = 'alto';
      } else if (totalScore >= 50) {
        nivelProntidao = 'medio';
      }

      const diffDiasGeral = Math.floor((agora.getTime() - dataReferencia.getTime()) / (1000 * 60 * 60 * 24));
      const diffMesesGeral = Math.floor(diffDiasGeral / 30.43);

      let motivoSugestao = '';
      if (origemOportunidade === 'viagem') {
        motivoSugestao = `Viajou para ${ultimoDestinoTexto} há ${diffMesesGeral} meses.`;
        if (npsNota !== null && npsNota >= 9) motivoSugestao += ` (Promotor NPS ${npsNota})`;
        if (scoreMes === 15) motivoSugestao += ` • Período habitual de férias`;
      } else {
        motivoSugestao = `Orçamento anterior para ${ultimoDestinoTexto} (${diffDiasGeral} dias atrás). Excelente janela para reativação.`;
      }

      const dataStr = dataReferencia.toLocaleDateString('pt-BR');

      // Detalhamento dos 5 vetores para transparência auditável
      const vetoresDetalhamento = {
        sazonalidade: {
          score: scoreSazonalidade,
          max: 30,
          detalhe: origemOportunidade === 'viagem'
            ? `${diffMesesGeral} meses decorridos (${scoreSazonalidade === 30 ? 'Janela ideal de ~1 ano' : scoreSazonalidade >= 20 ? 'Excelente momento de abordagem' : 'Janela secundária'})`
            : `Orçamento anterior há ${diffDiasGeral} dias (${scoreSazonalidade === 25 ? 'Momento ideal de resgate comercial' : 'Resgate de oportunidade fria'})`
        },
        nps: {
          score: scoreNps,
          max: 25,
          detalhe: npsNota !== null ? `Nota NPS ${npsNota} (${npsNota >= 9 ? 'Promotor Apaixonado' : 'Neutro Aprovado'})` : 'Sem avaliação prévia (pontuação neutra de segurança 15 pts)'
        },
        perfil: {
          score: scorePerfil,
          max: 20,
          detalhe: `Afinidade com ${categoriaDestino.toUpperCase()} baseada no histórico de reservas e cotações (${scorePerfil} pts)`
        },
        mesHabitual: {
          score: scoreMes,
          max: 15,
          detalhe: scoreMes === 15 ? 'Mês atual ou subsequente coincide com o padrão habitual de férias do cliente' : 'Mês fora do pico habitual de férias'
        },
        conformidadeSla: {
          score: scoreConformidade,
          max: 10,
          detalhe: scoreConformidade === 10 ? 'Cliente 100% elegível: sem contestações, sem reembolsos pendentes e sem viagem futura' : 'Penalizado por pendência financeira/operacional aberta'
        }
      };

      oportunidades.push({
        clienteId: cliente.id,
        clienteNome: cliente.nome || 'Cliente',
        clienteTelefone: cliente.telefone,
        clienteEmail: cliente.email,
        consultorId: consultorTitularId,
        consultorNome: consultorTitularNome,
        scoreProntidao: totalScore,
        nivelProntidao,
        destinoRecomendado: destinoSugerido,
        categoriaDestino,
        ultimaViagemData: dataStr,
        ultimoDestino: ultimoDestinoTexto,
        npsNota: npsNota ?? undefined,
        motivoSugestao,
        statusAbordagem: isSnoozed ? 'snoozed' : 'pendente',
        snoozeAte: snoozeUntilStr || undefined,
        totalPassageirosGrupo: totalPax,
        origemOportunidade,
        vetoresDetalhamento
      });
    });

    return oportunidades.sort((a, b) => b.scoreProntidao - a.scoreProntidao);
  }

  /**
   * Aplica snooze de N dias para a oportunidade de recompra de um cliente diretamente no Supabase.
   * Respeita rigorosamente a premissa de Zero LocalStorage para dados de negócio.
   */
  public static async aplicarSnoozeAbordagem(clienteId: string, dias: number = 30): Promise<string> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + dias);
    const isoString = dataLimite.toISOString();

    const { error } = await supabase
      .from('clientes')
      .update({ next_trip_snooze_until: isoString })
      .eq('id', clienteId);

    if (error) {
      console.error('Erro ao salvar snooze do cliente no Supabase:', error);
      throw error;
    }

    return isoString;
  }
}
