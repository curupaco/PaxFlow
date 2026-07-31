-- 1. Criar a tabela de formas de recebimento
CREATE TABLE IF NOT EXISTS public.formas_recebimento (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    icone VARCHAR(20) DEFAULT '💵' NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS para formas_recebimento
ALTER TABLE public.formas_recebimento ENABLE ROW LEVEL SECURITY;

-- Políticas para formas_recebimento
CREATE POLICY "Permitir leitura pública de formas_recebimento" ON public.formas_recebimento
    FOR SELECT USING (true);

CREATE POLICY "Permitir tudo para administradores autenticados em formas_recebimento" ON public.formas_recebimento
    USING (auth.role() = 'authenticated');

-- 2. Criar a tabela de pagamentos por LOC
CREATE TABLE IF NOT EXISTS public.loc_pagamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    codigo_localizador VARCHAR(100) NOT NULL,
    forma_recebimento_id UUID REFERENCES public.formas_recebimento(id) ON DELETE CASCADE,
    valor NUMERIC DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS para loc_pagamentos
ALTER TABLE public.loc_pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas para loc_pagamentos
CREATE POLICY "Permitir leitura para usuários autenticados em loc_pagamentos" ON public.loc_pagamentos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir escrita para usuários autenticados em loc_pagamentos" ON public.loc_pagamentos
    USING (auth.role() = 'authenticated');
