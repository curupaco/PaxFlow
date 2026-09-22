-- Migração: 20260922110000_orcamentos_contato_desistencia.sql
-- Adiciona colunas para rastreamento de contato em orçamentos desistidos

ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS contato_realizado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contato_realizado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contato_realizado_em TIMESTAMP WITH TIME ZONE;

-- Índice para acelerar filtros e auditoria de desistências
CREATE INDEX IF NOT EXISTS idx_orcamentos_contato_desistencia 
ON public.orcamentos(status, sub_status, contato_realizado);
