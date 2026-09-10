import { describe, it, expect } from 'vitest';
import {
  formatTipoSolicitacaoEscala,
  formatStatusEscala,
  formatReembolsoStatus,
  formatarDataBR,
  formatarPeriodoDataBR,
} from '../../src/utils/messageFormatter';

describe('MessageFormatter - Testes Subcutâneos de Formatação e Textos', () => {
  it('deve mapear corretamente os tipos de solicitação de escala com seus emojis e rótulos amigáveis', () => {
    // Setup & Action
    const troca = formatTipoSolicitacaoEscala('troca');
    const folga = formatTipoSolicitacaoEscala('folga');
    const ferias = formatTipoSolicitacaoEscala('ferias');
    const balcao = formatTipoSolicitacaoEscala('atendimento_balcao');
    const fallback = formatTipoSolicitacaoEscala('desconhecido');

    // Assert
    expect(troca.label).toBe('Troca de Turno');
    expect(troca.emoji).toBe('🔄');

    expect(folga.label).toBe('Folga Semanal');
    expect(folga.emoji).toBe('📅');

    expect(ferias.label).toBe('Período de Férias');
    expect(ferias.emoji).toBe('🏖️');

    expect(balcao.label).toBe('Atendimento no Balcão');
    expect(balcao.emoji).toBe('🤝');

    expect(fallback.label).toBe('Solicitação de Escala');
    expect(fallback.emoji).toBe('📋');
  });

  it('deve retornar classes de cores e rótulos para cada status de escala', () => {
    // Setup & Action
    const aprovado = formatStatusEscala('aprovado');
    const recusado = formatStatusEscala('recusado');
    const pendenteAdmin = formatStatusEscala('pendente_admin');
    const emAnalise = formatStatusEscala('outro_status');

    // Assert
    expect(aprovado.label).toBe('Aprovada');
    expect(aprovado.badgeClass).toContain('emerald');

    expect(recusado.label).toBe('Recusada');
    expect(recusado.badgeClass).toContain('rose');

    expect(pendenteAdmin.label).toBe('Aguardando Gestão');
    expect(pendenteAdmin.badgeClass).toContain('amber');

    expect(emAnalise.label).toBe('Em Análise');
    expect(emAnalise.badgeClass).toContain('indigo');
  });

  it('deve traduzir status técnicos de reembolso para linguagem acessível em português', () => {
    // Setup & Action & Assert
    expect(formatReembolsoStatus('solicitado')).toBe('Solicitado / Em Análise');
    expect(formatReembolsoStatus('solicitado_fornecedor')).toBe('Aguardando Resposta do Fornecedor');
    expect(formatReembolsoStatus('aprovado')).toBe('Aprovado pelo Financeiro');
    expect(formatReembolsoStatus('pago')).toBe('Reembolso Concluído (Pago)');
    expect(formatReembolsoStatus('recusado')).toBe('Solicitação Indeferida');
    expect(formatReembolsoStatus('em_auditoria')).toBe('em_auditoria');
  });

  it('deve formatar datas ISO, YYYY-MM-DD e timestamps para padrão brasileiro DD/MM/AAAA', () => {
    // Setup & Action & Assert
    expect(formatarDataBR('2026-12-25')).toBe('25/12/2026');
    expect(formatarDataBR('2026-07-04 14:30')).toBe('04/07/2026 às 14:30');
    expect(formatarDataBR('15/09/2026')).toBe('15/09/2026'); // Preserva se já estiver formatado
    expect(formatarDataBR('')).toBe('');
    expect(formatarDataBR(null)).toBe('');
  });

  it('deve formatar períodos de viagem considerando dias únicos ou intervalos distintos', () => {
    // Setup & Action & Assert
    // Mesmo dia (bate-volta ou evento único)
    expect(formatarPeriodoDataBR('2026-10-15', '2026-10-15')).toBe('15/10/2026');
    // Intervalo de datas
    expect(formatarPeriodoDataBR('2026-10-15', '2026-10-25')).toBe('15/10/2026 a 25/10/2026');
    // Apenas data de início fornecida
    expect(formatarPeriodoDataBR('2026-11-01')).toBe('01/11/2026');
  });
});
