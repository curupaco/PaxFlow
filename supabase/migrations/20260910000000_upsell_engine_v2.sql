-- ============================================================================
-- MIGRATION: PaxFlow Upsell Engine 2.0
-- Suporte à persistência de oportunidades dispensadas e configuração de regras
-- ============================================================================

-- 1. Adiciona coluna de IDs de oportunidades dispensadas na tabela de viagens
ALTER TABLE public.viagens 
ADD COLUMN IF NOT EXISTS upsell_dispensados TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;

-- 2. Adiciona coluna de configuração granular na tabela física global_settings_table
ALTER TABLE public.global_settings_table 
ADD COLUMN IF NOT EXISTS upsell_config JSONB DEFAULT '{"esim": true, "sala_vip": true, "locacao_veiculo": true, "bagagem_assento": true, "seguro_saude": true, "passes_experiencias": true, "transfer_privativo": true, "upgrade_hotel": true, "cancel_flex": true}'::jsonb NOT NULL;

-- 3. Atualiza a View pública global_settings adicionando upsell_config AO FINAL da lista
-- (No PostgreSQL, CREATE OR REPLACE VIEW exige que novas colunas sejam inseridas no final)
CREATE OR REPLACE VIEW public.global_settings WITH (security_invoker = true) AS
SELECT
    id,
    agency_name,
    taxa_cancelamento_padrao,
    prazo_reembolso_dias,
    notificacoes_ativas,
    email_suporte,
    CASE
        WHEN (SELECT COALESCE(role, 'consultor') FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN google_refresh_token
        ELSE '[MASCARADO]'
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
    updated_at,
    upsell_config
FROM public.global_settings_table;

-- 4. Atualiza o gatilho transparente de escrita da View global_settings
CREATE OR REPLACE FUNCTION public.manage_global_settings_view()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.global_settings_table
    SET
      agency_name = COALESCE(NEW.agency_name, OLD.agency_name),
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
      upsell_config = COALESCE(NEW.upsell_config, OLD.upsell_config, '{"esim": true, "sala_vip": true, "locacao_veiculo": true, "bagagem_assento": true, "seguro_saude": true, "passes_experiencias": true, "transfer_privativo": true, "upgrade_hotel": true, "cancel_flex": true}'::jsonb),
      updated_at = NOW()
    WHERE id = OLD.id;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.global_settings_table (
      agency_name, taxa_cancelamento_padrao, prazo_reembolso_dias, notificacoes_ativas,
      email_suporte, google_refresh_token, google_parent_folder_id, sla_pre_embarque_dias,
      sla_pos_viagem_dias, limite_upload_mb, enviar_nps_automatico, agency_logo_url,
      agency_primary_color, copiloto_ativo, permitir_consultor_criar_viagem, digisac_token,
      digisac_domain, digisac_service_id, digisac_enable_manual_send, digisac_enable_chat_history,
      digisac_enable_vouchers, digisac_enable_routing, digisac_enable_bot_triggers,
      digisac_enable_webhooks, tempo_desistencia_orcamento_dias, antecedencia_risco_operacional_dias,
      habilitar_risk_score, risk_score_janela_carencia_dias, risk_score_limite_critico,
      habilitar_next_trip_engine, next_trip_corte_prontidao_alta, next_trip_snooze_dias,
      habilitar_upsell_preditivo, upsell_config
    ) VALUES (
      COALESCE(NEW.agency_name, 'PaxFlow'),
      COALESCE(NEW.taxa_cancelamento_padrao, 0),
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
      COALESCE(NEW.upsell_config, '{"esim": true, "sala_vip": true, "locacao_veiculo": true, "bagagem_assento": true, "seguro_saude": true, "passes_experiencias": true, "transfer_privativo": true, "upgrade_hotel": true, "cancel_flex": true}'::jsonb)
    ) RETURNING * INTO NEW;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_global_settings_view_manage ON public.global_settings;
CREATE TRIGGER on_global_settings_view_manage
  INSTEAD OF INSERT OR UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();
