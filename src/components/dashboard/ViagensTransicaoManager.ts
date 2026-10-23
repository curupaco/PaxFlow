/**
 * src/components/dashboard/ViagensTransicaoManager.ts
 *
 * Gerenciador de Transições de Status Operacional de Viagens.
 * Centraliza as regras de conformidade (Data Financeiro, conferência de saldo com produtos,
 * detalhamento 100% de tarifas/taxas/comissões) e integração com o fluxo de reembolso.
 */

import { supabase } from '../../services/supabase';
import { showCustomConfirm } from '../../services/dialog';
import { SolicitarReembolsoModal } from '../reembolsos/SolicitarReembolsoModal';

export interface TransicaoOptions {
  isFallbackMode?: boolean;
  showToast: (message: string, type?: 'success' | 'error', err?: any) => void;
}

export interface RefundModalOptions {
  user: any;
  oldStatus: string;
  selectEl?: HTMLSelectElement;
  showToast: (message: string, type?: 'success' | 'error', err?: any) => void;
  onSucesso: () => Promise<void> | void;
}

export class ViagensTransicaoManager {
  /**
   * Valida a transição de status de uma viagem sob as regras operacionais do PaxFlow
   */
  public static async validarTransicaoStatus(
    viagem: any,
    newStatus: string,
    options: TransicaoOptions
  ): Promise<boolean> {
    const { isFallbackMode, showToast } = options;

    if (newStatus === 'fechado') return true;
    if (!viagem) return false;

    // 1. Bloqueio manual de Fechado para Pós-Venda
    if (viagem.status === 'fechado' && newStatus === 'pos_venda') {
      showToast('Não é possível alterar o status manualmente de Fechado para Pós-Venda. Essa alteração ocorre automaticamente quando as validações Financeira e de Processo estiverem concluídas.', 'error');
      return false;
    }

    // 2. Validação de data financeira (obrigatória para fases finais/operacionais como Pós-Venda)
    if (newStatus === 'pos_venda' && !viagem.data_financeiro) {
      showToast('Não é possível alterar para Pós-Venda. A Data Financeiro é obrigatória para esta fase. Por favor, defina a data abrindo os detalhes da viagem.', 'error');
      return false;
    }

    // 3. Buscar produtos da viagem para conciliação
    let produtos: any[] = [];
    if (!isFallbackMode) {
      try {
        const { data, error } = await supabase
          .from('produtos_viagem')
          .select('valor_venda, tarifa, taxa, comissao, markup, rav, fornecedor, descricao, status')
          .eq('viagem_id', viagem.id);
        if (!error && data) {
          produtos = data;
        }
      } catch (errCheck) {
        console.warn('Erro ao carregar produtos para validação:', errCheck);
      }
    }
    if (produtos.length === 0) {
      produtos = viagem.produtos || [];
    }

    // Produtos ativos (desconsidera itens cancelados/reembolsados)
    const produtosAtivos = produtos.filter(p => String(p.status || '').toLowerCase() !== 'reembolsado');
    const produtosParaCalculo = produtosAtivos.length > 0 ? produtosAtivos : produtos;

    // 4. Validar relação entre produtos e total da viagem
    const totalProdutos = produtosParaCalculo.reduce((sum, p) => sum + (Number(p.valor_venda) || 0), 0);
    const valorViagem = Number(viagem.valor_total) || 0;
    const pendente = valorViagem - totalProdutos;

    if (produtosParaCalculo.length > 0 && Math.abs(pendente) > 0.01) {
      const confirmSync = await showCustomConfirm(
        `O valor total da viagem (R$ ${valorViagem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) difere da soma dos produtos ativos (R$ ${totalProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Deseja sincronizar automaticamente o valor da viagem com a soma dos produtos para avançar?`,
        'Sincronizar Valor da Viagem'
      );
      if (confirmSync) {
        try {
          await supabase.from('viagens').update({ valor_total: totalProdutos }).eq('id', viagem.id);
          viagem.valor_total = totalProdutos;
        } catch (syncErr) {
          console.warn('Falha ao sincronizar valor total da viagem:', syncErr);
        }
      } else {
        showToast(`Existe uma diferença de R$ ${Math.abs(pendente).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} entre a viagem e os produtos ativos. Ajuste os produtos ou o valor da viagem para prosseguir.`, 'error');
        return false;
      }
    } else if (produtosParaCalculo.length === 0 && valorViagem > 0) {
      showToast('Esta viagem ainda não possui produtos ativos cadastrados. Adicione ao menos um produto ativo na aba "Produtos e Serviços" para avançar.', 'error');
      return false;
    }

    // 5. Validar se todos os produtos ativos cadastrados estão detalhados ao avançar para Pós-Venda
    if (newStatus === 'pos_venda') {
      const produtoNaoDetalhado = produtosParaCalculo.find(p => {
        const tarifa = Number(p.tarifa) || 0;
        const taxa = Number(p.taxa) || 0;
        const comissao = Number(p.comissao) || 0;
        const markup = Number(p.markup) || 0;
        const rav = Number(p.rav) || 0;
        const totalDet = tarifa + taxa + comissao + markup + rav;
        return Math.abs(Number(p.valor_venda || 0) - totalDet) > 0.01;
      });

      if (produtoNaoDetalhado) {
        showToast(`Não é possível avançar para Pós-Venda. O produto "${produtoNaoDetalhado.fornecedor} - ${produtoNaoDetalhado.descricao}" não está com seus valores 100% detalhados (soma de Tarifa + Taxa + Comissão deve ser igual ao Valor de Venda do produto).`, 'error');
        return false;
      }
    }

    return true;
  }

  /**
   * Abre o Modal Dinâmico para solicitação de reembolso de um produto
   */
  public static async openRefundModal(
    viagem: any,
    options: RefundModalOptions
  ): Promise<void> {
    const { user, oldStatus, selectEl, showToast, onSucesso } = options;

    await SolicitarReembolsoModal.abrir({
      viagemId: viagem.id,
      viagemDescricao: `${viagem?.destino || 'Viagem'} • ${viagem?.cliente?.nome || ''}`,
      produtos: viagem?.produtos || [],
      user: user,
      showToast: (msg, type, err) => showToast(msg, type, err),
      onSucesso: async () => {
        await onSucesso();
      },
      onCancel: () => {
        if (selectEl) {
          selectEl.value = oldStatus;
        }
      }
    });
  }
}
