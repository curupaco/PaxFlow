import { supabase } from './supabase';
import { 
  FinContaPagar, 
  FinFiltrosContas, 
  FinResumoLiquidez, 
  FinPrevistoVsRealizadoItem,
  FinAuditoria,
  FinFormaPagamento,
  FinDiaCalendario,
  FinCalendarioMensalResumo
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
   * Atualiza uma conta a pagar existente.
   * Suporta edição avulsa ('apenas_esta') ou em cascata ('esta_e_futuras') para títulos recorrentes ou parcelados.
   */
  public static async editarConta(params: {
    contaId: string;
    modoCascata?: 'apenas_esta' | 'esta_e_futuras';
    tipoCustoId?: string;
    categoriaId?: string;
    subcategoriaId?: string;
    contaBancariaId?: string;
    favorecido?: string;
    descricao?: string;
    valorNominal?: number;
    valorEstimado?: boolean;
    dataVencimento?: string; // YYYY-MM-DD
    formaPagamento?: FinFormaPagamento;
    usuarioId?: string;
    usuarioNome?: string;
    categoriaNome?: string;
  }): Promise<{ sucesso: boolean; afetadas?: number; erro?: string }> {
    try {
      // 1. Localiza a conta atual
      const { data: contaAtual, error: fetchErr } = await supabase
        .from('fin_contas_pagar')
        .select('*')
        .eq('id', params.contaId)
        .maybeSingle();

      if (fetchErr) {
        if (fetchErr.code === '42P01' || fetchErr.code === '42703') {
          return { sucesso: true, afetadas: 1 };
        }
        throw fetchErr;
      }

      if (!contaAtual) {
        return { sucesso: false, erro: 'Título não localizado no banco de dados' };
      }

      const modoCascata = params.modoCascata || 'apenas_esta';
      const ehRecorrenteOuParcelado = Boolean(
        contaAtual.contrato_recorrente_id || 
        contaAtual.recorrente || 
        (contaAtual.parcela_total && contaAtual.parcela_total > 1)
      );

      const novaDataVenc = params.dataVencimento || contaAtual.data_vencimento;
      const novoVencOp = this.calcularVencimentoOperacional(
        novaDataVenc,
        params.categoriaNome,
        params.descricao !== undefined ? params.descricao : contaAtual.descricao
      );

      const camposBaseUpdate: any = {
        updated_at: new Date().toISOString()
      };
      if (params.tipoCustoId) camposBaseUpdate.tipo_custo_id = params.tipoCustoId;
      if (params.categoriaId) camposBaseUpdate.categoria_id = params.categoriaId;
      if (params.subcategoriaId !== undefined) camposBaseUpdate.subcategoria_id = params.subcategoriaId || null;
      if (params.contaBancariaId !== undefined) camposBaseUpdate.conta_bancaria_id = params.contaBancariaId || null;
      if (params.favorecido !== undefined) camposBaseUpdate.favorecido = params.favorecido.trim();
      if (params.valorNominal !== undefined) camposBaseUpdate.valor_nominal = params.valorNominal;
      if (params.valorEstimado !== undefined) camposBaseUpdate.valor_estimado = params.valorEstimado;
      if (params.formaPagamento) camposBaseUpdate.forma_pagamento = params.formaPagamento;

      // Se for apenas esta conta ou não for recorrente:
      if (modoCascata === 'apenas_esta' || !ehRecorrenteOuParcelado) {
        if (params.descricao !== undefined) camposBaseUpdate.descricao = params.descricao.trim() || null;
        if (params.dataVencimento) {
          camposBaseUpdate.data_vencimento = novaDataVenc;
          camposBaseUpdate.data_vencimento_operacional = novoVencOp;
        }

        const { error: updErr } = await supabase
          .from('fin_contas_pagar')
          .update(camposBaseUpdate)
          .eq('id', params.contaId);

        if (updErr) throw updErr;

        await this.registrarAuditoria({
          contaId: params.contaId,
          usuarioId: params.usuarioId || 'sistema',
          usuarioNome: params.usuarioNome,
          acao: 'edicao',
          detalhes: {
            modo: 'apenas_esta',
            alteracoes: camposBaseUpdate
          }
        });

        return { sucesso: true, afetadas: 1 };
      }

      // Edição em cascata: esta e todas as parcelas futuras pendentes da mesma série
      let queryFuturas = supabase
        .from('fin_contas_pagar')
        .select('*')
        .eq('status', 'pendente')
        .gte('data_vencimento', contaAtual.data_vencimento);

      if (contaAtual.contrato_recorrente_id) {
        queryFuturas = queryFuturas.eq('contrato_recorrente_id', contaAtual.contrato_recorrente_id);
      } else {
        queryFuturas = queryFuturas
          .eq('favorecido', contaAtual.favorecido)
          .eq('categoria_id', contaAtual.categoria_id);
      }

      const { data: contasFuturas, error: futurasErr } = await queryFuturas;
      if (futurasErr) throw futurasErr;

      const listaParaAtualizar = contasFuturas && contasFuturas.length > 0 ? contasFuturas : [contaAtual];
      let totalAfetadas = 0;

      // Se a data de vencimento foi alterada, detectamos o novo dia do mês (ex: dia 10 para dia 15)
      let novoDiaVenc: number | null = null;
      if (params.dataVencimento) {
        const [, , d] = params.dataVencimento.split('-').map(Number);
        if (!isNaN(d)) novoDiaVenc = d;
      }

      for (const item of listaParaAtualizar) {
        const itemUpdate = { ...camposBaseUpdate };

        // Descrição: se a conta original tem indicação de parcela (ex: "(3/10)"), preserva o sufixo
        if (params.descricao !== undefined) {
          const sufixoParcelaMatch = (item.descricao || '').match(/\(\d+\/\d+\)/);
          const sufixo = sufixoParcelaMatch ? ` ${sufixoParcelaMatch[0]}` : '';
          const descLimpa = params.descricao.replace(/\(\d+\/\d+\)/, '').trim();
          itemUpdate.descricao = `${descLimpa}${sufixo}`.trim() || null;
        }

        // Vencimento: se o dia mudou, calcula o novo vencimento daquele mês específico
        if (novoDiaVenc !== null) {
          const [anoItem, mesItem] = item.data_vencimento.split('-').map(Number);
          const diasNoMes = new Date(anoItem, mesItem, 0).getDate();
          const diaFinal = Math.min(novoDiaVenc, diasNoMes);
          const novaDtIso = `${anoItem}-${String(mesItem).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
          itemUpdate.data_vencimento = novaDtIso;
          itemUpdate.data_vencimento_operacional = this.calcularVencimentoOperacional(
            novaDtIso,
            params.categoriaNome,
            itemUpdate.descricao || item.descricao
          );
        }

        const { error: updErr } = await supabase
          .from('fin_contas_pagar')
          .update(itemUpdate)
          .eq('id', item.id);

        if (!updErr) {
          totalAfetadas++;
        }
      }

      await this.registrarAuditoria({
        contaId: params.contaId,
        usuarioId: params.usuarioId || 'sistema',
        usuarioNome: params.usuarioNome,
        acao: 'edicao',
        detalhes: {
          modo: 'esta_e_futuras',
          totalAfetadas,
          contratoRecorrenteId: contaAtual.contrato_recorrente_id,
          alteracoes: camposBaseUpdate
        }
      });

      return { sucesso: true, afetadas: totalAfetadas };
    } catch (err: any) {
      console.error('[FinContasPagarService] Erro ao editar conta:', err);
      return { sucesso: false, erro: err.message || 'Erro ao atualizar título' };
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
   * Dias marcados como picos estratégicos de liquidez da agência
   */
  public static readonly DIAS_PICO_FLUXO: readonly number[] = [1, 5, 10, 15, 20, 30];

  /**
   * Consolida a matriz de dias do mês com seus desembolsos e sinalização de dias de pico
   */
  public static calcularCalendarioMensal(
    contas: FinContaPagar[], 
    mes: number, 
    ano: number
  ): FinCalendarioMensalResumo {
    const totalDias = new Date(ano, mes, 0).getDate();
    const labelsSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dias: FinDiaCalendario[] = [];

    let somaTotalMes = 0;
    let diasComVencimento = 0;
    let maiorDesembolso: { dia: number; total: number } | undefined;

    for (let d = 1; d <= totalDias; d++) {
      const dataIso = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dt = new Date(ano, mes - 1, d);
      const diaSemana = dt.getDay();
      const ehFimDeSemana = diaSemana === 0 || diaSemana === 6;
      const ehDiaPico = this.DIAS_PICO_FLUXO.includes(d);

      // Filtra títulos com vencimento operacional correspondente ao dia
      const titulosDoDia = contas.filter(c => {
        if (c.status === 'cancelado') return false;
        const venc = c.data_vencimento_operacional || c.data_vencimento;
        return venc === dataIso;
      });

      let totalNominal = 0;
      let totalPago = 0;
      let qtdPendentes = 0;
      let qtdAtrasadas = 0;
      let qtdPagas = 0;

      for (const t of titulosDoDia) {
        const nominal = Number(t.valor_nominal) || 0;
        const pago = Number(t.valor_pago) || 0;
        totalNominal += nominal;
        totalPago += pago;

        if (t.status === 'pago') {
          qtdPagas++;
        } else if (t.status === 'atrasado') {
          qtdAtrasadas++;
          qtdPendentes++;
        } else {
          qtdPendentes++;
        }
      }

      if (titulosDoDia.length > 0) {
        diasComVencimento++;
        somaTotalMes += totalNominal;

        if (!maiorDesembolso || totalNominal > maiorDesembolso.total) {
          maiorDesembolso = { dia: d, total: totalNominal };
        }
      }

      dias.push({
        dia: d,
        dataIso,
        diaSemana,
        diaSemanaLabel: labelsSemana[diaSemana],
        ehFimDeSemana,
        ehDiaPico,
        totalNominal,
        totalPago,
        qtdTitulos: titulosDoDia.length,
        qtdPendentes,
        qtdAtrasadas,
        qtdPagas,
        titulos: titulosDoDia
      });
    }

    const mediaDiariaDesembolso = diasComVencimento > 0 ? somaTotalMes / diasComVencimento : 0;

    return {
      dias,
      diaMaiorDesembolso: maiorDesembolso,
      mediaDiariaDesembolso,
      diasComVencimento
    };
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

  /**
   * Obtém contas a pagar críticas que necessitam de atenção imediata:
   * 1. Contas atrasadas (vencimento operacional < hoje)
   * 2. Contas vencendo hoje
   * 3. Contas vencendo nos próximos N dias (padrão 2 dias / 48 horas)
   */
  public static async obterContasCriticasAlerta(limiteDias = 2): Promise<FinContaPagar[]> {
    try {
      const hoje = new Date();
      const hojeIso = hoje.toISOString().split('T')[0];
      
      const limiteDate = new Date(hoje);
      limiteDate.setDate(limiteDate.getDate() + limiteDias);
      const limiteIso = limiteDate.toISOString().split('T')[0];

      let contasRaw: any[] = [];
      const resPrincipal = await supabase
        .from('fin_contas_pagar')
        .select(`
          *,
          categoria:fin_categorias(id, nome),
          subcategoria:fin_subcategorias(id, nome)
        `)
        .in('status', ['pendente', 'parcial', 'atrasado'])
        .lte('data_vencimento', limiteIso)
        .order('data_vencimento', { ascending: true });

      if (resPrincipal.error) {
        // Fallback defensivo Zero-Break: se houver erro de relação PostgREST (400, 42P01, 42703), consulta direta
        const fallbackRes = await supabase
          .from('fin_contas_pagar')
          .select('*')
          .in('status', ['pendente', 'parcial', 'atrasado'])
          .lte('data_vencimento', limiteIso)
          .order('data_vencimento', { ascending: true });

        if (fallbackRes.error) {
          return [];
        }
        contasRaw = fallbackRes.data || [];
      } else {
        contasRaw = resPrincipal.data || [];
      }

      const contasMapeadas: FinContaPagar[] = contasRaw.map(conta => {
        const vencOperacional = conta.data_vencimento_operacional || this.calcularVencimentoOperacional(
          conta.data_vencimento,
          conta.categoria?.nome,
          conta.descricao
        );

        let statusFinal = conta.status;
        if ((statusFinal === 'pendente' || statusFinal === 'parcial') && vencOperacional < hojeIso) {
          statusFinal = 'atrasado';
        }

        return {
          ...conta,
          data_vencimento_operacional: vencOperacional,
          status: statusFinal
        };
      });

      // Filtra as que realmente caem até o limite operacional de 48h
      return contasMapeadas.filter(c => {
        const venc = c.data_vencimento_operacional || c.data_vencimento;
        return venc <= limiteIso;
      });
    } catch (err) {
      console.warn('[FinContasPagarService] Erro ao obter contas críticas para alertas:', err);
      return [];
    }
  }

  /**
   * Retorna o resumo consolidado de status e quantidades para o badge da sidebar
   */
  public static async obterResumoBadge(): Promise<{
    totalAtrasadas: number;
    totalVencendoHoje: number;
    totalVencendo48h: number;
    totalCriticas: number;
    nivelAlerta: 'urgente' | 'atencao' | 'normal';
  }> {
    try {
      const contas = await this.obterContasCriticasAlerta(2);
      const hojeIso = new Date().toISOString().split('T')[0];
      
      let totalAtrasadas = 0;
      let totalVencendoHoje = 0;
      let totalVencendo48h = 0;

      for (const conta of contas) {
        const venc = conta.data_vencimento_operacional || conta.data_vencimento;
        if (conta.status === 'atrasado' || venc < hojeIso) {
          totalAtrasadas++;
        } else if (venc === hojeIso) {
          totalVencendoHoje++;
        } else {
          totalVencendo48h++;
        }
      }

      const totalCriticas = totalAtrasadas + totalVencendoHoje + totalVencendo48h;
      const nivelAlerta: 'urgente' | 'atencao' | 'normal' = 
        totalAtrasadas > 0 ? 'urgente' : (totalVencendoHoje > 0 || totalVencendo48h > 0 ? 'atencao' : 'normal');

      return {
        totalAtrasadas,
        totalVencendoHoje,
        totalVencendo48h,
        totalCriticas,
        nivelAlerta
      };
    } catch (e) {
      console.warn('[FinContasPagarService] Erro ao calcular resumo de badge:', e);
      return { totalAtrasadas: 0, totalVencendoHoje: 0, totalVencendo48h: 0, totalCriticas: 0, nivelAlerta: 'normal' };
    }
  }
}

