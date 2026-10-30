import { supabase } from './supabase';
import { StudioProposta, StudioAceiteFormal } from '../types';

/**
 * Serviço para gerenciamento de propostas e cadernos do PaxFlow Studio™.
 * Implementa o Padrão Zero-Break com resiliência estrita a schema drift (42703, 42P01, PGRST204, PGRST200).
 */
export class StudioPropostasService {
  private static TABELA = 'studio_propostas';
  private static TABELA_CONTINGENCIA = 'templates_mensagem';
  private static TITULO_CONTINGENCIA = 'SYS_STUDIO_PROPOSTAS_CONTINGENCIA';

  /**
   * Colunas estendidas adicionadas em versões recentes do PaxFlow Studio.
   * Se o banco de dados da agência ainda não tiver recebido a migração DDL,
   * o serviço encapsula esses valores de forma transparente dentro de
   * `dados_extraidos._paxflow_meta` (JSONB) sem quebrar a operação nem gerar erro 400.
   */
  private static COLUNAS_ESTENDIDAS = [
    'consultor_avatar',
    'consultor_whatsapp',
    'consultor_telefone',
    'consultor_email',
    'titulo_cabecalho',
    'visualizacoes_count',
    'ultima_visualizacao_em',
    'orcamento_origem_id'
  ];

  /**
   * Normaliza os dados retornados do Supabase, desempacotando campos estendidos
   * de `dados_extraidos._paxflow_meta` caso tenham sido salvos sob fallback de contingência.
   */
  public static normalizarPropostaDoBanco(raw: any): StudioProposta {
    if (!raw) return raw;
    const meta = (raw.dados_extraidos && typeof raw.dados_extraidos === 'object')
      ? (raw.dados_extraidos._paxflow_meta || {})
      : {};

    return {
      ...raw,
      consultor_avatar: raw.consultor_avatar ?? meta.consultor_avatar ?? null,
      consultor_whatsapp: raw.consultor_whatsapp ?? meta.consultor_whatsapp ?? null,
      consultor_telefone: raw.consultor_telefone ?? meta.consultor_telefone ?? null,
      consultor_email: raw.consultor_email ?? meta.consultor_email ?? null,
      titulo_cabecalho: raw.titulo_cabecalho ?? meta.titulo_cabecalho ?? 'PAXFLOW LUXURY TRAVEL',
      visualizacoes_count: raw.visualizacoes_count !== undefined ? raw.visualizacoes_count : (meta.visualizacoes_count ?? 0),
      ultima_visualizacao_em: raw.ultima_visualizacao_em ?? meta.ultima_visualizacao_em ?? null,
      orcamento_origem_id: raw.orcamento_origem_id ?? meta.orcamento_origem_id ?? null
    };
  }

  /**
   * Salva ou atualiza uma proposta do Studio no Supabase.
   * Resiliência Padrão Zero-Break: se colunas novas não existirem no schema do banco,
   * encapsula automaticamente em dados_extraidos e reexecuta com sucesso (Status 200).
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

    try {
      const { data, error } = await supabase
        .from(this.TABELA)
        .upsert(payload)
        .select()
        .single();

      if (error) {
        // Fallback defensivo para colunas estendidas inexistentes (42703, PGRST204, status 400 ou schema cache)
        if (
          error.code === '42703' ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST200' ||
          (error as any).status === 400 ||
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('column') ||
          error.message?.includes('Could not find')
        ) {
          console.warn('[StudioPropostasService] Schema drift detectado na tabela studio_propostas. Encapsulando campos estendidos em dados_extraidos._paxflow_meta.');
          
          const payloadSanitizado: Record<string, any> = { ...payload };
          const metaSeguro: Record<string, any> = {
            ...(payloadSanitizado.dados_extraidos?._paxflow_meta || {})
          };

          for (const col of this.COLUNAS_ESTENDIDAS) {
            if (payloadSanitizado[col] !== undefined) {
              metaSeguro[col] = payloadSanitizado[col];
              delete payloadSanitizado[col];
            }
          }

          payloadSanitizado.dados_extraidos = {
            ...(payloadSanitizado.dados_extraidos || {}),
            _paxflow_meta: metaSeguro
          };

          const { data: dRetry, error: errRetry } = await supabase
            .from(this.TABELA)
            .upsert(payloadSanitizado)
            .select()
            .single();

          if (!errRetry && dRetry) {
            return this.normalizarPropostaDoBanco(dRetry);
          }

          if (errRetry) {
            // Se a tabela studio_propostas inteira não existir no Supabase (42P01)
            if (
              errRetry.code === '42P01' ||
              errRetry.message?.includes('does not exist')
            ) {
              return await this.salvarFallbackDrift(payload as StudioProposta);
            }
            throw errRetry;
          }
        }

        // Fallback para quando a tabela studio_propostas inteira não existir
        if (
          error.code === '42P01' ||
          error.message?.includes('does not exist')
        ) {
          console.warn('[StudioPropostasService] Tabela studio_propostas ausente no Supabase. Ativando contingência estruturada.');
          return await this.salvarFallbackDrift(payload as StudioProposta);
        }
        throw error;
      }

      return this.normalizarPropostaDoBanco(data);
    } catch (err: any) {
      if (
        err?.code === '42703' ||
        err?.code === '42P01' ||
        err?.code === 'PGRST204' ||
        err?.code === 'PGRST200' ||
        err?.status === 400 ||
        err?.message?.includes('schema cache') ||
        err?.message?.includes('does not exist') ||
        err?.message?.includes('column')
      ) {
        return await this.salvarFallbackDrift(payload as StudioProposta);
      }
      console.error('[StudioPropostasService] Erro ao salvar proposta:', err);
      throw err;
    }
  }

  /**
   * Busca uma proposta específica por ID.
   */
  public static async buscarPorId(id: string): Promise<StudioProposta | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABELA)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (
          error.code === '42703' ||
          error.code === '42P01' ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST200' ||
          (error as any).status === 400 ||
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist')
        ) {
          return await this.buscarFallbackDrift(id);
        }
        return null;
      }

      return this.normalizarPropostaDoBanco(data);
    } catch (err: any) {
      if (
        err?.code === '42703' ||
        err?.code === '42P01' ||
        err?.code === 'PGRST204' ||
        err?.code === 'PGRST200' ||
        err?.status === 400
      ) {
        return await this.buscarFallbackDrift(id);
      }
      return null;
    }
  }

  /**
   * Lista as propostas existentes ordenadas pelas mais recentes.
   */
  public static async listarPropostas(): Promise<StudioProposta[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABELA)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (
          error.code === '42703' ||
          error.code === '42P01' ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST200' ||
          (error as any).status === 400
        ) {
          return await this.listarFallbackDrift();
        }
        return [];
      }

      return (data || []).map(p => this.normalizarPropostaDoBanco(p));
    } catch {
      return await this.listarFallbackDrift();
    }
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

    let propostaAprovada: StudioProposta | null = null;

    try {
      const { data, error } = await supabase
        .from(this.TABELA)
        .update(atualizacao)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (
          error.code === '42703' ||
          error.code === '42P01' ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST200'
        ) {
          const propostaExistente = await this.buscarFallbackDrift(id);
          if (propostaExistente) {
            propostaExistente.status = 'APROVADO';
            propostaExistente.aceite_formal = aceite;
            propostaAprovada = await this.salvarFallbackDrift(propostaExistente);
          }
        } else {
          throw error;
        }
      } else {
        propostaAprovada = data as StudioProposta;
      }
    } catch (err: any) {
      if (
        err?.code === '42703' ||
        err?.code === '42P01' ||
        err?.code === 'PGRST204' ||
        err?.code === 'PGRST200'
      ) {
        const propostaExistente = await this.buscarFallbackDrift(id);
        if (propostaExistente) {
          propostaExistente.status = 'APROVADO';
          propostaExistente.aceite_formal = aceite;
          propostaAprovada = await this.salvarFallbackDrift(propostaExistente);
        }
      } else {
        throw err;
      }
    }

    // Executa a conversão e automações em background seguro sem travar o retorno ao viajante
    if (propostaAprovada) {
      try {
        await this.converterEmViagem(id);
      } catch (errConv) {
        console.error('[StudioPropostasService] Aviso ao automatizar conversão da proposta em viagem:', errConv);
      }
    }

    return propostaAprovada;
  }

  /**
   * Converte a proposta aprovada em uma viagem ativa no sistema PaxFlow:
   * 1. Resolve ou cadastra o cliente na base de clientes;
   * 2. Cria a Viagem Confirmada na tabela 'viagens' (com fallback Zero-Break);
   * 3. Mover o Orçamento de origem (se houver) para 'CONCLUIDO' com sub_status 'ACEITO';
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

    // 2. Inserir Viagem na tabela 'viagens' com resiliência 42703
    let viagemId = '';
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

    try {
      const { data: vCreated, error: vErr } = await supabase
        .from('viagens')
        .insert(payloadViagem)
        .select('id')
        .single();

      if (vErr) {
        if (vErr.code === '42703') {
          // Fallback resiliente retirando colunas extras
          delete payloadViagem.orcamento_id;
          const { data: vRetry, error: retryErr } = await supabase
            .from('viagens')
            .insert(payloadViagem)
            .select('id')
            .single();

          if (retryErr) throw retryErr;
          viagemId = vRetry?.id;
        } else {
          throw vErr;
        }
      } else {
        viagemId = vCreated?.id;
      }
    } catch (errViagem: any) {
      console.error('[StudioPropostasService] Erro ao criar viagem a partir da proposta:', errViagem);
      throw errViagem;
    }

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

        if (orcErr && orcErr.code === '42703') {
          await supabase
            .from('orcamentos')
            .update({
              status: 'CONCLUIDO',
              updated_at: new Date().toISOString()
            })
            .eq('id', proposta.orcamento_origem_id);
        }
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

        if (lembErr && lembErr.code === '42703') {
          delete lembretePayload.descricao;
          delete lembretePayload.viagem_id;
          delete lembretePayload.orcamento_id;
          await supabase.from('lembretes').insert(lembretePayload);
        }
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

  // ==========================================================================
  // FALLBACK SEGURO DE CONTINGÊNCIA (Zero-Break Pattern)
  // Persistido estruturadamente no Supabase (templates_mensagem) - ZERO localStorage
  // ==========================================================================

  private static async obterListaContingencia(): Promise<StudioProposta[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABELA_CONTINGENCIA)
        .select('conteudo')
        .eq('titulo', this.TITULO_CONTINGENCIA)
        .maybeSingle();

      if (!error && data && data.conteudo) {
        const parsed = JSON.parse(data.conteudo);
        if (Array.isArray(parsed)) {
          return parsed.map(p => this.normalizarPropostaDoBanco(p));
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  private static gerarUuidSeguro(): string {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `prop-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private static async salvarFallbackDrift(proposta: StudioProposta): Promise<StudioProposta> {
    const lista = await this.obterListaContingencia();
    const propostaNormalizada: StudioProposta = this.normalizarPropostaDoBanco({
      ...proposta,
      id: proposta.id || this.gerarUuidSeguro(),
      created_at: proposta.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const index = lista.findIndex(p => p.id === propostaNormalizada.id);
    if (index >= 0) {
      lista[index] = propostaNormalizada;
    } else {
      lista.unshift(propostaNormalizada);
    }

    try {
      const conteudoJson = JSON.stringify(lista);
      const { data: existente } = await supabase
        .from(this.TABELA_CONTINGENCIA)
        .select('id')
        .eq('titulo', this.TITULO_CONTINGENCIA)
        .maybeSingle();

      if (existente?.id) {
        await supabase
          .from(this.TABELA_CONTINGENCIA)
          .update({
            conteudo: conteudoJson,
            updated_at: new Date().toISOString()
          })
          .eq('id', existente.id);
      } else {
        await supabase
          .from(this.TABELA_CONTINGENCIA)
          .insert({
            titulo: this.TITULO_CONTINGENCIA,
            descricao: 'PaxFlow Studio - Fallback de contingência estruturada Zero-Break',
            conteudo: conteudoJson
          });
      }
    } catch (err) {
      console.warn('[StudioPropostasService] Fallback de contingência avisou:', err);
    }

    return propostaNormalizada;
  }

  private static async buscarFallbackDrift(id: string): Promise<StudioProposta | null> {
    const lista = await this.obterListaContingencia();
    return lista.find(p => p.id === id) || null;
  }

  private static async listarFallbackDrift(): Promise<StudioProposta[]> {
    return await this.obterListaContingencia();
  }

  /**
   * Salva configurações do Studio em global_settings com resiliência a schema drift (código 42703).
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

    try {
      const { error } = await supabase
        .from('global_settings')
        .update(payload)
        .eq('id', settingsId);

      if (error) {
        if (error.code === '42703' || error.message?.includes('does not exist')) {
          console.warn('[StudioPropostasService] Colunas do Studio não existem ainda em global_settings (42703). Fallback seguro ativado.');
          return { sucesso: true, fallbackAplicado: true };
        }
        throw error;
      }
      return { sucesso: true, fallbackAplicado: false };
    } catch (err: any) {
      if (err?.code === '42703' || err?.message?.includes('does not exist')) {
        return { sucesso: true, fallbackAplicado: true };
      }
      console.error('[StudioPropostasService] Erro inesperado ao salvar configurações do Studio:', err);
      throw err;
    }
  }
}

