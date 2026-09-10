-- ============================================================================
-- PAXFLOW - MIGRAÇÃO DE CORREÇÃO DE SCHEMA DRIFT E PERSISTÊNCIA NEXT TRIP
-- Data: 2026-09-10
-- Descrição:
--   1. Criação das tabelas 'destinos', 'mensagem_destinatarios', 'profiles_xp_logs' e 'profiles_badges'
--   2. Adição da coluna 'voucher_geral_anexado' na tabela 'viagens'
--   3. Adição da coluna 'next_trip_snooze_until' na tabela 'clientes' (Zero LocalStorage)
--   4. Provisionamento dos buckets de storage 'avatars' e 'documentos-clientes'
-- ============================================================================

-- 1. TABELA: destinos
CREATE TABLE IF NOT EXISTS public.destinos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT destinos_nome_pais_key UNIQUE (nome, pais)
);

CREATE INDEX IF NOT EXISTS idx_destinos_nome ON public.destinos(nome);

ALTER TABLE public.destinos ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'destinos' AND policyname = 'Permitir acesso completo a destinos para autenticados'
    ) THEN
        CREATE POLICY "Permitir acesso completo a destinos para autenticados"
        ON public.destinos FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 2. TABELA: mensagem_destinatarios
CREATE TABLE IF NOT EXISTS public.mensagem_destinatarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID REFERENCES public.mensagens_diretas(id) ON DELETE CASCADE NOT NULL,
    destinatario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(10) DEFAULT 'para' NOT NULL CHECK (tipo IN ('para', 'cc')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT mensagem_destinatarios_msg_dest_key UNIQUE (mensagem_id, destinatario_id)
);

CREATE INDEX IF NOT EXISTS idx_mensagem_destinatarios_msg ON public.mensagem_destinatarios(mensagem_id);
CREATE INDEX IF NOT EXISTS idx_mensagem_destinatarios_dest ON public.mensagem_destinatarios(destinatario_id);

ALTER TABLE public.mensagem_destinatarios ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mensagem_destinatarios' AND policyname = 'Permitir acesso completo a mensagem_destinatarios para autenticados'
    ) THEN
        CREATE POLICY "Permitir acesso completo a mensagem_destinatarios para autenticados"
        ON public.mensagem_destinatarios FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 3. TABELAS DE GAMIFICAÇÃO: profiles_xp_logs e profiles_badges
CREATE TABLE IF NOT EXISTS public.profiles_xp_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    acao_chave VARCHAR(100) NOT NULL,
    xp_ganho INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT profiles_xp_logs_profile_acao_key UNIQUE (profile_id, acao_chave)
);

CREATE INDEX IF NOT EXISTS idx_profiles_xp_logs_profile ON public.profiles_xp_logs(profile_id);

ALTER TABLE public.profiles_xp_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles_xp_logs' AND policyname = 'Permitir acesso completo a profiles_xp_logs para autenticados'
    ) THEN
        CREATE POLICY "Permitir acesso completo a profiles_xp_logs para autenticados"
        ON public.profiles_xp_logs FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    badge_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT profiles_badges_profile_badge_key UNIQUE (profile_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_profiles_badges_profile ON public.profiles_badges(profile_id);

ALTER TABLE public.profiles_badges ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles_badges' AND policyname = 'Permitir acesso completo a profiles_badges para autenticados'
    ) THEN
        CREATE POLICY "Permitir acesso completo a profiles_badges para autenticados"
        ON public.profiles_badges FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 4. COLUNA: voucher_geral_anexado na tabela viagens
ALTER TABLE public.viagens 
ADD COLUMN IF NOT EXISTS voucher_geral_anexado BOOLEAN DEFAULT FALSE NOT NULL;

-- 5. COLUNA: next_trip_snooze_until na tabela clientes (Fonte Única da Verdade para Snooze)
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS next_trip_snooze_until TIMESTAMP WITH TIME ZONE;

-- 6. PROVISIONAMENTO DOS STORAGE BUCKETS (avatars e documentos-clientes)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES 
            ('avatars', 'avatars', true),
            ('documentos-clientes', 'documentos-clientes', false)
        ON CONFLICT (id) DO UPDATE 
        SET public = EXCLUDED.public;
    END IF;
END $$;
