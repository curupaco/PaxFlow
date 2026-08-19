-- 1. ADICIONAR COLUNAS À TABELA BASE
ALTER TABLE public.global_settings_table ADD COLUMN IF NOT EXISTS agency_logo_url TEXT;
ALTER TABLE public.global_settings_table ADD COLUMN IF NOT EXISTS agency_primary_color VARCHAR(7) DEFAULT '#4f46e5';

-- 2. REMOVER A VIEW EXISTENTE PARA PERMITIR ALTERAÇÃO DE COLUNAS
DROP VIEW IF EXISTS public.global_settings CASCADE;

-- 3. RECONSTRUIR A VIEW COM TODAS AS COLUNAS (INCLUINDO AS NOVAS E AS ORIGINAIS)
CREATE OR REPLACE VIEW public.global_settings WITH (security_invoker = true) AS
SELECT 
    id,
    agency_name,
    taxa_cancelamento_padrao,
    prazo_reembolso_dias,
    notificacoes_ativas,
    email_suporte,
    google_parent_folder_id,
    sla_pre_embarque_dias,
    sla_pos_viagem_dias,
    limite_upload_mb,
    enviar_nps_automatico,
    agency_logo_url,
    agency_primary_color,
    created_at,
    updated_at,
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN google_refresh_token
      ELSE CASE WHEN google_refresh_token IS NOT NULL AND google_refresh_token != '' THEN 'connected' ELSE NULL END
    END AS google_refresh_token
FROM public.global_settings_table;

-- 4. RECONSTRUIR A FUNÇÃO DE MANIPULAÇÃO DA VIEW (INSTEAD OF TRIGGER)
CREATE OR REPLACE FUNCTION public.manage_global_settings_view()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.global_settings_table
    SET
      agency_name = COALESCE(NEW.agency_name, OLD.agency_name),
      taxa_cancelamento_padrao = COALESCE(NEW.taxa_cancelamento_padrao, OLD.taxa_cancelamento_padrao),
      prazo_reembolso_dias = COALESCE(NEW.prazo_reembolso_dias, OLD.prazo_reembolso_dias),
      notificacoes_ativas = COALESCE(NEW.notificacoes_ativas, OLD.notificacoes_ativas),
      email_suporte = COALESCE(NEW.email_suporte, OLD.email_suporte),
      google_parent_folder_id = NEW.google_parent_folder_id,
      google_refresh_token = COALESCE(
        CASE WHEN NEW.google_refresh_token = 'connected' THEN OLD.google_refresh_token ELSE NEW.google_refresh_token END, 
        OLD.google_refresh_token
      ),
      sla_pre_embarque_dias = COALESCE(NEW.sla_pre_embarque_dias, OLD.sla_pre_embarque_dias),
      sla_pos_viagem_dias = COALESCE(NEW.sla_pos_viagem_dias, OLD.sla_pos_viagem_dias),
      limite_upload_mb = COALESCE(NEW.limite_upload_mb, OLD.limite_upload_mb),
      enviar_nps_automatico = COALESCE(NEW.enviar_nps_automatico, OLD.enviar_nps_automatico),
      agency_logo_url = NEW.agency_logo_url,
      agency_primary_color = COALESCE(NEW.agency_primary_color, OLD.agency_primary_color),
      updated_at = NOW()
    WHERE id = OLD.id;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.global_settings_table (
      id, agency_name, taxa_cancelamento_padrao, prazo_reembolso_dias, 
      notificacoes_ativas, email_suporte, google_parent_folder_id, 
      google_refresh_token, sla_pre_embarque_dias, sla_pos_viagem_dias,
      limite_upload_mb, enviar_nps_automatico,
      agency_logo_url, agency_primary_color
    ) VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      COALESCE(NEW.agency_name, 'Minha Agência'),
      COALESCE(NEW.taxa_cancelamento_padrao, 10.00),
      COALESCE(NEW.prazo_reembolso_dias, 30),
      COALESCE(NEW.notificacoes_ativas, TRUE),
      NEW.email_suporte,
      NEW.google_parent_folder_id,
      NEW.google_refresh_token,
      COALESCE(NEW.sla_pre_embarque_dias, 7),
      COALESCE(NEW.sla_pos_viagem_dias, 3),
      COALESCE(NEW.limite_upload_mb, 25),
      COALESCE(NEW.enviar_nps_automatico, FALSE),
      NEW.agency_logo_url,
      COALESCE(NEW.agency_primary_color, '#4f46e5')
    )
    RETURNING * INTO NEW;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RECONSTRUIR O TRIGGER NA VIEW
DROP TRIGGER IF EXISTS on_global_settings_view_manage ON public.global_settings;
CREATE TRIGGER on_global_settings_view_manage
  INSTEAD OF INSERT OR UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();
