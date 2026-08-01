-- Criar a tabela de conferências de LOC
CREATE TABLE IF NOT EXISTS public.loc_conferencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    codigo_localizador VARCHAR(100) NOT NULL,
    conferido BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_viagem_loc UNIQUE (viagem_id, codigo_localizador)
);

-- Habilitar RLS para loc_conferencias
ALTER TABLE public.loc_conferencias ENABLE ROW LEVEL SECURITY;

-- Políticas para loc_conferencias
CREATE POLICY "Permitir leitura para usuários autenticados em loc_conferencias" ON public.loc_conferencias
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir escrita para usuários autenticados em loc_conferencias" ON public.loc_conferencias
    USING (auth.role() = 'authenticated');
