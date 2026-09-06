-- Migration: Adicionar coluna passaportes (JSONB) na tabela clientes
-- Permite armazenar múltiplos passaportes por cliente/família

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS passaportes JSONB DEFAULT '[]'::jsonb;

-- Migração retroativa dos clientes existentes que já possuem passaporte_numero
UPDATE public.clientes
SET passaportes = jsonb_build_array(
    jsonb_build_object(
        'nome', COALESCE(nome, 'Passageiro Titular'),
        'numero', passaporte_numero,
        'validade', COALESCE(passaporte_validade::text, '')
    )
)
WHERE (passaportes IS NULL OR passaportes = '[]'::jsonb)
  AND passaporte_numero IS NOT NULL 
  AND TRIM(passaporte_numero) != '';
