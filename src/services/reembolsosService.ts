/**
 * ReembolsosService
 * Camada de serviço centralizada para operações de reembolsos no PaxFlow.
 * Implementa resiliência a Schema Drift (Zero-Break) com fallback para erro 42703.
 */

import { supabase } from './supabase';
import { Reembolso } from '../types';

export interface CriarReembolsoParams {
  viagemId: string;
  produtoViagemId: string;
  consultorSolicitanteId: string;
  valorSolicitado: number;
  valorProdutoOriginal?: number;
  motivoCancelamento: string;
  formaDevolucao?: string;
  atualizarStatusViagem?: boolean;
}

export interface ViagemOrfaReembolso {
  id: string;
  codigo_ref?: string;
  codigo_localizador?: string;
  destino?: string;
  valor_total?: number;
  data_ida?: string;
  cliente?: {
    id?: string;
    nome?: string;
  } | null;
  produtos?: any[];
}

export class ReembolsosService {
  /**
   * Cria uma nova solicitação de reembolso vinculada a uma viagem e produto,
   * atualizando o produto para 'reembolsado' e, opcionalmente, a viagem para 'reembolso_solicitado'.
   * 
   * Trata nativamente o erro 42703 de Schema Drift caso a coluna forma_devolucao
   * ou valor_produto ainda não tenham sido criadas no banco de dados.
   */
  public static async criarSolicitacao(params: CriarReembolsoParams): Promise<{ sucesso: boolean; data?: any; error?: any }> {
    const {
      viagemId,
      produtoViagemId,
      consultorSolicitanteId,
      valorSolicitado,
      valorProdutoOriginal,
      motivoCancelamento,
      formaDevolucao = 'Estorno Cartão de Crédito',
      atualizarStatusViagem = true
    } = params;

    if (!viagemId || !produtoViagemId || !valorSolicitado || !motivoCancelamento) {
      return {
        sucesso: false,
        error: new Error('Parâmetros obrigatórios ausentes para criação de reembolso.')
      };
    }

    const dataHoje = new Date().toISOString().split('T')[0];

    // Payload primário completo
    const insertPayload: any = {
      viagem_id: viagemId,
      produto_viagem_id: produtoViagemId,
      consultor_solicitante_id: consultorSolicitanteId,
      valor_produto: valorProdutoOriginal || valorSolicitado,
      valor_solicitado: valorSolicitado,
      valor_aprovado: 0,
      valor_utilizado_pax: 0,
      status_tratativa: 'pendente_agencia',
      motivo_cancelamento: motivoCancelamento,
      forma_devolucao: formaDevolucao,
      status: 'solicitado',
      data_solicitacao: dataHoje
    };

    try {
      let { data, error } = await supabase
        .from('reembolsos')
        .insert(insertPayload)
        .select()
        .single();

      // Padrão Zero-Break: Fallback defensivo para erro 42703 (coluna inexistente no schema)
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
        console.warn('⚠️ PaxFlow ReembolsosService: Detectado schema drift (42703). Aplicando fallback em observacoes_financeiras...');

        const fallbackPayload = {
          viagem_id: viagemId,
          produto_viagem_id: produtoViagemId,
          consultor_solicitante_id: consultorSolicitanteId,
          valor_solicitado: valorSolicitado,
          motivo_cancelamento: motivoCancelamento,
          observacoes_financeiras: JSON.stringify({
            forma_devolucao: formaDevolucao,
            valor_produto: valorProdutoOriginal || valorSolicitado,
            valor_utilizado_pax: 0,
            status_tratativa: 'pendente_agencia'
          }),
          status: 'solicitado',
          data_solicitacao: dataHoje
        };

        const fallbackRes = await supabase
          .from('reembolsos')
          .insert(fallbackPayload)
          .select()
          .single();

        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        throw error;
      }

      // 1. Atualizar o status do Produto para 'reembolsado'
      await supabase
        .from('produtos_viagem')
        .update({ status: 'reembolsado' })
        .eq('id', produtoViagemId);

      // 2. Se habilitado, atualiza o status da Viagem para 'reembolso_solicitado'
      if (atualizarStatusViagem) {
        await supabase
          .from('viagens')
          .update({ status: 'reembolso_solicitado' })
          .eq('id', viagemId);
      }

      return { sucesso: true, data };
    } catch (err: any) {
      console.error('Erro ao registrar reembolso no serviço:', err);
      return { sucesso: false, error: err };
    }
  }

  /**
   * Identifica viagens com status 'reembolso_solicitado' que não possuem
   * registro detalhado correspondente na tabela 'reembolsos' (viagens órfãs).
   */
  public static async buscarViagensOrfasReembolso(): Promise<ViagemOrfaReembolso[]> {
    try {
      const { data, error } = await supabase
        .from('viagens')
        .select(`
          id,
          codigo_ref,
          codigo_localizador,
          destino,
          valor_total,
          data_ida,
          status,
          cliente:clientes (id, nome),
          reembolsos (id),
          produtos:produtos_viagem (*)
        `)
        .eq('status', 'reembolso_solicitado')
        .order('data_ida', { ascending: false });

      if (error || !data) return [];

      // Filtra apenas as que não possuem nenhum reembolso na tabela 'reembolsos'
      const orfas = data.filter((v: any) => !v.reembolsos || v.reembolsos.length === 0);

      return orfas.map((v: any) => ({
        id: v.id,
        codigo_ref: v.codigo_ref,
        codigo_localizador: v.codigo_localizador,
        destino: v.destino,
        valor_total: v.valor_total,
        data_ida: v.data_ida,
        cliente: v.cliente,
        produtos: v.produtos || []
      }));
    } catch (err) {
      console.warn('Erro ao buscar viagens órfãs de reembolso:', err);
      return [];
    }
  }

  /**
   * Obtém os reembolsos associados a uma determinada viagem
   */
  public static async obterReembolsosPorViagem(viagemId: string): Promise<Reembolso[]> {
    try {
      const { data, error } = await supabase
        .from('reembolsos')
        .select(`
          *,
          produto:produtos_viagem (*)
        `)
        .eq('viagem_id', viagemId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data;
    } catch (err) {
      console.warn('Erro ao obter reembolsos da viagem:', err);
      return [];
    }
  }
}
