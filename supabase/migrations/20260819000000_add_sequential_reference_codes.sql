-- ============================================================================
-- MIGRATION: Adiciona sequências de ID interno e códigos de referência formatados
-- ============================================================================

-- 1. TABELA: clientes (CLI-XXXX)
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS seq_id INT;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.clientes
)
UPDATE public.clientes t
SET seq_id = o.rn
FROM ordered o
WHERE t.id = o.id AND t.seq_id IS NULL;

CREATE SEQUENCE IF NOT EXISTS public.clientes_seq_id_seq;
DO $$
DECLARE
  max_id INT;
BEGIN
  SELECT COALESCE(MAX(seq_id), 0) INTO max_id FROM public.clientes;
  PERFORM setval('public.clientes_seq_id_seq', max_id + 1, false);
END;
$$;

ALTER TABLE public.clientes ALTER COLUMN seq_id SET DEFAULT nextval('public.clientes_seq_id_seq');
ALTER TABLE public.clientes ALTER COLUMN seq_id SET NOT NULL;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS codigo_ref TEXT GENERATED ALWAYS AS ('CLI-' || lpad(seq_id::text, 4, '0')) STORED;


-- 2. TABELA: viagens (VIA-XXXX)
ALTER TABLE public.viagens ADD COLUMN IF NOT EXISTS seq_id INT;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.viagens
)
UPDATE public.viagens t
SET seq_id = o.rn
FROM ordered o
WHERE t.id = o.id AND t.seq_id IS NULL;

CREATE SEQUENCE IF NOT EXISTS public.viagens_seq_id_seq;
DO $$
DECLARE
  max_id INT;
BEGIN
  SELECT COALESCE(MAX(seq_id), 0) INTO max_id FROM public.viagens;
  PERFORM setval('public.viagens_seq_id_seq', max_id + 1, false);
END;
$$;

ALTER TABLE public.viagens ALTER COLUMN seq_id SET DEFAULT nextval('public.viagens_seq_id_seq');
ALTER TABLE public.viagens ALTER COLUMN seq_id SET NOT NULL;
ALTER TABLE public.viagens ADD COLUMN IF NOT EXISTS codigo_ref TEXT GENERATED ALWAYS AS ('VIA-' || lpad(seq_id::text, 4, '0')) STORED;


-- 3. TABELA: reembolsos (RBS-XXXX)
ALTER TABLE public.reembolsos ADD COLUMN IF NOT EXISTS seq_id INT;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.reembolsos
)
UPDATE public.reembolsos t
SET seq_id = o.rn
FROM ordered o
WHERE t.id = o.id AND t.seq_id IS NULL;

CREATE SEQUENCE IF NOT EXISTS public.reembolsos_seq_id_seq;
DO $$
DECLARE
  max_id INT;
BEGIN
  SELECT COALESCE(MAX(seq_id), 0) INTO max_id FROM public.reembolsos;
  PERFORM setval('public.reembolsos_seq_id_seq', max_id + 1, false);
END;
$$;

ALTER TABLE public.reembolsos ALTER COLUMN seq_id SET DEFAULT nextval('public.reembolsos_seq_id_seq');
ALTER TABLE public.reembolsos ALTER COLUMN seq_id SET NOT NULL;
ALTER TABLE public.reembolsos ADD COLUMN IF NOT EXISTS codigo_ref TEXT GENERATED ALWAYS AS ('RBS-' || lpad(seq_id::text, 4, '0')) STORED;


-- 4. TABELA: orcamentos (ORC-XXXX)
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS seq_id INT;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.orcamentos
)
UPDATE public.orcamentos t
SET seq_id = o.rn
FROM ordered o
WHERE t.id = o.id AND t.seq_id IS NULL;

CREATE SEQUENCE IF NOT EXISTS public.orcamentos_seq_id_seq;
DO $$
DECLARE
  max_id INT;
BEGIN
  SELECT COALESCE(MAX(seq_id), 0) INTO max_id FROM public.orcamentos;
  PERFORM setval('public.orcamentos_seq_id_seq', max_id + 1, false);
END;
$$;

ALTER TABLE public.orcamentos ALTER COLUMN seq_id SET DEFAULT nextval('public.orcamentos_seq_id_seq');
ALTER TABLE public.orcamentos ALTER COLUMN seq_id SET NOT NULL;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS codigo_ref TEXT GENERATED ALWAYS AS ('ORC-' || lpad(seq_id::text, 4, '0')) STORED;
