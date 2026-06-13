-- 1. Criar a tabela de mensagens diretas
CREATE TABLE IF NOT EXISTS public.mensagens_diretas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    remetente_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    assunto VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Criar a tabela de destinatários
CREATE TABLE IF NOT EXISTS public.mensagem_destinatarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID REFERENCES public.mensagens_diretas(id) ON DELETE CASCADE NOT NULL,
    destinatario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(5) CHECK (tipo IN ('para', 'cc')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.mensagens_diretas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagem_destinatarios ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
CREATE POLICY "Acesso total de mensagens_diretas para autenticados" ON public.mensagens_diretas FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total de mensagem_destinatarios para autenticados" ON public.mensagem_destinatarios FOR ALL TO authenticated USING (true);

-- 5. Alterar a tabela notificacoes para suportar mensagens diretas
ALTER TABLE public.notificacoes ALTER COLUMN comentario_id DROP NOT NULL;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS mensagem_id UUID REFERENCES public.mensagens_diretas(id) ON DELETE CASCADE;

-- Atualizar o CHECK constraint de tipo_item em notificacoes
ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_item_check;
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_item_check CHECK (tipo_item IN ('orcamento', 'viagem', 'produto', 'mensagem'));
