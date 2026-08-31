import { GlobalSettings, NextTripOpportunity } from '../types';

export class NextTripEngineService {
  /**
   * Calcula as oportunidades de recompra para os clientes da agência
   */
  public static calculateOpportunities(
    clientes: any[],
    viagens: any[],
    orcamentos: any[],
    settings?: GlobalSettings,
    currentUserId?: string,
    userRole: string = 'consultor'
  ): NextTripOpportunity[] {
    if (!clientes || clientes.length === 0 || !viagens || viagens.length === 0) return [];
    if (settings && (settings.habilitar_next_trip_engine === false || settings.habilitarNextTripEngine === false)) {
      return [];
    }

    const npsMinimo = settings?.next_trip_nps_minimo ?? settings?.nextTripNpsMinimo ?? 8;
    const corteAltaProntidao = settings?.next_trip_corte_prontidao_alta ?? settings?.nextTripCorteProntidaoAlta ?? 75;
    const snoozeDias = settings?.next_trip_snooze_dias ?? settings?.nextTripSnoozeDias ?? 30;

    const agora = new Date();
    const oportunidades: NextTripOpportunity[] = [];

    // Agrupa viagens por cliente_id, clienteId, e-mail ou CPF do cliente
    const viagensPorCliente = new Map<string, any[]>();
    viagens.forEach(v => {
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

    // Agrupa orçamentos abertos por cliente
    const orcamentosAbertosPorCliente = new Set<string>();
    if (orcamentos && orcamentos.length > 0) {
      orcamentos.forEach(o => {
        const cId = o.cliente_id || o.clienteId;
        const cEmail = (o.cliente_email || o.clienteEmail || (o.cliente && o.cliente.email) || '').toLowerCase().trim();
        const st = (o.status || '').toUpperCase();
        if (st === 'SOLICITADO' || st === 'EM_ANDAMENTO' || st === 'AGUARDANDO') {
          if (cId) orcamentosAbertosPorCliente.add(cId);
          if (cEmail) orcamentosAbertosPorCliente.add(`email:${cEmail}`);
        }
      });
    }

    clientes.forEach(cliente => {
      const clienteEmailKey = cliente.email ? `email:${cliente.email.toLowerCase().trim()}` : '';
      const clienteCpfKey = cliente.cpf ? `cpf:${cliente.cpf.replace(/\D/g, '')}` : '';

      const cViagens = viagensPorCliente.get(cliente.id) ||
                       (clienteEmailKey ? viagensPorCliente.get(clienteEmailKey) : undefined) ||
                       (clienteCpfKey ? viagensPorCliente.get(clienteCpfKey) : undefined) || [];

      if (cViagens.length === 0) return;

      // Ordena viagens da mais recente para a mais antiga
      cViagens.sort((a, b) => {
        const dA = new Date(a.data_volta || a.dataVolta || a.data_ida || a.dataIda || a.created_at || a.createdAt || 0).getTime();
        const dB = new Date(b.data_volta || b.dataVolta || b.data_ida || b.dataIda || b.created_at || b.createdAt || 0).getTime();
        return dB - dA;
      });

      const ultimaViagem = cViagens[0];
      const consultorTitularId = ultimaViagem.consultor_id || ultimaViagem.consultorId || cliente.consultor_id || cliente.consultorId || '';
      const consultorTitularNome = ultimaViagem.consultor_nome || ultimaViagem.consultorNome || cliente.consultor_nome || cliente.consultorNome || 'Consultor Titular';

      if (userRole !== 'admin' && currentUserId && consultorTitularId && consultorTitularId !== currentUserId) {
        return;
      }

      // Se o cliente já tem orçamento em aberto ou viagem agendada no futuro, pular
      const temViagemFutura = cViagens.some(v => {
        const dIda = v.data_ida || v.dataIda;
        if (!dIda) return false;
        return new Date(dIda).getTime() > agora.getTime();
      });
      if (temViagemFutura || orcamentosAbertosPorCliente.has(cliente.id)) {
        return;
      }

      // Verificação de Snooze
      const snoozeKey = `next_trip_snooze_${cliente.id}`;
      const snoozeUntilStr = localStorage.getItem(snoozeKey);
      let isSnoozed = false;
      if (snoozeUntilStr) {
        const snoozeUntil = new Date(snoozeUntilStr);
        if (snoozeUntil.getTime() > agora.getTime()) {
          isSnoozed = true;
        } else {
          localStorage.removeItem(snoozeKey);
        }
      }

      // --- CÁLCULO DOS 5 VETORES DE RECOMPRA ---
      let scoreSazonalidade = 0;
      let scoreNps = 0;
      let scorePerfil = 0;
      let scoreMes = 0;
      let scoreConformidade = 10;

      // 1. Sazonalidade (30 pontos max)
      const rawDate = ultimaViagem.data_volta || ultimaViagem.dataVolta || ultimaViagem.data_ida || ultimaViagem.dataIda || ultimaViagem.created_at || ultimaViagem.createdAt;
      const dataVolta = rawDate ? new Date(rawDate) : agora;
      const diffMeses = Math.floor((agora.getTime() - dataVolta.getTime()) / (1000 * 60 * 60 * 24 * 30.43));

      // Se a viagem foi concluída há menos de 3 meses ou está no futuro, não é uma oportunidade de recompra ainda
      if (diffMeses < 3) {
        return;
      }

      if (diffMeses >= 10 && diffMeses <= 14) {
        scoreSazonalidade = 30; // Janela ideal de ~1 ano
      } else if (diffMeses >= 5 && diffMeses <= 9) {
        scoreSazonalidade = 20;
      } else if (diffMeses >= 15 && diffMeses <= 24) {
        scoreSazonalidade = 25;
      } else {
        scoreSazonalidade = 15;
      }

      // 2. NPS (25 pontos max)
      const npsNota = ultimaViagem.nps_nota ?? ultimaViagem.npsNota ?? cliente.nps_nota ?? cliente.npsNota ?? 10;
      if (npsNota >= 9) {
        scoreNps = 25;
      } else if (npsNota >= npsMinimo) {
        scoreNps = 15;
      } else {
        scoreNps = 0;
        return; // Não sugere recompra para detratores
      }

      // 3. Perfil de Destino (20 pontos max)
      const destLower = (ultimaViagem.destino || ultimaViagem.titulo || '').toLowerCase();
      let categoriaDestino: NextTripOpportunity['categoriaDestino'] = 'geral';
      let destinoSugerido = ultimaViagem.destino || 'Novo Destino';

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
        destinoSugerido = `Novo Roteiro (${ultimaViagem.destino || 'Nacional'})`;
      }

      // 4. Mês Habitual de Viagem (15 pontos max)
      const mesVolta = dataVolta.getMonth();
      const mesAtual = agora.getMonth();
      if (mesVolta === mesAtual || mesVolta === (mesAtual + 1) % 12) {
        scoreMes = 15;
      } else {
        scoreMes = 5;
      }

      // 5. Conformidade (10 pontos max)
      const temReembolsoPendente = ultimaViagem.reembolsos && ultimaViagem.reembolsos.some((r: any) => r.status !== 'pago' && r.status !== 'concluido');
      if (temReembolsoPendente) {
        scoreConformidade = 0;
      }

      const totalScore = Math.min(100, Math.max(0, scoreSazonalidade + scoreNps + scorePerfil + scoreMes + scoreConformidade));

      let nivelProntidao: NextTripOpportunity['nivelProntidao'] = 'baixo';
      if (totalScore >= corteAltaProntidao) {
        nivelProntidao = 'alto';
      } else if (totalScore >= 50) {
        nivelProntidao = 'medio';
      }

      let motivoSugestao = `Viajou para ${ultimaViagem.destino || 'último destino'} há ${diffMeses} meses.`;
      if (npsNota >= 9) motivoSugestao += ` (Promotor NPS ${npsNota})`;
      if (scoreMes === 15) motivoSugestao += ` • Período habitual de férias`;

      const dataStr = dataVolta.toLocaleDateString('pt-BR');

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
        ultimoDestino: ultimaViagem.destino || 'Destino Anterior',
        npsNota,
        motivoSugestao,
        statusAbordagem: isSnoozed ? 'snoozed' : 'pendente',
        snoozeAte: snoozeUntilStr || undefined,
        totalPassageirosGrupo: (ultimaViagem.passageiros && Array.isArray(ultimaViagem.passageiros)) ? ultimaViagem.passageiros.length : 1
      });
    });

    return oportunidades.sort((a, b) => b.scoreProntidao - a.scoreProntidao);
  }

  /**
   * Aplica snooze de N dias para a oportunidade de recompra de um cliente
   */
  public static aplicarSnoozeAbordagem(clienteId: string, dias: number = 30): void {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + dias);
    localStorage.setItem(`next_trip_snooze_${clienteId}`, dataLimite.toISOString());
  }
}
