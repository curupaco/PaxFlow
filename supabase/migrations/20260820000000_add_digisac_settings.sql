-- 1. Add columns to global_settings_table if not exists
ALTER TABLE public.global_settings_table ADD COLUMN IF NOT EXISTS digisac_token TEXT;
ALTER TABLE public.global_settings_table ADD COLUMN IF NOT EXISTS digisac_domain TEXT;
ALTER TABLE public.global_settings_table ADD COLUMN IF NOT EXISTS digisac_service_id TEXT;

-- 2. Drop and recreate view to include the columns
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
    digisac_token,
    digisac_domain,
    digisac_service_id,
    created_at,
    updated_at
FROM public.global_settings_table;

-- 3. Recreate the trigger function to handle the new columns
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
      digisac_token = NEW.digisac_token,
      digisac_domain = NEW.digisac_domain,
      digisac_service_id = NEW.digisac_service_id,
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
      digisac_token,
      digisac_domain,
      digisac_service_id
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
      NEW.digisac_token,
      NEW.digisac_domain,
      NEW.digisac_service_id
    ) RETURNING * INTO NEW;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_global_settings_view_manage
  INSTEAD OF INSERT OR UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();
