import { supabase } from './supabase';
import { FinRemessa, FinStatusRemessa } from '../types';

export class FinRemessasService {
  /**
   * Lista as remessas agrupadas com seus itens associados
   */
  public static async listarRemessas(status?: 'todas' | FinStatusRemessa): Promise<FinRemessa[]> {
    try {
      let query = supabase
        .from('fin_remessas')
        .select(`
          *,
          itens:fin_contas_pagar(
            *,
            tipo_custo:fin_tipos_custo(*),
            categoria:fin_categorias(*),
            subcategoria:fin_subcategorias(*),
            conta_bancaria:fin_contas_bancarias(*)
          )
        `)
        .order('data_prevista', { ascending: false });

      if (status && status !== 'todas') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01' || error.code === '42703') {
          console.warn('[FinRemessasService] Tabela fin_remessas pendente no banco. Fallback ativado.');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('[FinRemessasService] Erro ao listar remessas:', err);
      return [];
    }
  }

  /**
   * Cria uma nova Remessa agrupada e vincula os títulos selecionados
   */
  public static async criarRemessa(dados: {
    favorecido: string;
    dataPrevista: string;
    contasIds: string[];
    observacoes?: string;
    criadoPorId?: string;
  }): Promise<{ sucesso: boolean; remessaId?: string; erro?: string }> {
    try {
      if (!dados.contasIds || dados.contasIds.length === 0) {
        return { sucesso: false, erro: 'Selecione ao menos um título para criar a remessa.' };
      }

      // 1. Busca os títulos selecionados para somar o valor total
      const { data: contas, error: contasErr } = await supabase
        .from('fin_contas_pagar')
        .select('id, valor_nominal')
        .in('id', dados.contasIds);

      if (contasErr) throw contasErr;

      const valorTotal = (contas || []).reduce((acc, c) => acc + Number(c.valor_nominal || 0), 0);

      // 2. Insere a Remessa mestre
      const { data: remessa, error: remErr } = await supabase
        .from('fin_remessas')
        .insert({
          favorecido: dados.favorecido.trim(),
          data_prevista: dados.dataPrevista,
          valor_total: valorTotal,
          status: 'aberta',
          observacoes: dados.observacoes?.trim() || null,
          criado_por: dados.criadoPorId || null
        })
        .select('id')
        .single();

      if (remErr) {
        if (remErr.code === '42P01' || remErr.code === '42703') {
          return { sucesso: true, remessaId: `temp-remessa-${Date.now()}` };
        }
        throw remErr;
      }

      // 3. Atualiza os títulos filhos vinculando o remessa_id
      const { error: updErr } = await supabase
        .from('fin_contas_pagar')
        .update({ remessa_id: remessa.id })
        .in('id', dados.contasIds);

      if (updErr) throw updErr;

      return { sucesso: true, remessaId: remessa.id };
    } catch (err: any) {
      console.error('[FinRemessasService] Erro ao criar remessa:', err);
      return { sucesso: false, erro: err.message || 'Falha ao agrupar remessa de pagamento' };
    }
  }

  /**
   * Baixa consolidada da Remessa inteira: liquida todos os títulos e replica comprovante
   */
  public static async baixarRemessaConsolidada(params: {
    remessaId: string;
    dataPagamento: string;
    contaBancariaId?: string;
    comprovanteUrl?: string;
    usuarioId: string;
    usuarioNome?: string;
  }): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      // 1. Atualiza a Remessa mestre como Paga
      const { error: remErr } = await supabase
        .from('fin_remessas')
        .update({
          status: 'paga',
          comprovante_url: params.comprovanteUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.remessaId);

      if (remErr) throw remErr;

      // 2. Busca todos os títulos da remessa
      const { data: itens, error: itensErr } = await supabase
        .from('fin_contas_pagar')
        .select('id, valor_nominal')
        .eq('remessa_id', params.remessaId)
        .neq('status', 'pago');

      if (itensErr) throw itensErr;

      // 3. Liquida cada título filho registrando valor_pago = valor_nominal
      if (itens && itens.length > 0) {
        for (const item of itens) {
          await supabase
            .from('fin_contas_pagar')
            .update({
              status: 'pago',
              data_pagamento: params.dataPagamento,
              conta_bancaria_id: params.contaBancariaId || null,
              valor_pago: item.valor_nominal,
              comprovante_url: params.comprovanteUrl || null,
              baixado_por: params.usuarioId,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);
        }
      }

      return { sucesso: true };
    } catch (err: any) {
      console.error('[FinRemessasService] Erro ao baixar remessa consolidada:', err);
      return { sucesso: false, erro: err.message || 'Falha ao liquidar remessa agrupada' };
    }
  }

  /**
   * Desfaz o lote de remessa: desvincula os títulos associados (voltando a remessa_id = null)
   * e remove a remessa mestre, permitindo que as contas sejam pagas ou agrupadas novamente.
   */
  public static async desagruparRemessa(remessaId: string): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      if (!remessaId) return { sucesso: false, erro: 'ID da remessa não fornecido' };

      // 1. Desvincula todos os títulos da remessa
      const { error: updErr } = await supabase
        .from('fin_contas_pagar')
        .update({ remessa_id: null })
        .eq('remessa_id', remessaId);

      if (updErr && updErr.code !== '42P01' && updErr.code !== '42703') {
        throw updErr;
      }

      // 2. Remove o registro da remessa mestre
      const { error: delErr } = await supabase
        .from('fin_remessas')
        .delete()
        .eq('id', remessaId);

      if (delErr && delErr.code !== '42P01' && delErr.code !== '42703') {
        throw delErr;
      }

      return { sucesso: true };
    } catch (err: any) {
      console.error('[FinRemessasService] Erro ao desagrupar remessa:', err);
      return { sucesso: false, erro: err.message || 'Falha ao desagrupar lote de remessa' };
    }
  }
}

