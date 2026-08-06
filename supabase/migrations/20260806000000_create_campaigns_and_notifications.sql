-- 1. Criar a tabela public.campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tipo_meta VARCHAR(50) NOT NULL, -- 'xp_acumulado', 'cliente_criado', 'venda_aceita', 'lembrete_criado', 'reembolso_pago', 'produto_detalhado'
    meta_quantidade INTEGER NOT NULL,
    badge_key VARCHAR(50) NOT NULL,
    ativa BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Alterar a tabela public.notificacoes
-- Remover constraint de check existente se houver
ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_item_check;

-- Adicionar nova constraint incluindo 'campanha'
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_item_check CHECK (tipo_item IN ('orcamento', 'viagem', 'produto', 'mensagem', 'campanha'));

-- Adicionar coluna campaign_id referenciando public.campaigns
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- 3. Habilitar RLS nas tabelas
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas para a tabela campaigns
DROP POLICY IF EXISTS "Leitura de campanhas permitida a todos autenticados" ON public.campaigns;
DROP POLICY IF EXISTS "Acesso total de campanhas para administradores" ON public.campaigns;

CREATE POLICY "Leitura de campanhas permitida a todos autenticados" 
ON public.campaigns FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Acesso total de campanhas para administradores" 
ON public.campaigns FOR ALL 
TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
