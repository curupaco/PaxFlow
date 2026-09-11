-- ============================================================================
-- PAXFLOW - MIGRAÇÃO DE CONTATOS PRÉ-EMBARQUE
-- Data: 2026-09-11
-- Descrição:
--   Adiciona a coluna 'contatos_embarque' (JSONB) na tabela 'viagens'
-- ============================================================================

ALTER TABLE public.viagens 
ADD COLUMN IF NOT EXISTS contatos_embarque JSONB DEFAULT '{}'::jsonb;
