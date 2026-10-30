import { describe, it, expect } from 'vitest';
import { LandingPage } from '../../src/pages/LandingPage';

describe('Subcutaneous: Landing Page - Apresentação Comercial Oficial', () => {
  it('deve conter o H1 e posicionamento oficial aprovado sem urgência ou venda agressiva', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert
    expect(html).toContain('A plataforma que cuida da sua agência');
    expect(html).toContain('da proposta ao pós-venda');
    expect(html).toContain('Gestão &amp; Blindagem Operacional para Agências de Turismo');
    expect(html).not.toContain('Últimas vagas');
    expect(html).not.toContain('compre agora');
  });

  it('deve contemplar os 5 pilares cronológicos com suas prévias de telas reais integradas', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert
    // 01. Studio
    expect(html).toContain('id="studio"');
    expect(html).toContain('PaxFlow Studio™');
    expect(html).toContain('Live Preview');

    // 02. Risk Score
    expect(html).toContain('id="risk-score"');
    expect(html).toContain('PaxFlow Risk Score™');
    expect(html).toContain('Onda 3 Ativa');

    // 03. Operação & Escala
    expect(html).toContain('id="operacao"');
    expect(html).toContain('PaxFlow Escalas &amp; Alertas Mobile');
    expect(html).toContain('Plantão Ativo');

    // 04. Financeiro & Reembolsos
    expect(html).toContain('id="financeiro"');
    expect(html).toContain('PaxFlow Financeiro &amp; Conciliação de Reembolsos');
    expect(html).toContain('Extrato Bancário Conciliado');

    // 05. Next Trip Engine
    expect(html).toContain('id="next-trip"');
    expect(html).toContain('Next Trip Engine™');
    expect(html).toContain('Radar Preditivo de Recompra');
  });

  it('deve exibir o fechamento comercial em dose dupla direta sem tabela de preços agressiva', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert
    expect(html).toContain('Quero testar com minhas próprias mãos');
    expect(html).toContain('Prefiro bater um papo no WhatsApp');
    expect(html).toContain('btn-cta-demo-final');
    expect(html).toContain('btn-cta-whatsapp-final');
    // Não deve conter valores fixos e planos de e-commerce (R$ 199 / R$ 799)
    expect(html).not.toContain('R$ 199');
    expect(html).not.toContain('R$ 799');
  });

  it('deve conter a seção reflexiva amigável contrastando com sistemas legados', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert
    expect(html).toContain('Por que o PaxFlow não se parece com os sistemas tradicionais?');
    expect(html).toContain('O jeito tradicional (com planilhas e sistemas engessados)');
    expect(html).toContain('O jeito PaxFlow (operando com inteligência e calma)');
  });
});
