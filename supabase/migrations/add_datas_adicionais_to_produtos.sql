-- Migração para adicionar suporte a múltiplas datas por produto/serviço no PaxFlow
ALTER TABLE public.produtos_viagem 
ADD COLUMN IF NOT EXISTS datas_adicionais JSONB DEFAULT '[]'::jsonb;
