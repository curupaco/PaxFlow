import { supabase } from './supabase';
import { PerfilConsultor, Orcamento, Cliente, ConvertToTripOptions } from '../types';
import { registrarXp } from './gamification';
import { isTipoRav, isTipoMarkup } from '../utils/productFinancialHelper';

export class OrcamentosService {
  /**
   * Busca todos os consultores ativos da tabela "profiles"
   */
  static async loadConsultores(): Promise<PerfilConsultor[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Busca os orçamentos no Supabase
   */
  static async loadOrcamentos(user: any, perfil: PerfilConsultor | null): Promise<Orcamento[]> {
    if (!user) return [];

    let query = supabase
      .from('orcamentos')
      .select('*, destino_ref:destinos(*)')
      .order('created_at', { ascending: false });

    // Carrega todos os orçamentos para suportar busca global (Modo Co-Piloto) e kanban
    const { data, error } = await query;
    if (error) throw error;

    const rawBudgets = data || [];

    // Preserva integridade das propostas: nenhuma proposta é movida automaticamente para desistência sem ação do consultor

    return rawBudgets.map(d => ({
      id: d.id,
      consultorId: d.consultor_id,
      clienteId: d.cliente_id,
      cliente_id: d.cliente_id,
      nomeCliente: d.nome_cliente,
      contato: d.contato,
      destino: d.destino_ref ? `${d.destino_ref.nome}, ${d.destino_ref.pais}` : d.destino,
      destino_id: d.destino_id,
      destinoId: d.destino_id,
      destino_ref: d.destino_ref,
      destinoRef: d.destino_ref,
      dataViagem: d.data_viagem,
      temperatura: d.temperatura,
      tags: d.tags || [],
      status: d.status,
      subStatus: d.sub_status,
      notasNegociacao: d.notas_negociacao,
      valorProposta: d.valor_proposta,
      valorViagem: d.valor_viagem,
      origem: d.origem,
      documentosUrl: d.documentos_url || [],
      codigo_ref: d.codigo_ref,
      codigoRef: d.codigo_ref,
      contatoRealizado: d.contato_realizado ?? false,
      contato_realizado: d.contato_realizado ?? false,
      contatoRealizadoPor: d.contato_realizado_por,
      contato_realizado_por: d.contato_realizado_por,
      contatoRealizadoPorNome: d.contato_realizado_por_profile?.nome,
      contatoRealizadoEm: d.contato_realizado_em,
      contato_realizado_em: d.contato_realizado_em,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));
  }

  /**
   * Busca todos os clientes cadastrados
   */
  static async loadClientes(): Promise<Cliente[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Salva ou atualiza um orçamento no Supabase
   */
  static async persistOrcamento(o: Orcamento): Promise<{ success: boolean; dbVersionDegraded: boolean }> {
    const payload: any = {
      consultor_id: o.consultorId,
      cliente_id: o.cliente_id || o.clienteId || null,
      nome_cliente: o.nomeCliente,
      contato: o.contato,
      destino: o.destino,
      destino_id: o.destino_id || o.destinoId || null,
      data_viagem: o.dataViagem || null,
      temperatura: o.temperatura,
      tags: o.tags,
      status: o.status,
      sub_status: o.subStatus || null,
      notas_negociacao: o.notasNegociacao || null,
      valor_proposta: o.valorProposta || null,
      valor_viagem: o.valorViagem || null,
      origem: o.origem || null,
      contato_realizado: o.contato_realizado ?? o.contatoRealizado ?? false,
      contato_realizado_por: o.contato_realizado_por || o.contatoRealizadoPor || null,
      contato_realizado_em: o.contato_realizado_em || o.contatoRealizadoEm || null,
      documentos_url: o.documentosUrl || [],
      updated_at: o.updatedAt || new Date().toISOString()
    };

    const isNew = !o.id || o.id.startsWith('orc-');

    let resError;
    if (o.id && !o.id.startsWith('orc-')) {
      const { error } = await supabase
        .from('orcamentos')
        .update(payload)
        .eq('id', o.id);
      resError = error;

      if (resError) {
        // Tenta salvar via RPC SECURITY DEFINER caso RLS de UPDATE bloqueie o consultor no Modo Co-Piloto
        try {
          const { error: rpcErr } = await supabase.rpc('atualizar_orcamento_co_piloto', {
            p_orc_id: o.id,
            p_payload: payload
          });
          if (!rpcErr) {
            resError = null;
          }
        } catch (e) {
          console.warn('RPC atualizar_orcamento_co_piloto falhou:', e);
        }
      }
    } else {
      const { error } = await supabase
        .from('orcamentos')
        .insert(payload);
      resError = error;
    }

    if (resError) {
      // Se o erro for de coluna inexistente no Supabase (Postgres code 42703 ou undefined_column)
      const isMissingColumn = 
        resError.code === '42703' ||
        (resError.message && resError.message.includes('column') && resError.message.includes('does not exist'));

      if (isMissingColumn) {
        console.warn('Aviso: Colunas novas não encontradas no Supabase. Removendo colunas recentes e aplicando fallback resiliente.');
        
        delete payload.valor_proposta;
        delete payload.cliente_id;
        delete payload.valor_viagem;
        delete payload.contato_realizado;
        delete payload.contato_realizado_por;
        delete payload.contato_realizado_em;
        
        let retryError;
        if (o.id && !o.id.startsWith('orc-')) {
          const { error } = await supabase
            .from('orcamentos')
            .update(payload)
            .eq('id', o.id);
          retryError = error;
        } else {
          const { error } = await supabase
            .from('orcamentos')
            .insert(payload);
          retryError = error;
        }
        if (retryError) throw retryError;
      } else {
        throw resError;
      }
    }

    // Regras de Gamificação XP
    if (o.consultorId) {
      if (isNew) {
        await registrarXp(o.consultorId, `orcamento_criado_${o.id || Date.now()}`, 25);
      }
      if (o.status === 'EM_ANDAMENTO' || o.status === 'AGUARDANDO') {
        await registrarXp(o.consultorId, `orcamento_andamento_${o.id}`, 50);
      }
    }

    return { success: true, dbVersionDegraded: false };
  }

  /**
   * Deleta um orçamento (e os lembretes associados)
   */
  static async deleteOrcamento(id: string): Promise<boolean> {
    // 1. Deleta lembretes associados primeiro para evitar violação de restrições
    const { error: lembreteError } = await supabase
      .from('lembretes')
      .delete()
      .eq('orcamento_id', id);

    if (lembreteError) {
      console.warn('Aviso: Erro ao limpar lembretes vinculados ao excluir orçamento:', lembreteError.message);
    }

    // 1.1. Deleta comentários associados
    const { error: comentariosError } = await supabase
      .from('comentarios')
      .delete()
      .eq('tipo_item', 'orcamento')
      .eq('item_id', id);

    if (comentariosError) {
      console.warn('Aviso: Erro ao limpar comentários vinculados ao excluir orçamento:', comentariosError.message);
    }

    // 2. Deleta o orçamento em si
    const { error } = await supabase
      .from('orcamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  /**
   * Cadastra um lembrete para um orçamento
   */
  static async createReminder(
    orcamentoId: string,
    userUserId: string,
    dataLembrete: string,
    periodo: string,
    descricao?: string
  ): Promise<void> {
    const payload: Record<string, any> = {
      orcamento_id: orcamentoId,
      consultor_id: userUserId,
      criador_id: userUserId,
      data_lembrete: dataLembrete,
      periodo: periodo,
      arquivado: false
    };

    if (descricao && descricao.trim() !== '') {
      payload.descricao = descricao.trim();
    }

    const { error } = await supabase
      .from('lembretes')
      .insert(payload);

    if (error) {
      // Fallback resiliente caso a coluna 'descricao' ainda não exista no banco (Postgres code 42703)
      if (error.code === '42703' && payload.descricao) {
        delete payload.descricao;
        const { error: retryErr } = await supabase
          .from('lembretes')
          .insert(payload);
        if (retryErr) throw retryErr;
        return;
      }
      throw error;
    }
  }

  /**
   * Alterna a validação de contato com o cliente em orçamentos desistidos (exclusivo para gestores/admins).
   * Possui fallback resiliente contra Schema Drift (código 42703).
   */
  static async alternarContatoDesistencia(
    orcamentoId: string,
    status: boolean,
    userPerfil: PerfilConsultor | null
  ): Promise<{ success: boolean; contatoRealizado: boolean; contatoRealizadoPor?: string; contatoRealizadoPorNome?: string; contatoRealizadoEm?: string }> {
    const agora = new Date().toISOString();
    const payload: Record<string, any> = status ? {
      contato_realizado: true,
      contato_realizado_por: userPerfil?.id || null,
      contato_realizado_em: agora,
      updated_at: agora
    } : {
      contato_realizado: false,
      contato_realizado_por: null,
      contato_realizado_em: null,
      updated_at: agora
    };

    const { error } = await supabase
      .from('orcamentos')
      .update(payload)
      .eq('id', orcamentoId);

    if (error) {
      // Tratamento de schema drift 42703
      if (error.code === '42703' || (error.message && error.message.includes('column') && error.message.includes('does not exist'))) {
        console.warn('Aviso: Colunas de contato_realizado não encontradas no Supabase (42703). Gravando observação de fallback.');
        const carimbo = status 
          ? `[Contato Gestor: Confirmado em ${new Date().toLocaleDateString('pt-BR')} por ${userPerfil?.nome || 'Admin'}]`
          : `[Contato Gestor: Desmarcado em ${new Date().toLocaleDateString('pt-BR')} por ${userPerfil?.nome || 'Admin'}]`;
        
        const { data: currentOrc } = await supabase.from('orcamentos').select('notas_negociacao').eq('id', orcamentoId).single();
        const notasAtuais = currentOrc?.notas_negociacao || '';
        await supabase.from('orcamentos').update({
          notas_negociacao: `${carimbo}\n${notasAtuais}`.trim(),
          updated_at: agora
        }).eq('id', orcamentoId);

        return {
          success: true,
          contatoRealizado: status,
          contatoRealizadoPor: userPerfil?.id,
          contatoRealizadoPorNome: userPerfil?.nome,
          contatoRealizadoEm: agora
        };
      }
      throw error;
    }

    return {
      success: true,
      contatoRealizado: status,
      contatoRealizadoPor: status ? userPerfil?.id : undefined,
      contatoRealizadoPorNome: status ? userPerfil?.nome : undefined,
      contatoRealizadoEm: status ? agora : undefined
    };
  }

  /**
   * Reabre um orçamento desistido, movendo-o para SOLICITADO e preservando histórico anterior.
   */
  static async reabrirOrcamento(
    orcamentoId: string,
    motivo: string,
    userPerfil: PerfilConsultor | null
  ): Promise<{ success: boolean; orcamentoAtualizado?: any }> {
    // 1. Buscar os dados atuais do orçamento
    const { data: orc, error: fetchErr } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('id', orcamentoId)
      .single();

    if (fetchErr) throw fetchErr;

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nomeAutor = userPerfil?.nome || 'Administrador';
    
    const headerLog = `[Orçamento Reaberto em ${dataFormatada} por ${nomeAutor}]`;
    const motivoLog = motivo && motivo.trim() ? `Motivo da Reabertura: ${motivo.trim()}` : 'Motivo da Reabertura: Não informado.';
    const blocoLog = `${headerLog}\n${motivoLog}`;
    const notasAnteriores = orc.notas_negociacao || '';
    const novasNotas = notasAnteriores ? `${blocoLog}\n----------------------------------\n${notasAnteriores}` : blocoLog;

    const payload: Record<string, any> = {
      status: 'SOLICITADO',
      sub_status: null,
      contato_realizado: false,
      contato_realizado_por: null,
      contato_realizado_em: null,
      notas_negociacao: novasNotas,
      updated_at: agora.toISOString()
    };

    let { error: updateErr } = await supabase
      .from('orcamentos')
      .update(payload)
      .eq('id', orcamentoId);

    if (updateErr) {
      // Fallback para Schema Drift caso colunas de contato_realizado não existam
      if (updateErr.code === '42703' || (updateErr.message && updateErr.message.includes('column') && updateErr.message.includes('does not exist'))) {
        delete payload.contato_realizado;
        delete payload.contato_realizado_por;
        delete payload.contato_realizado_em;

        const { error: retryErr } = await supabase
          .from('orcamentos')
          .update(payload)
          .eq('id', orcamentoId);

        if (retryErr) throw retryErr;
      } else {
        throw updateErr;
      }
    }

    // 2. Registrar comentário no histórico da proposta
    try {
      await supabase.from('comentarios').insert({
        tipo_item: 'orcamento',
        item_id: orcamentoId,
        parent_id: orcamentoId,
        usuario_id: userPerfil?.id || null,
        conteudo: `🔄 Orçamento reaberto para a etapa SOLICITADO por ${nomeAutor}.${motivo && motivo.trim() ? ' Motivo: ' + motivo.trim() : ''}`
      });
    } catch (commentErr) {
      console.warn('Aviso: Erro ao registrar comentário de reabertura:', commentErr);
    }

    return {
      success: true,
      orcamentoAtualizado: {
        ...orc,
        status: 'SOLICITADO',
        sub_status: null,
        subStatus: undefined,
        contato_realizado: false,
        contatoRealizado: false,
        notas_negociacao: novasNotas,
        notasNegociacao: novasNotas
      }
    };
  }

  /**
   * Carrega os dados detalhados do cliente e viagens ativas
   */
  static async loadClientDetailsAndTrips(clienteId: string): Promise<{ linkedClient: any; activeTrips: any[] }> {
    let linkedClient: any = null;
    let activeTrips: any[] = [];

    const { data: cliData, error: cliErr } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

    // Se o cliente não existir, apenas continue sem disparar exceção grave (pode ter sido deletado localmente)
    if (cliErr && cliErr.code !== 'PGRST116') {
      throw cliErr;
    }
    if (cliData) {
      linkedClient = cliData;
    }

    const { data: tripsData, error: tripsErr } = await supabase
      .from('viagens')
      .select('*')
      .eq('cliente_id', clienteId)
      .not('status', 'in', '("cancelada","concluida")');

    if (tripsErr) throw tripsErr;
    if (tripsData) {
      activeTrips = tripsData;
    }

    return { linkedClient, activeTrips };
  }

  /**
   * Conversão de orçamento aprovado em viagem, cliente e produto (fluxo de venda)
   */
  static async convertToTrip(
    orc: Orcamento,
    options: ConvertToTripOptions
  ): Promise<{ clienteId: string; newViagemId?: string }> {
    const {
      cNome,
      cEmail,
      cTelefone,
      cDoc,
      cDataNascimento,
      folderDriveUrl,
      isNovaViagem,
      vValor,
      origem,
      vDestino,
      vDestinoId,
      vLoc,
      vIda,
      vVolta,
      vStatus,
      vObs,
      vDataFinanceiro,
      prodTipo,
      prodFornecedor,
      prodDescricao,
      viagemId,
      existingTripValorTotal,
      existingTripDataIda
    } = options;

    let clienteId = orc.cliente_id || orc.clienteId || '';
    const isMockClient = !clienteId || clienteId.startsWith('cli-offline-') || clienteId.startsWith('cli-mocked-');

    // 1. Cadastrar/Obter/Atualizar Cliente no Supabase
    if (isMockClient) {
      // Verificar se o cliente já existe por email, telefone ou documento para evitar duplicidade
      let existingCli: any[] | null = null;
      const conditions: string[] = [];
      if (cEmail && cEmail.trim()) conditions.push(`email.eq.${cEmail.trim()}`);
      if (cTelefone && cTelefone.trim()) conditions.push(`telefone.eq.${cTelefone.trim()}`);
      if (cDoc && cDoc.trim()) conditions.push(`documento.eq.${cDoc.trim()}`);

      if (conditions.length > 0) {
        let queryCli = supabase.from('clientes').select('id');
        if (conditions.length === 1) {
          const [field, val] = conditions[0].split('.eq.');
          queryCli = queryCli.eq(field, val);
        } else {
          queryCli = queryCli.or(conditions.join(','));
        }
        const { data, error: errExist } = await queryCli.limit(1);
        if (errExist) {
          console.warn('Aviso ao verificar duplicidade de cliente no fechamento:', errExist.message);
        } else {
          existingCli = data;
        }
      }

      if (existingCli && existingCli.length > 0) {
        clienteId = existingCli[0].id;
        
        let existingClassificacoes: string[] = [];
        try {
          const { data: cliData } = await supabase
            .from('clientes')
            .select('classificacoes')
            .eq('id', clienteId)
            .single();
          if (cliData && cliData.classificacoes) {
            existingClassificacoes = cliData.classificacoes;
          }
        } catch (errClass) {
          console.warn('Erro ao carregar classificações atuais do cliente:', errClass);
        }

        const novasClassificacoes = [...existingClassificacoes];
        if (origem && !novasClassificacoes.includes(origem)) {
          novasClassificacoes.push(origem);
        }

        // Se encontramos o cliente cadastrado, vamos atualizar suas informações (por exemplo, o CPF que foi digitado no fechamento)
        const { error: errUpdateCli } = await supabase
          .from('clientes')
          .update({
            nome: cNome,
            email: cEmail || null,
            telefone: cTelefone || null,
            documento: cDoc || null,
            data_nascimento: cDataNascimento || null,
            google_drive_folder_url: folderDriveUrl || null,
            classificacoes: novasClassificacoes
          })
          .eq('id', clienteId);
 
        if (errUpdateCli) {
          console.warn('Aviso: Erro ao atualizar dados do cliente existente encontrado:', errUpdateCli.message);
        }
      } else {
        const { data: newCli, error: errCli } = await supabase
          .from('clientes')
          .insert({
            nome: cNome,
            email: cEmail,
            telefone: cTelefone,
            documento: cDoc,
            data_nascimento: cDataNascimento || null,
            consultor_responsavel_id: orc.consultorId,
            google_drive_folder_url: folderDriveUrl || null,
            classificacoes: origem ? [origem] : [],
            observacoes: `Criado automaticamente através do Orçamento aprovado ID ${orc.id}`
          })
          .select()
          .single();

        if (errCli) throw errCli;
        if (newCli) clienteId = newCli.id;
      }
    } else {
      // Se já possui uma ID válida do Supabase, vamos atualizar suas informações (como o CPF)
      let existingClassificacoes: string[] = [];
      try {
        const { data: cliData } = await supabase
          .from('clientes')
          .select('classificacoes')
          .eq('id', clienteId)
          .single();
        if (cliData && cliData.classificacoes) {
          existingClassificacoes = cliData.classificacoes;
        }
      } catch (errClass) {
        console.warn('Erro ao carregar classificações atuais do cliente:', errClass);
      }

      const novasClassificacoes = [...existingClassificacoes];
      if (origem && !novasClassificacoes.includes(origem)) {
        novasClassificacoes.push(origem);
      }

      const { error: errUpdateCli } = await supabase
        .from('clientes')
        .update({
          nome: cNome,
          email: cEmail || null,
          telefone: cTelefone || null,
          documento: cDoc || null,
          data_nascimento: cDataNascimento || null,
          google_drive_folder_url: folderDriveUrl || null,
          classificacoes: novasClassificacoes
        })
        .eq('id', clienteId);

      if (errUpdateCli) {
        console.warn('Aviso: Erro ao atualizar dados do cliente existente:', errUpdateCli.message);
      }
    }

    let newViagemId: string | undefined;

    if (isNovaViagem) {
      // FLUXO: CRIAR NOVA VIAGEM
      if (!vIda) {
        throw new Error('Por favor, informe a Data de Ida no formato correto DD/MM/AAAA.');
      }

      const { data: newVia, error: errVia } = await supabase
        .from('viagens')
        .insert({
          cliente_id: clienteId,
          consultor_id: orc.consultorId,
          destino: vDestino || '',
          destino_id: vDestinoId || orc.destino_id || orc.destinoId || null,
          codigo_localizador: vLoc || null,
          valor_total: vValor,
          data_ida: vIda,
          data_volta: vVolta,
          data_financeiro: vDataFinanceiro || null,
          status: vStatus || 'fechado',
          observacoes: vObs || null,
          origem: origem || null
        })
        .select()
        .single();

      if (errVia) throw errVia;
      if (newVia) {
        newViagemId = newVia.id;

        // Inserir produto inicial correspondente para manter alocação zerada e destravar a viagem no Kanban
        const prodTipoFinal = prodTipo || 'PACOTE';
        const prodFornFinal = prodFornecedor || 'OPERADORA';
        const prodDescFinal = prodDescricao || `Pacote ${vDestino || 'Viagem'}`;
        const isRavIni = isTipoRav(prodTipoFinal);
        const isMkpIni = isTipoMarkup(prodTipoFinal);
        const ravIni = isRavIni ? vValor : 0;
        const mkpIni = isMkpIni ? vValor : 0;
        const tarifaIni = (isRavIni || isMkpIni) ? 0 : vValor;

        try {
          await supabase
            .from('produtos_viagem')
            .insert({
              viagem_id: newVia.id,
              tipo: prodTipoFinal,
              fornecedor: prodFornFinal,
              descricao: prodDescFinal,
              codigo_reserva: vLoc || null,
              valor_custo: 0,
              valor_venda: vValor,
              tarifa: tarifaIni,
              taxa: 0,
              comissao: 0,
              markup: mkpIni,
              rav: ravIni,
              status: 'reservado',
              data_servico: vIda || new Date().toISOString().split('T')[0]
            });
        } catch (errProd) {
          console.warn('Aviso ao criar produto inicial da viagem convertida:', errProd);
        }
      }
    } else {
      // FLUXO: ADICIONAR À VIAGEM EXISTENTE
      if (!viagemId) throw new Error('A viagem selecionada não pôde ser encontrada.');
      const novoTotal = (existingTripValorTotal || 0) + vValor;

      // Atualizar o valor_total da viagem
      const { error: errUpdate } = await supabase
        .from('viagens')
        .update({ 
          valor_total: novoTotal,
          origem: origem || null
        })
        .eq('id', viagemId);

      if (errUpdate) throw errUpdate;

      // Inserir produto adicional na viagem existente
      const prodTipoFinal = prodTipo || 'OUTROS';
      const prodFornFinal = prodFornecedor || 'FORNECEDOR';
      const prodDescFinal = prodDescricao || 'Item Adicional Orçamento';
      const isRavAdd = isTipoRav(prodTipoFinal);
      const isMkpAdd = isTipoMarkup(prodTipoFinal);
      const ravAdd = isRavAdd ? vValor : 0;
      const mkpAdd = isMkpAdd ? vValor : 0;
      const tarifaAdd = (isRavAdd || isMkpAdd) ? 0 : vValor;

      try {
        await supabase
          .from('produtos_viagem')
          .insert({
            viagem_id: viagemId,
            tipo: prodTipoFinal,
            fornecedor: prodFornFinal,
            descricao: prodDescFinal,
            codigo_reserva: null,
            valor_custo: 0,
            valor_venda: vValor,
            tarifa: tarifaAdd,
            taxa: 0,
            comissao: 0,
            markup: mkpAdd,
            rav: ravAdd,
            status: 'reservado',
            data_servico: new Date().toISOString().split('T')[0]
          });
      } catch (errProd) {
        console.warn('Aviso ao criar produto adicional na viagem existente:', errProd);
      }
    }

    // 3. Atualizar Orçamento para CONCLUÍDO (ACEITO)
    const updatedOrcamento: Orcamento = {
      ...orc,
      status: 'CONCLUIDO',
      subStatus: 'ACEITO',
      clienteId: clienteId,
      cliente_id: clienteId,
      valorViagem: vValor,
      origem: origem
    };

    await this.persistOrcamento(updatedOrcamento);

    // Injetar registro de XP de fechamento de venda (100 XP)
    await registrarXp(orc.consultorId, `venda_aceita_${orc.id}`, 100);

    return { clienteId, newViagemId };
  }
}
