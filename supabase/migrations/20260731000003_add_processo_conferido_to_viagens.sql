-- Migração para adicionar coluna processo_conferido na tabela viagens
ALTER TABLE public.viagens ADD COLUMN IF NOT EXISTS processo_conferido BOOLEAN DEFAULT false NOT NULL;
