-- ==============================================================================
-- MIGRATION: Conciliação Bancária - Extratos Bancários (Lotes, Transações e Vínculos)
-- Data: 2026-11-04
-- Descrição:
--   1. Garante a existência das tabelas 'extratos_bancarios_lotes',
--      'extratos_bancarios_transacoes', 'extratos_conciliacoes_vinculos'
--      e 'competencias_financeiras_fechadas'.
--   2. Adiciona colunas 'banco_nome' e 'banco_origem' para resolver schema drift
--      e recarrega o schema cache do PostgREST.
-- ==============================================================================

-- 1. Tabela de Lotes de Extratos Importados
CREATE TABLE IF NOT EXISTS public.extratos_bancarios_lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_arquivo TEXT NOT NULL,
    banco_nome TEXT,
    banco_origem TEXT,
    arquivo_storage_path TEXT,
    data_inicio_extrato DATE,
    data_fim_extrato DATE,
    total_registros INTEGER DEFAULT 0,
    total_creditos NUMERIC(12, 2) DEFAULT 0,
    total_debitos NUMERIC(12, 2) DEFAULT 0,
    criado_por UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas essenciais caso a tabela já exista com schema antigo
ALTER TABLE public.extratos_bancarios_lotes ADD COLUMN IF NOT EXISTS banco_nome TEXT;
ALTER TABLE public.extratos_bancarios_lotes ADD COLUMN IF NOT EXISTS banco_origem TEXT;
ALTER TABLE public.extratos_bancarios_lotes ADD COLUMN IF NOT EXISTS arquivo_storage_path TEXT;
ALTER TABLE public.extratos_bancarios_lotes ADD COLUMN IF NOT EXISTS data_inicio_extrato DATE;
ALTER TABLE public.extratos_bancarios_lotes ADD COLUMN IF NOT EXISTS data_fim_extrato DATE;
ALTER TABLE public.extratos_bancarios_lotes ADD COLUMN IF NOT EXISTS total_registros INTEGER DEFAULT 0;
ALTER TABLE public.extratos_bancarios_lotes ADD COLUMN IF NOT EXISTS total_creditos NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.extratos_bancarios_lotes ADD COLUMN IF NOT EXISTS total_debitos NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.extratos_bancarios_lotes ADD COLUMN IF NOT EXISTS criado_por UUID;

-- 2. Tabela de Transações Individuais do Extrato
CREATE TABLE IF NOT EXISTS public.extratos_bancarios_transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id UUID REFERENCES public.extratos_bancarios_lotes(id) ON DELETE CASCADE,
    banco_origem TEXT,
    banco_nome TEXT,
    data_transacao DATE NOT NULL,
    descricao TEXT NOT NULL,
    documento TEXT,
    fitid TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('CREDITO', 'DEBITO')),
    valor NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'conciliado', 'justificado')),
    categoria_nao_venda TEXT,
    observacao_justificativa TEXT,
    data_conciliacao TIMESTAMPTZ,
    conciliado_por UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.extratos_bancarios_transacoes ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES public.extratos_bancarios_lotes(id) ON DELETE CASCADE;
ALTER TABLE public.extratos_bancarios_transacoes ADD COLUMN IF NOT EXISTS banco_origem TEXT;
ALTER TABLE public.extratos_bancarios_transacoes ADD COLUMN IF NOT EXISTS banco_nome TEXT;
ALTER TABLE public.extratos_bancarios_transacoes ADD COLUMN IF NOT EXISTS documento TEXT;
ALTER TABLE public.extratos_bancarios_transacoes ADD COLUMN IF NOT EXISTS fitid TEXT;
ALTER TABLE public.extratos_bancarios_transacoes ADD COLUMN IF NOT EXISTS categoria_nao_venda TEXT;
ALTER TABLE public.extratos_bancarios_transacoes ADD COLUMN IF NOT EXISTS observacao_justificativa TEXT;
ALTER TABLE public.extratos_bancarios_transacoes ADD COLUMN IF NOT EXISTS data_conciliacao TIMESTAMPTZ;
ALTER TABLE public.extratos_bancarios_transacoes ADD COLUMN IF NOT EXISTS conciliado_por UUID;

-- 3. Tabela de Vínculos de Conciliação (Transação Extrato <-> LOC Pagamento)
CREATE TABLE IF NOT EXISTS public.extratos_conciliacoes_vinculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extrato_item_id UUID REFERENCES public.extratos_bancarios_transacoes(id) ON DELETE CASCADE,
    loc_pagamento_id UUID REFERENCES public.loc_pagamentos(id) ON DELETE CASCADE,
    valor_taxa_desconto NUMERIC(12, 2) DEFAULT 0,
    criado_por UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Competências Fechadas
CREATE TABLE IF NOT EXISTS public.competencias_financeiras_fechadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano_mes TEXT NOT NULL,
    total_conciliado NUMERIC(12, 2) DEFAULT 0,
    total_diferenca NUMERIC(12, 2) DEFAULT 0,
    fechado_por UUID,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Habilitar RLS e Políticas de Acesso
ALTER TABLE public.extratos_bancarios_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extratos_bancarios_transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extratos_conciliacoes_vinculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencias_financeiras_fechadas ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Acesso total extratos_bancarios_lotes para usuarios autenticados" ON public.extratos_bancarios_lotes;
    CREATE POLICY "Acesso total extratos_bancarios_lotes para usuarios autenticados" 
    ON public.extratos_bancarios_lotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acesso total extratos_bancarios_transacoes para usuarios autenticados" ON public.extratos_bancarios_transacoes;
    CREATE POLICY "Acesso total extratos_bancarios_transacoes para usuarios autenticados" 
    ON public.extratos_bancarios_transacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acesso total extratos_conciliacoes_vinculos para usuarios autenticados" ON public.extratos_conciliacoes_vinculos;
    CREATE POLICY "Acesso total extratos_conciliacoes_vinculos para usuarios autenticados" 
    ON public.extratos_conciliacoes_vinculos FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Acesso total competencias_financeiras_fechadas para usuarios autenticados" ON public.competencias_financeiras_fechadas;
    CREATE POLICY "Acesso total competencias_financeiras_fechadas para usuarios autenticados" 
    ON public.competencias_financeiras_fechadas FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;

-- 6. Recarregar Schema Cache do PostgREST
NOTIFY pgrst, 'reload schema';

