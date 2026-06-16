-- 1. Criar tabela de tipos de produto
CREATE TABLE IF NOT EXISTS public.tipos_produto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    icone VARCHAR(10) DEFAULT '📦' NOT NULL,
    campos_adicionais JSONB DEFAULT '[]'::jsonb NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS e políticas na tabela
ALTER TABLE public.tipos_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos os usuários autenticados"
ON public.tipos_produto FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir tudo para administradores"
ON public.tipos_produto FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 2. Inserir tipos padrões iniciais
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
('Cias aéreas - Emissão Com Pontos', '🪙', '[]'::jsonb),
('MUDAR!', '⚠️', '[]'::jsonb)
ON CONFLICT (nome) DO UPDATE 
SET icone = EXCLUDED.icone, campos_adicionais = EXCLUDED.campos_adicionais;

-- 3. Atualizar a tabela de produtos_viagem
ALTER TABLE public.produtos_viagem DROP CONSTRAINT IF EXISTS produtos_viagem_tipo_check;
ALTER TABLE public.produtos_viagem ALTER COLUMN tipo TYPE VARCHAR(100);

-- Adicionar coluna dados_adicionais
ALTER TABLE public.produtos_viagem ADD COLUMN IF NOT EXISTS dados_adicionais JSONB DEFAULT '{}'::jsonb NOT NULL;

-- 4. Mapear dados existentes
-- 'voo' -> 'Aéreo Operadora'
UPDATE public.produtos_viagem SET tipo = 'Aéreo Operadora' WHERE tipo = 'voo';
-- 'hotel' -> 'Hotel'
UPDATE public.produtos_viagem SET tipo = 'Hotel' WHERE tipo = 'hotel';
-- 'seguro' -> 'Seguro Viagem'
UPDATE public.produtos_viagem SET tipo = 'Seguro Viagem' WHERE tipo = 'seguro';
-- 'passeio' -> 'Passeios'
UPDATE public.produtos_viagem SET tipo = 'Passeios' WHERE tipo = 'passeio';
-- 'outro' -> 'Diversos'
UPDATE public.produtos_viagem SET tipo = 'Diversos' WHERE tipo = 'outro';

-- Qualquer valor que não esteja na lista de tipos válidos vira 'MUDAR!'
UPDATE public.produtos_viagem 
SET tipo = 'MUDAR!' 
WHERE tipo NOT IN (
    'Aéreo Facial', 'Aéreo Operadora', 'Carro', 'Circuito', 'Cruzeiro', 'Hotel',
    'Passeios', 'Seguro Viagem', 'Ingressos', 'Transfer', 'Trem', 'Diversos',
    'Casas', 'Cias aéreas - Assento/bagagem', 'Cias aéreas - Emissão Com Pontos', 'MUDAR!'
);
