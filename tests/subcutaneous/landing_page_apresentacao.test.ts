import { describe, it, expect } from 'vitest';
import { LandingPage } from '../../src/pages/LandingPage';

describe('Subcutaneous: Landing Page - Apresentação Comercial Oficial Completa', () => {
  it('deve conter o H1, posicionamento oficial e painel matinal das 08:00 AM', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert
    expect(html).toContain('A plataforma que cuida da sua agência');
    expect(html).toContain('da proposta ao pós-venda');
    expect(html).toContain('Gestão &amp; Blindagem Operacional para Agências de Turismo');
    expect(html).toContain('Rotina Matinal da Agência');
    expect(html).toContain('87/100 • Protegida');
    expect(html).not.toContain('Últimas vagas');
    expect(html).not.toContain('compre agora');
  });

  it('deve contemplar o tour interativo de telas reais com as 12 abas operacionais do sistema', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert - Abas e Painéis Reais
    expect(html).toContain('id="modulos"');
    expect(html).toContain('id="tab-btn-dashboard"');
    expect(html).toContain('id="panel-dashboard"');

    expect(html).toContain('id="tab-btn-risk"');
    expect(html).toContain('id="panel-risk"');
    expect(html).toContain('Risk Score™ (Onda 3)');

    expect(html).toContain('id="tab-btn-nexttrip"');
    expect(html).toContain('id="panel-nexttrip"');
    expect(html).toContain('Next Trip Engine™');

    expect(html).toContain('id="tab-btn-studio"');
    expect(html).toContain('id="panel-studio"');
    expect(html).toContain('PaxFlow Studio™');

    expect(html).toContain('id="tab-btn-financeiro"');
    expect(html).toContain('id="panel-financeiro"');
    expect(html).toContain('Financeiro &amp; Conciliação');

    expect(html).toContain('id="tab-btn-viagens"');
    expect(html).toContain('id="panel-viagens"');

    expect(html).toContain('id="tab-btn-orcamentos"');
    expect(html).toContain('id="panel-orcamentos"');

    expect(html).toContain('id="tab-btn-inbox"');
    expect(html).toContain('id="panel-inbox"');

    expect(html).toContain('id="tab-btn-escala"');
    expect(html).toContain('id="panel-escala"');

    expect(html).toContain('id="tab-btn-reembolsos"');
    expect(html).toContain('id="panel-reembolsos"');

    expect(html).toContain('id="tab-btn-relatorios"');
    expect(html).toContain('id="panel-relatorios"');

    expect(html).toContain('id="tab-btn-publicas"');
    expect(html).toContain('id="panel-publicas"');
  });

  it('deve conter as seções profundas dos motores: Studio, Risk Score Onda 3, Next Trip e Financeiro', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert
    expect(html).toContain('id="studio-section"');
    expect(html).toContain('Ingestão Inteligente de PDFs');

    expect(html).toContain('id="risk-score-section"');
    expect(html).toContain('Regras Sanitárias &amp; Vistos por País');
    expect(html).toContain('Ações em Lote em 1-Clique');

    expect(html).toContain('id="next-trip-section"');
    expect(html).toContain('Os 5 Vetores Transparentes');
    expect(html).toContain('Destinos Complementares');

    expect(html).toContain('id="financeiro-section"');
    expect(html).toContain('Extrato Bancário Inteligente (PDF/CSV)');
    expect(html).toContain('Fluxo de Caixa em Calendário');
  });

  it('deve conter o carrossel interativo de White-label com os 4 produtos reais da agência', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert
    expect(html).toContain('id="marcas"');
    expect(html).toContain('id="brand-tab-itinerario"');
    expect(html).toContain('id="brand-tab-voucher"');
    expect(html).toContain('id="brand-tab-nps"');
    expect(html).toContain('id="brand-tab-whatsapp"');
  });

  it('deve exibir o fechamento comercial em dose dupla direta sem tabelas de preços de e-commerce', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert
    expect(html).toContain('Quero testar com minhas próprias mãos');
    expect(html).toContain('Prefiro bater um papo no WhatsApp');
    expect(html).toContain('btn-cta-demo-final');
    expect(html).toContain('btn-cta-whatsapp-final');
    expect(html).not.toContain('R$ 199');
    expect(html).not.toContain('R$ 799');
  });

  it('deve exibir o logo de bússola grande e não conter menções a 24/7 ou 24x7', () => {
    // Setup & Action
    const html = LandingPage.renderHtml();

    // Assert
    // Logo imponente em formato de bússola com rotação suave e detalhes decorativos
    expect(html).toContain('w-56 h-56 md:w-72 md:h-72 pf-float');
    expect(html).toContain('pf-spin-slow');
    expect(html).toContain('✈️');

    // NUNCA conter menção a 24/7 ou 24x7
    expect(html).not.toContain('24/7');
    expect(html).not.toContain('24x7');

    // Botões de acionamento do Modo Demonstração
    expect(html).toContain('id="btn-iniciar-demo"');
    expect(html).toContain('id="btn-menu-demo"');
    expect(html).toContain('id="btn-cta-demo-final"');
    expect(html).toContain('id="btn-footer-demo"');
  });
});
