-- ============================================================================
-- PaxFlow — Migração: NPS, Modelos de Mensagem e Itinerário Público
-- ============================================================================

-- 1. Tabela: feedbacks_nps
CREATE TABLE IF NOT EXISTS public.feedbacks_nps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    nps_rating INTEGER CHECK (nps_rating >= 0 AND nps_rating <= 10) NOT NULL,
    comentarios TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Garantir que a tabela se chama global_settings_table e view se chama global_settings
DO $$
BEGIN
    -- Se existir a tabela global_settings como tabela física (BASE TABLE), renomeia para global_settings_table
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'global_settings' AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.global_settings RENAME TO global_settings_table;
    END IF;
END $$;

-- Criar a tabela global_settings_table se ela não existir
CREATE TABLE IF NOT EXISTS public.global_settings_table (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_name TEXT NOT NULL DEFAULT 'Minha Agência',
    taxa_cancelamento_padrao NUMERIC DEFAULT 10.00 NOT NULL,
    prazo_reembolso_dias INT DEFAULT 30 NOT NULL,
    notificacoes_ativas BOOLEAN DEFAULT TRUE NOT NULL,
    email_suporte TEXT,
    google_refresh_token TEXT,
    google_parent_folder_id TEXT,
    sla_pre_embarque_dias INT DEFAULT 7 NOT NULL,
    sla_pos_viagem_dias INT DEFAULT 3 NOT NULL,
    limite_upload_mb INT DEFAULT 25 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Habilitar RLS e criar políticas básicas se não existirem
ALTER TABLE public.global_settings_table ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de configurações por consultores" ON public.global_settings_table;
CREATE POLICY "Permitir leitura de configurações por consultores" 
ON public.global_settings_table FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir alteração de configurações apenas por admins" ON public.global_settings_table;
CREATE POLICY "Permitir alteração de configurações apenas por admins" 
ON public.global_settings_table FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Alteração de global_settings_table para incluir colunas caso estejam ausentes na tabela original renomeada
ALTER TABLE public.global_settings_table ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.global_settings_table ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.global_settings_table ADD COLUMN IF NOT EXISTS limite_upload_mb INT DEFAULT 25;
ALTER TABLE public.global_settings_table ADD COLUMN IF NOT EXISTS enviar_nps_automatico BOOLEAN DEFAULT FALSE NOT NULL;

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
    created_at,
    updated_at,
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN google_refresh_token
      ELSE CASE WHEN google_refresh_token IS NOT NULL AND google_refresh_token != '' THEN 'connected' ELSE NULL END
    END AS google_refresh_token
FROM public.global_settings_table;

-- Atualização da função de gerenciamento da view global_settings
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
      updated_at = NOW()
    WHERE id = OLD.id;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.global_settings_table (
      id, agency_name, taxa_cancelamento_padrao, prazo_reembolso_dias, 
      notificacoes_ativas, email_suporte, google_parent_folder_id, 
      google_refresh_token, sla_pre_embarque_dias, sla_pos_viagem_dias,
      limite_upload_mb, enviar_nps_automatico
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
      COALESCE(NEW.enviar_nps_automatico, FALSE)
    )
    RETURNING * INTO NEW;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger de controle na view se ele não existir
DROP TRIGGER IF EXISTS on_global_settings_view_manage ON public.global_settings;
CREATE TRIGGER on_global_settings_view_manage
  INSTEAD OF INSERT OR UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();

-- 3. Tabela: templates_mensagem
CREATE TABLE IF NOT EXISTS public.templates_mensagem (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descricao TEXT,
    conteudo TEXT NOT NULL,
    variaveis_suportadas TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. RLS e Políticas de Segurança
ALTER TABLE public.feedbacks_nps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_mensagem ENABLE ROW LEVEL SECURITY;

-- Políticas para feedbacks_nps
DROP POLICY IF EXISTS "Permitir inserção pública de feedback" ON public.feedbacks_nps;
DROP POLICY IF EXISTS "Leitura de feedback para consultor ou admin" ON public.feedbacks_nps;

CREATE POLICY "Permitir inserção pública de feedback" 
ON public.feedbacks_nps FOR INSERT 
TO public, anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Leitura de feedback para consultor ou admin" 
ON public.feedbacks_nps FOR SELECT 
TO authenticated 
USING (
  consultor_id = auth.uid() 
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Políticas para templates_mensagem
DROP POLICY IF EXISTS "Leitura de templates permitida a todos autenticados" ON public.templates_mensagem;
DROP POLICY IF EXISTS "Acesso total de templates para admins" ON public.templates_mensagem;

CREATE POLICY "Leitura de templates permitida a todos autenticados" 
ON public.templates_mensagem FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Acesso total de templates para admins" 
ON public.templates_mensagem FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 5. Função SECURITY DEFINER: obter_itinerario_publico
CREATE OR REPLACE FUNCTION public.obter_itinerario_publico(viagem_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'destino', v.destino,
    'data_ida', v.data_ida,
    'data_volta', v.data_volta,
    'codigo_localizador', v.codigo_localizador,
    'cliente_nome', c.nome,
    'cliente_id', c.id,
    'consultor_nome', p.nome,
    'consultor_id', p.id,
    'consultor_avatar', p.avatar_url,
    'produtos', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
         'tipo', pv.tipo,
         'fornecedor', pv.fornecedor,
         'descricao', pv.descricao,
         'codigo_reserva', pv.codigo_reserva,
         'data_servico', pv.data_servico,
         'status', pv.status
       ) ORDER BY pv.data_servico ASC)
       FROM public.produtos_viagem pv
       WHERE pv.viagem_id = v.id AND pv.status != 'cancelado'),
       '[]'::jsonb
    )
  ) INTO result
  FROM public.viagens v
  JOIN public.clientes c ON c.id = v.cliente_id
  LEFT JOIN public.profiles p ON p.id = v.consultor_id
  WHERE v.id = viagem_uuid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Seed: 8 Modelos de Mensagens Padrão
INSERT INTO public.templates_mensagem (titulo, descricao, conteudo, variaveis_suportadas) VALUES
('Confirmação de Reserva (LOC)', 'Mensagem enviada logo após o fechamento da viagem.', 'Olá, {{cliente}}! Sua viagem para {{destino}} foi confirmada. Código localizador (LOC): {{localizador}}. Acompanhe seu itinerário completo e atualizado em tempo real acessando: {{link_itinerario}}. Qualquer dúvida, estou à disposição! Abraços, {{consultor}}.', ARRAY['cliente', 'destino', 'localizador', 'link_itinerario', 'consultor']),
('Pré-embarque e Vouchers', 'Lembrete de viagem enviado dias antes da ida.', 'Olá, {{cliente}}! Sua viagem para {{destino}} está chegando (embarque em {{data_ida}})! 🎉 Seguem seus vouchers e informações importantes. Você pode visualizar todos os detalhes e documentos no seu itinerário digital: {{link_itinerario}}. Prepare as malas e tenha uma ótima viagem! Qualquer dúvida, fale com {{consultor}}.', ARRAY['cliente', 'destino', 'data_ida', 'link_itinerario', 'consultor']),
('Boas-vindas Pós-Viagem & NPS', 'Mensagem enviada após o retorno, solicitando feedback.', 'Olá, {{cliente}}! Esperamos que sua viagem para {{destino}} tenha sido maravilhosa e repleta de momentos inesquecíveis! Gostaríamos muito de saber como foi sua experiência conosco. Poderia dedicar 1 minutinho para avaliar nosso atendimento? Acesse o link: {{link_feedback}}. Sua opinião é preciosa para nós! Abraços, {{consultor}}.', ARRAY['cliente', 'destino', 'link_feedback', 'consultor']),
('Acompanhamento de Orçamento', 'Follow-up de proposta enviada para o lead.', 'Olá, {{cliente}}! Tudo bem? Passando para saber se você conseguiu analisar a proposta de viagem para {{destino}} que enviamos. Tem alguma dúvida ou gostaria de fazer algum ajuste no roteiro? Fale com {{consultor}}.', ARRAY['cliente', 'destino', 'consultor']),
('Aviso de Vencimento de Passaporte', 'Disparo de alerta preventivo para renovação de passaporte.', 'Olá, {{cliente}}! Notamos que a validade do seu passaporte está próxima de expirar. Lembramos que para destinos internacionais, a maioria dos países exige validade mínima de 6 meses no embarque. Recomendamos iniciar o processo de renovação em breve. Se precisar de auxílio, fale com {{consultor}}.', ARRAY['cliente', 'consultor']),
('Documentação Pendente', 'Solicitação de documentos para a emissão.', 'Olá, {{cliente}}! Para darmos andamento à emissão da sua viagem para {{destino}}, precisamos que nos envie foto ou cópia do seu documento oficial (RG ou Passaporte). Pode me enviar por aqui mesmo. Qualquer dúvida, fale com {{consultor}}.', ARRAY['cliente', 'destino', 'consultor']),
('Lembrete de Pagamento', 'Aviso de vencimento de faturamento pendente.', 'Olá, {{cliente}}! Gostaria de lembrar sobre o vencimento da parcela pendente referente à sua viagem para {{destino}} (Localizador: {{localizador}}). Caso já tenha efetuado o pagamento, por favor desconsidere. Qualquer dúvida, estou à disposição. Abraços, {{consultor}}.', ARRAY['cliente', 'destino', 'localizador', 'consultor']),
('Avaliação de Atendimento Geral', 'Mensagem padrão de NPS sem destino específico.', 'Olá, {{cliente}}! Sua opinião é fundamental para melhorarmos sempre nossos serviços. Por favor, avalie nosso atendimento neste breve link: {{link_feedback}}. Agradecemos muito a sua parceria! Equipe PaxFlow.', ARRAY['cliente', 'link_feedback']);
