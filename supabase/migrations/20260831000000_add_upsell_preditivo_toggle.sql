-- Migration: Complete sync of global_settings_table and view with all branding, automation, risk score, and integration settings
-- Date: 2026-08-31

-- 1. Add all branding, automation, risk score, and predictive columns to global_settings_table
ALTER TABLE public.global_settings_table 
ADD COLUMN IF NOT EXISTS copiloto_ativo BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS permitir_consultor_criar_viagem BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS antecedencia_risco_operacional_dias INT DEFAULT 15 NOT NULL,
ADD COLUMN IF NOT EXISTS habilitar_risk_score BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS risk_score_janela_carencia_dias INT DEFAULT 60 NOT NULL,
ADD COLUMN IF NOT EXISTS risk_score_limite_critico INT DEFAULT 50 NOT NULL,
ADD COLUMN IF NOT EXISTS habilitar_next_trip_engine BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS next_trip_corte_prontidao_alta INT DEFAULT 75 NOT NULL,
ADD COLUMN IF NOT EXISTS next_trip_snooze_dias INT DEFAULT 30 NOT NULL,
ADD COLUMN IF NOT EXISTS habilitar_upsell_preditivo BOOLEAN DEFAULT true NOT NULL;

-- 2. Drop and recreate public view global_settings
DROP VIEW IF EXISTS public.global_settings CASCADE;

CREATE OR REPLACE VIEW public.global_settings WITH (security_invoker = true) AS
SELECT
    id,
    agency_name,
    taxa_cancelamento_padrao,
    prazo_reembolso_dias,
    notificacoes_ativas,
    email_suporte,
    CASE
        WHEN (select coalesce(role, 'consultor') from public.profiles where id = auth.uid()) = 'admin' THEN google_refresh_token
        ELSE '[MASCARADO]'
    END as google_refresh_token,
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
    created_at,
    updated_at
FROM public.global_settings_table;

-- 3. Recreate manage_global_settings_view function
CREATE OR REPLACE FUNCTION public.manage_global_settings_view()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.global_settings_table
    SET
      agency_name = COALESCE(NEW.agency_name, NEW.agency_name),
      taxa_cancelamento_padrao = NEW.taxa_cancelamento_padrao,
      prazo_reembolso_dias = NEW.prazo_reembolso_dias,
      notificacoes_ativas = NEW.notificacoes_ativas,
      email_suporte = NEW.email_suporte,
      google_refresh_token = CASE 
        WHEN NEW.google_refresh_token = '[MASCARADO]' THEN google_refresh_token 
        ELSE NEW.google_refresh_token 
      END,
      google_parent_folder_id = NEW.google_parent_folder_id,
      sla_pre_embarque_dias = NEW.sla_pre_embarque_dias,
      sla_pos_viagem_dias = NEW.sla_pos_viagem_dias,
      limite_upload_mb = NEW.limite_upload_mb,
      enviar_nps_automatico = NEW.enviar_nps_automatico,
      agency_logo_url = NEW.agency_logo_url,
      agency_primary_color = NEW.agency_primary_color,
      copiloto_ativo = COALESCE(NEW.copiloto_ativo, true),
      permitir_consultor_criar_viagem = COALESCE(NEW.permitir_consultor_criar_viagem, false),
      digisac_token = NEW.digisac_token,
      digisac_domain = NEW.digisac_domain,
      digisac_service_id = NEW.digisac_service_id,
      digisac_enable_manual_send = NEW.digisac_enable_manual_send,
      digisac_enable_chat_history = NEW.digisac_enable_chat_history,
      digisac_enable_vouchers = NEW.digisac_enable_vouchers,
      digisac_enable_routing = NEW.digisac_enable_routing,
      digisac_enable_bot_triggers = NEW.digisac_enable_bot_triggers,
      digisac_enable_webhooks = NEW.digisac_enable_webhooks,
      tempo_desistencia_orcamento_dias = NEW.tempo_desistencia_orcamento_dias,
      antecedencia_risco_operacional_dias = COALESCE(NEW.antecedencia_risco_operacional_dias, 15),
      habilitar_risk_score = COALESCE(NEW.habilitar_risk_score, true),
      risk_score_janela_carencia_dias = COALESCE(NEW.risk_score_janela_carencia_dias, 60),
      risk_score_limite_critico = COALESCE(NEW.risk_score_limite_critico, 50),
      habilitar_next_trip_engine = COALESCE(NEW.habilitar_next_trip_engine, true),
      next_trip_corte_prontidao_alta = COALESCE(NEW.next_trip_corte_prontidao_alta, 75),
      next_trip_snooze_dias = COALESCE(NEW.next_trip_snooze_dias, 30),
      habilitar_upsell_preditivo = COALESCE(NEW.habilitar_upsell_preditivo, true),
      updated_at = NOW()
    WHERE id = OLD.id;
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
      habilitar_upsell_preditivo
    ) VALUES (
      COALESCE(NEW.agency_name, 'PaxFlow'),
      COALESCE(NEW.taxa_cancelamento_padrao, 0),
      COALESCE(NEW.prazo_reembolso_dias, 3),
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
      COALESCE(NEW.habilitar_upsell_preditivo, true)
    ) RETURNING * INTO NEW;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_global_settings_view_manage
  INSTEAD OF INSERT OR UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();
