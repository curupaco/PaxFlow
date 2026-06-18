-- Adiciona coluna de classificações acumuladas ao perfil do cliente
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS classificacoes TEXT[] DEFAULT '{}'::TEXT[];

-- Adiciona coluna de origem específica do lead ao orçamento
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS origem TEXT;

-- Adiciona coluna de origem específica da viagem
ALTER TABLE public.viagens ADD COLUMN IF NOT EXISTS origem TEXT;
