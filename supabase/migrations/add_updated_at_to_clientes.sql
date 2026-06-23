-- Adiciona a coluna updated_at na tabela de clientes se ela não existir
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
