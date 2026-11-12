-- ============================================================================
-- MIGRAÇÃO: ADICIONAR STATUS 'em_viagem' À TABELA VIAGENS
-- Data: 2026-11-12
-- ============================================================================

-- 1. Atualizar a restrição de verificação (CHECK constraint) na tabela viagens
ALTER TABLE public.viagens DROP CONSTRAINT IF EXISTS viagens_status_check;

ALTER TABLE public.viagens ADD CONSTRAINT viagens_status_check 
  CHECK (status IN (
    'fechado',
    'pos_venda',
    'pre_embarque',
    'em_viagem',
    'pos_viagem',
    'reembolso_solicitado',
    'concluida',
    'cancelada'
  ));

-- 2. Índice para consultas filtradas por status
CREATE INDEX IF NOT EXISTS idx_viagens_status ON public.viagens(status);

