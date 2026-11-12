-- ============================================================================
-- MIGRAÇÃO DE GOVERNANÇA: Habilitar RLS e Políticas de Leitura para tipos_produto
-- ============================================================================

-- 1. Habilitar leitura real da tabela tipos_produto para usuários autenticados
DROP POLICY IF EXISTS "Permitir leitura de tipos_produto para usuários autenticados" ON public.tipos_produto;
CREATE POLICY "Permitir leitura de tipos_produto para usuários autenticados" 
ON public.tipos_produto 
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Habilitar leitura também para papéis anônimos se aplicável
DROP POLICY IF EXISTS "Permitir leitura de tipos_produto para anon" ON public.tipos_produto;
CREATE POLICY "Permitir leitura de tipos_produto para anon" 
ON public.tipos_produto 
FOR SELECT 
TO anon 
USING (true);

-- 3. Inserir dados reais iniciais na tabela física caso esteja vazia
INSERT INTO public.tipos_produto (nome, icone, ativo, campos_adicionais)
VALUES 
  ('Aéreo Operadora', '✈️', true, '[]'::jsonb),
  ('Aéreo Facial', '✈️', true, '[]'::jsonb),
  ('Hotel', '🏨', true, '[]'::jsonb),
  ('Carro', '🚗', true, '[]'::jsonb),
  ('Cruzeiro', '🚢', true, '[]'::jsonb),
  ('Ingressos', '🎫', true, '[]'::jsonb),
  ('Passeios', '🎟️', true, '[]'::jsonb),
  ('Seguro Viagem', '🛡️', true, '[]'::jsonb),
  ('Transfer', '🚐', true, '[]'::jsonb),
  ('Trem', '🚂', true, '[]'::jsonb),
  ('Circuito', '🗺️', true, '[]'::jsonb),
  ('Cias aéreas - Assento/bagagem', '🧳', true, '[]'::jsonb),
  ('Cias aéreas - Emissão Com Pontos', '🪙', true, '[]'::jsonb),
  ('MARKUP', '💎', true, '[]'::jsonb),
  ('RAV - 12%', '⚡', true, '[]'::jsonb),
  ('Diversos', '📦', true, '[]'::jsonb)
ON CONFLICT (nome) DO UPDATE SET ativo = true;

