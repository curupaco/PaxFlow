-- ==============================================================================
-- SEED: CONTAS MENSAIS FIXAS E PARCELAMENTOS DO ANEXO
-- Data: 29/10/2026
-- ==============================================================================

DO $$
DECLARE
    ano_atual INT := EXTRACT(YEAR FROM CURRENT_DATE);
    mes_atual INT := EXTRACT(MONTH FROM CURRENT_DATE);
    mes INT;
    data_calc DATE;
    v_banco_id UUID;
    v_cat_id UUID;
    v_tipo_id UUID;
BEGIN
    -- Seleciona banco padrão para referência inicial
    SELECT id INTO v_banco_id FROM public.fin_contas_bancarias WHERE nome_banco = 'Banco Itaú' LIMIT 1;
    IF v_banco_id IS NULL THEN
        SELECT id INTO v_banco_id FROM public.fin_contas_bancarias LIMIT 1;
    END IF;

    -- Helper local para buscar tipo e categoria
    -- -------------------------------------------------------------
    -- 1. CONTAS MENSAIS FIXAS (Projetadas para os meses do ano corrente)
    -- -------------------------------------------------------------
    FOR mes IN mes_atual..12 LOOP
        -- Dia 1: Salários (R$ 12.000,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'SALÁRIO' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 1);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Equipe Operacional', 'Folha Salarial Mensal', 12000.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 4: Material de Escritório (R$ 300,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'MATERIAL DE ESCRITÓRIO' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 4);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Papelaria & Suprimentos', 'Material de Escritório', 300.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 4: Material de Limpeza (R$ 300,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'MATERIAL DE LIMPEZA' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 4);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Distribuidora Limpeza', 'Material de Limpeza', 300.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 4: Limpeza Loja (R$ 1.300,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'LIMPEZA LOJA' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 4);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Prestadora de Limpeza', 'Serviço Limpeza Loja', 1300.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 5: Aluguel (R$ 28.434,42)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'ALUGUEL' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 5);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Locador do Imóvel', 'Aluguel do Ponto Comercial', 28434.42, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 5: Taxa de Marketing (R$ 1.500,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'TAXA MARKETING' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 5);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Franqueadora / Gestão', 'Taxa de Marketing', 1500.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 5: Royalties (R$ 2.000,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'ROYALTIES' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 5);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Franqueadora / Marca', 'Royalties Mensais', 2000.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 10: Plano de Saúde (R$ 3.246,53)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'PLANO DE SAÚDE' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 10);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Operadora de Saúde', 'Plano de Saúde Funcionários', 3246.53, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 10: Condomínio (R$ 26.000,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'CONDOMÍNIO' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 10);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Administradora Condomínio', 'Condomínio Comercial', 26000.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 10: Comissões (R$ 20.000,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'COMISSÕES' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 10);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, valor_estimado, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Consultores de Vendas', 'Comissões de Vendas Apuradas', 20000.00, TRUE, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 13: Energia Elétrica (R$ 800,00 - estimado)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'ENERGIA ELÉTRICA' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 13);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, valor_estimado, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Concessionária de Energia', 'Conta de Luz', 800.00, TRUE, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 15: Contabilidade (R$ 616,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'CONTABILIDADE' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 15);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Escritório Contábil', 'Honorários Contábeis', 616.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 15: Telefone (R$ 264,65 - estimado)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'TELEFONE' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 15);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, valor_estimado, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Operadora de Telefonia', 'Telefonia Fixa / Móvel', 264.65, TRUE, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 15: Internet (R$ 120,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'INTERNET' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 15);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Provedor de Internet', 'Link Dedicado Internet', 120.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 17: Sistema (R$ 361,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'SISTEMA' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 17);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Software & Licenças', 'Licença de Software', 361.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 20: Imposto (R$ 11.000,00 - estimado)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'IMPOSTO' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 20);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, valor_estimado, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Receita Federal / Simples', 'Impostos Federais (DAS)', 11000.00, TRUE, data_calc, 'pendente', TRUE, 'mensal');
        END IF;

        -- Dia 26: Benefícios (R$ 7.000,00)
        SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'BENEFÍCIOS' LIMIT 1;
        IF v_cat_id IS NOT NULL THEN
            data_calc := make_date(ano_atual, mes, 26);
            INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, recorrente, periodicidade)
            VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Operadora de Benefícios', 'Vale Refeição / Alimentação', 7000.00, data_calc, 'pendente', TRUE, 'mensal');
        END IF;
    END LOOP;

    -- -------------------------------------------------------------
    -- 2. PARCELAMENTOS ATIVOS DO ANEXO (Inserção das parcelas vigentes)
    -- -------------------------------------------------------------
    SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'PEDALADAS' LIMIT 1;
    IF v_cat_id IS NOT NULL THEN
        -- Laura 9/10 (R$ 832,66 - dia 4)
        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Laura', 'LAURA 9/10', 832.66, make_date(ano_atual, mes_atual, 4), 'pendente', 9, 10);

        -- Fernanda 9/10 (R$ 1.390,00 - dia 4)
        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Fernanda', 'Fernanda 9/10', 1390.00, make_date(ano_atual, mes_atual, 4), 'pendente', 9, 10);

        -- Fernanda 9/12 (R$ 2.021,71 - dia 4)
        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Fernanda', 'Fernanda 9/12', 2021.71, make_date(ano_atual, mes_atual, 4), 'pendente', 9, 12);

        -- Fernanda 2/12 (R$ 1.916,67 - dia 4)
        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Fernanda', 'Fernanda 2/12', 1916.67, make_date(ano_atual, mes_atual, 4), 'pendente', 2, 12);

        -- Fernanda 1/10 (R$ 2.142,06 - dia 4)
        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Fernanda', 'Fernanda 1/10', 2142.06, make_date(ano_atual, mes_atual, 4), 'pendente', 1, 10);
    END IF;

    -- Prejuízo Trem Demian 3/3 (R$ 929,83 - dia 10)
    SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'PREJUÍZO' LIMIT 1;
    IF v_cat_id IS NOT NULL THEN
        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Demian', 'Trem Demian 3/3', 929.83, make_date(ano_atual, mes_atual, 10), 'pendente', 3, 3);
    END IF;

    -- Impostos Parcelados (dia 30)
    SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'IMPOSTO PARCELADO' LIMIT 1;
    IF v_cat_id IS NOT NULL THEN
        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Receita Federal', 'Imposto Parcelado 32/60', 470.00, make_date(ano_atual, mes_atual, 30), 'pendente', 32, 60);

        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Receita Federal', 'Imposto Parcelado 51/60', 560.00, make_date(ano_atual, mes_atual, 30), 'pendente', 51, 60);

        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Receita Federal', 'Imposto Parcelado 37/60', 4000.00, make_date(ano_atual, mes_atual, 30), 'pendente', 37, 60);

        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Receita Federal', 'Imposto Parcelado 48/60', 800.00, make_date(ano_atual, mes_atual, 30), 'pendente', 48, 60);

        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Receita Federal', 'Imposto Parcelado 28/32', 670.00, make_date(ano_atual, mes_atual, 30), 'pendente', 28, 32);
    END IF;

    -- Despesa MKP, Imposto Parcelado 37/60 (R$ 1.500,00 - dia 30)
    SELECT id, tipo_custo_id INTO v_cat_id, v_tipo_id FROM public.fin_categorias WHERE nome = 'Despesas MKP' LIMIT 1;
    IF v_cat_id IS NOT NULL THEN
        INSERT INTO public.fin_contas_pagar (tipo_custo_id, categoria_id, conta_bancaria_id, favorecido, descricao, valor_nominal, data_vencimento, status, parcela_numero, parcela_total)
        VALUES (v_tipo_id, v_cat_id, v_banco_id, 'Franqueadora MKP', 'Imposto Parcelado MKP 37/60', 1500.00, make_date(ano_atual, mes_atual, 30), 'pendente', 37, 60);
    END IF;

END $$;
