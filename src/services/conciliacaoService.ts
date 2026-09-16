import { supabase, getSessaoAtual } from './supabase';
import { TransacaoOFX } from './ofxParser';

export interface ExtratoTransacao {
  id: string;
  lote_id?: string;
  banco_origem?: string;
  data_transacao: string; // YYYY-MM-DD
  descricao: string;
  documento?: string;
  fitid?: string;
  valor: number;
  tipo: 'CREDITO' | 'DEBITO' | 'CREDIT' | 'DEBIT';
  status: 'pendente' | 'conciliado' | 'justificado' | 'ignorado';
  categoria_nao_venda?: string;
  observacao_justificativa?: string;
  data_conciliacao?: string;
  conciliado_por?: string;
}

export interface LocPagamentoPendente {
  id: string;
  viagem_id?: string;
  loc_codigo: string;
  cliente_nome: string;
  data_vencimento: string; // YYYY-MM-DD
  valor: number;
  forma_pagamento: string;
  parcela_numero?: number;
  observacoes?: string;
  conciliado?: boolean;
}

export interface SugestaoMatch {
  transacaoExtratoId: string;
  locPagamentoId: string;
  score: number; // 0 a 100
  motivo: string;
}

export interface ResumoConciliacao {
  totalExtrato: number;
  totalConciliado: number;
  totalPendenteExtrato: number;
  totalRecebimentosSemBanco: number;
  qtdExtrato: number;
  qtdConciliado: number;
  qtdPendenteExtrato: number;
  qtdRecebimentosSemBanco: number;
  taxaConciliacao: number;
}

export interface FechamentoMes {
  id: string;
  ano_mes: string;
  total_conciliado: number;
  total_diferenca?: number;
  data_fechamento: string;
  fechado_por?: string;
  observacoes?: string;
}

// Aliases para compatibilidade de tipos
export type ExtratoItem = ExtratoTransacao;
export type RecebimentoSistema = LocPagamentoPendente;

export class ConciliacaoService {
  /**
   * Importa um lote de transações bancárias no banco de dados e arquiva o arquivo no Supabase Storage
   */
  public static async importarLoteExtrato(
    nomeArquivo: string,
    bancoNome: string,
    transacoes: TransacaoOFX[],
    arquivoBlob?: Blob
  ): Promise<{ sucesso: boolean; loteId?: string; totalInserido: number; erro?: string }> {
    try {
      const { user } = await getSessaoAtual();
      const creditos = transacoes
        .filter(t => t.tipo === 'CREDITO' || t.tipo === 'CREDIT')
        .reduce((acc, t) => acc + t.valor, 0);
      const debitos = transacoes
        .filter(t => t.tipo === 'DEBITO' || t.tipo === 'DEBIT')
        .reduce((acc, t) => acc + t.valor, 0);

      const datas = transacoes.map(t => t.data).filter(Boolean).sort();
      const dataInicio = datas[0];
      const dataFim = datas[datas.length - 1];

      let storagePath: string | undefined = undefined;

      // 1. Upload seguro do arquivo original para o Storage se fornecido
      if (arquivoBlob) {
        try {
          const timestamp = Date.now();
          const cleanName = nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${timestamp}_${cleanName}`;
          
          const { error: storageErr } = await supabase.storage
            .from('extratos-bancarios')
            .upload(path, arquivoBlob, {
              upsert: true,
              contentType: 'application/octet-stream'
            });

          if (!storageErr) {
            storagePath = path;
          }
        } catch (errStorage) {
          console.warn('[Storage Aviso] Não foi possível salvar arquivo no bucket extratos-bancarios:', errStorage);
        }
      }

      // 2. Cria registro do lote
      const lotePayload: any = {
        nome_arquivo: nomeArquivo,
        banco_nome: bancoNome,
        arquivo_storage_path: storagePath,
        data_inicio_extrato: dataInicio,
        data_fim_extrato: dataFim,
        total_registros: transacoes.length,
        total_creditos: creditos,
        total_debitos: debitos,
        criado_por: user?.id
      };

      const { data: loteData, error: loteErr } = await supabase
        .from('extratos_bancarios_lotes')
        .insert(lotePayload)
        .select()
        .single();

      if (loteErr) {
        if (loteErr.code === '42P01') {
          console.warn('[Schema Drift 42P01] Tabela extratos_bancarios_lotes inexistente.');
          return { sucesso: false, totalInserido: 0, erro: 'Tabela de extratos não criada no Supabase. Execute o script DDL.' };
        }
        throw loteErr;
      }

      const loteId = loteData.id;

      // 3. Insere os itens do extrato
      const itensPayload = transacoes.map(t => ({
        lote_id: loteId,
        banco_origem: bancoNome,
        data_transacao: t.data,
        descricao: t.descricao,
        documento: t.documento || t.documentoRef || null,
        fitid: t.fitid || null,
        tipo: t.tipo.startsWith('CRED') ? 'CREDITO' : 'DEBITO',
        valor: t.valor,
        status: 'pendente'
      }));

      const { error: itensErr } = await supabase
        .from('extratos_bancarios_transacoes')
        .insert(itensPayload);

      if (itensErr) throw itensErr;

      return {
        sucesso: true,
        loteId,
        totalInserido: transacoes.length
      };

    } catch (err: any) {
      console.error('Erro ao importar lote de extrato:', err);
      return {
        sucesso: false,
        totalInserido: 0,
        erro: err.message || 'Erro inesperado na gravação dos dados'
      };
    }
  }

  /**
   * Lista todas as transações do extrato bancário
   */
  public static async listarTransacoesExtrato(filtros: {
    status?: string;
    banco?: string;
  } = {}): Promise<ExtratoTransacao[]> {
    try {
      let query = supabase
        .from('extratos_bancarios_transacoes')
        .select('*')
        .order('data_transacao', { ascending: false });

      if (filtros.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status);
      }

      if (filtros.banco && filtros.banco !== 'todos') {
        query = query.eq('banco_origem', filtros.banco);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01') {
          console.warn('[Schema Drift 42P01] Tabela extratos_bancarios_transacoes não existe.');
          return [];
        }
        throw error;
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        lote_id: t.lote_id,
        banco_origem: t.banco_origem,
        data_transacao: t.data_transacao || t.data_movimento || new Date().toISOString().split('T')[0],
        descricao: t.descricao || t.descricao_original || 'Sem descrição',
        documento: t.documento || t.documento_ref,
        fitid: t.fitid,
        valor: Number(t.valor) || 0,
        tipo: t.tipo || t.tipo_movimento || 'CREDITO',
        status: (t.status || 'pendente').toLowerCase(),
        categoria_nao_venda: t.categoria_nao_venda || t.justificativa_categoria,
        observacao_justificativa: t.observacao_justificativa || t.justificativa_obs,
        data_conciliacao: t.data_conciliacao,
        conciliado_por: t.conciliado_por
      }));
    } catch (err) {
      console.error('Erro ao listar transações do extrato:', err);
      return [];
    }
  }

  /**
   * Alias de compatibilidade
   */
  public static async carregarItensExtrato(filtros?: any): Promise<ExtratoTransacao[]> {
    return this.listarTransacoesExtrato(filtros);
  }

  /**
   * Lista recebimentos de clientes/viagens pendentes de conciliação
   */
  public static async listarRecebimentosPendentes(): Promise<LocPagamentoPendente[]> {
    try {
      let query = supabase
        .from('loc_pagamentos')
        .select(`
          id,
          viagem_id,
          codigo_localizador,
          valor,
          conciliado,
          data_vencimento,
          forma_pagamento,
          parcela_numero,
          observacoes,
          viagens:viagem_id(
            id,
            codigo_referencia,
            data_inicio,
            cliente:cliente_id(nome)
          )
        `)
        .eq('conciliado', false)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        // Schema Drift: se coluna conciliado não existir
        if (error.code === '42703' || error.message?.includes('conciliado')) {
          console.warn('[Schema Drift 42703] Coluna conciliado ausente em loc_pagamentos.');
          const fallbackQuery = await supabase
            .from('loc_pagamentos')
            .select(`
              id,
              viagem_id,
              codigo_localizador,
              valor,
              data_vencimento,
              forma_pagamento,
              parcela_numero,
              observacoes,
              viagens:viagem_id(
                id,
                codigo_referencia,
                data_inicio,
                cliente:cliente_id(nome)
              )
            `)
            .order('created_at', { ascending: false });

          if (fallbackQuery.error) return [];
          return (fallbackQuery.data || []).map((p: any) => this.normalizarLocPagamento(p));
        }

        if (error.code === '42P01') {
          return [];
        }
        throw error;
      }

      return (data || []).map((p: any) => this.normalizarLocPagamento(p));
    } catch (err) {
      console.error('Erro ao listar recebimentos pendentes:', err);
      return [];
    }
  }

  /**
   * Alias de compatibilidade
   */
  public static async carregarRecebimentosSistema(): Promise<LocPagamentoPendente[]> {
    return this.listarRecebimentosPendentes();
  }

  private static normalizarLocPagamento(p: any): LocPagamentoPendente {
    const viagem = p.viagens || p.viagem || {};
    const clienteNome = viagem.cliente?.nome || 'Cliente não identificado';
    const dataVenc = p.data_vencimento || viagem.data_inicio || new Date().toISOString().split('T')[0];

    return {
      id: p.id,
      viagem_id: p.viagem_id,
      loc_codigo: p.codigo_localizador || viagem.codigo_referencia || 'S/LOC',
      cliente_nome: clienteNome,
      data_vencimento: String(dataVenc).split('T')[0],
      valor: Number(p.valor) || 0,
      forma_pagamento: p.forma_pagamento || 'Recebimento',
      parcela_numero: p.parcela_numero,
      observacoes: p.observacoes,
      conciliado: p.conciliado === true
    };
  }

  /**
   * Algoritmo de Smart Matching (Sugestão Inteligente de Casamento)
   */
  public static calcularSmartMatches(
    transacoes: ExtratoTransacao[],
    pendentes: LocPagamentoPendente[]
  ): SugestaoMatch[] {
    const sugestoes: SugestaoMatch[] = [];
    const pendentesNaoConciliados = pendentes.filter(p => !p.conciliado);

    for (const t of transacoes) {
      if (t.status !== 'pendente') continue;

      let melhorMatch: LocPagamentoPendente | null = null;
      let melhorScore = 0;
      let motivos: string[] = [];

      for (const p of pendentesNaoConciliados) {
        let score = 0;
        const currentMotivos: string[] = [];

        // 1. Proximidade de Valor
        const diffValor = Math.abs(t.valor - p.valor);
        if (diffValor < 0.01) {
          score += 60;
          currentMotivos.push('Valor exato');
        } else if (p.valor > t.valor && (p.valor - t.valor) <= p.valor * 0.05) {
          // Diferença <= 5% (taxa de cartão de crédito/gateway)
          score += 40;
          currentMotivos.push('Diferença de taxa de gateway');
        }

        // 2. Proximidade de Data
        if (t.data_transacao && p.data_vencimento) {
          const dtT = new Date(t.data_transacao + 'T12:00:00').getTime();
          const dtP = new Date(p.data_vencimento + 'T12:00:00').getTime();
          const diffDias = Math.abs(dtT - dtP) / (1000 * 60 * 60 * 24);

          if (diffDias === 0) {
            score += 30;
            currentMotivos.push('Mesmo dia');
          } else if (diffDias <= 1) {
            score += 25;
            currentMotivos.push('Data ±1 dia');
          } else if (diffDias <= 3) {
            score += 15;
            currentMotivos.push('Data ±3 dias');
          }
        }

        // 3. Proximidade de Texto
        const descUpper = t.descricao.toUpperCase();
        if (p.loc_codigo && p.loc_codigo !== 'S/LOC' && descUpper.includes(p.loc_codigo.toUpperCase())) {
          score += 25;
          currentMotivos.push('LOC coincide');
        }

        if (p.cliente_nome) {
          const primeiroNome = p.cliente_nome.split(' ')[0].toUpperCase();
          if (primeiroNome.length > 3 && descUpper.includes(primeiroNome)) {
            score += 15;
            currentMotivos.push('Nome/LOC coincide');
          }
        }

        if (score > melhorScore && score >= 50) {
          melhorScore = score;
          melhorMatch = p;
          motivos = currentMotivos;
        }
      }

      if (melhorMatch && melhorScore >= 50) {
        sugestoes.push({
          transacaoExtratoId: t.id,
          locPagamentoId: melhorMatch.id,
          score: Math.min(100, melhorScore),
          motivo: motivos.join(' + ')
        });
      }
    }

    return sugestoes;
  }

  /**
   * Calcula resumo financeiro da conciliação
   */
  public static calcularResumo(
    transacoes: ExtratoTransacao[],
    pendentesLocs: LocPagamentoPendente[]
  ): ResumoConciliacao {
    const totalExtrato = transacoes.reduce((acc, t) => acc + t.valor, 0);
    const transacoesConciliadas = transacoes.filter(t => t.status === 'conciliado' || t.status === 'justificado');
    const totalConciliado = transacoesConciliadas.reduce((acc, t) => acc + t.valor, 0);

    const transacoesPendentes = transacoes.filter(t => t.status === 'pendente');
    const totalPendenteExtrato = transacoesPendentes.reduce((acc, t) => acc + t.valor, 0);

    const locsSemBanco = pendentesLocs.filter(p => !p.conciliado);
    const totalRecebimentosSemBanco = locsSemBanco.reduce((acc, p) => acc + p.valor, 0);

    const taxaConciliacao = totalExtrato > 0 ? (totalConciliado / totalExtrato) * 100 : 0;

    return {
      totalExtrato,
      totalConciliado,
      totalPendenteExtrato,
      totalRecebimentosSemBanco,
      qtdExtrato: transacoes.length,
      qtdConciliado: transacoesConciliadas.length,
      qtdPendenteExtrato: transacoesPendentes.length,
      qtdRecebimentosSemBanco: locsSemBanco.length,
      taxaConciliacao
    };
  }

  /**
   * Concilia uma transação bancária com 1 ou mais pagamentos
   */
  public static async conciliarTransacao(params: {
    transacaoId: string;
    locPagamentoIds: string[];
    taxaDesconto?: number;
  }): Promise<void> {
    const { user } = await getSessaoAtual();
    const nowIso = new Date().toISOString();

    // 1. Atualiza status da transação bancária
    const { error: errTransacao } = await supabase
      .from('extratos_bancarios_transacoes')
      .update({
        status: 'conciliado',
        data_conciliacao: nowIso,
        conciliado_por: user?.id
      })
      .eq('id', params.transacaoId);

    if (errTransacao && errTransacao.code !== '42P01') {
      throw errTransacao;
    }

    // 2. Insere os vínculos
    const vinculosPayload = params.locPagamentoIds.map(locId => ({
      extrato_item_id: params.transacaoId,
      loc_pagamento_id: locId,
      valor_taxa_desconto: params.taxaDesconto || 0,
      criado_por: user?.id
    }));

    try {
      await supabase
        .from('extratos_conciliacoes_vinculos')
        .insert(vinculosPayload);
    } catch (e) {
      console.warn('Fallback vinculos:', e);
    }

    // 3. Marca os loc_pagamentos como conciliados
    for (const locId of params.locPagamentoIds) {
      try {
        await supabase
          .from('loc_pagamentos')
          .update({
            conciliado: true,
            data_conciliacao: nowIso
          })
          .eq('id', locId);
      } catch (e) {
        console.warn('Fallback loc_pagamentos conciliado:', e);
      }
    }
  }

  /**
   * Alias de compatibilidade
   */
  public static async executarConciliacao(extratoItemId: string, vinculos: any[]): Promise<any> {
    const ids = vinculos.map(v => v.locPagamentoId);
    const taxa = vinculos.reduce((acc, v) => acc + (v.taxaDesconto || 0), 0);
    await this.conciliarTransacao({
      transacaoId: extratoItemId,
      locPagamentoIds: ids,
      taxaDesconto: taxa
    });
    return { sucesso: true };
  }

  /**
   * Reverte conciliação
   */
  public static async reverterConciliacao(transacaoId: string): Promise<void> {
    // 1. Busca os IDs vinculados
    const { data: vinculos } = await supabase
      .from('extratos_conciliacoes_vinculos')
      .select('loc_pagamento_id')
      .eq('extrato_item_id', transacaoId);

    const locIds = (vinculos || []).map(v => v.loc_pagamento_id);

    // 2. Deleta os vínculos
    try {
      await supabase
        .from('extratos_conciliacoes_vinculos')
        .delete()
        .eq('extrato_item_id', transacaoId);
    } catch (e) {
      console.warn('Fallback delete vinculos:', e);
    }

    // 3. Atualiza a transação para pendente
    await supabase
      .from('extratos_bancarios_transacoes')
      .update({
        status: 'pendente',
        data_conciliacao: null,
        conciliado_por: null,
        categoria_nao_venda: null,
        observacao_justificativa: null
      })
      .eq('id', transacaoId);

    // 4. Marca os loc_pagamentos como não conciliados
    for (const locId of locIds) {
      try {
        await supabase
          .from('loc_pagamentos')
          .update({
            conciliado: false,
            data_conciliacao: null
          })
          .eq('id', locId);
      } catch (e) {
        console.warn('Fallback reverter loc_pagamento:', e);
      }
    }
  }

  /**
   * Alias de compatibilidade
   */
  public static async desconciliarItem(extratoItemId: string): Promise<any> {
    await this.reverterConciliacao(extratoItemId);
    return { sucesso: true };
  }

  /**
   * Justifica entrada não relacionada a vendas
   */
  public static async justificarNaoVenda(
    transacaoId: string,
    categoria: string,
    observacao: string
  ): Promise<void> {
    const { user } = await getSessaoAtual();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('extratos_bancarios_transacoes')
      .update({
        status: 'justificado',
        categoria_nao_venda: categoria,
        observacao_justificativa: observacao,
        data_conciliacao: nowIso,
        conciliado_por: user?.id
      })
      .eq('id', transacaoId);

    if (error && error.code !== '42P01') {
      throw error;
    }
  }

  /**
   * Alias de compatibilidade
   */
  public static async justificarEntrada(transacaoId: string, categoria: any, observacao?: string): Promise<any> {
    await this.justificarNaoVenda(transacaoId, categoria, observacao || '');
    return { sucesso: true };
  }

  /**
   * Tranca e fecha a competência contábil
   */
  public static async fecharCompetencia(
    anoMes: string,
    observacoesOuTotal?: any,
    totalTaxas?: number,
    obsFinal?: string
  ): Promise<void> {
    const { user } = await getSessaoAtual();
    let obs = typeof observacoesOuTotal === 'string' ? observacoesOuTotal : obsFinal;
    let totalConciliado = typeof observacoesOuTotal === 'number' ? observacoesOuTotal : 0;

    const { error } = await supabase
      .from('competencias_financeiras_fechadas')
      .insert({
        ano_mes: anoMes,
        total_conciliado: totalConciliado,
        total_diferenca: totalTaxas || 0,
        fechado_por: user?.id,
        observacoes: obs || null
      });

    if (error && error.code !== '42P01') {
      throw error;
    }
  }

  /**
   * Lista competências fechadas
   */
  public static async listarFechamentos(): Promise<FechamentoMes[]> {
    try {
      const { data, error } = await supabase
        .from('competencias_financeiras_fechadas')
        .select('*')
        .order('ano_mes', { ascending: false });

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }

      return (data || []).map((f: any) => ({
        id: f.id,
        ano_mes: f.ano_mes,
        total_conciliado: Number(f.total_conciliado || f.total_bancario_conciliado) || 0,
        total_diferenca: Number(f.total_diferenca || f.total_taxas_absorvidas) || 0,
        data_fechamento: f.data_fechamento || f.created_at || new Date().toISOString(),
        fechado_por: f.fechado_por,
        observacoes: f.observacoes
      }));
    } catch (e) {
      console.error('Erro ao listar fechamentos:', e);
      return [];
    }
  }

  /**
   * Alias de compatibilidade
   */
  public static async obterCompetenciasFechadas(): Promise<any[]> {
    return this.listarFechamentos();
  }

  /**
   * Exporta dados em formato CSV para download
   */
  public static exportarRelatorioCSV(transacoes: ExtratoTransacao[]): void {
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'Data Transação;Banco;Descrição;Documento / FitID;Valor (R$);Status;Categoria / Justificativa;Data Conciliação\n';

    transacoes.forEach(t => {
      const dataFmt = t.data_transacao ? t.data_transacao.split('-').reverse().join('/') : '';
      const valorFmt = t.valor.toFixed(2).replace('.', ',');
      const statusFmt = t.status.toUpperCase();
      const catFmt = t.categoria_nao_venda || t.observacao_justificativa || '';
      const concFmt = t.data_conciliacao ? t.data_conciliacao.split('T')[0].split('-').reverse().join('/') : '';

      csv += `"${dataFmt}";"${t.banco_origem || ''}";"${t.descricao.replace(/"/g, '""')}";"${t.documento || t.fitid || ''}";"${valorFmt}";"${statusFmt}";"${catFmt.replace(/"/g, '""')}";"${concFmt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_conciliacao_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Alias de compatibilidade
   */
  public static exportarRelatorioConciliacaoCSV(transacoes: ExtratoTransacao[]): string {
    let csv = '\uFEFF';
    csv += 'Data Transação;Banco;Descrição;Documento / FitID;Valor (R$);Status;Categoria / Justificativa;Data Conciliação\n';
    transacoes.forEach(t => {
      const dataFmt = t.data_transacao ? t.data_transacao.split('-').reverse().join('/') : '';
      const valorFmt = t.valor.toFixed(2).replace('.', ',');
      csv += `"${dataFmt}";"${t.banco_origem || ''}";"${t.descricao}";"${t.documento || ''}";"${valorFmt}";"${t.status}";"${t.categoria_nao_venda || ''}";"${t.data_conciliacao || ''}"\n`;
    });
    return csv;
  }
}
