-- ==============================================================================
-- MIGRATION: CONTAS A PAGAR - GESTÃO DE LOTES CONSOLIDADOS E FORNECEDORES
-- Data: 09/11/2026
-- Descrição:
--   1. Adiciona campos de pagamento consolidado na tabela fin_remessas (forma_pagamento, conta_bancaria_id, data_pagamento, baixado_por).
--   2. Criação da tabela oficial fin_fornecedores (Nome, CPF/CNPJ, Observações) com RLS e índices.
-- ==============================================================================

-- 1. Ampliação da Tabela de Remessas (Lotes) com rastreamento financeiro completo
ALTER TABLE public.fin_remessas 
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES public.fin_contas_bancarias(id),
ADD COLUMN IF NOT EXISTS data_pagamento DATE,
ADD COLUMN IF NOT EXISTS baixado_por UUID REFERENCES auth.users(id);

-- Índice para performance de remessas por conta bancária
CREATE INDEX IF NOT EXISTS idx_fin_remessas_conta_bancaria ON public.fin_remessas(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_fin_remessas_status ON public.fin_remessas(status);

-- 2. Tabela de Fornecedores e Favorecidos Oficiais
CREATE TABLE IF NOT EXISTS public.fin_fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para busca ágil de fornecedores
CREATE INDEX IF NOT EXISTS idx_fin_fornecedores_nome ON public.fin_fornecedores(nome);
CREATE INDEX IF NOT EXISTS idx_fin_fornecedores_ativo ON public.fin_fornecedores(ativo);

-- 3. RLS (Row Level Security) para fin_fornecedores
ALTER TABLE public.fin_fornecedores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "fin_fornecedores_policy" ON public.fin_fornecedores;
    CREATE POLICY "fin_fornecedores_policy" ON public.fin_fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;

