import { GlobalSettings, NextTripOpportunity } from '../types';
import { supabase } from './supabase';

export type { NextTripOpportunity };

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

      const complemento = NextTripEngineService.calcularDestinoComplementar(ultimoDestinoTexto, categoriaDestino, cliente.nome);

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
        destinoComplementarSugerido: complemento.destinoComplementarSugerido,
        motivoComplementar: complemento.motivoComplementar,
        scriptAbordagemComplementar: complemento.scriptAbordagemComplementar,
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

  /**
   * Aplica snooze em lote para múltiplos clientes selecionados diretamente no Supabase.
   */
  public static async aplicarSnoozeEmLote(clienteIds: string[], dias: number = 30): Promise<{ sucesso: number; total: number; dataLimiteIso: string }> {
    if (!clienteIds || clienteIds.length === 0) {
      return { sucesso: 0, total: 0, dataLimiteIso: '' };
    }

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + dias);
    const isoString = dataLimite.toISOString();

    const { error } = await supabase
      .from('clientes')
      .update({ next_trip_snooze_until: isoString })
      .in('id', clienteIds);

    if (error) {
      console.error('Erro ao aplicar snooze em lote no Supabase:', error);
      throw error;
    }

    return {
      sucesso: clienteIds.length,
      total: clienteIds.length,
      dataLimiteIso: isoString
    };
  }

  /**
   * Gera um roteiro consolidado em texto das abordagens comerciais para os clientes selecionados.
   */
  public static gerarLoteAbordagemTexto(oportunidades: NextTripOpportunity[]): string {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    let texto = `====================================================\n`;
    texto += `PAXFLOW NEXT TRIP ENGINE™ - LOTE DE ABORDAGEM COMERCIAL\n`;
    texto += `Gerado em: ${dataHoje} | Total de Contatos: ${oportunidades.length}\n`;
    texto += `====================================================\n\n`;

    oportunidades.forEach((op, idx) => {
      texto += `----------------------------------------------------\n`;
      texto += `CLIENTE #${idx + 1}: ${op.clienteNome.toUpperCase()}\n`;
      texto += `Telefone: ${op.clienteTelefone || 'Não informado'} | E-mail: ${op.clienteEmail || 'Não informado'}\n`;
      texto += `Destino Recomendado: ${op.destinoRecomendado}\n`;
      texto += `Motivo Estratégico: ${op.motivoSugestao}\n`;
      texto += `Score de Prontidão: ${op.scoreProntidao}/100 (${op.nivelProntidao.toUpperCase()})\n`;
      const script = op.scriptAbordagemComplementar || `Olá ${op.clienteNome.split(' ')[0]}! Tudo bem? Temos novidades para seu próximo destino: ${op.destinoRecomendado}!`;
      texto += `\n[SCRIPT DE ABORDAGEM WHATSAPP]:\n${script}\n`;
      texto += `----------------------------------------------------\n\n`;
    });

    return texto;
  }

  /**
   * Gera arquivo CSV com os dados das oportunidades selecionadas para importação comercial.
   */
  public static gerarCsvAbordagem(oportunidades: NextTripOpportunity[]): string {
    const cabecalho = ['Nome', 'Telefone', 'Email', 'Destino Recomendado', 'Categoria', 'Score', 'Classificacao', 'Motivo', 'Script Abordagem'];

    const linhas = oportunidades.map(op => {
      const escapeCsv = (val: any) => `"${String(val || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      const script = op.scriptAbordagemComplementar || `Olá ${op.clienteNome.split(' ')[0]}! Temos novidades para ${op.destinoRecomendado}!`;
      return [
        escapeCsv(op.clienteNome),
        escapeCsv(op.clienteTelefone),
        escapeCsv(op.clienteEmail),
        escapeCsv(op.destinoRecomendado),
        escapeCsv(op.categoriaDestino),
        op.scoreProntidao,
        escapeCsv(op.nivelProntidao),
        escapeCsv(op.motivoSugestao),
        escapeCsv(script)
      ].join(';');
    });

    return [cabecalho.join(';'), ...linhas].join('\r\n');
  }

  /**
   * Radar Heurístico de Destinos Complementares ("Próximo Passo Natural").
   * Mapeia a evolução natural do viajante com base no histórico de destinos e composição familiar.
   */
  public static calcularDestinoComplementar(
    ultimoDestino: string,
    categoria: NextTripOpportunity['categoriaDestino'],
    clienteNome: string = 'Cliente'
  ): {
    destinoComplementarSugerido: string;
    motivoComplementar: string;
    scriptAbordagemComplementar: string;
  } {
    const dest = (ultimoDestino || '').toLowerCase();
    const primeiroNome = (clienteNome || 'Cliente').split(' ')[0];

    // 1. Orlando / Disney -> Universal Studios & Epic Universe
    if (dest.includes('disney') || dest.includes('orlando') || categoria === 'disney') {
      return {
        destinoComplementarSugerido: 'Universal Studios & Epic Universe (Flórida)',
        motivoComplementar: 'Evolução natural após os parques Disney: atrações imersivas e nova área temática.',
        scriptAbordagemComplementar: `Olá ${primeiroNome}, tudo bem? Lembrei de você hoje planejando os roteiros da temporada! Como vocês curtiram muito a viagem para Orlando, o próximo passo natural que famílias com o perfil de vocês amam é focar nos parques da Universal e no novo Epic Universe. Já temos condições especiais abertas para o período de vocês!`
      };
    }

    // 2. Europa (Paris, Roma, Lisboa, etc.)
    if (dest.includes('paris') || dest.includes('frança')) {
      return {
        destinoComplementarSugerido: 'Itália Clássica (Roma, Florença & Costa Amalfitana)',
        motivoComplementar: 'Sequência cultural e gastronômica perfeita após a experiência em Paris.',
        scriptAbordagemComplementar: `Olá ${primeiroNome}! Tudo bem? Pensando na viagem maravilhosa que você fez para Paris, o próximo destino dos sonhos na Europa que encaixa perfeitamente no seu perfil é a Itália, combinando a história de Roma com a gastronomia da Toscana. Quer que eu separe uma prévia de roteiro para o seu próximo período de férias?`
      };
    }

    if (dest.includes('itália') || dest.includes('italia') || dest.includes('roma')) {
      return {
        destinoComplementarSugerido: 'Espanha & Portugal (Madri, Sevilha & Lisboa)',
        motivoComplementar: 'Clima ameno, riqueza histórica e gastronomia que complementam a experiência italiana.',
        scriptAbordagemComplementar: `Olá ${primeiroNome}! Como você aproveitou muito a Itália, o roteiro mais pedido pelos nossos clientes premium na sequência é a combinação de Espanha e Portugal, com cultura vibrante e excelente custo-benefício em solo europeu. Podemos montar uma cotação exclusiva!`
      };
    }

    if (dest.includes('portugal') || dest.includes('lisboa')) {
      return {
        destinoComplementarSugerido: 'Andaluzia & Madri (Espanha)',
        motivoComplementar: 'Extensão ibérica natural com trens de alta velocidade e hospedagens de charme.',
        scriptAbordagemComplementar: `Olá ${primeiroNome}! Quem se apaixona por Portugal invariavelmente tem como próximo passo natural conhecer a Espanha — Sevilha, Granada e Madri. Selecionei algumas opções especiais que coincidem com sua época de férias!`
      };
    }

    // 3. Caribe / México (Cancún, Punta Cana, etc.)
    if (dest.includes('cancún') || dest.includes('cancun') || dest.includes('riviera')) {
      return {
        destinoComplementarSugerido: 'Punta Cana ou Aruba (Caribe Exclusivo)',
        motivoComplementar: 'Mar calmo azul-turquesa e serviço all-inclusive superior sem a agitação de Cancún.',
        scriptAbordagemComplementar: `Olá ${primeiroNome}! Após a viagem para Cancún, o destino que os nossos clientes mais elogiam para relaxar com pé na areia e serviço all-inclusive cinco estrelas é Punta Cana ou Aruba. Preparei uma seleção de resorts boutique para você!`
      };
    }

    // 4. Serras e Vinhos (Gramado, Bento, etc.)
    if (dest.includes('gramado') || dest.includes('canela') || dest.includes('serra gaúcha') || dest.includes('bento')) {
      return {
        destinoComplementarSugerido: 'Mendoza & Bariloche (Patagônia Argentina)',
        motivoComplementar: 'Upgrade internacional do turismo de serra, vinhos premium e paisagens andinas.',
        scriptAbordagemComplementar: `Olá ${primeiroNome}! Sei o quanto você curtiu o clima acolhedor e a gastronomia de Gramado. O próximo passo que você vai se encantar é Mendoza e Bariloche na Argentina: vinícolas de classe mundial aos pés da Cordilheira com tarifas aéreas excelentes!`
      };
    }

    // 5. Resorts Nordeste (Porto de Galinhas, Maragogi, Bahia, etc.)
    if (dest.includes('maragogi') || dest.includes('porto de galinhas') || dest.includes('maceió') || dest.includes('maceio') || categoria === 'resort') {
      return {
        destinoComplementarSugerido: 'Tivoli Ecoresort Praia do Forte ou Trancoso (Bahia)',
        motivoComplementar: 'Elevação de categoria em resort com preservação ambiental e gastronomia assinada.',
        scriptAbordagemComplementar: `Olá ${primeiroNome}! Para manter a tradição das suas férias em resorts com praia paradisíaca, a recomendação de ouro para o seu próximo descanso é o Tivoli Ecoresort ou os resorts de Trancoso. Quer dar uma olhada nas opções de datas?`
      };
    }

    // 6. Cruzeiro
    if (dest.includes('cruzeiro') || dest.includes('navio') || categoria === 'cruzeiro') {
      return {
        destinoComplementarSugerido: 'Cruzeiro no Mediterrâneo ou Caribe com Ilha Privativa',
        motivoComplementar: 'Passo seguinte a cruzeiros de cabotagem nacional: roteiros marítimos internacionais.',
        scriptAbordagemComplementar: `Olá ${primeiroNome}! Quem navega uma vez quer navegar sempre! O próximo nível que indicamos é um cruzeiro pelas ilhas gregas ou Caribe com parada exclusiva em ilha privativa. As cabines com varanda estão com promoções antecipadas!`
      };
    }

    // 7. Geral / Nacional
    return {
      destinoComplementarSugerido: 'Lençóis Maranhenses & Rota das Emoções',
      motivoComplementar: 'Uma das experiências ecológicas mais exclusivas e bem avaliadas do turismo nacional.',
      scriptAbordagemComplementar: `Olá ${primeiroNome}! Pensando no padrão das suas últimas viagens, um roteiro exclusivo que você vai amar vivenciar na sua próxima folga são os Lençóis Maranhenses na época cheia das lagoas. Posso te enviar um itinerário personalizado?`
    };
  }
}
