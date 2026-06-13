-- Adicionar a coluna limite_upload_mb na tabela global_settings se não existir
ALTER TABLE global_settings 
ADD COLUMN IF NOT EXISTS limite_upload_mb INTEGER DEFAULT 25;
