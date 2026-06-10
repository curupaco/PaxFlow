-- Migração: Adiciona detalhamento de valores (tarifa, taxa, comissão) na tabela de produtos
ALTER TABLE public.produtos_viagem 
ADD COLUMN IF NOT EXISTS tarifa NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
ADD COLUMN IF NOT EXISTS taxa NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
ADD COLUMN IF NOT EXISTS comissao NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
