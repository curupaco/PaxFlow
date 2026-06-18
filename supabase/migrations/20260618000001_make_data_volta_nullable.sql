-- Altera a coluna data_volta na tabela viagens para permitir valores nulos
ALTER TABLE public.viagens ALTER COLUMN data_volta DROP NOT NULL;
