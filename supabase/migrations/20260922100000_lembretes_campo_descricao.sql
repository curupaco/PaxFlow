-- ============================================================================
-- Migração: Adição do campo de descrição na tabela de lembretes
-- ============================================================================

ALTER TABLE public.lembretes 
ADD COLUMN IF NOT EXISTS descricao TEXT;

COMMENT ON COLUMN public.lembretes.descricao IS 'Descrição ou assunto detalhado do lembrete operacional cadastrado';
