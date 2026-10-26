import { describe, it, expect } from 'vitest';
import { renderReembolsosTabHTML } from '../../src/components/dashboard/DashboardTemplates';
import { prepareReembolsoStatusPayload } from '../../src/controllers/reembolsosController';

describe('Reembolso Detalhe da Viagem - Testes Subcutâneos', () => {
  it('deve gerar botões de nova solicitação tanto no topo quanto no estado vazio quando não há reembolsos', () => {
    // Setup
    const reembolsosVazios: any[] = [];

    // Action
    const html = renderReembolsosTabHTML(reembolsosVazios);

    // Assert
    expect(html).toContain('id="btn-novo-reembolso-tab"');
    expect(html).toContain('id="btn-novo-reembolso-empty"');
    expect(html).toContain('Nenhum processo de reembolso registrado para esta viagem.');
  });

  it('deve renderizar o atributo data-action-edit-reembolso com o id correto e botão de tratativa quando há reembolsos', () => {
    // Setup
    const mockReembolsos = [
      {
        id: 'rmb-abc-123',
        codigo_ref: '#RMB-ABC123',
        status_tratativa: 'pendente_fornecedor',
        status: 'solicitado',
        valor_produto: 2500,
        valor_solicitado: 2500,
        valor_aprovado: 2000,
        valor_utilizado_pax: 500,
        forma_devolucao: 'Pix / Transferência Bancária',
        motivo_cancelamento: 'Cancelamento por motivos de saúde'
      }
    ];

    // Action
    const html = renderReembolsosTabHTML(mockReembolsos);

    // Assert
    expect(html).toContain('data-action-edit-reembolso="rmb-abc-123"');
    expect(html).toContain('✏️ Atualizar Tratativa');
    expect(html).toContain('id="btn-novo-reembolso-tab"');
    expect(html).not.toContain('id="btn-novo-reembolso-empty"');
  });

  it('deve gerar botões de tratativa independentes para múltiplos reembolsos da mesma viagem', () => {
    // Setup
    const mockReembolsos = [
      {
        id: 'rmb-1',
        codigo_ref: '#RMB-001',
        status_tratativa: 'pendente_agencia',
        valor_solicitado: 1000
      },
      {
        id: 'rmb-2',
        codigo_ref: '#RMB-002',
        status_tratativa: 'concluido',
        valor_solicitado: 1500
      }
    ];

    // Action
    const html = renderReembolsosTabHTML(mockReembolsos);

    // Assert
    expect(html).toContain('data-action-edit-reembolso="rmb-1"');
    expect(html).toContain('data-action-edit-reembolso="rmb-2"');
    const matches = html.match(/data-action-edit-reembolso=/g);
    expect(matches).toHaveLength(2);
  });

  it('deve formatar corretamente payload de atualização de status e tratativa sem quebrar', () => {
    // Setup
    const statusTratativa = 'pendente_agaxtur';

    // Action
    const payload = prepareReembolsoStatusPayload(statusTratativa);

    // Assert
    expect(payload.status_tratativa).toBe('pendente_agaxtur');
    expect(payload.status).toBe('solicitado');
    expect(payload.data_resolucao).toBeNull();
  });

  it('deve preencher data de resolução ao concluir tratativa de reembolso', () => {
    // Setup
    const statusTratativa = 'concluido';

    // Action
    const payload = prepareReembolsoStatusPayload(statusTratativa);

    // Assert
    expect(payload.status_tratativa).toBe('concluido');
    expect(payload.status).toBe('pago');
    expect(payload.data_resolucao).toBeDefined();
    expect(typeof payload.data_resolucao).toBe('string');
  });
});
