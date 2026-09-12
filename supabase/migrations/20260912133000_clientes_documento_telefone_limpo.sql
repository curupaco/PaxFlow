-- ============================================================================
-- PAXFLOW - BUSCA OTIMIZADA DE CLIENTES POR CPF E TELEFONE SEM PONTUAÇÃO
-- Data: 2026-09-12
-- Descrição:
--   Cria colunas geradas e indexadas (STORED) para documento (CPF/CNPJ) e telefone limpos.
--   Permite busca instantânea e indexada de clientes desconsiderando qualquer pontuação,
--   parênteses, traços, barras ou espaços.
-- ============================================================================

-- 1. Coluna gerada para documento (CPF / CNPJ) limpo apenas com dígitos
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS documento_limpo TEXT 
GENERATED ALWAYS AS (REGEXP_REPLACE(COALESCE(documento, ''), '\D', '', 'g')) STORED;

-- 2. Coluna gerada para telefone limpo apenas com dígitos
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS telefone_limpo TEXT 
GENERATED ALWAYS AS (REGEXP_REPLACE(COALESCE(telefone, ''), '\D', '', 'g')) STORED;

-- 3. Criação de índices B-tree para aceleração sub-milisegundo
CREATE INDEX IF NOT EXISTS idx_clientes_documento_limpo ON public.clientes (documento_limpo);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone_limpo ON public.clientes (telefone_limpo);
