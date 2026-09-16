import { supabase } from './supabase';
import { MetaPeriodo, MetaFaixa } from '../types';

export class MetasService {
  private static isSandbox(): boolean {
    return typeof window !== 'undefined' && (window as any).paxflowSandbox === true;
  }

  /**
   * Obtém a lista de períodos de meta e suas faixas correspondentes
   */
  public static async obterMetaPeriodos(): Promise<MetaPeriodo[]> {
    if (this.isSandbox()) {
      return this.obterMetasLocal();
    }

    try {
      const { data: periodos, error: errPeriodos } = await supabase
        .from('meta_periodos')
        .select('*')
        .order('data_inicio', { ascending: false });

      if (errPeriodos) throw errPeriodos;

      if (!periodos || periodos.length === 0) {
        return [];
      }

      const { data: faixas, error: errFaixas } = await supabase
        .from('meta_faixas')
        .select('*')
        .order('valor_minimo', { ascending: true });

      if (errFaixas) throw errFaixas;

      // Agrupar faixas por periodo_id
      return periodos.map((p: any) => {
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

    } catch (err) {
      console.warn('Erro ao carregar metas do banco, usando fallback local:', err);
      return this.obterMetasLocal();
    }
  }

  /**
   * Cria um período de meta e suas faixas associadas
   */
  public static async criarMetaPeriodo(
    periodo: Omit<MetaPeriodo, 'id' | 'created_at' | 'updated_at' | 'faixas'>,
    faixas: Omit<MetaFaixa, 'id' | 'periodo_id' | 'created_at'>[]
  ): Promise<MetaPeriodo> {
    if (this.isSandbox()) {
      return this.criarMetaLocal(periodo, faixas);
    }

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
    if (this.isSandbox()) {
      return this.atualizarMetaLocal(id, periodo, faixas);
    }

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
    if (this.isSandbox()) {
      this.excluirMetaLocal(id);
      return;
    }

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

  // --- MOCK / FALLBACK LOCAL STORAGE IMPLEMENTATIONS ---

  private static obterMetasLocal(): MetaPeriodo[] {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('sandbox-meta-periodos');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // Ignora erro de parse e re-inicializa
        }
      }
    }

    // Dados mockados iniciais se estiver vazio
    const initialMetas: MetaPeriodo[] = [
      {
        id: 'mock-periodo-1',
        nome: 'Metas de Agosto 2026',
        data_inicio: '2026-08-01',
        dataInicio: '2026-08-01',
        data_fim: '2026-08-31',
        dataFim: '2026-08-31',
        tipo_calculo: 'lucro',
        tipoCalculo: 'lucro',
        is_campanha: false,
        isCampanha: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        faixas: [
          { id: 'mock-faixa-1', periodo_id: 'mock-periodo-1', periodoId: 'mock-periodo-1', nome: 'Bronze', valor_minimo: 5000, valorMinimo: 5000, bonus_xp: 500, bonusXp: 500, recompensa: 'Kit de Viagem Bronze', cor: '#d97706', corHex: '#d97706', created_at: new Date().toISOString() },
          { id: 'mock-faixa-2', periodo_id: 'mock-periodo-1', periodoId: 'mock-periodo-1', nome: 'Prata', valor_minimo: 12000, valorMinimo: 12000, bonus_xp: 1000, bonusXp: 1000, recompensa: 'Voucher R$ 200,00', cor: '#94a3b8', corHex: '#94a3b8', created_at: new Date().toISOString() },
          { id: 'mock-faixa-3', periodo_id: 'mock-periodo-1', periodoId: 'mock-periodo-1', nome: 'Ouro', valor_minimo: 25000, valorMinimo: 25000, bonus_xp: 2500, bonusXp: 2500, recompensa: 'Jantar de Gala no Fim do Ano', cor: '#fbbf24', corHex: '#fbbf24', created_at: new Date().toISOString() }
        ]
      },
      {
        id: 'mock-periodo-2',
        nome: 'Campanha Semestre Inverno (Últimos 6 meses)',
        data_inicio: '2026-03-01',
        dataInicio: '2026-03-01',
        data_fim: '2026-08-31',
        dataFim: '2026-08-31',
        tipo_calculo: 'bruto',
        tipoCalculo: 'bruto',
        is_campanha: true,
        isCampanha: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        faixas: [
          { id: 'mock-faixa-4', periodo_id: 'mock-periodo-2', periodoId: 'mock-periodo-2', nome: 'Vendedor Iniciante', valor_minimo: 30000, valorMinimo: 30000, bonus_xp: 1000, bonusXp: 1000, recompensa: 'Medalha do Gelo', cor: '#3b82f6', corHex: '#3b82f6', created_at: new Date().toISOString() },
          { id: 'mock-faixa-5', periodo_id: 'mock-periodo-2', periodoId: 'mock-periodo-2', nome: 'Mestre Comercial', valor_minimo: 80000, valorMinimo: 80000, bonus_xp: 3000, bonusXp: 3000, recompensa: 'Viagem de Fim de Semana a Gramado', cor: '#10b981', corHex: '#10b981', created_at: new Date().toISOString() },
          { id: 'mock-faixa-6', periodo_id: 'mock-periodo-2', periodoId: 'mock-periodo-2', nome: 'Lenda das Vendas', valor_minimo: 180000, valorMinimo: 180000, bonus_xp: 7500, bonusXp: 7500, recompensa: 'Resort 5 Estrelas em Maceió', cor: '#8b5cf6', corHex: '#8b5cf6', created_at: new Date().toISOString() }
        ]
      }
    ];

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sandbox-meta-periodos', JSON.stringify(initialMetas));
    }
    return initialMetas;
  }

  private static criarMetaLocal(
    periodo: Omit<MetaPeriodo, 'id' | 'created_at' | 'updated_at' | 'faixas'>,
    faixas: Omit<MetaFaixa, 'id' | 'periodo_id' | 'created_at'>[]
  ): MetaPeriodo {
    const list = this.obterMetasLocal();
    const newId = 'mock-periodo-' + Date.now();
    
    const mappedFaixas: MetaFaixa[] = faixas.map((f, i) => ({
      id: `mock-faixa-${Date.now()}-${i}`,
      periodo_id: newId,
      periodoId: newId,
      nome: f.nome,
      valor_minimo: Number(f.valor_minimo) || 0,
      valorMinimo: Number(f.valor_minimo) || 0,
      bonus_xp: Number(f.bonus_xp) || 0,
      bonusXp: Number(f.bonus_xp) || 0,
      recompensa: f.recompensa,
      cor: f.cor || '#6366f1',
      corHex: f.cor || '#6366f1',
      created_at: new Date().toISOString()
    }));

    const newPeriodo: MetaPeriodo = {
      id: newId,
      nome: periodo.nome,
      data_inicio: periodo.data_inicio,
      dataInicio: periodo.data_inicio,
      data_fim: periodo.data_fim,
      dataFim: periodo.data_fim,
      tipo_calculo: periodo.tipo_calculo,
      tipoCalculo: periodo.tipo_calculo,
      is_campanha: periodo.is_campanha,
      isCampanha: periodo.is_campanha,
      is_meta_loja: periodo.is_meta_loja || false,
      isMetaLoja: periodo.is_meta_loja || false,
      valor_meta: periodo.valor_meta || 0,
      valorMeta: periodo.valor_meta || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      faixas: periodo.is_meta_loja ? [] : mappedFaixas
    };

    list.unshift(newPeriodo);
    localStorage.setItem('sandbox-meta-periodos', JSON.stringify(list));
    return newPeriodo;
  }

  private static excluirMetaLocal(id: string): void {
    const list = this.obterMetasLocal();
    const filtered = list.filter(m => m.id !== id);
    localStorage.setItem('sandbox-meta-periodos', JSON.stringify(filtered));
  }

  private static atualizarMetaLocal(
    id: string,
    periodo: Omit<MetaPeriodo, 'id' | 'created_at' | 'updated_at' | 'faixas'>,
    faixas: Omit<MetaFaixa, 'id' | 'periodo_id' | 'created_at'>[]
  ): MetaPeriodo {
    const list = this.obterMetasLocal();
    const index = list.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error('Meta não encontrada localmente');
    }

    const mappedFaixas: MetaFaixa[] = faixas.map((f, i) => ({
      id: `mock-faixa-${Date.now()}-${i}`,
      periodo_id: id,
      periodoId: id,
      nome: f.nome,
      valor_minimo: Number(f.valor_minimo) || 0,
      valorMinimo: Number(f.valor_minimo) || 0,
      bonus_xp: Number(f.bonus_xp) || 0,
      bonusXp: Number(f.bonus_xp) || 0,
      recompensa: f.recompensa,
      cor: f.cor || '#6366f1',
      corHex: f.cor || '#6366f1',
      created_at: new Date().toISOString()
    }));

    const updatedPeriodo: MetaPeriodo = {
      ...list[index],
      nome: periodo.nome,
      data_inicio: periodo.data_inicio,
      dataInicio: periodo.data_inicio,
      data_fim: periodo.data_fim,
      dataFim: periodo.data_fim,
      tipo_calculo: periodo.tipo_calculo,
      tipoCalculo: periodo.tipo_calculo,
      is_campanha: periodo.is_campanha,
      isCampanha: periodo.is_campanha,
      is_meta_loja: periodo.is_meta_loja || false,
      isMetaLoja: periodo.is_meta_loja || false,
      valor_meta: periodo.valor_meta || 0,
      valorMeta: periodo.valor_meta || 0,
      updated_at: new Date().toISOString(),
      faixas: periodo.is_meta_loja ? [] : mappedFaixas
    };

    list[index] = updatedPeriodo;
    localStorage.setItem('sandbox-meta-periodos', JSON.stringify(list));
    return updatedPeriodo;
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
    locPagamentos: any[] = []
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

    if (tipo === 'orcamentos' || tipo === 'qtd_orcamentos') {
      itensAuditados = orcamentos.filter(o => {
        const dono = o.consultor_id === consultorId || o.consultorId === consultorId;
        const data = o.created_at || o.createdAt || o.data_criacao;
        return dono && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });
      totalAtingido = itensAuditados.length;

    } else if (tipo === 'vendas' || tipo === 'qtd_vendas') {
      itensAuditados = viagens.filter(v => {
        const dono = v.consultor_id === consultorId || v.consultorId === consultorId;
        const naoCancelada = v.status !== 'cancelada';
        const data = v.data_financeiro || v.dataFinanceiro || v.created_at || v.createdAt;
        return dono && naoCancelada && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });
      totalAtingido = itensAuditados.length;

    } else if (tipo === 'lucro' || tipo === 'liquido') {
      const viagensDoConsultor = viagens.filter(v => {
        const dono = v.consultor_id === consultorId || v.consultorId === consultorId;
        const naoCancelada = v.status !== 'cancelada';
        const data = v.data_financeiro || v.dataFinanceiro || v.created_at || v.createdAt;
        return dono && naoCancelada && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });

      itensAuditados = viagensDoConsultor;
      viagensDoConsultor.forEach(v => {
        const prods = (v as any).produtos || [];
        prods.forEach((p: any) => {
          totalAtingido += (Number(p.comissao) || 0) + (Number(p.markup) || 0) + ((Number(p.rav) || 0) * 0.88);
        });
      });

    } else {
      // Faturamento Bruto ('bruto')
      const viagensDoConsultor = viagens.filter(v => {
        const dono = v.consultor_id === consultorId || v.consultorId === consultorId;
        const naoCancelada = v.status !== 'cancelada';
        const data = v.data_financeiro || v.dataFinanceiro || v.created_at || v.createdAt;
        return dono && naoCancelada && this.isDataNoPeriodo(data, meta.data_inicio, meta.data_fim);
      });

      itensAuditados = viagensDoConsultor;
      const activeIds = new Set(viagensDoConsultor.map(v => v.id));
      const pagsSub = locPagamentos.filter(p =>
        activeIds.has(p.viagem_id || p.viagemId) &&
        p.formas_recebimento &&
        ['DESCONTO', 'PREJUÍZO'].includes((p.formas_recebimento.nome || '').trim().toUpperCase())
      );
      const totalSub = pagsSub.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
      const somaBruta = viagensDoConsultor.reduce((acc, v) => acc + (Number(v.valor_total || v.valorTotal) || 0), 0);
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
    locPagamentos: any[] = []
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
    const ranking = consultores.map(c => {
      const prog = this.calcularProgressoConsultor(meta, c.id, orcamentos, viagens, locPagamentos);
      totalAgencia += prog.totalAtingido;
      return {
        consultor: c,
        ...prog
      };
    });

    ranking.sort((a, b) => b.totalAtingido - a.totalAtingido);

    return {
      totalAgencia,
      rankingConsultores: ranking
    };
  }
}
