import { describe, it, expect } from 'vitest';
import { SatisfacaoService, FeedbackNpsItem } from '../../src/services/satisfacaoService';
import { PerfilConsultor } from '../../src/types';

describe('SatisfacaoService - Testes Subcutâneos', () => {
  // Setup
  const feedbacksMock: FeedbackNpsItem[] = [
    {
      id: 'fb-1',
      viagem_id: 'via-1',
      cliente_id: 'cli-1',
      consultor_id: 'cons-1',
      nps_rating: 10,
      comentarios: 'Viagem dos sonhos, atendimento impecável!',
      created_at: '2026-10-15T14:00:00Z',
      cliente: { nome: 'Carlos Silva', telefone: '11999990001' },
      viagem: { destino: 'Paris / França', consultor_id: 'cons-1' },
      consultor: { nome: 'Amanda Consultora' }
    },
    {
      id: 'fb-2',
      viagem_id: 'via-2',
      cliente_id: 'cli-2',
      consultor_id: 'cons-1',
      nps_rating: 9,
      comentarios: 'Tudo perfeito no hotel.',
      created_at: '2026-10-16T10:00:00Z',
      cliente: { nome: 'Juliana Costa', telefone: '11999990002' },
      viagem: { destino: 'Lisboa / Portugal', consultor_id: 'cons-1' },
      consultor: { nome: 'Amanda Consultora' }
    },
    {
      id: 'fb-3',
      viagem_id: 'via-3',
      cliente_id: 'cli-3',
      consultor_id: 'cons-2',
      nps_rating: 7,
      comentarios: '',
      created_at: '2026-10-18T18:00:00Z',
      cliente: { nome: 'Roberto Dias', telefone: '21988880003' },
      viagem: { destino: 'Gramado - RS', consultor_id: 'cons-2' },
      consultor: { nome: 'Bruno Costa' }
    },
    {
      id: 'fb-4',
      viagem_id: 'via-4',
      cliente_id: 'cli-4',
      consultor_id: 'cons-2',
      nps_rating: 4,
      comentarios: 'Tivemos atraso no transfer.',
      created_at: '2026-10-20T09:00:00Z',
      cliente: { nome: 'Lucas Mendes', telefone: '31977770004' },
      viagem: { destino: 'Maceió / AL', consultor_id: 'cons-2' },
      consultor: { nome: 'Bruno Costa' }
    }
  ];

  const consultoresMock: PerfilConsultor[] = [
    { id: 'cons-1', nome: 'Amanda Consultora', email: 'amanda@paxflow.com', role: 'consultor', ativo: true },
    { id: 'cons-2', nome: 'Bruno Costa', email: 'bruno@paxflow.com', role: 'consultor', ativo: true }
  ];

  it('deve classificar notas nas categorias oficiais do Net Promoter Score (Promotores, Neutros, Detratores)', () => {
    // Action
    const p10 = SatisfacaoService.classificarNps(10);
    const p9 = SatisfacaoService.classificarNps(9);
    const n8 = SatisfacaoService.classificarNps(8);
    const n7 = SatisfacaoService.classificarNps(7);
    const d6 = SatisfacaoService.classificarNps(6);
    const d0 = SatisfacaoService.classificarNps(0);

    // Assert
    expect(p10.categoria).toBe('promotor');
    expect(p9.categoria).toBe('promotor');
    expect(n8.categoria).toBe('neutro');
    expect(n7.categoria).toBe('neutro');
    expect(d6.categoria).toBe('detrator');
    expect(d0.categoria).toBe('detrator');
  });

  it('deve calcular métricas globais, percentuais, média e pontuação oficial do NPS', () => {
    // Action: 2 promotores (50%), 1 neutro (25%), 1 detrator (25%) => NPS Score = 50 - 25 = 25
    const metricas = SatisfacaoService.calcularMetricas(feedbacksMock);

    // Assert
    expect(metricas.total).toBe(4);
    expect(metricas.promotores).toBe(2);
    expect(metricas.neutros).toBe(1);
    expect(metricas.detratores).toBe(1);
    expect(metricas.percPromotores).toBe(50);
    expect(metricas.percNeutros).toBe(25);
    expect(metricas.percDetratores).toBe(25);
    expect(metricas.npsScore).toBe(25);
    expect(metricas.zona).toBe('aperfeicoamento');
    expect(metricas.mediaNota).toBe(7.5); // (10 + 9 + 7 + 4) / 4 = 30 / 4 = 7.5
    expect(metricas.totalComComentarios).toBe(3);
  });

  it('deve filtrar feedbacks por categoria e busca textual', () => {
    // Action: apenas promotores
    const promotores = SatisfacaoService.filtrarFeedbacks(feedbacksMock, { categoria: 'promotores' });
    expect(promotores).toHaveLength(2);
    expect(promotores.every(f => f.nps_rating >= 9)).toBe(true);

    // Action: apenas com depoimento/comentário
    const comDepoimento = SatisfacaoService.filtrarFeedbacks(feedbacksMock, { categoria: 'com_comentario' });
    expect(comDepoimento).toHaveLength(3);

    // Action: busca textual por destino "paris"
    const buscaDestino = SatisfacaoService.filtrarFeedbacks(feedbacksMock, { buscaTexto: 'paris' });
    expect(buscaDestino).toHaveLength(1);
    expect(buscaDestino[0].cliente?.nome).toBe('Carlos Silva');
  });

  it('deve agrupar métricas e gerar ranking de satisfação por consultor ordenado', () => {
    // Action
    const ranking = SatisfacaoService.calcularPorConsultor(feedbacksMock, consultoresMock);

    // Assert: Amanda tem 2 notas (10 e 9) => Score = 100. Bruno tem 7 e 4 => Score = -50
    expect(ranking).toHaveLength(2);
    expect(ranking[0].consultorNome).toBe('Amanda Consultora');
    expect(ranking[0].npsScore).toBe(100);
    expect(ranking[0].mediaNota).toBe(9.5);

    expect(ranking[1].consultorNome).toBe('Bruno Costa');
    expect(ranking[1].npsScore).toBe(-50);
    expect(ranking[1].mediaNota).toBe(5.5);
  });
});
