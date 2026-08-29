-- ============================================================================
-- PaxFlow — Schema do Banco de Dados PostgreSQL (Supabase)
-- ============================================================================
-- Este script DDL cria toda a estrutura de tabelas, restrições e relacionamentos
-- necessários para o correto funcionamento do ecossistema PaxFlow.
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ============================================================================

-- Habilitar a extensão gen_random_uuid se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABELA: profiles (Perfil do Consultor vinculado ao Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'consultor')) DEFAULT 'consultor',
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 2. TABELA: global_settings (Configurações Gerais da Agência)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.global_settings_table (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_name TEXT NOT NULL DEFAULT 'Minha Agência',
    taxa_cancelamento_padrao NUMERIC DEFAULT 10.00 NOT NULL,
    prazo_reembolso_dias INT DEFAULT 30 NOT NULL,
    notificacoes_ativas BOOLEAN DEFAULT TRUE NOT NULL,
    email_suporte TEXT,
    google_refresh_token TEXT,
    google_parent_folder_id TEXT,
    sla_pre_embarque_dias INT DEFAULT 7 NOT NULL,
    sla_pos_viagem_dias INT DEFAULT 3 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar a View Pública global_settings com mascaramento do google_refresh_token para não-admins
CREATE OR REPLACE VIEW public.global_settings WITH (security_invoker = true) AS
SELECT 
    id,
    agency_name,
    taxa_cancelamento_padrao,
    prazo_reembolso_dias,
    notificacoes_ativas,
    email_suporte,
    google_parent_folder_id,
    sla_pre_embarque_dias,
    sla_pos_viagem_dias,
    created_at,
    updated_at,
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN google_refresh_token
      ELSE CASE WHEN google_refresh_token IS NOT NULL AND google_refresh_token != '' THEN 'connected' ELSE NULL END
    END AS google_refresh_token
FROM public.global_settings_table;

-- Trigger/Função para tornar a View global_settings atualizável e inserível transparentemente
CREATE OR REPLACE FUNCTION public.manage_global_settings_view()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.global_settings_table
    SET
      agency_name = COALESCE(NEW.agency_name, OLD.agency_name),
      taxa_cancelamento_padrao = COALESCE(NEW.taxa_cancelamento_padrao, OLD.taxa_cancelamento_padrao),
      prazo_reembolso_dias = COALESCE(NEW.prazo_reembolso_dias, OLD.prazo_reembolso_dias),
      notificacoes_ativas = COALESCE(NEW.notificacoes_ativas, OLD.notificacoes_ativas),
      email_suporte = COALESCE(NEW.email_suporte, OLD.email_suporte),
      google_parent_folder_id = NEW.google_parent_folder_id,
      google_refresh_token = COALESCE(
        CASE WHEN NEW.google_refresh_token = 'connected' THEN OLD.google_refresh_token ELSE NEW.google_refresh_token END, 
        OLD.google_refresh_token
      ),
      sla_pre_embarque_dias = COALESCE(NEW.sla_pre_embarque_dias, OLD.sla_pre_embarque_dias),
      sla_pos_viagem_dias = COALESCE(NEW.sla_pos_viagem_dias, OLD.sla_pos_viagem_dias),
      updated_at = NOW()
    WHERE id = OLD.id;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.global_settings_table (
      id, agency_name, taxa_cancelamento_padrao, prazo_reembolso_dias, 
      notificacoes_ativas, email_suporte, google_parent_folder_id, 
      google_refresh_token, sla_pre_embarque_dias, sla_pos_viagem_dias
    ) VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      COALESCE(NEW.agency_name, 'Minha Agência'),
      COALESCE(NEW.taxa_cancelamento_padrao, 10.00),
      COALESCE(NEW.prazo_reembolso_dias, 30),
      COALESCE(NEW.notificacoes_ativas, TRUE),
      NEW.email_suporte,
      NEW.google_parent_folder_id,
      NEW.google_refresh_token,
      COALESCE(NEW.sla_pre_embarque_dias, 7),
      COALESCE(NEW.sla_pos_viagem_dias, 3)
    )
    RETURNING * INTO NEW;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_global_settings_view_manage
  INSTEAD OF INSERT OR UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();


-- ============================================================================
-- 3. TABELA: clientes (Cadastro de Passageiros no PaxFlow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    documento TEXT,
    data_nascimento DATE,
    endereco TEXT,
    observacoes TEXT,
    consultor_responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    passaporte_numero TEXT,
    passaporte_validade DATE,
    vistos_informacoes TEXT,
    google_drive_folder_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 4. TABELA: viagens (Fluxo de Viagens / Operações)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.viagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    destino TEXT NOT NULL,
    data_ida DATE NOT NULL,
    data_volta DATE NOT NULL,
    valor_total NUMERIC DEFAULT 0.00 NOT NULL,
    status VARCHAR(20) CHECK (status IN ('fechado', 'pos_venda', 'pre_embarque', 'pos_viagem', 'reembolso_solicitado')) DEFAULT 'fechado' NOT NULL,
    codigo_localizador TEXT,
    observacoes TEXT,
    data_financeiro DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 4.5 TABELA: tipos_produto (Tipos de produtos configurados dinamicamente)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tipos_produto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    icone VARCHAR(10) DEFAULT '📦' NOT NULL,
    campos_adicionais JSONB DEFAULT '[]'::jsonb NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 5. TABELA: produtos_viagem (Itens específicos de cada viagem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.produtos_viagem (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    fornecedor TEXT NOT NULL,
    descricao TEXT NOT NULL,
    codigo_reserva TEXT,
    valor_custo NUMERIC DEFAULT 0.00 NOT NULL,
    valor_venda NUMERIC DEFAULT 0.00 NOT NULL,
    status VARCHAR(20) CHECK (status IN ('reservado', 'emitido', 'cancelado', 'reembolsado')) DEFAULT 'reservado' NOT NULL,
    data_servico DATE NOT NULL,
    dados_adicionais JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 6. TABELA: reembolsos (Central de Reembolsos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reembolsos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    produto_viagem_id UUID REFERENCES public.produtos_viagem(id) ON DELETE SET NULL,
    consultor_solicitante_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    valor_solicitado NUMERIC NOT NULL,
    valor_aprovado NUMERIC,
    taxa_retencao NUMERIC,
    status VARCHAR(20) CHECK (status IN ('solicitado', 'em_analise', 'aprovado', 'recusado', 'pago', 'cancelado')) DEFAULT 'solicitado' NOT NULL,
    motivo_cancelamento TEXT NOT NULL,
    observacoes_financeiras TEXT,
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    data_resolucao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 7. TABELA: orcamentos (Pipeline de Leads/Orçamentos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    nome_cliente TEXT NOT NULL,
    contato TEXT NOT NULL,
    destino TEXT NOT NULL,
    data_viagem DATE,
    temperatura VARCHAR(20) CHECK (temperatura IN ('Frio', 'Normal', 'Quente')) DEFAULT 'Normal' NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    status VARCHAR(20) CHECK (status IN ('SOLICITADO', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDO')) DEFAULT 'SOLICITADO' NOT NULL,
    sub_status VARCHAR(20) CHECK (sub_status IN ('ACEITO', 'DESISTENCIA')),
    notas_negociacao TEXT,
    valor_proposta NUMERIC,
    valor_viagem NUMERIC,
    documentos_url TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 8. TABELA: lembretes (Agendamentos do Mission Control / Lembre depois)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lembretes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    data_lembrete DATE NOT NULL,
    periodo VARCHAR(10) CHECK (periodo IN ('manha', 'tarde', 'noite')) NOT NULL,
    arquivado BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 9. TABELAS: todo_columns e todo_cards (Cockpit de Planejamento Interno)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.todo_columns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    ordem INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.todo_cards (
    id TEXT PRIMARY KEY,
    column_id TEXT REFERENCES public.todo_columns(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', '')) DEFAULT ''::text,
    tag TEXT,
    assignee TEXT,
    ordem INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 10. SEGURANÇA: Row Level Security (RLS) & Políticas
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_viagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reembolsos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_cards ENABLE ROW LEVEL SECURITY;

-- Exemplo de políticas padrão para profiles
CREATE POLICY "Permitir leitura pública de perfis" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir update do próprio perfil ou por administradores" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Políticas padrão para global_settings_table
CREATE POLICY "Permitir leitura de configurações por consultores" 
ON public.global_settings_table FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir alteração de configurações apenas por admins" 
ON public.global_settings_table FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Políticas padrão de Clientes
CREATE POLICY "Leitura de clientes para o próprio consultor ou admin" 
ON public.clientes FOR SELECT TO authenticated 
USING (consultor_responsavel_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Inserir clientes para o próprio consultor ou admin" 
ON public.clientes FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = consultor_responsavel_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Atualizar clientes para o próprio consultor ou admin" 
ON public.clientes FOR UPDATE TO authenticated 
USING (auth.uid() = consultor_responsavel_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Excluir clientes apenas por admins" 
ON public.clientes FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Políticas padrão de Viagens
CREATE POLICY "Leitura de viagens para o próprio consultor ou admin" 
ON public.viagens FOR SELECT TO authenticated 
USING (consultor_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Inserir viagens para o próprio consultor ou admin" 
ON public.viagens FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = consultor_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Atualizar viagens para o próprio consultor ou admin" 
ON public.viagens FOR UPDATE TO authenticated 
USING (auth.uid() = consultor_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Excluir viagens apenas por admins" 
ON public.viagens FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Políticas padrão de Produtos de Viagem
CREATE POLICY "Leitura de produtos para consultor da viagem ou admin" 
ON public.produtos_viagem FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.viagens WHERE viagens.id = viagem_id AND (viagens.consultor_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')));

CREATE POLICY "Inserir produtos de viagens permitidas" 
ON public.produtos_viagem FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.viagens WHERE viagens.id = viagem_id AND (viagens.consultor_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')));

CREATE POLICY "Atualizar produtos de viagens permitidas" 
ON public.produtos_viagem FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.viagens WHERE viagens.id = viagem_id AND (viagens.consultor_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')));

CREATE POLICY "Excluir produtos de viagens permitidas" 
ON public.produtos_viagem FOR DELETE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.viagens WHERE viagens.id = viagem_id AND (viagens.consultor_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')));

-- Políticas padrão de Reembolsos
CREATE POLICY "Leitura de reembolsos para consultor solicitante/viagem ou admin" 
ON public.reembolsos FOR SELECT TO authenticated 
USING (
  consultor_solicitante_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.viagens WHERE viagens.id = viagem_id AND viagens.consultor_id = auth.uid()) OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Inserir reembolsos para o próprio consultor ou admin" 
ON public.reembolsos FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = consultor_solicitante_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Atualizar reembolsos para o próprio consultor ou admin" 
ON public.reembolsos FOR UPDATE TO authenticated 
USING (auth.uid() = consultor_solicitante_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Excluir reembolsos apenas por admins" 
ON public.reembolsos FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Orçamentos, Lembretes, Todo
CREATE POLICY "Leitura de orçamentos para o próprio consultor ou admin" 
ON public.orcamentos FOR SELECT TO authenticated 
USING (consultor_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Inserir orçamentos para o próprio consultor ou admin" 
ON public.orcamentos FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = consultor_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Atualizar orçamentos para o próprio consultor ou admin" 
ON public.orcamentos FOR UPDATE TO authenticated 
USING (auth.uid() = consultor_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Excluir orçamentos apenas por admins" 
ON public.orcamentos FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Lembretes
CREATE POLICY "Leitura de lembretes para o próprio consultor, criador ou admin" 
ON public.lembretes FOR SELECT TO authenticated 
USING (consultor_id = auth.uid() OR criador_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Inserir lembretes para o próprio consultor, criador ou admin" 
ON public.lembretes FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = consultor_id OR auth.uid() = criador_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Atualizar lembretes para o próprio consultor, criador ou admin" 
ON public.lembretes FOR UPDATE TO authenticated 
USING (auth.uid() = consultor_id OR auth.uid() = criador_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Excluir lembretes para o próprio consultor, criador ou admin" 
ON public.lembretes FOR DELETE TO authenticated 
USING (auth.uid() = consultor_id OR auth.uid() = criador_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Todo
CREATE POLICY "Acesso total de colunas todo para autenticados" 
ON public.todo_columns FOR ALL TO authenticated USING (true);

CREATE POLICY "Acesso total de cartões todo para autenticados" 
ON public.todo_cards FOR ALL TO authenticated USING (true);

-- ============================================================================
-- 11. GATILHOS (Triggers) automáticos para criação de perfil ao registrar
-- ============================================================================
-- Função para inserir perfil automaticamente ao cadastrar um usuário no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, ativo)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', 'Novo Consultor'),
    new.email,
    'consultor',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparador
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Impedir que consultores comuns alterem sua própria role para admin
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) IS DISTINCT FROM 'admin' THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_role_update();

-- RPC administrativa para criação segura de novos usuários
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
  -- 1. Validar se o executor é administrador
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem cadastrar consultores.';
  END IF;

  new_user_id := gen_random_uuid();
  -- Criptografar a senha no padrão do Supabase Auth
  encrypted_pw := crypt(user_password, gen_salt('bf'));

  -- 2. Inserir na tabela de autenticação auth.users do Supabase
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

  -- 3. Inserir na tabela de identidades auth.identities
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
    gen_random_uuid(),
    new_user_id,
    new_user_id::text,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- 4. Atualizar a role e status de forma proativa no profile correspondente
  -- (A trigger on_auth_user_created é disparada e insere com 'consultor', depois atualizamos para a role correta)
  UPDATE public.profiles
  SET role = user_role
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC administrativa para alteração segura de senhas de outros usuários
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

-- ============================================================================
-- 12. TABELAS PARA COMENTÁRIOS E NOTIFICAÇÕES (MENÇÕES @)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comentarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo_item VARCHAR(20) CHECK (tipo_item IN ('orcamento', 'viagem', 'produto')) NOT NULL,
    item_id UUID NOT NULL,
    autor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    texto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    comentario_id UUID REFERENCES public.comentarios(id) ON DELETE CASCADE NOT NULL,
    tipo_item VARCHAR(20) CHECK (tipo_item IN ('orcamento', 'viagem', 'produto')) NOT NULL,
    item_id UUID NOT NULL,
    parent_id UUID NOT NULL, -- orcamentos.id ou viagens.id para deep linking direto
    lida BOOLEAN DEFAULT FALSE NOT NULL,
    arquivada BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Acesso total de comentarios para autenticados" ON public.comentarios FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total de notificacoes para autenticados" ON public.notificacoes FOR ALL TO authenticated USING (true);

-- ============================================================================
-- 13. AUDITORIA: Trilha de Auditoria (Audit Logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tabela TEXT NOT NULL,
    operacao TEXT NOT NULL,
    registro_id UUID NOT NULL,
    dados_antigos JSONB,
    dados_novos JSONB,
    executado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler todos os logs de auditoria"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  BEGIN
    current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (tabela, operacao, registro_id, dados_novos, executado_por)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW), current_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (tabela, operacao, registro_id, dados_antigos, dados_novos, executado_por)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), current_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (tabela, operacao, registro_id, dados_antigos, executado_por)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), current_user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER audit_clientes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE OR REPLACE TRIGGER audit_viagens_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.viagens
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE OR REPLACE TRIGGER audit_reembolsos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reembolsos
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- ============================================================================
-- 15. RPC SECURITY DEFINER: buscar_balcao_co_piloto (Busca Global de Balcão)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.buscar_balcao_co_piloto(query_text TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    raw_query TEXT;
    clean_digits TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    raw_query := LOWER(TRIM(query_text));
    clean_digits := REGEXP_REPLACE(query_text, '\D', '', 'g');

    SELECT COALESCE(JSON_AGG(row_data), '[]'::json) INTO result
    FROM (
        SELECT 
            JSON_BUILD_OBJECT(
                'id', c.id,
                'nome', c.nome,
                'cpf', c.documento,
                'telefone', c.telefone,
                'email', c.email
            ) AS cliente,
            COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                    'id', v.id,
                    'titulo', COALESCE(v.destino, 'Viagem'),
                    'consultorNome', COALESCE(p.nome, 'Consultor Titular'),
                    'consultorId', v.consultor_id,
                    'destino', COALESCE(v.destino, ''),
                    'status', v.status
                ))
                FROM public.viagens v
                LEFT JOIN public.profiles p ON p.id = v.consultor_id
                WHERE v.cliente_id = c.id 
                   OR LOWER(v.destino) LIKE '%' || raw_query || '%'
                   OR LOWER(COALESCE(v.codigo_localizador, '')) LIKE '%' || raw_query || '%'
            ), '[]'::json) AS viagens,
            COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                    'id', o.id,
                    'titulo', COALESCE(o.destino, 'Orçamento'),
                    'consultorNome', COALESCE(p.nome, 'Consultor Titular'),
                    'consultorId', o.consultor_id,
                    'data', CAST(o.created_at AS TEXT),
                    'total', 'R$ ' || COALESCE(CAST(o.valor_proposta AS TEXT), '0,00')
                ))
                FROM public.orcamentos o
                LEFT JOIN public.profiles p ON p.id = o.consultor_id
                WHERE o.cliente_id = c.id 
                   OR LOWER(COALESCE(o.destino, '')) LIKE '%' || raw_query || '%'
                   OR LOWER(COALESCE(o.nome_cliente, '')) LIKE '%' || raw_query || '%'
            ), '[]'::json) AS orcamentos,
            '[]'::json AS reembolsos
        FROM public.clientes c
        WHERE LOWER(c.nome) LIKE '%' || raw_query || '%'
           OR LOWER(COALESCE(c.email, '')) LIKE '%' || raw_query || '%'
           OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.documento, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
           OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.telefone, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
           OR EXISTS (
                SELECT 1 FROM public.viagens v 
                WHERE v.cliente_id = c.id AND (LOWER(v.destino) LIKE '%' || raw_query || '%' OR LOWER(COALESCE(v.codigo_localizador, '')) LIKE '%' || raw_query || '%')
           )
           OR EXISTS (
                SELECT 1 FROM public.orcamentos o 
                WHERE o.cliente_id = c.id AND (LOWER(COALESCE(o.destino, '')) LIKE '%' || raw_query || '%' OR LOWER(COALESCE(o.nome_cliente, '')) LIKE '%' || raw_query || '%')
           )
    ) row_data;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 16. RPC SECURITY DEFINER: obter_viagem_co_piloto
-- ============================================================================
CREATE OR REPLACE FUNCTION public.obter_viagem_co_piloto(p_trip_id TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    SELECT row_to_json(v_data) INTO result
    FROM (
        SELECT 
            v.*,
            JSON_BUILD_OBJECT(
                'id', c.id,
                'nome', c.nome,
                'email', c.email,
                'telefone', c.telefone,
                'documento', c.documento
            ) AS cliente,
            COALESCE((
                SELECT JSON_AGG(row_to_json(p))
                FROM public.produtos_viagem p
                WHERE p.viagem_id = v.id
            ), '[]'::json) AS produtos,
            COALESCE((
                SELECT JSON_AGG(row_to_json(r))
                FROM public.reembolsos r
                WHERE r.viagem_id = v.id
            ), '[]'::json) AS reembolsos
        FROM public.viagens v
        LEFT JOIN public.clientes c ON c.id = v.cliente_id
        WHERE v.id::text = p_trip_id
    ) v_data;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 17. RPC SECURITY DEFINER: obter_orcamento_co_piloto
-- ============================================================================
CREATE OR REPLACE FUNCTION public.obter_orcamento_co_piloto(p_orc_id TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    SELECT row_to_json(o_data) INTO result
    FROM (
        SELECT 
            o.*,
            JSON_BUILD_OBJECT(
                'id', c.id,
                'nome', c.nome,
                'email', c.email,
                'telefone', c.telefone,
                'documento', c.documento
            ) AS cliente
        FROM public.orcamentos o
        LEFT JOIN public.clientes c ON c.id = o.cliente_id
        WHERE o.id::text = p_orc_id
    ) o_data;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 18. RPC SECURITY DEFINER: obter_produtos_co_piloto
-- ============================================================================
CREATE OR REPLACE FUNCTION public.obter_produtos_co_piloto(p_trip_id TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    SELECT COALESCE(JSON_AGG(row_to_json(p)), '[]'::json) INTO result
    FROM public.produtos_viagem p
    WHERE p.viagem_id::text = p_trip_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 19. RPC SECURITY DEFINER: atualizar_orcamento_co_piloto
-- ============================================================================
CREATE OR REPLACE FUNCTION public.atualizar_orcamento_co_piloto(p_orc_id TEXT, p_payload JSON)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    UPDATE public.orcamentos
    SET 
        temperatura = COALESCE(p_payload->>'temperatura', temperatura),
        sub_status = COALESCE(p_payload->>'sub_status', sub_status),
        status = COALESCE(p_payload->>'status', status),
        notas_negociacao = COALESCE(p_payload->>'notas_negociacao', notas_negociacao),
        valor_proposta = CASE 
                            WHEN p_payload->>'valor_proposta' IS NOT NULL AND (p_payload->>'valor_proposta') != '' 
                            THEN (p_payload->>'valor_proposta')::numeric 
                            ELSE valor_proposta 
                         END,
        updated_at = NOW()
    WHERE id::text = p_orc_id
    RETURNING row_to_json(public.orcamentos.*) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 20. RPC SECURITY DEFINER: atualizar_viagem_co_piloto
-- ============================================================================
CREATE OR REPLACE FUNCTION public.atualizar_viagem_co_piloto(p_trip_id TEXT, p_payload JSON)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    UPDATE public.viagens
    SET 
        cliente_id = COALESCE((p_payload->>'cliente_id')::uuid, cliente_id),
        consultor_id = COALESCE((p_payload->>'consultor_id')::uuid, consultor_id),
        destino = COALESCE(p_payload->>'destino', destino),
        codigo_localizador = COALESCE(p_payload->>'codigo_localizador', codigo_localizador),
        valor_total = CASE WHEN p_payload->>'valor_total' IS NOT NULL AND (p_payload->>'valor_total') != '' THEN (p_payload->>'valor_total')::numeric ELSE valor_total END,
        data_ida = CASE WHEN p_payload->>'data_ida' IS NOT NULL AND (p_payload->>'data_ida') != '' THEN (p_payload->>'data_ida')::date ELSE data_ida END,
        data_volta = CASE WHEN p_payload->>'data_volta' IS NOT NULL AND (p_payload->>'data_volta') != '' THEN (p_payload->>'data_volta')::date ELSE data_volta END,
        data_financeiro = CASE WHEN p_payload->>'data_financeiro' IS NOT NULL AND (p_payload->>'data_financeiro') != '' THEN (p_payload->>'data_financeiro')::date ELSE data_financeiro END,
        status = COALESCE(p_payload->>'status', status),
        observacoes = COALESCE(p_payload->>'observacoes', observacoes),
        processo_conferido = CASE WHEN p_payload->>'processo_conferido' IS NOT NULL THEN (p_payload->>'processo_conferido')::boolean ELSE processo_conferido END,
        updated_at = NOW()
    WHERE id::text = p_trip_id
    RETURNING row_to_json(public.viagens.*) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 21. RPC SECURITY DEFINER: salvar_produto_co_piloto
-- ============================================================================
CREATE OR REPLACE FUNCTION public.salvar_produto_co_piloto(p_prod_id TEXT, p_payload JSON)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    IF p_prod_id IS NOT NULL AND p_prod_id != '' AND EXISTS (SELECT 1 FROM public.produtos_viagem WHERE id::text = p_prod_id) THEN
        UPDATE public.produtos_viagem
        SET 
            tipo_produto = COALESCE(p_payload->>'tipo_produto', tipo_produto),
            fornecedor = COALESCE(p_payload->>'fornecedor', fornecedor),
            descricao = COALESCE(p_payload->>'descricao', descricao),
            status = COALESCE(p_payload->>'status', status),
            valor_venda = CASE WHEN p_payload->>'valor_venda' IS NOT NULL AND (p_payload->>'valor_venda') != '' THEN (p_payload->>'valor_venda')::numeric ELSE valor_venda END,
            valor_custo = CASE WHEN p_payload->>'valor_custo' IS NOT NULL AND (p_payload->>'valor_custo') != '' THEN (p_payload->>'valor_custo')::numeric ELSE valor_custo END,
            updated_at = NOW()
        WHERE id::text = p_prod_id
        RETURNING row_to_json(public.produtos_viagem.*) INTO result;
    ELSE
        INSERT INTO public.produtos_viagem (
            viagem_id, tipo_produto, fornecedor, descricao, status, valor_venda, valor_custo
        ) VALUES (
            (p_payload->>'viagem_id')::uuid,
            p_payload->>'tipo_produto',
            p_payload->>'fornecedor',
            p_payload->>'descricao',
            COALESCE(p_payload->>'status', 'confirmado'),
            COALESCE((p_payload->>'valor_venda')::numeric, 0),
            COALESCE((p_payload->>'valor_custo')::numeric, 0)
        )
        RETURNING row_to_json(public.produtos_viagem.*) INTO result;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 22. RPC SECURITY DEFINER: deletar_produto_co_piloto
-- ============================================================================
CREATE OR REPLACE FUNCTION public.deletar_produto_co_piloto(p_prod_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    DELETE FROM public.produtos_viagem WHERE id::text = p_prod_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================================
-- 23. TABELA: push_subscriptions (Assinaturas Web Push para Notificações Mobile/Desktop)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam suas próprias inscrições push" ON public.push_subscriptions;
CREATE POLICY "Usuários gerenciam suas próprias inscrições push"
    ON public.push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


