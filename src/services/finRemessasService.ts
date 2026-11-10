import { supabase } from './supabase';
import { FinRemessa, FinStatusRemessa, FinFormaPagamento } from '../types';

export class FinRemessasService {
  /**
   * Lista as remessas agrupadas com seus itens associados e conta bancária
   */
  public static async listarRemessas(status?: 'todas' | FinStatusRemessa): Promise<FinRemessa[]> {
    try {
      let query = supabase
        .from('fin_remessas')
        .select(`
          *,
          conta_bancaria:fin_contas_bancarias(*),
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
   * Baixa consolidada da Remessa inteira: liquida todos os títulos com a mesma forma de pagamento e conta bancária
   */
  public static async baixarRemessaConsolidada(params: {
    remessaId: string;
    dataPagamento: string;
    contaBancariaId: string;
    formaPagamento: FinFormaPagamento | string;
    comprovanteUrl?: string;
    observacoes?: string;
    usuarioId: string;
    usuarioNome?: string;
  }): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      if (!params.remessaId) {
        return { sucesso: false, erro: 'ID da remessa não fornecido' };
      }
      if (!params.contaBancariaId) {
        return { sucesso: false, erro: 'Selecione a conta bancária de saída do pagamento.' };
      }
      if (!params.formaPagamento) {
        return { sucesso: false, erro: 'Selecione a forma de pagamento do lote.' };
      }
      if (!params.dataPagamento) {
        return { sucesso: false, erro: 'Informe a data do pagamento.' };
      }

      // 1. Atualiza a Remessa mestre como Paga
      const { error: remErr } = await supabase
        .from('fin_remessas')
        .update({
          status: 'paga',
          data_pagamento: params.dataPagamento,
          conta_bancaria_id: params.contaBancariaId,
          forma_pagamento: params.formaPagamento,
          comprovante_url: params.comprovanteUrl || null,
          baixado_por: params.usuarioId,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.remessaId);

      if (remErr) throw remErr;

      // 2. Busca todos os títulos da remessa
      const { data: itens, error: itensErr } = await supabase
        .from('fin_contas_pagar')
        .select('id, valor_nominal')
        .eq('remessa_id', params.remessaId);

      if (itensErr) throw itensErr;

      // 3. Liquida cada título filho registrando a mesma forma de pagamento e conta
      if (itens && itens.length > 0) {
        for (const item of itens) {
          await supabase
            .from('fin_contas_pagar')
            .update({
              status: 'pago',
              data_pagamento: params.dataPagamento,
              conta_bancaria_id: params.contaBancariaId,
              forma_pagamento: params.formaPagamento,
              valor_pago: item.valor_nominal,
              valor_estimado: false, // Valor realizado e liquidado na remessa
              comprovante_url: params.comprovanteUrl || null,
              baixado_por: params.usuarioId,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          try {
            await supabase.from('fin_auditoria').insert({
              conta_id: item.id,
              usuario_id: params.usuarioId,
              acao: 'baixa',
              detalhes: {
                tipo: 'baixa_lote_remessa',
                remessa_id: params.remessaId,
                data_pagamento: params.dataPagamento,
                forma_pagamento: params.formaPagamento,
                conta_bancaria_id: params.contaBancariaId,
                usuario_nome: params.usuarioNome
              }
            });
          } catch (auditErr) {
            console.warn('[FinRemessasService] Falha não bloqueante ao registrar auditoria:', auditErr);
          }
        }
      }

      return { sucesso: true };
    } catch (err: any) {
      console.error('[FinRemessasService] Erro ao baixar remessa consolidada:', err);
      return { sucesso: false, erro: err.message || 'Falha ao liquidar remessa agrupada' };
    }
  }

  /**
   * Reversão consolidada de um Lote / Remessa baixado
   * Reverte a remessa mestre para 'aberta' e todos os seus títulos filhos de volta para pendente/atrasado
   */
  public static async reverterBaixaRemessa(params: {
    remessaId: string;
    usuarioId: string;
    usuarioRole?: string;
    motivo?: string;
    usuarioNome?: string;
  }): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      if (!params.remessaId) return { sucesso: false, erro: 'ID da remessa não fornecido' };

      // 1. Atualiza a Remessa mestre de volta para 'aberta'
      const { error: remErr } = await supabase
        .from('fin_remessas')
        .update({
          status: 'aberta',
          data_pagamento: null,
          conta_bancaria_id: null,
          forma_pagamento: null,
          comprovante_url: null,
          baixado_por: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.remessaId);

      if (remErr) throw remErr;

      // 2. Busca todos os títulos da remessa
      const { data: itens, error: itensErr } = await supabase
        .from('fin_contas_pagar')
        .select('id, data_vencimento, data_vencimento_operacional, observacoes, valor_nominal')
        .eq('remessa_id', params.remessaId);

      if (itensErr) throw itensErr;

      // 3. Reverte cada título para pendente (ou atrasado se vencimento passou)
      const hojeIso = new Date().toISOString().split('T')[0];
      if (itens && itens.length > 0) {
        for (const item of itens) {
          const vDate = (item.data_vencimento_operacional || item.data_vencimento || '').split('T')[0];
          const novoStatus = (vDate && vDate < hojeIso) ? 'atrasado' : 'pendente';
          const motivoFmt = params.motivo 
            ? `[ESTORNO LOTE ${new Date().toLocaleDateString('pt-BR')}] ${params.motivo}` 
            : `[ESTORNO LOTE ${new Date().toLocaleDateString('pt-BR')}] Baixa do lote revertida`;

          await supabase
            .from('fin_contas_pagar')
            .update({
              status: novoStatus,
              data_pagamento: null,
              conta_bancaria_id: null,
              forma_pagamento: null,
              valor_pago: 0.00,
              juros_multa: 0.00,
              desconto: 0.00,
              comprovante_url: null,
              baixado_por: null,
              observacoes: item.observacoes ? `${item.observacoes}\n${motivoFmt}` : motivoFmt,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          try {
            await supabase.from('fin_auditoria').insert({
              conta_id: item.id,
              usuario_id: params.usuarioId,
              acao: 'estorno',
              detalhes: {
                tipo: 'estorno_lote_remessa',
                remessa_id: params.remessaId,
                motivo: params.motivo || 'Estorno consolidado do lote',
                usuario_nome: params.usuarioNome
              }
            });
          } catch (auditErr) {
            console.warn('[FinRemessasService] Falha não bloqueante ao registrar auditoria de estorno:', auditErr);
          }
        }
      }

      return { sucesso: true };
    } catch (err: any) {
      console.error('[FinRemessasService] Erro ao reverter baixa de remessa:', err);
      return { sucesso: false, erro: err.message || 'Falha ao reverter lote de pagamento' };
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
