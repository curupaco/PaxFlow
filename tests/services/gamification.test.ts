import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  obterProgressoNivel,
  registrarXp,
  obterMedalhasUsuario,
  concederMedalha,
  registrarCelebracaoConquista,
  obterCelebracoesPendentes,
  marcarCelebracaoVisualizada,
} from '../../src/services/gamification';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => {
  const fromMock = vi.fn();
  return {
    supabase: {
      from: fromMock,
    },
    getSessaoAtual: vi.fn().mockResolvedValue({ user: { id: 'user-auth-1' } }),
  };
});

describe('Gamificação - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve calcular nível inicial e patente Mochileiro para pontuações baixas', () => {
    // Setup
    const xp = 100;

    // Action
    const progresso = obterProgressoNivel(xp);

    // Assert
    expect(progresso.nivel).toBe(1);
    expect(progresso.patente).toBe('Mochileiro');
    expect(progresso.patenteEmoji).toBe('🎒');
    expect(progresso.xpAtual).toBe(100);
    expect(progresso.xpProximoNivel).toBe(250);
    expect(progresso.percent).toBe(40);
  });

  it('deve calcular níveis avançados e patentes superiores progressivamente', () => {
    // Setup
    const xpExplorador = 2600; // Nível 5
    const xpEmbaixador = 25000; // Nível >= 20

    // Action
    const progressoExplorador = obterProgressoNivel(xpExplorador);
    const progressoEmbaixador = obterProgressoNivel(xpEmbaixador);

    // Assert
    expect(progressoExplorador.nivel).toBe(5);
    expect(progressoExplorador.patente).toBe('Explorador');
    expect(progressoExplorador.patenteEmoji).toBe('🗺️');

    expect(progressoEmbaixador.nivel).toBeGreaterThanOrEqual(20);
    expect(progressoEmbaixador.patente).toBe('Embaixador do Turismo');
    expect(progressoEmbaixador.patenteEmoji).toBe('👑');
  });

  it('deve registrar evento de XP inserindo na tabela profiles_xp_logs', async () => {
    // Setup
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { participa_metricas: true }, error: null })
            })
          })
        } as any;
      }
      return { insert: insertMock } as any;
    });

    // Action
    await registrarXp('user-auth-1', 'acao_venda_123', 50);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('profiles_xp_logs');
    expect(insertMock).toHaveBeenCalledWith({
      profile_id: 'user-auth-1',
      acao_chave: 'acao_venda_123',
      xp_ganho: 50,
    });
  });

  it('deve listar medalhas conquistadas pelo usuário da tabela profiles_badges', async () => {
    // Setup
    const badgesMock = [
      { badge_key: 'SLA_CHAMP' },
      { badge_key: 'DRIVE_MASTER' },
    ];
    const eqMock = vi.fn().mockResolvedValue({ data: badgesMock, error: null });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    // Action
    const medalhas = await obterMedalhasUsuario('user-1');

    // Assert
    expect(medalhas).toEqual(['SLA_CHAMP', 'DRIVE_MASTER']);
    expect(supabase.from).toHaveBeenCalledWith('profiles_badges');
    expect(eqMock).toHaveBeenCalledWith('profile_id', 'user-1');
  });

  it('deve conceder medalha ao usuário ou retornar falso se já conquistada', async () => {
    // Setup
    const insertSucesso = vi.fn().mockResolvedValue({ error: null });
    const insertDuplicado = vi.fn().mockResolvedValue({ error: { code: '23505' } });

    let insertCallCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { participa_metricas: true }, error: null })
            })
          })
        } as any;
      }
      insertCallCount++;
      return {
        insert: insertCallCount === 1 ? insertSucesso : insertDuplicado
      } as any;
    });

    // Action
    const resultadoNovo = await concederMedalha('user-1', 'COMPLIANCE_HERO');
    const resultadoDuplicado = await concederMedalha('user-1', 'COMPLIANCE_HERO');

    // Assert
    expect(resultadoNovo).toBe(true);
    expect(resultadoDuplicado).toBe(false);
  });

  it('deve calcular corretamente todas as fronteiras e limites matemáticos de nível', () => {
    // Setup & Action
    const p249 = obterProgressoNivel(249); // Limite superior Nível 1
    const p250 = obterProgressoNivel(250); // Início Nível 2
    const p749 = obterProgressoNivel(749); // Fim Nível 2
    const p750 = obterProgressoNivel(750); // Início Nível 3
    const p1499 = obterProgressoNivel(1499); // Fim Nível 3
    const p1500 = obterProgressoNivel(1500); // Início Nível 4
    const p2499 = obterProgressoNivel(2499); // Fim Nível 4
    const p2500 = obterProgressoNivel(2500); // Início Nível 5
    const p3500 = obterProgressoNivel(3500); // Nível 6 (+1000 XP)

    // Assert
    expect(p249.nivel).toBe(1);
    expect(p249.xpAtual).toBe(249);
    expect(p249.xpProximoNivel).toBe(250);

    expect(p250.nivel).toBe(2);
    expect(p250.xpAtual).toBe(0);
    expect(p250.xpProximoNivel).toBe(500);

    expect(p749.nivel).toBe(2);
    expect(p750.nivel).toBe(3);
    expect(p750.xpAtual).toBe(0);
    expect(p750.xpProximoNivel).toBe(750);

    expect(p1499.nivel).toBe(3);
    expect(p1500.nivel).toBe(4);
    expect(p1500.xpAtual).toBe(0);
    expect(p1500.xpProximoNivel).toBe(1000);

    expect(p2499.nivel).toBe(4);
    expect(p2500.nivel).toBe(5);
    expect(p2500.xpAtual).toBe(0);

    expect(p3500.nivel).toBe(6);
    expect(p3500.xpAtual).toBe(0);
  });

  it('deve concluir silenciosamente sem travar fluxo quando o Supabase acusar ação de XP já pontuada (código 23505)', async () => {
    // Setup
    const insertDuplicado = vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { participa_metricas: true }, error: null })
            })
          })
        } as any;
      }
      return { insert: insertDuplicado } as any;
    });

    // Action & Assert
    await expect(registrarXp('user-1', 'acao_ja_pontuada', 25)).resolves.not.toThrow();
    expect(supabase.from).toHaveBeenCalledWith('profiles_xp_logs');
  });

  it('deve registrar celebração de conquista na tabela gamification_celebrations', async () => {
    // Setup
    const celebrationPayload = {
      profile_id: 'user-123',
      badge_key: 'FAST_SALE',
      badge_name: 'Venda Relâmpago',
      badge_emoji: '⚡',
      campaign_id: 'camp-1',
      campaign_titulo: 'Campanha Orçamentos Ágeis'
    };

    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'cel-1', ...celebrationPayload, created_at: new Date().toISOString() },
      error: null
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    // Action
    const resultado = await registrarCelebracaoConquista(celebrationPayload);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('gamification_celebrations');
    expect(resultado).toBeDefined();
    expect(resultado?.id).toBe('cel-1');
    expect(resultado?.badge_name).toBe('Venda Relâmpago');
  });

  it('deve demonstrar resiliência Zero-Break (erro 42P01 / 42703) ao registrar celebração sem travar', async () => {
    // Setup
    const singleMock = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation "gamification_celebrations" does not exist' }
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    // Action
    const resultado = await registrarCelebracaoConquista({
      profile_id: 'user-123',
      badge_key: 'FAST_SALE',
      badge_name: 'Venda Relâmpago',
      badge_emoji: '⚡',
      campaign_titulo: 'Campanha Orçamentos'
    });

    // Assert
    expect(resultado).toBeNull();
  });

  it('deve obter celebrações pendentes não visualizadas pelo usuário', async () => {
    // Setup
    const mockCelebrations = [
      {
        id: 'cel-1',
        profile_id: 'user-alvo',
        badge_key: 'FAST_SALE',
        badge_name: 'Venda Relâmpago',
        badge_emoji: '⚡',
        campaign_titulo: 'Campanha 40 Orçamentos',
        created_at: new Date().toISOString(),
        profiles: { nome_completo: 'Aline Consultora' }
      },
      {
        id: 'cel-2',
        profile_id: 'user-outro',
        badge_key: 'DRIVE_MASTER',
        badge_name: 'Organizador',
        badge_emoji: '📁',
        campaign_titulo: 'Campanha Docs',
        created_at: new Date().toISOString(),
        profiles: { nome_completo: 'Bruno Consultor' }
      }
    ];

    const mockViews = [
      { celebration_id: 'cel-1' } // Já visualizada
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'gamification_celebrations') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockCelebrations, error: null })
            })
          })
        } as any;
      }
      if (table === 'gamification_celebration_views') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockViews, error: null })
          })
        } as any;
      }
      return {} as any;
    });

    // Action
    const pendentes = await obterCelebracoesPendentes('user-current');

    // Assert
    expect(pendentes.length).toBe(1);
    expect(pendentes[0].id).toBe('cel-2');
    expect(pendentes[0].consultor_nome).toBe('Bruno Consultor');
  });

  it('deve marcar celebração como visualizada no Supabase e ser tolerante a erros 23505 e 42P01', async () => {
    // Setup
    const insertMock = vi.fn().mockResolvedValue({ error: { code: '23505' } });
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

    // Action & Assert
    await expect(marcarCelebracaoVisualizada('cel-1', 'user-1')).resolves.not.toThrow();
    expect(supabase.from).toHaveBeenCalledWith('gamification_celebration_views');
  });

  it('deve sincronizar retroativamente celebrações de medalhas existentes em campanhas ativas', async () => {
    // Setup
    const mockCampaigns = [
      {
        id: 'camp-1',
        titulo: 'Campanha 40 Orçamentos',
        badge_key: 'FAST_SALE',
        ativa: true,
        data_inicio: '2026-09-01',
        data_fim: '2026-09-30'
      }
    ];

    const mockBadges = [
      { profile_id: 'user-consultor-1', badge_key: 'FAST_SALE' }
    ];

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'cel-retro' }, error: null })
      })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ data: mockCampaigns, error: null })
              })
            })
          })
        } as any;
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'user-consultor-1', nome_completo: 'Consultor Teste', participa_metricas: true }],
              error: null
            })
          })
        } as any;
      }
      if (table === 'orcamentos') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ count: 40, error: null })
              })
            })
          })
        } as any;
      }
      if (table === 'profiles_badges') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockBadges, error: null })
          }),
          insert: vi.fn().mockResolvedValue({ error: null })
        } as any;
      }
      if (table === 'gamification_celebrations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }) // nenhuma ainda
          }),
          insert: insertMock
        } as any;
      }
      return {} as any;
    });

    // Action
    const { sincronizarCelebracoesCampanhasAtivas } = await import('../../src/services/gamification');
    await sincronizarCelebracoesCampanhasAtivas();

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('gamification_celebrations');
    expect(insertMock).toHaveBeenCalled();
  });
});
