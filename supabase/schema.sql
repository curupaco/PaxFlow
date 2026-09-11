-- ============================================================================
-- PaxFlow — Schema Consolidado Definitivo do Banco de Dados PostgreSQL (Supabase)
-- ============================================================================
-- Este script DDL cria toda a estrutura completa, tabelas, extensões, sequências,
-- views, funções RPC, gatilhos (triggers) e políticas de segurança RLS necessárias
-- para a execução do PaxFlow em qualquer ambiente PostgreSQL.
-- ============================================================================

-- 0. EXTENSÕES DO POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABELA: profiles (Perfil do Consultor vinculado ao Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'consultor')) DEFAULT 'consultor',
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    avatar_url TEXT,
    participa_escala BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 2. TABELA: global_settings_table (Configurações Gerais, White-Label e Automações)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.global_settings_table (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_name TEXT NOT NULL DEFAULT 'PaxFlow',
    taxa_cancelamento_padrao NUMERIC DEFAULT 0.00 NOT NULL,
    prazo_reembolso_dias INT DEFAULT 30 NOT NULL,
    notificacoes_ativas BOOLEAN DEFAULT TRUE NOT NULL,
    email_suporte TEXT DEFAULT 'suporte@paxflow.com.br',
    google_refresh_token TEXT,
    google_parent_folder_id TEXT,
    sla_pre_embarque_dias INT DEFAULT 7 NOT NULL,
    sla_pos_viagem_dias INT DEFAULT 3 NOT NULL,
    limite_upload_mb INT DEFAULT 25 NOT NULL,
    enviar_nps_automatico BOOLEAN DEFAULT FALSE NOT NULL,
    agency_logo_url TEXT,
    agency_primary_color TEXT DEFAULT '#4f46e5',
    copiloto_ativo BOOLEAN DEFAULT TRUE NOT NULL,
    permitir_consultor_criar_viagem BOOLEAN DEFAULT FALSE NOT NULL,
    digisac_token TEXT,
    digisac_domain TEXT,
    digisac_service_id TEXT,
    digisac_enable_manual_send BOOLEAN DEFAULT TRUE NOT NULL,
    digisac_enable_chat_history BOOLEAN DEFAULT TRUE NOT NULL,
    digisac_enable_vouchers BOOLEAN DEFAULT TRUE NOT NULL,
    digisac_enable_routing BOOLEAN DEFAULT TRUE NOT NULL,
    digisac_enable_bot_triggers BOOLEAN DEFAULT TRUE NOT NULL,
    digisac_enable_webhooks BOOLEAN DEFAULT TRUE NOT NULL,
    tempo_desistencia_orcamento_dias INT DEFAULT 30 NOT NULL,
    antecedencia_risco_operacional_dias INT DEFAULT 15 NOT NULL,
    habilitar_risk_score BOOLEAN DEFAULT TRUE NOT NULL,
    risk_score_janela_carencia_dias INT DEFAULT 60 NOT NULL,
    risk_score_limite_critico INT DEFAULT 50 NOT NULL,
    habilitar_next_trip_engine BOOLEAN DEFAULT TRUE NOT NULL,
    next_trip_corte_prontidao_alta INT DEFAULT 75 NOT NULL,
    next_trip_snooze_dias INT DEFAULT 30 NOT NULL,
    habilitar_upsell_preditivo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- View Pública com Mascaramento de Tokens para Não-Admins
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
    updated_at
FROM public.global_settings_table;

-- Gatilho/Função para Atualização Transparente da View
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
      habilitar_upsell_preditivo
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
      COALESCE(NEW.habilitar_upsell_preditivo, true)
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

-- ============================================================================
-- 3. TABELA: clientes (Passageiros, Contatos e Passaportes)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.clientes_seq_id_seq;

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seq_id INT DEFAULT nextval('public.clientes_seq_id_seq') NOT NULL,
    codigo_ref TEXT GENERATED ALWAYS AS ('CLI-' || lpad(seq_id::text, 4, '0')) STORED,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    documento TEXT,
    data_nascimento DATE,
    endereco TEXT,
    observacoes TEXT,
    consultor_responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    passaporte_numero TEXT,
    passaporte_validade DATE,
    passaportes JSONB DEFAULT '[]'::jsonb NOT NULL,
    vistos_informacoes TEXT,
    google_drive_folder_url TEXT,
    classificacoes TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 4. TABELA: viagens (Fluxo de Viagens / Operações)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.viagens_seq_id_seq;

CREATE TABLE IF NOT EXISTS public.viagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seq_id INT DEFAULT nextval('public.viagens_seq_id_seq') NOT NULL,
    codigo_ref TEXT GENERATED ALWAYS AS ('VIA-' || lpad(seq_id::text, 4, '0')) STORED,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    destino TEXT NOT NULL,
    data_ida DATE NOT NULL,
    data_volta DATE NOT NULL,
    valor_total NUMERIC DEFAULT 0.00 NOT NULL,
    status VARCHAR(30) CHECK (status IN ('fechado', 'pos_venda', 'pre_embarque', 'pos_viagem', 'reembolso_solicitado')) DEFAULT 'fechado' NOT NULL,
    codigo_localizador TEXT,
    observacoes TEXT,
    data_financeiro DATE,
    origem TEXT,
    processo_conferido BOOLEAN DEFAULT FALSE NOT NULL,
    contatos_embarque JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 5. TABELA: tipos_produto (Tipos Dinâmicos de Produtos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tipos_produto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    icone VARCHAR(10) DEFAULT '📦' NOT NULL,
    campos_adicionais JSONB DEFAULT '[]'::jsonb NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 6. TABELA: produtos_viagem (Itens específicos de cada viagem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.produtos_viagem (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    fornecedor TEXT NOT NULL,
    descricao TEXT NOT NULL,
    codigo_reserva TEXT,
    valor_custo NUMERIC DEFAULT 0.00 NOT NULL,
    valor_venda NUMERIC DEFAULT 0.00 NOT NULL,
    tarifa NUMERIC DEFAULT 0.00,
    taxa NUMERIC DEFAULT 0.00,
    comissao NUMERIC DEFAULT 0.00,
    markup NUMERIC DEFAULT 0.00,
    rav NUMERIC DEFAULT 0.00,
    status VARCHAR(20) CHECK (status IN ('reservado', 'emitido', 'cancelado', 'reembolsado')) DEFAULT 'reservado' NOT NULL,
    data_servico DATE NOT NULL,
    dados_adicionais JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 7. TABELAS: formas_recebimento, loc_pagamentos e loc_conferencias
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.formas_recebimento (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    icone VARCHAR(20) DEFAULT '💵' NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.loc_pagamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    codigo_localizador VARCHAR(100) NOT NULL,
    forma_recebimento_id UUID REFERENCES public.formas_recebimento(id) ON DELETE CASCADE,
    valor NUMERIC DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.loc_conferencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    codigo_localizador VARCHAR(100) NOT NULL,
    conferido BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_viagem_loc UNIQUE (viagem_id, codigo_localizador)
);

-- ============================================================================
-- 8. TABELA: reembolsos (Central de Reembolsos)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.reembolsos_seq_id_seq;

CREATE TABLE IF NOT EXISTS public.reembolsos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seq_id INT DEFAULT nextval('public.reembolsos_seq_id_seq') NOT NULL,
    codigo_ref TEXT GENERATED ALWAYS AS ('RBS-' || lpad(seq_id::text, 4, '0')) STORED,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    produto_viagem_id UUID REFERENCES public.produtos_viagem(id) ON DELETE SET NULL,
    consultor_solicitante_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    valor_solicitado NUMERIC NOT NULL,
    valor_aprovado NUMERIC,
    taxa_retencao NUMERIC,
    status VARCHAR(20) CHECK (status IN ('solicitado', 'em_analise', 'aprovado', 'recusado', 'pago', 'cancelado')) DEFAULT 'solicitado' NOT NULL,
    motivo_cancelamento TEXT NOT NULL,
    observacoes_financeiras TEXT,
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    data_resolucao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 9. TABELA: orcamentos (Pipeline Comercial / Funil de Leads)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.orcamentos_seq_id_seq;

CREATE TABLE IF NOT EXISTS public.orcamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seq_id INT DEFAULT nextval('public.orcamentos_seq_id_seq') NOT NULL,
    codigo_ref TEXT GENERATED ALWAYS AS ('ORC-' || lpad(seq_id::text, 4, '0')) STORED,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    nome_cliente TEXT NOT NULL,
    contato TEXT NOT NULL,
    destino TEXT NOT NULL,
    data_viagem DATE,
    data_volta DATE,
    temperatura VARCHAR(20) CHECK (temperatura IN ('Frio', 'Normal', 'Quente')) DEFAULT 'Normal' NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    status VARCHAR(20) CHECK (status IN ('SOLICITADO', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDO')) DEFAULT 'SOLICITADO' NOT NULL,
    sub_status VARCHAR(20) CHECK (sub_status IN ('ACEITO', 'DESISTENCIA')),
    notas_negociacao TEXT,
    valor_proposta NUMERIC,
    valor_viagem NUMERIC,
    documentos_url TEXT[] DEFAULT '{}'::TEXT[],
    origem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 10. TABELA: lembretes (Alertas Operacionais de Orçamentos e Viagens)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lembretes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    criador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    data_lembrete DATE NOT NULL,
    periodo VARCHAR(10) CHECK (periodo IN ('manha', 'tarde', 'noite')) NOT NULL,
    arquivado BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 11. TABELAS: todo_columns e todo_cards (Planejamento Interno / Tarefas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.todo_columns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    ordem INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.todo_cards (
    id TEXT PRIMARY KEY,
    column_id TEXT REFERENCES public.todo_columns(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', '')) DEFAULT ''::text,
    tag TEXT,
    assignee TEXT,
    ordem INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 12. TABELAS: comentarios e notificacoes (Menções @ e Alertas em Tempo Real)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comentarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo_item VARCHAR(20) CHECK (tipo_item IN ('orcamento', 'viagem', 'produto')) NOT NULL,
    item_id UUID NOT NULL,
    autor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    texto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    comentario_id UUID REFERENCES public.comentarios(id) ON DELETE CASCADE,
    tipo_item VARCHAR(20) CHECK (tipo_item IN ('orcamento', 'viagem', 'produto', 'mensagem', 'campanha')) NOT NULL,
    item_id UUID NOT NULL,
    parent_id UUID NOT NULL,
    campaign_id UUID,
    lida BOOLEAN DEFAULT FALSE NOT NULL,
    arquivada BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 13. TABELAS: campaigns e gamificação
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tipo_meta VARCHAR(50) NOT NULL,
    meta_quantidade INTEGER NOT NULL,
    badge_key VARCHAR(50) NOT NULL,
    ativa BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 14. TABELAS: meta_periodos e meta_faixas (Metas Financeiras e Metas de Loja)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meta_periodos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tipo_calculo VARCHAR(50) NOT NULL CHECK (tipo_calculo IN ('bruto', 'lucro')),
    is_campanha BOOLEAN DEFAULT FALSE NOT NULL,
    is_meta_loja BOOLEAN DEFAULT FALSE NOT NULL,
    valor_meta NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meta_faixas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    periodo_id UUID REFERENCES public.meta_periodos(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    valor_minimo NUMERIC(15, 2) NOT NULL,
    bonus_xp INTEGER DEFAULT 0 NOT NULL,
    recompensa TEXT,
    cor TEXT DEFAULT '#6366f1' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 15. TABELAS: escala de funcionários (Escala Diária, Solicitações e Banco de Folgas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.escala_diaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    consultor_nome TEXT NOT NULL,
    equipe TEXT DEFAULT 'Equipe Agatur',
    data DATE NOT NULL,
    turno_codigo TEXT NOT NULL,
    observacao_custom TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT escala_diaria_consultor_data_key UNIQUE (consultor_nome, data)
);

CREATE TABLE IF NOT EXISTS public.escala_solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('troca', 'folga', 'ferias')),
    solicitante_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    solicitante_nome TEXT NOT NULL,
    destinatario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    destinatario_nome TEXT,
    data_origem DATE NOT NULL,
    turno_origem TEXT,
    data_destino DATE,
    turno_destino TEXT,
    motivo TEXT,
    status TEXT NOT NULL DEFAULT 'pendente_admin' CHECK (status IN ('pendente_colega', 'pendente_admin', 'aprovado', 'recusado')),
    resposta_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.escala_banco_folgas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    consultor_nome TEXT NOT NULL UNIQUE,
    equipe TEXT DEFAULT 'Equipe Agatur',
    saldo_dias TEXT NOT NULL DEFAULT '0',
    detalhes_historico TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.escala_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data TEXT NOT NULL,
    consultor_nome TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 16. TABELAS: NPS, Feedbacks e Modelos de Mensagem WhatsApp
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feedbacks_nps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    consultor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    nps_rating INTEGER CHECK (nps_rating >= 0 AND nps_rating <= 10) NOT NULL,
    comentarios TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.templates_mensagem (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descricao TEXT,
    conteudo TEXT NOT NULL,
    variaveis_suportadas TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 17. TABELA: mensagens_diretas (Inbox e Comunicação Interna)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mensagens_diretas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    remetente_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    destinatario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    conteudo TEXT NOT NULL,
    anexo_url TEXT,
    lida BOOLEAN DEFAULT FALSE NOT NULL,
    parent_id UUID REFERENCES public.mensagens_diretas(id) ON DELETE SET NULL,
    thread_id UUID REFERENCES public.mensagens_diretas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mensagens_diretas_parent_id ON public.mensagens_diretas(parent_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_diretas_thread_id ON public.mensagens_diretas(thread_id);

-- ============================================================================
-- 18. TABELAS: push_subscriptions e audit_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tabela TEXT NOT NULL,
    operacao TEXT NOT NULL,
    registro_id UUID NOT NULL,
    dados_antigos JSONB,
    dados_novos JSONB,
    executado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 19. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_viagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formas_recebimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loc_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loc_conferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reembolsos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_faixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_banco_folgas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks_nps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_mensagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_diretas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 20. POLÍTICAS DE SEGURANÇA (MODELO AGÊNCIA COLABORATIVA)
-- ============================================================================

-- profiles
DROP POLICY IF EXISTS "Permitir leitura pública de perfis" ON public.profiles;
CREATE POLICY "Permitir leitura pública de perfis" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir update do próprio perfil ou por administradores" ON public.profiles;
CREATE POLICY "Permitir update do próprio perfil ou por administradores" ON public.profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- global_settings_table
DROP POLICY IF EXISTS "Permitir leitura de configurações por consultores" ON public.global_settings_table;
CREATE POLICY "Permitir leitura de configurações por consultores" ON public.global_settings_table FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir alteração de configurações apenas por admins" ON public.global_settings_table;
CREATE POLICY "Permitir alteração de configurações apenas por admins" ON public.global_settings_table FOR ALL TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- clientes (Agência Colaborativa: Leitura e Escrita compartilhada, Exclusão por Admin)
DROP POLICY IF EXISTS "Leitura de clientes para todos autenticados" ON public.clientes;
CREATE POLICY "Leitura de clientes para todos autenticados" ON public.clientes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserir clientes para autenticados" ON public.clientes;
CREATE POLICY "Inserir clientes para autenticados" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar clientes para autenticados" ON public.clientes;
CREATE POLICY "Atualizar clientes para autenticados" ON public.clientes FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Excluir clientes apenas por admins" ON public.clientes;
CREATE POLICY "Excluir clientes apenas por admins" ON public.clientes FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- orcamentos
DROP POLICY IF EXISTS "Leitura de orçamentos para todos autenticados" ON public.orcamentos;
CREATE POLICY "Leitura de orçamentos para todos autenticados" ON public.orcamentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserir orçamentos para autenticados" ON public.orcamentos;
CREATE POLICY "Inserir orçamentos para autenticados" ON public.orcamentos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar orçamentos para autenticados" ON public.orcamentos;
CREATE POLICY "Atualizar orçamentos para autenticados" ON public.orcamentos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Excluir orçamentos apenas por admins" ON public.orcamentos;
CREATE POLICY "Excluir orçamentos apenas por admins" ON public.orcamentos FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- viagens
DROP POLICY IF EXISTS "Leitura de viagens para todos autenticados" ON public.viagens;
CREATE POLICY "Leitura de viagens para todos autenticados" ON public.viagens FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserir viagens para autenticados" ON public.viagens;
CREATE POLICY "Inserir viagens para autenticados" ON public.viagens FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar viagens para autenticados" ON public.viagens;
CREATE POLICY "Atualizar viagens para autenticados" ON public.viagens FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Excluir viagens apenas por admins" ON public.viagens;
CREATE POLICY "Excluir viagens apenas por admins" ON public.viagens FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- produtos_viagem
DROP POLICY IF EXISTS "Leitura de produtos de viagem para todos autenticados" ON public.produtos_viagem;
CREATE POLICY "Leitura de produtos de viagem para todos autenticados" ON public.produtos_viagem FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserir produtos de viagem para autenticados" ON public.produtos_viagem;
CREATE POLICY "Inserir produtos de viagem para autenticados" ON public.produtos_viagem FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar produtos de viagem para autenticados" ON public.produtos_viagem FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Excluir produtos de viagem para autenticados" ON public.produtos_viagem FOR DELETE TO authenticated USING (true);

-- reembolsos
DROP POLICY IF EXISTS "Leitura de reembolsos para todos autenticados" ON public.reembolsos;
CREATE POLICY "Leitura de reembolsos para todos autenticados" ON public.reembolsos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserir reembolsos para autenticados" ON public.reembolsos;
CREATE POLICY "Inserir reembolsos para autenticados" ON public.reembolsos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar reembolsos para autenticados" ON public.reembolsos;
CREATE POLICY "Atualizar reembolsos para autenticados" ON public.reembolsos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Excluir reembolsos apenas por admins" ON public.reembolsos;
CREATE POLICY "Excluir reembolsos apenas por admins" ON public.reembolsos FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- lembretes
DROP POLICY IF EXISTS "Leitura de lembretes para todos autenticados" ON public.lembretes;
CREATE POLICY "Leitura de lembretes para todos autenticados" ON public.lembretes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserir lembretes para autenticados" ON public.lembretes;
CREATE POLICY "Inserir lembretes para autenticados" ON public.lembretes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Atualizar lembretes para autenticados" ON public.lembretes;
CREATE POLICY "Atualizar lembretes para autenticados" ON public.lembretes FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Excluir lembretes para autenticados" ON public.lembretes;
CREATE POLICY "Excluir lembretes para autenticados" ON public.lembretes FOR DELETE TO authenticated USING (true);

-- formas_recebimento, loc_pagamentos e loc_conferencias
DROP POLICY IF EXISTS "Permitir leitura pública de formas_recebimento" ON public.formas_recebimento;
CREATE POLICY "Permitir leitura pública de formas_recebimento" ON public.formas_recebimento FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir tudo para administradores em formas_recebimento" ON public.formas_recebimento;
CREATE POLICY "Permitir tudo para administradores em formas_recebimento" ON public.formas_recebimento FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados em loc_pagamentos" ON public.loc_pagamentos;
CREATE POLICY "Permitir leitura para autenticados em loc_pagamentos" ON public.loc_pagamentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir escrita para autenticados em loc_pagamentos" ON public.loc_pagamentos;
CREATE POLICY "Permitir escrita para autenticados em loc_pagamentos" ON public.loc_pagamentos FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados em loc_conferencias" ON public.loc_conferencias;
CREATE POLICY "Permitir leitura para autenticados em loc_conferencias" ON public.loc_conferencias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir escrita para autenticados em loc_conferencias" ON public.loc_conferencias;
CREATE POLICY "Permitir escrita para autenticados em loc_conferencias" ON public.loc_conferencias FOR ALL TO authenticated USING (true);

-- comentários, notificações, todo, escala, campanhas, metas e templates
CREATE POLICY "Acesso total de comentarios para autenticados" ON public.comentarios FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total de notificacoes para autenticados" ON public.notificacoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total de colunas todo para autenticados" ON public.todo_columns FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total de cartoes todo para autenticados" ON public.todo_cards FOR ALL TO authenticated USING (true);

CREATE POLICY "Leitura de campanhas para autenticados" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestão de campanhas por admin" ON public.campaigns FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Leitura de metas para autenticados" ON public.meta_periodos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestão de metas por admin" ON public.meta_periodos FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Leitura de faixas de metas para autenticados" ON public.meta_faixas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestão de faixas de metas por admin" ON public.meta_faixas FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Acesso total a escala_diaria" ON public.escala_diaria FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total a escala_solicitacoes" ON public.escala_solicitacoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total a escala_banco_folgas" ON public.escala_banco_folgas FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total a escala_eventos" ON public.escala_eventos FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir insercao pública de feedback nps" ON public.feedbacks_nps FOR INSERT TO public, anon, authenticated WITH CHECK (true);
CREATE POLICY "Leitura de feedback nps para autenticados" ON public.feedbacks_nps FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura de templates para autenticados" ON public.templates_mensagem FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestao de templates por admins" ON public.templates_mensagem FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Mensagens diretas acesso autenticado" ON public.mensagens_diretas FOR ALL TO authenticated 
USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id);

CREATE POLICY "Push subscriptions pessoais" ON public.push_subscriptions FOR ALL TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins leem audit_logs" ON public.audit_logs FOR SELECT TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- 21. GATILHOS (TRIGGERS) E FUNÇÕES DE SISTEMA
-- ============================================================================

-- Gatilho de Novo Usuário (Auth -> Profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, ativo, participa_escala)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', 'Novo Consultor'),
    new.email,
    'consultor',
    true,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET nome = EXCLUDED.nome, email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Proteção de Papel (Role)
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) IS DISTINCT FROM 'admin' THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;
CREATE TRIGGER on_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_role_update();

-- RPC Administrativa: Criar Usuário no Supabase Auth com Hashing Seguro
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email TEXT,
  user_nome TEXT,
  user_password TEXT,
  user_role TEXT
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem cadastrar consultores.';
  END IF;

  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(user_password, gen_salt('bf', 10));

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    role, aud, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000', user_email,
    encrypted_pw, NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('nome', user_nome, 'email_verified', true),
    NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_user_id, new_user_id, new_user_id::text,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email, 'email_verified', true, 'phone_verified', false),
    'email', NOW(), NOW(), NOW()
  );

  UPDATE public.profiles
  SET role = user_role
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Administrativa: Definir Senha de Usuário
CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  new_password TEXT,
  user_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar senhas.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf', 10)),
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Obter Itinerário Público da Viagem
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
    'codigo_ref', v.codigo_ref,
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

-- RPC: Buscar Balcão Co-Piloto (Busca Global Rápida)
CREATE OR REPLACE FUNCTION public.buscar_balcao_co_piloto(query_text TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    raw_query TEXT;
    clean_digits TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    raw_query := LOWER(TRIM(query_text));
    clean_digits := REGEXP_REPLACE(query_text, '\D', '', 'g');

    SELECT COALESCE(JSON_AGG(row_data), '[]'::json) INTO result
    FROM (
        SELECT 
            JSON_BUILD_OBJECT(
                'id', c.id,
                'nome', c.nome,
                'cpf', c.documento,
                'telefone', c.telefone,
                'email', c.email,
                'codigoRef', c.codigo_ref
            ) AS cliente,
            COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                    'id', v.id,
                    'titulo', COALESCE(v.destino, 'Viagem'),
                    'consultorNome', COALESCE(p.nome, 'Consultor Titular'),
                    'consultorId', v.consultor_id,
                    'destino', COALESCE(v.destino, ''),
                    'status', v.status,
                    'codigoRef', v.codigo_ref
                ))
                FROM public.viagens v
                LEFT JOIN public.profiles p ON p.id = v.consultor_id
                WHERE v.cliente_id = c.id 
                   OR LOWER(v.destino) LIKE '%' || raw_query || '%'
                   OR LOWER(COALESCE(v.codigo_localizador, '')) LIKE '%' || raw_query || '%'
                   OR LOWER(COALESCE(v.codigo_ref, '')) LIKE '%' || raw_query || '%'
            ), '[]'::json) AS viagens,
            COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                    'id', o.id,
                    'titulo', COALESCE(o.destino, 'Orçamento'),
                    'consultorNome', COALESCE(p.nome, 'Consultor Titular'),
                    'consultorId', o.consultor_id,
                    'data', CAST(o.created_at AS TEXT),
                    'total', 'R$ ' || COALESCE(CAST(o.valor_proposta AS TEXT), '0,00'),
                    'codigoRef', o.codigo_ref
                ))
                FROM public.orcamentos o
                LEFT JOIN public.profiles p ON p.id = o.consultor_id
                WHERE o.cliente_id = c.id 
                   OR LOWER(COALESCE(o.destino, '')) LIKE '%' || raw_query || '%'
                   OR LOWER(COALESCE(o.nome_cliente, '')) LIKE '%' || raw_query || '%'
                   OR LOWER(COALESCE(o.codigo_ref, '')) LIKE '%' || raw_query || '%'
            ), '[]'::json) AS orcamentos,
            '[]'::json AS reembolsos
        FROM public.clientes c
        WHERE LOWER(c.nome) LIKE '%' || raw_query || '%'
           OR LOWER(COALESCE(c.email, '')) LIKE '%' || raw_query || '%'
           OR LOWER(COALESCE(c.codigo_ref, '')) LIKE '%' || raw_query || '%'
           OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.documento, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
           OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.telefone, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
           OR EXISTS (
                SELECT 1 FROM public.viagens v 
                WHERE v.cliente_id = c.id AND (
                    LOWER(v.destino) LIKE '%' || raw_query || '%' 
                    OR LOWER(COALESCE(v.codigo_localizador, '')) LIKE '%' || raw_query || '%'
                    OR LOWER(COALESCE(v.codigo_ref, '')) LIKE '%' || raw_query || '%'
                )
           )
           OR EXISTS (
                SELECT 1 FROM public.orcamentos o 
                WHERE o.cliente_id = c.id AND (
                    LOWER(COALESCE(o.destino, '')) LIKE '%' || raw_query || '%' 
                    OR LOWER(COALESCE(o.nome_cliente, '')) LIKE '%' || raw_query || '%'
                    OR LOWER(COALESCE(o.codigo_ref, '')) LIKE '%' || raw_query || '%'
                )
           )
    ) row_data;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Obter Viagem Co-Piloto
CREATE OR REPLACE FUNCTION public.obter_viagem_co_piloto(p_trip_id TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    SELECT row_to_json(v_data) INTO result
    FROM (
        SELECT 
            v.*,
            JSON_BUILD_OBJECT(
                'id', c.id,
                'nome', c.nome,
                'email', c.email,
                'telefone', c.telefone,
                'documento', c.documento,
                'google_drive_folder_url', c.google_drive_folder_url,
                'passaportes', c.passaportes
            ) AS cliente,
            COALESCE((
                SELECT JSON_AGG(row_to_json(p))
                FROM public.produtos_viagem p
                WHERE p.viagem_id = v.id
            ), '[]'::json) AS produtos,
            COALESCE((
                SELECT JSON_AGG(row_to_json(r))
                FROM public.reembolsos r
                WHERE r.viagem_id = v.id
            ), '[]'::json) AS reembolsos
        FROM public.viagens v
        LEFT JOIN public.clientes c ON c.id = v.cliente_id
        WHERE v.id::text = p_trip_id
    ) v_data;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Obter Orçamento Co-Piloto
CREATE OR REPLACE FUNCTION public.obter_orcamento_co_piloto(p_orc_id TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    SELECT row_to_json(o_data) INTO result
    FROM (
        SELECT 
            o.*,
            JSON_BUILD_OBJECT(
                'id', c.id,
                'nome', c.nome,
                'email', c.email,
                'telefone', c.telefone,
                'documento', c.documento
            ) AS cliente
        FROM public.orcamentos o
        LEFT JOIN public.clientes c ON c.id = o.cliente_id
        WHERE o.id::text = p_orc_id
    ) o_data;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Obter Produtos Co-Piloto
CREATE OR REPLACE FUNCTION public.obter_produtos_co_piloto(p_trip_id TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    SELECT COALESCE(JSON_AGG(row_to_json(p)), '[]'::json) INTO result
    FROM public.produtos_viagem p
    WHERE p.viagem_id::text = p_trip_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Atualizar Orçamento Co-Piloto
CREATE OR REPLACE FUNCTION public.atualizar_orcamento_co_piloto(p_orc_id TEXT, p_payload JSON)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    UPDATE public.orcamentos
    SET 
        temperatura = COALESCE(p_payload->>'temperatura', temperatura),
        sub_status = COALESCE(p_payload->>'sub_status', sub_status),
        status = COALESCE(p_payload->>'status', status),
        notas_negociacao = COALESCE(p_payload->>'notas_negociacao', notas_negociacao),
        valor_proposta = CASE 
                            WHEN p_payload->>'valor_proposta' IS NOT NULL AND (p_payload->>'valor_proposta') != '' 
                            THEN (p_payload->>'valor_proposta')::numeric 
                            ELSE valor_proposta 
                         END,
        updated_at = NOW()
    WHERE id::text = p_orc_id
    RETURNING row_to_json(public.orcamentos.*) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Atualizar Viagem Co-Piloto
CREATE OR REPLACE FUNCTION public.atualizar_viagem_co_piloto(p_trip_id TEXT, p_payload JSON)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    UPDATE public.viagens
    SET 
        cliente_id = COALESCE((p_payload->>'cliente_id')::uuid, cliente_id),
        consultor_id = COALESCE((p_payload->>'consultor_id')::uuid, consultor_id),
        destino = COALESCE(p_payload->>'destino', destino),
        codigo_localizador = COALESCE(p_payload->>'codigo_localizador', codigo_localizador),
        valor_total = CASE WHEN p_payload->>'valor_total' IS NOT NULL AND (p_payload->>'valor_total') != '' THEN (p_payload->>'valor_total')::numeric ELSE valor_total END,
        data_ida = CASE WHEN p_payload->>'data_ida' IS NOT NULL AND (p_payload->>'data_ida') != '' THEN (p_payload->>'data_ida')::date ELSE data_ida END,
        data_volta = CASE WHEN p_payload->>'data_volta' IS NOT NULL AND (p_payload->>'data_volta') != '' THEN (p_payload->>'data_volta')::date ELSE data_volta END,
        data_financeiro = CASE WHEN p_payload->>'data_financeiro' IS NOT NULL AND (p_payload->>'data_financeiro') != '' THEN (p_payload->>'data_financeiro')::date ELSE data_financeiro END,
        status = COALESCE(p_payload->>'status', status),
        observacoes = COALESCE(p_payload->>'observacoes', observacoes),
        processo_conferido = CASE WHEN p_payload->>'processo_conferido' IS NOT NULL THEN (p_payload->>'processo_conferido')::boolean ELSE processo_conferido END,
        updated_at = NOW()
    WHERE id::text = p_trip_id
    RETURNING row_to_json(public.viagens.*) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Salvar Produto Co-Piloto
CREATE OR REPLACE FUNCTION public.salvar_produto_co_piloto(p_prod_id TEXT, p_payload JSON)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    IF p_prod_id IS NOT NULL AND p_prod_id != '' AND EXISTS (SELECT 1 FROM public.produtos_viagem WHERE id::text = p_prod_id) THEN
        UPDATE public.produtos_viagem
        SET 
            tipo = COALESCE(p_payload->>'tipo', tipo),
            fornecedor = COALESCE(p_payload->>'fornecedor', fornecedor),
            descricao = COALESCE(p_payload->>'descricao', descricao),
            status = COALESCE(p_payload->>'status', status),
            valor_venda = CASE WHEN p_payload->>'valor_venda' IS NOT NULL AND (p_payload->>'valor_venda') != '' THEN (p_payload->>'valor_venda')::numeric ELSE valor_venda END,
            valor_custo = CASE WHEN p_payload->>'valor_custo' IS NOT NULL AND (p_payload->>'valor_custo') != '' THEN (p_payload->>'valor_custo')::numeric ELSE valor_custo END,
            tarifa = CASE WHEN p_payload->>'tarifa' IS NOT NULL AND (p_payload->>'tarifa') != '' THEN (p_payload->>'tarifa')::numeric ELSE tarifa END,
            taxa = CASE WHEN p_payload->>'taxa' IS NOT NULL AND (p_payload->>'taxa') != '' THEN (p_payload->>'taxa')::numeric ELSE taxa END,
            comissao = CASE WHEN p_payload->>'comissao' IS NOT NULL AND (p_payload->>'comissao') != '' THEN (p_payload->>'comissao')::numeric ELSE comissao END,
            markup = CASE WHEN p_payload->>'markup' IS NOT NULL AND (p_payload->>'markup') != '' THEN (p_payload->>'markup')::numeric ELSE markup END,
            rav = CASE WHEN p_payload->>'rav' IS NOT NULL AND (p_payload->>'rav') != '' THEN (p_payload->>'rav')::numeric ELSE rav END,
            updated_at = NOW()
        WHERE id::text = p_prod_id
        RETURNING row_to_json(public.produtos_viagem.*) INTO result;
    ELSE
        INSERT INTO public.produtos_viagem (
            viagem_id, tipo, fornecedor, descricao, status, valor_venda, valor_custo,
            tarifa, taxa, comissao, markup, rav, data_servico
        ) VALUES (
            (p_payload->>'viagem_id')::uuid,
            COALESCE(p_payload->>'tipo', 'Diversos'),
            COALESCE(p_payload->>'fornecedor', ''),
            COALESCE(p_payload->>'descricao', ''),
            COALESCE(p_payload->>'status', 'reservado'),
            COALESCE((p_payload->>'valor_venda')::numeric, 0),
            COALESCE((p_payload->>'valor_custo')::numeric, 0),
            COALESCE((p_payload->>'tarifa')::numeric, 0),
            COALESCE((p_payload->>'taxa')::numeric, 0),
            COALESCE((p_payload->>'comissao')::numeric, 0),
            COALESCE((p_payload->>'markup')::numeric, 0),
            COALESCE((p_payload->>'rav')::numeric, 0),
            COALESCE((p_payload->>'data_servico')::date, CURRENT_DATE)
        )
        RETURNING row_to_json(public.produtos_viagem.*) INTO result;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Deletar Produto Co-Piloto
CREATE OR REPLACE FUNCTION public.deletar_produto_co_piloto(p_prod_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    DELETE FROM public.produtos_viagem WHERE id::text = p_prod_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilhos de Trilha de Auditoria
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  BEGIN
    current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (tabela, operacao, registro_id, dados_novos, executado_por)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW), current_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (tabela, operacao, registro_id, dados_antigos, dados_novos, executado_por)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), current_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (tabela, operacao, registro_id, dados_antigos, executado_por)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), current_user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_clientes_trigger ON public.clientes;
CREATE TRIGGER audit_clientes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_viagens_trigger ON public.viagens;
CREATE TRIGGER audit_viagens_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.viagens
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_reembolsos_trigger ON public.reembolsos;
CREATE TRIGGER audit_reembolsos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reembolsos
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- ============================================================================
-- 22. DADOS INICIAIS (SEEDS DE SISTEMA)
-- ============================================================================

-- Formas de Recebimento Padrão
INSERT INTO public.formas_recebimento (nome, icone, ativo) VALUES
('Cartão de Crédito', '💳', true),
('PIX', '⚡', true),
('Boleto Bancário', '📄', true),
('Transferência / TED', '🏦', true),
('Dinheiro / Espécie', '💵', true),
('Faturamento Agência', '🏢', true),
('DESCONTO', '🏷️', true),
('PREJUÍZO', '📉', true)
ON CONFLICT DO NOTHING;

-- Tipos de Produto Padrão
INSERT INTO public.tipos_produto (nome, icone, campos_adicionais) VALUES
('Aéreo Facial', '✈️', '[{"id": "classe_cabine", "label": "Classe de Cabine", "tipo": "select", "opcoes": ["Econômica", "Premium", "Executiva"], "obrigatorio": true, "alvo": "descricao"}]'::jsonb),
('Aéreo Operadora', '✈️', '[{"id": "classe_cabine", "label": "Classe de Cabine", "tipo": "select", "opcoes": ["Econômica", "Premium", "Executiva"], "obrigatorio": true, "alvo": "descricao"}]'::jsonb),
('Carro', '🚗', '[]'::jsonb),
('Circuito', '🗺️', '[]'::jsonb),
('Cruzeiro', '🚢', '[{"id": "companhia", "label": "Companhia de Cruzeiro", "tipo": "select", "opcoes": ["MSC Cruzeiros", "Costa Cruzeiros", "Royal Caribbean", "Celebrity Cruises", "Norwegian Cruise Line", "Outra"], "obrigatorio": true, "alvo": "fornecedor"}]'::jsonb),
('Hotel', '🏨', '[]'::jsonb),
('Passeios', '🎟️', '[]'::jsonb),
('Seguro Viagem', '🛡️', '[]'::jsonb),
('Ingressos', '🎫', '[]'::jsonb),
('Transfer', '🚐', '[]'::jsonb),
('Trem', '🚂', '[]'::jsonb),
('Diversos', '📦', '[]'::jsonb),
('Casas', '🏡', '[]'::jsonb),
('Cias aéreas - Assento/bagagem', '🧳', '[]'::jsonb),
('Cias aéreas - Emissão Com Pontos', '🪙', '[]'::jsonb)
ON CONFLICT (nome) DO UPDATE 
SET icone = EXCLUDED.icone, campos_adicionais = EXCLUDED.campos_adicionais;

-- Modelos de Mensagem Padrão
INSERT INTO public.templates_mensagem (titulo, descricao, conteudo, variaveis_suportadas) VALUES
('Confirmação de Reserva (LOC)', 'Mensagem enviada logo após o fechamento da viagem.', 'Olá, {{cliente}}! Sua viagem para {{destino}} foi confirmada. Código localizador (LOC): {{localizador}}. Acompanhe seu itinerário completo e atualizado em tempo real acessando: {{link_itinerario}}. Qualquer dúvida, estou à disposição! Abraços, {{consultor}}.', ARRAY['cliente', 'destino', 'localizador', 'link_itinerario', 'consultor']),
('Pré-embarque e Vouchers', 'Lembrete de viagem enviado dias antes da ida.', 'Olá, {{cliente}}! Sua viagem para {{destino}} está chegando (embarque em {{data_ida}})! 🎉 Seguem seus vouchers e informações importantes. Você pode visualizar todos os detalhes e documentos no seu itinerário digital: {{link_itinerario}}. Prepare as malas e tenha uma ótima viagem! Qualquer dúvida, fale com {{consultor}}.', ARRAY['cliente', 'destino', 'data_ida', 'link_itinerario', 'consultor']),
('Boas-vindas Pós-Viagem & NPS', 'Mensagem enviada após o retorno, solicitando feedback.', 'Olá, {{cliente}}! Esperamos que sua viagem para {{destino}} tenha sido maravilhosa e repleta de momentos inesquecíveis! Gostaríamos muito de saber como foi sua experiência conosco. Poderia dedicar 1 minutinho para avaliar nosso atendimento? Acesse o link: {{link_feedback}}. Sua opinião é preciosa para nós! Abraços, {{consultor}}.', ARRAY['cliente', 'destino', 'link_feedback', 'consultor']),
('Acompanhamento de Orçamento', 'Follow-up de proposta enviada para o lead.', 'Olá, {{cliente}}! Tudo bem? Passando para saber se você conseguiu analisar a proposta de viagem para {{destino}} que enviamos. Tem alguma dúvida ou gostaria de fazer algum ajuste no roteiro? Fale com {{consultor}}.', ARRAY['cliente', 'destino', 'consultor']),
('Aviso de Vencimento de Passaporte', 'Disparo de alerta preventivo para renovação de passaporte.', 'Olá, {{cliente}}! Notamos que a validade do seu passaporte está próxima de expirar. Lembramos que para destinos internacionais, a maioria dos países exige validade mínima de 6 meses no embarque. Recomendamos iniciar o processo de renovação em breve. Se precisar de auxílio, fale com {{consultor}}.', ARRAY['cliente', 'consultor']),
('Documentação Pendente', 'Solicitação de documentos para a emissão.', 'Olá, {{cliente}}! Para darmos andamento à emissão da sua viagem para {{destino}}, precisamos que nos envie foto ou cópia do seu documento oficial (RG ou Passaporte). Pode me enviar por aqui mesmo. Qualquer dúvida, fale com {{consultor}}.', ARRAY['cliente', 'destino', 'consultor']),
('Lembrete de Pagamento', 'Aviso de vencimento de faturamento pendente.', 'Olá, {{cliente}}! Gostaria de lembrar sobre o vencimento da parcela pendente referente à sua viagem para {{destino}} (Localizador: {{localizador}}). Caso já tenha efetuado o pagamento, por favor desconsidere. Qualquer dúvida, estou à disposição. Abraços, {{consultor}}.', ARRAY['cliente', 'destino', 'localizador', 'consultor']),
('Avaliação de Atendimento Geral', 'Mensagem padrão de NPS sem destino específico.', 'Olá, {{cliente}}! Sua opinião é fundamental para melhorarmos sempre nossos serviços. Por favor, avalie nosso atendimento neste breve link: {{link_feedback}}. Agradecemos muito a sua parceria! Equipe PaxFlow.', ARRAY['cliente', 'link_feedback'])
ON CONFLICT DO NOTHING;
