import { describe, it, expect } from 'vitest';
import {
  agruparOrcamentosKanban,
  calcularMetricasPipeline,
  calcularLeadAgingInfo,
  validarPassoWizardConversao
} from '../../src/controllers/orcamentosController';

describe('OrcamentosController - Lógica Subcutânea de Pipeline e Kanban', () => {
  const listaOrcamentos: any[] = [
    { id: 'o1', status: 'SOLICITADO', valorProposta: 10000, temperatura: 'QUENTE' },
    { id: 'o2', status: 'EM_ANDAMENTO', valorProposta: 20000, temperatura: 'QUENTE' },
    { id: 'o3', status: 'AGUARDANDO', valorProposta: 15000, temperatura: 'MORNO' },
    { id: 'o4', status: 'CONCLUIDO', valorProposta: 30000, temperatura: 'FRIO' },
    { id: 'o5', status: 'PERDIDO', valorProposta: 5000, temperatura: 'FRIO' },
    { id: 'o6', status: 'STATUS_DESCONHECIDO', valorProposta: 0, temperatura: '' },
  ];

  it('deve agrupar corretamente os orçamentos nas colunas do Kanban com fallback seguro', () => {
    // Setup - lista padrão de orçamentos com status mistos
    // Action
    const kanban = agruparOrcamentosKanban(listaOrcamentos);

    // Assert
    expect(kanban.SOLICITADO).toHaveLength(2); // o1 + o6 (fallback)
    expect(kanban.EM_ANDAMENTO).toHaveLength(1);
    expect(kanban.AGUARDANDO).toHaveLength(1);
    expect(kanban.CONCLUIDO).toHaveLength(1);
    expect(kanban.PERDIDO).toHaveLength(1);
  });

  it('deve calcular métricas de pipeline, ticket médio e distribuição térmica com precisão', () => {
    // Setup - lista padrão de orçamentos
    // Action
    const metricas = calcularMetricasPipeline(listaOrcamentos);

    // Assert
    expect(metricas.totalOrcamentos).toBe(6);
    expect(metricas.valorTotalPipeline).toBe(80000); // 10k + 20k + 15k + 30k + 5k
    expect(metricas.ticketMedio).toBe(16000); // 80000 / 5
    expect(metricas.quentes).toBe(2);
    expect(metricas.mornos).toBe(1);
    expect(metricas.frios).toBe(2);
  });

  it('deve lidar com valores zero, nulos ou negativos sem poluir o cálculo de ticket médio', () => {
    // Setup - orçamentos com valores nulos, negativos ou zerados
    const orcamentosAtipicos: any[] = [
      { id: 'a1', status: 'SOLICITADO', valorProposta: 0, temperatura: 'QUENTE' },
      { id: 'a2', status: 'EM_ANDAMENTO', valorProposta: null, valorViagem: 12000, temperatura: 'MORNO' },
      { id: 'a3', status: 'AGUARDANDO', valorProposta: -500, temperatura: 'FRIO' },
      { id: 'a4', status: 'CONCLUIDO', valorProposta: 8000, temperatura: 'QUENTE' },
    ];

    // Action
    const metricas = calcularMetricasPipeline(orcamentosAtipicos);

    // Assert
    expect(metricas.totalOrcamentos).toBe(4);
    expect(metricas.valorTotalPipeline).toBe(20000); // 12000 (de valorViagem) + 8000 (de valorProposta)
    expect(metricas.ticketMedio).toBe(10000); // 20000 / 2 orçamentos válidos
    expect(metricas.quentes).toBe(2);
    expect(metricas.mornos).toBe(1);
    expect(metricas.frios).toBe(1);
  });

  it('deve retornar métricas zeradas com segurança para lista vazia de orçamentos', () => {
    // Setup
    const orcamentosVazios: any[] = [];

    // Action
    const metricas = calcularMetricasPipeline(orcamentosVazios);

    // Assert
    expect(metricas.totalOrcamentos).toBe(0);
    expect(metricas.valorTotalPipeline).toBe(0);
    expect(metricas.ticketMedio).toBe(0);
    expect(metricas.quentes).toBe(0);
    expect(metricas.mornos).toBe(0);
    expect(metricas.frios).toBe(0);
  });

  it('deve agrupar no Kanban com fallback seguro para status nulos, vazios ou indefinidos', () => {
    // Setup - orçamentos sem o campo status preenchido
    const semStatus: any[] = [
      { id: 's1', status: null },
      { id: 's2', status: undefined },
      { id: 's3', status: '' },
      { id: 's4', status: 'em_andamento' }, // minúsculo
    ];

    // Action
    const kanban = agruparOrcamentosKanban(semStatus);

    // Assert
    expect(kanban.SOLICITADO).toHaveLength(3); // s1, s2, s3 caem em SOLICITADO
    expect(kanban.EM_ANDAMENTO).toHaveLength(1); // s4 normalizado para maiúsculo
  });

  it('deve calcular corretamente os níveis e badges de Lead Aging para datas recentes, moderadas e críticas', () => {
    // Setup
    const hoje = new Date().toISOString();
    const ha3Dias = new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString();
    const ha7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const dataInvalida = 'data-invalida';

    // Action
    const infoHoje = calcularLeadAgingInfo(hoje);
    const infoModerado = calcularLeadAgingInfo(ha3Dias);
    const infoCritico = calcularLeadAgingInfo(ha7Dias);
    const infoInvalida = calcularLeadAgingInfo(dataInvalida);
    const infoVazia = calcularLeadAgingInfo(undefined);

    // Assert
    expect(infoHoje.nivel).toBe('recente');
    expect(infoHoje.badgeHtml).toContain('🟢');
    expect(infoHoje.badgeHtml).toContain('Hoje');

    expect(infoModerado.nivel).toBe('moderado');
    expect(infoModerado.dias).toBe(3);
    expect(infoModerado.badgeHtml).toContain('🟡');

    expect(infoCritico.nivel).toBe('critico');
    expect(infoCritico.dias).toBe(7);
    expect(infoCritico.badgeHtml).toContain('🔴');

    expect(infoInvalida.nivel).toBe('recente');
    expect(infoInvalida.badgeHtml).toBe('');

    expect(infoVazia.nivel).toBe('recente');
    expect(infoVazia.badgeHtml).toBe('');
  });

  it('deve reiniciar o Lead Aging para 🟢 Hoje ao retornar orçamento de EM_ANDAMENTO para SOLICITADO', () => {
    // Setup - Orçamento antigo com 10 dias em andamento
    const orcamentoAntigo = {
      id: 'orc-100',
      status: 'EM_ANDAMENTO',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    };
    const agingAntes = calcularLeadAgingInfo(orcamentoAntigo.updatedAt);
    expect(agingAntes.dias).toBe(10);
    expect(agingAntes.nivel).toBe('critico');

    // Action - Retorno para SOLICITADO reinicia o timestamp updatedAt para now
    const orcamentoRetornado = {
      ...orcamentoAntigo,
      status: 'SOLICITADO',
      updatedAt: new Date().toISOString()
    };
    const agingDepois = calcularLeadAgingInfo(orcamentoRetornado.updatedAt);

    // Assert
    expect(agingDepois.dias).toBe(0);
    expect(agingDepois.nivel).toBe('recente');
    expect(agingDepois.badgeHtml).toContain('🟢');
    expect(agingDepois.badgeHtml).toContain('Hoje');
  });

  it('deve validar com precisão os dados do Passo 1 (Passageiro) do Mini-Wizard', () => {
    // Setup - dados válidos e inválidos
    const valido = {
      nomeCliente: 'Lucas Ferreira',
      email: 'lucas@email.com',
      telefone: '11999998888',
      documento: '12345678901',
      dataNascimento: '1995-03-20'
    };
    const semEmail = {
      nomeCliente: 'Lucas Ferreira',
      email: '',
      telefone: '11999998888',
      documento: '12345678901',
      dataNascimento: '1995-03-20'
    };
    const cpfSemNasc = {
      nomeCliente: 'Lucas Ferreira',
      email: 'lucas@email.com',
      telefone: '11999998888',
      documento: '12345678901',
      dataNascimento: ''
    };

    // Action & Assert
    expect(validarPassoWizardConversao(1, valido).valido).toBe(true);
    expect(validarPassoWizardConversao(1, semEmail).valido).toBe(false);
    expect(validarPassoWizardConversao(1, semEmail).erros).toContain('E-mail de Contato inválido ou ausente.');
    expect(validarPassoWizardConversao(1, cpfSemNasc).valido).toBe(false);
    expect(validarPassoWizardConversao(1, cpfSemNasc).erros).toContain('Data de Nascimento é obrigatória para Pessoa Física (CPF).');
  });

  it('deve validar com precisão os dados do Passo 2 (Roteiro & Finanças) do Mini-Wizard', () => {
    // Setup - dados de nova viagem e viagem existente
    const novaViagemValida = {
      destino: 'Cancún All Inclusive',
      dataIda: '2026-11-10',
      valor: '15.000,00'
    };
    const novaViagemSemDestino = {
      destino: '',
      dataIda: '2026-11-10',
      valor: 15000
    };
    const existenteValida = {
      isViagemExistente: true,
      viagemExistenteId: 'via-123'
    };
    const existenteSemId = {
      isViagemExistente: true,
      viagemExistenteId: ''
    };

    // Action & Assert
    expect(validarPassoWizardConversao(2, novaViagemValida).valido).toBe(true);
    expect(validarPassoWizardConversao(2, novaViagemSemDestino).valido).toBe(false);
    expect(validarPassoWizardConversao(2, novaViagemSemDestino).erros).toContain('Destino da viagem é obrigatório.');
    expect(validarPassoWizardConversao(2, existenteValida).valido).toBe(true);
    expect(validarPassoWizardConversao(2, existenteSemId).valido).toBe(false);
  });
});


