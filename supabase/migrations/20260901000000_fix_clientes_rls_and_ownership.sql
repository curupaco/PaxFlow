-- ============================================================
-- PaxFlow Migration: Correção de RLS e Titularidade de Clientes
-- ============================================================

-- 1. Atualizar a Política RLS de Leitura (SELECT) na tabela public.clientes
DROP POLICY IF EXISTS "Leitura de clientes para o próprio consultor ou admin" ON public.clientes;

CREATE POLICY "Leitura de clientes para o próprio consultor ou admin" 
ON public.clientes FOR SELECT TO authenticated 
USING (
  consultor_responsavel_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.orcamentos 
    WHERE orcamentos.cliente_id = clientes.id 
    AND orcamentos.consultor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE viagens.cliente_id = clientes.id 
    AND viagens.consultor_id = auth.uid()
  )
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 2. Script de Correção Histórica (Backfill): Reatribuição do consultor responsável com base nos orçamentos existentes
UPDATE public.clientes c
SET consultor_responsavel_id = subquery.consultor_id
FROM (
  SELECT DISTINCT ON (cliente_id) cliente_id, consultor_id
  FROM public.orcamentos
  WHERE cliente_id IS NOT NULL AND consultor_id IS NOT NULL
  ORDER BY cliente_id, created_at ASC
) subquery
WHERE c.id = subquery.cliente_id
  AND c.consultor_responsavel_id IS DISTINCT FROM subquery.consultor_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = c.consultor_responsavel_id 
    AND p.role = 'admin'
  );

-- 3. Script de Correção Histórica Complementar (Backfill com base em viagens existentes)
UPDATE public.clientes c
SET consultor_responsavel_id = subquery.consultor_id
FROM (
  SELECT DISTINCT ON (cliente_id) cliente_id, consultor_id
  FROM public.viagens
  WHERE cliente_id IS NOT NULL AND consultor_id IS NOT NULL
  ORDER BY cliente_id, created_at ASC
) subquery
WHERE c.id = subquery.cliente_id
  AND c.consultor_responsavel_id IS DISTINCT FROM subquery.consultor_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = c.consultor_responsavel_id 
    AND p.role = 'admin'
  );
