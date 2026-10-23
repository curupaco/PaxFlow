import { describe, it, expect } from 'vitest';
import {
  validarTransicaoStatusViagem,
  verificarSLAViagem,
  calcularTotaisViagemComDivisao
} from '../../src/controllers/dashboardController';

describe('Dashboard Operacional - Regras Críticas e Segurança Subcutânea', () => {

  describe('1. Transições de Status de Viagem', () => {
    it('deve permitir transição direta para status fechado sem restrições impeditivas', () => {
      // Setup
      const viagem = { id: 'v-1', status: 'pre_embarque', valor_total: 5000 };

      // Action
      const resultado = validarTransicaoStatusViagem(viagem, 'fechado');

      // Assert
      expect(resultado.valido).toBe(true);
      expect(resultado.mensagemErro).toBeUndefined();
    });

    it('deve bloquear alteração manual de fechado para pos_venda', () => {
      // Setup
      const viagem = { id: 'v-2', status: 'fechado', valor_total: 8000, data_financeiro: '2026-10-20' };

      // Action
      const resultado = validarTransicaoStatusViagem(viagem, 'pos_venda');

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.mensagemErro).toContain('Não é possível alterar o status manualmente de Fechado para Pós-Venda');
    });

    it('deve exigir data_financeiro ao avançar para pos_venda', () => {
      // Setup
      const viagem = { id: 'v-3', status: 'em_viagem', valor_total: 3000, data_financeiro: null };

      // Action
      const resultado = validarTransicaoStatusViagem(viagem, 'pos_venda');

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.mensagemErro).toContain('A Data Financeiro é obrigatória para esta fase');
    });

    it('deve alertar divergência e requerer sincronização se a soma dos produtos diferir do total da viagem', () => {
      // Setup
      const viagem = { id: 'v-4', status: 'pre_embarque', valor_total: 5000, data_financeiro: '2026-10-15' };
      const produtos = [
        { id: 'p-1', valor_venda: 2000, status: 'ativo' },
        { id: 'p-2', valor_venda: 2500, status: 'ativo' }
      ]; // total = 4500, viagem = 5000

      // Action
      const resultado = validarTransicaoStatusViagem(viagem, 'em_viagem', produtos);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.requerSincronizacao).toBe(true);
      expect(resultado.diferencaValor).toBe(500);
      expect(resultado.totalProdutos).toBe(4500);
      expect(resultado.valorViagem).toBe(5000);
    });

    it('deve bloquear avanço para pos_venda se houver produto ativo com valores não detalhados', () => {
      // Setup
      const viagem = { id: 'v-5', status: 'em_viagem', valor_total: 3000, data_financeiro: '2026-10-10' };
      const produtos = [
        {
          id: 'p-1',
          fornecedor: 'Hotel Teste',
          valor_venda: 3000,
          tarifa: 2000,
          taxa: 100,
          comissao: 400,
          markup: 0,
          rav: 0,
          status: 'ativo'
        } // soma = 2500, venda = 3000 (diferença de 500)
      ];

      // Action
      const resultado = validarTransicaoStatusViagem(viagem, 'pos_venda', produtos);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.mensagemErro).toContain('não está com seus valores 100% detalhados');
    });

    it('deve aprovar transição para pos_venda quando dados financeiros e produtos estiverem 100% em conformidade', () => {
      // Setup
      const viagem = { id: 'v-6', status: 'em_viagem', valor_total: 4000, data_financeiro: '2026-10-12' };
      const produtos = [
        {
          id: 'p-1',
          fornecedor: 'Cia Aérea',
          valor_venda: 4000,
          tarifa: 3200,
          taxa: 300,
          comissao: 500,
          markup: 0,
          rav: 0,
          status: 'ativo'
        }
      ];

      // Action
      const resultado = validarTransicaoStatusViagem(viagem, 'pos_venda', produtos);

      // Assert
      expect(resultado.valido).toBe(true);
      expect(resultado.mensagemErro).toBeUndefined();
    });
  });

  describe('2. Monitoramento e Alertas de SLA Operacional', () => {
    it('deve disparar alerta de pré-embarque quando a data de ida estiver dentro da janela de SLA', () => {
      // Setup
      const dataHoje = new Date('2026-10-23T10:00:00Z');
      const viagem = {
        id: 'v-sla-1',
        status: 'pre_embarque',
        data_ida: '2026-10-25', // 2 dias de diferença (dentro do SLA padrão de 7 dias)
        produtos: []
      };

      // Action
      const alerta = verificarSLAViagem(viagem, {
        slaPreEmbarqueDias: 7,
        dataReferencia: dataHoje
      });

      // Assert
      expect(alerta.alert).toBe(true);
      expect(alerta.type).toBe('pre-embarque');
      expect(alerta.text).toContain('Embarque em 2 dias');
    });

    it('deve disparar alerta de pós-viagem quando o retorno ultrapassar os dias de SLA sem pós-contato concluído', () => {
      // Setup
      const dataHoje = new Date('2026-10-23T10:00:00Z');
      const viagem = {
        id: 'v-sla-2',
        status: 'pos_viagem',
        data_volta: '2026-10-18', // Retornou há 5 dias (SLA máximo de 3 dias)
        pos_contato_concluido: false,
        nps_respondido: false
      };

      // Action
      const alerta = verificarSLAViagem(viagem, {
        slaPosViagemDias: 3,
        dataReferencia: dataHoje
      });

      // Assert
      expect(alerta.alert).toBe(true);
      expect(alerta.type).toBe('pos-viagem');
      expect(alerta.text).toContain('SLA Excedido!');
      expect(alerta.text).toContain('5 dias sem pós-contato');
    });

    it('não deve disparar alerta de pós-viagem se o cliente já tiver respondido ao NPS ou pós-contato concluído', () => {
      // Setup
      const dataHoje = new Date('2026-10-23T10:00:00Z');
      const viagem = {
        id: 'v-sla-3',
        status: 'pos_viagem',
        data_volta: '2026-10-18',
        pos_contato_concluido: true
      };

      // Action
      const alerta = verificarSLAViagem(viagem, {
        slaPosViagemDias: 3,
        dataReferencia: dataHoje
      });

      // Assert
      expect(alerta.alert).toBe(false);
      expect(alerta.type).toBeNull();
    });

    it('deve disparar alerta de reembolso quando houver processo pendente excedendo o prazo de tolerância', () => {
      // Setup
      const dataHoje = new Date('2026-10-23T10:00:00Z');
      const viagem = {
        id: 'v-sla-4',
        status: 'reembolso_solicitado',
        reembolsos: [
          { id: 'r-1', status: 'solicitado', status_tratativa: 'aberto', created_at: '2026-10-15T12:00:00Z' } // 8 dias aberto
        ]
      };

      // Action
      const alerta = verificarSLAViagem(viagem, {
        prazoReembolsoDias: 3,
        dataReferencia: dataHoje
      });

      // Assert
      expect(alerta.alert).toBe(true);
      expect(alerta.type).toBe('reembolso');
      expect(alerta.text).toContain('reembolso pendente');
    });
  });

  describe('3. Cálculos Financeiros com Splits e Comissões', () => {
    it('deve calcular valores integrais para viagem sem divisões atribuídas', () => {
      // Setup
      const viagem = {
        id: 'v-fin-1',
        valor_total: 10000,
        produtos: [
          {
            tipo: 'Aéreo',
            valor_venda: 10000,
            tarifa: 8000,
            taxa: 500,
            comissao: 1500,
            markup: 0,
            rav: 0,
            status: 'ativo'
          }
        ],
        divisoes: []
      };

      // Action
      const totais = calcularTotaisViagemComDivisao(viagem, 'consultor-1');

      // Assert
      expect(totais.totalVenda).toBe(10000);
      expect(totais.totalComissao).toBe(1500);
      expect(totais.totalRentabilidade).toBe(1500);
      expect(totais.isDividida).toBe(false);
      expect(totais.fatiaVenda).toBe(1);
    });

    it('deve calcular proporções exatas de venda, comissão e rentabilidade para viagem dividida entre consultores', () => {
      // Setup
      const viagem = {
        id: 'v-fin-2',
        consultor_id: 'c-titular',
        valor_total: 10000,
        produtos: [
          {
            tipo: 'Aéreo',
            valor_venda: 10000,
            tarifa: 8000,
            taxa: 500,
            comissao: 1500,
            markup: 0,
            rav: 0,
            status: 'ativo'
          }
        ],
        divisoes: [
          { consultor_id: 'c-titular', percentual: 60, percentual_rav: 60 },
          { consultor_id: 'c-parceiro', percentual: 40, percentual_rav: 40 }
        ]
      };

      // Action
      const totaisTitular = calcularTotaisViagemComDivisao(viagem, 'c-titular');
      const totaisParceiro = calcularTotaisViagemComDivisao(viagem, 'c-parceiro');

      // Assert
      expect(totaisTitular.isDividida).toBe(true);
      expect(totaisTitular.fatiaVenda).toBe(0.6);
      expect(totaisTitular.totalVenda).toBe(6000);
      expect(totaisTitular.totalComissao).toBe(900);
      expect(totaisTitular.totalRentabilidade).toBe(900);

      expect(totaisParceiro.isDividida).toBe(true);
      expect(totaisParceiro.fatiaVenda).toBe(0.4);
      expect(totaisParceiro.totalVenda).toBe(4000);
      expect(totaisParceiro.totalComissao).toBe(600);
      expect(totaisParceiro.totalRentabilidade).toBe(600);
    });
  });

});
