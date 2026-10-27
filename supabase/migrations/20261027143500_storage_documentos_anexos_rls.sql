-- ============================================================================
-- PAXFLOW - POLÍTICAS RLS PARA STORAGE (DOCUMENTOS-CLIENTES) E TABELA DOCUMENTOS_ANEXOS
-- Data: 2026-10-27
-- Descrição:
--   Garante permissões completas de leitura, upload, atualização e exclusão
--   para consultores autenticados no bucket de storage 'documentos-clientes'
--   e na tabela 'documentos_anexos', eliminando o erro de 'Acesso negado' (RLS).
-- ============================================================================

-- 1. Assegurar que o bucket 'documentos-clientes' existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('documentos-clientes', 'documentos-clientes', false)
        ON CONFLICT (id) DO UPDATE 
        SET public = EXCLUDED.public;
    END IF;
END $$;

-- 2. Políticas de RLS para o bucket no storage.objects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        
        -- Leitura de arquivos do bucket documentos-clientes
        DROP POLICY IF EXISTS "Permitir leitura de documentos-clientes para autenticados" ON storage.objects;
        CREATE POLICY "Permitir leitura de documentos-clientes para autenticados"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'documentos-clientes');

        -- Upload de arquivos para o bucket documentos-clientes
        DROP POLICY IF EXISTS "Permitir upload de documentos-clientes para autenticados" ON storage.objects;
        CREATE POLICY "Permitir upload de documentos-clientes para autenticados"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'documentos-clientes');

        -- Atualização de arquivos do bucket documentos-clientes
        DROP POLICY IF EXISTS "Permitir atualizacao de documentos-clientes para autenticados" ON storage.objects;
        CREATE POLICY "Permitir atualizacao de documentos-clientes para autenticados"
        ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id = 'documentos-clientes')
        WITH CHECK (bucket_id = 'documentos-clientes');

        -- Exclusão de arquivos do bucket documentos-clientes
        DROP POLICY IF EXISTS "Permitir exclusao de documentos-clientes para autenticados" ON storage.objects;
        CREATE POLICY "Permitir exclusao de documentos-clientes para autenticados"
        ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id = 'documentos-clientes');

    END IF;
END $$;

-- 3. Habilitação de RLS e Políticas na tabela public.documentos_anexos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documentos_anexos') THEN
        
        ALTER TABLE public.documentos_anexos ENABLE ROW LEVEL SECURITY;

        -- Leitura de anexos para usuários autenticados
        DROP POLICY IF EXISTS "Permitir leitura de documentos_anexos para autenticados" ON public.documentos_anexos;
        CREATE POLICY "Permitir leitura de documentos_anexos para autenticados"
        ON public.documentos_anexos FOR SELECT TO authenticated
        USING (true);

        -- Inserção de anexos para usuários autenticados
        DROP POLICY IF EXISTS "Permitir insercao de documentos_anexos para autenticados" ON public.documentos_anexos;
        CREATE POLICY "Permitir insercao de documentos_anexos para autenticados"
        ON public.documentos_anexos FOR INSERT TO authenticated
        WITH CHECK (true);

        -- Atualização de anexos para usuários autenticados
        DROP POLICY IF EXISTS "Permitir atualizacao de documentos_anexos para autenticados" ON public.documentos_anexos;
        CREATE POLICY "Permitir atualizacao de documentos_anexos para autenticados"
        ON public.documentos_anexos FOR UPDATE TO authenticated
        USING (true)
        WITH CHECK (true);

        -- Exclusão de anexos para usuários autenticados
        DROP POLICY IF EXISTS "Permitir exclusao de documentos_anexos para autenticados" ON public.documentos_anexos;
        CREATE POLICY "Permitir exclusao de documentos_anexos para autenticados"
        ON public.documentos_anexos FOR DELETE TO authenticated
        USING (true);

    END IF;
END $$;
