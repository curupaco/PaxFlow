-- ==============================================================================
-- MIGRATION: MÓDULO FINANCEIRO DE CONTAS A PAGAR, REMESSAS E PLANO DE CONTAS
-- Data: 29/10/2026
-- Descrição: Criação das tabelas de gestão financeira, RBAC, auditoria e seeds.
-- ==============================================================================

-- 1. Permissão de Acesso ao Financeiro na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS acesso_financeiro BOOLEAN DEFAULT FALSE;

-- 2. Tabela de Tipos de Custo (Plano de Contas - Nível 1)
CREATE TABLE IF NOT EXISTS public.fin_tipos_custo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo INT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Categorias (Plano de Contas - Nível 2)
CREATE TABLE IF NOT EXISTS public.fin_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_custo_id UUID NOT NULL REFERENCES public.fin_tipos_custo(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Subcategorias (Plano de Contas - Nível 3, opcional)
CREATE TABLE IF NOT EXISTS public.fin_subcategorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID NOT NULL REFERENCES public.fin_categorias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Contas Bancárias e Caixas da Agência
CREATE TABLE IF NOT EXISTS public.fin_contas_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_banco TEXT NOT NULL,
    tipo TEXT DEFAULT 'corrente' CHECK (tipo IN ('corrente', 'poupanca', 'caixa')),
    saldo_inicial NUMERIC(15, 2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Remessas Agrupadas de Pagamento (Mestre-Detalhe)
CREATE TABLE IF NOT EXISTS public.fin_remessas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    favorecido TEXT NOT NULL,
    data_prevista DATE NOT NULL,
    valor_total NUMERIC(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'parcial', 'paga', 'cancelada')),
    comprovante_url TEXT,
    observacoes TEXT,
    criado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela Principal de Contas a Pagar
CREATE TABLE IF NOT EXISTS public.fin_contas_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remessa_id UUID REFERENCES public.fin_remessas(id) ON DELETE SET NULL,
    tipo_custo_id UUID NOT NULL REFERENCES public.fin_tipos_custo(id),
    categoria_id UUID NOT NULL REFERENCES public.fin_categorias(id),
    subcategoria_id UUID REFERENCES public.fin_subcategorias(id),
    conta_bancaria_id UUID REFERENCES public.fin_contas_bancarias(id),
    viagem_id UUID REFERENCES public.viagens(id) ON DELETE SET NULL,
    contrato_recorrente_id UUID,
    favorecido TEXT NOT NULL,
    descricao TEXT,
    valor_nominal NUMERIC(15, 2) NOT NULL,
    valor_estimado BOOLEAN DEFAULT FALSE,
    juros_multa NUMERIC(15, 2) DEFAULT 0.00,
    desconto NUMERIC(15, 2) DEFAULT 0.00,
    valor_pago NUMERIC(15, 2) DEFAULT 0.00,
    data_vencimento DATE NOT NULL,
    data_vencimento_operacional DATE,
    data_pagamento DATE,
    forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'boleto', 'transferencia', 'debito', 'dinheiro')),
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    parcela_numero INT DEFAULT 1,
    parcela_total INT DEFAULT 1,
    recorrente BOOLEAN DEFAULT FALSE,
    periodicidade TEXT DEFAULT 'mensal' CHECK (periodicidade IN ('mensal', 'anual', 'semanal')),
    comprovante_url TEXT,
    observacoes TEXT,
    criado_por UUID REFERENCES auth.users(id),
    baixado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Auditoria Financeira (Trilha Imutável)
CREATE TABLE IF NOT EXISTS public.fin_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id UUID NOT NULL REFERENCES public.fin_contas_pagar(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    acao TEXT NOT NULL CHECK (acao IN ('criacao', 'edicao', 'baixa', 'estorno', 'cancelamento')),
    detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_fin_contas_vencimento ON public.fin_contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_fin_contas_venc_operacional ON public.fin_contas_pagar(data_vencimento_operacional);
CREATE INDEX IF NOT EXISTS idx_fin_contas_status ON public.fin_contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_fin_contas_categoria ON public.fin_contas_pagar(categoria_id);
CREATE INDEX IF NOT EXISTS idx_fin_contas_remessa ON public.fin_contas_pagar(remessa_id);
CREATE INDEX IF NOT EXISTS idx_fin_auditoria_conta ON public.fin_auditoria(conta_id);

-- RLS (Row Level Security)
ALTER TABLE public.fin_tipos_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_remessas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso permissivas para usuários autenticados (governança refinada via RBAC na aplicação)
DO $$
BEGIN
    DROP POLICY IF EXISTS "fin_tipos_custo_policy" ON public.fin_tipos_custo;
    CREATE POLICY "fin_tipos_custo_policy" ON public.fin_tipos_custo FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "fin_categorias_policy" ON public.fin_categorias;
    CREATE POLICY "fin_categorias_policy" ON public.fin_categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "fin_subcategorias_policy" ON public.fin_subcategorias;
    CREATE POLICY "fin_subcategorias_policy" ON public.fin_subcategorias FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "fin_contas_bancarias_policy" ON public.fin_contas_bancarias;
    CREATE POLICY "fin_contas_bancarias_policy" ON public.fin_contas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "fin_remessas_policy" ON public.fin_remessas;
    CREATE POLICY "fin_remessas_policy" ON public.fin_remessas FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "fin_contas_pagar_policy" ON public.fin_contas_pagar;
    CREATE POLICY "fin_contas_pagar_policy" ON public.fin_contas_pagar FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "fin_auditoria_policy" ON public.fin_auditoria;
    CREATE POLICY "fin_auditoria_policy" ON public.fin_auditoria FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- SEEDS: TIPOS DE CUSTO E CATEGORIAS PADRÃO DO PLANO DE CONTAS
-- ==============================================================================

-- 1. Inserir os 5 Tipos de Custo
INSERT INTO public.fin_tipos_custo (codigo, nome, ordem) VALUES
(1, 'Custos Diretos', 1),
(2, 'Despesas Fixas', 2),
(3, 'Despesas Variáveis', 3),
(4, 'Investimentos', 4),
(5, 'Gastos Não Operacionais', 5)
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome;

-- 2. Inserir Categorias dos Custos Diretos (Código 1)
DO $$
DECLARE
    tipo_id UUID;
BEGIN
    SELECT id INTO tipo_id FROM public.fin_tipos_custo WHERE codigo = 1;
    INSERT INTO public.fin_categorias (tipo_custo_id, nome, ordem) VALUES
    (tipo_id, 'COMISSÕES', 1),
    (tipo_id, 'PREMIAÇÕES + CAMPANHAS', 2),
    (tipo_id, 'ROYALTIES', 3),
    (tipo_id, 'TAXA MARKETING', 4),
    (tipo_id, 'IMPOSTO', 5),
    (tipo_id, 'IMPOSTO PARCELADO', 6)
    ON CONFLICT DO NOTHING;
END $$;

-- 3. Inserir Categorias das Despesas Fixas (Código 2)
DO $$
DECLARE
    tipo_id UUID;
BEGIN
    SELECT id INTO tipo_id FROM public.fin_tipos_custo WHERE codigo = 2;
    INSERT INTO public.fin_categorias (tipo_custo_id, nome, ordem) VALUES
    (tipo_id, 'ALUGUEL', 1),
    (tipo_id, 'BENEFÍCIOS', 2),
    (tipo_id, 'CONDOMÍNIO', 3),
    (tipo_id, 'CONTABILIDADE', 4),
    (tipo_id, 'ENERGIA ELÉTRICA', 5),
    (tipo_id, 'FÉRIAS', 6),
    (tipo_id, 'FGTS', 7),
    (tipo_id, 'IMPRESSORA', 8),
    (tipo_id, 'INTERNET', 9),
    (tipo_id, 'IPTU', 10),
    (tipo_id, 'MÁQUINA CAFÉ', 11),
    (tipo_id, 'MATERIAL DE ESCRITÓRIO', 12),
    (tipo_id, 'MATERIAL DE LIMPEZA', 13),
    (tipo_id, 'PLANO DE SAÚDE', 14),
    (tipo_id, 'SALÁRIO', 15),
    (tipo_id, 'SISTEMA', 16),
    (tipo_id, 'TARIFA BANCÁRIA', 17),
    (tipo_id, 'TELEFONE', 18),
    (tipo_id, 'LIMPEZA LOJA', 19),
    (tipo_id, 'SEGURO', 20),
    (tipo_id, 'INSS/IRPF', 21)
    ON CONFLICT DO NOTHING;
END $$;

-- 4. Inserir Categorias das Despesas Variáveis (Código 3) com REPASSE AGAXTUR
DO $$
DECLARE
    tipo_id UUID;
BEGIN
    SELECT id INTO tipo_id FROM public.fin_tipos_custo WHERE codigo = 3;
    INSERT INTO public.fin_categorias (tipo_custo_id, nome, ordem) VALUES
    (tipo_id, 'BRINDE CLIENTE', 1),
    (tipo_id, 'BENFEITORIAS', 2),
    (tipo_id, 'COMEMORAÇÕES/REUNIÕES', 3),
    (tipo_id, 'MEDICINA DO TRABALHO', 4),
    (tipo_id, 'PREJUÍZO', 5),
    (tipo_id, 'UNIFORMES', 6),
    (tipo_id, 'REEMBOLSO PAX', 7),
    (tipo_id, 'PEDALADAS', 8),
    (tipo_id, 'REPASSE AGAXTUR', 9)
    ON CONFLICT DO NOTHING;
END $$;

-- 5. Inserir Categorias de Investimentos (Código 4)
DO $$
DECLARE
    tipo_id UUID;
BEGIN
    SELECT id INTO tipo_id FROM public.fin_tipos_custo WHERE codigo = 4;
    INSERT INTO public.fin_categorias (tipo_custo_id, nome, ordem) VALUES
    (tipo_id, 'SOCIAL MÍDEA', 1),
    (tipo_id, 'PATROCÍNIO DIGITAL', 2),
    (tipo_id, 'CURSOS E TREINAMENTOS', 3),
    (tipo_id, 'PARCERIAS / EVENTOS', 4)
    ON CONFLICT DO NOTHING;
END $$;

-- 6. Inserir Categorias de Gastos Não Operacionais (Código 5)
DO $$
DECLARE
    tipo_id UUID;
BEGIN
    SELECT id INTO tipo_id FROM public.fin_tipos_custo WHERE codigo = 5;
    INSERT INTO public.fin_categorias (tipo_custo_id, nome, ordem) VALUES
    (tipo_id, 'Despesas MKP', 1)
    ON CONFLICT DO NOTHING;
END $$;

-- 7. Inserir Contas Bancárias Padrão
INSERT INTO public.fin_contas_bancarias (nome_banco, tipo, saldo_inicial) VALUES
('Banco Itaú', 'corrente', 0.00),
('Banco Cora', 'corrente', 0.00),
('Banco Santander', 'corrente', 0.00),
('Caixa Físico Loja', 'caixa', 0.00)
ON CONFLICT DO NOTHING;
