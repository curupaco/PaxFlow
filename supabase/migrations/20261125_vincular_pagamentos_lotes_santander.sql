-- ==============================================================================
-- MIGRATION: VINCULAR PAGAMENTOS E LOTES SEM BANCO DEFINIDO AO SANTANDER
-- Data: 25/11/2026
-- Descrição:
--   1. Localiza a conta bancária SANTANDER (ou cria se não existir).
--   2. Atualiza todos os lotes (fin_remessas) sem conta_bancaria_id para SANTANDER.
--   3. Atualiza todos os pagamentos (status = 'pago') ou itens de lote (remessa_id IS NOT NULL)
--      em fin_contas_pagar que estavam sem conta_bancaria_id para SANTANDER.
-- ==============================================================================

DO $$
DECLARE
    v_santander_id UUID;
BEGIN
    -- 1. Busca o banco SANTANDER existente (case-insensitive)
    SELECT id INTO v_santander_id
    FROM public.fin_contas_bancarias
    WHERE nome_banco ILIKE '%SANTANDER%'
    ORDER BY ativo DESC, created_at ASC
    LIMIT 1;

    -- Caso ainda não exista cadastrado, cria o banco SANTANDER ativo
    IF v_santander_id IS NULL THEN
        INSERT INTO public.fin_contas_bancarias (nome_banco, tipo, saldo_inicial, ativo)
        VALUES ('SANTANDER', 'corrente', 0.00, true)
        RETURNING id INTO v_santander_id;
    END IF;

    -- 2. Atualiza todos os Lotes (Remessas) que estavam sem banco definido
    UPDATE public.fin_remessas
    SET conta_bancaria_id = v_santander_id,
        updated_at = timezone('utc'::text, now())
    WHERE conta_bancaria_id IS NULL;

    -- 3. Atualiza todos os Pagamentos já realizados ou vinculados a Lotes que estavam sem banco
    UPDATE public.fin_contas_pagar
    SET conta_bancaria_id = v_santander_id,
        updated_at = timezone('utc'::text, now())
    WHERE conta_bancaria_id IS NULL
      AND (status = 'pago' OR remessa_id IS NOT NULL);
END $$;
