import { createClient } from '@supabase/supabase-js';
import { PerfilConsultor } from '../types';

// Suporta ambientes baseados em Node (process.env) ou no navegador/Vite
const supabaseUrl = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || '';
const supabaseAnonKey = (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Aviso: As variáveis de ambiente SUPABASE_URL e/ou SUPABASE_ANON_KEY não foram configuradas. ' +
    'Certifique-se de defini-las para o correto funcionamento da conexão.'
  );
}

// Inicializa o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Realiza o login de um consultor usando email e senha.
 * Retorna os dados do usuário autenticado e seu perfil com a respectiva role (admin ou consultor).
 */
export async function loginConsultor(email: string, password: string): Promise<{
  user: any;
  perfil: PerfilConsultor | null;
  error: any;
}> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { user: null, perfil: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, perfil: null, error: new Error('Usuário não retornado após o login.') };
    }

    // Busca os dados do perfil do consultor na tabela 'profiles' para coletar a role (admin ou consultor)
    const { data: perfilData, error: perfilError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (perfilError) {
      console.warn('Erro ao obter o perfil do consultor:', perfilError.message);
      // Retorna o usuário autenticado mesmo se houver erro ao buscar o perfil (tabela não criada ou perfil inexistente)
      return {
        user: authData.user,
        perfil: null,
        error: perfilError,
      };
    }

    return {
      user: authData.user,
      perfil: perfilData as PerfilConsultor,
      error: null,
    };
  } catch (err: any) {
    return { user: null, perfil: null, error: err };
  }
}

/**
 * Realiza o logout do consultor autenticado.
 */
export async function logoutConsultor(): Promise<{ error: any }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Recupera a sessão ativa atual e o perfil completo do consultor logado (incluindo sua role).
 */
export async function getSessaoAtual(): Promise<{
  user: any;
  perfil: PerfilConsultor | null;
  error: any;
}> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return { user: null, perfil: null, error: sessionError };
    }

    if (!session || !session.user) {
      return { user: null, perfil: null, error: null };
    }

    // Busca os dados do perfil vinculados ao ID do usuário na sessão ativa
    const { data: perfilData, error: perfilError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (perfilError) {
      return {
        user: session.user,
        perfil: null,
        error: perfilError,
      };
    }

    return {
      user: session.user,
      perfil: perfilData as PerfilConsultor,
      error: null,
    };
  } catch (err: any) {
    return { user: null, perfil: null, error: err };
  }
}
