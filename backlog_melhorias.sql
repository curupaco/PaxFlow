-- ============================================================================
-- PaxFlow — Extensão de Banco de Dados: Gamificação dos Consultores
-- ============================================================================
-- Execute este script no SQL Editor do seu painel do Supabase.
-- ============================================================================

-- 1. Colunas de XP e Nível em Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS nivel INTEGER DEFAULT 1 NOT NULL;

-- 2. Tabela de logs de XP (garante unicidade de ações e auditoria)
CREATE TABLE IF NOT EXISTS public.profiles_xp_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    acao_chave TEXT UNIQUE NOT NULL, -- Ex: 'venda_aceita_orcamento_123' ou 'documento_upload_cliente_456'
    xp_ganho INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Tabela de medalhas (badges) conquistadas
CREATE TABLE IF NOT EXISTS public.profiles_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    badge_key VARCHAR(50) NOT NULL, -- Ex: 'SLA_CHAMP', 'GLOBETROTTER'
    conquistado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_profile_badge UNIQUE (profile_id, badge_key)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles_xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_badges ENABLE ROW LEVEL SECURITY;

-- Excluir políticas existentes se houver, para evitar erros de duplicidade
DROP POLICY IF EXISTS "Leitura de logs de XP permitida a todos autenticados" ON public.profiles_xp_logs;
DROP POLICY IF EXISTS "Leitura de conquistas permitida a todos autenticados" ON public.profiles_badges;

CREATE POLICY "Leitura de logs de XP permitida a todos autenticados" ON public.profiles_xp_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de conquistas permitida a todos autenticados" ON public.profiles_badges FOR SELECT TO authenticated USING (true);

-- 4. Função e Trigger para atualizar o Nível do Consultor automaticamente ao somar XP
CREATE OR REPLACE FUNCTION public.process_profile_xp_update()
RETURNS TRIGGER AS $$
DECLARE
    total_xp INTEGER;
    novo_nivel INTEGER;
    nivel_atual INTEGER;
BEGIN
    -- Obter a soma total de XP do consultor
    SELECT COALESCE(SUM(xp_ganho), 0) INTO total_xp 
    FROM public.profiles_xp_logs 
    WHERE profile_id = NEW.profile_id;
    
    -- Obter o nível atual registrado
    SELECT nivel INTO nivel_atual FROM public.profiles WHERE id = NEW.profile_id;
    
    -- Calcular novo nível com base na curva:
    -- Nível 1: 0 a 249 XP
    -- Nível 2: 250 a 749 XP
    -- Nível 3: 750 a 1499 XP
    -- Nível 4: 1500 a 2499 XP
    -- Nível 5: 2500+ XP (Níveis superiores a 5 exigem 1000 XP cada)
    IF total_xp < 250 THEN novo_nivel := 1;
    ELSIF total_xp < 750 THEN novo_nivel := 2;
    ELSIF total_xp < 1500 THEN novo_nivel := 3;
    ELSIF total_xp < 2500 THEN novo_nivel := 4;
    ELSE novo_nivel := 5 + ((total_xp - 2500) / 1000);
    END IF;
    
    -- Atualizar o perfil com o XP total acumulado e o nível correspondente
    UPDATE public.profiles 
    SET xp = total_xp, nivel = novo_nivel
    WHERE id = NEW.profile_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver, para recriar
DROP TRIGGER IF EXISTS on_xp_log_inserted ON public.profiles_xp_logs;

CREATE TRIGGER on_xp_log_inserted
    AFTER INSERT ON public.profiles_xp_logs
    FOR EACH ROW EXECUTE FUNCTION public.process_profile_xp_update();
