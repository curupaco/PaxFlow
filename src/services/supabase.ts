import { createClient } from '@supabase/supabase-js';
import { PerfilConsultor } from '../types';
import { obterAvatarLocal } from './avatars';

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
 * Salva localmente a senha de um usuário no ambiente de sandbox/desenvolvimento
 */
export function salvarSenhaLocal(email: string, password: string): void {
  try {
    const localPasswords = JSON.parse(localStorage.getItem('paxflow-custom-passwords') || '{}');
    localPasswords[email.toLowerCase().trim()] = password;
    localStorage.setItem('paxflow-custom-passwords', JSON.stringify(localPasswords));
  } catch (e) {
    console.error('Erro ao salvar senha localmente:', e);
  }
}

/**
 * Obtém localmente a senha de um usuário no ambiente de sandbox/desenvolvimento
 */
export function obterSenhaLocal(email: string): string | null {
  try {
    const localPasswords = JSON.parse(localStorage.getItem('paxflow-custom-passwords') || '{}');
    return localPasswords[email.toLowerCase().trim()] || null;
  } catch (e) {
    return null;
  }
}

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
      // Bypass de credenciais em sandbox/desenvolvimento se houver senha local correspondente!
      const localSenha = obterSenhaLocal(email);
      if (localSenha && localSenha === password) {
        console.log('[Sandbox] Credenciais customizadas locais validadas com sucesso para:', email);
        
        // Tenta buscar o perfil do consultor na tabela profiles do Supabase
        const { data: perfilData, error: perfilError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .single();

        if (perfilError || !perfilData) {
          // Se não houver perfil no banco de dados, cria um perfil mock completo
          const mockUser = {
            id: 'mock-id-' + email.replace(/[^a-zA-Z0-9]/g, ''),
            email: email,
            user_metadata: { nome: email.split('@')[0] }
          };
          const mockPerfil: PerfilConsultor = {
            id: mockUser.id,
            nome: email.split('@')[0],
            email: email,
            role: 'consultor',
            ativo: true
          };

          localStorage.setItem('paxflow-sandbox-session', JSON.stringify({ user: mockUser, perfil: mockPerfil }));

          return {
            user: mockUser,
            perfil: mockPerfil,
            error: null
          };
        }

        const enrichedPerfil = perfilData as PerfilConsultor;
        const localAvatar = obterAvatarLocal(enrichedPerfil.id);
        if (localAvatar) {
          enrichedPerfil.avatar_url = localAvatar;
        }

        const mockUser = {
          id: enrichedPerfil.id,
          email: enrichedPerfil.email,
          user_metadata: { nome: enrichedPerfil.nome, avatar_url: enrichedPerfil.avatar_url }
        };

        // Salva a sessão simulada no LocalStorage para que o getSessaoAtual() saiba restaurá-la
        localStorage.setItem('paxflow-sandbox-session', JSON.stringify({ user: mockUser, perfil: enrichedPerfil }));

        return {
          user: mockUser,
          perfil: enrichedPerfil,
          error: null
        };
      }

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
        ativo: true,
        avatar_url: authData.user.user_metadata?.avatar_url || authData.user.user_metadata?.avatar || undefined
      };

      // Tenta criar ou atualizar o perfil no banco de forma proativa para consultas futuras
      try {
        let upsertErr;
        try {
          const { error } = await supabase.from('profiles').upsert({
            id: fallbackPerfil.id,
            nome: fallbackPerfil.nome,
            email: fallbackPerfil.email,
            role: fallbackPerfil.role,
            ativo: fallbackPerfil.ativo,
            avatar_url: fallbackPerfil.avatar_url
          });
          upsertErr = error;
        } catch (err: any) {
          upsertErr = err;
        }

        if (upsertErr) {
          console.warn('Erro ao upsertar perfil com avatar_url (provavelmente coluna ausente). Tentando sem avatar_url...', upsertErr);
          const { error: retryErr } = await supabase.from('profiles').upsert({
            id: fallbackPerfil.id,
            nome: fallbackPerfil.nome,
            email: fallbackPerfil.email,
            role: fallbackPerfil.role,
            ativo: fallbackPerfil.ativo
          });
          if (retryErr) {
            console.warn('Erro ao tentar upsert de fallback sem avatar_url:', retryErr);
          }
        }
      } catch (insertErr) {
        console.warn('Erro ao inserir perfil padrão de fallback:', insertErr);
      }

      return {
        user: authData.user,
        perfil: fallbackPerfil,
        error: null, // Retorna null no erro para que o login prossiga com sucesso
      };
    }
    
    if (perfilData) {
      const local = obterAvatarLocal(perfilData.id);
      if (local) {
        (perfilData as PerfilConsultor).avatar_url = local;
      }
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
  localStorage.removeItem('paxflow-sandbox-session');
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
    // Primeiro, verifica se há uma sessão ativa simulada de sandbox/desenvolvimento
    const sandboxSessionStr = localStorage.getItem('paxflow-sandbox-session');
    if (sandboxSessionStr) {
      try {
        const { user, perfil } = JSON.parse(sandboxSessionStr);
        // Atualiza avatar local se houver
        const local = obterAvatarLocal(perfil.id);
        if (local) {
          perfil.avatar_url = local;
        }
        return { user, perfil, error: null };
      } catch (e) {
        localStorage.removeItem('paxflow-sandbox-session');
      }
    }

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
        ativo: true,
        avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.avatar || undefined
      };

      return {
        user: session.user,
        perfil: fallbackPerfil,
        error: null, // Retorna null para prosseguir a sessão ativa sem travar a interface
      };
    }
    
    if (perfilData) {
      const local = obterAvatarLocal(perfilData.id);
      if (local) {
        (perfilData as PerfilConsultor).avatar_url = local;
      }
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

/**
 * Atualiza a senha da conta atualmente autenticada na sessão ativa.
 */
export async function atualizarSenhaAtual(password: string): Promise<{ error: any }> {
  const { error } = await supabase.auth.updateUser({ password });
  return { error };
}

