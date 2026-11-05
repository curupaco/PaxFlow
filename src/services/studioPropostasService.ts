import { supabase } from './supabase';
import { StudioProposta, StudioAceiteFormal } from '../types';

/**
 * Serviço para gerenciamento de propostas e cadernos do PaxFlow Studio™.
 * Integridade total com schema físico oficial (Fail-Fast transparente).
 */
export class StudioPropostasService {
  private static TABELA = 'studio_propostas';

  /**
   * Normaliza os dados retornados do Supabase garantindo valores padrão para campos estendidos.
   */
  public static normalizarPropostaDoBanco(raw: any): StudioProposta {
    if (!raw) return raw;

    return {
      ...raw,
      consultor_avatar: raw.consultor_avatar ?? null,
      consultor_whatsapp: raw.consultor_whatsapp ?? null,
      consultor_telefone: raw.consultor_telefone ?? null,
      consultor_email: raw.consultor_email ?? null,
      titulo_cabecalho: raw.titulo_cabecalho ?? 'PAXFLOW LUXURY TRAVEL',
      visualizacoes_count: raw.visualizacoes_count ?? 0,
      ultima_visualizacao_em: raw.ultima_visualizacao_em ?? null,
      orcamento_origem_id: raw.orcamento_origem_id ?? null
    };
  }

  /**
   * Salva ou atualiza uma proposta do Studio no Supabase.
   */
  public static async salvarProposta(proposta: Partial<StudioProposta>): Promise<StudioProposta> {
    const payload: Record<string, any> = {
      cliente_nome: proposta.cliente_nome || 'Cliente',
      cliente_whatsapp: proposta.cliente_whatsapp || null,
      cliente_email: proposta.cliente_email || null,
      destino: proposta.destino || 'Destino a definir',
      data_ida: proposta.data_ida || null,
      data_volta: proposta.data_volta || null,
      valor_total: proposta.valor_total || 0,
      moeda: proposta.moeda || 'BRL',
      foto_capa_url: proposta.foto_capa_url || null,
      dados_extraidos: proposta.dados_extraidos || {},
      itinerario_dias: proposta.itinerario_dias || [],
      status: proposta.status || 'RASCUNHO',
      aceite_formal: proposta.aceite_formal || null,
      visualizacoes_count: proposta.visualizacoes_count !== undefined ? proposta.visualizacoes_count : 0,
      ultima_visualizacao_em: proposta.ultima_visualizacao_em || null,
      orcamento_origem_id: proposta.orcamento_origem_id || null,
      consultor_id: proposta.consultor_id || null,
      consultor_nome: proposta.consultor_nome || null,
      consultor_avatar: proposta.consultor_avatar || null,
      consultor_whatsapp: proposta.consultor_whatsapp || null,
      consultor_telefone: proposta.consultor_telefone || null,
      consultor_email: proposta.consultor_email || null,
      titulo_cabecalho: proposta.titulo_cabecalho || 'PAXFLOW LUXURY TRAVEL',
      agencia_id: proposta.agencia_id || null
    };

    if (proposta.id) {
      payload.id = proposta.id;
    }

    const { data, error } = await supabase
      .from(this.TABELA)
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('[StudioPropostasService] Erro ao salvar proposta:', error);
      throw error;
    }

    return this.normalizarPropostaDoBanco(data);
  }

  /**
   * Busca uma proposta específica por ID.
   */
  public static async buscarPorId(id: string): Promise<StudioProposta | null> {
    const { data, error } = await supabase
      .from(this.TABELA)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('[StudioPropostasService] Erro ao buscar proposta por ID:', error);
      throw error;
    }

    return this.normalizarPropostaDoBanco(data);
  }

  /**
   * Lista as propostas existentes ordenadas pelas mais recentes.
   */
  public static async listarPropostas(): Promise<StudioProposta[]> {
    const { data, error } = await supabase
      .from(this.TABELA)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[StudioPropostasService] Erro ao listar propostas:', error);
      throw error;
    }

    return (data || []).map(p => this.normalizarPropostaDoBanco(p));
  }

  /**
   * Registra o aceite formal do passageiro com IP, dispositivo e timestamp.
   * Converte automaticamente a proposta em Viagem Confirmada na operação,
   * move o orçamento de origem para Venda Fechada (ACEITO) e notifica o consultor no Inbox.
   */
  public static async registrarAceite(id: string, aceite: StudioAceiteFormal): Promise<StudioProposta | null> {
    const atualizacao = {
      status: 'APROVADO' as const,
      aceite_formal: aceite
    };

    const { data, error } = await supabase
      .from(this.TABELA)
      .update(atualizacao)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[StudioPropostasService] Erro ao registrar aceite formal:', error);
      throw error;
    }

    const propostaAprovada = data as StudioProposta;

    // Executa a conversão e automações em background seguro sem travar o retorno ao viajante
    try {
      await this.converterEmViagem(id);
    } catch (errConv) {
      console.error('[StudioPropostasService] Aviso ao automatizar conversão da proposta em viagem:', errConv);
    }

    return propostaAprovada;
  }

  /**
   * Converte a proposta aprovada em uma viagem ativa no sistema PaxFlow:
   * 1. Resolve ou cadastra o cliente na base de clientes;
   * 2. Cria a Viagem Confirmada na tabela 'viagens';
   * 3. Move o Orçamento de origem (se houver) para 'CONCLUIDO' com sub_status 'ACEITO';
   * 4. Gera Lembrete / Alerta comemorativo no Inbox do consultor;
   * 5. Dispara Notificação Web Push para o consultor;
   * 6. Atualiza o status da proposta para 'EFETIVADA'.
   */
  public static async converterEmViagem(propostaId: string): Promise<{ viagemId: string }> {
    const proposta = await this.buscarPorId(propostaId);
    if (!proposta) {
      throw new Error('Proposta não encontrada para conversão');
    }

    const hojeIso = new Date().toISOString().split('T')[0];
    const dataIda = proposta.data_ida || hojeIso;
    const dataVolta = proposta.data_volta || null;
    const valorTotal = proposta.valor_total || 0;
    const obsTexto = `Convertida do PaxFlow Studio (Proposta ${proposta.id}). Aceite formal registrado por ${proposta.aceite_formal?.cliente_nome || proposta.cliente_nome} (Doc: ${proposta.aceite_formal?.documento || 'N/A'}, IP: ${proposta.aceite_formal?.ip || 'N/A'}) em: ${proposta.aceite_formal?.data_aceite || hojeIso}`;

    // 1. Identificar ou vincular cliente
    let clienteId: string | null = null;
    try {
      if (proposta.cliente_email || proposta.cliente_whatsapp || proposta.aceite_formal?.documento) {
        const filters: string[] = [];
        if (proposta.cliente_email) filters.push(`email.eq.${proposta.cliente_email}`);
        if (proposta.cliente_whatsapp) filters.push(`telefone.eq.${proposta.cliente_whatsapp}`);
        if (proposta.aceite_formal?.documento) filters.push(`documento.eq.${proposta.aceite_formal.documento}`);

        if (filters.length > 0) {
          const { data: cliExistente } = await supabase
            .from('clientes')
            .select('id')
            .or(filters.join(','))
            .limit(1);

          if (cliExistente && cliExistente.length > 0) {
            clienteId = cliExistente[0].id;
          }
        }
      }

      // Se ainda não encontrou e temos nome do cliente
      if (!clienteId && proposta.cliente_nome) {
        const { data: cliPorNome } = await supabase
          .from('clientes')
          .select('id')
          .ilike('nome', proposta.cliente_nome.trim())
          .limit(1);

        if (cliPorNome && cliPorNome.length > 0) {
          clienteId = cliPorNome[0].id;
        } else {
          // Criar cliente básico
          const { data: novoCli } = await supabase
            .from('clientes')
            .insert({
              nome: proposta.cliente_nome.trim(),
              email: proposta.cliente_email || null,
              telefone: proposta.cliente_whatsapp || null,
              documento: proposta.aceite_formal?.documento || null
            })
            .select('id')
            .single();

          if (novoCli) {
            clienteId = novoCli.id;
          }
        }
      }
    } catch (errCli) {
      console.warn('[StudioPropostasService] Aviso ao vincular cliente na conversão:', errCli);
    }

    // 2. Inserir Viagem na tabela 'viagens'
    const payloadViagem: Record<string, any> = {
      cliente_id: clienteId,
      consultor_id: proposta.consultor_id || null,
      destino: proposta.destino || 'Destino a Definir',
      data_ida: dataIda,
      data_volta: dataVolta,
      valor_total: valorTotal,
      status: 'confirmada',
      observacoes: obsTexto,
      orcamento_id: proposta.orcamento_origem_id || null
    };

    const { data: vCreated, error: vErr } = await supabase
      .from('viagens')
      .insert(payloadViagem)
      .select('id')
      .single();

    if (vErr) {
      console.error('[StudioPropostasService] Erro ao criar viagem a partir da proposta:', vErr);
      throw vErr;
    }
    const viagemId = vCreated?.id;

    // 3. Atualizar Orçamento de origem para CONCLUIDO (ACEITO) no Kanban
    if (proposta.orcamento_origem_id) {
      try {
        const { error: orcErr } = await supabase
          .from('orcamentos')
          .update({
            status: 'CONCLUIDO',
            sub_status: 'ACEITO',
            valor_viagem: valorTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', proposta.orcamento_origem_id);

        if (orcErr) throw orcErr;
      } catch (errOrc) {
        console.warn('[StudioPropostasService] Aviso ao atualizar orçamento no Kanban:', errOrc);
      }
    }

    // 4. Inserir Lembrete / Alerta no Inbox para o consultor
    if (proposta.consultor_id) {
      const lembretePayload: Record<string, any> = {
        consultor_id: proposta.consultor_id,
        data_lembrete: hojeIso,
        periodo: 'manha',
        descricao: `🎉 Proposta Aprovada: ${proposta.cliente_nome} aprovou o roteiro para ${proposta.destino}! Viagem gerada na operação.`,
        viagem_id: viagemId || null,
        orcamento_id: proposta.orcamento_origem_id || null,
        arquivado: false
      };

      try {
        const { error: lembErr } = await supabase
          .from('lembretes')
          .insert(lembretePayload);

        if (lembErr) throw lembErr;
      } catch (errLemb) {
        console.warn('[StudioPropostasService] Aviso ao criar lembrete de proposta aprovada:', errLemb);
      }

      // 5. Disparar Web Push para o consultor
      try {
        const { PushSenderService } = await import('./pushSenderService');
        await PushSenderService.sendToUser(proposta.consultor_id, {
          title: `🎉 Proposta Aprovada pelo Passageiro!`,
          body: `${proposta.cliente_nome} aprovou ${proposta.destino}. Viagem criada com sucesso.`,
          url: `/#dashboard`
        });
      } catch (errPush) {
        console.warn('[StudioPropostasService] Aviso ao enviar Web Push de proposta aprovada:', errPush);
      }
    }

    // 6. Atualiza status da proposta para EFETIVADA
    await this.salvarProposta({
      ...proposta,
      status: 'EFETIVADA'
    });

    return { viagemId };
  }

  /**
   * Registra a visualização da proposta digital pelo viajante em tempo real (Viewer Analytics).
   * Incrementa visualizacoes_count e atualiza ultima_visualizacao_em de forma não-bloqueante.
   */
  public static async registrarAcessoLeitura(propostaId: string): Promise<StudioProposta | null> {
    if (!propostaId) return null;
    try {
      const proposta = await this.buscarPorId(propostaId);
      if (!proposta) return null;

      const visualizacoes = (proposta.visualizacoes_count || 0) + 1;
      const agoraIso = new Date().toISOString();

      const atualizada = await this.salvarProposta({
        ...proposta,
        visualizacoes_count: visualizacoes,
        ultima_visualizacao_em: agoraIso
      });

      return atualizada;
    } catch (err) {
      console.warn('[StudioPropostasService] Falha não impeditiva ao registrar leitura de proposta:', err);
      return null;
    }
  }

  /**
   * Gera uma proposta visual de luxo no Studio em 1-clique a partir de um Orçamento existente.
   * Seleciona fotografia cinematográfica automática para o destino e inicializa a timeline.
   */
  public static async criarPropostaFromOrcamento(orcamento: any, consultorInfo?: any): Promise<StudioProposta> {
    if (!orcamento) throw new Error('Dados do orçamento são obrigatórios para gerar proposta.');

    const destino = orcamento.destino || 'Destino Exclusivo';
    const clienteNome = orcamento.nomeCliente || orcamento.nome_cliente || 'Viajante';
    const contato = orcamento.contato || orcamento.telefone || null;
    const email = orcamento.email || null;
    const valor = Number(orcamento.valorProposta || orcamento.valor_proposta || 0);

    // Busca foto automática de alta resolução com base no destino
    let fotoCapa = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=80';
    try {
      const { StudioUnsplashService } = await import('./studioUnsplashService');
      const resultado = await StudioUnsplashService.buscarFotos(destino);
      if (resultado && resultado.fotos && resultado.fotos.length > 0) {
        fotoCapa = resultado.fotos[0].url;
      }
    } catch (_) {}

    // Converte data da viagem para ISO se necessário
    let dataIda: string | null = null;
    if (orcamento.dataViagem) {
      const dv = String(orcamento.dataViagem).trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dv)) {
        const parts = dv.split('/');
        dataIda = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(dv)) {
        dataIda = dv.substring(0, 10);
      }
    }

    const propostaPayload: Partial<StudioProposta> = {
      cliente_nome: clienteNome,
      cliente_whatsapp: contato,
      cliente_email: email,
      destino: destino,
      data_ida: dataIda || new Date().toISOString().split('T')[0],
      valor_total: valor,
      moeda: 'BRL',
      foto_capa_url: fotoCapa,
      status: 'RASCUNHO',
      orcamento_origem_id: orcamento.id,
      consultor_id: orcamento.consultorId || orcamento.consultor_id || consultorInfo?.id || null,
      consultor_nome: consultorInfo?.nome || null,
      consultor_avatar: consultorInfo?.avatar_url || null,
      consultor_whatsapp: consultorInfo?.whatsapp || consultorInfo?.telefone || null,
      consultor_email: consultorInfo?.email || null,
      titulo_cabecalho: 'PAXFLOW LUXURY TRAVEL',
      itinerario_dias: [
        {
          diaNumero: 1,
          dataStr: dataIda || new Date().toISOString().split('T')[0],
          tituloDia: `Boas-vindas a ${destino}`,
          itens: []
        }
      ]
    };

    return await this.salvarProposta(propostaPayload);
  }

  /**
   * Salva configurações do Studio em global_settings de forma transparente e Fail-Fast.
   */
  public static async salvarConfiguracoesStudio(settingsId: string, settings: {
    habilitar_studio_pro?: boolean;
    studio_moeda_padrao?: string;
    studio_validade_dias?: number;
    studio_permitir_aceite_formal?: boolean;
  }): Promise<{ sucesso: boolean; fallbackAplicado: boolean }> {
    const payload: Record<string, any> = {};
    if (settings.habilitar_studio_pro !== undefined) payload.habilitar_studio_pro = settings.habilitar_studio_pro;
    if (settings.studio_moeda_padrao !== undefined) payload.studio_moeda_padrao = settings.studio_moeda_padrao;
    if (settings.studio_validade_dias !== undefined) payload.studio_validade_dias = settings.studio_validade_dias;
    if (settings.studio_permitir_aceite_formal !== undefined) payload.studio_permitir_aceite_formal = settings.studio_permitir_aceite_formal;

    const { error } = await supabase
      .from('global_settings')
      .update(payload)
      .eq('id', settingsId);

    if (error) {
      console.error('[StudioPropostasService] Erro ao salvar configurações do Studio:', error);
      throw error;
    }

    return { sucesso: true, fallbackAplicado: false };
  }
}
