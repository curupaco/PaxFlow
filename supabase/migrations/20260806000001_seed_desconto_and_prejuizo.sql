-- Seed DESCONTO and PREJUÍZO payment methods
INSERT INTO public.formas_recebimento (nome, icone, ativo)
SELECT 'DESCONTO', '🏷️', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.formas_recebimento WHERE UPPER(TRIM(nome)) = 'DESCONTO'
);

INSERT INTO public.formas_recebimento (nome, icone, ativo)
SELECT 'PREJUÍZO', '📉', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.formas_recebimento WHERE UPPER(TRIM(nome)) = 'PREJUÍZO'
);
