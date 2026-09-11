-- ============================================================================
-- PAXFLOW - TABELA DE MÚLTIPLOS ANEXOS (VIAGENS E CLIENTES)
-- Data: 2026-09-11
-- Descrição:
--   Permite anexar múltiplos documentos a viagens e clientes, com
--   categorização (passaporte, visto, vouchers, seguro) e rótulo identificador.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.documentos_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID,
  viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  rotulo TEXT NOT NULL,
  tipo_documento TEXT NOT NULL DEFAULT 'OUTROS',
  nome_original TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documentos_anexos_viagem ON public.documentos_anexos(viagem_id);
CREATE INDEX IF NOT EXISTS idx_documentos_anexos_cliente ON public.documentos_anexos(cliente_id);
