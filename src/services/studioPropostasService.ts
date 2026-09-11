import { supabase } from './supabase';
import { StudioProposta, StudioAceiteFormal } from '../types';

/**
 * Serviço para gerenciamento de propostas e cadernos do PaxFlow Studio™.
 * Implementa o Padrão Zero-Break com resiliência estrita a schema drift (42703, 42P01, PGRST204, PGRST200).
 */
export class StudioPropostasService {
  private static TABELA = 'studio_propostas';
  private static TABELA_SETTINGS = 'global_settings';
  private static CHAVE_FALLBACK = 'studio_propostas_cache_drift';

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
      consultor_id: proposta.consultor_id || null,
      consultor_nome: proposta.consultor_nome || null,
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
        // Fallback para schema drift: coluna inexistente (42703), cache desatualizado (PGRST204) ou tabela ainda não migrada (42P01 / PGRST200)
        if (
          error.code === '42703' ||
          error.code === '42P01' ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST200' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist')
        ) {
          console.warn('[StudioPropostasService] Schema drift detectado na tabela studio_propostas. Ativando fallback resiliente.');
          return await this.salvarFallbackDrift(payload as StudioProposta);
        }
        throw error;
      }

      return data as StudioProposta;
    } catch (err: any) {
      if (
        err?.code === '42703' ||
        err?.code === '42P01' ||
        err?.code === 'PGRST204' ||
        err?.code === 'PGRST200' ||
        err?.message?.includes('schema cache') ||
        err?.message?.includes('does not exist')
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
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist')
        ) {
          return await this.buscarFallbackDrift(id);
        }
        return null;
      }

      return data as StudioProposta;
    } catch (err: any) {
      if (
        err?.code === '42703' ||
        err?.code === '42P01' ||
        err?.code === 'PGRST204' ||
        err?.code === 'PGRST200'
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
          error.code === 'PGRST200'
        ) {
          return await this.listarFallbackDrift();
        }
        return [];
      }

      return (data || []) as StudioProposta[];
    } catch {
      return await this.listarFallbackDrift();
    }
  }

  /**
   * Registra o aceite formal do passageiro com IP, dispositivo e timestamp.
   */
  public static async registrarAceite(id: string, aceite: StudioAceiteFormal): Promise<StudioProposta | null> {
    const atualizacao = {
      status: 'APROVADO' as const,
      aceite_formal: aceite
    };

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
            return await this.salvarFallbackDrift(propostaExistente);
          }
        }
        throw error;
      }

      return data as StudioProposta;
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
          return await this.salvarFallbackDrift(propostaExistente);
        }
      }
      throw err;
    }
  }

  /**
   * Converte a proposta aprovada em uma viagem ativa no sistema PaxFlow.
   */
  public static async converterEmViagem(propostaId: string): Promise<{ viagemId: string }> {
    const proposta = await this.buscarPorId(propostaId);
    if (!proposta) {
      throw new Error('Proposta não encontrada para conversão');
    }

    const { data: viagem, error: viagemErr } = await supabase
      .from('viagens')
      .insert({
        cliente: proposta.cliente_nome,
        passageiro: proposta.cliente_nome,
        destino: proposta.destino,
        data_embarque: proposta.data_ida || new Date().toISOString().split('T')[0],
        data_retorno: proposta.data_volta || null,
        valor_total: proposta.valor_total || 0,
        status: 'CONFIRMADA',
        observacoes: `Convertida do PaxFlow Studio (Proposta ${proposta.id}). Aceite formal registrado em: ${proposta.aceite_formal?.data_aceite || 'N/A'}`
      })
      .select('id')
      .single();

    if (viagemErr) {
      console.error('[StudioPropostasService] Erro ao criar viagem a partir da proposta:', viagemErr);
      throw viagemErr;
    }

    // Atualiza status da proposta para EFETIVADA
    await this.salvarProposta({
      ...proposta,
      status: 'EFETIVADA'
    });

    return { viagemId: viagem.id };
  }

  // ==========================================================================
  // FALLBACK SEGURO DE CONTINGÊNCIA (Zero-Break Pattern)
  // Persistido estruturadamente no Supabase (global_settings) - ZERO localStorage
  // ==========================================================================

  private static async obterListaContingencia(): Promise<StudioProposta[]> {
    try {
      const { data } = await supabase
        .from(this.TABELA_SETTINGS)
        .select('value')
        .eq('key', this.CHAVE_FALLBACK)
        .maybeSingle();

      if (data && data.value && Array.isArray(data.value)) {
        return data.value as StudioProposta[];
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
    const propostaNormalizada: StudioProposta = {
      ...proposta,
      id: proposta.id || this.gerarUuidSeguro(),
      created_at: proposta.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const index = lista.findIndex(p => p.id === propostaNormalizada.id);
    if (index >= 0) {
      lista[index] = propostaNormalizada;
    } else {
      lista.unshift(propostaNormalizada);
    }

    try {
      await supabase
        .from(this.TABELA_SETTINGS)
        .upsert({
          key: this.CHAVE_FALLBACK,
          value: lista,
          description: 'PaxFlow Studio - Fallback resiliente para schema drift'
        });
    } catch (err) {
      console.warn('[StudioPropostasService] Fallback em global_settings falhou:', err);
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
}
