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
CREATE TABLE IF NOT EXISTS public.global_settings (
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
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
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

-- Políticas padrão para global_settings
CREATE POLICY "Permitir leitura de configurações por consultores" 
ON public.global_settings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir alteração de configurações apenas por admins" 
ON public.global_settings FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Políticas padrão de Clientes, Viagens, Orçamentos e Lembretes
-- Consultores comuns lêem tudo ou somente os seus (conforme regra de negócio). 
-- Para flexibilidade inicial das agências, as políticas abaixo liberam leitura total interna e escrita se autenticado.

CREATE POLICY "Leitura total de clientes para autenticados" 
ON public.clientes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escrita total de clientes para autenticados" 
ON public.clientes FOR ALL TO authenticated USING (true);

CREATE POLICY "Acesso total de viagens para autenticados" 
ON public.viagens FOR ALL TO authenticated USING (true);

CREATE POLICY "Acesso total de produtos para autenticados" 
ON public.produtos_viagem FOR ALL TO authenticated USING (true);

CREATE POLICY "Acesso total de reembolsos para autenticados" 
ON public.reembolsos FOR ALL TO authenticated USING (true);

CREATE POLICY "Acesso total de orçamentos para autenticados" 
ON public.orcamentos FOR ALL TO authenticated USING (true);

CREATE POLICY "Acesso total de lembretes para autenticados" 
ON public.lembretes FOR ALL TO authenticated USING (true);

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

