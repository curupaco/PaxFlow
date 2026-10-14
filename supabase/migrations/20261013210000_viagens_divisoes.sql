-- Migration: 20261013210000_viagens_divisoes.sql
-- Objetivo: Criar tabela para divisão percentual de viagens entre consultores e suporte a sobrescrita por produto

-- 1. Criação da tabela de divisões de viagem entre consultores
CREATE TABLE IF NOT EXISTS public.viagens_divisoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  consultor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  percentual NUMERIC(5, 2) NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  is_titular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uk_viagem_consultor UNIQUE (viagem_id, consultor_id)
);

-- 2. Índices de alta performance para consultas do Dashboard, Relatórios e Metas
CREATE INDEX IF NOT EXISTS idx_viagens_divisoes_consultor ON public.viagens_divisoes(consultor_id);
CREATE INDEX IF NOT EXISTS idx_viagens_divisoes_viagem ON public.viagens_divisoes(viagem_id);

-- 3. Suporte a atribuição direta por produto em casos de sobrescrita individual
ALTER TABLE public.produtos_viagem
ADD COLUMN IF NOT EXISTS consultor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_viagem_consultor ON public.produtos_viagem(consultor_id);

-- 4. Função e trigger para atualização automática de updated_at
CREATE OR REPLACE FUNCTION public.handle_viagens_divisoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_viagens_divisoes_updated_at ON public.viagens_divisoes;
CREATE TRIGGER tr_viagens_divisoes_updated_at
  BEFORE UPDATE ON public.viagens_divisoes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_viagens_divisoes_updated_at();
