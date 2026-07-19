import { supabase } from './supabase';
import { Viagem, PerfilConsultor, GlobalSettings } from '../types';

export class ViagensService {
  /**
   * Busca a lista de consultores ativos
   */
  public static async loadConsultores(): Promise<PerfilConsultor[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, role, avatar_url, ativo')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Busca as configurações globais da agência
   */
  public static async loadGlobalSettings(): Promise<GlobalSettings | null> {
    const { data, error } = await supabase
      .from('global_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Busca os tipos de produtos/serviços configurados no sistema
   */
  public static async loadTiposProduto(): Promise<any[]> {
    const { data, error } = await supabase
      .from('tipos_produto')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Busca as viagens operacionais da agência
   */
  public static async loadViagens(): Promise<any[]> {
    const { data, error } = await supabase
      .from('viagens')
      .select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)')
      .order('data_financeiro', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Cria uma nova viagem
   */
  public static async criarViagem(payload: any): Promise<any> {
    const { data, error } = await supabase
      .from('viagens')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza os dados de uma viagem existente
   */
  public static async atualizarViagem(viagemId: string, payload: any): Promise<void> {
    const { error } = await supabase
      .from('viagens')
      .update(payload)
      .eq('id', viagemId);

    if (error) throw error;
  }

  /**
   * Exclui uma viagem
   */
  public static async excluirViagem(viagemId: string): Promise<void> {
    const { error } = await supabase
      .from('viagens')
      .delete()
      .eq('id', viagemId);

    if (error) throw error;
  }

  /**
   * Adiciona um novo produto/serviço à viagem
   */
  public static async adicionarProduto(payload: any): Promise<any> {
    const { data, error } = await supabase
      .from('produtos_viagem')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza um produto/serviço de viagem existente
   */
  public static async atualizarProduto(produtoId: string, payload: any): Promise<void> {
    const { error } = await supabase
      .from('produtos_viagem')
      .update(payload)
      .eq('id', produtoId);

    if (error) throw error;
  }

  /**
   * Remove um produto da viagem
   */
  public static async removerProduto(produtoId: string): Promise<void> {
    const { error } = await supabase
      .from('produtos_viagem')
      .delete()
      .eq('id', produtoId);

    if (error) throw error;
  }

  /**
   * Busca os produtos específicos de uma viagem
   */
  public static async loadProdutosViagem(viagemId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('produtos_viagem')
      .select('*')
      .eq('viagem_id', viagemId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Busca produtos simplificados para validação rápida de status (incluindo markup/rav)
   */
  public static async loadProdutosValidaStatus(viagemId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('produtos_viagem')
      .select('valor_venda, tarifa, taxa, comissao, markup, rav, fornecedor, descricao')
      .eq('viagem_id', viagemId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Solicita reembolso de um produto
   */
  public static async solicitarReembolso(reembolsoPayload: any, viagemId: string, produtoId: string): Promise<void> {
    // 1. Criar a solicitação na tabela 'reembolsos'
    const { error: errorReembolso } = await supabase
      .from('reembolsos')
      .insert(reembolsoPayload);

    if (errorReembolso) throw errorReembolso;

    // 2. Atualizar o status da Viagem para 'reembolso_solicitado'
    const { error: errorViagem } = await supabase
      .from('viagens')
      .update({ status: 'reembolso_solicitado' })
      .eq('id', viagemId);

    if (errorViagem) throw errorViagem;

    // 3. Atualizar o status do Produto para 'reembolsado'
    const { error: errorProd } = await supabase
      .from('produtos_viagem')
      .update({ status: 'reembolsado' })
      .eq('id', produtoId);

    if (errorProd) throw errorProd;
  }
}
