import { supabase } from './supabase';
import { PerfilConsultor, AlertItem } from '../types';
import { BADGE_DEFINITIONS } from './gamification';
import { EscalaService, isSameConsultantName } from './escalaService';
import { formatTipoSolicitacaoEscala, formatStatusEscala, formatReembolsoStatus, formatarDataBR, formatarPeriodoDataBR } from '../utils/messageFormatter';

export class InboxService {
  /**
   * Helper to check passport validity and return status & remaining days
   */
  private static checkPassaporteSLA(validadeStr: string): { status: 'ok' | 'warning' | 'expired'; days: number } {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const validade = new Date(validadeStr);
    validade.setHours(0, 0, 0, 0);

    const diferencaTempo = validade.getTime() - hoje.getTime();
    const diasParaVencer = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

    if (diasParaVencer < 0) {
      return { status: 'expired', days: diasParaVencer };
    } else if (diasParaVencer <= 180) {
      return { status: 'warning', days: diasParaVencer };
    }
    return { status: 'ok', days: diasParaVencer };
  }

  /**
   * Retrieves list of locally archived auto-alert IDs from localStorage
   */
  private static getArchivedLocalAlerts(): string[] {
    try {
      const val = localStorage.getItem('paxflow_archived_alerts');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  /**
   * Retrieves list of read alert IDs for a specific user from Supabase and LocalStorage
   */
  static async getReadAlerts(userId: string): Promise<string[]> {
    const readSet = new Set<string>();

    try {
      if (userId) {
        const userVal = localStorage.getItem(`paxflow_read_alerts_${userId}`);
        const userList: string[] = userVal ? JSON.parse(userVal) : [];
        userList.forEach(id => readSet.add(id));
      }
      const legacyVal = localStorage.getItem('paxflow_read_alerts');
      const legacyList: string[] = legacyVal ? JSON.parse(legacyVal) : [];
      legacyList.forEach(id => readSet.add(id));
    } catch (e) {
      console.warn('Erro ao carregar alertas lidos locais:', e);
    }

    if (userId) {
      try {
        const { data: notifRead } = await supabase
          .from('notificacoes')
          .select('id')
          .eq('user_id', userId)
          .eq('lida', true);

        if (notifRead && Array.isArray(notifRead)) {
          notifRead.forEach(n => readSet.add(`mention-${n.id}`));
        }
      } catch (e) {}
    }

    return Array.from(readSet);
  }

  /**
   * Marks a specific alert as read in DB and LocalStorage
   */
  static async markAlertAsRead(userId: string, alertId: string): Promise<void> {
    try {
      const readList = await this.getReadAlerts(userId);
      if (!readList.includes(alertId)) {
        readList.push(alertId);
        if (userId) localStorage.setItem(`paxflow_read_alerts_${userId}`, JSON.stringify(readList));
        localStorage.setItem('paxflow_read_alerts', JSON.stringify(readList));
      }

      if (alertId.startsWith('mention-')) {
        const notifId = alertId.replace('mention-', '');
        await supabase
          .from('notificacoes')
          .update({ lida: true })
          .eq('id', notifId);
      }

      window.dispatchEvent(new CustomEvent('paxflow-inbox-updated'));
    } catch (err) {
      console.error('Erro ao marcar alerta como lido no serviço:', err);
    }
  }

  /**
   * Marks a specific alert as unread in DB and LocalStorage
   */
  static async markAlertAsUnread(userId: string, alertId: string): Promise<void> {
    try {
      let readList = await this.getReadAlerts(userId);
      readList = readList.filter(id => id !== alertId);
      if (userId) localStorage.setItem(`paxflow_read_alerts_${userId}`, JSON.stringify(readList));
      localStorage.setItem('paxflow_read_alerts', JSON.stringify(readList));

      if (alertId.startsWith('mention-')) {
        const notifId = alertId.replace('mention-', '');
        await supabase
          .from('notificacoes')
          .update({ lida: false })
          .eq('id', notifId);
      }

      if (userId) {
        try {
          await supabase
            .from('inbox_read_items')
            .delete()
            .eq('user_id', userId)
            .eq('alert_id', alertId);
        } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent('paxflow-inbox-updated'));
    } catch (err) {
      console.error('Erro ao marcar alerta como não lido no serviço:', err);
    }
  }

  /**
   * Marks multiple alert IDs as read
   */
  static async markAllAlertsAsRead(userId: string, alertIds: string[]): Promise<void> {
    try {
      const readList = await this.getReadAlerts(userId);
      const updatedSet = new Set([...readList, ...alertIds]);
      const updatedList = Array.from(updatedSet);

      if (userId) localStorage.setItem(`paxflow_read_alerts_${userId}`, JSON.stringify(updatedList));
      localStorage.setItem('paxflow_read_alerts', JSON.stringify(updatedList));

      const mentionIds = alertIds
        .filter(id => id.startsWith('mention-'))
        .map(id => id.replace('mention-', ''));

      if (mentionIds.length > 0) {
        await supabase
          .from('notificacoes')
          .update({ lida: true })
          .in('id', mentionIds);
      }

      if (userId && alertIds.length > 0) {
        try {
          const rows = alertIds.map(alert_id => ({
            user_id: userId,
            alert_id,
            read_at: new Date().toISOString()
          }));
          await supabase.from('inbox_read_items').upsert(rows);
        } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent('paxflow-inbox-updated'));
    } catch (err) {
      console.error('Erro ao marcar alertas como lidos em massa:', err);
    }
  }

  /**
   * Fetches data from Supabase and compiles the alerts (manual & SLAs)
   */
  static async loadAndBuildAlerts(
    user: any,
    perfil: PerfilConsultor | null,
    prazoReembolsoDias: number
  ): Promise<AlertItem[]> {
    const list: AlertItem[] = [];
    const archivedList = this.getArchivedLocalAlerts();

    if (!user) {
      return list;
    }

    const userIsAdmin = (perfil?.role || '').toLowerCase() === 'admin';

    // --- PART 1: MANUAL REMINDERS ("Me Lembre Depois") ---
    try {
      let lembretesData: any[] = [];

      try {
        let lembretesQuery = supabase
          .from('lembretes')
          .select(`
            *,
            orcamento:orcamentos (*),
            viagem:viagens (*),
            consultor:profiles!lembretes_consultor_id_fkey (*)
          `)
          .order('created_at', { ascending: false });

        if (!userIsAdmin) {
          lembretesQuery = lembretesQuery.or(`consultor_id.eq.${user.id},criador_id.eq.${user.id}`);
        }

        const { data, error } = await lembretesQuery;
        if (!error && data) {
          lembretesData = data;
        } else {
          // Fallback query sem join estrito caso FK do PostgREST falhe
          let fallbackQuery = supabase
            .from('lembretes')
            .select('*')
            .order('created_at', { ascending: false });

          if (!userIsAdmin) {
            fallbackQuery = fallbackQuery.or(`consultor_id.eq.${user.id},criador_id.eq.${user.id}`);
          }
          const { data: fData } = await fallbackQuery;
          lembretesData = fData || [];
        }
      } catch (errQ) {
        console.warn('Erro ao consultar tabela de lembretes:', errQ);
      }

      let filteredLembretes = lembretesData;
      if (!userIsAdmin) {
        filteredLembretes = filteredLembretes.filter((lem: any) => 
          String(lem.consultor_id) === String(user.id) || String(lem.criador_id) === String(user.id)
        );
      }

      // Fetch lists for manual mock join resolution if needed (fallback for lenient local mock storage)
      const needsManualJoin = filteredLembretes.length > 0 && filteredLembretes.some((lem: any) => 
        (lem.orcamento_id && !lem.orcamento) || 
        (lem.viagem_id && !lem.viagem) || 
        (lem.consultor_id && !lem.consultor)
      );

      let orcamentosList: any[] = [];
      let viagensList: any[] = [];
      let profilesList: any[] = [];

      if (needsManualJoin) {
        const { data: oList } = await supabase.from('orcamentos').select('*');
        const { data: vList } = await supabase.from('viagens').select('*, cliente:clientes(*)');
        const { data: pList } = await supabase.from('profiles').select('*');
        orcamentosList = oList || [];
        viagensList = vList || [];
        profilesList = pList || [];
      } else {
        // Still load profiles if needed to translate criador_id name
        const { data: pList } = await supabase.from('profiles').select('*');
        profilesList = pList || [];
      }

      (filteredLembretes || []).forEach((lem: any) => {
        // Resolve relations manually if needed
        if (!lem.orcamento && lem.orcamento_id) {
          lem.orcamento = orcamentosList.find((o: any) => o.id === lem.orcamento_id);
        }
        if (!lem.viagem && lem.viagem_id) {
          lem.viagem = viagensList.find((v: any) => v.id === lem.viagem_id);
        }
        if (!lem.consultor && lem.consultor_id) {
          lem.consultor = profilesList.find((p: any) => p.id === lem.consultor_id);
        }

        const dataFormatada = new Date(lem.data_lembrete + 'T00:00:00').toLocaleDateString('pt-BR');
        const periodosMap: any = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
        const periodoText = periodosMap[lem.periodo] || lem.periodo;

        const isDelegated = lem.criador_id && String(lem.criador_id) !== String(lem.consultor_id);
        const isCreatedByMe = isDelegated && String(lem.criador_id) === String(user.id);
        const isReceivedByMe = isDelegated && String(lem.consultor_id) === String(user.id);

        let typeText = 'Orçamento';
        let detailLink = '';
        let subject = '';
        let body = '';
        let targetId = '';

        const criadorNome = lem.criador_id 
          ? (profilesList.find((p: any) => p.id === lem.criador_id)?.nome || 'Outro Consultor')
          : 'PaxFlow Reminders';

        if (lem.orcamento) {
          typeText = 'Orçamento';
          targetId = lem.orcamento.id;
          detailLink = `<a href="#" class="inbox-deep-link font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline" data-orcamento-id="${lem.orcamento.id}">[${lem.orcamento.nome_cliente} - ${lem.orcamento.destino}]</a>`;
          
          if (isCreatedByMe) {
            subject = `Você agendou um lembrete para ${lem.consultor?.nome || 'Consultor'} sobre o orçamento de [${lem.orcamento.nome_cliente} - ${lem.orcamento.destino}].`;
            body = `Você agendou um lembrete para <strong>${lem.consultor?.nome || 'Consultor'}</strong> sobre o orçamento ${detailLink} para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.<br><br>Este item está delegado a ele(a).`;
          } else if (isReceivedByMe) {
            subject = `${criadorNome} agendou um lembrete para você sobre o orçamento de [${lem.orcamento.nome_cliente} - ${lem.orcamento.destino}].`;
            body = `O consultor <strong>${criadorNome}</strong> agendou um lembrete para você sobre o orçamento ${detailLink} para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.<br><br>Por favor, clique no link acima para abrir e editar a negociação correspondente.`;
          } else {
            subject = `Você cadastrou um alerta sobre o orçamento de [${lem.orcamento.nome_cliente} - ${lem.orcamento.destino}].`;
            body = `Você cadastrou um alerta sobre o orçamento ${detailLink} para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.<br><br>Por favor, clique no link acima para abrir e editar a negociação correspondente.`;
          }
        } else if (lem.viagem) {
          typeText = 'Viagem';
          targetId = lem.viagem.id;
          
          // Try to fetch customer name from associated relation
          let clientName = 'Viagem';
          if (lem.viagem.cliente) {
            clientName = lem.viagem.cliente.nome;
          } else if (lem.viagem.nome_cliente) {
            clientName = lem.viagem.nome_cliente;
          } else {
            // Find in fallback
            const associatedClient = lem.viagem.cliente_id ? (orcamentosList.find(o => o.cliente_id === lem.viagem.cliente_id)?.nome_cliente) : null;
            clientName = associatedClient || 'Cliente Viagem';
          }

          detailLink = `<a href="#" class="inbox-deep-link font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline" data-viagem-id="${lem.viagem.id}">[${clientName} - ${lem.viagem.destino}]</a>`;

          if (isCreatedByMe) {
            subject = `Você agendou um lembrete para ${lem.consultor?.nome || 'Consultor'} sobre a viagem de [${clientName} - ${lem.viagem.destino}].`;
            body = `Você agendou um lembrete para <strong>${lem.consultor?.nome || 'Consultor'}</strong> sobre a viagem ${detailLink} para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.<br><br>Este item está delegado a ele(a).`;
          } else if (isReceivedByMe) {
            subject = `${criadorNome} agendou um lembrete para você sobre a viagem de [${clientName} - ${lem.viagem.destino}].`;
            body = `O consultor <strong>${criadorNome}</strong> agendou um lembrete para você sobre a viagem ${detailLink} para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.<br><br>Por favor, clique no link acima para abrir e gerenciar a viagem correspondente.`;
          } else {
            subject = `Você cadastrou um alerta sobre a viagem de [${clientName} - ${lem.viagem.destino}].`;
            body = `Você cadastrou um alerta sobre a viagem ${detailLink} para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.<br><br>Por favor, clique no link acima para abrir e gerenciar a viagem correspondente.`;
          }
        } else {
          // General reminder (e.g. from direct message, or custom unlinked reminder)
          typeText = 'Compromisso';
          targetId = '';
          detailLink = '';

          if (isCreatedByMe) {
            subject = `Você agendou um lembrete para ${lem.consultor?.nome || 'Consultor'} [Lembrete Geral].`;
            body = `Você agendou um lembrete para <strong>${lem.consultor?.nome || 'Consultor'}</strong> para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.<br><br>Este item está delegado a ele(a).`;
          } else if (isReceivedByMe) {
            subject = `${criadorNome} agendou um lembrete para você [Lembrete Geral].`;
            body = `O consultor <strong>${criadorNome}</strong> agendou um lembrete para você para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.`;
          } else {
            subject = `Você cadastrou um lembrete [Lembrete Geral].`;
            body = `Você cadastrou um lembrete para o período da <strong>${periodoText}</strong> em <strong>${dataFormatada}</strong>.`;
          }
        }

        list.push({
          id: `manual-${lem.id}`,
          type: 'manual',
          title: `Lembrete cadastrado - ${typeText}`,
          sender: lem.consultor?.nome || 'PaxFlow Reminders',
          senderAvatar: lem.consultor?.avatar_url || undefined,
          dateStr: dataFormatada,
          periodText: periodoText,
          subject: subject,
          body: body,
          targetId: targetId,
          arquivado: lem.arquivado,
          consultorId: lem.consultor_id,
          consultorNome: lem.consultor?.nome || 'Consultor',
          createdAt: lem.created_at,
          eventDate: lem.data_lembrete,
          
          criadorId: lem.criador_id || lem.consultor_id,
          isDelegated: isDelegated || false,
          isCreatedByMe: isCreatedByMe || false,
          isReceivedByMe: isReceivedByMe || false
        });
      });

      // --- PART 2: PASSPORT SLA ALERTS ---
      let clientesQuery = supabase.from('clientes').select('*');
      const { data: clientesData } = await clientesQuery;

      (clientesData || []).forEach((c: any) => {
        // Filter by consultant responsibility if not admin
        if (perfil && (perfil.role || '').toLowerCase() !== 'admin' && c.consultor_responsavel_id !== user.id) {
          return;
        }

        const validade = c.passaporte_validade || c.passaporteValidade;
        if (!validade) return;

        const passSla = this.checkPassaporteSLA(validade);
        if (passSla.status === 'warning' || passSla.status === 'expired') {
          const uniqueId = `passport-${c.id}`;
          const isArchived = archivedList.includes(uniqueId);

          list.push({
            id: uniqueId,
            type: 'passport',
            title: passSla.status === 'expired' ? '🚨 Passaporte EXPIRADO!' : '⚠️ Alerta SLA - Validade de Passaporte',
            sender: 'PaxFlow SLA Control',
            senderAvatar: 'paxflow',
            dateStr: new Date(validade).toLocaleDateString('pt-BR'),
            subject: `O passaporte do passageiro ${c.nome} está ${passSla.status === 'expired' ? 'expirado' : 'perto de vencer'}.`,
            body: `O passaporte do passageiro <strong>${c.nome}</strong> está ${passSla.status === 'expired' ? '<strong class="text-rose-500">expirado!</strong>' : `próximo ao vencimento (${passSla.days} dias restantes).`}<br><br><strong>Detalhes do Cliente:</strong><br>• E-mail: ${c.email || 'Não cadastrado'}<br>• Telefone: ${c.telefone || 'Não cadastrado'}<br>• Passaporte: ${c.passaporte_numero || 'S/N'}<br>• Vencimento: ${new Date(validade).toLocaleDateString('pt-BR')}<br><br>Recomenda-se contatar o cliente para providenciar a emissão de um novo passaporte para viagens internacionais.`,
            targetId: c.id,
            arquivado: isArchived,
            consultorId: c.consultor_responsavel_id || '',
            consultorNome: 'PaxFlow Automático',
            createdAt: c.created_at || new Date().toISOString(),
            eventDate: validade.split('T')[0]
          });
        }
      });

      // --- PART 3: REFUND SLA ALERTS ---
      let reembolsosQuery = supabase
        .from('reembolsos')
        .select(`
          *,
          viagem:viagens (
            *,
            cliente:clientes (*)
          )
        `)
        .not('status', 'in', '("pago","cancelado")')
        .order('created_at', { ascending: false });

      const { data: reembolsosData } = await reembolsosQuery;

      (reembolsosData || []).forEach((rem: any) => {
        const consultorId = rem.viagem?.consultor_id || rem.consultor_solicitante_id;

        // Filter by consultant responsibility if not admin
        if (perfil && (perfil.role || '').toLowerCase() !== 'admin' && consultorId !== user.id) {
          return;
        }

        const dataAbertura = new Date(rem.created_at);
        const hoje = new Date();
        const diffMs = hoje.getTime() - dataAbertura.getTime();
        const diasAbertos = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Alerta a partir de 2 dias antes do estoiro do prazo ou quando vencido
        if (diasAbertos >= (prazoReembolsoDias - 2)) {
          const isAtrasado = diasAbertos >= prazoReembolsoDias;
          const isVencendoHoje = diasAbertos === prazoReembolsoDias;
          const uniqueId = `refund-${rem.id}`;
          const isArchived = archivedList.includes(uniqueId);
          const clienteNome = rem.viagem?.cliente?.nome || 'Passageiro';
          const destino = rem.viagem?.destino || 'Destino';

          const dataSla = new Date(rem.created_at);
          dataSla.setDate(dataSla.getDate() + prazoReembolsoDias);
          const eventDateStr = dataSla.toISOString().split('T')[0];

          const titleText = isAtrasado 
            ? (isVencendoHoje ? '⚠️ URGENTE - SLA de Reembolso Vence HOJE!' : '🚨 CRÍTICO - Reembolso VENCIDO!')
            : '⏳ Alerta Preventivo - Reembolso Próximo ao Vencimento';

          const statusText = formatReembolsoStatus(rem.status);

          list.push({
            id: uniqueId,
            type: 'refund',
            title: titleText,
            sender: 'PaxFlow Finance Alert',
            senderAvatar: 'paxflow',
            dateStr: `${diasAbertos} dias aberto (${isAtrasado ? `${diasAbertos - prazoReembolsoDias}d de atraso` : 'no prazo'})`,
            subject: `Reembolso de ${clienteNome} (${destino}) - ${isAtrasado ? 'PRAZO EXCEDIDO' : 'PRESTES A VENCER'}`,
            body: `O processo de reembolso referente à viagem de <strong>${clienteNome}</strong> para <strong>${destino}</strong> exige atenção da equipe financeira.<br><br>• <strong>Prazo da Agência:</strong> ${prazoReembolsoDias} dias.<br>• <strong>Tempo Decorrido:</strong> ${diasAbertos} dias (${isAtrasado ? `<span class="text-rose-600 font-extrabold">${diasAbertos - prazoReembolsoDias} dias de atraso</span>` : 'Prestes a vencer'}).<br>• <strong>Status Atual:</strong> ${statusText}<br>• <strong>Valor Solicitado:</strong> R$ ${Number(rem.valor_solicitado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br><br><strong>Ação Exigida:</strong> Favor verificar junto ao financeiro ou fornecedor para efetuar a devolução ao cliente e evitar disputas.`,
            targetId: rem.id,
            arquivado: isArchived,
            consultorId: consultorId || '',
            consultorNome: 'PaxFlow Automático',
            createdAt: rem.created_at,
            eventDate: eventDateStr
          });
        }
      });

      // --- PART 4: MENTION & DIRECT MESSAGE NOTIFICATIONS ---
      let queryNotificacoes = supabase
        .from('notificacoes')
        .select(`
          *,
          comentario:comentarios (
            *,
            autor:profiles (*)
          ),
          mensagem:mensagens_diretas (
            *,
            remetente:profiles (*),
            mensagem_destinatarios (
              *,
              destinatario:profiles (*)
            )
          ),
          campaign:campaigns (*)
        `)
        .order('created_at', { ascending: false });

      if (perfil && (perfil.role || '').toLowerCase() !== 'admin') {
        queryNotificacoes = queryNotificacoes.eq('user_id', user.id);
      }

      const { data: notificacoesData, error: notificacoesErr } = await queryNotificacoes;

      if (notificacoesErr) {
        console.error('Erro ao buscar notificações do banco:', notificacoesErr);
      } else {
        (notificacoesData || []).forEach((not: any) => {
          const dataFormatada = new Date(not.created_at).toLocaleDateString('pt-BR');

          if (not.tipo_item === 'campanha') {
            if (!not.campaign) return; // Campanha deleted

            let metaLabel = '';
            if (not.campaign.tipo_meta === 'xp_acumulado') metaLabel = `${not.campaign.meta_quantidade} XP`;
            else if (not.campaign.tipo_meta === 'cliente_criado') metaLabel = `${not.campaign.meta_quantidade} Clientes`;
            else if (not.campaign.tipo_meta === 'orcamento_criado') metaLabel = `${not.campaign.meta_quantidade} Orç. Criados`;
            else if (not.campaign.tipo_meta === 'orcamento_andamento') metaLabel = `${not.campaign.meta_quantidade} Orç. em Andamento`;
            else if (not.campaign.tipo_meta === 'venda_aceita' || not.campaign.tipo_meta === 'orcamento_fechado') metaLabel = `${not.campaign.meta_quantidade} Orç. Fechados`;
            else if (not.campaign.tipo_meta === 'lembrete_criado') metaLabel = `${not.campaign.meta_quantidade} Lembretes`;
            else if (not.campaign.tipo_meta === 'reembolso_pago') metaLabel = `${not.campaign.meta_quantidade} Reembolsos`;
            else if (not.campaign.tipo_meta === 'produto_detalhado') metaLabel = `${not.campaign.meta_quantidade} Produtos`;

            const badgeObj = BADGE_DEFINITIONS.find((b: any) => b.key === not.campaign.badge_key);
            const badgeEmoji = badgeObj ? badgeObj.emoji : '🏆';
            const badgeNome = badgeObj ? badgeObj.nome : 'Medalha Especial';

            const dataInicioFmt = not.campaign.data_inicio ? not.campaign.data_inicio.split('-').reverse().join('/') : '';
            const dataFimFmt = not.campaign.data_fim ? not.campaign.data_fim.split('-').reverse().join('/') : '';

            list.push({
              id: `mention-${not.id}`,
              type: 'campaign_notification',
              title: `🎯 Campanha Ativa: ${not.campaign.titulo}`,
              sender: 'PaxFlow Gamificação',
              senderAvatar: 'paxflow',
              dateStr: dataFormatada,
              subject: `Meta: ${metaLabel}`,
              body: `
                <div class="space-y-4">
                  <div class="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                    <h3 class="text-sm font-black text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-2">
                      🎯 ${not.campaign.titulo}
                    </h3>
                    <p class="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                      ${not.campaign.descricao || 'Sem descrição informada.'}
                    </p>
                  </div>

                  <div class="grid grid-cols-2 gap-3 text-xs">
                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                      <span class="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">📅 Período de Vigência</span>
                      <span class="font-bold text-slate-700 dark:text-slate-200">${dataInicioFmt} até ${dataFimFmt}</span>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                      <span class="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">🏆 Recompensa (Badge)</span>
                      <span class="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                        <span>${badgeEmoji}</span>
                        <span>${badgeNome}</span>
                      </span>
                    </div>
                  </div>

                  <div class="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>📊 Meta da Campanha:</span>
                    <span class="text-sm font-black text-emerald-700 dark:text-emerald-400">${metaLabel}</span>
                  </div>

                  <p class="text-xs text-slate-400 font-medium">Acompanhe seu progresso dinâmico diretamente na barra lateral de Campanhas!</p>
                </div>
              `,
              targetId: not.campaign.id,
              arquivado: not.arquivada,
              consultorId: not.user_id,
              consultorNome: 'PaxFlow Gamificação',
              createdAt: not.created_at,
              eventDate: not.created_at.split('T')[0]
            });
            return;
          }

          if (not.tipo_item === 'mensagem') {
            if (!not.mensagem) return; // Mensagem deleted

            const remetente = not.mensagem.remetente;
            const senderName = remetente ? remetente.nome : 'Consultor';
            const senderAvatar = remetente ? remetente.avatar_url : undefined;

            // Formatar destinatários
            const dests = not.mensagem.mensagem_destinatarios || [];
            const paraList = dests.filter((d: any) => d.tipo === 'para').map((d: any) => d.destinatario?.nome || 'Consultor');
            const ccList = dests.filter((d: any) => d.tipo === 'cc').map((d: any) => d.destinatario?.nome || 'Consultor');

            let recipientsHtml = `Para: ${paraList.join(', ')}`;
            if (ccList.length > 0) {
              recipientsHtml += `<br>Cc: ${ccList.join(', ')}`;
            }

            list.push({
              id: `mention-${not.id}`, // Reusar o prefixo mention para herdar arquivamento individual na tabela notificacoes
              type: 'direct_message',
              title: not.mensagem.assunto,
              sender: senderName,
              senderAvatar: senderAvatar,
              dateStr: dataFormatada,
              subject: `De: ${senderName}`,
              body: not.mensagem.conteudo,
              targetId: not.mensagem.id,
              arquivado: not.arquivada,
              consultorId: not.user_id,
              consultorNome: senderName,
              createdAt: not.created_at,
              eventDate: not.created_at.split('T')[0],
              recipientsHtml,
              isSent: false,
              senderId: not.mensagem.remetente_id,
              parentId: not.mensagem.parent_id,
              threadId: not.mensagem.thread_id
            });
            return;
          }

          if (!not.comentario) return; // Comentário deleted

          const author = not.comentario.autor;
          const authorName = author ? author.nome : 'Consultor';
          const authorAvatar = author ? author.avatar_url : undefined;

          let itemLabel = 'Item';
          let linkAttr = '';
          if (not.tipo_item === 'orcamento') {
            itemLabel = 'Orçamento';
            linkAttr = `data-orcamento-id="${not.parent_id}"`;
          } else if (not.tipo_item === 'viagem') {
            itemLabel = 'Viagem';
            linkAttr = `data-viagem-id="${not.parent_id}"`;
          } else if (not.tipo_item === 'produto') {
            itemLabel = 'Produto';
            linkAttr = `data-viagem-id="${not.parent_id}"`; // abre detalhes da viagem para ver o produto
          }

          list.push({
            id: `mention-${not.id}`,
            type: 'mention',
            title: `💬 Menção em ${itemLabel}`,
            sender: authorName,
            senderAvatar: authorAvatar,
            dateStr: dataFormatada,
            subject: `Você foi mencionado(a) por ${authorName}.`,
            body: `O consultor <strong>${authorName}</strong> mencionou você em um comentário no ${itemLabel}:<br><br>
                   <div class="pl-3 border-l-4 border-indigo-500 italic text-slate-600 dark:text-slate-400 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-r-lg my-3">
                     "${not.comentario.texto}"
                   </div>
                   Clique no link abaixo para abrir e ver os detalhes:<br>
                   <a href="#" class="inbox-deep-link font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline" ${linkAttr}>
                     [Ver Detalhes do(a) ${itemLabel}]
                   </a>`,
            targetId: not.parent_id,
            arquivado: not.arquivada,
            consultorId: not.user_id,
            consultorNome: authorName,
            createdAt: not.created_at,
            eventDate: not.created_at.split('T')[0]
          });
        });
      }

      // --- PART 5: SENT DIRECT MESSAGES ---
      let queryEnviadas = supabase
        .from('mensagens_diretas')
        .select(`
          *,
          remetente:profiles (*),
          mensagem_destinatarios (
            *,
            destinatario:profiles (*)
          )
        `)
        .eq('remetente_id', user.id)
        .order('created_at', { ascending: false });

      const { data: enviadasData, error: enviadasErr } = await queryEnviadas;

      if (enviadasErr) {
        console.error('Erro ao buscar mensagens enviadas do banco:', enviadasErr);
      } else {
        (enviadasData || []).forEach((msg: any) => {
          const dataFormatada = new Date(msg.created_at).toLocaleDateString('pt-BR');
          const senderName = msg.remetente ? msg.remetente.nome : 'Consultor';
          const senderAvatar = msg.remetente ? msg.remetente.avatar_url : undefined;

          // Formatar destinatários
          const dests = msg.mensagem_destinatarios || [];
          const paraList = dests.filter((d: any) => d.tipo === 'para').map((d: any) => d.destinatario?.nome || 'Consultor');
          const ccList = dests.filter((d: any) => d.tipo === 'cc').map((d: any) => d.destinatario?.nome || 'Consultor');

          let recipientsHtml = `Para: ${paraList.join(', ')}`;
          if (ccList.length > 0) {
            recipientsHtml += `<br>Cc: ${ccList.join(', ')}`;
          }

          list.push({
            id: `sent-${msg.id}`,
            type: 'direct_message',
            title: msg.assunto,
            sender: 'Você',
            senderAvatar: senderAvatar,
            dateStr: dataFormatada,
            subject: `Para: ${paraList.join(', ')}`,
            body: msg.conteudo,
            targetId: msg.id,
            arquivado: false, // Mensagens enviadas não são arquivadas pelo remetente de forma padrão
            consultorId: msg.remetente_id,
            consultorNome: senderName,
            createdAt: msg.created_at,
            eventDate: msg.created_at.split('T')[0],
            recipientsHtml,
            isSent: true,
            senderId: msg.remetente_id,
            parentId: msg.parent_id,
            threadId: msg.thread_id
          });
        });
      }
      // --- PART 6: PRÉ-EMBARQUE & PÓS-VIAGEM NPS ALERTS ---
      let viagensQuery = supabase
        .from('viagens')
        .select(`
          *,
          cliente:clientes (*),
          produtos:produtos_viagem(*)
        `)
        .not('status', 'eq', 'cancelada');

      const { data: viagensData } = await viagensQuery;
      const hoje = new Date();

      (viagensData || []).forEach((v: any) => {
        // Fallback local para produtos em modo offline/sandbox
        if (!v.produtos) {
          const saved = localStorage.getItem(`paxflow-produtos-viagem-${v.id}`);
          if (saved) {
            try { v.produtos = JSON.parse(saved); } catch (e) {}
          }
        }

        // Filter by consultant responsibility if not admin
        if (perfil && (perfil.role || '').toLowerCase() !== 'admin' && v.consultor_id !== user.id && v.consultor_responsavel_id !== user.id) {
          return;
        }

        const clienteNome = v.cliente?.nome || 'Passageiro';
        const destino = v.destino || 'Destino';

        // 1. Alerta de Pré-Embarque (Até 7 dias antes da ida)
        if (v.data_ida) {
          const dataIda = new Date(v.data_ida + 'T00:00:00');
          const diffMs = dataIda.getTime() - hoje.getTime();
          const horasAteIda = diffMs / (1000 * 60 * 60);

          // Se a viagem inicia em até 7 dias (168 horas) e ainda não ocorreu
          if (horasAteIda > -24 && horasAteIda <= 168) {
            const isUrgente = horasAteIda <= 48;
            const uniqueId = `pre-embarque-${v.id}`;
            const isArchived = archivedList.includes(uniqueId);
            const diasRestantes = Math.max(0, Math.ceil(horasAteIda / 24));

            list.push({
              id: uniqueId,
              type: 'pre-embarque',
              title: isUrgente ? '🚨 URGENTE - Embarque em menos de 48h!' : '✈️ Alerta - Pré-Embarque de Cliente',
              sender: 'PaxFlow Operações',
              senderAvatar: 'paxflow',
              dateStr: dataIda.toLocaleDateString('pt-BR'),
              subject: isUrgente 
                ? `🚨 EMBARQUE PRÓXIMO: ${clienteNome} viaja para ${destino} em menos de 48h!`
                : `Pré-Embarque: ${clienteNome} viaja para ${destino} em ${diasRestantes} dia(s).`,
              body: `A viagem de <strong>${clienteNome}</strong> com destino a <strong>${destino}</strong> está agendada para <strong>${dataIda.toLocaleDateString('pt-BR')}</strong> (${diasRestantes} dia(s) restante(s)).<br><br>• <strong>Data de Ida:</strong> ${dataIda.toLocaleDateString('pt-BR')}<br>• <strong>Localizador (LOC):</strong> ${v.codigo_localizador || 'Não informado'}<br><br><strong>Checklist de Segurança Operacional:</strong><br>1. Confirmar emissão e envio de todos os vouchers.<br>2. Auxiliar o cliente com o check-in online das companhias aéreas.<br>3. Conferir validade do passaporte, vistos e vacinas em mãos.`,
              targetId: v.id,
              arquivado: isArchived,
              consultorId: v.consultor_id || '',
              consultorNome: 'PaxFlow Automático',
              createdAt: v.created_at || new Date().toISOString(),
              eventDate: v.data_ida
            });
          }
          // 1.2. Alertas de Pré-Embarque para Trechos Aéreos
        if (v.produtos && Array.isArray(v.produtos)) {
          v.produtos.forEach((p: any) => {
            if ((p.tipo === 'AÉREO OPERADORA' || p.tipo === 'AÉREO FACIAL') && p.dados_adicionais && Array.isArray(p.dados_adicionais.trechos)) {
              p.dados_adicionais.trechos.forEach((t: any, idx: number) => {
                const labelTrecho = `${p.fornecedor} - Trecho ${idx + 1} (${t.origem} ➔ ${t.destino})`;
                
                // Ida do Trecho
                if (t.dataIda) {
                  const dataIda = new Date(t.dataIda + 'T00:00:00');
                  const diffMs = dataIda.getTime() - hoje.getTime();
                  const horasAteIda = diffMs / (1000 * 60 * 60);

                  if (horasAteIda > 0 && horasAteIda <= 48) {
                    const uniqueId = `pre-embarque-trecho-ida-${v.id}-${p.id}-${idx}`;
                    const isArchived = archivedList.includes(uniqueId);

                    list.push({
                      id: uniqueId,
                      type: 'pre-embarque',
                      title: '✈️ Alerta - Ida de Trecho Aéreo',
                      sender: 'PaxFlow Operações',
                      senderAvatar: 'paxflow',
                      dateStr: dataIda.toLocaleDateString('pt-BR'),
                      subject: `Embarque de ${clienteNome}: ${labelTrecho} em breve!`,
                      body: `A ida do trecho aéreo <strong>${labelTrecho}</strong> do passageiro <strong>${clienteNome}</strong> está agendada para iniciar em menos de 48 horas.<br><br>• <strong>Data de Ida do Trecho:</strong> ${dataIda.toLocaleDateString('pt-BR')}<br>• <strong>Localizador (LOC):</strong> ${p.codigo_reserva || 'Não informado'}<br><br><strong>Ações recomendadas:</strong><br>1. Enviar os vouchers de voo correspondentes.<br>2. Auxiliar o cliente com o check-in online na companhia aérea.<br>3. Confirmar se a documentação necessária de embarque está em mãos.`,
                      targetId: v.id,
                      arquivado: isArchived,
                      consultorId: v.consultor_id || '',
                      consultorNome: 'PaxFlow Automático',
                      createdAt: v.created_at || new Date().toISOString(),
                      eventDate: t.dataIda
                    });
                  }
                }

                // Volta do Trecho (se houver)
                if (t.dataVolta) {
                  const dataVolta = new Date(t.dataVolta + 'T00:00:00');
                  const diffMs = dataVolta.getTime() - hoje.getTime();
                  const horasAteVolta = diffMs / (1000 * 60 * 60);

                  if (horasAteVolta > 0 && horasAteVolta <= 48) {
                    const uniqueId = `pre-embarque-trecho-volta-${v.id}-${p.id}-${idx}`;
                    const isArchived = archivedList.includes(uniqueId);

                    list.push({
                      id: uniqueId,
                      type: 'pre-embarque',
                      title: '✈️ Alerta - Volta de Trecho Aéreo',
                      sender: 'PaxFlow Operações',
                      senderAvatar: 'paxflow',
                      dateStr: dataVolta.toLocaleDateString('pt-BR'),
                      subject: `Retorno de ${clienteNome}: ${labelTrecho} em breve!`,
                      body: `O retorno do trecho aéreo <strong>${labelTrecho}</strong> do passageiro <strong>${clienteNome}</strong> está agendado para iniciar em menos de 48 horas.<br><br>• <strong>Data de Volta do Trecho:</strong> ${dataVolta.toLocaleDateString('pt-BR')}<br>• <strong>Localizador (LOC):</strong> ${p.codigo_reserva || 'Não informado'}<br><br><strong>Ações recomendadas:</strong><br>1. Enviar os vouchers de voo correspondentes.<br>2. Auxiliar o cliente com o check-in online na companhia aérea.<br>3. Confirmar se a documentação necessária de embarque está em mãos.`,
                      targetId: v.id,
                      arquivado: isArchived,
                      consultorId: v.consultor_id || '',
                      consultorNome: 'PaxFlow Automático',
                      createdAt: v.created_at || new Date().toISOString(),
                      eventDate: t.dataVolta
                    });
                  }
                }
              });
            }
          });
        }
      }

        // 2. Alerta de Pós-Viagem NPS (24h após a volta)
        if (v.data_volta) {
          const dataVolta = new Date(v.data_volta);
          // Adiciona 24h após a data de volta (fim do dia de volta)
          const dataDisparo = new Date(dataVolta);
          dataDisparo.setDate(dataDisparo.getDate() + 1);

          const diffMsDisparo = hoje.getTime() - dataDisparo.getTime();
          const diasAposVolta = diffMsDisparo / (1000 * 60 * 60 * 24);

          // Disparar se já se passaram 24h da volta e estamos dentro de 7 dias pós-volta
          if (diasAposVolta >= 0 && diasAposVolta <= 7) {
            const uniqueId = `pos-viagem-nps-${v.id}`;
            const isArchived = archivedList.includes(uniqueId);

            list.push({
              id: uniqueId,
              type: 'pos-viagem-nps',
              title: '⭐ Alerta - NPS de Pós-Viagem',
              sender: 'PaxFlow Qualidade & NPS',
              senderAvatar: 'paxflow',
              dateStr: dataVolta.toLocaleDateString('pt-BR'),
              subject: `Coletar NPS do cliente ${clienteNome} pós-retorno de ${destino}`,
              body: `O passageiro <strong>${clienteNome}</strong> retornou de sua viagem para <strong>${destino}</strong>.<br><br>• <strong>Data de Retorno:</strong> ${dataVolta.toLocaleDateString('pt-BR')}<br><br>Esta é a hora de ouro para medir a satisfação do cliente! Envie a pesquisa NPS para entender como foi a experiência e fortalecer o relacionamento.`,
              targetId: v.id,
              arquivado: isArchived,
              consultorId: v.consultor_id || '',
              consultorNome: 'PaxFlow Automático',
              createdAt: v.created_at || new Date().toISOString(),
              eventDate: v.data_volta
            });
          }
        }
      });

      // --- PART 7: SOLICITAÇÕES DE ESCALA (TROCAS, FOLGAS E FÉRIAS) ---
      try {
        const { data: allProfilesData } = await supabase.from('profiles').select('id, nome, avatar_url');
        const profilesMap = new Map<string, any>();
        (allProfilesData || []).forEach((p: any) => {
          if (p.id) profilesMap.set(p.id, p);
          if (p.nome) profilesMap.set(p.nome.toLowerCase().trim(), p);
        });

        const solicitacoesEscala = await EscalaService.loadSolicitacoes();
        (solicitacoesEscala || []).forEach(sol => {
          const isUserSolicitante = (sol.solicitante_id && String(sol.solicitante_id) === String(user.id)) ||
            isSameConsultantName(sol.solicitante_nome || '', perfil?.nome || '');
          const isUserDestinatario = (sol.destinatario_id && String(sol.destinatario_id) === String(user.id)) ||
            isSameConsultantName(sol.destinatario_nome || '', perfil?.nome || '');
          const isAdmin = userIsAdmin;

          let shouldInclude = false;
          let isSentItem = false;
          let cardTitle = '';
          let cardSubject = '';
          let cardBody = '';
          let cardSender = sol.solicitante_nome || 'Central de Escala';

          // Obter avatar real do solicitante/remetente da solicitação
          const solProfile = profilesMap.get(sol.solicitante_id) || profilesMap.get((sol.solicitante_nome || '').toLowerCase().trim());
          const senderAvatarReal = (sol as any).solicitante_avatar || solProfile?.avatar_url || undefined;

          const dataOrigemFmt = formatarDataBR(sol.data_origem);
          const dataDestinoFmt = formatarDataBR(sol.data_destino);
          const rangeStr = formatarPeriodoDataBR(sol.data_origem, sol.data_destino);

          // 1. Troca pendente de aceite pelo colega destinatário
          if (sol.status === 'pendente_colega') {
            if (isUserDestinatario) {
              shouldInclude = true;
              cardTitle = 'Troca de Turno Solicitada por Colega';
              cardSubject = `${sol.solicitante_nome} solicitou trocar o turno de ${dataOrigemFmt} com você!`;
              cardBody = `
                <div class="space-y-2">
                  <p><strong>Solicitante:</strong> ${sol.solicitante_nome}</p>
                  <p>• <strong>Data Solicitante:</strong> ${dataOrigemFmt}<br>• <strong>Sua Data (Colega):</strong> ${dataDestinoFmt}</p>
                  <p>• <strong>Motivo:</strong> ${sol.motivo || 'Sem observações'}</p>
                  <div class="pt-2">
                    <button class="btn-ver-na-escala inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-extrabold transition shadow-md shadow-indigo-950/20" data-sol-id="${sol.id}">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span>Ver na Escala</span>
                    </button>
                  </div>
                </div>
              `;
            } else if (isUserSolicitante) {
              shouldInclude = true;
              isSentItem = true;
              cardTitle = 'Solicitação de Troca Enviada ao Colega';
              cardSubject = `Sua solicitação de troca com ${sol.destinatario_nome} (${dataOrigemFmt}) aguarda aceite do colega.`;
              cardBody = `Você solicitou trocar seu turno de ${dataOrigemFmt} com o turno de ${dataDestinoFmt} de ${sol.destinatario_nome}.`;
            }
          } 
          // 1.1. Proposta enviada pela Gestão pendente de aceite pelo consultor
          else if (sol.status === 'pendente_consultor') {
            const tipoInfo = formatTipoSolicitacaoEscala(sol.tipo);
            if (isUserDestinatario) {
              shouldInclude = true;
              cardTitle = `Proposta da Gestão: ${tipoInfo.label}`;
              cardSubject = `${sol.solicitante_nome} (Gestão) enviou uma proposta de ${tipoInfo.label.toLowerCase()} para você.`;
              cardBody = `
                <div class="space-y-2">
                  <p><strong>Solicitante (Gestão):</strong> ${sol.solicitante_nome}</p>
                  <p>• <strong>Período:</strong> ${rangeStr}</p>
                  <p>• <strong>Motivo:</strong> ${sol.motivo || 'Sem observações'}</p>
                  <div class="pt-2">
                    <button class="btn-ver-na-escala inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-extrabold transition shadow-md shadow-indigo-950/20" data-sol-id="${sol.id}">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span>Ver na Escala</span>
                    </button>
                  </div>
                </div>
              `;
            } else if (isUserSolicitante || isAdmin) {
              shouldInclude = true;
              isSentItem = true;
              cardTitle = `${tipoInfo.title} Enviada ao Consultor`;
              cardSubject = `Proposta de ${tipoInfo.label} para ${sol.destinatario_nome || 'Consultor'} aguarda aceite.`;
              cardBody = `Você/Gestão enviou uma proposta de ${tipoInfo.label} para ${sol.destinatario_nome || 'o consultor'}.`;
            }
          }
          // 1.2. Caso especial: Atendimento no Balcão (Co-Piloto) - Notificação Operacional
          else if (sol.tipo === 'atendimento_balcao') {
            const isUserDestinatarioBalcao = sol.destinatario_id === user.id || (sol.destinatario_nome && perfil?.nome && isSameConsultantName(sol.destinatario_nome, perfil.nome));
            if (isUserDestinatarioBalcao || isAdmin) {
              shouldInclude = true;
              cardTitle = '🤝 Atendimento no Balcão (Co-Piloto)';
              cardSender = sol.solicitante_nome || 'Consultor Co-Piloto';
              cardSubject = sol.motivo || `Seu cliente foi atendido presencialmente no balcão por ${sol.solicitante_nome}.`;
              cardBody = `
                <div class="space-y-2">
                  <p>🤝 <strong>Atendimento Presencial Registrado</strong></p>
                  <p>${sol.motivo || `Seu cliente foi atendido no balcão por ${sol.solicitante_nome}.`}</p>
                  <p class="text-[11px] text-slate-400"><strong>Data e Hora:</strong> ${dataOrigemFmt}</p>
                </div>
              `;
            }
          }
          // 2. Solicitação pendente de aprovação pela gestão (folga, férias ou troca aceita pelo colega)
          else if (sol.status === 'pendente_admin') {
            const tipoInfo = formatTipoSolicitacaoEscala(sol.tipo);
            if (isAdmin) {
              shouldInclude = true;
              cardTitle = `Aprovação de Escala: ${tipoInfo.label}`;
              cardSubject = `${tipoInfo.title} - ${sol.solicitante_nome}`;
              cardBody = `
                <div class="space-y-2">
                  <p><strong>Solicitante:</strong> ${sol.solicitante_nome}</p>
                  <p>${sol.tipo === 'troca' ? `• <strong>Troca com:</strong> ${sol.destinatario_nome}<br>• <strong>Data Solicitante:</strong> ${dataOrigemFmt}<br>• <strong>Data Colega:</strong> ${dataDestinoFmt}` : `• <strong>Período Solicitado:</strong> ${rangeStr}`}</p>
                  <p>• <strong>Motivo:</strong> ${sol.motivo || 'Sem observações'}</p>
                  <div class="pt-2">
                    <button class="btn-ver-na-escala inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-extrabold transition shadow-md shadow-indigo-950/20" data-sol-id="${sol.id}">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span>Ver na Escala</span>
                    </button>
                  </div>
                </div>
              `;
            } else if (isUserSolicitante || isUserDestinatario) {
              shouldInclude = true;
              isSentItem = true;
              cardTitle = `${tipoInfo.title} Enviada à Gestão`;
              cardSubject = `Sua solicitação de ${tipoInfo.label} (${rangeStr}) está sob análise da gestão.`;
              cardBody = `Sua solicitação de ${tipoInfo.label} enviada em ${new Date(sol.created_at).toLocaleDateString('pt-BR')} foi encaminhada para aprovação final dos administradores.`;
            }
          } 
          // 3. Resposta final da gestão ou recusa pelo colega
          else if (sol.status === 'aprovado' || sol.status === 'recusado') {
            const tipoInfo = formatTipoSolicitacaoEscala(sol.tipo);
            const statusInfo = formatStatusEscala(sol.status);
            const isUserEnvolvido = isUserSolicitante || (sol.tipo === 'troca' && isUserDestinatario);

            if (isUserEnvolvido) {
              shouldInclude = true;
              const isRecusadoPorColega = sol.status === 'recusado' && (sol.resposta_admin || '').toLowerCase().includes('colega');
              cardTitle = `Resposta da Escala: ${statusInfo.label.toUpperCase()}`;
              cardSender = isRecusadoPorColega ? (sol.destinatario_nome || 'Colega') : 'Gestão da Agência';
              cardSubject = isRecusadoPorColega
                ? `Sua solicitação de troca com ${sol.destinatario_nome} foi recusada pelo colega.`
                : `Sua solicitação de ${tipoInfo.label} (${rangeStr}) foi ${statusInfo.label} pela gestão.`;
              cardBody = `
                <div class="space-y-2">
                  <p>A solicitação de <strong>${tipoInfo.label}</strong> referente a <strong>${rangeStr}</strong> foi finalizada.</p>
                  <p>• <strong>Status Final:</strong> <span class="${statusInfo.badgeClass}">${statusInfo.label}</span></p>
                  <p>• <strong>Observações:</strong> ${sol.resposta_admin || 'Sem observações adicionais.'}</p>
                </div>
              `;
            } else if (isAdmin) {
              shouldInclude = true;
              isSentItem = true;
              cardTitle = `Decisão de Escala: ${tipoInfo.label} (${statusInfo.label})`;
              cardSubject = `Decisão enviada para ${sol.solicitante_nome} (${rangeStr}).`;
              cardBody = `Você definiu a solicitação de ${sol.solicitante_nome} como ${statusInfo.label}. Observação: ${sol.resposta_admin || 'Sem observação'}.`;
            }
          }

          if (shouldInclude) {
            const uniqueId = `escala-sol-${sol.id}-${isSentItem ? 'sent' : 'inbox'}`;
            const isArchived = archivedList.includes(uniqueId);

            list.push({
              id: uniqueId,
              type: 'escala_solicitacao',
              title: cardTitle,
              sender: cardSender,
              senderAvatar: senderAvatarReal,
              dateStr: new Date(sol.created_at).toLocaleDateString('pt-BR'),
              subject: cardSubject,
              body: cardBody,
              targetId: sol.id,
              arquivado: isArchived,
              isSent: isSentItem,
              consultorId: sol.solicitante_id,
              consultorNome: sol.solicitante_nome || 'Consultor',
              createdAt: sol.created_at,
              eventDate: sol.data_origem
            });
          }
        });
      } catch (errEscala) {
        console.warn('Erro ao compilar solicitações de escala para o feed do Inbox:', errEscala);
      }

    } catch (err) {
      console.error('Erro ao compilar alertas no serviço:', err);
    }

    return list;
  }

  /**
   * Fetches all messages belonging to a specific conversation thread
   */
  static async getThreadMessages(threadId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('mensagens_diretas')
        .select(`
          *,
          remetente:profiles (*),
          mensagem_destinatarios (
            *,
            destinatario:profiles (*)
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar thread de mensagens:', err);
      return [];
    }
  }
}
