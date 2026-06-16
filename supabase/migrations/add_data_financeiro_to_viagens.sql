-- Migração para adicionar suporte ao campo DATA FINANCEIRO na tabela viagens
ALTER TABLE public.viagens 
ADD COLUMN IF NOT EXISTS data_financeiro DATE;
