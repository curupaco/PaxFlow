-- 1. Corrigir a constraint de chave estrangeira do profiles para ON DELETE CASCADE
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 2. Remover assinaturas duplicadas ou obsoletas para evitar conflitos de overloading no Supabase/PostgREST
DROP FUNCTION IF EXISTS public.admin_set_user_password(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_set_user_password(TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT);

-- 3. Recriar a função admin_create_user com assinatura única e limpa (argumentos em ordem alfabética para o PostgREST)
-- Correção 1: Na tabela auth.identities do Supabase, a coluna 'id' para provedor local (email) DEVE ser o proprio ID do usuario em formato UUID (new_user_id),
-- e a coluna 'identity_data' deve conter obrigatoriamente os campos 'email_verified' e 'phone_verified'.
-- Correção 2: O GoTrue do Supabase exige hashes de senha com 10 rounds (gen_salt('bf', 10)) para evitar erros internos no validador de login.
-- Correção 3: Adicionado 'email_verified': true dentro de raw_user_meta_data em auth.users para alinhar com o validador do GoTrue.
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email TEXT,
  user_nome TEXT,
  user_password TEXT,
  user_role TEXT
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- Validar se o executor é administrador
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem cadastrar consultores.';
  END IF;

  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(user_password, gen_salt('bf', 10));

  -- Inserir na tabela de autenticação auth.users com email_verified no raw_user_meta_data
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    encrypted_pw,
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('nome', user_nome, 'email_verified', true),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    ''
  );

  -- Inserir na tabela de identidades auth.identities usando new_user_id (UUID)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    new_user_id,
    new_user_id::text,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email, 'email_verified', true, 'phone_verified', false),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Atualizar a role e status proativamente no profile correspondente
  UPDATE public.profiles
  SET role = user_role
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recriar a função admin_set_user_password com assinatura única e limpa (argumentos em ordem alfabética para o PostgREST)
CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  new_password TEXT,
  user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Verificar se o executor é administrador
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar senhas.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf', 10)),
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
