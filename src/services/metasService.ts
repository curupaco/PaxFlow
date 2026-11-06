import { supabase } from './supabase';
import { MetaPeriodo, MetaFaixa } from '../types';
import { ViagensDivisoesService } from './viagensDivisoesService';

export class MetasService {
  /**
   * Obtém a lista de períodos de meta e suas faixas correspondentes
   */
  public static async obterMetaPeriodos(): Promise<MetaPeriodo[]> {
    try {
      // 1. Buscar Períodos de Metas Financeiras
      const { data: periodos, error: errPeriodos } = await supabase
        .from('meta_periodos')
        .select('*')
        .order('data_inicio', { ascending: false });

      let listaPeriodos: MetaPeriodo[] = [];

      if (!errPeriodos && periodos && periodos.length > 0) {
        const { data: faixas } = await supabase
          .from('meta_faixas')
          .select('*')
          .order('valor_minimo', { ascending: true });

        listaPeriodos = periodos.map((p: any) => {
          const faixasPeriodo = (faixas || [])
            .filter((f: any) => f.periodo_id === p.id)
            .map((f: any) => ({
              id: f.id,
              periodo_id: f.periodo_id,
              periodoId: f.periodo_id,
              nome: f.nome,
              valor_minimo: Number(f.valor_minimo) || 0,
              valorMinimo: Number(f.valor_minimo) || 0,
              bonus_xp: Number(f.bonus_xp) || 0,
              bonusXp: Number(f.bonus_xp) || 0,
              recompensa: f.recompensa,
              cor: f.cor || '#6366f1',
              corHex: f.cor || '#6366f1',
              created_at: f.created_at
            }));

          return {
            id: p.id,
            nome: p.nome,
            data_inicio: p.data_inicio,
            dataInicio: p.data_inicio,
            data_fim: p.data_fim,
            dataFim: p.data_fim,
            tipo_calculo: p.tipo_calculo,
            tipoCalculo: p.tipo_calculo,
            is_campanha: p.is_campanha,
            isCampanha: p.is_campanha,
            is_meta_loja: p.is_meta_loja,
            isMetaLoja: p.is_meta_loja,
            valor_meta: Number(p.valor_meta) || 0,
            valorMeta: Number(p.valor_meta) || 0,
            created_at: p.created_at,
            updated_at: p.updated_at,
            faixas: faixasPeriodo
          };
        });
      }

      // 2. Buscar Campanhas Internas de Vendas e Incentivo da tabela 'campaigns'
      try {
        const { data: campanhas, error: errCamp } = await supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false });

        if (!errCamp && campanhas && campanhas.length > 0) {
          const campanhasFormatadas: MetaPeriodo[] = campanhas.map((c: any) => {
            let tipoCalc = 'orcamentos';
            if (c.tipo_meta === 'xp_acumulado') tipoCalc = 'xp';
            else if (c.tipo_meta === 'cliente_criado') tipoCalc = 'clientes';
            else if (c.tipo_meta === 'orcamento_criado') tipoCalc = 'orcamentos';
            else if (c.tipo_meta === 'orcamento_andamento') tipoCalc = 'orcamentos_andamento';
            else if (c.tipo_meta === 'venda_aceita' || c.tipo_meta === 'orcamento_fechado') tipoCalc = 'vendas';
            else if (c.tipo_meta === 'lembrete_criado') tipoCalc = 'lembretes';
            else if (c.tipo_meta === 'reembolso_pago') tipoCalc = 'reembolsos';
            else tipoCalc = c.tipo_meta || 'orcamentos';

            const metaQtd = Number(c.meta_quantidade) || 0;
            const faixas: MetaFaixa[] = [
              {
                id: `faixa-${c.id}`,
                periodo_id: c.id,
                periodoId: c.id,
                nome: c.badge_key ? `Medalha ${c.badge_key}` : 'Objetivo da Campanha',
                valor_minimo: metaQtd,
                valorMinimo: metaQtd,
                bonus_xp: 500,
                bonusXp: 500,
                recompensa: c.badge_key || 'Meta Concluída',
                cor: '#10b981',
                corHex: '#10b981',
                created_at: c.created_at
              }
            ];

            return {
              id: c.id,
              nome: c.titulo,
              data_inicio: c.data_inicio,
              dataInicio: c.data_inicio,
              data_fim: c.data_fim,
              dataFim: c.data_fim,
              tipo_calculo: tipoCalc,
              tipoCalculo: tipoCalc,
              is_campanha: true,
              isCampanha: true,
              is_meta_loja: false,
              isMetaLoja: false,
              valor_meta: metaQtd,
              valorMeta: metaQtd,
              created_at: c.created_at,
              updated_at: c.updated_at,
              faixas
            };
          });

          // Unir campanhas e metas de período
          listaPeriodos = [...listaPeriodos, ...campanhasFormatadas];
        }
      } catch (e) {
        console.warn('Tabela campaigns não encontrada ou inacessível:', e);
      }

      return listaPeriodos;

    } catch (err) {
      console.error('Erro ao carregar metas do banco:', err);
      throw err;
    }
  }

  /**
   * Cria um período de meta e suas faixas associadas
   */
  public static async criarMetaPeriodo(
    periodo: Omit<MetaPeriodo, 'id' | 'created_at' | 'updated_at' | 'faixas'>,
    faixas: Omit<MetaFaixa, 'id' | 'periodo_id' | 'created_at'>[]
  ): Promise<MetaPeriodo> {
    try {
      const tc = (periodo.tipo_calculo as string) === 'liquido' ? 'lucro' : periodo.tipo_calculo;
      const dbPeriodo = {
        nome: periodo.nome,
        data_inicio: periodo.data_inicio,
        data_fim: periodo.data_fim,
        tipo_calculo: tc,
        is_campanha: periodo.is_campanha,
        is_meta_loja: periodo.is_meta_loja || false,
        valor_meta: periodo.valor_meta || 0
      };

      const { data: insertedPeriodo, error: errP } = await supabase
        .from('meta_periodos')
        .insert(dbPeriodo)
        .select()
        .single();

      if (errP) throw errP;

      try {
        if (periodo.is_meta_loja) {
          return {
            id: insertedPeriodo.id,
            nome: insertedPeriodo.nome,
            data_inicio: insertedPeriodo.data_inicio,
            dataInicio: insertedPeriodo.data_inicio,
            data_fim: insertedPeriodo.data_fim,
            dataFim: insertedPeriodo.data_fim,
            tipo_calculo: insertedPeriodo.tipo_calculo,
            tipoCalculo: insertedPeriodo.tipo_calculo,
            is_campanha: insertedPeriodo.is_campanha,
            isCampanha: insertedPeriodo.is_campanha,
            is_meta_loja: insertedPeriodo.is_meta_loja,
            isMetaLoja: insertedPeriodo.is_meta_loja,
            valor_meta: Number(insertedPeriodo.valor_meta) || 0,
            valorMeta: Number(insertedPeriodo.valor_meta) || 0,
            created_at: insertedPeriodo.created_at,
            updated_at: insertedPeriodo.updated_at,
            faixas: []
          };
        }

        const dbFaixas = faixas.map(f => ({
          periodo_id: insertedPeriodo.id,
          nome: f.nome,
          valor_minimo: f.valor_minimo,
          bonus_xp: f.bonus_xp,
          recompensa: f.recompensa,
          cor: f.cor || '#6366f1'
        }));

        const { data: insertedFaixas, error: errF } = await supabase
          .from('meta_faixas')
          .insert(dbFaixas)
          .select();

        if (errF) throw errF;

        return {
          id: insertedPeriodo.id,
          nome: insertedPeriodo.nome,
          data_inicio: insertedPeriodo.data_inicio,
          dataInicio: insertedPeriodo.data_inicio,
          data_fim: insertedPeriodo.data_fim,
          dataFim: insertedPeriodo.data_fim,
          tipo_calculo: insertedPeriodo.tipo_calculo,
          tipoCalculo: insertedPeriodo.tipo_calculo,
          is_campanha: insertedPeriodo.is_campanha,
          isCampanha: insertedPeriodo.is_campanha,
          is_meta_loja: insertedPeriodo.is_meta_loja,
          isMetaLoja: insertedPeriodo.is_meta_loja,
          valor_meta: Number(insertedPeriodo.valor_meta) || 0,
          valorMeta: Number(insertedPeriodo.valor_meta) || 0,
          created_at: insertedPeriodo.created_at,
          updated_at: insertedPeriodo.updated_at,
          faixas: (insertedFaixas || []).map((f: any) => ({
            ...f,
            periodoId: f.periodo_id,
            valorMinimo: f.valor_minimo,
            bonusXp: f.bonus_xp,
            corHex: f.cor
          }))
        };
      } catch (errFaixas) {
        await supabase.from('meta_periodos').delete().eq('id', insertedPeriodo.id);
        throw errFaixas;
      }
    } catch (err) {
      console.error('Erro ao criar metas no banco:', err);
      throw err;
    }
  }

  /**
   * Atualiza um período de meta e suas faixas associadas
   */
  public static async atualizarMetaPeriodo(
    id: string,
    periodo: Omit<MetaPeriodo, 'id' | 'created_at' | 'updated_at' | 'faixas'>,
    faixas: Omit<MetaFaixa, 'id' | 'periodo_id' | 'created_at'>[]
  ): Promise<MetaPeriodo> {
    try {
      const dbPeriodo = {
        nome: periodo.nome,
        data_inicio: periodo.data_inicio,
        data_fim: periodo.data_fim,
        tipo_calculo: (periodo.tipo_calculo as string) === 'liquido' ? 'lucro' : periodo.tipo_calculo,
        is_campanha: periodo.is_campanha,
        is_meta_loja: periodo.is_meta_loja || false,
        valor_meta: periodo.valor_meta || 0,
        updated_at: new Date().toISOString()
      };

      const { data: updatedPeriodo, error: errP } = await supabase
        .from('meta_periodos')
        .update(dbPeriodo)
        .eq('id', id)
        .select()
        .single();

      if (errP) throw errP;

      // Deleta as faixas antigas
      const { error: errDel } = await supabase
        .from('meta_faixas')
        .delete()
        .eq('periodo_id', id);

      if (errDel) throw errDel;

      if (periodo.is_meta_loja) {
        return {
          id: updatedPeriodo.id,
          nome: updatedPeriodo.nome,
          data_inicio: updatedPeriodo.data_inicio,
          dataInicio: updatedPeriodo.data_inicio,
          data_fim: updatedPeriodo.data_fim,
          dataFim: updatedPeriodo.data_fim,
          tipo_calculo: updatedPeriodo.tipo_calculo,
          tipoCalculo: updatedPeriodo.tipo_calculo,
          is_campanha: updatedPeriodo.is_campanha,
          isCampanha: updatedPeriodo.is_campanha,
          is_meta_loja: updatedPeriodo.is_meta_loja,
          isMetaLoja: updatedPeriodo.is_meta_loja,
          valor_meta: Number(updatedPeriodo.valor_meta) || 0,
          valorMeta: Number(updatedPeriodo.valor_meta) || 0,
          created_at: updatedPeriodo.created_at,
          updated_at: updatedPeriodo.updated_at,
          faixas: []
        };
      }

      // Insere as novas faixas
      const dbFaixas = faixas.map(f => ({
        periodo_id: id,
        nome: f.nome,
        valor_minimo: f.valor_minimo,
        bonus_xp: f.bonus_xp,
        recompensa: f.recompensa,
        cor: f.cor || '#6366f1'
      }));

      const { data: insertedFaixas, error: errF } = await supabase
        .from('meta_faixas')
        .insert(dbFaixas)
        .select();

      if (errF) throw errF;

      return {
        id: updatedPeriodo.id,
        nome: updatedPeriodo.nome,
        data_inicio: updatedPeriodo.data_inicio,
        dataInicio: updatedPeriodo.data_inicio,
        data_fim: updatedPeriodo.data_fim,
        dataFim: updatedPeriodo.data_fim,
        tipo_calculo: updatedPeriodo.tipo_calculo,
        tipoCalculo: updatedPeriodo.tipo_calculo,
        is_campanha: updatedPeriodo.is_campanha,
        isCampanha: updatedPeriodo.is_campanha,
        is_meta_loja: updatedPeriodo.is_meta_loja,
        isMetaLoja: updatedPeriodo.is_meta_loja,
        valor_meta: Number(updatedPeriodo.valor_meta) || 0,
        valorMeta: Number(updatedPeriodo.valor_meta) || 0,
        created_at: updatedPeriodo.created_at,
        updated_at: updatedPeriodo.updated_at,
        faixas: (insertedFaixas || []).map((f: any) => ({
          ...f,
          periodoId: f.periodo_id,
          valorMinimo: f.valor_minimo,
          bonusXp: f.bonus_xp,
          corHex: f.cor
        }))
      };
    } catch (err) {
      console.error('Erro ao atualizar metas no banco:', err);
      throw err;
    }
  }

  /**
   * Exclui um período de meta
   */
  public static async excluirMetaPeriodo(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('meta_periodos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao deletar meta no banco:', err);
      throw err;
    }
  }

  /**
   * Determina o status temporal de uma meta/campanha ('ativa' | 'passada' | 'futura')
   */
  public static getStatusTemporal(meta: MetaPeriodo): 'ativa' | 'passada' | 'futura' {
    if (!meta.data_inicio || !meta.data_fim) return 'ativa';
    const hoje = new Date();
    const dtInicio = new Date(meta.data_inicio + 'T00:00:00');
    const dtFim = new Date(meta.data_fim + 'T23:59:59');

    if (hoje < dtInicio) return 'futura';
    if (hoje > dtFim) return 'passada';
    return 'ativa';
  }

  /**
   * Verifica se uma data de registro pertence ao intervalo da meta
   */
  public static isDataNoPeriodo(dateStr: string | undefined | null, dataInicio: string, dataFim: string): boolean {
    if (!dateStr) return false;
    const cleanStr = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
    const recDate = new Date(cleanStr);
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return recDate >= start && recDate <= end;
  }

  /**
   * Calcula o progresso e lista de itens de auditoria para um consultor específico
   */
  public static calcularProgressoConsultor(
    meta: MetaPeriodo,
    consultorId: string,
    orcamentos: any[],
    viagens: any[],
    locPagamentos: any[] = [],
    clientes: any[] = [],
    reembolsos: any[] = []
  ): {
    totalAtingido: number;
    itensAuditados: any[];
    faixaAtual: MetaFaixa | null;
    proximaFaixa: MetaFaixa | null;
    percentualProgresso: number;
  } {
    const tipo = (meta.tipo_calculo || 'bruto').toLowerCase();
    let totalAtingido = 0;
    let itensAuditados: any[] = [];

    if (tipo === 'orcamentos' || tipo === 'qtd_orcamentos' || tipo === 'orcamento_criado') {
      itensAuditados = orcamentos.filter(o => {
        const dono = o.consultor_id === consultorId || o.consultorId === consultorId;
        const data = o.created_at || o.createdAt || o.data_criacao;
        return dono && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });
      totalAtingido = itensAuditados.length;

    } else if (tipo === 'orcamentos_andamento') {
      itensAuditados = orcamentos.filter(o => {
        const dono = o.consultor_id === consultorId || o.consultorId === consultorId;
        const st = (o.status || '').toUpperCase();
        const emAndamento = st === 'EM_ANDAMENTO' || st === 'AGUARDANDO' || st === 'SOLICITADO';
        const data = o.updated_at || o.updatedAt || o.created_at || o.createdAt;
        return dono && emAndamento && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });
      totalAtingido = itensAuditados.length;

    } else if (tipo === 'vendas' || tipo === 'qtd_vendas' || tipo === 'venda_aceita' || tipo === 'orcamento_fechado') {
      itensAuditados = viagens.filter(v => {
        const fatia = ViagensDivisoesService.calcularParticipacaoConsultor(v, consultorId);
        const naoCancelada = v.status !== 'cancelada';
        const data = v.data_financeiro || v.dataFinanceiro || v.created_at || v.createdAt;
        return fatia > 0 && naoCancelada && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });
      totalAtingido = itensAuditados.reduce((acc, v) => acc + ViagensDivisoesService.calcularParticipacaoConsultor(v, consultorId), 0);

    } else if (tipo === 'clientes' || tipo === 'cliente_criado') {
      itensAuditados = clientes.filter(c => {
        const dono = c.consultor_responsavel_id === consultorId || c.consultor_id === consultorId || c.consultorResponsavelId === consultorId;
        const data = c.created_at || c.createdAt;
        return dono && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });
      totalAtingido = itensAuditados.length;

    } else if (tipo === 'reembolsos' || tipo === 'reembolso_pago') {
      itensAuditados = reembolsos.filter(r => {
        const dono = r.consultor_solicitante_id === consultorId || r.consultor_id === consultorId;
        const pago = (r.status || '').toLowerCase() === 'pago';
        const data = r.updated_at || r.data_pagamento || r.created_at;
        return dono && pago && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });
      totalAtingido = itensAuditados.length;

    } else if (tipo === 'lucro' || tipo === 'liquido') {
      const viagensDoConsultor = viagens.filter(v => {
        const fatia = ViagensDivisoesService.calcularParticipacaoConsultor(v, consultorId);
        const fatiaRav = ViagensDivisoesService.calcularParticipacaoRavConsultor(v, consultorId);
        const naoCancelada = v.status !== 'cancelada';
        const data = v.data_financeiro || v.dataFinanceiro || v.created_at || v.createdAt;
        return (fatia > 0 || fatiaRav > 0) && naoCancelada && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });

      itensAuditados = viagensDoConsultor;
      viagensDoConsultor.forEach(v => {
        const fatia = ViagensDivisoesService.calcularParticipacaoConsultor(v, consultorId);
        const fatiaRav = ViagensDivisoesService.calcularParticipacaoRavConsultor(v, consultorId);
        const prods = (v as any).produtos || [];
        prods.forEach((p: any) => {
          const comissaoMarkup = ((Number(p.comissao) || 0) + (Number(p.markup) || 0)) * fatia;
          const ravLiquida = ((Number(p.rav) || 0) * 0.88) * fatiaRav;
          totalAtingido += comissaoMarkup + ravLiquida;
        });
      });

    } else {
      // Faturamento Bruto ('bruto')
      const viagensDoConsultor = viagens.filter(v => {
        const fatia = ViagensDivisoesService.calcularParticipacaoConsultor(v, consultorId);
        const naoCancelada = v.status !== 'cancelada';
        const data = v.data_financeiro || v.dataFinanceiro || v.created_at || v.createdAt;
        return fatia > 0 && naoCancelada && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });

      itensAuditados = viagensDoConsultor;
      const activeIds = new Set(viagensDoConsultor.map(v => v.id));
      const pagsSub = locPagamentos.filter(p =>
        activeIds.has(p.viagem_id || p.viagemId) &&
        p.formas_recebimento &&
        ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
      );
      const totalSub = pagsSub.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
      const somaBruta = viagensDoConsultor.reduce((acc, v) => {
        const fatia = ViagensDivisoesService.calcularParticipacaoConsultor(v, consultorId);
        return acc + ((Number(v.valor_total || v.valorTotal) || 0) * fatia);
      }, 0);
      totalAtingido = Math.max(0, somaBruta - totalSub);
    }

    // Apuração de Faixas
    const sortedFaixas = [...(meta.faixas || [])].sort((a, b) => a.valor_minimo - b.valor_minimo);
    let faixaAtual: MetaFaixa | null = null;
    let proximaFaixa: MetaFaixa | null = null;

    if (sortedFaixas.length > 0) {
      for (let i = 0; i < sortedFaixas.length; i++) {
        if (totalAtingido >= sortedFaixas[i].valor_minimo) {
          faixaAtual = sortedFaixas[i];
        } else {
          proximaFaixa = sortedFaixas[i];
          break;
        }
      }
    }

    // Percentual de progresso
    let percentualProgresso = 0;
    if (meta.is_meta_loja && meta.valor_meta && meta.valor_meta > 0) {
      percentualProgresso = Math.min((totalAtingido / meta.valor_meta) * 100, 100);
    } else if (proximaFaixa && proximaFaixa.valor_minimo > 0) {
      percentualProgresso = Math.min((totalAtingido / proximaFaixa.valor_minimo) * 100, 100);
    } else if (faixaAtual) {
      percentualProgresso = 100;
    }

    return {
      totalAtingido,
      itensAuditados,
      faixaAtual,
      proximaFaixa,
      percentualProgresso: Math.round(percentualProgresso)
    };
  }

  /**
   * Calcula o ranking e totalização geral da agência para a meta
   */
  public static calcularProgressoAgencia(
    meta: MetaPeriodo,
    consultores: any[],
    orcamentos: any[],
    viagens: any[],
    locPagamentos: any[] = [],
    clientes: any[] = [],
    reembolsos: any[] = []
  ): {
    totalAgencia: number;
    rankingConsultores: Array<{
      consultor: any;
      totalAtingido: number;
      itensAuditados: any[];
      faixaAtual: MetaFaixa | null;
      proximaFaixa: MetaFaixa | null;
      percentualProgresso: number;
    }>;
  } {
    let totalAgencia = 0;
    const ranking: Array<{
      consultor: any;
      totalAtingido: number;
      itensAuditados: any[];
      faixaAtual: MetaFaixa | null;
      proximaFaixa: MetaFaixa | null;
      percentualProgresso: number;
    }> = [];

    (consultores || []).forEach(c => {
      const prog = this.calcularProgressoConsultor(meta, c.id, orcamentos, viagens, locPagamentos, clientes, reembolsos);
      totalAgencia += prog.totalAtingido;

      const participa = (c.participa_metricas !== false) && (c.participaMetricas !== false);
      if (participa) {
        ranking.push({
          consultor: c,
          ...prog
        });
      }
    });

    ranking.sort((a, b) => b.totalAtingido - a.totalAtingido);

    return {
      totalAgencia,
      rankingConsultores: ranking
    };
  }
}
