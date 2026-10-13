-- ============================================================================
-- PAXFLOW - VINCULAÇÃO DE DOCUMENTOS A PASSAGEIROS DA VIAGEM
-- Data: 2026-10-13
-- Descrição:
--   Adiciona a coluna passageiro_nome na tabela documentos_anexos para
--   identificar com precisão o passageiro titular ou dependente ao qual o
--   documento pessoal foi associado em viagens com múltiplos passageiros.
-- ============================================================================

ALTER TABLE IF EXISTS public.documentos_anexos
ADD COLUMN IF NOT EXISTS passageiro_nome TEXT;

CREATE INDEX IF NOT EXISTS idx_documentos_anexos_passageiro_nome 
ON public.documentos_anexos(passageiro_nome);
