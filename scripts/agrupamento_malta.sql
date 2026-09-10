-- ============================================================================
-- SCRIPT DE CONSOLIDAÇÃO E AGRUPAMENTO DE VIAGENS — MALTA VIAGENS
-- Tag de Origem: MIGRACAO_MALTA_20260909
-- 
-- O que este script faz:
-- 1. Identifica pacotes com mesmo Cliente + mesmo Destino + mesmo Mês/Ano de Embarque.
-- 2. Eleva o primeiro registro a Viagem Principal:
--    - data_ida: primeira data de embarque
--    - data_volta: última data de retorno
--    - valor_total: soma total de todos os produtos do pacote
--    - codigo_localizador: concatenação dos localizadores legados (#4278, #4279, etc.)
-- 3. Transforma cada voucher em um registro oficial na tabela 'produtos_viagem'.
-- 4. Move comentários, conferências e pagamentos para a Viagem Principal.
-- 5. Exclui as linhas de viagens redundantes com 100% de segurança e transacionalidade.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    r_grupo RECORD;
    r_item RECORD;
    v_viagem_principal_id UUID;
    v_menor_data_ida DATE;
    v_maior_data_volta DATE;
    v_soma_valor NUMERIC;
    v_loc_combinados TEXT;
    v_tipo_produto TEXT;
    v_desc_produto TEXT;
    v_count_grupos INT := 0;
    v_count_produtos INT := 0;
    v_count_excluidas INT := 0;
BEGIN
    RAISE NOTICE '========================================================================';
    RAISE NOTICE 'Iniciando consolidação de pacotes e produtos da Malta Viagens...';
    RAISE NOTICE 'Tag: MIGRACAO_MALTA_20260909';
    RAISE NOTICE '========================================================================';

    -- 1. Iterar sobre todos os grupos de viagens da Malta
    -- Critério de agrupamento: cliente_id + destino normalizado + ano/mês de ida
    FOR r_grupo IN
        SELECT 
            cliente_id,
            LOWER(TRIM(REGEXP_REPLACE(
                TRANSLATE(LOWER(destino), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
                '[^a-z0-9]', '', 'g'
            ))) AS destino_norm,
            TO_CHAR(data_ida, 'YYYY-MM') AS ano_mes,
            COUNT(*) AS total_itens
        FROM public.viagens
        WHERE origem = 'MIGRACAO_MALTA_20260909'
        GROUP BY 
            cliente_id,
            LOWER(TRIM(REGEXP_REPLACE(
                TRANSLATE(LOWER(destino), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
                '[^a-z0-9]', '', 'g'
            ))),
            TO_CHAR(data_ida, 'YYYY-MM')
    LOOP
        -- A. Identificar a Viagem Principal (a menor data_ida ou primeiro id)
        SELECT id
        INTO v_viagem_principal_id
        FROM public.viagens
        WHERE origem = 'MIGRACAO_MALTA_20260909'
          AND cliente_id = r_grupo.cliente_id
          AND LOWER(TRIM(REGEXP_REPLACE(
                TRANSLATE(LOWER(destino), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
                '[^a-z0-9]', '', 'g'
              ))) = r_grupo.destino_norm
          AND TO_CHAR(data_ida, 'YYYY-MM') = r_grupo.ano_mes
        ORDER BY data_ida ASC, created_at ASC
        LIMIT 1;

        -- B. Calcular consolidação agregada do grupo
        SELECT 
            MIN(data_ida),
            MAX(COALESCE(data_volta, data_ida)),
            SUM(COALESCE(valor_total, 0)),
            STRING_AGG(DISTINCT NULLIF(TRIM(codigo_localizador), ''), ', ')
        INTO 
            v_menor_data_ida,
            v_maior_data_volta,
            v_soma_valor,
            v_loc_combinados
        FROM public.viagens
        WHERE origem = 'MIGRACAO_MALTA_20260909'
          AND cliente_id = r_grupo.cliente_id
          AND LOWER(TRIM(REGEXP_REPLACE(
                TRANSLATE(LOWER(destino), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
                '[^a-z0-9]', '', 'g'
              ))) = r_grupo.destino_norm
          AND TO_CHAR(data_ida, 'YYYY-MM') = r_grupo.ano_mes;

        -- C. Atualizar a Viagem Principal com os dados consolidados do pacote (sem updated_at)
        UPDATE public.viagens
        SET 
            data_ida = v_menor_data_ida,
            data_volta = v_maior_data_volta,
            valor_total = v_soma_valor,
            codigo_localizador = v_loc_combinados
        WHERE id = v_viagem_principal_id;

        -- D. Iterar por cada item do grupo para criar os produtos e realocar dependências
        FOR r_item IN
            SELECT 
                id,
                destino,
                valor_total,
                codigo_localizador,
                data_ida,
                observacoes
            FROM public.viagens
            WHERE origem = 'MIGRACAO_MALTA_20260909'
              AND cliente_id = r_grupo.cliente_id
              AND LOWER(TRIM(REGEXP_REPLACE(
                    TRANSLATE(LOWER(destino), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
                    '[^a-z0-9]', '', 'g'
                  ))) = r_grupo.destino_norm
              AND TO_CHAR(data_ida, 'YYYY-MM') = r_grupo.ano_mes
            ORDER BY data_ida ASC
        LOOP
            -- 1. Inferir tipo de produto
            v_tipo_produto := 'outros';
            IF r_item.observacoes ILIKE '%aéreo%' OR r_item.observacoes ILIKE '%aereo%' OR r_item.observacoes ILIKE '%voo%' THEN
                v_tipo_produto := 'aereo';
            ELSIF r_item.observacoes ILIKE '%hotel%' OR r_item.observacoes ILIKE '%resort%' OR r_item.observacoes ILIKE '%hospedagem%' THEN
                v_tipo_produto := 'hotel';
            ELSIF r_item.observacoes ILIKE '%cruzeiro%' OR r_item.observacoes ILIKE '%msc%' OR r_item.observacoes ILIKE '%navio%' THEN
                v_tipo_produto := 'cruzeiro';
            ELSIF r_item.observacoes ILIKE '%seguro%' THEN
                v_tipo_produto := 'seguro';
            ELSIF r_item.observacoes ILIKE '%pacote%' THEN
                v_tipo_produto := 'pacote';
            ELSIF r_item.observacoes ILIKE '%transfer%' OR r_item.observacoes ILIKE '%traslado%' THEN
                v_tipo_produto := 'transfer';
            ELSIF r_item.observacoes ILIKE '%passeio%' OR r_item.observacoes ILIKE '%ingresso%' OR r_item.observacoes ILIKE '%tour%' THEN
                v_tipo_produto := 'passeio';
            END IF;

            -- 2. Extrair descrição limpa do serviço
            v_desc_produto := 'Serviço ' || r_item.destino;
            IF r_item.observacoes IS NOT NULL AND r_item.observacoes != '' THEN
                v_desc_produto := TRIM(SUBSTRING(r_item.observacoes FROM 'Serviços Contratados:[[:space:]]*[\n\r]+[[:space:]]*-?[[:space:]]*([^\n\r]+)'));
                IF v_desc_produto IS NULL OR v_desc_produto = '' THEN
                    v_desc_produto := UPPER(v_tipo_produto) || ' - ' || r_item.destino;
                END IF;
            END IF;

            -- 3. Inserir em produtos_viagem vinculado à viagem principal (idempotente)
            IF NOT EXISTS (
                SELECT 1 FROM public.produtos_viagem 
                WHERE viagem_id = v_viagem_principal_id 
                  AND codigo_reserva = r_item.codigo_localizador
            ) THEN
                INSERT INTO public.produtos_viagem (
                    viagem_id,
                    tipo,
                    fornecedor,
                    descricao,
                    codigo_reserva,
                    valor_custo,
                    valor_venda,
                    status,
                    data_servico,
                    dados_adicionais
                ) VALUES (
                    v_viagem_principal_id,
                    v_tipo_produto,
                    'AGAXTUR',
                    v_desc_produto,
                    r_item.codigo_localizador,
                    0.00,
                    COALESCE(r_item.valor_total, 0),
                    'emitido',
                    COALESCE(r_item.data_ida, v_menor_data_ida),
                    jsonb_build_object('id_legado', r_item.codigo_localizador, 'origem', 'MIGRACAO_MALTA_20260909')
                );
                v_count_produtos := v_count_produtos + 1;
            END IF;

            -- 4. Se não for a Viagem Principal, transferir dependências e excluir a viagem redundante
            IF r_item.id <> v_viagem_principal_id THEN
                -- Migrar comentários para a viagem principal
                UPDATE public.comentarios 
                SET item_id = v_viagem_principal_id 
                WHERE item_id = r_item.id AND tipo_item = 'viagem';

                -- Migrar notificações
                UPDATE public.notificacoes 
                SET item_id = v_viagem_principal_id, parent_id = v_viagem_principal_id 
                WHERE (item_id = r_item.id OR parent_id = r_item.id) AND tipo_item = 'viagem';

                -- Migrar loc_conferencias
                UPDATE public.loc_conferencias 
                SET viagem_id = v_viagem_principal_id 
                WHERE viagem_id = r_item.id;

                -- Migrar loc_pagamentos
                UPDATE public.loc_pagamentos 
                SET viagem_id = v_viagem_principal_id 
                WHERE viagem_id = r_item.id;

                -- Deletar a linha redundante de viagem
                DELETE FROM public.viagens WHERE id = r_item.id;
                v_count_excluidas := v_count_excluidas + 1;
            END IF;
        END LOOP;

        IF r_grupo.total_itens > 1 THEN
            v_count_grupos := v_count_grupos + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '========================================================================';
    RAISE NOTICE 'CONSOLIDAÇÃO CONCLUÍDA COM SUCESSO NO SUPABASE!';
    RAISE NOTICE '• Pacotes com múltiplos itens consolidados: %', v_count_grupos;
    RAISE NOTICE '• Linhas redundantes eliminadas do painel:  %', v_count_excluidas;
    RAISE NOTICE '• Total de produtos inseridos:              %', v_count_produtos;
    RAISE NOTICE '========================================================================';
END $$;

COMMIT;
