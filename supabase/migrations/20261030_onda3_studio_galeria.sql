-- ==============================================================================
-- PAXFLOW ONDA 3: STUDIO FOTOS DA AGÊNCIA & STORAGE
-- Tabela para galeria institucional da agência e políticas de RLS
-- ==============================================================================

-- 1. Criação da tabela de fotos da agência
CREATE TABLE IF NOT EXISTS public.studio_fotos_agencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    url TEXT NOT NULL,
    storage_path TEXT,
    categoria TEXT DEFAULT 'Geral',
    tags TEXT[] DEFAULT '{}',
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitação de RLS
ALTER TABLE public.studio_fotos_agencia ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso Colaborativo da Agência
DROP POLICY IF EXISTS "Leitura colaborativa de fotos da agência" ON public.studio_fotos_agencia;
CREATE POLICY "Leitura colaborativa de fotos da agência"
ON public.studio_fotos_agencia FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Inserção de fotos da agência por autenticados" ON public.studio_fotos_agencia;
CREATE POLICY "Inserção de fotos da agência por autenticados"
ON public.studio_fotos_agencia FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Atualização de fotos da agência por autenticados" ON public.studio_fotos_agencia;
CREATE POLICY "Atualização de fotos da agência por autenticados"
ON public.studio_fotos_agencia FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Exclusão de fotos da agência por autenticados" ON public.studio_fotos_agencia;
CREATE POLICY "Exclusão de fotos da agência por autenticados"
ON public.studio_fotos_agencia FOR DELETE
TO authenticated
USING (true);

-- 4. Índice para performance em listagem ordenada
CREATE INDEX IF NOT EXISTS idx_studio_fotos_agencia_criado_em 
ON public.studio_fotos_agencia (criado_em DESC);

-- 5. Bucket de Storage studio-propostas (caso ainda não exista)
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-propostas', 'studio-propostas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Políticas de RLS para o Bucket studio-propostas
DROP POLICY IF EXISTS "Acesso público ou autenticado ao bucket studio-propostas" ON storage.objects;
CREATE POLICY "Acesso público ou autenticado ao bucket studio-propostas"
ON storage.objects FOR SELECT
USING (bucket_id = 'studio-propostas');

DROP POLICY IF EXISTS "Upload no bucket studio-propostas por usuários autenticados" ON storage.objects;
CREATE POLICY "Upload no bucket studio-propostas por usuários autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'studio-propostas');

DROP POLICY IF EXISTS "Exclusão no bucket studio-propostas por usuários autenticados" ON storage.objects;
CREATE POLICY "Exclusão no bucket studio-propostas por usuários autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'studio-propostas');
