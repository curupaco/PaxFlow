-- Migração: Adiciona coluna valor_viagem na tabela de orçamentos
ALTER TABLE public.orcamentos 
ADD COLUMN IF NOT EXISTS valor_viagem NUMERIC;
