-- ============================================================================
-- PAXFLOW STUDIO - TABELA DE PROPOSTAS E CADERNOS UNIFICADOS
-- Data: 2026-09-11
-- Descrição:
--   Cria a tabela 'studio_propostas' para persistência de propostas visuais,
--   cadernos de viagem, dados extraídos de PDFs e registro de aceite formal.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.studio_propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID,
  consultor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consultor_nome TEXT,
  cliente_nome TEXT NOT NULL,
  cliente_whatsapp TEXT,
  cliente_email TEXT,
  destino TEXT NOT NULL,
  data_ida DATE,
  data_volta DATE,
  valor_total NUMERIC(12,2) DEFAULT 0,
  moeda TEXT DEFAULT 'BRL',
  foto_capa_url TEXT,
  dados_extraidos JSONB DEFAULT '{}'::jsonb,
  itinerario_dias JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'RASCUNHO', -- RASCUNHO, ENVIADO, APROVADO, EFETIVADO
  aceite_formal JSONB, -- { data_aceite, ip, cliente_nome, documento, dispositivo }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_propostas_status ON public.studio_propostas(status);
CREATE INDEX IF NOT EXISTS idx_studio_propostas_consultor ON public.studio_propostas(consultor_id);
