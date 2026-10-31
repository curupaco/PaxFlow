-- ==============================================================================
-- MIGRATION: Inativação de Contas Bancárias & Notificações Financeiro
-- Data: 2026-10-31
-- Descrição:
--   1. Adiciona coluna 'ativo' na tabela física 'fin_contas_bancarias'.
--   2. Adiciona coluna 'notificacoes_financeiro_ativas' na tabela física 'global_settings_table'.
--   3. Atualiza a View 'global_settings' e o gatilho INSTEAD OF 'manage_global_settings_view'.
-- ==============================================================================

-- 1. Suporte a Inativação de Contas Bancárias (ex: Banco Cora)
ALTER TABLE IF EXISTS public.fin_contas_bancarias 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.fin_contas_bancarias.ativo IS 'Indica se a conta bancária está ativa para novos pagamentos ou inativada';

-- 2. Suporte a Configuração Global de Notificações na Tabela Física Real
ALTER TABLE IF EXISTS public.global_settings_table 
ADD COLUMN IF NOT EXISTS notificacoes_financeiro_ativas BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.global_settings_table.notificacoes_financeiro_ativas IS 'Habilita ou silencia os alertas reativos de contas a pagar no Inbox e o badge numérico no menu lateral';

-- 3. Atualiza a View pública global_settings adicionando notificacoes_financeiro_ativas ao final
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
    upsell_config,
    notificacoes_financeiro_ativas
FROM public.global_settings_table;

-- 4. Atualiza a Função e Gatilho INSTEAD OF de escrita da View
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
      upsell_config = COALESCE(NEW.upsell_config, OLD.upsell_config),
      notificacoes_financeiro_ativas = COALESCE(NEW.notificacoes_financeiro_ativas, OLD.notificacoes_financeiro_ativas, true),
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
      habilitar_upsell_preditivo, upsell_config, notificacoes_financeiro_ativas
    ) VALUES (
      NEW.agency_name, NEW.taxa_cancelamento_padrao, NEW.prazo_reembolso_dias, NEW.notificacoes_ativas,
      NEW.email_suporte, NEW.google_refresh_token, NEW.google_parent_folder_id, NEW.sla_pre_embarque_dias,
      NEW.sla_pos_viagem_dias, NEW.limite_upload_mb, NEW.enviar_nps_automatico, NEW.agency_logo_url,
      NEW.agency_primary_color, COALESCE(NEW.copiloto_ativo, true), COALESCE(NEW.permitir_consultor_criar_viagem, false), NEW.digisac_token,
      NEW.digisac_domain, NEW.digisac_service_id, NEW.digisac_enable_manual_send, NEW.digisac_enable_chat_history,
      NEW.digisac_enable_vouchers, NEW.digisac_enable_routing, NEW.digisac_enable_bot_triggers,
      NEW.digisac_enable_webhooks, NEW.tempo_desistencia_orcamento_dias, COALESCE(NEW.antecedencia_risco_operacional_dias, 15),
      COALESCE(NEW.habilitar_risk_score, true), COALESCE(NEW.risk_score_janela_carencia_dias, 60), COALESCE(NEW.risk_score_limite_critico, 50),
      COALESCE(NEW.habilitar_next_trip_engine, true), COALESCE(NEW.next_trip_corte_prontidao_alta, 75), COALESCE(NEW.next_trip_snooze_dias, 30),
      COALESCE(NEW.habilitar_upsell_preditivo, true), COALESCE(NEW.upsell_config, '{"esim": true, "sala_vip": true, "locacao_veiculo": true, "bagagem_assento": true, "seguro_saude": true, "passes_experiencias": true, "transfer_privativo": true, "upgrade_hotel": true, "cancel_flex": true}'::jsonb),
      COALESCE(NEW.notificacoes_financeiro_ativas, true)
    ) RETURNING * INTO NEW;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_manage_global_settings ON public.global_settings;
CREATE TRIGGER trg_manage_global_settings
INSTEAD OF INSERT OR UPDATE ON public.global_settings
FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();
