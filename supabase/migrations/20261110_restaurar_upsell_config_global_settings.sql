-- ==============================================================================
-- MIGRATION: RESTAURAR UPSELL_CONFIG NA VIEW GLOBAL_SETTINGS
-- Data: 10/11/2026
-- Descrição:
--   1. Garante que a coluna 'upsell_config' existe fisicamente em 'global_settings_table'.
--   2. Recria a View pública 'global_settings' incluindo a coluna 'upsell_config'.
--   3. Atualiza a função trigger 'manage_global_settings_view' para persistir 'upsell_config'
--      em operações de UPDATE e INSERT, eliminando erro HTTP 400 Bad Request ao salvar SLA e Automações.
-- ==============================================================================

-- 1. Garante coluna física na tabela global_settings_table
ALTER TABLE IF EXISTS public.global_settings_table 
ADD COLUMN IF NOT EXISTS upsell_config JSONB DEFAULT '{"esim": true, "sala_vip": true, "locacao_veiculo": true, "bagagem_assento": true, "seguro_saude": true, "passes_experiencias": true, "transfer_privativo": true, "upgrade_hotel": true, "cancel_flex": true}'::jsonb NOT NULL;

-- 2. Recria a View pública global_settings incluindo upsell_config
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
    upsell_config,
    habilitar_studio_pro,
    studio_moeda_padrao,
    studio_validade_dias,
    studio_permitir_aceite_formal,
    notificacoes_financeiro_ativas,
    created_at,
    updated_at
FROM public.global_settings_table;

-- 3. Função Trigger para gerenciar INSERT e UPDATE através da View
CREATE OR REPLACE FUNCTION public.manage_global_settings_view()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.global_settings_table
        SET 
            agency_name = COALESCE(NEW.agency_name, global_settings_table.agency_name),
            taxa_cancelamento_padrao = COALESCE(NEW.taxa_cancelamento_padrao, global_settings_table.taxa_cancelamento_padrao),
            prazo_reembolso_dias = COALESCE(NEW.prazo_reembolso_dias, global_settings_table.prazo_reembolso_dias),
            notificacoes_ativas = COALESCE(NEW.notificacoes_ativas, global_settings_table.notificacoes_ativas),
            email_suporte = COALESCE(NEW.email_suporte, global_settings_table.email_suporte),
            google_refresh_token = COALESCE(NEW.google_refresh_token, global_settings_table.google_refresh_token),
            google_parent_folder_id = COALESCE(NEW.google_parent_folder_id, global_settings_table.google_parent_folder_id),
            sla_pre_embarque_dias = COALESCE(NEW.sla_pre_embarque_dias, global_settings_table.sla_pre_embarque_dias),
            sla_pos_viagem_dias = COALESCE(NEW.sla_pos_viagem_dias, global_settings_table.sla_pos_viagem_dias),
            limite_upload_mb = COALESCE(NEW.limite_upload_mb, global_settings_table.limite_upload_mb),
            enviar_nps_automatico = COALESCE(NEW.enviar_nps_automatico, global_settings_table.enviar_nps_automatico),
            agency_logo_url = COALESCE(NEW.agency_logo_url, global_settings_table.agency_logo_url),
            agency_primary_color = COALESCE(NEW.agency_primary_color, global_settings_table.agency_primary_color),
            copiloto_ativo = COALESCE(NEW.copiloto_ativo, global_settings_table.copiloto_ativo),
            permitir_consultor_criar_viagem = COALESCE(NEW.permitir_consultor_criar_viagem, global_settings_table.permitir_consultor_criar_viagem),
            digisac_token = COALESCE(NEW.digisac_token, global_settings_table.digisac_token),
            digisac_domain = COALESCE(NEW.digisac_domain, global_settings_table.digisac_domain),
            digisac_service_id = COALESCE(NEW.digisac_service_id, global_settings_table.digisac_service_id),
            digisac_enable_manual_send = COALESCE(NEW.digisac_enable_manual_send, global_settings_table.digisac_enable_manual_send),
            digisac_enable_chat_history = COALESCE(NEW.digisac_enable_chat_history, global_settings_table.digisac_enable_chat_history),
            digisac_enable_vouchers = COALESCE(NEW.digisac_enable_vouchers, global_settings_table.digisac_enable_vouchers),
            digisac_enable_routing = COALESCE(NEW.digisac_enable_routing, global_settings_table.digisac_enable_routing),
            digisac_enable_bot_triggers = COALESCE(NEW.digisac_enable_bot_triggers, global_settings_table.digisac_enable_bot_triggers),
            digisac_enable_webhooks = COALESCE(NEW.digisac_enable_webhooks, global_settings_table.digisac_enable_webhooks),
            tempo_desistencia_orcamento_dias = COALESCE(NEW.tempo_desistencia_orcamento_dias, global_settings_table.tempo_desistencia_orcamento_dias),
            antecedencia_risco_operacional_dias = COALESCE(NEW.antecedencia_risco_operacional_dias, global_settings_table.antecedencia_risco_operacional_dias),
            habilitar_risk_score = COALESCE(NEW.habilitar_risk_score, global_settings_table.habilitar_risk_score),
            risk_score_janela_carencia_dias = COALESCE(NEW.risk_score_janela_carencia_dias, global_settings_table.risk_score_janela_carencia_dias),
            risk_score_limite_critico = COALESCE(NEW.risk_score_limite_critico, global_settings_table.risk_score_limite_critico),
            habilitar_next_trip_engine = COALESCE(NEW.habilitar_next_trip_engine, global_settings_table.habilitar_next_trip_engine),
            next_trip_corte_prontidao_alta = COALESCE(NEW.next_trip_corte_prontidao_alta, global_settings_table.next_trip_corte_prontidao_alta),
            next_trip_snooze_dias = COALESCE(NEW.next_trip_snooze_dias, global_settings_table.next_trip_snooze_dias),
            habilitar_upsell_preditivo = COALESCE(NEW.habilitar_upsell_preditivo, global_settings_table.habilitar_upsell_preditivo),
            upsell_config = COALESCE(NEW.upsell_config, global_settings_table.upsell_config),
            habilitar_studio_pro = COALESCE(NEW.habilitar_studio_pro, global_settings_table.habilitar_studio_pro),
            studio_moeda_padrao = COALESCE(NEW.studio_moeda_padrao, global_settings_table.studio_moeda_padrao),
            studio_validade_dias = COALESCE(NEW.studio_validade_dias, global_settings_table.studio_validade_dias),
            studio_permitir_aceite_formal = COALESCE(NEW.studio_permitir_aceite_formal, global_settings_table.studio_permitir_aceite_formal),
            notificacoes_financeiro_ativas = COALESCE(NEW.notificacoes_financeiro_ativas, global_settings_table.notificacoes_financeiro_ativas),
            updated_at = NOW()
        WHERE public.global_settings_table.id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.global_settings_table (
            agency_name,
            taxa_cancelamento_padrao,
            prazo_reembolso_dias,
            notificacoes_ativas,
            email_suporte,
            google_refresh_token,
            google_parent_folder_id,
            sla_pre_embarque_dias,
            sla_pos_viagem_dias,
            limite_upload_mb,
            enviar_nps_automatico,
            agency_logo_url,
            agency_primary_color,
            copiloto_ativo,
            permitir_consultor_criar_viagem,
            digisac_token,
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
            upsell_config,
            habilitar_studio_pro,
            studio_moeda_padrao,
            studio_validade_dias,
            studio_permitir_aceite_formal,
            notificacoes_financeiro_ativas
        ) VALUES (
            COALESCE(NEW.agency_name, 'PaxFlow'),
            COALESCE(NEW.taxa_cancelamento_padrao, 0.00),
            COALESCE(NEW.prazo_reembolso_dias, 30),
            COALESCE(NEW.notificacoes_ativas, true),
            COALESCE(NEW.email_suporte, 'suporte@paxflow.com.br'),
            NEW.google_refresh_token,
            NEW.google_parent_folder_id,
            COALESCE(NEW.sla_pre_embarque_dias, 7),
            COALESCE(NEW.sla_pos_viagem_dias, 3),
            COALESCE(NEW.limite_upload_mb, 25),
            COALESCE(NEW.enviar_nps_automatico, false),
            NEW.agency_logo_url,
            COALESCE(NEW.agency_primary_color, '#4f46e5'),
            COALESCE(NEW.copiloto_ativo, true),
            COALESCE(NEW.permitir_consultor_criar_viagem, false),
            NEW.digisac_token,
            NEW.digisac_domain,
            NEW.digisac_service_id,
            COALESCE(NEW.digisac_enable_manual_send, true),
            COALESCE(NEW.digisac_enable_chat_history, true),
            COALESCE(NEW.digisac_enable_vouchers, true),
            COALESCE(NEW.digisac_enable_routing, true),
            COALESCE(NEW.digisac_enable_bot_triggers, true),
            COALESCE(NEW.digisac_enable_webhooks, true),
            COALESCE(NEW.tempo_desistencia_orcamento_dias, 30),
            COALESCE(NEW.antecedencia_risco_operacional_dias, 15),
            COALESCE(NEW.habilitar_risk_score, true),
            COALESCE(NEW.risk_score_janela_carencia_dias, 60),
            COALESCE(NEW.risk_score_limite_critico, 50),
            COALESCE(NEW.habilitar_next_trip_engine, true),
            COALESCE(NEW.next_trip_corte_prontidao_alta, 75),
            COALESCE(NEW.next_trip_snooze_dias, 30),
            COALESCE(NEW.habilitar_upsell_preditivo, true),
            COALESCE(NEW.upsell_config, '{"esim": true, "sala_vip": true, "locacao_veiculo": true, "bagagem_assento": true, "seguro_saude": true, "passes_experiencias": true, "transfer_privativo": true, "upgrade_hotel": true, "cancel_flex": true}'::jsonb),
            COALESCE(NEW.habilitar_studio_pro, true),
            COALESCE(NEW.studio_moeda_padrao, 'BRL'),
            COALESCE(NEW.studio_validade_dias, 7),
            COALESCE(NEW.studio_permitir_aceite_formal, true),
            COALESCE(NEW.notificacoes_financeiro_ativas, true)
        )
        RETURNING * INTO NEW;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recria o gatilho na View global_settings
DROP TRIGGER IF EXISTS on_global_settings_view_manage ON public.global_settings;

CREATE TRIGGER on_global_settings_view_manage
    INSTEAD OF INSERT OR UPDATE ON public.global_settings
    FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();

