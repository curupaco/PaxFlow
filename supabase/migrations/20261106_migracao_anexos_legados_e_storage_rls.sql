-- ==============================================================================
-- PAXFLOW: MIGRAÇÃO DE ANEXOS LEGADOS E POLÍTICAS DE RLS NO SUPABASE STORAGE
-- Data: 2026-11-06
-- Descrição:
--   1. Garante políticas de leitura e upload no bucket 'documentos-clientes'
--      eliminando o erro falso de 'Object not found' por falta de permissão.
--   2. Migra os 11 anexos históricos de viagens.observacoes para a tabela
--      oficial public.documentos_anexos.
-- ==============================================================================

-- 1. GARANTIR PERMISSÃO DE LEITURA E DOWNLOAD NO STORAGE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        DROP POLICY IF EXISTS "Permitir leitura de documentos-clientes para autenticados" ON storage.objects;
        CREATE POLICY "Permitir leitura de documentos-clientes para autenticados"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'documentos-clientes');

        DROP POLICY IF EXISTS "Permitir upload de documentos-clientes para autenticados" ON storage.objects;
        CREATE POLICY "Permitir upload de documentos-clientes para autenticados"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'documentos-clientes');
    END IF;
END $$;

-- 2. MIGRAR OS 11 ANEXOS LEGADOS DIRETAMENTE PARA A TABELA OFICIAL documentos_anexos
DO $$
DECLARE
    v RECORD;
    anexo JSONB;
    anexos_arr JSONB;
    match_str TEXT;
BEGIN
    FOR v IN 
        SELECT id, observacoes 
        FROM public.viagens 
        WHERE observacoes LIKE '%<!-- PAXFLOW_ANEXOS:[%'
    LOOP
        match_str := substring(v.observacoes FROM '<!-- PAXFLOW_ANEXOS:(.*?) -->');
        IF match_str IS NOT NULL AND match_str <> '' THEN
            BEGIN
                anexos_arr := match_str::jsonb;
                FOR anexo IN SELECT * FROM jsonb_array_elements(anexos_arr)
                LOOP
                    INSERT INTO public.documentos_anexos (
                        id,
                        viagem_id,
                        cliente_id,
                        rotulo,
                        tipo_documento,
                        nome_original,
                        storage_path,
                        mime_type,
                        tamanho_bytes,
                        created_by,
                        created_at
                    ) VALUES (
                        COALESCE((anexo->>'id')::uuid, gen_random_uuid()),
                        v.id,
                        (anexo->>'cliente_id')::uuid,
                        COALESCE(anexo->>'rotulo', anexo->>'nome_original', 'Documento'),
                        COALESCE(anexo->>'tipo_documento', 'OUTROS'),
                        COALESCE(anexo->>'nome_original', 'arquivo.pdf'),
                        anexo->>'storage_path',
                        COALESCE(anexo->>'mime_type', 'application/pdf'),
                        (anexo->>'tamanho_bytes')::bigint,
                        (anexo->>'created_by')::uuid,
                        COALESCE((anexo->>'created_at')::timestamptz, NOW())
                    )
                    ON CONFLICT (id) DO NOTHING;
                END LOOP;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao migrar anexo da viagem %: %', v.id, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

