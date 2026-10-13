-- ============================================================================
-- PAXFLOW - FORMA DE DEVOLUÇÃO EM REEMBOLSOS
-- Data: 2026-10-13
-- Descrição:
--   Adiciona a coluna forma_devolucao na tabela public.reembolsos para registrar
--   a modalidade de devolução solicitada (Estorno no Cartão, Pix/Transferência,
--   Carta de Crédito / Voucher Fornecedor).
-- ============================================================================

ALTER TABLE IF EXISTS public.reembolsos
ADD COLUMN IF NOT EXISTS forma_devolucao TEXT;

CREATE INDEX IF NOT EXISTS idx_reembolsos_forma_devolucao 
ON public.reembolsos(forma_devolucao);