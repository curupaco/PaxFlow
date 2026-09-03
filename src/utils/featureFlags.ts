import { PerfilConsultor } from '../types';

/**
 * Verifica se o usuário atual é o usuário tscosta (via email, nome ou metadata de login)
 */
export function isUserTsCosta(user: any, perfil?: PerfilConsultor | null): boolean {
  if (!user && !perfil) return false;

  const emailUser = (user?.email || '').toLowerCase();
  const emailPerfil = (perfil?.email || '').toLowerCase();
  const nomePerfil = (perfil?.nome || '').toLowerCase();
  const usernameMetadata = (user?.user_metadata?.username || user?.user_metadata?.nome || user?.user_metadata?.full_name || '').toLowerCase();
  const userId = (user?.id || '').toLowerCase();

  return (
    emailUser.includes('tscosta') ||
    emailPerfil.includes('tscosta') ||
    nomePerfil.includes('tscosta') ||
    usernameMetadata.includes('tscosta') ||
    userId.includes('tscosta')
  );
}

/**
 * Retorna se o Next Trip Engine está ativado para o usuário atual.
 * É SEMPRE true para tscosta; para os demais, depende de global_settings.
 */
export function isNextTripEnabled(user: any, perfil?: PerfilConsultor | null, settings?: any): boolean {
  if (isUserTsCosta(user, perfil)) return true;
  if (!settings) return true; // Valor padrão ativo se configurações ainda não carregaram
  return settings.habilitar_next_trip_engine !== false && settings.habilitarNextTripEngine !== false;
}

/**
 * Retorna se o Risk Score está ativado para o usuário atual.
 * É SEMPRE true para tscosta; para os demais, depende de global_settings.
 */
export function isRiskScoreEnabled(user: any, perfil?: PerfilConsultor | null, settings?: any): boolean {
  if (isUserTsCosta(user, perfil)) return true;
  if (!settings) return true;
  return settings.habilitar_risk_score !== false && settings.habilitarRiskScore !== false;
}

/**
 * Retorna se o Upsell Engine está ativado para o usuário atual.
 * É SEMPRE true para tscosta; para os demais, depende de global_settings.
 */
export function isUpsellEnabled(user: any, perfil?: PerfilConsultor | null, settings?: any): boolean {
  if (isUserTsCosta(user, perfil)) return true;
  if (!settings) return true;
  return settings.habilitar_upsell_preditivo !== false && settings.habilitarUpsellPreditivo !== false;
}
