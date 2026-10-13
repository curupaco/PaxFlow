-- ============================================================================
-- PAXFLOW - RESOLUÇÃO DE SCHEMA DRIFT: COLUNA updated_at NA TABELA viagens
-- Data: 2026-10-13
-- Descrição:
--   Adiciona a coluna updated_at na tabela public.viagens para suporte
--   a triggers de atualização de timestamps, automação de reembolsos e RPCs.
-- ============================================================================

-- 1. Adicionar a coluna updated_at na tabela public.viagens
ALTER TABLE IF EXISTS public.viagens 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- 2. Criar índice para buscas e ordenações eficientes por updated_at
CREATE INDEX IF NOT EXISTS idx_viagens_updated_at 
ON public.viagens(updated_at);

-- 3. Atualizar registros históricos para que updated_at herde created_at
UPDATE public.viagens 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- 4. Função e trigger para manter updated_at sempre sincronizado
CREATE OR REPLACE FUNCTION public.set_viagens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_viagens_updated_at ON public.viagens;
CREATE TRIGGER trigger_viagens_updated_at
BEFORE UPDATE ON public.viagens
FOR EACH ROW
EXECUTE FUNCTION public.set_viagens_updated_at();
