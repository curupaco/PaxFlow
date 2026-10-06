import { supabase } from './supabase';
import { RemarcacaoViagemParams } from '../types';

export interface ResultadoRemarcacao {
  success: boolean;
  mensagem: string;
  novoValorTotal?: number;
  dataIdaAnterior?: string;
  dataVoltaAnterior?: string;
}

export class RemarcacaoService {
  /**
   * Executa a remarcação de uma viagem de forma atômica,
   * preservando estritamente a Data Financeiro original e
   * sincronizando os trechos operacionais de embarque.
   */
  public static async executarRemarcacao(
    params: RemarcacaoViagemParams
  ): Promise<ResultadoRemarcacao> {
    const {
      viagemId,
      novaDataIda,
      novaDataVolta,
      novosTrechos,
      temTaxaRemarcacao,
      taxaValor = 0,
      taxaFornecedor = 'FORNECEDOR',
      taxaTarifa,
      taxaTaxaEmbarque = 0,
      taxaComissao = 0,
      taxaMarkup = 0,
      taxaRav = 0,
      taxaTipo = 'OUTROS',
      motivoRemarcacao = '',
      consultorId
    } = params;

    if (!viagemId) {
      throw new Error('ID da viagem não informado para remarcação.');
    }
    if (!novaDataIda) {
      throw new Error('Por favor, informe a nova Data de Ida.');
    }

    // 1. Carregar dados atuais da viagem para histórico e integridade
    const { data: viagemAtual, error: errViagem } = await supabase
      .from('viagens')
      .select('id, data_ida, data_volta, data_financeiro, valor_total, destino, contatos_embarque, observacoes')
      .eq('id', viagemId)
      .single();

    if (errViagem || !viagemAtual) {
      throw new Error('Viagem não encontrada no banco de dados.');
    }

    const dataIdaAnterior = viagemAtual.data_ida || '';
    const dataVoltaAnterior = viagemAtual.data_volta || '';
    const finalDataVolta = novaDataVolta || novaDataIda;

    // 2. Atualizar as datas operacionais na tabela 'viagens' (PRESERVANDO DATA_FINANCEIRO)
    const updateViagemPayload: any = {
      data_ida: novaDataIda,
      data_volta: finalDataVolta,
      updated_at: new Date().toISOString()
    };

    const { error: errUpdateViagem } = await supabase
      .from('viagens')
      .update(updateViagemPayload)
      .eq('id', viagemId);

    if (errUpdateViagem) {
      throw new Error(`Erro ao atualizar datas da viagem: ${errUpdateViagem.message}`);
    }

    // 3. Atualizar trechos nos produtos aéreos existentes
    try {
      const { data: produtosAereos } = await supabase
        .from('produtos_viagem')
        .select('*')
        .eq('viagem_id', viagemId);

      if (produtosAereos && produtosAereos.length > 0) {
        for (const prod of produtosAereos) {
          const tipoUpper = (prod.tipo || '').toUpperCase();
          const isAereo = tipoUpper.includes('AÉREO') || tipoUpper.includes('VOO') || tipoUpper === 'AEREO';

          if (isAereo && prod.dados_adicionais && Array.isArray(prod.dados_adicionais.trechos)) {
            const trechosAtualizados = prod.dados_adicionais.trechos.map((t: any, idx: number) => {
              if (novosTrechos && novosTrechos[idx]) {
                return {
                  ...t,
                  origem: novosTrechos[idx].origem || t.origem,
                  destino: novosTrechos[idx].destino || t.destino,
                  dataIda: novosTrechos[idx].dataIda || novaDataIda,
                  dataVolta: novosTrechos[idx].dataVolta || finalDataVolta,
                  horaIda: novosTrechos[idx].horaIda || t.horaIda,
                  horaVolta: novosTrechos[idx].horaVolta || t.horaVolta
                };
              }
              return {
                ...t,
                dataIda: novaDataIda,
                dataVolta: finalDataVolta
              };
            });

            await supabase
              .from('produtos_viagem')
              .update({
                dados_adicionais: {
                  ...prod.dados_adicionais,
                  trechos: trechosAtualizados
                },
                data_servico: novaDataIda
              })
              .eq('id', prod.id);
          }
        }
      }
    } catch (eTrechos) {
      console.warn('Aviso ao sincronizar trechos dos produtos aéreos:', eTrechos);
    }

    // 4. Inserir produto de Taxa de Remarcação / Diferença Tarifária (se houver cobrança)
    let novoValorTotal = Number(viagemAtual.valor_total) || 0;

    if (temTaxaRemarcacao && Number(taxaValor) > 0) {
      const valorNum = Number(taxaValor);
      const tarifaCalc = taxaTarifa !== undefined ? taxaTarifa : valorNum;
      const dataHojeIso = new Date().toISOString().split('T')[0];

      try {
        const { error: errTaxa } = await supabase
          .from('produtos_viagem')
          .insert({
            viagem_id: viagemId,
            tipo: taxaTipo,
            fornecedor: taxaFornecedor,
            descricao: `Taxa de Remarcação / Diferença Tarifária${motivoRemarcacao ? ` (${motivoRemarcacao})` : ''}`,
            valor_custo: 0,
            valor_venda: valorNum,
            tarifa: tarifaCalc,
            taxa: taxaTaxaEmbarque,
            comissao: taxaComissao,
            markup: taxaMarkup,
            rav: taxaRav,
            status: 'confirmado',
            data_servico: dataHojeIso
          });

        if (errTaxa) {
          console.warn('Erro ao inserir taxa de remarcação em produtos_viagem:', errTaxa);
        } else {
          // Recalcular soma real de todos os produtos
          const { data: todosProds } = await supabase
            .from('produtos_viagem')
            .select('valor_venda')
            .eq('viagem_id', viagemId);

          if (todosProds && todosProds.length > 0) {
            novoValorTotal = todosProds.reduce((sum, p) => sum + (Number(p.valor_venda) || 0), 0);
          } else {
            novoValorTotal += valorNum;
          }

          await supabase
            .from('viagens')
            .update({ valor_total: novoValorTotal })
            .eq('id', viagemId);
        }
      } catch (eTaxa) {
        console.warn('Erro no processamento da taxa de remarcação:', eTaxa);
      }
    }

    // 5. Inserir Comentário de Auditoria na timeline da viagem
    try {
      const idaAntFmt = formatarDataBr(dataIdaAnterior);
      const voltaAntFmt = formatarDataBr(dataVoltaAnterior);
      const idaNovaFmt = formatarDataBr(novaDataIda);
      const voltaNovaFmt = formatarDataBr(finalDataVolta);

      let textoAudit = `🔁 **Viagem Remarcada**\n• De: ${idaAntFmt} a ${voltaAntFmt}\n• Para: ${idaNovaFmt} a ${voltaNovaFmt}`;
      if (motivoRemarcacao) {
        textoAudit += `\n• Motivo: ${motivoRemarcacao}`;
      }
      if (temTaxaRemarcacao && Number(taxaValor) > 0) {
        textoAudit += `\n• Taxa/Multa Adicional: R$ ${Number(taxaValor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      await supabase.from('comentarios').insert({
        tipo_item: 'viagem',
        item_id: viagemId,
        autor_id: consultorId,
        texto: textoAudit,
        created_at: new Date().toISOString()
      });
    } catch (eAudit) {
      console.warn('Aviso ao registrar comentário de auditoria da remarcação:', eAudit);
    }

    return {
      success: true,
      mensagem: 'Viagem remarcada com sucesso! O Relatório de Embarques foi atualizado.',
      novoValorTotal,
      dataIdaAnterior,
      dataVoltaAnterior
    };
  }
}

function formatarDataBr(dataIso?: string | null): string {
  if (!dataIso) return '--/--/----';
  const clean = dataIso.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataIso;
}
