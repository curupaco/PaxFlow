-- 1. Redefinir políticas de RLS para a tabela profiles
DROP POLICY IF EXISTS "Permitir update do próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Permitir update do próprio perfil ou por administradores" ON public.profiles;

CREATE POLICY "Permitir update do próprio perfil ou por administradores" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 2. Recriar a função admin_create_user com argumentos em ordem alfabética para PostgREST
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
  encrypted_pw := crypt(user_password, gen_salt('bf'));

  -- Inserir na tabela de autenticação auth.users
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
    jsonb_build_object('nome', user_nome),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    ''
  );

  -- Inserir na tabela de identidades auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email),
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

-- 3. Recriar/criar a função admin_set_user_password com argumentos em ordem alfabética para PostgREST
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
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
