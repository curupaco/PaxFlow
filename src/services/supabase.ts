import { createClient } from '@supabase/supabase-js';
import { PerfilConsultor } from '../types';

declare const process: any;

// Suporta ambientes baseados em Node (process.env) ou no navegador/Vite (import.meta.env)
const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || 
  '';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || 
  '';

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
      console.warn('Perfil não encontrado ou erro ao buscar. Criando perfil padrão de fallback:', perfilError.message);
      
      const fallbackPerfil: PerfilConsultor = {
        id: authData.user.id,
        nome: authData.user.user_metadata?.nome || 'Consultor Novo',
        email: authData.user.email || '',
        role: 'consultor',
        ativo: true
      };

      // Tenta inserir o perfil no banco de forma proativa para consultas futuras
      try {
        await supabase.from('profiles').insert({
          id: fallbackPerfil.id,
          nome: fallbackPerfil.nome,
          email: fallbackPerfil.email,
          role: fallbackPerfil.role,
          ativo: fallbackPerfil.ativo
        });
      } catch (insertErr) {
        console.warn('Erro ao inserir perfil padrão de fallback:', insertErr);
      }

      return {
        user: authData.user,
        perfil: fallbackPerfil,
        error: null, // Retorna null no erro para que o login prossiga com sucesso
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
      console.warn('Perfil ausente na sessão ativa. Usando perfil padrão de fallback:', perfilError.message);
      
      const fallbackPerfil: PerfilConsultor = {
        id: session.user.id,
        nome: session.user.user_metadata?.nome || 'Consultor Novo',
        email: session.user.email || '',
        role: 'consultor',
        ativo: true
      };

      return {
        user: session.user,
        perfil: fallbackPerfil,
        error: null, // Retorna null para prosseguir a sessão ativa sem travar a interface
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
