import { supabase } from './supabase';
import { 
  FinContaPagar, 
  FinFiltrosContas, 
  FinResumoLiquidez, 
  FinPrevistoVsRealizadoItem,
  FinAuditoria,
  FinFormaPagamento 
} from '../types';

/**
 * Feriados nacionais fixos do Brasil (MM-DD) para conferência de dia útil bancário
 */
export const FERIADOS_NACIONAIS_FIXOS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência do Brasil
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Dia da Consciência Negra
  '12-25'  // Natal
];

export class FinContasPagarService {
  /**
   * Identifica se uma data (YYYY-MM-DD) cai em final de semana ou feriado
   */
  public static ehFimDeSemanaOuFeriado(dataIso: string): boolean {
    const [ano, mes, dia] = dataIso.split('-').map(Number);
    const date = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
    const diaSemana = date.getUTCDay(); // 0 = Domingo, 6 = Sábado

    if (diaSemana === 0 || diaSemana === 6) {
      return true;
    }

    const mmdd = `${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return FERIADOS_NACIONAIS_FIXOS.includes(mmdd);
  }

  /**
   * Verifica se uma categoria ou descrição corresponde a tributos/impostos
   */
  public static ehCategoriaImposto(nomeCategoria?: string, descricao?: string): boolean {
    const texto = `${nomeCategoria || ''} ${descricao || ''}`.toUpperCase();
    return (
      texto.includes('IMPOSTO') ||
      texto.includes('IPTU') ||
      texto.includes('INSS') ||
      texto.includes('IRPF') ||
      texto.includes('FGTS') ||
      texto.includes('DAS') ||
      texto.includes('DARF') ||
      texto.includes('TRIBUT')
    );
  }

  /**
   * Calcula o vencimento operacional:
   * - Para IMPOSTOS: antecipa para o dia útil anterior
   * - Para os DEMAIS: posterga para o próximo dia útil
   */
  public static calcularVencimentoOperacional(
    dataNominalIso: string, 
    nomeCategoria?: string, 
    descricao?: string
  ): string {
    if (!dataNominalIso) return dataNominalIso;
    const ehImposto = this.ehCategoriaImposto(nomeCategoria, descricao);
    const [ano, mes, dia] = dataNominalIso.split('-').map(Number);
    let date = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));

    // Se já é dia útil, mantém
    let iso = date.toISOString().split('T')[0];
    if (!this.ehFimDeSemanaOuFeriado(iso)) {
      return iso;
    }

    // Regra diferenciada
    if (ehImposto) {
      // Antecipa para dia útil anterior
      while (this.ehFimDeSemanaOuFeriado(iso)) {
        date.setUTCDate(date.getUTCDate() - 1);
        iso = date.toISOString().split('T')[0];
      }
    } else {
      // Posterga para próximo dia útil
      while (this.ehFimDeSemanaOuFeriado(iso)) {
        date.setUTCDate(date.getUTCDate() + 1);
        iso = date.toISOString().split('T')[0];
      }
    }

    return iso;
  }

  /**
   * Lista as contas a pagar com filtros combinados e cálculo em tempo real de status de atraso
   */
  public static async listarContas(filtros: FinFiltrosContas): Promise<FinContaPagar[]> {
    try {
      let query = supabase
        .from('fin_contas_pagar')
        .select(`
          *,
          tipo_custo:fin_tipos_custo(*),
          categoria:fin_categorias(*),
          subcategoria:fin_subcategorias(*),
          conta_bancaria:fin_contas_bancarias(*),
          remessa:fin_remessas(*)
        `);

      if (filtros.periodoTipo === 'mes' && filtros.mes && filtros.ano) {
        const primeiroDia = `${filtros.ano}-${String(filtros.mes).padStart(2, '0')}-01`;
        const ultimoDiaDate = new Date(filtros.ano, filtros.mes, 0);
        const ultimoDia = `${filtros.ano}-${String(filtros.mes).padStart(2, '0')}-${String(ultimoDiaDate.getDate()).padStart(2, '0')}`;
        query = query.gte('data_vencimento', primeiroDia).lte('data_vencimento', ultimoDia);
      } else if (filtros.periodoTipo === 'personalizado') {
        if (filtros.dataInicio) query = query.gte('data_vencimento', filtros.dataInicio);
        if (filtros.dataFim) query = query.lte('data_vencimento', filtros.dataFim);
      }

      if (filtros.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status);
      }
      if (filtros.tipoCustoId) {
        query = query.eq('tipo_custo_id', filtros.tipoCustoId);
      }
      if (filtros.categoriaId) {
        query = query.eq('categoria_id', filtros.categoriaId);
      }
      if (filtros.contaBancariaId) {
        query = query.eq('conta_bancaria_id', filtros.contaBancariaId);
      }
      if (filtros.buscaFavorecido && filtros.buscaFavorecido.trim() !== '') {
        query = query.ilike('favorecido', `%${filtros.buscaFavorecido.trim()}%`);
      }

      const { data, error } = await query.order('data_vencimento', { ascending: true });
      if (error) {
        if (error.code === '42P01' || error.code === '42703') {
          console.warn('[FinContasPagarService] Tabela fin_contas_pagar pendente. Retornando vazio com fallback seguro.');
          return [];
        }
        throw error;
      }

      const hojeIso = new Date().toISOString().split('T')[0];

      // Ajusta status de atraso dinamicamente caso a data de vencimento tenha passado
      return (data || []).map(conta => {
        const vencOperacional = conta.data_vencimento_operacional || this.calcularVencimentoOperacional(
          conta.data_vencimento,
          conta.categoria?.nome,
          conta.descricao
        );

        let statusFinal = conta.status;
        if (statusFinal === 'pendente' && vencOperacional < hojeIso) {
          statusFinal = 'atrasado';
        }

        return {
          ...conta,
          data_vencimento_operacional: vencOperacional,
          status: statusFinal
        };
      });
    } catch (err) {
      console.error('[FinContasPagarService] Erro ao listar contas a pagar:', err);
      return [];
    }
  }

  /**
   * Cadastra uma nova conta a pagar (avulsa, parcelada ou recorrente até o fim do ano corrente)
   */
  public static async cadastrarConta(dados: {
    tipoCustoId: string;
    categoriaId: string;
    subcategoriaId?: string;
    contaBancariaId?: string;
    viagemId?: string;
    favorecido: string;
    descricao?: string;
    valorNominal: number;
    valorEstimado?: boolean;
    dataVencimento: string; // YYYY-MM-DD
    formaPagamento?: FinFormaPagamento;
    tipoLancamento: 'avulso' | 'parcelado' | 'recorrente';
    totalParcelas?: number;
    criadoPorId?: string;
    categoriaNome?: string;
  }): Promise<{ sucesso: boolean; ids?: string[]; erro?: string }> {
    try {
      const contratosRecorrenteId = (dados.tipoLancamento !== 'avulso') ? crypto.randomUUID() : undefined;
      const inserts: any[] = [];
      const [anoBase, mesBase, diaBase] = dados.dataVencimento.split('-').map(Number);

      if (dados.tipoLancamento === 'avulso') {
        const vencOp = this.calcularVencimentoOperacional(dados.dataVencimento, dados.categoriaNome, dados.descricao);
        inserts.push({
          tipo_custo_id: dados.tipoCustoId,
          categoria_id: dados.categoriaId,
          subcategoria_id: dados.subcategoriaId || null,
          conta_bancaria_id: dados.contaBancariaId || null,
          viagem_id: dados.viagemId || null,
          favorecido: dados.favorecido.trim(),
          descricao: dados.descricao?.trim() || null,
          valor_nominal: dados.valorNominal,
          valor_estimado: dados.valorEstimado || false,
          data_vencimento: dados.dataVencimento,
          data_vencimento_operacional: vencOp,
          forma_pagamento: dados.formaPagamento || 'pix',
          status: 'pendente',
          parcela_numero: 1,
          parcela_total: 1,
          recorrente: false,
          criado_por: dados.criadoPorId || null
        });
      } else if (dados.tipoLancamento === 'parcelado') {
        const total = dados.totalParcelas && dados.totalParcelas > 1 ? dados.totalParcelas : 2;
        for (let p = 1; p <= total; p++) {
          const dt = new Date(Date.UTC(anoBase, (mesBase - 1) + (p - 1), diaBase, 12, 0, 0));
          const vencIso = dt.toISOString().split('T')[0];
          const vencOp = this.calcularVencimentoOperacional(vencIso, dados.categoriaNome, dados.descricao);

          inserts.push({
            contrato_recorrente_id: contratosRecorrenteId,
            tipo_custo_id: dados.tipoCustoId,
            categoria_id: dados.categoriaId,
            subcategoria_id: dados.subcategoriaId || null,
            conta_bancaria_id: dados.contaBancariaId || null,
            viagem_id: dados.viagemId || null,
            favorecido: dados.favorecido.trim(),
            descricao: `${dados.descricao ? dados.descricao + ' ' : ''}(${p}/${total})`,
            valor_nominal: dados.valorNominal,
            valor_estimado: dados.valorEstimado || false,
            data_vencimento: vencIso,
            data_vencimento_operacional: vencOp,
            forma_pagamento: dados.formaPagamento || 'boleto',
            status: 'pendente',
            parcela_numero: p,
            parcela_total: total,
            recorrente: false,
            criado_por: dados.criadoPorId || null
          });
        }
      } else if (dados.tipoLancamento === 'recorrente') {
        // Projeta até 31 de dezembro do ano corrente (exercício fiscal anual)
        let mes = mesBase;
        let parcelaNum = 1;
        while (mes <= 12) {
          const dt = new Date(Date.UTC(anoBase, mes - 1, diaBase, 12, 0, 0));
          const vencIso = dt.toISOString().split('T')[0];
          const vencOp = this.calcularVencimentoOperacional(vencIso, dados.categoriaNome, dados.descricao);

          inserts.push({
            contrato_recorrente_id: contratosRecorrenteId,
            tipo_custo_id: dados.tipoCustoId,
            categoria_id: dados.categoriaId,
            subcategoria_id: dados.subcategoriaId || null,
            conta_bancaria_id: dados.contaBancariaId || null,
            viagem_id: dados.viagemId || null,
            favorecido: dados.favorecido.trim(),
            descricao: dados.descricao?.trim() || null,
            valor_nominal: dados.valorNominal,
            valor_estimado: dados.valorEstimado || false,
            data_vencimento: vencIso,
            data_vencimento_operacional: vencOp,
            forma_pagamento: dados.formaPagamento || 'pix',
            status: 'pendente',
            parcela_numero: parcelaNum++,
            recorrente: true,
            periodicidade: 'mensal',
            criado_por: dados.criadoPorId || null
          });
          mes++;
        }
      }

      const { data, error } = await supabase
        .from('fin_contas_pagar')
        .insert(inserts)
        .select('id');

      if (error) {
        if (error.code === '42P01' || error.code === '42703') {
          console.warn('[FinContasPagarService] Fallback Zero-Break: tabela fin_contas_pagar pendente.');
          return { sucesso: true, ids: inserts.map((_, i) => `temp-conta-${i}`) };
        }
        throw error;
      }

      return { sucesso: true, ids: (data || []).map(r => r.id) };
    } catch (err: any) {
      console.error('[FinContasPagarService] Erro ao cadastrar conta:', err);
      return { sucesso: false, erro: err.message || 'Erro ao persistir conta' };
    }
  }

  /**
   * Baixa inteligente de conta a pagar com juros, desconto e suporte a baixa parcial
   */
  public static async baixarConta(params: {
    contaId: string;
    dataPagamento: string; // YYYY-MM-DD
    contaBancariaId?: string;
    formaPagamento?: FinFormaPagamento;
    jurosMulta?: number;
    desconto?: number;
    valorPagoTotal: number;
    comprovanteUrl?: string;
    observacoes?: string;
    usuarioId: string;
    usuarioNome?: string;
  }): Promise<{ sucesso: boolean; residualGeradoId?: string; erro?: string }> {
    try {
      // 1. Busca a conta atual para conferência
      const { data: conta, error: buscaErr } = await supabase
        .from('fin_contas_pagar')
        .select('*')
        .eq('id', params.contaId)
        .single();

      if (buscaErr) {
        if (buscaErr.code === '42P01' || buscaErr.code === '42703') {
          return { sucesso: true };
        }
        throw buscaErr;
      }

      const juros = Number(params.jurosMulta) || 0;
      const desc = Number(params.desconto) || 0;
      const valorDevido = Number(conta.valor_nominal) + juros - desc;
      const valorEfetivamentePago = Number(params.valorPagoTotal);
      const isBaixaParcial = valorEfetivamentePago < valorDevido;

      // 2. Atualiza a conta baixada
      const updatePayload: Partial<FinContaPagar> = {
        status: 'pago',
        data_pagamento: params.dataPagamento,
        conta_bancaria_id: params.contaBancariaId || conta.conta_bancaria_id,
        forma_pagamento: params.formaPagamento || conta.forma_pagamento,
        juros_multa: juros,
        desconto: desc,
        valor_pago: valorEfetivamentePago,
        comprovante_url: params.comprovanteUrl || conta.comprovante_url,
        observacoes: params.observacoes || conta.observacoes,
        baixado_por: params.usuarioId,
        updated_at: new Date().toISOString()
      };

      const { error: updErr } = await supabase
        .from('fin_contas_pagar')
        .update(updatePayload)
        .eq('id', params.contaId);

      if (updErr) throw updErr;

      // 3. Registra auditoria
      await this.registrarAuditoria({
        contaId: params.contaId,
        usuarioId: params.usuarioId,
        usuarioNome: params.usuarioNome,
        acao: 'baixa',
        detalhes: {
          valor_nominal: conta.valor_nominal,
          juros_multa: juros,
          desconto: desc,
          valor_pago: valorEfetivamentePago,
          data_pagamento: params.dataPagamento,
          baixa_parcial: isBaixaParcial
        }
      });

      // 4. Se for baixa parcial, cria saldo residual com a diferença
      let residualId: string | undefined;
      if (isBaixaParcial) {
        const saldoRestante = valorDevido - valorEfetivamentePago;
        const { data: resData } = await supabase
          .from('fin_contas_pagar')
          .insert({
            tipo_custo_id: conta.tipo_custo_id,
            categoria_id: conta.categoria_id,
            subcategoria_id: conta.subcategoria_id,
            conta_bancaria_id: conta.conta_bancaria_id,
            viagem_id: conta.viagem_id,
            favorecido: conta.favorecido,
            descricao: `[SALDO RESIDUAL] ${conta.descricao || 'Conta'}`,
            valor_nominal: saldoRestante,
            data_vencimento: conta.data_vencimento,
            data_vencimento_operacional: conta.data_vencimento_operacional,
            status: 'pendente',
            parcela_numero: conta.parcela_numero,
            parcela_total: conta.parcela_total,
            criado_por: params.usuarioId
          })
          .select('id')
          .single();

        residualId = resData?.id;
      }

      return { sucesso: true, residualGeradoId: residualId };
    } catch (err: any) {
      console.error('[FinContasPagarService] Erro ao baixar conta:', err);
      return { sucesso: false, erro: err.message || 'Falha ao processar baixa de pagamento' };
    }
  }

  /**
   * Estorno de pagamento (reverte para pendente) — Restrito a administradores
   */
  public static async estornarBaixa(
    contaId: string,
    usuarioRole: string,
    usuarioId: string,
    motivo: string,
    usuarioNome?: string
  ): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      if (usuarioRole !== 'admin') {
        return { sucesso: false, erro: 'Apenas administradores possuem autoridade para estornar pagamentos.' };
      }

      const { data: conta, error: buscaErr } = await supabase
        .from('fin_contas_pagar')
        .select('*')
        .eq('id', contaId)
        .single();

      if (buscaErr) throw buscaErr;

      const { error: updErr } = await supabase
        .from('fin_contas_pagar')
        .update({
          status: 'pendente',
          data_pagamento: null,
          valor_pago: 0.00,
          juros_multa: 0.00,
          desconto: 0.00,
          baixado_por: null,
          observacoes: conta.observacoes 
            ? `${conta.observacoes}\n[ESTORNO ${new Date().toLocaleDateString('pt-BR')}] ${motivo}`
            : `[ESTORNO ${new Date().toLocaleDateString('pt-BR')}] ${motivo}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', contaId);

      if (updErr) throw updErr;

      await this.registrarAuditoria({
        contaId,
        usuarioId,
        usuarioNome,
        acao: 'estorno',
        detalhes: { motivo, valor_estornado: conta.valor_pago }
      });

      return { sucesso: true };
    } catch (err: any) {
      console.error('[FinContasPagarService] Erro ao estornar baixa:', err);
      return { sucesso: false, erro: err.message || 'Erro ao estornar pagamento' };
    }
  }

  /**
   * Cancelamento definitivo de título — Restrito a administradores
   */
  public static async cancelarConta(
    contaId: string,
    usuarioRole: string,
    usuarioId: string,
    motivo: string,
    usuarioNome?: string
  ): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      if (usuarioRole !== 'admin') {
        return { sucesso: false, erro: 'Apenas administradores possuem autoridade para cancelar títulos.' };
      }

      const { error: updErr } = await supabase
        .from('fin_contas_pagar')
        .update({
          status: 'cancelado',
          observacoes: `[CANCELAMENTO] ${motivo}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', contaId);

      if (updErr) throw updErr;

      await this.registrarAuditoria({
        contaId,
        usuarioId,
        usuarioNome,
        acao: 'cancelamento',
        detalhes: { motivo }
      });

      return { sucesso: true };
    } catch (err: any) {
      console.error('[FinContasPagarService] Erro ao cancelar conta:', err);
      return { sucesso: false, erro: err.message || 'Erro ao cancelar conta' };
    }
  }

  /**
   * Edição com suporte em cascata para parcelas recorrentes pendentes
   */
  public static async atualizarConta(params: {
    contaId: string;
    valorNominal: number;
    dataVencimento: string;
    favorecido: string;
    descricao?: string;
    contaBancariaId?: string;
    aplicarEmCascata?: boolean;
    contratoRecorrenteId?: string;
    usuarioId: string;
    usuarioNome?: string;
  }): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      if (params.aplicarEmCascata && params.contratoRecorrenteId) {
        // Atualiza a parcela atual e as futuras pendentes do mesmo contrato
        const { error } = await supabase
          .from('fin_contas_pagar')
          .update({
            valor_nominal: params.valorNominal,
            favorecido: params.favorecido.trim(),
            conta_bancaria_id: params.contaBancariaId || null,
            updated_at: new Date().toISOString()
          })
          .eq('contrato_recorrente_id', params.contratoRecorrenteId)
          .gte('data_vencimento', params.dataVencimento)
          .eq('status', 'pendente');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fin_contas_pagar')
          .update({
            valor_nominal: params.valorNominal,
            data_vencimento: params.dataVencimento,
            favorecido: params.favorecido.trim(),
            descricao: params.descricao?.trim() || null,
            conta_bancaria_id: params.contaBancariaId || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.contaId);

        if (error) throw error;
      }

      await this.registrarAuditoria({
        contaId: params.contaId,
        usuarioId: params.usuarioId,
        usuarioNome: params.usuarioNome,
        acao: 'edicao',
        detalhes: {
          novo_valor: params.valorNominal,
          novo_vencimento: params.dataVencimento,
          cascata: params.aplicarEmCascata
        }
      });

      return { sucesso: true };
    } catch (err: any) {
      console.error('[FinContasPagarService] Erro ao atualizar conta:', err);
      return { sucesso: false, erro: err.message || 'Erro ao atualizar dados' };
    }
  }

  /**
   * Calcula resumo de liquidez para os cards de topo
   */
  public static calcularResumoLiquidez(contas: FinContaPagar[]): FinResumoLiquidez {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const daqui7Dias = new Date(hoje);
    daqui7Dias.setDate(daqui7Dias.getDate() + 7);

    let totalAPagarMes = 0;
    let totalPagoMes = 0;
    let totalAtrasadas = 0;
    let totalProximos7Dias = 0;
    let qtdPendentes = 0;
    let qtdAtrasadas = 0;

    for (const c of contas) {
      const valor = Number(c.valor_nominal) || 0;
      const valorPago = Number(c.valor_pago) || 0;

      if (c.status === 'pago') {
        totalPagoMes += (valorPago > 0 ? valorPago : valor);
      } else if (c.status === 'pendente' || c.status === 'atrasado') {
        totalAPagarMes += valor;
        qtdPendentes++;

        const [y, m, d] = (c.data_vencimento_operacional || c.data_vencimento).split('-').map(Number);
        const dtVenc = new Date(y, m - 1, d);

        if (c.status === 'atrasado' || dtVenc < hoje) {
          totalAtrasadas += valor;
          qtdAtrasadas++;
        }

        if (dtVenc >= hoje && dtVenc <= daqui7Dias) {
          totalProximos7Dias += valor;
        }
      }
    }

    return {
      totalAPagarMes,
      totalPagoMes,
      totalAtrasadas,
      totalProximos7Dias,
      qtdPendentes,
      qtdAtrasadas
    };
  }

  /**
   * Consolida o comparativo Previsto vs Realizado do mês selecionado
   */
  public static calcularPrevistoVsRealizado(contas: FinContaPagar[]): FinPrevistoVsRealizadoItem[] {
    const mapa = new Map<string, FinPrevistoVsRealizadoItem>();

    for (const c of contas) {
      if (c.status === 'cancelado') continue;
      const catId = c.categoria_id || 'sem-categoria';
      const catNome = c.categoria?.nome || 'Outras Despesas';
      const tipoId = c.tipo_custo_id || 'sem-tipo';
      const tipoNome = c.tipo_custo?.nome || 'Custos Gerais';

      const key = `${tipoId}_${catId}`;
      if (!mapa.has(key)) {
        mapa.set(key, {
          tipoCustoId: tipoId,
          tipoCustoNome: tipoNome,
          categoriaId: catId,
          categoriaNome: catNome,
          valorPrevisto: 0,
          valorRealizado: 0,
          variacao: 0,
          percentualVariacao: 0
        });
      }

      const item = mapa.get(key)!;
      item.valorPrevisto += Number(c.valor_nominal) || 0;
      if (c.status === 'pago') {
        item.valorRealizado += (Number(c.valor_pago) > 0 ? Number(c.valor_pago) : Number(c.valor_nominal));
      }
    }

    // Calcula variações
    const resultado = Array.from(mapa.values());
    for (const r of resultado) {
      r.variacao = r.valorRealizado - r.valorPrevisto;
      r.percentualVariacao = r.valorPrevisto > 0 
        ? ((r.valorRealizado - r.valorPrevisto) / r.valorPrevisto) * 100 
        : 0;
    }

    return resultado.sort((a, b) => a.tipoCustoNome.localeCompare(b.tipoCustoNome) || b.valorPrevisto - a.valorPrevisto);
  }

  /**
   * Registra evento na trilha de auditoria
   */
  public static async registrarAuditoria(params: {
    contaId: string;
    usuarioId: string;
    usuarioNome?: string;
    acao: 'criacao' | 'edicao' | 'baixa' | 'estorno' | 'cancelamento';
    detalhes: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.from('fin_auditoria').insert({
        conta_id: params.contaId,
        usuario_id: params.usuarioId,
        acao: params.acao,
        detalhes: {
          ...params.detalhes,
          usuario_nome: params.usuarioNome || 'Operador'
        }
      });
    } catch (e) {
      console.warn('[FinContasPagarService] Não foi possível registrar auditoria:', e);
    }
  }

  /**
   * Busca histórico de auditoria de uma conta
   */
  public static async listarAuditoria(contaId: string): Promise<FinAuditoria[]> {
    try {
      const { data, error } = await supabase
        .from('fin_auditoria')
        .select('*')
        .eq('conta_id', contaId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return data || [];
    } catch {
      return [];
    }
  }
}
