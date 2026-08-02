-- Migration to update public.lembretes: make orcamento_id nullable, add viagem_id and criador_id
ALTER TABLE public.lembretes ALTER COLUMN orcamento_id DROP NOT NULL;

ALTER TABLE public.lembretes ADD COLUMN IF NOT EXISTS viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE;

ALTER TABLE public.lembretes ADD COLUMN IF NOT EXISTS criador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
