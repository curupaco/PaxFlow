import { describe, it, expect, beforeEach } from 'vitest';
import {
  isUserTsCosta,
  isNextTripEnabled,
  isRiskScoreEnabled,
  isUpsellEnabled,
  isStudioEnabled,
} from '../../src/utils/featureFlags';

describe('FeatureFlags - Testes Subcutâneos de Permissão e Acesso', () => {
  beforeEach(() => {
    delete (globalThis as any).window;
  });

  it('deve identificar o usuário tscosta via e-mail do usuário autenticado', () => {
    // Setup
    const userMock = { id: 'u1', email: 'tscosta@gmail.com' };
    const perfilMock = { id: 'u1', nome: 'Thiago Costa' } as any;

    // Action
    const resultado = isUserTsCosta(userMock, perfilMock);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve identificar o usuário tscosta via e-mail ou nome cadastrado no perfil', () => {
    // Setup
    const userSemEmail = { id: 'u2' };
    const perfilComEmail = { id: 'u2', email: 'tscosta.adm@paxflow.com', nome: 'Thiago' } as any;

    // Action
    const resultado = isUserTsCosta(userSemEmail, perfilComEmail);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve identificar o usuário tscosta via metadados de autenticação (user_metadata)', () => {
    // Setup
    const userComMetadata = {
      id: 'u3',
      user_metadata: { full_name: 'Thiago tscosta da Silva' },
    };

    // Action
    const resultado = isUserTsCosta(userComMetadata, null);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve liberar acesso a todos os recursos se o modo Sandbox estiver ativo', () => {
    // Setup
    (globalThis as any).window = { paxflowSandbox: true };
    const usuarioQualquer = { id: 'visitante-1', email: 'teste@visitante.com' };

    // Action
    const resultado = isUserTsCosta(usuarioQualquer, null);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve retornar falso para usuários comuns que não sejam tscosta', () => {
    // Setup
    const usuarioComum = { id: 'u-consultor', email: 'marinna@agaxtur.com.br' };
    const perfilComum = { id: 'u-consultor', nome: 'Marinna Cardoso', email: 'marinna@agaxtur.com.br' } as any;

    // Action
    const resultado = isUserTsCosta(usuarioComum, perfilComum);

    // Assert
    expect(resultado).toBe(false);
  });

  it('deve manter o Next Trip Engine sempre habilitado para tscosta mesmo se desativado nas settings', () => {
    // Setup
    const tscostaUser = { id: 'u1', email: 'tscosta@gmail.com' };
    const settingsDesativadas = { habilitar_next_trip_engine: false };

    // Action
    const resultado = isNextTripEnabled(tscostaUser, null, settingsDesativadas);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve respeitar a desativação do Next Trip Engine nas configurações para consultores comuns', () => {
    // Setup
    const consultorUser = { id: 'c1', email: 'consultor@agencia.com' };
    const settingsDesativadas = { habilitar_next_trip_engine: false };
    const settingsAtivadas = { habilitar_next_trip_engine: true };

    // Action
    const resDesativado = isNextTripEnabled(consultorUser, null, settingsDesativadas);
    const resAtivado = isNextTripEnabled(consultorUser, null, settingsAtivadas);

    // Assert
    expect(resDesativado).toBe(false);
    expect(resAtivado).toBe(true);
  });

  it('deve manter o Risk Score sempre habilitado para tscosta mesmo se desativado nas settings', () => {
    // Setup
    const tscostaUser = { id: 'u1', email: 'tscosta@gmail.com' };
    const settingsDesativadas = { habilitar_risk_score: false };

    // Action
    const resultado = isRiskScoreEnabled(tscostaUser, null, settingsDesativadas);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve respeitar a desativação do Risk Score nas configurações para consultores comuns', () => {
    // Setup
    const consultorUser = { id: 'c1', email: 'consultor@agencia.com' };
    const settingsDesativadas = { habilitar_risk_score: false };

    // Action
    const resultado = isRiskScoreEnabled(consultorUser, null, settingsDesativadas);

    // Assert
    expect(resultado).toBe(false);
  });

  it('deve manter o Upsell Engine sempre habilitado para tscosta mesmo se desativado nas settings', () => {
    // Setup
    const tscostaUser = { id: 'u1', email: 'tscosta@gmail.com' };
    const settingsDesativadas = { habilitar_upsell_preditivo: false };

    // Action
    const resultado = isUpsellEnabled(tscostaUser, null, settingsDesativadas);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve respeitar a desativação do Upsell Engine nas configurações para consultores comuns', () => {
    // Setup
    const consultorUser = { id: 'c1', email: 'consultor@agencia.com' };
    const settingsDesativadas = { habilitar_upsell_preditivo: false };

    // Action
    const resultado = isUpsellEnabled(consultorUser, null, settingsDesativadas);

    // Assert
    expect(resultado).toBe(false);
  });

  it('deve manter o PaxFlow Studio sempre habilitado para tscosta mesmo se desativado nas settings', () => {
    // Setup
    const tscostaUser = { id: 'u1', email: 'tscosta@gmail.com' };
    const settingsDesativadas = { habilitar_studio_pro: false };

    // Action
    const resultado = isStudioEnabled(tscostaUser, null, settingsDesativadas);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve respeitar a desativação do PaxFlow Studio nas configurações para consultores comuns', () => {
    // Setup
    const consultorUser = { id: 'c1', email: 'consultor@agencia.com' };
    const settingsDesativadas = { habilitar_studio_pro: false };
    const settingsAtivadas = { habilitar_studio_pro: true };

    // Action
    const resDesativado = isStudioEnabled(consultorUser, null, settingsDesativadas);
    const resAtivado = isStudioEnabled(consultorUser, null, settingsAtivadas);

    // Assert
    expect(resDesativado).toBe(false);
    expect(resAtivado).toBe(true);
  });

  it('deve manter o Studio habilitado por padrão caso a coluna ainda não exista nas settings', () => {
    // Setup
    const consultorUser = { id: 'c1', email: 'consultor@agencia.com' };
    const settingsVazias = {};

    // Action
    const resultado = isStudioEnabled(consultorUser, null, settingsVazias);

    // Assert
    expect(resultado).toBe(true);
  });
});
