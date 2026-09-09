import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  obterProgressoNivel,
  registrarXp,
  obterMedalhasUsuario,
  concederMedalha,
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
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

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

    vi.mocked(supabase.from)
      .mockReturnValueOnce({ insert: insertSucesso } as any)
      .mockReturnValueOnce({ insert: insertDuplicado } as any);

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
    vi.mocked(supabase.from).mockReturnValue({ insert: insertDuplicado } as any);

    // Action & Assert
    await expect(registrarXp('user-1', 'acao_ja_pontuada', 25)).resolves.not.toThrow();
    expect(supabase.from).toHaveBeenCalledWith('profiles_xp_logs');
  });
});
