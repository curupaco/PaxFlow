-- ==============================================================================
-- PAXFLOW: Suporte a Rateio Customizado de RAV em Divisões de Viagens
-- Data: 13/10/2026
-- ==============================================================================

-- 1. Adiciona coluna percentual_rav na tabela viagens_divisoes
ALTER TABLE public.viagens_divisoes 
ADD COLUMN IF NOT EXISTS percentual_rav NUMERIC(5, 2) CHECK (percentual_rav >= 0 AND percentual_rav <= 100);

-- 2. Comentário explicativo da coluna
COMMENT ON COLUMN public.viagens_divisoes.percentual_rav IS 'Percentual de participação exclusivo sobre o lucro de RAV/taxas de emissão aérea. Se nulo, herda o percentual geral da venda.';
