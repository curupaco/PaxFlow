import { supabase } from './supabase';
import { PerfilConsultor, Orcamento, Cliente, ConvertToTripOptions } from '../types';

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
      .select('*')
      .order('created_at', { ascending: false });

    // Consultor comum só vê seus próprios orçamentos
    if (perfil && perfil.role !== 'admin') {
      query = query.eq('consultor_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(d => ({
      id: d.id,
      consultorId: d.consultor_id,
      clienteId: d.cliente_id,
      cliente_id: d.cliente_id,
      nomeCliente: d.nome_cliente,
      contato: d.contato,
      destino: d.destino,
      dataViagem: d.data_viagem,
      temperatura: d.temperatura,
      tags: d.tags || [],
      status: d.status,
      subStatus: d.sub_status,
      notasNegociacao: d.notas_negociacao,
      valorProposta: d.valor_proposta,
      documentosUrl: d.documentos_url || [],
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
      data_viagem: o.dataViagem || null,
      temperatura: o.temperatura,
      tags: o.tags,
      status: o.status,
      sub_status: o.subStatus || null,
      notas_negociacao: o.notasNegociacao || null,
      valor_proposta: o.valorProposta || null,
      documentos_url: o.documentosUrl || []
    };

    let resError;
    if (o.id && !o.id.startsWith('orc-')) {
      const { error } = await supabase
        .from('orcamentos')
        .update(payload)
        .eq('id', o.id);
      resError = error;
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
        console.warn('Aviso: Colunas novas não encontradas no Supabase. Salvando sem valor_proposta/cliente_id.');
        
        delete payload.valor_proposta;
        delete payload.cliente_id;
        
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
        return { success: true, dbVersionDegraded: true };
      }
      throw resError;
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
    periodo: string
  ): Promise<void> {
    const { error } = await supabase
      .from('lembretes')
      .insert({
        orcamento_id: orcamentoId,
        consultor_id: userUserId,
        data_lembrete: dataLembrete,
        periodo: periodo,
        arquivado: false
      });

    if (error) throw error;
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
      folderDriveUrl,
      isNovaViagem,
      vValor,
      vDestino,
      vLoc,
      vIda,
      vVolta,
      vStatus,
      vObs,
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
      // Verificar se o cliente já existe por email ou telefone para evitar duplicidade
      const { data: existingCli, error: errExist } = await supabase
        .from('clientes')
        .select('id')
        .or(`email.eq.${cEmail},telefone.eq.${cTelefone}`)
        .limit(1);

      if (errExist) throw errExist;

      if (existingCli && existingCli.length > 0) {
        clienteId = existingCli[0].id;
        // Se encontramos o cliente cadastrado, vamos atualizar suas informações (por exemplo, o CPF que foi digitado no fechamento)
        const { error: errUpdateCli } = await supabase
          .from('clientes')
          .update({
            nome: cNome,
            email: cEmail || null,
            telefone: cTelefone || null,
            documento: cDoc || null,
            google_drive_folder_url: folderDriveUrl || null
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
            consultor_responsavel_id: orc.consultorId,
            google_drive_folder_url: folderDriveUrl || null,
            observacoes: `Criado automaticamente através do Orçamento aprovado ID ${orc.id}`
          })
          .select()
          .single();

        if (errCli) throw errCli;
        if (newCli) clienteId = newCli.id;
      }
    } else {
      // Se já possui uma ID válida do Supabase, vamos atualizar suas informações (como o CPF)
      const { error: errUpdateCli } = await supabase
        .from('clientes')
        .update({
          nome: cNome,
          email: cEmail || null,
          telefone: cTelefone || null,
          documento: cDoc || null,
          google_drive_folder_url: folderDriveUrl || null
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
      if (!vVolta) {
        throw new Error('Por favor, informe a Data de Volta no formato correto DD/MM/AAAA.');
      }

      const { data: newVia, error: errVia } = await supabase
        .from('viagens')
        .insert({
          cliente_id: clienteId,
          consultor_id: orc.consultorId,
          destino: vDestino || '',
          codigo_localizador: vLoc || null,
          valor_total: vValor,
          data_ida: vIda,
          data_volta: vVolta,
          status: vStatus || 'planejamento',
          observacoes: vObs || null
        })
        .select()
        .single();

      if (errVia) throw errVia;
      if (newVia) {
        newViagemId = newVia.id;
      }

      // Cadastrar Produto na Viagem Recém Criada
      const { error: errProd } = await supabase
        .from('produtos_viagem')
        .insert({
          viagem_id: newViagemId,
          tipo: prodTipo,
          fornecedor: prodFornecedor,
          descricao: prodDescricao,
          valor_custo: 0,
          valor_venda: vValor,
          status: 'reservado',
          data_servico: vIda
        });
      if (errProd) throw errProd;
    } else {
      // FLUXO: ADICIONAR À VIAGEM EXISTENTE
      if (!viagemId) throw new Error('A viagem selecionada não pôde ser encontrada.');
      const novoTotal = (existingTripValorTotal || 0) + vValor;

      // Atualizar o valor_total da viagem
      const { error: errUpdate } = await supabase
        .from('viagens')
        .update({ valor_total: novoTotal })
        .eq('id', viagemId);

      if (errUpdate) throw errUpdate;

      // Inserir o produto_viagem apontando para a viagem existente
      const { error: errProd } = await supabase
        .from('produtos_viagem')
        .insert({
          viagem_id: viagemId,
          tipo: prodTipo,
          fornecedor: prodFornecedor,
          descricao: prodDescricao,
          valor_custo: 0,
          valor_venda: vValor,
          status: 'reservado',
          data_servico: existingTripDataIda || new Date().toISOString().split('T')[0]
        });

      if (errProd) throw errProd;
    }

    // 3. Atualizar Orçamento para CONCLUÍDO (ACEITO)
    const updatedOrcamento: Orcamento = {
      ...orc,
      status: 'CONCLUIDO',
      subStatus: 'ACEITO',
      clienteId: clienteId,
      cliente_id: clienteId
    };

    await this.persistOrcamento(updatedOrcamento);

    return { clienteId, newViagemId };
  }
}
