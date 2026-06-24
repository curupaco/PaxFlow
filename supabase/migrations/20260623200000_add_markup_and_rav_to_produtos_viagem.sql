-- Migração: Adiciona detalhamento de valores (markup, rav) na tabela de produtos
ALTER TABLE public.produtos_viagem 
ADD COLUMN IF NOT EXISTS markup NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
ADD COLUMN IF NOT EXISTS rav NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
