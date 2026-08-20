-- 1. Criar a tabela public.meta_periodos
CREATE TABLE IF NOT EXISTS public.meta_periodos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tipo_calculo VARCHAR(50) NOT NULL CHECK (tipo_calculo IN ('bruto', 'lucro')),
    is_campanha BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Criar a tabela public.meta_faixas
CREATE TABLE IF NOT EXISTS public.meta_faixas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    periodo_id UUID REFERENCES public.meta_periodos(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    valor_minimo NUMERIC(15, 2) NOT NULL,
    bonus_xp INTEGER DEFAULT 0 NOT NULL,
    recompensa TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Habilitar RLS nas tabelas
ALTER TABLE public.meta_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_faixas ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas para meta_periodos
DROP POLICY IF EXISTS "Leitura de metas permitida a todos autenticados" ON public.meta_periodos;
DROP POLICY IF EXISTS "Acesso total de metas para administradores" ON public.meta_periodos;

CREATE POLICY "Leitura de metas permitida a todos autenticados"
ON public.meta_periodos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Acesso total de metas para administradores"
ON public.meta_periodos FOR ALL
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 5. Criar políticas para meta_faixas
DROP POLICY IF EXISTS "Leitura de faixas permitida a todos autenticados" ON public.meta_faixas;
DROP POLICY IF EXISTS "Acesso total de faixas para administradores" ON public.meta_faixas;

CREATE POLICY "Leitura de faixas permitida a todos autenticados"
ON public.meta_faixas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Acesso total de faixas para administradores"
ON public.meta_faixas FOR ALL
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
