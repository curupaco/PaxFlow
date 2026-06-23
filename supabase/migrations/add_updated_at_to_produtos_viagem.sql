-- Migração para adicionar a coluna updated_at na tabela de produtos_viagem se ela não existir
ALTER TABLE public.produtos_viagem ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
