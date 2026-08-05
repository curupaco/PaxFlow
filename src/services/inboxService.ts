import { supabase } from './supabase';
import { PerfilConsultor, AlertItem } from '../types';

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

    try {
      // --- PART 1: MANUAL REMINDERS ("Me Lembre Depois") ---
      let lembretesQuery = supabase
        .from('lembretes')
        .select(`
          *,
          orcamento:orcamentos (*),
          viagem:viagens (*),
          consultor:profiles!lembretes_consultor_id_fkey (*)
        `)
        .order('created_at', { ascending: false });

      if (perfil && perfil.role !== 'admin') {
        // Safe combination in real Supabase
        lembretesQuery = lembretesQuery.or(`consultor_id.eq.${user.id},criador_id.eq.${user.id}`);
      }

      const { data: lembretesData, error: lembretesErr } = await lembretesQuery;
      if (lembretesErr) throw lembretesErr;

      // Local defensive filtering for non-admin to ensure sandbox and real envs both behave identically
      let filteredLembretes = lembretesData || [];
      if (perfil && perfil.role !== 'admin') {
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
          senderAvatar: lem.consultor?.avatar_url || 'panda',
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
        if (perfil && perfil.role !== 'admin' && c.consultor_responsavel_id !== user.id) {
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
            senderAvatar: 'lion',
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
        if (perfil && perfil.role !== 'admin' && consultorId !== user.id) {
          return;
        }

        const dataAbertura = new Date(rem.created_at);
        const hoje = new Date();
        const diffMs = hoje.getTime() - dataAbertura.getTime();
        const diasAbertos = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diasAbertos > prazoReembolsoDias) {
          const uniqueId = `refund-${rem.id}`;
          const isArchived = archivedList.includes(uniqueId);
          const clienteNome = rem.viagem?.cliente?.nome || 'Passageiro';
          const destino = rem.viagem?.destino || 'Destino';

          const dataSla = new Date(rem.created_at);
          dataSla.setDate(dataSla.getDate() + prazoReembolsoDias);
          const eventDateStr = dataSla.toISOString().split('T')[0];

          list.push({
            id: uniqueId,
            type: 'refund',
            title: '🚨 Alerta SLA - Reembolso Atrasado',
            sender: 'PaxFlow Finance Alert',
            senderAvatar: 'fox',
            dateStr: `${diasAbertos} dias aberto`,
            subject: `O reembolso de ${clienteNome} para ${destino} excedeu o SLA de ${prazoReembolsoDias} dias.`,
            body: `O processo de reembolso referente à viagem de <strong>${clienteNome}</strong> para <strong>${destino}</strong> ultrapassou o limite operacional estabelecido pela agência.<br><br>• <strong>Prazo da Agência:</strong> ${prazoReembolsoDias} dias.<br>• <strong>Tempo Decorrido:</strong> ${diasAbertos} dias.<br>• <strong>Status Atual:</strong> ${(rem.status || 'solicitado').toUpperCase()}<br>• <strong>Valor Solicitado:</strong> R$ ${Number(rem.valor_solicitado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br><br>Por favor, averigue com o financeiro ou fornecedor a situação para agilizar o encerramento do processo.`,
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
          )
        `)
        .eq('arquivada', false)
        .order('created_at', { ascending: false });

      if (perfil && perfil.role !== 'admin') {
        queryNotificacoes = queryNotificacoes.eq('user_id', user.id);
      }

      const { data: notificacoesData, error: notificacoesErr } = await queryNotificacoes;

      if (notificacoesErr) {
        console.error('Erro ao buscar notificações do banco:', notificacoesErr);
      } else {
        (notificacoesData || []).forEach((not: any) => {
          const dataFormatada = new Date(not.created_at).toLocaleDateString('pt-BR');

          if (not.tipo_item === 'mensagem') {
            if (!not.mensagem) return; // Mensagem deleted

            const remetente = not.mensagem.remetente;
            const senderName = remetente ? remetente.nome : 'Consultor';
            const senderAvatar = remetente ? remetente.avatar_url : 'panda';

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
          const authorAvatar = author ? author.avatar_url : 'panda';

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
          const senderAvatar = msg.remetente ? msg.remetente.avatar_url : 'panda';

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
