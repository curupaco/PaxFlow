-- ==============================================================================
-- PAXFLOW: SANEAMENTO DE SCHEMA, COLUNAS OFICIAIS E EXPURGO DE ZERO-DRIFT
-- Data: 2026-11-05
-- Descrição:
--   1. Adiciona colunas oficiais faltantes em profiles e global_settings_table.
--   2. Atualiza a View global_settings e seu gatilho INSTEAD OF.
--   3. Assegura a criação das tabelas oficiais studio_propostas, documentos_anexos,
--      viagens_divisoes, origens_lead, campanhas_presets e gamification_celebrations.
--   4. Configura índices de performance e políticas de RLS.
-- ==============================================================================

-- 1. COLUNAS FALTANTES EM PROFILES
ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS participa_metricas BOOLEAN DEFAULT TRUE NOT NULL,
    ADD COLUMN IF NOT EXISTS acesso_financeiro BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. COLUNAS FALTANTES EM GLOBAL_SETTINGS_TABLE
ALTER TABLE IF EXISTS public.global_settings_table
    ADD COLUMN IF NOT EXISTS habilitar_studio_pro BOOLEAN DEFAULT TRUE NOT NULL,
    ADD COLUMN IF NOT EXISTS studio_moeda_padrao VARCHAR(10) DEFAULT 'BRL' NOT NULL,
    ADD COLUMN IF NOT EXISTS studio_validade_dias INT DEFAULT 7 NOT NULL,
    ADD COLUMN IF NOT EXISTS studio_permitir_aceite_formal BOOLEAN DEFAULT TRUE NOT NULL,
    ADD COLUMN IF NOT EXISTS notificacoes_financeiro_ativas BOOLEAN DEFAULT TRUE NOT NULL;

-- 3. ATUALIZAÇÃO DA VIEW GLOBAL_SETTINGS E GATILHO INSTEAD OF
DROP VIEW IF EXISTS public.global_settings CASCADE;

CREATE VIEW public.global_settings WITH (security_invoker = true) AS
SELECT 
    id,
    agency_name,
    taxa_cancelamento_padrao,
    prazo_reembolso_dias,
    notificacoes_ativas,
    email_suporte,
    CASE 
        WHEN (SELECT COALESCE(role, 'consultor') FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN google_refresh_token
        ELSE NULL 
    END AS google_refresh_token,
    google_parent_folder_id,
    sla_pre_embarque_dias,
    sla_pos_viagem_dias,
    limite_upload_mb,
    enviar_nps_automatico,
    agency_logo_url,
    agency_primary_color,
    copiloto_ativo,
    permitir_consultor_criar_viagem,
    CASE 
        WHEN (SELECT COALESCE(role, 'consultor') FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN digisac_token
        ELSE NULL 
    END AS digisac_token,
    digisac_domain,
    digisac_service_id,
    digisac_enable_manual_send,
    digisac_enable_chat_history,
    digisac_enable_vouchers,
    digisac_enable_routing,
    digisac_enable_bot_triggers,
    digisac_enable_webhooks,
    tempo_desistencia_orcamento_dias,
    antecedencia_risco_operacional_dias,
    habilitar_risk_score,
    risk_score_janela_carencia_dias,
    risk_score_limite_critico,
    habilitar_next_trip_engine,
    next_trip_corte_prontidao_alta,
    next_trip_snooze_dias,
    habilitar_upsell_preditivo,
    habilitar_studio_pro,
    studio_moeda_padrao,
    studio_validade_dias,
    studio_permitir_aceite_formal,
    notificacoes_financeiro_ativas,
    created_at,
    updated_at
FROM public.global_settings_table;

CREATE OR REPLACE FUNCTION public.manage_global_settings_view()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.global_settings_table
        SET 
            agency_name = NEW.agency_name,
            taxa_cancelamento_padrao = NEW.taxa_cancelamento_padrao,
            prazo_reembolso_dias = NEW.prazo_reembolso_dias,
            notificacoes_ativas = NEW.notificacoes_ativas,
            email_suporte = NEW.email_suporte,
            google_refresh_token = COALESCE(NEW.google_refresh_token, global_settings_table.google_refresh_token),
            google_parent_folder_id = NEW.google_parent_folder_id,
            sla_pre_embarque_dias = NEW.sla_pre_embarque_dias,
            sla_pos_viagem_dias = NEW.sla_pos_viagem_dias,
            limite_upload_mb = NEW.limite_upload_mb,
            enviar_nps_automatico = NEW.enviar_nps_automatico,
            agency_logo_url = NEW.agency_logo_url,
            agency_primary_color = NEW.agency_primary_color,
            copiloto_ativo = NEW.copiloto_ativo,
            permitir_consultor_criar_viagem = NEW.permitir_consultor_criar_viagem,
            digisac_token = COALESCE(NEW.digisac_token, global_settings_table.digisac_token),
            digisac_domain = NEW.digisac_domain,
            digisac_service_id = NEW.digisac_service_id,
            digisac_enable_manual_send = NEW.digisac_enable_manual_send,
            digisac_enable_chat_history = NEW.digisac_enable_chat_history,
            digisac_enable_vouchers = NEW.digisac_enable_vouchers,
            digisac_enable_routing = NEW.digisac_enable_routing,
            digisac_enable_bot_triggers = NEW.digisac_enable_bot_triggers,
            digisac_enable_webhooks = NEW.digisac_enable_webhooks,
            tempo_desistencia_orcamento_dias = NEW.tempo_desistencia_orcamento_dias,
            antecedencia_risco_operacional_dias = NEW.antecedencia_risco_operacional_dias,
            habilitar_risk_score = NEW.habilitar_risk_score,
            risk_score_janela_carencia_dias = NEW.risk_score_janela_carencia_dias,
            risk_score_limite_critico = NEW.risk_score_limite_critico,
            habilitar_next_trip_engine = NEW.habilitar_next_trip_engine,
            next_trip_corte_prontidao_alta = NEW.next_trip_corte_prontidao_alta,
            next_trip_snooze_dias = NEW.next_trip_snooze_dias,
            habilitar_upsell_preditivo = NEW.habilitar_upsell_preditivo,
            habilitar_studio_pro = NEW.habilitar_studio_pro,
            studio_moeda_padrao = NEW.studio_moeda_padrao,
            studio_validade_dias = NEW.studio_validade_dias,
            studio_permitir_aceite_formal = NEW.studio_permitir_aceite_formal,
            notificacoes_financeiro_ativas = NEW.notificacoes_financeiro_ativas,
            updated_at = NOW()
        WHERE public.global_settings_table.id = OLD.id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_global_settings_view_manage ON public.global_settings;
CREATE TRIGGER on_global_settings_view_manage
    INSTEAD OF INSERT OR UPDATE ON public.global_settings
    FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();

-- 4. TABELA OFICIAL: studio_propostas
CREATE TABLE IF NOT EXISTS public.studio_propostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_nome TEXT NOT NULL DEFAULT 'Cliente',
    cliente_whatsapp TEXT,
    cliente_email TEXT,
    destino TEXT NOT NULL DEFAULT 'Destino a definir',
    data_ida DATE,
    data_volta DATE,
    valor_total NUMERIC DEFAULT 0,
    moeda VARCHAR(10) DEFAULT 'BRL',
    foto_capa_url TEXT,
    dados_extraidos JSONB DEFAULT '{}'::jsonb,
    itinerario_dias JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'RASCUNHO',
    aceite_formal JSONB,
    visualizacoes_count INT DEFAULT 0,
    ultima_visualizacao_em TIMESTAMPTZ,
    orcamento_origem_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    consultor_nome TEXT,
    consultor_avatar TEXT,
    consultor_whatsapp TEXT,
    consultor_telefone TEXT,
    consultor_email TEXT,
    titulo_cabecalho TEXT DEFAULT 'PAXFLOW LUXURY TRAVEL',
    agencia_id UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_studio_propostas_orcamento ON public.studio_propostas(orcamento_origem_id);
CREATE INDEX IF NOT EXISTS idx_studio_propostas_consultor ON public.studio_propostas(consultor_id);
CREATE INDEX IF NOT EXISTS idx_studio_propostas_created ON public.studio_propostas(created_at DESC);
ALTER TABLE public.studio_propostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_propostas_public_select" ON public.studio_propostas;
CREATE POLICY "studio_propostas_public_select" ON public.studio_propostas FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "studio_propostas_auth_all" ON public.studio_propostas;
CREATE POLICY "studio_propostas_auth_all" ON public.studio_propostas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. TABELA OFICIAL: documentos_anexos
CREATE TABLE IF NOT EXISTS public.documentos_anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agencia_id UUID,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    rotulo TEXT NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    numero_documento TEXT,
    data_validade DATE,
    nome_original TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    tamanho_bytes BIGINT,
    passageiro_nome TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documentos_anexos_viagem ON public.documentos_anexos(viagem_id);
CREATE INDEX IF NOT EXISTS idx_documentos_anexos_cliente ON public.documentos_anexos(cliente_id);
ALTER TABLE public.documentos_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_anexos_auth_all" ON public.documentos_anexos;
CREATE POLICY "documentos_anexos_auth_all" ON public.documentos_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. TABELA OFICIAL: viagens_divisoes
CREATE TABLE IF NOT EXISTS public.viagens_divisoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    percentual NUMERIC(5,2) NOT NULL,
    percentual_rav NUMERIC(5,2) NOT NULL DEFAULT 100,
    is_titular BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_viagens_divisoes_viagem ON public.viagens_divisoes(viagem_id);
CREATE INDEX IF NOT EXISTS idx_viagens_divisoes_consultor ON public.viagens_divisoes(consultor_id);
ALTER TABLE public.viagens_divisoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viagens_divisoes_auth_all" ON public.viagens_divisoes;
CREATE POLICY "viagens_divisoes_auth_all" ON public.viagens_divisoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. TABELA OFICIAL: origens_lead
CREATE TABLE IF NOT EXISTS public.origens_lead (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    icone TEXT DEFAULT '📣',
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    ordem INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.origens_lead ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "origens_lead_auth_all" ON public.origens_lead;
CREATE POLICY "origens_lead_auth_all" ON public.origens_lead FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. TABELA OFICIAL: campanhas_presets
CREATE TABLE IF NOT EXISTS public.campanhas_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    criado_por_nome TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.campanhas_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campanhas_presets_auth_all" ON public.campanhas_presets;
CREATE POLICY "campanhas_presets_auth_all" ON public.campanhas_presets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. TABELA OFICIAL: gamification_celebrations
CREATE TABLE IF NOT EXISTS public.gamification_celebrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    badge_key TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_emoji TEXT NOT NULL,
    campaign_id UUID,
    campaign_titulo TEXT NOT NULL,
    visualizada BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gamification_celebrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gamification_celebrations_auth_all" ON public.gamification_celebrations;
CREATE POLICY "gamification_celebrations_auth_all" ON public.gamification_celebrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
