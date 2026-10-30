-- ==============================================================================
-- PAXFLOW STUDIO: COLUNAS ESTENDIDAS, MÉTRICAS E POLÍTICAS DE RLS
-- Data: 2026-10-30
-- Descrição:
--   1. Adiciona colunas para consultor personalizado, cabeçalho e métricas de visualização.
--   2. Habilita RLS e garante permissões para autenticados e link público de propostas.
-- ==============================================================================

-- 1. Garante colunas estendidas na tabela studio_propostas
ALTER TABLE public.studio_propostas
  ADD COLUMN IF NOT EXISTS consultor_avatar TEXT,
  ADD COLUMN IF NOT EXISTS consultor_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS consultor_telefone TEXT,
  ADD COLUMN IF NOT EXISTS consultor_email TEXT,
  ADD COLUMN IF NOT EXISTS titulo_cabecalho TEXT DEFAULT 'PAXFLOW LUXURY TRAVEL',
  ADD COLUMN IF NOT EXISTS visualizacoes_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultima_visualizacao_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS orcamento_origem_id UUID;

-- 2. Índices de performance para busca por orçamento e listagem
CREATE INDEX IF NOT EXISTS idx_studio_propostas_orcamento_origem ON public.studio_propostas(orcamento_origem_id);
CREATE INDEX IF NOT EXISTS idx_studio_propostas_created_at ON public.studio_propostas(created_at DESC);

-- 3. Habilitação de RLS
ALTER TABLE public.studio_propostas ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS
-- Leitura pública para viajantes acessarem o link público de proposta (#proposta?id=...)
DROP POLICY IF EXISTS "Leitura de propostas por autenticados e link público" ON public.studio_propostas;
CREATE POLICY "Leitura de propostas por autenticados e link público"
ON public.studio_propostas FOR SELECT
TO public
USING (true);

-- Inserção e criação de propostas por consultores autenticados da agência
DROP POLICY IF EXISTS "Inserção de propostas por autenticados" ON public.studio_propostas;
CREATE POLICY "Inserção de propostas por autenticados"
ON public.studio_propostas FOR INSERT
TO authenticated
WITH CHECK (true);

-- Atualização por autenticados (consultores) e pelo cliente viajante (aceite formal e métricas)
DROP POLICY IF EXISTS "Atualização de propostas por autenticados e aceite público" ON public.studio_propostas;
CREATE POLICY "Atualização de propostas por autenticados e aceite público"
ON public.studio_propostas FOR UPDATE
TO public
USING (true);

-- Exclusão de propostas somente por usuários autenticados
DROP POLICY IF EXISTS "Exclusão de propostas por autenticados" ON public.studio_propostas;
CREATE POLICY "Exclusão de propostas por autenticados"
ON public.studio_propostas FOR DELETE
TO authenticated
USING (true);
