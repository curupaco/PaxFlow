-- Adicionar colunas de Meta Loja na tabela meta_periodos
ALTER TABLE public.meta_periodos ADD COLUMN IF NOT EXISTS is_meta_loja BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.meta_periodos ADD COLUMN IF NOT EXISTS valor_meta NUMERIC(15, 2) DEFAULT 0;
