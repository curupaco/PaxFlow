-- ============================================================================
-- PAXFLOW - CORREÇÃO DE ISOLAMENTO DE DADOS NA BUSCA GLOBAL (BALCÃO / CO-PILOTO)
-- Data: 2026-10-19
-- Descrição:
--   Corrige o vazamento de viagens e orçamentos entre clientes na função RPC
--   'buscar_balcao_co_piloto'. As subqueries de viagens e orçamentos agora
--   possuem cláusula estrita 'v.cliente_id = c.id' e 'o.cliente_id = c.id',
--   garantindo que cada cliente exiba única e exclusivamente os registros que
--   pertencem a ele, eliminando duplicações e dados cruzados indevidos.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.buscar_balcao_co_piloto(query_text TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    raw_query TEXT;
    clean_digits TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado no PaxFlow.';
    END IF;

    raw_query := LOWER(TRIM(query_text));
    clean_digits := REGEXP_REPLACE(query_text, '\D', '', 'g');

    SELECT COALESCE(JSON_AGG(row_data), '[]'::json) INTO result
    FROM (
        SELECT 
            JSON_BUILD_OBJECT(
                'id', c.id,
                'nome', c.nome,
                'cpf', c.documento,
                'telefone', c.telefone,
                'email', c.email,
                'codigoRef', c.codigo_ref
            ) AS cliente,
            COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                    'id', v.id,
                    'titulo', COALESCE(
                        (SELECT '[' || UPPER(pv.tipo) || ' LOC ' || pv.codigo_reserva || '] Viagem para ' || COALESCE(v.destino, 'Destino')
                         FROM public.produtos_viagem pv 
                         WHERE pv.viagem_id = v.id 
                           AND (LOWER(COALESCE(pv.codigo_reserva, '')) LIKE '%' || raw_query || '%'
                                OR LOWER(COALESCE(pv.descricao, '')) LIKE '%' || raw_query || '%'
                                OR LOWER(COALESCE(pv.fornecedor, '')) LIKE '%' || raw_query || '%')
                         LIMIT 1),
                        COALESCE(v.destino, 'Viagem')
                    ),
                    'consultorNome', COALESCE(p.nome, 'Consultor Titular'),
                    'consultorId', v.consultor_id,
                    'destino', COALESCE(v.destino, ''),
                    'status', v.status,
                    'dataIda', CAST(v.data_ida AS TEXT),
                    'dataVolta', CAST(v.data_volta AS TEXT),
                    'data_ida', CAST(v.data_ida AS TEXT),
                    'data_volta', CAST(v.data_volta AS TEXT),
                    'codigoRef', v.codigo_ref
                ))
                FROM public.viagens v
                LEFT JOIN public.profiles p ON p.id = v.consultor_id
                WHERE v.cliente_id = c.id 
                  AND (
                      -- Se a busca combinou com dados do próprio cliente, traz as viagens dele
                      (
                          LOWER(c.nome) LIKE '%' || raw_query || '%'
                          OR LOWER(COALESCE(c.email, '')) LIKE '%' || raw_query || '%'
                          OR LOWER(COALESCE(c.codigo_ref, '')) LIKE '%' || raw_query || '%'
                          OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.documento, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
                          OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.telefone, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
                      )
                      -- OU se a busca combinou diretamente com esta viagem dele
                      OR LOWER(v.destino) LIKE '%' || raw_query || '%'
                      OR LOWER(COALESCE(v.codigo_localizador, '')) LIKE '%' || raw_query || '%'
                      OR LOWER(COALESCE(v.codigo_ref, '')) LIKE '%' || raw_query || '%'
                      OR EXISTS (
                           SELECT 1 FROM public.produtos_viagem pv 
                           WHERE pv.viagem_id = v.id AND (
                               LOWER(COALESCE(pv.codigo_reserva, '')) LIKE '%' || raw_query || '%'
                               OR LOWER(COALESCE(pv.descricao, '')) LIKE '%' || raw_query || '%'
                               OR LOWER(COALESCE(pv.fornecedor, '')) LIKE '%' || raw_query || '%'
                           )
                      )
                  )
            ), '[]'::json) AS viagens,
            COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                    'id', o.id,
                    'titulo', COALESCE(o.destino, 'Orçamento'),
                    'consultorNome', COALESCE(p.nome, 'Consultor Titular'),
                    'consultorId', o.consultor_id,
                    'data', CAST(o.created_at AS TEXT),
                    'total', 'R$ ' || COALESCE(CAST(o.valor_proposta AS TEXT), '0,00'),
                    'codigoRef', o.codigo_ref
                ))
                FROM public.orcamentos o
                LEFT JOIN public.profiles p ON p.id = o.consultor_id
                WHERE o.cliente_id = c.id 
                  AND (
                      -- Se a busca combinou com dados do cliente, traz os orçamentos dele
                      (
                          LOWER(c.nome) LIKE '%' || raw_query || '%'
                          OR LOWER(COALESCE(c.email, '')) LIKE '%' || raw_query || '%'
                          OR LOWER(COALESCE(c.codigo_ref, '')) LIKE '%' || raw_query || '%'
                          OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.documento, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
                          OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.telefone, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
                      )
                      -- OU se a busca combinou diretamente com este orçamento dele
                      OR LOWER(COALESCE(o.destino, '')) LIKE '%' || raw_query || '%'
                      OR LOWER(COALESCE(o.nome_cliente, '')) LIKE '%' || raw_query || '%'
                      OR LOWER(COALESCE(o.codigo_ref, '')) LIKE '%' || raw_query || '%'
                  )
            ), '[]'::json) AS orcamentos,
            '[]'::json AS reembolsos
        FROM public.clientes c
        WHERE LOWER(c.nome) LIKE '%' || raw_query || '%'
           OR LOWER(COALESCE(c.email, '')) LIKE '%' || raw_query || '%'
           OR LOWER(COALESCE(c.codigo_ref, '')) LIKE '%' || raw_query || '%'
           OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.documento, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
           OR (LENGTH(clean_digits) >= 3 AND REGEXP_REPLACE(COALESCE(c.telefone, ''), '\D', '', 'g') LIKE '%' || clean_digits || '%')
           OR EXISTS (
                SELECT 1 FROM public.viagens v 
                WHERE v.cliente_id = c.id AND (
                    LOWER(v.destino) LIKE '%' || raw_query || '%' 
                    OR LOWER(COALESCE(v.codigo_localizador, '')) LIKE '%' || raw_query || '%'
                    OR LOWER(COALESCE(v.codigo_ref, '')) LIKE '%' || raw_query || '%'
                    OR EXISTS (
                        SELECT 1 FROM public.produtos_viagem pv 
                        WHERE pv.viagem_id = v.id AND (
                            LOWER(COALESCE(pv.codigo_reserva, '')) LIKE '%' || raw_query || '%'
                            OR LOWER(COALESCE(pv.descricao, '')) LIKE '%' || raw_query || '%'
                            OR LOWER(COALESCE(pv.fornecedor, '')) LIKE '%' || raw_query || '%'
                        )
                    )
                )
           )
           OR EXISTS (
                SELECT 1 FROM public.orcamentos o 
                WHERE o.cliente_id = c.id AND (
                    LOWER(COALESCE(o.destino, '')) LIKE '%' || raw_query || '%' 
                    OR LOWER(COALESCE(o.nome_cliente, '')) LIKE '%' || raw_query || '%'
                    OR LOWER(COALESCE(o.codigo_ref, '')) LIKE '%' || raw_query || '%'
                )
           )
    ) row_data;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
