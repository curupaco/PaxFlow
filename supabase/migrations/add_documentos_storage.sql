-- Criar o bucket 'documentos-clientes' para armazenamento de passaportes e propostas
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-clientes', 'documentos-clientes', false)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas se existirem para evitar duplicidade ou conflitos
DROP POLICY IF EXISTS "Permitir upload para consultores autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura de documentos para consultores autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de documentos para consultores autenticados" ON storage.objects;

-- Criar políticas de segurança para o bucket documentos-clientes
CREATE POLICY "Permitir upload para consultores autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos-clientes');

CREATE POLICY "Permitir leitura de documentos para consultores autenticados"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documentos-clientes');

CREATE POLICY "Permitir exclusão de documentos para consultores autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos-clientes');
