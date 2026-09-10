-- ============================================================================
-- SCRIPT DE ROLLBACK INSTANTÂNEO — MALTA VIAGENS
-- Remove em 1 segundo todas as viagens e clientes importados nesta migração
-- sem afetar qualquer outro registro pré-existente no PaxFlow.
-- ============================================================================

BEGIN;

-- 1. Excluir todas as viagens vinculadas ao lote
DELETE FROM public.viagens 
WHERE origem = 'MIGRACAO_MALTA_20260909';

-- 2. Excluir todos os clientes criados exclusivamente nesta migração
DELETE FROM public.clientes 
WHERE 'MIGRACAO_MALTA_20260909' = ANY(classificacoes);

COMMIT;
