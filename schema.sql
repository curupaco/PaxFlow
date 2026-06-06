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
    email TEXT NOT NULL,
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
    status VARCHAR(20) CHECK (status IN ('planejamento', 'confirmada', 'em_andamento', 'concluida', 'cancelada')) DEFAULT 'planejamento' NOT NULL,
    codigo_localizador TEXT,
    observacoes TEXT,
    data_financeiro DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 5. TABELA: produtos_viagem (Itens específicos de cada viagem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.produtos_viagem (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('voo', 'hotel', 'seguro', 'passeio', 'outro')) NOT NULL,
    fornecedor TEXT NOT NULL,
    descricao TEXT NOT NULL,
    codigo_reserva TEXT,
    valor_custo NUMERIC DEFAULT 0.00 NOT NULL,
    valor_venda NUMERIC DEFAULT 0.00 NOT NULL,
    status VARCHAR(20) CHECK (status IN ('reservado', 'emitido', 'cancelado', 'reembolsado')) DEFAULT 'reservado' NOT NULL,
    data_servico DATE NOT NULL,
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

CREATE POLICY "Permitir update do próprio perfil" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

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
CREATE POLICY "Leitura de lembretes para o próprio consultor ou admin" 
ON public.lembretes FOR SELECT TO authenticated 
USING (consultor_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Inserir lembretes para o próprio consultor ou admin" 
ON public.lembretes FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = consultor_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Atualizar lembretes para o próprio consultor ou admin" 
ON public.lembretes FOR UPDATE TO authenticated 
USING (auth.uid() = consultor_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Excluir lembretes para o próprio consultor ou admin" 
ON public.lembretes FOR DELETE TO authenticated 
USING (auth.uid() = consultor_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

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
  user_password TEXT,
  user_nome TEXT,
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

  -- 4. Atualizar a role e status de forma proativa no profile correspondente
  -- (A trigger on_auth_user_created é disparada e insere com 'consultor', depois atualizamos para a role correta)
  UPDATE public.profiles
  SET role = user_role
  WHERE id = new_user_id;

  RETURN new_user_id;
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


