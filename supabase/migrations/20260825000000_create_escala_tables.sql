-- ============================================================================
-- Migration: 20260825000000_create_escala_tables.sql
-- Descrição: Tabelas para a Central Administrativa de Escala de Funcionários no Inbox
-- ============================================================================

-- 0. Adiciona a propriedade de participação na escala na tabela de perfis
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS participa_escala BOOLEAN DEFAULT true;

-- 1. Tabela de Escala Diária dos Funcionários
CREATE TABLE IF NOT EXISTS public.escala_diaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    consultor_nome TEXT NOT NULL,
    equipe TEXT DEFAULT 'Equipe Agatur',
    data DATE NOT NULL,
    turno_codigo TEXT NOT NULL,
    observacao_custom TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT escala_diaria_consultor_data_key UNIQUE (consultor_nome, data)
);

-- 2. Tabela de Solicitações de Troca de Turno / Folga / Férias
CREATE TABLE IF NOT EXISTS public.escala_solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('troca', 'folga', 'ferias')),
    solicitante_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    solicitante_nome TEXT NOT NULL,
    destinatario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    destinatario_nome TEXT,
    data_origem DATE NOT NULL,
    turno_origem TEXT,
    data_destino DATE,
    turno_destino TEXT,
    motivo TEXT,
    status TEXT NOT NULL DEFAULT 'pendente_admin' CHECK (status IN ('pendente_colega', 'pendente_admin', 'aprovado', 'recusado')),
    resposta_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela do Banco de Folgas
CREATE TABLE IF NOT EXISTS public.escala_banco_folgas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    consultor_nome TEXT NOT NULL UNIQUE,
    equipe TEXT DEFAULT 'Equipe Agatur',
    saldo_dias TEXT NOT NULL DEFAULT '0',
    detalhes_historico TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Treinamentos / Coffee / Eventos
CREATE TABLE IF NOT EXISTS public.escala_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data TEXT NOT NULL,
    consultor_nome TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Permissões RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.escala_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_banco_folgas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas para escala_diaria
DROP POLICY IF EXISTS "Permitir leitura pública autenticada de escala_diaria" ON public.escala_diaria;
CREATE POLICY "Permitir leitura pública autenticada de escala_diaria"
    ON public.escala_diaria FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Permitir gestão de escala_diaria por autenticados" ON public.escala_diaria;
CREATE POLICY "Permitir gestão de escala_diaria por autenticados"
    ON public.escala_diaria FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para escala_solicitacoes
DROP POLICY IF EXISTS "Permitir leitura pública autenticada de escala_solicitacoes" ON public.escala_solicitacoes;
CREATE POLICY "Permitir leitura pública autenticada de escala_solicitacoes"
    ON public.escala_solicitacoes FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Permitir gestão de escala_solicitacoes por autenticados" ON public.escala_solicitacoes;
CREATE POLICY "Permitir gestão de escala_solicitacoes por autenticados"
    ON public.escala_solicitacoes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para escala_banco_folgas
DROP POLICY IF EXISTS "Permitir leitura de banco_folgas" ON public.escala_banco_folgas;
CREATE POLICY "Permitir leitura de banco_folgas"
    ON public.escala_banco_folgas FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Permitir gestão de banco_folgas" ON public.escala_banco_folgas;
CREATE POLICY "Permitir gestão de banco_folgas"
    ON public.escala_banco_folgas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para escala_eventos
DROP POLICY IF EXISTS "Permitir leitura de escala_eventos" ON public.escala_eventos;
CREATE POLICY "Permitir leitura de escala_eventos"
    ON public.escala_eventos FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Permitir gestão de escala_eventos" ON public.escala_eventos;
CREATE POLICY "Permitir gestão de escala_eventos"
    ON public.escala_eventos FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_escala_diaria_data ON public.escala_diaria (data);
CREATE INDEX IF NOT EXISTS idx_escala_solicitacoes_status ON public.escala_solicitacoes (status);
